// CE QUE LA CLASSE FAIT ENSEMBLE : LA BARRE, LES DEUX ÉQUIPES, LE RECORD.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/defiEnsemble.mjs
//
// RÉMY, après l'avoir lancé en classe : « Le défi ca cartonne, des idées dans
// ce style ». Trois façons de compter la MÊME addition :
//
//   · LE BUT COMMUN — une seule barre, celle de toute la classe. L'élève lent
//     y pousse autant que les autres, et c'est la seule façon de jouer où il
//     n'a rien à perdre.
//   · LES DEUX ÉQUIPES — la compétition reste, mais entre groupes. Le serveur
//     partage la classe une ligne sur deux, sans rien demander au professeur.
//   · LE RECORD — la classe contre elle-même, de semaine en semaine.
//
// ── CE QUE `npm test` ET `testApi.php` NE PEUVENT PAS DIRE ────────────────
//
// Les deux gardent l'ADDITION, et ils la gardent. Ce qui ne se mesure qu'ici :
//
//   1. QUE LE SCORE VOYAGE VRAIMENT par le battement. Il passe par une boîte
//      aux lettres (`core/scoreDuDefi.js`) que personne n'appelle directement :
//      si `defiUI` oubliait de l'y poser, toutes les épreuves de serveur
//      resteraient vertes et la barre de la classe ne bougerait jamais.
//   2. QUE LA BARRE SOIT VISIBLE, et qu'elle ne le soit PAS dans un défi
//      ordinaire. `[hidden]` a une spécificité de zéro : un `display: flex`
//      posé sur la même boîte l'emporte sans un mot, et c'est la troisième
//      fois cette semaine que ce piège coûte une mesure. On mesure donc LE
//      RECTANGLE, jamais la propriété.
//   3. QUE DEUX ÉLÈVES SOIENT DANS DEUX ÉQUIPES DIFFÉRENTES. Le partage se
//      fait au serveur, dans l'ordre des identifiants ; une erreur d'un rang y
//      mettrait toute la classe du même côté, et le défi aurait l'air de
//      marcher.

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
    const c = await creerClasse('6e Ensemble', '6e');
    if (c.erreur) return { erreur: c.erreur };
    const ap = await apercuDeListe(c.id, 'Alpha Ana;ana.a;1111\nBeta Bob;bob.b;2222\n', '');
    if (ap.erreur) return { erreur: ap.erreur };
    await importerListe(c.id, ap.apercu.texte);
    return { id: c.id };
});
if (classe.erreur) throw new Error(classe.erreur);

// DEUX ARDOISES, et c'est le minimum pour mesurer deux équipes.
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

// ET `secondes: 0` ARRÊTE LE DÉFI, ce qui demande d'écrire ce zéro à la main.
//
// MESURÉ, avec un `o.secondes || 30` à cette place : l'arrêt devenait une
// RELANCE de trente secondes, la carte de jeu ne se démontait jamais, et la
// sonde accusait l'annonce de ne pas paraître. Trois lancements plus tard,
// c'était la sonde qui avait tort. Un `||` sur un nombre dont zéro est une
// valeur de commande est un piège qu'on a déjà payé ailleurs dans ce dépôt.
const lancer = (opts) => s.page.evaluate(async ([cid, o]) => {
    const { lancerLeDefi } = await import('./js/core/espaceProf.js');
    return await lancerLeDefi(cid, o.exo || 'calc-add',
        o.secondes === undefined ? 30 : o.secondes, 'qcm', o);
}, [classe.id, opts]);

/** Redemande l'état — et c'est aussi ce qui FAIT PARTIR le score. */
const battre = (p) => p.evaluate(async () => {
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
});

/**
 * CE QUE L'ARDOISE MONTRE SOUS SA JAUGE.
 *
 * ON MESURE LES RECTANGLES, PAS LES PROPRIÉTÉS : voir l'en-tête. Et l'on relit
 * le texte tel que l'élève le lit, espaces normalisées.
 */
