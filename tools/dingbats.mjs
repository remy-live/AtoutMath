// LES DINGBATS, VUS DANS UN NAVIGATEUR — et toutes les scènes photographiées.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerais bien un jeu de dingbats, idéalement dans le thème
// mathématique mais dans les réglages on peut avoir le choix. Une centaine
// serait bien. Classe aussi par niveau. »
//
// ── CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE ────────────────────────────────
//
// `tests/dingbat.test.mjs` vérifie que chaque énigme se dessine et que son
// dessin porte du TEXTE. Il ne peut pas dire qu'on le VOIT : un mot peut sortir
// du cadre, deux mots se chevaucher, une forme écraser ce qu'elle contient, un
// `transform` ne pas s'appliquer. Toutes ces fautes rendent une scène illisible
// sans toucher une seule balise.
//
// CETTE SONDE MESURE DONC DES PIXELS : pour chaque disposition, elle ouvre
// l'énigme et vérifie que tout ce qui est écrit tient DANS le cadre et que rien
// ne se recouvre. Et elle photographie tout, parce que la dernière chose qui
// juge un dingbat est un œil — celui de Rémy.
//
//   node tools/dingbats.mjs            # une énigme par disposition
//   node tools/dingbats.mjs --toutes   # les 109, photographiées
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
import { DINGBATS } from '../js/data/dingbats.js';
import { DISPOSITIONS } from '../js/core/dingbat.js';

const TOUTES = process.argv.includes('--toutes');

// UNE PAR DISPOSITION SUFFIT POUR LE RENDU : ce qui casse, c'est une
// disposition, pas une énigme. Les 109 se photographient à la demande.
const LOT = TOUTES ? DINGBATS : Object.keys(DISPOSITIONS)
    .map(f => DINGBATS.find(d => d.forme === f))
    .filter(Boolean);

const s = await ouvrirSonde({ largeur: 1100, hauteur: 950 });
await s.identifier();
await s.ouvrirExercice('voc-dingbats');
await dormir(1500);
await s.doitExister('.dg-cadre', 'la scène du dingbat');
await s.doitExister('#dg-champ', 'le champ de réponse');

let manques = 0;
console.log(`\n${LOT.length} énigme(s) à regarder`);
console.log('─'.repeat(78));

for (const d of LOT) {
    // ON POSE LA SCÈNE DIRECTEMENT, sans jouer la série : jouer cent questions
    // prendrait un quart d'heure et ne mesurerait rien de plus. Le dessin vient
    // du même `dessiner()` que l'exercice — c'est bien lui qu'on regarde.
    const vu = await s.page.evaluate(async (id) => {
        const { DINGBATS } = await import('./js/data/dingbats.js');
        const { dessiner } = await import('./js/core/dingbat.js');
        const dg = DINGBATS.find(x => x.id === id);
        const cadre = document.querySelector('.dg-cadre');
        cadre.innerHTML = dessiner(dg);
        // On laisse le navigateur poser la mise en page avant de mesurer.
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const boite = cadre.getBoundingClientRect();
        const mots = [...cadre.querySelectorAll('.dg-mot, .dg-autour-h, .dg-autour-v')];
        const rects = mots.map(m => m.getBoundingClientRect());
        // CE QUI DÉBORDE DU CADRE NE SE LIT PAS. Deux pixels de marge : les
        // arrondis de rendu ne doivent pas faire crier au défaut.
        const dehors = rects.filter(r => r.width > 0 && (
            r.left < boite.left - 2 || r.right > boite.right + 2
            || r.top < boite.top - 2 || r.bottom > boite.bottom + 2)).length;
        // CE QUI SE RECOUVRE NE SE LIT PAS NON PLUS. On ne compare que les mots
        // entre eux : une forme qui contient un mot, c'est l'énigme elle-même.
        let collisions = 0;
        for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
                const a = rects[i], b = rects[j];
                const chevauche = a.left < b.right - 4 && b.left < a.right - 4
                    && a.top < b.bottom - 4 && b.top < a.bottom - 4;
                if (chevauche) collisions++;
            }
        }
        return {
            mots: mots.length,
            texte: (cadre.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 44),
            dehors, collisions,
            hauteur: Math.round(boite.height)
        };
    }, d.id);

    const ok = vu.mots > 0 && vu.dehors === 0 && vu.collisions === 0;
    if (!ok) manques++;
    const marque = ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m';
    console.log(`  ${marque} ${d.forme.padEnd(12)} ${d.id.padEnd(26)} `
        + `« ${vu.texte} »${vu.dehors ? `  ${vu.dehors} DEHORS` : ''}`
        + `${vu.collisions ? `  ${vu.collisions} SE RECOUVRENT` : ''}`);

    if (TOUTES || !ok) await s.photo('.dg-cadre', `tools/tmp/dingbats/${d.id}.png`);
}

