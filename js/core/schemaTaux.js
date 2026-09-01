// LE SCHÉMA D'UNE GRANDEUR COMPOSÉE — la répétition, pas l'étiquette.
//
// Rémy : « pour les grandeurs composées, peut-être faut-il des schémas ? Je
// trouve que celui de temps distance vitesse n'aide pas beaucoup. »
//
// IL AVAIT RAISON, ET LE PREMIER SCHÉMA ÉTAIT FAUTIF DANS SON PRINCIPE. Il
// dessinait une route et écrivait « d = 520 km » dessus : il ÉTIQUETAIT
// l'énoncé. L'élève savait déjà que 520 était une distance — ce qu'il ne voit
// pas, c'est POURQUOI on multiplie.
//
// Ce qui le montre, c'est la RÉPÉTITION. Trois heures à 60 km/h, ce sont trois
// bonds de 60 km mis bout à bout : la multiplication est là, dans le dessin, et
// l'on n'a plus besoin de retenir la formule. Le même dessin répond aux trois
// questions du chapitre, ce qui n'est pas un hasard mais leur définition :
//
//   · on cherche le TOTAL      → on met les paquets bout à bout : on MULTIPLIE ;
//   · on cherche COMBIEN DE PAQUETS → on regarde combien de fois le paquet tient
//     dans le total : on DIVISE ;
//   · on cherche LA VALEUR D'UN PAQUET → on partage le total : on DIVISE.
//
// ET C'EST LE MÊME DESSIN POUR TOUTES LES GRANDEURS COMPOSÉES. « 7,9 g pour
// 1 cm³ », « 12 L pour 1 min », « 60 km pour 1 h » : une bande découpée en
// unités, chacune portant ce qu'il y a « pour un ». Un seul schéma à
// comprendre, et le chapitre entier tient dedans — c'est très exactement ce que
// l'exercice des grandeurs composées enseigne par le texte.

const ENCRE = '#1a202c';
const PALE = '#8a90a0';
const PAQUET = '#2563eb';
const REMPLI = 'rgba(37, 99, 235, .12)';
const CHERCHE = '#d97706';

const arr = (v) => Math.round(v * 100) / 100;
const fr = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');

/** Au-delà, la bande devient illisible : on abrège avec des points de suite. */
const CASES_MAX = 6;

/**
 * @param {Object} t
 *   `parUn`   { valeur, unite } — ce qu'il y a POUR UNE unité (le haut du taux)
 *   `combien` { valeur, unite } — combien d'unités (le bas du taux)
 *   `total`   { valeur, unite } — le total
 *   `cherche` 'total' | 'combien' | 'parUn'
 *   `taux`    l'écriture du taux, en toutes lettres : « 60 km/h »
 * @returns {string} du SVG autonome
 */
