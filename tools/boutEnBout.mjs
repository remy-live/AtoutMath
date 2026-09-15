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

// ON ATTEND QUE LA SÉANCE DU SERVEUR SOIT ARRIVÉE AVANT DE FAIRE TRAVAILLER.
//
// Le professeur a assigné le parcours quelques lignes plus haut ; l'élève la
// reçoit à sa première synchronisation, ce qui fait redessiner son accueil. Si
// l'on installe le meneur pendant ce redessin, le conteneur qu'il vient de
// prendre est remplacé sous lui et la première question n'arrive jamais —
// mesuré : un passage sur cinq tombait ici, et toujours à cet endroit.
//
// C'est aussi une vérification en soi : la séance doit arriver SANS code dicté.
const seanceArrivee = await eleve.waitForFunction(async () => {
    const { lireSeances } = await import('./js/ui/donnerSeance.js');
    return (await lireSeances()).length > 0;
}, null, { timeout: 25000 }).then(() => true).catch(() => false);
ok('la séance donnée arrive chez l\'élève, sans code dicté', seanceArrivee);
await eleve.waitForTimeout(900);

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

/** Ce que le fil de la séance montrait AU MILIEU du travail. */
let filPendant = null;
/** Ce qu'on savait à la fin de chaque étape — pour expliquer un échec. */
const journalDesEtapes = [];

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
    // ON ATTEND UNE CONDITION, PAS UNE DURÉE.
    //
    // Cette boucle attendait 1,7 s après chaque réponse. Elle a marché tant que
    // la page ne faisait rien d'autre ; le jour où l'élève s'est mis à
    // synchroniser toutes les dix secondes et à recevoir des séances, elle est
    // tombée une fois sur trois — « les deux étapes sont enregistrées » avec une
    // seule étape. Un harnais qui tombe au hasard ne garde plus rien : on cesse
    // de le croire, et c'est le jour où il a raison qu'on l'ignore.
    //
    // On repère donc la question POSÉE, on répond, et l'on attend qu'elle ait
    // changé — ou que l'étape se soit close.
    // ON RÉPOND JUSQU'À CE QUE L'ÉTAPE SE CLOSE, PAS DEUX FOIS.
    //
    // La boucle comptait ses deux questions et s'arrêtait là. Quand un clic ne
    // trouvait pas sa bulle — la question se redessine entre le moment où l'on
    // lit la réponse et celui où l'on cherche le bouton —, l'étape restait à
    // une question sur deux et ne se clôturait jamais. Mesuré : un passage sur
    // trois, avec « resolues: 1, attendues: 2 ».
    //
    // Un élève, lui, ne compte pas : il répond tant qu'on lui pose une question.
    // On fait pareil, avec un plafond qui n'est là que pour ne pas tourner sans
    // fin — et si on l'atteint, on le DIT.
    const MAX_QUESTIONS = 12;
    for (let q = 0; q < MAX_QUESTIONS; q++) {
        // L'étape est close : plus rien à faire ici.
        const close = await eleve.evaluate(async (k) => {
            const { state } = await import('./js/core/state.js');
            const p = state.studentPath;
            return !!(p && (p.completed || []).includes('sc_' + k));
        }, i).catch(() => false);
        if (close) break;
        // ENTRE DEUX QUESTIONS, `session.item` EST NUL PENDANT UN INSTANT.
        // Lire à ce moment-là et conclure « il n'y a plus de question » était
        // la dernière source de hasard : la seconde question de l'étape était
        // sautée une fois sur trois, et l'étape ne se clôturait jamais.
        const encore = await eleve.waitForFunction(
            () => !!(window.__r && window.__r.session && window.__r.session.item),
            null, { timeout: 10000 }).then(() => true).catch(() => false);
        if (!encore) break;
        const avant = await eleve.evaluate(() => {
            const it = window.__r.session.item;
            return String(it.id || it.prompt || it.answer);
        });
        const rep = await eleve.evaluate(() => String(window.__r.session.item.answer));

        // UN CLIC QUI NE TROUVE PAS SA BULLE NE DIT RIEN, et c'est ce qui
        // restait de hasard : la question se redessine entre le moment où l'on
        // lit la réponse et celui où l'on cherche le bouton qui la porte. Le
        // clic tombait alors dans le vide, la question ne changeait pas, on
        // attendait quinze secondes pour rien, et l'étape se terminait à une
        // question sur deux — un passage sur trois.
        //
        // On VÉRIFIE donc que le clic a produit son effet, et l'on réessaie
        // jusqu'à trois fois en relisant le DOM à chaque fois.
        let passe = false;
        for (let essai = 0; essai < 3 && !passe; essai++) {
            const touche = await eleve.evaluate((r) => {
                const el = [...document.querySelectorAll('.bubble, .choice, button, [data-value]')]
                    .find(x => (x.textContent || '').trim() === r || x.getAttribute('data-value') === r);
                if (!el) return false;
                el.click();
                return true;
            }, rep);
            if (!touche) { await eleve.waitForTimeout(400); continue; }
            passe = await eleve.waitForFunction((a) => {
                const it = window.__r && window.__r.session && window.__r.session.item;
                return !it || String(it.id || it.prompt || it.answer) !== a;
            }, avant, { timeout: 6000 }).then(() => true).catch(() => false);
        }
    }
    // LE FIL DE LA SÉANCE, PENDANT QU'ELLE TOURNE — et pas après.
    //
    // C'est le seul moment où il se regarde : le meneur l'efface en se
    // terminant. On le relève donc ICI, au milieu du travail, et l'on garde ce
    // qu'il montrait.
    if (i === 0) {
        filPendant = await eleve.evaluate(async () => {
            const el = document.getElementById('fil-seance');
            const { dernierAvancement } = await import('./js/ui/filSeance.js');
            const av = dernierAvancement();
            return {
                visible: !!el && !el.hidden,
                hauteur: el ? Math.round(el.getBoundingClientRect().height) : 0,
                nom: el ? (el.querySelector('.fil-nom') || {}).textContent : '',
                ou: el ? (el.querySelector('.fil-ou') || {}).textContent : '',
                cases: el ? el.querySelectorAll('.fil-pas').length : 0,
                remplies: el ? [...el.querySelectorAll('.fil-pas > i')]
                    .filter(x => parseFloat(x.style.width) > 0).length : 0,
                questions: av ? av.questions : null,
                etapes: av ? av.etapes : null
            };
        });
    }

    await eleve.waitForTimeout(1500);
    // CE QU'ON SAIT JUSTE AVANT DE CLORE L'ÉTAPE. Ce harnais tombait une fois
    // sur trois sur « les deux étapes sont enregistrées », et un harnais qui
    // tombe au hasard ne garde plus rien : on cesse de le croire, et c'est le
    // jour où il a raison qu'on l'ignore. On relève donc de quoi trancher entre
    // « l'étape ne s'est pas close » et « quelqu'un a remis le parcours à zéro ».
    journalDesEtapes.push(await eleve.evaluate(async (k) => {
        const { state } = await import('./js/core/state.js');
        const r = window.__r;
        return {
            etape: k,
            faites: state.studentPath ? [...(state.studentPath.completed || [])] : null,
            resolues: r && r.itemsResolved ? r.itemsResolved.size : null,
            reussies: r && r.itemsSolved ? r.itemsSolved.size : null,
            attendues: r && r.step ? r.step.nbItems : null,
            seuil: r && r.step ? r.step.threshold : null,
            meneurVivant: !!state.activeSequenceRunner
        };
    }, i));
    await eleve.evaluate(() => { if (window.__r && window.__r.finish) window.__r.finish(true); });
    await eleve.waitForTimeout(500);
}

