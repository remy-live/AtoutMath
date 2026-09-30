// LE CHAMP DE RECHERCHE, ET LE CLAVIER QUI DESCEND DANS LES RÉSULTATS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// IL Y AVAIT DEUX LISTES, ET C'ÉTAIT UNE DE TROP.
//
// Rémy : « dans le mode recherche quand on appuie sur entrée il faudrait que la
// liste arrive dans l'arbre en dessous non et pas insérer le premier lien ?
// comment peut on rendre cela optimal ? »
//
// MESURÉ, en tapant « fraction » dans l'atelier :
//
//   · la liste SOUS le champ portait déjà les 27 résultats, à plat, chacun avec
//     son œil d'aperçu et son bouton « + » ;
//   · la boîte flottante en montrait huit — les mêmes —, sans l'œil ni le
//     « + », et elle en RECOUVRAIT cinq ;
//   · la touche Entrée faisait passer le parcours de 0 à 1 étape : elle
//     insérait le premier résultat, que personne n'avait regardé.
//
// LA BOÎTE N'AVAIT PLUS QU'UNE RAISON D'ÊTRE — elle portait la navigation au
// clavier, seul chemin de qui ne se sert pas de la souris — et une seule chose
// que la liste du dessous n'avait pas : le CLASSEMENT par pertinence. On a donc
// donné le classement à la vraie liste (`classerParPertinence`, dans
// navigation.js) et le clavier avec. La boîte n'avait plus rien à elle.
//
// CE QUI RESTE, ET QUI TIENT EN QUATRE TOUCHES :
//
//   ↓        depuis le champ, entre dans les résultats ; puis descend
//   ↑        remonte, et revient au champ depuis la première ligne
//   Entrée   ajoute au parcours (professeur) ou lance l'exercice (élève)
//   Échap    efface la recherche, ou revient au champ si l'on est dans la liste
//
// ON NE GARDE AUCUNE RÉFÉRENCE VERS LES LIGNES. La liste se redessine
// entièrement à chaque frappe — `renderDrilldown` vide `#drill-content` —, si
// bien qu'une ligne mémorisée est un élément détaché du document une frappe
// plus tard. On les relit donc à chaque appui.
//
// Le classement, la recherche sans accents et le surlignage vivent dans
// core/recherche.js, éprouvés sans navigateur.

import { state } from '../core/state.js';
import { exercices, seJoueAussiADeux } from '../data/catalog.js';
import { isGame } from '../core/gameAccess.js';
import { preparer } from '../core/recherche.js';
import { openGameLayer } from '../games/engine.js';

/** Là où la recherche pose ses résultats : la liste à plat de la colonne. */
const LISTE = '#drill-content';
const LIGNE = '.exo-list-item';

const cache = new WeakMap();

/**
 * La fiche de recherche d'un exercice, normalisée UNE fois.
 *
 * « jeu » et « à deux » ne sont écrits nulle part dans les données : ils se
 * déduisent de l'activité. Ce sont pourtant deux des mots qu'on tape le plus —
 * « un jeu pour finir l'heure », « quelque chose à deux ». On les ajoute donc
 * en mots-clés.
 *
 * Exporté parce que le catalogue CLASSE avec la même fiche : sans ça, l'ordre
 * des résultats et la règle qui les garde ne diraient pas la même chose.
 */
export function ficheDe(exo) {
    let f = cache.get(exo);
    if (!f) {
        f = preparer({
            id: exo.id,
            titre: exo.title,
            chemin: exo.tags?.chemin || [],
            niveaux: exo.tags?.niveaux || [],
            // Les mots-clefs du catalogue entrent ici : c'est ce qui remplace
            // le troisième niveau de chemin. « tables » ne RANGE plus rien,
            // mais il se cherche — et c'est tout ce qu'on lui demandait.
            motsCles: [
                isGame(exo) ? 'jeu jeux' : '',
                // « à deux » se cherche : celui qui tape ces mots veut une
                // activité pour un binôme, qu'elle l'impose ou qu'elle le
                // permette. Les six jeux de plateau doivent sortir.
                seJoueAussiADeux(exo) ? 'deux joueurs duo a deux' : '',
                ...(exo.motsClefs || [])
            ].filter(Boolean),
            texte: exo.instruction || '',
            jeu: isGame(exo),
            duo: seJoueAussiADeux(exo)
        });
        cache.set(exo, f);
    }
    return f;
}

