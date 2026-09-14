// LE POSTE ÉLÈVE — LA SECONDE FENÊTRE, CELLE D'EN FACE.
//
// Rémy : « comment je pourrais simuler un mode élève et prof simultané, pour
// être sûr que ça fonctionne ».
//
// La question est juste, et elle n'avait pas de bonne réponse. On pouvait
// ouvrir un second onglet : on y retrouvait le professeur, puisque le jeton
// vit dans `localStorage`, commun à tout le navigateur. On pouvait ouvrir une
// fenêtre privée : cela marche, mais il faut retaper l'identifiant et le code
// à chaque essai, et une seule fenêtre privée à la fois par navigateur.
//
// CE QUI SE PASSE ICI ne remplace pas l'application par une imitation. Le
// poste élève, c'est la MÊME application, sur le MÊME serveur, avec un VRAI
// billet : la porte s'ouvre pour de bon, le travail part pour de bon, et le
// professeur le voit arriver dans son direct. C'était tout l'intérêt — un
// simulacre ne prouverait rien du tout.
//
// TOUT CE QUI CHANGE TIENT EN DEUX CHOSES, et aucune n'est dans ce fichier :
//
//   · `index.html` remplace `localStorage` par un tiroir préfixé quand l'URL
//     porte `?poste=1`. C'est ce qui empêche les deux fenêtres de se
//     déconnecter l'une l'autre ;
//   · le journal est rangé dans une autre base IndexedDB, pour la même raison.
//
// Ce module-ci ne fait que le visible : un bandeau qui dit où l'on est, le
// billet rempli tout seul, et une sortie qui ne laisse rien derrière elle.

const CLE_PREFIXE = 'poste:';

