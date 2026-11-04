// LES DEUX FEUILLES, TIRÉES D'UNE VRAIE CLASSE DU SERVEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/feuillesDuVraiBilan.mjs
//
// RÉMY, 4 novembre : « ah oui mais du coup on n'a pas fait la page parent ».
// Elle était faite — et mesurée — sur l'écran des classes LOCALES, celui qu'on
// nourrit de fichiers déposés un par un. Ses classes à lui sont sur le serveur,
// et cet écran-là ne s'affiche même plus quand le serveur répond.
//
// C'EST LE DÉFAUT QUE CETTE SONDE EXISTE POUR NE PLUS LAISSER PASSER : une
// épreuve de noyau ne peut pas le voir, `tools/boutonDesParents.mjs` non plus
// — il presse le bouton de l'écran local, sur des classes de démonstration.
// Seule une classe du SERVEUR, avec un vrai élève qui a vraiment répondu, dit
// si le professeur peut tirer ses feuilles.
//
// CE QU'ON FAIT ICI, DANS L'ORDRE DU JEUDI :
//
//   · le professeur donne une séance de seize questions et la met en cours ;
//   · l'élève y répond — FAUX sur les huit premières, JUSTE sur les huit
//     suivantes, sans quoi rien n'est « à reprendre » et la mesure ne mesure
//     rien ;
//   · le journal remonte ;
//   · et le professeur ouvre « Les bilans », presse les deux boutons, et
//     regarde ce qui tombe.

import { mkdir } from 'node:fs/promises';
import { setTimeout as dormir } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ouvrirSonde } from './sonde.mjs';

const executer = promisify(execFile);
const SORTIE = 'tools/tmp/feuilles-serveur';
await mkdir(SORTIE, { recursive: true });

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
const classeId = s.info.classe;

// ── LE PROFESSEUR DONNE UNE SÉANCE ─────────────────────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR DONNE UNE SÉANCE\x1b[0m');
const seance = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    // HUIT QUESTIONS PAR EXERCICE, ET C'EST LE MINIMUM UTILE : le serveur ne
    // juge une notion qu'à partir de cinq réponses (`reliable`). À deux
    // questions, `weakSkills` reste vide et les deux feuilles n'ont rien à
    // dire — on mesurerait alors le silence, pas le logiciel.
    const p = makePath('La séance du jeudi',
        ['calc-add', 'calc-sub'].map((e, i) =>
            makeStep(e, {}, { stepId: 'e' + i, nbItems: 8, threshold: 0 })),
        politiquePerso());
    const entree = state.saveTeacherPath(p.name, p);
    const r = await donnerAuServeur(entree, cid);
    return { id: r.pathId || null, erreur: r.erreur || '' };
}, [classeId]);
dire('la séance part au serveur', !!seance.id, seance.erreur);

const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return e ? { billet: `${e.login}/${e.code}`, nom: e.prenom || e.firstName || '' } : null;
}, [classeId]);
dire('un billet d\'élève est disponible', !!billet, billet ? billet.nom : '');

