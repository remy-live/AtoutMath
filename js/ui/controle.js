// LE CONTRÔLE D'UN EXERCICE — les sondes de l'audit, dans le navigateur.
//
// Rémy : « peut-être as-tu une meilleure méthode pour déboguer efficacement ».
//
// LA MÉTHODE EXISTE, ELLE ÉTAIT SEULEMENT HORS DE PORTÉE. `tools/audit.mjs`
// ouvre l'application dans un vrai navigateur, lance les cent cinquante-deux
// exercices, et MESURE — le plateau s'est-il garni, en combien de temps,
// qu'est-ce qui sort de la vitre, la console a-t-elle crié. C'est ce qui
// permet de dire « la case passait de 159 pixels à 87 » au lieu de « c'est
// moins beau ». Mais il faut une ligne de commande, un serveur local et
// Playwright : Rémy n'y a pas accès, et surtout il ne peut pas le lancer sur
// L'EXERCICE QU'IL EST EN TRAIN DE REGARDER, avec SES réglages.
//
// Ce module rend les mêmes sondes utilisables depuis la page. L'Atelier s'en
// sert pour contrôler l'exercice courant en trois formats d'écran — téléphone,
// tablette, ordinateur — et rend un verdict qu'on peut lire, copier, envoyer.
//
// ON MONTRE CE QU'ON MESURE, et ce n'est pas de la décoration. Un cadre posé
// hors de l'écran est bridé par le navigateur : les jeux qui dessinent à chaque
// image n'y avancent pas, et l'on conclurait « plateau vide » sur un exercice
// qui marche. Le cadre du contrôle est donc VISIBLE, à sa vraie taille, réduit
// par une simple mise à l'échelle — ce qui ne change rien à la mise en page
// qu'il contient : un téléphone de 390 pixels reste un téléphone de 390 pixels,
// même affiché deux fois plus petit.
//
// CE QU'ON NE PEUT PAS SIMULER, ET QU'ON DIT : le pointeur. Une fenêtre étroite
// n'est pas un téléphone — pas de `(pointer: coarse)`, donc les règles qui
// visent le tactile ne s'appliquent pas. Le contrôle mesure une mise en page,
// pas un appareil, et le rapport le rappelle.

/** Les formats contrôlés. Ce sont ceux des appareils de la classe. */
export const FORMATS = [
    { id: 'telephone', nom: 'Téléphone', l: 390, h: 844 },
    { id: 'tablette', nom: 'Tablette', l: 820, h: 1180 },
    { id: 'ordinateur', nom: 'Ordinateur', l: 1280, h: 800 }
];

/** Au-delà, on considère que le plateau ne viendra plus. */
const ABANDON = 6000;
/** Le délai au-delà duquel une première image se remarque. */
const LENT = 1500;

const attendre = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Le plateau s'est-il garni ? Même sonde que l'audit : du TEXTE ou un élément
 * qui se joue. Un plateau qui ne porte que son en-tête est vide.
 */
export function plateauGarni(doc) {
    const z = doc.getElementById('game-board');
    if (!z) return false;
    const t = (z.textContent || '').trim().length;
    const n = z.querySelectorAll('canvas,svg,button,input,select,textarea,.game-question,img').length;
    return t >= 3 || n > 0;
}

/** L'aperçu de la fiche s'est-il garni ? */
export function apercuGarni(doc) {
    const a = doc.querySelector('.fp-apercu, #fq-apercu, [id$="-apercu"]');
    if (!a) return null;
    return a.children.length > 0;
}

/**
 * CE QUI SORT DU PLATEAU — et la sonde de l'audit était AVEUGLE.
 *
 * L'audit mesurait par rapport à la VITRE, en écartant tout ce qu'un cadre
 * découpe : « un élément qui sort de l'écran n'est un défaut que si rien ne le
 * DÉCOUPE ». La règle est juste — les météorites du jeu de tir entrent en scène
 * par le bord, c'est leur métier — mais elle remontait la chaîne des parents à
 * partir de l'élément lui-même, et le PREMIER parent est le plateau, qui porte
 * `overflow: hidden auto`. Tout élément du plateau était donc « découpé », donc
 * innocenté. Mesuré en lui posant exprès une boîte de trois cents pixels à 120 %
 * de la largeur : la sonde rendait une liste vide. Elle n'avait jamais rien
 * trouvé, et pour cause.
 *
 * ON MESURE DONC PAR RAPPORT AU PLATEAU, qui est le vrai cadre : c'est lui
 * qu'on remplit, et ce qui en sort horizontalement est perdu — le plateau ne
 * défile pas de ce côté-là. La règle d'innocence reste, mais elle s'arrête AU
 * plateau : un cadre intérieur qui découpe volontairement — la fenêtre glissante
 * de l'organigramme, par exemple — ne se signale pas.
 *
 * ET LE PLATEAU LUI-MÊME EST MESURÉ : s'il faut le faire glisser sur le côté
 * pour voir la fin d'une question, c'est un défaut, quelle qu'en soit la cause.
 */
