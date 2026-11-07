// LES DEUX JEUX DU 27 OCTOBRE, de bout en bout, aux trois largeurs.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/deuxJeux.mjs            1280 × 900 — l'ordinateur
//   node tools/deuxJeux.mjs --doigt     390 × 844 — le téléphone
//   node tools/deuxJeux.mjs --tablette  820 × 1180
//
// RÉMY n'a pas eu à répéter sa consigne du 26 : « que ça fonctionne sur ordi,
// tablette et téléphone ». Elle vaut pour tout ce qui s'ajoute.
//
// ET L'ON JOUE VRAIMENT, parce que c'est le seul moyen de savoir que la
// réponse envoyée et la réponse attendue s'écrivent pareil — exactement le
// défaut qui compterait faux un élève qui a raison.

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

const s = await ouvrirSonde(DOIGT ? { largeur: 390, hauteur: 844 }
    : TABLETTE ? { largeur: 820, hauteur: 1180 }
        : { largeur: 1280, hauteur: 900 });
await s.identifier();

// ── LES ALLUMETTES À DÉPLACER ───────────────────────────────────────────────
console.log('\nLES ALLUMETTES À DÉPLACER\n' + '─'.repeat(64));
{
    const avant = s.erreurs.length;
    await s.ouvrirExercice('logi-allumettes-egalite', {}, { questions: 2 });
    await dormir(1400);
    await s.doitExister('.ae-plateau', 'le plateau des allumettes');
    await s.photo('.ae-layout', `tools/tmp/jeu-allumettes-egalite${SUFFIXE}.png`, 12);

    const vu = await s.page.evaluate(() => {
        const dehors = document.documentElement.scrollWidth - window.innerWidth;
        const seg = [...document.querySelectorAll('.ae-seg')];
        const zones = seg.map(e => e.getBoundingClientRect())
            .filter(r => r.width > 0);
        const petites = zones.filter(r => r.width < 26 || r.height < 26).length;
        const btns = [...document.querySelectorAll('.ae-btn')]
            .map(b => b.getBoundingClientRect()).filter(r => r.height < 44).length;
        // DEUX ZONES QUI SE RECOUVRENT, c'est un doigt qui tombe sur la mauvaise.
        let chevauche = 0;
        for (let i = 0; i < zones.length; i++) {
            for (let j = i + 1; j < zones.length; j++) {
                const a = zones[i], b = zones[j];
                if (a.left < b.right - 1 && b.left < a.right - 1
                    && a.top < b.bottom - 1 && b.top < a.bottom - 1) chevauche++;
            }
        }
        const pleines = seg.filter(e => e.classList.contains('ae-seg--pleine')).length;
        return { dehors, petites, btns, chevauche, zones: zones.length, pleines,
            plusPetite: Math.round(Math.min(...zones.map(r => Math.min(r.width, r.height)))) };
    });
    dire('rien ne déborde en largeur', vu.dehors <= 0, `${vu.dehors} px`);
    dire('aucune zone d\'allumette ne se recouvre', vu.chevauche === 0,
        `${vu.chevauche} paire(s)`);
    dire('les zones restent touchables', vu.petites === 0,
        `${vu.zones} zones, la plus petite ${vu.plusPetite} px`);
    dire('les boutons font leurs 44 px', vu.btns === 0);
    dire('des allumettes sont posées', vu.pleines > 6, `${vu.pleines} allumettes`);

    // ON JOUE : on prend une allumette et on la repose ailleurs.
    const joue = await s.page.evaluate(() => {
        const pleine = document.querySelector('.ae-seg--pleine');
        pleine.click();
        const vide = document.querySelector('.ae-seg--vide');
        if (vide) vide.click();
        return {
            trou: !!document.querySelector('.ae-seg--trou'),
            posee: !!document.querySelector('.ae-seg--posee'),
            valider: !document.querySelector('[data-valider]').disabled,
            statut: (document.querySelector('.ae-statut') || {}).textContent || ''
        };
    });
    await dormir(250);
    dire('on prend une allumette et on la repose', joue.trou && joue.posee, joue.statut);
    dire('et « Valider » s\'allume seulement alors', joue.valider);

    // UNE RÉPARATION FAUSSE N'EST PAS COMPTÉE JUSTE.
    await s.cliquer('[data-valider]', 'le bouton « Valider »');
    await dormir(350);
    const apres = await s.page.evaluate(() => {
        const p = document.querySelector('.ae-plateau');
        return { ok: !!p && p.classList.contains('ae-plateau--ok'),
            statut: (document.querySelector('.ae-statut') || {}).textContent || '' };
    });
    dire('une égalité encore fausse n\'est pas comptée juste', !apres.ok, apres.statut);
    const neuves = s.erreurs.length - avant;
    dire('aucune erreur de page', neuves === 0,
        neuves ? s.erreurs.slice(-neuves).join(' · ') : '');
}

