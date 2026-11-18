// LIRE UN DIAGRAMME — bâtons, circulaire, histogramme.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « J'ai l'impression qu'AtoutMath est bien complet, tu as
// d'autres idées ? »
//
// IL EN RESTAIT UNE, ET ELLE SE MESURE : chercher « diagramme » dans les 284
// exercices du catalogue ne sortait RIEN. « Moyenne, Médiane, Étendue » couvre
// les indicateurs ; il n'y avait rien pour LIRE une représentation, ni pour
// choisir laquelle convient — c'est-à-dire la moitié du chapitre, de la sixième
// à la troisième.
//
// ET RIEN DANS LA LIGNE ROUGE NE S'Y OPPOSE : « Je ne veux pas de construction
// géométrique avec des outils virtuels. » On ne trace pas un diagramme ici, on
// le LIT — l'élève le trace sur son cahier, comme il doit.
//
// ── CE QUE CET EXERCICE EXISTE POUR ATTRAPER ──────────────────────────────
//
// LA GRADUATION. Un élève qui compte les carreaux d'un diagramme gradué de 5 en
// 5 et répond « 3 » au lieu de « 15 » n'a pas raté la statistique : il a lu
// l'axe comme s'il était gradué de 1 en 1. C'est la faute du chapitre, elle est
// invisible tant que tous les axes vont de 1 en 1, et c'est pour cela qu'une
// marche entière lui est consacrée — puis une autre où la barre tombe ENTRE
// deux graduations.
//
// LE CIRCULAIRE NE DIT PAS DES EFFECTIFS. Il dit des PARTS. « Combien d'élèves
// pour le judo ? » ne se lit pas sur un camembert sans le total — et c'est
// justement ce qu'on oublie de donner, donc ce qu'on apprend à réclamer.
//
// L'HISTOGRAMME NE COMPTE PAS DES VALEURS MAIS DES CLASSES. Ses barres se
// touchent parce que l'axe est CONTINU : entre 150 et 160 cm il n'y a pas de
// trou, et un élève qui lit « 150 » au lieu de « de 150 à 160 » répond à une
// question qui n'est pas posée.
//
// ── UNE SEULE GÉOMÉTRIE POUR DEUX TRACEURS ────────────────────────────────
//
// C'est la règle de `core/planPapier.js`, et elle est payée : « c'est ici, UNE
// FOIS, qu'on décide où tombe chaque trait. Les deux traceurs ne font ensuite
// que recopier ces nombres. » Chaque `geometrie*` rend des points ; `*Svg`
// les écrit en SVG pour l'écran, `plan*` les écrit en lignes brisées pour le
// PDF. Un diagramme dessiné deux fois diverge au premier réglage ; un
// diagramme MESURÉ une fois ne le peut pas.
//
// Aucun DOM ici : ce fichier se lit sous Node, donc il s'éprouve.

import { plan, ferme, ellipse, texte } from './planPapier.js';

/* ── LE DÉCOR DES SÉRIES ──────────────────────────────────────────────── */

// DES SITUATIONS DE COLLÈGE, ET DES MOTS COURTS. Un nom de catégorie long
// déborde sous sa barre et croise celui d'à côté : mesuré sur la planche, huit
// caractères est la limite à cinq barres.
export const CONTEXTES = [
    { sujet: 'Le sport choisi par les élèves', legende: 'nombre d’élèves',
      quoi: 'élèves', cles: ['Judo', 'Foot', 'Tennis', 'Danse', 'Natation'] },
    { sujet: 'Les livres lus pendant les vacances', legende: 'nombre d’élèves',
      quoi: 'élèves', cles: ['0 livre', '1 livre', '2 livres', '3 livres'] },
    { sujet: 'La couleur préférée de la classe', legende: 'nombre d’élèves',
      quoi: 'élèves', cles: ['Bleu', 'Rouge', 'Vert', 'Jaune', 'Violet'] },
    { sujet: 'Les repas servis à la cantine', legende: 'nombre de repas',
      quoi: 'repas', cles: ['Lundi', 'Mardi', 'Jeudi', 'Vendredi'] },
    { sujet: 'Les animaux de la ferme pédagogique', legende: 'nombre d’animaux',
      quoi: 'animaux', cles: ['Poules', 'Chèvres', 'Lapins', 'Moutons'] },
    { sujet: 'Les instruments du club de musique', legende: 'nombre d’élèves',
      quoi: 'élèves', cles: ['Piano', 'Guitare', 'Batterie', 'Flûte'] }
];

