// DES CLASSES POUR VOIR — cinq classes fictives, et des élèves qui ne se
// ressemblent pas.
//
// Rémy : « tu vas me créer des classes fictives avec des élèves fictifs
// (5 classes) et je vais pouvoir lancer des séances fictives et récupérer les
// résultats. »
//
// POURQUOI CE MODULE EXISTE. Une interface de suivi vide ne se juge pas. On ne
// voit ni qu'une colonne manque, ni qu'une autre ne sert à rien, tant qu'il n'y
// a pas trente lignes dedans. Et l'on ne peut pas attendre une vraie classe
// pour s'en apercevoir : à ce moment-là il est trop tard pour changer d'avis.
//
// TRENTE ÉLÈVES TIRÉS AU HASARD NE SERVENT À RIEN, et c'est le piège de ce
// genre de jeu d'essai. Un hasard uniforme donne une classe grise où tout le
// monde tourne autour de soixante pour cent : le tableau est joli, également
// rempli, et l'on n'y apprend rien. Ce qui décide si un tableau de classe est
// bon, ce sont les CAS PARTICULIERS — celui qui n'a rien fait, celui qui
// abandonne au milieu, celui qui réussit à force d'indices. On les fabrique
// donc exprès (voir PROFILS), et l'on vérifie qu'ils se voient.
//
// LES DONNÉES SONT VRAIES, MÊME SI LES ÉLÈVES SONT FAUX. Ce module ne fabrique
// pas des bilans : il fabrique le JOURNAL D'ÉVÉNEMENTS qu'un élève aurait
// produit — des tentatives horodatées, avec leur compétence, leur temps de
// réponse, leur numéro d'essai. Tout le reste (maîtrise, notes, carnet
// d'erreurs, phrases de bilan) est recalculé par le code ordinaire, à partir de
// ces événements. C'est la seule façon d'être sûr qu'on regarde le vrai écran
// et pas une maquette : si une phrase de bilan est mal tournée ici, elle le
// sera aussi devant une vraie classe.

import { makeRng } from './ids.js';
import { creerClasse, creerEleve } from './classes.js';
import { EventTypes } from './journal.js';

/**
 * LES PRÉNOMS. Volontairement variés et volontairement banals : ce sont des
 * étiquettes de démonstration, pas des personnages. Aucun n'est emprunté à
 * quelqu'un — ce sont des prénoms courants d'une classe de collège française.
 */
const PRENOMS = [
    'Adam', 'Alice', 'Amir', 'Anaïs', 'Axel', 'Camille', 'Chloé', 'Diego',
    'Elena', 'Elias', 'Emma', 'Ethan', 'Fatou', 'Gabriel', 'Hugo', 'Inès',
    'Jade', 'Jules', 'Kenza', 'Léa', 'Liam', 'Lina', 'Louis', 'Lucas',
    'Maël', 'Manon', 'Marius', 'Mila', 'Nathan', 'Nina', 'Noah', 'Océane',
    'Rayan', 'Romane', 'Sacha', 'Sarah', 'Théo', 'Timéo', 'Yanis', 'Zoé'
];

/**
 * LES SEPT PROFILS — et chacun existe pour une question précise qu'on veut
 * pouvoir poser au tableau.
 *
 * `part` est la place du profil dans une classe : la somme fait 1. Un élève
 * ordinaire reste le cas fréquent — une classe entière de cas limites ne
 * ressemblerait pas plus à une vraie classe qu'une classe grise.
 */
