// LA FENÊTRE « GÉRER MES PARCOURS » — clic, Maj, Ctrl, Ctrl+A, et le cadre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, d'abord : « il me faudrait clairement un gestionnaire de parcours pour
// en sélectionner plusieurs les trier les classer car là du coup on a tout
// retrouvé. Supprimer en bloc, mettre dans la corbeille. »
//
// Puis, devant la barre à cases cochées dans le tiroir : « tu peux pas faire
// mieux ou ouvrir une modale, je trouve que c'est un peu bricolé, on ne peut
// faire des cadre de sélection, utiliser shift ou cmd ».
//
// ── CE QUE SEULE CETTE SONDE PEUT DIRE ─────────────────────────────────────
//
// Les RÈGLES de la sélection s'éprouvent sans navigateur, et elles le sont
// (`tests/selectionListe.test.mjs`). Ce qui ne s'éprouve que là : que la touche
// Maj du VRAI clavier arrive bien jusqu'à elles, que `metaKey` ne se perde pas
// en route, que Ctrl+A atteigne la liste et non le champ de recherche, et
// surtout que le cadre ait un endroit d'où PARTIR — un `mousedown` sur une
// ligne ne doit pas l'amorcer, donc il faut du vide sous la dernière ligne, ce
// qu'aucune épreuve de module ne verra jamais.
//
// ON PASSE PAR LES GESTES, PAS PAR LES FONCTIONS. `s.page.mouse` et
// `page.click(…, { modifiers })` plutôt que `apresUnClic` appelé à la main :
// l'erreur déjà payée treize fois dans ce chantier est de mesurer un écran qui
// n'existe que pour la sonde.
//
// CETTE SONDE REMPLACE CELLE DES CASES À COCHER. Elle posait les mêmes
// questions à un écran qui n'existe plus ; une sonde qui interroge un disparu
// répond toujours non, et l'on finit par ne plus la lancer.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1500);
await s.page.click('#top-btn-preparer');
await dormir(1200);

// ON CLIQUE L'ONGLET « Parcours », ET SURTOUT PAS `montrerPanneau` À LA MAIN :
// la liste n'est dessinée que par le rappel `auRendu` que `initTiroirOnglets`
// déclenche SUR LE CLIC (voir `js/ui/tiroirParcours.js`). Deux mesures perdues
// avant de le comprendre — la sonde voyait un panneau ouvert et zéro ligne.
await s.page.click('[data-tiroir="parcours"]');
await dormir(900);

// ── CINQ PARCOURS AUX NOMS, AUX TAILLES ET AUX DATES CONNUS ─────────────────
//
// Les dates sont posées à la main : une sonde qui attend une seconde entre deux
// enregistrements mesure sa propre lenteur, et cinq parcours créés dans la même
// milliseconde ne se trient pas.
console.log('\n\x1b[1mCINQ PARCOURS À GÉRER\x1b[0m');
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const poser = (nom, combien, quand) => {
        const pas = Array.from({ length: combien }, (_, i) =>
            makeStep('calc-add', {}, { stepId: 's' + i, nbItems: 4 }));
        const e = state.saveTeacherPath(nom, makePath(nom, pas, politiquePerso()));
        e.timestamp = quand;
    };
    poser('Aa premier', 1, Date.now() - 5 * 86400000);
    poser('Bb deuxième', 2, Date.now() - 4 * 86400000);
    poser('Cc troisième', 3, Date.now() - 3 * 86400000);
    poser('Dd quatrième', 4, Date.now() - 2 * 86400000);
    poser('Ee cinquième', 5, Date.now() - 86400000);
    state.saveTeacherPaths();
});
await s.page.click('[data-tiroir="exercices"]');
await s.page.click('[data-tiroir="parcours"]');
await dormir(800);

