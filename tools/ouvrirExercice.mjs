// OUVRIR UN EXERCICE DANS UN VRAI NAVIGATEUR, ET DIRE CE QUI NE TIENT PAS.
//
// NÉ DE DEUX FRICTIONS, relevées par l'audit de rendu du 26 septembre :
//
//   1. « Ouvrir un exercice par le meneur demande de recopier sept lignes à
//      chaque sonde. » Sept lignes, plus le site d'essai, plus l'attente du
//      montage, plus le clic sur « JOUER » des jeux à canevas.
//   2. « Une sonde de rendu qui n'annonce pas `pointer: coarse` ment sur toutes
//      les tailles de cibles. » Deux heures de faux signalements : le plancher
//      de 44 px du dépôt vit sous `@media (pointer: coarse)`, et un navigateur
//      d'ordinateur rétréci annonce un pointeur FIN. On mesurait une fenêtre
//      étroite, pas un téléphone.
//
// D'où le défaut de cet outil : TOUTE TAILLE SOUS 768 px S'OUVRE AU DOIGT,
// avec `hasTouch` et `isMobile`. C'est la seule façon d'obtenir les vraies
// tailles de cibles, et ce n'est pas une option qu'on pense à cocher.
//
//     node tools/ouvrirExercice.mjs calc-sudoku
//     node tools/ouvrirExercice.mjs calc-sudoku 360x640,768x900,1440x900
//     node tools/ouvrirExercice.mjs geo-patchwork 390x844 --image
//
// CE QU'IL DIT, par taille : ce qui reste HORS D'ATTEINTE sous la fenêtre (le
// défaut le plus grave possible — l'élève ne peut pas répondre), ce qui sort du
// plateau, les cibles trop basses pour un doigt, le débordement horizontal de
// la page, et les erreurs.
//
// TROISIÈME FRICTION, PAYÉE LE 27 SEPTEMBRE — ET C'EST LA PLUS CHÈRE.
//
// Le premier balayage du catalogue entier a rendu 36 défauts, dont 17 « SOUS LA
// FENÊTRE » et 78 cibles trop petites. Vérification faite un par un, dans le
// navigateur, en refaisant le geste : DIX-SEPT SUR DIX-SEPT étaient atteignables
// en défilant, et les cibles étaient des cases de grille ou des touches. Zéro
// défaut réel sur quatre-vingt-quinze signalements.
//
// La règle fautive tenait en une ligne : « le bas du bouton dépasse la fenêtre ».
// Or chaque jeu porte un cadre défilant (`.dm-wrap`, `.eq-wrap`, `.thr-wrap`…)
// et `.canvas-area` est en `overflow-y: auto` : un bouton sous la fenêtre y est
// NORMAL, et atteignable. La question n'était pas « où est ce bouton ? » mais
// « l'élève peut-il l'atteindre ? ».
//
// D'où les trois règles ci-dessous, qui refont le geste au lieu de mesurer une
// position :
//
//   · SOUS LA FENÊTRE : on fait défiler jusqu'au bouton (`scrollIntoView`),
//     puis on demande au navigateur QUI reçoit le clic au centre du bouton
//     (`elementFromPoint`). On ne signale que ce qui reste hors d'atteinte ou
//     masqué.
//   · ÉCRAN VIDE : un jeu à canevas n'a rien à lire et va très bien. On exige
//     donc « rien à lire ET rien de dessiné », la règle déjà corrigée dans
//     `tools/apercusVides.mjs`.
//   · CIBLES : la hauteur seule décide, et un jeu de huit pairs de même taille
//     est une grille. C'est exactement ce que dit le plancher du dépôt, qui
//     n'impose qu'un `min-height` et exclut les cases : « 38 x 44 sont des
//     touches de pavé numérique : la forme d'une touche, pas un ovale »
//     (`css/modules.css`). Une sonde plus sévère que la règle qu'elle vérifie
//     ne mesure pas le logiciel, elle mesure son propre désaccord.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

