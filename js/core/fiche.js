// LA MISE EN PAGE D'UNE FICHE DE QUESTIONS — sans DOM, sans PDF.
//
// Un exercice de l'application se joue en tapant une réponse ; sur papier, il
// devient une liste numérotée avec une ligne de pointillés. Ce module calcule
// OÙ va chaque question sur la feuille : découpage des lignes trop longues,
// remplissage des colonnes, passage à la page suivante.
//
// Il est séparé de l'affichage pour une raison précise : l'aperçu à l'écran et
// le PDF téléchargé doivent tomber au même endroit, au millimètre. En laissant
// chacun calculer ses propres retours à la ligne, on obtient deux mises en page
// voisines mais différentes — et c'est toujours l'imprimé, celui qu'on ne
// revoit pas avant de l'avoir distribué, qui déborde. Ici, le découpage est
// fait UNE fois ; l'aperçu et le PDF reçoivent les mêmes lignes déjà coupées.
//
// La largeur du texte est mesurée par une fonction fournie de l'extérieur
// (canvas côté navigateur, table fixe dans les tests) : c'est la seule chose
// que ce module ne sait pas faire seul.

/** Millimètres. A4 portrait : une fiche de questions se lit en hauteur. */
export const A4 = { w: 210, h: 297, marge: 14, enteteH: 21, piedH: 8 };

/**
 * A4 PAYSAGE. Ce n'est pas un caprice de présentation : quarante calculs
 * courts en quatre colonnes tiennent sur une page couchée là où il en faut
 * deux debout, et une rangée de quatre mathdokus n'existe qu'en paysage. Les
 * marges y sont un peu plus serrées — une feuille couchée a plus de largeur à
 * offrir qu'à gâcher.
 */
export const A4_PAYSAGE = { w: 297, h: 210, marge: 12, enteteH: 19, piedH: 7 };

/** La géométrie de page demandée. Tout le reste s'en déduit. */
export function pageDe(orientation) {
    return { ...(orientation === 'paysage' ? A4_PAYSAGE : A4) };
}

/**
 * L'énoncé tel qu'il s'imprime, et le TROU où l'on écrit.
 *
 * À l'écran, « 7 + 2 = ? » désigne la case à remplir. Sur le papier, le point
 * d'interrogation ne désigne plus rien : la place à remplir, ce sont les
 * pointillés ou le champ juste derrière. « 7 + 2 = » se termine sur le signe
 * égal, comme dans tous les cahiers.
 *
 * Mais un « ? » n'est pas toujours en bout de ligne. « 82 041 = 80 000 + ? +
 * 40 + 1 » a son trou AU MILIEU : c'est là qu'on écrit, et une ligne de
 * pointillés au bout de la question ne veut alors plus rien dire. On remplace
 * donc ces marques — « ? », « … », « ... » — par une VRAIE place, large de la
 * réponse attendue. La mise en page la retrouve ensuite (c'est le seul endroit
 * où l'on trouve trois espaces d'affilée) pour y poser le trait à remplir et,
 * si le professeur le demande, le champ du PDF.
 *
 * Le « ? » final d'une vraie question — « Combien de billes reste-t-il ? » —
 * n'est évidemment pas un trou : on n'y touche pas.
 */
export const TROU_MIN = 3;

export function texteImprime(texte, reponse) {
    // Le « ? » qui suit un « = » EN FIN D'ÉNONCÉ disparaît : la place à
    // remplir, ce sont les pointillés juste après. Mais « 82 041 = ? + 40 »
    // n'est pas de ceux-là — son « ? » est un trou au milieu, et l'effacer
    // laissait un « = + 40 » qui ne veut rien dire. D'où l'ancrage en fin.
    let t = String(texte ?? '').replace(/([=\u2248])\s*\?\s*$/, '$1');
    // Assez large pour la réponse, et jamais moins que la marque remplacée.
    // Trois caractères de plus que la réponse attendue : un élève de sixième
    // n'écrit pas au millimètre, et un « 7 000 » posé dans la largeur exacte
    // de « 7 000 » déborde sur le signe d'après.
    const large = Math.max(TROU_MIN + 2, String(reponse ?? '').length + 3);
    // LE TROU NE TOUCHE PAS LES SIGNES QUI L'ENTOURENT.
    //
    // « 8 + ? = 10 » devenait « 8 +.........= 10 » : la mise en page prend
    // toute suite de trois espaces pour un trou, y compris les espaces de
    // ponctuation qui bordent le « ? ». Les pointillés partaient donc du « + »
    // et venaient buter contre le « = ». On borde le trou d'espaces INSÉCABLES,
    // que le repérage ne ramasse pas : « 8 + ......... = 10 ».
    const trou = `\u00A0${' '.repeat(large)}\u00A0`;
    // Un trou peut aussi FINIR l'énoncé — « 7 677 = 7 000 + 600 + 70 + ? ».
    // Ce qui distingue ce « ? » de celui d'une vraie question, c'est ce qui le
    // précède : un opérateur, jamais un mot.
    //
    // ET IL DOIT SURVIVRE AU ROGNAGE. Le nettoyage de fin de ligne, juste
    // dessous, emportait le trou qu'on venait de poser : « 5 053 = 5 000 + 50
    // + ? » ressortait « 5 053 = 5 000 + 50 + », sans nulle part où écrire, et
    // le corrigé y accolait « = 3 » derrière un signe plus orphelin.
    let trouFinal = false;
    t = t.replace(/([+\-\u2212\u00D7\u00F7*/])(\s*)\?\s*$/, (m, op) => {
        trouFinal = true;
        return op + trou;
    });
    t = t.replace(/(\?|…|\.{2,})(?=\s*\S)/g, trou);
    return trouFinal ? t : t.replace(/[\s\u00A0]+$/, '');
}

/**
 * MESURER UNE FRACTION TELLE QU'ELLE S'IMPRIME.
 *
 * « 5/11 » écrit en colonne n'occupe que la largeur de « 11 » : le trait, le
 * numérateur et le dénominateur se superposent. Mesurer la chaîne telle quelle
 * la croyait deux fois trop large — et l'énoncé passait à la ligne pour rien,
 * la seconde fraction venant se poser sous la première.
 */
export function mesureurFractions(mesurer) {
    return (texte, taille) => mesurer(
        String(texte).replace(/(\d+)\s*\/\s*(\d+)/g,
            (m, a, b) => ' ' + (a.length >= b.length ? a : b) + ' '),
        taille);
}

/**
 * CE TEXTE-CI porte-t-il vraiment une fraction ?
 *
 * Le générateur déclare `fractions: true` dès qu'il PEUT en produire — et les
 * problèmes en produisent une fois sur dix. La fiche prenait la déclaration
 * pour argent comptant et réservait à CHAQUE question la hauteur d'une fraction
 * empilée : dix-neuf énoncés sur vingt descendaient d'un demi-interligne sous
 * leur numéro, pour une fraction qui n'y était pas. C'est le décalage que Rémy
 * a vu sur la feuille de problèmes.
 */
export function porteUneFraction(...textes) {
    return textes.some(t => /\d\s*\/\s*\d/.test(String(t ?? '')));
}

