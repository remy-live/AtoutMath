// LES SERPENTS — à l'écran.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait
// « Snakes in Boxes ». La règle et le juge sont dans js/core/serpents.js ;
// l'écran — la peinture au doigt, la gomme, « Vérifier », le robot — est
// partagé avec Le Patchwork, dans js/games/colorierMorceaux.js.
//
// CE QUI EST PROPRE AUX SERPENTS : la longueur annoncée peut être un CALCUL.
// « 2 × 3 » au départ d'un serpent, et il faut savoir que six cases suivront
// avant même de commencer à le tracer. Le calcul mental cesse alors d'être un
// exercice pour devenir un moyen — c'est ce que Rémy demandait en écrivant
// « en rapport avec les maths ».

import { makeRng } from '../core/ids.js';
import { JeuAColorier } from './colorierMorceaux.js';
import { genererSerpents, verifierSerpents, solutionSerpents, ecrireLaLongueur,
    PALIERS_SERPENTS } from '../core/serpents.js';

const COMPETENCE = 'geo.reperage.quadrillage';

class Serpents extends JeuAColorier {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'serpents');
        this.palier = PALIERS_SERPENTS[this.params.palier] ? this.params.palier : 'facile';
        this.etiquettes = this.params.etiquettes === 'calculs' ? 'calculs' : 'nombres';
        this.rng = makeRng(this.params.seed || `sp${Date.now()}`);
        this.competence = COMPETENCE;
    }

    fabriquerGrille() {
        const g = genererSerpents({ rng: this.rng, ...PALIERS_SERPENTS[this.palier] });
        if (!g) return null;
        return {
            lignes: g.lignes, colonnes: g.colonnes, source: g,
            morceaux: g.serpents.map(s => ({
                cases: s.cases, indice: s.tete, valeur: s.longueur,
                // LE CALCUL EST TIRÉ UNE FOIS, à la fabrication de la grille.
                // Le tirer à chaque dessin ferait changer « 2 × 3 » en « 4 + 2 »
                // sous les yeux de l'élève à chaque case coloriée.
                etiquette: ecrireLaLongueur(s.longueur, this.etiquettes, this.rng)
            }))
        };
    }

    juger(grille, appartenance) { return verifierSerpents(grille.source, appartenance); }
    solutionDe(grille) { return solutionSerpents(grille.source); }

    consigneDe(reste) {
        const quoi = this.etiquettes === 'calculs'
            ? 'Le calcul donne la longueur de son serpent'
            : 'Le nombre dit la longueur de son serpent';
        return reste
            ? `Remplis la grille de serpents. ${quoi}, en cases. Un serpent va tout `
              + `droit ou tourne à angle droit, et ne remplit jamais un carré de quatre `
              + `cases. Il reste ${reste} case${reste > 1 ? 's' : ''} à colorier.`
            : 'Toutes les cases sont prises : vérifie tes serpents.';
    }

    nomDeLaQuestion() {
        return `Serpents ${this.g.lignes} × ${this.g.colonnes} — `
            + `${this.g.morceaux.length} serpents`;
    }

    attenduDit() { return 'des serpents de la bonne longueur, minces partout'; }
    motDeVictoire() { return '🏆 Tous les serpents ont leur longueur, et aucun n’est épais.'; }

    motsDuRobot() {
        return {
            ouverture: 'Chaque nombre est la tête d’un serpent, et dit sa longueur. '
                + 'Un serpent avance tout droit ou tourne à angle droit.',
            parMorceau: (m) => `Celui-ci part d’ici et fait ${m.valeur} cases`
                + (this.etiquettes === 'calculs' ? ` — c’est ce que dit ${m.etiquette}.` : '.'),
            conclusion: 'Et aucun ne remplit un carré de quatre cases : un serpent reste '
                + 'mince partout, sinon ce serait une tache.'
        };
    }
}

export function engineSerpents(container, isDemo, params) {
    const game = new Serpents(container, isDemo, params);
    game.start();
    return game;
}
