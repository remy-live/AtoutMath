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
import * as fx from '../js/core/maths/formule.js';

const { rac, racineDe, txt, facteurs } = POUR_ESSAI;

// ── L'ANALYSEUR INDÉPENDANT ─────────────────────────────────────────────────
// Il ne connaît que les quatre formes que les huit barreaux produisent, et il
// ne sait rien faire d'autre que `Math.sqrt`.

function evalTexte(t) {
    const s = String(t).replace(/−/g, '-').replace(/\s+/g, ' ').trim();

    const m0 = s.match(/^√\((\d+) \+ (\d+)\)$/);
    if (m0) return Math.sqrt(Number(m0[1]) + Number(m0[2]));

    const terme = (x) => {
        // Le bas d'une fraction n'est plus forcément un entier : depuis que le
        // barreau 8 pose « 3/√7 » sous forme de fraction — c'est ainsi qu'on
        // l'écrit au lycée, et c'est ce qui montre qu'il y a une racine EN BAS,
        // tout l'objet du barreau — le dénominateur peut être un radical.
        const q = x.match(/^\(?(.+?)\)?\/(.+)$/);
        if (q) return terme(q[1]) / terme(q[2]);
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

/**
 * CE QUE VAUT UNE PROPOSITION, LU SUR SON TEXTE ET NON SUR SON BALISAGE.
 *
 * L'ancienne version dépouillait le HTML du libellé. Elle a cessé de mesurer
 * quoi que ce soit le jour où le radical est devenu un DESSIN : « √45 » et
 * « 4√5 », débarrassés de leurs balises, donnent tous les deux « 45 ». Le test
 * « l'énoncé n'écrit jamais la réponse » a signalé cette collision comme une
 * faute du générateur, et le test des doublons aurait fini par confondre
 * « 2√2 » avec « 22 ».
 *
 * Chaque proposition porte maintenant son `texte`, issu du même arbre que son
 * libellé. C'est ce champ que la fiche papier imprime ; c'est donc aussi le
 * bon champ à mesurer — on lit ce que l'élève lit.
 */
const etiquette = (c) => String(c && c.texte != null ? c.texte : c).replace(/\s+/g, '');

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
        const vues = item.choices.map(c => etiquette(c));
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
            const v = evalTexte(etiquette(c));
            if (Math.abs(v - juste) < 1e-9) {
                assert.match(c.why || '', /pas FINI/,
                    `[${b}#${i}] ${item.prompt.text} : le leurre ${etiquette(c)} `
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
                `[${b}#${i}] leurre sans explication : ${etiquette(c)}`);
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
        const rep = etiquette(item.choices.find(c => c.correct));
        if (rep.length < 2) return;   // un chiffre isolé est dans toute décomposition
        // ON COMPARE DEUX TEXTES, et non deux balisages dépouillés. Depuis que
        // le radical est dessiné, « √45 » et « 4√5 » se ressemblent une fois
        // les balises retirées : tous deux donnent « 45 ». La comparaison
        // partait alors en fausse alerte sur « 3√45 − √125 », dont la réponse
        // est 4√5. Les formes écrites, elles, gardent leur √ et ne se
        // confondent pas.
        const vu = ' ' + item.prompt.text.replace('Simplifie : ', '')
            + ' ' + (item.schemas[0] || '') + ' ';
        const motif = new RegExp('(^|[^0-9√])'
            + rep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^0-9]|$)');
        assert.ok(!motif.test(vu),
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
test('l\'énoncé de l\'écran et celui du papier sont la MÊME formule', () => {
    balayer((item, b, i) => {
        // L'ALLER-RETOUR, ET NON UNE COMPARAISON DE CHAÎNES.
        //
        // La première version comparait le balisage dépouillé au texte. Elle
        // ne pouvait plus fonctionner dès que les symboles sont devenus des
        // dessins : « √4 » dépouillé de ses balises ne donne plus que « 4 ».
        //
        // On vérifie donc la propriété qui compte vraiment : le texte de la
        // fiche, RELU par l'analyseur, redonne exactement le dessin de
        // l'écran. C'est plus fort qu'une égalité de chaînes — cela prouve que
        // les deux sorties portent la même formule, et que le texte est une
        // écriture fidèle, pas une approximation.
        const papier = item.prompt.text.replace('Simplifie : ', '');
        const relu = fx.formule(papier);
        assert.ok(item.prompt.html.includes(relu),
            `[${b}#${i}] le texte « ${papier} », relu, ne redonne pas le dessin `
            + `de l'écran.`);
    });
});

// LA BARRE DU RADICAL EST DESSINÉE, ET CE N'EST PAS DE L'ORNEMENT.
// Sans elle, « √9 + 16 » ne dit pas si la barre couvre le 9 ou toute la somme —
// c'est-à-dire que le barreau 7 n'a plus d'énoncé.
test('le radical porte toujours sa barre', () => {
    balayer((item, b, i) => {
        // `fx-sous` porte la barre, `fx-crochet` le crochet : les deux doivent
        // être là, car ce sont eux qui disent CE QUI EST SOUS LA RACINE.
        assert.match(item.prompt.html, /fx-sous/,
            `[${b}#${i}] ${item.prompt.text} : radical sans barre`);
        assert.match(item.prompt.html, /fx-crochet/,
            `[${b}#${i}] ${item.prompt.text} : radical sans crochet`);
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
        const propose = item.choices.some(c => etiquette(c) === String(faux));
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

test('les dix exercices de Seconde existent et pointent le bon générateur', () => {
    const miens = secondeExercises.filter(e => e.generatorId === 'nb.racines');
    assert.equal(miens.length, 10, 'huit barreaux, une révision, un pas à pas');
    const barreaux = miens.map(e => e.params.barreau).sort();
    assert.deepEqual(barreaux,
        ['1', '2', '3', '4', '5', '6', '7', '8', 'revision', 'toutes'].sort());
    // LE PAS À PAS EST UNE CARTE PRÊTE — Rémy : « c'est génial ton idée de
    // carte "pas à pas" prête ». Elle couvre TOUS les barreaux : le découpage
    // vaut pour les sept qui ont plus d'un geste, et le premier se tape.
    const pas = miens.find(e => e.id === 'rc-pas');
    assert.ok(pas, 'la carte « Racines carrées pas à pas » a disparu');
    assert.equal(pas.params.etapes, 'oui');
    assert.equal(pas.params.barreau, 'toutes');
    for (const e of miens) {
        assert.ok(e.instruction && e.instruction.length >= 10,
            `${e.id} : consigne trop courte`);
        assert.ok(e.id.startsWith('rc-'), `${e.id} : identifiant hors chapitre`);
    }
});

// ── CE QUE LA FICHE PAPIER IMPRIME ──────────────────────────────────────────
//
// MESURÉ, ET C'ÉTAIT INUTILISABLE : la feuille de ce chapitre imprimait
// « faux0 · ok · faux1 · faux2 » à la place des quatre propositions.
//
// `js/ui/printQuestions.js` écrit le champ `texte` d'une proposition s'il
// existe ; sinon son libellé, mais SEULEMENT s'il ne contient aucune balise —
// et le nôtre en contient toujours, puisqu'un radical est dessiné. Restait la
// `value`, qui est une clef interne. Rien à l'écran ne pouvait le laisser
// voir : il fallait imprimer.
test('la fiche papier imprime les propositions, et non leurs clefs internes', () => {
    // LA MÊME RÈGLE QUE js/ui/printQuestions.js, recopiée ici pour que le test
    // mesure ce que fait l'impression et non ce que j'en suppose.
    const imprime = (c) => {
        if (c.texte) return String(c.texte);
        const brut = String(c.label ?? c.value ?? '');
        return /[<>]/.test(brut) ? String(c.value ?? '') : brut;
    };
    balayer((item, b, i) => {
        for (const c of item.choices) {
            const sortie = imprime(c);
            assert.ok(!/^(ok|faux\d+)$/.test(sortie),
                `[${b}#${i}] la feuille imprimerait « ${sortie} » au lieu d'une réponse.`);
            assert.ok(!/[<>]/.test(sortie),
                `[${b}#${i}] du balisage part sur la feuille : ${sortie}`);
        }
    });
});

// ── LE PAS À PAS DES RACINES ────────────────────────────────────────────────
//
// RÉMY, capture de 3√80 − 2√125 à l'appui, puis « oui fais les ».
//
// C'est le chapitre où le découpage paie le plus : qui rate 3√80 − 2√125 n'a
// presque jamais raté l'addition, il a raté la SIMPLIFICATION deux lignes plus
// haut — et un « faux » sur la réponse entière ne le dit pas.
//
// LE JUGE COMPARE DES VALEURS EXACTES, jamais des flottants : √2 × √2 vaut 2,
// et le calcul en virgule flottante rend 2.0000000000000004.

test('CHAQUE LIGNE DE LA CHAÎNE VAUT L\'ÉNONCÉ, ET SE JUGE', async () => {
    const { lireExacte, memeR } = await import('../js/core/maths/valeurExacte.js');
    const fx = await import('../js/core/maths/formule.js');
    const { BARREAUX } = POUR_ESSAI;
    let lignesVues = 0;
    for (const r of Object.keys(BARREAUX)) {
        for (let i = 0; i < 60; i++) {
            const it = racinesGenerator.generate({ barreau: r, etapes: 'oui' },
                { rng: makeRng(`chaine_${r}_${i}`) });
            // Le pas à pas ouvre TOUJOURS le clavier, même sur un barreau d'un
            // seul geste : retomber sur un QCM au milieu d'un exercice qui
            // s'appelle « pas à pas » ferait croire qu'on a changé d'exercice.
            assert.equal(it.meta.saisieSeule, true, `[b${r}] le clavier ne prend pas la main`);
            const etapes = it.meta.etapes || [];
            if (!etapes.length) continue;
            const attendu = lireExacte(it.reponsePapier, fx);
            assert.ok(attendu, `[b${r}] réponse illisible : ${it.reponsePapier}`);
            for (const e of etapes) {
                lignesVues += 1;
                // UNE CHAÎNE EST UNE CHAÎNE : chaque ligne vaut la réponse.
                const ligne = lireExacte(e.montrer, fx);
                assert.ok(ligne, `[b${r}] « ${e.montrer} » ne se lit pas`);
                assert.ok(memeR(ligne, attendu),
                    `[b${r}] « ${e.montrer} » ne vaut pas « ${it.reponsePapier} »`);
                // Et elle est acceptée à sa propre étape…
                assert.ok(e.verifie(e.montrer.replace(/\s+/g, '')).juste,
                    `[b${r}] « ${e.montrer} » refusée à son étape « ${e.titre} »`);
                // …tandis que la réponse finale n'y passe PAS. Les deux sont
                // égales : sans exigence de forme, l'étape serait sautable,
                // c'est-à-dire inexistante.
                const v = e.verifie(it.reponsePapier.replace(/\s+/g, ''));
                assert.ok(v && !v.juste,
                    `[b${r}] la réponse « ${it.reponsePapier} » passe à l'étape `
                    + `« ${e.titre} » : l'étape ne sert à rien`);
                assert.ok(e.modele && /[□…]/.test(e.modele),
                    `[b${r}] l'étape « ${e.titre} » n'a pas de moule`);
            }
        }
    }
    assert.ok(lignesVues > 400, `seulement ${lignesVues} lignes jugées`);
});

test('LE PAVÉ SAIT TAPER CHAQUE LIGNE, ET NE MONTRE RIEN D\'INUTILE', () => {
    const { BARREAUX } = POUR_ESSAI;
    for (const r of Object.keys(BARREAUX)) {
        for (let i = 0; i < 40; i++) {
            const it = racinesGenerator.generate({ barreau: r, etapes: 'oui' },
                { rng: makeRng(`pave_${r}_${i}`) });
            const m = it.meta;
            // PAS DE LETTRE, PAS DE CARRÉ : « √5² » est précisément la faute
            // qu'on éviterait de rendre tapable.
            assert.equal(m.lettre, null, `[b${r}] le pavé offre une lettre`);
            assert.equal(m.carre, false, `[b${r}] le pavé offre la touche ²`);
            assert.equal(m.racine, true, `[b${r}] le pavé n'offre pas la racine`);
            // ET CHAQUE LIGNE SE TAPE. C'est le test qui a manqué une fois,
            // sur le « ² » du barreau 3 de la factorisation : la première
            // ligne de l'exercice était intapable et rien ne le disait.
            const touches = ['√', '+', '−'];
            if (m.multiplication) touches.push('×');
            if (m.parentheses) touches.push('(', ')');
            if (m.fraction) touches.push('/');
            touches.push(...'0123456789'.split(''));
            for (const e of [...(m.etapes || []), { montrer: it.reponsePapier }]) {
                const manque = new Set();
                for (const c of String(e.montrer).replace(/\s+/g, '')) {
                    if (!touches.includes(c)) manque.add(c);
                }
                assert.deepEqual([...manque], [],
                    `[b${r}] « ${e.montrer} » demande ${[...manque].join(' ')}, `
                    + 'que le pavé n\'a pas');
            }
        }
    }
});

test('LE JUGE DE LA RÉPONSE REFUSE CE QUI N\'EST PAS SIMPLIFIÉ', () => {
    const { BARREAUX, txt, rac } = POUR_ESSAI;
    let vus = 0;
    for (const r of Object.keys(BARREAUX)) {
        for (let i = 0; i < 40; i++) {
            const it = racinesGenerator.generate({ barreau: r },
                { rng: makeRng(`juge_${r}_${i}`) });
            assert.equal(it.verifieTexte(it.reponsePapier).juste, true,
                `[b${r}] « ${it.reponsePapier} » refusée`);
            // LA MÊME VALEUR, ÉCRITE SANS SORTIR LE CARRÉ : c'est égal, et ce
            // n'est pas fini. On le dit, et cela ne coûte pas de vie —
            // « commencé n'est pas raté », la règle posée pour la
            // factorisation.
            const v = it.meta && it.meta.valeurPourEssai;
            void v;
            const brut = `√${4 * 4}`;   // 4 est un carré : √16 n'est jamais simplifié
            const verdict = it.verifieTexte(brut);
            if (txt(rac(4, 1, 1)) === it.reponsePapier) {
                vus += 1;
                assert.equal(verdict.juste, false, 'une écriture non simplifiée passe');
                assert.equal(verdict.inacheve, true,
                    '« √16 » pour 4 est compté FAUX : c\'est égal, et pas fini');
            }
        }
    }
    assert.ok(vus > 0, 'aucune écriture non simplifiée mesurée');
});
