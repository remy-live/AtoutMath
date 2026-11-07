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

/** Une couleur libre, écrite comme le navigateur la rend : `#a1b2c3`. */
const estLibre = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ''));

const rvb = (t) => `rgb(${t[0]}, ${t[1]}, ${t[2]})`;

/**
 * UNE PALETTE DE PASTILLES, ET UNE PASTILLE QUI OUVRE TOUTES LES COULEURS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « Pour les couleurs des lignes dans les tableaux, affiche des
 * pastilles de couleur et la possibilité de choisir dans une palette (un select
 * color) ».
 *
 * LE MENU DÉROULANT DISAIT LES COULEURS AU LIEU DE LES MONTRER. « Ardoise »,
 * « Violet » : il fallait choisir, fermer le menu, regarder l'aperçu, rouvrir.
 * Six allers-retours pour voir six couleurs, sur un réglage dont le seul juge
 * est l'œil. Les pastilles les montrent toutes en même temps, et le choix se
 * fait en un clic.
 *
 * LA VALEUR RESTE DANS UN CHAMP CACHÉ, de même identifiant qu'avant
 * (`#fq-filet`, `#pp-bande`…). Les trois panneaux lisent `el.value` et
 * branchent `el.onchange` : ils n'ont rien à apprendre, et une pastille cliquée
 * émet le `change` qu'ils attendent. C'est le contrat qu'on garde ; c'est la
 * commande qu'on change.
 *
 * ET LA DERNIÈRE PASTILLE EST LE SÉLECTEUR DU NAVIGATEUR — « un select color »,
 * mot pour mot. Celui du système connaît la pipette et les codes hexadécimaux,
 * et il est déjà traduit : le refaire à la main aurait donné moins bien.
 */
function palette(prefixe, nom, choisie, heritage, role) {
    const val = String(choisie ?? '');
    const libre = estLibre(val);
    const pastille = (valeur, titre, fond, dedans = '') => {
        const pris = String(valeur) === val ? ' st-pastille--prise' : '';
        return `<button type="button" class="st-pastille${pris}" data-valeur="${echapper(valeur)}"
            title="${echapper(titre)}" aria-label="${echapper(titre)}"
            aria-pressed="${String(valeur) === val ? 'true' : 'false'}"
            style="--st-fond:${fond}">${dedans}</button>`;
    };
    const commeLaFeuille = heritage
        // UN TRAIT OBLIQUE, ET NON UNE CASE BLANCHE : « comme la feuille » n'est
        // pas « blanc », et une pastille vide se lit comme la couleur blanche.
        ? pastille('', 'Comme la feuille', 'transparent', '<span class="st-neant"></span>')
        : '';
    // CHAQUE PASTILLE MONTRE LA TEINTE DE SON RÔLE. Une famille porte deux
    // couleurs : le trait, franc, et la bande, pâlie pour qu'un texte noir
    // passe dessus. Les montrer toutes les deux en « franc » ferait choisir
    // l'alternance sur une couleur qui ne s'imprimera jamais — on choisirait
    // l'orange vif et il sortirait beige.
    const crans = LES_TEINTES.map(([cle, mot]) =>
        pastille(cle, mot, rvb(TEINTES_TABLEAU[cle][role] || TEINTES_TABLEAU[cle].filet)))
        .join('');
    return `<div class="st-palette" role="group" aria-label="${echapper(nom)}">
        ${commeLaFeuille}${crans}
        <label class="st-pastille st-pastille--libre${libre ? ' st-pastille--prise' : ''}"
               title="Une autre couleur"
               style="--st-fond:${libre ? val : 'transparent'}">
            <input type="color" class="st-libre" value="${libre ? val : '#64748b'}"
                   aria-label="${echapper(nom)} — une autre couleur">
        </label>
    </div>`;
}

/** Le champ complet : son étiquette, ses pastilles, et la valeur en dessous. */
function champCouleur(prefixe, id, nom, choisie, heritage, classe, role) {
    return `<div class="${classe} st-champ" data-champ="${prefixe}-${id}">
        <span class="st-eti">${echapper(nom)}</span>
        ${palette(prefixe, nom, choisie, heritage, role)}
        <input type="hidden" id="${prefixe}-${id}" value="${echapper(String(choisie ?? ''))}">
    </div>`;
}

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
        ${champCouleur(prefixe, 'filet', 'Couleur du filet',
        v.couleur ?? (heritage ? '' : 'gris'), heritage, classe, 'filet')}
        ${champCouleur(prefixe, 'bande', 'Couleur de l\'alternance',
        v.couleurBande ?? (heritage ? '' : 'gris'), heritage, classe, 'bande')}
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
    // LES PASTILLES ÉCRIVENT DANS LE CHAMP CACHÉ, PUIS ÉMETTENT `change`.
    //
    // Un `input[type=hidden]` n'émet jamais rien tout seul : sans cette ligne,
    // la couleur changerait dans le modèle et l'aperçu ne bougerait pas — le
    // genre de défaut qu'on cherche dans le rendu pendant vingt minutes.
    ['filet', 'bande'].forEach(nom => {
        const champ = racine.querySelector(`[data-champ="${prefixe}-${nom}"]`);
        const cache = racine.querySelector(`#${prefixe}-${nom}`);
        if (!champ || !cache) return;
        const poser = (valeur, quelle) => {
            cache.value = valeur;
            champ.querySelectorAll('.st-pastille').forEach(p => {
                const prise = p === quelle;
                p.classList.toggle('st-pastille--prise', prise);
                if (p.hasAttribute('aria-pressed')) {
                    p.setAttribute('aria-pressed', prise ? 'true' : 'false');
                }
            });
            cache.dispatchEvent(new Event('change', { bubbles: true }));
        };
        champ.querySelectorAll('.st-pastille[data-valeur]').forEach(p => {
            p.onclick = () => poser(p.dataset.valeur, p);
        });
        const libre = champ.querySelector('.st-libre');
        if (libre) {
            // `input` ET NON `change` : le sélecteur du système envoie `input` à
            // chaque glissement dans la roue chromatique, et `change` seulement
            // à la fermeture. On veut l'aperçu PENDANT qu'on cherche la
            // couleur — c'est tout l'intérêt d'avoir une palette.
            libre.oninput = () => {
                const enveloppe = libre.closest('.st-pastille');
                if (enveloppe) enveloppe.style.setProperty('--st-fond', libre.value);
                poser(libre.value, enveloppe);
            };
        }
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
    // `.st-champ` ET NON `closest('label')` : la couleur n'est plus un menu
    // dans une étiquette, c'est une rangée de pastilles dans un bloc. Chercher
    // l'étiquette remontait jusqu'à celle du panneau entier, et cachait tout.
    const bande = racine.querySelector(`#${prefixe}-bande`);
    const bloc = bande && (bande.closest('.st-champ') || bande.closest('label'));
    if (bloc) bloc.hidden = !enTableau || presentation !== 'zebre';
}
