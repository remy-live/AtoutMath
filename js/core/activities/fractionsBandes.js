// LES BANDES DE FRACTIONS — « comment rendre cela visuel ? »
//
// Rémy pose la question à propos de l'addition progressive, et c'est la bonne :
// une règle sur les dénominateurs ne s'apprend pas, elle se récite. Ce qui
// s'apprend, c'est l'image qui la rend inévitable.
//
// L'IMAGE : DEUX BANDES DE MÊME LONGUEUR.
//
// Une fraction est une LONGUEUR, pas un couple de nombres. Un tiers et un
// sixième ne s'additionnent pas parce que les morceaux n'ont pas la même
// taille — on le voit, on n'a pas à le croire. Et quand on RECOUPE la bande
// des tiers en six, les anciens traits restent exactement où ils étaient : le
// trait de coupe change, la longueur non. C'est toute la règle, en une image.
//
// L'ADDITION, ELLE, A QUITTÉ CET ÉCRAN. Rémy, après essai : « je ne suis pas
// convaincu par les bandes pour les fractions, on va proposer l'addition de
// fraction sans support visuel, car on peut tomber sur des choses
// incohérentes ». Il a raison — passé une vingtaine de parts, le dessin devient
// une hachure, et une image qui cesse de montrer au moment où le calcul devient
// difficile n'aide personne. Elle se pose maintenant ligne par ligne dans
// `fractionsPose.js`, avec la table de Pythagore en aide.
//
// Il reste ici l'ÉGALITÉ À COMPLÉTER, où deux longueurs suffisent à tout dire :
// même longueur, coupée autrement. Rien à recouper, rien à hachurer.
//
// « TOUJOURS DES FRACTIONS EN COLONNES » : numérateur sur dénominateur,
// séparés d'un trait, partout — y compris dans les cases à remplir.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

// --- Le dessin d'une bande ---------------------------------------------------

// Coordonnées internes d'UNE unité. La bande entière fait `unites` fois cette
// largeur : c'est ce qui fait que 3/2 se dessine plus long que 1/2, et que deux
// fractions égales se dessinent rigoureusement de la même longueur.
const UNITE = 120;
const HAUT = 34;

// QUAND LES TRAITS SE SERRENT.
//
// Deux seuils, parce qu'il y a deux problèmes. Vers vingt traits, une coupe
// pleine épaisseur devient un peigne noir : on l'affine, et la bande se relit.
// Vers soixante — 13/9 = 65/45, quatre-vingt-dix traits sur la largeur d'un
// téléphone —, plus rien ne se distingue : on ne dessine alors que les
// frontières d'unité, et on le DIT. Mieux vaut une bande qui s'assume
// incomplète qu'un aplat gris qui prétend montrer quelque chose.
const TRAITS_FINS = 20;
const TRAITS_LISIBLES = 60;
export const tropDeTraits = (parts, unites = 1) => parts * unites > TRAITS_LISIBLES;

/**
 * Une bande coupée en `parts` par unité, dont `pleines` sont coloriées.
 *
 * @param {Object} o
 * @param {number} o.parts    - découpage actuel (0 = pas encore coupée)
 * @param {number} o.pleines  - nombre de parts coloriées
 * @param {number} [o.unites] - nombre d'unités (une fraction impropre en occupe plusieurs)
 * @param {string} [o.teinte]     - classe de couleur du remplissage
 */
