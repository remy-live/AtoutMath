// LES SIX JEUX DE LA NUIT, de bout en bout, sur ordinateur ET au doigt.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/sixJeux.mjs            1280 × 900 — l'ordinateur
//   node tools/sixJeux.mjs --doigt     390 × 844 — le téléphone
//   node tools/sixJeux.mjs --tablette  820 × 1180
//
// RÉMY, 26 octobre : « tu me les fais tous, avec des grilles faciles, que ça
// fonctionne sur ordi, tablette et téléphone ».
//
// LES TROIS LARGEURS SONT DANS SA PHRASE, donc dans cet outil. 390 × 844 est
// la plus dure : la grille, la palette, les boutons et l'avis doivent tenir
// sans défilement horizontal, et chaque chose à toucher doit faire ses
// quarante-quatre pixels.
//
// ET L'ON JOUE VRAIMENT. Remplir la grille par la solution puis valider est le
// seul moyen de savoir que la réponse attendue et celle qu'on envoie
// s'écrivent de la même façon — c'est exactement le défaut qui ferait compter
// faux un élève qui a raison.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const ARGS = process.argv.slice(2);
const DOIGT = ARGS.includes('--doigt');
const TABLETTE = ARGS.includes('--tablette');
const SUFFIXE = DOIGT ? '-doigt' : TABLETTE ? '-tablette' : '';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

/** Les cinq grilles, et la partie. */
const JEUX = [
    { id: 'logi-kakuro', nom: 'Kakuro', grille: true },
    { id: 'logi-yohaku', nom: 'Yohaku', grille: true },
    { id: 'logi-suguru', nom: 'Suguru', grille: true },
    { id: 'logi-gratte-ciel', nom: 'Gratte-ciel', grille: true },
    { id: 'logi-chemin-nombres', nom: 'Chemin des Nombres', grille: true },
    { id: 'logi-allumettes', nom: 'Allumettes', grille: false }
];

const s = await ouvrirSonde(DOIGT ? { largeur: 390, hauteur: 844 }
    : TABLETTE ? { largeur: 820, hauteur: 1180 }
        : { largeur: 1280, hauteur: 900 });
await s.identifier();

