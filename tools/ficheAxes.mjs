// LES DROITES GRADUÉES SUR LE PAPIER — l'axe est-il DESSINÉ, et prend-il la place ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue :
//
//   sec-valeur-absolue  « présente-le sous forme de tableau pour avoir la même
//                        taille à gauche et la place à droite »
//   sec-union-inter     « présente en tableau et dessine les axes »
//
// Mesuré avant : les deux feuilles écrivaient l'énoncé suivi d'un pointillé.
// Or la réponse demandée est un DESSIN, et l'on ne trace pas une droite graduée
// sur trois centimètres de pointillé.
//
// ── CE QUE CETTE SONDE REGARDE, ET POURQUOI PAS UNE ÉPREUVE ───────────────
//
// Qu'un rendu existe et ne jette pas se tient sous Node. Ce qui ne s'y tient
// pas, et qui est tout le sujet :
//
//   1. qu'il y ait VRAIMENT des traits sur la feuille — un `<svg>` vide rend
//      exactement la même chose qu'un rendu absent ;
//   2. que l'axe PRENNE LA LARGEUR. C'est la phrase de Rémy — « la place à
//      droite » —, et c'est la mesure qui a corrigé la mise en page : à trois
//      questions par page, l'union tombait à 91 mm de long sur 194 disponibles,
//      parce que l'échelle est bornée par la plus serrée des deux dimensions ;
//   3. que le corrigé porte un tracé que la feuille de l'élève n'a pas. Sans
//      cela, la feuille de solutions est la feuille de questions imprimée deux
//      fois — et cela ne se voit qu'en comparant les deux.
//
//   node tools/ficheAxes.mjs
//
// Les images sortent dans `tools/tmp/` pour être regardées à l'œil : une mesure
// dit qu'il y a 97 traits, elle ne dit pas qu'ils forment une droite.

import fs from 'node:fs/promises';
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const EXOS = [
    ['sec-valeur-absolue', 'la valeur absolue', 1],
    ['sec-union-inter', 'union et intersection', 3]
];

// UNE FENÊTRE ASSEZ HAUTE POUR LA FEUILLE ENTIÈRE. `photo` découpe sur la
// FENÊTRE : un aperçu de sept lignes dans 1100 px revenait coupé après la
// première, et une photo coupée ressemble à une photo réussie. La mise en page
// de la fiche est en pixels fixes, donc agrandir la fenêtre ne change rien à
// ce qu'on mesure — seulement à ce qu'on en voit.
const s = await ouvrirSonde({ largeur: 1500, hauteur: 2200 });
let manques = 0;
const dire = (ok, quoi, detail = '') => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}`
        + (detail ? `  — ${detail}` : ''));
};

console.log('\nLES DROITES GRADUÉES, SUR LE PAPIER');
console.log('─'.repeat(78));

await s.identifier();
await s.page.goto(`http://127.0.0.1:${s.port}/index.html`);
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

/**
 * OUVRE LA FICHE D'UN SEUL EXERCICE, APERÇU DÉPLIÉ.
 *
 * Mesuré à mes dépens : enchaîner deux exercices dans la même page laisse le
 * cadre d'aperçu du premier replié, et la photo revient coupée — on y voit le
 * titre et les boutons, rien du dessin. Une page par exercice.
 */
async function ouvrirLaFiche(id) {
    await s.page.goto(`http://127.0.0.1:${s.port}/index.html`);
    await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    await s.page.evaluate(async (id) => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        const cat = await import('./js/data/catalog.js');
        const ps = await import('./js/ui/printSheet.js');
        const e = cat.exercices.find(x => x.id === id);
        ps.ouvrirFicheModal(e, { ...(e.params || {}) }, null, { flottant: false });
    }, id);
    await dormir(3500);
}

