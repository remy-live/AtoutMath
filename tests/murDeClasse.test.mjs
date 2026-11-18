// LE MUR EN TUILES — ce qu'une tuile doit dire dans chacun des cinq états.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre, devant trois maquettes : « mets la maquette en réglage
// j'aime bien le C ».
//
// ── POURQUOI CETTE ÉPREUVE EXISTE, ET PAS SEULEMENT UNE SONDE ────────────
//
// `node tools/murDeLaClasse.mjs` mesure ce que seul un navigateur sait dire :
// la taille des tuiles en pixels, la barre de pilotage collée en bas, le
// réglage qui survit au rechargement, le mot qui ne s'efface plus au
// battement. Mais la classe d'essai est, par construction, celle où personne
// ne travaille — tous les anneaux à zéro, tous les élèves hors ligne. Les cinq
// états que la tuile distingue n'y apparaissent jamais.
//
// J'ai perdu une heure à essayer de faire travailler cinq élèves depuis une
// sonde, en pilotant leurs jeux au clavier, pour obtenir des anneaux non nuls.
// C'était le mauvais outil. Ici, les cinq états se posent en deux
// millisecondes, et sans dépendre d'un jeu qui a ses propres sondes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anneauSvg, quoiEtOu } from '../js/core/murDeClasse.js';

// La mise en mots d'une durée, que l'appelant fournit. On la fige ici : ce
// qu'on éprouve est la TUILE, pas l'orthographe des minutes.
const depuis = (s) => `${Math.round((s || 0) / 60)} min`;

const nombreDe = (svg) => {
    const m = svg.match(/text-anchor="middle">(\d+)<\/text>/);
    return m ? Number(m[1]) : null;
};
const arcDe = (svg) => {
    const m = svg.match(/stroke-dasharray="([\d.]+) ([\d.]+)"/);
    return m ? Number(m[1]) / Number(m[2]) : null;
};

test('L’ANNEAU ÉCRIT SON POURCENTAGE, et c’est lui qu’on lit de loin', () => {
    // « 60 » et « 65 » font deux arcs qu'aucun œil ne distingue à deux mètres,
    // et c'est pourtant la différence entre « il avance » et « il a presque
    // fini ». Un anneau sans son nombre est une jauge plate enroulée.
    assert.equal(nombreDe(anneauSvg(0)), 0);
    assert.equal(nombreDe(anneauSvg(60)), 60);
    assert.equal(nombreDe(anneauSvg(100)), 100);
    assert.equal(nombreDe(anneauSvg(59.6)), 60, 'on arrondit, on ne tronque pas');
});

test('L’ARC SUIT LE NOMBRE, du vide au tour complet', () => {
    assert.ok(Math.abs(arcDe(anneauSvg(0)) - 0) < 0.001);
    assert.ok(Math.abs(arcDe(anneauSvg(50)) - 0.5) < 0.01);
    assert.ok(Math.abs(arcDe(anneauSvg(100)) - 1) < 0.001);
});

test('UN POURCENTAGE ABERRANT NE CASSE PAS LE DESSIN', () => {
    // L'avancement vient du serveur : une fraction au-dessus de 1 — un élève
    // qui a répondu plus de questions que l'étape n'en prévoyait — ferait un
    // arc plus long que le cercle, qui se replie et dessine n'importe quoi.
    for (const p of [-10, 140, NaN, undefined, null]) {
        const svg = anneauSvg(p);
        const a = arcDe(svg);
        assert.ok(a >= 0 && a <= 1, `arc hors du cercle pour ${p} : ${a}`);
        assert.ok(nombreDe(svg) >= 0 && nombreDe(svg) <= 100, `nombre aberrant pour ${p}`);
    }
});

test('L’ANNEAU GRANDIT SANS QUE SON TRAIT S’ÉPAISSISSE NI SON NOMBRE SE DÉCENTRE', () => {
    for (const t of [28, 54, 80]) {
        const svg = anneauSvg(50, t);
        assert.match(svg, new RegExp(`width="${t}"`));
        assert.match(svg, new RegExp(`viewBox="0 0 ${t} ${t}"`));
        // Le nombre reste sur l'axe vertical du cercle, quelle que soit la
        // taille : un « 100 » décalé de trois pixels se voit tout de suite.
        assert.match(svg, new RegExp(`<text[^>]*x="${t / 2}"`));
    }
});

// ── LES CINQ ÉTATS, UN PAR UN ─────────────────────────────────────────────

const enCours = { pathName: 'Additions Mystères', fraction: 0.6,
    etapeEnCours: { posees: 6, prevues: 10 }, faites: 1, etapes: 4 };

