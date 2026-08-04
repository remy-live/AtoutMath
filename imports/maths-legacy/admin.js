/**
 * admin.js - Constructeur de Parcours
 * Version : Auto-Génération de l'interface + Drag & Drop
 * Mise à jour : Ajout du jeu Prio-Bot
 */

// --- VARIABLES GLOBALES ---
let currentPath = [];
let selectedIndex = -1;

// Modèles de configuration (Avec ICÔNES pour l'interface)
const GAME_TEMPLATES = {
    memory: {
        icon: "🃏",
        gameId: 'memory',
        title: 'Jeu de Paires',
        description: 'Trouve les paires',
        config: { nbPairs: 6, timeLimit: 60 },
        winCondition: { minScore: 500 }
    },
    dungeon: {
        icon: "🏰",
        gameId: 'dungeon',
        title: 'Donjon Maths',
        description: 'Traverse la grille',
        config: { gridSize: 5, lives: 3, difficulty: 1 },
        winCondition: { minScore: 200 }
    },
    snake: {
        icon: "🐍",
        gameId: 'snake',
        title: 'Snake',
        description: 'Mange les bons nombres',
        config: { mode: 'add', speed: 150, gridSize: 15 },
        winCondition: { minScore: 300 }
    },
    space: {
        icon: "🚀",
        gameId: 'space',
        title: 'Space Invaders',
        description: 'Tire sur la bonne réponse',
        config: {}, 
        winCondition: { minScore: 500 }
    },
    // --- NOUVEAU JEU AJOUTÉ ICI ---
    prio: {
        icon: "🤖",
        gameId: 'prio',
        title: 'Prio-Bot',
        description: 'Respecte les priorités de calcul',
        config: { difficulty: 1 },
        winCondition: { minScore: 500 }
    },
    // -----------------------------
    ninja: {
        icon: "🥷",
        gameId: 'ninja',
        title: 'Math Ninja',
        description: 'Tranche les résultats',
        config: {},
        winCondition: { minScore: 500 }
    },
    drop: {
        icon: "🧱",
        gameId: 'drop',
        title: 'Number Drop',
        description: 'Empile pour faire 10',
        config: { speed: 800 },
        winCondition: { minScore: 400 }
    },
    flappy: {
        icon: "🐦",
        gameId: 'flappy',
        title: 'Flappy Math',
        description: 'Vole dans le bon tuyau',
        config: {},
        winCondition: { minScore: 300 }
    },
    divider: {
        icon: "🏭",
        gameId: 'divider',
        title: 'The Divider',
        description: 'Filtre les robots',
        config: {},
        winCondition: { minScore: 300 }
    },
    bubble: {
        icon: "🔵",
        gameId: 'bubble',
        title: 'Bubble Shooter',
        description: 'Vise pour faire 10',
        config: {},
        winCondition: { minScore: 300 }
    },
    mole: {
        icon: "🐹",
        gameId: 'mole',
        title: 'Tape-Taupe',
        description: 'Tape la bonne réponse',
        config: { mode: 'multiples', target: 2, speed: 1000 },
        winCondition: { minScore: 200 }
    },
    race: {
        icon: "🏎️",
        gameId: 'race',
        title: 'Math Racer',
        description: 'Course rapide',
        config: { startLevel: 1 },
        winCondition: { minScore: 1000 }
    }
};

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. D'abord on génère les boutons visuels
    generateLibraryUI();
    // 2. Ensuite on active le Drag & Drop sur ces nouveaux boutons
    initDragAndDrop();
    
    document.getElementById('btn-export').addEventListener('click', exportJSON);
});

