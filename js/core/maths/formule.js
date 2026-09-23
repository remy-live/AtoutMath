// ÉCRIRE UNE FORMULE MATHÉMATIQUE — sans bibliothèque, dans la police du site.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// D'OÙ VIENT CE FICHIER. Rémy, capture d'écran de « √49 × √36 » à l'appui :
// « les racines carrées sont très moches. As-tu créé une fonction pour afficher
// de jolies formules mathématiques mais avec la police de son choix ? » Puis,
// pour lever toute ambiguïté : « je veux pouvoir écrire des formules SANS
// BIBLIOTHÈQUE et avec la police que je veux ».
//
// La réponse était non. Six générateurs fabriquaient chacun leur balisage à la
// main, et chacun un peu différemment. Ce fichier est la fonction manquante.
//
// ── CE QUE LES DEUX CONTRAINTES INTERDISENT ─────────────────────────────────
//
// SANS BIBLIOTHÈQUE écarte KaTeX et MathJax, et ce n'est pas un caprice : l'un
// comme l'autre apportent leurs propres polices mathématiques, c'est-à-dire
// exactement ce que la seconde contrainte refuse. Une formule composée en
// Computer Modern au milieu d'une page en Outfit se voit immédiatement ; elle
// dit à l'élève que cette ligne-là n'appartient pas au reste.
//
// DANS LA POLICE DU SITE interdit aussi de s'appuyer sur les GLYPHES de la
// police pour les symboles. C'était la faute du premier rendu : le radical y
// était le caractère « √ » posé à côté d'un trait CSS. Les deux ne pouvaient
// pas se rejoindre — rien ne les reliait —, leurs épaisseurs venaient de deux
// sources différentes, et la hauteur du glyphe était figée par la police alors
// que la barre suivait le contenu. Mesuré sur la capture de Rémy : marche
// visible au raccord, trait du crochet en graisse normale contre des chiffres
// en graisse 700, barre de 2 px contre 3 px pour les fractions.
//
// D'OÙ LA RÈGLE DE CE MODULE : les SYMBOLES sont dessinés, les NOMBRES et les
// LETTRES sont du texte. Le radical est un tracé SVG, la barre de fraction une
// bordure ; les deux prennent leur épaisseur d'une seule variable, --fx-trait.
// Aucun symbole ne dépend d'un glyphe, aucun texte n'échappe à la police du
// site. On peut changer de police sans qu'une formule bouge.
//
// ── ET L'AUTRE RAISON D'ÊTRE, QUI N'ÉTAIT PAS DEMANDÉE ──────────────────────
//
// UNE FORMULE EST UN ARBRE, PAS UNE CHAÎNE. C'est ce qui règle un défaut trouvé
// la veille dans le chapitre des racines : l'écran affichait « 5√3 ÷ √3 »
// pendant que la fiche papier disait « √75 ÷ √3 ». Deux écritures fabriquées
// séparément, l'une par du HTML, l'autre par du texte — et rien ne garantissait
// qu'elles disent la même chose. Elles avaient la même VALEUR, ce qui rendait
// le défaut invisible à tout contrôle numérique.
//
// Ici, `html()` et `texte()` lisent LE MÊME ARBRE. Elles ne peuvent plus
// diverger : c'est une propriété de la structure, pas une vigilance à tenir.
//
// ── COMMENT ON ÉCRIT UNE FORMULE ────────────────────────────────────────────
//
//   formule('√(9 + 16)')            → le radical, barre au-dessus de la somme
//   formule('6√2')                  → multiplication implicite
//   formule('3/4 × x^2')            → fraction empilée, exposant
//   formule('(x − 3)(x + 3)')       → produit de parenthèses
//   texteDe(analyser('3/4'))        → « 3/4 », pour la fiche et la voix
//
// Et pour les générateurs, qui construisent plutôt qu'ils n'écrivent :
//
//   html(quotient(nombre(3), racine(nombre(7))))
//
// L'analyseur et les constructeurs produisent le MÊME arbre : on choisit selon
// qu'on écrit une formule à la main ou qu'on la calcule.

// ── LE SIGNE MOINS ──────────────────────────────────────────────────────────
//
// U+2212 MOINS, et non le trait d'union du clavier. Toute l'application s'y
// tient déjà (chercher `const M =` dans les générateurs) : le trait d'union est
// plus court, plus bas, et se lit comme une césure. On accepte les deux en
// entrée — on tape ce qu'on a sous la main — et l'on ne rend jamais que celui-ci.
const MOINS = '−';

