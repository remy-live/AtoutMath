// LA ZONE « DIRECT », SUR UN TÉLÉPHONE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture de son iPhone à l'appui : « Sur portable la zone direct est
// moche quand même que faudrait il faire ? »
//
// ── CE QU'ON MESURE, ET POURQUOI PAS « ÇA DÉBORDE » ────────────────────────
//
// Rien ne déborde : tout tient dans l'écran. Ce qui ne va pas est que les sept
// commandes de l'heure sont des ONGLETS, et qu'un onglet suppose une RANGÉE.
// À 390 px, la rangée se replie en plusieurs lignes dont chacune est large de
// son contenu : plus rien ne s'aligne, l'onglet ouvert n'est plus au bord de
// son panneau mais au milieu du tas, et les six autres — bordure transparente,
// fond transparent — ne ressemblent plus à des boutons du tout.
//
// On compte donc : combien de LIGNES la rangée occupe, combien de BORDS GAUCHES
// différents (c'est-à-dire ce que l'oeil a comme colonnes à suivre), et où
// tombe l'onglet ouvert par rapport à son panneau.
//
//   node tools/piloteAuDoigt.mjs [largeur]
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const LARGEUR = Number(process.argv[2]) || 390;

const s = await ouvrirSonde({ largeur: LARGEUR, hauteur: 1200 });
await s.identifier();
const classeId = s.info.classe;

await s.page.evaluate(async () => {
    const m = await import('./js/ui/espaceClasses.js');
    await m.ouvrirEspaceClasses();
});
await dormir(2200);
await s.cliquer(`[data-ouvrir="${classeId}"]`, 'la carte de la classe');
await dormir(2500);
await s.doitExister('[data-onglet="direct"]', 'l\'onglet « Le direct »');
await s.cliquer('[data-onglet="direct"]', 'l\'onglet « Le direct »');
await dormir(2500);
// ON OUVRE UNE COMMANDE : c'est l'état de sa capture — « Calculatrice » encadrée
// au milieu des autres. Sans cela on mesurerait la barre au repos, qui est le
// seul moment où elle a l'air d'une liste.
await s.doitExister('.ec-pilote-onglet', 'les onglets des commandes de l\'heure');
await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('.ec-pilote-onglet')]
        .find(x => /Calculatrice/.test(x.textContent || ''));
    if (b) b.click();
});
await dormir(2000);

const vu = await s.page.evaluate(() => {
    const strip = document.querySelector('.ec-pilote-onglets');
    const onglets = [...document.querySelectorAll('.ec-pilote-onglet')];
    const r = (e) => e.getBoundingClientRect();
    const lignes = [...new Set(onglets.map(o => Math.round(r(o).top)))];
    const bords = [...new Set(onglets.map(o => Math.round(r(o).left)))];
    const actif = document.querySelector('.ec-pilote-onglet--actif');
    const panneau = document.querySelector('.ec-pilote-panneau');
    return {
        largeur: window.innerWidth,
        combien: onglets.length,
        lignes: lignes.length,
        bordsGauches: bords.sort((a, b) => a - b),
        // CE QUE CHAQUE ONGLET MONTRE DE LUI-MÊME. Au repos, l'onglet inactif
        // n'a ni fond ni bordure : sur un téléphone, où il n'y a pas de survol,
        // RIEN ne dit qu'on peut appuyer dessus.
        inactifsSansCadre: onglets.filter(o => o !== actif).filter(o => {
            const st = getComputedStyle(o);
            return st.borderTopColor === 'rgba(0, 0, 0, 0)'
                && (st.backgroundColor === 'rgba(0, 0, 0, 0)' || st.backgroundColor === 'transparent');
        }).length,
        // L'ONGLET OUVERT EST-IL AU BORD DE SON PANNEAU ? C'est tout ce qui
        // fait qu'on lit « onglet » et non « boîte posée au hasard ».
        actif: actif ? { mot: (actif.textContent || '').trim().slice(0, 28),
            bas: Math.round(r(actif).bottom), gauche: Math.round(r(actif).left) } : null,
        panneau: panneau ? { haut: Math.round(r(panneau).top),
            gauche: Math.round(r(panneau).left) } : null,
        stripHaut: strip ? Math.round(r(strip).height) : null,
        // ET LA PAGE DÉFILE-T-ELLE DANS LA PAGE ? Sa capture montre un cadre
        // bleu coupé en haut ET en bas de l'écran.
        defilantsInternes: [...document.querySelectorAll('.ec-corps, .ec-pilote, .ec-pilote-panneau')]
            .filter(e => e.scrollHeight > e.clientHeight + 4)
            .map(e => `${e.className.split(' ')[0]} ${e.clientHeight}/${e.scrollHeight}`)
    };
});
console.log(JSON.stringify(vu, null, 2));

console.log(`\n  ${vu.combien} commandes sur ${vu.lignes} lignes`
    + ` · ${vu.bordsGauches.length} bords gauches différents`
    + ` · ${vu.inactifsSansCadre} sans cadre ni fond`);
if (vu.actif && vu.panneau) {
    console.log(`  la commande ouverte finit à ${vu.actif.bas} px, son panneau commence à `
        + `${vu.panneau.haut} px · bords gauches ${vu.actif.gauche} / ${vu.panneau.gauche} px`);
}

// ── LE VERDICT, SOUS 560 px ────────────────────────────────────────────────
//
// Au-dessus, on se contente de RAPPORTER : la rangée d'onglets y tient encore
// debout — mal (trois lignes et 63 px entre l'onglet ouvert et son panneau,
// mesurés à 1024), mais c'est un autre chantier, et Rémy n'a pas tranché.
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};
if (LARGEUR <= 560) {
    console.log('');
    dire('UNE SEULE COLONNE — l\'oeil a un bord à suivre',
        vu.bordsGauches.length === 1, `${vu.bordsGauches.length} bord(s) : ${vu.bordsGauches}`);
    dire('CHAQUE COMMANDE SE VOIT COMME UN BOUTON — il n\'y a pas de survol au doigt',
        vu.inactifsSansCadre === 0, `${vu.inactifsSansCadre} sans cadre ni fond`);
    dire('une ligne par commande', vu.lignes === vu.combien, `${vu.lignes}/${vu.combien}`);
    dire('et la liste n\'enferme pas un défilement de plus',
        vu.defilantsInternes.length === 0, vu.defilantsInternes.join(' · '));
}

await s.photo('.ec-pilote', `tools/tmp/pilote-${LARGEUR}.png`);
console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
await s.fermer();
process.exit(ratés ? 1 : 0);
