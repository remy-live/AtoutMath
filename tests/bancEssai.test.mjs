// Le banc d'essai : un carnet qui doit survivre à deux appareils et à un
// aller-retour par le presse-papiers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    CRITERES, VERDICTS, FORMAT, decrireAppareil, nommerAppareil, nouveauCarnet,
    noter, ligneDe, avancement, ennuis, resume, fusionner, lire, versMarkdown, clefLigne,
    direClassement
} from '../js/core/bancEssai.js';

const faussetteFenetre = (over = {}) => ({
    navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', platform: 'iPhone', maxTouchPoints: 5, language: 'fr-FR' },
    screen: { width: 390, height: 844 },
    innerWidth: 390, innerHeight: 734, devicePixelRatio: 3, ...over
});

const carnetType = () => {
    const appareil = decrireAppareil(faussetteFenetre());
    let c = nouveauCarnet({ appareil, version: 'v152', date: 1000 });
    c = noter(c, {
        exercice: 'geo-solides-denombrer', titre: 'Compter sur un solide', activite: 'solides',
        date: 1100, verdicts: { marche: 'ok', indices: 'ok', robot: 'moyen', fiche: 'na' },
        note: 'Le robot est trop lent sur les douze arêtes.'
    });
    c = noter(c, {
        exercice: 'geo-tangram', titre: 'Le Tangram', activite: 'tangram',
        date: 1200, verdicts: { marche: 'ko', 'mise-en-page': 'ko' },
        note: 'La silhouette déborde en paysage.'
    });
    return c;
};

test('l\'appareil est décrit, pas demandé', () => {
    // « Ça déborde sur mon téléphone » ne se corrige pas : il faut les
    // dimensions, la densité, le tactile et l'orientation.
    const a = decrireAppareil(faussetteFenetre());
    assert.equal(a.largeur, 390);
    assert.equal(a.hauteur, 734);
    assert.equal(a.densite, 3);
    assert.equal(a.tactile, true);
    assert.equal(a.orientation, 'portrait');
    assert.equal(a.ecran, '390×844');
    assert.match(nommerAppareil(a), /^iPhone 390×734 tactile \(portrait\)$/);

    // Le même appareil tourné est un AUTRE contexte de test : la mise en page
    // n'y est pas la même, et le nom doit le dire.
    const couche = decrireAppareil(faussetteFenetre({ innerWidth: 844, innerHeight: 390 }));
    assert.equal(couche.orientation, 'paysage');
    assert.notEqual(nommerAppareil(couche), nommerAppareil(a));

    // Un poste sans tactile se reconnaît aussi.
    const bureau = decrireAppareil(faussetteFenetre({
        navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', maxTouchPoints: 0 },
        innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2
    }));
    assert.match(nommerAppareil(bureau), /^Mac 1440×900 \(paysage\)$/);
});

test('noter deux fois le même exercice REMPLACE, sur le même appareil', () => {
    // Repasser sur un exercice après correction doit effacer l'ancien avis :
    // un rapport qui garde les deux ne dit plus où l'on en est.
    let c = carnetType();
    assert.equal(c.lignes.length, 2);
    c = noter(c, {
        exercice: 'geo-tangram', titre: 'Le Tangram', date: 2000,
        verdicts: { marche: 'ok', 'mise-en-page': 'ok' }, note: 'Corrigé.'
    });
    assert.equal(c.lignes.length, 2);
    const l = ligneDe(c, 'geo-tangram', nommerAppareil(c.appareil));
    assert.equal(l.verdicts.marche, 'ok');
    assert.equal(l.note, 'Corrigé.');
});

test('le MÊME exercice sur DEUX appareils fait deux lignes', () => {
    // C'est tout l'intérêt de la passe : le téléphone et la tablette ne
    // rendent pas le même verdict sur la même mise en page.
    let c = carnetType();
    c = noter(c, {
        exercice: 'geo-tangram', titre: 'Le Tangram', appareilNom: 'iPad 820×1080 tactile (portrait)',
        date: 1300, verdicts: { marche: 'ok', 'mise-en-page': 'ok' }
    });
    assert.equal(c.lignes.filter(l => l.exercice === 'geo-tangram').length, 2);
    assert.equal(ligneDe(c, 'geo-tangram', 'iPad 820×1080 tactile (portrait)').verdicts.marche, 'ok');
    assert.equal(ligneDe(c, 'geo-tangram', nommerAppareil(c.appareil)).verdicts.marche, 'ko');
    assert.notEqual(clefLigne(c.lignes[1]), clefLigne(c.lignes[2]));
});

