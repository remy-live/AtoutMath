// LE DÉTOUR PAR LE NOMBRE ROND — 76 + 9, c'est 76 + 10 − 1.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai bien des exercices de calcul mentaux du genre 76 + 9 ou
// 76 + 99 ou 156 − 9 ou 156 − 99, il faut que l'élève comprenne qu'on retire
// un et qu'on ajoute 10 (en tout cas pour le 9), etc ».
//
// CE QU'IL DEMANDE N'EST PAS « CALCULE 76 + 9 ». C'est la STRATÉGIE : le
// résultat n'est que la preuve qu'on l'a employée. Un exercice qui ne
// demanderait que le résultat laisserait l'élève poser son addition en colonne
// dans sa tête — ce qu'il fait déjà, et qui n'est pas ce qu'on travaille.
//
// LA DIFFICULTÉ EST À UN POINT PRÉCIS, ET C'EST LE RENVERSEMENT :
//
//     76 + 9    →   + 10   puis   − 1
//     156 − 9   →   − 10   puis   + 1
//
// La compensation change de sens avec l'opération. Un élève qui a compris
// « pour 9, on ajoute 10 et on retire 1 » applique la même phrase à la
// soustraction et tombe sur 145 au lieu de 147. C'est l'erreur du chapitre,
// elle est régulière, et c'est elle que les marches 3 et 5 travaillent seules.
//
// LE « ETC » DE SA PHRASE COMPTE AUSSI : la méthode ne vaut pas que pour 9.
// 8 = 10 − 2, 11 = 10 + 1, 98 = 100 − 2, 101 = 100 + 1. La dernière marche
// ouvre à ces voisins, parce qu'une stratégie qu'on n'applique qu'à un seul
// nombre n'est pas une stratégie, c'est une recette.
//
// ── CE QUI SE DESSINE, PARCE QUE ÇA NE S'ÉCRIT PAS ────────────────────────
//
// RÉMY, la veille : « une aide doit être visuelle et pas trop longue en
// explication ». Le détour EST une image — un grand saut, puis un petit pas en
// arrière — et la droite graduée la montre d'un coup d'œil là où trois phrases
// n'y arrivent pas. Le deuxième indice porte donc un schéma (`schemas`), ce
// que le logiciel sait faire depuis longtemps et que seuls dix générateurs sur
// quatre-vingt-dix-sept utilisaient.
//
// Tout ce fichier est pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.calc.detour';

// ── LES NOMBRES PRESQUE RONDS ──────────────────────────────────────────────
//
// `ecart` est ce qu'on fait APRÈS le détour, avec son signe : 9 = 10 − 1 donc
// l'écart vaut −1 ; 11 = 10 + 1 donc +1. C'est exactement le nombre que
// l'élève doit retrouver, et tout le reste s'en déduit.
export const VOISINS = [
    { n: 9, rond: 10, ecart: -1 },
    { n: 99, rond: 100, ecart: -1 },
    { n: 8, rond: 10, ecart: -2 },
    { n: 98, rond: 100, ecart: -2 },
    { n: 11, rond: 10, ecart: 1 },
    { n: 101, rond: 100, ecart: 1 },
    { n: 19, rond: 20, ecart: -1 },
    { n: 21, rond: 20, ecart: 1 }
];

/** Le voisin d'un nombre : 9 → 10 − 1. */
export const voisinDe = (n) => VOISINS.find(v => v.n === n) || null;

/**
 * CE QU'ON FAIT APRÈS LE DÉTOUR, SIGNE COMPRIS.
 *
 * C'est la seule ligne de ce fichier qui porte la règle, et elle tient en une
 * multiplication : pour une ADDITION on applique l'écart tel quel, pour une
 * SOUSTRACTION on l'applique à l'envers. 76 + 9 = 76 + 10 − 1 ; 156 − 9 =
 * 156 − 10 + 1.
 */
export function correction(voisin, op) {
    return op === '−' ? -voisin.ecart : voisin.ecart;
}

