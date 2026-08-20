// LES TROIS EXERCICES DE FRACTIONS, vus depuis leurs générateurs.
//
// Le noyau est éprouvé ailleurs (fractionsEquivalentes.test.mjs). Ce qu'on
// vérifie ici, c'est ce que l'écran reçoit — et surtout les quatre consignes de
// Rémy, qu'aucune relecture ne rattraperait toute seule :
//
//   · la progression monte vraiment de marche en marche au fil de la série ;
//   · « pas besoin de simplifier dans un premier temps » — la réponse attendue
//     est le résultat BRUT, et le réglage ajoute la ligne quand on la veut ;
//   · « tu peux mélanger addition et soustraction, sans nombres relatifs » —
//     les deux signes sortent, et le résultat reste positif ;
//   · « du coup tu restes entre 2 et 10 dans un premier temps » — les
//     dénominateurs tiennent dans la table de Pythagore, qui sert d'aide.
//
// Plus une exigence qui n'a pas été demandée mais qui la suivait de près : les
// deux fractions de l'énoncé sont irréductibles. « 2/4 de la tarte » et l'élève
// simplifie d'abord, trouve un autre dénominateur commun, et il a raison.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    fracEgaliteGenerator, fracSommeProgressiveGenerator, fracProblemeGenerator
} from '../js/core/generators/fractionsEquivalentes.js';
import { NIVEAUX_SOMME, pgcd } from '../js/core/fractionsEquivalentes.js';
import { porteUneFraction } from '../js/core/fiche.js';
import { makeRng } from '../js/core/ids.js';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';

const tirer = (gen, params = {}, i = 0, index = 0) =>
    gen.generate(params, { rng: makeRng(`${gen.id}_${i}`), index });

// --- Compléter une égalité ---------------------------------------------------

test('l\'égalité pose une question dont la réponse EST le nombre manquant', () => {
    for (let i = 0; i < 60; i++) {
        const item = tirer(fracEgaliteGenerator, {}, i);
        const e = item.meta.egalite;
        assert.equal(item.answerKind, 'numeric');
        assert.equal(item.answer, e.reponse);
        assert.equal(item.skillId, 'num.frac.equivalentes');
        // Le trou est bien un trou : la réponse ne se lit nulle part dans
        // l'énoncé, ni en texte ni en HTML.
        const marque = item.prompt.text.split('=')[1];
        assert.ok(marque.includes('?'), `pas de trou dans « ${item.prompt.text} »`);
        assert.ok(item.hints.length >= 3);
        assert.ok(item.explanation.includes(String(e.facteur)));
    }
});

test('LA RÉPONSE NE FUITE PAS DANS L\'ÉNONCÉ', () => {
    // Un énoncé qui contient déjà le nombre à trouver se répond sans réfléchir.
    // Le cas dangereux : la réponse égale par hasard un nombre de l'énoncé.
    for (let i = 0; i < 120; i++) {
        const item = tirer(fracEgaliteGenerator, {}, `fuite${i}`);
        const e = item.meta.egalite;
        const cote = item.prompt.text.split('=')[1];
        const nombres = (cote.match(/\d+/g) || []).map(Number);
        assert.ok(!nombres.includes(e.reponse) || e.reponse === e.visible,
            `« ${item.prompt.text} » laisse voir ${e.reponse}`);
    }
});

test('l\'écriture « n/d » permet à la fiche de composer les colonnes', () => {
    // `fractions: true` ne suffit pas : la fiche ne met en colonnes que si elle
    // RECONNAÎT une fraction dans le texte. Rémy : « toujours des fractions en
    // colonnes ».
    assert.ok(fracEgaliteGenerator.fractions);
    assert.ok(fracSommeProgressiveGenerator.fractions);
    for (let i = 0; i < 20; i++) {
        assert.ok(porteUneFraction(tirer(fracEgaliteGenerator, {}, i).prompt.text));
        assert.ok(porteUneFraction(tirer(fracSommeProgressiveGenerator, {}, i).prompt.text));
    }
});

