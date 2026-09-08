// LE DISQUE — la valeur exacte, puis la valeur arrondie.
//
// Deux promesses tiennent tout l'exercice, et aucune ne se voit à l'œil nu :
//
//   · UNE VALEUR EXACTE SE TAPE, DEPUIS QUE LE PAVÉ PORTE UN π. Rémy : « Au
//     départ quand tu utilises le pavé numérique, demande une valeur exacte
//     (rajoute le Pi) en symbole. » Ce qui se tape est « 25π » — le nombre et
//     son symbole, l'unité restant à côté de l'écran —, et l'item doit
//     réclamer la touche (`meta.pi`), sans quoi l'exercice serait injouable et
//     personne ne s'en apercevrait avant un élève bloqué devant son écran.
//     Seule « Quelle formule ? » reste en propositions : sa réponse est
//     « 2 × π × r », qui n'est pas un nombre.
//   · 3,14 ET LA TOUCHE π DONNENT LE MÊME ARRONDI. Sinon l'exercice compte
//     faux une réponse juste, et l'on ne sait pas laquelle des deux méthodes
//     est en cause.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    MARCHES_DISQUE, ETAPES_EXACTES, PI_COLLEGE, arrondiStable, arrondir, decimalesDe,
    tirerDisque, enonceDe, reponseDe, uniteDe, expliquer, indicesDe, leurresDe,
    figureDisqueSvg, FORMULE_PERIMETRE, FORMULE_AIRE, diagnosticsArrondi, TAILLE_COTE_MAX
} from '../js/core/disque.js';
import { readFileSync } from 'node:fs';
import { evaluate } from '../js/core/items.js';
import { disqueGenerator } from '../js/core/generators/disque.js';

const ETAPES = MARCHES_DISQUE.map(m => m.id);

test('3,14 ET LA TOUCHE π DOIVENT TOMBER SUR LE MÊME ARRONDI', () => {
    // Le cas qui a motivé le filtre : un disque de rayon 11. Son aire vaut
    // 379,94 avec 3,14 et 380,13 avec π — au dixième, deux réponses.
    assert.equal(arrondiStable(121, 1), false, 'r = 11 : l’aire diverge au dixième');
    assert.equal(arrondiStable(121, 0), true, 'à l’unité, les deux méthodes s’accordent');

    // Et la garantie sur TOUS les tirages : entre 3,14 et π, la fonction est
    // croissante — si les deux bornes s'accordent, tout ce qu'il y a entre
    // s'accorde aussi. On le vérifie sur quelques valeurs intermédiaires.
    for (const marche of ['perimetre-arrondi', 'aire-arrondie']) {
        for (let k = 0; k < 60; k++) {
            const t = tirerDisque(makeRng(`pi-${marche}-${k}`), marche);
            const dec = decimalesDe(t.surLAire);
            [PI_COLLEGE, 3.1416, 3.14159, Math.PI].forEach(pi => {
                assert.equal(arrondir(t.coefficient * pi, dec), t.arrondi,
                    `${marche} r=${t.r} : π ≈ ${pi} donne un autre arrondi`);
            });
        }
    }
});

test('LE PÉRIMÈTRE S\'ARRONDIT AU DIXIÈME, L\'AIRE À L\'UNITÉ', () => {
    // Mesuré : au dixième, l'arrondi de l'aire n'est stable que pour trois
    // rayons sur dix — il ne resterait presque aucune variété. À l'unité, dix
    // sur dix. C'est aussi l'usage : « 380 cm² » se lit, « 380,1 cm² » affiche
    // une précision que la mesure n'a pas.
    assert.equal(decimalesDe(false), 1);
    assert.equal(decimalesDe(true), 0);
    const rayons = new Set();
    for (let k = 0; k < 80; k++) rayons.add(tirerDisque(makeRng(`v${k}`), 'aire-arrondie').r);
    assert.ok(rayons.size >= 6, `seulement ${rayons.size} rayons différents sur l’aire arrondie`);
});

