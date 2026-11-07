// LA COQUILLE DE L'ATELIER DANS L'APPLICATION — une modale, et rien de plus.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « parfait, tu me l'intègres à AtoutMath désormais. »
//
// ── CE FICHIER NE CONTIENT PLUS D'ATELIER ──────────────────────────────────
//
// Il en contenait un : celui à RÉSERVE, où l'on prenait une pièce et où on la
// posait. Rémy a essayé les deux gestes en vrai, sur une page à part, et c'est
// l'autre qui reste — celui où l'on prend un OUTIL et où l'on DESSINE.
//
// On ne garde pas l'ancien « au cas où ». Les deux gestes sont incompatibles —
// dans l'un, un appui sur la toile déplace ; dans l'autre, il dessine — et les
// faire cohabiter derrière un interrupteur, c'est deux logiciels dans un
// fichier, avec un comportement que personne ne sait plus expliquer. Il reste
// dans l'historique, qui est fait pour ça.
//
// Tout l'atelier vit désormais dans `ui/atelierToile.js`, que la page autonome
// `atelier-dingbats.html` monte aussi. Ce fichier-ci ne fait que trois choses :
// ouvrir une modale, y apporter la feuille de style, et monter l'atelier dedans.
//
// ── LA FEUILLE DE STYLE ARRIVE À LA DEMANDE, ET POURQUOI ───────────────────
//
// On aurait pu l'ajouter à `index.html`. Deux raisons de ne pas le faire :
//
//   1. LE RITUEL DE VERSION compte SIX `?v=` par fichier et refuse de monter
//      s'il en trouve sept. Un lien de plus l'arrêterait — et un rituel qu'on
//      contourne est un rituel mort ;
//   2. C'est un outil d'AUTEUR. Trois cents lignes de style qu'aucun élève
//      n'emploie n'ont pas à peser sur son premier chargement.
//
// LE NUMÉRO DE VERSION EST COPIÉ SUR UNE FEUILLE DÉJÀ CHARGÉE : il suit donc le
// rituel tout seul, et personne n'a à penser à le monter ici.

import { monterAtelier } from './atelierToile.js';

let modal = null;

/** Le `?v=NNN` que la page emploie déjà, pour ne pas servir un vieux style. */
function versionDuSite() {
    const lien = document.querySelector('link[rel="stylesheet"][href*="?v="]');
    const m = lien && lien.getAttribute('href').match(/\?v=(\d+)/);
    return m ? m[1] : '';
}

function assurerLaFeuille() {
    if (document.querySelector('link[data-atelier-toile]')) return;
    const v = versionDuSite();
    const lien = document.createElement('link');
    lien.rel = 'stylesheet';
    lien.href = `css/atelierEssai.css${v ? `?v=${v}` : ''}`;
    lien.dataset.atelierToile = '1';
    document.head.appendChild(lien);
}

function assurerLaModale() {
    if (modal) return modal;
    assurerLaFeuille();

    modal = document.createElement('div');
    modal.id = 'atelier-dingbats';
    modal.className = 'modal-overlay modal-overlay--top';
    modal.innerHTML = `
        <div class="glass-panel modal-panel-lg ae-modale">
            <div class="ae-modale-tete">
                <h2 class="ae-modale-titre">🧩 Atelier des dingbats</h2>
                <button type="button" class="ae-modale-x" id="ae-modale-fermer"
                        aria-label="Fermer l'atelier">✕</button>
            </div>
            <div class="ae-modale-corps" id="ae-racine"></div>
        </div>`;
    document.body.appendChild(modal);

    // UN CLIC SUR LE FOND FERME, mais PAS un relâché de glissé qui finit dehors :
    // on trace une figure, on sort de la toile, on relâche — et l'atelier se
    // fermait. On ne ferme que si l'appui ET le relâché sont sur le fond.
    let appuiSurFond = false;
    modal.addEventListener('pointerdown', (e) => { appuiSurFond = (e.target === modal); });
    modal.addEventListener('click', (e) => { if (e.target === modal && appuiSurFond) fermer(); });
    modal.querySelector('#ae-modale-fermer').onclick = fermer;

    // LES TOUCHES NE SORTENT PAS DE L'ATELIER. Un jeu ouvert derrière écoute
    // encore le clavier : taper « 4 » dans un champ de taille faisait répondre
    // « 4 » à la question du jeu. Le piège exact du tableau de numération, payé
    // une fois (`core/activities/outils.js`).
    //
    // L'ATELIER, LUI, ÉCOUTE SA PROPRE RACINE — qui est à l'intérieur de cette
    // modale —, donc ses raccourcis continuent de marcher.
    ['keydown', 'keyup', 'keypress'].forEach(q =>
        modal.addEventListener(q, (e) => e.stopPropagation()));

    return modal;
}

function fermer() { if (modal) modal.style.display = 'none'; }

/**
 * Ouvre l'atelier, et retrouve la récolte exactement où elle en était.
 *
 * ON MONTRE LA MODALE AVANT DE MONTER L'ATELIER, et cet ordre est une
 * correction payée : les zones de prise de la toile se posent en MESURANT chaque
 * élément (`getBBox`), et un élément dans un conteneur en `display: none` n'a
 * aucune géométrie — la mesure rend zéro et la pose est sautée sans un mot. On
 * ouvrait alors sur une toile où rien ne s'attrapait.
 */
export function ouvrirAtelierDingbats() {
    const m = assurerLaModale();
    m.style.display = 'flex';
    monterAtelier(m.querySelector('#ae-racine'));
    return m;
}
