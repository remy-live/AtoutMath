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
export const SEUIL_DEFAUT = 0.75;

/** Une étape est-elle un jeu de récompense ? */
export const estRecompense = (step) => !!(step && step.bonus);

/**
 * Le seuil d'un parcours, ramené dans [0, 1]. Un seuil à 0 ouvrirait le jeu
 * sans rien réussir, un seuil à 1 exigerait le sans-faute : les deux sont des
 * choix légitimes du professeur, on ne les interdit pas, on les borne.
 */
export function seuilDe(path) {
    const v = Number(path && path.bonusSeuil);
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
        const requis = Math.max(1, Number(r.required) || 1);
        const reussies = Math.max(0, Number(r.solved) || 0);
        return { fait, taux: Math.min(1, reussies / requis), reussies, requis };
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
