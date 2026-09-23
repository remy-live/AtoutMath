// LES RACINES CARRÉES — le chapitre vérifié par un AUTRE chemin que le sien.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE PRINCIPE DE CE FICHIER, ET IL VAUT POUR LES TROIS CHAPITRES DE SECONDE.
//
// Le générateur calcule en exact, sous la forme (n/d)√r. Un test qui relirait
// cette même arithmétique ne prouverait rien : il redirait ce que le générateur
// dit déjà. On relit donc l'ÉNONCÉ AFFICHÉ — la chaîne que l'élève a sous les
// yeux — et on la recalcule en nombres à virgule avec un analyseur écrit ici,
// qui ne partage aucune ligne avec `racines.js`. Deux chemins d'accord sur des
// milliers de questions, c'est une preuve ; un chemin seul, c'est une opinion.
//
// C'est cette méthode qui a trouvé douze faux leurres au chapitre de la
// factorisation et huit questions à une seule proposition à celui des
// fractions. Ici elle a trouvé, dans l'ordre :
//
//   · le barreau 4 qui, au-delà de 900, se rappelait lui-même avec un tirage
//     truqué et rendait TOUJOURS √8 — c'est-à-dire la question du barreau 3,
//     avec un leurre « 2√2 » qui se trouvait être la bonne réponse ;
//   · « √49 × √49 » et « 3 ÷ √3 », dont la réponse est recopiée de l'énoncé ;
//   · le dessin de l'énoncé qui écrivait la réponse — « 121 = 11 × 11 » sous
//     « √121 », six cent six fois sur trente mille.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { racinesGenerator, POUR_ESSAI } from '../js/core/generators/racines.js';
import { SKILLS } from '../js/data/skills.js';
import { secondeExercises } from '../js/data/seconde.js';

const { rac, racineDe, txt, facteurs } = POUR_ESSAI;

// ── L'ANALYSEUR INDÉPENDANT ─────────────────────────────────────────────────
// Il ne connaît que les quatre formes que les huit barreaux produisent, et il
// ne sait rien faire d'autre que `Math.sqrt`.

function evalTexte(t) {
    const s = String(t).replace(/−/g, '-').replace(/\s+/g, ' ').trim();

    const m0 = s.match(/^√\((\d+) \+ (\d+)\)$/);
    if (m0) return Math.sqrt(Number(m0[1]) + Number(m0[2]));

    const terme = (x) => {
        const q = x.match(/^\(?(.+?)\)?\/(\d+)$/);
        if (q) return terme(q[1]) / Number(q[2]);
        const a = x.match(/^(-?\d*)√(\d+)$/);
        if (a) {
            const k = a[1] === '' ? 1 : (a[1] === '-' ? -1 : Number(a[1]));
            return k * Math.sqrt(Number(a[2]));
        }
        if (/^-?\d+$/.test(x)) return Number(x);
        throw new Error('terme illisible : ' + x);
    };

    const m = s.match(/^(\S+) ([×+\-÷]) (\S+)$/);
    if (m) {
        const g = terme(m[1]), d = terme(m[3]);
        return m[2] === '×' ? g * d : m[2] === '+' ? g + d
            : m[2] === '-' ? g - d : g / d;
    }
    return terme(s);
}

/** Ce que l'élève lit sur un bouton, une fois le balisage retiré. */
const etiquette = (h) => String(h)
    .replace(/<span class="fraction-den">/g, '/')
    .replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim();

/** Le texte de l'énoncé, séparateurs CONSERVÉS — voir le test du bas. */
const enonceLisible = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const BARREAUX = ['1', '2', '3', '4', '5', '6', '7', '8', 'revision', 'toutes'];
const PAR_BARREAU = 150;

function balayer(faire) {
    for (const b of BARREAUX) {
        for (let i = 0; i < PAR_BARREAU; i++) {
            const rng = makeRng(`racines-${b}-${i}`);
            faire(racinesGenerator.generate({ barreau: b }, { rng }), b, i);
        }
    }
}

// ── LA FORME (n/d)√r ────────────────────────────────────────────────────────

