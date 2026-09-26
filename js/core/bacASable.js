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

import { uniteDe } from './registry.js';

/**
 * CE QU'IL Y A DANS LE BAC, ET POURQUOI CEUX-LÀ.
 *
 * Choisis un par un, et chacun coche les quatre critères ci-dessus : c'est des
 * mathématiques, cela se comprend sans explication, une partie dure quelques
 * minutes, et l'on peut lâcher en plein milieu sans rien perdre.
 *
 * LE PROFESSEUR N'A RIEN À RÉGLER, et c'est le but. Ce qu'il peut faire, c'est
 * FERMER le bac pour une heure, classe par classe — il n'y a pas d'autre
 * réglage aujourd'hui, et ce commentaire prétendait le contraire : il annonçait
 * une liste à composer dans La séance. Le paramètre `liste` existe bien
 * ci-dessous, mais rien ne lui passe jamais rien — une porte posée sans
 * serrure. Il faudrait une colonne de plus côté serveur, et cela se décide,
 * cela ne s'oublie pas dans un commentaire.
 *
 * CE QUI ADAPTE LE BAC, EN REVANCHE, C'EST LA SÉANCE ELLE-MÊME : voir
 * `jeuxDeLaSeance` plus bas. Le niveau et le domaine de ce que l'élève vient de
 * faire élargissent la liste, sans que personne ait à cocher quoi que ce soit.
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

    // SON PROPRE TEMPS DE JEU, ÉPUISÉ. Rémy : « un temps, réglé par vous ». Ce
    // n'est pas le compte à rebours de la classe, c'est le quart d'heure de
    // CET élève, parti quand il a ouvert le bac — voir `resteDuBac`.
    const b = contexte.budget;
    if (b && b.reste <= 0) {
        return { ouvert: false, pourquoi: 'bac-epuise',
            dire: `Tes ${b.minutes} minutes de bac à sable sont passées.` };
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

/** Combien de jeux de la séance on ajoute, au maximum. Voir ÉLARGIR ci-dessous. */
export const ELARGISSEMENT_MAX = 6;

/**
 * L'UNITÉ QUI TRAHIT UNE PARTIE QU'ON NE PEUT PAS LÂCHER.
 *
 * Le quatrième critère du bac — « on doit pouvoir s'arrêter en plein milieu
 * sans rien perdre » — ne se déduisait d'aucun champ, et c'est ce qui m'a
 * d'abord fait chercher un substitut : j'ai essayé le nombre d'unités d'une
 * séance, et MESURÉ qu'il ne marchait pas, puisqu'il aurait retiré le
 * Puissance 4 et la pipopipette, dont une partie dure trois minutes.
 *
 * Il se lisait en fait dans l'UNITÉ que chaque activité déclare. Une GRILLE à
 * moitié faite qu'on abandonne est exactement la déception décrite ; une
 * question, une paire, une brique, une partie, non. MESURÉ
 * (`tools/tmp/bacUnites.mjs`) : le catalogue a 13 jeux qui se comptent en
 * grilles — sudoku, hashi, slitherlink, futoshiki, démineur, logigramme… — et
 * AUCUN des dix-sept choisis à la main n'en fait partie. La règle était donc
 * déjà appliquée, elle n'était simplement pas écrite.
 *
 * Ces jeux restent au catalogue, où on les choisit exprès, avec le temps
 * devant soi.
 */
