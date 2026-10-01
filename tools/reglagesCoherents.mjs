// LES RÉGLAGES SONT-ILS COHÉRENTS D'UN EXERCICE À L'AUTRE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai que tu checkes les exercices pour voir si on est cohérent
// dans les réglages ».
//
// LA QUESTION EST BONNE PARCE QU'ELLE NE SE VOIT PAS. Chaque panneau, pris
// seul, a l'air raisonnable ; c'est en les mettant côte à côte qu'on découvre
// que la même idée s'écrit de trois façons. Et un professeur qui apprend un
// réglage sur un exercice s'attend à le retrouver sur le suivant — sinon il
// n'apprend rien, il mémorise.
//
// CE QU'ON REGARDE, ET POURQUOI :
//
//   1. LA PROGRESSION. Trente-huit générateurs déclarent leurs marches par
//      `paramMarches` : des cases à cocher, la longueur qui suit, le partage
//      réglable, et le tout réservé au professeur. Un exercice qui a une
//      échelle mais l'écrit en menu déroulant fait exception — et c'est
//      exactement l'écart que Rémy a repéré : « tu ne fais pas les étapes à
//      cocher, on avait convenu de cela de manière globale ».
//
//   2. LE RÉGLAGE ÉCRIT DEUX FOIS. Quand le catalogue redéclare un réglage que
//      le générateur déclare déjà, c'est le catalogue qui gagne, en silence.
//      Le professeur règle alors quelque chose que le générateur ne lit pas.
//
//   3. LES PANNEAUX QUI DÉBORDENT. Un panneau de vingt commandes ne se règle
//      pas, il se subit. On compte, on ne juge pas : c'est au lecteur de dire
//      si l'exercice les mérite.
//
// IL NE CORRIGE RIEN. Il dit où regarder ; la décision reste à Rémy.

import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import '../js/core/activities/index.js';

