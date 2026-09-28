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
/**
 * LES MOTS CHANGENT AVEC L'APPAREIL, PARCE QUE LE GESTE CHANGE AVEC LUI.
 *
 * Rémy : « et sur l'ordinateur car globalement les élèves le feront sur ordi au
 * collège ».
 *
 * C'EST LE CAS PRINCIPAL, ET IL AVAIT LE MAUVAIS MODE D'EMPLOI. « Prends
 * d'abord la photo, puis ajoute-la ici » décrit le geste d'un téléphone : on
 * photographie, l'image va dans la photothèque, on va la chercher. Sur un
 * ordinateur de collège, ce chemin-là existe à peine — une capture d'écran
 * Windows ne crée aucun fichier, elle va dans le PRESSE-PAPIERS. Un élève qui
 * suit la consigne cherche dans « Mes images » un fichier qui n'y est pas.
 *
 * LE VRAI GESTE, SUR WINDOWS : la touche Impr. écran, puis Ctrl+V ici. Deux
 * touches, rien à trouver, rien à nommer. Sur un Mac, ⌘⇧4 écrit sur le bureau
 * ET ⌃⌘⇧4 copie : on nomme les deux, et le dépôt par glissement marche aussi.
 *
 * ON DEVINE PAR LE POINTEUR, pas par le nom du navigateur. `(pointer: coarse)`
 * dit « un doigt » ; c'est la même question que pose la feuille de style pour
 * ses cibles de 44 px, et deux façons de deviner la même chose finiraient par
 * se contredire. Une tablette avec clavier répond « doigt » et lit la consigne
 * du téléphone — ce qui est juste : elle a un bouton de capture, pas une touche
 * Impr. écran.
 */
function motsDeLAppareil() {
    const auDoigt = typeof matchMedia === 'function'
        && matchMedia('(pointer: coarse)').matches;
    if (auDoigt) {
        return {
            bouton: 'Ajouter une photo de l\'écran',
            note: 'Prends d\'abord la photo avec les boutons de ton appareil, '
                + 'puis ajoute-la ici. Ce n\'est pas obligatoire.'
        };
    }
    // SUR UN MAC, LA TOUCHE N'EXISTE PAS ; on ne va pas lui dire « Impr. écran ».
    const mac = typeof navigator !== 'undefined'
        && /Mac|iPad|iPhone/.test(navigator.platform || navigator.userAgent || '');
    return {
        bouton: 'Coller ou choisir une photo',
        note: mac
            ? 'Appuie sur ⌃⌘⇧4, cadre l\'écran, puis colle ici avec ⌘V. '
              + 'Tu peux aussi glisser une image dans ce cadre. Ce n\'est pas obligatoire.'
            : 'Appuie sur la touche Impr. écran, puis colle ici avec Ctrl+V. '
              + 'Tu peux aussi glisser une image dans ce cadre. Ce n\'est pas obligatoire.'
    };
}

