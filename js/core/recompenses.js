// LES JEUX DE RÉCOMPENSE D'UN PARCOURS.
//
// Un parcours peut contenir des étapes qui ne sont pas du travail : des JEUX,
// posés là par le professeur, et qui ne s'ouvrent qu'une fois le travail fait.
// « Quatre exercices puis un jeu » — le jeu ne s'active que si les quatre
// premiers sont bien réussis.
//
// Trois choses le rendent honnête, et ce module ne fait qu'elles :
//
//   · UN JEU N'EST PAS UN EXERCICE. Il ne compte ni dans le nombre d'étapes à
//     faire, ni dans la note, ni dans la barre de progression. Un élève qui
//     ne débloque jamais le jeu n'a pas un parcours inachevé — il a un
//     parcours fait sans la récompense.
//   · CE QUI DÉBLOQUE, C'EST CE QUI PRÉCÈDE. Un jeu s'ouvre quand tous les
//     exercices placés AVANT lui sont terminés et assez réussis. Le professeur
//     compose donc sa séance dans l'ordre où il veut qu'on la fasse, et la
//     règle se lit sur la liste.
//   · LE PARCOURS ENTIER OUVRE TOUT. Quand tous les exercices sont faits au
//     niveau demandé, TOUS les jeux du parcours passent en accès libre — y
//     compris ceux qui étaient placés au milieu. C'est la récompense de fin,
//     et elle ne se retire pas.
//
// Aucun DOM ici, aucune dépendance au journal : on reçoit le parcours et ce
// que l'élève a fait, on rend un état. C'est ce qui permet de le tester.

/** Le seuil par défaut : trois quarts de bonnes réponses sur le travail exigé. */
import { etatVerrou } from './verrou.js';

export const SEUIL_DEFAUT = 0.75;

/** Une étape est-elle un jeu de récompense ? */
export const estRecompense = (step) => !!(step && step.bonus);

/**
 * Le seuil d'un parcours, ramené dans [0, 1]. Un seuil à 0 ouvrirait le jeu
 * sans rien réussir, un seuil à 1 exigerait le sans-faute : les deux sont des
 * choix légitimes du professeur, on ne les interdit pas, on les borne.
 */
export function seuilDe(path) {
    // Le seuil se range avec les autres règles de la séance (la « politique »),
    // mais un parcours peut aussi le porter directement : les deux se lisent.
    const brut = (path && path.bonusSeuil !== undefined)
        ? path.bonusSeuil
        : (path && path.policy ? path.policy.bonusSeuil : undefined);
    const v = Number(brut);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : SEUIL_DEFAUT;
}

/**
 * Ce qu'un élève a obtenu sur une étape, quel que soit le format d'entrée.
 * `resultats` peut venir du journal ({solved, required, passed}) ou se réduire
 * à la liste des étapes terminées — auquel cas « terminée » vaut « réussie »,
 * ce qui est déjà le cas dans le runner : une étape n'est marquée faite que
 * si son seuil est atteint.
 */
function resultatDe(stepId, resultats, faites) {
    const fait = faites.has(stepId);
    const r = resultats && resultats[stepId];
    if (r) {
        // LE TAUX SE MESURE SUR LES QUESTIONS POSÉES, pas sur le seuil de
        // l'étape. Rapporté au seuil, un élève qui fait exactement le minimum
        // demandé afficherait 100 % — et ouvrirait la récompense en ayant
        // raté la moitié de la feuille.
        const posees = Math.max(1, Number(r.questions) || Number(r.required) || 1);
        const reussies = Math.max(0, Number(r.solved) || 0);
        return { fait, taux: Math.min(1, reussies / posees), reussies, requis: posees };
    }
    return fait
        ? { fait: true, taux: 1, reussies: 1, requis: 1 }
        : { fait: false, taux: 0, reussies: 0, requis: 1 };
}

/**
 * L'état de tous les jeux de récompense d'un parcours.
 *
 * @param {Object} path      parcours normalisé (steps avec `bonus`)
 * @param {Object} [progres]
 * @param {string[]} [progres.completed]  identifiants des étapes terminées
 * @param {Object} [progres.resultats]    {stepId: {solved, required, passed}}
 * @returns {{
 *   seuil: number,
 *   travailFait: boolean,
 *   tauxGlobal: number,
 *   toutOuvert: boolean,
 *   jeux: Array<{stepId:string, index:number, ouvert:boolean, raison:string,
 *                exigees:number, reussies:number, restantes:number}>
 * }}
 */
