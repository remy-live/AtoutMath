// LA VIGILANCE — qui a besoin qu'on vienne.
//
// Rémy : « un système "d'alarme si un élève est inactif" ».
//
// CE QUI SE VÉRIFIE ICI, CE SONT LES REFUS.
//
// Une alarme qui sonne au mauvais moment se fait couper, et plus rien ne sonne
// ensuite. Chaque test ci-dessous décrit un moment où l'élève ne répond plus ET
// où il ne faut surtout rien signaler ; si un seul de ces refus saute, le
// tableau de bord se remplit d'alarmes fausses, Rémy l'éteint la première
// semaine, et le jour où il aurait eu raison il sera déjà éteint.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    vigilanceDe, lesAlarmes, trierPourLeMur, silenceDe, direLesAlarmes, SEUILS,
    trierParNom, ORDRES_DU_DIRECT, trieurDuDirect
} from '../js/core/vigilance.js';

const MAINTENANT = 1_700_000_000;          // secondes, heure du serveur
const ilYA = (secondes) => (MAINTENANT - secondes) * 1000;   // en ms, comme le journal

const unEleve = (o = {}) => ({
    id: o.id || 'e1',
    prenom: o.prenom || 'Léo',
    vu: o.vu === undefined ? MAINTENANT - 5 : o.vu,
    quand: o.quand === undefined ? ilYA(30) : o.quand,
    ecarte: !!o.ecarte,
    avancement: o.avancement === undefined
        ? { etat: 'en-cours', faites: 1, etapes: 3, fraction: 0.3 }
        : o.avancement
});

// ───────────────────────────────────────────────── LES REFUS ────────────────

test('ON NE SIGNALE RIEN PENDANT UNE PAUSE', () => {
    // LE REFUS QUI SAUVE LA FONCTION. Quand le professeur met la classe en
    // pause pour expliquer au tableau, personne ne répond — c'est le but.
    // Sans ce refus, la pause allume trente alarmes d'un coup, exactement
    // pendant qu'il parle et ne peut pas les lire.
    const mort = unEleve({ quand: ilYA(20 * 60) });
    assert.equal(vigilanceDe(mort, MAINTENANT).etat, 'bloque');
    assert.equal(vigilanceDe(mort, MAINTENANT, { enPause: true }).etat, 'ok');

    const classe = Array.from({ length: 30 }, (_, i) =>
        unEleve({ id: 'e' + i, quand: ilYA(20 * 60) }));
    assert.equal(lesAlarmes(classe, MAINTENANT).length, 30);
    assert.equal(lesAlarmes(classe, MAINTENANT, { enPause: true }).length, 0);
});

test('ON NE SIGNALE PAS CELUI QUI N\'A RIEN OUVERT', () => {
    // Il n'est pas bloqué : il n'a pas commencé. C'est un autre problème, et il
    // se voit déjà en rouge en haut du direct. Les mêler noierait les vrais.
    const v = vigilanceDe(unEleve({ avancement: null, quand: ilYA(30 * 60) }), MAINTENANT);
    assert.equal(v.etat, 'pas-commence');
    assert.equal(lesAlarmes([unEleve({ avancement: null, quand: ilYA(30 * 60) })], MAINTENANT).length, 0);
});

test('ON NE SIGNALE PAS CELUI QUI A FINI', () => {
    // Son silence est la conclusion normale de son travail. C'est même la
    // question inverse : il lui faut quelque chose à faire.
    const fini = unEleve({ quand: ilYA(15 * 60), avancement: { etat: 'fini', fraction: 1 } });
    assert.equal(vigilanceDe(fini, MAINTENANT).etat, 'fini');
    assert.equal(lesAlarmes([fini], MAINTENANT).length, 0);
});

test('ON NE SIGNALE PAS COMME BLOQUÉ CELUI QUI EST PARTI', () => {
    // Une tablette en veille, un élève aux toilettes. Le dire « bloqué »
    // enverrait le professeur vers une chaise vide.
    const parti = unEleve({ vu: MAINTENANT - 600, quand: ilYA(12 * 60) });
    assert.equal(vigilanceDe(parti, MAINTENANT).etat, 'parti');
    assert.equal(lesAlarmes([parti], MAINTENANT).length, 0);
});

