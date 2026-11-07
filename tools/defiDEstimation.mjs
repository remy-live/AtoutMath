// LE DÉFI DE LA CLASSE SUR « À VUE D'ŒIL » — lancé par le professeur, joué par
// l'élève, et le tableau lu par les deux.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/defiDEstimation.mjs
//
// RÉMY, 5 novembre : « j'aimerai bien un exercice où l'élève doit deviner la
// mesure d'un angle et plus il est proche, plus il a de points et après si
// c'est une classe en séance, on peut récupérer les high score, c'est
// motivant ».
//
// ── CE QUE LES AUTRES HARNAIS NE PEUVENT PAS DIRE ──────────────────────────
//
// `tools/testApi.php` garde le serveur : la colonne `points`, le tri, le repli
// sur les bonnes réponses. `tests/defiDeLaClasse.test.mjs` garde les charnières
// du client dans sa source. AUCUN DES DEUX NE REGARDE L'ÉCRAN, et c'est là que
// cet exercice se joue :
//
//   · QUE LE PAVÉ DE PARI APPARAISSE DANS LE DÉFI, et pas un champ de saisie.
//     Un item d'estimation PORTE sa réponse — la mesure exacte de l'angle —,
//     donc le mode « saisie » lui donnerait un champ de texte et une
//     comparaison exacte : l'élève à un degré près serait compté faux. Rien ne
//     le signalerait ; le défi tournerait, et le compteur resterait à zéro.
//   · QUE LE DESSIN NE BOUGE PAS PENDANT QU'ON RÈGLE SON PARI. C'est la règle
//     de l'exercice, et elle vaut ici : un dessin qui suit le nombre, et l'on
//     ajuste jusqu'à ce que ça colle.
//   · QUE LE COMPTEUR COMPTE DES POINTS, et que le tableau de fin les lise.
//   · ET QUE L'APERÇU DU PROFESSEUR MONTRE L'ANGLE. Sans lui, les trois
//     cartes de l'aperçu portaient TROIS FOIS la même phrase — « Combien
//     mesure cet angle ? » — c'est-à-dire rien, alors que l'aperçu existe
//     pour ne pas se tromper d'exercice avant de brûler une minute à trente.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1340, hauteur: 1000 });
await s.identifier();
const classeId = s.info.classe;
const URL = `http://127.0.0.1:${s.port}/index.html`;

// ── 1. LE PROFESSEUR, JUSQU'À LA COMMANDE DU DÉFI ──────────────────────────
console.log('\nL\'ÉCRAN DU PROFESSEUR');
console.log('─'.repeat(64));
await s.page.evaluate(async () => {
    const m = await import('./js/ui/espaceClasses.js');
    await m.ouvrirEspaceClasses();
});
await dormir(2200);
await s.cliquer(`[data-ouvrir="${classeId}"]`, 'la carte de la classe');
await dormir(2400);
await s.doitExister('[data-onglet="direct"]', 'l\'onglet « Le direct »');
await s.cliquer('[data-onglet="direct"]', 'l\'onglet « Le direct »');
await dormir(2400);
await s.doitExister('.ec-pilote-onglet', 'les onglets des commandes de l\'heure');
await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('.ec-pilote-onglet')]
        .find(x => /Défi/.test(x.textContent || ''));
    if (b) b.click();
});
await dormir(1600);
await s.doitExister('[data-defi-exo]', 'le choix de l\'exercice du défi');

// L'EXERCICE EST-IL MÊME PROPOSABLE EN DÉFI ? Il l'est parce qu'il a un
// générateur — « on pourrait faire cela avec les générateurs ».
const proposé = await s.page.evaluate(() =>
    [...document.querySelectorAll('[data-defi-exo] option')]
        .some(o => o.value === 'geo-estimer-angle'));
dire('« À VUE D\'ŒIL » SE LANCE EN DÉFI, comme les exercices de calcul', proposé);

await s.page.selectOption('[data-defi-exo]', 'geo-estimer-angle');
await s.page.selectOption('[data-defi-duree]', '30');