export function ouvrirSignalement({ zIndex = 10001 } = {}) {
    if (ouverte) return ouverte;
    const mots = motsDeLAppareil();
    const f = showModal('Signaler un problème', `
        <div class="sg-corps">
            <label class="sg-etiquette" for="sg-texte">Qu'est-ce qui ne va pas ?</label>
            <textarea id="sg-texte" class="sg-texte" rows="4" maxlength="${CORPS_MAX}"
                placeholder="Par exemple : « le clavier cache la question » ou « le bouton Valider ne fait rien »."></textarea>
            <p class="sg-compte" data-compte aria-live="polite"></p>

            <!-- LA PHOTO, DITE AVEC LES MOTS DE L'ÉLÈVE, ET AVEC CEUX DE SON
                 APPAREIL. Rémy : « globalement les élèves le feront sur ordi au
                 collège ». Sur un ordinateur, personne ne va chercher un
                 fichier : on appuie sur Impr. écran et l'on colle. Le mot du
                 bouton et la phrase en dessous changent donc avec la machine —
                 voir motsDeLAppareil, plus bas dans ce fichier. -->
            <div class="sg-photo" data-depot>
                <button type="button" class="sg-joindre" data-joindre>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="12" cy="12" r="3.2" />
                    </svg>
                    <span data-joindre-mot>${mots.bouton}</span>
                </button>
                <input type="file" accept="image/*" data-fichier hidden>
                <p class="sg-note">${mots.note}</p>
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

    const joindre = el.querySelector('[data-joindre]');
    const joindreMot = el.querySelector('[data-joindre-mot]');
    const depot = el.querySelector('[data-depot]');

    /**
     * UNE SEULE ROUTE POUR LES TROIS PORTES — le fichier choisi, le collage,
     * le glissement. Elles arrivent par trois événements différents et
     * produisent la même chose : un fichier image. Trois copies de ce
     * traitement, ce serait trois occasions de ne corriger que deux d'entre
     * elles.
     */
    async function prendreLaPhoto(fichier) {
        if (!fichier) return;
        dire('');
        joindre.disabled = true;
        joindreMot.textContent = 'On prépare la photo…';
        photo = await retrecirLaPhoto(fichier);
        joindre.disabled = false;
        if (!photo) {
            // ON NE BLOQUE PAS L'ENVOI POUR AUTANT : le texte vaut plus que la
            // photo, et un élève à qui l'on refuse tout parce que son image n'a
            // pas pu être lue n'enverra jamais son signalement.
            joindreMot.textContent = mots.bouton;
            dire("Cette photo n'a pas pu être préparée. Envoie ton message sans elle : "
                + "l'essentiel y sera quand même.");
            return;
        }
        joindreMot.textContent = 'Changer la photo';
        vignette.src = photo;
        apercu.hidden = false;
    }

    joindre.onclick = () => champ.click();
    el.querySelector('[data-retirer]').onclick = () => {
        photo = null;
        champ.value = '';
        apercu.hidden = true;
        vignette.removeAttribute('src');
        joindreMot.textContent = mots.bouton;
    };
    champ.addEventListener('change', () => prendreLaPhoto(champ.files && champ.files[0]));

    // ── COLLER, LA PORTE DE L'ORDINATEUR ─────────────────────────────────────
    //
    // Rémy : « globalement les élèves le feront sur ordi au collège ».
    //
    // UNE CAPTURE D'ÉCRAN WINDOWS NE CRÉE AUCUN FICHIER. Impr. écran copie dans
    // le presse-papiers, et c'est tout : sans cette écoute, l'élève qui suit le
    // geste que tout le monde connaît n'a rien à donner au sélecteur de
    // fichiers, et cherche dans « Mes images » une image qui n'y est pas.
    //
    // ON ÉCOUTE SUR TOUTE LA FENÊTRE, pas seulement sur la zone de texte. Un
    // élève qui vient de coller son écran ne se demande pas où était le
    // curseur ; il appuie sur Ctrl+V, et cela doit marcher partout dans cette
    // fenêtre. `clipboardData.files` porte l'image ; le texte collé, lui,
    // continue son chemin normalement vers le champ.
    el.addEventListener('paste', (e) => {
        const d = e.clipboardData;
        if (!d) return;
        const image = [...(d.files || [])].find(x => x.type.startsWith('image/'))
            || [...(d.items || [])].filter(x => x.type.startsWith('image/'))
                .map(x => x.getAsFile()).find(Boolean);
        if (!image) return;
        e.preventDefault();
        prendreLaPhoto(image);
    });

    // ── GLISSER UNE IMAGE DANS LE CADRE ──────────────────────────────────────
    //
    // `stopPropagation` N'EST PAS UNE PRÉCAUTION : le dépôt de fichiers du
    // logiciel écoute sur le DOCUMENT (`js/ui/deposerFichier.js`) pour importer
    // des parcours. Sans cet arrêt, la capture d'écran de l'élève lui
    // arriverait, et il répondrait qu'il ne sait pas quoi faire de ce
    // fichier — au milieu d'un signalement qui, lui, marchait très bien.
    //
    // Et `preventDefault` sur `dragover` EST OBLIGATOIRE : sans lui, le
    // navigateur refuse le dépôt et, pire, quitte l'application pour afficher
    // l'image. Un élève perdrait son texte au moment de l'illustrer.
    ['dragenter', 'dragover'].forEach(nom => depot.addEventListener(nom, (e) => {
        e.preventDefault(); e.stopPropagation();
        depot.classList.add('sg-photo--vise');
    }));
    ['dragleave', 'dragend'].forEach(nom => depot.addEventListener(nom, (e) => {
        e.stopPropagation();
        depot.classList.remove('sg-photo--vise');
    }));
    depot.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        depot.classList.remove('sg-photo--vise');
        const image = [...((e.dataTransfer && e.dataTransfer.files) || [])]
            .find(x => x.type.startsWith('image/'));
        if (image) prendreLaPhoto(image);
        else dire('Ce n\'est pas une image. Glisse une capture d\'écran, ou colle-la.');
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

    // CTRL+ENTRÉE ENVOIE, SUR L'ORDINATEUR OÙ L'ON A UN CLAVIER.
    //
    // Pas Entrée toute seule : le champ est multiligne, et un élève qui décrit
    // une panne passe à la ligne. Le raccourci qui envoie un message long sans
    // quitter le clavier s'écrit Ctrl+Entrée partout ailleurs ; on ne l'invente
    // pas ici. Le bouton reste la porte principale — c'est un raccourci, pas la
    // seule façon d'envoyer.
    zone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !envoyer.disabled) {
            e.preventDefault();
            envoyer.click();
        }
    });

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
