import { exercices, domaines, filterByStatus, statusOf, STATUS, STATUS_LABELS } from '../data/catalog.js';
import { clearEngines } from '../core/timers.js';
import { state } from '../core/state.js';
import { launchPreview, openGameLayer } from '../games/engine.js';

export function createLibraryItem(exo) {
    const item = document.createElement('div');
    item.className = 'exo-list-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = exo.title;
    item.appendChild(titleSpan);

    const btnAdd = document.createElement('button');
    btnAdd.textContent = '➕';
    btnAdd.className = 'teacher-only';
    btnAdd.title = 'Ajouter au parcours';
    btnAdd.setAttribute('aria-label', `Ajouter ${exo.title} au parcours`);
    btnAdd.style.background = 'none';
    btnAdd.style.border = 'none';
    btnAdd.style.cursor = 'pointer';
    btnAdd.style.fontSize = '1.2rem';

    btnAdd.onclick = (e) => {
        e.stopPropagation();
        if (!state.isTeacherMode) return;
        // Une étape est une référence à l'exercice, pas une copie de celui-ci.
        import('./builder.js').then(module => module.addStep(exo.id));
    };
    item.appendChild(btnAdd);

    // Interaction Éditeur vs Élève
    item.draggable = true;
    item.ondragstart = (e) => {
        if(!state.isTeacherMode) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', exo.id);
        clearEngines(); document.getElementById('hover-demo-box').style.display = 'none';
    };

    // Long press logic for mobile preview
    let touchTimer;
    item.ontouchstart = () => {
        if(!state.isTeacherMode) return;
        touchTimer = setTimeout(() => openGameLayer(exo, true), 500);
    };
    item.ontouchend = () => clearTimeout(touchTimer);
    item.ontouchmove = () => clearTimeout(touchTimer);

    item.onclick = () => {
        if(!state.isTeacherMode) {
            // Clic Élève = Ouvre le jeu en plein écran, MODE JOUABLE FIRST
            openGameLayer(exo, false);
        }
    };

    // Hover -> Auto Demo Teacher (Desktop)
    let hoverTimer;
    item.onmouseenter = (e) => {
        if(!state.isTeacherMode) return;
        hoverTimer = setTimeout(() => {
            const hdBox = document.getElementById('hover-demo-box');
            document.getElementById('hd-title').textContent = exo.title;
            
            // Positionnement intelligent
            const rect = item.getBoundingClientRect();
            const hdHeight = 280; // Correspond au css height
            let topPos = rect.top - 20;
            
            // Si ça dépasse en bas
            if (topPos + hdHeight > window.innerHeight) {
                topPos = window.innerHeight - hdHeight - 20;
            }
            // Si ça dépasse en haut
            if (topPos < 20) topPos = 20;

            hdBox.style.top = `${topPos}px`;
            hdBox.style.left = `${rect.right + 20}px`;
            hdBox.style.display = 'flex';

            // Aperçu autonome dans la vignette : aucune donnée n'est enregistrée.
            launchPreview(exo, document.getElementById('hover-demo-canvas'));
        }, 500);
    };

    item.onmouseleave = () => {
        clearTimeout(hoverTimer);
        document.getElementById('hover-demo-box').style.display = 'none';
        clearEngines(); // Stoppe la démo en cours
    };

    return item;
}

/**
 * Pastille d'état, affichée uniquement quand elle apprend quelque chose :
 * en mode professeur, ou quand un filtre d'état est actif. Un élève n'a pas
 * à savoir qu'un exercice est « validé ».
 */
function statusBadge(exo) {
    const s = statusOf(exo);
    const utile = state.isTeacherMode || (state.catalogFilter && state.catalogFilter !== 'tout');
    if (!utile || s === STATUS.VALIDE) return '';
    return `<span class="tag tag-btn tag-status tag-status--${s}">${STATUS_LABELS[s]}</span>`;
}

function matchesSearch(exo, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return true;
    const haystack = [exo.title, ...(exo.tags.chemin || []), ...(exo.tags.niveaux || [])].join(' ').toLowerCase();
    return haystack.includes(q);
}