/** Le résultat, par le détour — et c'est aussi la vérification de la règle. */
export function parLeDetour(depart, voisin, op) {
    const grand = op === '−' ? depart - voisin.rond : depart + voisin.rond;
    return grand + correction(voisin, op);
}

/** Le même résultat, directement. On exige que les deux tombent d'accord. */
export function toutDroit(depart, voisin, op) {
    return op === '−' ? depart - voisin.n : depart + voisin.n;
}

/** La ligne du milieu, celle qu'on veut voir écrite : « 76 + 10 − 1 ». */
export function ligneDuMilieu(depart, voisin, op) {
    const c = correction(voisin, op);
    return `${depart} ${op} ${voisin.rond} ${c < 0 ? '−' : '+'} ${Math.abs(c)}`;
}

/** Le calcul tel qu'il est posé à l'élève : « 76 + 9 ». */
export const calculEcrit = (depart, voisin, op) => `${depart} ${op} ${voisin.n}`;

// ── LE DESSIN ──────────────────────────────────────────────────────────────

/**
 * LA DROITE GRADUÉE DU DÉTOUR : un grand saut, puis un petit pas en arrière.
 *
 * TROIS POINTS SEULEMENT, ET PAS À L'ÉCHELLE. Une droite à l'échelle mettrait
 * le petit pas à un pixel du grand saut — c'est-à-dire invisible, alors que
 * c'est LUI qu'on travaille. L'image est donc un schéma : le grand saut est
 * long, le petit pas est court, et leurs étiquettes disent les vrais nombres.
 *
 * Les couleurs sont des jetons du thème, jamais des codes écrits à la main :
 * la carte d'aide s'affiche dans les cinq thèmes, dont deux sombres.
 */
export function detourSvg(depart, voisin, op) {
    const grand = op === '−' ? depart - voisin.rond : depart + voisin.rond;
    const c = correction(voisin, op);
    const fin = grand + c;
    // TROIS ABSCISSES, PAS À L'ÉCHELLE : le petit pas serait invisible sinon.
    const [xA, xB, xC] = [55, 335, 250];
    const y = 58;
    const mx = (xB + xC) / 2;

    const pastille = (x, texte, couleur) =>
        `<circle cx="${x}" cy="${y}" r="6" fill="${couleur}"/>`
        + `<text x="${x}" y="${y + 28}" text-anchor="middle" font-size="17" `
        + `font-weight="800" fill="currentColor">${texte}</text>`;

    const marqueur = (nom, couleur) =>
        `<marker id="${nom}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" `
        + `markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${couleur}"/></marker>`;

    return `<svg viewBox="0 0 390 128" width="100%" style="max-width:390px" `
        + `role="img" aria-label="${depart} ${op} ${voisin.rond} donne ${grand}, `
        + `puis ${c < 0 ? 'moins' : 'plus'} ${Math.abs(c)} donne ${fin}">`
        + `<defs>${marqueur('det-grand', 'var(--primary)')}`
        + `${marqueur('det-petit', 'var(--warning)')}</defs>`
        + `<line x1="18" y1="${y}" x2="372" y2="${y}" stroke="currentColor" `
        + `stroke-width="2" opacity=".3"/>`
        // LE GRAND SAUT PASSE AU-DESSUS, LE PETIT PAS EN DESSOUS.
        //
        // Vu sur la photo (tools/tmp/detour-schema.png) : les deux arcs
        // tracés du même côté, la grande courbe traversait l'étiquette du
        // petit pas — « − 1 » se lisait « + ». Deux gestes contraires de part
        // et d'autre de la droite, c'est aussi ce qu'ils SONT.
        // ET L'ÉTIQUETTE PASSE AU-DESSUS DE SON ARC, pas dessus. Deuxième
        // photo : « + 10 » tombait pile sur le sommet de la courbe, à un
        // pixel près — un arc de Bézier culmine à la MOITIÉ de la hauteur de
        // son point de contrôle, pas à sa hauteur.
        + `<path d="M ${xA} ${y - 9} Q ${(xA + xB) / 2} ${y - 54} ${xB} ${y - 9}" `
        + `fill="none" stroke="var(--primary)" stroke-width="3" marker-end="url(#det-grand)"/>`
        + `<text x="${(xA + xB) / 2}" y="${y - 40}" text-anchor="middle" font-size="16" `
        + `font-weight="800" fill="var(--primary)">${op} ${voisin.rond}</text>`
        + `<path d="M ${xB} ${y + 9} Q ${mx} ${y + 40} ${xC} ${y + 9}" fill="none" `
        + `stroke="var(--warning)" stroke-width="3" marker-end="url(#det-petit)"/>`
        + `<text x="${mx}" y="${y + 48}" text-anchor="middle" font-size="16" `
        + `font-weight="800" fill="var(--warning)">${c < 0 ? '−' : '+'} ${Math.abs(c)}</text>`
        + pastille(xA, depart, 'currentColor')
        + pastille(xB, grand, 'var(--primary)')
        + pastille(xC, fin, 'var(--warning)')
        + '</svg>';
}

