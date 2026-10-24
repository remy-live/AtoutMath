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
        cartes: document.querySelectorAll('.bj-jeu').length,
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
        // LA TUILE NE MONTRE PLUS DE BOUTONS : elle résume les réglages en une
        // ligne de texte, et la roue ouvre le reste. C'est la correction
        // demandée par Rémy — « ça fait vieillot, lourd ».
        boutonsSurLaGrille: document.querySelectorAll('.bj-grille .bj-choix').length,
        roues: document.querySelectorAll('.bj-roue').length,
        tuiles: [...document.querySelectorAll('.bj-jeu')].map(c => ({
            exo: c.getAttribute('data-exo'),
            dom: c.getAttribute('data-dom'),
            resume: (c.querySelector('.bj-jeu-reglages') || {}).textContent || ''
        }))
    };
});
dit(vu.present, 'le lien ouvre la boîte', `${vu.haut} px de haut`);
dit(vu.titre.trim() === 'Les jeux de la 6e B', 'et elle porte son nom', vu.titre.trim());
dit(vu.cartes === 3, 'une tuile par jeu', String(vu.cartes));
dit(vu.boutonsSurLaGrille === 0,
    'AUCUN bouton de réglage sur la grille : ils sont derrière la roue',
    String(vu.boutonsSurLaGrille));
dit(vu.roues === 3, 'une roue par tuile', String(vu.roues));
dit(vu.onglet === 'Les jeux de la 6e B', 'le nom de l\'onglet est celui de la boîte', vu.onglet);
dit(vu.pomme === 'Les jeux de la 6e B', 'et celui de l\'installation sur iPhone', vu.pomme);
dit(vu.manifeste.startsWith('blob:'), 'un manifeste est posé pour l\'installation',
    vu.manifeste.slice(0, 40));
dit(!vu.navbar, 'pas de barre du haut : ce n\'est pas le logiciel, c\'est la boîte');
dit(!vu.portail, 'pas de portail derrière');
dit(!vu.voile, 'le voile du lien est bien levé');

// 3. CE QUE LA TUILE RÉSUME, ET LA COULEUR DE SA FAMILLE.
const parJeu = Object.fromEntries(vu.tuiles.map(r => [r.exo, r]));
dit(/Moyenne/.test((parJeu['calc-add'] || {}).resume || ''),
    'un exercice sans difficulté résume sa seule longueur',
    (parJeu['calc-add'] || {}).resume);
dit(/Facile.+6 × 6.+Moyenne/.test((parJeu['calc-sudoku'] || {}).resume || ''),
    'le sudoku résume difficulté, taille et longueur en une ligne',
    (parJeu['calc-sudoku'] || {}).resume);
// LA COULEUR VIENT DU SOUS-DOMAINE, pas du domaine : le sudoku est de la
// famille « logique », pas de celle du calcul, alors que son domaine est
// « Nombres et calculs ». C'est tout l'intérêt — une boîte de 51 exercices de
// nombres serait autrement d'une seule couleur.
dit((parJeu['calc-sudoku'] || {}).dom === 'logique',
    'la tuile porte la couleur de sa famille', (parJeu['calc-sudoku'] || {}).dom);
dit(new Set(vu.tuiles.map(t => t.dom)).size >= 2,
    'et deux jeux de familles différentes ne portent pas la même',
    JSON.stringify(vu.tuiles.map(t => t.exo + ':' + t.dom)));

// 4. LA ROUE OUVRE LES RÉGLAGES, ET UN CHOIX RESTE CHOISI.
await q.evaluate(() => {
    document.querySelector('.bj-jeu[data-exo="calc-sudoku"] .bj-roue').click();
});
await attendre(500);
const feuille = await q.evaluate(() => {
    const f = document.querySelector('.bj-feuille');
    return {
        ouverte: !!f,
        titre: f ? (f.querySelector('.bj-feuille-titre') || {}).textContent || '' : '',
        rangs: f ? [...f.querySelectorAll('.bj-reglage-mot')].map(x => x.textContent.trim()) : [],
        // LA TUILE NE DOIT PAS LANCER LA PARTIE quand on vise la roue.
        enJeu: (() => { const g = document.getElementById('game-layer');
            return !!g && g.style.display && g.style.display !== 'none'; })()
    };
});
dit(feuille.ouverte, 'la roue ouvre la feuille des réglages');
dit(!feuille.enJeu, 'et elle ne lance PAS la partie au passage');
dit(feuille.titre.trim() === 'Sudoku', 'la feuille dit de quel jeu il s\'agit', feuille.titre.trim());
dit(feuille.rangs.length === 3, 'le sudoku y offre difficulté, taille et longueur',
    JSON.stringify(feuille.rangs));

await q.evaluate(() => {
    const b = [...document.querySelectorAll('.bj-feuille .bj-choix')]
        .find(x => x.getAttribute('data-champ') === 'taille' && x.getAttribute('data-valeur') === '9');
    if (b) b.click();
});
await attendre(500);
const garde = await q.evaluate(() => {
    const f = document.querySelector('.bj-feuille');
    const actif = f && f.querySelector('.bj-choix[data-champ="taille"].bj-choix--actif');
    const tuile = document.querySelector('.bj-jeu[data-exo="calc-sudoku"] .bj-jeu-reglages');
    const clefs = Object.keys(localStorage).filter(k => k.startsWith('mathbox-boite-'));
    return {
        feuilleEncoreLa: !!f,
        actif: actif ? actif.getAttribute('data-valeur') : '',
        resume: tuile ? tuile.textContent : '',
        clefs: clefs.length,
        contenu: clefs.length ? localStorage.getItem(clefs[0]) : ''
    };
});
dit(garde.actif === '9', 'le choix du joueur se voit', garde.actif);
dit(garde.feuilleEncoreLa,
    'CHOISIR NE REFERME PAS LA FEUILLE : on règle plusieurs choses d\'affilée');
dit(/9 × 9/.test(garde.resume), 'et la tuile derrière suit', garde.resume);
dit(garde.clefs === 1, 'rangé dans le navigateur, sous la boîte',
    garde.contenu.slice(0, 80));

// ÉCHAP REFERME.
await q.keyboard.press('Escape');
await attendre(400);
dit(await q.evaluate(() => !document.querySelector('.bj-feuille')),
    'Échap referme la feuille');

// 5. ON JOUE, PUIS ON REVIENT.
await q.evaluate(() => {
    // LA TUILE ENTIÈRE EST LE BOUTON : on clique le corps, pas un rectangle
    // au fond d'une carte.
    document.querySelector('.bj-jeu[data-exo="calc-add"] .bj-jeu-ouvrir').click();
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
        mot: (document.querySelector('.bj-jeu[data-exo="calc-add"] .bj-jeu-score') || {}).textContent || ''
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
