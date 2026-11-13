// LE VOL DES CARTES : L'ÉCHELLE DE VITESSE, ET LE BORD PAR OÙ SORT LE TRAIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « pour les puissances de 10 qui bougent tu peux pas
// mettre un slide de vitesse, là ça bouge mais vraiment peu, j'adorerais que ça
// se déplace partout dans l'écran quitte à ce que le trait qui relie soit pas
// forcément sur le bord droit ».
//
// ── CE QUE CETTE ÉPREUVE PEUT, ET CE QU'ELLE NE PEUT PAS ───────────────────
//
// Elle ne peut pas dire si les cartes VOLENT : cela demande une mise en page,
// une boucle d'images et une mesure sur la durée. C'est le métier de
// `tools/lesCartesVolent.mjs`, qui suit une carte pendant six secondes et
// compare le TERRITOIRE visité au CHEMIN parcouru — la seule façon de séparer
// un vol d'une oscillation, si rapide soit-elle.
//
// Elle garde les deux morceaux qui se calculent à froid, et ce sont les deux
// où l'on se trompe sans le voir :
//
//   1. UNE SÉANCE PRÉPARÉE AVANT NE REPART PAS AU HASARD. Le réglage était un
//      menu à trois mots ; il est devenu une glissière de 1 à 10. « rapide »
//      doit rester rapide.
//   2. LE TRAIT SORT PAR LE BON CÔTÉ. Une erreur de signe le fait sortir par le
//      côté opposé : il traverse alors sa propre carte pour aller rejoindre
//      l'autre, et cela ne lève aucune erreur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    niveauDeVitesse, allureDuVol, sortieDuRectangle,
    VITESSE_MIN, VITESSE_MAX, VITESSE_DEFAUT, ANCIENNES_VITESSES
} from '../js/core/volDesCartes.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ── 1 · L'ÉCHELLE ───────────────────────────────────────────────────────────

test('UNE SÉANCE PRÉPARÉE AVANT GARDE SON ALLURE', () => {
    // Le réglage valait « lent », « normal » ou « rapide ». Ces trois mots sont
    // dans les parcours enregistrés, dans les codes dictés déjà donnés à des
    // classes, et dans la bibliothèque. Les perdre, c'est faire repartir une
    // séance à une vitesse que personne n'a choisie.
    assert.equal(niveauDeVitesse('lent'), 2);
    assert.equal(niveauDeVitesse('normal'), 4);
    assert.equal(niveauDeVitesse('rapide'), 7);
    // ET ELLES SONT ORDONNÉES COMME LEURS NOMS LE DISENT.
    assert.ok(ANCIENNES_VITESSES.lent < ANCIENNES_VITESSES.normal);
    assert.ok(ANCIENNES_VITESSES.normal < ANCIENNES_VITESSES.rapide);
});

test('ET N’IMPORTE QUOI D’AUTRE REND LE DÉFAUT, JAMAIS UNE ERREUR', () => {
    // Un réglage est une donnée qui vient du dehors : d'un code dicté recopié
    // à la main, d'un fichier de séance édité, d'une version future. Un jeu qui
    // refuse de démarrer sur un réglage illisible est un jeu qui s'arrête
    // devant une classe.
    for (const brut of [undefined, null, '', 'turbo', NaN, {}, []]) {
        assert.equal(niveauDeVitesse(brut), VITESSE_DEFAUT,
            `« ${JSON.stringify(brut)} » doit rendre le défaut`);
    }
    // ET LES DÉBORDEMENTS SE RABATTENT sur les bornes : 0 et 99 sont des
    // valeurs qu'un fichier peut porter, et une vitesse nulle fige le jeu
    // pendant qu'une vitesse de 99 rend les cartes impossibles à viser.
    assert.equal(niveauDeVitesse(0), VITESSE_MIN);
    assert.equal(niveauDeVitesse(-5), VITESSE_MIN);
    assert.equal(niveauDeVitesse(99), VITESSE_MAX);
    assert.equal(niveauDeVitesse('7'), 7, 'une chaîne de chiffres est un nombre');
    assert.equal(niveauDeVitesse(4.4), 4, 'et un décimal se range sur un cran');
});

test('L’ALLURE MONTE AVEC LE CRAN, ET LE PLUS LENT BOUGE DÉJÀ', () => {
    // LE PLANCHER A ÉTÉ RELEVÉ APRÈS MESURE. À 20 px/s, une carte parcourait
    // 120 pixels en six secondes : elle avait l'air immobile pendant tout le
    // temps qu'on la regarde — c'est-à-dire qu'elle méritait encore « là ça
    // bouge mais vraiment peu », la remarque de départ.
    assert.ok(allureDuVol(1) >= 30,
        `le cran le plus lent vaut ${allureDuVol(1)} px/s : en dessous de 30, la carte `
        + 'a l’air immobile pendant les six secondes qu’on la regarde');
    for (let n = VITESSE_MIN; n < VITESSE_MAX; n++) {
        assert.ok(allureDuVol(n + 1) > allureDuVol(n),
            `le cran ${n + 1} doit être plus rapide que le cran ${n}`);
    }
    // ET LE PLUS RAPIDE TRAVERSE VRAIMENT : mille pixels en moins de six
    // secondes, sinon « il faut viser » n'est pas vrai.
    assert.ok(allureDuVol(VITESSE_MAX) >= 1000 / 6,
        `${allureDuVol(VITESSE_MAX)} px/s : trop lent pour traverser un tableau en six secondes`);
    // L'ÉCHELLE ACCEPTE AUSSI LES ANCIENS MOTS : `allureDuVol('rapide')` ne doit
    // pas rendre NaN, parce que le jeu passe le réglage brut.
    assert.equal(allureDuVol('rapide'), allureDuVol(7));
});

