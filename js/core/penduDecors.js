// LES QUATRE DÉCORS DU PENDU, en SVG, et ils ne vivent QU'À L'ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre : « les dessins pour le pendu ne sont vraiment pas beaux ».
//
// ── LA CAUSE ÉTAIT ÉCRITE EN TÊTE DE CE FICHIER ─────────────────────────────
//
// Les trois décors d'avant étaient au trait noir — `currentColor`, 3,5
// d'épaisseur, bouts ronds — parce que la consigne qu'on s'était donnée disait
// qu'ils devaient être « lisibles en noir, puisqu'ils s'impriment aussi ».
//
// OR ILS NE S'IMPRIMENT PAS. La fiche du Pendu laisse un CADRE VIDE et c'est
// l'élève qui dessine : « Rien ne remplace le geste ». Vérifié, pas supposé —
// `dessinerPenduPdf` trace un rectangle et rien dedans, et `decorSvg` n'était
// même plus appelé par la feuille. La contrainte qui a appauvri les trois
// dessins ne correspondait à rien.
//
// Un décor qui ne vit qu'à l'écran peut donc être EN COULEUR, et ses couleurs
// sont posées en dur : un gâteau est jaune et une flamme est orange dans les
// deux thèmes, comme la rivière de La Traversée reste bleue en mode sombre.
//
// ── CE QUE LES QUATRE DOIVENT FAIRE ─────────────────────────────────────────
//
//   · SIX ÉTAPES, exactement : c'est le compte classique d'erreurs.
//   · DEUX ÉTATS VOISINS DIFFÈRENT EN DEUX ENDROITS. C'est la correction du
//     défaut annoncé à Rémy sur la maquette de la fusée : six voyants qui
//     s'éteignent au-dessus d'une fusée qui ne bouge pas, cela donne cinq
//     dessins presque identiques. Sa flamme décroît donc aussi.
//   · TENIR DANS LA VUE, qui est un portrait de 100 × 120. Une épreuve le
//     mesure : un dessin qui déborde est rogné, et cela ne se voit que sur une
//     capture d'écran.
//
// LE SENS DE LECTURE DIFFÈRE, et c'est voulu : le gâteau se COMPTE (il reste
// quatre bougies), le bonhomme se DÉFAIT (on lui enlève un morceau), la fusée
// fait un COMPTE À REBOURS, la potence se CONSTRUIT. Quatre façons de dire
// « il te reste moins de place », à des élèves qui ne les lisent pas de la
// même façon.
//
// ── POURQUOI LA POTENCE RESTE ───────────────────────────────────────────────
//
// « Pendu » dit une potence et un pendu. C'est le nom du jeu, tout le monde le
// connaît sous ce nom, et le refuser d'autorité serait décider à la place du
// professeur. Elle est donc redessinée avec le même soin que les autres — du
// bois, une corde — sans qu'on cherche à la rendre plaisante.

/** La vue commune : un portrait, comme les trois maquettes soumises à Rémy. */
export const VUE = { l: 100, h: 120 };

/** Le nombre d'erreurs que les quatre décors racontent. */
export const ETAPES = 6;

/**
 * LES DEUX COULEURS QUI SE COMPTENT : une flamme vive, un voyant allumé.
 *
 * Elles sont exportées parce qu'une épreuve compte ce qui reste allumé — et
 * qu'une épreuve qui RECOPIERAIT le code hexadécimal mesurerait sa propre
 * copie. Le jour où l'on change la teinte d'une flamme, rien ne doit rougir :
 * ce n'est pas ce que la garde surveille.
 */
export const VIF = { flamme: '#fbbf24', voyant: '#22c55e' };

/**
 * LA NEIGE : un blanc franc, cerné de BLEU-GRIS et non de gris clair.
 *
 * Vu sur la planche des décors, aux quatrième et cinquième états — là où il ne
 * reste qu'une boule : un blanc cerné de #cbd5e1 sur le panneau clair du
 * décor, c'est une forme qu'on devine au lieu de la voir.
 */
const NEIGE = 'fill="#ffffff" stroke="#9fb8cc" stroke-width="2.3"';

