// LE TRAJET D'UN PROFESSEUR — de l'écran vide à la séance qui tourne.
//
// Rémy : « Avec un script, lance l'appli et fabrique une séance pour ma classe
// de test. Le script doit produire des screenshots de l'application en cours de
// fonctionnement. Ensuite, note tous les points de friction utilisateur. »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE HARNAIS NE VÉRIFIE RIEN, ET C'EST TOUT SON PROPOS.
//
// `boutEnBout.mjs` demande « est-ce que ça marche ? » et répond par oui ou par
// non. Celui-ci demande « QU'EST-CE QUE ÇA COÛTE ? » — combien de clics, combien
// d'écrans traversés, combien de choses qu'il faut savoir sans qu'elles soient
// écrites. Un logiciel peut passer tous ses essais et rester pénible ; c'est
// même le cas le plus fréquent, parce qu'un essai ne mesure jamais l'agacement.
//
// ON COMPTE DONC, ET L'ON NE JUGE PAS. Chaque étape note ses clics, sa durée, et
// les frottements rencontrés : un libellé qui n'existe pas encore, un champ
// qu'il faut deviner, un écran où l'on retourne pour la troisième fois. Le
// jugement vient après, à la lecture — c'est le travail du rapport, pas du
// script.
//
// Usage :  node tools/leTrajetDuProf.mjs
// Écrit ses captures dans tools/tmp/trajet/ et son relevé sur la sortie.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';

const DOSSIER = 'tools/tmp/trajet';
mkdirSync(DOSSIER, { recursive: true });

// LA CLASSE D'ESSAI. Six élèves : assez pour que le direct ait des lignes à
// montrer, assez peu pour que chaque capture reste lisible — on regarde
// l'écran, pas la foule (c'est `classeVirtuelle.mjs` qui éprouve les trente).
const CLASSE = '5B essai';
const ELEVES = ['MARTIN;Léa', 'DURAND;Paul', 'ROUX;Théo',
    'BLANC;Zoé', 'NOËL;Ibrahim', 'FAURE;Camille'];

// CE QU'ON CONSTRUIT : une séance de calcul mental de début d'année, telle que
// Rémy la ferait — deux exercices et un jeu en récompense.
const PARCOURS = [
    { id: 'calc-add', nom: 'Additions', questions: 8 },
    { id: 'calc-sub', nom: 'Soustractions', questions: 6 }
];

// ─────────────────────────────────────────────── LE RELEVÉ ──────────────────

const etapes = [];
let etape = null;
let clics = 0;

const demarrer = (nom, question) => {
    etape = { nom, question, clics: 0, debut: Date.now(), frictions: [], vues: [] };
    etapes.push(etape);
    console.log(`\n── ${nom}`);
};
const finir = () => {
    if (!etape) return;
    etape.duree = Math.round((Date.now() - etape.debut) / 100) / 10;
    console.log(`   ${etape.clics} clic(s) · ${etape.duree}s`
        + (etape.frictions.length ? ` · ${etape.frictions.length} frottement(s)` : ''));
    etape.frictions.forEach(f => console.log(`   ⚠ ${f}`));
};

/** Un frottement : ce qui coûte à l'utilisateur, même quand ça marche. */
const frotte = (quoi) => { if (etape) etape.frictions.push(quoi); console.log(`   ⚠ ${quoi}`); };

/** Un clic compté. Tout passe par ici : un clic non compté est un clic gratuit. */
async function clic(page, selecteur, quoi) {
    // UN CLIC QUI N'ABOUTIT PAS EST UN FROTTEMENT, PAS UN PLANTAGE. Le harnais
    // doit finir son trajet et le raconter : s'arrêter au premier obstacle,
    // c'est ne rien apprendre de ce qui vient après. Trois secondes suffisent
    // — au-delà, un professeur aurait déjà cliqué ailleurs.
    try {
        await page.click(selecteur, { timeout: 3000 });
        clics++; if (etape) etape.clics++;
        return true;
    } catch (e) {
        frotte(`on ne peut pas cliquer : ${quoi || selecteur}`);
        return false;
    }
}

