import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    PROPRIETE, ETAPES, tirerNoms, tirerFigure, donnees, conclusion,
    etiquettes, groupesMelanges, verifierPhrase, verifierDonnee,
    verifierConclusion, redactionComplete
} from '../js/core/redaction.js';
import { makeRng } from '../js/core/ids.js';

const fig = (seed = 'f') => tirerFigure(makeRng(seed));

test('les groupes remis bout à bout redonnent EXACTEMENT la propriété', () => {
    assert.equal(PROPRIETE.groupes.join(' '), PROPRIETE.enonce);
    // Chaque groupe est une idée, pas un mot : couper « toute perpendiculaire
    // à l'une » en quatre étiquettes ferait un casse-tête de syntaxe.
    PROPRIETE.groupes.forEach(g => assert.ok(g.length >= 6, `« ${g} » est trop court pour être une idée`));
    assert.ok(PROPRIETE.groupes.length >= 4 && PROPRIETE.groupes.length <= 8);
});

test('la mise en scène couvre toute la phrase, du début à la fin', () => {
    const etapes = PROPRIETE.mise_en_scene;
    assert.equal(etapes[etapes.length - 1].jusqu_a, PROPRIETE.groupes.length,
        'la dernière étape doit révéler la phrase entière');
    for (let i = 1; i < etapes.length; i++) {
        assert.ok(etapes[i].jusqu_a > etapes[i - 1].jusqu_a, 'la phrase doit avancer à chaque étape');
    }
    etapes.forEach(e => assert.ok(e.dit && e.dit.length > 25, 'chaque étape doit se dire'));
});

test('les trois droites portent des noms différents', () => {
    for (let i = 0; i < 40; i++) {
        const { p1, p2, perp } = tirerNoms(makeRng(`n${i}`));
        assert.equal(new Set([p1, p2, perp]).size, 3, `${p1}, ${p2}, ${perp}`);
    }
});