/**
 * LES PATHS N'EMPLOIENT QUE DES COMMANDES ABSOLUES — M, L, Q, Z.
 *
 * Ce n'est pas un goût : c'est ce qui rend l'épreuve « tout tient dans la vue »
 * ÉCRIVABLE. Avec des commandes relatives, il faudrait rejouer le tracé pour
 * connaître la position d'un point, et l'épreuve deviendrait un interpréteur
 * SVG — c'est-à-dire du code qu'on ne relit plus. Avec des commandes absolues,
 * tous les nombres d'un `d` sont des coordonnées, et l'épreuve tient en dix
 * lignes. Une seconde épreuve garde la règle elle-même.
 */

/* ── A · LE GÂTEAU ET SES SIX BOUGIES ────────────────────────────────────────

   UNE BOUGIE S'ÉTEINT À CHAQUE ERREUR. C'est le seul décor où le nombre
   d'essais restants se LIT au lieu de se deviner — exactement ce que faisait
   le compteur chiffré qu'on refuse d'afficher, en moins austère.

   La bougie éteinte ne disparaît pas : elle reste, avec son filet de fumée.
   On garde ainsi les six emplacements sous les yeux, donc on lit « il m'en
   reste deux » et non « c'est moins qu'avant ». */
function gateau(n) {
    const restantes = ETAPES - n;
    const p = [];

    for (let i = 0; i < ETAPES; i++) {
        const x = 17 + i * 13.2;
        // Rose et jaune en alternance : six bougies de la même couleur se
        // comptent moins vite que six bougies qui alternent.
        p.push(`<rect x="${x - 2.6}" y="34" width="5.2" height="28" rx="2.6"`
            + ` fill="${i % 2 ? '#f472b6' : '#fcd34d'}" />`);
        p.push(`<rect x="${x - 2.6}" y="34" width="5.2" height="8" rx="2.6"`
            + ' fill="#ffffff" opacity=".5" />');
        p.push(`<line x1="${x}" y1="34" x2="${x}" y2="29" stroke="#78350f"`
            + ' stroke-width="1.4" stroke-linecap="round" />');
        if (i < restantes) {
            p.push(`<ellipse cx="${x}" cy="23" rx="3.3" ry="5.2" fill="${VIF.flamme}" />`);
            p.push(`<ellipse cx="${x}" cy="24.4" rx="1.5" ry="2.7" fill="#fef3c7" />`);
        } else {
            p.push(`<path d="M${x} 28 Q${x + 3.4} 24 ${x} 20" stroke="#cbd5e1"`
                + ' stroke-width="1.7" fill="none" stroke-linecap="round" />');
        }
    }

    // Le gâteau : le glaçage qui coule, la génoise, l'assiette.
    p.push('<rect x="10" y="62" width="80" height="20" rx="6" fill="#fde68a" />');
    p.push('<path d="M10 66 Q18 73 26 66 Q34 73 42 66 Q50 73 58 66 Q66 73 74 66'
        + ' Q82 73 90 66 L90 62 L10 62 Z" fill="#ffffff" opacity=".75" />');
    p.push('<rect x="10" y="80" width="80" height="24" rx="6" fill="#d97706" />');
    p.push('<rect x="10" y="80" width="80" height="5" fill="#b45309" opacity=".5" />');
    p.push('<rect x="5" y="102" width="90" height="10" rx="5" fill="#94a3b8" />');
    return p.join('');
}

/* ── B · LE BONHOMME DE NEIGE QUI FOND ───────────────────────────────────────

   CHAQUE ERREUR LUI ENLÈVE UN MORCEAU, et la flaque grandit dessous. C'est le
   seul décor qui commence PLEIN : on voit ce qu'on a encore, pas ce qu'on a
   perdu — et c'est aussi la mécanique du pendu classique, en gentil.

   Les six départs, dans l'ordre : les bras, le chapeau, la carotte, la tête,
   la boule du milieu, la boule du bas. LA CAROTTE PART AVANT LA TÊTE et les
   yeux partent AVEC elle : un visage à deux yeux sans nez se lit encore comme
   un visage ; un nez tout seul au milieu d'une boule, non. */