ok('LE FIL DE LA SÉANCE DIT OÙ ON EN EST, PENDANT QU\'ON Y EST',
    !!filPendant && filPendant.visible && filPendant.cases >= 2
        && /Étape \d+ sur \d+/.test(filPendant.ou || ''),
    filPendant ? `${filPendant.nom} · ${filPendant.ou} · ${filPendant.cases} cases, `
        + `${filPendant.remplies} entamée(s) · ${filPendant.hauteur} px` : 'jamais vu');

const fait = await eleve.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.studentPath ? state.studentPath.completed : null;
});
ok('les deux étapes sont enregistrées chez l\'élève',
    Array.isArray(fait) && fait.length === 2,
    JSON.stringify(fait) + (Array.isArray(fait) && fait.length === 2 ? ''
        : ' · ce qu\'on savait à chaque étape : ' + JSON.stringify(journalDesEtapes)));

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

// L'AVANCEMENT, CALCULÉ PAR LE SERVEUR SUR LES MÊMES ÉVÉNEMENTS.
//
// Rémy : « il faut que la séance soit facilement visible l'avancement ».
//
// Ce qui se vérifie ici n'est pas qu'un champ existe, mais que le SERVEUR sait
// répondre à la question — combien d'étapes, combien faites, combien de
// questions — à partir du seul journal qu'on lui a poussé. Les essais
// `tests/avancementMiroir` prouvent que sa règle est celle de l'élève ; celui-ci
// prouve que la règle s'applique aux vraies données, arrivées par le vrai
// chemin, chiffrées et déchiffrées en route.
const av = leoDirect && leoDirect.avancement;
ok('LE SERVEUR SAIT OÙ EN EST L\'ÉLÈVE DANS SA SÉANCE',
    !!av && av.etapes >= 2 && av.faites >= 1 && av.questions >= 2,
    av ? `${av.faites}/${av.etapes} étape(s) · ${av.questions} question(s) · `
        + `${Math.round((av.fraction || 0) * 100)} %` : 'aucun avancement');
