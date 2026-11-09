// LE PLATEAU DES NOMBRES JOUE VRAIMENT — le mode démo, mesuré à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/plateauQuiJoue.mjs [robots] [style]
//   node tools/plateauQuiJoue.mjs 11 question
//
// RÉMY : « j'aimerai bien qu'on fasse un jeu qui prend l'écran à 30 » puis
// « et j'aimerai bien un mode démo ».
//
// ── CE QUE `npm test` NE PEUT PAS DIRE ────────────────────────────────────
//
// `tests/plateauDesNombres.test.mjs` garde LA RÈGLE — qui prend quoi, avec qui,
// pour combien — et il la garde bien : sept défauts remis, sept épreuves
// tombées. Mais une règle juste, branchée nulle part, ne fait prendre aucun 56.
// Ce qui ne se mesure qu'ici :
//
//   · que les pions PARAISSENT, aux deux couleurs, et qu'on retrouve le sien ;
//   · qu'ils BOUGENT — un robot figé donnerait une démo immobile, et c'est
//     exactement ce que Rémy viendrait regarder ;
//   · qu'une prise ARRIVE pour de vrai, que le nombre disparaisse du plateau
//     et que le score de l'équipe monte ;
//   · que l'écran dise CE QUI MANQUE quand on est sur une cible — c'est le
//     moment d'enseignement du jeu, et il ne tient qu'à une phrase ;
//   · et qu'un plateau à trente pions tienne sans erreur de page.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const ROBOTS = Math.max(1, Number(process.argv[2]) || 11);
const STYLE = ['question', 'jetons', 'libre'].includes(process.argv[3])
    ? process.argv[3] : 'question';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

/**
 * LA PHOTO SE PREND SUR LA PAGE QU'ON LUI DONNE.
 *
 * `s.photo` découpe LA PAGE DE LA SONDE, et elle crie quand l'image est
 * coupée — ce qui est précieux. Mais elle ne sait découper QUE celle-là ;
 * pour une seconde ardoise, ou simplement pour choisir la page, il faut
 * celle-ci. Elle DIT quand le sélecteur ne désigne rien : une photo ratée en
 * silence est pire qu'une photo ratée.
 */
const photo = async (page, sel, fichier) => {
    const e = await page.$(sel);
    if (!e) { console.log(`  . pas de photo : ${sel} n'est pas à l'écran`); return; }
    await e.screenshot({ path: fichier });
    console.log(`  . photo : ${fichier}`);
};

const s = await ouvrirSonde({ largeur: 1700, hauteur: 1050 });
await s.identifier();

console.log(`\nLE PLATEAU EN DÉMO — ${ROBOTS} robots, style « ${STYLE} »`);
console.log('─'.repeat(68));

// ON OUVRE LA PARTIE PAR LE MODULE, et non par un bouton : ce qu'on mesure ici
// est le JEU, pas le chemin qui y mène. Le bouton a son épreuve à lui, dans
// `tests/crochetsDeLEspaceClasses.test.mjs`.
await s.page.evaluate(async ([robots, style]) => {
    const { ouvrirLePlateau } = await import('./js/ui/plateauUI.js');
    window.__partie = ouvrirLePlateau({
        graine: 'sonde-plateau', robots, style, operation: '×', secondes: 300
    });
}, [ROBOTS, STYLE]);
await dormir(900);

await s.doitExister('.pdn-voile', 'le voile du plateau');
await s.doitExister('.pdn-terrain', 'le terrain');
await s.doitExister('.pdn-pions', 'la couche des ronds');
await s.doitExister('.pdn-case--cible', 'au moins un nombre à prendre');
await s.doitExister('.pdn-pion--moi', 'mon rond, reconnaissable');

