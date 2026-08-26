// COMBIEN DE GRILLES SUR LA FEUILLE — et rien d'autre à décider.
//
// La fiche se réglait en « colonnes × lignes ». C'est la mise en page qui
// parle, pas le professeur : personne ne se dit « trois colonnes et quatre
// lignes », on se dit « douze sudokus, assez grands pour qu'ils écrivent
// dedans ». Rémy : « il faut aller au plus clair et au plus simple ».
//
// Alors il ne reste qu'un nombre. La disposition s'en déduit, et l'on affiche
// la conséquence en centimètres — une longueur qu'on peut se représenter, là
// où « 3 × 4 » ne dit rien de la taille des cases.
//
// LA RÈGLE DU CHOIX : LA PLUS GRANDE GRILLE POSSIBLE, et à taille égale, le
// moins de places perdues.
//
// L'ordre des deux compte, et je m'étais trompé en le posant. Économiser les
// places d'abord donnait ceci : cinq grilles se rangeaient en 5 × 1, une seule
// rangée sans un trou — mais des grilles de 5,1 cm, alors que six grilles en
// 3 × 2 en donnaient de 7,8 cm. On demandait MOINS et l'on en obtenait de plus
// PETITES : exactement le contraire de ce que la commande promet.
//
// Un trou en fin de feuille ne coûte rien ; deux centimètres de côté, si.
//
// Et la taille d'abord donne la monotonie GRATUITEMENT, sans avoir à la
// vérifier cas par cas : les dispositions capables de porter n + 1 blocs sont
// un sous-ensemble de celles qui en portent n, et le maximum sur une partie ne
// dépasse jamais celui du tout. Demander une grille de moins ne peut donc
// jamais les rapetisser.
//
// Tout est en millimètres, comme le reste de la fiche : ce module ne connaît
// ni le DOM ni le PDF, il calcule des longueurs sur une page.

/**
 * Les gouttières entre blocs, et la hauteur du titre posé au-dessus.
 *
 * BLOCS COLLÉS : les cartes à découper se touchent par leur bordure — un seul
 * coup de massicot au lieu de deux, et pas de blanc à viser. Le titre du bloc
 * disparaît avec la gouttière : il n'a plus où se poser, et une carte à jouer
 * ne porte pas d'étiquette « Paire 3 ».
 */
export const GOUTTIERE = { x: 6, y: 4, titre: 4.4 };

/** La zone utile de la page, sous l'en-tête et au-dessus du pied. */
export function zoneUtile(page) {
    const y0 = page.marge + page.enteteH;
    return {
        x: page.marge, y: y0,
        w: page.w - page.marge * 2,
        h: page.h - y0 - page.marge - page.piedH
    };
}

/**
 * Les dimensions d'un emplacement, et la taille réellement dessinable dedans.
 *
 * `cote` est la LARGEUR DU DESSIN, pas celle de l'emplacement : un bloc plus
 * haut que large (un logigramme, un treillis de Garam) est bridé par la
 * hauteur, et c'est cette largeur-là qu'on annonce au professeur.
 */
export function mesuresSlot(page, cols, rows, colles = false, proportions = null) {
    const gapX = colles ? 0 : GOUTTIERE.x;
    const gapY = colles ? 0 : GOUTTIERE.y;
    const titreH = colles ? 0 : GOUTTIERE.titre;
    const z = zoneUtile(page);
    const slotW = (z.w - gapX * (cols - 1)) / cols;
    const slotH = (z.h - gapY * (rows - 1)) / rows;
    const utileH = slotH - titreH;
    // Sans proportions déclarées, le bloc est carré : c'est le cas de toutes
    // les grilles, et le carré inscrit est exactement ce que dessinait la
    // mise en page avant qu'on nomme la règle.
    const p = proportions && proportions.w > 0 && proportions.h > 0 ? proportions : { w: 1, h: 1 };
    const echelle = Math.min(slotW / p.w, utileH / p.h);
    return {
        gapX, gapY, titreH, zone: z, slotW, slotH, utileH,
        // Le carré inscrit, pour les grilles carrées.
        board: Math.min(slotW, utileH),
        // La largeur du dessin, proportions comprises.
        cote: Math.max(0, echelle * p.w)
    };
}

