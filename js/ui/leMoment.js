// LE MOMENT — ce que le professeur décide pour toute la classe, chez l'élève.
//
// Rémy, deux demandes qui n'en font qu'une : « est-ce qu'il ne serait pas
// possible que lorsque les élèves se connectent, j'impose la séance, comme cela
// ils n'ont rien à lancer », et « pour le compte à rebours c'est pour terminer
// la séance ou mettre en pause (pour faire un peu de cours par exemple ou pour
// parler) ».
//
// Les deux passent par le même canal — l'état de séance, que le serveur glisse
// dans chaque réponse et que l'élève redemande toutes les dix secondes. Ce
// module est ce qu'il en FAIT à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROIS RÈGLES, ET CHACUNE RÉPARE UNE FAÇON DE GÂCHER UNE HEURE DE COURS.
//
// ON N'ARRACHE JAMAIS UNE QUESTION EN COURS. La séance imposée s'ouvre quand
// l'élève n'a rien commencé ; s'il travaille déjà sur ce parcours-là, on ne
// touche à rien. Le contraire ferait perdre sa réponse à un élève au hasard,
// toutes les dix secondes, sans que personne ne comprenne.
//
// LE CHRONO S'AFFICHE EN GRAND ET NE DEMANDE RIEN. Un compte à rebours qu'il
// faut aller chercher n'est pas un compte à rebours. Il est en haut, il est
// lisible du fond de la salle, et il rougit dans la dernière minute.
//
// LA PAUSE NE FERME PAS LE TRAVAIL, elle le couvre. Rémy veut « faire un peu de
// cours ou parler » : quand il rend la main, l'élève doit retrouver sa question
// exactement où elle était. Une pause qui perd le travail en cours n'est pas
// une pause, c'est une punition.

import { state } from '../core/state.js';
import {
    etatSeance, seanceImposee, tempsRestant
} from '../core/seanceDistante.js';
import { normalizePath } from '../core/path.js';
import { resolvePolicy } from '../core/policy.js';
import { identiteDeParcours } from '../core/shortcodes.js';

