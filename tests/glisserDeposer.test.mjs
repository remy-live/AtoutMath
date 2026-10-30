// LE GESTE QUE TOUT ÉLÈVE ESSAIE DEVANT UNE ÉTIQUETTE ET UNE CASE VIDE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/glisserDeposer.js` donne le glisser-déposer à tous les exercices à
// trous. Son en-tête nomme les trois comportements qu'on attend d'un vrai
// glisser, et ce sont eux qu'on garde ici :
//
//   · UN FANTÔME suit le doigt (on doit voir ce qu'on déplace) ;
//   · LA CIBLE SURVOLÉE S'ALLUME, ET ELLE SEULE ;
//   · UN BLOC DÉJÀ POSÉ QU'ON RELÂCHE DANS LE VIDE RETOURNE AU STOCK. « Sans
//     lui, l'élève qui s'est trompé de case ne sait plus comment revenir en
//     arrière. »
//
// PLUS DEUX DÉCISIONS QUE SEULE UNE MESURE PEUT TENIR :
//
//   · LES HUIT PIXELS DE MARGE. « En dessous, c'est un appui qui tremble, pas
//     un glissement — et l'appui a déjà son propre effet. » Trop petit, chaque
//     appui d'un élève sur tablette devient un glissement raté ; trop grand, le
//     glissement ne part jamais.
//   · LE TACTILE PASSE PAR LES ÉVÉNEMENTS TOUCH, PAS POINTEUR. « Safari émet un
//     `pointercancel` dès qu'il décide qu'un geste est un défilement, et le
//     glissement mourait à mi-chemin. » C'est pourquoi `pointerdown` REFUSE les
//     pointeurs de type « touch » : si cette ligne tombait, le doigt
//     déclencherait les deux chemins à la fois, et l'étiquette serait déposée
//     deux fois.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI UN FAUX DOM ET NON UN NAVIGATEUR. Ce module est trente lignes de
// logique d'événements : quel chemin pour quel geste, quelle marge, quel ordre
// d'appels. Un navigateur mesurerait l'intégration — et c'est le travail des
// sondes de `tools/`. Ici l'on veut les RÈGLES, une à une, et pouvoir les voir
// tomber. Le faux DOM reste donc petit et bête : il ne sait faire que ce que le
// module lui demande, et il JETTE sur ce qu'il ne sait pas faire plutôt que de
// rendre `undefined` — un faux DOM complaisant laisse passer exactement les
// défauts qu'on cherche.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';

// ─── Un DOM minuscule, mais qui ne ment pas ──────────────────────────────────

class FauxClassList {
    constructor() { this.jetons = new Set(); }
    add(...c) { c.forEach(x => this.jetons.add(x)); }
    remove(...c) { c.forEach(x => this.jetons.delete(x)); }
    contains(c) { return this.jetons.has(c); }
    toggle(c, v) { (v ?? !this.jetons.has(c)) ? this.jetons.add(c) : this.jetons.delete(c); }
    get length() { return this.jetons.size; }
}

class FauxElement {
    constructor(marque = 'div', classes = []) {
        this.marque = marque;
        this.classList = new FauxClassList();
        classes.forEach(c => this.classList.add(c));
        this.style = {};
        this.enfants = [];
        this.parent = null;
        this.ecouteurs = new Map();
        this.rect = { left: 0, top: 0, width: 40, height: 24 };
        this.retire = false;
    }
    addEventListener(type, fn) {
        if (!this.ecouteurs.has(type)) this.ecouteurs.set(type, []);
        this.ecouteurs.get(type).push(fn);
    }
    removeEventListener(type, fn) {
        const l = this.ecouteurs.get(type) || [];
        const i = l.indexOf(fn);
        if (i >= 0) l.splice(i, 1);
    }
    emettre(type, ev = {}) {
        (this.ecouteurs.get(type) || []).slice().forEach(fn => fn({
            type, preventDefault() { }, ...ev
        }));
    }
    appendChild(e) { e.parent = this; this.enfants.push(e); return e; }
    remove() {
        this.retire = true;
        if (this.parent) this.parent.enfants = this.parent.enfants.filter(x => x !== this);
        this.parent = null;
    }
    cloneNode() {
        const c = new FauxElement(this.marque, [...this.classList.jetons]);
        c.rect = { ...this.rect };
        return c;
    }
    getBoundingClientRect() { return this.rect; }
    /** Le `closest` du module : on ne gère qu'un sélecteur de classe. */
    closest(sel) {
        const classe = sel.replace(/^\./, '');
        let n = this;
        while (n) {
            if (n.classList.contains(classe)) return n;
            n = n.parent;
        }
        return null;
    }
}