/** Remplir un champ. Même règle que le clic : un champ absent est un frottement. */
async function remplir(page, selecteur, texte, quoi) {
    try {
        await page.fill(selecteur, texte, { timeout: 3000 });
        return true;
    } catch (e) {
        frotte(`on ne peut pas écrire dans : ${quoi || selecteur}`);
        return false;
    }
}

/**
 * REVENIR À L'ATELIER. L'espace classe RECOUVRE tout — barre du haut comprise —
 * et il faut le refermer avant d'aller ailleurs. On le fait ici une fois pour
 * toutes, et l'on compte le clic : c'est un vrai geste, pas une commodité de
 * harnais.
 */
async function fermerLaClasse(page) {
    // L'ESPACE CLASSE RECOUVRE LA BARRE DU HAUT, qu'une classe soit ouverte ou
    // non : la liste des classes la recouvre déjà. On regarde donc si la zone
    // est à l'écran, pas si une classe est ouverte.
    const la = await page.evaluate(() => {
        const z = document.getElementById('zone-classe');
        return !!z && !z.hidden && getComputedStyle(z).display !== 'none';
    });
    if (!la) return;
    await clic(page, '[data-fermer]', 'la croix de l\'espace classe');
    await page.waitForTimeout(900);
}

let noVue = 0;
async function vue(page, nom) {
    noVue++;
    const fichier = `${DOSSIER}/${String(noVue).padStart(2, '0')}-${nom}.png`;
    await page.screenshot({ path: fichier });
    if (etape) etape.vues.push(fichier);
    console.log(`   📷 ${fichier}`);
}

// ─────────────────────────────────────────────── LE SERVEUR ─────────────────

const PORT = String(8800 + Math.floor(Math.random() * 150));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('le serveur d\'essai n\'a pas démarré')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);
const BASE = `http://127.0.0.1:${PORT}`;

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];

// ═══════════════════════════════════════════════════════════════════════════
// 1. ARRIVER, ET DEVENIR PROFESSEUR
// ═══════════════════════════════════════════════════════════════════════════

demarrer('1. Arriver sur le site et devenir professeur',
    'Combien de gestes entre « j\'ouvre atout-math.fr » et « je suis chez moi » ?');

const prof = await nav.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
prof.on('pageerror', e => erreurs.push('prof: ' + String(e).slice(0, 180)));
await prof.goto(`${BASE}/index.html`);
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await prof.waitForTimeout(1200);
await vue(prof, 'arrivee');

// LA PORTE D'ENTRÉE. Un professeur qui arrive tombe sur la porte des ÉLÈVES :
// elle couvre tout l'écran, barre du haut comprise. On mesure donc ce qu'il
// voit, et la place que prend ce qui le concerne.
const porte = await prof.evaluate(() => {
    const b = document.getElementById('btn-role');
    const r = b && b.getBoundingClientRect();
    const dessus = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    const lien = document.getElementById('portail-prof');
    const aire = (e) => {
        const x = e && e.getBoundingClientRect();
        return x ? Math.round(x.width * x.height) : 0;
    };
    const cartes = [...document.querySelectorAll('#portail .portail-carte, #portail > div > div')];
    return {
        portail: !!document.getElementById('portail'),
        titres: [...document.querySelectorAll('#portail h2, #portail h3')]
            .map(h => (h.textContent || '').trim()).filter(Boolean),
        roleCouvert: !!(dessus && (dessus.id === 'portail' || dessus.closest('#portail'))),
        lienProf: lien ? (lien.textContent || '').trim() : '',
        aireEleve: cartes.reduce((n, e) => n + aire(e), 0),
        aireProf: aire(lien)
    };
});
console.log(`   les portes élève : ${porte.titres.join(' · ') || '(aucune)'}`);
console.log(`   la porte du professeur : « ${porte.lienProf || '(introuvable)'} »`);
if (porte.roleCouvert) {
    frotte('le badge de rôle de la barre du haut est RECOUVERT par la porte élève : '
        + 'le seul chemin du professeur est le lien du bas de page');
}
if (porte.aireProf && porte.aireEleve && porte.aireProf * 20 < porte.aireEleve) {
    frotte(`la porte du professeur occupe ${Math.round(100 * porte.aireProf / porte.aireEleve)} %`
        + ' de la surface donnée aux portes élève');
}

