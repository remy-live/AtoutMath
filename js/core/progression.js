// LA RÉPARTITION D'UNE PROGRESSION — comment les marches se partagent
// l'exercice.
//
// Rémy, deux fois. D'abord : « quand on a une progression, il faudrait pouvoir
// choisir aussi la répartition non ? » Puis, devant le premier essai :
//
//   « pour les étapes on ne comprend pas grand-chose, parce que du coup le
//    nombre de questions dépend des marches, sauf si on prend juste une
//    thématique (ex : même dénominateur). On pourrait faire comme quand on
//    définit pour le QCM à 2, 4 ou libre, avec le même principe. »
//
// LA DÉPENDANCE ALLAIT DANS LE MAUVAIS SENS, ET C'EST TOUT LE SUJET.
//
// Le premier essai offrait « Questions par marche » : un nombre qui, multiplié
// par le nombre de marches, DONNAIT la longueur de l'exercice. Douze marches à
// quatre questions ? Quarante-huit questions, et le rail du nombre de questions
// se déplaçait tout seul pour suivre. C'est-à-dire que pour régler la longueur
// de sa séance — la seule chose qu'un professeur contrôle vraiment, « j'ai dix
// minutes » — il fallait raisonner à l'envers, en divisant.
//
// L'ESCALIER DE L'AIDE, LUI, A LA BONNE FORME depuis longtemps (`core/aide.js`,
// les ZONES) : on fixe le nombre de questions, et l'on dit comment les phases
// se le partagent. Rémy demande le même principe ici, et il a raison — c'est
// exactement le même objet.
//
// D'OÙ « EN PARTAGE », QUI EST DÉSORMAIS LE DÉFAUT. Les marches se divisent
// l'exercice à parts égales, et le reste va aux dernières. Le nombre de
// questions ne dépend plus de rien : dix questions sur six marches donnent
// 1-1-2-2-2-2 ; trente en donnent cinq à chacune. C'est la règle qui vit déjà
// dans `core/pythagore.js` — « les marches se partagent l'exercice à parts
// égales » —, avec un dosage du reste corrigé (voir `decoupeMarches`).
//
// LE COMPTE FIXE RESTE OFFERT, parce qu'il répond à une autre question : « je
// veux trois questions sur chaque marche, quitte à ne pas toutes les voir ».
// C'est un choix légitime, il n'est simplement plus le seul ni le défaut.
//
// UN SEUL NOM, PARTOUT. `repartition` s'écrit pareil dans les treize
// générateurs : un parcours enregistré sur les relatifs garde le même sens sur
// les puissances, et l'aide n'a été rédigée qu'une fois.

/** Les marches se partagent l'exercice — le défaut, et le sens de lecture. */
export const AUTO = 'auto';

/** Ce qu'on faisait en dur presque partout avant qu'il y ait un réglage. */
export const PAR_MARCHE_DEFAUT = 2;

/**
 * Les bornes du compte fixe.
 *
 * UN, PARCE QUE LA VISITE EST UN USAGE RÉEL — c'est même le plus fréquent en
 * début de chapitre : montrer tous les cas, sans en travailler aucun.
 *
 * SIX, PARCE QU'AU-DELÀ CE N'EST PLUS UNE PROGRESSION. À sept par marche sur
 * douze marches il faudrait quatre-vingt-quatre questions, soit près du double
 * du maximum de l'application (`MAX_QUESTIONS` vaut 50). Qui veut s'installer
 * sur une marche la choisit dans le menu du dessus et n'en fait qu'elle.
 */
export const PAR_MARCHE_MIN = 1;
export const PAR_MARCHE_MAX = 6;

/**
 * CE QUE LE PROFESSEUR A CHOISI : `AUTO`, ou un nombre de questions par marche.
 *
 * ELLE NE PREND PAS DE DÉFAUT, et c'est une correction. Le premier jet lui
 * passait le compte historique du générateur — trois pour les puissances, deux
 * pour les relatifs —, si bien qu'un générateur qui n'avait rien réglé se
 * retrouvait en COMPTE FIXE alors que le défaut annoncé est le partage. Le
 * compte historique ne sert qu'à une chose, et ailleurs : savoir quoi faire
 * quand on ignore la longueur de l'exercice (voir `rangMarche`).
 *
 * ON LIT AUSSI L'ANCIEN NOM. Les parcours enregistrés pendant la vie du premier
 * essai portent `parMarche` ; les relire comme « auto » effacerait sans
 * prévenir un réglage que le professeur a posé.
 */
