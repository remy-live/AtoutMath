// La session d'items : ce qu'elle sert, et surtout QUAND ELLE S'ARRÊTE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { ItemSession } from '../js/core/itemSession.js';
import { makeItem } from '../js/core/items.js';

/** Un générateur minimal : une addition dont la réponse est le double du tirage. */
function genTest() {
    return {
        id: 'test.somme',
        label: 'Somme de test',
        answerKinds: ['numeric'],
        resolvedSkills: ['num.add.entiers'],
        params: [],
        generate(params, ctx) {
            const a = ctx.rng.int(1, 9);
            return makeItem({
                seed: ctx.rng.seed,
                generatorId: 'test.somme',
                skillId: 'num.add.entiers',
                answerKind: 'numeric',
                prompt: { text: `${a} + ${a} = ?`, html: `<p>${a} + ${a}</p>` },
                answer: a * 2,
                explanation: `${a} + ${a} = ${a * 2}`
            });
        }
    };
}

test('chaque appel sert une nouvelle question', () => {
    const s = new ItemSession({ generator: genTest(), params: {}, isDemo: true });
    const q1 = s.next();
    const q2 = s.next();
    assert.ok(q1 && q2);
    assert.equal(s.history.length, 2);
    // Les graines diffèrent : deux questions de suite ne sont pas la même.
    assert.notEqual(s.history[0], s.history[1]);
});

test('une série finie ne pose plus de question', () => {
    // Rémy : « au bout de 10 questions, s'il y en avait 10, il ne faut pas en
    // relancer une ». C'est exactement ce qui arrivait : le meneur programmait
    // la conclusion 1,5 s après la dernière réponse, et l'activité enchaînait
    // dès que l'élève fermait la correction — une onzième question s'affichait
    // dans l'intervalle, et si elle était répondue assez vite, le bilan
    // comptait onze questions sur dix.
    const s = new ItemSession({ generator: genTest(), params: {}, isDemo: true });
    s.next();
    const derniere = s.next();

    s.termine = true;
    const encore = s.next();
    assert.equal(encore, derniere, 'une nouvelle question a été tirée après la fin');
    assert.equal(s.history.length, 2, 'une graine de trop est entrée dans l\'historique');
    // Et on peut le demander autant de fois qu'on veut : c'est toujours la même.
    assert.equal(s.next(), derniere);
    assert.equal(s.history.length, 2);
});

test('après la fin, la question reste verrouillée', () => {
    // `next()` ne relâche plus `locked` : la dernière question est à l'écran
    // avec sa correction, mais plus rien ne peut y être répondu ni enregistré.
    const s = new ItemSession({ generator: genTest(), params: {}, isDemo: true });
    const item = s.next();
    s.submit(String(item.answer));       // la question se ferme
    assert.equal(s.locked, true);

    s.termine = true;
    s.next();
    assert.equal(s.locked, true, 'la session s\'est rouverte après la fin');
    assert.equal(s.submit('123').ignored, true, 'une réponse a été acceptée après la fin');
});

test('sans le drapeau, rien ne change au comportement d\'avant', () => {
    const s = new ItemSession({ generator: genTest(), params: {}, isDemo: true });
    const q1 = s.next();
    s.submit(String(q1.answer));
    const q2 = s.next();
    assert.notEqual(q1, q2);
    assert.equal(s.locked, false, 'la question suivante doit être jouable');
});

// --- Le mode ESSAI : jouer sans laisser de trace ------------------------------

test('EN MODE ESSAI, AUCUNE TENTATIVE N\'EST ÉCRITE AU JOURNAL', async () => {
    // Le professeur essaie un exercice depuis la palette d'auteur, parfois sur
    // la tablette d'un élève. Sans ce mode, il lui laisserait des fautes au
    // carnet d'erreurs et du bruit dans son modèle de maîtrise — et rien ne le
    // dirait.
    const { journal } = await import('../js/core/journal.js');
    const avant = journal.all().length;

    const s = new ItemSession({ generator: genTest(), params: {}, sansTrace: true });
    const q = s.next();
    s.hint();
    s.submit('reponse fausse exprès');
    s.next();
    s.submit(q.answer);

    assert.equal(journal.all().length, avant, 'le mode essai a écrit au journal');
});

test('sans ce mode, la tentative part bien au journal', () => {
    // La contre-épreuve : sans elle, le test précédent passerait aussi si
    // l'enregistrement était cassé pour tout le monde.
    const s = new ItemSession({ generator: genTest(), params: {} });
    assert.equal(s.sansTrace, false);
    const demo = new ItemSession({ generator: genTest(), params: {}, sansTrace: true });
    assert.equal(demo.sansTrace, true);
});