export function getFilteredExercises() {
    // L'état de publication filtre en premier : un brouillon ne doit
    // apparaître nulle part, pas même dans une recherche.
    let list = filterByStatus(exercices, {
        only: state.catalogFilter,
        teacher: state.isTeacherMode
    });
    if (state.selectedNiveaux && state.selectedNiveaux.length > 0) {
        list = list.filter(e => e.tags.niveaux && e.tags.niveaux.some(n => state.selectedNiveaux.includes(n)));
    }
    if (state.searchQuery) {
        list = list.filter(e => matchesSearch(e, state.searchQuery));
    }
    return list;
}

export function initSidebarSearch() {
    const input = document.getElementById('sidebar-search-input');
    if (!input) return;
    input.oninput = () => {
        state.searchQuery = input.value;
        initAccordion();
        renderDrilldown();
        initGridFilters();
    };
}

// Un exercice "appartient" au noeud `path` si les premiers segments de son
// chemin correspondent exactement à `path`. Selon la longueur de son chemin,
// il est soit une feuille de ce noeud (chemin.length === path.length), soit
// rangé dans un sous-dossier plus profond (chemin[path.length] donne son nom).
function matchesPath(exo, path) {
    return path.every((v, i) => exo.tags.chemin[i] === v);
}

function getNodeLeaves(filtered, path) {
    return filtered.filter(e => matchesPath(e, path) && e.tags.chemin.length === path.length);
}

function getNodeSubKeys(filtered, path) {
    return [...new Set(
        filtered
            .filter(e => matchesPath(e, path) && e.tags.chemin.length > path.length)
            .map(e => e.tags.chemin[path.length])
    )].sort();
}

export function initAccordion() {
    const acc = document.getElementById('view-accordion');

    // Capture open states before clearing (par chemin complet, quelle que soit la profondeur)
    const openPaths = new Set();
    acc.querySelectorAll('details[open]').forEach(det => {
        if (det.dataset.path) openPaths.add(det.dataset.path);
    });

    acc.innerHTML = '';
    const filtered = getFilteredExercises();

    const renderNode = (container, path) => {
        getNodeLeaves(filtered, path).forEach(exo => container.appendChild(createLibraryItem(exo)));

        getNodeSubKeys(filtered, path).forEach(key => {
            const childPath = [...path, key];
            const pathKey = childPath.join(' > ');
            const det = document.createElement('details');
            det.dataset.path = pathKey;
            if (path.length > 0) det.className = 'sub-details';
            if (openPaths.has(pathKey)) det.open = true;
            det.innerHTML = `<summary><span class="custom-chevron"></span>${key}</summary>`;
            // Sur le clic, et non sur `toggle` : restaurer les dossiers ouverts
            // après un filtrage émet des `toggle` en série, qui feraient
            // dériver le dossier courant sans que personne n'ait rien demandé.
            det.querySelector('summary').onclick = () => {
                if (det.open) return;   // le clic précède l'ouverture
                state.navStack = childPath.slice();
                syncGridToSidebar();
            };
            renderNode(det, childPath);
            container.appendChild(det);
        });
    };

    renderNode(acc, []);
}

/**
 * Répercute sur la grille le dossier ouvert à gauche.
 *
 * Sans garde, un clic dans la barre latérale du professeur reconstruirait une
 * grille d'élève masquée — travail inutile qui casserait au passage les
 * aperçus en cours.
 */
export function syncGridToSidebar() {
    const wrapper = document.getElementById('main-wrapper');
    if (!wrapper || wrapper.style.display === 'none' || state.isTeacherMode) return;
    initGridFilters();
}