ok('et il le dit avec les mêmes nombres que chez l\'élève',
    !!av && !!filPendant && av.etapes === filPendant.etapes,
    av && filPendant ? `serveur ${av.etapes} étapes · élève ${filPendant.etapes}` : '—');

// ────────────── 3 bis. LE MOT DU PROFESSEUR, SANS RECHARGER ──────────
//
// Rémy : « Les mots envoyés ne le sont pas en temps réels ».
//
// Ils ne l'étaient pas du tout : ils n'arrivaient JAMAIS dans la session où
// l'élève venait de se connecter. `initSync()` tourne au démarrage, constate que
// l'élève n'est pas encore rattaché, et rendait la main sans poser le moindre
// minuteur ; `loginEleve` faisait ensuite une synchro unique et s'arrêtait là.
// Tout se remettait à marcher au rechargement suivant — ce qui rendait le
// défaut introuvable à la main.
//
// CE CONTRÔLE NE RECHARGE DONC PAS LA PAGE, et c'est tout son intérêt. L'élève
// est entré par la porte quelques lignes plus haut et n'a rien fait d'autre.
console.log('\nUN MOT, DANS LA SESSION OÙ L\'ÉLÈVE VIENT D\'ENTRER');
console.log('─'.repeat(64));

await eleve.evaluate(() => {
    window.__mot = null;
    document.addEventListener('seance_distante', (e) => {
        if (!window.__mot && e.detail && (e.detail.messages || []).length) {
            window.__mot = { quand: Date.now(), texte: e.detail.messages[0].body };
        }
    });
});
const departDuMot = Date.now();
const envoi = await prof.evaluate(async (classId) => {
    const { envoyerUnMot } = await import('./js/core/espaceProf.js');
    return envoyerUnMot(classId, 'Arrêtez tout, on corrige au tableau.');
}, classe.id);
ok('le serveur accepte le mot', !envoi.erreur, envoi.erreur || envoi.dit);

let motRecu = null;
for (let i = 0; i < 40 && !motRecu; i++) {
    await eleve.waitForTimeout(500);
    motRecu = await eleve.evaluate(() => window.__mot);
}
ok('L\'ÉLÈVE LE REÇOIT SANS AVOIR RECHARGÉ', !!motRecu,
    motRecu ? `en ${((motRecu.quand - departDuMot) / 1000).toFixed(1)} s — « ${motRecu.texte} »`
        : 'rien au bout de 20 s');
ok('et il arrive en moins de quinze secondes',
    !!motRecu && (motRecu.quand - departDuMot) < 15000,
    motRecu ? ((motRecu.quand - departDuMot) / 1000).toFixed(1) + ' s' : '—');

// ──────────── 3 ter. L'INDICE SE POSE À CÔTÉ, IL NE PREND PAS L'ÉCRAN ──────
//
// Rémy : « la possibilité de […] envoyer un indice ».
//
// CE QUI SE VÉRIFIE ICI EST LA DIFFÉRENCE AVEC LE MOT, et c'est toute la
// fonction. Le mot qui vient d'arriver a ouvert une fenêtre qu'il faut
// acquitter : c'est ce qu'il faut pour « arrêtez tout ». Faire pareil pour
// « regarde la retenue » interromprait la pensée qu'on veut aider — l'élève
// cliquerait, reviendrait à sa question, et aurait perdu le fil. Le professeur
// aurait nui en croyant aider.
//
// On envoie donc un indice et l'on vérifie DEUX choses : qu'il arrive, et
// qu'aucune fenêtre ne s'est ouverte.
console.log('\nUN INDICE, QUI NE COUPE PAS LE TRAVAIL');
console.log('─'.repeat(64));

