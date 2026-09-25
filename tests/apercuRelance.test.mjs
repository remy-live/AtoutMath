// UN APERÇU DOIT POUVOIR MONTRER UNE AUTRE QUESTION.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans les apercus (je n'ai pas vérifié les parcours), on a que une
// question et on ne peut pas naviguer dans les questions en tant que prof ».
//
// LA CAUSE ÉTAIT ÉCRITE DANS LE CODE DEPUIS LE DÉBUT, dans `ItemSession` :
// `isDemo` « rend en plus la main au robot et GÈLE LA SAISIE ». Un aperçu
// montre donc UNE question, tirée au hasard, et l'on ne peut ni y répondre ni
// passer à la suivante. Mesuré : sur « Amis de 10 », « La Chasse aux Zéros » et
// « Le Symétrique aux Carreaux », valider ne change pas la question.
//
// OR C'EST EXACTEMENT CE QU'UN PROFESSEUR VIENT CHERCHER. Un générateur tire
// des questions différentes ; juger un exercice — ou un réglage — sur un seul
// tirage, c'est juger sur un échantillon de un.
//
// ON NE DÉGÈLE PAS LA SAISIE, et c'est un choix. Un aperçu jouable a déjà son
// écran, l'œil en plein écran, et `sansTrace` existe pour cela. ON RELANCE : un
// nouveau tirage, une nouvelle question. Mesuré après correction : 6 questions
// différentes sur 6 relances, pour les deux exercices à générateur.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const AP = sansCommentaires(lire('js/ui/apercuTiroir.js'));
const CX = sansCommentaires(lire('js/ui/choisirExercice.js'));
const RE = sansCommentaires(lire('js/ui/reglagesEtape.js'));
const HTML = lire('index.html').replace(/<!--[\s\S]*?-->/g, '');
const CSS = lire('css/modules.css') + lire('css/games.css');

test('DEUX MOTS, PARCE QU\'IL Y A DEUX CHOSES', async () => {
    // Un exercice à générateur pose des questions ; un jeu du catalogue —
    // Hanoï, Le Pousseur — n'en pose aucune, il distribue une partie. Écrire
    // « Question suivante » sur la Tour de Hanoï serait faux.
    const { motDeRelance } = await import('../js/ui/apercuTiroir.js?t=' + Math.random());
    assert.equal(motDeRelance({ generatorId: 'add10' }), 'Question suivante');
    assert.equal(motDeRelance({ activityId: 'hanoi' }), 'Relancer');
    assert.equal(motDeRelance(null), 'Relancer');
});

test('LES TROIS APERÇUS ONT LE BOUTON', () => {
    assert.match(HTML, /<button type="button" class="hd-rejouer" id="hd-rejouer">/);
    assert.match(CX, /<button type="button" class="cx2-rejouer" data-rejouer>/);
    assert.match(RE, /<button type="button" class="re-rejouer" data-rejouer>/);
    // Et chacun porte le mot de SON exercice, posé par le script.
    assert.match(AP, /relance\.textContent = motDeRelance\(exo\);/);
    assert.match(CX, /relance\.textContent = motDeRelance\(exo\);/);
    assert.match(RE, /relance\.textContent = motDeRelance\(exo\);/);
});

