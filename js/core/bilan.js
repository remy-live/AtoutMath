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

    // ALLÉ AU BOUT, OU ARRÊTÉ EN CHEMIN ? C'est la distinction la plus utile du
    // tableau, et la plus facile à manquer : un élève qui s'arrête au deuxième
    // exercice sur six et un élève qui les rate tous les six affichent le même
    // pourcentage. Ce sont pourtant deux situations opposées — l'un a besoin
    // qu'on l'aide à travailler, l'autre qu'on lui réexplique.
    //
    // La différence est dans le journal : une séance commencée porte un
    // RUN_STARTED, une séance achevée un RUN_FINISHED. L'absence du second est
    // une information, pas un trou.
    const inacheve = runs.find(r => !r.finishedAt) || null;
    const etapesInachevees = inacheve
        ? new Set(inacheve.steps.map(x => x.stepId)).size : 0;

    // L'EFFORT NE SE LIT PAS DANS LE SCORE. Celui qui trouve au second essai
    // finit avec le même total que celui qui trouve du premier coup ; leurs
    // chemins n'ont rien à voir, et c'est le chemin qui dit s'il faut lui
    // donner la suite ou refaire un tour.
    const reprises = attempts.filter(a => a.correct && a.attemptIndex > 0).length;
    const indices = evenements.filter(e => e.type === 'hint_used').length;

    // L'ERREUR QUI REVIENT n'est pas une inattention : c'est une règle mal
    // apprise, et c'est la seule qui vaille qu'on s'arrête. On ne la signale
    // que si elle DOMINE — sinon on désignerait au hasard la première d'une
    // liste également répartie.
    const tetu = (aRevoir[0] && aRevoir[0].count >= 3
        && aRevoir[0].count >= (aRevoir[1] ? aRevoir[1].count * 2 : 3)) ? aRevoir[0] : null;

    const bilan = {
        questions: attempts.length,
        justes,
        reussite: attempts.length ? justes / attempts.length : 0,
        minutes: Math.round(ms / 60000),
        seances: runs.length,
        seancesFinies: runs.filter(r => r.finishedAt && !r.aborted).length,
        inacheve: !!inacheve,
        etapesInachevees,
        reprises,
        indices,
        tetu,
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

    // CE QUI SE DIT D'ABORD EST CE QUI CHANGE LA LECTURE DU RESTE.
    //
    // Un travail arrêté en chemin doit se lire AVANT le pourcentage, sinon le
    // pourcentage ment : « 45 % de réussite » sur deux exercices commencés n'est
    // pas la même chose que sur six terminés, et rien ne le signale.
    const tetes = [];
    if (b.inacheve) {
        tetes.push(b.etapesInachevees
            ? `Séance non terminée — ${b.etapesInachevees} exercice${b.etapesInachevees > 1 ? 's' : ''} `
                + 'seulement, puis arrêt.'
            : 'Séance ouverte, mais rien n\'a été fait.');
    }

    if (!b.assez) {
        // Le cas le plus fréquent en début d'année, et celui qu'on rate le
        // plus souvent : dire « 40 % de réussite » sur huit questions est un
        // chiffre juste et une conclusion fausse.
        return [...tetes, `${b.questions} question${b.questions > 1 ? 's' : ''} seulement : `
            + 'c\'est trop tôt pour dire sur quoi il ou elle s\'appuie. '
            + `Il en faut ${RELIABLE_MIN_ATTEMPTS} par compétence pour conclure.`].join(' ');
    }

    // L'ERREUR QUI REVIENT passe avant le bilan par compétence : c'est une
    // règle mal apprise, et on la corrige en deux minutes si on la voit.
    if (b.tetu) {
        const q = String(b.tetu.questionText || '').trim();
        tetes.push(`La même erreur revient ${b.tetu.count} fois${q ? ` (${q})` : ''} : `
            + 'ce n\'est pas de l\'inattention, il y a une règle à reprendre.');
    }

    const force = b.forces[0];
    const souci = b.difficultes[0];
    const corps = [];

    if (force && souci) {
        corps.push(`Solide sur « ${force.nom} » (${pc(force.taux)} sur ${force.essais} questions). `
            + `Bute sur « ${souci.nom} » (${pc(souci.taux)}) : c'est là qu'il faut reprendre.`);
    } else if (force) {
        const n = b.forces.length;
        corps.push(`Tout ce qui a été travaillé est acquis — ${n} compétence${n > 1 ? 's' : ''}, `
            + `dont « ${force.nom} » à ${pc(force.taux)}. On peut ouvrir de nouvelles notions.`);
    } else if (souci) {
        // Personne n'est bon nulle part : on nomme quand même le plus proche
        // d'aboutir, parce que c'est par là qu'on recommence.
        const proche = b.difficultes[b.difficultes.length - 1];
        corps.push('Rien n\'est encore stabilisé. Le plus proche d\'aboutir est '
            + `« ${proche.nom} » (${pc(proche.taux)}) ; le plus fragile, `
            + `« ${souci.nom} » (${pc(souci.taux)}).`);
    } else {
        corps.push(`${b.questions} questions, ${pc(b.reussite)} de réussite.`);
    }

    // L'EFFORT SE DIT EN DERNIER, ET SEULEMENT S'IL EST NET. C'est une nuance
    // sur ce qui précède — « il y arrive, mais » —, pas une conclusion. La
    // mesurer sur la PART des bonnes réponses reprises et non sur leur nombre :
    // trois reprises sur dix questions et trois sur cent ne disent pas la même
    // chose.
    const partReprises = b.justes ? b.reprises / b.justes : 0;
    if (partReprises > 0.25 || (b.indices && b.indices > b.questions * 0.3)) {
        corps.push('Y arrive en s\'accrochant : beaucoup de secondes tentatives et d\'indices — '
            + 'c\'est acquis moins solidement que le score ne le laisse croire.');
    }

    return [...tetes, ...corps].join(' ');
}

