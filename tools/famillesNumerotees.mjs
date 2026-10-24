// « 8. DIVISER ET LE ... » — DE QUOI EST-IL LE HUITIÈME ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant les résultats de recherche : « pourquoi j'ai des noms
// d'exercices avec un numéro devant du genre 8. Diviser et le ... »
//
// Vingt exercices portent un rang dans leur titre : les douze barreaux des
// fractions, les huit des racines. Dans l'arbre, le dossier au-dessus dit de
// quelle échelle il s'agit. À PLAT — en recherche — rien ne le disait, et le
// mot « diviser » suffit à le prouver : il ramène « 7. Diviser par un
// entier », « 8. Diviser par une fraction » ET « 8. Diviser, et le
// dénominateur qu'on rend entier ». DEUX lignes commençaient par « 8. » sans
// parler de la même chose, et c'est exactement la ligne qu'il a lue.
//
// CE QUE CETTE SONDE MESURE, sur le chemin du professeur et pas dans le code :
//
//   · chaque ligne numérotée de la liste à plat porte-t-elle sa famille ?
//   · la famille est-elle lisible EN ENTIER ? Une famille coupée en
//     « Racines car… » ne répondrait plus à la question posée ;
//   · QUE COÛTE-T-ELLE AU TITRE ? C'est la seconde phrase du dépôt : « une
//     mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
//     cassé ».
//   · ET LA RANGÉE GARDE-T-ELLE SA HAUTEUR ? 44 px pour toutes, numérotées ou
//     non : c'est l'irrégularité des hauteurs qui donnait « une sensation
//     d'oppression » au relecteur de Rémy.
//
// C'EST CETTE SONDE QUI A DÉCIDÉ DE LA MISE EN PAGE. Première version, la
// famille à CÔTÉ du titre sur la même ligne : « Racines carrées · » prenait
// 93 px des 269 que fait la colonne du professeur, il ne restait que 90 px de
// titre, et trois lignes sur vingt perdaient leur premier mot —
// « 5. Multipli… », « 3. Dénominate… », « 6. Additionn… ». On avait répondu
// « huitième DE QUOI » en retirant « huitième QUOI ». La famille est donc
// passée AU-DESSUS du titre, où la place était libre.
//
// LE SEUIL N'EST PAS « LA MOITIÉ DU TITRE », ET ON A ESSAYÉ : un titre comme
// « 8. Diviser, et le dénominateur qu'on rend entier » demande 317 px et
// n'avait DÉJÀ que 189 px avant la pastille — 60 %. Exiger la moitié revenait
// à exiger d'un titre de 47 caractères qu'il tienne dans une colonne de 269.
//
// CE QU'ON EXIGE DONC : le rang ET son premier mot restent lisibles. C'est ce
// qui fait qu'une ligne se reconnaît — « Racines carrées · 8. Diviser… » —, et
// la suite du titre vit dans l'infobulle et dans l'aperçu épinglé, comme elle y
// vivait déjà. La part visible est IMPRIMÉE, elle, pour qu'on voie le prix.
//
//   node tools/famillesNumerotees.mjs
//
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

/**
 * Les lignes de la liste à plat, telles qu'elles se PEIGNENT.
 *
 * `scrollWidth > clientWidth + 1` est la seule façon de savoir qu'un texte est
 * coupé : `text-overflow: ellipsis` ne change ni le texte ni aucun style
 * calculé, si bien qu'une sonde qui lit `textContent` croit tout lisible.
 */
const lireLesLignes = (s) => s.page.evaluate(() => {
    // CE QU'IL FAUDRAIT POUR MONTRER LE RANG ET SON PREMIER MOT. On le mesure
    // avec la police CALCULÉE de l'élément, sur un canevas : c'est la seule
    // façon d'obtenir la largeur d'un MORCEAU de texte sans le découper dans
    // la page. Le mot peut être en gras quand la recherche le surligne, ce qui
    // l'élargit de deux ou trois pixels — d'où la marge de 12 px, qui couvre
    // aussi les points de suspension que le navigateur dessine à la coupe.
    const largeurDuDebut = (el, texte) => {
        const m = texte.match(/^\d+\.\s+\S+/);
        if (!m) return 0;
        const cs = getComputedStyle(el);
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        return ctx.measureText(m[0]).width + 12;
    };
    return [...document.querySelectorAll('#drill-content .exo-list-item')].map((e) => {
        const fam = e.querySelector('.nav-item-famille');
        const tit = e.querySelector('.exo-item-titre');
        const texte = tit ? (tit.textContent || '').trim() : '';
        return {
            famille: fam ? (fam.textContent || '').trim() : '',
            familleCoupee: !!(fam && fam.scrollWidth > fam.clientWidth + 1),
            familleLargeur: fam ? Math.round(fam.getBoundingClientRect().width) : 0,
            titre: texte,
            ligneLargeur: Math.round(e.getBoundingClientRect().width),
            ligneHauteur: Math.round(e.getBoundingClientRect().height),
            titreVisible: tit ? Math.round(tit.clientWidth) : 0,
            titrePlein: tit ? Math.round(tit.scrollWidth) : 0,
            debutLisible: tit ? largeurDuDebut(tit, texte) <= tit.clientWidth : false,
            // Ce qui se lit VRAIMENT du titre : la largeur visible divisée par
            // celle qu'il faudrait pour tout montrer.
            partVisible: tit && tit.scrollWidth
                ? Math.round(100 * tit.clientWidth / tit.scrollWidth) : 100
        };
    });
});

