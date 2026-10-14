// « D'UNE SÉANCE SUR L'AUTRE » — LE SAUT AUTORISÉ TRAVERSAIT TOUT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « est ce possible si sur un parcours, j'ai autorisé à passer
// l'exercice, sur un autre parcours, cette même exercice peut se passer aussi,
// j'ai l'impression que c'est ce qui est arrivé d'une séance sur l'autre ? »
//
// SA QUESTION ÉTAIT JUSTE, ET IL FALLAIT LA MESURER POUR LE DIRE. On monte un
// vrai serveur, on crée deux parcours, on impose le premier, on autorise le
// saut depuis le direct, puis on impose le second et l'on redemande la session
// de l'élève. Avant correction, les trois réponses étaient identiques :
//
//   SÉANCE A   skippable = ["calc-add"]  · imposé : Séance A
//   SÉANCE B   skippable = ["calc-add"]  · imposé : Séance B
//   AUCUNE     skippable = ["calc-add"]  · imposé : aucun
//
// ON MESURE LES DEUX MOITIÉS, et c'est le seul moyen de répondre : le serveur
// REND la permission avec son parcours, et c'est l'ardoise de l'élève qui
// refuse de l'appliquer ailleurs. Mesurer le serveur seul dirait « la
// permission est toujours là » et ferait croire que rien n'a changé.
//
//   node tools/sautEntreParcours.mjs
//
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';
import '../tests/helpers.mjs';
import { appliquerEtat, peutSauter } from '../js/core/seanceDistante.js';

const PORT = 8571;
const serveur = spawn('php', ['tools/siteEssai.php', String(PORT)], { cwd: process.cwd() });
const info = await new Promise((ok) => {
    serveur.stdout.on('data', (d) => {
        const l = String(d).trim().split('\n').find((x) => x.startsWith('{'));
        if (l) ok(JSON.parse(l));
    });
});
const API = `http://127.0.0.1:${info.port}/api`;
const appel = async (route, corps, jeton) => {
    const r = await fetch(API + route, {
        method: corps ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
        body: corps ? JSON.stringify(corps) : undefined
    });
    return { code: r.status, corps: await r.json().catch(() => ({})) };
};

const prof = await appel('/teacher/login', { email: info.email, password: info.mdp });
const jp = prof.corps.token;
const classes = await appel('/teacher/classes', {}, jp);
const classe = (classes.corps.classes || []).find((c) => c.name === '6e B');
console.log('classe', classe && classe.id, classe && classe.name);

// L'élève : tom.b / 7777, posé par le site d'essai.
const eleve = await appel('/login', { login: 'tom.b', code: '7777' });
console.log('élève', eleve.code, JSON.stringify(eleve.corps).slice(0, 160));
const je = eleve.corps.token;

// 1. Deux parcours différents, chez le professeur.
const p1 = await appel('/teacher/paths', { action: 'save',
    path: { name: 'Séance A', steps: [{ stepId: 's1', exerciseId: 'calc-add' }] } }, jp);
const p2 = await appel('/teacher/paths', { action: 'save',
    path: { name: 'Séance B', steps: [{ stepId: 's9', exerciseId: 'calc-add' }] } }, jp);
const id1 = p1.corps.pathId;
const id2 = p2.corps.pathId;
console.log('parcours', p1.code, id1, '·', p2.code, id2);

// 2. On impose la séance A, puis on autorise le saut de calc-add.
await appel('/teacher/class', { classId: classe.id, action: 'imposer', pathId: id1 }, jp);
const ajout = await appel('/teacher/override',
    { classId: classe.id, action: 'add', exerciseId: 'calc-add', mode: 'saut',
      pathId: id1 }, jp);
// ET LE MÊME GESTE POUR « RETIRER » : c'est la même table, et retirer est plus
// lourd de conséquences — l'étape DISPARAÎT du parcours de l'élève.
await appel('/teacher/override',
    { classId: classe.id, action: 'add', exerciseId: 'calc-mult', mode: 'retire' }, jp);
console.log('override', ajout.code, JSON.stringify(ajout.corps).slice(0, 200));

const sessionA = await appel('/session', null, je);
// CE QUE L'ÉLÈVE EN CONCLUT, et non ce que le serveur a dit : on donne la
// réponse du serveur à l'ardoise, telle quelle, et on lui pose la question
// qu'elle se pose quand elle dessine le bouton « Passer ».
const dit = (q, r, parcoursOuvert) => {
    const s = r.corps.session;
    appliquerEtat({ skippable: s.skippable || [], removed: s.removed || [] });
    const peut = peutSauter('calc-add', parcoursOuvert);
    console.log(q.padEnd(10) + ' le serveur rend ' + JSON.stringify(s.skippable)
        + '\n           l\'élève, dans ' + (parcoursOuvert || 'aucun parcours') + ' : '
        // PAS DE VERT NI DE ROUGE ICI : « il peut sauter » est la bonne réponse
        // dans sa séance et la mauvaise ailleurs. Colorer la CAPACITÉ au lieu de
        // l'attente ferait lire le verdict à l'envers. Le verdict est plus bas.
        + (peut ? 'il PEUT sauter' : 'il ne peut pas')
        + '  · retirés : ' + JSON.stringify(s.removed));
    return peut;
};
const aA = dit('SÉANCE A', sessionA, id1);

// 3. On impose la séance B — un AUTRE parcours — et l'on redemande.
await appel('/teacher/class', { classId: classe.id, action: 'imposer', pathId: id2 }, jp);
const sessionB = await appel('/session', null, je);
const aB = dit('SÉANCE B', sessionB, id2);

// 4. Et sans séance imposée du tout.
await appel('/teacher/class', { classId: classe.id, action: 'imposer', pathId: '' }, jp);
const sansRien = await appel('/session', null, je);
const aRien = dit('AUCUNE', sansRien, null);

console.log('\n\x1b[1mVERDICT\x1b[0m');
const dire = (q, ok) => console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}`);
dire('dans la séance où on l\'a accordé, il peut sauter', aA === true);
dire('dans l\'autre séance, il ne peut pas', aB === false);
dire('et sans séance ouverte non plus', aRien === false);

serveur.kill();
await dormir(300);
process.exit(aA === true && aB === false && aRien === false ? 0 : 1);
