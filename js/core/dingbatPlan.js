// UN DINGBAT SUR LE PAPIER — la même énigme, en formes posées.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Faire le pdf pour … Ding Bats ». Les cent neuf énigmes n'avaient
// aucune version imprimée, et c'est le seul jeu du catalogue qui se joue aussi
// bien sur une feuille que sur un écran : rien n'y est animé, rien ne s'y
// clique, on REGARDE et l'on dit ce qu'on lit. Un dingbat au tableau ou sur une
// photocopie de début d'heure, c'est son usage naturel.
//
// ── POURQUOI UN MODULE DE PLUS, ET NON DU jsPDF DANS LA FICHE ──────────────
//
// `core/dingbat.js` rend du HTML, et le HTML est un moteur de mise en page :
// `display: flex`, `gap`, `transform: rotate(-90deg)`, `letter-spacing: -.1em`.
// jsPDF n'a rien de tout cela — il a `text(x, y)` et `rect(x, y, w, h)`. Entre
// les deux, il manque la MISE EN PAGE : quelle largeur fait ce mot, où tombe le
// suivant, où centrer l'ensemble.
//
// Ce module la calcule, UNE FOIS, et rend des formes en millimètres. L'aperçu
// de la feuille et le PDF consomment la même liste — c'est le tour qu'ont pris
// `bandesDuStrimko` (latins.js) et `formesDeLaFigure` (nombres.js), et pour la
// même raison : deux descriptions à tenir d'accord finissent par diverger, et
// c'est toujours l'imprimée qui diverge, puisque personne ne la regarde.
//
// ── ET L'APERÇU DE LA FEUILLE NE RÉEMPLOIE PAS LE HTML DE L'ÉCRAN ──────────
//
// Il aurait suffi d'un `dessiner(d)` dans un `<div>` : c'est justement ce qu'il
// ne faut pas. L'aperçu d'une fiche sert à juger CE QUI SORTIRA DE
// L'IMPRIMANTE, et le HTML de l'écran ne sortira jamais de l'imprimante. On
// aurait regardé une mise en page pour en valider une autre — exactement le
// défaut que `tools/pdfEnImage.mjs` existe pour empêcher.
//
// ── CE MODULE EST PUR ──────────────────────────────────────────────────────
//
// Ni DOM, ni hasard. Il reçoit une fonction qui MESURE un texte, parce que la
// largeur d'un mot dépend de la police et que seul l'appelant la connaît. Il
// s'éprouve donc sous Node : `tests/dingbatPlan.test.mjs`.

/**
 * LES PROPORTIONS D'UN MOT, en parts de son corps.
 *
 * Mesurées sur Helvetica gras, qui est la police des deux rendus. La hauteur
 * d'une capitale vaut environ sept dixièmes du corps ; on compte un peu large
 * pour que deux lignes empilées ne se touchent jamais.
 */
const HAUTEUR_MOT = 0.78;
/** L'écart entre deux morceaux d'une scène, en parts de corps. */
const ECART = 0.5;

/** Les tailles relatives nommées par les dispositions. */
const PETIT = 0.45;
const GRAND = 1.5;

/**
 * LA SCÈNE D'UNE ÉNIGME : des morceaux, et le sens dans lequel on les range.
 *
 * `sens` vaut `rangee` (de gauche à droite), `pile` (de haut en bas), `croix`
 * (deux mots perpendiculaires) ou `cadre` (une forme, et des mots autour ou
 * dedans). C'est tout le vocabulaire dont les vingt-deux dispositions ont
 * besoin — ce qui est la preuve que la grammaire de `dingbat.js` était bien
 * taillée.
 */
