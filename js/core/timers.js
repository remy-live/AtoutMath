export let activeTimeouts = [];
export let activeIntervals = [];

export function clearEngines() {
    activeTimeouts.forEach(clearTimeout);
    activeIntervals.forEach(clearInterval);
    activeTimeouts = []; activeIntervals = [];
}

export function regTimeout(fn, ms) { 
    const t = setTimeout(fn, ms); 
    activeTimeouts.push(t); 
    return t; 
}

export function regInterval(fn, ms) { 
    const t = setInterval(fn, ms); 
    activeIntervals.push(t); 
    return t; 
}
