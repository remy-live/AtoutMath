// L'ÉQUILIBRE D'ASTRO-SIMPLIF — des missions entières, jouées sans écran.
//
// Ce que la mission doit tenir, et qu'on ne voit qu'en la jouant cent fois :
//   · qui CALCULE — un canon juste toutes les 1,2 seconde — simplifie tout ;
//   · qui se trompe une fois sur quatre réussit encore presque tout : se
//     tromper puis corriger, c'est apprendre ;
//   · qui MITRAILLE — tous les canons à la suite, sans regarder — échoue :
//     sinon le jeu enseignerait la vitesse des pouces, pas la divisibilité.
//
//   node tools/equilibreAstro.mjs [missions]
import { Mission, GRADES, cheminAvec } from '../js/core/astroSimplif.js';
import { makeRng } from '../js/core/ids.js';

/**
 * Joue une mission. `strategie` : 'parfait', 'distrait' (un tir sur quatre
 * au hasard), 'mitraille' (tous les canons, en boucle, aussi vite que le jeu
 * le permet).
 */
export function jouer({ grade = 'cadet', allure = 'normale', strategie = 'parfait', graine = 'eq', combien = 10, visee = 'auto' } = {}) {
    const m = new Mission({ grade, allure, combien, graine, visee });
    const hasard = makeRng(`${graine}-main`);
    const canons = GRADES[grade].canons;
    let t = 0, prochain = 0, rang = 0;
    while (!m.finie && t < 900) {
        m.avancer(1 / 60);
        t += 1 / 60;
        m.evenements.length = 0;
        if (t < prochain || !m.asteroides.length) continue;
        // EN TIR DROIT, le robot va se placer sous la plus basse, et ne tire
        // qu'une fois dessous — comme un élève, qui doit d'abord y aller.
        if (m.visee === 'droit') {
            const visibles = m.asteroides.filter((x) => x.y >= 0);
            if (!visibles.length) continue;
            const bas = visibles.reduce((p, q) => (q.y > p.y ? q : p));
            if (m.cible() !== bas) { m.diriger(bas.x); continue; }
        }
        const a = m.cible();
        if (!a) continue;
        const juste = cheminAvec(a.num, a.den, canons)[0];
        if (strategie === 'parfait') { m.tirer(juste); prochain = t + 1.2; }
        else if (strategie === 'distrait') { m.tirer(hasard.bool(0.25) ? hasard.pick(canons) : juste); prochain = t + 1.2; }
        else { m.tirer(canons[rang++ % canons.length]); prochain = t + 0.12; }
    }
    return m.bilan();
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const n = Number(process.argv[2]) || 40;
    for (const grade of Object.keys(GRADES)) {
        for (const visee of ['auto', 'droit']) for (const strategie of ['parfait', 'distrait', 'mitraille']) {
            let justes = 0, total = 0;
            for (let i = 0; i < n; i++) {
                const b = jouer({ grade, strategie, visee, graine: `eq-${i}` });
                justes += b.justes; total += b.total;
            }
            console.log(`${grade.padEnd(11)} ${visee.padEnd(6)} ${strategie.padEnd(10)} ${justes}/${total} fractions simplifiées (${Math.round(100 * justes / total)} %)`);
        }
    }
}
