// LES DESSINS DE L'ENQUÊTE — des sols, des meubles, des visages, des symboles.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 28 octobre, capture d'un jeu du commerce à l'appui : « Ce jeu ressemble
// à l'enquête mais l'enquête fait vraiment vieux […] il faudrait qqch de plus
// visuel ». Les deux écrans faisaient la même chose ; côte à côte, quatre
// différences se nomment, et aucune n'est une question de goût.
//
//   1. RIEN N'ÉTAIT DESSINÉ. Des rectangles pastel unis, le nom du lieu écrit
//      en petit dans un coin. Un rectangle de couleur avec du texte dans le
//      coin, c'est un tableur ; un sol qui change de matière, c'est une maison.
//   2. LES PERSONNAGES N'AVAIENT PAS DE VISAGE. Cinq pastilles de texte. Or
//      l'élève doit dire « Jade est au nord de Noé » : il faut qu'il les VOIE.
//   3. LES REPÈRES ÉTAIENT DU TEXTE DANS UN COIN — « 📌 le distributeur d'eau »
//      sur trois lignes, en gris de 9 px. L'indice dit « à côté du banc » :
//      l'objet est un ACTEUR de l'énigme, pas une légende.
//   4. LES INDICES ÉTAIENT UNE LISTE NUMÉROTÉE. Sept phrases de la même
//      couleur. Rémy a choisi la maquette B : on les garde toutes sous les
//      yeux, mais chacune porte les VISAGES dont elle parle.
//
// ── POURQUOI CE FICHIER NE CONNAÎT NI LE DOM NI LE JEU ──────────────────────
//
// Il ne rend que des chaînes : du SVG et du CSS. L'écran les pose, l'épreuve
// les compte. C'est ce qui permet de garder, SANS navigateur, que chaque lieu
// de chaque scène a un sol, que chaque repère a un meuble, que chaque prénom a
// un visage, et que deux pièces voisines ne se ressemblent jamais — la seule
// faute de ce fichier qui ne se verrait pas en le lisant.

import { SCENES } from './enquete.js';

/* ── LES SOLS ───────────────────────────────────────────────────────────────

   Sept matières, et le vocabulaire est celui de la capture de Rémy : des lames
   de parquet, un carrelage à quatre points, du béton à deux points. C'est
   éprouvé, et cela se lit à 70 px de côté sur un téléphone.

   LE SENS DES LAMES COMPTE. Le hall et le gymnase sont tous deux en bois et se
   touchent : lames verticales d'un côté, horizontales de l'autre, et l'on voit
   la frontière sans lire l'étiquette. */
export const MATIERES = {
    carrelage: (f, t) => `radial-gradient(circle at 28% 28%, ${t} 1.6px, transparent 1.7px),`
        + `radial-gradient(circle at 72% 28%, ${t} 1.6px, transparent 1.7px),`
        + `radial-gradient(circle at 28% 72%, ${t} 1.6px, transparent 1.7px),`
        + `radial-gradient(circle at 72% 72%, ${t} 1.6px, transparent 1.7px), ${f}`,
    beton: (f, t) => `radial-gradient(circle at 36% 36%, ${t} 1.7px, transparent 1.8px),`
        + `radial-gradient(circle at 64% 64%, ${t} 1.7px, transparent 1.8px), ${f}`,
    lamesV: (f, t) => `repeating-linear-gradient(90deg, ${f} 0 9px, ${t} 9px 10px), ${f}`,
    lamesH: (f, t) => `repeating-linear-gradient(0deg, ${f} 0 11px, ${t} 11px 12px), ${f}`,
    joints: (f, t) => `linear-gradient(${t} 0 1.5px, transparent 1.5px) 0 0 / 100% 17px,`
        + `linear-gradient(90deg, ${t} 0 1.5px, transparent 1.5px) 0 0 / 17px 100%, ${f}`,
    herbe: (f, t) => `radial-gradient(ellipse 3px 5px at 25% 40%, ${t} 60%, transparent 62%),`
        + `radial-gradient(ellipse 3px 5px at 70% 75%, ${t} 60%, transparent 62%), ${f}`,
    tapis: (f, t) => `repeating-linear-gradient(45deg, ${t} 0 2px, transparent 2px 7px),`
        + `repeating-linear-gradient(-45deg, ${t} 0 2px, transparent 2px 7px), ${f}`
};

