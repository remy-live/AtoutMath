// LES QUATRE JEUX DE CLASSE, OUVERTS DEPUIS LE CATALOGUE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai bien avoir les jeux plateaux dispo/demo dans les derniers
// jeux ». Le plateau des nombres, le chat perché, la ruée et la pluie ne
// vivaient que dans sa barre de pilotage : il fallait ouvrir une classe, aller
// au direct, trouver l'onglet. Ils deviennent ici quatre exercices comme les
// autres — on les trouve dans « Les derniers exercices », dans la recherche, on
// peut les poser dans un parcours ou dans le bac à sable.
//
// ── CE FICHIER NE CONTIENT AUCUNE RÈGLE DE JEU, ET C'EST TOUT SON INTÉRÊT ──
//
// Les quatre écrans existent déjà et sont éprouvés : `ui/plateauUI.js` et
// `ui/jeuxVifsUI.js`, qui s'appuient eux-mêmes sur `core/plateau.js` et
// `core/consignes.js` — purs, et gardés par quarante-quatre épreuves. Recopier
// ici la moindre de ces règles en ferait une SECONDE VÉRITÉ, qui finirait par
// ne plus dire la même chose que la première. Ce dépôt a payé cette leçon
// quatre fois en une semaine.
//
// Ce fichier est donc une ENVELOPPE : il traduit les réglages du catalogue en
// réglages de partie, ouvre l'écran DANS le cadre du meneur, et le referme
// proprement. Quatre moteurs, une seule enveloppe — ils ont exactement la même
// forme, et les séparer en quatre fichiers aurait quadruplé ce commentaire-ci
// sans rien ajouter.
//
// ── POURQUOI CES JEUX NE DONNENT PAS DE NOTE ──────────────────────────────
//
// Ils sont déclarés `declarerSansNote`. Une partie n'est pas une série de
// questions : on y marque des points en RENCONTRANT quelqu'un sur un nombre, et
// le score dépend d'autant de ses coéquipiers que de soi. Compter cela comme
// une réussite personnelle dans le bilan d'un élève serait faux — et Rémy a
// déjà tranché la même question pour le défi de la classe : « Pas de note.
// C'est un jeu de classe, et il doit le rester. »
//
// ── EN SOLO, LES AUTRES PIONS SONT TENUS PAR L'ORDINATEUR ─────────────────
//
// C'est le mode démonstration des quatre jeux, celui que Rémy réclamait pour
// juger ses propres règles : « j'aimerai bien un mode démo ». Les pions de
// l'ordinateur lisent le terrain par les MÊMES fonctions que l'élève et se
// trompent comme lui, à peu près une fois sur sept. Un élève seul devant son
// écran joue donc le vrai jeu, pas une mise en scène.

import { BaseGame } from '../core/BaseGame.js';
import { ouvrirLePlateau } from '../ui/plateauUI.js';
import { ouvrirUnJeuVif } from '../ui/jeuxVifsUI.js';

/**
 * CE QUE LE DÉROULANT « sur quoi on joue » VEUT DIRE, EN CLAIR.
 *
 * LA MÊME TRADUCTION QUE LA BARRE DE PILOTAGE (`filtreDuPlateau` dans
 * `ui/espaceClasses.js`), et c'est volontaire : le professeur doit retrouver
 * EXACTEMENT le même plateau selon qu'il l'ouvre depuis le catalogue ou qu'il
 * le lance à sa classe. Deux traductions séparées auraient fini par ne plus
 * dire la même chose.
 *
 * `tables` NOMME LES FACTEURS et non les valeurs : « la table de 7 », ce sont
 * les carrés dont 7 est l'un des deux facteurs, 56 compris.
 */
export function filtreDuJeu(choix) {
    if (/^t[2-9]$/.test(String(choix || ''))) return { tables: [Number(String(choix).slice(1))] };
    if (choix === 'dures') return { tables: [6, 7, 8] };
    if (choix === 'petites') return { tables: [2, 3, 4, 5] };
    // LES GRANDS NOMBRES : tout ce que deux pions peuvent encore faire au-delà
    // de cinquante. C'est la plage où les tables cessent d'être des réflexes.
    if (choix === 'gros') return { mini: 50 };
    return {};
}

/** Les familles de consignes des trois jeux vifs, par réglage. */
export const FAMILLES = {
    faciles: ['parite', 'comparaison', 'multiples'],
    toutes: [],
    multiples: ['multiples'],
    premiers: ['premiers', 'carres']
};

