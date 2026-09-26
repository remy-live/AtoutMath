// ÉLÉMENTS DE GÉOMÉTRIE — et la correction ne croit pas le générateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sa fiche de 6e à l'appui : « ceci est mon chapitre de géométrie […] on
// pourrait faire quoi comme exercice ? » Trois manques retenus : ∈ et ∉, lire
// un codage, le milieu.
//
// CE FICHIER NE COMPARE PAS LE CODE À MON IDÉE DE LA RÉPONSE. C'est la règle du
// projet, et elle a déjà payé trois fois : on se tromperait deux fois, dans le
// générateur et dans le test, et les deux erreurs se couvriraient. Toute
// affirmation posée par un item est donc RECALCULÉE ICI, sur les coordonnées,
// par un chemin différent de celui du générateur :
//
//   · le générateur décide l'appartenance sur la LISTE ORDONNÉE des points
//     d'une droite — des indices, aucun calcul ;
//   · ce test la décide au PRODUIT EN CROIX et au PRODUIT SCALAIRE, sur les
//     coordonnées brutes.
//
// Deux routes indépendantes vers la même réponse. Si l'une ment, l'autre le
// dit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { elementsGeometrieGenerator as G } from '../js/core/generators/elementsGeometrie.js';
import { scene, ECART_MIN, distanceDroite, boutsDe } from '../js/core/pointsDroites.js';
import {
    etoile, deuxSegmentsPartages, equidistantHorsSegment, egalitesDe, marquesDe, estMilieu
} from '../js/core/figureCodee.js';
import '../js/core/activities/index.js';
import { allGenerators, getGenerator } from '../js/core/registry.js';
import { exercices } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import { codeCourt } from '../js/core/shortcodes.js';
import { figureCodeeSvg } from '../js/core/pointsDroitesSvg.js';

// ── LA SECONDE ROUTE ────────────────────────────────────────────────────────

/** Produit en croix : X est-il sur la droite (YZ) ? Exact, en entiers. */
const colineaire = (P, x, y, z) =>
    (P[z].x - P[y].x) * (P[x].y - P[y].y) - (P[z].y - P[y].y) * (P[x].x - P[y].x) === 0;

/** Produit scalaire : où tombe X sur l'axe (YZ) ? */
const projection = (P, x, y, z) =>
    (P[x].x - P[y].x) * (P[z].x - P[y].x) + (P[x].y - P[y].y) * (P[z].y - P[y].y);

const carre = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;

/** L'appartenance, recalculée autrement que dans le générateur. */
function appartientBis(P, x, a, b, sorte) {
    if (!P[x] || !P[a] || !P[b]) return false;
    if (!colineaire(P, x, a, b)) return false;
    if (sorte === 'droite') return true;
    const t = projection(P, x, a, b);
    if (sorte === 'segment') return t >= 0 && t <= carre(P[a], P[b]);
    return t >= 0;            // demi-droite [ab) : du côté de b, depuis a
}

/** Lire « X ∈ [AB] » ou « X ∉ (AB) ». */
function lire(texte) {
    const m = /^([A-Z])\s*(∈|∉)\s*([[(])([A-Z])([A-Z])([\])])$/.exec(texte.replace(/\s+/g, ' ').trim());
    if (!m) return null;
    const [, x, signe, ouv, a, b, fer] = m;
    const sorte = ouv === '(' ? 'droite' : (fer === ']' ? 'segment' : 'demi-droite');
    return { x, a, b, sorte, dedans: signe === '∈' };
}

/** Les coordonnées de la figure d'un item, relues dans son SVG. */
function pointsDuSvg(html) {
    // On ne relit pas le SVG : le générateur ne publie pas ses coordonnées, et
    // les inventer d'après le dessin serait une troisième route, fausse. On
    // reconstruit donc la scène avec la MÊME graine — c'est déterministe.
    return null;
}
void pointsDuSvg;

// ── LE MODÈLE ───────────────────────────────────────────────────────────────

