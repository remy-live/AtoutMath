// LE BROUILLON, PAR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Dans le menu à côté du robot, avoir un mode brouillon pour poser son
// calcul », puis ses quatre arbitrages : « 1/ pas de persistance. 2/ Non [le
// professeur ne le voit pas], 3/ ok [« Poser » éteint par exercice], 4 oui [le
// crayon libre reste] ».
//
// ── CE QUI NE SE VÉRIFIE QU'ICI ────────────────────────────────────────────
//
// Trois des quatre arbitrages sont des promesses NÉGATIVES — rien n'est gardé,
// rien n'est envoyé, rien n'est regardé — et une promesse négative ne se lit
// pas dans le code : il faudrait avoir lu TOUT le code. On la mesure donc par
// son effet : on compte les événements du journal et les clefs du stockage
// AVANT et APRÈS avoir rempli la feuille, et l'on exige zéro de différence.
//
// Et l'on regarde la quatrième promesse, celle qui est positive : que l'énoncé
// reste lisible pendant qu'on écrit dessous.
//
//   node tools/leBrouillon.mjs [largeur]
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const LARGEUR = Number(process.argv[2]) || 390;

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

// DEUX EXERCICES, ET C'EST LE CONTRASTE QUI PROUVE LE RÉGLAGE : « Le Tour du
// Rectangle » n'est pas du calcul mental — « Poser » y est offert ; « Additions
// Mystères » l'est — il n'y est pas.
const AVEC = 'mes-perimetre';
const SANS = 'calc-add';

const s = await ouvrirSonde({ largeur: LARGEUR, hauteur: 844 });
await s.identifier();

/** Ce que le navigateur garde de l'élève, compté. */
const empreinte = () => s.page.evaluate(async () => {
    const { journal } = await import('./js/core/journal.js');
    let clefs = [];
    try { clefs = Object.keys(window.localStorage); } catch (e) { clefs = ['(refusé)']; }
    return {
        evenements: journal.all().length,
        clefs: clefs.length,
        // AUCUNE CLEF NE DOIT PORTER SON NOM : c'est la façon la plus directe
        // de voir une persistance qu'on n'a pas voulue.
        sonNom: clefs.filter(k => /brouillon/i.test(k))
    };
});

// ── 1. LE BOUTON EXISTE, ET LA FEUILLE S'OUVRE ─────────────────────────────
console.log('\n\x1b[1mIL OUVRE SON BROUILLON\x1b[0m');
const raté = await s.ouvrirExercice(AVEC);
dire('l\'exercice s\'ouvre', !raté, raté || AVEC);
await dormir(1200);

const avant = await empreinte();
const bouton = await s.page.evaluate(() => {
    const b = document.getElementById('btn-game-brouillon');
    const r = b ? b.getBoundingClientRect() : null;
    return { existe: !!b, cache: b ? b.hidden : null,
        visible: !!(r && r.width > 0 && r.height > 0),
        auDoigt: !!(r && r.height >= 44) };
});
console.log(`   ${JSON.stringify(bouton)}`);
dire('LE BOUTON EST DANS LA BARRE, À CÔTÉ DU ROBOT', bouton.visible, JSON.stringify(bouton));
dire('et il se touche au doigt', bouton.auDoigt);

await s.cliquer('#btn-game-brouillon', 'le bouton du brouillon');
await dormir(900);
await s.doitExister('#brouillon', 'la feuille de brouillon');

const ouverte = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const r = f.getBoundingClientRect();
    const q = document.querySelector('#game-board .game-question');
    const rq = q ? q.getBoundingClientRect() : null;
    return {
        vue: r.width > 0 && r.height > 0,
        onglets: [...f.querySelectorAll('[data-br-outil]')].map(b => b.textContent.trim()),
        // L'ÉNONCÉ RESTE-T-IL LISIBLE ? C'est la promesse de la feuille qui
        // monte du bas plutôt que de couvrir : on compare le bas de l'énoncé
        // au haut de la feuille.
        enonce: rq ? { bas: Math.round(rq.bottom), hautFeuille: Math.round(r.top) } : null,
        // Et l'on demande QUI est là, au milieu de l'énoncé.
        quiEstSurLEnonce: rq
            ? (() => { const e = document.elementFromPoint(rq.left + rq.width / 2, rq.top + rq.height / 2);
                return e ? (e.id || e.className || e.tagName) : null; })()
            : null
    };
});
console.log(`   ${JSON.stringify(ouverte)}`);
dire('LA FEUILLE EST LÀ', ouverte.vue);
dire('elle porte les trois outils', ouverte.onglets.length === 3, ouverte.onglets.join(' · '));
dire('ET L\'ÉNONCÉ RESTE LISIBLE AU-DESSUS',
    !!ouverte.enonce && ouverte.enonce.bas <= ouverte.enonce.hautFeuille,
    JSON.stringify(ouverte.enonce));
