// LE BILAN D'UNE CLASSE — et la phrase qui le résume, élève par élève.
//
// CE QU'UN PROFESSEUR REGARDE VRAIMENT. Pas une moyenne : une moyenne de 68 %
// ne dit ni sur quoi s'appuyer ni quoi reprendre lundi. Il regarde deux
// choses, et dans cet ordre — QUI décroche, et SUR QUOI la classe bute. Le
// reste est du détail qu'on ouvre quand on en a besoin.
//
// D'OÙ VIENT LA PHRASE. Elle nomme UNE force et UNE difficulté, avec leurs
// chiffres. Pas trois de chaque : une phrase qui énumère six compétences ne se
// lit pas, et surtout elle ne se décide pas. « Solide sur les tables (92 % sur
// 48 questions), bloque sur les priorités (41 %) » tient en un regard et dit
// quoi faire.
//
// CE QU'ELLE NE DIT JAMAIS. Une force ou une difficulté tirée de deux
// questions. En dessous du seuil de fiabilité (`RELIABLE_MIN_ATTEMPTS`), on
// écrit qu'on ne sait pas encore — c'est une information, pas un aveu. Un
// bilan qui affirme sur trois essais fait prendre de mauvaises décisions, et
// il n'y a rien de pire qu'un tableau de bord qui se trompe avec assurance.

import { computeAttempts, computeErrors, computeRuns } from './projections.js';
import { computeMastery, LEVELS, RELIABLE_MIN_ATTEMPTS } from './mastery.js';
import { SKILLS } from '../data/skills.js';

const JOUR = 86400000;

/** Le libellé d'une compétence, ou son identifiant si le référentiel l'ignore. */
export function nomCompetence(skillId) {
    const s = SKILLS[skillId];
    return (s && s.label) || skillId;
}

/**
 * Le bilan d'un élève, à partir de son seul journal.
 *
 * @returns {{questions, justes, reussite, minutes, seances, derniereActivite,
 *            competences, forces, difficultes, aRevoir, phrase, assez}}
 */
export function bilanEleve(evenements = [], now = Date.now()) {
    const attempts = computeAttempts(evenements);
    const mastery = computeMastery(attempts, now);
    const runs = computeRuns(evenements).filter(r => r.attempts && r.attempts.length);

    const justes = attempts.filter(a => a.correct).length;
    const ms = attempts.reduce((t, a) => t + (a.msElapsed > 0 ? a.msElapsed : 0), 0);
    const derniere = attempts.length ? Math.max(...attempts.map(a => a.ts)) : null;

    const competences = [...mastery.values()]
        .map(e => ({
            skillId: e.skillId,
            nom: nomCompetence(e.skillId),
            maitrise: e.mastery,
            niveau: e.level.key,
            essais: e.attempts,
            justes: e.correct,
            taux: e.successRate,
            fiable: e.reliable,
            dernier: e.lastTs
        }))
        .sort((a, b) => b.maitrise - a.maitrise);

    const fiables = competences.filter(c => c.fiable);
    const forces = fiables.filter(c => c.niveau === 'A' || c.niveau === 'E');
    const difficultes = fiables.filter(c => c.niveau === 'NA' || c.niveau === 'EC')
        .sort((a, b) => a.maitrise - b.maitrise);

    // Les erreurs encore ouvertes, les plus répétées d'abord : c'est le
    // détail qu'on ouvre quand la phrase a désigné un point à reprendre.
    const aRevoir = computeErrors(evenements)
        .filter(e => !e.corrected)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    const bilan = {
        questions: attempts.length,
        justes,
        reussite: attempts.length ? justes / attempts.length : 0,
        minutes: Math.round(ms / 60000),
        seances: runs.length,
        derniereActivite: derniere,
        joursDepuis: derniere ? Math.floor((now - derniere) / JOUR) : null,
        competences,
        forces,
        difficultes,
        aRevoir,
        assez: fiables.length > 0
    };
    bilan.phrase = phraseDe(bilan);
    return bilan;
}

/**
 * LA PHRASE. Une force, une difficulté, des chiffres — ou l'aveu qu'il est
 * trop tôt pour dire quoi que ce soit.
 */
