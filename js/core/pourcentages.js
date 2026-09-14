// LES POURCENTAGES — de « 25 % de 80 » jusqu'à la TVA.
//
// Rémy : « j'aimerais bien faire les exercices sur les pourcentages. Calculer
// une réduction, calculer une augmentation, se rendre compte que 120 % c'est
// multiplié par 1,20, que prendre 80 % [c'est] 0,20 [de moins] ; puis après des
// exercices avec des calculs de réduction et le calcul final, des exercices
// avec des augmentations, puis des exercices avec les taxes […] il faut les
// explications très simples. »
//
// SEPT ÉTAPES, ET C'EST SA LISTE, DANS SON ORDRE. Le cœur est au milieu :
// augmenter de 20 %, c'est multiplier par 1,20 ; réduire de 20 %, c'est
// multiplier par 0,80. Tout ce qui suit — la réduction, le prix soldé, le prix
// augmenté, la TVA — n'est plus qu'une application de ce seul coefficient, et
// c'est exactement ce que l'élève doit finir par voir : ce sont QUATRE fois le
// même calcul, pas quatre recettes.
//
// LES NOMBRES SONT CHOISIS POUR TOMBER JUSTE, ET CE N'EST PAS DE LA COMPLAISANCE.
// On tire le montant parmi ceux dont le pourcentage donne un compte rond
// (`montant × p` divisible par 100). Un exercice qui apprend le SENS d'un
// coefficient ne doit pas se jouer en même temps sur la division décimale : on
// ne fait pas deux difficultés à la fois, et celui qui butera sur 37,45 croira
// avoir mal compris les pourcentages.
//
// Module pur : aucun DOM, il se teste sous Node.

/** L'échelle, dans l'ordre où Rémy l'a dictée. */
export const MARCHES_POURCENTAGE = [
    { id: 'part', nom: '1. Prendre un pourcentage' },
    { id: 'hausse-coef', nom: '2. Augmenter, c’est multiplier' },
    { id: 'baisse-coef', nom: '3. Réduire, c’est multiplier aussi' },
    { id: 'reduction', nom: '4. Combien on économise' },
    { id: 'prix-reduit', nom: '5. Le prix après la réduction' },
    { id: 'prix-augmente', nom: '6. Le prix après l’augmentation' },
    { id: 'taxe', nom: '7. La TVA' }
];

/** Les pourcentages qu'on rencontre vraiment dans une vitrine. */
const POURCENTAGES = [5, 10, 15, 20, 25, 30, 40, 50, 75];

// PAS DE 50 % SUR LES SOLDES, ET C'EST LE TEST QUI L'A TROUVÉ.
//
// À −50 %, ce qu'on économise et ce qu'on paie sont LE MÊME NOMBRE. Or ces deux
// étapes existent précisément pour qu'on apprenne à les distinguer — c'est
// l'erreur numéro un du chapitre, répondre la réduction quand on demande le
// prix. Une question où les deux réponses coïncident ne l'enseigne pas : elle
// la récompense. (50 % reste dans « prendre un pourcentage » et dans le
// coefficient, où rien ne se confond.)
const POURCENTAGES_SOLDE = POURCENTAGES.filter(p => p !== 50);

// ET JAMAIS 100 € COMME PRIX DE DÉPART, pour la même raison en plus simple :
// sur une base de 100, le pourcentage EST la réponse. « 15 % de 100 » se répond
// en recopiant l'énoncé, et l'élève croit avoir compris.
const BASE_INTERDITE = 100;
/** Une hausse de 75 % ne se voit nulle part : les hausses restent modestes. */
const POURCENTAGES_HAUSSE = [2, 4, 5, 10, 15, 20, 25];
/** Les taux de TVA français. On n'invente pas de taxe à 37 %. */
const TAUX_TVA = [20, 10];

// LE GENRE EST DÉCLARÉ, PAS DEVINÉ. « Une console de jeux coûte 200 €. IL est
// soldé » : c'est ce que rendait la première version, et une faute d'accord
// dans un énoncé de maths décrédibilise tout le reste. On ne le lit pas sur
// l'article non plus — « une paire de baskets » commence par « une » mais
// « un ordinateur » et « une imprimante » ne se distinguent que si on le dit.

