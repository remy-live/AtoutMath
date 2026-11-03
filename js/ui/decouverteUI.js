// LE MODE DÉCOUVERTE — l'écran de celui qui arrive sans rien.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 3 novembre : « j'aimerai bien un mode démo dans l'accueil avec un
// apercu des exercices et aussi un mode qui montre et explique les
// possibilités ». Puis : « les deux et pouvoir faire qqs exercices. »
//
// CET ÉCRAN PORTE DEUX DES TROIS CHOSES : la vitrine et l'essai. La visite
// guidée — celle qui OUVRE LES VRAIS ÉCRANS, son choix — vient ensuite : elle
// demande un profil de démonstration avec une classe et des élèves, pour que
// personne ne la fasse par-dessus de vraies données. Son emplacement est
// réservé ici, et il est VIDE tant qu'elle n'existe pas : une section qui
// annoncerait six étapes dont aucune ne s'ouvre serait pire que pas de
// section.
//
// ── L'APERÇU EST LE VRAI EXERCICE, PAS UNE IMAGE DE LUI ────────────────────
//
// Chaque carte fait tourner le VRAI générateur et montre l'énoncé qu'il rend.
// Une capture d'écran vieillit dès la retouche suivante et se met à mentir
// sans que personne ne le voie ; une figure tirée à l'ouverture est, par
// construction, celle d'aujourd'hui. La graine est fixe par exercice, pour que
// deux visites montrent la même vitrine — on ne compare pas deux logiciels
// différents selon l'heure.
//
// ── ET RIEN N'EST ENREGISTRÉ ───────────────────────────────────────────────
//
// « Essayer » emprunte le MÊME chemin que l'essai du professeur depuis la
// liste des nouveautés (`essayerUnExercice`) : trois questions, on avance sans
// avoir à réussir, et rien ne part au journal. Une seule écriture de cette
// règle dans le dépôt — c'est elle qui tient la promesse écrite en haut de
// l'écran.

import { VISITE, vitrineJouable } from '../core/decouverte.js';
import { getExerciseById } from '../data/catalog.js';
import { getGenerator } from '../core/registry.js';
import { makeRng } from '../core/ids.js';
// LA LONGUEUR DE L'ESSAI VIENT DE LÀ OÙ L'ESSAI SE JOUE. On l'avait écrite
// ici aussi, et les deux ont divergé : la bannière annonçait trois questions
// au-dessus d'un essai qui en servait quatre.
import { essayerUnExercice, QUESTIONS_D_ESSAI, voirLaFicheDe } from './nouveautesUI.js';

let ouvert = null;

export function fermerDecouverte() {
    if (ouvert) { ouvert.remove(); ouvert = null; }
    document.removeEventListener('keydown', surEchap);
}

function surEchap(e) {
    if (e.key === 'Escape') fermerDecouverte();
}

const esc = (s) => String(s).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * L'APERÇU D'UN EXERCICE : son énoncé, tiré par son générateur.
 *
 * On ne garde que le HTML de l'énoncé — pas les champs de saisie, pas le pavé.
 * Ce qu'une vitrine doit montrer, c'est la FIGURE : ce qu'on reconnaît d'un
 * coup d'œil et qui donne envie d'ouvrir.
 *
 * Un générateur qui refuse ces réglages-là ne doit pas emporter la vitrine
 * avec lui : on rend alors le titre, et la carte reste debout.
 */
/**
 * LA FACE D'UN JEU — pour ce qui n'a pas d'énoncé du tout.
 *
 * MESURÉ : sept exercices sur sept du domaine « Défis et énigmes » n'ont
 * AUCUN générateur, et c'est juste — ce sont des jeux autonomes, qui n'ont pas
 * de question à poser. La vitrine leur rendait une carte vide, ce que la sonde
 * a dit du premier coup : « 2 aperçus sans rien à regarder ».
 *
 * ON NE LES RETIRE PAS POUR AUTANT. Les retirer serait plus simple et ferait
 * mentir la vitrine : un visiteur en conclurait un logiciel sans jeux, alors
 * que ce sont ceux que les élèves ouvrent en premier. On leur donne donc une
 * face qui DIT ce qu'ils sont — et qui ne ressemble pas à un énoncé, parce
 * qu'elle n'en est pas un.
 */
const faceDeJeu = () => `<div class="dc-jeu">
    <svg viewBox="0 0 48 48" width="54" height="54" aria-hidden="true">
        <rect x="5" y="11" width="38" height="26" rx="7"
              fill="none" stroke="currentColor" stroke-width="3"/>
        <circle cx="16" cy="24" r="2.6" fill="currentColor"/>
        <circle cx="32" cy="20" r="2.6" fill="currentColor"/>
        <circle cx="36" cy="28" r="2.6" fill="currentColor"/>
    </svg>
    <span>Ça se joue</span>
</div>`;

function apercuDe(exo) {
    try {
        const gen = getGenerator(exo.generatorId);
        if (!gen || typeof gen.generate !== 'function') return faceDeJeu();
        const item = gen.generate({ ...(exo.params || {}) },
            { rng: makeRng(`decouverte-${exo.id}`), index: 0, total: QUESTIONS_D_ESSAI });
        if (!item || !item.prompt) return faceDeJeu();
        const html = item.prompt.html || '';
        if (html) return html;
        const texte = item.prompt.text || item.prompt.papier || '';
        return texte ? `<p class="dc-enonce">${esc(texte)}</p>` : faceDeJeu();
    } catch (e) {
        return faceDeJeu();
    }
}