export function repartitionDe(params) {
    const p = params || {};
    const brut = p.repartition !== undefined && p.repartition !== null && p.repartition !== ''
        ? p.repartition
        : p.parMarche;
    if (brut === AUTO || brut === undefined || brut === null || brut === '') return AUTO;
    const n = Math.round(Number(brut));
    if (!Number.isFinite(n) || n <= 0) return AUTO;
    return Math.max(PAR_MARCHE_MIN, Math.min(PAR_MARCHE_MAX, n));
}

/**
 * LE PARTAGE, MARCHE PAR MARCHE — et c'est lui que l'aperçu dessine.
 *
 * EN `AUTO`, LES MARCHES SE PARTAGENT LE TOTAL À PARTS ÉGALES, et le reste va
 * aux DERNIÈRES, une question de plus chacune : dix questions sur six marches
 * donnent 1, 1, 2, 2, 2, 2.
 *
 * `core/pythagore.js` posait déjà le partage, mais en donnant tout le reste à
 * la seule dernière marche — dix questions sur six marches y faisaient 1, 1, 1,
 * 1, 1, 5, c'est-à-dire la moitié de l'exercice sur une marche et rien nulle
 * part ailleurs. La direction est bonne (la dernière marche est le SUJET du
 * chapitre, les précédentes le préparent, et une fin de séance se passe en haut
 * de l'escalier), le dosage ne l'était pas. On étale donc le reste sur les
 * dernières, ce qui garde la pente sans creuser de trou.
 *
 * QUAND IL Y A MOINS DE QUESTIONS QUE DE MARCHES, on ne peut pas toutes les
 * voir : on garde les premières, une chacune. C'est un choix, et il est
 * signalé — l'aperçu montre alors moins de marches qu'il n'y en a, ce qui est
 * précisément l'information dont le professeur a besoin pour rallonger.
 *
 * @returns {Array<{marche:number, n:number, de:number, a:number}>}
 *   `de` et `a` sont des rangs de questions à partir de 1, bornes comprises.
 */
export function decoupeMarches(nbMarches, total, params) {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    const n = Math.max(1, Math.round(Number(total)) || 1);
    const choix = repartitionDe(params);

    const parts = [];
    if (choix === AUTO) {
        const base = Math.floor(n / m);
        if (base < 1) {
            // Moins de questions que de marches : une chacune, et l'on s'arrête.
            for (let k = 0; k < n; k++) parts.push(1);
        } else {
            const reste = n - base * m;
            for (let k = 0; k < m; k++) parts.push(base + (k >= m - reste ? 1 : 0));
        }
    } else {
        let reste = n;
        for (let k = 0; k < m && reste > 0; k++) {
            const part = Math.min(choix, reste);
            parts.push(part);
            reste -= part;
        }
        // Arrivé en haut avant la fin, on reste sur la dernière marche : c'est
        // le sujet du chapitre, pas un débordement.
        if (reste > 0 && parts.length) parts[parts.length - 1] += reste;
        if (!parts.length) parts.push(n);
    }

    let rang = 1;
    return parts.map((p, k) => {
        const de = rang;
        rang += p;
        return { marche: k, n: p, de, a: rang - 1 };
    });
}

/**
 * LA MARCHE OÙ EN EST LA SÉRIE.
 *
 * @param {number} index      le rang de la question, 0 pour la première
 * @param {number} nbMarches  combien il y en a
 * @param {Object} params     les réglages
 * @param {*}      defaut     ce que le générateur faisait avant le réglage
 * @param {number} [total]    la longueur de l'exercice — nécessaire en AUTO
 */
