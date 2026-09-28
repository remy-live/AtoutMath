// LE GESTE DE L'ÉLÈVE QUI SIGNALE UN PROBLÈME, FAIT POUR DE VRAI.
//
// Rémy : « un bouton désactivable ou non qui permet à l'élève d'envoyer un bug
// et de prendre une photo d'écran ».
//
// LES ÉPREUVES UNITAIRES GARDENT LES RÈGLES ; ELLES NE FONT PAS LE GESTE. Elles
// lisent le code, elles ne cliquent pas — or tout ce qui compte ici est de
// l'autre côté du réseau : le réglage arrive du serveur quelques centaines de
// millisecondes après le dessin de la page, le bouton s'allume ou non, la
// fenêtre s'ouvre, la photo se rétrécit dans un canevas que Node n'a pas, et le
// signalement doit ressortir chez le professeur avec la graine dedans.
//
//   node tools/signalerAuDoigt.mjs [thème]
//
// Il monte un site d'essai complet, allume le réglage comme le professeur le
// ferait, ouvre un exercice AU FORMAT TÉLÉPHONE (390 × 844 : c'est là que
// l'élève est), appuie, écrit, joint une photo, envoie, et va relire ce que le
// professeur reçoit.
//
// IL VÉRIFIE AUSSI L'ÉTAT ÉTEINT, et c'est la moitié qu'on oublie : un bouton
// qu'on n'arrive pas à éteindre n'est pas « désactivable ou non ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LA SONDE S'IDENTIFIE EN PROFESSEUR, ET CE BOUTON N'EXISTE QUE CHEZ L'ÉLÈVE.
//
// `s.identifier()` appelle `identifierProf` : la page qui en sort est celle de
// Rémy, et `isActive()` — le rattachement d'un ÉLÈVE à une classe — y vaut
// faux. Le bouton restait donc caché quoi qu'on allume, et rien à l'écran ne
// disait pourquoi : j'ai d'abord cru que le réglage n'arrivait pas.
//
// ON FAIT DONC LE CHEMIN EN ENTIER, celui de `boutEnBout.mjs` : créer une
// classe, y importer un élève avec son billet, et ENTRER AVEC CE BILLET. C'est
// plus long de vingt lignes, et c'est la seule façon de mesurer ce qu'un élève
// voit — « une mesure qui n'emprunte pas le chemin de l'utilisateur ne mesure
// pas son problème ».

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

