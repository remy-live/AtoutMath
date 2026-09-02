// LE BILAN DE SÉANCE, EN PDF — celui qu'on emporte au conseil de classe.
//
// Rémy : « peut-être avoir un bilan quand on clique sur les paramètres du
// parcours, que l'on peut exporter en PDF, avec le tableau en couleur et aussi
// une phrase par élève : "Doit réviser les nombres relatifs", ou "a bien
// révisé", ou "revoir pour la classe les additions". »
//
// POURQUOI UN PDF, ALORS QUE L'ÉCRAN MONTRE DÉJÀ TOUT. Parce qu'on ne relit
// pas un écran en salle des profs, qu'on ne le pose pas sur un bureau à côté
// des copies, et qu'on ne le montre pas à un collègue ou à un parent. Un bilan
// qui ne sort pas de l'application ne sert qu'au moment où on le regarde ;
// celui-ci a une vie après.
//
// LE TABLEAU EST EN COULEUR, et l'échelle est celle de l'écran — du rouge au
// vert, non acquis à expert. Ce n'est pas de l'ornement : c'est ce qui
// permet de BALAYER vingt-six lignes et de voir en trois secondes la colonne
// qui est rouge partout. Un tableau de chiffres demande de lire chaque case ;
// un tableau de couleurs se lit d'un coup d'œil, et c'est exactement le geste
// qu'on fait avant de préparer l'heure suivante.
//
// ET IL RESTE LISIBLE EN NOIR ET BLANC. Beaucoup de photocopieuses
// d'établissement ne tirent qu'en gris, et trois verts photocopiés donnent
// trois gris identiques. Chaque case porte donc AUSSI sa lettre — NA, EC, A,
// E —, qui survit à la photocopie et au daltonisme.
//
// CE MODULE NE CALCULE RIEN. Les bilans viennent de core/bilan.js et de
// core/bilanSeance.js, les phrases de `consigneDe` et `consigneClasse`. Il ne
// fait que poser de l'encre — et c'est ce qui garantit que le papier et l'écran
// disent la même chose.

import { chargerJsPDF } from './printSheet.js';
import { consigneDe, consigneClasse } from '../core/bilan.js';
import { LEVELS } from '../core/mastery.js';

const MARGE = 12;               // millimètres
const A4 = { w: 210, h: 297 };

const ENCRE = {
    titre: [26, 32, 44],
    texte: [45, 55, 72],
    gris: [110, 118, 132],
    filet: [206, 212, 224]
};

/**
 * LES QUATRE TEINTES DU PAPIER, et pourquoi elles ne viennent pas de l'écran.
 *
 * `couleurNiveau` rend des VARIABLES CSS — « var(--danger) » —, que le
 * navigateur résout et que jsPDF ne sait pas lire. On ne peut donc pas les
 * réutiliser telles quelles, et il faut les réécrire ici.
 *
 * ELLES SONT PÂLES À DESSEIN. Les couleurs de l'écran sont franches : elles se
 * lisent sur fond sombre comme sur fond clair. Sur le papier, la même
 * saturation donne une case où le texte noir ne passe plus et où le stylo du
 * professeur ne se voit pas. Éclaircies, la nuance reste reconnaissable, le
 * contraste redevient lisible, et il reste de la place pour annoter.
 *
 * ET CHAQUE CASE PORTE SA LETTRE, parce que beaucoup de photocopieuses
 * d'établissement ne tirent qu'en gris : quatre couleurs photocopiées donnent
 * quatre gris qu'on ne distingue plus. La lettre, elle, survit — comme elle
 * survit au daltonisme.
 */
const TEINTES = {
    NA: [250, 214, 210],
    EC: [252, 235, 205],
    A: [212, 240, 220],
    E: [214, 226, 250]
};

export const teinteNiveau = (k) => TEINTES[k] || [242, 244, 248];

const pc = (x) => `${Math.round((x || 0) * 100)} %`;

/**
 * CE QUE LA POLICE DU PDF SAIT ÉCRIRE — et ce qu'il faut lui traduire.
 *
 * MESURÉ SUR LE PREMIER TIRAGE : le titre annonçait « Séance de démonstration —
 * 6l A ». La classe s'appelle « 6ᵉ A », avec l'exposant typographique, et les
 * polices de base de jsPDF n'encodent que le Windows-1252 : tout ce qui n'y est
 * pas sort en caractère au hasard. « ᵉ » devenait « l ».
 *
 * On traduit donc les quelques signes que l'application emploie et que cet
 * encodage ignore — les exposants des niveaux, les guillemets courbes, les
 * espaces insécables fines. Le reste des accents français, lui, y est.
 */
