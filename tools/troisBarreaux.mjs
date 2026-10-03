// LES TROIS EXERCICES DE L'ÉCHELLE, CHACUN DANS SON ACTIVITÉ.
//
// Rémy : « pourquoi n'utilises tu pas le système de QCM, pourquoi as tu tout
// refait », « ce n'est pas trop joli non plus ». On vérifie donc que chacun est
// bien servi par l'activité du logiciel, et non par un écran fait à la main :
// le QCM doit ressembler à tous les autres QCM.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1100, hauteur: 820 });
await s.identifier();
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

// ── LE QCM, PAR LE SYSTÈME DE QCM ───────────────────────────────────────────
await s.ouvrirExercice('calc-oppose-regle');
await dormir(1400);
const qcm = await s.page.evaluate(() => {
    const g = document.getElementById('game-layer');
    return {
        enonce: (g.querySelector('.game-question') || {}).textContent || '',
        // LES CLASSES DU SYSTÈME, pas les miennes : `bubble` est la variante
        // par défaut de `activities/choice.js`.
        bulles: g.querySelectorAll('.bubble').length,
        maison: g.querySelectorAll('.pr-choix').length,
        aide: !!g.querySelector('[data-hint], .hint-bar, .game-hint'),
        outils: !!g.querySelector('.outils-barre, [data-outils]')
    };
});
console.log(`\n\x1b[1mLa règle du signe\x1b[0m  « ${qcm.enonce.trim()} »`);
dire('l\'énoncé est bien un opposé', /^−\([+−]\d+\) = \?$/.test(qcm.enonce.trim()), qcm.enonce.trim());
// LE SYSTÈME DÉCIDE COMBIEN IL EN MONTRE, et c'est justement pour cela qu'on
// le réutilise : `reduireChoix` en laisse deux à l'élève qui peine, quatre à
// celui qui suit. Exiger « exactement quatre » reviendrait à éprouver que
// l'échelle d'aide ne marche pas.
dire('les propositions viennent du SYSTÈME de QCM', qcm.bulles >= 2, `${qcm.bulles} bulle(s)`);
dire('et plus une seule proposition faite à la main', qcm.maison === 0, `${qcm.maison}`);
dire('l\'échelle d\'aide est là, comme partout ailleurs', qcm.aide);

// On répond juste, et l'on regarde que ça compte comme partout.
const bonne = await s.page.evaluate(() => {
    const t = (document.querySelector('.game-question') || {}).textContent || '';
    const m = t.match(/\(([+−])(\d+)\)/);
    if (!m) return null;
    const v = (m[1] === '+' ? 1 : -1) * Number(m[2]);
    return String(-v).replace('-', '−');
});
const cible = await s.page.$(`.bubble:text-is("${bonne}")`);
if (cible) {
    await cible.click();
    await dormir(900);
    const apres = await s.page.evaluate(() => (document.getElementById('game-layer').innerText || ''));
    dire('une bonne réponse est acceptée', /bravo|juste|✓|\+\d/i.test(apres),
        apres.replace(/\n+/g, ' ').slice(0, 70));
} else {
    dire('la bonne proposition est à l\'écran', false, `« ${bonne} » introuvable`);
}

// ── LA SAISIE LIGNE À LIGNE, PAR litteralSaisie ─────────────────────────────
for (const niveau of [2, 3, 4]) {
    await s.ouvrirExercice('calc-oppose-enlever', { niveau });
    await dormir(1400);
    const v = await s.page.evaluate(() => {
        const g = document.getElementById('game-layer');
        return {
            enonce: (g.querySelector('.game-question') || {}).textContent || '',
            champ: !!g.querySelector('.ls-champ, [data-texte], .ls-texte'),
            pave: g.querySelectorAll('.ls-t').length,
            // LA CHAÎNE DES ÉTAPES DE litteralSaisie : `.ls-chaine`, et le
            // titre de chacune dans `.ls-quoi`. J'avais deviné trois classes
            // qui n'existent pas — et la sonde accusait le logiciel de ne rien
            // annoncer alors qu'elle regardait à côté.
            etape: [...g.querySelectorAll('.ls-chaine .ls-quoi')]
                .map(e => e.textContent.trim()).filter(Boolean).join(' · '),
            maison: g.querySelectorAll('.pr-trou, .pr-apres').length
        };
    });
    console.log(`\n\x1b[1mEnlever les parenthèses — cran ${niveau - 1}\x1b[0m  « ${v.enonce.trim()} »`);
    dire('la saisie vient du SYSTÈME, pas d\'un champ fait à la main',
        v.champ && v.maison === 0, `champ ${v.champ} · maison ${v.maison}`);
    dire('le pavé du chapitre est là', v.pave > 0, `${v.pave} touches`);
    dire('et la ligne à écrire est annoncée', v.etape.trim() !== '', v.etape.trim().slice(0, 60));
}

// ── LA CASCADE, INCHANGÉE ───────────────────────────────────────────────────
await s.ouvrirExercice('calc-prio-oppose');
await dormir(1400);
const casc = await s.page.evaluate(() => {
    const g = document.getElementById('game-layer');
    const d = [...g.querySelectorAll('.pr-ligne')].pop();
    return { expr: d ? d.textContent.replace(/\s+/g, ' ').trim() : '',
        ops: d ? d.querySelectorAll('.pr-jeton--op').length : 0 };
});
console.log(`\n\x1b[1mLe Moins devant la Parenthèse\x1b[0m  « ${casc.expr} »`);
dire('elle se clique toujours', casc.ops > 0, `${casc.ops} opération(s)`);
dire('et elle porte bien une priorité', /[×÷]/.test(casc.expr), casc.expr);
dire('sans produit de deux relatifs',
    !/\(−\d+\)\s*[×÷]|[×÷]\s*\(−\d+\)/.test(casc.expr), casc.expr);

console.log(`\nerreurs de page : ${s.erreurs.length} · natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach(e => console.log('   ' + e));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;
await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mCHAQUE BARREAU DANS SON ACTIVITÉ\x1b[0m');