export const PROFILS = [
    {
        id: 'absent', part: 0.06,
        libelle: 'N\'a pas ouvert la séance',
        // La question : est-ce qu'une ligne vide se voit du premier coup d'œil,
        // ou est-ce qu'elle se confond avec une ligne faible ?
        rien: true
    },
    {
        id: 'abandon', part: 0.10,
        libelle: 'Abandonne au milieu',
        // La question : distingue-t-on « il a raté » de « il n'a pas fini » ?
        // Ce sont deux situations opposées, et un pourcentage seul les mélange.
        partFaite: [0.25, 0.5], reussite: [0.5, 0.7], vitesse: [1, 1.6], indices: 0.2
    },
    {
        id: 'accroche', part: 0.16,
        libelle: 'Y arrive en s\'accrochant',
        // La question : voit-on l'effort ? Le score final est bon, mais il a
        // coûté trois essais et beaucoup d'indices — et c'est cela qu'il faut
        // savoir avant de lui donner la suite.
        partFaite: [1, 1], reussite: [0.75, 0.9], vitesse: [1.8, 3], indices: 0.55, essais: 2
    },
    {
        id: 'rapide', part: 0.12,
        libelle: 'Réussit vite et sans erreur',
        // La question : repère-t-on celui à qui il faut donner plus dur ?
        partFaite: [1, 1], reussite: [0.94, 1], vitesse: [0.35, 0.6], indices: 0.02
    },
    {
        id: 'desequilibre', part: 0.14,
        libelle: 'Solide en calcul, perdu en géométrie',
        // La question : c'est le SEUL cas qui justifie un bilan par compétence.
        // Sa moyenne est correcte et ne dit rien ; sa ligne de pastilles dit
        // tout. Si l'écran ne le fait pas voir, la grille ne sert à rien.
        partFaite: [1, 1], reussite: [0.85, 0.95], vitesse: [0.8, 1.2], indices: 0.1,
        faible: 'geo', reussiteFaible: [0.2, 0.4]
    },
    {
        id: 'repete', part: 0.12,
        libelle: 'Se trompe toujours de la même façon',
        // La question : le carnet d'erreurs remonte-t-il la faute RÉCURRENTE,
        // ou noie-t-il la répétition dans le total ? C'est la seule erreur qui
        // vaille qu'on s'arrête, parce qu'elle n'est pas une inattention.
        partFaite: [1, 1], reussite: [0.6, 0.75], vitesse: [0.9, 1.4], indices: 0.15,
        repete: true
    },
    {
        id: 'ordinaire', part: 0.30,
        libelle: 'Élève ordinaire',
        partFaite: [0.85, 1], reussite: [0.6, 0.85], vitesse: [0.8, 1.5], indices: 0.18
    }
];

/**
 * LES CINQ CLASSES. Deux sixièmes, deux cinquièmes, une quatrième — de quoi
 * voir ce que devient l'écran quand on en a plusieurs, ce qui est le vrai
 * problème de Rémy avec LaboMEP.
 */
export const CLASSES_DEMO = [
    { nom: '6ᵉ A', niveau: '6e', eleves: 24 },
    { nom: '6ᵉ C', niveau: '6e', eleves: 22 },
    { nom: '5ᵉ B', niveau: '5e', eleves: 26 },
    { nom: '5ᵉ D', niveau: '5e', eleves: 21 },
    { nom: '4ᵉ A', niveau: '4e', eleves: 25 }
];

/**
 * LES COMPÉTENCES TRAVAILLÉES — DE VRAIES, prises au catalogue.
 *
 * Le premier jet en avait inventé (« calc.addition », « geo.aire »…). Elles
 * fonctionnaient, les bilans se calculaient, et l'écran affichait « geo.aire »
 * en en-tête de colonne au lieu de « Aire d'un rectangle » : le tableau était
 * illisible pour la seule raison qu'aucune de ces compétences n'existait. Une
 * donnée d'essai qui ne ressemble pas à la vraie ne prouve rien — c'est même
 * pire, elle fait croire à un défaut d'affichage qui n'en est pas un.
 *
 * `famille` sert au profil déséquilibré : il faut pouvoir dire « bon ici,
 * perdu là » sans lire les identifiants.
 */
const TRAVAIL = [
    { skillId: 'num.add.entiers', exerciseId: 'calc-poser', famille: 'num',
        piege: '408 + 297', juste: '705', faux: '695' },
    { skillId: 'num.mult.sens', exerciseId: 'calc-poser-multiplication', famille: 'num',
        piege: '36 × 50', juste: '1800', faux: '180' },
    { skillId: 'num.div.quotient', exerciseId: 'calc-poser-division', famille: 'num',
        piege: '408 ÷ 6', juste: '68', faux: '78' },
    { skillId: 'mes.aire.rectangle', exerciseId: 'calc-arpenteurs', famille: 'geo',
        piege: 'aire d\'un rectangle de 12 m sur 4 m', juste: '48 m²', faux: '32 m' },
    { skillId: 'geo.repere.coord', exerciseId: 'geo-course-vecteurs', famille: 'geo',
        piege: 'placer le point (−3 ; 5)', juste: '(−3 ; 5)', faux: '(5 ; −3)' },
    { skillId: 'mes.grandeurs.composees', exerciseId: 'mes-grandeurs-composees', famille: 'mes',
        piege: '90 km en 45 min : quelle vitesse ?', juste: '120 km/h', faux: '90 km/h' }
];

/** Une question ordinaire, avec sa réponse et une faute plausible. */
function questionDe(t, q, rng) {
    const a = 12 + Math.floor(rng.next() * 80);
    const b = 3 + Math.floor(rng.next() * 40);
    const paires = [
        { texte: `${a} + ${b}`, juste: String(a + b), faux: String(a + b + (rng.next() < 0.5 ? 10 : -1)) },
        { texte: `${a} × ${b}`, juste: String(a * b), faux: String(a * b - a) },
        { texte: `${a * b} ÷ ${b}`, juste: String(a), faux: String(a + 1) }
    ];
    const p = paires[q % paires.length];
    return { texte: p.texte, juste: p.juste, faux: p.faux };
}