// ── LA TRAVERSÉE ────────────────────────────────────────────────────────────
console.log('\nLA TRAVERSÉE\n' + '─'.repeat(64));
{
    const avant = s.erreurs.length;
    await s.ouvrirExercice('logi-traversee', {}, { questions: 2 });
    await dormir(1400);
    await s.doitExister('.tv-scene', 'la scène de la traversée');
    await s.photo('.tv-layout', `tools/tmp/jeu-traversee${SUFFIXE}.png`, 12);

    const vu = await s.page.evaluate(() => {
        const dehors = document.documentElement.scrollWidth - window.innerWidth;
        const pions = [...document.querySelectorAll('.tv-pion')];
        const petits = pions.map(p => p.getBoundingClientRect())
            .filter(r => r.width < 44 || r.height < 44).length;
        const btns = [...document.querySelectorAll('.tv-btn')]
            .map(b => b.getBoundingClientRect()).filter(r => r.height < 44).length;
        return { dehors, pions: pions.length, petits, btns,
            gauche: document.querySelectorAll('.tv-rive--g .tv-pion').length,
            droite: document.querySelectorAll('.tv-rive--d .tv-pion').length };
    });
    dire('rien ne déborde en largeur', vu.dehors <= 0, `${vu.dehors} px`);
    dire('tout le monde est sur la rive de départ', vu.gauche > 1 && vu.droite === 0,
        `${vu.gauche} à gauche, ${vu.droite} à droite`);
    dire('les pastilles font leurs 44 px', vu.petits === 0, `${vu.petits} trop petite(s)`);
    dire('les boutons font leurs 44 px', vu.btns === 0);

    // ON EMBARQUE QUELQU'UN, PUIS ON TRAVERSE.
    const joue = await s.page.evaluate(() => {
        const pions = [...document.querySelectorAll('.tv-rive--g .tv-pion')];
        pions[0].click();
        return { barque: document.querySelectorAll('.tv-barque .tv-pion').length,
            traverser: !document.querySelector('[data-traverser]').disabled };
    });
    await dormir(200);
    dire('on monte dans la barque', joue.barque === 1);
    dire('et « Traverser » s\'allume alors', joue.traverser);
    await s.cliquer('[data-traverser]', 'le bouton « Traverser »');
    await dormir(400);
    const apres = await s.page.evaluate(() => ({
        riviere: !!document.querySelector('.tv-riviere--droite'),
        statut: (document.querySelector('.tv-statut') || {}).textContent || ''
    }));
    dire('la barque a changé de rive', apres.riviere, apres.statut);
    const neuves = s.erreurs.length - avant;
    dire('aucune erreur de page', neuves === 0,
        neuves ? s.erreurs.slice(-neuves).join(' · ') : '');
}

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives : ${s.fenetresNatives.length}`);
if (s.fenetresNatives.length) ratés++;
console.log(ratés ? rouge(`\n${ratés} mesure(s) manquée(s).`)
    : vert('\nLES DEUX JEUX S\'OUVRENT, SE JOUENT ET TIENNENT DANS L\'ÉCRAN.'));
await s.fermer();
process.exit(ratés ? 1 : 0);
