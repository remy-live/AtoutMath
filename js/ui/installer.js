// METTRE ATOUTMATH SUR L'ÉCRAN D'ACCUEIL.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, pour les tablettes hors ligne de sa sœur institutrice : « Et on peut
// pas faire qqch qui s installe tout seul sur la tablette ». Puis, la question
// posée : « Oui ».
//
// RIEN NE S'INSTALLE TOUT SEUL — c'est le système d'exploitation qui
// l'interdit, et c'est tant mieux. Mais TOUT ÉTAIT DÉJÀ EN PLACE ici sauf le
// bouton : `manifest.webmanifest` est complet (nom, `start_url`, `scope`,
// `display: standalone`, trois icônes qui existent sur le disque) et le
// service worker garde 257 fichiers. L'application EST installable ; on ne le
// PROPOSAIT nulle part.
//
// ── POURQUOI CELA COMPTE PLUS QU'UNE ICÔNE SUR UN ÉCRAN ────────────────────
//
// Une tablette sans réseau ne garde l'application que si son navigateur garde
// son cache, et un navigateur vide le cache d'un site qu'on visite rarement.
// Installée, l'application devient une application : son cache ne s'évapore
// plus, elle s'ouvre en plein écran, et l'élève la retrouve sans avoir à
// taper une adresse. C'est la différence entre « ça marchait la semaine
// dernière » et « ça marche ».
//
// ── DEUX MONDES, ET UN SEUL BOUTON ─────────────────────────────────────────
//
// ANDROID / CHROME donne un vrai événement, `beforeinstallprompt`, qu'on peut
// garder sous le coude et déclencher au clic. Un tap, et c'est fait.
//
// iPAD / SAFARI n'a AUCUNE API. La seule voie est « Partager → Sur l'écran
// d'accueil », à la main. On ne peut donc pas installer à sa place — mais on
// peut lui dire exactement où appuyer, ce qui est tout ce qui manquait.
//
// LE BOUTON NE PARAÎT QUE S'IL PEUT SERVIR : pas quand l'application est déjà
// installée, et pas sur un navigateur qui ne sait ni l'un ni l'autre — un
// bouton qui ouvre une fenêtre pour dire « impossible » est un bouton qu'il
// ne fallait pas montrer. Même règle que le scanner, pour la même raison.

import { showModal } from './modal.js';

/**
 * CET APPAREIL EST-IL UN APPAREIL D'APPLE À ÉCRAN TACTILE ?
 *
 * Pure, et prend ses deux entrées en argument : c'est la seule façon de
 * l'éprouver sans navigateur, et la détection d'appareil est précisément le
 * genre de code qu'on n'éprouve jamais et qui se trompe en silence.
 *
 * L'iPAD SE DÉCLARE « MACINTOSH » depuis iPadOS 13 — la chaîne
 * d'identification ne dit plus « iPad ». Ce qui le trahit est le nombre de
 * points de contact : un Mac en annonce 0, un iPad 5. Sans cette ligne, tous
 * les iPad du monde recevraient la notice d'un ordinateur de bureau.
 *
 * @param {string} chaine `navigator.userAgent`
 * @param {number} points `navigator.maxTouchPoints`
 */
export function estAppleTactile(chaine, points) {
    const ua = String(chaine || '');
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return /Macintosh/.test(ua) && Number(points) > 1;
}

/**
 * L'APPLICATION TOURNE-T-ELLE DÉJÀ INSTALLÉE ?
 *
 * Deux signaux, et il faut les deux : `display-mode: standalone` est la
 * réponse de tout le monde, et `navigator.standalone` est celle d'Apple, qui
 * n'a jamais implémenté la première pour les applications posées sur l'écran
 * d'accueil. Un seul des deux laisse la moitié des tablettes croire qu'elles
 * ne sont pas installées, et leur remontre le bouton tous les jours.
 */
export function estDejaInstallee(fenetre = (typeof window !== 'undefined' ? window : null)) {
    if (!fenetre) return false;
    if (fenetre.navigator && fenetre.navigator.standalone === true) return true;
    if (typeof fenetre.matchMedia !== 'function') return false;
    try { return fenetre.matchMedia('(display-mode: standalone)').matches; }
    catch (e) { return false; }
}

/** L'événement mis de côté par la capture écrite dans la page — ou `null`. */
const lEvenement = () => (typeof window !== 'undefined' ? window.__installAtoutMath : null) || null;

/**
 * Y A-T-IL QUELQUE CHOSE À PROPOSER ? Appelée avant de montrer le bouton.
 *
 * Trois cas, et seulement trois : déjà installée (non), un événement sous le
 * coude (oui), un appareil d'Apple à qui l'on peut au moins montrer le geste
 * (oui). Tout le reste — un Firefox de bureau, un navigateur intégré à une
 * autre application — ne sait rien faire, et se tait.
 */
