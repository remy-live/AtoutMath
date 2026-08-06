// Curseur de démonstration.
//
// Une démonstration muette n'enseigne rien. Jusqu'ici, les activités se
// contentaient de marquer la bonne réponse puis d'enchaîner : sur la
// comparaison de nombres, on voyait les questions défiler sans jamais voir le
// geste — ni le signe saisi, ni le glisser-déposer qui est pourtant TOUT ce que
// l'exercice demande d'apprendre.
//
// Ce module fournit un pointeur visible, que les activités déplacent, font
// appuyer et font glisser. Ce qui compte n'est pas qu'il aille au bon endroit,
// mais qu'on ait le temps de suivre son trajet : les durées sont volontairement
// lentes, à hauteur d'un geste humain montré à un élève.
//
// Il est en `position: fixed` sur le `body` : les mêmes appels fonctionnent
// dans la vignette d'une carte, dans le simulateur du professeur et en plein
// écran, sans que l'activité ait à savoir où elle est montée.

import { regTimeout } from './timers.js';

export const DEMO_SPEED = {
    move: 750,      // trajet d'un point à un autre
    press: 260,     // enfoncement
    settle: 650,    // temps de lecture après un appui
    drag: 1050,     // un glissement se montre plus lentement qu'un déplacement
    between: 1900   // pause avant la question suivante
};

// --- Vitesse globale des démonstrations -------------------------------------
// Un même robot va trop vite pour l'un, trop lentement pour l'autre : le
// facteur multiplie TOUTES les durées (trajets, pauses, lectures) et se
// retient d'une session à l'autre.
// L'ordre du tableau est l'ordre du cycle : le premier clic RALENTIT — c'est
// presque toujours ce qu'on cherche quand on touche à la vitesse d'une démo.
const VITESSES = [
    { facteur: 1, libelle: '▶ Normal' },
    { facteur: 1.7, libelle: '🐢 Lent' },
    { facteur: 0.6, libelle: '⚡ Rapide' }
];

let facteurVitesse = (() => {
    const v = parseFloat(localStorage.getItem('mathbox-demo-speed'));
    return VITESSES.some(o => o.facteur === v) ? v : 1;
})();

export function setDemoSpeedFactor(f) {
    facteurVitesse = f;
    try { localStorage.setItem('mathbox-demo-speed', String(f)); } catch { /* stockage plein ou privé */ }
}

// --- Mode muet ---------------------------------------------------------------
// Les vignettes d'aperçu (survol du catalogue, cartes, mode présentation)
// jouent la démonstration en miniature : une bulle d'explication posée sur
// <body> y recouvrirait toute la page — et survivait à la vignette. En muet,
// le robot joue sans parler ; le plein écran garde ses bulles.
let muet = false;
export function setDemoMuet(v) { muet = !!v; }

// --- Temps de lecture d'une bulle --------------------------------------------
//
// Chaque jeu attendait une durée FIXE après avoir fait parler le robot — la
// même pour « Je tape 40 » que pour « Cette ligne a déjà tous ses 1 (3 sur 6
// cases) : je complète avec des 0. ». Les explications longues disparaissaient
// donc avant d'être lues : c'est ça, « ça va trop vite ».
//
// La durée se calcule maintenant sur le TEXTE. Après un `say()`, la prochaine
// pause du jeu ne peut pas se terminer avant que la bulle ait eu le temps
// d'être lue — les pauses déjà écrites dans les jeux s'allongent d'elles-mêmes
// quand la phrase est longue, sans qu'aucune n'ait à être retouchée.

/** ~230 ms par mot : le rythme d'un élève qui lit une consigne, pas d'un adulte pressé. */
export function tempsDeLecture(texte) {
    const mots = String(texte).trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1300, Math.min(7000, 500 + mots * 230));
}

// Tous les pointeurs vivants. `clearEngines()` coupe les minuteurs d'une
// démonstration interrompue, mais l'ÉLÉMENT du curseur, posé sur <body>,
// restait affiché : on fermait l'aperçu et une flèche fantôme continuait de
// flotter sur l'écran. Ce registre permet de les balayer tous à la fermeture.
const curseursVivants = new Set();

