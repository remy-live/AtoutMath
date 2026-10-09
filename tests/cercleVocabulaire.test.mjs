// Le vocabulaire du cercle : les mots, les confusions, et la figure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getGenerator } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';
import { RENDUS } from '../js/ui/printSheet.js';
import {
    MOTS_CERCLE, cercleVocabulaireGenerator, memeMot, normaliser, jugerNotation, lettresDe,
    lettresEnOrdre, familleAttendue, ecrituresDeLaSerie
} from '../js/core/generators/cercleVocabulaire.js';
import { marcheDe } from '../js/core/activities/cercleElement.js';
import { tracesDe, surCercle, polyArc, cercleSvg, branchesCroix, CX, CY, R } from '../js/core/cercleFigure.js';

const gen = () => getGenerator('geo.cercle-vocabulaire');
const suite = (n, params = {}) => Array.from({ length: n }, (_, i) =>
    gen().generate(params, { rng: makeRng(`s-${i}`), index: i }));

test('les neuf mots portent chacun leur définition ET leur confusion', () => {
    // `pourquoi` est la phrase du cours ; `contre` est ce qu'on répond à
    // l'élève qui a choisi ce mot-là par erreur. C'est le second qui enseigne.
    assert.equal(MOTS_CERCLE.length, 9);
    const ids = new Set();
    for (const m of MOTS_CERCLE) {
        assert.equal(ids.has(m.id), false, `id en double : ${m.id}`);
        ids.add(m.id);
        assert.ok(m.nom && m.pourquoi && m.contre, m.id);
        assert.ok(m.pourquoi.length > 20, `${m.id} : définition trop courte`);
        assert.equal(typeof m.tirer, 'function', m.id);
    }
    // Tangente et sécante sont de quatrième : elles ne doivent pas tomber dans
    // une série de sixième sans qu'on l'ait demandé.
    assert.deepEqual(MOTS_CERCLE.filter(m => m.avance).map(m => m.id), ['tangente', 'secante']);
});

test('UNE SÉRIE PARCOURT LES MOTS AU LIEU DE LES TIRER', () => {
    // Sur huit questions, un tirage laisse presque toujours un mot de côté et
    // en donne trois fois un autre.
    const mots = MOTS_CERCLE.filter(m => !m.avance).map(m => m.id);
    const vus = suite(mots.length).map(it => it.meta.mot);
    assert.deepEqual([...new Set(vus)].sort(), [...mots].sort());
});

test('UN DIAMÈTRE EST UNE CORDE, ET LE JEU LE RECONNAÎT', () => {
    // C'est le vrai piège du chapitre, et il aurait rendu l'exercice injuste :
    // devant un diamètre, « une corde » n'est pas faux, c'est moins précis.
    // Deux réponses à cela — la question demande le nom LE PLUS PRÉCIS, et
    // l'élève qui répond « corde » s'entend dire qu'il a raison.
    const it = gen().generate({ mots: ['diametre'], sens: 'nommer' },
        { rng: makeRng('diam'), index: 0 });
    assert.equal(it.answer, 'un diamètre');
    assert.match(it.prompt.text, /Que représente le segment \[[A-Z][A-Z]\] \?/);
    const corde = it.choices.find(c => c.value === 'une corde');
    assert.ok(corde, 'la corde doit être proposée : c\'est l\'erreur attendue');
    assert.match(corde.why, /Tu as raison/);
    assert.match(corde.why, /passe par le centre/);
});

test('ON NE DEMANDE JAMAIS DE TROUVER « UNE CORDE » FACE À UN DIAMÈTRE', () => {
    // La question aurait deux bonnes réponses, et l'élève qui désigne le
    // diamètre aurait raison. Trois tracés valent mieux qu'une question fausse.
    for (let i = 0; i < 40; i++) {
        const it = gen().generate({ mots: ['corde'], sens: 'trouver' },
            { rng: makeRng(`corde-${i}`), index: 0 });
        if (it.meta.sens !== 'trouver') continue;
        const types = it.meta.spec.elements.map(e => e.type);
        assert.equal(types.includes('diametre'), false,
            `graine ${i} : un diamètre est proposé face à « une corde » — ${types.join(', ')}`);
    }
});

