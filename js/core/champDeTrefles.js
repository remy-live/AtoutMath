// LE CHAMP DE TRÈFLES — où se cachent ceux à quatre feuilles.
//
// RÉMY : « J'ai pensé à des mini jeux pour une pause comme la grenouille ou le
// parking, je pensais aussi à des choses sympas comme cela », avec l'image
// d'une page de revue : deux cents trèfles à trois feuilles, et la consigne
// « Encoure les trèfles à 4 feuilles ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE N'EST PAS UN EXERCICE DE MATHÉMATIQUES, ET C'EST ASSUMÉ. C'est une pause.
// Mais il s'y joue tout de même quelque chose qu'on travaille en sixième et
// qu'aucun exercice ne nomme : LE BALAYAGE ORGANISÉ. Chercher trois trèfles
// dans deux cents au hasard prend une éternité et l'on repasse vingt fois au
// même endroit ; les chercher ligne par ligne prend trente secondes. C'est
// exactement le geste qui manque à l'élève qui compte une collection en
// désordre et qui en oublie, ou en compte deux fois.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE DANGER DE CE JEU, ET LA RAISON D'ÊTRE DE CE MODULE.
//
// Des trèfles qui se chevauchent, c'est ce qui rend l'image jolie et la
// recherche difficile. Mais un trèfle à quatre feuilles ENTIÈREMENT RECOUVERT
// par ceux qu'on dessine après lui est introuvable — et pire, incliquable. Le
// joueur cherche quelque chose qui n'est pas atteignable, et le jeu ne se
// termine jamais. C'est la même famille de défaut que la virgule qu'on ne
// pouvait pas poser dans le tableau de conversion : un état qui ne se
// distingue pas de « je n'ai pas encore trouvé ».
//
// On sème donc le champ ICI, où ça se mesure sans navigateur, et l'on GARANTIT
// que chaque trèfle à quatre feuilles garde de quoi être cliqué.

import { makeRng } from './ids.js';

/** Le rayon d'un trèfle, en unités du champ. Tout le reste s'y rapporte. */
export const RAYON = 10;

/**
 * LES PALIERS — et ce qui fait vraiment la difficulté.
 *
 * CE N'EST PAS LE NOMBRE DE TRÈFLES, contrairement à ce qu'on croit en
 * regardant l'image. Deux cents trèfles tous dessinés droit se balaient très
 * vite : l'œil repère une silhouette qui n'est pas la bonne. Ce qui coûte,
 * c'est la ROTATION — un trèfle à trois feuilles tourné de 40° ressemble à un
 * trèfle à quatre feuilles tourné de 10°, et il faut alors COMPTER les feuilles
 * au lieu de reconnaître une forme. C'est le levier principal, et c'est aussi
 * celui qui rend le jeu intéressant.
 *
 * Le second levier est le CHEVAUCHEMENT : deux trèfles à trois feuilles qui se
 * recouvrent montrent cinq ou six feuilles, et l'œil doit décider lesquelles
 * vont ensemble.
 *
 * ET LA DENSITÉ EST LE TROISIÈME, celui que j'avais oublié. Le premier champ
 * rendu était joli et deux fois trop aéré : 160 trèfles ne couvraient que 42 %
 * de la page, quand celle de la revue en couvre près de 80. Entre les deux, ce
 * n'est pas le même jeu — dans un champ aéré chaque trèfle se lit seul ; dans
 * un champ dense, les feuilles des voisins s'emmêlent aux siennes, et c'est
 * précisément là que la recherche devient un travail d'œil.
 *
 * `densite` est donc la part de la page couverte par les disques des trèfles,
 * et c'est ELLE qui décide de la taille du champ — pas l'inverse.
 */
