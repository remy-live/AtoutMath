// LES FICHES DE REPRISE — vingt-six feuilles différentes, en un clic.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant la maquette : « Oui c'est génial ». Puis : « est-ce que Louis
// peut avoir un corrigé, ou ses parents ? »
//
// ── CE QUE CE FICHIER FABRIQUE ─────────────────────────────────────────────
//
// UN SEUL PDF, et c'est tout le propos : vingt-six fichiers à ouvrir un par un
// ne se distribuent pas un lundi matin. Dedans, dans cet ordre :
//
//   1. la feuille de chaque élève — ses notions à lui, ses questions à lui ;
//   2. puis LA PILE DU PROFESSEUR : un corrigé par élève, dans le même ordre,
//      pour ramasser et corriger sans chercher.
//
// ET UN CORRIGÉ DÉTACHABLE, en option, au bas de la feuille de l'élève. On
// découpe avant de distribuer si l'on ramasse ; on le laisse s'il travaille
// seul à la maison. C'est la même feuille dans les deux cas — un réglage, pas
// deux documents.
//
// ── POURQUOI LA REPRISE EST UN PARCOURS ────────────────────────────────────
//
// `core/reprise.js` rend des ÉTAPES, et l'on passe par `analyserParcours` et
// `blocsSimples` — le chemin de toutes les feuilles du logiciel. Une reprise
// est une séance : courte, choisie, personnelle. Lui donner un second chemin
// d'impression aurait voulu dire corriger deux fois chaque défaut de mise en
// page, et n'en corriger qu'un la fois où l'on oublie.

import { composerBlocs, composerSolutions, pageDe } from '../core/fiche.js';
import { entetePdf, hauteurEntete1, mesureur, pdfItems, pdfSolutions, pourPdf, teindreDoc } from './ficheRendu.js';
import { phraseDeReprise } from '../core/reprise.js';
import { analyserParcours, blocsSimples } from './printParcours.js';
import { chargerJsPDF } from './printSheet.js';

/** Les réglages de mise en page d'une feuille de reprise. */
const OPTIONS = {
    orientation: 'portrait',
    // ON ÉCRIT SUR CETTE FEUILLE-LÀ. Une reprise se fait au crayon, sous
    // l'énoncé : c'est le mode « interrogation » qui donne de la place, mais
    // sans son barème ni son cartouche de note — on ne note pas une reprise.
    ligneReponse: 11,
    numerotation: 'continue',
    modeSolution: 'liste',
    interrogation: false
};

/**
 * LA PHRASE DU HAUT, ET LE RAPPEL DE L'ERREUR.
 *
 * Ils vont dans la CONSIGNE de la feuille, pas dans un bloc à part : c'est
 * l'endroit que `entetePdf` sait déjà dessiner, mesurer et paginer. Un
 * encadré dessiné à la main par-dessus aurait chevauché le premier exercice
 * dès que la phrase fait trois lignes — et elle en fait trois dès trois
 * notions.
 */
function consigneDeLaFeuille(notionsPresentes) {
    // LA PHRASE DIT CE QUE LA FEUILLE PORTE, PAS CE QU'ON AVAIT PRÉVU.
    //
    // MESURÉ sur la feuille de Louis : l'en-tête annonçait « Aire d'un
    // rectangle et Additionner des entiers », et la feuille ne portait que les
    // additions — l'exercice d'aire choisi ne savait pas s'imprimer. L'élève
    // lisait qu'il devait reprendre l'aire et ne trouvait nulle part où le
    // faire. On recompose donc la phrase APRÈS la mise en page, depuis les
    // blocs réellement posés.
    //
    // ET ELLE RESTE COURTE, parce que la consigne de feuille tient en DEUX
    // LIGNES — `MAX_LIGNES_CONSIGNE`, et c'est une bonne règle : au-delà ce
    // n'est plus une consigne, c'est un texte, et il mange la place des
    // questions. Le rappel de l'erreur y a d'abord été mis, et la fin était
    // coupée net : « au lieu de 48 m² — 6 », puis rien. Il est descendu là où
    // il sert, juste au-dessus des questions qui le concernent.
    return phraseDeReprise(notionsPresentes.map(nom => ({ nom })));
}

