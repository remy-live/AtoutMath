// L'ÉCRAN DE L'ÉLÈVE N'APPARTIENT QU'À L'ÉLÈVE.
//
// Rémy : « je teste chez moi Safari pour l'élève et Chrome pour moi ; quand
// j'envoie un mot genre Coucou, il apparaît en popup sur mon espace aussi »,
// puis « d'ailleurs l'indice coup de pouce arrive sur mon écran ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// SON NAVIGATEUR EST LES DEUX À LA FOIS, ET C'EST NORMAL. Une machine qui a
// servi à essayer le côté élève garde son rattachement — c'est voulu, c'est ce
// qui permet à un élève de continuer quand le réseau tombe. Elle continue donc
// de recevoir la consigne, le verrou et les mots de la classe, pendant que son
// propriétaire est en mode professeur.
//
// ET CE N'EST PAS QU'UNE GÊNE. La fenêtre du mot ne se ferme que par « J'ai
// lu », et ce bouton pose l'accusé de lecture. Le professeur, en se
// débarrassant de sa propre fenêtre, cochait lui-même son mot comme lu : sa
// console lui disait alors qu'un élève l'avait lu, ce qui était faux — et
// c'est sur cette coche qu'il décide de redire ou non la consigne à voix haute.
//
// CE QUI SE VÉRIFIE ICI EST QU'IL N'Y A QU'UNE PORTE. L'écran faisait cinq
// affichages indépendants ; un sixième ajouté demain aurait réintroduit le
// défaut sans que rien ne le dise. La règle vit dans une seule fonction, et
// c'est elle qu'on éprouve.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import { appliquerEtat, ceQueVoitLEleve } from '../js/core/seanceDistante.js';

const ecran = fs.readFileSync(new URL('../js/ui/seanceDistanteUI.js', import.meta.url), 'utf8');

/** Une classe qui parle : une consigne, un verrou, un mot et un coup de pouce. */
function uneClasseQuiParle() {
    appliquerEtat({
        notice: 'Prenez le cahier rouge.',
        locked: true,
        blocked: true,
        messages: [
            { id: 'm1', body: 'Coucou', genre: 'mot', scope: 'class' },
            { id: 'i1', body: 'Regarde la retenue', genre: 'indice' }
        ]
    });
}

test('L\'ÉLÈVE VOIT TOUT CE QUE SA CLASSE LUI ENVOIE', () => {
    uneClasseQuiParle();
    const vu = ceQueVoitLEleve();
    assert.equal(vu.consigne, 'Prenez le cahier rouge.');
    assert.equal(vu.verrouille, true);
    assert.equal(vu.ecarte, true);
    assert.deepEqual(vu.mots.map(m => m.body), ['Coucou']);
    assert.deepEqual(vu.indices.map(m => m.body), ['Regarde la retenue']);
});

test('LE PROFESSEUR N\'EN VOIT RIEN — ni le mot, ni le coup de pouce', () => {
    // Les deux que Rémy a vus arriver sur son écran, et les trois autres qui
    // seraient arrivées avec : la consigne en bandeau, le verrou qui retire le
    // catalogue, et le voile « ton accès est en pause ».
    uneClasseQuiParle();
    const vu = ceQueVoitLEleve({ professeur: true });
    assert.deepEqual(vu, {
        consigne: '', verrouille: false, ecarte: false, mots: [], indices: []
    });
});

test('ON NE JETTE RIEN : repasser côté élève rend tout intact', () => {
    // Le professeur bascule pour montrer quelque chose à la classe. S'il
    // fallait attendre que le serveur reparle — jusqu'à cinq minutes — il
    // montrerait un écran vide.
    uneClasseQuiParle();
    ceQueVoitLEleve({ professeur: true });
    assert.equal(ceQueVoitLEleve().consigne, 'Prenez le cahier rouge.');
    assert.equal(ceQueVoitLEleve().mots.length, 1);
});

test('ET SURTOUT, RIEN N\'EST ACQUITTÉ AU PASSAGE', () => {
    // C'est le vrai dégât : un mot coché « lu » par le professeur lui-même
    // ment dans sa console, et c'est sur cette coche qu'il décide de redire ou
    // non sa consigne à voix haute.
    uneClasseQuiParle();
    ceQueVoitLEleve({ professeur: true });
    ceQueVoitLEleve({ professeur: true });
    assert.equal(ceQueVoitLEleve().mots.length, 1, 'le mot est encore à lire');
});

test('IL N\'Y A QU\'UNE PORTE, ET L\'ÉCRAN PASSE PAR ELLE', () => {
    // Le défaut venait de cinq affichages indépendants dont aucun ne se
    // demandait qui regardait. Si l'écran recommence à interroger l'état
    // directement, le sixième ajout ramènera le mot sur l'écran du professeur.
    assert.match(ecran, /ceQueVoitLEleve\(\{ professeur/,
        'l\'écran doit demander ce qu\'il montre, en disant qui regarde');
    for (const direct of ['consigneDuProf()', 'estVerrouille()', 'estEcarte()',
        'motsNonLus()', 'indicesNonLus()']) {
        assert.ok(!ecran.includes(direct),
            `l'écran ne doit plus appeler ${direct} par-dessus la règle`);
    }
});

test('LE CHANGEMENT DE RÔLE SE SAIT TOUT DE SUITE', () => {
    // Sans annonce, l'écran ne l'apprendrait qu'à la prochaine réponse du
    // serveur : le mot resterait affiché sur l'écran du professeur, et il ne
    // pourrait s'en débarrasser qu'en posant l'accusé de lecture qu'on vient
    // justement de lui épargner.
    const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    assert.match(app, /CustomEvent\('role_change'/, 'la bascule doit l\'annoncer');
    assert.match(ecran, /addEventListener\('role_change'/, 'et l\'écran l\'écouter');
});

test('un mot déjà ouvert se referme quand le professeur reprend la main', () => {
    // Le cas d'ordre : le mot est à l'écran, PUIS on bascule. Le laisser là
    // rendrait la bascule inutile — et la seule sortie de cette fenêtre est
    // « J'ai lu ».
    assert.match(ecran, /function montrerLesMots\(liste\)/,
        'la liste est donnée, elle n\'est plus lue au passage');
    // ON GARDE LE FERMOIR RENDU PAR `showModal`, et non un sélecteur de parent :
    // mesuré en deux navigateurs, le voile de `showModal` n'a AUCUNE classe,
    // seulement des styles en ligne. Un `.closest('.modal-overlay')` ne trouvait
    // rien et la fenêtre restait à l'écran du professeur.
    assert.match(ecran, /if \(!mot\) \{[\s\S]{0,120}motOuvert\.close\(\)/,
        'une liste vide doit refermer la fenêtre ouverte');
    assert.ok(!/closest\('\.modal-overlay'\)/.test(ecran),
        'le voile de showModal ne porte pas cette classe');
});
