// UNE CAMÉRA DE PAPIER : un fichier Y4M qui montre notre propre QR code.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Chromium sait remplacer la caméra par un fichier
// (`--use-file-for-fake-video-capture`), à condition qu'il soit en Y4M — un
// format sans compression : un en-tête de texte, puis les images, chacune en
// I420 (un plan de luminance pleine taille, deux plans de chrominance au
// quart).
//
// Un QR est NOIR ET BLANC : la luminance suffit, et les deux plans de
// chrominance valent 128 partout (gris neutre). C'est pour cela qu'on peut
// écrire ce fichier à la main en quarante lignes, sans dépendance.
//
//   node tools/qrEnCamera.mjs <texte> [sortie.y4m]
//   node tools/qrEnCamera.mjs --blanc  [sortie.y4m]
//
// ── POURQUOI UNE CAMÉRA QUI NE MONTRE RIEN ────────────────────────────────
//
// Parce qu'un QR est lu en moins de trois cents millisecondes : une sonde qui
// veut regarder l'ÉCRAN D'AVANT — la porte d'entrée, le bouton, la phrase
// d'attente du scanner — arrive toujours trop tard, et annonce « bouton
// ABSENT » devant un logiciel qui marche. Payé deux fois le même jour, la
// seconde avec un QR étranger (qui referme le scanner lui aussi, voir
// `Shortcodes.codeDeSeanceLu`). Le mur blanc laisse la fenêtre ouverte aussi
// longtemps qu'on veut.

import { writeFileSync } from 'node:fs';
import { qrcode } from '../js/core/qrcode.js';

const L = 640, H = 480;            // une caméra de tablette d'entrée de gamme
const MARGE = 4;                   // en modules : la « zone de silence » de la norme

/** Les trois plans d'une image I420, répétés dix fois. */
function ecrire(sortie, Y) {
    const U = Buffer.alloc((L / 2) * (H / 2), 128);
    const V = Buffer.alloc((L / 2) * (H / 2), 128);
    // DIX IMAGES IDENTIQUES : le lecteur en regarde plusieurs avant de
    // conclure, et un fichier d'une seule image boucle d'une façon que
    // Chromium n'aime pas.
    const morceaux = [Buffer.from(`YUV4MPEG2 W${L} H${H} F25:1 Ip A1:1 C420\n`)];
    for (let i = 0; i < 10; i++) morceaux.push(Buffer.from('FRAME\n'), Y, U, V);
    writeFileSync(sortie, Buffer.concat(morceaux));
}

/** Un mur blanc : aucune caméra, aucun QR, et le scanner reste ouvert. */
export function cameraBlanche(sortie = 'tools/tmp/camera-blanche.y4m') {
    ecrire(sortie, Buffer.alloc(L * H, 235));
    return sortie;
}

/** Ce texte, en QR, au milieu d'un mur blanc. */
export function cameraQr(texte, sortie = 'tools/tmp/camera-qr.y4m') {
    const q = qrcode(texte);
    if (!q) throw new Error('ce texte ne tient dans aucune version de QR gérée');
    const cote = q.taille + MARGE * 2;
    const k = Math.floor(Math.min(L, H) * 0.8 / cote);   // pixels par module
    const px = cote * k;
    const x0 = Math.floor((L - px) / 2), y0 = Math.floor((H - px) / 2);
    const Y = Buffer.alloc(L * H, 235);
    for (let y = 0; y < px; y++) {
        const my = Math.floor(y / k) - MARGE;
        for (let x = 0; x < px; x++) {
            const mx = Math.floor(x / k) - MARGE;
            const noir = my >= 0 && my < q.taille && mx >= 0 && mx < q.taille
                && q.modules[my][mx];
            if (noir) Y[(y0 + y) * L + (x0 + x)] = 16;
        }
    }
    ecrire(sortie, Y);
    return { sortie, version: q.version, taille: q.taille, k, px };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [a, b] = process.argv.slice(2);
    if (!a) {
        console.error('emploi : node tools/qrEnCamera.mjs <texte|--blanc> [sortie.y4m]');
        process.exit(2);
    }
    if (a === '--blanc') {
        console.log(cameraBlanche(b || 'tools/tmp/camera-blanche.y4m'), '— mur blanc');
    } else {
        const r = cameraQr(a, b || 'tools/tmp/camera-qr.y4m');
        console.log(`${r.sortie} — QR version ${r.version}, ${r.taille} modules, `
            + `${r.k} px par module, ${r.px}×${r.px} dans ${L}×${H}`);
    }
}
