// LA RÉPARTITION DE L'AIDE — combien de questions à deux propositions, combien
// à quatre, et à partir de quand on tape la réponse.
//
// Rémy a buté quatre fois sur ce réglage : « on comprend rien pour le slide »,
// « il faut le vrai aperçu », « en dessous ya plein de propositions », enfin
// « comment on sait le nombre de questions avec un qcm de 2, un qcm de 4 ? ».
// La dernière phrase disait le vrai défaut : un préréglage porte un NOM, et un
// nom ne dit pas combien de questions il couvre.
//
// Ces tests gardent la règle qui a remplacé le nom : deux nombres écrits par le
// professeur, le troisième déduit — donc une somme qui ne peut pas être fausse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    aideAuRang, repartitionDe, repartitionDuMode, ecrireRepartition,
    aideSelonEtat, etatDepart, apresReponse, affine,
    lireZones, ecrireZones, normaliserZones, zonesDuMode, zoneDuRang,
    modeVoisin, MODES_ZONE, modeZone, plafonnerClavier,
    MODELES_FRISE, zonesDuModele
} from '../js/core/aide.js';

test('la répartition s\'écrit et se relit sans se déformer', () => {
    assert.equal(ecrireRepartition(3, 5), '3-5');
    assert.equal(ecrireRepartition(0, 0), '0-0');
    // Un nombre négatif n'a pas de sens : on le ramène à zéro plutôt que de
    // fabriquer une chaîne que la relecture ne comprendrait pas.
    assert.equal(ecrireRepartition(-2, 4), '0-4');
});

// --- La répartition écrite à la main -----------------------------------------

test('ON DÉFINIT VRAIMENT : deux nombres, et le troisième se déduit', () => {
    // Rémy, après trois essais sur ce panneau : « soit il faut expliquer au
    // prof que l'exercice s'adapte, soit on définit vraiment — par exemple sur
    // 10 questions on fait 2 questions de qcm de 2 puis 3 de qcm de 4 ».
    //
    // C'est sa phrase, mot pour mot, qu'on éprouve ici. « Progressif » est un
    // NOM : il ne dit ni combien de questions sont faciles, ni quand le clavier
    // arrive — et ce sont les deux nombres dont un professeur a besoin pour
    // préparer sa séance.
    const dire = (params, n) => {
        const out = [];
        for (let r = 1; r <= n; r++) {
            const a = aideAuRang(params, r, n);
            out.push(a.clavier ? 'C' : String(a.propositions));
        }
        return out.join(' ');
    };
    assert.equal(dire({ repartition: '2-3' }, 10), '2 2 4 4 4 C C C C C');
    // Les quatre préréglages s'écrivent tous comme des répartitions : c'est ce
    // qui permet de les remplacer par une seule commande.
    assert.equal(dire({ repartition: '10-0' }, 10), '2 2 2 2 2 2 2 2 2 2');
    assert.equal(dire({ repartition: '0-10' }, 10), '4 4 4 4 4 4 4 4 4 4');
    assert.equal(dire({ repartition: '0-0' }, 10), 'C C C C C C C C C C');
});

test('la répartition se borne au nombre de questions, quoi qu\'on ait écrit', () => {
    // Le nombre de questions se règle AILLEURS et peut descendre après coup :
    // sans borne, « 3 et 5 » sur un exercice ramené à quatre questions
    // promettrait huit questions qui n'existent pas.
    assert.deepEqual(repartitionDe({ repartition: '3-5' }, 4), { deux: 3, quatre: 1, clavier: 0 });
    assert.deepEqual(repartitionDe({ repartition: '9-9' }, 5), { deux: 5, quatre: 0, clavier: 0 });
    // Et la somme des trois fait TOUJOURS le total : c'est ce qui rend
    // l'interface infaillible — on ne saisit pas le troisième nombre.
    for (const brut of ['0-0', '2-3', '7-2', '50-50', '1-0']) {
        for (const n of [1, 4, 10, 25]) {
            const r = repartitionDe({ repartition: brut }, n);
            assert.equal(r.deux + r.quatre + r.clavier, n, `${brut} sur ${n} questions`);
            assert.ok(r.deux >= 0 && r.quatre >= 0 && r.clavier >= 0);
        }
    }
});

