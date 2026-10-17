// LA MÉMOIRE COURTE DE LA SÉANCE — et l'accord avec l'outil qui la mesure.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « parfois un élève bloque complètement, que faire ? ».
//
// LE LOGICIEL N'AVAIT AUCUNE MÉMOIRE ENTRE DEUX QUESTIONS — lu dans le code, et
// c'est ce qui rendait son silence possible : un élève pouvait faire six fois
// la même erreur et recevoir six fois la même phrase neutre.
//
// ── CE QUE CE FICHIER GARDE, ET POURQUOI LA SECONDE MOITIÉ COMPTE AUTANT ────
//
// La première moitié éprouve le module : une question n'est pas une tentative,
// une réussite coupe la suite, un changement de compétence aussi.
//
// La seconde éprouve un ACCORD ENTRE DEUX LANGAGES, et c'est le défaut le plus
// coûteux qu'on puisse commettre ici sans qu'il se voie :
//
//   · `js/core/memoireCourte.js` décidera quand pousser un indice gratuit ;
//   · `api/lib/blocages.php` compte, sur les séances réelles de Rémy, combien
//     de fois ce seuil serait franchi — et c'est sur ces comptes qu'il
//     choisira entre deux et trois.
//
// Si les deux ne comptent pas la même chose, **la mesure ne prédit pas le
// comportement**, et le seuil choisi dessus est faux. Or rien ne tient deux
// implémentations d'accord : ni le compilateur, ni les types, ni la relecture
// — deux fichiers, deux langages, deux chemins. Sauf un jeu d'essais commun,
// `tests/fixtures/suitesDEchecs.json`, que CE fichier et
// `php tools/testApi.php` lisent tous les deux.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { ItemSession } from '../js/core/itemSession.js';
import { makeItem } from '../js/core/items.js';
import {
    oublierLaSeance, noterUneQuestion, laMemeBetiseQuAvant, echecsDeSuite, laMemoire
} from '../js/core/memoireCourte.js';

/** Inscrit une suite de questions conclues, dans l'ordre. */
function jouer(suite) {
    oublierLaSeance();
    for (const q of suite) {
        noterUneQuestion({
            competence: q.c === undefined ? 'num.add' : q.c,
            diagnostic: q.d || null,
            duPremierCoup: !!q.r
        });
    }
}

test('UNE QUESTION CONCLUE S\'INSCRIT, ET RIEN D\'AUTRE', () => {
    oublierLaSeance();
    assert.deepEqual(laMemoire(), []);
    noterUneQuestion({ competence: 'num.add', diagnostic: 'la retenue', duPremierCoup: false });
    assert.deepEqual(laMemoire(),
        [{ competence: 'num.add', diagnostic: 'la retenue', duPremierCoup: false }]);
});

test('LA MÊME BÊTISE QU\'À LA QUESTION D\'AVANT — et « avant » est au singulier', () => {
    // CE N'EST PAS LE CARNET D'ERREURS. On ne demande pas si l'élève a déjà
    // fait cette erreur un jour — cela, le carnet le sait, et il le dit
    // ailleurs. On demande si c'est À L'INSTANT la deuxième fois, parce que
    // c'est cela qui rend vraie la phrase « c'est la même chose qu'à la
    // question d'avant ».
    jouer([{ d: 'tu as oublié la retenue' }]);
    assert.equal(laMemeBetiseQuAvant('tu as oublié la retenue'), true);
    assert.equal(laMemeBetiseQuAvant('autre chose'), false);

    // Une question s'intercale, sans diagnostic : la remarque ne se dit plus,
    // et c'est juste — « la question d'avant » n'est plus celle-là.
    jouer([{ d: 'tu as oublié la retenue' }, { d: null, r: true }]);
    assert.equal(laMemeBetiseQuAvant('tu as oublié la retenue'), false);
});

test('SANS DIAGNOSTIC, ON NE DIT RIEN', () => {
    // Deux questions ratées sans distracteur reconnu ne sont pas « la même
    // bêtise » : on ne sait pas laquelle c'était. Dire que c'est la même serait
    // une affirmation qu'on n'a pas mesurée — adressée à un élève de sixième.
    jouer([{ d: null }]);
    assert.equal(laMemeBetiseQuAvant(null), false);
    assert.equal(laMemeBetiseQuAvant(''), false);
    assert.equal(laMemeBetiseQuAvant(undefined), false);
});

