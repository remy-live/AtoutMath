// LES INFOBULLES : LES NÔTRES, ET NON CELLES DU NAVIGATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerais que tu revoies les tooltips qui là sont vieux et propres
// au navigateur, rends-les plus modernes, fais attention qu'il ne soit pas
// recouvert ni coupé ni sortant de la zone visible. »
//
// Trois conditions, et chacune a sa raison d'être :
//   · RECOUVERT — la bulle du système se pose où il veut ; la nôtre vit dans
//     une couche à elle, au-dessus de tout ;
//   · COUPÉ — elle se replie sur plusieurs lignes plutôt que de déborder ;
//   · SORTANT — elle se ramène entre les deux bords, et sa POINTE reste sur le
//     bouton, sans quoi elle rentrerait dans l'écran en désignant le vide.
//
// MESURÉ au navigateur (`tools/tmp/sondeInfobulle.mjs`, `…Tel.mjs`,
// `…pointeInfobulle.mjs`) :
//
//   ordinateur 1280 × 800, les quatre coins :  4 bulles dans l'écran, 0 recouverte
//   téléphone 390 × 844, les 12 boutons :      0 sortie, la plus juste à 8 px du bord
//   au DOIGT :                                 aucune bulle (l'appui reste au bouton)
//   sur les 15 bulles de l'écran prof :        4 ramenées, pointe fausse de 1 px au pire
//
//   contraste rendu de la bulle, par thème :
//       clair 17,9 sur la bulle / 17,1 sur la page      océan  8,9 / 8,2
//       sombre 14,0 / 17,1                              forêt  8,7 / 8,7
//                                                      couchant 9,1 / 8,8
//   La couleur figée que j'avais posée d'abord (#1f2433) donnait 1,15 sur la
//   page en thème SOMBRE : la bulle s'y dissolvait, seule son ombre la trahissait.
//
// Les mesures se refont au navigateur. ICI on tient l'ARITHMÉTIQUE du placement,
// avec un DOM de fortune : c'est elle qui se casse en silence, et une bulle mal
// posée ne fait pas échouer un test de rendu — elle sort juste de l'écran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ── UN DOM DE FORTUNE ────────────────────────────────────────────────────────
// Juste ce que le module touche, et rien d'autre. Les rectangles sont DONNÉS :
// c'est tout l'intérêt, on peut poser un bouton au bord de l'écran sans écran.

const LARGEUR_BULLE = 200;
const HAUTEUR_BULLE = 34;

function faireElement(tag = 'div') {
    const attrs = new Map();
    const el = {
        tagName: tag.toUpperCase(),
        textContent: '',
        className: '',
        dataset: {},
        enfants: [],
        rect: { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 },
        style: {
            props: {},
            setProperty(n, v) { this.props[n] = v; }
        },
        classList: {
            noms: new Set(),
            add(n) { this.noms.add(n); },
            contains(n) { return this.noms.has(n); }
        },
        getAttribute: (n) => (attrs.has(n) ? attrs.get(n) : null),
        setAttribute: (n, v) => attrs.set(n, String(v)),
        removeAttribute: (n) => attrs.delete(n),
        appendChild(e) { this.enfants.push(e); e.parent = this; return e; },
        remove() {
            if (this.parent) this.parent.enfants = this.parent.enfants.filter(e => e !== this);
        },
        getBoundingClientRect() { return this.rect; },
        // `porteur` remonte avec `closest` ; nos boutons d'essai sont déjà les
        // porteurs, ils se rendent eux-mêmes.
        closest() { return (this.getAttribute('title') || this.dataset.infobulle) ? this : null; }
    };
    return el;
}

function poser(el, left, top, width = 40, height = 40) {
    el.rect = { left, top, width, height, right: left + width, bottom: top + height };
    return el;
}

