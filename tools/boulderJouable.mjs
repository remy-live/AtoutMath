// LES TABLEAUX DE BOULDER DASH SE FINISSENT-ILS ? On fait jouer un robot.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/boulderJouable.mjs            # les trois tableaux
//   node tools/boulderJouable.mjs 2 --carte  # le deuxième, et le dessin
//
// LE ROBOT LUI-MÊME VIT DANS `js/core/boulderRobot.js`, parce qu'il sert aussi
// à l'aperçu du professeur — et son en-tête dit pourquoi ce n'est pas une
// recherche exhaustive. Ici, il n'y a que la ligne de commande et le dessin
// du plateau tel qu'il l'a laissé : « aucun chemin » n'apprend rien, voir où
// le robot s'arrête dit tout de suite ce qu'il faut redessiner.

import { NIVEAUX, lireNiveau } from '../js/core/boulderDash.js';
import { faireJouer } from '../js/core/boulderRobot.js';

if (import.meta.url === `file://${process.argv[1]}`) {
    const seul = Number(process.argv[2]) || null;
    const carte = process.argv.includes('--carte');
    let ratés = 0;
    NIVEAUX.forEach((def, i) => {
        if (seul && i + 1 !== seul) return;
        const n0 = lireNiveau(def);
        const t0 = Date.now();
        const r = faireJouer(def);
        const sec = ((Date.now() - t0) / 1000).toFixed(2);
        const secondes = (r.pas * 150 / 1000).toFixed(1);
        if (r.gagne) {
            console.log(`\x1b[32m✓\x1b[0m tableau ${i + 1} — ${def.nom} : fini en ${r.pas} pas `
                + `(${secondes} s sur ${def.secondes}), ${r.pris} diamants sur `
                + `${n0.ilEnFaut} \x1b[2m(${sec} s de calcul)\x1b[0m`);
        } else {
            ratés++;
            console.log(`\x1b[31m✗\x1b[0m tableau ${i + 1} — ${def.nom} : LE ROBOT N'Y ARRIVE `
                + `PAS — ${r.pourquoi}`);
        }
        if (carte || !r.gagne) {
            const n = r.n || n0;
            console.log(`   \x1b[2mle plateau tel qu'il l'a laissé (@ = le robot) :\x1b[0m`);
            n.cases.forEach((l, y) => console.log('   ' + l.map((ch, x) =>
                (r.e && r.e.c === x && r.e.r === y ? '\x1b[41;97m@\x1b[0m' : ch)).join('')));
        }
    });
    console.log(ratés ? `\n\x1b[31m${ratés} tableau(x) à redessiner.\x1b[0m`
        : '\n\x1b[32mTOUS LES TABLEAUX SE FINISSENT.\x1b[0m');
    process.exit(ratés ? 1 : 0);
}