/** Ce que l'écran montre, lu comme un élève le lirait. */
const vu = () => s.page.evaluate(() => {
    const pions = [...document.querySelectorAll('.pdn-pion')];
    const g = document.querySelector('.pdn-terrain');
    return {
        cases: document.querySelectorAll('.pdn-case').length,
        cibles: document.querySelectorAll('.pdn-case--cible').length,
        pions: pions.length,
        bleus: document.querySelectorAll('.pdn-pion--0').length,
        orange: document.querySelectorAll('.pdn-pion--1').length,
        // ON MESURE LE RECTANGLE, jamais une propriété : un terrain présent
        // dans le document mais haut de zéro pixel n'est pas un plateau.
        hautDeLaGrille: g ? Math.round(g.getBoundingClientRect().height) : 0,
        // LES CARRÉS ALLUMÉS — « quand on recouvre un carré, le carré
        // s'éclaire ». C'est la demande de Rémy, et elle ne se lit qu'ici.
        allumes: document.querySelectorAll('.pdn-case--allumee').length,
        dit: (document.querySelector('.pdn-dit') || {}).textContent || '',
        scores: [...document.querySelectorAll('.pdn-eq b')].map(b => Number(b.textContent)),
        etat: window.__partie ? window.__partie.etat() : null,
        // LA POSITION DE CHAQUE ROND, pour savoir s'ils bougent vraiment. Elle
        // se lit sur le style, puisque les ronds flottent au-dessus de la
        // grille et n'appartiennent plus à une case.
        places: pions.map(p => `${p.style.left}|${p.style.top}`).join(' ')
    };
});

const depart = await vu();
dire('LE PLATEAU EST DESSINÉ, ET IL OCCUPE DE LA PLACE',
    depart.cases > 50 && depart.hautDeLaGrille > 150,
    `${depart.cases} carrés, ${depart.hautDeLaGrille} px de haut`);
// « QUAND ON RECOUVRE UN CARRÉ, LE CARRÉ S'ÉCLAIRE ». Au départ, les trente
// ronds sont posés sur leurs bords : il y a donc forcément des carrés allumés,
// et s'il n'y en a aucun c'est que l'éclairage n'est branché nulle part.
dire('ET LES CARRÉS RECOUVERTS S\'ÉCLAIRENT', depart.allumes > 0,
    `${depart.allumes} carré(s) allumé(s)`);
dire('LES DEUX ÉQUIPES SONT SUR LE PLATEAU',
    depart.bleus > 0 && depart.orange > 0 && depart.pions === ROBOTS + 1,
    `${depart.bleus} bleu(s), ${depart.orange} orange, ${depart.pions} pions en tout`);
dire('ET DES NOMBRES À PRENDRE Y SONT POSÉS', depart.cibles >= 5,
    `${depart.cibles} cible(s)`);

// ── LES ROBOTS BOUGENT-ILS ? ──────────────────────────────────────────────
//
// UN ROBOT FIGÉ EST LE PIRE DÉFAUT POSSIBLE de ce mode : Rémy ouvrirait la
// démo, verrait un plateau immobile, et refermerait. Rien ne crierait.
await dormir(2600);
const apres = await vu();
dire('LES ROBOTS BOUGENT', apres.places !== depart.places,
    apres.places === depart.places ? 'aucun pion n\'a changé de case'
        : 'les pions ont changé de place');

// ── UNE PRISE ARRIVE-T-ELLE TOUTE SEULE ? ────────────────────────────────
//
// On laisse jouer. Les robots visent, se retrouvent, et prennent — c'est
// précisément ce que Rémy veut voir sans avoir trente élèves sous la main.
let prises = 0;
let vuAnnonce = false;
for (let t = 0; t < 26 && prises === 0; t++) {
    await dormir(1000);
    const e = await vu();
    prises = (e.etat && e.etat.prises.length) || 0;
    if (!vuAnnonce) {
        vuAnnonce = await s.page.evaluate(
            () => !!document.querySelector('.pdn-annonce'));
    }
}
const pendant = await vu();
dire('UNE PRISE ARRIVE SANS QU\'ON Y TOUCHE', prises > 0,
    prises ? `${prises} prise(s) : ${JSON.stringify(
        (pendant.etat.prises || []).slice(0, 3).map(p => `${p.qui.join('×')}=${p.valeur}`))}`
        : 'aucune prise en 26 secondes');
