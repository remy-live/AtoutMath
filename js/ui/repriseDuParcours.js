// REPRENDRE, OU RECOMMENCER À ZÉRO — la question du second scan.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après l'essai sur tablette : « Quand on rescanne à nouveau, si le
// parcours est identique au précédente, l'élève choisit ou non de redémarrer à
// zéro. »
//
// ── CE QUI SE PASSAIT, MESURÉ AVANT D'ÉCRIRE UNE LIGNE ─────────────────────
//
// Deux `path_assigned` autour de deux `step_completed`, passés à
// `computeAssignedPath` : les deux étapes restent validées, et leurs résultats
// avec. Rescanner REPREND, donc, et c'est le bon défaut — perdre le travail de
// l'élève parce qu'il a visé deux fois le tableau serait indéfendable. Mais
// c'était le SEUL comportement : rien, nulle part, ne permettait de refaire la
// séance depuis le début. L'élève qui veut se rattraper n'avait qu'à demander
// au professeur de le remettre à zéro depuis son poste.
//
// ── POURQUOI LA QUESTION NE SE POSE PAS TOUJOURS ───────────────────────────
//
// Elle ne se pose que s'il y a quelque chose à reprendre. Un élève qui scanne
// deux fois de suite sans avoir rien fait entre les deux — ce qui arrive : on
// vise mal, on recommence — n'a aucune raison de lire une question dont les
// deux réponses font la même chose. Une fenêtre qui ne change rien apprend à
// cliquer sans lire.
//
// ── ET FERMER LA FENÊTRE, C'EST REPRENDRE ──────────────────────────────────
//
// La croix, la touche Échap, le clic à côté : trois façons de ne pas répondre,
// et toutes trois gardent le travail. Un geste distrait ne doit jamais effacer
// une demi-heure de séance — c'est le seul des deux choix qui ne se rattrape
// pas.

import { showModal } from './modal.js';
import { etapesDeTravail } from '../core/recompenses.js';

/**
 * CE QUE L'ÉLÈVE A DÉJÀ FAIT, DIT COMME L'EN-TÊTE LE DIRA.
 *
 * Le décompte emprunte `etapesDeTravail`, donc la même règle que la barre de
 * progression affichera trois secondes plus tard : un jeu de récompense n'est
 * pas une étape de travail, une facultative non faite non plus. Annoncer
 * « 2 sur 6 » puis afficher « 2 / 5 étapes » ferait douter de l'un des deux.
 *
 * @param {object} o
 * @param {string} [o.nom] le nom de la séance
 * @param {Array} o.steps les étapes du parcours
 * @param {Array<string>} o.faites les stepId déjà validés
 * @returns {{phrase: string, faits: number, total: number}}
 */
export function phraseDeLaReprise({ nom, steps, faites }) {
    const done = new Set(faites || []);
    const travail = etapesDeTravail(steps, done);
    const total = travail.length;
    const faits = travail.filter(s => done.has(s.stepId)).length;
    const quoi = nom ? `« ${nom} »` : 'ce parcours';
    // TOUT EST FAIT : « 5 étapes sur 5 » se lit comme un reste à faire. On dit
    // ce qui est vrai — la séance est finie —, et le choix qui suit prend alors
    // son sens : revoir son bilan, ou la refaire.
    const phrase = (total > 0 && faits >= total)
        ? `Tu as déjà terminé ${quoi}.`
        : (faits === 1
            ? `Tu as déjà fait 1 étape sur ${total} de ${quoi}.`
            : `Tu as déjà fait ${faits} étapes sur ${total} de ${quoi}.`);
    return { phrase, faits, total };
}

function echapper(s) {
    return String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * POSE LA QUESTION, ET REND LE CHOIX.
 *
 * @param {object} o  voir `phraseDeLaReprise`
 * @returns {Promise<'reprendre'|'zero'>}
 */
export function demanderLaReprise({ nom, steps, faites }) {
    const { phrase } = phraseDeLaReprise({ nom, steps, faites });
    return new Promise((resolve) => {
        let repondu = false;
        // DEUX BOUTONS QUI DISENT CE QU'ILS FONT, c'est la règle de la maison
        // (voir `showConfirm`) : « Confirmer » et « Annuler » ne se relisent
        // pas, « Reprendre où j'en étais » et « Recommencer à zéro », si. Le
        // doux d'abord — celui qui garde le travail — et il garde le foyer.
        const corps = `
            <div style="text-align:center; padding:10px 0;">
                <p style="font-size:1.1rem; color:var(--text-main); margin:0 0 6px;">
                    ${echapper(phrase)}</p>
                <p style="font-size:.95rem; color:var(--text-muted); margin:0 0 20px;">
                    Qu'est-ce que tu veux faire&nbsp;?</p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button class="reprise-garder" style="background:var(--primary); color:#fff; border:none; padding:12px 20px; border-radius:10px; font:inherit; font-weight:700; font-size:1rem; cursor:pointer; min-height:44px;">Reprendre où j'en étais</button>
                    <button class="reprise-zero" style="background:var(--bg-app); color:var(--text-main); border:1px solid var(--border); padding:12px 20px; border-radius:10px; font:inherit; font-weight:600; font-size:1rem; cursor:pointer; min-height:44px;">Recommencer à zéro</button>
                </div>
            </div>`;
        const fenetre = showModal('Tu reviens sur cette séance', corps, {
            width: '420px',
            // LA COUCHE DE JEU EST À 10 000, ET LE MENEUR PEUT DÉJÀ Y ÊTRE :
            // la question se pose pendant que le parcours s'ouvre. Même étage
            // que le scanner, qui a payé la leçon.
            zIndex: 999999,
            onClose: () => { if (!repondu) { repondu = true; resolve('reprendre'); } }
        });
        const choisir = (quoi) => {
            if (repondu) return;
            repondu = true;
            fenetre.close();
            resolve(quoi);
        };
        const garder = fenetre.element.querySelector('.reprise-garder');
        const zero = fenetre.element.querySelector('.reprise-zero');
        if (garder) { garder.onclick = () => choisir('reprendre'); garder.focus(); }
        if (zero) zero.onclick = () => choisir('zero');
    });
}