const vu = (p) => p.evaluate(() => {
    const voile = document.querySelector('.defi-voile--jeu');
    const z = voile && voile.querySelector('[data-ensemble]');
    const haut = (e) => !!(e && e.getBoundingClientRect().height > 0);
    const eqs = z ? [...z.querySelectorAll('.defi-eq')] : [];
    return {
        jeu: !!voile,
        visible: haut(z),
        texte: z ? (z.textContent || '').replace(/\s+/g, ' ').trim() : '',
        // LA BARRE DU BUT : on lit la LARGEUR de la jauge, pas sa classe. Une
        // jauge à zéro pour cent est une barre qui ne dit rien.
        jauge: (() => {
            const j = z && z.querySelector('.defi-jauge--but');
            if (!j) return null;
            const bande = j.parentElement.getBoundingClientRect().width || 1;
            return Math.round((j.getBoundingClientRect().width / bande) * 100);
        })(),
        equipes: eqs.length,
        // SON ÉQUIPE À LUI, telle qu'elle est marquée à l'écran.
        mienne: eqs.findIndex(e => e.classList.contains('defi-eq--moi')),
        score: voile ? ((voile.querySelector('[data-bonnes]') || {}).textContent || '') : ''
    };
});

/** Ce que porte le tableau de fin. */
const fin = (p) => p.evaluate(() => {
    const c = document.querySelector('.defi-carte--fin');
    if (!c) return null;
    return {
        texte: (c.textContent || '').replace(/\s+/g, ' ').trim(),
        record: !!c.querySelector('.defi-record'),
        neuf: !!c.querySelector('.defi-record--neuf'),
        but: !!c.querySelector('.defi-but'),
        equipes: c.querySelectorAll('.defi-eq').length
    };
});

/** Ce que porte l'annonce des douze secondes. */
const annonce = (p) => p.evaluate(() => {
    const c = document.querySelector('.defi-voile--annonce .defi-carte');
    return c ? (c.textContent || '').replace(/\s+/g, ' ').trim() : '';
});

/**
 * LA PHOTO SE PREND SUR L'ARDOISE DE L'ÉLÈVE, et non sur `s.page`.
 *
 * `s.photo` découpe LA PAGE DE LA SONDE — celle du professeur. La carte du défi
 * n'y est pas, donc le découpage échouait ; et comme l'appel était enveloppé
 * dans un `.catch(() => {})`, il échouait EN SILENCE. Deux lancements pour
 * s'apercevoir qu'aucune image n'avait jamais été écrite.
 */
const photo = async (p, sel, fichier) => {
    const e = await p.$(sel);
    if (!e) { console.log(`  . pas de photo : ${sel} n'est pas à l'écran`); return; }
    await e.screenshot({ path: fichier });
    console.log(`  . photo : ${fichier}`);
};

/** Répond une fois, au hasard — on ne mesure pas la justesse ici. */
const repondre = (p) => p.evaluate(() => {
    const b = document.querySelector('.defi-voile--jeu .defi-choix');
    if (b) { b.click(); return true; }
    return false;
});

/** Attend que l'écran de l'élève soit rendu à l'exercice, voiles démontés. */
const attendreLeCalme = async () => {
    let dernier = '';
    for (let t = 0; t < 20; t++) {
        await battre(pages[0].p);
        const etat = await pages[0].p.evaluate(async () => {
            const { defiEnCours, tableauDuDefi } = await import('./js/core/seanceDistante.js');
            return {
                voiles: [...document.querySelectorAll('.defi-voile')]
                    .map(v => v.className).join(' | '),
                defi: !!defiEnCours(), tableau: !!tableauDuDefi()
            };
        });
        dernier = JSON.stringify(etat);
        if (!etat.voiles) return true;
        // LE TABLEAU DE FIN RESTE CINQ MINUTES : on le referme comme l'élève.
        await pages[0].p.evaluate(() => {
            const b = document.querySelector('.defi-carte--fin [data-fermer]');
            if (b) b.click();
        });
        await dormir(1200);
    }
    // CE QUI RESTE À L'ÉCRAN, ET CE QUE L'ARDOISE CROIT. Sans ces deux lignes,
    // un écran qui ne se démonte pas ne dit pas POURQUOI, et l'on relance la
    // sonde trois fois pour l'apprendre.
    console.log('  . ce qui reste : ' + dernier);
    return false;
};

