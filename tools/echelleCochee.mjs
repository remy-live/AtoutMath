// L'ÉCHELLE SE COCHE, ET LES QUESTIONS SUIVENT LES CASES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « il faudrait pouvoir faire les check box comme pour le calcul
// littéral ». Un menu à choix unique ne sait dire qu'un barreau ; la colonne
// de cases dit « les trois premiers », « le 2 et le 4 », « le dernier tout
// seul » — et c'est très exactement comment on prépare une séance après une
// leçon.
//
// CE QUE SEULE UNE SONDE PEUT DIRE, ET C'EST TOUT L'ENJEU : que les questions
// POSÉES suivent les cases. Une épreuve statique voit le réglage changer de
// forme ; elle ne voit pas un moteur qui continue de lire `params.niveau` et
// sert le même barreau seize fois. C'est le seul vrai risque de cette
// conversion — le réglage a l'air de marcher, et rien ne bouge.
//
//   node tools/echelleCochee.mjs [identifiant,…]
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const DEMANDES = (process.argv[2] || 'calc-prio-cascade,calc-prio-relatifs,calc-prio-oppose')
    .split(',').filter(Boolean);

const s = await ouvrirSonde({ largeur: 1100, hauteur: 900 });
await s.identifier();

for (const id of DEMANDES) {
    // ON DEMANDE TOUS LES BARREAUX, puis on regarde ce qui tombe. Avec un seul
    // coché, un moteur resté sur `params.niveau` donnerait le même résultat
    // qu'un moteur corrigé : il faut en cocher PLUSIEURS pour que la
    // différence existe.
    const schema = await s.page.evaluate(async (id) => {
        const { getExerciseById, paramSchemaOf } = await import('./js/data/catalog.js');
        const exo = getExerciseById(id);
        const p = (paramSchemaOf(exo) || []).find((x) => x && x.type === 'marches');
        return p ? { mot: p.mot, barreaux: (p.marches || []).map((m) => m.id) } : null;
    }, id);
    if (!schema) { console.log(`${id.padEnd(26)} \x1b[31mPAS D'ÉCHELLE À COCHER\x1b[0m`); continue; }

    // Les niveaux réellement servis, question après question.
    const vus = await s.page.evaluate(async ([id, barreaux]) => {
        const { getExerciseById } = await import('./js/data/catalog.js');
        const exo = getExerciseById(id);
        const params = { ...(exo.params || {}), // `totalDe` LIT `nbQuestions`, PAS `nbItems` : ma première version posait
            // le second, le découpage retombait sur son défaut historique de deux
            // questions par barreau, et la répartition sortait 2/2/2/10. La sonde
            // avait tort, pas le moteur.
            marches: barreaux, nbQuestions: 16, seed: 42 };
        // ON PASSE PAR LE MOTEUR, pas par l'écran : ce qu'on veut savoir est
        // quel BARREAU chaque question emploie, et l'écran ne le dit pas.
        const { marchesCochees, marcheAuRang, totalDe } =
            await import('./js/core/progression.js');
        const { MARCHES_PRIORITES, MARCHES_OPPOSE, ANCIEN_NIVEAU } =
            await import('./js/core/priorites.js');
        const echelle = params.oppose ? MARCHES_OPPOSE : MARCHES_PRIORITES;
        const cochees = marchesCochees(params, echelle, ANCIEN_NIVEAU);
        const out = [];
        for (let i = 0; i < 16; i++) {
            out.push(String(marcheAuRang(i, cochees, totalDe(null, params), params)));
        }
        return out;
    }, [id, schema.barreaux]);

    const distincts = [...new Set(vus)];
    const ok = distincts.length === schema.barreaux.length;
    console.log(`${id.padEnd(26)} ${schema.barreaux.length} barreau(x) · 16 questions → `
        + `${distincts.length} servi(s) : ${vus.join('')}  `
        + (ok ? '\x1b[32mOK\x1b[0m' : '\x1b[31mTOUS LES BARREAUX COCHÉS NE SORTENT PAS\x1b[0m'));
}

// ON NE VÉRIFIE PAS ICI QUE LE PANNEAU DESSINE DES CASES : le rendu de
// `type: 'marches'` est celui de soixante-trois autres exercices, et ma
// première version le cherchait par un sélecteur inventé qui rendait 0 des
// deux côtés — un contrôle qui ne peut pas tomber vaut moins que pas de
// contrôle. Ce qui se mesure ici est ce qui ne se lit nulle part ailleurs :
// les barreaux RÉELLEMENT servis, question après question.

console.log('\nerreurs de page : ' + s.erreurs.length + ' · fenêtres natives : ' + s.fenetresNatives.length);
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
await s.fermer();
