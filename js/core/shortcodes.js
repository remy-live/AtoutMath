// Codes de partage de parcours.
//
// L'ancien format encodait le jeu sur 2 lettres via une table écrite à la
// main (8 jeux sur 15 y figuraient ; les autres devenaient « XX » et
// disparaissaient silencieusement), le nombre de questions sur 1 lettre, et
// les tables en lettres. Impossible de coder une politique, un barème, un
// paramètre non numérique.
//
// La table écrite à la main est revenue depuis, mais pour une autre raison et
// sans le défaut : elle ne sert plus qu'au CODE COURT (voir plus bas), elle
// couvre tout le catalogue, et un test échoue si un exercice y manque. Rien
// ne peut plus disparaître en silence.
//
// Format v2 : le parcours est sérialisé en JSON compact puis encodé en
// base64url. Rien à maintenir quand on ajoute un exercice, et un parcours
// complet (politique + barème + surcharges) tient dans un lien.
//
// Un code v2 commence par « M2- ». Les codes du tout premier format, eux, ne se
// lisent plus : ils rendaient fausse la garantie des lettres de contrôle (voir
// la note plus bas, avant l'API).

import { normalizePath, makePath, questionsConseilleesDe } from './path.js';
import { getExerciseById, paramSchemaOf } from '../data/catalog.js';
import { defaultPolicy, resolvePolicy, apprentissagePolicy, evaluationPolicy, MODES } from './policy.js';
import { SEUIL_DEFAUT } from './recompenses.js';
import { seuilConseille } from './seuilEtape.js';
import { CODES_EXERCICES, EXERCICE_PAR_IDENTITE } from '../data/codesExercices.js';
import { valeurDUsine, memeReglage } from './reglagesDUsine.js';

const PREFIX = 'M2-';

/**
 * LE CODE COURT — TROIS LETTRES, pour l'usage le plus fréquent.
 *
 * « Fais l'exercice sur les relatifs ce soir » n'a pas besoin d'un parcours :
 * c'est UN exercice, avec ses réglages d'usine. Le format complet coûtait
 * pourtant 81 caractères de base64 — à recopier sur un téléphone, en devoirs,
 * c'est une faute de frappe garantie et un élève qui abandonne.
 *
 * DEUX LETTRES D'IDENTITÉ, UNE LETTRE DE CONTRÔLE. Rémy : « pourquoi pas 2
 * caractères, ça FAIT 26*26 possibilités de jeu ». C'est vrai : 23 lettres au
 * carré font 529 places, largement de quoi loger les 139 exercices. Mais on a
 * mesuré ce que deux lettres SEULES coûtaient, sur cette table-ci : sur les
 * 6 116 façons de se tromper d'une lettre, 2 440 tombent sur un AUTRE exercice
 * du catalogue. Deux fois sur cinq. Il s'ouvre sans un mot, l'élève travaille
 * sagement la mauvaise chose, et personne ne le sait. (C'est même pire que le
 * hasard, justement parce que les codes sont mnémoniques : les exercices d'une
 * même famille se ressemblent, donc leurs codes se touchent.)
 *
 * On aurait pu allonger l'identité — plus de places, moins de voisins occupés.
 * Mais rallonger ne fait que RARÉFIER la faute silencieuse, jamais disparaître.
 * La troisième lettre, elle, ne porte aucune information : elle vérifie les
 * deux autres, et ramène le risque à zéro. Une lettre de plus, et c'est une
 * garantie au lieu d'une probabilité.
 *
 * CE QU'ELLE GARANTIT, exactement — et c'est démontrable, pas empirique :
 *   • toute faute d'UNE lettre, à n'importe laquelle des trois places, est
 *     rejetée (message d'erreur, jamais un mauvais exercice) ;
 *   • l'inversion des deux lettres d'identité est rejetée aussi.
 * CE QU'ELLE NE GARANTIT PAS, et il faut le dire : les CHIFFRES du nombre de
 * questions ne sont pas protégés. « ARF-12 » mal recopié en « ARF-13 » donne
 * treize questions au lieu de douze. C'est délibéré : l'exercice reste le bon,
 * la faute est visible et sans gravité, et protéger le nombre coûterait une
 * lettre de plus à dicter pour un risque qui ne fait pas travailler à côté.
 * La démonstration tient à deux choses : l'alphabet compte 23 lettres, et 23
 * est PREMIER. Le contrôle vaut (1×première + 2×deuxième) modulo 23 ; changer
 * une lettre de d ≠ 0 change le contrôle de d ou de 2d, et ni l'un ni l'autre
 * n'est nul modulo un nombre premier. Inverser les deux le change de
 * (première − deuxième), nul seulement si les lettres étaient identiques —
 * auquel cas il n'y a rien à inverser.
 *
 * L'alphabet écarte I, O et Q : recopiés à la main ils deviennent 1, 0 et O.
 * Il ne contient AUCUN chiffre, et c'est utile deux fois — plus aucune
 * confusion possible entre une lettre et un chiffre, et le nombre de questions
 * écrit à la suite se sépare tout seul du code.
 */
const ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ';   // 23 lettres — 23 est premier
const LONGUEUR_IDENTITE = 2;
const LONGUEUR_COURT = LONGUEUR_IDENTITE + 1;

/** La lettre qui vérifie les deux autres : (1×a + 2×b) modulo 23. */
function lettreDeControle(identite) {
    let somme = 0;
    for (let i = 0; i < identite.length; i++) {
        const rang = ALPHABET.indexOf(identite[i]);
        if (rang < 0) return null;
        somme += (i + 1) * rang;
    }
    return ALPHABET[somme % ALPHABET.length];
}

/**
 * @returns {string} les trois lettres de l'exercice, ou '' s'il n'a pas encore
 * d'identité dans la table. Le vide n'est pas une panne : l'appelant retombe
 * alors sur le format complet, qui sait tout coder.
 */
export function codeCourt(exerciseId) {
    const identite = CODES_EXERCICES[exerciseId];
    if (!identite) return '';
    const controle = lettreDeControle(identite);
    return controle ? identite + controle : '';
}

// --- LES RÉGLAGES DICTÉS -----------------------------------------------------