export function sceneDuDingbat(d) {
    const mots = Array.isArray(d.mots) ? d.mots : [];
    const m0 = mots[0] == null ? '' : String(mots[0]);
    const lettres = (mot) => [...String(mot)];

    switch (d.forme) {
    // ── Les empilements. Le TRAIT entre deux mots dit « l'un SUR l'autre » ;
    //    deux parallèles n'en ont pas, et c'est ce détail qui change la
    //    réponse (la règle est écrite dans `css/modules.css`).
    case 'sur': case 'sous':
        return { sens: 'pile', trait: true, morceaux: mots.map(t => ({ k: 'mot', texte: t })) };
    case 'paralleles':
        return { sens: 'pile', trait: false,
            morceaux: [{ k: 'mot', texte: m0 }, { k: 'mot', texte: m0 }] };

    // ── Le dedans et l'autour.
    case 'dans':
        return { sens: 'cadre', forme: d.cadre || 'carre', dedans: m0 };
    case 'autour':
        return { sens: 'cadre', forme: d.cadre || 'carre', autour: m0 };
    case 'traverse':
        return { sens: 'cadre', forme: d.cadre || 'cercle', travers: m0, biais: !!d.biais };

    case 'croisent':
        return { sens: 'croix', horizontal: m0, vertical: mots[1] == null ? m0 : String(mots[1]) };

    // ── Les répétitions et les suites.
    case 'repete':
        return { sens: 'rangee', morceaux: Array.from({ length: d.combien || 2 },
            () => ({ k: 'mot', texte: m0 })) };
    case 'tel':
        return { sens: 'rangee', morceaux: mots.map(t => ({ k: 'mot', texte: t })) };
    case 'rang':
        return { sens: 'rangee', morceaux: mots.map((t, i) => ({ k: 'mot', texte: t,
            pale: i !== d.ou, vedette: i === d.ou })) };
    case 'entre':
        return { sens: 'rangee', morceaux: [
            { k: 'mot', texte: mots[1] == null ? '' : String(mots[1]), pale: true },
            { k: 'mot', texte: m0, vedette: true },
            { k: 'mot', texte: String(mots[2] == null ? mots[1] : mots[2]), pale: true }] };

    // ── Les transformations.
    case 'miroir':
        return { sens: 'rangee', morceaux: [{ k: 'mot', texte: m0 }, { k: 'axe' },
            { k: 'mot', texte: m0, miroir: true }] };
    case 'demiTour':
        return { sens: 'rangee', morceaux: [{ k: 'mot', texte: m0 }, { k: 'point' },
            { k: 'mot', texte: m0, angle: 180 }] };
    case 'glisse':
        return { sens: 'rangee', morceaux: [{ k: 'mot', texte: m0, pale: true },
            { k: 'fleche' }, { k: 'mot', texte: m0 }] };
    case 'tourne':
        return { sens: 'rangee', morceaux: [{ k: 'mot', texte: m0 },
            { k: 'mot', texte: m0, angle: -90 }] };
    case 'tailles': {
        // LE SENS EST LA MOITIÉ DE L'ÉNIGME : grand → petit se lit
        // « réduction », petit → grand « agrandissement ».
        const monte = d.sens === 'agrandissement';
        return { sens: 'rangee', bas: true, morceaux: [
            { k: 'mot', texte: m0, ech: monte ? PETIT : GRAND },
            { k: 'fleche' },
            { k: 'mot', texte: m0, ech: monte ? GRAND : PETIT }] };
    }

    // ── Ce qu'on fait au mot lui-même.
    case 'ecarte':
        return { sens: 'rangee', large: true,
            morceaux: lettres(m0).map(l => ({ k: 'mot', texte: l })) };
    case 'serre':
        // LES LETTRES SE CHEVAUCHENT. `letter-spacing: -.1em` à l'écran ; ici
        // on les pose une par une avec un pas raccourci, parce qu'un PDF n'a
        // pas d'interlettrage.
        return { sens: 'rangee', chevauche: true,
            morceaux: lettres(m0).map(l => ({ k: 'mot', texte: l })) };
    case 'coupe':
        return { sens: 'rangee', morceaux: [{ k: 'mot', texte: m0 }, { k: 'coupure' },
            { k: 'mot', texte: mots[1] == null ? '' : String(mots[1]) }] };
    case 'manque':
        // LA LETTRE QUI MANQUE RESTE LISIBLE, BARRÉE : sans elle, l'élève ne
        // sait pas CE qui manque — et c'est justement la question.
        //
        // LES LETTRES NE SE CHEVAUCHENT PAS ICI, à la différence de `serre` :
        // mesuré sur la feuille, « PARTAGE » sortait soudé et la barre de la
        // dernière lettre mordait sur la voisine. C'est `serre` qui veut des
        // lettres collées, et c'est son énigme entière ; celle-ci veut un mot
        // ordinaire dont une lettre est barrée.
        return { sens: 'rangee', colle: true,
            morceaux: lettres(m0).map((l, i) => ({ k: 'mot', texte: l,
                pale: i === d.ou, barre: i === d.ou })) };
    case 'desordre':
        return { sens: 'rangee', morceaux: lettres(d.melange || m0).map((l, i) => ({
            k: 'mot', texte: l,
            // L'INCLINAISON EST ÉCRITE DANS L'ÉNIGME, pas tirée au sort : une
            // énigme qui change de forme n'est plus la même énigme, et l'élève
            // qui revient sur sa feuille ne la reconnaît pas. Ce sont les
            // mêmes nombres qu'à l'écran.
            angle: (i % 2 ? 1 : -1) * (6 + (i * 5) % 14),
            monte: ((i * 7) % 12) - 6, penche: true })) };

    // ── Les positions en hauteur.
    // L'EXPOSANT SE COLLE AU MOT. MESURÉ : avec l'écart ordinaire, le « 2 »
    // de « x² » flottait à un centimètre du x, en haut à droite — on ne lisait
    // plus « x au carré », on lisait deux choses posées côte à côte. Un
    // exposant touche ce qu'il élève ; c'est ce qui le distingue d'un facteur.
    case 'exposant':
        return { sens: 'rangee', bas: true, colle: true, morceaux: [{ k: 'mot', texte: m0 },
            { k: 'mot', texte: String(mots[1] == null ? '' : mots[1]), ech: PETIT, haut: 0.34 }] };
    case 'indice':
        return { sens: 'rangee', bas: true, colle: true, morceaux: [{ k: 'mot', texte: m0 },
            { k: 'mot', texte: String(mots[1] == null ? '' : mots[1]), ech: PETIT, haut: -0.1 }] };

    case 'libre':
        return { sens: 'libre', elements: Array.isArray(d.elements) ? d.elements : [] };

    default:
        // ON JETTE PLUTÔT QUE DE RENDRE UNE BOÎTE VIDE — la règle de
        // `dessiner()`, et pour la même raison : une énigme muette, c'est la
        // même chose qu'un logiciel cassé, et l'élève chercherait la réponse
        // d'un dessin qui n'existe pas.
        throw new Error(`dingbat « ${d && d.id} » : disposition inconnue « ${d && d.forme} »`);
    }
}

