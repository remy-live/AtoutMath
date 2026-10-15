// L'ÉCRAN DE LA CLASSE — ce que ses cinq onglets doivent garder.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en une fois, capture à l'appui :
//
//   « mets des onglets c'est pas terrible et un onglet aussi avec la liste de
//     classe. J'ai du mal à voir la différence avec les murs et le direct.
//     Et aussi la séance en cours, mets le fond d'une autre couleur.
//     Et pour les bilans, propose des onglets, fais le au parcours, de manière
//     globale, une conseil pour chaque élève. »
//
// Quatre règles en sont sorties, et chacune se perd en une ligne :
//
//   · un seul outil de l'heure ouvert à la fois ;
//   · la liste de la classe se lit SANS quitter le direct ;
//   · chaque onglet dit ce qu'il est — le direct et le mur montrent la même
//     classe à la même seconde, et rien ne disait pour quoi faire ;
//   · la séance en cours se voit à son FOND, pas à un filet de quatre pixels ;
//   · les bilans se lisent en trois onglets, dont les conseils.
//
// ── POURQUOI DES ÉPREUVES DE SOURCE ───────────────────────────────────────
//
// Cet écran ne se monte que dans un navigateur, en professeur, sur une classe
// qui a des élèves. Ce qui se vérifie ici est ce qui se lit ; les mesures, elles,
// se refont à la sonde (`tools/tmp/pilote2.mjs` et `tools/tmp/bilans.mjs`), qui
// donnent la hauteur de la barre, l'alignement des champs en pixels et la
// couleur réellement peinte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, valeurDe } from './aidesCss.mjs';

const SOURCE = 'js/ui/espaceClasses.js';
const source = lireFeuille(SOURCE);
const feuille = lireFeuille('css/ui.css');