// --- NOUVELLE FONCTION : GÉNÉRATEUR D'INTERFACE ---
function generateLibraryUI() {
    // On essaie de trouver le conteneur de la bibliothèque
    const existingItem = document.querySelector('.draggable-item');
    let container;

    if (existingItem) {
        container = existingItem.parentElement;
    } else {
        container = document.getElementById('library-container') || document.querySelector('.col-left') || document.querySelector('aside');
    }

    if (!container) {
        console.error("Impossible de trouver la colonne de gauche (Bibliothèque). Ajoute id='library-container' dans ton HTML !");
        return;
    }

    // On vide la liste actuelle (pour remplacer les boutons en dur)
    container.innerHTML = '';

    // On crée un bouton pour CHAQUE jeu dans GAME_TEMPLATES
    for (const [key, tpl] of Object.entries(GAME_TEMPLATES)) {
        const div = document.createElement('div');
        div.className = 'draggable-item';
        div.draggable = true;
        div.dataset.type = key; // ex: 'snake'
        
        // Le HTML intérieur du bouton
        div.innerHTML = `
            <span style="font-size:1.2rem; margin-right:10px;">${tpl.icon}</span>
            <strong>${tpl.title.toUpperCase()}</strong>
        `;
        
        // Ajout d'un petit style inline pour être sûr que ça ressemble aux autres
        div.style.padding = "15px";
        div.style.margin = "10px 0";
        div.style.background = "white";
        div.style.border = "2px solid #333";
        div.style.cursor = "grab";
        div.style.display = "flex";
        div.style.alignItems = "center";

        container.appendChild(div);
    }
}

// --- COEUR DU DRAG & DROP ---
function initDragAndDrop() {
    // On re-sélectionne les éléments qu'on vient de créer
    const libraryItems = document.querySelectorAll('.draggable-item');
    const dropZone = document.getElementById('path-container');

    // 1. GESTION BIBLIOTHÈQUE
    libraryItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('source', 'library');
            e.dataTransfer.setData('type', item.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    // 2. GESTION ZONE DE LISTE
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        const afterElement = getDragAfterElement(dropZone, e.clientY);
        const draggingEl = document.querySelector('.dragging');

        if (draggingEl) {
            if (afterElement == null) {
                dropZone.appendChild(draggingEl);
            } else {
                dropZone.insertBefore(draggingEl, afterElement);
            }
        }
    });

    // 3. DROP FINAL
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const source = e.dataTransfer.getData('source');
        
        if (source === 'library') {
            const type = e.dataTransfer.getData('type');
            if (type && GAME_TEMPLATES[type]) {
                const afterElement = getDragAfterElement(dropZone, e.clientY);
                let insertIndex = afterElement ? parseInt(afterElement.dataset.index) : currentPath.length;
                addStep(type, insertIndex);
            }
        } else {
            updateArrayFromDOM();
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.path-step:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- GESTION DONNÉES ---

function addStep(type, insertIndex = null) {
    const newStep = JSON.parse(JSON.stringify(GAME_TEMPLATES[type]));
    newStep.id = `lvl_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    
    if (insertIndex !== null && insertIndex >= 0 && insertIndex < currentPath.length) {
        currentPath.splice(insertIndex, 0, newStep);
    } else {
        currentPath.push(newStep);
    }

    relinkLevels();
    renderPath();
    const newIndex = currentPath.findIndex(s => s.id === newStep.id);
    selectStep(newIndex);
}

function updateArrayFromDOM() {
    const container = document.getElementById('path-container');
    const domItems = container.querySelectorAll('.path-step');
    let newPath = [];
    
    domItems.forEach((itemDom) => {
        const oldIndex = parseInt(itemDom.dataset.index);
        if (currentPath[oldIndex]) newPath.push(currentPath[oldIndex]);
    });

    currentPath = newPath;
    relinkLevels();
    renderPath();
}

function relinkLevels() {
    currentPath.forEach((step, idx) => {
        if (idx === 0) step.requiredLevel = null;
        else step.requiredLevel = currentPath[idx - 1].id;
    });
}

// --- AFFICHAGE ---

function renderPath() {
    const container = document.getElementById('path-container');
    container.innerHTML = '';

    if (currentPath.length === 0) {
        container.innerHTML = '<p class="empty-msg">Glisse des jeux ici...</p>';
        return;
    }

    currentPath.forEach((step, index) => {
        const div = document.createElement('div');
        div.className = `path-step ${index === selectedIndex ? 'selected' : ''}`;
        div.draggable = true; 
        div.dataset.index = index;
        
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; pointer-events:none;">
                <span style="font-size:1.5rem; cursor:grab; opacity:0.5;">☰</span>
                <span><strong>${index + 1}.</strong> ${step.title}</span>
            </div>
            <button onclick="removeStep(${index})" style="padding:5px 10px; background:#e74c3c; color:white;">X</button>
        `;
        
        div.addEventListener('dragstart', () => { div.classList.add('dragging'); selectStep(index); });
        div.addEventListener('dragend', () => { div.classList.remove('dragging'); updateArrayFromDOM(); });
        div.addEventListener('click', (e) => { if(e.target.tagName !== 'BUTTON') selectStep(index); });

        container.appendChild(div);
    });
}