const echapper = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── L'ARBRE ─────────────────────────────────────────────────────────────────
//
// Sept sortes de nœuds, et pas une de plus tant qu'un chapitre n'en a pas
// besoin. Chaque nœud est un objet nu : il se compare, se sérialise et se lit
// dans un message d'erreur sans cérémonie.

export const nombre = (v) => ({ sorte: 'nombre', v });
export const lettre = (nom) => ({ sorte: 'lettre', nom });
/** Une somme : les termes portent leur signe. `[a, b]` avec b négatif = a − b. */
export const somme = (...termes) => ({ sorte: 'somme', termes: termes.flat() });
/**
 * Un produit. `signe` dit comment il s'écrit :
 *   'implicite' → 6√2, 2x, (x−3)(x+3)   ·   'croix' → 3 × 4
 * C'est une décision d'ÉCRITURE, pas de calcul : 2 × x et 2x sont le même
 * produit, et le professeur veut choisir lequel s'affiche.
 */
export const produit = (facteurs, signe = 'croix') =>
    ({ sorte: 'produit', facteurs: [].concat(facteurs), signe });
export const quotient = (haut, bas) => ({ sorte: 'quotient', haut, bas });
export const puissance = (base, exposant) => ({ sorte: 'puissance', base, exposant });
export const racine = (sous) => ({ sorte: 'racine', sous });
export const oppose = (x) => ({ sorte: 'oppose', x });
/** Du texte libre au milieu d'une formule — une unité, un mot. */
export const texteBrut = (t) => ({ sorte: 'brut', t });

// ── L'ANALYSEUR ─────────────────────────────────────────────────────────────
//
// Une descente récursive ordinaire, du moins prioritaire au plus prioritaire :
//
//   somme    := produit (('+' | '−') produit)*
//   produit  := unaire (('×' | '/' | rien) unaire)*
//   unaire   := '−' unaire | puissance
//   puissance:= atome ('^' unaire)?          ← à droite : 2^3^2 = 2^(3^2)
//   atome    := nombre | lettre | '(' somme ')' | racine
//
// LA MULTIPLICATION IMPLICITE EST LA RAISON DE TOUT CECI. « 6√2 », « 2x »,
// « (x−3)(x+3) » s'écrivent sans signe, parce que c'est ainsi qu'on les écrit
// au tableau. Un analyseur qui l'ignorerait obligerait à taper « 6 × √2 », et
// l'on n'écrirait plus les formules comme on les lit.

function jetons(src) {
    const out = [];
    const s = String(src);
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        if (/\s/.test(c)) { i++; continue; }
        if (/[0-9]/.test(c)) {
            let j = i;
            while (j < s.length && /[0-9]/.test(s[j])) j++;
            // La virgule décimale française, admise entre deux chiffres.
            if (s[j] === ',' && /[0-9]/.test(s[j + 1] || '')) {
                j++;
                while (j < s.length && /[0-9]/.test(s[j])) j++;
            }
            out.push({ t: 'nombre', v: s.slice(i, j) }); i = j; continue;
        }
        // `sqrt` avant les lettres : sinon on lirait s, q, r, t.
        if (s.startsWith('sqrt', i)) { out.push({ t: 'racine' }); i += 4; continue; }
        if (c === '√') { out.push({ t: 'racine' }); i++; continue; }
        if (c === '+') { out.push({ t: 'plus' }); i++; continue; }
        if (c === '-' || c === MOINS) { out.push({ t: 'moins' }); i++; continue; }
        if (c === '*' || c === '×') { out.push({ t: 'fois' }); i++; continue; }
        if (c === ':' || c === '÷') { out.push({ t: 'divise' }); i++; continue; }
        if (c === '/') { out.push({ t: 'barre' }); i++; continue; }
        if (c === '^') { out.push({ t: 'chapeau' }); i++; continue; }
        // LES EXPOSANTS EN PETIT CARACTÈRE, ² ET ³, PARCE QUE TOUT LE DÉPÔT LES
        // ÉCRIT AINSI. `analyser('x² − 36')` levait « caractère inattendu »
        // alors que c'est l'écriture employée par tous les générateurs
        // existants — et par Rémy quand il tape une formule. On les lit comme
        // un accent circonflexe suivi du chiffre : « x² » et « x^2 » donnent
        // exactement le même arbre.
        if (c === '\u00b2' || c === '\u00b3') {
            out.push({ t: 'chapeau' });
            out.push({ t: 'nombre', v: c === '\u00b2' ? '2' : '3' });
            i++; continue;
        }
        if (c === '(') { out.push({ t: 'ouvre' }); i++; continue; }
        if (c === ')') { out.push({ t: 'ferme' }); i++; continue; }
        // LES OPÉRATEURS AVANT LES LETTRES, ET C'EST INDISPENSABLE.
        //
        // « × » est U+00D7 et « ÷ » est U+00F7 : tous deux tombent À
        // L'INTÉRIEUR de la plage À-ɏ qui reconnaît les lettres accentuées. Ce
        // sont les deux seuls caractères de ce bloc à ne pas être des lettres —
        // un accident de l'histoire du Latin-1.
        //
        // Avec le test des lettres placé AVANT, « √49 × √36 » se lisait comme
        // un produit implicite de TROIS facteurs, dont le deuxième était une
        // variable nommée « × ». Le texte rendu, « √49×√36 », avait l'air
        // presque juste : c'est ce qui rendait la faute difficile à voir.
        if (/[A-Za-zÀ-ɏ]/.test(c)) { out.push({ t: 'lettre', v: c }); i++; continue; }
        throw new Error(`formule : caractère inattendu « ${c} » dans « ${s} »`);
    }
    return out;
}

