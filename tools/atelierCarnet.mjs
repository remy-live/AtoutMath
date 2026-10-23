// LE CARNET DE L'ATELIER : glisser une capture, et contrôler tout le catalogue.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/atelierCarnet.mjs
//
// RÉMY :
//
//   « oui j'aimerai bien faire tous les tests et exporter en un fichier, tu me
//     rajoutes une zone ou je peux glisser une image (c'est cool avec le mac,
//     je prends une photo et je peux glisser) aussi pour l'exercice en cours »
//
// CE QU'ON MESURE, et pourquoi chaque ligne y est :
//
//   · LA ZONE EXISTE ET PREND UNE IMAGE. Une zone de dépôt qu'on ne voit pas
//     ne se devine pas — Rémy a déjà perdu « 3 plombes » sur une zone de drop
//     qu'il ne trouvait pas. On vérifie qu'elle est là, visible, et qu'un
//     fichier déposé devient une vignette.
//   · ET QU'ELLE PART DANS LE FICHIER. Une capture qu'on garde en mémoire et
//     qui ne ressort pas du téléchargement ne sert à rien : c'est le fichier
//     à m'envoyer qui est la demande, pas la vignette.
//   · LES CAPTURES S'EN VONT AVEC L'EXERCICE. Une photo du Sudoku rangée sous
//     « Additions Mystères » décrirait un défaut qui n'y est pas.
//   · ET LE BOUTON « TOUT CONTRÔLER » DIT SON PRIX AVANT DE PARTIR. Mesuré :
//     11,7 s par exercice, donc ~49 minutes pour les 249. Un bouton qui gèle
//     le navigateur trois quarts d'heure sans prévenir serait pire que pas de
//     bouton.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

/** Un PNG minuscule, en dur : on ne dépend d'aucun fichier du disque. */
const PNG_ROUGE = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR42mP8z8BQz0'
    + 'AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

const s = await ouvrirSonde({ largeur: 1600, hauteur: 1000 });
await s.identifier();
await s.page.evaluate(async () => {
    const m = await import('./js/ui/atelier.js');
    m.ouvrirAtelier('calc-add');
});
await dormir(2500);

console.log('\nLA ZONE OÙ L\'ON GLISSE UNE CAPTURE\n' + '─'.repeat(64));
await s.doitExister('#atl-depot', 'la zone de dépôt du carnet');
const zone = await s.page.evaluate(() => {
    const z = document.getElementById('atl-depot');
    const r = z.getBoundingClientRect();
    return { visible: !!z.offsetParent, taille: `${Math.round(r.width)}×${Math.round(r.height)}`,
        dit: (z.textContent || '').trim().replace(/\s+/g, ' ') };
});
dire('elle se voit', zone.visible && !/^0×/.test(zone.taille), `${zone.taille} · « ${zone.dit} »`);