test('ON NE SIGNALE PAS TROP TÔT — trois minutes de silence sont du travail', () => {
    // Une division posée, une construction, un problème à relire : c'est du
    // travail, pas un blocage.
    assert.equal(vigilanceDe(unEleve({ quand: ilYA(3 * 60) }), MAINTENANT).etat, 'ok');
    assert.equal(vigilanceDe(unEleve({ quand: ilYA(6 * 60) }), MAINTENANT).etat, 'ralenti');
    assert.equal(vigilanceDe(unEleve({ quand: ilYA(12 * 60) }), MAINTENANT).etat, 'bloque');
});

test('un élève mis de côté n\'est pas une alarme', () => {
    const v = vigilanceDe(unEleve({ ecarte: true, quand: ilYA(30 * 60) }), MAINTENANT);
    assert.equal(v.etat, 'ecarte');
});

// ──────────────────────────────────────── CE QU'ON SIGNALE, ET DANS QUEL ORDRE

test('LE PLUS URGENT EN PREMIER, ET LE PLUS SILENCIEUX PARMI LES ÉGAUX', () => {
    // Entre deux élèves bloqués, celui qui l'est depuis douze minutes passe
    // avant celui qui l'est depuis dix : c'est l'ordre dans lequel on va les
    // voir, pas un classement.
    const a = lesAlarmes([
        unEleve({ id: 'a', prenom: 'Amel', quand: ilYA(6 * 60) }),
        unEleve({ id: 'b', prenom: 'Bilal', quand: ilYA(10 * 60) }),
        unEleve({ id: 'c', prenom: 'Chloé', quand: ilYA(18 * 60) })
    ], MAINTENANT);
    assert.deepEqual(a.map(x => x.eleve.prenom), ['Chloé', 'Bilal', 'Amel']);
    assert.deepEqual(a.map(x => x.etat), ['bloque', 'bloque', 'ralenti']);
});

test('une classe qui travaille ne produit aucune alarme', () => {
    // Le cas le plus fréquent de tous, et celui qui décide qu'on garde la
    // fonction : la plupart du temps, l'écran doit être silencieux.
    const classe = Array.from({ length: 30 }, (_, i) =>
        unEleve({ id: 'e' + i, quand: ilYA(10 + i) }));
    assert.equal(lesAlarmes(classe, MAINTENANT).length, 0);
    assert.equal(direLesAlarmes([]), '');
});