// ── ET L'ÉCRAN RÉPOND-IL ? ─────────────────────────────────────────────────
//
// Le rendu ne fait pas l'exercice : il faut que la réponse soit acceptée, et
// que la mauvaise soit refusée. On le mesure par le chemin de l'élève — on
// tape, on valide.
console.log('─'.repeat(78));
await s.ouvrirExercice('voc-dingbats');
await dormir(1400);
const attendue = await s.page.evaluate(() =>
    window.__sondeRunner.session.item.answer);
await s.page.fill('#dg-champ', 'une réponse qui ne va pas');
await s.page.click('[data-valider]');
await dormir(1300);
const apresFaux = await s.page.evaluate(() => ({
    banniere: !!document.querySelector('.fb-card'),
    champKo: !!document.querySelector('.dg-champ--ko')
}));
console.log(`  ${apresFaux.banniere ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} `
    + `une mauvaise réponse est refusée${apresFaux.banniere ? '' : ' — RIEN NE SE PASSE'}`);
if (!apresFaux.banniere) manques++;

const fermer = await s.page.$('.fb-close');
if (fermer) { await fermer.click(); await dormir(900); }

// ON NE MESURE PAS UNE BONNE RÉPONSE PAR SA BANNIÈRE, et ma première version le
// faisait : la bannière de RÉUSSITE est ÉPHÉMÈRE — `showSuccess` la referme
// après 1 200 ms —, alors que celle d'erreur attend qu'on la ferme. En
// regardant 1 300 ms plus tard, je cherchais une carte déjà partie et je
// concluais que la bonne réponse était refusée. La sonde accusait le logiciel
// d'un défaut qui était dans la mesure.
//
// CE QUI PROUVE QU'ELLE A ÉTÉ ACCEPTÉE, c'est que la QUESTION A CHANGÉ : la
// réussite enchaîne, l'échec non. On attend donc ce changement.
const avant = await s.page.evaluate(() =>
    window.__sondeRunner.session.item.meta.dingbat.id);
await s.page.fill('#dg-champ', String(attendue));
await s.page.click('[data-valider]');
let apresJuste = false;
for (let k = 0; k < 24 && !apresJuste; k++) {
    await dormir(250);
    apresJuste = await s.page.evaluate((a) => {
        const it = window.__sondeRunner && window.__sondeRunner.session.item;
        return !!(it && it.meta.dingbat && it.meta.dingbat.id !== a);
    }, avant);
}
console.log(`  ${apresJuste ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} `
    + `la bonne réponse « ${attendue} » est acceptée, et la série avance`);
if (!apresJuste) manques++;

console.log('\n' + '─'.repeat(78));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre\x1b[0m`
    : '\x1b[32mTOUTES LES SCÈNES TIENNENT DANS LEUR CADRE, ET L\'ÉCRAN RÉPOND.\x1b[0m');
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(x => console.log(`  ${x}`));
await s.fermer();
