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
 * @property {boolean} [ecritureExacte] - la réponse est une ÉCRITURE, pas un
 *   nombre : « 53,300 » ne vaut alors plus « 53,3 ». Voir `makeItem`.
 * @property {string[]} hints       - aides graduées, de la plus légère à la plus explicite
 * @property {string} explanation   - correction affichée après coup
 * @property {string} [reponsePapier] - la réponse telle qu'on l'écrit dans le
 *   corrigé de la FEUILLE, quand celle-ci pose plus (ou autre chose) que
 *   l'écran — les quatre cases d'un tableau de valeurs, par exemple.
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
        // DIAGNOSTIQUER UNE RÉPONSE TAPÉE, PAS SEULEMENT UNE RÉPONSE CHOISIE.
        //
        // Un item à propositions dit pourquoi chaque leurre est faux : c'est le
        // `why` du distracteur, et c'est ce qui transforme un « faux » en
        // diagnostic. Un item à saisie n'avait rien — l'élève tapait un nombre,
        // recevait « faux », et l'explication générale, la même pour tout le
        // monde, ne parlait pas de SON erreur.
        //
        // Rémy, sur le disque : « Explique l'erreur d'arrondi si l'élève en
        // fait une. » Tronquer au lieu d'arrondir, arrondir au mauvais rang,
        // recopier toutes les décimales : trois fautes qui n'en sont pas une
        // seule, et qui se reconnaissent au nombre écrit.
        //
        // On ne réutilise pas `choices` pour cela : ces valeurs ne doivent
        // JAMAIS s'afficher. `choices` sur un item à saisie ferait imprimer un
        // QCM sur la fiche papier et jouerait la mauvaise réponse en démo.
        //
        // @type {?Array<{value:*, why:string}>}
        diagnostics: spec.diagnostics || null,
        hints: spec.hints || [],
        // UN INDICE PEUT AVOIR UN DESSIN.
        //
        // Rémy : « l'indice est incompréhensible ; pourquoi ne pas avoir un
        // petit schéma ? C'est quelque chose que nous n'avons pas mis dans les
        // indices, alors que c'est souvent plus parlant. » Il a raison, et cela
        // manquait partout, pas seulement là où il l'a vu. `schemas[i]` est le
        // dessin — du HTML fabriqué par le générateur, donc de confiance — qui
        // accompagne `hints[i]`. Les entrées vides sont la règle : un indice
        // qui n'a rien à montrer n'en a pas besoin.
        schemas: spec.schemas || [],
        /**
         * COMMENT ON JUGE UNE RÉPONSE TAPÉE, quand la comparer au texte attendu
         * ne suffit pas.
         *
         * Rémy : « on ne peut jamais taper la réponse, c'est toujours un QCM,
         * quel dommage ». Le clavier existait pourtant — mais `choice.js` n'y
         * passait que si la réponse était un NOMBRE. Pour une expression, il
         * n'y avait aucune route.
         *
         * Et pour une expression, la comparaison de chaînes ne convient pas :
         * (x − 3)(x + 3) et (x + 3)(x − 3) sont tous deux justes, et aucun
         * n'est « la » réponse. Un item peut donc apporter sa propre règle —
         * pour une factorisation, comparer les POLYNÔMES et exiger qu'elle
         * aille jusqu'au bout.
         *
         * @type {?(saisie: string) => (boolean | {juste: boolean, pourquoi?: string})}
         */
        verifieTexte: spec.verifieTexte || null,
        /**
         * QUAND C'EST L'ÉCRITURE QUI EST LA RÉPONSE.
         *
         * RÉMY : « dans les zéros inutiles, tu considères comme bon comme
         * réponse 53,300 ; par exemple 0530,060 = 530,06 ».
         *
         * `sameAnswer` compare les NOMBRES : 53,300 et 53,3 sont le même
         * nombre, donc la réponse passait. C'est voulu presque partout — un
         * quotient écrit « 25,0 » est juste, et refuser le zéro de trop
         * ferait perdre un point pour une broutille. Mais « La Chasse aux
         * Zéros » demande précisément d'ENLEVER ces zéros : la réponse n'est
         * pas un nombre, c'est une ÉCRITURE. Mesuré avant correction, sur
         * quarante questions : 54 réponses encore chargées de zéros sur 54
         * étaient comptées justes — y compris RECOPIER LA QUESTION, qui
         * rapportait un point pour n'avoir rien fait.
         *
         * L'exercice qui juge une écriture le déclare donc, et c'est le seul
         * endroit où on se le permet : le défaut reste la tolérance.
         *
         * @type {boolean}
         */
        ecritureExacte: !!spec.ecritureExacte,
        explanation: spec.explanation || '',
        // Vide = l'explication de l'écran convient au papier. C'est le cas
        // général : on ne double que les corrections qui décrivent une image.
        explicationPapier: spec.explicationPapier || '',
        // CE QU'IL FAUT LIRE DANS LE CORRIGÉ, quand la feuille ne demande pas la
        // même chose que l'écran. Un tableau de valeurs à quatre cases n'a pas
        // « 13 » pour réponse : il en a quatre, et le corrigé doit les donner.
        // Vide = la réponse de l'écran convient, ce qui est le cas général.
        reponsePapier: spec.reponsePapier || '',
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
        // LE RANG SURVIT AU MÉLANGE.
        //
        // Les distracteurs sont écrits du plus instructif au plus anodin : le
        // premier porte presque toujours le « pourquoi » qui nomme l'erreur du
        // chapitre. Le mélange qui suit efface cet ordre — il le faut, sinon la
        // bonne réponse serait toujours à la même place — et sans trace, réduire
        // plus tard la liste à deux propositions reviendrait à en garder deux au
        // hasard, donc à jeter une fois sur deux celui qui expliquait. On note
        // donc le rang d'origine ; `reduireChoix` s'en sert.
        distractors.push({ label: c.value, ...c, correct: false, rang: distractors.length });
    }

    let guard = 0;
    while (distractors.length < count - 1 && filler && guard++ < 300) {
        const v = filler(rng);
        if (v === null || v === undefined) continue;
        const key = String(v);
        if (seen.has(key)) continue;
        seen.add(key);
        // Les bouche-trous passent APRÈS ceux que l'auteur a écrits : ils ne
        // portent pas d'explication, ce sont eux qu'on retire en premier.
        distractors.push({ value: v, label: v, correct: false, rang: distractors.length });
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
    // ON NE COMPARE COMME DES NOMBRES QUE CE QUI EST UN NOMBRE, EN ENTIER.
    //
    // `parseFloat` lit le début et abandonne le reste : `parseFloat('16/24')`
    // rend 16. Deux fractions de même numérateur étaient donc déclarées
    // égales — 16/24 valait 16/12, et l'addition de fractions félicitait
    // l'élève qui avait additionné les dénominateurs. C'est le distracteur
    // numéro un de l'exercice, et il était compté juste.
    //
    // Trouvé en vérifiant tout autre chose : Rémy signalait que la réponse
    // posée à côté du signe égal n'était pas écrite en fraction. Elle l'est
    // maintenant — et c'est en la regardant qu'on a vu qu'elle était fausse.
    if (!estNombreEntier(na) || !estNombreEntier(nb)) return false;
    return Math.abs(parseFloat(na) - parseFloat(nb)) < 1e-9;
}

