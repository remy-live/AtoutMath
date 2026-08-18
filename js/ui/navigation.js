import { exercices, domaines, filterByStatus, statusOf, estADeux, STATUS, STATUS_LABELS } from '../data/catalog.js';
import { TAGS } from '../data/tags.js';
import { clearEngines } from '../core/timers.js';
import { destroyAllDemoCursors } from '../core/demoPointer.js';
import { accessOf, lockLabel, isGame } from '../core/gameAccess.js';
import { state } from '../core/state.js';
import { launchPreview, openGameLayer } from '../games/engine.js';
import { correspond } from '../core/recherche.js';
import { cheminsDe, modeRangement, setModeRangement, RANGEMENTS, HORS_CHAPITRE } from '../core/rangement.js';
import { ficheDe } from './rechercheUI.js';

// L'APERÇU AU SURVOL, ET SA MISE À MORT.
//
// `clearEngines()` ne coupe que les minuteurs déclarés par `regInterval` — les
// jeux historiques ouvrent les leurs directement, et y survivaient. On quittait
// une carte, la vignette se cachait, mais la course continuait de rafraîchir un
// tableau de bord que la vignette suivante venait d'effacer : une erreur par
// seconde dans la console, jusqu'au rechargement de la page.
//
// On garde donc l'instance et on la DÉTRUIT. Le jeton règle le cas de celui qui
// passe vite : quand l'aperçu finit de monter alors que la souris est déjà
// repartie, il est détruit à l'arrivée au lieu de rester en fond.
let apercuSurvol = null;
let jetonSurvol = 0;

function couperApercuSurvol() {
    jetonSurvol++;
    const h = apercuSurvol;
    apercuSurvol = null;
    if (h && typeof h.destroy === 'function') {
        try { h.destroy(); } catch (e) { /* déjà démonté */ }
    }
    clearEngines();
}

export function createLibraryItem(exo) {
    const item = document.createElement('div');
    item.className = 'exo-list-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.gap = '6px';

    // Œil d'aperçu : sur un écran tactile, il n'y a ni survol ni appui long
    // fiable — ce bouton est le seul moyen de voir l'exercice avant de
    // l'ajouter au parcours.
    const btnEye = document.createElement('button');
    btnEye.className = 'teacher-only exo-item-eye';
    btnEye.title = `Aperçu de ${exo.title}`;
    btnEye.setAttribute('aria-label', `Aperçu de ${exo.title}`);
    btnEye.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    btnEye.onclick = (e) => {
        e.stopPropagation();
        if (!state.isTeacherMode) return;
        couperApercuSurvol();
        document.getElementById('hover-demo-box').style.display = 'none';
        openGameLayer(exo, true);
    };
    item.appendChild(btnEye);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = exo.title;
    titleSpan.style.flex = '1';
    titleSpan.style.minWidth = '0';
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
        // Sur téléphone, la colonne du parcours est hors de vue quand on
        // parcourt le catalogue : sans ce retour, l'ajout semblait muet.
        import('./modal.js').then(m => m.showToast(`« ${exo.title} » ajouté au parcours`, 'success'));
    };
    item.appendChild(btnAdd);

    // Interaction Éditeur vs Élève
    item.draggable = true;
    item.ondragstart = (e) => {
        if(!state.isTeacherMode) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', exo.id);
        couperApercuSurvol(); document.getElementById('hover-demo-box').style.display = 'none';
    };

    // Glisser-déposer AU DOIGT vers le parcours : l'API HTML5 ci-dessus ne
    // fonctionne qu'à la souris. Sur tablette, on refait le geste avec les
    // Pointer Events — fantôme sous le doigt, dépôt sur la colonne du milieu.
    enableTouchDragToPath(item, () => import('./builder.js').then(m => m.addStep(exo.id)));

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

            // Aperçu autonome dans la vignette : aucune donnée n'est
            // enregistrée, et le robot joue en muet — ses bulles couvriraient
            // la page entière.
            const jeton = ++jetonSurvol;
            launchPreview(exo, document.getElementById('hover-demo-canvas'), null, { muet: true })
                .then(h => {
                    if (jeton !== jetonSurvol) {
                        if (h && typeof h.destroy === 'function') h.destroy();
                        return;
                    }
                    apercuSurvol = h;
                });
        }, 500);
    };

    item.onmouseleave = () => {
        clearTimeout(hoverTimer);
        document.getElementById('hover-demo-box').style.display = 'none';
        couperApercuSurvol();     // détruit l'instance, pas seulement ses minuteurs déclarés
        destroyAllDemoCursors();  // ... et balaie sa flèche et sa bulle
    };

    return item;
}