function removeStep(index) {
    currentPath.splice(index, 1);
    relinkLevels();
    if (currentPath.length === 0) selectedIndex = -1;
    else if (selectedIndex >= currentPath.length) selectedIndex = currentPath.length - 1;
    renderPath();
    renderForm();
}

function selectStep(index) {
    selectedIndex = index;
    const steps = document.querySelectorAll('.path-step');
    steps.forEach((s, i) => {
        if (i === index) s.classList.add('selected');
        else s.classList.remove('selected');
    });
    renderForm();
}

// --- FORMULAIRE ---

function renderForm() {
    const container = document.getElementById('form-container');
    container.innerHTML = '';

    if (selectedIndex === -1 || !currentPath[selectedIndex]) {
        container.innerHTML = '<p class="hint">Sélectionne une étape pour la modifier.</p>';
        return;
    }

    const data = currentPath[selectedIndex];

    container.appendChild(createInput('Titre du niveau', data.title, (v) => { 
        data.title = v; 
        const stepEl = document.querySelectorAll('.path-step')[selectedIndex];
        if(stepEl) stepEl.querySelector('strong').nextSibling.textContent = ` ${v}`;
    }));
    
    container.appendChild(createInput('Description', data.description, (v) => data.description = v));
    
    container.appendChild(document.createElement('hr'));
    const subTitle = document.createElement('h4');
    subTitle.innerText = "Configuration du Jeu";
    container.appendChild(subTitle);

    for (const [key, value] of Object.entries(data.config)) {
        container.appendChild(createInput(key, value, (v) => {
            data.config[key] = isNaN(v) ? v : parseInt(v); 
        }, typeof value === 'number' ? 'number' : 'text'));
    }

    container.appendChild(document.createElement('hr'));
    container.appendChild(createInput('Score pour gagner', data.winCondition.minScore, (v) => {
        data.winCondition.minScore = parseInt(v);
    }, 'number'));
}

function createInput(labelTxt, value, onChange, type = 'text') {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = document.createElement('label');
    label.innerText = labelTxt;
    
    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    
    input.addEventListener('input', (e) => { onChange(e.target.value); });

    group.appendChild(label);
    group.appendChild(input);
    return group;
}

// --- EXPORT ---

function exportJSON() {
    // Liste complète pour l'export
    const fullFreeModeList = [];
    
    // On transforme GAME_TEMPLATES en liste pour le JSON
    for (const [key, tpl] of Object.entries(GAME_TEMPLATES)) {
        fullFreeModeList.push({
            id: tpl.gameId,
            name: tpl.title,
            folder: `games/${tpl.gameId}`,
            script: "script.js",
            options: [ { label: "Standard", config: tpl.config } ]
        });
    }

    const finalData = {
        adventure: currentPath,
        freeMode: fullFreeModeList
    };

    const jsonString = JSON.stringify(finalData, null, 4);
    
    navigator.clipboard.writeText(jsonString).then(() => {
        alert("✅ JSON copié !");
    }).catch(err => {
        console.error('Erreur copie', err);
        alert("Erreur lors de la copie. Vérifie la console.");
    });
    
    console.log(jsonString);
}