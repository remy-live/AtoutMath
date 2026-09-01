// Éditeur de parcours (mode professeur).
//
// Deux changements de fond par rapport à la version précédente :
//
//  1. Une étape est une RÉFÉRENCE (`exerciseId` + surcharges), plus une copie
//     profonde de l'exercice. Les parcours enregistrés suivent donc les
//     corrections du catalogue, pèsent quelques centaines d'octets et sont
//     directement envoyables à une base de données.
//  2. Le parcours porte une POLITIQUE : entraînement ou évaluation notée.
//
// Sur la forme : plus de `window.xxx` appelés depuis des attributs `onclick`
// dans des chaînes HTML. Les gestionnaires sont posés en JS, ce qui supprime
// une dizaine de globales et rend l'échappement des données non négociable.

import { exercices, getExerciseById, paramSchemaOf } from '../data/catalog.js';
import { state } from '../core/state.js';
import { Shortcodes } from '../core/shortcodes.js';
import { makeStep, normalizePath, totalItems } from '../core/path.js';
import { resolvePolicy, isEvaluation, describePolicy, MODES } from '../core/policy.js';
import { communDe, appliquerAuxEtapes } from '../core/reglagesGroupes.js';
import { MAX_ETAPE } from '../core/seuilEtape.js';
import { creerHistorique } from '../core/historique.js';
import {
    mesuresParExercice, estimerEtape, estimerParcours,
    direDuree, tensionDuree, PHRASES_TENSION
} from '../core/dureeParcours.js';
import { natureDe } from '../core/duree.js';
import { chapitresDe } from '../core/chapitres.js';
import {
    renderGameConfigUI, renderPolicyEditor, conseilEtape, aApercuAide
} from '../games/configUI.js';
import { lireZones, normaliserZones, zonesDuMode, modeZone } from '../core/aide.js';
import { showToast, showAlert, showConfirm } from './modal.js';

let selectedStepId = null;

// --- Initialisation ---------------------------------------------------------

export function initBuilder() {
    const pathBox = document.getElementById('path-container');
    if (!pathBox) return;

    if (!state.currentPath.policy) state.currentPath.policy = resolvePolicy(null);

    pathBox.ondragover = (e) => { e.preventDefault(); pathBox.classList.add('drag-over'); };
    pathBox.ondragleave = () => pathBox.classList.remove('drag-over');
    pathBox.ondrop = (e) => handleDrop(e, pathBox);

    initNameInput();
    initPreviewModes();
    initToolbar();
    initPathBrowser();
    initPolicyPanel();
    initPresentationMode();
    initGameAccessPanel();
    initClassesPanel();
    initChapitresPanel();
    initHistorique();
    initOutilsMenu();
    renderTeacherPath();
}

// --- Mes classes ------------------------------------------------------------
//
// Chargé à la demande : l'écran des classes lit tout le journal de chaque
// élève pour recalculer les bilans, et un professeur qui monte un parcours
// n'en a pas besoin.

function initClassesPanel() {
    const btn = document.getElementById('btn-classes');
    if (!btn) return;
    btn.onclick = async () => {
        const { ouvrirClasses } = await import('./classesUI.js');
        ouvrirClasses();
    };
}

// --- Mes chapitres ----------------------------------------------------------
//
// Chargé à la demande, comme les classes : l'écran croise les cent exercices
// avec toute la progression, et on n'y va qu'en début d'année.

function initChapitresPanel() {
    const btn = document.getElementById('btn-chapitres');
    if (!btn) return;
    btn.onclick = async () => {
        const { ouvrirChapitres } = await import('./chapitresUI.js');
        ouvrirChapitres();
    };
}

// --- Accès aux jeux (libre / réservé / à débloquer) -------------------------

function initGameAccessPanel() {
    const btn = document.getElementById('btn-game-access');
    if (!btn) return;
    btn.onclick = async () => {
        const { getAccessConfig, saveAccessConfig, isGame } = await import('../core/gameAccess.js');
        openGameAccessModal(getAccessConfig(), saveAccessConfig, isGame);
    };
}