/** Le billet passé par le professeur, ou null. */
export function billetDeLAdresse(hash = (typeof location !== 'undefined' ? location.hash : '')) {
    // LE BILLET VOYAGE DANS LE FRAGMENT, PAS DANS LA REQUÊTE, et c'est
    // délibéré : un fragment n'est jamais envoyé au serveur, donc il ne se
    // retrouve ni dans les journaux d'Apache, ni dans un référent, ni dans
    // l'historique d'un intermédiaire. Un code d'élève est un code d'élève,
    // même pour un essai de trois minutes.
    const m = /(?:^|[#&])billet=([^&]*)/.exec(String(hash || ''));
    if (!m) return null;
    let brut;
    try { brut = decodeURIComponent(m[1]); } catch (e) { brut = m[1]; }
    // Le séparateur est la barre oblique, comme sur le billet imprimé.
    const i = brut.indexOf('/');
    if (i < 0) return null;
    const login = brut.slice(0, i).trim();
    const code = brut.slice(i + 1).trim();
    return login ? { login, code } : null;
}

/**
 * L'adresse à ouvrir pour voir l'écran d'un élève.
 *
 * Sans élève, on rend l'adresse d'un poste VIERGE : c'est ce qu'il faut pour
 * éprouver la porte elle-même — l'entrée par le code de la classe, le message
 * quand le code est faux, l'élève qui se trompe d'identifiant.
 */
export function adresseDuPoste(eleve, base = 'index.html') {
    if (!eleve || !eleve.login) return `${base}?poste=1`;
    const billet = encodeURIComponent(`${eleve.login}/${eleve.code || ''}`);
    return `${base}?poste=1#billet=${billet}`;
}

/**
 * ON EFFACE LE FRAGMENT AVANT TOUT LE RESTE.
 *
 * Sans cela, le code de l'élève reste dans la barre d'adresse pendant toute la
 * séance — visible au vidéoprojecteur, et recopié par le premier rechargement
 * dans l'historique du navigateur.
 */
function oublierLAdresse() {
    try {
        history.replaceState(null, '', location.pathname + location.search);
    } catch (e) { /* pas d'historique : tant pis, ce n'est pas bloquant */ }
}

/**
 * ATTENDRE LA PORTE, PAS UN DÉLAI.
 *
 * La porte est dessinée par `initPortail()`, après que l'application a lu le
 * profil dans IndexedDB — donc à un moment qu'on ne connaît pas. Un
 * `setTimeout` généreux marcherait neuf fois sur dix, et la dixième laisserait
 * le professeur devant un formulaire vide sans savoir pourquoi.
 */
function quandLaPorteEstLa(quoiFaire, limite = 15000) {
    const pret = () => document.getElementById('portail-connecter')
        && document.getElementById('portail-login');
    if (pret()) { quoiFaire(); return; }
    const obs = new MutationObserver(() => {
        if (!pret()) return;
        obs.disconnect();
        quoiFaire();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), limite);
}

function remplirLeBillet() {
    const billet = billetDeLAdresse();
    oublierLAdresse();
    if (!billet) return null;
    quandLaPorteEstLa(() => {
        const l = document.getElementById('portail-login');
        const c = document.getElementById('portail-code-eleve');
        const b = document.getElementById('portail-connecter');
        if (!l || !c || !b) return;
        l.value = billet.login;
        c.value = billet.code;
        // ON CLIQUE POUR DE VRAI plutôt que d'appeler la fonction de
        // connexion : c'est le chemin de l'élève qu'on veut éprouver, avec son
        // bouton, son état d'attente et ses messages d'erreur. Appeler la
        // fonction sauterait précisément ce qu'on vient vérifier.
        b.click();
    });
    return billet;
}

/** Effacer le tiroir du poste — et lui seul. */
export function oublierLePoste() {
    try {
        // `localStorage` est ici DÉJÀ le tiroir préfixé (voir index.html) :
        // son `clear()` ne touche qu'aux clefs du poste.
        window.localStorage.clear();
    } catch (e) { /* navigation privée */ }
    if (typeof localforage !== 'undefined') {
        try { return localforage.clear(); } catch (e) { /* rien à faire */ }
    }
    return Promise.resolve();
}

/**
 * L'IDENTIFIANT VIENT DE L'ADRESSE, DONC IL EST À ÉCHAPPER.
 *
 * Il arrive normalement du bouton « son écran », donc du serveur. Mais rien
 * n'empêche d'envoyer à un professeur un lien dont le fragment porte du HTML :
 * il s'exécuterait dans l'origine du site, avec son jeton à portée. Deux
 * lignes pour fermer la porte, et l'on ne compte pas dessus pour vivre.
 */
function ech(t) {
    return String(t).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function bandeauHtml(qui) {
    return `
    <div class="poste-bandeau-dedans">
        <span class="poste-pastille">Poste élève</span>
        <span class="poste-texte">${qui
            ? `Vous voyez l'écran de <b>${ech(qui)}</b>.`
            : 'Cette fenêtre se comporte comme celle d\'un élève.'}
           Votre session de professeur, dans l'autre fenêtre, n'est pas touchée.</span>
        <button type="button" class="poste-sortir" data-poste-sortir>Fermer et oublier</button>
    </div>`;
}

/**
 * @returns {boolean} vrai si l'on est bien sur un poste élève
 */
export function initPosteEleve() {
    if (typeof window === 'undefined' || !window.__posteEleve) return false;
    document.documentElement.classList.add('poste-eleve');

    const billet = remplirLeBillet();

    const barre = document.createElement('div');
    barre.className = 'poste-bandeau';
    barre.setAttribute('role', 'status');
    barre.innerHTML = bandeauHtml(billet ? billet.login : '');
    document.body.appendChild(barre);

    barre.querySelector('[data-poste-sortir]').addEventListener('click', async () => {
        await oublierLePoste();
        // `window.close()` n'obéit que si la fenêtre a été ouverte par un
        // script — ce qui est le cas quand on vient du bouton « son écran ».
        // Sinon on revient à une page neutre : dans les deux cas, le tiroir
        // est vide et rien ne subsiste de l'essai.
        window.close();
        location.replace(location.pathname);
    });
    return true;
}

export const PREFIXE = CLE_PREFIXE;

/** Exposé pour les essais : le bandeau n'a pas besoin d'un navigateur. */
export const bandeauPourEssai = bandeauHtml;
