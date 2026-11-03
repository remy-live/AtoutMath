// LA VISITE GUIDÉE — six vrais écrans, et une bande qui explique.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai bien un mode démo dans l'accueil avec un apercu des
// exercices et aussi un mode qui montre et explique les possibilités », puis,
// devant les deux maquettes : « Ça ouvre le VRAI écran ».
//
// ── UNE BANDE, ET NON UNE BULLE POINTÉE ────────────────────────────────────
//
// On voulait une bulle accrochée à ce qu'elle désigne. Six écrans très
// différents — l'atelier, une fenêtre de fiche, une modale de partage, la carte
// de l'élève, le tableau de la classe, la préparation d'une tablette —
// voudraient six points d'accroche, c'est-à-dire six sélecteurs écrits à la
// main. Or le dépôt a payé cher cette leçon-là : un sélecteur inventé ne
// désigne rien, et « rien » a exactement l'air d'un logiciel cassé. Une bulle
// qui rate son ancre se pose en haut à gauche, par-dessus le titre, et le
// visiteur croit voir un défaut d'affichage.
//
// LA BANDE, ELLE, NE PEUT PAS RATER SON ANCRE : elle est fixée au bas de la
// fenêtre, au-dessus de tout, et elle dit en toutes lettres ce qu'on regarde.
// Elle tient au doigt comme à l'écran, et l'on n'a pas à la déplacer quand un
// écran change de forme.
//
// ── RIEN DE CE QU'ELLE ÉCRIT NE SORT DE SON TIROIR ─────────────────────────
//
// La visite a besoin d'un parcours, d'une classe, d'élèves et de résultats :
// sans eux les six écrans sont gris. Elle les sème donc — et `?visite=1` lui
// donne, depuis `index.html`, un `localStorage` préfixé et une base IndexedDB à
// elle. C'est le mécanisme du poste élève, déjà éprouvé. Quitter la visite vide
// ce tiroir et recharge l'accueil : il ne reste rien.

import { VISITE } from '../core/decouverte.js';
import { state } from '../core/state.js';
import { globalStore } from '../core/store.js';
import { journal } from '../core/journal.js';
import { classesDeDemo } from '../core/demoClasses.js';
import { parcoursDeLaVisite, tentativesDeLaVisite } from '../core/visite.js';
import { setTopNavMode } from './navigation.js';

/** Le rang de l'étape ouverte, ou -1 : la visite n'a pas commencé. */
let rang = -1;
let bande = null;

/** La visite est-elle demandée par l'adresse ? Posé par `index.html`. */
export const visiteDemandee = () => !!window.__visiteGuidee;

/**
 * ENTRER DANS LA VISITE depuis l'écran de découverte.
 *
 * ON RECHARGE, ET C'EST OBLIGATOIRE. Le tiroir préfixé est installé par un
 * script de `index.html`, avant le premier module : on ne peut pas l'installer
 * en cours de route, puisque tout ce qui est déjà chargé tient une référence au
 * vrai `localStorage`. Le rang voyage donc dans l'adresse, et non dans le
 * stockage — l'écrire avant de recharger reviendrait à écrire chez le visiteur
 * pour lui dire qu'on ne va pas écrire chez lui.
 */
export function entrerDansLaVisite(idEtape) {
    const i = Math.max(0, VISITE.findIndex(e => e.id === idEtape));
    window.location.href = window.location.pathname + '?visite=1&etape=' + i;
}

/**
 * QUITTER : on vide le tiroir, puis on revient à l'accueil.
 *
 * `localStorage.clear()` n'efface QUE le tiroir de la visite — l'objet posé par
 * `index.html` ne connaît pas les autres clefs. La base IndexedDB est vidée de
 * la même façon, par `localforage`, qui a été configuré sur celle de la visite.
 */
export async function quitterLaVisite() {
    try { window.localStorage.clear(); } catch (e) { /* tiroir verrouillé */ }
    try {
        if (window.localforage) await window.localforage.clear();
    } catch (e) { /* le préfixe suffit déjà à séparer */ }
    window.location.href = window.location.pathname;
}