function openGameAccessModal(cfg, save, isGame) {
    let overlay = document.getElementById('game-access-modal');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'game-access-modal';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';

    const parDomaine = new Map();
    exercices.forEach(exo => {
        const dom = exo.tags.chemin[0];
        if (!parDomaine.has(dom)) parDomaine.set(dom, []);
        parDomaine.get(dom).push(exo);
    });

    const listeHtml = [...parDomaine.entries()].map(([dom, exos]) => `
        <div class="access-group">
            <div class="access-group-title">${escapeHtml(dom)}</div>
            ${exos.map(exo => `
                <label class="cfg-check access-row">
                    <input type="checkbox" data-reserved="${escapeHtml(exo.id)}"
                        ${cfg.reserved.includes(exo.id) ? 'checked' : ''}>
                    ${escapeHtml(exo.title)}${isGame(exo) ? ' <span class="access-tag-jeu">jeu</span>' : ''}
                </label>`).join('')}
        </div>`).join('');

    overlay.innerHTML = `
        <div class="glass-panel modal-panel-md">
            <div class="modal-header">
                <h3 class="modal-title">🔐 Accès aux jeux</h3>
                <button class="modal-close-btn" id="btn-close-game-access" aria-label="Fermer">&times;</button>
            </div>
            <p class="modal-text">Réglage enregistré sur CE poste : il s'applique au jeu libre de tous les
                élèves qui l'utilisent. Les parcours et les codes que vous donnez ne sont jamais bloqués.</p>

            <div class="cfg-group">
                <div class="cfg-group-title">Jeux à débloquer</div>
                <label class="cfg-check">
                    <input type="radio" name="access-mode" value="libre" ${cfg.mode !== 'progression' ? 'checked' : ''}>
                    Tous les jeux sont accessibles librement
                </label>
                <label class="cfg-check">
                    <input type="radio" name="access-mode" value="progression" ${cfg.mode === 'progression' ? 'checked' : ''}>
                    Les jeux se débloquent avec le travail de l'élève
                </label>
                <div class="cfg-field">
                    <label class="cfg-label" for="access-step">Bonnes réponses par jeu débloqué</label>
                    <input type="number" id="access-step" class="cfg-input cfg-input--num" min="5" max="500" value="${cfg.unlockStep}">
                </div>
            </div>

            <div class="cfg-group">
                <div class="cfg-group-title">Exercices réservés (jamais en jeu libre)</div>
                <div class="access-list">${listeHtml}</div>
            </div>

            <div class="modal-actions-center">
                <button id="btn-access-save" class="btn-toggle glass-btn primary active modal-btn-flex modal-btn-flex--primary">Enregistrer</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-game-access').onclick = () => overlay.remove();
    overlay.querySelector('#btn-access-save').onclick = () => {
        const mode = overlay.querySelector('[name="access-mode"]:checked').value;
        const step = parseInt(overlay.querySelector('#access-step').value, 10) || 30;
        const reserved = [...overlay.querySelectorAll('[data-reserved]:checked')]
            .map(cb => cb.dataset.reserved);
        save({ mode, unlockStep: step, reserved });
        overlay.remove();
        showToast('Réglages d\'accès enregistrés.', 'success');
    };
}

// --- Mode présentation (classe) ---------------------------------------------
//
// Pour projeter le parcours au tableau : la carte des mondes à gauche, et un
// aperçu PERMANENT de l'étape choisie à droite — cliquer sur un monde change
// l'exercice montré, sans quitter la vue d'ensemble.

function initPresentationMode() {
    const btn = document.getElementById('btn-presentation');
    if (!btn) return;
    btn.onclick = async () => {
        if (!state.currentPath.steps.length) {
            showAlert('Ajoutez au moins une activité pour lancer la présentation.');
            return;
        }
        const [{ buildWorldMap }, { hydratePath }] = await Promise.all([
            import('./pathView.js'), import('../core/path.js')
        ]);
        const { steps } = hydratePath(state.currentPath);
        openPresentation(steps, buildWorldMap);
    };
}

function openPresentation(steps, buildWorldMap) {
    let overlay = document.getElementById('presentation-modal');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'presentation-modal';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="glass-panel modal-panel-lg" style="width: 94vw; max-width: 1280px; height: 90vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h3 class="modal-title">🗺️ ${escapeHtml(state.currentPath.name || 'Parcours')}</h3>
                <button class="modal-close-btn" id="btn-close-presentation" aria-label="Fermer">&times;</button>
            </div>
            <div class="presentation-body">
                <div class="presentation-map"></div>
                <div class="presentation-preview">
                    <div class="presentation-preview-title">
                        <span id="presentation-title"></span>
                        <span class="presentation-preview-rule" id="presentation-rule"></span>
                    </div>
                    <div class="presentation-preview-canvas" id="presentation-canvas">
                        <div class="presentation-scene" id="presentation-scene"></div>
                    </div>
                    <div class="presentation-nav">
                        <button type="button" id="presentation-prev" aria-label="Étape précédente">←<span> Précédente</span></button>
                        <span class="presentation-nav-pos" id="presentation-pos"></span>
                        <button type="button" id="presentation-next" aria-label="Étape suivante"><span>Suivante </span>→</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const canvas = overlay.querySelector('#presentation-canvas');
    const scene = overlay.querySelector('#presentation-scene');
    const titre = overlay.querySelector('#presentation-title');
    const regle = overlay.querySelector('#presentation-rule');
    const pos = overlay.querySelector('#presentation-pos');
    const prev = overlay.querySelector('#presentation-prev');
    const next = overlay.querySelector('#presentation-next');

    // L'aperçu est une SCÈNE mise à l'échelle, pas un exercice écrasé.
    //
    // Un exercice a besoin d'une place minimale : sous 400 × 520, un pavé
    // numérique ou un rapporteur dépassent, et on ne voyait plus le bouton de
    // validation. On lui donne donc toujours cette place — quitte à la
    // réduire ensuite d'un coup de zoom. L'aperçu montre alors exactement ce
    // que l'élève verra, en plus petit, plutôt qu'un morceau d'exercice.
    const caler = () => {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const w = Math.max(r.width, 400), h = Math.max(r.height, 520);
        const k = Math.min(r.width / w, r.height / h, 1);
        scene.style.width = `${w}px`;
        scene.style.height = `${h}px`;
        scene.style.transform =
            `translate(${(r.width - w * k) / 2}px, ${(r.height - h * k) / 2}px) scale(${k})`;
    };

    let courant = 0;
    const montrer = async (i) => {
        const step = steps[i];
        if (!step) return;
        courant = i;
        titre.textContent = `${i + 1}. ${step.title}`;
        // Combien de questions, combien pour valider : c'est ce que la classe
        // demande en premier quand on projette le parcours.
        const src = state.currentPath.steps[i] || {};
        const nb = src.nbItems ?? step.nbItems;
        const seuil = src.threshold ?? nb;
        regle.textContent = nb ? `${nb} question${nb > 1 ? 's' : ''} · ✔ ${seuil} pour valider` : '';
        pos.textContent = `${i + 1} / ${steps.length}`;
        prev.disabled = i === 0;
        next.disabled = i === steps.length - 1;
        overlay.querySelectorAll('.world-node').forEach((n, j) =>
            n.classList.toggle('world-node--current', j === i));
        caler();
        const { launchPreview } = await import('../games/engine.js');
        launchPreview(step.exercise, scene, step.params, { muet: true });
    };

    prev.onclick = () => montrer(Math.max(0, courant - 1));
    next.onclick = () => montrer(Math.min(steps.length - 1, courant + 1));

    const map = buildWorldMap(steps, {
        allUnlocked: true,
        // LE PROFESSEUR VOIT SA SÉANCE ENTIÈRE, jeux compris. Côté élève ils
        // restent cachés jusqu'à ce qu'ils soient gagnés (voir `visibles` dans
        // ui/pathView.js) — mais celui qui l'a composée doit pouvoir la relire.
        montrerCadeaux: true,
        onNodeClick: (i) => montrer(i)
    });
    overlay.querySelector('.presentation-map').appendChild(map);

    const surResize = () => caler();
    window.addEventListener('resize', surResize);

    overlay.querySelector('#btn-close-presentation').onclick = async () => {
        window.removeEventListener('resize', surResize);
        const [{ clearEngines }, { destroyAllDemoCursors }] = await Promise.all([
            import('../core/timers.js'), import('../core/demoPointer.js')
        ]);
        clearEngines();
        destroyAllDemoCursors();
        overlay.remove();
    };

    montrer(0);
}

/**
 * OÙ L'ON A LÂCHÉ — le rang, et non la fin de la liste.
 *
 * Rémy : « pour le drag drop d'exercice, il faut mettre l'exercice drag à
 * l'endroit où on l'a posé, pas à la fin. » Le réordonnancement le faisait
 * déjà ; un exercice VENANT DU CATALOGUE, lui, tombait toujours en dernier —
 * il fallait le déposer puis le remonter à la main, geste par geste. C'est
 * pourtant le même calcul : on cherche la première étape dont on a lâché
 * au-dessus du milieu.
 */
function rangDuDepot(e, pathBox) {
    const rows = [...pathBox.querySelectorAll('.path-step')];
    for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length;
}

function handleDrop(e, pathBox) {
    e.preventDefault();
    pathBox.classList.remove('drag-over');

    const reorderIdx = e.dataTransfer.getData('text/reorder');
    const exerciseId = e.dataTransfer.getData('text/plain');
    const steps = state.currentPath.steps;
    const rang = rangDuDepot(e, pathBox);

    if (reorderIdx !== '') {
        const from = parseInt(reorderIdx, 10);
        let to = rang;
        if (from !== to) {
            const item = steps.splice(from, 1)[0];
            if (from < to) to--;
            steps.splice(to, 0, item);
            renderTeacherPath();
        }
        return;
    }

    const dossier = e.dataTransfer.getData('text/dossier');
    if (dossier !== '') {
        ajouterLeDossier(dossier === '' ? [] : dossier.split(' > '), rang);
        return;
    }

    if (exerciseId && getExerciseById(exerciseId)) {
        addStep(exerciseId, rang);
    }
}

/** Au-delà, on demande : un chapitre entier peut faire une heure et demie. */
const LOT_SANS_QUESTION = 6;

/**
 * Verser un dossier entier dans le parcours.
 *
 * C'est le geste que le classement par chapitre rend possible : on tire
 * « 6ème › Fractions » dans la colonne du milieu et la séance est montée. Au
 * delà de six exercices on demande confirmation — un chapitre de vingt fait un
 * parcours d'une heure et demie, et un glissement se fait vite.
 */
export async function ajouterLeDossier(path, rang) {
    const { exercicesDuDossier } = await import('./navigation.js');
    const lot = exercicesDuDossier(path);
    const nom = path.length ? path[path.length - 1] : 'tout le catalogue';

    if (!lot.length) {
        showToast(`« ${nom} » ne contient aucun exercice.`, 'error');
        return;
    }

    const verser = () => {
        const steps = state.currentPath.steps;
        // Le dossier se verse là où on l'a lâché, comme un exercice seul — et
        // dans son ordre : la première étape du lot prend le rang du dépôt.
        const debut = Number.isInteger(rang)
            ? Math.max(0, Math.min(rang, steps.length)) : steps.length;
        lot.forEach((exo, i) => {
            // Le compte naturel de l'exercice, pas dix pour tout le monde :
            // une grille de sudoku n'est pas une question de calcul mental.
            const n = conseilEtape({ exerciseId: exo.id });
            const step = makeStep(exo.id, {}, { nbItems: n, threshold: Math.ceil(n * 0.7) });
            steps.splice(debut + i, 0, step);
        });
        renderTeacherPath();
        showToast(`${lot.length} exercices de « ${nom} » ajoutés au parcours.`, 'success');
    };

    if (lot.length > LOT_SANS_QUESTION) {
        showConfirm(
            `« ${nom} » contient ${lot.length} exercices. Les ajouter tous au parcours ?`,
            verser
        );
        return;
    }
    verser();
}

/**
 * @param {string} exerciseId
 * @param {number} [rang]  où l'insérer ; à la fin quand on ne dit rien — c'est
 *                         le cas du clic depuis le tiroir, qui n'a pas de
 *                         point de dépôt.
 */
export function addStep(exerciseId, rang) {
    const exo = getExerciseById(exerciseId);
    if (!exo) return;
    const n = conseilEtape({ exerciseId });
    const step = makeStep(exerciseId, {}, { nbItems: n, threshold: Math.ceil(n * 0.7) });
    const steps = state.currentPath.steps;
    const ou = Number.isInteger(rang) ? Math.max(0, Math.min(rang, steps.length)) : steps.length;
    steps.splice(ou, 0, step);
    renderTeacherPath();
    // Pas sur téléphone : le panneau de propriétés s'y ouvre en PLEIN ÉCRAN,
    // et chaque ajout depuis le tiroir recouvrait donc tout — impossible
    // d'ajouter plusieurs exercices à la suite. Les propriétés s'ouvrent d'un
    // appui sur l'étape, quand on en a besoin.
    if (!document.body.classList.contains('mobile-view')) selectStep(step.stepId);
}

// --- Rendu de la liste d'étapes ---------------------------------------------

// --- Annuler / refaire ------------------------------------------------------
//
// UN SEUL POINT D'ACCROCHE : toutes les modifications du parcours — ajout,
// suppression, duplication, réordonnancement, réglages d'une étape, barème,
// « Nouveau parcours », chargement d'un parcours enregistré — passent par
// `renderTeacherPath()`. On y prend l'état, et rien ne peut donc échapper à
// l'historique par oubli.
//
// L'état retenu comprend l'IDENTIFIANT du parcours en plus de son contenu :
// annuler un « Nouveau parcours » sans lui rendrait ses étapes mais pas son
// identité, et l'enregistrement suivant aurait fabriqué un doublon.

let histoire = null;
let enTrainDeRejouer = false;

const etatDuParcours = () => ({
    chemin: state.currentPath,
    cheminId: state.currentPathId || null
});

function retenirLEtat() {
    if (enTrainDeRejouer) return;
    if (!histoire) histoire = creerHistorique(etatDuParcours());
    else histoire.enregistrer(etatDuParcours());
    majBoutonsHistorique();
}

function appliquerEtat(etat) {
    if (!etat) return;
    enTrainDeRejouer = true;
    state.currentPath = etat.chemin;
    state.currentPathId = etat.cheminId;
    selectedStepId = null;
    const input = document.getElementById('path-name-input');
    if (input) input.value = state.currentPath.name || '';
    renderTeacherPath();
    enTrainDeRejouer = false;
    majBoutonsHistorique();
}

export function annulerParcours() {
    if (!histoire || !histoire.peutAnnuler()) return;
    appliquerEtat(histoire.annuler());
}

export function refaireParcours() {
    if (!histoire || !histoire.peutRefaire()) return;
    appliquerEtat(histoire.refaire());
}

function majBoutonsHistorique() {
    // ON CACHE, ON NE GRISE PAS — la règle que Rémy a posée pour cette barre, et
    // qui vaut ici aussi : « l'icône play et lien n'apparaissent que lorsque
    // l'on charge un parcours. Undo et Redo, pareil. »
    //
    // « Refaire » est le cas le plus net : il n'a de sens qu'entre un « annuler »
    // et le geste suivant, c'est-à-dire presque jamais. Grisé, il occupait en
    // permanence un carré qu'il fallait lire pour comprendre qu'il ne servait
    // pas ; absent, il ne demande rien, et son apparition DIT qu'il y a
    // quelque chose à refaire.
    const cacher = (id, peut) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = !peut;
        el.hidden = !peut;
    };
    cacher('btn-path-undo', !!(histoire && histoire.peutAnnuler()));
    cacher('btn-path-redo', !!(histoire && histoire.peutRefaire()));
}

// --- Mes outils : un bouton, quatre noms -------------------------------------
//
// Le menu se CONSTRUIT À PARTIR DES BOUTONS CACHÉS : leur infobulle donne le
// libellé, leur icône est clonée, et cliquer une ligne clique le bouton. Aucune
// liste à tenir à jour en double, et un outil ajouté demain apparaît ici tout
// seul dès qu'il porte la classe.
const OUTILS = ['btn-classes', 'btn-chapitres', 'btn-game-access', 'btn-open-import-export-teacher'];

function initOutilsMenu() {
    const btn = document.getElementById('btn-outils-prof');
    const menu = document.getElementById('outils-menu');
    if (!btn || !menu) return;

    menu.innerHTML = '';
    OUTILS.forEach(id => {
        const source = document.getElementById(id);
        if (!source) return;
        const ligne = document.createElement('button');
        ligne.type = 'button';
        ligne.className = 'outils-item';
        ligne.setAttribute('role', 'menuitem');
        // « Mes classes : suivre les progressions » → « Mes classes », et le
        // reste en explication sous le nom.
        const [nom, ...suite] = (source.title || source.ariaLabel || '').split(' : ');
        const icone = source.querySelector('svg');
        if (icone) ligne.appendChild(icone.cloneNode(true));
        const texte = document.createElement('span');
        texte.className = 'outils-texte';
        texte.innerHTML = '<span class="outils-nom"></span><span class="outils-aide"></span>';
        texte.querySelector('.outils-nom').textContent = nom;
        texte.querySelector('.outils-aide').textContent = suite.join(' : ');
        ligne.appendChild(texte);
        ligne.onclick = () => { fermerOutils(); source.click(); };
        menu.appendChild(ligne);
    });

    const fermerOutils = () => {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    };
    // POSÉ EN FIXE, ET NON DANS LE FLUX. Un menu absolu se fait couper par le
    // premier ancêtre qui masque son débordement — ici la colonne du milieu,
    // et sur téléphone il ne restait qu'une bande. En fixe, il ne dépend que
    // de la fenêtre, et on le recale pour qu'il n'en sorte pas.
    const placer = () => {
        const r = btn.getBoundingClientRect();
        menu.style.top = `${Math.round(r.bottom + 8)}px`;
        const large = menu.offsetWidth;
        const gauche = Math.min(r.right - large, window.innerWidth - large - 8);
        menu.style.left = `${Math.round(Math.max(8, gauche))}px`;
    };

    btn.onclick = (e) => {
        e.stopPropagation();
        const ouvert = !menu.hidden;
        menu.hidden = ouvert;
        btn.setAttribute('aria-expanded', String(!ouvert));
        if (!ouvert) placer();
    };
    window.addEventListener('resize', () => { if (!menu.hidden) placer(); });
    // Un clic ailleurs ou la touche d'échappement referment : un menu qui reste
    // ouvert derrière l'écran suivant finit par recouvrir ce qu'on regarde.
    document.addEventListener('click', (e) => {
        if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) fermerOutils();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerOutils(); });
}

function initHistorique() {
    const annuler = document.getElementById('btn-path-undo');
    const refaire = document.getElementById('btn-path-redo');
    if (annuler) annuler.onclick = annulerParcours;
    if (refaire) refaire.onclick = refaireParcours;

    // Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z — et jamais pendant qu'on tape le nom du
    // parcours : là, Ctrl+Z doit défaire une lettre, pas une demi-heure.
    document.addEventListener('keydown', (e) => {
        if (!state.isTeacherMode) return;
        if (!(e.ctrlKey || e.metaKey)) return;
        const ou = document.activeElement;
        if (ou && /^(INPUT|TEXTAREA|SELECT)$/.test(ou.tagName)) return;
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); annulerParcours(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); refaireParcours(); }
    });

    majBoutonsHistorique();
}

/**
 * « ≈ 25 à 40 min », coloré selon que la séance tient ou non dans l'heure.
 *
 * C'est le seul chiffre du bandeau qu'on lit pour DÉCIDER — le reste décrit ce
 * qu'on a mis, celui-ci dit si ça passe.
 */
function pastilleDuree(steps) {
    const etapes = steps.map(s => {
        const exo = getExerciseById(s.exerciseId);
        return exo
            ? { exerciceId: exo.id, nature: natureDe(exo), questions: s.nbItems || 10 }
            : { exerciceId: s.exerciseId, nature: 'notion', questions: s.nbItems || 10 };
    });
    const d = estimerParcours(etapes, mesuresDuJournal);
    const tension = tensionDuree(d.max);

    const el = document.createElement('span');
    el.className = `path-duree path-duree--${tension}`;
    el.textContent = `${d.mesurees === d.total && d.total ? '' : '≈ '}${direDuree(d.min, d.max)}`;
    el.title = PHRASES_TENSION[tension]
        + (d.mesurees
            ? `\n${d.mesurees} activité${d.mesurees > 1 ? 's' : ''} sur ${d.total} : durée MESURÉE `
              + 'sur les réponses déjà enregistrées.'
            : '\nEstimation d\'après la nature des exercices — elle se précisera '
              + 'dès que les élèves auront répondu.');
    return el;
}

/**
 * LES COMMANDES QUI APPARTIENNENT AU PARCOURS ne s'affichent qu'avec lui.
 *
 * Rémy : « pour la zone prof, plein d'icônes n'ont pas à apparaître tant que
 * le parcours n'est pas chargé ; en fait il y a mode et barème par exemple qui
 * appartient au parcours. »
 *
 * IL A MIS LE DOIGT SUR LA BONNE QUESTION : À QUOI CHAQUE BOUTON APPARTIENT-IL ?
 * Neuf des onze commandes de cette barre ne veulent rien dire sans étapes —
 * « Mode & barème » règle la notation D'UN parcours, « Tester » le joue,
 * « Code Élève » le distribue, l'imprimante l'imprime, les trois aperçus
 * montrent ses écrans. Un professeur qui arrive sur une page vide les voit
 * pourtant toutes, et doit deviner lesquelles ont un sens maintenant. Onze
 * carrés blancs dont neuf ne feraient rien, ce n'est pas une barre d'outils,
 * c'est une devinette.
 *
 * DEUX SEULEMENT SURVIVENT À LA PAGE VIDE, et ce sont exactement celles qui
 * font sortir de cet état : créer un parcours, en ouvrir un. Les outils du
 * professeur — ses classes, ses chapitres — restent aussi, parce qu'eux ne
 * parlent pas de ce parcours-ci.
 *
 * ON CACHE, ON NE DÉSACTIVE PAS. Un bouton grisé demande encore à être lu pour
 * comprendre qu'il ne sert pas ; un bouton absent ne demande rien. La barre du
 * début de séance tombe ainsi de onze icônes à trois.
 */
//
// ANNULER / REFAIRE N'EST PAS DANS CETTE LISTE, et c'est voulu : ces deux-là
// ont une condition PLUS FINE que « y a-t-il un parcours ? » — il faut qu'il y
// ait quelque chose à annuler, ou à refaire. `majBoutonsHistorique` en est le
// seul maître ; les inscrire ici aussi ferait réapparaître un « refaire »
// inutile à chaque rendu du parcours, selon lequel des deux passe en dernier.
const OUTILS_DU_PARCOURS = [
    'btn-path-policy',
    'btn-presentation', 'btn-test-sequence', 'btn-generate-code', 'btn-fiche-parcours'
];

function outilsDuParcours(visible) {
    OUTILS_DU_PARCOURS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = !visible;
    });
    document.querySelectorAll('.preview-mode-group')
        .forEach(el => { el.hidden = !visible; });
}

export function renderTeacherPath() {
    const pathBox = document.getElementById('path-container');
    if (!pathBox) return;
    retenirLEtat();
    rafraichirLesMesures();

    // ON RETIRE EN VÉRIFIANT LE PARENT. Un champ de la barre qui perd le focus
    // pendant qu'on redessine peut avoir déjà emporté son bloc : `remove()`
    // lève alors une exception au milieu de la liste, et la moitié des lignes
    // reste à l'écran. Le garde-fou coûte un test et sauve le rendu.
    pathBox.querySelectorAll('.path-step, .path-selection')
        .forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });

    const steps = state.currentPath.steps;
    const badge = document.getElementById('path-count-badge');
    if (badge) badge.textContent = steps.length;
    outilsDuParcours(steps.length > 0);

    const emptyMsg = pathBox.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.style.display = steps.length === 0 ? 'block' : 'none';

    const policy = resolvePolicy(state.currentPath.policy);
    const summary = document.getElementById('path-summary');
    if (summary) {
        summary.innerHTML = '';
        if (steps.length) {
            const compte = document.createElement('span');
            compte.textContent = `${steps.length} activité${steps.length > 1 ? 's' : ''}`
                + ` • ${totalItems(state.currentPath)} questions • `;
            summary.appendChild(compte);
            summary.appendChild(pastilleDuree(steps));
            const regle = document.createElement('span');
            regle.textContent = ` • ${describePolicy(policy)}`;
            summary.appendChild(regle);
        }
        summary.classList.toggle('path-summary--eval', isEvaluation(policy));
    }

    // LA BARRE DE SÉLECTION, EN TÊTE DE LISTE. Elle n'apparaît que lorsqu'une
    // case est cochée : une barre d'actions permanente au-dessus d'une liste
    // vide n'est qu'un bandeau de plus.
    steps.forEach((step, index) => pathBox.appendChild(stepRow(step, index, policy)));
    majBarreSelection();
    autoSavePath();
}

// --- MARQUER PLUSIEURS ÉTAPES D'UN COUP -------------------------------------
//
// Rémy : « ce serait cool de pouvoir sélectionner dans le mode prof, dans le
// parcours, plusieurs exercices pour les rendre non obligatoires ou en
// récompense. »
//
// UNE PAR UNE, C'ÉTAIT DÉJÀ POSSIBLE — il fallait ouvrir les propriétés de
// chacune et cocher la case. Sur une séance de dix étapes dont on veut rendre
// quatre facultatives, cela fait quatre allers-retours dans un panneau qui
// s'ouvre par-dessus la liste : on perd de vue ce qu'on est en train de faire.
// Les cases se cochent donc SUR la liste, et l'action s'applique d'un coup.

/** Les `stepId` cochés. Vidé dès que la sélection n'a plus de sens. */
let coches = new Set();

/**
 * La barre, posée ou retirée en tête de liste — SANS TOUCHER AUX LIGNES.
 *
 * Cocher une case ne redessine donc pas la liste : redessiner ferait perdre le
 * focus du clavier à chaque coche, et sur une longue séance on verrait la
 * liste sauter à chaque geste.
 */
function majBarreSelection() {
    const pathBox = document.getElementById('path-container');
    if (!pathBox) return;
    const ancienne = pathBox.querySelector('.path-selection');
    if (ancienne) ancienne.remove();
    const barre = barreDeSelection((state.currentPath && state.currentPath.steps) || []);
    if (barre) pathBox.insertBefore(barre, pathBox.firstChild);
}

function barreDeSelection(steps) {
    const vivants = new Set(steps.map(s => s.stepId));
    [...coches].forEach(id => { if (!vivants.has(id)) coches.delete(id); });
    if (!coches.size) return null;

    const pris = steps.filter(s => coches.has(s.stepId));
    const barre = document.createElement('div');
    barre.className = 'path-selection';
    const quoi = document.createElement('span');
    quoi.className = 'path-selection-compte';
    quoi.textContent = `${pris.length} étape${pris.length > 1 ? 's' : ''} sélectionnée${pris.length > 1 ? 's' : ''}`;
    barre.appendChild(quoi);

    const bouton = (texte, titre, faire) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'path-selection-btn';
        b.textContent = texte;
        b.title = titre;
        b.onclick = () => {
            state.currentPath.steps = state.currentPath.steps.map(
                s => (coches.has(s.stepId) ? faire(s) : s));
            renderTeacherPath();
        };
        barre.appendChild(b);
        return b;
    };

    // LES DEUX SENS SONT OFFERTS, et non une bascule : sur une sélection mêlée
    // — deux facultatives, une obligatoire — une bascule ferait l'inverse pour
    // chacune, ce qui n'est jamais ce qu'on veut.
    bouton('Non obligatoires', 'Ces étapes s\'ouvrent quand le travail obligatoire qui les '
        + 'précède est réussi, mais l\'élève peut passer à la suite sans les faire.',
    s => ({ ...s, facultatif: true }));
    bouton('Obligatoires', 'Ces étapes doivent être réussies pour ouvrir la suite.',
        s => ({ ...s, facultatif: false, bonus: false }));
    bouton('🎁 Récompenses', 'Un jeu de récompense ne compte pas dans la note et s\'ouvre '
        + 'quand le travail qui le précède est réussi.',
    s => ({ ...s, bonus: true, facultatif: true, threshold: null }));

    const rien = document.createElement('button');
    rien.type = 'button';
    rien.className = 'path-selection-btn path-selection-btn--fin';
    rien.textContent = 'Désélectionner';
    rien.onclick = () => { coches.clear(); majBarreSelection(); };
    barre.appendChild(rien);

    barre.appendChild(ligneDeReglages(pris));
    return barre;
}

/**
 * LES RÉGLAGES GLOBAUX — deuxième ligne de la barre.
 *
 * Rémy : « on peut mettre un seuil commun de réussite minimal (ex 70 %, ça
 * règle tous les curseurs des exercices sélectionnés) et même le nombre de
 * questions et le mode par défaut. Rends cela simple. »
 *
 * DEUX CHAMPS, ET UN MENU, PAS PLUS. Le nombre de questions et la part exigée
 * s'appliquent à la sélection ; le mode, lui, est un réglage de la SÉANCE et
 * n'a jamais existé par étape — le proposer par étape aurait été un bouton qui
 * ne fait pas ce qu'il dit. Son étiquette le dit donc en toutes lettres.
 *
 * UN CHAMP VIDE VEUT DIRE « NE PAS Y TOUCHER ». C'est ce qui rend la barre sans
 * danger : elle s'ouvre avec la valeur commune quand il y en a une, avec rien
 * du tout quand les étapes diffèrent, et on ne change que ce qu'on écrit.
 */
function ligneDeReglages(pris) {
    const ligne = document.createElement('div');
    ligne.className = 'path-selection-reglages';

    const commun = communDe(pris);
    const intro = document.createElement('span');
    intro.className = 'path-selection-pour';
    intro.textContent = `Pour ${pris.length > 1 ? `ces ${pris.length}` : 'cette'} étape${pris.length > 1 ? 's' : ''} :`;
    ligne.appendChild(intro);

    const champ = (etiquette, valeur, suffixe, titre, poser) => {
        const bloc = document.createElement('label');
        bloc.className = 'path-selection-champ';
        bloc.title = titre;
        const nom = document.createElement('span');
        nom.textContent = etiquette;
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'path-selection-num';
        inp.min = '0';
        inp.max = etiquette === 'Réussite ≥' ? '100' : String(MAX_ETAPE);
        inp.value = valeur === null ? '' : String(valeur);
        // Valeurs mêlées : le champ reste vide et le dit, plutôt que d'afficher
        // celle de la première étape — on croirait lire la sélection entière.
        inp.placeholder = valeur === null ? '—' : '';
        inp.onchange = () => {
            if (inp.value === '') return;
            const suite = poser(inp.value);
            // ON LÂCHE LE CHAMP AVANT DE REDESSINER : il est sur le point d'être
            // détruit, et le laisser focalisé fait partir un `blur` au beau
            // milieu du rendu.
            inp.blur();
            state.currentPath.steps = suite;
            renderTeacherPath();
        };
        bloc.appendChild(nom);
        bloc.appendChild(inp);
        if (suffixe) {
            const s = document.createElement('span');
            s.textContent = suffixe;
            bloc.appendChild(s);
        }
        ligne.appendChild(bloc);
    };

    champ('Questions', commun.questions, '',
        'Le nombre de questions de chacune des étapes sélectionnées. Le seuil '
        + 'de réussite suit, en gardant sa part.',
        (v) => appliquerAuxEtapes(state.currentPath.steps, coches, { questions: Number(v) }));

    champ('Réussite ≥', commun.part, '%',
        'La part de bonnes réponses exigée. Chaque étape la traduit dans son '
        + 'propre total : 70 % font 7 sur 10 et 14 sur 20. Zéro veut dire aucune exigence.',
        (v) => appliquerAuxEtapes(state.currentPath.steps, coches, { part: Number(v) }));

    // LE MODE EST CELUI DE TOUTE LA SÉANCE, et l'étiquette le dit. C'est le
    // seul réglage de cette ligne qui déborde de la sélection ; le cacher
    // derrière « pour ces 3 étapes » aurait été un piège.
    const bloc = document.createElement('label');
    bloc.className = 'path-selection-champ path-selection-champ--mode';
    bloc.title = 'Le mode s\'applique à toute la séance : il décide des essais, '
        + 'des aides, de la correction et de la note.';
    const nom = document.createElement('span');
    nom.textContent = 'Mode (toute la séance)';
    const sel = document.createElement('select');
    sel.className = 'path-selection-select';
    [
        [MODES.ENTRAINEMENT, 'Entraînement'],
        [MODES.APPRENTISSAGE, 'Apprentissage'],
        [MODES.EVALUATION, 'Évaluation']
    ].forEach(([v, t]) => {
        const o = document.createElement('option');
        o.value = v; o.textContent = t;
        sel.appendChild(o);
    });
    sel.value = resolvePolicy(state.currentPath.policy).mode;
    sel.onchange = () => {
        sel.blur();
        state.currentPath.policy = resolvePolicy({
            ...resolvePolicy(state.currentPath.policy), mode: sel.value
        });
        renderTeacherPath();
    };
    bloc.appendChild(nom);
    bloc.appendChild(sel);
    ligne.appendChild(bloc);

    return ligne;
}

// --- Ce que dure une étape ---------------------------------------------------
//
// La NATURE de l'exercice décide de l'ordre de grandeur : un réflexe se répond
// vite — c'est le but même d'un réflexe —, une notion demande de lire, de poser
// et de vérifier, un jeu autonome ne se compte pas en questions.

/** « 6ème » → « 6ᵉ » : trois niveaux tiennent alors sur une étiquette. */
function abregerNiveau(n) {
    const m = /^(\d+)\s*ème$/.exec(n);
    return m ? `${m[1]}ᵉ` : n;
}

// Les mesures sont recalculées une fois par rendu et non par étape : le journal
// peut compter des dizaines de milliers d'événements.
let mesuresDuJournal = {};

function rafraichirLesMesures() {
    try {
        mesuresDuJournal = mesuresParExercice(state.attemptHistory || []);
    } catch (e) {
        mesuresDuJournal = {};
    }
}

function dureeDeLEtape(exo, step) {
    return estimerEtape(
        { nature: natureDe(exo), questions: step.nbItems || 10 },
        mesuresDuJournal[exo.id]
    );
}

/**
 * La bande de progression d'une étape, en miniature — ou `null` si l'exercice
 * n'a pas d'aide réglable (une grille de sudoku n'a ni propositions ni
 * clavier, et une bande vide ne dirait rien).
 */
function miniBande(exo, step) {
    if (!aApercuAide(paramSchemaOf(exo))) return null;
    const total = Math.max(1, step.nbItems || 10);
    const params = { ...(exo.params || {}), ...(step.overrides || {}) };
    const ecrites = lireZones(params, total);
    const zones = ecrites || normaliserZones(zonesDuMode(params, total), total);
    const el = document.createElement('span');
    el.className = 'pstep-bande' + (ecrites ? '' : ' pstep-bande--auto');
    el.title = ecrites
        ? zones.map(z => `${z.n} × ${modeZone(z.mode).nom.toLowerCase()}`).join(', ')
        : 'L\'exercice s\'adapte à chaque élève — voici un déroulé possible.';
    el.innerHTML = zones
        .map(z => `<i class="pstep-z pstep-z--${modeZone(z.mode).cle}" style="flex-grow:${z.n}"></i>`)
        .join('');
    return el;
}

function stepRow(step, index, policy) {
    const exo = getExerciseById(step.exerciseId);
    const row = document.createElement('div');
    row.className = 'path-step' + (step.stepId === selectedStepId ? ' path-step--selected' : '');
    row.draggable = true;
    row.dataset.stepId = step.stepId;

    row.ondragstart = (e) => { e.dataTransfer.setData('text/reorder', index); row.style.opacity = '0.5'; };
    row.ondragend = () => { row.style.opacity = '1'; };
    row.onclick = () => selectStep(step.stepId);

    if (!exo) {
        row.classList.add('path-step--broken');
        row.innerHTML = `<div class="path-step-title">${index + 1}. Exercice introuvable
            <code>${escapeHtml(step.exerciseId)}</code></div>`;
        const del = iconButton('Supprimer', ICONS.trash, 'danger');
        del.onclick = (e) => { e.stopPropagation(); removeStep(step.stepId); };
        row.appendChild(del);
        return row;
    }

    // Une SEULE ligne par étape : titre tronqué, règle en abrégé, actions.
    // Le détail complet reste lisible dans le panneau de propriétés — la
    // colonne du milieu, elle, doit montrer beaucoup d'étapes d'un coup d'œil.
    const head = document.createElement('div');
    head.className = 'path-step-head';

    const title = document.createElement('div');
    title.className = 'path-step-title';
    // LE CADEAU SE VOIT DANS LA LISTE, pas seulement dans le panneau. Rémy, sur
    // sa séance : « je n'étais pas au courant que j'avais eu un exercice
    // récompense ». Le professeur non plus ne le voyait pas : la case « Jeu de
    // récompense » se coche dans les propriétés, et rien n'en restait sur la
    // ligne — une séance de huit étapes ne disait plus laquelle était le jeu.
    if (step.bonus) row.classList.add('path-step--bonus');
    // UNE ÉTAPE FACULTATIVE SE VOIT AUSSI DANS LA LISTE, et pour la même raison
    // que le cadeau : c'est un réglage qui change ce que l'élève reçoit, et le
    // laisser caché dans un panneau, c'est le perdre de vue.
    if (step.facultatif && !step.bonus) row.classList.add('path-step--facultatif');
    title.innerHTML = `<span class="path-step-grip" aria-hidden="true">☰</span>`
        + (step.bonus ? '<span class="path-step-cadeau" title="Jeu de récompense : '
            + 'il ne compte pas dans la note et s\'ouvre quand le travail qui le '
            + 'précède est réussi.">🎁</span>' : '')
        + (step.facultatif && !step.bonus
            ? '<span class="path-step-facult" title="Non obligatoire : elle s\'ouvre quand '
              + 'le travail obligatoire qui la précède est réussi, mais l\'élève peut passer '
              + 'à la suite sans la faire.">facultative</span>' : '')
        + `<span class="path-step-name">${index + 1}. ${escapeHtml(exo.title)}</span>`;
    title.title = step.bonus ? `${exo.title} — jeu de récompense`
        : (step.facultatif ? `${exo.title} — non obligatoire` : exo.title);

    // LA CASE DE SÉLECTION EST DEVANT LE TITRE, comme dans toutes les listes
    // qu'on trie. Elle ne sélectionne pas l'étape au sens du panneau de
    // propriétés — c'est un autre geste, et le clic ne doit pas se propager.
    const case_ = document.createElement('input');
    case_.type = 'checkbox';
    case_.className = 'path-step-case';
    case_.checked = coches.has(step.stepId);
    case_.setAttribute('aria-label', `Sélectionner ${exo.title}`);
    case_.onclick = (e) => e.stopPropagation();
    case_.onchange = () => {
        if (case_.checked) coches.add(step.stepId); else coches.delete(step.stepId);
        majBarreSelection();
    };
    head.appendChild(case_);
    head.appendChild(title);

    const seuil = step.threshold ?? step.nbItems;
    // « ✔ 7/10 » et non « 7/10 » sec : sans un mot ni un signe, on ne savait
    // pas si le chiffre parlait de questions, de points ou d'un niveau.
    //
    // Le seuil est SÉPARÉ du reste. C'est la seule information qu'on relit en
    // parcourant la liste, et sur téléphone elle doit tenir sur la ligne du
    // titre — chronomètre et barème, eux, attendent le dépliage.
    const extras = [];
    if (step.timeLimit) extras.push(`⏱ ${step.timeLimit} s`);
    if (policy.grading && step.weight > 1) extras.push(`barème ×${step.weight}`);

    const rule = document.createElement('span');
    rule.className = 'path-step-rule';
    rule.title = `${seuil} bonne${seuil > 1 ? 's' : ''} réponse${seuil > 1 ? 's' : ''} exigée${seuil > 1 ? 's' : ''} sur ${step.nbItems}`
        + (step.timeLimit ? ` • chronomètre ${step.timeLimit} s` : '')
        + (policy.grading && step.weight > 1 ? ` • poids ×${step.weight} dans la note` : '');
    rule.innerHTML = `<b class="path-step-seuil">✔ ${seuil}/${step.nbItems}</b>`
        + (extras.length ? `<span class="path-step-extras"> • ${escapeHtml(extras.join(' • '))}</span>` : '');
    head.appendChild(rule);

    // SOUS LE TITRE, DE QUOI RECONNAÎTRE L'ÉTAPE SANS L'OUVRIR : son niveau,
    // son chapitre, et le temps qu'elle prendra. Une liste de vingt lignes qui
    // ne portent qu'un titre et « 7/10 » ne se relit pas — on ne sait ni ce
    // qu'on a mis, ni si la séance tient dans l'heure.
    const niveaux = (exo.tags && exo.tags.niveaux) || [];
    // Un même chapitre existe dans deux progressions — « Divisions » en 6ᵉ et
    // en 5ᵉ. Les afficher tous deux donnait « Divisions · Divisions », ce qui
    // ne dit rien de plus et se lit comme un bogue.
    const chapitres = [];
    chapitresDe(exo)
        .filter(c => !niveaux.length || niveaux.includes(c.niveau))
        .forEach(c => { if (!chapitres.some(x => x.nom === c.nom)) chapitres.push(c); });
    const duree = dureeDeLEtape(exo, step);

    const dessous = document.createElement('div');
    dessous.className = 'path-step-meta';
    const morceaux = [];
    if (niveaux.length) {
        morceaux.push(`<span class="pstep-niveau" title="${escapeHtml(niveaux.join(', '))}">`
            + `${escapeHtml(niveaux.map(abregerNiveau).join(' · '))}</span>`);
    }
    chapitres.slice(0, 2).forEach(c =>
        morceaux.push(`<span class="pstep-chap">${escapeHtml(c.nom)}</span>`));
    if (!chapitres.length) morceaux.push('<span class="pstep-chap pstep-chap--vide">hors chapitre</span>');
    morceaux.push(`<span class="pstep-duree${duree.mesure ? ' pstep-duree--mesure' : ''}"`
        + ` title="${duree.mesure
            ? 'Mesuré sur les réponses déjà enregistrées, et non estimé.'
            : 'Estimation d\'après la nature de l\'exercice.'}">`
        + `${duree.mesure ? '' : '≈ '}${escapeHtml(direDuree(duree.min, duree.max))}</span>`);
    dessous.innerHTML = morceaux.join('');

    // LA BANDE, EN MINIATURE, SUR LA LIGNE DE L'ÉTAPE.
    //
    // Rémy : « chaque étape est présentée en ligne. Et en dessous on a une
    // ligne avec la structure de l'exercice. »
    //
    // C'est la même bande que dans le panneau, réduite à quatre pixels de haut.
    // Elle ne se règle pas ici — on l'ouvre pour cela —, mais elle rend la
    // FORME du parcours lisible d'un seul regard : on voit d'un coup qu'une
    // étape laisse l'élève au clavier du début à la fin pendant que la
    // précédente l'accompagne, ce qu'aucune ligne de texte ne dit aussi vite.
    const bande = miniBande(exo, step);
    if (bande) dessous.appendChild(bande);

    const actions = document.createElement('div');
    actions.className = 'path-step-actions';

    const preview = iconButton('Aperçu', ICONS.eye);
    preview.onclick = (e) => { e.stopPropagation(); testStep(index); };

    const props = iconButton('Propriétés', ICONS.gear);
    props.onclick = (e) => { e.stopPropagation(); selectStep(step.stepId); };

    const dup = iconButton('Dupliquer', ICONS.copy);
    dup.onclick = (e) => { e.stopPropagation(); duplicateStep(step.stepId); };

    const del = iconButton('Supprimer', ICONS.trash, 'danger');
    del.onclick = (e) => { e.stopPropagation(); removeStep(step.stepId); };

    [preview, props, dup, del].forEach(b => actions.appendChild(b));

    // Chevron de dépliage — visible seulement sur téléphone.
    //
    // Sur un écran de 390 px, les quatre boutons d'action et la règle prenaient
    // toute la ligne : il ne restait que trois caractères au titre, et on lisait
    // « 1. Li… » sans savoir de quelle activité il s'agissait. Le titre passe
    // donc SEUL sur la première ligne, en entier ; les actions (aperçu,
    // réglages, duplication, suppression) se déplient sous lui à la demande.
    const toggle = iconButton('Afficher les options de l\'étape', ICONS.chevron);
    toggle.classList.add('path-step-toggle');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.onclick = (e) => {
        e.stopPropagation();
        const ouvert = row.classList.toggle('path-step--ouvert');
        toggle.setAttribute('aria-expanded', String(ouvert));
        toggle.setAttribute('aria-label', ouvert
            ? 'Masquer les options de l\'étape' : 'Afficher les options de l\'étape');
    };
    head.appendChild(toggle);
    head.appendChild(actions);
    row.appendChild(head);
    row.appendChild(dessous);
    // La couleur du liseré dit le DOMAINE : dans une liste de vingt étapes,
    // c'est ce qui montre d'un coup d'œil qu'on a empilé six exercices de
    // calcul et aucun de géométrie.
    row.dataset.domaine = (exo.tags && exo.tags.chemin && exo.tags.chemin[0]) || '';

    return row;
}

