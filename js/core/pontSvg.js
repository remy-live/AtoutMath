// LE DÉCOR DU PONT, ET LES MARCHEURS — dessinés une fois, employés partout.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant trois maquettes, 4 novembre : « le A ». Le décor de nuit avec sa
// lanterne, et les randonneurs — manteau, écharpe, bottes.
//
// ── POURQUOI LE DESSIN VIT DANS LE NOYAU ───────────────────────────────────
//
// L'écran le montre, la feuille imprimée le montre aussi, et le jour où les
// deux divergeront ce sera sur un détail que personne ne verra avant
// l'impression. On l'écrit donc une fois, en SVG pur — ni DOM, ni CSS calculé,
// rien qu'une chaîne —, et les deux rendus la posent telle quelle.
//
// ── CE QUI EST DÉLIBÉRÉ DANS LE DESSIN, ET QUI SE DISCUTE ──────────────────
//
//   · LA VITESSE SE LIT SUR LE PERSONNAGE. Le plus lent a une canne, le plus
//     rapide est le plus petit. Un élève qui doit retenir qui est lent le VOIT,
//     au lieu de relire quatre nombres à chaque coup.
//   · DES YEUX, PAS DE BOUCHE. Une bouche donne une humeur ; quand l'élève se
//     trompe, le personnage aurait alors l'air déçu. Il ne doit rien avoir
//     l'air — ce n'est pas lui qu'on juge.
//   · QUATRE TEINTES DE PEAU. Une classe n'est pas monochrome.
//   · ET LE LISERÉ CHAUD DU CÔTÉ DE LA LAMPE. C'est lui qui rattache le
//     marcheur à la scène au lieu de l'y coller, et c'est lui qui dit, sans un
//     mot, qui est dans la lumière — donc qui peut partir.

/** Les quatre habits, dans l'ordre où les marcheurs sont nommés. */
export const HABITS = [
    { corps: '#34d399', fonce: '#059669', peau: '#f7d9b8', cheveux: '#3f2a1d', coiffe: 'couettes' },
    { corps: '#60a5fa', fonce: '#2563eb', peau: '#e8bb93', cheveux: '#1f2937', coiffe: 'bonnet' },
    { corps: '#f472b6', fonce: '#db2777', peau: '#8d5524', cheveux: '#241a12', coiffe: 'chignon' },
    { corps: '#fbbf24', fonce: '#d97706', peau: '#f2cba5', cheveux: '#cbd5e1', coiffe: 'casquette' },
    { corps: '#a78bfa', fonce: '#7c3aed', peau: '#c68642', cheveux: '#111827', coiffe: 'chignon' },
    { corps: '#f87171', fonce: '#dc2626', peau: '#ffdbac', cheveux: '#92400e', coiffe: 'bonnet' }
];

/**
 * L'HABIT D'UN MARCHEUR, ET CE QU'IL PORTE.
 *
 * `rang` est sa place dans la liste ; `lent` dit s'il est le plus lent de tous,
 * et c'est lui qui reçoit la canne. On ne décide pas « le quatrième a une
 * canne » : on décide « le plus lent en a une », sinon le dessin mentirait dès
 * que les vitesses sont tirées au sort.
 */
export function habitDe(rang, { lent = false, sac = false } = {}) {
    return { ...HABITS[rang % HABITS.length], porte: lent ? 'canne' : (sac ? 'sac' : null) };
}

/**
 * UN MARCHEUR, EN SVG. Hauteur utile : 175, les pieds à y = 0.
 *
 * @param {object} p     ce que rend `habitDe`
 * @param {object} [o]
 * @param {boolean} [o.lumiere]  éclairé par la lampe, donc liseré chaud à droite
 */