export function initRechercheUI(onFiltre) {
    const input = document.getElementById('sidebar-search-input');
    const croix = document.getElementById('sidebar-search-clear');
    if (!input) return;

    /** Les lignes de résultat telles qu'elles sont À CET INSTANT. */
    const lignes = () => [...document.querySelectorAll(`${LISTE} ${LIGNE}`)]
        .filter((e) => e.getBoundingClientRect().height > 0);

    /**
     * Donne le focus à la n-ième ligne, en bornant aux deux bouts.
     *
     * ON NE BOUCLE PAS. Une liste de vingt-sept résultats qui revient en tête
     * après la dernière ligne fait croire qu'on n'a pas bougé ; et remonter
     * depuis la première doit rendre le champ, pour corriger ce qu'on a tapé —
     * c'est le geste le plus fréquent après une recherche infructueuse.
     */
    const viser = (i) => {
        const l = lignes();
        if (!l.length) return false;
        if (i < 0) { input.focus(); input.select(); return true; }
        const cible = l[Math.min(i, l.length - 1)];
        cible.focus();
        cible.scrollIntoView({ block: 'nearest' });
        return true;
    };

    const rangCourant = () => lignes().indexOf(document.activeElement);

    /** Ce que vaut Entrée sur une ligne : ajouter, ou jouer. */
    const activer = (ligne) => {
        const id = ligne && ligne.dataset ? ligne.dataset.exo : '';
        const exo = exercices.find((e) => e.id === id);
        if (!exo) return;
        // CE QU'ON VENAIT CHERCHER N'EST PAS LE MÊME DES DEUX CÔTÉS.
        //
        // Côté ÉLÈVE, on cherche un exercice pour le faire : Entrée le lance.
        //
        // Côté PROFESSEUR, on cherche un exercice pour l'AJOUTER — c'est tout
        // le propos de l'atelier. `addStep` pose lui-même l'avis qui dit le
        // geste suivant (« ajouté — clique dessus pour le régler »), et le
        // focus reste sur la ligne : on en ajoute trois de suite sans lâcher
        // le clavier.
        if (state.isTeacherMode) {
            import('./builder.js').then((m) => m.addStep(exo.id));
            return;
        }
        openGameLayer(exo, false);
    };

    const videur = () => {
        input.value = '';
        state.searchQuery = '';
        if (croix) croix.hidden = true;
        onFiltre();
        input.focus();
    };

    input.addEventListener('input', () => {
        state.searchQuery = input.value;
        if (croix) croix.hidden = !input.value;
        onFiltre();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            // ENTRÉE ET ↓ FONT LA MÊME CHOSE, ET C'EST VOULU. Entrée, dans un
            // champ de recherche, veut dire « montre-moi ce que tu as trouvé »
            // — pas « choisis pour moi ». Elle descend donc dans les résultats,
            // où le choix se fait à vue.
            if (viser(0)) e.preventDefault();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            viser(0);
        } else if (e.key === 'Escape' && input.value) {
            e.preventDefault();
            videur();
        }
    });

    // LE CLAVIER DANS LA LISTE, BRANCHÉ SUR LE CONTENEUR. Les lignes naissent
    // et meurent à chaque frappe ; un écouteur par ligne se perdrait avec elle.
    // Celui-ci vit sur `#drill-content`, qui ne bouge pas.
    const zone = document.querySelector(LISTE);
    if (zone) zone.addEventListener('keydown', (e) => {
        const ligne = e.target.closest ? e.target.closest(LIGNE) : null;
        if (!ligne) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); viser(rangCourant() + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); viser(rangCourant() - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activer(ligne); }
        else if (e.key === 'Escape') { e.preventDefault(); input.focus(); input.select(); }
    });

    if (croix) croix.addEventListener('click', videur);
}
