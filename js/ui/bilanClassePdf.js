// LE BILAN DE CLASSE, EN PDF — celui qu'on emporte au conseil, et à la maison.
//
// RÉMY : « permettre d'imprimer un pdf que tu génères ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// IL Y AVAIT DÉJÀ UN PDF, ET CE N'ÉTAIT PAS CELUI-LÀ.
//
// `bilanPdf.js` imprime le bilan d'UNE SÉANCE : les compétences de cette
// séance, une phrase par élève, le mot que le professeur a laissé pendant
// l'heure. On l'atteint depuis « Donner à une classe ». Celui-ci imprime
// l'onglet « Les bilans » : le TERME, toutes séances confondues — ce qu'il faut
// reprendre, ce qui est compris, et, si l'on a choisi une séance, le tableau
// croisé élèves × exercices.
//
// LES DEUX RÉPONDENT À DEUX QUESTIONS QUI N'ARRIVENT PAS LE MÊME JOUR : « mon
// heure d'hier s'est passée comment » et « qu'est-ce que cette classe sait, en
// novembre ». On ne les fusionne donc pas ; on partage la mécanique du papier
// (voir les primitives exportées par `bilanPdf.js`) et rien d'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE MODULE NE CALCULE RIEN, pour la même raison que l'autre : les listes
// viennent de `core/bilanClasse.js`, le tableau croisé de
// `core/tableauDesExercices.js`. Il pose de l'encre — et c'est ce qui garantit
// que le papier et l'écran disent le même mot sur le même élève.

import { chargerJsPDF } from './printSheet.js';
import { ecrireSymboles } from './ficheRendu.js';
import {
    MARGE, A4, ENCRE, feuille, titre, paragraphe, teinteNiveau, lisible
} from './bilanPdf.js';
import { resumeDeClasse, notionsAReprendre, notionsComprises, enHeures } from '../core/bilanClasse.js';
import { levelFor } from '../core/mastery.js';
import { getSkill } from '../data/skills.js';

