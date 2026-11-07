// TRENTE ÉLÈVES QUI RÉPONDENT DANS LA MÊME SECONDE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/trenteDUnCoup.mjs [combien]
//
// RÉMY, après avoir lancé le défi d'estimation avec sa classe : « est ce normal
// que tous les élèves n'aient pas eu le podium ? »
//
// ── CE QU'AUCUNE AUTRE MESURE DU DÉPÔT NE POUVAIT DIRE ────────────────────
//
// `tools/testApi.php` interroge le serveur UNE REQUÊTE À LA FOIS : il ne peut
// pas voir ce qui n'arrive qu'à plusieurs. `tools/boutEnBout.mjs` et les sondes
// d'écran ouvrent un ou deux navigateurs. Or un défi, c'est TRENTE ARDOISES QUI
// ÉCRIVENT DANS LA MÊME SECONDE — c'est même tout son principe, et c'est
// exactement la situation que personne ne mesurait.
//
// MESURÉ À TROIS ÉLÈVES, dans une sonde d'écran, avant d'écrire celle-ci :
//
//   PHP Fatal error: Uncaught PDOException: SQLSTATE[HY000]:
//   General error: 5 database is locked  …  api/lib/db.php:239
//   POST /api/defi/score → 500
//
// Et le client AVALAIT l'échec en silence (`catch (e) {}`). L'élève dont le
// score tombait là n'était dans AUCUN podium — ni le sien, ni celui des autres.
// C'est, mot pour mot, ce que Rémy a vu dans sa classe.
//
// ── CE QUE CETTE SONDE GARDE ──────────────────────────────────────────────
//
// Que trente scores envoyés EN MÊME TEMPS arrivent tous les trente, et que le
// classement les compte tous. Elle n'ouvre aucun navigateur : ce n'est pas
// l'écran qu'elle mesure, c'est ce qui se passe quand une classe entière
// appuie sur le même bouton au même instant.

import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';

const COMBIEN = Math.max(2, Number(process.argv[2]) || 30);

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

// ── LE SITE D'ESSAI ───────────────────────────────────────────────────────
const PORT = String(8900 + Math.floor(Math.random() * 300));
const serveur = spawn('php', ['tools/siteEssai.php', PORT],
    { stdio: ['ignore', 'pipe', 'pipe'] });
let info = null;
await new Promise((pret, rate) => {
    const minuteur = setTimeout(() => rate(new Error('le site d\'essai n\'a pas démarré')), 30000);
    serveur.stdout.on('data', (d) => {
        const t = String(d);
        if (!t.includes('"port"')) return;
        clearTimeout(minuteur);
        try { info = JSON.parse(t.trim().split('\n').pop()); } catch (e) { /* plus bas */ }
        pret();
    });
    serveur.on('error', rate);
});
const ranger = () => { try { serveur.kill(); } catch (e) { /* déjà parti */ } };
const API = `http://127.0.0.1:${PORT}/api`;

/** Une requête à l'API, comme l'ardoise la fait. */
async function appel(route, corps, jeton) {
    const r = await fetch(API + route, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(jeton ? { Authorization: 'Bearer ' + jeton } : {})
        },
        body: JSON.stringify(corps || {})
    });
    let json = null;
    try { json = await r.json(); } catch (e) { json = null; }
    return { code: r.status, json };
}

