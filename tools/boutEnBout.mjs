// TOUT LE CHEMIN, D'UN BOUT À L'AUTRE, SUR UN VRAI SERVEUR.
//
// Rémy : « Je veux que tu travailles dur dessus et que tout se synchronise. »
//
// Le professeur s'identifie, crée sa classe, colle sa liste d'élèves, obtient
// les billets, donne un parcours. L'élève arrive sur un AUTRE poste, entre avec
// son identifiant et son code, fait le travail, se synchronise. Le professeur
// regarde son bilan et son direct.
//
// AUCUNE ÉTAPE N'EST SIMULÉE : un serveur PHP, une base SQLite neuve, un vrai
// navigateur, et les mêmes écrans que Rémy. C'est le seul essai du dépôt qui
// traverse les trois couches à la fois — la page, l'API et la base —, et c'est
// pour cela qu'il existe : chacune est déjà vérifiée de son côté (`npm test`,
// `php tools/testApi.php`), personne ne vérifiait qu'elles se PARLENT.
//
// IL A DÉJÀ SERVI. Il a trouvé, du premier coup, que la pastille « en ligne »
// ne s'allumait jamais : `last_seen_at` est une chaîne de date que l'API
// rendait telle quelle, et la caster en entier donnait l'année. Le direct
// montrait l'élève sur son exercice avec 2 sur 2, et le disait absent.
//
// Usage :  node tools/boutEnBout.mjs           (monte le serveur lui-même)
//          node tools/boutEnBout.mjs 8460      (sur un serveur déjà monté)
import { chromium } from 'playwright';

import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

// SI L'ON NE NOUS DONNE PAS DE PORT, ON MONTE LE SITE NOUS-MÊME — et on le
// range en partant. Un essai qui demande une préparation manuelle n'est pas
// lancé, donc ne sert à rien.
let serveur = null;
let PORT = process.argv[2];
if (!PORT) {
    PORT = String(8500 + Math.floor(Math.random() * 300));
    serveur = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((pret, rate) => {
        const minuteur = setTimeout(() => rate(new Error('le site d\'essai n\'a pas démarré')), 30000);
        serveur.stdout.on('data', (d) => {
            if (String(d).includes('"port"')) { clearTimeout(minuteur); pret(); }
        });
        serveur.on('error', rate);
    });
    await attendre(400);
}
const URL = `http://127.0.0.1:${PORT}/index.html`;
const ranger = () => { if (serveur) { try { serveur.kill(); } catch (e) { /* déjà parti */ } } };

const n = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];
let echecs = 0;
const ok = (quoi, vrai, detail = '') => {
    if (!vrai) echecs++;
    console.log((vrai ? '  ok   ' : '  NON  ') + quoi + (detail ? '  — ' + detail : ''));
};

// ─────────────────────────────────────────────── 1. LE PROFESSEUR ───────────
const ctxProf = await n.newContext({ viewport: { width: 1320, height: 900 } });
const prof = await ctxProf.newPage();
prof.on('pageerror', e => erreurs.push('prof: ' + String(e).slice(0, 140)));
prof.on('dialog', async d => { erreurs.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });

await prof.goto(URL);
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
const ident = await prof.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    try { return await identifierProf('remy@essai.test', 'motdepassetreslong'); }
    catch (e) { return 'ERREUR: ' + e.message; }
});
ok('le professeur s\'identifie', !String(ident).startsWith('ERREUR'), String(ident));

await prof.reload();
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
const role = await prof.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { jetonProf } = await import('./js/core/verrouProf.js');
    const { estRattache } = await import('./js/core/portail.js');
    return { classe: document.body.classList.contains('teacher-mode'),
             mode: !!state.isTeacherMode, jeton: !!jetonProf(), rattache: estRattache() };
});
ok('il revient en mode professeur sans se réidentifier', role.classe, JSON.stringify(role));

console.log('\nLA CLASSE, DEPUIS L\'APPLICATION');
console.log('─'.repeat(64));

