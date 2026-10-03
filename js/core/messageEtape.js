// UN MOT DU PROFESSEUR, ENTRE DEUX EXERCICES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans le parcours ce qui serait sympa c'est de pouvoir caler un
// message entre les exercices, pour expliquer un peu. »
//
// C'est ce qu'il fait à l'oral en classe — « attention, maintenant on change de
// méthode » — et que personne ne dit à l'élève qui travaille seul chez lui.
//
// ── CE MODULE NE FAIT QU'UNE CHOSE : LE TEXTE ───────────────────────────────
//
// Il transforme ce que Rémy tape en HTML affichable, et il le fait SANS
// NAVIGATEUR, pour qu'on puisse l'éprouver. C'est le seul endroit du logiciel
// où du texte écrit par un professeur devient du HTML : s'il laisse passer une
// balise, elle s'exécute chez trente élèves. Il est donc écrit dans cet ordre —
// on échappe TOUT d'abord, on reconnaît la mise en forme ENSUITE.
//
// ── LA MISE EN FORME S'ARRÊTE À TROIS CHOSES, ET C'EST UNE DÉCISION ─────────
//
// Les retours à la ligne, les paragraphes, et `*un mot entre étoiles*` qui
// devient gras. Rien d'autre : ni barre d'outils, ni couleurs, ni listes.
//
// POURQUOI SI PEU. Rémy, sur le choix de la mise en forme : « du texte, des
// retours à la ligne, du gras ». Un éditeur plus riche ne coûte pas cher à
// écrire — il coûte cher à VIVRE : on passe ses soirées à mettre en forme du
// texte au lieu de préparer des exercices. Le jour où les formules
// mathématiques seront vraiment nécessaires, elles viendront par la porte du
// moteur d'énoncés, pas par une syntaxe de plus ici.

/** Le texte le plus long qu'on accepte. Au-delà, ce n'est plus un mot : c'est un cours. */
export const LONGUEUR_MAX = 1200;

/** Et le titre tient sur une ligne. */
export const TITRE_MAX = 60;

/**
 * ÉCHAPPER, ET ÉCHAPPER D'ABORD.
 *
 * Les cinq caractères qui comptent. `&` EN PREMIER, sans quoi l'on
 * ré-échapperait les `&` que l'on vient d'écrire — un `<` deviendrait
 * `&amp;lt;` et s'afficherait tel quel à l'élève.
 */
function echapper(texte) {
    return String(texte)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * LE TEXTE, NETTOYÉ MAIS PAS CORRIGÉ.
 *
 * On enlève les blancs des deux bouts, on ramène les fins de ligne de Windows
 * et des vieux Mac à `\n`, et l'on borne la longueur. On ne touche à rien
 * d'autre : ce que Rémy a écrit est ce que l'élève lit.
 */
export function texteNettoye(brut) {
    return String(brut == null ? '' : brut)
        .replace(/\r\n?/g, '\n')
        .trim()
        .slice(0, LONGUEUR_MAX);
}

/** Le titre : une ligne, sans retour à la ligne possible. */
export function titreNettoye(brut) {
    return String(brut == null ? '' : brut)
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, TITRE_MAX);
}

/**
 * CE MOT EST-IL VIDE — c'est-à-dire : n'a-t-il RIEN à montrer ?
 *
 * MESURÉ DANS LA SÉANCE DE RÉMY. Sa séance « Relatifs » portait trois mots, et
 * le dernier avait titre et texte vides : `{ titre: '', texte: '' }`. À
 * l'exécution, c'était une étape de plus dans le fil, un écran avec une bulle
 * de bande dessinée, aucun texte, et un bouton « J'ai compris » sous le vide.
 * L'élève aurait cherché ce qu'il devait comprendre.
 *
 * ON NE L'EFFACE PAS DE L'ATELIER POUR AUTANT : c'est peut-être un mot que
 * Rémy allait écrire. Il est écarté à l'HYDRATATION, là où le parcours devient
 * ce que l'élève traverse — voir `hydratePath`.
 */
export function motVide(message) {
    const m = message || {};
    return !titreNettoye(m.titre) && !texteNettoye(m.texte);
}

/**
 * CE QU'ON MONTRE DANS UNE LISTE quand il n'y a pas de titre.
 *
 * L'atelier et le fil de la séance ont besoin d'un nom pour chaque étape. Sans
 * cela, Rémy verrait « Message » trois fois dans sa liste et ne saurait pas
 * lequel il ouvre.
 */
export function apercuDuMessage(message, combien = 48) {
    const m = message || {};
    const titre = titreNettoye(m.titre);
    if (titre) return titre;
    const texte = texteNettoye(m.texte).replace(/\s+/g, ' ');
    if (!texte) return 'Message';
    return texte.length <= combien ? texte : texte.slice(0, combien - 1).trimEnd() + '…';
}

/**
 * LE TEXTE EN HTML — échappé d'abord, mis en forme ensuite.
 *
 * ── CE QUE LA SYNTAXE RECONNAÎT ────────────────────────────────────────────
 *
 *   · une ligne vide sépare deux paragraphes ;
 *   · un simple retour à la ligne reste un retour à la ligne ;
 *   · `*gras*` met en gras ce qui est entre les étoiles.
 *
 * ── TROIS DÉCISIONS QUI SE SONT PRISES EN L'ÉCRIVANT ───────────────────────
 *
 * UNE ÉTOILE SEULE RESTE UNE ÉTOILE. « 3 * 4 » doit s'afficher « 3 * 4 », et
 * non ouvrir un gras qui ne se referme jamais. On n'ouvre donc le gras que si
 * l'étoile est COLLÉE au mot qu'elle commence, et qu'une autre le referme sur
 * la même ligne.
 *
 * ON NE TRAVERSE PAS UNE LIGNE VIDE. Sans cela, une étoile oubliée en haut du
 * message mettrait en gras tout ce qui suit, jusqu'à la fin.
 *
 * L'ÉCHAPPEMENT EST FAIT AVANT, donc la mise en forme travaille sur un texte
 * où `<b>` est déjà `&lt;b&gt;` : les seules balises de la sortie sont celles
 * que ce module écrit lui-même. C'est l'ordre qui garantit cela, pas une liste
 * de choses interdites — une liste s'oublie, un ordre se lit.
 *
 * @param {string} brut  ce que le professeur a tapé
 * @returns {string} du HTML, sûr à insérer
 */
export function messageEnHtml(brut) {
    const texte = texteNettoye(brut);
    if (!texte) return '';
    return texte
        .split(/\n{2,}/)
        .map((paragraphe) => {
            const lignes = paragraphe.split('\n')
                .map((ligne) => gras(echapper(ligne)))
                .join('<br>');
            return `<p>${lignes}</p>`;
        })
        .join('');
}

/**
 * `*gras*` → `<b>gras</b>`, et une étoile seule reste une étoile.
 *
 * L'étoile ouvrante est collée à un caractère qui n'est ni une espace ni une
 * étoile ; la fermante est collée de l'autre côté. « 3 * 4 * 5 » n'a donc
 * aucun gras, et « *attention* » en a un.
 */
function gras(ligne) {
    return ligne.replace(/\*([^\s*][^*]*?)\*/g, '<b>$1</b>');
}
