// LE VOLET « AVANT L'EXERCICE » — ce que l'élève lit avant de commencer.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY :
//
//   « et pour l'atelier, je n'ai pas accès à l'explication avant l'écran ce
//     que l'élève a avant l'exercice »
//
// Il ne pouvait pas, et c'était écrit noir sur blanc : les trois volets de
// l'Atelier montent le jeu avec `internalStudentConfig`, qui SAUTE exactement
// cet écran-là. Le réglage est juste pour eux — on vient y voir le jeu, pas un
// panneau de cases —, mais il rendait le premier écran de l'élève invisible au
// seul outil fait pour regarder.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Ce qui se voit à l'œil n'a pas besoin d'elle. Ce qu'elle garde, ce sont les
// trois choses qui ont cassé EN SILENCE pendant qu'on l'écrivait, et qui
// recasseront de la même façon :
//
//   · un identifiant écrit deux fois dans le même fichier ;
//   · un réglage enregistré avant le volet, qui l'éteint ;
//   · et la vue du professeur servie là où l'on demandait celle de l'élève.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const A = sansCommentaires(readFileSync(new URL('../js/ui/atelier.js', import.meta.url), 'utf8'));
const BRUT = readFileSync(new URL('../js/ui/atelier.js', import.meta.url), 'utf8');
const CONFIG = sansCommentaires(
    readFileSync(new URL('../js/games/configUI.js', import.meta.url), 'utf8'));

test('LE QUATRIÈME VOLET EXISTE, ET IL EST LE PREMIER', () => {
    // L'ORDRE EST L'INFORMATION : c'est l'écran que l'élève voit en PREMIER,
    // les trois autres montrent ce qui vient après.
    assert.match(A, /const VOLETS = \['avant', 'jeu', 'fiche', 'robot'\];/);
    assert.match(A, /let volets = \{ avant: true,/);
    assert.match(BRUT, /id="atl-volet-avant"/);
    assert.match(BRUT, /data-volet="avant"/);
    // ET CHAQUE VOLET SE RECHARGE NOMMÉMENT à l'ouverture. `majVolets` ne
    // recharge que ce qui CHANGE d'état ; à l'ouverture rien ne change, donc
    // un volet absent de cette liste reste un cadre blanc. C'est le premier
    // défaut qu'on a eu, et il ne jette rien.
    // ON DÉCOUPE VERS L'AVANT, PAS VERS UN REPÈRE QU'ON CROIT PLUS BAS.
    // `recharger` est DÉCLARÉE plus haut que `rafraichir` dans le fichier :
    // découper de l'une à l'autre rendait une chaîne VIDE, et l'épreuve
    // annonçait un défaut qui n'existait pas.
    const debut = A.indexOf('function rafraichir');
    const corps = A.slice(debut, debut + 700);
    for (const v of ['avant', 'jeu', 'fiche']) {
        assert.ok(corps.includes(`recharger('${v}')`), `rafraichir doit recharger « ${v} »`);
    }
});

test('UN RÉGLAGE ENREGISTRÉ AVANT CE VOLET NE L\'ÉTEINT PAS', () => {
    // LE DÉFAUT QUI SERAIT ARRIVÉ CHEZ LUI SEUL. Le réglage des volets de
    // Rémy a été enregistré avant que ce volet existe : il ne porte que jeu,
    // fiche et robot. Relu en bloc — `volets[v] = !!brut[v]` —, « avant »
    // devenait faux, et la réponse à sa demande arrivait invisible chez la
    // seule personne qui l'avait demandée. Aucune épreuve, aucune sonde
    // lancée sur un navigateur neuf ne l'aurait vu.
    assert.match(A, /VOLETS\.forEach\(v => \{ if \(v in brut\) volets\[v\] = !!brut\[v\]; \}\);/);
    assert.ok(!/VOLETS\.forEach\(v => \{ volets\[v\] = !!brut\[v\]; \}\);/.test(A),
        'relire le réglage en bloc éteint les volets qu\'il ne connaît pas');
});

test('IL MONTRE LA VUE DE L\'ÉLÈVE, PAS CELLE DU PROFESSEUR', () => {
    // MESURÉ sur les 158 panneaux : médiane de quatre commandes, mais onze en
    // dépassent vingt — les exercices à progression —, et le pire en montrait
    // trente et une. Dans un volet d'Atelier, le professeur EST en mode
    // professeur : sans rôle explicite, il aurait vu SON panneau là où il
    // demandait celui de l'élève. Mesuré après coup
    // (`tools/avantLExercice.mjs`) : 2 commandes sur « Décomposer, PGCD et
    // PPCM », et pas de liste de marches.
    assert.match(A, /\{ role: 'eleve', onApprendre:/);
    assert.match(CONFIG, /const prepare = opts\.role === 'eleve'\s*\n?\s*\?\s*false/);
    // ON N'OUVRE PAS LE JEU POUR ÇA. `openGameLayer` referait au mieux la même
    // chose, au pire refuserait un jeu verrouillé avec une pastille à la place
    // de l'écran qu'on vient voir.
    const corps = A.slice(A.indexOf('if (quoi === \'avant\')'),
        A.indexOf('function direQuIlNYAPasDEcranDAvant'));
    assert.match(corps, /ouvrirReglagesAvantPartie\(complet,/);
    // ET UN EXERCICE SANS RÉGLAGE LE DIT. Un volet resté blanc se lit comme un
    // volet cassé : on relance, on cherche, on ouvre la console.
    assert.match(corps, /direQuIlNYAPasDEcranDAvant\(complet\);/);
    assert.match(A, /entre directement dans la première question/);
});

test('AUCUN IDENTIFIANT N\'EST ÉCRIT DEUX FOIS DANS L\'ATELIER', () => {
    // LE DÉFAUT EXACT, ET SA FORME EST NEUVE. Le cadre du volet neuf s'est
    // appelé `atl-avant` pendant une heure — identifiant pris depuis toujours
    // par le bouton « exercice PRÉCÉDENT ». Le symptôme n'avait aucun rapport
    // avec un doublon : `cadre.src = adresse()` posait une propriété
    // JavaScript sur un `<button>`, qui l'accepte sans broncher et ne la
    // reflète dans aucun attribut. Le volet restait blanc, sans erreur de
    // page, sans rien.
    //
    // ET `doitExister` NE L'AURAIT PAS VU : le sélecteur désignait bien
    // quelque chose. Un sélecteur qui désigne QUELQU'UN D'AUTRE est pire qu'un
    // sélecteur inventé.
    const vus = new Map();
    for (const m of BRUT.matchAll(/\bid="([a-zA-Z][\w-]*)"/g)) {
        vus.set(m[1], (vus.get(m[1]) || 0) + 1);
    }
    const doubles = [...vus].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
    assert.deepEqual(doubles, [], 'deux éléments ne peuvent pas porter le même identifiant');
    // Et l'épreuve doit vraiment avoir regardé quelque chose.
    assert.ok(vus.size > 30, `trop peu d'identifiants lus (${vus.size})`);
});
