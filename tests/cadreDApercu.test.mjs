// LE CADRE D'APERÇU SUR UN TÉLÉPHONE — un réglage qu'on ne peut plus voir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 13 octobre : « les masquer sur écran étroit », à propos des trois
// boutons d'aperçu (téléphone / tablette / ordinateur).
//
// CE QUI A ÉTÉ MESURÉ, sur 390 × 844, professeur identifié, en ouvrant un
// exercice du catalogue comme il le fait du doigt — donc par le chemin de
// l'utilisateur, et non en posant soi-même le mode d'affichage :
//
//     boutons d'aperçu visibles  : 0        ← ils étaient DÉJÀ masqués
//     cadreDe(exercice)          : 'mobile' ← et le cadre s'appliquait quand même
//     #game-layer                : device-simulator, 400 px
//     écran                      : 390 px → 5 px hors champ, à droite
//
// Les boutons portent `desktop-only`, et `body.mobile-view .desktop-only` les
// efface : la moitié visible du travail était faite depuis longtemps. Mais
// `previewDeviceMode` vaut « mobile » au démarrage, et rien ne le remettait à
// zéro. Un professeur sur son téléphone jouait donc dans un cadre plus large
// que son écran, SANS AUCUN MOYEN DE L'ENLEVER — le bouton qui l'aurait fait
// est caché. Un réglage qu'on ne peut ni voir, ni changer, ni annuler.
//
// ── LA VRAIE LEÇON N'EST PAS LE DÉFAUT, C'EST SA FORME ──────────────────────
//
// La règle s'écrivait DEUX FOIS : une fois dans `ui/builder.js` (l'aperçu d'un
// parcours), une fois dans `games/engine.js` (l'aperçu d'un exercice du
// catalogue). Les deux lignes étaient identiques, à un garde-fou près :
//
//     builder.js   if (document.body.classList.contains('mobile-view')) return 'none';
//     engine.js    (rien)
//
// Quelqu'un — moi, probablement — a corrigé la copie qu'il avait sous les yeux.
// L'autre a continué pendant tout ce temps, sur le chemin que Rémy emprunte le
// plus souvent. Les deux lisent maintenant `cadreDApercu`, dans le noyau.
//
// C'est pourquoi la seconde épreuve de ce fichier est la plus utile : elle ne
// garde pas la valeur, elle garde le fait qu'il n'y ait QU'UN endroit où la
// décider.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cadreDApercu } from '../js/core/presentation.js';

test('SUR UN TÉLÉPHONE, AUCUN CADRE — l\'écran EST l\'appareil', () => {
    // Le réglage mémorisé ne change rien : c'est justement le point. Il vaut
    // « mobile » au démarrage, et personne ne peut le remettre à « ordinateur »
    // puisque le bouton est masqué.
    assert.equal(cadreDApercu('mobile', true), 'none');
    assert.equal(cadreDApercu('tablet', true), 'none');
    assert.equal(cadreDApercu('desktop', true), 'none');
});

test('SUR UN GRAND ÉCRAN, LE CADRE RESTE — c\'est à cela qu\'il sert', () => {
    // MESURÉ sur 1280 × 900 après la correction : `cadreDe` rend toujours
    // « mobile », `#game-layer` fait 400 px, et il tient dans l'écran. Une
    // correction qui aurait tué l'aperçu aurait retiré à Rémy le seul moyen de
    // voir la présentation du téléphone depuis son ordinateur.
    assert.equal(cadreDApercu('mobile', false), 'mobile');
    assert.equal(cadreDApercu('tablet', false), 'tablet');
    assert.equal(cadreDApercu('desktop', false), 'none');
});

test('UN CADRE INCONNU NE DEVIENT PAS UNE CLASSE INVENTÉE', () => {
    // `#game-layer` reçoit `device-simulator` ou `tablet-simulator`, et rien
    // d'autre n'est décrit par une feuille de style. Rendre une valeur qu'on
    // ne connaît pas ferait jouer l'exercice à une largeur que personne n'a
    // choisie — et ce serait indétectable, puisqu'aucune règle ne s'applique.
    assert.equal(cadreDApercu(undefined, false), 'none');
    assert.equal(cadreDApercu(null, false), 'none');
    assert.equal(cadreDApercu('', false), 'none');
    assert.equal(cadreDApercu('montre-connectee', false), 'none');
});

test('LA RÈGLE DU CADRE NE S\'ÉCRIT QU\'À UN SEUL ENDROIT', () => {
    // C'EST L'ÉPREUVE QUI GARDE LE DÉFAUT, et non les trois ci-dessus : elles
    // gardent une valeur, celle-ci garde qu'il n'y ait pas de seconde copie à
    // corriger. Deux copies, et l'une des deux restera en arrière — c'est
    // exactement ce qui s'est passé.
    //
    // Ce qu'on cherche : un module qui DÉCIDE du cadre à partir de
    // `previewDeviceMode`, c'est-à-dire qui le compare à 'desktop' pour en
    // tirer un cadre.
    //
    // L'ÉCRIRE EST UN AUTRE GESTE, ET IL EST LÉGITIME. `ui/atelier.js` pose le
    // réglage dans son volet et traduit « none » en « desktop » au passage —
    // la traduction inverse, dans le seul sens où elle a un sens. La première
    // version de cette épreuve l'accusait, et c'est elle qui m'a fait écrire la
    // distinction : on ne garde pas la LECTURE du réglage, on garde la
    // DÉDUCTION du cadre.
    const racine = 'js';
    const fichiers = [];
    (function parcourir(dossier) {
        for (const nom of readdirSync(dossier)) {
            const chemin = join(dossier, nom);
            if (statSync(chemin).isDirectory()) parcourir(chemin);
            else if (nom.endsWith('.js')) fichiers.push(chemin);
        }
    })(racine);
    assert.ok(fichiers.length > 100,
        `on n'a lu que ${fichiers.length} fichier(s) : la lecture ne marche plus.`);

    // La forme du défaut, mot pour mot : `previewDeviceMode` comparé à
    // 'desktop' pour en tirer un cadre.
    const copies = [];
    for (const chemin of fichiers) {
        if (chemin.endsWith(join('core', 'presentation.js'))) continue;  // l'original
        const source = readFileSync(chemin, 'utf8');
        const lignes = source.split('\n');
        for (let i = 0; i < lignes.length; i++) {
            if (/^\s*(\/\/|\*|\/\*)/.test(lignes[i])) continue;      // un commentaire
            if (!/previewDeviceMode/.test(lignes[i])) continue;
            if (!/'desktop'|"desktop"/.test(lignes[i])) continue;
            // Une AFFECTATION au réglage — `previewDeviceMode = …` et non
            // `=== …` : on pose le choix, on n'en déduit pas de cadre.
            if (/previewDeviceMode\s*=[^=]/.test(lignes[i])) continue;
            copies.push(`  · ${chemin}:${i + 1} — ${lignes[i].trim()}`);
        }
    }
    assert.deepEqual(copies, [],
        'la règle du cadre d\'aperçu est écrite ailleurs que dans le noyau.\n'
        + 'Elle l\'était déjà deux fois, et seule l\'une des deux copies a reçu le\n'
        + 'garde-fou du téléphone : pendant des semaines, un exercice ouvert depuis\n'
        + 'le catalogue sur un téléphone se jouait dans un cadre de 400 px sur un\n'
        + 'écran de 390.\n'
        + 'Appeler `cadreDApercu(state.previewDeviceMode, state.isMobileView)`.\n'
        + copies.join('\n'));
});
