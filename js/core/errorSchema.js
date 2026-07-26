/**
 * Crée un snapshot d'erreur standardisé.
 * @param {Object} params
 * @param {string|number} params.input - La réponse donnée par l'utilisateur
 * @param {string|number} params.expected - La réponse attendue
 * @param {string} params.questionText - L'intitulé de la question (ex: "5 + 3", "(2; 4)", "10 + 2 * 3")
 * @param {string} params.customMessage - (Optionnel) Un message d'erreur personnalisé
 * @returns {Object} Un objet erreur prêt à être sauvegardé
 */
export function createErrorSnapshot({ input, expected, questionText, customMessage = '', ...rawContext }) {
    return {
        isStandardized: true, // Flag to distinguish from legacy errors
        input: input !== undefined ? String(input) : '',
        expected: expected !== undefined ? String(expected) : '',
        questionText: questionText || '',
        customMessage: customMessage || '',
        ...rawContext
    };
}