/** Détruit tous les pointeurs de démonstration encore à l'écran. */
export function destroyAllDemoCursors() {
    [...curseursVivants].forEach(c => c.destroy());
    curseursVivants.clear();
    document.querySelectorAll('.demo-cible').forEach(el => el.classList.remove('demo-cible'));
    // Ceinture et bretelles : un curseur créé par un module rechargé (autre
    // instance de ce fichier) ne serait pas dans le registre. La bulle vit
    // elle aussi sur <body> : sans ce balayage, une explication du robot
    // restait affichée après la fermeture du jeu.
    //
    // La BARRE DE COMMANDES est balayée ici aussi. Elle n'a pas de registre —
    // chaque démonstration détient la sienne et la détruit en terminant — mais
    // une démonstration lancée par `launchPreview` n'est tenue par aucun
    // parcours : en passant d'un aperçu à une vraie partie, personne
    // n'appelait son `destroy()`. On se retrouvait à jouer pour de bon avec
    // « ⏮ Arrière · ⏸ Pause · ⏭ Un pas » posés en travers de l'en-tête.
    document.querySelectorAll('.demo-cursor, .demo-bubble, .demo-controls').forEach(el => el.remove());
    // Une barre retirée alors qu'elle tenait le jeu en pause le laisserait
    // gelé pour toujours : on relâche le gel avec elle.
    document.dispatchEvent(new CustomEvent('demo_pause', { detail: false }));
}

/**
 * Barre de commande d'une démonstration : pause / lecture et pas-à-pas.
 *
 * Le robot appelle `waitTurn()` avant chaque coup. En lecture, la promesse se
 * résout tout de suite ; en pause, elle attend « Un pas » (qui libère UN coup
 * puis rebloque) ou « Reprendre ». On peut ainsi suivre une déduction à son
 * rythme, ce qu'un défilement continu ne permet pas.
 */
/**
 * Où poser la barre de commandes.
 *
 * En fin de plateau — là où les jeux la demandaient — elle finissait hors de
 * l'écran en paysage (546 px sur un écran de 390) et sous la palette de
 * débogage en portrait : impossible de mettre l'explication en pause. En plein
 * écran, elle rejoint donc la bannière d'aperçu, tout en haut. Les vignettes
 * du catalogue, elles, gardent leur hôte local.
 */
function hoteDeBarre(host) {
    const partage = document.getElementById('demo-controls-host');
    const couche = document.getElementById('game-layer');
    // `offsetParent` vaut null sur un élément en `position: fixed` — c'est le
    // cas de la couche de jeu : on interroge donc le style calculé.
    const enPleinEcran = couche && getComputedStyle(couche).display !== 'none';
    return (partage && enPleinEcran) ? partage : host;
}

// --- Un pas en arrière -------------------------------------------------------
//
// Rejouer un GESTE à l'envers est impossible : le robot a déjà tapé le 40 dans
// la cellule, tourné le rapporteur, fait tomber la pièce — l'état du plateau
// ne se remonte pas. Ce qu'on rate quand « ça va trop vite », ce n'est pas le
// geste, c'est la PHRASE qui l'explique. « En arrière » remet donc la
// démonstration en pause et réaffiche l'explication précédente, autant de fois
// qu'on remonte. Reprendre repart du point où le robot en était.
const journalDiscours = [];
let reculDiscours = 0;
let curseurParlant = null;

function noterDiscours(texte, cible, curseur) {
    journalDiscours.push({ texte, cible });
    if (journalDiscours.length > 60) journalDiscours.shift();
    reculDiscours = 0;
    curseurParlant = curseur;
}

/** @returns {boolean} faux quand on est déjà à la première explication. */
function revoirPrecedent() {
    if (!curseurParlant || curseurParlant.destroyed) return false;
    const i = journalDiscours.length - 2 - reculDiscours;
    if (i < 0) return false;
    reculDiscours++;
    const d = journalDiscours[i];
    // L'ancre a pu disparaître entre-temps (case effacée, fruit tranché) : la
    // bulle se recale alors sur le pointeur plutôt que de viser le vide.
    curseurParlant.say(d.texte, d.cible && document.contains(d.cible) ? d.cible : null, true);
    return true;
}

// --- Bulle rangée au lieu de bulle flottante ---------------------------------
//
// Sur grand écran, une bulle à pointe posée à côté de la case est ce qu'il y a
// de plus clair : elle DÉSIGNE. Sur un téléphone, il n'y a pas de « à côté » —
// la grille occupe toute la largeur, et la bulle finit forcément par-dessus.
// Elle se range alors dans l'emplacement partagé du haut, ce qui POUSSE le
// plateau vers le bas au lieu de le recouvrir, et la case dont on parle est
// cerclée pour garder le lien.
function ancrerLesBulles() {
    const hote = document.getElementById('demo-controls-host');
    const couche = document.getElementById('game-layer');
    if (!hote || !couche || getComputedStyle(couche).display === 'none') return false;
    return window.innerWidth <= 760 || window.innerHeight <= 620;
}

