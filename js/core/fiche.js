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
    const lignes = [];
    for (const paragraphe of String(texte ?? '').split('\n')) {
        const mots = paragraphe.split(/\s+/).filter(Boolean);
        if (!mots.length) { lignes.push(''); continue; }
        let courante = '';
        for (let mot of mots) {
            const essai = courante ? `${courante} ${mot}` : mot;
            if (mesurer(essai, taille) <= largeur) { courante = essai; continue; }
            if (courante) { lignes.push(courante); courante = ''; }
            while (mesurer(mot, taille) > largeur && mot.length > 1) {
                let n = 1;
                while (n < mot.length && mesurer(mot.slice(0, n + 1), taille) <= largeur) n++;
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
    const colonnes = Math.max(1, Math.min(3, o.colonnes));
    const zone = {
        x: A4.marge,
        y: A4.marge + A4.enteteH,
        w: A4.w - A4.marge * 2,
        h: A4.h - A4.marge * 2 - A4.enteteH - A4.piedH
    };
    const colonneW = (zone.w - o.gouttiere * (colonnes - 1)) / colonnes;
    const texteW = colonneW - o.numeroL;

    const pages = [];
    let page = { blocs: [] };
    let col = 0;
    let y = zone.y;
    // La numérotation ignore les intertitres : elle compte les QUESTIONS, et
    // elle est continue d'une section à l'autre — « exercice 2, question 14 »
    // se retrouve d'un coup d'œil quand on corrige.
    let numero = 0;

    questions.forEach((q) => {
        const estTitre = !!q.titre;
        if (!estTitre) numero++;
        const bloc = {
            n: numero,
            titre: estTitre,
            lignes: couperEnLignes(q.texte, texteW, o.taille, mesurer),
            choix: (!estTitre && o.avecChoix && q.choix && q.choix.length) ? q.choix.slice() : null,
            reponse: q.reponse
        };
        const h = hauteurBloc(bloc, o);
        // Un intertitre ne reste jamais seul en bas d'une colonne : on exige
        // la place d'au moins une question derrière lui.
        const besoin = estTitre ? h + o.interligne * 2 + o.ligneReponse : h;

        // Une question ne se coupe jamais entre deux colonnes : on préfère un
        // blanc en bas de colonne à un énoncé dont la fin est ailleurs.
        if (y + besoin > zone.y + zone.h) {
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
        bloc.reponseY = estTitre ? null : y + bloc.lignes.length * o.interligne
            + (bloc.choix ? o.interligne : 0) + o.ligneReponse * 0.55;
        page.blocs.push(bloc);
        y += h + o.entreQuestions;
    });

    if (page.blocs.length) pages.push(page);
    return { pages, colonneW, zone, opts: o, colonnes };
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
    repMin: 16,           // longueur minimale de pointillés sur la même ligne
    ligneReponse: 7,      // hauteur d'une réponse écrite SOUS la question
    entreQuestions: 3.4,  // entre deux rangées de questions
    bandeauH: 8,          // le bandeau « Exercice N »
    apresBandeau: 3.4,
    entreExercices: 7
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
    const zone = {
        x: A4.marge,
        y: A4.marge + A4.enteteH,
        w: A4.w - A4.marge * 2,
        h: A4.h - A4.marge * 2 - A4.enteteH - A4.piedH
    };
    const basPage = zone.y + zone.h;
    // En interrogation on ÉCRIT sur la feuille : les réponses sous les
    // questions gagnent de la place, et on ne serre pas trois par ligne.
    const maxCols = o.interrogation ? 2 : 3;
    const ligneRep = o.interrogation ? Math.max(o.ligneReponse, 12) : o.ligneReponse;

    const pages = [];
    let page = { items: [] };
    let y = zone.y;
    let nbQuestions = 0;

    const nouvellePage = () => { pages.push(page); page = { items: [] }; y = zone.y; };

    exos.forEach((exo, iExo) => {
        const questions = exo.questions || [];
        if (!questions.length) return;

        // Combien de colonnes internes ? Le plus possible, à condition que
        // CHAQUE question tienne sur une seule ligne de sa cellule avec au
        // moins `repMin` de pointillés derrière — un QCM ou un long énoncé
        // ramènent l'exercice à une colonne.
        let cols = 1;
        for (let c = maxCols; c >= 2; c--) {
            if (questions.length < c) continue;
            const cellW = (zone.w - o.gouttiere * (c - 1)) / c;
            const texteW = cellW - o.numeroL - o.repMin - 2;
            // Un générateur peut PROPOSER des choix sans que la fiche les
            // imprime : seuls les choix réellement imprimés comptent ici.
            if (questions.every(q => (!o.avecChoix || !q.choix) && mesurer(q.texte, o.taille) <= texteW)) { cols = c; break; }
        }
        const cellW = (zone.w - o.gouttiere * (cols - 1)) / cols;
        const texteW = cellW - o.numeroL;

        // Les cellules, pré-mesurées : la pagination a besoin des hauteurs
        // avant de poser quoi que ce soit.
        const cellules = questions.map(q => {
            const lignes = couperEnLignes(q.texte, texteW, o.taille, mesurer);
            const choix = (o.avecChoix && q.choix && q.choix.length) ? q.choix.slice() : null;
            // La réponse va SUR la ligne de l'énoncé quand il reste assez de
            // pointillés ; sinon dessous, en pleine largeur de cellule.
            const memeLigne = !choix && lignes.length === 1
                && cellW - o.numeroL - mesurer(lignes[0], o.taille) - 2 >= o.repMin
                && !o.interrogation;
            const h = lignes.length * o.interligne
                + (choix ? o.interligne : 0)
                + (memeLigne ? 0 : ligneRep);
            return { lignes, choix, memeLigne, h };
        });

        const consigneLignes = exo.consigne
            ? couperEnLignes(exo.consigne, zone.w - 2, o.tailleConsigne, mesurer)
            : [];
        const enteteH = o.bandeauH + consigneLignes.length * (o.tailleConsigne * 1.45) + o.apresBandeau;

        // L'exercice commence-t-il sur cette page ? Il faut le bandeau, la
        // consigne et au moins la première rangée — un bandeau seul en bas de
        // page est exactement ce qui fait « amateur ».
        const premiereRangeeH = Math.max(...cellules.slice(0, cols).map(c => c.h));
        if (iExo > 0 && page.items.length && y > zone.y) y += o.entreExercices - o.entreQuestions;
        if (page.items.length && y + enteteH + premiereRangeeH > basPage) nouvellePage();

        const poserBandeau = (suite) => {
            page.items.push({
                type: 'exo', n: iExo + 1, suite,
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
                nbQuestions++;
                const x = zone.x + iCell * (cellW + o.gouttiere);
                const texteX = x + o.numeroL;
                let rep = null;
                if (cell.memeLigne) {
                    // Les pointillés continuent la ligne d'écriture : même
                    // hauteur que la ligne de base du texte.
                    const finTexte = texteX + mesurer(cell.lignes[0], o.taille) + 2;
                    rep = { x: finTexte, y: y + o.taille, w: x + cellW - finTexte };
                } else {
                    rep = {
                        x: texteX,
                        y: y + cell.lignes.length * o.interligne
                            + (cell.choix ? o.interligne : 0) + ligneRep * 0.62,
                        w: texteW
                    };
                }
                page.items.push({
                    type: 'q', n: nbQuestions,
                    lignes: cell.lignes, x, y, texteX, texteW,
                    choix: cell.choix,
                    choixY: cell.choix ? y + cell.lignes.length * o.interligne : null,
                    rep
                });
            });
            y += rangeeH + o.entreQuestions;
        }
    });

    if (page.items.length) pages.push(page);
    return { pages, zone, opts: o, nbQuestions };
}

/**
 * La page des solutions : compacte, plusieurs par ligne. Elle n'a pas à être
 * belle, elle a à être lue en diagonale pendant qu'on corrige.
 */
export function composerSolutions(questions, opts, mesurer) {
    const o = { ...DEFAUTS, ...(opts || {}), colonnes: Math.max(2, Math.min(5, (opts && opts.colonnesSolutions) || 4)) };
    const items = questions.map((q, i) => ({
        texte: `${i + 1}. ${q.reponse ?? ''}`,
        reponse: q.reponse
    }));
    return composerFiche(items, { ...o, ligneReponse: 0, entreQuestions: 1.4, numeroL: 0 }, mesurer);
}
