// LA LIGNE DU MILIEU D'UN QUOTIENT D'EXPOSANTS NÉGATIFS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour 10^(-3) / 10^(-5) il faut bien faire l'opération
// 10^((-3)-(-5)) pour bien comprendre le principe. »
//
// CE QUI SE MESURE ICI NE SE LIT PAS DANS LE CODE : ce que le gabarit AFFICHE,
// et surtout ce que la saisie ACCEPTE. Changer l'écriture proposée ne vaut
// rien si l'élève qui tape l'ancienne — juste, et enseignée jusqu'à hier — se
// voit compter une faute. Une erreur comptée sur une réponse juste est ce
// qu'un exercice peut faire de pire.
//
//     node tools/lignesDuMilieu.mjs
import { ouvrirSonde } from './sonde.mjs';

const CH = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const expoDe = (t) => {
    let n = '', neg = false;
    for (const c of t) { if (c === '⁻') neg = true; else if (c in CH) n += CH[c]; }
    return (neg ? -1 : 1) * Number(n);
};

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

const s = await ouvrirSonde({ largeur: 1400, hauteur: 1000 });
await s.identifier();

const ligne = () => s.page.evaluate(() => {
    const t = document.querySelector('#game-layer').innerText.split('\n').map(l => l.trim());
    // La ligne du milieu est celle qui porte un accent circonflexe d'exposant.
    return t.find(l => l.includes('^')) || '';
});
const question = () => s.page.evaluate(() =>
    document.querySelector('.game-question')?.textContent?.trim() || '');
const taper = async (suite) => {
    for (const c of suite) {
        const ok = await s.page.evaluate((car) => {
            const b = [...document.querySelectorAll('#game-layer button')]
                .filter(x => x.getBoundingClientRect().width > 0)
                .find(x => x.textContent.trim() === car);
            if (b) { b.click(); return true; }
            return false;
        }, c);
        if (!ok) { console.log(`  !! pas de touche « ${c} » au clavier`); ko++; }
        await s.page.waitForTimeout(45);
    }
};
const valider = async () => {
    await s.page.evaluate(() => {
        const b = [...document.querySelectorAll('#game-layer button')]
            .find(x => /Valider/.test(x.textContent));
        if (b) b.click();
    });
    await s.page.waitForTimeout(1100);
};
const ch = (n) => String(Math.abs(n)).split('');

for (const [nom, avecLesDeux] of [
    ['l’écriture que Rémy demande — (−7) − (−5)', true],
    ['l’écriture d’avant, sans la première parenthèse', false]
]) {
    await s.ouvrirExercice('num-puissances-regles',
        { etapes: 'oui', marches: ['quotientRelatif'] }, { questions: 6 });
    await s.doitExister('.game-question');
    const q = await question();
    const [g, d] = q.split('÷');
    const a = expoDe(g), b = expoDe(d);

    const gabarit = await ligne();
    console.log(`\n── ${nom}`);
    console.log(`   ${q}  ·  gabarit « ${gabarit} »`);
    if (avecLesDeux) {
        dire(gabarit.includes('((…)') || gabarit.includes('((…)'),
            `le gabarit met les DEUX exposants entre parenthèses : ${gabarit}`);
    }

    const suite = avecLesDeux
        ? ['1', '0', '^', '(', '(', '−', ...ch(a), ')', '−', '(', '−', ...ch(b), ')', ')']
        : ['1', '0', '^', '(', '−', ...ch(a), '−', '(', '−', ...ch(b), ')', ')'];
    await taper(suite);
    const saisi = await ligne();
    await valider();
    const ecran = await s.page.evaluate(() => document.querySelector('#game-layer').innerText
        .split('\n').map(l => l.trim()).filter(Boolean).slice(0, 12).join(' | '));
    // LA PREUVE QUE LA SAISIE EST ACCEPTÉE : la ligne suivante s\u2019ouvre, et le
    // compteur de la séance a bougé. Ce n\u2019est PAS la question qui change —
    // après la ligne du milieu vient la ligne finale, dans la même question.
    dire(ecran.includes("On calcule l\u2019exposant") || ecran.includes("On calcule l'exposant"),
        `« ${saisi} » est acceptée, la ligne finale s\u2019ouvre`);
    dire(/\b1 \/ 6\b/.test(ecran), `et la séance la compte (${(/\d+ \/ \d+/.exec(ecran) || ['?'])[0]})`);
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
ko += s.erreurs.length + s.fenetresNatives.length;
await s.fermer();
console.log(ko === 0 ? '\nLES DEUX ÉCRITURES PASSENT.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
