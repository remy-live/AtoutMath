// LE JARDIN — ce qu'on exige des jardins LIVRÉS.
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CES ÉPREUVES EXISTENT, ALORS QUE LE FABRICANT SE RELIT DÉJÀ.
//
// `tools/fabriquerJardins.mjs` vérifie chaque jardin avant de l'écrire : les
// rangées se lisent comme leurs réponses, les fleurs comme leurs mots, aucun mot
// ne sert deux fois. C'est bien — et ça ne protège RIEN une fois le fichier
// écrit. Un fichier de données engendré est précisément celui que plus personne
// ne questionne : il est long, il a l'air automatique, et un « petit coup de
// main » dedans ne laisse aucune trace. Ces épreuves relisent ce qui est LIVRÉ,
// pas ce qui a été fabriqué.
//
// Et elles tiennent une seconde promesse, celle-là invisible dans les données :
// toute réponse doit avoir une DÉFINITION. Une case sans indice est une case
// que l'élève ne peut pas trouver — et le fabricant écarte justement les mots
// de la pyramide, qui n'en ont pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { JARDINS } from '../js/data/jardins.js';
import { exercices, filterByStatus, statusOf, getExerciseById } from '../js/data/catalog.js';
import { STATUS } from '../js/data/status.js';
import { readFileSync } from 'node:fs';

/** La source d'un fichier du dépôt — les activités ne s'importent pas sous Node. */
const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
import {
    jardinGenerator, lettresDuJardin, definitionsParCouleur, COULEURS, nomDeRangee
} from '../js/core/generators/jardin.js';

const aucun = (liste, quoi) => assert.deepEqual(liste, [], `${quoi} :\n  ` + liste.join('\n  '));

test('le dépôt livre assez de jardins pour qu\'une classe ne les épuise pas', () => {
    assert.ok(JARDINS.length >= 5, `seulement ${JARDINS.length} jardin(s) livré(s)`);
});

test('CHAQUE RANGÉE SE LIT EXACTEMENT COMME SES RÉPONSES', () => {
    // La garantie la plus simple, et celle dont tout dépend : si les lettres
    // d'une rangée ne sont pas celles de ses mots, l'élève remplit juste et le
    // jeu lui dit qu'il a faux.
    const fautifs = [];
    JARDINS.forEach(j => {
        const lettres = lettresDuJardin(j);
        j.rangees.forEach((rg, i) => {
            const lu = rg.cles.map(c => lettres.get(c)).join('');
            const attendu = rg.reponses.map(r => r.mot).join('');
            if (lu !== attendu) fautifs.push(`${j.id} rangée ${nomDeRangee(i)} : « ${lu} » ≠ « ${attendu} »`);
            if (lu.length !== rg.cles.length) {
                fautifs.push(`${j.id} rangée ${nomDeRangee(i)} : ${lu.length} lettres pour ${rg.cles.length} cases`);
            }
        });
    });
    aucun(fautifs, 'rangées qui ne disent pas ce qu\'elles portent');
});

test('CHAQUE FLEUR SE LIT DANS LE SENS HORAIRE DEPUIS SON DÉPART', () => {
    // Le départ est ce que l'élève doit TROUVER ; s'il est faux dans les
    // données, la fleur n'a tout simplement pas de solution.
    const fautifs = [];
    JARDINS.forEach(j => {
        const lettres = lettresDuJardin(j);
        j.fleurs.forEach((f, i) => {
            assert.equal(f.petales.length, 6, `${j.id} fleur ${i} : ${f.petales.length} pétales`);
            const lu = Array.from({ length: 6 },
                (_, k) => lettres.get(f.petales[(k + f.depart) % 6]) || '?').join('');
            if (lu !== f.mot) fautifs.push(`${j.id} fleur ${i} : « ${lu} » ≠ « ${f.mot} »`);
        });
    });
    aucun(fautifs, 'fleurs qui ne portent pas leur mot');
});