/**
 * LES SIGNAUX D'UN ÉLÈVE — ce qui se BALAIE, au lieu de se lire.
 *
 * Rémy, devant les vingt-quatre phrases posées sous la grille : « c'est
 * tellement indigeste le bilan, tu mets le bilan hors tableau, il faut mieux
 * faire, le prof ne le lira jamais. »
 *
 * Il a raison, et l'erreur était de croire qu'on lit un tableau de classe. On
 * ne le lit pas : on le BALAIE, on s'arrête sur ce qui dépasse, et l'on va voir
 * l'élève. De la prose sous une grille, fût-elle juste, ne sera jamais lue —
 * vingt-quatre paragraphes demandent trois minutes, et personne n'a trois
 * minutes en début d'heure.
 *
 * Un signal tient donc en un caractère, se pose DANS la ligne de l'élève, et
 * répond à une seule question : chez qui dois-je aller ? Le détail chiffré vit
 * dans l'infobulle, la phrase entière dans le panneau qu'on ouvre en cliquant.
 *
 * DEUX SIGNAUX AU PLUS, ET DANS CET ORDRE. Une colonne qui en porterait quatre
 * redeviendrait un texte à déchiffrer. On garde donc les plus décisifs : ce qui
 * empêche de lire le score passe avant ce qui le nuance.
 */
export const SIGNAUX = {
    RIEN: { code: 'rien', icone: '·', nom: 'N\'a rien fait' },
    ARRET: { code: 'arret', icone: '⏸', nom: 'S\'est arrêté en chemin' },
    TETU: { code: 'tetu', icone: '🔁', nom: 'La même erreur revient' },
    ACCROCHE: { code: 'accroche', icone: '💪', nom: 'Y arrive en s\'accrochant' },
    FACILE: { code: 'facile', icone: '⚡', nom: 'Tout acquis — donner plus dur' }
};