test('les réglages de l\'égalité passent jusqu\'à la question', () => {
    for (let i = 0; i < 20; i++) {
        const a = tirer(fracEgaliteGenerator, { sens: 'simplifier' }, `s${i}`);
        assert.equal(a.meta.egalite.sens, 'simplifier');
        const b = tirer(fracEgaliteGenerator, { trou: 'denominateur' }, `t${i}`);
        assert.equal(b.meta.egalite.trou, 'denominateur');
        const c = tirer(fracEgaliteGenerator, { maxBase: 4, maxFacteur: 5 }, `m${i}`);
        assert.ok(c.meta.egalite.facteur <= 5);
    }
});

// --- L'addition progressive --------------------------------------------------

test('LA SÉRIE MONTE VRAIMENT LES QUATRE MARCHES', () => {
    // « Il faut que ce soit progressif » : sur dix questions, on doit voir les
    // quatre marches, dans l'ordre, et finir sur celle du PPCM.
    const marches = [];
    for (let index = 0; index < 10; index++) {
        marches.push(tirer(fracSommeProgressiveGenerator, {}, index, index).meta.marche);
    }
    assert.deepEqual([...new Set(marches)], NIVEAUX_SOMME.map(n => n.id));
    assert.equal(marches[0], 'meme');
    assert.equal(marches[9], 'ppcm');
    // Jamais en arrière.
    const rang = (m) => NIVEAUX_SOMME.findIndex(n => n.id === m);
    marches.forEach((m, i) => { if (i) assert.ok(rang(m) >= rang(marches[i - 1])); });
});

test('une marche fixée ne bouge plus, même à la dixième question', () => {
    NIVEAUX_SOMME.forEach(({ id }) => {
        for (let index = 0; index < 10; index++) {
            const item = tirer(fracSommeProgressiveGenerator, { niveau: id }, index, index);
            assert.equal(item.meta.marche, id);
        }
    });
});

test('PAS BESOIN DE SIMPLIFIER — la réponse attendue est le résultat brut', () => {
    // Rémy : « pas besoin de simplifier dans un premier temps ». Mettre au même
    // dénominateur est déjà tout l'exercice ; simplifier par-dessus fait rater
    // les deux. Le réglage ajoute la ligne quand on la veut.
    for (let index = 0; index < 40; index++) {
        const item = tirer(fracSommeProgressiveGenerator, {}, index, index % 10);
        const c = item.meta.calcul;
        assert.equal(item.answerKind, 'text');
        assert.equal(item.answer, `${c.brut.n}/${c.brut.d}`);
        assert.equal(c.brut.d, c.commun);
        assert.ok(item.explicationPapier.includes(`${c.a.n}/${c.a.d}`));
        assert.ok(!/bande/i.test(item.explicationPapier));
    }
    // Avec le réglage, la ligne de simplification s'ajoute — et seulement
    // quand il y a vraiment quelque chose à simplifier.
    for (let index = 0; index < 40; index++) {
        const item = tirer(fracSommeProgressiveGenerator, { simplifier: 'oui' }, `s${index}`, index % 10);
        const c = item.meta.calcul;
        assert.equal(item.answer, c.aSimplifiable
            ? `${c.reduit.n}/${c.reduit.d}` : `${c.brut.n}/${c.brut.d}`);
        if (c.simplifie) assert.equal(pgcd(c.reduit.n, c.reduit.d), 1);
    }
});

test('LES DEUX FRACTIONS DE L\'ÉNONCÉ SONT IRRÉDUCTIBLES', () => {
    // « 2/4 de la tarte » est une faute de goût qui devient une faute tout
    // court : l'élève simplifie d'abord, trouve un autre dénominateur commun
    // que celui qu'on attend, et il a raison.
    [fracSommeProgressiveGenerator, fracProblemeGenerator].forEach(gen => {
        for (let index = 0; index < 60; index++) {
            const c = tirer(gen, { operation: 'les-deux' }, `irr${index}`, index % 10).meta.calcul;
            assert.equal(pgcd(c.a.n, c.a.d), 1, `${c.a.n}/${c.a.d} se simplifie`);
            assert.equal(pgcd(c.b.n, c.b.d), 1, `${c.b.n}/${c.b.d} se simplifie`);
        }
    });
});

