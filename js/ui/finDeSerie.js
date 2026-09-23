// UNE SEULE CARTE À LA FIN D'UNE SÉRIE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE DÉFAUT, MESURÉ PAR UN AUDIT. À l'instant où une séance se terminait,
// TROIS panneaux étaient dans la page en même temps :
//
//   1. « 🎉 Étape validée ! 7 bonnes réponses sur 10.
//        Séance terminée : 2 étapes sur 2 — [Voir mon bilan] »   ← core/runner
//   2. « Badge débloqué ! ⚡ Éclair — Bronze [Super !] »          ← ui/gamificationUI
//   3. « C'est en train de rentrer. 7 sur 16… [Fermer] »          ← ui/accueilUI
//
// Le 1 est l'ÉCRAN du meneur ; les deux autres sont des modales qui s'empilent
// par-dessus. L'élève devait donc fermer DEUX fenêtres pour atteindre le bouton
// qui compte — « Voir mon bilan » — et celui-ci était dessous. À la sonnerie,
// il ferme tout au réflexe et ne voit jamais son bilan.
//
// Chacun des trois messages est bon. C'est leur simultanéité qui les annule.
//
// CE QU'ON A CHOISI. Rémy, entre une file (trois panneaux à la suite) et une
// carte unique : « Le B ». À la sonnerie, trois clics c'est trois de trop.
//
// POURQUOI UN COORDINATEUR, ET PAS UN APPEL DE L'UN VERS L'AUTRE. Les deux
// modules ne se connaissent pas, et c'est très bien : la récompense ne doit
// pas savoir ce qu'est un bilan de maîtrise, et réciproquement. Ils DÉPOSENT
// ici ce qu'ils ont à dire ; c'est ce fichier — et lui seul — qui sait dans
// quel ordre cela se lit et combien de cartes s'ouvrent.
//
// LE DÉLAI FAIT TOUT LE TRAVAIL. Les deux annonces arrivent à quelques
// millisecondes l'une de l'autre, sans ordre garanti : la fin de série émet
// `session_finished`, et les badges sont accordés dans la foulée par le même
// enchaînement. On attend donc un court moment avant de dessiner — assez pour
// que les deux soient arrivées, trop peu pour qu'on le remarque.

import { showModal } from './modal.js';
import { robotSvg } from './icones.js';

// 320 ms : plus long que les 260 ms d'attente des badges (voir
// `gamificationUI`), de sorte qu'un lot de badges soit toujours complet quand
// on dessine. Mesuré à l'œil : en dessous de 400 ms on ne perçoit pas de
// retard après la dernière réponse.
const ATTENTE_MS = 320;

let minuteur = null;
/** Ce qui a été déposé depuis le dernier dessin. */
let enAttente = { badges: [], bilan: null, actions: [], apres: [] };

function vider() {
    enAttente = { badges: [], bilan: null, actions: [], apres: [] };
}

function programmer() {
    if (minuteur) clearTimeout(minuteur);
    minuteur = setTimeout(() => { minuteur = null; dessiner(); }, ATTENTE_MS);
}

/**
 * Des récompenses viennent d'être gagnées.
 * @param {Array<{icon:string,title:string,description:string,medal?:string}>} lot
 * @param {Function} [fete] ce qu'on lance si la carte s'ouvre (les confettis).
 */
export function deposerBadges(lot, fete) {
    if (!lot || !lot.length) return;
    enAttente.badges.push(...lot);
    if (fete) enAttente.apres.push(fete);
    programmer();
}

/**
 * Le verdict de maîtrise d'une série qui vient de finir.
 * @param {{titre:string, texte:string, lecon?:string, verdict:string}} bilan
 * @param {Array<{mot:string, principal?:boolean, faire:Function}>} [actions]
 */
export function deposerBilan(bilan, actions = []) {
    if (!bilan) return;
    enAttente.bilan = bilan;
    enAttente.actions = actions;
    programmer();
}

const echapper = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function dessiner() {
    const { badges, bilan, actions, apres } = enAttente;
    vider();
    if (!badges.length && !bilan) return;

    // L'ORDRE DE LECTURE EST FIXE, ET C'EST TOUT L'OBJET DE CE FICHIER :
    // d'abord ce qu'on a GAGNÉ — c'est ce qui fait lever les yeux —, ensuite
    // ce qu'on a APPRIS, qui demande de lire. L'inverse ferait sauter le
    // second message par-dessus l'épaule du premier.
    const recompenses = badges.length ? `
        <div class="fs-recompenses">
            <h2 class="fs-titre-recompense">${badges.length > 1
        ? `${badges.length} récompenses débloquées !` : 'Badge débloqué !'}</h2>
            <div class="badge-won-list">${badges.map(b => `
                <div class="badge-won${b.medal ? ` badge-won--${b.medal}` : ''}">
                    <div class="badge-won-icon">${b.icon}</div>
                    <div>
                        <div class="badge-won-title">${echapper(b.title)}</div>
                        <div class="badge-won-desc">${echapper(b.description)}</div>
                    </div>
                </div>`).join('')}</div>
        </div>` : '';

    const verdict = bilan ? `
        <div class="fs-bilan">
            <div class="ac-robot">${bilan.verdict === 'reussi' && !badges.length
        ? '🎉' : robotSvg(46)}</div>
            <h3 class="modal-title">${echapper(bilan.titre)}</h3>
            <p class="ac-texte">${echapper(bilan.texte)}</p>
            ${bilan.lecon ? `<div class="ac-lecon">${echapper(bilan.lecon)}</div>` : ''}
        </div>` : '';

    // UN SEUL BOUTON QUAND IL N'Y A QU'UNE CHOSE À FAIRE. « Super ! » sous une
    // récompense et « Fermer » sous un bilan sont le même geste ; les afficher
    // tous les deux redonnerait les deux clics qu'on vient de retirer.
    const sortie = badges.length && !bilan ? 'Super !' : 'Fermer';
    const boutons = [
        `<button type="button" class="btn-toggle glass-btn modal-btn-flex modal-btn-flex--neutral"
                 data-fs-sortir>${sortie}</button>`,
        ...actions.map((a, i) => `<button type="button" data-fs-action="${i}"
             class="btn-toggle glass-btn modal-btn-flex${a.principal ? ' primary active' : ''}"
             >${echapper(a.mot)}</button>`)
    ].join('');

    const modal = showModal('', `
        <div class="fs-carte">
            ${recompenses}
            ${recompenses && verdict ? '<div class="fs-trait"></div>' : ''}
            ${verdict}
            <div class="modal-actions-center">${boutons}</div>
        </div>`, { width: '460px' });

    const el = modal.element;
    const fermer = () => modal.close();
    const sortirBtn = el.querySelector('[data-fs-sortir]');
    if (sortirBtn) sortirBtn.onclick = fermer;
    actions.forEach((a, i) => {
        const b = el.querySelector(`[data-fs-action="${i}"]`);
        if (b) b.onclick = () => { fermer(); a.faire(); };
    });

    // Les confettis APRÈS que la carte est posée : lancés avant, ils tombent
    // derrière elle.
    apres.forEach(f => { try { f(); } catch (e) { /* la fête n'est pas critique */ } });
}

/** Pour les essais : oublier ce qui attend, sans rien dessiner. */
export function oublierLaFin() {
    if (minuteur) clearTimeout(minuteur);
    minuteur = null;
    vider();
}
