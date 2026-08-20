// LES FRACTIONS ÉQUIVALENTES — compléter une égalité, et additionner par étapes.
//
// Deux demandes de Rémy, et un seul mécanisme derrière :
//
//   « Un exercice où il faut compléter l'égalité entre fractions. Exemple
//     3/2 = 33/… »
//   « Un exercice d'addition de fractions progressif. Avec d'abord des
//     dénominateurs multiples puis après trouver le PPCM. Il faut que ce soit
//     progressif. Comment rendre cela visuel ? »
//
// LE MÉCANISME COMMUN : multiplier haut et bas par le même nombre ne change
// pas la fraction. C'est la seule règle, et compléter une égalité, c'est
// l'appliquer dans un sens ; mettre au même dénominateur pour additionner,
// c'est l'appliquer deux fois. Les deux exercices partagent donc ce module —
// et l'élève qui a compris le premier a la clef du second.
//
// LES BANDES ONT ÉTÉ ESSAYÉES, PUIS RETIRÉES DE L'ADDITION.
//
// Deux bandes de même longueur, l'une coupée en tiers et l'autre en sixièmes,
// montrent bien pourquoi on ne peut pas rassembler des parts de tailles
// différentes. Mais Rémy, après essai : « je ne suis pas convaincu par les
// bandes pour les fractions, on va proposer l'addition de fraction sans
// support visuel, car on peut tomber sur des choses incohérentes ». Il a
// raison : passé une vingtaine de parts le dessin devient une hachure, et une
// image qui cesse de montrer au moment où le calcul devient difficile n'aide
// personne. L'addition se POSE donc, ligne par ligne, comme au cahier.
//
// CE QUI REMPLACE L'IMAGE : LA TABLE DE PYTHAGORE. « On peut lui montrer la
// table de Pythagore, ou on fait clignoter les lignes et colonnes des
// dénominateurs. » La ligne des 4 et la ligne des 3 se rencontrent en 12, 24,
// 36 — et le premier de ces rendez-vous EST le dénominateur commun. C'est un
// dessin qui ne se dégrade jamais, et c'est celui d'une table que l'élève
// connaît déjà. Voir `multiplesCommuns`. Les bandes restent pour l'égalité à
// compléter, où deux longueurs suffisent à tout dire.
//
// LA PROGRESSION EN QUATRE MARCHES, et chacune n'ajoute qu'UNE difficulté :
//   1. même dénominateur — rien à changer, on additionne les numérateurs ;
//   2. l'un est MULTIPLE de l'autre (3 et 6) — une seule fraction bouge ;
//   3. premiers entre eux (3 et 4) — le produit fait l'affaire, les deux
//      bougent, et l'on n'a pas encore besoin de chercher ;
//   4. ni l'un ni l'autre (4 et 6) — le produit marcherait mais donne 24 là
//      où 12 suffit : c'est ici, et seulement ici, que le PPCM se gagne.
//
// Module pur : ni DOM, ni hasard propre. Le générateur passe son `rng`.

export const pgcd = (a, b) => (b === 0 ? Math.abs(a) : pgcd(b, a % b));
export const ppcm = (a, b) => Math.abs(a * b) / pgcd(a, b);

/** Réduit une fraction à sa forme irréductible. */
export function simplifier(n, d) {
    const g = pgcd(n, d) || 1;
    return { n: n / g, d: d / g };
}

export const estIrreductible = (n, d) => pgcd(n, d) === 1;

// --- COMPLÉTER UNE ÉGALITÉ ---------------------------------------------------

/**
 * Les quatre formes de l'exercice. Elles ne demandent pas le même travail :
 * agrandir se fait par une multiplication, simplifier par une division — et
 * c'est la division que les élèves ratent, parce qu'il faut d'abord TROUVER
 * le facteur au lieu de le lire.
 */
export const TROUS = ['numerateur', 'denominateur'];

