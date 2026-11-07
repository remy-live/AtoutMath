// « LE APRÈS EST COLLÉ À GAUCHE » — la ligne de présentation, au pixel.
//
// RÉMY, capture à l'appui : « Le après est collé à gauche, ce n'est pas beau. »
//
// CE QU'UNE ÉPREUVE NE PEUT PAS DIRE : un alignement se mesure sur les BOÎTES
// RENDUES, pas sur une règle CSS. La phrase et les onglets peuvent très bien
// porter chacun une marge juste et ne pas tomber au même endroit — c'est même
// le cas courant quand l'un la tient d'un parent et l'autre de lui-même.
//
// ON MESURE DONC LES QUATRE BORDS GAUCHES DE L'ÉCRAN DE LA CLASSE : le titre,
// la rangée d'onglets, la phrase, et le corps. Ils doivent tomber sur la même
// colonne, aux deux largeurs — l'ordinateur de la salle et le téléphone.
//
//   node tools/alignementDeLaClasse.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
const classeId = s.info.classe;

async function entrerDansLaClasse() {
    await s.page.evaluate(async () => {
        const m = await import('./js/ui/espaceClasses.js');
        await m.ouvrirEspaceClasses();
    });
    await dormir(2200);
    await s.cliquer(`[data-ouvrir="${classeId}"]`, 'la carte de la classe');
    await dormir(2200);
}

/**
 * LES BORDS GAUCHES DES QUATRE BLOCS — crochets LUS dans `classeHtml` et dans
 * css/ui.css : `.ec-tete`, `.ec-onglets`, `.ec-onglet-dit`, `.ec-corps`.
 */
const bords = () => s.page.evaluate(() => {
    const ou = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        // LE BORD DU TEXTE, pas celui de la boîte : une boîte pleine largeur
        // dont le texte est rentré de 26 px est exactement ce qu'on cherche.
        return Math.round(r.left + parseFloat(cs.paddingLeft || '0'));
    };
    return {
        titre: ou('.ec-titre'), onglets: ou('.ec-onglets'),
        phrase: ou('.ec-onglet-dit'), corps: ou('.ec-corps'),
        // ET LE TEXTE LUI-MÊME, qui est ce que Rémy voit : un nœud de texte
        // n'a pas de boîte, on mesure donc son premier rectangle.
        phraseTexte: (() => {
            const p = document.querySelector('.ec-onglet-dit');
            if (!p || !p.firstChild) return null;
            const r = document.createRange();
            r.selectNodeContents(p);
            const b = r.getBoundingClientRect();
            return b.width ? Math.round(b.left) : null;
        })(),
        dit: ((document.querySelector('.ec-onglet-dit') || {}).textContent || '')
            .replace(/\s+/g, ' ').trim().slice(0, 40)
    };
});

for (const [nom, l, h] of [['sur l\'ordinateur de la salle', 1280, 900],
                           ['sur un téléphone', 390, 844]]) {
    await s.page.setViewportSize({ width: l, height: h });
    await dormir(400);
    await entrerDansLaClasse();
    // ON VA SUR « Les bilans », l'onglet de sa capture.
    await s.cliquer('[data-onglet="bilans"]', 'l\'onglet « Les bilans »');
    await dormir(1800);
    const b = await bords();
    console.log(`\n\x1b[1m${nom.toUpperCase()}\x1b[0m  (${l} px)`);
    console.log(`   ${JSON.stringify(b)}`);
    await s.doitExister('.ec-onglet-dit', 'la phrase de présentation');
    dire(`${nom} : la phrase commence où commencent les onglets`,
        b.phrase !== null && b.onglets !== null && Math.abs(b.phrase - b.onglets) <= 1,
        `${b.phrase} contre ${b.onglets}`);
    dire(`${nom} : et où commence le corps`,
        b.phrase !== null && b.corps !== null && Math.abs(b.phrase - b.corps) <= 1,
        `${b.phrase} contre ${b.corps}`);
    dire(`${nom} : elle n'est pas collée au bord de la fenêtre`,
        b.phraseTexte !== null && b.phraseTexte >= 10, `${b.phraseTexte} px du bord`);
}

await s.photo('.ec', 'tools/tmp/alignement-classe.png', 0);
console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
await s.fermer();
process.exit(ratés ? 1 : 0);