test('rac() rend toujours une forme RÉDUITE : plus aucun carré dedans', () => {
    for (let r = 1; r <= 400; r++) {
        const v = rac(1, 1, r);
        const f = facteurs(v.r);
        for (let i = 0; i + 1 < f.length; i++) {
            assert.notEqual(f[i], f[i + 1],
                `√${r} donne ${txt(v)}, où ${v.r} contient encore ${f[i]}².`);
        }
        assert.ok(Math.abs(v.n / v.d * Math.sqrt(v.r) - Math.sqrt(r)) < 1e-9,
            `√${r} ne vaut pas ${txt(v)}.`);
    }
});

test('rac() refuse ce qui n\'existe pas plutôt que de rendre un nombre faux', () => {
    assert.equal(rac(1, 0, 4), null, 'un dénominateur nul');
    assert.equal(rac(1, 1, 0), null, 'une racine de zéro n\'est pas un radicande');
    assert.equal(rac(1, 1, -4), null, 'un radicande négatif');
    assert.equal(rac(1, 1, 2.5), null, 'un radicande non entier');
});

// ── LE CŒUR : L'ÉNONCÉ ET LA RÉPONSE DISENT-ILS LA MÊME CHOSE ? ─────────────

test('chaque énoncé vaut exactement ce que sa réponse annonce', () => {
    let n = 0;
    balayer((item, b, i) => {
        const attendu = evalTexte(item.prompt.text.replace('Simplifie : ', ''));
        // `explanation` s'ouvre sur « <énoncé> = <réponse>. … »
        const ecrit = item.explanation.split(' = ')[1].split('.')[0];
        const obtenu = evalTexte(ecrit);
        assert.ok(Math.abs(attendu - obtenu) < 1e-9,
            `[${b}#${i}] ${item.prompt.text} vaut ${attendu}, la réponse dit ${obtenu} (${ecrit}).`);
        n++;
    });
    assert.ok(n >= 1500, `seulement ${n} questions vérifiées`);
});

test('quatre propositions, une seule juste, aucune écrite deux fois', () => {
    balayer((item, b, i) => {
        assert.equal(item.choices.length, 4,
            `[${b}#${i}] ${item.choices.length} propositions pour ${item.prompt.text}`);
        assert.equal(item.choices.filter(c => c.correct).length, 1,
            `[${b}#${i}] pas exactement une bonne réponse`);
        const vues = item.choices.map(c => etiquette(c.label));
        assert.equal(new Set(vues).size, 4,
            `[${b}#${i}] deux propositions identiques : ${vues.join(' | ')}`);
    });
});

// LE TEST QUI A TROUVÉ LE PLUS DE FAUTES, DANS LES TROIS CHAPITRES.
//
// Un leurre qui VAUT la bonne réponse est une seconde bonne réponse marquée
// fausse : l'élève qui a juste est compté faux, et la correction lui explique
// une erreur qu'il n'a pas commise. La seule exception est voulue et porte sa
// marque — la forme à moitié simplifiée du barreau 4, celle de la photo : 3√8
// est exact et n'est pas fini, et c'est tout l'enseignement du barreau.
test('aucun leurre ne vaut la bonne réponse, sauf celui « pas FINI » du barreau 4', () => {
    let demiFormes = 0;
    balayer((item, b, i) => {
        const juste = evalTexte(item.prompt.text.replace('Simplifie : ', ''));
        for (const c of item.choices) {
            if (c.correct) continue;
            const v = evalTexte(etiquette(c.label));
            if (Math.abs(v - juste) < 1e-9) {
                assert.match(c.why || '', /pas FINI/,
                    `[${b}#${i}] ${item.prompt.text} : le leurre ${etiquette(c.label)} `
                    + `vaut la bonne réponse sans être la forme inachevée.`);
                assert.equal(item.meta.barreau, 4,
                    `[${b}#${i}] la forme inachevée hors du barreau 4`);
                demiFormes++;
            }
        }
    });
    assert.ok(demiFormes > 0, 'la forme inachevée du barreau 4 n\'est jamais proposée');
});

test('chaque leurre dit POURQUOI il est faux', () => {
    balayer((item, b, i) => {
        for (const c of item.choices) {
            if (c.correct) continue;
            assert.ok(c.why && c.why.length >= 12,
                `[${b}#${i}] leurre sans explication : ${etiquette(c.label)}`);
        }
    });
});

// ── CE QUE L'ÉNONCÉ NE DOIT PAS DIRE ────────────────────────────────────────