test('LA MÉMOIRE EST COURTE, ET ELLE NE GRANDIT PAS', () => {
    // Une séance d'une heure pose des dizaines de questions ; on garde la
    // queue. Sans ce plafond, un onglet laissé ouvert une journée entière
    // accumulerait sans raison — et ce qu'on veut savoir est « est-ce que ça
    // vient de se produire », jamais « combien depuis septembre ».
    oublierLaSeance();
    for (let i = 0; i < 60; i++) {
        noterUneQuestion({ competence: 'num.add', diagnostic: 'd' + i, duPremierCoup: true });
    }
    const vue = laMemoire();
    assert.ok(vue.length <= 20, `la mémoire garde ${vue.length} questions`);
    // ET C'EST LA QUEUE QU'ELLE GARDE, pas la tête : garder les vingt PREMIÈRES
    // répondrait à côté de la seule question qu'on lui pose.
    assert.equal(vue[vue.length - 1].diagnostic, 'd59');
});

test('ON OUBLIE TOUT AU DÉPART D\'UN PARCOURS', () => {
    jouer([{ d: 'la retenue' }]);
    oublierLaSeance();
    assert.deepEqual(laMemoire(), []);
    assert.equal(laMemeBetiseQuAvant('la retenue'), false);
    assert.equal(echecsDeSuite('num.add'), 0);
});

// --- L'accord avec l'outil de mesure ---------------------------------------

const ESSAIS = JSON.parse(readFileSync('tests/fixtures/suitesDEchecs.json', 'utf8'));

test('LES SUITES D\'ÉCHECS SE COMPTENT COMME LE DIT LE JEU D\'ESSAIS COMMUN', () => {
    assert.ok(ESSAIS.cas.length >= 8,
        `le jeu d'essais commun ne porte que ${ESSAIS.cas.length} cas : `
        + 'il ne garde plus l\'accord entre les deux comptages.');
    for (const cas of ESSAIS.cas) {
        jouer(cas.questions);
        const derniere = cas.questions[cas.questions.length - 1];
        const competence = derniere ? derniere.c : 'num.add';
        assert.equal(echecsDeSuite(competence), cas.echecsDeSuite,
            `« ${cas.nom} » : ${echecsDeSuite(competence)} échec(s) de suite `
            + `au lieu de ${cas.echecsDeSuite}.\n`
            + '      Ce jeu d\'essais est lu AUSSI par `php tools/testApi.php` :\n'
            + '      si les deux comptages divergent, les comptes que Rémy lira\n'
            + '      ne prédisent plus ce que le logiciel fera, et le seuil\n'
            + '      choisi dessus sera faux.');
    }
});

// --- La phrase arrive-t-elle vraiment à l'élève ? --------------------------
//
// CECI N'EST PAS UNE LECTURE DE SOURCE : on monte une VRAIE session d'items,
// on répond faux deux fois avec le même distracteur, et l'on écoute l'événement
// `game_feedback` — celui-là même que `ui/gameFeedbackUI.js` écoute pour
// peindre la carte. Entre la mémoire et l'écran il y a la session, la politique
// du parcours et le choix du message ; une épreuve de module ne les traverse
// pas.
//
// (La mesure au navigateur existe aussi — `node tools/laMemeBetise.mjs` —, et
// elle va plus loin : elle clique les bulles de « Additions Mystères ». Les
// deux se complètent, et celle-ci tourne en quatre millisecondes dans
// `npm test`.)

const MEME = 'Tu as soustrait au lieu d\'additionner.';

