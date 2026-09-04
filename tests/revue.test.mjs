import test from 'node:test';
import assert from 'node:assert/strict';

import {
    COLONNES, TRIS, nouvelleRevue, ficheDe, decider, marquerVu, statutRevu, aChange,
    nbVus, filtrer, bilan, consigneStatuts, lireStatuts, lireRevue,
    fusionnerRevues, versMarkdown, jourISO, trier, dernierJour, direTri, estTriable,
    jeuRevu, aChangeJeu, consigneJeux, lireJeux, lireTags, ecrireTags, basculerTag, aLeTag,
    calcCatalogue, calcRevu, aChangeCalc, consigneCalc, lireCalc
} from '../js/core/revue.js';
import { STATUS } from '../js/data/status.js';
import { exercices } from '../js/data/catalog.js';

const exo = (id, extra = {}) => ({
    id, title: `Exercice ${id}`,
    tags: { chemin: ['Numérique', 'Calcul'], niveaux: ['6ème'] },
    ...extra
});

// --- Les colonnes -----------------------------------------------------------

test('cinq colonnes : trois appareils, le robot et la fiche', () => {
    assert.equal(COLONNES.length, 5);
    assert.deepEqual(COLONNES.map(c => c.id),
        ['telephone', 'tablette', 'ordinateur', 'robot', 'fiche']);
    // Les modes sont ceux que le moteur de jeu attend pour son cadre.
    assert.equal(COLONNES.find(c => c.id === 'telephone').mode, 'mobile');
    assert.equal(COLONNES.find(c => c.id === 'tablette').mode, 'tablet');
    assert.equal(COLONNES.find(c => c.id === 'ordinateur').mode, 'none');
});

// --- Décider ----------------------------------------------------------------

test('une revue neuve ne décide rien : c\'est le catalogue qui parle', () => {
    const r = nouvelleRevue({ version: 'v328' });
    assert.equal(r.fiches.length, 0);
    assert.equal(statutRevu(exo('a', { status: STATUS.TEST }), null), STATUS.TEST);
    assert.equal(statutRevu(exo('b'), null), STATUS.VALIDE);
});

test('décocher « en test » vaut validé, et la décision l\'emporte sur le code', () => {
    const e = exo('a', { status: STATUS.TEST });
    let r = nouvelleRevue();
    r = decider(r, 'a', { enTest: false });
    assert.equal(statutRevu(e, ficheDe(r, 'a')), STATUS.VALIDE);
    assert.equal(aChange(e, ficheDe(r, 'a')), true);
});

test('recocher ramène en test, et ne change plus rien si le code le dit déjà', () => {
    const e = exo('a', { status: STATUS.TEST });
    let r = decider(nouvelleRevue(), 'a', { enTest: false });
    r = decider(r, 'a', { enTest: true });
    assert.equal(statutRevu(e, ficheDe(r, 'a')), STATUS.TEST);
    assert.equal(aChange(e, ficheDe(r, 'a')), false);
});

test('la date se pose toute seule quand on décide', () => {
    const quand = Date.UTC(2026, 7, 19, 10) + new Date().getTimezoneOffset() * 60000;
    const r = decider(nouvelleRevue(), 'a', { enTest: false }, quand);
    assert.equal(ficheDe(r, 'a').date, jourISO(quand));
});

test('la date donnée à la main l\'emporte sur la date du jour', () => {
    const r = decider(nouvelleRevue(), 'a', { enTest: false, date: '2026-01-02' });
    assert.equal(ficheDe(r, 'a').date, '2026-01-02');
});

test('cocher une case d\'aperçu ne redate pas la ligne', () => {
    let r = decider(nouvelleRevue(), 'a', { enTest: false, date: '2026-01-02' });
    r = marquerVu(r, 'a', 'tablette');
    assert.equal(ficheDe(r, 'a').date, '2026-01-02');
    assert.equal(ficheDe(r, 'a').vu.tablette, true);
});

test('une remarque survit à un changement de statut, et inversement', () => {
    let r = decider(nouvelleRevue(), 'a', { remarque: 'le pavé cache le score' });
    r = decider(r, 'a', { enTest: true });
    assert.equal(ficheDe(r, 'a').remarque, 'le pavé cache le score');
    assert.equal(ficheDe(r, 'a').enTest, true);
});

