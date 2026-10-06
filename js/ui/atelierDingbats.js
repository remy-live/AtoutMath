// L'ATELIER DES DINGBATS — poser des mots, les orienter, les colorer, et en
// sortir du JSON.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « qqch pour éditer des dingbats et les transformer en json. Globalement
// un éditeur de lettre où on peut choisir l'orientation la couleur rajouter des
// traits des formes. »
//
// ── CE QUE CET ÉCRAN EST, ET CE QU'IL N'EST PAS ────────────────────────────
//
// Les cent neuf énigmes du jeu sont écrites à la main, chacune nommant une des
// vingt-et-une DISPOSITIONS que le code sait dessiner. Elles ne passent pas par
// ici et ne changent pas : Rémy les a validées à l'œil, une par une, et un
// éditeur qui les relirait pour les réécrire les rendrait « presque » pareilles —
// c'est-à-dire plus les siennes.
//
// CET ATELIER FABRIQUE LA VINGT-DEUXIÈME : `forme: 'libre'`, dont le dessin vient
// des données (voir `core/dingbatLibre.js`). On pose, on tourne, on colore, et
// l'on obtient le JSON d'une ligne de `js/data/dingbats.js`.
//
// LES CENT NEUF SONT LÀ QUAND MÊME, dans le volet de droite : « créer librement,
// et voir les 109 à côté ». On compose en regardant comment les autres font — et
// l'on apprend au passage le nom de la tournure, qui est la moitié pédagogique du
// jeu.
//
// ── CE QUI SE DÉPLACE AU DOIGT, ET CE QUI SE RÈGLE AU CHIFFRE ──────────────
//
// On DÉPLACE à la souris ou au doigt — c'est le geste qu'on attend d'une toile —,
// mais on RÈGLE la taille et l'orientation sur des curseurs. Ce n'est pas une
// économie : une poignée de redimensionnement fait dix pixels de côté, ce qui est
// intenable au doigt sur un téléphone, et l'orientation au doigt ne tombe jamais
// sur un angle rond. Un curseur à pas de 5° tombe sur 90 du premier coup.
//
// ── POURQUOI ÇA SE RETIENT, ALORS QUE L'ATELIER D'ÉCHIQUIERS NON ───────────
//
// `echiquierAtelier.js` oublie tout à la fermeture, et c'est juste : une planche
// de diagrammes retrouvée trois semaines plus tard n'est plus celle qu'on
// voulait. Ici c'est le contraire : composer une énigme est un TRAVAIL D'AUTEUR
// d'un quart d'heure, et le rituel de version fait recharger la page dix fois par
// séance. Perdre la composition à chaque rechargement l'aurait rendu inutilisable.

import { DINGBATS } from '../data/dingbats.js';
import { DISPOSITIONS, dessiner, THEMES, NIVEAUX, juste, attendues } from '../core/dingbat.js';
import {
    TOILE, COULEURS, FORMES_LIBRES, elementNeuf, validerLibre,
    enigmeEnTexte, direLibre, dessinerElement
} from '../core/dingbatLibre.js';
import { copierDans, telechargerTexte, jourPourFichier } from './exporter.js';
import { showToast } from './modal.js';

const CLE = 'atoutmath.atelier.dingbat';

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** L'énigme vierge : un mot au milieu, pour qu'il y ait quelque chose à bouger. */
function enigmeVierge() {
    return {
        id: '', theme: 'maths', niveau: 1, reponse: '', variantes: [],
        aide: '', explication: '', elements: [elementNeuf('mot')]
    };
}

let enigme = enigmeVierge();
/** L'élément sélectionné, par son rang. −1 : aucun. */
let choisi = 0;
/** Les coordonnées collent à une grille de 5 : un dessin droit se voit. */
let magnetisme = true;
/** Le volet montre-t-il la toile telle que l'élève la verra ? */
let commeEleve = false;
/** Le modèle regardé à droite. */
let modele = DINGBATS[0] ? DINGBATS[0].id : '';

let modal = null;

// ── CE QU'ON RETIENT D'UNE OUVERTURE À L'AUTRE ──────────────────────────────

function garder() {
    try { localStorage.setItem(CLE, JSON.stringify(enigme)); } catch (e) { /* navigation privée */ }
}