test('TOUTE RÉPONSE A UNE DÉFINITION — sans quoi la case est introuvable', () => {
    const fautifs = [];
    JARDINS.forEach(j => {
        [...j.rangees.flatMap(rg => rg.reponses), ...j.fleurs].forEach(r => {
            if (!r.def || r.def.trim().length < 10) fautifs.push(`${j.id} : ${r.mot} — « ${r.def} »`);
        });
    });
    aucun(fautifs, 'réponses sans indice');
});

test('un mot ne sert qu\'une fois dans le même jardin', () => {
    // Deux fleurs du même mot, c'est deux définitions identiques dans le même
    // groupe de couleur : une faute d'impression, pas une énigme.
    const fautifs = [];
    JARDINS.forEach(j => {
        const tous = [...j.fleurs.map(f => f.mot), ...j.rangees.flatMap(rg => rg.reponses.map(r => r.mot))];
        const vus = new Set();
        tous.forEach(m => { if (vus.has(m)) fautifs.push(`${j.id} : ${m}`); vus.add(m); });
    });
    aucun(fautifs, 'mots employés deux fois dans un jardin');
});

test('LES FLEURS SE CHEVAUCHENT — c\'est la correction de Rémy', () => {
    // ─────────────────────────────────────────────────────────────────────
    // RÉMY, sur la première livraison : « pour les fleurs, tu as plutôt faux
    // car ce sont les pétales communes qui créent des mots, c'est en rond en
    // fait ».
    //
    // J'avais pavé le champ de fleurs DISJOINTES — chaque case dans une seule
    // fleur. C'est un jeu valable, ce n'est pas le sien : dans un Rows Garden
    // les couronnes se recouvrent, et un pétale partagé porte DEUX mots de six
    // à la fois. C'est ce qui fait qu'une fleur en aide une autre.
    //
    // LA DIFFÉRENCE NE SE VOIT PAS À L'ŒIL sur un jardin rempli : les deux
    // versions se ressemblent trait pour trait. Elle ne se voit QUE comme ceci,
    // en comptant combien de fleurs réclament la même case.
    // ─────────────────────────────────────────────────────────────────────
    const sans = [];
    JARDINS.forEach(j => {
        const partages = j.cases.filter(c =>
            j.fleurs.filter(f => f.petales.includes(c)).length > 1);
        if (!partages.length) sans.push(`${j.id} : aucune fleur n'en touche une autre`);
        // Et jamais trois : le réseau employé donne au plus deux fleurs par
        // pétale. Trois voudrait dire que la géométrie a changé sans qu'on le
        // sache.
        const trop = j.cases.filter(c => j.fleurs.filter(f => f.petales.includes(c)).length > 2);
        trop.forEach(c => sans.push(`${j.id} : la case ${c} est dans trois fleurs`));
    });
    aucun(sans, 'jardins sans pétale partagé');
});

test('DEUX MOTS DE LA MÊME FAMILLE NE TIENNENT PAS DANS UN MÊME JARDIN', () => {
    // VU SUR CAPTURE, et c'est tout ce qui l'a révélé : la rangée A disait
    // « Les boucliers des chevaliers » et la rangée D « Le bouclier du
    // chevalier » — ECUS et ECU. Deux définitions que rien ne distingue sauf la
    // longueur de la case : ce n'est plus une énigme, c'est une devinette sur
    // le nombre de cases.
    //
    // Le lexique du chemin porte beaucoup de pluriels à côté de leurs
    // singuliers (PORTE/PORTES, FLEUR/FLEURS, ECOLE/ECOLES) — utile pour
    // remplir, insupportable dans la même grille. La règle la plus simple les
    // attrape tous : un mot ne doit pas en commencer un autre.
    const fautifs = [];
    JARDINS.forEach(j => {
        const tous = [...j.fleurs.map(f => f.mot),
            ...j.rangees.flatMap(rg => rg.reponses.map(r => r.mot))];
        tous.forEach(a => tous.forEach(b => {
            if (a !== b && b.startsWith(a)) fautifs.push(`${j.id} : ${a} et ${b}`);
        }));
    });
    aucun(fautifs, 'mots de la même famille dans un même jardin');
});

