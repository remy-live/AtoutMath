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

import { seanceImposee } from '../core/seanceDistante.js';
import { identiteDeParcours } from '../core/shortcodes.js';
import { normalizePath } from '../core/path.js';

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

/**
 * LE PLEIN ÉCRAN AU PREMIER APPUI, QUAND LA SÉANCE EST IMPOSÉE.
 *
 * RÉMY : « est ce que lorsque j'impose une séance, et que l'élève découvre la
 * carte du monde je peux forcer le plein écran ? », puis, la contrainte
 * expliquée : « oui si la séance est imposée et laisse le bouton ».
 *
 * ── ON NE PEUT PAS LE FORCER, ET CE N'EST PAS LE LOGICIEL QUI REFUSE ───────
 *
 * `requestFullscreen()` n'est accordé qu'à la suite d'un GESTE de l'élève. Une
 * demande déclenchée par l'apparition de la carte, sans qu'il ait touché
 * l'écran, est rejetée — c'est écrit deux fois dans ce fichier, et c'est une
 * règle du web, pas un manque.
 *
 * Mais son premier appui EST un geste : celui par lequel il ouvre sa séance.
 * On s'y accroche donc, et il y reste tout le temps qu'elle dure.
 *
 * ── CINQ CONDITIONS, ET CHACUNE FERME UN DÉFAUT ───────────────────────────
 *
 * 0. SEULEMENT SI RÉMY L'A COCHÉ. « Après peut être vaut il mieux le mettre en
 *    paramètre » — et il a raison : ma première écriture mettait en plein écran
 *    dès qu'une séance était imposée, sans qu'il puisse dire non. Or cela
 *    dépend de la salle : une 6e sur les postes de la salle informatique, oui ;
 *    une 3e sur ses propres téléphones, c'est à lui de voir. La case est à côté
 *    de « mettre en cours », et le drapeau voyage DANS la séance imposée.
 *
 * 1. SEULEMENT SI UNE SÉANCE EST IMPOSÉE, parce que c'est ce qu'il a demandé.
 *    Un élève qui révise chez lui le soir garde la main sur son écran : le
 *    plein écran est un geste de CLASSE, décidé par le professeur qui conduit
 *    l'heure.
 *
 * 2. ET SEULEMENT SI C'EST ELLE QU'ON OUVRE. Un élève peut avoir une séance
 *    imposée ET taper un code dicté pour autre chose : demander « y a-t-il une
 *    séance imposée ? » mettrait alors en plein écran un parcours qui n'a rien
 *    à voir. On compare donc les IDENTITÉS, comme `fautIlOuvrir` le fait déjà
 *    dans `ui/leMoment.js` — et la question se pose ICI, une seule fois, parce
 *    qu'une règle écrite dans ses deux appelants finit par n'être corrigée que
 *    dans l'un des deux (payé le 13 octobre avec le cadre d'aperçu).
 *
 * 3. SEULEMENT SI LE NAVIGATEUR LE DONNE POUR DE VRAI. Sur iPhone et iPad,
 *    Safari ne l'accorde qu'aux vidéos — et `basculerPleinEcran` y répond par
 *    un conseil : « Partager → Sur l'écran d'accueil ». Ce conseil est juste,
 *    mais il serait adressé À UN ÉLÈVE DE SIXIÈME, qui n'installe rien sur la
 *    tablette de la salle. On se tait donc complètement plutôt que de lui
 *    donner une consigne qu'il ne peut pas suivre. Le bouton, lui, continue de
 *    la donner à Rémy quand c'est LUI qui appuie.
 *
 * 4. ET ON NE RÉPÈTE PAS. Il ouvre, il quitte, il reprend : le ramener de
 *    force après qu'il en est sorti serait se battre avec lui. La sortie par
 *    Échap ou par le geste du navigateur est écoutée par `initPleinEcran`, qui
 *    retire la classe — `estEnPleinEcran()` dit donc la vérité ici.
 *
 * ET LE BOUTON RESTE — Rémy : « laisse le bouton ». On n'en cache aucun, et
 * `majBoutons` leur fait dire « Quitter le plein écran » : l'élève projeté en
 * grand a de quoi en sortir sans connaître Échap.
 *
 * ELLE S'APPELLE DANS LE CLIC, AVANT TOUT `await`. Un `await import()` rend la
 * main au navigateur, et la demande qui suit n'est plus reconnue comme venant
 * d'un geste — elle échoue en silence, sans rien casser et sans rien faire.
 * C'est pourquoi les deux appelants la placent à leur PREMIÈRE ligne, et
 * pourquoi une épreuve garde cet ordre.
 *
 * @param {object} parcours - celui que l'élève vient d'ouvrir.
 * @returns {boolean} vrai si le plein écran a été demandé.
 */
export function pleinEcranSiSeanceImposee(parcours) {
    if (!parcours) return false;
    if (estEnPleinEcran()) return false;
    if (!pleinEcranNatifPossible()) return false;
    let impose = null;
    try { impose = seanceImposee(); } catch (e) { return false; }
    if (!impose || !impose.path) return false;
    // LE RÉGLAGE DE RÉMY, ET IL EST LE PREMIER À REGARDER. Une séance imposée
    // sans la case cochée ne change rien à l'écran de l'élève.
    if (!impose.pleinEcran) return false;
    try {
        const lui = identiteDeParcours(normalizePath(parcours, parcours.name));
        const elle = identiteDeParcours(normalizePath(impose.path, impose.name));
        if (lui !== elle) return false;
    } catch (e) { return false; }
    basculerPleinEcran(true);
    return true;
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
