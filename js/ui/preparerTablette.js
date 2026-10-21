// PRÉPARER UNE TABLETTE POUR LA CLASSE SANS INTERNET.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, pour sa sœur institutrice : « Non chaque tablette est indépendante ».
// Pas de gestionnaire d'école, donc vingt-cinq préparations à la main.
//
// ── CE QUI A RENDU CETTE PAGE NÉCESSAIRE, ET QUI EST UNE MESURE ────────────
//
// On ouvre la page, on ne fait rien d'autre, on coupe le réseau :
//
//   cache du service worker   258 fichiers, dont 124 générateurs
//   de js/games/              DEUX fichiers sur 91 (3,4 Mo au total)
//   et il ne grossit pas      même compte à 2, 5, 10, 20, 35 et 60 secondes
//   hors ligne, un parcours   s'ouvre et se joue, JEU COMPRIS, 0 erreur
//
// LES DEUX DERNIÈRES LIGNES SE CONTREDISENT, et c'est tout le sujet. Le jeu ne
// vient pas de NOTRE cache — il n'y est pas — mais de celui du NAVIGATEUR,
// que personne ne contrôle et que le système vide en premier quand la place
// manque. Une sonde plus pressée, coupant six secondes après l'ouverture, a
// d'ailleurs vu le même module ÉCHOUER à se charger.
//
// CE QUI MARCHE AUJOURD'HUI MARCHE PAR CHANCE. Et une tablette mal préparée a
// exactement l'air d'une tablette prête : on ne le découvre qu'en classe,
// sans rien pouvoir faire.
//
// ── CE QUE CETTE PAGE FAIT, ET POURQUOI DANS CET ORDRE ─────────────────────
//
// Elle ne décrit pas, elle AGIT, et elle dit ce qu'elle a obtenu. Quatre
// lignes, chacune avec son état : installer, tout mettre en mémoire,
// autoriser la caméra, et le verdict.
//
// LA LISTE DES EXERCICES NE S'ÉCRIT PAS ICI. On demande au registre les
// activités qu'il connaît et l'on appelle leur `load()` : une liste recopiée
// serait juste le jour où on l'écrit et fausse au premier exercice ajouté —
// c'est la leçon du bandeau des icônes, qui se construit à partir des boutons
// eux-mêmes.
//
// ET LE VERDICT COMPTE VRAIMENT. On relit le cache du service worker AVANT et
// APRÈS : « 258 → 347 fichiers gardés » est un fait, pas une promesse. Une
// page de préparation qui se contenterait d'annoncer « prête » serait le
// défaut qu'elle prétend corriger.

import { allActivities } from '../core/registry.js';
import { qrcodeSVG } from '../core/qrcode.js';
import { peutSInstaller, proposerLInstallation, estDejaInstallee } from './installer.js';
import { marquerLaPreparation, compterLesJeuxGardes } from './prepaPerdue.js';

/** La page a-t-elle été ouverte pour préparer une tablette ? */
export function cEstUnePreparation(recherche) {
    const s = recherche !== undefined ? recherche
        : (typeof location !== 'undefined' ? location.search : '');
    try { return new URLSearchParams(s).has('preparer'); } catch (e) { return false; }
}

/** Combien de fichiers le service worker garde-t-il en ce moment ? */
export async function fichiersGardes() {
    if (typeof caches === 'undefined') return 0;
    try {
        const noms = await caches.keys();
        let n = 0;
        for (const nom of noms) n += (await (await caches.open(nom)).keys()).length;
        return n;
    } catch (e) { return 0; }
}

/**
 * CHARGE TOUTES LES ACTIVITÉS, QUATRE À LA FOIS.
 *
 * QUATRE, ET NON QUATRE-VINGT-ONZE : sur le wifi d'une école, lancer
 * quatre-vingt-onze requêtes d'un coup fait tomber la file d'attente du
 * navigateur et allonge le tout au lieu de l'accélérer — sans compter les
 * vingt-quatre autres tablettes qui font la même chose dans la même salle.
 *
 * @param {(faits:number, total:number)=>void} [dire] appelé à chaque module
 * @returns {Promise<{faits:number, total:number, manques:string[]}>}
 */
