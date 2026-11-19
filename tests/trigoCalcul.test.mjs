// LA TRIGONOMÉTRIE QUI CALCULE — ce que les cinq marches doivent tenir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « tu as d'autres idées ? » — et l'inventaire du programme
// répondait : « Trigonométrie (3ème) : on nomme, on ne calcule pas ».
//
// CE QUI SE GARDE ICI, ce sont les quatre choses qu'un exercice de trigo faux
// fait sans le dire : une réponse qui ne suit pas sa propre figure, un
// diagnostic qui accuse qui a raison, une figure illisible, et un triangle
// dessiné à un autre angle que celui qu'il annonce.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    ANGLES, SITUATIONS, tirerCalcul, aLAngle, etiquettesDe, etiquettesPlacees,
    geometrieTriangle, triangleSvg, planTriangle, boiteTexte, traitDansLaBoite, CENTRAGE,
    expliquer, indicesDe, diagnosticsDe, auDixieme
} from '../js/core/trigoCalcul.js';
import {
    FONCTIONS, rolesDe, pointsDe, sommetVise, sommetDroit, nomCote, ROLES
} from '../js/core/trigonometrie.js';
import { ETAPES } from '../js/core/generators/trigoCalcul.js';
import '../js/core/activities/index.js';
import { getGenerator } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import { readFileSync } from 'node:fs';
// `sansCommentaires` : sans elle, une épreuve qui cherche un motif interdit le
// trouve DANS LA PHRASE QUI L'INTERDIT — ce dépôt explique chaque règle à
// l'endroit où elle se prend. Quatre épreuves sont tombées sur du code sain
// pour cette seule raison.
import { sansCommentaires } from './helpers.mjs';

const item = (marche, graine) => getGenerator('geo.trigo.calcul')
    .generate({ marches: [marche] },
        { rng: makeRng(`${marche}-${graine}`), index: 0, total: 1 });