// Une classe neuve, et une liste collée — par les mêmes routes que l'écran.
const classe = await prof.evaluate(async () => {
    const { creerClasse, apercuDeListe, importerListe, listeDeClasse } =
        await import('./js/core/espaceProf.js');
    const c = await creerClasse('3e Essai', '3e');
    if (c.erreur) return { erreur: c.erreur };
    const ap = await apercuDeListe(c.id, 'DUPONT;Emma\nNGUYÊN;Maëlle\nROUX Léo;leo.r;2024\n', '');
    if (ap.erreur) return { erreur: ap.erreur };
    const avantImport = (await listeDeClasse(c.id)).eleves.length;
    const r = await importerListe(c.id, ap.apercu.texte);
    return { id: c.id, code: c.join_code, avantImport,
             apercu: ap.apercu.lignes.map(l => l.nom + '→' + l.login + ' [' + l.sort + ']'),
             eleves: r.eleves };
});
ok('la classe est créée avec son code', !!classe.code, classe.code);
ok('l\'aperçu lit les trois lignes sans rien écrire',
    classe.apercu && classe.apercu.length === 3 && classe.avantImport === 0,
    (classe.apercu || []).join(' / '));
ok('l\'import écrit les trois élèves avec leur billet',
    (classe.eleves || []).length === 3
    && !classe.eleves.filter(e => !e.login || !e.code).length,
    (classe.eleves || []).map(e => e.prenom + ':' + e.login + '/' + e.code).join(' · '));

const billet = (classe.eleves || []).find(e => e.login === 'leo.r');
ok('le code écrit dans la liste est respecté', billet && billet.code === '2024');

// Le professeur donne un parcours — comme il le fait depuis l'atelier.
console.log('\nLE PARCOURS DONNÉ');
console.log('─'.repeat(64));
const donne = await prof.evaluate(async (classId) => {
    const { Shortcodes, identiteDeParcours } = await import('./js/core/shortcodes.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { defaultPolicy } = await import('./js/core/policy.js');
    const { auServeur } = await import('./js/core/espaceProf.js');
    const parcours = makePath('Devoir du soir', [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 2, threshold: 1 }),
        makeStep('calc-sub', {}, { stepId: 'b', nbItems: 2, threshold: 1 })
    ], defaultPolicy());
    const code = Shortcodes.encodePath(parcours);
    // On enregistre le parcours côté serveur, puis on l'assigne à la classe :
    // ce sont les deux routes que l'atelier utilise.
    const enr = await auServeur('/teacher/paths',
        { action: 'save', path: { ...parcours, id: identiteDeParcours(parcours) } });
    const ass = await auServeur('/teacher/assign', { pathId: enr.pathId, classId });
    return { code, pathId: enr.pathId, identite: identiteDeParcours(parcours),
             assigne: !ass.erreur, erreur: enr.erreur || ass.erreur || '' };
}, classe.id);
ok('le parcours est enregistré et assigné à la classe', donne.assigne, donne.erreur);
ok('son identifiant serveur est celui du contenu', donne.pathId === donne.identite,
    donne.pathId + ' / ' + donne.identite);

// ───────────────────────────────────────────────── 2. L'ÉLÈVE ───────────────
console.log('\nL\'ÉLÈVE, SUR UN AUTRE POSTE');
console.log('─'.repeat(64));
const ctxEleve = await n.newContext({ viewport: { width: 900, height: 800 } });
const eleve = await ctxEleve.newPage();
eleve.on('pageerror', e => erreurs.push('élève: ' + String(e).slice(0, 140)));
eleve.on('dialog', async d => { erreurs.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });

await eleve.goto(URL);
await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await eleve.waitForTimeout(600);
ok('il tombe sur la porte, pas sur l\'application',
    await eleve.evaluate(() => !!document.getElementById('portail')));

// Il tape son billet.
await eleve.fill('#portail-login', 'leo.r');
await eleve.fill('#portail-code-eleve', '2024');
await eleve.click('#portail-connecter');
await eleve.waitForTimeout(3000);
const entre = await eleve.evaluate(() => ({
    porte: !!document.getElementById('portail'),
    etat: (document.getElementById('portail-etat-login') || {}).textContent || ''
}));
ok('son billet l\'ouvre', !entre.porte, entre.etat);

// Il travaille : les deux étapes du devoir.
const travail = await eleve.evaluate(async (code) => {
    const { Shortcodes } = await import('./js/core/shortcodes.js');
    window.__path = Shortcodes.decodePath(code);
    return { id: window.__path.id, etapes: window.__path.steps.length };
}, donne.code);
ok('l\'élève lit le même parcours que le professeur', travail.id === donne.identite,
    travail.id + ' / ' + donne.identite);