test('LES COULEURS SE PARTAGENT LES FLEURS À PEU PRÈS ÉGALEMENT', () => {
    // C'est la signature du jeu : les définitions sont rangées par couleur et
    // mélangées dedans. Une couleur qui ne porterait qu'UNE fleur ne cacherait
    // rien — sa définition irait forcément là. Il en faut au moins deux, et
    // c'est pour cela qu'on n'emploie que DEUX couleurs à quatre ou cinq
    // fleurs : trois groupes en donneraient un d'une seule.
    const fautifs = [];
    JARDINS.forEach(j => {
        const compte = {};
        j.fleurs.forEach(f => { compte[f.couleur] = (compte[f.couleur] || 0) + 1; });
        const connues = COULEURS.map(c => c.id);
        Object.keys(compte).forEach(c => {
            if (!connues.includes(c)) fautifs.push(`${j.id} : couleur inconnue « ${c} »`);
        });
        const valeurs = Object.values(compte);
        if (Math.max(...valeurs) - Math.min(...valeurs) > 1) {
            fautifs.push(`${j.id} : partage déséquilibré ${JSON.stringify(compte)}`);
        }
        if (Math.min(...valeurs) < 2) {
            fautifs.push(`${j.id} : une couleur ne porte qu'une fleur ${JSON.stringify(compte)}`);
        }
    });
    aucun(fautifs, 'couleurs mal réparties');
});

test('chaque case appartient à une rangée ou à une fleur, et à rien d\'inconnu', () => {
    const fautifs = [];
    JARDINS.forEach(j => {
        const connues = new Set(j.cases);
        [...j.rangees.flatMap(rg => rg.cles),
            ...j.fleurs.flatMap(f => [f.centre, ...f.petales])].forEach(c => {
            if (!connues.has(c)) fautifs.push(`${j.id} : la case ${c} n'est pas dans le jardin`);
        });
        // ET AUCUNE CASE N'EST ORPHELINE : une case qui n'est ni dans une
        // rangée ni dans une fleur ne peut se déduire de rien.
        const employees = new Set([...j.rangees.flatMap(rg => rg.cles),
            ...j.fleurs.flatMap(f => f.petales)]);
        j.cases.forEach(c => {
            const estCoeur = j.fleurs.some(f => f.centre === c);
            if (!employees.has(c) && !estCoeur) fautifs.push(`${j.id} : la case ${c} ne sert à rien`);
        });
    });
    aucun(fautifs, 'cases incohérentes');
});

test('LE CŒUR D\'UNE FLEUR N\'EST DANS AUCUN MOT DE SIX', () => {
    // C'est la règle du jeu d'origine, et elle a une conséquence visible : le
    // cœur reste neutre à l'écran. S'il entrait dans le mot de sa fleur, le
    // dessin mentirait.
    const fautifs = [];
    JARDINS.forEach(j => j.fleurs.forEach((f, i) => {
        if (f.petales.includes(f.centre)) fautifs.push(`${j.id} fleur ${i} : son cœur est un pétale`);
    }));
    aucun(fautifs, 'cœurs qui sont aussi des pétales');
});

