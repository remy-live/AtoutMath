// Repérer les côtés d'un triangle rectangle — la marche avant toute formule.
//
// Rémy : « on va commencer un exercice sur la trigonométrie où il faut repérer
// le côté adjacent, l'opposé et l'hypoténuse ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    ROLES, tirerTriangle, rolesDe, cotesDe, roleDe, memeCote, nomCote,
    sommetDroit, sommetVise, pointsDe, questionsDe, verifier, conseil, laLecon,
    lireCote, avecCrochets, questionEcrite, verifierEcrit,
    FONCTIONS, ORDRE_FONCTIONS, formuleDe, verifierFormule, conseilFormule,
    laLeconFormule, MEMO
} from '../js/core/trigonometrie.js';

const tirage = (n = 200) => Array.from({ length: n }, (_, i) => tirerTriangle(makeRng('tri' + i)));

test('LES TROIS RÔLES SONT TROIS CÔTÉS DIFFÉRENTS', () => {
    // MESURÉ SUR LE PREMIER JET, ET C'EST CE QUI L'A FAIT CORRIGER : l'adjacent
    // joignait l'angle visé au sommet RESTANT au lieu de l'angle droit. Sur un
    // triangle IJK rectangle en J, angle visé en K, il rendait « IK » —
    // c'est-à-dire l'hypoténuse elle-même. L'exercice devenait insoluble, et la
    // faute était invisible sur la moitié des tirages.
    tirage().forEach(t => {
        const r = rolesDe(t);
        const trois = [r[ROLES.HYPOTENUSE], r[ROLES.OPPOSE], r[ROLES.ADJACENT]];
        const clefs = trois.map(x => x.split('').sort().join(''));
        assert.equal(new Set(clefs).size, 3,
            `${t.nom} (droit ${sommetDroit(t)}, visé ${sommetVise(t)}) : ${trois.join(' / ')}`);
        // Et ce sont bien les trois côtés du triangle, pas d'autres.
        const attendus = cotesDe(t).map(x => x.split('').sort().join('')).sort();
        assert.deepEqual(clefs.slice().sort(), attendus);
    });
});

test('L\'HYPOTÉNUSE NE DÉPEND PAS DE L\'ANGLE CONSIDÉRÉ', () => {
    // C'est le seul repère fixe de la figure, et c'est pour cela qu'on la
    // cherche en premier : quand tout bouge, elle ne bouge pas.
    tirage(100).forEach(t => {
        const autre = { ...t, angleVise: [0, 1, 2].find(i => i !== t.angleDroit && i !== t.angleVise) };
        assert.equal(rolesDe(t)[ROLES.HYPOTENUSE], rolesDe(autre)[ROLES.HYPOTENUSE],
            `${t.nom} : l'hypoténuse a changé avec l'angle`);
        // Et elle ne touche jamais l'angle droit.
        assert.equal(rolesDe(t)[ROLES.HYPOTENUSE].includes(sommetDroit(t)), false);
    });
});

test('L\'OPPOSÉ NE TOUCHE PAS L\'ANGLE, L\'ADJACENT LE TOUCHE', () => {
    // Les deux définitions, vérifiées sur la lettre des sommets — c'est ce
    // qu'un élève lit sur la figure.
    tirage().forEach(t => {
        const r = rolesDe(t);
        const A = sommetVise(t), D = sommetDroit(t);
        assert.equal(r[ROLES.OPPOSE].includes(A), false, `${t.nom} : l'opposé touche l'angle`);
        assert.equal(r[ROLES.ADJACENT].includes(A), true, `${t.nom} : l'adjacent ne touche pas l'angle`);
        // Et l'adjacent est bien celui qui touche AUSSI l'angle droit : c'est
        // ce qui le distingue de l'hypoténuse, qui touche l'angle elle aussi.
        assert.equal(r[ROLES.ADJACENT].includes(D), true);
        assert.equal(r[ROLES.HYPOTENUSE].includes(A), true,
            'l\'hypoténuse touche l\'angle visé — c\'est pour cela qu\'on la confond');
    });
});

test('L\'ANGLE CONSIDÉRÉ N\'EST JAMAIS L\'ANGLE DROIT', () => {
    // « Adjacent à l'angle droit » n'a pas de sens : les deux côtés qui le
    // touchent sont les cathètes et l'hypoténuse est en face. La question ne se
    // pose que pour un angle aigu.
    tirage().forEach(t => {
        assert.notEqual(t.angleVise, t.angleDroit, `${t.nom} : angle visé = angle droit`);
    });
});