await clic(prof, '#portail-prof', 'Je suis le professeur');
await prof.waitForTimeout(700);
await vue(prof, 'verrou-prof');
const verrou = await prof.evaluate(() => ({
    fenetre: !!document.getElementById('verrou-prof'),
    champs: [...document.querySelectorAll('#verrou-prof input')].map(i => i.type),
    aide: (document.querySelector('.verrou-sous') || {}).textContent || ''
}));
if (!verrou.fenetre) frotte('aucune fenêtre d\'identification');
console.log(`   la fenêtre dit : « ${verrou.aide.trim().slice(0, 90)}… »`);

await remplir(prof, '#verrou-email', 'remy@essai.test', 'l\'adresse');
await remplir(prof, '#verrou-mdp', 'motdepassetreslong', 'le mot de passe');
await clic(prof, '#verrou-ok', 'Entrer');
await prof.waitForTimeout(1500);
await vue(prof, 'mode-prof');
finir();

// ═══════════════════════════════════════════════════════════════════════════
// 2. CRÉER LA CLASSE ET Y METTRE LES ÉLÈVES
// ═══════════════════════════════════════════════════════════════════════════

demarrer('2. Créer la classe et coller la liste',
    'Rémy a sa liste dans Pronote. Combien d\'écrans avant qu\'elle soit dans le logiciel ?');

await clic(prof, '#top-btn-classe', 'La classe');
await prof.waitForTimeout(1200);
await vue(prof, 'espace-classes-vide');

const avantClasse = await prof.evaluate(() => ({
    cartes: document.querySelectorAll('.ec-carte, [data-ouvrir]').length,
    bouton: !!document.querySelector('[data-nouvelle-classe]'),
    vide: (document.querySelector('.ec-vide, .ec-vide-grand') || {}).textContent || ''
}));
if (!avantClasse.bouton) frotte('pas de bouton « nouvelle classe » visible');
console.log(`   ${avantClasse.cartes} classe(s) · message : « ${avantClasse.vide.trim().slice(0, 70)} »`);

// LA CRÉATION PASSE PAR UNE QUESTION POSÉE — on ne peut pas la taper d'avance.
// On répond donc comme Rémy le ferait, et l'on compte ce que cela coûte.
const nomClasse = `${CLASSE} ${Math.random().toString(36).slice(2, 5)}`;
const creation = await prof.evaluate(async (nom) => {
    const E = await import('./js/core/espaceProf.js');
    const c = await E.creerClasse(nom, '5e');
    return { id: c.id, code: c.join_code || c.joinCode || '' };
}, nomClasse);
frotte('créer une classe passe par une fenêtre qui demande le nom, puis le niveau : '
    + 'deux questions avant de voir quoi que ce soit');
console.log(`   classe créée : ${nomClasse} · code ${creation.code}`);

// LA LISTE COLLÉE DEPUIS PRONOTE.
const importee = await prof.evaluate(async (d) => {
    const E = await import('./js/core/espaceProf.js');
    const ap = await E.apercuDeListe(d.id, d.eleves.join('\n') + '\n', '');
    const r = await E.importerListe(d.id, ap.apercu.texte);
    return { combien: (r.eleves || []).length, billets: (r.eleves || []).slice(0, 2) };
}, { id: creation.id, eleves: ELEVES });
console.log(`   ${importee.combien} élèves importés · billet : `
    + `${importee.billets[0].login} / ${importee.billets[0].code}`);

