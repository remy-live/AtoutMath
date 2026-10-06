// LA COMPOSITION LIBRE D'UN DINGBAT — des mots posés, orientés, colorés, et des
// traits et des formes autour.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « qqch pour éditer des dingbats et les transformer en json. Globalement
// un éditeur de lettre où on peut choisir l'orientation la couleur rajouter des
// traits des formes. »
//
// ── POURQUOI UNE VINGT-DEUXIÈME DISPOSITION, ET NON VINGT-DEUX DE PLUS ─────
//
// Les vingt-et-une dispositions de `core/dingbat.js` sont des TOURNURES : « un
// mot DANS une forme », « un mot À L'ENVERS », « un mot RÉPÉTÉ ». Chacune porte
// une lecture, et c'est elle qui fabrique l'indice — « ce qu'il faut voir : un
// mot est enfermé DANS une forme ». Elles ne se remplacent pas : une énigme qui
// dit sa tournure se relit, se vérifie, et s'explique à l'élève.
//
// Mais elles ne savent dessiner que ce qu'on a prévu. Rémy veut POSER : un mot
// ici, incliné comme ça, un trait en travers, un carré autour. Aucune liste de
// tournures ne couvrira ce geste-là, parce que c'est le geste de quelqu'un qui
// invente — et c'est exactement pour ça qu'il demande un éditeur.
//
// La composition libre est donc UNE disposition de plus, nommée `libre`, dont le
// dessin ne vient pas du code mais des données. Les cent neuf écrites à la main
// ne bougent pas d'un pixel.
//
// ── EN SVG, ET PAS EN HTML COMME LES AUTRES ────────────────────────────────
//
// Les vingt-et-une sont du HTML, et c'était le bon choix : « deux mots empilés »
// est une boîte flexible, pas un dessin. Poser librement est l'inverse — il faut
// UN système de coordonnées, une rotation autour d'un point, un trait qui va
// d'ici à là. Le SVG fait les trois sans un seul calcul ; en HTML il aurait fallu
// des `position: absolute` et des `transform-origin`, c'est-à-dire réécrire le
// SVG en moins bien.
//
// ── LES COULEURS SONT DES NOMS, JAMAIS DES CODES ───────────────────────────
//
// « On peut choisir la couleur », et pourtant il n'y a pas de sélecteur de
// couleur ici. Deux raisons, mesurées :
//
//   1. L'APPLICATION A CINQ THÈMES (clair, sombre, océan, forêt, et le réglage
//      du poste). Un `#4f46e5` choisi sur le thème clair devient illisible sur
//      le sombre — et personne ne le verra, parce qu'on compose en clair.
//
//   2. `--primary`, `--danger`, `--success` SONT DES COULEURS DE FOND. Les
//      employer comme encre ne passe pas le seuil AA, et `tests/contraste.test.mjs`
//      garde cette règle dans le CSS. Ici le CSS ne voit rien : les couleurs
//      voyagent dans du JSON. C'est donc à CE module de ne proposer que de
//      l'encre, et à une épreuve de le vérifier.
//
// Sept couleurs nommées en français, toutes lisibles sur les cinq thèmes. C'est
// « choisir la couleur » sans la possibilité de choisir une couleur invisible.

import { indiceDonneLaReponse } from './indiceQuiDonne.js';

/** Le HTML est fabriqué ici : tout ce qui vient des données est échappé. */
// Oui, `core/dingbat.js` a le même. Le lui importer créerait un cycle — il
// importe CE module pour sa disposition `libre` —, et trois lignes dupliquées
// coûtent moins cher qu'un cycle d'imports qu'on ne comprend plus six mois après.
const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Deux décimales : un dessin doit rendre la MÊME chaîne à chaque appel. */
const n = (v) => {
    const x = Number(v);
    return Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;
};

/**
 * LA TOILE, EN UNITÉS À ELLE.
 *
 * Une composition est portable : les mêmes coordonnées donnent le même dessin
 * sur un téléphone et sur un vidéoprojecteur, parce que le SVG se met à
 * l'échelle. 400 × 260 est le rapport du cadre de l'exercice (`.dg-cadre`),
 * mesuré : un dessin composé dans un carré se retrouvait rogné en haut et en bas.
 */
