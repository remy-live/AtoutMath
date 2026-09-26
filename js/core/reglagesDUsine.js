// CE QUE VAUT UN RÉGLAGE QU'ON N'A PAS TOUCHÉ — une seule définition.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Trois endroits du logiciel ont besoin de la même réponse, et ce n'est pas un
// hasard : ils parlent tous de l'ÉCART entre ce que le professeur a choisi et
// ce que l'exercice ferait tout seul.
//
//   · le panneau de configuration, pour n'enregistrer que les écarts ;
//   · le code dicté, pour écrire les réglages en lettres (`core/shortcodes.js`)
//     et surtout pour les RELIRE en écrivant les mêmes écarts, sans quoi le
//     parcours reçu par code n'aurait pas la même identité que celui qu'on a
//     donné, et le panneau « À qui ce parcours est donné » ne cocherait jamais ;
//   · la ligne de l'étape dans le constructeur, qui dit ce qui a été réglé.
//
// Cette règle-ci était écrite dans `games/configUI.js`, avec cet avertissement
// que je n'ai fait que suivre : « Deux définitions du « défaut » finiraient par
// diverger, et l'on troquerait un code long contre un exercice qui se joue
// autrement. » Le code dicté en avait besoin ; le recopier dans le noyau aurait
// fabriqué la deuxième définition. Elle vit donc ici, et le panneau l'importe.
//
// Module pur : ni DOM, ni catalogue. On lui passe l'exercice et son schéma.

/**
 * LA VALEUR D'USINE D'UN RÉGLAGE : celle du catalogue, à défaut celle du schéma.
 *
 * C'est mot pour mot ce que le panneau AFFICHE quand rien n'a été touché —
 * `current[p.id] !== undefined ? current[p.id] : p.default` avec
 * `current = {...exo.params, ...overrides}`. Sans override, la valeur montrée
 * est donc `exo.params[p.id]`, à défaut `p.default`.
 */
export function valeurDUsine(exo, p) {
    if (!p || !p.id) return undefined;
    const params = (exo && exo.params) || {};
    return params[p.id] !== undefined ? params[p.id] : p.default;
}

/**
 * DEUX VALEURS DE RÉGLAGE SONT-ELLES LA MÊME ?
 *
 * Pas `===` : le DOM ne rend que du texte, et le « 12 » relu dans un champ doit
 * valoir le 12 écrit dans le catalogue. Sans cette règle, tout nombre
 * paraîtrait modifié et tout code deviendrait long.
 */
export function memeReglage(a, b) {
    if (a === b) return true;
    // Les listes se comparent par leur contenu : deux tableaux d'égal contenu ne
    // sont jamais `===`, et c'est le cas des cases à cocher.
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((v, i) => String(v) === String(b[i]));
    }
    if (a === undefined || b === undefined) return false;
    if (typeof a !== 'object' && typeof b !== 'object') return String(a) === String(b);
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * LES SEULES CLÉS QUI S'ÉCARTENT DE CE QUE L'EXERCICE FERAIT TOUT SEUL.
 *
 * Mesuré avant d'être corrigé : le panneau enregistrait TOUT le schéma dès
 * qu'on l'ouvrait, y compris les réglages qu'on n'avait pas touchés. Le
 * constructeur croyait donc que le contenu avait changé, annonçait « réglages
 * modifiés » sur une étape intacte, et le code court basculait en code long
 * pour rien — le professeur lisait une accusation fausse et perdait son code au
 * tableau.
 *
 * @param {object} lus     ce que `readParams` a relu dans le panneau
 * @param {object} exo     l'exercice du catalogue
 * @param {Array}  schema  le schéma qui a peint le panneau
 * @returns {object} les seules clés qui s'écartent
 */
export function reglagesQuiChangent(lus, exo, schema) {
    const params = (exo && exo.params) || {};
    const defauts = {};
    (schema || []).forEach(p => {
        if (!p || !p.id) return;
        defauts[p.id] = valeurDUsine(exo, p);
    });

    const out = {};
    Object.entries(lus || {}).forEach(([cle, valeur]) => {
        const base = defauts[cle];
        // LES CLÉS HORS SCHÉMA — `repartitionMarches` et les réglages posés
        // marche par marche — n'ont pas de défaut déclaré. Vides, elles ne
        // disent rien : les garder rallongerait le code pour un choix que
        // personne n'a fait.
        if (base === undefined) {
            const vide = valeur === '' || valeur === null
                || (Array.isArray(valeur) && !valeur.length);
            if (vide) return;
            if (params[cle] !== undefined && memeReglage(valeur, params[cle])) return;
            out[cle] = valeur;
            return;
        }
        if (!memeReglage(valeur, base)) out[cle] = valeur;
    });
    return out;
}