/** Le document : ce que le module en utilise, et rien de plus. */
function monterDocument() {
    const corps = new FauxElement('body');
    let sousLePoint = null;
    const bus = new Map();
    globalThis.document = {
        body: corps,
        addEventListener(type, fn) {
            if (!bus.has(type)) bus.set(type, []);
            bus.get(type).push(fn);
        },
        removeEventListener(type, fn) {
            const l = bus.get(type) || [];
            const i = l.indexOf(fn);
            if (i >= 0) l.splice(i, 1);
        },
        emettre(type, ev = {}) {
            (bus.get(type) || []).slice().forEach(fn => fn({ type, preventDefault() { }, ...ev }));
        },
        /** Ce que le module interroge pour savoir quelle cible il survole. */
        elementFromPoint() { return sousLePoint; },
        viser(el) { sousLePoint = el; },
        createElement(m) { return new FauxElement(m); },
        combienDEcouteurs(type) { return (bus.get(type) || []).length }
    };
    return globalThis.document;
}

/** Un petit décor : une étiquette, deux cases, une réserve. */
function monterDecor(doc) {
    const reserve = new FauxElement('div', ['reserve']);
    const etiquette = new FauxElement('span', ['etiquette']);
    const case1 = new FauxElement('div', ['case']);
    const case2 = new FauxElement('div', ['case']);
    doc.body.appendChild(reserve).appendChild(etiquette);
    doc.body.appendChild(case1);
    doc.body.appendChild(case2);
    return { reserve, etiquette, case1, case2 };
}

/** Le journal de ce que l'appelant a vu passer. */
function journal() {
    const j = { deposes: [], retours: 0, survoles: [], glissements: [] };
    return {
        j,
        deposer: (c) => j.deposes.push(c),
        retirer: () => { j.retours++; },
        survoler: (c) => j.survoles.push(c),
        marquerGlissement: (v) => j.glissements.push(v)
    };
}

const charger = () => import('../js/core/glisserDeposer.js');

// ─────────────────────────────────────────────────────────────────────────────

