// LES COMMANDES DU FILET, ÉCRITES UNE FOIS POUR LES TROIS PANNEAUX.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, carnet du 24 octobre :
//
//   « il faudrait pouvoir choisir de manière globale pour les exercices à
//     tableau la présentation en tableau (bordure, épaisseur, couleur bordure,
//     couleur alternance/ bords extérieurs ou non). on peut faire un réglage
//     globale et affiner selon l'exercice »
//
// TROIS PANNEAUX ONT BESOIN DES MÊMES CINQ COMMANDES : la fiche d'un exercice
// seul (`printQuestions.js`), la feuille d'un parcours (`printParcours.js`) et
// la roue d'un exercice DANS cette feuille — la dernière étant précisément le
// « affiner selon l'exercice » de sa phrase. Les écrire trois fois, c'est
// accepter qu'un jour l'une des trois n'ait plus la même liste de couleurs que
// les autres ; c'est le défaut qu'on répare ailleurs toute la journée.
//
// ── POURQUOI UN MODULE D'INTERFACE ET NON UN RÉGLAGE DE GÉNÉRATEUR ──────────
//
// Ce ne sont pas des réglages de CONTENU : ils ne changent pas une question,
// ils changent le trait qu'on dessine autour. Ils n'ont donc rien à faire dans
// `paramSchemaOf`, qui décrit ce que l'exercice sait faire varier — ils
// appartiennent à la feuille, comme l'orientation et les colonnes.
//
// ── « COMME LA FEUILLE » EST UNE VALEUR, ET C'EST LA PREMIÈRE ───────────────
//
// Un réglage d'exercice ne REMPLACE pas celui de la feuille, il l'AFFINE : la
// roue rend donc un correctif — les seules clés qu'on a touchées — et non un
// jeu complet de valeurs. C'est la même règle que `reglagesQuiChangent` pour
// les réglages de contenu, et pour la même raison : sans elle, ouvrir une roue
// sans rien toucher figerait l'exercice sur les valeurs du moment, et changer
// la feuille ensuite ne le suivrait plus.

import { TEINTES_TABLEAU, EPAISSEURS_TABLEAU } from '../core/fiche.js';

const echapper = (s) => String(s).replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));

/** Les `<option>` d'un menu, avec « Comme la feuille » devant si on l'herite. */
function options(liste, choisie, heritage) {
    const debut = heritage
        ? '<option value="">Comme la feuille</option>'
        : '';
    return debut + liste.map(([valeur, nom]) => {
        const v = echapper(String(valeur));
        const pris = String(choisie) === String(valeur) ? ' selected' : '';
        return `<option value="${v}"${pris}>${echapper(nom)}</option>`;
    }).join('');
}

const LES_TEINTES = Object.entries(TEINTES_TABLEAU).map(([cle, t]) => [cle, t.nom]);
const LES_EPAISSEURS = EPAISSEURS_TABLEAU.map(e => [e.valeur, e.nom]);

/**
 * LES CINQ COMMANDES, EN HTML.
 *
 * @param {string} prefixe  'fq', 'pp'… — le début des identifiants
 * @param {Object} [o]
 * @param {boolean} [o.heritage] une roue d'exercice : chaque menu offre
 *                               « Comme la feuille » en premier
 * @param {Object} [o.valeurs]   ce qui est déjà réglé, pour cocher le bon cran
 *
 * LES BORDS EXTÉRIEURS SONT UN MENU ET NON UNE CASE À COCHER quand on hérite :
 * une case ne sait dire que oui ou non, et il faut ici un troisième état —
 * « comme la feuille ». Une case à demi cochée existe en HTML (`indeterminate`)
 * mais ne se règle qu'en JavaScript et ne se voit pas : personne ne devine
 * qu'on peut la mettre dans cet état-là.
 */
