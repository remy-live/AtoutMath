// CE QUE COÛTE AU SERVEUR UNE CLASSE ENTIÈRE SUR LE PLATEAU.
//
//   node tools/chargeDuPlateau.mjs [élèves=30] [secondes=20]
//
// Rémy, 27 novembre : « le jeu de plateau ne fonctionne pas […] je pense que le
// réseau n'a pas supporté, ce n'est pas du tout fluide ». Chaque ardoise envoie
// UN battement par seconde à `/jeu` (sa position, son nombre) et reçoit le
// monde entier en retour. Trente élèves, c'est trente requêtes par seconde.
//
// La sonde crée une vraie classe, lance un vrai plateau par la fonction du
// bouton, connecte chaque élève par la route `/login`, puis fait battre trente
// ardoises en même temps, au rythme des vraies. Elle imprime le temps de
// réponse (médiane, neuvième décile, pire) et le nombre de battements perdus.
//
// LE SERVEUR D'ESSAI EST `php -S`, QUI NE SERT QU'UNE REQUÊTE À LA FOIS. C'est
// pire qu'un hébergement réel : si ça tient ici, ça tient là-bas. Si ça ne
// tient pas ici, ça ne dit pas encore que ça ne tient pas là-bas.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';

const COMBIEN = Number(process.argv[2]) || 30;
const SECONDES = Number(process.argv[3]) || 20;
const PORT = String(9700 + Math.floor(Math.random() * 200));
const serveur = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'inherit'] });
let info = null;
for await (const bout of serveur.stdout) {
    const l = String(bout).split('\n').find(x => x.trim().startsWith('{'));
    if (l) { info = JSON.parse(l); break; }
}
const BASE = `http://127.0.0.1:${PORT}`;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const appel = async (chemin, corps, jeton) => {
    const t = performance.now();
    const r = await fetch(`${BASE}/api${chemin}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
        body: JSON.stringify(corps)
    });
    const json = await r.json().catch(() => ({}));
    return { ok: r.ok, ms: performance.now() - t, json };
};

try {
    const prof = await nav.newPage();
    await prof.goto(`${BASE}/index.html`);
    await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    await prof.evaluate(async ([e, m]) => {
        const { identifierProf } = await import('./js/core/verrouProf.js');
        await identifierProf(e, m);
    }, [info.email, info.mdp]);
    await prof.reload();
    await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    const classe = await prof.evaluate(async (n) => {
        const { creerClasse, apercuDeListe, importerListe, listeDeClasse, lancerUnJeuDeClasse } =
            await import('./js/core/espaceProf.js');
        const c = await creerClasse('4P', '4e');
        const noms = Array.from({ length: n }, (_, i) => `Élève${String.fromCharCode(65 + (i % 26))} Numéro${i}`).join('\n');
        const ap = await apercuDeListe(c.id, noms + '\n', '');
        await importerListe(c.id, ap.apercu.texte);
        const l = await listeDeClasse(c.id);
        const lance = await lancerUnJeuDeClasse(c.id, 'plateau', 180, {});
        return { id: c.id, eleves: l.eleves || [], lance };
    }, COMBIEN);
    console.log(`${classe.eleves.length} élèves, plateau lancé : ${!!(classe.lance && classe.lance.ok)}`);
    const jetons = [];
    for (const e of classe.eleves) {
        const r = await appel('/login', { login: e.login, code: e.code, deviceId: `sonde-${e.login}` });
        if (r.json.token) jetons.push(r.json.token);
    }
    console.log(`${jetons.length} élèves connectés. Battement d'une seconde, pendant ${SECONDES} s…`);
    await dormir(13000); // le départ est annoncé douze secondes à l'avance

    const temps = [];
    let perdus = 0;
    let vusAuPlus = 0;
    const fin = Date.now() + SECONDES * 1000;
    await Promise.all(jetons.map(async (j, i) => {
        await dormir(Math.random() * 1000); // trente ardoises ne battent pas à la même milliseconde
        let x = 1 + (i % 10), y = 1 + (i % 6);
        while (Date.now() < fin) {
            const depart = Date.now();
            x += 0.3; if (x > 11) x = 1;
            try {
                const r = await appel('/jeu', { x, y, nombre: 2 + (i % 8), points: 0, malus: 0 }, j);
                if (!r.ok) perdus++; else { temps.push(r.ms); vusAuPlus = Math.max(vusAuPlus, (r.json.pions || []).length); }
            } catch (e) { perdus++; }
            await dormir(Math.max(0, 1000 - (Date.now() - depart)));
        }
    }));
    temps.sort((a, b) => a - b);
    const q = (p) => Math.round(temps[Math.min(temps.length - 1, Math.floor(p * temps.length))]);
    console.log(`\n${temps.length} battements servis, ${perdus} perdus, ${vusAuPlus} pions dans le monde.`);
    console.log(`Temps de réponse : médiane ${q(0.5)} ms · 9e décile ${q(0.9)} ms · pire ${Math.round(temps[temps.length - 1])} ms`);
    console.log(`Rythme tenu : ${(temps.length / SECONDES / jetons.length).toFixed(2)} battement par élève et par seconde (1 attendu).`);
} finally {
    await nav.close();
    serveur.kill();
}
