// LA BALANCE — résoudre une équation en gardant l'équilibre.
//
// Rémy a choisi cet exercice pour le chapitre « Équations » de 4e, qui ne
// contenait rien du tout : onze chapitres de la progression ne déclaraient
// aucune compétence, et celui-là est le plus lourd des onze.
//
// POURQUOI UNE BALANCE, ET PAS UNE SUITE DE RÈGLES.
//
// « On fait la même chose des deux côtés » est la phrase que tout le monde
// récite et que presque personne ne comprend. Elle n'explique rien : elle
// énonce le résultat. Sur une balance, il n'y a rien à comprendre — on VOIT
// que retirer trois poids d'un seul plateau fait pencher le fléau, et que la
// seule façon de le redresser est de retirer les trois autres. La règle n'est
// plus une consigne à retenir, c'est la description de ce qu'on vient de faire.
//
// D'OÙ LE CHOIX CENTRAL DE CE MODULE : ON LAISSE FAIRE LA FAUTE.
//
// Il aurait été plus simple d'appliquer chaque geste aux deux plateaux à la
// fois — l'égalité serait vraie du début à la fin, et l'élève ne pourrait pas
// se tromper. C'est justement ce qu'il ne faut pas faire : il n'apprendrait
// alors rien de plus qu'avec un bouton « étape suivante ». On agit donc sur UN
// plateau, la balance penche pour de bon, l'équation cesse d'être vraie, et
// l'écran attend le geste jumeau. Le déséquilibre est un état légal du modèle,
// et c'est lui qui enseigne.
//
// LE PARTAGE, LUI, EST INDIVISIBLE. On ne peut pas « couper un seul plateau
// en trois » : cela n'a aucun sens physique, et aucun sens algébrique non plus.
// Le geste `partager` porte donc sur la balance entière, et il est refusé quand
// l'un des deux plateaux ne se partage pas en parts égales — ce refus est une
// leçon à lui seul, car c'est exactement pourquoi on retire les unités AVANT
// de diviser.
//
// CE QU'ON NE MODÉLISE PAS ENCORE : les nombres négatifs. Un plateau ne porte
// jamais moins que rien, et toutes les équations de la progression se résolvent
// sans passer par là. La suite naturelle serait des ballons — des poids qui
// tirent vers le haut ; le modèle est prêt à les recevoir (les comptes sont des
// entiers signés partout), l'écran ne l'est pas.

/** Un plateau : `x` boîtes mystère, `u` poids d'une unité. */
const plateau = (x, u) => ({ x, u });

export const COTES = ['g', 'd'];
export const AUTRE = { g: 'd', d: 'g' };

/** Le nom que l'élève lit, pas l'identifiant. */
export const NOM_COTE = { g: 'gauche', d: 'droite' };

/**
 * L'ÉQUATION ÉCRITE EN SYMBOLES, à partir de l'état des plateaux.
 *
 * C'est le pont entre le concret et l'abstrait, et il doit être permanent :
 * l'élève doit voir la ligne d'algèbre bouger en même temps que les poids,
 * sinon il apprend à manipuler une balance et rien d'autre.
 */
export function enSymboles(etat) {
    return `${cote(etat.g)} = ${cote(etat.d)}`;
}

function cote(p) {
    const bouts = [];
    if (p.x) bouts.push(p.x === 1 ? 'x' : `${p.x}x`);
    if (p.u || !bouts.length) bouts.push(String(p.u));
    return bouts.join(' + ');
}

/** Le total d'un plateau, une fois qu'on sait ce que vaut x. */
export const pese = (p, x) => p.x * x + p.u;

/** La balance penche-t-elle, et de quel côté ? */
export function penche(etat, solution) {
    const g = pese(etat.g, solution), d = pese(etat.d, solution);
    if (g === d) return 0;
    return g > d ? -1 : 1;   // −1 : la gauche descend. +1 : la droite descend.
}

/**
 * EST-CE RÉSOLU ?
 *
 * Une boîte seule sur un plateau, des poids sur l'autre, et rien de plus. On
 * accepte les deux côtés : « x = 5 » et « 5 = x » disent la même chose, et
 * refuser le second apprendrait une superstition.
 */
export function resolu(etat) {
    if (etat.attente) return false;
    const seul = (a, b) => a.x === 1 && a.u === 0 && b.x === 0;
    if (seul(etat.g, etat.d)) return { x: etat.d.u, cote: 'g' };
    if (seul(etat.d, etat.g)) return { x: etat.g.u, cote: 'd' };
    return false;
}

