// LE PATCHWORK — à l'écran.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait
// « Quilt ». La règle et le juge sont dans js/core/patchwork.js ; l'écran — la
// peinture au doigt, la gomme, le bouton « Vérifier », le robot — est partagé
// avec Les Serpents, dans js/games/colorierMorceaux.js.
//
// IL NE RESTE ICI QUE CE QUI EST PROPRE AU PATCHWORK : la grille qu'on
// fabrique, le juge qu'on interroge, les mots qu'on dit, et le point du centre
// qu'on pose une fois la grille finie.

import { makeRng } from '../core/ids.js';
import { JeuAColorier } from './colorierMorceaux.js';
import { genererPatchwork, verifierPatchwork, solutionDe, symetrieCentrale,
    PALIERS_PATCHWORK } from '../core/patchwork.js';

const COMPETENCE = 'geo.transfo.centre-figure';

class Patchwork extends JeuAColorier {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'patchwork');
        this.palier = PALIERS_PATCHWORK[this.params.palier] ? this.params.palier : 'facile';
        this.rng = makeRng(this.params.seed || `pw${Date.now()}`);
        this.competence = COMPETENCE;
    }

    fabriquerGrille() {
        const g = genererPatchwork({ rng: this.rng, ...PALIERS_PATCHWORK[this.palier] });
        if (!g) return null;
        // L'écran commun ne connaît que des « morceaux » portant une étiquette :
        // ici l'étiquette est l'AIRE, écrite sur la case du centre quand le
        // centre tombe sur une case.
        return {
            lignes: g.lignes, colonnes: g.colonnes, source: g,
            morceaux: g.morceaux.map(m => ({
                cases: m.cases, indice: m.indice, etiquette: String(m.nombre), valeur: m.nombre
            }))
        };
    }

    juger(grille, appartenance) { return verifierPatchwork(grille.source, appartenance); }
    solutionDe(grille) { return solutionDe(grille.source); }

    consigneDe(reste) {
        return reste
            ? 'Découpe la grille en morceaux qui ont un centre de symétrie. '
              + 'Le nombre dit combien son morceau a de cases. Il reste '
              + `${reste} case${reste > 1 ? 's' : ''} à colorier.`
            : 'Toutes les cases sont coloriées : vérifie ton découpage.';
    }

    nomDeLaQuestion() {
        return `Patchwork ${this.g.lignes} × ${this.g.colonnes} — `
            + `${this.g.morceaux.length} morceaux`;
    }

    attenduDit() { return 'des morceaux qui ont tous un centre de symétrie'; }
    motDeVictoire() { return '🏆 Tous les morceaux ont leur centre de symétrie.'; }

    motsDuRobot() {
        return {
            ouverture: 'Un morceau doit retomber sur lui-même quand on le tourne d’un '
                + 'demi-tour. Le nombre dit combien il a de cases.',
            parMorceau: (m) => `Celui-ci fait ${m.valeur} case${m.valeur > 1 ? 's' : ''} : `
                + 'je cherche une forme de cette aire-là qui ait un centre.',
            conclusion: 'Le point marque le centre : au milieu d’une case pour une aire '
                + 'impaire, entre deux cases pour une aire paire.'
        };
    }

    /**
     * LA MARQUE DU CENTRE, une fois la grille finie.
     *
     * C'est le moment où l'on comprend ce qu'on vient de faire : pour les aires
     * impaires le point tombe SUR une case, pour les paires il tombe entre deux
     * cases ou au coin de quatre. Le montrer pendant la partie donnerait la
     * réponse ; le montrer après, c'est la leçon.
     */
    decorerLaVictoire() {
        const { lignes, colonnes } = this.g;
        const parMorceau = new Map();
        this.appartenance.forEach((a, i) => {
            if (a === null) return;
            if (!parMorceau.has(a)) parMorceau.set(a, []);
            parMorceau.get(a).push(i);
        });
        for (const [, cases] of parMorceau) {
            const { centre } = symetrieCentrale(cases, lignes, colonnes);
            if (!Number.isInteger(centre.r2) || !Number.isInteger(centre.c2)) continue;
            const r = Math.floor(centre.r2 / 2), c = Math.floor(centre.c2 / 2);
            const el = this.ui.grille.querySelector(`[data-i="${r * colonnes + c}"]`);
            if (!el) continue;
            el.classList.add('cm-marque');
            const surLigne = centre.r2 % 2 === 1, surColonne = centre.c2 % 2 === 1;
            if (surLigne && surColonne) el.classList.add('cm-marque--coin');
            else if (surColonne) el.classList.add('cm-marque--bord');
            else if (surLigne) el.classList.add('cm-marque--bas');
        }
    }
}

export function enginePatchwork(container, isDemo, params) {
    const game = new Patchwork(container, isDemo, params);
    game.start();
    return game;
}
