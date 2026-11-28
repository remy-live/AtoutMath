// L'ARRONDI, MONTRÉ — le chiffre qui décide, et la loupe entre les deux voisins.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 28 novembre : « j'ai des élèves qui galèrent un peu, il faut leur
// montrer visuellement ». Et sa façon de le dire, juste avant : « au dixième, et
// on regarde le chiffre des centièmes ».
//
// DEUX IMAGES, PARCE QU'IL Y A DEUX GESTES.
//
//   1. LES CHIFFRES. Le nombre écrit en cases : ce qu'on GARDE en bleu (jusqu'au
//      rang demandé), le chiffre qui DÉCIDE en orange, encerclé, et nommé — « le
//      chiffre des centièmes : 5 » —, le reste grisé. L'élève qui coupe au
//      mauvais endroit voit où passe la coupe.
//
//   2. LA LOUPE. Un morceau de droite qui va de la valeur par défaut à la valeur
//      par excès, coupé en dix ; le milieu marqué ; le nombre posé à sa place.
//      C'est la définition même de l'arrondi — « la plus PROCHE des deux » — et
//      elle se voit : le point est d'un côté ou de l'autre du milieu.
//
// LE DESSIN NE CALCULE RIEN EN FLOTTANTS, comme le reste de l'arrondi (voir
// `core/arrondi.js`) : la place du point se lit sur les chiffres qui suivent le
// rang, et le milieu s'écrit en ajoutant un 5 au bout de la valeur par défaut.

import { rangDe, parDefaut, parExces, reponseDe, ecrire } from './arrondi.js';
import { cadreSvg } from './cotes.js';

// Les noms des chiffres — celui qu'on garde, celui qui décide — sont dans
// `RANGS` (core/arrondi.js) : le texte et le dessin les disent de la même façon.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * OÙ TOMBE LE NOMBRE ENTRE SES DEUX VOISINS, de 0 (sur la valeur par défaut)
 * à 1 (sur la valeur par excès) : les chiffres après le rang, lus comme une
 * fraction. 87,552 au dixième → 0,52.
 */
export function placeEntreLesVoisins(t) {
    const d = rangDe(t.rang).decimales;
    return t.n.chiffres.slice(d).reduce((s, c, i) => s + c / 10 ** (i + 1), 0);
}

/** Le milieu des deux voisins, écrit chiffre par chiffre : 87,5 → 87,55. */
export function milieuDe(t) {
    const d = rangDe(t.rang).decimales;
    const bas = parDefaut(t.n, d);
    const chiffres = [...bas.chiffres];
    while (chiffres.length < d) chiffres.push(0);
    return ecrire({ entier: bas.entier, chiffres: [...chiffres, 5] });
}

/** LES CHIFFRES EN CASES : gardés, celui qui décide, le reste. */
function lesChiffres(t, y0) {
    const d = rangDe(t.rang).decimales;
    const texte = ecrire(t.n);
    const virgule = texte.indexOf(',');
    const W = 30;
    const m = [];
    const P = [];
    // Le rang de chaque caractère après la virgule ; la partie entière a -1.
    [...texte].forEach((ch, i) => {
        const x = i * W;
        P.push([x, y0 - 26], [x + W, y0 + 14]);
        const apres = virgule < 0 ? -1 : i - virgule;
        let classe = 'arr-garde';
        if (ch === ',') classe = 'arr-virgule';
        // LE CHIFFRE QUI DÉCIDE NE S'ENTOURE QUE POUR L'ARRONDI. Par défaut et
        // par excès, il ne décide de rien — on coupe, voilà tout —, et le
        // texte le dit ; un cercle orange l'aurait contredit. Vu sur la planche
        // des dessins : « 3,0(7)8 » entouré sous « la valeur par défaut ».
        else if (virgule >= 0 && apres > d) {
            classe = apres === d + 1 && t.sorte === 'arrondi' ? 'arr-decide' : 'arr-reste';
        }
        if (classe === 'arr-decide') {
            m.push(`<circle class="arr-cercle" cx="${x + W / 2}" cy="${y0 - 7}" r="15"/>`);
        }
        m.push(`<text class="arr-chiffre ${classe}" x="${x + W / 2}" y="${y0}" text-anchor="middle">${esc(ch)}</text>`);
    });
    // LA COUPE : un trait juste après le dernier chiffre gardé. À l'unité, elle
    // passe sur la virgule.
    // (À l'unité, juste AVANT la virgule : posé dessus, le trait en faisait un
    // point-virgule — vu sur la planche.)
    const finGarde = virgule < 0 ? texte.length : virgule + (d ? d + 1 : 0);
    const xc = finGarde * W + (d ? 0 : 3);
    m.push(`<line class="arr-coupe" x1="${xc}" y1="${y0 - 30}" x2="${xc}" y2="${y0 + 10}"/>`);
    const iDecide = virgule + d + 1;
    const xd = iDecide * W + W / 2;
    const sous = t.sorte === 'arrondi'
        ? `le chiffre ${rangDe(t.rang).decide} : ${t.n.chiffres[d]}`
        : (t.sorte === 'defaut' ? 'on coupe le reste'
            : `on coupe, puis on monte de ${rangDe(t.rang).pas}`);
    m.push(`<text class="arr-legende ${t.sorte === 'arrondi' ? 'arr-legende--decide' : ''}" x="${xd}" y="${y0 + 32}" text-anchor="middle">${esc(sous)}</text>`);
    m.push(`<text class="arr-legende arr-legende--garde" x="${(finGarde * W) / 2}" y="${y0 - 34}" text-anchor="middle">`
        + `on garde jusqu'au chiffre ${rangDe(t.rang).garde}</text>`);
    P.push([xd - 90, y0 + 40], [xd + 90, y0 + 40], [0, y0 - 46], [finGarde * W, y0 - 46]);
    return { m, P };
}