async function ouvrirLeCatalogue(largeur, hauteur) {
    const s = await ouvrirSonde({ largeur, hauteur });
    await s.identifier();
    await dormir(800);
    // AU DOIGT, LA COLONNE EST DANS UN TIROIR. Sans ce geste, la liste existe
    // dans le document mais hors de l'écran : les largeurs mesurées seraient
    // celles d'un panneau que personne ne regarde.
    if (largeur < 768) {
        // `s.cliquer` ET PAS `if (b) b.click()` : la première version de cette
        // sonde devinait trois crochets, n'en trouvait aucun, et mesurait le
        // tiroir FERMÉ sans que rien ne le dise. Le vrai bouton est
        // `btn-toggle-sidebar`, lu dans index.html.
        await s.cliquer('#btn-toggle-sidebar', 'le tiroir du catalogue, au doigt');
        await dormir(500);
    }
    await s.doitExister('#sidebar-search-input', 'le champ de recherche du catalogue');
    return s;
}

async function chercher(s, mot) {
    const champ = await s.page.$('#sidebar-search-input');
    await champ.click();
    await s.page.evaluate(() => {
        const c = document.getElementById('sidebar-search-input');
        c.value = '';
        c.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await champ.type(mot, { delay: 35 });
    await dormir(900);
    await s.doitExister('#drill-content .exo-list-item', 'les résultats à plat');
    return lireLesLignes(s);
}

const numérotées = (lignes) => lignes.filter((l) => /^\d+\./.test(l.titre));

async function mesurer(largeur, hauteur) {
    const s = await ouvrirLeCatalogue(largeur, hauteur);
    const lots = {};
    for (const mot of ['fraction', 'racine', 'diviser']) {
        const lignes = await chercher(s, mot);
        lots[mot] = lignes;
        const num = numérotées(lignes);
        console.log(`\n\x1b[1m${largeur} px, en tapant « ${mot} »\x1b[0m  `
            + `${lignes.length} résultat(s), dont ${num.length} numéroté(s)`
            + gris(`  ligne = ${(lignes[0] || {}).ligneLargeur} px`));
        for (const l of num) {
            console.log(`    ${l.famille ? vert(l.famille + ' ·') : rouge('(aucune famille)')} `
                + `${l.titre}`
                + gris(`  [titre ${l.titreVisible}/${l.titrePlein} px, ${l.partVisible} %`
                    + `${l.debutLisible ? '' : ', DÉBUT COUPÉ'}]`));
        }
    }
    await s.photo('#drill-content', `tools/tmp/familles-${largeur}.png`);
    await s.fermer();
    return lots;
}

const LARGE = await mesurer(1400, 900);
const DOIGT = await mesurer(390, 844);

console.log('\n\x1b[1mVERDICT\x1b[0m');
for (const [nom, lots] of [['à l\'écran large', LARGE], ['au doigt', DOIGT]]) {
    // LES VINGT, OU PRESQUE : « fraction » ramène les douze barreaux des
    // fractions (leurs mots-clefs portent le mot), « racine » les huit des
    // racines. Sans ce compte, une sonde qui ne trouverait plus aucune ligne
    // numérotée répondrait « tout va bien ».
    const toutes = [...numérotées(lots.fraction), ...numérotées(lots.racine)];
    const vues = new Set(toutes.map((l) => l.titre));
    dire(`${nom} : ${vues.size} des 20 lignes numérotées sont passées sous l'œil`,
        vues.size >= 18, 'moins de 18, et la sonde ne mesure plus les deux familles');
    dire('chacune porte sa famille', toutes.length > 0 && toutes.every((l) => l.famille),
        toutes.filter((l) => !l.famille).map((l) => l.titre).join(' | ') || 'toutes');
    dire('aucune famille n\'est coupée', toutes.every((l) => !l.familleCoupee),
        toutes.filter((l) => l.familleCoupee).map((l) => l.famille).join(' | ') || 'aucune');
    dire('le rang et son premier mot restent lisibles', toutes.every((l) => l.debutLisible),
        toutes.filter((l) => !l.debutLisible).map((l) => l.titre).join(' | ') || 'tous');
    // CE QU'ON AURAIT PU CASSER : la régularité des hauteurs. Deux lignes de
    // texte dans une rangée faite pour une seule, et l'on retombe sur les
    // rangées de 50 à 79 px que le relecteur de Rémy a trouvées oppressantes.
    const hauteurs = [...new Set([...lots.fraction, ...lots.racine].map((l) => l.ligneHauteur))];
    dire('toutes les rangées gardent la même hauteur', hauteurs.length === 1,
        hauteurs.join(' / ') + ' px');
    // LE PRIX, IMPRIMÉ. Une seule ligne sur vingt descend sous la moitié de son
    // titre, et c'est la plus longue des vingt — celle qui était déjà coupée.
    const dures = toutes.filter((l) => l.partVisible < 50);
    console.log(gris(`     prix : ${dures.length} ligne(s) sous 50 % de titre visible`
        + (dures.length ? ' — ' + dures.map((l) => `${l.titre} (${l.partVisible} %)`).join(', ') : '')));
}

const deuxHuit = LARGE.diviser.filter((l) => l.titre.startsWith('8.'));
dire('les deux « 8. » de « diviser » ne se confondent plus',
    deuxHuit.length === 2 && deuxHuit[0].famille && deuxHuit[1].famille
    && deuxHuit[0].famille !== deuxHuit[1].famille,
    deuxHuit.map((l) => `${l.famille || '(aucune)'} · ${l.titre}`).join('  /  '));

console.log(ratés ? rouge(`\n${ratés} mesure(s) en échec.`) : vert('\nTout tient.'));
process.exit(ratés ? 1 : 0);