// --- Sélection et propriétés ------------------------------------------------

export function selectStep(stepId) {
    const step = state.currentPath.steps.find(s => s.stepId === stepId);
    if (!step) return;
    selectedStepId = stepId;

    const panel = document.getElementById('builder-properties-panel');
    if (!panel) return;

    panel.innerHTML = `
        <button id="mob-close-props" class="props-close" aria-label="Fermer les propriétés">✕</button>
        <h3 class="props-title">Propriétés de l'étape</h3>
        <div id="builder-config-content"></div>`;
    panel.classList.add('mob-open');

    const close = document.getElementById('mob-close-props');
    if (close) close.onclick = () => panel.classList.remove('mob-open');

    // LE MODE DU PARCOURS VOYAGE AVEC L'ÉTAPE. En évaluation, « bonnes réponses
    // exigées » n'a pas de sens — une interrogation se note, elle ne se valide
    // pas —, et le panneau retire la poignée du seuil.
    renderGameConfigUI(step, (updated) => {
        const i = state.currentPath.steps.findIndex(s => s.stepId === stepId);
        if (i !== -1) {
            state.currentPath.steps[i] = updated;
            renderTeacherPath();
        }
    }, 'builder-config-content', {
        mode: (state.currentPath && state.currentPath.policy && state.currentPath.policy.mode) || null
    });

    document.querySelectorAll('.path-step').forEach(el => {
        el.classList.toggle('path-step--selected', el.dataset.stepId === stepId);
    });
}

