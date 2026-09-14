// LA LEÇON, MISE EN PAGE — parce qu'un mur de texte ne se lit pas.
//
// Rémy, capture d'un téléphone à l'appui : « quand tu vois l'explication, ça
// donne pas envie de lire, il faut une belle mise en page, du retour à la
// ligne, de la couleur ».
//
// Il a raison, et ce n'était pas un problème d'écriture : les cent vingt et une
// leçons du logiciel SONT structurées — capitales pour la règle qui compte,
// « MÊME SIGNE : » pour ouvrir un cas, calculs en exemple, tiret cadratin pour
// l'aparté. Simplement, tout cela partait dans un seul `escapeHtml()` et
// ressortait en un pavé orange de quinze lignes. La structure était là, on ne
// la montrait pas.
//
// CE MODULE NE RÉÉCRIT AUCUNE LEÇON. Il les RELIT : il retrouve les conventions
// que l'auteur a employées sans y penser, et rend des blocs qu'une feuille de
// style peut habiller. Ainsi les cent vingt et une leçons y gagnent d'un coup,
// et la cent vingt-deuxième aussi, sans que personne ait à baliser quoi que ce
// soit à la main — une convention qu'il faut se rappeler d'appliquer finit
// toujours par ne plus l'être.
//
// Pur : ni DOM, ni couleur, ni classe CSS. Il rend une structure ; l'habillage
// est ailleurs, et le test peut donc vérifier le SENS plutôt que des balises.

/**
 * Une suite d'au moins trois majuscules : c'est la marque que l'auteur emploie
 * pour dire « ceci est LA chose à retenir ». Deux lettres ne suffisent pas —
 * « ON », « SI », « À » sont des mots ordinaires écrits en tête de phrase.
 */
const CAPS = 'A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸÆŒ';
const RE_FORT = new RegExp(`[${CAPS}]{3,}(?:[ '’-][${CAPS}]{2,})*`, 'g');

/**
 * UN CALCUL EN PLEIN TEXTE. « (−3) + (−4) = −7 » n'est pas une phrase : c'est
 * un objet qu'on montre, et l'œil doit pouvoir le saisir sans le lire.
 *
 * On exige un SIGNE D'OPÉRATION ou un ÉGAL : sans cela, « 3 » et « 2024 »
 * seraient encadrés comme des formules, et une leçon qui cite une date
 * ressemblerait à un cours de calcul.
 */