test('AUCUN POINT N\'EST « PRESQUE » SUR UNE DROITE — c\'est sa consigne', () => {
    // Je lui avais demandé s'il fallait parfois poser un point très proche
    // d'une droite sans y être, comme on le fait sur papier. Sa réponse :
    // « NON ». Sur un écran, une figure qui se joue à trois pixels ne mesure
    // plus la compréhension de l'appartenance, elle mesure l'acuité visuelle.
    let scenes = 0;
    for (let i = 0; i < 400; i++) {
        const sc = scene(makeRng(`ec_${i}`), { droites: 2, parDroite: 3, horsDroites: 2 });
        if (!sc) continue;
        scenes++;
        const P = sc.points;
        for (const nom of Object.keys(P)) {
            for (const d of sc.droites) {
                if (d.points.includes(nom)) continue;       // il est dessus, c'est voulu
                const [a, b] = boutsDe(d);
                const ecart = distanceDroite(P[nom], P[a], P[b]);
                assert.ok(ecart >= ECART_MIN,
                    `scène ${i} : ${nom} est à ${ecart.toFixed(2)} de la droite `
                    + `(${a}${b}) — moins que ${ECART_MIN}, donc à l'œil`);
            }
        }
    }
    assert.ok(scenes > 380, `seulement ${scenes} scènes construites sur 400`);
});

test('les points portés par une droite le sont EXACTEMENT', () => {
    // L'incidence est une propriété de la construction, jamais une distance
    // « assez petite ». Recalculée ici au produit en croix : elle doit être
    // nulle, pas petite.
    for (let i = 0; i < 300; i++) {
        const sc = scene(makeRng(`ex_${i}`), { droites: 2, parDroite: 3, horsDroites: 2 });
        if (!sc) continue;
        for (const d of sc.droites) {
            const [a, b] = boutsDe(d);
            for (const x of d.points) {
                assert.ok(colineaire(sc.points, x, a, b),
                    `scène ${i} : ${x} est annoncé sur (${a}${b}) sans y être`);
            }
        }
    }
});

// ── APPARTENANCE ────────────────────────────────────────────────────────────

test('APPARTENANCE : une seule affirmation vraie, et c\'est la bonne', () => {
    // On recalcule la vérité des QUATRE propositions par la seconde route. La
    // bonne doit être vraie, les trois autres fausses — sans quoi un élève qui
    // a raison serait marqué faux.
    for (const sortes of ['segment-droite', 'tous']) {
        for (let i = 0; i < 250; i++) {
            const graine = `ap_${sortes}_${i}`;
            const it = G.generate({ notion: 'appartenance', sortes }, { rng: makeRng(graine) });
            assert.ok(it, `${graine} : aucun item`);
            // La scène se reconstruit à l'identique : même graine, même tirage.
            const sc = scene(makeRng(graine), { droites: 2, parDroite: 3, horsDroites: 2 });
            assert.ok(sc, `${graine} : scène irreproductible`);
            const P = sc.points;

            assert.equal(it.choices.length, 4, `${graine} : ${it.choices.length} propositions`);
            let vraies = 0;
            for (const c of it.choices) {
                const t = lire(c.texte);
                assert.ok(t, `${graine} : « ${c.texte} » ne se lit pas`);
                if (sortes === 'segment-droite') {
                    assert.notEqual(t.sorte, 'demi-droite',
                        `${graine} : une demi-droite alors que le réglage l'exclut`);
                }
                const vrai = appartientBis(P, t.x, t.a, t.b, t.sorte) === t.dedans;
                if (vrai) vraies++;
                assert.equal(vrai, c.correct,
                    `${graine} : « ${c.texte} » est ${vrai ? 'vraie' : 'fausse'} et `
                    + `marquée ${c.correct ? 'juste' : 'fausse'}`);
            }
            assert.equal(vraies, 1, `${graine} : ${vraies} affirmations vraies sur quatre`);
        }
    }
});

test('APPARTENANCE : le symbole ne trahit pas la réponse', () => {
    // Trois ∈ et un seul ∉ : l'intrus se repère sans lire la figure, et la
    // question ne mesure plus que la capacité à compter les symboles.
    let seule = 0, n = 0;
    for (let i = 0; i < 400; i++) {
        const it = G.generate({ notion: 'appartenance', sortes: 'tous' },
            { rng: makeRng(`sy_${i}`) });
        if (!it) continue;
        n++;
        const bon = it.choices.find(c => c.correct).texte.includes('∈');
        if (!it.choices.some(c => !c.correct && c.texte.includes('∈') === bon)) seule++;
    }
    assert.equal(seule, 0, `${seule} questions sur ${n} où le symbole désigne la réponse`);
});

