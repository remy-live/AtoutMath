// LA PAGE PARENTS — une A4 qu'on donne en main, pas un bulletin.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY a retenu cette page parmi six pistes, et il a demandé ensuite : « est-ce
// que Louis peut avoir un corrigé, ou ses parents ? » Les deux, mais pas le
// même — et c'est ce qui décide de tout ce fichier.
//
// ── CE QU'UN PARENT NE PEUT PAS FAIRE AVEC UNE LISTE DE RÉPONSES ───────────
//
// Il ne peut pas EXPLIQUER. Un parent qui a oublié comment on calcule une aire
// lit « 48 m² » et n'en tire rien : il peut dire à son enfant qu'il s'est
// trompé, pas pourquoi. Cette page porte donc, sous chaque chose, la PHRASE À
// DIRE — en français, sans formule. « Combien de carrés d'un mètre de côté
// tiennent dedans ? » s'emploie tel quel à table.
//
// ── ET ELLE NE NOTE PAS ────────────────────────────────────────────────────
//
// Pas de moyenne, pas de rang, pas d'appréciation. Ce qu'il sait faire, ce qui
// progresse, ce qui reste — et la dernière ligne le dit en toutes lettres :
// « elle dit ce qu'il sait faire, pas ce qu'il vaut ». Une page qui arrive chez
// les parents est lue comme un jugement si on ne l'en empêche pas.
//
// ── POURQUOI ELLE NE S'ÉCRIT PAS AVEC `composerBlocs` ──────────────────────
//
// Ce n'est pas une feuille d'exercices : il n'y a ni question, ni bloc, ni
// numérotation. C'est un DOCUMENT, et `ui/bilanPdf.js` en porte déjà les
// outils — la marge, les encres, le curseur qui tourne la page, les teintes de
// niveau pâlies pour la photocopieuse. On les reprend : deux jeux d'encres
// pour deux papiers du même logiciel divergeraient au premier réglage.

import { nomCompetence } from '../core/bilan.js';
import { A4, ENCRE, MARGE, feuille, lisible, paragraphe, teinteNiveau } from './bilanPdf.js';
import { chargerJsPDF } from './printSheet.js';
import { ecrireSymboles } from './ficheRendu.js';

/**
 * LES TROIS COLONNES : acquis, en cours, à reprendre.
 *
 * ON NE MONTRE QUE CE QU'ON A MESURÉ — `fiable`, comme la fiche de reprise.
 * Une notion vue deux fois rangée dans « à reprendre » ferait croire à un
 * parent que son enfant échoue là où il n'a rien fait.
 *
 * ET LA PLUS FRAGILE PASSE DEVANT DANS LES DEUX COLONNES DU BAS. Ce n'est pas
 * un détail d'affichage : `bilanClasse` rend ses compétences de la MIEUX
 * maîtrisée à la moins bonne, et tout ce fichier lit ensuite `reprendre[0]`
 * pour dire ce qui l'arrête et quoi faire à la maison. Sans ce tri, la page
 * désignait la moins mauvaise des notions ratées, et le conseil du soir portait
 * sur celle dont l'élève avait le moins besoin.
 */
export function troisColonnes(bilan) {
    const sûr = ((bilan && bilan.competences) || []).filter(c => c && c.fiable);
    const duPlusFragile = (a, z) => (a.maitrise ?? a.taux ?? 0) - (z.maitrise ?? z.taux ?? 0);
    return {
        acquis: sûr.filter(c => c.niveau === 'A' || c.niveau === 'E'),
        encours: sûr.filter(c => c.niveau === 'EC').sort(duPlusFragile),
        reprendre: sûr.filter(c => c.niveau === 'NA').sort(duPlusFragile)
    };
}

/**
 * LA PHRASE D'OUVERTURE — ce qu'on dirait en tendant la feuille.
 *
 * ELLE COMMENCE PAR CE QUI VA. Non par politesse : un parent qui lit d'abord
 * un reproche ne lit plus la suite, et la suite est la seule partie utile.
 * S'il n'y a rien d'acquis, on ne fabrique pas un compliment — on dit où il en
 * est, et cela suffit.
 */
