// LA FENÊTRE OÙ L'ÉLÈVE DIT CE QUI NE MARCHE PAS.
//
// Rémy : « un bouton désactivable ou non qui permet à l'élève d'envoyer un bug
// et de prendre une photo d'écran ».
//
// TROIS DÉCISIONS, ET ELLES SE TIENNENT :
//
//   · ON DIT À L'ÉLÈVE CE QUI PART AVEC SON MESSAGE. Une ligne, en clair, sous
//     le champ. Ce n'est pas une formalité : l'exercice, la graine et le thème
//     voyagent sans qu'il les tape, et un élève qui découvrirait après coup que
//     « ça a envoyé des trucs » aurait raison de se méfier du bouton.
//   · LA PHOTO EST UNE PHOTO QU'IL JOINT, pas une capture que le logiciel
//     prend — `js/core/signalement.js` explique pourquoi la seconde n'existe
//     pas sur un iPhone. Le texte du bouton le dit avec ses mots à lui :
//     « prends une photo de ton écran, puis ajoute-la ».
//   · SON TEXTE NE SE PERD JAMAIS. La fenêtre ne se ferme qu'une fois le
//     message parti. Un échec de réseau laisse tout en place et rallume le
//     bouton : il n'a rien à retaper.
//
// PAS DE `alert`, PAS DE `confirm`. Rémy : « tu utilises des alert et prompt, on
// évite ! » — la fenêtre du dépôt, et un `showToast` pour l'accusé de réception.

import { showModal, showToast } from './modal.js';
import { journalConsole } from './consoleLog.js';
import {
    CORPS_MAX, envoyerSignalement, peutSignaler, retrecirLaPhoto
} from '../core/signalement.js';

/** Une seule fenêtre à la fois : deux appuis rapides n'en ouvrent pas deux. */
let ouverte = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * CE QUE LA CONSOLE A CRIÉ, en clair.
 *
 * `js/app.js` allume la capture de console au démarrage, pour tout le monde :
 * les erreurs sont donc déjà là quand l'élève appuie, sans qu'on ait eu à
 * installer quoi que ce soit au moment du signalement — ce qui serait arrivé
 * trop tard de toute façon, l'erreur ayant eu lieu avant.
 */
function dernieresErreurs() {
    try {
        return journalConsole().filter(l => l.niveau === 'error').map(l => l.texte);
    } catch (e) { return []; }
}

/**
 * OUVRIR LA FENÊTRE DE SIGNALEMENT.
 *
 * @param {object} [o]
 * @param {number} [o.zIndex] l'étage, quand on ouvre depuis la couche de jeu
 *                            (`#game-layer` est à 10000 : voir `showModal`).
 */
