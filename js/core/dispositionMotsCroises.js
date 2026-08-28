// LA MISE EN PAGE D'UNE GRILLE DE MOTS CROISÉS — module pur.
//
// Rémy : « on peut peut être mettre en option écrire définition à côté (la
// grille se décale à droite ou à gauche) ou en dessous et évidemment on essaye
// d'occuper le maximum d'espace ».
//
// Ni DOM ni jsPDF ici : rien que des millimètres. C'est ce qui permet de
// VÉRIFIER la promesse — « la plus grande grille possible » est une propriété
// qu'on mesure, pas une intention qu'on annonce — et c'est ce qui garantit que
// l'aperçu et la feuille tombent au même endroit, puisqu'ils lisent le même
// calcul.
//
// La bonne disposition dépend de la GRILLE, pas du goût : une grille haute et
// étroite — huit mots verticaux qui s'empilent — laisse une colonne entière
// libre sur le côté, et lui coller les définitions en dessous rétrécit ses
// cases pour rien. Une grille large et basse, c'est l'inverse. On calcule donc
// les trois et l'on garde celle dont la CASE est la plus grande, puisque c'est
// elle qu'on écrit dedans.
//
// LE CORPS DES DÉFINITIONS EST ÉCRIT ICI, UNE FOIS. L'aperçu posait du 2,9 mm
// à interligne 1,2 et le PDF du 6,4 pt à pas de 2,6 mm : deux réglages pour le
// même texte, donc deux hauteurs différentes, donc une réserve juste sur l'un
// et fausse sur l'autre.
export const MC_DEF = {
    corps: 2.6,        // hauteur des lettres d'une définition, en mm
    pas: 3.15,         // d'une ligne à la suivante
    titre: 3.3,        // « Horizontalement »
    apresTitre: 4.2,   // du haut du titre à la première définition
    entreListes: 3     // entre la fin d'une liste et le titre de la suivante
};

/**
 * Combien de lignes cette liste occupe dans une colonne de `largeur` mm.
 *
 * `corps` est donné parce qu'il ne vaut plus toujours `MC_DEF.corps` : les
 * définitions grossissent pour occuper leur colonne, et un texte plus gros se
 * REPLIE davantage à largeur égale. Compter les lignes du petit corps puis
 * multiplier la hauteur par le facteur donnait une hauteur trop faible — et
 * « Verticalement » venait s'écrire par-dessus la fin d'« Horizontalement ».
 */
export function lignesDefs(liste, largeur, corps = MC_DEF.corps) {
    // Un caractère d'Helvetica fait à peu près la moitié du corps.
    const car = corps * 0.5;
    return liste.reduce((n, d) => n + Math.max(1,
        Math.ceil(`${d.num}. ${d.def} (${d.longueur})`.length * car / Math.max(4, largeur))), 0);
}

/** La hauteur d'un bloc de définitions : une liste, titre compris. */
const hauteurListe = (lignes, M = MC_DEF) => M.apresTitre + lignes * M.pas;

/**
 * Ce que donne une disposition : la taille de case, et où tout se pose.
 * `null` si elle ne tient pas — une colonne de définitions trop haute pour le
 * bloc, par exemple.
 */