/**
 * Glisser-déposer tactile d'un exercice vers la colonne du parcours.
 *
 * Un appui long (220 ms) arme le glissement — un doigt qui bouge tout de
 * suite fait défiler la liste, comme d'habitude. Une fois armé, un fantôme
 * suit le doigt et le dépôt sur la colonne du milieu ajoute l'étape.
 */
/**
 * Glisser au doigt vers le parcours.
 *
 * @param {HTMLElement} item
 * @param {Function} auDepot - ce qu'on ajoute une fois lâché sur la colonne.
 *   Une fonction et non un exercice : le même geste sert à déposer un exercice
 *   et à déposer un CHAPITRE ENTIER, et deux implémentations du même
 *   glissement finiraient par ne plus se comporter pareil.
 */
function enableTouchDragToPath(item, auDepot) {
    let armTimer = null;
    let dragging = false;
    let ghost = null;
    let start = null;

    const pathBox = () => document.getElementById('path-container');

    const cleanup = () => {
        clearTimeout(armTimer); armTimer = null;
        dragging = false; start = null;
        if (ghost) { ghost.remove(); ghost = null; }
        const box = pathBox();
        if (box) box.classList.remove('drag-over');
        item.classList.remove('drag-source');
    };

    // `passive: false` obligatoire : c'est le `preventDefault()` sur touchmove
    // qui empêche la liste de défiler PENDANT le glissement — et lui seul.
    item.addEventListener('touchmove', (e) => {
        if (dragging && e.cancelable) e.preventDefault();
    }, { passive: false });

    item.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' || !state.isTeacherMode) return;
        start = { x: e.clientX, y: e.clientY };
        armTimer = setTimeout(() => {
            dragging = true;
            item.classList.add('drag-source');
            const r = item.getBoundingClientRect();
            ghost = item.cloneNode(true);
            ghost.classList.add('drag-ghost');
            ghost.style.width = `${r.width}px`;
            ghost.style.left = `${r.left}px`;
            ghost.style.top = `${r.top}px`;
            document.body.appendChild(ghost);
            if (navigator.vibrate) navigator.vibrate(12);
        }, 220);
    });

    item.addEventListener('pointermove', (e) => {
        if (!start) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!dragging) {
            // Le doigt est parti avant l'appui long : c'est un défilement.
            if (Math.hypot(dx, dy) > 10) { clearTimeout(armTimer); start = null; }
            return;
        }
        ghost.style.left = `${e.clientX - ghost.offsetWidth / 2}px`;
        ghost.style.top = `${e.clientY - 24}px`;
        const box = pathBox();
        if (box) {
            const r = box.getBoundingClientRect();
            const over = e.clientX >= r.left && e.clientX <= r.right
                && e.clientY >= r.top && e.clientY <= r.bottom;
            box.classList.toggle('drag-over', over);
        }
    });

    const finish = (e) => {
        if (dragging) {
            const box = pathBox();
            if (box) {
                const r = box.getBoundingClientRect();
                const over = e.clientX >= r.left && e.clientX <= r.right
                    && e.clientY >= r.top && e.clientY <= r.bottom;
                if (over) auDepot();
            }
        }
        cleanup();
    };
    item.addEventListener('pointerup', finish);
    item.addEventListener('pointercancel', cleanup);
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

