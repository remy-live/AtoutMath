// QUELS BOUTONS LE PLANCHER TACTILE A-T-IL ÉTIRÉS ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, DEUX FOIS. Le 8 octobre : « sur iPhone, les retenues font des ovales ».
// Le 13 : « y a pas un souci sur les retenues, elle devrait pas être ronde » —
// le même défaut, dans un autre exercice. La correction d'alors était juste ;
// elle avait été posée sur UN des deux chemins qui mènent au même endroit.
//
// ── POURQUOI UN OUTIL, ET PAS UNE TROISIÈME CORRECTION ────────────────────
//
// `css/modules.css` pose un plancher de 44 px — la pulpe d'un index — à tout
// bouton de jeu, SAUF à ceux qui déclarent que leur taille leur appartient
// (`btn-carre`). La liste des exceptions ne peut pas être devinée : un jeton ne
// s'appelle pas une case, un rond de retenue non plus. Chaque jeu qui ajoute
// une pastille doit donc le DIRE — et personne ne peut vérifier de tête que
// les quatre-vingts l'ont fait.
//
// Celui-ci ouvre chaque activité du catalogue sur un téléphone de 390 × 844 et
// mesure CHAQUE bouton de la couche de jeu. Il signale deux choses :
//
//   · un OVALE — un bouton dont le rayon dit « rond » et dont la hauteur ne
//     vaut pas la largeur. C'est le défaut que Rémy voit ;
//   · un ÉTIRÉ — un bouton nettement plus haut que large à cause du plancher.
//     Une touche de pavé numérique (38 × 44) ne l'est pas : c'est la forme
//     d'une touche. On ne crie qu'au-delà d'un tiers d'écart.
//
//     node tools/boutonsEtires.mjs            # toutes les activités
//     node tools/boutonsEtires.mjs <id>       # un exercice seul
//
// CE QU'IL NE VOIT PAS, ET IL FAUT LE DIRE : les boutons qui n'apparaissent
// qu'APRÈS avoir joué. Les ronds de retenue de « Poser une opération » sont de
// ceux-là — ils naissent à l'étape 2, une fois les chiffres alignés. L'outil
// mesure ce que l'écran d'accueil d'un jeu porte ; pour le reste, il faut
// jouer. C'est une limite, pas un oubli.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const seul = process.argv.slice(2).find(a => !a.startsWith('--')) || null;

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await s.identifier();

// UNE ACTIVITÉ, UN EXERCICE. Quatre-vingt-treize exercices partagent une
// soixantaine d'activités, et c'est l'ACTIVITÉ qui dessine les boutons : les
// ouvrir toutes deux fois ne mesurerait rien de plus et doublerait l'attente.
const aOuvrir = await s.page.evaluate(async (unSeul) => {
    const { exercices } = await import('./js/data/catalog.js');
    if (unSeul) {
        const e = exercices.find(x => x.id === unSeul);
        return e ? [{ id: e.id, titre: e.title }] : [];
    }
    const vues = new Set(), liste = [];
    for (const e of exercices) {
        if (!e.activityId || vues.has(e.activityId)) continue;
        vues.add(e.activityId);
        liste.push({ id: e.id, titre: e.title });
    }
    return liste;
}, seul);

console.log(`\n\x1b[1mLES BOUTONS DE ${aOuvrir.length} ACTIVITÉ(S), AU DOIGT (390 × 844)\x1b[0m\n`);

const ovales = [], etires = [], voulus = [];
let mesures = 0, muets = 0;

