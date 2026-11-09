// TRENTE ÉLÈVES SUR UN PLATEAU QUI BOUGE EN TEMPS RÉEL : EST-CE QUE ÇA TIENT ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/plateauEnTempsReel.mjs [combien] [battements/s] [secondes]
//   node tools/plateauEnTempsReel.mjs 30 1 20        (les valeurs par défaut)
//
// RÉMY : « on pourrait un peu façon tournoi mettre tous les élèves sur un
// plateau et jouer en temps réel ? […] je voulais savoir pour tester est-ce que
// je peux mettre 30 élèves sur un plateau et qu'il bouge en temps réel ».
//
// ── LA QUESTION EST DE DÉBIT, ET ELLE NE SE DEVINE PAS ────────────────────
//
// Un plateau en temps réel, c'est chaque ardoise qui parle au serveur À LA
// SECONDE au lieu de toutes les dix. Trente ardoises à une seconde font TRENTE
// REQUÊTES PAR SECONDE là où le défi d'aujourd'hui en fait trois. On ne
// répond pas à ça par un avis : on le mesure.
//
// ET C'EST LA MÊME REQUÊTE QUI FAIT LES DEUX : elle monte le score de l'élève
// et redescend le total de la classe. Un plateau n'a donc besoin d'AUCUNE
// route nouvelle — seulement d'un rythme plus serré. C'est précisément ce
// rythme qu'on met à l'épreuve ici.
//
// ── CE QUE CETTE SONDE MESURE, ET CE QU'ELLE NE PEUT PAS MESURER ──────────
//
// ELLE MESURE, sur le vrai serveur PHP + SQLite du dépôt :
//   · combien de battements passent, et combien sont refusés ou tombent en 500 ;
//   · le temps de réponse — médiane, neuvième décile, pire cas ;
//   · si le plateau BOUGE vraiment : à chaque seconde, chaque ardoise voit-elle
//     un total différent de celui d'avant ?
//   · et le seul nombre qui dit « temps réel » : quand UN élève fait un bond,
//     au bout de combien de temps les VINGT-NEUF AUTRES le voient-ils ?
//   · si le serveur a crié un verrou SQLite, le défaut qui a coûté à Rémy un
//     tiers de son podium la semaine dernière.
//
// ELLE NE PEUT PAS DIRE si l'hébergement mutualisé de Rémy acceptera ce débit :
// ça, c'est une limite de son hébergeur, pas du logiciel. MAIS le site d'essai
// tourne avec QUATRE processus PHP (`PHP_CLI_SERVER_WORKERS=4`, voir
// `tools/siteEssai.php`), là où un mutualisé en accorde ordinairement dix à
// vingt-cinq : ce qui passe ici est donc un PLANCHER, pas un plafond.

import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';

const COMBIEN = Math.max(2, Number(process.argv[2]) || 30);
const PAR_SECONDE = Math.max(0.1, Number(process.argv[3]) || 1);
const SECONDES = Math.max(4, Number(process.argv[4]) || 20);
const PAS_MS = Math.round(1000 / PAR_SECONDE);
const TICS = Math.max(4, Math.round(SECONDES * PAR_SECONDE));
// LE BOND : un élève marque cinq cents points d'un coup, au milieu de la
// mesure. C'est le pion qui saute sur le plateau — et la seule façon de savoir
// en combien de temps les autres le voient.
const BOND = 200;
const QUAND_LE_BOND = Math.floor(TICS / 2);

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};
const dit = (q, d) => console.log(`  \x1b[2m·\x1b[0m ${q} \x1b[2m— ${d}\x1b[0m`);