test('l\'avancement ne compte pour vu que ce qui a reçu un verdict', () => {
    // Ouvrir un exercice sans rien en dire, ce n'est pas l'avoir testé.
    const c = carnetType();
    const liste = [{ id: 'geo-solides-denombrer' }, { id: 'geo-tangram' }, { id: 'num-lettres-mille' }];
    const a = avancement(c, liste);
    assert.equal(a.total, 3);
    assert.equal(a.vus, 2);
    assert.deepEqual(a.restants, ['num-lettres-mille']);
    // Une ligne sans le verdict « ça marche » ne compte pas non plus.
    const partiel = noter(nouveauCarnet({ appareil: c.appareil }), {
        exercice: 'num-lettres-mille', verdicts: { fiche: 'ok' }
    });
    assert.equal(avancement(partiel, liste).vus, 0);
});

test('les ennuis sortent en premier, le cassé avant le douteux', () => {
    // C'est par là que commence celui qui corrige : un rapport qui ouvre sur
    // un tableau de statistiques se referme sans être lu.
    const soucis = ennuis(carnetType());
    assert.equal(soucis[0].verdict, 'ko');
    assert.equal(soucis[0].exercice, 'geo-tangram');
    assert.ok(soucis.some(s => s.critere === 'mise-en-page' && s.verdict === 'ko'));
    assert.equal(soucis[soucis.length - 1].verdict, 'moyen');
    // « Bon » et « sans objet » ne sont pas des ennuis.
    assert.ok(!soucis.some(s => s.verdict === 'ok' || s.verdict === 'na'));

    const par = resume(carnetType());
    assert.equal(par.marche.ok, 1);
    assert.equal(par.marche.ko, 1);
    assert.equal(par.fiche.na, 1);
    assert.equal(par.robot.moyen, 1);
});

test('deux carnets s\'additionnent au lieu de s\'écraser', () => {
    const a = carnetType();
    let b = nouveauCarnet({
        appareil: decrireAppareil(faussetteFenetre({ innerWidth: 820, innerHeight: 1080 })), version: 'v152'
    });
    b = noter(b, { exercice: 'geo-tangram', titre: 'Le Tangram', date: 5000, verdicts: { marche: 'ok' } });
    b = noter(b, { exercice: 'num-parties', titre: 'Parties', date: 5100, verdicts: { marche: 'ok' } });

    const tout = fusionner(a, b);
    assert.equal(tout.lignes.length, 4, 'deux appareils, quatre lignes');
    assert.equal(tout.format, FORMAT);
    // Et une reprise du même exercice sur le même appareil garde la PLUS RÉCENTE.
    let tard = nouveauCarnet({ appareil: a.appareil });
    tard = noter(tard, {
        exercice: 'geo-tangram', appareilNom: nommerAppareil(a.appareil),
        date: 9000, verdicts: { marche: 'ok' }, note: 'plus tard'
    });
    const apres = fusionner(a, tard);
    assert.equal(apres.lignes.filter(l => l.exercice === 'geo-tangram').length, 1);
    assert.equal(ligneDe(apres, 'geo-tangram', nommerAppareil(a.appareil)).note, 'plus tard');
});

test('un carnet transmis se relit, et ce qui n\'en est pas un se refuse', () => {
    const c = carnetType();
    const relu = lire(JSON.stringify(c));
    assert.equal(relu.lignes.length, 2);
    assert.equal(relu.lignes[0].verdicts.marche, 'ok');
    assert.equal(lire('pas du json'), null);
    assert.equal(lire('{"autre":1}'), null);
    assert.equal(lire(null), null);
    // Un verdict ou un critère inventé est écarté : le rapport ne doit pas
    // porter des colonnes qui n'existent pas.
    const sale = lire(JSON.stringify({
        lignes: [{ exercice: 'x', verdicts: { marche: 'genial', inconnu: 'ok', robot: 'ko' } }]
    }));
    assert.deepEqual(sale.lignes[0].verdicts, { robot: 'ko' });
    // Et une ligne sans exercice ne veut rien dire.
    assert.equal(lire(JSON.stringify({ lignes: [{ titre: 'orphelin' }] })).lignes.length, 0);
});