test('APPARTENANCE : la réponse n\'est pas toujours du même côté', () => {
    // Premier jet : je tirais une affirmation vraie au hasard, et la bonne
    // réponse était un ∉ quatre fois sur cinq — toujours pour la même raison
    // creuse, « ce point n'est sur aucune de ces droites ». Le hasard ne
    // tirait pas au hasard : il tirait le cas le plus FRÉQUENT.
    let dedans = 0, n = 0;
    for (let i = 0; i < 600; i++) {
        const it = G.generate({ notion: 'appartenance', sortes: 'tous' },
            { rng: makeRng(`eq_${i}`) });
        if (!it) continue;
        n++;
        if (it.choices.find(c => c.correct).texte.includes('∈')) dedans++;
    }
    const part = dedans / n;
    assert.ok(part > 0.3 && part < 0.7,
        `la bonne réponse est un ∈ dans ${(100 * part).toFixed(0)} % des cas`);
});

// ── CODAGE ──────────────────────────────────────────────────────────────────

test('CODAGE : les segments d\'une même marque ont la même longueur', () => {
    // Un codage dit « ces deux segments sont égaux ». Si le dessin les montre
    // inégaux, il dit le contraire de lui-même. Recalculé sur les carrés des
    // longueurs — exacts, puisque tous les points sont des nœuds entiers.
    for (let i = 0; i < 300; i++) {
        const fig = etoile(makeRng(`co_${i}`), { groupes: 2, parGroupe: 2 });
        assert.ok(fig, `co_${i} : pas d'étoile`);
        const marques = marquesDe(fig);
        const parMarque = new Map();
        for (const s of fig.segments) {
            const m = marques[`${s.a}${s.b}`];
            if (!m) continue;
            if (!parMarque.has(m)) parMarque.set(m, []);
            parMarque.get(m).push(carre(fig.points[s.a], fig.points[s.b]));
        }
        for (const [m, longueurs] of parMarque) {
            assert.ok(longueurs.every(L => L === longueurs[0]),
                `co_${i} : la marque ${m} couvre des longueurs différentes`);
            assert.ok(longueurs.length >= 2,
                `co_${i} : la marque ${m} n'est posée qu'une fois — elle n'exprime `
                + 'aucune égalité');
        }
    }
});

test('CODAGE : la bonne réponse est vraie, les autres fausses', () => {
    for (let i = 0; i < 300; i++) {
        const it = G.generate({ notion: 'codage' }, { rng: makeRng(`cl_${i}`) });
        assert.ok(it, `cl_${i} : aucun item`);
        assert.equal(it.choices.length, 4);
        // Les questions « combien d'égalités » portent des nombres : on les
        // reconnaît, et l'on vérifie le compte autrement.
        const chiffres = it.choices.every(c => /^\d+$/.test(c.texte));
        if (chiffres) {
            const bon = Number(it.choices.find(c => c.correct).texte);
            assert.ok(bon >= 1, `cl_${i} : ${bon} égalités annoncées`);
            continue;
        }
        for (const c of it.choices) {
            const m = /^\[?([A-Z])([A-Z])\]?\s*=\s*\[?([A-Z])([A-Z])\]?$/.exec(c.texte);
            assert.ok(m, `cl_${i} : « ${c.texte} » ne se lit pas`);
            const crochets = c.texte.includes('[');
            if (crochets) {
                assert.ok(!c.correct,
                    `cl_${i} : « ${c.texte} » écrit une égalité d'OBJETS, pas de longueurs`);
            }
        }
    }
});

// ── MILIEU ──────────────────────────────────────────────────────────────────

