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
    // « PLEIN » : LE BLOC PREND TOUT SON EMPLACEMENT, quelle qu'en soit la forme.
    //
    // Rémy, sur les jeux à découper : « en pdf, ils doivent être en version
    // unique de base et occuper le maximum d'espace pour être plus facile à
    // découper. » Une proportion déclarée est un CONTRAT sur la forme du
    // dessin — un logigramme plus haut que large, une pyramide plus large que
    // haute —, et elle a un coût : dès que la forme du bloc ne tombe pas sur
    // celle de la page, la différence reste blanche. Un plateau de jeu, lui,
    // n'a pas de forme à défendre : il se répartit dans ce qu'on lui donne.
    // Sur une page A4 en paysage, un bloc déclaré 1 × 0,74 laissait quarante-
    // cinq millimètres de blanc au bord droit — de quoi agrandir les pièces
    // d'un cinquième.
    if (proportions === 'plein') {
        return { gapX, gapY, titreH, zone: z, slotW, slotH, utileH,
            board: Math.min(slotW, utileH), cote: slotW };
    }
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

/**
 * COMBIEN DE RANGÉES QUAND LE NOMBRE DE COLONNES EST DONNÉ — celles qui
 * remplissent la feuille, et pas une de plus.
 *
 * Fixer les colonnes fixe la LARGEUR d'un bloc : elle ne dépend plus que de la
 * page. La proportion du rendu en donne alors la hauteur, et la question « et
 * combien par page ? » n'a plus qu'une réponse honnête — autant qu'il en tient
 * de haut.
 *
 * ON ARRONDIT, ON NE TRONQUE PAS. Trois colonnes de blocs carrés sur une page
 * couchée : le bloc fait 89 mm de large, la zone utile 169 mm de haut. Tronquer
 * donne UNE rangée — un bloc de 89 mm et 76 mm de blanc en dessous, c'est-à-dire
 * la moitié de la feuille perdue. Arrondir en donne deux : les blocs descendent
 * à 78 mm — un neuvième de moins — et l'on imprime deux fois plus. Rémy le dit
 * d'une autre façon à propos des graduations : « car là ça gâche du papier ».
 */
export function lignesQuiRemplissent(cols, page, opts = {}) {
    const p = opts.proportions;
    const forme = (p && p !== 'plein' && p.w > 0 && p.h > 0) ? p : { w: 1, h: 1 };
    const gapX = opts.colles ? 0 : GOUTTIERE.x;
    const gapY = opts.colles ? 0 : GOUTTIERE.y;
    const titreH = opts.colles ? 0 : GOUTTIERE.titre;
    const z = zoneUtile(page);
    const largeur = (z.w - gapX * (cols - 1)) / cols;
    // Ce qu'une rangée coûte en hauteur : le bloc, son titre, la gouttière qui
    // la sépare de la suivante. La dernière n'a pas de gouttière — d'où le
    // `+ gapY` au numérateur.
    const parRangee = largeur * forme.h / forme.w + titreH + gapY;
    return Math.max(1, Math.round((z.h + gapY) / parRangee));
}

/**
 * LA DISPOSITION D'UN EXERCICE QUI DIT SES COLONNES.
 *
 * Rémy a relu le catalogue fiche par fiche et écrit, quarante-six fois, « fais
 * 3 colonnes par défaut », « par défaut 4 colonnes ». Ce n'est pas le rendu qui
 * le sait — trois exercices partagent l'opération posée et en veulent cinq,
 * quatre et quatre —, c'est L'EXERCICE. `colonnesPapier` le disait déjà pour
 * les fiches de questions ; il vaut désormais aussi pour les grilles.
 *
 * Et la règle qui va avec, dictée sous le Tasuko : « Quand je te dis 3 colonnes
 * mets 6 questions ou un multiple de 3. Quand je dis 4 colonnes mets 4
 * questions ou un multiple de 4 — mais bien sûr l'utilisateur peut choisir. »
 * Le nombre par défaut est donc `colonnes × rangées`, et jamais un compte qui
 * laisserait une rangée à trous dès l'ouverture.
 *
 * Les plafonds du rendu sont relevés, pas remplacés : `maxCols` bornait le
 * nombre de colonnes tel que le rendu l'avait mesuré POUR SON PROPRE compte, et
 * refuser les colonnes que l'exercice demande n'aurait servi qu'à ignorer la
 * demande en silence.
 */
export function dispositionEnColonnes(colonnes, rendu, page, opts = {}) {
    const base = dispositionDuRendu(rendu);
    const cols = Math.round(colonnes) || 0;
    if (cols < 1) return base;
    const rows = lignesQuiRemplissent(cols, page, opts);
    return {
        ...base,
        cols, rows,
        // Le vœu de l'exercice, que `choisirDisposition` suivra tant qu'il
        // reste une disposition à ce nombre de colonnes.
        colonnes: cols,
        maxCols: Math.max(cols, base.maxCols || 5),
        maxRows: Math.max(rows, base.maxRows || 5)
    };
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
    // LE NOMBRE DE COLONNES QUE L'EXERCICE RÉCLAME, s'il en réclame un.
    //
    // La règle générale — la plus grande grille possible — reste la bonne quand
    // personne n'a regardé la feuille. Mais Rémy a regardé les quarante-six
    // siennes, et « fais 4 colonnes par défaut » n'est pas une préférence
    // esthétique : c'est le nombre d'exercices qu'il veut voir sur la page
    // qu'il photocopie. On garde donc les deux règles, dans cet ordre : d'abord
    // les dispositions qui ont le bon nombre de colonnes, et la plus grande
    // d'entre elles ; la règle libre ne sert que si aucune n'y suffit — quand
    // on demande plus de blocs que ces colonnes-là n'en portent.
    const voulues = Math.round(dispo.colonnes) || 0;
    let best = null;
    let bestVoulues = null;
    for (let c = 1; c <= maxCols; c++) {
        for (let r = 1; r <= maxRows; r++) {
            const places = c * r;
            if (places < voulu) continue;
            const { cote } = mesuresSlot(page, c, r, opts.colles, opts.proportions);
            const cand = { cols: c, rows: r, cote, places, gachis: places - voulu };
            // La plus grande d'abord ; à égalité, celle qui perd le moins de
            // places — à douze blocs, 4 × 3 et 3 × 4 donnent la même taille et
            // ne laissent pas les mêmes trous.
            const mieux = (a, b) => !a || b.cote > a.cote + 1e-9
                || (Math.abs(b.cote - a.cote) <= 1e-9 && b.gachis < a.gachis);
            if (mieux(best, cand)) best = cand;
            if (c === voulues && mieux(bestVoulues, cand)) bestVoulues = cand;
        }
    }
    best = bestVoulues || best;
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
