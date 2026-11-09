// LES TROIS JEUX VIFS TOURNENT VRAIMENT — chat perché, ruée, pluie.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/jeuxVifsQuiTournent.mjs [robots]
//
// RÉMY : « Je préfère un jeu assez rapide fun », puis « Les 3 sont top tu peux
// y aller ».
//
// ── CE QUE `npm test` NE PEUT PAS DIRE ────────────────────────────────────
//
// `tests/consignesDesJeuxVifs.test.mjs` garde L'ARBITRE — qui obéit, ce qu'on
// crie à la classe, et qu'un terrain porte toujours de quoi jouer. Il le garde
// bien : six défauts remis, six épreuves tombées. Mais un arbitre juste,
// branché nulle part, ne fait courir personne.
//
// CE QUI NE SE MESURE QU'ICI, et pour les trois jeux :
//
//   · que la consigne PARAISSE, en grand, et qu'elle CHANGE ;
//   · que les joueurs BOUGENT — des robots figés donneraient une démo
//     immobile, et c'est exactement ce que Rémy viendrait regarder ;
//   · que le score MONTE, donc qu'un bon nombre soit vraiment compté ;
//   · et, pour chaque jeu, sa règle propre : au chat on n'est sauvé que sur un
//     nombre qui obéit ; à la ruée un mauvais nombre coûte ; à la pluie, les
//     nombres tombent pour de bon.
//   · enfin le CHEMIN DE RÉMY en entier, jusqu'au bouton.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const ROBOTS = Math.max(3, Number(process.argv[2]) || 11);

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1700, hauteur: 1050 });
await s.identifier();

/** Ouvre l'un des trois jeux, par le module. */
const ouvrir = (jeu) => s.page.evaluate(async ([j, robots]) => {
    if (window.__v) window.__v.fermer();
    const { ouvrirUnJeuVif } = await import('./js/ui/jeuxVifsUI.js');
    window.__v = ouvrirUnJeuVif({
        graine: 'sonde-' + j, jeu: j, robots, secondes: 300, noms: true
    });
}, [jeu, ROBOTS]);

/** Ce que l'écran montre, lu comme un élève le lirait. */
const vu = () => s.page.evaluate(() => {
    const t = document.querySelector('.jv-terrain');
    const pions = [...document.querySelectorAll('.jv-pion')];
    return {
        terrain: t ? Math.round(t.getBoundingClientRect().height) : 0,
        consigne: (document.querySelector('[data-consigne]') || {}).textContent || '',
        jetons: document.querySelectorAll('.jv-jeton').length,
        pions: pions.length,
        bleus: document.querySelectorAll('.jv-pion--0').length,
        orange: document.querySelectorAll('.jv-pion--1').length,
        chat: !!document.querySelector('.jv-chat'),
        saufs: document.querySelectorAll('.jv-pion--sauf').length,
        figes: document.querySelectorAll('.jv-pion--fige').length,
        places: pions.map(p => `${p.style.left}|${p.style.top}`).join(' '),
        etat: window.__v.etat()
    };
});

