// LE SCHÉMA D'UN TRAJET — trois grandeurs, une figure.
//
// Rémy, banc d'essai sur Temps / Distance / Vitesse : « on pourrait avoir un
// bouton schéma et un bouton formule (mais pas valable tout le temps) ».
//
// LE SCHÉMA N'EST PAS UNE DÉCORATION, c'est ce qui rend la formule évidente.
// « d = v × t » se retient mal parce que rien, dans l'énoncé écrit, ne montre
// que la distance se FABRIQUE à partir des deux autres. Sur un trajet dessiné,
// la longueur de la route est là, l'allure est écrite sur le véhicule, la durée
// sous la route — et l'on voit qu'il en manque une.
//
// ET LE SCHÉMA NE DONNE JAMAIS LA RÉPONSE. La grandeur cherchée y porte un
// « ? », comme sur le tableau du professeur. C'est ce qui permet de l'offrir
// gratuitement, sans qu'il compte comme une aide : il remet l'énoncé en image,
// il ne le résout pas.

const ENCRE = '#1a202c';
const PALE = '#8a90a0';
const ROUTE = '#2563eb';
const arr = (v) => Math.round(v * 100) / 100;

/**
 * @param {Object} t
 *   `v`, `d`, `t`     les trois valeurs, telles que l'énoncé les donne
 *   `quoi`            'distance' | 'vitesse' | 'duree' : celle qu'on cherche
 *   `direV`,`direD`,`direT`  chaque valeur déjà mise en toutes lettres
 * @returns {string} du SVG autonome, sans dépendance ni style extérieur
 */
export function schemaVitesseSvg(t, { taille = 320 } = {}) {
    const L = 100, H = 46;
    const k = taille / L;
    const T = (v) => arr(v * k);
    const inconnu = (quoi) => t.quoi === quoi ? '?' : null;

    const dText = inconnu('distance') || t.direD;
    const vText = inconnu('vitesse') || t.direV;
    const tText = inconnu('duree') || t.direT;

    const x0 = 12, x1 = 88, y = 26;
    const texte = (x, yy, s, corps, couleur, gras) => `<text x="${T(x)}" y="${T(yy)}"
        fill="${couleur}" font-size="${T(corps)}" text-anchor="middle" dominant-baseline="central"
        font-weight="${gras ? 800 : 600}"
        font-family="Helvetica, Arial, sans-serif">${echapper(s)}</text>`;

    let d = '';
    // LA ROUTE. Un trait épais et deux bornes : c'est le trajet, et sa longueur
    // est la distance. Rien d'autre n'a besoin d'être dessiné.
    d += `<path d="M${T(x0)} ${T(y)} L${T(x1)} ${T(y)}" stroke="${PALE}"
        stroke-width="${T(1.1)}" stroke-linecap="round"/>`;
    [x0, x1].forEach(x => {
        d += `<path d="M${T(x)} ${T(y - 3)} L${T(x)} ${T(y + 3)}" stroke="${ENCRE}"
            stroke-width="${T(0.9)}" stroke-linecap="round"/>`;
    });

    // LA FLÈCHE DE DISTANCE, au-dessus : c'est la cote du dessin technique, et
    // l'élève la reconnaît d'autres exercices de géométrie.
    const yc = y - 9;
    d += `<path d="M${T(x0)} ${T(yc)} L${T(x1)} ${T(yc)}" stroke="${ROUTE}"
        stroke-width="${T(0.7)}"/>`;
    d += pointe(x0, yc, 1, T) + pointe(x1, yc, -1, T);
    d += texte((x0 + x1) / 2, yc - 5, `d = ${dText}`, 6, ROUTE, true);

    // L'allure sur la gauche, la durée sur la droite : l'ordre dans lequel
    // l'énoncé les donne presque toujours.
    d += texte(x0 + 14, y + 8, `v = ${vText}`, 5.4, ENCRE);
    d += texte(x1 - 14, y + 8, `t = ${tText}`, 5.4, ENCRE);

    return `<svg viewBox="0 0 ${taille} ${arr(H * k)}" width="${taille}" height="${arr(H * k)}"
        role="img" aria-label="schéma du trajet">${d}</svg>`;
}

/** Une pointe de flèche, orientée vers l'extérieur de la cote. */
function pointe(x, y, sens, T) {
    const a = 2.2, b = 1.6;
    return `<path d="M${T(x)} ${T(y)} L${T(x + sens * a)} ${T(y - b)}
        L${T(x + sens * a)} ${T(y + b)} Z" fill="${ROUTE}"/>`;
}

/**
 * LES TROIS FORMULES, L'UNE SOUS L'AUTRE.
 *
 * Elles ne sont qu'une seule formule retournée trois fois, et c'est exactement
 * ce qu'il faut faire voir : écrites à la file dans un paragraphe elles se
 * lisent comme une phrase et ne se retiennent pas ; empilées, on les compare
 * d'un coup d'œil et l'on choisit celle qui donne ce qu'on cherche.
 *
 * ON NE SOULIGNE PAS CELLE QU'IL FAUT. Choisir la bonne EST l'exercice — la
 * désigner ferait le travail à la place de l'élève, et le bouton cesserait
 * d'être gratuit.
 */
export const FORMULES_VITESSE = [
    { pour: 'la distance', formule: 'd = v × t' },
    { pour: 'la vitesse', formule: 'v = d ÷ t' },
    { pour: 'le temps', formule: 't = d ÷ v' }
];

export function formulesVitesseHtml() {
    return `<div class="np-formules">
        ${FORMULES_VITESSE.map(f =>
        `<div class="np-formule"><b>${f.formule}</b><span>${f.pour}</span></div>`).join('')}
        <p class="np-formules-mot">Écris celle qui donne ce que l'on cherche,
        puis remplace ce que l'énoncé te donne.</p>
    </div>`;
}

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