/** Ce qu'on solde. */
const ARTICLES = [
    { nom: 'un jean', min: 30, max: 80 },
    { nom: 'un pull', min: 20, max: 60 },
    { nom: 'une paire de baskets', f: true, min: 40, max: 120 },
    { nom: 'un vélo', min: 120, max: 400 },
    { nom: 'une trottinette', f: true, min: 80, max: 300 },
    { nom: 'un casque de vélo', min: 20, max: 60 },
    { nom: 'un sac à dos', min: 20, max: 60 },
    { nom: 'un manteau', min: 60, max: 200 },
    { nom: 'une console de jeux', f: true, min: 200, max: 400 },
    { nom: 'un ballon de basket', min: 20, max: 60 }
];

/** Ce qui augmente. */
const ABONNEMENTS = [
    { nom: 'un abonnement de téléphone', min: 10, max: 40 },
    { nom: 'un loyer', min: 300, max: 900 },
    { nom: 'un billet de train', min: 20, max: 100 },
    { nom: 'une place de cinéma', f: true, min: 8, max: 20 },
    { nom: 'une carte de piscine', f: true, min: 20, max: 60 },
    { nom: 'un abonnement de bus', min: 20, max: 80 }
];

/** Ce qui s'achète hors taxes — du matériel, pas des vêtements. */
const HORS_TAXES = [
    { nom: 'une trottinette', f: true, min: 100, max: 400 },
    { nom: 'un ordinateur', min: 300, max: 900 },
    { nom: 'une imprimante', f: true, min: 60, max: 200 },
    { nom: 'un téléphone', min: 100, max: 400 },
    { nom: 'une perceuse', f: true, min: 40, max: 200 },
    { nom: 'un canapé', min: 200, max: 800 }
];

/** Les montants de la première étape, qui ne nomme aucun objet. */
const PART_MIN = 20, PART_MAX = 300;

// --- Écriture ----------------------------------------------------------------

/**
 * Un nombre écrit à la française : virgule, et pas de zéro inutile.
 * `ecrireNombre(28)` → « 28 », `ecrireNombre(7.5)` → « 7,5 ».
 */
export function ecrireNombre(x) {
    const n = Math.round(Number(x) * 100) / 100;
    return String(n).replace('.', ',');
}

/** Un prix : deux décimales seulement s'il en faut. */
export const ecrireEuros = (x) => `${ecrireNombre(x)} €`;

/**
 * UN COEFFICIENT S'ÉCRIT AVEC DEUX DÉCIMALES — 1,20 et 0,80, pas 1,2 et 0,8.
 *
 * C'est la façon dont Rémy l'a écrit, et ce n'est pas une coquetterie : « 1,20 »
 * se lit « cent vingt pour cent » d'un coup d'œil, « 1,2 » demande de recompter.
 * La réponse tapée par l'élève, elle, accepte les deux — `sameAnswer` compare
 * des nombres, pas des chaînes.
 */
export const ecrireCoefficient = (c) =>
    (Math.round(Number(c) * 100) / 100).toFixed(2).replace('.', ',');

// --- Le calcul ---------------------------------------------------------------

/**
 * LE COEFFICIENT MULTIPLICATEUR — le seul objet à retenir de tout le chapitre.
 *
 * @param {number} p    le pourcentage, entier positif
 * @param {number} sens +1 pour une hausse, −1 pour une baisse
 */
export function coefficient(p, sens) {
    return Math.round((100 + sens * p)) / 100;
}

/** `p %` de `montant`, arrondi au centime — mais les tirages tombent juste. */
export const partDe = (montant, p) => Math.round(montant * p) / 100;

/**
 * Les montants qui donnent un compte rond avec ce pourcentage.
 *
 * On avance de 5 en 5 : un prix se termine par 0 ou par 5, pas par 3. Et l'on
 * ne garde que ceux dont `montant × p` est divisible par 100, c'est-à-dire
 * ceux dont la part est un nombre entier d'euros.
 */
export function montantsRonds(p, min, max) {
    const out = [];
    for (let m = Math.ceil(min / 5) * 5; m <= max; m += 5) {
        if ((m * p) % 100 === 0) out.push(m);
    }
    return out;
}

/**
 * TIRER UNE QUESTION — et n'en tirer qu'une qui tombe juste.
 *
 * Le tirage garantit trois choses, et les tests les vérifient : la part est un
 * nombre entier d'euros, le prix final aussi, et le montant de départ est un
 * prix plausible pour l'objet nommé (on ne solde pas un ballon à 380 €).
 *
 * @returns {{marche, p, sens, montant, part, final, coef, objet}}
 */
