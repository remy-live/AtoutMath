// Machine virtuelle des blocs « Le Chat Géomètre ».
//
// Volontairement SANS DOM : un script est une structure de données, l'exécuter
// rend une liste de segments. Toute la géométrie de l'exercice — le tracé, sa
// comparaison à la figure, les diagnostics d'erreur — est donc calculable et
// testable hors du navigateur. L'activité, elle, ne fait que dessiner ce que
// cette machine renvoie.
//
// Le repère est celui de Scratch : x vers la droite, y vers le HAUT, et la
// direction 90 pointe vers la droite (0 = vers le haut). L'activité convertit
// en coordonnées d'écran au moment de dessiner, une seule fois.

/** Types de blocs reconnus. `repeter` porte un corps ; les autres non. */
export const BLOCS = {
    avancer: { cat: 'motion', libelle: 'avancer de', unite: 'pas', defaut: 100 },
    droite: { cat: 'motion', libelle: 'tourner ↻ de', unite: '°', defaut: 90 },
    gauche: { cat: 'motion', libelle: 'tourner ↺ de', unite: '°', defaut: 90 },
    orienter: { cat: 'motion', libelle: "s'orienter à", unite: '°', defaut: 90 },
    allerA: { cat: 'motion', libelle: 'aller à x:', unite: '', defaut: 0, second: 0 },
    stylo: { cat: 'pen', libelle: "poser le stylo" },
    leveStylo: { cat: 'pen', libelle: 'lever le stylo' },
    repeter: { cat: 'control', libelle: 'répéter', unite: 'fois', defaut: 4, corps: true }
};

const MAX_PAS = 20000;   // garde-fou : une boucle de 9999 ne fige pas la page

/**
 * Exécute un script.
 *
 * @param {Array} script  blocs `{ type, valeur, valeur2, corps: [] }`
 * @param {Object} [depart] état initial `{ x, y, dir, stylo }`
 * @returns {{ traces: Array<Array<{x,y}>>, sprite: Object, pas: Array, debordement: boolean }}
 *          `traces` : les traits posés, un tableau de points par trait ;
 *          `pas` : l'état du chat après chaque bloc, pour la lecture pas-à-pas.
 */
export function executer(script, depart = {}) {
    const chat = {
        x: depart.x ?? 0, y: depart.y ?? 0,
        dir: depart.dir ?? 90, stylo: depart.stylo ?? false
    };
    const traces = [];
    let courant = null;
    const pas = [];
    let compteur = 0;
    let debordement = false;

    const poser = () => {
        courant = [{ x: chat.x, y: chat.y }];
        traces.push(courant);
    };
    if (chat.stylo) poser();

    const jouer = (blocs, profondeur) => {
        for (const b of blocs || []) {
            if (compteur++ > MAX_PAS) { debordement = true; return; }
            switch (b.type) {
                case 'avancer': {
                    // Repère de Scratch, littéralement : la direction 0 pointe
                    // vers le HAUT et 90 vers la droite, d'où le sinus sur x et
                    // le cosinus sur y (et non l'inverse). Tourner « à droite »
                    // augmente la direction : de 90 (droite) on passe à 180
                    // (bas), ce qui est bien le sens des aiguilles d'une montre
                    // dans un repère dont l'axe y monte.
                    const rad = chat.dir * Math.PI / 180;
                    chat.x += Math.sin(rad) * nombre(b.valeur);
                    chat.y += Math.cos(rad) * nombre(b.valeur);
                    if (chat.stylo && courant) courant.push({ x: chat.x, y: chat.y });
                    break;
                }
                case 'droite': chat.dir = normaliser(chat.dir + nombre(b.valeur)); break;
                case 'gauche': chat.dir = normaliser(chat.dir - nombre(b.valeur)); break;
                case 'orienter': chat.dir = normaliser(nombre(b.valeur)); break;
                case 'allerA':
                    chat.x = nombre(b.valeur);
                    chat.y = nombre(b.valeur2);
                    // Un saut ne trace pas : on ouvre un trait neuf, sinon le
                    // déplacement lui-même dessinerait une ligne parasite.
                    if (chat.stylo) poser();
                    break;
                case 'stylo': chat.stylo = true; poser(); break;
                case 'leveStylo': chat.stylo = false; courant = null; break;
                case 'repeter': {
                    const n = Math.max(0, Math.min(1000, Math.round(nombre(b.valeur))));
                    for (let i = 0; i < n; i++) {
                        jouer(b.corps, profondeur + 1);
                        if (debordement) return;
                    }
                    break;
                }
                default: break;
            }
            pas.push({ x: chat.x, y: chat.y, dir: chat.dir, stylo: chat.stylo, bloc: b });
        }
    };

    jouer(script, 0);
    // Un trait d'un seul point n'est pas un trait : le stylo a été posé puis
    // relevé sans bouger. Le garder fausserait la mesure de bavure.
    return { traces: traces.filter(t => t.length > 1), sprite: chat, pas, debordement };
}

function nombre(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

/** Ramène un angle dans [0, 360[ — y compris quand il est négatif. */
export function normaliser(a) {
    return ((a % 360) + 360) % 360;
}

/** Compte les blocs d'un script, corps de boucles inclus. */
export function compterBlocs(script) {
    let n = 0;
    for (const b of script || []) {
        n++;
        if (b.corps) n += compterBlocs(b.corps);
    }
    return n;
}

/** Vrai si le script contient au moins une boucle (à n'importe quel niveau). */
export function contientBoucle(script) {
    for (const b of script || []) {
        if (b.type === 'repeter') return true;
        if (b.corps && contientBoucle(b.corps)) return true;
    }
    return false;
}

/** Profondeur d'imbrication des boucles : 0 si aucune, 2 pour une rosace. */
export function profondeurBoucles(script) {
    let max = 0;
    for (const b of script || []) {
        if (b.type === 'repeter') max = Math.max(max, 1 + profondeurBoucles(b.corps));
        else if (b.corps) max = Math.max(max, profondeurBoucles(b.corps));
    }
    return max;
}