test('« auto » laisse le préréglage décider, et reste le défaut', () => {
    // Un professeur qui ne veut rien régler ne doit rien avoir à régler.
    assert.equal(repartitionDe({}, 10), null);
    assert.equal(repartitionDe({ repartition: 'auto' }, 10), null);
    assert.equal(repartitionDe({ repartition: '' }, 10), null);
    // Et la répartition qu'on PROPOSE au professeur est celle que le
    // préréglage produit : il ouvre le panneau, voit ce que l'exercice fait
    // déjà, et le corrige. Partir de zéro l'obligerait à reconstruire une
    // progression que le logiciel connaît.
    assert.deepEqual(repartitionDuMode({ aide: 'progressive' }, 10),
        { deux: 3, quatre: 5, clavier: 2 });
    assert.deepEqual(repartitionDuMode({ aide: 'deux' }, 6),
        { deux: 6, quatre: 0, clavier: 0 });
    assert.deepEqual(repartitionDuMode({ aide: 'clavier' }, 6),
        { deux: 0, quatre: 0, clavier: 6 });
});

test('la répartition écrite passe AVANT le préréglage et ses vis', () => {
    // C'est le professeur qui a décidé : aucun préréglage n'a d'avis à donner
    // par-dessus, et les deux vis d'« Affiner… » non plus.
    const p = { repartition: '1-1', aide: 'clavier', propositions: 6, saisie: 'toujours' };
    assert.deepEqual(aideAuRang(p, 1, 4), { propositions: 2, clavier: false });
    assert.deepEqual(aideAuRang(p, 2, 4), { propositions: 4, clavier: false });
    assert.deepEqual(aideAuRang(p, 3, 4), { propositions: 4, clavier: true });
});

test('la répartition écrite passe AVANT l\'échelle adaptative', () => {
    // LE BUG QUE CE TEST FERME. L'échelle adaptative ne s'efface que devant un
    // réglage « affiné » ; la répartition écrite n'en faisait pas partie. Un
    // professeur écrivait « les deux premières questions à deux propositions »,
    // et l'élève dont l'échelle était déjà montée recevait le clavier dès la
    // première question. La consigne du professeur passait après l'humeur du
    // moteur — l'inverse exact de ce qu'on veut.
    assert.equal(affine({ repartition: '2-3' }), true);
    assert.equal(affine({ repartition: 'auto' }), false);
    assert.equal(affine({ repartition: '' }), false);
    assert.equal(affine({}), false);

    // Un élève au sommet de l'échelle : trois réussites du premier coup, puis
    // deux — il est au clavier.
    let etat = etatDepart();
    for (let k = 0; k < 5; k++) etat = apresReponse(etat, { reussi: true });
    assert.deepEqual(aideSelonEtat({ aide: 'progressive' }, etat, 1, 10),
        { propositions: null, clavier: true });

    // Le MÊME élève, sur un exercice dont le professeur a écrit la
    // répartition : il fait ce que le professeur a écrit.
    const ecrit = { aide: 'progressive', repartition: '2-3' };
    assert.deepEqual(aideSelonEtat(ecrit, etat, 1, 10), { propositions: 2, clavier: false });
    assert.deepEqual(aideSelonEtat(ecrit, etat, 3, 10), { propositions: 4, clavier: false });
    // La phase « au clavier » d'une répartition écrite garde ses quatre
    // propositions sous le pavé — voir `aideAuRang` : l'élève tape, mais un
    // exercice qui ne sait pas se répondre au clavier a de quoi retomber.
    assert.deepEqual(aideSelonEtat(ecrit, etat, 6, 10), { propositions: 4, clavier: true });

    // Et sans répartition écrite, l'échelle garde la main : c'est le mode
    // adaptatif, celui que Rémy voulait qu'on propose quand même. Un débutant
    // ouvre à deux propositions quel que soit le rang de la question.
    const neuf = etatDepart();
    assert.deepEqual(aideSelonEtat({ aide: 'progressive' }, neuf, 9, 10),
        { propositions: 2, clavier: false });
});