/**
 * LE RAPPEL DE L'ERREUR, POSÉ SUR L'EXERCICE QUI LA CONCERNE.
 *
 * Pas en tête de feuille : là-haut il serait loin des questions, et il n'y
 * tient pas. Ici, il est la dernière chose que l'élève lit avant de chercher.
 *
 * « Tu confonds l'aire et le périmètre » est une étiquette ; « tu avais écrit
 * 32 m pour un rectangle de 12 m sur 4 m » est un SOUVENIR — et c'est le
 * souvenir qui corrige.
 */
function poserLeRappel(exos, fiche) {
    const e = fiche.erreur;
    if (!e) return;
    const notion = (fiche.notions.find(n => n.skillId === e.skillId) || {}).nom;
    const cible = exos.find(x => x.notion && x.notion === notion);
    if (!cible) return;
    const fois = e.fois > 1 ? ` — ${e.fois} fois` : '';
    const rappel = `La fois d'avant : « ${e.question} », tu avais répondu `
        + `${e.donne} au lieu de ${e.attendu}${fois}.`
        + (e.meprise ? ` ${e.meprise}` : '');
    cible.consigne = `${rappel} ${cible.consigne || ''}`.trim();
}

/**
 * LE BANDEAU DÉTACHABLE, au bas de la feuille de l'élève.
 *
 * IL SE DESSINE APRÈS LES BLOCS, dans la marge du bas que la mise en page
 * laisse toujours : il n'entre pas dans le calcul des pages, donc il ne peut
 * pas pousser une question sur la page suivante. S'il n'y a pas la place, il
 * ne s'imprime pas — mieux vaut pas de corrigé qu'un corrigé par-dessus la
 * dernière question.
 *
 * ET IL NE S'IMPRIME QUE SUR LA DERNIÈRE PAGE de l'élève : un bandeau au bas
 * de chaque page donnerait les réponses de la feuille entière, trois fois.
 */
/**
 * LES RÉPONSES AVEC LE NUMÉRO QU'ELLES PORTENT SUR LA FEUILLE.
 *
 * LE DÉFAUT QUE CECI CORRIGE EST LE PIRE DE TOUS : un corrigé qui ment. Le
 * bandeau numérotait ses réponses de 1 à 4 — l'ordre des questions ÉCRITES —
 * alors que la feuille de Louis numérote de 1 à 8, les quatre premiers numéros
 * étant pris par les rectangles. Il lisait « 1. 14 » en face d'une question
 * d'aire dont la réponse est 54 cm², et se corrigeait faux.
 *
 * Les grilles comptent dans la numérotation mais n'ont pas de réponse écrite :
 * elles se corrigent sur leur propre dessin, chez le professeur.
 */
function reponsesNumerotees(exos) {
    let n = 0;
    const out = [];
    for (const x of exos) {
        if (x.grilles.length) { n += x.grilles.length; continue; }
        for (const q of x.questions) { n += 1; out.push({ n, reponse: q.reponse }); }
    }
    return out;
}

