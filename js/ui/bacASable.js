// LE BAC À SABLE — l'écran de celui qui a fini avant les autres.
//
// Rémy : « un élève qui a fini peut avoir une zone bac à sable avec des jeux ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE N'EST PAS LE CATALOGUE AVEC UN AUTRE NOM.
//
// L'application a déjà un catalogue de deux cents exercices, et ce n'est pas ce
// qu'il faut ici. Un élève à qui il reste sept minutes et qui doit CHOISIR
// parmi deux cents passe ses sept minutes à choisir. Le bac contient donc une
// petite liste, tenue à la main, et chaque jeu y est pour quatre raisons
// écrites dans js/core/bacASable.js — dont celle-ci, qui décide de tout : on
// doit pouvoir s'arrêter en plein milieu sans rien perdre, parce que la
// sonnerie ne prévient pas.
//
// ET LA PORTE RESTE VISIBLE MÊME FERMÉE. Un bouton qui n'apparaît pas laisse
// l'élève croire qu'il n'y a rien ; une phrase — « encore deux étapes, et le
// bac à sable s'ouvre » — lui dit quoi faire pour l'ouvrir. C'est exactement
// l'effet qu'on veut d'une récompense.

import { state } from '../core/state.js';
import { getExerciseById } from '../data/catalog.js';
import { bacOuvert, jeuxDuBac, parcoursDuBac } from '../core/bacASable.js';
import { bacFerme, tempsRestant } from '../core/seanceDistante.js';
import { avancementDuMoment } from './filSeance.js';
import { showModal } from './modal.js';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * L'ÉTAT DU BAC, POUR CET ÉLÈVE, MAINTENANT.
 *
 * Le dernier avancement connu vient du fil de la séance ; quand la séance est
 * close, le meneur n'existe plus et c'est `dernierAvancement` qui garde la
 * mémoire de ce qui a été fait.
 *
 * @param {object|null} avancement  pour les essais ; sinon on va le chercher
 */
export function etatDuBac(avancement = undefined) {
    const av = avancement === undefined ? avancementDuMoment() : avancement;
    return bacOuvert(av, { ferme: bacFerme(), chrono: tempsRestant() });
}

/** Les jeux, résolus sur le catalogue de CETTE installation. */
export function lesJeux(liste = null) {
    return jeuxDuBac(getExerciseById, liste);
}

function tuile(exo) {
    return `<button type="button" class="bac-jeu" data-bac-jeu="${esc(exo.id)}">
        <span class="bac-jeu-nom">${esc(exo.title)}</span>
        <span class="bac-jeu-quoi">${esc(exo.shortDescription || exo.description || '')}</span>
    </button>`;
}

/**
 * OUVRIR LE BAC.
 *
 * On revérifie la porte ICI, et pas seulement à l'endroit qui affiche le
 * bouton. C'est le même principe que côté serveur pour l'indice : une règle
 * tenue par un bouton absent n'est pas une règle — il suffit que le bouton
 * reste affiché une seconde de trop après la fin du chrono.
 */
export function ouvrirLeBac() {
    const porte = etatDuBac();
    if (!porte.ouvert) {
        showModal('Le bac à sable', `<p class="bac-refus">${esc(porte.dire)}</p>`,
            { width: '420px' });
        return null;
    }
    const jeux = lesJeux();
    const corps = `
        <p class="bac-mot">Tu as fini ta séance. Ce sont des mathématiques,
           mais on y joue — et tu peux arrêter quand tu veux.</p>
        <div class="bac-grille">${jeux.map(tuile).join('')}</div>`;
    const fenetre = showModal('Le bac à sable', corps, { width: '720px' });

    fenetre.element.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-bac-jeu]');
        if (!b) return;
        const exo = getExerciseById(b.getAttribute('data-bac-jeu'));
        if (!exo) return;
        fenetre.close();
        await jouerUnJeu(exo);
    });
    return fenetre;
}

/**
 * LANCER UN JEU DU BAC.
 *
 * Le parcours d'une partie est marqué `bac: true`, et c'est la partie
 * importante — elle ne se voit pas à l'écran. Sans elle, le professeur verrait
 * « Étape 1 sur 1 » remplacer « Terminé — 18 / 24 justes » dans Le direct dès
 * que l'élève ouvre un jeu, puisque le serveur montre le run le plus récent et
 * qu'une partie de Tetris est plus récente qu'un devoir rendu.
 */
async function jouerUnJeu(exo) {
    const [{ Runner }, { makeStep, makePath }, { politiquePerso }] = await Promise.all([
        import('../core/runner.js'),
        import('../core/path.js'),
        import('../core/mesExercices.js')
    ]);
    new Runner({
        path: parcoursDuBac(makeStep, makePath, exo.id, politiquePerso()),
        deviceMode: 'none',
        // En sortant, on revient là d'où l'on vient — pas sur un écran vide.
        onExit: () => import('./navigation.js').then(m => m.setTopNavMode('path'))
    }).start();
}

/**
 * LA PORTE, TELLE QU'ELLE S'AFFICHE — ouverte ou non.
 *
 * Rendue en HTML plutôt que posée dans le DOM : deux écrans s'en servent (le
 * bilan de fin de séance et le fil), et chacun la place où il veut.
 */
export function porteHtml() {
    const porte = etatDuBac();
    if (porte.pourquoi === 'ferme-par-le-prof') return '';   // fermé = invisible
    if (!porte.ouvert) {
        return `<p class="bac-porte bac-porte--close">${esc(porte.dire)}</p>`;
    }
    return `<button type="button" class="bac-porte bac-porte--ouverte" data-ouvrir-bac>
        Le bac à sable</button>`;
}

/** Un seul écouteur, posé une fois : la porte peut réapparaître n'importe où. */
let pose = false;
export function initBacASable() {
    if (pose || typeof document === 'undefined') return;
    pose = true;
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-ouvrir-bac]')) ouvrirLeBac();
    });
}

/** Exposé pour les essais : y a-t-il un parcours en cours ? */
export const enSeance = () => !!state.activeSequenceRunner;