export function ouvrirSignalement({ zIndex = 10001 } = {}) {
    if (ouverte) return ouverte;
    const f = showModal('Signaler un problème', `
        <div class="sg-corps">
            <label class="sg-etiquette" for="sg-texte">Qu'est-ce qui ne va pas ?</label>
            <textarea id="sg-texte" class="sg-texte" rows="4" maxlength="${CORPS_MAX}"
                placeholder="Par exemple : « le clavier cache la question » ou « le bouton Valider ne fait rien »."></textarea>
            <p class="sg-compte" data-compte aria-live="polite"></p>

            <!-- LA PHOTO, DITE AVEC LES MOTS DE L'ÉLÈVE. « Ajoute une photo »
                 et non « joindre un fichier » : c'est le geste qu'il connaît,
                 celui des deux boutons de son téléphone. -->
            <div class="sg-photo">
                <button type="button" class="sg-joindre" data-joindre>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="12" cy="12" r="3.2" />
                    </svg>
                    Ajouter une photo de l'écran
                </button>
                <input type="file" accept="image/*" data-fichier hidden>
                <p class="sg-note">Prends d'abord la photo avec ton téléphone ou ton
                   ordinateur, puis ajoute-la ici. Ce n'est pas obligatoire.</p>
                <div class="sg-apercu" data-apercu hidden>
                    <img alt="La photo que tu vas envoyer" data-vignette>
                    <button type="button" class="sg-retirer" data-retirer>Retirer la photo</button>
                </div>
            </div>

            <p class="sg-avec">Ton professeur recevra aussi <b>l'exercice</b> que tu as ouvert,
               <b>la question</b> exacte et la <b>taille de ton écran</b> — c'est ce qui lui permet
               de retrouver le problème. Tes réponses, elles, ne sont pas envoyées ici.</p>

            <p class="sg-erreur" data-erreur role="alert" hidden></p>
            <div class="sg-actions">
                <button type="button" class="sg-btn sg-btn--fantome" data-annuler>Annuler</button>
                <button type="button" class="sg-btn sg-btn--fort" data-envoyer>Envoyer</button>
            </div>
        </div>`, { width: '460px', zIndex, onClose: () => { ouverte = null; } });

    ouverte = f;
    const el = f.element;
    const zone = el.querySelector('#sg-texte');
    const compte = el.querySelector('[data-compte]');
    const champ = el.querySelector('[data-fichier]');
    const apercu = el.querySelector('[data-apercu]');
    const vignette = el.querySelector('[data-vignette]');
    const erreur = el.querySelector('[data-erreur]');
    const envoyer = el.querySelector('[data-envoyer]');
    let photo = null;

    const dire = (texte) => {
        erreur.textContent = texte || '';
        erreur.hidden = !texte;
    };
    const compter = () => {
        const n = zone.value.length;
        // ON NE COMPTE QU'À PARTIR DES TROIS QUARTS. Un compteur affiché dès le
        // premier signe donne l'impression qu'on surveille ce qu'on écrit, au
        // moment précis où l'on veut qu'un élève écrive librement.
        compte.textContent = n > CORPS_MAX * 0.75 ? `${n} / ${CORPS_MAX} signes` : '';
    };
    zone.addEventListener('input', compter);
    compter();

    el.querySelector('[data-joindre]').onclick = () => champ.click();
    el.querySelector('[data-retirer]').onclick = () => {
        photo = null;
        champ.value = '';
        apercu.hidden = true;
        vignette.removeAttribute('src');
    };
    champ.addEventListener('change', async () => {
        const fichier = champ.files && champ.files[0];
        if (!fichier) return;
        dire('');
        const avant = el.querySelector('[data-joindre]');
        avant.disabled = true;
        avant.textContent = 'On prépare la photo…';
        photo = await retrecirLaPhoto(fichier);
        avant.disabled = false;
        avant.textContent = 'Changer la photo';
        if (!photo) {
            // ON NE BLOQUE PAS L'ENVOI POUR AUTANT : le texte vaut plus que la
            // photo, et un élève à qui l'on refuse tout parce que son image n'a
            // pas pu être lue n'enverra jamais son signalement.
            avant.textContent = 'Ajouter une photo de l\'écran';
            dire("Cette photo n'a pas pu être préparée. Envoie ton message sans elle : "
                + "l'essentiel y sera quand même.");
            return;
        }
        vignette.src = photo;
        apercu.hidden = false;
    });

    el.querySelector('[data-annuler]').onclick = () => f.close();

    envoyer.onclick = async () => {
        dire('');
        envoyer.disabled = true;
        const avant = envoyer.textContent;
        envoyer.textContent = 'Envoi…';
        const r = await envoyerSignalement({
            corps: zone.value,
            image: photo,
            erreurs: dernieresErreurs()
        });
        if (r.erreur) {
            envoyer.disabled = false;
            envoyer.textContent = avant;
            dire(r.erreur);
            return;
        }
        f.close();
        showToast(r.photo
            ? 'C\'est envoyé, avec ta photo. Merci — ton professeur le verra.'
            : 'C\'est envoyé. Merci — ton professeur le verra.', 'success', 4200);
    };

    // LE FOCUS VA DANS LE CHAMP, pas sur la croix de fermeture. Au clavier comme
    // au lecteur d'écran, la fenêtre s'ouvre à l'endroit où l'on a quelque chose
    // à faire.
    setTimeout(() => { try { zone.focus(); } catch (e) { /* écran parti */ } }, 60);
    return f;
}

/**
 * LE BOUTON DE L'EN-TÊTE : le montrer ou le cacher selon le réglage.
 *
 * APPELÉE À CHAQUE OUVERTURE D'EXERCICE, et pas une seule fois au démarrage. Le
 * réglage arrive du serveur quelques centaines de millisecondes APRÈS le
 * premier dessin de la page — le brancher une fois au chargement, c'est décider
 * avec une réponse qui n'est pas encore arrivée, et l'élève n'aurait le bouton
 * qu'au rechargement suivant.
 */
export function majBoutonSignaler() {
    const btn = document.getElementById('btn-signaler');
    if (!btn) return;
    btn.hidden = !peutSignaler();
    if (btn.dataset.branche) return;
    btn.dataset.branche = '1';
    btn.addEventListener('click', () => ouvrirSignalement());
}
