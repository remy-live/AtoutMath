// LE CARNET PROPRE À L'EXERCICE, ET LE ✓ QUI RESTE ARMÉ.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/carnetEtArmement.mjs
//
// RÉMY, capture de l'Atelier v1089 à l'appui :
//
//   « dans l'atelier, le carnet doit être propre à l'exercice »
//
//   « Dans ce qui permet de passer la question, tu as un check vert et une
//     croix. il faudrait qu'il soit persistant d'une question sur l'autre.
//     Comme cela je peux passer rapidement en voyant ce que ça fait d'être
//     bon. »
//
// CE QU'ON MESURE, et pourquoi chaque ligne y est :
//
//   · LE CARNET SUIT L'EXERCICE, DANS LES DEUX SENS. Qu'il se vide en changeant
//     d'exercice ne suffit pas : il doit REVENIR quand on revient. Un carnet
//     qui se vide ET ne revient pas n'est pas « propre à l'exercice », c'est
//     un carnet qu'on perd.
//   · LE ✓ ARMÉ RÉPOND TOUT SEUL, et le compteur de questions est la preuve :
//     on ne clique qu'UNE fois et l'on regarde le rang avancer.
//   · ET LE SECOND CLIC ARRÊTE. Un régime qu'on ne peut pas arrêter est pire
//     qu'un régime absent.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

const s = await ouvrirSonde({ largeur: 1600, hauteur: 1000 });
await s.identifier();
await s.page.evaluate(async () => {
    const m = await import('./js/ui/atelier.js');
    m.ouvrirAtelier('num-encadrement');
});
await dormir(3500);

console.log('\nLE CARNET EST PROPRE À L\'EXERCICE\n' + '─'.repeat(64));
const ecrire = (t) => s.page.evaluate((texte) => {
    const n = document.getElementById('atl-notes');
    n.value = texte;
    n.dispatchEvent(new Event('input', { bubbles: true }));
}, t);
const lire = () => s.page.evaluate(() =>
    (document.getElementById('atl-notes').value || '').trim());
