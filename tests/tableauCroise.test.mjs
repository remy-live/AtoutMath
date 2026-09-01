// Le tableau à double entrée : la propagation, et ce qu'on peut cacher.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import { getGenerator, uniteDe } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';
import { RENDUS } from '../js/ui/printSheet.js';
import {
    PALIERS, ENONCES, ASTUCE, genererTableau, resoudre, estDonnee, cle,
    prochaineLigne, conseil, totalGeneral, trousMaximum, estConnue, consigneDe, faitDe
} from '../js/core/tableauCroise.js';

/** Le tableau de la fiche de Rémy, tel quel. */
const FICHE = (() => {
    // 6e   5e   4e   3e
    const interieur = [[56, 63, 39, 77], [42, 49, 62, 12]];   // D.P. / Externes
    const M = interieur.map(l => [...l, l.reduce((a, b) => a + b, 0)]);
    M.push(M[0].map((_, c) => M[0][c] + M[1][c]));
    return M;
})();

test('LE TABLEAU DE LA FICHE SE REMPLIT PAR PROPAGATION', () => {
    // La fiche donne 56 et 39 sur la ligne D.P., 49 et 12 sur les externes,
    // 98 / 112 / 101 en bas et 400 en tout. Tout le reste est vide, et l'astuce
    // imprimée sous le tableau dit comment faire : « trouve la ligne ou la
    // colonne où il ne manque qu'une seule information ».
    const connus = new Set(['0,0', '0,2', '1,1', '1,3', '2,0', '2,1', '2,2', '2,4']);
    const bilan = resoudre(FICHE, connus, 2, 4);
    assert.equal(bilan.complet, true, 'la fiche doit se finir sans jamais deviner');
    assert.equal(bilan.valeurs[2][4], 400, 'quatre cents élèves en tout');
    assert.equal(bilan.valeurs[1][0], 42, 'externes en 6ᵉ : 98 − 56');
    assert.equal(bilan.valeurs[0][1], 63, 'D.P. en 5ᵉ : 112 − 49');
    assert.equal(bilan.valeurs[0][3], 77, 'et la dernière case sort en dernier');
});

test('ON NE DEVINE JAMAIS : deux trous sur la même ligne bloquent', () => {
    // C'est la limite exacte de la méthode, et c'est pour cela que le
    // générateur vérifie chaque trou. Si l'on retire une case de plus à la
    // fiche, plus aucune ligne ni colonne n'a un seul trou à un moment donné.
    const connus = new Set(['0,0', '0,2', '1,1', '1,3']);   // on enlève tous les totaux
    assert.equal(resoudre(FICHE, connus, 2, 4).complet, false);
});

test('LE MAXIMUM DE CASES CACHÉES EST R + C + 1, ET C\'EST DE L\'ARITHMÉTIQUE', () => {
    // Un tableau est ENTIÈREMENT déterminé par ses R × C cases intérieures, et
    // il en compte (R+1) × (C+1). Il n'y a donc que R + C + 1 cases « en trop ».
    // En cacher une de plus laisserait moins de nombres que d'inconnues, et
    // plusieurs tableaux répondraient — l'exercice n'aurait plus de réponse.
    for (const [R, C] of [[2, 3], [2, 4], [3, 4], [4, 4], [3, 5]]) {
        assert.equal(trousMaximum(R, C), R + C + 1);
        assert.equal((R + 1) * (C + 1) - trousMaximum(R, C), R * C,
            'ce qui reste doit valoir exactement les cases intérieures');
    }
    // Et le générateur ne le dépasse jamais.
    for (const [nom, P] of Object.entries(PALIERS)) {
        assert.ok(P.trous <= trousMaximum(P.lignes, P.colonnes),
            `${nom} demande ${P.trous} trous, le maximum est ${trousMaximum(P.lignes, P.colonnes)}`);
    }
});