test('une colonne se décoche', () => {
    let r = marquerVu(nouvelleRevue(), 'a', 'robot');
    assert.equal(nbVus(ficheDe(r, 'a')), 1);
    r = marquerVu(r, 'a', 'robot', false);
    // Plus rien à dire sur cette ligne : elle sort du carnet.
    assert.equal(ficheDe(r, 'a'), null);
});

test('une date posée seule tient — c\'est ce que fait le cochet du calendrier', () => {
    const r = decider(nouvelleRevue(), 'a', { date: '2026-08-19' });
    assert.equal(ficheDe(r, 'a').date, '2026-08-19');
    assert.equal(ficheDe(r, 'a').enTest, null, 'dater n\'est pas décider');
    // Et elle survit à l'aller-retour par le stockage.
    assert.equal(ficheDe(lireRevue(JSON.stringify(r)), 'a').date, '2026-08-19');
});

test('effacer la date d\'une ligne qui ne dit rien d\'autre la retire', () => {
    let r = decider(nouvelleRevue(), 'a', { date: '2026-08-19' });
    r = decider(r, 'a', { date: '' });
    assert.equal(ficheDe(r, 'a'), null);
});

test('une colonne inconnue ne rentre pas dans le carnet', () => {
    const r = marquerVu(nouvelleRevue(), 'a', 'montre');
    assert.equal(r.fiches.length, 0);
});

// --- Filtrer ----------------------------------------------------------------

const jeuDeux = [
    exo('num-un', { status: STATUS.TEST, activityId: 'numpad' }),
    exo('geo-deux', { tags: { chemin: ['Géométrie', 'Angles'], niveaux: ['5ème'] } }),
    exo('num-trois', { status: STATUS.TEST })
];

test('le filtre texte cherche dans le titre, l\'identifiant et le moteur', () => {
    const r = nouvelleRevue();
    assert.equal(filtrer(jeuDeux, r, { texte: 'geo' }).length, 1);
    assert.equal(filtrer(jeuDeux, r, { texte: 'numpad' }).length, 1);
    assert.equal(filtrer(jeuDeux, r, { texte: 'num' }).length, 2);
});

test('les filtres domaine, niveau et statut se cumulent', () => {
    const r = nouvelleRevue();
    assert.equal(filtrer(jeuDeux, r, { domaine: 'Géométrie' }).length, 1);
    assert.equal(filtrer(jeuDeux, r, { niveau: '6ème' }).length, 2);
    assert.equal(filtrer(jeuDeux, r, { statut: STATUS.TEST }).length, 2);
    assert.equal(filtrer(jeuDeux, r, { statut: STATUS.TEST, niveau: '5ème' }).length, 0);
});

test('le filtre statut suit la décision, pas le code', () => {
    const r = decider(nouvelleRevue(), 'num-un', { enTest: false });
    assert.deepEqual(filtrer(jeuDeux, r, { statut: STATUS.TEST }).map(e => e.id), ['num-trois']);
    assert.deepEqual(filtrer(jeuDeux, r, { avancee: 'changes' }).map(e => e.id), ['num-un']);
});

test('« à décider » et « décidés » se partagent exactement le catalogue', () => {
    const r = decider(nouvelleRevue(), 'num-un', { enTest: false });
    assert.equal(filtrer(jeuDeux, r, { avancee: 'decides' }).length, 1);
    assert.equal(filtrer(jeuDeux, r, { avancee: 'adecider' }).length, 2);
});

test('« jamais vus » et « vus » se partagent aussi le catalogue', () => {
    const r = marquerVu(nouvelleRevue(), 'geo-deux', 'telephone');
    assert.deepEqual(filtrer(jeuDeux, r, { avancee: 'vus' }).map(e => e.id), ['geo-deux']);
    assert.equal(filtrer(jeuDeux, r, { avancee: 'jamaisvus' }).length, 2);
});

test('le filtre « les jeux » ne garde que ce qui a un moteur', () => {
    assert.deepEqual(filtrer(jeuDeux, nouvelleRevue(), { jeux: true }).map(e => e.id), ['num-un']);
});

test('le filtre remarques ne retient pas une remarque faite d\'espaces', () => {
    const r = decider(nouvelleRevue(), 'num-un', { remarque: '   ' });
    assert.equal(filtrer(jeuDeux, r, { avancee: 'remarques' }).length, 0);
});

// --- L'ordre des lignes -----------------------------------------------------