/**
 * @param {string} src la formule écrite
 * @returns {object} l'arbre
 */
export function analyser(src) {
    const js = jetons(src);
    let k = 0;
    const voir = () => js[k];
    const est = (t) => js[k] && js[k].t === t;
    const prendre = (t) => { if (!est(t)) return null; return js[k++]; };

    function lireSomme() {
        let g = lireProduit();
        while (est('plus') || est('moins')) {
            const neg = js[k++].t === 'moins';
            const d = lireProduit();
            const termes = g.sorte === 'somme' ? g.termes.slice() : [g];
            termes.push(neg ? oppose(d) : d);
            g = { sorte: 'somme', termes };
        }
        return g;
    }

    function lireProduit() {
        let g = lireUnaire();
        for (;;) {
            if (est('fois')) { k++; g = fusionner(g, lireUnaire(), 'croix'); continue; }
            if (est('divise')) { k++; g = { sorte: 'division', haut: g, bas: lireUnaire() }; continue; }
            if (est('barre')) { k++; g = quotient(g, lireUnaire()); continue; }
            // IMPLICITE : un atome qui en suit un autre sans rien entre eux.
            if (est('nombre') || est('lettre') || est('ouvre') || est('racine')) {
                g = fusionner(g, lireUnaire(), 'implicite'); continue;
            }
            return g;
        }
    }

    // Deux facteurs de même écriture s'aplatissent en un seul produit : a × b × c
    // donne trois facteurs et non deux produits imbriqués, ce qui rend le HTML
    // plus simple et le texte identique.
    function fusionner(g, d, signe) {
        if (g.sorte === 'produit' && g.signe === signe) {
            return produit([...g.facteurs, d], signe);
        }
        return produit([g, d], signe);
    }

    function lireUnaire() {
        if (est('moins')) { k++; return oppose(lireUnaire()); }
        return lirePuissance();
    }

    function lirePuissance() {
        const base = lireAtome();
        if (est('chapeau')) { k++; return puissance(base, lireUnaire()); }
        return base;
    }

    function lireAtome() {
        if (est('nombre')) return nombre(js[k++].v);
        if (est('lettre')) return lettre(js[k++].v);
        if (est('racine')) {
            k++;
            // √49 prend le nombre seul ; √(9 + 16) prend la parenthèse. C'est la
            // convention du tableau, et la barre rend le groupement visible sans
            // qu'on ait à écrire les parenthèses.
            return racine(lireAtome());
        }
        if (prendre('ouvre')) {
            const dedans = lireSomme();
            if (!prendre('ferme')) throw new Error(`formule : parenthèse non fermée dans « ${src} »`);
            return { sorte: 'groupe', dedans };
        }
        const j = voir();
        throw new Error(`formule : ${j ? `jeton « ${j.t} » inattendu` : 'formule incomplète'} dans « ${src} »`);
    }

    const arbre = lireSomme();
    if (k < js.length) throw new Error(`formule : « ${src} » n'a pas été lue jusqu'au bout`);
    return arbre;
}