test('ELLE NE MÉLANGE PAS « ARRÊTÉ » ET « RALENTIT »', () => {
    // Ce sont deux gestes différents : on se lève pour l'un, on garde un œil
    // sur l'autre. Une phrase qui dit « certains n'ont plus rien fait » ne dit
    // pas au professeur pour qui se lever.
    const a = lesAlarmes([
        unEleve({ id: 'a', prenom: 'Maryam', quand: ilYA(13 * 60) }),
        unEleve({ id: 'b', prenom: 'Noé', quand: ilYA(6 * 60) })
    ], MAINTENANT);
    const phrase = direLesAlarmes(a);
    assert.match(phrase, /Maryam n'a plus rien fait depuis 13 min\./);
    assert.match(phrase, /Noé ralentit\./);
    assert.ok(!/certains/.test(phrase), phrase);
});

test('les accords suivent le nombre d\'élèves', () => {
    const un = lesAlarmes([unEleve({ prenom: 'Léo', quand: ilYA(12 * 60) })], MAINTENANT);
    assert.match(direLesAlarmes(un), /Léo n'a plus rien fait/);
    const deux = lesAlarmes([
        unEleve({ id: 'a', prenom: 'Léo', quand: ilYA(12 * 60) }),
        unEleve({ id: 'b', prenom: 'Amel', quand: ilYA(11 * 60) })
    ], MAINTENANT);
    assert.match(direLesAlarmes(deux), /Léo et Amel n'ont plus rien fait/);
});

test('LA PHRASE NOMME LES ÉLÈVES', () => {
    // « 3 élèves sont arrêtés » oblige à chercher lesquels dans trente lignes,
    // et pendant qu'on cherche on ne va voir personne.
    const a = lesAlarmes([
        unEleve({ id: 'a', prenom: 'Amel', quand: ilYA(12 * 60) }),
        unEleve({ id: 'b', prenom: 'Bilal', quand: ilYA(11 * 60) })
    ], MAINTENANT);
    const phrase = direLesAlarmes(a);
    assert.match(phrase, /Amel/);
    assert.match(phrase, /Bilal/);
    assert.match(phrase, /12 min/);
});

test('au-delà de quatre noms, on dit le reste en nombre', () => {
    const six = Array.from({ length: 6 }, (_, i) =>
        unEleve({ id: 'e' + i, prenom: 'Élève' + i, quand: ilYA(12 * 60) }));
    assert.match(direLesAlarmes(lesAlarmes(six, MAINTENANT)), /et 2 autres/);
});

// ────────────────────────────────────────────────────── LE SILENCE ──────────

test('le silence se mesure en secondes, depuis un instant en millisecondes', () => {
    // Le journal horodate en millisecondes, le serveur répond en secondes.
    // Mélanger les deux donnait un silence de cinquante-quatre ans.
    assert.equal(silenceDe({ quand: ilYA(300) }, MAINTENANT), 300);
    assert.equal(silenceDe({ quand: null }, MAINTENANT), 0);
    assert.equal(silenceDe(null, MAINTENANT), 0);
});

test('les seuils sont ceux d\'une heure de cours, pas d\'un tableau de bord', () => {
    assert.equal(SEUILS.ralenti, 300);
    assert.equal(SEUILS.bloque, 600);
});

test('on peut desserrer les seuils sans toucher au reste', () => {
    const e = unEleve({ quand: ilYA(7 * 60) });
    assert.equal(vigilanceDe(e, MAINTENANT).etat, 'ralenti');
    assert.equal(vigilanceDe(e, MAINTENANT, { seuils: { ralenti: 15 * 60 } }).etat, 'ok');
});

// ────────────────────────────────────────────────────────── LE MUR ──────────

test('LE MUR MONTRE TOUT LE MONDE, MAIS LES ENNUIS D\'ABORD', () => {
    // Contrairement aux alarmes, le mur ne filtre pas : c'est la classe
    // entière. Mais l'ordre n'est pas alphabétique — on ne cherche pas un nom
    // sur un mur, on cherche ce qui ne va pas.
    const mur = trierPourLeMur([
        unEleve({ id: 'a', prenom: 'Amel' }),
        unEleve({ id: 'b', prenom: 'Bilal', quand: ilYA(15 * 60) }),
        unEleve({ id: 'c', prenom: 'Chloé', avancement: { etat: 'fini', fraction: 1 } }),
        unEleve({ id: 'd', prenom: 'Diane', quand: ilYA(7 * 60) })
    ], MAINTENANT);
    assert.equal(mur.length, 4, 'personne n\'est retiré du mur');
    assert.deepEqual(mur.map(x => x.eleve.prenom), ['Bilal', 'Diane', 'Amel', 'Chloé']);
});

test('à état égal et silence égal, le mur range par prénom', () => {
    // Sans ce dernier critère, les tuiles changeraient de place à chaque
    // battement de dix secondes, et l'on ne retrouverait jamais un élève.
    const mur = trierPourLeMur([
        unEleve({ id: 'z', prenom: 'Zoé', quand: ilYA(20) }),
        unEleve({ id: 'a', prenom: 'Amel', quand: ilYA(20) })
    ], MAINTENANT);
    assert.deepEqual(mur.map(x => x.eleve.prenom), ['Amel', 'Zoé']);
});

// ═══════════ DANS QUEL ORDRE ON RANGE LES ÉLÈVES DU DIRECT ═══════════════════
//
// RÉMY : « pour le direct ce serait bien de pouvoir faire le tri au nom et pas
// à celui qui est connecté ».
//
// LES DEUX ORDRES RÉPONDENT À DEUX QUESTIONS, et c'est pour cela qu'on les
// garde tous les deux. « Chez qui dois-je aller ? » se range par urgence ;
// « où en est Maëlle ? » se range par nom. Remplacer l'un par l'autre ferait
// revenir le défaut que l'urgence avait corrigé : un élève arrêté dont le nom
// commence par V, hors de l'écran, pendant que l'alarme le nomme en haut.

test('L\'ORDRE PAR NOM NE DÉPEND QUE DU NOM — c\'est tout ce qu\'on lui demande', () => {
    // CE QUE RÉMY REPROCHE À L'AUTRE : « pas à celui qui est connecté ». Dans
    // l'ordre d'urgence, un élève qui se connecte, qui finit ou qui se tait
    // CHANGE DE PLACE — la liste se réarrange sous les yeux pendant qu'on y
    // cherche un prénom.
    const maintenant = 1000000;
    const eleves = [
        { id: '1', prenom: 'Zoé', vu: maintenant - 5, quand: maintenant - 5 },
        // Un élève arrêté depuis longtemps : en tête dans l'ordre d'urgence.
        { id: '2', prenom: 'Victor', vu: maintenant - 5, quand: maintenant - 900 },
        { id: '3', prenom: 'Amel', vu: null, quand: null }
    ];
    const parNom = trierParNom(eleves, maintenant).map(v => v.eleve.prenom);
    assert.deepEqual(parNom, ['Amel', 'Victor', 'Zoé']);
    // ET L'ORDRE D'URGENCE NE RANGE PAS PAREIL : c'est le témoin, sans quoi
    // l'épreuve passerait au vert sur deux fonctions identiques.
    const parUrgence = trierPourLeMur(eleves, maintenant).map(v => v.eleve.prenom);
    assert.notDeepEqual(parUrgence, parNom,
        'les deux ordres rendent la même chose : l\'un des deux ne sert à rien');
});

test('IL RANGE LES ACCENTS AVEC LEUR LETTRE, ET NON À LA FIN', () => {
    // « Émile » doit se ranger avec les E. Sans `sensitivity`, il part après Z
    // — et l'on cherche son élève au mauvais endroit, ce qui est exactement le
    // problème qu'on vient de corriger.
    const noms = trierParNom([
        { id: '1', prenom: 'Zoé' }, { id: '2', prenom: 'Émile' },
        { id: '3', prenom: 'Eva' }, { id: '4', prenom: 'adam' }
    ], 0).map(v => v.eleve.prenom);
    assert.deepEqual(noms, ['adam', 'Émile', 'Eva', 'Zoé']);
});

test('IL REND TOUT LE MONDE, Y COMPRIS CEUX QUI NE SONT PAS LÀ', () => {
    // La liste par nom est une liste d'APPEL : un élève absent doit y figurer,
    // sinon on ne peut plus dire « il n'a pas ouvert sa séance ».
    const eleves = [{ id: '1', prenom: 'A' }, { id: '2', prenom: 'B', ecarte: true },
        { id: '3', prenom: 'C', vu: null }];
    assert.equal(trierParNom(eleves, 0).length, 3);
    assert.equal(trierParNom([], 0).length, 0);
    assert.equal(trierParNom(null, 0).length, 0);
});

test('LES ORDRES SONT NOMMÉS UNE FOIS, ET UN RÉGLAGE INCONNU NE CASSE RIEN', () => {
    // L'écran ne choisit pas ses propres mots : il lit `ORDRES_DU_DIRECT`.
    //
    // ILS SONT QUATRE DEPUIS QUE RÉMY LES A DEMANDÉS : « pour le mur en direct
    // as tu mis les options de tri ? (soit progression, soit actualisation, ou
    // nom) ». Cette épreuve en attendait DEUX et fixait leur ordre — elle a
    // rougi, et c'est son travail : une liste que l'écran parcourt pour
    // dessiner ses boutons ne s'allonge pas sans qu'on le sache.
    //
    // Le détail de chaque ordre est éprouvé dans `tests/ordresDuDirect.test.mjs` ;
    // ici on garde le CONTRAT : ils sont nommés une fois, et un réglage inconnu
    // retombe sur le premier.
    assert.deepEqual(ORDRES_DU_DIRECT.map(o => o.cle),
        ['nom', 'urgence', 'progression', 'actualisation']);
    assert.equal(trieurDuDirect('nom'), trierParNom);
    assert.equal(trieurDuDirect('urgence'), trierPourLeMur);
    // LE REPLI A CHANGÉ AVEC LE DÉFAUT, et c'est voulu : « le tri n'arrête pas
    // de changer sur le mur c'est compliqué de s'y retrouver il faudrait qqch
    // de fixe ». Un réglage gardé d'une version précédente, ou un stockage
    // abîmé, doit retomber sur l'ordre qui ne bouge pas — le nom.
    assert.equal(trieurDuDirect('n_importe_quoi'), trierParNom);
    assert.equal(trieurDuDirect(undefined), trierParNom);
});

// ─────────────────────────────────────────────────────────────────────────────
//
// ET IL NE BOUGE PLUS. RÉMY, le lendemain, en classe : « le tri n'arrête pas de
// changer sur le mur c'est compliqué de s'y retrouver il faudrait qqch de
// fixe ». L'ordre par nom existait, mais il n'était pas celui par défaut — donc
// il n'existait pas pour quelqu'un qui n'avait pas trouvé la bascule.

test('LE MUR NE BOUGE PAS QUAND LA CLASSE TRAVAILLE', () => {
    // LA MESURE QUI COMPTE : on rejoue le battement de cœur. Le même mur, trois
    // instants, et entre les deux un élève se connecte, un autre répond, un
    // troisième se tait depuis un quart d'heure. Dans l'ordre d'urgence, chacun
    // de ces trois faits déplace quelqu'un.
    const t0 = 1000000;
    const avant = [
        { id: '1', prenom: 'Zoé', vu: null, quand: null },
        { id: '2', prenom: 'Victor', vu: t0 - 5, quand: t0 - 5 },
        { id: '3', prenom: 'Amel', vu: t0 - 5, quand: t0 - 900 }
    ];
    // Un quart d'heure plus tard : Zoé s'est connectée, Victor s'est tu, Amel
    // vient de répondre. Et le serveur les rend dans un autre ordre, ce qu'il
    // fait sans prévenir.
    const t1 = t0 + 900;
    const apres = [
        { id: '3', prenom: 'Amel', vu: t1 - 2, quand: t1 - 2 },
        { id: '1', prenom: 'Zoé', vu: t1 - 3, quand: t1 - 3 },
        { id: '2', prenom: 'Victor', vu: t1 - 4, quand: t0 - 5 }
    ];

    const nomsAvant = trierParNom(avant, t0).map(v => v.eleve.prenom);
    const nomsApres = trierParNom(apres, t1).map(v => v.eleve.prenom);
    assert.deepEqual(nomsApres, nomsAvant,
        `le mur s'est réarrangé : ${nomsAvant.join(' ')} → ${nomsApres.join(' ')}`);

    // LE TÉMOIN, sans quoi l'épreuve passerait au vert sur un mur qui ne bouge
    // pas parce que rien ne s'est passé : l'ordre d'urgence, lui, DOIT bouger.
    const urgenceAvant = trierPourLeMur(avant, t0).map(v => v.eleve.prenom);
    const urgenceApres = trierPourLeMur(apres, t1).map(v => v.eleve.prenom);
    assert.notDeepEqual(urgenceApres, urgenceAvant,
        'rien n\'a bougé dans l\'ordre d\'urgence : l\'épreuve ne mesure rien');
});

test('DEUX LUCAS NE PERMUTENT PAS D\'UN BATTEMENT À L\'AUTRE', () => {
    // IL Y EN A DEUX DANS SA CLASSE, et `localeCompare` rend 0 sur deux prénoms
    // identiques : l'ordre retombe alors sur celui du tableau reçu, qui vient
    // du serveur à chaque rafraîchissement. « Il faudrait qqch de fixe » ne
    // souffre pas d'exception pour eux deux.
    const a = { id: 'eleve_aaa', prenom: 'Lucas' };
    const b = { id: 'eleve_bbb', prenom: 'Lucas' };
    const c = { id: 'eleve_ccc', prenom: 'Maëlle' };
    const ordre = (liste) => trierParNom(liste, 0).map(v => v.eleve.id);
    assert.deepEqual(ordre([a, b, c]), ordre([b, a, c]));
    assert.deepEqual(ordre([c, b, a]), ordre([a, b, c]));
});

test('L\'ORDRE PAR DÉFAUT EST « PAR NOM » — c\'est ce que Rémy a demandé', () => {
    // Le tri par nom existait déjà et ne servait à personne : il fallait
    // trouver la bascule. Un réglage qu'on ne découvre pas n'est pas un
    // réglage.
    const SRC = readFileSync(new URL('../js/ui/espaceClasses.js', import.meta.url), 'utf8');
    assert.match(SRC, /const ORDRE_PAR_DEFAUT = 'nom';/);
    // ET LE STOCKAGE NE DÉCIDE PAS DU DÉFAUT : deux replis, la lecture et
    // l'exception — en navigation privée, `localStorage` jette à la lecture.
    assert.match(SRC, /localStorage\.getItem\(CLEF_ORDRE\) \|\| ORDRE_PAR_DEFAUT/);
    assert.match(SRC, /catch \(e\) \{ return ORDRE_PAR_DEFAUT; \}/);
    assert.ok(!/\|\| 'urgence'/.test(SRC), 'le repli « urgence » est resté quelque part');
});
