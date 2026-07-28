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
            renderNode(det, childPath);
            container.appendChild(det);
        });
    };

    renderNode(acc, []);
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
        b.onclick = () => { state.navStack.push(key); renderDrilldown(); };
        content.appendChild(b);
    });

    getNodeLeaves(filtered, path).forEach(exo => content.appendChild(createLibraryItem(exo)));
}

export function initGridFilters() {
    const fd = document.getElementById('filters-domaine');
    if(fd) fd.innerHTML = '';

    const filtered = getFilteredExercises();
    const domainesList = [...new Set(filtered.map(e => e.tags.chemin[0]))].sort();
    let activeDomaines = [];

    const renderCards = () => {
        document.getElementById('main-content').innerHTML = '';
        const container = document.createElement('div'); container.className = 'grid-container';

        filtered.filter(exo => {
            return activeDomaines.length === 0 || activeDomaines.includes(exo.tags.chemin[0]);
        }).forEach(exo => {
            const card = document.createElement('div'); card.className = 'card';
            const niveauxStr = exo.tags.niveaux ? exo.tags.niveaux.join(' - ') : '';
            card.innerHTML = `<div style="font-weight:bold; font-size:1.1rem;">${exo.title}</div>
                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                    <span class="tag tag-btn tag-niveau">${niveauxStr}</span>
                    <span class="tag tag-btn tag-domaine">${exo.tags.chemin[0]}</span>
                    ${statusBadge(exo)}
                </div>`;
            card.onclick = () => openGameLayer(exo, false);
            container.appendChild(card);
        });
        document.getElementById('main-content').appendChild(container);
    };

    if (fd) {
        domainesList.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'tag-btn tag-domaine';
            btn.textContent = d;
            btn.onclick = () => {
                if(activeDomaines.includes(d)) { 
                    activeDomaines = activeDomaines.filter(x => x !== d); 
                    btn.classList.remove('active'); 
                } else { 
                    activeDomaines.push(d); 
                    btn.classList.add('active'); 
                }
                renderCards();
            };
            fd.appendChild(btn);
        });
    }

    renderCards();
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