/** L'emplacement du trou dans une ligne déjà composée, ou null. */
export function trouDe(ligne) {
    const m = / {3,}/.exec(ligne || '');
    return m ? { debut: m.index, fin: m.index + m[0].length } : null;
}


export const DEFAUTS = {
    colonnes: 2,
    taille: 3.9,        // hauteur des capitales, en mm (≈ 11 pt)
    interligne: 5.0,
    entreQuestions: 4.2,
    ligneReponse: 7.0,  // place laissée sous une question pour écrire
    numeroL: 7.5,       // gouttière du numéro « 12. »
    gouttiere: 8        // entre deux colonnes
};

/**
 * Coupe un texte en lignes qui tiennent dans `largeur`.
 *
 * Coupure aux espaces ; un mot plus long que la colonne (un grand nombre, une
 * expression sans espace) est coupé au caractère plutôt que de déborder — sur
 * une fiche, un débordement n'est pas rattrapable après impression.
 */
export function couperEnLignes(texte, largeur, taille, mesurer) {
    // Les marques de réponse d'un corrigé (\u0001 … \u0002) ne s'impriment
    // pas : elles ne doivent pas peser dans la largeur non plus, sans quoi une
    // ligne juste à la limite passerait à la ligne pour deux caractères
    // invisibles.
    const mes = (t, taille2) => mesurer(sansMarques(t), taille2);
    const lignes = [];
    for (const paragraphe of String(texte ?? '').split('\n')) {
        // LE TROU EST UN MOT COMME UN AUTRE. Découper sur « un ou plusieurs
        // espaces » écrasait la place laissée pour écrire : « 52 085 =    +
        // 2 000 » redevenait « 52 085 = + 2 000 », un énoncé sans trou et sans
        // le moindre sens. On isole donc les blancs longs avant de découper.
        // On ne coupe QUE sur les espaces ordinaires : l'insécable qui borde un
        // trou fait corps avec le signe qu'il protège, et c'est lui qui garde
        // les pointillés à distance du « + » et du « = ».
        const mots = paragraphe.split(/( {3,})|[ \t\r\n]+/).filter(Boolean);
        if (!mots.length) { lignes.push(''); continue; }
        let courante = '';
        for (let mot of mots) {
            // Un blanc se colle au mot précédent sans espace ajouté : c'est
            // lui, l'espace.
            const blanc = / {3,}/.test(mot);
            const essai = (courante && !blanc) ? `${courante} ${mot}` : courante + mot;
            if (mes(essai, taille) <= largeur) { courante = essai; continue; }
            if (courante) { lignes.push(courante); courante = ''; }
            while (mes(mot, taille) > largeur && mot.length > 1) {
                let n = 1;
                while (n < mot.length && mes(mot.slice(0, n + 1), taille) <= largeur) n++;
                lignes.push(mot.slice(0, n));
                mot = mot.slice(n);
            }
            courante = mot;
        }
        if (courante) lignes.push(courante);
    }
    return lignes;
}

/** Hauteur qu'occupera un bloc, une fois ses lignes connues. */
function hauteurBloc(bloc, o) {
    const corps = bloc.lignes.length * o.interligne;
    // Un INTERTITRE n'a pas de ligne à remplir : il n'occupe que son texte et
    // un peu d'air. Il doit malgré tout occuper sa place — un titre posé « par
    // dessus » la mise en page atterrit sur la première question de sa
    // section, ce qui est exactement ce qui arrive quand on le dessine après
    // coup.
    if (bloc.titre) return corps + o.interligne * 0.5;
    const choix = bloc.choix ? o.interligne : 0;
    return corps + choix + o.ligneReponse;
}

/**
 * Répartit les questions en pages et en colonnes.
 *
 * @param {Array<{texte:string, choix?:string[]}>} questions
 * @param {Object} opts     - voir DEFAUTS, plus { avecChoix }
 * @param {(texte:string, taille:number)=>number} mesurer - largeur en mm
 * @returns {{pages: Array<{blocs: Array}>, colonneW: number, zone: Object}}
 */
export function composerFiche(questions, opts, mesurer) {
    const o = { ...DEFAUTS, ...(opts || {}) };
    // Jusqu'à SIX colonnes : trois suffisent pour des questions à répondre,
    // mais la feuille de solutions compacte en demande cinq — c'est elle qui
    // doit tenir sur une seule page pendant qu'on corrige.
    const colonnes = Math.max(1, Math.min(6, o.colonnes));
    // La feuille de solutions suit l'orientation de la fiche : on ne corrige
    // pas un contrôle en paysage avec un corrigé en portrait.
    const pg = o.page || pageDe(o.orientation);
    const zone = {
        x: pg.marge,
        y: pg.marge + pg.enteteH,
        w: pg.w - pg.marge * 2,
        h: pg.h - pg.marge * 2 - pg.enteteH - pg.piedH
    };
    const colonneW = (zone.w - o.gouttiere * (colonnes - 1)) / colonnes;
    const texteW = colonneW - o.numeroL;

    // Les blocs, mesurés une fois pour toutes : la répartition en colonnes a
    // besoin de connaître les hauteurs avant de décider où couper.
    const prepares = questions.map((q) => {
        const estTitre = !!q.titre;
        const bloc = {
            titre: estTitre,
            lignes: couperEnLignes(q.texte, texteW, o.taille, mesurer),
            choix: (!estTitre && o.avecChoix && q.choix && q.choix.length) ? q.choix.slice() : null,
            reponse: q.reponse
        };
        bloc.h = hauteurBloc(bloc, o);
        // Un intertitre ne reste jamais seul en bas d'une colonne : on exige
        // la place d'au moins une question derrière lui.
        bloc.besoin = estTitre ? bloc.h + o.interligne * 2 + o.ligneReponse : bloc.h;
        return bloc;
    });

    /**
     * Pose tous les blocs en coupant les colonnes à `limite` de haut.
     * Séparé du reste pour pouvoir être RELANCÉ avec d'autres limites : c'est
     * ainsi qu'on trouve la hauteur qui équilibre les colonnes.
     */
    const poser = (limite) => {
        const pages = [];
        let page = { blocs: [] };
        let col = 0;
        let y = zone.y;
        // La numérotation ignore les intertitres : elle compte les QUESTIONS,
        // et elle est continue d'une section à l'autre — « exercice 2,
        // question 14 » se retrouve d'un coup d'œil quand on corrige.
        let numero = 0;
        for (const modele of prepares) {
            const bloc = { ...modele };
            if (!bloc.titre) numero++;
            bloc.n = numero;
            // Une question ne se coupe jamais entre deux colonnes : on préfère
            // un blanc en bas de colonne à un énoncé dont la fin est ailleurs.
            if (y + bloc.besoin > zone.y + limite && page.blocs.length) {
                col++;
                if (col >= colonnes) { pages.push(page); page = { blocs: [] }; col = 0; }
                y = zone.y;
            }
            bloc.x = zone.x + col * (colonneW + o.gouttiere);
            bloc.y = y;
            bloc.largeur = colonneW;
            bloc.texteX = bloc.x + o.numeroL;
            bloc.texteW = texteW;
            // La ligne de pointillés se pose sous la dernière ligne de l'énoncé.
            bloc.reponseY = bloc.titre ? null : y + bloc.lignes.length * o.interligne
                + (bloc.choix ? o.interligne : 0) + o.ligneReponse * 0.55;
            page.blocs.push(bloc);
            y += bloc.h + o.entreQuestions;
        }
        if (page.blocs.length) pages.push(page);
        return pages;
    };

    // COLONNES ÉQUILIBRÉES. Le remplissage glouton descend une colonne jusqu'en
    // bas avant d'attaquer la suivante : soixante réponses courtes tenaient
    // ainsi sur deux colonnes et laissaient les trois autres vides, avec une
    // feuille aux trois cinquièmes blanche.
    //
    // On cherche donc la PLUS PETITE hauteur de colonne qui ne coûte pas une
    // page de plus, par dichotomie sur la même fonction de pose. Le résultat
    // est exact : les colonnes se remplissent également, et jamais au prix
    // d'une feuille supplémentaire.
    let pages = poser(zone.h);
    if (o.equilibrer && pages.length) {
        const cible = pages.length;
        let bas = 0, haut = zone.h, meilleur = pages;
        for (let i = 0; i < 14; i++) {
            const milieu = (bas + haut) / 2;
            const essai = poser(milieu);
            if (essai.length <= cible) { meilleur = essai; haut = milieu; } else { bas = milieu; }
        }
        pages = meilleur;
    }
    return { pages, colonneW, zone, opts: o, colonnes, page: pg };
}

