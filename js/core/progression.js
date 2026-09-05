// LES MARCHES D'UNE PROGRESSION : lesquelles on travaille, et comment elles se
// partagent l'exercice.
//
// Rémy, en trois passes. D'abord : « quand on a une progression, il faudrait
// pouvoir choisir aussi la répartition non ? » Puis, devant le premier essai :
// « on ne comprend pas grand-chose, parce que du coup le nombre de questions
// dépend des marches […] on pourrait faire comme quand on définit pour le QCM
// à 2, 4 ou libre, avec le même principe. » Enfin :
//
//   « il faudrait pouvoir choisir les niveaux par checkbox, avoir un nombre de
//    questions que ça change le nombre de questions, et avoir la même chose
//    avec un peu le diagramme en barres. »
//
// TROIS OBJETS, ET C'ÉTAIT UN SEUL MENU. Le réglage d'origine — « Étape :
// progressif / A / B / C / 1. … / 12. … » — mélangeait trois questions qui
// n'ont rien à voir :
//
//   1. QUELLES marches on travaille aujourd'hui. C'est un choix multiple par
//      nature : « les quatre premières », « A et C », « la 7 toute seule ». Un
//      menu à choix unique n'en exprime aucun, sauf par des entrées composées
//      qu'il faut prévoir une par une — d'où « A », « B », « C », qui sont des
//      raccourcis déguisés en options.
//   2. COMBIEN de questions dure l'exercice. Rien à voir avec le nombre de
//      marches, et pourtant le premier essai le calculait à partir d'elles.
//   3. COMMENT ces questions se répartissent sur ces marches-là.
//
// On les sépare : une liste à cocher, un nombre de questions qui ne fait que
// cela, et une barre qui montre le partage — et sur laquelle on peut tirer une
// borne, exactement comme sur la frise du QCM.
//
// AU-DELÀ DE HUIT MARCHES, ON GROUPE. Rémy : « pour un exercice des nombres
// relatifs il y a beaucoup d'étapes, ça risque d'être illisible ». Treize cases
// à la file sur un téléphone, c'est illisible en effet — mais le groupement
// existe déjà dans le code et il est pédagogique, pas décoratif : les temps
// A / B / C. On coche donc trois lignes, et l'on déplie un temps quand on veut
// y entrer. Sous huit marches, aucun groupe : la liste tient déjà.
//
// LE NOM DU RÉGLAGE N'EST PAS `repartition`, ET C'EST DÉLIBÉRÉ. Ce nom-là
// appartient déjà à l'escalier de l'aide (`core/aide.js`, les zones
// « 3:2,5:4,2:k »), qui vit dans les mêmes réglages d'exercice : deux objets
// sous une seule clé, c'est le premier qui écrase le second sans un mot, et un
// professeur qui règle sa frise de QCM verrait sauter son partage de marches.
//
// LES ANCIENS RÉGLAGES SE RELISENT. Un parcours enregistré porte `etape:
// 'progressif'`, `niveau: 'thermometre'`, `etape: 'B'` ou `parMarche: 3`. Les
// lire comme « rien de coché » viderait l'exercice ; les ignorer effacerait un
// choix que le professeur a posé. `marchesCochees` les traduit.

/** Toutes les marches, c'est le défaut — et c'est ce que disait « progressif ». */
export const TOUTES = 'toutes';

/** Au-delà, la liste se plie en groupes — voir l'en-tête. */
export const SANS_GROUPE_MAX = 8;

/** Ce que les générateurs posaient en dur avant qu'il y ait un réglage. */
export const PAR_MARCHE_DEFAUT = 2;

/**
 * LA LISTE DES MARCHES, NORMALISÉE.
 *
 * Un générateur les décrit comme il les a écrites — `{ id, nom }`, plus un
 * `groupe` quand il en a. On accepte aussi les formes courtes qu'on trouve dans
 * le code (`{ id, titre }`, `{ id, label }`, `{ id, temps }`) plutôt que
 * d'imposer un renommage à treize fichiers pour un seul champ.
 *
 * @returns {Array<{id:string, nom:string, groupe:?string}>}
 */