const allerA = async (id) => {
    await s.page.evaluate((exo) => {
        const sel = document.getElementById('atl-exo');
        sel.value = exo;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, id);
    await dormir(2500);
};

await ecrire('la note de l encadrement');
dire('on écrit dans le carnet', (await lire()).length > 0);
await allerA('num-divisibilite');
const apresChangement = await lire();
dire('changer d\'exercice vide le carnet', apresChangement === '',
    `« ${apresChangement} »`);
await ecrire('la note de la divisibilite');
await allerA('num-encadrement');
const revenu = await lire();
dire('et revenir RAMÈNE la note du premier', revenu === 'la note de l encadrement',
    `« ${revenu} »`);
await allerA('num-divisibilite');
const revenu2 = await lire();
dire('chacune reste rangée sous la sienne', revenu2 === 'la note de la divisibilite',
    `« ${revenu2} »`);

console.log('\nLE ✓ SE COCHE, ET C\'EST LE « ❯ » QUI L\'APPLIQUE\n' + '─'.repeat(64));
await allerA('num-encadrement');

const dansLeJeu = (fn) => s.page.evaluate((code) => {
    const d = document.getElementById('atl-jeu').contentDocument;
    if (!d) return null;
    // eslint-disable-next-line no-new-func
    return new Function('d', code)(d);
}, fn);

// ON MESURE CE QUE RÉMY VOIT, pas l'état interne : le compteur de questions,
// les points, et la question à l'écran. Les points sont la preuve qu'une
// question a été COMPTÉE juste — « en ayant bon », dans ses mots.
const etat = () => dansLeJeu(`
    const l = d.getElementById('preview-question-label');
    const j = d.getElementById('btn-preview-juste');
    const k = d.getElementById('btn-preview-faux');
    const n = d.getElementById('btn-preview-next-q');
    const b = d.getElementById('btn-score');
    return {
        rang: l ? (l.textContent || '').trim() : '',
        visible: !!(j && !j.hidden),
        coche: !!(j && j.classList.contains('preview-arme')),
        cocheFaux: !!(k && k.classList.contains('preview-arme')),
        titre: j ? j.title : '',
        suivantMort: !!(n && n.disabled),
        points: b ? Number((b.textContent || '0').replace(/[^0-9]/g, '')) : -1,
        progres: ((d.getElementById('game-progress-text') || {}).textContent || '').trim(),
        question: ((d.querySelector('.game-question, .numpad-context') || {}).innerText || '')
            .replace(/\s+/g, ' ').slice(0, 40)
    };`);

// « 1 / 10 » est écrit EN DUR dans index.html — c'est le libellé de repos du
// compteur. Un placeholder rend la même réponse qu'un logiciel prêt : on
// attend donc un signe qui ne peut PAS venir du HTML au repos.
const attendre = async (quoi, ms = 20000) => {
    const t0 = Date.now();
    for (;;) {
        const v = await etat();
        if (v && quoi(v)) return v;
        if (Date.now() - t0 > ms) return v;
        await dormir(350);
    }
};

let vu = await attendre(v => v.visible && /^\d+\/\d+$/.test(v.rang));
dire('la barre du professeur est prête, avec son compteur', /^\d+\/\d+$/.test(vu.rang), vu.rang);
dire('le ✓ se voit et n\'est pas encore coché', vu.visible && !vu.coche, vu.titre);

// ── COCHER NE RÉPOND PAS, ET N'AVANCE PAS ────────────────────────────────
const avant = await etat();
await dansLeJeu(`d.getElementById('btn-preview-juste').click(); return true;`);
const coche = await attendre(v => v.coche, 4000);
dire('un clic le coche, et l\'infobulle dit ce que le ❯ fera', coche.coche, coche.titre);
await dormir(2500);
const apresCoche = await etat();
dire('mais il n\'a RIEN répondu et RIEN avancé',
    apresCoche.rang === avant.rang && apresCoche.points === avant.points
        && apresCoche.question === avant.question,
    `rang ${avant.rang} → ${apresCoche.rang}, points ${avant.points} → ${apresCoche.points}`);

// ── UN APPUI SUR ❯ : LA QUESTION EST COMPTÉE JUSTE, ET ON PASSE ──────────
const totalQ = Number(apresCoche.rang.split('/')[1]);
await dansLeJeu(`d.getElementById('btn-preview-next-q').click(); return true;`);
const apresUn = await attendre(v => v.points > apresCoche.points, 12000);
dire('un appui sur ❯ compte la question JUSTE et passe à la suivante',
    apresUn.points > apresCoche.points && apresUn.question !== apresCoche.question,
    `points ${apresCoche.points} → ${apresUn.points}, ${apresCoche.progres} → ${apresUn.progres}`);
dire('et la case reste cochée pour la suivante', apresUn.coche);

// ── JUSQU'À LA DERNIÈRE, UN APPUI PAR QUESTION ───────────────────────────
//
// ON MESURE LE BOUT, PAS UN SEUIL. La sonde d'avant demandait « a-t-il avancé
// d'au moins DEUX ? » et répondait « 1 → 3 : ok » — deux questions sur douze
// satisfont ce seuil exactement comme douze, donc une série qui cale serait
// passée au vert, et j'ai écrit « c'est mesuré » à quelqu'un qui voyait le
// contraire.
let appuis = 1;
let e = apresUn;
const fait = (v) => Number((v.progres.match(/^(\d+)/) || [0, 0])[1]);
for (let i = 0; i < totalQ + 6 && fait(e) < totalQ; i++) {
    const avantCe = fait(e);
    const bouge = await dansLeJeu(`
        const n = d.getElementById('btn-preview-next-q');
        if (n && !n.disabled) { n.click(); return true; }
        return false;`);
    if (!bouge) break;
    appuis++;
    e = await attendre(v => fait(v) > avantCe, 12000);
    if (fait(e) === avantCe) break;
}
// UN APPUI PAR QUESTION, ET PAS PLUS : c'est la promesse. Le compte se lit sur
// la barre de progression, pas sur les points — une marche interne peut
// rapporter des points sans consommer de question, et j'ai d'abord compté les
// points, ce qui annonçait « 19 appuis » sur un exercice de douze.
dire('on va jusqu\'au BOUT, un appui par question',
    fait(e) >= totalQ && appuis <= totalQ,
    `${e.progres} en ${appuis} appui(s), ${e.points} points`);

// ── ET LE ROUGE COMPTE FAUX, SANS DONNER DE POINT ────────────────────────
await allerA('num-divisibilite');
const neuve = await attendre(v => v.visible && /^\d+\/\d+$/.test(v.rang), 20000);
dire('la case reste cochée d\'un exercice à l\'autre', neuve.coche, neuve.titre);
await dansLeJeu(`d.getElementById('btn-preview-faux').click(); return true;`);
const laCroix = await attendre(v => v.cocheFaux && !v.coche, 4000);
dire('cocher la croix décoche le ✓', laCroix.cocheFaux && !laCroix.coche);
const avantRouge = await etat();
await dansLeJeu(`d.getElementById('btn-preview-next-q').click(); return true;`);
const apresRouge = await attendre(v => v.question !== avantRouge.question, 12000);
dire('un appui sur ❯ compte FAUX et passe quand même',
    apresRouge.question !== avantRouge.question && apresRouge.points === avantRouge.points,
    `points ${avantRouge.points} → ${apresRouge.points}, question changée`);

// ── ET DÉCOCHER REND LE ❯ À SON ANCIEN MÉTIER ────────────────────────────
await dansLeJeu(`d.getElementById('btn-preview-faux').click(); return true;`);
const decoche = await attendre(v => !v.cocheFaux, 4000);
dire('un second clic décoche', !decoche.cocheFaux);
const avantSaut = await etat();
await dansLeJeu(`d.getElementById('btn-preview-next-q').click(); return true;`);
await dormir(2200);
const apresSaut = await etat();
dire('et le ❯ saute alors sans rien compter',
    apresSaut.points === avantSaut.points && apresSaut.progres === avantSaut.progres,
    `points ${avantSaut.points} → ${apresSaut.points}, ${avantSaut.progres} → ${apresSaut.progres}`);

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(gris(s.erreurs.slice(0, 3).join('\n')));
console.log(ratés === 0 ? vert('\nLE CARNET SUIT L\'EXERCICE, ET LE ✓ RESTE ARMÉ.')
    : rouge(`\n${ratés} mesure(s) manquée(s).`));
await s.fermer();
process.exit(ratés === 0 ? 0 : 1);