// ── LE TIROIR EST REDEVENU SIMPLE ───────────────────────────────────────────
//
// Rémy a photographié la barre à trois boutons repliée sur trois lignes dans
// une colonne de trois cents pixels. Elle doit avoir disparu — et un témoin le
// dit : le bouton « Gérer » qui l'a remplacée est là, lui.
console.log('\n\x1b[1mLE TIROIR NE PORTE PLUS NI CASES NI BARRE\x1b[0m');
const tiroir = await s.page.evaluate(() => ({
    cases: document.querySelectorAll('#path-browser-list .pb-choix').length,
    barre: !!document.getElementById('pb-selection'),
    corbeille: !!document.getElementById('btn-corbeille'),
    gerer: (() => {
        const b = document.getElementById('btn-gerer-parcours');
        return b ? b.getBoundingClientRect().width > 0 : false;
    })(),
    lignes: document.querySelectorAll('#path-browser-list .path-browser-item').length
}));
dire('plus une seule case à cocher dans le tiroir', tiroir.cases === 0, String(tiroir.cases));
dire('plus de barre d\'actions empilée', !tiroir.barre && !tiroir.corbeille);
dire('TÉMOIN : le bouton « Gérer » l\'a remplacée, et il se voit', tiroir.gerer);
dire('TÉMOIN : le tiroir montre toujours ses parcours', tiroir.lignes >= 5,
    `${tiroir.lignes} ligne(s)`);

// ── LA FENÊTRE S'OUVRE ──────────────────────────────────────────────────────
console.log('\n\x1b[1mLA FENÊTRE S\'OUVRE\x1b[0m');
await s.page.click('#btn-gerer-parcours');
await s.page.waitForSelector('#gp-liste .gp-ligne', { timeout: 10000 });
await dormir(400);

/** Les noms affichés, dans l'ordre de l'écran. */
const noms = () => s.page.evaluate(() =>
    [...document.querySelectorAll('#gp-liste .gp-ligne .gp-col--nom')]
        .map((e) => e.textContent.trim()));
/** Ce qui est pris, et ce que le pied en dit. */
const etat = () => s.page.evaluate(() => ({
    pris: [...document.querySelectorAll('#gp-liste .gp-ligne--prise .gp-col--nom')]
        .map((e) => e.textContent.trim()),
    dit: (document.getElementById('gp-combien') || {}).textContent || '',
    boutons: [...document.querySelectorAll('[data-gp-ranger], [data-gp-jeter], [data-gp-exporter]')]
        .map((b) => b.disabled)
}));

const auDepart = await etat();
dire('rien n\'est pris à l\'ouverture', auDepart.pris.length === 0 && /Rien/.test(auDepart.dit),
    auDepart.dit);
dire('et les trois gestes en bloc sont éteints tant que rien n\'est pris',
    auDepart.boutons.length === 3 && auDepart.boutons.every(Boolean),
    JSON.stringify(auDepart.boutons));

// ── LES COLONNES RANGENT ────────────────────────────────────────────────────
console.log('\n\x1b[1mUN CLIC SUR UNE COLONNE RANGE\x1b[0m');
const ordres = {};
for (const [titre, cle] of [['nom', 'nom'], ['taille', 'taille'], ['recent', 'date']]) {
    await s.page.click(`#gp-liste [data-ordre="${titre === 'recent' ? 'recent' : titre}"]`);
    await dormir(350);
    ordres[titre] = (await noms()).filter((n) => /^[A-E][a-z] /.test(n));
    console.log(`   ${cle.padEnd(7)} ${ordres[titre].join(' · ')}`);
}
dire('par nom : alphabétique', ordres.nom.join('|') === 'Aa premier|Bb deuxième|Cc troisième'
    + '|Dd quatrième|Ee cinquième', ordres.nom.join(' · '));
dire('par contenu : le plus petit en tête', ordres.taille[0] === 'Aa premier', ordres.taille[0]);
dire('par date : le plus récent en tête', ordres.recent[0] === 'Ee cinquième', ordres.recent[0]);
// ET LA COLONNE ACTIVE SE VOIT : sans cela, on reclique au hasard pour savoir.
const marque = await s.page.evaluate(() =>
    [...document.querySelectorAll('#gp-liste .gp-tete [data-ordre]')]
        .filter((b) => /▾/.test(b.textContent)).map((b) => b.dataset.ordre));
dire('la colonne qui range porte sa marque', marque.join() === 'recent', marque.join() || '(aucune)');

// On se remet par nom : tout le reste de la mesure compte sur un ordre stable.
await s.page.click('#gp-liste [data-ordre="nom"]');
await dormir(350);

