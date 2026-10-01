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
 * LES QUATRE FAÇONS DE RANGER, ET POURQUOI IL EN FALLAIT QUATRE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « il me faudrait clairement un gestionnaire de parcours pour en
 * sélectionner plusieurs les trier les classer », et, sur le choix des
 * rangements : « plusieurs rangements possibles ».
 *
 * IL N'Y EN AVAIT QU'UN, ET IL N'ÉTAIT PAS CHOISI : `derniersEdites`, câblé en
 * dur. Les deux boutons « Récents » et « Dossiers » ne sont pas des tris — ce
 * sont des GROUPEMENTS, et dans les deux cas l'ordre interne était le même.
 *
 * CE QUE CHACUN SERT À FAIRE, parce qu'un ordre sans usage est un bouton de
 * plus :
 *
 *   · `recent` — « celui de la semaine dernière ». C'est le défaut, et il le
 *     reste : neuf fois sur dix on cherche ce qu'on vient de toucher ;
 *   · `ancien` — l'inverse, et il sert exactement au ménage que Rémy demande :
 *     ce qui dort depuis deux ans arrive en tête, prêt à être coché ;
 *   · `nom` — « celui des fractions », quand on ne se souvient plus de QUAND on
 *     l'a fait. C'est l'ordre qui manquait le plus ;
 *   · `taille` — les plus PETITS d'abord, et c'est délibéré : un parcours d'une
 *     activité est presque toujours un essai oublié. Les gros, eux, on sait
 *     qu'on les a faits.
 *
 * ON TRIE TOUJOURS PAR NOM À ÉGALITÉ. Sans ce second critère, deux parcours de
 * même taille changeraient de place d'un affichage à l'autre selon l'ordre où
 * le navigateur les a rangés — et une liste qui bouge toute seule, on ne lui
 * fait plus confiance.
 */
export const ORDRES = ['recent', 'ancien', 'nom', 'taille'];

