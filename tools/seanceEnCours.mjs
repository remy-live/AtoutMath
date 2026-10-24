// « CE PARCOURS EST UNE SÉANCE EN COURS » — le badge le dit-il ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « comment complète-t-on une séance en cours du coup ? »
//
// On la complète dans Préparer, en ajoutant un exercice à la fin du parcours —
// et depuis que la séance de l'élève se relit, l'ajout lui arrive vraiment,
// même à ceux qui ont commencé. Mais rien, dans cet écran, ne disait que ce
// parcours-là était en cours chez une classe. Une possibilité qu'il faut
// deviner n'est pas offerte : il a dû poser la question.
//
// CE QUE SEULE UNE SONDE PEUT DIRE : que le badge est VISIBLE (89 px de large,
// pas zéro), qu'il nomme la bonne classe, et qu'il arrive au bon moment —
// après une requête au serveur, donc après l'ouverture du parcours. L'épreuve
// `tests/seanceEnCours.test.mjs` garde le câblage ; elle ne verrait pas un
// badge resté à zéro pixel, ni un badge arrivé trop tard.
//
// DEUX PIÈGES DE CET ÉCRAN, payés ici : un panneau d'accueil le couvre la
// première fois (« J'ai compris »), et la liste des parcours vit sous l'onglet
// « Mes parcours » — pas sous « Exercices », qui est ouvert par défaut. Ma
// première version cliquait dans le catalogue et concluait que le badge ne
// s'affichait pas. C'est la photo qui l'a dit.
//
//   node tools/seanceEnCours.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
await dormir(900);

// Un parcours donné à 6e B, par les modules de l'application.
const fait = await s.page.evaluate(async () => {
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const { state } = await import('./js/core/state.js');
    const liste = await mesClasses();
    const c = (Array.isArray(liste) ? liste : []).find((x) => /6e B/.test(x.name || ''));
    const p = { id: 'badge-essai', name: 'Séance du lundi',
        version: 2,
        steps: [{ stepId: 's0', exerciseId: 'calc-add', overrides: {}, nbItems: 4, threshold: 3 }] };
    const saved = state.saveTeacherPath(p.name, p);
    p.id = saved.id;
    const r = await donnerAuServeur(p, c.id);
    return { classe: c.name, donne: !r.erreur, erreur: r.erreur || '', id: saved.id };
});
console.log('parcours donné : ' + JSON.stringify(fait));

// On ouvre Préparer, puis le parcours, comme Rémy.
await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a')]
        .find((x) => /^préparer$/i.test((x.textContent || '').trim()));
    if (b) b.click();
});
await dormir(1500);

// L'ÉCRAN D'ACCUEIL DE PRÉPARER COUVRE LE RESTE la première fois, et la liste
// des parcours vit sous l'onglet « Mes parcours » — pas sous « Exercices »,
// qui est ouvert par défaut. Ma première sonde cliquait dans le catalogue et
// concluait que le badge ne s'affichait pas. C'est la PHOTO qui l'a dit.
await s.page.evaluate(() => {
    const ok = [...document.querySelectorAll('button')]
        .find((x) => /j'ai compris/i.test((x.textContent || '').trim()));
    if (ok) ok.click();
    const onglet = [...document.querySelectorAll('button, [role="tab"]')]
        .find((x) => /^mes parcours$/i.test((x.textContent || '').trim()));
    if (onglet) onglet.click();
});
await dormir(1500);
const ouvert = await s.page.evaluate((id) => {
    const l = [...document.querySelectorAll('*')].find((e) => e.children.length === 0
        && /^Séance du lundi$/.test((e.textContent || '').trim()));
    if (!l) return false;
    (l.closest('[data-parcours], li, .card, article, tr') || l).click();
    return true;
}, fait.id);
console.log('parcours ouvert : ' + ouvert);
await dormir(2500);

const badge = await s.page.evaluate(() => {
    const el = document.getElementById('path-donne');
    if (!el) return { existe: false };
    const r = el.getBoundingClientRect();
    return { existe: true, cache: el.hidden, texte: (el.textContent || '').trim(),
             largeur: Math.round(r.width), bulle: (el.title || '').slice(0, 240) };
});
console.log('\nbadge : ' + JSON.stringify(badge, null, 2));
console.log(badge.existe && !badge.cache && badge.largeur > 0 && /6e B/.test(badge.texte)
    ? '\x1b[32m→ LE BADGE DIT À QUI CETTE SÉANCE EST DONNÉE.\x1b[0m'
    : '\x1b[31m→ RIEN NE DIT QUE CE PARCOURS EST UNE SÉANCE EN COURS.\x1b[0m');

await s.photo('.path-bandeau', 'tools/tmp/badge-donne.png', 0);
console.log('\nerreurs : ' + s.erreurs.length + ' · natives : ' + s.fenetresNatives.length);
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
await s.fermer();