export function phraseParents(bilan, cols) {
    const nom = (bilan && bilan.nom) || 'Votre enfant';
    const forts = cols.acquis.slice(0, 2).map(c => c.nom || nomCompetence(c.skillId));
    const faible = cols.reprendre[0] || cols.encours[0];
    const debut = forts.length
        ? `${nom} tient ${forts.length > 1 ? forts.join(' et ') : forts[0]}.`
        : `${nom} a commencé à travailler sur le logiciel.`;
    if (!faible) {
        return `${debut} Rien n'est en attente pour le moment.`;
    }
    const quoi = faible.nom || nomCompetence(faible.skillId);
    return `${debut} Ce qui l'arrête est ${quoi} — et cela se reprend, `
        + 'c\'est une difficulté fréquente à son âge.';
}

/** Les chiffres du haut : quatre, et pas un de plus. */
function chiffresDe(bilan, cols) {
    const total = cols.acquis.length + cols.encours.length + cols.reprendre.length;
    return [
        { n: bilan.seancesFinies ?? bilan.seances ?? 0, quoi: 'séances faites' },
        { n: bilan.questions || 0, quoi: 'questions' },
        { n: `${Math.round((bilan.reussite || 0) * 100)} %`, quoi: 'de réussite' },
        // « 4 sur 6 » SE LIT, « 67 % de maîtrise » non : un parent compte des
        // notions, pas des pourcentages de pourcentages.
        { n: `${cols.acquis.length} sur ${total}`, quoi: 'notions acquises' }
    ];
}

/** Une bande de chiffres, sur fond pâle. */
function bandeDesChiffres(doc, f, chiffres) {
    const h = 18;
    f.place(h + 4);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(MARGE, f.y, A4.w - 2 * MARGE, h, 2, 2, 'F');
    const large = (A4.w - 2 * MARGE) / chiffres.length;
    chiffres.forEach((c, i) => {
        const x = MARGE + 5 + i * large;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(...ENCRE.titre);
        doc.text(lisible(String(c.n)), x, f.y + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...ENCRE.gris);
        doc.text(lisible(c.quoi), x, f.y + 13.5);
    });
    f.y += h + 7;
}

/** Un petit titre de section, en capitales grises. */
function section(doc, f, texte) {
    f.place(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...ENCRE.gris);
    doc.text(lisible(texte.toUpperCase()), MARGE, f.y);
    f.y += 5;
}

/**
 * LES TROIS COLONNES, DESSINÉES.
 *
 * CHAQUE COLONNE PORTE SA PASTILLE, et la pastille porte sa teinte — les mêmes
 * que le tableau de la classe, pâlies pour la photocopieuse. Un parent qui a
 * vu l'écran du professeur retrouve les mêmes couleurs.
 */
function colonnes(doc, f, cols) {
    const groupes = [
        { titre: 'C\'est acquis', liste: cols.acquis, niveau: 'A' },
        { titre: 'En cours', liste: cols.encours, niveau: 'EC' },
        { titre: 'À reprendre', liste: cols.reprendre, niveau: 'NA' }
    ];
    const large = (A4.w - 2 * MARGE) / 3;
    const haut = f.y;
    let bas = f.y;
    groupes.forEach((g, i) => {
        const x = MARGE + i * large;
        let y = haut;
        doc.setFillColor(...teinteNiveau(g.niveau));
        doc.roundedRect(x, y - 3.4, large - 4, 5.6, 1.4, 1.4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...ENCRE.titre);
        doc.text(lisible(g.titre.toUpperCase()), x + 2.5, y + 0.8);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...ENCRE.texte);
        if (!g.liste.length) {
            doc.setTextColor(...ENCRE.gris);
            doc.text('—', x + 2.5, y);
            y += 5;
        }
        for (const c of g.liste) {
            const lignes = doc.splitTextToSize(
                lisible('· ' + (c.nom || nomCompetence(c.skillId))), large - 7);
            lignes.forEach(l => { doc.text(l, x + 2.5, y); y += 4.4; });
        }
        bas = Math.max(bas, y);
    });
    f.y = bas + 4;
}

