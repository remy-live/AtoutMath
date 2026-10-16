/**
 * LE SENS DE ROTATION ANNONCÉ EST-IL CELUI QU'ON VOIT ?
 *
 * RÉMY, sur la Mosaïque des Transformations : « je pense que tu fais une
 * erreur sur le sens direct et indirect ».
 *
 * ── ON NE RELIT PAS LE CODE, ON CALCULE ────────────────────────────────────
 *
 * Pour chaque question de rotation, on prend le centre et le centre de gravité
 * de la pièce de départ, puis celui de son image. On projette les deux dans le
 * repère de l'ÉCRAN tel que l'exercice le pose, et le signe du produit
 * vectoriel dit de quel côté cela tourne. On compare alors au MOT de l'énoncé.
 *
 * LES DEUX EXERCICES NE REGARDENT PAS LE PLAN DU MÊME CÔTÉ, et c'est tout le
 * sujet :
 *
 *   · le quadrillage dessine avec l'ordonnée qui DESCEND (`versDessin(v) =
 *     v + 0.5`, le repère naturel d'un SVG) ;
 *   · la mosaïque la retourne — `Y(y) = y1 - y` à l'écran, `y0 + (bo.y1 - y)`
 *     sur la feuille —, donc le même quart de tour s'y voit à l'envers.
 *
 * Les deux dessins sont bons. C'est le mot qui doit suivre, et c'est
 * `sensDe({ ordonneeMonte })` qui porte la question, à un seul endroit.
 *
 *   node tools/sensDeLaRotation.mjs
 */
import { generator as mosaique } from '../js/core/generators/pavageImage.js';
import { transfoQuadrillageGenerator as quadrillage } from '../js/core/generators/transfoQuadrillage.js';
import { makeRng } from '../js/core/ids.js';

/** Le sens vu, dans le repère de l'écran. `yMonte` : l'ordonnée monte-t-elle ? */
export function sensVu(centre, a, b, yMonte) {
    const proj = (p) => ({ x: p.x, y: yMonte ? -p.y : p.y });
    const c = proj(centre), u = proj(a), v = proj(b);
    const z = (u.x - c.x) * (v.y - c.y) - (u.y - c.y) * (v.x - c.x);
    // Dans un repère d'écran (y vers le bas), z > 0 tourne dans le sens des
    // AIGUILLES — c'est le sens indirect.
    return z > 0 ? 'indirect' : (z < 0 ? 'direct' : 'confondu');
}

const moy = (l) => ({ x: l.reduce((s, p) => s + p.x, 0) / l.length,
                      y: l.reduce((s, p) => s + p.y, 0) / l.length });

const motDeLEnonce = (texte) => /sens direct/.test(texte) ? 'direct'
    : (/sens indirect/.test(texte) ? 'indirect' : '?');

/** Les rotations d'un exercice, avec le mot annoncé et le sens vu. */
export function rotationsDe(quoi, combien = 12) {
    const out = [];
    for (let i = 0; i < 800 && out.length < combien; i++) {
        const it = quoi.generer(makeRng(`${quoi.cle}_${i}`));
        if (!it) continue;
        const d = quoi.lire(it);
        if (!d) continue;
        const quarts = (((d.quarts % 4) + 4) % 4);
        if (quarts === 2) continue;   // le demi-tour n'a pas de sens
        out.push({
            quarts,
            dit: motDeLEnonce(it.prompt.text),
            vu: sensVu(d.centre, moy(d.depart), moy(d.image), quoi.ordonneeMonte),
            texte: it.prompt.text
        });
    }
    return out;
}

export const LA_MOSAIQUE = {
    cle: 'mo', nom: 'La Mosaïque des Transformations',
    // `Y(y) = MARGE + (y1 - y) * COTE` — l'ordonnée MONTE.
    ordonneeMonte: true,
    generer: (rng) => mosaique.generate({ genres: ['rotation'], montrer: 'si-faux' }, { rng }),
    lire: (it) => {
        if (!it.meta || it.meta.genre !== 'rotation' || !it.meta.transfo) return null;
        const piece = (n) => (it.meta.pieces || []).find(p => p.n === n);
        const depart = (piece(it.meta.depuis) || {}).cases;
        const image = (piece(it.meta.vers) || {}).cases;
        if (!depart || !image || !depart.length) return null;
        return { centre: it.meta.transfo.centre, quarts: it.meta.transfo.quarts, depart, image };
    }
};

export const LE_QUADRILLAGE = {
    cle: 'qu', nom: 'Tracer l\'image sur le quadrillage',
    // `versDessin(v) = v + 0.5` — l'ordonnée DESCEND.
    ordonneeMonte: false,
    generer: (rng) => quadrillage.generate({ genres: ['rotation'], taille: 'moyen' }, { rng }),
    lire: (it) => {
        if (!it.meta || it.meta.genre !== 'rotation') return null;
        const { depart, image, transfo } = it.meta;
        if (!depart || !image || !depart.length) return null;
        return { centre: transfo.centre, quarts: transfo.quarts, depart, image };
    }
};

// Lancé à la main, il imprime ; importé par l'épreuve, il se tait.
if (process.argv[1] && process.argv[1].endsWith('sensDeLaRotation.mjs')) {
    let total = 0;
    for (const quoi of [LA_MOSAIQUE, LE_QUADRILLAGE]) {
        console.log(`\n\x1b[1m${quoi.nom}\x1b[0m  (ordonnée `
            + `${quoi.ordonneeMonte ? 'MONTE' : 'DESCEND'})`);
        const r = rotationsDe(quoi);
        for (const x of r) {
            const ok = x.dit === x.vu;
            if (!ok) total++;
            console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} quarts=${x.quarts}`
                + `  énoncé « ${x.dit} » — à l'écran « ${x.vu} »`);
        }
        console.log(`  ${r.length} rotations examinées.`);
    }
    console.log(total === 0 ? '\n\x1b[32mLE MOT DIT CE QU\'ON VOIT.\x1b[0m'
        : `\n\x1b[31m${total} désaccord(s).\x1b[0m`);
    process.exit(total === 0 ? 0 : 1);
}
