// LA LIGNE DES ÉTAPES — savoir ce que l'exercice contient, et y aller.
//
// Rémy : « c'est où l'exercice sur "un parallélogramme qui a deux côtés
// consécutifs perpendiculaires est un…" ? Où je l'ai loupé quelque part ? On
// pourrait avoir dans la barre de debug un bouton qui fait apparaître une ligne
// sur les étapes, ou une autre présentation comme tu veux. »
//
// IL NE L'AVAIT PAS LOUPÉ. Cette question-là est la troisième étape de la
// construction de l'organigramme — et il n'y avait aucun moyen de savoir
// qu'elle existait sans y arriver, ni de sauter dessus pour la regarder. Onze
// étapes derrière un seul bouton « suivant », c'est un couloir sans fenêtres :
// on avance à l'aveugle, on dépasse d'un cran ce qu'on cherchait, et l'on
// recommence depuis le début.
//
// UNE LIGNE, DONC, ET ELLE PORTE LES VRAIS TITRES. « Coder le
// parallélogramme », « Parallélogramme → Rectangle » : ce sont les titres que
// le jeu emploie pour lui-même, pas une numérotation inventée ici — un plan qui
// nomme les choses autrement que l'écran est un plan qu'il faut traduire.
//
// ON N'INVENTE PAS DE TROISIÈME CHEMIN. Cliquer une étape n'y « pose » pas le
// jeu : cela enchaîne les sauts et les retours que le meneur sait déjà faire
// (`allerAEtape`). L'organigramme se CONSTRUIT — poser l'étape 7 sans avoir
// rempli les six premières laisserait des flèches vides qu'on ne pourra plus
// garnir.

import { state } from '../core/state.js';
import { placer, restaurer, rendreDeplacable } from './flottant.js';

const CLE_POS = 'mathbox-plan-etapes-pos';
let plan = null;
let minuteur = null;

const runner = () => state.activeSequenceRunner;

/** Ouverte ? La palette d'auteur s'en sert pour allumer son bouton. */
export const planOuvert = () => !!plan;

export function basculerPlanEtapes() {
    if (plan) { fermer(); return true; }
    return ouvrir();
}

export function fermer() {
    clearInterval(minuteur);
    minuteur = null;
    if (plan) plan.remove();
    plan = null;
    majBouton();
}

function ouvrir() {
    const r = runner();
    const p = r && typeof r.planEtapes === 'function' ? r.planEtapes() : null;
    // On ne pose pas une fenêtre vide : un exercice sans étapes internes n'a
    // rien à montrer, et le dire vaut mieux que de laisser un cadre blanc.
    if (!p || !p.liste.length) return false;

    plan = document.createElement('div');
    plan.id = 'plan-etapes';
    plan.setAttribute('role', 'toolbar');
    plan.setAttribute('aria-label', 'Les étapes de l\'exercice');
    plan.innerHTML = `
        <button type="button" class="pe-grip" data-grip title="Déplacer la ligne des étapes"
            aria-label="Déplacer la ligne des étapes">⠿</button>
        <span class="pe-titre" data-partie></span>
        <div class="pe-liste" data-liste></div>
        <button type="button" class="pe-btn pe-btn--fermer" data-fermer
            title="Fermer la ligne des étapes" aria-label="Fermer">✕</button>`;
    document.body.appendChild(plan);

    // Elle se pose SOUS la palette d'auteur par défaut, et se déplace : dans un
    // volet de l'Atelier, la place utile n'est pas la même que sur un écran
    // d'ordinateur.
    restaurer(plan, CLE_POS, (el) => placer(el, 6, 46));
    rendreDeplacable(plan, plan.querySelector('[data-grip]'), CLE_POS);
    plan.querySelector('[data-fermer]').onclick = () => fermer();
    plan.querySelector('[data-liste]').onclick = (ev) => {
        const b = ev.target.closest('[data-rang]');
        if (!b) return;
        const r2 = runner();
        if (r2 && typeof r2.allerAEtape === 'function') r2.allerAEtape(Number(b.dataset.rang));
        peindre();
    };

    peindre();
    // ELLE SE REPEINT TOUTE SEULE. On avance aussi par le jeu — en répondant,
    // en sautant depuis la palette —, et une ligne qui montrerait l'étape d'il
    // y a trente secondes serait pire qu'aucune ligne. Un battement par demi-
    // seconde suffit : c'est de la lecture, pas de l'animation.
    minuteur = setInterval(peindre, 500);
    majBouton();
    return true;
}

function peindre() {
    if (!plan) return;
    const r = runner();
    const p = r && typeof r.planEtapes === 'function' ? r.planEtapes() : null;
    if (!p || !p.liste.length) { fermer(); return; }
    plan.querySelector('[data-partie]').textContent = p.partie || '';
    const liste = plan.querySelector('[data-liste]');
    liste.innerHTML = p.liste.map((titre, i) => `
        <button type="button" class="pe-etape${i === p.courante ? ' pe-etape--ici' : ''}${
    i < p.courante ? ' pe-etape--faite' : ''}" data-rang="${i}"
            title="Aller à l'étape ${i + 1} — ${echapper(titre)}"
            ${i === p.courante ? 'aria-current="step"' : ''}>
            <b>${i + 1}</b> ${echapper(titre)}</button>`).join('');
    // L'étape courante reste EN VUE. Sur onze étapes la ligne défile, et celle
    // où l'on est finissait hors du cadre dès la sixième.
    const ici = liste.querySelector('.pe-etape--ici');
    if (ici) ici.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function majBouton() {
    const b = document.getElementById('db-etapes');
    if (!b) return;
    b.classList.toggle('dbg-actif', !!plan);
    b.setAttribute('aria-pressed', String(!!plan));
}

const echapper = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