/**
 * Une égalité à compléter.
 *
 * @param {Object} rng
 * @param {Object} [opts]
 * @param {string} [opts.sens] - 'agrandir' | 'simplifier' | 'les-deux'
 * @param {number} [opts.maxBase]   - plus grand dénominateur de départ
 * @param {number} [opts.maxFacteur]- plus grand facteur de multiplication
 * @param {string} [opts.trou]      - 'numerateur' | 'denominateur' | 'les-deux'
 * @returns {{gauche, droite, trou, reponse, facteur, sens, visible}}
 *   `visible` est le nombre DONNÉ du côté à compléter — c'est lui qui permet
 *   de retrouver le facteur.
 */
export function tirerEgalite(rng, opts = {}) {
    const {
        sens = 'les-deux', maxBase = 9, maxFacteur = 12, trou = 'les-deux', eviter = []
    } = opts;

    for (let essai = 0; essai < 60; essai++) {
        const d = rng.int(2, Math.max(2, maxBase));
        const n = rng.int(1, Math.max(1, d * 2));
        // La fraction de base est IRRÉDUCTIBLE : sans cela, « simplifier »
        // aurait deux réponses justes et l'élève aurait raison de se plaindre.
        if (!estIrreductible(n, d)) continue;
        const k = rng.int(2, Math.max(2, maxFacteur));
        if (k === 1) continue;

        const agrandit = sens === 'agrandir' ? true
            : sens === 'simplifier' ? false : rng.bool();
        const petite = { n, d };
        const grande = { n: n * k, d: d * k };
        const gauche = agrandit ? petite : grande;
        const droite = agrandit ? grande : petite;

        const quoi = trou === 'les-deux' ? rng.pick(TROUS) : trou;
        const reponse = quoi === 'numerateur' ? droite.n : droite.d;
        const visible = quoi === 'numerateur' ? droite.d : droite.n;
        const clef = `${gauche.n}/${gauche.d}=${droite.n}/${droite.d}:${quoi}`;
        if (eviter.includes(clef)) continue;

        return {
            gauche, droite, trou: quoi, reponse, visible, facteur: k,
            sens: agrandit ? 'agrandir' : 'simplifier',
            clef
        };
    }
    // Repli : une égalité toujours valable, plutôt que rien.
    return {
        gauche: { n: 1, d: 2 }, droite: { n: 3, d: 6 }, trou: 'numerateur',
        reponse: 3, visible: 6, facteur: 3, sens: 'agrandir', clef: '1/2=3/6:numerateur'
    };
}

/** Le raisonnement, dans l'ordre où on l'écrit au tableau. */
export function etapesEgalite(e) {
    const deDroiteAGauche = e.sens === 'simplifier';
    const mot = deDroiteAGauche ? 'divise' : 'multiplie';
    const vu = e.trou === 'numerateur' ? 'dénominateur' : 'numérateur';
    const depart = e.trou === 'numerateur' ? e.gauche.d : e.gauche.n;
    const arrivee = e.visible;
    return [
        `Regarde le ${vu} : on passe de ${depart} à ${arrivee}.`,
        `${depart} ${deDroiteAGauche ? '÷' : '×'} ${e.facteur} = ${arrivee}, `
            + `donc on ${mot} par ${e.facteur}.`,
        `Le ${e.trou === 'numerateur' ? 'numérateur' : 'dénominateur'} suit : `
            + `${e.trou === 'numerateur' ? e.gauche.n : e.gauche.d} `
            + `${deDroiteAGauche ? '÷' : '×'} ${e.facteur} = ${e.reponse}.`
    ];
}

/** Une réponse est-elle juste ? On accepte le nombre écrit de n'importe quelle façon. */
export function verifierEgalite(e, proposition) {
    const v = Number(String(proposition).trim().replace(',', '.'));
    return Number.isFinite(v) && v === e.reponse;
}

// --- ADDITIONNER DEUX FRACTIONS, PAR MARCHES ---------------------------------