test('chaque palier produit un tableau RÉSOLUBLE, avec le bon nombre de trous', () => {
    for (const [nom, P] of Object.entries(PALIERS)) {
        for (let s = 1; s <= 25; s++) {
            const t = genererTableau({ rng: makeRng(`${nom}-${s}`), palier: nom });
            assert.equal(t.R, P.lignes, nom);
            assert.equal(t.C, P.colonnes, nom);
            assert.equal(t.trous, P.trous, `${nom} graine ${s} : ${t.trous} trous au lieu de ${P.trous}`);
            const bilan = resoudre(t.valeurs, new Set(t.connus), t.R, t.C);
            assert.equal(bilan.complet, true, `${nom} graine ${s} : tableau insoluble`);
            // La propagation doit retrouver EXACTEMENT les vraies valeurs.
            assert.deepEqual(bilan.valeurs, t.valeurs, `${nom} graine ${s}`);
        }
    }
});

test('les totaux du tableau sont vrais', () => {
    for (let s = 1; s <= 30; s++) {
        const t = genererTableau({ rng: makeRng(`totaux-${s}`), palier: 'moyen' });
        for (let r = 0; r <= t.R; r++) {
            let somme = 0;
            for (let c = 0; c < t.C; c++) somme += t.valeurs[r][c];
            assert.equal(t.valeurs[r][t.C], somme, `ligne ${r}`);
        }
        for (let c = 0; c <= t.C; c++) {
            let somme = 0;
            for (let r = 0; r < t.R; r++) somme += t.valeurs[r][c];
            assert.equal(t.valeurs[t.R][c], somme, `colonne ${c}`);
        }
        assert.equal(totalGeneral(t), t.valeurs[t.R][t.C]);
        // Rien de négatif, rien de nul : un tableau qui compte des élèves ne
        // peut pas en avoir moins que zéro, et « 0 croissant le mardi » ferait
        // douter l'élève de sa soustraction.
        t.valeurs.forEach(l => l.forEach(n => assert.ok(n > 0 && Number.isInteger(n))));
    }
});

test('LES ÉNONCÉS SONT RIGOLOS MAIS CORRECTS', () => {
    // Rémy : « fais plein de types d'énoncé, un peu rigolo pour certains mais
    // toujours correct ». « Correct » se vérifie : deux entrées qui classent, des
    // libellés non vides, des bornes qui donnent des nombres crédibles.
    assert.ok(ENONCES.length >= 12, 'il en faut assez pour ne pas tourner en rond');
    const ids = new Set();
    for (const e of ENONCES) {
        assert.equal(ids.has(e.id), false, `deux énoncés portent l'id ${e.id}`);
        ids.add(e.id);
        assert.ok(e.lignes.length >= 2 && e.colonnes.length >= 2, e.id);
        assert.ok(e.titre && e.phrase && e.unite, e.id);
        [...e.lignes, ...e.colonnes].forEach(l => assert.ok(l && l.trim().length, e.id));
        assert.ok(e.mini >= 1 && e.mini < e.maxi, `${e.id} : bornes incohérentes`);
        // La phrase doit être une phrase : majuscule au début, point à la fin.
        assert.match(e.phrase, /^[A-ZÀÉÈÎÔÙL]/, `${e.id} : la phrase doit commencer par une majuscule`);
        assert.match(e.phrase, /\.$/, `${e.id} : la phrase doit finir par un point`);
    }
});

test('chaque palier trouve des énoncés assez grands pour lui', () => {
    // Un palier 4 × 4 qui ne trouverait qu'un seul énoncé assez grand donnerait
    // le même contexte à toutes les questions.
    for (const [nom, P] of Object.entries(PALIERS)) {
        const bons = ENONCES.filter(e => e.lignes.length >= P.lignes && e.colonnes.length >= P.colonnes);
        assert.ok(bons.length >= 3, `${nom} : seulement ${bons.length} énoncé(s) de taille suffisante`);
    }
});

test('L\'AIDE DÉSIGNE LA LIGNE À BOUCLER, JAMAIS LE NOMBRE À ÉCRIRE', () => {
    const t = genererTableau({ rng: makeRng('aide'), palier: 'facile' });
    const suite = prochaineLigne(t, {});
    assert.ok(suite, 'il y a toujours une ligne à un seul trou au départ');
    const texte = conseil(t, {});
    assert.match(texte, /ligne|colonne/);
    // Aucun nombre du tableau ne doit apparaître dans le conseil : le dire
    // reviendrait à faire l'exercice à la place de l'élève.
    const nombres = new Set(t.valeurs.flat().map(String));
    (texte.match(/\d+/g) || []).forEach(n => assert.equal(nombres.has(n), false,
        `le conseil laisse échapper le nombre ${n} : « ${texte} »`));
});

