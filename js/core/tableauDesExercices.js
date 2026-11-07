// LE TABLEAU À DOUBLE ENTRÉE : LES ÉLÈVES EN LIGNES, LES EXERCICES EN COLONNES.
//
// RÉMY : « permettre aussi d'avoir le détail avec un tableau des exercices
// (double entrée donc) et leur détail de réussite par exercice », puis, quand
// je lui ai demandé selon quoi faire les colonnes : « pour le 4 colonne séance
// choisie ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUE CE TABLEAU APPORTE ET QUE LE BILAN NE DONNE PAS.
//
// Le bilan dit « Léo : 62 % ». C'est un nombre juste et inutilisable : on ne
// sait pas s'il est faible partout ou s'il s'est écroulé sur UN exercice. Le
// tableau croisé répond à cela, et il répond surtout à la question de l'autre
// sens, celle qui décide de l'heure suivante : Y A-T-IL UNE COLONNE ROUGE
// PARTOUT ? Une colonne rouge pour vingt-six élèves n'est pas vingt-six élèves
// en difficulté, c'est un exercice mal posé ou une notion pas encore enseignée.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LES COLONNES VIENNENT DE LA SÉANCE, PAS DES RÉPONSES.
//
// C'est la décision qui porte tout le module. On pourrait faire les colonnes
// avec les exercices sur lesquels on a vu passer des réponses — ce serait plus
// simple, et ce serait faux : UN EXERCICE QUE PERSONNE N'A OUVERT DISPARAÎTRAIT
// DU TABLEAU. Or c'est l'information la plus utile de l'écran. Une colonne
// entièrement vide dit « personne n'est arrivé jusque-là », ce qui veut dire
// que la séance était trop longue — et on ne peut pas le lire sur un tableau
// dont les colonnes se contentent de refléter ce qui a été fait.
//
// Les colonnes sont donc le PLAN de la séance, dans son ordre, et les cases la
// mesure. C'est aussi pour cela que le module reçoit la séance : il ne la
// déduit pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ET IL NE SAIT PAS NOMMER LES EXERCICES, EXPRÈS.
//
// Le serveur rend `calc-add` : il n'a pas le catalogue, et il n'a pas à
// l'avoir. Ce module rend lui aussi `calc-add`, pour la même raison — il doit
// se mesurer sans navigateur, et le catalogue vit dans `js/data`. C'est l'écran
// qui traduit (voir `nomDExercice`).

/** En dessous, une case ne dit rien : trop peu de questions pour un taux. */
export const ASSEZ_POUR_UN_TAUX = 1;

/**
 * LES COLONNES : LE PLAN DE LA SÉANCE, SANS DOUBLON, DANS SON ORDRE.
 *
 * UN MÊME EXERCICE PEUT ÊTRE DEUX FOIS DANS UNE SÉANCE — deux étapes du même
 * exercice avec des réglages différents, ce que le constructeur permet. Les
 * réponses, elles, ne portent que l'exercice : les deux étapes tomberaient dans
 * la même case, et deux colonnes identiques afficheraient deux fois le même
 * nombre. On en garde donc UNE, à la place de la première.
 */
export function colonnesDeLaSeance(seance) {
    const vus = new Set();
    const out = [];
    for (const id of (seance && seance.exercices) || []) {
        const ex = String(id || '');
        if (!ex || vus.has(ex)) continue;
        vus.add(ex);
        out.push(ex);
    }
    return out;
}

/**
 * UNE CASE, À PARTIR DES TROIS NOMBRES DU SERVEUR.
 *
 * `vide` N'EST PAS ZÉRO, et c'est la distinction qui fait la valeur du tableau.
 * Une case vide dit « il n'est pas arrivé jusque-là » ; « 0 % » dit « il a tout
 * raté ». Les deux appellent des gestes opposés — on raccourcit la séance dans
 * un cas, on reprend la notion dans l'autre — et la même couleur rouge pour les
 * deux rendrait le tableau trompeur là où il est censé trancher.
 */
export function caseDExercice(brut) {
    const posees = Math.max(0, Number(brut && brut.posees) || 0);
    if (posees < ASSEZ_POUR_UN_TAUX) return { vide: true, posees: 0, justes: 0, reprises: 0, taux: null };
    const justes = Math.max(0, Number(brut.justes) || 0);
    const reprises = Math.max(0, Number(brut.reprises) || 0);
    return {
        vide: false,
        posees,
        justes,
        reprises,
        // LE TAUX PORTE SUR LE PREMIER COUP. Compter les rattrapages comme des
        // réussites ferait de « s'est trompé douze fois puis a trouvé douze
        // fois » un sans-faute — c'est le mensonge qu'on a déjà corrigé sur
        // l'écran de fin d'étape, et il n'a pas à revenir par le bilan.
        taux: Math.min(1, justes / posees)
    };
}

/**
 * LE TABLEAU ENTIER : des lignes du bilan et d'une séance, un tableau croisé.
 *
 * @param {Array} lignes   ce que rend `/teacher/report` (`students`)
 * @param {Object} seance  { pathId, nom, exercices: [...] }
 * @param {Function} [trier]  l'ordre des lignes (celui du bilan, par défaut
 *                            l'ordre reçu) — le tableau ne choisit pas son
 *                            ordre, il suit celui que le professeur a cliqué.
 */
