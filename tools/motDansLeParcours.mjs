// UN MOT DU PROFESSEUR, DU GESTE DE RÉMY À L'ÉCRAN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans le parcours ce qui serait sympa c'est de pouvoir caler un
// message entre les exercices, pour expliquer un peu. »
//
// CE QUE SEULE UNE SONDE PEUT DIRE, et qu'aucune des épreuves ne dit : que le
// bouton existe à l'écran, que la fenêtre d'écriture s'ouvre, que l'aperçu
// montre le gras, que l'étape apparaît dans la liste de l'atelier avec son
// texte — et surtout que l'élève, en traversant la séance, LIT le mot entre les
// deux exercices, puis peut le RELIRE depuis le fil.
//
// ET LA POLICE. Rémy : « il faut rester cohérent dans la police ». On mesure la
// police RENDUE sur les pixels du navigateur, pas la règle CSS : une famille
// qu'on ne sert pas retombe en silence sur un repli, et c'est exactement ce qui
// s'était produit sur les pièces du bloc Scratch.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1500);

// ── CÔTÉ PROFESSEUR : L'ATELIER ─────────────────────────────────────────────
console.log('\n\x1b[1mL\'ATELIER DE RÉMY\x1b[0m');
await s.page.click('#top-btn-preparer');
await dormir(1200);

// On repart d'un parcours neuf, avec un exercice, pour que le mot ait un avant
// et un après — c'est tout l'objet de la demande.
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    state.currentPath = makePath('La séance du jeudi', [], politiquePerso());
    const { addStep, renderTeacherPath } = await import('./js/ui/builder.js');
    renderTeacherPath();
    addStep('calc-add');
    addStep('calc-prio');
});
await dormir(900);

// LE TOTAL AVANT, pour le comparer APRÈS. Ma première version attendait 20 en
// dur, et les deux exercices en apportent 25 : chacun propose SON compte
// naturel (voir `questionsConseilleesDe`). La sonde annonçait un défaut qui
// n'existait pas. On mesure donc la DIFFÉRENCE, qui est la seule chose que le
// mot doit laisser intacte.
const avant = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { totalItems, totalWeight } = await import('./js/core/path.js');
    return { questions: totalItems(state.currentPath), bareme: totalWeight(state.currentPath) };
});
console.log(`   avant le mot : ${avant.questions} questions, barème sur ${avant.bareme}`);

const bouton = await s.page.$('#btn-ajouter-mot');
dire('le bouton « ajouter un message » est dans la barre', !!bouton);

// ON TIRE LA BULLE ENTRE LES DEUX EXERCICES, comme Rémy l'a demandé :
// « l'idéal est de pouvoir faire glisser en drag drop une ligne de texte entre
// les exercices ». On vise le MILIEU de la deuxième ligne, ce qui dépose avant
// elle — donc entre les deux.
// LE SÉLECTEUR SE LIT DANS LA SOURCE, il ne s'invente pas — règle du journal,
// payée huit fois. `:nth-of-type(2)` compte les DIV frères, pas les
// `.path-step` : la liste porte d'autres éléments. On prend la deuxième ligne
// par son index, ce qui est ce qu'on voulait dire.
const lignes = await s.page.$$('.path-step');
if (lignes.length < 2) { console.log('   (moins de deux étapes : rien à viser)'); }
const cible = lignes[1];
const boite = cible ? await cible.boundingBox() : null;
if (boite) {
    await s.page.hover('#btn-ajouter-mot');
    await s.page.mouse.down();
    await s.page.mouse.move(boite.x + boite.width / 2, boite.y + 4, { steps: 12 });
    await s.page.mouse.up();
    await dormir(1000);
}

let ou = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { estUnMessage } = await import('./js/core/path.js');
    return state.currentPath.steps.findIndex(estUnMessage);
});
// LE GLISSER DE SOURIS N'EST PAS TOUJOURS UN VRAI GLISSER-DÉPOSER HTML : selon
// la plateforme, Chromium ne fabrique pas l'événement `dragstart`. On ne
// transforme pas ce doute en faux signalement — on le dit, et l'on dépose par
// l'événement lui-même pour mesurer la SUITE, qui est ce qui compte ici.
if (ou === -1) {
    console.log('   (le glisser à la souris n\'a pas produit de dépôt : on dépose par l\'événement)');
    await s.page.evaluate(() => {
        const liste = document.getElementById('path-steps') || document.querySelector('.path-steps');
        const cible = document.querySelectorAll('.path-step')[1];
        const r = cible.getBoundingClientRect();
        const dt = new DataTransfer();
        dt.setData('text/mot', '1');
        (liste || cible.parentElement).dispatchEvent(new DragEvent('drop', {
            bubbles: true, cancelable: true, dataTransfer: dt,
            clientX: r.x + r.width / 2, clientY: r.y + 4
        }));
    });
    await dormir(900);
    ou = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const { estUnMessage } = await import('./js/core/path.js');
        return state.currentPath.steps.findIndex(estUnMessage);
    });
}
dire('LE MOT SE DÉPOSE ENTRE LES DEUX EXERCICES', ou === 1,
    ou === -1 ? 'aucun mot posé' : `rang ${ou + 1}`);

