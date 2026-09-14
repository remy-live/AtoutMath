/**
 * games/quiz/math_engine.js
 * Générateur d'exercices mathématiques
 */

const MathEngine = {
    
    // Génère une question selon le type et la difficulté
    generate: function(type, difficulty) {
        switch(type) {
            case 'prio': return this.genPrio(difficulty);
            case 'relatif': return this.genRelatif(difficulty);
            case 'power': return this.genPower(difficulty);
            case 'fraction': return this.genFraction(difficulty);
            default: return this.genPrio(1);
        }
    },

    // --- 1. PRIORITÉS OPÉRATOIRES ---
    genPrio: function(diff) {
        // Diff 1 : a + b * c
        // Diff 2 : (a + b) * c
        const a = this.rand(2, 10);
        const b = this.rand(2, 10);
        const c = this.rand(2, 6);
        
        if (diff === 1) {
            return {
                latex: `${a} + ${b} \\times ${c}`,
                eval: a + (b * c)
            };
        } else {
            return {
                latex: `(${a} + ${b}) \\times ${c}`,
                eval: (a + b) * c
            };
        }
    },

    // --- 2. NOMBRES RELATIFS ---
    genRelatif: function(diff) {
        // Diff 1 : -a + b
        // Diff 2 : -a - (-b)
        const a = this.rand(1, 15);
        const b = this.rand(1, 15);
        
        // On décide aléatoirement des signes
        const s1 = Math.random() > 0.5 ? 1 : -1;
        const s2 = Math.random() > 0.5 ? 1 : -1;
        const valA = a * s1;
        const valB = b * s2;

        const op = Math.random() > 0.5 ? '+' : '-';
        let res = (op === '+') ? valA + valB : valA - valB;

        // Formatage joli : (-5) + (-3)
        const strA = valA < 0 ? `(${valA})` : valA;
        const strB = valB < 0 ? `(${valB})` : valB;

        return {
            latex: `${strA} ${op} ${strB}`,
            eval: res
        };
    },

    // --- 3. PUISSANCES ---
    genPower: function(diff) {
        // Diff 1 : Calcul simple 2^3
        // Diff 2 : Opération 10^2 * 10^3
        if(diff === 1) {
            const base = this.rand(2, 5);
            const exp = this.rand(2, 3);
            return {
                latex: `${base}^{${exp}}`,
                eval: Math.pow(base, exp)
            };
        } else {
            // Pour simplifier l'input, on va demander le calcul sur des puissances de 10
            const exp1 = this.rand(2, 4);
            const exp2 = this.rand(1, 3);
            // Question : 10^2 * 10^3
            return {
                latex: `10^{${exp1}} \\times 10^{${exp2}}`,
                eval: Math.pow(10, exp1 + exp2), // Résultat numérique (ex: 100000)
                hint: `10 puissance ${exp1+exp2}`
            };
        }
    },

    // --- 4. FRACTIONS (Le plus dur) ---
    genFraction: function(diff) {
        // Diff 1 : Même dénominateur (1/5 + 2/5)
        // Diff 2 : Dénominateurs multiples (1/2 + 1/4)
        
        let d1 = this.rand(2, 6); 
        let d2 = d1;
        
        if (diff > 1) d2 = d1 * this.rand(2, 3); // d2 multiple de d1

        let n1 = this.rand(1, d1-1);
        let n2 = this.rand(1, d2-1);

        // On formate pour l'affichage HTML/CSS spécifique
        // On demande le résultat sous forme décimale ou simplifiée ?
        // Pour un jeu web rapide, on va tricher : on va générer des cas qui tombent "juste" 
        // ou proposer un QCM. Ici faisons simple : Somme qui donne un entier ou 0.5
        
        // Astuce : Générer la réponse D'ABORD, puis la question.
        // Ex: On veut que ça fasse 1. 
        // 1/4 + ? = 1 -> 3/4.
        
        // Méthode simple pour démo : a/c + b/c
        const denom = this.rand(2, 5);
        const numA = this.rand(1, 5);
        const numB = this.rand(1, 5);
        
        return {
            isFraction: true, // Flag pour l'affichage
            n1: numA, d1: denom,
            n2: numB, d2: denom,
            op: '+',
            eval: (numA + numB) / denom, // La réponse attendue est décimale (ex: 0.5) pour l'instant
            // Pour bien faire, il faudrait un clavier "Fraction", mais restons simple
            displayRes: `${numA+numB}/${denom}` 
        };
    },

    // Utilitaire
    rand: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};