export function renderDrilldown() {
    const content = document.getElementById('drill-content'); content.innerHTML = '';
    const back = document.getElementById('btn-back'); const bread = document.getElementById('breadcrumb-text');
    const filtered = getFilteredExercises();
    const path = state.navStack;

    back.style.display = path.length === 0 ? 'none' : 'block';
    bread.textContent = path.length === 0 ? 'Domaines' : path[path.length - 1];

    getNodeSubKeys(filtered, path).forEach(key => {
        const b = document.createElement('button'); b.className = 'drill-item'; b.innerHTML = `<span>${key}</span><span>›</span>`;
        b.onclick = () => { state.navStack.push(key); renderDrilldown(); syncGridToSidebar(); };
        content.appendChild(b);
    });

    getNodeLeaves(filtered, path).forEach(exo => content.appendChild(createLibraryItem(exo)));
}

/**
 * Le chemin qui commande la grille.
 *
 * Sur téléphone, la barre latérale et la grille ne sont jamais visibles en même
 * temps : la grille doit y rester complète, sinon on ouvre le catalogue et il
 * paraît vide. Sur tablette et ordinateur, les deux se voient d'un coup d'œil,
 * et la grille sert alors le dossier ouvert à gauche.
 */
function gridPath() {
    // 700 px et non 768 : une tablette en portrait fait justement 768 de large,
    // et c'est un cas où le couplage est demandé. En dessous, on est sur un
    // téléphone, où la barre latérale recouvre la grille.
    const telephone = window.innerWidth <= 700
        || document.body.classList.contains('mobile-view');
    return telephone ? [] : state.navStack;
}

export function initGridFilters() {
    const fd = document.getElementById('filters-domaine');
    if (fd) fd.innerHTML = '';

    const filtered = getFilteredExercises();
    const path = gridPath();
    // Les exercices du dossier courant, sous-dossiers compris : plus on descend
    // à gauche, moins il en reste à droite.
    const dansLeDossier = filtered.filter(e => matchesPath(e, path));
    // Les tags proposés sont les sous-dossiers du niveau où l'on se trouve, pas
    // éternellement les trois domaines racine.
    const sousDossiers = getNodeSubKeys(filtered, path);
    let actifs = [];

    const renderCards = () => {
        // Sans restauration : les cartes vont être remplacées, remonter un
        // aperçu figé dans celle qu'on jette ne servirait qu'à le voir surgir
        // après coup dans le vide.
        stopCardDemo(false);
        const main = document.getElementById('main-content');
        main.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'grid-container';

        dansLeDossier
            .filter(exo => actifs.length === 0 || actifs.includes(exo.tags.chemin[path.length]))
            .forEach(exo => container.appendChild(createCard(exo)));

        main.appendChild(container);
        if (state.previewsOn) mountPreviews(container);
    };

    if (fd) {
        sousDossiers.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'tag-btn tag-domaine';
            btn.textContent = d;
            btn.onclick = () => {
                if (actifs.includes(d)) {
                    actifs = actifs.filter(x => x !== d);
                    btn.classList.remove('active');
                } else {
                    actifs.push(d);
                    btn.classList.add('active');
                }
                renderCards();
            };
            fd.appendChild(btn);
        });
        fd.appendChild(eyeButton(renderCards));
    }

    renderCards();
}

/* --- Aperçus dans les cartes --------------------------------
   Un titre et deux tags ne disent pas à quoi ressemble un exercice. L'œil
   allume, sur toutes les cartes à la fois, la première question réellement
   tirée : on choisit alors sur pièce, pas sur le nom. */

// Une seule démonstration tourne à la fois : elles partagent les minuteurs
// globaux, et quinze exercices animés côte à côte seraient illisibles autant
// que coûteux.
let demoEnCours = null;
// Le jeton invalide les démonstrations dont le module arrive après coup : le
// survol est rapide, et sans lui une carte quittée se remettait à jouer.
let demoJeton = 0;

function stopCardDemo(restaurer = true) {
    demoJeton++;
    const en = demoEnCours;
    demoEnCours = null;
    document.querySelectorAll('.card-preview--live')
        .forEach(b => b.classList.remove('card-preview--live'));
    if (en && en.handle && typeof en.handle.destroy === 'function') en.handle.destroy();
    clearEngines();
    // La carte reprend son aperçu figé, sinon elle reste sur l'image où la
    // démonstration s'est arrêtée.
    if (restaurer && en && en.box && en.box.isConnected) mountFrozen(en.exo, en.box);
}

