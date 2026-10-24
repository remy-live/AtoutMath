// L'ÉCHELLE DE RÉMY, BARREAU PAR BARREAU, DANS UN VRAI NAVIGATEUR.
//
// On joue chaque barreau comme un élève : on lit ce qui est écrit, on répond
// juste, et l'on regarde la ligne suivante s'ouvrir. Puis on répond FAUX, et
// l'on regarde ce qui est dit — un refus muet arrête un élève aussi sûrement
// qu'un bouton mort.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const seul = Number(process.argv[2] || 0);
const largeur = Number(process.argv[3] || 1100);
const s = await ouvrirSonde({ largeur, hauteur: 820 });
await s.identifier();
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

/**
 * CE QU'IL FAUT RÉPONDRE, CALCULÉ DEPUIS L'ÉNONCÉ LU À L'ÉCRAN.
 *
 * Une seconde implémentation, volontairement écrite autrement que le module :
 * on lit les nombres avec une expression régulière et l'on calcule à la main.
 * Deux chemins qui tombent d'accord valent mieux qu'un seul qu'on relit.
 */
function attendues(enonce, niveau) {
    const n = (x) => Number(String(x).replace(/[−–]/g, '-').replace(/[+\s]/g, ''));
    const e = enonce.replace(/\s+/g, ' ').trim();
    if (niveau === 2) {
        const m = e.match(/^−\(([+−]\d+)\) ([+−]) \(([+−]\d+)\)$/);
        if (!m) return [];
        const t1 = -n(m[1]);
        const c2 = m[2] === '+' ? n(m[3]) : -n(m[3]);
        const ligne = (t1 < 0 ? '−' : '') + Math.abs(t1) + ' ' + (c2 < 0 ? '−' : '+') + ' ' + Math.abs(c2);
        return [ligne, String(t1 + c2).replace('-', '−')];
    }
    if (niveau === 3) {
        const m = e.match(/^−\((−?\d+) ([+−]) (\d+)\)$/);
        if (!m) return [];
        const s1 = m[2] === '+' ? n(m[1]) + n(m[3]) : n(m[1]) - n(m[3]);
        return [String(s1).replace('-', '−'), String(-s1).replace('-', '−')];
    }
    if (niveau === 4) {
        const m = e.match(/^−\((−?\d+) ([+−]) (\d+)\) ([+−]) \((−?\d+) ([+−]) (\d+)\)$/);
        if (!m) return [];
        const s1 = m[2] === '+' ? n(m[1]) + n(m[3]) : n(m[1]) - n(m[3]);
        const s2 = m[6] === '+' ? n(m[5]) + n(m[7]) : n(m[5]) - n(m[7]);
        const tot = m[4] === '+' ? -s1 + s2 : -s1 - s2;
        return [String(s1).replace('-', '−'), String(s2).replace('-', '−'),
            String(tot).replace('-', '−')];
    }
    return [];
}

const etat = () => s.page.evaluate(() => {
    const g = document.getElementById('game-layer');
    return {
        lignes: [...g.querySelectorAll('.pr-ligne')].map(l => l.textContent.replace(/\s+/g, ' ').trim()),
        trou: !!g.querySelector('.pr-trou'),
        trouLarge: !!g.querySelector('.pr-trou--ligne'),
        choix: [...g.querySelectorAll('.pr-choix')].map(b => b.textContent.trim()),
        aide: (g.querySelector('.pr-aide') || {}).textContent || '',
        note: (g.querySelector('.pr-note') || {}).textContent || '',
        ops: [...g.querySelectorAll('.pr-ligne:last-child .pr-jeton--op')].length,
        apres: [...g.querySelectorAll('.pr-apres')].length
    };
});

