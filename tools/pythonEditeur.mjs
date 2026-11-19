// L'ÉDITEUR PYTHON, SUR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « des qcm et APRÈS que l'élève tape, L'AIDER SUR
// L'INDENTATION ». Puis le 19 : « il faudrait que l'élève puisse faire des
// petits programmes ».
//
// ── CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE ───────────────────────────────
//
// Les marches se vérifient sous Node : les cinq solutions tournent et
// affichent exactement ce qu'on annonce (`tools/tmp/soluces.mjs`), et Skulpt
// s'exécute sous la politique de sécurité du site sans `unsafe-eval`
// (`tools/tmp/cspSkulpt.mjs`). Il reste tout ce qui ne vit que dans le
// navigateur, et qui rend l'éditeur inutilisable sans lever la moindre erreur :
//
//   · LES DEUX BOUTONS DE DÉCALAGE. C'est le geste central — il n'y a pas de
//     touche de tabulation sur une tablette. S'ils ne décalent pas, ou s'ils
//     renvoient le curseur à la fin du texte, la marche « pose le décalage »
//     n'a plus de réponse possible ;
//   · LES NUMÉROS DE LIGNE TOMBENT-ILS EN FACE DU TEXTE ? Les marges et le
//     champ de saisie sont deux couches superposées : un pixel d'écart et le
//     programme glisse sous ses propres numéros ;
//   · LE PROGRAMME TOURNE-T-IL POUR DE VRAI, dans la page de l'élève et non
//     dans mon banc d'essai ;
//   · LE VÉRIFICATEUR FRANÇAIS PASSE-T-IL AVANT ? Une faute d'indentation doit
//     rendre une phrase française et allumer la ligne, pas « bad input » ;
//   · ET LE CLAVIER DU SYSTÈME : la touche Entrée descend-elle d'un cran après
//     un deux-points ?
//
//     node tools/pythonEditeur.mjs
//     node tools/pythonEditeur.mjs --photos

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const photos = process.argv.includes('--photos');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

const CODE = '[data-code]';

/** Ce qu'il y a dans l'éditeur, et où tombent ses repères. */
const regarder = (s) => s.page.evaluate(() => {
    const c = document.querySelector('[data-code]');
    const m = document.querySelector('[data-marges]');
    if (!c || !m) return null;
    const nums = [...m.querySelectorAll('.py-num')];
    const style = getComputedStyle(c), styleM = getComputedStyle(m);
    return {
        texte: c.value,
        curseur: c.selectionStart,
        // ── CE QUE SEULE LA PHOTO AVAIT VU, LE 19 NOVEMBRE ───────────────
        //
        // La couche des marges tient la place du texte ; elle ne doit PAS le
        // montrer. Or la coloration syntaxique pose une couleur sur chaque
        // jeton, et une couleur posée gagne sur le `transparent` du parent :
        // l'élève voyait son programme EN DOUBLE, décalé. Onze contrôles
        // étaient verts, celui-ci n'existait pas.
        jetonsColores: [...m.querySelectorAll('.py-code *')]
            .filter(e => !/rgba\(0, 0, 0, 0\)|transparent/
                .test(getComputedStyle(e).color)).length,
        // ET LES DEUX COUCHES COMMENCENT À LA MÊME COLONNE, sans quoi les
        // filets d'indentation tombent à côté de l'indentation.
        ecartHorizontal: (() => {
            const p = m.querySelector('.py-code');
            if (!p) return null;
            return Math.round(Math.abs(p.getBoundingClientRect().left
                - c.getBoundingClientRect().left - parseFloat(style.paddingLeft)));
        })(),
        lignes: nums.length,
        filets: m.querySelectorAll('.py-filet').length,
        fautive: m.querySelectorAll('.py-ligne--fautive').length,
        // LES DEUX COUCHES DOIVENT PARTAGER LEUR MÉTRIQUE AU PIXEL PRÈS.
        memePolice: style.fontFamily === styleM.fontFamily,
        memeTaille: style.fontSize === styleM.fontSize,
        memeInterligne: style.lineHeight === styleM.lineHeight,
        // Le premier numéro et la première ligne tapée sont-ils à la même
        // hauteur ? C'est la seule façon de voir le glissement.
        ecartVertical: nums.length
            ? Math.round(Math.abs(nums[0].getBoundingClientRect().top
                - c.getBoundingClientRect().top - parseFloat(style.paddingTop))) : null,
        hauteurBoutons: Math.min(...[...document.querySelectorAll('.pe-cran, .pe-lancer')]
            .map(b => Math.round(b.getBoundingClientRect().height)))
    };
});

