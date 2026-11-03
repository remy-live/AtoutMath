// LA REPRISE — ce que CET élève-là doit refaire, et rien d'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 3 novembre, devant la maquette : « Oui c'est génial ». La feuille de
// reprise est une feuille par élève, toutes différentes, fabriquées depuis son
// propre journal.
//
// ── POURQUOI CE N'EST PAS « LES EXERCICES RATÉS, REMIS » ───────────────────
//
// On pourrait reprendre les questions manquées telles quelles. Ce serait plus
// simple et ce serait faux : une question qu'on a ratée et qu'on refait, on la
// reconnaît, et la reconnaître n'est pas la comprendre. Ce qui se reprend est
// la COMPÉTENCE — « l'aire d'un rectangle » —, avec des nombres neufs tirés
// par le générateur. L'élève refait le geste, pas la question.
//
// ── TROIS NOTIONS AU MAXIMUM, ET C'EST UNE DÉCISION ────────────────────────
//
// Un élève qui rate six compétences ne les reprend pas toutes le même soir :
// une feuille de six notions est une feuille qu'on repousse. On garde les
// TROIS PLUS FRAGILES, celles dont la maîtrise est la plus basse — ce sont
// elles qui bloquent la suite, et les autres reviendront à la reprise
// suivante.
//
// ── ET L'ON NE REPREND QUE CE QU'ON A MESURÉ ───────────────────────────────
//
// Une compétence vue deux fois n'est pas une compétence ratée : c'est une
// compétence inconnue. `fiable` est le drapeau que `core/bilan.js` pose quand
// il y a eu assez de questions pour juger ; on le lit, on ne le refait pas.
// Sans lui, un élève absent à la moitié de la séance recevrait une feuille de
// reprise sur des notions qu'il n'a jamais ouvertes.

/** Combien de notions une feuille de reprise porte au maximum. */
export const MAX_NOTIONS = 3;

/** Combien de questions par notion. Quatre : assez pour installer, assez court
 *  pour être fait le soir même. */
export const QUESTIONS_PAR_NOTION = 4;

/** Au-dessous de ce taux de réussite, la notion est à reprendre. */
export const SEUIL = 0.6;

/**
 * LES NOTIONS À REPRENDRE, de la plus fragile à la moins fragile.
 *
 * @param {object} bilan   un élève de `bilanClasse` — `{ competences, tetu }`
 * @param {object} [o]
 * @param {number} [o.max]     combien de notions au maximum
 * @param {number} [o.seuil]   le taux en dessous duquel on reprend
 */
export function notionsAReprendre(bilan, o = {}) {
    const max = o.max ?? MAX_NOTIONS;
    const seuil = o.seuil ?? SEUIL;
    const liste = (bilan && bilan.competences) || [];
    return liste
        // FIABLE D'ABORD : une notion vue deux fois n'est pas ratée, elle est
        // inconnue. Voir l'en-tête.
        .filter(c => c && c.fiable && Number(c.taux) < seuil)
        // LA PLUS FRAGILE EN PREMIER. À taux égal, celle qui a été vue le plus
        // souvent : c'est celle sur laquelle l'élève a déjà le plus insisté
        // sans y arriver.
        .sort((a, b) => (a.taux - b.taux) || (b.essais - a.essais))
        .slice(0, max)
        .map(c => ({ skillId: c.skillId, nom: c.nom, taux: c.taux, essais: c.essais }));
}

/**
 * L'ERREUR QUI REVIENT, quand elle porte sur une des notions reprises.
 *
 * `tetu` est la question que l'élève a ratée le plus souvent (voir
 * `core/bilan.js`). Elle ne sert ici QUE si elle concerne une notion de la
 * feuille : rappeler une erreur de géométrie en tête d'une feuille de calcul
 * mental n'aide personne, et donne l'impression d'une machine qui recopie.
 */
export function erreurARappeler(bilan, notions) {
    const t = bilan && bilan.tetu;
    if (!t || !t.skillId) return null;
    if (!notions.some(n => n.skillId === t.skillId)) return null;
    if (!t.given || !t.expected) return null;
    return {
        skillId: t.skillId, question: t.questionText || '',
        donne: t.given, attendu: t.expected,
        fois: t.count || 0, meprise: t.misconception || ''
    };
}