export async function chargerToutesLesActivites(dire, quoi) {
    const liste = (quoi || allActivities()).filter(a => typeof a.load === 'function');
    const total = liste.length;
    const manques = [];
    let faits = 0;
    const DE_FRONT = 4;
    let suivant = 0;
    const ouvrier = async () => {
        while (suivant < total) {
            const a = liste[suivant++];
            try { await a.load(); }
            catch (e) { manques.push(a.id); }
            faits++;
            if (dire) dire(faits, total);
            // ON REND LA MAIN ENTRE DEUX MODULES.
            //
            // Charger un module, c'est l'ÉVALUER, et cela se fait sur le fil
            // principal — celui qui peint. MESURÉ : sans cette ligne, la page
            // restait UNIE (une seule teinte, donc vide) deux secondes
            // durant, compteur compris. Sur la tablette d'une école, ce
            // serait pire — et un écran blanc est exactement ce que cette
            // page existe pour éviter.
            await new Promise(r => setTimeout(r, 0));
        }
    };
    await Promise.all(Array.from({ length: Math.min(DE_FRONT, total) }, ouvrier));
    return { faits, total, manques };
}

/**
 * DEMANDE LA CAMÉRA, PUIS L'ÉTEINT TOUT DE SUITE.
 *
 * On ne veut pas filmer : on veut que l'autorisation soit DONNÉE, une fois,
 * pendant la préparation — et non vingt-cinq fois au milieu d'une leçon, par
 * des enfants de neuf ans qui ne savent pas ce qu'on leur demande.
 */
export async function demanderLaCamera() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices
        || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        return { ok: false, pourquoi: 'Cet appareil n\'a pas de caméra utilisable ici.' };
    }
    try {
        const flux = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }, audio: false });
        flux.getTracks().forEach(p => p.stop());
        return { ok: true };
    } catch (e) {
        const nom = (e && e.name) || '';
        return { ok: false, pourquoi: nom === 'NotAllowedError'
            ? 'La caméra a été refusée. On peut l\'autoriser plus tard, au moment de scanner.'
            : 'La caméra n\'a pas répondu. Le code se tape aussi à la main.' };
    }
}

/**
 * DIT AU SERVICE WORKER DE RANGER CE QU'ON VIENT DE CHARGER.
 *
 * LE PIÈGE QUE CETTE FONCTION ÉVITE, et il est déjà écrit dans `index.html` :
 * un service worker ne voit pas les requêtes faites AVANT son activation.
 * Charger quatre-vingt-onze modules ne suffit donc PAS à les garder — au tout
 * premier passage, ils arrivent sans passer par lui, et le cache reste comme
 * avant. Mesuré ici : « 126 exercices chargés, mais rien n'est gardé ».
 *
 * La page, elle, sait ce qu'elle a chargé : `performance` le dit. On lui
 * envoie la liste, ce que la page d'accueil fait déjà au bout de huit
 * secondes — trop tard et trop incertain pour une préparation qu'on fait
 * vingt-cinq fois de suite et dont on attend un verdict.
 *
 * `registration.active` ET NON `controller` : au tout premier passage, la
 * page n'est pas encore contrôlée, et c'est précisément ce passage-là qu'il
 * faut servir.
 */
export async function rangerCeQuiEstCharge() {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return 0;
    let reg = null;
    try { reg = await navigator.serviceWorker.ready; } catch (e) { return 0; }
    const sw = navigator.serviceWorker.controller || (reg && reg.active);
    if (!sw) return 0;
    let liste = [];
    try {
        liste = performance.getEntriesByType('resource').map(r => r.name)
            .filter(u => u.startsWith(location.origin)
                && /\.(js|css|woff2?|png|svg|json)(\?|$)/.test(u));
    } catch (e) { return 0; }
    if (!liste.length) return 0;
    sw.postMessage({ type: 'garnir', liste });
    return liste.length;
}

/**
 * ATTEND QUE LE RANGEMENT S'ARRÊTE DE GROSSIR.
 *
 * `garnir` range les fichiers UN PAR UN et ne répond rien — c'est un envoi
 * sans accusé. On regarde donc le compte, et l'on s'arrête quand il ne bouge
 * plus deux fois de suite. Le plafond est là pour qu'une tablette lente finisse
 * par rendre la main plutôt que de tourner indéfiniment devant la maîtresse.
 */
