// L'ATELIER DES DINGBATS — poser des mots, les orienter, les colorer, et en
// sortir du JSON.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, premier jet : « qqch pour éditer des dingbats et les transformer en json.
// Globalement un éditeur de lettre où on peut choisir l'orientation la couleur
// rajouter des traits des formes. »
//
// RÉMY, après l'avoir essayé : « qu'il se sauve au fur et à mesure et je te les
// enverrai grâce à un bouton exporter. Du drag drop facile, qqch d'hyper facile,
// et je donne la solution. Et on peut mettre des indices. »
//
// ── CE QUE LA SECONDE PHRASE A CHANGÉ ──────────────────────────────────────
//
// LA PREMIÈRE VERSION ÉDITAIT UNE ÉNIGME. C'était le mauvais objet : on ne
// compose pas UN dingbat, on en compose une poignée entre deux cours, et on les
// envoie ensemble. L'atelier tient donc maintenant une RÉCOLTE — chaque
// composition se range dans la bande du haut, chaque frappe est enregistrée, et
// le bouton « Exporter » rend le tout d'un coup.
//
// « SE SAUVE AU FUR ET À MESURE » SE PREND AU MOT : il n'y a aucun bouton
// « enregistrer ». Il n'y en a pas parce qu'un bouton d'enregistrement est une
// promesse qu'on oublie de tenir — et perdre un quart d'heure de composition
// parce qu'on a fermé l'onglet serait exactement ce qui fait abandonner un outil.
//
// « DU DRAG DROP FACILE » : on ne clique plus un bouton qui dépose au milieu, on
// PREND dans la réserve et on POSE où l'on veut. Deux gestes, et il faut les
// deux — c'est la règle qu'`echiquierAtelier.js` a déjà apprise :
//
//   · on prend et on glisse (le geste de la souris, et celui du doigt) ;
//   · ou l'on touche une pièce de la réserve PUIS l'endroit (le geste du tableau
//     blanc interactif, et le seul qui ne rate jamais).
//
// LE GLISSÉ EST ÉCRIT EN ÉVÉNEMENTS DE POINTEUR, PAS EN « HTML5 drag and drop ».
// Ce dernier ne marche pas au doigt sur iOS — et Rémy compose sur son iPhone. Un
// glisser-déposer qui ne marche que sur ordinateur n'est pas « hyper facile » :
// c'est un glisser-déposer qu'il ne pourra pas employer là où il s'en sert.
//
// ── CE QUI N'A PAS CHANGÉ, ET POURQUOI ─────────────────────────────────────
//
// On DÉPLACE au doigt, mais on RÈGLE la taille et l'orientation sur des
// curseurs. Une poignée de redimensionnement fait dix pixels de côté, intenable
// au doigt sur un téléphone, et l'orientation au doigt ne tombe jamais sur un
// angle rond. Un curseur à pas de 5° tombe sur 90 du premier coup.
//
// Les cent neuf énigmes du jeu ne passent toujours pas par ici : elles sont
// écrites à la main, Rémy les a validées à l'œil une par une, et un éditeur qui
// les relirait pour les réécrire les rendrait « presque » pareilles — c'est-à-dire
// plus les siennes. Elles restent sous la toile, comme modèles.

import { DINGBATS } from '../data/dingbats.js';
import { DISPOSITIONS, dessiner, THEMES, NIVEAUX, juste, attendues } from '../core/dingbat.js';
import {
    TOILE, COULEURS, FORMES_LIBRES, elementNeuf, validerLibre,
    enigmeEnTexte, lotEnTexte, lireUnLot, direLibre, dessinerElement
} from '../core/dingbatLibre.js';
import { copierDans, telechargerTexte, jourPourFichier } from './exporter.js';
import { showToast } from './modal.js';

const CLE = 'atoutmath.atelier.dingbats.recolte';

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Une énigme vierge : une toile NUE, qu'on garnit en prenant dans la réserve. */
function enigmeVierge() {
    return {
        id: '', theme: 'maths', niveau: 1, reponse: '', variantes: [],
        aides: [], explication: '', elements: []
    };
}

/** LA RÉCOLTE — toutes les compositions, et celle qu'on regarde. */
let lot = [enigmeVierge()];
let courant = 0;
let enigme = lot[0];
/** L'élément sélectionné dans la composition courante. −1 : aucun. */
let choisi = -1;
/** La pièce en main, qui se posera au prochain appui sur la toile. */
let outil = null;
let magnetisme = true;
let commeEleve = false;
let modele = DINGBATS[0] ? DINGBATS[0].id : '';

let modal = null;

// ── LA RÉSERVE : ce qu'on prend pour le poser ───────────────────────────────

/**
 * LES PIÈCES, DANS L'ORDRE OÙ L'ON S'EN SERT.
 *
 * Le mot d'abord — c'est lui l'énigme —, puis les formes qui l'entourent, puis
 * les traits qui la traversent. L'ordre d'une réserve est l'ordre du geste.
 */
const RESERVE = [
    { id: 'mot', nom: 'Un mot', genre: 'mot' },
    ...FORMES_LIBRES.map(f => ({ id: `forme-${f.id}`, nom: f.nom, genre: 'forme', forme: f.id })),
    { id: 'trait', nom: 'Un trait', genre: 'trait' },
    { id: 'fleche', nom: 'Une flèche', genre: 'trait', fleche: true }
];

/**
 * L'ÉLÉMENT QU'UNE PIÈCE DE LA RÉSERVE FABRIQUE, posé en (x, y).
 *
 * Un TRAIT n'a pas de centre : on l'étale de part et d'autre du point visé, pour
 * que le doigt tombe au milieu du trait et non sur un de ses bouts.
 */
function elementDeLaReserve(piece, x, y) {
    if (piece.genre === 'trait') {
        return elementNeuf('trait', { x1: x - 70, y1: y, x2: x + 70, y2: y, fleche: !!piece.fleche });
    }
    if (piece.genre === 'forme') return elementNeuf('forme', { forme: piece.forme, x, y });
    return elementNeuf('mot', { x, y });
}

/** L'aperçu d'une pièce : le VRAI rendu, en petit. Un aperçu à part mentirait. */
function apercuDeLaPiece(piece) {
    let el;
    if (piece.genre === 'mot') {
        el = { type: 'mot', texte: 'Aa', x: 30, y: 21, taille: 18, couleur: 'encre' };
    } else if (piece.genre === 'trait') {
        el = { type: 'trait', x1: 8, y1: 21, x2: 52, y2: 21, epaisseur: 3, couleur: 'encre', fleche: !!piece.fleche };
    } else {
        el = { type: 'forme', forme: piece.forme, x: 30, y: 21, largeur: 38, hauteur: 26, epaisseur: 2.5, couleur: 'encre' };
    }
    return `<svg viewBox="0 0 60 42" aria-hidden="true">${dessinerElement(el)}</svg>`;
}

// ── CE QUI SE SAUVE, ET QUAND ───────────────────────────────────────────────

/**
 * ENREGISTRER LA RÉCOLTE ENTIÈRE.
 *
 * Rémy : « qu'il se sauve au fur et à mesure ». Appelée à chaque frappe, à
 * chaque glissé, à chaque clic — jamais par un bouton. Écrire une vingtaine de
 * compositions dans `localStorage` coûte une fraction de milliseconde ; perdre
 * un quart d'heure de travail coûte l'outil lui-même.
 */