// On solde le mot en cours : sa fenêtre est encore là, et l'on veut pouvoir
// dire que ce qui suit n'en ouvre pas une nouvelle.
await eleve.evaluate(async () => {
    const { messagesNonLus, direLu } = await import('./js/core/seanceDistante.js');
    await direLu(messagesNonLus().map(m => m.id));
});
await eleve.waitForTimeout(600);
// ON NE COMPTE QUE CE QUI SE VOIT. La page garde une dizaine de voiles de
// fenêtre en réserve, cachés ; les compter tous rendrait le contrôle vrai sans
// rien prouver, puisque le nombre ne bougerait pas non plus si une fenêtre
// s'ouvrait par-dessus l'une d'elles.
const compterFenetres = () => document.evaluate ? [
    ...document.querySelectorAll('.modal-overlay, #mot-du-prof, .demander')
].filter(x => x.offsetParent !== null || getComputedStyle(x).position === 'fixed'
    && getComputedStyle(x).display !== 'none').length : 0;
const fenetresAvant = await eleve.evaluate(`(${compterFenetres})()`);

const envoiIndice = await prof.evaluate(async ({ classId, eleveId }) => {
    const { soufflerUnIndice } = await import('./js/core/espaceProf.js');
    return soufflerUnIndice(classId, 'Regarde la retenue de la colonne des dizaines.', eleveId);
}, { classId: classe.id, eleveId: (leoDirect || {}).id });
ok('le serveur souffle l\'indice à cet élève-là', !envoiIndice.erreur,
    envoiIndice.erreur || envoiIndice.dit);

const refus = await prof.evaluate(async (classId) => {
    const { soufflerUnIndice } = await import('./js/core/espaceProf.js');
    return soufflerUnIndice(classId, 'Regarde la retenue.', '');
}, classe.id);
ok('UN INDICE À TOUTE LA CLASSE EST REFUSÉ', !!refus.erreur,
    refus.erreur || 'accepté — c\'est la réponse donnée à vingt-cinq élèves qui n\'en avaient pas besoin');

let carte = null;
for (let i = 0; i < 40 && !carte; i++) {
    await eleve.waitForTimeout(500);
    carte = await eleve.evaluate(() => {
        const c = document.querySelector('#indices-du-prof .indice-prof');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return {
            texte: (c.querySelector('.indice-prof-texte') || {}).textContent,
            bas: Math.round(window.innerHeight - r.bottom),
            droite: Math.round(window.innerWidth - r.right),
            fenetres: [...document.querySelectorAll('.modal-overlay, #mot-du-prof, .demander')]
                .filter(x => x.offsetParent !== null
                    || (getComputedStyle(x).position === 'fixed'
                        && getComputedStyle(x).display !== 'none')).length
        };
    });
}
ok('L\'INDICE ARRIVE, SANS RECHARGEMENT', !!carte,
    carte ? `« ${carte.texte} »` : 'rien au bout de 20 s');
ok('IL SE POSE À CÔTÉ, ET N\'OUVRE AUCUNE FENÊTRE',
    !!carte && carte.fenetres === fenetresAvant,
    carte ? `${carte.fenetres} fenêtre(s), comme avant (${fenetresAvant}) · `
        + `posé à ${carte.bas} px du bas et ${carte.droite} px de la droite` : '—');

// ─────────────────── 3 quater. SE DÉCONNECTER, DES DEUX CÔTÉS ──────────────
//
// Rémy : « Tu sais qu'on ne peut même pas se déconnecter ».
//
// C'était vrai, et c'était un trou complet : le jeton du professeur ne
// s'effaçait que lorsque le SERVEUR le refusait. Un professeur connecté sur
// l'ordinateur de la salle informatique y restait après la sonnerie, avec ses
// classes, sa liste et les codes de ses trente élèves ouverts au suivant.
//
// CE QUI SE VÉRIFIE ICI N'EST PAS QUE LE JETON PART — une ligne suffirait.
// C'est que la CLASSE part avec lui. La consigne, le verrou, la séance imposée
// et le compte à rebours sont gardés SUR L'APPAREIL, exprès, pour survivre à
// une coupure réseau ; sans les effacer en partant, l'élève suivant devant la
// même machine se retrouve verrouillé par une classe dont il ne fait pas
// partie, avec un compte à rebours qui n'est pas le sien.
console.log('\nSE DÉCONNECTER, ET NE RIEN LAISSER AU SUIVANT');
console.log('─'.repeat(64));