const entre = (rng, [a, b]) => a + rng.next() * (b - a);

/** La liste des profils d'une classe, dans l'ordre où on les distribue. */
function repartir(nb, rng) {
    const out = [];
    PROFILS.forEach(p => {
        const n = Math.round(p.part * nb);
        for (let i = 0; i < n; i++) out.push(p);
    });
    // L'arrondi ne tombe jamais juste : on complète (ou l'on retire) avec des
    // élèves ordinaires, qui sont le cas fréquent.
    const ordinaire = PROFILS.find(p => p.id === 'ordinaire');
    while (out.length < nb) out.push(ordinaire);
    while (out.length > nb) out.pop();
    return rng.shuffle(out);
}

/**
 * LE JOURNAL D'UN ÉLÈVE — des tentatives, pas un résultat.
 *
 * On fabrique ce qu'il aurait produit en travaillant : chaque question donne un
 * événement `attempt` avec sa compétence, sa justesse, son temps et son numéro
 * d'essai. Les indices et le temps passé sont des événements à part, comme
 * dans la vraie application. Tout le reste se recalcule.
 */
function journalDe(profil, rng, opts = {}) {
    // Un second tirage pour le CONTENU des questions : mêler leurs nombres au
    // tirage des profils ferait bouger tout le reste dès qu'on touche à l'un.
    const r2 = makeRng('q-' + (opts.runSeed || rng.next()));
    const { debut, questionsParEtape = 8, pathId = null } = opts;
    if (profil.rien) return [];

    const evts = [];
    let ts = debut;
    let n = 0;
    // LE RUN A UN IDENTIFIANT, et il le faut : `computeRuns` regroupe les
    // événements par `runId`, et sans lui une séance entière se dissout en
    // tentatives isolées — on ne peut plus savoir si l'élève est allé au bout.
    const runId = `demo_run_${opts.runSeed || Math.floor(rng.next() * 1e9)}`;
    const emit = (type, payload) => {
        evts.push({ id: `d_${runId}_${n++}`, type, ts, payload: { runId, ...payload } });
    };

    const partFaite = entre(rng, profil.partFaite);
    const jusqua = Math.max(1, Math.round(TRAVAIL.length * partFaite));
    // L'ERREUR RÉPÉTÉE PORTE SUR LA MÊME QUESTION DU MÊME EXERCICE.
    //
    // Le premier jet gardait la même graine mais changeait d'exercice à chaque
    // étape. Or le carnet identifie une erreur par le couple exercice + graine :
    // les huit occurrences comptaient donc pour huit erreurs distinctes, et la
    // répétition — la seule chose qui la rendait intéressante — disparaissait
    // au moment précis où on voulait la voir.
    const graineRepetee = 'seed-recurrent-' + Math.floor(rng.next() * 1000);
    const exoRepete = TRAVAIL[Math.floor(rng.next() * TRAVAIL.length)];

    if (pathId) emit(EventTypes.RUN_STARTED, { pathId, pathName: 'Séance de démonstration', mode: 'entrainement' });

    for (let k = 0; k < jusqua; k++) {
        const t = TRAVAIL[k];
        const faible = profil.faible && t.famille === profil.faible;
        const taux = entre(rng, faible ? profil.reussiteFaible : profil.reussite);
        // LE NOMBRE DE BONNES RÉPONSES EST FIXÉ, PAS TIRÉ — ET C'EST TOUTE LA
        // DIFFÉRENCE ENTRE UNE DÉMONSTRATION ET UN JEU DE HASARD.
        //
        // Le premier jet tirait chaque question à pile ou face contre le taux.
        // Mesuré : sur huit questions, un élève censé réussir à 28 % obtenait
        // 5/8 une fois sur trente — et l'écran montrait alors un « déséquilibré
        // en géométrie » à 63 %, c'est-à-dire exactement le contraire de ce
        // qu'il devait exhiber. Sur cent dix-huit élèves et six compétences,
        // l'accident est certain, et il tombe forcément sur la ligne qu'on
        // voulait faire voir.
        //
        // On fixe donc le COMPTE et l'on tire seulement QUELLES questions sont
        // ratées : le profil reste lisible à coup sûr, et la copie garde une
        // allure naturelle.
        const nJustes = Math.round(taux * questionsParEtape);
        const rates = new Set(rng.shuffle([...Array(questionsParEtape).keys()])
            .slice(0, questionsParEtape - nJustes));
        let justes = 0;

        for (let q = 0; q < questionsParEtape; q++) {
            const repetee = profil.repete && q === questionsParEtape - 1;
            const juste = repetee ? false : !rates.has(q);
            // Celui qui s'accroche se trompe d'abord et trouve au second essai :
            // son score final ressemble à celui du rapide, son chemin non.
            const essais = (juste && profil.essais && rng.next() < 0.5) ? profil.essais : 1;
            for (let e = 0; e < essais; e++) {
                const dernier = e === essais - 1;
                const ms = Math.round(entre(rng, profil.vitesse) * (6000 + rng.next() * 9000));
                ts += ms + 800;
                const quoi = repetee
                    ? { texte: exoRepete.piege, juste: exoRepete.juste, faux: exoRepete.faux }
                    : questionDe(t, q, r2);
                const bonne = dernier && juste;
                emit(EventTypes.ATTEMPT, {
                    exerciseId: repetee ? exoRepete.exerciseId : t.exerciseId,
                    skillId: repetee ? exoRepete.skillId : t.skillId,
                    itemSeed: repetee ? graineRepetee : `s${k}_${q}`,
                    questionText: quoi.texte,
                    // CE QU'IL A RÉPONDU ET CE QU'ON ATTENDAIT. Le carnet
                    // d'erreurs affiche les deux ; sans elles il affichait
                    // « a répondu · attendu », soit une ligne vide répétée.
                    expected: quoi.juste,
                    given: bonne ? quoi.juste : quoi.faux,
                    correct: bonne,
                    attemptIndex: e,
                    msElapsed: ms,
                    stepId: `demo_s${k}`
                });
            }
            if (juste) justes++;
            if (rng.next() < profil.indices) {
                emit(EventTypes.HINT_USED, { exerciseId: t.exerciseId, skillId: t.skillId });
            }
        }

        if (pathId) {
            emit(EventTypes.STEP_COMPLETED, {
                pathId, stepId: `demo_s${k}`,
                solved: justes, required: questionsParEtape, questions: questionsParEtape,
                passed: justes / questionsParEtape >= 0.7
            });
        }
        // Une pause entre deux exercices : personne n'enchaîne sans lever la tête.
        ts += 20000 + rng.next() * 60000;
    }

    emit(EventTypes.TIME_SPENT, { ms: ts - debut });
    // CELUI QUI ABANDONNE N'A PAS DE FIN DE SÉANCE, et c'est exactement ce qui
    // permettra de le distinguer de celui qui a raté : un parcours commencé
    // sans être terminé est une information, pas un mauvais score.
    if (pathId && jusqua >= TRAVAIL.length) {
        emit(EventTypes.RUN_FINISHED, { pathId, questions: jusqua * questionsParEtape });
    }
    return evts;
}