/**
 * ÉCRIRE LES RÉGLAGES EN LETTRES — l'idée est de Rémy, mot pour mot.
 *
 * « les réglages ont un ordre, si par exemple, je veux 8 questions, on pourrait
 * avoir ATYA où A correspond à 1 question, B à 2 »
 *
 * CE QUE ÇA COÛTAIT AVANT, MESURÉ. Un seul exercice pris tel quel se dicte en
 * quinze caractères. Le même avec UN réglage modifié — « seulement les tables
 * de 7 » — basculait sur le format complet : 186 caractères, alors que le
 * réglage lui-même ne pèse que 18 caractères de JSON. On payait 171 caractères
 * pour transporter le reste du parcours en base64, et le code cessait d'être
 * dictable. Rémy : « C'est fou qu'un réglage soit si long, comment ça se fait ? »
 *
 * LA FORME, ET POURQUOI ELLE EST AINSI :
 *
 *     LCR - 08 - 00 - CABK
 *     │     │    │     │└─ la lettre de contrôle des réglages
 *     │     │    │     └── une lettre (ou deux, ou trois) par réglage, DANS
 *     │     │    │         L'ORDRE DE LA FICHE
 *     │     │    └──────── la marque « des réglages suivent »
 *     │     └───────────── huit questions, toujours sur DEUX chiffres
 *     └─────────────────── l'exercice, comme avant
 *
 * TOUS LES RÉGLAGES, PAS SEULEMENT CELUI QUI CHANGE. Rémy a tranché : « le
 * problème si un seul réglage change c'est que c'est lequel ». N'écrire que le
 * réglage modifié obligerait à dire LEQUEL — donc à ajouter une lettre pour le
 * désigner, ce qui coûte exactement ce qu'on croyait économiser. En les
 * écrivant tous, la longueur ne dépend plus que de l'exercice : elle est la
 * même à chaque fois, et un code trop court ou trop long se voit à l'œil.
 *
 * POURQUOI « 00 » PEUT SERVIR DE MARQUE : un nombre de questions vaut toujours
 * entre 1 et 99, jamais 00. La place est donc libre, et elle ne l'est que là.
 * (J'avais d'abord proposé « 0 » tout seul. Le découpeur m'a contredit :
 * « LCR-8-0C » nettoyé donne « LCR80C », et les chiffres se prennent deux par
 * deux — ça se lit « 80 questions ». C'est pour la même raison que le nombre
 * s'écrit désormais sur deux chiffres dès qu'il y a des réglages.)
 *
 * LA LETTRE DE CONTRÔLE COÛTE UN CARACTÈRE ET ÉVITE DEUX SILENCES.
 *
 *   · UNE LETTRE MAL RECOPIÉE. Le code dicté est refusé, toujours : la somme
 *     est pondérée par la position et prise modulo 23, qui est premier, donc
 *     changer la i-ième lettre de d ≠ 0 change le contrôle de (i+1)·d, qui
 *     n'est jamais nul tant que i+1 < 23 — et le plus gros exercice du
 *     catalogue n'a que 7 lettres de réglages. Sans elle, l'élève travaillerait
 *     sur les tables de 8 au lieu des 7, sans que rien ne le dise. C'est
 *     exactement le silence que la troisième lettre de l'identité supprime,
 *     et il n'y a pas de raison de l'accepter ici.
 *   · UN SCHÉMA QUI A CHANGÉ. Le jour où j'insère une option au milieu d'une
 *     liste, les rangs se décalent : un code dicté la veille désignerait un
 *     AUTRE réglage. L'empreinte du schéma entre dans la somme, donc le code est
 *     refusé. Deux garde-fous se relaient : d'abord la LONGUEUR, vérifiée avant
 *     tout, ensuite le contrôle.
 *
 * CE QUE ÇA DONNE, MESURÉ, PAS ESTIMÉ. On essaie TOUTES les fautes d'une lettre
 * sur les codes du catalogue — 12 760 fautes sur 147 codes : 12 760 refusées,
 * aucune acceptée. Puis on modifie vraiment les schémas :
 *
 *     une option ajoutée EN FIN de liste   132 refusés · 3 acceptés, même sens
 *     une option insérée EN TÊTE de liste  126 refusés · 9 acceptés, AUTRE sens
 *
 * Ajouter en fin est sans danger (les rangs déjà écrits ne bougent pas) et le
 * code est tout de même refusé : c'est le prix, et il est du bon côté. Insérer
 * en tête est le cas dangereux, et 9 codes sur 135 passent encore — un sur
 * quinze, contre un sur vingt-trois en théorie. Ce n'est pas zéro, et je préfère
 * l'écrire que le taire : une lettre ne peut pas porter plus de 23 valeurs.
 * (Si cela devient gênant, la marque « 00 » peut porter l'empreinte sur deux
 * chiffres au lieu d'être constante — même longueur, cent fois moins de
 * passages. C'est un choix qui appartient à Rémy : « 00 » se dicte et
 * s'explique, un nombre qui change ne veut rien dire pour lui.)
 *
 * CE QUI NE S'ÉCRIT PAS EN LETTRES : un réglage sans ensemble fini de valeurs
 * (58 au catalogue — les champs libres « repartition », les réglages
 * « marches », trois durées sans bornes), un réglage dont la valeur choisie
 * n'est pas dans sa propre liste, et tout exercice dont les réglages
 * demanderaient plus de dix lettres. Les premiers ne condamnent pas l'exercice :
 * ils sortent du code, et écrire un code affirme qu'ils sont d'usine.
 */
const MARQUE_REGLAGES = '00';

/**
 * LA LONGUEUR QU'ON S'AUTORISE À DICTER, réglages seuls, contrôle non compris.
 *
 * Mesuré sur les 172 exercices : 31 tiennent en 1 lettre, 45 en 2, 39 en 3,
 * 27 en 4, 16 en 5, 5 en 6, 2 en 7, et un seul en 8 — Sprint Chrono. Six
 * exercices n'ont aucun réglage dictable ; les 166 autres en ont.
 *
 * Dix, donc : deux lettres de marge au-dessus du plus fourni d'aujourd'hui,
 * pour qu'un réglage ajouté demain ne fasse pas disparaître le code d'un
 * exercice sans prévenir — et une borne franche pour celui qui deviendrait
 * déraisonnable. Dix lettres font un code de dix-huit caractères ; le format
 * complet en demandait cent quatre-vingt-six.
 */
const LETTRES_MAX_REGLAGES = 10;

/** Les options s'écrivent `{value, label}`, ou nues quand elles se suffisent. */
const valeurOption = (o) => (o && typeof o === 'object') ? o.value : o;

/**
 * DE QUOI CE RÉGLAGE EST-IL FAIT ? — ou `null` s'il ne se compte pas.
 *
 * On ne devine pas d'après le type déclaré : un `select` sans options ne vaut
 * rien, et un `number` sans bornes non plus. C'est la présence d'un ENSEMBLE
 * FINI ET ORDONNÉ de valeurs qui décide, parce que c'est cela, et rien d'autre,
 * qu'on sait numéroter.
 */
function formeDuReglage(p) {
    if (!p || !p.id) return null;
    if (p.type === 'multiselect') {
        const options = Array.isArray(p.options) ? p.options : [];
        // Au-delà de trente cases, le masque déborderait l'entier 32 bits de
        // JavaScript — et 2³⁰ combinaisons demandent déjà sept lettres.
        if (!options.length || options.length > 30) return null;
        return { genre: 'multi', options, combien: Math.pow(2, options.length) };
    }
    if (Array.isArray(p.options) && p.options.length) {
        return { genre: 'liste', options: p.options, combien: p.options.length };
    }
    if (p.type === 'checkbox' || p.type === 'bool' || p.type === 'boolean') {
        return { genre: 'ouiNon', combien: 2 };
    }
    if (Number.isFinite(p.min) && Number.isFinite(p.max)) {
        const pas = Number(p.step) || 1;
        const combien = Math.floor((p.max - p.min) / pas) + 1;
        return combien >= 1 ? { genre: 'nombre', min: p.min, pas, combien } : null;
    }
    return null;
}