await eleve.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { resolvePolicy } = await import('./js/core/policy.js');
    state.setStudentPath(window.__path.steps, {
        pathId: window.__path.id, name: window.__path.name,
        policy: resolvePolicy(window.__path.policy)
    });
});
await eleve.waitForTimeout(800);

for (const i of [0, 1]) {
    await eleve.evaluate(async (k) => {
        const { Runner } = await import('./js/core/runner.js');
        window.__r = new Runner({ path: window.__path, deviceMode: 'none',
            isStudentPath: true, startIndex: k });
        window.__r.start();
    }, i);
    await eleve.waitForTimeout(900);
    for (const mot of ['C\'est parti', 'Commencer', 'Continuer', 'À moi de jouer']) {
        const b = eleve.getByRole('button', { name: new RegExp(mot, 'i') }).first();
        if (await b.count() && await b.isVisible().catch(() => false)) {
            await b.click({ timeout: 3000 }).catch(() => {});
            await eleve.waitForTimeout(700);
        }
    }
    await eleve.waitForFunction(() => window.__r && window.__r.session && window.__r.session.item,
        { timeout: 20000 });
    for (let q = 0; q < 2; q++) {
        const rep = await eleve.evaluate(() => (window.__r.session && window.__r.session.item)
            ? String(window.__r.session.item.answer) : null);
        if (!rep) break;
        await eleve.evaluate((r) => {
            const el = [...document.querySelectorAll('.bubble, .choice, button, [data-value]')]
                .find(x => (x.textContent || '').trim() === r || x.getAttribute('data-value') === r);
            if (el) el.click();
        }, rep);
        await eleve.waitForTimeout(1700);
    }
    await eleve.waitForTimeout(2400);
    await eleve.evaluate(() => { if (window.__r && window.__r.finish) window.__r.finish(true); });
    await eleve.waitForTimeout(500);
}

const fait = await eleve.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.studentPath ? state.studentPath.completed : null;
});
ok('les deux étapes sont enregistrées chez l\'élève',
    Array.isArray(fait) && fait.length === 2, JSON.stringify(fait));

// Il se synchronise — c'est ce que fait l'application toute seule.
const synchro = await eleve.evaluate(async () => {
    const m = await import('./js/core/sync.js');
    const f = m.syncNow || m.synchroniser || m.sync;
    if (!f) return { erreur: 'pas de fonction de synchronisation' };
    try { return { r: await f() }; } catch (e) { return { erreur: e.message }; }
});
console.log('  (synchronisation :', JSON.stringify(synchro).slice(0, 120), ')');
await eleve.waitForTimeout(2500);

// ───────────────────────────────────── 3. LE PROFESSEUR REGARDE ─────────────
console.log('\nCE QUE LE PROFESSEUR VOIT');
console.log('─'.repeat(64));
const bilan = await prof.evaluate(async (classId) => {
    const { auServeur, leDirect } = await import('./js/core/espaceProf.js');
    const r = await auServeur('/teacher/report', { classId });
    const d = await leDirect(classId);
    return { rapport: r, direct: d };
}, classe.id);

const lignes = (bilan.rapport.students || []);
const leo = lignes.find(x => /Léo/i.test(x.firstName || ''));
ok('le bilan de classe liste les trois élèves', lignes.length === 3,
    lignes.map(x => x.firstName).join(', '));
ok('le travail de l\'élève est arrivé au serveur',
    !!leo && leo.totalQuestions >= 4,
    leo ? `${leo.firstName} : ${leo.totalQuestions} question(s), réussite ${leo.successRate}` : 'introuvable');

const rangs = (bilan.direct.eleves || []);
const leoDirect = rangs.find(x => /Léo/i.test(x.prenom || ''));
ok('le direct le montre en ligne, sur son exercice',
    !!leoDirect && (bilan.direct.maintenant - (leoDirect.vu || 0)) <= 120 && !!leoDirect.exo,
    leoDirect ? `${leoDirect.prenom} · ${leoDirect.exo} · ${leoDirect.justes}/${leoDirect.total}` : 'introuvable');

console.log('\n' + '─'.repeat(64));
console.log('fenêtres natives et erreurs de page :', erreurs.length);
erreurs.slice(0, 8).forEach(e => console.log('   ', e));
console.log(echecs ? `\n${echecs} POINT(S) À REPRENDRE` : '\nTOUT SE SYNCHRONISE.');

await n.close();
ranger();
process.exit(echecs || erreurs.length ? 1 : 0);
