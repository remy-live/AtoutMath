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

console.log('\nLE ✓ RESTE ARMÉ D\'UNE QUESTION SUR L\'AUTRE\n' + '─'.repeat(64));
await allerA('num-encadrement');

const dansLeJeu = (fn, arg) => s.page.evaluate(([code, a]) => {
    const d = document.getElementById('atl-jeu').contentDocument;
    if (!d) return null;
    // eslint-disable-next-line no-new-func
    return new Function('d', 'a', code)(d, a);
}, [fn, arg]);

const etat = () => dansLeJeu(`
    const l = d.getElementById('preview-question-label');
    const j = d.getElementById('btn-preview-juste');
    return {
        rang: l ? (l.textContent || '').trim() : '',
        visible: !!(j && !j.hidden),
        arme: !!(j && j.classList.contains('preview-arme')),
        titre: j ? j.title : ''
    };`);

// ON ATTEND QUE LE VOLET SOIT VRAIMENT PRÊT.
//
// « 1 / 10 » est écrit EN DUR dans index.html — c'est le libellé de repos du
// compteur. Mesuré : la première version de cette sonde lisait ce texte-là et
// croyait mesurer un exercice en cours, à l'instant où le volet n'avait même
// pas démarré. Un placeholder rend la même réponse qu'un logiciel prêt : on
// attend donc un signe qui ne peut PAS venir du HTML au repos — le bouton
// visible, c'est-à-dire une question à laquelle répondre.
const attendre = async (quoi, ms = 20000) => {
    const t0 = Date.now();
    for (;;) {
        const v = await etat();
        if (v && quoi(v)) return v;
        if (Date.now() - t0 > ms) return v;
        await dormir(400);
    }
};

let vu = await attendre(v => v.visible && /^\d+\/\d+$/.test(v.rang));
dire('la barre du professeur est prête, avec son compteur', /^\d+\/\d+$/.test(vu.rang), vu.rang);
dire('le ✓ se voit et n\'est pas encore armé', vu.visible && !vu.arme, vu.titre);

// UN SEUL CLIC. Tout ce qui suit doit se faire sans y retoucher.
const depart = Number(vu.rang.split('/')[0]);
await dansLeJeu(`d.getElementById('btn-preview-juste').click(); return true;`);
const arme = await attendre(v => v.arme, 4000);
dire('un clic l\'arme, et ça se voit', arme.arme, arme.titre);

// ON MESURE LE BOUT, PAS UN SEUIL.
//
// RÉMY : « oui enfin il est armé mais ca n'avance pas tout seul qd même pour
// le check vert ! » — puis, après avoir réessayé : « en fait ca avance tout
// seul des que je clique sur le vert ».
//
// Il avait raison les deux fois, et c'est la SONDE qui était en cause. Elle
// demandait « le rang a-t-il avancé d'au moins DEUX ? » et répondait « 1 → 3 :
// ok ». Deux questions sur douze satisfont ce seuil exactement comme douze :
// une série qui démarre puis cale serait passée au vert, et j'aurais répondu
// « c'est mesuré » à quelqu'un qui voyait le contraire.
//
// La promesse est « ça défile jusqu'au bout » — on attend donc la DERNIÈRE
// question, et l'on dit où l'on s'est arrêté quand ce n'est pas elle.
const total = Number(vu.rang.split('/')[1]);
const avance = await attendre(v => Number(v.rang.split('/')[0]) >= total, 90000);
const arrive = Number(avance.rang.split('/')[0]);
dire('elles se répondent toutes seules JUSQU\'À LA DERNIÈRE', arrive >= total,
    `${depart} → ${arrive} sur ${total}, sans un clic de plus`);
dire('et il est toujours armé', avance.arme);

await dansLeJeu(`d.getElementById('btn-preview-juste').click(); return true;`);
const stop = await attendre(v => !v.arme, 4000);
dire('le second clic désarme', !stop.arme, stop.titre);
const rangStop = Number(stop.rang.split('/')[0]);
await dormir(6000);
const fini = await etat();
dire('et plus rien ne bouge ensuite', Number(fini.rang.split('/')[0]) === rangStop,
    `${stop.rang} → ${fini.rang} en 6 s`);

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(gris(s.erreurs.slice(0, 3).join('\n')));
console.log(ratés === 0 ? vert('\nLE CARNET SUIT L\'EXERCICE, ET LE ✓ RESTE ARMÉ.')
    : rouge(`\n${ratés} mesure(s) manquée(s).`));
await s.fermer();
process.exit(ratés === 0 ? 0 : 1);