// On pose une consigne, pour avoir quelque chose qui doit disparaître.
await prof.evaluate(async (classId) => {
    const { poserConsigne } = await import('./js/core/espaceProf.js');
    await poserConsigne(classId, 'Exercice 4 page 112.');
}, classe.id);
// L'élève la reçoit à son prochain battement.
await eleve.waitForFunction(
    () => !!document.getElementById('consigne-prof'), null, { timeout: 25000 }
).then(() => true).catch(() => false);

const avantDeco = await eleve.evaluate(async () => {
    const { quiEstLa } = await import('./js/ui/deconnexionUI.js');
    const { etatSeance } = await import('./js/core/seanceDistante.js');
    const { journal } = await import('./js/core/journal.js');
    return { qui: quiEstLa().role, classe: etatSeance().className,
             consigne: !!document.getElementById('consigne-prof'),
             journal: journal.all().length };
});
ok('avant : l\'élève est rattaché, et la classe a posé sa consigne',
    avantDeco.qui === 'eleve' && avantDeco.consigne, JSON.stringify(avantDeco));

const deco = await eleve.evaluate(async () => {
    const { deconnecterEleve } = await import('./js/core/sync.js');
    return deconnecterEleve();
});
ok('la déconnexion envoie ce qui reste avant de partir', deco.parti,
    deco.parti ? 'parti' : deco.reste + ' à envoyer');

const apresDeco = await eleve.evaluate(async () => {
    const { quiEstLa } = await import('./js/ui/deconnexionUI.js');
    const { etatSeance } = await import('./js/core/seanceDistante.js');
    const { journal } = await import('./js/core/journal.js');
    return { qui: quiEstLa().role, classe: etatSeance().className,
             consigne: !!document.getElementById('consigne-prof'),
             verrou: document.body.classList.contains('classe-verrouillee'),
             journal: journal.all().length };
});
ok('LE JETON DE L\'ÉLÈVE A DISPARU', apresDeco.qui === 'personne', apresDeco.qui);
ok('LA CONSIGNE ET LE VERROU DE LA CLASSE AUSSI',
    !apresDeco.consigne && !apresDeco.verrou && !apresDeco.classe,
    JSON.stringify(apresDeco));
ok('MAIS PAS SON TRAVAIL — se déconnecter n\'est pas s\'effacer',
    apresDeco.journal >= avantDeco.journal,
    `${apresDeco.journal} événement(s) gardés sur ${avantDeco.journal}`);

// LE PROFESSEUR, LUI, SE DÉCONNECTE À LA TOUTE FIN DU HARNAIS — voir plus bas.
// Le vérifier ici couperait le jeton dont les sections suivantes ont besoin :
// un contrôle qui casse les contrôles d'après n'en est pas un.

// ──────────────────── 4. LES DEUX RÔLES DANS LE MÊME NAVIGATEUR ─────────────
//
// Rémy : « comment je pourrais simuler un mode élève et prof simultané, pour
// être sûr que ça fonctionne ».
//
// Tout ce qui précède utilise DEUX contextes de navigateur — deux profils,
// deux stockages, l'équivalent de deux ordinateurs. C'est la situation réelle
// de la classe, et ce n'est PAS celle de Rémy quand il veut essayer seul.
//
// Ici, on reste dans le contexte du PROFESSEUR : un seul stockage, celui qui
// contient déjà son jeton. On ouvre une seconde page avec `?poste=1`, et l'on
// vérifie que les deux tiennent debout EN MÊME TEMPS. Sans le tiroir préfixé
// d'`index.html`, l'un des deux tombe — et c'est exactement ce qui se passait
// avant : se connecter en élève éteignait le mode professeur de l'autre onglet.
console.log('\nLES DEUX RÔLES, DANS UN SEUL NAVIGATEUR');
console.log('─'.repeat(64));

const poste = await ctxProf.newPage();
poste.on('pageerror', e => erreurs.push('poste: ' + String(e).slice(0, 140)));
poste.on('dialog', async d => { erreurs.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });

await poste.goto(`http://127.0.0.1:${PORT}/index.html?poste=1#billet=leo.r%2F2024`);
await poste.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await poste.waitForTimeout(3500);