/** La largeur d'un morceau, au corps de référence. */
function largeurMorceau(p, u, mesurer) {
    if (p.k === 'axe' || p.k === 'coupure') return u * 0.22;
    if (p.k === 'point') return u * 0.4;
    if (p.k === 'fleche') return u * 1.1;
    const l = mesurer(p.texte, u * (p.ech || 1));
    // UN MOT TOURNÉ D'UN QUART DE TOUR N'OCCUPE PLUS SA LARGEUR mais sa
    // hauteur. Sans cette ligne, « MÈTRE » tourné débordait du bloc d'autant
    // qu'il est long.
    if (p.angle === 90 || p.angle === -90) return u * (p.ech || 1) * HAUTEUR_MOT;
    // UNE LETTRE PENCHÉE OCCUPE PLUS QUE SA LARGEUR : sa diagonale. MESURÉ sur
    // la feuille, les lettres en désordre sortaient du bloc par la droite.
    if (p.penche) return l * 1.3;
    return l;
}

/** La hauteur d'un morceau, au corps de référence. */
function hauteurMorceau(p, u, mesurer) {
    if (p.k !== 'mot') return u * HAUTEUR_MOT;
    if (p.angle === 90 || p.angle === -90) return mesurer(p.texte, u * (p.ech || 1));
    const h = u * (p.ech || 1) * HAUTEUR_MOT + Math.abs(p.haut || 0) * u;
    // Une lettre penchée ET décalée vers le haut ou le bas : les deux
    // s'ajoutent, et c'est la somme qui doit tenir.
    return p.penche ? h * 1.3 + Math.abs(p.monte || 0) * u * 0.06 : h;
}