// ── LES PRIORITÉS, POUR SAVOIR OÙ METTRE LES PARENTHÈSES ────────────────────
//
// ON N'ÉCRIT PAS LES PARENTHÈSES QU'ON A TAPÉES : on écrit celles qu'il FAUT.
// Un groupe superflu — √(49) — disparaît, et un groupe nécessaire apparaît même
// si l'arbre vient d'un constructeur qui ne l'a pas demandé. Sans cela, un
// générateur qui compose des morceaux produirait « x + 1 × 3 » là où il voulait
// « (x + 1) × 3 », et la formule dirait autre chose que le calcul.
//
// LA FRACTION ET LE RADICAL NE PRENNENT JAMAIS DE PARENTHÈSES à l'écran : leur
// barre groupe déjà. C'est tout l'intérêt de les dessiner.
//
// LA RACINE N'EST PAS DANS CE TABLEAU, ET C'EST VOULU : elle vaut donc le rang
// par défaut, celui des atomes. C'est exact du point de vue de la lecture —
// l'analyseur lit « √7 » d'un seul tenant, dans `lireAtome` —, et cela évite
// les parenthèses que rien ne réclame : « 3/(√7) » au lieu de « 3/√7 ».
const RANG = { somme: 1, produit: 2, oppose: 2, puissance: 4, quotient: 5 };
const rangDe = (n) => (n.sorte === 'groupe' ? rangDe(n.dedans) : (RANG[n.sorte] || 9));
const nu = (n) => (n.sorte === 'groupe' ? nu(n.dedans) : n);

// ── LE RENDU HTML ───────────────────────────────────────────────────────────

/**
 * LE RADICAL, DESSINÉ.
 *
 * Le crochet et la barre sont deux objets — un tracé SVG et une bordure — mais
 * ils forment un seul trait, et voici comment.
 *
 * L'ÉPAISSEUR : une seule variable, `--fx-trait`, lue par le `stroke-width` du
 * tracé et par la `border-top` du radicande. Elles ne peuvent plus différer.
 *
 * LE RACCORD : la bordure occupe les N premiers pixels de la boîte du
 * radicande, soit [0, N]. Le trait du crochet, lui, est CENTRÉ sur sa
 * trajectoire : posé en y = 0 il occuperait [−N/2, +N/2]. Le CSS descend donc
 * le dessin d'une demi-épaisseur, et les deux coïncident — à toute taille de
 * texte, puisque tout est en `em`.
 *
 * L'ÉTIREMENT : le crochet est dessiné dans une boîte de largeur fixe et de
 * hauteur libre (`preserveAspectRatio="none"`). Sur un radicande haut — une
 * fraction sous la racine — il s'allonge et devient plus élancé, ce que font
 * les vraies polices mathématiques pour les grands radicaux.
 * `vector-effect="non-scaling-stroke"` garantit que cet étirement n'épaissit
 * jamais le trait.
 *
 * LA LIGNE DE BASE : `.fx-rac` est un `inline-block`, et non un `inline-flex`.
 * Une boîte flex prend sa ligne de base sur son premier élément — ici le SVG,
 * qui n'en a pas —, et le navigateur se rabat sur son bord inférieur. Mesuré à
 * l'écran : dans « 6√2 » le 6 tombait sous le 2, et la formule se lisait comme
 * si le 2 était un exposant. Un `inline-block` prend sa ligne de base sur son
 * contenu en flux, c'est-à-dire sur les chiffres du radicande — précisément
 * ceux qui doivent s'aligner avec le texte autour.
 */
function radicalHtml(dedans) {
    return '<span class="fx-rac"><svg class="fx-crochet" viewBox="0 0 10 20" '
        + 'preserveAspectRatio="none" aria-hidden="true" focusable="false">'
        + '<path d="M0 12.4 L2.7 12.4 L5.2 19.4 L8.2 0 L10 0"/></svg>'
        + `<span class="fx-sous">${dedans}</span></span>`;
}