export function tirerPourcentage(rng, marche = 'part') {
    const choisir = (liste) => liste[rng.int(0, liste.length - 1)];

    if (marche === 'hausse-coef' || marche === 'baisse-coef') {
        const sens = marche === 'hausse-coef' ? 1 : -1;
        const p = choisir(sens > 0 ? POURCENTAGES_HAUSSE : POURCENTAGES);
        return { marche, p, sens, coef: coefficient(p, sens) };
    }

    if (marche === 'part') {
        const p = choisir(POURCENTAGES);
        const montants = montantsRonds(p, PART_MIN, PART_MAX).filter(m => m !== BASE_INTERDITE);
        const montant = choisir(montants);
        return { marche, p, sens: -1, montant, part: partDe(montant, p),
            coef: coefficient(p, -1), final: montant - partDe(montant, p) };
    }

    const sens = (marche === 'prix-augmente' || marche === 'taxe') ? 1 : -1;
    const taux = marche === 'taxe' ? TAUX_TVA
        : (sens > 0 ? POURCENTAGES_HAUSSE : POURCENTAGES_SOLDE);
    const catalogue = marche === 'taxe' ? HORS_TAXES
        : (sens > 0 ? ABONNEMENTS : ARTICLES);

    // ON TIRE L'OBJET, PUIS UN PRIX QUI LUI VA — et si aucun prix de sa
    // fourchette ne tombe juste avec ce pourcentage, on change de pourcentage
    // plutôt que d'objet : c'est le pourcentage qui a le moins d'importance
    // pour la vraisemblance de la phrase.
    const objet = choisir(catalogue);
    const bons = (q) => montantsRonds(q, objet.min, objet.max).filter(m => m !== BASE_INTERDITE);
    let p = choisir(taux);
    let montants = bons(p);
    for (const candidat of rng.shuffle([...taux])) {
        if (montants.length) break;
        p = candidat;
        montants = bons(p);
    }
    const montant = choisir(montants.length ? montants : [objet.min]);

    const part = partDe(montant, p);
    return {
        marche, p, sens, objet: objet.nom, feminin: !!objet.f, montant, part,
        coef: coefficient(p, sens),
        final: Math.round((montant + sens * part) * 100) / 100
    };
}

// --- Ce qu'on demande, et ce qu'on répond ------------------------------------

/** La question, telle qu'elle se lit. */
export function enonceDe(t) {
    switch (t.marche) {
    case 'part':
        return `Combien font ${t.p} % de ${ecrireEuros(t.montant)} ?`;
    case 'hausse-coef':
        return `Augmenter un prix de ${t.p} %, c’est le multiplier par combien ?`;
    case 'baisse-coef':
        return `Réduire un prix de ${t.p} %, c’est le multiplier par combien ?`;
    case 'reduction':
        return `${majuscule(t.objet)} coûte ${ecrireEuros(t.montant)}. `
            + `${il(t)} est soldé${t.feminin ? 'e' : ''} à −${t.p} %. Combien économise-t-on ?`;
    case 'prix-reduit':
        return `${majuscule(t.objet)} coûte ${ecrireEuros(t.montant)}. `
            + `${il(t)} est soldé${t.feminin ? 'e' : ''} à −${t.p} %. Quel prix paie-t-on ?`;
    case 'prix-augmente':
        return `${majuscule(t.objet)} coûte ${ecrireEuros(t.montant)}. `
            + `${il(t)} augmente de ${t.p} %. Quel est le nouveau prix ?`;
    case 'taxe':
        return `${majuscule(t.objet)} coûte ${ecrireEuros(t.montant)} hors taxes. `
            + `La TVA est de ${t.p} %. Quel prix paie-t-on ?`;
    default:
        return '';
    }
}

/** La réponse attendue, en nombre. */
export function reponseDe(t) {
    switch (t.marche) {
    case 'part': return t.part;
    case 'hausse-coef':
    case 'baisse-coef': return t.coef;
    case 'reduction': return t.part;
    default: return t.final;
    }
}

/** L'unité de la réponse, pour l'écran et pour la feuille. */
export const uniteDe = (t) => (t.marche === 'hausse-coef' || t.marche === 'baisse-coef') ? '' : '€';

/**
 * L'EXPLICATION — deux lignes, et les nombres dedans.
 *
 * Rémy : « il faut les explications très simples ». C'est la contrainte la plus
 * exigeante de tout l'exercice, et la plus facile à trahir : sur les
 * pourcentages, on a toujours envie d'ajouter la règle générale, la remarque
 * sur les proportions, le contre-exemple. Chaque phrase de plus est une phrase
 * que l'élève ne lira pas.
 *
 * DEUX PHRASES : le calcul, puis la raison. Jamais l'inverse — celui qui vient
 * de se tromper cherche d'abord ce qu'il fallait écrire.
 */