async function attendreLeRangement(plafondMs = 45000) {
    const debut = Date.now();
    let dernier = -1, stable = 0;
    while (Date.now() - debut < plafondMs) {
        await new Promise(r => setTimeout(r, 500));
        const n = await fichiersGardes();
        if (n === dernier) { if (++stable >= 2) return n; }
        else { stable = 0; dernier = n; }
    }
    return dernier;
}

const COCHE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m4 13 5 5L20 7"/></svg>`;

/**
 * LE VERDICT, ET IL N'EST JAMAIS COMPLAISANT.
 *
 * Pur, et à part : c'est la seule phrase que la maîtresse lira vingt-cinq
 * fois, et c'est donc la seule qu'il faut pouvoir éprouver sans navigateur.
 *
 * DEUX FAÇONS DE N'ÊTRE PAS PRÊTE, et la seconde est celle qu'on a mesurée :
 * les modules se chargent très bien, et RIEN n'est gardé — un service worker
 * ne voit pas les requêtes faites avant son activation. Une page qui dirait
 * « prête » là-dessus serait exactement le défaut qu'elle prétend corriger.
 *
 * @param {{faits:number, manques:string[], gardien:boolean}} etat
 */
export function direLeVerdict({ faits = 0, manques = [], gardien = false } = {}) {
    if (manques.length) {
        return { etat: 'rate',
            memoire: `${manques.length} exercice(s) n'ont pas pu être chargés. `
                + 'Vérifie la connexion et recharge la page.',
            mot: 'Cette tablette n\'est PAS prête.' };
    }
    if (!gardien) {
        return { etat: 'rate',
            memoire: `${faits} exercices chargés, mais rien n'est gardé : recharge `
                + 'la page une fois, puis recommence.',
            mot: 'Cette tablette n\'est PAS prête.' };
    }
    return { etat: 'ok', memoire: null,
        mot: 'Cette tablette est prête à travailler sans internet.' };
}

/** Une ligne de la liste : son état, son mot, et ce qu'on peut y faire. */
function ligne(cle, titre, mot) {
    return `<li class="prep-ligne" data-cle="${cle}">
        <span class="prep-etat" data-etat="attente"><span class="prep-rond"></span></span>
        <span class="prep-corps">
            <b class="prep-titre">${titre}</b>
            <span class="prep-mot" data-mot>${mot}</span>
            <span class="prep-geste" data-geste></span>
        </span></li>`;
}

/**
 * MONTE L'ÉCRAN DE PRÉPARATION, à la place de l'application.
 *
 * On remplace le corps de la page plutôt que d'ouvrir une fenêtre : cette
 * page N'EST QUE cela, et une tablette qu'on prépare n'a rien d'autre à
 * montrer. C'est aussi ce qui permet d'y arriver par un QR projeté, sans
 * avoir à expliquer où cliquer ensuite.
 */
