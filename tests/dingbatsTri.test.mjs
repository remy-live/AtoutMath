// LE TRI DES DINGBATS — ce qui se vérifie sans navigateur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour les dingbats intègre-le dans la revue catalogue pour que je
// puisse faire le tri et te faire un rapport. »
//
// L'ÉCRAN NE S'ÉPROUVE PAS ICI, MAIS LE RAPPORT SI — et c'est lui qui compte :
// c'est le seul objet qui sort de l'écran et qui m'arrive. Un rapport qui perd
// une ligne, qui range par un rang devenu faux, ou qui ne dit pas combien
// restent à lire, fait prendre une décision sur un chiffre inexact.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { noter, filtrer, rapport, compte } from '../js/ui/dingbatsTri.js';
import { DINGBATS } from '../js/data/dingbats.js';

/** Trois énigmes de laboratoire, pour ne pas dépendre du contenu réel. */
const LOT = [
    { id: 'dg-a', reponse: 'racine carrée', theme: 'maths', niveau: 1, forme: 'dans', mots: ['RACINE'], cadre: 'carre' },
    { id: 'dg-b', reponse: 'demi-tour', theme: 'maths', niveau: 3, forme: 'demiTour', mots: ['TOUR'] },
    { id: 'dg-c', reponse: 'chef d\'orchestre', theme: 'general', niveau: 2, forme: 'sur', mots: ['CHEF', 'ORCHESTRE'] }
];

test('RECLIQUER LE MÊME VERDICT L\'EFFACE', () => {
    // C'EST LE GESTE QU'ON FAIT QUAND ON S'EST TROMPÉ. Sans lui, corriger une
    // ligne obligerait à tout remettre à zéro — et l'on ne corrigerait pas.
    let t = {};
    t = noter(t, 'dg-a', true);
    assert.equal(t['dg-a'], true);
    t = noter(t, 'dg-a', false);
    assert.equal(t['dg-a'], false, 'changer d\'avis doit écrire l\'autre verdict');
    t = noter(t, 'dg-a', false);
    assert.ok(!('dg-a' in t), 'recliquer le même verdict doit l\'effacer');

    // ET `noter` NE TOUCHE PAS LA TABLE QU'ON LUI DONNE : c'est ce qui permet de
    // l'éprouver, et ce qui empêche un redessin de travailler sur un état à
    // moitié modifié.
    const avant = { 'dg-b': true };
    const apres = noter(avant, 'dg-c', false);
    assert.deepEqual(avant, { 'dg-b': true });
    assert.deepEqual(apres, { 'dg-b': true, 'dg-c': false });
});

test('LE FILTRE REGARDE LE THÈME, LE NIVEAU ET CE QUI RESTE À LIRE', () => {
    const t = { 'dg-a': true, 'dg-b': false };
    const ids = (f) => filtrer(LOT, f, t).map(d => d.id);

    assert.deepEqual(ids({ theme: 'tous', niveau: 0, vu: 'tous' }), ['dg-a', 'dg-b', 'dg-c']);
    assert.deepEqual(ids({ theme: 'maths', niveau: 0, vu: 'tous' }), ['dg-a', 'dg-b']);
    assert.deepEqual(ids({ theme: 'tous', niveau: 3, vu: 'tous' }), ['dg-b']);
    // « PAS ENCORE LUS » EST LE FILTRE LE PLUS UTILE DE TOUS : on relit cent neuf
    // énigmes en plusieurs fois, et retrouver où l'on en était est tout le
    // problème.
    assert.deepEqual(ids({ theme: 'tous', niveau: 0, vu: 'nonlues' }), ['dg-c']);
    assert.deepEqual(ids({ theme: 'tous', niveau: 0, vu: 'garder' }), ['dg-a']);
    assert.deepEqual(ids({ theme: 'tous', niveau: 0, vu: 'jeter' }), ['dg-b']);
    // Les critères se cumulent : maths ET niveau 1.
    assert.deepEqual(ids({ theme: 'maths', niveau: 1, vu: 'tous' }), ['dg-a']);
});