// PLUSIEURS EXERCICES SUR UN SEUL SERVEUR, ET UN SEUL NAVIGATEUR.
//
// La première version en ouvrait UN, et montait son site d'essai pour lui seul :
// balayer les deux cent seize du catalogue aurait demandé deux cent seize
// démarrages de PHP et de Chromium, soit des heures. On monte donc tout une
// fois, et l'on promène la même page.
//
//     node tools/ouvrirExercice.mjs --tous 360x640
//     node tools/ouvrirExercice.mjs calc-sudoku,geo-patchwork 768x900
//     node tools/ouvrirExercice.mjs --tous 360x640 --aere
//
// `--aere` allume « Texte plus aéré », le réglage qui allonge chaque écran :
// c'est celui qui peut faire basculer les écrans déjà justes.
const ARG = process.argv[2];
if (!ARG) {
    console.log('usage : node tools/ouvrirExercice.mjs <id[,id…]|--tous> [LxH,LxH…] '
        + '[--image] [--aere] [--theme=dark] [--bavard]');
    process.exit(2);
}
const AERE = process.argv.includes('--aere');
// `--bavard` imprime aussi ce qui a été vérifié et écarté : les boutons rendus
// atteignables par le défilement, les jeux de cases. Sans lui, on n'imprime que
// les défauts — voir plus bas pourquoi.
const BAVARD = process.argv.includes('--bavard');
const THEME = (process.argv.find(a => a.startsWith('--theme=')) || '').split('=')[1] || '';
const TAILLES = (process.argv[3] && !process.argv[3].startsWith('--')
    ? process.argv[3] : '360x640,768x900,1440x900')
    .split(',').map(t => { const [l, h] = t.split('x').map(Number); return { l, h }; });
const IMAGE = process.argv.includes('--image');

const PORT = String(9400 + Math.floor(Math.random() * 180));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('le site d\'essai n\'a pas démarré')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let defauts = 0;
let vus = 0;
let ecartes = 0;
const fautifs = new Set();