/**
 * LA LOUPE : de la valeur par défaut à la valeur par excès.
 * @param {boolean} fleche  montrer la réponse (pour la correction)
 */
function laLoupe(t, y0, { fleche = false, milieu = true, cacher = false,
    mots = ['par défaut', 'par excès'], bornes = null } = {}) {
    const d = rangDe(t.rang).decimales;
    // `bornes` : les deux voisins tels que l'EXERCICE les écrit. L'encadrement
    // écrit « 20 » là où l'arrondi écrit « 20,0 » ; un même écran ne doit pas
    // dire le même nombre de deux façons.
    const bas = bornes ? bornes[0] : ecrire(parDefaut(t.n, d));
    const haut = bornes ? bornes[1] : ecrire(parExces(t.n, d));
    const L = 340;
    const m = [];
    const P = [[-20, y0 - 58], [L + 20, y0 + 52]];
    const f = placeEntreLesVoisins(t);
    const xn = f * L;
    // LA MOITIÉ OÙ TOMBE LE NOMBRE SE TEINTE : « le plus proche » devient une
    // couleur avant d'être un calcul. Seulement quand on demande l'arrondi —
    // pour « par défaut » et « par excès », la proximité ne compte pas.
    if (milieu && t.sorte === 'arrondi') {
        const droite = f >= 0.5;
        m.push(`<rect class="arr-moitie" x="${droite ? L / 2 : 0}" y="${y0 - 10}" width="${L / 2}" height="20"/>`);
    }
    m.push(`<line class="arr-droite" x1="0" y1="${y0}" x2="${L}" y2="${y0}"/>`);
    for (let k = 0; k <= 10; k++) {
        const x = (k * L) / 10;
        const grand = k === 0 || k === 10;
        const demi = k === 5 && milieu;
        m.push(`<line class="${grand ? 'arr-borne' : (demi ? 'arr-milieu' : 'arr-trait')}" x1="${x}" y1="${y0 - (grand ? 14 : demi ? 12 : 6)}" x2="${x}" y2="${y0 + (grand ? 14 : demi ? 12 : 6)}"/>`);
    }
    if (milieu) {
        m.push(`<text class="arr-legende arr-legende--milieu" x="${L / 2}" y="${y0 + 30}" text-anchor="middle">milieu : ${esc(milieuDe(t))}</text>`);
    }
    // `cacher` : des « ? » aux deux bouts — l'indice d'un encadrement montre où
    // tombe le nombre sans donner les deux voisins, qui sont la réponse.
    m.push(`<text class="arr-bout" x="0" y="${y0 + 32}" text-anchor="middle">${cacher ? '?' : esc(bas)}</text>`);
    m.push(`<text class="arr-legende" x="0" y="${y0 + 48}" text-anchor="middle">${esc(mots[0])}</text>`);
    m.push(`<text class="arr-bout" x="${L}" y="${y0 + 32}" text-anchor="middle">${cacher ? '?' : esc(haut)}</text>`);
    m.push(`<text class="arr-legende" x="${L}" y="${y0 + 48}" text-anchor="middle">${esc(mots[1])}</text>`);
    // LE NOMBRE, À SA PLACE, écrit au-dessus de son point.
    m.push(`<circle class="arr-point" cx="${xn.toFixed(1)}" cy="${y0}" r="6"/>`);
    m.push(`<text class="arr-nombre" x="${xn.toFixed(1)}" y="${y0 - 20}" text-anchor="middle">${esc(ecrire(t.n))}</text>`);
    if (fleche) {
        const rep = reponseDe(t);
        const versHaut = ecrire(rep) === haut;
        const xr = versHaut ? L : 0;
        const y = y0 - 34;
        // Une flèche courbe du nombre vers la réponse, et le mot qui la nomme.
        const mx = (xn + xr) / 2;
        // LA FLÈCHE PART AU-DESSUS DU NOMBRE ÉCRIT : partie de son point, elle
        // le barrait — vu sur la planche.
        m.push(`<path class="arr-fleche" d="M ${xn.toFixed(1)} ${y0 - 40} Q ${mx.toFixed(1)} ${y - 34} ${xr} ${y0 - 18}"/>`);
        m.push(`<polygon class="arr-pointe" points="${xr},${y0 - 12} ${xr + (versHaut ? -9 : 9)},${y0 - 22} ${xr + (versHaut ? 3 : -3)},${y0 - 24}"/>`);
    }
    return { m, P };
}