for (const [jeu, nom] of [['chat', 'LE CHAT PERCHÉ'], ['ruee', 'LA RUÉE'],
                          ['pluie', 'LA PLUIE']]) {
    console.log(`\n${nom}`);
    console.log('─'.repeat(68));
    await ouvrir(jeu);
    await dormir(900);
    await s.doitExister('.jv-terrain', 'le terrain');
    await s.doitExister('.jv-jeton', 'un nombre posé');
    await s.doitExister('.jv-pion--moi', 'mon pion, reconnaissable');

    const depart = await vu();
    dire('LE TERRAIN EST DESSINÉ, ET IL OCCUPE DE LA PLACE',
        depart.terrain > 200 && depart.jetons >= 6,
        `${depart.terrain} px, ${depart.jetons} nombres`);
    // LA CONSIGNE EST LE PLUS GROS ÉLÉMENT DE L'ÉCRAN : sans elle, les trois
    // jeux ne sont que des ronds qui courent.
    dire('LA CONSIGNE EST ÉCRITE EN TOUTES LETTRES',
        /[A-ZÉÈ]{4}/.test(depart.consigne), `« ${depart.consigne} »`);
    dire('LES DEUX ÉQUIPES SONT LÀ', depart.bleus > 0 && depart.orange > 0
        && depart.pions === ROBOTS + 1, `${depart.bleus} + ${depart.orange}`);
    dire('ET LE CHAT N\'EST LÀ QUE POUR LE CHAT PERCHÉ',
        depart.chat === (jeu === 'chat'), `chat : ${depart.chat}`);

    await dormir(2600);
    const apres = await vu();
    dire('LES JOUEURS BOUGENT', apres.places !== depart.places,
        apres.places === depart.places ? 'aucun pion n\'a bougé' : 'les pions se déplacent');

    // ── LE SCORE MONTE, donc un bon nombre est vraiment compté ───────────
    let monte = false;
    for (let t = 0; t < 14 && !monte; t++) {
        await dormir(1000);
        const e = await vu();
        monte = e.etat.scores.some(n => n > 0);
    }
    const pendant = await vu();
    dire('LE SCORE D\'UNE ÉQUIPE MONTE', monte,
        `scores ${JSON.stringify(pendant.etat.scores)}, ${pendant.etat.ramasses} ramassage(s)`);

    // ── LA RÈGLE PROPRE À CHAQUE JEU ────────────────────────────────────
    if (jeu === 'chat') {
        // ON N'EST SAUVÉ QUE SUR UN NOMBRE QUI OBÉIT, et sur rien d'autre.
        // C'est LA règle du jeu : si l'anneau vert s'allumait sur n'importe
        // quel perchoir, la consigne ne servirait plus à rien.
        const faux = await s.page.evaluate(() => {
            const e = window.__v.etat();
            return { saufs: document.querySelectorAll('.jv-pion--sauf').length,
                     bons: e.jetons.filter(j => j.obeit).length };
        });
        dire('ON EST SAUVÉ SUR UN BON NOMBRE, et il y en a',
            faux.bons > 0 && faux.saufs <= faux.bons,
            `${faux.saufs} sauvé(s) pour ${faux.bons} bon(s) nombre(s)`);
        dire('LE CHAT POURSUIT — il ne reste pas au milieu',
            Math.abs(pendant.etat.chat.x - depart.etat.chat.x)
            + Math.abs(pendant.etat.chat.y - depart.etat.chat.y) > 0.5,
            `(${depart.etat.chat.x.toFixed(1)} ; ${depart.etat.chat.y.toFixed(1)}) → `
            + `(${pendant.etat.chat.x.toFixed(1)} ; ${pendant.etat.chat.y.toFixed(1)})`);
    }
    if (jeu === 'ruee') {
        // SE TROMPER COÛTE : des pions figés, c'est la preuve que le mauvais
        // nombre a été puni. Aucun figé en vingt secondes voudrait dire que
        // la pénalité n'est branchée nulle part.
        dire('SE TROMPER FIGE — la pénalité est branchée', pendant.figes > 0,
            `${pendant.figes} pion(s) figé(s)`);
    }
    if (jeu === 'pluie') {
        // LES NOMBRES TOMBENT, et c'est tout le jeu. Une pluie immobile
        // serait une ruée mal dessinée.
        const hauteurs = (q) => q.map(p => p.t);
        const avant = await s.page.evaluate(() => [...document.querySelectorAll('.jv-jeton')]
            .map(e => ({ t: e.style.top })));
        await dormir(900);
        const apresPluie = await s.page.evaluate(() => [...document.querySelectorAll('.jv-jeton')]
            .map(e => ({ t: e.style.top })));
        dire('LES NOMBRES TOMBENT VRAIMENT',
            JSON.stringify(hauteurs(avant)) !== JSON.stringify(hauteurs(apresPluie)),
            `${avant.length} gouttes`);
    }

    // ── ET LA CONSIGNE CHANGE, sans remettre le terrain à neuf ──────────
    //
    // C'EST LE CŒUR DES TROIS JEUX : les mêmes nombres changent de camp, et
    // trente élèves doivent repartir. Remettre des nombres neufs à chaque
    // consigne volerait ce moment-là.
    const avantConsigne = (await vu()).consigne;
    await s.page.evaluate(() => window.__v.consigneSuivante());
    await dormir(400);
    const apresConsigne = await vu();
    dire('LA CONSIGNE CHANGE', apresConsigne.consigne !== avantConsigne,
        `« ${avantConsigne} » → « ${apresConsigne.consigne} »`);
    await s.page.screenshot({ path: `tools/tmp/vif-${jeu}.png` });
    console.log(`  . photo : tools/tmp/vif-${jeu}.png`);
}