export function normaliserMarches(brutes) {
    return (brutes || []).map((m, i) => {
        if (typeof m === 'string') return { id: m, nom: m, groupe: null };
        return {
            id: String(m.id !== undefined ? m.id : i),
            nom: String(m.nom || m.titre || m.label || m.id || i),
            groupe: m.groupe !== undefined ? m.groupe : (m.temps || null)
        };
    });
}

/**
 * CE QUE LE PROFESSEUR A COCHÉ, dans l'ordre de la progression.
 *
 * L'ordre vient TOUJOURS de la liste du générateur, jamais de l'ordre où l'on a
 * cliqué : une progression est une progression, et cocher la 7 avant la 3 ne
 * veut pas dire qu'on veut la 7 d'abord.
 *
 * ON NE REND JAMAIS UNE LISTE VIDE. Tout décocher est un geste qu'on fait en
 * passant — pour tout recocher ensuite —, et un exercice sans aucune marche
 * n'aurait rien à poser. On retombe alors sur la progression entière, ce qui
 * est aussi ce que dit le défaut.
 *
 * @param {Object} params    les réglages
 * @param {Array}  toutes    la liste du générateur (normalisée ou brute)
 * @param {Object} [ancien]  comment traduire un réglage enregistré avant les
 *   cases : `{ cle: 'etape', groupes: true }` — voir l'en-tête.
 */
export function marchesCochees(params, toutes, ancien = {}) {
    const liste = normaliserMarches(toutes);
    if (!liste.length) return [];
    const p = params || {};
    const garder = (ids) => {
        const vus = new Set(ids.map(String));
        const out = liste.filter(m => vus.has(m.id));
        return out.length ? out : liste;
    };

    if (Array.isArray(p.marches)) {
        // Un tableau vide est un état de travail, pas une demande : voir
        // ci-dessus.
        return p.marches.length ? garder(p.marches) : liste;
    }

    // --- LES RÉGLAGES D'AVANT LES CASES -------------------------------------
    const cle = ancien.cle;
    const vieux = cle ? p[cle] : undefined;
    if (vieux === undefined || vieux === null || vieux === '' || vieux === 'progressif') {
        return liste;
    }
    // « A », « B », « C » désignaient un TEMPS entier : c'est exactement ce que
    // le groupe coché fait aujourd'hui.
    const parGroupe = liste.filter(m => m.groupe && String(m.groupe) === String(vieux));
    if (parGroupe.length) return parGroupe;
    // Sinon c'est l'identifiant d'une marche, et d'une seule.
    const une = liste.find(m => m.id === String(vieux));
    return une ? [une] : liste;
}

/**
 * LES GROUPES DE LA LISTE, quand elle est assez longue pour en avoir besoin.
 *
 * @returns {Array<{cle:string, nom:string, marches:Array}>|null}
 *   `null` quand la liste se lit d'un coup — c'est-à-dire la plupart du temps.
 */
export function groupesDeMarches(toutes, noms = {}) {
    const liste = normaliserMarches(toutes);
    if (liste.length <= SANS_GROUPE_MAX) return null;
    if (!liste.every(m => m.groupe)) return null;
    const ordre = [];
    const par = new Map();
    liste.forEach(m => {
        const k = String(m.groupe);
        if (!par.has(k)) { par.set(k, []); ordre.push(k); }
        par.get(k).push(m);
    });
    // UN SEUL GROUPE N'EN EST PAS UN : il ajouterait un pli et un clic pour
    // exactement la même liste.
    if (ordre.length < 2) return null;
    return ordre.map(k => ({ cle: k, nom: noms[k] || k, marches: par.get(k) }));
}

