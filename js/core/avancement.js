// L'AVANCEMENT — où en est un élève dans sa séance, en un coup d'œil.
//
// Rémy : « surtout il faut que la séance soit facilement visible l'avancement,
// et tout et tout », et avant cela : « je ne peux pas avoir un aperçu en temps
// réel de la progression des élèves ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// IL Y AVAIT DÉJÀ UNE PROGRESSION À L'ÉCRAN, ET ELLE NE RÉPONDAIT PAS.
//
// Le meneur affiche « 7 / 10 » : c'est l'avancement DANS L'EXERCICE EN COURS.
// L'élève qui le lit ne sait pas s'il lui reste une étape ou quatre, et le
// professeur qui voit passer « calc-sub · 2/2 » dans Le direct ne sait pas si
// l'élève a fini sa séance ou s'il en est au premier dixième. Ce sont deux
// questions différentes, et c'est la seconde que Rémy pose.
//
// ON NE CRÉE DONC PAS UN COMPTEUR DE PLUS : ON LIT LE JOURNAL.
//
// Le parcours écrit son PLAN au démarrage (`run_started`), chaque étape écrit
// son résultat en se terminant (`step_completed`), chaque question écrit sa
// tentative (`attempt`). L'avancement est une PROJECTION de ces trois-là — au
// même titre que le score ou la maîtrise, et pour la même raison : un compteur
// qu'on incrémente ne se fusionne pas entre deux appareils, une projection se
// recalcule. L'élève qui commence en classe et reprend chez lui garde son
// avancement sans que personne n'arbitre.
//
// ET LE SERVEUR FAIT LE MÊME CALCUL, avec les mêmes règles (voir le miroir dans
// api/lib/projections.php). Sans quoi l'élève lirait « étape 3 sur 5 » pendant
// que le professeur lirait autre chose sur le même élève à la même seconde —
// et c'est précisément ce genre d'écart qui fait qu'on cesse de croire un
// tableau de bord.

/**
 * COMBIEN DE QUESTIONS ONT ÉTÉ POSÉES, ET NON COMBIEN DE FOIS ON A RÉPONDU.
 *
 * Une même question produit plusieurs tentatives : le deuxième essai après une
 * erreur, et les tentatives `partiel` d'une opération posée — une par chiffre.
 * Les compter toutes ferait un avancement qui dépasse le total, et l'élève le
 * plus en difficulté paraîtrait le plus avancé, ce qui est exactement le
 * contraire de ce qu'on veut montrer.
 *
 * On compte donc les ITEMS distincts. `itemSeed` les identifie ; les jeux
 * autonomes n'en ont pas, et pour eux le premier essai (`attemptIndex` 0) tient
 * lieu de repère.
 */
export function questionsPosees(tentatives) {
    const graines = new Set();
    let sansGraine = 0;
    for (const t of tentatives || []) {
        if (t.partiel) continue;
        if (t.itemSeed) graines.add(String(t.itemSeed));
        else if (!t.attemptIndex) sansGraine++;
    }
    return graines.size + sansGraine;
}

/**
 * LES ÉTAPES PRÉVUES, telles que le parcours les a annoncées au départ.
 *
 * QUAND ON NE LES CONNAÎT PAS, ON NE FAIT PAS SEMBLANT. Le serveur ne lit que
 * les deux cents derniers événements d'un élève : une longue séance arrive
 * amputée de son `run_started`, donc sans plan. On reconstitue alors le peu
 * qu'on sait — le nombre d'étapes closes — ET L'ON EN AJOUTE UNE tant que le
 * parcours n'est pas terminé. Sans cela un élève au milieu de son travail
 * afficherait une barre PLEINE, ce qui est le seul message qu'une barre ne doit
 * jamais donner par erreur.
 */
function planDu(run) {
    const plan = Array.isArray(run.plan) ? run.plan : [];
    if (plan.length) return plan;
    const closes = (run.steps || []).length;
    let combien = Number(run.stepCount) || closes || 0;
    if (!run.finishedAt) combien = Math.max(combien, closes + 1);
    return Array.from({ length: combien }, (_, i) => ({
        stepId: null, titre: '', questions: 0, requis: 0, _devine: true, _rang: i
    }));
}