/* ─────────────────── ET LE CHEMIN DE RÉMY, EN ENTIER ───────────────────── */
//
// Tout ce qui précède a ouvert les jeux PAR LE MODULE : c'est le jeu qu'on
// mesurait, pas la porte. Mais un bouton qui n'ouvre rien a exactement la même
// apparence qu'un bouton qui marche — ce dépôt l'a déjà payé deux fois.
console.log('\nLE CHEMIN DU PROFESSEUR');
console.log('─'.repeat(68));
await s.page.evaluate(() => { if (window.__v) window.__v.fermer(); });
await dormir(300);
await s.page.evaluate(async () => {
    const { creerClasse, apercuDeListe, importerListe } =
        await import('./js/core/espaceProf.js');
    const c = await creerClasse('6e Vifs', '6e');
    const ap = await apercuDeListe(c.id, 'Alpha Ana;ana.a;1111\n', '');
    await importerListe(c.id, ap.apercu.texte);
});
await s.page.click('#top-btn-classe');
await dormir(2500);
await s.doitExister('#ec-racine [data-ouvrir] .ec-carte-nom', 'le nom d\'une classe');
await s.page.click('#ec-racine [data-ouvrir] .ec-carte-nom');
await dormir(1800);
await s.page.click('#ec-racine [data-onglet="direct"]');
await dormir(1800);
await s.doitExister('[data-outil="vifs"]', 'l\'onglet des jeux vifs');
await s.page.click('[data-outil="vifs"]');
await dormir(1200);
await s.doitExister('[data-vif-jeu]', 'le choix du jeu');
await s.doitExister('[data-vif-familles]', 'le choix des consignes');
// ON CHOISIT LA RUÉE ET « les multiples seulement » : un déroulant que le jeu
// n'écoute pas aurait exactement la même apparence qu'un déroulant qui marche.
await s.page.selectOption('[data-vif-jeu]', 'ruee');
await s.page.selectOption('[data-vif-familles]', 'multiples');
await s.page.click('[data-vif-demo]');
await dormir(1500);
const parLeBouton = await s.page.evaluate(() => ({
    terrain: !!document.querySelector('.jv-terrain'),
    consigne: (document.querySelector('[data-consigne]') || {}).textContent || '',
    pions: document.querySelectorAll('.jv-pion').length,
    chat: !!document.querySelector('.jv-chat')
}));
dire('LE BOUTON DU PILOTE OUVRE VRAIMENT LE JEU',
    parLeBouton.terrain && parLeBouton.pions > 2,
    `${parLeBouton.pions} pions`);
dire('ET C\'EST BIEN LE JEU CHOISI', !parLeBouton.chat,
    parLeBouton.chat ? 'le chat est là alors qu\'on a demandé la ruée' : 'la ruée, sans chat');
// ET LA FAMILLE CHOISIE EST OBÉIE : « les multiples seulement » ne doit jamais
// donner « LES NOMBRES PREMIERS ».
dire('ET LA FAMILLE DE CONSIGNES CHOISIE EST OBÉIE',
    /MULTIPLES/.test(parLeBouton.consigne), `« ${parLeBouton.consigne} »`);
await s.page.click('.jv-sortir');
await dormir(500);
dire('ET LA CROIX REFERME LE JEU',
    await s.page.evaluate(() => !document.querySelector('.jv-voile')));

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach(e => console.log('  ! ' + String(e).slice(0, 180)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mLES TROIS JEUX TOURNENT.\x1b[0m');
process.exit(ratés ? 1 : 0);
