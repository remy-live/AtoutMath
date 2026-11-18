// LE DEVOIR À LA MAISON — ce que l'échéance doit tenir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « une séance qui s'ouvre et se ferme toute seule à une
// date, et le tableau de qui l'a faite. »
//
// CE QUI SE GARDE ICI, ce sont les quatre choses qu'une échéance fausse fait
// sans le dire : fermer une séance au moment où on la donne, compter un
// travail rendu après l'heure, dire « ce soir » d'une heure du matin, et
// annoncer que personne n'a rendu parce qu'on lit le mauvais champ.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    ceSoir, demainMatin, dimancheSoir, propositionsDe, dateDite, heureDite,
    direLEcheance, direAuProf, enRetard, echeanceTenable, DELAI_MINIMAL,
    tableauDuDevoir, direLeTableau, HEURE_DU_SOIR
} from '../js/core/devoir.js';
import {
    donnerSeance, etatSeance, direSeance, comptePourLaNote, finDe, ETATS
} from '../js/core/seances.js';
import { etatDeMaSeance } from '../js/core/rattachement.js';
import { actionDuJour } from '../js/core/aujourdhui.js';

const MARDI = new Date('2026-11-17T10:30:00').getTime();   // un mardi matin
const JOUR = 86400000;

const uneSeance = (opts = {}) => donnerSeance(
    { id: 'c1', nom: '4C' },
    { id: 'p1', name: 'Les fractions', steps: [{ stepId: 's1', exerciseId: 'calc-add' }] },
    opts);

test('LES QUATRE PROPOSITIONS TOMBENT TOUTES DANS L’AVENIR', () => {
    // UNE ÉCHÉANCE DÉJÀ PASSÉE FERME LA SÉANCE À LA SECONDE OÙ ON LA POSE : le
    // professeur croit donner un devoir, et il vient de clore le travail de
    // toute la classe — sans un mot, puisque tout s'est bien passé.
    //
    // ON ÉPROUVE AUX VINGT-QUATRE HEURES DE LA JOURNÉE, et c'est le seul moyen :
    // « ce soir, 20 h » est évidemment dans l'avenir quand on l'écrit à dix
    // heures du matin, et évidemment dans le passé quand on prépare sa semaine
    // le dimanche à 22 h.
    for (let h = 0; h < 24; h++) {
        const t = MARDI - 10.5 * 3600000 + h * 3600000;
        propositionsDe(t).forEach(p => {
            assert.ok(p.quand > t,
                `à ${h} h, « ${p.nom} » tombe ${Math.round((t - p.quand) / 60000)} min `
                + 'dans le passé');
            assert.ok(echeanceTenable(p.quand, t).ok, `« ${p.nom} » est refusée à ${h} h`);
        });
    }
});

test('LE DIMANCHE SOIR N’EST JAMAIS CELUI QUI COMMENCE DANS UNE HEURE', () => {
    // Un devoir donné le dimanche après-midi « pour dimanche soir » n'est pas
    // un devoir à la maison, c'est un piège. Le dimanche, on vise le suivant.
    const dimanche = new Date('2026-11-22T15:00:00').getTime();
    const vise = dimancheSoir(dimanche);
    assert.ok(vise - dimanche > 6 * JOUR, 'le dimanche, on vise le dimanche d’après');
    assert.equal(new Date(vise).getDay(), 0);
    assert.equal(new Date(vise).getHours(), HEURE_DU_SOIR);
    // Et un mardi, c'est bien le dimanche de cette semaine-là.
    const d = dimancheSoir(MARDI);
    assert.equal(new Date(d).getDay(), 0);
    assert.ok(d - MARDI < 6 * JOUR);
    // Les deux autres propositions tiennent leur promesse.
    assert.equal(new Date(ceSoir(MARDI)).getHours(), HEURE_DU_SOIR);
    assert.equal(new Date(demainMatin(MARDI)).getHours(), 8);
    assert.equal(new Date(demainMatin(MARDI)).getDate(), 18);
});