/** Les pas de graduation, du plus facile au plus trompeur. */
export const PAS_POSSIBLES = [1, 2, 5, 10];

/* ── LE DIAGRAMME EN BÂTONS ───────────────────────────────────────────── */

/**
 * UNE SÉRIE TIRÉE, ET SES VALEURS TOMBENT SUR LES GRADUATIONS.
 *
 * `entre` autorise les demi-graduations : c'est la marche où la barre s'arrête
 * au milieu, et où il faut lire l'axe au lieu de compter les traits.
 *
 * DEUX VALEURS NE SE RESSEMBLENT PAS TROP : deux barres à 14 et 15 sur un axe
 * gradué de 5 en 5 ne se distinguent pas à l'œil, et « quelle est la plus
 * haute ? » devient une question de pixels. On impose donc un écart.
 */
export function tirerSerie(rng, { pas = 1, entre = false, combien = 0 } = {}) {
    const contexte = CONTEXTES[rng.int(0, CONTEXTES.length - 1)];
    const n = combien || Math.min(contexte.cles.length, rng.int(4, 5));
    const cles = contexte.cles.slice(0, n);
    // LE PLUS HAUT BÂTON NE TOUCHE PAS LE PLAFOND : une barre qui finit sur la
    // dernière graduation donne l'impression qu'elle est coupée.
    const grads = rng.int(5, 7);
    const haut = grads * pas;
    const demi = entre ? pas / 2 : pas;
    const valeurs = [];
    for (let i = 0; i < n; i++) {
        let v = 0;
        for (let essai = 0; essai < 40; essai++) {
            v = demi * rng.int(2, Math.floor(haut / demi) - 1);
            if (!valeurs.some(w => Math.abs(w - v) < pas * 0.9)) break;
        }
        valeurs.push(v);
    }
    // ET UNE MARCHE « ENTRE DEUX GRADUATIONS » DOIT EN AVOIR UNE : le hasard
    // peut rendre cinq valeurs toutes pleines, et la marche n'enseignerait
    // alors rien de ce pour quoi elle existe.
    if (entre && !valeurs.some(v => v % pas !== 0)) {
        const i = rng.int(0, n - 1);
        valeurs[i] = valeurs[i] + (valeurs[i] + pas / 2 < haut ? pas / 2 : -pas / 2);
    }
    const barres = cles.map((nom, i) => ({ nom, valeur: valeurs[i] }));
    return {
        contexte, pas, haut, grads, barres,
        total: barres.reduce((s, b) => s + b.valeur, 0)
    };
}

// LE CADRE DU DESSIN, en unités de `viewBox`. Il sert aussi au papier : les
// deux traceurs lisent les mêmes nombres, et `mesurerFigure` remet le plan à
// l'échelle de la colonne.
// LE HAUT DU CADRE LAISSE DE LA PLACE À LA LÉGENDE. VU SUR LA PLANCHE :
// « nombre d'élèves » s'écrivait à six unités au-dessus de la graduation la
// plus haute, et les deux se touchaient — à l'impression, le mot passait sur
// le chiffre. Vingt-six unités au lieu de seize, et la légende respire.
const BOITE = { w: 320, h: 200, gauche: 38, droite: 310, haut: 26, bas: 166 };

/**
 * OÙ TOMBE CHAQUE TRAIT D'UN DIAGRAMME EN BÂTONS.
 *
 * Rend des points dans un repère où `y` descend — celui du SVG comme celui de
 * jsPDF. Personne d'autre ne calcule de coordonnées.
 */
// ── ET LE PAPIER DESSINE PLUS LARGE QUE L'ÉCRAN ──────────────────────────
//
// VU SUR LA FEUILLE IMPRIMÉE : « 2 livres3 livres », « TennisDanse ». Sur
// papier, le dessin est ramené à sa hauteur permise tandis que le texte garde
// sa taille ; les étiquettes finissent donc par se toucher, et c'est
// géométrique, pas esthétique. À hauteur égale, un cadre plus LARGE donne des
// colonnes plus espacées — et les mêmes nombres restent vrais, puisque c'est
// l'axe qui les porte.
//
// 460 unités au lieu de 320 : mesuré sur la feuille, les cinq étiquettes les
// plus longues du catalogue (« Natation », « Vendredi », « 3 livres ») tiennent
// alors sans se toucher.
export const BOITE_PAPIER = { w: 460, h: 200, gauche: 38, droite: 450, haut: 26, bas: 166 };

