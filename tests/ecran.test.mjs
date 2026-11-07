// CE QUE L'ÉLÈVE A SOUS LES YEUX — les règles, sans navigateur.
//
// Rémy : « on ne peut jamais vraiment voir l'écran de l'élève, juste son
// exercice, car c'est créé de façon aléatoire. » Ce fichier tient les décisions
// qui font que la phrase n'est plus vraie : la graine voyage, le relevé ne
// s'empile pas, et il se tait dès qu'il n'est plus sûr.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ECRAN_FRAIS_MS, releveDEcran, ecranFrais, phraseDeLEcran,
    direQuOnVoit, ceQuOnVoit, oublierLEcran
} from '../js/core/ecran.js';

test('LA GRAINE VOYAGE — c\'est la seule chose qui manquait', () => {
    const r = releveDEcran({
        exerciseId: 'calc-addition', graine: 'ab12cd34',
        question: 'Combien font 17 + 25 ?', fait: 3, total: 10
    }, 1000);
    assert.equal(r.graine, 'ab12cd34');
    assert.equal(r.exerciseId, 'calc-addition');
    assert.equal(r.question, 'Combien font 17 + 25 ?');
    assert.equal(r.fait, 3);
    assert.equal(r.total, 10);
    assert.equal(r.ts, 1000);
});

test('SANS EXERCICE, IL N\'Y A RIEN À DIRE — et l\'on rend null, pas un objet vide', () => {
    // Le direct préfère « il n'est sur aucun exercice » à une ligne vide, qui a
    // l'air d'une panne.
    assert.equal(releveDEcran(null), null);
    assert.equal(releveDEcran({}), null);
    assert.equal(releveDEcran({ question: 'Combien font 2 + 2 ?' }), null);
});

test('UNE QUESTION DE MILLE SIGNES EST COUPÉE : ce qui voyage trente fois par minute reste petit', () => {
    const r = releveDEcran({ exerciseId: 'x', question: 'a'.repeat(1000) });
    assert.ok(r.question.length <= 240, `${r.question.length} signes`);
    assert.ok(r.question.endsWith('…'), 'la coupure se voit');
});

test('LES BLANCS SONT RAMASSÉS : un énoncé sur trois lignes se lit sur une', () => {
    const r = releveDEcran({ exerciseId: 'x', question: ' Combien\n  font\t2 + 2 ? ' });
    assert.equal(r.question, 'Combien font 2 + 2 ?');
});

test('LA FRAÎCHEUR SUIT LE RYTHME DU BATTEMENT, pas le goût', () => {
    const t = 1_000_000;
    // Une minute : l'onglet en arrière-plan ne parle qu'à ce rythme-là, et il
    // faut donc que ce soit largement frais.
    assert.equal(ecranFrais({ ts: t }, t + 60_000), true);
    assert.equal(ecranFrais({ ts: t }, t + ECRAN_FRAIS_MS - 1), true);
    assert.equal(ecranFrais({ ts: t }, t + ECRAN_FRAIS_MS), false);
    assert.equal(ecranFrais(null, t), false);
    assert.equal(ecranFrais({}, t), false);
});

test('UN RELEVÉ VENU DU FUTUR RESTE FRAIS — une tablette mal réglée ne doit pas effacer l\'élève', () => {
    const t = 1_000_000;
    assert.equal(ecranFrais({ ts: t + 600_000 }, t), true);
});

test('LA PHRASE SE TAIT PLUTÔT QUE DE MENTIR', () => {
    const t = 1_000_000;
    const vieux = { ts: t - ECRAN_FRAIS_MS - 1, question: 'Combien font 2 + 2 ?' };
    assert.equal(phraseDeLEcran(vieux, t), null, 'périmé : on ne dit rien');
    assert.equal(phraseDeLEcran(null, t), null);
    // Un jeu n'a pas d'énoncé : il a une grille. On le dit ainsi, et l'on
    // n'invente pas de question.
    const jeu = { ts: t, graine: 'zz99', question: null, etape: null };
    assert.match(phraseDeLEcran(jeu, t), /jeu/);
    // Avec un titre d'étape mais pas d'énoncé, c'est le titre qui parle.
    assert.equal(phraseDeLEcran({ ts: t, etape: 'Le Patchwork' }, t), 'Le Patchwork');
});