export function essaiDisposition(b, m, pose) {
    const marge = 2;
    if (pose === 'dessous') {
        // Deux colonnes côte à côte sous la grille : chacune porte une liste,
        // et c'est la plus longue qui fixe la hauteur.
        const demi = (b.w - 4) / 2;
        const h = hauteurListe(Math.max(lignesDefs(m.horizontales, demi),
            lignesDefs(m.verticales, demi)));
        const dispoH = b.h - h - 3;
        if (dispoH < 12) return null;
        const cote = Math.min((b.w - marge) / m.largeur, dispoH / m.hauteur);
        const w = cote * m.largeur, hg = cote * m.hauteur;
        // LA BANDE BLANCHE ENTRE LA GRILLE ET LES DÉFINITIONS N'A AUCUNE RAISON
        // D'EXISTER. C'était l'autre moitié de « la place perdue » que Rémy
        // montrait : la grille recevait `dispoH` de hauteur, n'en prenait que
        // `hg` — elle est bornée par sa largeur — et centrait le reste en deux
        // marges vides, une au-dessus, une en dessous. Quarante millimètres de
        // papier blanc au milieu d'une feuille.
        //
        // La grille se cale donc EN HAUT et les définitions montent juste
        // dessous : tout ce que la grille n'a pas pris leur revient, et
        // `grossissementDefs` s'en sert pour grossir le texte. C'est aussi la
        // mise en page du journal, où la grille n'a jamais flotté au milieu.
        return {
            pose, cote,
            x: b.x + (b.w - w) / 2, y: b.y, w, h: hg,
            defs: { colonnes: 2, largeur: demi, x: b.x, x2: b.x + demi + 4, y: b.y + hg + 4 }
        };
    }
    // À CÔTÉ : une seule colonne, les deux listes l'une sous l'autre. Sa
    // largeur n'est pas donnée — on la cherche. Trop étroite, les définitions
    // débordent en hauteur ; trop large, elles mangent la grille. On balaie et
    // l'on garde la case la plus grande, ce qui est le critère demandé.
    // PLUS LARGE QUE LA PLUS LONGUE DÉFINITION NE SERT À RIEN : au-delà, chaque
    // définition tient déjà sur une ligne, la colonne ne raccourcit plus et
    // l'on ne fait que voler de la place à la grille.
    const utile = Math.max(20, ...[...m.horizontales, ...m.verticales]
        .map(d => `${d.num}. ${d.def} (${d.longueur})`.length * MC_DEF.corps * 0.5));
    let mieux = null;
    for (let part = 0.22; part <= 0.56; part += 0.02) {
        const largeur = b.w * part;
        if (largeur > utile + 2) break;
        const h = hauteurListe(lignesDefs(m.horizontales, largeur))
            + MC_DEF.entreListes + hauteurListe(lignesDefs(m.verticales, largeur));
        if (h > b.h) continue;
        const dispoW = b.w - largeur - 4;
        if (dispoW < 12) continue;
        const cote = Math.min(dispoW / m.largeur, (b.h - marge) / m.hauteur);
        // À TAILLE DE CASE ÉGALE, LA COLONNE LA PLUS LARGE. La grille ne gagne
        // plus rien à ce qu'on rétrécisse les définitions — elle est alors
        // bornée par la hauteur —, et une colonne étroite coupe les phrases en
        // trois mots par ligne pour un blanc gagné nulle part.
        //
        // UN DIXIÈME DE MILLIMÈTRE NE VAUT PAS UNE COLONNE. La comparaison
        // était STRICTE, si bien qu'un côté de 10,71 mm battait un côté de
        // 10,70 mm et emportait avec lui la colonne la plus étroite : on
        // sacrifiait deux centimètres de largeur de texte pour un gain de case
        // que personne ne peut voir au stylo. On tolère donc un vingtième de
        // millimètre — sous ce seuil, les deux cases sont la même case, et
        // c'est la colonne qui tranche.
        if (mieux && cote < mieux.cote - 0.05) continue;
        const w = cote * m.largeur, hg = cote * m.hauteur;
        // « gauche » = définitions à gauche, la grille se décale à droite.
        const xDefs = pose === 'gauche' ? b.x : b.x + b.w - largeur;
        const zone = pose === 'gauche' ? b.x + largeur + 4 : b.x;
        mieux = {
            pose, cote,
            x: zone + (dispoW - w) / 2, y: b.y + (b.h - hg) / 2, w, h: hg,
            defs: { colonnes: 1, largeur, x: xDefs, y: b.y, hHoriz: hauteurListe(lignesDefs(m.horizontales, largeur)) }
        };
    }
    return mieux;
}


/**
 * La disposition retenue pour cette grille dans ce bloc.
 *
 * @param {{x:number,y:number,w:number,h:number}} b - le bloc, en millimètres
 * @param {Object} m - la grille : largeur, hauteur, horizontales, verticales
 * @param {string} [voulu] - 'auto' | 'dessous' | 'gauche' | 'droite'
 */
/**
 * LE CORPS DES DÉFINITIONS S'ADAPTE À LA PLACE QUI RESTE.
 *
 * Rémy : « sur les mots croisés mathématiques, je trouve que tu ne profites pas
 * du tout de l'espace. » La grille, elle, occupe déjà tout ce qu'elle peut :
 * elle est bornée par sa LARGEUR — quinze cases dans un bloc de dix-neuf
 * centimètres — et ne peut pas grandir en hauteur sans se déformer. Ce qui
 * restait vide, c'était la colonne des définitions : dix lignes de 2,6 mm dans
 * une colonne haute de vingt-cinq centimètres, soit six pour cent de remplis.
 *
 * On grossit donc le texte jusqu'à ce qu'il OCCUPE sa colonne. Deux bornes :
 * un corps maximal, et jamais plus du triple, pour qu'une grille à trois
 * définitions ne les affiche pas en titres de journal.
 *
 * LE PLAFOND ÉTAIT À 4,2 MM, ET C'ÉTAIT LUI « LA PLACE PERDUE ». Rémy, capture
 * à l'appui : « tu vois sur le mot croisé la place perdue ». Sur la feuille
 * mesurée, les définitions s'arrêtaient aux deux tiers de leur colonne et le
 * dernier tiers restait blanc — un rectangle vide grand comme une carte
 * postale, en bas à gauche d'une page A4. Le texte AVAIT le droit de grossir,
 * il butait simplement sur ce plafond.
 *
 * 5,6 mm, soit du seize points. On reste très en deçà du « poème » que
 * craignait la borne précédente : c'est le corps d'un titre de paragraphe, sur
 * une feuille qu'on lit posée sur une table, pas un livre qu'on tient. Et le
 * facteur trois continue de protéger les grilles à trois définitions.
 *
 * @returns {number} le facteur d'agrandissement, 1 s'il n'y a rien à gagner.
 */
