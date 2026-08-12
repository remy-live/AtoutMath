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
 * L'énoncé tel qu'il s'imprime.
 *
 * À l'écran, « 7 + 2 = ? » désigne la case à remplir. Sur le papier, le point
 * d'interrogation ne désigne plus rien : la place à remplir, ce sont les
 * pointillés ou le champ juste derrière. « 7 + 2 = » se termine sur le signe
 * égal, comme dans tous les cahiers. On ne touche qu'au « ? » qui suit
 * immédiatement un « = » — celui de « Combien de billes reste-t-il ? » est une
 * vraie question et doit rester.
 */
export function texteImprime(texte) {
    return String(texte ?? '').replace(/=\s*\?(?=\s|$)/g, '=').trimEnd();
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
    repMin: 16,           // longueur minimale de pointillés sur la même ligne
    ligneReponse: 7,      // hauteur d'une réponse écrite SOUS la question
    entreQuestions: 3.4,  // entre deux rangées de questions
    bandeauH: 8,          // le bandeau « Exercice N »
    apresBandeau: 3.4,
    entreExercices: 7,
    grillesParLigne: 'auto', // pour les exercices à grilles ; 'auto' remplit la largeur
    grilleMax: 78,           // côté maximal d'une grille, en mm
    grilleMin: 46,           // en dessous, une grille 9×9 n'est plus remplissable
    celluleMin: 46,          // largeur minimale d'une cellule de question, en mm
    colonnesMax: 6,          // le plafond absolu, toutes orientations confondues
    champs: false,           // champs de formulaire remplissables dans le PDF
    champH: 6                // hauteur d'un champ de saisie, en mm
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
    const zone = {
        x: page0.marge,
        y: page0.marge + page0.enteteH,
        w: page0.w - page0.marge * 2,
        h: page0.h - page0.marge * 2 - page0.enteteH - page0.piedH
    };
    const basPage = zone.y + zone.h;
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
    let y = zone.y;
    let nbQuestions = 0;
    // Ce que « auto » a finalement décidé, exercice par exercice : l'interface
    // le rend au professeur, pour qu'il sache de quoi il part avant de forcer.
    const colonnesParExo = [];

    // On ne pousse JAMAIS une page vide : une feuille blanche au milieu d'un
    // PDF ressemble à une erreur d'impression, et le professeur la photocopie
    // trente fois avant de s'en apercevoir.
    const nouvellePage = () => {
        if (page.items.length) pages.push(page);
        page = { items: [] };
        y = zone.y;
    };

    exos.forEach((exo, iExo) => {
        const questions = exo.questions || [];
        const grilles = exo.grilles || [];
        if (!questions.length && !grilles.length) return;

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
            const gap = o.gouttiere;
            const tiendraient = Math.max(1, Math.floor((zone.w + gap) / (o.grilleMin + gap)));
            const parLigne = Math.max(1, Math.min(
                grilles.length,
                Number.isFinite(Number(voulu)) && Number(voulu) > 0 ? Number(voulu) : tiendraient
            ));
            const cote = Math.min(
                (zone.w - gap * (parLigne - 1)) / parLigne,
                o.grilleMax || 78
            );
            colonnesParExo.push(parLigne);
            const consigneLignes = exo.consigne
                ? couperEnLignes(exo.consigne, zone.w - 2, o.tailleConsigne, mesurer)
                : [];
            const enteteH = o.bandeauH + consigneLignes.length * (o.tailleConsigne * 1.45) + o.apresBandeau;
            if (iExo > 0 && page.items.length && y > zone.y) y += o.entreExercices - o.entreQuestions;
            if (page.items.length && y + enteteH + cote > basPage) nouvellePage();

            page.items.push({
                type: 'exo', n: iExo + 1, suite: false,
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
                if (y + cote + o.entreQuestions > basPage) {
                    nouvellePage();
                    page.items.push({
                        type: 'exo', n: iExo + 1, suite: true,
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
                    nbQuestions++;
                    const gx = x0 + i * (cote + gap);
                    page.items.push({
                        type: 'grille', n: nbQuestions, cle: g.cle, item: g.item,
                        x: gx, y, taille: cote,
                        // La boîte complète, pour les treillis larges (Garam) :
                        // un carré y donnerait des cases minuscules.
                        boite: { x: gx, y, w: cote, h: cote }
                    });
                });
                y += cote + o.entreQuestions;
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
                const texteW = cellW - o.numeroL - o.repMin - 2;
                // Un générateur peut PROPOSER des choix sans que la fiche les
                // imprime : seuls les choix réellement imprimés comptent ici.
                if (questions.every(q => (!o.avecChoix || !q.choix) && mesurer(q.texte, o.taille) <= texteW)) { cols = c; break; }
            }
        }
        colonnesParExo.push(cols);
        const cellW = (zone.w - o.gouttiere * (cols - 1)) / cols;
        const texteW = cellW - o.numeroL;

        // Les cellules, pré-mesurées : la pagination a besoin des hauteurs
        // avant de poser quoi que ce soit.
        const cellules = questions.map(q => {
            const lignes = couperEnLignes(texteImprime(q.texte), texteW, o.taille, mesurer);
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
                // LA BOÎTE DE SAISIE, pour la fiche remplissable. Les
                // pointillés ne sont qu'un trait de base ; un champ de
                // formulaire, lui, a une hauteur. On la pose À CHEVAL sur ce
                // trait — c'est là que l'élève écrirait à la main, donc c'est
                // là que le curseur doit clignoter.
                rep.h = Math.min(o.champH, ligneRep || o.champH);
                rep.champY = rep.y - rep.h * 0.78;
                rep.nom = `q${nbQuestions}`;
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
    return { pages, zone, opts: o, nbQuestions, page: page0, colonnes: colonnesParExo };
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

    // La ligne d'une réponse. La FLÈCHE a disparu : elle n'existe pas dans les
    // polices d'un PDF, et « 7 × 8 = 56 » est de toute façon ce qu'on écrit au
    // tableau en corrigeant.
    const ligneDe = (q, n) => {
        const rep = q.reponse ?? '';
        if (mode === 'compact') return `${n}. ${rep}`;
        if (mode === 'normal') return `${n}. ${nettoyer(q.texte)} = ${rep}`;
        const expl = (q.explication || '').trim();
        return `${n}. ${nettoyer(q.texte)} = ${rep}${expl ? '\n' + expl : ''}`;
    };

    // LES SECTIONS. Une feuille de solutions qui aligne « 1. 2  2. 9  3. 4 »
    // sur soixante numéros ne dit plus à quel exercice on en est : le
    // professeur compte les lignes pour retrouver où commence l'exercice 3.
    // Un intertitre par exercice — avec son barème quand c'est une
    // interrogation — le lui dit d'un coup d'œil.
    const sections = (opts && opts.sections) || null;
    const items = [];
    if (sections && sections.length) {
        let n = 0;
        sections.forEach((sec, i) => {
            const qs = sec.questions || [];
            if (!qs.length) return;
            const bareme = sec.points ? ` — ${sec.points} pt${sec.points > 1 ? 's' : ''}` : '';
            items.push({ titre: true, texte: `Exercice ${i + 1} — ${sec.titre}${bareme}` });
            qs.forEach(q => items.push({ texte: ligneDe(q, ++n) }));
        });
    } else {
        questions.forEach((q, i) => items.push({ texte: ligneDe(q, i + 1) }));
    }

    // En détaillé les entrées respirent : deux explications collées l'une à
    // l'autre se lisent comme un seul paragraphe.
    const entre = mode === 'detaille' ? 2.6 : 1.4;
    return composerFiche(items, {
        ...o, ligneReponse: 0, entreQuestions: entre, numeroL: 0,
        // Le compact n'a de sens que rempli : c'est la feuille d'UNE page.
        equilibrer: mode !== 'detaille'
    }, mesurer);
}

/**
 * Un énoncé sur une feuille de solutions tient sur une ligne : pas de retours.
 *
 * Le signe égal final tombe avec le point d'interrogation : c'est la FLÈCHE
 * qui mène à la réponse sur cette feuille-là. « 7 × 8 → 56 » se lit d'un trait,
 * « 7 × 8 = → 56 » fait buter l'œil sur deux signes qui disent la même chose.
 */
function nettoyer(texte) {
    return texteImprime(String(texte ?? '').replace(/\s*\n\s*/g, ' '))
        .replace(/\s*=\s*$/, '').trim();
}