test('LES OUTILS DE L\'HEURE SONT DE VRAIS ONGLETS', () => {
    // RÉMY, deux fois. D'abord « mets des onglets c'est pas terrible », puis,
    // devant les pastilles dépliantes qui avaient suivi : « là ce sont des
    // boutons qui ouvrent ou ferment pas terrible ca fait un peu désorganié ».
    //
    // CE QUI CLOCHAIT : la pastille ouverte prenait toute la largeur et
    // poussait les six autres sur la ligne suivante. La rangée changeait donc
    // de forme à chaque clic. Mesuré après la correction : la rangée d'onglets
    // reste au même pixel (437, hauteur 53) qu'on ouvre le défi, le chrono ou
    // rien du tout.
    assert.match(source, /class="ec-pilote-onglets" role="tablist"/,
        'la rangée d\'onglets a disparu');
    assert.match(source, /class="ec-pilote-panneau" role="tabpanel"/,
        'le panneau unique a disparu : les outils se rouvrent chacun chez soi');
    assert.doesNotMatch(source, /<details class="ec-pilote-outil/,
        'les pastilles dépliantes sont revenues');
    // SEPT OUTILS, ET CHACUN SON CORPS : un onglet sans corps est un bouton
    // qui ne fait rien.
    const table = source.slice(source.indexOf('const OUTILS_DE_LHEURE = ['),
        source.indexOf('function barrePiloteHtml'));
    const cles = table.match(/cle: '/g) || [];
    const corps = table.match(/corps: outil/g) || [];
    assert.equal(cles.length, 7, `${cles.length} outils au lieu de sept`);
    assert.equal(corps.length, cles.length, 'un onglet n\'a pas de corps');
    // ET UN SECOND CLIC REFERME : c'est ce qui rend la barre à deux lignes
    // au-dessus de la liste des élèves, qui est ce qu'on vient regarder.
    assert.match(source, /vue\.outil = vue\.outil === d\.outil \? null : d\.outil;/,
        'l\'onglet ouvert ne se referme plus : la barre reste dépliée');
});

test('LA LISTE DE LA CLASSE SE LIT SANS QUITTER LE DIRECT', () => {
    // RÉMY : « et un onglet aussi avec la liste de classe ». Ce qu'on y cherche
    // en plein cours est LE CODE d'un élève qui n'arrive pas à entrer, pendant
    // que les vingt-neuf autres travaillent — aller le chercher dans « Les
    // élèves » coûte de perdre les vingt-neuf de vue.
    // L'APPEL, PAS LA DÉFINITION : `/listeDePoche\(\)/` trouvait `function
    // listeDePoche()` et restait verte alors que la barre ne l'appelait plus.
    assert.match(source, /\$\{listeDePoche\(\)\}/,
        'la barre n\'appelle plus la liste de poche');
    const corps = source.slice(source.indexOf('function listeDePoche'),
        source.indexOf('function aQuiLaCalculatrice'));
    for (const quoi of ['join_code', 'e.login', 'e.code', 'estEnLigne']) {
        assert.ok(corps.includes(quoi),
            `la liste de poche ne montre plus « ${quoi} » : c'est pourtant ce qu'on y cherche`);
    }
});

test('CHAQUE ÉCRAN DE LA CLASSE DIT CE QU\'IL EST', () => {
    // RÉMY : « J'ai du mal à voir la différence avec les murs et le direct ».
    // Les deux montrent la même classe à la même seconde ; ce sont deux
    // POSTURES — assis avec les commandes, debout du fond de la salle.
    const dit = source.slice(source.indexOf('const DIT_ONGLET'),
        source.indexOf('// --- Onglet « Le direct »'));
    for (const cle of ['direct', 'seances', 'liste', 'bilans']) {
        assert.ok(new RegExp(`${cle}:`).test(dit), `l'onglet « ${cle} » ne dit plus ce qu'il est`);
    }
    assert.match(source, /class="ec-onglet-dit"/, 'la phrase n\'est plus affichée');
});

test('LE MUR EST UNE FORME DU DIRECT, ET NON UN ÉCRAN DE PLUS', () => {
    // RÉMY, deux fois : « J'ai du mal à voir la différence avec les murs et le
    // direct », puis « j'ai l'impression le direct et le mur font la même
    // chose mais présenté différement ».
    //
    // IL A RAISON : c'est la même classe, la même seconde, les mêmes données —
    // seule la forme change. J'avais d'abord répondu par une PHRASE sous
    // l'onglet, ce qui revenait à expliquer une distinction au lieu de la
    // supprimer. Deux onglets pour cela, c'est une question de plus à se poser
    // chaque fois qu'on ouvre l'écran.
    assert.doesNotMatch(source, /\$\{onglet\('mur'/,
        'l\'onglet « Le mur » est revenu : c\'est le même écran que le direct');
    assert.match(source, /data-forme-direct="tuiles"/,
        'l\'interrupteur « en tuiles » a disparu : le mur n\'est plus atteignable');
    assert.match(source, /\$\{enTuiles \? murHtml\(\) :/,
        'le direct ne sait plus se montrer en tuiles');
    // ET LE BATTEMENT NE SUIT PLUS QU'UN ÉCRAN.
    assert.doesNotMatch(source, /vue\.onglet === 'mur'/,
        'le battement cherche encore un onglet qui n\'existe plus');
});

test('LA SÉANCE EN COURS SE VOIT À SON FOND', () => {
    // RÉMY : « la séance en cours, mets le fond d'une autre couleur ». Elle ne
    // se distinguait que par un filet de quatre pixels à gauche — sur une liste
    // de quinze séances, cela ne se voit pas.
    const regle = corpsDeLaRegle(feuille, '.ec-seance--imposee', { ou: 'css/ui.css' });
    const fond = valeurDe(regle, 'background');
    assert.ok(fond, 'la séance en cours n\'a plus de fond : elle redevient une ligne comme les autres');
    // ET LES JETONS EXISTENT : un `color-mix` dont un nom est faux ne peint
    // RIEN, en silence. Ce dépôt a payé cette leçon trois fois.
    const base = lireFeuille('css/base.css');
    for (const m of fond.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
        assert.ok(base.includes(`${m[1]}:`),
            `la séance en cours peint avec « ${m[1] }», qui n'est déclaré nulle part : `
            + 'la règle sera ignorée en silence.');
    }
});

test('LES BILANS SE LISENT EN TROIS ONGLETS', () => {
    // RÉMY : « pour les bilans, propose des onglets, fais le au parcours, de
    // manière globale, une conseil pour chaque élève ».
    assert.match(source, /const SOUS_BILANS = \[/, 'les onglets des bilans ont disparu');
    for (const cle of ['ensemble', 'seance', 'conseils']) {
        assert.match(source, new RegExp(`'${cle}'`), `l'onglet « ${cle} » manque`);
    }
    // LE TABLEAU PAR SÉANCE N'EST PLUS DERRIÈRE UN INTERRUPTEUR : il vivait
    // replié en bas d'une page de deux écrans, et pour le voir il fallait
    // savoir qu'il existait.
    assert.doesNotMatch(source, /data-detail-bilan/,
        'le tableau par séance est reparti derrière son interrupteur');
    // ET LE PAPIER SUIT L'ONGLET QU'ON LIT.
    assert.match(source, /vue\.sousBilan === 'seance' \? seanceDuDetail\(\) : null/,
        'le PDF ne suit plus l\'onglet ouvert');
    // LES CONSEILS VIENNENT DU NOYAU, avec leur rang.
    assert.match(source, /conseilDuRapport\(l\)/, 'les conseils ne viennent plus du noyau');
    assert.match(source, /a\.rang - b\.rang/, 'les conseils ne sont plus rangés par urgence');
    // ET LES TROIS ONGLETS SONT BRANCHÉS : les fonctions peuvent toutes
    // exister sans qu'aucune ne soit appelée.
    assert.match(source, /quel === 'seance'\) return barre \+ detailParExerciceHtml/,
        'l\'onglet « Par séance » ne mène plus au tableau');
    assert.match(source, /quel === 'conseils'\) return barre \+ conseilsHtml/,
        'l\'onglet « Conseils » ne mène plus aux conseils');
});
