// LE TABLEAU DE CONVERSION, SUR UNE TABLETTE — trois défauts vus en classe.
//
// RÉMY : « dans le tableau de conversion, quand tu proposes 18km ça sort du
// tableau (et on ne voit pas tout) et quand on veut écrire sur la tablette, le
// clavier cache la réponse, et aussi une fois que l'on a posé la virgule, on
// ne peut plus l'enlever ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LES TROIS SE MESURENT ICI PARCE QU'AUCUN NE SE MESURE AILLEURS :
//
//   · CE QUI SORT DU TABLEAU se compte sans navigateur (le tirage est pur, et
//     `tests/conversionTientDansLeTableau.test.mjs` le garde) — mais ce que
//     l'élève LIT ne se voit qu'à l'écran. Avant correction : « 7 » affiché
//     seul pour un énoncé qui dit 187.
//   · LA VIRGULE est un geste : poser, déplacer, enlever. Trois clics, trois
//     états, et c'est le seul endroit où l'on peut vérifier qu'ils font ce que
//     la consigne annonce.
//   · LE CLAVIER ne se simule pas en JavaScript. Ce qui se simule, c'est ce
//     qu'il FAIT : la vue visible rétrécit. On rétrécit donc la fenêtre et
//     l'on regarde si la réponse revient sous les yeux — c'est exactement ce
//     que fait `visualViewport` sur Android, et ce que le code lit sur iOS.
//
// Usage :  node tools/tableauDeConversion.mjs

import { ouvrirSonde } from './sonde.mjs';

const RANGS = { km: 3, hm: 2, dam: 1, m: 0, dm: -1, cm: -2, mm: -3 };

// DEUX GRAINES CHOISIES POUR CE QU'ELLES DONNAIENT AVANT LA CORRECTION :
//
//   · 2 → « 187 km = ……… m ». Le tableau s'arrête à km : les chiffres 1 et 8
//     n'avaient pas de colonne, et l'élève lisait « 7 » seul. Le tirage
//     écarte maintenant ce cas, et cette graine rend « 812 dam = ……… m » —
//     c'est la correction elle-même qui change ce qu'on observe ici, et c'est
//     pourquoi l'épreuve ne compare pas à un énoncé écrit en dur mais aux
//     chiffres de l'énoncé qu'elle lit à l'écran.
//   · 3 → « 187 mm = ……… cm ». La virgule tombe après cm, une colonne qui
//     PORTE un chiffre ; le clic y était refusé, et l'exercice ne pouvait pas
//     se terminer. Cette graine-là rend toujours le même énoncé : rien dans la
//     correction ne la déplace.
const GRAINE_DEBORD = '2';
const GRAINE_VIRGULE_OCCUPEE = '3';

const s = await ouvrirSonde({ largeur: 1024, hauteur: 690 });
const err = [];
const ok = (q, v, d = '') => {
    console.log((v ? '  ok   ' : '  NON  ') + q + (d ? '  — ' + d : ''));
    if (!v) { process.exitCode = 1; err.push(q); }
};

console.log('\nLE TABLEAU DE CONVERSION, SUR UNE TABLETTE COUCHÉE (1024 × 690)');
console.log('─'.repeat(64));

async function garnirLeTableau() {
    for (let tour = 0; tour < 12; tour++) {
        const reste = await s.page.evaluate(() =>
            [...document.querySelectorAll('.cv-etiquette')].filter(e => !e.hidden)
                .map(e => e.textContent));
        if (!reste.length) return true;
        const sym = reste[0];
        const boiteEt = await s.page.locator(`.cv-etiquette:text-is("${sym}")`).first().boundingBox();
        const ordre = await s.page.evaluate(() =>
            [...document.querySelectorAll('th[data-rang]')].map(t => Number(t.dataset.rang)));
        const boiteTh = await s.page.locator('th[data-rang]').nth(ordre.indexOf(RANGS[sym])).boundingBox();
        if (!boiteEt || !boiteTh) return false;
        await s.page.mouse.move(boiteEt.x + boiteEt.width / 2, boiteEt.y + boiteEt.height / 2);
        await s.page.mouse.down();
        await s.page.mouse.move(boiteTh.x + boiteTh.width / 2, boiteTh.y + boiteTh.height / 2,
            { steps: 12 });
        await s.page.mouse.up();
        await s.page.waitForTimeout(200);
    }
    return false;
}

/** Fait glisser le nombre jusqu'à la colonne d'une unité. */
async function glisserLeNombreSous(sym) {
    const ordre = await s.page.evaluate(() =>
        [...document.querySelectorAll('td[data-rang]')].map(t => Number(t.dataset.rang)));
    const n = await s.page.locator('.cv-nombre').boundingBox();
    const td = await s.page.locator('td[data-rang]').nth(ordre.indexOf(RANGS[sym])).boundingBox();
    await s.page.mouse.move(n.x + n.width / 2, n.y + n.height / 2);
    await s.page.mouse.down();
    await s.page.mouse.move(td.x + td.width / 2, td.y + td.height / 2, { steps: 14 });
    await s.page.mouse.up();
    await s.page.waitForTimeout(380);
}

