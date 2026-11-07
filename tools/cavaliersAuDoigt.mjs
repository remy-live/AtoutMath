// L'ÉNIGME DES CAVALIERS, PAR LE CHEMIN DE L'ÉLÈVE — on touche, et ça saute.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/cavaliersAuDoigt.mjs
//
// RÉMY, 31 octobre, avec la photo d'un livre : « j'aimeri bien aussi cette
// enigme ». C'est le problème de Guarini, 1512.
//
// CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE :
//
//   · TOUCHER UN CAVALIER ALLUME SES CASES — et il y en a TOUJOURS DEUX. Ce
//     n'est pas un détail d'affichage : c'est la seule chose qui fait trouver
//     l'énigme. Si l'élève ne voit pas « toujours deux », il ne devinera pas
//     que les huit cases font un anneau.
//   · ET TOUCHER UNE CASE ALLUMÉE Y FAIT SAUTER LE CAVALIER. Le noyau sait
//     résoudre ; il ne sait rien du doigt.
//   · LE BUT EST DESSINÉ À CÔTÉ, et non décrit en mots.
//   · ET « UN COUP » JOUE DEPUIS LÀ OÙ ON EN EST, pas depuis le départ.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 844 },
    { nom: 'ordi', largeur: 1280, hauteur: 900 }
];

const etat = (s) => s.page.evaluate(() => ({
    cases: document.querySelectorAll('[data-damier] .cv-case').length,
    cavaliers: document.querySelectorAll('[data-damier] .cv-cavalier').length,
    but: document.querySelectorAll('[data-but] .cv-cavalier').length,
    choisie: document.querySelectorAll('.cv-case--choisie').length,
    possibles: document.querySelectorAll('[data-damier] .cv-case--possible').length,
    statut: ((document.querySelector('.cv-statut') || {}).textContent || '').trim(),
    dehors: document.documentElement.scrollWidth - window.innerWidth
}));

