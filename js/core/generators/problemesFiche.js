// HISTOIRES EN PAGAILLE — sur le papier.
//
// C'est l'exercice qui appelle le plus la feuille : un problème se relit, se
// souligne, se schématise dans la marge. À l'écran on choisit parmi quatre
// propositions ; sur le papier on écrit, et c'est plus exigeant — reconnaître
// la bonne réponse dans une liste n'est pas la trouver.
//
// LA FAMILLE N'EST JAMAIS NOMMÉE SUR LA FEUILLE. « Réunir deux quantités (+) »
// donnerait l'opération avant la lecture, et c'est exactement ce que la
// pagaille des familles cherche à empêcher : l'élève doit décider lui-même si
// c'est une addition ou une division.

import { makeItem } from '../items.js';
import { famillesDe, tirerProbleme, direReponse } from '../problemes.js';

/**
 * LE SCHÉMA, DIT EN UNE PHRASE.
 *
 * À l'écran, la situation est DESSINÉE — barres, flèche, tableau. Sur la
 * feuille de solutions, il n'y a que du texte ; on décrit donc le dessin assez
 * précisément pour que le professeur le refasse au tableau et que l'élève le
 * reconnaisse. Ce n'est pas une paraphrase de l'énoncé : c'est la STRUCTURE,
 * c'est-à-dire ce que le problème avait à faire voir.
 */
export function direSchema(s) {
    if (!s) return '';
    const v = (x) => String(x ?? '?');
    // Ce que le dessin laisse EN POINTILLÉS, la phrase doit le dire avec des
    // mots : « le tout vaut ? » ne se lit pas, « le tout est cherché » se lit.
    const cherche = (x) => v(x) === '?';
    switch (s.genre) {
        case 'barres': {
            const parts = s.parts.map(p => cherche(p.n)
                ? `une part cherchée${p.nom ? ` (${p.nom})` : ''}`
                : `${v(p.n)}${p.nom ? ` (${p.nom})` : ''}`).join(' et ');
            return `Schéma en barres : le tout ${cherche(s.total) ? 'est cherché' : `vaut ${v(s.total)}`}, `
                + `et il est fait de ${parts}.`;
        }
        case 'comparaison':
            return `Deux barres alignées à gauche : ${s.lignes.map(l =>
                `${l.nom} ${cherche(l.val) ? '(cherché)' : v(l.val)}`).join(', ')} — `
                + `l'écart entre les deux bouts mesure ${v(s.ecart)}.`;
        case 'fleche':
            return `Flèche de transformation : ${cherche(s.debut) ? 'départ cherché' : `${v(s.debut)} au départ`}, `
                + `${cherche(s.fleche) ? 'transformation cherchée' : v(s.fleche)}, `
                + `${cherche(s.fin) ? 'arrivée cherchée' : `${v(s.fin)} à l'arrivée`}.`;
        case 'groupes': {
            const nom = s.nomGroupes || `${s.nomGroupe}s`;
            return `Une bande de ${v(s.n)} ${nom} de ${cherche(s.par) ? 'contenu cherché' : v(s.par)} ${v(s.nomObjet)}`
                + (Number(s.reste) > 0 ? `, plus un reste de ${v(s.reste)}` : '')
                + `, pour ${s.total != null ? v(s.total) : '?'} en tout.`;
        }
        case 'tableau':
            return `Tableau de proportionnalité (${s.entetes.join(' / ')}) : `
                + s.lignes.map(l => l.join(' → ')).join(' ; ') + '.';
        case 'fractionBarre':
            return `Une barre de ${v(s.total)} coupée en ${v(s.den)} parts égales de ${v(s.par)} ; `
                + `on en prend ${v(s.num)}.`;
        case 'ligne':
            return `Ligne du temps : de ${v(s.debut)} à ${v(s.fin)}, par un saut de ${v(s.saut)}.`;
        case 'etapes':
            return `Deux étapes : ${s.lignes.map(l => `${l.titre} — ${l.calcul}`).join(' ; ')}.`;
        default: return '';
    }
}

/**
 * LA CORRECTION D'UN PROBLÈME NE PEUT PAS ÊTRE UN NOMBRE.
 *
 * Elle disait « Réponse : 41 timbres. », c'est-à-dire exactement ce que la
 * ligne du dessus venait d'écrire. Rémy : « pour la solution détaillée, il
 * faudrait détailler, quitte à faire un schéma ». Chaque problème porte déjà
 * son raisonnement pas à pas et la description de son schéma : on les imprime.
 */
export function detailler(pb) {
    const lignes = [
        direSchema(pb.schema),
        ...(pb.etapes || []).map(e => String(e).trim())
    ].filter(Boolean);
    return lignes.length ? lignes.join('\n') : `Réponse : ${direReponse(pb, pb.reponse)}.`;
}

export const problemesFicheGenerator = {
    id: 'num.problemes-fiche',
    label: 'Problèmes en une ou deux étapes',
    // Au singulier, et par famille : `num.probleme.composition`,
    // `.transformation`, `.comparaison`… Le pluriel n'a jamais existé.
    skills: ['num.probleme.*'],
    answerKinds: ['numeric'],
    ecrit: true,
    // La famille « fraction d'une quantité » écrit « les 2/5 sont abîmés » :
    // sur le papier, cela se compose en colonne, numérateur sur dénominateur.
    // La barre oblique est une commodité d'écran.
    fractions: true,
    params: [
        {
            id: 'niveau', type: 'select', label: 'Familles proposées', default: 'tout',
            options: [
                { value: 'tout', label: 'Toutes les familles' },
                { value: 'CM2', label: 'CM2 — réunir, changer, comparer, grouper' },
                { value: '6ème', label: '6ème' },
                { value: '5ème', label: '5ème — proportionnalité, durées, deux étapes' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = (params || {});
        const choisies = (Array.isArray(p.familles) && p.familles.length)
            ? p.familles
            : famillesDe(p.niveau === 'tout' ? null : p.niveau);
        // Un filet : une famille inconnue ne doit pas vider la fiche.
        const dispo = choisies.length ? choisies : famillesDe(null);

        let pb = null;
        for (let essai = 0; essai < 12 && !pb; essai++) {
            pb = tirerProbleme(rng.pick(dispo), rng);
        }
        if (!pb) pb = tirerProbleme(famillesDe(null)[0], rng);

        const texte = `${pb.enonce} ${pb.question}`;
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.problemes-fiche',
            skillId: pb.skill || 'num.problemes',
            answerKind: 'numeric',
            prompt: { text: texte, papier: texte, html: `<div class="game-question">${texte}</div>` },
            answer: direReponse(pb, pb.reponse),
            choices: pb.choix.map(c => ({ value: direReponse(pb, c.v), correct: !!c.juste })),
            explanation: detailler(pb),
            difficulty: pb.etapes === 2 ? 3 : 2,
            meta: { famille: pb.famille, unite: pb.unite || '', reponse: pb.reponse }
        });
    }
};