function relire() {
    try {
        const b = JSON.parse(localStorage.getItem(CLE) || 'null');
        // ON VÉRIFIE CE QU'ON RELIT. Un JSON d'une version précédente, ou tronqué
        // par un onglet fermé au mauvais moment, rendrait un atelier qui jette au
        // premier dessin — et l'on ne saurait pas que la faute est dans la
        // sauvegarde et non dans le code.
        if (b && typeof b === 'object' && Array.isArray(b.elements)) {
            enigme = { ...enigmeVierge(), ...b };
            enigme.variantes = Array.isArray(b.variantes) ? b.variantes : [];
            choisi = enigme.elements.length ? 0 : -1;
        }
    } catch (e) { /* on repart d'une toile neuve */ }
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
                <button type="button" class="dgl-x" id="dgl-fermer" aria-label="Fermer">✕</button>
            </div>
            <p class="dgl-aide">Pose un mot, un trait, une forme — puis déplace-les sur la toile.
                L'orientation, la taille et la couleur se règlent à droite. En bas, le JSON à me coller.</p>

            <div class="dgl-corps">
                <div class="dgl-colonne dgl-colonne--toile">
                    <div class="dgl-barre" role="toolbar" aria-label="Ajouter un élément">
                        <button type="button" class="dgl-btn" data-ajouter="mot">＋ Un mot</button>
                        <button type="button" class="dgl-btn" data-ajouter="trait">＋ Un trait</button>
                        <button type="button" class="dgl-btn" data-ajouter="forme">＋ Une forme</button>
                        <span class="dgl-espace"></span>
                        <button type="button" class="dgl-btn" data-dupliquer title="Dupliquer l'élément choisi">⧉</button>
                        <button type="button" class="dgl-btn" data-devant title="Mettre devant">▲</button>
                        <button type="button" class="dgl-btn" data-derriere title="Mettre derrière">▼</button>
                        <button type="button" class="dgl-btn dgl-btn--danger" data-supprimer
                                title="Supprimer l'élément choisi">🗑</button>
                    </div>
                    <div class="dgl-toile-cadre" id="dgl-toile-cadre"></div>
                    <div class="dgl-sous-toile">
                        <label class="dgl-coche"><input type="checkbox" id="dgl-magnetisme" checked>
                            Magnétisme (grille de 5)</label>
                        <label class="dgl-coche"><input type="checkbox" id="dgl-comme-eleve">
                            Voir comme l'élève</label>
                        <span class="dgl-espace"></span>
                        <button type="button" class="dgl-btn" data-neuve>Nouvelle énigme</button>
                    </div>
                    <div class="dgl-avis" id="dgl-avis" role="status"></div>

                    <!-- LES CENT NEUF SONT SOUS LA TOILE, ET NON À CÔTÉ DES RÉGLAGES.
                         Mesuré en photographiant l'atelier : la colonne de gauche
                         s'arrêtait aux avertissements et laissait sept cents pixels
                         de vide le long d'une colonne de droite deux fois plus
                         haute. On regarde un modèle en composant, pas en réglant —
                         il est donc sous la toile, là où l'œil va déjà. -->
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
                        <h3 class="dgl-h3">L'énigme</h3>
                        <label class="dgl-champ">La réponse attendue
                            <input type="text" id="dgl-reponse" maxlength="60"
                                placeholder="racine carrée"></label>
                        <label class="dgl-champ">Autres écritures acceptées (séparées par des virgules)
                            <input type="text" id="dgl-variantes" maxlength="160"
                                placeholder="la racine, racine"></label>
                        <div class="dgl-duo">
                            <label class="dgl-champ">Thème
                                <select id="dgl-theme">${THEMES.map(t =>
                                    `<option value="${t.id}">${esc(t.label)}</option>`).join('')}</select></label>
                            <label class="dgl-champ">Niveau
                                <select id="dgl-niveau">${NIVEAUX.map(x =>
                                    `<option value="${x.id}">${esc(x.nom)}</option>`).join('')}</select></label>
                        </div>
                        <label class="dgl-champ">Le premier indice (facultatif)
                            <input type="text" id="dgl-aide" maxlength="120"
                                placeholder="Regarde ce qui entoure le mot."></label>
                        <label class="dgl-champ">L'explication, après la réponse
                            <textarea id="dgl-explication" rows="2" maxlength="300"
                                placeholder="Le mot est écrit dans un carré : on lit « racine carrée »."></textarea></label>
                        <label class="dgl-champ">L'identifiant
                            <input type="text" id="dgl-id" maxlength="40" placeholder="dg-racine-carree"></label>
                    </div>

                </div>
            </div>

            <div class="dgl-pied">
                <textarea class="dgl-export" id="dgl-json" data-export rows="4" spellcheck="false"
                    aria-label="Le JSON de cette énigme"></textarea>
                <div class="dgl-pied-boutons">
                    <button type="button" class="btn-secondary" id="dgl-relire">↺ Relire ce JSON</button>
                    <button type="button" class="btn-secondary" id="dgl-copier">📋 Copier le JSON</button>
                    <button type="button" class="btn-primary" id="dgl-fichier">⤓ Télécharger</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    // UN CLIC SUR LE FOND FERME, mais PAS un relâché de glissé qui finit dehors :
    // on déplace un mot, on sort de la toile, on relâche — et l'atelier se
    // fermait avec le travail dedans. On ne ferme que si l'appui ET le relâché
    // sont sur le fond.
    let appuiSurFond = false;
    modal.addEventListener('pointerdown', (e) => { appuiSurFond = (e.target === modal); });
    modal.addEventListener('click', (e) => {
        if (e.target === modal && appuiSurFond) fermer();
    });

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

// ── LA TOILE ────────────────────────────────────────────────────────────────

/** L'élément choisi, ou `null`. */
const courant = () => (choisi >= 0 ? enigme.elements[choisi] : null) || null;

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
        try {
            // ON PASSE PAR LE MÊME DESSIN QUE LE JEU, élément par élément : un
            // aperçu qui aurait son propre rendu finirait par ne plus montrer ce
            // que l'élève voit, et c'est précisément ce qu'on vient vérifier.
            //
            // `rendreLibre` ne peut pas servir ici : il exige au moins un mot et
            // jette sur une toile vide — ce qui est juste pour le JEU, et faux
            // pour un atelier où la toile EST vide avant qu'on pose le premier
            // élément. `dessinerElement` est exporté exactement pour ce cas.
            dedans = dessinerElement(e);
        } catch (err) {
            dedans = '';
        }
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

    const el = courant();
    const poignees = (el && el.type === 'trait')
        ? `<circle class="dgl-bout" data-bout="1" cx="${el.x1}" cy="${el.y1}" r="8"/>`
          + `<circle class="dgl-bout" data-bout="2" cx="${el.x2}" cy="${el.y2}" r="8"/>`
        : '';

    cadre.innerHTML = `<svg class="dgl-toile" id="dgl-toile" tabindex="0"
        viewBox="0 0 ${TOILE.largeur} ${TOILE.hauteur}"
        aria-label="La toile — ${esc(direLibre(enigme))}">
        <rect class="dgl-fond" x="0" y="0" width="${TOILE.largeur}" height="${TOILE.hauteur}"/>
        ${grille}${corps}${poignees}</svg>`;

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
 * un rectangle transparent. Six unités de marge : un trait fin de 2 unités
 * d'épaisseur serait sinon une cible d'un pixel.
 */
function poserLesZones(svg) {
    svg.querySelectorAll('[data-el]').forEach(g => {
        let b;
        try { b = g.getBBox(); } catch (e) { return; }
        if (!b || (!b.width && !b.height)) return;
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', String(b.x - 6));
        r.setAttribute('y', String(b.y - 6));
        r.setAttribute('width', String(b.width + 12));
        r.setAttribute('height', String(b.height + 12));
        r.setAttribute('class', 'dgl-prise');
        g.insertBefore(r, g.firstChild);
        if (g.classList.contains('dgl-el--choisi')) {
            const c = r.cloneNode();
            c.setAttribute('class', 'dgl-contour');
            g.appendChild(c);
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

/** Collé à la grille, ou à l'unité. */
const accrocher = (v) => (magnetisme ? Math.round(v / 5) * 5 : Math.round(v));

function brancherLaToile(svg) {
    let glisse = null;

    svg.addEventListener('pointerdown', (ev) => {
        const bout = ev.target.closest('[data-bout]');
        const g = ev.target.closest('[data-el]');
        if (!bout && !g) { choisirElement(-1); return; }
        if (g) {
            const i = Number(g.dataset.el);
            if (i !== choisi) choisirElement(i);
        }
        const el = courant();
        if (!el) return;
        const p = enUnites(svg, ev);
        glisse = {
            bout: bout ? Number(bout.dataset.bout) : 0,
            depart: p,
            // ON RETIENT L'ÉCART ENTRE LE DOIGT ET L'ANCRE, et non la position :
            // sans cela l'élément saute sous le doigt au premier mouvement, ce
            // qui est désagréable au point qu'on croit avoir attrapé autre chose.
            copie: JSON.parse(JSON.stringify(el))
        };
        svg.setPointerCapture(ev.pointerId);
        ev.preventDefault();
    });

    svg.addEventListener('pointermove', (ev) => {
        if (!glisse) return;
        const el = courant();
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
        peindreToile();
        peindreAvis();
        peindreJson();
    });

    const lacher = () => { if (glisse) { glisse = null; garder(); peindreInspecteur(); } };
    svg.addEventListener('pointerup', lacher);
    svg.addEventListener('pointercancel', lacher);

    // AU CLAVIER AUSSI, ET D'UNE UNITÉ. Le doigt pose à peu près ; les flèches
    // finissent le travail. Avec Maj, dix unités d'un coup.
    svg.addEventListener('keydown', (ev) => {
        const el = courant();
        if (!el) return;
        const pas = ev.shiftKey ? 10 : 1;
        const d = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[ev.key];
        if (!d) return;
        ev.preventDefault();
        if (el.type === 'trait') {
            el.x1 += d[0]; el.y1 += d[1]; el.x2 += d[0]; el.y2 += d[1];
        } else { el.x += d[0]; el.y += d[1]; }
        garder();
        peindreToile();
        modal.querySelector('#dgl-toile').focus();
        peindreAvis();
        peindreJson();
    });
}

function choisirElement(i) {
    choisi = i;
    peindreToile();
    peindreInspecteur();
}

// ── L'INSPECTEUR : ce qui change quand on a choisi quelque chose ────────────

/** Les pastilles de couleur — on choisit une couleur en la VOYANT. */
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
    const el = courant();
    if (!el) {
        boite.innerHTML = `<h3 class="dgl-h3">L'élément</h3>
            <p class="dgl-vide">Rien n'est choisi. Touche un mot, un trait ou une forme sur la toile,
            ou ajoute-en un avec les boutons du haut.</p>`;
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
    // ce piège trois fois (`core/foyerDeLaSaisie.js`) ; ici il suffit de ne pas
    // le provoquer.
    boite.querySelectorAll('[data-reg]').forEach(ch => {
        const nom = ch.dataset.reg;
        const appliquer = () => {
            const e = courant();
            if (!e) return;
            if (ch.type === 'checkbox') {
                if (nom === 'remplissage') e.remplissage = ch.checked ? 'teinte' : 'aucun';
                else if (nom === 'gras') e.gras = ch.checked;
                else e[nom] = ch.checked;
            } else if (ch.type === 'range') {
                e[nom] = Number(ch.value);
                const sortie = ch.parentElement.querySelector('output');
                if (sortie) sortie.textContent = ch.value + (nom === 'angle' ? '°' : ' px');
            } else {
                e[nom] = ch.value;
            }
            // CHANGER DE FORME PEUT CHANGER LES CHAMPS À MONTRER — un carré n'a
            // pas de hauteur. C'est le seul réglage qui a le droit de redessiner
            // l'inspecteur, et il le fait sur `change`, pas sur chaque frappe.
            garder();
            peindreToile();
            peindreAvis();
            peindreJson();
            if (nom === 'forme') peindreInspecteur();
        };
        ch.oninput = appliquer;
        if (ch.tagName === 'SELECT') ch.onchange = appliquer;
    });

    boite.querySelectorAll('[data-couleur]').forEach(b => {
        b.onclick = () => {
            const e = courant();
            if (!e) return;
            e.couleur = b.dataset.couleur;
            garder();
            peindreToile();
            peindreJson();
            peindreInspecteur();
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

function peindreJson() {
    const zone = modal.querySelector('#dgl-json');
    // ON N'ÉCRASE PAS CE QUE RÉMY EST EN TRAIN DE COLLER. La zone sert dans les
    // deux sens — on y lit le JSON produit, on y colle celui d'hier — et la
    // réécrire pendant qu'il y colle quelque chose effacerait son collage.
    if (document.activeElement === zone) return;
    zone.value = enigmeEnTexte({
        ...enigme,
        id: String(enigme.id || '').trim() || identifiantPropose(enigme.reponse)
    });
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
    q('#dgl-aide').value = enigme.aide || '';
    q('#dgl-explication').value = enigme.explication || '';
    q('#dgl-id').value = enigme.id || '';
    q('#dgl-magnetisme').checked = magnetisme;
    q('#dgl-comme-eleve').checked = commeEleve;
}

function brancher() {
    const q = (s) => modal.querySelector(s);

    q('#dgl-fermer').onclick = fermer;

    modal.querySelectorAll('[data-ajouter]').forEach(b => {
        b.onclick = () => {
            enigme.elements.push(elementNeuf(b.dataset.ajouter));
            choisi = enigme.elements.length - 1;
            garder();
            peindreToile();
            peindreInspecteur();
            peindreAvis();
            peindreJson();
        };
    });

    q('[data-supprimer]').onclick = () => {
        if (choisi < 0) { showToast('Choisis d\'abord un élément sur la toile.', 'warning'); return; }
        enigme.elements.splice(choisi, 1);
        choisi = Math.min(choisi, enigme.elements.length - 1);
        garder();
        peindreToile(); peindreInspecteur(); peindreAvis(); peindreJson();
    };

    q('[data-dupliquer]').onclick = () => {
        const el = courant();
        if (!el) { showToast('Choisis d\'abord un élément sur la toile.', 'warning'); return; }
        // DÉCALÉE DE DIX UNITÉS, sinon la copie se cache exactement sous
        // l'original et l'on croit que le bouton n'a rien fait.
        const c = JSON.parse(JSON.stringify(el));
        if (c.type === 'trait') { c.x1 += 10; c.y1 += 10; c.x2 += 10; c.y2 += 10; }
        else { c.x += 10; c.y += 10; }
        enigme.elements.splice(choisi + 1, 0, c);
        choisi += 1;
        garder();
        peindreToile(); peindreInspecteur(); peindreAvis(); peindreJson();
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
        garder();
        peindreToile(); peindreInspecteur(); peindreJson();
    };
    q('[data-devant]').onclick = bouger(1);
    q('[data-derriere]').onclick = bouger(-1);

    q('[data-neuve]').onclick = () => {
        enigme = enigmeVierge();
        choisi = 0;
        garder();
        remplirLesChamps();
        peindreToile(); peindreInspecteur(); peindreAvis(); peindreJson();
    };

    q('#dgl-magnetisme').onchange = (e) => { magnetisme = e.target.checked; peindreToile(); };
    q('#dgl-comme-eleve').onchange = (e) => { commeEleve = e.target.checked; peindreToile(); };

    // Les champs de l'énigme : ils ne redessinent PAS la toile ni eux-mêmes.
    const lier = (sel, quoi, lecture = (v) => v) => {
        const ch = q(sel);
        ch.oninput = () => {
            enigme[quoi] = lecture(ch.value);
            garder();
            peindreAvis();
            peindreJson();
        };
        if (ch.tagName === 'SELECT') ch.onchange = ch.oninput;
    };
    lier('#dgl-reponse', 'reponse');
    lier('#dgl-variantes', 'variantes',
        (v) => String(v).split(',').map(x => x.trim()).filter(Boolean));
    lier('#dgl-theme', 'theme');
    lier('#dgl-niveau', 'niveau', (v) => Number(v));
    lier('#dgl-aide', 'aide');
    lier('#dgl-explication', 'explication');
    lier('#dgl-id', 'id');

    q('#dgl-copier').onclick = () => copierDans(q('#dgl-copier'), q('#dgl-json').value, '📋 Copier le JSON');
    q('#dgl-fichier').onclick = () => {
        const nom = (String(enigme.id || '').trim() || identifiantPropose(enigme.reponse) || 'dingbat');
        telechargerTexte(`${nom}-${jourPourFichier()}.json`, q('#dgl-json').value);
        showToast('Le JSON est dans tes téléchargements.', 'success');
    };

    // RELIRE UN JSON FERME LA BOUCLE. On compose ici, on me l'envoie, je le colle
    // dans le dépôt — et six semaines plus tard il faut le retoucher. Sans ce
    // bouton, il faudrait tout refaire à la main.
    q('#dgl-relire').onclick = () => {
        let brut;
        try { brut = JSON.parse(q('#dgl-json').value); } catch (e) {
            showToast('Ce texte n\'est pas du JSON valide : ' + e.message, 'error');
            return;
        }
        if (!brut || !Array.isArray(brut.elements)) {
            showToast('Ce JSON n\'est pas une composition libre : il lui manque « elements ».', 'error');
            return;
        }
        enigme = { ...enigmeVierge(), ...brut };
        enigme.variantes = Array.isArray(brut.variantes) ? brut.variantes : [];
        choisi = enigme.elements.length ? 0 : -1;
        garder();
        remplirLesChamps();
        peindreToile(); peindreInspecteur(); peindreAvis(); peindreJson();
        showToast('Composition relue : ' + enigme.elements.length + ' élément(s).', 'success');
    };
}

/**
 * Ouvre l'atelier, et retrouve la composition laissée en plan.
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
    remplirLesChamps();
    peindreToile();
    peindreInspecteur();
    peindreAvis();
    peindreJson();
    peindreModele();
    return m;
}