export function expliquer(t) {
    const c = ecrireCoefficient(t.coef);
    switch (t.marche) {
    case 'part':
        return `${t.p} % de ${ecrireNombre(t.montant)}, c’est ${ecrireNombre(t.montant)} × ${t.p} ÷ 100 = ${ecrireNombre(t.part)}. `
            + `Un pourcentage, c’est une part sur 100.`;
    case 'hausse-coef':
        return `On garde les 100 % de départ et on en ajoute ${t.p} : cela fait ${100 + t.p} %, donc × ${c}. `
            + `Augmenter, c’est multiplier par plus que 1.`;
    case 'baisse-coef':
        return `On ne garde plus que 100 − ${t.p} = ${100 - t.p} % du prix, donc × ${c}. `
            + `Réduire, c’est multiplier par moins que 1.`;
    case 'reduction':
        return `${t.p} % de ${ecrireNombre(t.montant)} = ${ecrireNombre(t.montant)} × ${ecrireNombre(t.p / 100)} = ${ecrireNombre(t.part)}. `
            + `On cherche ce qu’on enlève, pas ce qu’on paie.`;
    case 'prix-reduit':
        return `On paie ${100 - t.p} % du prix : ${ecrireNombre(t.montant)} × ${c} = ${ecrireNombre(t.final)}. `
            + `Ou bien : ${ecrireNombre(t.montant)} − ${ecrireNombre(t.part)} = ${ecrireNombre(t.final)}.`;
    case 'prix-augmente':
        return `On paie ${100 + t.p} % du prix : ${ecrireNombre(t.montant)} × ${c} = ${ecrireNombre(t.final)}. `
            + `Ou bien : ${ecrireNombre(t.montant)} + ${ecrireNombre(t.part)} = ${ecrireNombre(t.final)}.`;
    case 'taxe':
        return `La TVA s’ajoute au prix : on paie ${100 + t.p} %, donc ${ecrireNombre(t.montant)} × ${c} = ${ecrireNombre(t.final)}. `
            + `La TVA de ${ecrireEuros(t.part)} s’ajoute, elle ne s’enlève pas.`;
    default:
        return '';
    }
}

/**
 * LES FAUSSES RÉPONSES QUI APPRENNENT QUELQUE CHOSE.
 *
 * Chacune est une erreur qu'on voit vraiment sur les copies, et chacune dit
 * laquelle : c'est ce qui transforme un « faux » en diagnostic. Les deux plus
 * fréquentes du chapitre s'y trouvent — répondre la réduction quand on demande
 * le prix (et l'inverse), et prendre 0,20 au lieu de 0,80 pour une baisse de
 * 20 %.
 */