/**
 * LES CINQ CLASSES, PRÊTES À REGARDER.
 *
 * Déterministe : la même graine rend les mêmes classes. C'est ce qui permet de
 * comparer deux versions de l'écran sans que les données bougent sous les yeux
 * — sinon on ne sait jamais si c'est l'affichage qui a changé ou les élèves.
 *
 * @param {Object} opts
 * @param {string} [opts.seed]      la graine, pour rejouer les mêmes classes
 * @param {number} [opts.jours]     l'ancienneté de la séance, en jours
 * @returns {Array} des classes au format de core/classes.js
 */
export function classesDeDemo({ seed = 'demo', jours = 3 } = {}) {
    const rng = makeRng(seed);
    const debut = Date.now() - jours * 86400000;

    return CLASSES_DEMO.map((modele, ic) => {
        const classe = creerClasse(modele.nom, modele.niveau);
        classe.demo = true;
        const noms = rng.shuffle(PRENOMS.slice()).slice(0, modele.eleves);
        const profils = repartir(modele.eleves, rng);

        classe.eleves = noms.map((nom, ie) => {
            const profil = profils[ie];
            const r = makeRng(`${seed}-${ic}-${ie}`);
            // Chacun ne commence pas à la même seconde : une classe où trente
            // élèves démarrent ensemble ne ressemble à aucune heure de cours.
            const t0 = debut + Math.round(r.next() * 900000);
            const eleve = creerEleve(nom, journalDe(profil, r, { debut: t0, pathId: `demo_path_${ic}` }));
            eleve.profil = profil.id;
            eleve.demo = true;
            return eleve;
        });
        return classe;
    });
}

/** Ce que chaque profil est censé montrer — pour l'écran de démonstration. */
export const LEGENDE_PROFILS = PROFILS.map(p => ({ id: p.id, libelle: p.libelle }));