function garder() {
    try {
        localStorage.setItem(CLE, JSON.stringify({ lot, courant }));
    } catch (e) {
        // LE SEUL CAS OÙ L'ON PARLE : un `localStorage` plein ou refusé fait
        // échouer l'enregistrement EN SILENCE, et c'est exactement la promesse
        // qu'on vient de faire. On le dit une fois, pas à chaque frappe.
        if (!garder.prevenu) {
            garder.prevenu = true;
            showToast('Attention : cet appareil refuse d\'enregistrer. '
                + 'Exporte ta récolte avant de fermer l\'onglet.', 'warning', 8000);
        }
    }
}

/** Une énigme relue, remise à la forme que l'atelier attend. */
function remiseEnForme(x) {
    return {
        ...enigmeVierge(), ...x,
        elements: Array.isArray(x.elements) ? x.elements : [],
        variantes: Array.isArray(x.variantes) ? x.variantes : [],
        // UNE RÉCOLTE D'HIER NE CONNAÎT QUE `aide`, AU SINGULIER : l'atelier n'en
        // offrait qu'un avant que Rémy n'en demande plusieurs, et les cent neuf
        // énigmes du jeu l'écrivent encore ainsi. On la fait monter de version
        // sans rien perdre, et sans toucher au fichier de données.
        aides: Array.isArray(x.aides) ? x.aides : (x.aide ? [x.aide] : [])
    };
}

function relire() {
    try {
        const b = JSON.parse(localStorage.getItem(CLE) || 'null');
        // ON VÉRIFIE CE QU'ON RELIT. Un JSON d'une version précédente, ou tronqué
        // par un onglet fermé au mauvais moment, rendrait un atelier qui jette au
        // premier dessin — et l'on chercherait la faute dans le code.
        if (b && Array.isArray(b.lot) && b.lot.length) {
            lot = b.lot.map(remiseEnForme);
            courant = Math.min(Math.max(0, Number(b.courant) || 0), lot.length - 1);
        }
    } catch (e) { /* on repart d'une toile neuve */ }
    enigme = lot[courant];
    choisi = enigme.elements.length ? 0 : -1;
}

// ── LE SQUELETTE ────────────────────────────────────────────────────────────