/**
 * LA HAUTEUR QUE LE PAPIER ACCORDE À UN DIAGRAMME, EN MILLIMÈTRES.
 *
 * MESURÉ SUR LA FEUILLE, et c'est un arbitrage entre deux choses qu'on voit :
 *
 *   · à 34 mm — le plafond ordinaire d'une figure —, les étiquettes se
 *     touchent : « 2 livres3 livres », « TennisDanse » ;
 *   · à 54 mm, elles respirent, mais il ne passe plus que DEUX questions par
 *     page, et neuf diagrammes prennent huit feuilles ;
 *   · à 46 mm, elles respirent ENCORE et il en passe TROIS. C'est celui-là.
 */
export const HAUTEUR_PAPIER = 46;

export function geometrieBatons(s, boite = BOITE) {
    const { gauche, droite, haut, bas } = boite;
    const vers = (v) => bas - (v / s.haut) * (bas - haut);
    const place = (droite - gauche) / s.barres.length;
    const large = place * 0.56;
    return {
        boite,
        axeY: [[gauche, haut - 6], [gauche, bas]],
        axeX: [[gauche, bas], [droite, bas]],
        // LES GRADUATIONS PORTENT LEUR NOMBRE, ET UNE LIGNE DE REPÈRE.
        //
        // Sans la ligne qui traverse, lire la hauteur d'une barre du milieu
        // demande de suivre une horizontale imaginaire sur dix centimètres.
        // C'est ce que fait un quadrillage de cahier, et c'est pour cela que
        // les manuels en mettent un.
        graduations: Array.from({ length: s.grads + 1 }, (_, i) => ({
            valeur: i * s.pas, y: vers(i * s.pas),
            repere: [[gauche, vers(i * s.pas)], [droite, vers(i * s.pas)]]
        })),
        barres: s.barres.map((b, i) => ({
            nom: b.nom, valeur: b.valeur,
            x: gauche + place * i + (place - large) / 2,
            large, y: vers(b.valeur), basse: bas,
            milieu: gauche + place * i + place / 2
        }))
    };
}

const d2 = (n) => Number(n).toFixed(2);
const chemin = (l) => 'M ' + l.map(([x, y]) => `${d2(x)} ${d2(y)}`).join(' L ');
const echapper = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * LE DIAGRAMME EN BÂTONS, À L'ÉCRAN.
 *
 * `o.surligne` désigne la barre dont on parle : elle se remplit de la couleur
 * vive, les autres restent pâles. SANS CE SURLIGNAGE, une question qui nomme
 * une catégorie oblige l'élève à retrouver le mot sous l'axe AVANT de lire la
 * hauteur — on mesure alors sa lecture d'étiquettes, pas sa lecture d'axe.
 * C'est un choix : il tombe avec la marche « quel est le plus choisi ? », où
 * justement rien n'est surligné.
 */