const dates = [
    exo('vieux', { cree: '2026-01-05', title: 'Vieux' }),
    exo('neuf', { cree: '2026-08-19', title: 'Neuf' }),
    exo('repris', { cree: '2026-03-01', title: 'Repris', revisions: [{ date: '2026-08-20', quoi: 'x' }] })
];

test('la dernière date d\'un exercice tient compte de ses révisions', () => {
    assert.equal(dernierJour(dates[0]), '2026-01-05');
    assert.equal(dernierJour(dates[2]), '2026-08-20');
});

test('« les derniers créés » remonte ce qui vient d\'être écrit', () => {
    assert.deepEqual(trier(dates, '-cree').map(e => e.id), ['neuf', 'repris', 'vieux']);
});

test('« les derniers touchés » remonte aussi ce qui vient d\'être repris', () => {
    assert.deepEqual(trier(dates, '-ecrit').map(e => e.id), ['repris', 'neuf', 'vieux']);
});

test('le signe moins renverse l\'ordre', () => {
    assert.deepEqual(trier(dates, 'cree').map(e => e.id), ['vieux', 'repris', 'neuf']);
});

test('le tri par titre suit l\'alphabet, l\'ordre du catalogue ne bouge pas', () => {
    assert.deepEqual(trier(dates, 'titre').map(e => e.id), ['neuf', 'repris', 'vieux']);
    assert.deepEqual(trier(dates, 'catalogue').map(e => e.id), ['vieux', 'neuf', 'repris']);
});

test('le tri ne modifie pas la liste qu\'on lui donne', () => {
    const avant = dates.map(e => e.id);
    trier(dates, '-cree');
    assert.deepEqual(dates.map(e => e.id), avant);
});

test('filtrer trie ce qu\'il a gardé', () => {
    assert.deepEqual(filtrer(dates, nouvelleRevue(), { tri: '-cree' }).map(e => e.id),
        ['neuf', 'repris', 'vieux']);
});

test('quatre ordres proposés au menu, celui du catalogue en premier', () => {
    assert.equal(TRIS[0].id, 'catalogue');
    assert.equal(TRIS.length, 4);
});

test('les six derniers exercices du vrai catalogue sont bien les plus récents', () => {
    const derniers = filtrer(exercices, nouvelleRevue(), { tri: '-cree' }).slice(0, 6);
    const plusVieux = derniers[5].cree;
    assert.ok(exercices.every(e => (e.cree || '') <= plusVieux || derniers.includes(e)));
});

// --- Trier en cliquant une colonne ------------------------------------------

test('trier par statut remonte ce qui est encore en test', () => {
    const r = decider(nouvelleRevue(), 'num-un', { enTest: false });
    // num-trois reste en test ; num-un vient d'être validé, geo-deux l'était déjà.
    assert.equal(trier(jeuDeux, 'statut', r)[0].id, 'num-trois');
});

test('trier par une colonne d\'aperçu remonte ce qui est coché', () => {
    const r = marquerVu(nouvelleRevue(), 'num-trois', 'robot');
    assert.equal(trier(jeuDeux, 'vu:robot', r)[0].id, 'num-trois');
    assert.equal(trier(jeuDeux, '-vu:robot', r).at(-1).id, 'num-trois');
});

test('trier par remarque remonte les lignes annotées', () => {
    const r = decider(nouvelleRevue(), 'geo-deux', { remarque: 'à revoir' });
    assert.equal(trier(jeuDeux, 'remarque', r)[0].id, 'geo-deux');
});

test('trier par date de décision', () => {
    let r = decider(nouvelleRevue(), 'num-un', { enTest: false, date: '2026-01-01' });
    r = decider(r, 'geo-deux', { enTest: false, date: '2026-09-09' });
    assert.equal(trier(jeuDeux, '-decide', r)[0].id, 'geo-deux');
});

test('une colonne sans décision se trie quand même, sans carnet', () => {
    assert.doesNotThrow(() => trier(jeuDeux, 'vu:fiche'));
    assert.equal(trier(jeuDeux, 'vu:fiche').length, jeuDeux.length);
});

test('à égalité, c\'est le titre qui départage — l\'ordre ne bouge plus', () => {
    const memes = [exo('c', { title: 'Cc' }), exo('a', { title: 'Aa' }), exo('b', { title: 'Bb' })];
    assert.deepEqual(trier(memes, 'statut').map(e => e.id), ['a', 'b', 'c']);
    assert.deepEqual(trier(memes, '-statut').map(e => e.id), ['a', 'b', 'c']);
});