/**
 * LA FRACTION REPREND LE BALISAGE QUI EXISTE DÉJÀ, AU CARACTÈRE PRÈS.
 *
 * Premier jet : des classes neuves, `.fx-frac` / `.fx-num` / `.fx-den`. Propre,
 * isolé — et cassant, pour une raison qu'on ne voit qu'en cherchant :
 *
 *   · `js/core/activities/choice.js` reconnaît une fraction par une expression
 *     régulière qui exige LITTÉRALEMENT `<span class="fraction">` suivi de
 *     `<span class="fraction-num">`. C'est elle qui décide qu'une proposition
 *     tient dans un rond plutôt que dans une carte. Avec d'autres classes, les
 *     quatre propositions d'un calcul de fractions repartaient en cartes,
 *     une par ligne sur un téléphone — le défaut que Rémy avait déjà signalé ;
 *   · six feuilles de style surchargent ces classes par chapitre (Thalès en
 *     colonnes, les bandes de fractions, les bulles…).
 *
 * On réutilise donc le balisage tel quel. Et l'on n'ajoute AUCUNE classe sur
 * ces trois éléments : l'expression régulière les compare mot pour mot.
 */
const fractionHtml = (h, b) => '<span class="fraction">'
    + `<span class="fraction-num">${h}</span>`
    + `<span class="fraction-den">${b}</span></span>`;

/**
 * UNE PARENTHÈSE QUI GRANDIT AVEC CE QU'ELLE ENTOURE.
 *
 * Mesuré dans l'application : autour d'une fraction empilée, la parenthèse de
 * texte couvre 54 % de sa hauteur. Or le chapitre où elle sert le plus est
 * celui dont la leçon est « le 5 multiplie TOUTE la parenthèse » : une
 * parenthèse qui n'entoure visiblement pas tout enseigne le contraire de ce
 * qu'on veut.
 *
 * ON NE MESURE RIEN POUR AUTANT. L'arbre dit s'il contient une fraction ou une
 * racine ; si oui la parenthèse est dessinée et s'étire, sinon c'est celle de
 * la police, qui s'aligne mieux sur le texte et coûte moins. La décision est
 * prise sur la STRUCTURE, pas sur des pixels — donc elle vaut aussi sur le
 * papier et avant que la police soit chargée.
 */
function estHaut(n) {
    const x = nu(n);
    switch (x.sorte) {
        case 'quotient': case 'racine': return true;
        case 'somme': return x.termes.some(estHaut);
        case 'produit': return x.facteurs.some(estHaut);
        case 'division': return estHaut(x.haut) || estHaut(x.bas);
        case 'puissance': return estHaut(x.base);
        case 'oppose': return estHaut(x.x);
        default: return false;
    }
}

const COURBE = (d) => '<svg class="fx-par-trait" viewBox="0 0 6 20" '
    + 'preserveAspectRatio="none" aria-hidden="true" focusable="false">'
    + `<path d="${d}"/></svg>`;

function paren(x, haut) {
    if (!haut) return `<span class="fx-paren">(</span>${x}<span class="fx-paren">)</span>`;
    return `<span class="fx-par">${COURBE('M5 0.6 Q1 10 5 19.4')}`
        + `<span class="fx-par-dedans">${x}</span>`
        + `${COURBE('M1 0.6 Q5 10 1 19.4')}</span>`;
}

/** Le nombre tel qu'il s'écrit : vrai signe moins, vraie virgule. */
function nombreEcrit(v) {
    const s = String(v).replace('.', ',');
    return s.startsWith('-') ? MOINS + s.slice(1) : s;
}

