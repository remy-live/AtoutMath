import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * LE PIÈGE QUI M'A COÛTÉ QUATRE ACTIVITÉS MORTES.
 *
 * Le Runner (js/core/runner.js) récupère l'usine d'un jeu, l'appelle, garde
 * l'instance rendue… et n'appelle JAMAIS « start ». C'est donc à l'usine de
 * démarrer le jeu :
 *
 *     export function engineTruc(container, isDemo, params) {
 *         const jeu = new Truc(container, isDemo, params);
 *         jeu.start();          // ← sans cette ligne, écran blanc
 *         return jeu;
 *     }
 *
 * Un « return new Truc(...) » se construit sans broncher, ne dessine rien, et
 * ne lève AUCUNE erreur : la console reste muette et la couche de jeu reste
 * vide. Rien dans les tests unitaires ne le voyait, parce qu'un banc d'essai
 * qui appelle « start » lui-même passe très bien. D'où ce test de source : il
 * lit le corps de chaque usine enregistrée et exige l'appel.
 */

const index = readFileSync(new URL('../js/core/activities/index.js', import.meta.url), 'utf8');

/** Les quadruplets [id, libellé, fichier, export] de la table « legacy ». */
function usinesEnregistrees() {
    const bloc = /const legacy = \[([\s\S]*?)\n\];/.exec(index);
    assert.ok(bloc, 'la table « legacy » a changé de forme : ce test ne la lit plus');
    const out = [];
    const ligne = /\[\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\s*\]/g;
    let m;
    while ((m = ligne.exec(bloc[1]))) out.push({ id: m[1], fichier: m[3], usine: m[4] });
    return out;
}

/** Du premier « { » d'une déclaration jusqu'à son accolade fermante. */
function bloc(source, depuis) {
    const ouvre = source.indexOf('{', depuis);
    if (ouvre < 0) return null;
    let profondeur = 0;
    for (let i = ouvre; i < source.length; i++) {
        if (source[i] === '{') profondeur++;
        else if (source[i] === '}' && --profondeur === 0) return source.slice(ouvre, i);
    }
    return null;
}

/**
 * Le corps d'une usine, quelle que soit sa forme d'écriture :
 *   · export function engineTruc(...) { … }
 *   · export const engineTruc = (...) => { … }
 *   · export const engineTruc = fabrique('id')   ← on remonte à « fabrique »
 */
function corpsDe(source, nom, profondeur = 0) {
    if (profondeur > 2) return null;

    let m = new RegExp(`(?:export )?function ${nom}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
    if (m) return bloc(source, m.index + m[0].length - 1);

    m = new RegExp(`(?:export )?const ${nom}\\s*=\\s*([^;\\n]*)`).exec(source);
    if (!m) return null;
    // Une flèche qui ouvre tout de suite un corps : c'est là que ça se passe.
    if (/=>\s*\{?$/.test(m[1].trim()) || /=>/.test(m[1])) {
        const corps = bloc(source, m.index + m[0].length - m[1].length);
        if (corps) return corps;
    }
    // Sinon c'est un appel à une fabrique locale : on suit la piste.
    const appel = /^([A-Za-z_$][\w$]*)\s*\(/.exec(m[1].trim());
    return appel ? corpsDe(source, appel[1], profondeur + 1) : null;
}

test('la table « legacy » est lisible et non vide', () => {
    const u = usinesEnregistrees();
    assert.ok(u.length > 40, `${u.length} usines lues : le format a dû changer`);
});

test('CHAQUE USINE DÉMARRE SON JEU — le Runner ne le fera pas', () => {
    for (const { id, fichier, usine } of usinesEnregistrees()) {
        const source = readFileSync(
            new URL(`../js/games/${fichier}.js`, import.meta.url), 'utf8');
        const corps = corpsDe(source, usine);
        assert.ok(corps !== null,
            `« ${id} » : ${usine} introuvable dans js/games/${fichier}.js`);
        assert.match(corps, /\.start\s*\(/,
            `« ${id} » : ${usine} construit le jeu sans l'allumer — écran blanc garanti`);
    }
});

test('le Runner n\'appelle toujours pas « start » lui-même', () => {
    // Si un jour il le faisait, le test ci-dessus deviendrait faux ET nuisible
    // (double démarrage). Qu'on s'en aperçoive ici plutôt qu'à l'écran.
    const runner = readFileSync(new URL('../js/core/runner.js', import.meta.url), 'utf8');
    const appel = /const fn = mod\[activity\.legacyExport\]/.exec(runner);
    assert.ok(appel, 'le Runner a changé de façon de charger les jeux : revoir ces tests');
    const suite = runner.slice(appel.index, appel.index + 600);
    assert.ok(!/jeu\.start\s*\(|\.start\s*\(\s*\)\s*;\s*\n\s*this\.jeu/.test(suite),
        'le Runner démarre maintenant le jeu : les usines le feraient deux fois');
});