// Le catalogue se resserre avec EXACTEMENT la règle des suggestions : sans
// accents, mot à mot, la consigne en dernier recours. Deux règles différentes
// donneraient le spectacle absurde d'une suggestion visible au-dessus d'un
// catalogue qui prétend n'avoir rien trouvé.
function matchesSearch(exo, query) {
    return correspond(ficheDe(exo), query);
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
    if (state.aDeuxSeuls) {
        list = list.filter(e => estADeux(e));
    }
    if (state.searchQuery) {
        list = list.filter(e => matchesSearch(e, state.searchQuery));
    }
    return list;
}

/** Ce que la recherche doit rafraîchir derrière elle, à chaque frappe. */
export function refreshCatalogViews() {
    initAccordion();
    renderDrilldown();
    initGridFilters();
}

// Un exercice "appartient" au noeud `path` si les premiers segments de son
// chemin correspondent exactement à `path`. Selon la longueur de son chemin,
// il est soit une feuille de ce noeud (chemin.length === path.length), soit
// rangé dans un sous-dossier plus profond (chemin[path.length] donne son nom).
// UN EXERCICE PEUT AVOIR PLUSIEURS CHEMINS. Rangé par domaine il n'en a qu'un,
// mais rangé par chapitre il peut appartenir à deux chapitres — Pythagore aux
// racines carrées et aux triangles rectangles. Les trois fonctions ci-dessous
// raisonnent donc sur une liste de chemins : « au moins un de ses chemins
// passe par ce dossier ».
function matchesPath(exo, path) {
    return cheminsDe(exo).some(ch => path.every((v, i) => ch[i] === v));
}

function getNodeLeaves(filtered, path) {
    return filtered.filter(e =>
        cheminsDe(e).some(ch => ch.length === path.length && path.every((v, i) => ch[i] === v)));
}

function getNodeSubKeys(filtered, path) {
    const clefs = new Set();
    filtered.forEach(e => cheminsDe(e).forEach(ch => {
        if (ch.length > path.length && path.every((v, i) => ch[i] === v)) clefs.add(ch[path.length]);
    }));
    // Deux exceptions à l'ordre alphabétique. Les NIVEAUX suivent la
    // scolarité — CM2 avant la 6ᵉ, et non après la 4ᵉ comme le voudrait
    // l'alphabet. Et « Hors chapitre » ferme la marche : c'est une corbeille à
    // trier, pas un chapitre, elle n'a rien à faire entre « Fractions » et
    // « Ordre ».
    const rangNiveau = Object.values(TAGS.NIVEAU);
    return [...clefs].sort((a, b) => {
        if (a === HORS_CHAPITRE) return 1;
        if (b === HORS_CHAPITRE) return -1;
        const ia = rangNiveau.indexOf(a), ib = rangNiveau.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b, 'fr');
    });
}

/**
 * La bascule « Domaines / Chapitres » au-dessus de l'arbre.
 *
 * Changer de rangement remet la navigation à la racine : le dossier ouvert
 * — « Numérique › Calcul Mental » — n'existe pas dans l'autre rangement, et
 * l'y laisser afficherait une grille vide sans dire pourquoi.
 */
export function initBasculeRangement() {
    const boite = document.getElementById('rangement-bascule');
    if (!boite) return;
    const boutons = [...boite.querySelectorAll('.rang-btn')];

    const peindre = () => {
        const mode = modeRangement();
        boutons.forEach(b => {
            const actif = b.dataset.rangement === mode;
            b.classList.toggle('active', actif);
            b.setAttribute('aria-pressed', String(actif));
        });
    };

    boutons.forEach(b => {
        b.onclick = () => {
            if (b.dataset.rangement === modeRangement()) return;
            setModeRangement(b.dataset.rangement);
            state.navStack = [];
            peindre();
            refreshCatalogViews();
        };
    });

    // Le classement change dans l'écran des chapitres pendant que l'arbre est
    // affiché derrière : il doit suivre, sans quoi le professeur croit que sa
    // case n'a rien fait.
    document.addEventListener('chapitres_updated', () => {
        if (modeRangement() === RANGEMENTS.CHAPITRE) refreshCatalogViews();
    });

    peindre();
}