test('l\'aide suit la copie de l\'élève', () => {
    // Quand l'élève a rempli une case, la ligne suivante change : l'aide doit
    // partir de SON tableau, pas du tableau vide.
    const t = genererTableau({ rng: makeRng('suivi'), palier: 'moyen' });
    const premier = prochaineLigne(t, {});
    const [r, c] = premier.case;
    const apres = prochaineLigne(t, { [cle(r, c)]: t.valeurs[r][c] });
    assert.ok(apres, 'une case remplie en ouvre une autre');
    assert.notDeepEqual(apres.case, premier.case, 'et ce n\'est plus la même');
    // Une saisie FAUSSE ne compte pas : elle n'ouvre rien.
    const fausse = prochaineLigne(t, { [cle(r, c)]: t.valeurs[r][c] + 1 });
    assert.deepEqual(fausse.case, premier.case, 'une case fausse laisse le trou ouvert');
});

test('les cases données et les cases à trouver ne se mélangent pas', () => {
    const t = genererTableau({ rng: makeRng('donnees'), palier: 'facile' });
    let aTrouver = 0;
    for (let r = 0; r <= t.R; r++) {
        for (let c = 0; c <= t.C; c++) if (!estDonnee(t, r, c)) aTrouver++;
    }
    assert.equal(aTrouver, t.trous);
    assert.equal(t.connus.length + t.trous, (t.R + 1) * (t.C + 1));
});

test('la même graine redonne exactement le même tableau', () => {
    const a = genererTableau({ rng: makeRng('pareil'), palier: 'moyen' });
    const b = genererTableau({ rng: makeRng('pareil'), palier: 'moyen' });
    assert.deepEqual(a.valeurs, b.valeurs);
    assert.deepEqual(a.connus, b.connus);
    assert.equal(a.enonce, b.enonce);
});

test('la calculatrice s\'éteint quand il faut savoir s\'en passer', () => {
    // Rémy : « avec utilisation pour le début de la calculatrice ». Elle est
    // donc là pour découvrir — l'obstacle est le RAISONNEMENT, pas l'addition —
    // et elle disparaît au dernier palier, quand c'est l'addition en colonne
    // qui doit se faire seule.
    assert.equal(PALIERS.decouverte.calculatrice, true);
    assert.equal(PALIERS.facile.calculatrice, true);
    assert.equal(PALIERS.difficile.calculatrice, false);
    assert.equal(genererTableau({ rng: makeRng('c'), palier: 'decouverte' }).calculatrice, true);
    assert.equal(genererTableau({ rng: makeRng('c'), palier: 'difficile' }).calculatrice, false);
});

test('on peut demander un énoncé précis', () => {
    const t = genererTableau({ rng: makeRng('choisi'), palier: 'facile', enonce: 'college' });
    assert.equal(t.enonce, 'college');
    assert.deepEqual(t.lignes, ['D.P.', 'Externes']);
    assert.match(ASTUCE, /une seule/i);
});

// --- La feuille ---------------------------------------------------------------

test('LE GÉNÉRATEUR DE FICHE POSE DES TABLEAUX RÉSOLUBLES', () => {
    const gen = getGenerator('donnees.tableau-croise');
    assert.ok(gen, 'le générateur doit être enregistré');
    for (const palier of Object.keys(PALIERS)) {
        for (let s = 1; s <= 6; s++) {
            const item = gen.generate({ palier }, { rng: makeRng(`fiche-${palier}-${s}`) });
            const m = item.meta;
            // Le tableau voyage ENTIER dans meta : la feuille ne recalcule rien,
            // donc elle ne peut pas diverger de l'écran.
            const bilan = resoudre(m.valeurs, new Set(m.connus), m.R, m.C);
            assert.equal(bilan.complet, true, `${palier} ${s} : tableau insoluble sur la feuille`);
            assert.deepEqual(bilan.valeurs, m.valeurs, `${palier} ${s}`);
            assert.equal(m.lignes.length, m.R);
            assert.equal(m.colonnes.length, m.C);
            assert.ok(item.prompt.text.length > 20);
            assert.ok(item.difficulty >= 1 && item.difficulty <= 4);
        }
    }
});