export function signauxDe(b) {
    if (!b || !b.questions) {
        return [{ ...SIGNAUX.RIEN, detail: 'N\'a pas ouvert la séance.' }];
    }
    const out = [];

    // CE QUI EMPÊCHE DE LIRE LE SCORE PASSE EN PREMIER. « 45 % » sur deux
    // exercices commencés et « 45 % » sur six terminés ne se comparent pas.
    if (b.inacheve) {
        out.push({
            ...SIGNAUX.ARRET,
            detail: b.etapesInachevees
                ? `Séance non terminée : ${b.etapesInachevees} exercice`
                    + `${b.etapesInachevees > 1 ? 's' : ''} seulement, puis arrêt.`
                : 'Séance ouverte, mais rien n\'a été fait.'
        });
    }
    // Une règle mal apprise, et non de l'inattention : deux minutes suffisent à
    // la reprendre, encore faut-il la voir.
    if (b.tetu) {
        const q = String(b.tetu.questionText || '').trim();
        out.push({
            ...SIGNAUX.TETU,
            detail: `La même erreur revient ${b.tetu.count} fois${q ? ` : ${q}` : ''}.`
        });
    }
    const partReprises = b.justes ? b.reprises / b.justes : 0;
    if (partReprises > 0.25 || (b.indices && b.indices > b.questions * 0.3)) {
        out.push({
            ...SIGNAUX.ACCROCHE,
            detail: `${b.reprises} bonne${b.reprises > 1 ? 's' : ''} réponse`
                + `${b.reprises > 1 ? 's' : ''} au deuxième essai, ${b.indices} indice`
                + `${b.indices > 1 ? 's' : ''} : moins solide que le score.`
        });
    }
    // Celui à qui il faut donner plus dur. Il ne se signale jamais tout seul —
    // il a bien travaillé, il n'a besoin de rien, on l'oublie.
    if (!out.length && b.assez && b.forces.length && !b.difficultes.length) {
        out.push({
            ...SIGNAUX.FACILE,
            detail: `${b.forces.length} compétence${b.forces.length > 1 ? 's' : ''} acquise`
                + `${b.forces.length > 1 ? 's' : ''}, aucune difficulté : on peut ouvrir la suite.`
        });
    }
    return out.slice(0, 2);
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
    })).map(e => ({ ...e, signaux: signauxDe(e) }));

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

/**
 * LA CONSIGNE : une phrase courte, et une seule chose à faire.
 *
 * Rémy : « une phrase par élève : "Doit réviser les nombres relatifs", ou "a
 * bien révisé", ou "revoir pour la classe les additions". »
 *
 * CE N'EST PAS `phraseDe`, ET LES DEUX SONT UTILES. `phraseDe` explique — elle
 * dit ce qui est solide, ce qui bute, avec les pourcentages : c'est ce qu'on lit
 * quand on prépare son heure, et cela prend quatre lignes. La CONSIGNE, elle,
 * tient sur une ligne d'un tableau de vingt-six élèves, et elle ne dit qu'une
 * chose : QUOI FAIRE. On la balaie du regard, on repère les cinq qui ont le
 * même mot, on sait avec qui on reprendra les relatifs lundi.
 *
 * ELLE NOMME LA NOTION, jamais l'élève. « Doit réviser les nombres relatifs »
 * se recopie sur un cahier de textes ; « est en difficulté » ne se recopie
 * nulle part et n'apprend rien à personne.
 *
 * L'ORDRE DES CAS EST L'ORDRE DES PRIORITÉS, et il n'est pas arbitraire :
 * n'avoir rien fait passe avant tout le reste — il n'y a rien à réviser tant
 * qu'on n'a pas travaillé. Puis l'arrêt en chemin, puis l'erreur qui revient,
 * qui se corrige en deux minutes quand on la voit. La révision d'une notion ne
 * vient qu'ensuite.
 */