export function batonsSvg(s, o = {}) {
    const g = geometrieBatons(s);
    const { w, h } = g.boite;
    const reperes = g.graduations.map(gr =>
        `<path d="${chemin(gr.repere)}" fill="none" stroke="var(--border)"
            stroke-width=".8" stroke-dasharray="3 3"/>`).join('');
    const nombres = g.graduations.map(gr =>
        `<text x="${d2(g.boite.gauche - 6)}" y="${d2(gr.y + 3.5)}" text-anchor="end"
            font-size="10" fill="var(--text-muted)">${gr.valeur}</text>`).join('');
    const barres = g.barres.map((b, i) => {
        const vif = o.surligne === b.nom || o.surligne === i;
        return `<rect x="${d2(b.x)}" y="${d2(b.y)}" width="${d2(b.large)}"
            height="${d2(b.basse - b.y)}" fill="${vif ? 'var(--primary)' : 'var(--bg-panel)'}"
            stroke="currentColor" stroke-width="1.2"/>`;
    }).join('');
    const noms = g.barres.map(b =>
        `<text x="${d2(b.milieu)}" y="${d2(b.basse + 14)}" text-anchor="middle"
            font-size="10" fill="currentColor">${echapper(b.nom)}</text>`).join('');
    const axes = `<path d="${chemin(g.axeY)}" fill="none" stroke="currentColor" stroke-width="1.4"/>`
        + `<path d="${chemin(g.axeX)}" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
    const legende = `<text x="${d2(g.boite.gauche)}" y="14" text-anchor="start"
        font-size="10" fill="var(--text-muted)">${echapper(s.contexte.legende)}</text>`;
    return `<svg class="dg-figure" viewBox="0 0 ${w} ${h}" width="100%"
        role="img" aria-label="${echapper(direLesBatons(s))}">`
        + reperes + axes + barres + nombres + noms + legende + '</svg>';
}

/** LE PLAN PAPIER DU MÊME DIAGRAMME — les mêmes nombres, en lignes brisées. */
export function planBatons(s) {
    const g = geometrieBatons(s, BOITE_PAPIER);
    const p = plan();
    p.hauteurMax = HAUTEUR_PAPIER;
    p.traits.push(g.axeY, g.axeX);
    g.graduations.forEach(gr => {
        // LE REPÈRE EST POINTILLÉ SUR LE PAPIER AUSSI : `caches` est le canal
        // des pointillés de `ficheRendu`, et un quadrillage en trait plein
        // mangerait les barres.
        p.caches.push(gr.repere);
        p.textes.push(texte(g.boite.gauche - 4, gr.y, String(gr.valeur), 'fin', 0, 0.35));
    });
    g.barres.forEach(b => {
        p.traits.push(ferme([[b.x, b.basse], [b.x, b.y], [b.x + b.large, b.y],
            [b.x + b.large, b.basse]]));
        p.textes.push(texte(b.milieu, b.basse, b.nom, 'milieu', 0, 1.15));
    });
    p.textes.push(texte(g.boite.gauche, g.boite.haut - 10, s.contexte.legende, 'debut'));
    return p;
}

/** La série dite à voix haute — pour qui ne voit pas le dessin. */
export const direLesBatons = (s) =>
    `Diagramme en bâtons, axe gradué de ${s.pas} en ${s.pas} : `
    + s.barres.map(b => `${b.nom} ${b.valeur}`).join(', ') + '.';

/* ── L'HISTOGRAMME ────────────────────────────────────────────────────── */

// DES CLASSES, ET ELLES SE TOUCHENT. C'est la seule différence visible d'avec
// un diagramme en bâtons, et c'est elle qui porte le sens : l'axe est CONTINU.
export const CONTEXTES_CLASSES = [
    { sujet: 'La taille des élèves de la classe', legende: 'nombre d’élèves',
      quoi: 'élèves', unite: 'cm', de: 140, large: 10, combien: 4 },
    { sujet: 'Le temps de trajet jusqu’au collège', legende: 'nombre d’élèves',
      quoi: 'élèves', unite: 'min', de: 0, large: 10, combien: 4 },
    { sujet: 'La masse des colis du magasin', legende: 'nombre de colis',
      quoi: 'colis', unite: 'kg', de: 0, large: 5, combien: 4 }
];

export function tirerHistogramme(rng, { pas = 1 } = {}) {
    const contexte = CONTEXTES_CLASSES[rng.int(0, CONTEXTES_CLASSES.length - 1)];
    const grads = rng.int(4, 6);
    const haut = grads * pas;
    const classes = [];
    for (let i = 0; i < contexte.combien; i++) {
        const de = contexte.de + i * contexte.large;
        let v = 0;
        for (let essai = 0; essai < 30; essai++) {
            v = pas * rng.int(1, grads - 1);
            if (!classes.some(c => c.valeur === v) || essai > 20) break;
        }
        classes.push({ de, a: de + contexte.large, valeur: v });
    }
    return { contexte, pas, haut, grads, classes,
        total: classes.reduce((s, c) => s + c.valeur, 0) };
}

export function geometrieHistogramme(h, boite = BOITE) {
    const { gauche, droite, haut, bas } = boite;
    const vers = (v) => bas - (v / h.haut) * (bas - haut);
    const large = (droite - gauche) / h.classes.length;
    return {
        boite,
        axeY: [[gauche, haut - 6], [gauche, bas]],
        axeX: [[gauche, bas], [droite, bas]],
        graduations: Array.from({ length: h.grads + 1 }, (_, i) => ({
            valeur: i * h.pas, y: vers(i * h.pas),
            repere: [[gauche, vers(i * h.pas)], [droite, vers(i * h.pas)]]
        })),
        // LES BARRES SE TOUCHENT — `x` d'une classe est le `x + large` de la
        // précédente, sans un pixel d'écart. Un histogramme aéré est un
        // diagramme en bâtons mal dessiné, et il ment sur la nature de l'axe.
        classes: h.classes.map((c, i) => ({
            ...c, x: gauche + large * i, large,
            y: vers(c.valeur), basse: bas, milieu: gauche + large * i + large / 2
        })),
        // LES BORNES S'ÉCRIVENT SOUS LES SÉPARATIONS, pas sous le milieu des
        // barres : c'est ce qui dit que 150 est une FRONTIÈRE et non une
        // catégorie.
        bornes: h.classes.map((c, i) => ({ x: gauche + large * i, t: String(c.de) }))
            .concat([{ x: droite, t: String(h.classes[h.classes.length - 1].a) }])
    };
}

export function histogrammeSvg(h, o = {}) {
    const g = geometrieHistogramme(h);
    const { w } = g.boite;
    const reperes = g.graduations.map(gr =>
        `<path d="${chemin(gr.repere)}" fill="none" stroke="var(--border)"
            stroke-width=".8" stroke-dasharray="3 3"/>`).join('');
    const nombres = g.graduations.map(gr =>
        `<text x="${d2(g.boite.gauche - 6)}" y="${d2(gr.y + 3.5)}" text-anchor="end"
            font-size="10" fill="var(--text-muted)">${gr.valeur}</text>`).join('');
    const barres = g.classes.map(c => {
        const vif = o.surligne === c.de;
        return `<rect x="${d2(c.x)}" y="${d2(c.y)}" width="${d2(c.large)}"
            height="${d2(c.basse - c.y)}" fill="${vif ? 'var(--primary)' : 'var(--bg-panel)'}"
            stroke="currentColor" stroke-width="1.2"/>`;
    }).join('');
    const bornes = g.bornes.map(b =>
        `<text x="${d2(b.x)}" y="${d2(g.boite.bas + 14)}" text-anchor="middle"
            font-size="10" fill="currentColor">${echapper(b.t)}</text>`).join('');
    const axes = `<path d="${chemin(g.axeY)}" fill="none" stroke="currentColor" stroke-width="1.4"/>`
        + `<path d="${chemin(g.axeX)}" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
    const legende = `<text x="${d2(g.boite.gauche)}" y="14" text-anchor="start"
        font-size="10" fill="var(--text-muted)">${echapper(h.contexte.legende)}</text>`;
    const unite = `<text x="${d2(g.boite.droite)}" y="${d2(g.boite.bas + 27)}"
        text-anchor="end" font-size="10" fill="var(--text-muted)">${
    echapper(h.contexte.unite)}</text>`;
    return `<svg class="dg-figure" viewBox="0 0 ${w} ${BOITE.h + 12}" width="100%"
        role="img" aria-label="${echapper(direLHistogramme(h))}">`
        + reperes + axes + barres + nombres + bornes + legende + unite + '</svg>';
}