/**
 * OÙ EN EST CE RUN.
 *
 * @param {object} run  tel que `computeRuns` le rend
 * @returns {{
 *   pathId, pathName, etat, etapes, faites, reussies,
 *   etapeEnCours: {rang, titre, posees, prevues, justes}|null,
 *   questions, prevues, justes, fraction, secondes
 * }}
 */
export function avancementDuRun(run, maintenant = Date.now()) {
    if (!run) return null;
    const plan = planDu(run);
    const finies = run.steps || [];

    // CE QUI ÉTAIT DÉJÀ FAIT AVANT CE RUN COMPTE AUSSI.
    //
    // Rémy : « quand je clique sur un élève qui a déjà fait 3 exercices, j'ai
    // Étape 1/12 […] je redémarre au 3 et lui me dit étape 1/12 ».
    //
    // REPRENDRE UNE SÉANCE OUVRE UN RUN NEUF. L'élève reprend bien à la bonne
    // étape — le parcours assigné garde ses étapes validées d'une fois sur
    // l'autre — mais le nouveau run n'avait aucune étape close à son actif, et
    // tout ce qui lit le journal repartait de zéro. Le défaut était dans ce
    // qu'on raconte, pas dans ce qu'on fait.
    //
    // ON N'EN COMPTE PAS UNE DEUX FOIS : une étape reprise et refermée dans ce
    // run-ci apparaît dans les deux listes, et c'est l'identifiant qui tranche.
    const dejaIds = (run.dejaFaites || []).filter(Boolean);
    const closIci = new Set(finies.map(s => s.stepId).filter(Boolean));
    const avant = dejaIds.filter(id => !closIci.has(id));
    const faites = avant.length + finies.length;
    // Une étape retenue dans `completed` est une étape VALIDÉE : elle compte
    // comme réussie, et sa case se remplit.
    const reussies = avant.length + finies.filter(s => s.passed !== false).length;

    // Les questions prévues : la somme du plan. Zéro quand on ne le connaît
    // pas — et l'on dira alors l'avancement en ÉTAPES, pas en questions.
    const prevues = plan.reduce((n, e) => n + (Number(e.questions) || 0), 0);

    // L'étape en cours est celle qui suit les étapes terminées.
    const enPlan = plan[faites] || null;
    const idsFinis = new Set(finies.map(s => s.stepId).filter(Boolean));
    const encore = (run.attempts || []).filter(t => !t.stepId || !idsFinis.has(t.stepId));
    const poseesIci = questionsPosees(encore);
    const justesIci = encore.filter(t => t.correct && !t.partiel && !t.attemptIndex).length;

    const fini = !!run.finishedAt && !run.aborted;
    const abandonne = !!run.finishedAt && !!run.aborted;
    const enCoursVraiment = !run.finishedAt && faites < plan.length;

    const etapeEnCours = enCoursVraiment && enPlan ? {
        rang: faites,
        titre: enPlan.titre || '',
        posees: poseesIci,
        prevues: Number(enPlan.questions) || 0,
        justes: justesIci
    } : null;

    // LES QUESTIONS FAITES : celles des étapes closes, plus celles de l'étape
    // en cours. On lit le `questions` de `step_completed` — c'est le décompte
    // du meneur lui-même, celui qui a servi à décider si l'étape passait.
    // LES QUESTIONS D'AVANT SE LISENT DANS LE PLAN, pas dans ce run : elles ont
    // été répondues dans le précédent. Sans elles, la barre d'un élève qui a
    // fait trois exercices sur douze repartirait à zéro en reprenant.
    const questionsAvant = avant.reduce((n, _, i) =>
        n + (Number((plan[i] || {}).questions) || 0), 0);
    const questionsCloses = questionsAvant
        + finies.reduce((n, s) => n + (Number(s.questions) || 0), 0);
    const questions = questionsCloses + (etapeEnCours ? poseesIci : 0);
    // On ne sait PAS combien il en avait réussi avant : `completed` ne retient
    // que « validée ». On ne l'invente pas — mieux vaut un compte de justes qui
    // ne concerne que ce run qu'un chiffre fabriqué qui aurait l'air vrai.
    const justesCloses = finies.reduce((n, s) => n + (Number(s.solved) || 0), 0);
    const justes = justesCloses + (etapeEnCours ? justesIci : 0);

    return {
        runId: run.runId || null,
        pathId: run.pathId || null,
        pathName: run.pathName || '',
        etat: fini ? 'fini' : (abandonne ? 'abandonne' : 'en-cours'),
        etapes: plan.length,
        faites, reussies,
        // ÉTAPE PAR ÉTAPE, RÉUSSIE OU NON. Le fil de l'élève en a besoin : une
        // case pleine sur une étape ratée lui ferait croire qu'il peut passer
        // à la suite sans y revenir.
        detailEtapes: [...avant.map(() => true), ...finies.map(s => s.passed !== false)],
        etapeEnCours,
        questions, prevues, justes,
        fraction: fractionDe({ fini, abandonne, faites, plan, prevues, questions, etapeEnCours }),
        secondes: run.startedAt ? Math.max(0, Math.round((maintenant - run.startedAt) / 1000)) : 0
    };
}

