// LA BOÎTE À JEUX, PAR LE CHEMIN DE CELUI QUI REÇOIT LE LIEN.
//
// On ne monte pas l'écran à la main : on fabrique une boîte, on lui demande son
// LIEN, et l'on ouvre ce lien dans un navigateur neuf — exactement ce que fera
// la personne à qui Rémy l'envoie. Une mesure qui n'emprunte pas le chemin de
// l'utilisateur ne mesure pas son problème.
//
//   node tools/boiteAJeux.mjs [LxH]

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

const [L, H] = (process.argv[2] || '390x844').split('x').map(Number);
const PORT = String(9900 + Math.floor(Math.random() * 80));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('site d\'essai muet')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);

let mal = 0;
const dit = (ok, quoi, detail = '') => {
    if (!ok) mal++;
    console.log(`  ${ok ? 'ok  ' : 'RATÉ'}  ${quoi}${detail ? '  — ' + detail : ''}`);
};

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await nav.newContext({
    viewport: { width: L, height: H },
    hasTouch: L <= 768, isMobile: L <= 768, deviceScaleFactor: 2
});
const p = await ctx.newPage();
const soucis = [];
p.on('pageerror', e => soucis.push(String(e).slice(0, 200)));
p.on('dialog', async (d) => { soucis.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });

