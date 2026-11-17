// L'ÉCRAN DE SÉANCE — ce que voit l'élève quand le professeur met une séance
// en cours : un écran de départ qu'il valide, le plein écran, et son profil
// fermé le temps de s'y mettre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 17 novembre : « quand j'impose une séance on pourrait pas mettre une
// popup (en option chèck de base) et quand l'élève valide ça met le parcours
// vraiment en plein écran (ça prend tout l'écran) et il ne peut accéder à son
// profil que si je l'y autorise ou qu'il a fini la séance. […] il faut que ce
// soit compatible avec le fait qu'il puisse réviser au soir à la maison ».
//
// ── L'ÉCRAN DE DÉPART N'EST PAS UN CONFORT, C'EST UNE RÉPARATION ───────────
//
// Le plein écran était demandé AU PREMIER APPUI DE L'ÉLÈVE, quel qu'il soit
// (voir `ecranDeLEleve.js`, qui garde ce comportement pour le mode kiosque du
// site). Or un navigateur n'accorde `requestFullscreen` que pendant un VRAI
// geste, et un doigt posé pour faire défiler n'en est pas toujours un : la
// demande échouait alors EN SILENCE — pas d'erreur, pas de plein écran, et
// personne pour savoir pourquoi. Pire encore pour une séance IMPOSÉE, qui
// s'ouvre toute seule : il n'y avait aucun clic à attraper.
//
// Un bouton « Commencer » est le geste le plus propre qui existe. L'écran de
// départ le fabrique, et c'est tout ce qu'on lui demande.
//
// ── CE QUI OUVRE LE PROFIL, ET POURQUOI C'EST ICI ET NON AU SERVEUR ────────
//
// J'avais proposé à Rémy de séparer deux échéances — la séance jusqu'à demain
// matin, le verrou une heure. Il a répondu autre chose, et de meilleur :
//
//   « Le verrou meurt si il a fait la séance ou au moins un bout »
//
// CE N'EST PLUS L'HORLOGE QUI OUVRE LE PROFIL, C'EST LE TRAVAIL FAIT. Celui
// qui a travaillé en classe révise librement le soir ; celui qui n'a rien fait
// retrouve sa séance devant lui. Aucune heure à régler, aucune question à
// poser au professeur, et la règle s'explique à un élève de sixième en une
// phrase.
//
// « Un bout » = UNE ÉTAPE TERMINÉE, seuil de validation compris. C'est une
// unité que le logiciel compte déjà, que l'élève VOIT (sa pastille devient or),
// et qu'on ne franchit pas par hasard — contrairement à « une question
// répondue », qu'on franchit en tapant n'importe quoi.
//
// ET C'EST L'ARDOISE QUI EN DÉCIDE, pas le serveur. Le serveur envoie bien une
// conclusion (`impose.profilFerme`), mais elle ne porte QUE ce que le
// professeur a décidé : sa case, et son autorisation. Le travail fait, lui, ne
// peut pas se décider là-bas — il y arrive par la synchronisation, donc avec du
// retard, et pas du tout hors ligne. Un élève qui vient de finir son étape doit
// retrouver son profil TOUT DE SUITE : pas au prochain aller-retour réseau, et
// pas jamais s'il travaille dans le train.
//
// ── ET CE N'EST PAS UN VERROU ──────────────────────────────────────────────
//
// La même phrase que dans `ecranDeLEleve.js`, et elle vaut d'être écrite deux
// fois : un navigateur se quitte, un onglet se change, et aucune page web ne
// peut l'empêcher. C'est un écran RANGÉ — ce qui n'a rien à faire là pendant
// l'heure n'est pas affiché. La différence comptera le jour où un élève
// montrera à Rémy qu'il est passé à côté.

import { state } from '../core/state.js';
import { seanceImposee } from '../core/seanceDistante.js';
import { basculerPleinEcran, estEnPleinEcran, pleinEcranNatifPossible } from './fullscreen.js';