// --- LES ZONES : LA RÉPARTITION, GÉNÉRALISÉE ---------------------------------
//
// Rémy, sixième passage : « quand on clique sur une zone, on a au-dessus
// l'aperçu, et un bouton pour ajouter ou enlever le nombre de propositions. On
// peut aussi enlever la zone, et on a un bouton pour en rajouter. »
//
// C'était une demande de FOND, pas d'interface : le modèle à deux nombres
// supposait trois phases fixes — deux propositions, quatre, puis le clavier —
// et cette hypothèse commode interdisait de commencer à trois, de faire deux
// paliers séparés, ou de n'en proposer que six.

test('ON RELIT L\'ANCIENNE ÉCRITURE SANS PERDRE LE RÉGLAGE', () => {
    // Les parcours déjà enregistrés portent « 3-5 ». Les relire faux effacerait
    // sans prévenir un réglage que le professeur a posé — ce serait la pire
    // façon de changer un modèle de données.
    const z = lireZones({ repartition: '3-5' }, 12);
    assert.deepEqual(z, [{ n: 3, mode: '2' }, { n: 5, mode: '4' }, { n: 4, mode: 'k' }]);
    // Et la nouvelle écriture dit la même chose, en plus explicite.
    assert.deepEqual(lireZones({ repartition: '3:2,5:4,4:k' }, 12), z);
    assert.equal(ecrireZones(z), '3:2,5:4,4:k');
    // « auto » et le vide ne sont pas des zones : c'est l'absence de réglage.
    for (const rien of ['auto', '', null, undefined]) {
        assert.equal(lireZones({ repartition: rien }, 10), null);
    }
});

test('LA DERNIÈRE ZONE ABSORBE LE RESTE — la somme est infaillible', () => {
    // C'est la règle qui remplace « la troisième phase est ce qui reste » : on
    // ne saisit jamais le total, donc on ne peut pas se tromper dessus.
    for (const total of [1, 4, 7, 15, 20, 50]) {
        for (const brut of ['3:2,5:4,2:k', '1:2', '9:2,9:4,9:6,9:k', '2:3,2:6']) {
            const z = lireZones({ repartition: brut }, total);
            assert.equal(z.reduce((s, x) => s + x.n, 0), total,
                `« ${brut} » sur ${total} questions`);
            assert.ok(z.every(x => x.n > 0), 'aucune zone vide ne survit');
            assert.ok(z.length >= 1, 'il reste toujours une façon de répondre');
        }
    }
    // Une répartition trop longue se coupe DANS L'ORDRE, et c'est le bon
    // choix : le nombre de questions se règle ailleurs et peut baisser APRÈS
    // qu'on a écrit les zones. Tronquer par la fin garde le DÉBUT de la
    // progression — c'est-à-dire l'aide, qui est ce à quoi le professeur
    // tenait ; tout ramener à la première zone lui ferait perdre son escalier.
    assert.deepEqual(lireZones({ repartition: '3:2,5:4,4:k' }, 4),
        [{ n: 3, mode: '2' }, { n: 1, mode: '4' }]);
    // Et à une seule question, il ne reste que la première façon de répondre.
    assert.deepEqual(lireZones({ repartition: '3:2,5:4,4:k' }, 1), [{ n: 1, mode: '2' }]);
});

test('LE RANG SAIT DANS QUELLE ZONE IL TOMBE', () => {
    const z = lireZones({ repartition: '3:2,5:4,2:k' }, 10);
    assert.deepEqual(zoneDuRang(z, 1), { i: 0, de: 1, a: 3, zone: z[0] });
    assert.deepEqual(zoneDuRang(z, 3), { i: 0, de: 1, a: 3, zone: z[0] });
    assert.deepEqual(zoneDuRang(z, 4), { i: 1, de: 4, a: 8, zone: z[1] });
    assert.deepEqual(zoneDuRang(z, 10), { i: 2, de: 9, a: 10, zone: z[2] });
    // Hors bornes, on ne sort pas de l'exercice : c'est la dernière zone.
    assert.equal(zoneDuRang(z, 99).i, 2);
});