/** Monte un faux document, importe le module à neuf, et rend de quoi jouer. */
async function monter() {
    const corps = faireElement('body');
    const parId = new Map();
    const ecouteurs = new Map();
    const doc = {
        body: corps,
        getElementById: (id) => parId.get(id) || null,
        createElement(tag) {
            const el = faireElement(tag);
            // La bulle est le seul élément que le module crée, et sa taille
            // vient du texte : on la lui donne, puisqu'ici rien ne se met en page.
            el.rect = {
                left: 0, top: 0, width: LARGEUR_BULLE, height: HAUTEUR_BULLE,
                right: LARGEUR_BULLE, bottom: HAUTEUR_BULLE
            };
            const poserId = () => { if (el.id) parId.set(el.id, el); };
            return new Proxy(el, {
                set(cible, cle, val) { cible[cle] = val; if (cle === 'id') poserId(); return true; }
            });
        },
        addEventListener(type, fn) {
            if (!ecouteurs.has(type)) ecouteurs.set(type, []);
            ecouteurs.get(type).push(fn);
        },
        querySelector() { return null; }
    };
    const feu = (type, ev) => (ecouteurs.get(type) || []).forEach(fn => fn(ev));
    const bulle = () => {
        const couche = parId.get('infobulle-couche');
        return couche ? couche.enfants[0] || null : null;
    };

    const precedents = [globalThis.document, globalThis.window, globalThis.requestAnimationFrame];
    globalThis.document = doc;
    globalThis.window = {
        innerWidth: 1280, innerHeight: 800,
        addEventListener() { }
    };
    globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

    // Un import frais par montage : le module garde un état de module (la bulle
    // en cours), et deux tests qui le partagent se marcheraient dessus.
    const mod = await import('../js/ui/infobulle.js?t=' + Math.random());
    mod.brancherInfobulles(doc);
    const rendre = () => {
        [globalThis.document, globalThis.window, globalThis.requestAnimationFrame] = precedents;
    };
    return { doc, feu, bulle, mod, rendre };
}

/** Survole au clavier : `focusin` montre TOUT DE SUITE, sans minuteur. */
const viser = (feu, el) => feu('focusin', { target: el });

const nombre = (px) => parseFloat(String(px));

// ── LE DÉMÉNAGEMENT DU `title` ───────────────────────────────────────────────

test('LE `title` EST RETIRÉ, PAS SEULEMENT MASQUÉ', async () => {
    // C'est le seul moyen d'empêcher la bulle du système de venir PAR-DESSUS la
    // nôtre. Elle reste dans `data-infobulle`, sinon on la perdrait.
    const { feu, bulle, rendre } = await monter();
    const b = poser(faireElement('button'), 600, 400);
    b.setAttribute('title', 'Ouvrir le parcours');
    viser(feu, b);
    assert.equal(b.getAttribute('title'), null, 'le title du navigateur doit partir');
    assert.equal(b.dataset.infobulle, 'Ouvrir le parcours');
    assert.equal(bulle().textContent, 'Ouvrir le parcours');
    rendre();
});

test('UNE ICÔNE MUETTE GARDE UN NOM POUR LE LECTEUR D\'ÉCRAN', async () => {
    // Mesuré sur l'écran du professeur : 4 des 708 éléments à infobulle n'ont
    // QUE leur `title` pour se nommer. Le retirer les rendrait muets — on
    // rendrait invisible à la voix ce qu'on vient de rendre visible à l'œil.
    const { feu, rendre } = await monter();
    const icone = poser(faireElement('button'), 600, 400);
    icone.setAttribute('title', 'Autres outils');
    viser(feu, icone);
    assert.equal(icone.getAttribute('aria-label'), 'Autres outils');

    // Celui qui a déjà un mot écrit dessus n'a besoin de rien : lui poser un
    // `aria-label` REMPLACERAIT son texte à la lecture.
    const { feu: feu2, rendre: rendre2 } = await monter();
    const ecrit = poser(faireElement('button'), 600, 400);
    ecrit.textContent = 'Valider';
    ecrit.setAttribute('title', 'Envoyer la réponse');
    viser(feu2, ecrit);
    assert.equal(ecrit.getAttribute('aria-label'), null);
    rendre(); rendre2();
});

// ── « NI SORTANT DE LA ZONE VISIBLE » ────────────────────────────────────────

test('AU MILIEU, LA BULLE SE POSE AU-DESSUS ET CENTRÉE', async () => {
    const { feu, bulle, rendre } = await monter();
    const b = poser(faireElement('button'), 600, 400, 40, 40);
    b.setAttribute('title', 'Réglages');
    viser(feu, b);
    const bu = bulle();
    // Centrée : 620 (milieu du bouton) − 100 (demi-bulle) = 520.
    assert.equal(nombre(bu.style.left), 520);
    // Au-dessus : 400 − 34 − 10 d'écart = 356.
    assert.equal(nombre(bu.style.top), 356);
    assert.equal(bu.dataset.sens, 'dessus');
    rendre();
});