/** Un générateur dont le distracteur porte une phrase CONSTANTE. */
function genAvecDistracteur() {
    return {
        id: 'essai.somme', label: 'Somme d\'essai',
        answerKinds: ['choice'], resolvedSkills: ['num.add.entiers'], params: [],
        generate(params, ctx) {
            const a = ctx.rng.int(2, 9);
            const b = ctx.rng.int(2, 9);
            return makeItem({
                seed: ctx.rng.seed, generatorId: 'essai.somme',
                skillId: 'num.add.entiers', answerKind: 'choice',
                prompt: { text: `${a} + ${b} = ?`, html: `<p>${a} + ${b}</p>` },
                answer: a + b,
                // La phrase ne porte AUCUN nombre, et c'est ce qui rend
                // l'épreuve possible : deux questions différentes rendent deux
                // fois exactement le même diagnostic.
                choices: [
                    { value: a + b, correct: true },
                    { value: Math.abs(a - b) - 100, why: MEME }
                ],
                explanation: `${a} + ${b} = ${a + b}`
            });
        }
    };
}

/**
 * Les messages annoncés pendant qu'on joue la suite donnée.
 *
 * LE FAUX `document` DE `helpers.mjs` NE TRANSMET RIEN, et c'est volontaire :
 * `addEventListener` et `dispatchEvent` y sont des coquilles vides, « le strict
 * minimum pour charger les modules du noyau sous Node ». Une épreuve qui
 * écouterait naïvement n'entendrait donc JAMAIS rien — et passerait au vert si
 * elle se contentait de vérifier qu'aucun message fautif n'arrive.
 *
 * On pose donc un vrai petit relais, LE TEMPS DE LA MESURE, et on le retire
 * ensuite. On ne touche pas à `helpers.mjs` : le rendre bavard ferait courir de
 * vrais écouteurs dans les 4900 autres épreuves, qui n'ont rien demandé.
 */
function messagesEn(policy, coups) {
    const vus = [];
    const ecoute = (e) => { if (e.detail && e.detail.msg) vus.push(e.detail.msg); };
    const avant = {
        ajoute: document.addEventListener,
        retire: document.removeEventListener,
        envoie: document.dispatchEvent
    };
    const ecouteurs = [];
    document.addEventListener = (type, fn) => { if (type === 'game_feedback') ecouteurs.push(fn); };
    document.removeEventListener = () => { ecouteurs.length = 0; };
    document.dispatchEvent = (ev) => {
        if (ev && ev.type === 'game_feedback') ecouteurs.slice().forEach(f => f(ev));
        return true;
    };
    document.addEventListener('game_feedback', ecoute);
    try {
        oublierLaSeance();
        const s = new ItemSession({
            generator: genAvecDistracteur(), params: {}, policy,
            // L'ESSAI DU PROFESSEUR, et non la démonstration : `isDemo` gèlerait
            // la saisie ET couperait l'annonce — c'est-à-dire précisément ce
            // qu'on mesure. `sansTrace` joue pour de vrai sans rien écrire au
            // journal.
            sansTrace: true
        });
        for (const coup of coups) {
            const item = s.next();
            const faux = item.choices.find(c => !c.correct);
            if (coup === 'juste') { s.submit(item.answer); continue; }
            s.submit(faux.value);
            // ET IL SE CORRIGE. Ce second envoi est le cœur de la deuxième
            // épreuve : sans lui, la question reste ouverte et ne s'inscrit
            // nulle part.
            if (coup === 'faux-puis-juste') s.submit(item.answer);
        }
    } finally {
        document.addEventListener = avant.ajoute;
        document.removeEventListener = avant.retire;
        document.dispatchEvent = avant.envoie;
    }
    // SANS CE GARDE-FOU, L'ÉPREUVE SE TAIRAIT EN NE MESURANT RIEN. C'est le
    // quatrième piège de cette forme dans la journée : une mesure qui ne
    // mesure rien répond « tout va bien » exactement comme un logiciel sain.
    assert.ok(vus.length > 0,
        'aucun message n\'a été annoncé : le relais ne transmet plus, et cette '
        + 'épreuve ne garde donc plus rien.');
    return vus;
}

const PHRASE = 'C\'est la même chose qu\'à la question d\'avant.';