/** L'état de départ d'une équation `a·x + b = c·x + d`. */
export function etatInitial({ a, b, c, d }) {
    return { g: plateau(a, b), d: plateau(c, d), attente: null };
}

const copie = (e) => ({
    g: plateau(e.g.x, e.g.u), d: plateau(e.d.x, e.d.u),
    attente: e.attente ? { ...e.attente } : null
});

/**
 * APPLIQUER UN GESTE, ET DIRE POURQUOI QUAND ON REFUSE.
 *
 * Un refus muet — le poids qui ne bouge pas, sans un mot — se lit comme une
 * panne. Chaque refus nomme donc ce qui cloche, et la phrase est écrite pour
 * être lue par l'élève au moment où il se trompe, pas pour un journal.
 *
 * @returns {{ ok: boolean, etat: Object, dit: string, ton: string }}
 */
export function appliquer(etat, geste) {
    const refus = (dit) => ({ ok: false, etat, dit, ton: 'ko' });

    if (geste.geste === 'enlever') {
        const { cote: c, quoi, combien } = geste;
        if (!COTES.includes(c)) return refus('Ce plateau n\'existe pas.');
        const n = Math.max(1, combien | 0);
        const dispo = etat[c][quoi];
        if (dispo < n) {
            return refus(quoi === 'x'
                ? `Il n'y a pas ${n} boîte${n > 1 ? 's' : ''} sur ce plateau.`
                : `Il n'y a pas ${n} poids sur ce plateau.`);
        }

        // LA DETTE S'ACCUMULE, ET ELLE SE REMBOURSE PAR PETITS BOUTS.
        //
        // La première version exigeait le geste jumeau EXACT, d'un seul coup :
        // « x + 4 = 9 » obligeait alors à alterner clic-gauche, clic-droite,
        // huit fois de suite — mesuré à l'écran, et c'est raté. Ces huit
        // micro-gestes cachent précisément ce qu'on veut montrer, qui est
        // « j'enlève QUATRE des deux côtés ».
        //
        // On garde donc une DETTE : cliquer encore du même côté l'augmente (le
        // fléau penche davantage), cliquer de l'autre la rembourse d'autant. La
        // balance se redresse quand elle est soldée. La règle est intacte — on
        // n'a jamais le droit d'en rester là —, mais le geste redevient un
        // geste : « j'en enlève quatre ici, quatre là ».
        if (etat.attente) {
            const at = etat.attente;
            if (quoi !== at.quoi) {
                const ce = at.quoi === 'x' ? 'des boîtes' : 'des poids';
                return refus(`Tu as commencé par enlever ${ce} : termine ce geste-là `
                    + 'avant d\'en commencer un autre.');
            }
            const e = copie(etat);
            e[c][quoi] -= n;
            if (c === at.cote) {
                e.attente = { ...at, combien: at.combien + n };
                return { ok: true, etat: e, ton: 'attente',
                    dit: `${e.attente.combien} en moins à ${NOM_COTE[c]} : la balance penche `
                        + `toujours. Enlèves-en autant à ${NOM_COTE[AUTRE[c]]}.` };
            }
            if (n > at.combien) {
                return refus(`Tu n'as enlevé que ${at.combien} `
                    + `${at.quoi === 'x' ? 'boîte' : 'poids'}${at.combien > 1 ? 's' : ''} `
                    + `à ${NOM_COTE[at.cote]} : en enlever ${n} ici ferait pencher de l'autre côté.`);
            }
            const reste = at.combien - n;
            e.attente = reste ? { ...at, combien: reste } : null;
            return reste
                ? { ok: true, etat: e, ton: 'attente',
                    dit: `Encore ${reste} à enlever ici pour redresser la balance.` }
                : { ok: true, etat: e, ton: 'ok', dit: 'La balance est de nouveau '
                    + 'à l\'équilibre : l\'égalité est conservée.' };
        }

        const e = copie(etat);
        e[c][quoi] -= n;
        e.attente = { cote: c, quoi, combien: n };
        return { ok: true, etat: e, ton: 'attente', dit: 'La balance penche. '
            + `Enlève la même chose à ${NOM_COTE[AUTRE[c]]}.` };
    }

    if (geste.geste === 'partager') {
        const n = Math.max(2, geste.en | 0);
        if (etat.attente) {
            return refus('On ne partage pas une balance qui penche : redresse-la d\'abord.');
        }
        // POURQUOI CE REFUS EST UNE LEÇON, ET PAS UNE LIMITE TECHNIQUE. On ne
        // peut partager en parts égales que ce qui se partage : c'est
        // précisément la raison pour laquelle on enlève les unités d'abord.
        const divise = (p) => p.x % n === 0 && p.u % n === 0;
        if (!divise(etat.g) || !divise(etat.d)) {
            return refus(`Un des deux plateaux ne se partage pas en ${n} parts égales. `
                + 'Enlève d\'abord les poids qui gênent.');
        }
        // Partager deux plateaux qui ne portent plus aucune boîte ne rapproche
        // de rien : on refuse, plutôt que de laisser tourner en rond.
        if (!etat.g.x && !etat.d.x) {
            return refus('Il n\'y a plus de boîte : partager ne sert plus à rien.');
        }
        const e = copie(etat);
        COTES.forEach(c => { e[c].x /= n; e[c].u /= n; });
        return { ok: true, etat: e, ton: 'ok',
            dit: `Les deux plateaux partagés en ${n} : l'égalité tient toujours.` };
    }

    return refus('Geste inconnu.');
}