function eyeButton(renderCards) {
    const btn = document.createElement('button');
    btn.className = 'tag-btn tag-eye';
    btn.type = 'button';
    const sync = () => {
        btn.classList.toggle('active', state.previewsOn);
        btn.setAttribute('aria-pressed', String(state.previewsOn));
        btn.title = state.previewsOn ? 'Masquer les aperçus' : 'Afficher un aperçu de chaque exercice';
        btn.setAttribute('aria-label', btn.title);
        btn.innerHTML = state.previewsOn ? EYE_OFF : EYE_ON;
    };
    btn.onclick = () => {
        state.previewsOn = !state.previewsOn;
        sync();
        renderCards();
    };
    sync();
    return btn;
}

const EYE_ON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

const EYE_OFF = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.4 18.4 0 0 1 5.1-6"/>
    <path d="M9.9 4.2A10.1 10.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2"/>
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const ICON_PLAY = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z"/></svg>`;

function createCard(exo) {
    const card = document.createElement('div');
    card.className = 'card';
    const niveauxStr = exo.tags.niveaux ? exo.tags.niveaux.join(' - ') : '';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = exo.title;
    card.appendChild(title);

    if (state.previewsOn) {
        const box = document.createElement('div');
        box.className = 'card-preview';
        box.dataset.preview = exo.id;
        // Le conteneur porte le nom `plateau` : les mises en page des activités
        // interrogent déjà cette place-là, la vignette hérite donc gratuitement
        // de leurs paliers de resserrement.
        const stage = document.createElement('div');
        stage.className = 'card-preview-stage';
        box.appendChild(stage);
        card.appendChild(box);
    }

    const tags = document.createElement('div');
    tags.className = 'card-tags';
    tags.innerHTML = `<span class="tag tag-btn tag-niveau">${niveauxStr}</span>
        <span class="tag tag-btn tag-domaine">${exo.tags.chemin[0]}</span>
        ${statusBadge(exo)}`;

    if (state.previewsOn) {
        // Au doigt, il n'y a pas de survol : le bouton lecture est le seul
        // moyen de déclencher la démonstration sur une tablette.
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'card-play';
        play.innerHTML = ICON_PLAY;
        play.title = 'Voir la démonstration';
        play.setAttribute('aria-label', `Voir la démonstration de ${exo.title}`);
        play.onclick = (e) => {
            e.stopPropagation();
            const box = card.querySelector('.card-preview');
            if (demoEnCours && demoEnCours.box === box) stopCardDemo();
            else startCardDemo(exo, box);
        };
        tags.appendChild(play);
    }
    card.appendChild(tags);

    card.onclick = () => openGameLayer(exo, false);

    if (state.previewsOn) {
        // Le survol anime, sans attendre : c'est un geste exploratoire, une
        // temporisation le rendrait capricieux.
        card.onmouseenter = () => {
            if (matchMedia('(hover: hover)').matches) startCardDemo(exo, card.querySelector('.card-preview'));
        };
        card.onmouseleave = () => {
            if (demoEnCours && demoEnCours.box === card.querySelector('.card-preview')) stopCardDemo();
        };
    }

    return card;
}

/**
 * Monte les aperçus figés l'un après l'autre.
 *
 * En série et non en parallèle : `launchPreview` coupe les minuteurs en vigueur
 * à chaque appel, donc deux montages simultanés se sabotent l'un l'autre.
 */
function mountPreviews(container) {
    const boxes = [...container.querySelectorAll('.card-preview')];
    const suivant = (i) => {
        if (i >= boxes.length || !container.isConnected) return;
        const exo = exercices.find(e => e.id === boxes[i].dataset.preview);
        const p = exo ? mountFrozen(exo, boxes[i]) : null;
        (p && p.then ? p : Promise.resolve()).then(() => suivant(i + 1));
    };
    suivant(0);
}