/** Les niveaux d'un exercice, écrits comme sur sa fiche de catalogue. */
const niveauxDe = (exo) => ((exo.tags && exo.tags.niveaux) || []).join(' · ');

function carte(entree) {
    const { exo, pourquoi } = entree;
    const apercu = apercuDe(exo);
    // LA FICHE N'EST PROPOSÉE QUE SI ELLE EXISTE. Un bouton qui ouvre une
    // fenêtre pour y annoncer « cet exercice n'a pas de fiche » est un bouton
    // qu'il ne fallait pas mettre.
    const fiche = exo.printable
        ? `<button type="button" class="dc-btn" data-fiche="${esc(exo.id)}">La fiche</button>`
        : '';
    return `<article class="dc-carte">
        <div class="dc-apercu"><div class="dc-cadre">${apercu || ''}</div></div>
        <div class="dc-corps">
            <span class="dc-niveau">${esc(niveauxDe(exo))}</span>
            <h3 class="dc-titre">${esc(exo.title)}</h3>
            <p class="dc-quoi">${esc(pourquoi)}</p>
            <div class="dc-pied">
                <button type="button" class="dc-btn dc-btn--vif"
                        data-essayer="${esc(exo.id)}">Essayer</button>
                ${fiche}
            </div>
        </div>
    </article>`;
}

/**
 * ON RAPETISSE L'APERÇU QUI DÉBORDE, AU LIEU DE LE COUPER.
 *
 * MESURÉ sur la vitrine de dix cartes, à 1280 px : trois aperçus sur dix
 * dépassaient la hauteur du cadre, et `overflow: hidden` les coupait EN HAUT
 * ET EN BAS — la figure du disque sans son bas, la fraction sans sa question.
 * Un visiteur ne voit pas « c'est rogné » : il voit une figure bancale, et il
 * en conclut que le logiciel dessine mal.
 *
 * On ne peut pas le faire en CSS seul : la hauteur du contenu dépend du
 * générateur, qui vient de tirer sa figure. Alors on MESURE après coup, et on
 * met l'échelle qu'il faut. Le plancher à 0,62 est là parce qu'en dessous le
 * texte d'un énoncé n'est plus lisible : mieux vaut alors rogner un peu que
 * montrer une ligne qu'on ne peut pas lire.
 */
function ajusterLesApercus(racine) {
    for (const cadre of racine.querySelectorAll('.dc-cadre')) {
        const boite = cadre.parentElement;
        if (!boite) continue;
        const style = getComputedStyle(boite);
        const dispo = boite.clientHeight
            - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        const haut = cadre.getBoundingClientRect().height;
        if (!(dispo > 0) || !(haut > dispo + 1)) continue;
        cadre.style.transform = `scale(${Math.max(0.62, dispo / haut).toFixed(3)})`;
    }
}

/**
 * LA VISITE GUIDÉE — sa place, et rien d'autre pour l'instant.
 *
 * Elle ouvrira les VRAIS écrans, avec une bulle qui explique. Tant que le
 * profil de démonstration n'existe pas, on n'en montre rien : six cartes dont
 * aucune ne s'ouvre feraient croire à un logiciel cassé, ce qui est le
 * contraire de ce qu'une démonstration doit produire.
 */
function visiteHtml() {
    if (!VISITE.length) return '';
    return '';
}

export function ouvrirDecouverte() {
    fermerDecouverte();
    const { bonnes, perdues } = vitrineJouable(getExerciseById);
    if (perdues.length) {
        // On ne laisse pas une carte morte, et on ne se tait pas non plus :
        // c'est la console du professeur, pas celle du visiteur.
        console.warn('[découverte] exercices absents du catalogue :', perdues.join(', '));
    }

    const el = document.createElement('div');
    el.className = 'dc-couche';
    el.innerHTML = `
        <div class="dc-page" role="dialog" aria-label="Découvrir AtoutMath">
            <header class="dc-bandeau">
                <div>
                    <h1 class="dc-h1">Découvrir AtoutMath</h1>
                    <p class="dc-sous">Rien n'est enregistré, rien n'est noté.
                       Vous pouvez tout essayer.</p>
                </div>
                <div class="dc-sortie">
                    <button type="button" class="dc-btn" data-fermer>Revenir à l'accueil</button>
                </div>
            </header>
            ${visiteHtml()}
            <h2 class="dc-h2">Essayez vous-même
                <span>${QUESTIONS_D_ESSAI} questions, rien n'est enregistré</span></h2>
            <div class="dc-vitrine">${bonnes.map(carte).join('')}</div>
            <p class="dc-note"><b>Rien ne part, rien ne reste.</b> Les réponses
               données ici ne sont écrites nulle part : pas de compte, pas de
               bilan, pas de trace.</p>
        </div>`;
    document.body.appendChild(el);
    ouvert = el;
    ajusterLesApercus(el);

    el.addEventListener('click', (e) => {
        if (e.target.closest('[data-fermer]')) { fermerDecouverte(); return; }
        const essai = e.target.closest('[data-essayer]');
        if (essai) { essayerUnExercice(essai.dataset.essayer, fermerDecouverte); return; }
        const fiche = e.target.closest('[data-fiche]');
        if (fiche) voirLaFicheDe(fiche.dataset.fiche);
    });
    document.addEventListener('keydown', surEchap);
    return el;
}