const seulement = process.argv[2] || '';
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const jaune = (t) => `\x1b[33m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

/** Les réglages que verra le professeur : ceux du générateur ET du catalogue. */
function reglagesDe(exo) {
    const gen = exo.generatorId ? getGenerator(exo.generatorId) : null;
    const duGen = (gen && Array.isArray(gen.params)) ? gen.params : [];
    const duCatalogue = Array.isArray(exo.paramSchema) ? exo.paramSchema : [];
    return { duGen, duCatalogue, tous: [...duGen, ...duCatalogue] };
}

/**
 * CET EXERCICE A-T-IL UNE ÉCHELLE ?
 *
 * On ne se fie pas au nom du réglage : « niveau » désigne parfois une taille de
 * nombres, pas une progression. Les trois signes qui ne trompent pas sont le
 * type `marches`, le drapeau `echelle` que le catalogue pose lui-même, et le
 * mot `barreau` employé par le générateur.
 */
/**
 * LES ÉCHELLES QU'ON LAISSE EN MENU, ET POURQUOI.
 *
 * La convention de la maison est la liste à cocher. Elle n'est pas un dogme :
 * elle existe parce qu'elle dit « les quatre premières », « A et C », « la 7
 * toute seule » — ce qu'un menu à choix unique ne peut pas exprimer. Là où ce
 * gain n'existe pas, l'imposer coûterait plus qu'il ne rapporte.
 *
 * UNE EXCEPTION S'ÉCRIT, AVEC SA RAISON. Sans cette table, l'outil redésigne
 * le même écart à chaque passage, on s'habitue à le voir, et le jour où un
 * VRAI écart s'ajoute il se range dans un décor qu'on ne lit plus. Un
 * détecteur qui crie au loup se fait désactiver au troisième cri.
 */
const MENUS_ACCEPTÉS = {
    'defi-pousseur':
        'cinquante niveaux de Sokoban, joués dans l\'ordre. Cocher cinquante '
        + 'cases est illisible, et « les douze premiers » ne veut rien dire ici : '
        + 'on ne compose pas un entraînement avec des tableaux de Sokoban, on '
        + 'reprend là où l\'on s\'est arrêté.'
};

function echelleDe(exo) {
    const { duGen, duCatalogue } = reglagesDe(exo);
    const cases = duGen.find((p) => p && p.type === 'marches');
    if (cases) return { sorte: 'cases', combien: (cases.marches || []).length, ou: 'générateur' };
    const menuGen = duGen.find((p) => p && p.echelle);
    if (menuGen) return { sorte: 'menu', combien: (menuGen.options || []).length, ou: 'générateur' };
    const menuCat = duCatalogue.find((p) => p && p.echelle);
    if (menuCat) return { sorte: 'menu', combien: (menuCat.options || []).length, ou: 'catalogue' };
    return null;
}

const lignes = [];
const aCocher = [];
const aMenu = [];
const enDouble = [];
const gros = [];

for (const exo of exercices) {
    if (seulement && !exo.id.includes(seulement)) continue;
    const { duGen, duCatalogue, tous } = reglagesDe(exo);

    // 1. La progression.
    const e = echelleDe(exo);
    if (e) (e.sorte === 'cases' ? aCocher : aMenu).push({ exo, e });

    // 2. Le même réglage déclaré des deux côtés, ET D'UNE AUTRE NATURE.
    //
    // REDÉCLARER N'EST PAS TOUJOURS UNE FAUTE, et la première version de cet
    // outil criait au loup dessus : le logigramme et les solides réutilisent le
    // réglage du générateur — `casesDeNiveau()`, `casesDeSolides()` — pour lui
    // ajouter un libellé et une aide. Leur commentaire le dit en toutes
    // lettres : « la carte réécrit son panneau, elle ne réécrit pas la
    // progression ». Un outil qui les accuse apprend à ignorer ses alertes.
    //
    // CE QUI EST VRAIMENT UN DÉFAUT, c'est REMPLACER : le catalogue redéclare
    // le réglage AVEC UN AUTRE TYPE, et le professeur règle alors quelque
    // chose que le générateur ne lit pas.
    const parIdGen = new Map(duGen.filter((x) => x && x.id).map((x) => [x.id, x]));
    const doubles = duCatalogue
        .filter((x) => x && x.id && parIdGen.has(x.id) && x.type && x.type !== parIdGen.get(x.id).type)
        .map((x) => `${x.id} : ${parIdGen.get(x.id).type} → ${x.type}`);
    if (doubles.length) enDouble.push({ exo, doubles });

    // 3. Les panneaux qui débordent.
    if (tous.length >= 12) gros.push({ exo, n: tous.length });

    lignes.push({ exo, n: tous.length, e });
}

console.log(`\n\x1b[1mRÉGLAGES — ${lignes.length} exercices lus\x1b[0m\n`);

console.log(`\x1b[1mLA PROGRESSION\x1b[0m`);
console.log(`  ${vert(aCocher.length + ' à cocher')} (paramMarches) · `
    + `${aMenu.length ? rouge(aMenu.length + ' en menu') : vert('0 en menu')}`);
// LES EXCEPTIONS ÉCRITES SORTENT DE LA LISTE DES ÉCARTS, et se disent à part.
const excuses = aMenu.filter(({ exo }) => MENUS_ACCEPTÉS[exo.id]);
const ecarts = aMenu.filter(({ exo }) => !MENUS_ACCEPTÉS[exo.id]);

if (ecarts.length) {
    console.log(gris('\n  Ceux-ci ont une échelle mais l\'écrivent en menu déroulant.'));
    console.log(gris('  La convention de la maison est la liste à cocher : elle dit'));
    console.log(gris('  « les quatre premières », « A et C », « la 7 toute seule » —'));
    console.log(gris('  ce qu\'un menu à choix unique ne peut pas exprimer.\n'));
    for (const { exo, e } of ecarts) {
        console.log(`    ${rouge('menu')} ${exo.id.padEnd(30)} ${String(e.combien).padStart(2)} crans`
            + gris(`  (déclaré au ${e.ou})  « ${exo.title} »`));
    }
}

if (excuses.length) {
    console.log(gris('\n  Et ceux-ci restent en menu, pour une raison écrite :\n'));
    for (const { exo, e } of excuses) {
        console.log(`    ${gris('menu')} ${exo.id.padEnd(30)} ${String(e.combien).padStart(2)} crans`);
        console.log(gris(`           ${MENUS_ACCEPTÉS[exo.id]}`));
    }
}

if (enDouble.length) {
    console.log(`\n\x1b[1mLE MÊME RÉGLAGE ÉCRIT DEUX FOIS\x1b[0m`);
    console.log(gris('  Le catalogue redéclare un réglage du générateur : c\'est le'));
    console.log(gris('  catalogue qui gagne, en silence, et le générateur ne lit plus'));
    console.log(gris('  ce que le professeur croit régler.\n'));
    for (const { exo, doubles } of enDouble) {
        console.log(`    ${rouge('double')} ${exo.id.padEnd(30)} ${doubles.join(', ')}`);
    }
}

if (gros.length) {
    console.log(`\n\x1b[1mLES PANNEAUX LES PLUS CHARGÉS\x1b[0m`);
    console.log(gris('  On compte, on ne juge pas : certains exercices les méritent.\n'));
    for (const { exo, n } of gros.sort((a, b) => b.n - a.n).slice(0, 12)) {
        console.log(`    ${jaune(String(n).padStart(2) + ' commandes')} ${exo.id.padEnd(30)}`
            + gris(` « ${exo.title} »`));
    }
}

const mediane = lignes.map((l) => l.n).sort((a, b) => a - b)[Math.floor(lignes.length / 2)];
console.log(`\n${gris(`médiane : ${mediane} commandes par panneau`)}`);
// LE COMPTE NE RETIENT QUE LES VRAIS ÉCARTS : une exception écrite n'en est
// pas un, et la compter laisserait l'outil rouge pour toujours — donc illisible.
console.log(ecarts.length || enDouble.length
    ? rouge(`\n${ecarts.length + enDouble.length} écart(s) à regarder.`)
    : vert('\nLES RÉGLAGES DISENT LA MÊME CHOSE PARTOUT.'));