export const PALIERS = {
    promenade: {
        label: 'La promenade — 40 trèfles, tous droits, bien espacés',
        combien: 40, aTrouver: 2, rotation: 0, densite: 0.42
    },
    pre: {
        label: 'Le pré — 90 trèfles tournés dans tous les sens',
        combien: 90, aTrouver: 3, rotation: 1, densite: 0.62
    },
    champ: {
        label: 'Le champ — 160 trèfles serrés, qui se chevauchent',
        combien: 160, aTrouver: 3, rotation: 1, densite: 0.76
    },
    foret: {
        label: 'Le grand pré — 240 trèfles, et 5 à trouver',
        combien: 240, aTrouver: 5, rotation: 1, densite: 0.84
    }
};

/**
 * LA TAILLE DU CHAMP SE DÉDUIT DE LA DENSITÉ VOULUE.
 *
 * On veut que les disques des trèfles couvrent `densite` de la page. L'aire
 * d'un trèfle vaut π R², il en faut `combien` : la page fait donc
 * `combien × π R² / densite`, et on lui donne les proportions d'un écran.
 */
export function tailleDuChamp(P, rapport = 4 / 3) {
    const aire = P.combien * Math.PI * RAYON * RAYON / P.densite;
    const largeur = Math.sqrt(aire * rapport);
    return { largeur: Math.round(largeur), hauteur: Math.round(largeur / rapport) };
}

/**
 * LA DISTANCE EN DESSOUS DE LAQUELLE UN TRÈFLE EN CACHE UN AUTRE.
 *
 * Mesuré en rayons. À 0,55 R, le second trèfle couvre le cœur du premier et
 * une bonne part de ses feuilles : ce qui reste ne se reconnaît plus, et ne se
 * clique plus de façon fiable. On interdit donc cette distance-là ENTRE un
 * trèfle à quatre feuilles et tout trèfle dessiné APRÈS lui — pas avant : un
 * trèfle dessiné avant passe dessous, il ne cache rien.
 */
export const TROP_PRES = 0.55;

/**
 * SEMER LE CHAMP.
 *
 * ON SÈME SUR UNE GRILLE JETÉE, PAS AU HASARD PUR. Deux cents positions
 * tirées uniformément laissent de grands trous et des paquets de cinq trèfles
 * superposés — mesuré, et l'image ne ressemble alors plus du tout à celle de
 * la revue, qui est dense et régulière. On part donc d'une grille, et l'on
 * secoue chaque point : la densité reste égale, le résultat ne se lit pas
 * comme une grille.
 *
 * @param {Object} o
 * @param {Object} o.rng        le tirage (reproductible à graine égale)
 * @param {string} o.palier     une clef de PALIERS
 * @param {number} [o.largeur]  la largeur du champ — déduite de la densité si
 *                              on ne la donne pas
 * @param {number} [o.hauteur]  la hauteur du champ
 * @returns {{trefles: Array, largeur: number, hauteur: number, aTrouver: number}}
 *   chaque trèfle : { i, x, y, feuilles, angle, ordre }
 */
export function semerLeChamp({ rng = makeRng(1), palier = 'pre', largeur = null, hauteur = null } = {}) {
    const P = PALIERS[palier] || PALIERS.pre;
    const n = P.combien;
    if (largeur === null || hauteur === null) {
        const t = tailleDuChamp(P);
        largeur = t.largeur; hauteur = t.hauteur;
    }

    // La grille qui tient n points dans ce rectangle, aussi carrée que possible.
    const colonnes = Math.max(1, Math.round(Math.sqrt(n * largeur / hauteur)));
    const lignes = Math.max(1, Math.ceil(n / colonnes));
    const pasX = largeur / colonnes;
    const pasY = hauteur / lignes;
    // LE SECOUEMENT EST CE QUI EMPÊCHE DE LIRE LA GRILLE. Un demi-pas, et les
    // points ne s'alignent plus ni en lignes ni en colonnes ; davantage, et
    // l'on retrouve les paquets et les trous du tirage uniforme.
    const secousse = Math.min(pasX, pasY) * 0.5;

    const trefles = [];
    for (let k = 0; k < n; k++) {
        const c = k % colonnes, l = Math.floor(k / colonnes);
        trefles.push({
            i: k,
            x: pasX * (c + 0.5) + (rng.next() - 0.5) * secousse * 2,
            y: pasY * (l + 0.5) + (rng.next() - 0.5) * secousse * 2,
            feuilles: 3,
            // SANS ROTATION, LE JEU SE BALAIE EN DIX SECONDES : l'œil cherche
            // une silhouette. Avec, il faut compter les feuilles.
            angle: P.rotation ? rng.next() * 360 : 0,
            ordre: k
        });
    }

    // L'ORDRE DE DESSIN EST TIRÉ, ET IL COMPTE : c'est lui qui décide qui
    // recouvre qui. Semés dans l'ordre de la grille, les trèfles se
    // recouvriraient toujours de la même façon — en tuiles, de haut en bas —
    // et l'image aurait un sens de lecture que la page de la revue n'a pas.
    rng.shuffle(trefles.map(t => t.ordre)).forEach((o, k) => { trefles[k].ordre = o; });

    choisirLesQuatreFeuilles(trefles, P.aTrouver, rng);
    return { trefles, largeur, hauteur, aTrouver: P.aTrouver, palier };
}

