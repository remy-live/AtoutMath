// LES MOTS CROISÉS — à l'écran.
//
// Rémy : « et aussi idéalement, des mots croisés (avec des grilles toutes
// faites ou un générateur). Par exemple un mot croisé sur le vocabulaire
// d'angle. Il faut que la grille soit optimisée. »
//
// LA GRILLE EST LE PLAN, LES DÉFINITIONS SONT LA LISTE. Sur papier on les
// range en deux colonnes à côté ; sur un téléphone il n'y a pas de « à côté »,
// et une liste de quinze définitions repousserait la grille hors de l'écran.
// On affiche donc UNE définition à la fois — celle du mot où l'on écrit — et
// la liste complète se déplie à la demande. C'est aussi ce qu'on fait sur
// papier au fond : on lit la définition du mot qu'on est en train de chercher.
//
// ON ÉCRIT AVEC LES DOIGTS, pas avec le clavier du système. Une case de mots
// croisés fait une lettre : ouvrir un clavier de tablette par-dessus la grille
// pour y taper un seul caractère est le plus sûr moyen de ne plus voir ce
// qu'on remplit. Le pavé de lettres est dans la page, sous la grille.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    grilleOptimisee, definitions, estResolue, casesFausses, qualite
} from '../core/motsCroises.js';

const COMPETENCE = 'voc.mathematique';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// « 1ʳᵉ », pas « 1ᵉ » : c'est la seule qui ne suit pas la règle.
const ordinal = (n) => (n === 1 ? '1ʳᵉ' : `${n}ᵉ`);

