// ASTRO-SIMPLIF, JOUÉ AU DOIGT — la mission entière, sur le chemin de l'élève.
//
//   node tools/sondeAstro.mjs [largeur=390] [hauteur=844] [fautes=2]
//
// Ce qu'on a demandé pour MultiKart vaut ici : « il faut que tout passe dans
// la fenêtre et que ce soit compatible téléphone portable ». Cette sonde ouvre
// l'exercice, TOUCHE chaque astéroïde là où il est dessiné pour le viser,
// touche le bon canon, et se trompe exprès sur les `fautes` premières
// fractions — deux rebonds, donc « à revoir ». Puis elle lit le rapport de
// mission et appuie sur « Continuer ».
//
// Elle JETTE si :
//   · un élément du jeu sort de sa fenêtre, ou est en position fixe ;
//   · la page défile en largeur ;
//   · toucher un astéroïde ne le vise pas ;
//   · le score, le compte ou la correction se lisent mal SUR LES PIXELS ;
//   · le rapport n'annonce pas le compte attendu ;
//   · l'étape du parcours n'est pas close après « Continuer » ;
//   · la page a levé une erreur ou ouvert une fenêtre native.
//
// Les photos vont dans tools/tmp/ : accueil, jeu, bilan.

import { ouvrirSonde } from './sonde.mjs';

const [largeur = '390', hauteur = '844', fautes = '2'] = process.argv.slice(2);
const nom = `${largeur}x${hauteur}`;
const s = await ouvrirSonde({ largeur: Number(largeur), hauteur: Number(hauteur) });
const echecs = [];
const exiger = (vrai, quoi) => { if (!vrai) echecs.push(quoi); };
const toucher = (x, y) => (Number(largeur) < 768 ? s.page.touchscreen.tap(x, y) : s.page.mouse.click(x, y));

const dehors = () => s.page.evaluate(() => {
    const w = document.querySelector('.as-wrap').getBoundingClientRect();
    const out = [];
    document.querySelectorAll('.as-wrap *').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (getComputedStyle(e).position === 'fixed') out.push(`FIXE ${e.className}`);
        // Les cartes défilent DANS leur voile : ce qui en dépasse y est rogné.
        if (e.closest('.as-voile') && !e.classList.contains('as-voile')) return;
        if (e.classList.contains('as-lu')) return;
        if (r.left < w.left - 1 || r.right > w.right + 1 || r.top < w.top - 1 || r.bottom > w.bottom + 1) {
            out.push(`${e.className || e.tagName} dépasse`);
        }
    });
    return { out, page: document.documentElement.scrollWidth > innerWidth,
        fenetre: [Math.round(w.width), Math.round(w.height)] };
});

/** Le plus petit canon qui divise les deux : la sonde mesure le doigt, pas le calcul. */
const juste = (a, canons) => canons.find((d) => a.num % d === 0 && a.den % d === 0);
const faux = (a, canons) => canons.find((d) => a.num % d !== 0 || a.den % d !== 0);

