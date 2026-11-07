// LA PORTE ENTROUVERTE, ET LE JOURNAL DES CONNEXIONS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « si il est bloqué chez lui car j'empêche l'accès, je peux laisser
// libre qqs exercices que j'aurais défini MAIS ATTENTION C'EST LA SEULE CHOSE
// QU'IL PEUT FAIRE, il ne peut pas aller sur son profil ou autre », puis :
// « si j'empêche l'accès pour une classe, je peux autoriser des exercices
// spécifiquement pour cette classe ».
//
// Et : « J'aimerai aussi que tu enregistres les connexions que je puisse suivre
// ce qu'ils font ».
//
// ── CE QUE SEULE UNE SONDE PEUT DIRE ───────────────────────────────────────
//
// « C'est la seule chose qu'il peut faire » est une affirmation sur TOUT
// L'ÉCRAN, pas sur un bouton. On ne la vérifie pas en relisant du code : on
// demande au navigateur QUI est sous le doigt au centre de l'écran, et l'on
// regarde si le profil, le catalogue et la carte sont atteignables. C'est la
// même mesure que `tools/fermeHorsSeance.mjs` fait déjà pour la porte close —
// ici il faut en plus que l'exercice nommé, LUI, s'ouvre.
//
//   node tools/porteEntrouverte.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const LIBRE = 'calc-add';
const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
const classeId = s.info.classe;

// ── 1. LE PROFESSEUR FERME, PUIS LAISSE UN EXERCICE LIBRE ──────────────────
console.log('\n\x1b[1mLE PROFESSEUR FERME, ET LAISSE UN EXERCICE\x1b[0m');
const pose = await s.page.evaluate(async ([cid, exo]) => {
    const { fermerHorsSeance } = await import('./js/core/espaceProf.js');
    const a = await fermerHorsSeance(cid, true, 'On se voit en classe !');
    const b = await fermerHorsSeance(cid, true, 'On se voit en classe !', [exo]);
    // ET L'ON RÉENREGISTRE LE MESSAGE SANS LA LISTE : elle ne doit pas partir.
    const c = await fermerHorsSeance(cid, true, 'On se voit en classe !');
    return { a, b, c };
}, [classeId, LIBRE]);
dire('la porte se ferme', !!pose.a.ferme, pose.a.dit || pose.a.erreur || '');
dire('UN EXERCICE EST LAISSÉ LIBRE',
    Array.isArray(pose.b.exos) && pose.b.exos.includes(LIBRE), JSON.stringify(pose.b.exos));
dire('ET RÉENREGISTRER LE MESSAGE NE L\'EFFACE PAS',
    Array.isArray(pose.c.exos) && pose.c.exos.includes(LIBRE), JSON.stringify(pose.c.exos));

// ── 2. L'ÉLÈVE ARRIVE, PORTE FERMÉE ────────────────────────────────────────
console.log('\n\x1b[1mL\'ÉLÈVE ARRIVE DE CHEZ LUI\x1b[0m');
const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);

const p = await s.ctx.newPage();
const erreursEleve = [];
p.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 160)));
p.on('dialog', async (d) => { erreursEleve.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(3000);

/** CE QUI EST SOUS LE DOIGT, ET CE QUI NE L'EST PAS. */
const ceQuIlPeutToucher = () => p.evaluate(() => {
    const voile = document.getElementById('eleve-ferme');
    const au = (x, y) => {
        const e = document.elementFromPoint(x, y);
        return e ? (e.id || e.className || e.tagName) : null;
    };
    const atteignable = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return false;
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        // ON DEMANDE QUI EST LÀ : un bouton parfaitement visible SOUS un voile
        // n'est pas atteignable, et c'est tout le sujet.
        const sous = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!(sous && (e === sous || e.contains(sous)));
    };
    return {
        voile: !!(voile && voile.getBoundingClientRect().width > 0),
        centre: au(window.innerWidth / 2, window.innerHeight / 2),
        // LES TROIS PORTES QU'IL NE DOIT PAS POUVOIR POUSSER — Rémy : « il ne
        // peut pas aller sur son profil ou autre ».
        profil: atteignable('#top-btn-profile'),
        parcours: atteignable('#top-btn-path'),
        catalogue: atteignable('#top-btn-grid'),
        // ET CELLE QU'IL DOIT POUVOIR POUSSER.
        exos: [...document.querySelectorAll('.eleve-ecarte-exo')].map(b => b.textContent.trim())
    };
});

let v = await ceQuIlPeutToucher();
console.log(`   ${JSON.stringify(v)}`);
dire('LE VOILE EST LÀ', v.voile);
dire('L\'EXERCICE LAISSÉ LIBRE EST PROPOSÉ', v.exos.length === 1, v.exos.join(' · '));
dire('ET RIEN D\'AUTRE N\'EST ATTEIGNABLE — ni profil, ni parcours, ni catalogue',
    !v.profil && !v.parcours && !v.catalogue,
    JSON.stringify({ profil: v.profil, parcours: v.parcours, catalogue: v.catalogue }));

// ── 3. IL OUVRE L'EXERCICE, ET REVIENT AU VOILE ────────────────────────────
console.log('\n\x1b[1mIL OUVRE L\'EXERCICE LAISSÉ LIBRE\x1b[0m');
await p.evaluate(() => document.querySelector('.eleve-ecarte-exo').click());
await dormir(3000);
const pendant = await p.evaluate(() => {
    const voile = document.getElementById('eleve-ferme');
    const gl = document.getElementById('game-layer');
    const r = gl ? gl.getBoundingClientRect() : null;
    const au = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
        voileVu: !!(voile && voile.getBoundingClientRect().width > 0),
        jeu: !!(r && r.width > 0 && getComputedStyle(gl).display !== 'none'),
        centre: au ? (au.id || au.className || au.tagName) : null
    };
});
console.log(`   ${JSON.stringify(pendant)}`);
dire('L\'EXERCICE S\'OUVRE', pendant.jeu, JSON.stringify(pendant));
dire('ET LE VOILE S\'EFFACE LE TEMPS DU JEU', !pendant.voileVu,
    'le voile est à 10100, la couche de jeu à 10000 : sans cela il la couvrirait');