/** CE QUE PORTE L'APERÇU, et quelle part de la largeur l'axe occupe. */
async function lireLApercu() {
    return s.page.evaluate(() => {
        const ap = document.querySelector('#fp-apercu');
        if (!ap) return null;
        const svg = [...ap.querySelectorAll('svg')];
        const lignes = [...svg.flatMap(x => [...x.querySelectorAll('line')])];
        // L'AXE EST LE PLUS LONG HORIZONTAL de chaque bloc. On ne cherche pas
        // une longueur devinée : on la compare à la largeur de la page, qui est
        // la seule référence qui ait un sens ici.
        const horiz = lignes.filter(l =>
            Math.abs(+l.getAttribute('y1') - +l.getAttribute('y2')) < 0.3);
        const longueurs = horiz
            .map(l => Math.abs(+l.getAttribute('x2') - +l.getAttribute('x1')))
            .sort((a, b) => b - a);
        // LES BLOCS, LUS DANS `printSheet.js` : un `.fp-bloc` par emplacement,
        // posé exactement sur la boîte du bloc. C'est la seule référence qui
        // ait un sens pour « la place à droite », parce que la colonne de
        // gauche en prend une part FIXE et connue.
        //
        // `.fp-feuille` n'existe QUE sur un aperçu à plusieurs pages — relu
        // dans la source après que la mesure est revenue à zéro. Les trois
        // sélecteurs inventés d'avant rendaient `null`, donc une largeur de 0,
        // donc la mesure ne s'exécutait JAMAIS : elle était silencieusement
        // absente du verdict, ce qui est pire qu'un échec — un verdict tout
        // vert où la mesure de Rémy ne figurait pas.
        const bloc = ap.querySelector('.fp-bloc');
        const page = bloc || ap;
        return {
            // Un bloc par ligne de la feuille : `printSheet` pose un
            // `.fp-bloc` cliquable par emplacement. On ne compte PAS les
            // numéros dans le texte — mesuré : le rendu des axes n'en écrit
            // aucun, et la mesure disait « 0 question » d'une page qui en
            // portait sept.
            blocs: ap.querySelectorAll('.fp-bloc').length,
            traits: lignes.length,
            crochets: horiz.length,
            points: svg.reduce((n, x) => n + x.querySelectorAll('circle').length, 0),
            nombres: svg.reduce((n, x) => n + x.querySelectorAll('text').length, 0),
            axeLePlusLong: Math.round(longueurs[0] || 0),
            largeurBloc: page ? Math.round(page.getBoundingClientRect().width) : 0,
            texte: ap.innerText.replace(/\s+/g, ' ').slice(0, 160)
        };
    });
}