// --- La fiche en BLOCS D'EXERCICES -------------------------------------------
//
// La mise en page « professionnelle » d'une fiche de mathématiques, celle des
// manuels et des générateurs d'exercices : chaque exercice est un BLOC pleine
// largeur avec son bandeau (« Exercice 1 — Les compléments à 10 »), sa
// consigne, puis ses questions. Pas de colonnes à l'échelle de la page — une
// question de l'exercice 2 ne se retrouve jamais à côté d'une question de
// l'exercice 1.
//
// À l'INTÉRIEUR d'un bloc en revanche, les questions courtes se rangent à
// plusieurs par ligne : vingt « 7 × 8 = … » l'un sous l'autre gaspilleraient
// une page entière. Le nombre de colonnes internes se DÉDUIT de la longueur
// des questions (toutes doivent tenir sur une ligne avec de la place pour
// répondre), il ne se règle pas.

export const DEFAUTS_BLOCS = {
    taille: 3.9,          // corps du texte, en mm
    tailleConsigne: 3.3,
    interligne: 5.2,
    numeroL: 7.5,         // gouttière du « 12. »
    gouttiere: 9,         // entre deux colonnes internes
    // LES POINTILLÉS : DEUX BORNES, ET LA SECONDE MANQUAIT.
    //
    // `repMin` dit à partir de quand on peut écrire la réponse SUR la ligne de
    // l'énoncé plutôt que dessous. Il valait 16 mm : à quatre colonnes sur une
    // A4 portrait, une cellule fait 38 mm, et il n'en restait pas 16 derrière
    // « 10 × 9 = ». Toutes les réponses passaient donc à la ligne du dessous —
    // c'est-à-dire qu'une feuille de calcul mental ne pouvait PAS s'imprimer
    // en quatre colonnes, quoi qu'en demande le professeur. Onze millimètres
    // suffisent pour deux ou trois chiffres écrits à la main.
    //
    // `repMax` est nouveau : les pointillés couraient jusqu'au bord de la
    // cellule. Sur une réponse à deux chiffres, cela fait cinq centimètres de
    // pointillés pour écrire « 42 » — et les colonnes se touchent
    // visuellement, chaque trait venant buter sur la question d'à côté. Rémy :
    // « quatre colonnes avec un peu moins de pointillés », « toujours faire
    // attention que les colonnes ne débordent pas ». On borne, et le blanc
    // gagné sépare les colonnes bien mieux qu'une gouttière.
    repMin: 11,           // longueur minimale de pointillés sur la même ligne
    repMax: 30,           // et la longueur au-delà de laquelle ils ne servent plus
    ligneReponse: 7,      // hauteur d'une réponse écrite SOUS la question
    entreQuestions: 4.4,  // entre deux rangées de questions
    bandeauH: 8,          // le bandeau « Exercice N »
    apresBandeau: 3.4,
    entreExercices: 7,
    grillesParLigne: 'auto', // pour les exercices à grilles ; 'auto' remplit la largeur
    grilleMax: 92,           // côté maximal d'une grille, en mm
    // ENTRE DEUX GRILLES, MOINS D'AIR QU'ENTRE DEUX COLONNES DE TEXTE. Deux
    // colonnes de questions ont besoin d'une gouttière large pour que l'œil ne
    // saute pas de l'une à l'autre en cours de ligne ; deux grilles sont des
    // objets fermés, que leur cadre sépare déjà. Ce qu'on leur retire en marge,
    // elles le prennent en taille — et une grille remplie à la main ne se
    // discute pas : plus grande, elle est plus facile.
    gouttiereGrilles: 5,
    grilleMin: 46,           // en dessous, une grille 9×9 n'est plus remplissable
    celluleMin: 46,          // largeur minimale d'une cellule de question, en mm
    colonnesMax: 6,          // le plafond absolu, toutes orientations confondues
    champs: false,           // champs de formulaire remplissables dans le PDF
    champH: 6,               // hauteur d'un champ de saisie, en mm
    // LA NUMÉROTATION. « continue » suit la feuille du début à la fin
    // (« question 27 » se trouve sans compter les exercices) ; « exercice »
    // repart à 1 à chaque exercice, ce qui est la convention des manuels et
    // des contrôles — « exercice 3, question 2 » y est plus court à dire.
    numerotation: 'continue'
};

/**
 * Compose une fiche en blocs d'exercices.
 *
 * @param {Array<{titre:string, consigne?:string, points?:number,
 *                questions:Array<{texte:string, choix?:string[], reponse?:*}>}>} exos
 * @param {Object} opts - DEFAUTS_BLOCS, plus { interrogation, avecChoix }
 * @param {(texte:string, taille:number)=>number} mesurer
 * @returns {{pages: Array<{items: Array}>, zone: Object, opts: Object, nbQuestions: number}}
 *
 * Chaque item d'une page est positionné en mm et typé :
 *   { type:'exo', n, titre, points, x, y, w, h, suite }
 *   { type:'consigne', lignes, x, y, w }
 *   { type:'q', n, lignes, x, y, texteX, texteW, choix, choixY, rep:{x,y,w}|null }
 */