/** La boîte d'une ligne, par son rang à l'écran. */
const boite = (rang) => s.page.evaluate((i) => {
    const el = document.querySelectorAll('#gp-liste .gp-ligne')[i];
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, bas: r.bottom };
}, rang);

// ── LE CLIC SIMPLE ──────────────────────────────────────────────────────────
console.log('\n\x1b[1mLE CLIC, AVEC SES TROIS TOUCHES\x1b[0m');
const ouvertAvant = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.currentPathId || '';
});
let b = await boite(1);
await s.page.mouse.click(b.x, b.y);
await dormir(300);
let e = await etat();
dire('un clic prend cette ligne, et elle seule',
    e.pris.join() === 'Bb deuxième', e.pris.join(' · ') || '(rien)');
dire('le pied dit « 1 parcours sélectionné », au singulier',
    e.dit === '1 parcours sélectionné', e.dit);
dire('et les trois gestes en bloc s\'allument',
    e.boutons.length === 3 && e.boutons.every((d) => d === false),
    JSON.stringify(e.boutons));
const ouvertApres = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.currentPathId || '';
});
dire('SÉLECTIONNER N\'OUVRE PAS LE PARCOURS', ouvertApres === ouvertAvant,
    ouvertApres || '(aucun)');

// ── MAJ : LA PLAGE, ET L'ANCRE QUI NE BOUGE PAS ─────────────────────────────
b = await boite(3);
await s.page.mouse.move(b.x, b.y);
await s.page.keyboard.down('Shift');
await s.page.mouse.down();
await s.page.mouse.up();
await s.page.keyboard.up('Shift');
await dormir(300);
e = await etat();
dire('MAJ-CLIC PREND LA SUITE', e.pris.join('|') === 'Bb deuxième|Cc troisième|Dd quatrième',
    e.pris.join(' · '));
dire('et le pied s\'accorde au pluriel', e.dit === '3 parcours sélectionnés', e.dit);

// ON RESSERRE : c'est la règle qu'on écrit faux, et que seul le vrai clavier
// confirme de bout en bout. Si l'ancre avait suivi le premier Maj-clic, la
// plage repartirait de « Dd » et l'on ne pourrait plus la rétrécir.
b = await boite(2);
await s.page.mouse.move(b.x, b.y);
await s.page.keyboard.down('Shift');
await s.page.mouse.down();
await s.page.mouse.up();
await s.page.keyboard.up('Shift');
await dormir(300);
e = await etat();
dire('UN SECOND MAJ-CLIC RÉTRÉCIT LA PLAGE (l\'ancre n\'a pas bougé)',
    e.pris.join('|') === 'Bb deuxième|Cc troisième', e.pris.join(' · '));

// ── CTRL / CMD : UNE LIGNE DE PLUS ──────────────────────────────────────────
b = await boite(4);
await s.page.mouse.move(b.x, b.y);
await s.page.keyboard.down('Control');
await s.page.mouse.down();
await s.page.mouse.up();
await s.page.keyboard.up('Control');
await dormir(300);
e = await etat();
dire('CTRL-CLIC AJOUTE UNE LIGNE SANS LÂCHER LES AUTRES',
    e.pris.join('|') === 'Bb deuxième|Cc troisième|Ee cinquième', e.pris.join(' · '));

// ET LA MÊME CHOSE AVEC CMD : sur le Mac de Rémy, c'est `metaKey` qui arrive.
b = await boite(0);
await s.page.mouse.move(b.x, b.y);
await s.page.keyboard.down('Meta');
await s.page.mouse.down();
await s.page.mouse.up();
await s.page.keyboard.up('Meta');
await dormir(300);
e = await etat();
dire('CMD-CLIC FAIT PAREIL (c\'est le Mac de Rémy)',
    e.pris.length === 4 && e.pris.includes('Aa premier'), e.pris.join(' · '));

// ── CTRL+A ──────────────────────────────────────────────────────────────────
//
// IL FAUT QU'IL ATTEIGNE LA LISTE. À l'ouverture, le curseur est dans le champ
// de recherche, où Ctrl+A sélectionne du TEXTE — c'est correct, et c'est
// pourquoi on mesure après un clic dans la liste, qui est le chemin réel.
await s.page.keyboard.press('Control+a');
await dormir(300);
e = await etat();
dire('CTRL+A PREND TOUT', e.pris.length >= 5 && /sélectionnés/.test(e.dit), e.dit);