export function etatRecompenses(path, progres = {}) {
    const steps = (path && path.steps) || [];
    const seuil = seuilDe(path);
    const faites = new Set(progres.completed || []);
    const resultats = progres.resultats || null;

    // Le travail : tout ce qui n'est pas un jeu.
    const travail = steps.filter(s => !estRecompense(s));
    const bilan = (lot) => {
        let requis = 0, reussies = 0, restantes = 0;
        for (const s of lot) {
            const r = resultatDe(s.stepId, resultats, faites);
            // UNE ÉTAPE NON OBLIGATOIRE LAISSÉE DE CÔTÉ N'EXISTE PAS ICI.
            //
            // Sinon elle resterait éternellement « restante » : le travail ne
            // serait jamais fini, le jeu de récompense ne s'ouvrirait jamais, et
            // le zéro qu'elle porte tirerait la moyenne vers le bas. Le
            // professeur a dit « non obligatoire » — ne pas la faire ne doit
            // rien coûter. FAITE, en revanche, elle compte comme les autres :
            // c'est du vrai travail, et il serait injuste de l'effacer.
            if (!r.fait && s.facultatif) continue;
            requis += r.requis;
            reussies += r.reussies;
            if (!r.fait) restantes++;
        }
        return { requis, reussies, restantes, taux: requis ? reussies / requis : 1 };
    };

    const global = bilan(travail);
    const travailFait = travail.length > 0 && global.restantes === 0;
    // Le parcours entier ouvre tout — et seulement s'il y avait du travail.
    const toutOuvert = travailFait && global.taux >= seuil;

    const jeux = [];
    steps.forEach((s, index) => {
        if (!estRecompense(s)) return;
        // Ce qui précède CE jeu-là.
        const avant = steps.slice(0, index).filter(x => !estRecompense(x));
        const b = bilan(avant);
        const complet = avant.length > 0 && b.restantes === 0;
        const assez = b.taux >= seuil;
        const ouvert = toutOuvert || (complet && assez);

        let raison;
        if (toutOuvert) raison = 'parcours';
        else if (!avant.length) raison = 'libre';          // un jeu posé en tête
        else if (!complet) raison = 'reste';
        else if (!assez) raison = 'insuffisant';
        else raison = 'merite';

        jeux.push({
            stepId: s.stepId, index,
            ouvert: ouvert || raison === 'libre',
            raison,
            exigees: b.requis, reussies: b.reussies, restantes: b.restantes,
            taux: b.taux
        });
    });

    return { seuil, travailFait, tauxGlobal: global.taux, toutOuvert, jeux };
}

/**
 * La phrase à montrer à l'élève sous un jeu verrouillé. Elle dit ce qu'il
 * reste à faire, jamais « tu n'as pas le droit » : un verrou qui n'explique
 * pas ce qu'il attend est vécu comme une punition.
 */
export function direRecompense(jeu, seuil) {
    const pourcent = Math.round(seuil * 100);
    switch (jeu.raison) {
        case 'parcours':
            return 'Parcours terminé : tous les jeux sont ouverts !';
        case 'libre':
            return 'À toi de jouer !';
        case 'merite':
            return 'C\'est gagné : le jeu est ouvert.';
        case 'reste':
            return jeu.restantes === 1
                ? 'Encore un exercice à terminer et le jeu s\'ouvre.'
                : `Encore ${jeu.restantes} exercices à terminer et le jeu s'ouvre.`;
        case 'insuffisant':
            return `Il faut ${pourcent} % de bonnes réponses pour ouvrir le jeu `
                + `(tu en es à ${Math.round(jeu.taux * 100)} %). Recommence un exercice pour te rattraper.`;
        default:
            return '';
    }
}

// --- CE QU'ON MONTRE DU PARCOURS, ET DANS QUEL ÉTAT ---------------------------
//
// Trois habillages dessinent le même parcours — carte des mondes, chemin
// d'étapes, liste. Ils partagent donc la question qui précède le dessin :
// quelles étapes montre-t-on, et dans quel état ? C'est une règle, pas un
// rendu : elle vit ici, avec les autres, et elle se teste sans navigateur.

/**
 * CE QUI BARRE LA ROUTE À L'ÉTAPE `i` — et il n'y a qu'une règle.
 *
 * Rémy : « c'est chronologique. Si les 2 premiers sont obligatoires et le 3 et
 * 4 non obligatoires, il faut réussir le 1 et 2 pour ouvrir le 3 et 4 et
 * pouvoir faire le 5. »
 *
 * Donc : une étape s'ouvre quand toutes les étapes OBLIGATOIRES qui la
 * précèdent sont faites. Les facultatives ne comptent pas — ni pour elles-mêmes
 * ni pour celles d'après —, et c'est exactement ce qui fait que le 5 s'ouvre en
 * même temps que le 3 et le 4.
 *
 * @returns {boolean} vrai si tout ce qui devait être fait avant l'est.
 */
export function routeOuverte(steps, i, done) {
    for (let k = 0; k < i; k++) {
        const s = steps[k];
        if (!s || s.facultatif || s.bonus) continue;
        if (!done.has(s.stepId)) return false;
    }
    return true;
}