await p.goto(`http://127.0.0.1:${PORT}/index.html`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

// 1. LE PROFESSEUR FABRIQUE SA BOÎTE ET RELÈVE LE LIEN.
const lien = await p.evaluate(async () => {
    const { faireUneBoite } = await import('./js/core/boite.js');
    const { Shortcodes } = await import('./js/core/shortcodes.js');
    const b = faireUneBoite({
        nom: 'Les jeux de la 6e B',
        exercices: ['calc-sudoku', 'calc-mathodu', 'calc-add']
    });
    return Shortcodes.shareUrl(b);
});
dit(!!lien && /[?&]code=/.test(lien), 'la boîte rend un lien', lien ? lien.slice(0, 60) + '…' : '');

// 2. QUELQU'UN OUVRE CE LIEN. Page neuve, aucun compte, aucun jeton.
const ctx2 = await nav.newContext({
    viewport: { width: L, height: H },
    hasTouch: L <= 768, isMobile: L <= 768, deviceScaleFactor: 2
});
const q = await ctx2.newPage();
const soucis2 = [];
q.on('pageerror', e => soucis2.push(String(e).slice(0, 200)));
q.on('dialog', async (d) => { soucis2.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
const adresse = lien.replace(/^https?:\/\/[^/]+/, `http://127.0.0.1:${PORT}`);
await q.goto(adresse);
await q.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await attendre(2500);

const vu = await q.evaluate(() => {
    const ecran = document.getElementById('boite-layer');
    const r = ecran ? ecran.getBoundingClientRect() : null;
    return {
        present: !!ecran && !ecran.hidden,
        haut: r ? Math.round(r.height) : 0,
        titre: (document.querySelector('.bj-titre') || {}).textContent || '',
        cartes: document.querySelectorAll('.bj-carte').length,
        onglet: document.title,
        pomme: (document.querySelector('meta[apple-mobile-web-app-title]')
            || document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content || '',
        manifeste: (document.querySelector('link[rel="manifest"]') || {}).href || '',
        // CE QUI NE DOIT PAS ÊTRE LÀ : les signes du devoir.
        navbar: !!document.querySelector('#top-navbar')
            && getComputedStyle(document.getElementById('top-navbar')).display !== 'none',
        portail: !!document.querySelector('.portail'),
        voile: document.documentElement.classList.contains('depuis-code')
            && !document.documentElement.classList.contains('parcours-pret'),
        reglages: [...document.querySelectorAll('.bj-carte')].map(c => ({
            exo: c.getAttribute('data-exo'),
            rangs: [...c.querySelectorAll('.bj-reglage-mot')].map(x => x.textContent.trim())
        }))
    };
});
dit(vu.present, 'le lien ouvre la boîte', `${vu.haut} px de haut`);
dit(vu.titre.trim() === 'Les jeux de la 6e B', 'et elle porte son nom', vu.titre.trim());
dit(vu.cartes === 3, 'une carte par jeu', String(vu.cartes));
dit(vu.onglet === 'Les jeux de la 6e B', 'le nom de l\'onglet est celui de la boîte', vu.onglet);
dit(vu.pomme === 'Les jeux de la 6e B', 'et celui de l\'installation sur iPhone', vu.pomme);
dit(vu.manifeste.startsWith('blob:'), 'un manifeste est posé pour l\'installation',
    vu.manifeste.slice(0, 40));
dit(!vu.navbar, 'pas de barre du haut : ce n\'est pas le logiciel, c\'est la boîte');
dit(!vu.portail, 'pas de portail derrière');
dit(!vu.voile, 'le voile du lien est bien levé');

// 3. LES RÉGLAGES DU JOUEUR : la longueur partout, la difficulté là où elle existe.
const parJeu = Object.fromEntries(vu.reglages.map(r => [r.exo, r.rangs]));
dit((parJeu['calc-add'] || []).length === 1
    && /partie/i.test((parJeu['calc-add'] || [])[0] || ''),
'un exercice sans difficulté n\'offre que la longueur',
JSON.stringify(parJeu['calc-add']));
dit((parJeu['calc-sudoku'] || []).length === 3,
    'le sudoku offre difficulté, taille et longueur', JSON.stringify(parJeu['calc-sudoku']));

// 4. UN RÉGLAGE CHOISI RESTE CHOISI.
await q.evaluate(() => {
    const carte = document.querySelector('.bj-carte[data-exo="calc-sudoku"]');
    const b = [...carte.querySelectorAll('.bj-choix')]
        .find(x => x.getAttribute('data-champ') === 'taille' && x.getAttribute('data-valeur') === '9');
    if (b) b.click();
});
await attendre(400);
const garde = await q.evaluate(() => {
    const carte = document.querySelector('.bj-carte[data-exo="calc-sudoku"]');
    const actif = carte.querySelector('.bj-choix[data-champ="taille"].bj-choix--actif');
    const clefs = Object.keys(localStorage).filter(k => k.startsWith('mathbox-boite-'));
    return {
        actif: actif ? actif.getAttribute('data-valeur') : '',
        clefs: clefs.length,
        contenu: clefs.length ? localStorage.getItem(clefs[0]) : ''
    };
});
dit(garde.actif === '9', 'le choix du joueur se voit', garde.actif);
dit(garde.clefs === 1, 'et il est rangé dans le navigateur, sous la boîte',
    garde.contenu.slice(0, 90));

// 5. ON JOUE, PUIS ON REVIENT.
await q.evaluate(() => {
    const carte = document.querySelector('.bj-carte[data-exo="calc-add"]');
    carte.querySelector('.bj-jouer').click();
});
await attendre(3500);
const enJeu = await q.evaluate(() => {
    const gl = document.getElementById('game-layer');
    const ecran = document.getElementById('boite-layer');
    return {
        jeuVisible: !!gl && gl.style.display !== 'none' && gl.getBoundingClientRect().height > 100,
        menuCache: !ecran || ecran.hidden,
        compteur: (document.getElementById('game-progress-text') || {}).textContent || ''
    };
});
dit(enJeu.jeuVisible, 'le jeu s\'ouvre par-dessus la boîte');
dit(enJeu.menuCache, 'et le menu s\'efface le temps de la partie');
// LA LONGUEUR « MOYENNE » DOIT DONNER LE COMPTE CONSEILLÉ DE L'EXERCICE.
dit(/\d+\s*\/\s*\d+/.test(enJeu.compteur), 'la partie a un compte annoncé', enJeu.compteur.trim());

await q.evaluate(() => {
    const b = document.getElementById('btn-close-game');
    if (b) b.click();
});
await attendre(1800);
const retour = await q.evaluate(() => {
    const ecran = document.getElementById('boite-layer');
    const clefs = Object.keys(localStorage).filter(k => k.startsWith('mathbox-boite-'));
    const m = clefs.length ? JSON.parse(localStorage.getItem(clefs[0])) : null;
    return {
        menu: !!ecran && !ecran.hidden,
        parties: m && m.jeux['calc-add'] ? m.jeux['calc-add'].parties : 0,
        mot: (document.querySelector('.bj-carte[data-exo="calc-add"] .bj-carte-mot') || {}).textContent || ''
    };
});
dit(retour.menu, 'quitter le jeu ramène au menu');
dit(retour.parties === 1, 'la partie est comptée dans la mémoire de la boîte',
    String(retour.parties));
dit(/partie/.test(retour.mot), 'et la carte le dit', retour.mot.trim());

// 6. RIEN N'EST ENTRÉ DANS LE CARNET DE PERSONNE.
const trace = await q.evaluate(() => {
    const clefs = Object.keys(localStorage);
    const journal = clefs.filter(k => /journal|events|mathbox-log/i.test(k));
    let evenements = 0;
    journal.forEach(k => {
        try {
            const v = JSON.parse(localStorage.getItem(k));
            if (Array.isArray(v)) evenements += v.length;
        } catch (e) { /* pas du JSON */ }
    });
    return { journal, evenements };
});
dit(trace.evenements === 0, 'une partie de boîte ne laisse rien au journal',
    `${trace.journal.length} clef(s), ${trace.evenements} événement(s)`);

console.log(`\nerreurs de page : ${soucis.length + soucis2.length}`);
[...soucis, ...soucis2].slice(0, 4).forEach(x => console.log('    ' + x));
console.log(mal ? `\n${mal} VÉRIFICATION(S) EN DÉFAUT` : '\nTOUT PASSE.');

await q.screenshot({ path: 'tools/tmp/boite-menu.png', fullPage: false });
console.log('capture : tools/tmp/boite-menu.png');
await nav.close();
srv.kill();
process.exit(mal || soucis.length + soucis2.length ? 1 : 0);