export function consigneDe(b) {
    if (!b || !b.questions) return 'N\'a pas fait la séance.';
    if (b.inacheve) {
        return b.etapesInachevees
            ? `Séance abandonnée après ${b.etapesInachevees} exercice`
                + `${b.etapesInachevees > 1 ? 's' : ''} : à refaire.`
            : 'Séance ouverte puis abandonnée : à refaire.';
    }
    if (!b.assez) return 'Trop peu de questions pour conclure.';
    if (b.tetu) {
        const q = String(b.tetu.questionText || '').trim();
        return q ? `Une règle à reprendre : ${q}.` : 'Une même erreur revient : règle à reprendre.';
    }

    const durs = (b.difficultes || []).slice(0, 2).map(c => c.nom);
    if (durs.length) {
        // LE DEUX-POINTS DANS TOUS LES CAS, MAINTENANT. Rémy, sur la liste des
        // points ouverts : « fais tout ».
        //
        // Il n'y en avait pas pour une seule notion, et c'était un choix gardé
        // par un essai. Un audit l'avait signalé, et la remarque n'était pas
        // sans fondement : dans le PDF du bilan, « Maël — Doit réviser Aire
        // d'un rectangle. » voisinait avec « Anaïs — Doit réviser : Diviser et
        // Additionner des entiers. », et la première avait l'air d'un ordre
        // tronqué, parce que la notion commence par une majuscule.
        //
        // CE QUI TRANCHE, C'EST L'USAGE DE CETTE PHRASE. Elle n'est pas lue
        // une par une : elle tient sur la ligne d'un tableau de vingt-six
        // élèves, qu'on BALAIE du regard pour repérer les cinq qui ont le même
        // mot. Un préfixe fixe — « Doit réviser : » — fait commencer toutes
        // les notions à la même place ; c'est justement ce que l'oeil suit. La
        // variante sans deux-points décalait une ligne sur deux.
        return `Doit réviser : ${durs.join(' et ')}.`;
    }
    // AUCUNE DIFFICULTÉ FIABLE : on distingue quand même « tout est acquis » de
    // « on a fait le tour ». Un élève qui réussit tout n'a pas besoin qu'on le
    // félicite, il a besoin de plus dur — et c'est cela, l'information utile.
    if ((b.forces || []).length >= 3 && b.reussite >= 0.9) {
        return 'A bien révisé : tout est acquis, donner plus difficile.';
    }
    if ((b.forces || []).length) return 'A bien révisé : rien à reprendre.';
    return 'Rien de sûr encore : à revoir la prochaine fois.';
}

/**
 * LA CONSIGNE DE LA CLASSE — ce qu'on reprend avec tout le monde.
 *
 * « Revoir pour la classe les additions » : c'est la seule phrase qui décide
 * de l'heure suivante, et elle ne vaut que si la notion bloque VRAIMENT la
 * classe. Une notion ratée par trois élèves sur vingt-six se reprend avec les
 * trois, pas au tableau.
 */
export function consigneClasse(b) {
    const eleves = (b && b.eleves) || [];
    const actifs = eleves.filter(e => e.questions > 0);
    if (!eleves.length) return 'Aucun élève dans cette classe.';
    if (!actifs.length) return 'Personne n\'a travaillé : rien à conclure.';

    const durs = (b.competences || []).filter(c => c.enPeine >= 0.5 && c.eleves >= 2);
    if (!durs.length) {
        return 'Rien à reprendre avec toute la classe : voir les élèves un par un.';
    }
    const noms = durs.slice(0, 2).map(c => c.nom).join(' et ');
    return `Revoir avec toute la classe : ${noms}.`;
}

/**
 * UN CONSEIL PAR ÉLÈVE, SUR LE TERME — et non sur une séance.
 *
 * RÉMY : « Et pour les bilans, propose des onglets, fais le au parcours, de
 * manière globale, une conseil pour chaque élève. »
 *
 * ── POURQUOI UNE DEUXIÈME FONCTION, APRÈS `consigneDe` ───────────────────
 *
 * `consigneDe` lit le bilan d'UNE SÉANCE — questions, étapes inachevées,
 * erreur têtue. Celle-ci lit la ligne du RAPPORT DE CLASSE, qui ne porte ni
 * séance ni étapes : des compétences fragiles, un taux, des erreurs jamais
 * reprises, une dernière venue. Ce ne sont pas les mêmes données, et une
 * fonction qui prétendrait lire les deux formes mentirait sur l'une.
 *
 * L'ORDRE DES CAS EST L'ORDRE DES PRIORITÉS, comme pour `consigneDe` :
 *
 *   1. il n'est jamais venu — aucun conseil de travail n'a de sens tant que
 *      l'élève n'est pas entré ; ce qui manque est son code, pas une notion ;
 *   2. il n'a rien fait — rien à réviser tant qu'on n'a pas travaillé ;
 *   3. trop peu de questions pour conclure — dire « 40 % » sur six questions
 *      est un chiffre juste et une conclusion fausse ;
 *   4. les notions fragiles, NOMMÉES — et le nombre d'erreurs en souffrance
 *      rangé derrière, entre parenthèses ;
 *   5. pas de notion fragile mais des erreurs jamais reprises : on nomme les
 *      notions de CES erreurs-là ;
 *   6. rien de fragile : on peut ouvrir la suite.
 *
 * LE NOMBRE NE DIT PAS QUOI REPRENDRE. Première écriture : le compte d'erreurs
 * ouvertes passait AVANT les notions, et sept élèves d'affilée portaient « 67
 * erreurs jamais reprises : les revoir avec lui ou elle ». Rémy : « il faut
 * plutôt préciser en quoi ça doit être retravaillé ». Une phrase qui ne nomme
 * rien ne se recopie nulle part.
 *
 * ELLE NOMME LA NOTION, JAMAIS L'ÉLÈVE : « Doit réviser : les relatifs » se
 * recopie sur un cahier de textes, « est en difficulté » n'apprend rien à
 * personne et ne se recopie nulle part.
 *
 * ELLE REND SON RANG AVEC SA PHRASE, et c'est tout le point : l'écran range
 * les élèves par urgence et teinte le filet de chaque ligne. S'il redérivait
 * ce rang de son côté, il y aurait deux échelles à tenir d'accord — et la
 * première fois qu'elles ont divergé, « trop peu de questions » s'affichait
 * en VERT, c'est-à-dire « rien à signaler ».
 *
 * @returns {{rang:number, phrase:string}} 0 = le plus urgent, 5 = rien à faire
 */
