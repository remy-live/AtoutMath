// LES TROIS DÉCORS DU PENDU, en SVG, partagés par l'écran et le papier.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY demande des propositions avant qu'on se lance sur un dessin. En voici
// trois, jouables tout de suite, et c'est lui qui dira laquelle reste par
// défaut.
//
// ── POURQUOI TROIS, ET PAS SEULEMENT LA POTENCE ─────────────────────────────
//
// « Pendu » dit une potence et un pendu. C'est le nom du jeu, tout le monde le
// connaît sous ce nom, et le refuser d'autorité serait décider à la place du
// professeur. Mais c'est un gibet dessiné devant des enfants de onze ans, et
// beaucoup d'écoles ont changé le dessin sans changer le jeu. On donne donc
// les trois et on laisse trancher.
//
// ── CE QUE TOUS LES TROIS DOIVENT FAIRE ─────────────────────────────────────
//
//   · SIX ÉTAPES, exactement : c'est le compte classique d'erreurs, et il faut
//     qu'on VOIE à quelle étape on en est sans compter — donc six éléments
//     bien distincts, jamais six nuances du même trait.
//   · ÊTRE LISIBLES EN NOIR, parce qu'ils s'impriment aussi, et qu'une
//     photocopie de collège ne rend pas les gris.
//   · TENIR DANS UN CARRÉ de 100 × 100, que l'écran et la fiche redimensionnent
//     chacun à sa guise.
//
// LE SENS DE LECTURE DIFFÈRE, et c'est voulu : la potence se CONSTRUIT (on
// ajoute un trait à chaque erreur), le bonhomme de neige se DÉFAIT (on lui
// enlève un morceau), la mèche se CONSOMME. Trois façons de dire « il te reste
// moins de place », à des élèves qui ne les lisent pas de la même façon.

/** Le trait commun à tous les décors : noir, épais, bouts ronds. */
const TRAIT = 'stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none"';

/**
 * LA POTENCE — le pendu classique, construit trait par trait.
 *
 * Les six étapes : le socle, le mât, la poutre, la corde, la tête, le corps.
 * On ne dessine NI les bras NI les jambes : à six erreurs le jeu est fini, et
 * un bonhomme à moitié dessiné dit la défaite aussi bien qu'un bonhomme
 * complet — sans insister.
 */
function potence(n) {
    // LE SOL EST LÀ DÈS LE DÉPART, et ce n'est pas un détail de dessin : la
    // première version commençait sur un cadre VIDE, et regardée sur la
    // planche des décors, elle ressemblait à un écran qui n'a pas fini de
    // charger. Un jeu qui s'ouvre sur du vide n'invite personne.
    const p = [`<line x1="12" y1="92" x2="58" y2="92" ${TRAIT} />`];
    if (n >= 1) p.push(`<line x1="30" y1="92" x2="30" y2="12" ${TRAIT} />`);
    if (n >= 2) p.push(`<line x1="30" y1="12" x2="68" y2="12" ${TRAIT} />`);
    if (n >= 3) p.push(`<line x1="68" y1="12" x2="68" y2="26" ${TRAIT} />`);
    if (n >= 4) p.push(`<circle cx="68" cy="36" r="10" ${TRAIT} />`);
    if (n >= 5) p.push(`<line x1="68" y1="46" x2="68" y2="72" ${TRAIT} />`);
    if (n >= 6) {
        p.push(`<line x1="68" y1="54" x2="56" y2="66" ${TRAIT} />`);
        p.push(`<line x1="68" y1="54" x2="80" y2="66" ${TRAIT} />`);
    }
    return p.join('');
}

/**
 * LE BONHOMME DE NEIGE QUI FOND — il est entier au départ et perd un morceau
 * à chaque erreur. À la sixième il ne reste qu'une flaque.
 *
 * C'EST LE SEUL DÉCOR QUI COMMENCE PLEIN, et c'est ce qui le rend lisible d'un
 * coup d'œil : on voit ce qu'on a encore, pas ce qu'on a perdu.
 */