export function leurresDe(t) {
    const brut = (() => {
        switch (t.marche) {
        case 'part':
            return [
                // L'ORDRE COMPTE : on n'en garde que trois, et ce sont les
                // trois premières. « Oublier de diviser par 100 » est une vraie
                // erreur, mais elle donne 7 500 € pour une réponse à 75 € — dans
                // une liste de quatre, on l'élimine sans réfléchir. Elle passe
                // donc en dernier, où elle ne sert que si les autres se sont
                // annulées entre elles.
                { value: t.montant - t.p, why: `Tu as soustrait ${t.p} au lieu de prendre ${t.p} % de ${ecrireNombre(t.montant)}.` },
                { value: Math.round(t.montant / t.p * 100) / 100, why: 'Tu as divisé par le pourcentage : il faut multiplier, puis diviser par 100.' },
                { value: Math.round(t.montant / 2 * 100) / 100, why: 'C’est la moitié, donc 50 % — le pourcentage demandé n’est pas 50.' },
                { value: t.montant * t.p, why: 'Tu as oublié de diviser par 100.' }
            ];
        // LE « × 1 » FERME LE TROU DE 50 %. À −50 %, « garder ce qu'on enlève »
        // et « garder le pourcentage restant » donnent tous deux 0,50 et 50 :
        // deux leurres s'annulaient contre la bonne réponse, et le QCM tombait
        // à trois propositions. Multiplier par 1, c'est ne rien changer — c'est
        // toujours faux ici, et ça se dit en cinq mots.
        case 'hausse-coef':
            return [
                { value: Math.round(t.p) / 100, why: `× ${ecrireCoefficient(t.p / 100)} ne donnerait que les ${t.p} % ajoutés, et ferait disparaître le prix de départ.` },
                { value: 100 + t.p, why: `${100 + t.p} est le pourcentage total, pas le coefficient : il reste à diviser par 100.` },
                { value: Math.round((100 - t.p)) / 100, why: 'C’est le coefficient d’une BAISSE de ce pourcentage.' },
                { value: 1, why: '× 1 ne changerait rien : le prix n’augmenterait pas.' }
            ];
        case 'baisse-coef':
            return [
                { value: Math.round(t.p) / 100, why: `× ${ecrireCoefficient(t.p / 100)} garderait les ${t.p} % qu’on enlève, au lieu de ce qui reste.` },
                { value: Math.round((100 + t.p)) / 100, why: 'C’est le coefficient d’une HAUSSE de ce pourcentage.' },
                { value: 100 - t.p, why: `${100 - t.p} est le pourcentage qui reste, pas le coefficient : il reste à diviser par 100.` },
                { value: 1, why: '× 1 ne changerait rien : le prix ne baisserait pas.' }
            ];
        case 'reduction':
            return [
                { value: t.final, why: 'C’est le prix payé. La question demande ce qu’on économise.' },
                { value: t.montant - t.p, why: `Tu as enlevé ${t.p} € au lieu de ${t.p} %.` },
                { value: Math.round(t.montant / t.p * 100) / 100, why: 'Tu as divisé par le pourcentage au lieu de multiplier.' }
            ];
        case 'prix-reduit':
            return [
                { value: t.part, why: 'C’est la réduction. La question demande le prix payé : il faut la retirer du prix.' },
                { value: t.montant - t.p, why: `Tu as enlevé ${t.p} € au lieu de ${t.p} %.` },
                { value: Math.round((t.montant + t.part) * 100) / 100, why: 'Tu as ajouté la réduction au lieu de l’enlever.' }
            ];
        case 'prix-augmente':
        case 'taxe':
            return [
                { value: t.part, why: t.marche === 'taxe'
                    ? 'C’est le montant de la TVA. La question demande le prix à payer, TVA comprise.'
                    : 'C’est l’augmentation. La question demande le nouveau prix.' },
                { value: Math.round((t.montant - t.part) * 100) / 100, why: 'Tu as enlevé au lieu d’ajouter.' },
                { value: t.montant + t.p, why: `Tu as ajouté ${t.p} € au lieu de ${t.p} %.` }
            ];
        default:
            return [];
        }
    })();

    // ET UN LEURRE QUI NE PEUT JAMAIS SE CONFONDRE : le prix de départ, recopié.
    //
    // Il ferme un trou mesuré. Sur certains tirages, deux erreurs classiques
    // tombent sur le même nombre et l'une d'elles vaut même la bonne réponse ;
    // il ne restait alors qu'un ou deux leurres, et le QCM affichait trois
    // propositions au lieu de quatre. Celui-ci est toujours disponible — un
    // prix qui varie n'est jamais égal à son point de départ — et c'est une
    // vraie erreur : recopier l'énoncé quand on ne sait pas quoi faire.
    const recopie = t.montant === undefined ? [] : [{
        value: t.montant,
        why: t.marche === 'part' || t.marche === 'reduction'
            ? 'C’est le prix entier. On demande seulement une part de ce prix.'
            : 'C’est le prix de départ. On demande le prix APRÈS la variation.'
    }];

    // ON NE PROPOSE JAMAIS DEUX FOIS LA MÊME CHOSE, NI LA BONNE RÉPONSE PARMI
    // LES FAUSSES. Sur certains tirages les erreurs se rejoignent — enlever 20 €
    // et enlever 20 % coïncident quand le prix vaut 100 —, et un QCM qui montre
    // deux fois la même valeur, dont l'une est comptée fausse, est injouable.
    const juste = reponseDe(t);
    const vus = new Set([arrondi(juste)]);
    return [...brut, ...recopie].filter(l => {
        const v = arrondi(l.value);
        if (!Number.isFinite(v) || vus.has(v) || v < 0) return false;
        vus.add(v);
        return true;
    }).map(l => ({ ...l, value: arrondi(l.value) }));
}

const arrondi = (x) => Math.round(Number(x) * 100) / 100;
const majuscule = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const il = (t) => (t.feminin ? 'Elle' : 'Il');