test('« CE SOIR » NE SE DIT QUE D’UNE HEURE DU SOIR', () => {
    // VU À LA PREMIÈRE LECTURE : une échéance posée à 10 h 42 s'annonçait « ce
    // soir, 10 h 42 ». Le mot vient de la proposition la plus courante — vingt
    // heures —, pas de la date, et il devient faux dès qu'on s'en écarte.
    assert.match(dateDite(MARDI + 3 * 3600000, MARDI), /^aujourd’hui à 13 h 30$/);
    assert.match(dateDite(MARDI + 10 * 3600000, MARDI), /^ce soir, 20 h 30$/);
    assert.match(dateDite(MARDI + 26 * 3600000, MARDI), /^demain à 12 h 30$/);
    assert.match(dateDite(MARDI + 34 * 3600000, MARDI), /^demain soir, 20 h 30$/);
    assert.match(dateDite(MARDI + 3 * JOUR, MARDI), /^vendredi à 10 h 30$/);
    // AU-DELÀ DE LA SEMAINE, le jour de la semaine ne suffit plus à se repérer.
    assert.match(dateDite(MARDI + 20 * JOUR, MARDI), /^le 7 décembre, 10 h 30$/);
    // ET L'HEURE SE DIT COMME ON LA DIT : « 20 h », jamais « 20:00 ».
    assert.equal(heureDite(new Date('2026-11-22T20:00:00').getTime()), '20 h');
    assert.equal(heureDite(new Date('2026-11-22T20:05:00').getTime()), '20 h 05');
});

test('LE COMPTE À REBOURS N’APPARAÎT QUE QUAND IL SERT', () => {
    // « il reste 3 jours » sur un devoir donné pour la semaine prochaine
    // n'apprend rien que la date ne dise déjà. « Il reste 2 heures », si.
    assert.match(direLEcheance(MARDI + 12 * 60000, MARDI), /dans 12 minutes/);
    assert.match(direLEcheance(MARDI + 3 * 3600000, MARDI), /dans 3 heures/);
    assert.match(direLEcheance(MARDI + 3 * JOUR, MARDI), /^à rendre pour vendredi/);
    assert.ok(!/dans \d+ (heure|jour)/.test(direLEcheance(MARDI + 3 * JOUR, MARDI)),
        'un devoir pour vendredi n’a pas besoin d’un compte à rebours');
    assert.match(direLEcheance(MARDI - 3600000, MARDI), /passé/);
    // ET LE PROFESSEUR NE LIT PAS LA MÊME PHRASE QUE L'ÉLÈVE : la sienne dit
    // l'état de la chose, pas ce qu'il reste à faire.
    assert.match(direAuProf(MARDI + 3 * JOUR, MARDI), /^à rendre vendredi/);
    assert.match(direAuProf(MARDI - 3 * JOUR, MARDI), /^échéance passée/);
    assert.equal(direLEcheance(null), '');
});

test('UNE ÉCHÉANCE DÉJÀ PASSÉE EST REFUSÉE, ET ON DIT POURQUOI', () => {
    assert.equal(echeanceTenable(MARDI - 1000, MARDI).ok, false);
    assert.match(echeanceTenable(MARDI - 1000, MARDI).pourquoi, /fermerait la séance/);
    // LES DEUX MINUTES QUI VIENNENT SONT DU PASSÉ : le temps de dicter le code
    // et de laisser trente tablettes se réveiller, elles sont déjà là.
    assert.equal(echeanceTenable(MARDI + DELAI_MINIMAL / 2, MARDI).ok, false);
    assert.equal(echeanceTenable(MARDI + DELAI_MINIMAL * 2, MARDI).ok, true);
    // RIEN DU TOUT EST UNE RÉPONSE VALABLE : c'est « plus de date ».
    assert.deepEqual(echeanceTenable(null, MARDI), { ok: true, quand: null });
    assert.equal(echeanceTenable('pas une date', MARDI).ok, false);
});