export function composerBlocs(exos, opts, mesurer) {
    const o = { ...DEFAUTS_BLOCS, ...(opts || {}) };
    const page0 = o.page || pageDe(o.orientation);
    // LA PREMIÈRE PAGE PEUT AVOIR UN EN-TÊTE PLUS HAUT QUE LES SUIVANTES.
    //
    // Le cartouche « Note / Commentaire » d'une interrogation ne s'imprime
    // qu'une fois, sur la première page : lui réserver ses quinze millimètres
    // sur les quatre pages du contrôle, c'est jeter une bande blanche en haut
    // de chacune — soit, sur une feuille en trois colonnes, cinq questions
    // perdues pour un cadre qui n'est pas là.
    //
    // Le BAS, lui, ne bouge pas : il ne dépend pas de la hauteur de l'en-tête.
    const enteteH1 = Math.max(page0.enteteH, o.enteteH1 || 0);
    const zone = {
        x: page0.marge,
        y: page0.marge + enteteH1,
        w: page0.w - page0.marge * 2,
        h: page0.h - page0.marge * 2 - enteteH1 - page0.piedH
    };
    const basPage = page0.h - page0.marge - page0.piedH;
    // COMBIEN DE COLONNES AU MAXIMUM ? Cela dépend de la largeur réelle du
    // papier, pas d'un chiffre écrit une fois pour toutes : une page couchée
    // en tient davantage. On compte en largeur minimale de cellule — au-dessous
    // de `celluleMin`, un « 137 − 48 = » et ses pointillés ne rentrent plus.
    // En interrogation on ÉCRIT sur la feuille : les cellules sont plus larges
    // et il y en a donc moins.
    const largeurCell = o.interrogation ? o.celluleMin * 1.6 : o.celluleMin;
    const maxCols = Math.max(1, Math.min(o.colonnesMax, Math.floor(zone.w / largeurCell)));
    const ligneRep = o.interrogation ? Math.max(o.ligneReponse, 12) : o.ligneReponse;

    const pages = [];
    let page = { items: [] };
    /** Le haut utile de la page en cours : plus bas sur la première si elle
     *  porte le cartouche, au ras de l'en-tête ordinaire sur les suivantes. */
    const haut = () => page0.marge + (pages.length === 0 ? enteteH1 : page0.enteteH);
    let y = haut();
    // DEUX COMPTEURS, ET C'EST NÉCESSAIRE.
    //
    // `numero` est ce qui s'IMPRIME : il repart à 1 à chaque exercice quand on
    // le demande, et il saute les exercices qu'on a choisi de ne pas numéroter.
    // `total`, lui, ne s'arrête jamais : il compte le travail réel, sert de
    // retour à l'appelant, et surtout nomme les champs du PDF remplissable —
    // deux champs de même nom dans un PDF n'en font qu'un, et l'élève verrait
    // sa réponse se recopier toute seule d'une question à l'autre.
    let numero = 0;
    let total = 0;
    // Ce que « auto » a finalement décidé, exercice par exercice : l'interface
    // le rend au professeur, pour qu'il sache de quoi il part avant de forcer.
    const colonnesParExo = [];

    // On ne pousse JAMAIS une page vide : une feuille blanche au milieu d'un
    // PDF ressemble à une erreur d'impression, et le professeur la photocopie
    // trente fois avant de s'en apercevoir.
    const nouvellePage = () => {
        if (page.items.length) pages.push(page);
        page = { items: [] };
        y = haut();
    };

    exos.forEach((exo, iExo) => {
        const questions = exo.questions || [];
        const grilles = exo.grilles || [];
        if (!questions.length && !grilles.length) return;
        // Numéroter ou non, exercice par exercice. Six grilles de sudoku n'ont
        // que faire d'être appelées « 7. » à « 12. » : ce qu'on écrit dessus
        // n'est pas une réponse à une question, c'est la grille elle-même.
        const numerote = exo.numeroter !== false;
        // LA GOUTTIÈRE DU NUMÉRO SUIT LA LARGEUR DE LA CELLULE. Sept
        // millimètres et demi devant « 12. » sont justes dans une colonne
        // large ; dans une cellule de vingt-deux millimètres — six colonnes de
        // comparaisons — c'est le tiers de la place, pris à l'énoncé.
        // Elle ne descend jamais sous la largeur du plus grand numéro de
        // l'exercice, plus une espace : « 240.3,9 » collés, c'est illisible, et
        // c'est ce qui arrive quand la gouttière est calculée sans regarder ce
        // qu'on va y écrire.
        const dernierNum = numero + (questions.length || grilles.length);
        const largeurNum = mesurer(`${dernierNum}.`, o.taille) + 1.6;
        const gouttiere = (cellW) => numerote
            ? Math.max(largeurNum, Math.min(o.numeroL, cellW * 0.2))
            : 0;
        let gouttiereNum = numerote ? o.numeroL : 0;
        if (o.numerotation === 'exercice') numero = 0;

        // --- UN EXERCICE EN GRILLES (sudoku, binairo, garam, mathdoku) ------
        //
        // Ces exercices n'ont pas de « questions » : ils ont des grilles, qui
        // occupent un carré et qu'on remplit dessus. Ils étaient jusqu'ici
        // renvoyés à « écran seulement », ce qui est faux — ce sont justement
        // ceux qu'on fait le plus volontiers sur papier : on y rature, on note
        // ses candidats, on gomme.
        //
        // Elles se rangent en rangées, la taille du carré déduite du nombre
        // par ligne. On ne les coupe jamais : une grille à cheval sur deux
        // pages est une grille perdue.
        if (grilles.length) {
            // COMBIEN DE GRILLES PAR LIGNE. Le professeur le choisit exercice
            // par exercice — quatre mathdokus 4×4 sur une ligne en paysage,
            // deux sudokus 9×9 en portrait, ce ne sont pas les mêmes feuilles.
            // « auto » remplit la largeur sans descendre sous `grilleMin`, en
            // dessous de quoi les cases deviennent trop petites pour écrire.
            const voulu = exo.grillesParLigne ?? o.grillesParLigne;
            const gap = o.gouttiereGrilles ?? o.gouttiere;
            const tiendraient = Math.max(1, Math.floor((zone.w + gap) / (o.grilleMin + gap)));
            const parLigne = Math.max(1, Math.min(
                grilles.length,
                Number.isFinite(Number(voulu)) && Number(voulu) > 0 ? Number(voulu) : tiendraient
            ));
            // UN BLOC PEUT DEMANDER PLUS QUE LE PLAFOND COMMUN. Une grille de
            // sudoku n'a pas besoin de plus de neuf centimètres — au-delà, on
            // écrit gros pour rien. Un logigramme, lui, pose ses indices À CÔTÉ
            // de sa grille : il lui faut la largeur de la feuille, sinon la
            // moitié droite reste blanche et le texte se serre pour rien.
            const cote = Math.min(
                (zone.w - gap * (parLigne - 1)) / parLigne,
                Number(exo.grilleMax) > 0 ? Number(exo.grilleMax) : (o.grilleMax || 78)
            );
            // TOUS LES BLOCS NE SONT PAS CARRÉS. Une grille l'est ; une figure
            // suivie de trois lignes à rédiger est large et basse. Le bloc
            // déclare sa proportion, et la hauteur s'en déduit.
            const ratio = Number(exo.grilleRatio) > 0 ? Number(exo.grilleRatio) : 1;
            const hauteurBloc2 = cote * ratio;
            colonnesParExo.push(parLigne);
            const consigneLignes = exo.consigne
                ? couperEnLignes(exo.consigne, zone.w - 2, o.tailleConsigne, mesurer)
                : [];
            const enteteH = o.bandeauH + consigneLignes.length * (o.tailleConsigne * 1.45) + o.apresBandeau;
            if (iExo > 0 && page.items.length && y > haut()) y += o.entreExercices - o.entreQuestions;
            if (page.items.length && y + enteteH + hauteurBloc2 > basPage) nouvellePage();

            page.items.push({
                // L'IDENTIFIANT SUIT LE BANDEAU. L'aperçu accroche dessus un
                // engrenage qui ouvre les réglages de CET exercice : sans lui,
                // il faudrait deviner de quel exercice vient un bandeau.
                type: 'exo', n: iExo + 1, suite: false, id: exo.id ?? null,
                titre: exo.titre, points: exo.points ?? null,
                x: zone.x, y, w: zone.w, h: o.bandeauH
            });
            y += o.bandeauH;
            if (consigneLignes.length) {
                page.items.push({ type: 'consigne', lignes: consigneLignes, x: zone.x, y, w: zone.w - 2 });
                y += consigneLignes.length * (o.tailleConsigne * 1.45);
            }
            y += o.apresBandeau;

            for (let debut = 0; debut < grilles.length; debut += parLigne) {
                const rangee = grilles.slice(debut, debut + parLigne);
                if (y + hauteurBloc2 + o.entreQuestions > basPage) {
                    nouvellePage();
                    page.items.push({
                        type: 'exo', n: iExo + 1, suite: true, id: exo.id ?? null,
                        titre: exo.titre, points: null,
                        x: zone.x, y, w: zone.w, h: o.bandeauH
                    });
                    y += o.bandeauH + o.apresBandeau;
                }
                // La rangée est CENTRÉE : plafonnées à `grilleMax`, deux
                // grilles sur une page couchée laissaient tout le vide à
                // droite, comme si la mise en page s'était arrêtée en chemin.
                const largeurRangee = rangee.length * cote + gap * (rangee.length - 1);
                const x0 = zone.x + (zone.w - largeurRangee) / 2;
                rangee.forEach((g, i) => {
                    total++;
                    if (numerote) numero++;
                    const gx = x0 + i * (cote + gap);
                    page.items.push({
                        type: 'grille', n: numerote ? numero : null, cle: g.cle, item: g.item,
                        x: gx, y, taille: cote,
                        // La boîte complète, pour les treillis larges (Garam)
                        // et les blocs qui ne sont pas carrés du tout.
                        boite: { x: gx, y, w: cote, h: hauteurBloc2 }
                    });
                });
                y += hauteurBloc2 + o.entreQuestions;
            }
            return;
        }

        // COMBIEN DE COLONNES INTERNES ?
        //
        // Le professeur tranche, exercice par exercice : vingt calculs en
        // quatre colonnes, six problèmes rédigés sur une seule. C'est la
        // décision de mise en page la plus fréquente, et l'automatisme ne
        // pouvait pas la deviner — il ne connaît ni le niveau de la classe ni
        // la place qu'un élève met à poser une opération.
        //
        // « auto » garde l'ancien comportement : le plus de colonnes possible,
        // à condition que CHAQUE question tienne sur une ligne de sa cellule
        // avec au moins `repMin` de pointillés derrière.
        const voulues = Number(exo.colonnes);
        let cols = 1;
        if (Number.isFinite(voulues) && voulues > 0) {
            cols = Math.max(1, Math.min(o.colonnesMax, Math.round(voulues)));
        } else {
            for (let c = maxCols; c >= 2; c--) {
                if (questions.length < c) continue;
                const cellW = (zone.w - o.gouttiere * (c - 1)) / c;
                const texteW = cellW - gouttiere(cellW) - o.repMin - 2;
                // Un générateur peut PROPOSER des choix sans que la fiche les
                // imprime : seuls les choix réellement imprimés comptent ici.
                if (questions.every(q => (!o.avecChoix || !q.choix)
                    && (q.fractions ? mesureurFractions(mesurer) : mesurer)(q.texte, o.taille) <= texteW)) { cols = c; break; }
            }
        }
        // UNE FRACTION NE SE COUPE PAS EN DEUX LIGNES. Un énoncé de texte qui
        // passe à la ligne reste lisible ; une comparaison de fractions, non :
        // la seconde fraction vient se poser sous la première, et l'on ne sait
        // plus ce qu'on compare. Quand la colonne demandée est trop étroite
        // pour les tenir, on en retire une — le réglage du professeur est un
        // souhait, pas un ordre de rendre la feuille illisible.
        // ET UN ÉNONCÉ À TROU NON PLUS. « 660 +  …  = 1 000 » coupé en deux
        // laisse le trou sur la première ligne et le « = 1 000 » sur la
        // seconde : l'élève écrit dans un blanc dont il ne voit plus la
        // consigne. Un texte ordinaire, lui, passe à la ligne sans dommage —
        // c'est pour cela qu'on ne regarde que les cellules à fraction ou à
        // trou.
        //
        // ET LES RÉPONSES SE RANGENT TOUTES AU MÊME ENDROIT. Sur une fiche
        // d'additions de fractions, « 5/6 + 2/6 = » laissait la place d'écrire
        // derrière, « 9/12 + 4/12 = » non : une question sur deux voyait sa
        // réponse basculer sous l'énoncé, et la feuille prenait l'air d'un
        // brouillon. Une colonne de moins remet tout le monde sur la ligne ;
        // c'est plus lisible ET plus dense que de doubler la hauteur de chaque
        // question. On ne le tente que sur un exercice homogène — vingt calculs
        // du même moule — car dans des problèmes rédigés, longs et courts
        // mélangés, la réponse sous l'énoncé est de toute façon la règle.
        let cellW, texteW, cellules;
        for (;;) {
            cellW = (zone.w - o.gouttiere * (cols - 1)) / cols;
            gouttiereNum = gouttiere(cellW);
            texteW = cellW - gouttiereNum;
            cellules = mesurerCellules();
            if (cols <= 1) break;
            if (cellules.some(c => c.lignes.length > 1 && (c.fractions || c.trou))) { cols--; continue; }
            if (cols > 2 && exerciceHomogene(cellules) && !reponsesRegulieres(cellules)) { cols--; continue; }
            break;
        }
        // Faute de mieux, on aligne par le bas : toutes les réponses dessous.
        if (exerciceHomogene(cellules) && !reponsesRegulieres(cellules)) {
            for (const c of cellules) if (c.memeLigne) { c.memeLigne = false; c.h += ligneRep; }
        }
        colonnesParExo.push(cols);

        // Les cellules, pré-mesurées : la pagination a besoin des hauteurs
        // avant de poser quoi que ce soit.
        function mesurerCellules() { return questions.map((q, iQ) => {
            const mes = q.fractions ? mesureurFractions(mesurer) : mesurer;
            const lignes = couperEnLignes(texteImprime(q.texte, q.reponse), texteW, o.taille, mes);
            const choix = (o.avecChoix && q.choix && q.choix.length) ? q.choix.slice() : null;
            // LE TROU DANS L'ÉNONCÉ. « 82 041 = 80 000 +      + 40 + 1 » porte
            // déjà la place où l'on écrit : lui ajouter des pointillés au bout
            // ferait deux endroits pour une seule réponse.
            let trou = null;
            for (let i = 0; i < lignes.length && !trou; i++) {
                const t = trouDe(lignes[i]);
                if (t) trou = { ...t, ligne: i };
            }
            // La réponse va SUR la ligne de l'énoncé quand il reste assez de
            // pointillés ; sinon dessous, en pleine largeur de cellule.
            //
            // UNE INTERROGATION SUIT LA MÊME RÈGLE QUE LE RESTE.
            //
            // Elle renvoyait TOUTES les réponses à la ligne du dessous, même
            // « quatre cent cinquante-neuf = » dont la réponse tient en trois
            // chiffres : une demi-page de blanc, et deux fois moins de
            // questions par feuille. L'idée était de laisser de la place pour
            // écrire — mais la place, ce sont les pointillés qui vont JUSQU'AU
            // BOUT DE LA COLONNE, et ils y vont déjà. Quand l'énoncé ne laisse
            // pas de quoi écrire, la réponse passe dessous : c'est la même
            // règle, et elle suffit.
            const memeLigne = !trou && !choix && lignes.length === 1
                && cellW - gouttiereNum - mes(lignes[0], o.taille) - 2 >= o.repMin;
            // LES FRACTIONS S'ÉCRIVENT EN COLONNE, comme au tableau : le
            // numérateur au-dessus du trait, le dénominateur dessous. Il leur
            // faut donc plus d'une ligne de hauteur, et le texte descend
            // d'autant pour que le numérateur ne monte pas dans la question du
            // dessus.
            const supp = q.fractions ? o.interligne * 0.85 : 0;
            const h = supp + lignes.length * o.interligne
                + (choix ? o.interligne : 0)
                + (trou || memeLigne ? 0 : ligneRep);
            // `iQ` : le rang de la question DANS SON EXERCICE. C'est la seule
            // chose qui permette, depuis l'aperçu, de désigner celle qu'on
            // veut retirer ou retirer au sort — le numéro imprimé, lui, court
            // sur toute la feuille et saute les exercices non numérotés.
            return { lignes, choix, memeLigne, trou, h, dy: supp, mes, iQ, fractions: !!q.fractions };
        }); }

        /** Vingt questions du même moule : une ligne, pas de trou, pas de QCM. */
        function exerciceHomogene(cells) {
            return cells.length > 1
                && cells.every(c => !c.trou && !c.choix && c.lignes.length === 1);
        }
        /** Les réponses sont-elles toutes au même endroit ? */
        function reponsesRegulieres(cells) {
            return cells.every(c => c.memeLigne) || cells.every(c => !c.memeLigne);
        }

        const consigneLignes = exo.consigne
            ? couperEnLignes(exo.consigne, zone.w - 2, o.tailleConsigne, mesurer)
            : [];
        const enteteH = o.bandeauH + consigneLignes.length * (o.tailleConsigne * 1.45) + o.apresBandeau;

        // L'exercice commence-t-il sur cette page ? Il faut le bandeau, la
        // consigne et au moins la première rangée — un bandeau seul en bas de
        // page est exactement ce qui fait « amateur ».
        const premiereRangeeH = Math.max(...cellules.slice(0, cols).map(c => c.h));
        if (iExo > 0 && page.items.length && y > haut()) y += o.entreExercices - o.entreQuestions;
        if (page.items.length && y + enteteH + premiereRangeeH > basPage) nouvellePage();

        const poserBandeau = (suite) => {
            page.items.push({
                type: 'exo', n: iExo + 1, suite, id: exo.id ?? null,
                titre: exo.titre, points: exo.points ?? null,
                x: zone.x, y, w: zone.w, h: o.bandeauH
            });
            y += o.bandeauH;
            if (!suite && consigneLignes.length) {
                page.items.push({ type: 'consigne', lignes: consigneLignes, x: zone.x, y, w: zone.w - 2 });
                y += consigneLignes.length * (o.tailleConsigne * 1.45);
            }
            y += o.apresBandeau;
        };
        poserBandeau(false);

        // Les rangées, de gauche à droite puis de haut en bas : l'ordre de
        // lecture naturel, et la numérotation le suit.
        for (let debut = 0; debut < cellules.length; debut += cols) {
            const rangee = cellules.slice(debut, debut + cols);
            const rangeeH = Math.max(...rangee.map(c => c.h));
            if (y + rangeeH > basPage) {
                nouvellePage();
                poserBandeau(true);
            }
            rangee.forEach((cell, iCell) => {
                total++;
                if (numerote) numero++;
                const x = zone.x + iCell * (cellW + o.gouttiere);
                const texteX = x + gouttiereNum;
                let rep = null;
                if (cell.trou) {
                    // On écrit DANS l'énoncé, à l'endroit du trou : le trait à
                    // remplir se pose sous ce blanc, et le champ du PDF dessus.
                    const ligne = cell.lignes[cell.trou.ligne];
                    const avant = cell.mes(ligne.slice(0, cell.trou.debut), o.taille);
                    const largeur = cell.mes(ligne.slice(cell.trou.debut, cell.trou.fin), o.taille);
                    rep = {
                        x: texteX + avant,
                        y: y + cell.dy + o.taille + cell.trou.ligne * o.interligne + 0.9,
                        w: largeur, dansLeTexte: true
                    };
                } else if (cell.memeLigne) {
                    // Les pointillés continuent la ligne d'écriture : même
                    // hauteur que la ligne de base du texte.
                    const finTexte = texteX + cell.mes(cell.lignes[0], o.taille) + 2;
                    rep = {
                        x: finTexte, y: y + cell.dy + o.taille,
                        w: Math.min(x + cellW - finTexte, o.repMax)
                    };
                } else {
                    rep = {
                        x: texteX,
                        y: y + cell.dy + cell.lignes.length * o.interligne
                            + (cell.choix ? o.interligne : 0) + ligneRep * 0.62,
                        w: texteW
                    };
                }
                // LA BOÎTE DE SAISIE, pour la fiche remplissable. Les
                // pointillés ne sont qu'un trait de base ; un champ de
                // formulaire, lui, a une hauteur. On la pose À CHEVAL sur ce
                // trait — c'est là que l'élève écrirait à la main, donc c'est
                // là que le curseur doit clignoter.
                rep.h = Math.min(o.champH, ligneRep || o.champH);
                rep.champY = rep.y - rep.h * 0.78;
                rep.nom = `q${total}`;
                page.items.push({
                    type: 'q', n: numerote ? numero : null,
                    // D'où vient cette question : de quel exercice, à quel rang.
                    exoId: exo.id ?? null, iQ: cell.iQ,
                    lignes: cell.lignes, x, y, dy: cell.dy, texteX, texteW,
                    fractions: cell.fractions,
                    choix: cell.choix,
                    choixY: cell.choix ? y + cell.dy + cell.lignes.length * o.interligne : null,
                    rep
                });
            });
            y += rangeeH + o.entreQuestions;
        }
    });

    if (page.items.length) pages.push(page);
    return { pages, zone, opts: o, nbQuestions: total, page: page0, colonnes: colonnesParExo };
}