export function planHistogramme(h) {
    const g = geometrieHistogramme(h, BOITE_PAPIER);
    const p = plan();
    p.hauteurMax = HAUTEUR_PAPIER;
    p.traits.push(g.axeY, g.axeX);
    g.graduations.forEach(gr => {
        p.caches.push(gr.repere);
        p.textes.push(texte(g.boite.gauche - 4, gr.y, String(gr.valeur), 'fin', 0, 0.35));
    });
    g.classes.forEach(c => {
        p.traits.push([[c.x, c.basse], [c.x, c.y], [c.x + c.large, c.y],
            [c.x + c.large, c.basse]]);
    });
    g.bornes.forEach(b => p.textes.push(texte(b.x, g.boite.bas, b.t, 'milieu', 0, 1.15)));
    p.textes.push(texte(g.boite.droite, g.boite.bas, h.contexte.unite, 'fin', 0, 2.4));
    p.textes.push(texte(g.boite.gauche, g.boite.haut - 10, h.contexte.legende, 'debut'));
    return p;
}

export const direLHistogramme = (h) =>
    `Histogramme, axe gradué de ${h.pas} en ${h.pas} : `
    + h.classes.map(c => `de ${c.de} à ${c.a} ${h.contexte.unite}, ${c.valeur}`).join(' ; ') + '.';

