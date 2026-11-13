// L'EXERCICE RÉCOMPENSE SE PRÉSENTE, ET DIT QU'ON PEUT LE LAISSER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai aussi quand il y a un exercice récompense qu'on ait une
// popup qui explique que c'est un exercice récompense et qu'il est facultatif
// et qu'on peut passer au suivant sans le réussir ».
//
// CE QUE CETTE SONDE MESURE, et qu'aucune épreuve de bureau ne peut dire :
//
//   · QUE LA FENÊTRE S'OUVRE sur une étape récompense, par-dessus le jeu DÉJÀ
//     MONTÉ — on ferme, on y est.
//   · QU'ELLE NE S'OUVRE PAS sur un exercice ordinaire. Une fenêtre qui
//     s'ouvre partout n'annonce plus rien.
//   · QUE LE BOUTON « PASSER » EST LÀ. C'est la moitié qui compte : la fenêtre
//     annonce qu'on peut passer au suivant, et une promesse sans porte est un
//     mensonge que l'élève découvre tout seul, en cherchant.
//   · ET QU'ELLE NE REVIENT PAS une deuxième fois sur la même étape.
//
//     node tools/laRecompenseSePresente.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

// LA FENÊTRE OCCUPE TOUT L'ÉCRAN DU JEU : une sonde de la taille exacte rend
// une photo coupée de seize pixels. On ouvre plus grand qu'on ne mesure.
const s = await ouvrirSonde({ largeur: 1360, hauteur: 980 });
await s.identifier();

/**
 * Un parcours de deux étapes : un exercice ordinaire, puis une RÉCOMPENSE.
 *
 * `bonus: true` est ce qui fait une récompense — voir `estRecompense` dans
 * `core/recompenses.js`. On démarre directement sur l'étape demandée.
 */
const lancer = (surLaRecompense) => s.page.evaluate(async (bonus) => {
    const { Runner } = await import('/js/core/runner.js');
    const { makePath, makeStep } = await import('/js/core/path.js');
    const { politiquePerso } = await import('/js/core/mesExercices.js');
    const travail = makeStep('calc-add', {}, { stepId: 't1', nbItems: 3 });
    const cadeau = makeStep('jeu-boulder-dash', {}, { stepId: 'c1', nbItems: 1 });
    cadeau.bonus = true;
    const path = makePath('Avec récompense', [travail, cadeau], politiquePerso());
    new Runner({
        path, deviceMode: 'none', isStudentPath: true,
        startIndex: bonus ? 1 : 0, sansCarteDOuverture: true
    }).start();
    return 'lancé';
}, surLaRecompense);

const fenetre = () => s.page.evaluate(() => {
    const b = document.getElementById('run-mot-popup');
    const passer = document.getElementById('btn-passer-exo');
    return {
        ouverte: !!b,
        cadeau: !!b && !!b.querySelector('.run-mot-carte--cadeau'),
        // ON NE COUPE PAS CE QU'ON CHERCHE. La première version tronquait à
        // 160 caractères, et la phrase qui compte — « tu peux passer au
        // suivant » — est la DERNIÈRE de la fenêtre : la sonde a déclaré
        // absente une phrase qu'elle avait sous les yeux.
        texte: b ? b.innerText.replace(/\s+/g, ' ').trim() : null,
        bouton: b ? (b.querySelector('#btn-run-mot') || {}).textContent : null,
        passerVisible: !!passer && !passer.hidden
    };
});

console.log('\n── SUR UN EXERCICE ORDINAIRE ──');
console.log('  ', await lancer(false));
await dormir(2200);
const ordinaire = await fenetre();
console.log('  ', JSON.stringify(ordinaire));
dire(ordinaire.ouverte === false,
    'AUCUNE fenêtre sur un exercice de la séance — sinon elle n’annonce plus rien');

// `window.state` N'EXISTE PAS, et c'est le genre de détail qui rend une sonde
// verte pour rien : un appel qui ne fait rien laisse l'écran dans l'état où il
// était, et l'état où il était est justement celui qu'on espérait. Le meneur de
// l'application se prend par le module.
const leMeneur = async (quoi) => s.page.evaluate(async (q) => {
    const { state } = await import('/js/core/state.js');
    const r = state.activeSequenceRunner;
    if (!r) return 'aucun meneur';
    if (q === 'finir') { try { r.finish(true); } catch (e) { return 'erreur'; } return 'fini'; }
    if (q === 'rejouer') { r.runStep(); return 'rejoué'; }
    if (q === 'repeindre') {
        r.montrerLaRecompense({ stepId: 'photo', exercise: { title: 'Boulder Dash' } });
        return 'repeinte';
    }
    return '?';
}, quoi);

console.log('  on referme :', await leMeneur('finir'));
await dormir(600);

console.log('\n── SUR L’EXERCICE RÉCOMPENSE ──');
console.log('  ', await lancer(true));
await dormir(2600);
const cadeau = await fenetre();
console.log('  ', JSON.stringify(cadeau));
dire(cadeau.ouverte === true, 'la fenêtre s’ouvre');
dire(cadeau.cadeau === true, 'et elle porte l’habillage du cadeau, pas celui d’un avertissement');
dire(/récompense/i.test(cadeau.texte || ''), 'elle dit que c’est une récompense');
dire(/pas obligé|facultat/i.test(cadeau.texte || ''), 'elle dit qu’elle est facultative');
dire(/passer au suivant/i.test(cadeau.texte || ''),
    'et surtout qu’on peut PASSER AU SUIVANT — c’est la phrase qui compte');
dire(cadeau.passerVisible === true,
    'le bouton « Passer » est OUVERT : une promesse sans porte est un mensonge');

// ── ELLE NE REVIENT PAS ─────────────────────────────────────────────────────
await s.page.evaluate(() => {
    const b = document.getElementById('btn-run-mot');
    if (b) b.click();
});
await dormir(500);
const fermee = await fenetre();
dire(fermee.ouverte === false, 'le bouton la referme');
console.log('  on rejoue l’étape :', await leMeneur('rejouer'));
await dormir(1800);
const deuxieme = await fenetre();
console.log('  après avoir rejoué l’étape :', JSON.stringify(deuxieme.ouverte));
dire(deuxieme.ouverte === false,
    'et elle ne revient pas sur la même étape — une fenêtre déjà lue se ferme sans être lue');

// ON PHOTOGRAPHIE LA CARTE, PAS LA COUCHE ENTIÈRE : `#game-layer` fait la
// taille de la fenêtre, donc la découpe déborde toujours de seize pixels.
console.log('  on la rouvre pour la photo :', await leMeneur('repeindre'));
await dormir(500);
await s.doitExister('.run-mot-carte');
await s.photo('.run-mot-carte', 'tools/tmp/recompense-fenetre.png');
console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
ko += s.erreurs.length + s.fenetresNatives.length;
for (const e of s.erreurs.slice(0, 4)) console.log('  !', e);
await s.fermer();
console.log(ko === 0 ? '\nLA RÉCOMPENSE SE PRÉSENTE, ET ON PEUT LA LAISSER.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
