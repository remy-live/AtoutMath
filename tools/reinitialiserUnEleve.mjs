// REMETTRE UN ÉLÈVE À ZÉRO SUR UNE SÉANCE — est-ce possible aujourd'hui ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je peux réinitialiser un élève sur une séance, ça m'aiderait à
// tester mon élève test ».
//
// ── CE QU'IL FAUT VÉRIFIER AVANT DE CONSTRUIRE QUOI QUE CE SOIT ────────────
//
// Le logiciel sait DÉJÀ se déconnecter « en effaçant le travail »
// (`deconnecterEleve({ effacerLeTravail: true })`, offert dans la fenêtre de
// déconnexion). Reste LA question, et elle ne se lit pas dans le code :
//
//     le travail effacé REVIENT-IL du serveur à la reconnexion ?
//
// L'avancement de l'élève n'est pas une case rangée quelque part : il est
// DÉRIVÉ du journal (`state.studentPath` = `computeAssignedPath(journal.all())`).
// Effacer le stockage efface donc le journal — mais le serveur garde les
// événements déjà poussés, et `/sync` renvoie ceux « des AUTRES appareils ».
// Tout tient donc à une chose : après l'effacement, l'appareil est-il encore
// LE MÊME pour le serveur ?
//
//   · s'il garde son `deviceId`, le serveur exclut ses propres événements et
//     l'élève repart vraiment de zéro ;
//   · s'il en reçoit un neuf, le serveur lui renvoie tout son passé, et
//     l'effacement n'aura duré que le temps d'une synchronisation.
//
// Une sonde répond en trente secondes à ce que trois lectures de code
// laisseraient incertain.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1500);

// ── LE PROFESSEUR DONNE UNE SÉANCE ──────────────────────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR DONNE UNE SÉANCE DE TROIS EXERCICES\x1b[0m');
const classeId = await s.page.evaluate(async () => {
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const l = await mesClasses();
    const c = (Array.isArray(l) ? l : []).find((x) => /6e B/.test(x.name || ''));
    return c ? c.id : null;
});
const donne = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const p = makePath('Séance à rejouer', [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 4 }),
        makeStep('calc-prio', {}, { stepId: 'b', nbItems: 4 }),
        makeStep('calc-mult-flash', {}, { stepId: 'c', nbItems: 4 })
    ], politiquePerso());
    const r = await donnerAuServeur(state.saveTeacherPath(p.name, p), cid);
    return { ok: !!r.ok, erreur: r.erreur || '' };
}, [classeId]);
dire('la séance part au serveur', donne.ok, donne.erreur);
await dormir(2500);

const eleve = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => /Emma/.test(x.prenom || ''));
    return e ? { login: e.login, code: e.code, prenom: e.prenom } : null;
}, [classeId]);

// ── L'ÉLÈVE TEST SE CONNECTE ET TRAVAILLE ───────────────────────────────────
console.log('\n\x1b[1mL\'ÉLÈVE TEST TRAVAILLE\x1b[0m');
// SON PROPRE CONTEXTE : un onglet de plus partagerait le stockage du
// professeur, et l'on mesurerait deux sessions dans une.
const ctx = await s.nav.newContext({ viewport: { width: 1200, height: 900 } });
const p = await ctx.newPage();
const erreurs = [];
p.on('pageerror', (e) => erreurs.push(String(e).slice(0, 160)));

const entrer = async () => {
    await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    await dormir(1500);
    await p.fill('#portail-login', eleve.login);
    await p.fill('#portail-code-eleve', eleve.code);
    await p.click('#portail-connecter');
    await dormir(7000);
};
await entrer();

/** Ce que l'élève a fait, vu de son appareil. */
const avancement = () => p.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { journal } = await import('./js/core/journal.js');
    const a = state.studentPath;
    return {
        parcours: a ? a.name : '(aucun)',
        faites: a ? (a.completed || []).length : -1,
        evenements: journal.all().length,
        // L'IDENTITÉ DE L'APPAREIL : c'est elle qui décide si le serveur
        // renvoie son propre passé.
        appareil: (journal.deviceId || (journal.meta && journal.meta.deviceId) || '')
    };
});

await p.click('.path-ouvrir-seance');
await dormir(3000);
const travaille = await p.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const a = state.studentPath;
    for (const st of (a.steps || []).slice(0, 2)) {
        state.markStudentPathStepCompleted(st.stepId, {
            runId: 'essai', solved: 4, required: 3, questions: 4, passed: true
        });
    }
    const { syncNow } = await import('./js/core/sync.js');
    await syncNow({ silent: true });
    return (state.studentPath.completed || []).length;
});
await dormir(2500);
const avant = await avancement();
console.log(`   ${JSON.stringify(avant)}`);
dire('TÉMOIN : il a bien terminé deux exercices', travaille === 2, String(travaille));
dire('TÉMOIN : et son travail est monté au serveur',
    await p.evaluate(async () => {
        const { journal } = await import('./js/core/journal.js');
        return journal.pending().length === 0;
    }), 'rien ne reste en attente');