function bonhomme(n) {
    const p = [];
    // Il s'affaisse : chaque boule descend un peu quand celles du bas fondent.
    const fondu = n * 3.2;

    if (n >= ETAPES) {
        // Tout fondu : une flaque, et la carotte qui flotte dessus.
        p.push('<ellipse cx="50" cy="104" rx="34" ry="8.5" fill="#bae6fd" />');
        p.push('<ellipse cx="50" cy="101.5" rx="26" ry="5" fill="#e0f2fe" />');
        p.push('<path d="M58 98 L70 101 L58 104 Z" fill="#f97316" />');
        return p.join('');
    }

    // La flaque, dès la première fonte — elle s'élargit à chaque erreur.
    const large = Math.min(44, 20 + n * 5);
    p.push(`<ellipse cx="50" cy="110" rx="${large}" ry="${3.5 + n * 0.9}"`
        + ' fill="#bae6fd" />');

    p.push(`<circle cx="50" cy="92" r="${21 - n * 1.4}" ${NEIGE} />`);
    if (n < 5) {
        p.push(`<circle cx="50" cy="${66 + fondu}" r="${15 - n * 0.9}" ${NEIGE} />`);
    }
    if (n < 4) {
        p.push(`<circle cx="50" cy="${43 + fondu}" r="${11.5 - n * 0.5}" ${NEIGE} />`);
        p.push(`<circle cx="46" cy="${39.5 + fondu}" r="1.9" fill="#1e293b" />`);
        p.push(`<circle cx="54" cy="${39.5 + fondu}" r="1.9" fill="#1e293b" />`);
        if (n < 3) {
            p.push(`<path d="M59 ${43 + fondu} L71 ${46 + fondu} L59 ${49 + fondu} Z"`
                + ' fill="#f97316" />');
        }
        if (n < 2) {
            p.push(`<rect x="35" y="${29.5 + fondu}" width="30" height="4.6" rx="2.2"`
                + ' fill="#334155" />');
            p.push(`<rect x="42" y="${17 + fondu}" width="16" height="13" rx="2"`
                + ' fill="#334155" />');
            p.push(`<rect x="42" y="${27 + fondu}" width="16" height="3"`
                + ' fill="#0ea5e9" opacity=".7" />');
        }
    }
    if (n < 1) {
        p.push('<line x1="32" y1="64" x2="14" y2="52" stroke="#92400e"'
            + ' stroke-width="3.2" stroke-linecap="round" />');
        p.push('<line x1="68" y1="64" x2="86" y2="52" stroke="#92400e"'
            + ' stroke-width="3.2" stroke-linecap="round" />');
    }
    return p.join('');
}

/* ── C · LA FUSÉE ET SON COMPTE À REBOURS ────────────────────────────────────

   SIX VOYANTS S'ÉTEIGNENT, puis la fusée reste au sol.

   LA FLAMME DÉCROÎT AUSSI, et ce n'est pas un ornement : c'est la correction
   du défaut qu'on a dit à Rémy en lui montrant la maquette — avec les seuls
   voyants, la fusée ne changeait pas d'une erreur à l'autre, et l'on retombait
   sur le travers du décor précédent (cinq dessins indiscernables sur sept).
   Deux états voisins diffèrent maintenant en DEUX endroits : un voyant de
   moins, et une flamme plus courte. */
function fusee(n) {
    const p = [];

    p.push('<rect x="12" y="108" width="76" height="7" rx="3.5" fill="#94a3b8" />');

    if (n < ETAPES) {
        // LA FLAMME EST GRANDE AU DÉPART et ne meurt qu'au dernier essai : vue
        // sur la planche, celle du premier jet était un éclat de trois pixels
        // sous la fusée — elle existait dans le code et pas à l'écran.
        const h = 16 - n * 2.8;
        p.push(`<path d="M39 97 Q50 ${(97 + h + 4).toFixed(1)} 61 97 Z" fill="#fb923c" />`);
        p.push(`<path d="M45.5 97 Q50 ${(97 + h + 1).toFixed(1)} 54.5 97 Z" fill="#fde047" />`);

        p.push('<path d="M50 10 L63 36 L63 92 L37 92 L37 36 Z" fill="#e2e8f0"'
            + ' stroke="#64748b" stroke-width="2" stroke-linejoin="round" />');
        p.push('<path d="M37 70 L24 92 L37 92 Z" fill="#ef4444" />');
        p.push('<path d="M63 70 L76 92 L63 92 Z" fill="#ef4444" />');
        p.push('<path d="M50 10 L63 36 L37 36 Z" fill="#ef4444" />');
        p.push('<circle cx="50" cy="54" r="7" fill="#38bdf8" stroke="#0369a1"'
            + ' stroke-width="2" />');
        p.push('<rect x="37" y="92" width="26" height="5" fill="#64748b" />');
    } else {
        // Restée au sol : il n'en reste qu'un tas, et un peu de fumée.
        p.push('<path d="M37 92 L63 92 L58 108 L42 108 Z" fill="#94a3b8" />');
        p.push('<path d="M30 84 Q42 68 54 84" stroke="#cbd5e1" stroke-width="3"'
            + ' fill="none" stroke-linecap="round" />');
    }

    for (let i = 0; i < ETAPES; i++) {
        const cy = 20 + i * 13;
        const allume = i < ETAPES - n;
        p.push(`<circle cx="90" cy="${cy}" r="4.4" fill="${allume ? VIF.voyant : '#e2e8f0'}"`
            + ' stroke="#94a3b8" stroke-width="1.2" />');
    }
    return p.join('');
}