test('LA SÉANCE SE FERME TOUTE SEULE À L’ÉCHÉANCE', () => {
    const s = uneSeance({ rendreLe: MARDI + 3 * JOUR });
    assert.equal(etatSeance(s, MARDI), ETATS.EN_COURS);
    assert.equal(etatSeance(s, MARDI + 4 * JOUR), ETATS.CLOSE);
    // ET CE QUI ARRIVE APRÈS NE COMPTE PLUS POUR LA NOTE — c'est la règle de
    // la clôture, et une échéance est une clôture décidée à l'avance.
    assert.equal(comptePourLaNote(s, MARDI + JOUR), true);
    assert.equal(comptePourLaNote(s, MARDI + 4 * JOUR), false);
    // MAIS ELLE RESTE OUVERTE À L'ENTRAÎNEMENT, et le texte le dit : fermer la
    // fenêtre notée n'est pas fermer l'exercice.
    assert.match(direSeance(s, MARDI + 4 * JOUR), /entraînement/);
    assert.match(direSeance(s, MARDI + 4 * JOUR), /Échéance passée/);
    // ET AVANT L'HEURE, LA SÉANCE DIT SA DATE plutôt que « En cours » : c'est
    // la seule information qui demande un geste de l'élève.
    assert.match(direSeance(s, MARDI), /à rendre pour vendredi/);
    assert.equal(direSeance(uneSeance(), MARDI), 'En cours');
});

test('CLORE À LA MAIN L’EMPORTE SUR UNE ÉCHÉANCE PLUS LOINTAINE', () => {
    // Un professeur qui clôt le mercredi un devoir donné pour dimanche a raison
    // contre le calendrier : on prend la PREMIÈRE des deux dates.
    const s = uneSeance({ rendreLe: MARDI + 5 * JOUR });
    const close = { ...s, closeLe: MARDI + JOUR };
    assert.equal(finDe(close), MARDI + JOUR);
    assert.equal(etatSeance(close, MARDI + 2 * JOUR), ETATS.CLOSE);
    // ET L'INVERSE AUSSI : une échéance qui tombe avant la clôture.
    const tot = { ...s, closeLe: MARDI + 9 * JOUR };
    assert.equal(finDe(tot), MARDI + 5 * JOUR);
    // SANS NI L'UNE NI L'AUTRE, une séance ne se ferme pas toute seule.
    assert.equal(finDe(uneSeance()), null);
    assert.equal(finDe(null), null);
    // ET LE TEXTE DIT LAQUELLE DES DEUX : « close » tout court laisserait
    // croire à une décision du professeur là où c'est l'heure qui est passée.
    assert.match(direSeance(close, MARDI + 2 * JOUR), /Close le/);
    assert.match(direSeance(tot, MARDI + 6 * JOUR), /Échéance passée/);
});

test('UN TRAVAIL RENDU APRÈS L’HEURE EST VU COMME TEL', () => {
    assert.equal(enRetard(MARDI, MARDI + 1000), true);
    assert.equal(enRetard(MARDI, MARDI - 1000), false);
    assert.equal(enRetard(null, MARDI), false, 'sans échéance, personne n’est en retard');
});

