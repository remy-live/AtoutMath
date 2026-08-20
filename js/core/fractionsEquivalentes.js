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
// COMMENT LE RENDRE VISUEL : DEUX BANDES DE MÊME LONGUEUR.
//
// Une fraction est une longueur, pas un couple de nombres. Deux bandes de la
// même longueur, coupées l'une en tiers et l'autre en sixièmes, montrent d'un
// coup ce qu'aucune règle n'explique : on ne peut pas rassembler un tiers et
// un sixième tant que les morceaux n'ont pas la même taille. RECOUPER la
// bande des tiers en six montre que le trait de coupe change, pas la longueur
// — 1/3 et 2/6 occupent exactement la même place. C'est là que la règle
// devient évidente, et c'est ce que ce module décrit : la position de chaque
// trait de coupe, avant et après.
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
        aide: 'Les deux parts ont déjà la même taille : on additionne les numérateurs, et le '
            + 'dénominateur ne bouge pas.'
    },
    {
        id: 'multiple', nom: 'Un dénominateur multiple de l\'autre',
        aide: 'Six est un multiple de trois : on recoupe SEULEMENT la bande des tiers. Une '
            + 'seule fraction change.'
    },
    {
        id: 'premiers', nom: 'Dénominateurs premiers entre eux',
        aide: 'Trois et quatre n\'ont aucun diviseur commun : le dénominateur commun est leur '
            + 'produit, douze. Les deux fractions changent.'
    },
    {
        id: 'ppcm', nom: 'Il faut chercher le PPCM',
        aide: 'Quatre et six : le produit ferait vingt-quatre, mais douze suffit. C\'est le plus '
            + 'petit commun multiple — et c\'est lui qui évite les gros nombres.'
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
export function tirerDenominateurs(rng, niveau, maxDen = 12) {
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
 * Une addition, avec tout ce qu'il faut pour la montrer.
 *
 * On garde les deux fractions PLUS PETITES QUE 1 : une somme qui dépasse
 * l'unité demande une bande de plus, et ce n'est pas la difficulté qu'on
 * travaille ici.
 */
export function tirerSomme(rng, opts = {}) {
    const { niveau = 'multiple', maxDen = 12 } = opts;
    const niv = estNiveauSomme(niveau) ? niveau : 'multiple';
    const [d1, d2] = tirerDenominateurs(rng, niv, maxDen);
    const commun = ppcm(d1, d2);

    for (let essai = 0; essai < 80; essai++) {
        const n1 = rng.int(1, d1 - 1);
        const n2 = rng.int(1, d2 - 1);
        const brut = { n: n1 * (commun / d1) + n2 * (commun / d2), d: commun };
        // Somme strictement inférieure à 1 : une bande suffit à la montrer.
        if (brut.n >= brut.d) continue;
        return construireSomme({ n: n1, d: d1 }, { n: n2, d: d2 }, commun, niv);
    }
    // Repli : la plus petite somme possible avec ces dénominateurs. Elle tient
    // toujours sous l'unité — 1/2 + 1/2 est le seul cas contraire, et les deux
    // moitiés sont exclues au tirage des dénominateurs.
    return construireSomme({ n: 1, d: d1 }, { n: 1, d: d2 }, commun, niv);
}

function construireSomme(a, b, commun, niveau) {
    const ka = commun / a.d, kb = commun / b.d;
    const aReduit = { n: a.n * ka, d: commun };
    const bReduit = { n: b.n * kb, d: commun };
    const brut = { n: aReduit.n + bReduit.n, d: commun };
    const reduit = simplifier(brut.n, brut.d);
    return {
        niveau, a, b, commun, ka, kb, aReduit, bReduit, brut, reduit,
        aSimplifiable: reduit.d !== brut.d,
        // Le raisonnement écrit, ligne par ligne — c'est aussi la correction.
        etapes: etapesSomme({ a, b, commun, ka, kb, aReduit, bReduit, brut, reduit })
    };
}

export function etapesSomme(s) {
    const l = [];
    if (s.commun === s.a.d && s.commun === s.b.d) {
        l.push(`Les deux parts ont déjà la même taille : ${s.a.n} + ${s.b.n} = ${s.brut.n}.`);
        // L'ERREUR DE LA PREMIÈRE MARCHE, et elle vaut d'être nommée tout de
        // suite : additionner aussi les dénominateurs. Le dénominateur dit la
        // TAILLE des parts, pas leur nombre — il n'y a rien à y ajouter.
        l.push(`Le dénominateur ne bouge pas : il reste ${s.commun}. Il dit la taille des `
            + 'parts, pas combien on en a.');
    } else {
        l.push(`Les parts n'ont pas la même taille : il faut les recouper en ${s.commun}èmes.`);
        if (s.ka > 1) l.push(`${s.a.n}/${s.a.d} = ${s.aReduit.n}/${s.commun} (× ${s.ka} en haut et en bas).`);
        else l.push(`${s.a.n}/${s.a.d} est déjà en ${s.commun}èmes.`);
        if (s.kb > 1) l.push(`${s.b.n}/${s.b.d} = ${s.bReduit.n}/${s.commun} (× ${s.kb} en haut et en bas).`);
        else l.push(`${s.b.n}/${s.b.d} est déjà en ${s.commun}èmes.`);
        l.push(`${s.aReduit.n} + ${s.bReduit.n} = ${s.brut.n}, sur ${s.commun}.`);
    }
    if (s.reduit.d !== s.brut.d) {
        l.push(`On simplifie : ${s.brut.n}/${s.brut.d} = ${s.reduit.n}/${s.reduit.d}.`);
    }
    return l;
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
