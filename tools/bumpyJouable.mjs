// LES TABLEAUX DE BUMPY SONT-ILS FINISSABLES ? On cherche, on ne suppose pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/bumpyJouable.mjs            # les quatre tableaux
//   node tools/bumpyJouable.mjs 3          # le troisième seulement
//   node tools/bumpyJouable.mjs 3 --carte  # et le dessin de ce qu'on atteint
//
// ── LA FRICTION QUE CET OUTIL FERME ────────────────────────────────────────
//
// Un tableau écrit à la main peut être injouable sans que rien ne le dise. La
// sonde d'écran voit une balle qui rebondit et des compteurs qui ne bougent
// pas : elle ne sait pas distinguer « le jeu est cassé » de « la balle ne peut
// pas aller là ». Les deux se sont produits le même jour, et l'un masquait
// l'autre pendant qu'on cherchait le second.
//
// ── COMMENT ON CHERCHE ─────────────────────────────────────────────────────
//
// Bumpy est déterministe et discret : à chaque rebond, trois coups possibles,
// et le résultat est entièrement décidé. ON EXPLORE DONC L'ARBRE DES COUPS,
// en largeur, avec le VRAI `coup` du jeu — pas un modèle, le code que l'élève
// joue.
//
// L'ÉTAT RETENU N'EST PAS SEULEMENT « OÙ EST LA BALLE » : chaque atterrissage
// casse un bloc, donc le tableau change sous les pieds. Deux passages au même
// endroit avec des trous différents ne sont pas le même état, et les confondre
// ferait manquer des chemins — ou en inventer. On garde donc la liste de ce
// qui a été cassé, et l'on s'arrête si elle explose.
//
// CE QU'IL TROUVE EST JOUABLE À COUP SÛR, puisqu'il ne s'autorise que les
// trois coups que l'élève a. Ce qu'il ne trouve pas n'existe pas non plus :
// contrairement au chercheur d'un jeu continu, celui-ci est EXACT.

import { CASE, NIVEAUX, TUILE, coup, etatInitial, lireNiveau } from '../js/core/bumpy.js';

/** Garde-fou : au-delà, l'état n'est pas assez résumé — on le dit. */
const ETATS_MAX = 2000000;

/** Les cases qui peuvent disparaître : blocs cassés, bonus ramassés. */
function casesMobiles(niveau) {
    const l = [];
    for (let r = 0; r < niveau.hauteur; r++) {
        for (let c = 0; c < niveau.largeur; c++) {
            const t = niveau.cases[r][c];
            if (t === TUILE.BLOC || t === TUILE.BONUS) l.push({ c, r, t });
        }
    }
    return l;
}

/** Ce qui a disparu du tableau, en chaîne de bits. */
function empreinte(n, mobiles) {
    let s = '';
    for (const m of mobiles) s += (n.cases[m.r][m.c] === m.t ? '0' : '1');
    return s;
}

/** Remet le tableau dans l'état décrit par l'empreinte. */
function replanter(def, mobiles, emp) {
    const n = lireNiveau(def);
    mobiles.forEach((m, i) => { if (emp[i] === '1') n.cases[m.r][m.c] = TUILE.VIDE; });
    return n;
}

/** Cherche une suite de coups qui atteint la sortie. */
export function chercher(def) {
    const n0 = lireNiveau(def);
    const mobiles = casesMobiles(n0);
    const e0 = etatInitial(n0);
    const vide = '0'.repeat(mobiles.length);
    const clef = (e, emp) => `${e.c}|${e.r}|${emp}`;

    const file = [{ etat: e0, emp: vide, chemin: [] }];
    const vus = new Set([clef(e0, vide)]);
    const atteints = new Set([`${e0.c},${e0.r}`]);
    let explores = 0, morts = 0;
    while (file.length) {
        const { etat, emp, chemin } = file.shift();
        for (const d of [-1, 0, 1]) {
            const n = replanter(def, mobiles, emp);
            const r = coup(etat, n, d);
            explores++;
            if (r.etat.mort) { morts++; continue; }
            if (r.etat.fini) {
                return { trouve: true, chemin: [...chemin, d], explores, morts,
                    bonus: r.etat.bonus, atteints };
            }
            const emp2 = empreinte(n, mobiles);
            const k = clef(r.etat, emp2);
            if (vus.has(k)) continue;
            if (vus.size > ETATS_MAX) {
                return { trouve: false, debordement: true, explores, morts, atteints };
            }
            vus.add(k);
            atteints.add(`${r.etat.c},${r.etat.r}`);
            file.push({ etat: r.etat, emp: emp2, chemin: [...chemin, d] });
        }
    }
    return { trouve: false, explores, morts, atteints };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const seul = Number(process.argv[2]) || null;
    const carte = process.argv.includes('--carte');
    let ratés = 0;
    NIVEAUX.forEach((def, i) => {
        if (seul && i + 1 !== seul) return;
        const n = lireNiveau(def);
        const t0 = Date.now();
        const r = chercher(def);
        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        const fl = (d) => (d < 0 ? '←' : d > 0 ? '→' : '·');
        if (r.trouve) {
            console.log(`\x1b[32m✓\x1b[0m tableau ${i + 1} — ${def.nom} : la sortie `
                + `s'atteint en ${r.chemin.length} rebonds, ${r.bonus} bonus au passage`
                + ` \x1b[2m(${sec} s, ${r.explores} coups essayés)\x1b[0m`);
            console.log('   ' + r.chemin.map(fl).join(' '));
        } else {
            ratés++;
            console.log(`\x1b[31m✗\x1b[0m tableau ${i + 1} — ${def.nom} : LA SORTIE `
                + `(${n.sortie.c} ; ${n.sortie.r}) N'EST JAMAIS ATTEINTE `
                + `\x1b[2m(${sec} s, ${r.explores} coups, ${r.morts} morts`
                + `${r.debordement ? ', débordement d\'états' : ''})\x1b[0m`);
        }
        if (carte || !r.trouve) {
            // LE DESSIN DE CE QU'ON ATTEINT. « Aucun chemin » n'apprend rien ;
            // voir où la balle s'arrête dit tout de suite si elle n'a pas
            // trouvé la bonne colonne ou si elle ne descend pas du tout.
            console.log('   \x1b[2mles cases où elle se pose (sur fond vert) :\x1b[0m');
            def.lignes.forEach((l, r2) => console.log('   ' + [...l].map((ch, c) =>
                r.atteints.has(`${c},${r2}`) ? `\x1b[42;30m${ch}\x1b[0m` : ch).join('')));
        }
    });
    console.log(ratés ? `\n\x1b[31m${ratés} tableau(x) à redessiner.\x1b[0m`
        : '\n\x1b[32mTOUS LES TABLEAUX SE FINISSENT.\x1b[0m');
    process.exit(ratés ? 1 : 0);
}