test('« TROUVER » DÉSIGNE VRAIMENT LE BON TRACÉ', () => {
    for (let i = 0; i < 30; i++) {
        const it = gen().generate({ sens: 'trouver' }, { rng: makeRng(`tr-${i}`), index: i });
        if (it.meta.sens !== 'trouver') continue;
        const spec = it.meta.spec;
        const bonIdx = it.meta.bon;
        assert.ok(bonIdx >= 1 && bonIdx <= spec.elements.length, `graine ${i}`);
        // Le tracé désigné doit être du type qu'on demande.
        const attendu = { arc: 'arc', corde: 'corde', rayon: 'rayon', diametre: 'diametre',
            tangente: 'tangente', secante: 'secante' }[it.meta.mot];
        assert.equal(spec.elements[bonIdx - 1].type, attendu, `graine ${i} : mauvais tracé désigné`);
        // LES TRACÉS SE DÉSIGNENT PAR LEUR NOTATION, pas par un rang. Rémy :
        // « ne mets pas Tracé 1, tracé 2, mets plutôt des [AB] ».
        it.choices.forEach(c => assert.match(c.value, /^(\[[A-Z][A-Z]\]|\([A-Z][A-Z]\)|l'arc [A-Z][A-Z])$/, c.value));
        // Et chaque leurre explique ce qu'il EST : c'est là que ça s'apprend.
        it.choices.filter(c => !c.correct).forEach(c => {
            assert.match(c.why, /, c'est /, c.why);
        });
    }
});

test('les mots « globaux » ne se demandent jamais en mode TROUVER', () => {
    // « Lequel de ces tracés est le disque ? » n'a pas de sens : le disque est
    // la figure entière, pas un trait parmi d'autres.
    for (const mot of ['centre', 'cercle', 'disque']) {
        const it = gen().generate({ mots: [mot], sens: 'trouver' }, { rng: makeRng(mot), index: 0 });
        assert.equal(it.meta.sens, 'nommer', `${mot} devrait basculer en « nommer »`);
    }
});

test('LE DÉCOR NE PORTE JAMAIS LE NOM DE LA RÉPONSE', () => {
    // Un décor qui serait lui aussi « une corde » rendrait l'énoncé faux :
    // « ce qui est tracé en rouge » n'aurait plus de réponse unique — sauf que
    // le décor n'est pas rouge, et que c'est bien le surligné qu'on nomme.
    for (let i = 0; i < 40; i++) {
        const it = gen().generate({ sens: 'nommer' }, { rng: makeRng(`d-${i}`), index: i });
        const spec = it.meta.spec;
        assert.equal(spec.surligne, 0, 'le surligné est toujours le premier élément');
        // Un diamètre dans le décor d'une corde ferait deux cordes sur la figure.
        if (it.meta.mot === 'corde') {
            assert.equal(spec.elements.slice(1).some(e => e.type === 'diametre'), false, `graine ${i}`);
        }
    }
});

test('UNE SÉRIE COURTE GARDE DE QUOI CHOISIR, SANS SORTIR DU NIVEAU', () => {
    // Prendre les leurres dans la série, c'est bien — jusqu'à la série d'un
    // seul mot, qui ne proposerait alors que la bonne réponse. On complète
    // avec les mots du MÊME NIVEAU, et jamais avec la quatrième.
    for (const mots of [['rayon'], ['rayon', 'corde'], ['arc', 'corde', 'rayon']]) {
        const it = gen().generate({ mots, sens: 'nommer' },
            { rng: makeRng(`court-${mots.length}`), index: 0 });
        assert.ok(it.choices.length >= 4,
            `${mots.length} mot(s) : seulement ${it.choices.length} proposition(s)`);
        it.choices.forEach(c => {
            const m = MOTS_CERCLE.find(x => x.nom === c.value);
            assert.ok(m, `« ${c.value} » n'est pas un mot du cercle`);
            assert.equal(!!m.avance, false,
                `« ${c.value} » est de quatrième, dans une série qui ne l'est pas`);
        });
    }
    // Et quand le professeur DEMANDE la quatrième, elle revient : la règle
    // suit le niveau de la série, elle n'interdit rien.
    const quatre = gen().generate({ mots: ['tangente', 'secante'], sens: 'nommer' },
        { rng: makeRng('q4'), index: 0 });
    assert.ok(quatre.choices.some(c => /tangente|sécante/.test(c.value)));
});

test('LES TOUCHES SONT CELLES QUE LA SÉRIE PEUT DEMANDER', () => {
    // RÉMY : « ne parle pas de tangente pour le cercle ! » La touche « ( ) »
    // était posée toujours, au motif que n'en montrer qu'une désignerait la
    // famille de la réponse. C'est vrai DANS une série qui mélange les deux —
    // et faux dans la sienne, où rayon, diamètre et corde sont tous des
    // segments : la parenthèse n'annonçait rien d'autre qu'un objet hors
    // programme.
    const sixieme = ['centre', 'rayon', 'diametre', 'corde', 'arc', 'cercle', 'disque'];
    assert.deepEqual(ecrituresDeLaSerie(sixieme), ['segment', 'arc']);
    // Sans réglage, c'est la série par défaut — celle de sixième.
    assert.deepEqual(ecrituresDeLaSerie(null), ['segment', 'arc']);
    assert.deepEqual(ecrituresDeLaSerie([]), ['segment', 'arc']);
    // La quatrième ramène la parenthèse, et elle seule.
    assert.deepEqual(ecrituresDeLaSerie(['rayon', 'corde', 'tangente']), ['segment', 'droite']);
    assert.deepEqual(ecrituresDeLaSerie(['rayon', 'diametre', 'corde']), ['segment']);
    // Les mots qui SONT la figure entière ne demandent aucune notation.
    assert.deepEqual(ecrituresDeLaSerie(['centre', 'cercle', 'disque']), []);
    // ET LA LISTE SE LIT SUR CE QUE LE GÉNÉRATEUR ÉCRIT, pas sur une table
    // parallèle : la famille de chaque mot doit être celle de sa notation.
    for (const mots of [sixieme, ['tangente', 'secante'], ['arc']]) {
        for (const f of ecrituresDeLaSerie(mots)) {
            assert.ok(['segment', 'droite', 'arc'].includes(f), f);
        }
    }
});

test('la figure se dessine, et ses points sont bien sur le cercle', () => {
    const p = surCercle(0);
    assert.ok(Math.abs(p.x - (CX + R)) < 1e-9 && Math.abs(p.y - CY) < 1e-9, 'zéro degré est à droite');
    const haut = surCercle(90);
    assert.ok(haut.y < CY, 'quatre-vingt-dix degrés est EN HAUT, pas en bas');
    // Un arc aplati reste sur le cercle, point par point.
    polyArc(30, 120).forEach(q => {
        assert.ok(Math.abs(Math.hypot(q.x - CX, q.y - CY) - R) < 1e-6, 'un point d\'arc a quitté le cercle');
    });
    // Le disque passe SOUS le reste : c'est un fond, pas un trait.
    const traces = tracesDe({ elements: [{ type: 'disque' }, { type: 'rayon', a: 40 }], surligne: 1 });
    assert.equal(traces[0].k, 'cercle');
    assert.equal(traces[0].plein, true);
    assert.ok(traces.some(t => t.k === 'ligne' && t.fort), 'le rayon surligné doit être marqué fort');
    // UN POINT EST UNE CROIX. Rémy : « je te rappelle qu'un point est
    // représenté par une croix » — c'est la convention du collège, et
    // l'intersection des deux traits EST le point.
    assert.ok(traces.some(t => t.k === 'croix'), 'les points doivent être des croix');
    assert.equal(traces.some(t => t.k === 'point'), false, 'plus aucun disque plein');
    assert.equal(branchesCroix(10, 20, 4).length, 2, 'une croix, ce sont deux segments');
    // Et le centre porte toujours son nom : c'est de lui qu'on parle.
    assert.ok(traces.some(t => t.k === 'texte' && t.t === 'O'));
    assert.match(cercleSvg(traces), /^<svg/);
});

test('LA FEUILLE MONTRE LA MÊME FIGURE QUE L\'ÉCRAN', () => {
    const rendu = RENDUS.cercleVocabulaire;
    assert.ok(rendu, 'le rendu papier doit être déclaré');
    // Un DIAMÈTRE : il faut un tracé, pas un point — le centre surligné n'a
    // pas d'épaisseur de trait, et le test ne mesurerait rien.
    const it = gen().generate({ mots: ['diametre'], sens: 'nommer' },
        { rng: makeRng('papier'), index: 0 });
    // `boiteDe` lit `slot.boite` : un slot plat donnerait des coordonnées NaN.
    const slot = { boite: { x: 10, y: 10, w: 50, h: 58 } };
    const vide = rendu.previewGrille(it, slot, 3, false);
    const corrige = rendu.previewGrille(it, slot, 3, true);
    assert.match(vide, /<svg/);
    // AUCUNE COORDONNÉE NaN : c'est ce qui manquait, et un aperçu tout en NaN
    // passait tous les comptages sans rien dessiner.
    assert.equal(/NaN/.test(vide), false, 'coordonnées NaN dans l\'aperçu');
    // La ligne de réponse est vide sur la fiche, remplie sur le corrigé.
    assert.match(vide, /<i><\/i>/);
    assert.match(corrige, new RegExp(`<i>${it.meta.reponse}</i>`));
    // LE ROUGE DEVIENT UN TRAIT GRAS : un polycopié photocopié n'a pas de
    // couleur, et « ce qui est tracé en rouge » n'aurait plus de référent.
    const epaisseurs = [...vide.matchAll(/stroke-width="([\d.]+)"/g)].map(m => Number(m[1]));
    assert.ok(Math.max(...epaisseurs) > Math.min(...epaisseurs) * 2,
        'le tracé surligné doit être nettement plus épais que les autres');
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('geo-cercle-vocabulaire');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.generatorId, 'geo.cercle-vocabulaire');
    assert.ok(RENDUS[exo.printable], 'son rendu papier doit exister');
    // Les mots réglés par défaut existent tous, et excluent la quatrième.
    exo.params.mots.forEach(id => assert.ok(MOTS_CERCLE.some(m => m.id === id), `mot inconnu : ${id}`));
    assert.equal(exo.params.mots.includes('tangente'), false, 'la tangente est de quatrième');
    // Le générateur est bien enregistré sous cet identifiant.
    assert.equal(gen().id, cercleVocabulaireGenerator.id);
});

test('chaque item explique la bonne réponse, pas seulement la donne', () => {
    for (const it of suite(10)) {
        assert.ok(it.explanation && it.explanation.length > 30, it.prompt.text);
        assert.equal(it.hints.length, 3);
        assert.ok(it.choices.some(c => c.correct));
        assert.equal(it.choices.filter(c => c.correct).length, 1);
    }
});

test('LE DÉCOR RESTE DANS LA SÉRIE : pas de tangente en sixième', () => {
    // Le décor puisait dans tout le vocabulaire : une série de sixième
    // affichait des tangentes — un objet que l'élève ne sait pas nommer et
    // qu'on ne lui a pas demandé d'apprendre. Vu à l'écran, corrigé.
    const sixieme = ['centre', 'rayon', 'diametre', 'corde', 'arc', 'cercle', 'disque'];
    for (let i = 0; i < 40; i++) {
        const it = gen().generate({ mots: sixieme }, { rng: makeRng(`six-${i}`), index: i });
        it.meta.spec.elements.forEach(e => {
            assert.equal(['tangente', 'secante'].includes(e.type), false,
                `graine ${i} : « ${e.type} » dans une série de sixième`);
        });
        // ET LES PROPOSITIONS NON PLUS — une règle, là où il n'y avait qu'un
        // accident. Les neuf mots servaient de leurres quelle que soit la
        // série ; mesuré sur 286 questions de sixième, « une tangente » n'y
        // est jamais apparue, parce que `finalizeChoices` garde les quatre
        // PREMIERS leurres et que la tangente est l'avant-dernière de
        // `MOTS_CERCLE`. La propriété tenait à l'ordre d'un tableau : elle
        // tombe le jour où l'on réordonne le vocabulaire ou l'on passe à six
        // propositions. C'est ce que cette épreuve garde — et c'est aussi
        // pourquoi le défaut qui la fait tomber est « montrer plus de
        // propositions », et non « reprendre les neuf mots ».
        const permis = new Set(sixieme.map(id =>
            MOTS_CERCLE.find(m => m.id === id).nom));
        // EN MODE TROUVER, les propositions sont des NOTATIONS — « [AB] » —
        // et viennent des tracés de la figure, déjà gardés juste au-dessus.
        // La règle des leurres porte sur les MOTS.
        if (it.meta.sens === 'nommer') it.choices.forEach(c => {
            assert.ok(permis.has(c.value),
                `graine ${i} : « ${c.value} » est proposé hors de la série`);
        });
    }
    // Et quand on demande la quatrième, la tangente revient bien.
    const quatre = Array.from({ length: 12 }, (_, i) =>
        gen().generate({ mots: ['tangente', 'secante', 'corde'] }, { rng: makeRng(`q-${i}`), index: i }));
    assert.ok(quatre.some(it => it.meta.spec.elements.some(e => e.type === 'tangente')));
});

// --- RÉPONDRE SANS PROPOSITIONS ----------------------------------------------

test('ÉCRIRE LE MOT : on compare des mots, pas des chaînes', () => {
    // Rémy : « on peut aussi envisager de taper la réponse ». Refuser « rayon »
    // parce que la réponse attendue est « un rayon » n'enseignerait rien sur le
    // cercle — seulement sur la façon dont l'ordinateur lit.
    MOTS_CERCLE.forEach(m => {
        // « une » avant « un » : l'ordre des alternatives compte, et l'inverse
        // découpait « une corde » en « e corde ».
        const nu = m.nom.replace(/^(une|un|les|le|la|l')\s*/, '');
        assert.equal(memeMot(m.nom, m.nom), true, m.nom);
        assert.equal(memeMot(nu, m.nom), true, `« ${nu} » devrait valoir « ${m.nom} »`);
        assert.equal(memeMot(nu.toUpperCase(), m.nom), true, nu);
        assert.equal(memeMot(`  ${nu}  `, m.nom), true, nu);
        // Sans accents : un clavier de tablette n'en met pas toujours.
        const sansAccent = nu.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        assert.equal(memeMot(sansAccent, m.nom), true, sansAccent);
    });
    // Mais le rapprochement s'arrête là : deux mots différents restent deux
    // réponses différentes, et c'est tout l'objet du chapitre.
    assert.equal(memeMot('une corde', 'un diamètre'), false);
    assert.equal(memeMot('un arc', 'une corde'), false);
    assert.equal(memeMot('', 'un rayon'), false);
    assert.equal(memeMot('   ', 'un rayon'), false);
    // Et un mot vidé de tout par la normalisation ne vaut pas un autre vidé.
    assert.equal(normaliser('un'), '');
});

test('CLIQUER LE TRACÉ : la figure sait quel trait est lequel', () => {
    // L'activité ne connaît du geste de l'élève que le RANG de l'élément dans
    // la figure. Sans la table `ecrits`, cliquer juste serait compté faux.
    let vus = 0;
    for (let i = 0; i < 24; i++) {
        const item = cercleVocabulaireGenerator.generate({ sens: 'trouver' },
            { rng: makeRng('clic-' + i), index: i });
        if (item.meta.sens !== 'trouver') continue;
        vus++;
        assert.ok(Array.isArray(item.meta.ecrits), 'la table des tracés manque');
        assert.equal(item.meta.ecrits.length, item.meta.spec.elements.length);
        // Le tracé désigné par `bon` porte bien la réponse attendue.
        assert.equal(item.meta.ecrits[item.meta.bon - 1], item.answer, item.prompt.text);
        // Et aucun autre ne la porte : sinon deux clics seraient justes.
        assert.equal(item.meta.ecrits.filter(e => e === item.answer).length, 1, item.prompt.text);
    }
    assert.ok(vus > 8, `trop peu de questions « trouver » : ${vus}`);
});

test('la figure porte une zone de capture par élément, et seulement sur demande', () => {
    const item = cercleVocabulaireGenerator.generate({ sens: 'trouver' },
        { rng: makeRng('svg'), index: 1 });
    const traces = tracesDe(item.meta.spec);
    const inerte = cercleSvg(traces, { taille: 260 });
    assert.equal(/cv-hit/.test(inerte), false, 'une figure ordinaire ne se clique pas');

    const vivante = cercleSvg(traces, { taille: 320, cliquables: true });
    const cibles = [...vivante.matchAll(/data-el="(\d+)"/g)].map(m => Number(m[1]));
    assert.ok(cibles.length > 0, 'aucune zone cliquable');
    // Chaque élément de la figure est atteignable, celui qu'il faut compris.
    item.meta.spec.elements.forEach((el, i) =>
        assert.ok(cibles.includes(i), `l'élément ${i} ne se clique pas`));
    assert.ok(cibles.includes(item.meta.bon - 1));
    // Les zones sont transparentes : elles attrapent le doigt, elles ne se
    // voient pas — sinon le bon tracé se distinguerait des autres.
    assert.equal(/class="cv-hit"[^>]*stroke="(?!transparent)/.test(vivante), false);
});

test('la progression met les propositions d\'abord, et la réponse seule ensuite', () => {
    // Commencer sans propositions fermerait la porte à l'élève qui découvre le
    // chapitre : il ne peut pas écrire un mot qu'il n'a pas encore lu.
    assert.equal(marcheDe('progressive', 0, 9), 'choisir');
    assert.equal(marcheDe('progressive', 2, 9), 'choisir');
    assert.equal(marcheDe('progressive', 3, 9), 'seul');
    assert.equal(marcheDe('progressive', 8, 9), 'seul');
    // Un réglage explicite l'emporte toujours : le professeur qui sait où il
    // va fixe la marche.
    assert.equal(marcheDe('choisir', 8, 9), 'choisir');
    assert.equal(marcheDe('seul', 0, 9), 'seul');
});

test('LA NOTATION VAUT RÉPONSE — mais écrite comme elle s\'écrit', () => {
    // Rémy, le premier jour : « ce serait bien de pouvoir aussi répondre [OA]
    // ou écrire cercle ou rayon. » Rémy, revenu dessus : « tu acceptes comme
    // rayon og comme réponse alors qu'il faudrait taper [OG] ».
    //
    // LA PONCTUATION EST L'OBJET, et non son habillage : [OA] est le segment,
    // (OA) la droite, OA la longueur. On ne comparait que les lettres.
    const v = (donne, attendu) => jugerNotation(donne, attendu).verdict;

    // CE QUI RESTE JUSTE. Un segment se lit dans les deux sens, la casse et
    // les espaces ne sont pas le sujet, et l'article de l'arc non plus.
    assert.equal(v('[OA]', '[OA]'), 'juste');
    assert.equal(v('[AO]', '[OA]'), 'juste');
    assert.equal(v('[oa]', '[OA]'), 'juste');
    assert.equal(v(' [ O A ] ', '[OA]'), 'juste');
    assert.equal(v('(AB)', '(AB)'), 'juste');
    assert.equal(v('l\'arc AB', 'l\'arc AB'), 'juste');
    assert.equal(v('arc AB', 'l\'arc AB'), 'juste');
    // Tapé sans l'espace, comme sur un clavier de téléphone.
    assert.equal(v('arcAB', 'l\'arc AB'), 'juste');

    // CE QUI NE PASSE PLUS : les bonnes lettres, la mauvaise écriture. Ce
    // n'est pas « faux » — l'élève a LU LA FIGURE —, c'est 'notation'.
    assert.equal(v('og', '[OG]'), 'notation');
    assert.equal(v('OA', '[OA]'), 'notation');
    assert.equal(v('(OA)', '[OA]'), 'notation');   // la droite, pas le segment
    assert.equal(v('[AB]', '(AB)'), 'notation');   // le segment, pas la droite
    assert.equal(v('[OA)', '[OA]'), 'notation');   // une paire dépareillée
    assert.equal(v('[OA', '[OA]'), 'notation');    // ouverte, jamais fermée
    assert.equal(v('AB', 'l\'arc AB'), 'notation');
    assert.equal(v('[AB]', 'l\'arc AB'), 'notation');
    // Un mot n'est pas une notation : l'élève a répondu à une autre question
    // que celle posée, et le lui dire vaut mieux que de compter une faute.
    assert.equal(v('un rayon', '[OA]'), 'notation');
    assert.equal(v('corde', '[OA]'), 'notation');
    assert.equal(v('', '[OA]'), 'notation');

    // ET CE QUI DÉSIGNE UN AUTRE TRACÉ RESTE FAUX, comme avant.
    assert.equal(v('[OB]', '[OA]'), 'faux');
    assert.equal(v('[CD]', '[OA]'), 'faux');
    assert.equal(v('(CD)', '[OA]'), 'faux');

    // L'ÉLISION SE RETIRE PAR SON APOSTROPHE, JAMAIS COMME UN MOT : un segment
    // peut très bien s'appeler [LE], et retirer « LE » l'effacerait.
    assert.equal(lettresDe('[LE]'), 'EL');
    assert.equal(v('[EL]', '[LE]'), 'juste');
    // Le mot « arc » ne compte pas comme des points, même quand les points
    // s'appellent A, R ou C.
    assert.equal(lettresDe('l\'arc AC'), 'AC');
    assert.equal(lettresDe('l\'arc AR'), 'AR');
    assert.equal(lettresDe('arcAB'), 'AB');
    // ET L'ORDRE SE GARDE À PART : on réécrit la notation à l'élève dans les
    // phrases, et « [EO] » sous une figure qui porte [OE] aurait l'air d'une
    // seconde erreur.
    assert.equal(lettresEnOrdre('[OE]'), 'OE');
    assert.equal(lettresEnOrdre('l\'arc EO'), 'EO');
    assert.equal(lettresDe('[OE]'), 'EO');

    // CE QUE LA NOTATION ATTENDUE RÉCLAME se lit sur elle-même : une seule
    // source, celle que le générateur a écrite.
    assert.equal(familleAttendue('[OA]'), 'segment');
    assert.equal(familleAttendue('(AB)'), 'droite');
    assert.equal(familleAttendue('l\'arc AB'), 'arc');
});

test('CHAQUE REFUS DIT CE QUI NE VA PAS, et nomme la bonne écriture', () => {
    // Rémy : « Précise leur erreur si ils se trompent. » Une phrase vide serait
    // un « faux » déguisé — et c'est la phrase qui enseigne, pas le verdict.
    const dit = (donne, attendu) => jugerNotation(donne, attendu).dire;

    assert.match(dit('og', '[OG]'), /crochets/);
    assert.match(dit('og', '[OG]'), /LONGUEUR/);
    assert.match(dit('og', '[OG]'), /\[OG\]/);

    assert.match(dit('(OG)', '[OG]'), /DROITE/);
    assert.match(dit('(OG)', '[OG]'), /\[OG\]/);

    assert.match(dit('[AB]', '(AB)'), /SEGMENT/);
    assert.match(dit('[AB]', '(AB)'), /\(AB\)/);

    assert.match(dit('AB', 'l\'arc AB'), /arc AB/);
    assert.match(dit('[AB]', 'l\'arc AB'), /arc AB/);

    assert.match(dit('[OG', '[OG]'), /ouvre ET se ferme/);
    assert.match(dit('un rayon', '[OG]'), /NOTATION/);

    // ET UNE RÉPONSE JUSTE NE DIT RIEN : un commentaire sous une bonne réponse
    // se lit comme un reproche.
    assert.equal(dit('[OG]', '[OG]'), '');
});

test('ce que l\'élève écrit se compare à ce que l\'item attend', () => {
    // La réponse d'un item « trouver » EST une notation : les deux bouts de la
    // comparaison doivent se rejoindre, sinon écrire juste serait compté faux.
    const gen = getGenerator('geo.cercle-vocabulaire');
    let vus = 0;
    for (let i = 0; i < 40; i++) {
        const item = gen.generate({ mots: ['rayon', 'diametre', 'corde', 'arc'], sens: 'trouver' },
            { rng: makeRng(`not-${i}`), index: i });
        if (!item || !item.meta || item.meta.sens !== 'trouver') continue;
        vus++;
        // Tapée telle quelle : c'est la réponse, et elle doit passer.
        assert.equal(jugerNotation(item.answer, item.answer).verdict, 'juste', item.answer);
        // Tel qu'un élève le tapait avant, sans crochets ni article : il a lu la
        // figure, et on le lui dit — mais ce n'est plus accepté.
        const nu = item.answer.replace(/^l['\u2019]arc\s*/, '').replace(/[[\]()]/g, '').trim();
        const avis = jugerNotation(nu, item.answer);
        assert.equal(avis.verdict, 'notation', `« ${nu} » vs « ${item.answer} »`);
        assert.ok(avis.dire.length > 30, `« ${nu} » : refus sans explication`);
        // ET AUCUN AUTRE TRACÉ DE LA MÊME FIGURE ne passe pour le bon : deux
        // tracés ne partagent jamais une lettre, c'est ce qui rend la
        // comparaison par lettres sans ambiguïté.
        (item.meta.ecrits || []).forEach(e => {
            if (e === item.answer) return;
            assert.equal(jugerNotation(e, item.answer).verdict, 'faux',
                `« ${e} » ne doit pas valoir « ${item.answer} »`);
        });
    }
    assert.ok(vus >= 10, `trop peu de questions « trouver » éprouvées : ${vus}`);
});

test('SUR LE PAPIER, UNE FIGURE PORTE PLUSIEURS QUESTIONS', () => {
    // Rémy : « pose plusieurs questions pour une même figure ». La figure porte
    // DÉJÀ trois tracés nommés — celui qu'on demande et deux voisins tirés pour
    // la confusion. Sur l'écran les voisins ne servent qu'à rendre la question
    // difficile ; sur le papier, il n'y a aucune raison de ne pas les demander
    // aussi. Et c'est plus exigeant, pas moins : nommer le diamètre ET la corde
    // de la même figure oblige à les distinguer.
    let vues = 0;
    for (let i = 0; i < 20; i++) {
        const it = cercleVocabulaireGenerator.generate({ sens: 'nommer' },
            { index: i, total: 20, rng: makeRng(`c${i}`), papier: true });
        const q = it.meta.questions;
        assert.ok(Array.isArray(q) && q.length >= 2, `${q && q.length} question(s)`);
        // La première est celle de l'écran.
        assert.equal(q[0].reponse, it.meta.reponse);
        assert.equal(q[0].objet, it.meta.objet);
        // Chacune nomme un tracé RÉELLEMENT dessiné, et sa réponse est un mot
        // du chapitre.
        assert.equal(q.length, it.meta.spec.elements.length);
        q.forEach((x, j) => {
            assert.ok(x.objet, 'le tracé est désigné');
            assert.ok(MOTS_CERCLE.some(m => m.nom === x.reponse), `« ${x.reponse} » n'est pas un mot`);
            assert.equal(x.reponse,
                (MOTS_CERCLE.find(m => m.id === it.meta.spec.elements[j].type) || {}).nom);
        });
        vues++;
    }
    assert.equal(vues, 20);
});

test('l\'écran garde sa question unique', () => {
    const it = cercleVocabulaireGenerator.generate({ sens: 'nommer' },
        { index: 0, total: 10, rng: makeRng('x') });
    assert.equal(it.meta.questions, null);
    assert.equal(it.meta.enoncePapier, null);
});

test('DEUX LETTRES NE SE POSENT JAMAIS L\'UNE SUR L\'AUTRE', () => {
    // Vu sur une capture de l\'écran, en cherchant tout autre chose : « B »
    // posé sur « D » dans une figure de tangente et de sécante. La règle de
    // lisibilité ne regardait que les points DU CERCLE, à vingt degrés d\'écart
    // — et le second point d\'une tangente n\'est pas sur le cercle : il est
    // posé sur la droite, hors du disque, pour qu\'on puisse écrire « (AB) ».
    //
    // ET CE DÉFAUT EST DEVENU PLUS CHER : depuis que la notation est exigée,
    // deux lettres superposées ne rendent plus la figure moins jolie, elles
    // rendent la réponse impossible à écrire.
    //
    // MESURÉ sur 2 400 figures, avant et après :
    //
    //            figures sous 11 unités    écart le plus faible rencontré
    //   avant             290                   1,3  (deux lettres l'une sur l'autre)
    //   après               8                   9,9  (lisibles, un peu serrées)
    //
    // UNE LETTRE FAIT 6,5 UNITÉS DE HAUT : le plancher dur est là, et il ne se
    // négocie pas. Le seuil de 11 est l'objectif — celui que la règle vise —,
    // et l'on tolère qu'il manque sur moins d'un pour cent des figures les plus
    // chargées, où neuf lettres se partagent un cercle de rayon 32.
    // ELLE MESURE SEULE, et il a fallu `epreuveTombe` pour le comprendre.
    // Première version : elle appelait `ecartDesLettres`, la fonction même que
    // le générateur emploie pour décider. On a remis le défaut — ne regarder
    // que les points DU CERCLE — et l'épreuve est restée VERTE : la règle et sa
    // garde partageaient la même mesure, donc la garde ne pouvait pas voir une
    // mesure fausse. Elle repart donc de `tracesDe`, c'est-à-dire de ce que
    // l'écran dessine vraiment.
    const ecartVu = (spec) => {
        const l = tracesDe(spec).filter(t => t.k === 'texte');
        let min = Infinity;
        for (let a = 0; a < l.length; a++) {
            for (let b = a + 1; b < l.length; b++) {
                min = Math.min(min, Math.hypot(l[a].x - l[b].x, l[a].y - l[b].y));
            }
        }
        return min;
    };
    const SERIES = [
        ['centre', 'rayon', 'diametre', 'corde', 'arc', 'cercle', 'disque'],
        ['rayon', 'diametre', 'corde', 'arc', 'tangente', 'secante'],
        ['tangente', 'secante']
    ];
    let vues = 0, serrees = 0, pire = Infinity;
    for (const mots of SERIES) {
        for (const sens of ['nommer', 'trouver']) {
            for (let i = 0; i < 120; i++) {
                const it = cercleVocabulaireGenerator.generate({ mots, sens },
                    { rng: makeRng(`e-${mots.length}-${sens}-${i}`), index: i, total: 120 });
                const d = ecartVu(it.meta.spec);
                vues++;
                pire = Math.min(pire, d);
                if (d < 11) serrees++;
                assert.ok(d >= 7,
                    `${sens} · ${mots.length} mots · graine ${i} : deux lettres à `
                    + `${d.toFixed(1)} unités, elles se recouvrent`);
            }
        }
    }
    assert.ok(serrees <= vues * 0.01,
        `${serrees} figures sur ${vues} sous 11 unités (pire écart ${pire.toFixed(1)})`);
});
