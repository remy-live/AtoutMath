// CE QUE COÛTE UNE PRÉPARATION, ET CE QU'ELLE OBTIENT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « est ce que le logiciel serait capable de produire soit un apk soit
// un zip que l tablette pourrait télécharger quand elle est en ligne ? »
//
// La réponse tenait à un chiffre — le nombre de requêtes qu'une tablette
// envoie pour se préparer — et ce chiffre ne se lit nulle part dans le code.
// Cette sonde le compte, sur le chemin de la maîtresse : une tablette neuve
// ouvre `?preparer`, et l'on regarde ce qui passe sur le réseau.
//
//     AVANT le paquet     580 requêtes, 19,1 Mo
//     APRÈS               1 requête, 5,7 Mo
//
// Elle finit réseau coupé, sur un jeu : un compte de requêtes qui n'aboutit
// pas à un Tasuko qui tourne ne mesure qu'une économie.
//
// Usage :  node tools/sondePreparation.mjs [largeur] [hauteur]

import { ouvrirSonde } from './sonde.mjs';

const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const dire = (...a) => console.log(...a);

const s = await ouvrirSonde({
    largeur: Number(process.argv[2]) || 810,
    hauteur: Number(process.argv[3]) || 1080
});

// LE TAMPON DE `performance` TIENT 250 ENTRÉES, ET C'EST UN PIÈGE SILENCIEUX.
// Deuxième mesure fausse de la journée : « 0 requête a traversé sur 250
// demandées », parce que le tampon était plein AVANT que le paquet ne parte.
// Un tampon plein ne dit rien, il cesse d'enregistrer — et l'on prend son
// silence pour un zéro.
await s.page.addInitScript(() => {
    try { performance.setResourceTimingBufferSize(20000); } catch (e) { }
});

// `--sans-paquet` MESURE LE SECOURS, et il faut le mesurer : c'est le chemin
// que prendra une copie posée sur un hébergement sans PHP. Un secours qu'on
// n'essaie jamais est un secours qu'on découvre cassé le jour où il sert.
const sansPaquet = process.argv.includes('--sans-paquet');

// CE QUI TRAVERSE VRAIMENT LE RÉSEAU : ON LE DEMANDE AU SERVEUR.
//
// `s.requetesServies()` et `s.attendreLeCalme()` portent la mesure et les
// trois pièges qu'elle cache — la sonde les explique en entier, parce qu'ils
// se retendront pour toute sonde qui voudra compter des requêtes.
const servies = () => s.requetesServies();
const gros = () => s.page.evaluate(() => performance.getEntriesByType('resource')
    .filter(r => r.transferSize > 100000)
    .map(r => r.name.split('/').pop() + ' ' + Math.round(r.transferSize / 1024) + ' Ko'));

const etat = () => s.page.evaluate(async () => {
    const d = {}; let jeux = 0;
    for (const n of await caches.keys()) {
        const c = await (await caches.open(n)).keys();
        d[n] = c.length;
        jeux += c.filter(r => /\/js\/games\//.test(r.url)).length;
    }
    let durable = null;
    try { durable = await navigator.storage.persisted(); } catch (e) { }
    return { caches: d, jeux, durable };
});

try {
    dire(sansPaquet ? 'SANS PAQUET (secours)' : 'AVEC LE PAQUET');

    // UNE TABLETTE VRAIMENT NEUVE, ET C'EST LA TROISIÈME FOIS QUE LE COMPTAGE
    // ME TROMPE. La sonde mesurait depuis SA page, celle qu'`ouvrirSonde` a
    // déjà chargée : 238 requêtes annoncées là où un navigateur neuf en fait
    // 38. La différence n'était pas la préparation — c'était le rangement que
    // le service worker de la page PRÉCÉDENTE poursuivait en arrière-plan,
    // huit secondes après son chargement.
    //
    // On ouvre donc un contexte à part, sans rien en mémoire, et on va
    // directement à `?preparer` : c'est exactement ce que fait la tablette qui
    // scanne le QR code de la maîtresse.
    const neuf = await s.nav.newContext();
    const page = await neuf.newPage();
    if (sansPaquet) {
        await page.route('**/horslige.php', (r) => r.fulfill({ status: 404, body: 'non' }));
    }
    // ON ATTEND QUE LE SERVEUR SE TAISE AVANT DE PRENDRE LE REPÈRE : la page
    // qu'`ouvrirSonde` a chargée range encore en arrière-plan.
    await s.attendreLeCalme();
    const depart = Date.now();
    const avantServies = servies();
    await page.goto(`http://127.0.0.1:${s.port}/index.html?preparer`);
    await page.waitForFunction(() => {
        const v = document.querySelector('[data-verdict]');
        return v && v.textContent.trim().length > 0;
    }, { timeout: 300000 });
    const secondes = Math.round((Date.now() - depart) / 1000);
    const combien = servies() - avantServies;
    s.page = page;   // tout ce qui suit interroge la tablette, pas la sonde

    dire('VERDICT :', (await s.page.textContent('[data-verdict]')).replace(/\s+/g, ' ').trim());
    dire('LIGNE MÉMOIRE :', (await s.page.textContent('.prep-ligne[data-cle="memoire"] [data-mot]'))
        .replace(/\s+/g, ' ').trim());
    dire('APRÈS :', JSON.stringify(await etat()));

    dire(`RÉSEAU : le serveur a répondu ${combien} fois, en ${secondes} s`);
    dire('   les grosses :', JSON.stringify(await gros()));

    // ── ET LE JEU TOURNE-T-IL, RÉSEAU COUPÉ ? ──────────────────────────────
    const { Shortcodes } = await import('../js/core/shortcodes.js');
    const { makePath, makeStep } = await import('../js/core/path.js');
    const code = Shortcodes.encodePath(
        makePath('Essai', [makeStep('log-tasuko', {}, { nbItems: 3, threshold: 1 })]));
    await s.ctx.setOffline(true);
    await s.page.goto(`http://127.0.0.1:${s.port}/index.html?code=${encodeURIComponent(code)}`);
    await dormir(6000);
    dire('HORS LIGNE :', JSON.stringify(await s.page.evaluate(() => ({
        plateau: !!document.querySelector('.tk-grille, .game-question, #game-board'),
        corps: document.body.innerText.replace(/\s+/g, ' ').slice(0, 120)
    }))));

    dire('\nfenêtres natives :', s.fenetresNatives.length, '| erreurs :', s.erreurs.length);
    if (s.erreurs.length) dire(s.erreurs.slice(0, 5));
} finally {
    await s.fermer();
}