// Un clic simple remet tout à plat : témoin que la sélection n'enfle pas.
b = await boite(0);
await s.page.mouse.click(b.x, b.y);
await dormir(300);
e = await etat();
dire('TÉMOIN : un clic simple après Ctrl+A ne garde qu\'une ligne',
    e.pris.join() === 'Aa premier', e.pris.join(' · '));

// ── LE CADRE QU'ON TIRE ─────────────────────────────────────────────────────
//
// RÉMY : « on ne peut faire des cadre de sélection ». C'est la mesure de ce
// fichier qui ne peut exister nulle part ailleurs : elle dépend de la
// GÉOMÉTRIE de la liste, et aucune épreuve de module ne verra jamais d'où le
// geste peut partir.
//
// ON NE MARQUE PLUS AUCUN NOM À LA MAIN ICI. Premier jet de cette sonde :
// trois attentes écrites en dur — « Cc · Dd · Ee » —, trois rouges, et zéro
// défaut. La bibliothèque porte « Parcours découverte » et « Tout sur papier »
// depuis le premier démarrage, et par ordre alphabétique ils tombent APRÈS mes
// cinq. Le cadre prenait exactement ce qu'il devait prendre ; c'est mon
// arithmétique que je mesurais. On lit donc l'écran, et l'on compare à ce que
// l'écran dit.
console.log('\n\x1b[1mLE CADRE QU\'ON TIRE À LA SOURIS\x1b[0m');
const alEcran = await noms();
const dernier = alEcran.length - 1;
console.log(`   ${alEcran.length} lignes à l'écran : ${alEcran.join(' · ')}`);

// ── D'ABORD : ON PEUT L'AMORCER ─────────────────────────────────────────────
//
// MESURÉ AU PREMIER JET : « il reste 1 px de vide sous la dernière ligne ». Le
// cadre ne partait que du vide, et à sept parcours il n'y a plus de vide — le
// geste devenait impossible à amorcer exactement là où il sert, sur une
// bibliothèque remplie. Il part maintenant d'une ligne, et c'est CE départ
// qu'on mesure : depuis la dernière ligne, pas depuis la marge.
const vide = await s.page.evaluate(() => {
    const l = document.getElementById('gp-liste');
    const lignes = [...l.querySelectorAll('.gp-ligne')];
    const r = l.getBoundingClientRect();
    const d = lignes[lignes.length - 1].getBoundingClientRect();
    return { hauteurLibre: Math.round(r.bottom - d.bottom) };
});
console.log(`   il reste ${vide.hauteurLibre} px de vide sous la dernière ligne`);

// ── LE SEUIL : UN APPUI IMMOBILE RESTE UN CLIC ──────────────────────────────
//
// TÉMOIN INDISPENSABLE À TOUT LE RESTE. Si un appui de deux pixels ouvrait un
// cadre, le cadre « marcherait » dans cette sonde et casserait tous les clics
// de Rémy — c'est-à-dire le geste le plus fréquent de l'écran.
let bd = await boite(dernier);
await s.page.mouse.move(bd.x, bd.y);
await s.page.mouse.down();
await s.page.mouse.move(bd.x, bd.y + 2);
await s.page.mouse.up();
await dormir(300);
e = await etat();
dire('TÉMOIN : UN APPUI IMMOBILE SUR UNE LIGNE RESTE UN CLIC',
    e.pris.join() === alEcran[dernier], e.pris.join(' · '));