// ── LES MARCHES ────────────────────────────────────────────────────────────

export const ETAPES = [
    // LA PREMIÈRE MARCHE VOIT TOUS LES VOISINS, et c'est son objet même :
    // trouver le nombre rond le plus proche. La limiter à 9 et 99 en ferait
    // une récitation — « 9 c'est 10 moins 1 » — au lieu d'un repérage.
    { id: 'voir-rond', temps: 'A', titre: 'Le nombre rond caché',
      voisins: [9, 99, 8, 98, 11, 101, 19, 21] },
    { id: 'ajouter', temps: 'A', titre: 'Ajouter 9 : et ensuite ?', op: '+', geste: true, voisins: [9, 99] },
    { id: 'retirer', temps: 'A', titre: 'Retirer 9 : et ensuite ?', op: '−', geste: true, voisins: [9, 99] },
    { id: 'milieu-plus', temps: 'B', titre: 'La ligne du milieu : ajouter', op: '+', milieu: true, voisins: [9, 99] },
    { id: 'milieu-moins', temps: 'B', titre: 'La ligne du milieu : retirer', op: '−', milieu: true, voisins: [9, 99] },
    { id: 'milieu-melange', temps: 'B', titre: 'La ligne du milieu, au hasard', milieu: true, voisins: [9, 99] },
    { id: 'calcul-plus', temps: 'C', titre: 'Ajouter 9 ou 99', op: '+', calcul: true, voisins: [9, 99] },
    { id: 'calcul-moins', temps: 'C', titre: 'Retirer 9 ou 99', op: '−', calcul: true, voisins: [9, 99] },
    { id: 'calcul-melange', temps: 'C', titre: 'Les deux, au hasard', calcul: true, voisins: [9, 99] },
    { id: 'calcul-voisins', temps: 'C', titre: 'Et aussi 8, 11, 98, 101', calcul: true, voisins: [8, 98, 11, 101, 19, 21] }
];

const TEMPS = {
    A: 'A — comprendre le détour',
    B: 'B — écrire la ligne du milieu',
    C: 'C — calculer de tête'
};

/** Un point de départ qui oblige à franchir la dizaine (ou la centaine). */
export function depart(rng, voisin, op) {
    // ON ÉVITE LE CAS OÙ LE DÉTOUR NE SERT À RIEN. « 72 + 9 » se fait très bien
    // sans stratégie quand l'élève sait ses compléments ; c'est le FRANCHISSEMENT
    // qui rend le détour payant, et c'est lui qu'on tire.
    const cent = voisin.rond >= 100;
    for (let essai = 0; essai < 40; essai++) {
        const d = cent ? rng.int(120, 480) : rng.int(23, 89);
        const r = op === '−' ? d - voisin.n : d + voisin.n;
        if (r <= 0) continue;
        // Le franchissement : les dizaines changent entre le départ et l'arrivée.
        if (Math.floor(d / 10) !== Math.floor(r / 10)) return d;
    }
    return cent ? 156 : 76;
}