/**
 * LE CHEMIN LE PLUS COURT, en gestes de l'élève.
 *
 * Sert au robot de démonstration et à la barre d'auteur. On l'écrit ici, dans
 * le noyau testé, plutôt que dans l'écran : c'est de l'algèbre, pas du dessin.
 *
 * La stratégie est celle qu'on enseigne, dans cet ordre exact — d'abord
 * rassembler les boîtes d'un côté, puis les poids de l'autre, et partager en
 * dernier. Chaque `enlever` compte pour DEUX gestes, un par plateau.
 */
export function solution(etat) {
    const gestes = [];
    let e = copie(etat);
    const jouer = (g) => { const r = appliquer(e, g); if (r.ok) { e = r.etat; gestes.push(g); } return r.ok; };

    // ① Les boîtes en trop du côté qui en a le moins.
    const petit = e.g.x <= e.d.x ? 'g' : 'd';
    const nx = Math.min(e.g.x, e.d.x);
    if (nx > 0) {
        jouer({ geste: 'enlever', cote: petit, quoi: 'x', combien: nx });
        jouer({ geste: 'enlever', cote: AUTRE[petit], quoi: 'x', combien: nx });
    }
    // ② Les poids du côté où il reste les boîtes.
    const avecX = e.g.x ? 'g' : 'd';
    const nu = Math.min(e.g.u, e.d.u, e[avecX].u);
    if (nu > 0) {
        jouer({ geste: 'enlever', cote: avecX, quoi: 'u', combien: nu });
        jouer({ geste: 'enlever', cote: AUTRE[avecX], quoi: 'u', combien: nu });
    }
    // ③ Partager par le nombre de boîtes restantes.
    const k = e[avecX].x;
    if (k > 1) jouer({ geste: 'partager', en: k });
    return { gestes, coups: coups(gestes), etat: e, ok: !!resolu(e) };
}

/**
 * COMBIEN DE GESTES, ET PAS COMBIEN DE CLICS.
 *
 * Mesuré à l'écran : un élève qui résout « 3x + 3 = 2x + 8 » parfaitement,
 * en cliquant les jetons un par un, s'entendait dire « tu y es en 10 gestes ;
 * il en suffisait de 4 ». C'était faux et décourageant — il avait fait
 * exactement les quatre gestes attendus, en dix clics.
 *
 * Un COUP est donc une transformation achevée de l'équation : un rééquilibrage
 * complet (enlever la même chose des deux côtés, quel que soit le nombre de
 * clics) ou un partage. C'est l'unité qu'on compte au tableau.
 */
export function coups(gestes) {
    const partages = gestes.filter(g => g.geste === 'partager').length;
    const enleve = gestes.length - partages;
    return partages + Math.ceil(enleve / 2);
}

// --- La progression ---------------------------------------------------------

/**
 * QUATRE FAMILLES, ET ELLES SE COCHENT DANS LES RÉGLAGES.
 *
 * Elles ne sont pas quatre décors autour du même exercice : chacune ajoute UN
 * geste, et un seul, à la précédente. C'est ce qui permet à un professeur de
 * s'arrêter là où sa classe en est.
 */
export const FAMILLES = {
    unites: { label: 'Enlever des poids', aide: 'x + 3 = 8 — un seul geste, des deux côtés.' },
    partage: { label: 'Partager en parts égales', aide: '3x = 12 — on coupe la balance en trois.' },
    deuxTemps: { label: 'Enlever puis partager', aide: '2x + 5 = 17 — dans cet ordre, et pas l\'autre.' },
    deuxCotes: { label: 'Des boîtes des deux côtés', aide: '4x + 2 = x + 14 — on les rassemble d\'abord.' }
};

