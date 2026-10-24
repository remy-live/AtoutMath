// LE FILET D'UNE FICHE EN TABLEAU — ce que les cinq commandes dessinent VRAIMENT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, carnet du 24 octobre : « il faudrait pouvoir choisir de manière globale
// pour les exercices à tableau la présentation en tableau (bordure, épaisseur,
// couleur bordure, couleur alternance/ bords extérieurs ou non). »
//
// POURQUOI UN OUTIL PLUTÔT QU'UNE ÉPREUVE. Une épreuve `node:test` peut lire ce
// que `composerBlocs` met dans `cadre` — et c'est ce que fait
// `tests/revueDu24Octobre.test.mjs`. Elle ne peut PAS dire si le trait arrive à
// l'écran : entre le cadre et le pixel il y a `styleDuCadre`, une feuille de
// style, un `box-sizing` et un filtre de teinte. Un cadre juste et un aperçu
// sans filet rendent la même réponse à l'épreuve.
//
// ET LA PREMIÈRE MESURE A PAYÉ TOUT DE SUITE : le menu « Présentation » de cette
// fenêtre n'avait pas de `onchange`. Zéro cadre avant, zéro cadre après l'avoir
// passé à « zébré ». Les six autres commandes du panneau étaient branchées.
//
//     node tools/filetDuTableau.mjs [identifiant]
//
// Il imprime, pour chaque réglage posé : le nombre de cadres, l'épaisseur et la
// couleur lues SUR LE STYLE CALCULÉ de la première case, les côtés tracés, et
// la couleur de fond des rangées teintées.

import { setTimeout as dormir } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { ouvrirSonde } from './sonde.mjs';

const ID = process.argv[2] || 'calc-add';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 2200 });
await s.identifier();

await s.page.evaluate(async (id) => {
    const pq = await import('/js/ui/printQuestions.js');
    const ps = await import('/js/ui/printSheet.js');
    const { getExerciseById } = await import('/js/data/catalog.js');
    const e = getExerciseById(id);
    if (!e) throw new Error('exercice inconnu : ' + id);
    pq.ouvrirFicheQuestions(e, { ...(e.params || {}) }, ps.chargerJsPDF,
        { flottant: false, nbItems: 12 });
}, ID);
await dormir(2500);

// LES CROCHETS QU'ON N'A PAS LUS DANS LA SOURCE SE DÉCLARENT. Un sélecteur
// inventé rend `false`, c'est-à-dire la même réponse qu'un logiciel cassé.
await s.doitExister('#fq-apercu', 'l\'aperçu de la fiche');
await s.doitExister('#fq-couleur', 'le menu du mode d\'impression');
await s.doitExister('#fq-tableau', 'le menu « Présentation »');
await s.doitExister('#fq-trait', 'le menu « Épaisseur du filet »');
await s.doitExister('#fq-filet', 'le menu « Couleur du filet »');
await s.doitExister('#fq-bande', 'le menu « Couleur de l\'alternance »');
await s.doitExister('#fq-bords', 'la case « Bords extérieurs »');

// ── ON SE MET EN COULEUR, SINON ON NE MESURE QUE DU GRIS ───────────────────
//
// Le défaut du logiciel est NOIR ET BLANC — « c'est ce qui sort de la
// photocopieuse de l'établissement ». Et la teinte n'est pas un filtre CSS :
// `teindreHtml` réécrit CHAQUE couleur de la chaîne de l'aperçu, donc le style
// calculé lui-même sort gris. Première mesure : un filet réglé sur orange
// rendait `rgb(137, 137, 137)`, et j'ai cru dix minutes que le réglage
// n'arrivait pas. Il arrivait, et le gris EST le bon gris.
await s.deplier('#fq-couleur');
await s.page.selectOption('#fq-couleur', 'couleur');
await dormir(1500);