function mountFrozen(exo, box) {
    const stage = box.querySelector('.card-preview-stage') || box;
    const p = launchPreview(exo, stage, null, { frozen: true });
    return (p && p.then ? p : Promise.resolve()).then(() => fitPreview(box, stage));
}

/**
 * Met la question à l'échelle de la vignette.
 *
 * Les activités se dessinent pour un plateau de jeu ; aucune ne sait tenir dans
 * 170 pixels de haut, et leurs tailles minimales (des touches restent
 * atteignables au doigt) les empêchent de se réduire davantage. On les
 * photographie donc : rendu à taille normale, puis réduit d'un bloc.
 */
function fitPreview(box, stage) {
    stage.style.transform = 'none';
    const dispo = box.clientHeight;
    const haut = stage.scrollHeight;
    const large = stage.scrollWidth;
    if (!dispo || !haut) return;
    const k = Math.min(1, dispo / haut, box.clientWidth / Math.max(large, 1));
    stage.style.transform = `scale(${k.toFixed(3)})`;
    stage.style.height = `${haut}px`;
}

function startCardDemo(exo, box) {
    if (!box) return;
    if (demoEnCours && demoEnCours.box === box) return;
    stopCardDemo();
    const jeton = demoJeton;
    const stage = box.querySelector('.card-preview-stage') || box;
    box.classList.add('card-preview--live');
    const p = launchPreview(exo, stage);
    const enregistre = (handle) => {
        // Une démonstration a pu être arrêtée pendant le chargement du module.
        if (jeton !== demoJeton || !box.isConnected) {
            if (handle && handle.destroy) handle.destroy();
            return;
        }
        demoEnCours = { exo, box, handle };
        fitPreview(box, stage);
    };
    if (p && p.then) p.then(enregistre); else enregistre(p);
}

export function setSidebarMode(m) {
    ['drill', 'acc'].forEach(k => {
        if(document.getElementById('desk-btn-'+k)) document.getElementById('desk-btn-'+k).classList.toggle('active', k===m);
        if(document.getElementById('mob-btn-'+k)) document.getElementById('mob-btn-'+k).classList.toggle('active', k===m);
    });

    document.getElementById('view-drilldown').style.display = 'none';
    document.getElementById('view-accordion').style.display = 'none';

    if(m==='drill') { 
        document.getElementById('view-drilldown').style.display = 'flex'; 
        state.navStack = []; 
        renderDrilldown(); 
    }
    if(m==='acc') {
        document.getElementById('view-accordion').style.display = 'block';
    }
}

export function setTopNavMode(m) {
    ['grid', 'path', 'profile'].forEach(k => {
        if(document.getElementById('top-btn-'+k)) document.getElementById('top-btn-'+k).classList.toggle('active', k===m);
    });

    // Masquer toutes les vues de main-area
    if(document.getElementById('main-wrapper')) document.getElementById('main-wrapper').style.display = 'none';
    if(document.getElementById('view-path')) document.getElementById('view-path').style.display = 'none';
    if(document.getElementById('view-profile')) document.getElementById('view-profile').style.display = 'none';
    if(document.getElementById('builder-view')) document.getElementById('builder-view').style.display = 'none';

    // Afficher la vue demandée
    if (m === 'profile') {
        if(document.getElementById('view-profile')) document.getElementById('view-profile').style.display = 'flex';
    } else if (state.isTeacherMode) {
        // En mode prof, les vues principales sont remplacées par le builder
        if(document.getElementById('builder-view')) document.getElementById('builder-view').style.display = 'flex';
    } else if (m === 'grid') {
        if(document.getElementById('main-wrapper')) document.getElementById('main-wrapper').style.display = 'flex';
        initGridFilters();
    } else if (m === 'path') {
        if(document.getElementById('view-path')) document.getElementById('view-path').style.display = 'flex';
        import('./pathView.js').then(module => module.renderStudentPathView());
    }
}