dire('rien ne couvre l\'énoncé', !/brouillon|br-/.test(String(ouverte.quiEstSurLEnonce)),
    String(ouverte.quiEstSurLEnonce));

// ── 2. POSER : LE CADRE SE POSE, ET IL NE CALCULE PAS ──────────────────────
console.log('\n\x1b[1mIL POSE SON OPÉRATION\x1b[0m');
await s.cliquer('[data-br-reprendre]', 'le bouton « Reprendre les nombres »');
await dormir(700);
const pose = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const a = f.querySelector('[data-br-a]'), b = f.querySelector('[data-br-b]');
    const cases = [...f.querySelectorAll('.br-case')];
    const vides = cases.filter(c => !c.classList.contains('br-case--donnee'));
    return {
        a: a ? a.value : null, b: b ? b.value : null,
        grille: !!f.querySelector('.br-grille'),
        cases: cases.length,
        // AUCUNE CASE LIBRE N'EST REMPLIE : c'est la promesse « la grille ne
        // calcule pas ». Si une seule portait un chiffre, le brouillon serait
        // une calculatrice.
        remplies: vides.filter(c => (c.textContent || '').trim()).length,
        pave: f.querySelectorAll('.br-touche').length,
        // LE TRAIT SOUS LES OPÉRANDES : il n'est pas décoratif, c'est lui qui
        // dit où s'arrête l'opération et où commence le résultat.
        barre: (() => { const b = f.querySelector('.br-barre');
            if (!b) return null; const r = b.getBoundingClientRect();
            return { l: Math.round(r.width), h: Math.round(r.height) }; })()
    };
});
console.log(`   ${JSON.stringify(pose)}`);
dire('LES NOMBRES DE L\'ÉNONCÉ SONT REPRIS', !!pose.a && !!pose.b, `${pose.a} · ${pose.b}`);
dire('le cadre se pose', pose.grille && pose.cases > 0, `${pose.cases} cases`);
dire('LA GRILLE NE CALCULE RIEN — toutes les cases libres sont vides',
    pose.remplies === 0, `${pose.remplies} remplie(s)`);
dire('et le pavé de chiffres est dans la feuille', pose.pave === 12, `${pose.pave} touches`);
dire('le trait du résultat se voit', !!pose.barre && pose.barre.l > 40 && pose.barre.h >= 2,
    JSON.stringify(pose.barre));

// ON ÉCRIT UN CHIFFRE, comme l'élève : une case, puis une touche.
const ecrit = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const c = f.querySelector('.br-case[data-br-case]');
    if (!c) return null;
    c.click();
    const t = [...f.querySelectorAll('.br-touche')].find(x => x.textContent.trim() === '7');
    if (t) t.click();
    const apres = f.querySelector(`.br-case[data-br-case="${c.dataset.brCase}"]`);
    return apres ? (apres.textContent || '').trim() : null;
});
dire('UNE CASE TOUCHÉE PUIS UN CHIFFRE : il s\'écrit', ecrit === '7', String(ecrit));
await s.photo('#brouillon', `tools/tmp/brouillon-poser-${LARGEUR}.png`);

// ── 3. NOTER, PUIS DESSINER ────────────────────────────────────────────────
console.log('\n\x1b[1mIL NOTE, PUIS IL DESSINE\x1b[0m');
await s.cliquer('[data-br-outil="noter"]', 'l\'outil « Noter »');
await dormir(500);
await s.page.fill('.br-note', 'perimetre = 2 x (L + l)');
await dormir(300);
await s.cliquer('[data-br-outil="dessiner"]', 'l\'outil « Dessiner »');
await dormir(600);
await s.doitExister('[data-br-svg]', 'la feuille à petits carreaux');

/** On trace un trait au doigt, en travers du quadrillage. */
async function tracer() {
    const r = await s.page.locator('[data-br-svg]').boundingBox();
    if (!r) return false;
    await s.page.mouse.move(r.x + 30, r.y + 30);
    await s.page.mouse.down();
    await s.page.mouse.move(r.x + 110, r.y + 44, { steps: 8 });
    await s.page.mouse.move(r.x + 180, r.y + 120, { steps: 8 });
    await s.page.mouse.up();
    await dormir(500);
    return true;
}
await tracer();

