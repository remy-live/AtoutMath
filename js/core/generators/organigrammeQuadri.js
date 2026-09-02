// L'ORGANIGRAMME DES QUADRILATÈRES, SUR PAPIER.
//
// Rémy, sur sa fiche : cinq cases de figures, treize cartes de conditions, et
// plusieurs flèches qui arrivent sur la même case. Il l'a demandé pour le PDF —
// c'est la feuille qu'on colle dans le cahier de leçons, et celle qu'on remplit
// une fois pour l'année.
//
// À L'ÉCRAN ON GLISSE DES CARTES ; SUR LE PAPIER ON ÉCRIT UNE LETTRE. Découper
// treize étiquettes et les coller n'est pas une leçon de géométrie, c'est une
// heure de ciseaux. Chaque condition porte donc une lettre dans une liste
// donnée en désordre, et l'élève reporte la lettre dans la petite case posée
// sur la flèche. La correction se lit d'un coup d'œil, et la feuille se refait.
//
// ET LES LETTRES CHANGENT D'UNE COPIE À L'AUTRE. Rémy : « l'organigramme des
// quadrilatères est toujours le même ». Il l'est — c'est une hiérarchie, elle
// ne se tire pas au sort —, mais l'ORDRE de la liste, lui, se mélange. Deux
// voisins n'ont donc pas les mêmes lettres aux mêmes endroits, et la feuille de
// l'un ne se recopie pas sur celle de l'autre.

import { makeItem } from '../items.js';
import { FLECHES, FAMILLES, cleFleche, familleDe } from '../quadrilateres.js';

