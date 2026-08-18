// Palette d'outils d'auteur : déplacement et repli.
//
// En bandeau fixe occupant toute la largeur, elle recouvrait l'en-tête du jeu —
// donc précisément ce qu'elle sert à tester. Devenue une petite palette
// flottante, elle se pousse là où elle ne gêne pas, et se replie sur sa
// poignée quand on veut voir l'écran tel que l'élève le verra.
//
// Le glissé lui-même vit dans ui/flottant.js : la barre de passe du banc
// d'essai en a besoin aussi, et deux implémentations du même geste finissent
// toujours par ne plus se comporter pareil.

import { placer, restaurer, rendreDeplacable } from './flottant.js';

const CLE = 'mathbox-debug-pos';
const CLE_REPLI = 'mathbox-debug-replie';
const MARGE = 6;
// En dessous de cette largeur, la palette dépliée fait plus large que l'écran.
const ETROIT = 560;

// --- LES FENÊTRES DÉTACHABLES SONT UN OUTIL D'AUTEUR --------------------------
//
// La fiche à imprimer savait se détacher — se poser à côté du jeu, se
// déplacer, se redimensionner — et ce mode se retenait d'une ouverture à
// l'autre. Un seul clic pendant une passe de test, et le professeur (ou
// l'élève) retrouvait ensuite une fenêtre baladeuse là où il attendait une
// modale. Rémy : « la modale d'impression pour le prof et l'élève (PDF) doit
// être comme avant en prenant une partie de l'écran. Elle est en modale
// bougeable que dans le mode debug. »
//
// Le détachement redevient donc ce qu'il est : un confort de mise au point,
// derrière un interrupteur de la palette d'auteur. Éteint — l'état par défaut,
// et celui de tout le monde — la fiche est une modale centrée, et le bouton de
// détachement n'existe même pas dans son titre. Le REPLI des réglages, lui,
// reste offert à tous : ce n'est pas une fenêtre qui bouge, c'est un aperçu
// qu'on veut voir en grand.

const CLE_FENETRES = 'mathbox-auteur-fenetres';
const ECOUTEURS = new Set();

/** Les fiches s'ouvrent-elles en fenêtre détachable ? Non, sauf demande. */
export function fenetresDetachables() {
    try { return localStorage.getItem(CLE_FENETRES) === '1'; } catch (e) { return false; }
}

/** Prévenir quand l'interrupteur bouge — une fiche ouverte doit suivre. */
export function surFenetresDetachables(fn) {
    ECOUTEURS.add(fn);
    return () => ECOUTEURS.delete(fn);
}

function reglerFenetresDetachables(actif) {
    try { localStorage.setItem(CLE_FENETRES, actif ? '1' : '0'); } catch (e) { /* privé */ }
    ECOUTEURS.forEach(fn => { try { fn(actif); } catch (e) { /* un abonné mort */ } });
}

export function initDebugBar() {
    const bar = document.getElementById('debug-toolbar');
    const grip = document.getElementById('db-grip');
    const fold = document.getElementById('db-fold');
    if (!bar || !grip) return;

    // En bas à gauche par défaut, et non en haut : le haut de l'écran porte
    // l'en-tête du jeu — titre, progression, chronomètre — c'est-à-dire ce
    // qu'on regarde en testant. Le bas à gauche est le coin le plus vide.
    //
    // SAUF SUR UN TÉLÉPHONE, où le bas de l'écran n'est pas vide du tout :
    // c'est là que les jeux posent leurs pavés de chiffres, et dans le Duel
    // des Tables c'est la moitié d'un joueur. La palette se pose alors à
    // mi-hauteur, contre le bord gauche — la seule bande qu'aucun jeu
    // n'utilise pour ses commandes.
    restaurer(bar, CLE, (el) => placer(el, MARGE,
        window.innerWidth < ETROIT ? window.innerHeight / 2 : window.innerHeight));
    rendreDeplacable(bar, grip, CLE);

    const fen = document.getElementById('db-fenetres');
    if (fen) {
        const majFen = () => {
            const actif = fenetresDetachables();
            fen.classList.toggle('active', actif);
            fen.title = actif
                ? 'Fiches en fenêtre détachable (mode auteur) — cliquer pour revenir à la modale'
                : 'Fiches en modale, comme pour le professeur et l\'élève — cliquer pour les rendre détachables';
            fen.setAttribute('aria-label', fen.title);
            fen.setAttribute('aria-pressed', String(actif));
        };
        fen.onclick = () => { reglerFenetresDetachables(!fenetresDetachables()); majFen(); };
        majFen();
    }

    if (fold) {
        const majRepli = (replie) => {
            bar.classList.toggle('dbg--folded', replie);
            fold.textContent = replie ? '›' : '‹';
            fold.title = replie ? 'Déplier la palette' : 'Replier la palette';
            fold.setAttribute('aria-label', fold.title);
            fold.setAttribute('aria-expanded', String(!replie));
            // La largeur change : sans recadrage, une palette dépliée près du
            // bord droit sortirait de l'écran.
            placer(bar, bar.offsetLeft, bar.offsetTop);
        };
        fold.onclick = () => {
            const replie = !bar.classList.contains('dbg--folded');
            try { localStorage.setItem(CLE_REPLI, replie ? '1' : '0'); } catch (e) { /* privé */ }
            majRepli(replie);
        };
        // SUR UN TÉLÉPHONE, LA PALETTE COMMENCE REPLIÉE.
        //
        // Rémy, capture à l'appui : « sur iPhone on ne voit pas les boutons »
        // du Duel des Tables. Ils étaient bien là — sous la palette d'auteur.
        // Dépliée, elle fait plus de quatre cents pixels de large : posée en
        // bas à gauche, comme au premier lancement, elle couvre toute la
        // rangée de touches du joueur du bas, précisément dans le seul jeu où
        // le bas de l'écran appartient à un joueur.
        //
        // Repliée, il n'en reste que la poignée : un appui la rouvre, et le
        // choix se retient d'une fois sur l'autre.
        let replie;
        try { replie = localStorage.getItem(CLE_REPLI); } catch (e) { replie = null; }
        majRepli(replie === null ? window.innerWidth < ETROIT : replie === '1');
    }
}