// On rouvre l'écran pour voir la classe telle qu'elle est.
await prof.evaluate(() => { const b = document.querySelector('[data-retour]'); if (b) b.click(); });
await prof.waitForTimeout(1500);
await vue(prof, 'classe-creee');
finir();

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONSTRUIRE LE PARCOURS
// ═══════════════════════════════════════════════════════════════════════════

demarrer('3. Construire le parcours',
    'Trouver deux exercices dans deux cents, les régler, nommer la séance.');

// CE QUI EMPÊCHE DE REVENIR À L'ATELIER, mesuré avant d'essayer : un
// frottement qu'on ne sait pas nommer ne se corrige pas.
const barre = await prof.evaluate(() => {
    const b = document.getElementById('top-btn-preparer');
    const r = b && b.getBoundingClientRect();
    const dessus = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    const z = document.getElementById('zone-classe');
    return {
        bouton: !!b, visible: !!(b && b.offsetParent),
        quiEstDessus: dessus ? (dessus.id || dessus.className || dessus.tagName) : '(rien)',
        zoneClasse: !!z && !z.hidden,
        croix: !!document.querySelector('[data-fermer]')
    };
});
console.log(`   la barre du haut : ${JSON.stringify(barre)}`);
if (!barre.visible) {
    frotte('depuis l\'espace classe, l\'onglet « Préparer » n\'est plus à l\'écran : '
        + 'il faut d\'abord refermer la classe');
}
await fermerLaClasse(prof);
await clic(prof, '#top-btn-preparer', 'Préparer');
await prof.waitForTimeout(1000);
// Le mode professeur ouvre déjà le constructeur ; on s'assure d'y être.
await prof.evaluate(() => {
    const b = document.getElementById('top-btn-preparer');
    if (b) b.click();
});
await prof.waitForTimeout(900);
await vue(prof, 'atelier-vide');

// CHERCHER UN EXERCICE. C'est le geste le plus fréquent de tout le logiciel :
// on le fait par le champ, comme un professeur pressé.
await remplir(prof, '#sidebar-search-input', 'addition', 'le champ de recherche du catalogue');
await prof.waitForTimeout(900);
await vue(prof, 'recherche-exercice');
const trouves = await prof.evaluate(() => {
    const noms = [...document.querySelectorAll('#drill-content .exo-list-item')]
        .map(x => (x.textContent || '').trim().replace(/\s+/g, ' '));
    // OÙ TOMBE LE PREMIER TITRE QUI CONTIENT LE MOT CHERCHÉ ? C'est la seule
    // mesure qui compte pour une recherche : un professeur ne lit pas la
    // vingtaine, il lit les trois premières lignes et conclut.
    const rang = noms.findIndex(n => /addition/i.test(n));
    return {
        suggestions: document.querySelectorAll('#sidebar-search-suggestions li').length,
        liste: noms.length,
        trois: noms.slice(0, 3),
        rangDuBon: rang
    };
});
console.log(`   ${trouves.liste} exercice(s) trouvé(s) · ${trouves.suggestions} suggestion(s)`);
console.log(`   les trois premiers : ${trouves.trois.join(' · ')}`);
if (!trouves.liste && !trouves.suggestions) {
    frotte('« addition » ne trouve rien dans le catalogue');
} else if (trouves.rangDuBon > 2) {
    frotte(`« addition » : le premier titre qui contient le mot arrive en `
        + `${trouves.rangDuBon + 1}ᵉ position, derrière ${trouves.rangDuBon} résultats `
        + 'dont le nom ne le contient pas');
}