test('UNE VALEUR EXACTE SE TAPE — avec la touche π, et sans son unité', () => {
    const total = ETAPES.length;
    const params = {
        reponseParMarche: ETAPES.map(id => `${id}:saisie`).join(',')
    };
    const genres = {};
    for (let i = 0; i < total; i++) {
        const it = disqueGenerator.generate(params, { index: i, total, rng: makeRng(`x${i}`) });
        genres[it.meta.marche] = it.answerKind;
        if (it.meta.marche === 'formule') {
            // « 2 × π × r » n'est pas un nombre : cette étape-là propose.
            assert.equal(it.answerKind, 'choice');
            assert.equal(it.choices.length, 4);
            assert.equal(it.meta.pi, false, 'aucune touche π sur une question de formule');
            continue;
        }
        assert.equal(it.answerKind, 'numeric', `${it.meta.marche} : la saisie doit être respectée`);
        if (ETAPES_EXACTES.includes(it.meta.marche)) {
            // Ce qu'on TAPE : le nombre et son π, rien d'autre. L'unité
            // s'affiche à côté de l'écran du pavé, comme partout ailleurs.
            assert.equal(it.meta.pi, true, `${it.meta.marche} : il faut la touche π`);
            assert.match(String(it.answer), /^\d+π$/, String(it.answer));
            assert.doesNotMatch(String(it.answer), /cm/);
            assert.ok(/^cm²?$/.test(it.meta.unit), `unité « ${it.meta.unit} »`);
            // La réponse tapée doit être ACCEPTÉE — c'est tout l'enjeu.
            assert.equal(evaluate(it, it.answer).correct, true);
        } else {
            assert.equal(it.meta.pi, false, 'pas de π dans un arrondi');
            assert.equal(typeof it.answer, 'number');
        }
    }
    assert.deepEqual(Object.keys(genres).sort(), [...ETAPES].sort());
});

test('et chaque étape obéit au réglage « à choisir »', () => {
    const total = ETAPES.length;
    const params = { reponseParMarche: ETAPES.map(id => `${id}:choix`).join(',') };
    for (let i = 0; i < total; i++) {
        const it = disqueGenerator.generate(params, { index: i, total, rng: makeRng(`y${i}`) });
        assert.equal(it.answerKind, 'choice', `${it.meta.marche}`);
        assert.equal(it.choices.filter(c => c.correct).length, 1);
        // En propositions, l'étiquette porte l'unité : c'est elle qui dit de
        // quoi l'on parle dans une liste de quatre.
        if (ETAPES_EXACTES.includes(it.meta.marche) && it.meta.marche !== 'formule') {
            assert.match(String(it.answer), /cm/, String(it.answer));
        }
    }
});