/** Combien de lettres pour numéroter `combien` valeurs, en base 23. */
function largeurPour(combien) {
    let largeur = 1, capacite = ALPHABET.length;
    while (capacite < combien) { capacite *= ALPHABET.length; largeur++; }
    return largeur;
}

/** Le rang écrit en lettres, largeur fixe, la plus forte d'abord. */
function enLettres(index, largeur) {
    let mot = '';
    for (let i = 0; i < largeur; i++) {
        mot = ALPHABET[index % ALPHABET.length] + mot;
        index = Math.floor(index / ALPHABET.length);
    }
    return mot;
}

/** Le rang relu, ou `null` si une lettre n'est pas de l'alphabet. */
function indexDesLettres(mot) {
    let index = 0;
    for (const lettre of mot) {
        const rang = ALPHABET.indexOf(lettre);
        if (rang < 0) return null;
        index = index * ALPHABET.length + rang;
    }
    return index;
}

/**
 * LA VALEUR CHOISIE, RAMENÉE À SON RANG — ou `null` si elle n'en a pas.
 *
 * La comparaison se fait sur le TEXTE, comme partout ailleurs : le DOM ne rend
 * que des chaînes, et le « 7 » relu dans un menu doit retrouver le 7 du
 * catalogue. Une valeur qui n'est dans aucune option rend `null` — on ne
 * bricole pas un rang approximatif, on repasse au format complet.
 */
function indexDeValeur(forme, valeur) {
    const rangDansLesOptions = (v) =>
        forme.options.findIndex(o => String(valeurOption(o)) === String(v));
    switch (forme.genre) {
        case 'multi': {
            const choisies = Array.isArray(valeur) ? valeur
                : (valeur === undefined || valeur === null || valeur === '') ? [] : [valeur];
            let masque = 0;
            for (const choix of choisies) {
                const k = rangDansLesOptions(choix);
                if (k < 0) return null;
                masque |= (1 << k);
            }
            return masque;
        }
        case 'liste': {
            const k = rangDansLesOptions(valeur);
            return k < 0 ? null : k;
        }
        case 'ouiNon': {
            const t = String(valeur);
            if (valeur === true || t === 'true' || t === '1') return 1;
            if (valeur === false || t === 'false' || t === '0'
                || valeur === undefined || valeur === null) return 0;
            return null;
        }
        case 'nombre': {
            const n = Number(valeur);
            if (!Number.isFinite(n)) return null;
            const k = (n - forme.min) / forme.pas;
            return (Number.isInteger(k) && k >= 0 && k < forme.combien) ? k : null;
        }
        default:
            return null;
    }
}

/** Le rang rendu à sa valeur — celle du catalogue, avec son type d'origine. */
function valeurDIndex(forme, index) {
    switch (forme.genre) {
        case 'multi':
            return forme.options.filter((o, k) => (index >> k) & 1).map(valeurOption);
        case 'liste':
            return valeurOption(forme.options[index]);
        case 'ouiNon':
            return index === 1;
        case 'nombre':
            return forme.min + index * forme.pas;
        default:
            return undefined;
    }
}

/** FNV-1a sur 32 bits : court, sans dépendance, stable d'un moteur à l'autre. */
function empreinte32(texte) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texte.length; i++) {
        h ^= texte.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
}

const SCHEMAS_DICTES = new Map();

/**
 * LE SCHÉMA D'UN EXERCICE, PRÊT À DICTER — ou `null` s'il ne s'y prête pas.
 *
 * @returns {{pieces: Array, largeur: number, empreinte: number}|null}
 */
function schemaDicte(exo) {
    if (!exo || !exo.id) return null;
    if (SCHEMAS_DICTES.has(exo.id)) return SCHEMAS_DICTES.get(exo.id);
    const retenir = (v) => { SCHEMAS_DICTES.set(exo.id, v); return v; };

    const schema = (paramSchemaOf(exo) || []).filter(p => p && p.id);
    if (!schema.length) return retenir(null);

    // UN RÉGLAGE QUI NE S'ÉCRIT PAS NE CONDAMNE PAS L'EXERCICE — il doit
    // seulement être resté d'usine.
    //
    // Mesuré : 58 réglages du catalogue n'ont pas d'ensemble fini de valeurs —
    // les champs libres « repartition », les réglages « marches », trois durées
    // sans bornes. Les refuser en bloc coûtait leur code court à 49 exercices
    // sur 170, alors que la plupart de ces champs ne sont JAMAIS touchés. On les
    // met donc hors du code : les lettres ne parlent que des réglages
    // numérotables, et écrire un code affirme que les autres sont d'usine. Si
    // le professeur en touche un, on repasse au format complet, qui les porte.
    const pieces = [];
    const horsCode = [];
    let largeur = 0;
    for (const p of schema) {
        const forme = formeDuReglage(p);
        if (!forme) { horsCode.push(p.id); continue; }
        const l = largeurPour(forme.combien);
        pieces.push({ p, forme, largeur: l });
        largeur += l;
    }
    if (!pieces.length || largeur > LETTRES_MAX_REGLAGES) return retenir(null);

    // L'EMPREINTE PORTE LA FORME, PAS LES MOTS. Les libellés peuvent être
    // réécrits sans conséquence — ils ne décalent aucun rang. Les VALEURS et
    // leur ordre, si : elles sont dans l'empreinte, et les toucher invalide les
    // codes déjà dictés, ce qui est précisément le but. Les réglages hors du
    // code n'y sont pas : ils ne peuvent pas changer le sens d'une lettre, et
    // les inclure ferait refuser des codes parfaitement bons.
    const forme = pieces.map(({ p }) => [
        p.id, p.type || '',
        Array.isArray(p.options) ? p.options.map(valeurOption) : null,
        Number.isFinite(p.min) ? p.min : null,
        Number.isFinite(p.max) ? p.max : null,
        Number.isFinite(Number(p.step)) ? Number(p.step) : null
    ]);
    return retenir({ pieces, horsCode, largeur, empreinte: empreinte32(JSON.stringify(forme)) });
}

/** La lettre qui vérifie les réglages ET le schéma dont ils viennent. */
function controleDesReglages(empreinte, lettres) {
    let somme = empreinte % ALPHABET.length;
    for (let i = 0; i < lettres.length; i++) {
        const rang = ALPHABET.indexOf(lettres[i]);
        if (rang < 0) return null;
        somme += (i + 1) * rang;
    }
    return ALPHABET[somme % ALPHABET.length];
}

/**
 * LES RÉGLAGES DE CETTE ÉTAPE, EN LETTRES — contrôle compris, ou `null`.
 *
 * On écrit TOUS les réglages du schéma, y compris ceux qu'on n'a pas touchés :
 * leur valeur d'usine a un rang comme les autres. C'est ce qui donne au code sa
 * longueur fixe.
 */