export function question(etape, rng) {
    const choixVoisin = etape.voisins[rng.int(0, etape.voisins.length - 1)];
    const voisin = voisinDe(choixVoisin);
    const op = etape.op || (rng.bool() ? '+' : '−');

    // --- A1 : LE NOMBRE ROND CACHÉ -----------------------------------------
    if (etape.id === 'voir-rond') {
        return {
            enonce: `${voisin.n}`,
            // « 9, C'EST 10 ET COMBIEN ? » SE LIT MAL : « et » n'annonce pas
            // un nombre signé. On demande le DÉPLACEMENT, qui est exactement
            // ce qu'on veut lui faire voir.
            question: `De ${voisin.rond} à ${voisin.n}, je fais ?`,
            reponse: `${voisin.ecart < 0 ? '−' : '+'} ${Math.abs(voisin.ecart)}`,
            choix: ['− 1', '+ 1', '− 2', '+ 2'],
            pieges: [{
                value: `${voisin.ecart < 0 ? '+' : '−'} ${Math.abs(voisin.ecart)}`,
                why: `${voisin.rond} ${voisin.ecart < 0 ? '+' : '−'} ${Math.abs(voisin.ecart)} `
                    + `ferait ${voisin.rond - voisin.ecart}, pas ${voisin.n}.`
            }],
            pourquoi: `${voisin.n} = ${voisin.rond} ${voisin.ecart < 0 ? '−' : '+'} `
                + `${Math.abs(voisin.ecart)}.`,
            voisin, op: '+', depart: null
        };
    }

    const d = depart(rng, voisin, op);
    const c = correction(voisin, op);
    const juste = toutDroit(d, voisin, op);

    // --- A2 et A3 : LE GESTE, SANS NOMBRES ---------------------------------
    //
    // C'EST LA MARCHE QUI PORTE LE RENVERSEMENT, et elle ne demande aucun
    // calcul : « pour retirer 9, je retire 10 puis… ? ». Un élève qui répond
    // « je retire 1 » vient de montrer la faute du chapitre, et il l'a montrée
    // en trois secondes au lieu de la cacher dans un résultat faux.
    if (etape.geste) {
        const bon = `j'${c < 0 ? 'enlève' : 'ajoute'} ${Math.abs(c)}`;
        const faux = `j'${c < 0 ? 'ajoute' : 'enlève'} ${Math.abs(c)}`;
        return {
            enonce: `${op} ${voisin.n}`,
            question: `Je fais ${op} ${voisin.rond}, et ensuite ?`,
            reponse: bon,
            choix: [bon, faux],
            pieges: [{
                value: faux,
                why: op === '−'
                    ? `On a retiré ${voisin.rond}, donc ${Math.abs(c)} de TROP : il faut le rendre.`
                    : `On a ajouté ${voisin.rond}, donc ${Math.abs(c)} de trop : il faut l'enlever.`
            }],
            pourquoi: `${op} ${voisin.n}, c'est ${op} ${voisin.rond} puis `
                + `${c < 0 ? '−' : '+'} ${Math.abs(c)}.`,
            voisin, op, depart: d
        };
    }

    // --- B : LA LIGNE DU MILIEU --------------------------------------------
    if (etape.milieu) {
        const inverse = `${d} ${op} ${voisin.rond} ${c < 0 ? '+' : '−'} ${Math.abs(c)}`;
        const autreOp = `${d} ${op === '+' ? '−' : '+'} ${voisin.rond} ${c < 0 ? '−' : '+'} ${Math.abs(c)}`;
        return {
            enonce: calculEcrit(d, voisin, op),
            question: 'Par quoi je passe ?',
            reponse: ligneDuMilieu(d, voisin, op),
            pieges: [
                {
                    value: inverse,
                    why: `Celle-là donne ${d + (op === '−' ? -voisin.rond : voisin.rond) - c}. `
                        + (op === '−'
                            ? `On a retiré ${voisin.rond} au lieu de ${voisin.n} : il faut RENDRE.`
                            : `On a ajouté ${voisin.rond} au lieu de ${voisin.n} : il faut ENLEVER.`)
                },
                { value: autreOp, why: 'Le détour ne change pas l\'opération de départ.' }
            ],
            pourquoi: `${calculEcrit(d, voisin, op)} = ${ligneDuMilieu(d, voisin, op)} = ${juste}.`,
            voisin, op, depart: d
        };
    }

    // --- C : LE RÉSULTAT ---------------------------------------------------
    //
    // LES DEUX PIÈGES SONT LES DEUX MOITIÉS DU DÉTOUR RATÉES : on a sauté et
    // on a oublié de revenir, ou l'on est revenu du mauvais côté.
    return {
        enonce: calculEcrit(d, voisin, op),
        question: 'Calcule de tête.',
        reponse: juste,
        pieges: [
            {
                value: juste - c,
                why: `Tu t'es arrêté à ${juste - c} : c'est ${d} ${op} ${voisin.rond}. `
                    + 'Il reste le petit pas.'
            },
            {
                value: juste - 2 * c,
                why: `Le petit pas est parti du mauvais côté : ${c < 0 ? '−' : '+'} `
                    + `${Math.abs(c)}, pas ${c < 0 ? '+' : '−'} ${Math.abs(c)}.`
            }
        ],
        pourquoi: `${ligneDuMilieu(d, voisin, op)} = ${juste}.`,
        voisin, op, depart: d
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));