function bandeauDetachable(pdf, page, reponses, fiche, mesure, avecGrilles) {
    const haut = page.h - page.marge - page.piedH - 30;
    if (haut < page.marge + 60) return false;      // la feuille est trop pleine
    const g = page.marge, d = page.w - page.marge;

    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.3);
    if (pdf.setLineDashPattern) pdf.setLineDashPattern([1.6, 1.4], 0);
    pdf.line(g, haut, d, haut);
    if (pdf.setLineDashPattern) pdf.setLineDashPattern([], 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(pourPdf('à découper'), (g + d) / 2, haut - 1.2, { align: 'center' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(17, 24, 39);
    pdf.text(pourPdf(`Corrigé — ${fiche.eleve}`), g, haut + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    // `pourPdf` : SANS LUI LES ACCENTS SAUTENT. Regardé sur la feuille de
    // Louis — « Corrige », « APRES », « trompe » — et c'était écrit en toutes
    // lettres dans l'en-tête de `ficheRendu.js`. Un texte posé directement
    // dans un PDF passe par une table de caractères qui ne porte pas le
    // français.
    pdf.text(pourPdf('Ne regarde qu\'APRÈS avoir tout cherché. Si tu t\'es trompé, '
        + 'reprends juste cette question-là.'
        + (avecGrilles ? ' Les figures se corrigent avec le professeur.' : '')),
    g, haut + 10.5);

    // LES RÉPONSES EN QUATRE COLONNES : c'est ce qui tient dans trois
    // centimètres de bandeau pour une feuille de douze questions.
    pdf.setFontSize(9);
    pdf.setTextColor(17, 24, 39);
    const cols = 4;
    const larg = (d - g) / cols;
    reponses.forEach((r, i) => {
        const x = g + (i % cols) * larg;
        const y = haut + 16 + Math.floor(i / cols) * 4.6;
        if (y > page.h - page.marge - page.piedH) return;
        pdf.text(pourPdf(`${r.n}. ${String(r.reponse || '').slice(0, 22)}`), x, y,
            { maxWidth: larg - 2 });
    });
    return true;
}

/**
 * UNE FEUILLE D'ÉLÈVE, posée dans le document en cours.
 *
 * Rend les questions tirées — la pile du professeur s'en sert pour écrire le
 * corrigé, et elle doit porter EXACTEMENT les mêmes.
 */
function poserUneFeuille(pdf, fiche, mesure, o) {
    // `hydratePath` donne à chaque étape son exercice et ses réglages ; c'est
    // le même chemin que n'importe quelle feuille, et c'est voulu.
    const chemin = { name: fiche.nom, version: 2, policy: {}, steps: fiche.steps };
    const { papier } = analyserParcours(chemin);
    if (!papier.length) return null;
    // `nbItems` voyage dans l'étape : `analyserParcours` le recopie avec le
    // reste, et `blocsSimples` le lit.
    const { exos, toutes } = blocsSimples(papier);
    // ON COMPTE LES BLOCS, PAS LES QUESTIONS.
    //
    // MESURÉ : la feuille d'Emma n'était pas dans le document. Ses deux
    // notions — placer un point, l'aire — sont des GRILLES, et une grille n'a
    // pas de « question » : `toutes` était vide, et la feuille entière passait
    // à la trappe. Une élève sans feuille dans une pile de vingt-six ne se
    // remarque pas — c'est exactement le genre de perte qu'on ne voit jamais.
    if (!exos.length) return null;

    // LES NOTIONS RÉELLEMENT POSÉES, dans l'ordre de la feuille.
    const presentes = exos.map(x => x.notion).filter(Boolean);
    poserLeRappel(exos, fiche);
    const consigne = consigneDeLaFeuille(presentes);
    const page0 = pageDe('portrait');
    // ON RÉSERVE LA HAUTEUR QUE L'EN-TÊTE PRENDRA VRAIMENT. Sans cela, la
    // consigne est écrite sur UNE ligne et sort de la page par la droite —
    // regardé sur la feuille de Louis, « on n'y revient p… » coupé net au
    // bord. `hauteurEntete1` la mesure et la coupe comme `entetePdf` la
    // dessinera.
    const entete = { titre: fiche.nom, champs: ['nom', 'date'], consigne, mesurer: mesure };
    const opts = { ...OPTIONS, page: page0, entete,
        enteteH1: hauteurEntete1(page0, false, entete) };
    const mise = composerBlocs(exos, opts, mesure);
    const page = mise.page || pageDe('portrait');
    mise.pages.forEach((p, i) => {
        if (!o.premiere || i) pdf.addPage('a4', 'portrait');
        o.premiere = false;
        entetePdf(pdf, fiche.nom, '', '', null, page, {
            ...opts.entete,
            champs: i === 0 ? ['nom', 'date'] : [],
            consigne: i === 0 ? opts.entete.consigne : '',
            pagination: mise.pages.length > 1 ? `page ${i + 1}/${mise.pages.length}` : ''
        });
        pdfItems(pdf, p, mise.opts);
        // Le bandeau ne va QUE sur la dernière page de cet élève — et
        // seulement s'il y a des réponses à écrire : une feuille de grilles se
        // corrige sur son propre dessin, pas en liste.
        if (o.detachable && toutes.length && i === mise.pages.length - 1) {
            bandeauDetachable(pdf, page, reponsesNumerotees(exos), fiche, mesure,
                exos.some(x => x.grilles.length));
        }
    });
    return { toutes, exos };
}

/** La pile du professeur : un corrigé par élève, dans le même ordre. */
function poserLesCorriges(pdf, faites, mesure) {
    const page0 = pageDe('portrait');
    for (const { fiche, toutes, exos } of faites) {
        const titre = `Corrigé — ${fiche.eleve}`;
        // PAS DE « Nom » NI DE « Date » SUR UN CORRIGÉ : c'est la feuille du
        // professeur, il sait de qui elle est — le titre le dit.
        const sansChamps = { champs: [] };

        // 1 · LES RÉPONSES ÉCRITES, en liste.
        if (toutes.length) {
            const sections = exos.map((x, i) => ({ titre: x.titre, points: null,
                questions: x.questions, numeroter: true, rang: i + 1, depart: 0 }));
            const sol = composerSolutions(toutes,
                { mode: 'liste', orientation: 'portrait', sections, numerotation: 'continue' },
                mesure);
            sol.pages.forEach((p) => {
                pdf.addPage('a4', 'portrait');
                entetePdf(pdf, titre, '', '', null, sol.page || page0, sansChamps);
                pdfSolutions(pdf, p, sol.opts);
            });
        }

        // 2 · ET LES GRILLES, REDESSINÉES AVEC LEUR SOLUTION.
        //
        // Un repère avec ses points posés, un rectangle avec son aire écrite :
        // leur correction est une FIGURE, pas une ligne dans une liste. Sans
        // ce second temps, le corrigé d'une feuille de grilles était une page
        // blanche sous un titre — et c'est la feuille de l'élève qui a le plus
        // besoin d'être corrigée, puisqu'on n'y lit pas la réponse.
        const grilles = exos.filter(x => x.grilles.length);
        if (grilles.length) {
            const hEnt = hauteurEntete1(page0, false,
                { titre, champs: [], consigne: '', mesurer: mesure });
            const bs = composerBlocs(grilles,
                { ...OPTIONS, page: page0, solution: true, interrogation: false,
                    enteteH1: hEnt, entete: { titre, champs: [], consigne: '' } },
                mesure);
            bs.pages.forEach((p) => {
                pdf.addPage('a4', 'portrait');
                entetePdf(pdf, titre, '', '', null, bs.page || page0, sansChamps);
                pdfItems(pdf, p, bs.opts);
            });
        }
    }
}

/**
 * LE DOCUMENT ENTIER.
 *
 * @param {Array}  fiches        ce que `reprisesDeLaClasse` a rendu
 * @param {object} [o]
 * @param {string} [o.classe]    le nom de la classe, pour le nom du fichier
 * @param {boolean}[o.detachable] poser le corrigé au bas de chaque feuille
 * @param {boolean}[o.corriges]  joindre la pile du professeur (vrai par défaut)
 * @returns {Promise<{feuilles:number, pages:number}>}
 */
export async function telechargerLesReprises(fiches, o = {}) {
    const jsPDF = await chargerJsPDF();
    const pdf = teindreDoc(new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }));
    const mesure = mesureur();
    const etat = { premiere: true, detachable: !!o.detachable };
    const faites = [];
    for (const fiche of fiches) {
        const fait = poserUneFeuille(pdf, fiche, mesure, etat);
        if (fait) faites.push({ fiche, ...fait });
    }
    if (!faites.length) return { feuilles: 0, pages: 0 };
    if (o.corriges !== false) poserLesCorriges(pdf, faites, mesure);
    const base = `reprises-${String(o.classe || 'classe').replace(/[^\w-]+/g, '-').toLowerCase()}`;
    pdf.save(`${base}.pdf`);
    return { feuilles: faites.length, pages: pdf.getNumberOfPages() };
}
