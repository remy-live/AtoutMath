// MULTIKART, JOUÉ AU DOIGT — la course entière, sur le chemin de l'élève.
//
//   node tools/sondeMultiKart.mjs [largeur=390] [hauteur=844] [fautes=2] [circuit]
//
// RÉMY : « il faut que tout passe dans la fenêtre et que ce soit compatible
// téléphone portable ». Cette sonde ouvre l'exercice à la taille d'un
// téléphone, lit le calcul affiché, TOUCHE LE PANNEAU du bon résultat — là où
// il est dessiné, pas au clavier —, se trompe exprès `fautes` fois, franchit la
// ligne, lit le bilan et appuie sur « Continuer ».
//
// Elle JETTE si :
//   · un élément du jeu sort de sa fenêtre, ou est en position fixe ;
//   · la page défile en largeur ;
//   · un toucher sur un panneau n'envoie pas le kart dans sa voie ;
//   · le calcul, la place ou le compte se lisent mal SUR LES PIXELS ;
//   · le bilan n'annonce pas le compte attendu ;
//   · l'étape du parcours n'est pas close après « Continuer » ;
//   · la page a levé une erreur ou ouvert une fenêtre native.
//
// Les photos vont dans tools/tmp/ : départ, course, bilan.

import { ouvrirSonde } from './sonde.mjs';

const [largeur = '390', hauteur = '844', fautes = '2', circuit = ''] = process.argv.slice(2);
const nom = `${largeur}x${hauteur}`;
const s = await ouvrirSonde({ largeur: Number(largeur), hauteur: Number(hauteur) });
const echecs = [];
const exiger = (vrai, quoi) => { if (!vrai) echecs.push(quoi); };

const dehors = () => s.page.evaluate(() => {
    const w = document.querySelector('#mk-wrap').getBoundingClientRect();
    const out = [];
    document.querySelectorAll('#mk-wrap *').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (getComputedStyle(e).position === 'fixed') out.push(`FIXE ${e.id || e.className}`);
        // Les cartes du départ et du bilan défilent DANS leur voile : ce qui
        // en dépasse y est rogné, pas montré hors du jeu.
        if (e.closest('.mk-voile') && !e.classList.contains('mk-voile')) return;
        if (r.left < w.left - 1 || r.right > w.right + 1 || r.top < w.top - 1 || r.bottom > w.bottom + 1) {
            out.push(`${e.id || e.className} dépasse`);
        }
    });
    return { out, page: document.documentElement.scrollWidth > innerWidth,
        fenetre: [Math.round(w.width), Math.round(w.height)] };
});

