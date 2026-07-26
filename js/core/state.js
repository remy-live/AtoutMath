export const state = {
    currentPath: [],
    currentPathId: null, // Si null, c'est un nouveau parcours
    teacherPaths: [],
    isTeacherMode: false,
    isMobileView: false,
    activeExo: null, // "math_operations", "tactile_hunter", etc.
    previewDeviceMode: 'mobile',
    selectedNiveaux: [],
    navStack: [],
    score: 0,
    badges: {}, // key: badgeId, value: timestamp
    errorHistory: [],
    teacherFolders: [],
    studentPath: null, // { steps: [...], completed: [stepId, ...] } ou null si aucun parcours assigné
    timeSpentTotal: 0, // in seconds
    timeSpentPerGame: {}, // { "math_operations": 120, ... }

    load: async function() {
        if (typeof localforage === 'undefined') {
            console.error("localforage is not loaded!");
            return;
        }
        
        try {
            const storedScore = await localforage.getItem('atoutmath_score');
            if (storedScore !== null) this.score = parseInt(storedScore);
            
            const storedBadges = await localforage.getItem('atoutmath_badges');
            if (storedBadges) this.badges = storedBadges;

            const storedErrors = await localforage.getItem('atoutmath_errors');
            if (storedErrors) this.errorHistory = storedErrors;

            const storedTeacherPaths = await localforage.getItem('atoutmath_teacherPaths');
            if (storedTeacherPaths) this.teacherPaths = storedTeacherPaths;

            const storedTeacherFolders = await localforage.getItem('atoutmath_teacherFolders');
            if (storedTeacherFolders) this.teacherFolders = storedTeacherFolders;

            const storedTimeTotal = await localforage.getItem('atoutmath_timeTotal');
            if (storedTimeTotal) this.timeSpentTotal = storedTimeTotal;

            const storedTimePerGame = await localforage.getItem('atoutmath_timePerGame');
            if (storedTimePerGame) this.timeSpentPerGame = storedTimePerGame;

            const storedNiveaux = await localforage.getItem('atoutmath_selectedNiveaux');
            if (storedNiveaux) this.selectedNiveaux = storedNiveaux;

            const storedStudentPath = await localforage.getItem('atoutmath_studentPath');
            if (storedStudentPath) this.studentPath = storedStudentPath;

            document.dispatchEvent(new CustomEvent('score_updated'));
            document.dispatchEvent(new CustomEvent('badges_updated'));
            document.dispatchEvent(new CustomEvent('errors_updated'));
            document.dispatchEvent(new CustomEvent('teacherPaths_updated'));
            document.dispatchEvent(new CustomEvent('teacherFolders_updated'));
            document.dispatchEvent(new CustomEvent('time_updated'));
        } catch (e) {
            console.error("Error loading state from localforage:", e);
        }
    },

    addScore: function(points) {
        this.score += points;
        if (typeof localforage !== 'undefined') {
            localforage.setItem('atoutmath_score', this.score);
        }
        document.dispatchEvent(new CustomEvent('score_updated'));
    },

    addTime: function(gameId, seconds) {
        this.timeSpentTotal += seconds;
        if (!this.timeSpentPerGame[gameId]) this.timeSpentPerGame[gameId] = 0;
        this.timeSpentPerGame[gameId] += seconds;
        
        if (typeof localforage !== 'undefined') {
            localforage.setItem('atoutmath_timeTotal', this.timeSpentTotal);
            localforage.setItem('atoutmath_timePerGame', this.timeSpentPerGame);
        }
        document.dispatchEvent(new CustomEvent('time_updated'));
    },

    setSelectedNiveaux: function(niveaux) {
        this.selectedNiveaux = niveaux;
        if (typeof localforage !== 'undefined') {
            localforage.setItem('atoutmath_selectedNiveaux', this.selectedNiveaux);
        }
    },

    // Parcours assigné à l'élève (via un code prof) et suivi de sa progression
    setStudentPath: function(steps) {
        this.studentPath = {
            steps: steps.map((s, i) => ({ ...s, stepId: s.stepId || `sp_${i}` })),
            completed: []
        };
        if (typeof localforage !== 'undefined') {
            localforage.setItem('atoutmath_studentPath', this.studentPath);
        }
        document.dispatchEvent(new CustomEvent('studentPath_updated'));
    },

    markStudentPathStepCompleted: function(stepId) {
        if (!this.studentPath) return;
        if (!this.studentPath.completed.includes(stepId)) {
            this.studentPath.completed.push(stepId);
            if (typeof localforage !== 'undefined') {
                localforage.setItem('atoutmath_studentPath', this.studentPath);
            }
            document.dispatchEvent(new CustomEvent('studentPath_updated'));
        }
    },

    grantBadge: function(badgeId) {
        if (!this.badges[badgeId]) {
            this.badges[badgeId] = Date.now();
            if (typeof localforage !== 'undefined') {
                localforage.setItem('atoutmath_badges', this.badges);
            }
            document.dispatchEvent(new CustomEvent('badges_updated'));
            document.dispatchEvent(new CustomEvent('badge_unlocked', { detail: badgeId }));
        }
    },
    
    showFeedback: function(msg, isError=true) {
        document.dispatchEvent(new CustomEvent('game_feedback', { detail: { msg, isError } }));

        
        if (isError && this.activeSequenceRunner) {
            this.activeSequenceRunner.onGameAction(false); // false = error
        }
    },
    
    celebrate: function(element, points=10) {
        this.addScore(points);
        
        const overlay = document.createElement('div');
        overlay.innerHTML = `<div style="margin-bottom:5px; color:var(--success);"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><div style="font-size:1.5rem; font-weight:bold;">Bonne réponse !</div><div style="font-size:1.1rem; margin-top:5px; background:#dcfce7; color:var(--success); padding:4px 12px; border-radius:12px; font-weight:bold;">+${points} points</div>`;
        overlay.style = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:white; z-index:10000; display:flex; flex-direction:column; justify-content:center; align-items:center; color:var(--success); animation: popInCenter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 25px 40px; border-radius:24px; box-shadow:0 10px 30px rgba(0,0,0,0.15); border:3px solid #bbf7d0;";
        const gameLayer = document.getElementById('game-layer') || document.body;
        gameLayer.appendChild(overlay);
        
        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
            overlay.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }, 1200);

        if (element) {
            element.style.transform = 'scale(1.1)';
            setTimeout(() => element.style.transform = '', 200);
        }
        
        if (this.activeSequenceRunner) {
            this.activeSequenceRunner.onGameAction(true); // true = success
        }
    },
    
    logError: function(exo, questionData, userAnswer) {
        if (!exo || !exo.id) return;
        
        // Prevent duplicate errors for the exact same question
        const exists = this.errorHistory.find(e => e.exoId === exo.id && JSON.stringify(e.questionData) === JSON.stringify(questionData) && !e.corrected);
        if (exists) return; // Already tracking this error

        const newError = {
            id: 'err_' + Date.now(),
            exoId: exo.id,
            exoTitle: exo.title,
            questionData,
            userAnswer,
            timestamp: Date.now(),
            corrected: false
        };
        this.errorHistory.unshift(newError);
        this.saveErrors();
    },
    
    markErrorCorrected: function(errorId) {
        const err = this.errorHistory.find(e => e.id === errorId);
        if (err) {
            err.corrected = true;
            this.saveErrors();
            document.dispatchEvent(new CustomEvent('error_corrected', { detail: errorId }));
        }
    },
    
    removeError: function(errorId) {
        this.errorHistory = this.errorHistory.filter(e => e.id !== errorId);
        this.saveErrors();
    },
    
    saveErrors: function() {
        if (typeof localforage !== 'undefined') {
            localforage.setItem('atoutmath_errors', this.errorHistory);
        }
        document.dispatchEvent(new CustomEvent('errors_updated'));
    },

    // Teacher Paths Management
    saveTeacherPath: function(name, pathData, folderId = 'root') {
        const newPath = {
            id: 'path_' + Date.now(),
            name: name,
            data: pathData,
            folderId: folderId,
            timestamp: Date.now()
        };
        this.teacherPaths.unshift(newPath);
        this.saveTeacherPaths();
        return newPath;
    },

    updateTeacherPath: function(id, name, pathData) {
        const p = this.teacherPaths.find(p => p.id === id);
        if (p) {
            if (name) p.name = name;
            if (pathData) p.data = pathData;
            p.timestamp = Date.now();
            this.saveTeacherPaths();
        }
    },

    moveTeacherPath: function(pathId, folderId) {
        const p = this.teacherPaths.find(p => p.id === pathId);
        if (p) {
            p.folderId = folderId;
            p.timestamp = Date.now();
            this.saveTeacherPaths();
        }
    },

    removeTeacherPath: function(id) {
        this.teacherPaths = this.teacherPaths.filter(p => p.id !== id);
        this.saveTeacherPaths();
    },

    saveTeacherPaths: function() {
        if (typeof localforage !== 'undefined') {
            localforage.setItem('atoutmath_teacherPaths', this.teacherPaths);
        }
        document.dispatchEvent(new CustomEvent('teacherPaths_updated'));
    },

    // Teacher Folders Management
    addTeacherFolder: function(name) {
        const newFolder = {
            id: 'folder_' + Date.now(),
            name: name,
            timestamp: Date.now()
        };
        this.teacherFolders.push(newFolder);
        this.saveTeacherFolders();
        return newFolder;
    },

    renameTeacherFolder: function(id, name) {
        const f = this.teacherFolders.find(f => f.id === id);
        if (f) {
            f.name = name;
            f.timestamp = Date.now();
            this.saveTeacherFolders();
        }
    },

    removeTeacherFolder: function(id) {
        this.teacherFolders = this.teacherFolders.filter(f => f.id !== id);
        // Also move paths inside this folder back to root
        this.teacherPaths.forEach(p => {
            if (p.folderId === id) p.folderId = 'root';
        });
        this.saveTeacherFolders();
        this.saveTeacherPaths();
    },

    saveTeacherFolders: function() {
        if (typeof localforage !== 'undefined') {
            localforage.setItem('atoutmath_teacherFolders', this.teacherFolders);
        }
        document.dispatchEvent(new CustomEvent('teacherFolders_updated'));
    }
};