test('LA FIGURE TOURNE — sinon on apprend « adjacent = horizontal »', () => {
    // Un triangle toujours dessiné l'angle droit en bas à gauche enseigne une
    // règle fausse qui s'effondre au premier contrôle. On vérifie donc que les
    // orientations se répartissent vraiment, et pas seulement qu'un champ
    // existe.
    const angles = tirage(120).map(t => t.orientation);
    assert.ok(new Set(angles).size > 60, `seulement ${new Set(angles).size} orientations`);
    const quadrants = new Set(angles.map(a => Math.floor(a / 90)));
    assert.equal(quadrants.size, 4, 'les quatre quarts de tour doivent être représentés');
    // Et l'on peut la figer quand on veut une figure de référence.
    assert.equal(tirerTriangle(makeRng('fixe'), { tourner: false }).orientation, 0);
});

test('LE TRIANGLE DESSINÉ EST BIEN RECTANGLE, quelle que soit l\'orientation', () => {
    // La figure est calculée dans le noyau pour que l'écran et le papier
    // dessinent le même triangle — et pour qu'un test puisse la mesurer sans
    // ouvrir un navigateur.
    tirage(100).forEach(t => {
        const p = pointsDe(t, 100);
        assert.equal(p.length, 3);
        p.forEach(q => {
            assert.ok(q.x >= -0.01 && q.x <= 100.01, `x hors cadre : ${q.x}`);
            assert.ok(q.y >= -0.01 && q.y <= 100.01, `y hors cadre : ${q.y}`);
        });
        // L'angle droit est bien à l'endroit annoncé : le produit scalaire des
        // deux côtés qui en partent doit être nul.
        const d = t.angleDroit;
        const autres = [0, 1, 2].filter(i => i !== d);
        const u = { x: p[autres[0]].x - p[d].x, y: p[autres[0]].y - p[d].y };
        const v = { x: p[autres[1]].x - p[d].x, y: p[autres[1]].y - p[d].y };
        const nu = Math.hypot(u.x, u.y), nv = Math.hypot(v.x, v.y);
        const cos = (u.x * v.x + u.y * v.y) / (nu * nv);
        assert.ok(Math.abs(cos) < 1e-9, `${t.nom} : l'angle en ${sommetDroit(t)} vaut `
            + `${(Math.acos(cos) * 180 / Math.PI).toFixed(1)}° et non 90°`);
        // Et la figure occupe le cadre : une figure minuscule dans un coin est
        // illisible, et c'est ce que donne un recentrage oublié.
        const xs = p.map(q => q.x), ys = p.map(q => q.y);
        const large = Math.max(...xs) - Math.min(...xs);
        const haut = Math.max(...ys) - Math.min(...ys);
        assert.ok(Math.max(large, haut) > 99, `figure trop petite : ${large} x ${haut}`);
    });
});