export function conseilDuRapport(ligne) {
    const l = ligne || {};
    const questions = Number(l.totalQuestions || 0);
    if (!l.lastSeenAt && !questions) {
        return { rang: 0, phrase: 'Ne s\'est jamais connecté : lui redonner son code.' };
    }
    if (!questions) {
        return { rang: 1, phrase: 'N\'a pas encore travaillé : commencer par une séance courte.' };
    }
    if (questions < RELIABLE_MIN_ATTEMPTS) {
        return { rang: 4, phrase: `${questions} question${questions > 1 ? 's' : ''} seulement : `
            + 'trop tôt pour conclure.' };
    }
    // LE NOMBRE D'ERREURS NE DIT PAS QUOI REPRENDRE — LA NOTION, SI.
    //
    // RÉMY, devant la colonne : « il faut plutôt préciser en quoi ça doit être
    // retravaillé ». Sept élèves d'affilée portaient « 67 erreurs jamais
    // reprises : les revoir avec lui ou elle » — sept fois la même phrase, qui
    // ne nomme rien et ne se recopie nulle part. Le compte passe donc APRÈS la
    // notion, et seulement comme détail.
    const ouvertes = Number(l.openErrors || 0);
    const detail = ouvertes ? ` (${ouvertes} erreur${ouvertes > 1 ? 's' : ''} à reprendre)` : '';
    const faibles = (l.weakSkills || []).map(w => nomCompetence(w.skillId)).filter(Boolean);
    if (faibles.length) {
        return { rang: 2, phrase: `Doit réviser : ${faibles.slice(0, 2).join(' et ')}${detail}.` };
    }
    // PAS DE NOTION FRAGILE, MAIS DES ERREURS EN SOUFFRANCE : on nomme alors
    // les notions de CES erreurs-là. Elles ne sont pas les mêmes que les
    // compétences fragiles — une notion peut être acquise et garder deux
    // questions ratées qu'on n'a jamais rouvertes.
    const desErreurs = (l.openSkills || []).map(s => nomCompetence(s.skillId)).filter(Boolean);
    if (desErreurs.length) {
        return { rang: 3, phrase: `À reprendre : ${desErreurs.slice(0, 2).join(' et ')}${detail}.` };
    }
    if (ouvertes > 0) {
        return { rang: 3, phrase: `${ouvertes} erreur${ouvertes > 1 ? 's' : ''} jamais reprise`
            + `${ouvertes > 1 ? 's' : ''}, sans notion qui ressorte : les revoir avec lui ou elle.` };
    }
    const taux = l.successRate;
    if (typeof taux === 'number' && taux < 0.5) {
        return { rang: 3, phrase: 'Beaucoup d\'erreurs, sans notion qui ressorte : '
            + 'reprendre avec lui ou elle.' };
    }
    return { rang: 5, phrase: 'Rien à reprendre : on peut ouvrir de nouvelles notions.' };
}

/** La couleur d'une case du tableau, du plus fragile au plus sûr. */
export function couleurNiveau(niveauKey) {
    return (LEVELS[niveauKey] || LEVELS.NA).color;
}