export const TOILE = { largeur: 400, hauteur: 260 };

/**
 * LES SEPT COULEURS, et le jeton qui les rend sur les cinq thèmes.
 *
 * TOUS SONT DE L'ENCRE — `--text-main`, `--text-muted`, et les `-texte` des
 * couleurs vives. Aucun `--primary`, `--danger` ni `--success` nu : ce sont des
 * couleurs de FOND, et `tests/contraste.test.mjs` explique pourquoi.
 */
export const COULEURS = [
    { id: 'encre', nom: 'Encre', jeton: '--text-main' },
    { id: 'gris', nom: 'Gris', jeton: '--text-muted' },
    { id: 'bleu', nom: 'Bleu', jeton: '--primary-texte' },
    { id: 'rouge', nom: 'Rouge', jeton: '--danger-texte' },
    { id: 'vert', nom: 'Vert', jeton: '--success-texte' },
    { id: 'ambre', nom: 'Ambre', jeton: '--warning-texte' },
    { id: 'ciel', nom: 'Ciel', jeton: '--accent-texte' }
];

/** Le CSS d'une couleur nommée. Une couleur inconnue retombe sur l'encre. */
export function couleurCss(id) {
    const c = COULEURS.find(x => x.id === id) || COULEURS[0];
    return `var(${c.jeton})`;
}

/**
 * LES FORMES QU'ON PEUT POSER.
 *
 * `carre` et `cercle` n'ont qu'une dimension — leur hauteur SUIT leur largeur,
 * et l'éditeur n'affiche donc pas de champ « hauteur » pour elles. Un « carré »
 * de 80 sur 50 n'est pas un carré, et laisser le champ ouvert ne fabrique que
 * des énigmes dont le dessin contredit le mot.
 */
export const FORMES_LIBRES = [
    { id: 'rectangle', nom: 'Rectangle' },
    { id: 'carre', nom: 'Carré', egal: true },
    { id: 'cercle', nom: 'Cercle', egal: true },
    { id: 'ellipse', nom: 'Ovale' },
    { id: 'triangle', nom: 'Triangle' },
    { id: 'losange', nom: 'Losange' }
];

/** Les trois genres d'élément, et leur nom à l'écran. */
export const GENRES_ELEMENT = [
    { id: 'mot', nom: 'Un mot' },
    { id: 'trait', nom: 'Un trait' },
    { id: 'forme', nom: 'Une forme' }
];

/**
 * UN ÉLÉMENT NEUF, posé au milieu de la toile.
 *
 * Au MILIEU, et c'est une décision : posé en haut à gauche — le réflexe —, un
 * mot neuf se cachait sous le précédent et l'on croyait que le bouton n'avait
 * rien fait. Le milieu est le seul endroit qu'on regarde déjà.
 */
export function elementNeuf(genre, quoi = {}) {
    const cx = Math.round(TOILE.largeur / 2);
    const cy = Math.round(TOILE.hauteur / 2);
    if (genre === 'trait') {
        return {
            type: 'trait', x1: cx - 70, y1: cy, x2: cx + 70, y2: cy,
            epaisseur: 3, couleur: 'encre', pointille: false, fleche: false, ...quoi
        };
    }
    if (genre === 'forme') {
        return {
            type: 'forme', forme: 'carre', x: cx, y: cy, largeur: 150, hauteur: 110,
            angle: 0, couleur: 'encre', epaisseur: 3, remplissage: 'aucun', ...quoi
        };
    }
    return {
        type: 'mot', texte: 'MOT', x: cx, y: cy, taille: 34, angle: 0,
        couleur: 'encre', gras: true, miroir: false, espacement: 0, ...quoi
    };
}

// ── LE DESSIN ───────────────────────────────────────────────────────────────

