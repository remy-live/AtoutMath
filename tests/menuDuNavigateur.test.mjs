// LE MENU DU NAVIGATEUR NE S'OUVRE PAS PAR-DESSUS UN EXERCICE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le météorites mathématiques quand on clique hors de la zone (le
// cercle en pointillés), ca montre le menu contextuel ».
//
// Sur une tablette, l'appui long est un geste ordinaire : on pose le doigt pour
// viser, on hésite une seconde, et le système ouvre « Copier / Rechercher /
// Partager » par-dessus le jeu. Le temps de le fermer, la météorite est passée.
//
// CE N'ÉTAIT PAS UN DÉFAUT DES MÉTÉORITES. MESURÉ avec
// `tools/leMenuDuNavigateur.mjs`, qui envoie un vrai `contextmenu` dans un coin
// du plateau et lit `defaultPrevented` — la seule chose qui décide si le menu
// s'ouvre :
//
//   FUITE  calc-arcade-shooter   sur « canvas-area »
//   FUITE  calc-labyrinthe       sur « laby-stats »
//   FUITE  geo-tangram           sur « tg-wrap »
//
// Trois sur trois, et le prochain jeu écrit l'aurait porté aussi. Le correctif
// est donc sur la couche de jeu, une fois, pour tous.
//
// APRÈS, les mêmes trois : « le menu est avalé ».
//
// CE QUE CETTE ÉPREUVE GARDE, ET QUE LE NAVIGATEUR NE DIT PAS. La sonde prouve
// que le menu est avalé ; elle ne prouve pas qu'un CHAMP DE SAISIE garde le
// sien, parce qu'il faut un exercice qui en affiche un au bon moment. Or c'est
// la moitié qu'on casse en corrigeant l'autre : un élève qui tape une rédaction
// doit pouvoir copier et coller. On interroge donc l'écouteur directement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';

/**
 * LA COUCHE DE JEU, RÉDUITE À CE QUE LE MODULE LUI DEMANDE.
 *
 * On ne simule pas un navigateur : on retient l'écouteur posé sur
 * `contextmenu` et on l'appelle. C'est le vrai écouteur, celui du module —
 * recopier sa condition dans l'épreuve ne la vérifierait pas, il la répéterait.
 */
function coucheFactice() {
    const ecouteurs = {};
    return {
        style: { display: 'block' },
        setAttribute() { }, removeAttribute() { },
        addEventListener(type, fn) { (ecouteurs[type] = ecouteurs[type] || []).push(fn); },
        ecouteurs
    };
}

/** Un faux événement, avec le `closest` que la condition interroge. */
function evenement(selectorsDeLaCible) {
    const ev = {
        defaultPrevented: false,
        preventDefault() { ev.defaultPrevented = true; },
        target: {
            closest(sel) {
                // `closest` rend un élément ou null : on répond vrai quand la
                // cible annonce appartenir à l'un des sélecteurs demandés.
                return selectorsDeLaCible.some(s => sel.includes(s)) ? {} : null;
            }
        }
    };
    return ev;
}

/** Branche la couche et rend l'écouteur de `contextmenu`. */
async function brancher() {
    const couche = coucheFactice();
    const avant = {
        getElementById: globalThis.document.getElementById,
        body: globalThis.document.body,
        getComputedStyle: globalThis.getComputedStyle,
        MutationObserver: globalThis.MutationObserver
    };
    globalThis.document.getElementById = (id) => (id === 'game-layer' ? couche : null);
    globalThis.document.querySelector = () => null;
    // Le drapeau vit sur `body.dataset` : sans lui, le module refuse de se
    // brancher deux fois — et chaque épreuve veut sa couche neuve.
    globalThis.document.body = { dataset: {} };
    globalThis.getComputedStyle = () => ({ display: 'block' });
    globalThis.MutationObserver = class { observe() { } };

    // L'import est mis en cache par Node : on le fait une fois, et c'est la
    // fonction qu'on rappelle avec un `body` neuf à chaque épreuve.
    const { initCoucheDeJeu } = await import('../js/ui/coucheDeJeu.js');
    try { initCoucheDeJeu(); } finally {
        globalThis.document.getElementById = avant.getElementById;
        globalThis.document.body = avant.body;
        globalThis.getComputedStyle = avant.getComputedStyle;
        globalThis.MutationObserver = avant.MutationObserver;
    }
    const liste = couche.ecouteurs.contextmenu || [];
    assert.equal(liste.length, 1, 'la couche de jeu n\'écoute pas `contextmenu`');
    return liste[0];
}

test('UN APPUI LONG SUR LE PLATEAU N\'OUVRE PLUS LE MENU DU NAVIGATEUR', async () => {
    const ecouteur = await brancher();
    // La cible de Rémy : un coin de l'arène, qui n'est rien de particulier.
    const ev = evenement(['.shooter-arena']);
    ecouteur(ev);
    assert.equal(ev.defaultPrevented, true,
        'le menu du navigateur s\'ouvre encore par-dessus l\'exercice');
});

test('MAIS UN CHAMP DE SAISIE GARDE LE SIEN — copier et coller restent possibles', async () => {
    const ecouteur = await brancher();
    // Les quatre formes qu'un champ peut prendre dans les exercices : la
    // réponse tapée, la rédaction, un choix, et l'éditeur de l'Atelier.
    for (const quoi of ['input', 'textarea', 'select', 'contenteditable']) {
        const ev = evenement([quoi]);
        ecouteur(ev);
        assert.equal(ev.defaultPrevented, false,
            `un « ${quoi} » perd son menu : l'élève ne peut plus coller`);
    }
});

test('UNE CIBLE SANS `closest` NE FAIT PAS TOMBER LE JEU', async () => {
    // Un événement peut viser le document lui-même, qui n'a pas de `closest`.
    // Une exception ici tuerait l'écouteur, donc le jeu.
    const ecouteur = await brancher();
    const ev = {
        defaultPrevented: false,
        preventDefault() { ev.defaultPrevented = true; },
        target: null
    };
    ecouteur(ev);
    assert.equal(ev.defaultPrevented, true, 'le menu passe quand la cible est nue');
});

test('LE DÉMINEUR GARDE SON CLIC DROIT — deux écouteurs, pas un', async () => {
    // Il pose ses drapeaux au clic droit (`js/games/demineur.js`), Colorier
    // aussi. Annuler le menu n'annule pas leur écouteur : deux écouteurs sur le
    // même événement s'exécutent tous les deux. On le prouve en lisant la
    // source plutôt qu'en montant un démineur : ce qui compte est que le jeu
    // pose SON écouteur et n'attende rien de la couche.
    const { readFileSync } = await import('node:fs');
    const DEM = readFileSync(new URL('../js/games/demineur.js', import.meta.url), 'utf8');
    assert.match(DEM, /addEventListener\('contextmenu'/);
    // Et la couche n'arrête pas la propagation : si elle le faisait, l'écouteur
    // du Démineur — posé sur le plateau, donc PLUS BAS — resterait muet.
    const COUCHE = readFileSync(new URL('../js/ui/coucheDeJeu.js', import.meta.url), 'utf8');
    assert.ok(!/stopPropagation|stopImmediatePropagation/.test(COUCHE),
        'la couche coupe la propagation : les jeux qui se servent du clic droit deviennent muets');
    // ET ELLE N'ÉCOUTE PAS À LA CAPTURE, qui passerait AVANT le jeu.
    assert.ok(!/addEventListener\('contextmenu',[\s\S]{0,200}?(true|capture)/.test(COUCHE),
        'la couche écoute à la capture : elle passe avant le jeu');
});