/**
 * LA PHRASE EN TÊTE DE LA FEUILLE — celle que l'élève lit en premier.
 *
 * ELLE DIT CE QU'IL NE REPREND PAS, et c'est le plus important. « Le reste de
 * la séance est acquis » transforme une feuille de rattrapage en feuille de
 * finition : l'élève ne reçoit pas la preuve qu'il a échoué, il reçoit la
 * liste de ce qu'il lui reste. La différence tient en une proposition, et
 * c'est elle qui décide s'il la fait.
 */
export function phraseDeReprise(notions) {
    const noms = notions.map(n => n.nom).filter(Boolean);
    if (!noms.length) return '';
    const liste = noms.length === 1 ? noms[0]
        : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
    const combien = noms.length === 1 ? 'une seule chose'
        : noms.length === 2 ? 'deux choses, et deux seulement'
            : 'trois choses, et trois seulement';
    return `Tu reprends ${combien} : ${liste}. Le reste est acquis — on n'y revient pas.`;
}

/**
 * LE PARCOURS DE REPRISE — une étape par notion, prêt pour la feuille.
 *
 * ON REND UN PARCOURS, et non une liste de questions : c'est ce que tout le
 * reste du logiciel sait déjà imprimer, donner, coder, afficher. Une reprise
 * EST une séance — courte, choisie, personnelle —, et la traiter comme un
 * objet d'un autre genre aurait demandé un second chemin pour chaque chose
 * qu'on voudra en faire demain.
 *
 * @param {object}   bilan        un élève de `bilanClasse`
 * @param {function} trouverExo   `firstExerciseForSkill` — passée, pour que ce
 *   module reste pur et éprouvable sans le catalogue.
 * @param {object}   [o]
 * @returns {{nom, eleveId, notions, erreur, phrase, steps}|null} `null` quand
 *   il n'y a rien à reprendre : un élève qui a tout réussi ne reçoit pas de
 *   feuille vide.
 */
export function parcoursDeReprise(bilan, trouverExo, o = {}) {
    const notions = notionsAReprendre(bilan, o);
    // CHAQUE NOTION DOIT AVOIR UN EXERCICE QUI LA TRAVAILLE, sinon elle sort.
    // Une étape sans exercice imprimerait un titre et du vide — et le vide
    // serait pile en face de la notion qu'on voulait reprendre.
    const avecExo = notions
        .map(n => ({ ...n, exerciseId: trouverExo(n.skillId) }))
        .filter(n => n.exerciseId);
    if (!avecExo.length) return null;
    const parNotion = o.questions ?? QUESTIONS_PAR_NOTION;
    return {
        nom: `Reprise — ${(bilan && bilan.nom) || 'élève'}`,
        eleveId: (bilan && bilan.id) || null,
        eleve: (bilan && bilan.nom) || '',
        notions: avecExo,
        erreur: erreurARappeler(bilan, avecExo),
        phrase: phraseDeReprise(avecExo),
        // `notion` VOYAGE AVEC L'ÉTAPE, et c'est ce qui permet à la feuille de
        // n'annoncer en tête que ce qu'elle porte VRAIMENT. Une étape peut
        // encore tomber en route — un exercice retiré du catalogue, un
        // générateur qui refuse ses réglages —, et une phrase qui promet une
        // notion absente est pire qu'une phrase plus courte.
        steps: avecExo.map(n => ({
            exerciseId: n.exerciseId, params: {}, nbItems: parNotion, notion: n.nom
        }))
    };
}

/**
 * TOUTE LA CLASSE, D'UN COUP — et ce qu'on n'a pas pu faire.
 *
 * ON REND AUSSI LES ÉCARTÉS, avec leur raison. Une fonction qui rendrait
 * seulement les vingt-trois feuilles qu'elle a su faire laisserait croire que
 * la classe en compte vingt-trois ; le professeur doit savoir que Ethan n'a
 * rien déposé et que Jade a tout réussi — ce ne sont pas la même nouvelle.
 */
export function reprisesDeLaClasse(eleves, trouverExo, o = {}) {
    const fiches = [], ecartes = [];
    for (const b of eleves || []) {
        if (!b || !(b.questions > 0)) {
            ecartes.push({ nom: (b && b.nom) || '?', pourquoi: 'n\'a rien déposé' });
            continue;
        }
        const f = parcoursDeReprise(b, trouverExo, o);
        if (f) fiches.push(f);
        else ecartes.push({ nom: b.nom, pourquoi: 'rien à reprendre' });
    }
    return { fiches, ecartes };
}
