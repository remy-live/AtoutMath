// LE DÉFI EN MANCHES, REJOUÉ, ET CORRIGÉ AU TABLEAU.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/defiEnManches.mjs
//
// RÉMY, après l'avoir lancé en classe : « Le défi ca cartonne, des idées dans
// ce style ».
//
// TROIS CHOSES, ET ELLES TIENNENT TOUTES À L'HORLOGE DU SERVEUR :
//
//   · LES MANCHES — trois reprises de quarante secondes, deux entractes de
//     vingt. Ce qu'on garde ici n'est pas qu'un décompte s'affiche : c'est que
//     DEUX ARDOISES SOIENT DANS LA MÊME MANCHE AU MÊME INSTANT. Un compteur
//     tenu dans le navigateur dériverait au premier onglet mis en arrière-plan,
//     et c'est le défaut qu'on a déjà corrigé deux fois sur cet écran.
//   · REJOUER — la même série, à la question près. Une série neuve ne se
//     comparerait à rien, et c'est tout l'intérêt de rejouer.
//   · AU TABLEAU — les VRAIES questions du défi, celles que les trente
//     viennent d'avoir, avec la réponse cachée jusqu'à ce qu'on la demande.
//
// ── CE QUE `npm test` NE PEUT PAS DIRE ────────────────────────────────────
//
// Une épreuve de noyau garde le CALCUL de la manche (`defiEnCours`), et elle
// le fait. Elle ne peut pas dire que l'entracte cache bien les questions, que
// le score survit à la pause, ni que deux élèves lisent la même manche — il
// faut deux navigateurs et une horloge qui tourne.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1340, hauteur: 980 });
await s.identifier();
const URL = `http://127.0.0.1:${s.port}/index.html`;

const classe = await s.page.evaluate(async () => {
    const { creerClasse, apercuDeListe, importerListe } =
        await import('./js/core/espaceProf.js');
    const c = await creerClasse('6e Manches', '6e');
    if (c.erreur) return { erreur: c.erreur };
    const ap = await apercuDeListe(c.id, 'Alpha Ana;ana.a;1111\nBeta Bob;bob.b;2222\n', '');
    if (ap.erreur) return { erreur: ap.erreur };
    await importerListe(c.id, ap.apercu.texte);
    return { id: c.id };
});
if (classe.erreur) throw new Error(classe.erreur);