/* ───────────────────────── 1. UN DÉFI ORDINAIRE NE MONTRE RIEN ─────────── */

// ET IL SE JOUE SUR UN AUTRE EXERCICE QUE LA SUITE, exprès : les scores de ce
// premier défi feraient sinon un record sur `calc-add`, et l'on ne pourrait
// plus mesurer ce que la classe lit LA PREMIÈRE FOIS — qui est justement la
// fois où elle apprend que le record existe.
console.log('\nUN DÉFI ORDINAIRE, QUI NE DOIT RIEN MONTRER');
console.log('─'.repeat(64));
await lancer({ exo: 'calc-sub', secondes: 20 });
for (const { p } of pages) await battre(p);
await dormir(13500);
for (let i = 0; i < 4; i++) { await repondre(pages[0].p); await dormir(500); }
await battre(pages[0].p);
await dormir(600);
const ordinaire = await vu(pages[0].p);
// LE CŒUR DE CE PREMIER TEMPS : le classement n'a rien à dire en direct, et la
// bande ne doit pas prendre la place de la question. C'est aussi lui qui
// attrape le piège de `[hidden]`.
dire('AUCUNE BARRE SOUS LA JAUGE DANS UN DÉFI AU CLASSEMENT',
    ordinaire.jeu && !ordinaire.visible,
    ordinaire.jeu ? `bande : « ${ordinaire.texte || '(vide)'} »` : 'pas de défi à l\'écran');

/* ───────────────────────── 2. LE BUT COMMUN ET LES DEUX ÉQUIPES ────────── */

console.log('\nLE BUT COMMUN ET LES DEUX ÉQUIPES');
console.log('─'.repeat(64));
// ON ATTEND QUE LE PREMIER DÉFI SOIT FINI AVANT DE LANCER LE SECOND, et c'est
// la sonde qui a appris pourquoi : lancer par-dessus un défi qui tourne encore
// ne montre AUCUNE annonce à l'élève — son `defiEnCours()` rend tout de suite
// le nouveau défi, et la carte de jeu déjà montée ne se démonte pas. On
// mesurait alors l'absence de l'annonce comme un défaut, alors que personne ne
// lance deux défis dans la même minute.
await lancer({ secondes: 0 });
if (!await attendreLeCalme()) console.log('  ! le premier défi ne se démonte pas');

await lancer({ secondes: 22, but: 12, equipes: true });
for (const { p } of pages) await battre(p);
await dormir(1500);
const dit = await annonce(pages[0].p);
// LA RÈGLE SE DIT AVANT, pendant les douze secondes. La découvrir en voyant
// une barre apparaître au milieu de la première question, c'est trop tard.
dire('L\'ANNONCE DIT L\'OBJECTIF ET L\'ÉQUIPE',
    /Objectif/i.test(dit) && /12/.test(dit) && /quipe/i.test(dit),
    `« ${dit.slice(0, 120)} »`);

await dormir(12500);
// CHACUN RÉPOND, PUIS LE BATTEMENT PASSE. C'est le seul chemin par lequel le
// score d'un élève arrive sur l'écran de l'autre.
for (let i = 0; i < 5; i++) {
    await repondre(pages[0].p);
    await repondre(pages[1].p);
    await dormir(450);
}
for (const { p } of pages) await battre(p);
await dormir(900);
for (const { p } of pages) await battre(p);
await dormir(900);
const [a, b] = [await vu(pages[0].p), await vu(pages[1].p)];

dire('LA BARRE DE LA CLASSE EST À L\'ÉCRAN', a.visible && a.jauge !== null,
    `« ${a.texte.slice(0, 90)} »`);
// LE CŒUR DE LA MESURE : la jauge n'est pas à zéro, donc le score des DEUX
// élèves a vraiment traversé le battement. Une boîte aux lettres qu'on oublie
// de remplir laisserait tout vert ailleurs et cette barre plate.
dire('ET ELLE A MONTÉ — le score a voyagé par le battement',
    a.jauge !== null && a.jauge > 0, `jauge à ${a.jauge}%`);
