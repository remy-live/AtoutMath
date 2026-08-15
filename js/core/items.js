// Le contrat `Item` : la question, indépendante de son affichage.
//
// C'est le pivot de la modularité. Un générateur produit des Items sans rien
// savoir du DOM ni du jeu qui les affichera ; une activité affiche des Items
// sans rien savoir de la notion. On passe ainsi de N×M couplages (chaque jeu
// sait générer ses propres questions) à N+M : ajouter une notion la rend
// jouable dans tous les jeux compatibles, ajouter un jeu lui donne accès à
// toutes les notions existantes.
//
// La compatibilité se lit sur un seul champ : `answerKind`. Une activité
// déclare les genres de réponse qu'elle sait présenter (`accepts`), un
// générateur ceux qu'il sait produire.

/**
 * @typedef {'choice'|'numeric'|'text'|'point'|'pair'|'grid'} AnswerKind
 * ('grid' : l'élève construit un état complet — une grille remplie — validé
 * d'un bloc ; la réponse est sa sérialisation.)
 *
 * @typedef {Object} Choice
 * @property {string|number} value
 * @property {string|number} label
 * @property {boolean} correct
 * @property {string} [why] - erreur ciblée par ce distracteur, affichée si l'élève le choisit
 *
 * @typedef {Object} Item
 * @property {string} seed          - régénère exactement cette question
 * @property {string} skillId
 * @property {string} generatorId
 * @property {AnswerKind} answerKind
 * @property {{text:string, html?:string, sub?:string}} prompt
 * @property {string|number} answer
 * @property {Choice[]} [choices]
 * @property {string[]} hints       - aides graduées, de la plus légère à la plus explicite
 * @property {string} explanation   - correction affichée après coup
 * @property {string} [explicationPapier] - la même, POUR LA FEUILLE IMPRIMÉE,
 *   quand l'écran s'appuie sur un dessin que le papier n'a pas. Une correction
 *   qui parle de pastilles rouges et bleues sous un calcul écrit en chiffres
 *   ne décrit rien : l'élève cherche un dessin qui n'existe pas.
 * @property {number} difficulty    - 1 (facile) à 5
 * @property {Object} meta          - contexte libre pour le rendu (grille, table…)
 */

/** Construit un Item en garantissant la présence des champs obligatoires. */
export function makeItem(spec) {
    const item = {
        seed: spec.seed,
        skillId: spec.skillId,
        generatorId: spec.generatorId || null,
        answerKind: spec.answerKind || 'choice',
        prompt: typeof spec.prompt === 'string' ? { text: spec.prompt } : (spec.prompt || { text: '' }),
        answer: spec.answer,
        choices: spec.choices || null,
        hints: spec.hints || [],
        explanation: spec.explanation || '',
        // Vide = l'explication de l'écran convient au papier. C'est le cas
        // général : on ne double que les corrections qui décrivent une image.
        explicationPapier: spec.explicationPapier || '',
        difficulty: spec.difficulty || 2,
        meta: spec.meta || {}
    };
    if (item.answerKind === 'choice' && (!item.choices || !item.choices.some(c => c.correct))) {
        throw new Error(`[item] ${item.generatorId}: un item 'choice' doit avoir une réponse correcte parmi ses choix`);
    }
    if (!item.prompt.html) item.prompt.html = `<div class="game-question">${item.prompt.text}</div>`;
    return item;
}

/**
 * Assemble la liste finale des propositions d'un item 'choice'.
 *
 * Indispensable : les distracteurs « typés » sont calculés à partir de la
 * réponse (target−1, L×l, produit−diviseur…) et peuvent donc coïncider entre
 * eux, voire avec la bonne réponse — un cas rare mais fatal, puisque l'élève
 * aurait alors deux cases justes dont une comptée fausse. On dédoublonne en
 * gardant toujours la bonne réponse, puis on complète avec `filler` pour
 * atteindre le nombre voulu de cases.
 *
 * @param {Object} rng
 * @param {Array<{value:*, label?:*, correct?:boolean, why?:string}>} choices
 * @param {{count?:number, filler?:(rng)=>*}} options
 */