function assurerModale() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'atelier-dingbats';
    modal.className = 'modal-overlay modal-overlay--top';
    modal.innerHTML = `
        <div class="glass-panel modal-panel-lg dgl-panneau">
            <div class="dgl-tete">
                <h2 class="dgl-titre">🧩 Atelier des dingbats</h2>
                <span class="dgl-sauve" id="dgl-sauve" role="status">enregistré au fur et à mesure</span>
                <button type="button" class="dgl-x" id="dgl-fermer" aria-label="Fermer">✕</button>
            </div>

            <div class="dgl-bande" id="dgl-bande" aria-label="Tes compositions"></div>

            <div class="dgl-corps">
                <div class="dgl-colonne dgl-colonne--toile">
                    <div class="dgl-reserve" id="dgl-reserve" role="toolbar"
                         aria-label="La réserve : prends une pièce et pose-la sur la toile"></div>
                    <p class="dgl-note" id="dgl-consigne"></p>
                    <div class="dgl-toile-cadre" id="dgl-toile-cadre"></div>
                    <div class="dgl-sous-toile">
                        <label class="dgl-coche"><input type="checkbox" id="dgl-magnetisme" checked>
                            Magnétisme</label>
                        <label class="dgl-coche"><input type="checkbox" id="dgl-comme-eleve">
                            Voir comme l'élève</label>
                        <span class="dgl-espace"></span>
                        <button type="button" class="dgl-btn" data-dupliquer title="Dupliquer l'élément choisi">⧉</button>
                        <button type="button" class="dgl-btn" data-devant title="Mettre devant">▲</button>
                        <button type="button" class="dgl-btn" data-derriere title="Mettre derrière">▼</button>
                        <button type="button" class="dgl-btn dgl-btn--danger" data-supprimer
                                title="Enlever l'élément choisi">🗑</button>
                    </div>
                    <div class="dgl-avis" id="dgl-avis" role="status"></div>

                    <div class="dgl-bloc">
                        <h3 class="dgl-h3">Les ${DINGBATS.length} déjà écrits — pour s'en inspirer</h3>
                        <select id="dgl-modele" class="dgl-select-large"></select>
                        <div class="dgl-modele-duo">
                            <div class="dgl-modele-vue" id="dgl-modele-vue"></div>
                            <div class="dgl-modele-dit" id="dgl-modele-dit"></div>
                        </div>
                    </div>
                </div>

                <div class="dgl-colonne dgl-colonne--reglages">
                    <div class="dgl-bloc" id="dgl-inspecteur"></div>

                    <div class="dgl-bloc">
                        <h3 class="dgl-h3">La solution</h3>
                        <label class="dgl-champ">Ce qu'il faut lire
                            <input type="text" id="dgl-reponse" maxlength="60"
                                placeholder="racine carrée"></label>
                        <label class="dgl-champ">Autres écritures acceptées (séparées par des virgules)
                            <input type="text" id="dgl-variantes" maxlength="160"
                                placeholder="la racine, racine"></label>
                        <label class="dgl-champ">L'explication, donnée après
                            <textarea id="dgl-explication" rows="2" maxlength="300"
                                placeholder="Le mot est écrit dans un carré : on lit « racine carrée »."></textarea></label>
                    </div>

                    <div class="dgl-bloc">
                        <h3 class="dgl-h3">Les indices</h3>
                        <p class="dgl-note">Du plus discret au plus parlant, donnés un à un.
                            Un indice dit où REGARDER, jamais la réponse.</p>
                        <div id="dgl-aides"></div>
                        <button type="button" class="dgl-btn" id="dgl-aide-plus">＋ Un indice</button>
                    </div>

                    <div class="dgl-bloc">
                        <h3 class="dgl-h3">Le rangement</h3>
                        <div class="dgl-duo">
                            <label class="dgl-champ">Thème
                                <select id="dgl-theme">${THEMES.map(t =>
                                    `<option value="${t.id}">${esc(t.label)}</option>`).join('')}</select></label>
                            <label class="dgl-champ">Niveau
                                <select id="dgl-niveau">${NIVEAUX.map(x =>
                                    `<option value="${x.id}">${esc(x.nom)}</option>`).join('')}</select></label>
                        </div>
                        <label class="dgl-champ">L'identifiant
                            <input type="text" id="dgl-id" maxlength="40" placeholder="dg-racine-carree"></label>
                    </div>
                </div>
            </div>

            <div class="dgl-pied">
                <textarea class="dgl-export" id="dgl-json" data-export rows="4" spellcheck="false"
                    aria-label="Le JSON de ta récolte"></textarea>
                <div class="dgl-pied-boutons">
                    <label class="dgl-coche"><input type="checkbox" id="dgl-tout" checked>
                        Toute la récolte</label>
                    <span class="dgl-espace"></span>
                    <button type="button" class="btn-secondary" id="dgl-relire">↺ Relire ce JSON</button>
                    <button type="button" class="btn-secondary" id="dgl-copier">📋 Copier</button>
                    <button type="button" class="btn-primary" id="dgl-fichier">⤓ Exporter</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    // UN CLIC SUR LE FOND FERME, mais PAS un relâché de glissé qui finit dehors :
    // on pose un mot, on sort de la toile, on relâche — et l'atelier se fermait.
    // On ne ferme que si l'appui ET le relâché sont sur le fond. (Le travail est
    // enregistré désormais, mais fermer sans l'avoir voulu reste désagréable.)
    let appuiSurFond = false;
    modal.addEventListener('pointerdown', (e) => { appuiSurFond = (e.target === modal); });
    modal.addEventListener('click', (e) => { if (e.target === modal && appuiSurFond) fermer(); });

    // LES TOUCHES NE SORTENT PAS DE L'ATELIER. Un jeu ouvert derrière écoute
    // encore le clavier : taper « 4 » dans un champ de taille faisait répondre
    // « 4 » à la question du jeu. Le piège exact du tableau de numération, payé
    // une fois (`core/activities/outils.js`).
    ['keydown', 'keyup', 'keypress'].forEach(q =>
        modal.addEventListener(q, (e) => e.stopPropagation()));

    brancher();
    return modal;
}

function fermer() { if (modal) modal.style.display = 'none'; }

/** Le petit mot qui dit que c'est enregistré — il s'allume une seconde. */
let minuterieSauve = 0;
function direQueCestSauve() {
    const el = modal && modal.querySelector('#dgl-sauve');
    if (!el) return;
    el.classList.add('dgl-sauve--frais');
    clearTimeout(minuterieSauve);
    minuterieSauve = setTimeout(() => el.classList.remove('dgl-sauve--frais'), 900);
}

/**
 * TOUT CE QU'ON FAIT PASSE PAR ICI : on enregistre, et l'on redessine ce qui a
 * pu changer.
 *
 * UN SEUL CHEMIN, et c'est la seule façon de tenir « qu'il se sauve au fur et à
 * mesure » : aucune action ne peut oublier d'enregistrer, puisqu'aucune action
 * n'a d'autre sortie. La première version avait un `garder()` recopié à onze
 * endroits — il en manquait deux.
 */
function change(quoi = {}) {
    garder();
    direQueCestSauve();
    if (quoi.toile !== false) peindreToile();
    if (quoi.inspecteur) peindreInspecteur();
    if (quoi.aides) peindreAides();
    if (quoi.bande !== false) peindreBande();
    peindreAvis();
    peindreJson();
}

// ── LA BANDE DES COMPOSITIONS ───────────────────────────────────────────────

function peindreBande() {
    const bande = modal.querySelector('#dgl-bande');
    const vignette = (d, i) => {
        let dessin = '';
        try { dessin = dessiner({ ...d, forme: 'libre' }); } catch (e) { dessin = ''; }
        const nom = String(d.reponse || '').trim() || 'sans solution';
        return `<div class="dgl-vignette${i === courant ? ' dgl-vignette--courante' : ''}">
            <button type="button" class="dgl-vignette-btn" data-aller="${i}"
                    aria-current="${i === courant}" title="Reprendre « ${esc(nom)} »">
                <span class="dgl-vignette-dessin">${dessin || '<span class="dgl-vignette-vide">vide</span>'}</span>
                <span class="dgl-vignette-nom">${esc(nom)}</span>
            </button>
            <button type="button" class="dgl-vignette-x" data-jeter="${i}"
                    aria-label="Jeter « ${esc(nom)} »">✕</button>
        </div>`;
    };
    // LE « REPRENDRE » N'EXISTE QUE QUAND IL Y A QUELQUE CHOSE À REPRENDRE. Un
    // bouton grisé en permanence est un bouton qu'on cesse de voir ; celui-ci
    // apparaît au moment où l'on vient de perdre une composition, c'est-à-dire
    // au seul moment où on le cherche.
    const reprendre = derniereJetee
        ? `<button type="button" class="dgl-vignette-neuve dgl-vignette-reprendre" id="dgl-reprendre"
                   title="Remettre « ${esc(String(derniereJetee.enigme.reponse || 'sans solution').trim())} »"
                   >↩<span>Reprendre</span></button>`
        : '';
    bande.innerHTML = lot.map(vignette).join('')
        + `<button type="button" class="dgl-vignette-neuve" id="dgl-neuve"
                   title="Commencer une nouvelle énigme">＋<span>Nouvelle</span></button>`
        + reprendre;

    bande.querySelectorAll('[data-aller]').forEach(b => {
        b.onclick = () => allerA(Number(b.dataset.aller));
    });
    bande.querySelectorAll('[data-jeter]').forEach(b => {
        b.onclick = () => jeter(Number(b.dataset.jeter));
    });
    bande.querySelector('#dgl-neuve').onclick = () => {
        lot.push(enigmeVierge());
        allerA(lot.length - 1);
    };
    const btnReprendre = bande.querySelector('#dgl-reprendre');
    if (btnReprendre) btnReprendre.onclick = () => { reprendreLaJetee(); };
}

function allerA(i) {
    courant = Math.min(Math.max(0, i), lot.length - 1);
    enigme = lot[courant];
    choisi = enigme.elements.length ? 0 : -1;
    outil = null;
    remplirLesChamps();
    peindreReserve();
    change({ inspecteur: true, aides: true });
}

/** La dernière jetée, pour pouvoir la reprendre. Une seule suffit. */
let derniereJetee = null;

function jeter(i) {
    // ON NE DEMANDE PAS CONFIRMATION, ON REND LE GESTE RÉVERSIBLE. Une boîte
    // « êtes-vous sûr ? » se clique sans la lire ; un « Reprendre » qu'on voit
    // après coup se lit, parce qu'on vient de perdre quelque chose. Et de toute
    // façon la maison ne veut pas de `confirm` : « on évite ! ».
    derniereJetee = { enigme: lot[i], rang: i };
    const nom = String(lot[i].reponse || '').trim() || 'sans solution';
    lot.splice(i, 1);
    if (!lot.length) lot.push(enigmeVierge());
    allerA(courant > i ? courant - 1 : Math.min(courant, lot.length - 1));
    showToast(`« ${nom} » est jetée — le bouton ↩ de la bande la remet.`, 'warning', 7000);
}

// ── LA TOILE ────────────────────────────────────────────────────────────────

const courantEl = () => (choisi >= 0 ? enigme.elements[choisi] : null) || null;

function peindreToile() {
    const cadre = modal.querySelector('#dgl-toile-cadre');

    // VU COMME L'ÉLÈVE : exactement le dessin du jeu, sans une poignée. C'est le
    // seul moyen de savoir si l'énigme se lit — les cadres de sélection et les
    // ronds de poignée changent ce qu'on voit, donc ce qu'on croit.
    if (commeEleve) {
        let html;
        try { html = dessiner({ ...enigme, forme: 'libre' }); }
        catch (e) { html = `<p class="dgl-rate">${esc(e.message)}</p>`; }
        cadre.innerHTML = `<div class="dg-cadre dgl-cadre-eleve">${html}</div>`;
        return;
    }

    const corps = enigme.elements.map((e, i) => {
        let dedans;
        // `rendreLibre` ne peut pas servir ici : il exige au moins un mot et jette
        // sur une toile vide — ce qui est juste pour le JEU, et faux pour un
        // atelier où la toile EST vide avant qu'on pose le premier élément.
        try { dedans = dessinerElement(e); } catch (err) { dedans = ''; }
        return `<g class="dgl-el${i === choisi ? ' dgl-el--choisi' : ''}" data-el="${i}">${dedans}</g>`;
    }).join('');

    // LA GRILLE SE VOIT QUAND LE MAGNÉTISME EST ALLUMÉ, et pas autrement : une
    // grille affichée sans magnétisme promet un alignement qu'elle ne donne pas.
    const grille = magnetisme
        ? `<g class="dgl-grille">${
            Array.from({ length: Math.floor(TOILE.largeur / 20) }, (_, k) =>
                `<line x1="${(k + 1) * 20}" y1="0" x2="${(k + 1) * 20}" y2="${TOILE.hauteur}"/>`).join('')}${
            Array.from({ length: Math.floor(TOILE.hauteur / 20) }, (_, k) =>
                `<line x1="0" y1="${(k + 1) * 20}" x2="${TOILE.largeur}" y2="${(k + 1) * 20}"/>`).join('')}</g>`
        : '';

    const el = courantEl();
    const poignees = (el && el.type === 'trait')
        ? `<circle class="dgl-bout" data-bout="1" cx="${el.x1}" cy="${el.y1}" r="9"/>`
          + `<circle class="dgl-bout" data-bout="2" cx="${el.x2}" cy="${el.y2}" r="9"/>`
        : '';

    // UNE TOILE VIDE LE DIT, ET DIT QUOI FAIRE. Un rectangle quadrillé sans un
    // mot se lit « cassé » aussi bien que « vide », et c'est la première chose
    // qu'on voit en commençant une énigme.
    const vide = enigme.elements.length ? '' :
        `<text class="dgl-toile-vide" x="${TOILE.largeur / 2}" y="${TOILE.hauteur / 2}"
            text-anchor="middle" dominant-baseline="central">Pose une pièce ici</text>`;

    cadre.innerHTML = `<svg class="dgl-toile${outil ? ' dgl-toile--pose' : ''}" id="dgl-toile" tabindex="0"
        viewBox="0 0 ${TOILE.largeur} ${TOILE.hauteur}"
        aria-label="La toile — ${esc(direLibre(enigme))}">
        <rect class="dgl-fond" x="0" y="0" width="${TOILE.largeur}" height="${TOILE.hauteur}"/>
        ${grille}${vide}${corps}${poignees}</svg>`;

    const svg = cadre.querySelector('#dgl-toile');
    poserLesZones(svg);
    brancherLaToile(svg);
}

/**
 * UNE ZONE DE PRISE AUTOUR DE CHAQUE ÉLÉMENT.
 *
 * Un `<text>` SVG ne se laisse attraper que sur le tracé de ses lettres : on
 * cliquait entre le R et le A et il ne se passait rien, ce qui ressemble
 * exactement à un atelier cassé. On mesure donc la boîte réelle de chaque
 * élément — `getBBox()` tient compte des rotations des enfants — et l'on y pose
 * un rectangle transparent.
 *
 * ATTENTION À L'ORDRE D'OUVERTURE : un élément dans un conteneur en
 * `display: none` n'a AUCUNE géométrie, `getBBox()` rend zéro, et la pose est
 * sautée sans un mot. Voir `ouvrirAtelierDingbats`, qui montre avant de peindre.
 */
function poserLaZone(g) {
    g.querySelectorAll('.dgl-prise, .dgl-contour').forEach(x => x.remove());
    let b;
    try { b = g.getBBox(); } catch (e) { return; }
    if (!b || (!b.width && !b.height)) return;
    // HUIT UNITÉS DE MARGE, et non deux : « hyper facile » se joue là. Un trait
    // de deux unités d'épaisseur serait sinon une cible d'un pixel.
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', String(b.x - 8));
    r.setAttribute('y', String(b.y - 8));
    r.setAttribute('width', String(b.width + 16));
    r.setAttribute('height', String(b.height + 16));
    r.setAttribute('class', 'dgl-prise');
    g.insertBefore(r, g.firstChild);
    if (g.classList.contains('dgl-el--choisi')) {
        const c = r.cloneNode();
        c.setAttribute('class', 'dgl-contour');
        g.appendChild(c);
    }
}

function poserLesZones(svg) {
    svg.querySelectorAll('[data-el]').forEach(poserLaZone);
}

/**
 * REDESSINER UN SEUL ÉLÉMENT, SANS REMPLACER LA TOILE.
 *
 * C'EST LA CORRECTION LA PLUS CHÈRE DE CET ATELIER, et la sonde a dû s'y
 * reprendre à deux fois pour la voir. Le glissé appelait `peindreToile()` à
 * chaque mouvement — ce qui REMPLACE le `<svg>` et donc tue, à chaque pixel, le
 * gestionnaire qui était en train de suivre le doigt. Résultat : l'élément
 * avançait d'UN PAS de souris puis s'arrêtait net, et le reste du geste ne
 * faisait rien.
 *
 * CE QUI L'A CACHÉ SI LONGTEMPS : ma première sonde vérifiait seulement que la
 * coordonnée AVAIT AUGMENTÉ. Un pas suffit à faire passer ce test. Une mesure
 * qui ne vérifie que le SIGNE d'un déplacement ne mesure pas un déplacement —
 * elle mesure qu'il s'est passé quelque chose. La sonde exige maintenant la
 * BONNE distance, à six unités près.
 *
 * Changer le contenu d'un `<g>` ne détache pas le `<svg>` : la capture du
 * pointeur et les écouteurs survivent, et le geste va jusqu'au bout.
 */
function rafraichirUnElement(svg, i) {
    const g = svg.querySelector(`[data-el="${i}"]`);
    const el = enigme.elements[i];
    if (!g || !el) return;
    try { g.innerHTML = dessinerElement(el); } catch (e) { g.innerHTML = ''; }
    poserLaZone(g);
    // LES POIGNÉES DE BOUT SUIVENT LE TRAIT, sinon on tire un bout et le rond
    // reste en arrière — on croit avoir lâché.
    if (el.type === 'trait') {
        const b1 = svg.querySelector('[data-bout="1"]');
        const b2 = svg.querySelector('[data-bout="2"]');
        if (b1) { b1.setAttribute('cx', String(el.x1)); b1.setAttribute('cy', String(el.y1)); }
        if (b2) { b2.setAttribute('cx', String(el.x2)); b2.setAttribute('cy', String(el.y2)); }
    }
}

/**
 * MARQUER L'ÉLÉMENT CHOISI SANS REDESSINER LA TOILE.
 *
 * Redessiner remplacerait le `<svg>` — et l'on ne peut pas remplacer le nœud
 * depuis lequel on est en train d'écouter un appui sans casser la capture du
 * pointeur, donc le glissé. On déplace donc le contour à la main : c'est trois
 * lignes, et c'est la différence entre « ça se prend du premier coup » et « il
 * faut cliquer deux fois ».
 *
 * Les poignées de bout d'un trait, elles, n'apparaissent qu'au redessin du
 * relâché : on ne déplace pas un bout de trait avant d'avoir sélectionné le
 * trait, donc rien ne manque au moment où l'on en a besoin.
 */
function marquerLeChoisi(svg) {
    svg.querySelectorAll('[data-el]').forEach(g => {
        const estLui = Number(g.dataset.el) === choisi;
        g.classList.toggle('dgl-el--choisi', estLui);
        const contour = g.querySelector('.dgl-contour');
        if (estLui && !contour) {
            const prise = g.querySelector('.dgl-prise');
            if (prise) {
                const c = prise.cloneNode();
                c.setAttribute('class', 'dgl-contour');
                g.appendChild(c);
            }
        } else if (!estLui && contour) {
            contour.remove();
        }
    });
}

/** Les unités de la toile, depuis un événement de pointeur. */
function enUnites(svg, ev) {
    const r = svg.getBoundingClientRect();
    return {
        x: (ev.clientX - r.left) / (r.width || 1) * TOILE.largeur,
        y: (ev.clientY - r.top) / (r.height || 1) * TOILE.hauteur
    };
}

/** Le point visé en unités de toile — ou `null` si le pointeur est à côté. */
function surLaToile(svg, ev) {
    const r = svg.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right
        || ev.clientY < r.top || ev.clientY > r.bottom) return null;
    return enUnites(svg, ev);
}

/** Collé à la grille, ou à l'unité. */
const accrocher = (v) => (magnetisme ? Math.round(v / 5) * 5 : Math.round(v));

/** Poser une pièce à cet endroit, et la rendre tout de suite réglable. */
function poserLaPiece(piece, x, y) {
    enigme.elements.push(elementDeLaReserve(piece, accrocher(x), accrocher(y)));
    choisi = enigme.elements.length - 1;
    change({ inspecteur: true });
}

function brancherLaToile(svg) {
    let glisse = null;

    svg.addEventListener('pointerdown', (ev) => {
        const p = enUnites(svg, ev);
        // UNE PIÈCE EN MAIN SE POSE, ET RIEN D'AUTRE. Si l'on vient de toucher
        // « Un mot » dans la réserve, l'appui suivant pose un mot — même s'il
        // tombe sur un élément déjà là. L'inverse (sélectionner ce qu'on touche)
        // rendrait le geste du tableau blanc imprévisible : on viserait un coin
        // vide par peur de « rater ».
        if (outil) { poserLaPiece(outil, p.x, p.y); ev.preventDefault(); return; }

        const bout = ev.target.closest('[data-bout]');
        const g = ev.target.closest('[data-el]');
        if (!bout && !g) { choisi = -1; change({ inspecteur: true }); return; }
        if (g) {
            const i = Number(g.dataset.el);
            // ON NE REDESSINE PAS LA TOILE ICI, ET C'EST UNE CORRECTION.
            //
            // `peindreToile()` REMPLACE le `<svg>` : appelée depuis le
            // gestionnaire du `<svg>` lui-même, elle détache le nœud sous nos
            // pieds, et le `setPointerCapture` deux lignes plus bas s'applique à
            // un élément qui n'est plus dans le document — `InvalidStateError`.
            //
            // CE QUE ÇA DONNAIT : prendre un élément QUI N'ÉTAIT PAS DÉJÀ
            // CHOISI ne le déplaçait pas. Le premier geste sélectionnait, le
            // second déplaçait. On croit avoir mal visé, on recommence, et le
            // glisser-déposer « hyper facile » demande deux essais sur deux.
            //
            // MESURÉ PAR LA SONDE : « (100,70) → (100,70) », et une erreur de
            // page dans le même souffle. Les deux avaient la même cause.
            //
            // On marque donc la sélection SANS toucher au nœud, et la toile se
            // redessine au relâché, quand plus personne ne s'y accroche.
            if (i !== choisi) { choisi = i; marquerLeChoisi(svg); peindreInspecteur(); }
        }
        const el = courantEl();
        if (!el) return;
        glisse = {
            bout: bout ? Number(bout.dataset.bout) : 0,
            depart: p,
            // ON RETIENT L'ÉTAT DE DÉPART, et non la position courante : sans
            // cela l'élément saute sous le doigt au premier mouvement, ce qui est
            // désagréable au point qu'on croit avoir attrapé autre chose.
            copie: JSON.parse(JSON.stringify(el))
        };
        // LA CAPTURE PEUT REFUSER — un pointeur déjà relâché, un nœud qu'on
        // vient de remplacer. Elle n'est qu'un confort (suivre le doigt hors du
        // cadre) : si elle échoue, le glissé marche quand même tant que le doigt
        // reste sur la toile. Ce qu'on ne veut pas, c'est une erreur de page.
        try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* sans capture */ }
        ev.preventDefault();
    });

    svg.addEventListener('pointermove', (ev) => {
        if (!glisse) return;
        const el = courantEl();
        if (!el) return;
        const p = enUnites(svg, ev);
        const dx = p.x - glisse.depart.x, dy = p.y - glisse.depart.y;
        const c = glisse.copie;
        if (el.type === 'trait') {
            if (glisse.bout === 1) { el.x1 = accrocher(c.x1 + dx); el.y1 = accrocher(c.y1 + dy); }
            else if (glisse.bout === 2) { el.x2 = accrocher(c.x2 + dx); el.y2 = accrocher(c.y2 + dy); }
            else {
                el.x1 = accrocher(c.x1 + dx); el.y1 = accrocher(c.y1 + dy);
                el.x2 = accrocher(c.x2 + dx); el.y2 = accrocher(c.y2 + dy);
            }
        } else {
            el.x = accrocher(c.x + dx);
            el.y = accrocher(c.y + dy);
        }
        // PENDANT LE GLISSÉ, ON NE REDESSINE QUE L'ÉLÉMENT QUI BOUGE — et surtout
        // PAS la toile entière, qui remplacerait le nœud sous nos pieds et
        // arrêterait le geste au premier pixel. Voir `rafraichirUnElement`.
        rafraichirUnElement(svg, choisi);
    });

    const lacher = () => {
        if (!glisse) return;
        glisse = null;
        change({ inspecteur: true });
    };
    svg.addEventListener('pointerup', lacher);
    svg.addEventListener('pointercancel', lacher);

    // AU CLAVIER AUSSI, ET D'UNE UNITÉ. Le doigt pose à peu près ; les flèches
    // finissent le travail. Avec Maj, dix unités d'un coup.
    svg.addEventListener('keydown', (ev) => {
        const el = courantEl();
        if (!el) return;
        const pas = ev.shiftKey ? 10 : 1;
        const d = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[ev.key];
        if (!d) return;
        ev.preventDefault();
        if (el.type === 'trait') { el.x1 += d[0]; el.y1 += d[1]; el.x2 += d[0]; el.y2 += d[1]; }
        else { el.x += d[0]; el.y += d[1]; }
        change();
        modal.querySelector('#dgl-toile').focus();
    });
}

// ── LE GLISSER-DÉPOSER DEPUIS LA RÉSERVE ────────────────────────────────────

function peindreReserve() {
    const boite = modal.querySelector('#dgl-reserve');
    boite.innerHTML = RESERVE.map(p => `
        <button type="button" class="dgl-piece${outil && outil.id === p.id ? ' dgl-piece--prise' : ''}"
                data-piece="${p.id}" title="${esc(p.nom)}" aria-label="${esc(p.nom)}"
                aria-pressed="${!!(outil && outil.id === p.id)}">
            ${apercuDeLaPiece(p)}<span class="dgl-piece-nom">${esc(p.nom)}</span>
        </button>`).join('');
    boite.querySelectorAll('[data-piece]').forEach(brancherUnePiece);

    const consigne = modal.querySelector('#dgl-consigne');
    consigne.textContent = outil
        ? `« ${outil.nom} » est en main : touche la toile pour la poser, autant de fois que tu veux. `
          + 'Touche-la de nouveau dans la réserve pour la reposer.'
        : 'Prends une pièce ci-dessus et glisse-la sur la toile — ou touche-la, puis touche l\'endroit où tu la veux.';
    consigne.classList.toggle('dgl-consigne--active', !!outil);
}

/**
 * UNE PIÈCE DE LA RÉSERVE : deux gestes, une seule implémentation.
 *
 * ON N'EMPLOIE PAS LE « HTML5 drag and drop » — `draggable`, `dragstart`,
 * `drop` — parce qu'il ne marche PAS au doigt sur iOS, et que Rémy compose sur
 * son iPhone. Un glisser-déposer qui ne marche que sur ordinateur n'est pas
 * « hyper facile » : c'est un glisser-déposer qu'il ne pourra pas employer là où
 * il s'en sert. Les événements de pointeur, eux, sont les mêmes pour la souris,
 * le doigt et le stylet : un seul code, trois appareils.
 *
 * ET LE SIMPLE TOUCHER PREND LA PIÈCE EN MAIN, parce qu'un glissé rate parfois —
 * on part trop vite, on sort de la fenêtre, le doigt ripe. Le geste du tableau
 * blanc (toucher la pièce, puis l'endroit) ne rate jamais, et il pose la même
 * pièce dix fois de suite sans y revenir.
 */
function brancherUnePiece(bouton) {
    const piece = RESERVE.find(p => p.id === bouton.dataset.piece);
    let fantome = null;
    let parti = false;
    let depart = null;

    const finirLeFantome = () => { if (fantome) { fantome.remove(); fantome = null; } };

    bouton.addEventListener('pointerdown', (ev) => {
        parti = false;
        depart = { x: ev.clientX, y: ev.clientY };
        bouton.setPointerCapture(ev.pointerId);
        ev.preventDefault();
    });

    bouton.addEventListener('pointermove', (ev) => {
        if (!depart) return;
        // SIX PIXELS AVANT DE PARLER DE GLISSÉ. Un doigt ne se pose jamais
        // parfaitement immobile : sans ce seuil, un simple toucher fabriquait un
        // fantôme qui clignotait, et le geste du tableau blanc devenait un glissé
        // raté. On mesure depuis le POINT DE DÉPART et non `movementX`, qui vaut
        // zéro sur certains pilotes tactiles.
        if (!parti) {
            if (Math.abs(ev.clientX - depart.x) + Math.abs(ev.clientY - depart.y) < 6) return;
            parti = true;
            fantome = document.createElement('div');
            fantome.className = 'dgl-fantome';
            fantome.innerHTML = apercuDeLaPiece(piece);
            document.body.appendChild(fantome);
        }
        fantome.style.left = `${ev.clientX}px`;
        fantome.style.top = `${ev.clientY}px`;
        // LA TOILE S'ALLUME QUAND ON LA SURVOLE : sans ce retour, on ne sait pas
        // si l'on peut lâcher, et l'on lâche à côté.
        const svg = modal.querySelector('#dgl-toile');
        if (svg) svg.classList.toggle('dgl-toile--visee', !!surLaToile(svg, ev));
    });

    bouton.addEventListener('pointerup', (ev) => {
        const svg = modal.querySelector('#dgl-toile');
        if (svg) svg.classList.remove('dgl-toile--visee');
        finirLeFantome();
        depart = null;
        if (!parti) {
            // UN SIMPLE TOUCHER : on prend la pièce en main, ou on la repose.
            outil = (outil && outil.id === piece.id) ? null : piece;
            peindreReserve();
            peindreToile();
            return;
        }
        parti = false;
        const ou = svg && surLaToile(svg, ev);
        // LÂCHÉ À CÔTÉ : on ne pose rien, et l'on ne dit rien. Annuler un geste
        // en l'emmenant hors de la cible est ce que tout le monde attend.
        if (ou) poserLaPiece(piece, ou.x, ou.y);
    });

    bouton.addEventListener('pointercancel', () => {
        finirLeFantome();
        parti = false;
        depart = null;
    });
}

// ── L'INSPECTEUR ────────────────────────────────────────────────────────────

function pastilles(valeur) {
    return `<div class="dgl-pastilles" role="group" aria-label="La couleur">${COULEURS.map(c =>
        `<button type="button" class="dgl-pastille${c.id === valeur ? ' dgl-pastille--choisie' : ''}"
            data-couleur="${c.id}" title="${esc(c.nom)}" aria-label="${esc(c.nom)}"
            aria-pressed="${c.id === valeur}"
            style="background: var(${c.jeton})"></button>`).join('')}</div>`;
}

function curseur(id, label, valeur, min, max, pas, suffixe = '') {
    return `<label class="dgl-curseur">${esc(label)}
        <span class="dgl-curseur-ligne">
            <input type="range" data-reg="${id}" min="${min}" max="${max}" step="${pas}" value="${valeur}">
            <output>${valeur}${suffixe}</output>
        </span></label>`;
}

function peindreInspecteur() {
    const boite = modal.querySelector('#dgl-inspecteur');
    const el = courantEl();
    if (!el) {
        boite.innerHTML = `<h3 class="dgl-h3">L'élément</h3>
            <p class="dgl-vide">Rien n'est choisi. Touche un mot, un trait ou une forme sur la toile
            — ou prends une pièce dans la réserve et pose-la.</p>`;
        return;
    }

    let champs = '';
    if (el.type === 'mot') {
        champs = `
            <label class="dgl-champ">Ce qui est écrit
                <input type="text" data-reg="texte" maxlength="40" value="${esc(el.texte)}"></label>
            ${curseur('taille', 'Taille', Math.round(el.taille || 34), 10, 90, 1, ' px')}
            ${curseur('angle', 'Orientation', Math.round(el.angle || 0), -180, 180, 5, '°')}
            ${curseur('espacement', 'Écart entre les lettres', Math.round(el.espacement || 0), -6, 30, 1, ' px')}
            <div class="dgl-coches">
                <label class="dgl-coche"><input type="checkbox" data-reg="gras"
                    ${el.gras === false ? '' : 'checked'}> En gras</label>
                <label class="dgl-coche"><input type="checkbox" data-reg="miroir"
                    ${el.miroir ? 'checked' : ''}> En miroir</label>
            </div>`;
    } else if (el.type === 'trait') {
        champs = `
            ${curseur('epaisseur', 'Épaisseur', Math.round(el.epaisseur || 3), 1, 14, 1, ' px')}
            <div class="dgl-coches">
                <label class="dgl-coche"><input type="checkbox" data-reg="pointille"
                    ${el.pointille ? 'checked' : ''}> En pointillés</label>
                <label class="dgl-coche"><input type="checkbox" data-reg="fleche"
                    ${el.fleche ? 'checked' : ''}> Avec une flèche</label>
            </div>
            <p class="dgl-note">Les deux ronds sur la toile déplacent chaque bout séparément.</p>`;
    } else {
        const def = FORMES_LIBRES.find(f => f.id === el.forme) || FORMES_LIBRES[0];
        champs = `
            <label class="dgl-champ">La forme
                <select data-reg="forme">${FORMES_LIBRES.map(f =>
                    `<option value="${f.id}"${f.id === el.forme ? ' selected' : ''}>${esc(f.nom)}</option>`
                ).join('')}</select></label>
            ${curseur('largeur', def.egal ? 'Côté' : 'Largeur', Math.round(el.largeur || 120), 10, 400, 5, ' px')}
            ${def.egal ? '' : curseur('hauteur', 'Hauteur', Math.round(el.hauteur || 90), 10, 260, 5, ' px')}
            ${curseur('angle', 'Orientation', Math.round(el.angle || 0), -180, 180, 5, '°')}
            ${curseur('epaisseur', 'Épaisseur du trait', Math.round(el.epaisseur || 3), 1, 14, 1, ' px')}
            <label class="dgl-coche"><input type="checkbox" data-reg="remplissage"
                ${el.remplissage === 'teinte' ? 'checked' : ''}> Remplie d'une teinte de sa couleur</label>`;
    }

    const quoi = { mot: 'Le mot', trait: 'Le trait', forme: 'La forme' }[el.type] || 'L\'élément';
    boite.innerHTML = `<h3 class="dgl-h3">${quoi} — ${choisi + 1}<sup>e</sup> sur ${enigme.elements.length}</h3>
        ${champs}
        <label class="dgl-champ">La couleur${pastilles(el.couleur || 'encre')}</label>`;

    // LES RÉGLAGES NE REDESSINENT QUE LA TOILE, JAMAIS L'INSPECTEUR. Redessiner
    // l'inspecteur à chaque frappe reprend le foyer au champ en train d'être
    // rempli : on tape « RACINE » et il ne reste que « R ». Le dépôt a déjà payé
    // ce piège trois fois (`core/foyerDeLaSaisie.js`).
    boite.querySelectorAll('[data-reg]').forEach(ch => {
        const nom = ch.dataset.reg;
        const appliquer = () => {
            const e = courantEl();
            if (!e) return;
            if (ch.type === 'checkbox') {
                if (nom === 'remplissage') e.remplissage = ch.checked ? 'teinte' : 'aucun';
                else e[nom] = ch.checked;
            } else if (ch.type === 'range') {
                e[nom] = Number(ch.value);
                const sortie = ch.parentElement.querySelector('output');
                if (sortie) sortie.textContent = ch.value + (nom === 'angle' ? '°' : ' px');
            } else {
                e[nom] = ch.value;
            }
            change();
            // CHANGER DE FORME CHANGE LES CHAMPS À MONTRER — un carré n'a pas de
            // hauteur. C'est le seul réglage qui a le droit de redessiner
            // l'inspecteur, et il le fait sur `change`, pas sur chaque frappe.
            if (nom === 'forme') peindreInspecteur();
        };
        ch.oninput = appliquer;
        if (ch.tagName === 'SELECT') ch.onchange = appliquer;
    });

    boite.querySelectorAll('[data-couleur]').forEach(b => {
        b.onclick = () => {
            const e = courantEl();
            if (!e) return;
            e.couleur = b.dataset.couleur;
            change({ inspecteur: true });
        };
    });
}

