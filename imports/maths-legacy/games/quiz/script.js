/**
 * games/quiz/script.js
 * Quiz Mathématique Moderne (Style Kahoot/Duolingo)
 */

// On suppose que MathEngine est chargé ou inclus dans ce fichier
// (Tu peux copier le contenu de MathEngine ici si tu ne veux pas gérer de dépendances)

const QuizGame = {
    config: {
        topic: 'prio', // prio, relatif, power, fraction
        difficulty: 1,
        questionsCount: 5
    },

    container: null,
    score: 0,
    currentQIndex: 0,
    
    start: function(container, options = {}) {
        this.container = container;
        // Fusion des options
        this.config = { ...this.config, ...options };
        this.score = 0;
        this.currentQIndex = 0;

        // Préparation du style CSS dynamique pour les fractions
        this.addStyles();

        this.nextQuestion();
    },

    nextQuestion: function() {
        if (this.currentQIndex >= this.config.questionsCount) {
            this.endGame();
            return;
        }

        this.currentQIndex++;
        
        // 1. Générer la question via le Moteur
        // (Assure-toi d'avoir copié l'objet MathEngine au début de ce fichier)
        const data = MathEngine.generate(this.config.topic, this.config.difficulty);
        
        // 2. Générer les mauvaises réponses pour le QCM
        const answers = this.generateDistractors(data.eval);
        
        // 3. Affichage
        this.renderUI(data, answers);
    },

    generateDistractors: function(correctVal) {
        let choices = new Set();
        choices.add(correctVal); // La bonne réponse
        
        while(choices.size < 4) {
            // On crée des pièges proches (ex: +1, -1, signe opposé)
            let trap = correctVal + (Math.floor(Math.random() * 10) - 5);
            if (trap === correctVal) trap = correctVal * -1; // Piège de signe
            if (trap === correctVal) trap = correctVal + 1;
            
            // Pour les décimaux
            if (!Number.isInteger(correctVal)) {
                trap = parseFloat(trap.toFixed(2));
            }
            
            choices.add(trap);
        }
        
        // Mélanger et convertir en tableau
        return Array.from(choices).sort(() => Math.random() - 0.5);
    },

    renderUI: function(data, answers) {
        // Affichage HTML propre
        let questionHTML = '';
        
        if (data.isFraction) {
            // Affichage spécial fraction
            questionHTML = `
                <div class="fraction-eq">
                    <div class="frac"><span class="top">${data.n1}</span><span class="bot">${data.d1}</span></div>
                    <span class="op">${data.op}</span>
                    <div class="frac"><span class="top">${data.n2}</span><span class="bot">${data.d2}</span></div>
                    <span> = ?</span>
                </div>
            `;
        } else {
            // Affichage Latex/Texte standard (On remplace \times par × pour le web)
            let cleanStr = data.latex.replace(/\\times/g, '×').replace(/\\{/g, '').replace(/\\}/g, '');
            questionHTML = `<div class="math-eq">${cleanStr}</div>`;
        }

        const progressPct = ((this.currentQIndex - 1) / this.config.questionsCount) * 100;

        this.container.innerHTML = `
            <div class="quiz-wrapper">
                <div class="quiz-header">
                    <div class="progress-bar"><div class="fill" style="width:${progressPct}%"></div></div>
                    <div class="score-badge">Score: ${this.score}</div>
                </div>

                <div class="question-card">
                    <h2>Question ${this.currentQIndex} / ${this.config.questionsCount}</h2>
                    ${questionHTML}
                </div>

                <div class="answers-grid">
                    ${answers.map(ans => `
                        <button class="ans-btn" onclick="QuizGame.checkAnswer(this, ${ans}, ${data.eval})">
                            ${Number.isInteger(ans) ? ans : ans.toFixed(2)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    checkAnswer: function(btn, value, correct) {
        // On bloque les clics
        const btns = this.container.querySelectorAll('.ans-btn');
        btns.forEach(b => b.disabled = true);

        // On arrondit pour comparer les flottants si besoin
        const isCorrect = Math.abs(value - correct) < 0.001;

        if (isCorrect) {
            btn.classList.add('correct');
            this.score += 100;
            if(window.GameSystem) window.GameSystem.updateScore(this.score);
        } else {
            btn.classList.add('wrong');
            // Montrer la bonne réponse
            btns.forEach(b => {
                // Astuce sale pour retrouver le bon bouton
                if (Math.abs(parseFloat(b.innerText) - correct) < 0.001) b.classList.add('correct');
            });
        }

        // Suite automatique
        setTimeout(() => {
            this.nextQuestion();
        }, 1500);
    },

    endGame: function() {
        if(window.GameSystem) window.GameSystem.stopGame();
    },

    addStyles: function() {
        // Injection de CSS moderne si pas déjà fait
        if (!document.getElementById('quiz-styles')) {
            const style = document.createElement('style');
            style.id = 'quiz-styles';
            style.innerHTML = `
                .quiz-wrapper { max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
                .quiz-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .progress-bar { flex: 1; height: 10px; background: #eee; border-radius: 5px; margin-right: 15px; overflow: hidden; }
                .progress-bar .fill { height: 100%; background: #3498db; transition: width 0.3s; }
                
                .question-card { 
                    background: white; padding: 30px; border-radius: 15px; 
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; margin-bottom: 30px;
                }
                .math-eq { font-size: 2.5rem; font-weight: bold; color: #2c3e50; }
                
                .fraction-eq { display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; }
                .frac { display: inline-flex; flex-direction: column; align-items: center; margin: 0 10px; }
                .frac .top { border-bottom: 3px solid #333; padding-bottom: 2px; display: block; width: 100%; text-align: center; }
                .frac .bot { padding-top: 2px; display: block; width: 100%; text-align: center; }
                
                .answers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .ans-btn { 
                    padding: 20px; font-size: 1.5rem; border: none; border-radius: 10px; 
                    background: #f8f9fa; color: #333; cursor: pointer; transition: all 0.2s;
                    box-shadow: 0 4px 0 #dfe6e9;
                }
                .ans-btn:active { transform: translateY(4px); box-shadow: none; }
                .ans-btn.correct { background: #2ecc71; color: white; box-shadow: 0 4px 0 #27ae60; }
                .ans-btn.wrong { background: #e74c3c; color: white; box-shadow: 0 4px 0 #c0392b; }
            `;
            document.head.appendChild(style);
        }
    }
};

// --- IMPORT DU MOTEUR (Pour que ça marche dans un seul fichier) ---
const MathEngine = {
    generate: function(type, diff) {
        if(type==='relatif') return this.genRelatif(diff);
        if(type==='fraction') return this.genFraction(diff);
        if(type==='power') return this.genPower(diff);
        return this.genPrio(diff);
    },
    rand: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    genPrio: function(diff) {
        const a = this.rand(2, 10), b = this.rand(2, 10), c = this.rand(2, 5);
        return diff === 1 
            ? { latex: `${a} + ${b} \\times ${c}`, eval: a+(b*c) }
            : { latex: `(${a} + ${b}) \\times ${c}`, eval: (a+b)*c };
    },
    genRelatif: function(diff) {
        const a = this.rand(1, 10) * (Math.random()>.5?1:-1);
        const b = this.rand(1, 10) * (Math.random()>.5?1:-1);
        const strA = a<0?`(${a})`:a; const strB = b<0?`(${b})`:b;
        return { latex: `${strA} + ${strB}`, eval: a+b };
    },
    genFraction: function(diff) {
        const d = this.rand(2, 5), n1 = this.rand(1, 5), n2 = this.rand(1, 5);
        return { isFraction: true, n1:n1, d1:d, n2:n2, d2:d, op:'+', eval:(n1+n2)/d };
    },
    genPower: function(diff) {
        const b = this.rand(2, 4), e = this.rand(2, 3);
        return { latex: `${b}^{${e}}`, eval: Math.pow(b, e) };
    }
};

if (window.GameSystem) window.GameSystem.register('quiz', QuizGame);