// LE SCORE D'UNE ÉQUIPE MONTE, et c'est ce qui dit que la prise a VRAIMENT
// compté — une annonce sans score serait un décor.
dire('ET LE SCORE D\'UNE ÉQUIPE MONTE',
    pendant.scores.some(n => n > 0), `scores : ${JSON.stringify(pendant.scores)}`);
dire('L\'ÉCRAN ANNONCE LA PRISE', vuAnnonce,
    vuAnnonce ? 'bandeau vu' : 'aucun bandeau pendant la partie');

// ── L'ÉCRAN DIT-IL CE QUI MANQUE ? ───────────────────────────────────────
//
// C'EST LE MOMENT D'ENSEIGNEMENT DU JEU. « 56 — il manque un 8 » est une
// décomposition que l'écran lit à voix haute ; sans elle, le plateau n'est
// qu'une course.
const surUneCible = await s.page.evaluate(async () => {
    const { caseSous } = await import('./js/core/plateau.js');
    const p = window.__partie;
    // ON MARCHE JUSQU'À LA CIBLE LIBRE LA PLUS PROCHE, un pas à la fois, comme
    // l'élève — et non en se téléportant : un déplacement qui n'emprunte pas le
    // chemin de l'utilisateur ne mesure pas son problème.
    for (let n = 0; n < 400; n++) {
        const e = p.etat();
        const ici = caseSous(e.moi.x, e.moi.y);
        const cible = [...document.querySelectorAll('.pdn-case--cible')]
            .map(c => ({ x: Number(c.dataset.x), y: Number(c.dataset.y) }))
            .sort((a, b) => Math.hypot(a.x + 0.5 - e.moi.x, a.y + 0.5 - e.moi.y)
                - Math.hypot(b.x + 0.5 - e.moi.x, b.y + 0.5 - e.moi.y))[0];
        if (!cible) return { raté: 'aucune cible' };
        if (cible.x === ici.x && cible.y === ici.y) {
            return { arrivé: true,
                     dit: (document.querySelector('.pdn-dit') || {}).textContent || '' };
        }
        const dx = cible.x + 0.5 - e.moi.x;
        const dy = cible.y + 0.5 - e.moi.y;
        // ON POUSSE LE ROND PAR PETITS COUPS, comme une main qui corrige sa
        // trajectoire — et non en le téléportant : une mesure qui n'emprunte
        // pas le chemin de l'utilisateur ne mesure pas son problème.
        p.bouger(Math.abs(dx) >= Math.abs(dy)
            ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut'), 0.2);
        await new Promise(r => setTimeout(r, 25));
    }
    return { raté: 'jamais arrivé sur un carré' };
});
dire('EN ARRIVANT SUR UN NOMBRE, L\'ÉCRAN DIT CE QUI MANQUE',
    !!surUneCible.arrivé && /manque|c'est bon/i.test(surUneCible.dit),
    surUneCible.arrivé ? `« ${surUneCible.dit.replace(/\s+/g, ' ').trim()} »`
        : surUneCible.raté);

await s.photo('.pdn-carte', 'tools/tmp/plateau-demo.png', 10).catch(
    () => console.log('  . photo non prise'));

// ── ET LE CHEMIN DE RÉMY, celui qu'il empruntera vraiment ────────────────
//
// Tout ce qui précède a ouvert la partie PAR LE MODULE : c'est le jeu qu'on
// mesurait, pas la porte. Mais un bouton qui n'ouvre rien a exactement la même
// apparence qu'un bouton qui marche — ce dépôt l'a déjà payé avec « Au
// tableau », qui existait et ne faisait rien. On refait donc le trajet entier :
// Mes classes, la classe, Le direct, l'onglet du plateau, le bouton.
console.log('\nLE CHEMIN DU PROFESSEUR');
console.log('─'.repeat(68));
await s.page.evaluate(() => { if (window.__partie) window.__partie.fermer(); });
await dormir(300);
await s.page.evaluate(async () => {
    const { creerClasse, apercuDeListe, importerListe } =
        await import('./js/core/espaceProf.js');
    const c = await creerClasse('6e Plateau', '6e');
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
await s.doitExister('[data-outil="plateau"]', 'l\'onglet du plateau dans la barre');
await s.page.click('[data-outil="plateau"]');
await dormir(1200);
await s.doitExister('[data-plateau-quoi]', 'le réglage « sur quoi on joue »');
// ── ON CHOISIT LA TABLE DE 7, ET LE PLATEAU DOIT OBÉIR ───────────────────
//
// RÉMY, quand je lui ai demandé par quoi améliorer : « Choisir ce qu'on
// travaille ». Un déroulant que le plateau n'écoute pas aurait exactement la
// même apparence qu'un déroulant qui marche — et c'est le professeur qui s'en
// apercevrait, devant sa classe, en voyant passer des 25 sur la table de 7.
await s.page.selectOption('[data-plateau-quoi]', 't7');
await s.doitExister('[data-plateau-demo]', 'le bouton « Essayer en démo »');
await s.page.click('[data-plateau-demo]');
await dormir(1500);
const surLaTable = await s.page.evaluate(() => [...document.querySelectorAll('.pdn-valeur')]
    .map(v => Number(v.textContent)));
dire('LE RÉGLAGE « table de 7 » EST VRAIMENT OBÉI',
    surLaTable.length >= 5 && surLaTable.every(v => v % 7 === 0)
        && new Set(surLaTable).size >= 3,
    `carrés posés : ${JSON.stringify(surLaTable)}`);
const parLeBouton = await s.page.evaluate(() => {
    const g = document.querySelector('.pdn-terrain');
    return { grille: !!g, haut: g ? Math.round(g.getBoundingClientRect().height) : 0,
             pions: document.querySelectorAll('.pdn-pion').length };
});
dire('LE BOUTON DU PILOTE OUVRE VRAIMENT LE PLATEAU',
    parLeBouton.grille && parLeBouton.haut > 150 && parLeBouton.pions > 2,
    `grille de ${parLeBouton.haut} px, ${parLeBouton.pions} pions`);
// ET LA CROIX LE REFERME, en rendant son écran au professeur.
await s.page.click('.pdn-sortir');
await dormir(500);
dire('ET LA CROIX LE REFERME',
    await s.page.evaluate(() => !document.querySelector('.pdn-voile')));

/* ───────────── LES PRÉNOMS, ET CE QUE COÛTE UNE ERREUR ──────────────────── */
//
// RÉMY : « Il faudrait une option pour les prénoms et si on se trompe on a une
// pénalité ». Les deux ne se mesurent qu'ici : un prénom qui ne s'affiche pas
// et une pénalité qui ne punit pas ont exactement l'apparence d'un réglage qui
// marche.
console.log('\nLES PRÉNOMS, ET LA PÉNALITÉ');
console.log('─'.repeat(68));
await s.page.evaluate(async () => {
    const { ouvrirLePlateau } = await import('./js/ui/plateauUI.js');
    window.__partie = ouvrirLePlateau({
        graine: 'penalite', robots: 5, style: 'question', operation: '×',
        secondes: 300, noms: true, penalite: 'deux'
    });
});
await dormir(900);
await s.doitExister('.pdn-nom', 'le prénom sous un rond');
const noms = await s.page.evaluate(() =>
    [...document.querySelectorAll('.pdn-nom')].map(e => e.textContent));
dire('LES PRÉNOMS S\'ÉCRIVENT SOUS LES RONDS', noms.length === 6 && noms.includes('Toi'),
    `${noms.length} prénom(s) : ${JSON.stringify(noms.slice(0, 4))}`);

// ── ON RÉPOND FAUX, EXPRÈS ───────────────────────────────────────────────
//
// C'est le seul endroit du jeu où l'on peut avoir tort, et donc le seul où la
// pénalité a un sens. On prend le chemin de l'élève : un bouton « deviens »,
// puis une réponse fausse dans le champ, puis OK.
const avant = await s.page.evaluate(() => window.__partie.etat().scores[0]);
const faute = await s.page.evaluate(async () => {
    const autre = [...document.querySelectorAll('[data-devenir-nb]')]
        .find(b => !b.classList.contains('pdn-nb--actif'));
    if (!autre) return { raté: 'aucun nombre à devenir' };
    autre.click();
    await new Promise(r => setTimeout(r, 200));
    const champ = document.querySelector('[data-reponse]');
    if (!champ) return { raté: 'aucune question posée' };
    const enonce = (document.querySelector('.pdn-question') || {}).textContent || '';
    champ.value = '1';   // faux à coup sûr : aucun pion ne porte 1
    document.querySelector('[data-valider]').click();
    await new Promise(r => setTimeout(r, 300));
    return {
        enonce: enonce.replace(/\s+/g, ' ').trim(),
        fige: !!document.querySelector('.pdn-pion--moi.pdn-pion--fige'),
        dit: (document.querySelector('.pdn-annonce--faute') || {}).textContent || '',
        questionFermee: !document.querySelector('[data-reponse]')
    };
});
dire('UNE MAUVAISE RÉPONSE FIGE LE ROND', !!faute.fige,
    faute.raté || `« ${faute.enonce} » → réponse 1`);
// ET LE SCORE NE DESCEND JAMAIS SOUS ZÉRO. Une équipe à −40 au tableau,
// devant la classe, désigne un groupe d'élèves comme étant en dessous de rien.
// (Que la pénalité RETIRE bien 20 points est gardé par `npm test`, qui peut
// partir d'un score non nul ; ici l'équipe est souvent encore à zéro, et une
// épreuve qui se contenterait de « c'est plus petit » ne mesurerait rien.)
const apresLaFaute = await s.page.evaluate(() => window.__partie.etat().scores);
dire('ET LE SCORE NE DESCEND JAMAIS SOUS ZÉRO',
    apresLaFaute.every(n => n >= 0) && avant >= 0,
    `avant ${avant}, après ${JSON.stringify(apresLaFaute)}`);
// L'ÉCRAN LE DIT : un élève figé qui ne sait pas pourquoi croit l'application
// cassée.
dire('ET L\'ÉCRAN DIT POURQUOI', /trompé|Raté/.test(faute.dit),
    `« ${String(faute.dit).replace(/\s+/g, ' ').trim()} »`);
// LA QUESTION SE FERME : rester dessus à réessayer jusqu'à tomber juste
// viderait la pénalité de son sens.
dire('ET LA QUESTION SE FERME, pas de seconde chance gratuite',
    !!faute.questionFermee);
// LE ROND FIGÉ NE BOUGE PLUS, et c'est la seule chose qui prouve que la
// pénalité coûte vraiment quelque chose.
const ouEtaitIl = await s.page.evaluate(() => window.__partie.etat().moi);
await s.page.evaluate(() => { for (let i = 0; i < 8; i++) window.__partie.bouger('droite'); });
await dormir(400);
const ouEstIl = await s.page.evaluate(() => window.__partie.etat().moi);
dire('UN ROND FIGÉ NE SE DÉPLACE PLUS',
    Math.abs(ouEstIl.x - ouEtaitIl.x) < 0.01,
    `x : ${ouEtaitIl.x.toFixed(2)} → ${ouEstIl.x.toFixed(2)}`);
await photo(s.page, '.pdn-carte', 'tools/tmp/plateau-prenoms.png');
await s.page.evaluate(() => window.__partie.fermer());
await dormir(300);

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach(e => console.log('  ! ' + String(e).slice(0, 180)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mLE PLATEAU JOUE.\x1b[0m');
process.exit(ratés ? 1 : 0);