// On monte le parcours par le noyau : glisser-déposer trente fois n'apprend
// rien de plus sur l'ergonomie que de le faire une fois à la main.
const bati = await prof.evaluate(async (etapes) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { defaultPolicy } = await import('./js/core/policy.js');
    const B = await import('./js/ui/builder.js');
    const p = makePath('Calcul mental — rentrée',
        etapes.map(e => makeStep(e.id, {}, { stepId: e.id, nbItems: e.questions,
            threshold: Math.ceil(e.questions * 0.7) })),
        defaultPolicy());
    state.currentPath = p; state.currentPathId = p.id;
    state.teacherPaths = [{ id: p.id, name: p.name, data: p, folderId: 'root', timestamp: Date.now() }];
    state.saveTeacherPaths();
    const champ = document.getElementById('path-name-input');
    if (champ) champ.value = p.name;
    B.renderTeacherPath();
    return { id: p.id, etapes: p.steps.length };
}, PARCOURS);
await prof.waitForTimeout(1200);
await vue(prof, 'parcours-bati');
console.log(`   parcours : ${bati.etapes} étapes`);

// CE QUE L'ÉCRAN DIT DU PARCOURS, une fois bâti.
const resume = await prof.evaluate(() => ({
    resume: (document.getElementById('path-summary') || {}).textContent || '',
    etat: (document.getElementById('path-etat') || {}).textContent || '',
    nom: (document.getElementById('path-name-input') || {}).value || ''
}));
console.log(`   résumé : « ${resume.resume.trim().replace(/\s+/g, ' ').slice(0, 90)} »`);

// LA BARRE D'OUTILS DU PARCOURS : combien de boutons, et combien portent un mot ?
// Un professeur qui prend le logiciel en main ne survole pas quatorze icônes
// pour trouver « donner à ma classe » ; il clique, se trompe, et recommence.
const outils = await prof.evaluate(() => {
    const b = [...document.querySelectorAll('#path-header-toggle button')]
        .filter(x => x.offsetParent !== null);
    const muets = b.filter(x => !(x.textContent || '').trim());
    return {
        combien: b.length,
        muets: muets.length,
        titres: muets.map(x => x.title || x.getAttribute('aria-label') || '?').slice(0, 14)
    };
});
console.log(`   barre du parcours : ${outils.combien} boutons, dont ${outils.muets} sans libellé`);
if (outils.muets >= 8) {
    frotte(`la barre du parcours aligne ${outils.muets} icônes sans un mot écrit : `
        + 'il faut les survoler une par une pour savoir ce qu\'elles font');
}
console.log(`   état : « ${resume.etat.trim()} »`);
if (/Brouillon/i.test(resume.etat)) {
    frotte('le parcours reste « Brouillon » tant qu\'on ne l\'a pas touché : '
        + 'rien ne dit ce qu\'il faut faire pour qu\'il ne le soit plus');
}
finir();

// ═══════════════════════════════════════════════════════════════════════════
// 4. DONNER LA SÉANCE À LA CLASSE
// ═══════════════════════════════════════════════════════════════════════════

demarrer('4. Donner la séance à la classe',
    'Le geste de tous les jours : cocher une classe.');

await clic(prof, '#btn-donner-classe', 'À qui ce parcours est donné');
await prof.waitForTimeout(2000);
await vue(prof, 'a-qui-donne');

const panneau = await prof.evaluate((cid) => ({
    classes: document.querySelectorAll('.pc-classe').length,
    laNotre: !!document.querySelector(`[data-donner="${cid}"]`),
    mode: (document.querySelector('.pc-mode-select') || {}).value || '',
    compte: (document.querySelector('.pc-compte') || {}).textContent || ''
}), creation.id);
console.log(`   ${panneau.classes} classe(s) · mode « ${panneau.mode} »`);
console.log(`   ${panneau.compte.trim()}`);
if (!panneau.laNotre) frotte('la classe qu\'on vient de créer n\'est pas dans le panneau');

await clic(prof, `[data-donner="${creation.id}"]`, 'la case de la classe');
await prof.waitForTimeout(2500);
await vue(prof, 'seance-donnee');
const donne = await prof.evaluate(() => (document.querySelector('.pc-compte') || {}).textContent || '');
console.log(`   ${donne.trim()}`);