test('un essai se joue à la main : ce n\'est pas une démonstration', () => {
    // `isDemo` rendrait la main au robot et gèlerait la saisie. Un essai, non :
    // on répond soi-même, on voit la correction, on gagne des points à l'écran.
    const s = new ItemSession({ generator: genTest(), params: {}, sansTrace: true });
    assert.equal(s.isDemo, false);
    const q = s.next();
    const r = s.submit(q.answer);
    assert.equal(r.correct, true);
    assert.ok(r.points > 0, 'un essai doit se jouer comme le vrai exercice');
});

// ─────────────────────────────── LE SECOND ESSAI DOIT RESTER UN ESSAI ───────
//
// Trouvé par l'audit UX : au PREMIER échec, l'élève recevait déjà
// `item.explanation` — qui porte le calcul — ou « La bonne réponse était : … ».
// Le second essai n'était donc plus un essai mais une recopie, et le bouton
// « Un indice » posé juste à côté n'avait plus rien à offrir.
//
// Tout le dispositif du second essai tombait sur cette seule ligne.

/**
 * Ce que l'écran reçoit VRAIMENT.
 *
 * On n'écoute pas : le `document` de `helpers.mjs` est un mannequin dont le
 * `dispatchEvent` ne fait rien et n'a pas d'auditeurs. On intercepte donc
 * l'envoi lui-même — c'est le seul endroit par où passe le retour didactique,
 * et c'est exactement ce que l'écran reçoit.
 */
function ecouterLeRetour() {
    const vus = [];
    const vrai = document.dispatchEvent;
    document.dispatchEvent = (e) => {
        if (e && e.type === 'game_feedback') vus.push(e.detail);
        return true;
    };
    return { vus, couper: () => { document.dispatchEvent = vrai; } };
}

/** Une session d'entraînement à deux essais, question connue d'avance. */
function sessionADeuxEssais() {
    return new ItemSession({
        generator: genTest(), params: {},
        policy: { maxAttemptsPerItem: 2, showCorrection: true, hints: true,
            correction: 'robot', scoring: 'none' }
    });
}

test('AU PREMIER ÉCHEC, LA RÉPONSE N\'EST PAS DONNÉE — il reste un essai', () => {
    const s = sessionADeuxEssais();
    const q = s.next();
    const oreille = ecouterLeRetour();
    s.submit(-999);                       // faux à coup sûr
    oreille.couper();

    const dit = oreille.vus.filter(v => v.isError).map(v => `${v.msg} ${v.misconception || ''}`).join(' ');
    assert.ok(dit, 'l\'élève doit recevoir quelque chose');
    assert.ok(!dit.includes(String(q.answer)),
        `la réponse « ${q.answer} » ne doit pas être donnée : ${dit}`);
    assert.ok(!dit.includes(q.explanation || '§aucune§'),
        'l\'explication porte le calcul : elle attend la fin des essais');
});

test('…ET IL SAIT QU\'IL LUI EN RESTE UN', () => {
    // Un « ce n'est pas ça » sans suite se lit comme une fin de non-recevoir.
    const s = sessionADeuxEssais();
    s.next();
    const oreille = ecouterLeRetour();
    const r = s.submit(-999);
    oreille.couper();
    assert.equal(r.attemptsLeft, 1);
    assert.equal(r.revealed, false, 'rien n\'est révélé tant qu\'il peut chercher');
    const erreur = oreille.vus.find(v => v.isError);
    assert.equal(erreur.essaisRestants, 1);
});

test('AU DERNIER ÉCHEC, TOUT EST DIT — il repart sinon avec sa question', () => {
    const s = sessionADeuxEssais();
    const q = s.next();
    s.submit(-999);
    const oreille = ecouterLeRetour();
    const r = s.submit(-999);
    oreille.couper();

    assert.equal(r.attemptsLeft, 0);
    assert.equal(r.revealed, true);
    const dit = oreille.vus.filter(v => v.isError)
        .map(v => `${v.msg} ${v.misconception || ''}`).join(' ');
    assert.ok(dit.includes(q.explanation),
        `l'explication doit arriver maintenant : ${dit}`);
});

test('un seul essai autorisé : rien ne change, tout est dit du premier coup', () => {
    // Le cas de l'interrogation. Ne pas le casser en corrigeant l'autre.
    const s = new ItemSession({
        generator: genTest(), params: {},
        policy: { maxAttemptsPerItem: 1, showCorrection: true, hints: false,
            correction: 'reponse', scoring: 'none' }
    });
    const q = s.next();
    const oreille = ecouterLeRetour();
    s.submit(-999);
    oreille.couper();
    const dit = oreille.vus.filter(v => v.isError).map(v => v.msg).join(' ');
    assert.ok(dit.includes(String(q.answer)),
        `sans second essai, la bonne réponse se donne tout de suite : ${dit}`);
});