/**
 * CE QUI EST COMMUN AUX QUATRE.
 *
 * ── CE QU'ON NE REDÉFINIT PAS : LA BOUCLE DU JEU ───────────────────────────
 *
 * `startGameLoop` et `runDemoSequence` ne font RIEN, et ce n'est pas un oubli :
 * ces quatre écrans portent leur propre boucle d'animation et leur propre
 * horloge — c'est ce qui permet à des ronds de se déplacer librement plutôt que
 * de sauter de case en case. `render()` ouvre la partie, et la partie vit.
 *
 * ET LA DÉMONSTRATION EST LA PARTIE ELLE-MÊME. Partout ailleurs dans ce dépôt,
 * la démonstration est un robot qui montre comment on répond à une question.
 * Ici, le jeu EST déjà peuplé de pions tenus par l'ordinateur : il n'y a rien à
 * mimer. La vignette du catalogue montre donc une partie en train de se jouer,
 * ce qui est exactement ce qu'on veut voir avant de choisir ce jeu-là.
 */
class JeuDeClasse extends BaseGame {
    constructor(container, isDemo, params, gameId) {
        super(container, isDemo, params, gameId);
        // CE JEU AVANCE TOUT SEUL : sa boucle ne s'arrête pas pour qu'on lise.
        this.tempsReel = true;
        this.partie = null;
    }

    /** Les réglages de la partie, traduits du catalogue. À chaque jeu les siens. */
    reglagesDeLaPartie() {
        return {};
    }

    render() {
        this.ouvrirLaPartie();
    }

    ouvrirLaPartie() {
        if (this.partie) { this.partie.fermer(); this.partie = null; }
        this.container.innerHTML = '';
        this.partie = this.ouvrir({
            hote: this.container,
            ...this.reglagesDeLaPartie()
        });
    }

    startGameLoop() { /* la partie porte sa propre boucle */ }
    runDemoSequence() { /* les pions de l'ordinateur SONT la démonstration */ }

    /**
     * « ↺ AUTRE PARTIE » — ce que la barre d'auteur appelle pour passer à la
     * suite.
     *
     * Une partie n'a pas de « question suivante » : elle a une FIN, et ce qui
     * suit est une autre partie. On en relance donc une, sur un terrain neuf —
     * la graine n'est pas donnée, donc elle est tirée.
     */
    showNext() {
        this.ouvrirLaPartie();
        return true;
    }

    destroy() {
        // ON FERME LA PARTIE AVANT DE VIDER LE CADRE, et dans cet ordre : elle
        // tient une boucle d'animation, une horloge et deux écouteurs de
        // clavier posés sur `document`. `innerHTML = ''` retire le terrain de
        // l'écran et ne coupe RIEN de tout cela — on l'a mesuré ailleurs dans
        // ce dépôt sous la forme d'une erreur par seconde jusqu'au
        // rechargement de la page.
        if (this.partie) { this.partie.fermer(); this.partie = null; }
        super.destroy();
    }
}

/** LE PLATEAU DES NOMBRES — deux pions qui se retrouvent prennent un nombre. */
class LePlateauDesNombres extends JeuDeClasse {
    ouvrir(o) { return ouvrirLePlateau(o); }

    reglagesDeLaPartie() {
        const p = this.params || {};
        return {
            operation: p.operation === '+' ? '+' : '×',
            style: p.style || 'question',
            quoi: filtreDuJeu(p.quoi),
            // COMBIEN DE PIONS TENUS PAR L'ORDINATEUR. Onze par défaut, comme
            // la démonstration de la barre de pilotage : c'est le nombre où
            // l'on voit le jeu vivre sans que le terrain devienne illisible.
            robots: Math.max(1, Math.min(29, Math.round(Number(p.joueurs) || 12) - 1)),
            secondes: Math.max(60, Math.min(300, Math.round(Number(p.secondes) || 180))),
            noms: p.noms !== 'non',
            penalite: p.penalite || 'fige'
        };
    }
}

/** LES TROIS JEUX VIFS — une consigne qui change toutes les vingt secondes. */
class UnJeuVif extends JeuDeClasse {
    ouvrir(o) { return ouvrirUnJeuVif({ jeu: this.quelJeu, ...o }); }

    reglagesDeLaPartie() {
        const p = this.params || {};
        return {
            familles: FAMILLES[p.familles] || FAMILLES.faciles,
            robots: Math.max(1, Math.min(29, Math.round(Number(p.joueurs) || 12) - 1)),
            secondes: Math.max(60, Math.min(300, Math.round(Number(p.secondes) || 150))),
            maxi: Math.max(20, Math.min(999, Math.round(Number(p.maxi) || 99))),
            noms: p.noms !== 'non'
        };
    }
}

class LeChatPerche extends UnJeuVif { quelJeu = 'chat'; }
class LaRuee extends UnJeuVif { quelJeu = 'ruee'; }
class LaPluieDesNombres extends UnJeuVif { quelJeu = 'pluie'; }

const lancer = (Classe, id) => (container, isDemo, params) => {
    const jeu = new Classe(container, isDemo, params, id);
    jeu.start();
    return jeu;
};

export const engineLePlateauDesNombres = lancer(LePlateauDesNombres, 'plateau-nombres');
export const engineLeChatPerche = lancer(LeChatPerche, 'chat-perche');
export const engineLaRuee = lancer(LaRuee, 'la-ruee');
export const engineLaPluieDesNombres = lancer(LaPluieDesNombres, 'pluie-nombres');