// ── LE PROFESSEUR LE REMET À ZÉRO DEPUIS SON POSTE ──────────────────────────
//
// RÉMY : « j'ai créé un élève virtuel dans la classe puis je réinitialise la
// séance depuis mon poste comme s'il ne l'avait jamais commencée ».
//
// C'EST LA MESURE QUI COMPTE : le geste traverse deux machines. Le professeur
// demande, le serveur efface ET pose un message, l'appareil de l'élève le lit
// à sa synchro suivante et oublie à son tour. Aucune épreuve de module ne peut
// dire que la chaîne entière tient.
console.log('\n\x1b[1mLE PROFESSEUR REMET L\'ÉLÈVE À ZÉRO DEPUIS SON POSTE\x1b[0m');
const idSeance = await p.evaluate(async () => {
    const { lireSeances } = await import('./js/ui/donnerSeance.js');
    const l = (await lireSeances()) || [];
    const m = l.find((x) => /rejouer/i.test(x.titre || ''));
    return m ? (m.pathId || (m.path && m.path.id)) : null;
});
console.log(`   la séance porte l'identité ${idSeance}`);

const vuDuProf = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => /Emma/.test(x.prenom || ''));
    return e ? e.id : null;
}, [classeId]);

// ON PASSE PAR LA ROUTE, pas par le bouton : le bouton est mesuré par le
// harnais de bout en bout, et ici c'est la CHAÎNE qu'on éprouve. Le crochet du
// bouton est gardé par une épreuve de source.
const remis = await s.page.evaluate(async ([sid, pid]) => {
    const { auServeur } = await import('./js/core/espaceProf.js');
    return auServeur('/teacher/student',
        { action: 'reinitialiser', studentId: sid, pathId: pid });
}, [vuDuProf, idSeance]);
console.log(`   le serveur répond : ${JSON.stringify(remis)}`);
dire('LE SERVEUR EFFACE LE TRAVAIL DE CET ÉLÈVE',
    remis.ok === true && (remis.efface || 0) > 0, JSON.stringify(remis));

// LE BILAN DU PROFESSEUR NE DOIT PLUS RIEN MONTRER.
const auBilan = await s.page.evaluate(async ([sid]) => {
    const { auServeur } = await import('./js/core/espaceProf.js');
    const r = await auServeur('/teacher/student', { studentId: sid });
    return { runs: (r.runs || []).length, score: r.score || 0 };
}, [vuDuProf]);
console.log(`   au bilan du professeur : ${JSON.stringify(auBilan)}`);
dire('ET SON BILAN NE PORTE PLUS CETTE SÉANCE', auBilan.runs === 0,
    `${auBilan.runs} run(s) restant(s)`);

// ── L'APPAREIL DE L'ÉLÈVE L'APPREND À SA SYNCHRO SUIVANTE ───────────────────
//
// SANS CETTE MOITIÉ, LE GESTE NE SERT À RIEN : l'écran de l'élève est dessiné
// par SON journal, et ses événements sont déjà synchronisés — il ne les
// repousse pas, mais il ne les oublie pas non plus.
console.log('\n\x1b[1mL\'APPAREIL DE L\'ÉLÈVE L\'APPREND\x1b[0m');
const apresSynchro = await p.evaluate(async () => {
    const { syncNow } = await import('./js/core/sync.js');
    const r = await syncNow({ silent: true });
    return r || {};
});
console.log(`   synchro : ${JSON.stringify(apresSynchro)}`);
dire('SON APPAREIL OUBLIE À SON TOUR', (apresSynchro.oublies || 0) > 0,
    `${apresSynchro.oublies || 0} événement(s) oublié(s)`);
await dormir(1500);

const chezLui = await avancement();
console.log(`   chez l'élève : ${JSON.stringify(chezLui)}`);

// LA SÉANCE RESTE DONNÉE : on efface son TRAVAIL, pas le travail À FAIRE.
const laSeanceApres = await p.evaluate(async () => {
    const { lireSeances } = await import('./js/ui/donnerSeance.js');
    const l = (await lireSeances()) || [];
    const m = l.find((x) => /rejouer/i.test(x.titre || ''));
    return { trouvee: !!m, etapes: ((m && m.path && m.path.steps) || []).length };
});
dire('LA SÉANCE EST TOUJOURS LÀ, ENTIÈRE',
    laSeanceApres.trouvee && laSeanceApres.etapes === 3, JSON.stringify(laSeanceApres));

// ON LA ROUVRE : c'est là que l'avancement se recalcule depuis le journal.
await p.reload();
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(5000);
await p.click('.path-ouvrir-seance');
await dormir(3000);
const rejouee = await avancement();
console.log(`   une fois rouverte : ${JSON.stringify(rejouee)}`);
dire('IL LA RETROUVE COMME S\'IL NE L\'AVAIT JAMAIS COMMENCÉE',
    rejouee.faites === 0, `${rejouee.faites} étape(s) faite(s)`);