/** La transformation d'un mot : on tourne et on retourne AUTOUR DE SON POINT. */
function transformeMot(e) {
    const bouts = [];
    if (n(e.angle)) bouts.push(`rotate(${n(e.angle)} ${n(e.x)} ${n(e.y)})`);
    // LE MIROIR SE FAIT APRÈS LA ROTATION, et autour du même point : l'inverse
    // donnerait un mot retourné PUIS déplacé, qui n'est plus là où on l'a posé.
    if (e.miroir) bouts.push(`translate(${n(e.x)} 0) scale(-1 1) translate(${n(-e.x)} 0)`);
    return bouts.length ? ` transform="${bouts.join(' ')}"` : '';
}

function dessinerMot(e) {
    const texte = String(e.texte == null ? '' : e.texte);
    // UN MOT VIDE NE SE DESSINE PAS, ET IL NE DOIT PAS DISPARAÎTRE EN SILENCE :
    // l'auteur croirait avoir posé quelque chose. `validerLibre` le dit, et
    // l'atelier le montre en rouge avant l'export.
    const style = [
        `fill: ${couleurCss(e.couleur)}`,
        `font-size: ${n(e.taille || 34)}px`,
        `font-weight: ${e.gras === false ? '600' : '800'}`,
        n(e.espacement) ? `letter-spacing: ${n(e.espacement)}px` : ''
    ].filter(Boolean).join('; ');
    return `<text x="${n(e.x)}" y="${n(e.y)}" text-anchor="middle"`
        + ` dominant-baseline="central" style="${style}"${transformeMot(e)}>${esc(texte)}</text>`;
}

/**
 * LA POINTE D'UNE FLÈCHE EST UN CHEMIN, PAS UN `<marker>`.
 *
 * Un `<marker>` se référence par un `id`, et deux scènes sur la même page
 * porteraient le même : l'atelier en affiche DEUX côte à côte — la toile et le
 * modèle — et la seconde aurait volé la flèche de la première. Un chemin calculé
 * n'a pas d'identité, donc rien à voler.
 */
function pointeDeFleche(e) {
    const a = Math.atan2(n(e.y2) - n(e.y1), n(e.x2) - n(e.x1));
    const L = 6 + 2.4 * Math.max(1, n(e.epaisseur) || 3);
    const ouverture = 0.44;
    const p = (da) => `${n(n(e.x2) - L * Math.cos(a + da))},${n(n(e.y2) - L * Math.sin(a + da))}`;
    return `<polygon points="${n(e.x2)},${n(e.y2)} ${p(ouverture)} ${p(-ouverture)}"`
        + ` style="fill: ${couleurCss(e.couleur)}"/>`;
}

function dessinerTrait(e) {
    const style = [
        `stroke: ${couleurCss(e.couleur)}`,
        `stroke-width: ${n(e.epaisseur) || 3}`,
        'stroke-linecap: round',
        e.pointille ? 'stroke-dasharray: 7 6' : ''
    ].filter(Boolean).join('; ');
    const trait = `<line x1="${n(e.x1)}" y1="${n(e.y1)}" x2="${n(e.x2)}" y2="${n(e.y2)}"`
        + ` style="${style}"/>`;
    return e.fleche ? trait + pointeDeFleche(e) : trait;
}

/** Le remplissage d'une forme : rien, ou une teinte de sa propre couleur. */
function remplissageCss(e) {
    if (e.remplissage !== 'teinte') return 'none';
    // UNE TEINTE DE SA PROPRE COULEUR, ET NON UN JETON DE FOND. `color-mix` garde
    // le lien : la forme rouge se remplit de rouge pâle sur le thème clair ET sur
    // le sombre, et le mot posé dessus reste lisible dans les deux. Mesuré au
    // contraste des pixels (`sonde.contrasteRendu`).
    return `color-mix(in srgb, ${couleurCss(e.couleur)} 16%, transparent)`;
}