export const MC_CORPS_MAX = 5.6;

export function grossissementDefs(mesurer, hauteurDispo, max = MC_CORPS_MAX / MC_DEF.corps) {
    if (!(hauteurDispo > 0)) return 1;
    // ON ESSAIE, ON NE CALCULE PAS. La hauteur ne varie pas proportionnellement
    // au corps : un texte deux fois plus gros se replie sur plus de lignes, et
    // sa hauteur peut tripler. On balaie donc du plus grand au plus petit et
    // l'on garde le premier qui TIENT vraiment, replis compris.
    //
    // Un dixième de marge : une colonne remplie au millimètre près déborde à la
    // première définition un peu plus longue que prévu.
    const place = hauteurDispo * 0.9;
    for (let f = Math.min(3, max); f > 1; f -= 0.05) {
        // ARRONDI VERS LE BAS, jamais au plus proche : arrondir 1,6153 à 1,62
        // repasse au-dessus du plafond de 4,2 mm qu'on vient de calculer, et
        // un plafond franchi par l'arrondi n'est plus un plafond.
        if (mesurer(f) <= place) return Math.floor(f * 100) / 100;
    }
    return 1;
}

/** Les mesures des définitions, une fois grossies d'un facteur. */
export const defsGrossies = (facteur) => ({
    corps: MC_DEF.corps * facteur,
    pas: MC_DEF.pas * facteur,
    titre: MC_DEF.titre * facteur,
    apresTitre: MC_DEF.apresTitre * facteur,
    entreListes: MC_DEF.entreListes * facteur
});

export function disposerMotsCroises(b, m, voulu = 'auto') {
    const demande = ['dessous', 'gauche', 'droite'].includes(voulu) ? voulu : 'auto';
    const candidats = (demande === 'auto' ? ['dessous', 'gauche', 'droite'] : [demande])
        .map(pose => essaiDisposition(b, m, pose)).filter(Boolean);
    // Le repli tient à une seule chose : une disposition IMPOSÉE peut ne pas
    // tenir (des définitions à rallonge dans un bloc bas). On ne rend jamais
    // « rien » — on rend la mise en page du journal, réduite s'il le faut.
    const meilleur = candidats.sort((a, c) => c.cote - a.cote)[0]
        || essaiDisposition(b, m, 'dessous')
        || {
            pose: 'dessous', cote: 3, x: b.x, y: b.y, w: b.w, h: b.h * 0.5,
            defs: {
                colonnes: 2, largeur: (b.w - 4) / 2, x: b.x,
                x2: b.x + (b.w - 4) / 2 + 4, y: b.y + b.h * 0.55
            }
        };
    // LA COLONNE DES DÉFINITIONS SE REMPLIT. Une fois la grille posée, on sait
    // combien de place il reste au texte : on l'y étale.
    const l = meilleur.defs.largeur;
    const deuxColonnes = meilleur.defs.colonnes === 2;
    // La hauteur réelle du texte pour un facteur donné, replis compris.
    const mesurer = (f) => {
        const M = defsGrossies(f);
        return deuxColonnes
            ? hauteurListe(Math.max(lignesDefs(m.horizontales, l, M.corps),
                lignesDefs(m.verticales, l, M.corps)), M)
            : hauteurListe(lignesDefs(m.horizontales, l, M.corps), M)
                + M.entreListes + hauteurListe(lignesDefs(m.verticales, l, M.corps), M);
    };
    const hDispo = deuxColonnes ? b.y + b.h - meilleur.defs.y : b.h;
    const facteur = grossissementDefs(mesurer, hDispo);
    // La case ne descend pas sous trois millimètres : en dessous, on n'écrit
    // plus une lettre à la main.
    return {
        ...meilleur,
        cote: Math.max(3, meilleur.cote),
        defs: {
            ...meilleur.defs, facteur, mesures: defsGrossies(facteur),
            // La hauteur du premier bloc, RECALCULÉE au corps retenu : c'est
            // elle qui dit où commence « Verticalement ».
            hHoriz: hauteurListe(
                lignesDefs(m.horizontales, l, defsGrossies(facteur).corps),
                defsGrossies(facteur))
        }
    };
}