// ── 2. L'APERÇU DOIT MONTRER L'ANGLE ───────────────────────────────────────
await s.cliquer('[data-defi-voir]', 'le bouton « Aperçu »');
// ON ATTEND LA FENÊTRE, ON NE DORT PAS. L'aperçu tire ses trois questions avant
// de s'ouvrir : à 1 400 ms la sonde lisait « 0 carte, 0 dessin » et accusait un
// logiciel juste — jusqu'à ce que le clic SUIVANT trouve l'aperçu par-dessus
// le bouton « Lancer » et dise enfin où était la fenêtre.
await s.page.waitForSelector('.ec-apercu-carte', { timeout: 20000 });
await dormir(500);
// ET ON PART DE L'APERÇU, PAS DU VOILE. `.modal-overlay` désigne DIX éléments
// dans cette page — neuf fenêtres dormantes déclarées en dur plus celle qu'on
// vient d'ouvrir (voir `ui/modal.js`) —, et `querySelector` rend la première,
// c'est-à-dire `#code-modal`, qui est vide. La sonde lisait donc « 0 carte,
// 0 dessin » sur un aperçu parfaitement dessiné : un sélecteur qui DÉSIGNE
// quelque chose, mais pas ce qu'on croit, est plus cher qu'un sélecteur
// inventé — `doitExister` ne le voit pas passer.
const aperçu = await s.page.evaluate(() => {
    const une = document.querySelector('.ec-apercu-carte');
    const m = (une && une.closest('.modal-overlay')) || document.body;
    const cartes = [...m.querySelectorAll('.ec-apercu-carte')];
    const angles = m.querySelectorAll('.ec-apercu-angle');
    const r = angles.length ? angles[0].getBoundingClientRect() : { width: 0, height: 0 };
    return {
        cartes: cartes.length,
        angles: angles.length,
        largeur: Math.round(r.width),
        hauteur: Math.round(r.height),
        mesures: cartes.map(c => (c.querySelector('.ec-apercu-saisie') || {}).textContent || '')
            .map(t => t.replace(/\s+/g, ' ').trim()),
        alerte: /ne propose pas de choix/.test(m.textContent || ''),
        phrase: ((m.querySelector('.ec-note') || {}).textContent || '')
            .replace(/\s+/g, ' ').trim()
    };
});
dire('L\'APERÇU DESSINE LES TROIS ANGLES, et ne répète pas trois fois la phrase',
    aperçu.cartes === 3 && aperçu.angles === 3,
    `${aperçu.cartes} carte(s), ${aperçu.angles} dessin(s)`);
dire('et chacun est assez grand pour qu\'on distingue 118° de 135°',
    aperçu.largeur >= 200 && aperçu.hauteur >= 120,
    `${aperçu.largeur} × ${aperçu.hauteur} px`);
dire('la mesure et la tolérance sont écrites sous chaque carte',
    aperçu.mesures.length === 3 && aperçu.mesures.every(t => /±\d+° près\s*:\s*\d+°/.test(t)),
    JSON.stringify(aperçu.mesures));
// L'AVERTISSEMENT « il passera en saisie » SERAIT UN MENSONGE ICI : un angle à
// estimer ne se pose ni en QCM ni en saisie, il a son pavé de pari. Et c'est
// un mensonge qui fait hésiter juste avant de lancer.
dire('AUCUN AVERTISSEMENT « cet exercice ne propose pas de choix »', !aperçu.alerte);
// ET LA PHRASE D'EN-TÊTE NE PARLE NI DE QCM NI DE SAISIE : le mode choisi ne
// s'applique pas à un angle qu'on estime, et l'annoncer ferait croire à un
// défaut juste avant de lancer la minute.
dire('et la phrase d\'en-tête parle de PARI, pas de QCM ni de saisie',
    /parient/.test(aperçu.phrase) && !/QCM|saisie/.test(aperçu.phrase),
    `« ${aperçu.phrase.slice(0, 80)} »`);