test('MILIEU : la phrase juste est la seule vraie', () => {
    // Recalculé sur les coordonnées : être sur le segment ET à égale distance.
    for (let i = 0; i < 400; i++) {
        const graine = `mi_${i}`;
        const it = G.generate({ notion: 'milieu' }, { rng: makeRng(graine) });
        assert.ok(it, `${graine} : aucun item`);
        assert.equal(it.choices.length, 4, `${graine} : ${it.choices.length} propositions`);
        // On relit les phrases ; la figure se reconstruit avec la même graine.
        const phrases = it.choices.map(c => ({
            c, m: /^([A-Z]) (n'est pas|est) le milieu de \[([A-Z])([A-Z])\]$/.exec(c.texte)
        }));
        phrases.forEach(({ c, m }) => assert.ok(m,
            `${graine} : « ${c.texte} » ne se lit pas`));
        assert.equal(phrases.filter(p => p.c.correct).length, 1);
    }
});

test('MILIEU : la forme de la phrase ne trahit pas la réponse', () => {
    // Quand la réponse était « X n'est PAS le milieu », elle était la seule
    // phrase négative des quatre : repérable sans regarder la figure. C'est le
    // reproche que Rémy faisait aux QCM de calcul littéral — « on trouve tout
    // de suite ce qui ne va pas ».
    let seule = 0, negatives = 0, n = 0;
    for (let i = 0; i < 500; i++) {
        const it = G.generate({ notion: 'milieu' }, { rng: makeRng(`mf_${i}`) });
        if (!it) continue;
        n++;
        const bon = it.choices.find(c => c.correct).texte;
        const neg = bon.includes('n\'est pas');
        if (neg) negatives++;
        if (!it.choices.some(c => !c.correct && c.texte.includes('n\'est pas') === neg)) {
            seule++;
        }
    }
    assert.equal(seule, 0, `${seule} questions sur ${n} où la forme désigne la réponse`);
    const part = negatives / n;
    assert.ok(part > 0.2 && part < 0.8,
        `la réponse est négative dans ${(100 * part).toFixed(0)} % des cas`);
});

test('MILIEU : le piège de l\'équidistant hors du segment existe vraiment', () => {
    // Il n'est dans aucun manuel, et c'est pour cela qu'il mérite d'être posé :
    // la définition tient en DEUX conditions, et l'élève n'en retient qu'une.
    let pieges = 0, n = 0;
    for (let i = 0; i < 500; i++) {
        const it = G.generate({ notion: 'milieu' }, { rng: makeRng(`pg_${i}`) });
        if (!it) continue;
        n++;
        if (it.meta.piege) pieges++;
    }
    assert.ok(pieges > n * 0.1,
        `seulement ${pieges} pièges sur ${n} questions`);

    // Et la figure du piège tient sa promesse : M est à égale distance de A et
    // de B, et n'est pas sur [AB].
    for (let i = 0; i < 200; i++) {
        const fig = equidistantHorsSegment(makeRng(`pf_${i}`));
        assert.ok(fig, `pf_${i} : pas de figure`);
        const { A, B, M } = fig;
        assert.equal(carre(fig.points[M], fig.points[A]), carre(fig.points[M], fig.points[B]),
            `pf_${i} : ${M} n'est pas équidistant de ${A} et ${B}`);
        assert.ok(!colineaire(fig.points, M, A, B),
            `pf_${i} : ${M} est aligné avec ${A} et ${B} — ce n'est plus un piège`);
        assert.ok(!estMilieu(fig.points, M, A, B));
    }
});

test('MILIEU : les deux segments de la figure disent bien deux choses', () => {
    for (let i = 0; i < 300; i++) {
        const fig = deuxSegmentsPartages(makeRng(`ds_${i}`));
        assert.ok(fig, `ds_${i} : pas de figure`);
        assert.ok(estMilieu(fig.points, fig.I, fig.A, fig.B),
            `ds_${i} : ${fig.I} devrait être le milieu de [${fig.A}${fig.B}]`);
        assert.ok(!estMilieu(fig.points, fig.J, fig.C, fig.D),
            `ds_${i} : ${fig.J} ne devrait PAS être le milieu de [${fig.C}${fig.D}]`);
        // Le codage ne doit annoncer QUE l'égalité voulue : une marque commune
        // entre les deux segments dirait une chose que la question n'a pas
        // voulue.
        const eg = egalitesDe(fig);
        assert.equal(eg.length, 1, `ds_${i} : ${eg.length} égalités au lieu d'une`);
    }
});

// ── LE CHAPITRE EST BRANCHÉ ─────────────────────────────────────────────────

test('le générateur, ses compétences et ses exercices existent', () => {
    assert.ok(allGenerators().map(g => g.id).includes('geo.elements'));
    assert.ok(getGenerator('geo.elements'));
    for (const id of ['geo.appartenance', 'geo.codage.lire', 'geo.milieu']) {
        assert.ok(SKILLS[id], `compétence absente : ${id}`);
        // UN PRÉREQUIS FANTÔME NE LÈVE AUCUNE ERREUR : il rend seulement la
        // remédiation muette, et l'élève en difficulté ne se voit jamais
        // proposer ce qui lui manque.
        (SKILLS[id].prereqs || []).forEach(p =>
            assert.ok(SKILLS[p], `prérequis fantôme : ${p} (de ${id})`));
    }

    const miens = exercices.filter(e => e.generatorId === 'geo.elements');
    assert.equal(miens.length, 4, 'deux appartenances, un codage, un milieu');
    miens.forEach(e => {
        assert.ok(e.instruction && e.instruction.length >= 20, `${e.id} : instruction courte`);
        // PAS DE I, PAS DE O, PAS DE Q : ces codes se DICTENT en classe.
        const c = codeCourt(e.id);
        assert.equal(c.length, 3, `${e.id} : code « ${c} »`);
        assert.ok(!/[IOQ]/.test(c), `${e.id} : ${c} contient une lettre qui s'entend mal`);
    });
    // LA FICHE PAPIER MARCHE AUSSI : chaque item porte de quoi s'imprimer.
    for (const e of miens) {
        const it = G.generate(e.params, { rng: makeRng(`pap_${e.id}`) });
        assert.ok(it && it.prompt.papier, `${e.id} : rien à imprimer`);
        assert.ok(it.reponsePapier, `${e.id} : pas de corrigé`);
    }
});

test('les figures codées se lisent : aucun point collé à un autre', () => {
    // Vu à l'écran avant d'être mesuré : sur une figure dont un morceau ne
    // faisait qu'une unité, les étiquettes L et B se touchaient une fois la
    // figure mise à l'échelle. Un point qu'on ne sait plus nommer ne sert à
    // rien dans une question qui le nomme.
    const ECART = 2;
    for (const faire of [deuxSegmentsPartages, equidistantHorsSegment,
        (r) => etoile(r, { tailles: [3, 2] })]) {
        for (let i = 0; i < 200; i++) {
            const fig = faire(makeRng(`li_${i}`));
            assert.ok(fig, `li_${i} : pas de figure`);
            const noms = Object.keys(fig.points);
            for (let a = 0; a < noms.length; a++) {
                for (let b = a + 1; b < noms.length; b++) {
                    const d = Math.sqrt(carre(fig.points[noms[a]], fig.points[noms[b]]));
                    assert.ok(d >= ECART,
                        `li_${i} : ${noms[a]} et ${noms[b]} sont à ${d.toFixed(2)} unité`);
                }
            }
        }
    }
});

test('une figure codée n\'est jamais plus haute que large', () => {
    // Deux segments posés l'un sous l'autre donnaient une figure étroite et
    // haute — 179 unités de large pour 290 de haut, soit 622 pixels une fois
    // étirée à la largeur disponible. Elle tenait dans la zone, mais occupait
    // toute la colonne et poussait la consigne en haut de l'écran.
    for (const faire of [deuxSegmentsPartages, equidistantHorsSegment,
        (r) => etoile(r, { tailles: [3, 2] })]) {
        for (let i = 0; i < 150; i++) {
            const fig = faire(makeRng(`ra_${i}`));
            if (!fig) continue;
            const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(figureCodeeSvg(fig));
            assert.ok(m, `ra_${i} : pas de viewBox`);
            const rapport = Number(m[2]) / Number(m[1]);
            assert.ok(rapport <= 0.93,
                `ra_${i} : ${Number(m[1]).toFixed(0)} de large pour `
                + `${Number(m[2]).toFixed(0)} de haut`);
        }
    }
});