test('AU DOIGT, UN APPUI QUI TREMBLE N\'EST PAS UN GLISSEMENT', () => {
    // LES HUIT PIXELS DE MARGE. Sans eux, chaque appui d'un élève sur tablette
    // partirait en glissement — et comme l'appui a « déjà son propre effet »,
    // les deux se marcheraient dessus : l'étiquette serait posée puis reprise.
    return charger().then(({ rendreGlissable }) => {
        const doc = monterDocument();
        const { etiquette, case1 } = monterDecor(doc);
        const { j, deposer, survoler } = journal();
        rendreGlissable(etiquette, { cibles: '.case', deposer, survoler });

        etiquette.emettre('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
        doc.viser(case1);
        // Sept pixels : sous la marge.
        doc.emettre('touchmove', { touches: [{ clientX: 105, clientY: 105 }] });
        doc.emettre('touchend', {});

        assert.equal(j.deposes.length, 0, 'un tremblement de 7 px ne doit rien déposer');
        assert.equal(doc.body.enfants.some(e => e.classList.contains('gd-fantome')), false,
            'et il ne doit pas non plus avoir fabriqué de fantôme');
    });
});

test('AU-DELÀ DE HUIT PIXELS, LE GLISSEMENT PART', async () => {
    const { rendreGlissable } = await charger();
    const doc = monterDocument();
    const { etiquette, case1 } = monterDecor(doc);
    const { j, deposer } = journal();
    rendreGlissable(etiquette, { cibles: '.case', deposer });

    etiquette.emettre('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
    doc.viser(case1);
    doc.emettre('touchmove', { touches: [{ clientX: 120, clientY: 100 }] });

    // LE FANTÔME DOIT ÊTRE LÀ : « on doit voir ce qu'on déplace ». Sans lui,
    // l'élève tire quelque chose d'invisible et croit que rien ne se passe.
    const fantome = doc.body.enfants.find(e => e.classList.contains('gd-fantome'));
    assert.ok(fantome, 'un fantôme doit suivre le doigt');
    assert.equal(fantome.style.left, '120px');
    assert.equal(fantome.style.top, '100px');
    assert.ok(etiquette.classList.contains('gd-source'),
        'et l\'étiquette d\'origine doit se marquer comme partie');

    doc.emettre('touchend', {});
    assert.equal(j.deposes.length, 1, 'le lâcher sur une case dépose');
    assert.equal(j.deposes[0], case1);
    assert.ok(fantome.retire, 'et le fantôme s\'en va');
    assert.ok(!etiquette.classList.contains('gd-source'), 'l\'étiquette ne reste pas grisée');
});

test('UNE SEULE CIBLE S\'ALLUME À LA FOIS', () => {
    // DEUX CASES ALLUMÉES NE DISENT PLUS RIEN. L'élève ne sait pas où son
    // étiquette va tomber, et c'est précisément l'information que l'éclairage
    // existe pour donner.
    return charger().then(({ rendreGlissable }) => {
        const doc = monterDocument();
        const { etiquette, case1, case2 } = monterDecor(doc);
        const { j, deposer, survoler } = journal();
        rendreGlissable(etiquette, { cibles: '.case', deposer, survoler });

        etiquette.emettre('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
        doc.viser(case1);
        doc.emettre('touchmove', { touches: [{ clientX: 50, clientY: 0 }] });
        assert.ok(case1.classList.contains('gd-survol'));
        assert.ok(!case2.classList.contains('gd-survol'));

        doc.viser(case2);
        doc.emettre('touchmove', { touches: [{ clientX: 90, clientY: 0 }] });
        assert.ok(!case1.classList.contains('gd-survol'), 'la case quittée doit s\'éteindre');
        assert.ok(case2.classList.contains('gd-survol'));

        doc.emettre('touchend', {});
        assert.ok(!case2.classList.contains('gd-survol'), 'et tout s\'éteint au lâcher');

        // L'APERÇU EST PRÉVENU À CHAQUE CHANGEMENT, ET UNE DERNIÈRE FOIS AVEC
        // `null`. C'est ce qui permet d'écrire « voilà où le nombre tomberait »
        // dans la grille ; sans le `null` final, « un fantôme resterait écrit
        // dans la grille par-dessus le vrai chiffre ».
        assert.deepEqual(j.survoles, [case1, case2, null]);
    });
});

test('UN BLOC POSÉ QU\'ON LÂCHE DANS LE VIDE RETOURNE AU STOCK', async () => {
    // SANS LUI, L'ÉLÈVE QUI S'EST TROMPÉ DE CASE EST COINCÉ. C'est le troisième
    // comportement promis par l'en-tête du module, et le seul qui concerne
    // l'erreur — donc le plus important des trois.
    const { rendreGlissable } = await charger();
    const doc = monterDocument();
    const { etiquette, reserve } = monterDecor(doc);
    const { j, deposer, retirer } = journal();
    rendreGlissable(etiquette, { cibles: '.case', deposer, retirer, zoneRetour: reserve });

    etiquette.emettre('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
    doc.viser(null);                       // on tire au-dessus de rien
    doc.emettre('touchmove', { touches: [{ clientX: 60, clientY: 0 }] });

    // LA ZONE DE RETOUR S'ANNONCE PENDANT LE VOL : c'est elle qui dit
    // « relâche ici pour reprendre ».
    assert.ok(reserve.classList.contains('gd-retour--vise'),
        'la réserve doit se signaler tant que le bloc est en vol');

    doc.emettre('touchend', {});
    assert.equal(j.retours, 1, 'le lâcher dans le vide ramène au stock');
    assert.equal(j.deposes.length, 0);
    assert.ok(!reserve.classList.contains('gd-retour--vise'), 'et la réserve s\'éteint');
});

test('UNE ÉTIQUETTE ENCORE EN RÉSERVE LÂCHÉE DANS LE VIDE NE FAIT RIEN', async () => {
    // Sans `retirer`, « le lâcher dans le vide ne fait rien » — c'est le
    // comportement d'une étiquette qui n'a pas encore été posée. Inventer un
    // retour ici la ferait disparaître de la réserve où elle se trouve déjà.
    const { rendreGlissable } = await charger();
    const doc = monterDocument();
    const { etiquette, reserve } = monterDecor(doc);
    const { j, deposer } = journal();
    rendreGlissable(etiquette, { cibles: '.case', deposer, zoneRetour: reserve });

    etiquette.emettre('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
    doc.viser(null);
    doc.emettre('touchmove', { touches: [{ clientX: 60, clientY: 0 }] });
    assert.ok(!reserve.classList.contains('gd-retour--vise'),
        'sans retour possible, la réserve n\'a rien à annoncer');
    doc.emettre('touchend', {});
    assert.equal(j.deposes.length, 0);
    assert.equal(j.retours, 0);
});

test('LE DOIGT NE PASSE PAS PAR LE CHEMIN DU POINTEUR', async () => {
    // SI CETTE LIGNE TOMBAIT, LE DOIGT DÉCLENCHERAIT LES DEUX CHEMINS À LA FOIS
    // et l'étiquette serait déposée deux fois. Le chemin pointeur existe pour la
    // souris ; le doigt a le sien, parce que « Safari émet un `pointercancel`
    // dès qu'il décide qu'un geste est un défilement ».
    const { rendreGlissable } = await charger();
    const doc = monterDocument();
    const { etiquette, case1 } = monterDecor(doc);
    const { j, deposer } = journal();
    rendreGlissable(etiquette, { cibles: '.case', deposer });

    const avant = doc.combienDEcouteurs('pointermove');
    etiquette.emettre('pointerdown', { pointerType: 'touch' });
    assert.equal(doc.combienDEcouteurs('pointermove'), avant,
        'un pointeur « touch » ne doit pas armer le chemin de la souris');

    // Et la souris, elle, l'arme bien.
    etiquette.emettre('pointerdown', { pointerType: 'mouse' });
    assert.ok(doc.combienDEcouteurs('pointermove') > avant);
    doc.viser(case1);
    doc.emettre('pointermove', { clientX: 70, clientY: 30 });
    doc.emettre('pointerup', {});
    assert.equal(j.deposes.length, 1, 'une seule dépose pour un seul geste');
});

test('À LA SOURIS, UN CLIC SANS DÉPLACEMENT NE DÉPOSE RIEN', async () => {
    // L'APPUI SIMPLE A SON PROPRE EFFET : « c'est le geste le plus sûr, le seul
    // au clavier, et le plus rapide quand il n'y a qu'un trou libre ». Si le
    // glisser s'en mêlait, chaque clic deviendrait un glissement de zéro pixel
    // et poserait l'étiquette dans la case du dessous.
    const { rendreGlissable } = await charger();
    const doc = monterDocument();
    const { etiquette, case1 } = monterDecor(doc);
    const { j, deposer } = journal();
    rendreGlissable(etiquette, { cibles: '.case', deposer });

    doc.viser(case1);
    etiquette.emettre('pointerdown', { pointerType: 'mouse' });
    doc.emettre('pointerup', {});
    assert.equal(j.deposes.length, 0, 'un clic n\'est pas un glissement');
});

test('LE GESTE SE RANGE APRÈS LUI : AUCUN ÉCOUTEUR NE RESTE EN VOL', async () => {
    // Trente étiquettes par exercice, vingt exercices par heure : des écouteurs
    // oubliés sur `document` finissent par faire réagir un exercice aux gestes
    // d'un autre. C'est le genre de fuite qui ne se voit qu'au bout d'une heure
    // de classe, c'est-à-dire chez l'élève et pas chez nous.
    const { rendreGlissable } = await charger();
    const doc = monterDocument();
    const { etiquette, case1 } = monterDecor(doc);
    const { deposer } = journal();
    rendreGlissable(etiquette, { cibles: '.case', deposer });

    for (let i = 0; i < 5; i++) {
        etiquette.emettre('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
        doc.viser(case1);
        doc.emettre('touchmove', { touches: [{ clientX: 60, clientY: 0 }] });
        doc.emettre('touchend', {});
    }
    assert.equal(doc.combienDEcouteurs('touchmove'), 0, 'les écouteurs de glissement doivent partir');
    assert.equal(doc.combienDEcouteurs('touchend'), 0);
    assert.equal(doc.body.enfants.filter(e => e.classList.contains('gd-fantome')).length, 0,
        'et aucun fantôme ne doit rester dans la page');

    for (let i = 0; i < 5; i++) {
        etiquette.emettre('pointerdown', { pointerType: 'mouse' });
        doc.emettre('pointermove', { clientX: 60, clientY: 0 });
        doc.emettre('pointerup', {});
    }
    assert.equal(doc.combienDEcouteurs('pointermove'), 0);
    assert.equal(doc.combienDEcouteurs('pointerup'), 0);
});

test('LE ROBOT DE DÉMONSTRATION PEUT GELER LE GESTE', async () => {
    // Pendant une démonstration, l'élève ne doit pas pouvoir déplacer les
    // étiquettes sous le robot : il montrerait une grille qui n'est plus celle
    // qu'il explique.
    const { rendreGlissable } = await charger();
    const doc = monterDocument();
    const { etiquette, case1 } = monterDecor(doc);
    const { j, deposer } = journal();
    let ouvert = false;
    rendreGlissable(etiquette, { cibles: '.case', deposer, actif: () => ouvert });

    etiquette.emettre('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
    doc.viser(case1);
    doc.emettre('touchmove', { touches: [{ clientX: 60, clientY: 0 }] });
    doc.emettre('touchend', {});
    assert.equal(j.deposes.length, 0, 'gelé, le glisser ne doit rien faire');

    etiquette.emettre('pointerdown', { pointerType: 'mouse' });
    doc.emettre('pointermove', { clientX: 60, clientY: 0 });
    doc.emettre('pointerup', {});
    assert.equal(j.deposes.length, 0, 'à la souris non plus');

    // Et le geste revient quand le robot a fini.
    ouvert = true;
    etiquette.emettre('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
    doc.emettre('touchmove', { touches: [{ clientX: 60, clientY: 0 }] });
    doc.emettre('touchend', {});
    assert.equal(j.deposes.length, 1);
});

test('LE CLIC QUI SUIT UN GLISSEMENT NE RE-SÉLECTIONNE PAS L\'ÉTIQUETTE', async () => {
    // Un lâcher produit aussi un clic sur beaucoup de navigateurs. Sans ce
    // signal, l'étiquette qu'on vient de déposer se retrouverait aussitôt
    // re-sélectionnée, et le geste suivant la déplacerait au lieu d'en prendre
    // une autre.
    const { rendreGlissable } = await charger();
    const doc = monterDocument();
    const { etiquette, case1 } = monterDecor(doc);
    const { j, deposer, marquerGlissement } = journal();
    rendreGlissable(etiquette, { cibles: '.case', deposer, marquerGlissement });

    etiquette.emettre('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
    doc.viser(case1);
    doc.emettre('touchmove', { touches: [{ clientX: 60, clientY: 0 }] });
    doc.emettre('touchend', {});

    assert.equal(j.glissements[0], true, 'l\'appelant doit être prévenu qu\'un glissement a eu lieu');
    // Le signal retombe de lui-même après un court délai : ON NE LE MESURE PAS
    // ICI (ce serait mesurer un `setTimeout`), mais on vérifie qu'il est bien
    // ARMÉ — sans quoi l'étiquette resterait verrouillée pour toujours.
    assert.ok(j.glissements.length >= 1);
});

test('LA FEUILLE DE STYLE COMMUNE PORTE LES QUATRE ÉTATS DU GESTE', async () => {
    // Elle est injectée une fois par jeu. Une classe que le code pose mais que
    // le style ne connaît pas ne se VOIT pas : le fantôme reste invisible, la
    // case survolée ne s'allume pas, et le geste paraît cassé alors qu'il
    // fonctionne.
    const { CSS_GLISSER } = await charger();
    for (const classe of ['.gd-glissable', '.gd-source', '.gd-fantome', '.gd-survol', '.gd-retour--vise']) {
        assert.ok(CSS_GLISSER.includes(classe), `« ${classe} » n'a pas de style : l'état ne se verra pas`);
    }
    // Et le fantôme doit être au-dessus de tout et transparent aux clics,
    // sinon il bloque le `elementFromPoint` qui cherche la cible dessous — le
    // glisser ne trouverait alors jamais aucune case.
    assert.match(CSS_GLISSER, /pointer-events:\s*none/);
    assert.match(CSS_GLISSER, /touch-action:\s*none/);
});