/* ── LE DIAGRAMME CIRCULAIRE ──────────────────────────────────────────── */

// LES PARTS SE RECONNAISSENT À L'ŒIL, ET C'EST EXPRÈS. Un camembert ne se
// mesure pas au rapporteur — on y voit « la moitié », « un quart », « un
// tiers ». Les parts proposées sont donc celles qu'un œil nomme sans hésiter,
// et jamais 7/20.
export const PARTS_LISIBLES = [
    { num: 1, den: 2, mot: 'la moitié' },
    { num: 1, den: 4, mot: 'un quart' },
    { num: 3, den: 4, mot: 'trois quarts' },
    { num: 1, den: 3, mot: 'un tiers' },
    { num: 1, den: 8, mot: 'un huitième' },
    { num: 1, den: 5, mot: 'un cinquième' }
];

/**
 * UN CAMEMBERT TIRÉ AUTOUR D'UNE PART QU'ON SAIT NOMMER.
 *
 * La part visée occupe son secteur exact ; le reste se partage entre deux ou
 * trois autres catégories, dont aucune ne doit lui ressembler — sinon
 * « laquelle est la moitié ? » devient une question de millimètres.
 */
export function tirerCirculaire(rng, { avecPourcents = false, total = 0 } = {}) {
    const contexte = CONTEXTES[rng.int(0, CONTEXTES.length - 1)];
    const cles = contexte.cles.slice(0, 3);
    // ── QUAND LE DISQUE PORTE DES POURCENTAGES, TOUT DOIT TOMBER JUSTE ────
    //
    // LE DÉFAUT ÉVITÉ, ET IL EST VICIEUX : avec un tiers, le dessin affiche
    // « 33 % », l'élève calcule 33 % de 60 et trouve 19,8 — tandis que la
    // réponse attendue, calculée sur la fraction exacte, vaut 20. L'exercice
    // compterait faux un élève qui a fait exactement ce qu'on lui demandait,
    // et il ne le saurait jamais.
    //
    // On ne tire donc, pour cette marche, que des parts qui s'écrivent en
    // pourcentages ENTIERS, le reste se coupe en multiples de 5 %, et le total
    // est un multiple de 20 : chacun des trois effectifs tombe alors juste.
    if (avecPourcents) {
        const choix = PARTS_LISIBLES.filter(p => (100 * p.num) % p.den === 0
            && ((100 * p.num) / p.den) % 5 === 0);
        const part = choix[rng.int(0, choix.length - 1)];
        const pct = (100 * part.num) / part.den;
        const reste = 100 - pct;
        // LES DEUX AUTRES SECTEURS GARDENT DIX POUR CENT CHACUN AU MOINS : un
        // secteur de 3 % n'a pas la place d'écrire son nombre.
        const bas = 10, haut = reste - 10;
        const deuxieme = bas + 5 * rng.int(0, Math.max(0, Math.floor((haut - bas) / 5)));
        const pourcents = [pct, deuxieme, reste - deuxieme];
        const parts = pourcents.map((p, i) => ({ nom: cles[i], fraction: p / 100 }));
        return {
            contexte, part, parts, pourcents, avecPourcents: true,
            total: total || 20 * rng.int(2, 6)
        };
    }
    const part = PARTS_LISIBLES[rng.int(0, PARTS_LISIBLES.length - 1)];
    const fraction = part.num / part.den;
    // LE RESTE SE COUPE EN DEUX MORCEAUX INÉGAUX : deux moitiés de reste
    // feraient deux secteurs jumeaux, et l'on ne saurait plus lequel on
    // désigne.
    const coupe = 0.35 + rng.int(0, 2) * 0.1;
    const parts = [
        { nom: cles[0], fraction },
        { nom: cles[1], fraction: (1 - fraction) * coupe },
        { nom: cles[2], fraction: (1 - fraction) * (1 - coupe) }
    ];
    // LE TOTAL N'EST PAS DESSINÉ, IL EST DIT. Un camembert ne porte aucun
    // effectif : c'est l'énoncé qui donne « 80 élèves », et c'est précisément
    // ce qu'un élève doit apprendre à chercher.
    const effectif = total || part.den * rng.int(4, 10);
    return {
        contexte, part, parts, total: effectif, avecPourcents: false,
        pourcents: parts.map(p => Math.round(p.fraction * 100))
    };
}