function dessinerForme(e) {
    const def = FORMES_LIBRES.find(f => f.id === e.forme) || FORMES_LIBRES[0];
    const l = Math.abs(n(e.largeur) || 120);
    const h = def.egal ? l : Math.abs(n(e.hauteur) || 90);
    const x = n(e.x), y = n(e.y);
    const style = `stroke: ${couleurCss(e.couleur)}; stroke-width: ${n(e.epaisseur) || 3};`
        + ` fill: ${remplissageCss(e)}; stroke-linejoin: round`;
    const tour = n(e.angle) ? ` transform="rotate(${n(e.angle)} ${x} ${y})"` : '';

    if (def.id === 'cercle' || def.id === 'ellipse') {
        return `<ellipse cx="${x}" cy="${y}" rx="${n(l / 2)}" ry="${n(h / 2)}"`
            + ` style="${style}"${tour}/>`;
    }
    if (def.id === 'triangle') {
        const pts = [[x, y - h / 2], [x + l / 2, y + h / 2], [x - l / 2, y + h / 2]];
        return `<polygon points="${pts.map(p => `${n(p[0])},${n(p[1])}`).join(' ')}"`
            + ` style="${style}"${tour}/>`;
    }
    if (def.id === 'losange') {
        const pts = [[x, y - h / 2], [x + l / 2, y], [x, y + h / 2], [x - l / 2, y]];
        return `<polygon points="${pts.map(p => `${n(p[0])},${n(p[1])}`).join(' ')}"`
            + ` style="${style}"${tour}/>`;
    }
    return `<rect x="${n(x - l / 2)}" y="${n(y - h / 2)}" width="${n(l)}" height="${n(h)}"`
        + ` rx="3" style="${style}"${tour}/>`;
}

/** Un élément, quel qu'il soit. Un genre inconnu JETTE — voir `rendreLibre`. */
export function dessinerElement(e) {
    if (!e || typeof e !== 'object') throw new Error('élément libre vide');
    if (e.type === 'mot') return dessinerMot(e);
    if (e.type === 'trait') return dessinerTrait(e);
    if (e.type === 'forme') return dessinerForme(e);
    throw new Error(`élément libre de genre inconnu « ${e.type} »`);
}

/**
 * LA SCÈNE D'UNE COMPOSITION LIBRE.
 *
 * ELLE JETTE SUR UNE TOILE VIDE ET SUR UNE TOILE SANS MOT, et c'est la même
 * décision que `dessiner` prend sur une disposition inconnue : rendre un cadre
 * muet, c'est rendre la même chose qu'un logiciel cassé, et l'élève chercherait
 * la réponse d'un dessin qui n'existe pas. Un dingbat SE LIT : s'il n'y a aucun
 * mot, il n'y a rien à lire.
 */
export function rendreLibre(d) {
    const els = (d && Array.isArray(d.elements)) ? d.elements : [];
    if (!els.length) throw new Error(`dingbat « ${d && d.id} » : composition libre vide`);
    if (!els.some(e => e && e.type === 'mot' && String(e.texte || '').trim())) {
        throw new Error(`dingbat « ${d && d.id} » : composition libre SANS AUCUN MOT`
            + ' — il n\'y a rien à lire');
    }
    return `<svg class="dg-libre" viewBox="0 0 ${TOILE.largeur} ${TOILE.hauteur}"`
        + ` width="${TOILE.largeur}" height="${TOILE.hauteur}"`
        + ` role="img" aria-label="${esc(direLibre(d))}">`
        + els.map(dessinerElement).join('') + '</svg>';
}

// ── CE QUE LA SCÈNE DIT À QUI NE LA VOIT PAS ────────────────────────────────

/** L'orientation d'un mot, en français. Rien quand il est droit. */
function direOrientation(e) {
    const a = ((Math.round(Number(e.angle) || 0) % 360) + 360) % 360;
    const bouts = [];
    if (a >= 352 || a <= 8) { /* droit : on ne dit rien */ }
    else if (Math.abs(a - 180) <= 8) bouts.push('à l\'envers');
    else if (Math.abs(a - 90) <= 8) bouts.push('tourné d\'un quart de tour vers la droite');
    else if (Math.abs(a - 270) <= 8) bouts.push('tourné d\'un quart de tour vers la gauche');
    else bouts.push(`incliné de ${a} degrés`);
    if (e.miroir) bouts.push('en miroir');
    return bouts.join(' et ');
}