/**
 * LA FRACTION — ce que la barre remplit.
 *
 * ON COMPTE EN QUESTIONS QUAND ON LE PEUT, et en étapes sinon. La différence
 * n'est pas cosmétique : un parcours de deux étapes dont l'une fait vingt
 * questions et l'autre trois avance par à-coups si on le compte en étapes, et
 * l'élève qui a fait dix-neuf des vingt premières se voit à « 0 % ».
 *
 * ET UNE BARRE PLEINE VEUT DIRE FINI, jamais « presque ». Un parcours terminé
 * vaut 1 même s'il a été bouclé en moins de questions que prévu — c'est le cas
 * courant, une étape se valide dès le seuil atteint.
 */
function fractionDe({ fini, abandonne, faites, plan, prevues, questions }) {
    if (fini) return 1;
    if (!plan.length) return 0;
    if (prevues > 0) return Math.min(1, questions / prevues);
    const f = faites / plan.length;
    return abandonne ? f : Math.min(1, f);
}

/**
 * CE QU'ON ÉCRIT À CÔTÉ DE LA BARRE.
 *
 * Une phrase, pas un tableau. Le professeur qui parcourt trente lignes ne lit
 * pas des colonnes : il cherche les trois élèves qui n'avancent pas.
 */
export function enBref(av) {
    if (!av) return 'Pas commencé';
    if (av.etat === 'fini') return `Terminé — ${av.justes} / ${av.questions} justes`;
    if (av.etat === 'abandonne') return `Arrêté à l'étape ${av.faites + 1} sur ${av.etapes}`;
    if (!av.etapes) return `${av.questions} question${av.questions > 1 ? 's' : ''}`;
    const e = av.etapeEnCours;
    const ou = `Étape ${Math.min(av.faites + 1, av.etapes)} sur ${av.etapes}`;
    if (e && e.prevues) return `${ou} — ${e.posees} / ${e.prevues}`;
    return ou;
}

/**
 * LA CLASSE D'UN COUP D'ŒIL.
 *
 * Rémy veut savoir s'il peut passer à la suite. La réponse tient en trois
 * nombres, et le troisième est le seul qui décide : combien n'ont pas commencé.
 *
 * @param {Array<object|null>} avancements un par élève, `null` = pas commencé
 */
export function avancementDeClasse(avancements) {
    const liste = avancements || [];
    let finis = 0, enCours = 0, pasCommence = 0, somme = 0;
    for (const a of liste) {
        if (!a || a.etat === 'pas-commence') { pasCommence++; continue; }
        if (a.etat === 'fini') { finis++; somme += 1; continue; }
        enCours++;
        somme += a.fraction || 0;
    }
    const combien = liste.length;
    return {
        combien, finis, enCours, pasCommence,
        // La moyenne compte les absents pour zéro : c'est l'avancement DE LA
        // CLASSE, et une classe dont la moitié n'a pas commencé n'est pas à
        // mi-parcours parce que l'autre moitié a fini.
        fraction: combien ? somme / combien : 0
    };
}

/** « 4 min », « 1 h 05 » — et jamais « 3847 secondes ». */
export function depuisCombien(secondes) {
    const s = Math.max(0, Math.floor(secondes || 0));
    if (s < 60) return 'à l\'instant';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