function lettresDeReglages(exo, overrides) {
    const dicte = schemaDicte(exo);
    if (!dicte) return null;
    // TOUTE CLÉ QUI N'EST PAS UNE LETTRE DU CODE FAIT ÉCHOUER LE CODE, et la
    // taire la perdrait en route : un champ libre, un réglage posé marche par
    // marche, une dispense d'élève, une clé hors schéma. Le format complet, lui,
    // les porte toutes.
    const connus = new Set(dicte.pieces.map(x => x.p.id));
    for (const cle of Object.keys(overrides || {})) if (!connus.has(cle)) return null;

    let lettres = '';
    for (const { p, forme, largeur } of dicte.pieces) {
        const valeur = (overrides && overrides[p.id] !== undefined)
            ? overrides[p.id] : valeurDUsine(exo, p);
        const index = indexDeValeur(forme, valeur);
        if (index === null || index >= forme.combien) return null;
        lettres += enLettres(index, largeur);
    }
    const controle = controleDesReglages(dicte.empreinte, lettres);
    return controle ? lettres + controle : null;
}

/**
 * LES LETTRES RENDUES À DES RÉGLAGES — ou `null` si le mot ne convient pas.
 *
 * ON NE REND QUE LES ÉCARTS. C'est une exigence, pas une économie : l'identité
 * d'un parcours se calcule sur son contenu (`identiteDeParcours`), surcharges
 * comprises. Si le code relu posait les dix réglages d'un exercice là où le
 * professeur n'en avait changé qu'un, les deux parcours ne porteraient pas le
 * même nom — le panneau « À qui ce parcours est donné » ne cocherait jamais, et
 * l'élève qui retape son code demain repartirait de l'étape 1.
 */
function reglagesDesLettres(exo, mot) {
    const dicte = schemaDicte(exo);
    if (!dicte) return null;
    if (mot.length !== dicte.largeur + 1) return null;
    const lettres = mot.slice(0, dicte.largeur);
    if (controleDesReglages(dicte.empreinte, lettres) !== mot[dicte.largeur]) return null;

    const out = {};
    let i = 0;
    for (const { p, forme, largeur } of dicte.pieces) {
        const index = indexDesLettres(lettres.slice(i, i + largeur));
        i += largeur;
        if (index === null || index >= forme.combien) return null;
        const valeur = valeurDIndex(forme, index);
        if (!memeReglage(valeur, valeurDUsine(exo, p))) out[p.id] = valeur;
    }
    return out;
}

/** Combien de lettres de réglages cet exercice demande, contrôle compris. */
export function largeurDesReglagesDictes(exerciseId) {
    const dicte = schemaDicte(getExerciseById(exerciseId));
    return dicte ? dicte.largeur + 1 : 0;
}

/**
 * LE NOMBRE DE QUESTIONS ÉCRIT APRÈS LE CODE, en clair : « TPW-12 ».
 *
 * En clair, et non encodé : c'est justement ce que le professeur veut pouvoir
 * dicter et l'élève relire. Deux chiffres au plus — au-delà de quatre-vingt
 * dix-neuf questions, ce n'est plus un devoir du soir.
 *
 * ET LE SÉPARATEUR NE COMPTE PAS. Un code écrit au tableau se recopie comme on
 * l'entend : « TPW-12 », « tpw 12 », « TPW12 », un tiret long parce que le
 * traitement de texte l'a changé. On ne lit donc pas un séparateur : le code
 * n'a que des lettres, le nombre n'a que des chiffres, la coupure est là où
 * les unes cèdent la place aux autres. Tout le reste tombe au nettoyage.
 *
 * ET PLUSIEURS EXERCICES S'ÉCRIVENT À LA SUITE : « ARF-12-TPW-20 ». Rémy :
 * « pourquoi du coup les liens sont si grands lorsqu'on met par exemple deux
 * exercices ? » Parce que le format complet transportait le NOM DE FICHIER de
 * chaque exercice en toutes lettres — « num-relatifs-addition », vingt-et-un
 * caractères, puis un tiers de plus une fois passé en base64. Deux exercices
 * coûtaient 161 caractères. Depuis que chaque exercice a ses deux lettres, il
 * n'y a plus de raison : on enchaîne les codes courts, et les mêmes 161
 * caractères en font 13.
 *
 * La lecture reste sans ambiguïté SANS séparateur, et c'est ce qui permet au
 * nettoyage de tout jeter : trois lettres, puis les chiffres, puis les lettres
 * de réglages s'il y en a, et on recommence. « ARF12TPW20 » se relit aussi bien
 * que « ARF-12 TPW-20 ».
 *
 * ET C'EST AUSSI LA RÉPONSE À RÉMY : « Mais pourquoi ne pas mettre LCR0800CAB ».
 * Rien ne l'empêche — c'est même exactement ce que la machine lit, puisque
 * `normaliserCourt` a déjà jeté les tirets. Ils ne sont là que pour l'œil qui
 * recopie et la voix qui dicte.
 *
 * QUATRE CHIFFRES AU PLUS, ET JAMAIS TROIS. Zéro, un ou deux : c'est le nombre
 * de questions, comme avant. Quatre : le nombre sur deux chiffres, puis la
 * marque « 00 » qui annonce des réglages. Trois ne veut rien dire et se refuse,
 * parce qu'on ne saurait pas où couper — « LCR800 » est-il quatre-vingts
 * questions et un zéro égaré, ou huit questions et une marque tronquée ?
 */
const MOTIF_ETAPE = /([A-Z]{3})([0-9]{0,4})/y;

function decouperChaine(code) {
    const brut = normaliserCourt(code);
    if (!brut) return null;
    const etapes = [];
    let i = 0;
    while (i < brut.length) {
        MOTIF_ETAPE.lastIndex = i;
        const m = MOTIF_ETAPE.exec(brut);
        if (!m || m.index !== i) return null;
        const identite = m[1].slice(0, LONGUEUR_IDENTITE);
        // Le contrôle d'abord : un code faux doit être refusé, pas interprété.
        if (m[1][LONGUEUR_IDENTITE] !== lettreDeControle(identite)) return null;
        const exerciseId = EXERCICE_PAR_IDENTITE.get(identite);
        if (!exerciseId) return null;
        const exo = getExerciseById(exerciseId);
        if (!exo) return null;
        i = MOTIF_ETAPE.lastIndex;

        const chiffres = m[2];
        if (chiffres.length === 3) return null;   // voir MOTIF_ETAPE
        const combien = chiffres.length === 4 ? chiffres.slice(0, 2) : chiffres;
        const n = combien ? Number(combien) : null;
        if (combien && !(n >= 1 && n <= 99)) return null;

        let overrides = null;
        if (chiffres.length === 4) {
            if (chiffres.slice(2) !== MARQUE_REGLAGES) return null;
            // LE CODE SE DÉLIMITE TOUT SEUL : c'est l'EXERCICE qui dit combien
            // de lettres de réglages le suivent. Rien à compter, rien à
            // séparer — et si l'exercice n'a pas de réglages dictables, le code
            // est refusé au lieu de manger les lettres du suivant.
            const dicte = schemaDicte(exo);
            if (!dicte) return null;
            overrides = reglagesDesLettres(exo, brut.slice(i, i + dicte.largeur + 1));
            if (!overrides) return null;
            i += dicte.largeur + 1;
        }
        etapes.push({ exerciseId, questions: n, overrides });
    }
    return etapes.length ? etapes : null;
}