test('LE TABLEAU DIT QUI N’A PAS RENDU, ET LIT LE BON CHAMP', () => {
    // ── LA FAUTE QUE CETTE ÉPREUVE EXISTE POUR ATTRAPER ─────────────────
    //
    // Écrit d'abord `a.fini`, qui n'existe pas : `avancementDeRun` rend `etat`,
    // qui vaut 'fini', 'abandonne' ou 'en-cours'. Un drapeau absent est
    // toujours faux — le tableau aurait affiché « personne n'a rendu » sur une
    // classe entière, et rien ne l'aurait signalé.
    const t = tableauDuDevoir([
        { id: 'a', prenom: 'Léa', avancement: { etat: 'fini', faites: 3 },
            quand: Math.floor((MARDI - JOUR) / 1000) },
        { id: 'b', prenom: 'Tom', avancement: { etat: 'en-cours', faites: 1 } },
        { id: 'c', prenom: 'Zoé', avancement: null },
        { id: 'd', prenom: 'Sam', avancement: { etat: 'fini', faites: 3 },
            quand: Math.floor((MARDI + 2 * JOUR) / 1000) }
    ], MARDI + JOUR, MARDI);
    assert.equal(t.rendus, 2);
    assert.equal(t.commences, 1);
    assert.equal(t.rien, 1);
    assert.equal(t.combien, 4);
    // TROIS ÉTATS ET PAS DEUX : celui qui a commencé sans finir a besoin
    // d'aide, celui qui n'a pas ouvert a besoin d'un rappel.
    assert.deepEqual(t.lignes.map(l => l.etat), ['rendu', 'commence', 'rien', 'rendu']);
    // ET LE RETARD SE DIT DU TRAVAIL : Sam a rendu, mais après l'heure.
    assert.equal(t.lignes[0].enRetard, false);
    assert.equal(t.lignes[3].enRetard, true);
    assert.match(direLeTableau(t), /^2 rendus sur 4 — 2 à relancer$/);
    const tous = tableauDuDevoir([
        { id: 'a', prenom: 'Léa', avancement: { etat: 'fini' } }], MARDI + JOUR, MARDI);
    assert.match(direLeTableau(tous), /tout le monde/);
    assert.match(direLeTableau(tableauDuDevoir([], null, MARDI)), /Aucun élève/);
});

test('L’ÉCHÉANCE ARRIVE JUSQU’À LA CARTE D’ACCUEIL DE L’ÉLÈVE', () => {
    // RÉMY : « une séance qui s'ouvre et se ferme toute seule à une date ». Un
    // devoir dont la date ne s'affiche QUE dans la liste « Mes séances » est un
    // devoir qu'on découvre le lundi matin : la carte d'accueil est le seul
    // écran que tous les élèves voient.
    const s = uneSeance({ rendreLe: Date.now() + 3 * JOUR });
    const lien = { classeId: 'c1', eleveId: 'e1', classeNom: '4C' };
    const etat = etatDeMaSeance(s, lien, null);
    assert.equal(etat.rendreLe, s.rendreLe, 'l’échéance n’arrive pas jusqu’à l’écran');
    const carte = actionDuJour({ parcours: null, erreurs: [], seance: etat });
    assert.equal(carte.genre, 'seance');
    assert.match(carte.titre, /devoir/i,
        'la carte annonce « ta séance du jour » pour un devoir à rendre');
    assert.match(carte.sous, /à rendre/);
    // ET UNE SÉANCE SANS DATE RESTE UNE SÉANCE : on ne renomme pas tout en
    // « devoir » parce qu'on a ajouté une colonne.
    const ordinaire = actionDuJour({
        parcours: null, erreurs: [],
        seance: etatDeMaSeance(uneSeance(), lien, null)
    });
    assert.match(ordinaire.titre, /séance/i);
    assert.ok(!/à rendre/.test(ordinaire.sous));
});

test('UNE ÉCHÉANCE PASSÉE NE TRANSFORME PAS LA CARTE EN DEVOIR', () => {
    // La carte dit ce qu'il y a À FAIRE. Un devoir dont l'heure est passée
    // reste faisable — « reste ouverte à l'entraînement » — mais l'annoncer
    // « à rendre dans −2 jours » serait absurde.
    const s = uneSeance({ rendreLe: Date.now() - 3 * JOUR });
    const etat = etatDeMaSeance(s, { classeId: 'c1', eleveId: 'e1', classeNom: '4C' }, null);
    const carte = actionDuJour({ parcours: null, erreurs: [], seance: etat });
    assert.match(carte.titre, /séance/i);
    assert.ok(!/à rendre/.test(carte.sous), carte.sous);
});
