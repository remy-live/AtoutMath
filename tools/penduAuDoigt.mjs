// LE PENDU, DE BOUT EN BOUT, AUX TROIS LARGEURS — et on joue une partie ENTIÈRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/penduAuDoigt.mjs            1280 × 900 — l'ordinateur
//   node tools/penduAuDoigt.mjs --doigt     390 × 844 — le téléphone
//   node tools/penduAuDoigt.mjs --tablette  820 × 1180
//
// ON JOUE LE MOT EN ENTIER, les bonnes lettres après les mauvaises, et l'on
// regarde ce que l'écran fait à chaque étape. C'est le seul moyen de savoir
// que la victoire est bien comptée juste — la réponse que l'activité envoie et
// celle que le générateur attend doivent s'écrire pareil, et rien d'autre ne
// le mesure.
//
// LA SOLUTION NE SE LIT PAS DANS LA PAGE, et elle ne doit pas s'y lire : un
// élève curieux ouvrirait le code source. La sonde la prend donc dans le
// générateur, à côté du navigateur, en rejouant la même graine.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const ARGS = process.argv.slice(2);
const DOIGT = ARGS.includes('--doigt');
const TABLETTE = ARGS.includes('--tablette');
const SUFFIXE = DOIGT ? '-doigt' : TABLETTE ? '-tablette' : '';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

const s = await ouvrirSonde(DOIGT ? { largeur: 390, hauteur: 844 }
    : TABLETTE ? { largeur: 820, hauteur: 1180 }
        : { largeur: 1280, hauteur: 900 });
await s.identifier();
await s.ouvrirExercice('logi-pendu', {}, { questions: 2 });
await dormir(1500);
await s.doitExister('.pd-clavier', 'le pavé de lettres');
await s.doitExister('.pd-decor', 'le dessin des erreurs');

console.log('\nL\'ÉCRAN DE DÉPART\n' + '─'.repeat(64));
await s.photo('.pd-layout', `tools/tmp/pendu${SUFFIXE}.png`, 12);
const depart = await s.page.evaluate(() => ({
    dehors: document.documentElement.scrollWidth - window.innerWidth,
    touches: document.querySelectorAll('.pd-touche').length,
    petites: [...document.querySelectorAll('.pd-touche')]
        .map(b => b.getBoundingClientRect()).filter(r => r.width < 42 || r.height < 44).length,
    lettres: document.querySelectorAll('.pd-lettre').length,
    montrees: [...document.querySelectorAll('.pd-lettre')]
        .filter(e => e.textContent.trim()).length,
    def: ((document.querySelector('.pd-def') || {}).textContent || '').trim(),
    svg: (document.querySelector('.pd-decor svg') || {}).innerHTML || ''
}));
dire('rien ne déborde en largeur', depart.dehors <= 0, `${depart.dehors} px`);
dire('les vingt-six lettres sont là', depart.touches === 26, `${depart.touches}`);
dire('et chacune fait ses 44 px', depart.petites === 0, `${depart.petites} trop petite(s)`);
dire('le mot est caché au départ', depart.montrees === 0,
    `${depart.lettres} lettre(s), ${depart.montrees} montrée(s)`);
dire('la définition est donnée', depart.def.length > 10, depart.def);
dire('le décor est dessiné', depart.svg.length > 40);

// ── ON SE TROMPE DEUX FOIS, ET LE DÉCOR DOIT BOUGER ─────────────────────────
console.log('\nDEUX ERREURS\n' + '─'.repeat(64));
const avantSvg = depart.svg;
// ON RELIT LA TOUCHE APRÈS LE CLIC, DANS UN DOM NEUF, et ce n'est pas une
// précaution de style : l'activité redessine tout le pavé à chaque coup, donc
// la touche qu'on vient de cliquer est DÉTACHÉE de la page. Interroger sa
// classe rendait toujours `false` — la même réponse qu'une touche qui n'a rien
// fait —, la sonde croyait n'avoir jamais raté et cliquait les cinq lettres
// au lieu de deux. Elle annonçait « DEUX ERREURS » en en faisant cinq.
let faites = 0;
for (const c of 'WXKJZ'.split('')) {
    if (faites >= 2) break;
    await s.page.evaluate((l) => {
        const b = [...document.querySelectorAll('.pd-touche')].find(x => x.textContent === l);
        if (b && !b.disabled) b.click();
    }, c);
    await dormir(160);
    faites = await s.page.evaluate(() =>
        document.querySelectorAll('.pd-touche--ratee').length);
}
const deux = await s.page.evaluate(() => ({
    ratees: document.querySelectorAll('.pd-touche--ratee').length,
    svg: (document.querySelector('.pd-decor svg') || {}).innerHTML || '',
    desactivees: [...document.querySelectorAll('.pd-touche')].filter(b => b.disabled).length
}));
dire('le décor a changé', deux.svg !== avantSvg);
dire('exactement deux erreurs ont été faites', deux.ratees === 2, `${deux.ratees}`);
dire('les lettres essayées sont marquées et éteintes',
    deux.desactivees >= deux.ratees,
    `${deux.ratees} ratée(s), ${deux.desactivees} éteinte(s)`);

// ── PUIS ON GAGNE : toutes les lettres du mot ───────────────────────────────
console.log('\nLA PARTIE JUSQU\'AU BOUT\n' + '─'.repeat(64));
// ON JOUE L'ALPHABET, en s'arrêtant dès que la partie est finie. Elle peut
// se terminer gagnée ou perdue selon le mot tiré, et les deux fins sont
// bonnes à mesurer : dans les deux cas le mot doit s'afficher EN ENTIER —
// un élève qui ne voit jamais la réponse ne l'apprend pas.
for (const c of 'AEIOURSTNLMCDPBGHFVQJXYZKW') {
    const fini = await s.page.evaluate(() => !!document.querySelector('.pd-haut--ok, .pd-haut--rate'));
    if (fini) break;
    await s.page.evaluate((l) => {
        const b = [...document.querySelectorAll('.pd-touche')].find(x => x.textContent === l);
        if (b && !b.disabled) b.click();
    }, c);
    await dormir(110);
}
await dormir(400);
const fin = await s.page.evaluate(() => ({
    gagne: !!document.querySelector('.pd-haut--ok'),
    perdu: !!document.querySelector('.pd-haut--rate'),
    statut: ((document.querySelector('.pd-statut') || {}).textContent || '').trim(),
    montrees: [...document.querySelectorAll('.pd-lettre')].filter(e => e.textContent.trim()).length,
    lettres: document.querySelectorAll('.pd-lettre').length
}));
dire('la partie se termine', fin.gagne || fin.perdu, fin.statut);
dire('et le mot est montré en entier à la fin', fin.montrees === fin.lettres,
    `${fin.montrees}/${fin.lettres}`);
await s.photo('.pd-haut', `tools/tmp/pendu-fin${SUFFIXE}.png`, 10);

dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.join(' · '));
console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives : ${s.fenetresNatives.length}`);
if (s.fenetresNatives.length) ratés++;
console.log(ratés ? rouge(`\n${ratés} mesure(s) manquée(s).`)
    : vert('\nLE PENDU S\'OUVRE, SE JOUE ET SE TERMINE.'));
await s.fermer();
process.exit(ratés ? 1 : 0);
