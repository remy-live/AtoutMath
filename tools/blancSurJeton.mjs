// LE BLANC EST-IL POSÉ QUELQUE PART OÙ IL NE PASSE PAS ?
//
// NÉ D'UN AUDIT DES THÈMES, ET D'UN PREMIER OUTIL QUI MENTAIT. Sa première
// version comparait le blanc à chaque jeton et annonçait « 19 couples en
// défaut » — `--accent`, `--danger`, `--success`, `--warning`, dans les cinq
// thèmes. C'était vrai, et ce n'était pas un défaut : ces jetons ne sont PAS
// faits pour porter du blanc, et c'est exactement pour cela que la famille
// `--*-fond` existe (voir le commentaire de `css/base.css`, qui raconte aussi
// le piège du jeton `-texte` recyclé en fond).
//
// LA VRAIE QUESTION N'EST DONC PAS « ce jeton porte-t-il du blanc ? » mais
// « UNE RÈGLE POSE-T-ELLE DU BLANC SUR UN JETON QUI N'EN PORTE PAS ? ». Celle-là
// se répond sans navigateur, exactement, et elle a trouvé quatorze défauts réels
// le 27 septembre : la taupe du jeu de rapidité, les cases de la table de
// Pythagore, la pastille du carnet d'erreurs, l'œil de l'alarme du direct.
//
//   node tools/blancSurJeton.mjs

import { readFileSync } from 'node:fs';

const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const rgb = (hex) => {
    const h = hex.replace('#', '').trim();
    const p = h.length === 3 ? h.split('').map(x => x + x) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
    return p.map(x => parseInt(x, 16));
};
const contraste = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const BLANC = [255, 255, 255];
const SEUIL = 4.5;

// --- 1. CE QUE VALENT LES JETONS, THÈME PAR THÈME -----------------------------
const base = readFileSync('css/base.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const THEMES = [
    { nom: 'clair', re: /:root\s*\{([\s\S]*?)\}/ },
    { nom: 'sombre', re: /\[data-theme="dark"\]\s*\{([\s\S]*?)\}/ },
    { nom: 'océan', re: /\[data-theme="ocean"\]\s*\{([\s\S]*?)\}/ },
    { nom: 'forêt', re: /\[data-theme="forest"\]\s*\{([\s\S]*?)\}/ },
    { nom: 'coucher', re: /\[data-theme="sunset"\]\s*\{([\s\S]*?)\}/ }
];
// LES DEUX FAMILLES, ET LA FRONTIÈRE EST TOUT LE SUJET.
const PORTEURS = ['--primary', '--primary-hover',
    '--success-fond', '--danger-fond', '--warning-fond', '--accent-fond'];
const VIFS = ['--accent', '--danger', '--success', '--warning'];

const valeurs = {};
const clair = {};
for (const t of THEMES) {
    const m = t.re.exec(base);
    valeurs[t.nom] = {};
    if (!m) continue;
    for (const j of [...PORTEURS, ...VIFS]) {
        const r = new RegExp(j + '\\s*:\\s*(#[0-9a-fA-F]{3,8})');
        const x = r.exec(m[1]);
        // UN THÈME QUI NE REDÉFINIT PAS UN JETON GARDE CELUI DU THÈME CLAIR :
        // c'est la cascade, et c'est elle qui a fait tomber « rien depuis
        // N min » en océan.
        if (x) valeurs[t.nom][j] = x[1];
        else if (t.nom !== 'clair' && clair[j]) valeurs[t.nom][j] = clair[j];
    }
    if (t.nom === 'clair') Object.assign(clair, valeurs.clair);
}

const pire = (j) => THEMES.reduce((min, t) => {
    const v = valeurs[t.nom][j];
    if (!v) return min;
    const c = contraste(BLANC, rgb(v));
    return (min === null || c < min.c) ? { c, theme: t.nom, v } : min;
}, null);

let mal = 0;
console.log('LES JETONS QUI DOIVENT PORTER DU BLANC (le pire des cinq thèmes)');
for (const j of PORTEURS) {
    const p = pire(j);
    if (!p) { console.log(`  ${j.padEnd(17)} absent de css/base.css`); mal++; continue; }
    const ok = p.c >= SEUIL;
    if (!ok) mal++;
    console.log(`  ${ok ? 'ok  ' : 'RATÉ'} ${j.padEnd(17)} ${p.c.toFixed(2)}  (${p.theme}, ${p.v})`);
}
console.log('\nLES COULEURS VIVES, QUI N\'EN PORTENT PAS — et c\'est voulu');
for (const j of VIFS) {
    const p = pire(j);
    if (p) console.log(`       ${j.padEnd(17)} ${p.c.toFixed(2)}  (${p.theme}, ${p.v})`);
}

// --- 2. QUELQUE RÈGLE POSE-T-ELLE DU BLANC DESSUS ? ---------------------------
const FEUILLES = ['css/base.css', 'css/layout.css', 'css/ui.css',
    'css/games.css', 'css/components.css', 'css/modules.css'];
const fautives = [];
for (const f of FEUILLES) {
    let texte;
    try { texte = readFileSync(f, 'utf8'); } catch (e) { continue; }
    texte = texte.replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(texte)) !== null) {
        const sel = m[1].trim().replace(/\s+/g, ' ');
        if (!sel || sel.startsWith('@')) continue;
        const corps = m[2];
        const encre = (/(?:^|;|\s)color\s*:\s*([^;]+)/i.exec(corps) || [])[1];
        const fond = (/(?:^|;|\s)background(?:-color)?\s*:\s*([^;]+)/i.exec(corps) || [])[1];
        if (!encre || !fond) continue;
        // Le blanc, sous ses trois écritures courantes.
        if (!/^\s*(#fff|#ffffff|white|rgba?\(\s*255\s*,\s*255\s*,\s*255)/i.test(encre)) continue;
        for (const j of VIFS) {
            // `var(--danger)` et non `var(--danger-fond)` : la frontière tient
            // à ce mot-là, et une expression régulière gourmande les confondrait.
            const r = new RegExp('var\\(\\s*' + j + '\\s*[,)]');
            if (r.test(fond)) fautives.push({ f, sel, jeton: j, fond: fond.trim().slice(0, 50) });
        }
    }
}

console.log('\nRÈGLES QUI POSENT DU BLANC SUR UNE COULEUR VIVE');
if (!fautives.length) {
    console.log('  aucune — le blanc ne se pose que sur les jetons faits pour lui.');
} else {
    mal += fautives.length;
    fautives.forEach(x => console.log(`  RATÉ ${x.f} · ${x.sel.slice(0, 64)}`
        + `\n       blanc sur ${x.jeton} (${pire(x.jeton).c.toFixed(2)} au pire)`));
}

console.log(mal ? `\n${mal} DÉFAUT(S).` : '\nRien à signaler.');
process.exit(mal ? 1 : 0);
