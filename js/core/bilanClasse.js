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

/**
 * L'AUTRE ORDRE : CELUI DANS LEQUEL ON CHERCHE QUELQU'UN.
 *
 * RÉMY : « dans le bilan pouvoir trier par nom ».
 *
 * CE N'EST PAS UN DÉSAVEU DE L'ORDRE PRÉCÉDENT, C'EST UNE AUTRE QUESTION. On
 * lit le bilan de haut en bas pour décider ce qu'on reprend lundi, et là
 * l'urgence en tête est le bon ordre. Mais on y revient aussi avec un NOM en
 * tête : un parent qui écrit, un mot dans le carnet, un élève qui conteste sa
 * note. Chercher Maëlle dans trente lignes rangées par taux de réussite, c'est
 * les lire toutes.
 *
 * MÊME COMPARAISON QUE LE MUR, AU CARACTÈRE PRÈS (`vigilance.trierParNom`) :
 * un professeur qui passe du mur au bilan doit retrouver ses élèves dans le
 * même ordre, et deux comparaisons presque identiques finissent toujours par
 * différer sur un cas qu'on ne verra pas venir. Chaque morceau, MESURÉ :
 *
 *   · `localeCompare` — et non `<`, qui compare des codes de caractères :
 *     « Dylan, Fatou, Émile » dans l'ordre des codes, « Dylan, Émile, Fatou »
 *     avec le comparateur de langue. C'est LUI qui range les accents, et
 *     l'option `sensitivity` n'y est pour rien : je l'ai cru et l'épreuve m'a
 *     démenti (voir `docs/frictions.md`).
 *   · `numeric: true` — « Lucas 2 » avant « Lucas 10 », qui passerait sinon en
 *     premier. Il y a deux Lucas dans la classe de Rémy ; le jour où ils sont
 *     numérotés, l'ordre reste celui qu'on lit.
 *   · `sensitivity: 'base'` — « Leo », « leo » et « Léo » comparent égaux, et
 *     c'est alors l'identifiant qui décide. Sans l'option, une majuscule ou un
 *     accent oublié à la saisie déciderait d'une place, de façon invisible.
 *   · L'IDENTIFIANT EN DÉPARTAGE — sans lui, `localeCompare` rend 0 pour les
 *     deux Lucas et leur ordre retombe sur celui du tableau reçu, c'est-à-dire
 *     sur celui du serveur, qui change d'un rafraîchissement à l'autre.
 */
export function ordreParNom(lignes) {
    return (lignes || []).slice().sort((a, b) =>
        String(a.firstName || '').localeCompare(String(b.firstName || ''), 'fr',
            { numeric: true, sensitivity: 'base' })
        || String(a.studentId || '').localeCompare(String(b.studentId || '')));
}

/**
 * LES DEUX ORDRES, NOMMÉS UNE FOIS — l'écran ne choisit pas ses propres mots.
 *
 * LE PREMIER RESTE LE DÉFAUT, ET CE N'EST PAS CE QU'ON A FAIT POUR LE MUR.
 * Le mur se lit PENDANT l'heure, pendant qu'il bouge : son tri est devenu
 * alphabétique parce qu'un élève qui change de place sous le doigt rend la
 * recherche impossible — « le tri n'arrête pas de changer sur le mur c'est
 * compliqué de s'y retrouver ». Le bilan, lui, est figé : rien ne s'y
 * rafraîchit pendant qu'on le lit, personne n'y bouge, et la raison d'être de
 * l'écran — « qu'est-ce que je reprends lundi » — demande l'urgence en tête.
 * Le nom reste à un clic, et l'appareil s'en souvient.
 */
export const ORDRES_DU_BILAN = [
    { cle: 'geste', mot: 'ce qui demande un geste', trier: ordreDuBilan },
    { cle: 'nom', mot: 'par nom', trier: ordreParNom }
];

/** Le trieur d'une clef, avec repli : un réglage inconnu ne casse pas l'écran. */
export function trieurDuBilan(cle) {
    const o = ORDRES_DU_BILAN.find(x => x.cle === cle);
    return (o || ORDRES_DU_BILAN[0]).trier;
}