await s.page.screenshot({ path: 'tools/tmp/defi-estim-apercu.png' }).catch(() => {});
// ON LA FERME PAR SA CROIX, comme Rémy la fermerait — et l'on VÉRIFIE qu'elle
// est partie : une fenêtre restée ouverte recouvre « Lancer », et le reste de
// la sonde mesurerait un défi jamais lancé.
await s.page.evaluate(() => {
    const une = document.querySelector('.ec-apercu-carte');
    const voile = une && une.closest('.modal-overlay');
    const croix = voile && voile.querySelector('.modal-close-btn');
    if (croix) croix.click();
});
await s.page.waitForSelector('.ec-apercu-carte', { state: 'detached', timeout: 10000 });
await dormir(600);

// ── 3. L'ÉLÈVE, SUR UN AUTRE POSTE ─────────────────────────────────────────
console.log('\nL\'ÉCRAN DE L\'ÉLÈVE');
console.log('─'.repeat(64));
const ctxEleve = await s.nav.newContext({ viewport: { width: 980, height: 940 } });
const eleve = await ctxEleve.newPage();
const sesErreurs = [];
eleve.on('pageerror', (e) => sesErreurs.push(String(e).slice(0, 160)));
eleve.on('dialog', async (d) => {
    sesErreurs.push('FENÊTRE NATIVE : ' + d.message());
    await d.dismiss();
});
await eleve.goto(URL);
await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await dormir(600);
// Le billet du site d'essai : « Bernard Tom ; tom.b ; 7777 ».
await eleve.fill('#portail-login', 'tom.b');
await eleve.fill('#portail-code-eleve', '7777');
await eleve.click('#portail-connecter');
await dormir(3000);
dire('l\'élève est entré avec son billet',
    await eleve.evaluate(() => !document.getElementById('portail')));

// ── 4. LE PROFESSEUR LANCE, PAR SON BOUTON ─────────────────────────────────
await s.cliquer('[data-defi-go]', 'le bouton « Lancer »');
await dormir(1500);

// L'ardoise le reçoit toute seule au battement ; on force la relecture plutôt
// que d'attendre les dix secondes — c'est la même route.
const arrivé = await eleve.evaluate(async () => {
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
    const { defiEnCours } = await import('./js/core/seanceDistante.js');
    const d = defiEnCours();
    return d ? { exo: d.exo, avant: d.avant } : null;
});
dire('LE DÉFI D\'ESTIMATION ARRIVE CHEZ L\'ÉLÈVE',
    !!arrivé && arrivé.exo === 'geo-estimer-angle',
    JSON.stringify(arrivé));

// LE DÉPART EST ANNONCÉ DOUZE SECONDES À L'AVANCE : on attend qu'il tombe.
await eleve.waitForSelector('.defi-voile--jeu', { timeout: 20000 }).catch(() => {});
await dormir(900);

/** Ce que porte l'écran du défi, et ce que porte son dessin. */
const ecran = () => eleve.evaluate(() => {
    const voile = document.querySelector('.defi-voile--jeu');
    const svg = voile && voile.querySelector('.ea-dessin');
    return {
        voile: !!voile,
        estim: !!(voile && voile.querySelector('.defi-estim')),
        html: svg ? svg.innerHTML : '',
        traits: svg ? svg.querySelectorAll('line').length : 0,
        textes: svg ? [...svg.querySelectorAll('text')].map(t => t.textContent) : [],
        pointille: svg ? svg.querySelectorAll('.ea-pariCote').length : 0,
        ecart: svg ? svg.querySelectorAll('.ea-ecart').length : 0,
        boutons: voile ? voile.querySelectorAll('[data-pas]').length : 0,
        choix: voile ? voile.querySelectorAll('.defi-choix').length : 0,
        saisie: voile ? voile.querySelectorAll('.defi-saisie').length : 0,
        pari: voile ? ((voile.querySelector('[data-valeur]') || {}).textContent || '') : '',
        compteur: voile ? ((voile.querySelector('[data-bonnes]') || {}).textContent || '') : '',
        enTete: voile ? ((voile.querySelector('.defi-score') || {}).textContent || '')
            .replace(/\s+/g, ' ').trim() : '',
        gagne: voile ? ((voile.querySelector('.defi-gagne') || {}).textContent || '') : '',
        vrai: voile ? ((voile.querySelector('.defi-vrai') || {}).textContent || '') : '',
        go: voile ? ((voile.querySelector('[data-go]') || {}).textContent || '') : ''
    };
});