class MotsCroises extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'mots-croises');
        this.graine = this.params.seed || 'mc';
        this.theme = this.params.theme || 'angles';
        this.niveauMax = Number(this.params.niveauMax) || 3;
        this.nbMots = Number(this.params.nbMots) || 10;
        // Les définitions peuvent être TOUTES affichées (comme sur papier) ou
        // seulement celle du mot en cours. Sur téléphone, la seconde est la
        // seule tenable ; sur grand écran, la première ressemble à une vraie
        // grille de journal.
        this.saisie = {};
        this.resolues = 0;
        this.verifs = 0;
        // Un indice par mot, et l'on se souvient de LEQUEL : le refus doit
        // pouvoir redire quelle lettre a déjà été donnée.
        this.aides = new Map();
    }

    render() {
        this.container.innerHTML = `
            <style>
                .mc-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(4px, 1.4cqh, 10px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                /* LE CORPS EST UN CONTENEUR À PART ENTIÈRE, et c'est LUI que
                   la grille mesure. Rémy : « sur tablette, les touches des
                   lettres se superposent mal ». La grille se bornait à un
                   pourcentage de la hauteur du PLATEAU — c'est-à-dire sans
                   retirer la consigne, le pavé de vingt-sept touches, les
                   quatre boutons et la note. Sur un iPad couché, elle dépassait
                   de son emplacement et venait se poser PAR-DESSUS le clavier.
                   Sa hauteur ne vient plus de son contenu mais de ce qui
                   reste — sans quoi la mesurer serait circulaire. */
                .mc-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; gap: 14px; align-items: center; justify-content: center;
                    container-type: size; container-name: mccorps;
                }
                /* La liste, elle, reste calée en haut : centrée, elle
                   flotterait au milieu d'une colonne à moitié vide. */
                .mc-listes { align-self: flex-start; }
                /* LA GRILLE PREND LA PLACE QU'ELLE PEUT, dans les deux sens :
                   une grille de 21 colonnes sur un écran de 390 px donne des
                   cases de 17 px, et c'est encore jouable ; la borner à la
                   seule largeur la ferait déborder en hauteur. */
                /* UNE GRILLE DE MOTS CROISÉS EST NOIRE SUR BLANC, quel que
                   soit le thème choisi. Rémy : « pour les mots croisés,
                   utilise un fond blanc ». C'est un objet de PAPIER, et un
                   thème « forêt » qui teinte les cases en vert les rend
                   illisibles. La grille porte donc ses couleurs en dur, comme
                   la fiche Garam porte les siennes ; tout le reste de l'écran
                   suit le thème. */
                /* PAS DE FOND NOIR. Rémy : « Enlève le fond noir ». La feuille
                   avait déjà reçu la consigne — « les cases qui ne servent pas,
                   ne les mets juste pas, on ne doit voir que la grille des
                   mots » — et l'écran, qui n'est qu'une transcription de cette
                   feuille, était resté en arrière : un pavé sombre de 21 sur 15
                   dont on ne lisait que les trous.
                   Une case muette ne porte AUCUNE information : ce qui compte,
                   c'est la silhouette des mots, et elle se dessine toute seule
                   dès qu'on laisse le blanc autour. C'est la grille « à
                   l'américaine », celle des grilles de vacances — et c'est
                   maintenant exactement le même dessin des deux côtés.
                   Le trait passe donc du FOND de la grille (qui transparaissait
                   par des interstices d'un pixel, d'où le pavé) au CONTOUR de
                   chaque case jouable, comme le doc.rect de la fiche. */
                /* La place offerte à la grille : tout le plateau, moins la
                   colonne des définitions quand elle est là. Le plafond de la
                   case monte de 42 à 66 px — Rémy, « essaie de profiter de
                   l'espace de l'écran ». */
                .mc-wrap { --mc-place: 96cqw; }
                .mc-grille {
                    --mc-cote: clamp(15px, min(calc(var(--mc-place) / var(--mc-cols, 10)),
                                     calc(97cqh / var(--mc-rows, 10))), 66px);
                    display: grid; gap: 0; background: transparent;
                    padding: 2px; flex: 0 0 auto;
                }
                .mc-case {
                    position: relative; width: var(--mc-cote); height: var(--mc-cote);
                    background: #ffffff; border: 0; padding: 0;
                    box-shadow: inset 0 0 0 1px #111827;
                    font: inherit; font-weight: 800; color: #111827;
                    font-size: calc(var(--mc-cote) * .62); line-height: 1;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                }
                /* Rien du tout : ni fond, ni trait, ni curseur. */
                .mc-case--noire { background: transparent; box-shadow: none; cursor: default; }
                .mc-case--motvu { background: #e6ecff; }
                .mc-case--vise {
                    background: #ffe9b8;
                    /* Le contour de la case EST le box-shadow : la surbrillance
                       doit le recomposer, sinon la case visée perd son cadre et
                       s'ouvre sur ses voisines. */
                    box-shadow: inset 0 0 0 2px var(--warning, #f59e0b),
                                inset 0 0 0 3px #111827;
                }
                .mc-case--faute { color: var(--danger, #dc2626); }
                .mc-num {
                    position: absolute; top: 1px; left: 2px; font-size: calc(var(--mc-cote) * .3);
                    font-weight: 700; color: #6b7280; pointer-events: none;
                }

                /* LA DÉFINITION DU MOT EN COURS, toujours visible. */
                .mc-indice {
                    text-align: center; font-weight: 700; max-width: 46ch; min-height: 2.4em;
                    font-size: clamp(12px, min(2.6cqw, 3.2cqh), 17px); line-height: 1.3;
                }
                .mc-indice b { color: var(--primary); }

                /* LA LISTE COMPLÈTE, dépliable — et posée À CÔTÉ dès que la
                   largeur le permet : c'est la mise en page du journal. */
                /* LA LISTE DES DÉFINITIONS N'APPARAÎT QUE SI ELLE TIENT.
                   Elle s'affichait dès 700 px de plateau : sur une tablette de
                   820, une grille de vingt et une colonnes ne laissait que
                   quatre-vingt-dix pixels à sa droite, et les définitions
                   sortaient de l'écran, coupées en plein mot. Elle demande
                   maintenant 240 px pour elle seule — et la grille se borne à
                   ce qui reste. */
                .mc-listes {
                    display: none; flex: 0 0 240px; min-width: 0;
                    max-height: 100%; overflow-y: auto; font-size: .82rem; line-height: 1.35;
                    overflow-wrap: anywhere;
                }
                .mc-listes h5 { margin: 4px 0 2px; font-size: .8rem; color: var(--primary); }
                .mc-def { cursor: pointer; padding: 1px 3px; border-radius: 4px; }
                .mc-def:hover { background: var(--bg-hover); }
                .mc-def--faite { color: var(--text-muted); text-decoration: line-through; }
                .mc-def--vue { background: color-mix(in srgb, var(--warning, #f59e0b) 22%, transparent); }
                @container (min-width: 980px) {
                    .mc-listes { display: block; }
                    .mc-wrap { --mc-place: calc(100cqw - 300px); }
                }

                /* LE PAVÉ DE LETTRES : 26 touches, six rangées sur téléphone,
                   deux sur un écran large. C'est un clavier de jeu, pas un
                   clavier de système : il ne recouvre rien. */
                .mc-pave {
                    display: grid; grid-template-columns: repeat(9, 1fr);
                    gap: clamp(2px, .6cqh, 5px); width: 100%; max-width: 640px; flex: 0 0 auto;
                }
                @container (min-width: 620px) { .mc-pave { grid-template-columns: repeat(14, 1fr); } }
                .mc-touche {
                    border: 1px solid var(--border); border-radius: 7px;
                    background: var(--bg-panel); color: var(--text-main);
                    font: inherit; font-weight: 800; cursor: pointer;
                    font-size: clamp(.72rem, 2.4cqh, 1rem);
                    height: clamp(26px, 5.2cqh, 40px);
                    display: flex; align-items: center; justify-content: center;
                    -webkit-tap-highlight-color: transparent;
                }
                .mc-touche--eff { background: #fef3c7; border-color: #fcd34d; }

                .mc-barre { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .mc-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 5px 11px; font-size: .84rem;
                }
                .mc-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .mc-note {
                    min-height: 1.6em; text-align: center; font-size: .82rem;
                    color: var(--text-muted); flex: 0 0 auto;
                }
                .mc-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .mc-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="mc-wrap" data-wrap>
                <p class="mc-indice" data-indice></p>
                <div class="mc-corps">
                    <div class="mc-grille" data-grille></div>
                    <div class="mc-listes" data-listes></div>
                </div>
                <div class="mc-pave" data-pave></div>
                <div class="mc-barre">
                    <button type="button" class="mc-btn" data-lettre-aide>💡 Une lettre</button>
                    <button type="button" class="mc-btn" data-verifier>Vérifier</button>
                    <button type="button" class="mc-btn" data-neuf>Autre grille</button>
                    <button type="button" class="mc-btn mc-btn--valider" data-valider>J'ai fini</button>
                </div>
                <p class="mc-note" data-note></p>
            </div>`;

        this.wrapEl = this.container.querySelector('[data-wrap]');
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.listesEl = this.container.querySelector('[data-listes]');
        this.indiceEl = this.container.querySelector('[data-indice]');
        this.paveEl = this.container.querySelector('[data-pave]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-lettre-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-neuf]').onclick = () => this.poser();
        this.container.querySelector('[data-valider]').onclick = () => this.valider();

        this.paveEl.innerHTML = ALPHABET.split('').map(l =>
            `<button type="button" class="mc-touche" data-lettre="${l}">${l}</button>`).join('')
            + '<button type="button" class="mc-touche mc-touche--eff" data-lettre="eff">⌫</button>';
        this.paveEl.querySelectorAll('[data-lettre]').forEach(b => {
            b.onclick = () => this.taper(b.dataset.lettre);
        });

        this.surTouche = (e) => {
            if (this.isDemo || !this.grille) return;
            if (e.key === 'Backspace') { e.preventDefault(); this.taper('eff'); return; }
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { this.bouger(1); return; }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { this.bouger(-1); return; }
            const l = String(e.key || '').toUpperCase();
            if (ALPHABET.includes(l) && l.length === 1) this.taper(l);
        };
        document.addEventListener('keydown', this.surTouche);
    }

    startGameLoop() { this.poser(); }

    // --- Une grille ----------------------------------------------------------

    poser() {
        this.compteur = (this.compteur || 0) + 1;
        this.grille = grilleOptimisee({
            theme: this.theme, niveauMax: this.niveauMax, nbMots: this.nbMots,
            essais: 10, rngPour: (i) => makeRng(`${this.graine}-${this.compteur}-${i}`)
        });
        this.saisie = {};
        this.soufflees = new Set();
        this.aides = new Map();
        this.fini = false;
        // Le mot visé : celui où l'on écrit. Au départ, le premier horizontal.
        this.vise = this.grille.mots.find(m => m.dir === 'h') || this.grille.mots[0] || null;
        this.pos = 0;
        this.dessiner();
        const q = qualite(this.grille);
        this.note(`${q.mots} mots, ${q.croisements} croisements. Touche une case pour commencer.`);
        return true;
    }

    showNext() { return this.poser(); }

    // --- Le dessin -----------------------------------------------------------

    /** Les cases d'un mot, en coordonnées. */
    casesDe(m) {
        return [...m.mot].map((_, i) => m.dir === 'h'
            ? { x: m.x + i, y: m.y } : { x: m.x, y: m.y + i });
    }

    dessiner() {
        const g = this.grille;
        // La case se borne à la largeur ET à la hauteur disponibles : une
        // grille de 21 colonnes tient encore, en petit.
        // LA CASE PREND CE QU'IL RESTE — et « ce qu'il reste » dépend de la
        // présence de la liste des définitions, que seule une requête de
        // conteneur connaît. On ne pose donc ici que les DIMENSIONS de la
        // grille ; la place disponible, elle, est décidée en CSS (--mc-place).
        this.wrapEl.style.setProperty('--mc-cols', g.largeur);
        this.wrapEl.style.setProperty('--mc-rows', g.hauteur);
        this.grilleEl.style.gridTemplateColumns = `repeat(${g.largeur}, var(--mc-cote))`;

        const dansVise = new Set(this.vise ? this.casesDe(this.vise).map(c => `${c.x},${c.y}`) : []);
        const curseur = this.vise ? this.casesDe(this.vise)[this.pos] : null;

        this.grilleEl.innerHTML = g.cases.map((ligne, y) => ligne.map((c, x) => {
            if (c === null) return '<div class="mc-case mc-case--noire"></div>';
            const cle = `${x},${y}`;
            const num = g.numeros.find(n => n.x === x && n.y === y);
            const vise = curseur && curseur.x === x && curseur.y === y;
            const classes = ['mc-case'];
            if (dansVise.has(cle)) classes.push('mc-case--motvu');
            if (vise) classes.push('mc-case--vise');
            if (this.fautes && this.fautes.has(cle)) classes.push('mc-case--faute');
            return `<button type="button" class="${classes.join(' ')}" data-case="${cle}">
                ${num ? `<span class="mc-num">${num.num}</span>` : ''}${this.saisie[cle] || ''}</button>`;
        }).join('')).join('');
        this.grilleEl.querySelectorAll('[data-case]').forEach(b => {
            b.onclick = () => this.viserCase(b.dataset.case);
        });

        this.majIndice();
        this.majListes();
    }

    majIndice() {
        if (!this.vise) { this.indiceEl.textContent = ''; return; }
        const sens = this.vise.dir === 'h' ? 'Horizontalement' : 'Verticalement';
        this.indiceEl.innerHTML = `<b>${this.vise.num} ${sens}</b> `
            + `(${this.vise.mot.length} lettres) — ${this.vise.def}`;
    }

    majListes() {
        const d = definitions(this.grille);
        const bloc = (titre, liste) => `<h5>${titre}</h5>` + liste.map(e => {
            const m = this.grille.mots.find(w => w.num === e.num && w.mot === e.mot);
            const faite = m && this.motRempli(m) === m.mot;
            const vue = m === this.vise;
            return `<div class="mc-def${faite ? ' mc-def--faite' : ''}${vue ? ' mc-def--vue' : ''}"
                     data-def="${e.num}-${m ? m.dir : 'h'}"><b>${e.num}.</b> ${e.def} (${e.longueur})</div>`;
        }).join('');
        this.listesEl.innerHTML = bloc('Horizontalement', d.horizontal) + bloc('Verticalement', d.vertical);
        this.listesEl.querySelectorAll('[data-def]').forEach(el => {
            el.onclick = () => {
                const [num, dir] = el.dataset.def.split('-');
                const m = this.grille.mots.find(w => w.num === Number(num) && w.dir === dir);
                if (m) { this.vise = m; this.pos = 0; this.dessiner(); }
            };
        });
    }

    motRempli(m) {
        return this.casesDe(m).map(c => this.saisie[`${c.x},${c.y}`] || ' ').join('');
    }

    // --- Écrire ---------------------------------------------------------------

    /**
     * TOUCHER UNE CASE VISE LE MOT QUI PASSE PAR ELLE — et un second appui sur
     * la même case CHANGE DE SENS. C'est le geste des grilles à l'écran, et il
     * évite d'avoir à choisir « horizontal / vertical » dans un menu : une
     * case de croisement appartient à deux mots, on bascule de l'un à l'autre.
     */
    viserCase(cle) {
        if (this.isDemo || this.fini) return;
        const [x, y] = cle.split(',').map(Number);
        const passe = this.grille.mots.filter(m =>
            this.casesDe(m).some(c => c.x === x && c.y === y));
        if (!passe.length) return;
        const dejaLa = this.vise && this.casesDe(this.vise).some(c => c.x === x && c.y === y);
        const suivant = dejaLa
            ? (passe[(passe.indexOf(this.vise) + 1) % passe.length] || passe[0])
            : passe[0];
        this.vise = suivant;
        this.pos = this.casesDe(suivant).findIndex(c => c.x === x && c.y === y);
        this.dessiner();
    }

    taper(lettre) {
        if (this.isDemo || this.fini || !this.vise) return;
        const cases = this.casesDe(this.vise);
        if (lettre === 'eff') {
            // Effacer la case courante si elle porte quelque chose, sinon
            // reculer et effacer : c'est ce que fait n'importe quel champ.
            const ici = cases[this.pos];
            const cle = `${ici.x},${ici.y}`;
            if (this.saisie[cle] && !this.soufflees.has(cle)) delete this.saisie[cle];
            else if (this.pos > 0) {
                this.pos--;
                const p = cases[this.pos];
                const k = `${p.x},${p.y}`;
                if (!this.soufflees.has(k)) delete this.saisie[k];
            }
            this.fautes = null;
            this.dessiner();
            return;
        }
        const ici = cases[this.pos];
        const cle = `${ici.x},${ici.y}`;
        if (!this.soufflees.has(cle)) this.saisie[cle] = lettre;
        this.fautes = null;
        // On avance tout seul : dans une grille, on écrit un mot, pas des
        // lettres isolées.
        if (this.pos < cases.length - 1) this.pos++;
        this.dessiner();
        this.regarderSiFini();
    }

    bouger(sens) {
        if (!this.vise) return;
        const n = this.vise.mot.length;
        this.pos = Math.max(0, Math.min(n - 1, this.pos + sens));
        this.dessiner();
    }

    // --- Aider et vérifier ----------------------------------------------------

    /** Une lettre du mot visé, la première encore vide : jamais tout le mot. */
    /**
     * UNE SEULE LETTRE SOUFFLÉE PAR MOT.
     *
     * Rémy : « on peut tricher en cliquant tout le temps sur une lettre. Il
     * faudrait au max une lettre par mot, et prévenir si on a déjà utilisé ce
     * bonus. » En appuyant assez de fois, la grille se remplissait toute
     * seule — et un indice qu'on peut réclamer indéfiniment n'est plus un
     * indice, c'est le bouton « donne-moi la réponse ».
     *
     * Une par mot, donc : elle donne le pied, elle ne fait pas le travail. Et
     * le refus DIT laquelle a déjà été donnée — « rien ne se passe » se lit
     * comme une panne, pas comme une règle.
     */
    aider() {
        if (this.isDemo || this.fini || !this.vise) return;
        const cases = this.casesDe(this.vise);
        const cleMot = `${this.vise.num}${this.vise.dir}`;
        const dejaVu = this.aides.get(cleMot);
        if (dejaVu !== undefined) {
            this.note(`Tu as déjà eu ton indice sur ce mot : la ${ordinal(dejaVu + 1)} lettre `
                + `est un ${this.vise.mot[dejaVu]}. Une seule par mot — à toi de trouver le reste.`);
            return;
        }
        const k = cases.findIndex((c, i) => (this.saisie[`${c.x},${c.y}`] || '') !== this.vise.mot[i]);
        if (k === -1) { this.note('Ce mot est déjà juste.'); return; }
        const c = cases[k];
        const cle = `${c.x},${c.y}`;
        this.saisie[cle] = this.vise.mot[k];
        this.soufflees.add(cle);
        this.aides.set(cleMot, k);
        this.pos = Math.min(cases.length - 1, k + 1);
        this.fautes = null;
        this.dessiner();
        this.note(`La ${ordinal(k + 1)} lettre est un ${this.vise.mot[k]}. `
            + `Il te reste ${this.aidesRestantes()} indice(s) — un par mot.`);
        this.regarderSiFini();
    }

    /** Combien de mots n'ont pas encore réclamé leur lettre. */
    aidesRestantes() {
        return (this.grille ? this.grille.mots.length : 0) - this.aides.size;
    }

    /**
     * VÉRIFIER MONTRE CE QUI EST FAUX, jamais ce qui est juste.
     *
     * Marquer les bonnes lettres en vert reviendrait à donner la grille par
     * tâtonnement : on essaie une lettre, on vérifie, on garde. Seules les
     * lettres FAUSSES rougissent — et une case vide n'est pas fausse.
     */
    verifier() {
        if (this.isDemo || this.fini) return;
        this.verifs++;
        const fausses = casesFausses(this.grille, this.saisie);
        this.fautes = new Set(fausses.map(c => `${c.x},${c.y}`));
        this.dessiner();
        this.note(fausses.length
            ? `${fausses.length} lettre${fausses.length > 1 ? 's' : ''} en rouge ne va pas.`
            : 'Rien de faux pour l\'instant — mais tout n\'est pas rempli.',
        fausses.length ? 'ko' : 'ok');
    }

    valider() {
        if (this.isDemo || this.fini) return;
        if (estResolue(this.grille, this.saisie)) return this.gagner();
        const vides = this.grille.cases.flatMap((l, y) => l.map((c, x) =>
            c !== null && !this.saisie[`${x},${y}`] ? 1 : 0)).reduce((a, b) => a + b, 0);
        if (vides) { this.note(`Il reste ${vides} case${vides > 1 ? 's' : ''} à remplir.`, 'ko'); return; }
        this.verifier();
    }

    regarderSiFini() {
        if (estResolue(this.grille, this.saisie)) this.gagner();
    }

    gagner() {
        if (this.fini) return;
        this.fini = true;
        this.resolues++;
        const q = qualite(this.grille);
        this.note(`✅ Grille complète — ${q.mots} mots du vocabulaire.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Mots croisés (${this.theme}) : ${q.mots} mots`,
            expected: 'grille complète', given: 'grille complète',
            points: Math.max(10, 40 - this.soufflees.size * 3 - this.verifs * 2)
        });
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'mc-note' + (ton ? ` mc-note--${ton}` : '');
    }

    // --- La démonstration ------------------------------------------------------

    /**
     * Le robot montre LA MÉTHODE des mots croisés, qui n'est pas de répondre
     * dans l'ordre : on commence par le mot dont on est sûr, et chaque lettre
     * posée en donne d'autres sur les mots qui le croisent. C'est tout le
     * bénéfice d'une grille serrée, et cela ne se voit qu'en le faisant.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.grille) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();

        const q = qualite(this.grille);
        cur.say(`${q.mots} mots du vocabulaire, ${q.croisements} croisements. `
            + 'On ne répond pas dans l\'ordre des numéros : on commence par celui dont on est sûr.',
        this.grilleEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le mot le plus long : c'est celui qui donne le plus de lettres aux
        // autres, donc celui par lequel on commence.
        const long = [...this.grille.mots].sort((a, b) => b.mot.length - a.mot.length)[0];
        this.vise = long; this.pos = 0; this.dessiner();
        cur.say(`Je prends le plus long — ${long.mot.length} lettres : « ${long.def} » `
            + 'Chaque lettre qu\'il pose sert aux mots qui le croisent.', this.indiceEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let i = 0; i < long.mot.length; i++) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const c = this.casesDe(long)[i];
            this.saisie[`${c.x},${c.y}`] = long.mot[i];
            this.pos = Math.min(long.mot.length - 1, i + 1);
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.press)) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        const croise = this.grille.mots.find(m => m !== long
            && this.casesDe(m).some(c => this.saisie[`${c.x},${c.y}`]));
        if (croise) {
            this.vise = croise; this.pos = 0; this.dessiner();
            const donnees = this.casesDe(croise).filter(c => this.saisie[`${c.x},${c.y}`]).length;
            cur.say(`Et voilà : « ${croise.def} » a déjà ${donnees} lettre${donnees > 1 ? 's' : ''} `
                + 'de posée. C\'est cela, une grille serrée — une réponse en débloque une autre.',
            this.indiceEl);
            await cur.pause(DEMO_SPEED.between);
        }
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        super.destroy();
    }
}

export function engineMotsCroises(container, isDemo, params) {
    const game = new MotsCroises(container, isDemo, params);
    game.start();
    return game;
}