// ── ON TIRE, DEPUIS LA DERNIÈRE LIGNE, VERS LE HAUT ─────────────────────────
const haut = await boite(2);
bd = await boite(dernier);
await s.page.mouse.move(bd.x, bd.y);
await s.page.mouse.down();
// Plusieurs petits pas : le cadre se recalcule à chaque `mousemove`, et un saut
// unique ne mesurerait qu'un seul de ses états.
for (const y of [bd.y - 12, (bd.y + haut.y) / 2, haut.y]) {
    await s.page.mouse.move(bd.x, y);
    await dormir(90);
}
const pendant = await s.page.evaluate(() => {
    const c = document.getElementById('gp-cadre');
    return { visible: !c.hidden && c.getBoundingClientRect().height > 4,
        pris: document.querySelectorAll('#gp-liste .gp-ligne--prise').length };
});
dire('le cadre se DESSINE pendant qu\'on tire', pendant.visible);
dire('et il marque les lignes au passage', pendant.pris >= 3, String(pendant.pris));
await s.page.mouse.up();
await dormir(300);
e = await etat();
dire('UN CADRE PARTI D\'UNE LIGNE PREND TOUT CE QU\'IL A TOUCHÉ',
    e.pris.join('|') === alEcran.slice(2).join('|'),
    `${e.pris.length} ligne(s) : ${e.pris.join(' · ')}`);
const apresLeCadre = await s.page.evaluate(() =>
    (document.getElementById('gp-cadre') || {}).hidden);
dire('et il disparaît quand on relâche', apresLeCadre === true);
// ET LE `click` QUI SUIT LE `mouseup` N'A PAS TOUT REMIS À UNE LIGNE : c'est
// le défaut que le cadre partant d'une ligne rendait possible — le navigateur
// envoie un clic sur la ligne où l'on relâche.
dire('LE CLIC D\'APRÈS N\'A PAS AVALÉ LE CADRE', e.pris.length > 1,
    `${e.pris.length} ligne(s)`);

// ── ON RESSERRE, ET IL REND CE QU'IL QUITTE ─────────────────────────────────
//
// Un cadre qui ne sait que grandir est le même défaut que l'ancre qui suivait
// le Maj-clic : on ne peut plus corriger son geste sans tout recommencer.
bd = await boite(dernier);
await s.page.mouse.move(bd.x, bd.y);
await s.page.mouse.down();
await s.page.mouse.move(bd.x, haut.y);
await dormir(110);
const b4 = await boite(dernier - 1);
await s.page.mouse.move(bd.x, b4.y);
await dormir(110);
await s.page.mouse.up();
await dormir(300);
e = await etat();
dire('UN CADRE QU\'ON RESSERRE REND LES LIGNES QU\'IL QUITTE',
    e.pris.join('|') === alEcran.slice(dernier - 1).join('|'),
    `${e.pris.length} ligne(s) : ${e.pris.join(' · ')}`);

// ── ET MAJ PENDANT LE CADRE AJOUTE AU LIEU DE REMPLACER ─────────────────────
const b0 = await boite(0);
await s.page.keyboard.down('Shift');
await s.page.mouse.move(b0.x, b0.y);
await s.page.mouse.down();
await s.page.mouse.move(b0.x, (await boite(1)).y);
await dormir(110);
await s.page.mouse.up();
await s.page.keyboard.up('Shift');
await dormir(300);
e = await etat();
dire('MAJ PENDANT LE CADRE AJOUTE À CE QUI ÉTAIT PRIS', e.pris.length === 4,
    `${e.pris.length} ligne(s) : ${e.pris.join(' · ')}`);

// ── CHERCHER ────────────────────────────────────────────────────────────────
console.log('\n\x1b[1mCHERCHER DANS LA FENÊTRE\x1b[0m');
await s.page.fill('#gp-chercher', 'troisième');
await dormir(450);
const filtré = await noms();
dire('la recherche resserre la liste',
    filtré.length === 1 && filtré[0] === 'Cc troisième', filtré.join(' · '));
// ET LE COMPTE NE MENT PAS : la sélection garde « Ee cinquième », qui n'est
// plus affiché. Le pied ne doit compter que ce qui est sous les yeux.
const pendantLaRecherche = await etat();
dire('le pied ne compte pas ce que le filtre a caché',
    /Rien/.test(pendantLaRecherche.dit), pendantLaRecherche.dit);
await s.page.fill('#gp-chercher', '');
await dormir(450);

// ── JETER EN BLOC ───────────────────────────────────────────────────────────
console.log('\n\x1b[1mJETER EN BLOC\x1b[0m');
b = await boite(0);
await s.page.mouse.click(b.x, b.y);
b = await boite(1);
await s.page.mouse.move(b.x, b.y);
await s.page.keyboard.down('Shift');
await s.page.mouse.down();
await s.page.mouse.up();
await s.page.keyboard.up('Shift');
await dormir(300);
e = await etat();
dire('TÉMOIN : deux lignes prises avant de jeter', e.pris.length === 2, e.pris.join(' · '));