export function finalizeChoices(rng, choices, { count = 4, filler = null } = {}) {
    const correct = choices.find(c => c.correct);
    if (!correct) throw new Error('[item] aucune réponse correcte parmi les propositions');

    const seen = new Set([String(correct.value)]);
    const distractors = [];

    for (const c of choices) {
        if (c.correct) continue;
        const key = String(c.value);
        if (seen.has(key)) continue;
        seen.add(key);
        distractors.push({ label: c.value, ...c, correct: false });
    }

    let guard = 0;
    while (distractors.length < count - 1 && filler && guard++ < 300) {
        const v = filler(rng);
        if (v === null || v === undefined) continue;
        const key = String(v);
        if (seen.has(key)) continue;
        seen.add(key);
        distractors.push({ value: v, label: v, correct: false });
    }

    return rng.shuffle([{ label: correct.value, ...correct }, ...distractors.slice(0, count - 1)]);
}

/** Comparaison tolérante : "12" == 12, " 3,5 " == "3.5". */
export function sameAnswer(a, b) {
    const norm = v => {
        let s = String(v === undefined || v === null ? '' : v).trim().replace(',', '.').toLowerCase();
        // « 62 307 » ET « 62307 » SONT LE MÊME NOMBRE. Depuis qu'on écrit les
        // grands nombres par groupes de trois — c'est la règle, et c'est ce
        // qui permet de les lire —, une réponse qui porte ses espaces doit
        // valoir autant qu'une réponse sans. On ne les retire que si ce qui
        // reste est bien UN NOMBRE : sinon « trois cent deux » deviendrait
        // « troiscentdeux » et ne ressemblerait plus à rien.
        const nu = s.replace(/[\s\u00A0\u202F]/g, '');
        if (/^[-+]?\d*\.?\d+$/.test(nu)) s = nu;
        return s;
    };
    const na = norm(a), nb = norm(b);
    if (na === nb) return true;
    const fa = parseFloat(na), fb = parseFloat(nb);
    return !isNaN(fa) && !isNaN(fb) && Math.abs(fa - fb) < 1e-9;
}

/**
 * Évalue une réponse et renvoie de quoi construire une tentative + un retour
 * didactique. `misconception` est le `why` du distracteur choisi : c'est ce
 * qui transforme un « faux » en diagnostic.
 */
export function evaluate(item, given) {
    const correct = sameAnswer(given, item.answer);
    let misconception = null;
    if (!correct && item.choices) {
        const picked = item.choices.find(c => sameAnswer(c.value, given));
        if (picked && picked.why) misconception = picked.why;
    }
    return {
        correct,
        expected: item.answer,
        misconception,
        explanation: item.explanation
    };
}

/** Aide de niveau `index`, ou null s'il n'y en a plus. */
export function hintAt(item, index) {
    return item.hints && index < item.hints.length ? item.hints[index] : null;
}

/**
 * Adapte un Item pour une activité qui n'accepte que des choix alors que
 * l'item est numérique : on fabrique des propositions autour de la réponse.
 * Évite d'avoir à écrire deux variantes de chaque générateur.
 */
export function toChoices(item, rng, count = 3) {
    if (item.choices) return item;
    const answer = Number(item.answer);
    if (isNaN(answer)) return item;
    const vals = new Set([answer]);
    let guard = 0;
    while (vals.size < count && guard++ < 200) {
        const delta = rng.int(1, Math.max(2, Math.round(Math.abs(answer) * 0.2) + 3));
        const candidate = answer + (rng.bool() ? delta : -delta);
        if (candidate >= 0) vals.add(candidate);
    }
    return {
        ...item,
        answerKind: 'choice',
        choices: rng.shuffle([...vals]).map(v => ({ value: v, label: v, correct: v === answer }))
    };
}