// ── L'ÉLÈVE RÉPOND — FAUX, PUIS JUSTE ──────────────────────────────────────
console.log('\n\x1b[1mL\'ÉLÈVE RÉPOND\x1b[0m');
const p = await s.ctx.newPage();
const erreursEleve = [];
p.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 160)));
p.on('dialog', async (d) => { erreursEleve.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet.billet)}`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

const impose = await s.page.evaluate(async ([cid, pid]) => {
    const { imposerLaSeance } = await import('./js/core/espaceProf.js');
    const r = await imposerLaSeance(cid, pid);
    return { ok: !!r.ok, dit: r.dit || r.erreur || '' };
}, [classeId, seance.id]);
dire('la séance est mise en cours', impose.ok, impose.dit);
await dormir(13000);   // dix secondes entre deux battements, on attend treize

await p.evaluate(async () => {
    const m = await import('./js/ui/pathView.js');
    try { m.renderStudentPathView(); } catch (e) { /* la carte peut être déjà là */ }
});
await dormir(1200);

// LE COMPTE DE DÉPART, ET IL EST INDISPENSABLE. Le site d'essai sème déjà du
// travail pour ses élèves : le journal n'est pas vide quand la sonde arrive, et
// « les huit premières réponses » comptées depuis zéro étaient toutes passées
// avant même qu'elle commence. MESURÉ : 41 justes sur 45, donc aucune notion
// fragile, donc aucune fiche de reprise — la sonde mesurait son propre défaut.
const dejaLa = await p.evaluate(async () => {
    const { journal } = await import('./js/core/journal.js');
    return journal.all().filter(e => e.type === 'attempt').length;
});

for (let i = 0; i < 90; i++) {
    const quoi = await p.evaluate(async (base) => {
        const { state } = await import('./js/core/state.js');
        const { journal } = await import('./js/core/journal.js');
        const r = state.activeSequenceRunner;
        const vis = (e) => e.getBoundingClientRect().width > 0
            && e.dataset.eliminated !== '1' && getComputedStyle(e).pointerEvents !== 'none';
        // FAUX SUR LE PREMIER EXERCICE, JUSTE SUR LE SECOND. SEIZE tentatives et
        // non huit : une réponse fausse ouvre une correction BLOQUANTE, que
        // l'élève referme en redonnant la bonne — ce qui inscrit une seconde
        // tentative, juste. MESURÉ à huit : seules quatre questions étaient
        // ratées, le taux restait à 91 %, rien n'était « à reprendre » et la
        // sonde mesurait son propre défaut.
        //
        // Le premier exercice devient ainsi une notion fragile et le second une
        // notion acquise : la feuille de reprise a quelque chose à reprendre,
        // et la page parents a quelque chose dans chacune de ses trois
        // colonnes.
        const dejas = journal.all().filter(e => e.type === 'attempt').length - base;
        const seTromper = dejas < 1000;
        const compris = document.querySelector('.fb-card--blocking .fb-close');
        if (compris && compris.getBoundingClientRect().width > 0) { compris.click(); return 'correction'; }
        const choix = [...document.querySelectorAll('#game-layer [data-idx]')].filter(vis);
        if (choix.length) {
            const it = r && r.session && r.session.current;
            const bonne = it && (it.choices || []).find(c => c.correct);
            const t = bonne ? String(bonne.label).trim() : null;
            const juste = t ? choix.find(b => (b.textContent || '').trim() === t) : null;
            const faux = choix.find(b => b !== juste);
            ((seTromper ? (faux || juste) : juste) || choix[0]).click();
            return 'question';
        }
        const champ = [...document.querySelectorAll('#game-layer input[type="text"], #game-layer input:not([type])')]
            .filter(e => e.getBoundingClientRect().width > 0)[0];
        if (champ) {
            const it = r && r.session && r.session.current;
            const bonne = it && it.answer !== undefined ? String(it.answer) : '0';
            champ.focus();
            champ.value = seTromper ? bonne + '7' : bonne;
            champ.dispatchEvent(new Event('input', { bubbles: true }));
            champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            return 'saisie';
        }
        const suite = document.getElementById('btn-run-next');
        if (suite && suite.getBoundingClientRect().width > 0) { suite.click(); return 'suite'; }
        const jouer = document.querySelector('.world-map-play');
        if (jouer && jouer.getBoundingClientRect().width > 0) { jouer.click(); return 'carte'; }
        const fin = document.getElementById('btn-report-close');
        if (fin && fin.getBoundingClientRect().width > 0) { fin.click(); return 'bilan'; }
        return 'rien';
    }, dejaLa);
    if (quoi === 'bilan') break;
    await dormir(500);
}
const combien = await p.evaluate(async (base) => {
    const { journal } = await import('./js/core/journal.js');
    const a = journal.all().filter(e => e.type === 'attempt').slice(base);
    return { tout: a.length, justes: a.filter(e => e.payload && e.payload.correct).length };
}, dejaLa);
dire('ET IL A VRAIMENT RÉPONDU, bien et mal', combien.tout >= 10 && combien.justes > 0
    && combien.justes < combien.tout, `${combien.justes} justes sur ${combien.tout}`);

await p.evaluate(async () => {
    const { syncNow } = await import('./js/core/sync.js');
    try { await syncNow({ silent: true }); } catch (e) { /* on relira */ }
});
await dormir(3000);

// ── LE PROFESSEUR OUVRE SES BILANS ET PRESSE LES DEUX BOUTONS ──────────────
console.log('\n\x1b[1mLE PROFESSEUR TIRE SES FEUILLES\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(1200);

const telechargements = [];
s.page.on('download', async (d) => {
    const chemin = `${SORTIE}/${d.suggestedFilename()}`;
    await d.saveAs(chemin);
    telechargements.push(chemin);
});

await s.page.evaluate(async () => {
    const m = await import('./js/ui/espaceClasses.js');
    await m.ouvrirEspaceClasses();
});
await dormir(2500);
await s.cliquer(`[data-ouvrir="${classeId}"]`, 'la carte de la classe');
await dormir(2500);
await s.cliquer('[data-onglet="bilans"]', 'l\'onglet « Les bilans »');
await dormir(3000);

// CE QUE LE SERVEUR A RANGÉ, AVANT DE PRESSER QUOI QUE CE SOIT.
//
// Sans cette ligne, une fenêtre vide se lit comme un défaut de la fenêtre,
// alors qu'elle peut être la bonne réponse à « rien n'est fragile ». Elle a
// servi deux fois de suite : l'élève de la sonde répondait trop juste.
const rapport = await s.page.evaluate(async ([cid]) => {
    const { auServeur } = await import('./js/core/espaceProf.js');
    const r = await auServeur('/teacher/report', { classId: cid });
    return ((r && r.students) || []).map(l => ({
        qui: l.firstName, q: l.totalQuestions,
        taux: l.successRate,
        faibles: (l.weakSkills || []).map(w => w.skillId),
        solides: (l.strongSkills || []).map(w => w.skillId)
    }));
}, [classeId]);
rapport.forEach(l => console.log(`   ${String(l.qui).padEnd(14)} ${l.q} questions,`
    + ` ${Math.round((l.taux || 0) * 100)} % · fragiles [${l.faibles.join(', ')}]`
    + ` · solides [${l.solides.join(', ')}]`));

// LES CROCHETS SONT LUS DANS `barreDuBilanHtml`, pas devinés.
await s.doitExister('[data-feuilles-parents]', 'le bouton « Pages pour les parents »');
await s.doitExister('[data-feuilles-reprise]', 'le bouton « Fiches de reprise »');
dire('LES DEUX BOUTONS SONT DANS « Les bilans » de la VRAIE classe', true);

async function presser(crochet, quoi) {
    await s.page.click(crochet);
    await dormir(2000);
    const vue = await s.page.evaluate(() => {
        const t = document.body.textContent.replace(/\s+/g, ' ');
        return {
            faire: !!document.querySelector('[data-faire]'),
            combien: (t.match(/(\d+) (?:feuilles?|pages?) pour/) || [])[1] || null
        };
    });
    dire(`${quoi} : la fenêtre s'ouvre et dit combien`, !!vue.faire && !!vue.combien,
        vue.combien ? `${vue.combien} pour la classe` : 'aucun nombre');
    if (!vue.faire) return null;
    const avant = telechargements.length;
    await s.page.click('[data-faire]');
    for (let i = 0; i < 60 && telechargements.length === avant; i++) await dormir(500);
    const arrive = telechargements.length > avant;
    dire(`${quoi} : le PDF arrive`, arrive,
        arrive ? telechargements[telechargements.length - 1] : 'aucun fichier en 30 s');
    await dormir(1200);
    // La fenêtre se referme toute seule : s'il en reste une, on la ferme pour
    // la mesure suivante.
    await s.page.evaluate(() => {
        const f = document.querySelector('[data-annuler]');
        if (f) f.click();
    });
    await dormir(600);
    return arrive ? telechargements[telechargements.length - 1] : null;
}

const pdfParents = await presser('[data-feuilles-parents]', 'les pages parents');
const pdfReprise = await presser('[data-feuilles-reprise]', 'les fiches de reprise');

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`
    + `, erreurs chez l'élève : ${erreursEleve.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
erreursEleve.slice(0, 3).forEach(e => console.log('  ! élève : ' + e));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.fermer();

// ── ET L'ON REGARDE LA PREMIÈRE PAGE DE CHACUN ─────────────────────────────
for (const [pdf, nom] of [[pdfParents, 'parents'], [pdfReprise, 'reprise']]) {
    if (!pdf) continue;
    await executer('node', ['tools/pdfEnImage.mjs', pdf, `${SORTIE}/${nom}-1.png`, '2', '1'])
        .then(r => console.log('  ' + r.stdout.trim()))
        .catch(() => console.log(`  (${nom} : page 1 pas rendue)`));
}

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m` : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
