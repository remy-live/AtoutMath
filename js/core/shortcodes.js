// Mapping des jeux aux codes 2 lettres
const GAME_CODES = {
    'calc-add': 'AA',
    'calc-mult-flash': 'AB',
    'calc-mult-missing': 'AC',
    'geom-grid': 'AD',
    'calc-prio': 'AE',
    'calc-arcade-shooter': 'AF',
    'calc-math-memory': 'AG',
    'calc-labyrinthe': 'AH'
};

// Inversion du mapping pour le décodage
const CODE_TO_GAME = Object.fromEntries(Object.entries(GAME_CODES).map(([k, v]) => [v, k]));

function numToLetter(num) {
    if (num < 1) return 'A'; // Fallback
    if (num <= 26) return String.fromCharCode(64 + num); // 1=A, 2=B... 26=Z
    if (num <= 52) return String.fromCharCode(70 + num); // 27=a, 28=b... 52=z (97-27=70)
    return 'Z'; // Max cap for our simple codes
}

function letterToNum(char) {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) return code - 64; // A-Z
    if (code >= 97 && code <= 122) return code - 70; // a-z
    return 1;
}

export const Shortcodes = {
    encodeSequence: function(pathArray) {
        if (!pathArray || pathArray.length === 0) return '';
        
        const parts = pathArray.map(step => {
            // Identifier le jeu. S'il a un ancien ID, le convertir (via catalog)
            // Mais step.id est censé être l'ID final (ou un alias qu'on garde)
            // Pour simplifier, on prend 'calc-add' etc.
            let gameId = step.id;
            // Legacy fallbacks just in case
            if (gameId === 'e1') gameId = 'calc-add';
            if (gameId === 'e2') gameId = 'geom-grid';
            if (gameId === 'e3') gameId = 'calc-prio';
            if (gameId === 'e4') gameId = 'calc-mult-flash';
            if (gameId === 'e5') gameId = 'calc-mult-missing';

            const gameCode = GAME_CODES[gameId] || 'XX';
            
            let codeStr = gameCode;

            // Paramètre 1: nbQuestions (1 lettre)
            const nbQ = (step.currentParams && step.currentParams.nbQuestions) || 5;
            codeStr += numToLetter(nbQ);

            // Paramètre 2: tables (N lettres)
            if (step.currentParams && step.currentParams.tables && step.currentParams.tables.length > 0) {
                // Trier les tables pour l'ordre (ex: 2, 3 -> BC)
                const sortedTables = [...step.currentParams.tables].sort((a,b)=>a-b);
                sortedTables.forEach(t => {
                    codeStr += numToLetter(t);
                });
            }

            return codeStr;
        });

        return parts.join('-');
    },
    
    decodeSequence: function(shortcode, catalog) {
        if(!shortcode) return [];
        const parts = shortcode.split('-');
        const sequence = [];
        
        parts.forEach(part => {
            if(part.length < 3) return; // Minimum 2 lettres jeu + 1 lettre nbQ
            
            const gameCode = part.substring(0, 2);
            const nbQChar = part.substring(2, 3);
            const tablesChars = part.substring(3); // Reste des lettres

            const gameId = CODE_TO_GAME[gameCode];
            if (!gameId) return;

            const baseExo = catalog.find(ex => ex.id === gameId);
            if(baseExo) {
                const step = JSON.parse(JSON.stringify(baseExo));
                
                const nbQ = letterToNum(nbQChar);
                step.currentParams = { nbQuestions: nbQ };

                if (tablesChars.length > 0) {
                    const tables = [];
                    for(let i=0; i < tablesChars.length; i++) {
                        tables.push(letterToNum(tablesChars[i]));
                    }
                    step.currentParams.tables = tables;
                }
                
                sequence.push(step);
            }
        });
        
        return sequence;
    }
};