test('LE REFUS NOMME LA CONFUSION, et elles ne se ressemblent pas', () => {
    // C'est la raison d'être du module plutôt qu'un simple « faux » : un élève
    // qui prend l'hypoténuse pour l'adjacent n'a pas fait la même erreur que
    // celui qui confond adjacent et opposé.
    const t = tirerTriangle(makeRng('refus'));
    const r = rolesDe(t);

    assert.equal(verifier(t, ROLES.ADJACENT, r[ROLES.ADJACENT]).ok, true);
    // L'ordre des lettres n'est pas la chose : « AB » et « BA » sont le même côté.
    assert.equal(verifier(t, ROLES.ADJACENT,
        r[ROLES.ADJACENT].split('').reverse().join('')).ok, true);

    // LA FAUTE DU CHAPITRE : l'hypoténuse touche l'angle, elle aussi.
    const a = verifier(t, ROLES.ADJACENT, r[ROLES.HYPOTENUSE]);
    assert.equal(a.ok, false);
    assert.equal(a.faute, 'adjacent-hypotenuse');
    assert.match(a.raison, /touche bien l'angle/);
    assert.match(a.raison, /HYPOTÉNUSE/);

    // L'échange adjacent / opposé : on n'a pas regardé quel angle on considère.
    const b = verifier(t, ROLES.OPPOSE, r[ROLES.ADJACENT]);
    assert.equal(b.ok, false);
    assert.equal(b.faute, 'echange');

    const c = verifier(t, ROLES.HYPOTENUSE, r[ROLES.ADJACENT]);
    assert.equal(c.ok, false);
    assert.equal(c.faute, 'hypotenuse');
    assert.match(c.raison, /ANGLE DROIT/);

    // Un côté qui n'est pas du triangle est refusé sans inventer de diagnostic.
    const d = verifier(t, ROLES.OPPOSE, 'XY');
    assert.equal(d.ok, false);
    assert.match(d.raison, /n'est pas un côté/);
});

test('L\'AIDE NE DONNE JAMAIS LE NOM DU CÔTÉ', () => {
    // Une aide qui répond n'apprend rien : elle rend la question inutile pour
    // celui qui la lit, et l'exercice se termine sans que personne ait cherché.
    tirage(40).forEach(t => {
        const r = rolesDe(t);
        Object.values(ROLES).forEach(role => {
            const texte = conseil(t, role);
            assert.ok(texte.length > 40, 'une aide doit dire quelque chose');
            // Le nom du côté cherché n'y figure pas — dans un sens ni dans l'autre.
            const cherche = r[role];
            const envers = cherche.split('').reverse().join('');
            assert.equal(texte.includes(cherche), false,
                `l'aide de « ${role} » donne la réponse ${cherche} : ${texte}`);
            assert.equal(texte.includes(envers), false);
        });
    });
});

test('LES TROIS QUESTIONS COMMENCENT PAR L\'HYPOTÉNUSE', () => {
    // C'est le seul repère qui ne dépend pas de l'angle : le trouver donne un
    // point d'appui pour les deux autres, et c'est l'ordre où on l'enseigne.
    const t = tirerTriangle(makeRng('q'));
    const qs = questionsDe(t);
    assert.deepEqual(qs.map(q => q.role), [ROLES.HYPOTENUSE, ROLES.OPPOSE, ROLES.ADJACENT]);
    const r = rolesDe(t);
    qs.forEach(q => assert.equal(q.attendu, r[q.role]));
    // Et l'on peut demander un autre ordre quand on veut ne travailler qu'un rôle.
    assert.deepEqual(questionsDe(t, { ordre: [ROLES.ADJACENT] }).map(q => q.role),
        [ROLES.ADJACENT]);
});

test('LA LEÇON RÉCAPITULE LES TROIS CÔTÉS DE CETTE FIGURE-LÀ', () => {
    const t = tirerTriangle(makeRng('lecon'));
    const r = rolesDe(t);
    const texte = laLecon(t);
    Object.values(r).forEach(nom => assert.ok(texte.includes(nom), `${nom} manque : ${texte}`));
    assert.ok(texte.includes(sommetDroit(t)) && texte.includes(sommetVise(t)));
});

test('DEUX CÔTÉS SE COMPARENT SANS TENIR COMPTE DE L\'ORDRE DES LETTRES', () => {
    assert.equal(memeCote('AB', 'BA'), true);
    assert.equal(memeCote('AB', 'AB'), true);
    assert.equal(memeCote('AB', 'AC'), false);
    assert.equal(memeCote('', null), true, 'deux riens sont égaux, et ne plantent pas');
    const t = tirerTriangle(makeRng('cote'), { tourner: false });
    assert.equal(nomCote(t, 2, 0), nomCote(t, 0, 2), 'le nom d\'un côté ne dépend pas du sens');
    assert.equal(roleDe(t, rolesDe(t)[ROLES.OPPOSE]), ROLES.OPPOSE);
    assert.equal(roleDe(t, 'ZZ'), null);
});


/* ═══════════════ ÉCRIRE LE CÔTÉ, ET NON LE MONTRER ═══════════════════════ */
//
// Rémy : « tu peux aussi poser une question quel est le côté opposé à G […] et
// il peut aussi l'écrire avec les crochets. »

test('LES CROCHETS SONT ACCEPTÉS, PAS EXIGÉS', () => {
    // [AB] est le SEGMENT, (AB) la droite, AB la longueur. On veut voir la
    // bonne notation arriver, mais refuser « AB » dans un exercice qui porte
    // sur le REPÉRAGE reviendrait à sanctionner une notation là où l'on
    // apprend autre chose.
    for (const ecrit of ['[AB]', 'AB', '(AB)', ' ab ', 'A B', '[ a b ]']) {
        assert.equal(lireCote(ecrit), 'AB', ecrit);
    }
    for (const ecrit of ['A', 'ABC', '', '12', null]) {
        assert.equal(lireCote(ecrit), '', String(ecrit));
    }
    // Et l'on SAIT si les crochets y étaient : c'est ce qui permet de les
    // saluer sans les imposer.
    assert.equal(avecCrochets('[AB]'), true);
    assert.equal(avecCrochets('AB'), false);
    assert.equal(avecCrochets('(AB)'), false);
});

test('la question est celle du professeur, pas celle de la machine', () => {
    const t = tirerTriangle(makeRng('q1'));
    const A = sommetVise(t);
    assert.equal(questionEcrite(t, ROLES.OPPOSE), `Quel est le côté opposé à l'angle en ${A} ?`);
    assert.equal(questionEcrite(t, ROLES.ADJACENT), `Quel est le côté adjacent à l'angle en ${A} ?`);
    // L'hypoténuse ne dépend d'aucun angle : la question ne le mentionne pas.
    assert.doesNotMatch(questionEcrite(t, ROLES.HYPOTENUSE), /angle en/);
});

test('UNE ÉCRITURE QUI N\'EN EST PAS UNE SE DIT AUTREMENT QU\'UN MAUVAIS CÔTÉ', () => {
    // « G » et « GH » ne se corrigent pas de la même façon : le premier n'a pas
    // compris comment on nomme un segment, le second a mal lu la figure.
    const t = tirerTriangle(makeRng('q2'));
    const r = rolesDe(t);
    assert.equal(verifierEcrit(t, ROLES.OPPOSE, sommetVise(t)).faute, 'ecriture');
    assert.equal(verifierEcrit(t, ROLES.OPPOSE, t.nom).faute, 'ecriture');
    assert.equal(verifierEcrit(t, ROLES.OPPOSE, '').faute, 'ecriture');
    const L = t.sommets[0];
    assert.equal(verifierEcrit(t, ROLES.OPPOSE, L + L).faute, 'ecriture');
    for (const ecrit of [r[ROLES.OPPOSE], `[${r[ROLES.OPPOSE]}]`,
        r[ROLES.OPPOSE].split('').reverse().join('')]) {
        assert.equal(verifierEcrit(t, ROLES.OPPOSE, ecrit).ok, true, ecrit);
    }
    assert.equal(verifierEcrit(t, ROLES.OPPOSE, `[${r[ROLES.OPPOSE]}]`).crochets, true);
    assert.equal(verifierEcrit(t, ROLES.OPPOSE, r[ROLES.OPPOSE]).crochets, false);
});

/* ═══════════════════════ ÉCRIRE LA FORMULE ═══════════════════════════════ */

test('LES TROIS RAPPORTS SONT CEUX DU COURS', () => {
    assert.equal(FONCTIONS.cos.haut, ROLES.ADJACENT);
    assert.equal(FONCTIONS.cos.bas, ROLES.HYPOTENUSE);
    assert.equal(FONCTIONS.sin.haut, ROLES.OPPOSE);
    assert.equal(FONCTIONS.sin.bas, ROLES.HYPOTENUSE);
    assert.equal(FONCTIONS.tan.haut, ROLES.OPPOSE);
    assert.equal(FONCTIONS.tan.bas, ROLES.ADJACENT);
    // L'hypoténuse est au dénominateur des deux premiers et absente du
    // troisième : c'est le seul repère utile derrière le moyen mnémotechnique.
    assert.notEqual(FONCTIONS.tan.haut, ROLES.HYPOTENUSE);
    assert.notEqual(FONCTIONS.tan.bas, ROLES.HYPOTENUSE);
    ['CAH', 'SOH', 'TOA'].forEach(m => assert.match(MEMO, new RegExp(m)));
});

test('la formule s\'écrit comme au tableau, sur la figure tirée', () => {
    for (let i = 0; i < 60; i++) {
        const t = tirerTriangle(makeRng('f' + i));
        const r = rolesDe(t);
        for (const cle of ORDRE_FONCTIONS) {
            const f = formuleDe(t, cle);
            assert.equal(f.gauche, `${cle}(${sommetVise(t)})`);
            assert.equal(f.attenduHaut, r[FONCTIONS[cle].haut]);
            assert.equal(f.attenduBas, r[FONCTIONS[cle].bas]);
            assert.equal(f.texte, `${cle}(${sommetVise(t)}) = [${f.attenduHaut}] / [${f.attenduBas}]`);
            // LE RAPPEL DU DÉPART NE NOMME JAMAIS DE CÔTÉ : il donne le rapport
            // et laisse la lecture de la figure à l'élève. Sinon l'aide fait
            // l'exercice.
            assert.doesNotMatch(f.rappel, new RegExp(f.attenduHaut));
            assert.doesNotMatch(f.rappel, new RegExp(f.attenduBas));
        }
    }
});

test('LA FRACTION RENVERSÉE A SON PROPRE DIAGNOSTIC', () => {
    // Ce n'est pas « à moitié juste » : les deux côtés sont les bons, ils sont
    // à l'envers. Nommer cette faute est la seule façon de dire à l'élève ce
    // qu'il doit revoir — le rapport, et non la figure.
    for (let i = 0; i < 40; i++) {
        const t = tirerTriangle(makeRng('r' + i));
        for (const cle of ORDRE_FONCTIONS) {
            const f = formuleDe(t, cle);
            const v = verifierFormule(t, cle, f.attenduBas, f.attenduHaut);
            assert.equal(v.ok, false);
            assert.equal(v.faute, 'renversee', `${cle} sur ${t.nom}`);
            assert.match(v.raison, /autre sens|inverse/);
        }
    }
});

test('la formule juste passe, quelle que soit l\'écriture', () => {
    const t = tirerTriangle(makeRng('ok'));
    const f = formuleDe(t, 'cos');
    const inverse = (n) => n.split('').reverse().join('');
    assert.equal(verifierFormule(t, 'cos', f.attenduHaut, f.attenduBas).ok, true);
    assert.equal(verifierFormule(t, 'cos', `[${f.attenduHaut}]`, `[${f.attenduBas}]`).ok, true);
    assert.equal(verifierFormule(t, 'cos', inverse(f.attenduHaut), f.attenduBas).ok, true);
    // Les crochets sont relevés quand ils sont aux DEUX cases : la moitié ne
    // fait pas une habitude.
    assert.equal(verifierFormule(t, 'cos', `[${f.attenduHaut}]`, `[${f.attenduBas}]`).crochets, true);
    assert.equal(verifierFormule(t, 'cos', `[${f.attenduHaut}]`, f.attenduBas).crochets, false);
});

test('un côté mal repéré dit OÙ, et pourquoi', () => {
    const t = tirerTriangle(makeRng('c1'));
    const f = formuleDe(t, 'cos');
    const r = rolesDe(t);
    const v = verifierFormule(t, 'cos', r[ROLES.HYPOTENUSE], f.attenduBas);
    assert.equal(v.ok, false);
    assert.equal(v.ou, 'haut');
    assert.match(v.raison, /NUMÉRATEUR/);
    const w = verifierFormule(t, 'cos', f.attenduHaut, r[ROLES.OPPOSE]);
    assert.equal(w.ok, false);
    assert.equal(w.ou, 'bas');
    assert.match(w.raison, /DÉNOMINATEUR/);
});

test('une case vide n\'est pas une erreur de géométrie', () => {
    const t = tirerTriangle(makeRng('vide'));
    const f = formuleDe(t, 'cos');
    assert.equal(verifierFormule(t, 'cos', '', f.attenduBas).faute, 'ecriture');
    assert.equal(verifierFormule(t, 'cos', f.attenduHaut, 'X').faute, 'ecriture');
});

test('L\'AIDE DONNE LE RAPPORT, JAMAIS LE CÔTÉ', () => {
    for (let i = 0; i < 30; i++) {
        const t = tirerTriangle(makeRng('a' + i));
        for (const cle of ORDRE_FONCTIONS) {
            const f = formuleDe(t, cle);
            const c = conseilFormule(t, cle);
            assert.match(c, new RegExp(FONCTIONS[cle].memo));
            assert.doesNotMatch(c, new RegExp(`\\b${f.attenduHaut}\\b`), c);
            assert.doesNotMatch(c, new RegExp(`\\b${f.attenduBas}\\b`), c);
            // La leçon, elle, la donne : elle vient APRÈS la réponse.
            assert.match(laLeconFormule(t, cle), new RegExp(f.attenduHaut));
        }
    }
});

// ---------------------------------------------------------------------------
// LA FICHE PAPIER
//
// Rémy, quand je lui ai demandé quels exercices manquaient de fiche :
// « Hypoténuse, Opposé, Adjacent, et Les Fonctions : Image et Antécédent ».

test('LA FICHE DEMANDE CE QUE LA FIGURE PERMET DE RÉPONDRE', async () => {
    const { trigoCotesGenerator } = await import('../js/core/generators/trigoCotes.js');
    for (let i = 0; i < 60; i++) {
        const it = trigoCotesGenerator.generate({ quoi: 'noms', tourner: true },
            { rng: makeRng('fiche' + i) });
        const t = it.meta.triangle;
        const r = rolesDe(t);
        // L'ANGLE MARQUÉ N'EST JAMAIS L'ANGLE DROIT : « adjacent à l'angle
        // droit » n'a pas de sens, les deux côtés qui le touchent sont les
        // cathètes. Une fiche qui le demanderait n'aurait pas de réponse.
        assert.notEqual(it.meta.angle, it.meta.droit);
        assert.equal(it.meta.lignes.length, 3);
        // Les trois réponses sont trois côtés DIFFÉRENTS du triangle : si deux
        // se répétaient, une des trois définitions serait fausse.
        const rep = it.meta.lignes.map(l => l.solution.replace(/[[\]]/g, ''));
        assert.equal(new Set(rep.map(x => x.split('').sort().join(''))).size, 3);
        const cotes = cotesDe(t);
        rep.forEach(c => assert.ok(cotes.some(x => memeCote(x, c)),
            `${c} n'est pas un côté de ${t.nom}`));
        // Et chacune est bien le rôle annoncé par son étiquette.
        assert.ok(memeCote(rep[0], r[ROLES.HYPOTENUSE]));
        assert.ok(memeCote(rep[1], r[ROLES.OPPOSE]));
        assert.ok(memeCote(rep[2], r[ROLES.ADJACENT]));
    }
});

test('LA FICHE DES FORMULES REND UNE FORMULE COMPLÈTE', async () => {
    const { trigoCotesGenerator } = await import('../js/core/generators/trigoCotes.js');
    const vues = new Set();
    for (let i = 0; i < 60; i++) {
        const it = trigoCotesGenerator.generate({ quoi: 'formule', tourner: true },
            { rng: makeRng('form' + i) });
        assert.equal(it.meta.lignes.length, 1);
        const l = it.meta.lignes[0];
        const m = /^(cos|sin|tan)\((\w)\) =$/.exec(l.etiquette);
        assert.ok(m, `étiquette inattendue : ${l.etiquette}`);
        vues.add(m[1]);
        // Le sommet nommé dans la formule est l'angle MARQUÉ sur la figure —
        // sinon l'élève lit un angle et calcule pour un autre.
        assert.equal(m[2], it.meta.angle);
        const attendu = formuleDe(it.meta.triangle, m[1]);
        assert.equal(l.solution, `[${attendu.attenduHaut}] / [${attendu.attenduBas}]`);
    }
    // LES TROIS FONCTIONS SORTENT. Le cosinus est le seul qu'on révise
    // spontanément ; une feuille qui ne tirerait que lui laisserait la tangente
    // — celle qu'on rate — jamais travaillée.
    assert.deepEqual([...vues].sort(), ['cos', 'sin', 'tan']);
});

test('SANS ROTATION, LES FIGURES SONT TOUTES POSÉES PAREIL', async () => {
    const { trigoCotesGenerator } = await import('../js/core/generators/trigoCotes.js');
    // C'est le réglage de la découverte, et il doit vraiment figer la figure :
    // « adjacent = horizontal » est une règle fausse qu'on veut pouvoir
    // enseigner UNE fois, puis casser.
    for (let i = 0; i < 20; i++) {
        const it = trigoCotesGenerator.generate({ quoi: 'noms', tourner: false },
            { rng: makeRng('fixe' + i) });
        assert.equal(it.meta.triangle.orientation, 0);
    }
});