const avant = await ecran();
dire('L\'ÉCRAN DU DÉFI PORTE LE PAVÉ DE PARI, ET PAS UN CHAMP DE SAISIE',
    avant.estim && avant.boutons === 4 && avant.saisie === 0 && avant.choix === 0,
    `${avant.boutons} bouton(s) ± · ${avant.saisie} champ(s) · ${avant.choix} choix`);
dire('l\'angle est dessiné, avec son point d\'interrogation et rien d\'autre',
    avant.traits === 2 && avant.textes.length === 1 && avant.textes[0] === '?',
    `${avant.traits} traits · ${JSON.stringify(avant.textes)}`);
dire('et le compteur du haut parle de POINTS, pas de bonnes réponses',
    /pts/.test(avant.enTete) && avant.compteur === '0', `« ${avant.enTete} »`);
await eleve.screenshot({ path: 'tools/tmp/defi-estim-eleve.png' }).catch(() => {});

// ── 5. RIEN NE BOUGE AVANT LE PARI ─────────────────────────────────────────
for (let i = 0; i < 3; i++) {
    await eleve.click('.defi-voile--jeu [data-pas="10"]');
    await dormir(80);
}
await dormir(250);
const pendant = await ecran();
dire('LES BOUTONS CHANGENT LE PARI', pendant.pari !== avant.pari,
    `${avant.pari} → ${pendant.pari}`);
dire('MAIS LE DESSIN NE BOUGE PAS D\'UN PIXEL — sinon on viserait au lieu d\'estimer',
    pendant.html === avant.html,
    pendant.html === avant.html ? 'toile identique' : 'la toile a changé');

// ── 6. LE PARI, ET LES POINTS ──────────────────────────────────────────────
await eleve.click('.defi-voile--jeu [data-go]');
await dormir(350);
const après = await ecran();
dire('APRÈS LE PARI, LE TRAIT POINTILLÉ ET L\'ÉCART APPARAISSENT',
    après.pointille === 1 && après.ecart === 1,
    `${après.pointille} pointillé(s), ${après.ecart} secteur(s) d'écart`);
dire('ET LES POINTS GAGNÉS S\'ÉCRIVENT, sans aucun verdict « faux »',
    /^\+\d+/.test(après.gagne.trim()), `« ${après.gagne.trim()} »`);

