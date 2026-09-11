/**
 * games/spreadsheet/script.js
 * L'École du Tableur - Version 2.9 (Validation Stricte Références & Boss Compact)
 */

const SpreadsheetGame = {
    container: null,
    cols: [],
    rows: [],
    
    currentLevel: 1,
    
    // État du jeu
    targetData: "",
    isDragging: false,
    startCell: null,
    currentSelection: [],
    selectedCellsElements: [],
    selectedColor: 'red',
    inputTasks: [],
    completedInputs: 0,
    
    // Progression
    successCount: 0,
    GOAL: 5,

    // Outils
    canvasContext: null,

    // Textes Explicatifs
    levelIntros: {
        1: "Bienvenue ! Commençons par apprendre à identifier les cases (ex: A1, B3).",
        2: "Bravo ! Maintenant, apprends à sélectionner des **plages** de cellules (ex: A1:B2).",
        3: "Super ! Utilisons les cases pour dessiner (Pixel Art). Reproduis les modèles.",
        4: "C'est parti pour la saisie de données. Remplis les cases comme demandé.",
        5: "Introduction aux formules ! On commence par l'addition simple avec le signe =.",
        6: "On continue avec la multiplication. Le symbole est l'étoile (*).",
        7: "Pour aller plus vite, on utilise des FONCTIONS. Découvre la fonction =SOMME().",
        8: "Une autre fonction très utile : la MOYENNE.",
        9: "Dernière étape : LE BOSS. Remplis la facture complète !"
    },

    // Modèles Pixel Art (5x5)
    pixelArtModels: [
        [[null,'red',null,'red',null],['red','red','red','red','red'],['red','red','red','red','red'],[null,'red','red','red',null],[null,null,'red',null,null]], 
        [[null,'yellow','yellow','yellow',null],['yellow','black',null,'black','yellow'],['yellow',null,null,null,'yellow'],['yellow','black','black','black','yellow'],[null,'yellow','yellow','yellow',null]], 
        [['green','green','green','green','green'],['green','black',null,'black','green'],['green','black','black','black','green'],['green','green','black','green','green'],['green','green','green','green','green']],
        [['blue','white','red','blue','white'],['blue','white','red','blue','white'],['blue','white','red','blue','white'],['blue','white','red','blue','white'],['blue','white','red','blue','white']],
        [[null,null,'blue',null,null],[null,null,'blue',null,null],[null,'blue','blue','blue',null],[null,null,'blue',null,null],[null,null,'blue',null,null]],
        [['red','red','red','red','red'],['red','white','white','white','red'],['red','white','blue','white','red'],['red','white','white','white','red'],['red','red','red','red','red']]
    ],
    
    colorStyles: {'red':'#ff6b6b', 'blue':'#4dabf7', 'green':'#51cf66', 'yellow':'#fcc419', 'black':'#333', 'white':'white'},

    start: function(container) {
        this.container = container;
        const canvas = document.createElement('canvas');
        this.canvasContext = canvas.getContext('2d');

        this.loadCSS();
        this.createInterface();
        this.bindEvents();
        this.showLevelModal(1);
    },

    stop: function() {
        this.container.innerHTML = '';
        document.removeEventListener('mouseup', this.boundMouseUp);
    },

    loadCSS: function() {
        if (!document.getElementById('css-spreadsheet')) {
            const link = document.createElement('link');
            link.id = 'css-spreadsheet';
            link.rel = 'stylesheet';
            link.href = 'games/spreadsheet/style.css';
            document.head.appendChild(link);
        }
    },

    createInterface: function() {
        this.container.innerHTML = `
            <div class="sp-game">
                <div id="sp-debug-btn" title="Debug: Win Level"></div>
                
                <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:10px;">
                    <div class="sp-menu" id="sp-menu" style="margin-bottom:0;"></div>
                    <button id="sp-restart-btn" style="background:#dc3545; color:white; border:none; padding:5px 12px; border-radius:15px; cursor:pointer; font-size:0.8rem; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.2);">↺ Options</button>
                </div>
                
                <div class="sp-progress-bar">
                    <div id="sp-progress-fill" class="sp-progress-fill"></div>
                </div>

                <div class="sp-container" style="overflow:auto;">
                    <h2 id="sp-title">...</h2>
                    <div id="sp-consigne" class="sp-consigne">...</div>
                    
                    <div id="sp-palette-box" class="sp-palette-box">
                        <div class="sp-palette" id="sp-palette"></div>
                        <button class="btn-primary" id="btn-check-art" style="margin-top:5px; font-size:0.9rem;">VÉRIFIER</button>
                    </div>

                    <div id="single-grid-container">
                        <div id="main-grid" class="sp-grid"></div>
                    </div>

                    <div id="dual-grid-container">
                        <div class="grid-wrapper"><h3>Modèle</h3><div id="model-grid" class="sp-grid"></div></div>
                        <div class="grid-wrapper"><h3>Ton dessin</h3><div id="player-grid" class="sp-grid"></div></div>
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#sp-debug-btn').onclick = () => this.levelComplete();
        this.container.querySelector('#sp-restart-btn').onclick = () => this.showRestartMenu();

        const menu = this.container.querySelector('#sp-menu');
        ["1", "2", "3", "4", "5", "6", "7", "8", "9"].forEach((label, i) => {
            const btn = document.createElement('button');
            btn.className = 'sp-level-btn';
            btn.innerText = label;
            btn.onclick = () => this.startLevel(i + 1);
            menu.appendChild(btn);
        });

        const palContainer = this.container.querySelector('#sp-palette');
        Object.keys(this.colorStyles).forEach(c => {
            const d = document.createElement('div');
            d.className = `color-btn c-${c}`;
            d.onclick = () => this.selectColor(c, d);
            palContainer.appendChild(d);
        });

        this.container.querySelector('#btn-check-art').onclick = () => this.checkPixelArt();
    },

    bindEvents: function() {
        this.boundMouseUp = this.onMouseUp.bind(this);
        document.addEventListener('mouseup', this.boundMouseUp);
    },

    showRestartMenu: function() {
        if(window.GameSystem) {
            window.GameSystem.showModal({
                title: "Pause",
                content: "Que veux-tu faire ?",
                actions: [
                    { label: "Recommencer ce niveau", onClick: () => this.startLevel(this.currentLevel) },
                    { label: "Tout recommencer (Niv 1)", onClick: () => this.startLevel(1) },
                    { label: "Annuler", onClick: () => {} }
                ]
            });
        }
    },

    // --- CONFIGURATION DE LA GRILLE ---
    configureGridDimensions: function(lvl) {
        if (lvl === 9) {
            // MODE BOSS : GRILLE MOYENNE (5 colonnes x 6 lignes)
            // A, B, C, D, E  et lignes 1 à 6
            this.cols = ['A', 'B', 'C', 'D', 'E'];
            this.rows = [1, 2, 3, 4, 5, 6];
        } else {
            // MODE STANDARD : 5x5
            this.cols = ['A', 'B', 'C', 'D', 'E'];
            this.rows = [1, 2, 3, 4, 5];
        }
    },

    startLevel: function(lvl) {
        this.currentLevel = lvl;
        this.successCount = 0;
        this.updateProgressBar();
        
        this.configureGridDimensions(lvl);
        
        const btns = this.container.querySelectorAll('.sp-level-btn');
        btns.forEach(b => b.classList.remove('active'));
        if(btns[lvl-1]) btns[lvl-1].classList.add('active');

        const titles = ["", "1. Clic", "2. Zone", "3. Pixel Art", "4. Saisie", "5. Formules (+)", "6. Multiplication (*)", "7. Fonction SOMME", "8. MOYENNE", "9. LE BOSS"];
        this.container.querySelector('#sp-title').innerText = titles[lvl];

        const single = this.container.querySelector('#single-grid-container');
        const dual = this.container.querySelector('#dual-grid-container');
        const palBox = this.container.querySelector('#sp-palette-box');
        const consigne = this.container.querySelector('#sp-consigne');

        if (lvl === 3) {
            single.style.display = 'none'; 
            dual.style.display = 'flex'; 
            palBox.style.display = 'flex'; 
            consigne.style.display = 'none';
            this.selectColor('red', this.container.querySelector('.c-red'));
        } else {
            single.style.display = 'block'; 
            dual.style.display = 'none'; 
            palBox.style.display = 'none'; 
            consigne.style.display = 'block';
            this.createGenericGrid('main-grid', true);
        }
        
        this.generateTask();
    },

    updateProgressBar: function() {
        const pct = (this.successCount / this.GOAL) * 100;
        const bar = this.container.querySelector('#sp-progress-fill');
        if(bar) bar.style.width = pct + "%";
    },

    // --- GÉNÉRATION DES TÂCHES ---
    generateTask: function() {
        const consigneEl = this.container.querySelector('#sp-consigne');
        this.completedInputs = 0;
        this.inputTasks = [];
        this.cleanGridHighlight();

        const isFirstTry = this.successCount === 0;
        let rowOffset = (this.successCount % 5) + 1;
        let colIndex = this.successCount % 5; 

        // 1. CLIC
        if (this.currentLevel === 1) { 
            let c = this.cols[Math.floor(Math.random()*5)]; 
            let r = this.rows[Math.floor(Math.random()*5)]; 
            this.targetData = c + r; 
            consigneEl.innerHTML = `Clique sur la case : <span class="target">${this.targetData}</span>`; 
        } 
        // 2. ZONE
        else if (this.currentLevel === 2) { 
            let cI = Math.floor(Math.random()*4); 
            let rI = Math.floor(Math.random()*4); 
            let w = Math.floor(Math.random() * (4 - cI)) + 1;
            let h = Math.floor(Math.random() * (4 - rI)) + 1;
            if(w===1 && h===1) w=2;
            this.targetData = this.cols[cI] + this.rows[rI] + ":" + this.cols[cI+w] + this.rows[rI+h]; 
            consigneEl.innerHTML = `Sélectionne la zone : <span class="target">${this.targetData}</span>`; 
        }
        // 3. PIXEL ART
        else if (this.currentLevel === 3) {
            const model = this.pixelArtModels[Math.floor(Math.random() * this.pixelArtModels.length)];
            this.createGenericGrid('model-grid', false, model);
            this.createGenericGrid('player-grid', true);
        }
        // 4. SAISIE
        else if (this.currentLevel === 4) {
             let targetVal = Math.floor(Math.random() * 50);
             let cell = "A" + rowOffset;
             this.inputTasks = [{id: cell, expected: targetVal.toString()}]; 
             consigneEl.innerHTML = `Écris <b>${targetVal}</b> en ${cell} (puis Entrée)`; 
             setTimeout(() => this.focusInput(cell), 100);
        }
        // 5. SOMME SIMPLE (+)
        else if (this.currentLevel === 5) {
            let v1 = Math.floor(Math.random()*10);
            let v2 = Math.floor(Math.random()*10);
            let cellA = "A" + rowOffset;
            let cellB = "B" + rowOffset;
            let cellC = "C" + rowOffset;

            this.fillInput(cellA, v1, true); 
            this.fillInput(cellB, v2, true);
            this.inputTasks = [{id: cellC, expected: (v1+v2).toString(), formulaRequired: true}];
            
            let hint = isFirstTry ? ` (Ex: =${cellA}+${cellB})` : "";
            consigneEl.innerHTML = `Calcule la somme de ${cellA} et ${cellB} en <span class="target">${cellC}</span>${hint}`;
            setTimeout(() => this.focusInput(cellC), 100);
        }
        // 6. PRODUIT (*)
        else if (this.currentLevel === 6) {
            this.fillInput("A1", "PRIX", true); this.fillInput("B1", "QTÉ", true); this.fillInput("C1", "TOT", true);
            let dataRow = (this.successCount % 4) + 2; 
            let p = 2 + Math.floor(Math.random()*5);
            let q = 2 + Math.floor(Math.random()*5);
            let cellA = "A" + dataRow;
            let cellB = "B" + dataRow;
            let cellC = "C" + dataRow;

            this.fillInput(cellA, p, true); 
            this.fillInput(cellB, q, true);
            this.inputTasks = [{id: cellC, expected: (p*q).toString(), formulaRequired: true}];
            
            let hint = isFirstTry ? ` (Ex: =${cellA}*${cellB})` : "";
            consigneEl.innerHTML = `Calcule le total en <span class="target">${cellC}</span> avec le signe *${hint}`;
            setTimeout(() => this.focusInput(cellC), 100);
        }
        // 7. FONCTION SOMME
        else if (this.currentLevel === 7) {
            let total = 0;
            let colName = this.cols[colIndex];
            
            for(let i=1; i<=4; i++) {
                let v = Math.floor(Math.random()*20);
                this.fillInput(colName+i, v, true);
                total += v;
            }
            let targetCell = colName + "5";
            let range = `${colName}1:${colName}4`;
            
            this.inputTasks = [{id: targetCell, expected: total.toString(), formulaRequired: true}];
            
            let hint = isFirstTry ? `<br>Utilise la fonction : <span class="code">=SOMME(${range})</span>` : "";
            consigneEl.innerHTML = `Additionne tout en <span class="target">${targetCell}</span>.${hint}`;
            
            setTimeout(() => this.focusInput(targetCell), 100);
        }
        // 8. MOYENNE
        else if (this.currentLevel === 8) {
            let vals = [];
            let colName = this.cols[colIndex];
            this.fillInput(colName+"5", "", false); 
            
            for(let i=1; i<=4; i++) {
                let v = Math.floor(Math.random() * 10) * 2;
                this.fillInput(colName+i, v, true);
                vals.push(v);
            }
            let avg = vals.reduce((a,b)=>a+b,0) / vals.length;
            let targetCell = colName + "5";
            let range = `${colName}1:${colName}4`;
            
            this.inputTasks = [{id: targetCell, expected: avg.toString(), formulaRequired: true}];
            
            let hint = isFirstTry ? `<br>Utilise : <span class="code">=MOYENNE(${range})</span>` : "";
            consigneEl.innerHTML = `Calcule la moyenne en <span class="target">${targetCell}</span>.${hint}`;
            
            setTimeout(() => this.focusInput(targetCell), 100);
        }
        // 9. BOSS (COMPACT)
        else if (this.currentLevel === 9) {
             this.fillInput("A1","Produit",true); this.fillInput("B1","Px",true); this.fillInput("C1","Qt",true); this.fillInput("D1","TOT",true);
             
             this.fillInput("A2","Pomme",true); 
             this.fillInput("A3","Poire",true);
             this.fillInput("A4","Banane",true); 
             
             this.fillInput("C6","PAYER:",true); 

             let p1 = Math.floor(Math.random()*5)+1; let q1 = Math.floor(Math.random()*5)+1;
             let p2 = Math.floor(Math.random()*5)+1; let q2 = Math.floor(Math.random()*5)+1;
             let p3 = Math.floor(Math.random()*5)+1; let q3 = Math.floor(Math.random()*5)+1;
             
             this.fillInput("B2", p1, true); this.fillInput("C2", q1, true);
             this.fillInput("B3", p2, true); this.fillInput("C3", q2, true);
             this.fillInput("B4", p3, true); this.fillInput("C4", q3, true);

             let tot1 = p1*q1; let tot2 = p2*q2; let tot3 = p3*q3;
             let grandTotal = tot1 + tot2 + tot3;
             
             this.inputTasks = [
                 {id:"D2", expected: tot1.toString(), formulaRequired:true}, 
                 {id:"D3", expected: tot2.toString(), formulaRequired:true}, 
                 {id:"D4", expected: tot3.toString(), formulaRequired:true}, 
                 {id:"D6", expected: grandTotal.toString(), formulaRequired:true}
             ];
             
             let hint1 = isFirstTry ? " (=Px*Qt)" : "";
             let hint2 = isFirstTry ? " (=SOMME)" : "";
             
             consigneEl.innerHTML = `<b>Niveau Boss</b><br>1. Calcule les totaux en D2, D3, D4${hint1}<br>2. Calcule le total final en D6${hint2}`;
             
             setTimeout(() => this.focusInput("D2"), 100);
        }
    },

    // --- CONSTRUCTION DE LA GRILLE ---
    createGenericGrid: function(elementId, isInteractive, modelData = null) {
        const gridEl = this.container.querySelector('#' + elementId);
        gridEl.innerHTML = "";
        
        gridEl.style.gridTemplateColumns = `30px repeat(${this.cols.length}, 40px)`;
        
        gridEl.appendChild(this.createDiv('sp-cell sp-header', ''));
        this.cols.forEach(c => gridEl.appendChild(this.createDiv('sp-cell sp-header', c)));

        this.rows.forEach((r, rIndex) => {
            gridEl.appendChild(this.createDiv('sp-cell sp-header', r));
            this.cols.forEach((c, cIndex) => {
                let cell = document.createElement('div');
                cell.className = 'sp-cell';
                let cellId = c + r;
                cell.dataset.id = cellId; cell.dataset.col = cIndex; cell.dataset.row = rIndex;

                if(modelData) {
                    if(rIndex < 5 && cIndex < 5) {
                        let colorName = modelData[rIndex][cIndex];
                        if(colorName) cell.style.backgroundColor = this.colorStyles[colorName];
                        cell.dataset.targetColor = colorName || 'white';
                    }
                }
                else if (isInteractive) {
                    if (this.currentLevel >= 4) {
                        let input = document.createElement('input');
                        input.type = "text";
                        input.dataset.cellId = cellId;
                        input.autocomplete = "off";
                        input.addEventListener('keydown', (e) => { if(e.key === 'Enter') this.validateTask(input); });
                        
                        input.addEventListener('input', () => this.autoResize(input));
                        input.addEventListener('focus', () => this.autoResize(input));
                        input.addEventListener('blur', () => { 
                            input.style.width = '100%'; 
                            input.style.zIndex = '10';
                        });

                        cell.appendChild(input);
                    } else {
                        this.attachClickEvents(cell);
                    }
                }
                gridEl.appendChild(cell);
            });
        });
    },

    autoResize: function(input) {
        if(!this.canvasContext) return;
        const style = window.getComputedStyle(input);
        this.canvasContext.font = style.font;
        const textWidth = this.canvasContext.measureText(input.value || input.placeholder || "").width;
        const newWidth = Math.max(38, textWidth + 15);
        input.style.width = newWidth + "px";
        input.style.zIndex = "100";
    },

    createDiv: function(cls, txt) {
        const d = document.createElement('div');
        d.className = cls; d.innerText = txt;
        return d;
    },

    cleanGridHighlight: function() {
        this.container.querySelectorAll('.sp-cell').forEach(c => {
             c.classList.remove('selected-zone', 'valid-input', 'invalid-input');
             c.style.color = ''; 
             c.style.backgroundColor = 'white';
             
             const inp = c.querySelector('input');
             if(inp) {
                 inp.value = '';
                 inp.readOnly = false;
                 inp.classList.remove('read-only-input');
                 inp.style.width = '100%';
             }
        });
    },

    attachClickEvents: function(cell) {
        if(this.currentLevel === 1) {
            cell.classList.add('hover-effect');
            cell.onclick = (e) => { 
                if(cell.dataset.id === this.targetData) {
                    cell.style.backgroundColor = '#28a745';
                    cell.style.color = 'white';
                    this.miniWin(cell); 
                }
                else this.fail("Ce n'est pas la bonne case."); 
            };
        } else if (this.currentLevel >= 2) {
            cell.onmousedown = (e) => this.onMouseDown(e);
            cell.onmouseover = (e) => this.onMouseOver(e);
        }
    },

    onMouseDown: function(e) {
        let cell = e.target.closest('.sp-cell');
        if(!cell || !cell.dataset.col) return;
        this.isDragging = true; this.startCell = cell; this.updateSelection(cell);
    },
    onMouseOver: function(e) {
        if (!this.isDragging) return;
        let cell = e.target.closest('.sp-cell');
        if(cell) this.updateSelection(cell);
    },
    onMouseUp: function() {
        if(this.isDragging) {
            this.isDragging = false;
            if (this.currentLevel === 2) {
                let userZone = this.currentSelection[0] + ":" + this.currentSelection[this.currentSelection.length-1];
                if (userZone === this.targetData) this.miniWin(this.selectedCellsElements[this.selectedCellsElements.length-1]); 
                else this.fail("Zone incorrecte");
            } else if (this.currentLevel === 3) {
                this.selectedCellsElements.forEach(c => {
                    c.style.backgroundColor = this.colorStyles[this.selectedColor];
                    c.dataset.userColor = this.selectedColor;
                    c.classList.remove('selected-zone');
                });
            }
        }
    },
    updateSelection: function(endCell) {
        const gridId = (this.currentLevel === 3) ? '#player-grid' : '#main-grid';
        this.container.querySelectorAll(gridId + ' .sp-cell').forEach(c => c.classList.remove('selected-zone'));
        this.currentSelection = []; this.selectedCellsElements = [];
        
        let c1 = parseInt(this.startCell.dataset.col), r1 = parseInt(this.startCell.dataset.row);
        let c2 = parseInt(endCell.dataset.col), r2 = parseInt(endCell.dataset.row);
        
        this.container.querySelectorAll(gridId + ' .sp-cell').forEach(cell => {
            let c = parseInt(cell.dataset.col), r = parseInt(cell.dataset.row);
            if (c >= Math.min(c1, c2) && c <= Math.max(c1, c2) && r >= Math.min(r1, r2) && r <= Math.max(r1, r2)) {
                cell.classList.add('selected-zone');
                this.currentSelection.push(cell.dataset.id);
                this.selectedCellsElements.push(cell);
            }
        });
    },

    // --- MOTEUR DE CALCUL ---
    evaluateFormula: function(formula) {
        let expression = formula.substring(1).toUpperCase(); 
        
        expression = expression.replace(/(SUM|SOMME)\(([A-E][1-6]):([A-E][1-6])\)/g, (match, f, s, e) => { 
            let vals = this.getRangeValues(s, e); 
            return vals.reduce((a, b) => a + b, 0); 
        });
        expression = expression.replace(/(AVERAGE|MOYENNE)\(([A-E][1-6]):([A-E][1-6])\)/g, (match, f, s, e) => { 
            let vals = this.getRangeValues(s, e); 
            return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0; 
        });

        expression = expression.replace(/([A-E][1-6])/g, (match) => { 
            let refInput = this.container.querySelector('input[data-cell-id="' + match + '"]'); 
            if (refInput) { 
                let val = parseFloat(refInput.value); 
                return isNaN(val) ? 0 : val; 
            } 
            return 0; 
        });

        try { 
            if(/[^0-9+\-*/().\s]/.test(expression)) return "Erreur";
            let res = new Function('return ' + expression)(); 
            return Math.round(res * 100) / 100; 
        } catch (err) { return "Erreur"; }
    },

    getRangeValues: function(start, end) {
        let colStart = this.cols.indexOf(start.charAt(0)); 
        let rowStart = parseInt(start.substring(1)) - 1; 
        let colEnd = this.cols.indexOf(end.charAt(0)); 
        let rowEnd = parseInt(end.substring(1)) - 1; 
        let values = [];

        for(let c = Math.min(colStart, colEnd); c <= Math.max(colStart, colEnd); c++) { 
            for(let r = Math.min(rowStart, rowEnd); r <= Math.max(rowStart, rowEnd); r++) { 
                let id = this.cols[c] + (r+1); 
                let input = this.container.querySelector('input[data-cell-id="' + id + '"]'); 
                if(input) { 
                    let val = parseFloat(input.value); 
                    if(!isNaN(val)) values.push(val); 
                } 
            } 
        }
        return values;
    },

    // --- UTILS ---
    miniWin: function(targetElement) {
        this.successCount++;
        this.updateProgressBar();

        if(window.ParticleSystem) window.ParticleSystem.burst(targetElement || this.container, 20);

        if(this.successCount >= this.GOAL) {
            setTimeout(() => this.levelComplete(), 1000);
        } else {
            setTimeout(() => this.generateTask(), 600);
        }
    },

    levelComplete: function() {
        if(this.currentLevel < 9) {
            const nextLvl = this.currentLevel + 1;
            this.showLevelModal(nextLvl, "Niveau terminé ! Bravo !");
        } else {
            if(window.GameSystem) window.GameSystem.showModal({
                title: "CERTIFIÉ EXPERT !", 
                content: "Tu as terminé tous les niveaux de l'École du Tableur. Tu es un pro !",
                actions: [{label:"Recommencer", onClick:() => this.startLevel(1)}]
            });
        }
    },

    showLevelModal: function(lvlToStart, title = "Bienvenue") {
        const content = this.levelIntros[lvlToStart] || "Prêt ?";
        if(window.GameSystem) {
            window.GameSystem.showModal({
                title: title,
                content: `<div style="font-size:1.1rem; color:#555;">${content}</div>`,
                actions: [{
                    label: "C'est parti !", 
                    onClick: () => this.startLevel(lvlToStart)
                }]
            });
        } else {
            this.startLevel(lvlToStart);
        }
    },

    fillInput: function(id, val, locked) {
        const inp = this.container.querySelector(`input[data-cell-id="${id}"]`);
        if(inp) {
            inp.value = val;
            if(locked) { 
                inp.readOnly = true; 
                inp.classList.add('read-only-input'); 
            } else {
                inp.readOnly = false;
                inp.classList.remove('read-only-input');
            }
        }
    },
    
    focusInput: function(id) {
        const inp = this.container.querySelector(`input[data-cell-id="${id}"]`);
        if(inp) inp.focus();
    },

    validateTask: function(input) {
        const task = this.inputTasks.find(t => t.id === input.dataset.cellId);
        if(!task) return;

        let val = input.value.trim().toUpperCase();
        let isValid = false;

        // --- VALIDATION STRICTE ---
        if (task.formulaRequired) {
            // 1. Doit commencer par =
            if (!val.startsWith('=')) {
                this.fail("Commence par =");
                input.classList.add('invalid-input');
                return;
            }
            
            // 2. Doit contenir des Références (A1, B2) OU des Fonctions (SOMME)
            // On interdit les calculs purement numériques type =10+5
            const hasRef = /[A-E][1-9]/.test(val); // Vérifie présence de A1..E9
            const hasFunc = /(SOMME|SUM|MOYENNE|AVERAGE)/.test(val);

            if (!hasRef && !hasFunc) {
                 this.fail("Utilise les références des cases (ex: A1), pas les chiffres !");
                 input.classList.add('invalid-input');
                 return;
            }
            
            // 3. Évaluation du résultat
            let result = this.evaluateFormula(val);
            if (Math.abs(parseFloat(result) - parseFloat(task.expected)) < 0.1) { 
                isValid = true; 
                input.value = result; 
            } else {
                this.fail("Le calcul donne " + result + ". Attendu : " + task.expected);
            }

        } else {
            if (val == task.expected) isValid = true;
        }

        if (isValid) {
            if(!input.classList.contains('valid-input')) {
                input.classList.add('valid-input');
                input.blur();
                this.completedInputs++;
                if(this.completedInputs >= this.inputTasks.length) {
                    this.miniWin(input);
                }
            }
        } else {
            input.classList.add('invalid-input');
        }
    },

    selectColor: function(c, btnElement) {
        this.selectedColor = c;
        this.container.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        if(btnElement) btnElement.classList.add('selected');
    },

    checkPixelArt: function() {
        this.miniWin(this.container.querySelector('#btn-check-art'));
    },

    fail: function(msg) {
        if(window.GameSystem) window.GameSystem.showToast(msg);
    }
};

if (window.GameSystem) window.GameSystem.register('spreadsheet', SpreadsheetGame);