export const NIVEAUX_SOMME = [
    {
        id: 'meme', nom: 'Même dénominateur',
        aide: 'Les deux parts ont déjà la même taille : on calcule sur les numérateurs, et le '
            + 'dénominateur ne bouge pas.'
    },
    {
        id: 'multiple', nom: 'Un dénominateur multiple de l\'autre',
        aide: 'Six est déjà dans la table de trois : le dénominateur commun est le plus grand '
            + 'des deux. Une seule fraction change.'
    },
    {
        id: 'premiers', nom: 'Dénominateurs premiers entre eux',
        aide: 'Trois et quatre n\'ont aucun diviseur commun : leur premier rendez-vous dans les '
            + 'tables est leur produit, douze. Les deux fractions changent.'
    },
    {
        id: 'ppcm', nom: 'Il faut chercher le PPCM',
        aide: 'Quatre et six : le produit ferait vingt-quatre, mais la table de 4 et celle de 6 '
            + 'se rencontrent déjà à douze. C\'est le plus petit commun multiple, et c\'est lui '
            + 'qui évite les gros nombres.'
    }
];

export const estNiveauSomme = (id) => NIVEAUX_SOMME.some(n => n.id === id);

/**
 * Deux dénominateurs qui posent EXACTEMENT le problème du niveau.
 *
 * C'est ici que la progressivité se joue : au niveau « ppcm », un tirage qui
 * rendrait 3 et 4 (premiers entre eux) n'apprendrait rien de plus que la
 * marche précédente. On vérifie donc la propriété au lieu de l'espérer.
 */
export function tirerDenominateurs(rng, niveau, maxDen = 10) {
    const max = Math.max(4, maxDen);
    for (let essai = 0; essai < 200; essai++) {
        const a = rng.int(2, max), b = rng.int(2, max);
        // DEUX MOITIÉS FONT UN, et l'unité demande une seconde bande — la
        // difficulté d'après. Au même dénominateur, on part donc des tiers :
        // c'est le plus petit découpage où deux parts tiennent encore sous 1.
        if (niveau === 'meme') { if (a >= 3) return [a, a]; continue; }
        if (a === b) continue;
        const [petit, grand] = a < b ? [a, b] : [b, a];
        const multiple = grand % petit === 0;
        const premiers = pgcd(petit, grand) === 1;
        const m = ppcm(petit, grand);
        if (niveau === 'multiple' && multiple) return [petit, grand];
        // « Premiers entre eux » exclut le cas multiple, qui est plus facile —
        // et 1 n'est pas un dénominateur d'exercice.
        if (niveau === 'premiers' && premiers && !multiple) return [petit, grand];
        // Le PPCM ne se mérite que s'il est STRICTEMENT plus petit que le
        // produit : sinon on retombe sur la marche d'avant.
        if (niveau === 'ppcm' && !multiple && !premiers && m < petit * grand) return [petit, grand];
    }
    // Replis sûrs, un par marche.
    return { meme: [4, 4], multiple: [3, 6], premiers: [3, 4], ppcm: [4, 6] }[niveau] || [3, 6];
}

/**
 * LES DEUX OPÉRATIONS, ET PAS DE NOMBRES NÉGATIFS.
 *
 * Rémy : « tu peux mélanger addition et soustraction de fractions (sans
 * nombres relatifs) ». La soustraction ne demande rien de plus au dénominateur
 * — c'est exactement le même travail — mais elle empêche de répondre au flair :
 * on ne peut plus additionner deux petits nombres au hasard et tomber juste.
 * On garde donc le résultat STRICTEMENT POSITIF et, pour une somme,
 * strictement inférieur à l'unité : ni relatifs, ni fractions impropres, ce
 * sont deux difficultés d'un autre chapitre.
 */
export const OPERATIONS = ['somme', 'difference', 'les-deux'];

/**
 * Un calcul à poser, avec tout ce qu'il faut pour l'écrire ligne par ligne.
 *
 * @param {Object} rng
 * @param {Object} [opts]
 * @param {string} [opts.niveau]     - marche de la progression
 * @param {number} [opts.maxDen]     - plus grand dénominateur (10 : la table
 *   de Pythagore sert d'aide, et elle s'arrête à dix)
 * @param {string} [opts.operation]  - 'somme' | 'difference' | 'les-deux'
 */