// ── ON ÉCRIT DIRECTEMENT DANS LA LIGNE, SANS FENÊTRE ───────────────────────
// ON COMPTE LES FENÊTRES VISIBLES, pas les `.modal-title` du document : la
// page en porte plusieurs en permanence, cachées (la confirmation universelle,
// entre autres). Neuvième sélecteur inventé de ce chantier, et la règle du
// journal vaut toujours : on le LIT dans la source, ou on mesure ce qu'on voit.
const fenetresVisibles = await s.page.evaluate(() =>
    [...document.querySelectorAll('.modal-title')]
        .filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.textContent.trim()));
dire('aucune fenêtre ne s\'est ouverte', fenetresVisibles.length === 0,
    fenetresVisibles.join(' · ') || '');
const champs = await s.page.evaluate(() => ({
    titre: !!document.querySelector('.path-mot-titre'),
    texte: !!document.querySelector('.path-mot-texte'),
    focus: (document.activeElement || {}).className || ''
}));
dire('la ligne porte ses deux champs', champs.titre && champs.texte, JSON.stringify(champs));

// LA HAUTEUR SE MESURE SUR UNE LIGNE VIDE, c'est-à-dire sur ce que Rémy voit
// au moment où il la dépose. Mesurée pleine, elle dirait surtout la longueur du
// texte qu'on vient d'y taper.
const hauteurs = await s.page.evaluate(() => {
    const mot = document.querySelector('.path-step--mot');
    const exo = [...document.querySelectorAll('.path-step')].find((e) => e !== mot);
    const corbeille = mot ? mot.querySelector('.btn-icon') : null;
    return {
        mot: mot ? Math.round(mot.getBoundingClientRect().height) : 0,
        exo: exo ? Math.round(exo.getBoundingClientRect().height) : 0,
        corbeilleHaut: corbeille && mot
            ? Math.round(corbeille.getBoundingClientRect().top - mot.getBoundingClientRect().top)
            : -1,
        corbeilleDansLaLigne: !!(corbeille && corbeille.closest('.path-mot-ligne'))
    };
});
dire('et le curseur y est déjà', /path-mot-texte/.test(champs.focus), champs.focus || '(ailleurs)');

// ON TAPE, PUIS ON CLIQUE DANS L'AUTRE CHAMP — c'est le geste du professeur,
// et c'est lui qui a révélé que le re-rendu au départ du champ volait le clic.
await s.page.fill('.path-mot-titre', 'Attention au piège');
await s.page.click('.path-mot-texte');
await dormir(300);
const curseurArrive = await s.page.evaluate(() =>
    (document.activeElement || {}).className || '');
dire('LE CLIC DU TITRE VERS LE TEXTE ARRIVE À DESTINATION',
    /path-mot-texte/.test(curseurArrive), curseurArrive || '(nulle part)');
await s.page.fill('.path-mot-texte',
    'Ici on change de *méthode*.\n\nOn calcule la parenthèse <b>d\'abord</b>.');
await s.page.evaluate(() => document.querySelector('.path-mot-texte').blur());
await dormir(900);

const garde = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { estUnMessage } = await import('./js/core/path.js');
    const m = state.currentPath.steps.find(estUnMessage);
    return m ? m.message : null;
});
dire('ce qu\'on tape est enregistré sans bouton',
    !!garde && garde.titre === 'Attention au piège' && /change de \*méthode\*/.test(garde.texte),
    JSON.stringify(garde));

// ET LE CHAMP SE SÉLECTIONNE — c'est ce qu'un parent `draggable` empêche.
const selectionnable = await s.page.evaluate(() => {
    const t = document.querySelector('.path-mot-texte');
    return { ligneDeplacable: t.closest('.path-step').draggable,
             poigneeDeplacable: !!t.closest('.path-step').querySelector('.path-step-grip').draggable };
});
dire('LE TEXTE RESTE SÉLECTIONNABLE : la ligne n\'est plus déplaçable',
    selectionnable.ligneDeplacable === false, String(selectionnable.ligneDeplacable));
dire('c\'est la poignée ☰ qui porte le glisser', selectionnable.poigneeDeplacable);