// LE DESSIN DE L'ÉNONCÉ MONTRE LA MATIÈRE, CELUI DE L'INDICE MONTRE LA MÉTHODE.
//
// Les deux étaient le même au premier jet — `pairesHtml`, qui va jusqu'au bout.
// Posé dans l'énoncé, il écrivait « 12 = 2 × 2 × 3 », « 2 × 2 → 2 », « 3 reste
// dedans » sous un √12 dont la réponse est 2√3 : il ne restait rien à chercher.
// Même faute au barreau 1, où la décomposition d'un carré de nombre premier EST
// la réponse. C'est la règle déjà tenue au chapitre de la factorisation, où le
// dessin de l'énoncé montre les rôles et non le résultat.
test('l\'énoncé n\'écrit jamais la réponse', () => {
    balayer((item, b, i) => {
        const rep = etiquette(item.choices.find(c => c.correct).label);
        if (rep.length < 2) return;   // un chiffre isolé est dans toute décomposition
        const texte = ' ' + enonceLisible(item.prompt.html) + ' ';
        const motif = new RegExp('(^|[^0-9√])'
            + rep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^0-9]|$)');
        assert.ok(!motif.test(texte),
            `[${b}#${i}] ${item.prompt.text} : la réponse « ${rep} » est déjà écrite `
            + `dans l'énoncé.`);
    });
});

test('chaque question porte ses deux dessins, et ils diffèrent', () => {
    balayer((item, b, i) => {
        assert.match(item.prompt.html, /rc-matiere|rc-carre|rc-barre/,
            `[${b}#${i}] énoncé sans support visuel`);
        assert.ok(item.schemas[1] && item.schemas[1].includes('rc-paires'),
            `[${b}#${i}] indice sans dessin de méthode`);
        assert.notEqual(item.prompt.html, item.schemas[1]);
        assert.ok(!item.prompt.html.includes('rc-paires'),
            `[${b}#${i}] le dessin de la MÉTHODE s'est glissé dans l'énoncé`);
    });
});

