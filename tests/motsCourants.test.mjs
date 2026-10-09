// LE LEXIQUE DU CHEMIN — ce qu'on exige de chaque entrée.
//
// Ce fichier est le seul du dépôt qui se remplit à la MAIN par centaines, et
// c'est exactement le genre d'endroit où une étourderie passe inaperçue : un
// mot tronqué au milieu d'une liste de huit cents lignes ressemble trait pour
// trait à un mot qu'on ne connaît pas.
//
// MESURÉ SUR MOI-MÊME, DEUX FOIS DANS LA MÊME HEURE : en écrivant ce lexique
// j'ai laissé passer « DOIG », « ECOL », « FROI », « NEIG », « PLUI », « PUIT »
// et « VILL » — sept mots de cinq lettres coupés à quatre pour tenir dans la
// section des quatre lettres —, puis dix autres à la longueur suivante. Aucun
// ne se voit à la relecture ; tous se voient d'un coup ici.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOTS_COURANTS } from '../js/data/motsCourants.js';
import { LEXIQUE } from '../js/core/motsCaches.js';

// ON RAMASSE TOUT AVANT DE JETER. Un `assert` dans une boucle s'arrête au
// premier défaut : sur un fichier qui se remplit à la main par centaines, cela
// veut dire relancer l'épreuve une fois par faute. On liste, puis on compare la
// liste à rien — et l'on corrige tout d'un coup.
const aucun = (liste, quoi) => assert.deepEqual(liste, [], `${quoi} :\n  ` + liste.join('\n  '));

test('chaque mot est en majuscules sans accent, et d\'au moins trois lettres', () => {
    aucun(MOTS_COURANTS.filter(e => !/^[A-Z]{3,}$/.test(e.mot)).map(e => e.mot),
        'mots mal formés');
});

test('chaque mot a une définition qui dit quelque chose', () => {
    // LE MARQUEUR DE BROUILLON : « ERREUR » sert à signaler une entrée à finir
    // pendant qu'on écrit ; aucune ne doit survivre jusqu'au commit.
    aucun(MOTS_COURANTS.filter(e => typeof e.def !== 'string' || e.def === 'ERREUR'
        || e.def.trim().length < 12).map(e => `${e.mot} — « ${e.def} »`),
    'définitions absentes, en brouillon ou trop courtes');
    aucun(MOTS_COURANTS.filter(e => typeof e.def === 'string' && e.def.trim()
        && !/[.!?]$/.test(e.def.trim())).map(e => e.mot),
    'définitions qui ne finissent pas par un point');
});

test('UNE DÉFINITION NE CONTIENT JAMAIS LE MOT QU\'ELLE DÉFINIT', () => {
    // Ni lui, ni sa famille proche : « la ROUE tourne » ne définit rien, et
    // « les ROUES de la voiture » sous le mot ROUE non plus.
    // LA RACINE EST CHERCHÉE EN DÉBUT DE MOT, pas n'importe où : « FIL » se
    // trouvait dans « enfile », ce qui n'est pas le défaut qu'on traque. On
    // découpe donc la définition en mots et l'on regarde leurs DÉBUTS.
    const fautifs = MOTS_COURANTS.filter(e => {
        const racine = e.mot.toLowerCase().slice(0, Math.max(4, e.mot.length - 2));
        return e.def.toLowerCase().normalize('NFD').replace(/[^a-z]/g, ' ')
            .split(/\s+/).some(m => m.startsWith(racine));
    }).map(e => `${e.mot} — « ${e.def} »`);
    aucun(fautifs, 'définitions qui contiennent leur propre mot');
});

test('aucun doublon, ni dans la liste ni avec le lexique mathématique', () => {
    const compte = {};
    MOTS_COURANTS.forEach(e => { compte[e.mot] = (compte[e.mot] || 0) + 1; });
    aucun(Object.entries(compte).filter(([, n]) => n > 1).map(([m, n]) => `${m} ×${n}`),
        'mots répétés');
    // UN MOT NE DOIT PAS ÊTRE DANS LES DEUX LEXIQUES : sa définition y est
    // écrite deux fois, et les deux finiraient par diverger. Le lexique
    // mathématique est celui qui fait foi.
    const maths = new Set(LEXIQUE.map(x => x.mot));
    aucun(MOTS_COURANTS.filter(e => maths.has(e.mot)).map(e => e.mot),
        'mots déjà présents dans le lexique mathématique');
});

test('LE LEXIQUE DU CHEMIN NE CONTIENT PAS DE VOCABULAIRE DE MATHS', () => {
    // LE TÉMOIN DU CONTRAT. Ce fichier existe pour porter les RANGÉES du
    // jardin ; les FLEURS viennent du lexique de cours, et c'est ce qui fait
    // que l'élève arrive sur un mot de maths. Si l'on commence à verser ici
    // « TRIANGLE » et « QUOTIENT », les deux lexiques se confondent et le
    // partage ne veut plus rien dire.
    const deMaths = /^(TRIANGLE|QUOTIENT|FRACTION|DIAMETRE|PERIMETRE|NUMERATEUR|MEDIATRICE|HYPOTENUSE)$/;
    aucun(MOTS_COURANTS.filter(e => deMaths.test(e.mot)).map(e => e.mot),
        'mots du lexique de cours versés ici');
});

test('le lexique couvre les longueurs dont le jardin a besoin', () => {
    // Le jardin découpe ses rangées en réponses de 3 à 8 lettres, et ses
    // fleurs font 6. Une longueur vide rendrait des découpes impossibles sans
    // qu'on comprenne pourquoi le remplissage échoue.
    const parLongueur = {};
    MOTS_COURANTS.forEach(e => { parLongueur[e.mot.length] = (parLongueur[e.mot.length] || 0) + 1; });
    const maigres = [];
    for (let L = 3; L <= 8; L++) {
        if ((parLongueur[L] || 0) < 40) maigres.push(`${L} lettres : ${parLongueur[L] || 0}`);
    }
    aucun(maigres, 'longueurs trop maigres (il en faut au moins 40)');
});