test('LA REMARQUE N\'ARRIVE QU\'À LA DEUXIÈME FOIS, ET LA RÈGLE RESTE', () => {
    // UN SEUL ESSAI PAR QUESTION, ET C'EST CE QUI REND LA SUITE RÉALISTE.
    //
    // Avec deux essais permis, une question répondue faux UNE fois n'est pas
    // conclue : l'élève la revoit, et le logiciel ne l'inscrit pas encore —
    // c'est juste, une question n'est pas deux. Ma première écriture de cette
    // épreuve enchaînait pourtant deux questions en les laissant toutes deux
    // ouvertes, donc en n'inscrivant rien : elle accusait le code d'un défaut
    // qui était dans le scénario.
    const vus = messagesEn({ showCorrection: true, correction: 'robot', maxAttemptsPerItem: 1 },
        ['faux', 'faux']);
    assert.ok(vus.length >= 2, `on n'a vu que ${vus.length} message(s) : ${JSON.stringify(vus)}`);
    assert.ok(!vus[0].includes(PHRASE),
        `la remarque part dès la PREMIÈRE erreur : « ${vus[0]} »`);
    assert.ok(vus[0].includes(MEME), `la première erreur n'est pas nommée : « ${vus[0]} »`);
    assert.ok(vus[1].includes(PHRASE),
        `la répétition n'est pas nommée à la deuxième fois : « ${vus[1]} »`);
    // ET LA RÈGLE EST TOUJOURS LÀ, APRÈS la remarque. Nommer sans réexpliquer
    // ne serait qu'un reproche : la remarque situe, la règle enseigne.
    assert.ok(vus[1].includes(MEME), `la règle a disparu : « ${vus[1]} »`);
    assert.ok(vus[1].indexOf(PHRASE) < vus[1].indexOf(MEME),
        `la règle passe avant la remarque : « ${vus[1]} »`);
});

test('ELLE ARRIVE AUSSI À L\'ÉLÈVE QUI S\'EST CORRIGÉ ENTRE-TEMPS', () => {
    // LE CAS QUI COMPTE, et celui qu'un câblage naïf rate : il se trompe, on
    // lui dit pourquoi, il se reprend et il trouve. Au moment où la question se
    // conclut, le verdict du dernier essai est « juste » et ne porte aucun
    // diagnostic — alors que la question, elle, en a eu un.
    const vus = messagesEn({ showCorrection: true, correction: 'robot', maxAttemptsPerItem: 3 },
        ['faux-puis-juste', 'faux']);
    const dernier = vus[vus.length - 1];
    assert.ok(dernier.includes(PHRASE),
        'l\'élève qui se corrige n\'entend jamais la remarque — c\'est-à-dire\n'
        + `      celui qui écoute. Dernier message : « ${dernier} »`);
});

test('ELLE SE TAIT EN INTERROGATION — on ne fait pas cours pendant qu\'on mesure', () => {
    // LE DÉPÔT A DÉJÀ TRANCHÉ CELA, et la phrase est dans `itemSession.js` :
    // en régime « reponse », « l'élève ne repart pas avec son erreur, mais on
    // ne lui fait pas cours pendant qu'on le mesure ». Nommer la répétition EST
    // faire cours. Un devoir noté n'est pas le moment.
    const vus = messagesEn({ showCorrection: true, correction: 'reponse', maxAttemptsPerItem: 1 },
        ['faux', 'faux']);
    for (const m of vus) {
        assert.ok(!m.includes(PHRASE),
            `la remarque s'ajoute à une correction d'interrogation : « ${m} »`);
    }
});

// --- Le câblage, et le cas qu'il est facile de rater ----------------------

const SESSION = readFileSync('js/core/itemSession.js', 'utf8');
const MENEUR = readFileSync('js/core/runner.js', 'utf8');

