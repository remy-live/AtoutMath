// L'AIDE D'UN EXERCICE — ce qu'il faut faire, un exemple, la leçon.
//
// Le « ? » ouvrait un unique paragraphe : la consigne entière d'un trait,
// suivie des rappels de cours collés à sa suite dans le même bloc — sans
// retour à la ligne, parce que c'étaient des `<span>` dans un `<p>`. Rémy :
// « la mise en forme est maladroite, ça ne revient pas à la ligne, les aides
// ne sont pas hyper claires. On pourrait avoir un onglet exemple où on voit
// étape par étape. Je prends la consigne pour la multiplication, c'est dur à
// comprendre. »
//
// TROIS IDÉES.
//
//   1. UNE CONSIGNE A UNE TÊTE ET UNE QUEUE. La première phrase dit ce qu'on
//      doit faire ; tout le reste explique les réglages, les variantes, les
//      cas particuliers. Les afficher du même poids, c'est demander de lire
//      cinq lignes pour trouver la première. On sépare donc l'ESSENTIEL du
//      DÉTAIL, et le détail se lit en phrases distinctes, pas en pavé.
//   2. UN EXEMPLE VAUT MIEUX QU'UNE EXPLICATION, et il ne s'écrit pas à la
//      main. Chaque générateur produit déjà, pour chaque question, ses
//      `hints` — les indices dans l'ordre où on les donnerait — et son
//      `explanation`. Un exemple, c'est donc UNE VRAIE QUESTION de cet
//      exercice-ci, avec ses indices en étapes numérotées et sa réponse. Rien
//      à écrire dans les descripteurs, rien qui puisse se désynchroniser.
//   3. CE QUI N'A PAS DE GÉNÉRATEUR A UN ROBOT. La moitié du catalogue est
//      faite de jeux : ils n'ont pas de « question », ils ont un plateau. Pour
//      eux, l'exemple, c'est de regarder le robot jouer — et le dire vaut
//      mieux qu'un onglet vide.
//
// Module pur : pas de DOM. C'est ui/aideExercice.js qui peint.

/** Coupe un texte en phrases, en respectant les abréviations courantes. */
export function phrases(texte) {
    const t = String(texte || '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    // On coupe après . ! ? ou : suivis d'une espace et d'une majuscule (ou
    // d'un guillemet ouvrant, fréquent ici : « Le réglage « Jusqu'à » … »).
    return t.split(/(?<=[.!?])\s+(?=[«"A-ZÀÂÉÈÊËÎÏÔÖÙÛÜÇ0-9])/)
        .map(p => p.trim()).filter(Boolean);
}

/**
 * LA TÊTE ET LA QUEUE D'UNE CONSIGNE.
 *
 * L'essentiel est la première phrase — sauf si elle est très courte (« Lis le
 * nombre. »), auquel cas la suivante la complète : une consigne de quatre mots
 * en gros caractères tout en haut d'un panneau vide n'aide personne.
 */
export function decouperConsigne(texte) {
    const p = phrases(texte);
    if (!p.length) return { essentiel: '', details: [] };
    const essentiel = [p[0]];
    if (p.length > 1 && p[0].length < 45) essentiel.push(p[1]);
    return { essentiel: essentiel.join(' '), details: p.slice(essentiel.length) };
}

/**
 * L'EXEMPLE, à partir d'une question réellement engendrée.
 *
 * Les indices sont donnés dans l'ordre où l'exercice les donnerait. Le
 * DERNIER indice est souvent la réponse elle-même (« 10 × 6 = 60. ») : le
 * garder ferait deux fois la même ligne, l'explication venant juste après. On
 * l'écarte quand il redit l'explication.
 */
export function etapesExemple(item) {
    if (!item) return null;
    const question = (item.prompt && (item.prompt.text || item.prompt.html)) || '';
    const explication = String(item.explanation || '').trim();
    const bruts = (item.hints || []).map(h => String(h || '').trim()).filter(Boolean);
    const memeChose = (a, b) => normaliser(a) === normaliser(b);
    const etapes = bruts.filter((h, i) =>
        !(i === bruts.length - 1 && explication && memeChose(h, explication)));
    return {
        question: String(question).trim(),
        etapes,
        reponse: item.answer === undefined || item.answer === null ? '' : String(item.answer),
        explication
    };
}

const normaliser = (s) => String(s).toLowerCase()
    .replace(/[\s.;,!?]/g, '')
    .replace(/[×x*]/g, '×');

/**
 * Un exemple est-il possible ? Il faut un générateur — un jeu de plateau n'a
 * pas de « question » à montrer, il a un robot.
 */
export const peutMontrerUnExemple = (exo) => !!(exo && exo.generatorId);

/** Les rappels de cours, sans doublon et bornés : trois suffisent à relire. */
export function leconsDe(liste, maximum = 3) {
    return [...new Set((liste || []).map(l => String(l || '').trim()).filter(Boolean))]
        .slice(0, maximum);
}

/**
 * LES ONGLETS RÉELLEMENT OFFERTS. Un onglet vide est pire qu'un onglet absent :
 * on clique, il ne se passe rien, et l'on cesse de croire au panneau.
 */
export function ongletsPour({ exo, lecons = [] } = {}) {
    const onglets = [{ id: 'consigne', label: 'Ce qu\'il faut faire' }];
    onglets.push({ id: 'exemple', label: peutMontrerUnExemple(exo) ? 'Un exemple' : 'Voir jouer' });
    if (lecons.length) onglets.push({ id: 'lecon', label: 'La leçon' });
    return onglets;
}