// ── LES INDICES ─────────────────────────────────────────────────────────────

function peindreAides() {
    const boite = modal.querySelector('#dgl-aides');
    const aides = enigme.aides || (enigme.aides = []);
    if (!aides.length) {
        // CE QUE LE LOGICIEL DONNE DÉJÀ : il faut le dire, sinon on croit qu'une
        // énigme sans indice laisse l'élève sans rien. `core/dingbat.js` ajoute
        // toujours la tournure puis la première lettre.
        boite.innerHTML = '<p class="dgl-vide">Aucun indice écrit. Le logiciel en donnera quand même '
            + 'deux : ce qu\'il faut voir, puis la première lettre de la réponse.</p>';
        return;
    }
    boite.innerHTML = aides.map((a, i) => `
        <div class="dgl-aide-ligne">
            <span class="dgl-aide-n">${i + 1}</span>
            <input type="text" data-aide="${i}" maxlength="140" value="${esc(a)}"
                placeholder="Regarde ce qui entoure le mot." aria-label="Indice ${i + 1}">
            <button type="button" class="dgl-aide-x" data-aide-jeter="${i}"
                aria-label="Enlever l'indice ${i + 1}">✕</button>
        </div>`).join('');

    // ON NE REDESSINE PAS LA LISTE À CHAQUE FRAPPE : on y perdrait le foyer, et
    // l'on taperait un indice une lettre à la fois.
    boite.querySelectorAll('[data-aide]').forEach(ch => {
        ch.oninput = () => {
            enigme.aides[Number(ch.dataset.aide)] = ch.value;
            change({ toile: false, bande: false });
        };
    });
    boite.querySelectorAll('[data-aide-jeter]').forEach(b => {
        b.onclick = () => {
            enigme.aides.splice(Number(b.dataset.aideJeter), 1);
            change({ toile: false, aides: true, bande: false });
        };
    });
}