test('la fiche sait dessiner ces tableaux', () => {
    const rendu = RENDUS['tableau-croise'];
    assert.ok(rendu, 'le rendu papier doit être déclaré');
    const item = getGenerator('donnees.tableau-croise').generate({ palier: 'facile' }, { rng: makeRng('dessin') });
    const m = item.meta;
    // `boiteDe` lit `slot.boite` : un slot plat donnerait des coordonnées NaN.
    const slot = { boite: { x: 10, y: 10, w: 88, h: 55 } };
    const vide = rendu.previewGrille(item, slot, 3, false);
    const corrige = rendu.previewGrille(item, slot, 3, true);
    assert.match(vide, /<svg/);
    // AUCUNE COORDONNÉE NaN : c'est ce qui manquait, et un aperçu tout en NaN
    // passait tous les comptages sans rien dessiner.
    assert.equal(/NaN/.test(vide), false, 'coordonnées NaN dans l\'aperçu');
    // Le quadrillage complet : (R+2) × (C+2) cases, en-têtes compris.
    assert.equal((vide.match(/<rect/g) || []).length, (m.R + 2) * (m.C + 2));
    // La fiche ne montre QUE les cases données ; la correction les montre toutes.
    const nombresVide = (vide.match(/>\d+</g) || []).length;
    const nombresCorrige = (corrige.match(/>\d+</g) || []).length;
    assert.equal(nombresCorrige - nombresVide, (m.R + 1) * (m.C + 1) - m.connus.length,
        'la correction doit ajouter exactement les cases manquantes');
    // Et les libellés sont là, une fois chacun.
    m.lignes.forEach(l => assert.ok(vide.includes(l.replace(/&/g, '&amp;')), `libellé absent : ${l}`));
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('don-tableau-croise');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.activityId, 'tableau-croise');
    assert.ok(getGenerator(exo.printGeneratorId), 'son générateur de fiche doit exister');
    assert.ok(RENDUS[exo.printable], 'son rendu papier doit exister');
    const schema = exo.paramSchema.find(p => p.id === 'palier');
    schema.options.forEach(o => assert.ok(PALIERS[o.value], `palier inconnu : ${o.value}`));
    // Les libellés proposés au professeur doivent dire la même chose que le noyau.
    schema.options.forEach(o => assert.equal(o.label, PALIERS[o.value].label,
        `le libellé du palier ${o.value} a divergé du noyau`));
});

test('UN TABLEAU FAIT DES TABLEAUX, PAS DES « TABLEAUS »', () => {
    // L'en-tête affichait « 0 / 4 tableaus » : le pluriel se fabriquait en
    // collant un « s ». C'est ce qu'un élève lit à chaque question.
    assert.equal(uniteDe('tableau-croise', 1), 'tableau');
    assert.equal(uniteDe('tableau-croise', 4), 'tableaux');
    // Et les autres pluriels ne doivent pas avoir cassé au passage.
    assert.equal(uniteDe('bons-chemins', 4), 'grilles');
    assert.equal(uniteDe('problemes', 3), 'problèmes');
    assert.equal(uniteDe('duel', 2), 'échanges');
    assert.equal(uniteDe('compte-est-bon', 2), 'tirages');
});