/**
 * LE PARTAGE — combien de questions sur chacune des marches cochées.
 *
 * PAR DÉFAUT, À PARTS ÉGALES, et le reste va aux DERNIÈRES, une question de
 * plus chacune : dix questions sur six marches donnent 1, 1, 2, 2, 2, 2.
 *
 * `core/pythagore.js` posait déjà le partage, mais en donnant tout le reste à
 * la seule dernière marche — dix questions sur six marches y faisaient
 * 1, 1, 1, 1, 1, 5, soit la moitié de l'exercice sur une marche. La direction
 * est bonne (la dernière marche est le SUJET du chapitre, les précédentes le
 * préparent), le dosage ne l'était pas.
 *
 * ET LE PROFESSEUR PEUT ÉCRIRE LE SIEN. `params.repartitionMarches` porte alors les
 * longueurs séparées par des virgules — « 2,2,5,1 » —, dans l'ordre des marches
 * cochées. C'est ce que la barre écrit quand on tire une borne. La liste est
 * normalisée sur le total et sur le nombre de marches : ni l'un ni l'autre
 * n'est saisi ici, et tous deux peuvent changer après.
 *
 * @returns {Array<{id:string, nom:string, groupe:?string, n:number, de:number, a:number}>}
 *   `de` et `a` sont des rangs de questions à partir de 1, bornes comprises.
 *   Une marche qui n'a AUCUNE question garde sa place avec `n: 0` : la barre la
 *   montre en creux, et c'est l'information qui manque le plus au professeur.
 */
export function decoupeMarches(marches, total, params) {
    const liste = normaliserMarches(marches);
    const n = Math.max(1, Math.round(Number(total)) || 1);
    if (!liste.length) return [];
    const parts = lireLongueurs((params || {}).repartitionMarches, liste.length, n)
        || partageEgal(liste.length, n);

    let rang = 1;
    return liste.map((m, k) => {
        const p = parts[k] || 0;
        const de = rang;
        rang += p;
        return { ...m, n: p, de, a: rang - 1 };
    });
}

/** Le partage à parts égales, le reste aux dernières. */
export function partageEgal(nbMarches, total) {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    const n = Math.max(1, Math.round(Number(total)) || 1);
    const base = Math.floor(n / m);
    if (base < 1) {
        // MOINS DE QUESTIONS QUE DE MARCHES : une chacune tant qu'il y en a, et
        // zéro ensuite. On ne triche pas — la barre montrera les creux, et
        // c'est ce qui dit au professeur qu'il faut rallonger ou décocher.
        return Array.from({ length: m }, (_, k) => (k < n ? 1 : 0));
    }
    const reste = n - base * m;
    return Array.from({ length: m }, (_, k) => base + (k >= m - reste ? 1 : 0));
}

/** Les longueurs telles qu'on les écrit dans les réglages : « 2,2,5,1 ». */
export const ecrireLongueurs = (zones) =>
    (zones || []).map(z => Math.max(0, Math.round(z.n || 0))).join(',');

/**
 * Les longueurs écrites, ramenées sur le nombre de marches ET sur le total.
 *
 * LES DEUX PEUVENT AVOIR CHANGÉ DEPUIS. On coche une marche de plus, on
 * raccourcit l'exercice : une répartition écrite hier ne peut pas être crue sur
 * parole. On la coupe, on la complète, et LA DERNIÈRE MARCHE ABSORBE L'ÉCART —
 * c'est la règle qui rend la somme infaillible sans jamais la faire saisir,
 * celle de `normaliserZones` dans core/aide.js.
 *
 * @returns {number[]|null} `null` quand rien n'est écrit.
 */
export function lireLongueurs(brut, nbMarches, total) {
    if (brut === undefined || brut === null || brut === '' || brut === 'auto') return null;
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    const n = Math.max(1, Math.round(Number(total)) || 1);
    const lus = String(brut).split(',')
        .map(v => Math.max(0, Math.round(Number(v)) || 0));
    if (!lus.length) return null;

    const parts = [];
    let pris = 0;
    for (let k = 0; k < m; k++) {
        const veut = k < lus.length ? lus[k] : 0;
        const part = Math.max(0, Math.min(veut, n - pris));
        parts.push(part);
        pris += part;
    }
    parts[m - 1] += n - pris;
    // Le rattrapage peut rendre la dernière négative si l'écrit dépassait le
    // total : on la remonte à zéro et l'on reprend sur celles d'avant.
    for (let k = m - 1; k > 0 && parts[k] < 0; k--) {
        parts[k - 1] += parts[k];
        parts[k] = 0;
    }
    parts[0] = Math.max(0, parts[0]);
    return parts;
}