export function removeStep(stepId) {
    state.currentPath.steps = state.currentPath.steps.filter(s => s.stepId !== stepId);
    if (selectedStepId === stepId) selectedStepId = null;
    renderTeacherPath();
}

export function duplicateStep(stepId) {
    const steps = state.currentPath.steps;
    const i = steps.findIndex(s => s.stepId === stepId);
    if (i === -1) return;
    const clone = { ...steps[i], stepId: makeStep(steps[i].exerciseId).stepId, overrides: { ...steps[i].overrides } };
    steps.splice(i + 1, 0, clone);
    renderTeacherPath();
}

// --- Politique du parcours --------------------------------------------------

function initPolicyPanel() {
    const btn = document.getElementById('btn-path-policy');
    const modal = document.getElementById('path-policy-modal');
    if (!btn || !modal) return;

    btn.onclick = () => {
        renderPolicyEditor(state.currentPath, (policy) => {
            state.currentPath.policy = policy;
            renderTeacherPath();
        });
        modal.style.display = 'flex';
    };
    const fermer = () => { modal.style.display = 'none'; };
    const close = document.getElementById('btn-close-path-policy');
    if (close) close.onclick = fermer;
    const ok = document.getElementById('btn-valider-path-policy');
    if (ok) ok.onclick = fermer;
}