test('LE RELEVÉ NE S\'EMPILE PAS, ET NE SE RAJEUNIT PAS TOUT SEUL', () => {
    oublierLEcran();
    assert.equal(ceQuOnVoit(), null);

    const meme = { exerciseId: 'calc-addition', graine: 'g1', question: 'Q1', fait: 0 };
    const a = direQuOnVoit(meme, 1000);
    assert.equal(a.ts, 1000);
    // MÊME QUESTION, PLUS TARD : l'horodatage NE bouge pas. Le remettre à zéro
    // ferait croire à un élève actif qui n'a rien fait — exactement l'élève que
    // le professeur cherche.
    const b = direQuOnVoit(meme, 99_000);
    assert.equal(b.ts, 1000, 'la même question garde son heure');

    // Question suivante : nouvelle graine, nouvelle heure.
    const c = direQuOnVoit({ ...meme, graine: 'g2', question: 'Q2', fait: 1 }, 120_000);
    assert.equal(c.graine, 'g2');
    assert.equal(c.ts, 120_000);
});

test('ON DIT QU\'ON NE VOIT PLUS RIEN — on ne laisse pas le relevé vieillir', () => {
    direQuOnVoit({ exerciseId: 'x', graine: 'g', question: 'Q' }, 1000);
    assert.ok(ceQuOnVoit());
    oublierLEcran();
    assert.equal(ceQuOnVoit(), null, 'trois minutes de conseil donné à côté, sinon');
    // Et un relevé sans exercice vaut un oubli : c'est ce que le meneur envoie
    // quand l'élève revient au menu.
    direQuOnVoit({ exerciseId: 'x', graine: 'g' }, 1000);
    direQuOnVoit(null);
    assert.equal(ceQuOnVoit(), null);
});

test('LA FICHE DE L\'ÉLÈVE EN TIRE LA PHRASE ET LA GRAINE', async () => {
    const { ficheDeLEleve } = await import('../js/core/ficheEleve.js');
    // `maintenant` est en SECONDES dans le direct, en millisecondes dans le
    // relevé : c'est la conversion que ce test protège.
    const maintenant = 1_700_000_000;
    // LE `ts` DU SERVEUR EST EN SECONDES — c'est la convention de l'API, et
    // c'est l'écart d'unité qui rendait la fiche muette (voir `ecranDuServeur`).
    // Ce test le fixe dans l'unité du serveur, exprès.
    const e = {
        id: 'e1', prenom: 'Léa', exo: 'calc-prio',
        ecran: { exerciseId: 'calc-prio', graine: 'ab12', question: 'Combien font 17 + 25 ?',
                 ts: maintenant - 5 }
    };
    const f = ficheDeLEleve(e, maintenant);
    assert.equal(f.sousLesYeux, 'Combien font 17 + 25 ?');
    assert.equal(f.graine, 'ab12');

    // Périmé : plus de phrase, et SURTOUT plus de graine — sans quoi le bouton
    // promettrait « sa question » en ouvrant celle d'il y a un quart d'heure.
    const vieux = ficheDeLEleve({
        ...e, ecran: { ...e.ecran, ts: maintenant - ECRAN_FRAIS_MS / 1000 - 1 }
    }, maintenant);
    assert.equal(vieux.sousLesYeux, null);
    assert.equal(vieux.graine, null);

    // Aucun relevé du tout : la fiche marche comme avant.
    const sans = ficheDeLEleve({ id: 'e2', prenom: 'Tom' }, maintenant);
    assert.equal(sans.sousLesYeux, null);
    assert.equal(sans.graine, null);
});

test('LES DEUX UNITÉS DE TEMPS NE SE CONFONDENT PLUS', async () => {
    const { ecranDuServeur } = await import('../js/core/ecran.js');
    // L'API dit ses instants en SECONDES ; le relevé local vient de `Date.now()`
    // et les dit en MILLISECONDES. Le même nom de champ portait les deux, et une
    // sonde de navigateur l'a trouvé : la fiche du professeur restait muette
    // devant un relevé parfaitement valide.
    assert.equal(ecranDuServeur({ ts: 1_700_000_000, graine: 'g' }).ts, 1_700_000_000_000);
    assert.equal(ecranDuServeur(null), null);
    assert.equal(ecranDuServeur({ graine: 'g' }), null, 'sans heure, pas de relevé');
});