/** Le sol de chaque lieu du catalogue : la matière, le fond, le motif. */
export const SOLS = {
    'la cour': ['herbe', '#cfe8ad', '#aed283'],
    'le préau': ['beton', '#d6dce4', '#b9c1cc'],
    'le hall': ['lamesV', '#e7a567', '#dd9452'],
    'la salle de maths': ['carrelage', '#fbe6a2', '#e7c766'],
    'le CDI': ['tapis', '#cdd6ef', '#b3bfe0'],
    'le couloir': ['joints', '#e6e2d8', '#d3cdbe'],
    'le bureau': ['lamesH', '#f7d7ab', '#eec28a'],
    'le réfectoire': ['carrelage', '#fbe6a2', '#e7c766'],
    'la cuisine': ['joints', '#c9dfe8', '#e6f2f6'],
    'le gymnase': ['lamesH', '#f7d7ab', '#eec28a'],
    'les vestiaires': ['beton', '#d6dce4', '#b9c1cc']
};

/** Le `background` CSS d'un lieu, prêt à poser sur une case. */
export function fondDuLieu(nom) {
    const s = SOLS[nom];
    if (!s) return '#e9eef5';
    return MATIERES[s[0]](s[1], s[2]);
}

/* ── LES MEUBLES ────────────────────────────────────────────────────────────

   Un repère n'est pas une légende : les indices disent « à côté du banc », et
   l'élève doit pouvoir le MONTRER du doigt. */
const DESSINS_OBJETS = {
    'le marronnier':
        '<path d="M18 36 h4 v-9 h-4 z" fill="#7a5230"/>'
        + '<circle cx="13" cy="18" r="8" fill="#5f9e4a"/>'
        + '<circle cx="27" cy="18" r="8" fill="#5f9e4a"/>'
        + '<circle cx="20" cy="12" r="9" fill="#73b55b"/>',
    'le tableau':
        '<rect x="4" y="7" width="32" height="23" rx="2" fill="#2f5d4a" stroke="#1f3b2f"'
        + ' stroke-width="2"/>'
        + '<rect x="8" y="26" width="24" height="3" rx="1.5" fill="#c9a66b"/>'
        + '<path d="M11 13 h9 M11 18 h14" stroke="#eaf3ee" stroke-width="2"'
        + ' stroke-linecap="round"/>',
    'la photocopieuse':
        '<rect x="7" y="14" width="26" height="19" rx="3" fill="#dfe5ec" stroke="#6b7785"'
        + ' stroke-width="2"/>'
        + '<rect x="11" y="7" width="18" height="7" rx="2" fill="#aeb8c4"/>'
        + '<rect x="12" y="24" width="16" height="7" rx="1.5" fill="#fff" stroke="#6b7785"'
        + ' stroke-width="1.6"/>',
    "le distributeur d'eau":
        '<rect x="13" y="4" width="14" height="15" rx="3" fill="#60c6f0" stroke="#1d6b93"'
        + ' stroke-width="2"/>'
        + '<rect x="11" y="18" width="18" height="17" rx="3" fill="#eef4f8" stroke="#57707f"'
        + ' stroke-width="2"/>'
        + '<rect x="16" y="23" width="8" height="4" rx="1.5" fill="#57707f"/>',
    "l'horloge":
        '<circle cx="20" cy="20" r="15" fill="#fff" stroke="#3b2e22" stroke-width="2.6"/>'
        + '<path d="M20 11 V20 L26 24" stroke="#3b2e22" stroke-width="2.6" fill="none"'
        + ' stroke-linecap="round"/>',
    'le banc':
        '<rect x="4" y="14" width="32" height="5" rx="2" fill="#c08445"/>'
        + '<rect x="4" y="21" width="32" height="5" rx="2" fill="#a86d33"/>'
        + '<rect x="8" y="26" width="4" height="9" rx="1.5" fill="#5b4126"/>'
        + '<rect x="28" y="26" width="4" height="9" rx="1.5" fill="#5b4126"/>'
};