// ── 2 · LE TRAIT ────────────────────────────────────────────────────────────

const CARTE = { x: 100, y: 100, demiL: 50, demiH: 20 };

test('CÔTE À CÔTE, LE TRAIT SORT PAR LE BORD DROIT — comme avant', () => {
    // L'ANCIEN COMPORTEMENT EST LE CAS PARTICULIER DU NOUVEAU, et c'est ce qui
    // permet de n'avoir qu'un seul chemin à tenir. Deux colonnes qui se font
    // face, une carte à gauche, sa partenaire à droite : le trait part du bord
    // droit, à mi-hauteur.
    const p = sortieDuRectangle(CARTE, { x: 400, y: 100 });
    assert.equal(p.x, 150, 'le bord droit');
    assert.equal(p.y, 100, 'à mi-hauteur');
});

test('ET QUAND LA CARTE A VOLÉ, IL SORT PAR LE CÔTÉ OÙ L’ON VA', () => {
    // C'est la phrase de Rémy qui a débloqué le vol : « quitte à ce que le
    // trait qui relie soit pas forcément sur le bord droit ».
    assert.equal(sortieDuRectangle(CARTE, { x: -400, y: 100 }).x, 50, 'vers la gauche : bord gauche');
    assert.equal(sortieDuRectangle(CARTE, { x: 100, y: -400 }).y, 80, 'vers le haut : bord haut');
    assert.equal(sortieDuRectangle(CARTE, { x: 100, y: 400 }).y, 120, 'vers le bas : bord bas');
});

test('LE POINT RENDU EST TOUJOURS SUR LE BORD, JAMAIS DEDANS NI DEHORS', () => {
    // C'est la propriété qui compte, et elle se vérifie sur tout un tour : un
    // point à l'intérieur ferait un trait qui commence sous sa propre carte ;
    // un point à l'extérieur ferait un trait qui flotte à côté d'elle.
    for (let a = 0; a < 360; a += 7) {
        const r = (a * Math.PI) / 180;
        const vers = { x: CARTE.x + Math.cos(r) * 1000, y: CARTE.y + Math.sin(r) * 1000 };
        const p = sortieDuRectangle(CARTE, vers);
        const dx = Math.abs(p.x - CARTE.x), dy = Math.abs(p.y - CARTE.y);
        // Sur le bord : l'une des deux distances vaut exactement la demi-taille,
        // et l'autre ne la dépasse pas.
        const surUnBord = Math.abs(dx - CARTE.demiL) < 1e-9 || Math.abs(dy - CARTE.demiH) < 1e-9;
        assert.ok(surUnBord, `angle ${a}° : le point (${p.x}, ${p.y}) n’est sur aucun bord`);
        assert.ok(dx <= CARTE.demiL + 1e-9 && dy <= CARTE.demiH + 1e-9,
            `angle ${a}° : le point sort du rectangle`);
    }
});

test('UNE CIBLE À L’INTÉRIEUR NE PROJETTE PAS LE TRAIT DEHORS', () => {
    // DEUX CARTES QUI SE CHEVAUCHENT, ou un doigt posé sur la carte qu'on tire.
    // Sans le plafond à 1, le facteur d'intersection dépasse un et le point
    // rendu part DE L'AUTRE CÔTÉ du centre — le trait s'inverse.
    const dedans = { x: 110, y: 105 };
    const p = sortieDuRectangle(CARTE, dedans);
    assert.deepEqual(p, dedans, 'une cible intérieure se rend telle quelle');
    // Et le cas dégénéré : la cible EST le centre.
    assert.deepEqual(sortieDuRectangle(CARTE, { x: 100, y: 100 }), { x: 100, y: 100 });
});

// ── 3 · CE QUE LE JEU EN FAIT ───────────────────────────────────────────────

test('LE JEU EMPLOIE L’ÉCHELLE, ET N’EN GARDE PAS UNE COPIE', () => {
    const jeu = lire('js/games/apparier.js');
    assert.match(jeu, /from '\.\.\/core\/volDesCartes\.js'/,
        'le jeu doit importer l’échelle, pas la recopier');
    assert.ok(!/const VITESSES = \{/.test(jeu),
        'l’ancienne table des trois vitesses ne doit plus être là : deux échelles '
        + 'finiraient par se contredire');
    // ET L'ANIMATION CSS A DISPARU : une oscillation entre deux points ne
    // déplace rien, et la garder « au cas où » donne deux mécanismes de
    // mouvement dont un seul marche.
    const css = lire('css/modules.css');
    assert.ok(!/@keyframes pa-flotte/.test(css),
        'l’image clef `pa-flotte` n’est plus employée depuis que les cartes volent');
});

test('ET LE RÉGLAGE EST UNE GLISSIÈRE, PAS TROIS CHOIX', () => {
    // Rémy : « tu peux pas mettre un slide de vitesse ». Un `number` borné en
    // forme une tout seul — voir `core/echelle.js` —, et c'est lui qui l'avait
    // demandée : « je pensais à qqch, un slider de paramètres ».
    const data = lire('js/data/numeration.js');
    const i = data.indexOf("id: 'vitesse', type: 'number', label: 'À quelle vitesse ça bouge'");
    assert.notEqual(i, -1, 'le réglage de vitesse doit être un nombre borné');
    const bloc = data.slice(i, i + 200);
    assert.match(bloc, /min: 1, max: 10/,
        'les bornes font la glissière : sans elles, `echelleDe` rend un champ à taper');
});