const UNITES_TROP_LONGUES = ['grille'];

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
 * ÉLARGIR LE BAC À CE QU'ON VIENT DE TRAVAILLER.
 *
 * RÉMY : « prévoit-on des jeux bac à sable par parcours ou différents bacs à
 * sable ? »
 *
 * MESURÉ sur la liste écrite à la main (`tools/tmp/bacMesure.mjs`) : 16 de ses
 * 17 jeux sont du domaine « Nombres et calculs », et par niveau elle donne
 * 10 jeux à un CM2, 16 à un 6ème, 8 à un 5ème, 4 à un 4ème — et UN SEUL à un
 * 3ème. Un élève qui finit une séance de géométrie en avance trouvait donc un
 * bac entièrement fait de calcul ; un 3ème, presque rien de son niveau. Ce
 * n'était pas un choix, c'était le résultat non regardé d'une liste écrite
 * exercice par exercice.
 *
 * LE BAC SUIT DONC LA SÉANCE, et c'est le critère que Rémy avait posé
 * lui-même : « ce qu'il contient est des mathématiques — ce sont les mêmes
 * notions, jouées ». On prend le NIVEAU et le DOMAINE de ce que l'élève vient
 * de faire, et l'on ajoute les jeux du catalogue qui y correspondent. Rien à
 * régler pour le professeur : la séance dit déjà tout.
 *
 * ON N'OUVRE PAS LE CATALOGUE ENTIER POUR AUTANT. Le module le dit depuis le
 * début : « un élève à qui il reste sept minutes et qui doit CHOISIR parmi
 * deux cents passe ses sept minutes à choisir. » Mesuré, l'élargissement sans
 * borne donnerait 43 tuiles à un 6ème. On en ajoute six au plus.
 *
 * ET LES VALEURS SÛRES RESTENT EN TÊTE : ce sont elles qui portent le critère
 * qu'aucune mesure ne remplace — on peut les lâcher en plein milieu sans rien
 * perdre, parce que la sonnerie ne prévient pas.
 *
 * @param {Array} jeux       les jeux jouables SEUL du catalogue (le filtre est
 *                           à l'appelant : le noyau ne connaît pas le catalogue)
 * @param {object} seance    { niveaux: string[], domaines: string[] }
 * @param {Array} deja       ce que le bac propose déjà, pour ne pas doubler
 * @param {number} [max]
 */
export function jeuxDeLaSeance(jeux, seance, deja = [], max = ELARGISSEMENT_MAX) {
    const niveaux = (seance && seance.niveaux) || [];
    const domaines = (seance && seance.domaines) || [];
    // PAS DE SÉANCE, PAS D'ÉLARGISSEMENT. Un élève qui ouvre le bac sans avoir
    // rien fait — cela n'arrive pas, la porte est fermée — ou dont on ne sait
    // rien reçoit la liste tenue à la main, comme avant.
    if (!niveaux.length || !domaines.length) return [];
    const vus = new Set((deja || []).map(e => e && e.id));
    return (jeux || [])
        .filter(e => e && !vus.has(e.id))
        .filter(e => (e.tags && e.tags.niveaux || []).some(n => niveaux.includes(n)))
        .filter(e => domaines.includes(e.tags && e.tags.chemin && e.tags.chemin[0]))
        .filter(e => !UNITES_TROP_LONGUES.includes(uniteDe(e.activityId, 1)))
        .slice(0, max);
}

/**
 * CE QUE LA SÉANCE DIT D'ELLE-MÊME : ses niveaux et ses domaines.
 *
 * On les lit sur les EXERCICES traversés, et non sur un réglage du professeur :
 * c'est la seule source qui existe toujours, et elle ne peut pas se désaccorder
 * de ce que l'élève vient réellement de faire.
 *
 * @param {Array} exercices  les exercices des étapes de la séance finie
 */
export function ceQueDisaitLaSeance(exercices) {
    const niveaux = new Set();
    const domaines = new Set();
    for (const e of exercices || []) {
        if (!e || !e.tags) continue;
        (e.tags.niveaux || []).forEach(n => niveaux.add(n));
        if (e.tags.chemin && e.tags.chemin[0]) domaines.add(e.tags.chemin[0]);
    }
    return { niveaux: [...niveaux], domaines: [...domaines] };
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
export function parcoursDuBac(faireEtape, faireParcours, jeuId, politique, reste = 0) {
    // `sansFin` EST CE QUI FAIT DU BAC UN BAC. Sans lui, `nbItems: 1` disait au
    // meneur de fermer l'étape à la première réussite — mesuré sur Nova, le
    // Peintre et Tetris : les trois s'arrêtaient au premier point. Rémy : « ça
    // s'arrête trop vite ». Et `sansTotal`, pour que l'en-tête compte ce qui est
    // fait au lieu d'annoncer un but : dans un bac à sable, « 7 » est un score,
    // « 7 / 1 » n'est rien.
    // ET C'EST LE TEMPS QUI ARRÊTE, quand le professeur en a posé un. `sansFin`
    // a retiré la fin par le COMPTE ; le chronomètre reste, et c'est
    // exactement ce qu'on veut ici : « un temps, réglé par vous » (Rémy). On
    // lui donne ce qui RESTE du quart d'heure de l'élève, pas la durée pleine :
    // sinon chaque jeu ouvert relancerait le compte à zéro.
    const etape = faireEtape(jeuId, {}, {
        stepId: 'bac', nbItems: 1, threshold: 0, bonus: true,
        sansFin: true, sansTotal: true,
        timeLimit: reste > 0 ? reste : null
    });
    const parcours = faireParcours('Le bac à sable', [etape], politique);
    parcours.personnel = true;
    parcours.bac = true;
    return parcours;
}
