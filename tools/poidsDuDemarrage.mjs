// CE QUE COÛTE UNE OUVERTURE — ET QU'UN DÉPÔT ARRIVE ENCORE CHEZ L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, quand je lui ai dit que le chargement me semblait cher : « pour le site
// atout-math.fr où je dépose l'archive ça ne recharge pas à chaque fois si ? »
//
// IL AVAIT RAISON DE DEMANDER, ET J'AI DÛ M'Y REPRENDRE À TROIS FOIS POUR
// MESURER. Les deux premiers instruments mentaient, chacun à sa façon :
//
//   · compter les réponses du navigateur et sommer leurs corps : le serveur
//     d'essai n'envoie ni `Last-Modified` ni `ETag`, donc tout repart en 200
//     complet. Chez Rémy, Apache répond 304. La mesure disait « 7,8 Mo à
//     chaque ouverture » — c'était un défaut du BANC, pas du logiciel ;
//   · et surtout, une réponse servie PAR LE SERVICE WORKER depuis son cache
//     apparaît quand même dans `page.on('response')`, avec un corps complet.
//     On comptait donc comme trafic ce qui ne quittait jamais la machine.
//
// ON COMPTE DONC DANS LE JOURNAL DU SERVEUR, qui ne voit que ce qui lui est
// vraiment demandé. C'est la seule mesure qu'on puisse opposer à quelqu'un.
//
// MESURÉ AVEC CET INSTRUMENT, avant et après le passage du worker en « cache
// d'abord » (sw.js) :
//
//                                      avant    après
//   première ouverture (poste neuf)      624      602
//   toutes les ouvertures suivantes      382        2
//
// LES 602 DE LA PREMIÈRE NE SONT PAS UNE ERREUR : 382 pour la page, puis le
// worker va chercher ce que la page a chargé pour le ranger (voir `garnir`
// dans index.html). C'est le prix d'un lendemain de dépôt, et il ne bouge pas.
//
// ET LA SECONDE MOITIÉ DE CETTE SONDE EST LA PLUS IMPORTANTE. Servir depuis un
// cache est exactement la façon de figer trente élèves sur du vieux code sans
// qu'une seule requête échoue. On simule donc un dépôt — on monte le numéro de
// version dans sw.js, comme le ferait `tools/version.mjs` — et l'on vérifie que
// l'élève qui rouvre reçoit bien la version neuve.
//
//   node tools/poidsDuDemarrage.mjs
//
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
import { readFileSync, writeFileSync } from 'node:fs';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

const SW = new URL('../sw.js', import.meta.url);
const SW_ORIGINE = readFileSync(SW, 'utf8');

const s = await ouvrirSonde({ largeur: 1100, hauteur: 800 });
const JOURNAL = s.info.bac + '/log';

/** Combien de requêtes le SERVEUR a vues jusqu'ici. */
const vues = () => {
    try {
        return readFileSync(JOURNAL, 'utf8').split('\n').filter((l) => /GET |POST /.test(l)).length;
    } catch (e) { return 0; }
};

async function ouvrir(quoi, recharger = false, attendre = 6000) {
    const avant = vues();
    if (recharger) await s.page.reload();
    else await s.page.goto(`http://127.0.0.1:${s.port}/index.html`);
    await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    // LE WORKER RANGE SON CACHE APRÈS COUP, et la page le relance au bout de
    // huit secondes pour ramasser ce qui s'est chargé à la demande. Mesurer
    // trop tôt donnerait un cache à moitié plein — et ferait croire la
    // correction sans effet. C'est l'erreur que j'ai faite au premier essai.
    await dormir(attendre);
    const n = vues() - avant;
    console.log(`  ${quoi.padEnd(30)} ${String(n).padStart(4)} requêtes au serveur`);
    return n;
}

console.log('\x1b[1mCE QUE COÛTE UNE OUVERTURE\x1b[0m');
await ouvrir('poste neuf (ou après dépôt)', false, 15000);
const suivante = await ouvrir('l\'heure suivante', true);

