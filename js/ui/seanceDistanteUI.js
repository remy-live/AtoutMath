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

import { ceQueVoitLEleve, direLu } from '../core/seanceDistante.js';
import { state } from '../core/state.js';
import { showModal } from './modal.js';

export function initSeanceDistanteUI() {
    document.addEventListener('seance_distante', () => rendre());
    // ET QUAND ON CHANGE DE RÔLE. Sans cela, le professeur qui repasse côté
    // élève pour montrer quelque chose à sa classe n'aurait ni la consigne ni
    // les mots tant que le serveur n'a pas reparlé — jusqu'à cinq minutes.
    document.addEventListener('role_change', () => rendre());
    rendre();
}

/**
 * LE PROFESSEUR NE VOIT RIEN DE L'ÉCRAN DE L'ÉLÈVE.
 *
 * Rémy : « quand j'envoie un mot genre Coucou, il apparaît en popup sur mon
 * espace aussi ». Son navigateur avait servi à essayer le côté élève et en
 * gardait le rattachement ; il recevait donc les mots de sa propre classe.
 *
 * La règle vit dans `ceQueVoitLEleve` et non ici : cette fonction faisait cinq
 * appels indépendants, et un sixième ajouté demain aurait réintroduit le
 * défaut. Une seule porte, fermée d'un côté.
 */
function rendre() {
    const vu = ceQueVoitLEleve({ professeur: !!state.isTeacherMode });
    majBandeau(vu.consigne);
    majVerrou(vu.verrouille);
    majEcarte(vu.ecarte);
    montrerLesMots(vu.mots);
    montrerLesIndices(vu.indices);
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
/** La fenêtre ouverte, pour pouvoir la refermer sans passer par « J'ai lu ». */
let motOuvert = null;

function montrerLesMots(liste) {
    const mot = (liste || [])[0];
    // ON REFERME CE QUI NE DOIT PLUS ÊTRE LÀ. Le professeur qui bascule pendant
    // qu'un mot est ouvert le verrait rester à l'écran, et ne pourrait s'en
    // débarrasser qu'en posant un accusé de lecture faux — c'est-à-dire en
    // faisant exactement ce qu'on vient de lui épargner.
    //
    // ON GARDE LE FERMOIR RENDU PAR `showModal`, ET C'EST LA SEULE FAÇON.
    // Mesuré : le voile de `showModal` n'a AUCUNE classe, seulement des styles
    // en ligne. Chercher un `.modal-overlay` parent ne trouvait donc rien, la
    // fenêtre restait, et l'essai en deux navigateurs l'a dit.
    if (!mot) {
        if (motOuvert) { motOuvert.close(); motOuvert = null; }
        return;
    }
    if (motOuvert || document.getElementById('mot-du-prof')) return;   // il y en a déjà un

    const corps = document.createElement('div');
    corps.id = 'mot-du-prof';
    corps.className = 'mot-du-prof';
    corps.innerHTML = `
        <p class="mot-du-prof-texte"></p>
        <button class="mot-du-prof-ok">J'ai lu</button>`;
    corps.querySelector('.mot-du-prof-texte').textContent = mot.body;

    const titre = mot.scope === 'class' ? 'Message à toute la classe' : 'Message de ton professeur';
    const fenetre = showModal(titre, corps.outerHTML, { width: '460px', zIndex: 10050 });
    motOuvert = fenetre;

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
            motOuvert = null;
            await direLu([mot.id]);
            // `direLu` retire le mot de l'état et redéclenche `rendre()`, qui
            // affichera le suivant s'il y en a un.
        };
    }
}

/* ------------------------------------------------------------- Les indices */

/**
 * L'INDICE SE POSE À CÔTÉ, ET IL N'INTERROMPT RIEN.
 *
 * Rémy : « la possibilité de […] envoyer un indice ».
 *
 * TOUT CE QUI SUIT EXISTE PARCE QU'UN INDICE N'EST PAS UN MOT. Le mot ouvre
 * une fenêtre qu'il faut acquitter — c'est ce qu'il faut pour « arrêtez tout,
 * on corrige au tableau ». Faire pareil pour « regarde la retenue »
 * détruirait la pensée qu'on veut aider : l'élève reviendrait à sa question
 * après avoir cliqué, en ayant perdu le fil, et le professeur aurait nui en
 * croyant aider.
 *
 * Donc : une carte en bas à droite, qui glisse, qui reste, et qu'on referme
 * quand on veut. L'accusé de lecture part quand même — le professeur veut
 * savoir si son coup de pouce est arrivé.
 *
 * ELLE NE VOLE PAS LE FOCUS. Un élève qui tape sa réponse au clavier doit
 * pouvoir continuer à taper pendant que l'indice apparaît ; c'est pour cela
 * qu'il n'y a ni `focus()` ni `autofocus` ici, et que `role="status"` le fait
 * lire par une synthèse vocale sans couper la parole à autre chose.
 */
function montrerLesIndices(liste) {
    let hote = document.getElementById('indices-du-prof');
    if (!(liste || []).length) { if (hote) hote.remove(); return; }

    if (!hote) {
        hote = document.createElement('div');
        hote.id = 'indices-du-prof';
        hote.className = 'indices-prof';
        hote.setAttribute('role', 'status');
        hote.setAttribute('aria-live', 'polite');
        document.body.appendChild(hote);
    }

    // ON NE REDESSINE PAS CE QUI EST DÉJÀ LÀ. L'état de séance revient toutes
    // les dix secondes ; réécrire la carte à chaque fois relancerait son
    // animation d'entrée toutes les dix secondes, sous les yeux d'un élève qui
    // essaie de lire.
    const dejaLa = new Set([...hote.querySelectorAll('[data-indice]')]
        .map(x => x.getAttribute('data-indice')));
    for (const ind of liste) {
        if (dejaLa.has(ind.id)) continue;
        const carte = document.createElement('div');
        carte.className = 'indice-prof';
        carte.setAttribute('data-indice', ind.id);
        carte.innerHTML = `
            <div class="indice-prof-tete">
                <span class="indice-prof-qui">Un coup de pouce</span>
                <button type="button" class="indice-prof-fermer" aria-label="Fermer">×</button>
            </div>
            <p class="indice-prof-texte"></p>`;
        // `textContent` : le professeur a tapé du texte dans un champ, et un
        // champ de formulaire est du texte, jamais du balisage.
        carte.querySelector('.indice-prof-texte').textContent = ind.body;
        carte.querySelector('.indice-prof-fermer').onclick = () => {
            carte.classList.add('indice-prof--part');
            setTimeout(() => carte.remove(), 250);
            direLu([ind.id]);
        };
        hote.appendChild(carte);
    }

    // Les indices déjà lus ailleurs (un autre appareil) disparaissent.
    const vivants = new Set(liste.map(i => i.id));
    for (const c of [...hote.querySelectorAll('[data-indice]')]) {
        if (!vivants.has(c.getAttribute('data-indice'))) c.remove();
    }
}