// Deux ardoises.
const pages = [];
for (const [login, code] of [['ana.a', '1111'], ['bob.b', '2222']]) {
    const ctx = await s.nav.newContext({ viewport: { width: 900, height: 820 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log(`  ! ${login} : ${String(e).slice(0, 160)}`));
    await p.goto(URL);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
    await dormir(400);
    await p.fill('#portail-login', login);
    await p.fill('#portail-code-eleve', code);
    await p.click('#portail-connecter');
    await dormir(2500);
    pages.push({ login, p, ctx });
}

console.log('\nLES MANCHES');
console.log('─'.repeat(64));

// TROIS MANCHES DE DOUZE SECONDES : assez pour répondre, assez court pour une
// sonde. Ce qu'on mesure est le DÉCOUPAGE, pas la durée.
await s.page.evaluate(async (cid) => {
    const { lancerLeDefi } = await import('./js/core/espaceProf.js');
    await lancerLeDefi(cid, 'calc-add', 12, 'qcm', { manches: 3 });
}, classe.id);
for (const { p } of pages) {
    await p.evaluate(async () => {
        const { rafraichirSeance } = await import('./js/core/sync.js');
        await rafraichirSeance();
    });
}

/** Ce que l'ardoise montre : la manche, l'entracte, et le score. */
const vu = (p) => p.evaluate(async () => {
    const { defiEnCours } = await import('./js/core/seanceDistante.js');
    const d = defiEnCours();
    const voile = document.querySelector('.defi-voile--jeu');
    const entracte = document.querySelector('[data-entracte]');
    return {
        manche: d ? d.manche : null,
        manches: d ? d.manches : null,
        enPause: d ? d.enPause : null,
        jeu: !!voile,
        // L'ENTRACTE CACHE LES QUESTIONS : c'est ce qu'on vient vérifier.
        //
        // ET ON MESURE LE RECTANGLE, PAS LA PROPRIÉTÉ `hidden`. La règle
        // `[hidden] { display: none }` du navigateur a une spécificité de
        // zéro : toute classe qui pose un `display` l'emporte. Lire `.hidden`
        // aurait dit « caché » sur des réponses parfaitement cliquables —
        // c'est exactement ce qui s'est produit sur l'écran du professeur, et
        // la photo l'a dit avant la sonde.
        entracte: !!(entracte && entracte.getBoundingClientRect().height > 0),
        questionVisible: (() => {
            const q = voile && voile.querySelector('[data-question]');
            const r = voile && voile.querySelector('[data-reponses]');
            return !!((q && q.getBoundingClientRect().height > 0)
                || (r && r.getBoundingClientRect().height > 0));
        })(),
        bandeau: voile ? ((voile.querySelector('[data-manche]') || {}).textContent || '').trim() : '',
        score: voile ? ((voile.querySelector('[data-bonnes]') || {}).textContent || '') : ''
    };
});

/** Répond une fois, au hasard — on ne mesure pas la justesse ici. */
const repondre = (p) => p.evaluate(() => {
    const b = document.querySelector('.defi-voile--jeu .defi-choix');
    if (b) { b.click(); return true; }
    return false;
});

await dormir(13000);   // les douze secondes d'annonce
let vuEntracte = false;
let manchesVues = new Set();
let desaccord = 0;
let scoreAvantPause = null;
let scoreApresPause = null;

for (let t = 0; t < 26; t++) {
    const [a, b] = [await vu(pages[0].p), await vu(pages[1].p)];
    if (a.manche && b.manche) {
        manchesVues.add(a.manche);
        // DEUX ARDOISES, LA MÊME MANCHE. C'est le cœur de la mesure.
        if (a.manche !== b.manche) desaccord++;
    }
    if (a.entracte) {
        if (!vuEntracte) scoreAvantPause = a.score;
        vuEntracte = true;
        // ET LES QUESTIONS SONT CACHÉES PENDANT L'ENTRACTE.
        if (a.questionVisible) desaccord += 100;
    } else if (vuEntracte && scoreApresPause === null && a.jeu) {
        scoreApresPause = a.score;
    }
    if (a.jeu && !a.entracte) { await repondre(pages[0].p); await repondre(pages[1].p); }
    if (!a.jeu && t > 6) break;
    await dormir(2000);
}

dire('LE DÉFI SE JOUE EN TROIS MANCHES', manchesVues.size >= 2,
    `manches vues : ${JSON.stringify([...manchesVues])}`);
dire('LES DEUX ARDOISES SONT TOUJOURS DANS LA MÊME MANCHE', desaccord === 0,
    desaccord ? `${desaccord} désaccord(s)` : 'jamais un écart');
dire('L\'ENTRACTE PARAÎT, ET IL CACHE LES QUESTIONS', vuEntracte,
    vuEntracte ? 'décompte vu, énoncé masqué' : 'aucun entracte');
// LE SCORE SURVIT À LA PAUSE : un entracte qui remettrait à zéro ferait de
// trois manches trois défis, et le classement ne vaudrait plus rien.
dire('ET LE SCORE SURVIT À L\'ENTRACTE',
    scoreAvantPause !== null && scoreApresPause !== null
        && Number(scoreApresPause) >= Number(scoreAvantPause),
    `${scoreAvantPause} → ${scoreApresPause}`);

// ── REJOUER : LA MÊME SÉRIE ───────────────────────────────────────────────
console.log('\nREJOUER LA MÊME SÉRIE');
console.log('─'.repeat(64));
const serie = (p) => p.evaluate(async () => {
    const { defiEnCours } = await import('./js/core/seanceDistante.js');
    const d = defiEnCours();
    if (!d) return null;
    const { questionDuDefi } = await import('./js/ui/defiUI.js');
    const { getExerciseById } = await import('./js/data/catalog.js');
    const exo = getExerciseById(d.exo);
    return [0, 1, 2].map(n => {
        const it = questionDuDefi(exo, d.graine, n);
        return it ? String(it.answer) : '?';
    }).join(' · ');
});

await s.page.evaluate(async (cid) => {
    const { lancerLeDefi } = await import('./js/core/espaceProf.js');
    await lancerLeDefi(cid, 'calc-add', 12, 'qcm', { manches: 1 });
}, classe.id);
await pages[0].p.evaluate(async () => {
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
});
const avant = await serie(pages[0].p);

await s.page.evaluate(async (cid) => {
    const { lancerLeDefi } = await import('./js/core/espaceProf.js');
    await lancerLeDefi(cid, 'calc-add', 12, 'qcm', { manches: 1, memeGraine: true });
}, classe.id);
await pages[0].p.evaluate(async () => {
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
});
const apres = await serie(pages[0].p);
dire('REJOUER REDONNE EXACTEMENT LES MÊMES QUESTIONS', !!avant && avant === apres,
    `${avant}  →  ${apres}`);

// ET UN LANCEMENT ORDINAIRE EN DONNE D'AUTRES : sans quoi « rejouer » ne
// voudrait rien dire, puisque tout se rejouerait toujours.
await s.page.evaluate(async (cid) => {
    const { lancerLeDefi } = await import('./js/core/espaceProf.js');
    await lancerLeDefi(cid, 'calc-add', 12, 'qcm', { manches: 1 });
}, classe.id);
await pages[0].p.evaluate(async () => {
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
});
const neuf = await serie(pages[0].p);
dire('et un lancement ordinaire en donne d\'autres', !!neuf && neuf !== apres,
    `${apres}  →  ${neuf}`);

// ── LES QUESTIONS AU TABLEAU ──────────────────────────────────────────────
//
// On y va par le chemin de Rémy : l'espace des classes, l'onglet du direct, la
// commande du défi, le bouton. Pas d'appel interne — un bouton qui n'existe
// qu'en théorie ne corrige rien devant une classe.
console.log('\nLES QUESTIONS AU TABLEAU');
console.log('─'.repeat(64));
await s.page.evaluate(async () => {
    const m = await import('./js/ui/espaceClasses.js');
    await m.ouvrirEspaceClasses();
});
await dormir(2200);
await s.cliquer(`[data-ouvrir="${classe.id}"]`, 'la carte de la classe');
await dormir(2400);
await s.cliquer('[data-onglet="direct"]', 'l\'onglet « Le direct »');
await dormir(2400);
await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('.ec-pilote-onglet')]
        .find(x => /Défi/.test(x.textContent || ''));
    if (b) b.click();
});
await dormir(1600);
await s.doitExister('[data-defi-tableau]', 'le bouton « Au tableau »');
await s.cliquer('[data-defi-tableau]', 'le bouton « Au tableau »');
await s.page.waitForSelector('.ec-tableau-enonce', { timeout: 15000 });
await dormir(500);

