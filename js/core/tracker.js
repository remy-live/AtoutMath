export const SkillTracker = {
    logs: [],
    
    // context: 'free_play' | 'sequence' | 'remediation'
    logSuccess: function(gameId, concept, context = 'free_play') {
        const entry = {
            timestamp: Date.now(),
            gameId,
            concept,
            context,
            type: 'success'
        };
        this.logs.push(entry);
        this.save();
    },
    
    logError: function(gameId, concept, expectedValue, actualValue, context = 'free_play') {
        const entry = {
            timestamp: Date.now(),
            gameId,
            concept,
            expected: expectedValue,
            actual: actualValue,
            context,
            type: 'error'
        };
        this.logs.push(entry);
        this.save();
    },
    
    save: function() {
        localStorage.setItem('atoutmath_tracker', JSON.stringify(this.logs));
    },
    
    load: function() {
        const stored = localStorage.getItem('atoutmath_tracker');
        if(stored) {
            try { this.logs = JSON.parse(stored); } 
            catch(e) { this.logs = []; }
        }
    },
    
    getErrorsForConcept: function(concept) {
        return this.logs.filter(l => l.type === 'error' && l.concept === concept);
    }
};

SkillTracker.load();