const console2 = (s) => s.page.evaluate(() => {
    const c = document.querySelector('[data-console]');
    return (c && !c.hidden)
        ? { genre: c.className, texte: c.textContent.replace(/\s+/g, ' ').trim().slice(0, 220) }
        : null;
});

/**
 * GUETTER LE VERDICT, ET GARDER LE PREMIER QU'ON VOIT.
 *
 * PAYÉ : la première version lisait la console 3 s après le clic. Pour une
 * réponse JUSTE, le meneur enchaîne sur la question suivante au bout de 900 ms
 * — et la console avec. La sonde rendait donc « aucune console » sur un
 * logiciel qui venait de répondre « C'est exactement ça », c'est-à-dire la MÊME
 * réponse qu'un logiciel cassé. C'est la règle du mur blanc, et elle dépasse
 * les caméras : *pour mesurer un écran, il faut une entrée qui ne le fasse pas
 * changer* — ici, il faut regarder AVANT qu'il change.
 */
async function attendreVerdict(s, patience = 8000) {
    const fin = Date.now() + patience;
    let dernier = null;
    while (Date.now() < fin) {
        const c = await console2(s);
        if (c) {
            dernier = c;
            if (/pe-console--(ok|ko)/.test(c.genre)) return c;
        }
        await dormir(120);
    }
    return dernier;
}

