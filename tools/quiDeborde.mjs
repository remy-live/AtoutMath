// QUI DÉBORDE DE SON PLATEAU SANS POUVOIR ÊTRE ATTEINT ?
//
// LE DÉFAUT QUE RÉMY A SIGNALÉ QUATRE FOIS DE SUITE, chaque fois sur un écran
// différent : une grille par-dessus un clavier, un énoncé sous un pavé, un
// dessin hors de vue. À chaque fois j'ai mesuré APRÈS sa capture. Cet outil
// cherche les suivantes avant lui.
//
// LE CRITÈRE EST UN TEST DE TOUCHER, ET LA PREMIÈRE VERSION S'EST TROMPÉE DE
// CRITÈRE. Elle découpait chaque boîte par ses ancêtres qui découpent — ce qui
// attrape un élément COUPÉ — et rendait « 0 souci » sur le dépôt d'avant la
// correction, là où le clavier se peignait PAR-DESSUS l'énoncé. Découper n'est
// pas recouvrir : un frère posé devant ne rogne aucune boîte.
//
// On demande donc au navigateur ce qu'il y a AU POINT : `elementFromPoint` sur
// cinq points de l'élément. S'il ne répond jamais l'élément ni un des siens,
// c'est que quelque chose est devant, ou qu'il est hors du cadre — les deux
// donnent le même résultat pour l'élève, qui ne le voit pas.
//
// ET L'ON DEMANDE SI C'EST RATTRAPABLE : ce qu'un conteneur peut ramener en
// défilant n'est pas perdu, c'est un geste de plus.
//
//   node tools/quiDeborde.mjs                 (tout le catalogue)
//   node tools/quiDeborde.mjs calc-add,rc-pas (une liste)
//   node tools/quiDeborde.mjs --hauteur 600
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const ARGS = process.argv.slice(2);
const HAUTEUR = Number((ARGS.find(a => a.startsWith('--hauteur')) || '').split('=')[1]
    || ARGS[ARGS.indexOf('--hauteur') + 1]) || 664;
const CHOISIS = (ARGS.find(a => !a.startsWith('--') && !/^\d+$/.test(a)) || '')
    .split(',').map(s => s.trim()).filter(Boolean);

const s = await ouvrirSonde({ largeur: 390, hauteur: HAUTEUR, theme: 'dark' });
await s.identifier();
await s.theme('dark');

const liste = await s.page.evaluate(async (choisis) => {
    const { exercices } = await import('./js/data/catalog.js');
    const tous = exercices.map(e => ({ id: e.id, titre: e.title }));
    return choisis.length ? tous.filter(e => choisis.includes(e.id)) : tous;
}, CHOISIS);

console.log(`${liste.length} exercice(s), 390 × ${HAUTEUR}, au doigt, thème sombre\n`);
const soucis = [];
for (const exo of liste) {
    const raté = await s.ouvrirExercice(exo.id);
    if (raté) { console.log(`  — ${exo.id} : ${raté}`); continue; }
    await dormir(350);
    const vu = await s.page.evaluate(() => {
        const r = (e) => e.getBoundingClientRect();
        const coupe = (a, b) => {
            if (!a || !b) return null;
            const l = Math.max(a.left, b.left), r2 = Math.min(a.right, b.right);
            const t = Math.max(a.top, b.top), b2 = Math.min(a.bottom, b.bottom);
            return (r2 > l && b2 > t) ? { left: l, right: r2, top: t, bottom: b2 } : null;
        };
        void coupe;
        // CINQ POINTS, ET L'ON COMPTE CEUX QUI RÉPONDENT L'ÉLÉMENT. Le centre
        // seul ne suffit pas : une case de grille a souvent un trou en son
        // milieu, et un bouton peut n'être couvert qu'à moitié.
        const etat = (el) => {
            const b = r(el);
            const pts = [[.5, .5], [.2, .25], [.8, .25], [.2, .75], [.8, .75]]
                .map(([x, y]) => [b.left + b.width * x, b.top + b.height * y]);
            let vus = 0;
            for (const [x, y] of pts) {
                if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
                const dessus = document.elementFromPoint(x, y);
                if (dessus && (dessus === el || el.contains(dessus) || dessus.contains(el))) vus++;
            }
            // Rattrapable : un ancêtre qui défile peut le ramener à l'écran.
            let rattrapable = false;
            for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
                const st = getComputedStyle(e);
                if ((st.overflowY === 'auto' || st.overflowY === 'scroll')
                    && e.scrollHeight > e.clientHeight + 2) { rattrapable = true; break; }
            }
            return { part: vus / pts.length, rattrapable };
        };
        const couche = document.querySelector('#game-layer');
        if (!couche) return { erreur: 'pas de couche' };
        const perdus = [];
        couche.querySelectorAll('*').forEach(el => {
            if (el.hidden || !el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return;
            const boite = r(el);
            if (boite.width < 24 || boite.height < 18) return;
            // On ne juge QUE les feuilles porteuses de sens : un conteneur
            // partiellement coupé est normal, un bouton invisible ne l'est pas.
            const texte = (el.textContent || '').trim();
            if (!texte && el.tagName !== 'svg' && el.tagName !== 'CANVAS' && el.tagName !== 'IMG') return;
            if (el.querySelector('*') && el.tagName !== 'svg') return;
            const { part, rattrapable } = etat(el);
            if (part < 0.25) {
                perdus.push({
                    quoi: (el.className || el.tagName).toString().slice(0, 28),
                    texte: texte.slice(0, 22),
                    vu: Math.round(part * 100) + '%',
                    rattrapable
                });
            }
        });
        return { perdus };
    });
    if (vu.erreur) { console.log(`  — ${exo.id} : ${vu.erreur}`); continue; }
    const durs = vu.perdus.filter(p => !p.rattrapable);
    if (durs.length) {
        soucis.push({ exo, durs });
        console.log(`  CACHÉ  ${exo.id.padEnd(22)} ${durs.length} élément(s) invisibles et hors d'atteinte`);
        durs.slice(0, 4).forEach(p => console.log(`           ${p.vu.padStart(4)} · ${p.quoi} · « ${p.texte} »`));
    }
}
console.log(`\n${liste.length} exercice(s) · ${soucis.length} cachent du contenu sans recours`);
console.log(`erreurs de page : ${s.erreurs.length}`);
await s.fermer();
process.exit(soucis.length ? 1 : 0);