/**
 * LA FEUILLE DE SOLUTIONS, en trois modes — parce qu'on ne s'en sert pas de la
 * même façon selon le moment.
 *
 *   COMPACT   « 1. 56  2. 42  3. 7 » — cinq colonnes, rien d'autre que les
 *             réponses. C'est la feuille qu'on tient d'une main en corrigeant
 *             trente copies : on cherche un numéro et on lit un nombre. Y
 *             ajouter l'énoncé ferait tourner la page, donc perdre le fil.
 *   NORMAL    « 1. 7 × 8 = 56 ». L'énoncé rappelé sert quand on corrige
 *             plusieurs jours après, ou quand une copie répond à côté et qu'on
 *             veut vérifier de quelle question il s'agissait.
 *   DÉTAILLÉ  l'énoncé, la réponse et l'EXPLICATION du générateur. C'est la
 *             feuille qu'on distribue après le contrôle, ou qu'on projette
 *             pour la correction collective.
 *
 * Les trois lisent les mêmes questions : c'est le texte de chaque ligne et le
 * nombre de colonnes qui changent, pas les données.
 */
export const MODES_SOLUTION = ['compact', 'normal', 'detaille'];

/**
 * LE BARÈME D'UNE INTERROGATION, réparti tout seul sur la note.
 *
 * Un contrôle « sur 20 » dont les exercices totalisent 38 points n'est pas une
 * proposition à discuter, c'est une faute d'inattention que le professeur
 * devra rattraper à la main. On répartit donc au prorata du travail demandé —
 * le nombre de questions — puis on distribue les points restants aux exercices
 * dont la part a été le plus rabotée par l'arrondi. La somme vaut exactement
 * la note, sauf s'il y a plus d'exercices que de points : on laisse alors un
 * point à chacun, et c'est à l'appelant de le signaler.
 *
 * @param {Object} quantites - nombre de questions par identifiant d'exercice
 * @param {number} noteSur   - le total visé
 * @returns {Object} les points par identifiant
 */