export const ORDRE_FAMILLES = ['unites', 'partage', 'deuxTemps', 'deuxCotes'];

/**
 * LES NIVEAUX SONT DES FORMES, PAS DES ÉQUATIONS FIGÉES.
 *
 * L'organigramme des quadrilatères ne se tire pas au sort — c'est une
 * hiérarchie, elle est ce qu'elle est. Une équation, si : refaire deux fois
 * « x + 3 = 8 » n'apprend rien, alors que refaire deux fois la même FORME avec
 * d'autres nombres est exactement ce qu'on demande en contrôle. Chaque niveau
 * décrit donc des bornes, et les nombres se tirent — le tirage est déterministe
 * pour une graine donnée, ce qui rend la progression reproductible en test.
 */
export const NIVEAUX = [
    { famille: 'unites', titre: 'x + b = c', a: 1, b: [2, 6], k: [2, 7], c: 0, d: null },
    { famille: 'unites', titre: 'x + b = c, plus grand', a: 1, b: [5, 12], k: [4, 15], c: 0, d: null },
    { famille: 'partage', titre: 'ax = c', a: [2, 4], b: 0, k: [2, 8], c: 0, d: null },
    { famille: 'partage', titre: 'ax = c, plus grand', a: [3, 6], b: 0, k: [4, 12], c: 0, d: null },
    { famille: 'deuxTemps', titre: 'ax + b = c', a: [2, 3], b: [1, 5], k: [2, 7], c: 0, d: null },
    { famille: 'deuxTemps', titre: 'ax + b = c, plus grand', a: [2, 5], b: [3, 10], k: [3, 10], c: 0, d: null },
    { famille: 'deuxTemps', titre: 'ax + b = c, à cinq', a: [4, 6], b: [2, 12], k: [2, 9], c: 0, d: null },
    { famille: 'deuxCotes', titre: 'ax + b = cx + d', a: [3, 5], b: [1, 4], k: [2, 6], c: [1, 2], d: null },
    { famille: 'deuxCotes', titre: 'ax + b = cx + d, plus serré', a: [4, 7], b: [2, 8], k: [2, 8], c: [2, 4], d: null },
    { famille: 'deuxCotes', titre: 'ax + b = cx + d, pour finir', a: [5, 9], b: [3, 12], k: [3, 10], c: [3, 6], d: null }
];

const tire = (rng, v) => (Array.isArray(v) ? rng.int(v[0], v[1]) : v);

/**
 * FABRIQUER UNE ÉQUATION VRAIE, ET SOLUBLE SANS NÉGATIF.
 *
 * Trois exigences, et la troisième est celle qu'on oublie : `a > c` (sinon les
 * boîtes ne se rassemblent pas du bon côté), la solution `k` entière et
 * positive, et `d = (a − c)·k + b` — qui est simplement l'équation résolue à
 * l'envers. On ne tire donc jamais `d` : on le calcule, et l'équation est juste
 * par construction plutôt que par vérification.
 */
export function preparerNiveau(i, rng) {
    const n = NIVEAUX[Math.max(0, Math.min(NIVEAUX.length - 1, i | 0))];
    const c = tire(rng, n.c);
    let a = tire(rng, n.a);
    if (a <= c) a = c + 1;
    const b = tire(rng, n.b);
    const k = tire(rng, n.k);
    const d = (a - c) * k + b;
    return {
        indice: i, titre: n.titre, famille: n.famille,
        equation: { a, b, c, d }, solution: k,
        etat: etatInitial({ a, b, c, d })
    };
}

/** Les rangs de niveaux compatibles avec les familles cochées. */
export function niveauxDisponibles(familles) {
    const ok = new Set(familles && familles.length ? familles : ORDRE_FAMILLES);
    return NIVEAUX.map((n, i) => (ok.has(n.famille) ? i : -1)).filter(i => i >= 0);
}

/**
 * LA CONSIGNE NE DONNE PAS LA MÉTHODE.
 *
 * Rémy, sur un exercice précédent : « tu donnes les réponses dans l'énoncé ».
 * La même règle vaut ici — « enlève 3 des deux côtés, puis partage en 2 » ne
 * laisserait rien à trouver. On dit le but, et le but seul.
 */
export const CONSIGNE = 'Trouve ce que pèse la boîte : amène-la seule sur un plateau, '
    + 'sans jamais rompre l\'équilibre.';