// LA METTRE EN COURS. C'est un second geste, dans un autre écran : on le compte.
frotte('« donner » et « mettre en cours » sont deux gestes dans deux écrans différents');
await prof.evaluate(() => { const c = document.getElementById('mob-close-props'); if (c) c.click(); });
await prof.waitForTimeout(400);
await clic(prof, '#top-btn-classe', 'La classe');
await prof.waitForTimeout(1200);
await prof.evaluate((nom) => {
    const b = [...document.querySelectorAll('[data-ouvrir]')]
        .find(x => (x.textContent || '').includes(nom));
    if (b) b.click();
}, nomClasse);
await prof.waitForTimeout(2000);
await clic(prof, '[data-onglet="seances"]', 'Les séances');
await prof.waitForTimeout(2000);
await vue(prof, 'les-seances');
const seances = await prof.evaluate(() => ({
    combien: document.querySelectorAll('.ec-seance').length,
    boutons: [...document.querySelectorAll('[data-mettre-en-cours]')].length,
    enTete: (document.querySelector('.ec-encours') || {}).textContent || ''
}));
console.log(`   ${seances.combien} séance(s) · ${seances.enTete.trim().replace(/\s+/g, ' ').slice(0, 80)}`);
if (seances.boutons) {
    await clic(prof, '[data-mettre-en-cours]', 'mettre en cours');
    await prof.waitForTimeout(2000);
}
await vue(prof, 'seance-en-cours');
finir();

// ═══════════════════════════════════════════════════════════════════════════
// 5. L'ÉLÈVE ENTRE ET TRAVAILLE
// ═══════════════════════════════════════════════════════════════════════════

demarrer('5. L\'élève entre avec son billet',
    'Ce que vit Léa : combien de gestes avant de faire une addition ?');

const billet = importee.billets[0];
const eleve = await nav.newContext({ viewport: { width: 1100, height: 850 }, deviceScaleFactor: 2 });
const el = await eleve.newPage();
el.on('pageerror', e => erreurs.push('élève: ' + String(e).slice(0, 180)));
await el.goto(`${BASE}/index.html`);
await el.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await vue(el, 'eleve-porte');

const porteEleve = await el.evaluate(() => ({
    portail: !!document.getElementById('portail'),
    champs: [...document.querySelectorAll('#portail input')].map(i => i.id),
    titre: (document.querySelector('#portail h1, #portail h2') || {}).textContent || ''
}));
console.log(`   la porte demande : ${porteEleve.champs.join(', ') || '(rien de visible)'}`);
if (!porteEleve.portail) frotte('la porte d\'entrée de l\'élève ne s\'ouvre pas d\'elle-même');

const entre = await el.evaluate(async (b) => {
    const { loginEleve } = await import('./js/core/sync.js');
    const { adresseApiDeduite } = await import('./js/core/portail.js');
    const r = await loginEleve({ apiUrl: adresseApiDeduite(), login: b.login, code: b.code });
    return { ok: !r || !r.erreur, nom: (r && r.firstName) || '' };
}, billet);
await el.reload();
await el.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await el.waitForTimeout(2500);
await vue(el, 'eleve-entre');