/**
 * LE DESSIN, DIT À VOIX HAUTE — pour `aria-label`.
 *
 * ON DÉCRIT LA SCÈNE, JAMAIS LA RÉPONSE. Un élève qui n'y voit pas doit pouvoir
 * jouer, donc il faut lui dire ce qui est écrit et comment c'est posé ; lui dire
 * « racine carrée » serait lui enlever l'énigme. C'est exactement la ligne que
 * tiennent déjà les indices : nommer le GESTE, pas la lecture.
 */
export function direLibre(d) {
    const els = (d && Array.isArray(d.elements)) ? d.elements : [];
    const mots = els.filter(e => e && e.type === 'mot' && String(e.texte || '').trim())
        .map(e => {
            const o = direOrientation(e);
            return `« ${String(e.texte).trim()} »${o ? ' ' + o : ''}`;
        });
    const formes = els.filter(e => e && e.type === 'forme')
        .map(e => (FORMES_LIBRES.find(f => f.id === e.forme) || FORMES_LIBRES[0]).nom.toLowerCase());
    const traits = els.filter(e => e && e.type === 'trait').length;

    const bouts = [];
    if (mots.length) bouts.push(mots.length === 1 ? `le mot ${mots[0]}` : `les mots ${mots.join(', ')}`);
    if (formes.length) bouts.push(formes.length === 1 ? `un ${formes[0]}` : `${formes.length} formes : ${formes.join(', ')}`);
    if (traits) bouts.push(traits === 1 ? 'un trait' : `${traits} traits`);
    return bouts.length ? `Dingbat : ${bouts.join(' ; ')}.` : 'Dingbat sans rien de dessiné.';
}

// ── CE QUI SE VOIT MAL, ET QU'IL FAUT DIRE AVANT L'EXPORT ───────────────────

/**
 * CE QUI NE SE VERRA PAS, DIT AVANT D'ENREGISTRER.
 *
 * La leçon de `tools/relireUneSeance.mjs`, et elle vaut ici mot pour mot : c'est
 * dans sa séance « Relatifs » qu'on a trouvé un mot aux titre et texte vides,
 * invisible dans une liste de seize lignes. Un élément posé hors de la toile, un
 * mot vide, un trait de longueur nulle sont du même genre : ils existent dans le
 * JSON et pas à l'écran.
 *
 * @returns {Array<{element: ?number, dit: string}>}  vide quand tout va bien
 */
