// UN AVIS DIT LE PRÉNOM D'UN ÉLÈVE. DONC UN AVIS EST DU TEXTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROUVÉ PAR UN AUDIT DE SÉCURITÉ, ET VÉRIFIÉ DANS UN VRAI NAVIGATEUR AVANT
// D'ÊTRE CORRIGÉ — parce qu'un rapport n'est pas une preuve.
//
// `showToast` collait son message dans `innerHTML`. Or les avis du direct
// disent « X pourra passer « Y » » où X est un PRÉNOM et Y un nom d'exercice,
// c'est-à-dire des chaînes que l'élève a écrites et que le serveur lui a
// rendues. Un élève qui se nomme `<img src=x onerror=…>` faisait exécuter son
// code dans la page du PROFESSEUR — lequel garde son jeton dans
// `localStorage`. Le jeton ne périme jamais : l'élève devenait professeur sur
// tout le serveur, pour toujours.
//
// LE PIÈGE EST QUE L'ÉCHAPPEMENT EN AMONT NE PROTÉGEAIT PAS.
// `espaceClasses.js` écrit pourtant `data-prenom="${esc(e.prenom)}"`. Mais le
// navigateur DÉCODE les entités quand on relit l'attribut : `dataset.prenom`
// rend la charge intacte, et elle repart dans `innerHTML`. MESURÉ dans
// Chromium (`tools/tmp/maPreuveXss.mjs`) : l'attribut écrit et la valeur relue
// sont identiques caractère pour caractère, et le code s'exécutait.
//
// ON NE RAFISTOLE DONC PAS LES APPELANTS — il y en a cent sept, et il
// suffirait d'en oublier un, le jour où l'on en ajoute un cent huitième. On
// ferme le puits.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('LE MESSAGE D\'UN AVIS NE PASSE PLUS PAR innerHTML', () => {
    const src = lire('js/ui/modal.js');
    const showToast = src.slice(0, src.indexOf('export function showModal'));
    // Le message est posé en `textContent`, et nulle part ailleurs.
    assert.match(showToast, /\.textContent = message/);
    assert.ok(!/innerHTML = `[^`]*\$\{message\}/.test(showToast),
        'le message repasse par innerHTML');
    // Le pictogramme, lui, a le droit d'être du HTML : c'est NOUS qui l'écrivons.
    assert.match(showToast, /pictogramme\.innerHTML = icon/);
});

test('ET AUCUN APPELANT NE LUI PASSE DU HTML — la correction ne casse rien', () => {
    // MESURÉ : 107 appels à `showToast` dans le projet, aucun ne contient de
    // balise. Passer au texte ne change donc l'affichage de personne. Si ce
    // test tombe un jour, c'est qu'un appelant veut du HTML — et il faudra
    // lui donner un autre chemin, pas rouvrir celui-ci.
    const fichiers = ['js/ui', 'js/core', 'js/games', 'js/data'];
    const appels = [];
    const parcourir = (dossier) => {
        for (const f of readdirSync(new URL('../' + dossier, import.meta.url))) {
            const chemin = `${dossier}/${f}`;
            const st = statSync(new URL('../' + chemin, import.meta.url));
            if (st.isDirectory()) { parcourir(chemin); continue; }
            if (!f.endsWith('.js')) continue;
            for (const l of lire(chemin).split('\n')) {
                if (/showToast\(/.test(l)) appels.push(`${chemin} : ${l.trim()}`);
            }
        }
    };
    fichiers.forEach(parcourir);
    assert.ok(appels.length > 80, `seulement ${appels.length} appels trouvés`);
    const avecBalise = appels.filter(a => /showToast\([^)]*<[a-zA-Z/]/.test(a));
    assert.deepEqual(avecBalise, [], 'un appelant passe du HTML à showToast');
});
