// LIRE UN DIAGRAMME — ce que les onze marches doivent tenir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « tu as d'autres idées ? » — et l'inventaire du programme
// répondait depuis le 16 : « Les diagrammes statistiques — rien ».
//
// CE QUI SE GARDE ICI, ce sont les quatre choses qu'un diagramme faux fait sans
// le dire : une réponse qui ne correspond pas au dessin, une graduation qui
// trahit la réponse, une proposition plus longue que les autres, et un
// camembert dont les pourcentages ne tombent pas juste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    tirerSerie, geometrieBatons, batonsSvg, planBatons,
    tirerHistogramme, geometrieHistogramme, planHistogramme,
    tirerCirculaire, geometrieCirculaire, planCirculaire,
    SITUATIONS, NOMS_DIAGRAMMES, PARTS_LISIBLES, HAUTEUR_PAPIER, BOITE_PAPIER
} from '../js/core/diagrammes.js';
import { ETAPES, question } from '../js/core/generators/lireUnDiagramme.js';
import '../js/core/activities/index.js';
import { getGenerator } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';

const TOUTES = { marches: ETAPES.map(e => e.id) };
const gen = () => getGenerator('don.diagrammes');

/** Un item de la marche demandée, sur la graine donnée. */
function item(marche, graine) {
    const i = ETAPES.findIndex(e => e.id === marche);
    return gen().generate({ marches: [marche] },
        { rng: makeRng(`${marche}-${graine}`), index: 0, total: 1, etape: i });
}

test('LE DESSIN ET LA RÉPONSE DISENT LA MÊME CHOSE', () => {
    // LA FAUTE QU'UN EXERCICE DE LECTURE PEUT COMMETTRE SANS BRUIT : une barre
    // dessinée à 6 et une réponse attendue à 7. L'élève lit juste, on lui dit
    // faux, et personne ne peut le savoir — ni lui, ni Rémy, ni une épreuve qui
    // ne regarderait que les nombres.
    //
    // ON REFAIT DONC LE CHEMIN DE L'ŒIL : on part de la HAUTEUR DESSINÉE de la
    // barre, on la retraduit en valeur par l'axe, et c'est CELLE-LÀ qu'on
    // compare à la réponse.
    for (const graine of ['a', 'b', 'c', 'd', 'e']) {
        for (const pas of [1, 2, 5, 10]) {
            const s = tirerSerie(makeRng(`${graine}-${pas}`), { pas });
            const g = geometrieBatons(s);
            const zero = g.graduations[0].y;
            const unPas = zero - g.graduations[1].y;   // la hauteur d'un pas, en unités
            for (const b of g.barres) {
                const lue = ((b.basse - b.y) / unPas) * s.pas;
                assert.ok(Math.abs(lue - b.valeur) < 1e-6,
                    `une barre dessinée à ${lue.toFixed(2)} porte la valeur ${b.valeur}`);
            }
        }
    }
});

test('L’AXE NE MENT PAS : la graduation du haut dépasse toujours la plus grande barre', () => {
    // Une barre qui finit SUR le plafond du cadre se lit comme une barre
    // coupée : l'élève croit que la valeur sort du dessin, et il a raison de le
    // croire. Mesuré ici sur quatre pas et vingt tirages.
    for (const pas of [1, 2, 5, 10]) {
        for (let i = 0; i < 20; i++) {
            const s = tirerSerie(makeRng(`plafond-${pas}-${i}`), { pas });
            const plus = Math.max(...s.barres.map(b => b.valeur));
            assert.ok(plus < s.haut,
                `une barre à ${plus} pour un axe qui s'arrête à ${s.haut}`);
            assert.ok(plus >= s.haut / 3,
                `la plus grande barre ne fait que ${plus} sur un axe de ${s.haut} :`
                + ' le diagramme est écrasé en bas');
        }
    }
});

test('LA MARCHE « ENTRE DEUX GRADUATIONS » EN A TOUJOURS UNE', () => {
    // Sans cela, la marche tire parfois cinq valeurs pleines et n'enseigne RIEN
    // de ce pour quoi elle existe — et personne ne s'en aperçoit, puisque la
    // question reste juste.
    for (let i = 0; i < 30; i++) {
        const q = question(ETAPES.find(e => e.id === 'batons-entre'), makeRng('entre' + i));
        assert.equal(q.genre, 'batons');
        assert.ok(q.s.barres.some(b => b.valeur % q.s.pas !== 0),
            'aucune barre ne tombe entre deux graduations');
        // ET C'EST CELLE-LÀ QU'ON DÉSIGNE : viser une barre pleine ferait de
        // cette marche une marche ordinaire.
        assert.ok(q.s.barres[q.i].valeur % q.s.pas !== 0,
            'la barre désignée tombe sur une graduation');
    }
});