for (const niveau of (seul ? [seul] : [1, 2, 3, 4, 5])) {
    await s.ouvrirExercice('calc-prio-oppose', { niveau });
    await dormir(1300);
    let v = await etat();
    console.log(`\n\x1b[1mBARREAU ${niveau}\x1b[0m  « ${v.lignes[0]} »`);
    console.log(`   aide : ${v.aide}`);

    if (niveau === 5) {
        dire('le barreau des priorités se CLIQUE', v.ops > 0 && !v.trou && !v.choix.length,
            `${v.ops} opération(s) cliquable(s)`);
        dire('et il porte bien une multiplication ou une division',
            /[×÷]/.test(v.lignes[0]), v.lignes[0]);
        dire('sans produit de deux relatifs',
            !/\(−\d+\)\s*[×÷]|[×÷]\s*\(−\d+\)/.test(v.lignes[0]), v.lignes[0]);
        continue;
    }

    // LES BARREAUX QU'ON REMPLIT.
    if (niveau === 1) {
        dire('les trois premières questions sont un QCM', v.choix.length === 4, v.choix.join(' '));
        // UNE MAUVAISE PROPOSITION DOIT DIRE POURQUOI.
        const faux = await s.page.evaluate(() => {
            const b = [...document.querySelectorAll('.pr-choix')];
            // On clique une proposition, n'importe laquelle sauf la bonne : on
            // ne la connaît pas d'ici, on prendra celle qui n'a pas marché.
            b[0].click();
            return b[0].textContent.trim();
        });
        await dormir(500);
        const apres = await etat();
        const gagne = /✅/.test(apres.note);
        dire(gagne ? 'la bonne proposition félicite' : 'la mauvaise proposition EXPLIQUE',
            apres.note.trim().length > 15, `« ${faux} » → ${apres.note.trim().slice(0, 78)}`);
        if (!gagne) {
            // On donne la bonne, pour voir la question se terminer.
            await s.page.evaluate(() => {
                // La bonne proposition est celle qui n'a pas été refusée : on
                // essaie les trois autres, l'une termine la question.
                const b = [...document.querySelectorAll('.pr-choix')];
                for (const x of b.slice(1)) x.click();
            });
            await dormir(600);
            const fin = await etat();
            dire('et une bonne proposition termine la question', /✅/.test(fin.note),
                fin.note.trim().slice(0, 60));
        }
        continue;
    }

    dire('des pointillés annoncent ce qui reste à écrire', v.apres > 0 || v.trou, `${v.apres}`);
    if (niveau === 2) {
        dire('le premier trou attend une LIGNE, pas un nombre', v.trouLarge);
        // ON RÉPOND LE RÉSULTAT, ce qui est l'erreur que ce barreau isole.
        await s.page.fill('.pr-trou', '-1');
        await s.page.press('.pr-trou', 'Enter');
        await dormir(500);
        const r = await etat();
        dire('répondre le RÉSULTAT au lieu de la ligne est refusé, et expliqué',
            /réécrit|sans parenthèses/i.test(r.note), r.note.trim().slice(0, 80));
    }

    // ON JOUE LA QUESTION JUSQU'AU BOUT, avec des réponses que la SONDE
    // calcule elle-même à partir de l'énoncé lu à l'écran.
    //
    // C'EST UN SECOND CHEMIN, ET C'EST VOULU. Demander au jeu ce qu'il attend
    // reviendrait à lui demander s'il est d'accord avec lui-même : la sonde
    // dirait « juste » même si le module se trompait partout. Ici deux
    // implémentations indépendantes doivent tomber d'accord.
    const reponses = attendues(v.lignes[0], niveau);
    for (const attendu of reponses) {
        await s.page.fill('.pr-trou', attendu);
        await s.page.press('.pr-trou', 'Enter');
        await dormir(550);
        const r = await etat();
        if (/✅/.test(r.note)) {
            dire('la question se termine quand tout est rempli', true, r.note.trim().slice(0, 60));
            break;
        }
        if (!r.trou) { dire('un trou reste ouvert tant que tout n\'est pas rempli', false, r.note); break; }
    }
}

console.log(`\nerreurs de page : ${s.erreurs.length} · natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log('   ' + e));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mL\x27ÉCHELLE SE MONTE\x1b[0m');
await s.fermer();
