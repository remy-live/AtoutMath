// COMBIEN DE COLONNES CHAQUE FICHE OBTIENT, sur tout le catalogue.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/colonnesDuCatalogue.mjs [> avant.txt]
//
// POURQUOI CET OUTIL EXISTE. Rémy : « pour diviser par 2 fractions, par défaut
// mets 2 colonnes pour l'impression ». Le catalogue le disait DÉJÀ, et la
// feuille sortait en une colonne : la mise en page retire une colonne dès
// qu'une cellule à fraction ou à trou se coupe, et deux questions sur vingt
// suffisaient à faire reculer les dix-huit autres.
//
// TOUCHER À CETTE RÈGLE TOUCHE AUX 249 FICHES. « Une mesure qui ne regarde que
// ce qu'on a corrigé ne voit pas ce qu'on a cassé » : on relève donc le nombre
// de colonnes de TOUTES les fiches avant, puis après, et l'on compare.
//
//   node tools/colonnesDuCatalogue.mjs > tools/tmp/avant.txt
//   …on corrige…
//   node tools/colonnesDuCatalogue.mjs > tools/tmp/apres.txt
//   diff tools/tmp/avant.txt tools/tmp/apres.txt
//
// ON NE PASSE PAS PAR LA MODALE : elle coûte trois secondes par exercice, soit
// un quart d'heure. On appelle `composerBlocs` dans la page, avec le VRAI
// mesureur de la fiche — c'est le même calcul, sans l'écran.

import { ouvrirSonde } from './sonde.mjs';

const COMBIEN = Number(process.env.QUESTIONS || 20);

const s = await ouvrirSonde({ largeur: 1280, hauteur: 860 });
await s.identifier();

const lignes = await s.page.evaluate(async (combien) => {
    const { exercices } = await import('./js/data/catalog.js');
    const { getGenerator } = await import('./js/core/registry.js');
    const { makeRng } = await import('./js/core/ids.js');
    await import('./js/core/activities/index.js');
    const { mesureur } = await import('./js/ui/ficheRendu.js');
    const F = await import('./js/core/fiche.js');
    const mes = mesureur();
    const sortie = [];
    for (const exo of exercices) {
        const gen = getGenerator(exo.generatorId);
        if (!gen || typeof gen.generate !== 'function') continue;
        const questions = [];
        let cassé = '';
        try {
            for (let i = 0; i < combien; i++) {
                const it = gen.generate({ ...(exo.params || {}) },
                    { rng: makeRng(exo.id + 'col' + i), index: i });
                const texte = it.prompt.papier || it.prompt.text || '';
                if (!texte) continue;
                questions.push({
                    texte, reponse: it.answer,
                    fractions: F.porteUneFraction(texte),
                    choix: (it.choices || []).map(c => c.label)
                });
            }
        } catch (e) { cassé = String(e && e.message || e).slice(0, 40); }
        if (cassé) { sortie.push(`${exo.id} ERREUR ${cassé}`); continue; }
        if (!questions.length) continue;
        let mise;
        try {
            mise = F.composerBlocs([{
                id: exo.id, consigne: exo.consignePapier || '', questions,
                colonnes: exo.colonnesPapier, numeroter: true
            }], {}, mes);
        } catch (e) { sortie.push(`${exo.id} ERREUR ${String(e.message).slice(0, 40)}`); continue; }
        const obtenu = (mise.colonnes && mise.colonnes[0]) || 0;
        const voulu = exo.colonnesPapier || 'auto';
        sortie.push(`${exo.id.padEnd(30)} voulu=${String(voulu).padEnd(5)}`
            + ` obtenu=${obtenu}  pages=${mise.pages.length}`);
    }
    return sortie;
}, COMBIEN);

lignes.forEach(l => console.log(l));
const chiffres = lignes.map(l => /obtenu=(\d+)/.exec(l)).filter(Boolean).map(m => Number(m[1]));
const compte = {};
chiffres.forEach(n => { compte[n] = (compte[n] || 0) + 1; });
console.log('\n' + lignes.length + ' fiche(s) · '
    + Object.keys(compte).sort().map(k => `${compte[k]} à ${k} colonne(s)`).join(' · '));
console.log('erreurs de page :', s.erreurs.length);
await s.fermer();