/**
 * LES TROIS DESSINS DES TROIS INDICES, et celui de la correction.
 *
 *   indice 1 → les chiffres : ce qu'on garde, ce qui décide ;
 *   indice 2 → les chiffres et la loupe, sans le milieu ;
 *   indice 3 → la loupe avec son milieu (et sa moitié teintée pour l'arrondi) ;
 *   correction → tout, et la flèche vers la réponse.
 */
export function dessinsDeLArrondi(t) {
    const svg = (parts, aria) => {
        const m = parts.flatMap(p => p.m);
        const P = parts.flatMap(p => p.P);
        return cadreSvg(m.join('\n        '), P, { classe: 'arr-svg', aria, minL: 360, minH: 120 });
    };
    // La loupe sous les chiffres, centrée sur eux.
    const chiffres = () => lesChiffres(t, 40);
    const decaler = (part, dx, dy = 0) => ({
        m: part.m.map(s => `<g transform="translate(${dx} ${dy})">${s}</g>`),
        P: part.P.map(([x, y]) => [x + dx, y + dy])
    });
    const largeurChiffres = ecrire(t.n).length * 30;
    const dx = (largeurChiffres - 340) / 2;
    const loupe = (o) => decaler(laLoupe(t, 0, o), dx, 140);
    return {
        indices: [
            svg([chiffres()], 'Le nombre en cases : les chiffres gardés, et celui qui décide'),
            svg([chiffres(), loupe({ milieu: false })], 'Le nombre posé entre ses deux voisins'),
            svg([chiffres(), loupe({ milieu: true })], 'Le nombre, ses deux voisins et leur milieu')
        ],
        correction: svg([chiffres(), loupe({ milieu: true, fleche: true })],
            'Le nombre, ses deux voisins, et la réponse')
    };
}

/**
 * L'ENCADREMENT, MONTRÉ — la même loupe, et c'est sa définition : « 15 < 15,2
 * < 16 », c'est le nombre posé entre ses deux voisins. Rémy citait les
 * encadrements avec l'arrondi, et ce sont les mêmes élèves qui butent.
 *
 * L'INDICE NE DONNE PAS LES VOISINS : il pose le nombre sur la droite et met
 * un « ? » à chaque bout — les voisins sont la réponse. La correction les écrit.
 *
 * Seulement entre deux entiers et entre deux dixièmes : les dizaines n'ont pas
 * de rang dans `RANGS`, et ce n'est pas là que la classe bute.
 *
 * @param {string} ecrit  le nombre tel qu'il s'écrit (« 19,13 »)
 * @param {'unite'|'dixieme'} rang
 */
export function dessinsDeLEncadrement(ecrit, rang, bornes = null) {
    const [e, dec = ''] = String(ecrit).split(',');
    const t = { rang, sorte: 'defaut', n: { entier: Number(e), chiffres: [...dec].map(Number) } };
    const mots = ['juste en dessous', 'juste au-dessus'];
    const svg = (o, aria) => {
        const p = laLoupe(t, 0, { milieu: false, mots, bornes, ...o });
        return cadreSvg(p.m.join('\n        '), p.P, { classe: 'arr-svg', aria, minL: 360, minH: 100 });
    };
    return {
        indice: svg({ cacher: true }, 'Le nombre posé sur la droite, entre deux voisins à trouver'),
        correction: svg({}, 'Le nombre posé entre ses deux voisins')
    };
}