/** Le meuble d'un repère, dans un carré de la taille demandée. */
export function meubleSvg(nom, taille = 40) {
    const d = DESSINS_OBJETS[nom];
    if (!d) return '';
    return `<svg viewBox="0 0 40 40" width="${taille}" height="${taille}"`
        + ` role="img" aria-label="${nom}">${d}</svg>`;
}

/* ── LES VISAGES ────────────────────────────────────────────────────────────

   Huit prénoms, huit visages, et la table est FIXE : le même prénom porte
   toujours le même visage, dans la case comme sur la carte d'indice. Deux
   dessins différents pour la même personne, et l'indice ne dirait plus rien. */
export const VISAGES = {
    'Léa':    { peau: '#e0a97b', cheveux: '#1f1a16', coupe: 'boucles', haut: '#a855f7' },
    'Malik':  { peau: '#8d5524', cheveux: '#18120d', coupe: 'court',   haut: '#0ea5e9' },
    'Chloé':  { peau: '#f5d6b4', cheveux: '#d08a2c', coupe: 'queue',   haut: '#ef4444' },
    'Ismaël': { peau: '#c6854f', cheveux: '#241a12', coupe: 'court',   haut: '#3b82f6' },
    'Jade':   { peau: '#f0c9a0', cheveux: '#8b5a2b', coupe: 'long',    haut: '#10b981' },
    'Théo':   { peau: '#f3c89d', cheveux: '#c2762f', coupe: 'court',   haut: '#64748b' },
    'Anaïs':  { peau: '#e8bb92', cheveux: '#3f2a1b', coupe: 'long',    haut: '#ec4899' },
    'Noé':    { peau: '#f3c89d', cheveux: '#5c3a1e', coupe: 'court',   haut: '#f59e0b' }
};

/** Le fond pâle d'un portrait — il reprend la couleur du haut, en très clair. */
const PALE = {
    '#a855f7': '#f3e8ff', '#0ea5e9': '#e0f2fe', '#ef4444': '#fee2e2',
    '#3b82f6': '#dbeafe', '#10b981': '#d1fae5', '#64748b': '#e9eef3',
    '#ec4899': '#fce7f3', '#f59e0b': '#fef3c7'
};

function chevelure(v) {
    if (v.coupe === 'long') {
        return `<path d="M13 34 Q11 14 24 12 Q37 14 35 34 L31 34 Q33 19 24 18 Q15 19 17 34 Z"`
            + ` fill="${v.cheveux}"/>`;
    }
    if (v.coupe === 'queue') {
        return `<path d="M15 21 Q24 9 33 21 Q33 14 24 13 Q15 14 15 21 Z" fill="${v.cheveux}"/>`
            + `<circle cx="36" cy="25" r="5" fill="${v.cheveux}"/>`;
    }
    if (v.coupe === 'boucles') {
        return `<circle cx="18" cy="17" r="6" fill="${v.cheveux}"/>`
            + `<circle cx="24" cy="14" r="6.5" fill="${v.cheveux}"/>`
            + `<circle cx="30" cy="17" r="6" fill="${v.cheveux}"/>`;
    }
    return `<path d="M15 21 Q24 9 33 21 Q33 15 24 13 Q15 15 15 21 Z" fill="${v.cheveux}"/>`;
}

