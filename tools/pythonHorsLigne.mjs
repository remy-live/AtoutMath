// L'ÉDITEUR PYTHON DANS UNE SALLE SANS RÉSEAU.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// C'est la mesure qui a changé l'architecture du bac à sable, et elle doit
// pouvoir être refaite à chaque fois qu'on y touche.
//
// LE BAC À SABLE EST CLOISONNÉ — il le faut, Rémy l'a demandé : « attention que
// le script ne permet pas d'intrusion ». Or un document cloisonné a une origine
// OPAQUE, et une origine opaque n'est pas un « client » du service worker :
//
//   · posé avec `sandbox="allow-scripts"` sur la balise, le document LUI-MÊME
//     n'est pas servi depuis le cache. Mesuré : zéro cadre, « Lancer » mort.
//   · posé par la directive `sandbox` de SA POLITIQUE, le document arrive —
//     la navigation est ordinaire — mais ses SOUS-RESSOURCES, non. Mesuré :
//     le cadre était là, `Sk` absent.
//
// D'où la forme actuelle : la page ne charge RIEN, son script est écrit dedans,
// et Skulpt lui est tendu en texte par l'application — qui, elle, est servie
// par le worker.
//
// RÉMY TRAVAILLE DANS UN COLLÈGE. Le réseau y tombe, et c'est justement là
// qu'il ne faut rien casser.
//
//     node tools/pythonHorsLigne.mjs

import { ouvrirSonde } from './sonde.mjs';

let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

const s = await ouvrirSonde({ largeur: 900, hauteur: 1100 });
await s.identifier();

// ── D'ABORD EN LIGNE : le worker garnit son cache ────────────────────────
console.log('\n\x1b[1mON OUVRE UNE FOIS AVEC LE RÉSEAU\x1b[0m');
await s.ouvrirExercice('algo-python-ecrire', {}, { questions: 3 });
await s.doitExister('[data-code]');
await s.page.waitForTimeout(4000);
dire('l’éditeur s’ouvre', true);

// ── PUIS ON COUPE ────────────────────────────────────────────────────────
console.log('\n\x1b[1mPUIS ON COUPE LE RÉSEAU\x1b[0m');
await s.ctx.setOffline(true);
await s.page.reload();
await s.page.waitForTimeout(2500);
await s.ouvrirExercice('algo-python-ecrire', {}, { questions: 3 });
await s.doitExister('[data-code]');
dire('l’éditeur s’ouvre quand même', true);

await s.page.waitForTimeout(2500);
const cadres = s.page.frames().filter((f) => /bac-python/.test(f.url()));
dire('le bac à sable est arrivé depuis le cache', cadres.length === 1,
    `${cadres.length} cadre(s)`);
if (cadres.length) {
    const etat = await cadres[0].evaluate(
        () => ({ scripts: document.scripts.length, sk: !!(window.Sk && window.Sk.importMainWithBody) }));
    dire('et il ne demande AUCUN fichier', etat.scripts === 1, `${etat.scripts} script(s)`);
    dire('Python lui a été tendu', etat.sk);
}

// ── ET LE PROGRAMME DOIT TOURNER ─────────────────────────────────────────
await s.page.evaluate(() => {
    const c = document.querySelector('[data-code]');
    c.value = 'print("hors ligne")';
    c.dispatchEvent(new Event('input', { bubbles: true }));
});
await s.page.click('[data-lancer]');
const verdict = await s.page.waitForFunction(() => {
    const c = document.querySelector('[data-console]');
    return c && !c.hidden && /pe-console--(ok|ko)/.test(c.className)
        ? c.textContent.replace(/\s+/g, ' ').slice(0, 160) : false;
}, null, { timeout: 25000 }).then((h) => h.jsonValue()).catch(() => null);

dire('le programme TOURNE sans réseau',
    !!verdict && /hors ligne/.test(verdict) && !/n’a pas pu être chargé/.test(verdict),
    verdict ? verdict.slice(0, 90) : 'aucun verdict');
dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
dire('aucune fenêtre native', s.fenetresNatives.length === 0);

console.log('\n' + '─'.repeat(70));
console.log(rates === 0
    ? '\x1b[32mLA SALLE SANS RÉSEAU TIENT.\x1b[0m'
    : `\x1b[31m${rates} POINT(S) À REVOIR.\x1b[0m`);
await s.fermer();
process.exit(rates === 0 ? 0 : 1);