/**
 * CE QUE LE RENDU DEMANDE, quand il ne le dit pas en toutes lettres.
 *
 * Un rendu déclare parfois sa `disposition` ; sinon il déclare souvent
 * `parLigneDefaut` — « deux par ligne » pour un Garam, « trois » pour un carré
 * magique. Cette phrase-là était écrite pour la feuille du parcours, et la
 * fiche autonome ne l'écoutait pas : elle ouvrait douze Garams de 4,9 cm,
 * c'est-à-dire des cases de trois millimètres, alors que l'auteur avait pris
 * la peine d'écrire « à trois par ligne elles deviennent illisibles ».
 *
 * On la lit donc ici aussi : autant de colonnes au plus, et deux rangées pour
 * commencer. Rien n'est perdu — on peut toujours en demander dix — mais ce
 * qu'on obtient sans rien régler est lisible.
 */
export function dispositionDuRendu(rendu) {
    if (rendu && rendu.disposition) return rendu.disposition;
    const parLigne = rendu && rendu.parLigneDefaut;
    if (parLigne > 0) return { cols: parLigne, rows: 2, maxCols: parLigne, maxRows: 5 };
    return { cols: 3, rows: 4, maxCols: 5, maxRows: 5 };
}

/** Combien de blocs la page peut porter au maximum, ce rendu-là. */
export const capaciteMax = (dispo) => Math.max(1, (dispo.maxCols || 5) * (dispo.maxRows || 5));

/**
 * La disposition qui porte `n` blocs le mieux possible.
 *
 * @param {number} n            - le nombre de blocs demandé
 * @param {Object} dispo        - { maxCols, maxRows } déclarés par le rendu
 * @param {Object} page         - { w, h, marge, enteteH, piedH }
 * @param {Object} [opts]       - { proportions, colles }
 * @returns {{cols:number, rows:number, cote:number, places:number, gachis:number}}
 */
export function choisirDisposition(n, dispo, page, opts = {}) {
    const maxCols = Math.max(1, dispo.maxCols || 5);
    const maxRows = Math.max(1, dispo.maxRows || 5);
    const voulu = Math.max(1, Math.min(capaciteMax({ maxCols, maxRows }), Math.round(n) || 1));
    let best = null;
    for (let c = 1; c <= maxCols; c++) {
        for (let r = 1; r <= maxRows; r++) {
            const places = c * r;
            if (places < voulu) continue;
            const { cote } = mesuresSlot(page, c, r, opts.colles, opts.proportions);
            const cand = { cols: c, rows: r, cote, places, gachis: places - voulu };
            // La plus grande d'abord ; à égalité, celle qui perd le moins de
            // places — à douze blocs, 4 × 3 et 3 × 4 donnent la même taille et
            // ne laissent pas les mêmes trous.
            if (!best || cand.cote > best.cote + 1e-9
                || (Math.abs(cand.cote - best.cote) <= 1e-9 && cand.gachis < best.gachis)) best = cand;
        }
    }
    // Aucune disposition ne tient `voulu` blocs : on rend la plus grande, et
    // l'appelant borne le nombre. Ne jamais renvoyer `null` — la feuille doit
    // se dessiner, même quand on lui demande l'impossible.
    return best || { cols: maxCols, rows: maxRows, places: maxCols * maxRows, gachis: 0,
        cote: mesuresSlot(page, maxCols, maxRows, opts.colles, opts.proportions).cote };
}

/**
 * La taille d'un bloc, dite en centimètres.
 *
 * Le professeur imprime pour des élèves qui écrivent dedans : « 5,5 cm » se
 * mesure du regard sur une feuille posée devant soi, « 3 × 4 » non.
 */
export function coteLisible(mm) {
    const cm = Math.round((mm / 10) * 10) / 10;
    return `${String(cm).replace('.', ',')} cm`;
}