export async function ouvrirLaPreparation(racine = document.body) {
    document.documentElement.classList.add('ecran-preparation');
    const avant = await fichiersGardes();
    const adresse = location.origin + location.pathname + '?preparer';

    racine.innerHTML = `
        <main class="prep-page">
            <h1 class="prep-h1">Préparer cette tablette</h1>
            <p class="prep-sous">Trois gestes, une seule fois. Ensuite, AtoutMath
                marchera sans internet.</p>
            <ol class="prep-liste">
                ${ligne('installer', 'Mettre AtoutMath sur l\'écran d\'accueil',
        'Pour la retrouver sans taper d\'adresse — et pour que la mémoire ne s\'efface pas.')}
                ${ligne('memoire', 'Mettre tous les exercices en mémoire',
        'Environ 3 Mo. C\'est ce qui manque le plus souvent, et cela ne se voit pas.')}
                ${ligne('camera', 'Autoriser la caméra',
        'Pour scanner le QR code de la maîtresse sans être interrompu en classe.')}
            </ol>
            <p class="prep-verdict" data-verdict role="status" aria-live="polite"></p>
            <section class="prep-qr">
                <p class="prep-qr-mot">Pour les autres tablettes&nbsp;: montre-leur ce QR code.</p>
                ${qrcodeSVG(adresse, { module: 6, marge: 4, titre: 'Préparer une tablette' })}
                <code class="prep-adresse">${adresse.replace(/[<&]/g, '')}</code>
            </section>
        </main>`;

    // ON PEINT AVANT DE CHARGER. Deux images d'attente : la première laisse
    // le navigateur composer ce qu'on vient d'écrire, la seconde garantit
    // qu'elle est bien passée à l'écran. Sans elles, la maîtresse regarde un
    // rectangle vide pendant que la tablette travaille — et elle a toutes les
    // raisons de croire que c'est cassé.
    const peindre = () => new Promise(r => requestAnimationFrame(
        () => requestAnimationFrame(() => setTimeout(r, 0))));
    await peindre();

    const laLigne = (cle) => racine.querySelector(`.prep-ligne[data-cle="${cle}"]`);
    const poser = (cle, etat, mot, geste) => {
        const l = laLigne(cle);
        if (!l) return;
        l.querySelector('.prep-etat').dataset.etat = etat;
        if (etat === 'fait') l.querySelector('.prep-etat').innerHTML = COCHE;
        if (mot !== undefined) l.querySelector('[data-mot]').textContent = mot;
        const g = l.querySelector('[data-geste]');
        if (geste === null) g.innerHTML = '';
        else if (geste) { g.innerHTML = ''; g.appendChild(geste); }
    };
    const bouton = (texte, faire) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-toggle active prep-bouton';
        b.textContent = texte;
        b.onclick = faire;
        return b;
    };

    // ── 1. L'INSTALLATION ───────────────────────────────────────────────
    const direLInstallation = () => {
        if (estDejaInstallee()) {
            poser('installer', 'fait', 'C\'est fait : AtoutMath a son icône.', null);
        } else if (peutSInstaller()) {
            poser('installer', 'attente', undefined, bouton('Installer', async () => {
                const pose = await proposerLInstallation();
                if (pose) poser('installer', 'fait', 'C\'est fait : AtoutMath a son icône.', null);
                else direLInstallation();
            }));
        } else {
            // NI INSTALLÉE, NI INSTALLABLE POUR L'INSTANT. On ne ment pas :
            // sur Android l'offre arrive au bout de quelques secondes, et
            // `installer.js` repose le bouton quand elle arrive.
            poser('installer', 'attente',
                'Ce navigateur ne le propose pas encore — la suite marche quand même.', null);
        }
    };
    direLInstallation();
    window.addEventListener('beforeinstallprompt', () => setTimeout(direLInstallation, 0));

    // ── 3. LA CAMÉRA (posée avant la mémoire : elle attend un doigt) ─────
    poser('camera', 'attente', undefined, bouton('Autoriser la caméra', async (ev) => {
        ev.target.disabled = true;
        const r = await demanderLaCamera();
        if (r.ok) poser('camera', 'fait', 'C\'est fait.', null);
        else poser('camera', 'rate', r.pourquoi, null);
    }));

    // ── 2. LA MÉMOIRE, qui part toute seule : c'est le long, et c'est
    //       celui qu'on oublierait de lancer.
    const verdict = racine.querySelector('[data-verdict]');
    poser('memoire', 'encours', 'En cours…', null);
    const r = await chargerToutesLesActivites((faits, total) => {
        poser('memoire', 'encours', `${faits} sur ${total} exercices…`);
    });
    poser('memoire', 'encours', 'On range tout en mémoire…');
    const envoyes = await rangerCeQuiEstCharge();
    const apres = envoyes ? await attendreLeRangement() : await fichiersGardes();

    // LE SERVICE WORKER EST-IL SEULEMENT LÀ ? Sans lui, tout ce qu'on vient de
    // charger est dans le cache du navigateur, c'est-à-dire nulle part de sûr.
    const gardien = envoyes > 0;

    const v = direLeVerdict({ faits: r.faits, manques: r.manques, gardien });
    poser('memoire', v.etat === 'ok' ? 'fait' : 'rate',
        v.memoire || `${r.faits} exercices gardés — ${avant} puis ${apres} fichiers en mémoire.`,
        null);
    verdict.dataset.etat = v.etat;
    verdict.textContent = v.mot;

    // LA MARQUE, ET SEULEMENT SUR UN BON VERDICT. C'est elle qui autorisera le
    // bandeau de `prepaPerdue.js` à parler le jour où une mise à jour n'aura
    // pas tout reprise. Posée sur un échec, elle ferait crier ce bandeau au
    // rechargement suivant — pour une préparation qui n'a jamais eu lieu.
    const jeux = v.etat === 'ok' ? await compterLesJeuxGardes() : 0;
    if (jeux) marquerLaPreparation(jeux);
    return { avant, apres, ...r, gardien: !!gardien, jeux };
}