export function peutSInstaller() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    if (estDejaInstallee()) return false;
    if (lEvenement()) return true;
    return estAppleTactile(navigator.userAgent, navigator.maxTouchPoints);
}

/** La notice d'Apple : on ne peut pas le faire à sa place, on montre où. */
function montrerLaNotice() {
    const partage = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
        style="vertical-align:-5px"><path d="M12 16V3"/><path d="m8 7 4-4 4 4"/>
        <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`;
    showModal('Mettre AtoutMath sur l\'écran d\'accueil', `
        <p class="inst-texte">Sur iPad et iPhone, c'est toi qui le fais — en
            deux gestes&nbsp;:</p>
        <ol class="inst-pas">
            <li>Appuie sur le bouton <b>Partager</b> ${partage}, en haut ou en
                bas de l'écran.</li>
            <li>Descends dans la liste et choisis
                <b>«&nbsp;Sur l'écran d'accueil&nbsp;»</b>.</li>
        </ol>
        <p class="inst-texte inst-texte--apres">AtoutMath aura alors son icône,
            comme les autres applications — et elle marchera <b>sans
            internet</b>.</p>`, { width: '440px', zIndex: 999999 });
}

/**
 * PROPOSE L'INSTALLATION. Au clic, et jamais avant.
 *
 * Une demande d'installation qui surgit sans qu'on ait rien demandé s'apprend
 * à refuser — et une fois refusée, le navigateur ne la repropose plus de la
 * journée.
 *
 * @returns {Promise<boolean>} vrai si l'appareil a accepté d'installer
 */
export async function proposerLInstallation() {
    const e = lEvenement();
    if (!e) { montrerLaNotice(); return false; }
    try {
        e.prompt();
        const choix = await e.userChoice;
        // UN `beforeinstallprompt` NE SERT QU'UNE FOIS : le rappeler jette. On
        // le jette donc nous-mêmes, et `peutSInstaller` redevient faux —
        // c'est-à-dire que le bouton disparaît, ce qui est exactement ce
        // qu'on veut après un « oui ».
        window.__installAtoutMath = null;
        document.documentElement.classList.remove('peut-s-installer');
        return !!choix && choix.outcome === 'accepted';
    } catch (err) {
        window.__installAtoutMath = null;
        montrerLaNotice();
        return false;
    }
}

/**
 * POSE LE BOUTON DANS UN ÉLÉMENT, s'il y a quelque chose à proposer.
 *
 * Rend le bouton posé, ou `null`. Les appelants n'ont donc aucune condition à
 * écrire de leur côté : c'est ici, une fois, et les deux écrans d'où l'on
 * peut installer ne peuvent pas diverger.
 */
export function poserLeBoutonDInstallation(ou, { texte = 'Installer sur cet appareil' } = {}) {
    if (!ou || !peutSInstaller()) return null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-toggle inst-bouton';
    b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3v12"/><path d="m8 11 4 4 4-4"/>
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
        <span></span>`;
    b.querySelector('span').textContent = texte;
    b.onclick = async () => {
        const pose = await proposerLInstallation();
        if (pose) b.remove();
    };
    ou.appendChild(b);
    return b;
}

/**
 * POSE LE BOUTON MAINTENANT, ET ENCORE QUAND L'OFFRE ARRIVE.
 *
 * `beforeinstallprompt` NE SE DÉCLENCHE PAS AU CHARGEMENT : le navigateur
 * attend d'avoir vu l'élève se servir de l'application — quelques secondes,
 * parfois une seconde visite. Un écran monté UNE FOIS au démarrage, comme la
 * fenêtre du code, demanderait donc toujours trop tôt et ne montrerait jamais
 * rien. C'est le défaut le plus facile à ne pas voir : on essaie, il n'y a
 * pas de bouton, et l'on conclut que l'appareil ne sait pas installer.
 *
 * RÉSERVÉ AUX CONTENANTS QUI VIVENT LONGTEMPS. Un écran qu'on redessine à
 * chaque passage — l'état vide du parcours — pose son bouton à chaque rendu
 * et n'a rien à écouter ; lui donner un écouteur de plus à chaque fois en
 * accumulerait un par visite.
 */
export function poserDesQuePossible(ou, options) {
    const poser = () => {
        if (!ou || !ou.isConnected) return;
        if (ou.querySelector('.inst-bouton')) return;   // déjà posé
        poserLeBoutonDInstallation(ou, options);
    };
    poser();
    // AU TOUR SUIVANT, et non tout de suite : la capture écrite dans la page
    // range l'événement dans `window.__installAtoutMath`, et l'on ne veut pas
    // dépendre de l'ordre dans lequel deux écouteurs du même événement sont
    // appelés.
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeinstallprompt', () => setTimeout(poser, 0));
    }
    return poser;
}