test('un tri inventé laisse la liste telle quelle', () => {
    assert.deepEqual(trier(jeuDeux, 'couleur').map(e => e.id), jeuDeux.map(e => e.id));
});

test('les colonnes triables sont connues, les autres non', () => {
    assert.ok(estTriable('titre') && estTriable('-ecrit') && estTriable('vu:robot'));
    assert.ok(estTriable('catalogue'));
    assert.ok(!estTriable('couleur'));
});

test('un tri venu d\'une colonne sait dire son nom et son sens', () => {
    assert.equal(direTri('-ecrit'), 'Les derniers touchés');   // celui-là est au menu
    assert.equal(direTri('vu:robot'), 'Robot ▲');
    assert.equal(direTri('-vu:telephone'), 'Téléphone ▼');
    assert.equal(direTri('statut'), 'Statut ▲');
});

// --- Le classement à corriger -----------------------------------------------

test('une proposition de classement se garde et se relit', () => {
    // La virgule d'une fiche écrite à la main devient le séparateur de liste.
    const r = decider(nouvelleRevue(), 'a', { tags: 'Géométrique > Angles, 5ème' });
    assert.equal(ficheDe(r, 'a').tags, 'Géométrique > Angles · 5ème');
    assert.equal(ficheDe(lireRevue(JSON.stringify(r)), 'a').tags, 'Géométrique > Angles · 5ème');
});

test('elle date la ligne, comme toute décision', () => {
    const r = decider(nouvelleRevue(), 'a', { tags: 'Fractions' });
    assert.ok(ficheDe(r, 'a').date);
});

test('elle ne chasse pas la remarque, et réciproquement', () => {
    let r = decider(nouvelleRevue(), 'a', { remarque: 'déborde' });
    r = decider(r, 'a', { tags: 'Tableur' });
    assert.equal(ficheDe(r, 'a').remarque, 'déborde');
    assert.equal(ficheDe(r, 'a').tags, 'Tableur');
});

test('le filtre « à reclasser » ne retient que les lignes qui en ont une', () => {
    const r = decider(nouvelleRevue(), 'num-un', { tags: 'Logique' });
    assert.deepEqual(filtrer(jeuDeux, r, { avancee: 'classer' }).map(e => e.id), ['num-un']);
});

test('le bilan compte les classements à corriger', () => {
    const r = decider(nouvelleRevue(), 'num-un', { tags: 'Logique' });
    assert.equal(bilan(r, jeuDeux).classer, 1);
});

test('le rapport les sort dans leur propre section, avec le classement actuel', () => {
    const r = decider(nouvelleRevue(), 'geo-deux', { tags: 'Transformations' });
    const md = versMarkdown(r, jeuDeux);
    assert.ok(md.includes('Le classement à corriger'));
    assert.ok(md.includes('Transformations'));
    assert.ok(md.includes('Géométrie > Angles'), 'il faut voir d\'où l\'on part');
});

test('sans proposition, pas de section', () => {
    assert.ok(!versMarkdown(nouvelleRevue(), jeuDeux).includes('Le classement à corriger'));
});

test('une proposition survit à la fusion de deux appareils', () => {
    const a = decider(nouvelleRevue(), 'x', { tags: 'Angles' }, 1000);
    const b = marquerVu(nouvelleRevue(), 'x', 'robot', true, 2000);
    assert.equal(ficheDe(fusionnerRevues(a, b), 'x').tags, 'Angles');
});

test('trier par jeu groupe ce qui partage le même moteur', () => {
    const trois = [exo('a', { generatorId: 'zz' }), exo('b', { activityId: 'numpad' }), exo('c', { activityId: 'bubbles' })];
    assert.deepEqual(trier(trois, 'jeu').map(e => e.id), ['c', 'b', 'a']);
});

// --- La liste de cases du classement ----------------------------------------

test('un classement se lit comme une liste, quel que soit le séparateur', () => {
    assert.deepEqual(lireTags('Numérique · Fractions'), ['Numérique', 'Fractions']);
    assert.deepEqual(lireTags('Numérique, Fractions ; 6ème'), ['Numérique', 'Fractions', '6ème']);
    assert.deepEqual(lireTags(''), []);
    assert.deepEqual(lireTags(['  Angles ', '', 'CM2']), ['Angles', 'CM2']);
});

test('il s\'écrit avec le point médian, et sans doublon', () => {
    assert.equal(ecrireTags(['Numérique', 'Fractions', 'Numérique']), 'Numérique · Fractions');
    assert.equal(ecrireTags([]), '');
});

