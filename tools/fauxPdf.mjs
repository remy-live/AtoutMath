// UN FAUX jsPDF QUI TIENT UN CARNET — et le faux `document` qui va avec.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CE FICHIER EXISTE : il y en avait TROIS COPIES.
// `tools/champsRemplissables.mjs`, `tools/ouEcritLEleve.mjs` et
// `tests/revueDu12Octobre.test.mjs` portaient chacun leur propre faux jsPDF,
// et la troisième copie a été écrite le jour même où la première s'est
// révélée incomplète : deux rendus sur quatre-vingts tombaient sur
// « Cannot read properties of undefined (reading 'fontName') » — c'est-à-dire
// que l'outil disait « pas mesurable » d'un rendu parfaitement sain, parce
// qu'il lui manquait une méthode. Corriger cela dans une copie, c'est le
// laisser faux dans les deux autres.
//
// ── CE QUE C'EST ──────────────────────────────────────────────────────────
//
// Les rendus de fiche appellent une quarantaine de méthodes de jsPDF. Les
// énumérer serait une liste à tenir à jour ; un `Proxy` répond à tout, et
// l'on ne nomme que celles dont la VALEUR compte (`getTextWidth` doit rendre
// un nombre, `getFont` un objet avec un `fontName`…) et celles qu'on veut
// NOTER.
//
// Le carnet garde l'ORDRE des appels, et ce n'est pas un détail : « ce
// rectangle blanc est-il passé après la croix ? » ne se lit plus sur le PDF
// fini, où l'on ne voit que le résultat.

/**
 * Le `document` minimal dont un module d'interface a besoin pour se CHARGER
 * hors navigateur. Il ne sert à rien d'autre : aucun rendu ne lit la page, ils
 * y cherchent seulement un canevas pour mesurer du texte et un attribut de
 * thème.
 */
export function poserUnDocumentDeSecours() {
    if (!globalThis.document) {
        globalThis.document = {
            createElement: () => ({
                getContext: () => ({ measureText: () => ({ width: 0 }) }),
                style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
                appendChild() {}
            }),
            documentElement: { dataset: {}, style: {} },
            addEventListener() {}, dispatchEvent() { return true; },
            getElementById: () => null, querySelector: () => null, querySelectorAll: () => []
        };
    }
    // Un `document` fourni par ailleurs (les épreuves en posent un) peut ne pas
    // avoir ces deux-là : `elementsGeo` lit `documentElement.dataset.point` au
    // dessin, et jeter là-dessus ferait dire « rendu cassé » d'un rendu sain.
    if (!globalThis.document.documentElement) globalThis.document.documentElement = {};
    if (!globalThis.document.documentElement.dataset) globalThis.document.documentElement.dataset = {};
    if (!globalThis.window) globalThis.window = { localStorage: null, matchMedia: null };
    return globalThis.document;
}

/**
 * Un jsPDF de papier : il accepte tout, et note ce qu'on lui demande.
 *
 * @returns {object} le faux document, avec un `carnet` :
 *   · `textes` — `{ t, x, y, police, rang }`, le texte écrit ;
 *   · `traits` — `{ x1, y1, x2, y2, rang }` ;
 *   · `rects`  — `{ x, y, w, h, remplissage, rang }` ;
 *   · `ordre`  — tout cela dans l'ordre, pour les questions de SUCCESSION.
 */
export function fauxPdf() {
    const carnet = { textes: [], traits: [], rects: [], ordre: [] };
    let remplissage = [0, 0, 0];
    let police = { fontName: 'helvetica', fontStyle: 'normal' };
    const noter = (quoi, o) => {
        const avecRang = { ...o, rang: carnet.ordre.length };
        carnet[quoi].push(avecRang);
        carnet.ordre.push({ quoi, ...avecRang });
        return avecRang;
    };
    const vrai = {
        carnet,
        // Celles qui doivent RENDRE quelque chose de plausible.
        getTextWidth: (t) => String(t == null ? '' : t).length * 1.9,
        getStringUnitWidth: (t) => String(t == null ? '' : t).length * 0.5,
        splitTextToSize: (t) => [String(t == null ? '' : t)],
        getFontSize: () => 10,
        getLineHeight: () => 12,
        getNumberOfPages: () => 1,
        getFont: () => police,
        setFont: (nom, style) => {
            police = { fontName: nom || police.fontName, fontStyle: style || 'normal' };
        },
        internal: {
            pageSize: { getWidth: () => 210, getHeight: () => 297, width: 210, height: 297 },
            getFontSize: () => 10, scaleFactor: 2.8346
        },
        // Celles qu'on NOTE.
        setFillColor: (...v) => {
            if (v.length >= 3 && v.every(x => typeof x === 'number')) remplissage = v.slice(0, 3);
        },
        text: (t, x, y) => {
            const dit = Array.isArray(t) ? t.join(' ') : String(t == null ? '' : t);
            if (dit.trim()) noter('textes', { t: dit, x: +x || 0, y: +y || 0, police: police.fontStyle });
        },
        line: (x1, y1, x2, y2) => noter('traits', { x1, y1, x2, y2 }),
        rect: (x, y, w, h) => noter('rects', { x, y, w, h, remplissage: remplissage.slice() })
    };
    return new Proxy(vrai, {
        // Tout le reste est un crayon : il dessine et ne rend rien.
        get: (cible, clef) => (clef in cible ? cible[clef] : () => undefined)
    });
}

/**
 * L'emplacement d'essai : large, pour que les rendus qui s'adaptent à la place
 * disponible dessinent tout ce qu'ils savent dessiner.
 */
export const SLOT_ESSAI = {
    x: 12, y: 30, taille: 4, boite: { x: 12, y: 30, w: 86, h: 60 },
    numero: 1, tous: null, rang: 0
};
