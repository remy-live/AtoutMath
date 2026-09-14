// Générateur du PÉRIMÈTRE ET DE L'AIRE DU DISQUE.
//
// Rémy : « un exercice sur le périmètre et l'aire du disque : au départ on
// donne la valeur exacte, faire des QCM après. Et après on a le droit à la
// calculatrice pour pouvoir calculer la valeur approchée. »
//
// SIX ÉTAPES, ET LA COUPURE EST AU MILIEU. Les quatre premières demandent une
// valeur EXACTE — « 25π cm² » —, les deux dernières une valeur ARRONDIE, et
// c'est là que la calculatrice sert.
//
// LA VALEUR EXACTE SE TAPE MAINTENANT. Elle ne se choisissait qu'en
// propositions, et le commentaire disait pourquoi : « aucun clavier de chiffres
// ne permet de taper 25π ». Rémy : « Au départ quand tu utilises le pavé
// numérique, demande une valeur exacte (rajoute le Pi) en symbole. » Le pavé
// porte donc une touche π (`meta.pi`), et la contrainte tombe — avec elle, le
// principal défaut de l'exercice : reconnaître « 25π » dans une liste de
// quatre n'est pas l'écrire, et c'est l'écrire qu'on demande en contrôle.
//
// UNE SEULE ÉTAPE RESTE EN PROPOSITIONS, et pour une autre raison : « Quelle
// formule ? » attend « 2 × π × r », qui n'est pas un nombre. Le réglage
// « Réponse » gouverne les cinq autres.

import { makeItem } from '../items.js';
import { figure } from '../figures.js';
import {
    MARCHES_DISQUE, ETAPES_EXACTES, tirerDisque, enonceDe, reponseDe, uniteDe,
    expliquer, indicesDe, leurresDe, figureDisqueSvg, ecrireNombre,
    diagnosticsArrondi, RAPPEL_PI_HTML
} from '../disque.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe,
    valeurParMarche
} from '../progression.js';

const SKILL_PERIMETRE = 'mes.perimetre.disque';
const SKILL_AIRE = 'mes.aire.disque';
const MOT = 'étape';

const DIFFICULTE = {
    formule: 1, 'perimetre-exact': 2, 'aire-exacte': 2,
    diametre: 3, 'perimetre-arrondi': 3, 'aire-arrondie': 4
};

export const disqueGenerator = {
    id: 'mes.disque',
    label: 'Périmètre et aire du disque',
    skills: [SKILL_PERIMETRE, SKILL_AIRE],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_DISQUE).length),
    params: [
        paramMarches({ marches: MARCHES_DISQUE, mot: MOT }),
        {
            id: 'reponse', type: 'select', label: 'Réponse', papier: false,
            parMarche: true,
            aide: 'Le pavé porte une touche π : une valeur exacte comme « 25π » se tape. '
                + 'Seule l\'étape « Quelle formule ? » reste en propositions — elle attend '
                + 'une formule, pas un nombre.',
            options: [
                { value: 'saisie', label: 'À saisir (clavier de nombres)', court: 'Clavier', clavier: true },
                { value: 'choix', label: 'À choisir parmi quatre', court: '4' }
            ],
            default: 'saisie'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES_DISQUE),
            totalDe(ctx, params), params);
        const t = tirerDisque(rng, id);

        // « QUELLE FORMULE ? » N'EST PAS UNE QUESTION CHIFFRÉE : sa réponse est
        // « 2 × π × r ». Elle reste en propositions quel que soit le réglage.
        const auChoix = id === 'formule'
            || valeurParMarche(params, 'reponse', id, 'saisie') === 'choix';
        // CE QU'ON TAPE, C'EST LE NOMBRE ET SON π ; l'unité s'affiche à côté de
        // l'écran du pavé, comme sur toutes les autres questions chiffrées.
        const exactAuClavier = !auChoix && ETAPES_EXACTES.includes(id);
        const juste = exactAuClavier ? t.exactNu : reponseDe(t);
        const unite = exactAuClavier
            ? (t.surLAire ? `${t.unite}²` : t.unite)
            : uniteDe(t);
        const etiquette = (v) => (typeof v === 'number' ? `${ecrireNombre(v)} ${unite}` : String(v));

        const enonce = enonceDe(t);
        const figureSvg = figureDisqueSvg(t);

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.disque',
            skillId: t.surLAire ? SKILL_AIRE : SKILL_PERIMETRE,
            answerKind: auChoix ? 'choice' : 'numeric',
            prompt: {
                text: enonce,
                papier: enonce,
                html: `<div class="game-question dsq-question">${enonce}</div>${figure(figureSvg)}`
            },
            answer: juste,
            choices: auChoix ? [
                { value: juste, label: etiquette(juste), correct: true },
                ...leurresDe(t).slice(0, 3).map(l => ({
                    value: l.value, label: etiquette(l.value), correct: false, why: l.why
                }))
            ] : null,
            // L'ERREUR D'ARRONDI SE NOMME, quand elle vient. Voir
            // `diagnosticsArrondi` : ces valeurs ne s'affichent jamais.
            diagnostics: auChoix ? null : diagnosticsArrondi(t),
            hints: indicesDe(t),
            explanation: expliquer(t),
            difficulty: DIFFICULTE[id] || 2,
            meta: {
                marche: id, titre: (MARCHES_DISQUE.find(m => m.id === id) || {}).nom,
                r: t.r, d: t.d, coefficient: t.coefficient, surLAire: t.surLAire,
                exact: t.exact, arrondi: t.arrondi, decimales: t.decimales,
                // LE RAPPEL DE π, À PORTÉE DE POUCE. Rémy : « Rappelle la
                // valeur de Pi au départ. » Il est là à chaque étape : c'est
                // une constante, elle ne donne jamais la réponse.
                outils: [{ id: 'pi', label: 'π  La valeur de π', html: RAPPEL_PI_HTML }],
                // LA TOUCHE π DU PAVÉ, sur les étapes où l'on tape une valeur
                // exacte — et sur elles seules : une touche inutilisable
                // laisserait croire qu'on attend un π dans un arrondi.
                pi: exactAuClavier,
                // LE PAVÉ MONTRE L'UNITÉ, ET LA VIRGULE QUAND ELLE SERT : au
                // dixième pour un périmètre, jamais pour une aire qu'on arrondit
                // à l'unité.
                unit: unite,
                // ET LA FIGURE A LA SIENNE, QUI N'EST PAS CELLE-LÀ.
                //
                // `unit` est l'unité de la RÉPONSE — des centimètres carrés
                // quand on demande une aire. La cote portée sur le rayon mesure
                // une LONGUEUR, et n'a donc jamais de carré. La fiche imprimée
                // n'avait que `unit` sous la main et écrivait « 18 cm² » le
                // long du rayon ; Rémy : « sur le polycopié, tu marques 18 cm²
                // pour la longueur du rayon ou diamètre ». Un rayon de dix-huit
                // centimètres carrés n'existe pas, et c'est précisément la
                // confusion aire / longueur que le chapitre entier travaille à
                // défaire.
                uniteLongueur: t.unite,
                decimal: !ETAPES_EXACTES.includes(id) && t.decimales > 0,
                figure: figureSvg
            }
        });
    }
};