/** Survole une colonne avec le nombre SANS lâcher — c'est l'aperçu fantôme. */
async function survolerAvecLeNombre(sym) {
    const ordre = await s.page.evaluate(() =>
        [...document.querySelectorAll('td[data-rang]')].map(t => Number(t.dataset.rang)));
    const n = await s.page.locator('.cv-nombre').boundingBox();
    const td = await s.page.locator('td[data-rang]').nth(ordre.indexOf(RANGS[sym])).boundingBox();
    await s.page.mouse.move(n.x + n.width / 2, n.y + n.height / 2);
    await s.page.mouse.down();
    await s.page.mouse.move(td.x + td.width / 2, td.y + td.height / 2, { steps: 14 });
    await s.page.waitForTimeout(260);
    const vu = await s.page.evaluate(() => ({
        fantomes: [...document.querySelectorAll('.cv-fantome')].map(x => x.textContent).join(''),
        debordeGauche: !!document.querySelector('.cv-deborde-gauche'),
        debordeDroite: !!document.querySelector('.cv-deborde-droite')
    }));
    await s.page.mouse.up();
    await s.page.waitForTimeout(260);
    return vu;
}

const cliquerPoignee = async (sym) => {
    const ordre = await s.page.evaluate(() =>
        [...document.querySelectorAll('td[data-virgule]')].map(t => Number(t.dataset.virgule)));
    await s.page.locator('td[data-virgule]').nth(ordre.indexOf(RANGS[sym])).click();
    await s.page.waitForTimeout(220);
};

const lire = () => s.page.evaluate(() => ({
    etape: (document.querySelector('[data-etape]') || {}).textContent || '',
    enonce: (document.querySelector('[data-enonce]') || {}).textContent || '',
    note: (document.querySelector('[data-note]') || {}).textContent || '',
    virgule: [...document.querySelectorAll('td.cv-poignee--mise')]
        .map(t => t.dataset.virgule).join(',') || 'aucune',
    cases: [...document.querySelectorAll('td[data-rang]')]
        .map(td => (td.textContent || '').trim()).join('')
}));

// ── ① LE NOMBRE TIENT DANS LE TABLEAU ───────────────────────────────────────

console.log('\n① CE QUE L\'ÉLÈVE LIT DANS LE TABLEAU');
let raté = await s.ouvrirExercice('mes-conversion',
    { seed: GRAINE_DEBORD, famille: 'longueur', ecart: 3 });
if (raté) { console.log('  ouverture ratée :', raté); await s.fermer(); process.exit(1); }
await s.doitExister('.cv-table', 'le tableau de conversion');
await s.doitExister('td[data-virgule]', 'la rangée des poignées de virgule');
ok('le tableau se garnit', await garnirLeTableau());

let e = await lire();
// LE NOMBRE DE DÉPART, LU SUR L'ÉCRAN — et non recopié ici : la graine ne rend
// plus le même énoncé qu'avant la correction, et une épreuve qui compare à un
// nombre écrit en dur mesurerait son propre souvenir.
const depart = e.enonce.split(' ')[1];
const attendu = (e.enonce.split(' ')[0].match(/\d/g) || []).join('');
await glisserLeNombreSous(depart);
e = await lire();
console.log('  énoncé  :', e.enonce);
console.log('  tableau :', e.cases);
ok('TOUS LES CHIFFRES DE L\'ÉNONCÉ SONT DANS LE TABLEAU, ET DANS L\'ORDRE',
    // Avant correction : l'énoncé disait 187, le tableau montrait « 7 » — un
    // chiffre sur trois, sans rien pour dire que deux manquaient.
    e.cases === attendu,
    `le tableau montre « ${e.cases} » pour un énoncé qui dit « ${attendu} »`);

// ── ① bis CE QUI DÉBORDE PENDANT QU'ON VISE SE VOIT ────────────────────────

console.log('\n①bis L\'APERÇU NE PERD PLUS DE CHIFFRES EN SILENCE');
raté = await s.ouvrirExercice('mes-conversion',
    { seed: GRAINE_DEBORD, famille: 'longueur', ecart: 3 });
if (!raté) {
    await garnirLeTableau();
    // On vise EXPRÈS la colonne la plus à gauche : un nombre de trois chiffres
    // n'y tient pas, et c'est l'erreur que l'étape 2 travaille.
    const vu = await survolerAvecLeNombre('km');
    console.log('  fantômes visibles :', vu.fantomes || '(aucun)');
    ok('UN DÉBORDEMENT SE SIGNALE AU LIEU DE DISPARAÎTRE',
        vu.debordeGauche, `gauche=${vu.debordeGauche} droite=${vu.debordeDroite}`);
}

// ── ③ LA VIRGULE : POSER, DÉPLACER, ENLEVER ────────────────────────────────

