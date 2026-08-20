// Codes de partage de parcours.
//
// L'ancien format encodait le jeu sur 2 lettres via une table écrite à la
// main (8 jeux sur 15 y figuraient ; les autres devenaient « XX » et
// disparaissaient silencieusement), le nombre de questions sur 1 lettre, et
// les tables en lettres. Impossible de coder une politique, un barème, un
// paramètre non numérique.
//
// Format v2 : le parcours est sérialisé en JSON compact puis encodé en
// base64url. Rien à maintenir quand on ajoute un exercice, et un parcours
// complet (politique + barème + surcharges) tient dans un lien.
//
// Un code v2 commence par « M2- ». Les anciens codes restent décodables.

import { normalizePath, makePath } from './path.js';
import { getExerciseById, exercices } from '../data/catalog.js';
import { defaultPolicy, resolvePolicy } from './policy.js';
import { questionsConseillees } from './duree.js';
import { getGenerator } from './registry.js';

const PREFIX = 'M2-';

/**
 * LE CODE COURT — quatre caractères, pour l'usage le plus fréquent.
 *
 * « Fais l'exercice sur les relatifs ce soir » n'a pas besoin d'un parcours :
 * c'est UN exercice, avec ses réglages d'usine. Le format complet coûtait
 * pourtant 81 caractères de base64 — à recopier sur un téléphone, en devoirs,
 * c'est une faute de frappe garantie et un élève qui abandonne.
 *
 * Le code court est calculé À PARTIR de l'identifiant de l'exercice : rien à
 * tenir à jour quand on en ajoute un, et le code d'un exercice ne change
 * jamais tant que son identifiant ne change pas. On le VÉRIFIE : un test
 * s'assure qu'aucun couple d'exercices du catalogue ne tombe sur le même code.
 *
 * L'alphabet écarte ce qui se lit mal recopié à la main — pas de O contre 0,
 * pas de I contre 1, pas de S contre 5.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
const LONGUEUR_COURT = 4;

export function codeCourt(exerciseId) {
    // FNV-1a, 32 bits : court, sans dépendance, et bien réparti sur des
    // chaînes qui se ressemblent — « num-relatifs-addition » et
    // « num-relatifs-addition-b » doivent tomber loin l'un de l'autre.
    let h = 0x811c9dc5;
    const s = String(exerciseId || '');
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    let out = '';
    for (let i = 0; i < LONGUEUR_COURT; i++) {
        out += ALPHABET[h % ALPHABET.length];
        h = Math.floor(h / ALPHABET.length);
    }
    return out;
}

/** Le code tel qu'on l'écrit au tableau : « REL-K7QP » se lit, « relk7qp » aussi. */
export const normaliserCourt = (code) => String(code || '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5');

/**
 * Le nombre d'unités d'un exercice laissé « tel quel ».
 *
 * Ce n'est plus dix pour tout le monde : une grille de sudoku, une partie
 * d'échecs et une addition ne se comptent pas pareil. Le code court dit « cet
 * exercice, tel quel » — encore faut-il que « tel quel » veuille dire la même
 * chose à l'écriture et à la relecture.
 */
function telQuel(exerciseId) {
    const exo = getExerciseById(exerciseId);
    if (!exo) return 10;
    return questionsConseillees(
        exo.generatorId ? getGenerator(exo.generatorId) : null,
        exo.params || {}, { activite: exo.activityId });
}

/** Ce parcours se résume-t-il à « cet exercice, tel quel » ? */
function estSimple(path) {
    const p = normalizePath(path);
    if (!p.steps || p.steps.length !== 1) return false;
    const s = p.steps[0];
    if (s.overrides && Object.keys(s.overrides).length) return false;
    if (s.threshold !== null && s.threshold !== undefined && s.threshold !== 7) return false;
    if ((s.nbItems || 10) !== telQuel(s.exerciseId) || (s.weight || 1) !== 1 || s.timeLimit) return false;
    const pol = resolvePolicy(p.policy);
    const def = defaultPolicy();
    return pol.mode === def.mode && pol.hints === def.hints
        && pol.maxAttemptsPerItem === def.maxAttemptsPerItem && !pol.grading;
}

// --- base64url ---------------------------------------------------------------

function toBase64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

// Représentation compacte : clés courtes, et on n'émet que ce qui diffère des
// valeurs par défaut. Un parcours simple tient en une trentaine de caractères.
function compact(path) {
    const p = normalizePath(path);
    const pol = resolvePolicy(p.policy);
    const def = defaultPolicy();

    const out = { n: p.name, s: p.steps.map(compactStep) };

    const polOut = {};
    if (pol.mode !== def.mode) polOut.m = pol.mode;
    if (pol.hints !== def.hints) polOut.h = pol.hints ? 1 : 0;
    if (pol.maxAttemptsPerItem !== def.maxAttemptsPerItem) polOut.a = pol.maxAttemptsPerItem;
    if (pol.grading) {
        polOut.g = {
            s: pol.grading.scale || null,
            r: pol.grading.rule || 'firstTry'
        };
    }
    if (Object.keys(polOut).length) out.p = polOut;
    return out;
}