/**
 * TIRER UNE BORNE : on déplace des questions d'une marche à sa voisine, SANS
 * TOUCHER AU TOTAL.
 *
 * C'est la propriété qui compte, et c'est celle de la frise du QCM : le nombre
 * de questions se règle ailleurs, et lui seul ; une borne ne doit jamais
 * pouvoir rallonger ni raccourcir l'exercice.
 *
 * UNE MARCHE PEUT TOMBER À ZÉRO, contrairement aux zones de l'aide. Là-bas, une
 * zone vide disparaîtrait en silence et emporterait son réglage ; ici la marche
 * reste cochée, elle reste dans la barre, en creux — et on la remplit en
 * tirant la borne dans l'autre sens. C'est réversible, donc c'est permis.
 *
 * @param {number[]} parts  les longueurs actuelles
 * @param {number} k        la borne : celle qui suit la marche `k`
 * @param {number} coupe    le rang de question où l'on pose la borne
 */
export function poserBorne(parts, k, coupe) {
    const out = [...(parts || [])];
    if (k < 0 || k + 1 >= out.length) return out;
    let avant = 0;
    for (let j = 0; j < k; j++) avant += out[j];
    const bloc = out[k] + out[k + 1];
    const pris = Math.max(0, Math.min(bloc, Math.round(coupe) - avant));
    out[k] = pris;
    out[k + 1] = bloc - pris;
    return out;
}

/**
 * LA MARCHE DE LA QUESTION NUMÉRO `index`.
 *
 * @returns {string|null} l'identifiant de la marche, ou `null` si la liste est
 *   vide — un cas que l'appelant doit traiter, pas taire.
 */
export function marcheAuRang(index, marches, total, params, historique = PAR_MARCHE_DEFAUT) {
    const liste = normaliserMarches(marches);
    if (!liste.length) return null;
    const i = Math.max(0, Math.round(Number(index)) || 0);

    // SANS LE TOTAL, ON NE PEUT PAS PARTAGER — et il faut le dire par un
    // comportement sûr plutôt que par une division par zéro. On retombe sur le
    // compte que ce générateur-là posait avant qu'il y ait un réglage : le pire
    // qui puisse arriver est que rien ne change. C'est le cas d'une vignette de
    // catalogue ou d'un aperçu papier, où la longueur n'existe pas encore.
    if (!(Number(total) > 0)) {
        const par = Math.max(1, Math.round(Number(historique)) || PAR_MARCHE_DEFAUT);
        return liste[Math.min(liste.length - 1, Math.floor(i / par))].id;
    }

    const coupe = decoupeMarches(liste, total, params);
    const rang = i + 1;
    for (const z of coupe) if (z.n > 0 && rang <= z.a) return z.id;
    // Passé la fin — l'exercice a duré plus longtemps que prévu —, on reste sur
    // la dernière marche qui a des questions. C'est le sujet du chapitre.
    const pleines = coupe.filter(z => z.n > 0);
    return (pleines[pleines.length - 1] || coupe[coupe.length - 1]).id;
}

/**
 * COMBIEN DE QUESTIONS ON PROPOSE À L'OUVERTURE — et rien de plus.
 *
 * Rémy : « avoir un nombre de questions que ça change le nombre de questions ».
 * Le premier essai le faisait bouger à chaque geste ; il ne bouge plus. Ce
 * compte-ci sert UNE fois, quand le panneau s'ouvre sur les réglages du
 * catalogue, pour ne pas proposer dix questions à une progression de treize
 * marches — c'est le défaut que `core/duree.js` a été écrit pour tuer.
 */
export function conseilProgression(nbMarches, historique = PAR_MARCHE_DEFAUT) {
    const m = Math.max(1, Math.round(Number(nbMarches)) || 1);
    return m * Math.max(1, Math.round(Number(historique)) || PAR_MARCHE_DEFAUT);
}