for (const jeu of JEUX) {
    console.log(`\n${jeu.nom.toUpperCase()}\n` + '─'.repeat(64));
    const avant = s.erreurs.length;
    await s.ouvrirExercice(jeu.id, {}, { questions: 2 });
    await dormir(1400);

    // ── CE QUI DOIT TENIR DANS L'ÉCRAN ─────────────────────────────────────
    const tient = await s.page.evaluate(() => {
        const dehors = document.documentElement.scrollWidth - window.innerWidth;
        const petits = [...document.querySelectorAll(
            '.gn-jeton, .gn-btn, .al-prise, button[data-prendre]')]
            .map(b => b.getBoundingClientRect())
            .filter(r => r.width && (r.width < 40 || r.height < 40)).length;
        const bas = [...document.querySelectorAll('.gn-actions, .al-boutons')]
            .map(e => Math.round(e.getBoundingClientRect().bottom - window.innerHeight));
        return { dehors, petits, bas };
    });
    dire('rien ne déborde en largeur', tient.dehors <= 0, `${tient.dehors} px`);
    dire('aucune cible sous les 44 px', tient.petits === 0, `${tient.petits} trop petite(s)`);
    if (tient.bas.length) {
        dire('les boutons sont dans l\'écran', tient.bas.every(v => v <= 0),
            `${tient.bas.join(' · ')} px sous le pli`);
    }

    if (jeu.grille) {
        await s.doitExister('.gn-board', `le plateau de ${jeu.nom}`);
        const plan = await s.page.evaluate(() => ({
            cases: document.querySelectorAll('.gn-cell[data-r]').length,
            donnees: document.querySelectorAll('.gn-cell--donnee').length,
            murs: document.querySelectorAll('.gn-cell--mur, .gn-cell--indice').length,
            marges: document.querySelectorAll('.gn-marge').length,
            champs: document.querySelectorAll('.gn-cell input.kk-champ').length,
            statut: (document.querySelector('.gn-statut') || {}).textContent || '',
            carre: (() => {
                const c = document.querySelector('.gn-cell');
                const r = c.getBoundingClientRect();
                return Math.abs(r.width - r.height) < 1.5;
            })()
        }));
        dire('les cases sont CARRÉES', plan.carre);
        dire('il y a des cases à remplir', plan.champs > 0,
            `${plan.champs} champ(s), ${plan.donnees} donnée(s), ${plan.murs} noire(s), `
            + `${plan.marges} marge(s)`);
        console.log(gris(`        ${plan.statut}`));

        // LA PHOTO SE PREND AVANT DE JOUER : après une validation ratée, c'est
        // le voile de correction qu'on photographie, pas le jeu. Vu une fois,
        // sur le Kakuro.
        await s.photo('.gn-layout', `tools/tmp/jeu-${jeu.id}${SUFFIXE}.png`, 12);

        // ── ON ÉCRIT DANS LA GRILLE, PAR LE CHEMIN DE L'ÉLÈVE ──────────────
        //
        // On ne cherche PAS à résoudre : la solution n'est pas dans la page,
        // et elle ne doit pas y être — un élève curieux lirait le code source.
        // Ce qu'on mesure ici, c'est la CHAÎNE DE SAISIE : taper dans un champ
        // écrit-il bien dans la grille, et le bouton compte-t-il ce qui reste ?
        // Que la bonne réponse soit comptée juste se mesure ailleurs, sans
        // navigateur (`tests/sixJeux.test.mjs`), où l'on a la solution en main.
        const saisie = await s.page.evaluate(() => {
            const champs = [...document.querySelectorAll('.gn-cell input.kk-champ')];
            champs.forEach((ch, i) => {
                ch.value = String((i % 9) + 1);
                ch.dispatchEvent(new Event('input', { bubbles: true }));
            });
            return {
                remplis: champs.filter(c => c.value).length,
                statut: (document.querySelector('.gn-statut') || {}).textContent || ''
            };
        });
        await dormir(250);
        dire('ce qu\'on tape arrive dans la grille',
            /compl[eè]te/i.test(saisie.statut) || /reste/i.test(saisie.statut),
            saisie.statut);

        // ET UNE GRILLE COMPLÈTE MAIS FAUSSE EST REFUSÉE — sans quoi « Valider »
        // ne voudrait rien dire.
        await s.cliquer('[data-valider]', 'le bouton « Valider »');
        await dormir(320);
        // LE SIGNE DU VERDICT EST LA CLASSE DU PLATEAU, pas la phrase d'état.
        //
        // Premier jet : on lisait l'avis sous la grille, qui dit encore « la
        // grille est complète » — c'est vrai, et cela ne dit rien du verdict.
        // Trois jeux sur six annonçaient un défaut qui n'existait pas.
        const apres = await s.page.evaluate(() => {
            const b = document.querySelector('.gn-board');
            return {
                ok: !!b && b.classList.contains('gn-board--ok'),
                reste: (document.querySelector('.gn-statut') || {}).textContent || ''
            };
        });
        dire('une grille fausse n\'est pas comptée juste', !apres.ok, apres.reste);
    } else {
        await s.doitExister('.al-tas', 'le tas d\'allumettes');
        const vu = await s.page.evaluate(() => ({
            nombre: Number((document.querySelector('.al-nombre') || {}).textContent),
            batons: document.querySelectorAll('.al-baton').length,
            boutons: document.querySelectorAll('[data-prendre]').length
        }));
        dire('le tas est dessiné', vu.batons === vu.nombre && vu.nombre > 0,
            `${vu.batons} bâton(s) pour ${vu.nombre} annoncée(s)`);
        dire('trois boutons pour retirer', vu.boutons === 3);
        dire('et le tas n\'est pas un multiple de 4', vu.nombre % 4 !== 0,
            `${vu.nombre} % 4 = ${vu.nombre % 4}`);
    }

    if (!jeu.grille) {
        await s.photo('.al-layout', `tools/tmp/jeu-${jeu.id}${SUFFIXE}.png`, 12);
    }
    const neuves = s.erreurs.length - avant;
    dire('aucune erreur de page', neuves === 0,
        neuves ? s.erreurs.slice(-neuves).join(' · ') : '');
}

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives : ${s.fenetresNatives.length}`);
if (s.fenetresNatives.length) ratés++;
console.log(ratés ? rouge(`\n${ratés} mesure(s) manquée(s).`)
    : vert('\nLES SIX JEUX S\'OUVRENT ET TIENNENT DANS L\'ÉCRAN.'));
await s.fermer();
process.exit(ratés ? 1 : 0);