export const detourRondGenerator = {
    id: 'calc.detour',
    label: 'Le détour par le nombre rond',
    skills: [SKILL],
    answerKinds: ['choice'],
    // Le calcul se photocopie tel quel : aucune figure à dessiner sur la feuille.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);

        const choices = finalizeChoices(rng, [
            { value: q.reponse, label: String(q.reponse), correct: true },
            ...q.pieges.filter(p => String(p.value) !== String(q.reponse))
                .map(p => ({ ...p, label: String(p.value) })),
            ...(q.choix || []).filter(c => c !== q.reponse)
                .map(c => ({ value: c, label: String(c) }))
        ], etape.calcul
            ? { count: 4, filler: (r) => q.reponse + r.int(2, 12) * (r.bool() ? 1 : -1) }
            : { count: q.choix ? Math.min(4, q.choix.length) : 3 });

        // LE DESSIN NE SERT À RIEN SANS DÉPART : la marche « le nombre rond
        // caché » ne parle d'aucun calcul, il n'y a pas de saut à montrer.
        const schema = q.depart === null ? '' : detourSvg(q.depart, q.voisin, q.op);

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.detour',
            skillId: SKILL,
            answerKind: 'choice',
            prompt: {
                text: `${q.enonce} — ${q.question}`,
                papier: etape.calcul ? `${q.enonce} =` : `${q.enonce} : ${q.question}`,
                html: `<div class="game-question"><span class="lit-expr">${q.enonce}`
                    + (etape.calcul ? ' = ?' : '') + '</span>'
                    + (etape.calcul ? '' : `<span class="rel-q">${q.question}</span>`)
                    + '</div>'
            },
            answer: q.reponse,
            choices,
            hints: [
                `${q.voisin.n}, c'est ${q.voisin.rond} ${q.voisin.ecart < 0 ? '−' : '+'} `
                    + `${Math.abs(q.voisin.ecart)}.`,
                // LE DEUXIÈME INDICE EST UNE IMAGE, et sa phrase ne la répète
                // pas : elle dit où regarder, le dessin dit le reste.
                q.depart === null
                    ? `Compte depuis ${q.voisin.rond} : il manque ${Math.abs(q.voisin.ecart)}.`
                    : 'Le grand saut, puis le petit pas en arrière.'
            ],
            schemas: ['', schema],
            explanation: q.pourquoi,
            difficulty: etape.temps === 'A' ? 1 : etape.temps === 'B' ? 2 : 3,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                voisin: q.voisin.n, rond: q.voisin.rond, operation: q.op, depart: q.depart
            }
        });
    }
};

export default detourRondGenerator;
