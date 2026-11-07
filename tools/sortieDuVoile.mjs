// LA SORTIE DEPUIS LA PORTE CLOSE — on doit TOUJOURS pouvoir se déconnecter.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Quand c'est noté sur l'écran, c'est fermé pour le moment. Je ne peux
// déconnecter. En fait, il faut toujours pouvoir se déconnecter, j'ai besoin de
// tester avec un élève puis revenir à mon compte prof. »
//
// Puis, aussitôt : « oui mais attention c'est le mode porte fermé donc ça doit
// être différent pour le logout ».
//
// ── CE QUE SEULE UNE SONDE PEUT DIRE ───────────────────────────────────────
//
// Le voile est à `z-index: 10100` et couvre l'écran entier : c'était la demande
// — « ATTENTION C'EST LA SEULE CHOSE QU'IL PEUT FAIRE ». Trois questions en
// découlent, et aucune ne se lit dans le code :
//
//   1. le bouton est-il ATTEIGNABLE, ou seulement présent ? On demande donc
//      `document.elementFromPoint` en son centre : il nomme QUI est là ;
//   2. sa demande de confirmation s'ouvre-t-elle DEVANT le voile ? Une fenêtre
//      à 100000 passe, une à 10000 serait invisible — et le bouton serait mort
//      sans que rien ne le dise ;
//   3. et après ? Se déconnecter depuis une porte close ne doit pas ouvrir ce
//      que la porte fermait. On regarde donc l'écran d'arrivée, et l'on compte
//      ses portes.
//
//   node tools/sortieDuVoile.mjs
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

// ── 1. LE PROFESSEUR FERME LA MAISON ───────────────────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR FERME LA MAISON DE SA CLASSE\x1b[0m');
const pose = await s.page.evaluate(async ([cid, exo]) => {
    const { fermerHorsSeance } = await import('./js/core/espaceProf.js');
    return await fermerHorsSeance(cid, true, 'On se voit en classe !', [exo]);
}, [classeId, LIBRE]);
dire('la porte est fermée', !!pose.ferme, pose.dit || pose.erreur || '');

const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);
dire('un billet d\'élève est disponible', !!billet, String(billet));

// ── 2. L'ÉLÈVE ARRIVE DE CHEZ LUI ──────────────────────────────────────────
console.log('\n\x1b[1mIL ARRIVE DE CHEZ LUI, PORTE CLOSE\x1b[0m');
const p = await s.ctx.newPage();
const erreurs = [];
p.on('pageerror', (e) => erreurs.push(String(e).slice(0, 160)));
p.on('dialog', async (d) => { erreurs.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(3500);

const vu = await p.evaluate(() => {
    const voile = document.getElementById('eleve-ferme');
    const b = voile && voile.querySelector('[data-voile-sortie]');
    const r = b ? b.getBoundingClientRect() : null;
    // QUI EST SOUS LE DOIGT, au centre du bouton. Un bouton parfaitement
    // visible SOUS un voile n'est pas atteignable, et c'est tout le sujet de
    // cet écran : il est fait pour couvrir.
    const sous = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return {
        voile: !!(voile && voile.getBoundingClientRect().width > 0),
        existe: !!b,
        mot: b ? (b.textContent || '').trim() : '',
        visible: !!(r && r.width > 0 && r.height > 0),
        auDoigt: !!(r && r.height >= 44),
        atteignable: !!(b && sous && (b === sous || b.contains(sous))),
        quiEstLa: sous ? (sous.dataset && sous.dataset.voileSortie !== undefined
            ? '[data-voile-sortie]' : (sous.id || sous.className || sous.tagName)) : null,
        // ET LES EXERCICES LIBRES SONT TOUJOURS LÀ : Rémy — « si l'élève ne se
        // déconnecte pas chez lui, il peut travailler ». La sortie s'ajoute,
        // elle ne remplace rien.
        exos: [...document.querySelectorAll('.eleve-ecarte-exo')].length
    };
});
console.log(`   ${JSON.stringify(vu)}`);
dire('LE VOILE EST LÀ', vu.voile);
dire('LA SORTIE EST SUR LE VOILE', vu.existe && vu.visible, vu.mot || 'aucun bouton');
dire('ET ELLE EST ATTEIGNABLE — pas seulement présente', vu.atteignable, String(vu.quiEstLa));
dire('elle se touche au doigt (44 px au moins)', vu.auDoigt);
dire('les exercices laissés libres sont toujours proposés', vu.exos >= 1, `${vu.exos}`);

// ── 3. LA DEMANDE DE CONFIRMATION PASSE DEVANT LE VOILE ────────────────────
console.log('\n\x1b[1mIL CLIQUE\x1b[0m');
await p.evaluate(() => document.querySelector('[data-voile-sortie]').click());
await dormir(1800);
const fenetre = await p.evaluate(() => {
    const v = [...document.querySelectorAll('.modal-overlay')]
        .filter(e => e.getBoundingClientRect().width > 0);
    const ok = document.querySelector('[data-dx-ok]');
    const r = ok ? ok.getBoundingClientRect() : null;
    const sous = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return {
        voiles: v.length,
        texte: v.map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 170)),
        // LE BOUTON DE LA FENÊTRE EST-IL DEVANT LE VOILE ? C'est la question
        // qui décide si tout ceci marche, et elle ne se lit pas dans le code.
        okDevant: !!(ok && sous && (ok === sous || ok.contains(sous))),
        // QUI EST LÀ, nommé. Sans cette ligne, « okDevant : false » envoie
        // chercher un z-index pendant vingt minutes ; avec elle, l'élément se
        // présente lui-même.
        quiCouvreLOk: sous ? (sous.id || sous.className || sous.tagName) : 'personne',
        okRect: ok ? [Math.round(ok.getBoundingClientRect().left),
            Math.round(ok.getBoundingClientRect().top),
            Math.round(ok.getBoundingClientRect().width),
            Math.round(ok.getBoundingClientRect().height)] : null,
        // ET LA CASE « effacer mon travail » N'EST PAS PROPOSÉE ICI : la sortie
        // de la porte close n'efface rien.
        effacer: !!document.getElementById('dx-effacer')
    };
});
console.log(`   ${JSON.stringify(fenetre)}`);
dire('LA FENÊTRE S\'OUVRE DEVANT LE VOILE', fenetre.voiles === 1 && fenetre.okDevant,
    fenetre.texte.join(' · '));