function rendre(n, rangParent = 0) {
    const x = nu(n);
    let out;
    switch (x.sorte) {
        case 'nombre': out = echapper(nombreEcrit(x.v)); break;
        case 'lettre': out = `<i class="fx-var">${echapper(x.nom)}</i>`; break;
        case 'brut': out = echapper(x.t); break;

        case 'oppose':
            out = MOINS + rendre(x.x, RANG.oppose);
            break;

        case 'somme':
            out = x.termes.map((t, i) => {
                const neg = nu(t).sorte === 'oppose';
                const corps = rendre(neg ? nu(t).x : t, RANG.somme);
                if (i === 0) return neg ? MOINS + corps : corps;
                return ` ${neg ? MOINS : '+'} ${corps}`;
            }).join('');
            break;

        case 'produit':
            out = x.facteurs.map((f, i) => {
                const corps = rendre(f, RANG.produit);
                if (i === 0) return corps;
                return x.signe === 'croix' ? ` × ${corps}` : corps;
            }).join('');
            break;

        case 'division':
            out = `${rendre(x.haut, RANG.produit)} ÷ ${rendre(x.bas, RANG.produit)}`;
            break;

        // SOUS LA BARRE, AUCUNE PARENTHÈSE : la barre groupe. On repart donc
        // d'un rang nul pour les deux étages.
        case 'quotient':
            out = fractionHtml(rendre(x.haut, 0), rendre(x.bas, 0));
            break;
        case 'racine':
            out = radicalHtml(rendre(x.sous, 0));
            break;

        case 'puissance':
            // LA BASE PREND DES PARENTHÈSES DÈS QU'ELLE N'EST PAS ATOMIQUE :
            // (x + 1)² et x + 1² ne sont pas la même chose, et l'exposant seul
            // ne le dit pas.
            out = rendre(x.base, RANG.puissance + 1)
                + `<sup class="fx-exp">${rendre(x.exposant, 0)}</sup>`;
            break;

        default:
            throw new Error(`formule : sorte de nœud inconnue « ${x.sorte} »`);
    }
    return rangDe(x) < rangParent ? paren(out, estHaut(x)) : out;
}

/**
 * L'arbre, en HTML prêt à poser dans la page.
 *
 * AUCUN CONTENEUR AUTOUR, et c'est voulu. Un `<span class="fx">` enveloppant
 * aurait été commode pour porter les variables CSS, mais il aurait mis en
 * échec l'expression régulière de `choice.js`, qui est ancrée sur le DÉBUT du
 * libellé : une fraction seule ne se serait plus reconnue. Les variables sont
 * donc posées sur `:root` (voir css/components.css), ce qui ne coûte rien et
 * ne s'interpose nulle part.
 */
export function html(arbre) {
    return rendre(arbre);
}

// ── LE RENDU TEXTE ──────────────────────────────────────────────────────────
//
// LA FICHE PAPIER, LA LECTURE À VOIX HAUTE, LA RECHERCHE. Le même arbre, écrit
// à plat. C'est ici qu'est la garantie annoncée en tête de fichier : l'énoncé
// de l'écran et celui du papier ne PEUVENT plus dire deux choses différentes,
// puisqu'ils sont deux lectures d'un seul objet.
//
// Les exposants 2 et 3 s'écrivent ² et ³ — ils existent dans toutes les
// polices et se lisent mieux que « ^2 » sur une feuille.
const EXPOSANTS = { 2: '²', 3: '³' };