test('SOUS LA BARRE DU HAUT, ELLE BASCULE EN DESSOUS', async () => {
    // Le cas des boutons de la barre du professeur : au-dessus, il n'y a pas
    // la place — et c'est là que la bulle du système sortait de la fenêtre.
    const { feu, bulle, rendre } = await monter();
    const b = poser(faireElement('button'), 600, 12, 40, 40);
    b.setAttribute('title', 'Plein écran');
    viser(feu, b);
    const bu = bulle();
    assert.equal(bu.dataset.sens, 'dessous');
    assert.equal(nombre(bu.style.top), 62, '52 (bas du bouton) + 10 d\'écart');
    rendre();
});

test('AU BORD, ELLE RENTRE — ET SA POINTE RESTE SUR LE BOUTON', async () => {
    // LE DÉTAIL QUI TRAHIT UNE BULLE RAMENÉE : elle rentre dans l'écran, mais
    // sa pointe, restée au milieu d'elle-même, désigne le vide. Mesuré au
    // navigateur : 4 bulles sur 15 sont ramenées, et la pointe tombe à 1 px
    // près sur le centre du bouton.
    const { feu, bulle, rendre } = await monter();

    const gauche = poser(faireElement('button'), 10, 400, 40, 40);
    gauche.setAttribute('title', 'Menu');
    viser(feu, gauche);
    let bu = bulle();
    assert.equal(nombre(bu.style.left), 8, 'ramenée à la marge, jamais à −70');
    // La pointe se compte depuis le bord GAUCHE de la bulle : 30 − 8 = 22.
    assert.equal(nombre(bu.style.props['--pointe']), 22);

    const droite = poser(faireElement('button'), 1230, 400, 40, 40);
    droite.setAttribute('title', 'Mon profil');
    viser(feu, droite);
    bu = bulle();
    assert.equal(nombre(bu.style.left), 1280 - LARGEUR_BULLE - 8);
    assert.equal(nombre(bu.style.props['--pointe']), 1250 - (1280 - LARGEUR_BULLE - 8));
    rendre();
});

test('LA POINTE NE SORT JAMAIS DE SA PROPRE BULLE', async () => {
    // Un bouton large — la barre d'un exercice, par exemple — a son milieu très
    // loin de celui d'une bulle courte. Sans bornes, la pointe se dessinerait à
    // côté de la bulle, en l'air.
    const { feu, bulle, rendre } = await monter();
    const large = poser(faireElement('div'), 0, 400, 1280, 40);
    large.setAttribute('title', 'Une ligne du catalogue');
    viser(feu, large);
    const p = nombre(bulle().style.props['--pointe']);
    assert.ok(p >= 12 && p <= LARGEUR_BULLE - 12, `pointe à ${p} px pour ${LARGEUR_BULLE} de bulle`);
    rendre();
});

test('SUR UN TÉLÉPHONE, LA BULLE N\'EST JAMAIS PLUS LARGE QUE L\'ÉCRAN', async () => {
    // 320 px de bulle sur 390 d'écran passent ; sur un écran étroit, c'est
    // l'écran qui commande. Mesuré : sur 390 × 844, aucune des 12 bulles ne
    // sort, la plus juste s'arrête à 8 px du bord.
    const { feu, bulle, rendre } = await monter();
    globalThis.window.innerWidth = 320;
    const b = poser(faireElement('button'), 10, 400, 40, 40);
    b.setAttribute('title', 'Un texte assez long pour vouloir déborder');
    viser(feu, b);
    assert.equal(bulle().style.maxWidth, '304px', '320 − deux marges de 8');
    rendre();
});

// ── QUAND ELLE S'OUVRE, ET QUAND ELLE PART ───────────────────────────────────

test('AU DOIGT, RIEN NE S\'OUVRE AU SURVOL', async () => {
    // Sinon le PREMIER appui ouvrirait une bulle au lieu d'actionner le bouton,
    // et il en faudrait deux pour tout. Le tactile est servi autrement : par le
    // `focus` qui suit l'appui, et par `aria-label` pour la voix.
    const { feu, bulle, rendre } = await monter();
    const b = poser(faireElement('button'), 600, 400);
    b.setAttribute('title', 'Ajouter un exercice');
    feu('pointerover', { target: b, pointerType: 'touch' });
    await new Promise(r => setTimeout(r, 450));   // plus que le délai du module
    assert.equal(bulle(), null);
    assert.equal(b.getAttribute('title'), 'Ajouter un exercice',
        'et son title ne part pas non plus tant qu\'on ne s\'en sert pas');
    rendre();
});

