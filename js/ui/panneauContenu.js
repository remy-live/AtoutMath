// LE BLOC « CONTENU » DES DEUX FICHES — celui qui manquait à l'une d'elles.
//
// Une fiche se décide en trois questions, toujours dans le même ordre : QUOI
// dessus, COMBIEN, SUR QUEL PAPIER. La fiche de grilles posait déjà la
// première ; la fiche de questions ne la posait pas du tout — trente-quatre
// exercices dont on ne pouvait choisir ni les tables, ni la difficulté, ni le
// niveau une fois la feuille ouverte. Rémy : « il ne faut pas oublier les
// options propres exercices ».
//
// Le bloc est donc écrit UNE fois et monté sur les deux fenêtres. Deux copies
// auraient divergé au premier réglage ajouté, et c'est exactement ainsi que le
// trou s'était creusé.
//
// DEUX SUBTILITÉS, toutes deux invisibles quand elles marchent :
//
//  · on ne redessine pas les champs à chaque frappe. Un `innerHTML` reprend le
//    focus et referme les listes ; on ne refait le panneau que si la LISTE des
//    réglages visibles a changé — c'est-à-dire quand un `visibleSi` bascule,
//    par exemple en passant l'opération posée de l'addition à la division.
//  · les valeurs sont relues toutes ensemble, jamais champ par champ : un seul
//    chemin, donc jamais deux réglages qui divergent.

import { reglagesDeFiche } from '../core/reglagesFiche.js';

/** La signature de ce qui est affiché : si elle change, il faut redessiner. */
const signature = (schema) => schema.map(p => p.id).join('|');

/**
 * Monte le bloc « Contenu » sur un élément, et le tient à jour.
 *
 * @param {HTMLElement} el          - le conteneur (masqué s'il n'y a rien à régler)
 * @param {Object} opts
 * @param {Object} opts.exo         - l'entrée de catalogue
 * @param {Array}  opts.schemaCatalogue - `paramSchemaOf(exo)`
 * @param {Object} opts.generator   - le générateur QUI FAIT LA FEUILLE
 * @param {Object} opts.reglages    - l'objet de réglages, modifié SUR PLACE
 * @param {Function} opts.onChange  - appelé après chaque changement
 * @returns {Function} de quoi démonter les écouteurs
 */
export function monterPanneauContenu(el, { exo, schemaCatalogue, generator, reglages, onChange }) {
    if (!el) return () => { };
    const ficheDistincte = !!(exo && exo.printGeneratorId && exo.printGeneratorId !== exo.generatorId);
    const schemaPour = () => reglagesDeFiche({
        schemaCatalogue: schemaCatalogue || [],
        paramsGenerateur: (generator && generator.params) || [],
        ficheDistincte, reglages
    });

    // SANS RÉGLAGE, PAS DE BLOC — et pas de titre « Contenu » posé au-dessus du
    // vide. Un tangram n'a rien à faire varier ; l'annoncer serait une promesse.
    let schema = schemaPour();
    el.hidden = !schema.length;
    el.innerHTML = '';
    if (!schema.length) return () => { };

    let detache = () => { };
    import('../games/configUI.js').then(({
        fieldHtml, readParams, wireTips, valeurDeChamp,
        brancherMarches, rafraichirBarreMarches
    }) => {
        const peindre = () => {
            el.innerHTML = '<span class="fp-contenu-titre">Contenu</span>'
                // `valeurDeChamp` et non `reglages[p.id] ?? p.default` : une
                // liste de marches se lit à travers `marchesCochees`, sinon un
                // exercice réglé avant les cases s'affiche tout coché — voir
                // games/configUI.js.
                + schema.map(p => fieldHtml(p, valeurDeChamp(p, reglages))).join('');
            wireTips(el);
            // LA BARRE DES MARCHES, SUR LE PAPIER AUSSI.
            //
            // MESURÉ, SUR QUATRE FEUILLES : les cases à cocher s'y dessinaient,
            // les trois boutons y agissaient — ils ne cherchent que le champ —,
            // mais la BARRE restait vide, du début à la fin. C'est-à-dire que
            // la moitié du réglage manquait là où il compte le plus : huit des
            // quatorze progressions converties n'existent QUE sur le papier.
            // Le professeur cochait trois crans sans voir comment ses seize
            // calculs se partageaient entre eux, et sans pouvoir en donner plus
            // au premier qu'au dernier — le geste que Rémy a demandé (« tu as
            // la frise […] entre chaque zone tu as un trait que tu peux
            // bouger »).
            //
            // `brancherMarches` pose aussi le champ caché du partage : sans
            // lui, le bouton « Tout, à parts égales » ne faisait que la moitié
            // de ce que son nom dit.
            brancherMarches(el, schema, reglages, (exo && exo.id) || '', { fiche: true });
            rafraichirBarreMarches(el);
        };
        peindre();

        const relire = () => {
            Object.assign(reglages, readParams(el, schema));
            // Un réglage peut en faire apparaître un autre — le diviseur n'a de
            // sens qu'en division. On ne redessine que dans ce cas-là.
            const suivant = schemaPour();
            if (signature(suivant) !== signature(schema)) { schema = suivant; peindre(); }
            else rafraichirBarreMarches(el);
            if (onChange) onChange();
        };
        el.addEventListener('change', relire);
        // Les bascules « Oui / Non » n'émettent pas `change` : leur écouteur
        // global ne fait que basculer la classe. On repasse derrière lui.
        const clic = (ev) => { if (ev.target.closest('.cfg-on')) setTimeout(relire, 0); };
        el.addEventListener('click', clic);
        // ET LE NOMBRE DE BLOCS EST EN TÊTE DE LA MODALE, PAS ICI. La barre
        // découpe CE nombre-là : tant qu'on ne l'écoute pas, taper « 16 » dans
        // le champ du haut laisse la barre sur son découpage d'avant, et le
        // dessin ment sur ce qu'on va imprimer.
        const cadre = el.closest('.modal-overlay');
        const combien = cadre && cadre.querySelector('#fp-combien, #fq-nb');
        const suitLeCompte = () => rafraichirBarreMarches(el);
        if (combien) combien.addEventListener('input', suitLeCompte);
        detache = () => {
            el.removeEventListener('change', relire);
            el.removeEventListener('click', clic);
            if (combien) combien.removeEventListener('input', suitLeCompte);
        };
    });
    return () => detache();
}