export function ordonner(resumes, ordre = 'recent') {
    const parNom = (a, b) => String(a.nom).localeCompare(String(b.nom), 'fr');
    const liste = (resumes || []).slice();
    if (ordre === 'nom') return liste.sort(parNom);
    if (ordre === 'taille') {
        return liste.sort((a, b) => {
            const ca = Number(a.activites) || 0, cb = Number(b.activites) || 0;
            return ca !== cb ? ca - cb : parNom(a, b);
        });
    }
    if (ordre === 'ancien') {
        // UN PARCOURS SANS DATE RESTE AU FOND, dans les deux sens. Il n'est pas
        // « le plus ancien » : on ne sait pas quand il a été fait. Le mettre en
        // tête du ménage ferait jeter ce qu'on n'a pas pu dater.
        return liste.sort((a, b) => {
            const ta = a.modifieLe || 0, tb = b.modifieLe || 0;
            if (!ta && !tb) return parNom(a, b);
            if (!ta) return 1;
            if (!tb) return -1;
            return ta !== tb ? ta - tb : parNom(a, b);
        });
    }
    return derniersEdites(liste);
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

/**
 * CE QUE MONTRE L'EXPLORATEUR, SANS SAVOIR OÙ IL EST DESSINÉ.
 *
 * Rémy, après avoir vu la popup : « non, je voyais cela comme un explorateur
 * intégré, un peu comme les exercices dans le tiroir de gauche ».
 *
 * L'EXPLORATEUR DESCEND DONC DANS LE TIROIR, et cette fonction est ce qui
 * rendait le déménagement risqué : le choix des sections — chercher, ranger par
 * date, ranger par dossier — était écrit AU MILIEU du dessin. Le sortir d'abord
 * permet de le prouver une fois, puis de le dessiner où l'on veut.
 *
 * TROIS ÉTATS, ET LEUR ORDRE DE PRIORITÉ EST UNE DÉCISION. Chercher passe
 * avant tout le reste : quand on tape un nom, on ne veut plus ni dossiers ni
 * sections, on veut la liste de ce qui correspond. Le rangement choisi ne
 * reprend la main qu'une fois le champ vidé.
 *
 * ON NE DÉPOSE PAS DANS UNE LISTE TRIÉE PAR DATE. Une section porte `depot`
 * seulement quand y faire glisser un parcours veut dire quelque chose — un
 * dossier, ou la racine. Dans « derniers modifiés », la place d'un parcours
 * est décidée par l'horloge : l'y lâcher ne rangerait rien, et le laisser
 * croire serait pire que de l'interdire.
 *
 * @param {Array}  entrees  state.teacherPaths
 * @param {Array}  dossiers state.teacherFolders
 * @param {object} opts     { tri: 'recent'|'dossiers', ordre, recherche, resumeur }
 */
export function vueDeLExplorateur(entrees, dossiers, opts = {}) {
    const tri = opts.tri === 'dossiers' ? 'dossiers' : 'recent';
    // LE GROUPEMENT ET L'ORDRE SONT DEUX CHOSES, et les confondre était le
    // défaut d'origine : « Récents » et « Dossiers » disent COMMENT on empile,
    // `ordre` dit DANS QUEL SENS on lit chaque pile. On peut donc ranger ses
    // dossiers par nom, ce qui était impossible.
    const ordre = ORDRES.includes(opts.ordre) ? opts.ordre : 'recent';
    const ranger = (liste) => ordonner(liste, ordre);
    const recherche = String(opts.recherche || '').trim();
    const resumeur = typeof opts.resumeur === 'function'
        ? opts.resumeur
        : (p) => resumeDeParcours(p);
    const tous = (entrees || []).map(resumeur);

    if (!tous.length && !(dossiers || []).length) {
        return { mode: 'vide', sections: [], total: 0, message: 'Aucun parcours enregistré.' };
    }

    if (recherche) {
        const trouves = ranger(chercher(tous, recherche));
        if (!trouves.length) {
            return {
                mode: 'recherche', sections: [], total: 0,
                message: `Aucun parcours ne porte « ${recherche} » dans son nom.`
            };
        }
        return {
            mode: 'recherche', total: trouves.length,
            sections: [{
                id: 'recherche', depot: null, dossier: false,
                titre: `${trouves.length} trouvé${trouves.length > 1 ? 's' : ''}`,
                parcours: trouves
            }]
        };
    }

    if (tri === 'recent') {
        return {
            mode: 'recent', total: tous.length,
            sections: [{
                id: 'recent', depot: null, dossier: false,
                titre: TITRES_ORDRE[ordre],
                parcours: ranger(tous)
            }]
        };
    }

    // PAR DOSSIER — ET DANS CHAQUE DOSSIER, LES DERNIERS MODIFIÉS D'ABORD. Un
    // dossier rangé dans l'ordre où l'on y a déposé les parcours redemande au
    // professeur de se souvenir de cet ordre-là ; il n'y a aucune raison que
    // la règle change d'une vue à l'autre.
    const sections = (dossiers || []).map(f => ({
        id: f.id, depot: f.id, dossier: true, titre: f.name,
        parcours: ranger(tous.filter(r => r.dossier === f.id)),
        vide: 'Dossier vide (glissez des parcours ici)'
    }));
    sections.push({
        id: 'root', depot: 'root', dossier: false, titre: 'Parcours (racine)',
        parcours: ranger(tous.filter(r => !r.dossier || r.dossier === 'root'))
    });
    return { mode: 'dossiers', sections, total: tous.length };
}

/**
 * CE QU'ON ÉCRIT EN TÊTE DE LISTE, et il doit dire l'ordre EN TOUTES LETTRES.
 *
 * « Du plus récemment modifié » était seul, et le restait quel que soit le
 * rangement. Une liste dont l'en-tête ment sur son ordre est pire qu'une liste
 * sans en-tête : on cherche en bas ce qui est en haut.
 */
const TITRES_ORDRE = {
    recent: 'Du plus récemment modifié',
    ancien: 'Du plus ancien — pour faire le ménage',
    nom: 'Par ordre alphabétique',
    taille: 'Des plus petits aux plus gros'
};

/** Le titre d'un exercice, ou rien — jamais son identifiant déguisé en titre. */
function titreDExercice(id, nommer) {
    if (!id) return '';
    const exo = typeof nommer === 'function' ? nommer(id) : null;
    return (exo && exo.title) || id;
}