test('L\'ÉCHELLE D\'AIDE SE PARCOURT DANS UN SEUL SENS, et elle a deux bouts', () => {
    // Un seul bouton par sens, parce qu'il n'y a qu'une échelle — et non un
    // menu de six entrées qu'il faudrait lire pour comprendre qu'elles sont
    // ordonnées, du plus aidé au plus autonome.
    assert.equal(modeVoisin('2', 1), '3');
    assert.equal(modeVoisin('4', 1), '6');
    assert.equal(modeVoisin('4', -1), '3');
    // Aux extrémités, on ne déborde pas : les boutons s'y désactivent.
    assert.equal(modeVoisin('2', -1), '2');
    assert.equal(modeVoisin('k', 1), 'k');
    assert.equal(MODES_ZONE[0].cle, '2');
    assert.equal(MODES_ZONE[MODES_ZONE.length - 1].cle, 'k');
});

test('CHAQUE ZONE COMMANDE VRAIMENT CE QUE L\'ÉLÈVE VOIT', () => {
    // Le point qui compte : la frise n'est pas un dessin, c'est le réglage.
    const p = { repartition: '2:2,3:6,2:t,3:k', aide: 'clavier', propositions: 9 };
    assert.deepEqual(aideAuRang(p, 1, 10), { propositions: 2, clavier: false });
    assert.deepEqual(aideAuRang(p, 3, 10), { propositions: 6, clavier: false });
    assert.deepEqual(aideAuRang(p, 6, 10), { propositions: null, clavier: false });
    // « Toutes » veut dire « autant que le générateur en fabrique ».
    assert.deepEqual(aideAuRang(p, 8, 10), { propositions: 4, clavier: true });
    // Et cela passe AVANT le préréglage et ses vis, comme avant.
    assert.equal(aideAuRang(p, 1, 10).clavier, false);
});

test('LES ZONES DU PRÉRÉGLAGE regroupent les rangs voisins qui se ressemblent', () => {
    // C'est ce qui AMORCE la saisie quand on passe à « Je définis » : le
    // professeur part de ce que l'exercice fait déjà, pas d'une grille vide.
    const z = normaliserZones(zonesDuMode({ aide: 'progressive' }, 10), 10);
    assert.equal(z.reduce((s, x) => s + x.n, 0), 10);
    // Des zones VOISINES ne portent jamais le même mode : ce serait deux
    // rectangles collés qu'on ne pourrait pas distinguer sur la frise.
    for (let i = 1; i < z.length; i++) {
        assert.notEqual(z[i].mode, z[i - 1].mode, `zones ${i - 1} et ${i} identiques`);
    }
    // Un préréglage qui ne change jamais donne UNE seule zone.
    assert.equal(normaliserZones(zonesDuMode({ aide: 'clavier' }, 8), 8).length, 1);
});

