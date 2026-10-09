// UN EXERCICE DÉSACTIVÉ DISPARAÎT DU CATALOGUE — ET SE RETROUVE PAR LA BARRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « désactive le jardin », puis « tu peux le laisser pour le début —
// Debug ».
//
// LA SECONDE PHRASE EST UNE CONDITION, PAS UN ACCORD. Désactiver un exercice
// n'est utile que si l'on peut encore aller le voir : sans cela, « désactivé »
// voudrait dire « perdu », et personne n'oserait éteindre quoi que ce soit.
//
// ── POURQUOI CETTE SONDE, ALORS QU'UNE ÉPREUVE D'UNITÉ LE DIT DÉJÀ ─────────
//
// `tests/catalog.test.mjs` vérifie que `filterByStatus({only:'brouillon'})`
// rend bien le Jardin. C'est la FONCTION, pas le BOUTON. J'ai affirmé à Rémy
// qu'il le retrouverait par la barre de débogage en me fondant sur cette
// épreuve-là — c'est-à-dire sans avoir cliqué une seule fois. C'est la friction
// la plus chère du dépôt, écrite en tête de CLAUDE.md : une mesure qui
// n'emprunte pas le chemin de l'utilisateur ne mesure pas son problème.
//
// ET LE PREMIER JET DE CETTE SONDE EST TOMBÉ DANS L'AUTRE PIÈGE, le même jour :
// j'y avais écrit `[data-exo-id]`, qui n'existe pas. Elle rendait « 0 exercice
// affiché » à chaque réglage — c'est-à-dire la même réponse qu'un catalogue
// cassé — et le compte du bouton, lui, paraissait juste. Le vrai crochet est
// `[data-exo]` (js/ui/navigation.js, `item.dataset.exo = exo.id`).
//
//   node tools/exerciceDesactive.mjs [identifiant]     (défaut : voc-jardin)
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const CIBLE = process.argv[2] || 'voc-jardin';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
await dormir(1200);

let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} ${quoi}${detail ? '  — ' + detail : ''}`);
};

await s.doitExister('#db-filter-status', 'le filtre d\'état de la barre de débogage');
await s.doitExister('[data-exo]', 'les cartes du catalogue');

/** Ce que le catalogue montre, et ce que le bouton annonce. */
const etat = () => s.page.evaluate(() => {
    // UN MÊME EXERCICE A PLUSIEURS CARTES : il est rangé dans plusieurs
    // chemins. On compte donc les IDENTIFIANTS distincts, pas les cartes —
    // sans quoi « 6 » ferait croire à six exercices là où il n'y en a qu'un.
    const ids = new Set([...document.querySelectorAll('[data-exo]')].map(e => e.dataset.exo));
    return {
        distincts: ids.size,
        ids: [...ids],
        titre: (document.getElementById('db-filter-status') || {}).title || ''
    };
});

const depart = await etat();
const nom = (t) => (/Catalogue : ([^(]+)/.exec(t) || [, '?'])[1].trim();
console.log(`         au départ : « ${nom(depart.titre)} », ${depart.distincts} exercice(s)`);
dire(!depart.ids.includes(CIBLE),
    `« ${CIBLE} » n'est proposé à personne`, `${depart.distincts} exercices au catalogue`);

// ── ON FAIT DÉFILER LE FILTRE JUSQU'À LE TROUVER ───────────────────────────
//
// Le bouton tourne sur quatre états (tout, test, validé, non validé). On
// compte les clics qu'il faut : c'est le geste que Rémy fera, et deux clics ne
// se racontent pas de la même façon que cinq.
let clics = 0, trouve = null;
for (let i = 1; i <= 4 && !trouve; i++) {
    await s.page.evaluate(() => document.getElementById('db-filter-status').click());
    await dormir(900);
    const v = await etat();
    clics = i;
    console.log(`         clic ${i} : « ${nom(v.titre)} », ${v.distincts} exercice(s)`);
    if (v.ids.includes(CIBLE)) trouve = v;
}

dire(!!trouve, `on le retrouve par la barre de débogage`,
    trouve ? `${clics} clic(s), réglage « ${nom(trouve.titre)} »` : 'introuvable en quatre clics');
if (trouve) {
    dire(trouve.distincts === 1,
        'et il est seul sous ce réglage — on voit ce qu\'on a éteint',
        trouve.ids.join(', '));
}

console.log('\n' + '─'.repeat(70));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : `\x1b[32m« ${CIBLE} » EST HORS DU CATALOGUE, ET À ${clics} CLIC(S) DE LA BARRE.\x1b[0m`);
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(x => console.log(`  ${x}`));
await s.fermer();