test('QUI TRAVAILLE : ce qu’il fait, puis où il en est', () => {
    const { quoi, ou } = quoiEtOu({ etat: 'ok' }, enCours, depuis);
    assert.equal(quoi, 'Additions Mystères');
    assert.equal(ou, '6 / 10');
});

test('QUI A FINI : ON ÉCRIT LA NOTE, PAS LE MOT « TERMINÉ »', () => {
    // Rémy regarde ce mur pour décider s'il passe à la suite. « 9 / 10 »
    // décide ; « terminé » ne décide rien — il faut alors ouvrir la fiche.
    const { quoi, ou } = quoiEtOu({ etat: 'fini' },
        { pathName: 'Les fractions', etat: 'fini', justes: 9, questions: 10 }, depuis);
    assert.equal(quoi, 'Les fractions');
    assert.equal(ou, '9 / 10');
    assert.ok(!/termin/i.test(ou));
});

test('QUI EST BLOQUÉ : LE SILENCE PASSE DEVANT L’AVANCEMENT', () => {
    // Un élève bloqué sur un exercice est d'abord BLOQUÉ. « 3 / 8 » ne
    // demande rien ; « rien depuis 4 min » fait traverser la salle. L'état qui
    // appelle un geste passe donc devant, même quand les deux sont connus.
    const { quoi, ou } = quoiEtOu({ etat: 'bloque', silence: 240 }, enCours, depuis);
    assert.equal(quoi, 'Additions Mystères');
    assert.equal(ou, 'rien depuis 4 min');
    assert.ok(!/\d+ \/ \d+/.test(ou), 'l’avancement ne doit pas masquer le silence');
    // « Ralentit » dit la même chose en plus doux, et se lit pareil.
    assert.equal(quoiEtOu({ etat: 'ralenti', silence: 120 }, enCours, depuis).ou,
        'rien depuis 2 min');
});

test('QUI EST PARTI : on garde ce qu’il faisait, on dit qu’il n’est plus là', () => {
    const { quoi, ou } = quoiEtOu({ etat: 'parti' }, enCours, depuis);
    assert.equal(quoi, 'Additions Mystères');
    assert.equal(ou, 'hors ligne');
});

test('QUI N’A RIEN COMMENCÉ : AUCUN NOM D’EXERCICE SOUS SON NOM', () => {
    // « pas commencé » écrit sous le titre d'une séance se lit comme « il en
    // est au début de celle-ci », ce qui est faux : il ne l'a pas ouverte.
    assert.deepEqual(quoiEtOu({ etat: 'pas-commence' }, null, depuis),
        { quoi: '', ou: 'pas commencé' });
    // ET MÊME SI LE SERVEUR ENVOIE UN AVANCEMENT VIDE AVEC UN NOM : l'état
    // décide, pas la présence du champ.
    assert.equal(quoiEtOu({ etat: 'pas-commence' },
        { pathName: 'Les fractions' }, depuis).quoi, '');
});

test('SANS ÉTAPE EN COURS, ON DIT L’ÉTAPE — et jamais une de trop', () => {
    assert.equal(quoiEtOu({ etat: 'ok' },
        { pathName: 'P', fraction: 0.5, faites: 1, etapes: 4 }, depuis).ou,
    'étape 2 sur 4');
    // LA DERNIÈRE ÉTAPE NE DÉBORDE PAS : un parcours de quatre étapes toutes
    // faites dirait « étape 5 sur 4 », ce qui se lit comme un défaut.
    assert.equal(quoiEtOu({ etat: 'ok' },
        { pathName: 'P', fraction: 1, faites: 4, etapes: 4 }, depuis).ou,
    'étape 4 sur 4');
});

test('AUCUN FRAGMENT N’EST ASSEZ LONG POUR DÉFORMER UNE TUILE', () => {
    // La tuile coupe ce qui dépasse, et une tuile coupée au milieu d'un mot
    // ne se lit plus de loin. On garde donc une borne sur ce qu'on ÉCRIT,
    // mesurée sur la plus large des tuiles de la grille : 262 px, soit une
    // trentaine de caractères à la taille où le mur s'affiche.
    const cas = [
        [{ etat: 'ok' }, enCours],
        [{ etat: 'fini' }, { pathName: 'P', etat: 'fini', justes: 100, questions: 100 }],
        [{ etat: 'bloque', silence: 3600 }, enCours],
        [{ etat: 'parti' }, enCours],
        [{ etat: 'pas-commence' }, null]
    ];
    for (const [v, av] of cas) {
        const { ou } = quoiEtOu(v, av, depuis);
        assert.ok(ou.length <= 24, `« ${ou} » est trop long pour une tuile (${ou.length})`);
    }
});
