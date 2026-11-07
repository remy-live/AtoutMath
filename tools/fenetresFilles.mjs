// LES FENÊTRES QU'ON OUVRE SOI-MÊME HÉRITENT DE LA CSP — ET ON L'OUBLIE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Deux écrans d'AtoutMath écrivent une page NEUVE dans une fenêtre ouverte par
// `window.open('')` : les billets de la classe, et l'affiche d'un parcours. Les
// deux y posaient un bouton « Imprimer » avec un `onclick=` dans l'attribut.
//
// CE QU'ON A MESURÉ : une fenêtre ouverte sur `about:blank` HÉRITE de la CSP de
// son ouvreur. Notre `script-src` n'a pas 'unsafe-inline' — seulement 'self' et
// des empreintes, qui ne couvrent PAS les gestionnaires d'attribut. Les deux
// boutons étaient donc MORTS chez Rémy et VIVANTS chez nous, parce que le
// serveur d'essai ne pose pas l'en-tête. C'est exactement le genre de défaut
// qui attend l'imprimante du collège pour se montrer.
//
// CET OUTIL FAIT LES DEUX MOITIÉS DU TRAVAIL :
//
//   1. il REMESURE que la CSP voyage (si Chrome changeait d'avis un jour, on
//      veut l'apprendre ici et non par une régression d'habillage) ;
//   2. il relit le code et refuse tout gestionnaire d'attribut dans une page
//      qu'on fabrique — la seule façon sûre de brancher un bouton dans une
//      fenêtre fille est de le faire DEPUIS L'OUVREUR, qui est même origine.
//
// Un témoin accompagne la mesure : la même page SANS l'en-tête doit, elle,
// laisser le gestionnaire tourner. Sans témoin, une mesure qui dit « non »
// pourrait simplement n'avoir jamais cliqué.
//
//   node tools/fenetresFilles.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const racine = new URL('..', import.meta.url).pathname;
const lire = (f) => readFileSync(join(racine, f), 'utf8');

export const CSP_PRODUCTION = () => (lire('.htaccess')
    .match(/Header always set Content-Security-Policy "([^"]+)"/) || [])[1] || '';

/** Tous les fichiers JavaScript du dossier `js/`, en descendant. */
function fichiersJs(dossier = 'js') {
    const sortie = [];
    for (const e of readdirSync(join(racine, dossier))) {
        const rel = `${dossier}/${e}`;
        if (statSync(join(racine, rel)).isDirectory()) sortie.push(...fichiersJs(rel));
        else if (e.endsWith('.js')) sortie.push(rel);
    }
    return sortie;
}

/**
 * LES GESTIONNAIRES D'ATTRIBUT ÉCRITS DANS DU CODE, où qu'ils soient.
 *
 * La CSP les refuse dans la page principale comme dans une fenêtre fille : il
 * n'y a donc pas de cas où l'on en veut un, et c'est pourquoi la règle n'a pas
 * d'exception à gérer.
 *
 * ON NOMME LES ÉVÉNEMENTS UN PAR UN, et l'on ne cherche pas `on` suivi de
 * lettres. Ma première version le faisait, et elle a désigné quatre lignes qui
 * n'ont rien à voir : `{ only = 'tout' }` et `let onglet = 'consigne'` sont
 * des mots FRANÇAIS ET ANGLAIS QUI COMMENCENT PAR « on ». Une liste de noms
 * d'événements est plus longue à écrire et ne se trompe pas.
 */
const EVENEMENTS = 'click|dblclick|change|input|submit|reset|load|error|abort'
    + '|key(?:down|up|press)|mouse[a-z]+|focus|blur|touch[a-z]+|pointer[a-z]+'
    + '|drag[a-z]*|drop|scroll|wheel|contextmenu|paste|copy|cut|toggle';

export function gestionnairesInline(sources) {
    const faits = [];
    // Collé au signe égal et au guillemet : c'est la forme d'un ATTRIBUT.
    // `el.onclick = …` en JavaScript a un point devant et des espaces autour.
    const motif = new RegExp(`\\son(?:${EVENEMENTS})=["']`, 'i');
    for (const [fichier, src] of Object.entries(sources)) {
        src.split('\n').forEach((ligne, i) => {
            if (motif.test(ligne)) faits.push({ fichier, ligne: i + 1, texte: ligne.trim().slice(0, 90) });
        });
    }
    return faits;
}

/** La CSP d'un document voyage-t-elle dans la fenêtre qu'il ouvre ? */
export async function cspVoyage(csp) {
    // PLAYWRIGHT S'IMPORTE ICI ET NON EN TÊTE DE FICHIER : l'épreuve
    // `tests/fenetresFilles.test.mjs` n'a besoin que de `gestionnairesInline`,
    // et charger un Chromium pour une épreuve qui lit du texte allongerait
    // `npm test` sans rien mesurer de plus.
    const { chromium } = await import('playwright');
    const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const essai = async (entete) => {
        const page = await nav.newPage();
        await page.route('**/*', (r) => r.fulfill({
            status: 200, contentType: 'text/html; charset=utf-8',
            headers: entete ? { 'Content-Security-Policy': csp } : {},
            body: '<!doctype html><title>ouvreur</title><p>ouvreur'
        }));
        await page.goto('https://essai.invalide/');
        await page.evaluate(() => {
            const f = window.open('', '_blank');
            f.document.write('<!doctype html><title>fille</title>'
                + '<button id="b" onclick="window.__clique = 1">Imprimer</button>');
            f.document.close();
        });
        const fille = page.context().pages()[1];
        await fille.click('#b');
        const r = await fille.evaluate(() => window.__clique || 0);
        await page.close();
        return !!r;
    };
    const avec = await essai(true);
    const sans = await essai(false);
    await nav.close();
    return { avec, sans };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const csp = CSP_PRODUCTION();
    console.log('CSP de production : ' + (csp ? csp.slice(0, 54) + '…' : '\x1b[31mINTROUVABLE\x1b[0m'));

    const { avec, sans } = await cspVoyage(csp);
    console.log('\n\x1b[1mLA CSP VOYAGE-T-ELLE ?\x1b[0m');
    console.log('  avec l\'en-tête  : gestionnaire inline ' + (avec ? 'exécuté' : 'BLOQUÉ'));
    console.log('  sans l\'en-tête  : gestionnaire inline ' + (sans ? 'exécuté' : 'BLOQUÉ')
        + (sans ? '   (témoin : le clic atteint bien le bouton)' : '   \x1b[31m(témoin muet : la mesure ne vaut rien)\x1b[0m'));
    const voyage = !avec && sans;
    console.log(voyage
        ? '  → \x1b[1mLA CSP VOYAGE\x1b[0m : aucun gestionnaire d\'attribut ne tient dans une fenêtre fille.'
        : '  → la CSP ne voyage pas (ou le témoin est muet) : à relire avant d\'en conclure quoi que ce soit.');

    const sources = Object.fromEntries(fichiersJs().map((f) => [f, lire(f)]));
    const faits = gestionnairesInline(sources);
    console.log('\n\x1b[1mGESTIONNAIRES D\'ATTRIBUT DANS LE CODE\x1b[0m : ' + faits.length);
    faits.forEach((f) => console.log(`  \x1b[31m${f.fichier}:${f.ligne}\x1b[0m  ${f.texte}`));
    if (!faits.length) console.log('  \x1b[32maucun — tout est branché depuis l\'ouvreur.\x1b[0m');
    process.exitCode = faits.length ? 1 : 0;
}