/** La classe posée sur `<body>` quand le profil est fermé. */
export const CLASSE_FERME = 'seance-profil-ferme';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * LE PROFESSEUR EST CHEZ LUI, ET CET ÉCRAN NE LE REGARDE PAS.
 *
 * Même garde que `modeKiosque()` : Rémy règle cela pour ses classes depuis sa
 * propre zone, et s'il perdait son onglet « Profil » en l'allumant, il
 * l'éteindrait aussitôt et pour de bon.
 */
function cestLeProfesseur() {
    return !!(document.body && document.body.classList.contains('teacher-mode'));
}

/**
 * CET ÉLÈVE A-T-IL DÉJÀ FINI UNE ÉTAPE DE CETTE SÉANCE-CI ?
 *
 * LES DEUX MOITIÉS COMPTENT, et la seconde plus que la première. « Au moins
 * une étape faite » se lit dans `state.studentPath.completed` — mais ce
 * parcours chargé n'est pas forcément la séance imposée : un élève peut taper
 * un code dicté pour autre chose, finir trois étapes, et cela n'aurait rien à
 * voir. On compare donc l'IDENTITÉ, comme `fautIlOuvrir` le fait déjà dans
 * `ui/leMoment.js` — par `seanceId`, l'identifiant stable du serveur, et non
 * par l'empreinte du contenu qui change dès qu'on complète la séance.
 */
export function aFaitUnBout(impose, charge) {
    if (!impose || !impose.pathId) return false;
    if (!charge) return false;
    const seance = charge.seanceId || null;
    if (!seance || seance !== impose.pathId) return false;
    return (charge.completed || []).length > 0;
}

/**
 * LE PROFIL EST-IL FERMÉ, MAINTENANT, POUR CET ÉLÈVE ?
 *
 * Trois choses l'ouvrent, et l'une d'elles est locale — d'où cette fonction
 * plutôt qu'un simple drapeau du serveur. Séparée de la pose pour qu'elle
 * s'éprouve sans navigateur.
 */
export function profilFerme(impose, charge) {
    if (!impose || !impose.profilFerme) return false;
    return !aFaitUnBout(impose, charge);
}

/**
 * Pose (ou retire) la fermeture sur la page. Appelable autant qu'on veut :
 * l'état de séance arrive du serveur APRÈS le premier dessin, et le travail de
 * l'élève avance pendant qu'il est là.
 */
export function appliquerEcranDeSeance() {
    if (typeof document === 'undefined' || !document.body) return false;
    if (cestLeProfesseur()) {
        document.body.classList.remove(CLASSE_FERME);
        return false;
    }
    let impose = null;
    try { impose = seanceImposee(); } catch (e) { impose = null; }
    const charge = state.studentPath || null;
    const ferme = profilFerme(impose, charge);
    document.body.classList.toggle(CLASSE_FERME, ferme);
    // ET S'IL ÉTAIT DÉJÀ SUR SON PROFIL AU MOMENT OÙ LA SÉANCE TOMBE, on le
    // ramène sur la carte. Sans cela, le professeur met la séance en cours et
    // l'élève reste devant ses badges, l'onglet simplement disparu de la barre
    // — un écran dont on ne peut plus sortir, ce qui est exactement le défaut
    // qu'on croyait corriger.
    const vue = document.getElementById('view-profile');
    if (ferme && vue && vue.style.display && vue.style.display !== 'none') {
        import('./navigation.js').then(m => m.setTopNavMode('path')).catch(() => {});
    }
    return ferme;
}

// ─────────────────────────────────────────────── L'ÉCRAN DE DÉPART ──────────

let montre = '';

/** Combien d'étapes dans cette séance — on le dit, ça rassure avant de partir. */
function combienDEtapes(impose) {
    const n = (impose && impose.path && Array.isArray(impose.path.steps))
        ? impose.path.steps.length : 0;
    if (!n) return '';
    return n === 1 ? '1 étape' : `${n} étapes`;
}