export function tableauDesExercices(lignes, seance, trier) {
    const exercices = colonnesDeLaSeance(seance);
    const pathId = (seance && seance.pathId) || '';
    const rangees = trier ? trier(lignes || []) : (lignes || []).slice();

    const rangs = rangees.map(l => {
        const par = (l && l.parSeance && l.parSeance[pathId]) || {};
        const cases = exercices.map(ex => caseDExercice(par[ex]));
        const faites = cases.filter(c => !c.vide);
        const posees = faites.reduce((s, c) => s + c.posees, 0);
        const justes = faites.reduce((s, c) => s + c.justes, 0);
        return {
            studentId: (l && l.studentId) || '',
            firstName: (l && l.firstName) || '',
            cases,
            // CE QU'IL A FAIT DE LA SÉANCE, en bout de ligne : sans ce nombre,
            // on confond « 100 % » sur un exercice avec « 100 % » sur huit.
            commences: faites.length,
            posees,
            justes,
            taux: posees ? justes / posees : null
        };
    });

    // ET LE PIED DU TABLEAU : la colonne, lue de haut en bas.
    //
    // C'EST LA MOITIÉ DE L'ÉCRAN QUI SERT À PRÉPARER. Une colonne à 38 % pour
    // vingt-deux élèves ne se voit pas en balayant des cases une à une — et
    // c'est pourtant elle qui décide de ce qu'on reprend au tableau.
    const pieds = exercices.map((ex, i) => {
        const cases = rangs.map(r => r.cases[i]).filter(c => !c.vide);
        const posees = cases.reduce((s, c) => s + c.posees, 0);
        const justes = cases.reduce((s, c) => s + c.justes, 0);
        return {
            exerciceId: ex,
            // COMBIEN L'ONT OUVERT, et non combien sont dans la classe : c'est
            // ce qui distingue « ils n'y arrivent pas » de « ils n'y sont pas
            // arrivés ».
            eleves: cases.length,
            posees,
            justes,
            // ET CE N'EST PAS UNE MOYENNE DE MOYENNES, pour la même raison que
            // le taux de classe du bilan (voir `resumeDeClasse`) : un élève qui
            // a répondu à deux questions pèserait autant que celui qui en a
            // fait vingt, et une colonne à reprendre passerait pour une colonne
            // qui va.
            taux: posees ? justes / posees : null
        };
    });

    return { pathId, nom: (seance && seance.nom) || '', exercices, rangs, pieds };
}

/**
 * LA PHRASE DU TABLEAU — ce qu'on y voit sans le lire case par case.
 *
 * ELLE NE DIT QUE CE QUI DEMANDE UN GESTE, et seulement quand c'est franc. Une
 * phrase qui commente chaque séance perd son pouvoir d'alerte au troisième
 * bilan ; on rend donc une chaîne VIDE le plus souvent, ce qui est une réponse.
 */
export const COLONNE_FAIBLE = 0.5;
export const PAS_ARRIVES = 0.5;

export function phraseDuTableau(t) {
    const bouts = [];
    const pieds = t.pieds || [];
    const combien = (t.rangs || []).length;

    // « LA CLASSE » DEMANDE QU'ASSEZ D'ÉLÈVES SOIENT ARRIVÉS JUSQUE-LÀ.
    //
    // MESURÉ, SUR UNE CLASSE DE SIX : deux élèves seulement avaient atteint le
    // deuxième exercice et l'avaient raté. La phrase annonçait « un exercice a
    // résisté à la classe entière », puis, dans la même ligne, « 2 exercices
    // n'ont été atteints que par une partie de la classe » — deux phrases qui
    // se contredisent sur la même colonne. Le seuil de deux élèves ne suffit
    // donc pas : pour parler de la CLASSE, il faut que plus de la moitié de la
    // classe soit arrivée sur l'exercice. Les deux alertes deviennent alors
    // exclusives par construction, et c'est ce qui les rend lisibles ensemble.
    const assezDeMonde = (p) => p.eleves >= 2 && (!combien || p.eleves > combien * PAS_ARRIVES);

    // UNE COLONNE ROUGE POUR BEAUCOUP D'ÉLÈVES N'EST PAS BEAUCOUP D'ÉLÈVES EN
    // DIFFICULTÉ : c'est un exercice à reprendre, ou mal placé dans la séance.
    const faibles = pieds
        .filter(p => assezDeMonde(p) && p.taux !== null && p.taux < COLONNE_FAIBLE)
        .sort((a, b) => a.taux - b.taux);
    if (faibles.length) {
        bouts.push(faibles.length === 1
            ? 'Un exercice a résisté à la classe.'
            : `${faibles.length} exercices ont résisté à la classe.`);
    }

    // ET CE QUE PERSONNE N'A ATTEINT : la séance était trop longue, ce qui n'a
    // rien à voir avec la difficulté — et c'est le défaut le plus facile à
    // corriger des deux.
    //
    // ON SÉPARE « PERSONNE » DE « QUELQUES-UNS » : « n'a été atteint que par
    // une partie de la classe » laisse croire qu'une partie y est arrivée,
    // alors qu'une colonne entièrement vide dit tout autre chose — l'exercice
    // n'a pas été travaillé du tout, et il reste à faire.
    if (combien >= 4) {
        const personne = pieds.filter(p => !p.eleves);
        const quelquesUns = pieds.filter(p => p.eleves && !assezDeMonde(p));
        if (personne.length) {
            bouts.push(personne.length === 1
                ? 'Un exercice n\'a été atteint par personne.'
                : `${personne.length} exercices n'ont été atteints par personne.`);
        }
        if (quelquesUns.length) {
            bouts.push(quelquesUns.length === 1
                ? 'Un exercice n\'a été atteint que par quelques élèves.'
                : `${quelquesUns.length} exercices n'ont été atteints que par quelques élèves.`);
        }
    }
    return bouts.join(' ');
}