export function rangMarche(index, nbMarches, params, historique = PAR_MARCHE_DEFAUT, total = 0) {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    const i = Math.max(0, Math.round(Number(index)) || 0);
    const choix = repartitionDe(params);

    // SANS LE TOTAL, ON NE PEUT PAS PARTAGER — et il faut le dire par un
    // comportement sûr plutôt que par une division par zéro. On retombe alors
    // sur le compte que ce générateur-là posait avant qu'il y ait un réglage,
    // donc le pire qui puisse arriver est que rien ne change.
    if (choix === AUTO && !(Number(total) > 0)) {
        const par = Math.max(1, Math.round(Number(historique)) || PAR_MARCHE_DEFAUT);
        return Math.min(m - 1, Math.floor(i / par));
    }
    if (choix !== AUTO) return Math.min(m - 1, Math.floor(i / choix));

    const coupe = decoupeMarches(m, total, params);
    const rang = i + 1;
    for (const z of coupe) if (rang <= z.a) return z.marche;
    return coupe.length ? coupe[coupe.length - 1].marche : 0;
}

/**
 * LA MARCHE, POUR LES PROGRESSIONS QUI RECOMMENCENT EN BAS.
 *
 * Quatre générateurs — les puissances, les préfixes, Thalès — repartent de la
 * première marche une fois en haut. La raison est écrite chez eux et elle est
 * bonne : avec un compte fixe, plafonner sur la dernière poserait quinze
 * questions du même type au bas d'une fiche de vingt.
 *
 * MAIS LE PARTAGE REND LE CYCLE INUTILE. Si les marches se divisent le total,
 * aucune ne peut déborder : le défaut que le cycle réparait n'existe plus. On
 * ne cycle donc que sur un compte fixe, là où il sert encore.
 */
export function rangMarcheCyclique(index, nbMarches, params, historique = PAR_MARCHE_DEFAUT, total = 0) {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    const i = Math.max(0, Math.round(Number(index)) || 0);
    const choix = repartitionDe(params);
    if (choix === AUTO && Number(total) > 0) return rangMarche(i, m, params, historique, total);
    const par = choix === AUTO
        ? Math.max(1, Math.round(Number(historique)) || PAR_MARCHE_DEFAUT) : choix;
    return Math.floor(i / par) % m;
}

/**
 * LE TOTAL, TEL QUE LE GÉNÉRATEUR PEUT LE CONNAÎTRE.
 *
 * `ctx.total` vient de la session, qui le tient de l'étape. Il manque dans deux
 * cas — une vignette de catalogue, un aperçu papier —, et les réglages portent
 * alors souvent `nbQuestions`, posé par le panneau. Zéro veut dire « on ne sait
 * pas », et `rangMarche` retombe alors sur le compte historique.
 */
export function totalDe(ctx, params) {
    const a = Number((ctx || {}).total);
    if (Number.isFinite(a) && a > 0) return Math.round(a);
    const b = Number((params || {}).nbQuestions);
    return Number.isFinite(b) && b > 0 ? Math.round(b) : 0;
}

/**
 * Combien de questions il faut pour parcourir toute la progression.
 *
 * C'est ce que `duree.js` appelle le `conseil` du générateur, et c'est lui qui
 * empêche le défaut de dix de tronquer l'escalier en silence.
 *
 * EN AUTO, LE CONSEIL NE COMMANDE PLUS RIEN — il PROPOSE. Les marches se
 * partagent ce qu'on leur donne ; le conseil dit seulement combien il en
 * faudrait pour que chacune ait de quoi travailler, soit deux questions. Le
 * professeur reste libre d'en mettre dix sur douze marches : il verra dix
 * marches sur douze, une question chacune, et l'aperçu le lui aura dit.
 */
export function conseilProgression(nbMarches, params, historique = PAR_MARCHE_DEFAUT) {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    const choix = repartitionDe(params);
    const par = choix === AUTO
        ? Math.max(1, Math.round(Number(historique)) || PAR_MARCHE_DEFAUT) : choix;
    return m * par;
}

/**
 * LE RÉGLAGE, tel qu'il apparaît dans le panneau.
 *
 * `echelle: true` : `core/echelle.js` en fait une glissière à sept crans, du
 * partage automatique jusqu'à six questions par marche. C'est la bonne forme —
 * ce sont des exigences croissantes sur une même chose, et le geste au doigt
 * vaut mieux qu'une liste à dérouler.
 *
 * IL EST PLACÉ JUSTE APRÈS LE CHOIX DE LA PROGRESSION, et il le dit : le
 * panneau ne sait pas masquer un réglage selon la valeur d'un autre, et une
 * ligne qui resterait active alors qu'on a choisi UNE marche précise serait un
 * bouton sans effet — la pire espèce de réglage. On ne peut pas la cacher ; on
 * l'écrit dans l'aide, à l'endroit où on la lit.
 *
 * @param {Object} [opts]
 * @param {number} [opts.marches]  le nombre de marches, pour chiffrer l'aide
 * @param {string} [opts.mot]      « marche », « étape », « niveau »…
 */