console.log('\n③ LA VIRGULE SE POSE, SE DÉPLACE ET S\'ENLÈVE');
raté = await s.ouvrirExercice('mes-conversion',
    { seed: GRAINE_VIRGULE_OCCUPEE, famille: 'longueur', ecart: 3 });
if (raté) { console.log('  ouverture ratée :', raté); await s.fermer(); process.exit(1); }
await garnirLeTableau();
e = await lire();
console.log('  énoncé  :', e.enonce);
await glisserLeNombreSous('mm');
e = await lire();
console.log('  étape   :', e.etape.trim());
console.log('  cases   :', e.cases);

// La virgule doit aller après cm — une colonne qui PORTE un chiffre. C'est le
// cas qui rendait l'exercice infaisable : le clic y était refusé.
await cliquerPoignee('cm');
e = await lire();
ok('ELLE SE POSE MÊME SOUS UNE COLONNE QUI PORTE UN CHIFFRE',
    e.virgule === String(RANGS.cm), `virgule : ${e.virgule}`);

await cliquerPoignee('dm');
e = await lire();
ok('ELLE SE DÉPLACE', e.virgule === String(RANGS.dm), `virgule : ${e.virgule}`);

await cliquerPoignee('dm');
e = await lire();
ok('ET ELLE S\'ENLÈVE EN RECLIQUANT — la phrase de Rémy, mot pour mot',
    e.virgule === 'aucune', `virgule : ${e.virgule}`);
console.log('  note    :', e.note.trim());
ok('la consigne nomme le geste qui marche',
    /repère/i.test(e.note), e.note.trim().slice(0, 70));

// Les cases, elles, ne touchent plus à la virgule : elles comblent les zéros.
await cliquerPoignee('cm');
const avantZero = (await lire()).virgule;
const ordreCases = await s.page.evaluate(() =>
    [...document.querySelectorAll('td[data-rang]')].map(t => Number(t.dataset.rang)));
await s.page.locator('td[data-rang]').nth(ordreCases.indexOf(RANGS.m)).click();
await s.page.waitForTimeout(220);
e = await lire();
ok('CLIQUER UNE CASE NE DÉPLACE PLUS LA VIRGULE',
    e.virgule === avantZero && /0/.test(e.cases), `virgule ${e.virgule} · cases ${e.cases}`);

// ── ② LE CLAVIER QUI CACHE LA RÉPONSE ──────────────────────────────────────

console.log('\n② LA RÉPONSE RESTE VISIBLE QUAND LE CLAVIER MONTE');
const avant = await s.page.evaluate(() => {
    const t = document.querySelector('.cv-trou');
    const w = document.querySelector('.cv-wrap');
    return t ? { bas: Math.round(t.getBoundingClientRect().bottom), vue: window.innerHeight,
        defilable: w.scrollHeight > w.clientHeight + 1 } : null;
});
console.log('  sans clavier :', JSON.stringify(avant));

// ON SIMULE CE QUE LE CLAVIER FAIT, et non le clavier : la vue visible perd
// 42 % de sa hauteur. C'est ce que `visualViewport` rapporte sur Android, et
// c'est ce que le code lit.
await s.page.setViewportSize({ width: 1024, height: 400 });
await s.page.waitForTimeout(400);
await s.page.locator('.cv-trou').focus();
await s.page.waitForTimeout(500);

const pendant = await s.page.evaluate(() => {
    const t = document.querySelector('.cv-trou');
    const w = document.querySelector('.cv-wrap');
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return {
        haut: Math.round(r.top), bas: Math.round(r.bottom), vue: window.innerHeight,
        defilable: w.scrollHeight > w.clientHeight + 1,
        visible: r.top >= 0 && r.bottom <= window.innerHeight
    };
});
console.log('  clavier ouvert :', JSON.stringify(pendant));
ok('LE CADRE DEVIENT DÉFILABLE — il n\'y avait rien à faire défiler',
    !!pendant && pendant.defilable);
ok('ET LA RÉPONSE EST SOUS LES YEUX, pas sous le clavier',
    !!pendant && pendant.visible, pendant ? `${pendant.haut}–${pendant.bas} sur ${pendant.vue}` : '');

await s.page.screenshot({ path: 'tools/tmp/conversion-clavier.png' });
await s.page.setViewportSize({ width: 1024, height: 690 });
await s.page.waitForTimeout(300);
await s.page.screenshot({ path: 'tools/tmp/conversion-tableau.png' });

console.log('\n' + '─'.repeat(64));
console.log('fenêtres natives et erreurs de page :',
    s.fenetresNatives.length + s.erreurs.length, s.erreurs.slice(0, 3));
if (s.erreurs.length || s.fenetresNatives.length) process.exitCode = 1;
console.log(process.exitCode ? 'IL RESTE QUELQUE CHOSE À REPRENDRE.' : 'LE TABLEAU TIENT.');
await s.fermer();