/* ── D · LA POTENCE ──────────────────────────────────────────────────────────

   Les six étapes : le mât, la poutre, la corde, la tête, le corps, les bras.
   On ne dessine PAS les jambes : à six erreurs le jeu est fini, et un bonhomme
   à moitié dessiné dit la défaite aussi bien qu'un bonhomme complet — sans
   insister.

   LE SOCLE EST LÀ DÈS LE DÉPART. La toute première version commençait sur un
   cadre VIDE, et regardée sur la planche des décors, elle ressemblait à un
   écran qui n'a pas fini de charger. Un jeu qui s'ouvre sur du vide n'invite
   personne. */
function potence(n) {
    const p = [];

    p.push('<rect x="10" y="102" width="70" height="9" rx="2.5" fill="#a16207" />');
    p.push('<rect x="10" y="102" width="70" height="3" fill="#ca8a04" opacity=".7" />');
    // L'OMBRE SOUS LE MADRIER : sans elle, le premier état n'est qu'une barre
    // brune au milieu du vide, et un jeu qui s'ouvre sur du vide n'invite
    // personne. C'est elle qui fait de la planche un SOL.
    p.push('<rect x="6" y="111" width="78" height="3" rx="1.5" fill="#94a3b8"'
        + ' opacity=".45" />');

    if (n >= 1) {
        p.push('<rect x="30" y="14" width="8" height="90" rx="2" fill="#a16207" />');
        p.push('<line x1="34" y1="20" x2="34" y2="98" stroke="#854d0e"'
            + ' stroke-width="1" opacity=".55" />');
    }
    if (n >= 2) {
        p.push('<rect x="30" y="14" width="46" height="8" rx="2" fill="#a16207" />');
        p.push('<line x1="40" y1="18" x2="74" y2="18" stroke="#854d0e"'
            + ' stroke-width="1" opacity=".55" />');
    }
    if (n >= 3) {
        p.push('<line x1="70" y1="22" x2="70" y2="36" stroke="#d4a373"'
            + ' stroke-width="3.4" stroke-linecap="round" />');
    }
    if (n >= 4) {
        p.push('<circle cx="70" cy="44" r="8.5" fill="#fef3c7" stroke="#334155"'
            + ' stroke-width="2.4" />');
    }
    if (n >= 5) {
        p.push('<line x1="70" y1="52.5" x2="70" y2="78" stroke="#334155"'
            + ' stroke-width="3.4" stroke-linecap="round" />');
    }
    if (n >= ETAPES) {
        p.push('<line x1="70" y1="60" x2="58" y2="72" stroke="#334155"'
            + ' stroke-width="3.4" stroke-linecap="round" />');
        p.push('<line x1="70" y1="60" x2="82" y2="72" stroke="#334155"'
            + ' stroke-width="3.4" stroke-linecap="round" />');
    }
    return p.join('');
}

const DESSINS = { bonhomme, gateau, fusee, potence };

/**
 * LE DÉCOR DEMANDÉ, à `n` erreurs, dans la vue portrait de 100 × 120.
 *
 * `taille` est la LARGEUR voulue ; la hauteur s'en déduit, parce qu'un décor
 * enfermé dans un carré laisserait une bande vide en haut et en bas que la
 * feuille de style ne peut pas récupérer.
 */
export function decorSvg(decor, n, { taille = 100, titre = '' } = {}) {
    const faire = DESSINS[decor] || DESSINS.bonhomme;
    const corps = faire(Math.max(0, Math.min(ETAPES, n)));
    const etiquette = titre
        ? ` role="img" aria-label="${titre}"` : ' aria-hidden="true"';
    const haut = Math.round(taille * VUE.h / VUE.l);
    return `<svg viewBox="0 0 ${VUE.l} ${VUE.h}" width="${taille}" height="${haut}"`
        + `${etiquette}>${corps}</svg>`;
}

export { potence, bonhomme, gateau, fusee };