export function schemaTauxSvg(t, { taille = 330 } = {}) {
    const L = 100, H = 56;
    const k = taille / L;
    const T = (v) => arr(v * k);
    const inconnu = (quoi) => (t.cherche === quoi);

    const cases = decouper(t.combien.valeur);
    // Quand c'est le NOMBRE de paquets qu'on cherche, on n'en dessine pas le
    // compte : on en montre quelques-uns et des points de suite. Sinon le
    // schéma répondrait à la question qu'il pose.
    const abrege = inconnu('combien') || cases.length > CASES_MAX;
    const vues = abrege ? [1, 1, 1] : cases;

    const x0 = 8, x1 = 92, yh = 18, yb = 32;
    const largeur = x1 - x0;
    // En abrégé, les trois cases montrées occupent les deux tiers, et le reste
    // est la zone des points de suite.
    const utile = abrege ? largeur * 0.62 : largeur;
    const totalParts = vues.reduce((a, b) => a + b, 0);
    let d = '';

    const texte = (x, y, s, corps, couleur, ancre = 'middle') => `<text x="${T(x)}" y="${T(y)}"
        fill="${couleur}" font-size="${T(corps)}" text-anchor="${ancre}" dominant-baseline="central"
        font-weight="700" font-family="Helvetica, Arial, sans-serif">${echapper(s)}</text>`;

    // LES PAQUETS. Chacun porte ce qu'il y a « pour un » : c'est LUI, l'objet du
    // chapitre, et il doit se compter d'un coup d'œil.
    let x = x0;
    let aucuneNePorte = true;
    vues.forEach((part) => {
        const w = (part / totalParts) * utile;
        // LE NOMBRE PORTE SON UNITÉ. « 60 » tout seul dans une case ne dit pas
        // de quoi il est le compte, et c'est justement ce qui se perd dans une
        // grandeur composée : le paquet vaut 60 KM, l'unité du bas est ailleurs.
        const valeur = inconnu('parUn') ? '?'
            : `${fr(t.parUn.valeur * part)} ${t.parUn.unite}`;
        const couleur = inconnu('parUn') ? CHERCHE : PAQUET;
        d += `<rect x="${T(x)}" y="${T(yh)}" width="${T(w)}" height="${T(yb - yh)}" rx="${T(1.5)}"
            fill="${inconnu('parUn') ? 'rgba(217,119,6,.12)' : REMPLI}" stroke="${couleur}"
            stroke-width="${T(0.8)}"/>`;
        // Le nombre ne rentre pas dans une case étroite : on l'écrit alors
        // sous la bande, et une seule fois — ce sont les mêmes paquets.
        // Le corps se règle sur la place : une case étroite écrit plus petit
        // plutôt que de déborder sur sa voisine.
        const corps = Math.min(5, (w - 2) / (valeur.length * 0.56));
        if (corps >= 2.6) {
            d += texte(x + w / 2, (yh + yb) / 2, valeur, corps, couleur);
            aucuneNePorte = false;
        }
        // Sous chaque case, l'unité du bas : « 1 h », « 0,5 h ».
        if (!abrege && vues.length <= 4) {
            d += texte(x + w / 2, yb + 5.5, `${fr(part)} ${t.combien.unite}`, 4, PALE);
        }
        x += w;
    });
    // Si aucune case n'a pu porter son nombre — trop étroites —, on l'écrit une
    // fois sous la bande : ce sont les mêmes paquets, il n'y a qu'une valeur à
    // dire. Répété alors que les cases le portent déjà, il ferait du bruit.
    if (aucuneNePorte) {
        d += texte((x0 + x) / 2, yb + 11,
            `chaque paquet : ${inconnu('parUn') ? '?' : fr(t.parUn.valeur)} ${t.parUn.unite}`,
            4.2, inconnu('parUn') ? CHERCHE : PAQUET);
    }
    if (abrege) {
        d += texte((x + x1) / 2, (yh + yb) / 2, '…', 7, PALE);
        d += `<rect x="${T(x1 - 8)}" y="${T(yh)}" width="${T(8)}" height="${T(yb - yh)}" rx="${T(1.5)}"
            fill="${REMPLI}" stroke="${PAQUET}" stroke-width="${T(0.8)}" stroke-dasharray="2 1.5"/>`;
    }

    // LE TOTAL, en cote au-dessus : c'est la somme des paquets, et la flèche le
    // dit sans un mot.
    const yc = yh - 7;
    const totalTexte = inconnu('total') ? '?' : `${fr(t.total.valeur)} ${t.total.unite}`;
    d += `<path d="M${T(x0)} ${T(yc)} L${T(x1)} ${T(yc)}" stroke="${inconnu('total') ? CHERCHE : ENCRE}"
        stroke-width="${T(0.6)}"/>`;
    d += pointe(x0, yc, 1, T, inconnu('total')) + pointe(x1, yc, -1, T, inconnu('total'));
    d += texte((x0 + x1) / 2, yc - 4.5, `en tout : ${totalTexte}`, 5,
        inconnu('total') ? CHERCHE : ENCRE);

    // COMBIEN DE PAQUETS, sous la bande.
    const combienTexte = inconnu('combien') ? '?' : fr(t.combien.valeur);
    d += texte((x0 + x1) / 2, yb + (vues.length <= 4 && !abrege ? 11.5 : 5.5),
        `${combienTexte} ${t.combien.unite}`, 5, inconnu('combien') ? CHERCHE : ENCRE);

    // ET LA PHRASE QUI EST LA MÉTHODE, écrite sous le dessin : « 60 km pour
    // 1 h ». C'est la lecture du taux, et tout le chapitre en découle.
    // QUAND C'EST LE TAUX QU'ON CHERCHE, on n'écrit pas « ? : ? pour 1 h » —
    // on dit ce qu'on cherche. La phrase reste la même méthode, au futur.
    d += inconnu('parUn')
        ? texte(50, H - 4, `on cherche : combien de ${t.parUn.unite} pour 1 ${t.combien.unite} ?`,
            4.4, CHERCHE)
        : texte(50, H - 4, `${t.taux ? t.taux + ' : ' : ''}${fr(t.parUn.valeur)} `
            + `${t.parUn.unite} pour 1 ${t.combien.unite}`, 4.4, PALE);

    return `<svg viewBox="0 0 ${taille} ${arr(H * k)}" width="${taille}" height="${arr(H * k)}"
        role="img" aria-label="schéma de la grandeur composée">${d}</svg>`;
}

/** Les paquets : autant de pleins que possible, un dernier partiel s'il le faut. */
export function decouper(n) {
    const total = Math.max(0, Number(n) || 0);
    const entiers = Math.floor(total + 1e-9);
    const reste = total - entiers;
    const out = [];
    for (let i = 0; i < entiers; i++) out.push(1);
    if (reste > 1e-9) out.push(Math.round(reste * 1000) / 1000);
    return out.length ? out : [1];
}

/** Une pointe de flèche, orientée vers l'extérieur de la cote. */
function pointe(x, y, sens, T, cherche) {
    const a = 2.2, b = 1.5;
    return `<path d="M${T(x)} ${T(y)} L${T(x + sens * a)} ${T(y - b)}
        L${T(x + sens * a)} ${T(y + b)} Z" fill="${cherche ? CHERCHE : ENCRE}"/>`;
}

/**
 * UNE PILE DE RAPPELS — formules ou gestes, l'un sous l'autre.
 *
 * Écrits à la file dans un paragraphe, trois rappels se lisent comme une phrase
 * et ne se retiennent pas ; empilés, on les compare d'un coup d'œil et l'on
 * choisit celui qui donne ce qu'on cherche. ON NE SOULIGNE JAMAIS LE BON :
 * choisir est l'exercice.
 */
export function pileDeRappels(lignes, mot) {
    return `<div class="np-formules">
        ${lignes.map(l => `<div class="np-formule"><b>${echapper(l.quoi)}</b>`
        + `<span>${echapper(l.pour)}</span></div>`).join('')}
        ${mot ? `<p class="np-formules-mot">${echapper(mot)}</p>` : ''}
    </div>`;
}

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