/**
 * QUELS TRÈFLES AURONT QUATRE FEUILLES.
 *
 * TROIS CONDITIONS, ET CHACUNE A SA RAISON :
 *
 *   · IL DOIT RESTER CLIQUABLE. Un trèfle recouvert par un autre dessiné
 *     après lui est introuvable, et le jeu ne finit jamais. On n'élit donc que
 *     des trèfles dont aucun successeur ne vient trop près (voir `TROP_PRES`).
 *   · ILS NE DOIVENT PAS ÊTRE VOISINS. Deux trèfles à quatre feuilles côte à
 *     côte se trouvent d'un seul regard : on en trouve un, et le second est
 *     dans le même coup d'œil. Le champ perd la moitié de sa durée.
 *   · ILS NE DOIVENT PAS ÊTRE TOUS DANS LE MÊME COIN. Un joueur qui balaie de
 *     gauche à droite trouverait les cinq en trois secondes, puis plus rien.
 */
export function choisirLesQuatreFeuilles(trefles, combien, rng) {
    const parOrdre = [...trefles].sort((a, b) => a.ordre - b.ordre);
    const rang = new Map(parOrdre.map((t, k) => [t.i, k]));
    const seuil = RAYON * TROP_PRES;

    // Ceux que personne ne vient cacher : la liste des candidats.
    const candidats = trefles.filter(t => !trefles.some(autre =>
        autre !== t && autre.ordre > t.ordre && distance(t, autre) < seuil));

    const choisis = [];
    // ÉCART MINIMUM ENTRE DEUX TRÈFLES ÉLUS, en rayons. Trois rayons, c'est à
    // peu près « pas dans le même coup d'œil » sans rendre le placement
    // impossible sur un petit champ.
    const ecart = RAYON * 3;
    const melange = rng.shuffle(candidats);
    for (const t of melange) {
        if (choisis.length >= combien) break;
        if (choisis.some(c => distance(c, t) < ecart)) continue;
        choisis.push(t);
    }
    // LE REPLI : si l'écart ne peut pas être tenu — petit champ, beaucoup à
    // trouver —, on relâche l'écart AVANT de relâcher la visibilité. Un
    // trèfle qu'on ne peut pas cliquer casse le jeu ; deux trèfles voisins ne
    // font que le raccourcir.
    for (const t of melange) {
        if (choisis.length >= combien) break;
        if (!choisis.includes(t)) choisis.push(t);
    }
    choisis.forEach(t => { t.feuilles = 4; });
    return choisis;
}

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * CE QUE LE JOUEUR PEUT ENCORE CLIQUER — la mesure qui garde le jeu jouable.
 *
 * Rend, pour chaque trèfle à quatre feuilles, le nombre de trèfles dessinés
 * APRÈS lui qui viennent à moins de `TROP_PRES`. Zéro partout, et le champ est
 * honnête. C'est cette fonction que l'épreuve interroge.
 */