/**
 * L'ERREUR QUI REVIENT, avec ses chiffres et la phrase à dire.
 *
 * `tetu` est la question que l'élève a ratée le plus souvent. On l'écrit avec
 * SES nombres — « 32 m au lieu de 48 m² » —, parce qu'une étiquette ne se
 * rejoue pas à table et qu'un calcul, si.
 */
function erreurQuiRevient(doc, f, bilan) {
    const t = bilan.tetu;
    if (!t || !t.given || !t.expected) return;
    section(doc, f, 'L\'erreur qui revient');
    const h0 = f.y;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...ENCRE.texte);
    // L'ÉNONCÉ PREND UNE MAJUSCULE. Le journal le garde tel que l'exercice
    // l'a écrit, et beaucoup commencent en minuscule parce qu'ils arrivent
    // sous un titre — « aire d'un rectangle de 12 m sur 4 m ». En tête d'un
    // cadre, cela se lit comme une phrase coupée en deux.
    const enonce = String(t.questionText || nomCompetence(t.skillId));
    const titre = `${enonce.charAt(0).toUpperCase()}${enonce.slice(1)} — écrit : ${t.given}`
        + `   ·   attendu : ${t.expected}`;
    const l1 = doc.splitTextToSize(lisible(titre), A4.w - 2 * MARGE - 8);
    l1.forEach(l => { doc.text(l, MARGE + 4, f.y + 5); f.y += 4.8; });
    if (t.misconception || t.count > 1) {
        doc.setFontSize(9);
        doc.setTextColor(...ENCRE.gris);
        const fois = t.count > 1 ? `${t.count} fois sur la même question. ` : '';
        const l2 = doc.splitTextToSize(lisible(fois + (t.misconception || '')),
            A4.w - 2 * MARGE - 8);
        l2.forEach(l => { doc.text(l, MARGE + 4, f.y + 5); f.y += 4.4; });
    }
    doc.setDrawColor(...ENCRE.filet);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGE, h0, A4.w - 2 * MARGE, f.y - h0 + 7, 2, 2, 'S');
    f.y += 11;
}

/**
 * CE QU'ON PEUT FAIRE À LA MAISON — et pourquoi c'est la partie la plus utile.
 *
 * C'est la seule chose de cette page sur laquelle un parent peut AGIR. Elle
 * tient en cinq minutes et ne demande ni cahier ni logiciel : compter les
 * carreaux d'une plaque de chocolat vaut mieux qu'un quart d'heure de devoirs
 * surveillés, parce que c'est fait ENSEMBLE.
 *
 * LES CONSEILS SONT ÉCRITS PAR NOTION, pas tirés au hasard. Quand on n'en a
 * pas pour celle-là, on ne fabrique pas une phrase creuse : on dit simplement
 * de la refaire avec lui, ce qui est vrai.
 */
export const A_LA_MAISON = {
    'mes.aire.rectangle': 'Faites-lui compter les carreaux d\'un carrelage, d\'une nappe, '
        + 'd\'une plaque de chocolat : combien en largeur, combien en longueur, combien en '
        + 'tout. L\'aire devient quelque chose qu\'on compte, et non une formule à retenir.',
    'num.add.entiers': 'À la caisse ou à table : « on a 48, on ajoute 27, combien ? » '
        + 'À voix haute, sans papier — c\'est la retenue qui se travaille, et elle se '
        + 'travaille de tête.',
    'num.mult.sens': 'Demandez-lui combien font 6 paquets de 4 gâteaux, puis 4 paquets de 6. '
        + 'La même réponse par deux chemins : c\'est tout le sens de la multiplication.',
    'num.div.quotient': 'Partagez quelque chose en parts égales devant votre enfant — des '
        + 'cartes, des bonbons — et demandez combien chacun en a, et combien il en reste.',
    'geo.repere.coord': 'Une bataille navale suffit : on y lit et on y place des coordonnées '
        + 'pendant vingt minutes sans s\'en apercevoir.',
    'mes.grandeurs.composees': 'En voiture : « on roule à 90, il reste 45 km, on arrive '
        + 'dans combien de temps ? » C\'est exactement la notion.'
};

