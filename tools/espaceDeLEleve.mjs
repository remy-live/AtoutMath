// L'ESPACE DE L'ÉLÈVE, MESURÉ — ses onglets, ses rubriques, et ses boutons.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/espaceDeLEleve.mjs
//
// DEUX QUESTIONS DE RÉMY, et la seconde est encore ouverte :
//
//   « Dans ce que tu dois réviser, tu peux mettre un bouton Tout réviser. »
//   « Que penses-tu de l'espace élève, y a-t-il trop de rubrique ? Est-ce trop
//     ou pas assez détaillé ? »
//
// On ne répond pas à la seconde par un avis : on compte. Combien d'onglets,
// combien de rubriques derrière chacun, combien de pixels à faire défiler,
// combien de boutons sur un même écran — et lesquels RESSEMBLENT à des boutons.
//
// ── POURQUOI ON FABRIQUE UN PASSÉ ──────────────────────────────────────────
//
// Sans une seule tentative au journal, cet espace affiche partout « Fais
// quelques exercices » : on mesurerait des écrans vides, c'est-à-dire pas
// l'espace de l'élève de Rémy. On rate donc cinq notions et l'on en réussit
// deux — un élève de novembre.
//
// ET LES BADGES GAGNÉS SE POSENT DEVANT. Huit bonnes réponses d'affilée, et
// « Sans Faute — Bronze » recouvre le panneau avec son fond flouté : la photo
// mesurait un verre dépoli. Le logiciel a raison, la sonde doit refermer —
// comme l'élève le ferait.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const gris = (t) => `\x1b[90m${t}\x1b[0m`;
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

const s = await ouvrirSonde({ largeur: 1100, hauteur: 1000 });
await s.identifier();

const passe = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { SKILLS } = await import('./js/data/skills.js');
    const ids = Object.keys(SKILLS);
    for (const id of ids.slice(0, 5)) {
        for (let i = 0; i < 8; i++) {
            state.recordAttempt({ correct: i % 4 === 0, skillId: id, attemptIndex: 0,
                questionText: `q${i}`, given: 'x', expected: 'y' });
        }
    }
    for (const id of ids.slice(5, 7)) {
        for (let i = 0; i < 8; i++) state.recordAttempt({ correct: true, skillId: id, attemptIndex: 0 });
    }
    return { notionsDuCatalogue: ids.length };
});
await dormir(500);

await s.cliquer('#mob-btn-profile', 'l\'espace élève');
await dormir(900);
await s.doitExister('[data-panneau="reviser"]', 'le panneau « Ce que tu dois réviser »');

// On referme la fenêtre des badges, qui vient de nos tentatives.
await s.page.evaluate(() => {
    [...document.querySelectorAll('button')]
        .filter(b => b.offsetParent && /Super/.test(b.textContent || ''))
        .forEach(b => b.click());
});
await dormir(700);

// ── 1. COMBIEN DE RUBRIQUES ─────────────────────────────────────────────────

console.log('\nL\'ESPACE ÉLÈVE, EN NOMBRES\n' + '─'.repeat(64));

const plan = await s.page.evaluate(() => {
    const onglets = [...document.querySelectorAll('.prof-onglet-btn')].map(b => ({
        nom: (b.querySelector('.prof-onglet-nom') || {}).textContent || '',
        compte: ((b.querySelector('.prof-onglet-compte') || {}).textContent || '').trim()
    }));
    const panneaux = [...document.querySelectorAll('.prof-panneau')].map(p => {
        const etait = p.hidden;
        p.hidden = false;                       // pour le mesurer, puis on remet
        const m = {
            onglet: p.dataset.panneau,
            titres: [...p.querySelectorAll('.section-title, .skill-group-title')]
                .map(t => (t.textContent || '').trim()),
            hauteur: Math.round(p.getBoundingClientRect().height),
            boutons: [...p.querySelectorAll('button')].length
        };
        p.hidden = etait;
        return m;
    });
    return { onglets, panneaux };
});

for (const o of plan.onglets) console.log(gris(`  onglet « ${o.nom} » ${o.compte}`));
for (const p of plan.panneaux) {
    console.log(gris(`  « ${p.onglet} » : ${p.titres.length} rubrique(s), ${p.boutons} bouton(s),`
        + ` ${p.hauteur} px de haut`));
    if (p.titres.length) console.log(gris(`      ${p.titres.join(' · ')}`));
}
console.log(gris(`  (${passe.notionsDuCatalogue} notions au catalogue)`));