test('les définitions des fleurs se rangent par couleur, sans en perdre', () => {
    // SUR TOUS LES JARDINS, et non sur le premier : un fichier engendré n'est
    // pas homogène par nature, et n'en éprouver qu'un revient à croire que les
    // dix-sept autres lui ressemblent.
    const fautifs = [];
    JARDINS.forEach(j => {
        const groupes = definitionsParCouleur(j, makeRng(`couleurs-${j.id}`));
        const total = groupes.reduce((n, g) => n + g.definitions.length, 0);
        if (total !== j.fleurs.length) {
            fautifs.push(`${j.id} : ${total} définitions pour ${j.fleurs.length} fleurs`);
        }
        groupes.forEach(g => {
            const attendues = j.fleurs.filter(f => f.couleur === g.id).map(f => f.def).sort();
            if (JSON.stringify(g.definitions.slice().sort()) !== JSON.stringify(attendues)) {
                fautifs.push(`${j.id} groupe ${g.id} : le contenu ne correspond pas`);
            }
        });
    });
    aucun(fautifs, 'groupes de couleur mal formés');
});

test('le générateur rend un jardin complet et sa solution', () => {
    for (let i = 0; i < 6; i++) {
        const item = jardinGenerator.generate({}, { rng: makeRng(`jg-${i}`), index: i });
        assert.ok(item.meta.jardin, 'pas de jardin');
        assert.ok(item.meta.solution instanceof Map, 'pas de solution');
        assert.equal(item.meta.solution.size, item.meta.jardin.cases.length,
            'la solution ne couvre pas toutes les cases');
        assert.ok(item.hints.length >= 2, 'pas d\'indice à montrer');
        assert.ok(item.explanation && item.explanation.length > 20, 'pas d\'explication');
        // La réponse attendue est la suite des rangées : c'est ce que l'activité
        // envoie à `submit`.
        // LA RÉPONSE ATTENDUE EST LE JARDIN ENTIER, case par case.
        //
        // Elle était la suite des RANGÉES, ce qui couvre tout le jardin
        // aujourd'hui — mais seulement parce que les formes livrées n'ont que
        // des rangées longues. Une rangée de deux cases ne porte pas de
        // réponse : ses cases seraient restées hors de ce qu'on envoie au
        // meneur, qui aurait dit « juste » sur un jardin faux.
        assert.equal(item.answer,
            item.meta.jardin.cases.map(c => item.meta.solution.get(c)).join(''));
        assert.equal(item.answer.length, item.meta.jardin.cases.length,
            'une case du jardin n\'entre pas dans la réponse attendue');
    }
});

test('les rangées se nomment A, B, C comme dans le jeu d\'origine', () => {
    assert.equal(nomDeRangee(0), 'A');
    assert.equal(nomDeRangee(3), 'D');
});

// ─────────────────────────────────────────────────────────────────────────────
//
// ALLER SUR UNE FLEUR : SON DÉPART, SON SENS, SA DÉFINITION.
//
// RÉMY : « pour les fleurs, c'est pas clair, on ne sait pas où mettre les
// définitions. Il faudrait aller sur une fleur, connaître au moins le début du
// mot, le sens (dans un premier temps) ».
//
// CE QUE CELA ABANDONNE, ET C'EST LUI QUI LE DEMANDE. L'en-tête du générateur
// défend l'inverse en toutes lettres — « trouver laquelle va où fait partie du
// jeu ». C'est la règle du Rows Garden, et elle est juste pour un lecteur de
// magazine qui a une heure devant lui. Pour une classe qui découvre, elle
// empile trois inconnues sur la même case : quel mot, par où il commence, sur
// quelle fleur. « Dans un premier temps » est sa formule : on rouvrira quand la
// classe saura jouer, et ce sera une ligne.
//
// CE QUI NE CHANGE PAS : le MOT reste entièrement à trouver. On ne donne ni une
// lettre ni un emplacement de coupure de rangée.