function bandeSvg(o) {
    const unites = Math.max(1, o.unites || 1);
    const L = UNITE * unites;
    const parts = o.parts > 0 ? o.parts : 0;
    const pleines = Math.max(0, Math.min(o.pleines ?? 0, parts * unites));
    const pas = parts > 0 ? UNITE / parts : 0;

    let dedans = '';
    if (parts > 0 && pleines > 0) {
        dedans += `<rect class="fb-plein ${o.teinte || ''}" x="0" y="0"
            width="${(pleines * pas).toFixed(3)}" height="${HAUT}" />`;
    }
    // Les traits de coupe actuels. Une frontière d'unité est plus épaisse :
    // c'est elle qui dit « ici, une bande entière est passée ».
    //
    // LA SECONDE BANDE EST DÉCOUPÉE, et c'est tout l'exercice : « l'élève aura
    // juste à compter dans un premier temps ». Une version antérieure la
    // voilait — elle demandait alors de calculer avant d'avoir constaté quoi
    // que ce soit. Restent les seuils de lisibilité : passé soixante traits, on
    // ne dessine plus que les frontières d'unité, parce qu'un peigne ne se
    // compte pas non plus. Le générateur garde d'ailleurs les nombres petits
    // pendant la phase du comptage.
    const total = parts;
    const serre = tropDeTraits(total, unites);
    const fines = total * unites > TRAITS_FINS ? ' fb-coupe--fine' : '';
    if (parts > 0) {
        for (let i = 1; i < parts * unites; i++) {
            const entiere = i % parts === 0;
            if (serre && !entiere) continue;
            const x = (i * pas).toFixed(3);
            dedans += `<line class="fb-coupe${entiere ? ' fb-coupe--unite' : ''}${fines}"
                x1="${x}" y1="0" x2="${x}" y2="${HAUT}" />`;
        }
    }

    return `<svg class="fb-bande" viewBox="-2 -5 ${L + 4} ${HAUT + 10}"
        preserveAspectRatio="none" role="img" aria-label="${etiquetteAlt(o, unites)}">
        ${dedans}
        <rect class="fb-cadre" x="0" y="0" width="${L}" height="${HAUT}" />
    </svg>`;
}

function etiquetteAlt(o, unites) {
    if (!o.parts) return 'bande non coupée';
    return `bande coupée en ${o.parts} par unité, ${o.pleines} parts coloriées`
        + (unites > 1 ? `, sur ${unites} unités` : '');
}

// --- Petites briques d'écriture ---------------------------------------------

const colonne = (n, d, cls = '') =>
    `<span class="fraction fb-frac ${cls}"><span class="fraction-num">${n}</span>`
    + `<span class="fraction-den">${d}</span></span>`;