// ── 2. CE QUE TU DOIS RÉVISER ───────────────────────────────────────────────

console.log('\n« CE QUE TU DOIS RÉVISER »\n' + '─'.repeat(64));

const r = await s.page.evaluate(async () => {
    const { getRecommendations } = await import('./js/core/stats.js');
    const panneau = document.querySelector('[data-panneau="reviser"]');
    const b = document.getElementById('btn-seance-conseillee');
    const st = b ? getComputedStyle(b) : null;
    const rb = b ? b.getBoundingClientRect() : null;
    const carte = panneau.querySelector('.plan-btn');
    const rc = carte ? carte.getBoundingClientRect() : null;
    return {
        cartes: panneau.querySelectorAll('.plan-card').length,
        titres: [...panneau.querySelectorAll('.plan-titre')].map(e => e.textContent.trim()),
        recommandeesEnTout: getRecommendations({ limit: 999 }).length,
        haut: b ? {
            texte: (b.textContent || '').trim(),
            visible: !!b.offsetParent,
            taille: `${Math.round(rb.width)}×${Math.round(rb.height)}`,
            fond: st.backgroundColor, bordure: st.borderColor
        } : null,
        surLaCarte: rc ? `${Math.round(rc.width)}×${Math.round(rc.height)}` : null
    };
});

console.log(gris(`  ${r.cartes} carte(s) montrée(s) sur ${r.recommandeesEnTout} notions recommandées`));
console.log(gris(`  ${r.titres.join(' · ')}`));
dire('le bouton du haut dit « Tout réviser », et combien',
    /Tout réviser/.test(r.haut.texte) && /\d/.test(r.haut.texte), r.haut.texte);
// UN BOUTON QU'ON NE VOIT PAS N'EST PAS UN BOUTON. C'est la vraie cause de la
// demande de Rémy : fond transparent, bordure transparente, texte gris.
dire('il a un fond et une bordure — il RESSEMBLE à un bouton',
    r.haut.fond !== 'rgba(0, 0, 0, 0)' && r.haut.bordure !== 'rgba(0, 0, 0, 0)',
    `${r.haut.taille}, fond ${r.haut.fond}, bordure ${r.haut.bordure}`
    + ` · à côté : ${r.surLaCarte}`);
const c = await s.contrasteRendu('#btn-seance-conseillee');
dire('et on le lit', c && c.contraste >= 4.5, c ? `contraste ${c.contraste.toFixed(2)}` : 'illisible');

console.log(await s.photo('[data-panneau="reviser"]', 'tools/tmp/espace-reviser.png', 0));

// ── 3. ET IL LANCE CE QU'IL MONTRE ──────────────────────────────────────────

console.log('\nLE GESTE\n' + '─'.repeat(64));

await s.cliquer('#btn-seance-conseillee', 'le bouton « Tout réviser »');
await dormir(1300);
// LE RUNNER NE POSE PAS SON PARCOURS DANS `state.currentPath` — celui-là est la
// séance DU PROFESSEUR, et une première version de cette sonde y mesurait un
// parcours vide en croyant mesurer la révision. On regarde l'ÉCRAN.
const ecran = await s.page.evaluate(() => {
    const couche = document.getElementById('game-layer');
    return {
        ouverte: !!(couche && getComputedStyle(couche).display !== 'none'),
        texte: couche ? (couche.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120) : ''
    };
});
dire('la révision démarre', ecran.ouverte);
dire(`elle enchaîne les ${r.cartes} notions montrées`,
    new RegExp(`Étape 1 sur ${r.cartes}`).test(ecran.texte), ecran.texte);
dire('et elle porte le mot de l\'élève, pas « séance »',
    /Ce que je dois réviser/.test(ecran.texte) && !/Séance conseillée/.test(ecran.texte));

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
console.log(ratés === 0 ? vert('\nTOUT RÉVISER FAIT CE QU\'IL DIT.')
    : rouge(`\n${ratés} mesure(s) manquée(s).`));
await s.fermer();
process.exit(ratés === 0 ? 0 : 1);