test('RELANCER, C\'EST REFAIRE L\'APERÇU — pas bricoler la session', () => {
    // On repasse par le chemin qui sait déjà tout faire : tuer le jeu
    // précédent, remettre la boîte à sa taille par défaut, mesurer, révéler.
    // Un nouveau `launchPreview` tire une nouvelle graine, donc une nouvelle
    // question, et cela vaut pour les vingt-huit activités sans en toucher une.
    assert.match(AP, /export function rejouerApercu\(\) \{/);
    assert.match(AP, /montrerApercu\(exo, ancre, \{ epingler: etaitEpingle \}\);/);
    assert.match(CX, /relance\.onclick = \(\) => \{[\s\S]{0,160}montrer\(exo\);/);
    assert.match(RE, /relance\.onclick = \(\) => \{[\s\S]{0,60}monterApercu\(\);/);
});

test('« QUESTION SUIVANTE » AVANCE DANS LA SÉRIE, IL NE LA RECOMMENCE PAS', async () => {
    // RÉMY, devant l'onglet « Aperçu » du panneau de réglages : « quand on fait
    // l'aperçu avec les réglages, on reste toujours sur des questions du type
    // x² − 36 ». Mesuré dans le navigateur, dix clics : dix fois le PREMIER
    // barreau, sur « Factoriser » comme sur « Développer ». Les nombres
    // changeaient, le barreau jamais — donc le professeur ne pouvait pas voir
    // ce qu'il venait de cocher.
    //
    // La cause n'est pas dans l'aperçu : il ne peut que remonter une session
    // NEUVE, puisqu'il remonte aussi le jeu. Une session neuve entre au rang
    // zéro, et `index` vaut donc éternellement zéro. C'est `ItemSession` qui
    // doit savoir où l'on entre.
    const { ItemSession } = await import('../js/core/itemSession.js');
    const { factorisationGenerator } = await import('../js/core/generators/factorisation.js');

    const marcheAu = (depuis) => {
        const s = new ItemSession({
            generator: factorisationGenerator, params: {}, isDemo: true,
            depuis, nbItems: 14
        });
        return String(s.next().meta.marche);
    };
    // Quatorze questions sur sept barreaux : deux chacun. L'aperçu qu'on
    // parcourt doit donc montrer 1, 1, 2, 2, 3, 3, …
    assert.deepEqual(Array.from({ length: 10 }, (_, i) => marcheAu(i)),
        ['1', '1', '2', '2', '3', '3', '4', '4', '5', '5']);
    // Sans `depuis`, rien ne change pour tout le reste de l'application : on
    // entre au rang zéro, comme avant.
    assert.equal(marcheAu(undefined), '1');

    // ET LES DEUX APERÇUS QUI ONT UN BOUTON LE TRANSMETTENT.
    assert.match(RE, /depuis: rang, nbItems: total/,
        'le panneau de réglages ne dit pas où en est son aperçu');
    assert.match(CX, /depuis: rang, nbItems: total/,
        'la fenêtre de choix ne dit pas où en est son aperçu');
    // Le rang avance d'un cran par clic, et revient au début quand un réglage
    // change : la série n'est plus la même.
    assert.match(RE, /rang \+= 1;/);
    assert.match(RE, /rang = 0;/);
    // Le professeur doit LIRE qu'il avance : « Question 3 sur 14 ». Sans ce
    // compte, on voit changer des nombres et l'on croit tourner en rond.
    assert.match(RE, /Question \$\{r \+ 1\} sur \$\{total\}/);
});

test('UN CLIC, UNE MARCHE — ET NON UNE QUESTION', async () => {
    // RÉMY, SUR UN EXERCICE RÉGLÉ À 45 QUESTIONS : « dans l'aperçu normal ça
    // fonctionne mais dans l'aperçu avec onglet ça ne fonctionne pas. »
    //
    // MESURÉ : quarante-cinq questions sur onze barreaux font QUATRE questions
    // par barreau. L'onglet avançait d'une question par clic — quatre clics
    // pour quitter le premier barreau, quarante pour atteindre le dernier. On
    // cliquait trois fois, on lisait 6(x + 3), 8(x + 7), 7(x + 2), et l'on
    // concluait que rien ne bouge. Techniquement l'aperçu avançait ;
    // utilement, non.
    //
    // « L'APERÇU NORMAL » dit ce qu'il fallait faire : la bulle de la barre
    // montre la PREMIÈRE question de la zone qu'on clique, et chaque zone est
    // une marche. L'onglet saute donc au début de la marche suivante.
    assert.match(RE, /const zonesDeMarches = \(\) => \{/);
    assert.match(RE, /rang = etat\.zones\[\(i \+ 1\) % etat\.zones\.length\]\.de - 1;/);
    // Sans progression, « suivante » reste la question suivante : c'est un
    // nouveau tirage, et c'est tout ce qu'on peut offrir.
    assert.match(RE, /if \(!etat\) \{ rang \+= 1; return; \}/);
    // Et la marche est NOMMÉE sous le bouton, comme la bulle la nomme.
    assert.match(RE, /\` · \$\{z\.nom\}\`/);

    // LE COMPTE QUI A DÉCLENCHÉ LA MESURE, refait ici : onze barreaux, 45
    // questions, et les débuts de marche attendus.
    const { decoupeMarches } = await import('../js/core/progression.js');
    const { developpementGenerator } = await import('../js/core/generators/developpement.js');
    const p = (developpementGenerator.params || []).find(x => x.type === 'marches');
    const zones = decoupeMarches(p.marches, 45, {}).filter(z => z.n > 0);
    assert.equal(zones.length, 11);
    assert.deepEqual(zones.slice(0, 4).map(z => z.de), [1, 5, 9, 13],
        'quatre questions par barreau : un clic par question en demandait quatre');
});

test('LA VIGNETTE ÉPINGLÉE DOIT OUBLIER CE QU\'ELLE MONTRE POUR SE RELANCER', () => {
    // Deux gardes de `montrerApercu` la feraient renoncer — « c'est déjà
    // épinglé », « c'est le même qu'au survol ». Elles existent pour ne pas
    // redémarrer la partie qu'on regarde ; ici c'est précisément ce qu'on
    // demande, et elle doit rester épinglée après.
    const f = AP.slice(AP.indexOf('export function rejouerApercu'),
        AP.indexOf('export function rejouerApercu') + 420);
    assert.match(f, /const etaitEpingle = epingle;/);
    assert.match(f, /epingle = false;/);
    assert.match(f, /exoAffiche = null;/);
    // L'ancre est retenue au moment de l'affichage, sinon on ne saurait plus
    // à côté de quelle rangée reposer la vignette.
    assert.match(AP, /let ancreAffichee = null;/);
    assert.match(AP, /ancreAffichee = ancre;/);
});

test('le bouton tient la règle des 44 px', () => {
    // Mesuré : 44 px dans les deux fenêtres. Dans la vignette, 36 px à la
    // souris — elle est petite et l'on y vise avec un curseur — et 44 dès que
    // le pointeur est grossier.
    assert.match(CSS, /\.cx2-rejouer, \.re-rejouer, \.hd-rejouer \{\s*\n\s*min-height: 44px;/);
    assert.match(CSS, /@media \(pointer: coarse\) \{ #hover-demo-box \.hd-rejouer \{ min-height: 44px; \} \}/);
});

test('le pied de la fenêtre de choix suit l\'aperçu', () => {
    // Un bouton « Question suivante » sous un cadre vide proposerait de
    // relancer ce qu'on ne montre pas.
    assert.match(CX, /pied\.hidden = false;\s*\n\s*relance\.textContent/);
    assert.match(CX, /cadre\.hidden = true; pied\.hidden = true;/);
});