export function geometrieCirculaire(c) {
    const cx = 160, cy = 104, r = 78;
    let angle = -90;                       // on commence en haut, comme un manuel
    const secteurs = c.parts.map(p => {
        const de = angle, a = angle + p.fraction * 360;
        angle = a;
        const milieu = (de + a) / 2;
        const rad = (deg) => (deg * Math.PI) / 180;
        return {
            ...p, de, a,
            // LE SECTEUR EST UN POLYGONE FERMÉ : centre, arc, retour au centre.
            contour: ferme([[cx, cy], ...ellipse(cx, cy, r, r, de, a)]),
            etiquette: [cx + Math.cos(rad(milieu)) * r * 0.62,
                cy + Math.sin(rad(milieu)) * r * 0.62]
        };
    });
    return { boite: { w: 320, h: 212 }, cx, cy, r, secteurs };
}

// ── TROIS TEINTES, ET NON « LA PREMIÈRE ET LES AUTRES » ──────────────────
//
// LE DÉFAUT VU EN MESURANT : avec les pourcentages, les noms passent en
// légende sous le disque, et les deux secteurs non surlignés étaient peints de
// la MÊME couleur. La légende montrait alors trois pastilles dont deux
// identiques — c'est-à-dire qu'elle ne désignait plus rien. Un échelon de
// teinte par secteur, et chaque pastille retrouve son secteur.
const TEINTE_SECTEUR = [0.55, 0.28, 0.1];

export function circulaireSvg(c) {
    const g = geometrieCirculaire(c);
    const secteurs = g.secteurs.map((s, i) =>
        `<path d="${chemin(s.contour)}" fill="var(--primary)"
            fill-opacity="${TEINTE_SECTEUR[i] ?? 0.1}" stroke="currentColor"
            stroke-width="1.3"/>`).join('');
    const etiquettes = g.secteurs.map((s, i) => {
        const t = c.avecPourcents ? `${c.pourcents[i]} %` : s.nom;
        return `<text x="${d2(s.etiquette[0])}" y="${d2(s.etiquette[1] + 3.5)}"
            text-anchor="middle" font-size="11" fill="currentColor">${echapper(t)}</text>`;
    }).join('');
    // AVEC LES POURCENTS, LES NOMS PASSENT EN LÉGENDE : écrire « Judo 25 % »
    // dans un huitième de camembert donne deux lignes illisibles.
    const legende = c.avecPourcents ? g.secteurs.map((s, i) =>
        `<rect x="${d2(10 + i * 104)}" y="190" width="11" height="11"
            fill="var(--primary)" fill-opacity="${TEINTE_SECTEUR[i] ?? 0.1}"
            stroke="currentColor" stroke-width="1"/>`
        + `<text x="${d2(26 + i * 104)}" y="199" font-size="11"
            fill="currentColor">${echapper(s.nom)}</text>`).join('') : '';
    return `<svg class="dg-figure" viewBox="0 0 ${g.boite.w} ${g.boite.h}" width="100%"
        role="img" aria-label="${echapper(direLeCirculaire(c))}">`
        + secteurs + etiquettes + legende + '</svg>';
}

export function planCirculaire(c) {
    const g = geometrieCirculaire(c);
    const p = plan();
    // LE DISQUE N'A PAS LE MÊME BESOIN : il porte trois étiquettes, pas douze,
    // et il est aussi haut que large. Quarante-deux millimètres suffisent, et
    // le prendre à cinquante-quatre lui ferait manger la page pour rien.
    p.hauteurMax = 42;
    g.secteurs.forEach((s, i) => {
        p.traits.push(s.contour);
        p.textes.push(texte(s.etiquette[0], s.etiquette[1],
            c.avecPourcents ? `${c.pourcents[i]} %` : s.nom, 'milieu', 0, 0.35));
    });
    if (c.avecPourcents) {
        g.secteurs.forEach((s, i) => {
            p.textes.push(texte(g.cx - g.r, g.cy + g.r + 14 + i * 13, `— ${s.nom}`, 'debut'));
        });
    }
    return p;
}