const liste = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const lignes = [...document.querySelectorAll('.path-step')].map((e) => ({
        mot: e.classList.contains('path-step--mot'),
        casse: e.classList.contains('path-step--broken'),
        texte: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    }));
    const { totalItems, totalWeight } = await import('./js/core/path.js');
    return { lignes, etapes: state.currentPath.steps.length,
             questions: totalItems(state.currentPath),
             bareme: totalWeight(state.currentPath) };
});
console.log('   ce que porte le modèle : ' + JSON.stringify(
    await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const { estUnMessage } = await import('./js/core/path.js');
        const m = state.currentPath.steps.find(estUnMessage);
        return m ? m.message : null;
    })));
console.log('   la liste de l\'atelier :');
liste.lignes.forEach((l) => console.log(`     ${l.mot ? '💬' : l.casse ? '✗ ' : '  '} ${l.texte}`));
dire('le mot a sa ligne, et n\'est PAS annoncé cassé',
    liste.lignes.some((l) => l.mot) && !liste.lignes.some((l) => l.casse));
// LA VALEUR D'UN CHAMP N'EST PAS DANS `textContent` : on la lit sur le champ.
// Première version : la sonde cherchait le titre dans le texte de la ligne, et
// ne l'y trouvait évidemment pas — le titre vit maintenant dans un `input`.
const titreDeLaLigne = await s.page.evaluate(() =>
    (document.querySelector('.path-step--mot .path-mot-titre') || {}).value || '');
dire('la ligne porte le titre du mot', /Attention au piège/.test(titreDeLaLigne),
    titreDeLaLigne || '(vide)');
dire('il n\'ajoute aucune question au total', liste.questions === avant.questions,
    `${avant.questions} → ${liste.questions} pour ${liste.etapes} étapes`);
dire('ET RIEN AU BARÈME — zéro ne doit pas valoir un', liste.bareme === avant.bareme,
    `${avant.bareme} → ${liste.bareme}`);

// ── LA LIGNE DU MOT DANS L'ATELIER NE DOIT PAS ÊTRE UN PAVÉ ────────────────
//
// Rémy, capture à l'appui : « rends les blocs qui portent le texte à éditer
// plus petit (mets l'icone poubelle ailleurs) et qu'on voit le fantôme quand on
// les déplace ».
console.log('\n\x1b[1mLA LIGNE DU MOT, DANS L\'ATELIER\x1b[0m');
// ON MESURE AVANT DE LANCER LA SÉANCE, et c'est la correction : après, la
// couche de jeu couvre la page, et le bouton « Préparer » est parfaitement
// visible — mais recouvert. Même famille de piège que le panneau qu'on croit
// ouvert : ce qu'on voit n'est pas ce qu'on peut cliquer.
console.log(`   à vide : mot ${hauteurs.mot} px · exercice ${hauteurs.exo} px`);
dire('UNE LIGNE DE MOT VIDE NE FAIT PAS PLUS QU\'UNE LIGNE D\'EXERCICE',
    hauteurs.mot > 0 && hauteurs.mot <= hauteurs.exo,
    `${hauteurs.mot} contre ${hauteurs.exo}`);
dire('LA CORBEILLE EST EN HAUT, pas sous le texte',
    hauteurs.corbeilleHaut >= 0 && hauteurs.corbeilleHaut < 24,
    `${hauteurs.corbeilleHaut} px sous le haut de la ligne`);
dire('et elle est rangée DANS la ligne des champs', hauteurs.corbeilleDansLaLigne);
// ET LE FANTÔME DU GLISSER EST LA LIGNE, pas la poignée.
const fantome = await s.page.evaluate(() => {
    const src = document.querySelector('.path-step--mot .path-step-grip');
    return !!(src && src.ondragstart && String(src.ondragstart).includes('setDragImage'));
});
dire('ON VOIT LA LIGNE EN LA DÉPLAÇANT, pas trois petits traits', fantome);

// ── CÔTÉ ÉLÈVE : LA SÉANCE ──────────────────────────────────────────────────
//
// ON DÉPLACE LE MOT AU MILIEU, parce que c'est là qu'il sert : « caler un
// message ENTRE les exercices ».
console.log('\n\x1b[1mLA SÉANCE, TRAVERSÉE\x1b[0m');
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    // LE MOT EST DÉJÀ AU BON RANG : il a été DÉPOSÉ entre les deux exercices,
    // ce qui est tout l'objet du nouveau geste. L'ancienne version devait le
    // remonter à la main après l'avoir ajouté à la fin.
    const { Runner } = await import('./js/core/runner.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    // PAS DE `sansTrace`, ET C'EST LA DEUXIÈME ERREUR DE CETTE SONDE : le fil
    // de la séance se dessine à partir du JOURNAL (`avancementDuMoment`). Sans
    // trace, aucun run n'existe, le fil se cache — et la sonde annonçait « 0
    // case » sur un fil qui marche. Elle mesurait son propre réglage.
    state.activeSequenceRunner = new Runner({
        path: { ...state.currentPath, policy: politiquePerso() },
        deviceMode: 'none'
    });
    state.activeSequenceRunner.start();
});
await dormir(2500);