/**
 * Les exercices d'un dossier, sous-dossiers compris, dans l'ordre du catalogue.
 * C'est ce qu'on ajoute quand on lâche un chapitre entier sur le parcours.
 */
export function exercicesDuDossier(path) {
    return getFilteredExercises().filter(e => matchesPath(e, path));
}

/**
 * GLISSER UN CHAPITRE ENTIER DANS LE PARCOURS.
 *
 * « Je choisis mon chapitre, je le tire dans le parcours, et bam. » Le dossier
 * porte l'information dans un type à part (`text/dossier`) : la colonne du
 * milieu sait ainsi tout de suite qu'on lui donne un lot et non un exercice,
 * et peut demander confirmation avant d'y verser vingt étapes.
 */
function rendreDossierDeposable(sommaire, path) {
    sommaire.draggable = true;
    sommaire.ondragstart = (e) => {
        if (!state.isTeacherMode) { e.preventDefault(); return; }
        // Sans cela, le navigateur remonte au parent et croit qu'on déplace
        // l'exercice sélectionné à l'intérieur du dossier.
        e.stopPropagation();
        e.dataTransfer.setData('text/dossier', path.join(' > '));
        e.dataTransfer.effectAllowed = 'copy';
    };
    enableTouchDragToPath(sommaire, () =>
        import('./builder.js').then(m => m.ajouterLeDossier(path)));
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
            const sommaire = det.querySelector('summary');
            sommaire.onclick = () => {
                if (det.open) return;   // le clic précède l'ouverture
                state.navStack = childPath.slice();
                syncGridToSidebar();
            };
            rendreDossierDeposable(sommaire, childPath);
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

    // Une recherche montre les exercices EUX-MÊMES, à plat : on tape un nom
    // pour le trouver, pas pour apprendre dans quel dossier il est rangé —
    // sur téléphone, l'ancien comportement donnait un catalogue « vide ».
    if (state.searchQuery && state.searchQuery.trim()) {
        back.style.display = 'none';
        bread.textContent = `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`;
        filtered.forEach(exo => content.appendChild(createLibraryItem(exo)));
        if (!filtered.length) {
            content.innerHTML = '<div class="empty-state-msg">Aucun exercice ne correspond à cette recherche.</div>';
        }
        return;
    }

    back.style.display = path.length === 0 ? 'none' : 'block';
    // À la racine, le fil d'Ariane annonce le rangement en cours : « Domaines »
    // au-dessus d'une liste de niveaux se lirait comme une erreur.
    bread.textContent = path.length === 0
        ? (modeRangement() === RANGEMENTS.CHAPITRE ? 'Chapitres' : 'Domaines')
        : path[path.length - 1];

    getNodeSubKeys(filtered, path).forEach(key => {
        const b = document.createElement('button'); b.className = 'drill-item'; b.innerHTML = `<span>${key}</span><span>›</span>`;
        b.onclick = () => { state.navStack.push(key); renderDrilldown(); syncGridToSidebar(); };
        // LE DOSSIER SE GLISSE ICI AUSSI. C'est même la vue par défaut — celle
        // où l'on tombe en ouvrant l'application. N'avoir rendu déplaçables
        // que les dossiers de l'arbre revenait à livrer le geste dans l'écran
        // où personne ne le cherche.
        rendreDossierDeposable(b, [...path, key]);
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
            .filter(exo => actifs.length === 0
                || cheminsDe(exo).some(ch => actifs.includes(ch[path.length])))
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

    renderNiveauRow();
    renderCards();
}

/**
 * La rangée des NIVEAUX.
 *
 * Le niveau est le premier tri de tout le monde — un professeur cherche « ce
 * que je peux donner en 6e », un élève « ce qui est de mon année ». Il n'avait
 * pourtant qu'un menu déroulant dans le panneau latéral, c'est-à-dire nulle
 * part sur téléphone. Il prend sa propre rangée, à côté des domaines, et les
 * deux se lisent de la même façon.
 *
 * Les niveaux proposés sont ceux qui EXISTENT dans le catalogue courant : une
 * pastille « 3e » sur laquelle il n'y a rien à trouver serait un cul-de-sac.
 */
function renderNiveauRow() {
    const fn = document.getElementById('filters-niveau');
    if (!fn) return;
    fn.innerHTML = '';

    const dispo = [];
    filterByStatus(exercices, { only: state.catalogFilter, teacher: state.isTeacherMode })
        .forEach(e => (e.tags.niveaux || []).forEach(n => { if (!dispo.includes(n)) dispo.push(n); }));
    // L'ordre du référentiel, pas l'ordre d'apparition dans le catalogue : on
    // veut CP → CM2 → 6e → 5e, pas l'ordre dans lequel les fichiers ont été
    // écrits.
    const ordre = Object.values(TAGS.NIVEAU);
    dispo.sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b));

    // La pastille « à deux » vit dans CETTE rangée, pas dans une troisième :
    // elle ne concerne qu'une poignée d'exercices, et une ligne de tags de plus
    // coûterait à tout le monde la place qu'elle ne rend qu'à eux.
    const duos = filterByStatus(exercices, { only: state.catalogFilter, teacher: state.isTeacherMode })
        .filter(e => estADeux(e)).length;

    const ligne = document.getElementById('filter-row-niveau');
    if (ligne) ligne.hidden = dispo.length < 2 && !duos;

    dispo.forEach(n => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn tag-niveau';
        btn.textContent = n;
        if (state.selectedNiveaux && state.selectedNiveaux.includes(n)) btn.classList.add('active');
        btn.onclick = () => {
            const sel = state.selectedNiveaux ? state.selectedNiveaux.slice() : [];
            const i = sel.indexOf(n);
            if (i >= 0) sel.splice(i, 1); else sel.push(n);
            state.selectedNiveaux = sel;
            // Le niveau filtre TOUT le catalogue : l'arbre de gauche et la
            // grille de droite doivent repartir ensemble.
            initAccordion();
            renderDrilldown();
            initGridFilters();
        };
        fn.appendChild(btn);
    });

    if (duos) {
        const duo = document.createElement('button');
        duo.className = 'tag-btn tag-duo';
        duo.textContent = `👥 À deux (${duos})`;
        duo.title = 'Ne montrer que les activités qui se jouent à deux sur le même écran';
        if (state.aDeuxSeuls) duo.classList.add('active');
        duo.onclick = () => {
            state.aDeuxSeuls = !state.aDeuxSeuls;
            initAccordion();
            renderDrilldown();
            initGridFilters();
        };
        fn.appendChild(duo);
    }
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
    destroyAllDemoCursors();
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

    // Verrous du jeu libre : la carte reste visible — l'élève doit voir ce qui
    // l'attend — mais elle annonce sa condition au lieu de se lancer.
    const acces = state.isTeacherMode ? { status: 'libre' } : accessOf(exo);
    if (acces.status !== 'libre') {
        card.classList.add('card--locked');
        const lock = document.createElement('div');
        lock.className = 'card-lock';
        lock.innerHTML = `<span class="card-lock-icon" aria-hidden="true">🔒</span>
            <span class="card-lock-label">${lockLabel(acces)}</span>`;
        card.appendChild(lock);
    }

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
        // Les démonstrations des jeux historiques se pilotent en appelant
        // `el.click()` sur leurs propres cases. Ces clics remontaient jusqu'à
        // la carte et ouvraient l'exercice tout seuls : `pointer-events: none`
        // n'arrête que la souris, pas un clic déclenché par programme.
        box.addEventListener('click', (e) => e.stopPropagation());
        card.appendChild(box);
    }

    const tags = document.createElement('div');
    tags.className = 'card-tags';
    // La pastille « jeu » n'est pas une donnée du catalogue : elle se déduit
    // de l'activité (autonome = jeu). Impossible d'oublier de la poser en
    // ajoutant un jeu, ou de la laisser sur un exercice devenu classique.
    tags.innerHTML = `<span class="tag tag-btn tag-niveau">${niveauxStr}</span>
        <span class="tag tag-btn tag-domaine">${exo.tags.chemin[0]}</span>
        ${isGame(exo) ? '<span class="tag tag-btn tag-jeu">🎮 jeu</span>' : ''}
        ${estADeux(exo) ? '<span class="tag tag-btn tag-duo">👥 à deux</span>' : ''}
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
 * Monte tous les aperçus figés en même temps.
 *
 * En série tant que geler voulait dire `clearEngines()` : chaque vignette
 * devait attendre que la précédente ait posé son image, soit une seconde et
 * demie par jeu historique. Le gel étant devenu individuel (`handle.pause()`),
 * elles se montent ensemble.
 */
function mountPreviews(container) {
    container.querySelectorAll('.card-preview').forEach(box => {
        const exo = exercices.find(e => e.id === box.dataset.preview);
        if (exo) mountFrozen(exo, box);
    });
}

function mountFrozen(exo, box) {
    const stage = box.querySelector('.card-preview-stage') || box;
    prepareStage(box, stage);
    // Voilée tant que l'image n'est pas posée : ce qu'on promet est une
    // vignette figée, pas six jeux qui démarrent en même temps sous les yeux.
    box.classList.add('card-preview--attente');
    const p = launchPreview(exo, stage, null, { frozen: true });
    return (p && p.then ? p : Promise.resolve()).then(() => {
        fitPreview(box, stage);
        box.classList.remove('card-preview--attente');
    });
}

/**
 * Donne au plateau ses dimensions de référence AVANT le montage.
 *
 * Les jeux historiques mesurent leur conteneur au montage pour en déduire la
 * taille de leur canevas ou de leurs cases. Dimensionner le plateau après coup
 * leur faisait lire une boîte vide : canevas noir du jeu de tir, cases de
 * Math Crush réduites à des dégradés, piste de course déserte.
 */
function prepareStage(box, stage) {
    const large = box.clientWidth;
    const haut = box.clientHeight;
    if (!large || !haut) return;
    stage.style.width = `${LARGEUR_REF}px`;
    stage.style.height = `${Math.round(haut * LARGEUR_REF / large)}px`;
    // La réduction est posée TOUT DE SUITE, et non après le montage : les jeux
    // historiques mettent une seconde et demie à composer leur image, et
    // pendant ce temps on les voyait tourner à taille réelle, débordant du
    // cadre. `fitPreview` ne fera plus que resserrer si le contenu s'avère
    // plus haut que le plateau de référence.
    appliquerEchelle(stage, large, large / LARGEUR_REF);
}

function appliquerEchelle(stage, large, k, decalageY = 0) {
    stage.style.transformOrigin = 'top left';
    stage.style.transform =
        `translate(${Math.round((large - LARGEUR_REF * k) / 2)}px, ${Math.round(decalageY)}px) scale(${k.toFixed(4)})`;
}

// Largeur à laquelle la question est COMPOSÉE avant d'être réduite. Composer
// directement dans les ~290 px de la carte donnait des mises en page de
// téléphone — « < = > » sur deux lignes, bulles empilées — qu'on réduisait
// ensuite : on photographiait un écran étroit au lieu d'un plateau de jeu.
const LARGEUR_REF = 640;

/**
 * Met la question à l'échelle de la vignette.
 *
 * Les activités se dessinent pour un plateau de jeu ; aucune ne sait tenir dans
 * 170 pixels de haut, et leurs tailles minimales (des touches restent
 * atteignables au doigt) les empêchent de se réduire davantage. On les
 * photographie donc : composées sur un plateau de référence, puis réduites
 * d'un bloc. Le plateau garde le format de la vignette, de sorte que la
 * réduction soit la même dans les deux sens.
 */
function fitPreview(box, stage) {
    const large = box.clientWidth;
    const haut = box.clientHeight;
    if (!large || !haut) return;
    // Mesure à l'échelle 1 : un contenu déjà réduit donnerait une hauteur
    // réduite, et la réduction s'appliquerait deux fois.
    stage.style.transform = 'none';

    // `container-type: size` isole la hauteur du contenu : `scrollHeight`
    // renverrait celle du conteneur. On mesure donc les enfants eux-mêmes.
    //
    // Et on mesure les DEUX bords, pas seulement le bas. Le contenu d'une
    // activité est centré verticalement : plus haut que la scène, il déborde
    // AUTANT par le haut que par le bas. En ne regardant que le bas, on
    // sous-estimait la hauteur réelle de moitié — la vignette restait trop
    // grande, et l'énoncé se retrouvait coupé au ras du cadre. On aligne
    // ensuite le sommet du contenu sur celui de la vignette : ce qui dépasse
    // dépasse en bas, là où c'est le décor, jamais sur la question.
    const zero = stage.getBoundingClientRect().top;
    // EN PROFONDEUR, pas seulement les enfants directs. Beaucoup d'activités
    // posent un unique conteneur à la taille de la scène, et c'est SON contenu
    // qui déborde : mesurée au premier niveau, la vignette paraissait tenir et
    // on en voyait les deux tiers. Le parcours est borné (nombre de nœuds, et
    // distance) pour rester bon marché et pour qu'une particule partie au loin
    // ne réduise pas toute la vignette à un timbre.
    const stageH = stage.getBoundingClientRect().height || haut;
    let sommet = Infinity, bas = 0, budget = 400;
    const visiter = (el) => {
        for (const enfant of el.children) {
            if (budget-- <= 0) return;
            const r = enfant.getBoundingClientRect();
            if (r.width >= 1 || r.height >= 1) {
                const t = r.top - zero, b = r.bottom - zero;
                if (b > -stageH * 2 && t < stageH * 3) {
                    sommet = Math.min(sommet, t);
                    bas = Math.max(bas, b);
                }
            }
            if (enfant.children.length) visiter(enfant);
        }
    };
    visiter(stage);
    if (!isFinite(sommet)) sommet = 0;
    const hauteurContenu = Math.max(bas - Math.min(sommet, 0), 1);

    const k = Math.min(large / LARGEUR_REF, haut / hauteurContenu);
    appliquerEchelle(stage, large, k, Math.min(sommet, 0) * -k);
}

function startCardDemo(exo, box) {
    if (!box) return;
    if (demoEnCours && demoEnCours.box === box) return;
    stopCardDemo();
    const jeton = demoJeton;
    const stage = box.querySelector('.card-preview-stage') || box;
    prepareStage(box, stage);
    box.classList.add('card-preview--live');
    const p = launchPreview(exo, stage, null, { muet: true });
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

// La grille se rafraîchit quand les verrous changent : réglage du professeur,
// ou fin de séance (un jeu a pu se débloquer grâce aux réponses gagnées).
['gameAccess_updated', 'sequence_completed'].forEach(evt => {
    document.addEventListener(evt, () => {
        const wrapper = document.getElementById('main-wrapper');
        if (wrapper && wrapper.style.display !== 'none' && !state.isTeacherMode) initGridFilters();
    });
});

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
