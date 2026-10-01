// « DONNÉ À 6e B » — le câblage du badge, à chaque commit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « comment complète-t-on une séance en cours du coup ? »
//
// On la complète dans Préparer, en ajoutant un exercice à la fin du parcours.
// Depuis `complementDeSeance`, l'ajout arrive vraiment aux élèves — y compris
// à ceux qui ont déjà commencé. Rien ne le disait, et c'est pire qu'une
// fonction manquante : celui qui l'ignore ne s'en sert pas, et celui qui
// retouche sans le savoir change le travail d'une classe en pleine heure.
//
// CE QUE CETTE ÉPREUVE GARDE : que le badge existe, qu'il soit rempli aux
// TROIS moments où la réponse peut changer, et surtout que son infobulle dise
// la règle ASYMÉTRIQUE — ajouter arrive, retirer n'arrive pas. C'est la phrase
// qui évite une mauvaise surprise en classe, et c'est exactement le genre de
// phrase qu'une réécriture emporte sans le faire exprès.
//
// La mesure au navigateur est dans `tools/seanceEnCours.mjs` : elle seule voit
// un badge resté à zéro pixel ou arrivé trop tard.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('LE BADGE EXISTE DANS LA PAGE, ET IL EST CACHÉ AU DÉPART', () => {
    const html = lire('index.html');
    assert.match(html, /<span id="path-donne" class="path-donne" hidden><\/span>/,
        'caché : sur un brouillon il n\'a rien à dire');
    // Et il est DANS le bandeau, à côté de « Enregistré 14:32 » — ailleurs,
    // personne ne le verrait au moment où il sert. On borne la recherche à la
    // fin du bandeau : chercher dans tout le fichier le trouverait où qu'il
    // soit, et l'épreuve ne garderait plus sa place.
    const debut = html.indexOf('class="path-bandeau"');
    const bandeau = html.slice(debut, html.indexOf('id="path-container"', debut));
    assert.ok(bandeau.includes('id="path-donne"'),
        'le badge vit dans le bandeau, à côté de « Enregistré »');
    assert.ok(bandeau.indexOf('id="path-etat"') < bandeau.indexOf('id="path-donne"'),
        'et après lui : on lit d\'abord que c\'est enregistré');
});

test('IL SE REMPLIT AUX TROIS MOMENTS OÙ LA RÉPONSE PEUT CHANGER', () => {
    const src = lire('js/ui/builder.js');
    // 1 — à l'ouverture d'un parcours : c'est un autre parcours, donc une
    //     autre réponse, et l'ancien badge resterait affiché sur le nouveau.
    assert.match(src, /state\.currentPath = normalizePath\(p\.data, p\.name\);\n\s*\/\//);
    assert.match(src, /demanderLAuditoire\(true\);/);
    // 2 — après chaque enregistrement : le badge survit aux redessins.
    const apresSave = src.slice(src.indexOf('export function autoSavePath'));
    assert.match(apresSave.slice(0, 2000), /direLEtat\(new Date\(\)\);\n[\s\S]{0,200}demanderLAuditoire\(\);/);
    // 3 — en refermant le panneau des classes, où l'on coche et décoche :
    //     garder la réponse d'avant ferait un badge qui contredit le geste
    //     qu'on vient de faire, dans la même seconde.
    assert.match(src, /ouvrirPanneauClasses\(state\.currentPath, \(\) => \{[\s\S]{0,200}demanderLAuditoire\(true\);/);
});

test('ET L\'INFOBULLE DIT LA RÈGLE ASYMÉTRIQUE', () => {
    // C'EST LA PHRASE QUI ÉVITE UNE MAUVAISE SURPRISE EN CLASSE. Ajouter
    // arrive ; retirer n'arrive pas. Sans elle, le professeur retire une étape,
    // ne voit rien bouger chez ses élèves, et croit que le logiciel est cassé.
    // ON CHERCHE DEPUIS LA FONCTION DU BADGE, et non depuis le début du
    // fichier : `builder.js` pose trois infobulles, et `indexOf('el.title')`
    // tombait sur celle de la durée estimée — l'épreuve échouait en désignant
    // un texte qui n'a rien à voir.
    const src = lire('js/ui/builder.js');
    const fonction = src.indexOf('function direLAuditoire');
    assert.ok(fonction > 0, 'la fonction du badge existe');
    const bulle = src.slice(src.indexOf('el.title = ', fonction),
                            src.indexOf('el.title = ', fonction) + 900);
    assert.match(bulle, /AJOUTÉ à la fin leur arrive tout seul/);
    assert.match(bulle, /ne les atteint PAS/);
    // Et elle dit où aller pour enlever un exercice, puisque ce n'est pas ici.
    // L'apostrophe est ÉCHAPPÉE dans la source JavaScript : on cherche ce qui
    // est écrit dans le fichier, pas ce que l'écran affiche.
    assert.match(bulle, /dispenser toute la classe d\\?'un exercice/);
});

test('ET PAS DE BADGE QUI MENT QUAND LE SERVEUR NE RÉPOND PAS', () => {
    // « Donné à personne » sur une séance en cours serait pire que rien : le
    // professeur retoucherait en croyant que cela n'atteint personne.
    const src = lire('js/ui/builder.js');
    const attrape = src.slice(src.indexOf('async function demanderLAuditoire'));
    assert.match(attrape.slice(0, 1200),
        /catch \(e\) \{[\s\S]{0,400}auditoire = \{ id: null, classes: \[\], eleves: \[\] \};/,
        'en cas d\'échec on efface le badge plutôt que d\'en afficher un faux');
});