/**
 * LA BOÎTE D'UN DESSIN LIBRE, dans ses propres unités.
 *
 * On ne rappelle pas `boiteLibre` de `dingbatLibre.js` : ce module-ci ne doit
 * dépendre de rien, et la boîte se recalcule en six lignes. Les largeurs de
 * texte y sont estimées large, comme là-bas — une estimation trop juste
 * COUPERAIT une lettre, une estimation large ne coûte qu'un peu de blanc.
 */
function boiteDesElements(els) {
    const xs = [];
    const ys = [];
    for (const e of els) {
        if (!e) continue;
        if (e.type === 'mot') {
            const t = e.taille || 24;
            const demi = String(e.texte || '').length * t * 0.34;
            xs.push((e.x || 0) - demi, (e.x || 0) + demi);
            ys.push((e.y || 0) - t * 0.62, (e.y || 0) + t * 0.62);
        } else if (e.type === 'trait') {
            xs.push(e.x1 || 0, e.x2 || 0);
            ys.push(e.y1 || 0, e.y2 || 0);
        } else {
            xs.push((e.x || 0), (e.x || 0) + (e.largeur || 0));
            ys.push((e.y || 0), (e.y || 0) + (e.hauteur || 0));
        }
    }
    if (!xs.length) return { x: 0, y: 0, w: 1, h: 1 };
    const x1 = Math.min(...xs);
    const x2 = Math.max(...xs);
    const y1 = Math.min(...ys);
    const y2 = Math.max(...ys);
    const marge = Math.max(6, Math.max(x2 - x1, y2 - y1) * 0.06);
    return { x: x1 - marge, y: y1 - marge,
        w: Math.max(1, x2 - x1 + marge * 2), h: Math.max(1, y2 - y1 + marge * 2) };
}

/**
 * LE PLAN D'UN DINGBAT : des formes en millimètres, dans la boîte donnée.
 *
 * @param {object} d        l'énigme, telle qu'elle est écrite dans `data/dingbats.js`
 * @param {{x,y,w,h}} b     la boîte, en millimètres
 * @param {(texte:string, corps:number) => number} mesurer
 *        la largeur d'un texte écrit à ce corps, en millimètres. Les deux
 *        rendus passent la MÊME estimation, sans quoi l'aperçu montrerait une
 *        mise en page que le PDF n'aurait pas.
 * @returns {{corps:number, formes:object[]}}
 */
