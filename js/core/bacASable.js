// LE BAC À SABLE — ce qu'on fait quand on a fini avant les autres.
//
// Rémy : « un élève qui a fini peut avoir une zone bac à sable avec des jeux ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE PIÈGE EST ÉVIDENT, ET IL FAUT LE NOMMER : UN BAC À SABLE TROP BEAU FAIT
// BÂCLER LE TRAVAIL.
//
// Si la récompense de finir est plus attrayante que le travail, l'élève
// optimise pour finir — il clique au hasard jusqu'à ce que l'étape passe. On
// aurait alors construit une machine à expédier les exercices. Trois décisions
// tiennent cela :
//
//   · IL NE S'OUVRE QU'UNE FOIS LA SÉANCE FINIE. Pas « bien avancée » : finie.
//     C'est la seule règle qui ne se négocie pas, et c'est celle qui empêche le
//     bac à sable d'être une porte de sortie.
//   · CE QU'IL CONTIENT EST DES MATHÉMATIQUES. Ce ne sont pas des récréations
//     collées à côté du travail : ce sont les mêmes notions, jouées. L'élève
//     qui passe huit minutes sur Tetris des fractions travaille encore, et
//     c'est ce qui rend la récompense honnête.
//   · LE PROFESSEUR PEUT LE FERMER. Il y a des heures où l'on veut que celui
//     qui a fini relise, ou aide son voisin, ou ne fasse rien. Fermer le bac ne
//     demande pas d'explication.
//
// ET UN QUATRIÈME CRITÈRE, MOINS VISIBLE, POUR CHOISIR LES JEUX : ON DOIT
// POUVOIR S'ARRÊTER EN PLEIN MILIEU SANS RIEN PERDRE. Il reste six minutes
// avant la sonnerie. Une grille de sudoku à moitié faite qu'on abandonne est
// une petite déception à chaque fin d'heure ; une partie d'arcade qu'on quitte
// n'est rien du tout. Les jeux longs restent au catalogue, où on les choisit
// exprès.

/**
 * CE QU'IL Y A DANS LE BAC, ET POURQUOI CEUX-LÀ.
 *
 * Choisis un par un, et chacun coche les quatre critères ci-dessus : c'est des
 * mathématiques, cela se comprend sans explication, une partie dure quelques
 * minutes, et l'on peut lâcher en plein milieu sans rien perdre.
 *
 * Le professeur n'a rien à configurer pour que cela marche — c'est le but d'une
 * liste par défaut. S'il veut la sienne, elle est dans La séance.
 */
export const PAR_DEFAUT = [
    // Arcade : on s'arrête n'importe quand, on n'a rien perdu.
    'calc-tetris',
    'calc-arcade-shooter',
    'calc-arcade-moles',
    'calc-nova',
    'calc-escadrille',
    'calc-course',
    'calc-labyrinthe',
    'calc-skweek',
    // Manches courtes : une partie tient dans le temps qui reste.
    'calc-math-memory',
    'calc-compte-est-bon',
    'calc-pyramide-nombres',
    'dec-chute',
    'num-amis-de-dix',
    // Réflexion rapide, contre la machine.
    'logi-puissance4',
    'logi-sim',
    'logi-pipopipette',
    'log-mastermind'
];

/**
 * LE BAC EST-IL OUVERT POUR CET ÉLÈVE, ET SINON POURQUOI.
 *
 * On rend TOUJOURS une raison, même quand c'est non. Un bouton qui n'apparaît
 * pas laisse l'élève croire qu'il n'y a rien ; une phrase — « il te reste deux
 * étapes » — lui dit quoi faire pour l'ouvrir, ce qui est exactement l'effet
 * qu'on veut.
 *
 * @param {object|null} avancement  ce que rend js/core/avancement.js
 * @param {object} [contexte] { ferme:boolean, chrono:{reste,aZero}|null }
 * @returns {{ouvert:boolean, pourquoi:string, dire:string}}
 */