/** A, B, C… — autant de lettres que de conditions. */
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const organigrammeQuadriGenerator = {
    id: 'geo.quadrilateres.organigramme',
    label: 'L\'organigramme des quadrilatères',
    skills: ['geo.quadrilateres.familles'],
    answerKinds: ['figure'],
    params: [
        {
            // LES VIGNETTES À DÉCOUPER — la troisième page de la fiche de Rémy.
            //
            // « Pour l'organigramme, j'aimerais aussi inclure les vignettes de
            // propriétés. On part du quadrilatère et pour aller au
            // parallélogramme, on glisse la vignette côtés opposés parallèles ;
            // on peut faire bloc par bloc. »
            //
            // C'EST UN AUTRE GESTE, PAS UN AUTRE EXERCICE. Reporter une lettre
            // se fait au stylo, seul, en dix minutes ; glisser une carte se fait
            // à deux, on la retourne, on l'essaie ailleurs, on discute. Le
            // second coûte une heure de ciseaux — c'est pourquoi il reste un
            // choix, et non le défaut.
            id: 'vignettes', type: 'checkbox', label: 'Des vignettes à découper',
            default: false,
            aide: 'La liste des lettres devient une planche de cartes à découper, '
                + 'une par flèche, à coller dans les cases du plan. Les cartes se '
                + 'touchent : quelques coups de ciseau droits suffisent à débiter la '
                + 'planche.'
        },
        {
            id: 'noms', type: 'checkbox', label: 'Donner le nom des figures',
            default: true,
            aide: 'Décoché, les cinq cases sont vides elles aussi : l\'élève doit les nommer '
                + 'avant de placer les conditions. C\'est la même feuille, en plus exigeant — '
                + 'et c\'est ainsi qu\'on la donne en révision.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};

        // NEUF CONDITIONS POUR TREIZE FLÈCHES, ET C'EST TOUT L'INTÉRÊT.
        //
        // « Un angle droit » mène du parallélogramme au rectangle ET du losange
        // au carré ; « les diagonales ont la même longueur » fait la paire
        // symétrique. Quatre des treize conditions servent donc deux fois. La
        // liste ne les répète pas : elle donne les NEUF énoncés distincts, et
        // une même lettre se reporte à deux endroits.
        //
        // Une liste de treize aurait été plus simple à écrire et FAUSSE à
        // corriger : l'élève qui met la lettre de l'un des deux jumeaux aurait
        // eu juste, et l'exercice aurait eu deux réponses. Surtout, elle aurait
        // laissé croire à une correspondance une-pour-une, alors que le fait
        // qu'une condition serve deux fois est précisément ce que
        // l'organigramme enseigne.
        const distincts = [];
        FLECHES.forEach(f => { if (!distincts.includes(f.ajoute)) distincts.push(f.ajoute); });
        const liste = rng.shuffle(distincts.slice()).map((texte, rang) => ({
            lettre: LETTRES[rang], texte,
            // Toutes les flèches que cette condition ouvre : le corrigé s'en sert.
            cles: FLECHES.filter(f => f.ajoute === texte).map(cleFleche)
        }));
        const parCle = {};
        liste.forEach(l => l.cles.forEach(c => { parCle[c] = l.lettre; }));

        const avecNoms = p.noms !== false;
        const doublons = liste.filter(l => l.cles.length > 1).length;

        // LA PLANCHE : UNE CARTE PAR FLÈCHE, ET NON PAR ÉNONCÉ.
        //
        // Neuf énoncés, treize flèches : quatre conditions servent deux fois.
        // Sur le papier des lettres, une même lettre se reporte à deux endroits
        // et c'est la leçon. Avec des cartes, ON NE PEUT PAS COLLER LA MÊME
        // CARTE DEUX FOIS — il en faut donc treize, dont quatre paires de
        // jumelles. C'est aussi ce que montre la planche de Rémy.
        //
        // Elles sont MÉLANGÉES : rangées dans l'ordre du plan, la première
        // carte de la planche irait dans la première case, et l'exercice se
        // ferait sans lire.
        const avecVignettes = !!p.vignettes;
        const vignettes = avecVignettes
            // LE LIBELLÉ COURT, ET NON LA PHRASE ENTIÈRE. « Qui a ses côtés
            // opposés parallèles » ne tient pas dans une carte de deux
            // centimètres sans devenir illisible ; « côtés opposés parallèles »
            // si. Et c'est déjà le vocabulaire des cartes qu'on glisse à
            // l'écran (`court`, partagé avec quadriMorph) : la carte qu'on
            // découpe dit donc exactement ce que dit la carte qu'on déplace.
            ? rng.shuffle(FLECHES.map(f => ({
                cle: cleFleche(f), texte: f.court || f.ajoute, famille: f.famille
            })))
            : null;

        const consigne = avecVignettes
            ? (avecNoms
                ? 'Découpe les vignettes et colle chacune dans la case posée sur sa flèche.'
                : 'Écris d\'abord le nom des cinq figures, puis découpe les vignettes et '
                    + 'colle chacune dans la case posée sur sa flèche.')
                + ` Il y a ${FLECHES.length} vignettes pour ${FLECHES.length} cases`
                + `${doublons ? ' — et certaines se ressemblent deux à deux : c\'est normal, '
                    + 'une même condition ouvre deux portes' : ''}.`
            : (avecNoms
                ? 'Reporte la lettre de chaque condition dans la case posée sur sa flèche.'
                : 'Écris d\'abord le nom des cinq figures, puis reporte la lettre de chaque '
                    + 'condition dans la case posée sur sa flèche.')
                + ` Attention : il y a ${liste.length} conditions pour ${FLECHES.length} flèches`
                + `${doublons ? ' — certaines lettres servent DEUX FOIS' : ''}.`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.quadrilateres.organigramme',
            skillId: 'geo.quadrilateres.familles',
            answerKind: 'figure',
            prompt: { text: consigne, papier: consigne },
            // La réponse écrite : les treize lettres, dans l'ordre de lecture de
            // l'organigramme. Elle ne sert qu'au journal ; la vraie correction
            // est la feuille de solutions, qui redessine la figure remplie.
            answer: FLECHES.map(f => parCle[cleFleche(f)]).join(''),
            explanation: 'Chaque flèche descend d\'un cran en ajoutant UNE condition. '
                + 'Plusieurs conditions peuvent mener au même endroit : trois façons '
                + 'd\'être un parallélogramme, deux d\'être un rectangle. Et l\'on arrive '
                + 'au carré par deux chemins, chacun apportant ce que l\'autre avait déjà.',
            difficulty: avecNoms ? 3 : 4,
            meta: {
                liste, parCle, avecNoms, vignettes,
                familles: FAMILLES.map(f => f.id),
                // De quoi écrire la correction sans relire le noyau.
                solution: FLECHES.map(f => ({
                    cle: cleFleche(f), lettre: parCle[cleFleche(f)],
                    texte: f.ajoute, famille: f.famille,
                    de: familleDe(f.de).nom, vers: familleDe(f.vers).nom
                }))
            }
        });
    }
};