test('ON NE FOND JAMAIS DEUX ZONES, MÊME IDENTIQUES', () => {
    // Rémy : « ne fusionne pas les zones de la frise. Exemple : j'ai une zone à
    // deux, je rajoute une zone, je clique sur 2 — elle fusionne avec la
    // précédente, du coup je dois en recréer une pour faire un autre réglage. »
    //
    // LA FUSION DÉTRUISAIT UN GESTE QU'ON VENAIT DE FAIRE. Elle se défendait
    // sur une frise SANS POIGNÉES — deux rectangles collés de la même couleur
    // ne se distinguaient pas. Depuis qu'une borne blanche se tient entre
    // chaque paire, la limite se voit, et deux zones de même mode sont un état
    // de travail légitime : on ajoute, puis on règle, dans cet ordre.
    const z = normaliserZones([{ n: 3, mode: '2' }, { n: 4, mode: 'k' }, { n: 5, mode: 'k' }], 12);
    assert.equal(z.length, 3, 'les trois zones survivent');
    assert.deepEqual(z, [{ n: 3, mode: '2' }, { n: 4, mode: 'k' }, { n: 5, mode: 'k' }]);
    // Et le total reste juste, ce qui était la vraie raison d'être de cette
    // fonction.
    assert.equal(z.reduce((s2, x) => s2 + x.n, 0), 12);

    // Trois zones identiques restent trois zones.
    assert.equal(
        normaliserZones([{ n: 2, mode: '4' }, { n: 2, mode: '4' }, { n: 2, mode: '4' }], 6).length, 3);

    // LE SCÉNARIO DE RÉMY, DE BOUT EN BOUT. Une zone à deux propositions ; on
    // la coupe en deux (c'est ce que fait « ajouter une zone ») ; on met la
    // seconde à deux aussi. Il doit rester DEUX zones — sinon le clic suivant
    // ne trouve plus la zone qu'on venait de créer.
    let zones = normaliserZones([{ n: 10, mode: '2' }], 10);
    assert.equal(zones.length, 1);
    zones = normaliserZones([{ n: 5, mode: '2' }, { n: 5, mode: '4' }], 10);
    assert.equal(zones.length, 2);
    zones = normaliserZones([{ n: 5, mode: '2' }, { n: 5, mode: '2' }], 10);
    assert.equal(zones.length, 2, 'la zone créée ne disparaît pas quand on lui donne le mode voisin');

    // Une zone vidée, en revanche, n'existe pas : c'est autre chose que fondre
    // deux zones pleines, et cette règle-là reste.
    assert.deepEqual(normaliserZones([{ n: 0, mode: '2' }, { n: 6, mode: '4' }], 6),
        [{ n: 6, mode: '4' }]);
});

test('LE CLAVIER REFUSE PLAFONNE L\'ADAPTATIF, ET IL NE MANQUE AUCUNE PORTE', () => {
    // Rémy : « l'exercice s'adapte (par défaut), mais là c'est un peu
    // configurable en autorisant ou non le clavier ». Une classe qui découvre
    // une notion doit pouvoir rester en propositions du début à la fin, sans
    // pour autant renoncer à l'adaptation.
    //
    // L'ADAPTATIF A DEUX PORTES, ET IL FAUT LES DEUX. `aideAuRangAuto` sert
    // l'aperçu et les exercices sans mémoire ; `aideSelonEtat` sert l'élève
    // qui monte et descend l'échelle en jouant. N'en plafonner qu'une, c'est
    // décocher le réglage et voir le pavé apparaître quand même — au troisième
    // succès, quand l'échelle est montée.
    for (let r = 1; r <= 20; r++) {
        assert.equal(aideAuRang({ aide: 'progressive', clavier: false }, r, 20).clavier, false,
            `rang ${r} : le pavé ne doit jamais s'ouvrir`);
    }
    // Et le clavier reste la valeur ordinaire : le réglage ne se déclenche que
    // s'il est explicitement refusé, jamais parce qu'il est absent.
    assert.equal(aideAuRang({ aide: 'progressive' }, 20, 20).clavier, true);
    assert.equal(aideAuRang({ aide: 'progressive', clavier: true }, 20, 20).clavier, true);

    // L'élève qui a tout réussi : son échelle est au sommet, et le sommet
    // devient le dernier échelon SANS pavé — pas le rang du dessous, qui
    // n'aurait aucune raison d'être celui-là.
    let etat = etatDepart();
    for (let i = 0; i < 30; i++) etat = apresReponse(etat, true);
    const haut = aideSelonEtat({ aide: 'progressive', clavier: false }, etat, 10, 10);
    assert.equal(haut.clavier, false);
    assert.ok(haut.propositions > 0, 'sans pavé, il reste forcément des propositions');
    assert.equal(aideSelonEtat({ aide: 'progressive' }, etat, 10, 10).clavier, true);

    // LA FRISE DIT LA MÊME CHOSE QUE L'EXERCICE. Elle se construit sur
    // `aideAuRang` : si le plafond ne s'y appliquait pas, le professeur
    // décocherait le réglage en voyant la zone violette rester en place.
    const zones = normaliserZones(zonesDuMode({ aide: 'progressive', clavier: false }, 20), 20);
    assert.equal(zones.some(z => modeZone(z.mode).clavier), false,
        'aucune zone « au clavier » quand le clavier est refusé');
    assert.equal(zones.reduce((s2, z) => s2 + z.n, 0), 20);

    // Et `plafonnerClavier` ne touche à rien quand il n'y a rien à plafonner.
    const tel = { propositions: 4, clavier: false };
    assert.deepEqual(plafonnerClavier(tel, { clavier: false }), tel);
    assert.deepEqual(plafonnerClavier(tel, {}), tel);
});

