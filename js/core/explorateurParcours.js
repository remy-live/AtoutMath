// L'EXPLORATEUR DE PARCOURS — retrouver le sien parmi cent.
//
// Rémy : « je trouve que l'explorateur de parcours (donc les noms des parcours,
// pas le contenu) va vite avoir ses limites. Il faudrait un explorateur avec
// les derniers parcours édités. Il faut que ce soit bien intégré, sobre, avec
// la date de modif et les informations ; on peut avoir une flèche pour avoir
// plus d'info ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// « VA VITE AVOIR SES LIMITES » — IL A RAISON, ET ON PEUT DIRE À PARTIR DE QUAND.
//
// L'explorateur montre les dossiers, puis les parcours de la racine, dans
// l'ordre où ils ont été créés. Cela marche tant qu'on en a dix. À cinquante —
// une année de sixième, une de cinquième, deux de quatrième, plus les
// remaniements —, retrouver « celui de la semaine dernière » demande de lire
// cinquante noms qui se ressemblent tous : « Fractions », « Fractions 2 »,
// « Fractions (bis) ».
//
// TROIS DÉCISIONS, ET LA PREMIÈRE COMMANDE LES DEUX AUTRES.
//
// L'ORDRE EST CELUI DE LA DERNIÈRE MODIFICATION. C'est la seule chose qu'on
// sait vraiment d'un parcours qu'on cherche : on y a touché récemment. Trier
// par nom suppose qu'on se souvienne du nom ; trier par création suppose qu'on
// se souvienne de l'ordre où on les a faits. Ni l'un ni l'autre n'est vrai.
//
// CE QU'ON MONTRE EN PREMIER TIENT SUR UNE LIGNE. Le nom, ce qu'il contient en
// deux chiffres, et depuis quand on n'y a pas touché. Rémy dit « sobre » :
// une liste qu'on balaie, pas une fiche qu'on lit.
//
// LE RESTE EST DERRIÈRE UNE FLÈCHE, et il y a DEUX choses derrière — Rémy, à
// la question « le contenu ou les classes ? » : « les deux ». Ce que le
// parcours contient, et à qui on l'a donné. Les deux répondent à la même
// question posée autrement : « est-ce bien celui-là ? »

/**
 * QUAND, EN FRANÇAIS ET SANS HORLOGE.
 *
 * Le professeur ne cherche pas un horodatage : il cherche « c'est celui de la
 * semaine dernière ». Au-delà d'une semaine, la date exacte redevient plus
 * parlante que le compte des jours — « il y a 34 jours » ne se rapporte à rien.
 *
 * Accepte un instant en millisecondes (le journal), en secondes (l'API), ou une
 * date SQL (« 2026-09-15 14:29:03 »). Les trois existent dans ce logiciel, et
 * trois fonctions qui font la même chose finissent par ne plus la faire pareil.
 */
