// LA CORBEILLE DES PARCOURS — ce qu'on y voit, et ce qu'on peut en faire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « supprimer en bloc, mettre dans la corbeille », et sur ce qu'elle
// garde : « il y reste 30 jours, puis part tout seul ».
//
// ELLE VIT DANS SON PROPRE MODULE PARCE QUE DEUX ÉCRANS L'OUVRENT : le tiroir
// de l'atelier et la fenêtre « Gérer mes parcours ». Elle était écrite dans
// `builder.js`, et la fenêtre de gestion l'y aurait recopiée — deux corbeilles
// à tenir d'accord, dont une finirait par ne plus savoir restaurer.
//
// ELLE VIENT DU SERVEUR À CHAQUE OUVERTURE, et non d'une copie locale : un
// parcours jeté depuis le poste de la salle doit s'y trouver quand on l'ouvre
// depuis chez soi. C'est tout l'intérêt d'une corbeille rangée là-bas.

import { showModal, showToast, showConfirm } from './modal.js';
import { quandLisible, instantDe } from '../core/explorateurParcours.js';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * @param {Function} [auChangement] rappelé quand la corbeille a bougé, pour que
 *                                  l'écran qui l'a ouverte se redessine.
 */
export async function ouvrirLaCorbeille(auChangement) {
    const { laCorbeille, sortirDeLaCorbeille, viderLaCorbeille } =
        await import('../core/parcoursServeur.js');
    const { parcours, jours, erreur } = await laCorbeille();
    if (erreur) return showToast(erreur, 'error', 6000);

    const modal = showModal('La corbeille', `
        <p class="ec-note">Un parcours reste ici ${jours} jours, puis s'efface
           tout seul. Les séances déjà faites par les élèves restent au bilan.</p>
        <div class="ec-choix-liste">${
    parcours.length ? parcours.map((p) => `
            <button type="button" class="ec-choix-ligne" data-sortir="${esc(p.id)}">
                <b>${esc(p.name || 'Sans nom')}</b>
                <span class="ec-note">jeté ${esc(quandLisible(instantDe(p.supprime_le)))} — le remettre</span>
            </button>`).join('')
        : '<p class="ec-note">La corbeille est vide.</p>'}</div>
        ${parcours.length ? `<div class="ec-seance-gestes">
            <button type="button" class="ec-bouton ec-bouton--rouge" id="corbeille-vider"
                    >Vider la corbeille (${parcours.length})</button>
        </div>` : ''}`, { width: '480px' });

    const prevenir = () => { if (typeof auChangement === 'function') auChangement(); };

    modal.element.onclick = async (ev) => {
        const remettre = ev.target.closest('[data-sortir]');
        if (remettre) {
            const r = await sortirDeLaCorbeille([remettre.dataset.sortir]);
            modal.close();
            prevenir();
            return showToast(r.erreur || '↩ Parcours remis dans la bibliothèque.',
                r.erreur ? 'error' : 'success', 4000);
        }
        if (ev.target.closest('#corbeille-vider')) {
            // ON EFFACE POUR DE BON, DONC ON LE DEMANDE UNE SECONDE FOIS. C'est
            // le seul geste du logiciel qui détruit un parcours sans retour —
            // mettre à la corbeille, puis vider : deux volontés, pas une.
            const ok = await new Promise((repondre) => {
                showConfirm(
                    `Les ${parcours.length} parcours de la corbeille seront effacés `
                    + '<b>définitivement</b>.<br><br>Ce geste ne s\'annule pas.',
                    () => repondre(true),
                    { titre: 'Vider la corbeille', bouton: 'Vider',
                        onCancel: () => repondre(false) });
            });
            if (!ok) return;
            const r = await viderLaCorbeille();
            modal.close();
            prevenir();
            showToast(r.erreur || `🗑 Corbeille vidée (${r.combien || 0}).`,
                r.erreur ? 'error' : 'success', 4000);
        }
    };
}