export function planDuDingbat(d, b, mesurer) {
    const scene = sceneDuDingbat(d);
    const formes = [];
    const centre = { x: b.x + b.w / 2, y: b.y + b.h / 2 };

    // ── LE DESSIN LIBRE : ses coordonnées sont déjà là, il ne reste qu'à les
    //    mettre à l'échelle de la boîte.
    if (scene.sens === 'libre') {
        const cadre = boiteDesElements(scene.elements);
        const k = Math.min(b.w / cadre.w, b.h / cadre.h);
        const X = (x) => centre.x + (x - cadre.x - cadre.w / 2) * k;
        const Y = (y) => centre.y + (y - cadre.y - cadre.h / 2) * k;
        for (const e of scene.elements) {
            if (!e) continue;
            if (e.type === 'mot') {
                formes.push({ t: 'mot', texte: String(e.texte == null ? '' : e.texte),
                    cx: X(e.x || 0), cy: Y(e.y || 0), corps: (e.taille || 24) * k,
                    angle: e.angle || 0, miroir: !!e.miroir });
            } else if (e.type === 'trait') {
                formes.push({ t: 'trait', x1: X(e.x1 || 0), y1: Y(e.y1 || 0),
                    x2: X(e.x2 || 0), y2: Y(e.y2 || 0),
                    epaisseur: Math.max(0.3, (e.epaisseur || 2) * k) });
            } else if (e.type === 'forme') {
                formes.push({ t: 'forme', forme: e.forme || 'carre',
                    x: X(e.x || 0), y: Y(e.y || 0),
                    w: (e.largeur || 0) * k, h: (e.hauteur || 0) * k });
            }
        }
        return { corps: 10 * k, formes };
    }

    // ── LA FORME ET SES MOTS : une boîte, et ce qu'on pose dedans ou autour.
    if (scene.sens === 'cadre') {
        // LA FORME PREND LES DEUX TIERS DE LA BOÎTE quand un mot l'entoure :
        // il faut la place d'un mot de chaque côté, et au-dessus et dessous.
        const part = scene.autour ? 0.46 : 0.78;
        const w = Math.min(b.w * part, b.h * part * 1.9);
        const h = Math.min(b.h * part, w * (scene.forme === 'cercle' ? 1 : 0.7));
        const x = centre.x - w / 2;
        const y = centre.y - h / 2;
        formes.push({ t: 'forme', forme: scene.forme, x, y, w, h });
        const mot = scene.dedans || scene.autour || scene.travers;
        // ── CE QUI TIENT DANS UNE FORME DÉPEND DE LA FORME ────────────────
        //
        // MESURÉ sur la feuille : « CERCLE » posé dans un TRIANGLE en sortait
        // des deux côtés. Un triangle n'offre sa largeur qu'à sa base, un
        // losange qu'à sa diagonale, un cercle qu'à son diamètre — seul un
        // rectangle offre vraiment la sienne. La part utile est donc écrite
        // forme par forme, et le mot d'un triangle descend en plus vers la
        // base, où il y a de la place (l'écran fait pareil, avec un
        // `padding-top`).
        const PART_UTILE = { triangle: 0.46, losange: 0.52, cercle: 0.64, nuage: 0.62,
            cube: 0.7, coin: 0.74, carre: 0.8, rectangle: 0.84 };
        const utile = PART_UTILE[scene.forme] === undefined ? 0.8 : PART_UTILE[scene.forme];
        const dispo = scene.autour ? (b.w - w) / 2 * 0.92
            // UNE TRAVERSÉE EN BIAIS SUIT LA DIAGONALE, qui est plus longue que
            // le côté : c'est ce qui distingue un diamètre d'une diagonale.
            // ET UNE TRAVERSÉE DÉBORDE : « un mot TRAVERSE une forme DE PART
            // EN PART » — s'il tient à l'intérieur, il est DANS la forme, et
            // c'est une autre énigme. Il sort donc des deux côtés, comme à
            // l'écran.
            : (scene.travers
                ? (scene.biais ? Math.hypot(w, h) * 1.04 : w * 1.14)
                : w * utile);
        let corps = 10 * dispo / Math.max(0.01, mesurer(mot, 10));
        // LE PLAFOND N'EST PAS LE MÊME POUR UNE TRAVERSÉE. MESURÉ : borné par
        // le tiers de la boîte, « MÈTRE » tenait tout entier DANS l'ellipse —
        // or un mot qui tient dedans est un mot « dans une forme », et c'est
        // une autre énigme. Une traversée n'est bornée que par la forme
        // qu'elle traverse.
        corps = Math.max(2.2, scene.travers
            ? Math.min(corps, h * 0.62)
            : Math.min(corps, h * 0.55, b.h * 0.28));
        if (scene.dedans) {
            // DANS UN TRIANGLE, LE MOT DESCEND : au milieu, la figure n'a pas
            // encore sa largeur, et le mot sort par les deux pentes.
            const bas = scene.forme === 'triangle' ? h * 0.22 : 0;
            formes.push({ t: 'mot', texte: mot, cx: centre.x, cy: centre.y + bas, corps });
        } else if (scene.travers) {
            formes.push({ t: 'mot', texte: mot, cx: centre.x, cy: centre.y, corps,
                // LE BIAIS DISTINGUE UN DIAMÈTRE D'UNE DIAGONALE, et c'est
                // tout l'écart entre deux énigmes qui se ressemblent.
                angle: scene.biais ? -Math.round(Math.atan2(h, w) * 180 / Math.PI) : 0 });
        } else {
            // LES QUATRE CÔTÉS PORTENT LE MÊME MOT, et c'est ce qui se lit :
            // il ENTOURE. Un seul exemplaire posé à côté ne dirait rien.
            const marge = corps * 0.75;
            formes.push({ t: 'mot', texte: mot, cx: centre.x, cy: y - marge, corps });
            formes.push({ t: 'mot', texte: mot, cx: centre.x, cy: y + h + marge, corps });
            formes.push({ t: 'mot', texte: mot, cx: x - marge, cy: centre.y, corps, angle: -90 });
            formes.push({ t: 'mot', texte: mot, cx: x + w + marge, cy: centre.y, corps, angle: 90 });
        }
        return { corps, formes };
    }

    // ── DEUX MOTS QUI SE CROISENT À ANGLE DROIT.
    if (scene.sens === 'croix') {
        const u = 10;
        const lh = mesurer(scene.horizontal, u);
        const lv = mesurer(scene.vertical, u);
        // LES DEUX MOTS SE CROISENT EN LEUR MILIEU, donc chacun doit tenir
        // ENTIÈREMENT dans sa direction : la largeur pour l'un, la hauteur
        // pour l'autre. MESURÉ : « DROITE » vertical grimpait par-dessus le
        // titre du bloc, parce que la hauteur n'était bornée que par le corps.
        const corps = Math.max(2.2, Math.min(u * b.w / Math.max(lh, u * HAUTEUR_MOT) * 0.86,
            u * b.h / Math.max(lv, u * HAUTEUR_MOT) * 0.86, 22));
        formes.push({ t: 'mot', texte: scene.horizontal, cx: centre.x, cy: centre.y, corps });
        formes.push({ t: 'mot', texte: scene.vertical, cx: centre.x, cy: centre.y,
            corps, angle: -90 });
        return { corps, formes };
    }

    // ── UNE RANGÉE OU UNE PILE. On mesure à un corps de référence, puis on
    //    met à l'échelle : la largeur d'un texte est proportionnelle au corps,
    //    donc une seule mesure suffit pour trouver celui qui tient.
    const u = 10;
    const ms = scene.morceaux;
    // LES LETTRES SERRÉES SE CHEVAUCHENT POUR DE BON. MESURÉ sur la feuille :
    // à 0,82 le mot sortait d'un espacement ORDINAIRE, parce que la mesure
    // d'un texte est volontairement large (voir `mesurerDingbat`) et que les
    // deux écarts s'annulaient. « les lettres sont SERRÉES » doit se voir.
    const pas = scene.chevauche ? 0.66 : 1;
    // `colle` : des lettres d'un même mot, donc sans l'écart qui sépare deux
    // morceaux — mais sans chevauchement non plus.
    const ecart = scene.large ? ECART * 3
        : (scene.chevauche ? 0 : (scene.colle ? ECART * 0.12 : ECART));
    const larges = ms.map(p => largeurMorceau(p, u, mesurer));
    const hauts = ms.map(p => hauteurMorceau(p, u, mesurer));

    let W;
    let H;
    if (scene.sens === 'pile') {
        W = Math.max(...larges);
        H = hauts.reduce((s, v) => s + v, 0) + ECART * u * (ms.length - 1);
    } else {
        W = larges.reduce((s, v) => s + v * pas, 0) + ecart * u * (ms.length - 1);
        H = Math.max(...hauts);
    }
    const corps = Math.max(2.2, Math.min(u * b.w / W, u * b.h / H, 26) * 0.94);
    const k = corps / u;

    if (scene.sens === 'pile') {
        const total = H * k;
        let y = centre.y - total / 2;
        ms.forEach((p, i) => {
            const h = hauts[i] * k;
            if (i && scene.trait) {
                // LE TRAIT ENTRE DEUX MOTS DIT « L'UN SUR L'AUTRE » — c'est le
                // trait de fraction, et sans lui l'énigme ne dit plus rien.
                const demi = Math.max(...larges) * k / 2 + corps * 0.2;
                formes.push({ t: 'trait', x1: centre.x - demi, y1: y - ECART * corps / 2,
                    x2: centre.x + demi, y2: y - ECART * corps / 2,
                    epaisseur: Math.max(0.4, corps * 0.09) });
            }
            formes.push(...formeDuMorceau(p, centre.x, y + h / 2, corps));
            y += h + ECART * corps;
        });
        return { corps, formes };
    }

    const total = W * k;
    let x = centre.x - total / 2;
    ms.forEach((p, i) => {
        const w = larges[i] * k;
        // `bas` : les morceaux s'alignent par le BAS et non par le milieu —
        // c'est ce que fait `.dg-serie--bas`, et c'est indispensable à un
        // exposant, qui se lit par rapport à la ligne d'écriture.
        const cy = scene.bas
            ? centre.y + (Math.max(...hauts) * k - hauteurMorceau(p, u, mesurer) * k) / 2
            : centre.y;
        formes.push(...formeDuMorceau(p, x + w / 2, cy, corps, w));
        x += w * pas + ecart * corps;
    });
    return { corps, formes };
}