export function quandLisible(quand, maintenant = Date.now()) {
    const t = instantDe(quand);
    if (t === null) return '';
    const jours = Math.floor((maintenant - t) / 86400000);
    if (jours < 0) return 'à venir';
    if (jours === 0) return 'aujourd\'hui';
    if (jours === 1) return 'hier';
    if (jours < 7) return `il y a ${jours} jours`;
    if (jours < 14) return 'la semaine dernière';
    return 'le ' + new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/** Ramener à des millisecondes ce qui peut arriver sous trois formes. */
export function instantDe(quand) {
    if (quand === null || quand === undefined || quand === '') return null;
    if (typeof quand === 'number') {
        if (!isFinite(quand) || quand <= 0) return null;
        // Un instant en SECONDES tient sur dix chiffres jusqu'en 2286 ; en
        // millisecondes il en fait treize. Le seuil sépare les deux sans
        // ambiguïté pour toute date postérieure à 1973.
        return quand < 1e11 ? quand * 1000 : quand;
    }
    const t = new Date(String(quand).replace(' ', 'T'));
    return isNaN(t.getTime()) ? null : t.getTime();
}

/**
 * CE QU'ON SAIT D'UN PARCOURS, EN DEUX CHIFFRES.
 *
 * ON NE COMPTE PAS LES JEUX DE RÉCOMPENSE DANS LES QUESTIONS. Un parcours de
 * quatre exercices plus un Tetris n'a pas « cinquante-huit questions » : le
 * Tetris n'en pose aucune, et l'annoncer ferait paraître le travail plus lourd
 * qu'il n'est. Il compte en revanche comme une activité, parce qu'il en est une.
 *
 * ET L'ON NOMME LES ACTIVITÉS, ON NE LES CODE PAS. Une étape enregistrée ne
 * porte pas toujours de titre — elle porte un identifiant d'exercice. Afficher
 * « calc-poser-division » dans « ce qu'il contient » serait exactement
 * l'illisible que cet écran cherche à défaire. On va donc chercher le vrai
 * titre au catalogue, et l'identifiant ne sert que de dernier recours.
 *
 * @param {object} entree   une ligne de `state.teacherPaths`
 * @param {function} [normaliser] normalizePath, injecté pour l'éprouver seul
 * @param {function} [nommer]     getExerciseById, pour le titre des activités
 */
export function resumeDeParcours(entree, normaliser = null, nommer = null) {
    const brut = entree && (entree.data || entree);
    const p = normaliser ? normaliser(brut, entree.name) : (brut || {});
    const etapes = Array.isArray(p.steps) ? p.steps : [];
    const questions = etapes
        .filter(e => !e.bonus)
        .reduce((n, e) => n + (Number(e.nbItems) || 0), 0);

    return {
        id: entree.id,
        nom: entree.name || p.name || 'Sans nom',
        dossier: entree.folderId || 'root',
        activites: etapes.length,
        recompenses: etapes.filter(e => e.bonus).length,
        questions,
        mode: (p.policy && p.policy.mode) || 'entrainement',
        modifieLe: instantDe(entree.timestamp || entree.updated_at || entree.modifieLe),
        etapes: etapes.map((e, i) => ({
            rang: i + 1,
            titre: e.titre || e.title || titreDExercice(e.exerciseId, nommer) || 'Activité',
            exerciseId: e.exerciseId || null,
            questions: Number(e.nbItems) || 0,
            bonus: !!e.bonus
        }))
    };
}

/**
 * LES DERNIERS ÉDITÉS, D'ABORD.
 *
 * UN PARCOURS SANS DATE NE PASSE PAS DEVANT LES AUTRES. Les entrées anciennes
 * n'ont pas toujours d'horodatage ; les traiter comme « instant zéro » les
 * enverrait à la fin, ce qui est le bon endroit — mais les traiter comme
 * « maintenant » les mettrait en tête, ce qui est exactement ce qu'on veut
 * éviter. On les range donc au fond, et l'on trie par nom entre elles.
 */
export function derniersEdites(resumes, combien = 0) {
    const liste = (resumes || []).slice().sort((a, b) => {
        const ta = a.modifieLe || 0, tb = b.modifieLe || 0;
        if (ta !== tb) return tb - ta;
        return String(a.nom).localeCompare(String(b.nom), 'fr');
    });
    return combien > 0 ? liste.slice(0, combien) : liste;
}

/**
 * CHERCHER PAR LE NOM, SANS DEMANDER L'ORTHOGRAPHE EXACTE.
 *
 * Sans accent et sans casse : un professeur qui cherche « equations » doit
 * trouver « Équations », et celui qui tape « FRACTIONS » aussi. On coupe la
 * recherche en mots, et tous doivent s'y retrouver — dans n'importe quel ordre.
 * « mardi fractions » trouve « Fractions du mardi ».
 */
export function chercher(resumes, texte) {
    const q = sansAccent(String(texte || '').toLowerCase()).trim();
    if (!q) return resumes || [];
    const mots = q.split(/\s+/).filter(Boolean);
    return (resumes || []).filter(r => {
        const dans = sansAccent(String(r.nom).toLowerCase());
        return mots.every(m => dans.includes(m));
    });
}

const sansAccent = (t) =>
    String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** « 5 activités · 59 questions » — et « · 1 jeu » quand il y en a. */
export function enBref(r) {
    const bouts = [`${r.activites} activité${r.activites > 1 ? 's' : ''}`];
    if (r.questions) bouts.push(`${r.questions} question${r.questions > 1 ? 's' : ''}`);
    if (r.recompenses) bouts.push(`${r.recompenses} jeu${r.recompenses > 1 ? 'x' : ''}`);
    return bouts.join(' · ');
}

/** Le titre d'un exercice, ou rien — jamais son identifiant déguisé en titre. */
function titreDExercice(id, nommer) {
    if (!id) return '';
    const exo = typeof nommer === 'function' ? nommer(id) : null;
    return (exo && exo.title) || id;
}