for (const [id, quoi, axesParBloc] of EXOS) {
    console.log(`\n  ${quoi} — ${id}`);
    await ouvrirLaFiche(id);
    await s.doitExister('#fp-apercu');
    const vu = await lireLApercu();

    dire(!!vu && vu.traits > 0, 'l\'axe EST DESSINÉ sur la feuille',
        vu ? `${vu.traits} trait(s), ${vu.points} point(s), ${vu.nombres} nombre(s)` : 'rien');
    dire(!!vu && vu.blocs >= 2, 'plusieurs questions sur la page',
        vu ? `${vu.blocs} question(s)` : '');
    dire(!!vu && vu.traits >= vu.blocs * axesParBloc,
        `chaque question porte ses ${axesParBloc} droite(s)`,
        vu ? `${vu.traits} trait(s) pour ${vu.blocs} × ${axesParBloc}` : '');

    // « LA PLACE À DROITE » : la mesure qui a corrigé la mise en page.
    //
    // ON COMPARE À LA PLACE DISPONIBLE, PAS À LA PAGE. La colonne de l'énoncé
    // prend `PART_GAUCHE` de la largeur du bloc, et c'est voulu : « la même
    // taille à gauche ». Un axe qui remplirait la PAGE passerait dessus.
    //
    // Mesuré avant la correction : 47 % et 64 % de la place à droite, parce
    // qu'une seule échelle liait la longueur de l'axe à la hauteur du bloc.
    // Après : 97 % des deux côtés — les 3 % sont le retrait de quatre unités
    // que `planDAxe` laisse à chaque bout.
    if (vu && vu.largeurBloc) {
        const dispo = vu.largeurBloc * (1 - 0.28) - 2;
        const part = vu.axeLePlusLong / dispo;
        dire(part >= 0.9, 'et l\'axe REMPLIT la place à droite',
            `${Math.round(part * 100)} % — ${vu.axeLePlusLong} px sur ${Math.round(dispo)}`);
    }

    // ON DÉPLIE LE CADRE AVANT DE PHOTOGRAPHIER. Il a un `max-height` avec
    // `overflow-y: auto` : sans cela l'image s'arrête où le cadre s'arrête, et
    // l'on regarde deux lignes sur sept en croyant les avoir toutes vues.
    await s.page.evaluate(() => {
        const c = document.querySelector('.fp-apercu-cadre');
        if (c) { c.style.maxHeight = 'none'; c.style.overflow = 'visible'; }
    });
    const vueEntiere = await s.photo('#fp-apercu', `tools/tmp/axes-${id}.png`);
    dire(!!vueEntiere && vueEntiere.entiere, 'la photo porte la feuille ENTIÈRE',
        vueEntiere ? `${vueEntiere.teintes} teinte(s)` : 'pas de photo');

    // ET LA FEUILLE DE SOLUTIONS, qui est l'autre moitié de ce qu'on imprime.
    // Le bouton est `#fp-voir-sol` — LU dans `printSheet.js`. Une mesure qui
    // ne regarde que la feuille de l'élève ne voit pas si le corrigé se
    // superpose à ce qu'il a tracé, ce qui est tout l'intérêt d'une correction.
    await s.doitExister('#fp-voir-sol');
    await s.page.click('#fp-voir-sol');
    await dormir(2000);
    await s.page.evaluate(() => {
        const c = document.querySelector('.fp-apercu-cadre');
        if (c) { c.style.maxHeight = 'none'; c.style.overflow = 'visible'; }
    });
    const vueSol = await s.photo('#fp-apercu', `tools/tmp/axes-${id}-corrige.png`);
    dire(!!vueSol && vueSol.entiere, 'et la photo du corrigé aussi',
        vueSol ? `${vueSol.teintes} teinte(s)` : 'pas de photo');
    await s.page.click('#fp-voir-sol');
    await dormir(1200);

    // ── LE CORRIGÉ PORTE UN TRACÉ QUE LA FEUILLE DE L'ÉLÈVE N'A PAS ────────
    //
    // Les deux feuilles sortent du MÊME rendu, avec un seul booléen de
    // différence. Si ce booléen n'arrivait pas jusqu'au dessin, les deux
    // feuilles seraient identiques et personne ne s'en apercevrait avant la
    // photocopieuse.
    const corrige = await s.page.evaluate(async (id) => {
        const cat = await import('./js/data/catalog.js');
        const ax = await import('./js/ui/fiches/axes.js');
        const e = cat.exercices.find(x => x.id === id);
        // LE REGISTRE N'EST PEUPLÉ QUE DANS LE NAVIGATEUR. C'est pour cela que
        // cette mesure est une sonde et non une épreuve : sous Node nu,
        // `generateurDeFiche` rendrait toujours rien, et la garde serait verte
        // sans rien garder.
        const { generateurDeFiche } = await import('./js/core/registry.js');
        const fab = generateurDeFiche(e);
        if (!fab || !fab.generate) return null;
        const { makeRng } = await import('./js/core/ids.js');
        const r = ax.RENDUS_AXES[e.printable];
        const slot = { x: 10, y: 10, w: 190, h: 40 };
        // CHAQUE BARREAU, UN PAR UN — et non celui que le tirage a donné.
        //
        // Mesuré : sur sept lignes tirées au hasard, le barreau 8 ne sortait
        // pas une fois sur dix, et c'est justement celui dont le dessin est
        // l'ÉNONCÉ. Une mesure qui ne voit que ce que le hasard lui donne ne
        // couvre pas ce qu'elle croit couvrir. `marches` est la clé que
        // `core/progression.js` lit ; un nom inventé ne coche rien et rend
        // TOUS les barreaux, donc huit mesures identiques.
        const lots = (e.printable === 'valeurAbsolueAxe')
            ? (await import('./js/core/valeursAbsolues.js')).MARCHES.map(m => ({
                nom: m.id, params: { marches: [m.id] } }))
            // UNION ET INTERSECTION N'A PAS DE BARREAUX : ses cas difficiles
            // sortent du TIRAGE. On en tire donc beaucoup, et c'est ce qui a
            // trouvé les deux défauts que six tirages n'avaient pas montrés :
            // I ∩ J = ∅, où le corrigé n'avait rien à dire, et I ∪ J = ℝ, qui
            // sortait comme un segment borné faute de flèches. Un seul tirage
            // mesure le tirage, pas l'exercice.
            : Array.from({ length: 24 }, (_, i) =>
                ({ nom: `tirage ${i + 1}`, params: { ...(e.params || {}) }, index: i }));
        // Les traits, les disques ET les textes.
        //
        // Les disques : sur « |x − 2| = 5 » la réponse est DEUX POINTS, en
        // `<circle>` ; une mesure qui ne comptait que les `<line>` disait « le
        // corrigé n'ajoute rien » d'un corrigé juste.
        //
        // Les textes : quand I ∩ J est VIDE, le corrigé n'a rien à tracer et
        // écrit « ∅ ». C'est une correction, et elle doit compter comme telle —
        // sinon la garde exigerait un trait là où la bonne réponse est qu'il
        // n'y en a pas.
        const compte = (h) =>
            (h.match(/<line/g) || []).length + (h.match(/<circle/g) || []).length
            + (h.match(/<text|<div/g) || []).length;
        const out = [];
        for (const lot of lots) {
            const q = fab.generate(lot.params,
                { rng: makeRng(), index: lot.index || 0, total: lots.length,
                    papier: true, themesExclus: [] });
            const item = { meta: q.meta || {}, prompt: q.prompt || {} };
            const hEleve = r.previewGrille(item, slot, 1, false);
            const hSol = r.previewGrille(item, slot, 1, true);
            out.push({
                nom: lot.nom,
                donnee: !!(q.meta || {}).donnee,
                // `vide` : I ∩ J = ∅. Le corrigé n'a alors RIEN à tracer, et
                // sa correction est le mot « ∅ » écrit en tête de la droite.
                vide: !!(q.meta || {}).vide,
                // ET LES DEUX FEUILLES SONT-ELLES SEULEMENT DIFFÉRENTES ?
                //
                // Un compte d'objets ne voit pas un TEXTE QUI CHANGE : « I ∩ J »
                // et « I ∩ J = ∅ » sont un `<text>` chacun. La première version
                // de cette mesure déclarait donc muet un corrigé qui corrigeait
                // — et elle aurait aussi laissé passer un corrigé réellement
                // muet dont le nombre d'objets aurait, par hasard, bougé.
                different: hEleve !== hSol,
                eleve: compte(hEleve), solution: compte(hSol)
            });
        }
        return out;
    }, id);
    if (corrige) {
        // UN BARREAU DONT LE DESSIN EST LA DONNÉE ne demande pas que le
        // corrigé en ajoute : il demande que l'ÉLÈVE l'ait déjà. Les deux
        // règles sont contraires, et c'est pour cela qu'on les sépare.
        const aTracer = corrige.filter(c => !c.donnee && !c.vide);
        const muets = aTracer.filter(c => c.solution <= c.eleve);
        dire(!muets.length, 'LE CORRIGÉ TRACE CE QUE L\'ÉLÈVE DOIT TRACER',
            muets.length
                ? `muet sur : ${muets.map(c => c.nom).join(', ')}`
                : `${aTracer.length} cas · `
                    + aTracer.slice(0, 7).map(c => `${c.eleve}→${c.solution}`).join(' '));
        // LES CAS RARES SONT-ILS SEULEMENT PASSÉS SOUS LA MESURE ?
        //
        // Une couverture qu'on ne compte pas est une couverture qu'on suppose.
        // L'ensemble vide ne sort que d'un tirage sur quatorze : si un jour il
        // ne sortait plus du tout, la mesure resterait verte en ne mesurant
        // plus rien, et c'est précisément le genre de garde qui ment.
        // Seule l'union/intersection a ce cas : |x − a| ⋈ r n'est jamais vide,
        // et l'exiger de la valeur absolue ferait rougir une feuille juste.
        if (id === 'sec-union-inter') {
            const vides = corrige.filter(c => c.vide).length;
            dire(vides > 0, 'et le cas « rien à tracer » est bien passé sous la mesure',
                `${vides} tirage(s) sur ${corrige.length} donnent l'ensemble vide`);
        }
        // ET AUCUNE DES DEUX FEUILLES N'EST LA COPIE DE L'AUTRE — y compris
        // quand la bonne réponse est « rien à tracer ».
        const jumeaux = corrige.filter(c => !c.different);
        dire(!jumeaux.length,
            'ET LA FEUILLE DE SOLUTIONS N\'EST JAMAIS LA FEUILLE DE QUESTIONS',
            jumeaux.length
                ? `identiques sur : ${jumeaux.map(c => c.nom).join(', ')}`
                : `${corrige.length} cas, tous distincts`);
        const donnees = corrige.filter(c => c.donnee);
        if (donnees.length) {
            dire(donnees.every(c => c.eleve > 0),
                'ET LE BARREAU DONT LE DESSIN EST L\'ÉNONCÉ L\'A DÉJÀ SUR LA FEUILLE DE L\'ÉLÈVE',
                donnees.map(c => `${c.nom} : ${c.eleve} objet(s)`).join(' · '));
        }
    }

    // ── ET LE PDF, QUI EST CE QUE RÉMY IMPRIME ─────────────────────────────
    const bouton = await s.page.$('text=Télécharger le PDF');
    if (bouton) {
        const [recu] = await Promise.all([
            s.page.waitForEvent('download', { timeout: 40000 }),
            bouton.click()
        ]);
        const buf = await fs.readFile(await recu.path());
        const brut = buf.toString('latin1');
        // Les segments du flux PDF : « x y m  x y l  S ». L'axe, ses
        // graduations, ses crochets — tout est tiré au trait.
        const segments = (brut.match(/[\d.]+ [\d.]+ m\s+[\d.]+ [\d.]+ l/g) || []).length;
        dire(segments >= (vu ? vu.blocs * axesParBloc * 4 : 20),
            'le PDF porte les traits des droites',
            `${segments} segment(s) · ${Math.round(buf.length / 1024)} Ko`);
    }
}

console.log('\n' + '─'.repeat(78));
dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs.slice(0, 2).join(' | '));
dire(s.fenetresNatives.length === 0, 'aucune fenêtre native');
console.log(manques
    ? `\x1b[31m${manques} mesure(s) manquent.\x1b[0m`
    : '\x1b[32mLES DEUX FICHES PORTENT LEURS DROITES GRADUÉES.\x1b[0m');

await s.fermer();
process.exit(manques ? 1 : 0);