/**
 * MÊME ÉCRITURE, et pas seulement même valeur.
 *
 * On garde les tolérances qui ne touchent pas à ce qu'on travaille : les
 * espaces autour, la virgule ou le point (c'est une affaire de clavier, pas
 * de numération), les espaces de milliers, la casse. On abandonne la seule
 * qui compte ici : l'égalité numérique. « 53,30 » n'est donc plus « 53,3 »,
 * et « 0147 » n'est plus « 147 ».
 */
export function memeEcriture(a, b) {
    const norm = (v) => {
        let s = String(v === undefined || v === null ? '' : v).trim().replace(',', '.').toLowerCase();
        const nu = s.replace(/[\s\u00A0\u202F]/g, '');
        if (/^[-+]?\d*\.?\d+$/.test(nu)) s = nu;
        return s;
    };
    return norm(a) === norm(b);
}

/** La chaîne est-elle un nombre, et RIEN QUE lui ? */
const estNombreEntier = (s) => /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/.test(s);

/**
 * Évalue une réponse et renvoie de quoi construire une tentative + un retour
 * didactique. `misconception` est le `why` du distracteur choisi : c'est ce
 * qui transforme un « faux » en diagnostic.
 */
export function evaluate(item, given) {
    // UN SEUL COMPARATEUR POUR TOUT L'ITEM — le verdict ET les diagnostics.
    // Sinon un item jugé sur l'écriture irait chercher son « pourquoi » avec
    // la règle tolérante, et le distracteur « il reste des zéros à la fin »,
    // qui vaut le même nombre que la bonne réponse, serait reconnu... comme
    // la bonne réponse.
    const pareil = item.ecritureExacte ? memeEcriture : sameAnswer;
    const correct = pareil(given, item.answer);
    let misconception = null;
    if (!correct && item.choices) {
        const picked = item.choices.find(c => pareil(c.value, given));
        if (picked && picked.why) misconception = picked.why;
    }
    // Puis les diagnostics de saisie — voir `makeItem`. Ils ne prennent jamais
    // la place d'un distracteur reconnu : celui-là a été CHOISI, celui-ci est
    // deviné d'après ce qui a été tapé.
    if (!correct && !misconception && Array.isArray(item.diagnostics)) {
        const vu = item.diagnostics.find(d => pareil(d.value, given));
        if (vu && vu.why) misconception = vu.why;
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

/** Le dessin qui accompagne l'aide de niveau `index`, s'il y en a un. */
export function schemaAt(item, index) {
    return (item && item.schemas && item.schemas[index]) || null;
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