export function marcheurSvg(p, o = {}) {
    const s = [];
    s.push(`<ellipse cx="0" cy="4" rx="34" ry="7" fill="#000" opacity=".2"/>`);
    s.push(`<rect x="-19" y="-44" width="15" height="38" rx="7" fill="${p.fonce}"/>`);
    s.push(`<rect x="4" y="-44" width="15" height="38" rx="7" fill="${p.fonce}"/>`);
    s.push(`<path d="M-22 -8 h20 a4 4 0 0 1 0 8 h-24 a4 4 0 0 1 0 -8 z" fill="#3f3f46"/>`);
    s.push(`<path d="M1 -8 h20 a4 4 0 0 1 0 8 h-24 a4 4 0 0 1 0 -8 z" fill="#3f3f46"/>`);
    s.push(`<path d="M-21 -112 h42 l11 68 a6 6 0 0 1 -6 7 h-52 a6 6 0 0 1 -6 -7 z" fill="${p.corps}"/>`);
    s.push(`<path d="M3 -112 h18 l11 68 a6 6 0 0 1 -6 7 h-23 z" fill="${p.fonce}" opacity=".35"/>`);
    // LE BRAS SORT DU MANTEAU, il ne se pose pas dessus : une manche posée sur
    // le corps se lit comme une rayure.
    s.push(`<path d="M19 -110 q14 22 11 44 a8 8 0 0 1 -15 0 q3 -22 -10 -41 z" fill="${p.fonce}"/>`);
    s.push(`<circle cx="23" cy="-62" r="8.5" fill="${p.peau}"/>`);
    s.push(`<path d="M-22 -117 h44 a6 6 0 0 1 0 13 h-44 a6 6 0 0 1 0 -13 z" fill="#ef4444"/>`);
    s.push(`<path d="M-16 -106 h13 l4 30 a6 6 0 0 1 -12 1 z" fill="#dc2626"/>`);
    s.push(`<circle cx="0" cy="-136" r="20" fill="${p.peau}"/>`);
    if (p.coiffe === 'bonnet') {
        s.push(`<path d="M-21 -142 a21 21 0 0 1 42 0 z" fill="#ef4444"/>`);
        s.push(`<rect x="-22" y="-146" width="44" height="9" rx="4.5" fill="#f87171"/>`);
        s.push(`<circle cx="0" cy="-166" r="7" fill="#fecaca"/>`);
    } else if (p.coiffe === 'casquette') {
        s.push(`<path d="M-21 -142 a21 21 0 0 1 42 0 z" fill="${p.cheveux}"/>`);
        s.push(`<path d="M-22 -142 h50 a5 5 0 0 1 0 7 h-50 z" fill="${p.cheveux}"/>`);
    } else if (p.coiffe === 'couettes') {
        s.push(`<path d="M-20 -150 a21 23 0 0 1 40 0 a21 14 0 0 0 -40 0 z" fill="${p.cheveux}"/>`);
        s.push(`<circle cx="-26" cy="-139" r="9" fill="${p.cheveux}"/>`);
        s.push(`<circle cx="26" cy="-139" r="9" fill="${p.cheveux}"/>`);
    } else {
        s.push(`<path d="M-20 -150 a21 23 0 0 1 40 0 a21 14 0 0 0 -40 0 z" fill="${p.cheveux}"/>`);
        s.push(`<circle cx="18" cy="-158" r="10" fill="${p.cheveux}"/>`);
    }
    s.push(`<circle cx="-7" cy="-134" r="2.6" fill="#1f2937"/>`);
    s.push(`<circle cx="8" cy="-134" r="2.6" fill="#1f2937"/>`);
    if (p.porte === 'sac') {
        s.push(`<rect x="-38" y="-108" width="20" height="30" rx="7" fill="${p.fonce}"/>`);
    }
    if (p.porte === 'canne') {
        s.push(`<path d="M30 -60 l6 58" stroke="#8b5e34" stroke-width="5" stroke-linecap="round" fill="none"/>`);
        s.push(`<path d="M30 -60 a9 9 0 0 1 14 -4" stroke="#8b5e34" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    }
    if (o.lumiere) {
        s.push(`<path d="M21 -112 l11 68 a6 6 0 0 1 -6 7 h-5 z" fill="#fde68a" opacity=".55"/>`);
        s.push(`<path d="M14 -151 a20 20 0 0 1 7 15 a20 20 0 0 1 -7 15 a20 20 0 0 0 0 -30 z"
                 fill="#fde68a" opacity=".5"/>`);
    }
    return s.join('');
}

/** La lampe, posée à l'origine. Son halo est dessiné à part : il passe DERRIÈRE
 *  les marcheurs, sinon il les voile. */
export function lampeSvg() {
    return `<path d="M-7 -14 a7 7 0 0 1 14 0" fill="none" stroke="#fde047" stroke-width="2.4"/>
        <rect x="-9" y="-13" width="18" height="23" rx="5" fill="#fde047"/>
        <rect x="-9" y="-13" width="18" height="23" rx="5" fill="#fffbeb" opacity=".5"/>`;
}

/** Les étoiles, tirées une fois pour toutes depuis la graine de l'item : elles
 *  ne doivent pas sauter à chaque repeint. */
export function etoilesSvg(rng, combien = 120) {
    const out = [];
    for (let i = 0; i < combien; i++) {
        out.push(`<circle cx="${rng.int(0, 1100)}" cy="${rng.int(0, 300)}"
            r="${(rng.int(5, 16) / 10).toFixed(1)}" fill="#dbeafe"
            opacity="${(rng.int(20, 90) / 100).toFixed(2)}"/>`);
    }
    return out.join('');
}

/**
 * LE DÉCOR : le ciel, la lune, les montagnes, le gouffre et le pont de corde.
 *
 * LES SUSPENTES SE CALCULENT SUR LES DEUX CÂBLES, elles ne se posent pas à la
 * main : écrites à des hauteurs fixes, elles dépassaient du câble du haut comme
 * des piquets. Mesuré sur la maquette.
 *
 * @param {string} [etoiles] ce que rend `etoilesSvg`
 */
export function decorDuPont(etoiles = '') {
    const yHaut = (t) => (1 - t) * (1 - t) * 386 + 2 * t * (1 - t) * 342 + t * t * 386;
    const yBas = (t) => (1 - t) * (1 - t) * 392 + 2 * t * (1 - t) * 418 + t * t * 392;
    const xDe = (t) => 286 + 528 * t;
    const susp = [], planches = [];
    for (let k = 1; k <= 11; k++) {
        const t = k / 12, x = xDe(t).toFixed(1);
        susp.push(`<line x1="${x}" y1="${(yHaut(t) + 1).toFixed(1)}" x2="${x}" y2="${yBas(t).toFixed(1)}"/>`);
        planches.push(`<line x1="${x}" y1="${yBas(t).toFixed(1)}" x2="${x}" y2="${(yBas(t) + 10).toFixed(1)}"/>`);
    }
    return `
    <defs>
        <linearGradient id="pl-ciel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#050a1e"/><stop offset=".55" stop-color="#0d1434"/>
            <stop offset="1" stop-color="#1a2250"/></linearGradient>
        <linearGradient id="pl-roche" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#434e86"/><stop offset=".45" stop-color="#232b58"/>
            <stop offset="1" stop-color="#0d1232"/></linearGradient>
        <linearGradient id="pl-gouffre" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#070b1c"/><stop offset="1" stop-color="#020309"/></linearGradient>
        <radialGradient id="pl-halo">
            <stop offset="0" stop-color="#fde047" stop-opacity=".40"/>
            <stop offset=".55" stop-color="#fbbf24" stop-opacity=".12"/>
            <stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>
        <radialGradient id="pl-lune">
            <stop offset="0" stop-color="#fef9c3" stop-opacity=".30"/>
            <stop offset="1" stop-color="#fef9c3" stop-opacity="0"/></radialGradient>
        <filter id="pl-flou"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <rect width="1100" height="560" fill="url(#pl-ciel)"/>
    <g>${etoiles}</g>
    <circle cx="880" cy="118" r="90" fill="url(#pl-lune)"/>
    <circle cx="880" cy="118" r="27" fill="#fef9c3"/>
    <circle cx="890" cy="110" r="22" fill="#0d1434" opacity=".55"/>
    <path d="M-20 392 L140 292 L250 352 L360 276 L470 392 Z" fill="#161d44" opacity=".85"/>
    <path d="M620 392 L740 300 L840 356 L960 288 L1120 392 Z" fill="#161d44" opacity=".85"/>
    <path d="M-20 392 L90 330 L200 392 Z" fill="#1c2452" opacity=".8"/>
    <path d="M880 392 L990 326 L1120 392 Z" fill="#1c2452" opacity=".8"/>
    <rect x="250" y="388" width="600" height="172" fill="url(#pl-gouffre)"/>
    <rect x="330" y="524" width="440" height="9" rx="4.5" fill="#7dd3fc" opacity=".22"/>
    <rect x="330" y="524" width="440" height="9" rx="4.5" fill="#7dd3fc" opacity=".18" filter="url(#pl-flou)"/>
    <path d="M0 560 L0 400 L52 394 L108 398 L168 390 L232 396 L286 392
             L300 404 L292 452 L276 560 Z" fill="url(#pl-roche)"/>
    <path d="M1100 560 L1100 400 L1046 395 L988 399 L926 391 L866 397 L812 392
             L800 404 L810 452 L826 560 Z" fill="url(#pl-roche)"/>
    <path d="M0 400 L52 394 L108 398 L168 390 L232 396 L286 392 L300 404"
          fill="none" stroke="#97a3e4" stroke-width="4" stroke-linejoin="round"/>
    <path d="M1100 400 L1046 395 L988 399 L926 391 L866 397 L812 392 L800 404"
          fill="none" stroke="#97a3e4" stroke-width="4" stroke-linejoin="round"/>
    <g stroke="#6b5537" fill="none" stroke-linecap="round">
        <path d="M286 386 Q550 342 814 386" stroke-width="3.5"/>
        <path d="M286 392 Q550 418 814 392" stroke-width="4.5"/>
    </g>
    <g stroke="#6b5537" stroke-width="2" opacity=".85">${susp.join('')}</g>
    <path d="M286 392 Q550 418 814 392 L814 402 Q550 428 286 402 Z" fill="#4e3d2a"/>
    <g stroke="#2f2518" stroke-width="1.6" opacity=".7">${planches.join('')}</g>`;
}

/**
 * LA HAUTEUR DU TABLIER à une abscisse donnée — pour y poser quelqu'un.
 *
 * Le pont PLIE : poser un marcheur à une hauteur fixe le ferait flotter au
 * milieu et s'enfoncer aux extrémités. On lui demande donc où est le plancher.
 */
export function solDuPont(x) {
    const t = Math.max(0, Math.min(1, (x - 286) / 528));
    return (1 - t) * (1 - t) * 392 + 2 * t * (1 - t) * 418 + t * t * 392;
}

/** Le sol des deux rives, en coordonnées du décor. */
export const SOL_RIVE = 398;