// ── CE QUI SE VOIT MAL, DIT TOUT DE SUITE ───────────────────────────────────

function peindreAvis() {
    const boite = modal.querySelector('#dgl-avis');
    const avis = validerLibre(enigme);

    // LE JUGE DU JEU DOIT ACCEPTER LA RÉPONSE DE L'ÉNIGME. C'est le défaut le
    // plus cruel qu'une énigme puisse avoir — une bonne réponse refusée — et il
    // vient d'une variante mal écrite. `tests/dingbat.test.mjs` le garde sur les
    // cent neuf ; ici on le dit À L'AUTEUR, pendant qu'il écrit.
    const dur = [];
    if (String(enigme.reponse || '').trim()) {
        for (const e of attendues(enigme)) {
            if (!juste(e, enigme)) dur.push(`Le juge refuserait « ${e} », qui est pourtant une de tes réponses.`);
        }
    }
    const tout = [...avis.map(a => a.dit), ...dur];
    if (!tout.length) {
        boite.className = 'dgl-avis dgl-avis--ok';
        boite.innerHTML = '✓ Rien à signaler : l\'énigme se dessine et sa réponse est acceptée.';
        return;
    }
    boite.className = 'dgl-avis dgl-avis--attention';
    boite.innerHTML = `<strong>À regarder :</strong><ul>${
        tout.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
}

// ── LE JSON ─────────────────────────────────────────────────────────────────

/** Un identifiant lisible, tiré de la réponse. */
function identifiantPropose(reponse) {
    const nu = String(reponse || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return nu ? `dg-${nu}` : '';
}

/** L'énigme telle qu'elle part à l'export : avec l'identifiant qu'on propose. */
const aExporter = (d) => ({
    ...d, id: String(d.id || '').trim() || identifiantPropose(d.reponse)
});

function peindreJson() {
    const zone = modal.querySelector('#dgl-json');
    // ON N'ÉCRASE PAS CE QUE RÉMY EST EN TRAIN DE COLLER. La zone sert dans les
    // deux sens — on y lit ce qu'on exporte, on y colle ce qu'on relit — et la
    // réécrire pendant qu'il y colle quelque chose effacerait son collage.
    if (document.activeElement === zone) return;
    zone.value = modal.querySelector('#dgl-tout').checked
        ? lotEnTexte(lot.map(aExporter))
        : enigmeEnTexte(aExporter(enigme));
}

// ── LE MODÈLE : les cent neuf, à côté ───────────────────────────────────────

function peindreModele() {
    const sel = modal.querySelector('#dgl-modele');
    if (!sel.options.length) {
        // GROUPÉS PAR THÈME puis par niveau : c'est l'ordre dans lequel on
        // cherche un exemple — « montre-moi un dingbat de maths un peu corsé ».
        sel.innerHTML = THEMES.map(t => `<optgroup label="${esc(t.label)}">${
            DINGBATS.filter(d => d.theme === t.id)
                .sort((a, b) => a.niveau - b.niveau || a.id.localeCompare(b.id))
                .map(d => `<option value="${d.id}">${d.niveau} · ${esc(d.reponse)}</option>`)
                .join('')}</optgroup>`).join('');
        sel.value = modele;
        sel.onchange = () => { modele = sel.value; peindreModele(); };
    }
    const d = DINGBATS.find(x => x.id === modele);
    const vue = modal.querySelector('#dgl-modele-vue');
    const dit = modal.querySelector('#dgl-modele-dit');
    if (!d) { vue.innerHTML = ''; dit.textContent = ''; return; }
    let html;
    try { html = dessiner(d); } catch (e) { html = `<p class="dgl-rate">${esc(e.message)}</p>`; }
    vue.innerHTML = `<div class="dg-cadre dgl-cadre-modele">${html}</div>`;
    const tourn = DISPOSITIONS[d.forme];
    // ON DIT LA TOURNURE, pas seulement la réponse : « un mot est enfermé DANS
    // une forme » est le vocabulaire du jeu, et c'est en le lisant qu'on trouve
    // la prochaine énigme.
    dit.innerHTML = `<strong>${esc(d.reponse)}</strong> — ${esc(tourn ? tourn.lit : d.forme)}
        <span class="dgl-id">${esc(d.id)}</span>`;
}

// ── LES CHAMPS DE L'ÉNIGME ──────────────────────────────────────────────────

function remplirLesChamps() {
    const q = (s) => modal.querySelector(s);
    q('#dgl-reponse').value = enigme.reponse || '';
    q('#dgl-variantes').value = (enigme.variantes || []).join(', ');
    q('#dgl-theme').value = enigme.theme || 'maths';
    q('#dgl-niveau').value = String(enigme.niveau || 1);
    q('#dgl-explication').value = enigme.explication || '';
    q('#dgl-id').value = enigme.id || '';
    q('#dgl-magnetisme').checked = magnetisme;
    q('#dgl-comme-eleve').checked = commeEleve;
}

function brancher() {
    const q = (s) => modal.querySelector(s);

    q('#dgl-fermer').onclick = fermer;

    q('[data-supprimer]').onclick = () => {
        if (choisi < 0) { showToast('Choisis d\'abord un élément sur la toile.', 'warning'); return; }
        enigme.elements.splice(choisi, 1);
        choisi = Math.min(choisi, enigme.elements.length - 1);
        change({ inspecteur: true });
    };

    q('[data-dupliquer]').onclick = () => {
        const el = courantEl();
        if (!el) { showToast('Choisis d\'abord un élément sur la toile.', 'warning'); return; }
        // DÉCALÉE DE DIX UNITÉS, sinon la copie se cache exactement sous
        // l'original et l'on croit que le bouton n'a rien fait.
        const c = JSON.parse(JSON.stringify(el));
        if (c.type === 'trait') { c.x1 += 10; c.y1 += 10; c.x2 += 10; c.y2 += 10; }
        else { c.x += 10; c.y += 10; }
        enigme.elements.splice(choisi + 1, 0, c);
        choisi += 1;
        change({ inspecteur: true });
    };

    // DEVANT ET DERRIÈRE : l'ordre de la liste EST l'ordre d'empilement en SVG.
    // Un mot derrière une forme remplie disparaît, et c'est la première chose
    // qu'on veut corriger.
    const bouger = (pas) => () => {
        const j = choisi + pas;
        if (choisi < 0 || j < 0 || j >= enigme.elements.length) return;
        const [el] = enigme.elements.splice(choisi, 1);
        enigme.elements.splice(j, 0, el);
        choisi = j;
        change({ inspecteur: true });
    };
    q('[data-devant]').onclick = bouger(1);
    q('[data-derriere]').onclick = bouger(-1);

    q('#dgl-magnetisme').onchange = (e) => { magnetisme = e.target.checked; peindreToile(); };
    q('#dgl-comme-eleve').onchange = (e) => { commeEleve = e.target.checked; peindreToile(); };

    q('#dgl-aide-plus').onclick = () => {
        (enigme.aides || (enigme.aides = [])).push('');
        change({ toile: false, aides: true, bande: false });
        // LE FOYER VA DANS L'INDICE QU'ON VIENT D'AJOUTER : sans cela il faut
        // cliquer dedans, c'est-à-dire un geste de plus pour rien.
        const dernier = modal.querySelector(`[data-aide="${enigme.aides.length - 1}"]`);
        if (dernier) dernier.focus();
    };

    // Les champs de l'énigme : ils ne redessinent PAS la toile ni eux-mêmes.
    const lier = (sel, quoi, lecture = (v) => v, aussi = {}) => {
        const ch = q(sel);
        ch.oninput = () => { enigme[quoi] = lecture(ch.value); change({ toile: false, ...aussi }); };
        if (ch.tagName === 'SELECT') ch.onchange = ch.oninput;
    };
    // LA RÉPONSE REDESSINE LA BANDE : c'est elle qui nomme la vignette, et voir
    // son énigme se nommer pendant qu'on écrit la solution dit que c'est rangé.
    lier('#dgl-reponse', 'reponse');
    lier('#dgl-variantes', 'variantes',
        (v) => String(v).split(',').map(x => x.trim()).filter(Boolean), { bande: false });
    lier('#dgl-theme', 'theme', (v) => v, { bande: false });
    lier('#dgl-niveau', 'niveau', (v) => Number(v), { bande: false });
    lier('#dgl-explication', 'explication', (v) => v, { bande: false });
    lier('#dgl-id', 'id', (v) => v, { bande: false });

    q('#dgl-tout').onchange = () => peindreJson();

    q('#dgl-copier').onclick = () => copierDans(q('#dgl-copier'), q('#dgl-json').value, '📋 Copier');
    q('#dgl-fichier').onclick = () => {
        const tout = q('#dgl-tout').checked;
        const nom = tout
            ? `dingbats-${lot.length}-${jourPourFichier()}.json`
            : `${String(enigme.id || '').trim() || identifiantPropose(enigme.reponse) || 'dingbat'}.json`;
        telechargerTexte(nom, q('#dgl-json').value);
        showToast(tout
            ? `Tes ${lot.length} dingbats sont dans tes téléchargements — envoie-moi le fichier.`
            : 'Le JSON est dans tes téléchargements.', 'success', 6000);
    };

    // RELIRE FERME LA BOUCLE. On compose ici, on me l'envoie, je le colle dans le
    // dépôt — et six semaines plus tard il faut retoucher. Sans ce bouton, il
    // faudrait tout refaire à la main. Il accepte une récolte entière comme une
    // énigme seule : les deux circulent.
    q('#dgl-relire').onclick = () => {
        let venues;
        try { venues = lireUnLot(q('#dgl-json').value); } catch (e) {
            showToast('Je n\'arrive pas à relire ce texte : ' + e.message, 'error', 7000);
            return;
        }
        if (!venues.length) { showToast('Ce texte ne porte aucune composition.', 'warning'); return; }
        // ON AJOUTE, ON NE REMPLACE PAS. Relire un fichier par-dessus une récolte
        // en cours effacerait le travail du jour — et « se sauve au fur et à
        // mesure » deviendrait un mensonge au moment précis où l'on y compte.
        const avant = lot.length;
        venues.forEach(d => lot.push(remiseEnForme(d)));
        allerA(avant);
        showToast(`${venues.length} composition(s) ajoutée(s) à ta récolte.`, 'success', 6000);
    };
}

/**
 * Ouvre l'atelier, et retrouve la récolte exactement où elle en était.
 *
 * ON MONTRE LE PANNEAU AVANT DE PEINDRE, ET CET ORDRE EST UNE CORRECTION.
 *
 * Les zones de prise se posent en MESURANT chaque élément — `getBBox()` —, et un
 * élément dans un conteneur en `display: none` n'a aucune géométrie : la mesure
 * rend zéro, et `poserLesZones` passe son tour sans un mot. On ouvrait donc
 * l'atelier sur une toile où RIEN NE S'ATTRAPAIT hors du tracé exact des
 * lettres : un clic entre le R et le A ne faisait rien, ce qui ressemble
 * exactement à un atelier cassé.
 *
 * MESURÉ PAR LA SONDE, PAS DEVINÉ : `tools/ateliersDAuteur.mjs` comptait
 * « 0 zone de prise » à l'ouverture, alors que le glissé marchait — parce qu'elle
 * attrapait le mot en son centre, qui tombe sur une lettre. C'est le genre de
 * défaut qu'on ne voit pas en essayant soi-même, puisqu'on vise juste.
 */
export function ouvrirAtelierDingbats() {
    relire();
    const m = assurerModale();
    m.style.display = 'flex';
    outil = null;
    remplirLesChamps();
    peindreReserve();
    peindreBande();
    peindreToile();
    peindreInspecteur();
    peindreAides();
    peindreAvis();
    peindreJson();
    peindreModele();
    return m;
}

/**
 * REMETTRE LA DERNIÈRE JETÉE, à sa place dans la bande.
 *
 * C'est la moitié qui rend le geste réversible, et donc la moitié qui permet de
 * ne PAS poser de « êtes-vous sûr ? » — une boîte qu'on clique sans la lire.
 * Exportée aussi pour que la sonde puisse l'éprouver sans l'écran.
 */
export function reprendreLaJetee() {
    if (!derniereJetee) return false;
    lot.splice(Math.min(derniereJetee.rang, lot.length), 0, derniereJetee.enigme);
    const ou = Math.min(derniereJetee.rang, lot.length - 1);
    derniereJetee = null;
    allerA(ou);
    return true;
}