const RE_CALCUL = /[0-9|(][0-9\s×÷+\-−–*/=?()|,.:⋯…⁰¹²³⁴⁵⁶⁷⁸⁹⁻ᵃ-ᶻ]*[0-9|)⁰¹²³⁴⁵⁶⁷⁸⁹]/g;
const A_UN_OPERATEUR = /[×÷=]|[0-9]\s*[+\-−–]\s*[0-9(]|\//;

/** Les mots qu'on ne veut pas voir happés par un calcul voisin. */
const nettoyerCalcul = (t) => t.replace(/[\s.,:]+$/, '');

/**
 * UN CAS QUI S'OUVRE : « MÊME SIGNE : on ajoute… ».
 *
 * C'est la charnière la plus utile de toutes, parce qu'elle correspond à ce que
 * l'élève cherche vraiment : « je suis dans quel cas ? ». Elle mérite donc sa
 * ligne, son titre et sa pastille, pas une majuscule au fil du texte.
 */
const RE_CAS = new RegExp(`(^|(?<=[.!?])\\s+)([${CAPS}][${CAPS}'’ -]{2,}?)\\s*:\\s+`, 'g');

/**
 * Coupe un texte en phrases, ponctuation comprise.
 *
 * UN POINT D'INTERROGATION DANS UNE CITATION NE FINIT PAS LA PHRASE. « Le 7, où
 * peut-il bien se faire ? » — s'il n'y a qu'un seul endroit, c'est là : la
 * question et sa réponse sont la MÊME phrase, et les séparer coupait le
 * paragraphe en plein guillemet, laissant un « » — s'il n'y a… » orphelin.
 */
function phrases(texte) {
    const out = [];
    const re = /[^.!?]+[.!?]*[»"']*\s*/g;
    let m;
    while ((m = re.exec(texte)) !== null) {
        const t = m[0].trim();
        if (!t) continue;
        // La suite d'une citation rejoint la phrase qu'elle termine.
        if (out.length && /^[»"'\u2019]/.test(t)) out[out.length - 1] += ' ' + t;
        else out.push(t);
    }
    return out.length ? out : (texte.trim() ? [texte.trim()] : []);
}

/**
 * LES MORCEAUX D'UN PARAGRAPHE : du texte ordinaire, des mots forts, des
 * calculs. C'est ce découpage qui permet de colorer sans toucher au contenu.
 *
 * @returns {Array<{genre: 'mot'|'fort'|'calcul', texte: string}>}
 */
export function morceaux(texte) {
    const marques = [];
    const poser = (deb, fin, genre) => {
        if (fin <= deb) return;
        // Un calcul et un mot fort ne peuvent pas se recouvrir : le premier
        // trouvé garde la place, sinon on rendrait des morceaux imbriqués que
        // personne ne saurait dessiner.
        if (marques.some(m => deb < m.fin && fin > m.deb)) return;
        marques.push({ deb, fin, genre });
    };

    let m;
    RE_CALCUL.lastIndex = 0;
    while ((m = RE_CALCUL.exec(texte)) !== null) {
        const brut = nettoyerCalcul(m[0]);
        if (brut.length < 3 || !A_UN_OPERATEUR.test(brut)) continue;
        poser(m.index, m.index + brut.length, 'calcul');
    }
    RE_FORT.lastIndex = 0;
    while ((m = RE_FORT.exec(texte)) !== null) poser(m.index, m.index + m[0].length, 'fort');

    marques.sort((a, b) => a.deb - b.deb);
    // ON RECOUD LES CAPITALES QUE L'APOSTROPHE AVAIT COUPÉES. « UN TASUKO N'EST
    // PAS UNE CHASSE AUX ADDITIONS » ressortait en trois morceaux gras séparés
    // par « UN » et « N' » en maigre — parce qu'un mot de moins de trois
    // lettres n'ouvre pas une suite de capitales, à raison, mais qu'il peut
    // très bien se trouver AU MILIEU d'une. Deux marques fortes que rien ne
    // sépare qu'une poignée de caractères sans minuscule n'en font qu'une.
    for (let k = marques.length - 1; k > 0; k--) {
        const a = marques[k - 1], b = marques[k];
        if (a.genre !== 'fort' || b.genre !== 'fort') continue;
        const entre = texte.slice(a.fin, b.deb);
        if (entre.length <= 5 && !/[a-zà-öø-ÿ]/.test(entre)) {
            a.fin = b.fin;
            marques.splice(k, 1);
        }
    }
    const out = [];
    let i = 0;
    for (const mk of marques) {
        if (mk.deb > i) out.push({ genre: 'mot', texte: texte.slice(i, mk.deb) });
        out.push({ genre: mk.genre, texte: texte.slice(mk.deb, mk.fin) });
        i = mk.fin;
    }
    if (i < texte.length) out.push({ genre: 'mot', texte: texte.slice(i) });
    return out.filter(x => x.texte !== '');
}

/**
 * COMBIEN DE CARACTÈRES AVANT D'ALLER À LA LIGNE.
 *
 * Sur le téléphone de Rémy, deux cent vingt caractères font cinq lignes — un
 * paragraphe qu'on lit d'un souffle. Au-delà, l'œil perd le début en arrivant
 * à la fin, et c'est exactement l'effet de mur qu'il décrit. Ce n'est pas une
 * limite dure : on ne coupe jamais au milieu d'une phrase, on ferme le
 * paragraphe à la première phrase qui dépasse.
 */
export const LONGUEUR_PARAGRAPHE = 220;

/**
 * LA LEÇON EN BLOCS.
 *
 * @returns {Array<{genre: 'para'|'cas', titre?: string, morceaux: Array}>}
 *   `cas` porte un titre — « MÊME SIGNE » — et se dessine comme une entrée à
 *   part ; `para` est du texte suivi.
 */
export function decouperLecon(texte) {
    const brut = String(texte || '').trim();
    if (!brut) return [];

    // On repère d'abord les ouvertures de cas : elles commandent la coupe, et
    // une phrase ne doit jamais en enjamber une.
    const coupes = [];
    let m;
    RE_CAS.lastIndex = 0;
    while ((m = RE_CAS.exec(brut)) !== null) {
        coupes.push({ deb: m.index + m[1].length, apres: m.index + m[0].length, titre: m[2].trim() });
    }

    const blocs = [];
    let i = 0;
    /**
     * Le texte suivi se coupe en paragraphes de longueur lisible, phrase par
     * phrase — jamais au milieu de l'une d'elles.
     */
    const enParagraphes = (t) => {
        const out = [];
        let courant = '';
        for (const ph of phrases(t)) {
            if (courant && (courant.length + ph.length) > LONGUEUR_PARAGRAPHE) {
                out.push(courant.trim());
                courant = '';
            }
            courant += (courant ? ' ' : '') + ph;
        }
        if (courant.trim()) out.push(courant.trim());
        return out;
    };
    const ajouterTexte = (t) => {
        enParagraphes(t).forEach(p => blocs.push({ genre: 'para', morceaux: morceaux(p) }));
    };

    for (let k = 0; k < coupes.length; k++) {
        const c = coupes[k];
        if (c.deb > i) ajouterTexte(brut.slice(i, c.deb));
        const finCorps = k + 1 < coupes.length ? coupes[k + 1].deb : brut.length;
        // UN CAS LONG SE COUPE AUSSI. Son titre porte le premier paragraphe, le
        // reste suit en texte ordinaire : sans quoi le mur de texte réapparaît
        // dès qu'un cas s'explique en huit phrases — ce qui arrive, et c'est
        // même là que le besoin de respirer est le plus fort.
        const parts = enParagraphes(brut.slice(c.apres, finCorps).trim());
        blocs.push({ genre: 'cas', titre: c.titre, morceaux: morceaux(parts[0] || '') });
        parts.slice(1).forEach(p => blocs.push({ genre: 'para', morceaux: morceaux(p) }));
        i = finCorps;
    }
    if (i < brut.length) ajouterTexte(brut.slice(i));
    return blocs;
}

/** Le texte nu d'un bloc — ce que lira une synthèse vocale, ou un test. */
export const texteDe = (bloc) => bloc.morceaux.map(x => x.texte).join('');