test('LE RAPPEL DE π EST TOUJOURS LÀ, et il ne donne jamais la réponse', () => {
    // Rémy : « Rappelle la valeur de Pi au départ. »
    const total = ETAPES.length;
    for (let i = 0; i < total; i++) {
        const it = disqueGenerator.generate({}, { index: i, total, rng: makeRng(`pi${i}`) });
        const outils = it.meta.outils || [];
        assert.equal(outils.length, 1);
        assert.equal(outils[0].id, 'pi');
        assert.match(outils[0].html, /3,141 592 6/);
        // Un outil qui contiendrait la réponse serait un bouton « tricher ».
        assert.doesNotMatch(outils[0].html, new RegExp(String(it.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
});

test('L\'ERREUR D\'ARRONDI SE NOMME — tronquer, rater le rang, ne pas arrondir', () => {
    // Rémy : « Explique l'erreur d'arrondi si l'élève en fait une. »
    let vusTronque = 0, vusRang = 0;
    for (let k = 0; k < 40; k++) {
        for (const marche of ['perimetre-arrondi', 'aire-arrondie']) {
            const t = tirerDisque(makeRng(`d${marche}${k}`), marche);
            const d = diagnosticsArrondi(t) || [];
            // Aucune valeur diagnostiquée ne vaut la bonne réponse : ce serait
            // expliquer une erreur à qui a juste.
            d.forEach(x => assert.notEqual(x.value, t.arrondi,
                `${t.arrondi} diagnostiqué comme une faute`));
            assert.equal(new Set(d.map(x => x.value)).size, d.length, 'deux fois la même valeur');
            d.forEach(x => assert.ok(x.why && x.why.length > 20, x.why));
            if (d.some(x => /COUPÉ/.test(x.why))) vusTronque++;
            if (d.some(x => /arrondi à l’unité|arrondi au dixième/.test(x.why))) vusRang++;
        }
    }
    // Les deux fautes se rencontrent pour de bon sur les tirages de l'exercice.
    assert.ok(vusTronque > 5, `tronqué reconnu ${vusTronque} fois`);
    assert.ok(vusRang > 5, `mauvais rang reconnu ${vusRang} fois`);

    // Et le diagnostic ARRIVE jusqu'à l'élève : c'est `evaluate` qui le rend.
    const t = tirerDisque(makeRng('diag'), 'perimetre-arrondi');
    const it = disqueGenerator.generate({ reponseParMarche: 'perimetre-arrondi:saisie' },
        { index: 4, total: 6, rng: makeRng('diag') });
    assert.ok(Array.isArray(it.diagnostics) && it.diagnostics.length, 'des diagnostics');
    const faux = it.diagnostics[0];
    const v = evaluate(it, faux.value);
    assert.equal(v.correct, false);
    assert.equal(v.misconception, faux.why);
    assert.ok(t.arrondi > 0);
});

test('UNE VALEUR EXACTE N\'A PAS DE DIAGNOSTIC D\'ARRONDI', () => {
    // Il n'y a rien à arrondir dans « 25π » : c'est le contraire de l'arrondi.
    for (const marche of ETAPES_EXACTES) {
        const t = tirerDisque(makeRng(`e${marche}`), marche);
        assert.equal(diagnosticsArrondi(t), null, marche);
    }
});

test('LES FORMULES NE SE CONFONDENT PAS', () => {
    for (let k = 0; k < 40; k++) {
        const t = tirerDisque(makeRng(`f${k}`), 'formule');
        const juste = reponseDe(t);
        assert.equal(juste, t.surLAire ? FORMULE_AIRE : FORMULE_PERIMETRE);
        // L'autre formule est toujours proposée : c'est LA confusion à lever.
        const autre = t.surLAire ? FORMULE_PERIMETRE : FORMULE_AIRE;
        assert.ok(leurresDe(t).some(l => l.value === autre),
            'la formule de l’autre grandeur doit figurer parmi les propositions');
    }
    // Et les deux questions tombent : ne poser que le périmètre ferait une
    // question à retenir une fois, pas à distinguer.
    const vues = new Set();
    for (let k = 0; k < 40; k++) vues.add(tirerDisque(makeRng(`fa${k}`), 'formule').surLAire);
    assert.equal(vues.size, 2, 'l’étape « quelle formule ? » doit alterner aire et périmètre');
});

test('LE DIAMÈTRE EST LE PIÈGE, ET IL EST POSÉ COMME TEL', () => {
    for (let k = 0; k < 40; k++) {
        const t = tirerDisque(makeRng(`d${k}`), 'diametre');
        assert.equal(t.d, 2 * t.r, 'le diamètre vaut deux rayons');
        assert.equal(enonceDe(t).includes(`diamètre de ${t.d}`), true, enonceDe(t));
        assert.equal(enonceDe(t).includes(`rayon`), false, 'l’énoncé ne doit pas donner le rayon');
        assert.equal(reponseDe(t), t.exact);
        // L'erreur « j'ai pris le diamètre pour le rayon » est proposée.
        assert.ok(leurresDe(t).some(l => String(l.value).startsWith(`${t.d * t.d}π`)),
            'le piège du diamètre doit figurer parmi les propositions');
        // La figure montre le diamètre, pas le rayon : sinon la question
        // n'aurait plus de difficulté.
        const svg = figureDisqueSvg(t);
        assert.ok(svg.includes(`${t.d} cm`), 'la figure doit porter le diamètre');
        assert.ok(!svg.includes(`>${t.r} cm<`), 'la figure ne doit pas donner le rayon');
    }
});

test('l\'unité suit la grandeur', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const t = tirerDisque(makeRng(`u-${marche}-${k}`), marche);
            const u = uniteDe(t);
            if (ETAPES_EXACTES.includes(marche)) {
                assert.equal(u, '', 'une valeur exacte porte déjà son unité');
                if (marche !== 'formule') {
                    assert.ok(t.exact.endsWith(t.surLAire ? 'cm²' : 'cm'), t.exact);
                }
            } else {
                assert.equal(u, t.surLAire ? 'cm²' : 'cm');
            }
        }
    }
});

test('l\'explication porte la réponse, et les indices ne la donnent pas', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const t = tirerDisque(makeRng(`e-${marche}-${k}`), marche);
            const dit = expliquer(t);
            assert.ok(dit.length <= 220, `${marche} : ${dit.length} caractères`);
            if (marche !== 'formule') {
                const attendu = ETAPES_EXACTES.includes(marche)
                    ? t.exact.split(' ')[0] : String(t.arrondi).replace('.', ',');
                assert.ok(dit.includes(attendu), `${marche} : ${attendu} absent de « ${dit} »`);
            }
            const indices = indicesDe(t);
            assert.equal(indices.length, 3, `${marche} : ${indices.length} indices`);
            indices.forEach(h => assert.ok(h.length < 110, `${marche} : indice trop long — ${h}`));
        }
    }
});