export function bacOuvert(avancement, contexte = {}) {
    if (contexte.ferme) {
        return { ouvert: false, pourquoi: 'ferme-par-le-prof',
            dire: 'Le bac à sable est fermé pour cette heure.' };
    }

    // LE TEMPS ÉCOULÉ FERME TOUT. Quand le compte à rebours du professeur est à
    // zéro sur « terminer », l'heure de travail est close : ouvrir des jeux à
    // ce moment-là ferait jouer la classe pendant qu'il ramasse les copies.
    const ch = contexte.chrono;
    if (ch && ch.reste <= 0 && ch.aZero === 'terminer') {
        return { ouvert: false, pourquoi: 'temps-ecoule',
            dire: 'Le temps est écoulé — on s\'arrête là.' };
    }
    if (ch && ch.reste <= 0 && ch.aZero === 'pause') {
        return { ouvert: false, pourquoi: 'en-pause',
            dire: 'On écoute le professeur.' };
    }

    if (!avancement) {
        return { ouvert: false, pourquoi: 'rien-commence',
            dire: 'Le bac à sable s\'ouvre quand ta séance est finie.' };
    }
    if (avancement.etat !== 'fini') {
        const reste = Math.max(0, (avancement.etapes || 0) - (avancement.faites || 0));
        return { ouvert: false, pourquoi: 'pas-fini',
            dire: reste === 1 ? 'Encore une étape, et le bac à sable s\'ouvre.'
                : `Encore ${reste} étapes, et le bac à sable s'ouvre.` };
    }
    return { ouvert: true, pourquoi: 'fini', dire: 'Tu as fini : à toi de choisir.' };
}

/**
 * LES JEUX DU BAC, RÉSOLUS SUR LE CATALOGUE.
 *
 * On filtre sur ce qui existe VRAIMENT. Un identifiant qui a changé de nom —
 * cela arrive, le catalogue bouge — produirait une tuile qui ne s'ouvre pas,
 * et un élève qui clique trois fois dessus avant d'appeler le professeur.
 *
 * @param {function} trouver  getExerciseById
 * @param {string[]} [liste]  la liste du professeur, sinon celle par défaut
 */
export function jeuxDuBac(trouver, liste = null) {
    const ids = Array.isArray(liste) && liste.length ? liste : PAR_DEFAUT;
    const vus = new Set();
    const out = [];
    for (const id of ids) {
        if (vus.has(id)) continue;
        vus.add(id);
        const exo = typeof trouver === 'function' ? trouver(id) : null;
        if (exo) out.push(exo);
    }
    return out;
}

/**
 * LE PARCOURS D'UNE PARTIE DU BAC.
 *
 * Une étape, un jeu, aucune limite de temps : c'est la sonnerie qui arrête, ou
 * l'élève. Un minuteur ajouterait une contrainte là où l'on vient justement de
 * lever la contrainte.
 *
 * `bac: true` EST LA PARTIE IMPORTANTE, et elle ne se voit pas à l'écran.
 * Sans elle, le professeur qui regarde Le direct verrait « Étape 1 sur 1 » à la
 * place de « Terminé — 18 / 24 justes » dès que l'élève ouvre un jeu : le
 * serveur montre le run le plus récent, et une partie de Tetris est plus
 * récente qu'un devoir rendu. Il croirait l'élève reparti au travail, et
 * l'avancement de sa classe changerait sous ses yeux sans raison.
 *
 * @param {function} faireEtape  makeStep
 * @param {function} faireParcours  makePath
 * @param {object} politique
 */
export function parcoursDuBac(faireEtape, faireParcours, jeuId, politique) {
    const etape = faireEtape(jeuId, {}, {
        stepId: 'bac', nbItems: 1, threshold: 0, bonus: true
    });
    const parcours = faireParcours('Le bac à sable', [etape], politique);
    parcours.personnel = true;
    parcours.bac = true;
    return parcours;
}