let cibleMarquee = null;

/** Cercle la case dont le robot parle, et décercle la précédente. */
function marquerCible(cible) {
    if (cibleMarquee && cibleMarquee !== cible) cibleMarquee.classList.remove('demo-cible');
    cibleMarquee = null;
    if (cible && cible.classList && document.contains(cible)) {
        cible.classList.add('demo-cible');
        cibleMarquee = cible;
    }
}

/** Commande inerte : une vignette de catalogue n'a pas à porter de barre. */
const BARRE_MUETTE = { get paused() { return false; }, async waitTurn() { return true; }, destroy() {} };

export function createDemoGate(host) {
    // En muet (vignettes du catalogue, mode présentation), la démonstration
    // n'est pas pilotable : une barre Pause/Un pas/Vitesse tassée dans une
    // carte de 170 px ne servirait qu'à la défigurer.
    if (muet) return BARRE_MUETTE;

    let paused = false;
    let destroyed = false;
    let attentes = [];

    // Nouvelle démonstration, nouvel historique : « en arrière » ne doit pas
    // remonter dans les explications d'une question déjà quittée.
    journalDiscours.length = 0;
    reculDiscours = 0;

    const bar = document.createElement('div');
    bar.className = 'demo-controls';
    bar.innerHTML = `
        <button type="button" class="demo-ctrl-btn" data-demo-back aria-label="Revoir l'explication précédente">⏮ Arrière</button>
        <button type="button" class="demo-ctrl-btn" data-demo-pause aria-label="Mettre la démonstration en pause">⏸ Pause</button>
        <button type="button" class="demo-ctrl-btn" data-demo-step aria-label="Avancer d'un pas">⏭ Un pas</button>
        <button type="button" class="demo-ctrl-btn" data-demo-speed aria-label="Vitesse de la démonstration"></button>`;
    const hote = hoteDeBarre(host);
    // Une seule barre à la fois dans l'emplacement partagé : les activités qui
    // recréent leur commande à chaque question y empileraient sinon autant de
    // barres que de questions jouées.
    hote.querySelectorAll(':scope > .demo-controls').forEach(v => v.remove());
    hote.appendChild(bar);

    // Vitesse : un bouton qui fait le tour Lent → Normal → Rapide, et
    // retient le choix pour les prochaines démonstrations.
    const btnVitesse = bar.querySelector('[data-demo-speed]');
    const majVitesse = () => {
        const v = VITESSES.find(o => o.facteur === facteurVitesse) || VITESSES[1];
        btnVitesse.textContent = v.libelle;
        btnVitesse.classList.toggle('demo-ctrl-btn--active', v.facteur !== 1);
    };
    btnVitesse.onclick = () => {
        const i = VITESSES.findIndex(o => o.facteur === facteurVitesse);
        setDemoSpeedFactor(VITESSES[(i + 1) % VITESSES.length].facteur);
        majVitesse();
    };
    majVitesse();

    const btnPause = bar.querySelector('[data-demo-pause]');
    const liberer = () => { attentes.forEach(r => r()); attentes = []; };
    const poserPause = (etat) => {
        paused = etat;
        btnPause.innerHTML = paused ? '▶ Reprendre' : '⏸ Pause';
        btnPause.classList.toggle('demo-ctrl-btn--active', paused);
        // La pause doit arrêter LE JEU, pas seulement le robot.
        //
        // Elle ne bloquait que les `waitTurn()` du commentaire : dans un jeu
        // d'arcade, le vaisseau continuait de voler, les vagues d'arriver et
        // les vies de tomber pendant qu'on lisait l'explication. On revenait
        // sur une partie méconnaissable — la pause « plantait » la partie.
        // L'événement laisse chaque jeu geler ce qu'il sait geler ; les
        // activités au tour par tour, elles, n'ont rien à faire.
        document.dispatchEvent(new CustomEvent('demo_pause', { detail: paused }));
    };

    btnPause.onclick = () => {
        poserPause(!paused);
        if (!paused) liberer();
    };
    bar.querySelector('[data-demo-step]').onclick = () => {
        // « Un pas » implique la pause : on libère un seul coup, la boucle
        // se rebloquera au prochain `waitTurn()`.
        if (!paused) poserPause(true);
        liberer();
    };

    const btnBack = bar.querySelector('[data-demo-back]');
    btnBack.onclick = () => {
        // Remonter suppose de s'arrêter : sinon le robot recouvrirait la bulle
        // rappelée par la suivante avant qu'on ait fini de la lire.
        if (!paused) poserPause(true);
        if (!revoirPrecedent()) {
            btnBack.disabled = true;
            regTimeout(() => { btnBack.disabled = false; }, 700);
        }
    };

    return {
        get paused() { return paused; },
        async waitTurn() {
            if (destroyed) return false;
            if (!paused) return true;
            return new Promise(res => attentes.push(() => res(!destroyed)));
        },
        destroy() {
            destroyed = true;
            // Une barre détruite en pause laisserait le jeu gelé pour de bon.
            if (paused) { paused = false; document.dispatchEvent(new CustomEvent('demo_pause', { detail: false })); }
            liberer();
            bar.remove();
        }
    };
}

