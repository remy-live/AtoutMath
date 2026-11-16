// « POSE LA LOUPE » AU DOIGT — la tape, le glissé, et le voyage entre les deux.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CET OUTIL EXISTE PARCE QU'UN GESTE NE SE LIT PAS DANS LE CODE. Trois choses
// y sont vraies ou fausses selon le navigateur, jamais selon la source :
//
//   · un glissé horizontal peut être confisqué par le navigateur, qui décide
//     que c'est un défilement de page — le doigt continue, la loupe reste, et
//     l'on cherche le défaut dans le JavaScript, où il n'est pas ;
//   · une tape et un glissé se distinguent par un SEUIL, et un seuil ne se
//     vérifie qu'en le franchissant et en ne le franchissant pas ;
//   · une animation ne se mesure pas sur son état final. Si l'on ne regarde
//     que l'arrivée, un saut instantané et un voyage de 400 ms rendent
//     exactement la même réponse.
//
//     node tools/loupeAuDoigt.mjs [largeur] [hauteur]
import { ouvrirSonde } from './sonde.mjs';

const [, , L = '390', H = '844'] = process.argv;
const s = await ouvrirSonde({ largeur: Number(L), hauteur: Number(H) });
await s.ouvrirExercice('num-poser-la-loupe', { marches: ['partout'] }, { questions: 3 });
await s.doitExister('.lp-plan', 'le dessin');
await s.doitExister('.lp-sous', 'les centièmes pâles de la droite du haut');

const plan = s.page.locator('.lp-plan');
const lire = () => plan.getAttribute('aria-valuenow').then(Number);
const b = await plan.boundingBox();
const aX = (f) => b.x + b.width * f;
const y = b.y + b.height / 2;
let fautes = 0;
const dire = (ok, quoi, detail) => {
    if (!ok) fautes++;
    console.log(`  ${ok ? 'ok  ' : 'RATÉ'}  ${quoi}${detail ? '  — ' + detail : ''}`);
};

// ── LE GLISSÉ SUIT LE DOIGT, ET IL EST RELATIF ──────────────────────────────
const avant = await lire();
await s.page.mouse.move(aX(0.7), y);
await s.page.mouse.down();
const etapes = [];
for (const f of [0.6, 0.45, 0.3, 0.18]) {
    await s.page.mouse.move(aX(f), y, { steps: 4 });
    etapes.push(await lire());
}
await s.page.mouse.up();
const lache = await lire();
dire(etapes[0] !== avant && etapes.every((v, i) => i === 0 || v <= etapes[i - 1]),
    'le glissé suit le doigt', `${avant} → ${etapes.join(' → ')}`);
dire(lache === etapes[etapes.length - 1], 'et la loupe reste où on la lâche');

// ── LE SEUIL : SOUS SIX PIXELS, C'EST UNE TAPE, PAS UN GLISSÉ ───────────────
//
// On pose le doigt LOIN de la loupe et on le remue de trois pixels. Un glissé
// RELATIF ne la bougerait presque pas ; une tape l'envoie là où est le doigt.
// Les deux réponses sont très différentes, et c'est ce qui rend le seuil
// mesurable.
const ou = await lire();
await s.page.mouse.move(aX(0.92), y);
await s.page.mouse.down();
await s.page.mouse.move(aX(0.92) + 3, y);
await s.page.mouse.up();
await s.page.waitForTimeout(700);
const apresTape = await lire();
dire(apresTape > 85 && apresTape !== ou,
    'trois pixels de tremblement restent une TAPE', `${ou} → ${apresTape}`);

// ── ET LE VOYAGE SE VOIT : ON REGARDE PENDANT, PAS APRÈS ────────────────────
//
// Une mesure qui ne regarde que l'arrivée ne sait pas distinguer un saut d'un
// voyage. On relève donc la position au milieu du trajet, AVANT qu'il finisse.
await s.page.mouse.click(aX(0.08), y);
await s.page.waitForTimeout(170);
const milieu = await lire();
await s.page.waitForTimeout(800);
const arrivee = await lire();
dire(arrivee < 12, 'la tape envoie la loupe à l’autre bout', `arrivée à ${arrivee}`);
dire(milieu > arrivee + 4 && milieu < apresTape - 4,
    'ET LE TRAJET SE VOIT : à mi-chemin elle est entre les deux',
    `${apresTape} → ${milieu} (à 170 ms) → ${arrivee}`);

// ── LES FLÈCHES FONT UN CRAN, SANS VOYAGE ───────────────────────────────────
const f0 = await lire();
await s.page.locator('[data-pas="1"]').click();
const f1 = await lire();
dire(f1 - f0 === 1, 'une flèche avance d’exactement un centième', `${f0} → ${f1}`);

dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs[0] || '');
dire(s.fenetresNatives.length === 0, 'aucune fenêtre native');
console.log(fautes === 0
    ? '\nLA LOUPE RÉPOND AU DOIGT, ET L’ON VOIT SES TRAJETS.'
    : `\n${fautes} mesure(s) en faute.`);
await s.fermer();
process.exit(fautes === 0 ? 0 : 1);
