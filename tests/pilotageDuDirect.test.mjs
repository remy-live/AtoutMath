// PILOTER L'HEURE : CE QU'ON VOIT, DANS QUEL ORDRE, ET CE QUI ARRIVE À L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Quatre remarques de Rémy, toutes sur la même page — Le direct.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trierPourLeMur, vigilanceDe } from '../js/core/vigilance.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const T = 1_700_000_000;
const eleve = (prenom, o = {}) => ({
    id: prenom, prenom,
    vu: o.enLigne ? T - 3 : 0,
    quand: o.silence === undefined ? 0 : (T - o.silence) * 1000,
    avancement: o.avancement === undefined ? null : o.avancement
});
const enTravail = (prenom, silence = 20) =>
    eleve(prenom, { enLigne: true, silence, avancement: { etat: 'en-cours' } });

// ── « CEUX EN LIGNE SE METTENT À LA FIN » ───────────────────────────────────

test('CELUI QUI TRAVAILLE EST EN HAUT, PAS EN BAS', () => {
    // RÉMY : « dans l'onglet direct, ceux en ligne se mettent à la fin, c'est
    // pas forcément très lisible. » Sa capture : une classe de « jamais venu »,
    // et la seule élève connectée tout en bas.
    //
    // MESURÉ sur sa classe reconstituée (`tools/tmp/ordreDirect.mjs`) :
    // elle était au rang 10 sur 10. Elle est au rang 1.
    const classe = [
        enTravail('Tiffany'),
        ...['Théo', 'Emma', 'Hugo', 'Léane', 'Lucie', 'Anne', 'Inès', 'Marvin', 'Yann']
            .map(n => eleve(n))
    ];
    const range = trierPourLeMur(classe, T);
    assert.equal(range[0].eleve.prenom, 'Tiffany');
    assert.equal(range.findIndex(v => v.eleve.prenom === 'Tiffany') + 1, 1);
    // Et les neuf autres sont « pas en ligne », non « pas commencé » : ce n'est
    // pas la même chose, et c'est la confusion qui produisait l'ordre.
    assert.ok(range.slice(1).every(v => v.etat === 'parti'), range.map(v => v.etat).join(','));
});

test('« PAS COMMENCÉ » VEUT DIRE : IL EST LÀ, IL N\'A RIEN OUVERT', () => {
    // Les deux se confondaient. Or l'un appelle un mot — « tu n'as pas
    // commencé ? » — et l'autre n'appelle rien du tout.
    const present = vigilanceDe(eleve('Diane', { enLigne: true }), T);
    assert.equal(present.etat, 'pas-commence');
    assert.match(present.pourquoi, /il est là/);

    const absent = vigilanceDe(eleve('Fatou'), T);
    assert.equal(absent.etat, 'parti');
});

test('L\'ORDRE SUIT CE QU\'ON PEUT FAIRE', () => {
    // Il faut y aller · on les regarde travailler · on ne peut rien pour eux.
    const classe = [
        eleve('Fatou'),                                       // pas en ligne
        enTravail('Amel', 700),                               // bloqué
        enTravail('Bilal', 20),                               // ça avance
        eleve('Diane', { enLigne: true }),                    // là, rien ouvert
        eleve('Enzo', { enLigne: true, silence: 30, avancement: { etat: 'fini' } })
    ];
    assert.deepEqual(trierPourLeMur(classe, T).map(v => v.eleve.prenom),
        ['Amel', 'Bilal', 'Diane', 'Enzo', 'Fatou']);
});

test('UN ÉLÈVE QUI A FINI RESTE DU CÔTÉ DES PRÉSENTS', () => {
    // Il appelle un geste lui aussi : ouvrir le bac à sable, ou donner la
    // suite. Le ranger avec les absents, c'est l'oublier.
    const classe = [eleve('Absent'),
        eleve('Fini', { enLigne: true, silence: 10, avancement: { etat: 'fini' } })];
    assert.equal(trierPourLeMur(classe, T)[0].eleve.prenom, 'Fini');
});

// ── « VOIR SON EXERCICE NE MONTRE PAS LA MÊME CHOSE » ───────────────────────