// L'ÉCRAN ET LA FICHE PAPIER POSENT LA MÊME QUESTION.
//
// CE TEST EXISTE PARCE QUE L'ÉCRAN A MONTRÉ CE QUE LE BALAYAGE NE POUVAIT PAS
// DIRE. Trente mille questions vérifiées, aucune alerte — puis une capture du
// barreau 8 affichait « 5√3 ÷ √3 » pendant que `prompt.text`, celui de la
// fiche et de la lecture à voix haute, disait « √75 ÷ √3 ». La cause : `rac`
// SIMPLIFIE tout ce qu'elle construit, si bien que `html(racineDe(75))` rendait
// la forme réduite. L'élève sur écran recevait une question déjà à moitié
// faite, et son voisin sur papier l'autre.
//
// Aucun contrôle de valeur ne pouvait voir cela : les deux énoncés valent le
// même nombre. C'est leur ÉCRITURE qui diffère, et l'écriture est tout le
// sujet du chapitre.
test('l\'énoncé de l\'écran est le même que celui de la fiche papier', () => {
    balayer((item, b, i) => {
        const ecran = (item.prompt.html.match(/rc-expression">([\s\S]*?)<\/div>/) || [])[1];
        assert.ok(ecran !== undefined, `[${b}#${i}] expression introuvable`);
        const nu = (x) => String(x).replace(/<[^>]+>/g, '').replace(/\s+/g, '');
        const papier = item.prompt.text.replace('Simplifie : ', '')
            .replace(/[()]/g, '').replace(/\s+/g, '');
        // Le seul écart admis : une division écrite en fraction à l'écran et
        // avec ÷ au texte — c'est la même opération, pas une simplification.
        const memeQuestion = nu(ecran) === papier
            || nu(ecran) === papier.replace('÷', '');
        assert.ok(memeQuestion,
            `[${b}#${i}] l'écran affiche « ${nu(ecran)} » et le papier « ${papier} ».`);
    });
});

// LA BARRE DU RADICAL EST DESSINÉE, ET CE N'EST PAS DE L'ORNEMENT.
// Sans elle, « √9 + 16 » ne dit pas si la barre couvre le 9 ou toute la somme —
// c'est-à-dire que le barreau 7 n'a plus d'énoncé.
test('le radical porte toujours sa barre', () => {
    balayer((item, b, i) => {
        assert.match(item.prompt.html, /rc-sous/,
            `[${b}#${i}] ${item.prompt.text} : radical sans barre`);
    });
});

// ── LES BARREAUX TIENNENT CHACUN LEUR PROMESSE ──────────────────────────────

test('le barreau 4 demande VRAIMENT plus que le barreau 3 : deux carrés, pas un', () => {
    for (let i = 0; i < 400; i++) {
        const item = racinesGenerator.generate({ barreau: '4' },
            { rng: makeRng(`b4-${i}`) });
        const n = Number(item.prompt.text.match(/√(\d+)/)[1]);
        const v = racineDe(n);
        assert.ok(v.r > 1, `√${n} est un carré parfait : c'est le barreau 1`);
        assert.ok(facteurs(v.n).length >= 2,
            `√${n} = ${txt(v)} ne sort qu'un seul facteur : c'est le barreau 3`);
    }
});

test('le barreau 7 propose TOUJOURS le piège qu\'il enseigne', () => {
    for (let i = 0; i < 300; i++) {
        const item = racinesGenerator.generate({ barreau: '7' },
            { rng: makeRng(`b7-${i}`) });
        const [, a, b] = item.prompt.text.match(/√\((\d+) \+ (\d+)\)/);
        const faux = Math.sqrt(Number(a)) + Math.sqrt(Number(b));
        assert.ok(Number.isInteger(faux),
            `√(${a} + ${b}) : √a + √b n'est pas entier, le leurre du piège disparaît`);
        const propose = item.choices.some(c => etiquette(c.label) === String(faux));
        assert.ok(propose,
            `√(${a} + ${b}) : le leurre ${faux} — c'est-à-dire √a + √b — n'est pas proposé`);
    }
});

// ── LE CHAPITRE EST BRANCHÉ ─────────────────────────────────────────────────

test('les deux compétences existent, et leurs prérequis aussi', () => {
    for (const id of racinesGenerator.skills) {
        assert.ok(SKILLS[id], `la compétence ${id} n'est pas déclarée`);
        // UN PRÉREQUIS FANTÔME NE LÈVE AUCUNE ERREUR : il rend seulement la
        // remédiation muette, c'est-à-dire qu'un élève en difficulté ne se voit
        // jamais proposer ce qui lui manque. Quatre ont déjà été écrits de bonne
        // foi dans ce projet. On vérifie.
        for (const p of SKILLS[id].prereqs || []) {
            assert.ok(SKILLS[p], `${id} réclame ${p}, qui n'existe pas`);
        }
    }
    assert.deepEqual(SKILLS['nb.racines.simplifier'].prereqs,
        ['num.arith.decomposition'],
        'le prérequis de la simplification EST la décomposition en facteurs premiers');
});

test('les neuf exercices de Seconde existent et pointent le bon générateur', () => {
    const miens = secondeExercises.filter(e => e.generatorId === 'nb.racines');
    assert.equal(miens.length, 9, 'huit barreaux et une révision');
    const barreaux = miens.map(e => e.params.barreau).sort();
    assert.deepEqual(barreaux,
        ['1', '2', '3', '4', '5', '6', '7', '8', 'revision'].sort());
    for (const e of miens) {
        assert.ok(e.instruction && e.instruction.length >= 10,
            `${e.id} : consigne trop courte`);
        assert.ok(e.id.startsWith('rc-'), `${e.id} : identifiant hors chapitre`);
    }
});

// ── LE PIÈGE DE MA PROPRE SONDE, GARDÉ ICI POUR MÉMOIRE ─────────────────────
//
// La première version du test « l'énoncé n'écrit jamais la réponse » écrasait
// les espaces avant de chercher. « … × 3 » suivi de « 6 = … » devenait alors
// « ×36= », et le test signalait un « 36 » qui n'est écrit nulle part à
// l'écran : dix fausses alertes sur trente mille questions. UNE MESURE QUI
// N'EMPRUNTE PAS LE CHEMIN DE L'UTILISATEUR NE MESURE PAS SON PROBLÈME — et
// l'utilisateur, lui, voit les espaces.
test('enonceLisible garde les séparateurs entre deux éléments voisins', () => {
    const h = '<span>2√6 × 3</span><span>6 = 2 × 3</span>';
    assert.ok(!enonceLisible(h).includes('36'),
        'deux nombres voisins se sont soudés en un troisième qui n\'existe pas');
    assert.ok(etiquette('<span>2√6</span>').includes('2√6'));
});