/**
 * SEMER CE QU'IL FAUT POUR QUE LES SIX ÉCRANS AIENT QUELQUE CHOSE À MONTRER.
 *
 * On ne sème QUE si le tiroir est vide : une visite rouverte ne doit pas
 * empiler deux parcours de démonstration dans sa propre bibliothèque.
 */
async function semer() {
    const parcours = parcoursDeLaVisite();

    // LE PARCOURS, DANS LA BIBLIOTHÈQUE DU PROFESSEUR ET SUR LA TABLE.
    // `currentPath` est ce que l'atelier dessine ; sans lui, l'étape 1 ouvre
    // un atelier vide, c'est-à-dire l'écran qu'on voulait éviter.
    let entree = (state.teacherPaths || []).find(p => p.name === parcours.name);
    if (!entree) entree = state.saveTeacherPath(parcours.name, parcours);
    state.currentPath = { ...parcours, id: entree.id };
    state.currentPathId = entree.id;

    // ET LA MÊME SÉANCE DONNÉE À L'ÉLÈVE : c'est l'étape 4, et c'est aussi ce
    // qui referme la porte d'accueil — elle ne se montre qu'à qui n'a rien à
    // faire.
    state.setStudentPath(parcours.steps, {
        pathId: parcours.id, name: parcours.name, policy: parcours.policy
    });

    // LES CLASSES, LEURS ÉLÈVES ET LEURS JOURNAUX. Reprises telles quelles de
    // `demoClasses.js` — cinq classes, des profils qui ne se ressemblent pas,
    // et des journaux d'où le tableau de l'étape 5 est RECALCULÉ.
    const dejaLa = (await globalStore.get('classes', [])) || [];
    if (!dejaLa.length) await globalStore.set('classes', classesDeDemo({}));

    // LE JOURNAL DE CET APPAREIL, pour que « Mes progrès » ait de quoi parler.
    journal.merge(tentativesDeLaVisite());
}

/**
 * OUVRIR LE VRAI ÉCRAN D'UNE ÉTAPE.
 *
 * Chaque destination est une adresse DANS le logiciel, pas une imitation. Le
 * mode professeur est posé ou retiré avant d'y aller : c'est lui qui décide si
 * la barre du haut ouvre l'atelier ou la carte de l'élève, et le confondre
 * donnerait l'écran de l'autre.
 */
