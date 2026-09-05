// LA RÉPARTITION D'UNE PROGRESSION — combien de questions sur chaque marche.
//
// Rémy : « quand on a une progression, il faudrait pouvoir choisir aussi la
// répartition non ? »
//
// Oui, et c'était le seul chiffre de tout l'escalier qui n'appartenait à
// personne. Une douzaine de générateurs annonçaient « les 12 marches à la
// suite » et posaient, en dur dans leur code, DEUX questions par marche — ou
// trois, selon celui qui l'avait écrit. Ce nombre décide pourtant de tout ce
// qu'on peut faire de l'exercice :
//
//   · à 1 par marche, la progression devient une VISITE : on montre les douze
//     cas en douze questions, c'est la découverte d'un chapitre en dix minutes ;
//   · à 2, c'est le réglage qu'on avait — le temps de comprendre puis de
//     confirmer, sans s'installer ;
//   · à 4 ou 5, chaque marche devient un ENTRAÎNEMENT : on ne monte qu'une fois
//     le geste installé, et vingt questions ne couvrent plus que cinq marches.
//
// Ce sont trois exercices différents, et le professeur n'avait la main sur
// aucun des trois.
//
// LE RÉGLAGE TIRE LE NOMBRE DE QUESTIONS AVEC LUI. Changer la répartition sans
// changer la longueur ne ferait que TRONQUER la progression plus tôt : passer
// à 4 par marche sur douze marches et rester à dix questions, c'est ne plus
// voir que trois marches sur douze. Les générateurs qui déclarent un `conseil`
// le calculent donc à partir de la valeur choisie (`conseilProgression`), et
// le panneau de réglages suit ce conseil tant que le professeur n'a pas fixé
// lui-même le nombre de questions.
//
// UNE SEULE VALEUR, PARTOUT LE MÊME NOM. `parMarche` s'écrit pareil dans les
// treize générateurs : un parcours enregistré avec « 3 par marche » sur les
// relatifs garde le même sens sur les puissances, et l'aide n'a été rédigée
// qu'une fois.

/** Ce qu'on faisait en dur presque partout : deux questions, puis on monte. */
export const PAR_MARCHE_DEFAUT = 2;

/**
 * Les bornes du réglage.
 *
 * UN, PARCE QUE LA VISITE EST UN USAGE RÉEL — c'est même le plus fréquent en
 * début de chapitre : montrer tous les cas, sans en travailler aucun.
 *
 * SIX, PARCE QU'AU-DELÀ CE N'EST PLUS UNE PROGRESSION. À sept par marche sur
 * douze marches il faudrait quatre-vingt-quatre questions, soit près du double
 * du maximum de l'application (`MAX_QUESTIONS` vaut 50) : le réglage
 * promettrait un escalier que l'exercice ne peut plus monter. Qui veut
 * s'installer sur une marche la choisit dans le menu du dessus et n'en fait
 * qu'elle — c'est à cela que sert la liste des marches.
 */
export const PAR_MARCHE_MIN = 1;
export const PAR_MARCHE_MAX = 6;

/** Une valeur de réglage ramenée à un entier valide. */
export function parMarcheDe(params, defaut = PAR_MARCHE_DEFAUT) {
    const brut = Math.round(Number((params || {}).parMarche));
    const n = Number.isFinite(brut) && brut > 0 ? brut : (Number(defaut) || PAR_MARCHE_DEFAUT);
    return Math.max(PAR_MARCHE_MIN, Math.min(PAR_MARCHE_MAX, n));
}

/**
 * LE RÉGLAGE, tel qu'il apparaît dans le panneau.
 *
 * `type: 'number'` avec des bornes rapprochées : `core/echelle.js` en fait
 * automatiquement une glissière à six crans, ce qui est exactement la bonne
 * forme — entre 1 et 6, il n'y a rien d'autre à comprendre que « plus » et
 * « moins », et le geste au doigt vaut mieux qu'un champ à taper.
 *
 * IL EST PLACÉ JUSTE APRÈS LE CHOIX DE LA PROGRESSION, et il le dit : le
 * panneau ne sait pas masquer un réglage selon la valeur d'un autre, et une
 * ligne « Questions par marche » qui resterait active alors qu'on a choisi UNE
 * marche précise serait un bouton sans effet — la pire espèce de réglage. On
 * ne peut pas la cacher ; on l'écrit dans l'aide, à l'endroit où on la lit.
 *
 * @param {Object} [opts]
 * @param {number} [opts.defaut]   la valeur d'origine du générateur
 * @param {number} [opts.marches]  le nombre de marches, pour chiffrer l'aide
 * @param {string} [opts.mot]      « marche », « étape », « niveau »…
 */
export function paramParMarche({ defaut = PAR_MARCHE_DEFAUT, marches = 0, mot = 'marche' } = {}) {
    const n = Math.max(PAR_MARCHE_MIN, Math.min(PAR_MARCHE_MAX, Math.round(Number(defaut)) || PAR_MARCHE_DEFAUT));
    const m = Math.round(Number(marches)) || 0;
    // Le compte exact quand on le connaît : « il faudra 24 questions » est une
    // information, « il en faudra plus » n'en est pas une.
    const combien = m
        ? ` À ${n} par ${mot}, les ${m} ${mot}s demandent ${m * n} questions ; `
            + `le nombre de questions suit ce compte tant qu'on ne l'a pas fixé soi-même.`
        : '';
    return {
        id: 'parMarche', type: 'number', label: `Questions par ${mot}`,
        default: n, min: PAR_MARCHE_MIN, max: PAR_MARCHE_MAX,
        aide: `Sur « progressif », c’est le nombre de questions passées sur chaque `
            + `${mot} avant de monter. À 1 on VISITE la progression — tous les cas, aucun `
            + `travaillé ; à 2 on a le temps de comprendre puis de confirmer ; à 4 ou 5 `
            + `chaque ${mot} devient un entraînement, et l’exercice n’en parcourt `
            + `plus que quelques-unes.${combien} Sans effet si l’on a choisi une `
            + `${mot} précise au-dessus : il n’y en a plus qu’une.`
    };
}

/**
 * LA MARCHE OÙ EN EST LA SÉRIE, et l'on ne redescend jamais.
 *
 * Une fois la dernière marche atteinte, on y reste : c'est le comportement
 * qu'avaient déjà les générateurs, et il est juste — la dernière marche est le
 * sujet du chapitre, les précédentes le préparaient. Un exercice de trente
 * questions sur six marches passe donc ses vingt dernières questions sur la
 * plus haute, ce qui est exactement ce qu'on veut d'une fin de séance.
 *
 * @param {number} index      le rang de la question, 0 pour la première
 * @param {number} nbMarches  combien il y en a
 */
export function rangMarche(index, nbMarches, params, defaut = PAR_MARCHE_DEFAUT) {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    const p = parMarcheDe(params, defaut);
    const i = Math.max(0, Math.round(Number(index)) || 0);
    return Math.min(m - 1, Math.floor(i / p));
}

/**
 * Combien de questions il faut pour parcourir toute la progression.
 *
 * C'est ce que `duree.js` appelle le `conseil` du générateur, et c'est lui qui
 * empêche le défaut de dix de tronquer l'escalier en silence.
 */
export function conseilProgression(nbMarches, params, defaut = PAR_MARCHE_DEFAUT) {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    return m * parMarcheDe(params, defaut);
}