// Rémy : « Le robot n'aide pas et j'aimerai qu'il aide sur un calcul d'aire et
// de périmètre exact ». Le robot prononce le DERNIER indice juste avant de
// répondre : c'est donc lui qui doit porter l'opération, avec le rayon de la
// question — et sans le résultat, que l'élève finit.
test('LE DERNIER INDICE POSE LE CALCUL, avec le rayon, et pas le résultat', () => {
    for (const marche of ETAPES) {
        if (marche === 'formule') continue;
        for (let k = 0; k < 25; k++) {
            const t = tirerDisque(makeRng(`c-${marche}-${k}`), marche);
            const dernier = indicesDe(t)[2];
            const r = String(t.r).replace('.', ',');
            const attendu = t.surLAire ? `π × ${r} × ${r}` : `2 × π × ${r}`;
            assert.ok(dernier.includes(attendu),
                `${marche} : « ${attendu} » absent de « ${dernier} »`);
            // Le résultat n'y est pas : ni la valeur exacte, ni l'arrondie.
            const exactNu = t.exact.split(' ')[0];
            assert.equal(dernier.includes(exactNu), false,
                `${marche} : le dernier indice donne la réponse « ${exactNu} »`);
        }
    }
});

// « Une surface se mesure en cm² » se lisait sous une question qui portait sur
// un périmètre : sur l'étape des formules, les trois phrases étaient les mêmes
// des deux côtés.
test('SUR L\'ÉTAPE DES FORMULES, LES INDICES PARLENT DE LA GRANDEUR DEMANDÉE', () => {
    let vuAire = 0, vuPerimetre = 0;
    for (let k = 0; k < 60; k++) {
        const t = tirerDisque(makeRng(`f-${k}`), 'formule');
        const [premier, second] = indicesDe(t);
        if (t.surLAire) {
            vuAire++;
            assert.ok(/aire/i.test(premier), `aire : « ${premier} »`);
            assert.ok(/cm²/.test(second), `aire : « ${second} »`);
        } else {
            vuPerimetre++;
            assert.ok(/périmètre/i.test(premier), `périmètre : « ${premier} »`);
            assert.equal(/cm²/.test(second), false, `périmètre : « ${second} »`);
        }
    }
    // Les deux sortes sortent : sinon le test ne vérifierait qu'une moitié.
    assert.ok(vuAire > 5 && vuPerimetre > 5, `${vuAire} aires, ${vuPerimetre} périmètres`);
});

test('LES FAUSSES RÉPONSES SONT TOUTES DIFFÉRENTES, ET AUCUNE N\'EST LA BONNE', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const t = tirerDisque(makeRng(`l-${marche}-${k}`), marche);
            const juste = String(reponseDe(t));
            const leurres = leurresDe(t);
            assert.ok(leurres.length >= 3, `${marche} : ${leurres.length} leurre(s)`);
            const vus = new Set();
            leurres.forEach(l => {
                const cle = String(l.value);
                assert.notEqual(cle, juste, `${marche} : un leurre vaut la bonne réponse`);
                assert.equal(vus.has(cle), false, `${marche} : leurre en double « ${cle} »`);
                vus.add(cle);
                assert.ok(l.why && l.why.length > 15, `${marche} : leurre sans explication`);
            });
        }
    }
});

test('CHAQUE ÉTAPE COCHÉE EST JOUÉE, et la figure part avec la question', () => {
    const total = ETAPES.length;
    const vues = new Set();
    for (let i = 0; i < total; i++) {
        const it = disqueGenerator.generate({}, { index: i, total, rng: makeRng(`g${i}`) });
        vues.add(it.meta.marche);
        assert.ok(it.prompt.html.includes('<svg'), 'la question doit porter sa figure');
        assert.ok(['mes.perimetre.disque', 'mes.aire.disque'].includes(it.skillId));
    }
    assert.deepEqual([...vues].sort(), [...ETAPES].sort());
});