dire('elle dit où l\'on atterrit', /écran d'identification/i.test(fenetre.texte.join(' ')),
    fenetre.texte.join(' '));
dire('ELLE NE PROPOSE PAS D\'EFFACER LE TRAVAIL — la base de données est la référence',
    !fenetre.effacer);

// ── 4. ET APRÈS : L'ÉCRAN D'IDENTIFICATION, ET RIEN DE PLUS ────────────────
console.log('\n\x1b[1mIL CONFIRME\x1b[0m');
await p.evaluate(() => document.querySelector('[data-dx-ok]').click());
// La déconnexion recharge la page d'elle-même au bout de 700 ms.
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 })
    .catch(() => {});
await dormir(4000);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(2500);

const apres = await p.evaluate(async () => {
    const { estRattache, portailNecessaire, modeLibre } = await import('./js/core/portail.js');
    const porte = document.getElementById('portail');
    const r = porte ? porte.getBoundingClientRect() : null;
    return {
        rattache: estRattache(),
        porteNecessaire: portailNecessaire(),
        porteVisible: !!(porte && r && r.width > 0 && r.height > 0),
        voileReste: !!document.getElementById('eleve-ferme'),
        modeLibre: modeLibre(),
        // LES PORTES DU PORTAIL, COMPTÉES : rejoindre sa classe, saisir un
        // code. Une troisième — « travailler sans compte » — rendrait la
        // déconnexion plus permissive que le voile, c'est-à-dire ferait de la
        // sortie la porte que le professeur venait de fermer.
        libre: !!document.querySelector('#portail [data-libre], #portail .portail-libre')
    };
});
console.log(`   ${JSON.stringify(apres)}`);
dire('LE COMPTE EST DÉTACHÉ', !apres.rattache);
dire('LE VOILE EST PARTI', !apres.voileReste);
dire('ON EST SUR L\'ÉCRAN D\'IDENTIFICATION', apres.porteNecessaire && apres.porteVisible,
    `nécessaire : ${apres.porteNecessaire} · visible : ${apres.porteVisible}`);
dire('ET IL N\'OUVRE RIEN DE PLUS QUE LE VOILE — pas de mode libre',
    !apres.modeLibre && !apres.libre, JSON.stringify([apres.modeLibre, apres.libre]));

// ── 5. ON PEUT REVENIR, ET C'EST LE BUT ────────────────────────────────────
//
// « j'ai besoin de tester avec un élève puis revenir à mon compte prof » : la
// sortie ne sert à rien si l'écran d'arrivée ne laisse pas entrer.
console.log('\n\x1b[1mET L\'ON PEUT SE RECONNECTER\x1b[0m');
const champs = await p.evaluate(() => ({
    identifiant: !!document.querySelector('#portail input'),
    boutons: [...document.querySelectorAll('#portail button')]
        .filter(b => b.getBoundingClientRect().width > 0)
        .map(b => (b.textContent || '').trim().slice(0, 30))
}));
console.log(`   ${JSON.stringify(champs)}`);
dire('l\'écran d\'identification a de quoi entrer', champs.identifiant && champs.boutons.length >= 1,
    champs.boutons.join(' · '));

console.log(`\nerreurs de page : ${s.erreurs.length + erreurs.length}`
    + ` · fenêtres natives : ${s.fenetresNatives.length}`);
[...s.erreurs, ...erreurs].slice(0, 6).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