/**
 * CE QUI EST COMPRIS — l'autre moitié du bilan, et elle manquait.
 *
 * RÉMY : « au début du bilan, mettre ce qu'il faut revoir et ce qui a été
 * compris pour la classe ».
 *
 * L'ÉCRAN NE DISAIT QUE LA MOITIÉ SOMBRE. « À reprendre » existe depuis le
 * premier jour des bilans ; RIEN ne disait ce qui tenait. Un bilan qui
 * n'énumère que les fragilités se lit comme un constat d'échec même quand la
 * séance s'est bien passée — et il interdit le geste le plus simple de la
 * préparation : RAYER de la leçon de lundi ce qui est déjà acquis.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UNE NOTION PEUT ÊTRE DANS LES DEUX LISTES, ET CE N'EST PAS UN DÉFAUT.
 *
 * Vingt-deux élèves ont acquis les relatifs, trois les ont fragiles : les deux
 * phrases sont vraies, et les deux font agir — on raye la leçon collective, on
 * prend les trois à part. Chaque moitié porte ses prénoms, donc aucune ne se
 * lit comme un verdict sur la classe entière.
 *
 * CE QU'IL FAUT EMPÊCHER EST L'INVERSE : annoncer « compris » pour une notion
 * qui est fragile pour autant d'élèves, ou plus. Là, la phrase devient fausse —
 * elle dit « la classe sait » d'une classe coupée en deux —, et c'est sur
 * cette phrase qu'on décide de ne pas reprendre la leçon. ON TRANCHE DONC :
 * une notion n'entre dans « ce qui est compris » que si STRICTEMENT PLUS
 * d'élèves l'ont acquise qu'ils ne l'ont fragile. À égalité, de ces deux
 * lectures c'est « à reprendre » qui fait agir, et elle garde la notion.
 *
 * ET LA LIGNE DIT TOUJOURS POUR COMBIEN ÇA NE TIENT PAS (`fragilePour`) : sans
 * ce nombre, « Les relatifs : 22 élèves » se lit « toute la classe sait ».
 *
 * ON COMPTE SUR CE QUE LE SERVEUR ENVOIE, qui est ce qu'il y a de plus notable
 * chez chaque élève : ses cinq notions les plus fragiles, ses cinq plus
 * solides. Une notion acquise par un élève qui en a six d'autres mieux acquises
 * ne comptera donc pas pour lui. C'est une sous-estimation, pas une erreur : la
 * liste dit « au moins tant d'élèves », ce qui est exactement ce qu'on veut
 * garantir avant d'annoncer à une classe qu'une notion est derrière elle.
 */
export function notionsComprises(lignes) {
    const acquises = new Map();
    const fragiles = new Map();
    for (const l of lignes || []) {
        for (const f of l.weakSkills || []) {
            if (!f || !f.skillId) continue;
            fragiles.set(f.skillId, (fragiles.get(f.skillId) || 0) + 1);
        }
        for (const s of l.strongSkills || []) {
            if (!s || !s.skillId) continue;
            if (!acquises.has(s.skillId)) acquises.set(s.skillId, { skillId: s.skillId, eleves: [] });
            acquises.get(s.skillId).eleves.push({
                studentId: l.studentId,
                firstName: l.firstName,
                mastery: Number(s.mastery) || 0,
                level: s.level || ''
            });
        }
    }
    return [...acquises.values()]
        .map(n => ({
            ...n,
            combien: n.eleves.length,
            fragilePour: fragiles.get(n.skillId) || 0,
            maitriseMoyenne: n.eleves.reduce((s, e) => s + e.mastery, 0) / n.eleves.length
        }))
        .filter(n => n.combien > n.fragilePour)
        // Du plus largement acquis au plus isolé, puis le mieux maîtrisé
        // d'abord : c'est l'ordre dans lequel on raye des lignes.
        .sort((a, b) => (b.combien - a.combien) || (b.maitriseMoyenne - a.maitriseMoyenne));
}