/** L'angle réellement dessiné au sommet visé, en degrés. */
function angleDessine(t) {
    const p = pointsDe(t, 100);
    const s = t.angleVise;
    const [i, j] = [0, 1, 2].filter(k => k !== s);
    const u = { x: p[i].x - p[s].x, y: p[i].y - p[s].y };
    const v = { x: p[j].x - p[s].x, y: p[j].y - p[s].y };
    const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

test('LE TRIANGLE EST DESSINÉ À L’ANGLE QU’IL ANNONCE', () => {
    // UNE FIGURE QUI MENT APPREND À NE PAS LA REGARDER. `tirerTriangle` choisit
    // sa forme dans une liste — c'est très bien quand on NOMME les côtés, où la
    // mesure ne compte pas. Ici elle compte : un triangle annoncé à 60° et
    // dessiné à 22° enseigne que le dessin ne veut rien dire, ce qui est faux
    // et coûteux.
    for (const degres of ANGLES) {
        for (let i = 0; i < 12; i++) {
            const t = aLAngle({ ...rienQueLaForme(i), degres }, degres);
            assert.ok(Math.abs(angleDessine(t) - degres) < 0.6,
                `annoncé ${degres}°, dessiné ${angleDessine(t).toFixed(1)}°`);
        }
    }
    // ET SUR LES TIRAGES RÉELS, y compris ceux de la marche « angle », où la
    // mesure est TROUVÉE et non choisie.
    for (const genre of ['produit', 'quotient', 'angle']) {
        for (let i = 0; i < 20; i++) {
            const c = tirerCalcul(makeRng(`${genre}-fig-${i}`), { genre });
            assert.ok(Math.abs(angleDessine(c.t) - c.degres) < 0.8,
                `${genre} : annoncé ${c.degres.toFixed(1)}°, dessiné `
                + `${angleDessine(c.t).toFixed(1)}°`);
        }
    }
});

/** Un triangle quelconque, pour éprouver `aLAngle` sans tirer au sort. */
function rienQueLaForme(i) {
    const noms = ['ABC', 'DEF', 'MNP', 'RST'];
    const nom = noms[i % noms.length];
    const angleDroit = i % 3;
    const aigus = [0, 1, 2].filter(k => k !== angleDroit);
    return {
        id: 'essai', nom, sommets: nom.split(''), forme: { a: 1, b: 1 },
        angleDroit, angleVise: aigus[i % 2], orientation: (i * 47) % 360
    };
}

test('LA RÉPONSE EST CELLE QUE LA FIGURE PORTE', () => {
    // LA FAUTE QU'UN EXERCICE DE CALCUL PEUT COMMETTRE SANS BRUIT : donner une
    // réponse juste pour un AUTRE triangle que celui qu'on dessine. On refait
    // donc le chemin de l'élève — le rapport, la donnée, l'arrondi — et l'on
    // compare au nombre attendu.
    for (const genre of ['produit', 'quotient', 'melange']) {
        for (let i = 0; i < 40; i++) {
            const c = tirerCalcul(makeRng(`${genre}-rep-${i}`), { genre });
            const f = FONCTIONS[c.situation.fonction];
            const v = { cos: Math.cos, sin: Math.sin, tan: Math.tan }[f.cle](
                (c.degres * Math.PI) / 180);
            const attendu = c.situation.produit ? c.donnee * v : c.donnee / v;
            assert.equal(c.reponse, auDixieme(attendu));
            // ET LE RAPPORT EST CELUI QUI PORTE LES DEUX CÔTÉS EN JEU : c'est
            // la règle du chapitre, et elle se vérifie sur les rôles.
            const roles = rolesDe(c.t);
            const deux = new Set([roles[f.haut], roles[f.bas]]);
            assert.ok(deux.has(c.nomConnu) && deux.has(c.nomCherche),
                `${f.nom} met en jeu ${[...deux].join(' et ')}, pas ${c.nomConnu} `
                + `et ${c.nomCherche}`);
            // L'HYPOTÉNUSE RESTE LE PLUS LONG CÔTÉ — sinon le triangle n'existe
            // pas, et l'élève qui vérifie son résultat aurait raison contre
            // l'exercice.
            const estHypo = (nom) => nom === roles[ROLES.HYPOTENUSE];
            const lue = Number(c.reponse.replace(',', '.'));
            if (estHypo(c.nomCherche)) {
                assert.ok(lue > c.donnee,
                    `l'hypoténuse ${c.nomCherche} sort à ${lue} pour un côté de ${c.donnee}`);
            }
            if (estHypo(c.nomConnu)) {
                assert.ok(lue < c.donnee,
                    `${c.nomCherche} sort à ${lue}, plus grand que l'hypoténuse ${c.donnee}`);
            }
        }
    }
});

test('L’ANGLE CHERCHÉ EST BIEN CELUI QUE LES DEUX CÔTÉS DONNENT', () => {
    for (let i = 0; i < 60; i++) {
        const c = tirerCalcul(makeRng('ang' + i), { genre: 'angle' });
        const q = c.haut.valeur / c.bas.valeur;
        const attendu = { cos: Math.acos, sin: Math.asin, tan: Math.atan }[c.cle](q);
        assert.ok(Math.abs((attendu * 180) / Math.PI - c.exact) < 1e-6,
            'la mesure annoncée ne vient pas des deux longueurs dessinées');
        // ET ELLE EST DANS LA FENÊTRE LISIBLE : au-delà, le triangle devient
        // une aiguille et sa mesure n'a plus de place entre les deux côtés.
        assert.ok(c.exact >= 30 && c.exact <= 65,
            `angle de ${c.exact.toFixed(1)}° : hors de la fenêtre dessinable`);
        // UN COSINUS OU UN SINUS NE DÉPASSE JAMAIS 1 : si le rapport sortait
        // plus grand, le « côté » donné serait plus long que l'hypoténuse.
        if (c.cle !== 'tan') assert.ok(q < 1, `${c.cle} = ${q.toFixed(2)} > 1`);
    }
});

test('45° EST DEHORS, ET CE N’EST PAS UN OUBLI', () => {
    // À 45°, l'opposé et l'adjacent sont égaux : prendre le MAUVAIS rapport
    // donne le même nombre, et la faute n° 1 du chapitre devient invisible.
    assert.ok(!ANGLES.includes(45), '45° rend la faute de rapport indétectable');
    // Et la fenêtre reste celle qu'on sait dessiner.
    ANGLES.forEach(a => assert.ok(a >= 30 && a <= 65, `${a}° sort de la fenêtre`));
});

test('AUCUN DIAGNOSTIC N’ACCUSE QUI A RAISON, ET CHACUN NOMME SA FAUTE', () => {
    for (const genre of ['produit', 'quotient', 'angle']) {
        for (let i = 0; i < 25; i++) {
            const c = tirerCalcul(makeRng(`${genre}-diag-${i}`), { genre });
            const d = diagnosticsDe(c);
            const vus = new Set();
            d.forEach(x => {
                assert.notEqual(x.value, c.reponse,
                    `un diagnostic porte la bonne réponse (${x.value})`);
                assert.ok(!vus.has(x.value), `deux diagnostics sur ${x.value}`);
                vus.add(x.value);
                // UN NOMBRE QU'ON NE PEUT PAS TAPER NE SERT À RIEN : le pavé
                // d'une longueur n'a pas de signe moins.
                const n = Number(String(x.value).replace(',', '.'));
                assert.ok(Number.isFinite(n) && n > 0, `valeur impossible : ${x.value}`);
                assert.ok(x.why && x.why.length > 40, 'un diagnostic sans explication');
            });
            assert.ok(d.length >= 2, `${genre} : seulement ${d.length} diagnostic(s)`);
        }
    }
    // ET LA FAUTE DU CHAPITRE EST NOMMÉE : prendre le mauvais rapport. On
    // vérifie qu'un diagnostic porte bien le nombre qu'elle donne.
    const c = tirerCalcul(makeRng('faute'), { genre: 'produit' });
    const autre = ['cos', 'sin', 'tan'].find(k => k !== c.situation.fonction);
    const v = { cos: Math.cos, sin: Math.sin, tan: Math.tan }[autre](
        (c.degres * Math.PI) / 180);
    const faux = auDixieme(c.situation.produit ? c.donnee * v : c.donnee / v);
    assert.ok(diagnosticsDe(c).some(d => d.value === faux),
        `le nombre du mauvais rapport (${faux}) n'est pas diagnostiqué`);
});

test('LA CALCULATRICE EN RADIANS EST NOMMÉE — personne ne peut le deviner', () => {
    // cos(35) vaut 0,819 en degrés et −0,903 en radians. L'élève voit un
    // résultat aberrant, ne sait pas pourquoi, et son professeur non plus sans
    // regarder l'écran de la machine. C'est le diagnostic le plus utile du
    // fichier, et il ne coûte qu'un calcul.
    let nommee = 0, possible = 0;
    for (let i = 0; i < 60; i++) {
        const c = tirerCalcul(makeRng('rad' + i), { genre: 'melange' });
        const enRad = { cos: Math.cos, sin: Math.sin, tan: Math.tan }[c.situation.fonction](
            c.degres);
        const v = c.situation.produit ? c.donnee * enRad : c.donnee / enRad;
        if (!(v > 0)) continue;        // négatif : l'élève ne peut pas le taper
        possible++;
        if (diagnosticsDe(c).some(d => d.value === auDixieme(v))) nommee++;
    }
    assert.ok(possible > 10, `seulement ${possible} cas mesurables`);
    assert.equal(nommee, possible,
        `${possible - nommee} cas de radians non nommés sur ${possible}`);
});

test('AUCUNE ÉTIQUETTE NE SE POSE SUR UN TRAIT NI SUR UNE AUTRE', () => {
    // ── POURQUOI CETTE ÉPREUVE EXISTE, ET CE QU'ELLE A DÉJÀ ATTRAPÉ ──────
    //
    // Une figure illisible ne lève aucune erreur : elle s'affiche, et l'élève
    // ne sait pas quel nombre va avec quel côté. Mesuré en chemin, avec des
    // écarts fixes : 31 chevauchements et 42 étiquettes posées sur un côté du
    // triangle, sur 1 200 tirages.
    //
    // ET LA PREMIÈRE VERSION DE CETTE MESURE DISAIT ZÉRO À TORT, deux fois :
    // elle testait le CENTRE de l'étiquette au lieu de sa boîte, puis sa boîte
    // autour de la ligne de base au lieu du centre du texte. Les deux fois,
    // « 5 cm » était imprimé SUR le trait pendant que le compteur annonçait
    // que tout allait bien.
    const H = 11;
    let chevauchements = 0, surLeTrait = 0, n = 0;
    for (const genre of ['produit', 'quotient', 'angle']) {
        for (let i = 0; i < 400; i++) {
            const c = tirerCalcul(makeRng(`${genre}-${i}`), { genre });
            const { g, etiquettes } = etiquettesPlacees(c, 100, H);
            const boites = etiquettes.map(e => boiteTexte(e.x, e.y, e.t, H));
            n++;
            for (let a = 0; a < boites.length; a++) {
                for (let b = a + 1; b < boites.length; b++) {
                    if (boites[a].x0 < boites[b].x1 && boites[b].x0 < boites[a].x1
                        && boites[a].y0 < boites[b].y1 && boites[b].y0 < boites[a].y1) {
                        chevauchements++;
                    }
                }
            }
            const cotes = [[0, 1], [1, 2], [0, 2]].map(([a, b]) =>
                [[g.points[a].x, g.points[a].y], [g.points[b].x, g.points[b].y]]);
            boites.forEach(bo => {
                if (cotes.some(s => traitDansLaBoite(bo, s[0], s[1], 0))) surLeTrait++;
            });
        }
    }
    assert.equal(chevauchements, 0, `${chevauchements} étiquettes se chevauchent sur ${n}`);
    assert.equal(surLeTrait, 0, `${surLeTrait} étiquettes posées sur un trait sur ${n}`);
});

test('LA BOÎTE D’UNE ÉTIQUETTE EST CENTRÉE COMME LE TEXTE S’ÉCRIT', () => {
    // ── L'ÉPREUVE QUI MANQUAIT, ET QUI A ÉTÉ TROUVÉE EN LA FAISANT TOMBER ──
    //
    // La garde des étiquettes au-dessus emploie `boiteTexte` — la MÊME fonction
    // que le code qui les écarte. Remettre l'ancienne convention (la boîte
    // autour de la ligne de base) ne la fait donc PAS tomber : la mesure et le
    // code se trompent ensemble, et le compteur annonce zéro pendant que
    // « 5 cm » s'imprime sur un trait. Vérifié avec `tools/epreuveTombe.mjs`.
    //
    // CE QUI SE GARDE ICI EST DONC LA CONVENTION ELLE-MÊME, et elle tient en
    // deux faits : la boîte est SYMÉTRIQUE autour de son point, et les deux
    // traceurs décalent la ligne de base de `CENTRAGE`. Si l'un des trois
    // change seul, cette épreuve tombe.
    const b = boiteTexte(0, 0, 'XXX', 10);
    assert.ok(Math.abs((-b.y0) - b.y1) < 1e-9,
        `boîte dissymétrique : ${b.y0} en haut, ${b.y1} en bas — elle est calculée `
        + 'autour de la ligne de base, pas du centre du texte');
    assert.ok(b.y1 > 4 && b.y1 < 6, 'la boîte ne fait plus la hauteur du texte');
    assert.ok(CENTRAGE > 0.2 && CENTRAGE < 0.5, 'le centrage a quitté le plausible');
    // ET LES DEUX TRACEURS EMPLOIENT LA CONSTANTE, chacun une fois : un « 0.35 »
    // recopié à la main se remet à diverger le jour où l'on touche à l'autre.
    const SRC = sansCommentaires(
        readFileSync(new URL('../js/core/trigoCalcul.js', import.meta.url), 'utf8'));
    const svg = SRC.slice(SRC.indexOf('export function triangleSvg'),
        SRC.indexOf('export function planTriangle'));
    const papier = SRC.slice(SRC.indexOf('export function planTriangle'));
    assert.match(svg, /CENTRAGE/, 'le SVG n’emploie pas la constante de centrage');
    assert.match(papier, /CENTRAGE/, 'le papier n’emploie pas la constante de centrage');
    assert.ok(!/\b0\.35\b/.test(svg + papier),
        'un 0,35 est recopié à la main à côté de la constante');
});

test('LA FIGURE PORTE EXACTEMENT CE QU’IL FAUT POUR RÉPONDRE', () => {
    // NI PLUS NI MOINS. Un troisième côté coté donnerait la réponse par
    // Pythagore et le chapitre ne servirait plus à rien ; un côté manquant
    // rendrait la question insoluble.
    for (const genre of ['produit', 'quotient', 'angle']) {
        for (let i = 0; i < 30; i++) {
            const c = tirerCalcul(makeRng(`${genre}-etiq-${i}`), { genre });
            const e = etiquettesDe(c);
            const noms = Object.keys(e);
            assert.equal(noms.length, 2, `${noms.length} côtés cotés : ${noms.join(', ')}`);
            if (genre === 'angle') {
                // DEUX LONGUEURS, ET L'ANGLE EST LE « ? ».
                assert.ok(noms.every(x => /cm$/.test(e[x])), 'une longueur manque');
            } else {
                assert.equal(Object.values(e).filter(x => x === '?').length, 1,
                    'il faut un seul « ? » : celui qu’on cherche');
            }
        }
    }
});

test('CHAQUE MARCHE REND UNE QUESTION COMPLÈTE', () => {
    for (const e of ETAPES) {
        for (let i = 0; i < 4; i++) {
            const it = item(e.id, i);
            assert.ok(it.answer !== undefined && it.answer !== '', `${e.id} : pas de réponse`);
            assert.match(it.prompt.html, /<svg/, `${e.id} : l'énoncé n'a pas sa figure`);
            assert.ok(it.prompt.figure && it.prompt.figure.traits.length >= 3,
                `${e.id} : rien à imprimer`);
            assert.equal((it.hints || []).length, 2, `${e.id} : il faut deux indices`);
            assert.ok(it.explanation.length > 40, `${e.id} : explication trop courte`);
            assert.ok(SKILLS[it.skillId], `${e.id} : compétence inconnue`);
            // L'UNITÉ SUIT LA QUESTION : des centimètres pour une longueur, un
            // degré pour un angle. Et la virgule n'est au clavier que là où
            // elle sert.
            if (e.id === 'angle') {
                assert.equal(it.meta.unit, '°');
                assert.equal(it.meta.decimal, false);
                assert.ok(!/,/.test(it.answer), 'un angle s’arrondit au degré');
            } else if (e.id !== 'choisir') {
                assert.equal(it.meta.unit, 'cm');
                assert.equal(it.meta.decimal, true);
                assert.match(it.answer, /,\d$/, 'une longueur s’arrondit au dixième');
            }
        }
    }
});

// ON DÉCOMPOSE AU LIEU D'ÉNUMÉRER.
//
// `avecChapeau` normalise en NFC, donc une lettre qui A un caractère
// précomposé le prend : Â, Ĉ, Ê, Ĝ, Ĥ, Î, Ĵ, Ô, Ŝ, Û, Ŵ, Ŷ — douze sur
// vingt-six, et les autres restent « lettre + U+0302 ». Premier jet : une
// liste à cinq lettres, « ÂÊÎÔÛ », qui est celle du français courant. Elle a
// laissé passer « Ĝ » au premier tirage. Énumérer un sous-ensemble d'Unicode
// de mémoire ne marche jamais : on remet la chaîne en NFD, où TOUT chapeau
// redevient un U+0302 derrière sa lettre, et l'on cherche celui-là.
const CHAPEAU = '\u0302';
const nfd = (t) => String(t).normalize('NFD');
const ANGLE = `[A-Z]${CHAPEAU}`;
const FORME_RAPPORT = new RegExp(`^(cos|sin|tan)\\(${ANGLE}\\) = [A-Z]{2} / [A-Z]{2}$`);

test('UN ANGLE PORTE UN CHAPEAU, UN CÔTÉ N’EN PORTE PAS', () => {
    // Rémy, 19 novembre : « on met des accents circonflexes sur les angles ».
    //
    // LA SECONDE MOITIÉ DE LA RÈGLE COMPTE AUTANT QUE LA PREMIÈRE : « AB »
    // nomme un CÔTÉ et « rectangle en A » un SOMMET — ni l'un ni l'autre ne
    // prend de chapeau. Une règle posée trop largement enseignerait le
    // contraire de ce qu'elle veut dire, et c'est ce qu'un balayage du texte
    // aurait fait.
    for (const marche of ['choisir', 'longueur-produit', 'angle']) {
        for (let i = 0; i < 8; i++) {
            const it = item(marche, i);
            const tout = nfd([it.prompt.text, it.explanation,
                ...(it.choices || []).map(c => c.label)].join('\n'));
            // Un côté, ce sont DEUX majuscules collées : aucun chapeau ne doit
            // se glisser entre elles ni après la seconde.
            assert.ok(!new RegExp(`[A-Z]${CHAPEAU}[A-Z]`).test(tout),
                `un côté porte un chapeau : ${tout.slice(0, 120)}`);
            assert.ok(!new RegExp(`[A-Z][A-Z]${CHAPEAU}`).test(tout),
                `un côté porte un chapeau : ${tout.slice(0, 120)}`);
        }
    }
    // ET L'ANGLE, LUI, EN PORTE UN : sans cette moitié-ci, l'épreuve passerait
    // au vert sur un logiciel qui n'écrirait plus aucun chapeau nulle part.
    const avecAngle = item('angle', 3);
    assert.match(nfd(avecAngle.explanation), new RegExp(ANGLE),
        `aucun angle chapeauté dans : ${avecAngle.explanation.slice(0, 120)}`);
});

test('LA MARCHE « CHOISIR » NE DEMANDE AUCUN CALCUL', () => {
    // C'est sa raison d'être : se tromper de rapport et se tromper de calcul ne
    // sont pas la même faute, et mélangées elles deviennent invisibles.
    for (let i = 0; i < 12; i++) {
        const it = item('choisir', i);
        assert.equal(it.answerKind, 'choice');
        assert.equal(it.choices.length, 3, 'les trois rapports, et eux seuls');
        const bonne = it.choices.find(c => c.correct);
        assert.ok(bonne, 'aucune proposition juste');
        // LES TROIS PROPOSITIONS ONT LA MÊME FORME — « cos(Â) = AB / AC » —,
        // sinon la plus détaillée se repère sans regarder la figure.
        //
        // ET L'ANGLE PORTE SON CHAPEAU. Rémy, 19 novembre : « on met des
        // accents circonflexes sur les angles ». Ce n'est pas une convention
        // de plus : dans « cos(Â) = AB / AC », le premier A est un ANGLE et
        // les deux autres sont les sommets de deux SEGMENTS — trois lettres
        // identiques pour trois objets, dans la ligne même qui sert à les
        // distinguer. Le motif EXIGE donc le chapeau sur l'angle et
        // l'INTERDIT sur les côtés.
        it.choices.forEach(c => assert.match(nfd(c.label), FORME_RAPPORT,
            `proposition mal formée : ${c.label}`));
        it.choices.filter(c => !c.correct).forEach(c =>
            assert.ok(c.why && c.why.length > 40, 'un leurre sans explication'));
        // ET LA RÉPONSE N'EST PAS UN NOMBRE : rien à taper, rien à arrondir.
        assert.ok(['cos', 'sin', 'tan'].includes(it.answer));
    }
});

test('LES SIX SITUATIONS EXISTENT, ET CHACUNE SORT', () => {
    // Trois côtés connus possibles, deux cherchés : six. Si l'une ne sortait
    // jamais, un tiers du chapitre ne serait jamais travaillé — et rien ne le
    // dirait.
    assert.equal(SITUATIONS.length, 6);
    const vues = new Set();
    for (let i = 0; i < 300; i++) {
        const c = tirerCalcul(makeRng('six' + i), { genre: 'melange' });
        vues.add(`${c.situation.connue}>${c.situation.cherche}`);
    }
    assert.equal(vues.size, 6, `seulement ${vues.size} situations sur six en 300 tirages`);
});

test('L’EXERCICE EST AU CATALOGUE, AVEC SA CALCULATRICE', () => {
    const exo = getExerciseById('geo-trigo-calcul');
    assert.ok(exo, 'geo-trigo-calcul n’est pas au catalogue');
    assert.equal(exo.generatorId, 'geo.trigo.calcul');
    assert.equal(exo.activityId, 'numpad');
    // SANS CALCULATRICE, CET EXERCICE N'EXISTE PAS : cos(35°) ne se calcule
    // pas de tête, et ce n'est pas ce qu'on mesure.
    assert.equal(exo.calculatrice, true);
    ETAPES.forEach(e => assert.ok(exo.params.marches.includes(e.id),
        `la marche ${e.id} n’est pas cochée par défaut`));
    ['geo.trigo.choisir', 'geo.trigo.longueur', 'geo.trigo.angle'].forEach(id => {
        assert.ok(SKILLS[id], `la compétence ${id} n’existe pas`);
        assert.ok(SKILLS[id].prereqs.length, `${id} n’a pas de prérequis`);
        assert.ok(SKILLS[id].lesson.length > 100, `${id} n’a pas de leçon`);
    });
    // ET LA CONSIGNE DIT LA CHOSE QUI SE PERD : la machine en degrés.
    assert.match(exo.instruction, /DEGRÉS/);
});

test('L’EXPLICATION MONTRE LE CHEMIN, PAS SEULEMENT LE NOMBRE', () => {
    // Une explication qui dit « la réponse est 6,9 cm » n'explique rien. Celle
    // d'ici écrit le rapport, remplace, et conclut — c'est la rédaction qu'on
    // attend sur la copie.
    for (const genre of ['produit', 'quotient']) {
        const c = tirerCalcul(makeRng('expl-' + genre), { genre });
        const e = expliquer(c);
        assert.match(e, /=/, 'pas d’égalité dans l’explication');
        assert.ok(e.includes(c.nomCherche) && e.includes(c.nomConnu),
            'l’explication ne nomme pas les deux côtés');
        assert.ok(e.includes(String(c.donnee)), 'la donnée n’apparaît pas dans le calcul');
        assert.ok(e.includes(c.reponse), 'le résultat n’apparaît pas');
        assert.match(e, genre === 'produit' ? /×/ : /÷/,
            'le geste (× ou ÷) ne se voit pas dans l’explication');
    }
    // ET LES INDICES VONT DU GÉNÉRAL AU PARTICULIER : le premier dit où
    // regarder, le second nomme le rapport. Jamais la réponse.
    const c = tirerCalcul(makeRng('ind'), { genre: 'produit' });
    const [un, deux] = indicesDe(c);
    assert.ok(!un.includes(c.reponse) && !deux.includes(c.reponse),
        'un indice donne la réponse');
    assert.match(deux, /CAH|SOH|TOA/, 'le second indice ne nomme pas le moyen mnémotechnique');
});

test('LE SVG ET LE PLAN PAPIER DESSINENT LE MÊME TRIANGLE', () => {
    // Deux traceurs, une seule géométrie : c'est la règle de `planPapier.js`.
    // Une figure dessinée deux fois diverge au premier réglage, et le défaut
    // ne se voit que sur l'un des deux supports.
    for (let i = 0; i < 15; i++) {
        const c = tirerCalcul(makeRng('deux' + i), { genre: 'melange' });
        const svg = triangleSvg(c);
        const p = planTriangle(c);
        const g = geometrieTriangle(c, 100);
        // Les trois sommets du contour se retrouvent dans le plan.
        assert.ok(p.traits.some(l => l.length === g.contour.length),
            'le contour manque au plan papier');
        // Et les mêmes textes, des deux côtés.
        const { etiquettes } = etiquettesPlacees(c, 100, 11);
        etiquettes.forEach(e => {
            assert.ok(svg.includes(`>${e.t}<`), `« ${e.t} » manque au SVG`);
            assert.ok(p.textes.some(t => t.t === e.t), `« ${e.t} » manque au papier`);
        });
        // LE CADRE DU SVG CONTIENT TOUT : une figure coupée est le défaut le
        // plus banal du dépôt.
        const vb = svg.match(/viewBox="([-\d. ]+)"/)[1].split(' ').map(Number);
        const dansLeCadre = (x, y) => x >= vb[0] - 0.01 && x <= vb[0] + vb[2] + 0.01
            && y >= vb[1] - 0.01 && y <= vb[1] + vb[3] + 0.01;
        g.contour.forEach(([x, y]) => assert.ok(dansLeCadre(x, y), 'le triangle déborde'));
        etiquettes.forEach(e => assert.ok(dansLeCadre(e.x, e.y),
            `« ${e.t} » est hors du cadre`));
    }
});

test('LE TRIANGLE GARDE SON ANGLE DROIT ET SON NOM', () => {
    // `aLAngle` ne refait que la FORME : les noms, l'angle droit, l'angle visé
    // et l'orientation viennent du triangle d'origine. Sans cela, la figure
    // changerait entre le moment où l'on choisit les longueurs et celui où on
    // la dessine — et la réponse ne serait plus celle du dessin.
    for (let i = 0; i < 12; i++) {
        const avant = rienQueLaForme(i);
        const apres = aLAngle(avant, 40);
        assert.equal(apres.nom, avant.nom);
        assert.equal(apres.angleDroit, avant.angleDroit);
        assert.equal(apres.angleVise, avant.angleVise);
        assert.equal(apres.orientation, avant.orientation);
        assert.notDeepEqual(apres.forme, avant.forme, 'la forme n’a pas suivi l’angle');
        // ET LE SOMMET DROIT RESTE EN FACE DE L'HYPOTÉNUSE.
        const roles = rolesDe(apres);
        assert.ok(!roles[ROLES.HYPOTENUSE].includes(sommetDroit(apres)),
            'l’hypoténuse touche l’angle droit');
        assert.ok(roles[ROLES.ADJACENT].includes(sommetVise(apres))
            && roles[ROLES.ADJACENT].includes(sommetDroit(apres)),
            'l’adjacent ne joint pas l’angle visé à l’angle droit');
        // Et les noms de côtés restent ceux du triangle d'origine.
        assert.equal(nomCote(apres, 0, 1), nomCote(avant, 0, 1));
    }
});