test('CHAQUE DÉFINITION DE FLEUR SE RATTACHE À UNE FLEUR, ET À UNE SEULE', () => {
    // LA CONDITION SANS LAQUELLE LE LIEN SERAIT FAUX : l'activité retrouve la
    // fleur par sa définition (`f.def === d`). Deux fleurs qui partageraient la
    // même définition mèneraient donc toutes deux à la première — et l'élève
    // apprendrait une correspondance fausse.
    for (let i = 0; i < 8; i++) {
        const item = jardinGenerator.generate({}, { rng: makeRng(`lien-${i}`), index: i });
        const defs = item.meta.jardin.fleurs.map(f => f.def);
        assert.equal(new Set(defs).size, defs.length,
            'deux fleurs portent la même définition : le lien vers la fleur sera faux');
        // Et toutes les définitions listées sont bien celles des fleurs : une
        // ligne orpheline resterait muette à l'écran.
        const listees = item.meta.couleurs.flatMap(c => c.definitions);
        assert.deepEqual([...listees].sort(), [...defs].sort(),
            'la liste des définitions ne dit pas exactement les fleurs du jardin');
    }
});

test('LE RANG D\'UN PÉTALE DIT LA LETTRE QU\'IL PORTE', () => {
    // LA RÈGLE QUE L'ÉCRAN AFFICHE MAINTENANT EN CHIFFRES, et elle doit être
    // CELLE du dépôt, pas une seconde écrite à côté : `lettresDuJardin` pose
    // `f.mot[(k - f.depart + 6) % 6]` sur le pétale `k`. L'activité numérote
    // `((k - depart + 6) % 6) + 1`. Si les deux divergeaient, le « 1 » affiché
    // ne serait pas la première lettre — on aurait écrit une aide qui ment.
    for (let i = 0; i < 6; i++) {
        const item = jardinGenerator.generate({}, { rng: makeRng(`rang-${i}`), index: i });
        const sol = item.meta.solution;
        for (const f of item.meta.jardin.fleurs) {
            f.petales.forEach((cle, k) => {
                const rang = ((k - f.depart + 6) % 6) + 1;
                assert.equal(sol.get(cle), f.mot[rang - 1],
                    `le pétale de rang ${rang} ne porte pas la ${rang}e lettre de ${f.mot}`);
            });
            // LE PÉTALE 1 EST BIEN CELUI DU DÉPART — c'est ce que la phrase
            // affichée promet à l'élève.
            assert.equal(((f.depart - f.depart + 6) % 6) + 1, 1);
            assert.equal(sol.get(f.petales[f.depart]), f.mot[0]);
        }
    }
});

test('L\'ÉCRAN MONTRE LE DÉPART, LE SENS, ET LA DÉFINITION', () => {
    // L'activité touche le document dès qu'on l'importe : on lit sa source.
    // `tools/jardinFleurChoisie.mjs` mesure l'écran pour de vrai — il clique un
    // cœur et vérifie que les numéros 1 à 6 TOURNENT dans le sens des aiguilles
    // autour du cœur, ce qu'aucune lecture de source ne peut dire.
    const src = lire('js/core/activities/jardin.js');
    assert.match(src, /const rang = \(\(k - f\.depart \+ 6\) % 6\) \+ 1;/,
        'le rang affiché doit suivre la même règle que `lettresDuJardin`');
    assert.match(src, /ja-case--depart/, 'le pétale de départ doit se marquer');
    assert.match(src, /sens des aiguilles d'une montre/,
        'le sens de lecture doit être dit en toutes lettres');
    assert.match(src, /data-fleur="\$\{n\}"/, 'les définitions doivent porter leur fleur');
    // LE TÉMOIN : sans lui, supprimer la zone d'information laisserait les
    // trois règles ci-dessus vertes et Rémy sans sa phrase.
    assert.match(src, /\[data-fleur-info\]/);
});