async function ouvrirLEcran(ou) {
    // ON FERME CE QUI TRAÎNE AVANT D'OUVRIR. Sans cela, revenir en arrière
    // depuis la fiche laisse la fenêtre de la fiche par-dessus l'atelier, et
    // l'étape suivante se joue derrière un voile gris.
    //
    // `.modal-overlay` EST LA SEULE CLASSE À CHERCHER, et elle a été LUE dans
    // `ui/modal.js` : toutes les fenêtres la portent, y compris celles que la
    // PAGE déclare — c'est par elle que `ui/fenetre.js` leur donne Échap et le
    // piège au clavier.
    //
    // ET C'EST PRÉCISÉMENT POURQUOI ON N'EN SUPPRIME PAS LA MOITIÉ. Neuf de
    // ces voiles sont écrits dans `index.html` et portent un identifiant : le
    // code de l'élève, la synchronisation, la confirmation universelle. Les
    // retirer du document les détruirait POUR DE BON — la visite aurait cassé
    // l'application en voulant faire le ménage, et sur un écran de
    // démonstration. Ceux-là, on les REFERME : `display` vide, et la feuille
    // de style les remet à `none`, qui est leur état normal. Ceux qui n'ont
    // pas d'identifiant ont été fabriqués par `showModal` : eux s'en vont.
    document.querySelectorAll('.modal-overlay').forEach(el => {
        if (el.id) el.style.display = ''; else el.remove();
    });
    const ancien = document.getElementById('vs-ecran');
    if (ancien) ancien.remove();
    document.documentElement.classList.remove('ecran-preparation');

    if (ou === 'atelier') {
        poserLeRole(true);
        setTopNavMode('teacher');
        const b = await import('./builder.js');
        b.renderTeacherPath();
        // LE NOM DE LA SÉANCE EST DANS UN CHAMP, PAS DANS UN TITRE.
        //
        // MESURÉ : l'atelier s'ouvrait sur « Nouveau parcours » au-dessus des
        // quatre exercices de la séance. `state.currentPath.name` était juste,
        // mais le titre que l'on voit est un `<input>` que l'atelier ne remet
        // à jour qu'en chargeant un parcours par ses propres chemins. Un
        // visiteur aurait lu « Nouveau parcours » sur une séance toute faite,
        // et c'est le genre de détail qui fait douter de tout le reste.
        const champ = document.getElementById('path-name-input');
        if (champ) champ.value = state.currentPath.name || '';
        return;
    }
    if (ou === 'fiche') {
        poserLeRole(true);
        const m = await import('./printParcours.js');
        m.ouvrirFicheParcours(state.currentPath);
        return;
    }
    if (ou === 'code') {
        poserLeRole(true);
        const m = await import('./partagerParcours.js');
        m.ouvrirPartage(state.currentPath);
        return;
    }
    if (ou === 'eleve') {
        // L'ÉLÈVE N'EST PAS PROFESSEUR, et c'est le seul moyen de voir SON
        // écran : la barre du haut remplace les vues principales par l'atelier
        // tant que le mode professeur tient.
        poserLeRole(false);
        setTopNavMode('path');
        return;
    }
    if (ou === 'bilan') {
        poserLeRole(true);
        const m = await import('./classesUI.js');
        await m.ouvrirClasses();
        return;
    }
    if (ou === 'tablette') {
        // ON LUI DONNE UNE PAGE À ELLE, ET C'EST INDISPENSABLE.
        //
        // `ouvrirLaPreparation()` écrit dans `document.body.innerHTML` : par
        // défaut, elle remplace la page ENTIÈRE — ce qui est juste quand on
        // arrive par `?preparer` sur une tablette qu'on prépare, et qui ici
        // emporterait la bande de la visite avec le reste. Le visiteur se
        // retrouverait sur l'écran de préparation, sans « Suite » ni
        // « Quitter », c'est-à-dire enfermé.
        const page = document.createElement('div');
        page.id = 'vs-ecran';
        page.className = 'vs-ecran';
        document.body.appendChild(page);
        const m = await import('./preparerTablette.js');
        await m.ouvrirLaPreparation(page);
    }
}

/**
 * POSER LE RÔLE — ET PAS SEULEMENT LE DRAPEAU.
 *
 * MESURÉ sur la première étape : `state.isTeacherMode = true` tout seul ouvre
 * un écran BLANC. Le drapeau dit ce que le code croit ; c'est la CLASSE
 * `teacher-mode` sur le corps du document qui décide ce qui s'affiche —
 * `body:not(.teacher-mode) .teacher-only { display: none !important }`, et
 * l'atelier est `teacher-only`. Le premier écran de la démonstration était
 * donc une page vide avec une barre en haut.
 *
 * ON ANNONCE AUSSI LE CHANGEMENT, parce que d'autres écrans l'écoutent : la
 * consigne de l'élève, le verrou, les mots du professeur, et la pastille qui
 * dit qui travaille. Sans l'annonce, elle resterait sur « Élève » au-dessus de
 * l'atelier.
 */