const centre = (s, sel, i = 0) => s.page.evaluate(([x, k]) => {
    const el = document.querySelectorAll(x)[k];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, [sel, i]);

/** Le centre du premier cavalier d'un camp — « A » les rouges, « B » les bleus. */
const centreDuCamp = (s, camp) => s.page.evaluate((k) => {
    const el = document.querySelector('[data-damier] .cv-cavalier--' + k);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, camp);

/**
 * LES COULEURS RENDUES, et non les noms de classes.
 *
 * Une classe posée ne prouve rien : si la variable `--cv-teinte` n'était
 * déclarée nulle part, le liseré retomberait sur son bleu de repli et la classe
 * serait là quand même. On lit donc ce que le navigateur a CALCULÉ — la seule
 * chose que l'élève voit.
 */
const teintes = (s) => s.page.evaluate(() => {
    const lire = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
    const choisie = document.querySelector('[data-damier] .cv-case--choisie');
    const possible = document.querySelector('[data-damier] .cv-case--possible');
    return {
        cavalier: lire(choisie && choisie.querySelector('.cv-cavalier'), 'color'),
        liseré: lire(possible, 'boxShadow'),
        point: lire(possible && possible.querySelector('.cv-point'), 'backgroundColor')
    };
});

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [], ratés = [];
    try {
        await s.identifier();
        const raté = await s.ouvrirExercice('logi-cavaliers', { niveau: '2' }, { questions: 2 });
        if (raté) throw new Error(`ouverture : ${raté}`);
        await s.doitExister('[data-damier] .cv-case', 'les cases du damier');
        await s.doitExister('[data-but]', 'le damier du but');
        await dormir(300);

        const a = await etat(s);
        dits.push(`${a.cases} cases, ${a.cavaliers} cavaliers, ${a.but} sur le but`);
        if (a.cases !== 9) { ratés.push('cases'); dits.push(`${a.cases} CASES AU LIEU DE 9`); }
        if (a.cavaliers !== 4) { ratés.push('cavaliers'); dits.push(`${a.cavaliers} CAVALIERS AU LIEU DE 4`); }
        if (a.but !== 4) { ratés.push('but'); dits.push('LE BUT N\'EST PAS DESSINÉ'); }

        const img = await s.photo('.cv-plateaux', `tools/tmp/cv-damier-${taille.nom}.png`, 0);
        dits.push(img && !img.unie ? `le damier est dessiné (${img.teintes} teintes)`
            : 'LE DAMIER EST UNE IMAGE UNIE');
        if (!img || img.unie) ratés.push('damier uni');

        // ── TOUCHER UN CAVALIER ALLUME EXACTEMENT DEUX CASES ────────────────
        //
        // C'est LA mesure de ce jeu. On les essaie tous les quatre : si un seul
        // en allumait trois, le raisonnement de l'élève serait faux.
        let mini = 9, maxi = 0;
        for (let i = 0; i < 4; i++) {
            const c = await centre(s, '[data-damier] .cv-cavalier', i);
            if (!c) break;
            await s.page.mouse.click(c.x, c.y);
            await dormir(140);
            const e = await etat(s);
            mini = Math.min(mini, e.possibles); maxi = Math.max(maxi, e.possibles);
            await s.page.mouse.click(c.x, c.y);   // on le repose
            await dormir(100);
        }
        const deux = mini === 2 && maxi === 2;
        dits.push(deux
            ? 'toucher un cavalier allume TOUJOURS deux cases, jamais trois'
            : `UN CAVALIER ALLUME ENTRE ${mini} ET ${maxi} CASES`);
        if (!deux) ratés.push('deux cases');

        // ── LA CASE PROPOSÉE PORTE LA COULEUR DU CAVALIER TOUCHÉ ───────────
        //
        // Rémy, 4 novembre : « quand je clique sur le cavalier rouge, il faut
        // que la case proposée soit en rouge pas en bleu ». Le liseré et le
        // point étaient bleus en dur — la teinte du camp ADVERSE. Sur ce
        // damier, la couleur est la seule chose qui dit qui est en train de
        // jouer, et un cavalier rouge qui allume des cases bleues désigne
        // l'autre camp.
        for (const camp of ['A', 'B']) {
            const nom = camp === 'A' ? 'rouge' : 'bleu';
            const c = await centreDuCamp(s, camp);
            if (!c) { dits.push(`AUCUN CAVALIER ${nom.toUpperCase()}`); ratés.push('camp'); continue; }
            await s.page.mouse.click(c.x, c.y);
            await dormir(160);
            const t = await teintes(s);
            const accord = !!t.cavalier && !!t.liseré
                && t.liseré.includes(t.cavalier) && t.point === t.cavalier;
            dits.push(accord
                ? `le cavalier ${nom} allume des cases ${camp === "A" ? "rouges" : "bleues"} — ${t.cavalier}`
                : `LE CAVALIER ${nom.toUpperCase()} (${t.cavalier}) ALLUME `
                    + `LISERÉ ${t.liseré} / POINT ${t.point}`);
            if (!accord) ratés.push(`couleur ${nom}`);
            await s.page.mouse.click(c.x, c.y);   // on le repose
            await dormir(120);
        }

        // ── ET TOUCHER UNE CASE ALLUMÉE Y FAIT SAUTER LE CAVALIER ───────────
        const c0 = await centre(s, '[data-damier] .cv-cavalier', 0);
        await s.page.mouse.click(c0.x, c0.y);
        await dormir(140);
        const cible = await centre(s, '[data-damier] .cv-case--possible', 0);
        if (!cible) {
            dits.push('AUCUNE CASE ALLUMÉE : le saut n\'est pas mesurable');
            ratés.push('saut');
        } else {
            await s.page.mouse.click(cible.x, cible.y);
            await dormir(220);
            const apres = await etat(s);
            const saute = /1\s|1 coup/.test(apres.statut) || /coup/.test(apres.statut);
            dits.push(saute ? `le cavalier saute — « ${apres.statut} »`
                : `LE CAVALIER NE SAUTE PAS (« ${apres.statut} »)`);
            if (!saute) ratés.push('saut');
            dits.push(apres.possibles === 0 ? 'et les cases s\'éteignent derrière lui'
                : `${apres.possibles} CASE(S) RESTENT ALLUMÉES`);
            if (apres.possibles) ratés.push('traces');
        }

        // ── « UN COUP » JOUE DEPUIS LÀ OÙ ON EN EST ─────────────────────────
        const avant = await etat(s);
        await s.page.evaluate(() => document.querySelector('[data-outil="aide"]').click());
        await dormir(260);
        const aide = await etat(s);
        const aide_ok = /coup/.test(aide.statut) && aide.statut !== avant.statut;
        dits.push(aide_ok ? `« Un coup » joue — « ${aide.statut} »`
            : `« UN COUP » NE FAIT RIEN (« ${aide.statut} »)`);
        if (!aide_ok) ratés.push('aide');

        // ── ET « RECOMMENCER » REMET LE DÉPART ──────────────────────────────
        await s.page.evaluate(() => document.querySelector('[data-outil="recommencer"]').click());
        await dormir(220);
        const remis = await etat(s);
        dits.push(/début/.test(remis.statut) ? '« Recommencer » remet le départ'
            : `« RECOMMENCER » NE DIT RIEN (« ${remis.statut} »)`);
        if (!/début/.test(remis.statut)) ratés.push('recommencer');

        dits.push(`rien ne déborde en largeur : ${remis.dehors} px`);
        if (remis.dehors > 0) ratés.push('débordement');
        await s.page.screenshot({ path: `tools/tmp/cv-ecran-${taille.nom}.png`, fullPage: true });

        return { dits, ratés, erreurs: s.erreurs.slice(), fenetres: s.fenetresNatives.slice() };
    } finally {
        await s.fermer();
    }
}

const sorties = [];
for (const t of TAILLES) sorties.push({ t, r: await unePasse(t) });

console.log('');
let fautes = 0;
for (const { t, r } of sorties) {
    console.log(`── ${t.nom} (${t.largeur} × ${t.hauteur}) ──`);
    r.dits.forEach(x => console.log(`   ${x}`));
    if (r.ratés.length) console.log(`   ratés : ${r.ratés.join(', ')}`);
    console.log(`   erreurs de page : ${r.erreurs.length}, fenêtres natives : ${r.fenetres.length}`);
    r.erreurs.forEach(e => console.log(`     ! ${e}`));
    fautes += r.erreurs.length + r.fenetres.length + r.ratés.length;
}
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exitCode = fautes ? 1 : 0;
