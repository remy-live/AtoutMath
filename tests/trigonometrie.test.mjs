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
    sommetDroit, sommetVise, pointsDe, questionsDe, verifier, conseil, laLecon
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