// LE THÈME SE PASSE EN ARGUMENT, et ce n'est pas un ornement. Rémy : « il faut
// faire attention aux contrastes selon les modes si on a pris mode nuit ou
// non ». Une fenêtre qui ne se lit que dans un thème sur cinq ne se lit pas.
const THEME = process.argv[2] && process.argv[2] !== 'clair' ? process.argv[2] : null;
const s = await ouvrirSonde({ largeur: 390, hauteur: 844, theme: THEME });
let ratés = 0;
const dire = (quoi, vrai, detail = '') => {
    if (!vrai) ratés++;
    console.log(`  ${vrai ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` — ${detail}` : ''));
};

/** Parler au serveur d'essai avec le jeton du professeur, comme l'application. */
async function auProf(route, corps) {
    return s.page.evaluate(async ({ route, corps }) => {
        const r = await fetch('/api/teacher/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'remy@essai.test', password: 'motdepassetreslong' })
        });
        const { token } = await r.json();
        const rep = await fetch('/api' + route, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify(corps)
        });
        return rep.json();
    }, { route, corps });
}

console.log('\n\x1b[1mUne classe, un billet, un élève\x1b[0m');
await s.identifier();
const classe = await s.page.evaluate(async () => {
    const { creerClasse, apercuDeListe, importerListe } =
        await import('./js/core/espaceProf.js');
    const c = await creerClasse('3e Signaux', '3e');
    if (c.erreur) return { erreur: c.erreur };
    const ap = await apercuDeListe(c.id, 'ROUX Léo;leo.r;2024\n', '');
    if (ap.erreur) return { erreur: ap.erreur };
    const r = await importerListe(c.id, ap.apercu.texte);
    return { id: c.id, eleves: r.eleves };
});
dire('la classe et le billet existent', !classe.erreur && (classe.eleves || []).length === 1,
    classe.erreur || '');

// ON ENTRE COMME LUI. `loginEleve` est exactement ce que fait la porte du
// portail quand l'élève tape son identifiant et son code.
const entre = await s.page.evaluate(async () => {
    const { loginEleve, isActive } = await import('./js/core/sync.js');
    try {
        await loginEleve({ apiUrl: location.origin + '/api', login: 'leo.r', code: '2024' });
        return { actif: isActive() };
    } catch (e) { return { erreur: e.message }; }
});
dire('L\'ÉLÈVE EST RATTACHÉ — sans quoi ce bouton n\'a pas de destinataire',
    entre.actif === true, entre.erreur || '');

console.log('\n\x1b[1mLe bouton éteint\x1b[0m');
await s.ouvrirExercice('calc-add');
await dormir(400);
let vu = await s.page.$eval('#btn-signaler', b => ({
    la: true, cache: b.hidden, h: b.getBoundingClientRect().height
})).catch(() => ({ la: false }));
dire('le bouton est dans la page', vu.la);
dire('ET IL EST CACHÉ tant que le professeur n\'a rien allumé', vu.cache === true);

console.log('\n\x1b[1mLe professeur l\'allume\x1b[0m');
const r = await auProf('/teacher/reglages', { signalement: true });
dire('le réglage est allumé au serveur', r && r.reglages && r.reglages.signalement === true);

// ON RECHARGE : le réglage voyage au démarrage de l'application. C'est aussi ce
// que vivra l'élève — son bouton paraîtra à sa prochaine ouverture, pas au
// milieu de sa question.
await s.page.reload({ waitUntil: 'domcontentloaded' });
await dormir(900);
await s.ouvrirExercice('calc-add');
await dormir(500);
vu = await s.page.$eval('#btn-signaler', b => {
    const r2 = b.getBoundingClientRect();
    return { cache: b.hidden, l: Math.round(r2.width), h: Math.round(r2.height),
             dedans: r2.right <= window.innerWidth + 1 && r2.left >= -1 };
});
dire('le bouton paraît', vu.cache === false);
// LE PLANCHER DU DÉPÔT : 44 px, « la largeur moyenne de la pulpe d'un index ».
dire('il se vise au doigt', vu.l >= 34 && vu.h >= 34, `${vu.l}×${vu.h}`);
dire('et il tient dans l\'écran du téléphone', vu.dedans,
    vu.dedans ? '' : 'il sort de la largeur');

console.log('\n\x1b[1mL\'élève signale\x1b[0m');
await s.page.click('#btn-signaler');
await dormir(300);
dire('la fenêtre s\'ouvre', await s.page.$('#sg-texte') !== null);
// LE FOCUS VA DANS LE CHAMP, pas sur la croix : la fenêtre s'ouvre à l'endroit
// où l'on a quelque chose à faire.
dire('et le champ a le clavier',
    await s.page.evaluate(() => document.activeElement && document.activeElement.id === 'sg-texte'));

// LA FENÊTRE SE LIT-ELLE ? Le seuil du dépôt est 4,5 pour du texte courant.
for (const [sel, quoi] of [['.sg-etiquette', 'la question posée à l\'élève'],
    ['.sg-note', 'la phrase qui explique la photo'],
    ['.sg-avec', 'ce qui part avec son message'],
    ['.sg-joindre', 'le bouton qui joint la photo']]) {
    const c = await s.contrasteRendu(sel).catch(() => null);
    dire(`${quoi} se lit`, !!c && c.contraste >= 4.5,
        c ? c.contraste.toFixed(2) : 'introuvable');
}

await s.page.fill('#sg-texte', 'Le clavier cache la question, je ne vois pas ce que je tape.');

// LA PHOTO : on fabrique une image comme le ferait la photothèque du téléphone.
// UN PNG DE 1400 × 3000 — plus grand que la borne du serveur une fois encodé :
// c'est le cas réel d'une capture d'iPhone, et c'est le rétrécissement qu'on
// mesure ici. Node n'a pas de canevas ; ce chemin-là n'existe QUE dans un vrai
// navigateur, et c'est pour cela que cet outil existe.
const gros = await s.page.evaluate(async () => {
    const cv = document.createElement('canvas');
    cv.width = 1400; cv.height = 3000;
    const c = cv.getContext('2d');
    // DU BRUIT, ET NON UN APLAT : un aplat se compresse à quelques kilo-octets,
    // et l'on mesurerait un rétrécissement qui n'a jamais eu lieu.
    const img = c.createImageData(1400, 3000);
    for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = (i * 7) % 255; img.data[i + 1] = (i * 13) % 255;
        img.data[i + 2] = (i * 29) % 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    const b = await new Promise(ok => cv.toBlob(ok, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'capture.png', { type: 'image/png' }));
    document.querySelector('[data-fichier]').files = dt.files;
    document.querySelector('[data-fichier]').dispatchEvent(new Event('change'));
    return b.size;
});
console.log(`    (la photo de départ pèse ${Math.round(gros / 1024)} ko)`);
await dormir(1800);
const petite = await s.page.evaluate(() => {
    const v = document.querySelector('[data-vignette]');
    return v && v.src ? v.src.length : 0;
});
dire('LA PHOTO EST RÉTRÉCIE SOUS LA BORNE DU SERVEUR',
    petite > 0 && petite <= 400000,
    petite ? `${Math.round(gros / 1024)} ko → ${Math.round(petite / 1024)} ko` : 'aucune vignette');
dire('et la vignette se voit avant l\'envoi',
    await s.page.$eval('[data-apercu]', a => !a.hidden).catch(() => false));

await s.page.click('[data-envoyer]');
await dormir(1600);
dire('la fenêtre se referme une fois le message parti',
    await s.page.$('#sg-texte') === null);

console.log('\n\x1b[1mCe que le professeur reçoit\x1b[0m');
const liste = await auProf('/teacher/signalements', { action: 'list' });
const sig = (liste.signalements || [])[0];
dire('le signalement est arrivé', !!sig);
if (sig) {
    dire('avec la phrase de l\'élève',
        (sig.corps || '').includes('Le clavier cache la question'));
    const ec = (sig.contexte && sig.contexte.ecran) || {};
    dire('AVEC L\'EXERCICE', ec.exerciseId === 'calc-add', ec.exerciseId || 'aucun');
    // LA GRAINE EST LA RAISON D'ÊTRE DE TOUT CECI : sans elle, le professeur
    // rouvre le même exercice et PAS la même question.
    dire('ET AVEC LA GRAINE', !!ec.graine, ec.graine || 'aucune');
    dire('et la question qu\'il avait sous les yeux', !!ec.question, ec.question || '');
    dire('la taille de son écran', sig.contexte.largeur === 390,
        `${sig.contexte.largeur}×${sig.contexte.hauteur}`);
    dire('la version que SON navigateur a chargée', !!sig.contexte.version,
        sig.contexte.version || 'inconnue');
    dire('et la photo est là, sans être dans la liste',
        sig.photo === true && !('image' in sig));
    const p = await auProf('/teacher/signalements', { action: 'photo', id: sig.id });
    dire('elle s\'ouvre à la demande',
        typeof p.image === 'string' && p.image.startsWith('data:image/jpeg;base64,'));
}

console.log('\n\x1b[1mLe professeur l\'éteint\x1b[0m');
await auProf('/teacher/reglages', { signalement: false });
await s.page.reload({ waitUntil: 'domcontentloaded' });
await dormir(900);
await s.ouvrirExercice('calc-add');
await dormir(500);
dire('LE BOUTON DISPARAÎT — « désactivable ou non », les deux sens',
    await s.page.$eval('#btn-signaler', b => b.hidden) === true);

console.log(`\nfenêtres natives : ${s.fenetresNatives.length}`
    + ` · erreurs de page : ${s.erreurs.length}`);
if (s.erreurs.length) s.erreurs.slice(0, 4).forEach(e => console.log('    ' + e));
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mTOUT LE GESTE PASSE\x1b[0m');
await s.fermer();
process.exit(ratés || s.erreurs.length || s.fenetresNatives.length ? 1 : 0);