test('« VOIR SON EXERCICE » N\'OUVRE PLUS LE ROBOT', () => {
    // RÉMY, capture des deux écrans côte à côte : « voir son exercice ne montre
    // pas la même chose ». Le bouton appelait `openGameLayer(exo, true)`, et ce
    // second argument s'appelle `startAsDemo` : le professeur regardait LA
    // DÉMONSTRATION — « Le robot joue : Les quadrilatères… » — pendant que son
    // élève glissait des noms dans un organigramme.
    const ec = lire('js/ui/espaceClasses.js');
    const bloc = ec.slice(ec.indexOf('if (d.voirExo !== undefined)'),
        ec.indexOf('// ── DISPENSER CET ÉLÈVE-CI'));
    assert.ok(!/openGameLayer/.test(bloc), 'plus de démonstration ici');
    assert.match(bloc, /new Runner\(\{/);
    // Et RIEN N'EST ENREGISTRÉ : le professeur qui regarde ne doit pas
    // apparaître dans son propre direct.
    assert.match(bloc, /essai: true/);
});

test('ET IL OUVRE L\'ÉTAPE, AVEC LES RÉGLAGES DE L\'ÉLÈVE', () => {
    // Même sans le robot, l'exercice nu du catalogue n'est pas son travail :
    // ce sont les cases que le professeur a cochées dans l'étape qui font la
    // différence — les paliers, la partie de la leçon, le nombre de questions.
    const ec = lire('js/ui/espaceClasses.js');
    assert.match(ec, /function etapeDeLaSeance\(exerciceId\)/);
    assert.match(ec, /makeStep\(exo\.id, \(etape && etape\.overrides\) \|\| \{\}/);
    // La séance IMPOSÉE a raison sur les autres parcours : un même exercice
    // vit dans dix parcours avec dix réglages.
    assert.match(ec, /const ordre = imposee \? \[imposee, \.\.\.parcours\.filter/);
    // Et quand on ne trouve pas l'étape, on le DIT plutôt que de faire passer
    // les réglages du catalogue pour les siens.
    assert.match(ec, /Réglages du catalogue : cet exercice n\\'est pas dans la séance donnée/);
});

// ── « IL FAUT QU'IL SOIT PRÉVENU » ──────────────────────────────────────────

test('LA PERMISSION DE SAUTER ARRIVE PENDANT QU\'IL EST DESSUS', () => {
    // RÉMY : « quand on dit à un élève qui galère trop "laisse tomber
    // l'exercice", il faut qu'il soit prévenu. »
    //
    // Il l'était encore moins qu'il ne le croyait. `majBoutonPasser` n'était
    // appelé qu'à l'OUVERTURE d'une étape, et rien n'écoutait `seance_distante` :
    // le professeur autorisait le saut pour l'élève bloqué, l'élève restait
    // bloqué, et le bouton n'apparaissait qu'à l'étape SUIVANTE — celle qu'il
    // ne pouvait pas atteindre, puisqu'il était bloqué. La seule fonction faite
    // pour débloquer quelqu'un ne l'atteignait jamais.
    //
    // MESURÉ au navigateur (`tools/tmp/sondeDirect.mjs`), permission accordée
    // par le vrai chemin (`appliquerEtat`) pendant que l'élève est sur
    // l'exercice :
    //     avant : le runner n'écoute pas · bouton caché · l'élève ne voit rien
    //     après : le runner écoute · bouton visible · « Ton professeur
    //             t'autorise à passer cet exercice »
    const r = lire('js/core/runner.js');
    assert.match(r, /document\.addEventListener\('seance_distante', this\._surSeance\)/);
    assert.match(r, /this\._surSeance = \(\) => this\.majBoutonPasser\(this\.step, true\)/);
    // L'écoute meurt avec le parcours : dix parcours joués dans l'heure en
    // laisseraient dix.
    assert.match(r, /document\.removeEventListener\('seance_distante', this\._surSeance\)/);
});

test('ET ON LE LUI DIT — UN BOUTON QUI APPARAÎT EN SILENCE N\'APPARAÎT PAS', () => {
    const r = lire('js/core/runner.js');
    // RÉMY : « dis une phrase bienveillante ». La première version annonçait
    // une PERMISSION — « Ton professeur t'autorise à passer cet exercice » —,
    // ce qui laisse entendre qu'on lui accorde une dispense. L'enfant qui lit
    // ce message vient de passer dix minutes sur la même question devant toute
    // la classe. On nomme donc ce qui s'est passé, et ce qui suit.
    assert.match(r, /Ton professeur a vu que celui-ci résiste : tu peux le passer/);
    assert.match(r, /Ce n\\'est pas perdu, vous le reverrez ensemble/);
    // Ni félicitation — il n'a rien réussi — ni consolation d'un échec qui n'en
    // est pas un.
    assert.ok(!/Bravo|Bien jou|Tant pis|Ce n\\'est pas grave/.test(r.slice(
        r.indexOf('LA PHRASE COMPTE AUTANT QUE LE BOUTON'),
        r.indexOf('LA PHRASE COMPTE AUTANT QUE LE BOUTON') + 900)));
    // Seulement quand il APPARAÎT : le battement de la séance repasse toutes
    // les dix secondes, et un message qui se répète est un message qu'on
    // n'écoute plus.
    assert.match(r, /const apparait = permis && bouton\.hidden;/);
    assert.match(r, /if \(apparait && annoncer && !this\.essai\)/);
});

// ── « SAUTER UN EXERCICE DE FAÇON GLOBALE » ─────────────────────────────────

test('ON CHOISIT L\'EXERCICE À DISPENSER, ON NE TAPE PLUS SON IDENTIFIANT', () => {
    // RÉMY : « il faudrait pouvoir de façon globale permettre de sauter un
    // exercice ». On pouvait déjà — à condition de taper « calc-add » dans un
    // champ libre. Une liste sous les yeux et un identifiant à retenir de tête
    // ne sont pas le même geste.
    const ec = lire('js/ui/espaceClasses.js');
    assert.match(ec, /<select id="ec-exo" class="ec-champ"/);
    assert.ok(!/placeholder="calc-add"/.test(ec), 'le champ libre ne doit plus traîner');
    assert.match(ec, /function exercicesSousLaMain\(\)/);
    // Les étapes de la séance donnée, DANS LEUR ORDRE : le professeur pense
    // « le troisième », pas « num-arrondi ».
    assert.match(ec, /titre: `\$\{i \+ 1\}\. \$\{nomDExercice\(id\)\}`/);
    // La barre se refait quand la séance change — sinon la liste resterait
    // celle de l'heure d'avant.
    assert.match(ec, /info\.impose_path_id \|\| ''\]\.join\('\|'\)/);
});