/**
 * LE RÉGLAGE, tel qu'il apparaît dans le panneau.
 *
 * `type: 'marches'` : le panneau lui dessine une liste à cocher, pliée en
 * groupes au-delà de huit, et la barre juste en dessous.
 *
 * @param {Object} opts
 * @param {Array}  opts.marches   la liste du générateur
 * @param {Object} [opts.groupes] les noms des groupes, par clé : { A: '…' }
 * @param {string} [opts.mot]     « marche », « étape », « niveau », « palier »…
 */
// L'ACCORD, PARCE QUE LE MOT CHANGE D'UN EXERCICE À L'AUTRE. Une marche et une
// étape sont féminines, un palier et un niveau masculins : écrire
// « Les paliers travaillées » dans un logiciel de français... de maths, mais
// lu par des élèves de sixième, ne se fait pas. Quatre mots suffisent — on ne
// devine pas le genre, on le déclare.
const FEMININS = new Set(['marche', 'étape']);
const feminin = (mot) => FEMININS.has(String(mot || '').toLowerCase());

export function paramMarches({ marches = [], groupes = {}, mot = 'marche', ancien = {} } = {}) {
    const liste = normaliserMarches(marches);
    const f = feminin(mot);
    return {
        id: 'marches', type: 'marches', label: `Les ${mot}s travaillé${f ? 'es' : 's'}`,
        default: liste.map(m => m.id),
        marches: liste,
        groupes,
        mot,
        // Comment traduire un réglage enregistré avant les cases — voir
        // `marchesCochees`. Le panneau en a besoin autant que le générateur :
        // sans cela, rouvrir un parcours d'hier montrerait tout coché alors que
        // l'exercice, lui, ne jouerait qu'un temps.
        ancien,
        aide: `Coche ce que la classe travaille aujourd’hui — tout, un temps entier, `
            + `ou ${f ? 'une' : 'un'} ${mot} seul${f ? 'e' : ''}. Le nombre de questions se règle à part : `
            + `ce sont les ${mot}s coché${f ? 'e' : ''}s qui se le partagent, et la barre montre comment. `
            + `Tire une borne pour donner plus de questions à l’une qu’à l’autre.`
    };
}

/**
 * L'APERÇU EN UNE PHRASE — « 10 questions pour 7 marches : de 1 à 2 chacune ».
 *
 * Il prend un DÉCOUPAGE, pas des marches et un total. La barre du panneau a le
 * sien sous la main — c'est lui qu'elle dessine — et le lui faire recalculer
 * perdait le partage : elle montrait « 2 · — · 1 · 1 · 2 · 2 · 2 » et la
 * phrase dessous annonçait « de 1 à 2 questions chacune », en oubliant la
 * marche qu'on venait de vider d'un coup de borne.
 */
export function motsDeCoupe(coupe, mot = 'marche') {
    if (!coupe || !coupe.length) return '';
    const n = coupe.reduce((s, z) => s + z.n, 0);
    const pleines = coupe.filter(z => z.n > 0);
    const tailles = [...new Set(pleines.map(z => z.n))];
    const combien = tailles.length === 1
        ? `${tailles[0]} question${tailles[0] > 1 ? 's' : ''} chacune`
        : `de ${Math.min(...tailles)} à ${Math.max(...tailles)} questions chacune`;
    if (pleines.length < coupe.length) {
        return `${n} questions : ${pleines.length} ${mot}s sur ${coupe.length}, ${combien}. `
            + `Les autres n’auront aucune question.`;
    }
    return `${n} questions pour ${coupe.length} ${mot}s : ${combien}.`;
}

/**
 * LE TOTAL, TEL QUE LE GÉNÉRATEUR PEUT LE CONNAÎTRE.
 *
 * `ctx.total` vient de la session, qui le tient de l'étape. Il manque dans deux
 * cas — une vignette de catalogue, un aperçu papier —, et les réglages portent
 * alors souvent `nbQuestions`, posé par le panneau. Zéro veut dire « on ne sait
 * pas », et `marcheAuRang` retombe alors sur le compte historique.
 */
export function totalDe(ctx, params) {
    const a = Number((ctx || {}).total);
    if (Number.isFinite(a) && a > 0) return Math.round(a);
    const b = Number((params || {}).nbQuestions);
    return Number.isFinite(b) && b > 0 ? Math.round(b) : 0;
}