// ── LA VRAIE RÉPONSE NE PASSE PAS EN COURANT D'AIR ────────────────────────
//
// RÉMY, après l'avoir lancé en classe : « je trouvais que la vraie réponse
// passait vite ». Elle était déjà sur le dessin — en petit, au milieu du
// secteur — et c'est justement là qu'on ne la cherche pas quand on vient de
// lire ses points. On l'écrit donc en toutes lettres, ET on laisse le temps.
dire('LA VRAIE MESURE EST ÉCRITE EN TOUTES LETTRES',
    /c'était\s*\d+°/.test(après.vrai), `« ${après.vrai.trim()} »`);
await dormir(1500);
const tientEncore = await ecran();
dire('ET ELLE EST ENCORE LÀ UNE SECONDE ET DEMIE PLUS TARD',
    tientEncore.pointille === 1 && /c'était/.test(tientEncore.vrai),
    tientEncore.pointille === 1 ? 'l\'écart tient à l\'écran' : 'la question a déjà changé');
// ET L'ON PEUT PASSER PLUS TÔT : celui qui va vite garde son rythme.
dire('ET LE BOUTON PROPOSE DE PASSER À LA SUITE', /Suivant/.test(tientEncore.go),
    `« ${tientEncore.go.trim()} »`);

// ── ON VISE L'ANGLE QU'ON LIT SUR LE DESSIN ────────────────────────────────
//
// ET C'EST LA MESURE LA PLUS FORTE DE CETTE SONDE. La sonde ne connaît pas la
// réponse — elle n'y a aucun accès, comme l'élève —, elle la LIT sur les deux
// côtés tracés : l'écart de leurs directions EST l'angle. Puis elle règle son
// pari dessus et parie.
//
// SI LE DESSIN MENTAIT, ELLE MARQUERAIT ZÉRO. Un drapeau d'arc mal posé
// dessine le COMPLÉMENT de l'angle : un 60° s'afficherait à 300°, la sonde
// parierait 300, et le barème le dirait tout de suite. C'est le défaut que ni
// l'épreuve de noyau ni le serveur ne peuvent voir, parce qu'il est dans la
// géométrie de ce qui est peint.
const parierJuste = () => eleve.evaluate(() => {
    const voile = document.querySelector('.defi-voile--jeu');
    if (!voile) return null;
    const go = voile.querySelector('[data-go]');
    if (!go || go.hidden) return null;
    const cotes = [...voile.querySelectorAll('.ea-cote')];
    const champ = voile.querySelector('[data-valeur]');
    if (cotes.length !== 2 || !champ) return null;
    // L'AXE Y DE SVG DESCEND : la direction trigonométrique d'un trait est donc
    // `atan2(y1 - y2, x2 - x1)`, et non l'inverse.
    const dir = (l) => Math.atan2(
        Number(l.getAttribute('y1')) - Number(l.getAttribute('y2')),
        Number(l.getAttribute('x2')) - Number(l.getAttribute('x1'))) * 180 / Math.PI;
    // LE PREMIER TRAIT EST LE CÔTÉ DE DÉPART, le second l'autre côté : c'est
    // l'ordre dans lequel `dessinDeLAngle` les émet.
    const ouverture = (((dir(cotes[1]) - dir(cotes[0])) % 360) + 360) % 360;
    const cible = Math.max(1, Math.min(359, Math.round(ouverture)));
    const lire = () => Number((champ.textContent || '').replace('°', ''));
    const presser = (pas) => {
        const b = voile.querySelector(`[data-pas="${pas}"]`);
        if (b) b.click();
    };
    // LES CLICS SONT DANS LA PAGE, ET C'EST VOULU : trente-cinq allers-retours
    // depuis Node coûteraient deux secondes sur une minute qui en a trente.
    for (let garde = 0; garde < 500; garde++) {
        const e = cible - lire();
        if (e === 0) break;
        presser(e >= 10 ? 10 : e <= -10 ? -10 : (e > 0 ? 1 : -1));
    }
    const posé = lire();
    go.click();
    return { cible, posé };
});

const visés = [];
for (let i = 0; i < 3; i++) {
    // ON ATTEND QUE LA QUESTION SUIVANTE SOIT POSÉE. Le retour dure maintenant
    // deux secondes et demie — c'est tout l'objet de la correction de Rémy —,
    // et une sonde qui parie pendant qu'on regarde son écart ne mesure rien.
    await eleve.waitForSelector('.defi-voile--jeu [data-valeur]', { timeout: 6000 })
        .catch(() => {});
    await dormir(150);
    const v = await parierJuste();
    if (!v) break;
    visés.push(v);
}
await dormir(900);
const compté = await eleve.evaluate(() => {
    const v = document.querySelector('.defi-voile--jeu [data-bonnes]');
    return v ? v.textContent : '';
});
dire('LA SONDE LIT L\'ANGLE SUR LE DESSIN ET POSE SON PARI DESSUS',
    visés.length >= 2 && visés.every(v => v.posé === v.cible),
    JSON.stringify(visés));
// TROIS PARIS AU DEGRÉ PRÈS VALENT CENT POINTS CHACUN. Si le dessin montrait
// le complément de l'angle, le même pari en vaudrait zéro.
dire('ET LE COMPTEUR MONTE EN POINTS — le dessin dit bien l\'angle qu\'on estime',
    Number(compté) >= 90 * visés.length,
    `${compté} pts pour ${visés.length} pari(s) au degré près`);

// ── 7. LE TABLEAU DE FIN, EN POINTS ────────────────────────────────────────
console.log('\nLE TABLEAU DE LA CLASSE');
console.log('─'.repeat(64));

// ── LE DÉCOMPTE DU CLASSEMENT, et c'est l'idée de Rémy ────────────────────
//
// « On pourrait pas avoir un petit décompte ou forcer une requete php pour
// avoir le classement total ». Il tient la porte du tableau fermée pendant que
// les trente scores arrivent — sans lui, chacun photographie une classe
// presque vide, et les podiums se contredisent d'un écran à l'autre.
const vuLeDecompte = await eleve.waitForSelector('.defi-carte--compte', { timeout: 60000 })
    .then(() => true).catch(() => false);
dire('LE DÉCOMPTE DU CLASSEMENT S\'AFFICHE AVANT LE TABLEAU', vuLeDecompte,
    vuLeDecompte ? 'on rassemble les scores' : 'le tableau s\'ouvre sans attendre personne');
await eleve.waitForSelector('.defi-carte--fin', { timeout: 60000 }).catch(() => {});
// LE TABLEAU SUIT LES SCORES QUI ARRIVENT : on force une relecture, comme le
// battement le fait, pour lire la version qui compte.
await eleve.evaluate(async () => {
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
});
await dormir(900);
const fin = await eleve.evaluate(() => {
    const c = document.querySelector('.defi-carte--fin');
    if (!c) return null;
    return {
        podium: [...c.querySelectorAll('.defi-marche')].map(m => ({
            prenom: (m.querySelector('.defi-prenom') || {}).textContent || '',
            pts: (m.querySelector('.defi-pts') || {}).textContent || ''
        })),
        moi: (c.querySelector('.defi-moi') || {}).textContent.replace(/\s+/g, ' ').trim()
    };
});
dire('LE TABLEAU ARRIVE À LA FIN DE LA MINUTE', !!fin,
    fin ? `${fin.podium.length} marche(s)` : 'aucune carte de fin');
dire('ET IL SE LIT EN POINTS, pas en bonnes réponses',
    !!fin && /\bpoints?\b/.test(fin.moi) && !/bonne/.test(fin.moi),
    fin ? `« ${fin.moi} »` : '—');
dire('le podium porte un score de points, et non un compte de réponses',
    !!fin && fin.podium.length >= 1 && Number(fin.podium[0].pts) > 1,
    fin ? JSON.stringify(fin.podium) : '—');
await eleve.screenshot({ path: 'tools/tmp/defi-estim-tableau.png' }).catch(() => {});

// ── 8. ET LE PROFESSEUR LIT LE MÊME ORDRE ──────────────────────────────────
await s.page.evaluate(async () => {
    const { rafraichirSeance } = await import('./js/core/sync.js');
    if (rafraichirSeance) await rafraichirSeance().catch(() => {});
});
await dormir(2500);
const chezLeProf = await s.page.evaluate(() => {
    const ol = document.querySelector('.ec-defi-classement');
    if (!ol) return null;
    return [...ol.querySelectorAll('li')].map(l => l.textContent.replace(/\s+/g, ' ').trim());
});
dire('LE CLASSEMENT DU PROFESSEUR DIT « pts », et garde les bonnes réponses à côté',
    !!chezLeProf && chezLeProf.length >= 1 && /pts · \d+\/\d+/.test(chezLeProf[0]),
    chezLeProf ? JSON.stringify(chezLeProf) : 'le classement n\'est pas à l\'écran');

console.log(`\nerreurs de page : ${s.erreurs.length + sesErreurs.length}, `
    + `fenêtres natives : ${s.fenetresNatives.length}`);
[...s.erreurs, ...sesErreurs].slice(0, 4).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || sesErreurs.length || s.fenetresNatives.length) ratés++;

await ctxEleve.close();
await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