export function champsStyleTableau(prefixe, o = {}) {
    const v = o.valeurs || {};
    const heritage = !!o.heritage;
    const classe = `${prefixe}-style-tableau`;
    const bords = heritage
        ? `<label class="${classe}">Bords extérieurs
            <select id="${prefixe}-bords" class="cfg-input">
                ${options([['oui', 'Avec'], ['non', 'Sans']], v.bords ?? '', true)}
            </select></label>`
        : `<label class="fq-case ${classe}">
            <input type="checkbox" id="${prefixe}-bords"${v.bords === false ? '' : ' checked'}>
            Bords extérieurs</label>`;
    return `
        <label class="${classe}">Épaisseur du filet
            <select id="${prefixe}-trait" class="cfg-input">
                ${options(LES_EPAISSEURS, v.trait ?? (heritage ? '' : 0.2), heritage)}
            </select></label>
        <label class="${classe}">Couleur du filet
            <select id="${prefixe}-filet" class="cfg-input">
                ${options(LES_TEINTES, v.couleur ?? (heritage ? '' : 'gris'), heritage)}
            </select></label>
        <label class="${classe}">Couleur de l'alternance
            <select id="${prefixe}-bande" class="cfg-input">
                ${options(LES_TEINTES, v.couleurBande ?? (heritage ? '' : 'gris'), heritage)}
            </select></label>
        ${bords}`;
}

/** Les commandes du filet, dans l'ordre où on les branche. */
const CHAMPS = ['trait', 'filet', 'bande', 'bords'];

/** Brancher les cinq sur la même fonction — un seul chemin, un seul rendu. */
export function brancherStyleTableau(racine, prefixe, quoiFaire) {
    if (!racine) return;
    CHAMPS.forEach(nom => {
        const el = racine.querySelector(`#${prefixe}-${nom}`);
        if (el) el.onchange = quoiFaire;
    });
}

/**
 * CE QUE LA FEUILLE A RÉGLÉ — des valeurs pour `composerBlocs`.
 *
 * Les noms sont ceux de `DEFAUTS_BLOCS` : l'objet se répand tel quel dans les
 * options de la mise en page, sans table de correspondance à tenir à jour.
 */
export function lireStyleTableau(racine, prefixe) {
    const lu = (nom) => {
        const el = racine && racine.querySelector(`#${prefixe}-${nom}`);
        return el ? el.value : '';
    };
    const caseBords = racine && racine.querySelector(`#${prefixe}-bords`);
    return {
        traitTableau: Number(lu('trait')) || 0.2,
        couleurTableau: lu('filet') || 'gris',
        couleurBandeTableau: lu('bande') || 'gris',
        bordsExterieurs: !caseBords || caseBords.type !== 'checkbox'
            ? lu('bords') !== 'non'
            : caseBords.checked
    };
}

/**
 * CE QU'UN EXERCICE AFFINE — le correctif seul, ou `null` s'il n'affine rien.
 *
 * Rendu tel quel dans `exo.presentation` : voir `styleTableau` dans
 * `core/fiche.js`, qui le fusionne avec les valeurs de la feuille.
 */
export function lireAffinageTableau(racine, prefixe) {
    const lu = (nom) => {
        const el = racine && racine.querySelector(`#${prefixe}-${nom}`);
        return el ? el.value : '';
    };
    const out = {};
    const trait = Number(lu('trait'));
    if (lu('trait') !== '' && Number.isFinite(trait)) out.trait = trait;
    if (lu('filet')) out.couleur = lu('filet');
    if (lu('bande')) out.couleurBande = lu('bande');
    if (lu('bords')) out.bords = lu('bords') === 'oui';
    return Object.keys(out).length ? out : null;
}

/**
 * LES CINQ COMMANDES NE S'AFFICHENT QUE S'IL Y A UN FILET À RÉGLER.
 *
 * Sur une feuille « en liste » il n'y a pas de tableau, donc rien à habiller :
 * quatre menus qui ne changent rien à ce qu'on imprime sont exactement ce que
 * `core/reglagesFiche.js` existe pour empêcher ailleurs. Et « Couleur de
 * l'alternance » ne sort qu'avec l'alternance, pour la même raison.
 */
export function montrerStyleTableau(racine, prefixe, presentation) {
    if (!racine) return;
    const enTableau = presentation !== 'liste' && presentation !== 'sans';
    racine.querySelectorAll(`.${prefixe}-style-tableau`).forEach(el => {
        el.hidden = !enTableau;
    });
    const bande = racine.querySelector(`#${prefixe}-bande`);
    if (bande && bande.closest('label')) {
        bande.closest('label').hidden = !enTableau || presentation !== 'zebre';
    }
}