export function tirerCalcul(rng, opts = {}) {
    const { niveau = 'multiple', maxDen = 10, operation = 'somme' } = opts;
    const niv = estNiveauSomme(niveau) ? niveau : 'multiple';
    const [d1, d2] = tirerDenominateurs(rng, niv, maxDen);
    const commun = ppcm(d1, d2);
    const signe = operation === 'les-deux' ? (rng.bool() ? '+' : '−')
        : (operation === 'difference' ? '−' : '+');

    for (let essai = 0; essai < 200; essai++) {
        const n1 = rng.int(1, d1 - 1);
        const n2 = rng.int(1, d2 - 1);
        // LES DEUX FRACTIONS DE DÉPART SONT IRRÉDUCTIBLES. « 2/4 de la tarte »
        // dans un énoncé, c'est une faute de goût qui devient une faute tout
        // court : l'élève simplifie d'abord, trouve un autre dénominateur
        // commun que celui qu'on attend, et il a raison. On ne simplifie pas
        // le RÉSULTAT (c'est la consigne), mais l'énoncé, lui, est propre.
        if (!estIrreductible(n1, d1) || !estIrreductible(n2, d2)) continue;
        const na = n1 * (commun / d1), nb = n2 * (commun / d2);
        const total = signe === '+' ? na + nb : na - nb;
        // Ni au-dessus de l'unité, ni en dessous de zéro.
        if (signe === '+' && total >= commun) continue;
        if (signe === '−' && total <= 0) continue;
        return construireCalcul({ n: n1, d: d1 }, { n: n2, d: d2 }, commun, niv, signe);
    }
    // Repli sûr, irréductible des deux côtés : 1/d l'est toujours, et pour une
    // différence on prend la plus grande fraction irréductible du premier
    // dénominateur — c'est la seule façon de garder un résultat positif.
    const grandIrreductible = (d) => {
        for (let n = d - 1; n >= 1; n--) if (estIrreductible(n, d)) return n;
        return 1;
    };
    return signe === '−'
        ? construireCalcul({ n: grandIrreductible(d1), d: d1 }, { n: 1, d: d2 }, commun, niv, '−')
        : construireCalcul({ n: 1, d: d1 }, { n: 1, d: d2 }, commun, niv, '+');
}

/** Addition seule — la forme d'avant, gardée parce qu'elle se lit bien. */
export const tirerSomme = (rng, opts = {}) => tirerCalcul(rng, { ...opts, operation: 'somme' });

function construireCalcul(a, b, commun, niveau, signe = '+') {
    const ka = commun / a.d, kb = commun / b.d;
    const aReduit = { n: a.n * ka, d: commun };
    const bReduit = { n: b.n * kb, d: commun };
    const brut = { n: signe === '+' ? aReduit.n + bReduit.n : aReduit.n - bReduit.n, d: commun };
    const reduit = simplifier(brut.n, brut.d);
    const c = { niveau, signe, a, b, commun, ka, kb, aReduit, bReduit, brut, reduit };
    c.aSimplifiable = reduit.d !== brut.d;
    // Le raisonnement écrit, ligne par ligne — c'est aussi la correction.
    c.etapes = etapesCalcul(c);
    return c;
}

export function etapesCalcul(s) {
    const op = s.signe === '−' ? '−' : '+';
    const verbe = op === '−' ? 'retire' : 'additionne';
    const l = [];
    if (s.commun === s.a.d && s.commun === s.b.d) {
        l.push(`Les deux parts ont déjà la même taille : ${s.a.n} ${op} ${s.b.n} = ${s.brut.n}.`);
        // L'ERREUR DE LA PREMIÈRE MARCHE, et elle vaut d'être nommée tout de
        // suite : opérer aussi sur les dénominateurs. Le dénominateur dit la
        // TAILLE des parts, pas leur nombre — il n'y a rien à y ajouter.
        l.push(`Le dénominateur ne bouge pas : il reste ${s.commun}. Il dit la taille des `
            + 'parts, pas combien on en a.');
    } else {
        l.push(`Les parts n'ont pas la même taille : il faut les recouper en ${s.commun}èmes. `
            + `${s.commun} est le plus petit nombre à la fois dans la table de ${s.a.d} et dans `
            + `celle de ${s.b.d}.`);
        if (s.ka > 1) l.push(`${s.a.n}/${s.a.d} = ${s.aReduit.n}/${s.commun} (× ${s.ka} en haut et en bas).`);
        else l.push(`${s.a.n}/${s.a.d} est déjà en ${s.commun}èmes.`);
        if (s.kb > 1) l.push(`${s.b.n}/${s.b.d} = ${s.bReduit.n}/${s.commun} (× ${s.kb} en haut et en bas).`);
        else l.push(`${s.b.n}/${s.b.d} est déjà en ${s.commun}èmes.`);
        l.push(`On ${verbe} alors les numérateurs : ${s.aReduit.n} ${op} ${s.bReduit.n} = `
            + `${s.brut.n}, sur ${s.commun}.`);
    }
    if (s.reduit.d !== s.brut.d) {
        l.push(`On peut simplifier : ${s.brut.n}/${s.brut.d} = ${s.reduit.n}/${s.reduit.d}.`);
    }
    return l;
}

