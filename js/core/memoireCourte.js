// LA MÉMOIRE COURTE DE LA SÉANCE — ce que le logiciel n'avait pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après quatre séances en classe : « parfois un élève bloque
// complètement, que faire ? ».
//
// CE QUE LE LOGICIEL FAISAIT, lu dans le code et non supposé : **il n'avait
// aucune mémoire ENTRE deux questions.** Chaque question naissait, se jugeait
// et mourait seule. Un élève pouvait faire six fois exactement la même erreur,
// et recevoir six fois exactement la même phrase neutre — celle d'un logiciel
// qui ne s'aperçoit de rien. C'est la seule chose que Rémy fait de vive voix et
// que la machine ne faisait pas : remarquer que c'est la DEUXIÈME fois.
//
// Ce module est ce socle. Il n'affiche rien, il ne décide rien : il se souvient.
//
// ── TROIS CHOIX QUI NE SE DEVINENT PAS ─────────────────────────────────────
//
// 1. IL SE SOUVIENT DES QUESTIONS, PAS DES TENTATIVES. Trois essais sur la même
//    question, c'est une question. Sans cela, un élève qui se reprend au
//    deuxième essai aurait « deux fois la même erreur » — alors qu'il n'a buté
//    qu'une fois, et qu'il s'est corrigé tout seul. On n'inscrit donc une
//    question qu'une fois CONCLUE (réussie, ou essais épuisés).
//
// 2. IL COMPTE COMME COMPTE L'OUTIL DE MESURE, et ce n'est pas un détail de
//    style : `api/lib/blocages.php` compte les suites d'échecs sur la même
//    compétence, sur des questions QUI SE SUIVENT, et c'est ce comptage-là que
//    Rémy va lire pour choisir le seuil. Si ce module comptait autrement, la
//    mesure ne prédirait pas le comportement, et le seuil choisi sur elle
//    serait faux. Les deux définitions sont donc les mêmes, et la seconde est
//    citée en regard de la première.
//
// 3. ELLE EST COURTE, ET LE NOM LE DIT. On garde la queue — les dernières
//    questions —, pas la séance. Ce qu'on veut savoir est « est-ce que ça vient
//    de se produire », jamais « combien de fois depuis septembre » : cela, c'est
//    le carnet d'erreurs et la maîtrise, qui existent déjà et se calculent sur
//    le journal.
//
// Module PUR : ni DOM, ni horloge propre, ni hasard. Il s'éprouve sans
// navigateur — `tests/memoireCourte.test.mjs`.

/**
 * Combien de questions on garde.
 *
 * Vingt est largement au-delà de ce que les deux questions posées demandent
 * (« la précédente », « les deux précédentes »), et bien en dessous de ce qui
 * coûterait quelque chose. On garde cette marge parce qu'une question à venir —
 * « combien de fois dans cette étape ? » — se répondrait sans rien changer ici.
 */
const COMBIEN = 20;

/** Les questions conclues, de la plus ancienne à la plus récente. */
let questions = [];

/**
 * Oublie tout. Appelé à l'ouverture d'un parcours.
 *
 * SANS CET OUBLI, LA MÉMOIRE TRAVERSERAIT LES SÉANCES : l'élève qui reprend
 * son travail une heure plus tard entendrait « c'est la même chose qu'à la
 * question d'avant » à propos d'une question qu'il ne voit plus. Une remarque
 * qui porte sur ce qu'on ne peut pas retrouver n'enseigne rien.
 */
export function oublierLaSeance() {
    questions = [];
}

/**
 * Inscrit une question CONCLUE.
 *
 * @param {object} q
 * @param {?string} q.competence  - `skillId`, ou rien
 * @param {?string} q.diagnostic  - le `why` du distracteur reconnu, ou rien.
 *        C'est le TEXTE, et c'est voulu : deux fois le même distracteur rend
 *        deux fois la même phrase, et comparer les phrases suffit. Aucun
 *        identifiant de diagnostic n'existe dans ce dépôt, et en inventer un
 *        pour ce seul usage ferait une seconde vérité à tenir d'accord.
 * @param {boolean} q.duPremierCoup - réussie sans s'y reprendre.
 */
export function noterUneQuestion(q) {
    questions.push({
        competence: q.competence || null,
        diagnostic: q.diagnostic || null,
        duPremierCoup: !!q.duPremierCoup
    });
    if (questions.length > COMBIEN) questions = questions.slice(-COMBIEN);
}

/**
 * Ce diagnostic est-il DÉJÀ celui de la question d'avant ?
 *
 * « La question d'avant » au singulier, et c'est tout le propos : on ne cherche
 * pas si l'élève a déjà fait cette erreur un jour — le carnet d'erreurs le sait
 * —, mais si c'est À L'INSTANT la deuxième fois. C'est cela qui autorise la
 * phrase « c'est la même chose qu'à la question d'avant », et qui la rend vraie.
 */
export function laMemeBetiseQuAvant(diagnostic) {
    if (!diagnostic) return false;
    const avant = questions[questions.length - 1];
    return !!avant && avant.diagnostic === diagnostic;
}

/**
 * Combien d'échecs de suite sur cette compétence, à l'instant.
 *
 * LA DÉFINITION EST CELLE DE `api/lib/blocages.php`, mot pour mot :
 *
 *   « Une réussite remet le compteur à zéro, et un changement de compétence
 *     aussi : deux échecs sur deux compétences différentes ne sont pas un
 *     blocage, ce sont deux questions difficiles. »
 *
 * ÉCHOUER VEUT DIRE « PAS DU PREMIER COUP », et c'est déjà la définition que le
 * logiciel emploie pour la maîtrise. L'élève qui finit par trouver au troisième
 * essai a buté, et c'est ce moment-là qu'on cherche à voir venir.
 *
 * @param {?string} competence - quand elle est absente, on ne compte rien :
 *        une question sans compétence déclarée ne peut pas faire une suite
 *        « sur la même compétence ».
 */
export function echecsDeSuite(competence) {
    if (!competence) return 0;
    let n = 0;
    for (let i = questions.length - 1; i >= 0; i--) {
        const q = questions[i];
        if (q.competence !== competence || q.duPremierCoup) break;
        n++;
    }
    return n;
}

/** Ce que la mémoire porte, pour une sonde ou une épreuve. */
export function laMemoire() {
    return questions.map(q => ({ ...q }));
}
