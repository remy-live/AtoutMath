// CE QUE L'ÉLÈVE VOIT DE LA SÉANCE PILOTÉE.
//
// Trois choses, et rien de plus :
//
//   · LA CONSIGNE, en bandeau au-dessus de tout. Le professeur l'écrit une
//     fois, elle reste sous les yeux de la classe entière. C'est le tableau
//     noir, à ceci près qu'on ne peut pas s'asseoir dos à lui.
//   · LE MOT QU'ON LUI ADRESSE, en fenêtre. Il faut le fermer d'un bouton, et
//     c'est ce bouton qui met la coche dans la console du professeur — sans
//     quoi il devrait redire à voix haute ce qu'il vient d'écrire.
//   · LE VERROU, qui retire du chemin ce qui n'est pas le travail donné.
//
// POURQUOI LE BANDEAU EST DANS `#app-container` ET NON EN `position: fixed`.
// La coquille de l'application est déjà une colonne flexible — barre du haut,
// corps, barre du bas. Un bandeau posé dedans en `flex-shrink: 0` pousse le
// reste tout seul : rien à recalculer, rien qui recouvre un bouton, et cela
// marche à l'identique sur téléphone où la barre du bas mange déjà l'écran.
// En `fixed`, il aurait fallu tenir à jour un `padding-top` sur trois
// dispositions différentes — et l'oublier une fois cache la barre de navigation.

import { estVerrouille, estEcarte, consigneDuProf, messagesNonLus, direLu } from '../core/seanceDistante.js';
import { showModal } from './modal.js';

export function initSeanceDistanteUI() {
    document.addEventListener('seance_distante', () => rendre());
    rendre();
}

function rendre() {
    majBandeau(consigneDuProf());
    majVerrou(estVerrouille());
    majEcarte(estEcarte());
    montrerLesMots();
}

/* ------------------------------------------------------------------ Consigne */

function majBandeau(texte) {
    const hote = document.getElementById('app-container');
    if (!hote) return;
    let bandeau = document.getElementById('consigne-prof');

    if (!texte) {
        if (bandeau) bandeau.remove();
        return;
    }
    if (!bandeau) {
        bandeau = document.createElement('div');
        bandeau.id = 'consigne-prof';
        bandeau.className = 'consigne-prof';
        // Avant la barre du haut : la consigne du professeur passe avant le
        // menu de l'application, comme le tableau passe avant le cahier.
        hote.insertBefore(bandeau, hote.firstChild);
    }
    // `textContent` et non `innerHTML` : la consigne vient d'un champ de
    // formulaire, et un champ de formulaire est du texte, jamais du balisage.
    bandeau.textContent = texte;
}

/* -------------------------------------------------------------------- Verrou */

/**
 * LE VERROU EST UNE CLASSE SUR `<body>`, et le CSS fait le reste.
 *
 * On aurait pu masquer chaque bouton depuis JavaScript. On ne l'a pas fait :
 * il aurait fallu rejouer ce masquage à chaque redessin de la barre, de la
 * navigation mobile et du tiroir latéral — trois endroits, et le premier oubli
 * rouvre le catalogue. Une classe posée une fois, des règles CSS qui la
 * suivent : le verrou ne peut pas se défaire par distraction.
 */
function majVerrou(actif) {
    document.body.classList.toggle('classe-verrouillee', !!actif);
    if (!actif) return;
    // Si l'élève était DANS le catalogue au moment du verrouillage, on le
    // ramène sur son parcours : le laisser sur un écran qu'on vient de lui
    // interdire serait la pire des deux options. L'onglet « Code » n'est pas
    // concerné — il reste ouvert, c'est par lui que le travail arrive.
    const onglet = document.querySelector('.top-nav-tab.active, .bottom-nav-btn.active');
    if (onglet && /-grid$/.test(onglet.id || '')) {
        const versParcours = document.getElementById('top-btn-path')
            || document.getElementById('mob-btn-path');
        if (versParcours) versParcours.click();
    }
}

/* ------------------------------------------------------------------- Écarté */

function majEcarte(actif) {
    let voile = document.getElementById('eleve-ecarte');
    if (!actif) {
        if (voile) voile.remove();
        return;
    }
    if (voile) return;
    voile = document.createElement('div');
    voile.id = 'eleve-ecarte';
    voile.className = 'eleve-ecarte';
    // Le ton compte. « Accès refusé » se lit comme une punition affichée devant
    // les voisins ; ici on dit ce qui se passe et à qui parler.
    voile.innerHTML = `
        <div class="eleve-ecarte-carte">
            <div class="eleve-ecarte-icone" aria-hidden="true">✋</div>
            <h2>Ton professeur a mis ton accès en pause.</h2>
            <p>Ton travail est conservé. Préviens-le : il peut te réactiver
               en un clic.</p>
        </div>`;
    document.body.appendChild(voile);
}

/* ---------------------------------------------------------------- Les mots */

/**
 * UN MOT À LA FOIS, ET IL FAUT LE FERMER.
 *
 * Trois fenêtres empilées d'un coup — ce qui arrive à l'élève qui revient après
 * dix minutes hors ligne — se ferment d'un geste réflexe, sans être lues. On
 * les montre donc l'une après l'autre : la suivante n'apparaît qu'une fois la
 * précédente acquittée.
 */
function montrerLesMots() {
    if (document.getElementById('mot-du-prof')) return;   // il y en a déjà un
    const mot = messagesNonLus()[0];
    if (!mot) return;

    const corps = document.createElement('div');
    corps.id = 'mot-du-prof';
    corps.className = 'mot-du-prof';
    corps.innerHTML = `
        <p class="mot-du-prof-texte"></p>
        <button class="mot-du-prof-ok">J'ai lu</button>`;
    corps.querySelector('.mot-du-prof-texte').textContent = mot.body;

    const titre = mot.scope === 'class' ? 'Message à toute la classe' : 'Message de ton professeur';
    const fenetre = showModal(titre, corps.outerHTML, { width: '460px', zIndex: 10050 });

    // UNE SEULE SORTIE : « J'ai lu ». La fenêtre ordinaire offre une croix et
    // se ferme au clic à côté ; ici, les deux mèneraient à fermer le mot sans
    // l'avoir lu — et surtout sans que le professeur le sache, puisque c'est
    // ce bouton qui pose la coche dans sa console. Il redirait alors à voix
    // haute ce qu'il venait d'écrire, et le mot n'aurait servi à rien.
    const croix = fenetre.element.querySelector('.modal-close-btn');
    if (croix) croix.remove();
    const voile = fenetre.element.parentElement;
    if (voile) voile.onclick = null;

    const ok = fenetre.element.querySelector('.mot-du-prof-ok');
    if (ok) {
        ok.onclick = async () => {
            fenetre.close();
            await direLu([mot.id]);
            // `direLu` retire le mot de l'état et redéclenche `rendre()`, qui
            // affichera le suivant s'il y en a un.
        };
    }
}
