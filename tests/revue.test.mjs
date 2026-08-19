import test from 'node:test';
import assert from 'node:assert/strict';

import {
    COLONNES, TRIS, nouvelleRevue, ficheDe, decider, marquerVu, statutRevu, aChange,
    nbVus, filtrer, bilan, consigneStatuts, lireStatuts, lireRevue,
    fusionnerRevues, versMarkdown, jourISO, trier, dernierJour, direTri, estTriable
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
    const r = decider(nouvelleRevue(), 'a', { tags: 'Géométrique > Angles, 5ème' });
    assert.equal(ficheDe(r, 'a').tags, 'Géométrique > Angles, 5ème');
    assert.equal(ficheDe(lireRevue(JSON.stringify(r)), 'a').tags, 'Géométrique > Angles, 5ème');
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
    assert.ok(b.enTest > 0, 'il y a bien des exercices en test à trier');
});

test('chaque domaine du catalogue se filtre', () => {
    const domaines = [...new Set(exercices.map(e => e.tags.chemin[0]))];
    domaines.forEach(d => {
        assert.ok(filtrer(exercices, nouvelleRevue(), { domaine: d }).length > 0, d);
    });
});