// --- Barre d'outils ---------------------------------------------------------

function initNameInput() {
    const input = document.getElementById('path-name-input');
    if (!input) return;
    input.onclick = (e) => e.stopPropagation();
    input.oninput = () => {
        state.currentPath.name = input.value.trim() || 'Mon Parcours';
        autoSavePath();
    };
}

function initPreviewModes() {
    state.previewDeviceMode = 'mobile';
    document.querySelectorAll('.preview-mode-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.preview-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.previewDeviceMode = btn.id.replace('preview-mode-', '');
        };
    });

    const toggleHeader = document.getElementById('path-header-toggle');
    const wrapper = document.getElementById('path-collapsible-wrapper');
    const icon = document.getElementById('path-toggle-icon');
    if (toggleHeader && wrapper && icon) {
        toggleHeader.addEventListener('click', (e) => {
            if (!document.body.classList.contains('mobile-view')) return;
            // Les outils de la barre (✨ 📂 🎓 🔄 🔐, Tester, Code Élève…)
            // vivent DANS cet en-tête repliable. Sans ce filtre, ouvrir « Mes
            // parcours » repliait la liste au passage : on refermait la fenêtre
            // et le parcours en cours avait disparu — il fallait retoucher
            // l'icône pour le faire revenir.
            if (e.target.closest('button, input, select, textarea, a, label')) return;
            const hidden = wrapper.style.display === 'none';
            wrapper.style.display = hidden ? 'block' : 'none';
            icon.style.transform = hidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }
}

function previewMode() {
    if (document.body.classList.contains('mobile-view')) return 'none';
    return state.previewDeviceMode === 'desktop' ? 'none' : state.previewDeviceMode;
}

async function runPath(path, deviceMode, startIndex = 0) {
    const { Runner } = await import('../core/runner.js');
    new Runner({
        path,
        deviceMode,
        startIndex,
        // Le professeur teste son parcours : il doit pouvoir circuler entre les
        // activités sans avoir à les réussir une par une.
        allowStepNavigation: true
    }).start();
}

// L'aperçu d'une étape ouvre le parcours complet positionné sur celle-ci,
// plutôt qu'un parcours réduit : le professeur peut ainsi enchaîner sur les
// activités voisines pour vérifier la progression.
function testStep(index) {
    if (!state.currentPath.steps[index]) return;
    runPath(state.currentPath, previewMode(), index);
}

function initToolbar() {
    const btnTest = document.getElementById('btn-test-sequence');
    if (btnTest) {
        btnTest.onclick = () => {
            if (!state.currentPath.steps.length) {
                showAlert('Ajoutez au moins une activité pour tester le parcours.');
                return;
            }
            runPath(state.currentPath, previewMode());
        };
    }

    const btnFiche = document.getElementById('btn-fiche-parcours');
    if (btnFiche) {
        btnFiche.onclick = () => {
            if (!state.currentPath.steps.length) {
                showAlert('Ajoutez au moins une activité pour imprimer une fiche.');
                return;
            }
            import('./printParcours.js').then(m => m.ouvrirFicheParcours(state.currentPath));
        };
    }

    const btnCode = document.getElementById('btn-generate-code');
    if (btnCode) {
        btnCode.onclick = async () => {
            if (!state.currentPath.steps.length) {
                showAlert('Ajoutez au moins une activité pour générer un code.');
                return;
            }
            // LE CODE COURT SE DIT À VOIX HAUTE. Trois lettres par exercice,
            // et le nombre de questions à la suite quand le professeur l'a
            // choisi : « ARF-12-TPW-20 » pour deux exercices, treize
            // caractères là où le format complet en demandait 161. C'est
            // celui qu'on écrit au tableau pour les devoirs. On le MONTRE
            // toujours, même quand le lien part au presse-papiers — un élève
            // qui n'a pas le lien doit pouvoir taper le code.
            const code = Shortcodes.encodePath(state.currentPath);
            const court = !code.startsWith('M2-');
            // ET QUAND LE CODE EST LONG, ON DIT POURQUOI. Rémy : « pour le lien
            // donné dans la partie prof, j'ai du mal à comprendre quand est-ce
            // que tu utilises le code court et le code long ». La règle
            // existait, elle n'était écrite nulle part où il puisse la lire :
            // le bouton disait « Lien copié » et se taisait. Or elle est
            // simple — le code court ne sait dicter que des exercices pris tels
            // quels, avec leur nombre de questions ; tout le reste doit voyager
            // en entier. Chaque chose qui l'empêche est maintenant nommée, et
            // le professeur voit du même coup ce qu'il aurait à défaire pour
            // obtenir un code qui se dicte.
            const raisons = court ? [] : Shortcodes.raisonsDuCodeLong(state.currentPath);
            try {
                await navigator.clipboard.writeText(Shortcodes.shareUrl(state.currentPath));
                showToast(court ? `Lien copié — code à dicter : ${code}`
                    : 'Lien copié — code long (le parcours a des réglages)', 'success');
                if (court) showAlert(`Code à dicter : <b style="font-size:1.6em">${code}</b>`
                    + `<br><br>${code.length} caractères, à taper dans « J'ai un code ». `
                    + 'Chaque groupe de trois lettres est un exercice, et la '
                    + 'troisième vérifie les deux autres : si l\'élève en '
                    + 'recopie une de travers, le code est refusé plutôt que de '
                    + 'lui ouvrir autre chose.'
                    + '<br>Le lien est aussi dans le presse-papiers.');
                else showAlert('<b>Le lien est copié, mais il n\'y a pas de code à dicter '
                    + 'pour ce parcours.</b>'
                    + '<br><br>Un code court ne sait dire que ceci : des exercices, dans un '
                    + 'ordre, avec leur nombre de questions — tout le reste au réglage '
                    + 'd\'usine. Dès qu\'un réglage doit voyager, il faut le lien entier, '
                    + 'sans quoi l\'élève recevrait autre chose que ce que vous avez préparé.'
                    + '<br><br>Ici, ce qui l\'empêche :<ul style="text-align:left;margin:6px 0 0 1em">'
                    + raisons.map(r => `<li>${r}</li>`).join('') + '</ul>');
            } catch (e) {
                showAlert(`Code du parcours :\n\n${code}`);
            }
        };
    }

    const btnNew = document.getElementById('btn-new-path');
    if (btnNew) {
        const repartirDeZero = () => {
            state.currentPath = { id: null, version: 2, name: 'Nouveau parcours', policy: resolvePolicy(null), steps: [] };
            state.currentPathId = null;
            selectedStepId = null;
            const input = document.getElementById('path-name-input');
            if (input) input.value = state.currentPath.name;
            renderTeacherPath();
        };
        // « Nouveau parcours » VIDE la table de travail. Ce n'est pas rien :
        // sans un mot, on croit avoir perdu ce qu'on venait de composer. On le
        // demande donc — en rappelant au passage que le parcours en cours est
        // déjà enregistré et se retrouve dans « Mes Parcours ».
        btnNew.onclick = () => {
            const n = state.currentPath.steps.length;
            if (!n) return repartirDeZero();
            const nom = state.currentPath.name || 'Le parcours en cours';
            showConfirm(
                `Commencer un nouveau parcours, vide ?<br><br>`
                + `« ${escapeHtml(nom)} » (${n} activité${n > 1 ? 's' : ''}) est enregistré : `
                + `vous le retrouverez dans <b>Mes Parcours</b> 📂.`,
                repartirDeZero
            );
        };
    }
}

export function autoSavePath() {
    if (!state.currentPath.steps.length && !state.currentPathId) {
        direLEtat(null);
        return;
    }
    const snapshot = JSON.parse(JSON.stringify(state.currentPath));
    if (!state.currentPathId) {
        const saved = state.saveTeacherPath(state.currentPath.name, snapshot);
        state.currentPathId = saved.id;
    } else {
        state.updateTeacherPath(state.currentPathId, state.currentPath.name, snapshot);
    }
    direLEtat(new Date());
}

/**
 * DIRE QUE C'EST ENREGISTRÉ.
 *
 * Le parcours était déjà sauvegardé à chaque modification — mais rien ne le
 * disait. Devant « Mon Parcours », on ne pouvait pas distinguer un travail à
 * l'abri d'un brouillon qui va disparaître au prochain onglet fermé, et l'on
 * n'ose pas fermer ce dont on n'est pas sûr.
 */
function direLEtat(quand) {
    const el = document.getElementById('path-etat');
    if (!el) return;
    if (!quand) {
        el.textContent = 'Brouillon';
        el.className = 'path-etat path-etat--brouillon';
        el.title = 'Ce parcours sera enregistré dès qu\'il aura une activité.';
        return;
    }
    const heure = `${String(quand.getHours()).padStart(2, '0')}:${String(quand.getMinutes()).padStart(2, '0')}`;
    el.textContent = `Enregistré ${heure}`;
    el.className = 'path-etat path-etat--ok';
    el.title = 'Enregistré sur ce poste, et retrouvable dans « Mes parcours ».';
    // Un bref éclat : c'est ce qui fait comprendre que la mention vient de
    // changer, sans quoi elle se confond avec le décor.
    el.classList.remove('path-etat--eclat');
    void el.offsetWidth;
    el.classList.add('path-etat--eclat');
}

// --- Navigateur de parcours -------------------------------------------------

function initPathBrowser() {
    const btnOpen = document.getElementById('btn-open-path-browser');
    const modal = document.getElementById('path-browser-modal');
    if (btnOpen && modal) {
        btnOpen.onclick = () => { renderPathBrowser(); modal.style.display = 'flex'; };
        const close = document.getElementById('btn-close-path-browser');
        if (close) close.onclick = () => { modal.style.display = 'none'; };
    }

    const btnFolder = document.getElementById('btn-new-folder');
    if (btnFolder) {
        btnFolder.onclick = () => { state.addTeacherFolder('Nouveau dossier'); renderPathBrowser(); };
    }
}

export function renderPathBrowser() {
    const list = document.getElementById('path-browser-list');
    if (!list) return;
    list.innerHTML = '';

    (state.teacherFolders || []).forEach(folder => {
        list.appendChild(folderBlock(folder));
    });

    const rootPaths = state.teacherPaths.filter(p => !p.folderId || p.folderId === 'root');
    const rootBlock = document.createElement('div');
    rootBlock.className = 'path-browser-root';
    rootBlock.ondragover = dragOver;
    rootBlock.ondragleave = dragLeave;
    rootBlock.ondrop = (e) => dropOnFolder(e, 'root');
    rootBlock.innerHTML = '<div class="path-browser-root-title">Parcours (racine)</div>';
    rootPaths.forEach(p => rootBlock.appendChild(pathItem(p)));
    list.appendChild(rootBlock);

    if (!state.teacherPaths.length && !(state.teacherFolders || []).length) {
        list.innerHTML = '<div class="empty-state-msg">Aucun parcours enregistré.</div>';
    }
}

function folderBlock(folder) {
    const box = document.createElement('div');
    box.className = 'path-folder';
    box.ondragover = dragOver;
    box.ondragleave = dragLeave;
    box.ondrop = (e) => dropOnFolder(e, folder.id);

    const head = document.createElement('div');
    head.className = 'path-folder-head';

    const name = document.createElement('div');
    name.className = 'path-folder-name';
    name.contentEditable = 'true';
    name.textContent = folder.name;
    name.onblur = () => state.renameTeacherFolder(folder.id, name.textContent.trim());
    name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } };

    const del = iconButton('Supprimer le dossier', ICONS.trash, 'danger');
    del.onclick = () => window.appConfirm('Suppression', 'Supprimer ce dossier ? Les parcours reviennent à la racine.', () => {
        state.removeTeacherFolder(folder.id);
        renderPathBrowser();
    });

    head.append(name, del);
    box.appendChild(head);

    const inner = document.createElement('div');
    inner.className = 'path-folder-body';
    const paths = state.teacherPaths.filter(p => p.folderId === folder.id);
    if (!paths.length) inner.innerHTML = '<div class="path-folder-empty">Dossier vide (glissez des parcours ici)</div>';
    paths.forEach(p => inner.appendChild(pathItem(p)));
    box.appendChild(inner);
    return box;
}