test('les noms de droites sont ceux de la SIXIÈME', () => {
    // Le delta majuscule est une notation de lycée : en sixième, il ajoute un
    // obstacle qui n'a rien à voir avec la propriété travaillée.
    for (let i = 0; i < 60; i++) {
        const noms = Object.values(tirerNoms(makeRng(`s${i}`)));
        noms.forEach(n => {
            assert.ok(!/[ΔΩαβ]/.test(n), `nom de lycée proposé : ${n}`);
            assert.match(n, /^d['₀-₉]*$/, `nom inattendu : ${n}`);
        });
    }
});

test('la figure n\'est pas toujours horizontale', () => {
    // Une propriété apprise sur une seule orientation ne se reconnaît plus dès
    // qu'on penche la feuille.
    const angles = new Set();
    for (let i = 0; i < 30; i++) angles.add(fig(`i${i}`).inclinaison);
    assert.ok(angles.size > 8, `seulement ${angles.size} inclinaisons différentes`);
    assert.ok([...angles].some(a => a !== 0), 'aucune figure penchée');
});

test('les deux données se lisent sur la figure, la conclusion non', () => {
    const f = fig();
    const [a, b] = donnees(f);
    assert.equal(a.relation, '//');
    assert.equal(b.relation, '⊥');
    // La donnée porte sur la PREMIÈRE parallèle, la conclusion sur la seconde :
    // c'est tout le pas que la propriété autorise.
    assert.equal(b.droite, f.noms.p1);
    const c = conclusion(f);
    assert.equal(c.gauche, f.noms.perp);
    assert.equal(c.droite, f.noms.p2);
    assert.notEqual(c.droite, b.droite, 'la conclusion doit parler de l\'AUTRE parallèle');
});

test('toutes les étiquettes sont proposées à chaque trou', () => {
    const f = fig();
    const e = etiquettes(f, makeRng('e'));
    assert.equal(e.length, 3);
    assert.deepEqual([...e].sort(), [f.noms.p1, f.noms.p2, f.noms.perp].sort());
});

test('les groupes proposés ne sont jamais déjà dans l\'ordre', () => {
    for (let i = 0; i < 60; i++) {
        const m = groupesMelanges(makeRng(`m${i}`));
        assert.deepEqual([...m].sort(), [...PROPRIETE.groupes].sort(), 'aucun groupe perdu');
        assert.notDeepEqual(m, PROPRIETE.groupes, 'la phrase était déjà faite');
    }
});

test('la phrase juste est acceptée, et la fausse dit OÙ ça coince', () => {
    assert.equal(verifierPhrase(PROPRIETE.groupes).juste, true);

    const faux = [...PROPRIETE.groupes];
    [faux[2], faux[4]] = [faux[4], faux[2]];
    const r = verifierPhrase(faux);
    assert.equal(r.juste, false);
    assert.equal(r.premierFaux, 2, 'dire « c\'est faux » sans dire où oblige à tout relire');

    assert.equal(verifierPhrase(PROPRIETE.groupes.slice(0, 3)).juste, false, 'une phrase incomplète n\'est pas juste');
});

test('une donnée juste est acceptée dans les DEUX sens — le parallélisme est symétrique', () => {
    const f = fig();
    const [a] = donnees(f);
    assert.equal(verifierDonnee(f, 0, a.gauche, a.droite).juste, true);
    assert.equal(verifierDonnee(f, 0, a.droite, a.gauche).juste, true,
        '(d) // (d\') et (d\') // (d) disent la même chose');
});

test('la perpendicularité aussi est symétrique, et on le DIT', () => {
    const f = fig();
    const b = donnees(f)[1];
    const r = verifierDonnee(f, 1, b.droite, b.gauche);
    assert.equal(r.juste, true);
    assert.match(r.message, /symétrique/, 'accepter sans expliquer laisserait croire à une tolérance');
});

test('une donnée fausse renvoie à la figure, pas à la réponse', () => {
    const f = fig();
    const r = verifierDonnee(f, 0, f.noms.p1, f.noms.perp);
    assert.equal(r.juste, false);
    assert.match(r.message, /Relis la figure/);
});

test('la conclusion doit parler de l\'AUTRE parallèle', () => {
    const f = fig();
    const c = conclusion(f);
    assert.equal(verifierConclusion(f, c.gauche, c.droite).juste, true);
    assert.equal(verifierConclusion(f, c.droite, c.gauche).juste, true);

    // L'erreur attendue : recopier la donnée au lieu de conclure.
    const rate = verifierConclusion(f, f.noms.perp, f.noms.p1);
    assert.equal(rate.juste, false);
    assert.match(rate.message, /AUTRE/);
});

test('la rédaction complète a bien ses trois lignes, dans l\'ordre du cahier', () => {
    const f = fig();
    const lignes = redactionComplete(f);
    assert.equal(lignes.length, 3);
    assert.match(lignes[0], /^Je sais que/);
    assert.match(lignes[1], /^Or /);
    assert.match(lignes[2], /^Donc /);
    assert.ok(lignes[1].includes(PROPRIETE.enonce), 'la propriété doit être écrite EN ENTIER');
    assert.ok(lignes[2].includes(f.noms.p2), 'la conclusion porte sur la seconde parallèle');
    assert.ok(!lignes[2].includes('parallèle'), 'la conclusion est une perpendicularité');
});

test('les quatre temps du raisonnement sont déclarés, avec leur consigne', () => {
    assert.deepEqual(ETAPES.map(e => e.id), ['phrase', 'donnees', 'or', 'donc']);
    ETAPES.forEach(e => {
        assert.ok(e.titre, `${e.id} sans titre`);
        assert.ok(e.consigne.length > 25, `${e.id} : consigne trop courte`);
    });
    // La convention de lecture doit être annoncée : sans elle, rien sur la
    // figure ne dit que deux droites sont parallèles.
    assert.match(ETAPES[1].consigne, /POINTILL/i);
});
