// Identifiants et aléatoire déterministe.
//
// Deux besoins distincts :
//  - `uuid()` : identifiant unique d'événement. C'est ce qui rend la fusion
//    multi-appareils triviale (union par id, insertion idempotente côté serveur).
//  - `makeRng(seed)` : générateur pseudo-aléatoire *reproductible*. Une question
//    est décrite par une graine ; rejouer la graine régénère exactement la même
//    question, sur n'importe quel appareil et sans stocker son contenu.

export function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const b = crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    // Dernier recours (environnements sans crypto) : suffisant pour l'unicité locale.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// Identifiant court lisible, pour les codes de partage et les ids de contenu.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans 0/O/1/I : dictable à voix haute
export function shortId(length = 6) {
    let out = '';
    for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return out;
}

export function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}

// Mulberry32 : petit, rapide, séquence stable pour une graine donnée.
function mulberry32(a) {
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * @param {string|number} [seed] - graine ; omise = aléatoire non reproductible
 * @returns {{seed:string, next:()=>number, int:(min:number,max:number)=>number,
 *            pick:<T>(arr:T[])=>T, shuffle:<T>(arr:T[])=>T[], bool:(p?:number)=>boolean}}
 */
export function makeRng(seed) {
    const s = seed === undefined || seed === null ? shortId(8) : String(seed);
    const next = mulberry32(hashString(s));
    const api = {
        seed: s,
        next,
        int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
        pick: arr => arr[Math.floor(next() * arr.length)],
        bool: (p = 0.5) => next() < p,
        shuffle: arr => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(next() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }
    };
    return api;
}

export function randomSeed() {
    return shortId(8);
}