for (const { l, h } of TAILLES) {
    // LE DOIGT SOUS 768, LA SOURIS AU-DESSUS. Voir le préambule : c'est la
    // raison d'être de cet outil.
    const auDoigt = l <= 768;
    const ctx = await nav.newContext({
        viewport: { width: l, height: h },
        hasTouch: auDoigt, isMobile: auDoigt, deviceScaleFactor: 2
    });
    const p = await ctx.newPage();
    const soucis = [];
    p.on('pageerror', e => soucis.push(String(e).slice(0, 160)));
    p.on('dialog', async (d) => { soucis.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });

    await p.goto(`http://127.0.0.1:${PORT}/index.html`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });

    // LA LISTE DES EXERCICES SE LIT DANS LA PAGE, une fois par taille : le
    // catalogue est la seule source qui les connaisse tous.
    const LISTE = ARG === '--tous'
        ? await p.evaluate(async () => (await import('./js/data/catalog.js')).exercices.map(e => e.id))
        : ARG.split(',').map(x => x.trim()).filter(Boolean);

    // LE MODE « TEXTE PLUS AÉRÉ » ALLONGE CHAQUE ÉCRAN : c'est le réglage qui
    // peut faire basculer ceux qui sont tout juste. Et le thème se pose ici,
    // pas par un clic : on mesure le rendu, pas le chemin du réglage.
    if (AERE) await p.evaluate(() => document.documentElement.setAttribute('data-aere', '1'));
    if (THEME) await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), THEME);

    for (const EXO of LISTE) {
        // ON REPART D'UNE PAGE PROPRE ENTRE DEUX EXERCICES : un meneur laissé
        // ouvert garde ses minuteurs, et le suivant se monte par-dessus.
        await p.reload();
        await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
        if (AERE) await p.evaluate(() => document.documentElement.setAttribute('data-aere', '1'));
        if (THEME) await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), THEME);
        soucis.length = 0;
        const monte = await p.evaluate(async (exoId) => {
            const { getExerciseById } = await import('./js/data/catalog.js');
            const exo = getExerciseById(exoId);
            if (!exo) return 'inconnu au catalogue';
            const { makeStep, makePath } = await import('./js/core/path.js');
            const { politiquePerso } = await import('./js/core/mesExercices.js');
            const { Runner } = await import('./js/core/runner.js');
            const pas = makeStep(exo.id, {}, { stepId: 's1', nbItems: 8, threshold: 0 });
            new Runner({ path: makePath('Sonde', [pas], politiquePerso()), deviceMode: 'none' }).start();
            return null;
        }, EXO);
        // UN EXERCICE QU'ON NE SAIT PAS OUVRIR NE DOIT PAS TUER LE BALAYAGE :
        // on le dit, et l'on passe au suivant. Deux cent seize exercices, et
        // l'on s'arrête au premier venu, c'est deux cent quinze mesures perdues.
        if (monte) { console.log(`  ${EXO} · ${l}×${h} : ${monte}`); defauts++; fautifs.add(EXO); continue; }
        await attendre(3200);

        // LES JEUX À CANEVAS S'OUVRENT SUR UN ÉCRAN « JOUER ». Sans ce clic, on
        // mesure une page d'accueil en croyant mesurer un jeu.
        await p.evaluate(() => {
            const b = [...document.querySelectorAll('#game-layer button')]
                .filter(x => x.getBoundingClientRect().width > 0)
                .find(x => /^(jouer|commencer|c'est parti|démarrer|go)/i.test((x.textContent || '').trim()));
            if (b) b.click();
        });
        await attendre(2000);

        const m = await p.evaluate(() => {
            const vu = (e) => {
                const r = e.getBoundingClientRect();
                const s = getComputedStyle(e);
                return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
            };
            const nom = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26)
                || e.getAttribute('aria-label') || e.className || e.tagName;
            const H = document.documentElement.clientHeight;
            const W = document.documentElement.clientWidth;
            const couche = document.getElementById('game-layer');
            const plateau = document.getElementById('game-board') || document.querySelector('.canvas-area');

            const cliquables = [...(couche ? couche.querySelectorAll('button, [role="button"], a, input, select') : [])]
                .filter(vu);

            // ON MESURE D'ABORD TOUT CE QUI NE DÉPLACE RIEN. L'essai
            // d'atteignabilité fait défiler la page : mesurer des tailles après
            // lui, c'est mesurer un autre écran que celui de l'élève.
            const aLire = ((couche && couche.innerText) || '').replace(/\s+/g, ' ').trim().length;
            // UN JEU À CANEVAS N'A RIEN À LIRE ET VA TRÈS BIEN. Math Crush a été
            // signalé « écran vide » avec seize signes à lire : tout son plateau
            // est peint dans un canevas. Même règle que `apercusVides.mjs`.
            const dessine = couche
                ? couche.querySelectorAll('canvas, svg, iframe, img').length : 0;
            const pageDeborde = Math.round(document.documentElement.scrollWidth - W);
            const aDefiler = plateau ? Math.max(0, plateau.scrollHeight - plateau.clientHeight) : 0;
            const horsPlateau = (() => {
                if (!plateau) return null;
                const pr = plateau.getBoundingClientRect();
                return [...plateau.children].filter(vu).map(e => {
                    const r = e.getBoundingClientRect();
                    return { q: nom(e), depasse: Math.round(Math.max(0, r.right - pr.right, pr.left - r.left)) };
                }).filter(x => x.depasse > 1);
            })();

            let casesEcartees = 0;
            const cibles = cliquables.filter(e => {
                // LES CASES D'UNE GRILLE NE SONT PAS DES BOUTONS QU'ON DESSINE.
                //
                // Neuf colonnes de sudoku dans 360 px font 40 px chacune, et aucun
                // réglage n'y changera rien : c'est la grille qui décide, pas la
                // case. Les signaler, c'est rendre cinquante-huit fausses pistes
                // par exercice — la faute même que ce dépôt a payée deux fois
                // (voir `tools/apercusVides.mjs` et `tools/nouvelExercice.mjs`).
                //
                // UN TABLEAU EST UNE GRILLE, LUI AUSSI. Les cellules d'un tableau
                // à double entrée se dimensionnent par colonnes ; cinq colonnes
                // dans 360 px ne feront jamais 44 px chacune.
                if (e.closest('table')) { casesEcartees++; return false; }
                // ET UNE FORME DESSINÉE DANS UNE FIGURE EST DIMENSIONNÉE PAR LA
                // FIGURE. Les segments cliquables de « Coder une figure »
                // (13 x 92, 48 x 24, 35 x 68) sont les côtés du quadrilatère :
                // les élargir à 44 px, c'est redessiner la figure. Les 36 points
                // du repère, les carrefours de la ville et le pavé de vitesses de
                // la course de vecteurs sont dans le même cas.
                if (e.closest('svg')) { casesEcartees++; return false; }
                // ET L'OUTIL SUIT LA MÊME LISTE D'EXCEPTIONS QUE LA RÈGLE.
                //
                // `css/modules.css` exclut volontairement du plancher de 44 px
                // les icônes carrées, les cases de grille et LES TOUCHES DE
                // PAVÉ NUMÉRIQUE, avec sa mesure à l'appui. Signaler ces
                // éléments-là, c'est reprocher au logiciel une décision qu'il a
                // prise exprès — et noyer les vrais défauts sous le bruit.
                if (e.matches('.game-icon-btn, .btn-carre, [class*="case"], [class*="cell"],'
                    + ' [class*="cellule"], [class*="touche"]')) { casesEcartees++; return false; }
                let p = e.parentElement;
                for (let n = 0; n < 3 && p; n++, p = p.parentElement) {
                    const g = getComputedStyle(p).display;
                    if ((g === 'grid' || g === 'inline-grid') && p.children.length > 8) {
                        casesEcartees++; return false;
                    }
                }
                // UN JEU DE HUIT PAIRS DE MÊME TAILLE EST UNE GRILLE, quel que
                // soit son `display`. Les cent cases du quadrillage de symétrie
                // (28 x 28), les dix-huit jetons du mot codé (24 x 44) et les
                // onze cibles du point à point vivent dans des RANGÉES en `flex`,
                // pas dans une grille CSS : la boucle ci-dessus ne les voyait
                // pas, et le balayage rendait quatre-vingt-quatorze lignes pour
                // un seul exercice. Ce qui décide leur taille, c'est le jeu
                // qu'elles forment.
                const fr = e.parentElement ? [...e.parentElement.children].filter(vu) : [];
                if (fr.length >= 8) {
                    const r0 = e.getBoundingClientRect();
                    const pareils = fr.filter(x => {
                        const rx = x.getBoundingClientRect();
                        return Math.abs(rx.width - r0.width) < 2 && Math.abs(rx.height - r0.height) < 2;
                    });
                    if (pareils.length >= 8) { casesEcartees++; return false; }
                }
                return true;
            }).map(e => {
                const r = e.getBoundingClientRect();
                return { q: nom(e), w: Math.round(r.width), h: Math.round(r.height) };
            // LA HAUTEUR DÉCIDE, PAS LA LARGEUR — comme le plancher du dépôt, qui
            // n'impose qu'un `min-height`. Sa propre mesure le dit : « les seuls
            // boutons plus hauts que larges après coup (38 x 44) sont des touches
            // de pavé numérique et deux loupes : la forme d'une touche, pas un
            // ovale. » Une flèche de 35 x 44 est une touche ; un champ de 66 x 39
            // est trop bas pour un doigt.
            }).filter(x => x.h < 44);

            // EN DERNIER, ET SEULEMENT EN DERNIER : L'ESSAI QUI DÉPLACE LA PAGE.
            //
            // On refait le geste de l'élève — défiler jusqu'au bouton — puis on
            // demande au navigateur qui reçoit le clic en son centre. Un bouton
            // ramené dans la fenêtre et qui reçoit bien le clic n'est pas un
            // défaut : c'est un cadre défilant qui fait son travail.
            const sousLaFenetre = [];
            let ramenes = 0;
            for (const e of cliquables) {
                if (e.getBoundingClientRect().bottom <= H + 1) continue;
                e.scrollIntoView({ block: 'center' });
                const r = e.getBoundingClientRect();
                if (r.bottom > H + 1 || r.top < -1) {
                    sousLaFenetre.push({ q: nom(e), bas: Math.round(r.bottom), pourquoi: 'hors d\'atteinte' });
                    continue;
                }
                const dessus = document.elementFromPoint(
                    Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
                if (!dessus || !(dessus === e || e.contains(dessus) || dessus.contains(e))) {
                    sousLaFenetre.push({
                        q: nom(e), bas: Math.round(r.bottom),
                        pourquoi: 'masqué par ' + (dessus ? nom(dessus).slice(0, 18) : 'rien')
                    });
                    continue;
                }
                ramenes++;
            }

            return {
                sousLaFenetre, ramenes, aDefiler, horsPlateau, cibles,
                casesEcartees, pageDeborde, aLire, dessine
            };
        });

        // ON N'IMPRIME QUE CE QUI CLOCHE. Sur deux cent seize exercices, une
        // ligne par exercice sain noierait les défauts dans deux cents lignes
        // de « rien à signaler » — et un rapport qu'on ne lit pas ne sert pas.
        const mot = auDoigt ? 'doigt' : 'souris';
        const vide = m.aLire < 25 && !m.dessine;
        const rien = !m.sousLaFenetre.length && !(m.horsPlateau && m.horsPlateau.length)
            && !(auDoigt && m.cibles.length) && !soucis.length
            && m.pageDeborde <= 0 && !vide;
        vus++;
        ecartes += m.ramenes + m.casesEcartees;
        if (rien && !BAVARD) continue;
        console.log(`\n  ${EXO} · ${l}×${h} (${mot})`);
        console.log(`    à lire : ${m.aLire} signes · ${m.dessine} dessin(s)`
            + ` · page déborde de ${m.pageDeborde} px · plateau à défiler : ${m.aDefiler} px`);
        if (BAVARD) {
            console.log(`    écartés après vérification : ${m.ramenes} bouton(s) ramené(s)`
                + ` par le défilement, ${m.casesEcartees} case(s) de grille`);
        }
        if (vide) {
            defauts++; fautifs.add(EXO);
            console.log('    ÉCRAN VIDE : rien à lire et rien de dessiné dans la couche de jeu.');
        }
        if (m.pageDeborde > 0) {
            defauts++; fautifs.add(EXO);
            console.log(`    LA PAGE DÉBORDE de ${m.pageDeborde} px`);
        }
        if (m.sousLaFenetre.length) {
            defauts++; fautifs.add(EXO);
            console.log('    HORS D\'ATTEINTE, MÊME EN DÉFILANT :');
            m.sousLaFenetre.forEach(x => console.log(`      · « ${x.q} » bas ${x.bas} (fenêtre ${h}) — ${x.pourquoi}`));
        }
        if (m.horsPlateau && m.horsPlateau.length) {
            defauts++; fautifs.add(EXO);
            m.horsPlateau.forEach(x => console.log(`    HORS DU PLATEAU : « ${x.q} » de ${x.depasse} px`));
        }
        if (auDoigt && m.cibles.length) {
            defauts++; fautifs.add(EXO);
            m.cibles.slice(0, 6).forEach(x => console.log(`    TROP BAS POUR UN DOIGT ${x.w}×${x.h} : « ${x.q} »`));
            if (m.cibles.length > 6) console.log(`    … et ${m.cibles.length - 6} autre(s)`);
        }
        if (soucis.length) { defauts++; fautifs.add(EXO); soucis.slice(0, 3).forEach(x => console.log('    ERREUR : ' + x)); }
        if (IMAGE) {
            const f = `tools/tmp/exo-${EXO}-${l}x${h}.png`;
            await p.screenshot({ path: f });
            console.log('    ' + f);
        }
    }
    await ctx.close();
}

console.log(`\n${vus} écran(s) mesuré(s) · `
    + `${defauts ? defauts + ' défaut(s)' : 'rien à signaler'}`
    + `\n${ecartes} signalement(s) écarté(s) après vérification dans le navigateur`
    + (fautifs.size ? `\n${fautifs.size} exercice(s) en cause : ${[...fautifs].join(' ')}` : ''));
await nav.close();
srv.kill();
process.exit(defauts ? 1 : 0);