test('le rapport commence par ce qui ne va pas', () => {
    const md = versMarkdown(carnetType());
    const iEnnuis = md.indexOf('## Ce qui ne va pas');
    const iDetail = md.indexOf('## Le détail');
    const iCompte = md.indexOf('## Compte des verdicts');
    assert.ok(iEnnuis > 0 && iEnnuis < iDetail && iDetail < iCompte);
    // L'appareil et la version sont en tête : sans eux, un défaut de mise en
    // page n'est pas reproductible — et un défaut déjà corrigé se signale
    // tant qu'un appareil garde l'ancienne version en cache.
    assert.ok(md.indexOf('iPhone 390×734') < iEnnuis);
    assert.match(md, /v152/);
    // Ce qui est cassé est nommé, avec sa raison en clair.
    assert.match(md, /Le Tangram/);
    assert.match(md, /La silhouette déborde en paysage/);
    assert.match(md, /CASSÉ/);
    // Chaque critère a sa colonne, et rien n'est « undefined ».
    CRITERES.forEach(c => assert.ok(md.includes(c.label), `colonne manquante : ${c.label}`));
    assert.ok(!/undefined|NaN|\[object/.test(md), md.slice(0, 400));
});

test('le classement proposé apparaît à part, jamais noyé dans le tableau', () => {
    let c = nouveauCarnet({ appareil: decrireAppareil(faussetteFenetre()) });
    c = noter(c, {
        exercice: 'num-parties', titre: 'Parties', date: 1, verdicts: { marche: 'ok' },
        tags: { chemin: ['Numérique', 'Fractions'], niveaux: ['6ème'], ajouts: ['révisions'] }
    });
    const md = versMarkdown(c);
    assert.match(md, /## Classement à corriger/);
    assert.match(md, /chemin → Numérique > Fractions/);
    assert.match(md, /niveaux → 6ème/);
    assert.match(md, /mots-clefs → révisions/);
    // Sans proposition, la section n'apparaît pas : une section vide se lit
    // comme un travail à faire.
    assert.ok(!/## Classement à corriger/.test(versMarkdown(carnetType())));
});

test('les critères et les verdicts sont ceux qu\'un test automatique ne sait pas rendre', () => {
    const ids = CRITERES.map(c => c.id);
    ['marche', 'indices', 'robot', 'fiche', 'mise-en-page', 'classement'].forEach(id =>
        assert.ok(ids.includes(id), `critère manquant : ${id}`));
    CRITERES.forEach(c => assert.ok(c.question.length > 20, `${c.id} : question trop vague`));
    // « Sans objet » est indispensable : sans lui, un jeu sans fiche papier
    // reste éternellement « non testé ».
    assert.ok(VERDICTS.some(v => v.id === 'na'));
    assert.equal(VERDICTS.length, 4);
});

test('le classement courant voyage avec la ligne, et les niveaux entrent dans le rapport', () => {
    // « Ça marche mais c'est annoncé pour le mauvais niveau » est un défaut
    // aussi réel qu'un débordement — encore faut-il que le rapport dise à quel
    // niveau l'exercice est rangé aujourd'hui.
    let c = nouveauCarnet({ appareil: decrireAppareil(faussetteFenetre()) });
    c = noter(c, {
        exercice: 'num-parties', titre: 'Parties', date: 1,
        verdicts: { marche: 'ok', classement: 'ko' }, note: 'Trop dur pour du CM2.',
        classement: { chemin: ['Numérique', 'Fractions'], niveaux: ['CM2', '6ème'] }
    });
    const relu = lire(JSON.stringify(c));
    assert.deepEqual(relu.lignes[0].classement.niveaux, ['CM2', '6ème'],
        'le classement doit survivre à l\'aller-retour par le presse-papiers');

    assert.equal(direClassement({ chemin: ['Numérique', 'Fractions'], niveaux: ['CM2', '6ème'] }),
        'Numérique > Fractions — CM2, 6ème');
    assert.equal(direClassement(null), '');

    const md = versMarkdown(c);
    assert.match(md, /\| Exercice \| Niveaux \|/, 'le tableau doit porter une colonne de niveaux');
    assert.match(md, /\| Parties \| CM2 6ème \|/);
    // Et l'ennui lui-même annonce où l'exercice est rangé : c'est la première
    // chose à savoir quand on vient corriger un classement.
    assert.match(md, /_Numérique > Fractions — CM2, 6ème_/);
});

test('une ligne sans classement ne casse pas le rapport', () => {
    // Les carnets déjà remplis avant ce champ doivent rester lisibles.
    const md = versMarkdown(carnetType());
    assert.ok(!/undefined|\[object/.test(md));
    assert.match(md, /\| Le Tangram \|  \|/, 'la colonne reste, simplement vide');
});
