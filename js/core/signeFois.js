// LE SIGNE DE MULTIPLICATION, DIT À UN SEUL ENDROIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans les paramètres d'affichage, propose aussi le x (le signe fois
// français) ou l'astérisque […] il y a 3 notations, je pense le point du milieu
// pour la notation américaine, l'astérisque ou le fois à la française […] et
// évidemment ce rendu est valable dans les écritures et input ».
//
// ── POURQUOI CE MODULE PLUTÔT QUE MILLE RETOUCHES ───────────────────────────
//
// COMPTÉ AVANT DE COMMENCER : 1 001 chaînes contiennent un « × », dans 166
// fichiers — des générateurs, des jeux, et beaucoup d'ÉNONCÉS écrits à la main
// dans `js/data/`. Remplacer chaque `'×'` par un appel de fonction, c'est mille
// occasions de se tromper aujourd'hui, et la certitude qu'un exercice écrit
// l'an prochain oubliera de le faire — un réglage qui ne tient que par la
// discipline ne tient pas.
//
// ON SUBSTITUE DONC AU MOMENT DE L'AFFICHAGE. Le code continue d'écrire « × »,
// qui reste la notation canonique du dépôt ; `avecSigne` le remplace juste
// avant que le texte n'atteigne l'écran. Un exercice neuf n'a rien à savoir de
// ce réglage pour le respecter.
//
// ET LE DÉFAUT NE COÛTE RIEN. Quand le signe choisi est « × » — c'est le cas de
// tout le monde tant que personne ne change rien —, `avecSigne` rend la chaîne
// qu'on lui a donnée, sans la lire. Pas une comparaison de caractère, pas une
// expression régulière : le même objet. Un professeur qui n'y touche pas ne
// paie rien, et le risque de ce chantier est porté par celui qui l'a demandé.
//
// ── CE QU'ON NE TOUCHE PAS ──────────────────────────────────────────────────
//
// LES VALEURS, JAMAIS. Ce module ne connaît que de l'affichage. Une réponse
// d'élève, une empreinte de question, une clef de journal gardent leur « × » :
// changer la notation d'un professeur ne doit pas rendre illisible le travail
// déjà enregistré par ses élèves, ni faire diverger deux appareils qui n'ont
// pas le même réglage.
//
// ET LA SAISIE ACCEPTE LES TROIS, TOUJOURS. C'était déjà le cas avant ce
// module — `js/core/maths/formule.js` lit `*` comme `×`, et `priorites.js`
// normalise `[*·]` — et cela n'a rien à voir avec le réglage : un élève qui
// tape une étoile sur un clavier d'ordinateur doit être compris, quelle que
// soit la notation affichée. Le réglage décide de ce qu'on ÉCRIT, pas de ce
// qu'on comprend.

/**
 * LES TROIS NOTATIONS, avec les mots de Rémy.
 *
 * L'ordre est celui de l'écran : le défaut d'abord, puis les deux autres.
 */
export const SIGNES_FOIS = [
    {
        id: 'fois', glyphe: '×', label: 'À la française',
        aide: 'La notation du collège et des manuels français.'
    },
    {
        id: 'point', glyphe: '·', label: 'Point médian',
        aide: 'Plus léger, et il ne se confond jamais avec la lettre x — '
            + 'ce qui compte dès qu\'il y a des lettres.'
    },
    {
        id: 'etoile', glyphe: '*', label: 'Astérisque',
        aide: 'Celle des machines : le tableur, le Chat Géomètre. Sur une '
            + 'copie, elle serait comptée fausse.'
    }
];

/** Le défaut, et il ne bouge pas : c'est ce qu'écrivent les manuels. */
export const SIGNE_PAR_DEFAUT = 'fois';

const GLYPHE = Object.fromEntries(SIGNES_FOIS.map(s => [s.id, s.glyphe]));

/**
 * LE CHOIX EST GARDÉ EN MÉMOIRE, PAS RELU À CHAQUE MOT.
 *
 * `avecSigne` est appelée sur chaque énoncé, chaque ligne de cascade, chaque
 * touche de pavé — plusieurs centaines de fois par exercice. Aller chercher le
 * réglage dans le stockage à chaque appel serait payer une lecture pour un
 * caractère.
 */
let choisi = SIGNE_PAR_DEFAUT;

/** L'identifiant de la notation choisie. */
export const signeChoisi = () => choisi;

/** Le caractère à écrire. */
export const glypheFois = () => GLYPHE[choisi] || '×';

/**
 * POSER LA NOTATION. Rend l'identifiant retenu — jamais autre chose que les
 * trois connus, parce que cette valeur vient d'un stockage qu'un navigateur
 * peut rendre dans n'importe quel état.
 */
export function poserSigneFois(id) {
    choisi = GLYPHE[id] ? id : SIGNE_PAR_DEFAUT;
    // LA PAGE LE SAIT AUSSI, pour ce que la feuille de style voudra en faire —
    // et surtout pour qu'une sonde puisse le lire sans fouiller le stockage.
    if (typeof document !== 'undefined') {
        document.documentElement.dataset.signeFois = choisi;
    }
    return choisi;
}

/**
 * LE TEXTE, AVEC LA NOTATION DU MOMENT.
 *
 * LE CHEMIN RAPIDE EST LA MOITIÉ DU MODULE : au défaut, on rend l'argument tel
 * quel. C'est ce qui permet d'appeler cette fonction partout sans se demander
 * si l'on peut se le permettre.
 *
 * `null` ET `undefined` PASSENT SANS BRUIT. Beaucoup d'énoncés sont
 * facultatifs, et une fonction d'affichage qui lève sur une valeur absente
 * ferait tomber l'exercice au lieu d'écrire une ligne de moins.
 */
export function avecSigne(texte) {
    if (choisi === SIGNE_PAR_DEFAUT || texte == null) return texte;
    return String(texte).split('×').join(GLYPHE[choisi]);
}

/**
 * ET L'INVERSE, POUR TOUT CE QUI SE COMPARE.
 *
 * Une réponse tapée, une expression relue, une empreinte : on ramène les trois
 * notations à celle du dépôt avant de juger. Sans elle, un élève dont le
 * professeur a choisi l'astérisque écrirait « 3*4 » et se verrait refuser par
 * un contrôle qui attend « 3×4 ».
 */
export function sansSigne(texte) {
    if (texte == null) return texte;
    return String(texte).replace(/[*·]/g, '×');
}
