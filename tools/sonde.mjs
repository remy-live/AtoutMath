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

    const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await nav.newContext({
        viewport: { width: largeur, height: hauteur },
        deviceScaleFactor: 2, hasTouch: doigt, isMobile: doigt
    });
    const page = await ctx.newPage();

    const erreurs = [];
    const fenetresNatives = [];
    page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
    // « tu utilises des alert et prompt, on évite ! » — une sonde qui n'écoute
    // pas les fenêtres natives ne verra jamais celle qui reviendra.
    page.on('dialog', async d => { fenetresNatives.push(d.message()); await d.dismiss(); });

    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    if (o.theme) await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), o.theme);

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
            await dormir(500);
            return dit;
        },

        /** Bascule un thème (ou revient au thème clair avec `null`). */
        async theme(nom) {
            await page.evaluate(t => {
                if (t) document.documentElement.setAttribute('data-theme', t);
                else document.documentElement.removeAttribute('data-theme');
            }, nom || null);
            await dormir(220);
        },

        /** Ouvre un exercice comme le meneur le ferait, et clique « JOUER ». */
        async ouvrirExercice(id, params = {}) {
            const raté = await page.evaluate(async ([exoId, p]) => {
                if (window.__sondeRunner) { try { window.__sondeRunner.exit(); } catch (e) {} }
                await new Promise(ok => setTimeout(ok, 260));
                const { getExerciseById } = await import('./js/data/catalog.js');
                const exo = getExerciseById(exoId);
                if (!exo) return 'inconnu au catalogue';
                const { makeStep, makePath } = await import('./js/core/path.js');
                const { politiquePerso } = await import('./js/core/mesExercices.js');
                const { Runner } = await import('./js/core/runner.js');
                const pas = makeStep(exo.id, p, { stepId: 's1', nbItems: 8, threshold: 0 });
                window.__sondeRunner = new Runner({
                    path: makePath('Sonde', [pas], politiquePerso()), deviceMode: 'none' });
                window.__sondeRunner.start();
                return null;
            }, [id, params]);
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
            let r = await el.boundingBox();
            if (!r || r.width < 2 || r.height < 2) return null;
            const t = page.viewportSize();
            const x = Math.max(0, r.x - marge), y = Math.max(0, r.y - marge);
            const dossier = dirname(chemin);
            if (dossier && !existsSync(dossier)) mkdirSync(dossier, { recursive: true });
            await page.screenshot({ path: chemin, clip: {
                x, y,
                width: Math.min(t.width - x, r.width + marge * 2),
                height: Math.min(t.height - y, r.height + marge * 2) } });
            const teintes = compterLesTeintes(chemin);
            return { teintes, unie: teintes < 3 };
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

        async fermer() {
            await nav.close();
            // ON NE TUE QUE CE QU'ON A LANCÉ. Un `pkill -f siteEssai` emporte
            // le site d'une autre sonde qui tourne en même temps — et l'on
            // passe vingt minutes à croire que le serveur est cassé.
            try { serveur.kill(); } catch (e) { /* déjà parti */ }
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
    const serveur = spawn('php', ['tools/siteEssai.php', port], { stdio: ['ignore', 'pipe', 'pipe'] });
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