test('ADDITION ET SOUSTRACTION MÊLÉES, SANS JAMAIS DE NÉGATIF', () => {
    // « Tu peux mélanger addition et soustraction de fractions (sans nombres
    // relatifs). » Les deux opérations sortent, et le résultat reste positif.
    const signes = new Set();
    for (let index = 0; index < 80; index++) {
        const c = tirer(fracSommeProgressiveGenerator,
            { operation: 'les-deux' }, `op${index}`, index % 10).meta.calcul;
        signes.add(c.signe);
        assert.ok(c.brut.n > 0, `${c.aReduit.n} ${c.signe} ${c.bReduit.n} n'est pas positif`);
        if (c.signe === '+') assert.ok(c.brut.n < c.brut.d, 'une somme reste sous l\'unité');
    }
    assert.deepEqual([...signes].sort(), ['+', '−']);
    // Et l'on peut n'en demander qu'une.
    for (let i = 0; i < 20; i++) {
        assert.equal(tirer(fracSommeProgressiveGenerator, { operation: 'somme' }, `a${i}`).meta.calcul.signe, '+');
        assert.equal(tirer(fracSommeProgressiveGenerator, { operation: 'difference' }, `b${i}`).meta.calcul.signe, '−');
    }
});

test('LES DÉNOMINATEURS RESTENT DANS LA TABLE DE PYTHAGORE', () => {
    // L'aide est la table de Pythagore, et elle s'arrête à dix : un
    // dénominateur qui n'y figure pas rendrait l'aide muette au moment où elle
    // sert. Le réglage lui-même est plafonné.
    [fracSommeProgressiveGenerator, fracProblemeGenerator].forEach(gen => {
        const max = gen.params.find(p => p.id === 'maxDen');
        assert.equal(max.max, 10, `${gen.id} laisse dépasser dix`);
        for (let index = 0; index < 60; index++) {
            const c = tirer(gen, { maxDen: 20 }, `d${index}`, index % 10).meta.calcul;
            assert.ok(c.a.d <= 10 && c.b.d <= 10, `${c.a.d} et ${c.b.d} sortent de la table`);
            // Le PPCM aussi doit s'y lire : 9 × 10 = 90, la table va jusqu'à 100.
            assert.ok(c.commun <= 100);
        }
    });
});

test('LES FRACTIONS D\'UN ÉNONCÉ S\'ÉCRIVENT EN COLONNES', () => {
    // Rémy : « écris les fractions en fraction colonne » — y compris au milieu
    // d'une phrase. Et le texte NU, lui, garde la barre oblique : c'est lui qui
    // part sur la feuille imprimée et dans le carnet d'erreurs, où une balise
    // `<span>` s'imprimerait telle quelle.
    for (let index = 0; index < 20; index++) {
        const item = tirer(fracProblemeGenerator, {}, `col${index}`, index % 10);
        const c = item.meta.calcul;
        assert.ok(item.meta.enonce.includes('fraction-num'), 'énoncé sans fraction en colonne');
        assert.ok(item.meta.enonce.includes(`<span class="fraction-den">${c.b.d}</span>`));
        // Le complément à un ne cite qu'UNE fraction : l'entier ne s'écrit pas
        // « 1/1 » dans une phrase.
        if (c.type !== 'complement') {
            assert.ok(item.meta.enonce.includes(`<span class="fraction-num">${c.a.n}</span>`));
        }
        // Aucune balise ne fuit dans le texte nu.
        assert.ok(!/[<>]/.test(item.prompt.text), item.prompt.text);
        assert.ok(!/&nbsp;/.test(item.prompt.text), item.prompt.text);
        assert.ok(item.prompt.text.includes(item.meta.enonceTexte));
    }
});