function bonhomme(n) {
    const p = [];
    // La flaque, dès la première fonte — elle grandit avec les erreurs.
    if (n >= 1) {
        const l = 10 + n * 5;
        p.push(`<line x1="${50 - l}" y1="94" x2="${50 + l}" y2="94" ${TRAIT} />`);
    } else {
        p.push(`<line x1="34" y1="94" x2="66" y2="94" ${TRAIT} />`);
    }
    if (n < 6) p.push(`<circle cx="50" cy="74" r="18" ${TRAIT} />`);   // le corps
    if (n < 5) p.push(`<circle cx="50" cy="44" r="13" ${TRAIT} />`);   // la tête
    if (n < 4) {                                                        // les bras
        p.push(`<line x1="34" y1="70" x2="18" y2="58" ${TRAIT} />`);
        p.push(`<line x1="66" y1="70" x2="82" y2="58" ${TRAIT} />`);
    }
    // LA CAROTTE PART AVANT LES YEUX : un visage à deux yeux sans nez se lit
    // encore comme un visage ; un nez tout seul au milieu d'une boule, non.
    if (n < 2) p.push(`<path d="M50 44 l10 4 -10 4 z" fill="currentColor" />`);  // la carotte
    if (n < 3) {                                                        // les yeux
        p.push(`<circle cx="45" cy="40" r="1.8" fill="currentColor" />`);
        p.push(`<circle cx="55" cy="40" r="1.8" fill="currentColor" />`);
    }
    if (n < 1) {                                                        // le chapeau
        p.push(`<line x1="36" y1="31" x2="64" y2="31" ${TRAIT} />`);
        p.push(`<path d="M41 31 v-12 h18 v12" ${TRAIT} />`);
    }
    return p.join('');
}

/**
 * LA MÈCHE DE LA FUSÉE — elle brûle d'une erreur à l'autre, et quand elle est
 * consommée la fusée part sans l'élève.
 *
 * SIX CRANS LE LONG DE LA MÈCHE : on lit la place qu'il reste comme on lit une
 * jauge, ce qu'aucun des deux autres décors ne donne.
 */
function fusee(n) {
    const p = [];
    // La fusée, toujours là.
    p.push('<path d="M62 74 v-24 a12 12 0 0 1 24 0 v24 z" ' + TRAIT + ' />');
    p.push('<path d="M62 74 l-9 11 h9 z" ' + TRAIT + ' />');
    p.push('<path d="M86 74 l9 11 h-9 z" ' + TRAIT + ' />');
    p.push('<circle cx="74" cy="54" r="5" ' + TRAIT + ' />');

    // ── LA MÈCHE EST FAITE DE SIX BRINS, ET C'EST UNE CORRECTION ───────────
    //
    // Premier jet : une courbe qui raccourcissait. REGARDÉE SUR LA PLANCHE DES
    // DÉCORS, c'était sans appel — de zéro à quatre erreurs, les cinq dessins
    // étaient indiscernables. Un décor de pendu qui ne dit pas où l'on en est
    // ne sert à rien du tout : c'est sa seule fonction.
    //
    // Six brins qui s'éteignent un par un se comptent du premier coup d'œil,
    // comme les crans d'une jauge. Et l'étincelle avance vers la fusée, ce qui
    // dit le SENS sans un mot.
    // DEUXIÈME CORRECTION, SUR LA MÊME PLANCHE : six traits rapprochés se
    // rejoignaient en une seule ligne, et l'on ne voyait toujours pas combien
    // il en restait. Six PASTILLES bien séparées, pleines tant que la mèche
    // tient et creuses une fois brûlées, se COMPTENT — et l'on garde les six
    // emplacements sous les yeux, donc on lit « il m'en reste deux » et non
    // « c'est plus court qu'avant ».
    const brins = 6;
    for (let k = 0; k < brins; k++) {
        const x = 14 + k * 8;
        if (k < n) p.push(`<circle cx="${x}" cy="86" r="2.6" stroke="currentColor" `
            + 'stroke-width="1.6" fill="none" />');
        else p.push(`<circle cx="${x}" cy="86" r="3.2" fill="currentColor" />`);
    }
    if (n < brins) {
        // L'étincelle : un éclat sur la pastille qui va partir.
        const x = 14 + n * 8;
        p.push(`<path d="M${x - 7} 79 l4 4 M${x - 7} 93 l4 -4 M${x - 9} 86 h4" `
            + 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" />');
    } else {
        // Mèche consommée : la fusée part sans l'élève.
        p.push('<path d="M68 86 l3 11 3 -11 3 11 3 -11" ' + TRAIT + ' />');
    }
    return p.join('');
}

const DESSINS = { potence, bonhomme, fusee };

/**
 * LE DÉCOR DEMANDÉ, à `n` erreurs, dans un carré de 100 × 100.
 *
 * `currentColor` partout : l'écran lui donne l'encre du thème, le PDF l'encre
 * noire, et aucun des deux n'a à connaître l'autre.
 */
export function decorSvg(decor, n, { taille = 100, titre = '' } = {}) {
    const faire = DESSINS[decor] || DESSINS.bonhomme;
    const corps = faire(Math.max(0, Math.min(6, n)));
    const etiquette = titre
        ? ` role="img" aria-label="${titre}"` : ' aria-hidden="true"';
    return `<svg viewBox="0 0 100 100" width="${taille}" height="${taille}"${etiquette}>`
        + corps + '</svg>';
}

export { potence, bonhomme, fusee };