test('LE JARDIN SAIT MONTRER SON CORRIGÉ — « une option réponse pour voir si »', () => {
    // RÉMY : « pourrais-tu dans la barre de debug me mettre une option réponse
    // (de manière générale) pour voir si ». `#db-solution` existait et demandait
    // `montrerSolution()` à l'exercice ; le Jardin ne savait pas répondre, et le
    // bouton se taisait — sur l'exercice où la question se pose le plus, puisque
    // personne ne vérifie à l'œil qu'un jardin de vingt-huit cases est soluble.
    const src = lire('js/core/activities/jardin.js');
    assert.match(src, /montrerSolution\(\) \{/, 'le Jardin doit savoir montrer son corrigé');
    assert.match(src, /item\.meta\.solution/, 'et le prendre dans la solution de l\'item');

    // ET LE BOUTON RETOMBE SUR LA RÉPONSE DE L'ITEM quand l'exercice ne sait
    // rien montrer : c'est le « de manière générale » de sa demande. Presque
    // aucun exercice n'a de `montrerSolution`, mais TOUS portent leur réponse.
    const app = lire('js/app.js');
    const i = app.indexOf('db-solution');
    const bloc = app.slice(i, i + 2600);
    assert.ok(bloc.length > 500, 'tranche vide : l\'épreuve ne vérifierait rien');
    assert.match(bloc, /it\.reponsePapier \|\| it\.answer/,
        'le bouton doit dire la réponse attendue quand l\'exercice ne montre rien');
    // `reponsePapier` D'ABORD : les deux chapitres de calcul littéral posent la
    // sentinelle `'ok'` dans `answer`, et afficher « ok » ne répondrait rien.
    assert.ok(bloc.indexOf('reponsePapier') < bloc.indexOf('it.answer'),
        '`answer` est lu avant `reponsePapier` : on affichera « ok »');
});

// ─────────────────────────────────────────────────────────────────────────────
//
// LE JARDIN EST DÉSACTIVÉ, ET CE N'EST PAS UN ACCIDENT.
//
// RÉMY, le 6 octobre : « désactive le jardin ». Il venait de signaler que les
// fleurs n'étaient pas claires — « on ne sait pas où mettre les définitions » —
// et l'on avait corrigé le jour même : la fleur dit maintenant son départ, son
// sens et sa définition. Il juge que cela ne suffit pas pour une classe. C'est
// son métier.
//
// CETTE ÉPREUVE N'EMPÊCHE PAS DE LE RALLUMER — elle oblige à PASSER PAR ICI
// pour le faire, et donc à lire pourquoi il a été éteint. Un exercice qui
// reviendrait au catalogue par un coup de rangement, sans que personne ne
// décide, serait exactement ce qu'on veut éviter : il irait chez ses élèves.

test('LE JARDIN N\'EST PROPOSÉ À PERSONNE — « désactive le jardin »', () => {
    const exo = getExerciseById('voc-jardin');
    assert.ok(exo, 'l\'exercice doit continuer d\'EXISTER : seul son statut change');
    assert.equal(statusOf(exo), STATUS.BROUILLON,
        'le Jardin est revenu au catalogue : Rémy l\'avait désactivé, relire le '
        + 'commentaire dans js/data/calcul.js avant de le rallumer');

    // NI À L'ÉLÈVE, NI AU PROFESSEUR. `test` l'aurait laissé dans le catalogue
    // du professeur — ce n'est pas ce qu'il a demandé.
    for (const teacher of [false, true]) {
        const vus = filterByStatus(exercices, { teacher });
        assert.ok(!vus.some(e => e.id === 'voc-jardin'),
            `le Jardin est encore proposé ${teacher ? 'au professeur' : 'à l\'élève'}`);
    }
    // MAIS IL RESTE ATTEIGNABLE PAR SON IDENTIFIANT, et c'est ce qui empêche
    // cette désactivation de casser quoi que ce soit : une séance enregistrée
    // qui le contient déjà continue de tourner. Le statut décide de ce qu'on
    // PROPOSE, pas de ce qui existe.
    assert.equal(getExerciseById('voc-jardin').id, 'voc-jardin');
    // Et le filtre explicite de la palette d'auteur le retrouve : on doit
    // pouvoir aller le voir pour le reprendre.
    assert.ok(filterByStatus(exercices, { only: STATUS.BROUILLON })
        .some(e => e.id === 'voc-jardin'));
});