await s.page.click('[data-gp-jeter]');
await dormir(700);
// ON LIT LA FENÊTRE VISIBLE, pas une classe devinée : `.modal-overlay` et
// `.confirm-ok-btn` sont LUS dans `js/ui/modal.js`. `.modal-title` ne porte pas
// le titre d'une confirmation — sélecteur inventé, mesure perdue.
// ON NE GARDE QUE LA FENÊTRE QUI PORTE LE BOUTON DE CONFIRMATION : la fenêtre
// de gestion est elle aussi un `.modal-overlay` visible, et elle contient le
// mot « Corbeille » sur son propre bouton. Sans ce tri, la sonde aurait pu dire
// « on demande bien » en lisant l'écran de derrière.
const demande = await s.page.evaluate(() =>
    [...document.querySelectorAll('.modal-overlay')]
        .filter((el) => el.getBoundingClientRect().width > 0
            && el.querySelector('.confirm-ok-btn'))
        .map((el) => el.textContent.replace(/\s+/g, ' ').trim().slice(0, 130)));
dire('on demande avant de jeter, et l\'on dit combien de jours',
    demande.some((t) => /corbeille/i.test(t) && /30 jours/.test(t)),
    demande.join(' · ').slice(0, 90) || '(aucune fenêtre)');
await s.page.click('.confirm-ok-btn');
await dormir(1800);
const restants = (await noms()).filter((n) => /^[A-E][a-z] /.test(n));
dire('les deux ont quitté la liste de la fenêtre',
    restants.join('|') === 'Cc troisième|Dd quatrième|Ee cinquième', restants.join(' · '));
const apresJet = await etat();
dire('et la sélection est repartie de zéro', apresJet.pris.length === 0, apresJet.dit);

// ── ILS SONT DANS LA CORBEILLE, ET L'ON PEUT LES RESSORTIR ──────────────────
console.log('\n\x1b[1mLA CORBEILLE, DEPUIS LA FENÊTRE\x1b[0m');
await s.page.click('#gp-corbeille');
await dormir(1200);
const dedans = await s.page.evaluate(() =>
    [...document.querySelectorAll('[data-sortir] b')].map((el) => el.textContent.trim()));
console.log(`   la corbeille montre : ${JSON.stringify(dedans)}`);
dire('les deux jetés y sont', dedans.length === 2
    && dedans.includes('Aa premier') && dedans.includes('Bb deuxième'), dedans.join(' · '));
// ON RESSORT LE PREMIER PAR SON BOUTON, pas par l'appel derrière. ET L'ON LIT
// SON NOM AVANT DE CLIQUER : la corbeille range par date de jet, donc « le
// premier bouton » n'est pas forcément « le premier jeté ». Première version de
// cette sonde : elle affirmait avoir ressorti « Aa premier » et vérifiait son
// retour, alors qu'elle avait cliqué « Bb deuxième » — deux rouges pour une
// confusion qui n'était que la mienne.
const ressorti = await s.page.evaluate(() =>
    (document.querySelector('[data-sortir] b') || {}).textContent.trim());
const resteJete = dedans.find((n) => n !== ressorti);
console.log(`   on ressort « ${ressorti} » ; « ${resteJete} » reste à la corbeille`);
await s.page.click('[data-sortir]');
await dormir(1800);
const revenus = (await noms()).filter((n) => /^[A-E][a-z] /.test(n));
dire('UN PARCOURS RESSORTI REVIENT DANS LA LISTE',
    revenus.includes(ressorti) && !revenus.includes(resteJete), revenus.join(' · '));

// ── RANGER DANS UN DOSSIER ──────────────────────────────────────────────────
console.log('\n\x1b[1mRANGER EN BLOC\x1b[0m');
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    state.addTeacherFolder('Troisièmes');
});
// On referme et l'on réouvre : la liste des dossiers est lue à l'ouverture de
// « Ranger dans… », mais autant mesurer le chemin complet.
await s.page.click('#gp-liste [data-ordre="nom"]');
await dormir(300);
b = await boite(0);
await s.page.mouse.click(b.x, b.y);
await dormir(300);
await s.page.click('[data-gp-ranger]');
await dormir(600);
const dossiers = await s.page.evaluate(() =>
    [...document.querySelectorAll('[data-dossier] b')].map((el) => el.textContent.trim()));