function poserLeRole(professeur) {
    state.isTeacherMode = professeur;
    document.body.classList.toggle('teacher-mode', professeur);
    document.dispatchEvent(new CustomEvent('role_change',
        { detail: { professeur } }));
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function dessinerLaBande() {
    const e = VISITE[rang];
    if (!e) return;
    if (!bande) {
        bande = document.createElement('div');
        bande.className = 'vs-bande';
        bande.setAttribute('role', 'region');
        bande.setAttribute('aria-label', 'Visite guidée');
        document.body.appendChild(bande);
        document.body.classList.add('visite-en-cours');
        bande.addEventListener('click', (ev) => {
            if (ev.target.closest('[data-quitter]')) { quitterLaVisite(); return; }
            if (ev.target.closest('[data-suivant]')) { allerALEtape(rang + 1); return; }
            if (ev.target.closest('[data-precedent]')) allerALEtape(rang - 1);
        });
    }
    const dernier = rang === VISITE.length - 1;
    bande.innerHTML = `
        <div class="vs-corps">
            <span class="vs-compte">Étape ${rang + 1} sur ${VISITE.length}</span>
            <strong class="vs-titre">${esc(e.titre)}</strong>
            <span class="vs-quoi">${esc(e.quoi)}</span>
        </div>
        <div class="vs-boutons">
            <button type="button" class="vs-btn" data-quitter>Quitter<span
                class="vs-long"> la visite</span></button>
            ${rang > 0 ? '<button type="button" class="vs-btn" data-precedent>Retour</button>' : ''}
            <button type="button" class="vs-btn vs-btn--vif" data-suivant>${
    dernier ? 'Terminer' : 'Suite'}</button>
        </div>`;
    // LA HAUTEUR DE LA BANDE EST UNE MESURE, ET ELLE CHANGE.
    //
    // À 390 px, les trois boutons passent à la ligne et la bande fait presque
    // le double. Écrite en dur dans la feuille de style, la place réservée
    // serait juste à une largeur et fausse à l'autre. MESURÉ sur l'étape de la
    // fiche : « Fermer » et « Télécharger le PDF » passaient sous la bande,
    // c'est-à-dire que la fenêtre qu'on venait montrer n'était plus
    // utilisable.
    document.documentElement.style.setProperty('--vs-bande-h',
        bande.offsetHeight + 'px');
}

export async function allerALEtape(i) {
    // APRÈS LA DERNIÈRE, ON SORT : « Terminer » et « Quitter » font la même
    // chose, et c'est voulu — une visite qui se termine sur un écran sans porte
    // oblige à chercher comment en sortir.
    if (i >= VISITE.length) { quitterLaVisite(); return; }
    rang = Math.max(0, i);
    dessinerLaBande();
    await ouvrirLEcran(VISITE[rang].ou);
    remonterLaBande();
}

/**
 * LA BANDE REPASSE AU-DESSUS DE CE QUI VIENT DE S'OUVRIR.
 *
 * MESURÉ, et la cause est dans `ui/modal.js` : une fenêtre ne prend pas un
 * étage fixe, elle appelle `etageLibre()`, qui REGARDE ce qui est peint et se
 * place juste au-dessus. C'est la bonne règle — c'est elle qui empêche une
 * fenêtre ouverte depuis un exercice de se ranger derrière lui — et elle vaut
 * aussi contre nous : la bande, si haut qu'on l'écrive dans la feuille de
 * style, passe dessous dès qu'un écran de la visite ouvre une fenêtre.
 *
 * Ce que la sonde en disait, et qui n'avait l'air de rien : « element is
 * visible, enabled and stable », puis trente secondes de
 * « intercepts pointer events ». Le bouton « Suite » était là, visible,
 * mesurable — et inatteignable. Un visiteur, lui, aurait simplement cliqué
 * dans le vide.
 *
 * ON APPLIQUE DONC LA MÊME RÈGLE QU'ELLES : on regarde, et l'on se place
 * au-dessus. Un nombre écrit en dur serait dépassé par la fenêtre suivante.
 */
function remonterLaBande() {
    if (!bande) return;
    let haut = 0;
    document.querySelectorAll('.modal-overlay, #vs-ecran').forEach(el => {
        const st = getComputedStyle(el);
        if (st.display === 'none') return;
        const z = parseInt(st.zIndex, 10);
        if (z > haut) haut = z;
    });
    bande.style.zIndex = String(Math.max(1000005, haut + 1));
}

/**
 * DÉMARRER — appelée au chargement quand l'adresse porte `?visite=1`.
 *
 * Le rang vient de l'adresse : c'est ainsi que la carte cliquée sur l'écran de
 * découverte choisit par où l'on entre.
 */
export async function demarrerLaVisite() {
    if (!visiteDemandee()) return;
    await semer();
    let i = 0;
    try {
        i = parseInt(new URLSearchParams(window.location.search).get('etape'), 10) || 0;
    } catch (e) { i = 0; }
    await allerALEtape(Math.min(Math.max(0, i), VISITE.length - 1));
    window.__visitePrete = true;
    document.dispatchEvent(new CustomEvent('visite_prete'));
}