export function repartirBareme(quantites, noteSur) {
    const points = {};
    const actifs = Object.keys(quantites).filter(id => quantites[id] > 0);
    Object.keys(quantites).forEach(id => { points[id] = 0; });
    if (!actifs.length) return points;

    const sur = Math.max(1, Math.round(noteSur) || 20);
    const masse = actifs.reduce((s, id) => s + quantites[id], 0);
    const parts = actifs.map(id => ({ id, exact: (quantites[id] / masse) * sur }));
    parts.forEach(p => { points[p.id] = Math.max(1, Math.floor(p.exact)); });

    // Le reste ne peut être que positif : chaque part a été arrondie vers le
    // bas. Il ne devient négatif que dans le cas dégénéré « plus d'exercices
    // que de points », où le plancher d'un point l'emporte — on n'y touche pas.
    let reste = sur - parts.reduce((s, p) => s + points[p.id], 0);
    parts.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
    for (let i = 0; reste > 0; i++, reste--) points[parts[i % parts.length].id]++;
    return points;
}

export function composerSolutions(questions, opts, mesurer) {
    const mode = MODES_SOLUTION.includes(opts && opts.mode) ? opts.mode : 'compact';
    const colonnes = { compact: 5, normal: 3, detaille: 1 }[mode];
    const o = {
        ...DEFAUTS, ...(opts || {}),
        colonnes: Math.max(1, Math.min(5, (opts && opts.colonnesSolutions) || colonnes))
    };

    /**
     * L'explication ne fait-elle que redire l'énoncé complété ?
     *
     * On compare ce qui compte — les chiffres, les signes et les lettres —
     * en ignorant les espaces, la ponctuation finale et la casse : « 7 × 8 =
     * 56. » et « 7 × 8 = » + « 56 » sont alors le même texte, et l'on n'écrit
     * pas deux fois la même ligne.
     */
    const noyau = (t) => String(t ?? '').toLowerCase()
        // Les blancs, la ponctuation de fin, les marques de réponse et le
        // « ? » de l'énoncé d'écran : rien de tout cela ne change ce qui est
        // DIT, et tout cela suffisait à faire croire deux textes différents.
        .replace(/[\u0001\u0002]/g, '')
        .replace(/[\s\u00A0\u202F.?…]/g, '');
    // On compare l'explication à LA LIGNE DÉJÀ COMPOSÉE — énoncé + réponse en
    // place —, pas au texte brut : c'est elle qui sera imprimée juste au-dessus.
    const redit = (expl, pose) => noyau(expl) === noyau(pose);

    // La ligne d'une réponse. La FLÈCHE a disparu : elle n'existe pas dans les
    // polices d'un PDF, et « 7 × 8 = 56 » est de toute façon ce qu'on écrit au
    // tableau en corrigeant.
    const ligneDe = (q, n) => {
        const rep = q.reponse ?? '';
        const tete = n == null ? '' : `${n}. `;      // un exercice non numéroté n'invente pas de numéro
        if (mode === 'compact') return `${tete}${DEBUT_REP}${rep}${FIN_REP}`;
        // La réponse va DANS le trou de l'énoncé quand il y en a un : la
        // recopier au bout donnait « 92 202 =    + 2 000 + 200 + 2 = 90 000 »,
        // une égalité fausse avec le trou toujours vide.
        const pose = reponseEnPlace(nettoyer(q.texte), rep);
        if (mode === 'normal') return `${tete}${pose}`;
        // UNE EXPLICATION QUI REDIT L'ÉNONCÉ N'EXPLIQUE RIEN.
        //
        // « 7 × 8 = » suivi de « 7 × 8 = 56. » écrit deux fois le même calcul,
        // et la seconde ligne n'apprend rien de plus que la première complétée.
        // Rémy : « tu marques deux fois le calcul = la solution, ça n'a pas
        // d'intérêt ». On la retire quand elle ne fait que reprendre l'énoncé
        // et sa réponse ; on la garde dès qu'elle dit AUTRE CHOSE — « car
        // 4 × 9 = 36 », la cascade d'une priorité, le chemin d'un problème.
        const expl = (q.explication || '').trim();
        return `${tete}${pose}${expl && !redit(expl, pose) ? '\n' + expl : ''}`;
    };

    // LES SECTIONS. Une feuille de solutions qui aligne « 1. 2  2. 9  3. 4 »
    // sur soixante numéros ne dit plus à quel exercice on en est : le
    // professeur compte les lignes pour retrouver où commence l'exercice 3.
    // Un intertitre par exercice — avec son barème quand c'est une
    // interrogation — le lui dit d'un coup d'œil.
    const sections = (opts && opts.sections) || null;
    const items = [];
    if (sections && sections.length) {
        // LE CORRIGÉ COMPTE COMME LA FEUILLE. Si les questions repartent à 1 à
        // chaque exercice, le corrigé aussi — sinon le professeur corrige la
        // question 14 d'une feuille qui n'en a que huit par exercice. Et un
        // exercice non numéroté sur la feuille ne l'est pas davantage ici : on
        // lit alors les réponses dans l'ordre, ce qui est exactement ce qu'on
        // fait devant six grilles de sudoku.
        let n = 0;
        sections.forEach((sec, i) => {
            const qs = sec.questions || [];
            if (!qs.length) return;
            const bareme = sec.points ? ` — ${sec.points} pt${sec.points > 1 ? 's' : ''}` : '';
            items.push({ titre: true, texte: `Exercice ${i + 1} — ${sec.titre}${bareme}` });
            if (o.numerotation === 'exercice') n = 0;
            const numerote = sec.numeroter !== false;
            qs.forEach(q => items.push({ texte: numerote ? ligneDe(q, ++n) : ligneDe(q, null) }));
        });
    } else {
        questions.forEach((q, i) => items.push({ texte: ligneDe(q, i + 1) }));
    }

    // En détaillé les entrées respirent : deux explications collées l'une à
    // l'autre se lisent comme un seul paragraphe.
    const entre = mode === 'detaille' ? 2.6 : 1.4;
    // LES FRACTIONS S'EMPILENT SUR LE CORRIGÉ AUSSI. La feuille de questions
    // les écrit numérateur sur dénominateur ; le corrigé les écrivait « 5/7 »,
    // à la barre oblique. Deux écritures de la même fraction dans le même
    // document, et celle du corrigé n'est pas celle qu'on demande à l'élève.
    // Il faut aussi les MESURER comme telles, sans quoi la ligne passe à la
    // ligne pour une largeur qu'elle n'occupe pas.
    const avecFractions = (sections && sections.length
        ? sections.flatMap(sec => sec.questions || [])
        : questions).some(q => q && q.fractions);
    // UNE FRACTION EMPILÉE EST HAUTE COMME DEUX LIGNES. L'interligne du
    // corrigé est calculé pour du texte : les fractions du numéro 6 venaient
    // s'écrire par-dessus celles du numéro 7. La feuille de questions le sait
    // déjà — elle ajoute sa marge —, le corrigé l'ignorait.
    return composerFiche(items, {
        ...o, ligneReponse: 0, numeroL: 0,
        interligne: o.interligne * (avecFractions ? 1.5 : 1),
        entreQuestions: entre + (avecFractions ? o.interligne * 0.9 : 0),
        fractions: avecFractions,
        // Le compact n'a de sens que rempli : c'est la feuille d'UNE page.
        equilibrer: mode !== 'detaille'
    }, avecFractions ? mesureurFractions(mesurer) : mesurer);
}