async function surUnEcran(largeur, hauteur, nom) {
    console.log(`\n\x1b[1m${nom.toUpperCase()} — ${largeur} × ${hauteur}\x1b[0m`);
    const s = await ouvrirSonde({ largeur, hauteur });
    await s.identifier();
    const ennui = await s.ouvrirExercice('algo-python-ecrire',
        { marches: ['le-decalage'] }, { questions: 3 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); await s.fermer(); return; }
    await s.doitExister(CODE);
    await s.doitExister('[data-marges]');
    await s.doitExister('[data-decaler="1"]');

    const vu = await regarder(s);
    dire('l\'éditeur porte le programme de départ', !!vu && vu.texte.includes('for i in range'),
        vu ? JSON.stringify(vu.texte.slice(0, 40)) : 'rien');
    dire('et ses numéros de ligne', !!vu && vu.lignes === 3, `${vu.lignes} numéros`);
    // LES DEUX COUCHES SE SUPERPOSENT, ou le texte glisse sous ses numéros.
    dire('la marge ne montre RIEN, elle tient la place',
        vu.jetonsColores === 0, `${vu.jetonsColores} jeton(s) coloré(s)`);
    dire('et les deux couches commencent à la même colonne',
        vu.ecartHorizontal !== null && vu.ecartHorizontal <= 1,
        `${vu.ecartHorizontal} px d'écart`);
    dire('les deux couches partagent leur métrique',
        vu.memePolice && vu.memeTaille && vu.memeInterligne,
        `police ${vu.memePolice}, taille ${vu.memeTaille}, interligne ${vu.memeInterligne}`);
    dire('et la première ligne tombe en face de son numéro', vu.ecartVertical <= 2,
        `${vu.ecartVertical} px d'écart`);
    // QUARANTE-QUATRE PIXELS : la borne du doigt, celle de tout le dépôt.
    dire('les boutons se touchent au doigt', vu.hauteurBoutons >= 44,
        `le plus petit fait ${vu.hauteurBoutons} px`);

    // ── LE GESTE CENTRAL : DÉCALER LA LIGNE 2 ────────────────────────────
    //
    // On place le curseur dans la ligne 2, puis on appuie sur ⇥. C'est
    // exactement ce que l'élève fait, et c'est toute la marche.
    await s.page.click(CODE);
    await s.page.evaluate(() => {
        const c = document.querySelector('[data-code]');
        const i = c.value.indexOf('\n') + 3;   // au milieu de la ligne 2
        c.focus(); c.setSelectionRange(i, i);
    });
    await s.page.click('[data-decaler="1"]');
    await dormir(300);
    const apres = await regarder(s);
    const l2 = apres.texte.split('\n')[1] || '';
    dire('le bouton ⇥ décale la ligne d\'un cran', l2.startsWith('    '),
        JSON.stringify(l2));
    // ET LE CURSEUR RESTE DANS SA LIGNE : premier jet, on réécrivait le champ
    // et le curseur partait à la fin du texte — l'élève décalait la ligne 2 et
    // se retrouvait à taper au bout de la dernière.
    const ouEstLeCurseur = apres.texte.slice(0, apres.curseur).split('\n').length;
    dire('et le curseur reste dans la ligne 2', ouEstLeCurseur === 2,
        `il est ligne ${ouEstLeCurseur}`);
    dire('un filet marque le cran', apres.filets >= 1, `${apres.filets} filet(s)`);

    await s.page.click('[data-decaler="-1"]');
    await dormir(250);
    const revenu = await s.page.evaluate(() =>
        (document.querySelector('[data-code]').value.split('\n')[1] || ''));
    dire('et ⇤ la ramène', !revenu.startsWith(' '), JSON.stringify(revenu));

    if (photos) await s.photo('#game-layer', `tools/tmp/python-editeur-${largeur}.png`);
    dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    dire('aucune fenêtre native', s.fenetresNatives.length === 0,
        s.fenetresNatives.slice(0, 2).join(' | '));
    await s.fermer();
}

await surUnEcran(768, 1024, 'la tablette de Rémy');
await surUnEcran(390, 844, 'un téléphone');

// ── LE VÉRIFICATEUR FRANÇAIS PASSE AVANT PYTHON ───────────────────────────
console.log('\n\x1b[1mUNE FAUTE D\'INDENTATION, ET CE QU\'ON EN DIT\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 900, hauteur: 1100 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('algo-python-ecrire',
        { marches: ['le-decalage'] }, { questions: 3 });
    if (ennui) dire('l\'exercice s\'ouvre', false, String(ennui));
    else {
        await s.doitExister('[data-lancer]');
        // On lance SANS rien décaler : le programme de départ est fautif, et
        // c'est le sujet même de la marche.
        await s.page.click('[data-lancer]');
        const c = await attendreVerdict(s);
        dire('la console s\'ouvre', !!c, c ? c.genre : 'rien');
        dire('et elle parle FRANÇAIS, pas « bad input »',
            !!c && /décal|Ligne|ligne/.test(c.texte) && !/bad input|SyntaxError/.test(c.texte),
            c ? c.texte.slice(0, 120) : '');
        const vu = await regarder(s);
        dire('la ligne fautive s\'allume dans l\'éditeur', vu.fautive >= 1,
            `${vu.fautive} ligne(s) marquée(s)`);
        if (photos) await s.photo('#game-layer', 'tools/tmp/python-editeur-faute.png');

        // ── ET MAINTENANT ON CORRIGE, ET ÇA TOURNE ───────────────────────
        await s.page.evaluate(() => {
            const c2 = document.querySelector('[data-code]');
            const i = c2.value.indexOf('\n') + 3;
            c2.focus(); c2.setSelectionRange(i, i);
        });
        await s.page.click('[data-decaler="1"]');
        await dormir(300);
        await s.page.click('[data-lancer]');
        const bon = await attendreVerdict(s);
        dire('le programme corrigé TOURNE et c\'est juste',
            !!bon && /pe-console--ok/.test(bon.genre),
            bon ? bon.texte.slice(0, 120) : 'aucune console');
        if (photos) await s.photo('#game-layer', 'tools/tmp/python-editeur-juste.png');
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
        dire('aucune fenêtre native', s.fenetresNatives.length === 0);
    }
    await s.fermer();
}