const tableau = () => s.page.evaluate(() => {
    const t = document.querySelector('.ec-tableau');
    if (!t) return null;
    const rep = t.querySelector('.ec-tableau-reponse');
    const enonce = t.querySelector('.ec-tableau-enonce');
    const r = enonce ? enonce.getBoundingClientRect() : { height: 0 };
    return {
        rang: (t.querySelector('[data-rang]') || {}).textContent || '',
        enonce: (enonce ? enonce.textContent : '').replace(/\s+/g, ' ').trim(),
        hauteurEnonce: Math.round(r.height),
        taille: enonce ? Math.round(parseFloat(getComputedStyle(enonce).fontSize)) : 0,
        // ── ON MESURE CE QUI EST PEINT, PAS LA PROPRIÉTÉ ──────────────
        //
        // Première écriture : `!rep.hidden`. Elle disait « cachée » alors que
        // la réponse s'étalait sous la question — VU SUR LA PHOTO, « Voir la
        // réponse » sous un 13 déjà écrit. La règle `[hidden] { display: none }`
        // du navigateur a une spécificité de ZÉRO : le `display: flex` de la
        // classe l'emportait. La propriété était vraie, le pixel disait non.
        // On demande donc son rectangle à l'élément.
        reponseMontree: !!(rep && rep.getBoundingClientRect().height > 0),
        reponse: (rep ? rep.textContent : '').replace(/\s+/g, ' ').trim(),
        bouton: (t.querySelector('[data-tab-voir]') || {}).textContent || ''
    };
});

const q1 = await tableau();
dire('LA PREMIÈRE QUESTION EST À L\'ÉCRAN, EN GRAND',
    !!q1 && q1.enonce.length > 0 && q1.taille >= 24,
    `« ${q1.enonce} » · ${q1.taille} px`);
// LA RÉPONSE EST CACHÉE : affichée d'emblée, il n'y aurait plus rien à
// demander à la classe.
dire('ET LA RÉPONSE EST CACHÉE', !q1.reponseMontree, `bouton « ${q1.bouton.trim()} »`);

await s.cliquer('[data-tab-voir]', 'le bouton « Voir la réponse »');
await dormir(400);
const q1bis = await tableau();
dire('ON LA RETOURNE COMME UNE CARTE', q1bis.reponseMontree && /\d/.test(q1bis.reponse),
    `« ${q1bis.reponse} »`);

await s.cliquer('[data-tab-suiv]', 'le bouton « Suivante »');
await dormir(400);
const q2 = await tableau();
dire('LA SUIVANTE EST UNE AUTRE QUESTION', q2.enonce !== q1.enonce,
    `« ${q1.enonce} » → « ${q2.enonce} »`);
// ET ELLE REPART CACHÉE : garder la réponse visible d'une question à l'autre
// la dévoilerait avant qu'on l'ait posée.
dire('ET SA RÉPONSE REPART CACHÉE', !q2.reponseMontree, q2.rang);

// LES FLÈCHES DU CLAVIER : au tableau, il n'a pas la souris en main.
await s.page.keyboard.press('ArrowRight');
await dormir(400);
const q3 = await tableau();
dire('LES FLÈCHES DU CLAVIER TOURNENT LES PAGES', q3.enonce !== q2.enonce,
    `${q2.rang} → ${q3.rang}`);
await s.photo('.ec-tableau', 'tools/tmp/defi-au-tableau.png', 10).catch(() => {});

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

for (const { ctx } of pages) await ctx.close();
await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