export function cachesParLaSuite(champ) {
    const seuil = RAYON * TROP_PRES;
    return champ.trefles
        .filter(t => t.feuilles === 4)
        .map(t => ({
            i: t.i,
            caches: champ.trefles.filter(a => a !== t && a.ordre > t.ordre
                && distance(t, a) < seuil).length
        }));
}

/** Les trèfles dans l'ordre où on les dessine : le dernier est au-dessus. */
export const ordreDeDessin = (champ) => [...champ.trefles].sort((a, b) => a.ordre - b.ordre);

/**
 * LE DESSIN D'UN TRÈFLE, en chemins SVG — une feuille par chemin.
 *
 * LA FEUILLE EST UN CŒUR DONT LA POINTE EST AU CENTRE du trèfle, exactement
 * comme sur la page de la revue. On la dessine une fois, tournée vers le haut,
 * et on la fait tourner : trois feuilles à 120°, quatre à 90°.
 *
 * LE PÉDONCULE N'EST PAS UN DÉTAIL. Sans lui, un trèfle à quatre feuilles et
 * un trèfle à trois feuilles tourné se distinguent mal ; avec lui, l'œil a un
 * repère d'orientation, et le comptage devient possible. C'est aussi ce qui
 * fait qu'on reconnaît un trèfle et non une fleur.
 */
export function cheminsDunTrefle(feuilles) {
    const pas = 360 / feuilles;
    // Le cœur : pointe en (0,0), lobes vers le haut. Les nombres viennent du
    // tracé de la revue, mis à l'échelle du rayon.
    const coeur = `M0,0 C${-RAYON * 0.52},${-RAYON * 0.30} ${-RAYON * 0.86},${-RAYON * 0.96} `
        + `0,${-RAYON * 0.82} C${RAYON * 0.86},${-RAYON * 0.96} ${RAYON * 0.52},${-RAYON * 0.30} 0,0 Z`;
    const chemins = [];
    for (let k = 0; k < feuilles; k++) {
        // LES FEUILLES SONT CENTRÉES SUR LE HAUT quand il y en a trois : sans
        // ce décalage, un trèfle à trois feuilles a une feuille pile en bas,
        // là où part le pédoncule, et les deux se confondent.
        chemins.push({ d: coeur, rotation: k * pas + (feuilles === 3 ? 0 : 45) });
    }
    return chemins;
}

/** Le pédoncule : un trait court qui part du centre, vers le bas. */
export const pedonculeDunTrefle = () =>
    `M0,0 Q${RAYON * 0.10},${RAYON * 0.55} ${-RAYON * 0.06},${RAYON * 1.05}`;

/**
 * LE MOT DE FIN — ce qu'on dit quand le champ est vide.
 *
 * ON NE DIT PAS « PARFAIT » À QUELQU'UN QUI A CLIQUÉ TRENTE FOIS À CÔTÉ. Mais
 * c'est une PAUSE : on ne sermonne pas non plus. La phrase nomme le geste qui
 * fait gagner du temps — balayer au lieu de sauter d'un point à l'autre —,
 * parce que c'est la seule chose à apprendre ici et qu'elle sert ailleurs.
 */
export function motDeFin({ secondes, erreurs, aTrouver }) {
    const temps = secondes < 60
        ? `${Math.round(secondes)} s`
        : `${Math.floor(secondes / 60)} min ${String(Math.round(secondes % 60)).padStart(2, '0')}`;
    if (!erreurs) {
        return `${aTrouver} sur ${aTrouver} en ${temps}, sans une seule erreur. L'œil est bon.`;
    }
    if (erreurs <= 2) {
        return `${aTrouver} sur ${aTrouver} en ${temps}, avec ${erreurs} erreur`
            + `${erreurs > 1 ? 's' : ''}. C'est très bien.`;
    }
    return `${aTrouver} sur ${aTrouver} en ${temps}, avec ${erreurs} erreurs. `
        + 'Le truc, la prochaine fois : balaie ligne par ligne au lieu de sauter d\'un '
        + 'trèfle à l\'autre — on va deux fois plus vite et l\'on ne repasse pas au même endroit.';
}