// ── LA TOUCHE ENTRÉE DESCEND D'UN CRAN APRÈS UN DEUX-POINTS ───────────────
console.log('\n\x1b[1mLE CLAVIER, POUR CEUX QUI SONT SUR ORDINATEUR\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 900, hauteur: 1100 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('algo-python-ecrire',
        { marches: ['deux-lignes'] }, { questions: 3 });
    if (ennui) dire('l\'exercice s\'ouvre', false, String(ennui));
    else {
        await s.doitExister(CODE);
        await s.page.click(CODE);
        await s.page.type(CODE, 'for i in range(3):');
        await s.page.keyboard.press('Enter');
        await s.page.type(CODE, 'print(i)');
        await dormir(300);
        const t = await s.page.evaluate(() => document.querySelector('[data-code]').value);
        dire('après un deux-points, la ligne suivante est DÉJÀ décalée',
            (t.split('\n')[1] || '').startsWith('    '), JSON.stringify(t));
        // ET LA TOUCHE TABULATION NE SORT PAS DU CHAMP : sans ce garde-fou,
        // elle déplace le foyer vers le bouton suivant et l'élève perd le
        // curseur — le défaut classique d'un éditeur dans une page.
        await s.page.keyboard.press('Tab');
        await dormir(250);
        const foyer = await s.page.evaluate(() =>
            document.activeElement === document.querySelector('[data-code]'));
        dire('et la touche TAB reste dans l\'éditeur', foyer);
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    }
    await s.fermer();
}