try {
    // ── LE PROFESSEUR, UNE CLASSE, ET `COMBIEN` BILLETS ───────────────────
    const prof = await appel('/teacher/login', { email: info.email, password: info.mdp });
    const jetonProf = (prof.json || {}).token || '';
    if (!jetonProf) throw new Error('le professeur n\'entre pas : ' + JSON.stringify(prof.json));

    await appel('/teacher/classes', { action: 'create', name: 'La ruée' }, jetonProf);
    const liste = await appel('/teacher/classes', { action: 'list' }, jetonProf);
    const classe = ((liste.json || {}).classes || []).find(c => c.name === 'La ruée');
    if (!classe) throw new Error('classe introuvable');

    const billets = Array.from({ length: COMBIEN }, (_, i) => {
        const n = String(i + 1).padStart(2, '0');
        return { nom: `Eleve${n} Ruee`, login: `ruee.${n}`, code: `RUEE${n}` };
    });
    await appel('/teacher/roster', {
        classId: classe.id, action: 'importer',
        liste: billets.map(b => `${b.nom} ; ${b.login} ; ${b.code}`).join('\n')
    }, jetonProf);

    // ── ILS ENTRENT TOUS. On compte ceux qui n'y arrivent pas : une entrée
    // ratée est déjà un élève perdu, et c'est le même instant de bousculade.
    const entrees = await Promise.all(billets.map(b =>
        appel('/login', { login: b.login, code: b.code })));
    const jetons = entrees.map(e => (e.json || {}).token || '');
    const dehors = jetons.filter(j => !j).length;
    dire(`LES ${COMBIEN} ÉLÈVES ENTRENT EN MÊME TEMPS`, dehors === 0,
        dehors ? `${dehors} resté(s) à la porte` : `${COMBIEN} jetons`);

    // ── LE DÉFI ──────────────────────────────────────────────────────────
    const lance = await appel('/teacher/class',
        { classId: classe.id, action: 'defi', exo: 'geo-estimer-angle', secondes: 10, mode: 'qcm' },
        jetonProf);
    dire('le professeur lance le défi', (lance.json || {}).ok === true,
        JSON.stringify((lance.json || {}).dit || lance.json));

    // ── LE BATTEMENT DE TRENTE ARDOISES, AVEC LE SCORE DEDANS ────────────
    //
    // C'EST UN CHEMIN D'ÉCRITURE NEUF, et il écrit PENDANT le défi : la barre
    // de la classe et les deux équipes ont besoin du total des trente au fur
    // et à mesure. On n'a ajouté AUCUNE requête — le score monte dans le
    // battement qui passait déjà toutes les dix secondes — mais ce battement,
    // lui, n'écrivait rien en base. Trente écritures toutes les dix secondes,
    // c'est la même famille de bousculades que celle qu'on vient de corriger.
    //
    // TROIS TOURS, pour que le deuxième et le troisième tombent sur des lignes
    // qui EXISTENT DÉJÀ : l'INSERT et l'UPDATE ne prennent pas les mêmes
    // verrous, et c'est une lecture promue en écriture qui avait fait
    // disparaître un tiers de la classe de Rémy du podium.
    let battementsPerdus = 0;
    for (let tour = 0; tour < 3; tour++) {
        const b = await Promise.all(jetons.map((j, i) => appel('/session',
            { defi: { bonnes: tour + 1, total: 5, ms: 900 + i,
                      points: 10 * (tour + 1) + i } }, j)));
        battementsPerdus += b.filter(e => e.code !== 200).length;
    }
    dire(`LES ${COMBIEN} BATTEMENTS PORTENT LE SCORE SANS SE BOUSCULER`,
        battementsPerdus === 0,
        battementsPerdus ? `${battementsPerdus} perdu(s) sur ${COMBIEN * 3}`
            : `${COMBIEN * 3} battements, tous servis`);
    // ET LE TOTAL DESCENDU EST CELUI DE TOUTE LA CLASSE, pas celui d'un élève :
    // c'est ce nombre-là que la barre montre à trente écrans à la fois.
    const pendant = await appel('/session', {}, jetons[0]);
    const cumul = ((pendant.json || {}).session || {}).defiCumul || {};
    const attendu = COMBIEN * 30 + (COMBIEN * (COMBIEN - 1)) / 2;
    dire('ET LE TOTAL DESCENDU EST BIEN CELUI DES TRENTE',
        cumul.points === attendu && cumul.participants === COMBIEN,
        `${cumul.points} points pour ${cumul.participants} élève(s)`
            + ` — attendu ${attendu} pour ${COMBIEN}`);

    // ── ET TOUT LE MONDE ENVOIE SON SCORE À LA MÊME SECONDE ──────────────
    //
    // C'est le cœur de la mesure. Les trente partent ensemble, sans se céder
    // le passage — exactement ce que fait une classe quand la minute tombe.
    const envois = await Promise.all(jetons.map((j, i) =>
        appel('/defi/score',
            { bonnes: i % 5, total: 5, ms: 1000 + i * 7, points: 100 + i * 13 }, j)));
    const refusés = envois.filter(e => e.code !== 200 || !(e.json || {}).ok);
    const cinqCents = envois.filter(e => e.code >= 500).length;
    dire('LES TRENTE SCORES ARRIVENT, TOUS, DU PREMIER COUP',
        refusés.length === 0,
        refusés.length
            ? `${refusés.length} perdu(s), dont ${cinqCents} erreur(s) serveur — `
                + JSON.stringify(refusés[0]).slice(0, 110)
            : `${envois.length} enregistrés`);

    // ── ET LE CLASSEMENT LES COMPTE TOUS ─────────────────────────────────
    //
    // Le serveur est la seule vérité : un score accepté qui ne se retrouve pas
    // dans le classement serait pire qu'un score refusé, parce que personne ne
    // le saurait.
    const direct = await appel('/teacher/live', { classId: classe.id }, jetonProf);
    const classement = (direct.json || {}).classement || [];
    dire('ET LE CLASSEMENT DU PROFESSEUR LES COMPTE TOUS',
        classement.length === COMBIEN,
        `${classement.length} sur ${COMBIEN}`);

    // ── LE TABLEAU DE L'ÉLÈVE AUSSI, une fois la minute passée ───────────
    //
    // LE MÊME DÉFI, et c'est tout le piège : relancer en aurait ouvert un
    // SECOND, avec une autre date de départ — et les trente scores qu'on vient
    // d'écrire appartiennent au premier. L'épreuve lisait « 0 participant » et
    // accusait le serveur. On attend donc que celui-ci finisse : douze secondes
    // d'annonce plus dix de défi.
    await dormir(24000);
    const vus = await Promise.all(jetons.slice(0, 5).map(j => appel('/session', {}, j)));
    const tableaux = vus.map(v => ((v.json || {}).session || {}).defiTableau).filter(Boolean);
    dire('ET CHAQUE ÉLÈVE VOIT LE MÊME NOMBRE DE PARTICIPANTS',
        tableaux.length === 5 && new Set(tableaux.map(t => t.participants)).size === 1,
        tableaux.length ? `participants vus : ${JSON.stringify(tableaux.map(t => t.participants))}`
            : 'aucun tableau n\'est descendu');

    // ── ET LE JOURNAL DU SERVEUR N'A RIEN CRIÉ ───────────────────────────
    const { readFileSync } = await import('node:fs');
    let cris = [];
    try {
        cris = readFileSync(`${info.bac}/log`, 'utf8').split('\n')
            .filter(l => /Fatal error|Uncaught|is locked|\[500\]/.test(l));
    } catch (e) { /* pas de journal : on ne dira rien de faux */ }
    dire('ET LE SERVEUR N\'A CRIÉ NI ERREUR NI VERROU',
        cris.length === 0, cris.length ? cris[0].replace(/^.*Uncaught /, '').slice(0, 220) : '');
} finally {
    ranger();
}

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