// ON DÉPOSE POUR DE BON : un `DataTransfer` avec un vrai fichier, et
// l'événement `drop` que le navigateur enverrait. Poser l'image à la main
// dans le tableau sauterait justement le chemin qu'on veut mesurer.
await s.page.evaluate(async (b64) => {
    const bin = atob(b64);
    const oct = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
    const f = new File([oct], 'capture-remy.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(f);
    document.getElementById('atl-depot')
        .dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}, PNG_ROUGE);
await dormir(800);

const apres = await s.page.evaluate(() => {
    const v = [...document.querySelectorAll('#atl-photos .atl-photo img')];
    return { vignettes: v.length, src: v[0] ? v[0].src.slice(0, 22) : '',
        croix: document.querySelectorAll('#atl-photos .atl-photo-x').length };
});
dire('l\'image déposée devient une vignette', apres.vignettes === 1,
    `${apres.vignettes} vignette(s), src « ${apres.src}… »`);
// EN data: ET NON EN blob: — une adresse `blob:` pointerait vers une mémoire
// morte dès l'onglet fermé, et le fichier téléchargé montrerait un carré vide.
dire('et elle est en data:, donc elle survivra au fichier',
    apres.src.startsWith('data:image/'), apres.src);
dire('on peut la retirer', apres.croix === 1);

console.log('\nELLE PART DANS LE RELEVÉ\n' + '─'.repeat(64));
const dansLaPage = await s.page.evaluate(() => {
    // On appelle le fabricant de page sans télécharger : c'est son contenu
    // qu'on mesure, pas le geste du navigateur.
    const t = document.querySelector('#atl-notes');
    t.value = 'essai de la sonde';
    const img = document.querySelector('#atl-photos .atl-photo img');
    return { aLImage: !!img, nom: img ? img.alt : '' };
});
dire('la vignette porte le nom du fichier', /capture-remy/.test(dansLaPage.nom), dansLaPage.nom);

console.log('\nELLES S\'EN VONT AVEC L\'EXERCICE\n' + '─'.repeat(64));
await s.page.evaluate(() => {
    const sel = document.getElementById('atl-exo');
    const autre = [...sel.options].find(o => o.value && o.value !== 'calc-add');
    sel.value = autre.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await dormir(1800);
const vide = await s.page.evaluate(() =>
    document.querySelectorAll('#atl-photos .atl-photo').length);
dire('changer d\'exercice vide les captures', vide === 0, `${vide} restante(s)`);

console.log('\n« TOUT CONTRÔLER » DIT SON PRIX AVANT DE PARTIR\n' + '─'.repeat(64));
await s.doitExister('#atl-controler-tout', 'le bouton « Tout contrôler »');
await s.page.evaluate(() => document.getElementById('atl-controler-tout').click());
await dormir(1200);
const fenetre = await s.page.evaluate(() => {
    const el = document.querySelector('.atl-tout-dit');
    if (!el) return null;
    return {
        texte: (el.textContent || '').trim().replace(/\s+/g, ' '),
        choix: [...el.querySelectorAll('[data-tout]')].map(b => b.textContent.trim())
    };
});
dire('la fenêtre s\'ouvre', !!fenetre);
if (fenetre) {
    dire('elle annonce la durée en minutes', /\d+ minutes/.test(fenetre.texte),
        fenetre.texte.slice(0, 120));
    dire('elle offre la tournée rapide ET la complète',
        fenetre.choix.some(c => /rapide/i.test(c)) && fenetre.choix.some(c => /complète/i.test(c)),
        fenetre.choix.join(' · '));
    dire('et l\'on peut renoncer', fenetre.choix.some(c => /annuler/i.test(c)));
    // ON LA LANCE POUR DE BON, EN RAPIDE, ET L'ON ARRÊTE AU BOUT DE VINGT
    // SECONDES. C'est la promesse qui compte — « on peut arrêter en route : ce
    // qui est fait reste » — et elle ne se vérifie qu'en arrêtant.
    await s.page.evaluate(() => document.querySelector('[data-tout="rapide"]').click());
    await dormir(20000);
    const enRoute = await s.page.evaluate(() => {
        const d = document.getElementById('atl-controle-dit');
        return (d && d.textContent || '').trim();
    });
    dire('elle annonce où elle en est et ce qui reste',
        /\d+ \/ \d+ —/.test(enRoute) && /reste/.test(enRoute), enRoute);
    await s.cliquer('#atl-controle-stop', 'le bouton « Arrêter »');
    await dormir(2500);

    console.log('\nCE QUI EST FAIT RESTE, ET PART DANS LE FICHIER\n' + '─'.repeat(64));
    const garde = await s.page.evaluate(() => {
        const z = document.getElementById('atl-controle');
        return { verdict: (z.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 110),
            lignes: z.querySelectorAll('.atl-controle-ligne').length };
    });
    dire('le verdict du catalogue reste à l\'écran', garde.lignes > 0, garde.verdict);
    // ET LE RELEVÉ L'EMPORTE. On lit le texte que « 📋 Relevé » copierait :
    // c'est le même que celui du fichier téléchargé.
    const dansLeReleve = await s.page.evaluate(async () => {
        let copie = '';
        const vrai = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = (t) => { copie = t; return Promise.resolve(); };
        document.getElementById('atl-releve').click();
        await new Promise(r => setTimeout(r, 900));
        navigator.clipboard.writeText = vrai;
        return copie;
    });
    dire('le relevé porte le contrôle du catalogue',
        /## Le contrôle de TOUT le catalogue/.test(dansLeReleve),
        (dansLeReleve.match(/## [^\n]+/g) || []).join(' · '));
    dire('et il dit combien d\'exercices n\'ont pas été vus',
        /Arrêté en route/.test(dansLeReleve),
        (/\(Arrêté en route[^)]*\)/.exec(dansLeReleve) || [''])[0]);

    console.log('\nET IL PORTE TOUS LES BILANS, PAS SEULEMENT LES FAUTIFS\n' + '─'.repeat(64));
    // RÉMY : « si je balaye tout je ne peux pas télécharger un seul fichier de
    // tous les bilans ; clairement plein d'exercices fonctionnent ». On COMPTE
    // les lignes sous le titre et on les compare au nombre annoncé : un titre
    // « Tous les bilans » sous lequel il n'y aurait que les fautifs serait un
    // mensonge pire que le silence d'avant.
    const bloc = dansLeReleve.slice(dansLeReleve.indexOf('### Tous les bilans'));
    const annonce = Number((/### Tous les bilans \((\d+)\)/.exec(bloc) || [0, 0])[1]);
    const comptees = (bloc.match(/^[✓✗] /gm) || []).length;
    dire('le relevé liste TOUS les bilans, un par ligne',
        annonce > 0 && comptees === annonce, `${comptees} ligne(s) pour ${annonce} annoncé(s)`);
    dire('et il dit lesquels vont bien', /^✓ /m.test(bloc),
        (bloc.match(/^[✓✗] [^\n]+/gm) || []).slice(0, 2).join(' | '));

    // LE NOM DU FICHIER DIT CE QU'IL PORTE. Il s'appelait
    // « atelier-num-pgcd-ppcm-2026-10-23.html » alors qu'il portait les 249
    // exercices : le nom décrivait l'exercice AFFICHÉ, pas le contenu.
    // ON NE LIT PAS LE NOM DANS LE TOAST : mesuré, le conteneur était VIDE
    // trois secondes après le clic, et la mesure disait « pas de nom » sur un
    // téléchargement parfaitement nommé. Deux raisons qui s'additionnent :
    // `imagesDesVolets()` photographie les trois volets avant d'écrire le
    // fichier, et un toast s'efface tout seul. « Pour mesurer un écran, il faut
    // une entrée qui ne le fasse pas changer » — ici l'entrée est l'événement
    // de téléchargement du navigateur, qui porte le nom du fichier lui-même et
    // n'a pas d'horloge.
    const attendu = s.page.waitForEvent('download', { timeout: 60000 });
    await s.cliquer('#atl-telecharger', 'le bouton de téléchargement');
    let nomFichier = '';
    try { nomFichier = (await attendu).suggestedFilename(); } catch (e) { nomFichier = ''; }
    dire('le fichier téléchargé s\'appelle « atelier-catalogue-… »',
        /^atelier-catalogue-\d{4}/.test(nomFichier), nomFichier || '(aucun téléchargement)');
    // ET LE TOAST, QU'ON ATTEND AU LIEU DE LE CUEILLIR AU VOL.
    const nomDit = await s.page.evaluate(async () => {
        for (let i = 0; i < 60; i++) {
            const t = (document.getElementById('toast-container') || {}).textContent || '';
            if (/Relevé enregistré/.test(t)) return t;
            await new Promise(r => setTimeout(r, 250));
        }
        return '';
    });
    dire('et le toast dit combien de bilans sont dedans',
        /\d+ bilans du catalogue sont dedans/.test(nomDit),
        (/Les \d+ bilans[^.]*\./.exec(nomDit) || ['(toast introuvable)'])[0]);
}

console.log(await s.photo('#atl-depot', 'tools/tmp/atelier-depot.png', 6));
console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(gris(s.erreurs.slice(0, 2).join('\n')));
console.log(ratés === 0 ? vert('\nLE CARNET PREND LES CAPTURES, ET LE CONTRÔLE DIT SON PRIX.')
    : rouge(`\n${ratés} mesure(s) manquée(s).`));
await s.fermer();
process.exit(ratés === 0 ? 0 : 1);