/**
 * Crée un pointeur. À détruire avec `destroy()` — ou, plus simplement, en
 * laissant `clearEngines()` faire son travail : toutes les attentes passent par
 * `regTimeout`, donc une démonstration interrompue ne laisse rien en vol.
 */
export function createDemoCursor() {
    // Un curseur créé en mode muet (vignettes d'aperçu) reste DISCRET pour
    // toute sa vie : ni flèche ni bulle. Douze cartes qui montent leurs
    // aperçus en même temps lançaient douze robots — autant de flèches et de
    // bulles qui traversaient l'écran le temps du gel des vignettes.
    const discret = muet;
    const el = document.createElement('div');
    el.className = 'demo-cursor';
    el.setAttribute('aria-hidden', 'true');
    if (discret) el.style.display = 'none';
    el.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M5 2.5 L5 19 L9.2 15.2 L11.9 21.2 L14.6 20 L12 14.2 L18 14 Z"
                  fill="#111827" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
        </svg><span class="demo-cursor-halo"></span>`;
    document.body.appendChild(el);

    let destroyed = false;
    let ghost = null;
    let bulle = null;
    // Instant avant lequel la bulle en cours n'a pas fini d'être lue.
    let finDeLecture = 0;
    // Zone que la bulle ne doit pas recouvrir (voir `protegerZone`).
    let zoneProtegee = null;
    // Les attentes en cours, pour les dénouer à la destruction : une promesse
    // jamais résolue retiendrait indéfiniment la fonction qui l'attend.
    const pending = new Set();

    /** Attente brute, déjà à l'échelle de la vitesse choisie. */
    function attendre(ms) {
        if (destroyed) return Promise.resolve(false);
        return new Promise(resolve => {
            const done = (ok) => { pending.delete(done); resolve(ok); };
            pending.add(done);
            regTimeout(() => done(!destroyed), Math.max(0, ms));
        });
    }

    const wait = (ms) => attendre(ms * facteurVitesse);

    function place(x, y, ms) {
        el.style.transitionDuration = `${ms}ms`;
        el.style.transform = `translate(${x}px, ${y}px)`;
    }

    function centerOf(target) {
        const r = target.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /** Place la flèche sur la cible sans rien attendre (voir `say`). */
    function suivreDuRegard(cible) {
        if (!document.contains(cible)) return;
        const { x, y } = centerOf(cible);
        if (!el.dataset.placed) {
            el.dataset.placed = '1';
            place(x, y, 0);
            el.classList.add('demo-cursor--visible');
            return;
        }
        place(x, y, 280 * facteurVitesse);
    }

    const api = {
        get destroyed() { return destroyed; },

        /**
         * Bulle d'explication accrochée au pointeur : le robot dit POURQUOI il
         * joue ce coup. Elle reste affichée jusqu'au prochain `say()` ou à
         * `hideBubble()`, pour laisser le temps de lire.
         */
        say(texte, cible = null, rejeu = false) {
            if (destroyed || !texte || muet || discret) return;
            // `rejeu` : rappel d'une explication passée par le bouton
            // « Arrière ». Le noter rallongerait l'historique à l'infini et
            // ferait perdre le fil du retour en arrière.
            if (!rejeu) noterDiscours(texte, cible, api);
            if (!bulle) {
                bulle = document.createElement('div');
                bulle.className = 'demo-bubble';
                bulle.setAttribute('role', 'status');
                document.body.appendChild(bulle);
            }
            bulle.textContent = texte;
            bulle.classList.add('demo-bubble--on');
            // La prochaine pause du jeu ne s'achèvera pas avant ce moment.
            finDeLecture = performance.now() + tempsDeLecture(texte) * facteurVitesse;

            // Écran étroit : la bulle se RANGE au-dessus du plateau au lieu de
            // flotter dessus. Sur un sudoku ou un binairo de téléphone, elle
            // recouvrait la première ligne de la grille — c'est-à-dire les
            // chiffres dont l'explication parle. Impossible de suivre un
            // raisonnement dont on cache les prémisses. Le lien avec la case
            // n'est pas perdu : elle est cerclée pendant que le robot parle.
            marquerCible(cible);
            // Le pointeur SUIT la phrase, immédiatement.
            //
            // La flèche ne bougeait qu'au `moveTo()` suivant, lequel attend
            // d'abord la fin de la lecture : pendant toute la phrase, elle
            // restait posée sur la case PRÉCÉDENTE alors que la bulle — et
            // maintenant le cercle — désignaient la nouvelle. Trois indications
            // contradictoires à l'écran. Pointer n'est pas agir : la flèche se
            // place tout de suite, seul l'APPUI attend la fin de la lecture.
            if (cible && cible.getBoundingClientRect) suivreDuRegard(cible);
            if (ancrerLesBulles()) {
                const hote = document.getElementById('demo-controls-host');
                if (bulle.parentElement !== hote) hote.appendChild(bulle);
                bulle.classList.add('demo-bubble--rangee');
                bulle.classList.remove('demo-bubble--dessous');
                bulle.style.left = bulle.style.top = '';
                return;
            }
            if (bulle.parentElement !== document.body) document.body.appendChild(bulle);
            bulle.classList.remove('demo-bubble--rangee');

            const ancre = cible ? centerOf(cible) : positionActuelle();
            requestAnimationFrame(() => {
                if (!bulle) return;
                const b = bulle.getBoundingClientRect();
                const marge = 10;
                // Plancher haut : sous la bannière et les commandes du robot,
                // qu'une bulle posée par-dessus rendait illisibles.
                const chrome = document.getElementById('demo-controls-host');
                const bas = chrome && chrome.getBoundingClientRect().bottom;
                const margeHaut = bas > 0 ? bas + 8 : marge;

                const centrerSurAncre = () => Math.max(marge,
                    Math.min(ancre.x - b.width / 2, window.innerWidth - b.width - marge));

                // Zone protégée (la grille du jeu) : la bulle se pose AUTOUR,
                // jamais dessus. Sans elle, l'explication du sudoku couvrait la
                // ligne de chiffres sur laquelle porte le raisonnement.
                const zr = zoneProtegee && document.contains(zoneProtegee)
                    ? zoneProtegee.getBoundingClientRect() : null;
                let pose = null;
                if (zr) {
                    const tient = (l, t) => l >= marge && l + b.width <= window.innerWidth - marge
                        && t >= margeHaut && t + b.height <= window.innerHeight - marge;
                    const essais = [
                        { l: centrerSurAncre(), t: zr.top - b.height - 12, cote: false, dessous: false },
                        { l: centrerSurAncre(), t: zr.bottom + 12, cote: false, dessous: true },
                        { l: zr.right + 12, t: ancre.y - b.height / 2, cote: true },
                        { l: zr.left - b.width - 12, t: ancre.y - b.height / 2, cote: true }
                    ];
                    pose = essais.find(e => tient(e.l, e.t)) || null;
                }

                if (!pose) {
                    let top = ancre.y - b.height - 46;
                    const dessous = top < margeHaut;
                    if (dessous) top = ancre.y + 40;
                    pose = { l: centrerSurAncre(), t: top, cote: false, dessous };
                }

                // La pointe vise l'ancre même quand la bulle a été ramenée
                // dans la fenêtre, et bascule en haut quand la bulle est
                // passée dessous — sinon elle désignait le vide. Posée SUR LE
                // CÔTÉ, elle n'en porte pas : c'est la case cerclée qui
                // désigne, une pointe horizontale ne montrerait rien.
                const pointe = Math.max(14, Math.min(ancre.x - pose.l, b.width - 14));
                bulle.style.setProperty('--bulle-pointe', `${Math.round(pointe)}px`);
                bulle.classList.toggle('demo-bubble--cote', !!pose.cote);
                bulle.classList.toggle('demo-bubble--dessous', !pose.cote && !!pose.dessous);
                bulle.style.left = `${Math.round(pose.l)}px`;
                bulle.style.top = `${Math.round(pose.t)}px`;
            });
        },

        /**
         * Déclare la zone que la bulle ne doit jamais recouvrir — la grille du
         * jeu, typiquement. À appeler une fois, après le rendu du plateau.
         */
        protegerZone(el) { zoneProtegee = el || null; },

        hideBubble() {
            if (bulle) bulle.classList.remove('demo-bubble--on');
            marquerCible(null);
            finDeLecture = 0;
        },

        /** Amène le pointeur au centre de l'élément et attend d'y être. */
        async moveTo(target, ms = DEMO_SPEED.move) {
            if (destroyed || !target) return false;
            // Le robot ne part pas agir tant que son explication n'a pas eu le
            // temps d'être lue : il patiente sur place, la bulle affichée.
            const restant = finDeLecture - performance.now();
            if (restant > 0 && !await attendre(restant)) return false;
            const { x, y } = centerOf(target);
            // Premier positionnement : sans transition, sinon le pointeur
            // traverse l'écran depuis son coin d'origine.
            if (!el.dataset.placed) {
                el.dataset.placed = '1';
                place(x, y, 0);
                el.classList.add('demo-cursor--visible');
                return wait(220);
            }
            place(x, y, ms * facteurVitesse);
            return wait(ms);
        },

        /** Appui visible : halo qui se referme sur le point. */
        async press() {
            if (destroyed) return false;
            el.classList.add('demo-cursor--pressed');
            return wait(DEMO_SPEED.press);
        },

        async release() {
            if (destroyed) return false;
            el.classList.remove('demo-cursor--pressed');
            return wait(160);
        },

        /** Appui complet sur un élément : trajet, enfoncement, relâchement. */
        async tap(target, ms) {
            if (!await this.moveTo(target, ms)) return false;
            if (!await this.press()) return false;
            return this.release();
        },

        /**
         * Saisit une tuile, la fait glisser jusqu'à la cible et la dépose.
         * Le fantôme est le clone que l'élève verra sous son doigt : c'est le
         * même artifice que le glisser-déposer réel, pour que la démonstration
         * montre exactement le geste attendu.
         */
        async dragFromTo(source, target, ms = DEMO_SPEED.drag) {
            if (destroyed || !source || !target) return false;
            if (!await this.moveTo(source)) return false;
            if (!await this.press()) return false;

            const r = source.getBoundingClientRect();
            ghost = source.cloneNode(true);
            ghost.classList.add('drag-ghost', 'drag-ghost--demo');
            ghost.style.width = `${r.width}px`;
            ghost.style.height = `${r.height}px`;
            ghost.style.left = `${r.left}px`;
            ghost.style.top = `${r.top}px`;
            ghost.style.setProperty('transition-duration', `${ms * facteurVitesse}ms`, 'important');
            document.body.appendChild(ghost);
            source.classList.add('drag-source');

            // Un `reflow` sépare la pose du déplacement : sans lui, le
            // navigateur regroupe les deux et le fantôme apparaît déjà arrivé.
            void ghost.offsetWidth;

            const to = centerOf(target);
            ghost.style.left = `${to.x - r.width / 2}px`;
            ghost.style.top = `${to.y - r.height / 2}px`;
            target.classList.add('compare-slot--hover');
            place(to.x, to.y, ms * facteurVitesse);

            if (!await wait(ms + 120)) return false;

            target.classList.remove('compare-slot--hover');
            source.classList.remove('drag-source');
            if (ghost) { ghost.remove(); ghost = null; }
            await this.release();
            return !destroyed;
        },

        /**
         * Pause de lecture, interruptible comme le reste. Elle ne peut pas
         * s'achever avant que la bulle affichée ait eu le temps d'être lue :
         * c'est ce qui allonge automatiquement les explications longues.
         */
        pause(ms = DEMO_SPEED.settle) {
            const restant = finDeLecture - performance.now();
            return attendre(Math.max(ms * facteurVitesse, restant));
        },

        destroy() {
            destroyed = true;
            curseursVivants.delete(api);
            if (curseurParlant === api) curseurParlant = null;
            marquerCible(null);
            pending.forEach(done => done(false));
            pending.clear();
            if (ghost) { ghost.remove(); ghost = null; }
            if (bulle) { bulle.remove(); bulle = null; }
            el.remove();
        }
    };

    // La position courante du pointeur, pour ancrer la bulle quand aucun
    // élément cible n'est fourni.
    function positionActuelle() {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top };
    }

    curseursVivants.add(api);
    return api;
}