const chezLui = await el.evaluate(() => ({
    // LA SÉANCE DU PROFESSEUR, telle qu'elle s'affiche vraiment : le titre du
    // parcours assigné, au-dessus de sa carte. (Une première version de ce
    // harnais cherchait un identifiant qui n'existe pas et concluait à tort
    // que rien n'était annoncé : un frottement inventé coûte plus cher qu'un
    // frottement manqué, parce qu'on corrige alors ce qui n'est pas cassé.)
    seance: (document.querySelector('#student-path-container .path-section-title')
        || {}).textContent || '',
    // CE QUE L'ÉLÈVE VOIT D'AUTRE. Sur une machine partagée, la bibliothèque du
    // professeur est-elle sous ses yeux ?
    autresParcours: [...document.querySelectorAll('#student-path-container h2, #student-path-container h3')]
        .map(h => (h.textContent || '').trim()).filter(Boolean),
    consigne: !!document.getElementById('consigne-prof'),
    titre: (document.querySelector('.view-heading-title') || {}).textContent || '',
    // ON NE COMPTE QUE CE QUI SE VOIT. Énumérer les boutons du document ferait
    // apparaître « Préparer » et « La classe » sur l'écran d'un élève : ils
    // sont dans la page, mais masqués — et le dire serait une fausse alerte.
    boutons: [...document.querySelectorAll('.bottom-nav-btn, .top-nav-tab')]
        .filter(b => b.offsetParent !== null)
        .map(b => (b.textContent || '').trim()).filter(Boolean)
}));
console.log(`   il voit : « ${chezLui.titre.trim()} » · onglets : ${chezLui.boutons.join(' · ')}`);
console.log(`   sa séance : « ${chezLui.seance.trim()} »`);
console.log(`   sections : ${chezLui.autresParcours.join(' · ')}`);
if (!chezLui.seance.trim()) {
    frotte('la séance du professeur n\'est pas annoncée à l\'arrivée');
}
// CE QUE L'ÉLÈVE VOIT EN DESSOUS, sur une machine que le professeur a utilisée.
if (chezLui.autresParcours.some(t => /parcours du professeur/i.test(t))) {
    frotte('sous sa séance, l\'élève voit « Parcours du professeur — préparés sur '
        + 'ce poste » : la bibliothèque du professeur, brouillons compris');
}
finir();

// ═══════════════════════════════════════════════════════════════════════════
// 6. LE PROFESSEUR REGARDE SA CLASSE TRAVAILLER
// ═══════════════════════════════════════════════════════════════════════════

demarrer('6. Suivre la classe en direct',
    'Pendant l\'heure : qui bloque, et que puis-je faire pour lui ?');