test('ON COMMENCE PAR « COMBIEN LUI RESTE-T-IL ? »', () => {
    // Rémy : « il a fait 4/9 du trajet, combien lui reste-t-il ? en expliquant
    // qu'on fait 1 − 4/9 = 9/9 − 4/9 = 5/9 ». C'est le cas le plus facile — un
    // seul dénominateur, aucun PPCM — et pourtant celui qui fait buter, parce
    // qu'il faut d'abord voir que le tout s'écrit en neuvièmes.
    const familles = [];
    for (let index = 0; index < 8; index++) {
        familles.push(tirer(fracProblemeGenerator, {}, index, index).meta.calcul.type || 'deux');
    }
    assert.deepEqual(familles.slice(0, 3), ['complement', 'complement', 'complement']);
    assert.ok(familles.slice(3).every(f => f === 'deux'), familles.join(','));

    for (let index = 0; index < 40; index++) {
        const item = tirer(fracProblemeGenerator, {}, `cp${index}`, index % 3);
        const c = item.meta.calcul;
        assert.equal(c.type, 'complement');
        // 1 = d/d, puis une soustraction de même dénominateur.
        assert.deepEqual(c.a, { n: 1, d: 1 });
        assert.equal(c.commun, c.b.d);
        assert.deepEqual(c.aReduit, { n: c.b.d, d: c.b.d });
        assert.equal(c.brut.n, c.b.d - c.b.n);
        assert.ok(c.brut.n > 0, 'un reste est toujours positif');
        assert.equal(pgcd(c.b.n, c.b.d), 1, `${c.b.n}/${c.b.d} se simplifie`);
        // L'énoncé écrit « 1 », pas « 1/1 », et la correction dit la règle.
        assert.ok(item.prompt.text.startsWith(item.meta.enonceTexte));
        assert.ok(/1 − /.test(item.prompt.text), item.prompt.text);
        assert.ok(/TOUTES les parts/.test(item.explanation), item.explanation);
        assert.ok(item.explanation.includes(`1 = ${c.commun}/${c.commun}`), item.explanation);
    }
    // Le professeur peut supprimer la phase, ou l'allonger.
    assert.notEqual(tirer(fracProblemeGenerator, { complements: 0 }, 'z', 0).meta.calcul.type,
        'complement');
    assert.equal(tirer(fracProblemeGenerator, { complements: 6 }, 'y', 5).meta.calcul.type,
        'complement');
});

