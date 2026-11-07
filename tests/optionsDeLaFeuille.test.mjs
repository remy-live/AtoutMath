// LES OPTIONS DE LA FEUILLE, DANS L'ATELIER : UN SEUL CLIC, ET UN NOM QUI DIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture de l'Atelier à l'appui :
//
//   « et pour l'apercu de la feuille, il faudrait que je puisse choisir les
//     options (couleur/colonne) pour vérifier »
//
// ELLES EXISTAIENT DÉJÀ — `#fq-couleur` et `#fq-colonnes` sur la fiche
// d'exercices, `#fp-couleur` sur la fiche de grilles. Ce n'était donc pas un
// manque, c'était une porte qu'on ne trouve pas.
//
// MESURÉ (tools/optionsDeLaFeuille.mjs) : DEUX replis fermés entre lui et le
// réglage — « Les options de la feuille », qui ne nomme ni l'un ni l'autre,
// puis « Papier et corrigé » à l'intérieur. Deux clics à l'aveugle.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Les deux moitiés de la correction, et la promesse qu'elles font :
//
//   · le tiroir de l'Atelier OUVRE ce qu'il range — un repli dans un repli ne
//     cache rien de plus, il ajoute un clic ;
//   · son nom DIT ce qu'il contient ;
//   · et ce qu'il annonce EXISTE. Un nom qui promet « colonnes · couleur »
//     au-dessus d'un tiroir qui ne les a plus serait pire que l'ancien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { lireFeuille, corpsDeLaRegle, valeurDe } from './aidesCss.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('LE TIROIR DE L\'ATELIER OUVRE CE QU\'IL RANGE', () => {
    const A = sansCommentaires(lire('js/ui/atelier.js'));
    // LA LIGNE QUI VAUT UN CLIC. `appendChild` déplace les éléments sans les
    // recréer — un `<details>` déplacé garde donc son repli, et celui de la
    // fenêtre d'impression est fermé par défaut.
    assert.match(A, /if \(el\.tagName === 'DETAILS'\) el\.open = true;/);
    // ET C'EST BIEN DANS LA BOUCLE QUI RANGE, pas ailleurs : au-dehors, elle
    // ouvrirait un repli que personne n'a déplacé.
    const boucle = A.slice(A.indexOf('els.forEach'), A.indexOf('els.forEach') + 260);
    assert.match(boucle, /tiroir\.appendChild\(el\)/);
    assert.match(boucle, /el\.open = true/);
});

test('ET SON NOM DIT CE QU\'IL CONTIENT', () => {
    const A = sansCommentaires(lire('js/ui/atelier.js'));
    // « Les options de la feuille » est vrai et n'apprend rien : on n'ouvre pas
    // un tiroir pour vérifier s'il contient ce qu'on cherche.
    assert.match(A, /<summary>Les options de la feuille /);
    const dit = /<span class="atl-options-dit">([^<]+)<\/span>/.exec(A);
    assert.ok(dit, 'le tiroir ne dit plus ce qu\'il contient');
    // LES DEUX MOTS DE RÉMY, tels qu'il les a écrits.
    assert.match(dit[1], /colonnes/);
    assert.match(dit[1], /couleur/);
    // ET LA PRÉCISION RESTE UNE PRÉCISION : plus petite et plus pâle que le
    // nom, sans quoi le tiroir aurait deux titres.
    const corps = corpsDeLaRegle(lireFeuille('css/ui.css'), '.atl-options-dit',
        { ou: 'css/ui.css' });
    const taille = valeurDe(corps, 'font-size');
    assert.ok(taille && /^\.\d/.test(taille), `« ${taille} » n'est pas plus petit que le nom`);
    assert.match(valeurDe(corps, 'color') || '', /text-muted/);
});

test('ET CE QU\'IL ANNONCE EXISTE VRAIMENT', () => {
    // LA PROMESSE SE VÉRIFIE. Si « colonnes » disparaissait du panneau, le nom
    // enverrait Rémy chercher dans un tiroir ce qui n'y est plus — exactement
    // la demi-heure qu'on vient de lui faire perdre, mais en pire.
    const Q = lire('js/ui/printQuestions.js');
    assert.match(Q, /id="fq-colonnes"/);
    assert.match(Q, /id="fq-couleur"/);
    const S = lire('js/ui/printSheet.js');
    assert.match(S, /id="fp-couleur"/);

    // ET LES MORCEAUX RANGÉS DANS LE TIROIR LES CONTIENNENT. `MODALES_FICHE`
    // nomme ce qu'on déplace : si `#fq-plus` en sortait, les colonnes
    // resteraient devant l'aperçu — ce que Rémy avait fait retirer — ou
    // ailleurs, ce qui serait pire.
    const A = sansCommentaires(lire('js/ui/atelier.js'));
    assert.match(A, /morceaux: \['#fq-contenu', '\.fp-controles--qcm', '\.fp-combien', '#fq-plus'\]/);
    assert.match(A, /morceaux: \['#fp-contenu', '\.fp-combien', '#fp-plus'\]/);
    // Les colonnes vivent DANS `#fq-plus` : on le vérifie, plutôt que de le
    // croire sur parole.
    const plus = Q.slice(Q.indexOf('id="fq-plus"'), Q.indexOf('fp-apercu-repli'));
    assert.ok(plus.includes('id="fq-colonnes"'), 'les colonnes ont quitté « Papier et corrigé »');
    assert.ok(plus.includes('id="fq-couleur"'), 'la couleur a quitté « Papier et corrigé »');
});