// ON SORT PAR LA CROIX, comme l'élève qui a fini ou qui renonce.
await p.evaluate(() => {
    const b = document.getElementById('btn-close-game');
    if (b) b.click();
});
await dormir(2000);
v = await ceQuIlPeutToucher();
dire('ET LE VOILE REVIENT EN SORTANT', v.voile, JSON.stringify(v.centre));
dire('rien ne s\'est rouvert au passage', !v.profil && !v.parcours && !v.catalogue);

// ── 4. LE JOURNAL DES CONNEXIONS ───────────────────────────────────────────
console.log('\n\x1b[1mLE JOURNAL DES CONNEXIONS\x1b[0m');
const journal = await s.page.evaluate(async ([cid]) => {
    const { lesConnexions } = await import('./js/core/espaceProf.js');
    return await lesConnexions(cid);
}, [classeId]);
const lignes = (journal && journal.connexions) || [];
console.log(`   ${lignes.length} ligne(s) : ${lignes.map(l => `${l.prenom}/${l.contexte}`).join(' · ')}`);
dire('LA CONNEXION DE L\'ÉLÈVE EST ENREGISTRÉE', lignes.length >= 1,
    journal && journal.erreur ? journal.erreur : `${lignes.length} ligne(s)`);
dire('ET ELLE DIT QU\'IL VENAIT DE CHEZ LUI, PORTE FERMÉE',
    lignes.some(l => l.contexte === 'maison'),
    lignes.map(l => l.contexte).join(', '));

// ── 5. L'ÉCRAN DU PROFESSEUR ───────────────────────────────────────────────
console.log('\n\x1b[1mL\'ONGLET « CONNEXIONS »\x1b[0m');
await s.page.evaluate(async () => {
    const m = await import('./js/ui/espaceClasses.js');
    await m.ouvrirEspaceClasses();
});
await dormir(2200);
await s.cliquer(`[data-ouvrir="${classeId}"]`, 'la carte de la classe');
await dormir(2500);
await s.cliquer('[data-onglet="bilans"]', 'l\'onglet « Les bilans »');
await dormir(2500);
await s.doitExister('[data-sous-bilan="connexions"]', 'le sous-onglet « Connexions »');
await s.cliquer('[data-sous-bilan="connexions"]', 'le sous-onglet « Connexions »');
await dormir(2500);
const ecran = await s.page.evaluate(() => ({
    lignes: document.querySelectorAll('.ec-cnx').length,
    maison: document.querySelectorAll('.ec-cnx--maison').length,
    texte: ((document.querySelector('.ec-corps') || {}).textContent || '')
        .replace(/\s+/g, ' ').trim().slice(0, 160)
}));
console.log(`   ${JSON.stringify(ecran)}`);
dire('L\'ÉCRAN MONTRE LE JOURNAL', ecran.lignes >= 1, `${ecran.lignes} ligne(s)`);
dire('ET IL MARQUE CELLES DE LA MAISON', ecran.maison >= 1, `${ecran.maison}`);

console.log(`\nerreurs de page : ${s.erreurs.length + erreursEleve.length}`
    + ` · fenêtres natives : ${s.fenetresNatives.length}`);
[...s.erreurs, ...erreursEleve].slice(0, 6).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