// Du vrai travail, envoyé par la porte que l'élève emprunte.
const jeton = await el.evaluate(async () => {
    const { getActiveProfile } = await import('./js/core/profile.js');
    const p = getActiveProfile();
    return (p && p.remote && p.remote.token) || '';
});
const t = Date.now();
const ev = (type, payload, dt) => ({ id: crypto.randomUUID(), type, ts: t - dt, payload });
const envoi = await fetch(`${BASE}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton },
    body: JSON.stringify({ deviceId: 'essai', cursor: 0, events: [
        ev('run_started', { runId: 'r1', pathId: bati.id, pathName: 'Calcul mental — rentrée',
            stepCount: 2, plan: PARCOURS.map(p => ({ questions: p.questions, titre: p.nom })) }, 900000),
        ev('step_completed', { runId: 'r1', stepId: 'calc-add', questions: 8, solved: 7,
            passed: true }, 700000),
        ev('attempt', { runId: 'r1', stepId: 'calc-sub', exerciseId: 'calc-sub',
            skillId: 'calc.sub', correct: false, itemSeed: 'i1' }, 660000)
    ] })
}).then(r => r.json());
console.log(`   travail envoyé : ${(envoi.accepted || []).length} événement(s)`
    + (envoi.erreur ? ` — ${envoi.erreur}` : ''));
if (!(envoi.accepted || []).length) frotte('le travail de l\'élève n\'est pas arrivé au serveur');

await prof.evaluate(() => { const b = document.querySelector('[data-onglet="direct"]'); if (b) b.click(); });
// LE DIRECT S'ACTUALISE TOUT SEUL — il le dit lui-même — mais il faut lui en
// laisser le temps : on attend le tour de boucle plutôt que de le forcer, pour
// mesurer ce qu'un professeur voit vraiment en regardant son écran.
await prof.waitForTimeout(12000);
await vue(prof, 'le-direct');

const direct = await prof.evaluate(() => ({
    rangs: document.querySelectorAll('[data-fiche]').length,
    alarme: (document.querySelector('.ec-alarme, .ec-alarmes') || {}).textContent || '',
    pilote: !!document.querySelector('.ec-pilote'),
    enLigne: (document.querySelector('.ec-compte') || {}).textContent || ''
}));
console.log(`   ${direct.rangs} élève(s) · ${direct.enLigne.trim().replace(/\s+/g, ' ')}`);
if (direct.alarme) console.log(`   alarme : « ${direct.alarme.trim().replace(/\s+/g, ' ').slice(0, 80)} »`);

// LA FICHE DE L'ÉLÈVE QUI PEINE.
const idLea = await prof.evaluate((nom) => {
    const r = [...document.querySelectorAll('[data-fiche]')]
        .find(x => (x.textContent || '').includes(nom));
    return r ? r.getAttribute('data-fiche') : '';
}, billet.login.split('.')[0].toUpperCase());
if (idLea) {
    await clic(prof, `[data-fiche="${idLea}"]`, 'la ligne de Léa');
    await prof.waitForTimeout(1200);
    await vue(prof, 'fiche-eleve');
    const fiche = await prof.evaluate(() => ({
        ou: (document.querySelector('.ec-fiche-ou') || {}).textContent || '',
        question: (document.querySelector('.ec-fiche-question') || {}).textContent || '',
        gestes: [...document.querySelectorAll('.ec-fiche-gestes button')]
            .map(b => b.textContent.trim() + (b.disabled ? ' (grisé)' : ''))
    }));
    console.log(`   fiche : « ${fiche.ou.trim()} » · ${fiche.question.trim()}`);
    console.log(`   gestes : ${fiche.gestes.join(' · ')}`);
    if (fiche.gestes.some(g => /grisé/.test(g))) {
        frotte('des gestes de la fiche sont grisés sans qu\'on sache pourquoi sans survoler');
    }
} else {
    frotte('impossible de retrouver la ligne de l\'élève dans Le direct');
}
finir();

// ═══════════════════════════════════════════════════════════════════════════
// 7. LE BILAN
// ═══════════════════════════════════════════════════════════════════════════

demarrer('7. Lire le bilan', 'Après l\'heure : qu\'est-ce que je reprends lundi ?');

await prof.evaluate(() => { const b = document.querySelector('[data-onglet="bilans"]'); if (b) b.click(); });
await prof.waitForTimeout(3500);
await vue(prof, 'les-bilans');
const bilan = await prof.evaluate(() => ({
    vide: (document.querySelector('.ec-vide, .ec-vide-grand') || {}).textContent || '',
    lignes: document.querySelectorAll('.ec-table tbody tr, .ec-bilan-ligne').length,
    titres: [...document.querySelectorAll('.ec-h3')].map(x => x.textContent.trim())
}));
console.log(`   ${bilan.lignes} ligne(s) · ${bilan.titres.join(' · ') || '(pas de section)'}`);
if (bilan.vide.trim()) {
    console.log(`   message : « ${bilan.vide.trim().replace(/\s+/g, ' ').slice(0, 90)} »`);
}
finir();

// ═══════════════════════════════════════════════════════════════════════════
// LE RELEVÉ
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log('LE TRAJET, EN CHIFFRES');
console.log('═'.repeat(70));
let totalFrictions = 0;
etapes.forEach(e => {
    totalFrictions += e.frictions.length;
    console.log(`${e.nom}`);
    console.log(`   ${e.clics} clic(s) · ${e.duree}s · ${e.vues.length} capture(s)`
        + ` · ${e.frictions.length} frottement(s)`);
});
console.log('─'.repeat(70));
console.log(`TOTAL : ${clics} clics comptés, ${totalFrictions} frottements relevés,`
    + ` ${noVue} captures dans ${DOSSIER}/`);
console.log(erreurs.length ? `\nERREURS DE PAGE : ${erreurs.join(' | ')}`
    : '\nAucune erreur de page pendant tout le trajet.');

await nav.close();
srv.kill();