test('cocher et décocher un mot', () => {
    let t = basculerTag('', 'Fractions', true);
    assert.equal(t, 'Fractions');
    t = basculerTag(t, '6ème', true);
    assert.equal(t, 'Fractions · 6ème');
    assert.ok(aLeTag(t, '6ème'));
    // La casse ne fait pas un second mot : recocher remplace, il n'y en a qu'un.
    assert.equal(basculerTag(t, 'FRACTIONS', true), '6ème · FRACTIONS');
    assert.equal(basculerTag(t, 'Fractions', false), '6ème');
    assert.equal(basculerTag(t, '   ', true), t);
});

test('la fiche range le classement en liste, même écrit à la main', () => {
    const r = decider(nouvelleRevue(), 'a', { tags: 'Numérique, Fractions' });
    assert.equal(ficheDe(r, 'a').tags, 'Numérique · Fractions');
    // Et une liste passe directement.
    const r2 = decider(nouvelleRevue(), 'a', { tags: ['Angles', 'Angles', '5ème'] });
    assert.equal(ficheDe(r2, 'a').tags, 'Angles · 5ème');
});

// --- La colonne « jeu » ------------------------------------------------------

test('sans décision, c\'est le catalogue qui dit si c\'est un jeu', () => {
    assert.equal(jeuRevu(exo('a', { activityId: 'numpad' }), null), true);
    assert.equal(jeuRevu(exo('b', { generatorId: 'zz' }), null), false);
});

test('la case cochée l\'emporte sur le catalogue', () => {
    const e = exo('b', { generatorId: 'zz' });
    const r = decider(nouvelleRevue(), 'b', { jeu: true });
    assert.equal(jeuRevu(e, ficheDe(r, 'b')), true);
    assert.ok(aChangeJeu(e, ficheDe(r, 'b')));
    // Cocher ce que le code dit déjà n'est pas un changement à reporter.
    const memeAvis = decider(nouvelleRevue(), 'a', { jeu: true });
    assert.ok(!aChangeJeu(exo('a', { activityId: 'numpad' }), ficheDe(memeAvis, 'a')));
});

test('elle date la ligne et n\'efface ni remarque ni classement', () => {
    let r = decider(nouvelleRevue(), 'a', { remarque: 'à revoir', tags: 'Fractions' });
    r = decider(r, 'a', { jeu: false });
    assert.equal(ficheDe(r, 'a').remarque, 'à revoir');
    assert.equal(ficheDe(r, 'a').tags, 'Fractions');
    assert.ok(ficheDe(r, 'a').date);
});

test('une fiche qui ne porte plus que « jeu » reste au carnet', () => {
    const r = decider(nouvelleRevue(), 'a', { jeu: true });
    assert.equal(r.fiches.length, 1);
    assert.equal(ficheDe(lireRevue(JSON.stringify(r)), 'a').jeu, true);
});

test('le filtre « les jeux » suit la décision, pas seulement le code', () => {
    const r = decider(nouvelleRevue(), 'geo-deux', { jeu: true });
    assert.deepEqual(filtrer(jeuDeux, r, { jeux: true }).map(e => e.id).sort(),
        ['geo-deux', 'num-un']);
    const sans = decider(nouvelleRevue(), 'num-un', { jeu: false });
    assert.deepEqual(filtrer(jeuDeux, sans, { jeux: true }).map(e => e.id), []);
});

test('le bilan compte les jeux et ce qu\'il faudra reporter', () => {
    const r = decider(nouvelleRevue(), 'geo-deux', { jeu: true });
    const b = bilan(r, jeuDeux);
    assert.equal(b.jeux, 2);
    assert.equal(b.jeuxChanges, 1);
});

test('la consigne des jeux ne liste que ce qui change', () => {
    let r = decider(nouvelleRevue(), 'geo-deux', { jeu: true });
    r = decider(r, 'num-un', { jeu: false });
    r = decider(r, 'num-trois', { jeu: false });   // le code dit déjà non
    r.version = 'v347';
    const c = consigneJeux(r, jeuDeux);
    assert.ok(c.startsWith('JEU v347 |'), c);
    assert.ok(c.includes('jeu = geo-deux'));
    assert.ok(c.includes('pas = num-un'));
    assert.ok(!c.includes('num-trois'), 'ce qui ne change pas n\'a rien à faire dans la consigne');
    assert.equal(consigneJeux(nouvelleRevue(), jeuDeux), '');
});

