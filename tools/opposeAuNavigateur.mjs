// LE CAS DE RÉMY, REFAIT JUSQU'AU BOUT : « −(−4) il demande de cliquer sur une
// opération mais ça ne va pas, ça ne fait rien ».
//
// LA PREMIÈRE VERSION CHERCHAIT `[data-op]`, QUI N'EXISTE PAS. Elle disait
// « aucune opération cliquable » sur TOUTES les expressions, y compris celles
// où le clic marchait — elle aurait accusé le logiciel à tort si le défaut
// n'avait pas été réel par ailleurs. L'opérateur cliquable porte la classe
// `.pr-jeton--op`, vue dans le HTML rendu.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const niveau = Number(process.argv[2] || 1);
const s = await ouvrirSonde({ largeur: 1100, hauteur: 800 });
await s.identifier();
await s.ouvrirExercice('calc-prio-oppose', { niveau });
await dormir(1300);
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

const lire = () => s.page.evaluate(() => {
    const g = document.getElementById('game-layer');
    const lignes = [...g.querySelectorAll('.pr-ligne')];
    const derniere = lignes[lignes.length - 1];
    return {
        expression: derniere ? derniere.textContent.replace(/\s+/g, ' ').trim() : '(aucune ligne)',
        lignes: lignes.length,
        ops: derniere ? [...derniere.querySelectorAll('.pr-jeton--op')].map(e => e.textContent.trim()) : [],
        trou: !!g.querySelector('.pr-trou'),
        message: (g.querySelector('.pr-dire, .pr-message') || {}).textContent || ''
    };
});

// ON CHERCHE LA FORME QUI POSAIT PROBLÈME : « −(−4) », un moins unaire seul.
let v = await lire();
for (let i = 0; i < 12 && !/^−\s*\(/.test(v.expression); i++) {
    const autre = await s.page.$('text=Autre calcul');
    if (!autre) break;
    await autre.click(); await dormir(700);
    v = await lire();
}
console.log(`\n\x1b[1m${v.expression}\x1b[0m   (cran ${niveau})`);
dire('l\'opération à faire est cliquable', v.ops.length > 0,
    v.ops.length ? `${v.ops.length} : ${v.ops.join(' ')}` : 'AUCUNE, et l\'écran en réclame une');

if (v.ops.length) {
    await s.page.click('.pr-ligne:last-child .pr-jeton--op');
    await dormir(600);
    const apres = await lire();
    dire('le clic ouvre le trou où écrire le résultat', apres.trou,
        apres.trou ? '' : 'rien ne s\'est passé');
    if (apres.trou) {
        // ET ON RÉPOND, pour voir la ligne suivante s'écrire.
        await s.page.fill('.pr-trou', '4');
        await s.page.press('.pr-trou', 'Enter');
        await dormir(800);
        const fini = await lire();
        dire('la ligne suivante s\'écrit', fini.lignes > v.lignes || /bravo|juste/i.test(fini.message),
            `${v.lignes} ligne(s) → ${fini.lignes} · « ${fini.expression} »`);
    }
}

console.log(`\nerreurs de page : ${s.erreurs.length} · natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach(e => console.log('   ' + e));
await s.photo('#game-layer', `tools/tmp/oppose${niveau}.png`);
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mLE CRAN SE JOUE\x1b[0m');
await s.fermer();