export function phraseDe(b) {
    if (!b.questions) return 'N\'a pas encore travaillé.';

    const pc = (x) => Math.round(x * 100) + ' %';

    if (!b.assez) {
        // Le cas le plus fréquent en début d'année, et celui qu'on rate le
        // plus souvent : dire « 40 % de réussite » sur huit questions est un
        // chiffre juste et une conclusion fausse.
        return `${b.questions} question${b.questions > 1 ? 's' : ''} seulement : `
            + `c'est trop tôt pour dire sur quoi il ou elle s'appuie. `
            + `Il en faut ${RELIABLE_MIN_ATTEMPTS} par compétence pour conclure.`;
    }

    const force = b.forces[0];
    const souci = b.difficultes[0];

    if (force && souci) {
        return `Solide sur « ${force.nom} » (${pc(force.taux)} sur ${force.essais} questions). `
            + `Bute sur « ${souci.nom} » (${pc(souci.taux)}) : c'est là qu'il faut reprendre.`;
    }
    if (force && !souci) {
        const n = b.forces.length;
        return `Tout ce qui a été travaillé est acquis — ${n} compétence${n > 1 ? 's' : ''}, `
            + `dont « ${force.nom} » à ${pc(force.taux)}. On peut ouvrir de nouvelles notions.`;
    }
    if (!force && souci) {
        // Personne n'est bon nulle part : on nomme quand même le plus proche
        // d'aboutir, parce que c'est par là qu'on recommence.
        const proche = b.difficultes[b.difficultes.length - 1];
        return `Rien n'est encore stabilisé. Le plus proche d'aboutir est `
            + `« ${proche.nom} » (${pc(proche.taux)}) ; le plus fragile, `
            + `« ${souci.nom} » (${pc(souci.taux)}).`;
    }
    return `${b.questions} questions, ${pc(b.reussite)} de réussite.`;
}

/**
 * Le bilan de la classe : les élèves, et surtout LES COMPÉTENCES VUES DE FACE.
 *
 * La colonne qui compte est celle où beaucoup d'élèves sont en rouge : c'est
 * une notion à reprendre avec tout le monde, pas un élève à aider. C'est la
 * seule chose qu'un tableau de classe apporte et qu'un bilan individuel ne
 * peut pas donner.
 */
export function bilanClasse(classe, now = Date.now()) {
    const eleves = (classe.eleves || []).map(e => ({
        id: e.id,
        nom: e.nom,
        majLe: e.majLe,
        ...bilanEleve(e.evenements || [], now)
    }));

    const parCompetence = new Map();
    for (const el of eleves) {
        for (const c of el.competences) {
            if (!c.fiable) continue;
            if (!parCompetence.has(c.skillId)) {
                parCompetence.set(c.skillId, {
                    skillId: c.skillId, nom: c.nom,
                    niveaux: { NA: 0, EC: 0, A: 0, E: 0 },
                    eleves: 0, sommeMaitrise: 0
                });
            }
            const k = parCompetence.get(c.skillId);
            k.niveaux[c.niveau]++;
            k.eleves++;
            k.sommeMaitrise += c.maitrise;
        }
    }

    const competences = [...parCompetence.values()].map(k => ({
        ...k,
        moyenne: k.eleves ? k.sommeMaitrise / k.eleves : 0,
        // La part de la classe qui n'y est pas : c'est ce qui fait remonter
        // une colonne en tête de liste.
        enPeine: k.eleves ? (k.niveaux.NA + k.niveaux.EC) / k.eleves : 0
    })).sort((a, b) => b.enPeine - a.enPeine || a.moyenne - b.moyenne);

    const actifs = eleves.filter(e => e.questions > 0);
    return {
        nom: classe.nom,
        niveau: classe.niveau,
        eleves,
        competences,
        // Ce qu'on met en tête de l'écran : le nombre d'élèves qui n'ont rien
        // fait, et les deux notions où la classe est le plus en peine.
        sansTravail: eleves.filter(e => !e.questions).length,
        aReprendre: competences.filter(c => c.enPeine >= 0.5 && c.eleves >= 2).slice(0, 3),
        moyenneReussite: actifs.length
            ? actifs.reduce((t, e) => t + e.reussite, 0) / actifs.length : 0,
        phrase: phraseClasse(eleves, competences)
    };
}

/** Une phrase pour la classe entière : ce qu'on ferait lundi matin. */
export function phraseClasse(eleves, competences) {
    const actifs = eleves.filter(e => e.questions > 0);
    if (!eleves.length) return 'Aucun élève dans cette classe pour l\'instant.';
    if (!actifs.length) return 'Personne n\'a encore travaillé.';

    const dur = competences.filter(c => c.enPeine >= 0.5 && c.eleves >= 2);
    const muets = eleves.length - actifs.length;
    const rappel = muets
        ? ` ${muets} élève${muets > 1 ? 's n\'ont' : ' n\'a'} rien déposé.` : '';

    if (!dur.length) {
        return `${actifs.length} élève${actifs.length > 1 ? 's' : ''} au travail, `
            + `aucune notion ne bloque la classe entière.${rappel}`;
    }
    const noms = dur.slice(0, 2).map(c => `« ${c.nom} »`).join(' et ');
    return `À reprendre avec tout le monde : ${noms} — `
        + `plus de la moitié de la classe n'y est pas.${rappel}`;
}

/** La couleur d'une case du tableau, du plus fragile au plus sûr. */
export function couleurNiveau(niveauKey) {
    return (LEVELS[niveauKey] || LEVELS.NA).color;
}