export const direLeCirculaire = (c) =>
    'Diagramme circulaire : ' + c.parts.map((p, i) =>
        `${p.nom} ${c.avecPourcents ? c.pourcents[i] + ' pour cent'
            : 'environ ' + Math.round(p.fraction * 100) + ' pour cent'}`).join(', ') + '.';

/* ── CHOISIR LA REPRÉSENTATION ────────────────────────────────────────── */

/**
 * QUEL DIAGRAMME POUR QUELLE SITUATION.
 *
 * TROIS RÈGLES, ET ELLES SE DISENT EN UNE PHRASE CHACUNE :
 *
 *   · des CATÉGORIES qu'on compare → des bâtons ;
 *   · des PARTS d'un même tout → un camembert ;
 *   · des mesures GROUPÉES EN CLASSES → un histogramme.
 *
 * Le quatrième choix — la courbe — n'est pas un leurre gratuit : c'est la
 * représentation d'une ÉVOLUTION dans le temps, et c'est la confusion
 * ordinaire avec les bâtons quand les catégories sont des mois.
 */
export const SITUATIONS = [
    { texte: 'On a demandé à chaque élève son sport préféré, et on veut comparer '
        + 'd’un coup d’œil quel sport revient le plus souvent.',
      bon: 'batons', pourquoi: 'Des catégories qu’on compare entre elles : chaque '
        + 'barre est un sport, et la plus haute se voit tout de suite.' },
    { texte: 'On veut montrer quelle PART du budget du collège va à la cantine, '
        + 'au chauffage et aux fournitures.',
      bon: 'circulaire', pourquoi: 'Ce sont les parts d’un même tout — le budget '
        + 'entier —, et c’est exactement ce qu’un disque partagé montre.' },
    { texte: 'On a mesuré la taille des 28 élèves, et on veut montrer combien '
        + 'mesurent entre 150 et 160 cm, entre 160 et 170 cm, etc.',
      bon: 'histogramme', pourquoi: 'Les mesures sont groupées en CLASSES, et les '
        + 'tailles forment une suite continue : les barres se touchent.' },
    { texte: 'On relève la température à midi chaque jour pendant deux semaines, '
        + 'et on veut voir comment elle évolue.',
      bon: 'courbe', pourquoi: 'C’est une ÉVOLUTION dans le temps : on relie les '
        + 'points pour voir monter et descendre.' },
    { texte: 'On veut montrer que les garçons représentent la moitié des inscrits '
        + 'au club, les filles l’autre moitié.',
      bon: 'circulaire', pourquoi: 'Deux parts d’un même tout : le disque le dit '
        + 'sans un seul nombre.' },
    { texte: 'On veut comparer le nombre de repas servis chaque jour de la semaine '
        + 'à la cantine.',
      bon: 'batons', pourquoi: 'Cinq jours, cinq colonnes à comparer : ce sont des '
        + 'catégories, pas une mesure continue.' }
];

export const NOMS_DIAGRAMMES = {
    batons: 'Un diagramme en bâtons',
    circulaire: 'Un diagramme circulaire',
    histogramme: 'Un histogramme',
    courbe: 'Une courbe'
};

/** Pourquoi tel diagramme ne convient PAS à telle situation. */
export const POURQUOI_PAS = {
    batons: 'Des bâtons séparés diraient que les valeurs sont des catégories '
        + 'indépendantes, ce qui n’est pas le cas ici.',
    circulaire: 'Un disque montre des PARTS d’un tout ; ici on ne partage pas un '
        + 'tout, on compare des quantités.',
    histogramme: 'Un histogramme groupe des mesures en classes qui se suivent ; '
        + 'ici les catégories ne forment pas une suite continue.',
    courbe: 'Une courbe montre une ÉVOLUTION ; ici rien ne se suit dans le temps.'
};