for (const exo of aOuvrir) {
    let vus = [];
    try {
        await s.ouvrirExercice(exo.id);
        await dormir(900);
        vus = await s.page.evaluate(() => {
            const couche = document.querySelector('#game-layer');
            if (!couche) return [];
            return [...couche.querySelectorAll('button')].map(b => {
                const r = b.getBoundingClientRect(), c = getComputedStyle(b);
                if (r.width < 1 || r.height < 1) return null;   // caché : rien à dire
                return {
                    classe: (b.className || '').trim().slice(0, 40),
                    texte: (b.textContent || '').trim().slice(0, 14),
                    l: +r.width.toFixed(1), h: +r.height.toFixed(1),
                    rayon: c.borderRadius, plancher: c.minHeight
                };
            }).filter(Boolean);
        });
    } catch (e) {
        muets++;
        console.log(`  \x1b[33m?   \x1b[0m${exo.id.padEnd(26)} ${String(e.message || e).slice(0, 44)}`);
        continue;
    }
    mesures += vus.length;
    // UNE PASTILLE LARGE N'EST PAS UN OVALE, et la première écriture de cette
    // règle le criait sur cent dix-sept boutons parfaitement sains : tous les
    // boutons en forme de GÉLULE — « Un indice », « Montre-moi », « Vérifier »
    // — portent `border-radius: 999px` et font 127 × 44. Ronds par le rayon,
    // bien plus larges que hauts, et c'est leur forme voulue.
    //
    // Ce que Rémy voit est l'inverse exact : un rond devenu PLUS HAUT QUE
    // LARGE. C'est le plancher de 44 px qui étire la hauteur, jamais la
    // largeur — donc la direction suffit à séparer la gélule de l'ovale.
    // « ROND » SE MESURE SUR LE GRAND CÔTÉ, et c'est la troisième écriture de
    // cette ligne. Sur le PETIT côté, un simple coin arrondi suffisait à faire
    // un « rond » : le chiffre 3 d'une ligne de calcul, 18 × 25 px avec 10 px
    // de rayon, était déclaré ovale alors qu'il a la forme d'un chiffre. Sur
    // le grand côté, seuls un cercle (50 %) et une gélule (999 px) passent.
    const estRond = (v) => /50%/.test(v.rayon)
        || parseFloat(v.rayon) >= Math.max(v.l, v.h) / 2 - 0.5;
    for (const v of vus) {
        const rapport = v.h / v.l;
        // UN QUART D'ÉCART, PAS UN DIXIÈME. Un bouton d'icône de 38 × 44 est
        // un carré aux coins ronds, pas un ovale — le commentaire du plancher
        // le dit déjà : « la forme d'une touche ». Les deux vrais défauts
        // trouvés jusqu'ici valaient 2,4 fois ; on ne crie pas pour 1,16.
        if (estRond(v) && rapport > 1.25) { ovales.push({ exo, v, rapport }); continue; }
        if (rapport <= 1.35 || v.plancher === 'auto') continue;
        // QUI A ÉTIRÉ CE BOUTON ? L'outil ne le disait pas, et la question
        // n'est pas de forme : elle décide de la correction.
        //
        // `v.plancher !== 'auto'` dit seulement que le plancher S'APPLIQUE à
        // ce bouton, pas qu'il l'a étiré. Un bouton de 43 × 67 dont le
        // plancher vaut 44 est haut de 67 parce que SON JEU le dessine ainsi —
        // le plancher n'y est pour rien. On l'a cru, et l'on a failli
        // « corriger » une cible du jeu des Diviseurs qui porte deux lignes de
        // texte empilées.
        //
        //   · hauteur ≈ plancher  → c'est LE PLANCHER qui étire. On élargit,
        //     ou le jeu déclare `btn-carre` si sa hauteur est sa mise en page.
        //   · hauteur > plancher  → c'est LE JEU. On relit sa feuille avant de
        //     toucher à quoi que ce soit : elle dit souvent pourquoi.
        const plancher = parseFloat(v.plancher) || 0;
        const parLePlancher = Math.abs(v.h - plancher) <= 1.5;
        (parLePlancher ? etires : voulus).push({ exo, v, rapport });
    }
    const ennuis = ovales.filter(x => x.exo === exo).length
        + etires.filter(x => x.exo === exo).length
        + voulus.filter(x => x.exo === exo).length;
    console.log(`  ${ennuis ? '\x1b[31mnon \x1b[0m' : '\x1b[32mok  \x1b[0m'}`
        + `${exo.id.padEnd(26)} ${String(vus.length).padStart(3)} bouton(s)`
        + (ennuis ? `  \x1b[31m${ennuis} à revoir\x1b[0m` : ''));
}

const dire = (titre, liste, pourquoi) => {
    console.log(`\n\x1b[1m${titre}\x1b[0m  (${liste.length})`);
    if (!liste.length) { console.log('  aucun.'); return; }
    console.log(`  ${pourquoi}`);
    for (const { exo, v, rapport } of liste) {
        console.log(`  · ${exo.id.padEnd(24)} « ${v.classe || v.texte} »`
            + `  ${v.l} × ${v.h} px (${rapport.toFixed(2)}×) · rayon ${v.rayon}`);
    }
};

dire('DES OVALES — un bouton rond qui n\'est pas rond', ovales,
    'Ajouter `btn-carre` à leur classe : « ma taille est la mienne ».');
dire('ÉTIRÉS PAR LE PLANCHER — leur hauteur vaut le plancher, pas leur mise en page',
    etires,
    'On ÉLARGIT — ou le jeu déclare `btn-carre` si sa hauteur est sa mise en page.');
dire('HAUTS PARCE QUE LEUR JEU LE VEUT — le plancher n\'y est pour rien', voulus,
    'Relire la feuille du jeu AVANT d\'y toucher : elle dit souvent pourquoi.');

console.log('\n' + '─'.repeat(74));
console.log(`  ${mesures} boutons mesurés · ${ovales.length} ovale(s) · `
    + `${etires.length} étiré(s) par le plancher · ${voulus.length} haut(s) par leur jeu · `
    + `${muets} activité(s) non ouvertes`);
console.log(`  fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
await s.fermer();
process.exitCode = ovales.length ? 1 : 0;