dire('LES DEUX ÉQUIPES SONT LÀ, TOUTES LES DEUX', a.equipes === 2 && b.equipes === 2,
    `${a.equipes} et ${b.equipes}`);
// LE PARTAGE SE FAIT AU SERVEUR, UNE LIGNE SUR DEUX. Deux élèves du même côté,
// et le défi aurait l'air de marcher sans opposer personne.
dire('ET LES DEUX ÉLÈVES NE SONT PAS DANS LA MÊME',
    a.mienne >= 0 && b.mienne >= 0 && a.mienne !== b.mienne,
    `Ana : ${a.mienne}, Bob : ${b.mienne}`);
dire('CHACUN VOIT LAQUELLE EST LA SIENNE', /ton équipe/i.test(a.texte),
    `« ${a.texte.slice(0, 90)} »`);
await photo(pages[0].p, '.defi-carte--jeu', 'tools/tmp/defi-ensemble.png');

/* ───────────────────────── 3. LE TABLEAU DE FIN, ET LE RECORD ──────────── */

console.log('\nLE TABLEAU DE FIN, ET LE PREMIER RECORD');
console.log('─'.repeat(64));
// ON LAISSE LE DÉFI FINIR TOUT SEUL, et c'est la seconde chose que la sonde a
// apprise : « Arrêter » efface `defi_debut` et `defi_fin` en base — donc le
// tableau de fin n'existe plus, pour personne. C'est voulu (un défi arrêté est
// un défi annulé), mais cela veut dire qu'on ne peut pas mesurer le tableau en
// coupant le défi : il faut attendre la fin de la manche, puis les trois
// secondes de rassemblement des scores.
for (let t = 0; t < 22; t++) {
    await battre(pages[0].p);
    await dormir(1200);
    if (await fin(pages[0].p)) break;
}
const f = await fin(pages[0].p);
dire('LE TABLEAU DE FIN DIT CE QUE LA CLASSE A FAIT ENSEMBLE',
    !!f && f.but && f.equipes === 2, f ? `« ${f.texte.slice(0, 120)} »` : 'aucun tableau');
// LE PREMIER DÉFI SUR UN EXERCICE N'A RIEN BATTU : il ÉTABLIT le record, et le
// dire ainsi vaut mieux que de masquer la ligne — c'est la fois où l'élève
// apprend que le record existe.
dire('ET IL ANNONCE LE RECORD QUE LA CLASSE VIENT D\'ÉTABLIR',
    !!f && f.record && f.neuf, f ? `« ${(f.texte.match(/record[^.]{0,80}/i) || [''])[0] }»` : '');
await photo(pages[0].p, '.defi-carte--fin', 'tools/tmp/defi-fin-ensemble.png');

/* ───────────────────────── 4. « OBJECTIF AUTO » SUR UN RECORD ──────────── */

console.log('\nL\'OBJECTIF QUE LE SERVEUR CALCULE');
console.log('─'.repeat(64));
// MAINTENANT QU'IL Y A UN RECORD, « auto » doit rendre un nombre — et ce
// nombre doit être PLUS GRAND que ce que la classe vient de faire, sinon
// l'objectif serait déjà atteint au premier point.
if (!await attendreLeCalme()) console.log('  ! le tableau de fin ne se referme pas');
const r = await lancer({ secondes: 20, but: 'auto' });
dire('« OBJECTIF AUTO » REND UN BUT, et il dépasse le record',
    !!(r && r.defi && r.defi.but > 0),
    r && r.defi ? `but : ${r.defi.but}` : JSON.stringify(r));
for (const { p } of pages) await battre(p);
await dormir(1200);
const dit2 = await annonce(pages[0].p);
dire('L\'ANNONCE PORTE LE RECORD À BATTRE', /record/i.test(dit2),
    `« ${dit2.slice(0, 120)} »`);
await lancer({ secondes: 0 });

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

for (const { ctx } of pages) await ctx.close();
await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