const EXPOSANTS = { 'ᵉ': 'e', 'ᵈ': 'd', 'ʳ': 'r', 'ᵗ': 't', '°': '°' };
export function lisible(t) {
    return String(t == null ? '' : t)
        .replace(/[ᵉᵈʳᵗ]/g, (c) => EXPOSANTS[c] || '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[\u202f\u2009\u00a0]/g, ' ')
        .replace(/\u2026/g, '...')
        .replace(/[\u2212]/g, '-');
}

/** La lettre d'un niveau — ce qui survit à la photocopie en noir et blanc. */
const lettreNiveau = (k) => (LEVELS[k] && LEVELS[k].key) || k || '·';

/**
 * DE QUOI TENIR UNE PAGE : le curseur vertical, et le saut quand il déborde.
 *
 * Vingt-six élèves et huit colonnes ne tiennent pas sur une page. Plutôt que de
 * réduire jusqu'à l'illisible — la tentation de tout rapport —, on passe à la
 * page suivante en réimprimant l'en-tête du tableau : sans elle, la deuxième
 * page est une liste de couleurs dont on ne sait plus ce qu'elles mesurent.
 */
function feuille(doc) {
    let y = MARGE;
    return {
        get y() { return y; },
        set y(v) { y = v; },
        /** Assure `h` millimètres devant soi, sinon tourne la page. */
        place(h, apresSaut) {
            if (y + h <= A4.h - MARGE) return false;
            doc.addPage();
            y = MARGE;
            if (apresSaut) apresSaut();
            return true;
        }
    };
}

function titre(doc, f, texte, sous) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...ENCRE.titre);
    doc.text(lisible(texte), MARGE, f.y);
    f.y += 5.5;
    if (sous) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...ENCRE.gris);
        doc.text(lisible(sous), MARGE, f.y);
        f.y += 5;
    }
    doc.setDrawColor(...ENCRE.filet);
    doc.setLineWidth(0.4);
    doc.line(MARGE, f.y, A4.w - MARGE, f.y);
    f.y += 5;
}

/** Un paragraphe qui se replie tout seul dans la largeur utile. */
function paragraphe(doc, f, texte, { gras = false, taille = 10, couleur = ENCRE.texte } = {}) {
    doc.setFont('helvetica', gras ? 'bold' : 'normal');
    doc.setFontSize(taille);
    doc.setTextColor(...couleur);
    const lignes = doc.splitTextToSize(lisible(texte), A4.w - 2 * MARGE);
    lignes.forEach(l => {
        f.place(6);
        doc.text(l, MARGE, f.y);
        f.y += taille * 0.42 + 1.4;
    });
    f.y += 1.5;
}

/**
 * LE TABLEAU DES COMPÉTENCES — la colonne rouge saute aux yeux.
 *
 * C'est la seule chose qu'un tableau de classe apporte et qu'un bilan
 * individuel ne peut pas donner : la notion où beaucoup d'élèves sont en peine
 * est une notion à reprendre AU TABLEAU, pas un élève à aider.
 *
 * LES NOMS DE COLONNES SONT ÉCRITS EN BIAIS. Huit compétences dont
 * « Lire et placer des coordonnées » : à l'horizontale, chaque colonne
 * demanderait trente millimètres et il n'en reste que dix-huit. En biais, le
 * nom entier tient, et c'est ainsi que sont faits tous les tableaux de notes.
 */
function tableau(doc, f, bilan) {
    const cols = (bilan.competences || []).slice(0, 8);
    if (!cols.length || !(bilan.eleves || []).length) return;

    const xNom = MARGE;
    const wNom = 42;
    const wCol = Math.min(16, (A4.w - 2 * MARGE - wNom) / cols.length);
    const hLigne = 5.6;
    const hEntete = 26;

    const entete = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(...ENCRE.texte);
        cols.forEach((c, i) => {
            const x = xNom + wNom + i * wCol + wCol * 0.62;
            const nom = c.nom.length > 30 ? c.nom.slice(0, 29) + '…' : c.nom;
            doc.text(lisible(nom), x, f.y + hEntete - 1.5, { angle: 58, baseline: 'middle' });
        });
        f.y += hEntete;
        doc.setDrawColor(...ENCRE.filet);
        doc.setLineWidth(0.3);
        doc.line(xNom, f.y, xNom + wNom + cols.length * wCol, f.y);
        f.y += 1.2;
    };

    f.place(hEntete + hLigne * 3);
    entete();

    ordonnerEleves(bilan.eleves).forEach(e => {
        if (f.place(hLigne + 2, entete)) { /* l'en-tête est réimprimée */ }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.4);
        doc.setTextColor(...ENCRE.texte);
        const nom = e.nom.length > 22 ? e.nom.slice(0, 21) + '…' : e.nom;
        doc.text(lisible(nom), xNom, f.y + hLigne * 0.72);

        cols.forEach((c, i) => {
            const sien = (e.competences || []).find(x => x.skillId === c.skillId && x.fiable);
            const x = xNom + wNom + i * wCol;
            if (!sien) {
                // RIEN N'EST PAS ZÉRO. Une case vide dit « pas assez de
                // réponses pour conclure » ; la peindre en rouge dirait « raté »,
                // ce qui est une autre information, et fausse.
                doc.setDrawColor(...ENCRE.filet);
                doc.setLineWidth(0.2);
                doc.rect(x + 0.6, f.y + 0.6, wCol - 1.2, hLigne - 1.2);
                return;
            }
            doc.setFillColor(...teinteNiveau(sien.niveau));
            doc.setDrawColor(...ENCRE.filet);
            doc.setLineWidth(0.2);
            doc.rect(x + 0.6, f.y + 0.6, wCol - 1.2, hLigne - 1.2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.6);
            doc.setTextColor(...ENCRE.titre);
            doc.text(lettreNiveau(sien.niveau), x + wCol / 2, f.y + hLigne * 0.62,
                { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.4);
            doc.setTextColor(...ENCRE.texte);
        });
        f.y += hLigne;
    });

    f.y += 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...ENCRE.gris);
    doc.text('NA : non acquis · EC : en cours · A : acquis · E : expert · '
        + 'case vide : pas assez de réponses pour conclure', MARGE, f.y);
    f.y += 6;
}