test('LE RAPPORT PORTE L\'IDENTIFIANT *ET* LA RÉPONSE', () => {
    // L'IDENTIFIANT EST CE DONT J'AI BESOIN POUR AGIR — c'est lui que je cherche
    // dans `js/data/dingbats.js` — mais il est illisible pour un humain, et Rémy
    // doit pouvoir se relire avant de me l'envoyer. La réponse seule
    // m'obligerait à la rechercher. Les deux ensemble se retrouvent toujours.
    const texte = rapport({ 'dg-a': true, 'dg-b': false }, LOT);
    assert.match(texte, /dg-b — « demi-tour »/);
    assert.match(texte, /dg-a — « racine carrée »/);
    // LE THÈME ET LE NIVEAU VOYAGENT AVEC : « supprimer celui-là » ne se décide
    // pas sans savoir s'il vide un niveau du réglage.
    assert.match(texte, /maths, niveau 3/);
    // LES DEUX TAS SONT SÉPARÉS ET COMPTÉS.
    assert.match(texte, /À SUPPRIMER \(1\)/);
    assert.match(texte, /À GARDER \(1\)/);
    // ET L'ON DIT SUR COMBIEN : douze sur quinze et douze sur cent neuf
    // n'appellent pas la même décision.
    assert.match(texte, /2 relus sur 3/);

    // CE QUI N'A PAS ÉTÉ TRANCHÉ N'EST DANS AUCUN DES DEUX TAS. « Pas encore
    // lu » est une TROISIÈME valeur, et la confondre avec « à garder » ferait
    // valider en bloc ce que personne n'a regardé.
    assert.ok(!texte.includes('dg-c'), 'une énigme non relue ne doit pas figurer au rapport');

    // UN RAPPORT VIDE LE DIT, il ne rend pas deux listes muettes.
    const rien = rapport({}, LOT);
    assert.match(rien, /À SUPPRIMER \(0\)\n\(aucun\)/);
    assert.match(rien, /0 relus sur 3/);
});

test('LE COMPTE DIT CE QUI RESTE, PAS SEULEMENT CE QUI EST FAIT', () => {
    assert.match(compte({}, LOT), /Aucun relu sur 3/);
    const dit = compte({ 'dg-a': true, 'dg-b': false }, LOT);
    assert.match(dit, /2 relus sur 3/);
    assert.match(dit, /1 à supprimer/);
    // CE QUI RESTE EST LA SEULE CHOSE QUI DISE S'IL FAUT CONTINUER CE SOIR.
    assert.match(dit, /il en reste 1/);
});

test('LE TRI PORTE SUR LES VRAIS DINGBATS, ET CHACUN EST ATTEIGNABLE', () => {
    // UNE ÉNIGME QUI N'APPARAÎT SOUS AUCUN FILTRE SERAIT INVISIBLE AU TRI, donc
    // jamais relue — et personne ne s'en apercevrait, puisqu'il n'y a rien à
    // voir. On vérifie que les cent neuf sortent bien du filtre le plus large.
    assert.equal(filtrer(DINGBATS, { theme: 'tous', niveau: 0, vu: 'tous' }, {}).length,
        DINGBATS.length);
    // ET QUE CHAQUE COMBINAISON THÈME × NIVEAU EN MONTRE AU MOINS UN : un filtre
    // qui rendrait toujours une page vide serait un filtre qu'on croit cassé.
    for (const theme of ['maths', 'general']) {
        for (const niveau of [1, 2, 3, 4]) {
            const n = filtrer(DINGBATS, { theme, niveau, vu: 'tous' }, {}).length;
            assert.ok(n > 0, `aucun dingbat en « ${theme} » niveau ${niveau}`);
        }
    }
    // LES IDENTIFIANTS SONT UNIQUES — c'est ce qui permet de ranger les verdicts
    // par identifiant plutôt que par rang, et donc de survivre à l'insertion
    // d'une énigme au milieu de la liste.
    assert.equal(new Set(DINGBATS.map(d => d.id)).size, DINGBATS.length);
});
