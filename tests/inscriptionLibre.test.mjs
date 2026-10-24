// « REJOINDRE MA CLASSE » — FERMÉE PAR DÉFAUT, RÉOUVRABLE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en découvrant l'écran : « à quoi sert rejoindre ma classe ? » Puis,
// l'explication faite : « je pense qu'il faut le fermer, mais permettre la
// réouverture dans Mes classes, au même niveau que le catalogue en libre
// accès. »
//
// CETTE PORTE CRÉE DES ÉLÈVES. C'est ce qu'elle est faite pour faire, et c'est
// utile au professeur sans liste : il annonce un code au tableau et la classe
// se peuple. Mais quand la liste vient de Pronote, elle devient un piège.
// L'empreinte du prénom est tolérante — accents, casse et ordre des mots ne
// comptent pas, « Maëlle Nguyên » retrouve bien « NGUYÊN Maëlle » — mais le
// NOMBRE DE MOTS compte : la liste dit « BOSSE Cassandre », Cassandre tape
// « Cassandre », et voilà une seconde Cassandre, vierge de tout travail, à côté
// de la vraie.
//
// TROIS ENDROITS, ET IL LES FAUT TOUS LES TROIS :
//   · le SERVEUR refuse, parce que c'est lui qui crée ;
//   · le PORTAIL cache la porte, parce qu'une porte qui refuse est pire que
//     pas de porte ;
//   · la ZONE DU PROFESSEUR la rouvre, au même endroit que le catalogue.
//
// Vérifié bout en bout par `tools/testApi.php` : porte fermée, l'élève inconnu
// reçoit 403 « inscription_fermee » et une phrase qui parle de son billet ;
// le professeur rouvre ; la porte d'entrée le sait sans jeton.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const API = lire('api/index.php');
const PORTAIL = lire('js/core/portail.js');
const PORTAIL_UI = lire('js/ui/portailUI.js');
const EC = lire('js/ui/espaceClasses.js');

test('LE SERVEUR REFUSE DE CRÉER UN ÉLÈVE QUAND C\'EST FERMÉ', () => {
    // C'est la seule garde qui compte : le portail peut cacher la porte, une
    // requête écrite à la main la retrouverait.
    assert.match(API,
        /if \(!\$student && lireReglage\('site\.inscriptionLibre', '0'\) !== '1'\) \{/);
    assert.match(API, /fail\(403, 'inscription_fermee',/);
});

test('MAIS UN ÉLÈVE DÉJÀ DANS LA LISTE PEUT ENCORE ENTRER', () => {
    // `!$student` : on ne refuse QUE la création. Celui que le professeur a
    // importé ne fabrique personne en entrant par là, et cela dépanne celui
    // dont le billet est resté à la maison. C'est l'inscription qu'on ferme,
    // pas la classe.
    const garde = API.slice(API.indexOf("if (!$student && lireReglage('site.inscriptionLibre'"));
    assert.match(garde.slice(0, 260), /!\$student &&/);
});

test('FERMÉ PAR DÉFAUT, ET C\'EST L\'INVERSE DU MODE LIBRE', () => {
    // Le mode libre ouvre un CATALOGUE ; celui-ci CRÉE DES ÉLÈVES. Le repli
    // n'a donc pas de raison d'être le même — et sur une copie d'essai non
    // plus, où le mode libre s'ouvre pour éviter un cul-de-sac.
    assert.match(API, /lireReglage\('site\.inscriptionLibre', '0'\)/);
    assert.match(PORTAIL, /export function inscriptionLibre\(\) \{\s*\n\s*return reglageSite\('inscriptionLibre'\) === true;/);
    const bloc = PORTAIL.slice(PORTAIL.indexOf('export function inscriptionLibre'));
    assert.ok(!/copieDEssai\(\)/.test(bloc.slice(0, 200)),
        'pas de repli « ouvert » sur la copie d\'essai : ici, ouvrir fabrique des élèves');
});

test('LE RÉGLAGE VOYAGE, DANS LES DEUX SENS', () => {
    // Publique en lecture, comme le mode libre : la porte d'entrée décide de ce
    // qu'elle montre AVANT que le visiteur ait le moindre jeton.
    assert.match(API, /'inscriptionLibre' => lireReglage\('site\.inscriptionLibre', '0'\) === '1',/);
    assert.match(API, /if \(array_key_exists\('inscriptionLibre', \$body\)\) \{/);
    assert.match(API, /ecrireReglage\('site\.inscriptionLibre', \$body\['inscriptionLibre'\] \? '1' : '0'\);/);
});

test('LE PORTAIL CACHE LA PORTE QUAND ELLE EST FERMÉE', () => {
    // Montrer une porte qui refuse est pire que de ne pas la montrer : l'élève
    // tape son prénom trois fois avant de lever la main.
    assert.match(PORTAIL_UI, /\$\{inscriptionLibre\(\) \? `<details class="portail-repli">/);
    // Et le branchement doit survivre à son absence — un bouton manquant qui
    // lève une exception arrête tout le reste du branchement.
    assert.match(PORTAIL_UI, /const btnRejoindre = document\.getElementById\('portail-rejoindre'\);/);
    assert.match(PORTAIL_UI, /if \(btnRejoindre\) btnRejoindre\.onclick = rejoindre;/);
});

test('LE PROFESSEUR LA ROUVRE AU MÊME ENDROIT QUE LE CATALOGUE', () => {
    // « au même niveau que le catalogue en libre accès » : même écran, même
    // interrupteur, un seul endroit à regarder pour savoir ce qui est ouvert.
    assert.match(EC, /function inscriptionHtml\(\)/);
    assert.match(EC, /\+ modeLibreHtml\(\) \+ piedHtml\(\);/);
    assert.match(EC, /\$\{inscriptionHtml\(\)\}`;/);
    assert.match(EC, /data-inscription-libre="\$\{actif \? '1' : '0'\}"/);
    // Le clic délégué doit le connaître, sinon l'interrupteur est décoratif.
    assert.match(EC, /\[data-mode-libre\], \[data-inscription-libre\],/);
    assert.match(EC, /await fait\(reglagesDuSite\(\{ inscriptionLibre: cible \}\)/);
});

test('ET L\'ÉCRAN DIT POURQUOI ON LA LAISSE FERMÉE', () => {
    // Un interrupteur sans raison écrite est un interrupteur qu'on bascule pour
    // voir. Celui-ci crée des élèves : il doit nommer le risque.
    assert.match(EC, /Gardez-la éteinte si votre liste/);
    assert.match(EC, /crée un second élève, vierge/);
    assert.match(EC, /Billet obligatoire/);
});
