// LA SONDE PARTAGÉE : tout ce qu'on réécrivait à chaque fois.
//
// LA FRICTION LA PLUS MARQUÉE DU JOURNAL — onze traits sur l'entrée « chaque
// sonde de navigateur repart de zéro », et sept autres entrées qui demandent
// toutes une pièce du même module :
//
//   · « `fullPage: true` ment partout où le défilement n'est pas sur le
//     document » — la capture passe donc par une DÉCOUPE DE LA PAGE ;
//   · « une cible tactile ne se mesure pas avec une souris » — sous 768 px,
//     `hasTouch` et `isMobile` ne sont pas une option, ils sont le DÉFAUT ;
//   · « un `pkill` par motif tue aussi ce qu'on vient de lancer » — on ne tue
//     que le processus qu'on a soi-même lancé, par son identifiant ;
//   · « deux sondes sur le même site d'essai se marchent dessus » — chaque
//     sonde monte SON site, sur un port qu'elle ne choisit pas au hasard mais
//     qu'elle demande au système ;
//   · « une capture d'élément perd un texte peint par son fond » — et surtout,
//     « une image de la bonne taille peut être vide » : on COMPTE LES TEINTES ;
//   · « `getComputedStyle().backgroundColor` ne rend pas du `rgb()` pour un
//     `color-mix` » — le contraste se mesure sur les PIXELS RENDUS ;
//   · « un site d'essai neuf n'a pas les états qu'on veut mesurer » — d'où
//     `identifier()`, qui s'identifie PUIS RECHARGE, parce que sans cela la
//     page reste le portail et tout ce qu'on mesure est caché derrière le voile.
//
// CE QU'ELLE NE FAIT PAS : deviner. Elle ne décide pas ce qui est un défaut ;
// elle rend une page prête et des mesures honnêtes. Le jugement reste dans la
// sonde qui l'emploie.
//
// EMPLOI :
//
//     import { ouvrirSonde } from './sonde.mjs';
//     const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
//     await s.identifier();                       // prof, puis rechargement
//     await s.photo('.title', 'tools/tmp/titre.png');
//     console.log(await s.contrasteRendu('.title'));
//     console.log(await s.encre('.po-virgule'));   // la MATIÈRE du signe, en pixels
//     await s.fermer();
//
// `s.page` est la page Playwright : tout ce que cette sonde ne prévoit pas
// reste faisable directement.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import zlib from 'node:zlib';

/** Sous cette largeur, un écran est un téléphone, et il se mesure au doigt. */
export const LARGEUR_DOIGT = 768;

/**
 * Monte un site d'essai, ouvre un navigateur, rend une sonde prête.
 *
 * @param {object} o
 * @param {number} [o.largeur=1280]
 * @param {number} [o.hauteur=900]
 * @param {boolean} [o.doigt]  - forcé ; par défaut, vrai sous 768 px
 * @param {string}  [o.theme]  - 'dark' | 'ocean' | 'forest' | 'sunset'
 */
