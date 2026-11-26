// L'ÉCRITURE SCIENTIFIQUE EN DEUX TEMPS, JOUÉE AU DOIGT.
//
//   node tools/sondeDeuxTemps.mjs [largeur=390] [hauteur=844] [questions=6]
//
// Rémy : « on a 134 × 10⁵, on met d'abord 134 sous forme scientifique en
// laissant le 10⁵, puis après on applique la règle des puissances ». La sonde
// ouvre l'exercice, lit le nombre de départ À L'ÉCRAN, touche les cases et le
// pavé. Sur la première question, elle tombe EXPRÈS dans le piège de Rémy —
// la ligne 2 juste, mais la ligne 3 qui garde l'exposant de départ — et exige :
//   · que la ligne 3 soit marquée, et elle seule ;
//   · que la phrase dise « tu as gardé » ;
//   · qu'après « J'ai compris », la ligne 2 soit restée remplie.
// Puis elle répond juste partout, et exige que l'étape se close.
//
// Elle JETTE aussi si la page défile en largeur, si une case sort de l'écran,
// ou si la page a levé une erreur ou ouvert une fenêtre native.

import { ouvrirSonde } from './sonde.mjs';
import { versScientifique, mantisseTexte } from '../js/core/puissances.js';

const [largeur = '390', hauteur = '844', combien = '6'] = process.argv.slice(2);
const s = await ouvrirSonde({ largeur: Number(largeur), hauteur: Number(hauteur) });
const echecs = [];
const exiger = (vrai, quoi) => { if (!vrai) echecs.push(quoi); };
const toucher = async (sel) => {
    const b = await s.page.evaluate((q) => {
        const e = document.querySelector(q);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, dedans: r.bottom <= innerHeight && r.right <= innerWidth };
    }, sel);
    if (!b) throw new Error(`rien à toucher : ${sel}`);
    if (Number(largeur) < 768) await s.page.touchscreen.tap(b.x, b.y); else await s.page.mouse.click(b.x, b.y);
    return b;
};
const ecrire = async (cle, texte) => {
    await toucher(`[data-case="${cle}"]`);
    for (const c of String(texte)) await toucher(`[data-touche="${c}"]`);
};

/** Ce que l'écran montre : le nombre de départ et l'exposant donné. */
const lireDepart = () => s.page.evaluate(() => {
    const d = document.querySelector('.sd-donne');
    if (!d) return null;
    const sup = d.querySelector('sup');
    const n = Number((sup ? sup.textContent : '').replace('−', '-'));
    const a = d.textContent.split('×')[0].replace(/[\s  ]/g, '');
    return { a, n };
});

try {
    await s.identifier();
    await s.ouvrirExercice('num-puissances-deux-temps', {}, { questions: Number(combien) });
    await s.doitExister('.sd-lignes');
    let vues = 0, piege = false, photo = false;
    for (let i = 0; i < Number(combien); i++) {
        const d = await lireDepart();
        if (!d) break;
        const sc = versScientifique(d.a);
        const mantisse = mantisseTexte(sc.chiffres), p = sc.exposant, final = p + d.n;
        console.log(`${d.a} × 10^${d.n}  →  ${mantisse} × 10^${p} × 10^${d.n}  =  ${mantisse} × 10^${final}`);
        await ecrire('mantisse', mantisse);
        await ecrire('p', String(p));
        if (!piege) {
            // LE PIÈGE DE RÉMY : on garde l'exposant de départ.
            await ecrire('final', String(d.n));
            const g = await s.page.evaluate(() => ({
                large: document.documentElement.scrollWidth > innerWidth,
                cases: [...document.querySelectorAll('.sd-case, .sd-touche')].filter((e) => {
                    const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1;
                }).length
            }));
            exiger(!g.large, 'la page défile en largeur');
            exiger(!g.cases, `${g.cases} case(s) ou touche(s) hors de l'écran`);
            await s.page.screenshot({ path: `tools/tmp/sd-${largeur}x${hauteur}-rempli.png` });
            await toucher('[data-valider]');
            await s.page.waitForTimeout(500);
            const v = await s.page.evaluate(() => ({
                note: (document.querySelector('[data-note]') || {}).textContent || '',
                l2: !!document.querySelector('[data-ligne="2"].sd-ligne--ko'),
                l3: !!document.querySelector('[data-ligne="3"].sd-ligne--ko'),
                carte: (document.querySelector('.fb-detail') || {}).textContent || ''
            }));
            console.log(`  piège : ligne 3 marquée = ${v.l3}, ligne 2 marquée = ${v.l2} — « ${v.note || v.carte} »`);
            exiger(v.l3 && !v.l2, 'le piège de Rémy ne marque pas la ligne 3, et elle seule');
            exiger(/tu as gardé/.test(v.note + v.carte), 'la phrase ne dit pas « tu as gardé »');
            await s.page.screenshot({ path: `tools/tmp/sd-${largeur}x${hauteur}-piege.png` });
            const fermer = await s.page.$('.fb-close');
            if (fermer) await fermer.click();
            await s.page.waitForTimeout(500);
            const garde = await s.page.evaluate(() => [...document.querySelectorAll('.sd-case')].map((c) => c.textContent.trim()));
            console.log(`  après « J'ai compris » : cases ${JSON.stringify(garde)}`);
            exiger(garde[0] === mantisse && garde[1].replace('−', '-') === String(p), 'la ligne 2 juste a été effacée');
            piege = true;
        }
        await ecrire('final', String(final).replace(/^-/, '').padStart(1));
        // Le signe moins se pose par la touche « − », qui le BASCULE.
        if (final < 0) {
            const lu = await s.page.evaluate(() => document.querySelector('[data-case="final"]').textContent.trim());
            if (!lu.startsWith('−')) await toucher('[data-touche="-"]');
        }
        await toucher('[data-valider]');
        vues++;
        await s.page.waitForTimeout(1400);
        if (!photo) { photo = true; await s.page.screenshot({ path: `tools/tmp/sd-${largeur}x${hauteur}-juste.png` }); }
    }
    await s.page.waitForTimeout(1500);
    const fin = await s.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const clos = /Étape validée|Sans faute|bonnes? réponses? sur|à retravailler|Refaire/i.test(fin);
    console.log(`${vues} questions répondues ; étape close = ${clos}`);
    exiger(clos, 'l\'étape n\'est pas close');
    exiger(!s.erreurs.length, `erreurs de page : ${s.erreurs.join(' | ')}`);
    exiger(!s.fenetresNatives.length, 'une fenêtre native s\'est ouverte');
} finally { await s.fermer(); }

if (echecs.length) {
    console.log('\nÉCHEC :');
    echecs.forEach((e) => console.log('  ✘', e));
    process.exit(1);
}
console.log('\nLES DEUX TEMPS S\'ÉCRIVENT AU DOIGT, ET LE PIÈGE EST NOMMÉ.');
