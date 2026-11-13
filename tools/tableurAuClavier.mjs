// L'ÉCOLE DU TABLEUR, TAPÉE AU CLAVIER — les cinq leçons qui calculent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « on me dit que c'est faux ». Il écrivait `=A1+B1`, la
// formule que la consigne donne en exemple, et le jeu répondait « le calcul
// 9+0 ne se fait pas ».
//
// ── POURQUOI CETTE SONDE TAPE AU CLAVIER, ET POURQUOI C'EST TOUT LE SUJET ──
//
// La cause était `new Function`, que la politique de sécurité du site interdit
// (`script-src` sans `unsafe-eval`, voir `.htaccess`) : TOUTES les formules des
// leçons 5 à 9 tombaient dans le `catch`. Le jeu était mort en ligne.
//
// ET UNE SONDE L'AVAIT DÉJÀ CHERCHÉ, EN VAIN — c'est écrit dans le code :
// « soixante questions d'affilée n'ont produit aucune Erreur ». Elle posait les
// valeurs et lançait les événements par `page.evaluate`, QUI EMPRUNTE LE
// PROTOCOLE DE DÉBOGAGE ET AUTORISE `eval` MÊME SOUS UNE POLITIQUE QUI
// L'INTERDIT. Soixante mesures vertes dans un navigateur qui n'existe nulle
// part.
//
//     Une mesure qui n'emprunte pas le chemin de l'utilisateur ne mesure pas
//     son problème — et le chemin, ce n'est pas seulement l'écran : c'est
//     aussi la PORTE par laquelle on frappe.
//
// Celle-ci clique la case et tape, touche par touche, comme un élève.
//
//     node tools/tableurAuClavier.mjs

import { ouvrirSonde } from './sonde.mjs';

const LECONS = [5, 6, 7, 8, 9];

/**
 * La formule que la consigne demande, lue DANS la consigne.
 *
 * On ne la devine pas depuis le code du jeu : une sonde qui recopie le
 * générateur mesure le générateur. Ici l'on fait ce que fait l'élève — on lit
 * la phrase, et l'on écrit ce qu'elle dit.
 */
function formuleDemandee(consigne, cible) {
    let m = consigne.match(/dans\s+([A-E]\d)\s.*?additionne\s+([A-E]\d)\s+et\s+([A-E]\d)/);
    if (m) return { cible: m[1], formule: `=${m[2]}+${m[3]}` };
    m = consigne.match(/dans\s+([A-E]\d)\s.*?multiplie\s+([A-E]\d)\s+par\s+([A-E]\d)/);
    if (m) return { cible: m[1], formule: `=${m[2]}*${m[3]}` };
    m = consigne.match(/dans\s+([A-E]\d)\s.*?(additionne tout|fait la moyenne)\s+de\s+([A-E]\d:[A-E]\d)/);
    if (m) {
        return { cible: m[1],
            formule: `=${m[2] === 'fait la moyenne' ? 'MOYENNE' : 'SOMME'}(${m[3]})` };
    }
    // La facture : quatre formules, données en toutes lettres dans la consigne,
    // et le jeu met le curseur sur celle qu'il attend.
    if (/facture/i.test(consigne)) {
        const suite = [['D2', '=B2*C2'], ['D3', '=B3*C3'], ['D4', '=B4*C4'],
            ['D6', '=SOMME(D2:D4)']];
        const reste = suite.find(([id]) => id === cible);
        return reste ? { cible, formule: reste[1] } : null;
    }
    return null;
}

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
let tout = true;
const dire = (ok, quoi) => { console.log(`${ok ? '  ok  ' : '  NON '} ${quoi}`); return ok; };
try {
    for (const niveau of LECONS) {
        await s.ouvrirExercice('don-tableur', { startLevel: niveau, goal: 3 }, { questions: 8 });
        await s.doitExister('[data-grille]', `la grille de la leçon ${niveau}`);
        let faites = 0, bloque = false;
        for (let tour = 0; tour < 9 && !bloque; tour++) {
            const vu = await s.page.evaluate(() => {
                const c = document.querySelector('.tab-consigne, [data-consigne], .consigne');
                const g = document.querySelector('[data-grille]');
                // LA CASE OÙ L'ON ÉCRIT EST CELLE OÙ LE JEU A MIS LE CURSEUR.
                //
                // La chercher soi-même — « la première case libre » — donnait
                // A5 ou E1 : une grille de cinq colonnes sur six est vide
                // presque partout, et la sonde tapait dans un coin. Le jeu, lui,
                // appelle `focaliser()` sur la bonne case à chaque question :
                // c'est le curseur que l'élève trouve en arrivant, et c'est
                // donc la seule désignation qui soit la sienne.
                const actif = document.activeElement;
                const texte = (c?.textContent || '');
                // ET QUAND LE CURSEUR N'EST NULLE PART, ON PREND LA PREMIÈRE
                // CASE QUE LA CONSIGNE NOMME et qui n'est pas encore juste.
                // La facture en demande quatre à la suite, et le jeu ne déplace
                // le curseur qu'à la première : l'élève clique lui-même les
                // trois autres, et la sonde doit faire comme lui.
                const nommees = [...new Set(texte.match(/\b[A-E][1-6]\b/g) || [])];
                const libre = nommees.find(id => {
                    const i = g.querySelector(`input[data-cell-id="${id}"]`);
                    return i && !i.readOnly && !i.classList.contains('juste');
                });
                const cible = actif && actif.dataset && actif.dataset.cellId
                    && !actif.readOnly ? actif.dataset.cellId : (libre || null);
                return { consigne: (c?.textContent || '').replace(/\s+/g, ' ').trim(),
                    cible,
                    dedans: cible
                        ? g.querySelector(`input[data-cell-id="${cible}"]`).value : '' };
            });
            if (!vu.cible) break;
            const quoi = formuleDemandee(vu.consigne, vu.cible);
            if (!quoi) { console.log(`  leçon ${niveau} : consigne illisible « ${vu.consigne} »`); break; }
            // `taper` clique, VIDE la case, écrit touche par touche et appuie
            // sur Entrée — tout ce que la porte du clavier demande, en un appel.
            await s.taper(`input[data-cell-id="${quoi.cible}"]`, quoi.formule,
                { entree: true });
            const apres = await s.page.evaluate(() => {
                const el = document.querySelector('.tab-msg');
                return { msg: (el?.textContent || '').replace(/\s+/g, ' ').trim(),
                    ko: !!el && el.className.includes('ko') };
            });
            if (apres.ko) {
                tout = dire(false, `leçon ${niveau} : « ${quoi.formule} » REFUSÉE — ${apres.msg}`);
                bloque = true;
            } else {
                faites += 1;
            }
            await new Promise(ok => setTimeout(ok, 500));
        }
        if (!bloque) tout = dire(faites > 0, `leçon ${niveau} : ${faites} formule(s) acceptée(s)`) && tout;
    }
} finally {
    console.log(`\nfenêtres natives et erreurs de page : `
        + `${s.fenetresNatives.length + s.erreurs.length}`);
    for (const e of s.erreurs) console.log(`    ${e}`);
    await s.fermer();
}
console.log(tout ? '\nLE TABLEUR CALCULE.' : '\nLE TABLEUR REFUSE UNE FORMULE JUSTE.');
process.exit(tout ? 0 : 1);