export async function ouvrirSonde(o = {}) {
    const largeur = o.largeur || 1280;
    const hauteur = o.hauteur || 900;
    // LE DÉFAUT EST LE PIÈGE RÉSOLU, PAS LE CONFORT DU MOMENT. Deux heures de
    // faux signalements ont été payées parce qu'une fenêtre étroite annonce un
    // pointeur FIN : le plancher de 44 px du dépôt vit sous
    // `@media (pointer: coarse)` et ne s'appliquait pas.
    const doigt = o.doigt === undefined ? largeur < LARGEUR_DOIGT : !!o.doigt;

    const { port, info, serveur } = await monterLeSite();

    // DES DRAPEAUX DE NAVIGATEUR, QUAND LA MESURE EN DEMANDE.
    //
    // Le scanner de QR code ne se mesure pas sans `--use-file-for-fake-video-
    // capture` : il faut une CAMÉRA, et la seule caméra d'un serveur est un
    // fichier qu'on lui donne. Sans cette ligne, une telle sonde devait
    // réécrire `monterLeSite`, le contexte, les écouteurs d'erreur et de
    // fenêtres natives — c'est-à-dire tout ce que ce fichier existe pour ne
    // plus réécrire.
    const nav = await chromium.launch({
        executablePath: '/opt/pw-browsers/chromium',
        args: o.args || []
    });
    const ctx = await nav.newContext({
        viewport: { width: largeur, height: hauteur },
        deviceScaleFactor: 2, hasTouch: doigt, isMobile: doigt,
        // LES TÉLÉCHARGEMENTS SONT ACCEPTÉS, ET ÉCRIT NOIR SUR BLANC. Playwright
        // les accepte par défaut aujourd'hui — mais une sonde qui mesure un
        // export (voir `gestionParcours.mjs`) dépend de ce défaut, et un défaut
        // dont on dépend sans le dire se retourne un jour contre nous, sous la
        // forme d'un `waitForEvent('download')` qui expire sans raison visible.
        acceptDownloads: true
    });

    // HORS LIGNE, SANS COUPER LE SERVEUR.
    //
    // Les tablettes de la sœur de Rémy travaillent sans réseau, et le logiciel
    // s'y comporte autrement : la porte d'entrée ouvre le scanner d'elle-même,
    // les deux portes qui passent par le serveur ne peuvent pas servir, le
    // paquet hors ligne ne se redemande pas. Tout cela se décide sur
    // `navigator.onLine`, et rien de tout cela ne se mesurait sans réécrire la
    // même ligne dans chaque sonde.
    //
    // ON NE COUPE PAS VRAIMENT LE RÉSEAU, et c'est délibéré : `ctx.setOffline`
    // empêcherait la page de se charger, donc d'exister — ce n'est pas ce
    // qu'on mesure. On fait dire au navigateur ce qu'il dirait sans réseau, et
    // l'on regarde ce que le logiciel en fait. Pour couper vraiment, après le
    // chargement, `s.ctx.setOffline(true)` reste là.
    if (o.horsLigne) {
        await ctx.addInitScript(() => {
            Object.defineProperty(Navigator.prototype, 'onLine',
                { get: () => false, configurable: true });
        });
    }

    const page = await ctx.newPage();

    const erreurs = [];
    const fenetresNatives = [];
    page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
    // UNE VIOLATION DE CSP N'EST PAS UNE ERREUR DE PAGE, et c'est précisément
    // ce qui la rend chère : le navigateur refuse le script, l'écrit dans la
    // console, et `pageerror` ne dit rien. Mesuré ce jour-là : un script écrit
    // dans la page, ajouté après le dernier `csp.mjs --ecrire`, ne s'exécutait
    // pas — et la sonde annonçait « erreurs : 0 » devant un bouton absent.
    //
    // On les range AVEC les erreurs : toutes les sondes impriment déjà
    // `s.erreurs`, et le verdict de `boutEnBout` les compte. Une liste de plus
    // serait une liste que personne ne regarde.
    page.on('console', m => {
        const t = m.text();
        if (/Content Security Policy/i.test(t)) erreurs.push('CSP : ' + t.slice(0, 150));
    });
    // « tu utilises des alert et prompt, on évite ! » — une sonde qui n'écoute
    // pas les fenêtres natives ne verra jamais celle qui reviendra.
    page.on('dialog', async d => { fenetresNatives.push(d.message()); await d.dismiss(); });

    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

    // LE THÈME EST UN ATTRIBUT DE LA PAGE, ET UN RECHARGEMENT L'EMPORTE.
    //
    // La sonde posait `data-theme` une fois, après le premier chargement. Or
    // `identifier()` recharge — c'est la moitié du geste, voir plus bas —, et
    // beaucoup de sondes rechargent encore ensuite. Le thème disparaissait à
    // chaque fois, SANS UN MOT, et les chiffres qui suivaient étaient ceux du
    // thème clair sous le nom d'un autre.
    //
    // MESURÉ, ET C'EST AINSI QU'ON L'A VU : l'écran des signalements annonçait
    // 17,85 · 5,74 · 4,88 · 17,06 dans les CINQ thèmes, à la deuxième décimale.
    // Cinq thèmes qui s'accordent à ce point ne s'accordent pas : ils sont le
    // même. C'est le seul indice qu'on ait eu, et il tenait à ce qu'on ait
    // lancé les cinq d'affilée.
    //
    // ON PREND DONC LE CHEMIN DE L'ÉLÈVE. Un élève ne pose pas un attribut : il
    // appuie sur le bouton des thèmes, et son choix se range dans
    // `localStorage` sous `mathbox-theme` (voir `js/app.js`). On écrit là, et
    // l'application repose le thème toute seule à chaque chargement — comme
    // chez lui. L'attribut est posé en plus, pour que la mesure qui suit
    // immédiatement n'ait pas à attendre le rechargement.
    const CLE_THEME = 'mathbox-theme';
    let themeVoulu = o.theme || null;
    const reposerLeTheme = async () => {
        await page.evaluate(([t, cle]) => {
            try {
                if (t) window.localStorage.setItem(cle, t);
                else window.localStorage.removeItem(cle);
            } catch (e) { /* navigation privée : l'attribut suffira */ }
            if (t) document.documentElement.setAttribute('data-theme', t);
            else document.documentElement.removeAttribute('data-theme');
        }, [themeVoulu, CLE_THEME]);
    };
    if (themeVoulu) await reposerLeTheme();
    // ET L'ON REPOSE APRÈS CHAQUE CHARGEMENT, y compris ceux que la sonde
    // appelante déclenche elle-même : c'est la seule façon qu'elle n'ait rien à
    // savoir de ce piège.
    page.on('load', () => { reposerLeTheme().catch(() => { /* page partie */ }); });

    const sonde = {
        page, ctx, nav, port, info, doigt, erreurs, fenetresNatives,

        /** S'identifie comme le professeur, PUIS RECHARGE. */
        async identifier(email, mdp) {
            const dit = await page.evaluate(async ([e, m]) => {
                const { identifierProf } = await import('./js/core/verrouProf.js');
                try { return await identifierProf(e, m); }
                catch (err) { return 'ERREUR: ' + err.message; }
            }, [email || info.email || 'remy@essai.test', mdp || info.mdp || 'motdepassetreslong']);
            if (String(dit).startsWith('ERREUR')) throw new Error('identification : ' + dit);
            // LE RECHARGEMENT N'EST PAS UNE PRÉCAUTION, C'EST LA MOITIÉ DU
            // GESTE. Sans lui, la page reste le PORTAIL : l'entête du logiciel
            // existe dans le document, mais derrière le voile. Les styles
            // calculés restent justes — ce qui rend l'oubli indétectable — et
            // toutes les photos sortent vides.
            await page.reload();
            await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
            // ET LE THÈME REVIENT AVEC. Sans cette ligne, une sonde ouverte en
            // thème sombre mesure le thème clair à partir d'ici, et ses chiffres
            // n'en ont pas l'air.
            await reposerLeTheme();
            await dormir(500);
            return dit;
        },

        /**
         * CE SÉLECTEUR DÉSIGNE-T-IL QUELQUE CHOSE ? Et si non, on le dit FORT.
         *
         * ── LA FRICTION QUE CET OUTIL FERME, ET QU'ON A PAYÉE QUINZE FOIS ──
         *
         * Une sonde qui interroge un crochet inventé ne reçoit pas d'erreur :
         * elle reçoit `false`, `0`, `''` — c'est-à-dire la MÊME réponse qu'un
         * logiciel cassé. On cherche alors le défaut dans le code pendant
         * vingt minutes, et il était dans la question. Relevé dans ce dépôt
         * sur `.modal-title` (qui existe mais vide), `.icon-btn` (c'est
         * `.btn-icon`), `:nth-of-type(2)` (compte les frères, pas les
         * classes), `#game-board .question-text` (c'est `.game-question`)…
         *
         * ON NE DEVINE PLUS ET ON NE SE TAIT PLUS : cette fonction rend le
         * nombre d'éléments trouvés, et JETTE quand c'est zéro. Une sonde qui
         * s'arrête sur « ce crochet ne désigne rien » coûte dix secondes ; une
         * sonde qui répond `false` en coûte vingt minutes.
         *
         * @param {string} selecteur
         * @param {string} [pourquoi] ce qu'on croyait mesurer, pour le message
         * @returns {Promise<number>} combien d'éléments, au moins 1
         */
        async doitExister(selecteur, pourquoi = '') {
            const n = await page.evaluate((s) => document.querySelectorAll(s).length, selecteur);
            if (!n) {
                throw new Error(`le crochet « ${selecteur} » ne désigne RIEN dans la page`
                    + `${pourquoi ? ' (' + pourquoi + ')' : ''}.`
                    + ' Lire la source plutôt que deviner : un crochet inventé rend la'
                    + ' même réponse qu\'un logiciel cassé.');
            }
            return n;
        },

        /**
         * DÉPLIE LE REPLI QUI CONTIENT CE RÉGLAGE, et rend la main quand il
         * est ouvert.
         *
         * ─────────────────────────────────────────────────────────────────
         *
         * LA FRICTION QUE CETTE FONCTION FERME A COÛTÉ DEUX FOIS LE MÊME
         * APRÈS-MIDI. Les panneaux d'impression rangent leurs réglages rares
         * dans un `<details>` replié — « Papier, numéros et corrigé »,
         * « Sur quel papier ». Playwright refuse alors de cliquer et répète
         * « element is not visible » pendant trente secondes, ce qui est
         * vrai mais ne dit pas pourquoi.
         *
         * ET NOTRE PROPRE MESURE DIT LE CONTRAIRE, c'est là le piège :
         * mesurée à la main dans un repli FERMÉ, la case rend
         * `display: block`, `visibility: visible`, `opacity: 1` et un
         * rectangle de 13 × 13 à une position plausible. Le rectangle non
         * vide plus le style calculé — notre façon de répondre à « est-ce
         * visible ? » depuis le début du dépôt — donne donc un FAUX POSITIF
         * sous un repli fermé. Ce qui tranche en une ligne :
         * `document.elementFromPoint` au centre, qui désigne ce qu'il y a
         * vraiment là — l'aperçu, derrière le panneau.
         *
         * Le professeur, lui, déplie puis règle. On fait pareil : on clique
         * le `<summary>`, parce qu'un `open = true` posé à la main sauterait
         * le code qui retient l'état du repli.
         *
         * @param {string} selecteur le réglage qu'on veut atteindre
         * @returns {Promise<boolean>} vrai si un repli a dû être ouvert
         */
        async deplier(selecteur) {
            await this.doitExister(selecteur, 'le réglage à déplier');
            const ferme = () => page.evaluate((s) => {
                const el = document.querySelector(s);
                const d = el && el.closest('details:not([open])');
                return d ? (d.id || d.className || 'details') : null;
            }, selecteur);
            const quel = await ferme();
            if (!quel) return false;
            await page.evaluate((s) => {
                document.querySelector(s).closest('details:not([open])')
                    .querySelector('summary').click();
            }, selecteur);
            await dormir(700);
            const encore = await ferme();
            if (encore) {
                throw new Error(`le repli « ${encore} » qui contient « ${selecteur} »`
                    + ' ne s\'ouvre pas : le réglage restera hors d\'atteinte, et'
                    + ' Playwright dira seulement « element is not visible ».');
            }
            return true;
        },

        /**
         * OUVRE LA BIBLIOTHÈQUE SUR UN MOT, ET REND LES CARTES VISIBLES.
         *
         * LA TROISIÈME COUSINE DE `doitExister` ET DE `deplier`, et elle coûte
         * aussi cher : les 252 cartes `.exo-list-item` SONT dans la page au
         * chargement, mais leur accordéon `#view-accordion` est en
         * `display: none`. `doitExister('.exo-list-item')` passe donc au vert,
         * et Playwright répète ensuite « element is not visible » — mesuré :
         * cinquante-huit fois en trente secondes — sur une carte parfaitement
         * présente. On cherche alors le défaut dans le logiciel.
         *
         * LE PROFESSEUR, LUI, TAPE DANS LE CHAMP. C'est son geste le plus
         * fréquent (voir `tools/leTrajetDuProf.mjs`), et c'est lui qui montre
         * les cartes. La sonde fait pareil, et rend les titres trouvés.
         *
         * @param {string} mot ce qu'on tape, comme un professeur pressé
         * @returns {Promise<string[]>} les titres affichés, dans l'ordre
         */
        async chercherDansLeCatalogue(mot) {
            await this.doitExister('#sidebar-search-input', 'le champ de recherche du catalogue');
            await page.fill('#sidebar-search-input', mot);
            await dormir(900);
            const titres = await page.evaluate(() =>
                [...document.querySelectorAll('#drill-content .exo-list-item')]
                    .filter(e => e.offsetParent)
                    .map(e => ((e.querySelector('.exo-item-titre') || {}).textContent || '').trim()));
            if (!titres.length) {
                throw new Error(`« ${mot} » ne montre aucune carte dans la bibliothèque :`
                    + ' la suite mesurerait un catalogue fermé.');
            }
            return titres;
        },

        /**
         * CLIQUE, ET JETTE SI LE CROCHET NE DÉSIGNE RIEN.
         *
         * `doitExister` ferme le piège du crochet inventé pour ce qu'on
         * INTERROGE. Un clic, lui, s'écrit `const b = document.getElementById(…);
         * if (b) b.click();` — et ce `if` est exactement le trou : un
         * identifiant deviné ne jette pas, il ne fait rien, et la sonde
         * continue de mesurer l'écran d'AVANT le clic en annonçant des
         * chiffres parfaitement crédibles. Vu sur le tiroir du catalogue, où
         * trois crochets devinés mesuraient un panneau resté fermé.
         *
         * @param {string} selecteur
         * @param {string} [pourquoi] ce qu'on croyait ouvrir, pour le message
         */
        async cliquer(selecteur, pourquoi = '') {
            await this.doitExister(selecteur, pourquoi);
            await page.evaluate((s) => document.querySelector(s).click(), selecteur);
            await dormir(400);
        },

        /** Bascule un thème (ou revient au thème clair avec `null`). */
        async theme(nom) {
            themeVoulu = nom || null;
            await reposerLeTheme();
            await dormir(220);
        },

        /** Ouvre un exercice comme le meneur le ferait, et clique « JOUER ». */
        /**
         * MONTE LE MENEUR SUR UN EXERCICE ET CLIQUE « JOUER ».
         *
         * `options.questions` DIT COMBIEN DE QUESTIONS DURE L'ESSAI, et ce
         * n'était pas réglable : huit, en dur. Un exercice à progression en
         * compte dix-sept (« Décomposer, PGCD et PPCM ») : la sonde ne pouvait
         * donc voir que ses huit premières marches, et les neuf suivantes
         * rendaient un écran vide que rien ne distinguait d'un exercice cassé.
         * Mesuré en cherchant pourquoi dix questions sur dix-huit étaient
         * nulles.
         */
        async ouvrirExercice(id, params = {}, options = {}) {
            const combien = Math.max(1, Math.round(Number(options.questions)) || 8);
            const raté = await page.evaluate(async ([exoId, p, n]) => {
                if (window.__sondeRunner) { try { window.__sondeRunner.exit(); } catch (e) {} }
                await new Promise(ok => setTimeout(ok, 260));
                const { getExerciseById } = await import('./js/data/catalog.js');
                const exo = getExerciseById(exoId);
                if (!exo) return 'inconnu au catalogue';
                const { makeStep, makePath } = await import('./js/core/path.js');
                const { politiquePerso } = await import('./js/core/mesExercices.js');
                const { Runner } = await import('./js/core/runner.js');
                const pas = makeStep(exo.id, p, { stepId: 's1', nbItems: n, threshold: 0 });
                window.__sondeRunner = new Runner({
                    path: makePath('Sonde', [pas], politiquePerso()), deviceMode: 'none' });
                window.__sondeRunner.start();
                return null;
            }, [id, params, combien]);
            if (raté) return raté;
            await dormir(1600);
            // Les jeux à canevas s'ouvrent sur un écran « JOUER » : sans ce
            // clic, on mesure une page d'accueil en croyant mesurer un jeu.
            await page.evaluate(() => {
                const b = [...document.querySelectorAll('#game-layer button')]
                    .filter(x => x.getBoundingClientRect().width > 0)
                    .find(x => /^(jouer|commencer|c'est parti|démarrer|go)/i
                        .test((x.textContent || '').trim()));
                if (b) b.click();
            });
            await dormir(1100);
            return null;
        },

        /**
         * Photographie un élément PAR DÉCOUPE DE LA PAGE, et refuse une image unie.
         *
         * `locator.screenshot()` recompose l'élément seul : un dégradé découpé
         * dans le texte (`background-clip: text`) n'y survit pas, et l'on
         * obtient un rectangle de la bonne taille, de la bonne couleur, sans
         * une lettre. Quinze images comme celles-là sont parties dans une
         * planche avant que quelqu'un ne les regarde.
         *
         * @returns {Promise<{teintes:number, unie:boolean}|null>}
         */
        async photo(selecteur, chemin, marge = 8) {
            const el = page.locator(selecteur).first();
            if (!await el.count()) return null;
            // ON LE RAMÈNE DANS L'ÉCRAN D'ABORD. La découpe se fait sur ce que
            // la FENÊTRE montre : un élément entièrement sous le bord rend un
            // rectangle vide, et Playwright répond « Expected options.clip
            // .height to be greater than 0 » — ce qui ressemble à un élément
            // effondré, pas à un élément hors champ. MESURÉ : une barre posée
            // à 958 px dans une fenêtre haute de 844 a coûté deux essais et
            // une fausse piste de mise en page.
            try { await el.scrollIntoViewIfNeeded({ timeout: 2000 }); } catch (e) { /* fixe */ }
            let r = await el.boundingBox();
            if (!r || r.width < 2 || r.height < 2) return null;
            const t = page.viewportSize();
            const x = Math.max(0, r.x - marge), y = Math.max(0, r.y - marge);
            const dossier = dirname(chemin);
            if (dossier && !existsSync(dossier)) mkdirSync(dossier, { recursive: true });
            const largeur = Math.min(t.width - x, r.width + marge * 2);
            const hauteur = Math.min(t.height - y, r.height + marge * 2);
            await page.screenshot({ path: chemin, clip: { x, y, width: largeur, height: hauteur } });
            const teintes = compterLesTeintes(chemin);
            // ON DIT QUAND ON A COUPÉ, et c'est la moitié de l'intérêt.
            //
            // Une photo tronquée revient comme une photo réussie : le fichier
            // existe, il s'ouvre, il montre quelque chose. On regarde le haut
            // d'une fiche, on dit « c'est bon », et le défaut qu'on cherchait
            // était trois lignes plus bas. MESURÉ : une fiche de sept lignes
            // photographiée dans une fenêtre de 1100 px rendait la première
            // ligne et un bout de la deuxième — et j'ai cru une passe entière
            // que l'aperçu s'était replié.
            //
            // Playwright découpe sur la FENÊTRE, pas sur l'élément : un élément
            // plus haut qu'elle est coupé sans erreur. Le remède est d'ouvrir
            // la sonde plus haute ; encore faut-il savoir qu'il le faut.
            const coupe = {
                enBas: r.height + marge * 2 - hauteur,
                aDroite: r.width + marge * 2 - largeur
            };
            if (coupe.enBas > 1 || coupe.aDroite > 1) {
                console.warn(`  \x1b[33mphoto COUPÉE\x1b[0m ${chemin} : `
                    + `${Math.round(coupe.enBas)} px manquent en bas, `
                    + `${Math.round(coupe.aDroite)} px à droite — l'élément fait `
                    + `${Math.round(r.width)}×${Math.round(r.height)} dans une fenêtre de `
                    + `${t.width}×${t.height}. Ouvrir la sonde plus grande.`);
            }
            return { teintes, unie: teintes < 3, coupe,
                entiere: coupe.enBas <= 1 && coupe.aDroite <= 1 };
        },

        /**
         * Le contraste RÉELLEMENT RENDU entre l'encre et le fond d'un élément.
         *
         * ON NE LIT PAS `getComputedStyle().backgroundColor`, et c'est tout
         * l'intérêt de cette fonction. Ce dépôt porte plus de cent fonds en
         * `color-mix`, que Chromium rend `color(srgb 0.897 0.927 0.993)` : une
         * sonde qui n'accepte que `rgb()` ne reconnaît pas ce fond, remonte
         * silencieusement jusqu'au fond de l'application et mesure le mauvais
         * couple. Une passe entière a été refaite pour cette raison.
         *
         * ON PHOTOGRAPHIE DONC, ET L'ON COMPTE LES PIXELS. La couleur la plus
         * fréquente est le fond — un texte couvre toujours moins de place que
         * ce sur quoi il est posé. L'encre est celle qui s'en éloigne le plus
         * en luminance, parmi les couleurs assez présentes pour ne pas être du
         * lissage de bord.
         *
         * @returns {Promise<{encre:number[], fond:number[], contraste:number,
         *                    pixels:number}|null>}
         */
        async contrasteRendu(selecteur, marge = 0) {
            const chemin = join(tmpdir(), `sonde-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
            const pris = await sonde.photo(selecteur, chemin, marge);
            if (!pris) return null;
            const hist = couleursDe(chemin);
            if (!hist || hist.length < 2) return null;
            const total = hist.reduce((s, h) => s + h.n, 0);
            const fond = hist[0].c;
            const lum = ([r, g, b]) => { const v = [r, g, b].map(c => c / 255)
                .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
                return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
            const lf = lum(fond);

            // TROUVER L'ENCRE SANS TOMBER DANS LE LISSAGE DE BORD.
            //
            // PREMIÈRE VERSION, FAUSSE, ET LE CHIFFRE LE DISAIT : « ne garder
            // que ce qui occupe un pixel sur deux cents » rendait 1,00 sur le
            // titre du logiciel. Un mot en gras de 1,5 rem, lissé, étale ses
            // lettres sur CINQ CENTS teintes dont aucune n'atteint ce seuil :
            // le filtre jetait le texte et gardait le fond, puis comparait le
            // fond à lui-même. Un contraste de 1,00 sur un titre parfaitement
            // lisible est un résultat absurde, et c'est ce qui a permis de le
            // voir — une mesure qui se trompe discrètement est bien pire.
            //
            // CE QUI MARCHE : trier les pixels par éloignement du fond, puis
            // prendre celui qui laisse DIX POUR CENT des pixels non-fond
            // derrière lui. Une poussière isolée ne pèse pas assez pour
            // atteindre ce rang ; le coeur des lettres, oui, quelle que soit
            // leur finesse. Et l'on ne suppose rien sur l'épaisseur du trait.
            const loin = hist
                .map(h => ({ ...h, d: Math.abs(lum(h.c) - lf) }))
                .filter(h => h.d > 0.02)          // le fond et ses nuances immédiates
                .sort((a, b) => b.d - a.d);
            const masse = loin.reduce((s, h) => s + h.n, 0);
            let vu = 0, encre = fond;
            for (const h of loin) {
                vu += h.n;
                encre = h.c;
                if (vu >= masse * 0.10) break;
            }
            const [x, y] = [lum(encre), lf].sort((a, b) => b - a);
            return { encre, fond, pixels: total, pixelsEncre: masse,
                contraste: (x + 0.05) / (y + 0.05) };
        },

        /**
         * LA SURFACE D'ENCRE d'un élément, en pixels : ce qui n'est pas le fond.
         *
         * `contrasteRendu` dit si un signe se LIT ; il ne dit pas s'il se VOIT.
         * Rémy : « les virgules ne sont pas très visibles » — et elles étaient
         * du même rouge franc qu'aujourd'hui. Ce qui manquait n'était pas du
         * contraste, c'était de la matière : 136 pixels d'encre contre 866 pour
         * le chiffre d'à côté. Une taille de police n'aurait rien dit non plus,
         * les deux étaient à 26 px — une virgule n'occupe qu'un fond de glyphe.
         *
         * D'OÙ CE CHIFFRE-LÀ, qui se compare : la surface d'un signe rapportée
         * à celle de ses voisins, c'est le rapport que l'œil fait.
         *
         * Le seuil à 40 sur 255 laisse tomber le lissage de bord. Sans lui,
         * toutes les surfaces gonflent du même facteur et la comparaison, qui
         * est tout l'intérêt, ne veut plus rien dire.
         *
         * @returns {Promise<{pixels:number, part:number}|null>} `part` est la
         *   fraction du rectangle couverte d'encre.
         */
        async encre(selecteur, marge = 0) {
            const chemin = join(tmpdir(), `encre-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
            const pris = await sonde.photo(selecteur, chemin, marge);
            if (!pris) return null;
            const hist = couleursDe(chemin);
            if (!hist || !hist.length) return null;
            const total = hist.reduce((s, h) => s + h.n, 0);
            const clarte = ([r, v, b]) => 0.2126 * r + 0.7152 * v + 0.0722 * b;
            const fond = clarte(hist[0].c);
            let n = 0;
            for (const h of hist) if (Math.abs(clarte(h.c) - fond) > 40) n += h.n;
            return { pixels: n, part: n / total };
        },

        /**
         * COMBIEN DE REQUÊTES LE SERVEUR A-T-IL VRAIMENT SERVIES ?
         *
         * ── LA FRICTION QUE CES DEUX LIGNES FERMENT, PAYÉE QUATRE FOIS ────
         *
         * Mesurer ce qui traverse le réseau est un piège à trois étages, et
         * les trois réponses fausses ont l'air justes :
         *
         *   `page.on('request')`     compte ce que la page DEMANDE, y compris
         *                            ce que le service worker sert depuis son
         *                            cache sans toucher au réseau. 578 là où
         *                            le serveur en a vu 38.
         *   `performance` +          une réponse rendue PAR un service worker
         *   `transferSize`           porte TOUJOURS `transferSize: 0`, qu'il
         *                            soit allé au réseau ou non ; et ses
         *                            propres requêtes ne sont pas dans le
         *                            `performance` de la page. Annonçait 1.
         *   le tampon de             250 entrées par défaut. Plein, il cesse
         *   `performance`            d'enregistrer sans rien dire, et l'on
         *                            prend son silence pour un zéro.
         *
         * Le seul qui sache est celui qui répond : `siteEssai.php` journalise
         * chaque requête servie, et l'on compte ses lignes.
         */
        requetesServies() {
            if (!info || !info.bac) return 0;
            try {
                return (readFileSync(info.bac + '/log', 'utf8')
                    .match(/\]: (GET|POST) /g) || []).length;
            } catch (e) { return 0; }
        },

        /**
         * ATTEND QUE LE SERVEUR SE TAISE, avant de prendre un repère.
         *
         * QUATRIÈME COMPTAGE FAUX, ET C'EST LE MÊME COUPABLE QUE PARTOUT
         * AILLEURS DANS CE FICHIER : la page déjà chargée garde son service
         * worker, qui RANGE en arrière-plan pendant une dizaine de secondes
         * (`index.html` lui envoie la liste à huit secondes). Un repère pris
         * aussitôt compte ce rangement-là dans la mesure suivante : 271
         * requêtes annoncées pour une préparation qui en fait 38.
         *
         * @returns {Promise<number>} le compte, une fois qu'il ne bouge plus
         */
        async attendreLeCalme(plafondMs = 60000) {
            let n = this.requetesServies();
            const fin = Date.now() + plafondMs;
            while (Date.now() < fin) {
                await dormir(1500);
                const m = this.requetesServies();
                if (m === n) return n;
                n = m;
            }
            return n;
        },

        async fermer() {
            await nav.close();
            // ON NE TUE QUE CE QU'ON A LANCÉ — ET TOUT CE QU'ON A LANCÉ.
            //
            // Un `pkill -f siteEssai` emporte le site d'une autre sonde qui
            // tourne en même temps, et l'on passe vingt minutes à croire que le
            // serveur est cassé. Mais tuer le seul processus qu'on a lancé n'y
            // suffit pas non plus : `siteEssai.php` démarre un `php -S` qui a
            // ses propres ouvriers, et ceux-là survivent à leur père. MESURÉ
            // après trois sondes dans la même séance : 60 `routeurEssai.php`
            // encore vivants, et deux `siteEssai.php` dont le plus vieux avait
            // trente-neuf minutes.
            //
            // LE GROUPE DE PROCESSUS EST LA RÉPONSE, et il est exact là où un
            // motif est approximatif : `detached` fait du site le chef de son
            // propre groupe, et `kill(-pid)` emporte le groupe entier — le
            // sien, jamais celui d'une autre sonde.
            try { process.kill(-serveur.pid, 'SIGTERM'); }
            catch (e) {
                try { serveur.kill(); } catch (e2) { /* déjà parti */ }
            }
        }
    };
    return sonde;
}

/** Monte `tools/siteEssai.php` et attend sa ligne JSON. */
async function monterLeSite() {
    // LE PORT N'EST PAS TIRÉ AU HASARD À L'AVEUGLE : on le demande à
    // `siteEssai.php`, qui l'imprime. Deux sondes lancées à la même seconde
    // tiraient le même numéro une fois sur cent, et la seconde mesurait le site
    // de la première.
    const port = String(9000 + Math.floor(Math.random() * 900));
    // `detached` : voir `fermer()`. Le site devient chef de son propre groupe de
    // processus, et c'est la seule façon d'emporter ses ouvriers `php -S` sans
    // tuer au motif ce qui ne nous appartient pas.
    const serveur = spawn('php', ['tools/siteEssai.php', port],
        { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const info = await new Promise((ok, ko) => {
        const minuteur = setTimeout(() => ko(new Error('le site d\'essai n\'a rien dit en 30 s')), 30000);
        let tampon = '';
        serveur.stdout.on('data', d => {
            tampon += d;
            const m = /\{[^\n]*"port"[^\n]*\}/.exec(tampon);
            if (m) { clearTimeout(minuteur); try { ok(JSON.parse(m[0])); } catch (e) { ok({}); } }
        });
        serveur.on('error', ko);
    });
    await dormir(400);
    return { port: info.port || port, info, serveur };
}

/**
 * Combien de teintes distinctes dans un PNG ? Une seule, c'est une image vide.
 *
 * On décode le PNG à la main plutôt que d'ajouter une dépendance : « on
 * n'ajoute pas de dépendance sans une raison qu'on peut écrire », et compter
 * des couleurs n'en est pas une. Seuls les PNG que Playwright écrit nous
 * intéressent : 8 bits, RVBA, non entrelacés.
 */
export function compterLesTeintes(chemin) {
    const h = couleursDe(chemin);
    return h ? h.length : -1;
}

/**
 * L'histogramme des couleurs d'un PNG, de la plus fréquente à la plus rare.
 *
 * On décode le PNG à la main plutôt que d'ajouter une dépendance : « on
 * n'ajoute pas de dépendance sans une raison qu'on peut écrire », et compter
 * des couleurs n'en est pas une. Seuls les PNG que Playwright écrit nous
 * intéressent : 8 bits par voie, RVB ou RVBA, non entrelacés — tout le reste
 * rend `null`, et l'appelant le voit plutôt que de recevoir du bruit.
 *
 * @returns {{c:number[], n:number}[]|null}
 */
/**
 * LE PNG DÉCODÉ, PIXEL PAR PIXEL.
 *
 * `couleursDe` rend un HISTOGRAMME : il dit quelles couleurs sont là, jamais
 * OÙ elles sont. Pour « la barre et le crochet se rejoignent-ils ? », il faut
 * la géométrie de l'encre — le haut du noir, colonne par colonne —, et la
 * réponse ne peut pas venir de `getBoundingClientRect` : la BOÎTE d'un SVG
 * n'est pas son TRAIT, et c'est précisément l'écart qu'on cherche.
 *
 * Le décodage était déjà écrit, enfermé dans `couleursDe`. Il en sort pour que
 * la prochaine mesure de forme ne le réécrive pas : c'est la troisième fois
 * qu'une question de Rémy porte sur un alignement de deux traits.
 *
 * @returns {{largeur:number, hauteur:number, voies:number, data:Buffer,
 *            px:(x:number,y:number)=>number[],
 *            sombre:(x:number,y:number,seuil?:number)=>boolean,
 *            hautDeLEncre:(x:number,seuil?:number)=>?number}|null}
 */
export function decoderPng(chemin) {
    const d = readFileSync(chemin);
    let i = 8, largeur = 0, hauteur = 0, couleur = 6, profondeur = 8;
    const morceaux = [];
    while (i < d.length) {
        const taille = d.readUInt32BE(i);
        const type = d.toString('ascii', i + 4, i + 8);
        if (type === 'IHDR') {
            largeur = d.readUInt32BE(i + 8); hauteur = d.readUInt32BE(i + 12);
            profondeur = d[i + 16]; couleur = d[i + 17];
        } else if (type === 'IDAT') morceaux.push(d.subarray(i + 8, i + 8 + taille));
        else if (type === 'IEND') break;
        i += taille + 12;
    }
    if (profondeur !== 8 || (couleur !== 6 && couleur !== 2)) return null;
    const voies = couleur === 6 ? 4 : 3;
    const brut = zlib.inflateSync(Buffer.concat(morceaux));
    const ligne = largeur * voies;
    const data = Buffer.alloc(hauteur * ligne);
    const precedent = Buffer.alloc(ligne);
    let p = 0;
    for (let y = 0; y < hauteur; y++) {
        const filtre = brut[p++];
        const courant = Buffer.from(brut.subarray(p, p + ligne));
        p += ligne;
        // LES CINQ FILTRES DU FORMAT PNG, et l'on ne peut en sauter aucun :
        // chaque ligne est encodée comme une différence avec ses voisines.
        for (let x = 0; x < ligne; x++) {
            const a = x >= voies ? courant[x - voies] : 0;
            const b = precedent[x];
            const c = x >= voies ? precedent[x - voies] : 0;
            if (filtre === 1) courant[x] = (courant[x] + a) & 255;
            else if (filtre === 2) courant[x] = (courant[x] + b) & 255;
            else if (filtre === 3) courant[x] = (courant[x] + ((a + b) >> 1)) & 255;
            else if (filtre === 4) {
                const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b),
                    pc = Math.abs(pp - c);
                courant[x] = (courant[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
            }
        }
        courant.copy(data, y * ligne);
        courant.copy(precedent);
    }
    const px = (x, y) => {
        const o = y * ligne + x * voies;
        return voies === 4
            ? [data[o], data[o + 1], data[o + 2], data[o + 3]]
            : [data[o], data[o + 1], data[o + 2], 255];
    };
    const sombre = (x, y, seuil = 150) => {
        const c = px(x, y);
        // Un pixel transparent n'a pas de couleur à l'écran : le compter, c'est
        // inventer un fond noir qui n'existe pas.
        return c[3] >= 40 && (c[0] + c[1] + c[2]) / 3 < seuil;
    };
    return {
        largeur, hauteur, voies, data, px, sombre,
        /** La première ligne où cette colonne est encrée, ou `null`. */
        hautDeLEncre(x, seuil = 150) {
            for (let y = 0; y < hauteur; y++) if (sombre(x, y, seuil)) return y;
            return null;
        },
        /** La dernière ligne où cette colonne est encrée, ou `null`. */
        basDeLEncre(x, seuil = 150) {
            for (let y = hauteur - 1; y >= 0; y--) if (sombre(x, y, seuil)) return y;
            return null;
        }
    };
}

export function couleursDe(chemin) {
    const d = readFileSync(chemin);
    let i = 8, largeur = 0, hauteur = 0, couleur = 6, profondeur = 8;
    const morceaux = [];
    while (i < d.length) {
        const taille = d.readUInt32BE(i);
        const type = d.toString('ascii', i + 4, i + 8);
        if (type === 'IHDR') {
            largeur = d.readUInt32BE(i + 8); hauteur = d.readUInt32BE(i + 12);
            profondeur = d[i + 16]; couleur = d[i + 17];
        } else if (type === 'IDAT') morceaux.push(d.subarray(i + 8, i + 8 + taille));
        else if (type === 'IEND') break;
        i += taille + 12;
    }
    // ON REND `null` PLUTÔT QU'UNE APPROXIMATION. Un PNG 16 bits ou entrelacé
    // se lit autrement ; prétendre le compter rendrait des chiffres faux, et
    // des chiffres faux sont pires que pas de chiffre.
    if (profondeur !== 8 || (couleur !== 6 && couleur !== 2)) return null;
    const voies = couleur === 6 ? 4 : 3;
    const brut = zlib.inflateSync(Buffer.concat(morceaux));
    const ligne = largeur * voies;
    const compte = new Map();
    const precedent = Buffer.alloc(ligne);
    let p = 0;
    for (let y = 0; y < hauteur; y++) {
        const filtre = brut[p++];
        const courant = Buffer.from(brut.subarray(p, p + ligne));
        p += ligne;
        // LES CINQ FILTRES DU FORMAT PNG, et l'on ne peut en sauter aucun :
        // chaque ligne est encodée comme une différence avec ses voisines.
        // Lire les octets sans défiltrer, c'est lire du bruit — et conclure
        // qu'une image unie ne l'est pas, ce qui est exactement l'erreur que
        // cette fonction existe pour empêcher.
        for (let x = 0; x < ligne; x++) {
            const a = x >= voies ? courant[x - voies] : 0;
            const b = precedent[x];
            const c = x >= voies ? precedent[x - voies] : 0;
            if (filtre === 1) courant[x] = (courant[x] + a) & 255;
            else if (filtre === 2) courant[x] = (courant[x] + b) & 255;
            else if (filtre === 3) courant[x] = (courant[x] + ((a + b) >> 1)) & 255;
            else if (filtre === 4) {
                const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
                courant[x] = (courant[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
            }
        }
        for (let x = 0; x < ligne; x += voies) {
            // Un pixel transparent n'a pas de couleur à l'écran : le compter,
            // c'est inventer un fond noir qui n'existe pas.
            if (voies === 4 && courant[x + 3] < 8) continue;
            const clef = (courant[x] << 16) | (courant[x + 1] << 8) | courant[x + 2];
            compte.set(clef, (compte.get(clef) || 0) + 1);
        }
        courant.copy(precedent);
    }
    return [...compte.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => ({ c: [(k >> 16) & 255, (k >> 8) & 255, k & 255], n }));
}