const pc = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)} %`);

/** Le nom d'une compétence, l'identifiant à défaut : le PDF ne devine pas. */
const nomDeNotion = (id) => {
    const c = getSkill(id);
    return (c && c.label) || id || '?';
};

/**
 * LES DEUX LISTES DE TÊTE, CÔTE À CÔTE SUR LE PAPIER.
 *
 * Elles sont en haut parce que c'est ce qu'on lit avant de préparer, et c'est
 * aussi ce qu'on montre à un collègue : « voilà où en est ma quatrième ». Le
 * tableau, lui, sert à vérifier un élève, et il vient après.
 *
 * DEUX COLONNES, ET NON DEUX BLOCS L'UN SOUS L'AUTRE. Mises bout à bout, les
 * deux listes font deux pages et l'on ne les compare plus — alors que toute
 * leur valeur est dans la comparaison : ce qui tient à gauche, ce qui ne tient
 * pas à droite, d'un seul regard.
 */
function lesDeuxListes(doc, f, aReprendre, comprises, combien) {
    const large = (A4.w - 2 * MARGE - 8) / 2;
    const hauteurLigne = 8.6;
    const combienDeLignes = Math.max(aReprendre.length, comprises.length);
    f.place(12 + hauteurLigne * Math.min(8, combienDeLignes));

    const yDepart = f.y;
    const colonne = (x, titreCol, liste, teinte) => {
        let y = yDepart;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...ENCRE.titre);
        doc.text(lisible(titreCol), x, y);
        y += 1.6;
        doc.setDrawColor(...teinte);
        doc.setLineWidth(0.9);
        doc.line(x, y, x + large, y);
        y += 5;

        if (!liste.length) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.4);
            doc.setTextColor(...ENCRE.gris);
            doc.text(lisible('Rien à signaler pour l\'instant.'), x, y);
            return y + 5;
        }
        for (const n of liste.slice(0, 8)) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.6);
            doc.setTextColor(...ENCRE.texte);
            const nom = doc.splitTextToSize(lisible(nomDeNotion(n.skillId)), large - 20)[0];
            doc.text(nom, x, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...ENCRE.gris);
            doc.text(`${n.combien}/${combien}`, x + large, y, { align: 'right' });
            y += 4.2;
            // LES PRÉNOMS, parce que c'est avec eux qu'on fait quelque chose.
            // « Encadrer un décimal : 9 élèves » n'appelle aucun geste ; les
            // neuf prénoms, si.
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(...ENCRE.gris);
            const qui = n.eleves.slice(0, 6).map(e => e.firstName).join(', ')
                + (n.eleves.length > 6 ? ` +${n.eleves.length - 6}` : '')
                + (n.fragilePour ? ` · fragile pour ${n.fragilePour}` : '');
            doc.text(doc.splitTextToSize(lisible(qui), large)[0], x, y);
            y += 4.4;
        }
        return y;
    };

    const basGauche = colonne(MARGE, 'À reprendre', aReprendre, [214, 120, 130]);
    const basDroite = colonne(MARGE + large + 8, 'Ce qui est compris', comprises, [100, 180, 140]);
    f.y = Math.max(basGauche, basDroite) + 4;
}

/** Le tableau du bilan : une ligne par élève, les six colonnes de l'écran. */
function tableauDesEleves(doc, f, lignes) {
    const cols = [
        { t: 'Élève', w: 46, lire: l => l.firstName, gras: true },
        { t: 'Questions', w: 22, lire: l => String(l.totalQuestions || 0), align: 'right' },
        { t: 'Réussite', w: 22, lire: l => pc(l.successRate), align: 'right' },
        { t: 'Travail', w: 26, lire: l => enHeures(l.timeSeconds), align: 'right' },
        { t: 'Erreurs', w: 20, lire: l => String(l.openErrors || 0), align: 'right' },
        { t: 'Dernière note', w: 28,
            lire: l => (l.lastNote ? `${l.lastNote.note} / ${l.lastNote.sur}` : '—'), align: 'right' }
    ];
    const hLigne = 5.4;

    const entete = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.6);
        doc.setTextColor(...ENCRE.texte);
        let x = MARGE;
        for (const c of cols) {
            doc.text(lisible(c.t), c.align === 'right' ? x + c.w : x, f.y,
                c.align === 'right' ? { align: 'right' } : undefined);
            x += c.w;
        }
        f.y += 2;
        doc.setDrawColor(...ENCRE.filet);
        doc.setLineWidth(0.3);
        doc.line(MARGE, f.y, x, f.y);
        f.y += 4;
    };

    f.place(14 + hLigne * 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ENCRE.titre);
    doc.text('Élève par élève', MARGE, f.y);
    f.y += 5.4;
    entete();

    for (const l of lignes) {
        f.place(hLigne + 2, entete);
        // CELUI QUI N'A RIEN FAIT SE VOIT SUR LE PAPIER AUSSI. À l'écran sa
        // ligne est grisée ; ici, une ligne de tirets dans un tableau de
        // chiffres se confond avec un élève qui a mal réussi, et ce n'est pas
        // du tout la même conversation.
        const rien = !(Number(l.totalQuestions) || 0);
        if (rien) {
            doc.setFillColor(246, 240, 240);
            doc.rect(MARGE - 1, f.y - 3.6, cols.reduce((s, c) => s + c.w, 0) + 2, hLigne, 'F');
        }
        let x = MARGE;
        for (const c of cols) {
            doc.setFont('helvetica', c.gras ? 'bold' : 'normal');
            doc.setFontSize(8.2);
            doc.setTextColor(...(rien ? ENCRE.gris : ENCRE.texte));
            const texte = doc.splitTextToSize(lisible(c.lire(l)), c.w - 2)[0] || '';
            doc.text(texte, c.align === 'right' ? x + c.w : x, f.y,
                c.align === 'right' ? { align: 'right' } : undefined);
            x += c.w;
        }
        f.y += hLigne;
    }
    f.y += 4;
}

/**
 * LE TABLEAU CROISÉ — élèves en lignes, exercices de la séance en colonnes.
 *
 * MÊME ENCODAGE QUE L'AUTRE PDF, et c'est volontaire : couleur pâle + LETTRE.
 * Beaucoup de photocopieuses d'établissement ne tirent qu'en gris, où quatre
 * couleurs donnent quatre gris identiques ; la lettre survit à la photocopie
 * et au daltonisme. On y ajoute le taux, parce qu'ici la case mesure une
 * réussite et non un niveau de maîtrise : « A » ne dit pas 72 % ou 88 %.
 *
 * ET LA CASE VIDE RESTE VIDE. Un cadre sans rien dit « il n'y est pas arrivé » ;
 * un « 0 % » rouge dirait « il a tout raté ». Les deux appellent des gestes
 * opposés — raccourcir la séance, ou reprendre la notion.
 */
function tableauCroise(doc, f, t, nommer) {
    if (!t || !t.exercices.length || !t.rangs.length) return;

    const wNom = 40;
    const wCol = Math.min(17, (A4.w - 2 * MARGE - wNom) / t.exercices.length);
    const hLigne = 5.6;
    const hEntete = 28;

    const entete = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...ENCRE.texte);
        t.exercices.forEach((ex, i) => {
            const x = MARGE + wNom + i * wCol + wCol * 0.62;
            const nom = nommer(ex);
            doc.text(lisible(nom.length > 30 ? nom.slice(0, 29) + '…' : nom),
                x, f.y + hEntete - 1.5, { angle: 58, baseline: 'middle' });
        });
        f.y += hEntete;
        doc.setDrawColor(...ENCRE.filet);
        doc.setLineWidth(0.3);
        doc.line(MARGE, f.y, MARGE + wNom + t.exercices.length * wCol, f.y);
        f.y += 1.4;
    };

    f.place(18 + hEntete + hLigne * 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ENCRE.titre);
    doc.text(lisible(`Exercice par exercice — ${t.nom}`), MARGE, f.y);
    f.y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...ENCRE.gris);
    doc.text(lisible('Réussite du premier coup. Une case vide : cet élève n\'a pas '
        + 'atteint cet exercice.'), MARGE, f.y);
    f.y += 4.6;
    entete();

    const poserCase = (c, x, y) => {
        if (c.vide) {
            doc.setDrawColor(...ENCRE.filet);
            doc.setLineWidth(0.2);
            doc.rect(x + 0.6, y + 0.6, wCol - 1.2, hLigne - 1.2);
            return;
        }
        doc.setFillColor(...teinteNiveau(levelFor(c.taux).key));
        doc.setDrawColor(...ENCRE.filet);
        doc.setLineWidth(0.2);
        doc.rect(x + 0.6, y + 0.6, wCol - 1.2, hLigne - 1.2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.4);
        doc.setTextColor(...ENCRE.titre);
        doc.text(`${levelFor(c.taux).key} ${Math.round(c.taux * 100)}`,
            x + wCol / 2, y + hLigne * 0.62, { align: 'center' });
    };

    for (const r of t.rangs) {
        f.place(hLigne + 2, entete);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.2);
        doc.setTextColor(...ENCRE.texte);
        const nom = r.firstName.length > 21 ? r.firstName.slice(0, 20) + '…' : r.firstName;
        doc.text(lisible(nom), MARGE, f.y + hLigne * 0.72);
        r.cases.forEach((c, i) => poserCase(c, MARGE + wNom + i * wCol, f.y));
        f.y += hLigne;
    }

    // LE PIED : LA COLONNE LUE DE HAUT EN BAS, qui est la moitié utile de ce
    // tableau. Une colonne à 38 % pour vingt-deux élèves ne se voit pas en
    // balayant les cases une à une, et c'est elle qui décide de lundi.
    f.y += 1.4;
    doc.setDrawColor(...ENCRE.filet);
    doc.setLineWidth(0.3);
    doc.line(MARGE, f.y, MARGE + wNom + t.exercices.length * wCol, f.y);
    f.y += 1.6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...ENCRE.titre);
    doc.text('La classe', MARGE, f.y + hLigne * 0.72);
    t.pieds.forEach((p, i) => {
        const x = MARGE + wNom + i * wCol;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...ENCRE.titre);
        doc.text(p.taux === null ? '—' : `${Math.round(p.taux * 100)} %`,
            x + wCol / 2, f.y + hLigne * 0.5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(...ENCRE.gris);
        doc.text(`${p.eleves} él.`, x + wCol / 2, f.y + hLigne * 0.95, { align: 'center' });
    });
    f.y += hLigne + 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...ENCRE.gris);
    doc.text(lisible('NA : moins de 40 % · EC : 40 à 70 % · A : 70 à 90 % · E : 90 % et plus '
        + '· « 12 él. » : combien ont atteint cet exercice'), MARGE, f.y);
    f.y += 6;
}

/**
 * LE BILAN D'UNE CLASSE, EN PDF.
 *
 * @param {Object} bilan  { classe, lignes, tableau?, nommer? }
 *   · `classe`  { name } — le nom qu'on lit en haut de la page
 *   · `lignes`  les élèves DANS L'ORDRE DE L'ÉCRAN : le papier ne reclasse pas
 *               ce que le professeur vient de ranger, sinon on ne retrouve pas
 *               sur la feuille ce qu'on avait sous les yeux
 *   · `tableau` ce que rend `tableauDesExercices`, ou rien
 *   · `nommer`  l'identifiant d'exercice vers son titre (le catalogue vit dans
 *               l'application, pas ici)
 */
export async function exporterBilanClassePdf(bilan, opts = {}) {
    const lignes = bilan.lignes || [];
    const jsPDF = await chargerJsPDF();
    const doc = ecrireSymboles(new jsPDF({ unit: 'mm', format: 'a4' }));
    const f = feuille(doc);

    const r = resumeDeClasse(lignes);
    const quand = new Date().toLocaleDateString('fr-FR',
        { day: 'numeric', month: 'long', year: 'numeric' });
    const nomClasse = (bilan.classe && bilan.classe.name) || 'La classe';

    titre(doc, f, opts.titre || `Bilan — ${nomClasse}`,
        `${r.actifs}/${r.eleves} élèves ont travaillé · ${r.questions} questions · `
        + `${pc(r.reussite)} de réussite · ${enHeures(r.secondes)} de travail · ${quand}`);

    // CE QUI MANQUE AVANT TOUT AUTRE CHOSE : ceux qui ne sont jamais entrés.
    // Ce n'est pas un résultat, c'est un problème d'accès — un billet perdu, un
    // code mal recopié —, et il se règle avant de parler de mathématiques.
    if (r.jamaisVenus) {
        paragraphe(doc, f, r.jamaisVenus > 1
            ? `${r.jamaisVenus} élèves ne se sont jamais connectés : vérifier leurs billets.`
            : 'Un élève ne s\'est jamais connecté : vérifier son billet.',
        { gras: true, taille: 9.5, couleur: [170, 40, 60] });
    }

    lesDeuxListes(doc, f, notionsAReprendre(lignes), notionsComprises(lignes), r.eleves);
    tableauDesEleves(doc, f, lignes);
    if (bilan.tableau) tableauCroise(doc, f, bilan.tableau, bilan.nommer || (x => x));

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...ENCRE.gris);
        doc.text(lisible(`Bilan — ${nomClasse} — ${quand}`), MARGE, A4.h - 7);
        doc.text(`${i} / ${n}`, A4.w - MARGE, A4.h - 7, { align: 'right' });
    }

    const propre = (t) => String(t || 'bilan').normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '').toLowerCase();
    doc.save(opts.nomFichier || `bilan-${propre(nomClasse)}-${propre(quand)}.pdf`);
    return doc;
}
