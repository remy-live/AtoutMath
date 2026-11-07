#!/usr/bin/env node
// LE MENU DU NAVIGATEUR S'OUVRE-T-IL PAR-DESSUS UN EXERCICE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour le météorites mathématiques quand on clique hors de la zone (le
// cercle en pointillés), ca montre le menu contextuel ».
//
// CE QU'ON NE PEUT PAS MESURER, ET CE QU'ON MESURE À LA PLACE. Playwright ne
// voit pas le menu du système : il est dessiné par le navigateur, hors de la
// page. Mais le menu ne s'ouvre QUE si l'événement `contextmenu` n'a pas été
// annulé — c'est la seule chose qui le décide, et elle, on la lit. On envoie
// donc un vrai `contextmenu` à l'endroit où Rémy appuie, et l'on regarde
// `defaultPrevented`.
//
//   `defaultPrevented: false` → le menu s'ouvre, l'élève perd son exercice.
//   `defaultPrevented: true`  → quelqu'un l'a avalé.
//
// ON LE DEMANDE AUSSI AUX AUTRES JEUX. Le défaut n'a aucune raison d'être
// propre aux Météorites : tout jeu où l'on glisse le doigt sur une grande
// surface le porte. Sans la liste, on corrige un jeu et l'on en laisse vingt.
//
//   node tools/leMenuDuNavigateur.mjs                  (la liste par défaut)
//   node tools/leMenuDuNavigateur.mjs calc-arcade-shooter geo-tangram
//
// Il rend 1 dès qu'un exercice laisse passer le menu.

import { ouvrirSonde } from './sonde.mjs';

// LES JEUX QU'ON INTERROGE PAR DÉFAUT : une grande surface où l'on vise, où
// l'on glisse ou où l'on trace — c'est là que le doigt s'attarde, et c'est
// l'appui long qui ouvre le menu sur une tablette.
const PAR_DEFAUT = [
    'calc-arcade-shooter',   // Météorites : celui que Rémy a vu
    'calc-serpent',          // on glisse pour diriger
    'calc-labyrinthe',       // on glisse sur une grille
    'geo-tangram'            // on fait glisser des pièces
];

const demandes = process.argv.slice(2).filter(a => !a.startsWith('--'));
const liste = demandes.length ? demandes : PAR_DEFAUT;

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
const verdicts = [];
try {
    await s.identifier();

    for (const id of liste) {
        let ligne = { id, ouvert: false, avale: null, ou: '' };
        try {
            await s.ouvrirExercice(id);
            // On attend que QUELQUE CHOSE du jeu soit là : chaque jeu a son
            // propre plateau, et deviner son nom de classe, c'est la friction
            // que `doitExister` ferme. On vise donc le conteneur commun.
            await s.doitExister('#game-board', 'le plateau du jeu doit être monté');
            ligne.ouvert = true;

            // ON APPUIE OÙ RÉMY APPUIE : dans le plateau, mais LOIN du centre
            // — c'est-à-dire hors du cercle en pointillés des Météorites, qui
            // est centré sur le vaisseau.
            const resultat = await s.page.evaluate(() => {
                const plateau = document.getElementById('game-board');
                const r = plateau.getBoundingClientRect();
                // Un coin, à vingt pixels du bord : aussi loin du centre que
                // possible tout en restant dans le jeu.
                const x = r.left + 20, y = r.top + 20;
                const cible = document.elementFromPoint(x, y) || plateau;
                const ev = new MouseEvent('contextmenu', {
                    bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2
                });
                cible.dispatchEvent(ev);
                return {
                    avale: ev.defaultPrevented,
                    ou: cible.className || cible.tagName || '?'
                };
            });
            ligne.avale = resultat.avale;
            ligne.ou = String(resultat.ou).slice(0, 40);

            // ET L'EXCEPTION, SUR LE MÊME ÉCRAN : un champ de saisie GARDE son
            // menu. C'est la moitié qu'on casse en corrigeant l'autre — un
            // élève qui tape une rédaction doit pouvoir copier et coller.
            ligne.saisie = await s.page.evaluate(() => {
                const champ = document.querySelector('#game-layer input, #game-layer textarea');
                if (!champ) return null;
                const ev = new MouseEvent('contextmenu',
                    { bubbles: true, cancelable: true, button: 2 });
                champ.dispatchEvent(ev);
                return !ev.defaultPrevented;
            });
        } catch (e) {
            ligne.erreur = String(e.message).split('\n')[0].slice(0, 90);
        }
        verdicts.push(ligne);
        // On revient à l'accueil pour ouvrir le suivant proprement.
        await s.page.goto(`http://localhost:${s.port}/`);
        await s.page.waitForTimeout(600);
    }
} finally {
    await s.fermer();
}

console.log('');
let fuites = 0;
for (const v of verdicts) {
    if (v.erreur) { console.log(`  ?     ${v.id.padEnd(24)} ${v.erreur}`); continue; }
    if (v.avale) {
        const champ = v.saisie === null ? 'pas de champ de saisie ici'
            : (v.saisie ? 'et un champ de saisie garde le sien' : 'MAIS UN CHAMP DE SAISIE PERD LE SIEN');
        if (v.saisie === false) fuites++;
        console.log(`  ${v.saisie === false ? 'FUITE' : 'ok   '} ${v.id.padEnd(24)} le menu est avalé — ${champ}`);
        continue;
    }
    fuites++;
    console.log(`  FUITE ${v.id.padEnd(24)} le menu du navigateur s'ouvre (sur « ${v.ou} »)`);
}
console.log('');
if (fuites) {
    console.log(`${fuites} exercice(s) laissent le menu du navigateur s'ouvrir par-dessus.`);
    process.exit(1);
}
console.log('Aucun exercice ne laisse passer le menu du navigateur.');