let pose = false;
let minuteur = null;
let dernierImpose = '';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** « 07:12 » — et jamais « 432 secondes ». */
export function enMinutes(secondes) {
    const s = Math.max(0, Math.floor(secondes));
    const m = Math.floor(s / 60);
    return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

// ────────────────────────────────────────────── LA SÉANCE IMPOSÉE ───────────

/**
 * FAUT-IL OUVRIR LA SÉANCE IMPOSÉE, ET POURQUOI PAS.
 *
 * Séparé de l'ouverture elle-même parce que c'est la DÉCISION qui compte et
 * qu'elle doit pouvoir s'éprouver sans navigateur. Les trois refus sont les
 * trois façons d'arracher son travail à un élève.
 *
 * @returns {{ouvrir:boolean, pourquoi:string}}
 */
export function fautIlOuvrir(impose, parcoursCharge, enTrainDeTravailler) {
    if (!impose || !impose.path) return { ouvrir: false, pourquoi: 'rien-impose' };
    if (enTrainDeTravailler) return { ouvrir: false, pourquoi: 'il-travaille' };
    const identite = identiteDeParcours(normalizePath(impose.path, impose.name));
    if (parcoursCharge && parcoursCharge === identite) {
        return { ouvrir: false, pourquoi: 'deja-dessus' };
    }
    return { ouvrir: true, pourquoi: 'a-ouvrir' };
}

function ouvrirLaSeanceImposee(impose) {
    const parcours = normalizePath(impose.path, impose.name);
    const id = identiteDeParcours(parcours);
    state.setStudentPath(parcours.steps, {
        pathId: id,
        name: parcours.name || impose.name || 'Séance',
        policy: resolvePolicy(parcours.policy)
    });
    dernierImpose = id;
}

// ───────────────────────────────────────────────────── LE BANDEAU ───────────

function bandeau() {
    let el = document.getElementById('le-moment');
    if (!el) {
        el = document.createElement('div');
        el.id = 'le-moment';
        el.className = 'moment';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    return el;
}

function voile(afficher, texte) {
    let el = document.getElementById('le-moment-pause');
    if (!afficher) { if (el) el.remove(); return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'le-moment-pause';
        el.className = 'moment-pause';
        document.body.appendChild(el);
    }
    el.innerHTML = `<div class="moment-pause-carte">
        <div class="moment-pause-titre">Pause</div>
        <p>${esc(texte)}</p>
        <p class="moment-pause-note">Ton travail est gardé. Il reviendra exactement où tu l'as laissé.</p>
    </div>`;
}

function dessiner() {
    const t = tempsRestant();
    const el = bandeau();
    if (!t) {
        el.hidden = true;
        voile(false);
        return;
    }
    el.hidden = false;
    const fini = t.reste <= 0;
    el.classList.toggle('moment--rouge', t.reste <= 60 && !fini);
    el.classList.toggle('moment--fini', fini);

    if (fini && t.aZero === 'pause') {
        el.innerHTML = '<span class="moment-chrono">Pause</span>'
            + '<span class="moment-quoi">On écoute le professeur.</span>';
        voile(true, 'Le professeur a repris la parole.');
        return;
    }
    voile(false);
    if (fini) {
        el.innerHTML = '<span class="moment-chrono">Temps écoulé</span>'
            + '<span class="moment-quoi">On s\'arrête là.</span>';
        return;
    }
    el.innerHTML = `<span class="moment-chrono">${enMinutes(t.reste)}</span>`
        + `<span class="moment-quoi">${t.aZero === 'pause'
            ? 'À zéro, on s\'arrête pour écouter.'
            : 'À zéro, on ramasse les copies.'}</span>`;
}

// ─────────────────────────────────────────────────────── LE FIL ─────────────

/**
 * ON REGARDE CHAQUE SECONDE, MAIS ON NE DEMANDE RIEN AU SERVEUR.
 *
 * Le décompte est local : le serveur a donné l'INSTANT de fin, chaque appareil
 * sait donc tout seul combien il reste. Une requête par seconde pour afficher
 * un chiffre qu'on peut calculer serait trente requêtes par seconde pour la
 * classe, et elles n'apprendraient rien à personne.
 */
function battre() {
    dessiner();
    const t = tempsRestant();
    if (t && t.reste <= 0 && t.aZero === 'terminer') terminerLeTravail();
}

let dejaTermine = false;

function terminerLeTravail() {
    if (dejaTermine) return;
    dejaTermine = true;
    // ON NE FERME PAS L'ÉCRAN DE FORCE. Le meneur sait clore proprement : il
    // enregistre ce qui a été fait, puis affiche son bilan. L'arracher
    // perdrait la dernière réponse — celle qu'on est en train de taper quand
    // la sonnerie tombe, et qui est toujours celle qui compte.
    const meneur = state.activeSequenceRunner;
    if (meneur && typeof meneur.finish === 'function') {
        try { meneur.finish(true); } catch (e) { /* déjà clos */ }
    }
}

function surEtat() {
    const impose = seanceImposee();
    const charge = state.studentPath ? state.studentPath.pathId : null;
    const travaille = !!state.activeSequenceRunner;
    const d = fautIlOuvrir(impose, charge, travaille);
    if (d.ouvrir) ouvrirLaSeanceImposee(impose);
    // Un nouveau chrono remet le droit de terminer : sans cela, une séance
    // chronométrée le matin empêcherait celle de l'après-midi de se clore.
    const t = tempsRestant();
    if (t && t.reste > 0) dejaTermine = false;
    dessiner();
}

/** À appeler une fois, au démarrage. Ne fait rien pour un élève non rattaché. */
export function initLeMoment() {
    if (pose || typeof document === 'undefined') return;
    pose = true;
    document.addEventListener('seance_distante', surEtat);
    clearInterval(minuteur);
    minuteur = setInterval(battre, 1000);
    surEtat();
}

/** Exposé pour les essais : l'état courant, tel que l'écran le voit. */
export function etatDuMoment() {
    return { seance: etatSeance(), chrono: tempsRestant(), impose: seanceImposee() };
}