function pathItem(p) {
    const normalized = normalizePath(p.data, p.name);
    const policy = resolvePolicy(normalized.policy);
    const row = document.createElement('div');
    row.className = 'path-browser-item';
    row.draggable = true;
    row.ondragstart = (e) => { e.dataTransfer.setData('text/plain', p.id); row.style.opacity = '0.5'; };
    row.ondragend = () => { row.style.opacity = '1'; };

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'path-browser-name';
    name.contentEditable = 'true';
    name.textContent = p.name;
    name.onblur = () => state.updateTeacherPath(p.id, name.textContent.trim(), null);
    name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } };

    const sub = document.createElement('div');
    sub.className = 'path-browser-sub';
    sub.textContent = `${normalized.steps.length} activités • ${isEvaluation(policy) ? 'Évaluation' : 'Entraînement'} • ${new Date(p.timestamp).toLocaleDateString()}`;

    info.append(name, sub);

    const actions = document.createElement('div');
    actions.className = 'path-browser-actions';

    const share = iconButton('Partager', ICONS.share, 'primary');
    share.onclick = async () => {
        try {
            await navigator.clipboard.writeText(Shortcodes.shareUrl(normalized));
            showToast('Lien de partage copié !', 'success');
        } catch (e) {
            showAlert(`Code : ${Shortcodes.encodePath(normalized)}`);
        }
    };

    const load = document.createElement('button');
    load.className = 'btn-toggle glass-btn primary btn-toggle--sm';
    load.textContent = 'Charger';
    load.onclick = () => {
        state.currentPathId = p.id;
        state.currentPath = normalizePath(p.data, p.name);
        selectedStepId = null;
        const input = document.getElementById('path-name-input');
        if (input) input.value = state.currentPath.name;
        renderTeacherPath();
        document.getElementById('path-browser-modal').style.display = 'none';
    };

    const del = iconButton('Supprimer', ICONS.trash, 'danger');
    del.onclick = () => window.appConfirm('Suppression', 'Supprimer ce parcours définitivement ?', () => {
        state.removeTeacherPath(p.id);
        renderPathBrowser();
    });

    actions.append(share, load, del);
    row.append(info, actions);
    return row;
}

function dragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drop-target'); }
function dragLeave(e) { e.currentTarget.classList.remove('drop-target'); }
function dropOnFolder(e, folderId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-target');
    const pathId = e.dataTransfer.getData('text/plain');
    if (pathId && state.teacherPaths.some(p => p.id === pathId)) {
        state.moveTeacherPath(pathId, folderId);
        renderPathBrowser();
    }
}

// --- Utilitaires ------------------------------------------------------------

const ICONS = {
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
    chevron: '<polyline points="6 9 12 15 18 9"/>'
};

function iconButton(title, paths, variant) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-icon' + (variant ? ` btn-icon--${variant}` : '');
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    return btn;
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