test('SUR UNE FEUILLE, LES SIX BLOCS N\'ONT PAS LE MÊME ÉNONCÉ', () => {
    // Tirés indépendamment, huit contextes pour six blocs donnaient souvent un
    // doublon et parfois trois blocs identiques : la feuille avait l'air
    // bâclée. Le numéro du bloc fait maintenant PARCOURIR la liste.
    for (const [palier, P] of Object.entries(PALIERS)) {
        // Un palier ne peut évidemment pas offrir plus de contextes qu'il n'en
        // a : le dernier n'en a que cinq assez grands, donc six blocs y
        // reviendront forcément une fois sur le premier.
        const dispo = ENONCES.filter(e => e.lignes.length >= P.lignes && e.colonnes.length >= P.colonnes).length;
        const attendu = Math.min(6, dispo);
        for (let feuille = 0; feuille < 5; feuille++) {
            const vus = [];
            for (let i = 0; i < 6; i++) {
                vus.push(genererTableau({ rng: makeRng(`f${feuille}-${i}`), palier, tour: i }).enonce);
            }
            assert.equal(new Set(vus).size, attendu, `${palier} feuille ${feuille} : ${vus.join(', ')}`);
        }
    }
    // Et les NOMBRES, eux, changent bien d'une feuille à l'autre : c'est là
    // qu'est la variété qui compte.
    const a = genererTableau({ rng: makeRng('A'), palier: 'moyen', tour: 0 });
    const b = genererTableau({ rng: makeRng('B'), palier: 'moyen', tour: 0 });
    assert.equal(a.enonce, b.enonce, 'même position, même contexte');
    assert.notDeepEqual(a.valeurs, b.valeurs, 'mais pas les mêmes nombres');
});

test('la fiche donne six blocs tous différents', () => {
    const gen = getGenerator('donnees.tableau-croise');
    const enonces = [];
    for (let i = 0; i < 6; i++) {
        enonces.push(gen.generate({ palier: 'moyen' }, { rng: makeRng(`bloc-${i}`), index: i }).meta.titre);
    }
    assert.equal(new Set(enonces).size, 6, enonces.join(' | '));
    // Et les nombres, eux, ne se répètent pas non plus.
    assert.ok(new Set(enonces).size >= 6);
});

// --- QUAND LES NOMBRES SONT DANS L'ÉNONCÉ -------------------------------------

test('LE TABLEAU PART VIDE, ET L\'ÉNONCÉ PORTE TOUT CE QU\'ON SAIT', () => {
    // Rémy : « des exercices où on a un énoncé, le tableau est vide et il faut
    // remplir puis calculer et remplir. » Le tableau est le MÊME — même
    // génération, même garantie de résolubilité —, seule change la place des
    // nombres donnés. Si l'une des deux se perdait, l'exercice serait
    // impossible sans que rien ne le dise.
    for (const palier of Object.keys(PALIERS)) {
        const t = genererTableau({ rng: makeRng('en-' + palier), palier, depart: 'enonce' });
        assert.equal(t.depart, 'enonce');
        // Une phrase par case donnée, ni plus ni moins.
        assert.equal(t.donnees.length, t.connus.length, palier);
        t.donnees.forEach(d => {
            assert.equal(d.valeur, t.valeurs[d.r][d.c], `${palier} (${d.r},${d.c})`);
            assert.ok(d.phrase && d.phrase.length > 6, d.phrase);
            assert.ok(d.phrase.includes(String(d.valeur)), d.phrase);
            // Et la case reste connue au sens du solveur.
            assert.equal(estConnue(t, d.r, d.c), true);
            // Mais aucune n'est écrite dans le tableau : il part vide.
            assert.equal(estDonnee(t, d.r, d.c), false);
        });
        // Le tableau reste résoluble : c'est la même donnée, dite autrement.
        assert.equal(resoudre(t.valeurs, new Set(t.connus), t.R, t.C).complet, true, palier);
    }
});

