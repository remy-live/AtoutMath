import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    FAMILLES, IDS_FAMILLES, famillesDe, tirerProbleme, direReponse, accorder, prix, nombre, deElide
} from '../js/core/problemes.js';
import { makeRng } from '../js/core/ids.js';

const TOUTES = IDS_FAMILLES;

test('il y a de quoi ne pas se lasser', () => {
    // La demande était « beaucoup de styles de problèmes différents ». Dix
    // familles, ce n'est pas un chiffre rond choisi au hasard : c'est la
    // typologie du cycle 3 couverte.
    assert.ok(TOUTES.length >= 10, `seulement ${TOUTES.length} familles`);
    const skills = new Set(TOUTES.map(f => FAMILLES[f].skill));
    assert.ok(skills.size >= 6, 'les familles doivent travailler des compétences distinctes');
});

test('chaque problème tiré est complet et jouable', () => {
    for (const f of TOUTES) {
        for (let g = 1; g <= 30; g++) {
            const p = tirerProbleme(f, makeRng(`${f}-${g}`));
            assert.ok(p, `${f} graine ${g} : aucun problème tiré`);
            assert.ok(p.enonce && p.enonce.length > 15, `${f} : énoncé trop court`);
            assert.ok(p.question && /\?$/.test(p.question.trim()), `${f} : la question doit finir par « ? »`);
            assert.equal(typeof p.reponse, 'number');
            assert.ok(isFinite(p.reponse), `${f} : réponse non finie`);
            assert.ok(p.schema && p.schema.genre, `${f} : pas de schéma`);
            assert.ok(p.etapes.length >= 2, `${f} : correction trop courte`);
        }
    }
});

test('quatre propositions, une seule juste, et jamais deux fois la même', () => {
    for (const f of TOUTES) {
        for (let g = 1; g <= 25; g++) {
            const p = tirerProbleme(f, makeRng(`c-${f}-${g}`));
            assert.equal(p.choix.length, 4, `${f} : ${p.choix.length} propositions`);
            assert.equal(p.choix.filter(c => c.juste).length, 1, `${f} : pas une seule bonne réponse`);
            const vus = p.choix.map(c => Math.round(c.v * 100));
            assert.equal(new Set(vus).size, 4, `${f} graine ${g} : deux propositions identiques`);
            p.choix.forEach(c => assert.ok(c.v >= 0, `${f} : proposition négative`));
        }
    }
});

test('chaque mauvaise réponse EXPLIQUE l\'erreur qu\'elle traduit', () => {
    // Une distractrice tirée au hasard ne sert qu'à faire rater. Une
    // distractrice qui est le résultat de l'erreur classique permet de dire à
    // l'élève ce qu'il a fait — c'est là toute la différence.
    for (const f of TOUTES) {
        const p = tirerProbleme(f, makeRng(`why-${f}`));
        p.choix.filter(c => !c.juste).forEach(c => {
            assert.ok(c.pourquoi && c.pourquoi.length > 20,
                `${f} : mauvaise réponse sans explication (${c.v})`);
        });
    }
});

test('la bonne réponse est vraiment la bonne — vérification arithmétique', () => {
    const rng = () => makeRng('verif');
    // Composition : le total est bien la somme des deux parts du schéma.
    for (let g = 1; g <= 20; g++) {
        const p = tirerProbleme('composition', makeRng(`v${g}`));
        const [a, b] = p.schema.parts.map(x => x.n);
        assert.equal(p.reponse, a + b);
    }
    // Complément : part connue + réponse = total.
    for (let g = 1; g <= 20; g++) {
        const p = tirerProbleme('complement', makeRng(`w${g}`));
        assert.equal(p.schema.parts[0].n + p.reponse, p.schema.total);
    }
    // Groupes : n × par.
    for (let g = 1; g <= 20; g++) {
        const p = tirerProbleme('groupes', makeRng(`x${g}`));
        assert.equal(p.reponse, p.schema.n * p.schema.par);
    }
    // Quotition : total = q × par + reste, et le reste est plus petit que par.
    for (let g = 1; g <= 20; g++) {
        const p = tirerProbleme('quotition', makeRng(`y${g}`));
        const s = p.schema;
        assert.equal(s.total, p.reponse * s.par + s.reste);
        assert.ok(s.reste > 0 && s.reste < s.par, 'le reste doit être strictement plus petit que le paquet');
    }
    // Partage : la division tombe juste.
    for (let g = 1; g <= 20; g++) {
        const p = tirerProbleme('partage', makeRng(`z${g}`));
        assert.equal(p.schema.total, p.reponse * p.schema.n);
    }
    assert.ok(rng);
});

test('la proportionnalité passe par l\'unité, et le tableau le montre', () => {
    for (let g = 1; g <= 25; g++) {
        const p = tirerProbleme('proportion', makeRng(`p${g}`));
        const [l1, lu, l2] = p.schema.lignes;
        assert.equal(lu[0], 1, 'la ligne du milieu doit être le prix unitaire');
        // Le rapport est constant : c'est la définition.
        const n1 = l1[0], n2 = l2[0];
        const prix1 = parseFloat(String(l1[1]).replace(',', '.'));
        assert.ok(Math.abs(p.reponse / n2 - prix1 / n1) < 0.005,
            `graine ${g} : le prix unitaire n'est pas constant`);
    }
});

test('la fraction d\'une quantité tombe toujours sur un entier', () => {
    for (let g = 1; g <= 30; g++) {
        const p = tirerProbleme('fraction', makeRng(`f${g}`));
        const s = p.schema;
        assert.equal(s.total % s.den, 0, 'le total doit être divisible par le dénominateur');
        assert.equal(p.reponse, s.num * (s.total / s.den));
        assert.ok(s.num < s.den, 'une fraction propre, pour rester lisible');
        assert.ok(Number.isInteger(p.reponse));
    }
});

