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
    import('../games/configUI.js').then(({ fieldHtml, readParams, wireTips }) => {
        const peindre = () => {
            el.innerHTML = '<span class="fp-contenu-titre">Contenu</span>'
                + schema.map(p => fieldHtml(p,
                    reglages[p.id] !== undefined ? reglages[p.id] : p.default)).join('');
            wireTips(el);
        };
        peindre();

        const relire = () => {
            Object.assign(reglages, readParams(el, schema));
            // Un réglage peut en faire apparaître un autre — le diviseur n'a de
            // sens qu'en division. On ne redessine que dans ce cas-là.
            const suivant = schemaPour();
            if (signature(suivant) !== signature(schema)) { schema = suivant; peindre(); }
            if (onChange) onChange();
        };
        el.addEventListener('change', relire);
        // Les bascules « Oui / Non » n'émettent pas `change` : leur écouteur
        // global ne fait que basculer la classe. On repasse derrière lui.
        const clic = (ev) => { if (ev.target.closest('.cfg-on')) setTimeout(relire, 0); };
        el.addEventListener('click', clic);
        detache = () => {
            el.removeEventListener('change', relire);
            el.removeEventListener('click', clic);
        };
    });
    return () => detache();
}