test('LE DIAGNOSTIC INSCRIT EST CELUI DE LA QUESTION, PAS DU DERNIER ESSAI', () => {
    // VOICI LE CAS QU'UN CÂBLAGE NAÏF RATE, et c'est précisément celui de
    // l'élève qui ÉCOUTE : il se trompe, on lui dit pourquoi, il se reprend et
    // il trouve. Au moment où la question se conclut, le verdict du dernier
    // essai est « juste » et ne porte AUCUN diagnostic — alors que la question,
    // elle, en a eu un.
    //
    // Inscrire `verdict.misconception` au lieu du diagnostic de la question ne
    // casserait RIEN de visible : la remarque se dirait encore à l'élève qui
    // n'a jamais trouvé, et jamais à celui qui s'est corrigé. Aucune épreuve de
    // module ne l'attrape, aucun écran ne rougit.
    //
    // MESURÉ AU NAVIGATEUR (`node tools/laMemeBetise.mjs`), sur « Additions
    // Mystères » : l'élève répond 2 à « 3 + 1 », reçoit « Tu as soustrait au
    // lieu d'additionner », se corrige avec 4 — puis répond 0 à « 5 + 5 » et
    // lit « C'est la même chose qu'à la question d'avant. Tu as soustrait au
    // lieu d'additionner. »
    assert.match(SESSION, /noterUneQuestion\(\{[\s\S]{0,200}diagnostic: this\.diagnosticDeLaQuestion/,
        'la mémoire courte n\'inscrit plus le diagnostic de la QUESTION.\n'
        + '      Avec celui du dernier essai, la remarque ne se dira jamais à\n'
        + '      l\'élève qui se corrige — c\'est-à-dire à celui qui écoute.');
    assert.match(SESSION, /this\.diagnosticDeLaQuestion = null;/,
        'le diagnostic de la question ne se remet plus à zéro à chaque question : '
        + 'il traînerait d\'une question sur l\'autre.');
});

test('LA QUESTION « EST-CE LA DEUXIÈME FOIS ? » SE POSE AVANT L\'INSCRIPTION', () => {
    // SINON ELLE SE COMPARE À ELLE-MÊME, et la remarque se dirait à la
    // PREMIÈRE erreur — ce qui est faux, et pire que de ne rien dire : l'élève
    // cherche une question d'avant qui n'existe pas.
    const ouDemande = SESSION.indexOf('laMemeBetiseQuAvant');
    const ouInscrit = SESSION.indexOf('noterUneQuestion({');
    assert.ok(ouDemande > 0 && ouInscrit > 0,
        'le câblage de la mémoire courte a disparu de la session d\'items.');
    assert.ok(ouDemande < ouInscrit,
        'la mémoire s\'inscrit avant qu\'on l\'interroge : la question se compare '
        + 'à elle-même, et la remarque part dès la première erreur.');
});

test('ET LA MÉMOIRE S\'OUBLIE AU DÉPART D\'UN PARCOURS', () => {
    // « C'est la même chose qu'à la question d'avant » doit porter sur une
    // question que l'élève peut RETROUVER. S'il reprend son travail une heure
    // plus tard, la question d'avant n'est plus à son écran : la remarque
    // n'enseigne plus rien, elle inquiète.
    assert.match(MENEUR, /oublierLaSeance\(\);/,
        'le meneur n\'oublie plus la mémoire courte au départ d\'un parcours.');
    const ouOubli = MENEUR.indexOf('oublierLaSeance();');
    const ouDepart = MENEUR.indexOf('start() {');
    assert.ok(ouDepart > 0 && ouOubli > ouDepart,
        'l\'oubli doit se faire DANS `start()` : un parcours interrompu — la '
        + 'sonnerie sonne, l\'onglet se ferme — ne passe par aucune fin.');
});

test('LE JEU D\'ESSAIS COMMUN NE SE PÉRIME PAS EN SILENCE', () => {
    // Un cas sans nom, ou sans attendu, est un cas qui passera toujours : on
    // le dit ici plutôt que de le découvrir le jour où il cachait le défaut.
    for (const cas of ESSAIS.cas) {
        assert.ok(cas.nom && cas.nom.length > 5, `un cas sans nom : ${JSON.stringify(cas)}`);
        assert.ok(Array.isArray(cas.questions), `« ${cas.nom} » n'a pas de questions`);
        assert.equal(typeof cas.echecsDeSuite, 'number',
            `« ${cas.nom} » n'attend aucune longueur de suite`);
        assert.equal(typeof cas.suiteLaPlusLongue, 'number',
            `« ${cas.nom} » n'attend aucune suite la plus longue — `
            + 'c\'est la colonne que lit le harnais PHP.');
    }
});