/** Ce que le navigateur a VRAIMENT calculé sur les cases du tableau. */
const lire = () => s.page.evaluate(() => {
    const cases = [...document.querySelectorAll('#fq-apercu .fq-cellule')];
    if (!cases.length) return { cadres: 0 };
    const st = getComputedStyle(cases[0]);
    const cote = (n) => `${st.getPropertyValue(`border-${n}-width`)}`;
    // ON LIT LA COULEUR À DROITE, PAS EN HAUT.
    //
    // `border-top: 0` est une ABRÉVIATION : elle remet aussi la couleur à
    // `currentColor`. Un côté supprimé rend donc la couleur du TEXTE —
    // `rgb(26, 32, 44)` — et la mesure accusait le réglage de couleur alors
    // qu'elle lisait un côté qu'on venait justement d'effacer. Le côté droit de
    // la première case est tracé dans tous les cas où il y a plus d'une
    // colonne : voir `cotes` dans core/fiche.js.
    // LA RANGÉE TEINTÉE N'EST PAS LA PREMIÈRE : l'alternance commence à la
    // seconde (`Math.floor(debut / cols) % 2`). On cherche donc le premier
    // fond qui ne soit pas transparent, au lieu de regarder la case 0 et de
    // conclure « pas d'alternance ».
    const teintee = cases.find(c => {
        const f = getComputedStyle(c).backgroundColor;
        return f && f !== 'rgba(0, 0, 0, 0)' && f !== 'transparent';
    });
    return {
        cadres: cases.length,
        couleur: st.borderRightColor,
        cotes: [cote('top'), cote('right'), cote('bottom'), cote('left')].join(' '),
        fond: teintee ? getComputedStyle(teintee).backgroundColor : '—'
    };
});

/** Poser des réglages, attendre l'aperçu, dire ce qu'on voit. */
async function essai(titre, reglages) {
    for (const [sel, val] of Object.entries(reglages)) {
        await s.deplier(sel);
        if (typeof val === 'boolean') {
            // UNE CASE À COCHER NE SE « selectOption » PAS, et `click` sur une
            // case déjà dans l'état voulu la DÉcoche : on règle la valeur et
            // l'on émet l'événement, comme le ferait le doigt.
            await s.page.evaluate(([q, v]) => {
                const el = document.querySelector(q);
                el.checked = v;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, [sel, val]);
        } else {
            await s.page.selectOption(sel, String(val));
        }
        await dormir(400);
    }
    await dormir(1400);
    const v = await lire();
    console.log(`── ${titre}`);
    console.log(`    cadres ${v.cadres} · couleur ${v.couleur || '—'}`);
    console.log(`    côtés (h d b g) ${v.cotes || '—'} · fond teinté ${v.fond || '—'}`);
    return v;
}

await essai('en liste', { '#fq-tableau': 'liste' });
await essai('en tableau, filet normal gris', { '#fq-tableau': 'tableau' });
await essai('zébré, filet épais orange, bande verte', {
    '#fq-tableau': 'zebre', '#fq-trait': '0.4', '#fq-filet': 'orange', '#fq-bande': 'vert'
});
await essai('sans bords extérieurs', { '#fq-bords': false });
await essai('filet fin, bords rendus', { '#fq-trait': '0.1', '#fq-bords': true });

// ── ET DANS LE PDF, QUI EST CE QUI S'IMPRIME ───────────────────────────────
//
// L'APERÇU NE PEUT PAS MONTRER L'ÉPAISSEUR. Mesuré : à l'échelle de l'aperçu,
// un dixième de millimètre vaut un demi-pixel, et le navigateur arrondit un
// `border` au pixel entier — « Fin » et « Normal » y rendent donc le même
// 1px. Le PDF, lui, écrit la valeur en millimètres. Une mesure qui s'arrête à
// l'aperçu dirait que le réglage d'épaisseur ne fait rien.
const bouton = await s.page.$('#fq-telecharger');
if (!bouton) throw new Error('pas de bouton « Télécharger » : #fq-telecharger');
const attente = s.page.waitForEvent('download', { timeout: 30000 });
await bouton.click();
const chemin = 'tools/tmp/filet.pdf';
await (await attente).saveAs(chemin);
const brut = await readFile(chemin, 'latin1');
const uniques = (re, fmt) => [...new Set([...brut.matchAll(re)].map(fmt))];
console.log('\n── le PDF (dernier réglage : filet fin, bords rendus)');
console.log('    épaisseurs de trait :',
    uniques(/([\d.]+) w\b/g, m => m[1]).join(' · '));
console.log('    couleurs de trait   :',
    uniques(/([\d.]+) ([\d.]+) ([\d.]+) RG\b/g,
        m => `${m[1]} ${m[2]} ${m[3]}`).join(' · '));

// LA PHOTO EST LARGE, DONC LA FENÊTRE AUSSI : `photo` découpe la page, et une
// feuille de deux mille pixels dans une fenêtre de neuf cents sort coupée —
// l'outil le dit, et c'est ce qui m'a fait l'agrandir.
await s.photo('#fq-apercu .fq-page', 'tools/tmp/filet-apercu.png');
console.log('\nerreurs de page :', s.erreurs.length,
    '· fenêtres natives :', s.fenetresNatives.length);
if (s.erreurs.length) console.log(s.erreurs.slice(0, 5));
await s.fermer();