test('et elle se relit', () => {
    const lu = lireJeux('Bonjour\nJEU v347 | jeu = geo-deux | pas = num-un, num-deux');
    assert.equal(lu.version, 'v347');
    assert.deepEqual(lu.change, [
        { exercice: 'geo-deux', jeu: true },
        { exercice: 'num-un', jeu: false },
        { exercice: 'num-deux', jeu: false }
    ]);
    assert.equal(lireJeux('rien du tout'), null);
});

test('le rapport porte la consigne des jeux à côté de celle des statuts', () => {
    const r = decider(nouvelleRevue(), 'geo-deux', { jeu: true });
    const md = versMarkdown(r, jeuDeux);
    assert.ok(md.includes('JEU'));
    assert.ok(md.includes('Comptés comme jeux'));
    assert.ok(!versMarkdown(nouvelleRevue(), jeuDeux).includes('JEU'));
});

// --- LA CALCULATRICE, exercice par exercice ---------------------------------
//
// Rémy : « tu rajouteras cette option pour les exercices dans le tableau de
// debug. Pour l'instant juste celle-là. » La colonne se coche comme celle des
// jeux, et se recolle dans le code de la même façon.

const calcDeux = [
    exo('mes-vitesse', { calculatrice: true, activityId: 'numpad' }),
    exo('num-tables', { activityId: 'numpad' })
];

test('le catalogue répond par défaut, et non par le vide', () => {
    assert.equal(calcCatalogue(calcDeux[0]), true);
    assert.equal(calcCatalogue(calcDeux[1]), false);
    assert.equal(calcCatalogue(null), false);
    const r = nouvelleRevue();
    assert.equal(calcRevu(calcDeux[0], ficheDe(r, 'mes-vitesse')), true);
    assert.equal(calcRevu(calcDeux[1], ficheDe(r, 'num-tables')), false);
});

test('la case cochée l\'emporte sur le catalogue, et se voit comme un changement', () => {
    const r = decider(nouvelleRevue(), 'num-tables', { calc: true });
    const f = ficheDe(r, 'num-tables');
    assert.equal(calcRevu(calcDeux[1], f), true);
    assert.equal(aChangeCalc(calcDeux[1], f), true);
    // Décochée là où le code disait déjà non : rien ne change à reporter.
    const r2 = decider(nouvelleRevue(), 'num-tables', { calc: false });
    assert.equal(aChangeCalc(calcDeux[1], ficheDe(r2, 'num-tables')), false);
});

test('cocher la calculatrice date la ligne, comme toute décision', () => {
    const r = decider(nouvelleRevue(), 'num-tables', { calc: true }, Date.parse('2026-08-20T10:00:00Z'));
    assert.equal(ficheDe(r, 'num-tables').date, '2026-08-20');
});

test('la consigne de la calculatrice ne liste que ce qui change', () => {
    let r = decider(nouvelleRevue(), 'num-tables', { calc: true });
    r = decider(r, 'mes-vitesse', { calc: false });
    r.version = 'v360';
    const c = consigneCalc(r, calcDeux);
    assert.ok(c.startsWith('CALC v360 |'), c);
    assert.ok(c.includes('oui = num-tables'));
    assert.ok(c.includes('non = mes-vitesse'));
    assert.equal(consigneCalc(nouvelleRevue(), calcDeux), '');
});

test('et elle se relit', () => {
    const lu = lireCalc('CALC v360 | oui = mes-vitesse, mes-volume | non = num-tables');
    assert.equal(lu.version, 'v360');
    assert.deepEqual(lu.change, [
        { exercice: 'mes-vitesse', calc: true },
        { exercice: 'mes-volume', calc: true },
        { exercice: 'num-tables', calc: false }
    ]);
    assert.equal(lireCalc('rien du tout'), null);
    // Les deux consignes ne se confondent pas : « JEU » n'est pas « CALC ».
    assert.equal(lireCalc('JEU v360 | jeu = x'), null);
    assert.equal(lireJeux('CALC v360 | oui = x'), null);
});