export function validerLibre(enigme) {
    const els = (enigme && Array.isArray(enigme.elements)) ? enigme.elements : [];
    const avis = [];
    if (!els.length) avis.push({ element: null, dit: 'La toile est vide.' });
    if (els.length && !els.some(e => e.type === 'mot' && String(e.texte || '').trim())) {
        avis.push({ element: null, dit: 'Aucun mot : un dingbat SE LIT, il faut au moins un mot.' });
    }

    const dedans = (x, y) => x >= -2 && y >= -2 && x <= TOILE.largeur + 2 && y <= TOILE.hauteur + 2;
    els.forEach((e, i) => {
        if (e.type === 'mot') {
            if (!String(e.texte || '').trim()) avis.push({ element: i, dit: 'Ce mot est vide.' });
            if (!dedans(n(e.x), n(e.y))) avis.push({ element: i, dit: 'Ce mot est posé hors de la toile.' });
        } else if (e.type === 'trait') {
            const long = Math.hypot(n(e.x2) - n(e.x1), n(e.y2) - n(e.y1));
            if (long < 2) avis.push({ element: i, dit: 'Ce trait n\'a pas de longueur : on ne le verra pas.' });
            if (!dedans(n(e.x1), n(e.y1)) && !dedans(n(e.x2), n(e.y2))) {
                avis.push({ element: i, dit: 'Ce trait est entièrement hors de la toile.' });
            }
        } else if (e.type === 'forme') {
            if (Math.abs(n(e.largeur)) < 4) avis.push({ element: i, dit: 'Cette forme est trop petite pour se voir.' });
            if (!dedans(n(e.x), n(e.y))) avis.push({ element: i, dit: 'Cette forme est posée hors de la toile.' });
        } else {
            avis.push({ element: i, dit: `Genre d'élément inconnu : « ${e && e.type} ».` });
        }
    });

    // CE QUI SE VÉRIFIE SUR L'ÉNIGME, pas sur le dessin — et qui la rendrait
    // insoluble : `tests/dingbat.test.mjs` exige une réponse écrite, et
    // `js/core/dingbat.js` exige qu'elle soit acceptée par son propre juge.
    if (!String((enigme && enigme.reponse) || '').trim()) {
        avis.push({ element: null, dit: 'Pas de réponse écrite : l\'énigme serait insoluble.' });
    }

    // LES INDICES, UN PAR UN. Rémy : « et on peut mettre des indices ». Chacun
    // doit dire la PREMIÈRE CHOSE À REGARDER, jamais la réponse — et un indice
    // qui la donne contournerait la règle de `core/itemSession.js` (« on ne donne
    // pas la réponse tant qu'il lui reste un essai »). La règle elle-même, et les
    // deux faux signalements qu'elle a coûtés, vivent dans `core/indiceQuiDonne.js`.
    const aides = (Array.isArray(enigme && enigme.aides) ? enigme.aides
        : ((enigme && enigme.aide) ? [enigme.aide] : []));
    aides.forEach((a, k) => {
        if (!String(a == null ? '' : a).trim()) {
            avis.push({ element: null, dit: `L'indice n° ${k + 1} est vide : il ne s'affichera pas.` });
        } else if (indiceDonneLaReponse(a, enigme.reponse)) {
            avis.push({
                element: null,
                dit: `L'indice n° ${k + 1} contient la réponse : il la donne au lieu de la faire chercher.`
            });
        }
    });
    return avis;
}

// ── LE JSON QU'ON COLLE DANS `js/data/dingbats.js` ──────────────────────────

/** Les champs d'un élément qui comptent, dans un ordre stable, sans le superflu. */
function elementPropre(e) {
    if (e.type === 'trait') {
        const o = {
            type: 'trait', x1: n(e.x1), y1: n(e.y1), x2: n(e.x2), y2: n(e.y2),
            epaisseur: n(e.epaisseur) || 3, couleur: e.couleur || 'encre'
        };
        if (e.pointille) o.pointille = true;
        if (e.fleche) o.fleche = true;
        return o;
    }
    if (e.type === 'forme') {
        const def = FORMES_LIBRES.find(f => f.id === e.forme) || FORMES_LIBRES[0];
        const o = {
            type: 'forme', forme: def.id, x: n(e.x), y: n(e.y), largeur: n(e.largeur),
            epaisseur: n(e.epaisseur) || 3, couleur: e.couleur || 'encre'
        };
        // UNE HAUTEUR SOUS UN CARRÉ EST UN MENSONGE : elle ne sert pas au dessin,
        // et quelqu'un qui relit le JSON croirait qu'elle compte.
        if (!def.egal) o.hauteur = n(e.hauteur);
        if (n(e.angle)) o.angle = n(e.angle);
        if (e.remplissage === 'teinte') o.remplissage = 'teinte';
        return o;
    }
    const o = {
        type: 'mot', texte: String(e.texte == null ? '' : e.texte),
        x: n(e.x), y: n(e.y), taille: n(e.taille) || 34, couleur: e.couleur || 'encre'
    };
    if (n(e.angle)) o.angle = n(e.angle);
    if (e.miroir) o.miroir = true;
    if (e.gras === false) o.gras = false;
    if (n(e.espacement)) o.espacement = n(e.espacement);
    return o;
}

