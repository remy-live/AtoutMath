// « AUCUN RETOUR SUR CETTE PAGE » — le tableau « Par séance », pour de vrai.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui : l'onglet « Les bilans » → « Par séance » de sa 4C,
// trente élèves en lignes, huit exercices en colonnes, PAS UNE SEULE CASE
// REMPLIE, et l'avertissement « 12 exercices n'ont été atteints par personne »
// — alors que sa classe venait de travailler « Avant les vacances - 4ème »
// toute l'heure.
//
// ── CE QUE L'ÉPREUVE D'API NE POUVAIT PAS DIRE ─────────────────────────────
//
// `tools/testApi.php` vérifie que `/teacher/report` rend un `parSeance` bien
// formé, et il le rend. Ce qu'il ne compare pas, c'est LA CLÉ de ce tableau
// avec celle que l'écran cherche :
//
//   · `parSeance` est rangé par `run.pathId` — ce que l'ÉLÈVE a enregistré en
//     ouvrant son parcours ;
//   · l'écran interroge `parSeance[seance.pathId]`, où `seance.pathId` est
//     `assignments.path_id` — l'identifiant du parcours du PROFESSEUR.
//
// Les deux se valent pour une séance DONNÉE. Pour une séance IMPOSÉE, non :
// `ouvrirLaSeanceImposee` (js/ui/leMoment.js) range le travail sous
// `identiteDeParcours(parcours)`, l'empreinte du CONTENU. Or imposer est
// exactement la façon dont Rémy travaille en classe.
//
// ON MESURE DONC LES DEUX CHEMINS DANS LA MÊME SONDE — une séance donnée, une
// séance imposée — et l'on regarde le TABLEAU À L'ÉCRAN, pas seulement la
// réponse du serveur : c'est la page dont il dit qu'elle ne rend aucun retour.
//
//   node tools/bilanParSeance.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
const classeId = s.info.classe;

// ── LE PROFESSEUR PRÉPARE DEUX SÉANCES ──────────────────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR PRÉPARE DEUX SÉANCES\x1b[0m');
const deux = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const poser = async (nom, exos) => {
        const p = makePath(nom, exos.map((e, i) =>
            makeStep(e, {}, { stepId: 'e' + i, nbItems: 2, threshold: 0 })), politiquePerso());
        const entree = state.saveTeacherPath(p.name, p);
        const r = await donnerAuServeur(entree, cid);
        return { id: r.pathId || null, erreur: r.erreur || '' };
    };
    // DEUX CONTENUS DIFFÉRENTS : `identiteDeParcours` est une empreinte du
    // CONTENU, et deux séances au même contenu sont le MÊME travail.
    return {
        donnee: await poser('La séance donnée', ['calc-oppose-regle']),
        imposee: await poser('La séance imposée', ['calc-add', 'calc-sub'])
    };
}, [classeId]);
dire('les deux séances partent au serveur',
    !!deux.donnee.id && !!deux.imposee.id,
    JSON.stringify([deux.donnee.erreur, deux.imposee.erreur]));
await dormir(1200);

// ── L'ÉLÈVE OUVRE SON POSTE ─────────────────────────────────────────────────
const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);
dire('un billet d\'élève est disponible', !!billet, String(billet));