test('le bilan et le rapport comptent les calculatrices', () => {
    const b = bilan(decider(nouvelleRevue(), 'num-tables', { calc: true }), calcDeux);
    assert.equal(b.calc, 2);
    assert.equal(b.calcChanges, 1);
    const md = versMarkdown(decider(nouvelleRevue(), 'num-tables', { calc: true }), calcDeux);
    assert.ok(md.includes('CALC'));
    assert.ok(md.includes('Avec calculatrice'));
    assert.ok(!versMarkdown(nouvelleRevue(), calcDeux).includes('CALC'));
});

test('une décision de calculatrice survit à la fusion de deux appareils', () => {
    const a = decider(nouvelleRevue(), 'x', { calc: true }, 1000);
    const b = decider(nouvelleRevue(), 'x', { remarque: 'vu ailleurs' }, 2000);
    const f = ficheDe(fusionnerRevues(a, b), 'x');
    assert.equal(f.calc, true);
    assert.equal(f.remarque, 'vu ailleurs');
});

test('trier par calculatrice remonte les exercices qui l\'ont', () => {
    assert.ok(estTriable('calc'));
    assert.equal(trier(calcDeux, 'calc', nouvelleRevue())[0].id, 'mes-vitesse');
    assert.ok(direTri('calc').includes('Calculatrice'));
});

test('une fiche qui ne porte QUE la calculatrice n\'est pas jetée', () => {
    const r = decider(nouvelleRevue(), 'num-tables', { calc: true });
    assert.equal(r.fiches.length, 1);
});

test('une décision de jeu survit à la fusion de deux appareils', () => {
    const a = decider(nouvelleRevue(), 'x', { jeu: true }, 1000);
    const b = decider(nouvelleRevue(), 'x', { remarque: 'vu ailleurs' }, 2000);
    const f = ficheDe(fusionnerRevues(a, b), 'x');
    assert.equal(f.jeu, true);
    assert.equal(f.remarque, 'vu ailleurs');
});

test('trier par classement remonte ce qui est à reclasser', () => {
    const r = decider(nouvelleRevue(), 'geo-deux', { tags: 'Logique' });
    assert.equal(trier(jeuDeux, 'classer', r)[0].id, 'geo-deux');
});

// --- Bilan ------------------------------------------------------------------

test('le bilan compte ce qui reste à faire', () => {
    let r = decider(nouvelleRevue(), 'num-un', { enTest: false, remarque: 'bon' });
    r = marquerVu(r, 'num-trois', 'tablette');
    const b = bilan(r, jeuDeux);
    assert.equal(b.total, 3);
    assert.equal(b.decides, 1);
    assert.equal(b.changes, 1);
    assert.equal(b.remarques, 1);
    assert.equal(b.vus, 1);
    assert.equal(b.enTest, 1);          // num-trois : num-un vient d'être validé
    assert.equal(b.valides, 2);
});

// --- La consigne ------------------------------------------------------------

test('la consigne ne liste que ce qui change', () => {
    let r = decider(nouvelleRevue({ version: 'v328' }), 'num-un', { enTest: false });
    r = decider(r, 'geo-deux', { enTest: true });
    r = decider(r, 'num-trois', { enTest: true });   // déjà en test dans le code
    const c = consigneStatuts(r, jeuDeux);
    assert.match(c, /^STATUT v328 \|/);
    assert.match(c, /valide = num-un/);
    assert.match(c, /test = geo-deux/);
    assert.ok(!c.includes('num-trois'), 'un statut inchangé n\'a rien à faire dans la consigne');
});

test('rien à reporter, pas de consigne', () => {
    assert.equal(consigneStatuts(nouvelleRevue(), jeuDeux), '');
});

test('la consigne se relit', () => {
    let r = decider(nouvelleRevue({ version: 'v328' }), 'num-un', { enTest: false });
    r = decider(r, 'geo-deux', { enTest: true });
    const lu = lireStatuts(consigneStatuts(r, jeuDeux));
    assert.equal(lu.version, 'v328');
    assert.deepEqual(lu.change.sort((a, b) => a.exercice.localeCompare(b.exercice)), [
        { exercice: 'geo-deux', statut: STATUS.TEST },
        { exercice: 'num-un', statut: STATUS.VALIDE }
    ]);
});

test('la consigne se relit au milieu d\'une phrase', () => {
    const lu = lireStatuts('voilà ce que ça donne : STATUT v9 | valide = a, b — merci');
    assert.equal(lu.change.length, 2);
});

test('un statut inventé est ignoré, pas cru', () => {
    assert.equal(lireStatuts('STATUT | parfait = a'), null);
});