test('À LA SOURIS, ELLE ATTEND UN PEU — ON NE VEUT PAS D\'UNE TRAÎNÉE', async () => {
    const { feu, bulle, rendre } = await monter();
    const b = poser(faireElement('button'), 600, 400);
    b.setAttribute('title', 'Aperçu');
    feu('pointerover', { target: b, pointerType: 'mouse' });
    assert.equal(bulle(), null, 'rien tout de suite');
    await new Promise(r => setTimeout(r, 450));
    assert.equal(bulle().textContent, 'Aperçu');
    rendre();
});

test('TOUT CE QUI DÉPLACE LA PAGE FERME LA BULLE', async () => {
    // Elle est posée en coordonnées d'ÉCRAN : un défilement la laisserait
    // accrochée au vide, à côté du bouton qu'elle explique.
    for (const evenement of ['scroll', 'pointerdown']) {
        const { feu, bulle, rendre } = await monter();
        const b = poser(faireElement('button'), 600, 400);
        b.setAttribute('title', 'Imprimer');
        viser(feu, b);
        assert.ok(bulle(), evenement);
        feu(evenement, { target: b });
        assert.equal(bulle(), null, `« ${evenement} » doit fermer la bulle`);
        rendre();
    }
    const { feu, bulle, rendre } = await monter();
    const b = poser(faireElement('button'), 600, 400);
    b.setAttribute('title', 'Imprimer');
    viser(feu, b);
    feu('keydown', { key: 'Escape' });
    assert.equal(bulle(), null, 'Échap ferme aussi');
    rendre();
});

test('DEUX BULLES NE COEXISTENT PAS', async () => {
    const { feu, bulle, doc, rendre } = await monter();
    const a = poser(faireElement('button'), 300, 400);
    a.setAttribute('title', 'Premier');
    const b = poser(faireElement('button'), 700, 400);
    b.setAttribute('title', 'Second');
    viser(feu, a);
    viser(feu, b);
    assert.equal(doc.getElementById('infobulle-couche').enfants.length, 1);
    assert.equal(bulle().textContent, 'Second');
    rendre();
});

test('UN ÉLÉMENT SANS TEXTE D\'AIDE N\'OUVRE PAS DE BULLE VIDE', async () => {
    const { feu, bulle, rendre } = await monter();
    const nu = poser(faireElement('button'), 600, 400);
    nu.closest = () => null;
    viser(feu, nu);
    assert.equal(bulle(), null);
    rendre();
});

// ── « NI RECOUVERT » : C'EST LA COUCHE QUI S'EN CHARGE ───────────────────────

test('LA COUCHE PASSE AU-DESSUS DE TOUT, ET NE PREND AUCUN CLIC', async () => {
    const css = lire('css/modules.css');
    const couche = css.slice(css.indexOf('#infobulle-couche {'));
    assert.match(couche.slice(0, 200), /z-index: 2147483000;/);
    assert.match(couche.slice(0, 200), /pointer-events: none;/);
    // La bulle aussi : elle se pose SUR le bouton qu'elle explique, et voler
    // son survol la ferait clignoter sans fin.
    const bulle = css.slice(css.indexOf('\n.infobulle {'));
    assert.match(bulle.slice(0, 200), /pointer-events: none;/);
});

test('LA BULLE PREND LES COULEURS DE SON THÈME', async () => {
    // Mesuré : une couleur figée (#1f2433) donne 1,15 de contraste sur la page
    // en thème SOMBRE — la bulle y disparaît. `--text-main` sur `--bg-panel`
    // est la paire de lecture de chaque thème, donc déjà tenue au contraste ;
    // retournée, elle ne descend jamais sous 8,2 dans les cinq thèmes.
    const css = lire('css/modules.css');
    const bulle = css.slice(css.indexOf('\n.infobulle {'), css.indexOf('.infobulle--vue'));
    assert.match(bulle, /background: var\(--bulle-fond, var\(--text-main/);
    assert.match(bulle, /color: var\(--bulle-texte, var\(--bg-panel/);
    assert.ok(!/background: *#[0-9a-f]{3,8}/i.test(bulle),
        'aucune couleur figée : elle serait juste dans un thème et fausse dans quatre');
});

test('LE MOUVEMENT S\'EFFACE POUR QUI EN DEMANDE MOINS', async () => {
    const css = lire('css/modules.css');
    const fin = css.slice(css.indexOf('.infobulle[data-sens="dessous"]'));
    assert.match(fin, /@media \(prefers-reduced-motion: reduce\) \{\s*\.infobulle \{ transition: none; \}/);
});