// ── ÉCRIRE CE QUE LE PROGRAMME AFFICHE ───────────────────────────────────
//
// RÉMY, 19 novembre : il a lu « Que va afficher ce programme ? », tapé la
// sortie ligne par ligne, et le logiciel a dit « faux » — parce qu'il
// EXÉCUTAIT sa réponse au lieu de la comparer. « ça devrait être bon ».
console.log('\n\x1b[1mÉCRIRE CE QUE LE PROGRAMME AFFICHE\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 900, hauteur: 1100 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('algo-python-ecrire',
        { marches: ['sortie-tant-que'] }, { questions: 4 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); }
    else {
        await s.doitExister(CODE);
        const vu = await s.page.evaluate(() => ({
            programme: [...document.querySelectorAll('.py-bloc .py-code')]
                .map(c => c.textContent).join('\n'),
            question: (document.querySelector('.py-question') || {}).textContent || '',
            // CE QUE RÉMY A DEMANDÉ : pas de numéros devant une réponse.
            numeros: document.querySelectorAll('[data-marges] .py-num').length,
            marges: !!document.querySelector('[data-marges]'),
            crans: document.querySelectorAll('[data-decaler]').length,
            bouton: (document.querySelector('[data-lancer]') || {}).textContent || '',
            // ET SURTOUT : le rappel « doit afficher » porterait LA RÉPONSE.
            rappel: !!document.querySelector('.pe-attendu'),
            champVide: (document.querySelector('[data-code]') || {}).value === ''
        }));
        dire('le programme à lire est dans l\'énoncé', /while|print/.test(vu.programme),
            vu.programme.replace(/\n/g, ' / ').slice(0, 50));
        dire('la question demande la sortie', /affiche/.test(vu.question),
            vu.question.slice(0, 50));
        dire('AUCUN numéro devant la réponse', vu.numeros === 0 && !vu.marges,
            `${vu.numeros} numéro(s)`);
        dire('aucun bouton de décalage', vu.crans === 0, `${vu.crans} bouton(s)`);
        dire('le bouton dit « Vérifier », pas « Lancer »',
            /Vérifier/.test(vu.bouton), vu.bouton.trim());
        dire('et RIEN n\'affiche la réponse attendue', !vu.rappel);
        dire('le champ est vide au départ', vu.champVide);

        // ── LA FAUTE DE RÉMY : tout sur une seule ligne ──────────────────
        const attendu = await s.page.evaluate(() => {
            const b = [...document.querySelectorAll('.py-bloc .py-code')]
                .map(c => c.textContent).join('\n');
            // DEUX FORMES, ET LA BORNE N'EST PAS AU MÊME ENDROIT. En descente
            // elle est dans « n = 5 » ; en montée, « n = 1 » n'est que le
            // départ et la borne est dans « n <= 6 ». Lire la première au lieu
            // de la seconde faisait taper « 1 » à la sonde, qui mesurait alors
            // une réponse qu'aucun élève n'écrirait.
            const descend = /n > 0/.test(b);
            const m = descend ? /n = (\d+)/.exec(b) : /n <= (\d+)/.exec(b);
            if (!m) return null;
            const n = Number(m[1]);
            return descend
                ? Array.from({ length: n }, (_, k) => n - k)
                : Array.from({ length: n }, (_, k) => k + 1);
        });
        // ON ÉCRIT PAR `evaluate` ET NON AU CLAVIER : après une réponse
        // fausse, le meneur pose sa fenêtre de retour par-dessus l'éditeur, et
        // Playwright attend alors trente secondes « element is not stable ».
        // L'outil a raison ; c'est la sonde qui frappait au mauvais moment.
        const ecrire = (t) => s.page.evaluate((v) => {
            const c = document.querySelector('[data-code]');
            c.value = v;
            c.dispatchEvent(new Event('input', { bubbles: true }));
            document.querySelector('[data-lancer]').click();
        }, t);
        await ecrire(attendu.join(''));
        const colle = await attendreVerdict(s);
        dire('tout collé sur une ligne : on dit OÙ regarder',
            !!colle && /pas à la bonne place|À LA LIGNE/.test(colle.texte),
            colle ? colle.texte.slice(0, 80) : 'aucun verdict');
        dire('et ce n\'est pas compté juste', !!colle && /pe-console--ko/.test(colle.genre));

        // ── ET LA BONNE RÉPONSE, UNE LIGNE PAR LIGNE ─────────────────────
        await dormir(2600);   // le temps que la fenêtre de retour s'efface
        await ecrire(attendu.join('\n'));
        const bon = await attendreVerdict(s);
        dire('une ligne par ligne : C\'EST JUSTE',
            !!bon && /pe-console--ok/.test(bon.genre),
            bon ? bon.texte.slice(0, 60) : 'aucun verdict');
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
        dire('aucune fenêtre native', s.fenetresNatives.length === 0);
    }
    await s.fermer();
}