dire('la fenêtre « Ranger dans… » propose la racine et les dossiers',
    dossiers.length >= 2 && dossiers.includes('Troisièmes'), dossiers.join(' · '));
await s.page.click('[data-dossier]:not([data-dossier="root"])');
await dormir(900);
const colonne = await s.page.evaluate(() =>
    [...document.querySelectorAll('#gp-liste .gp-ligne')].map((el) => ({
        nom: el.querySelector('.gp-col--nom').textContent.trim(),
        dossier: el.querySelector('.gp-col--dossier').textContent.trim()
    })).filter((r) => /^[A-E][a-z] /.test(r.nom)));
console.log('   ' + colonne.map((r) => `${r.nom} → ${r.dossier}`).join(' · '));
dire('LA COLONNE « Dossier » DIT OÙ C\'EST RANGÉ',
    colonne.filter((r) => r.dossier === 'Troisièmes').length === 1,
    colonne.map((r) => r.dossier).join(' · '));

// ── EXPORTER EN FICHIER, PUIS LE RELIRE ─────────────────────────────────────
//
// RÉMY : « d'ailleurs, on ne peut exporter en fichier juste un parcours. »
//
// CE QUE SEULE CETTE MESURE PEUT DIRE : que le navigateur TÉLÉCHARGE vraiment,
// avec le bon nom. Les épreuves de `fichierParcours.test.mjs` vérifient ce
// qu'on écrit et ce qu'on relit ; aucune ne sait si le lien part. Et l'on
// mesure le RETOUR sur le fichier RÉELLEMENT téléchargé, pas sur un objet
// fabriqué pour la sonde — sans quoi l'aller-retour ne prouverait rien.
console.log('\n\x1b[1mEXPORTER EN FICHIER, PUIS LE RELIRE\x1b[0m');
await s.page.click('#gp-liste [data-ordre="nom"]');
await dormir(300);
const alExport = await noms();
const rangDuPremier = alExport.findIndex((n) => /^[A-E][a-z] /.test(n));
b = await boite(rangDuPremier);
await s.page.mouse.click(b.x, b.y);
await dormir(300);
e = await etat();
dire('TÉMOIN : un parcours est pris avant d\'exporter', e.pris.length === 1, e.pris.join());
// ON LIT LE NOM PRIS, ON NE L'ÉCRIT PAS. Troisième fois dans cette sonde que
// des noms codés en dur mesurent mon arithmétique : ici « Aa premier » est à la
// corbeille à ce point du scénario, et la première ligne est « Bb deuxième ».
// Le logiciel avait raison, la sonde était rouge.
const nomPris = e.pris[0] || '';
// ET LE NOMBRE D'ÉTAPES SE DEMANDE À LA BIBLIOTHÈQUE, pas à la colonne
// « Contenu ». Mon premier essai y lisait zéro sur une ligne juste, et pour une
// raison qui n'était pas dans le logiciel du tout : l'insertion de ce bloc avait
// doublé la barre oblique, et le motif cherchait une barre suivie de chiffres.
// Une sonde qui se trompe d'un caractère accuse le logiciel à sa place.
const etapesAttendues = await s.page.evaluate(async (nom) => {
    const { state } = await import('./js/core/state.js');
    const { cheminDeLEntree } = await import('./js/core/entreeParcours.js');
    const { normalizePath } = await import('./js/core/path.js');
    const entree = (state.teacherPaths || []).find((p) => p.name === nom);
    if (!entree) return -1;
    const p = normalizePath(cheminDeLEntree(entree) || entree, nom);
    return (p.steps || []).length;
}, nomPris);
console.log(`   on exporte « ${nomPris} » (${etapesAttendues} étape(s) en bibliothèque)`);