test('LES RÉGLAGES VOYAGENT, TAILLÉS POUR LE VOYAGE', async () => {
    const { reglagesQuiVoyagent } = await import('../js/core/ecran.js');

    // Ce qui passe : les valeurs simples, et les listes de valeurs simples —
    // beaucoup de réglages sont des paliers cochés, et c'est exactement ce qui
    // change la question.
    assert.deepEqual(
        reglagesQuiVoyagent({ palier: 'moyen', taille: 5, avecZero: true, rien: null,
            niveaux: ['cm2', 'sixieme'] }),
        { palier: 'moyen', taille: 5, avecZero: true, rien: null,
          niveaux: ['cm2', 'sixieme'] });

    // Ce qui ne passe pas, sans bruit : aucun `paramSchema` du catalogue n'en
    // produit, et un relevé n'est pas l'endroit où l'on découvre qu'il y en a.
    assert.deepEqual(reglagesQuiVoyagent({ bon: 1, imbrique: { a: 1 } }), { bon: 1 });
    assert.deepEqual(reglagesQuiVoyagent({ bon: 1, f: () => 1 }), { bon: 1 });

    // Rien à dire vaut null, pas un objet vide : le direct distingue « il n'a
    // pas dit ses réglages » de « il en a, et ils sont vides ».
    assert.equal(reglagesQuiVoyagent({}), null);
    assert.equal(reglagesQuiVoyagent(null), null);
    assert.equal(reglagesQuiVoyagent('palier=moyen'), null);
    assert.equal(reglagesQuiVoyagent([1, 2]), null);

    // ET L'ON BORNE. Trente élèves toutes les dix secondes.
    const enorme = {};
    for (let i = 0; i < 200; i++) enorme['c' + i] = 'x'.repeat(50);
    assert.equal(reglagesQuiVoyagent(enorme), null, 'trop gros : rien plutôt que tout');
    const beaucoup = {};
    for (let i = 0; i < 200; i++) beaucoup['c' + i] = i;
    assert.equal(Object.keys(reglagesQuiVoyagent(beaucoup)).length, 40, 'quarante clefs au plus');
});

test('CHANGER UN RÉGLAGE FAIT UN RELEVÉ NEUF, même à question et graine égales', () => {
    // Le professeur peut changer un palier en direct : l'écran de l'élève change
    // alors sans que la question ni la graine bougent. Oublier les réglages dans
    // la comparaison, c'est garder le relevé d'avant.
    oublierLEcran();
    const base = { exerciseId: 'calc-prio', graine: 'g1', question: 'Q1', fait: 0 };
    const a = direQuOnVoit({ ...base, reglages: { palier: 'facile' } }, 1000);
    assert.equal(a.ts, 1000);
    const b = direQuOnVoit({ ...base, reglages: { palier: 'moyen' } }, 50_000);
    assert.equal(b.ts, 50_000, 'les réglages ont changé : c\'est un écran neuf');
    assert.deepEqual(b.reglages, { palier: 'moyen' });
    // Et sans rien changer, l'heure ne bouge toujours pas.
    const c = direQuOnVoit({ ...base, reglages: { palier: 'moyen' } }, 90_000);
    assert.equal(c.ts, 50_000);
    oublierLEcran();
});

test('LA FICHE REND LES RÉGLAGES, ET LES OUBLIE QUAND ILS SONT PÉRIMÉS', async () => {
    const { ficheDeLEleve } = await import('../js/core/ficheEleve.js');
    const maintenant = 1_700_000_000;
    const ecran = { exerciseId: 'calc-prio', graine: 'ab12', question: 'Q',
        reglages: { palier: 'moyen' }, ts: maintenant - 5 };
    assert.deepEqual(ficheDeLEleve({ id: 'e1', prenom: 'Léa', ecran }, maintenant).reglages,
        { palier: 'moyen' });
    // Périmés, ils partent AVEC la graine : ouvrir de vieux réglages en
    // annonçant « les siens » serait pire que d'avouer la devinette.
    const vieux = ficheDeLEleve({ id: 'e1', prenom: 'Léa',
        ecran: { ...ecran, ts: maintenant - ECRAN_FRAIS_MS / 1000 - 1 } }, maintenant);
    assert.equal(vieux.reglages, null);
    assert.equal(vieux.graine, null);
});

test('LE DIRECT PRÉFÈRE SES RÉGLAGES À LA DEVINETTE, ET DIT LEQUEL', async () => {
    const { readFileSync } = await import('node:fs');
    const EC = readFileSync(new URL('../js/ui/espaceClasses.js', import.meta.url), 'utf8');
    // Les siens d'abord, l'étape ensuite, le catalogue en dernier.
    assert.match(EC, /const siens = lireReglagesDuBouton\(el\);/);
    assert.match(EC, /const reglages = siens \|\| \(etape && etape\.overrides\) \|\| \{\};/);
    // ET LES TROIS PROVENANCES SE DISENT. Un professeur qui ne sait pas
    // laquelle il regarde conseille sur une question peut-être pas la sienne.
    assert.match(EC, /Ses réglages à lui/);
    assert.match(EC, /Réglages de votre séance/);
    assert.match(EC, /Réglages du catalogue/);
    // Un attribut se retouche à la main : un JSON malformé fait retomber sur la
    // devinette, il n'empêche pas d'ouvrir l'exercice.
    assert.match(EC, /function lireReglagesDuBouton\(bouton\)/);
    assert.match(EC, /catch \(e\) \{\s*return null;/);
});