/**
 * L'ÉCRAN DE DÉPART DE LA SÉANCE IMPOSÉE.
 *
 * UN ÉLÉMENT À PART, ET NON `showModal`. Une modale du dépôt porte une croix,
 * se ferme au clic sur le voile et à la touche Échap — trois façons de passer à
 * côté du seul geste qu'on attend. Or ce geste EST la raison d'être de cet
 * écran : sans lui, pas de plein écran. On écrit donc une porte unique.
 *
 * ET ELLE NE S'AFFICHE QU'UNE FOIS PAR SÉANCE. Le battement de l'état de
 * séance passe toutes les dix secondes ; un écran qui reviendrait à chaque
 * passage rendrait la séance impossible à faire. On se souvient de la dernière
 * montrée, en mémoire et non dans le navigateur : si l'élève recharge sa page,
 * il la revalide — et c'est voulu, puisque le plein écran, lui, est parti avec
 * le rechargement.
 */
export function montrerLEcranDeDepart(impose) {
    if (typeof document === 'undefined' || !document.body) return false;
    if (cestLeProfesseur()) return false;
    if (!impose || !impose.pathId) return false;
    // SEULEMENT SI RÉMY L'A COCHÉ : `profilFerme` ne dit que la fermeture du
    // profil, et la case en commande trois choses. C'est `pleinEcran` qui porte
    // le réglage lui-même — il s'appelait ainsi quand il ne faisait que cela,
    // et le nom est resté sur le fil pour ne pas rompre les ardoises en service.
    if (!impose.pleinEcran) return false;
    if (montre === impose.pathId) return false;
    montre = impose.pathId;

    const ancien = document.getElementById('ecran-seance');
    if (ancien) ancien.remove();

    const voile = document.createElement('div');
    voile.id = 'ecran-seance';
    voile.className = 'es-voile';
    voile.setAttribute('role', 'dialog');
    voile.setAttribute('aria-modal', 'true');
    voile.setAttribute('aria-label', 'Début de la séance');
    const combien = combienDEtapes(impose);
    // « REPRENDRE » PLUTÔT QUE « COMMENCER » QUAND IL A DÉJÀ TRAVAILLÉ : un
    // élève dont la tablette a redémarré au milieu de l'heure ne recommence
    // rien, et lui dire « Commencer » lui ferait croire le contraire.
    const repris = aFaitUnBout(impose, state.studentPath);
    voile.innerHTML = `
        <div class="es-carte">
            <p class="es-sur">Séance en cours</p>
            <h2 class="es-nom">${esc(impose.name || 'Ta séance')}</h2>
            ${combien ? `<p class="es-combien">${esc(combien)}</p>` : ''}
            <button type="button" class="es-go" id="es-go">
                ${repris ? 'Reprendre' : 'Commencer'}
            </button>
            <p class="es-note">Ton profil revient dès que tu as terminé une étape.</p>
        </div>`;
    document.body.appendChild(voile);

    const bouton = voile.querySelector('#es-go');
    bouton.addEventListener('click', () => {
        // AVANT TOUT `await`, ET C'EST LA RAISON D'ÊTRE DE CET ÉCRAN. Un
        // `await import()` rend la main au navigateur, et la demande qui suit
        // n'est plus reconnue comme venant d'un geste : elle échoue en silence.
        // `fullscreen.js` est donc importé en tête de fichier, et l'appel est
        // la PREMIÈRE ligne du clic.
        if (pleinEcranNatifPossible() && !estEnPleinEcran()) basculerPleinEcran(true);
        voile.remove();
    });
    // LE FOCUS SUR LE BOUTON, parce que c'est la seule chose à faire ici et
    // qu'un élève au clavier doit pouvoir partir sans chercher.
    try { bouton.focus(); } catch (e) { /* pas de focus possible, tant pis */ }
    return true;
}

/** Pour les essais, et pour une séance retirée : on oublie ce qu'on a montré. */
export function oublierLEcranDeDepart() {
    montre = '';
}