const côtéÉlève = await poste.evaluate(() => ({
    tiroir: !!window.__posteEleve,
    porte: !!document.getElementById('portail'),
    bandeau: !!document.querySelector('.poste-bandeau'),
    prof: document.body.classList.contains('teacher-mode'),
    // L'adresse ne doit plus porter le code : il a servi, il s'efface.
    adresse: location.hash
}));
ok('le poste élève range à part', côtéÉlève.tiroir);
ok('le billet ouvre la porte tout seul', !côtéÉlève.porte, JSON.stringify(côtéÉlève));
ok('le bandeau dit où l\'on est', côtéÉlève.bandeau);
ok('il n\'est pas professeur', !côtéÉlève.prof);
ok('le code a disparu de la barre d\'adresse', !côtéÉlève.adresse.includes('2024'),
    côtéÉlève.adresse || '(vide)');

// ET LE PROFESSEUR, LUI, EST TOUJOURS PROFESSEUR. C'est LA vérification : on
// recharge sa page, dans le même navigateur, après que l'élève s'est connecté.
await prof.reload();
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
const côtéProf = await prof.evaluate(async () => {
    const { jetonProf } = await import('./js/core/verrouProf.js');
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const l = await mesClasses();
    return { mode: document.body.classList.contains('teacher-mode'),
             jeton: !!jetonProf(),
             classes: Array.isArray(l) ? l.length : ('erreur: ' + l.erreur) };
});
ok('LE PROFESSEUR N\'A PAS ÉTÉ DÉCONNECTÉ', côtéProf.mode && côtéProf.jeton,
    JSON.stringify(côtéProf));
// Le nombre importe peu — le site d'essai en sert plusieurs. Ce qui compte est
// qu'il LISE : une liste, et non le refus 401 qu'il recevait quand la seconde
// fenêtre lui prenait son jeton.
ok('et il lit toujours ses classes', typeof côtéProf.classes === 'number' && côtéProf.classes >= 1,
    String(côtéProf.classes));

// Les deux jeux de clefs cohabitent sans se voir. On regarde depuis la page du
// PROFESSEUR, c'est-à-dire depuis le vrai `localStorage` : c'est le seul
// endroit d'où l'on voit les deux tiroirs à la fois.
const clefs = await prof.evaluate(() => {
    const l = [];
    for (let i = 0; i < localStorage.length; i++) l.push(localStorage.key(i));
    return { prof: l.filter(k => k && !k.startsWith('poste:')),
             poste: l.filter(k => k && k.startsWith('poste:')) };
});
ok('les deux tiroirs existent côte à côte, et sont distincts',
    clefs.prof.some(k => k === 'atoutmath-prof') && clefs.poste.length > 0,
    `professeur : ${clefs.prof.length} clef(s) · poste : ${clefs.poste.length}`);
ok('aucune clef du poste ne déborde sur celles du professeur',
    !clefs.prof.some(k => k.startsWith('poste:')));

// ─────────────── 5. LE PROFESSEUR QUITTE SON MODE — EN DERNIER ─────────────
//
// Ici et pas plus haut : ce contrôle coupe le jeton, et tout ce qui précède en
// a besoin. Un contrôle qui casse les contrôles d'après n'en est pas un — je
// l'ai appris en le plaçant au milieu.
console.log('\nLE PROFESSEUR QUITTE SON MODE');
console.log('─'.repeat(64));
const profAvant = await prof.evaluate(async () => {
    const { quiEstLa } = await import('./js/ui/deconnexionUI.js');
    return quiEstLa().role;
});
await prof.evaluate(async () => {
    const { oublierProf } = await import('./js/core/verrouProf.js');
    oublierProf();
});
const profApres = await prof.evaluate(async () => {
    const { quiEstLa } = await import('./js/ui/deconnexionUI.js');
    const { jetonProf } = await import('./js/core/verrouProf.js');
    return { role: quiEstLa().role, jeton: !!jetonProf() };
});
ok('LE PROFESSEUR PEUT QUITTER SON MODE, ET SON JETON PART',
    profAvant === 'prof' && profApres.role !== 'prof' && !profApres.jeton,
    `${profAvant} → ${profApres.role}`);
ok('et le serveur le traite alors comme un inconnu',
    (await prof.evaluate(async () => {
        const { mesClasses } = await import('./js/core/espaceProf.js');
        const r = await mesClasses();
        return !!(r && r.erreur);
    })), 'ses classes ne se lisent plus sans jeton');

console.log('\n' + '─'.repeat(64));
console.log('fenêtres natives et erreurs de page :', erreurs.length);
erreurs.slice(0, 8).forEach(e => console.log('   ', e));
console.log(echecs ? `\n${echecs} POINT(S) À REPRENDRE` : '\nTOUT SE SYNCHRONISE.');

await n.close();
ranger();
process.exit(echecs || erreurs.length ? 1 : 0);