/** Un morceau de scène, posé à (cx, cy) : une à trois formes. */
function formeDuMorceau(p, cx, cy, corps, large) {
    if (p.k === 'axe') {
        // L'AXE DE SYMÉTRIE : un trait plein, vertical.
        const h = corps * 1.3;
        return [{ t: 'trait', x1: cx, y1: cy - h / 2, x2: cx, y2: cy + h / 2,
            epaisseur: Math.max(0.5, corps * 0.1), marque: true }];
    }
    if (p.k === 'coupure') {
        // LA COUPURE : un trait en pointillés, comme un coup de ciseaux.
        const h = corps * 1.3;
        return [{ t: 'trait', x1: cx, y1: cy - h / 2, x2: cx, y2: cy + h / 2,
            epaisseur: Math.max(0.5, corps * 0.11), marque: true, pointille: true }];
    }
    if (p.k === 'point') {
        return [{ t: 'point', cx, cy, r: Math.max(0.5, corps * 0.11), marque: true }];
    }
    if (p.k === 'fleche') {
        const l = corps * 0.9;
        return [{ t: 'fleche', x1: cx - l / 2, y1: cy, x2: cx + l / 2, y2: cy,
            epaisseur: Math.max(0.3, corps * 0.06) }];
    }
    const c = corps * (p.ech || 1);
    const forme = { t: 'mot', texte: p.texte, cx, cy: cy - (p.haut || 0) * corps
        + (p.monte || 0) * corps * 0.06,
    corps: c, angle: p.angle || 0, miroir: !!p.miroir, pale: !!p.pale,
    vedette: !!p.vedette };
    if (!p.barre) return [forme];
    // LA BARRE FAIT LA LARGEUR DE SA LETTRE, et non du corps : mesuré sur la
    // feuille, une barre au corps débordait sur la lettre d'à côté et l'on
    // ne savait plus laquelle manque — c'est pourtant toute la question.
    const w = Math.max(c * 0.3, (large || c * 0.7) * 0.9);
    return [forme, { t: 'barre', cx, cy, w, epaisseur: Math.max(0.3, c * 0.07) }];
}