const [telechargement] = await Promise.all([
    s.page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    s.page.click('[data-gp-exporter]')
]);
dire('LE NAVIGATEUR TÉLÉCHARGE VRAIMENT', !!telechargement,
    telechargement ? telechargement.suggestedFilename() : '(aucun téléchargement)');
let relu = { parcours: [], erreur: 'pas de fichier' };
if (telechargement) {
    const nom = telechargement.suggestedFilename();
    // LE NOM ATTENDU SE FABRIQUE AVEC LA MÊME FONCTION QUE LE LOGICIEL : le
    // recopier à la main ferait de cette mesure une épreuve de ma mémoire.
    const attendu = await s.page.evaluate(async (n) => {
        const { nomDeFichier } = await import('./js/core/fichierParcours.js');
        return nomDeFichier(n);
    }, nomPris);
    dire('et le fichier porte le nom du parcours, pas « download »',
        nom === attendu, `${nom} (attendu ${attendu})`);
    const chemin = await telechargement.path();
    const contenu = await readFile(chemin, 'utf8');
    // ON RELIT LE FICHIER RÉEL PAR LA PORTE DU LOGICIEL, dans la page.
    relu = await s.page.evaluate(async (texte) => {
        const { lireLeFichier } = await import('./js/core/fichierParcours.js');
        const r = lireLeFichier(texte);
        return { erreur: r.erreur, noms: r.parcours.map((p) => p.name),
            etapes: r.parcours.map((p) => (p.steps || []).length) };
    }, contenu);
    dire('LE FICHIER TÉLÉCHARGÉ SE RELIT, AVEC SES ÉTAPES',
        !relu.erreur && relu.noms[0] === nomPris && relu.etapes[0] === etapesAttendues,
        relu.erreur || `${relu.noms.join(' · ')} : ${relu.etapes.join(',')} étape(s)`);
    // ET ON L'IMPORTE PAR LE CHAMP DE FICHIER, comme Rémy le fera.
    await s.page.setInputFiles('#gp-fichier', chemin);
    await dormir(1500);
    const apresImport = (await noms()).filter((n) => n === nomPris);
    dire('IMPORTER LE FICHIER AJOUTE UN SECOND PARCOURS DU MÊME NOM',
        apresImport.length === 2, `${apresImport.length} ligne(s) « ${nomPris} »`);
    // SOUS UN IDENTIFIANT NEUF : le même ferait croire au serveur que c'est le
    // même parcours, et la route `save` refuserait d'écrire sur celui d'un
    // autre professeur — en silence, au démarrage suivant.
    const ids = await s.page.evaluate(async (nom) => {
        const { state } = await import('./js/core/state.js');
        return state.teacherPaths.filter((p) => p.name === nom).map((p) => p.id);
    }, nomPris);
    dire('ET SOUS UN IDENTIFIANT NEUF', new Set(ids).size === ids.length && ids.length === 2,
        ids.join(' · '));
}

// ── LE LENDEMAIN MATIN ──────────────────────────────────────────────────────
console.log('\n\x1b[1mLE LENDEMAIN MATIN\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(6000);
const auReveil = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.teacherPaths.map((p) => p.name).filter((n) => /^[A-E][a-z] /.test(n));
});
console.log(`   au réveil : ${auReveil.join(' · ')}`);
dire(`CE QUI EST JETÉ NE REVIENT PAS (« ${resteJete} »)`,
    !auReveil.includes(resteJete), auReveil.join(' · '));
dire(`et ce qu'on a ressorti est bien là (« ${ressorti} »)`, auReveil.includes(ressorti));
// CINQ, ET NON QUATRE : les trois gardés, celui qu'on a ressorti de la
// corbeille, et la copie importée depuis le fichier — qui doit elle aussi avoir
// survécu au rechargement, sinon l'import n'est qu'un affichage.
dire('tout ce qui doit rester a survécu au rechargement', auReveil.length === 5,
    `${auReveil.length} parcours`);

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 5).forEach((x) => console.log('   ' + x));
s.fenetresNatives.slice(0, 3).forEach((x) => console.log('   native : ' + JSON.stringify(x)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mCLIC, MAJ, CTRL, CMD, CTRL+A, CADRE — ET CE QUI EST JETÉ NE REVIENT PAS.\x1b[0m');
await s.fermer();
process.exit(ratés ? 1 : 0);