export function debordements(doc) {
    const zone = doc.getElementById('game-board') || doc.body;
    const vue = doc.defaultView;
    if (!zone || !vue) return [];
    const cadre = zone.getBoundingClientRect();
    const out = [];
    const glisse = zone.scrollWidth - zone.clientWidth;
    if (glisse > 4) out.push({ px: glisse, quoi: 'le plateau lui-même glisse sur le côté' });

    const decoupe = (el) => {
        for (let n = el.parentElement; n && n !== zone; n = n.parentElement) {
            if (vue.getComputedStyle(n).overflow !== 'visible') return true;
        }
        return false;
    };
    zone.querySelectorAll('*').forEach(el => {
        // L'intérieur d'un SVG se place dans le repère du DESSIN, pas dans celui
        // de la page : le mesurer remontait cinquante faux positifs par écran.
        if (el.ownerSVGElement) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const cs = vue.getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const d = Math.round(Math.max(r.right - cadre.right, cadre.left - r.left));
        if (d > 4 && !decoupe(el)) {
            out.push({
                px: d,
                quoi: `${el.className || el.tagName} « ${(el.textContent || '').trim()
                    .replace(/\s+/g, ' ').slice(0, 32)} »`
            });
        }
    });
    return out.sort((a, b) => b.px - a.px).slice(0, 5);
}

/** Le journal de console du volet — il se pose sur `window` en mode volet. */
export function journalDuVolet(win) {
    try {
        const lire = win && win.__journalAtelier;
        return typeof lire === 'function' ? lire() : [];
    } catch (e) { return []; }
}

/**
 * UN SONDAGE : on charge une adresse dans un cadre d'une taille donnée, on
 * attend que ça se garnisse, et on mesure.
 *
 * @param {Object} o
 * @param {string} o.url      - l'adresse d'un volet de l'Atelier
 * @param {Object} o.format   - un élément de FORMATS
 * @param {HTMLElement} o.scene - où poser le cadre pendant la mesure
 * @param {string} o.quoi     - 'jeu' | 'demo' | 'fiche'
 * @returns {Promise<Object>} le verdict de ce format
 */
export async function sonder({ url, format, scene, quoi }) {
    const cadre = document.createElement('iframe');
    cadre.className = 'ctl-cadre';
    cadre.title = `Contrôle — ${format.nom}`;
    cadre.style.width = `${format.l}px`;
    cadre.style.height = `${format.h}px`;
    scene.appendChild(cadre);
    // La mise à l'échelle n'entre PAS dans le cadre : à l'intérieur, la page
    // croit toujours mesurer 390 pixels de large. C'est ce qui permet de
    // regarder un téléphone sur un écran d'ordinateur sans mentir.
    const k = Math.min(1, (scene.clientWidth - 8) / format.l, (scene.clientHeight - 8) / format.h);
    cadre.style.transform = `scale(${k.toFixed(3)})`;

    const bilan = { format: format.id, nom: format.nom, quoi, ms: null, soucis: [] };
    try {
        await new Promise((ok, ko) => {
            const minuteur = setTimeout(() => ko(new Error('la page ne s\'est pas chargée')), ABANDON);
            cadre.onload = () => { clearTimeout(minuteur); ok(); };
            cadre.onerror = () => { clearTimeout(minuteur); ko(new Error('chargement refusé')); };
            cadre.src = url;
        });
        const doc = cadre.contentDocument;
        const t0 = performance.now();
        const pret = quoi === 'fiche'
            ? () => apercuGarni(doc) === true
            : () => plateauGarni(doc);
        while (performance.now() - t0 < ABANDON && !pret()) await attendre(100);
        if (!pret()) {
            bilan.soucis.push(quoi === 'fiche'
                ? 'VIDE : l\'aperçu de la feuille ne se garnit pas'
                : 'VIDE : le plateau reste vide');
        } else {
            bilan.ms = Math.round(performance.now() - t0);
            if (bilan.ms > LENT) bilan.soucis.push(`LENT : ${bilan.ms} ms avant la première image`);
        }
        // On laisse la scène respirer : plusieurs jeux posent leur décor en
        // deux temps, et l'on mesure ce que l'élève voit, pas la première image.
        await attendre(700);
        debordements(doc).forEach(d => bilan.soucis.push(`DÉBORDE de ${d.px} px : ${d.quoi}`));
        journalDuVolet(cadre.contentWindow)
            .filter(l => l.niveau === 'error')
            .slice(-4)
            .forEach(l => bilan.soucis.push(`CONSOLE : ${String(l.texte).slice(0, 150)}`));
    } catch (e) {
        bilan.soucis.push(`LANCEMENT : ${String((e && e.message) || e).slice(0, 150)}`);
    } finally {
        cadre.remove();
    }
    return bilan;
}

/** Le rapport, en texte — c'est lui qui part dans le relevé. */
export function rapportEnTexte(bilans) {
    const lignes = [];
    bilans.forEach(b => {
        const tete = `${b.nom} · ${b.quoi}${b.ms === null ? '' : ` · ${b.ms} ms`}`;
        if (!b.soucis.length) lignes.push(`- ${tete} : rien à signaler`);
        else {
            lignes.push(`- ${tete} :`);
            b.soucis.forEach(s => lignes.push(`    · ${s}`));
        }
    });
    lignes.push('(Le format « Téléphone » mesure une mise en page de 390 pixels, '
        + 'pas un appareil tactile : les règles qui visent le doigt ne s\'y appliquent pas.)');
    return lignes.join('\n');
}