try {
    await s.identifier();
    await s.ouvrirExercice('frac-astro-simplif');
    await s.doitExister('[data-decoller]');
    await s.page.waitForTimeout(400);
    let d = await dehors();
    console.log(`fenêtre du jeu : ${d.fenetre[0]} × ${d.fenetre[1]} dans un écran de ${largeur} × ${hauteur}`);
    exiger(!d.out.length, `à l'accueil : ${d.out.join(' ; ')}`);
    exiger(!d.page, 'la page défile en largeur');
    await s.page.screenshot({ path: `tools/tmp/as-${nom}-accueil.png` });
    await s.page.click('[data-decoller]');

    const boite = await s.page.evaluate(() => {
        const w = document.querySelector('.as-wrap').getBoundingClientRect();
        return { x: w.left, y: w.top };
    });
    const fautesFaites = new Map();
    let touchers = 0, obeis = 0, tirs = 0, photo = false, total = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
        const m = await s.page.evaluate(() => document.querySelector('.as-wrap').mesure());
        total = m.total;
        if (m.phase === 'bilan') break;
        if (m.phase !== 'jeu' || !m.asteroides.length || m.surchauffe > 0) { await s.page.waitForTimeout(80); continue; }
        // On vise le plus bas ENTRÉ DANS LE CIEL : un astéroïde encore sous la
        // barre du haut ne se touche pas du doigt — le doigt tomberait sur
        // « Critères », et la mission se mettrait en pause. Vu : c'est ce que
        // faisait la première version de cette sonde, une partie sur deux.
        const visibles = m.asteroides.filter((a) => a.py - m.haut - a.r * 0.6 > 0).sort((a, b) => b.y - a.y);
        if (!visibles.length) { await s.page.waitForTimeout(80); continue; }
        const a = visibles[0];
        await toucher(boite.x + a.x, boite.y + a.py);
        touchers++;
        const vise = await s.page.evaluate(() => document.querySelector('.as-wrap').mesure().cible);
        if (vise === a.id) obeis++;
        const deja = fautesFaites.get(a.id) || 0;
        const rang = [...fautesFaites.keys()].length;
        const seTromper = deja < 2 && (fautesFaites.has(a.id) ? true : rang < Number(fautes)) && faux(a, m.canons);
        const d0 = seTromper ? faux(a, m.canons) : juste(a, m.canons);
        if (seTromper) fautesFaites.set(a.id, deja + 1);
        const b = await s.page.evaluate((k) => {
            const r = document.querySelector(`[data-canon="${k}"]`).getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }, d0);
        await toucher(b.x, b.y);
        tirs++;
        if (tirs === 6 && !photo) {
            photo = true;
            await s.page.waitForTimeout(250);
            d = await dehors();
            exiger(!d.out.length, `en jeu : ${d.out.join(' ; ')}`);
            for (const sel of ['[data-compte] b', '[data-score] b', '[data-retour]']) {
                const c = await s.contrasteRendu(sel);
                console.log(`contraste rendu de ${sel} : ${c.contraste.toFixed(1)}`);
                exiger(c.contraste >= 4.5, `${sel} se lit mal : contraste ${c.contraste.toFixed(1)}`);
            }
            await s.page.screenshot({ path: `tools/tmp/as-${nom}-jeu.png` });
        }
        await s.page.waitForTimeout(seTromper ? 300 : 500);
    }
    const etat = await s.page.evaluate(() => document.querySelector('.as-wrap').mesure());
    console.log(`à la sortie de la boucle : phase ${etat.phase}, ${etat.faites}/${etat.total} faites, `
        + `${etat.asteroides.length} astéroïde(s) : ${JSON.stringify(etat.asteroides.map((a) => [a.num, a.den, +a.y.toFixed(2), Math.round(a.py)]))}`);
    console.log(`touchers sur un astéroïde : ${touchers}, visé : ${obeis} ; tirs : ${tirs}`);
    exiger(touchers > 0 && obeis === touchers, `un toucher n'a pas visé l'astéroïde (${obeis}/${touchers})`);

    await s.page.waitForTimeout(500);
    await s.page.screenshot({ path: `tools/tmp/as-${nom}-bilan.png` });
    const bilan = await s.page.evaluate(() => {
        const f = document.querySelector('[data-fin]'), w = document.querySelector('.as-wrap').getBoundingClientRect();
        // Le bouton est VU s'il est le premier élément au point de son centre :
        // un bouton sous le bord de sa carte a un rectangle, et n'est pas là.
        const b = document.querySelector('[data-suite]').getBoundingClientRect();
        const ici = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return { vu: f.classList.contains('as-vu'), titre: document.querySelector('[data-fin-titre]').textContent,
            encore: document.querySelector('[data-encore]').textContent,
            aRevoir: document.querySelectorAll('.as-puces--ko span').length,
            defile: f.scrollHeight > f.clientHeight + 1,
            boutonVu: b.bottom <= w.bottom + 1 && !!ici && !!ici.closest('[data-suite]') };
    });
    console.log(`bilan : « ${bilan.titre} » — ${bilan.aRevoir} à revoir — bouton « ${bilan.encore} » — `
        + `« Continuer » visible sans défiler = ${bilan.boutonVu}`);
    // Le nombre de fractions est celui de l'ÉTAPE, lu dans le jeu.
    const attendu = total - Math.min(Number(fautes), total);
    exiger(bilan.vu, 'le rapport de mission ne s\'est pas ouvert');
    exiger(bilan.titre.startsWith(`${attendu} fraction`), `rapport attendu ${attendu} sur ${total}, lu « ${bilan.titre} »`);
    exiger(bilan.aRevoir === Number(fautes), `${Number(fautes)} fractions à revoir attendues, ${bilan.aRevoir} lues`);
    exiger(bilan.boutonVu, '« Continuer » n\'est pas visible sans défiler');
    d = await dehors();
    exiger(!d.out.length, `au bilan : ${d.out.join(' ; ')}`);

    await s.page.click('[data-suite]');
    await s.page.waitForTimeout(2400);
    const apres = await s.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const clos = /Étape validée|Sans faute|bonnes? réponses? sur|à retravailler|Refaire/i.test(apres);
    console.log(`après « Continuer » : étape close = ${clos}`);
    if (!clos) console.log(`ce qu'on lit alors : ${apres.slice(0, 400)}`);
    exiger(clos, 'l\'étape du parcours n\'est pas close après « Continuer »');
    exiger(!s.erreurs.length, `erreurs de page : ${s.erreurs.join(' | ')}`);
    exiger(!s.fenetresNatives.length, 'une fenêtre native s\'est ouverte');
} finally { await s.fermer(); }

if (echecs.length) {
    console.log('\nÉCHEC :');
    echecs.forEach((e) => console.log('  ✘', e));
    process.exit(1);
}
console.log('\nTOUT PASSE DANS LA FENÊTRE, ET LE DOIGT SUFFIT.');