/** Le portrait d'un prénom, dans un carré de la taille demandée. */
export function portraitSvg(nom, taille = 48) {
    const v = VISAGES[nom];
    if (!v) return '';
    return `<svg viewBox="0 0 48 48" width="${taille}" height="${taille}"`
        + ` role="img" aria-label="${nom}">`
        + `<rect width="48" height="48" rx="13" fill="${PALE[v.haut] || '#eef2f7'}"/>`
        + `<path d="M9 48 Q9 35 24 35 Q39 35 39 48 Z" fill="${v.haut}"/>`
        + `<circle cx="24" cy="24" r="10.5" fill="${v.peau}"/>`
        + chevelure(v)
        + '<circle cx="20.5" cy="24.5" r="1.5" fill="#20160f"/>'
        + '<circle cx="27.5" cy="24.5" r="1.5" fill="#20160f"/>'
        + '<path d="M21 29.5 Q24 31.8 27 29.5" stroke="#20160f" stroke-width="1.5"'
        + ' fill="none" stroke-linecap="round"/>'
        + '</svg>';
}

/* ── LES SYMBOLES DES INDICES ───────────────────────────────────────────────

   Onze types d'indices, onze symboles. La liste est close et une épreuve le
   garde : un type d'indice sans dessin donnerait une carte muette, et l'élève
   croirait l'indice moins important que les autres. */
const CADRE = 'width="34" height="26" viewBox="0 0 34 26"';
const ENCRE = '#475569';

