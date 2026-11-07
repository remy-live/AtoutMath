// CE QUE LE ROBOT DIT VRAIMENT, PHRASE PAR PHRASE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY revient là-dessus pour la troisième fois en deux semaines. Sur les
// pourcentages : « Le robot n'explique rien. Il faut qu'il donne le calcul
// plutôt que juste taper la réponse. » Sur le disque : « Le robot n'aide pas ».
// Le 24 octobre, sur les statistiques : « le robot doit aussi montrer comment
// on calcule la moyenne et montrer comment on trouve une médiane ».
//
// POURQUOI ON NE PEUT PAS LE LIRE DANS LE CODE. Sur le pavé numérique, la
// phrase du robot est CHOISIE à l'exécution : le dernier indice s'il tient en
// cent dix caractères, sinon « Je tape 84 chiffre par chiffre ». Un indice de
// cent treize caractères et un indice absent donnent donc EXACTEMENT la même
// phrase à l'écran, et rien dans la source ne le dit. Trois fois qu'on
// rallonge un indice sans savoir qu'il tombait du bon côté — ou du mauvais.
//
//     node tools/ceQueLeRobotDit.mjs <identifiant> [combien]
//
// Il ouvre l'exercice en mode démonstration et relève CHAQUE bulle, dans
// l'ordre, pendant que le robot joue. Le verdict est la liste : si « Je tape …
// chiffre par chiffre » y figure, le robot n'explique rien.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const ID = process.argv[2] || 'don-statistiques';
const COMBIEN = Number(process.argv[3]) || 3;
// LES MARCHES À REGARDER. Sans cela on ne voit JAMAIS que la première :
// `marcheAuRang` partage les questions dans l'ordre de la progression, et
// trois questions sur neuf marches jouent les trois premières. Or la
// remarque de Rémy porte sur la moyenne et la médiane, qui sont au milieu.
//     node tools/ceQueLeRobotDit.mjs don-statistiques 3 --marches=moyenne
const MARCHES = (process.argv.find(a => a.startsWith('--marches=')) || '')
    .slice('--marches='.length).split(',').filter(Boolean);

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();

// ON N'APPUIE PAS SUR UN BOUTON : ON OUVRE L'APERÇU.
//
// `openDemo` est la porte du professeur — c'est elle qui monte la session en
// `isDemo` et laisse le robot jouer. Chercher un bouton « Montre-moi » dans
// la barre d'outils était une invention de ma part : le seul que la page
// porte appartient au mode apprentissage, il est caché tant qu'on n'y est
// pas, et Playwright a répété « element is not visible » pendant trente
// secondes — la friction que `deplier` et `doitExister` ferment ailleurs.
await s.page.evaluate(async ([id, marches]) => {
    const { openDemo } = await import('/js/games/engine.js');
    const { getExerciseById } = await import('/js/data/catalog.js');
    const e = getExerciseById(id);
    if (!e) throw new Error('exercice inconnu : ' + id);
    openDemo(marches.length ? { ...e, params: { ...(e.params || {}), marches } } : e);
}, [ID, MARCHES]);
await s.doitExister('#game-layer', 'la couche de jeu');

// ON RELÈVE LES BULLES AU FIL DE L'EAU, et non à la fin : une bulle est
// remplacée par la suivante, et une sonde qui regarde trop tard ne voit que la
// dernière. C'est la même règle que le mur blanc du QR code — « pour mesurer un
// écran, il faut une entrée qui ne le fasse pas changer ».
await s.page.evaluate(() => {
    window.__bulles = [];
    const voir = () => {
        document.querySelectorAll('.demo-bubble, [class*="demo-bubble"]').forEach(b => {
            const t = (b.textContent || '').trim();
            if (t && window.__bulles[window.__bulles.length - 1] !== t) window.__bulles.push(t);
        });
    };
    new MutationObserver(voir).observe(document.body, {
        subtree: true, childList: true, characterData: true
    });
    voir();
    window.__voirBulles = voir;
});

// LE ROBOT PARLE À SON RYTHME : une bulle toutes les 1,6 à 1,8 seconde. On le
// laisse jouer le temps de COMBIEN questions, en relevant au fil de l'eau.
for (let i = 0; i < 10 * COMBIEN; i++) {
    await dormir(1000);
    await s.page.evaluate(() => window.__voirBulles && window.__voirBulles());
}

const bulles = await s.page.evaluate(() => window.__bulles || []);
console.log(`\n── ${ID} · ${bulles.length} bulle(s)`);
bulles.forEach((b, i) => console.log(`   ${i + 1}. ${b}`));
const muet = bulles.filter(b => /chiffre par chiffre/.test(b));
if (muet.length) {
    console.log(`\n\x1b[33m${muet.length} fois « chiffre par chiffre » :\x1b[0m `
        + 'le robot décrit un GESTE au lieu du calcul. L\'indice qu\'il aurait dû '
        + 'dire dépasse cent dix caractères, ou il n\'y en a qu\'un.');
} else if (bulles.length) {
    console.log('\n\x1b[32mAucun « chiffre par chiffre » :\x1b[0m le robot pose le calcul.');
}

console.log('erreurs de page :', s.erreurs.length,
    '· fenêtres natives :', s.fenetresNatives.length);
if (s.erreurs.length) console.log(s.erreurs.slice(0, 4));
await s.fermer();