/** Le découpage d'un code à UN seul exercice, ou null. */
function decouperCodeCourt(code) {
    const etapes = decouperChaine(code);
    return (etapes && etapes.length === 1) ? etapes[0] : null;
}

/**
 * Le code tel qu'on l'écrit au tableau : « TP-W » se lit, « tpw » aussi.
 *
 * On ne remplace plus rien ici. L'ancien code mélangeait lettres et chiffres et
 * devait deviner (« O » vaut-il zéro ?) ; celui-ci n'a que des lettres, et un
 * caractère qui n'est pas de l'alphabet fait simplement échouer le code — ce
 * qui est le bon comportement : mieux vaut « code inconnu » qu'un exercice pris
 * au hasard.
 */
export const normaliserCourt = (code) => String(code || '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Le nombre d'unités d'un exercice laissé « tel quel ».
 *
 * Ce n'est plus dix pour tout le monde : une grille de sudoku, une partie
 * d'échecs et une addition ne se comptent pas pareil. Le code court dit « cet
 * exercice, tel quel » — encore faut-il que « tel quel » veuille dire la même
 * chose à l'écriture et à la relecture.
 */
const telQuel = questionsConseilleesDe;

/**
 * Cette étape se réduit-elle à « cet exercice, tel quel » ?
 *
 * LE NOMBRE DE QUESTIONS NE DISQUALIFIE PLUS. Rémy : « pour envoyer un code
 * juste sur un exercice avec le nombre de questions, comment fait-on ?
 * L'idéal serait que le code soit hyper court. » Il n'y avait pas de moyen :
 * changer le compte faisait basculer sur le format complet — quatre-vingts
 * caractères de base64 pour la seule différence d'un nombre. On l'écrit donc
 * APRÈS le code, en clair : « TPW-12 », six caractères qu'on dicte encore.
 *
 * Le seuil suit la règle des 70 % comme partout ailleurs : il n'est pas dans
 * le code parce qu'il se recalcule. Encore faut-il que celui de l'étape SOIT
 * celui-là : sinon le code mentirait sur ce qu'il rend, et on repasse au
 * format complet.
 */
/**
 * CE QUI, DANS UNE ÉTAPE, EMPÊCHE LE CODE COURT — dit en français.
 *
 * Rémy : « pour le lien donné dans la partie prof, j'ai du mal à comprendre
 * quand est-ce que tu utilises le code court et le code long ». La règle
 * existait, elle n'était écrite nulle part où il puisse la lire : le bouton
 * disait « Lien copié » et se taisait. Une condition qui décide en silence est
 * une condition qu'on ne peut pas apprendre — donc chaque refus porte
 * désormais sa phrase, et l'écran la montre.
 *
 * @returns {string} la raison, ou '' si l'étape se dicte.
 */
function raisonEtape(s) {
    if (!s || !s.exerciseId) return 'cette étape n\'a pas d\'exercice';
    if ((s.weight || 1) !== 1) return 'elle a un coefficient';
    if (s.timeLimit) return 'elle est chronométrée';
    // Une étape-jeu, une étape sans total, une graine imposée : trois choses
    // que la chaîne ne sait pas dire. Les taire ferait d'un jeu de récompense
    // un exercice ordinaire — c'est le format complet qui doit prendre.
    if (s.bonus) return 'c\'est un jeu de récompense';
    // NON OBLIGATOIRE, C'EST TOUT LE PARCOURS QUI CHANGE : l'étape s'ouvre sans
    // barrer la route, et celles d'après s'ouvrent avec elle. Trois lettres ne
    // savent pas le dire, et le taire rendrait l'étape obligatoire à l'arrivée.
    if (s.facultatif) return 'elle n\'est pas obligatoire';
    if (s.sansTotal) return 'elle ne compte pas dans le total';
    if (s.forceSeed) return 'elle rejoue une série précise';
    if (!codeCourt(s.exerciseId)) return 'cet exercice n\'a pas encore de code à trois lettres';
    // LES RÉGLAGES VOYAGENT MAINTENANT DANS LE CODE — mais pas tous. Un réglage
    // sans nombre fini de valeurs, une valeur qui n'est pas dans sa propre
    // liste, une clé qui n'est pas au schéma : rien de tout cela ne sait
    // s'écrire en lettres, et le taire donnerait à l'élève un autre exercice
    // que celui qu'on a réglé.
    if (s.overrides && Object.keys(s.overrides).length
        && !lettresDeReglages(getExerciseById(s.exerciseId), s.overrides)) {
        return 'un de ses réglages ne sait pas s\'écrire en lettres '
            + '(trop de valeurs possibles, ou une valeur hors de sa liste)';
    }
    const n = s.nbItems || telQuel(s.exerciseId);
    if (!Number.isInteger(n) || n < 1 || n > 99) {
        return 'son nombre de questions ne tient pas en deux chiffres';
    }
    const seuilAttendu = seuilConseille(n);
    const seuil = (s.threshold === null || s.threshold === undefined) ? seuilAttendu : s.threshold;
    if (seuil !== seuilAttendu) return 'son seuil de réussite a été déplacé';
    return '';
}

function etapeSimple(s) {
    return !raisonEtape(s);
}

/**
 * POURQUOI CE PARCOURS N'A PAS DE CODE COURT — la liste, pour l'écran.
 *
 * Vide, cela veut dire que le code court suffit. Sinon chaque ligne nomme une
 * chose qui doit voyager et que trois lettres ne savent pas dire : c'est la
 * réponse exacte à « quand est-ce que tu utilises l'un ou l'autre ».
 */
export function raisonsDuCodeLong(path) {
    const p = normalizePath(path);
    const out = [];
    if (!p.steps || !p.steps.length) return ['le parcours est vide'];
    if (!politiqueOrdinaire(p.policy)) {
        out.push('les réglages de la séance ne sont pas ceux d\'usine : mode, aides, '
            + 'nombre d\'essais, correction, barème ou ordre des étapes');
    }
    if (p.bonusSeuil !== undefined && p.bonusSeuil !== SEUIL_DEFAUT) {
        out.push('le seuil qui ouvre les jeux de récompense a été déplacé');
    }
    // UNE REPRISE NE TIENT PAS DANS UNE CHAÎNE COURTE, et il ne faut surtout
    // pas qu'elle passe à la trappe : c'est elle, et elle seule, qui distingue
    // un rattrapage du travail d'origine. Sans elle dans le code, l'élève qui
    // tape le code du rattrapage retombe sur le parcours qu'il a déjà raté, et
    // son bilan va se ranger avec celui de la première fois.
    if (p.reprise) {
        out.push('c\'est un rattrapage, et il doit se distinguer du travail d\'origine');
    }
    p.steps.forEach((s, i) => {
        const r = raisonEtape(s);
        if (r) out.push(`étape ${i + 1} : ${r}`);
    });
    return out;
}

/** La politique est-elle celle d'usine ? Sinon elle doit voyager, donc base64. */
/**
 * La séance est-elle réglée d'usine ? Si oui, la chaîne courte suffit.
 *
 * ELLE SE COMPARE CLÉ PAR CLÉ, sur la liste que le format complet sait
 * écrire. Elle vérifiait quatre réglages nommés — le mode, les aides, les
 * essais, la note — et laissait passer tout le reste : le jour où l'on a
 * ajouté « l'élève choisit l'ordre des étapes », un parcours qui l'utilisait
 * partait en chaîne courte, qui ne sait pas le dire, et arrivait chez le
 * collègue verrouillé dans l'ordre. Sans un mot. Une liste nommée en dur ne
 * peut que se démoder : celle-ci suit CLES_POLITIQUE, donc tout réglage
 * partageable est couvert le jour où il naît.
 */
function politiqueOrdinaire(policy) {
    const pol = resolvePolicy(policy);
    const def = resolvePolicy(defaultPolicy());
    if (pol.mode !== def.mode || pol.grading) return false;
    for (const cle of Object.keys(CLES_POLITIQUE)) {
        // `showCorrection` se déduit de `correction` : le comparer deux fois
        // ne peut que se contredire (voir `compact`).
        if (cle === 'showCorrection' && pol.correction) continue;
        if (!memeValeur(pol[cle], def[cle])) return false;
    }
    return true;
}

/**
 * Le parcours écrit en codes courts enchaînés, ou '' s'il n'y tient pas.
 *
 * CE QUI NE TIENT PAS DANS LA CHAÎNE, et pourquoi c'est le bon partage :
 * une surcharge (« seulement les tables de 7 »), un barème, un mode
 * apprentissage, un temps limité, un coefficient — tout cela change ce que
 * l'élève reçoit et doit donc voyager. Le format complet le fait. La chaîne
 * courte ne prétend coder que ce qu'on peut dicter : des exercices, dans un
 * ordre, avec leur nombre de questions.
 *
 * LE NOM DU PARCOURS N'Y EST PAS. C'est le seul vrai renoncement : « Révisions
 * du chapitre 3 » pesait à lui seul 30 des 117 octets. À la relecture, le nom
 * se refait à partir des exercices — moins joli, mais un élève qui reçoit
 * « ARF-12-TPW-20 » au lieu de 178 caractères de lien y gagne largement.
 */
function chaineCourte(path) {
    const p = normalizePath(path);
    if (!p.steps || !p.steps.length) return '';
    if (!politiqueOrdinaire(p.policy)) return '';
    // Le seuil qui ouvre les jeux de récompense ne voyage pas dans la chaîne :
    // s'il a été déplacé, il doit voyager en entier.
    if (p.bonusSeuil !== undefined && p.bonusSeuil !== SEUIL_DEFAUT) return '';
    // LA GRAINE DE REPRISE NON PLUS. Un rattrapage a les mêmes étapes que le
    // travail d'origine : sa chaîne courte serait donc RIGOUREUSEMENT la même,
    // et l'élève qui la tape retomberait sur le parcours qu'il vient de rater.
    // Le format complet, lui, sait porter la graine.
    if (p.reprise) return '';
    let out = '';
    for (const s of p.steps) {
        if (!etapeSimple(s)) return '';
        const code = codeCourt(s.exerciseId);
        // Pas d'identité pour cet exercice ? On ne bricole pas un code
        // approximatif : le format complet sait tout coder, il prend le relais.
        if (!code) return '';
        const n = s.nbItems || telQuel(s.exerciseId);
        if (s.overrides && Object.keys(s.overrides).length) {
            const lettres = lettresDeReglages(getExerciseById(s.exerciseId), s.overrides);
            if (!lettres) return '';
            // DEUX CHIFFRES, TOUJOURS, dès qu'il y a des réglages : le nombre
            // et la marque se touchent une fois les tirets tombés, et « 8 »
            // suivi de « 00 » se relirait « 80 ».
            out += (out ? '-' : '')
                + `${code}-${String(n).padStart(2, '0')}-${MARQUE_REGLAGES}-${lettres}`;
            continue;
        }
        // « ARF » quand c'est l'exercice tel quel, « ARF-12 » quand le
        // professeur a choisi le nombre de questions.
        out += (out ? '-' : '') + code + (n === telQuel(s.exerciseId) ? '' : `-${n}`);
    }
    return out;
}

// --- base64url ---------------------------------------------------------------

function toBase64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

/**
 * REPRÉSENTATION COMPACTE : clés courtes, et on n'émet QUE ce qui diffère.
 *
 * Rémy : « est-ce qu'au niveau des options ça couvre tout ? » Non, ça ne
 * couvrait pas tout, et c'était silencieux — un contrôle partagé arrivait chez
 * le collègue avec la bonne note sur 10 mais l'arrondi, les pénalités, le
 * régime de correction et « ne pas montrer la note » remis d'usine. Neuf
 * réglages passaient à la trappe. On ne liste donc plus les champs à la main :
 * on COMPARE la politique à celle de son mode, et tout écart voyage.
 *
 * « Diffère » veut dire : diffère de la politique DU MODE, pas de celle
 * d'usine. C'est ce que `resolvePolicy` refera à la relecture — elle repart de
 * la politique du mode et applique ce qu'on lui donne. Encoder par rapport à
 * autre chose produirait un parcours qui ne se relit pas comme il s'écrit.
 */
const CLES_POLITIQUE = {
    hints: 'h', maxAttemptsPerItem: 'a', correction: 'c', showCorrection: 'sc',
    adaptive: 'ad', shuffleSteps: 'sh', ordreLibre: 'ol', allowRetryStep: 'rs', pointsPerItem: 'pi',
    hintPenalty: 'hp', showMe: 'sm', guided: 'gd',
    // La présentation voyage avec la séance, sinon le parcours envoyé par
    // code n'aurait pas l'habillage que le professeur a choisi — et un
    // réglage qui ne suit pas le lien n'est pas un réglage de la séance.
    presentation: 'pv'
};
const CLES_BAREME = {
    scale: 's', rule: 'r', penalties: 'p', arrondi: 'a',
    showCalculation: 'sc', note: 'n'
};

const memeValeur = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function politiqueDuMode(mode) {
    return mode === MODES.EVALUATION ? evaluationPolicy()
        : mode === MODES.APPRENTISSAGE ? apprentissagePolicy()
            : defaultPolicy();
}

function compact(path) {
    const p = normalizePath(path);
    const pol = resolvePolicy(p.policy);
    const base = politiqueDuMode(pol.mode);

    const out = { n: p.name, s: p.steps.map(compactStep) };
    // LA REPRISE : ce qui distingue un rattrapage du travail d'origine.
    //
    // Un rattrapage est le MÊME travail, redonné à ceux qui l'ont raté — et son
    // bilan ne doit surtout pas ramasser celui de la séance d'origine, sans
    // quoi le professeur verrait « refait » ce qui n'a jamais été refait. On
    // distinguait les deux par un identifiant neuf sur la copie ; mais un
    // identifiant ne voyage pas dans un code, et l'élève qui tape le code du
    // rattrapage retombait donc exactement sur le parcours d'origine.
    //
    // Cette graine-ci, elle, voyage. C'est le seul champ de la forme compacte
    // qui ne décrit pas le travail : il décrit l'ACTE de le redonner.
    if (p.reprise) out.r = p.reprise;
    // Le seuil qui ouvre les jeux de récompense du parcours.
    if (p.bonusSeuil !== undefined && p.bonusSeuil !== SEUIL_DEFAUT) out.b = p.bonusSeuil;

    const polOut = {};
    if (pol.mode !== defaultPolicy().mode) polOut.m = pol.mode;
    for (const [cle, court] of Object.entries(CLES_POLITIQUE)) {
        // `showCorrection` se DÉDUIT de `correction` : l'écrire aussi ne peut
        // que se contredire. On le laisse à `resolvePolicy`.
        if (cle === 'showCorrection' && pol.correction) continue;
        if (!memeValeur(pol[cle], base[cle])) polOut[court] = pol[cle];
    }
    if (pol.grading) {
        const bBase = base.grading || {};
        const g = {};
        for (const [cle, court] of Object.entries(CLES_BAREME)) {
            if (!memeValeur(pol.grading[cle], bBase[cle])) g[court] = pol.grading[cle];
        }
        // Un barème sur un mode qui n'en a pas d'usine doit exister même vide,
        // sinon la relecture croirait qu'il n'y a pas de note du tout.
        polOut.g = g;
    } else if (base.grading) {
        polOut.g = null;   // le professeur a retiré la note d'une évaluation
    }
    if (Object.keys(polOut).length) out.p = polOut;
    return out;
}

const CLES_ETAPE = {
    nbItems: 'q', threshold: 't', weight: 'w', timeLimit: 'l',
    forceSeed: 'f', sansTotal: 'st', bonus: 'b', facultatif: 'nb',
    verrou: 'k', ouvertureLe: 'd'
};

function compactStep(s) {
    const out = { e: s.exerciseId };
    if (s.nbItems && s.nbItems !== 10) out.q = s.nbItems;
    if (s.threshold !== null && s.threshold !== undefined) out.t = s.threshold;
    if (s.weight && s.weight !== 1) out.w = s.weight;
    if (s.timeLimit) out.l = s.timeLimit;
    if (s.forceSeed) out.f = s.forceSeed;
    // UNE ÉTAPE-JEU et UNE ÉTAPE SANS TOTAL ne sont pas des détails
    // d'affichage : l'une ne compte ni dans le travail ni dans la note, l'autre
    // change l'en-tête que l'élève lit. Les perdre change le parcours.
    if (s.sansTotal) out.st = 1;
    if (s.bonus) out.b = 1;
    // Une étape non obligatoire voyage aussi : elle décide de ce qui ouvre la
    // suite, donc la perdre en route change le parcours de l'élève.
    if (s.facultatif && !s.bonus) out.nb = 1;
    // LE VERROU VOYAGE, ET C'EST TOUT L'INTÉRÊT : le professeur pose la clé
    // chez lui, distribue le code, et l'étape reste fermée sur trente machines
    // jusqu'à ce qu'il la dicte. Ce qui voyage est l'EMPREINTE et son sel,
    // jamais la clé — un lien se décode.
    if (s.verrou && s.verrou.empreinte) out.k = s.verrou;
    if (s.ouvertureLe) out.d = s.ouvertureLe;
    if (s.overrides && Object.keys(s.overrides).length) out.o = s.overrides;
    return out;
}

/**
 * L'IDENTITÉ D'UN PARCOURS REÇU PAR CODE, C'EST SON CONTENU.
 *
 * Rémy : « quand j'ai fait un parcours en tant qu'élève et que je l'ai fini ou
 * non, ma progression ne s'enregistre pas j'ai l'impression pour le parcours ».
 *
 * ELLE S'ENREGISTRAIT — ET PERSONNE NE POUVAIT PLUS LA RETROUVER. Un code ne
 * transporte aucun identifiant : `compact()` n'en écrit pas. À chaque lecture,
 * `makePath()` en tirait donc un AU HASARD. Le même code saisi le lendemain
 * fabriquait, pour le journal, un AUTRE parcours : les étapes faites la veille
 * étaient toujours là, rangées sous l'ancien identifiant, mais
 * `computeAssignedPath` ne rattache que celles qui portent l'identifiant du
 * dernier parcours assigné. L'élève retrouvait sa carte vierge et recommençait
 * à l'étape 1.
 *
 * ON DÉRIVE DONC L'IDENTIFIANT DU CONTENU. Le même code, deux jours de suite,
 * sur deux appareils, désigne le même parcours — donc la même progression. Sans
 * rien ajouter au code, ce qui compte : les codes déjà dictés continuent de se
 * lire, et les codes courts restent courts.
 *
 * LE NOM RESTE HORS DE L'EMPREINTE. Pour une chaîne courte, il se refabrique à
 * partir des titres du catalogue : renommer un exercice ne doit pas effacer le
 * travail de trente élèves.
 *
 * CE QU'IL FAUT SAVOIR ET ASSUMER :
 *   · deux parcours au contenu RIGOUREUSEMENT identique partagent désormais une
 *     progression. C'est cohérent — même travail, même avancement — mais si
 *     Rémy redonne exactement les mêmes exercices une seconde fois, la carte
 *     s'ouvrira « déjà faite ». Un exercice de plus, un barème différent, un
 *     nombre de questions différent, et ce sont deux parcours distincts ;
 *   · la correction n'est PAS rétroactive : les étapes déjà écrites sous un
 *     identifiant tiré au hasard restent orphelines. Aucun élève n'ayant encore
 *     utilisé le logiciel, cela ne coûte rien aujourd'hui.
 *
 * ET C'EST L'IDENTITÉ DE PARTOUT, PAS SEULEMENT DE L'ÉLÈVE. Une séance donnée
 * l'écrit elle aussi (`core/seances.js`), et le panneau « À qui ce parcours est
 * donné » compare la même chose (`ui/parcoursClasses.js`). Sans quoi le
 * professeur et l'élève désigneraient le même travail par deux noms : le bilan
 * de la séance ne retiendrait aucun de ses travaux, et la case ne se cocherait
 * jamais. Mesuré exactement ainsi avant cette mise en commun — « runs retenus :
 * [] » pour une classe qui avait pourtant travaillé.
 */
export function identiteDeParcours(path) {
    if (!path) return '';
    // On repart de la forme compacte : c'est elle qui définit ce qui voyage,
    // donc ce qui fait qu'un parcours est LE MÊME. S'en écarter, ce serait
    // fabriquer une seconde définition à côté, qui divergerait un jour.
    const { n, ...contenu } = compact(path);
    // Ce n'est pas une empreinte cryptographique et n'a pas à l'être — personne
    // ne gagne rien à fabriquer une collision avec le parcours d'un autre élève,
    // et une collision fortuite demanderait des milliards de parcours différents
    // dans le même navigateur. C'est la même FNV-1a que celle du schéma des
    // réglages : une seule dans le module, donc une seule à vérifier.
    return 'path_c' + empreinte32(JSON.stringify(contenu)).toString(36).toUpperCase();
}

/** Pose cette identité sur le parcours, et le rend. */
function identifierParLeContenu(path) {
    if (!path) return path;
    path.id = identiteDeParcours(path);
    return path;
}

function expand(obj) {
    // On repart de la politique du mode, puis on applique ce qui voyageait.
    const p = obj.p || {};
    const pol = { ...politiqueDuMode(p.m) };
    if (p.m) pol.mode = p.m;
    for (const [cle, court] of Object.entries(CLES_POLITIQUE)) {
        if (p[court] === undefined) continue;
        // L'ancien format écrivait les booléens en 1/0 : il y a des liens dans
        // la nature, ils doivent continuer de se lire.
        pol[cle] = (typeof pol[cle] === 'boolean') ? !!p[court] : p[court];
    }
    if (p.g === null) {
        pol.grading = null;
    } else if (p.g) {
        pol.grading = { ...(politiqueDuMode(p.m).grading || {}) };
        for (const [cle, court] of Object.entries(CLES_BAREME)) {
            if (p.g[court] !== undefined) pol.grading[cle] = p.g[court];
        }
    }
    const path = makePath(obj.n || 'Parcours partagé', [], resolvePolicy(pol));
    if (obj.b !== undefined) path.bonusSeuil = obj.b;
    if (obj.r) path.reprise = obj.r;
    path.steps = (obj.s || []).map((s, i) => ({
        stepId: `sc_${i}`,
        exerciseId: s.e,
        overrides: s.o || {},
        nbItems: s.q || 10,
        threshold: s.t !== undefined ? s.t : null,
        weight: s.w || 1,
        timeLimit: s.l || null,
        forceSeed: s.f || null,
        sansTotal: !!s.st,
        bonus: !!s.b,
        facultatif: !!s.nb || !!s.b,
        verrou: s.k || null,
        ouvertureLe: s.d || null
    }));
    return path;
}

// LES CODES D'AVANT LES TROIS LETTRES ONT ÉTÉ RETIRÉS — mesuré, pas décidé.
//
// Le tout premier format écrivait le jeu sur DEUX lettres (« AA » à « AH »), le
// nombre de questions sur une lettre, les tables sur les suivantes. Il est resté
// décodable en dernier recours, après le format complet et la chaîne courte.
//
// CE QU'IL COÛTAIT, MESURÉ EN ESSAYANT TOUTES LES FAUTES D'UNE LETTRE sur les
// codes du catalogue : un code moderne REFUSÉ à juste titre — « AFL-08-00-ACBU »
// avec une lettre mal recopiée — retombait sur ce décodeur-ci, qui reconnaissait
// « AF » et rendait le Tir à l'Arc sur des tables tirées des caractères
// restants, chiffres compris (tout caractère inconnu y valait 1). L'élève
// recevait un AUTRE exercice, sans un mot.
//
// Autrement dit : ce décodeur-là rendait FAUSSE la garantie de la troisième
// lettre. Tout ce que le contrôle refuse, il l'acceptait derrière. Et il ne
// pouvait pas en être autrement : ce qui arrive jusqu'ici a DÉJÀ échoué au
// contrôle — c'est-à-dire que c'est très probablement une faute de frappe, le
// dernier cas où il faudrait deviner.
//
// Aucun élève n'a encore utilisé le logiciel et aucun code de ce format n'est
// dans la nature. Le garder revenait à troquer une garantie démontrable contre
// une compatibilité avec personne. Deux tests l'exigeaient — « un code d'avant
// doit rester lisible » et « les anciens codes à deux lettres restent
// décodables » : ils exigent maintenant l'inverse, et disent pourquoi.

// --- API ---------------------------------------------------------------------

export const Shortcodes = {
    /**
     * @returns {string} code partageable — TROIS LETTRES par exercice quand le
     * parcours n'est fait que d'exercices pris tels quels, le format complet
     * dès qu'un réglage doit voyager.
     */
    encodePath(path) {
        try {
            return chaineCourte(path) || PREFIX + toBase64Url(JSON.stringify(compact(path)));
        } catch (e) {
            console.error('[shortcodes] encodage impossible', e);
            return '';
        }
    },

    /**
     * @returns {string[]} ce qui empêche le code court — vide s'il suffit.
     * L'écran du professeur s'en sert pour DIRE pourquoi le lien est long.
     */
    raisonsDuCodeLong(path) {
        try { return raisonsDuCodeLong(path); } catch (e) { return []; }
    },

    /** @returns {Object|null} parcours normalisé v2 */
    decodePath(code) {
        if (!code) return null;
        const trimmed = String(code).trim();
        try {
            if (trimmed.startsWith(PREFIX)) {
                return identifierParLeContenu(
                    expand(JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length)))));
            }
            const chaine = decouperChaine(trimmed);
            if (chaine) {
                // LE NOM SE REFAIT à partir des exercices : il ne voyage pas
                // dans la chaîne, mais l'élève doit lire autre chose que
                // « Parcours partagé » en haut de son écran.
                const titres = chaine.map(e => (getExerciseById(e.exerciseId) || {}).title || 'Exercice');
                const path = makePath(titres.join(' + '), [], defaultPolicy());
                path.steps = chaine.map((e, i) => {
                    // Le nombre de questions écrit après le tiret, s'il y est —
                    // et le seuil s'en déduit, comme partout ailleurs.
                    const n = e.questions || telQuel(e.exerciseId);
                    return {
                        stepId: `sc_${i}`, exerciseId: e.exerciseId,
                        overrides: e.overrides || {},
                        nbItems: n, threshold: seuilConseille(n), weight: 1,
                        timeLimit: null, forceSeed: null
                    };
                });
                return identifierParLeContenu(path);
            }
            // UN CODE QU'ON NE SAIT PAS LIRE REND null, JAMAIS UN PARCOURS VIDE
            // ET JAMAIS UN AUTRE EXERCICE. Refuser franchement, c'est le message
            // d'erreur que l'élève doit voir — et c'est ce qui donne leur valeur
            // à la lettre de contrôle de l'identité comme à celle des réglages.
            return null;
        } catch (e) {
            console.warn('[shortcodes] code illisible', e);
            return null;
        }
    },

    /**
     * L'exercice désigné par un code court à UN seul exercice, ou null.
     * Une chaîne de plusieurs exercices n'en désigne pas un : elle rend null.
     */
    exerciceDuCodeCourt(code) {
        const d = decouperCodeCourt(code);
        return d ? (getExerciseById(d.exerciseId) || null) : null;
    },

    shareUrl(path) {
        const code = this.encodePath(path);
        return `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(code)}`;
    },

    // --- Compatibilité avec l'ancienne API ---
    encodeSequence(steps) {
        return this.encodePath(Array.isArray(steps) ? { steps } : steps);
    },
    decodeSequence(code) {
        const path = this.decodePath(code);
        return path ? path.steps : [];
    }
};