// ── LE DESSIN : UN MODÈLE À CÔTÉ, ET LE PROGRAMME QUI LE REFAIT ──────────
//
// RÉMY, 19 novembre : « aussi des fonctions et du dessin », puis « des petits
// jeux simples c'est toujours motivant ». Le jeu est là, et la correction ne
// passe par aucune phrase : on voit les deux dessins.
console.log('\n\x1b[1mDESSINER, ET COMPARER AU MODÈLE\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 1000, hauteur: 1400 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('algo-python-ecrire',
        { marches: ['dessin-carre'] }, { questions: 4 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); }
    else {
        await s.doitExister(CODE);
        await s.doitExister('[data-modele]');
        // LE MODÈLE EST TRACÉ PAR LE BAC À SABLE : il arrive après coup, on
        // le guette au lieu de l'attendre.
        let modele = '';
        for (let i = 0; i < 60 && !modele; i++) {
            modele = await s.page.evaluate(() =>
                (document.querySelector('[data-modele]') || {}).src || '');
            if (!modele) await dormir(200);
        }
        dire('le modèle est dessiné', modele.startsWith('data:image/png'),
            modele ? modele.slice(0, 22) + '…' : 'aucune image');
        const vu = await s.page.evaluate(() => ({
            bouton: (document.querySelector('[data-lancer]') || {}).textContent || '',
            depart: (document.querySelector('[data-code]') || {}).value || '',
            numeros: document.querySelectorAll('[data-marges] .py-num').length,
            crans: document.querySelectorAll('[data-decaler]').length,
            consigne: (document.querySelector('.py-question') || {}).textContent || ''
        }));
        dire('le bouton dit « Dessiner »', /Dessiner/.test(vu.bouton), vu.bouton.trim());
        dire('la tortue est déjà importée', /import turtle/.test(vu.depart),
            JSON.stringify(vu.depart));
        // ICI LES NUMÉROS RESTENT : le champ porte un PROGRAMME, pas une
        // réponse. C'est la frontière que Rémy a tracée le 19 novembre.
        dire('et les numéros de ligne sont là, car c\'est un programme',
            vu.numeros >= 2 && vu.crans === 2, `${vu.numeros} numéro(s), ${vu.crans} bouton(s)`);

        const cote = (vu.consigne.match(/côté (\d+)/) || [0, '100'])[1];
        const ecrire = (v) => s.page.evaluate((t) => {
            const c = document.querySelector('[data-code]');
            c.value = t; c.dispatchEvent(new Event('input', { bubbles: true }));
            document.querySelector('[data-lancer]').click();
        }, v);
        const guetter = async () => {
            let dernier = null;
            for (let i = 0; i < 90; i++) {
                const c = await s.page.evaluate(() => {
                    const e = document.querySelector('[data-console]');
                    return e && !e.hidden ? { genre: e.className,
                        texte: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 90),
                        tien: !(document.querySelector('[data-tien]') || {}).hidden } : null;
                });
                if (c) { dernier = c; if (/--(ok|ko)/.test(c.genre)) return c; }
                await dormir(150);
            }
            return dernier;
        };

        // ── UNE AUTRE FIGURE ────────────────────────────────────────────
        await ecrire(`import turtle\nt = turtle.Turtle()\nfor i in range(3):\n`
            + `    t.forward(${cote})\n    t.left(120)`);
        const autre = await guetter();
        dire('un triangle n\'est pas le carré demandé',
            !!autre && /--ko/.test(autre.genre), autre ? autre.texte : 'aucun verdict');
        dire('et son dessin s\'affiche à côté du modèle', !!autre && autre.tien);
        await dormir(2600);

        // ── UNE FAUTE DE SYNTAXE ────────────────────────────────────────
        await ecrire(`import turtle\nt = turtle.Turtle()\nfor i in range(4):\nt.forward(${cote})`);
        const faute = await guetter();
        dire('une faute de décalage se dit en FRANÇAIS',
            !!faute && /DÉCALÉE|décal/.test(faute.texte), faute ? faute.texte.slice(0, 70) : '');
        await dormir(2600);

        // ── ET LA BONNE FIGURE ──────────────────────────────────────────
        await ecrire(`import turtle\nt = turtle.Turtle()\nfor i in range(4):\n`
            + `    t.forward(${cote})\n    t.left(90)`);
        const bon = await guetter();
        dire('le carré demandé : C\'EST LA MÊME FIGURE',
            !!bon && /--ok/.test(bon.genre), bon ? bon.texte : 'aucun verdict');
        if (photos) await s.photo('#game-layer', 'tools/tmp/python-dessin.png');
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
        dire('aucune fenêtre native', s.fenetresNatives.length === 0);
    }
    await s.fermer();
}

console.log('\n' + '─'.repeat(70));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : '\nON DÉCALE AU DOIGT, LE PROGRAMME TOURNE,\n'
      + 'ET CE QUI CLOCHE SE DIT EN FRANÇAIS.');
process.exit(rates ? 1 : 0);