test('UN MODÈLE DE FRISE NE PERD NI N\'INVENTE JAMAIS DE QUESTION', () => {
    // Rémy : « un petit bouton réglage au-dessus de la frise pour avoir des
    // templates pour l'ensemble de la frise, genre QCM 2 ou QCM 4, QCM 2-4,
    // QCM 2-4-Clavier, qui donne alors des proportions à la frise. »
    //
    // LA SOMME EST LA SEULE CHOSE QUI NE SE DISCUTE PAS. Un modèle change la
    // forme de l'exercice, jamais sa longueur : le nombre de questions se règle
    // ailleurs, et lui seul. Un arrondi qui mange une question rendrait le
    // bouton dangereux — on ne s'en apercevrait qu'en classe.
    for (const m of MODELES_FRISE) {
        for (let n = 1; n <= 50; n++) {
            const z = zonesDuModele(m.cle, n);
            assert.ok(z && z.length, `${m.cle} sur ${n} questions : aucune zone`);
            assert.equal(z.reduce((s2, x) => s2 + x.n, 0), n,
                `${m.cle} sur ${n} questions : la somme ne fait pas le total`);
            // Pas de zone vide, et jamais plus de zones que le modèle n'en décrit.
            assert.ok(z.every(x => x.n >= 1), `${m.cle} sur ${n} : une zone vide`);
            assert.ok(z.length <= m.parts.length, `${m.cle} sur ${n} : trop de zones`);
            // Deux voisines ne portent jamais le même mode — sinon la frise
            // montrerait deux rectangles collés qu'on ne peut pas distinguer.
            for (let i = 1; i < z.length; i++) assert.notEqual(z[i].mode, z[i - 1].mode);
        }
    }
});

test('LES PROPORTIONS DU MODÈLE SONT DES PARTS, PAS DES NOMBRES ÉCRITS', () => {
    // Un modèle doit valoir pour huit questions comme pour cinquante : c'est
    // ce qui le distingue d'un préréglage figé. « QCM 2, 4, puis clavier » est
    // écrit « 1, 2, 1 » — un quart, la moitié, un quart.
    assert.deepEqual(zonesDuModele('q24k', 16),
        [{ n: 4, mode: '2' }, { n: 8, mode: '4' }, { n: 4, mode: 'k' }]);
    assert.deepEqual(zonesDuModele('q24k', 40),
        [{ n: 10, mode: '2' }, { n: 20, mode: '4' }, { n: 10, mode: 'k' }]);
    // Un modèle à une seule phase couvre tout, quel que soit le total.
    assert.deepEqual(zonesDuModele('q2', 15), [{ n: 15, mode: '2' }]);
    assert.deepEqual(zonesDuModele('q4', 3), [{ n: 3, mode: '4' }]);
    // TROP DE PHASES POUR TROP PEU DE QUESTIONS : on en garde ce qui tient, et
    // la somme reste juste. Trois zones sur deux questions n'existent pas.
    const petit = zonesDuModele('q24k', 2);
    assert.equal(petit.reduce((s2, x) => s2 + x.n, 0), 2);
    assert.ok(petit.length <= 2);
    // Une clé inconnue ne fabrique rien : le bouton n'a alors aucun effet,
    // plutôt qu'un effet inventé.
    assert.equal(zonesDuModele('inexistant', 10), null);
});