try {
    await s.identifier();
    await s.ouvrirExercice('calc-multikart');
    await s.doitExister('#mk-go');
    await s.page.waitForTimeout(400);
    let d = await dehors();
    console.log(`fenêtre du jeu : ${d.fenetre[0]} × ${d.fenetre[1]} dans un écran de ${largeur} × ${hauteur}`);
    exiger(!d.out.length, `au départ : ${d.out.join(' ; ')}`);
    exiger(!d.page, 'la page défile en largeur');
    const carte = await s.page.evaluate(() => {
        const v = document.querySelector('#mk-depart'), b = document.querySelector('#mk-go').getBoundingClientRect();
        const w = document.querySelector('#mk-wrap').getBoundingClientRect();
        return { defile: v.scrollHeight > v.clientHeight + 1, boutonVu: b.bottom <= w.bottom + 1 && b.top >= w.top };
    });
    exiger(carte.boutonVu || carte.defile, 'le bouton « Départ ! » est hors de la fenêtre et rien ne défile');
    console.log(`carte de départ : bouton visible sans défiler = ${carte.boutonVu}`);
    await s.page.screenshot({ path: `tools/tmp/mk-${nom}-depart.png` });
    if (circuit) await s.page.tap(`[data-circuit="${circuit}"]`).catch(() => s.page.click(`[data-circuit="${circuit}"]`));
    await s.page.click('#mk-go');

    const boite = await s.page.evaluate(() => {
        const w = document.querySelector('#mk-wrap').getBoundingClientRect();
        return { x: w.left, y: w.top, h: w.height };
    });
    let vu = '', n = 0, touchers = 0, obeis = 0, photo = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
        const e = await s.page.evaluate(() => ({
            q: document.querySelector('#mk-question').textContent,
            fin: document.querySelector('#mk-fin').classList.contains('mk-voile--vu'),
            m: document.querySelector('#mk-wrap').mesure()
        }));
        if (e.fin) break;
        if (e.m.phase === 'course' && e.m.panneaux && e.m.choix && e.q !== vu) {
            vu = e.q; n++;
            const [a, b] = e.q.split('=')[0].split('×').map((x) => Number(x.trim()));
            let voie = e.m.choix.indexOf(a * b);
            if (n <= Number(fautes)) voie = (voie + 1) % 3;
            // Le doigt se pose SUR le panneau : à mi-hauteur du jeu, c'est la
            // piste, et le plus proche en largeur est celui qu'on vise.
            await s.page.mouse.click(boite.x + e.m.panneaux[voie], boite.y + boite.h * 0.62);
            touchers++;
            const apres = await s.page.evaluate(() => document.querySelector('#mk-wrap').mesure().voie);
            if (apres === voie) obeis++;
            if (n === 3 && !photo) {
                photo = true;
                await s.page.waitForTimeout(2600);
                d = await dehors();
                exiger(!d.out.length, `en course : ${d.out.join(' ; ')}`);
                // LE CALCUL SE LIT-IL ? Mesuré sur les PIXELS, ciel compris :
                // le bandeau est translucide, et c'est ce qu'il y a derrière
                // — soleil, nuage, lune — qui décide.
                for (const sel of ['#mk-question', '#mk-compte b', '#mk-rang b']) {
                    const c = await s.contrasteRendu(sel);
                    console.log(`contraste rendu de ${sel} : ${c.contraste.toFixed(1)}`);
                    exiger(c.contraste >= 4.5, `${sel} se lit mal : contraste ${c.contraste.toFixed(1)}`);
                }
                await s.page.screenshot({ path: `tools/tmp/mk-${nom}-course.png` });
            }
        }
        await s.page.waitForTimeout(100);
    }
    console.log(`touchers sur un panneau : ${touchers}, kart envoyé dans la bonne voie : ${obeis}`);
    exiger(touchers > 0 && obeis === touchers, `un toucher n'a pas été obéi (${obeis}/${touchers})`);

    await s.page.waitForTimeout(400);
    await s.page.screenshot({ path: `tools/tmp/mk-${nom}-bilan.png` });
    const bilan = await s.page.evaluate(() => {
        const f = document.querySelector('#mk-fin'), w = document.querySelector('#mk-wrap').getBoundingClientRect();
        const b = document.querySelector('#mk-suite').getBoundingClientRect();
        return { titre: document.querySelector('#mk-fin-titre').textContent,
            encore: document.querySelector('#mk-encore').textContent,
            aRevoir: document.querySelectorAll('.mk-puces--ko span').length,
            defile: f.scrollHeight > f.clientHeight + 1,
            boutonVu: b.bottom <= w.bottom + 1 };
    });
    console.log(`bilan : « ${bilan.titre} » — ${bilan.aRevoir} à revoir — bouton « ${bilan.encore} » — `
        + `« Continuer » visible sans défiler = ${bilan.boutonVu}`);
    const attendu = n - Number(fautes);
    exiger(bilan.titre.startsWith(`${attendu} résultat`), `bilan attendu ${attendu} justes sur ${n}, lu « ${bilan.titre} »`);
    exiger(bilan.boutonVu || bilan.defile, '« Continuer » est hors de la fenêtre et rien ne défile');
    d = await dehors();
    exiger(!d.out.length, `au bilan : ${d.out.join(' ; ')}`);

    await s.page.click('#mk-suite');
    await s.page.waitForTimeout(2400);
    const apres = await s.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const clos = /Étape validée|bonnes? réponses? sur|à retravailler|Refaire/i.test(apres);
    console.log(`après « Continuer » : étape close = ${clos}`);
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