export function paramRepartition({ marches = 0, mot = 'marche' } = {}) {
    const m = Math.round(Number(marches)) || 0;
    const combien = m
        ? ` Cet exercice a ${m} ${mot}s : en partage, ${m * 2} questions leur en donnent `
            + `deux chacune, ${m} une seule.`
        : '';
    return {
        id: 'repartition', type: 'select', label: `Répartition des ${mot}s`,
        default: AUTO, echelle: true,
        aide: `Sur « progressif », c’est la façon dont les ${mot}s se partagent l’exercice. `
            + `EN PARTAGE — le défaut —, on règle librement le nombre de questions et les `
            + `${mot}s se le divisent, la dernière ramassant le reste : c’est elle le sujet `
            + `du chapitre. Un compte FIXE fait l’inverse : deux questions par ${mot} quoi `
            + `qu’il arrive, quitte à ne pas toutes les parcourir si l’exercice est court.`
            + `${combien} Sans effet si l’on a choisi une ${mot} précise au-dessus : il n’y `
            + `en a plus qu’une.`,
        options: [
            // « ÷ » comme cran : le partage EST une division de l'exercice, et
            // le signe se lit sans légende à côté des chiffres 1 à 6.
            { value: AUTO, label: `En partage — les ${mot}s se divisent l’exercice`, court: '÷' },
            ...Array.from({ length: PAR_MARCHE_MAX }, (_, k) => ({
                value: k + 1,
                label: `${k + 1} question${k ? 's' : ''} par ${mot}`,
                court: String(k + 1)
            }))
        ]
    };
}

/**
 * L'APERÇU, EN UNE PHRASE — « 12 questions, 6 marches : 2 chacune ».
 *
 * Rémy : « on ne comprend pas grand-chose ». Un réglage nommé « en partage » ne
 * dit pas ce qu'il produira, exactement comme « Progressive (recommandé) » ne
 * le disait pas pour l'aide — et c'est le même remède : on DÉROULE, et l'on
 * écrit ce qu'on trouve.
 */
export function repartitionEnMots(nbMarches, total, params, mot = 'marche') {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    const n = Math.max(1, Math.round(Number(total)) || 1);
    const coupe = decoupeMarches(m, n, params);
    const vues = coupe.length;
    const tailles = [...new Set(coupe.map(z => z.n))];
    const combien = tailles.length === 1
        ? `${tailles[0]} question${tailles[0] > 1 ? 's' : ''} chacune`
        : `de ${Math.min(...tailles)} à ${Math.max(...tailles)} questions chacune`;

    // ON NE VOIT PAS TOUTES LES MARCHES, et il faut dire COMBIEN il en
    // faudrait : « il en manque » n'aide personne à régler la glissière.
    //
    // Le premier jet annonçait ici « une question chacune », ce qui est vrai du
    // partage à court d'espace et FAUX du compte fixe : quinze questions à
    // trois par marche en couvrent cinq, à trois questions chacune. Le message
    // se déduit donc du découpage, il ne suppose plus rien.
    if (vues < m) {
        const manque = coupe.reduce((s2, z) => s2 + z.n, 0) / vues * m;
        return `${n} questions : ${vues} ${mot}s sur ${m}, ${combien}. `
            + `Il en faudrait ${Math.ceil(manque)} pour les parcourir toutes.`;
    }
    // LE HAUT DE L'ESCALIER RAMASSE LE RESTE, et quand cela devient gros il
    // faut le dire : à trois par marche sur six marches et trente questions, la
    // dernière en reçoit quinze. C'est voulu — c'est le sujet du chapitre — mais
    // ce n'est pas ce qu'on lit dans « 3 questions par marche ».
    const derniere = coupe[coupe.length - 1].n;
    const avant = vues > 1 ? coupe[vues - 2].n : derniere;
    const trop = derniere >= avant * 2 && derniere > avant + 1
        ? ` La dernière ${mot} en garde ${derniere} : c'est là qu'on finit.` : '';
    return `${n} questions pour ${m} ${mot}s : ${combien}.${trop}`;
}