/**
 * LES ÉLÈVES DANS L'ORDRE OÙ ON LES REGARDE : les plus en peine d'abord.
 *
 * Pas l'ordre alphabétique — un bilan se lit pour décider qui aider lundi, et
 * la seule chose qu'on y cherche doit être en haut. Ceux qui n'ont rien fait
 * passent à la fin : leur problème n'est pas la notion, et les mettre en tête
 * reléguerait derrière eux ceux qui ont travaillé sans y arriver.
 */
export function ordonnerEleves(eleves) {
    const faits = eleves.filter(e => e.questions);
    const muets = eleves.filter(e => !e.questions);
    return [...faits.sort((a, b) => a.reussite - b.reussite),
        ...muets.sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'))];
}

/** La liste des consignes : une ligne, un élève, une chose à faire. */
function consignes(doc, f, bilan) {
    f.place(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ENCRE.titre);
    doc.text('Élève par élève', MARGE, f.y);
    f.y += 5;

    ordonnerEleves(bilan.eleves).forEach(e => {
        f.place(7);
        const c = consigneDe(e);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.6);
        doc.setTextColor(...ENCRE.titre);
        doc.text(lisible(e.nom), MARGE, f.y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...ENCRE.texte);
        const lignes = doc.splitTextToSize(lisible(c), A4.w - 2 * MARGE - 46);
        doc.text(lignes[0], MARGE + 44, f.y);
        f.y += 4.4;
        // LE MOT DU PROFESSEUR, s'il en a laissé un pendant la séance : il vaut
        // mieux que tout ce que la machine peut calculer, et il passe donc en
        // dessous, en évidence.
        if (e.mot) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(...ENCRE.gris);
            doc.text(lisible(`« ${e.mot} »`), MARGE + 44, f.y);
            f.y += 4.2;
        }
        if (lignes.length > 1) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.6);
            doc.setTextColor(...ENCRE.texte);
            lignes.slice(1).forEach(l => { doc.text(l, MARGE + 44, f.y); f.y += 4.2; });
        }
    });
    f.y += 4;
}

/**
 * LE BILAN D'UNE SÉANCE, EN PDF.
 *
 * @param {Object} bilan  ce que rend `bilanSeance` (ou `bilanClasse`)
 * @param {Object} [opts] { titre, sousTitre, nomFichier }
 */
export async function exporterBilanPdf(bilan, opts = {}) {
    const jsPDF = await chargerJsPDF();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const f = feuille(doc);

    const quand = new Date().toLocaleDateString('fr-FR',
        { day: 'numeric', month: 'long', year: 'numeric' });
    titre(doc,
        f,
        opts.titre || `${bilan.titre || 'Séance'} — ${bilan.nom || ''}`.trim(),
        opts.sousTitre || `${bilan.commences ?? bilan.eleves.filter(e => e.questions).length}`
            + `/${bilan.attendus ?? bilan.eleves.length} élèves · `
            + `${pc(bilan.moyenneReussite)} de réussite moyenne · ${quand}`);

    // CE QU'ON FAIT DE TOUTE LA CLASSE, en tête : c'est la phrase qui décide de
    // l'heure suivante, et elle ne doit pas se chercher.
    paragraphe(doc, f, consigneClasse(bilan), { gras: true, taille: 11 });
    if (bilan.phrase) paragraphe(doc, f, bilan.phrase, { couleur: ENCRE.gris, taille: 9 });

    tableau(doc, f, bilan);
    consignes(doc, f, bilan);

    // LE PIED DE PAGE porte la date sur chaque feuille : un bilan qui traîne
    // sur un bureau et qu'on ne sait plus dater ne vaut plus rien.
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...ENCRE.gris);
        doc.text(lisible(`${bilan.titre || 'Bilan'} — ${quand}`), MARGE, A4.h - 7);
        doc.text(`${i} / ${n}`, A4.w - MARGE, A4.h - 7, { align: 'right' });
    }

    const propre = (t) => String(t || 'bilan').normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '').toLowerCase();
    doc.save(opts.nomFichier
        || `bilan-${propre(bilan.nom)}-${propre(bilan.titre)}.pdf`);
    return doc;
}