function compactStep(s) {
    const out = { e: s.exerciseId };
    if (s.nbItems && s.nbItems !== 10) out.q = s.nbItems;
    if (s.threshold !== null && s.threshold !== undefined) out.t = s.threshold;
    if (s.weight && s.weight !== 1) out.w = s.weight;
    if (s.timeLimit) out.l = s.timeLimit;
    if (s.overrides && Object.keys(s.overrides).length) out.o = s.overrides;
    return out;
}

function expand(obj) {
    const pol = { ...defaultPolicy() };
    if (obj.p) {
        if (obj.p.m) pol.mode = obj.p.m;
        if (obj.p.h !== undefined) pol.hints = !!obj.p.h;
        if (obj.p.a) pol.maxAttemptsPerItem = obj.p.a;
        if (obj.p.g) pol.grading = { scale: obj.p.g.s, rule: obj.p.g.r, penalties: { hint: 0.25, retry: 0.5 }, arrondi: 0.5 };
    }
    const path = makePath(obj.n || 'Parcours partagé', [], resolvePolicy(pol));
    path.steps = (obj.s || []).map((s, i) => ({
        stepId: `sc_${i}`,
        exerciseId: s.e,
        overrides: s.o || {},
        nbItems: s.q || 10,
        threshold: s.t !== undefined ? s.t : null,
        weight: s.w || 1,
        timeLimit: s.l || null,
        forceSeed: null
    }));
    return path;
}

// --- Décodage des anciens codes ---------------------------------------------

const LEGACY_CODES = {
    AA: 'calc-add', AB: 'calc-mult-flash', AC: 'calc-mult-missing', AD: 'geom-grid',
    AE: 'calc-prio', AF: 'calc-arcade-shooter', AG: 'calc-math-memory', AH: 'calc-labyrinthe'
};

function letterToNum(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return c - 64;
    if (c >= 97 && c <= 122) return c - 70;
    return 1;
}

function decodeLegacy(code) {
    const steps = [];
    code.split('-').forEach((part, i) => {
        if (part.length < 3) return;
        const exerciseId = LEGACY_CODES[part.substring(0, 2)];
        if (!exerciseId || !getExerciseById(exerciseId)) return;
        const nbItems = letterToNum(part.substring(2, 3));
        const tablesChars = part.substring(3);
        const overrides = {};
        if (tablesChars.length) overrides.tables = [...tablesChars].map(letterToNum);
        steps.push({
            stepId: `lg_${i}`, exerciseId, overrides,
            nbItems, threshold: null, weight: 1, timeLimit: null, forceSeed: null
        });
    });
    const path = makePath('Parcours partagé', steps, defaultPolicy());
    path.steps = steps;
    return path;
}

// --- API ---------------------------------------------------------------------

export const Shortcodes = {
    /**
     * @returns {string} code partageable — QUATRE CARACTÈRES quand le parcours
     * se résume à un exercice pris tel quel, le format complet sinon.
     */
    encodePath(path) {
        try {
            const p = normalizePath(path);
            if (estSimple(p)) return codeCourt(p.steps[0].exerciseId);
            return PREFIX + toBase64Url(JSON.stringify(compact(path)));
        } catch (e) {
            console.error('[shortcodes] encodage impossible', e);
            return '';
        }
    },

    /** @returns {Object|null} parcours normalisé v2 */
    decodePath(code) {
        if (!code) return null;
        const trimmed = String(code).trim();
        try {
            if (trimmed.startsWith(PREFIX)) {
                return expand(JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length))));
            }
            const court = this.exerciceDuCodeCourt(trimmed);
            if (court) {
                const path = makePath(court.title || 'Exercice', [], defaultPolicy());
                path.steps = [{
                    stepId: 'sc_0', exerciseId: court.id, overrides: {},
                    nbItems: telQuel(court.id), threshold: 7, weight: 1,
                    timeLimit: null, forceSeed: null
                }];
                return path;
            }
            return decodeLegacy(trimmed);
        } catch (e) {
            console.warn('[shortcodes] code illisible', e);
            return null;
        }
    },

    /** L'exercice désigné par un code court, ou null. */
    exerciceDuCodeCourt(code) {
        const cible = normaliserCourt(code);
        if (cible.length !== LONGUEUR_COURT) return null;
        return exercices.find(e => normaliserCourt(codeCourt(e.id)) === cible) || null;
    },

    shareUrl(path) {
        const code = this.encodePath(path);
        return `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(code)}`;
    },

    // --- Compatibilité avec l'ancienne API ---
    encodeSequence(steps) {
        return this.encodePath(Array.isArray(steps) ? { steps } : steps);
    },
    decodeSequence(code) {
        const path = this.decodePath(code);
        return path ? path.steps : [];
    }
};