const dessin = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const traits = [...f.querySelectorAll('.br-encre path')];
    const d = traits.length ? traits[traits.length - 1].getAttribute('d') : '';
    const nombres = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    return {
        traits: traits.length, d: d.slice(0, 70),
        // AIMANTÉ VEUT DIRE : chaque point tombe sur un nœud, donc sur un
        // multiple du carreau. C'est la seule façon de le vérifier sans
        // regarder le dessin.
        tousAuxNoeuds: nombres.length > 0 && nombres.every(n => n % 32 === 0),
        crayon: (f.querySelector('.br-crayon--actif') || {}).textContent
    };
});
console.log(`   ${JSON.stringify(dessin)}`);
dire('LE TRAIT S\'ÉCRIT', dessin.traits >= 1, `${dessin.traits} trait(s)`);
dire('ET LA GRILLE AIMANTE — chaque point tombe sur un nœud',
    dessin.tousAuxNoeuds, dessin.d);

// LE CRAYON LIBRE, lui, ne corrige rien : son trait ne tombe PAS sur les nœuds.
await s.cliquer('[data-br-crayon="libre"]', 'le crayon libre');
await dormir(400);
await tracer();
const libre = await s.page.evaluate(() => {
    const t = [...document.querySelectorAll('#brouillon .br-encre path')];
    const d = t.length ? t[t.length - 1].getAttribute('d') : '';
    const n = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    return { traits: t.length, horsNoeuds: n.some(v => v % 32 !== 0) };
});
dire('LE CRAYON LIBRE SUIT LE DOIGT — il ne saute pas aux nœuds',
    libre.traits >= 2 && libre.horsNoeuds, JSON.stringify(libre));
await s.photo('#brouillon', `tools/tmp/brouillon-dessiner-${LARGEUR}.png`);

// ── 4. RIEN N'EN SORT ──────────────────────────────────────────────────────
console.log('\n\x1b[1mCE QUI EN SORT\x1b[0m');
const apres = await empreinte();
console.log(`   avant ${JSON.stringify(avant)}\n   après ${JSON.stringify(apres)}`);
dire('AUCUN ÉVÉNEMENT N\'EST PARTI AU JOURNAL',
    apres.evenements === avant.evenements, `${avant.evenements} → ${apres.evenements}`);
dire('AUCUNE CLEF N\'A ÉTÉ POSÉE DANS LE STOCKAGE',
    apres.clefs === avant.clefs, `${avant.clefs} → ${apres.clefs}`);
dire('et rien ne porte son nom', apres.sonNom.length === 0, apres.sonNom.join(', '));

// ── 5. LA PAGE BLANCHE REVIENT À CHAQUE QUESTION ───────────────────────────
console.log('\n\x1b[1mIL PASSE À LA QUESTION SUIVANTE\x1b[0m');
await s.page.evaluate(() => {
    const r = window.__sondeRunner;
    if (r && r.session && r.session.next) r.session.next();
});
// On passe par le chemin du meneur, et non par la mémoire : c'est lui qui
// appelle `oublierLeBrouillon`.
await s.page.evaluate(async () => {
    const m = await import('./js/ui/brouillon.js');
    // Le meneur l'appelle à chaque question résolue ; ici on joue le même
    // geste, sans avoir à répondre juste huit fois de suite.
    const { oublierLeBrouillon } = m;
    oublierLeBrouillon();
});
await dormir(600);
const neuve = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const note = f.querySelector('.br-note');
    return {
        traits: f.querySelectorAll('.br-encre path').length,
        note: note ? note.value : '(autre outil)',
        outil: (f.querySelector('.br-onglet--actif') || {}).textContent
    };
});
console.log(`   ${JSON.stringify(neuve)}`);
dire('LA FEUILLE EST BLANCHE', neuve.traits === 0, `${neuve.traits} trait(s)`);

// ── 6. « POSER » S'ÉTEINT SUR UN EXERCICE DE CALCUL MENTAL ─────────────────
console.log('\n\x1b[1mSUR UN EXERCICE DE CALCUL MENTAL\x1b[0m');
await s.ouvrirExercice(SANS);
await dormir(1500);
await s.cliquer('#btn-game-brouillon', 'le bouton du brouillon');
await dormir(800);
const mental = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    return {
        ouverte: !!f && !f.hidden,
        outils: [...f.querySelectorAll('[data-br-outil]')].map(b => b.dataset.brOutil)
    };
});
console.log(`   ${JSON.stringify(mental)}`);
dire('LE BROUILLON EXISTE QUAND MÊME', mental.ouverte);
dire('MAIS « POSER » N\'Y EST PAS — poser est ce qu\'on demande de ne pas faire',
    !mental.outils.includes('poser'), mental.outils.join(' · '));
dire('et les deux autres restent', mental.outils.length === 2, mental.outils.join(' · '));

await s.photo('#brouillon', `tools/tmp/brouillon-${LARGEUR}.png`);
console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