test('un texte sans consigne ne rend rien', () => {
    assert.equal(lireStatuts('bonjour'), null);
    assert.equal(lireStatuts(''), null);
});

// --- Relire et fusionner ----------------------------------------------------

test('un carnet se relit depuis son JSON', () => {
    const r = decider(nouvelleRevue({ version: 'v328' }), 'a', { enTest: false, remarque: 'ok' });
    const lu = lireRevue(JSON.stringify(r));
    assert.deepEqual(lu.fiches, r.fiches);
});

test('un carnet se relit depuis le rapport entier', () => {
    const r = decider(nouvelleRevue(), 'a', { enTest: true });
    const lu = lireRevue('# Revue\n\n```json\n' + JSON.stringify(r) + '\n```\n\nfin');
    assert.equal(lu.fiches.length, 1);
});

test('ce qui n\'est pas un carnet ne passe pas', () => {
    assert.equal(lireRevue('bonjour'), null);
    assert.equal(lireRevue('{"format":1}'), null);
});

test('deux carnets s\'additionnent : la décision la plus récente gagne', () => {
    const a = decider(nouvelleRevue(), 'x', { enTest: true }, 1000);
    const b = decider(nouvelleRevue(), 'x', { enTest: false }, 2000);
    assert.equal(ficheDe(fusionnerRevues(a, b), 'x').enTest, false);
    assert.equal(ficheDe(fusionnerRevues(b, a), 'x').enTest, false);
});

test('les cases vues de deux appareils s\'additionnent', () => {
    const a = marquerVu(nouvelleRevue(), 'x', 'telephone', true, 1000);
    const b = marquerVu(nouvelleRevue(), 'x', 'tablette', true, 2000);
    const f = ficheDe(fusionnerRevues(a, b), 'x');
    assert.deepEqual(Object.keys(f.vu).sort(), ['tablette', 'telephone']);
});

test('une remarque ne disparaît pas parce que l\'autre carnet n\'en a pas', () => {
    const a = decider(nouvelleRevue(), 'x', { remarque: 'déborde en bas' }, 1000);
    const b = marquerVu(nouvelleRevue(), 'x', 'robot', true, 2000);
    assert.equal(ficheDe(fusionnerRevues(a, b), 'x').remarque, 'déborde en bas');
});

// --- Le rapport -------------------------------------------------------------

test('le rapport commence par ce qui fera changer quelque chose', () => {
    let r = decider(nouvelleRevue({ version: 'v328' }), 'num-un', { enTest: false });
    r = decider(r, 'geo-deux', { remarque: 'le trait rouge saute' });
    const md = versMarkdown(r, jeuDeux);
    assert.ok(md.indexOf('À reporter') < md.indexOf('Les remarques'));
    assert.ok(md.includes('STATUT v328'));
    assert.ok(md.includes('le trait rouge saute'));
    // Une ligne de tableau par exercice, plus l'en-tête et le séparateur.
    assert.equal(md.split('\n').filter(x => x.startsWith('| ')).length, jeuDeux.length + 1);
});

test('un rapport sans décision le dit au lieu de mentir', () => {
    assert.ok(versMarkdown(nouvelleRevue(), jeuDeux).includes('Aucun statut ne change'));
});

// --- Sur le vrai catalogue --------------------------------------------------

test('le catalogue entier passe dans la revue sans exploser', () => {
    const r = nouvelleRevue({ version: 'v0' });
    assert.equal(filtrer(exercices, r, {}).length, exercices.length);
    const b = bilan(r, exercices);
    assert.equal(b.decides, 0);
    assert.equal(b.enTest + b.valides, exercices.length);
    // Ce test exigeait autrefois « b.enTest > 0 ». Rémy a ouvert tout le
    // catalogue aux élèves (« ouvre-les tous ») : il ne reste plus rien à
    // trier, et la revue doit le dire calmement plutôt que de planter. Le tri
    // lui-même est vérifié plus haut sur des lots fabriqués — c'est là qu'il
    // faut l'éprouver, pas sur l'humeur du catalogue du jour.
    assert.equal(b.enTest, 0, 'plus rien n\'attend d\'être trié');
    assert.equal(b.valides, exercices.length);
});

test('chaque domaine du catalogue se filtre', () => {
    const domaines = [...new Set(exercices.map(e => e.tags.chemin[0]))];
    domaines.forEach(d => {
        assert.ok(filtrer(exercices, nouvelleRevue(), { domaine: d }).length > 0, d);
    });
});
