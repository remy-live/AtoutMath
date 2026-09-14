// UN ACCENT GRAVE DANS UN GABARIT FERME LE GABARIT.
//
// Les jeux écrivent leur CSS dans un littéral de gabarit :
//
//     this.container.innerHTML = `<style> … </style> …`;
//
// Un accent grave posé dans un COMMENTAIRE de ce CSS — pour citer un nom de
// propriété, ce qu'on fait tout le temps en prose — ferme le littéral au
// milieu du fichier. Le module ne se charge plus du tout, et l'erreur qu'on
// lit (« Unexpected identifier 'max' ») ne dit rien de la cause. C'est arrivé
// trois fois, à trois mois d'intervalle, sur trois fichiers différents.
//
// Ce test relit donc chaque gabarit et refuse l'accent grave à l'intérieur.
// Il ne remplace pas l'analyse syntaxique — celle-ci passe, justement : le
// fichier reste du JavaScript valide, il ne veut simplement plus rien dire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;

function fichiers() {
    const out = [];
    const parcourir = (dossier) => {
        readdirSync(join(RACINE, dossier), { withFileTypes: true }).forEach(e => {
            if (e.isDirectory()) parcourir(`${dossier}/${e.name}`);
            else if (e.name.endsWith('.js')) out.push(`${dossier}/${e.name}`);
        });
    };
    parcourir('js');
    return out;
}

/**
 * Les blocs `<style>…</style>` tels qu'ils apparaissent dans le source. On les
 * cherche dans le TEXTE : chercher les littéraux de gabarit demanderait un
 * analyseur, et le bloc de style est justement ce qui les remplit ici.
 */
function blocsDeStyle(texte) {
    return [...texte.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
}

test('aucun accent grave dans un bloc de style écrit en gabarit', () => {
    const fautifs = [];
    fichiers().forEach(f => {
        const texte = readFileSync(join(RACINE, f), 'utf8');
        blocsDeStyle(texte).forEach(bloc => {
            const i = bloc.indexOf('`');
            if (i < 0) return;
            const avant = texte.slice(0, texte.indexOf(bloc) + i);
            const ligne = avant.split('\n').length;
            fautifs.push(`${f}:${ligne} — ${bloc.slice(Math.max(0, i - 40), i + 20).replace(/\n/g, ' ')}`);
        });
    });
    assert.deepEqual(fautifs, [],
        'Un accent grave dans un bloc <style> ferme le littéral de gabarit : '
        + 'le module ne se charge plus. Écrire le nom de la propriété sans accents graves.');
});

/**
 * LE MÊME PIÈGE, EN PLUS DISCRET : `${` dans un commentaire CSS. Il ouvre une
 * interpolation, et tout ce qui suit jusqu'à la prochaine accolade fermante
 * est évalué comme du JavaScript.
 */
test('aucune interpolation accidentelle dans un bloc de style', () => {
    const fautifs = [];
    fichiers().forEach(f => {
        const texte = readFileSync(join(RACINE, f), 'utf8');
        blocsDeStyle(texte).forEach(bloc => {
            // Une interpolation VOULUE est du code ; celle qu'on cherche est
            // dans un commentaire CSS.
            [...bloc.matchAll(/\/\*[\s\S]*?\*\//g)].forEach(c => {
                if (c[0].includes('${')) fautifs.push(`${f} — ${c[0].slice(0, 70).replace(/\n/g, ' ')}`);
            });
        });
    });
    assert.deepEqual(fautifs, []);
});