/**
 * Un énoncé sur une feuille de solutions tient sur une ligne : pas de retours.
 *
 * Le signe égal final tombe avec le point d'interrogation : c'est la FLÈCHE
 * qui mène à la réponse sur cette feuille-là. « 7 × 8 → 56 » se lit d'un trait,
 * « 7 × 8 = → 56 » fait buter l'œil sur deux signes qui disent la même chose.
 */
function nettoyer(texte) {
    const t = texteImprime(String(texte ?? '').replace(/\s*\n\s*/g, ' '));
    const trou = trouDe(t);
    if (!trou) return t.replace(/\s*=\s*$/, '').trim();
    // UN ÉNONCÉ À TROU GARDE SON TROU, OÙ QU'IL SOIT — en tête (« ? × 2 = 10 »),
    // au milieu (« 92 202 = ? + 2 000 »), ou en queue (« 5 053 = 5 000 + 50 +
    // ? »). Le rognage l'emportait aux deux bouts, et le corrigé écrivait
    // « × 2 = 10 = 5 » ou « 5 000 + 50 + = 3 » : l'énoncé amputé de sa
    // question, et la réponse posée derrière un second signe égal.
    //
    // On rogne donc CHAQUE CÔTÉ du trou séparément, jamais le trou lui-même.
    return t.slice(0, trou.debut).replace(/^[\s\u00A0]+/, '')
        + t.slice(trou.debut, trou.fin)
        + t.slice(trou.fin).replace(/[\s\u00A0]+$/, '');
}