/**
 * LA PROCHAINE ÉTAPE À FAIRE — celle sur laquelle se pose « en cours ».
 *
 * C'est la première étape OBLIGATOIRE non faite : une facultative laissée de
 * côté ne retient pas le curseur, sans quoi l'élève qui saute le jeu du milieu
 * verrait son parcours indiquer éternellement une étape qu'il a choisi de ne
 * pas faire.
 */
export function prochaineObligatoire(steps, done) {
    return (steps || []).findIndex(s => s && !s.facultatif && !s.bonus && !done.has(s.stepId));
}

/**
 * L'état d'une étape aux yeux de l'élève.
 * @returns {'done'|'current'|'open'|'locked'|'cle'|'cadeau'|'cadeau-ferme'}
 */
export function statutEtape(step, i, opts = {}) {
    const done = opts.doneIds || new Set();
    // LA CLÉ PASSE AVANT TOUT LE RESTE, ET MÊME AVANT « L'ÉTAPE EN COURS ».
    //
    // Rémy : « il ne faut pas vraiment que l'élève ait accès aux interros à la
    // maison. » Le curseur ne doit donc pas se poser sur une porte que l'élève
    // ne peut pas ouvrir — il la verrait comme son travail du moment et
    // buterait dessus. Une étape DÉJÀ FAITE reste « faite » : la refermer après
    // coup effacerait ce qu'il a réussi.
    //
    // L'ordre libre ne la contourne pas davantage : c'est une fermeture voulue
    // par le professeur, pas une conséquence de la chronologie. Seul
    // `allUnlocked` — l'aperçu du banc d'essai — la traverse, parce qu'il ne
    // s'adresse pas à un élève.
    if (!opts.allUnlocked && !done.has(step.stepId) && etatVerrou(step, opts).ferme) {
        return 'cle';
    }
    // UN JEU DE RÉCOMPENSE suit sa propre règle : il n'est ni « l'étape en
    // cours » ni « à débloquer plus tard », il est ouvert ou mérité.
    const jeu = opts.recompenses && opts.recompenses.get(step.stepId);
    if (jeu) return jeu.ouvert ? 'cadeau' : 'cadeau-ferme';
    if (step.bonus) return opts.allUnlocked ? 'cadeau' : 'cadeau-ferme';
    if (opts.allUnlocked) return 'open';
    if (done.has(step.stepId)) return 'done';
    if (i === opts.currentIndex) return 'current';
    // ORDRE LIBRE : toute étape non faite est jouable, et c'est l'élève qui
    // choisit par où il commence. Voir `ordreLibre` dans core/policy.js.
    if (opts.ordreLibre) return 'open';
    // SINON, LA CHRONOLOGIE — mais elle ne compte que les obligatoires. Sans
    // la liste des étapes on ne peut pas la calculer : on retombe alors sur
    // l'ancienne règle, qui est la même quand rien n'est facultatif.
    if (!opts.steps) return 'locked';
    return routeOuverte(opts.steps, i, done) ? 'open' : 'locked';
}

/**
 * LES ÉTAPES QU'ON MONTRE — et le jeu qu'on ne montre pas encore.
 *
 * Rémy : « les jeux récompenses sur le parcours apparaissent déjà. Alors que
 * ce serait bien qu'ils apparaissent après. »
 *
 * Un cadenas posé sur la carte dès le premier jour annonce la récompense et la
 * refuse dans le même geste : l'élève sait ce qu'il n'a pas. En la cachant, on
 * lui rend la seule chose qu'une récompense doit avoir — la surprise. Le jeu
 * SURGIT sur la carte au moment où il est gagné, et c'est cet instant-là qui
 * vaut quelque chose (voir `ouvrirLeCadeau` dans ui/ouverture.js).
 *
 * Deux exceptions : le professeur, qui compose la séance et doit voir ce qu'il
 * y a mis (`montrerCadeaux`), et un jeu posé en tête de parcours, qui n'est la
 * récompense de rien et s'ouvre tout de suite.
 *
 * Les index d'origine sont conservés : ce sont eux qui désignent l'étape à
 * lancer, et un tableau refiltré les décalerait tous.
 */
export function etapesMontrees(steps, opts = {}) {
    const vus = [];
    // LE NUMÉRO QU'ON AFFICHE N'EST PAS L'INDEX DE L'ÉTAPE. Les jeux ne sont
    // pas du travail : les compter donnerait « 1, 2, 4 » sur une carte de
    // trois exercices, et l'élève chercherait la troisième. On numérote donc
    // le travail, et l'index d'origine sert à lancer l'étape — les deux
    // voyagent ensemble.
    let numero = 0;
    steps.forEach((step, i) => {
        if (!step.bonus) numero++;
        if (!cadeauCache(step, opts)) vus.push({ step, i, numero });
    });
    return vus;
}

export function cadeauCache(step, opts = {}) {
    if (!step.bonus || opts.montrerCadeaux) return false;
    const jeu = opts.recompenses && opts.recompenses.get(step.stepId);
    return !jeu || !jeu.ouvert;
}