const p = await s.ctx.newPage();
const erreursEleve = [];
p.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 160)));
p.on('dialog', async (d) => { erreursEleve.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

/** Répond jusqu'au bout de la séance ouverte chez l'élève. */
async function traverserChezLEleve(tours = 70) {
    // LA CARTE DE L'ÉLÈVE D'ABORD : une séance imposée CHARGE le parcours, elle
    // ne lance pas le meneur. C'est l'élève qui appuie sur « Jouer » depuis sa
    // carte (`.world-map-play`, js/ui/pathView.js), et sans ce dessin la sonde
    // tournait soixante-dix tours devant un écran qui n'avait rien à toucher —
    // puis annonçait un tableau vide, c'est-à-dire exactement le défaut qu'elle
    // mesure. Le témoin des clés l'a dit avant moi.
    await p.evaluate(async () => {
        const m = await import('./js/ui/pathView.js');
        try { m.renderStudentPathView(); } catch (e) { /* la carte peut être déjà là */ }
    });
    await dormir(1200);
    for (let i = 0; i < tours; i++) {
        const quoi = await p.evaluate(async () => {
            const { state } = await import('./js/core/state.js');
            const r = state.activeSequenceRunner;
            const vis = (e) => e.getBoundingClientRect().width > 0
                && e.dataset.eliminated !== '1' && getComputedStyle(e).pointerEvents !== 'none';
            // LA CORRECTION BLOQUANTE D'ABORD (`.fb-card--blocking .fb-close`),
            // puis les deux écrans d'entre-deux-étapes — tous LUS dans la
            // source, pas devinés.
            const compris = document.querySelector('.fb-card--blocking .fb-close');
            if (compris && compris.getBoundingClientRect().width > 0) { compris.click(); return 'correction'; }
            const choix = [...document.querySelectorAll('#game-layer [data-idx]')].filter(vis);
            if (choix.length) {
                const it = r && r.session && r.session.current;
                const bonne = it && (it.choices || []).find(c => c.correct);
                const t = bonne ? String(bonne.label).trim() : null;
                const c = t ? choix.find(b => (b.textContent || '').trim() === t) : null;
                (c || choix[0]).click();
                return 'question';
            }
            const champ = [...document.querySelectorAll('#game-layer input[type="text"], #game-layer input:not([type])')]
                .filter(e => e.getBoundingClientRect().width > 0)[0];
            if (champ) {
                const it = r && r.session && r.session.current;
                champ.focus();
                champ.value = it && it.answer !== undefined ? String(it.answer) : '0';
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
            const b = [...document.querySelectorAll('#game-layer button')]
                .filter(x => x.getBoundingClientRect().width > 0)
                .find(x => /^(jouer|commencer|c'est parti|démarrer|à moi)/i
                    .test((x.textContent || '').trim()));
            if (b) { b.click(); return 'bouton'; }
            return 'rien';
        });
        if (quoi === 'bilan') return true;
        await dormir(600);
    }
    return false;
}

/** Combien de tentatives l'élève a laissées au journal — le témoin le plus bas. */
const tentativesDeLEleve = () => p.evaluate(async () => {
    const { journal } = await import('./js/core/journal.js');
    return journal.all().filter(e => e.type === 'attempt').length;
});

// ── LA SÉANCE IMPOSÉE, COMME EN CLASSE ──────────────────────────────────────
//
// ON NE MESURE QUE CE CHEMIN-LÀ, et le dump des clés plus bas sert de témoin :
// si le serveur a rangé le travail sous UNE clé — quelle qu'elle soit — c'est
// que les réponses sont bien arrivées, et seul le rangement est en cause. Un
// second chemin « séance donnée » n'ajouterait rien à cette démonstration et
// demanderait de refaire à la main l'entrée par la liste de l'élève.
// ── CHEMIN 2 : LA SÉANCE IMPOSÉE ────────────────────────────────────────────
//
// C'est le chemin de Rémy en classe : il clique « mettre en cours », et la
// séance s'ouvre toute seule chez l'élève sans qu'il ait rien à faire.
console.log('\n\x1b[1mCHEMIN 2 — LA SÉANCE IMPOSÉE DEPUIS L\'ÉCRAN DE LA CLASSE\x1b[0m');
const impose = await s.page.evaluate(async ([cid, pid]) => {
    const { imposerLaSeance } = await import('./js/core/espaceProf.js');
    const r = await imposerLaSeance(cid, pid);
    return { ok: !!r.ok, dit: r.dit || r.erreur || '' };
}, [classeId, deux.imposee.id]);
dire('la séance est mise en cours', impose.ok, impose.dit);

// Dix secondes entre deux battements (`seanceDistante.js`) : on attend treize.
await dormir(13000);
const chezLui = await p.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return {
        nom: state.studentPath ? state.studentPath.name : null,
        pathId: state.studentPath ? state.studentPath.pathId : null
    };
});
dire('elle s\'est ouverte toute seule chez l\'élève',
    chezLui.nom === 'La séance imposée', JSON.stringify(chezLui));
await traverserChezLEleve();
await dormir(1500);
const combien = await tentativesDeLEleve();
dire('ET IL A VRAIMENT RÉPONDU — sans quoi la suite ne mesure rien',
    combien >= 2, `${combien} tentative(s) au journal`);

// ── CE QUE LES DEUX CÔTÉS ONT ENREGISTRÉ ───────────────────────────────────
console.log('\n\x1b[1mLES CLÉS, DE PART ET D\'AUTRE\x1b[0m');
// On pousse le journal de l'élève avant d'interroger le serveur.
await p.evaluate(async () => {
    const { syncNow } = await import('./js/core/sync.js');
    try { await syncNow({ silent: true }); } catch (e) { /* on relira */ }
});
await dormir(2500);

const cles = await s.page.evaluate(async ([cid]) => {
    const { auServeur, seancesDeLaClasse } = await import('./js/core/espaceProf.js');
    const rep = await auServeur('/teacher/report', { classId: cid });
    const seances = await seancesDeLaClasse(cid);
    const lignes = (rep && rep.students) || [];
    return {
        seances: ((seances && seances.seances) || [])
            .map(x => ({ nom: x.nom, pathId: x.pathId, exercices: x.exercices })),
        parEleve: lignes.map(l => ({
            qui: l.firstName, cles: Object.keys(l.parSeance || {})
        })).filter(l => l.cles.length)
    };
}, [classeId]);
console.log('   les séances que l\'écran propose :');
cles.seances.forEach(x => console.log(`     ${x.pathId}  « ${x.nom} »  [${(x.exercices || []).join(', ')}]`));
console.log('   les clés que le serveur a rangées :');
cles.parEleve.forEach(l => console.log(`     ${l.qui} : ${l.cles.join(' · ')}`));

const clesVues = new Set(cles.parEleve.flatMap(l => l.cles));
const idImposee = (cles.seances.find(x => x.nom === 'La séance imposée') || {}).pathId;
dire('LE TRAVAIL EST ARRIVÉ AU SERVEUR — témoin de la mesure elle-même',
    clesVues.size > 0, `clés rangées : {${[...clesVues].join(', ')}}`);
dire('ET IL EST RANGÉ SOUS L\'IDENTIFIANT QUE L\'ÉCRAN CHERCHE',
    !!idImposee && clesVues.has(idImposee),
    `l'écran cherche ${idImposee}, le serveur a rangé sous {${[...clesVues].join(', ')}}`);

// ── ET LE TABLEAU À L'ÉCRAN, QUI EST LA PAGE DONT IL PARLE ─────────────────
console.log('\n\x1b[1mLE TABLEAU « PAR SÉANCE », À L\'ÉCRAN\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(1200);

/** Ouvre l'écran de la classe, l'onglet « Les bilans », puis « Par séance ». */
async function ouvrirLeTableau(nomDeLaSeance) {
    // ON ENTRE PAR LA PORTE DE RÉMY : l'écran des classes, puis SA carte.
    // `ouvrirEspaceClasses()` ne prend pas d'identifiant — elle ouvre la LISTE,
    // et c'est la carte `[data-ouvrir]` qui entre dans la classe. Lu dans la
    // source : la deviner aurait mesuré un écran de liste en croyant mesurer
    // un bilan.
    await s.page.evaluate(async () => {
        const m = await import('./js/ui/espaceClasses.js');
        await m.ouvrirEspaceClasses();
    });
    await dormir(2500);
    await s.cliquer(`[data-ouvrir="${classeId}"]`, 'la carte de la classe');
    await dormir(2500);
    await s.cliquer('[data-onglet="bilans"]', 'l\'onglet « Les bilans »');
    await dormir(2500);
    await s.cliquer('[data-sous-bilan="seance"]', 'le sous-onglet « Par séance »');
    await dormir(1500);
    // On choisit la séance dans le menu, par son NOM.
    await s.page.evaluate((nom) => {
        const sel = document.querySelector('[data-seance-detail]');
        if (!sel) return;
        const o = [...sel.options].find(x => (x.textContent || '').includes(nom));
        if (!o) return;
        sel.value = o.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, nomDeLaSeance);
    await dormir(1500);
}

/**
 * CE QUE LE TABLEAU MONTRE — crochets LUS dans `detailParExerciceHtml` :
 * `.ec-table--croise` est le tableau, `td.ec-case` une case, et
 * `ec-case--vide` dit « cet élève n'a pas atteint cet exercice ».
 */
async function lireLeTableau() {
    return s.page.evaluate(() => {
        const t = document.querySelector('.ec-table--croise');
        const cases = t ? [...t.querySelectorAll('tbody td.ec-case')] : [];
        return {
            aUnTableau: !!t,
            colonnes: t ? t.querySelectorAll('thead th.ec-th-exo').length - 1 : 0,
            cases: cases.length,
            remplies: cases.filter(c => !c.classList.contains('ec-case--vide')).length,
            phrase: ((document.querySelector('.ec-phrase-tableau') || {}).textContent || '')
                .replace(/\s+/g, ' ').trim(),
            seanceChoisie: (() => {
                const sel = document.querySelector('[data-seance-detail]');
                if (!sel) return '';
                const o = sel.options[sel.selectedIndex];
                return o ? (o.textContent || '').trim() : '';
            })()
        };
    });
}

await ouvrirLeTableau('La séance imposée');
await s.doitExister('[data-seance-detail]', 'le menu « La séance »');
const vuImposee = await lireLeTableau();
console.log(`   imposée : ${JSON.stringify(vuImposee)}`);
await s.photo('.ec-corps', 'tools/tmp/bilan-par-seance.png', 0);

dire('LE TABLEAU DE LA SÉANCE IMPOSÉE N\'EST PAS VIDE',
    vuImposee.remplies > 0, `${vuImposee.remplies} case(s) remplie(s) sur ${vuImposee.cases}`);

// ET LE TRAVAIL NE DÉBORDE PAS SUR L'AUTRE SÉANCE. C'est l'autre moitié de
// la correction : traduire une clé ne doit pas tout verser dans le même
// panier. L'élève n'a jamais ouvert « La séance donnée » — sa colonne doit
// rester vide, et c'est une information juste, pas une panne.
await ouvrirLeTableau('La séance donnée');
const vuDonnee = await lireLeTableau();
console.log(`   donnée  : ${JSON.stringify(vuDonnee)}`);
dire('ET LE TRAVAIL NE DÉBORDE PAS SUR LA SÉANCE QU\'IL N\'A PAS OUVERTE',
    vuDonnee.remplies === 0,
    `${vuDonnee.remplies} case(s) remplie(s) sur ${vuDonnee.cases}`);

console.log(`\nerreurs de page : ${s.erreurs.length + erreursEleve.length}`
    + ` · fenêtres natives : ${s.fenetresNatives.length}`);
[...s.erreurs, ...erreursEleve].slice(0, 6).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
