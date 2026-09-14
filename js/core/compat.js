// Ponts de compatibilité avec l'ancien modèle de données.
//
// L'ancienne application identifiait les notions par des chaînes ad hoc
// ("mult:7", "addition", "priority") parfois devinées à partir de la forme des
// champs d'une question. Ce module traduit ces clés vers les identifiants du
// référentiel (js/data/skills.js) pour que l'historique existant reste
// exploitable après migration.

const CONCEPT_MAP = {
    addition: 'num.add.entiers',
    soustraction: 'num.sub.entiers',
    priority: 'num.prio',
    coords: 'geo.repere.coord'
};

/** "mult:7" -> "num.mult.table.7" ; "addition" -> "num.add.entiers". */
export function conceptToSkill(concept) {
    if (!concept) return null;
    if (concept.startsWith('num.') || concept.startsWith('geo.') || concept.startsWith('mes.') || concept.startsWith('don.')) {
        return concept; // déjà un identifiant de compétence
    }
    const m = /^mult:(\d+)$/.exec(concept);
    if (m) return `num.mult.table.${m[1]}`;
    return CONCEPT_MAP[concept] || null;
}

/**
 * Déduit une compétence à partir des champs bruts d'une ancienne question,
 * quand aucun `concept` n'était fourni. Uniquement utilisé pour la migration
 * de l'historique : le code neuf déclare toujours son `skillId`.
 */
export function deriveSkillFromLegacy(qd) {
    if (!qd) return null;
    if (qd.skillId) return qd.skillId;
    if (qd.concept) return conceptToSkill(qd.concept);
    if (qd.t !== undefined) return `num.mult.table.${qd.t}`;
    if (qd.targetFactor !== undefined) return `num.mult.table.${qd.targetFactor}`;
    if (qd.col !== undefined) return `num.mult.table.${qd.col}`;
    if (qd.eq !== undefined) return 'num.prio';
    if (qd.tx !== undefined) return 'geo.repere.coord';
    if (qd.op === '-') return 'num.sub.entiers';
    if (qd.a !== undefined && qd.b !== undefined) return 'num.add.entiers';
    return null;
}
