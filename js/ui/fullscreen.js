// Le PLEIN ÉCRAN.
//
// Un vidéoprojecteur, une tablette posée sur une table, un téléphone tenu à
// bout de bras : dans les trois cas, la barre du navigateur et la palette
// d'outils mangent de la place au moment précis où l'on en a le plus besoin.
// D'où un bouton, présent partout où l'on peut se trouver — dans la barre
// haute quand on choisit un exercice, dans l'en-tête du jeu quand on en fait
// un. Jamais plus d'un geste pour entrer, jamais plus d'un pour sortir.
//
// Il demande le plein écran du navigateur : c'est lui qui enlève la barre
// d'adresse et les onglets. La palette d'outils d'auteur, elle, RESTE — elle
// sert justement à tester ce qu'on regarde, et la faire disparaître au moment
// où l'on veut voir le jeu en grand revenait à retirer l'outil avec le décor.
// Elle se déplace et se replie : c'est à elle de s'écarter.
//
// Sur iPhone, le plein écran n'existe pas : Safari ne le donne qu'aux vidéos.
// Le bouton le dit une fois, plutôt que de faire semblant : pour un vrai plein
// écran sur iOS, il faut installer l'application depuis « Partager → Sur
// l'écran d'accueil ».

const CLE = 'mathbox-plein-ecran';

const racine = () => document.documentElement;

/** Le navigateur sait-il mettre un élément en plein écran ? */
export function pleinEcranNatifPossible() {
    const el = racine();
    return !!(el.requestFullscreen || el.webkitRequestFullscreen)
        && (document.fullscreenEnabled !== false);
}

function natifActif() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

export function estEnPleinEcran() {
    return document.body.classList.contains('plein-ecran');
}

async function entrerNatif() {
    const el = racine();
    try {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) {
        // Refus du navigateur (geste non reconnu, réglage utilisateur) : le
        // repli de la palette, lui, a déjà eu lieu. On ne remonte pas d'erreur
        // pour ça — le bouton a fait quelque chose de visible.
    }
}

function sortirNatif() {
    try {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) { /* déjà sorti */ }
}

/**
 * @param {boolean} [voulu] - état demandé ; sans argument, on bascule.
 * @param {boolean} [natif=true] - tenter le plein écran du navigateur. Faux
 *   au démarrage : un navigateur n'accorde le plein écran qu'à la suite d'un
 *   geste, et une tentative sans geste est une erreur dans la console.
 */
export function basculerPleinEcran(voulu, natif = true) {
    const cible = voulu === undefined ? !estEnPleinEcran() : !!voulu;
    document.body.classList.toggle('plein-ecran', cible);
    try { localStorage.setItem(CLE, cible ? '1' : '0'); } catch (e) { /* mode privé */ }

    if (natif) {
        if (cible) entrerNatif();
        else if (natifActif()) sortirNatif();
    }
    majBoutons();

    if (cible && natif && !pleinEcranNatifPossible()) conseilIOS();
    return cible;
}

/**
 * Une seule fois dans la vie de l'appareil : sur iOS, le plein écran passe par
 * l'installation sur l'écran d'accueil. Le répéter à chaque appui serait un
 * reproche ; le taire laisserait croire que le bouton est cassé.
 */
function conseilIOS() {
    const vu = 'mathbox-conseil-ios';
    try {
        if (localStorage.getItem(vu)) return;
        localStorage.setItem(vu, '1');
    } catch (e) { return; }
    import('./modal.js').then(m => m.showToast(
        'Ce navigateur ne donne pas le plein écran complet. Astuce : Partager → « Sur l\'écran d\'accueil » '
        + 'installe AtoutMath comme une application, sans barre d\'adresse.', 'info', 9000
    )).catch(() => { /* pas de toast disponible : tant pis, ce n'est qu'un conseil */ });
}

function majBoutons() {
    const dedans = estEnPleinEcran();
    document.querySelectorAll('[data-plein-ecran]').forEach(btn => {
        btn.setAttribute('aria-pressed', dedans ? 'true' : 'false');
        const t = dedans ? 'Quitter le plein écran' : 'Plein écran';
        btn.title = t;
        btn.setAttribute('aria-label', t);
    });
}

export function initPleinEcran() {
    document.querySelectorAll('[data-plein-ecran]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            basculerPleinEcran();
        });
    });

    // Sortie par la touche Échap ou par le geste du navigateur : notre classe
    // doit suivre, sinon le bouton affiche « quitter » alors qu'on est déjà
    // sorti — et un bouton qui ment sur son état ne se réutilise pas.
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => {
        document.addEventListener(ev, () => {
            if (!natifActif() && estEnPleinEcran()) basculerPleinEcran(false, false);
            else majBoutons();
        });
    });

    // L'état survit au rechargement — mais SANS rappeler le plein écran natif,
    // qu'aucun navigateur n'accorde hors d'un geste de l'utilisateur.
    let garde = null;
    try { garde = localStorage.getItem(CLE); } catch (e) { /* mode privé */ }
    if (garde === '1') basculerPleinEcran(true, false);
    else majBoutons();
}