export const etapesSomme = etapesCalcul;

// --- LA TABLE DE PYTHAGORE, POUR TROUVER LE PPCM ------------------------------

/**
 * L'AIDE QUE RÉMY A DEMANDÉE, et c'est la bonne.
 *
 * « On peut lui montrer la table de Pythagore, ou on fait clignoter les lignes
 * et colonnes des dénominateurs. » Chercher le PPCM de 4 et 3 « dans sa tête »
 * n'apprend rien à qui ne l'a pas déjà ; le VOIR est immédiat : la ligne des
 * quatre et la ligne des trois se rencontrent en 12, 24, 36 — et le premier
 * de ces rendez-vous est le dénominateur commun.
 *
 * C'est aussi ce qui fixe la borne des dénominateurs : la table s'arrête à
 * dix, donc les dénominateurs aussi (le plus grand PPCM possible, 9 × 10 = 90,
 * y figure encore).
 *
 * @returns {{taille, a, b, multiplesA, multiplesB, communs, ppcm}}
 */
export function multiplesCommuns(a, b, taille = 10) {
    const multiples = (n) => Array.from({ length: taille }, (_, i) => n * (i + 1));
    const multiplesA = multiples(a);
    const multiplesB = multiples(b);
    const dansB = new Set(multiplesB);
    const communs = multiplesA.filter(v => dansB.has(v));
    return {
        taille, a, b, multiplesA, multiplesB, communs,
        // Le PPCM se lit dans la table quand il y est ; sinon on le calcule,
        // pour que l'aide ne mente jamais sur la réponse.
        ppcm: communs.length ? communs[0] : ppcm(a, b)
    };
}

// --- LES BANDES, POUR MONTRER ------------------------------------------------

/**
 * LES TRAITS DE COUPE D'UNE BANDE, en fractions de sa longueur.
 *
 * C'est tout ce dont un dessin a besoin : où couper, et jusqu'où colorier. La
 * bande fait toujours la même longueur — c'est justement ce qui doit sauter
 * aux yeux quand on la recoupe.
 *
 * @returns {{coupes: number[], pleines: number, parts: number}}
 *   `coupes` : positions de 0 à 1, bords compris.
 */
export function bande(n, d) {
    const coupes = Array.from({ length: d + 1 }, (_, i) => i / d);
    return { coupes, pleines: n, parts: d };
}

/**
 * LE RECOUPAGE : les traits qu'on AJOUTE pour passer de d à commun.
 *
 * Séparer les anciens des nouveaux est ce qui rend l'image parlante : les
 * anciens traits restent là où ils étaient — la longueur ne bouge pas — et les
 * nouveaux viennent seulement entre eux.
 */
export function recoupage(d, commun) {
    if (commun % d !== 0) return { anciens: [], nouveaux: [], facteur: 1 };
    const facteur = commun / d;
    const anciens = Array.from({ length: d + 1 }, (_, i) => i / d);
    const nouveaux = [];
    for (let i = 1; i < commun; i++) {
        const x = i / commun;
        if (i % facteur !== 0) nouveaux.push(x);
    }
    return { anciens, nouveaux, facteur };
}