const SYMBOLES = {
    // LA LETTRE EST À CÔTÉ DE LA FLÈCHE, PAS SOUS ELLE. Écrite sous la pointe,
    // sa ligne de base tombait au ras du cadre et le N se voyait coupé en deux
    // — vu sur la capture, pas dans un compteur.
    nord: `<svg ${CADRE}><path d="M12 21 V6 M7 11 L12 6 L17 11" stroke="${ENCRE}"`
        + ' stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        + `<text x="25" y="18" text-anchor="middle" font-family="system-ui" font-size="11"`
        + ` font-weight="800" fill="${ENCRE}">N</text></svg>`,
    sud: `<svg ${CADRE}><path d="M12 5 V20 M7 15 L12 20 L17 15" stroke="${ENCRE}"`
        + ' stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        + `<text x="25" y="18" text-anchor="middle" font-family="system-ui" font-size="11"`
        + ` font-weight="800" fill="${ENCRE}">S</text></svg>`,
    est: `<svg ${CADRE}><path d="M4 10 H18 M14 5 L19 10 L14 15" stroke="${ENCRE}"`
        + ' stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        + `<text x="27" y="15" text-anchor="middle" font-family="system-ui" font-size="11"`
        + ` font-weight="800" fill="${ENCRE}">E</text></svg>`,
    ouest: `<svg ${CADRE}><path d="M19 10 H5 M9 5 L4 10 L9 15" stroke="${ENCRE}"`
        + ' stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        + `<text x="27" y="15" text-anchor="middle" font-family="system-ui" font-size="11"`
        + ` font-weight="800" fill="${ENCRE}">O</text></svg>`,
    // LES PAS COMPTÉS : le nombre posé sur une piste en pointillé. C'est le
    // symbole le plus employé du jeu, et celui qu'on lit le plus vite.
    pas: (n) => `<svg ${CADRE}><text x="17" y="15" text-anchor="middle"`
        + ' font-family="system-ui" font-size="14" font-weight="800" fill="#334155">'
        + `${n}</text><path d="M4 21 h26" stroke="#94a3b8" stroke-width="2"`
        + ' stroke-linecap="round" stroke-dasharray="2 4"/></svg>',
    cote: `<svg ${CADRE}><rect x="4" y="8" width="11" height="11" rx="2" fill="none"`
        + ` stroke="${ENCRE}" stroke-width="2"/><rect x="19" y="8" width="11" height="11"`
        + ` rx="2" fill="none" stroke="${ENCRE}" stroke-width="2"/></svg>`,
    pasCote: `<svg ${CADRE}><rect x="4" y="8" width="11" height="11" rx="2" fill="none"`
        + ' stroke="#94a3b8" stroke-width="2"/><rect x="19" y="8" width="11" height="11"'
        + ' rx="2" fill="none" stroke="#94a3b8" stroke-width="2"/>'
        + '<path d="M9 22 L25 5" stroke="#be123c" stroke-width="2.4"'
        + ' stroke-linecap="round"/></svg>',
    memeLieu: `<svg ${CADRE}><path d="M5 13 L17 4 L29 13 V22 H5 Z" fill="none"`
        + ` stroke="${ENCRE}" stroke-width="2" stroke-linejoin="round"/>`
        + `<path d="M11 17 h12" stroke="${ENCRE}" stroke-width="2" stroke-linecap="round"/>`
        + `<path d="M11 21 h12" stroke="${ENCRE}" stroke-width="2"`
        + ' stroke-linecap="round"/></svg>',
    pasMemeLieu: `<svg ${CADRE}><path d="M5 13 L17 4 L29 13 V22 H5 Z" fill="none"`
        + ' stroke="#94a3b8" stroke-width="2" stroke-linejoin="round"/>'
        + '<path d="M8 22 L26 5" stroke="#be123c" stroke-width="2.4"'
        + ' stroke-linecap="round"/></svg>',
    bord: `<svg ${CADRE}><rect x="5" y="4" width="24" height="18" rx="2" fill="none"`
        + ' stroke="#cbd5e1" stroke-width="2"/>'
        + `<path d="M5 4 H29 M5 22 H29 M5 4 V22 M29 4 V22" stroke="${ENCRE}"`
        + ' stroke-width="3" stroke-linecap="round" stroke-dasharray="5 7"/></svg>',
    pasBord: `<svg ${CADRE}><rect x="5" y="4" width="24" height="18" rx="2" fill="none"`
        + ' stroke="#cbd5e1" stroke-width="2"/>'
        + `<rect x="12" y="9" width="10" height="8" rx="1.5" fill="${ENCRE}"/></svg>`,
    plusPres: `<svg ${CADRE}><text x="17" y="18" text-anchor="middle"`
        + ` font-family="system-ui" font-size="16" font-weight="800" fill="${ENCRE}">`
        + '&lt;</text></svg>',
    versLieu: `<svg ${CADRE}><path d="M5 13 H25 M21 8 L26 13 L21 18" stroke="${ENCRE}"`
        + ' stroke-width="2.2" fill="none" stroke-linecap="round"'
        + ' stroke-linejoin="round"/></svg>',
    pasLieu: `<svg ${CADRE}><path d="M5 13 H25" stroke="#94a3b8" stroke-width="2.2"`
        + ' stroke-linecap="round"/><path d="M9 21 L25 5" stroke="#be123c"'
        + ' stroke-width="2.4" stroke-linecap="round"/></svg>'
};



/** L'étiquette d'un lieu, telle qu'elle se pose sur le plan et sur une carte. */
export function etiquetteLieu(nom) {
    return `<span class="eq-tag">${nom}</span>`;
}

/**
 * LA VIGNETTE D'UN INDICE : les visages, l'objet, le symbole — dans l'ordre
 * où la phrase les nomme.
 *
 * Elle rend une suite de morceaux `{ quoi, valeur }` et non du HTML tout fait :
 * l'écran décide des tailles, l'épreuve lit les morceaux, et la fiche imprimée
 * pourra s'en servir un jour sans que rien ne change ici.
 *
 * `quoi` vaut 'personne', 'meuble', 'lieu' ou 'symbole'.
 *
 * LA SCÈNE EST NÉCESSAIRE, et ce n'est pas un oubli de signature : un indice
 * porte la LETTRE du lieu (`lieu: 'H'`), jamais son nom — c'est la scène qui
 * tient la table. Écrite sans elle, la carte affichait « H » à l'élève.
 */