/**
 * L'ÉNIGME, PRÊTE À COLLER — dans l'ordre où `js/data/dingbats.js` les écrit.
 *
 * L'ORDRE DES CHAMPS N'EST PAS UNE COQUETTERIE. Ce fichier se relit à l'œil,
 * cent neuf lignes à la file : une entrée qui range ses champs autrement saute
 * aux yeux comme une faute, et l'on perd une minute à comprendre qu'elle n'en
 * est pas une.
 *
 * ON NE MET PAS `mots` : la composition libre ne s'en sert pas, et un champ qui
 * ne sert à rien finit par être cru.
 */
export function enigmeEnJson(enigme) {
    const e = enigme || {};
    const sortie = {
        id: String(e.id || '').trim() || 'dg-sans-nom',
        theme: e.theme === 'general' ? 'general' : 'maths',
        niveau: Math.min(4, Math.max(1, Math.round(Number(e.niveau) || 1))),
        forme: 'libre',
        elements: ((e.elements) || []).map(elementPropre),
        reponse: String(e.reponse || '').trim()
    };
    const variantes = (e.variantes || [])
        .map(v => String(v).trim()).filter(Boolean);
    if (variantes.length) sortie.variantes = variantes;

    // UN SEUL INDICE S'ÉCRIT `aide`, PLUSIEURS S'ÉCRIVENT `aides` — et ce n'est
    // pas une coquetterie. `js/data/dingbats.js` se relit à l'œil, cent neuf
    // lignes à la file, et les cent neuf disent `aide`. Une entrée qui écrirait
    // `aides: ['…']` pour un seul indice sauterait aux yeux comme une faute, et
    // l'on perdrait une minute à comprendre qu'elle n'en est pas une. Le moteur
    // lit les deux (voir `indices()`), donc c'est à l'export de choisir la forme
    // qui ressemble au voisinage.
    const aides = (Array.isArray(e.aides) ? e.aides : (e.aide ? [e.aide] : []))
        .map(a => String(a == null ? '' : a).trim()).filter(Boolean);
    if (aides.length === 1) sortie.aide = aides[0];
    else if (aides.length > 1) sortie.aides = aides;

    if (String(e.explication || '').trim()) sortie.explication = String(e.explication).trim();
    return sortie;
}

/**
 * TOUT CE QU'ON A COMPOSÉ, EN UN SEUL TEXTE.
 *
 * Rémy : « qu'il se sauve au fur et à mesure et je te les enverrai grâce à un
 * bouton exporter ». Ce qu'il m'envoie n'est donc pas UNE énigme mais SA
 * RÉCOLTE — celles de la semaine, composées entre deux cours.
 *
 * ON DIT COMBIEN IL Y EN A. Un fichier de huit cents lignes ne dit pas de
 * lui-même combien d'énigmes il porte, et c'est la première chose que je veux
 * savoir en le recevant : si j'en colle onze et qu'il en avait douze, personne
 * ne s'en apercevra.
 */
export function lotEnTexte(enigmes) {
    const liste = (enigmes || []).map(enigmeEnJson);
    return JSON.stringify({
        quoi: 'dingbats',
        combien: liste.length,
        dingbats: liste
    }, null, 4);
}

/** Relire ce que `lotEnTexte` a écrit — ou une énigme seule, collée telle quelle. */
export function lireUnLot(texte) {
    const brut = JSON.parse(texte);
    // LES DEUX FORMES SONT ACCEPTÉES, parce que les deux circulent : la récolte
    // entière que l'atelier exporte, et l'énigme seule qu'on recopie depuis
    // `js/data/dingbats.js` pour la retoucher.
    if (brut && Array.isArray(brut.dingbats)) return brut.dingbats;
    if (Array.isArray(brut)) return brut;
    if (brut && Array.isArray(brut.elements)) return [brut];
    throw new Error('ce texte ne porte ni une composition ni une récolte de compositions');
}

/**
 * LE TEXTE QU'ON COLLE, tel quel, dans `js/data/dingbats.js`.
 *
 * Du JSON indenté de quatre espaces comme le reste du fichier, et pas une
 * accolade de plus : ce n'est pas un fichier, c'est UNE ligne de liste.
 */
export function enigmeEnTexte(enigme) {
    return JSON.stringify(enigmeEnJson(enigme), null, 4);
}