console.log('');
dire(`l'heure suivante coûte ${suivante} requête(s)`, suivante <= 12,
    'au-dessus d\'une douzaine, le cache du worker ne sert à rien');

// ── ET LE DÉPÔT ARRIVE-T-IL ENCORE ? ────────────────────────────────────────
//
// On monte le numéro de cache dans sw.js, exactement comme le rituel de
// version le fait à chaque dépôt, et l'on rouvre. L'élève doit recevoir la
// version neuve, et l'ancien cache doit disparaître.
console.log('\n\x1b[1mON SIMULE UN DÉPÔT\x1b[0m');
const avantNom = (SW_ORIGINE.match(/const CACHE = '([^']+)'/) || [])[1];
writeFileSync(SW, SW_ORIGINE.replace(`'${avantNom}'`, `'${avantNom}-essai'`));
console.log(gris(`  ${avantNom} → ${avantNom}-essai`));

try {
    const apresDepot = await ouvrir('le lendemain du dépôt', true, 20000);
    const etat = await s.page.evaluate(async () => ({
        caches: await caches.keys(),
        pret: window.__atoutmathPret === true,
        boutons: document.querySelectorAll('button').length
    }));
    dire('le nouveau cache a remplacé l\'ancien',
        etat.caches.length === 1 && etat.caches[0].endsWith('-essai'), etat.caches.join(', '));
    dire('et l\'élève a bien retéléchargé la version neuve', apresDepot > 50,
        `${apresDepot} requêtes : il aurait gardé l'ancienne`);
    dire('l\'application s\'ouvre toujours', etat.pret && etat.boutons > 5,
        `${etat.boutons} bouton(s), prêt : ${etat.pret}`);

    // ── COMBIEN D'OUVERTURES POUR REDEVENIR CHAUD ? ────────────────────────
    //
    // DEUX, ET C'EST STRUCTUREL. `garnir` ne range que ce que la PAGE a chargé
    // au démarrage — environ 250 fichiers. Les autres sont des modules que
    // l'application va chercher à la demande : un jeu qu'on ouvre, un panneau
    // qu'on déplie. Ils n'entrent dans le cache que la première fois qu'on
    // s'en sert, donc à l'ouverture suivante.
    //
    // ON NE CHERCHE PAS À LES PRÉCHARGER : ce serait demander 131 fichiers que
    // cet élève-là n'ouvrira peut-être jamais, pour gagner une ouverture une
    // fois par dépôt. J'ai essayé d'agrandir le tampon de `performance` en
    // croyant tenir la cause — mesuré, cela n'a RIEN changé, et la ligne est
    // partie.
    const apresApres = await ouvrir('puis l\'heure d\'après', true, 12000);
    dire(`la deuxième heure après un dépôt coûte moins que la première`,
        apresApres < 256, `${apresApres} contre 256`);
    const chaud = await ouvrir('et l\'heure encore d\'après', true);
    dire(`et l'on retombe à ${chaud} requête(s)`, chaud <= 12);
} finally {
    // ON REMET LE FICHIER COMME IL ÉTAIT, QUOI QU'IL ARRIVE. Une sonde qui
    // laisse le dépôt modifié derrière elle est pire qu'une sonde absente.
    writeFileSync(SW, SW_ORIGINE);
    console.log(gris('\n  sw.js remis comme il était.'));
}

console.log(gris(`\n  erreurs de page : ${s.erreurs.length}`));
s.erreurs.slice(0, 3).forEach((e) => console.log('     ' + e));
await s.fermer();
console.log(ratés || s.erreurs.length ? rouge(`\n${ratés} mesure(s) en échec.`)
    : vert('\nDeux requêtes par ouverture, et un dépôt arrive toujours.'));
process.exit(ratés || s.erreurs.length ? 1 : 0);