export function conseilMaison(cols) {
    const cible = cols.reprendre[0] || cols.encours[0];
    if (!cible) {
        return 'Rien à reprendre pour le moment — dites-le-lui, cela compte autant que '
            + 'le reste.';
    }
    const ecrit = A_LA_MAISON[cible.skillId];
    if (ecrit) return ecrit;
    const quoi = cible.nom || nomCompetence(cible.skillId);
    return `Refaites ensemble un ou deux exercices de « ${quoi} », à voix haute, en `
        + 'demandant d\'expliquer chaque étape. Expliquer est ce qui installe.';
}

/** Ce que le pied de page occupe en bas de la feuille, en millimètres. */
const PIED = 14;

/**
 * LE MOT DU PROFESSEUR — des lignes vides, et c'est tout l'intérêt.
 *
 * MESURÉ AU PREMIER TIRAGE : la page s'arrêtait au milieu de l'A4 et la moitié
 * basse restait blanche. Une page à moitié vide se lit comme une page tronquée.
 * Mais on ne la remplit pas de texte en plus : le seul mot qui compte vraiment
 * pour des parents est celui que le professeur écrit à la main, et c'est cette
 * place-là qui manquait. Avec des lignes, parce que personne n'écrit dans un
 * rectangle vide.
 *
 * ELLE NE S'IMPRIME QUE S'IL RESTE DE QUOI ÉCRIRE : sous trente millimètres,
 * deux lignes serrées contre le pied de page encombrent plus qu'elles
 * n'invitent, et l'élève dont la liste de notions est longue n'a pas besoin
 * qu'on lui vole sa dernière ligne.
 */
function motDuProfesseur(doc, f) {
    const bas = A4.h - MARGE - PIED;
    if (bas - f.y < 30) return;
    section(doc, f, 'Un mot du professeur');
    doc.setDrawColor(...ENCRE.filet);
    doc.setLineWidth(0.25);
    for (let y = f.y + 6; y <= bas - 3; y += 9) {
        doc.line(MARGE + 2, y, A4.w - MARGE - 2, y);
    }
}

/**
 * LA DERNIÈRE LIGNE N'EST PAS UNE FORMULE DE POLITESSE.
 *
 * Une page qui arrive chez des parents est lue comme un jugement si on ne l'en
 * empêche pas, et ce logiciel ne juge pas : il mesure ce qui a été fait DESSUS.
 * Elle est COLLÉE AU BAS DE LA FEUILLE, et non à la suite du texte : c'est là
 * qu'on lit les réserves d'un document, et c'est là qu'elle cesse de couper la
 * page en deux.
 */
function piedDePage(doc, bilan) {
    const nom = (bilan && bilan.nom) || 'votre enfant';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...ENCRE.gris);
    const lignes = doc.splitTextToSize(lisible(
        `Cette page est faite par AtoutMath à partir du travail de ${nom} sur le logiciel. `
        + 'Elle ne remplace pas le bulletin : elle dit ce qui est acquis et ce qui reste à '
        + 'reprendre, et rien d\'autre.'), A4.w - 2 * MARGE);
    let y = A4.h - MARGE - (lignes.length - 1) * 4;
    lignes.forEach(l => { doc.text(l, MARGE, y); y += 4; });
}