// --- La taille du dessin -------------------------------------------------------

test('LE CADRE ÉPOUSE LE DESSIN — pas un tiers de blanc autour', () => {
    // Rémy, sur son téléphone : « C'est petit non ? » Mesuré alors : boîte de
    // 351 × 161, cercle de 109. Le cadre valait 200 pour un dessin qui tient
    // dans 139 — et le plafond de hauteur s'applique au CADRE, donc ce blanc
    // était payé en taille de cercle.
    //
    // Le cercle doit occuper l'essentiel du cadre. Sous 85 %, on recommence à
    // payer du vide.
    for (const m of MARCHES_DISQUE) {
        for (let k = 0; k < 20; k++) {
            const t = tirerDisque(makeRng(`cadre${m.id}${k}`), m.id);
            const svg = figureDisqueSvg(t);
            const vb = /viewBox="([^"]+)"/.exec(svg);
            assert.ok(vb, 'pas de viewBox');
            const [x, y, w, h] = vb[1].split(' ').map(Number);
            assert.equal(w, h, 'le cadre reste carré : sinon le cercle saute d’une question à l’autre');
            // Le cercle a pour rayon 68 dans le repère du dessin.
            assert.ok(136 / w >= 0.85, `${m.id} : le cercle n’occupe que ${Math.round(136 / w * 100)} % du cadre`);
            // Et il tient dedans, bord compris.
            const r = /<circle cx="([\d.]+)" cy="([\d.]+)" r="68"/.exec(svg);
            assert.ok(r, 'cercle introuvable');
            const [, cx, cy] = r.map(Number);
            assert.ok(cx - 69 >= x && cy - 69 >= y, `${m.id} : le cercle sort du cadre`);
            assert.ok(cx + 69 <= x + w && cy + 69 <= y + h, `${m.id} : le cercle sort du cadre`);
        }
    }
});

test('LE CADRE RÉSERVE LA PLACE DE LA PLUS GROSSE COTE — celle du téléphone', () => {
    // Le cadre est calculé une fois, à la génération, sans rien savoir de
    // l'écran ; mais la feuille de style GROSSIT les cotes dans le viewBox sur
    // un petit plateau. Si les deux valeurs se désaccordent, la cote sort du
    // cadre — et `.fig-svg` laisse déborder, donc elle irait s'écrire par-dessus
    // ce qu'il y a autour, sans que rien ne prévienne.
    const css = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8');
    const tailles = [...css.matchAll(/\.dsq-cote\s*\{[^}]*font-size:\s*(\d+)px/g)]
        .map(m => Number(m[1]));
    assert.ok(tailles.length >= 2, 'les paliers du téléphone ont disparu');
    assert.equal(Math.max(...tailles), TAILLE_COTE_MAX,
        `la feuille de style monte à ${Math.max(...tailles)} px, le cadre en réserve ${TAILLE_COTE_MAX}`);
});

test('LA COTE DU RAYON EST UNE LONGUEUR, JAMAIS UNE AIRE', () => {
    // Rémy, sur le polycopié : « tu marques 18 cm² pour la longueur du rayon ou
    // diamètre ». La fiche n'avait sous la main que `meta.unit`, qui est
    // l'unité de la RÉPONSE — des centimètres carrés dès qu'on demande une aire
    // — et l'écrivait le long du segment. Un rayon de dix-huit centimètres
    // carrés n'existe pas, et c'est exactement la confusion aire / longueur que
    // le chapitre travaille à défaire. `uniteLongueur` la porte à part.
    const gen = disqueGenerator;
    let vuesAires = 0;
    for (let i = 0; i < 40; i++) {
        const it = gen.generate({}, { index: i, total: 40, rng: makeRng(`cote-${i}`) });
        assert.equal(it.meta.uniteLongueur, 'cm', 'la cote se mesure en centimètres');
        assert.ok(!/²/.test(it.meta.uniteLongueur));
        if (it.meta.surLAire) vuesAires++;
    }
    assert.ok(vuesAires > 0, 'on doit avoir croisé des questions d\'aire');
});