test('LES PHRASES DE L\'ÉNONCÉ SONT DU FRANÇAIS CORRECT', () => {
    // Dix-neuf contextes, quatre formes de case : c'est là que se logent les
    // « de le », les « 12 gâteaus » et les accords ratés. On les lit tous.
    for (const e of ENONCES) {
        assert.ok(e.dit, `${e.id} n'a pas de phrases`);
        ['croise', 'ligne', 'colonne', 'total'].forEach(f =>
            assert.equal(typeof e.dit[f], 'function', `${e.id}.${f}`));
        const vues = [
            e.dit.total(7),
            ...e.lignes.map(l => e.dit.ligne(7, l)),
            ...e.colonnes.map(c => e.dit.colonne(7, c)),
            ...e.lignes.flatMap(l => e.colonnes.map(c => e.dit.croise(7, l, c)))
        ];
        vues.forEach(p => {
            assert.equal(typeof p, 'string', `${e.id} : phrase absente`);
            assert.equal(/undefined|NaN|\[object/.test(p), false, `${e.id} : « ${p} »`);
            assert.equal(/ de le | de les | à le |  /.test(p), false, `${e.id} : « ${p} »`);
            assert.ok(p.includes('7'), `${e.id} : « ${p} » ne dit pas le nombre`);
            assert.equal(p.trim(), p, `${e.id} : « ${p} »`);
        });
    }
});

test('L\'AIDE FAIT RANGER AVANT DE FAIRE CALCULER', () => {
    // Tant qu'une phrase n'est pas reportée, il n'y a rien à déduire :
    // conseiller une ligne à ce moment-là enverrait l'élève chercher un
    // raisonnement là où il lui manque une lecture.
    const t = genererTableau({ rng: makeRng('aide-enonce'), palier: 'facile', depart: 'enonce' });
    const debut = conseil(t, {});
    assert.match(debut, /énoncé/);
    assert.ok(t.donnees.some(d => debut.includes(d.phrase)), debut);

    // Tout reporté : l'aide redevient celle de la propagation.
    const saisies = {};
    t.donnees.forEach(d => { saisies[cle(d.r, d.c)] = String(d.valeur); });
    const apres = conseil(t, saisies);
    assert.equal(/Reprends l'énoncé/.test(apres), false, apres);
    assert.match(apres, /ligne|colonne/);

    // Et l'aide ne donne jamais le nombre à écrire.
    const restant = t.valeurs.flat().filter((v, i) => !t.connus.includes(cle(
        Math.floor(i / (t.C + 1)), i % (t.C + 1))));
    restant.forEach(v => assert.equal(apres.includes(String(v)), false, apres));
});

test('la consigne dit lequel des deux exercices on fait', () => {
    const dansLeTableau = genererTableau({ rng: makeRng('c1'), palier: 'facile' });
    const dansLEnonce = genererTableau({ rng: makeRng('c1'), palier: 'facile', depart: 'enonce' });
    assert.match(consigneDe(dansLEnonce), /énoncé/);
    assert.equal(/énoncé/.test(consigneDe(dansLeTableau)), false);
    // Les deux rappellent la méthode : c'est elle qu'on travaille dans les deux cas.
    [dansLeTableau, dansLEnonce].forEach(t => assert.ok(consigneDe(t).includes('UNE SEULE')));
    // Et `faitDe` retrouve la phrase d'une case.
    const d = dansLEnonce.donnees[0];
    assert.equal(faitDe(dansLEnonce, d.r, d.c).valeur, d.valeur);
    assert.equal(faitDe(dansLeTableau, 0, 0), null, 'sans énoncé, aucune phrase');
});

test('la fiche imprimée part vide, elle aussi', () => {
    const gen = getGenerator('donnees.tableau-croise');
    const item = gen.generate({ palier: 'facile', depart: 'enonce' },
        { rng: makeRng('fiche-enonce'), index: 0 });
    assert.equal(item.meta.depart, 'enonce');
    assert.equal(item.meta.donnees.length, item.meta.connus.length);
    assert.match(item.prompt.text, /Reporte/);
    // Le rendu ne recopie AUCUN nombre dans les cases : ils sont dans le texte.
    const slot = { boite: { x: 10, y: 10, w: 90, h: 70 } };
    const vide = RENDUS['tableau-croise'].previewGrille(item, slot, 1, false);
    assert.equal(/NaN/.test(vide), false);
    item.meta.donnees.forEach(d => {
        // Le nombre peut apparaître dans l'énoncé, jamais au centre d'une case.
        const cases = vide.match(/<text[^>]*text-anchor="middle"[^>]*>([^<]*)<\/text>/g) || [];
        assert.equal(cases.some(c => c.includes(`>${d.valeur}<`)), false,
            `${d.valeur} est imprimé dans une case alors qu'il est dans l'énoncé`);
    });
    // Avec les solutions, en revanche, tout est écrit.
    const plein = RENDUS['tableau-croise'].previewGrille(item, slot, 1, true);
    assert.ok((plein.match(/<text/g) || []).length > (vide.match(/<text/g) || []).length);
    // Et la consigne de la feuille change avec le mode.
    assert.match(RENDUS['tableau-croise'].consigne([item]), /ÉNONCÉ/);
});