/** Une case à remplir, dans une fraction en colonne. */
const caseHtml = (nom, libelle) =>
    `<button type="button" class="fb-case" data-case="${nom}"
        aria-label="${libelle}"><span class="fb-case-val"></span></button>`;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let gate = null;
    // Les cases de la question en cours : nom → { attendu, el }.
    let cases = {};
    let choisie = null;
    let valeurs = {};

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    // --- Les cases ----------------------------------------------------------

    function poser(nom, texte) {
        valeurs[nom] = texte;
        const c = cases[nom];
        if (!c) return;
        c.el.querySelector('.fb-case-val').textContent = texte;
        c.el.classList.toggle('fb-case--pleine', texte !== '');
        c.el.classList.remove('fb-case--juste', 'fb-case--faux');
        majValider();
    }

    function selectionner(nom) {
        choisie = nom;
        Object.entries(cases).forEach(([k, c]) => c.el.classList.toggle('fb-case--active', k === nom));
    }

    /** La case suivante encore vide, sinon la suivante tout court. */
    function suivante(nom) {
        const noms = Object.keys(cases);
        const i = noms.indexOf(nom);
        const apres = [...noms.slice(i + 1), ...noms.slice(0, i)];
        return apres.find(n => !valeurs[n]) || apres[0] || nom;
    }

    function taper(k) {
        if (session.locked || !choisie) return;
        const actuel = valeurs[choisie] || '';
        if (k === '←') poser(choisie, actuel.slice(0, -1));
        else if (actuel.length < 3) poser(choisie, actuel + k);
    }

    function majValider() {
        const btn = container.querySelector('[data-valider]');
        if (btn) btn.disabled = Object.keys(cases).some(n => !valeurs[n]);
    }



    // --- Le rendu -----------------------------------------------------------

    function render(item) {
        cases = {};
        valeurs = {};
        choisie = null;

        const scene = sceneEgalite(item);

        // Le cadre extérieur ne sert qu'à MESURER (voir `.fb-ecran` en CSS) :
        // une requête de conteneur ne s'applique pas au conteneur lui-même.
        container.innerHTML = `
            <div class="fb-ecran"><div class="fb-layout fb-layout--egalite">
                <div class="fb-scene">${scene.html}</div>
                <div class="fb-panneau">
                    <div class="fb-pave" role="group" aria-label="Chiffres">
                        ${DIGITS.map(k => `<button type="button" class="fb-touche"
                            data-touche="${k}">${k}</button>`).join('')}
                        <button type="button" class="fb-touche fb-touche--del" data-touche="←"
                            aria-label="Effacer">⌫</button>
                        <button type="button" class="fb-touche fb-touche--ok"
                            data-valider disabled>Valider</button>
                    </div>
                    <div class="fb-note" data-note aria-live="polite"></div>
                    ${hintBar(session)}
                </div>
            </div></div>`;

        container.querySelectorAll('[data-case]').forEach(el => {
            const nom = el.dataset.case;
            cases[nom] = { el, attendu: scene.attendu[nom] };
            valeurs[nom] = '';
            el.onclick = () => { if (!session.locked) selectionner(nom); };
        });
        selectionner(Object.keys(cases)[0]);
        majValider();

        if (session.isDemo) {
            if (!session.frozen) runDemo(item, scene);
            return;
        }

        wireHint(container, session);
        container.querySelectorAll('[data-touche]').forEach(btn => {
            btn.onclick = () => taper(btn.dataset.touche);
        });
        container.querySelector('[data-valider]').onclick = () => valider(item, scene);

        container.tabIndex = -1;
        container.focus({ preventScroll: true });
        container.onkeydown = (e) => {
            if (session.locked) return;
            if (/^[0-9]$/.test(e.key)) { taper(e.key); e.preventDefault(); }
            else if (e.key === 'Backspace') { taper('←'); e.preventDefault(); }
            else if (e.key === 'Tab') { selectionner(suivante(choisie)); e.preventDefault(); }
            else if (e.key === 'Enter') {
                const btn = container.querySelector('[data-valider]');
                if (btn && !btn.disabled) valider(item, scene);
                e.preventDefault();
            }
        };
    }

    // --- La validation ------------------------------------------------------

    function valider(item, scene) {
        if (destroyed || session.locked) return;
        // CHAQUE CASE EST JUGÉE SÉPARÉMENT. Tout barrer d'un trait quand une
        // seule case cloche efface le fait que l'élève a trouvé le
        // dénominateur commun — et c'est justement là-dessus qu'il faut
        // s'appuyer pour lui montrer la suite.
        const justes = {};
        Object.entries(cases).forEach(([nom, c]) => {
            const bon = String(valeurs[nom]) === String(c.attendu);
            justes[nom] = bon;
            c.el.classList.toggle('fb-case--juste', bon);
            c.el.classList.toggle('fb-case--faux', !bon);
        });

        const donnee = scene.reponse(valeurs);
        const result = session.submit(donnee, { element: container.querySelector('.fb-scene') });
        if (result.ignored) return;

        const note = container.querySelector('[data-note]');
        if (note) note.textContent = result.correct ? '' : (scene.diagnostic(valeurs, justes) || '');
        if (result.correct && scene.reussi) scene.reussi();

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) return renderNext();
            if (result.revealed) {
                Object.entries(cases).forEach(([nom, c]) => {
                    poser(nom, String(c.attendu));
                    c.el.classList.add('fb-case--juste');
                    c.el.classList.remove('fb-case--faux');
                });
                if (scene.reussi) scene.reussi();
                if (note) note.textContent = '';
                regTimeout(renderNext, 2200);
            } else {
                // On efface SEULEMENT ce qui est faux : refaire taper une case
                // déjà juste, c'est demander de rejouer ce qu'on a réussi.
                Object.entries(justes).forEach(([nom, bon]) => { if (!bon) poser(nom, ''); });
                const premierFaux = Object.keys(cases).find(n => !justes[n]);
                if (premierFaux) selectionner(premierFaux);
            }
        });
    }

    // --- L'ÉGALITÉ : ON COMPTE D'ABORD, ON MULTIPLIE ENSUITE ------------------
    //
    // Rémy : « tu peux mettre les bandes l'une en dessous de l'autre et
    // découper la seconde bande, l'élève aura juste à compter dans un premier
    // temps (2-3 questions), et après tu les enlèves pour qu'il multiplie. Tu
    // peux faire une flèche de multiplication en haut et en bas. »
    //
    // C'est la bonne marche zéro, et elle manquait. La version d'avant voilait
    // la seconde bande — « même longueur, mais coupée en combien ? » — ce qui
    // demandait DÉJÀ de calculer. Découpée et posée juste en dessous, elle se
    // compte : les deux longueurs coloriées s'arrêtent au même endroit, et
    // l'élève constate de ses yeux que 1/3 et 4/12 sont la même chose avant
    // qu'on lui demande de le démontrer.
    //
    // Puis les bandes s'en vont, et il ne reste que les DEUX FLÈCHES — en haut
    // et en bas, portant le même « × ? ». C'est la notation du cahier, et elle
    // dit tout : le facteur se trouve du côté où les deux nombres sont écrits,
    // et il s'applique à l'autre étage.

    function sceneEgalite(item) {
        const e = (item.meta || {}).egalite;
        if (!e) return { html: item.prompt.html, attendu: {}, reponse: () => '', diagnostic: () => '' };
        return (item.meta.avecBandes ? sceneComptage : sceneFleches)(e);
    }

    const trouHtml = (e) => (e.trou === 'numerateur'
        ? colonne(caseHtml('x', 'numérateur manquant'), e.droite.d, 'fraction--trou')
        : colonne(e.droite.n, caseHtml('x', 'dénominateur manquant'), 'fraction--trou'));

    /** Le diagnostic est le même dans les deux phases : c'est la même règle. */
    function diagnosticEgalite(e, compte) {
        return (v) => {
            const propose = Number(v.x);
            if (!Number.isFinite(propose)) return '';
            const vu = e.trou === 'numerateur' ? 'dénominateur' : 'numérateur';
            const depart = e.trou === 'numerateur' ? e.gauche.d : e.gauche.n;
            if (propose === depart) {
                return `Tu as recopié le nombre de gauche. Le ${vu}, lui, a changé : `
                    + 'regarde de combien.';
            }
            if (compte) {
                return e.trou === 'numerateur'
                    ? 'Compte les petites parts COLORIÉES de la bande du bas.'
                    : 'Compte toutes les petites parts de la bande du bas, coloriées ou non.';
            }
            if (e.sens === 'agrandir' && propose < depart) {
                return 'La fraction de droite est écrite avec de PLUS GRANDS nombres : '
                    + 'on multiplie, on ne divise pas.';
            }
            return `Repars du ${vu} : il est écrit des deux côtés, c'est lui qui donne le facteur.`;
        };
    }

    /** PHASE 1 — deux bandes empilées, la seconde découpée : on compte. */
    function sceneComptage(e) {
        const unites = Math.max(1, Math.ceil(e.gauche.n / e.gauche.d));
        const rang = (frac, parts, pleines, teinte) => `
            <div class="fb-rang-frac">${frac}</div>
            <div class="fb-rang-bande">${bandeSvg({ parts, pleines, unites, teinte })}</div>`;

        const html = `
            <div class="fb-pile">
                ${rang(colonne(e.gauche.n, e.gauche.d), e.gauche.d, e.gauche.n, '')}
                <div class="fb-pile-egal">=</div>
                <div class="fb-pile-vide"></div>
                ${rang(trouHtml(e), e.droite.d, e.droite.n, 'fb-plein--b')}
            </div>
            <p class="fb-legende">Les deux bandes font la MÊME longueur, et le coloriage s'arrête
                au même endroit. La seconde est juste coupée plus fin : compte ses parts.</p>`;

        return {
            html,
            attendu: { x: e.reponse },
            reponse: (v) => v.x,
            reussi() {
                const legende = container.querySelector('.fb-legende');
                if (legende) {
                    legende.textContent = `${e.gauche.n}/${e.gauche.d} et ${e.droite.n}/${e.droite.d} `
                        + 'occupent exactement la même longueur : ce sont deux écritures de la '
                        + 'même fraction.';
                }
                container.querySelectorAll('.fb-rang-bande').forEach(
                    el => el.classList.add('fb-rang-bande--ok'));
            },
            diagnostic: diagnosticEgalite(e, true),
            demo: [{
                nom: 'x',
                dit: e.trou === 'numerateur'
                    ? `Les deux longueurs coloriées s'arrêtent au même endroit. Je compte les `
                        + `petites parts coloriées d'en bas : il y en a ${e.reponse}.`
                    : `Je compte toutes les parts de la bande du bas : il y en a ${e.reponse}.`
            }]
        };
    }

    /** PHASE 2 — plus de bandes : les deux flèches de multiplication. */
    function sceneFleches(e) {
        const divise = e.sens === 'simplifier';
        const signe = divise ? '÷' : '×';
        const fleche = (ou) => `
            <div class="fb-fleche fb-fleche--${ou}">
                <svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M6 ${ou === 'haut' ? 19 : 3} Q50 ${ou === 'haut' ? -4 : 26}
                             92 ${ou === 'haut' ? 19 : 3}" />
                    <path class="fb-pointe" d="M92 ${ou === 'haut' ? 19 : 3}
                        l-6 ${ou === 'haut' ? -3 : 3} l1 ${ou === 'haut' ? 7 : -7} z" />
                </svg>
                <span class="fb-fleche-mot" data-facteur="${ou}">${signe}&nbsp;?</span>
            </div>`;

        const html = `
            <div class="fb-avecfleches">
                ${fleche('haut')}
                <div class="fb-egalite fb-egalite--nue">
                    ${colonne(e.gauche.n, e.gauche.d)}
                    <span class="fb-signe">=</span>
                    ${trouHtml(e)}
                </div>
                ${fleche('bas')}
            </div>
            <p class="fb-legende">En haut et en bas, c'est le MÊME nombre : c'est ce qui fait que
                la fraction ne change pas de valeur.</p>`;

        return {
            html,
            attendu: { x: e.reponse },
            reponse: (v) => v.x,
            reussi() {
                container.querySelectorAll('[data-facteur]').forEach(el => {
                    el.textContent = `${signe} ${e.facteur}`;
                    el.classList.add('fb-fleche-mot--su');
                });
                const legende = container.querySelector('.fb-legende');
                if (legende) {
                    legende.textContent = `${e.gauche.n}/${e.gauche.d} = ${e.droite.n}/${e.droite.d} : `
                        + `on ${divise ? 'divise' : 'multiplie'} les deux étages par ${e.facteur}, `
                        + 'et la fraction garde la même valeur.';
                }
            },
            diagnostic: diagnosticEgalite(e, false),
            demo: [{
                nom: 'x',
                dit: `Le ${e.trou === 'numerateur' ? 'dénominateur' : 'numérateur'} passe de `
                    + `${e.trou === 'numerateur' ? e.gauche.d : e.gauche.n} à ${e.visible} : `
                    + `c'est ${signe} ${e.facteur}. La flèche du dessus dit la même chose.`
            }]
        };
    }

    // --- Le robot -----------------------------------------------------------

    /**
     * Le robot REMPLIT LES CASES EN DISANT POURQUOI. Le voir taper des chiffres
     * n'apprendrait que le geste ; c'est le raisonnement qu'on vient regarder.
     */
    async function runDemo(item, scene) {
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        if (!await gate.waitTurn() || destroyed) return;
        if (!await cursor.pause(600) || destroyed) return;

        const sceneEl = container.querySelector('.fb-scene');
        cursor.say('Les deux bandes font la même longueur. Je cherche en combien la seconde '
            + 'est coupée.', sceneEl || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;

        for (const pas of (scene.demo || [])) {
            const c = cases[pas.nom];
            if (!c) continue;
            if (!await gate.waitTurn() || destroyed) return;
            selectionner(pas.nom);
            if (pas.dit) {
                cursor.say(pas.dit, c.el);
                if (!await cursor.pause(DEMO_SPEED.settle) || destroyed) return;
            }
            if (!await cursor.tap(c.el, 380) || destroyed) return;
            const cible = String(c.attendu);
            for (let i = 0; i < cible.length; i++) {
                poser(pas.nom, cible.slice(0, i + 1));
                if (!await cursor.pause(200) || destroyed) return;
            }
            c.el.classList.add('fb-case--juste');
        }

        if (!await gate.waitTurn() || destroyed) return;
        if (scene.reussi) scene.reussi();
        cursor.say(item.explanation || 'Et voilà : la longueur n\'a pas bougé.',
            sceneEl || container);
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    if (opts.item) render(opts.item); else renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.onkeydown = null;
            container.innerHTML = '';
            session.finish();
        }
    };
}