function rendreTexte(n, rangParent = 0) {
    const x = nu(n);
    let out;
    switch (x.sorte) {
        case 'nombre': out = nombreEcrit(x.v); break;
        case 'lettre': out = x.nom; break;
        case 'brut': out = x.t; break;
        case 'oppose': out = MOINS + rendreTexte(x.x, RANG.oppose); break;

        case 'somme':
            out = x.termes.map((t, i) => {
                const neg = nu(t).sorte === 'oppose';
                const corps = rendreTexte(neg ? nu(t).x : t, RANG.somme);
                if (i === 0) return neg ? MOINS + corps : corps;
                return ` ${neg ? MOINS : '+'} ${corps}`;
            }).join('');
            break;

        case 'produit':
            out = x.facteurs.map((f, i) => {
                const corps = rendreTexte(f, RANG.produit);
                if (i === 0) return corps;
                // À PLAT, L'IMPLICITE A UNE LIMITE : « 2 × 3 » écrit sans signe
                // donnerait « 23 ». La règle ne porte donc pas sur la SORTE du
                // facteur, mais sur ce qu'il s'apprête à écrire : on ne colle
                // que si son premier caractère n'est pas un chiffre.
                //
                // Première écriture : une liste de sortes autorisées. Elle
                // oubliait `puissance`, et « 2x² + 3x » sortait « 2 × x² + 3x »
                // — deux produits identiques écrits de deux façons dans la même
                // ligne. Lire le résultat plutôt que deviner d'après le type
                // ferme la question.
                const colle = x.signe === 'implicite' && !/^[0-9]/.test(corps);
                return colle ? corps : ` × ${corps}`;
            }).join('');
            break;

        // LA DIVISION EST ASSOCIATIVE À GAUCHE : c'est le terme de DROITE qui
        // a besoin de ses parenthèses. Voir le commentaire du quotient, juste
        // en dessous — c'est la même erreur et elle valait un faux énoncé.
        case 'division':
            out = `${rendreTexte(x.haut, RANG.produit)} ÷ `
                + `${rendreTexte(x.bas, RANG.quotient + 1)}`;
            break;

        // À PLAT, LA BARRE NE GROUPE PLUS : il faut les parenthèses que l'écran
        // n'écrivait pas. « (2 + 3)/5 » et « 2 + 3/5 » ne sont pas le même
        // nombre, et c'est exactement le genre d'écart qui ferait dire deux
        // choses à la fiche et à l'écran.
        case 'quotient': {
            // UN NUMÉRATEUR SIGNÉ NE PREND PAS DE PARENTHÈSES. « (−3)/4 » est
            // juste, mais c'est l'écriture d'un élève qui se méfie : on écrit
            // « −3/4 ». La permission est sûre parce qu'elle est réversible —
            // relu par l'analyseur, « −3/4 » redonne exactement cet arbre, le
            // moins unaire se liant plus fort que la barre.
            const h = nu(x.haut);
            const signeSeul = h.sorte === 'oppose'
                && ['nombre', 'lettre'].includes(nu(h.x).sorte);
            // LE DÉNOMINATEUR PREND UN CRAN DE PLUS, ET C'EST TOUT L'ENJEU.
            //
            // La barre est associative à GAUCHE : « 2/3/5 » se relit comme
            // « (2/3)/5 ». Un numérateur qui est lui-même une fraction n'a donc
            // besoin d'aucune parenthèse, mais un DÉNOMINATEUR si.
            //
            // Les deux étages étaient au même rang, si bien que ni l'un ni
            // l'autre n'en recevait : la fraction de fractions (2/3)/(5/7)
            // s'écrivait « 2/3/5/7 » sur la fiche papier — c'est-à-dire
            // 2/105 au lieu de 14/15. L'écran, lui, affichait la bonne
            // question : la feuille en posait une autre.
            //
            // Trouvé par le test d'aller-retour, qui relit le texte et compare
            // le dessin obtenu à celui de départ. Aucune relecture n'aurait vu
            // cette ligne.
            out = `${rendreTexte(x.haut, signeSeul ? 0 : RANG.quotient)}`
                + `/${rendreTexte(x.bas, RANG.quotient + 1)}`;
            break;
        }
        case 'racine': {
            const sous = nu(x.sous);
            const simple = ['nombre', 'lettre'].includes(sous.sorte);
            out = '√' + (simple ? rendreTexte(sous, 0) : `(${rendreTexte(sous, 0)})`);
            break;
        }

        case 'puissance': {
            const e = nu(x.exposant);
            const court = e.sorte === 'nombre' && EXPOSANTS[e.v];
            out = rendreTexte(x.base, RANG.puissance + 1)
                + (court || `^${rendreTexte(x.exposant, RANG.puissance + 1)}`);
            break;
        }

        default:
            throw new Error(`formule : sorte de nœud inconnue « ${x.sorte} »`);
    }
    return rangDe(x) < rangParent ? `(${out})` : out;
}

/** L'arbre, écrit à plat — fiche papier, lecture, recherche. */
export function texte(arbre) {
    return rendreTexte(arbre);
}

// ── LES DEUX RACCOURCIS ─────────────────────────────────────────────────────

/** Écrire une formule et obtenir son HTML : `formule('√(9 + 16)')`. */
export function formule(src) {
    return html(analyser(src));
}

/** La même, écrite à plat : `formuleTexte('3/4 × 2')` → « 3/4 × 2 ». */
export function formuleTexte(src) {
    return texte(analyser(src));
}

/**
 * Les deux d'un coup, ce dont un générateur a besoin pour un énoncé :
 * `const e = lesDeux('√75 ÷ √3');  prompt: { text: e.texte, html: e.html }`
 */
export function lesDeux(src) {
    const a = analyser(src);
    return { arbre: a, html: html(a), texte: texte(a) };
}

export const POUR_ESSAI = { MOINS, jetons, rangDe, nombreEcrit };