// ── ET L'ORDRE NE SE REJOUE PAS CONTRE LUI ──────────────────────────────────
//
// Les ordres sont renvoyés à CHAQUE synchro — c'est voulu, pour atteindre un
// appareil qui dormait. Il faut donc que celui qui recommence tout de suite ne
// voie pas son nouveau travail effacé dix secondes plus tard.
console.log('\n\x1b[1mIL RECOMMENCE : SON TRAVAIL NEUF RESTE\x1b[0m');
const refait = await p.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const a = state.studentPath;
    state.markStudentPathStepCompleted((a.steps || [])[0].stepId, {
        runId: 'encore', solved: 4, required: 3, questions: 4, passed: true
    });
    const { syncNow } = await import('./js/core/sync.js');
    await syncNow({ silent: true });
    await new Promise((ok) => setTimeout(ok, 800));
    await syncNow({ silent: true });
    return (state.studentPath.completed || []).length;
});
dire('CE QU\'IL REFAIT APRÈS LA REMISE À ZÉRO N\'EST PAS EFFACÉ',
    refait === 1, `${refait} étape(s) faite(s)`);

// ── ON LE REMET À ZÉRO, PAR LA PORTE QUI EXISTE ─────────────────────────────
//
// `deconnecterEleve({ effacerLeTravail: true })` est exactement ce que la
// fenêtre de déconnexion propose derrière sa case à cocher. On passe par la
// fonction, et non par trois clics : c'est la MÊME porte, et la sonde mesure
// ce qu'elle fait, pas la façon dont on l'ouvre.
console.log('\n\x1b[1mDÉCONNEXION EN EFFAÇANT LE TRAVAIL\x1b[0m');
const parti = await p.evaluate(async () => {
    const { deconnecterEleve } = await import('./js/core/sync.js');
    return deconnecterEleve({ force: true, effacerLeTravail: true });
});
dire('l\'élève est déconnecté et son travail effacé', parti.parti === true,
    JSON.stringify(parti));
await dormir(1500);

// ── IL SE RECONNECTE : LE PASSÉ REVIENT-IL ? ────────────────────────────────
console.log('\n\x1b[1mIL SE RECONNECTE\x1b[0m');
await entrer();
await p.evaluate(async () => {
    const { syncNow } = await import('./js/core/sync.js');
    await syncNow({ silent: true });
});
await dormir(3000);
const apres = await avancement();
console.log(`   après reconnexion : ${JSON.stringify(apres)}`);
dire('L\'APPAREIL GARDE SON IDENTITÉ — le serveur ne lui renverra pas son passé',
    apres.appareil === avant.appareil, `${avant.appareil} → ${apres.appareil}`);

// LA SÉANCE REDESCEND DU SERVEUR : elle n'était pas à l'élève, elle lui est
// DONNÉE. L'effacement emporte son travail, pas le travail à faire.
const laSeance = await p.evaluate(async () => {
    const { lireSeances } = await import('./js/ui/donnerSeance.js');
    const l = (await lireSeances()) || [];
    const m = l.find((x) => /rejouer/i.test(x.titre || ''));
    return { trouvee: !!m, etapes: ((m && m.path && m.path.steps) || []).length };
});
console.log(`   la séance : ${JSON.stringify(laSeance)}`);
dire('LA SÉANCE EST TOUJOURS LÀ, ENTIÈRE',
    laSeance.trouvee && laSeance.etapes === 3, JSON.stringify(laSeance));

// ET ON L'OUVRE : c'est là seulement que l'avancement se recalcule.
//
// MA PREMIÈRE VERSION LISAIT AVANT CE CLIC, et lisait donc `studentPath` à
// `null` — « -1 étape faite ». Elle en concluait que le passé était revenu, sur
// une remise à zéro parfaitement réussie. Une sonde qui regarde trop tôt accuse
// le logiciel à sa place.
await p.click('.path-ouvrir-seance');
await dormir(3000);
const rouverte = await avancement();
console.log(`   une fois la séance rouverte : ${JSON.stringify(rouverte)}`);
const vraimentNeuf = rouverte.faites === 0;
if (vraimentNeuf) {
    console.log('  \x1b[32m✓\x1b[0m \x1b[1mL\'ÉLÈVE REPART VRAIMENT DE ZÉRO.\x1b[0m');
    console.log('    Le serveur ne lui renvoie pas son propre passé : son appareil');
    console.log('    garde son identité, et `/sync` exclut ses propres événements.');
} else {
    console.log(`  \x1b[33m⚠\x1b[0m \x1b[1mLE PASSÉ EST REVENU\x1b[0m — ${rouverte.faites} étape(s) `
        + 'à nouveau marquées faites.');
    console.log('    L\'effacement n\'a donc duré que le temps d\'une synchronisation :');
    console.log('    l\'appareil a reçu une identité neuve, et le serveur lui a');
    console.log('    renvoyé tout ce qu\'il avait poussé. Une vraie remise à zéro');
    console.log('    demande que le SERVEUR oublie aussi — voir docs/frictions.md.');
}

console.log(`\nerreurs de page : ${s.erreurs.length + erreurs.length}`);
[...s.erreurs, ...erreurs].slice(0, 5).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || erreurs.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mLA QUESTION EST TRANCHÉE.\x1b[0m');
await p.close();
await ctx.close();
await s.fermer();
process.exit(ratés ? 1 : 0);