/** La médiane et le neuvième décile d'une liste de durées. */
const quantile = (liste, part) => {
    if (!liste.length) return 0;
    const t = [...liste].sort((a, b) => a - b);
    return Math.round(t[Math.min(t.length - 1, Math.floor(t.length * part))]);
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

/** Une requête à l'API, chronométrée, et dont on pèse la réponse. */
async function appel(route, corps, jeton) {
    const parti = Date.now();
    try {
        const r = await fetch(API + route, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(jeton ? { Authorization: 'Bearer ' + jeton } : {})
            },
            body: JSON.stringify(corps || {})
        });
        const texte = await r.text();
        let json = null;
        try { json = JSON.parse(texte); } catch (e) { json = null; }
        return { code: r.status, json, ms: Date.now() - parti, octets: texte.length };
    } catch (e) {
        // UNE CONNEXION REFUSÉE EST UNE MESURE, pas un plantage de la sonde :
        // c'est exactement ce qui arriverait à l'ardoise d'un élève si le
        // serveur n'acceptait plus de connexion.
        return { code: 0, json: null, ms: Date.now() - parti, octets: 0,
                 panne: String(e.message || e).slice(0, 80) };
    }
}

try {
    console.log(`\nTRENTE ARDOISES SUR UN PLATEAU — ${COMBIEN} élèves, `
        + `${PAR_SECONDE} battement(s)/s pendant ${SECONDES} s`);
    console.log('─'.repeat(70));

    const prof = await appel('/teacher/login', { email: info.email, password: info.mdp });
    const jetonProf = (prof.json || {}).token || '';
    if (!jetonProf) throw new Error('le professeur n\'entre pas : ' + JSON.stringify(prof.json));
    await appel('/teacher/classes', { action: 'create', name: 'Le plateau' }, jetonProf);
    const liste = await appel('/teacher/classes', { action: 'list' }, jetonProf);
    const classe = ((liste.json || {}).classes || []).find(c => c.name === 'Le plateau');
    if (!classe) throw new Error('classe introuvable');

    const billets = Array.from({ length: COMBIEN }, (_, i) => {
        const n = String(i + 1).padStart(2, '0');
        return { nom: `Eleve${n} Plateau`, login: `plat.${n}`, code: `PLAT${n}` };
    });
    await appel('/teacher/roster', {
        classId: classe.id, action: 'importer',
        liste: billets.map(b => `${b.nom} ; ${b.login} ; ${b.code}`).join('\n')
    }, jetonProf);
    const entrees = await Promise.all(billets.map(b =>
        appel('/login', { login: b.login, code: b.code })));
    const jetons = entrees.map(e => (e.json || {}).token || '');
    dire(`LES ${COMBIEN} ÉLÈVES SONT ENTRÉS`, jetons.every(Boolean),
        `${jetons.filter(Boolean).length} jetons`);

    // UN DÉFI AVEC BUT ET ÉQUIPES : c'est le réglage le PLUS CHER pour le
    // serveur, puisqu'il l'oblige à additionner les trente lignes et à les
    // ranger en deux équipes à chaque battement. On mesure le pire cas.
    const lance = await appel('/teacher/class', {
        classId: classe.id, action: 'jeu', jeu: 'plateau',
        secondes: Math.max(60, SECONDES + 40),
        reglages: { operation: '×', style: 'question' }
    }, jetonProf);
    dire('LE JEU DE CLASSE TOURNE', ((lance.json || {}).ok) === true,
        (lance.json || {}).dit || JSON.stringify(lance.json));

    // ── LA MESURE : TOUT LE MONDE BAT, EN MÊME TEMPS, À CHAQUE SECONDE ───
    //
    // On ne décale pas les ardoises entre elles, et c'est délibéré : des
    // battements répartis dans la seconde seraient plus doux pour le serveur,
    // mais on ne saurait pas s'il tient le pire cas. Dans une vraie classe ils
    // se décalent tout seuls ; ici on les fait partir ensemble.
    const temps = [];
    const codes = new Map();
    const vus = Array.from({ length: COMBIEN }, () => []);
    let octetsMax = 0;
    const departMesure = Date.now();
    for (let t = 0; t < TICS; t++) {
        const debutTic = Date.now();
        const reponses = await Promise.all(jetons.map((j, i) => appel('/jeu', {
            // CHACUN BOUGE ET MARQUE. C'est exactement ce qu'une ardoise envoie
            // pendant une partie : une position, un nombre porté, un score.
            x: 1 + ((t + i) % 14), y: 1 + ((t * 2 + i) % 7),
            nombre: 2 + (i % 8),
            // LES POINTS LIBRES RESTENT PETITS, et c'est le serveur qui
            // l'impose : il les borne au temps écoulé (une seconde perchée
            // vaut un point). La sonde ne cherche donc pas à les faire
            // exploser — elle vérifie ailleurs que ce plafond tient.
            points: Math.min(t, 60),
            // ET UN SUR TROIS RÉCLAME UNE PRISE, dont beaucoup LA MÊME : c'est
            // la bousculade qu'on vient mesurer, celle où deux élèves ramassent
            // le même nombre dans la même demi-seconde.
            //
            // LE BOND PASSE PAR UNE PRISE, et c'est la correction d'une sonde
            // qui mesurait mal : elle le faisait passer par les points libres,
            // que le serveur borne — à juste titre. Une prise est le VRAI
            // chemin par lequel un élève fait bondir le score de sa classe.
            ...(i === 0 && t === QUAND_LE_BOND
                ? { prise: { quoi: `bond-${t}`, equipe: 0, points: BOND } }
                : (i % 3 === 0
                    ? { prise: { quoi: `c-${t}-${i % 4}`, equipe: i % 2, points: 1 } }
                    : {}))
        }, j)));
        reponses.forEach((r, i) => {
            temps.push(r.ms);
            codes.set(r.code, (codes.get(r.code) || 0) + 1);
            octetsMax = Math.max(octetsMax, r.octets);
            const sc = (r.json || {}).scores;
            vus[i].push(Array.isArray(sc) ? sc[0] + sc[1] : null);
        });
        const reste = PAS_MS - (Date.now() - debutTic);
        if (reste > 0) await dormir(reste);
    }
    const duree = (Date.now() - departMesure) / 1000;

    // ── CE QUE ÇA A DONNÉ ────────────────────────────────────────────────
    const total = TICS * COMBIEN;
    const servis = codes.get(200) || 0;
    const pannes = total - servis;
    dire(`LES ${total} BATTEMENTS SONT TOUS SERVIS`, pannes === 0,
        pannes ? `${pannes} perdu(s) — codes : ${JSON.stringify([...codes])}`
            : `${servis} sur ${total}`);
    // LE DÉBIT RÉELLEMENT TENU. S'il s'effondre sous la cadence demandée, le
    // serveur ne suit pas — même sans erreur, le plateau traînerait.
    const debit = total / duree;
    dire('ET LE DÉBIT DEMANDÉ EST TENU',
        debit >= COMBIEN * PAR_SECONDE * 0.8,
        `${debit.toFixed(1)} requêtes/s tenues sur ${(COMBIEN * PAR_SECONDE).toFixed(1)} demandées`
            + ` (${duree.toFixed(1)} s pour ${total})`);
    dit('temps de réponse', `médiane ${quantile(temps, 0.5)} ms · `
        + `9e décile ${quantile(temps, 0.9)} ms · pire ${Math.max(...temps)} ms`);
    // LE POIDS DE LA RÉPONSE, ET CE QU'UN PLATEAU Y AJOUTERAIT. Trente
    // positions, c'est trente nombres : on peut le chiffrer plutôt que le
    // craindre.
    dit('poids de la réponse', `${octetsMax} octets pour ${COMBIEN} pions`);

    // ── L'ARBITRAGE, À TRENTE ET POUR DE VRAI ────────────────────────────
    //
    // UN SUR TROIS A RÉCLAMÉ UNE PRISE À CHAQUE SECONDE, et plusieurs LA MÊME.
    // C'est la situation normale d'un jeu à trente, pas un cas limite. Si deux
    // élèves pouvaient prendre le même nombre, le total de la classe
    // dépasserait ce qu'il y avait à prendre — et le tableau mentirait devant
    // tout le monde.
    const dernier = await appel('/jeu', { x: 1, y: 1, nombre: 2 }, jetons[0]);
    const monde = dernier.json || {};
    dire(`CHAQUE ARDOISE VOIT LES ${COMBIEN} AUTRES`,
        (monde.pions || []).length === COMBIEN,
        `${(monde.pions || []).length} pion(s) sur ${COMBIEN}`);
    const uniques = new Set(monde.prises || []);
    dire('ET AUCUN NOMBRE N\'A ÉTÉ PRIS DEUX FOIS',
        uniques.size === (monde.prises || []).length && uniques.size > 0,
        `${(monde.prises || []).length} prise(s), ${uniques.size} distincte(s)`);

    // ── LE PLATEAU BOUGE-T-IL ? ──────────────────────────────────────────
    //
    // Un plateau qui ne bouge pas n'est pas un plateau. On compte, pour chaque
    // ardoise, combien de secondes ont montré un total DIFFÉRENT de la seconde
    // d'avant.
    let changements = 0;
    let occasions = 0;
    for (const suite of vus) {
        for (let t = 1; t < suite.length; t++) {
            if (suite[t] === null || suite[t - 1] === null) continue;
            occasions++;
            if (suite[t] !== suite[t - 1]) changements++;
        }
    }
    const part = occasions ? Math.round((changements / occasions) * 100) : 0;
    dire('LE PLATEAU BOUGE À CHAQUE SECONDE, sur toutes les ardoises',
        part >= 95, `${part} % des secondes montrent un total neuf`);

    // ── ET LE VRAI NOMBRE : LA LATENCE DU PLATEAU ────────────────────────
    //
    // Un élève fait un bond de cinq cents points. Au bout de combien de temps
    // les vingt-neuf autres le voient-ils ? C'est ÇA, « en temps réel » — et
    // c'est la seule mesure qui réponde à la question de Rémy.
    const avant = vus.map(s => s[QUAND_LE_BOND - 1]);
    const apres = vus.map(s => s[QUAND_LE_BOND + 1]);
    const voient = avant.filter((v, i) => v !== null && apres[i] !== null
        && apres[i] - v >= BOND).length;
    dire('LE BOND D\'UN ÉLÈVE EST VU PAR TOUS LES AUTRES EN UNE SECONDE',
        voient === COMBIEN,
        `${voient} ardoise(s) sur ${COMBIEN} l'ont vu au battement suivant`);

    // ── ET LE SERVEUR N'A RIEN CRIÉ ──────────────────────────────────────
    const { readFileSync } = await import('node:fs');
    let cris = [];
    try {
        cris = readFileSync(`${info.bac}/log`, 'utf8').split('\n')
            .filter(l => /Fatal error|Uncaught|is locked|\[500\]/.test(l));
    } catch (e) { /* pas de journal : on ne dira rien de faux */ }
    dire('ET LE SERVEUR N\'A CRIÉ NI ERREUR NI VERROU SQLITE',
        cris.length === 0,
        cris.length ? `${cris.length} cri(s) — ` + cris[0].replace(/^.*Uncaught /, '').slice(0, 180) : '');

    console.log('\n' + '─'.repeat(70));
    console.log(`  Le site d'essai tourne avec QUATRE processus PHP, là où un`);
    console.log(`  mutualisé en accorde ordinairement dix à vingt-cinq.`);
    console.log(`  Ce qui passe ici est donc un plancher, pas un plafond.`);
} finally {
    ranger();
}

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mLE PLATEAU TIENT.\x1b[0m');
process.exit(ratés ? 1 : 0);
