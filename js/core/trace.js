// CONSTRUIRE UN SEGMENT, UNE DROITE, UNE DEMI-DROITE — en cliquant le trait.
//
// Rémy, devant « Quel dessin représente (DF) ? » et ses quatre vignettes :
// « un peu bête comme question ; il faudrait plutôt cliquer sur des bouts de
// droite pour faire apparaître le schéma ».
//
// Il a raison, et pour une raison de fond : reconnaître le bon dessin parmi
// quatre, c'est comparer des images. On y arrive en repérant « celui qui
// dépasse des deux côtés » sans jamais avoir à dire POURQUOI. Construire le
// trait, c'est décider — pour chaque bout — s'il s'arrête ou s'il continue.
// C'est exactement la question que pose la notation, et il n'y a plus de
// hasard : quinze possibilités, une bonne.
//
// LE MODÈLE. Deux points, A à gauche et B à droite, découpent la droite en
// TROIS MORCEAUX :
//
//        ←———— avant ————[A]———— entre ————[B]———— après ————→
//
// Chacun est là ou pas, et cela suffit à décrire les quatre objets du
// chapitre :
//
//   avant + entre + après   la droite (AB)      — elle ne s'arrête jamais
//   entre                   le segment [AB]     — il s'arrête aux deux points
//   entre + après           la demi-droite [AB) — origine A, elle file vers B
//   avant + entre           la demi-droite [BA) — origine B, elle file vers A
//
// Les quatre autres combinaisons ne sont pas des objets de géométrie, et
// c'est instructif : un trait en deux morceaux séparés n'a pas de nom, un
// morceau qui ne touche aucun des deux points non plus. On le dit plutôt que
// de l'interdire — l'élève doit pouvoir se tromper pour comprendre.
//
// Ce module ne connaît ni le DOM ni le SVG.

/** Les trois morceaux, de gauche à droite. */
export const MORCEAUX = ['avant', 'entre', 'apres'];

/** Rien de tracé : l'état de départ. */
export function traceVide() {
    return { avant: false, entre: false, apres: false };
}

/**
 * Le tracé d'un objet nommé. `a` et `b` sont les lettres DANS L'ORDRE DE
 * L'ÉCRITURE ; `gauche` est celle qui est dessinée à gauche.
 */
export function traceDe(type, a, b, gauche) {
    const aEstAGauche = a === gauche;
    if (type === 'droite') return { avant: true, entre: true, apres: true };
    if (type === 'segment') return { avant: false, entre: true, apres: false };
    // Demi-droite [ab) : elle part de `a` et continue au-delà de `b`. Le
    // morceau qui s'ajoute est celui qui se trouve DERRIÈRE b.
    return aEstAGauche
        ? { avant: false, entre: true, apres: true }
        : { avant: true, entre: true, apres: false };
}

/**
 * Ce que le tracé représente : son écriture, ou `null` s'il ne désigne aucun
 * objet du chapitre. `gauche` et `droite` sont les lettres dessinées.
 */
export function ecritureDe(trace, gauche, droite) {
    const { avant, entre, apres } = trace;
    if (!entre) return null;                       // un objet qui ne relie pas A à B
    if (avant && apres) return `(${gauche}${droite})`;
    if (!avant && !apres) return `[${gauche}${droite}]`;
    // Une seule extrémité file : l'ORIGINE est le point de l'autre côté.
    return apres ? `[${gauche}${droite})` : `[${droite}${gauche})`;
}

/**
 * DEUX ÉCRITURES DÉSIGNENT-ELLES LE MÊME OBJET ?
 *
 * (AB) et (BA) sont la même droite, [AB] et [BA] le même segment : l'ordre des
 * lettres n'y décrit rien. Sur une demi-droite au contraire il porte tout —
 * [AB) part de A, [BA) part de B. Une comparaison de chaînes refuserait donc
 * une droite juste tracée « à l'envers », ce qui n'a aucun sens à corriger.
 */
export function memeObjet(e1, e2) {
    if (!e1 || !e2) return false;
    const clef = (e) => {
        const [a, b] = e.replace(/[^A-Z]/g, '');
        // Une demi-droite garde son ordre ; les deux autres l'oublient.
        const ordonne = e.startsWith('[') && e.endsWith(')');
        return e[0] + e[e.length - 1] + (ordonne ? a + b : [a, b].sort().join(''));
    };
    return clef(e1) === clef(e2);
}

/**
 * Le tracé est-il celui qu'on demandait ? Et sinon, qu'a-t-on dessiné ?
 *
 * Le message ne dit jamais « faux » tout court : il NOMME ce que l'élève a
 * tracé. « Tu as dessiné le segment [AB] » apprend quelque chose ; « ce n'est
 * pas ça » n'apprend rien.
 */
export function verifierTrace(trace, attendu, gauche, droite) {
    const brut = ecritureDe(trace, gauche, droite);
    // Quand c'est le même objet, on le RÉÉCRIT comme l'énoncé le nommait :
    // renvoyer « (BA) » là où l'on demandait « (AB) » ferait douter d'une
    // réponse pourtant juste.
    const obtenu = memeObjet(brut, attendu) ? attendu : brut;
    if (obtenu === attendu) return { juste: true, obtenu, message: `C'est bien ${attendu}.` };
    if (obtenu === null) {
        const { avant, entre, apres } = trace;
        if (!avant && !entre && !apres) {
            return { juste: false, obtenu: null, message: 'Il n\'y a rien de tracé : clique les morceaux du trait.' };
        }
        return {
            juste: false, obtenu: null,
            message: `Le morceau entre ${gauche} et ${droite} manque : sans lui, le trait ne relie plus `
                + 'les deux points, et ce n\'est plus un objet qui porte un nom.'
        };
    }
    return { juste: false, obtenu, message: `Tu as tracé ${obtenu}, pas ${attendu}.` };
}

/** Ce que change un morceau, dit en une phrase — pour l'aide. */
export function roleDuMorceau(nom, gauche, droite) {
    if (nom === 'entre') return `le trait qui va de ${gauche} à ${droite}`;
    if (nom === 'avant') return `le prolongement au-delà de ${gauche}`;
    return `le prolongement au-delà de ${droite}`;
}