/**
 * LA RÉPONSE SE MET LÀ OÙ ELLE MANQUE — pas au bout de la ligne.
 *
 * Le corrigé écrivait la réponse en queue d'énoncé, quel que soit l'endroit du
 * trou. Sur un complément à dix, cela passait encore ; sur une décomposition,
 * cela donnait ceci :
 *
 *     92 202 =        + 2 000 + 200 + 2 = 90 000
 *
 * — une égalité fausse, avec le trou toujours béant et la réponse posée
 * derrière un second signe égal. Le professeur qui corrige lit une ligne qui
 * ne veut rien dire, et l'élève à qui on distribue le corrigé encore moins.
 *
 * La réponse va donc DANS le trou quand il y en a un, et seulement au bout
 * quand l'énoncé n'en a pas. Elle est encadrée de deux marques invisibles —
 * on ne les mesure pas et on ne les imprime pas — qui disent aux deux rendus
 * quelle partie de la ligne est la réponse : c'est elle qu'on souligne, pour
 * qu'on la trouve sans relire.
 */
export const DEBUT_REP = '\u0001';
export const FIN_REP = '\u0002';

export function reponseEnPlace(texte, reponse) {
    const rep = String(reponse ?? '');
    const t = String(texte ?? '');
    const marquee = DEBUT_REP + rep + FIN_REP;
    const trou = trouDe(t);
    if (trou) {
        // Le trou est DÉJÀ bordé des insécables que `texteImprime` a posées
        // pour l'écarter du « + » et du « = » : en rajouter doublait l'écart,
        // et la réponse flottait au milieu d'un blanc.
        return t.slice(0, trou.debut) + marquee + t.slice(trou.fin);
    }
    // UN SIGNE « = » APRÈS UN POINT D'INTERROGATION N'EST PAS DU FRANÇAIS.
    // « Combien Inès a-t-elle de bonbons en tout ? = 67 bonbons » : le « = »
    // convient à un calcul, pas à une question posée en toutes lettres. Les
    // problèmes sont le seul exercice où l'énoncé est une phrase, et c'est
    // aussi le seul où l'on écrit une phrase de réponse.
    const propre = nettoyer(t);
    if (/[?!.:]$/.test(propre.trim())) return `${propre} Réponse : ${marquee}`;
    return `${propre} = ${marquee}`;
}

/**
 * Les morceaux d'une ligne de corrigé : { texte, reponse? }.
 *
 * UNE MARQUE ORPHELINE NE S'IMPRIME PAS. Une réponse très longue peut être
 * coupée en deux lignes par la mise en page : l'ouvrante reste sur la
 * première, la fermante part sur la seconde, et la paire ne se retrouve
 * plus. Sans ce nettoyage, le caractère de contrôle sortait tel quel — un
 * petit rectangle noir au milieu du corrigé. On souligne alors depuis la
 * marque jusqu'au bout de la ligne, ce qui est exactement ce qu'on veut voir
 * d'une réponse à cheval.
 */
export function morceauxReponse(ligne) {
    const out = [];
    const re = /\u0001([^\u0002]*)\u0002/g;
    let dernier = 0, m;
    while ((m = re.exec(ligne))) {
        if (m.index > dernier) out.push({ texte: ligne.slice(dernier, m.index) });
        out.push({ texte: m[1], reponse: true });
        dernier = m.index + m[0].length;
    }
    let reste = ligne.slice(dernier);
    // Une ouvrante seule : tout ce qui suit est la réponse.
    const ouvre = reste.indexOf(DEBUT_REP);
    if (ouvre >= 0) {
        if (ouvre > 0) out.push({ texte: reste.slice(0, ouvre) });
        out.push({ texte: sansMarques(reste.slice(ouvre + 1)), reponse: true });
        reste = '';
    }
    // Une fermante seule : tout ce qui précède l'était.
    const ferme = reste.indexOf(FIN_REP);
    if (ferme >= 0) {
        out.push({ texte: reste.slice(0, ferme), reponse: true });
        reste = sansMarques(reste.slice(ferme + 1));
    }
    if (reste) out.push({ texte: reste });
    return out.length ? out : [{ texte: sansMarques(ligne) }];
}

/** La ligne débarrassée de ses marques : pour mesurer, et pour les tests. */
export const sansMarques = (t) => String(t ?? '').replace(/[\u0001\u0002]/g, '');
