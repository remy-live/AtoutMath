// LE BILAN D'UNE CLASSE — ce qu'il faut reprendre, et avec qui.
//
// Rémy voulait des bilans, et la route du serveur existait depuis longtemps :
// `/teacher/report` rend pour chaque élève ses questions, sa réussite, son
// temps, ses erreurs ouvertes et ses compétences faibles. AUCUN ÉCRAN DE
// L'APPLICATION NE L'APPELAIT. On ne pouvait le lire que par les pages
// d'administration, c'est-à-dire en sortant de l'application — et Rémy avait
// déjà dit ce qu'il en pensait : « j'aimerai ne pas passer par admin ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// MAIS UN TABLEAU DE TRENTE LIGNES N'EST PAS UN BILAN.
//
// Trente lignes de chiffres, c'est la MATIÈRE d'un bilan ; le bilan, c'est la
// phrase qu'on en tire. Et la question qu'un professeur se pose en rentrant
// chez lui n'est pas « quel est le taux de réussite de Léo » — il le sait, il
// était là. C'est : QU'EST-CE QUE JE DOIS REPRENDRE LUNDI, ET AVEC QUI ?
//
// Ce module ne fait que cela : retourner le tableau. On a trente élèves avec
// chacun leurs notions faibles ; on rend les notions, avec pour chacune les
// élèves qu'elle met en difficulté. La même donnée, lue dans l'autre sens — et
// c'est le sens dans lequel on prépare un cours.
//
// UNE NOTION FAIBLE POUR UN SEUL ÉLÈVE N'EST PAS LA MÊME CHOSE QUE POUR DOUZE.
// La première appelle un accompagnement, la seconde appelle une leçon. On les
// range donc par nombre d'élèves concernés, et l'on dit ce nombre.

/** En dessous, la mesure ne veut rien dire : trop peu de questions. */
export const MINIMUM_FIABLE = 1;

/**
 * LES NOTIONS À REPRENDRE, DE LA PLUS PARTAGÉE À LA PLUS ISOLÉE.
 *
 * @param {Array} lignes  ce que rend /teacher/report (`students`)
 * @returns {Array<{skillId, combien, eleves:[{studentId, firstName, mastery}], maitriseMoyenne}>}
 */
export function notionsAReprendre(lignes) {
    const par = new Map();
    for (const l of lignes || []) {
        for (const f of l.weakSkills || []) {
            if (!f || !f.skillId) continue;
            if (!par.has(f.skillId)) par.set(f.skillId, { skillId: f.skillId, eleves: [] });
            par.get(f.skillId).eleves.push({
                studentId: l.studentId,
                firstName: l.firstName,
                mastery: Number(f.mastery) || 0,
                level: f.level || ''
            });
        }
    }
    return [...par.values()]
        .map(n => ({
            ...n,
            combien: n.eleves.length,
            // La moyenne dit à quel point c'est fragile ; le nombre dit pour
            // combien. Les deux ensemble distinguent « douze élèves un peu
            // justes » de « trois élèves complètement perdus ».
            maitriseMoyenne: n.eleves.reduce((s, e) => s + e.mastery, 0) / n.eleves.length
        }))
        .filter(n => n.combien >= MINIMUM_FIABLE)
        .sort((a, b) => (b.combien - a.combien) || (a.maitriseMoyenne - b.maitriseMoyenne));
}

/**
 * CE QUE LA CLASSE A FAIT, EN QUATRE NOMBRES.
 *
 * ON NE REND PAS UNE MOYENNE DE MOYENNES. Le taux de réussite de la classe est
 * le nombre de bonnes réponses divisé par le nombre de questions — pas la
 * moyenne des taux individuels. Les deux diffèrent dès que les élèves n'ont pas
 * fait le même nombre de questions, et c'est toujours le cas : celui qui a
 * répondu à trois questions pèserait alors autant que celui qui en a fait
 * soixante.
 */
export function resumeDeClasse(lignes) {
    const liste = lignes || [];
    let questions = 0, justes = 0, secondes = 0, erreurs = 0, actifs = 0;
    for (const l of liste) {
        const q = Number(l.totalQuestions) || 0;
        questions += q;
        if (q > 0) {
            actifs++;
            if (l.successRate !== null && l.successRate !== undefined) {
                justes += Math.round(q * Number(l.successRate));
            }
        }
        secondes += Number(l.timeSeconds) || 0;
        erreurs += Number(l.openErrors) || 0;
    }
    return {
        eleves: liste.length,
        actifs,
        // Personne n'a rien fait : il n'y a pas de taux, et « 0 % » serait un
        // mensonge — c'est « rien à dire », pas « tout est faux ».
        questions, justes, erreurs, secondes,
        reussite: questions ? justes / questions : null,
        jamaisVenus: liste.filter(l => !l.lastSeenAt).length
    };
}

/**
 * « 3 h 12 » pour une classe, « 24 min » pour un élève.
 *
 * ZÉRO NE SE DIT PAS « MOINS D'UNE MINUTE ». Une classe qui a répondu à quatre
 * cent soixante et une questions et qui affiche « moins d'une minute de
 * travail » se lit comme une panne — et c'en est une, d'ailleurs : c'est du
 * temps qui n'a pas été enregistré, pas du temps qui n'a pas été passé. Le
 * tiret dit « on ne sait pas », ce qui est la vérité.
 */
export function enHeures(secondes) {
    const s = Math.max(0, Math.floor(secondes || 0));
    if (s <= 0) return '—';
    if (s < 60) return 'moins d\'une minute';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0');
}

/**
 * L'ORDRE DU TABLEAU : CEUX DONT ON DOIT S'OCCUPER D'ABORD.
 *
 * Pas alphabétique. Un bilan qu'on lit de haut en bas doit commencer par ce qui
 * demande un geste — et le premier geste, c'est pour celui qui n'a rien fait.
 * Ensuite les plus en difficulté parmi ceux qui ont travaillé.
 */
export function ordreDuBilan(lignes) {
    return (lignes || []).slice().sort((a, b) => {
        const rienA = !(Number(a.totalQuestions) || 0);
        const rienB = !(Number(b.totalQuestions) || 0);
        if (rienA !== rienB) return rienA ? -1 : 1;
        const ra = a.successRate === null || a.successRate === undefined ? 2 : a.successRate;
        const rb = b.successRate === null || b.successRate === undefined ? 2 : b.successRate;
        if (ra !== rb) return ra - rb;
        return String(a.firstName || '').localeCompare(String(b.firstName || ''), 'fr');
    });
}