test('LE DIAGNOSTIC « j’ai compté les traits » N’ACCUSE JAMAIS QUI A RAISON', () => {
    // Il nomme la faute du chapitre — répondre 3 au lieu de 15 sur un axe de 5
    // en 5. Mais sur un axe de 1 en 1, compter les traits DONNE la bonne
    // réponse : un diagnostic posé là accuserait un élève qui a juste, et lui
    // expliquerait sa faute.
    for (let i = 0; i < 12; i++) {
        const un = item('batons-un', i);
        (un.diagnostics || []).forEach(d => {
            assert.notEqual(String(d.value), String(un.answer),
                'le diagnostic porte la bonne réponse : il accuse qui a raison');
        });
    }
    // ET IL EXISTE QUAND IL SERT : sur un axe trompeur, il doit nommer le
    // nombre que l'élève a écrit.
    let vus = 0;
    for (let i = 0; i < 12; i++) {
        const ech = item('batons-echelle', i);
        for (const d of ech.diagnostics || []) {
            vus++;
            assert.notEqual(String(d.value), String(ech.answer));
            assert.match(d.why, /GRADUATION/);
        }
    }
    assert.ok(vus >= 8, `seulement ${vus} diagnostics sur douze tirages trompeurs`);
});

test('AUCUNE PROPOSITION NE SE TRAHIT PAR SA LONGUEUR', () => {
    // VU SUR LA PLANCHE : la bonne réponse s'écrivait « 1/5 (un cinquième) » et
    // les trois leurres « 1/3 », « 1/2 », « 1/4 ». On n'avait plus besoin du
    // disque : la plus longue était la bonne.
    //
    // LA RÈGLE QU'ON GARDE EST PLUS LARGE QUE LE DÉFAUT : dans un QCM, la bonne
    // réponse ne doit se distinguer PAR RIEN D'AUTRE que par son contenu.
    for (const marche of ['circulaire-part', 'choisir', 'batons-record']) {
        for (let i = 0; i < 10; i++) {
            const it = item(marche, i);
            assert.ok(it.choices && it.choices.length >= 3,
                `${marche} : ${it.choices ? it.choices.length : 0} propositions`);
            const bonne = it.choices.find(c => c.correct || String(c.value) === String(it.answer));
            assert.ok(bonne, `${marche} : aucune proposition ne porte la réponse`);
            const autres = it.choices.filter(c => c !== bonne);
            const forme = (c) => String(c.label || c.value);
            // ON COMPARE LA FORME, PAS LA LONGUEUR EXACTE : « Danse » et
            // « Natation » n'ont pas le même nombre de lettres, et c'est
            // normal. Ce qu'on interdit est qu'elle soit la SEULE à porter une
            // parenthèse, un tiret ou une explication.
            const aUneGlose = (c) => /\(|—|:/.test(forme(c));
            if (aUneGlose(bonne)) {
                assert.ok(autres.every(aUneGlose),
                    `${marche} : seule la bonne réponse porte une glose — `
                    + `« ${forme(bonne)} » contre « ${autres.map(forme).join(' / ')} »`);
            }
        }
    }
});

test('LES POURCENTAGES D’UN CAMEMBERT TOMBENT JUSTE, ET FONT CENT', () => {
    // LE DÉFAUT ÉVITÉ : avec un tiers, le dessin affiche « 33 % », l'élève
    // calcule 33 % de 60 = 19,8 et la réponse attendue vaut 20. On compterait
    // faux un élève qui a fait exactement ce qu'on lui demandait.
    for (let i = 0; i < 40; i++) {
        const c = tirerCirculaire(makeRng('pct' + i), { avecPourcents: true });
        assert.equal(c.pourcents.reduce((a, b) => a + b, 0), 100,
            `les secteurs font ${c.pourcents.join(' + ')}`);
        c.pourcents.forEach(p => {
            assert.ok(Number.isInteger(p) && p >= 10,
                `un secteur à ${p} % : illisible ou non entier`);
            const effectif = c.total * p / 100;
            assert.ok(Number.isInteger(effectif),
                `${p} % de ${c.total} vaut ${effectif} : l'élève ne peut pas tomber juste`);
        });
        // ET LES SECTEURS DESSINÉS DISENT LES MÊMES PARTS : un dessin qui ne
        // suit pas ses propres pourcentages est un piège sans remède.
        const g = geometrieCirculaire(c);
        g.secteurs.forEach((s, k) => {
            assert.ok(Math.abs((s.a - s.de) / 3.6 - c.pourcents[k]) < 1e-6,
                `le secteur ${k + 1} occupe ${((s.a - s.de) / 3.6).toFixed(1)} % `
                + `pour ${c.pourcents[k]} % annoncés`);
        });
    }
});

test('LES BARRES D’UN HISTOGRAMME SE TOUCHENT, CELLES D’UN DIAGRAMME NON', () => {
    // CE N'EST PAS UNE QUESTION DE DESSIN : les barres d'un histogramme se
    // touchent parce que l'axe du bas est CONTINU. Un histogramme aéré dit le
    // contraire de ce que l'exercice enseigne, et la leçon tombe avec lui.
    const h = tirerHistogramme(makeRng('hist'), { pas: 2 });
    const gh = geometrieHistogramme(h);
    for (let i = 1; i < gh.classes.length; i++) {
        const avant = gh.classes[i - 1];
        assert.ok(Math.abs(gh.classes[i].x - (avant.x + avant.large)) < 1e-6,
            'les classes d’un histogramme laissent un trou entre elles');
    }
    // ET LES BORNES SONT SOUS LES SÉPARATIONS, pas sous le milieu des barres :
    // c'est ce qui dit que 150 est une FRONTIÈRE et non une catégorie.
    gh.classes.forEach((c, i) => {
        assert.ok(Math.abs(gh.bornes[i].x - c.x) < 1e-6,
            'une borne n’est pas posée sur la séparation qu’elle nomme');
    });
    assert.equal(gh.bornes.length, gh.classes.length + 1);

    const s = tirerSerie(makeRng('bat'), { pas: 1 });
    const gb = geometrieBatons(s);
    for (let i = 1; i < gb.barres.length; i++) {
        const avant = gb.barres[i - 1];
        assert.ok(gb.barres[i].x > avant.x + avant.large + 1,
            'les bâtons d’un diagramme se touchent : on dirait un histogramme');
    }
});

test('LE PAPIER DESSINE LE MÊME DIAGRAMME, ET IL DEMANDE SA PLACE', () => {
    // UNE FEUILLE QUI DÉCRIT LE DIAGRAMME AU LIEU DE LE DESSINER ne demande
    // rien : « Judo : 15 » répondrait à sa propre question. Le plan papier doit
    // donc porter les mêmes barres et les mêmes nombres que l'écran.
    const s = tirerSerie(makeRng('papier'), { pas: 5 });
    const p = planBatons(s);
    assert.ok(p.traits.length >= 2 + s.barres.length,
        'le plan papier n’a pas une ligne brisée par barre');
    s.barres.forEach(b => {
        assert.ok(p.textes.some(t => t.t === b.nom),
            `le nom « ${b.nom} » manque sous l’axe du papier`);
    });
    for (let v = 0; v <= s.haut; v += s.pas) {
        assert.ok(p.textes.some(t => t.t === String(v)),
            `la graduation ${v} manque sur l’axe du papier`);
    }
    // ET IL DEMANDE SA HAUTEUR : sans cela, le plafond ordinaire des figures
    // (34 mm) écrase le diagramme et les étiquettes se touchent — « 2 livres3
    // livres », vu sur la feuille.
    assert.equal(p.hauteurMax, HAUTEUR_PAPIER);
    assert.ok(HAUTEUR_PAPIER > 34, 'un diagramme a besoin de plus qu’une figure cotée');
    // ET LE CADRE PAPIER EST PLUS LARGE QUE CELUI DE L'ÉCRAN, pour la même
    // raison : à hauteur égale, c'est la largeur qui sépare les étiquettes.
    assert.ok(BOITE_PAPIER.w > 400, 'le cadre papier est aussi étroit que l’écran');
    assert.equal(planHistogramme(tirerHistogramme(makeRng('h2'), { pas: 1 })).hauteurMax,
        HAUTEUR_PAPIER);
    assert.ok(planCirculaire(tirerCirculaire(makeRng('c2'), {})).hauteurMax > 34);
});

test('CHAQUE MARCHE REND UNE QUESTION COMPLÈTE', () => {
    // Une marche qui rendrait un item sans figure, sans réponse ou sans indice
    // ne se verrait qu'en classe. Ici elle se voit en deux cents millisecondes.
    for (const e of ETAPES) {
        for (let i = 0; i < 4; i++) {
            const it = item(e.id, i);
            assert.ok(it.answer !== undefined && it.answer !== '', `${e.id} : pas de réponse`);
            assert.ok(it.explanation && it.explanation.length > 20,
                `${e.id} : pas d'explication`);
            assert.equal((it.hints || []).length, 2, `${e.id} : il faut deux indices`);
            assert.ok(SKILLS[it.skillId], `${e.id} : compétence inconnue « ${it.skillId} »`);
            // LA FIGURE EST L'ÉNONCÉ — sauf pour « choisir », qui est une
            // situation racontée et n'a rien à dessiner.
            if (e.id === 'choisir') {
                assert.ok(!/<svg/.test(it.prompt.html), 'choisir n’a rien à dessiner');
            } else {
                assert.match(it.prompt.html, /<svg/, `${e.id} : l'énoncé n'a pas de dessin`);
                assert.ok(it.prompt.figure && it.prompt.figure.traits.length,
                    `${e.id} : rien à imprimer sur la feuille`);
            }
            // ET LA QUESTION PAPIER NE RÉCITE PAS LE DIAGRAMME.
            assert.ok(!/^\s*$/.test(it.prompt.papier || ''), `${e.id} : pas d'énoncé papier`);
        }
    }
});

test('LES QUATRE RÉPONSES DE « QUEL DIAGRAMME » EXISTENT, ET CHACUNE EST JUSTE UNE FOIS', () => {
    // Une situation dont la « bonne » réponse serait un nom qu'on n'a pas
    // proposé rendrait la question impossible — et une liste où le même
    // diagramme est toujours la réponse rendrait la question inutile.
    const comptes = {};
    SITUATIONS.forEach(s => {
        assert.ok(NOMS_DIAGRAMMES[s.bon], `situation sans diagramme connu : ${s.bon}`);
        assert.ok(s.pourquoi && s.pourquoi.length > 30, 'une situation sans explication');
        comptes[s.bon] = (comptes[s.bon] || 0) + 1;
    });
    assert.ok(Object.keys(comptes).length >= 3,
        `seulement ${Object.keys(comptes).length} diagrammes sont jamais la bonne réponse`);
});

test('L’EXERCICE EST AU CATALOGUE, ET IL DIT CE QU’IL FAUT', () => {
    const exo = getExerciseById('don-diagrammes');
    assert.ok(exo, 'don-diagrammes n’est pas au catalogue');
    assert.equal(exo.generatorId, 'don.diagrammes');
    // LE PAVÉ SAIT AUSSI MONTRER DES PROPOSITIONS (voir `numeric.js`) : trois
    // marches sur onze sont des QCM, et c'est lui qui les pose.
    assert.equal(exo.activityId, 'numpad');
    // UNE SEULE COLONNE : un diagramme réduit à une demi-largeur n'a plus d'axe
    // lisible, et c'est l'axe qu'on demande de lire.
    assert.equal(exo.colonnesPapier, 1);
    ETAPES.forEach(e => assert.ok(exo.params.marches.includes(e.id),
        `la marche ${e.id} n’est pas cochée par défaut`));
    // ET LES TROIS COMPÉTENCES SONT DÉCLARÉES — sinon le bilan range une
    // lecture d'axe ratée sous « statistiques », qui n'apprend rien.
    ['don.diagramme.lire', 'don.diagramme.circulaire', 'don.diagramme.choisir']
        .forEach(id => {
            assert.ok(SKILLS[id], `la compétence ${id} n’existe pas`);
            assert.ok(SKILLS[id].lesson && SKILLS[id].lesson.length > 100,
                `${id} n’a pas de leçon`);
        });
});

test('LES PARTS DU CAMEMBERT SE NOMMENT TOUTES', () => {
    // Un secteur qu'on ne sait pas nommer ne se lit pas : « sept vingtièmes »
    // n'est pas une réponse qu'un œil donne, et la question deviendrait une
    // mesure au rapporteur — ce que la ligne rouge écarte, et ce qu'un disque
    // à l'écran ne permet pas de toute façon.
    PARTS_LISIBLES.forEach(p => {
        assert.ok(p.mot && p.mot.length > 2, `la part ${p.num}/${p.den} n’a pas de nom`);
        assert.ok(p.den <= 8, `un ${p.den}ème ne se reconnaît pas à l’œil`);
    });
});