// LE PREMIER EXERCICE S'OUVRE, PAS LE MOT : il est en deuxième position.
let vu = await s.page.evaluate(() => ({
    mot: !!document.querySelector('.run-mot-texte'),
    jeu: !!document.querySelector('#game-layer, .game-wrap, canvas')
}));
dire('la séance s\'ouvre sur l\'exercice, pas sur le mot', !vu.mot);

// ON SAUTE DIRECTEMENT À L'ÉTAPE DU MOT : traverser six additions à la main
// mesurerait la patience de la sonde, pas le logiciel.
await s.page.evaluate(() => {
    const r = window.state ? null : null;
    return import('./js/core/state.js').then(({ state }) => {
        const run = state.activeSequenceRunner;
        run.index = 1;
        run.runStep();
    });
});
await dormir(1400);

const ecran = await s.page.evaluate(() => {
    const t = document.querySelector('.run-mot-texte');
    const titre = document.querySelector('.run-mot .run-screen-title');
    const btn = document.getElementById('btn-run-mot');
    const cs = t ? getComputedStyle(t) : null;
    return {
        present: !!t,
        titre: titre ? titre.textContent.trim() : '',
        texte: t ? t.textContent.replace(/\s+/g, ' ').trim() : '',
        gras: t ? t.querySelectorAll('b').length : 0,
        bouton: btn ? btn.textContent.trim() : '',
        police: cs ? cs.fontFamily : '',
        aligne: cs ? cs.textAlign : ''
    };
});
dire('L\'ÉLÈVE LIT LE MOT entre les deux exercices', ecran.present);
dire('avec son titre', /Attention au piège/.test(ecran.titre), ecran.titre);
dire('et son gras', ecran.gras === 1, String(ecran.gras));
dire('un seul bouton, et il dit ce qu\'il fait', ecran.bouton === 'J\'ai compris', ecran.bouton);
// LA POLICE RENDUE, et non la règle CSS : c'est la seule mesure qui attrape un
// repli silencieux.
dire('LA POLICE EST CELLE DU LOGICIEL', /Outfit/i.test(ecran.police), ecran.police);
dire('le paragraphe est aligné à gauche, pas centré', ecran.aligne === 'left', ecran.aligne);

// « J'AI COMPRIS » DOIT DONNER L'EXERCICE SUIVANT, pas un second écran.
await s.page.click('#btn-run-mot');
await dormir(1800);
vu = await s.page.evaluate(() => ({
    mot: !!document.querySelector('.run-mot-texte'),
    bilan: !!document.getElementById('btn-run-next'),
    titre: (document.getElementById('game-title') || {}).textContent || ''
}));
dire('« J\'ai compris » enchaîne sur l\'exercice suivant',
    !vu.mot && !vu.bilan, vu.titre.trim() || JSON.stringify(vu));

// ── LE RELIRE, DEPUIS LE FIL ────────────────────────────────────────────────
console.log('\n\x1b[1mLE RELIRE\x1b[0m');
const fil = await s.page.evaluate(() => {
    const cases = [...document.querySelectorAll('#fil-seance .fil-pas')];
    const mot = cases.find((c) => c.classList.contains('fil-pas--mot'));
    return {
        combien: cases.length,
        laCase: !!mot,
        bouton: mot ? mot.tagName : '',
        large: mot ? Math.round(mot.getBoundingClientRect().width) : 0,
        voisine: cases[0] ? Math.round(cases[0].getBoundingClientRect().width) : 0
    };
});
dire('le mot a sa case dans le fil', fil.laCase, `${fil.combien} cases`);
dire('elle est cliquable, même pour l\'élève', fil.bouton === 'BUTTON', fil.bouton);
dire('et elle ne s\'étire pas comme un exercice', fil.large > 0 && fil.large < fil.voisine,
    `${fil.large} px contre ${fil.voisine} px`);


if (fil.laCase) {
    await s.page.click('#fil-seance .fil-pas--mot');
    await dormir(1000);
    const relu = await s.page.evaluate(() => {
        const t = [...document.querySelectorAll('.modal-title, h3')]
            .map((e) => e.textContent.trim());
        const corps = document.querySelector('.modal .run-mot-texte, .run-mot-texte');
        return { titre: t.find((x) => /Attention au piège/.test(x)) || '',
                 texte: corps ? corps.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) : '' };
    });
    dire('UN CLIC LE ROUVRE', !!relu.titre && /change de méthode/.test(relu.texte),
        relu.titre || relu.texte || '(rien)');
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mLE MOT DU PROFESSEUR ARRIVE JUSQU\'À L\'ÉLÈVE, ET SE RELIT.\x1b[0m');
await s.fermer();
process.exit(ratés ? 1 : 0);