/** UNE page, pour UN élève. */
export function poserUnePageParents(doc, bilan, o = {}) {
    const cols = troisColonnes(bilan);
    const f = feuille(doc);

    // L'EN-TÊTE : le prénom en grand, le reste en petit à droite.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...ENCRE.titre);
    doc.text(lisible(bilan.nom || 'Élève'), MARGE, f.y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...ENCRE.gris);
    doc.text(lisible([o.classe, o.periode, o.date].filter(Boolean).join(' · ')),
        A4.w - MARGE, f.y + 6, { align: 'right' });
    f.y += 9;
    doc.setDrawColor(...ENCRE.titre);
    doc.setLineWidth(0.6);
    doc.line(MARGE, f.y, A4.w - MARGE, f.y);
    f.y += 7;

    paragraphe(doc, f, phraseParents(bilan, cols), { taille: 11 });
    f.y += 2;
    bandeDesChiffres(doc, f, chiffresDe(bilan, cols));
    // « OÙ EN EST LE TRAVAIL » ET NON « OÙ IL EN EST ». La moitié de ces
    // pages part chez les parents d'une fille, et le logiciel ne connaît pas le
    // genre des élèves : il connaît des prénoms. Partout où il aurait fallu un
    // pronom, on nomme la chose — ici, le travail.
    section(doc, f, 'Où en est le travail');
    colonnes(doc, f, cols);
    erreurQuiRevient(doc, f, bilan);

    section(doc, f, 'Ce qu\'on peut faire à la maison, en cinq minutes');
    const h0 = f.y;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...ENCRE.texte);
    doc.splitTextToSize(lisible(conseilMaison(cols)), A4.w - 2 * MARGE - 10)
        .forEach(l => { doc.text(l, MARGE + 5, f.y + 5); f.y += 4.8; });
    doc.setFillColor(21, 128, 61);
    doc.rect(MARGE, h0, 1.2, f.y - h0 + 3, 'F');
    f.y += 10;

    motDuProfesseur(doc, f);
    piedDePage(doc, bilan);
}

/**
 * TOUTE LA CLASSE — une page par élève, dans l'ordre alphabétique.
 *
 * L'ORDRE ALPHABÉTIQUE, et non celui du bilan : ces pages se distribuent en
 * main propre un soir de rencontre, et l'on cherche un nom dans une pile.
 */
export async function telechargerLesPagesParents(eleves, o = {}) {
    const jsPDF = await chargerJsPDF();
    // `ecrireSymboles` ET NON `teindreDoc` : le second est le filtre de
    // polycopie, et il décolore tout quand le professeur imprime ses fiches en
    // noir et blanc — ce qui est juste pour des FICHES. MESURÉ au premier
    // tirage : les trois pastilles « acquis / en cours / à reprendre »
    // sortaient du même gris. Cette page-ci suit le tableau de classe de
    // `bilanPdf.js`, dont les quatre teintes sont DÉJÀ pâlies pour la
    // photocopieuse ; les repasser au filtre, c'est les pâlir deux fois. On ne
    // garde donc du filtre que l'écriture des symboles — sans elle, « 48 m² »
    // sort en caractère au hasard.
    const doc = ecrireSymboles(new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }));
    const liste = [...(eleves || [])]
        // CELUI QUI N'A RIEN DÉPOSÉ N'A PAS DE PAGE : une feuille de zéros
        // n'apprend rien à ses parents et les blesse pour rien. Le professeur
        // le sait déjà — c'est à lui de leur parler.
        .filter(b => b && b.questions > 0)
        .sort((a, z) => String(a.nom).localeCompare(String(z.nom), 'fr'));
    liste.forEach((b, i) => {
        if (i) doc.addPage('a4', 'portrait');
        poserUnePageParents(doc, b, o);
    });
    if (!liste.length) return { pages: 0 };
    doc.save(`parents-${String(o.classe || 'classe').replace(/[^\w-]+/g, '-').toLowerCase()}.pdf`);
    return { pages: liste.length };
}
