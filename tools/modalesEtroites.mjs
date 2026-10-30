// LES MODALES SONT-ELLES À L'ÉTROIT SUR UN ÉCRAN D'ORDINATEUR ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture du panneau de réglages à l'appui :
//
//   « sur le réglages des exercices c'est écrasé d'ailleurs pourquoi sur ordi
//     la fenetre des réglages et si étroite et sur ordi, parfois certains
//     modales sont étroites, c'est dommage »
//
// DEUX DEMANDES, ET LA SECONDE EST LA PLUS IMPORTANTE. « parfois certains
// modales » : ce n'est pas le défaut d'un panneau, c'est une habitude du
// logiciel. Réparer celui de sa capture et s'arrêter là, c'est se préparer à
// recevoir la même remarque le mois prochain — elle est d'ailleurs déjà venue
// une fois, sur « Mode & barème ».
//
// CE QUE CET OUTIL MESURE, ET POURQUOI CES TROIS NOMBRES-LÀ :
//
//   · LA LARGEUR DU PANNEAU contre celle de la fenêtre. Un panneau de 350 px
//     au milieu de 1440 n'est pas en soi un défaut — une confirmation d'une
//     phrase n'a pas besoin de plus. C'est le rapport AVEC ce qui suit qui
//     accuse.
//   · LE CONTENU QUI DÉBORDE : un enfant plus large que son panneau est coupé
//     ou force un défilement latéral.
//   · LES LIGNES CASSÉES : un texte court qui s'écrit sur trois lignes ou plus
//     dit que la colonne est trop étroite POUR CE QU'ON Y MET. C'est le signe
//     exact de sa capture — « COMMENT L'ÉLÈVE RÉPONDRA, SUR 7 QUESTIONS » sur
//     cinq lignes, « QUESTIONS 1 À 3 » sur deux.
//
//     node tools/modalesEtroites.mjs [largeur]
//
// ON MESURE LE BALISAGE RÉEL. Les modales de `index.html` portent déjà leur
// contenu : on les rend visibles une par une et l'on mesure ce que la feuille
// de style en fait. Celles qui se remplissent en JavaScript (les réglages d'un
// exercice) sont ouvertes pour de vrai, par leur propre fonction.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const LARGEUR = Math.max(900, Number(process.argv[2]) || 1440);

/**
 * Ce que le navigateur sait dire d'un panneau de modale VISIBLE.
 *
 * ON PART D'UN SÉLECTEUR : Playwright ne peut pas passer un nœud du navigateur
 * à une fonction qu'il y injecte.
 */
const MESURE = (sel) => {
    const panneau = document.querySelector(sel);
    if (!panneau) return { vide: true };
    const r = panneau.getBoundingClientRect();
    if (!r.width) return { vide: true };
    let deborde = 0;
    const casse = [];
    panneau.querySelectorAll('*').forEach(e => {
        const b = e.getBoundingClientRect();
        if (!b.width || !b.height) return;
        if (b.width > r.width + 2) deborde++;
        // UN TEXTE COURT SUR TROIS LIGNES OU PLUS : la colonne est trop étroite
        // pour ce qu'on y met. On ne regarde que les feuilles de l'arbre — un
        // conteneur « haut » n'est pas un texte cassé — et on laisse passer les
        // phrases longues, qui ont le droit d'occuper plusieurs lignes.
        if (e.children.length) return;
        const t = (e.textContent || '').trim();
        if (t.length < 8 || t.length > 58) return;
        const lh = parseFloat(getComputedStyle(e).lineHeight) || 20;
        const lignes = Math.round(b.height / lh);
        if (lignes >= 3) casse.push(`${lignes} lignes pour « ${t.slice(0, 42)} »`);
    });
    return {
        panneau: Math.round(r.width), haut: Math.round(r.height),
        fenetre: window.innerWidth, deborde, casse: casse.slice(0, 3)
    };
};

/** Rend une modale visible sans passer par son bouton, et la remet après. */
const MONTRER = (id) => {
    const m = document.getElementById(id);
    if (!m) return false;
    m.dataset.sondeAvant = m.style.display || '';
    m.style.display = 'flex';
    return true;
};
const CACHER = (id) => {
    const m = document.getElementById(id);
    if (m) m.style.display = m.dataset.sondeAvant || '';
};

const s = await ouvrirSonde({ largeur: LARGEUR, hauteur: 950 });
await s.identifier();

const lignes = [];
const dire = (nom, m) => {
    if (m.vide) { console.log(`  ?  ${nom} : rien à mesurer`); return; }
    const part = Math.round((m.panneau / m.fenetre) * 100);
    const souci = m.deborde > 0 || m.casse.length > 0;
    console.log(`  ${souci ? '\x1b[33m!\x1b[0m' : 'ok'}  ${nom.padEnd(26)} `
        + `${String(m.panneau).padStart(4)} px (${String(part).padStart(2)} % de la fenêtre)`
        + `${m.deborde ? `  · ${m.deborde} enfant(s) débordent` : ''}`);
    m.casse.forEach(c => console.log(`         \x1b[33m${c}\x1b[0m`));
    lignes.push({ nom, ...m, souci });
};

// ── 1. CELLES QUI PORTENT DÉJÀ LEUR CONTENU DANS `index.html` ───────────────
console.log(`\n── les modales du balisage, fenêtre de ${LARGEUR} px`);
const STATIQUES = await s.page.evaluate(() =>
    [...document.querySelectorAll('.modal-overlay')].map(m => m.id).filter(Boolean));
for (const id of STATIQUES) {
    if (id === 'student-config-modal') continue;   // mesurée pour de vrai plus bas
    const ok = await s.page.evaluate(MONTRER, id);
    if (!ok) continue;
    await dormir(140);
    const m = await s.page.evaluate(MESURE, `#${id} > div`);
    dire(id, m);
    await s.page.evaluate(CACHER, id);
}

// ── 2. CELLE DE SA CAPTURE, OUVERTE PAR SA PROPRE FONCTION ──────────────────
//
// Elle se remplit en JavaScript : rendue visible à la main, elle serait vide,
// et l'on mesurerait un panneau sans rien dedans — c'est-à-dire rien.
console.log(`\n── les réglages d'un exercice, ouverts pour de vrai`);
for (const [id, role] of [['mes-duree', 'auteur'], ['mes-duree', 'eleve'],
    ['calc-add', 'auteur']]) {
    await s.page.evaluate(async ([exoId, r]) => {
        const cfg = await import('/js/games/configUI.js');
        const { getExerciseById } = await import('/js/data/catalog.js');
        cfg.ouvrirReglagesAvantPartie(getExerciseById(exoId), () => {}, { role: r });
    }, [id, role]);
    await dormir(1700);
    const m = await s.page.evaluate(MESURE, '#student-config-modal .modal-panel-sm-left');
    dire(`${id} (${role})`, m);
    await s.page.evaluate(() => {
        const m2 = document.getElementById('student-config-modal');
        if (m2) m2.style.display = 'none';
    });
}

const soucis = lignes.filter(l => l.souci);
console.log(soucis.length
    ? `\n\x1b[33m${soucis.length} panneau(x) à l'étroit\x1b[0m : `
        + soucis.map(l => l.nom).join(', ')
    : '\n\x1b[32mAucun panneau à l\'étroit.\x1b[0m');
console.log('erreurs de page :', s.erreurs.length,
    '· fenêtres natives :', s.fenetresNatives.length);
if (s.erreurs.length) console.log(s.erreurs.slice(0, 3));
await s.fermer();