export function morceauxDeLIndice(indice, noms, scene) {
    const P = (k) => ({ quoi: 'personne', valeur: noms[k] });
    const S = (cle) => ({ quoi: 'symbole', valeur: cle });
    const t = indice.type;
    // ON LIT LA VIGNETTE COMME LA PHRASE : « Noé est au sud de Léa » met Léa à
    // gauche, la flèche vers le sud, puis Noé. L'ordre inverse se lirait
    // « Léa est au sud de Noé », c'est-à-dire le contraire.
    if (t === 'direction') return [P(indice.b), S(indice.dir), P(indice.a)];
    if (t === 'voisin') return [P(indice.a), S('cote'), P(indice.b)];
    if (t === 'pasVoisin') return [P(indice.a), S('pasCote'), P(indice.b)];
    if (t === 'ecart') return [P(indice.a), { quoi: 'symbole', valeur: 'pas', n: indice.d },
        P(indice.b)];
    if (t === 'memeLieu') return [P(indice.a), S('memeLieu'), P(indice.b)];
    if (t === 'pasMemeLieu') return [P(indice.a), S('pasMemeLieu'), P(indice.b)];
    const nomDuLieu = (l) => (scene && scene.lieux && scene.lieux[l]) || '';
    if (t === 'dansLieu') {
        return [P(indice.a), S('versLieu'), { quoi: 'lieu', valeur: nomDuLieu(indice.lieu) }];
    }
    if (t === 'pasDansLieu') {
        return [P(indice.a), S('pasLieu'), { quoi: 'lieu', valeur: nomDuLieu(indice.lieu) }];
    }
    if (t === 'bord') return [P(indice.a), S(indice.oui ? 'bord' : 'pasBord')];
    if (t === 'pres') return [P(indice.a), S('cote'), { quoi: 'meuble', valeur: indice.nom }];
    if (t === 'plusPres') {
        return [P(indice.a), S('plusPres'), P(indice.b), S('versLieu'),
            { quoi: 'meuble', valeur: indice.nom }];
    }
    return [];
}

/** Le symbole d'un morceau, en SVG. */
export function symboleSvg(morceau) {
    const s = SYMBOLES[morceau.valeur];
    if (typeof s === 'function') return s(morceau.n);
    return s || '';
}

/** Les types d'indices qui savent se dessiner — l'épreuve compare à l'autre liste. */
export const TYPES_DESSINES = ['direction', 'voisin', 'pasVoisin', 'ecart', 'memeLieu',
    'pasMemeLieu', 'dansLieu', 'pasDansLieu', 'bord', 'pres', 'plusPres'];

/**
 * LES VOISINAGES DE PIÈCES D'UNE SCÈNE, pour l'épreuve qui garde que deux
 * pièces mitoyennes ne portent jamais le même sol.
 *
 * Deux carrelages jaunes qui se touchent, c'est une seule pièce à l'œil — et
 * l'élève compte alors les cases d'une pièce qui n'existe pas.
 */
export function piecesMitoyennes(scene) {
    const paires = new Set();
    const n = scene.taille;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const ici = scene.plan[r][c];
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
            const r2 = r + dr, c2 = c + dc;
            if (r2 >= n || c2 >= n) continue;
            const la = scene.plan[r2][c2];
            if (la !== ici) paires.add([ici, la].sort().join('|'));
        }
    }
    return [...paires].map(x => x.split('|'));
}

/** Tous les lieux nommés par le catalogue des scènes. */
export function tousLesLieux() {
    const out = new Set();
    for (const s of SCENES) for (const nom of Object.values(s.lieux)) out.add(nom);
    return [...out];
}

/** Tous les repères nommés par le catalogue des scènes. */
export function tousLesReperes() {
    const out = new Set();
    for (const s of SCENES) for (const r of s.reperes) out.add(r.nom);
    return [...out];
}