test('les durées comptent en base 60, pas en base 10', () => {
    for (let g = 1; g <= 30; g++) {
        const p = tirerProbleme('duree', makeRng(`d${g}`));
        assert.equal(p.format, 'heure');
        const dit = direReponse(p, p.reponse);
        assert.match(dit, /^\d{1,2} h \d{2}$/, `format inattendu : ${dit}`);
        const min = Number(dit.split(' h ')[1]);
        assert.ok(min < 60, `${dit} : plus de 59 minutes`);
    }
});

test('une réponse porte TOUJOURS son unité', () => {
    for (const f of TOUTES) {
        const p = tirerProbleme(f, makeRng(`u-${f}`));
        const dit = direReponse(p, p.reponse);
        assert.ok(/[a-zà-ÿ€]/i.test(dit), `${f} : « ${dit} » n'a pas d'unité`);
    }
});

test('le français des énoncés tient debout', () => {
    // Trois fautes que la génération produit toute seule si on n'y prend pas
    // garde, et qui décrédibilisent l'énoncé : « 46 coquillages vertes »,
    // « combien y a-t-il de images », « 1 billes ». Un élève qui bute sur la
    // langue ne lit plus le problème.
    const fautes = [];
    for (const f of TOUTES) {
        for (let g = 1; g <= 80; g++) {
            const p = tirerProbleme(f, makeRng(`fr-${f}-${g}`));
            const t = `${p.enonce} ${p.question}`;
            // « de » non élidé devant une voyelle
            if (/\bde [aeiouyéèêàâîôû]/i.test(t)) fautes.push(`élision — ${f} : ${t}`);
            // couleur féminine sur un nom masculin, et l'inverse
            if (/\b(bonbons|autocollants|crayons|timbres|coquillages)\s+(vertes|bleues|noires|blanches)\b/.test(t)) {
                fautes.push(`accord — ${f} : ${t}`);
            }
            if (/\b(billes|cartes|images|perles|noisettes)\s+(verts|bleus|noirs|blancs)\b/.test(t)) {
                fautes.push(`accord — ${f} : ${t}`);
            }
            // singulier / pluriel du nom compté
            if (/\b1 (billes|cartes|images|bonbons|timbres|perles|crayons)\b/.test(t)) {
                fautes.push(`pluriel — ${f} : ${t}`);
            }
            // « que » non élidé devant un prénom à initiale vocalique
            if (/\bque [AEIOUY]/.test(t)) fautes.push(`élision que — ${f} : ${t}`);
            // participe passé accordé au mauvais genre
            if (/\b(crayons|timbres|bonbons|coquillages|autocollants)\s+sont\s+\w+ées\b/.test(t)) {
                fautes.push(`participe — ${f} : ${t}`);
            }
            // double espace ou espace avant une virgule
            if (/  | ,|\s\./.test(t)) fautes.push(`typo — ${f} : ${t}`);
        }
    }
    assert.deepEqual(fautes.slice(0, 5), []);
});

test('les accords français sont respectés', () => {
    assert.equal(accorder(1, { s: 'bille', p: 'billes' }), '1 bille');
    assert.equal(accorder(4, { s: 'bille', p: 'billes' }), '4 billes');
    assert.equal(prix(4), '4 €');
    assert.equal(prix(4.5), '4,50 €');
    // Espace FINE INSÉCABLE (U+202F) entre les milliers : c'est la typographie
    // française, et surtout « 12 » et « 345 » ne peuvent pas se retrouver sur
    // deux lignes différentes au milieu d'un énoncé.
    assert.equal(nombre(12345), '12 345');
    assert.ok(!/ /.test(nombre(12345)), 'une espace ordinaire laisserait le nombre se couper');
    assert.equal(deElide('images'), 'd\'images');
    assert.equal(deElide('billes'), 'de billes');
});

test('aucun énoncé ne contient de reste de gabarit', () => {
    // Un « undefined » ou un « NaN » dans un énoncé, et l'exercice est perdu
    // pour la séance. On regarde tout ce qui s'affiche.
    for (const f of TOUTES) {
        for (let g = 1; g <= 20; g++) {
            const p = tirerProbleme(f, makeRng(`t-${f}-${g}`));
            const tout = [p.enonce, p.question, ...p.etapes, ...p.choix.map(c => c.pourquoi || '')].join(' ');
            assert.ok(!/undefined|NaN|\[object|\$\{/.test(tout), `${f} graine ${g} : ${tout}`);
        }
    }
});

test('le filtre par niveau ne rend que des familles de ce niveau', () => {
    const cm2 = famillesDe('CM2');
    assert.ok(cm2.length >= 4);
    cm2.forEach(f => assert.ok(FAMILLES[f].niveaux.includes('CM2')));
    const cinq = famillesDe('5ème');
    assert.ok(cinq.includes('proportion'));
    assert.ok(!cm2.includes('proportion'), 'la proportionnalité n\'est pas au programme du CM2 ici');
    assert.equal(famillesDe(null).length, IDS_FAMILLES.length);
});

test('deux graines différentes donnent deux problèmes différents', () => {
    for (const f of TOUTES) {
        const a = tirerProbleme(f, makeRng(`a-${f}`));
        const b = tirerProbleme(f, makeRng(`b-${f}`));
        assert.notEqual(a.enonce + a.reponse, b.enonce + b.reponse, `${f} : toujours le même problème`);
    }
});