test('AUCUN ÉNONCÉ NE DIT DE SOTTISE', () => {
    // « Malo doit parcourir 8/9 du trajet. Il en a déjà fait 5/9. » — Rémy :
    // « c'est idiot comme énoncé ». Un trajet, c'est le TOUT : on n'en « doit »
    // pas les huit neuvièmes. Et l'accord d'une fraction sujet dépend de son
    // numérateur (« 1/9 est semé », « 5/9 sont semés ») : les tournures qui
    // l'exigeraient sont bannies, on ne peut pas accorder sur un tirage.
    const vus = new Set();
    for (let index = 0; index < 300; index++) {
        const nu = tirer(fracProblemeGenerator, {}, `sot${index}`, index % 12).meta.enonceTexte;
        vus.add(nu.replace(/\d+\/\d+/g, '…'));
    }
    vus.forEach(modele => {
        assert.ok(!/doit parcourir/.test(modele), modele);
        // Une fraction ne commence jamais la phrase : c'est là que l'accord
        // devient impossible à écrire d'avance.
        assert.ok(!/^…/.test(modele), modele);
        assert.ok(!/… (du|de la|d'|de) [^.]* (sont|est) /.test(modele), modele);
    });
    assert.ok(vus.size >= 20, `seulement ${vus.size} tournures différentes`);
});

test('UN PROBLÈME EST UNE PHRASE, DEUX FRACTIONS ET UNE QUESTION', () => {
    // « Des énoncés très simples » : la lecture ne doit pas devenir l'exercice.
    for (let index = 0; index < 40; index++) {
        const item = tirer(fracProblemeGenerator, {}, `pb${index}`, index % 10);
        const c = item.meta.calcul;
        assert.ok(item.meta.enonce, 'pas d\'énoncé');
        const nu = item.meta.enonceTexte;
        assert.ok(nu.length < 160, `énoncé trop long : ${nu}`);
        assert.ok(nu.trim().endsWith('?'), `l'énoncé ne pose pas de question : ${nu}`);
        // Les fractions de l'énoncé sont bien celles du calcul.
        assert.ok(nu.includes(`${c.b.n}/${c.b.d}`), nu);
        if (c.type === 'complement') {
            assert.ok(!/(^|\D)1\/1(\D|$)/.test(nu), `l'entier s'écrit « 1 », pas « 1/1 » : ${nu}`);
        } else {
            assert.ok(nu.includes(`${c.a.n}/${c.a.d}`), nu);
            // Une soustraction ne se raconte pas comme une addition.
            assert.ok(/reste|retire|coupe|abîme|écoulé|en plus|verse/i.test(nu) === (c.signe === '−')
                || c.signe === '+', nu);
        }
    }
});

test('la difficulté annoncée suit la marche', () => {
    const vus = NIVEAUX_SOMME.map(({ id }) =>
        tirer(fracSommeProgressiveGenerator, { niveau: id }, id).difficulty);
    vus.forEach((d, i) => { if (i) assert.ok(d > vus[i - 1]); });
});

test('l\'aide de la marche ouvre la liste des indices', () => {
    NIVEAUX_SOMME.forEach(({ id, aide }) => {
        const item = tirer(fracSommeProgressiveGenerator, { niveau: id }, `a${id}`);
        assert.equal(item.hints[0], aide);
        assert.ok(item.hints.length >= 3);
    });
});

// --- Le catalogue ------------------------------------------------------------

test('les trois exercices sont au catalogue et branchés sur leur écran', () => {
    const egal = exercices.find(e => e.id === 'frac-egalite');
    const somme = exercices.find(e => e.id === 'frac-somme-posee');
    const pb = exercices.find(e => e.id === 'frac-probleme');
    assert.ok(egal && somme && pb);
    assert.equal(egal.generatorId, 'frac.egalite');
    assert.equal(egal.activityId, 'fraction-egalite');
    assert.equal(somme.generatorId, 'frac.somme-progressive');
    assert.equal(somme.activityId, 'fraction-somme');
    assert.equal(pb.generatorId, 'frac.probleme');
    assert.equal(pb.activityId, 'fraction-somme');
    // « Pas besoin de simplifier dans un premier temps » : c'est le défaut.
    assert.equal(somme.params.simplifier, 'non');
    assert.equal(pb.params.simplifier, 'non');
    // Les compétences citées existent : sans cela l'exercice ne remonte dans
    // aucun bilan.
    [...fracEgaliteGenerator.skills, ...fracSommeProgressiveGenerator.skills,
        ...fracProblemeGenerator.skills]
        .forEach(s => assert.ok(SKILLS[s], `compétence inconnue : ${s}`));
});

test('LES RÉGLAGES PAR DÉFAUT GARDENT LA BANDE DESSINABLE', () => {
    // À 9 × 12, une bande de 81 parts n'est plus qu'un aplat gris : l'image
    // qui devait tout expliquer n'explique plus rien. Le catalogue part donc
    // plus bas que le générateur ne l'autorise.
    const egal = exercices.find(e => e.id === 'frac-egalite');
    for (let i = 0; i < 80; i++) {
        const item = tirer(fracEgaliteGenerator, egal.params, `def${i}`);
        const e = item.meta.egalite;
        const fin = Math.max(e.gauche.d, e.droite.d);
        const unites = Math.max(1, Math.ceil(e.gauche.n / e.gauche.d));
        assert.ok(fin * unites <= 120, `${fin} parts × ${unites} unités, illisible`);
    }
});

// --- L'égalité : on compte d'abord, on multiplie ensuite ---------------------

test('LES PREMIÈRES QUESTIONS SE COMPTENT, LES SUIVANTES SE CALCULENT', () => {
    // Rémy : « l'élève aura juste à compter dans un premier temps (2-3
    // questions), et après tu les enlèves pour qu'il multiplie ».
    const modes = [];
    for (let index = 0; index < 8; index++) {
        modes.push(tirer(fracEgaliteGenerator, {}, index, index).meta.avecBandes);
    }
    assert.deepEqual(modes, [true, true, true, false, false, false, false, false]);
    // Le professeur peut allonger la phase du comptage, ou la supprimer.
    assert.equal(tirer(fracEgaliteGenerator, { bandes: 0 }, 'a', 0).meta.avecBandes, false);
    assert.equal(tirer(fracEgaliteGenerator, { bandes: 6 }, 'b', 5).meta.avecBandes, true);
});

test('UNE BANDE QU\'ON COMPTE RESTE COMPTABLE', () => {
    // Une fraction propre (donc une seule bande) et dix-huit parts au plus :
    // au-delà, sur un téléphone, chaque part fait dix pixels et l'on ne compte
    // plus, on devine.
    for (let index = 0; index < 60; index++) {
        const e = tirer(fracEgaliteGenerator, {}, `c${index}`, index % 3).meta.egalite;
        assert.ok(e.gauche.n < e.gauche.d, `${e.gauche.n}/${e.gauche.d} dépasse l'unité`);
        assert.ok(e.droite.n < e.droite.d);
        assert.ok(e.droite.d <= 18, `${e.droite.d} parts à compter, c'est trop`);
        assert.ok(e.gauche.d >= 3);
    }
});

test('la phase des flèches retrouve les grands nombres', () => {
    // C'est là que l'exercice devient un calcul : les réglages du professeur
    // reprennent la main.
    const vus = new Set();
    for (let index = 0; index < 60; index++) {
        const e = tirer(fracEgaliteGenerator, {}, `f${index}`, 5).meta.egalite;
        vus.add(e.facteur);
    }
    assert.ok(Math.max(...vus) > 3, 'le facteur reste plafonné à celui du comptage');
});

// --- Le dessin de l'indice ---------------------------------------------------
//
// Rémy, au banc iPhone : « l'indice est incompréhensible. Pourquoi ne pas avoir
// un petit schéma ? C'est quelque chose que nous n'avons pas mis dans les
// indices alors que c'est souvent plus parlant. »

test('le premier indice d\'un problème porte un schéma', () => {
    for (let i = 0; i < 20; i++) {
        const item = tirer(fracProblemeGenerator, { complements: 'oui' }, i, i);
        const s = (item.schemas || [])[0] || '';
        assert.ok(s.includes('<svg'), `pas de dessin pour ${item.prompt.text}`);
        // Autant de parts dessinées que le dénominateur commun l'exige.
        const c = item.meta.calcul;
        const parts = (s.match(/<rect/g) || []).length;
        const attendu = c.type === 'complement' ? c.commun : c.a.d + c.b.d;
        assert.equal(parts, attendu, `${item.prompt.text} : ${parts} parts au lieu de ${attendu}`);
        // Et une légende qui dit ce qu'on regarde.
        assert.ok(s.includes('fs-legende'));
    }
});

test('le schéma ne sort que là où il aide', () => {
    // Le calcul posé n'en a pas : la scène EST déjà le schéma.
    const pose = tirer(fracSommeProgressiveGenerator, {}, 3);
    assert.ok((pose.schemas || []).length <= 1);
    // L'égalité à compléter non plus : elle a ses bandes.
    const eg = tirer(fracEgaliteGenerator, {}, 3);
    assert.deepEqual(eg.schemas || [], []);
});
