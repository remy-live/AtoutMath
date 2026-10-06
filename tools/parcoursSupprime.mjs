// UN PARCOURS SUPPRIMÉ REVIENT-IL ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il me faudrait clairement un gestionnaire de parcours pour en
// sélectionner plusieurs les trier les classer car là du coup on a tout
// retrouvé. Supprimer en bloc, mettre dans la corbeille. »
//
// CE QU'IL FAUT SAVOIR AVANT DE DESSINER QUOI QUE CE SOIT, et qui ne se devine
// pas : depuis que la bibliothèque REDESCEND du serveur au démarrage (v906),
// supprimer un parcours dans le navigateur ne le supprime nulle part. La route
// `/teacher/paths` n'accepte que `save` et `list` — il n'existe AUCUNE façon de
// retirer un parcours du serveur.
//
// LA CONSÉQUENCE SE MESURE EN TROIS GESTES : on supprime, on recharge, on
// regarde. Si le parcours est de retour, alors le bouton « Supprimer » que
// Rémy a sous les yeux depuis des mois est un bouton qui ne supprime rien — et
// un gestionnaire de bibliothèque bâti par-dessus serait un gestionnaire qui
// ment à chaque geste.
//
// C'EST EXACTEMENT LA MESURE QU'IL FAUT FAIRE AVANT D'ÉCRIRE L'ÉCRAN, et pas
// après : l'écran est une demi-journée, la route et la colonne qui la rendent
// vraie sont le vrai travail.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1300, hauteur: 900 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1500);

// ── ON POSE UN PARCOURS, ET ON LE LAISSE MONTER ─────────────────────────────
console.log('\n\x1b[1m1. UN PARCOURS, ENREGISTRÉ ET MONTÉ\x1b[0m');
const pose = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const p = makePath('À SUPPRIMER', [makeStep('calc-add', {}, { nbItems: 4 })],
        politiquePerso());
    const entree = state.saveTeacherPath(p.name, p);
    return { id: entree.id, combien: state.teacherPaths.length };
});
// La veille attend deux secondes après la dernière retouche.
await dormir(4000);
const auServeur = async () => s.page.evaluate(async () => {
    const { auServeur: appel } = await import('./js/core/espaceProf.js');
    const r = await appel('/teacher/paths', { action: 'list' });
    return (r.paths || []).map((x) => x.name);
});
let noms = await auServeur();
dire('il est au serveur', noms.includes('À SUPPRIMER'), JSON.stringify(noms));

// ── ON LE SUPPRIME EN CLIQUANT LE VRAI BOUTON ───────────────────────────────
//
// CETTE SONDE APPELAIT LA FONCTION, ET C'EST POUR CELA QUE LE DÉFAUT EST REVENU.
//
// Sa première version important `jeterALaCorbeille` et l'appelait, avec un
// commentaire qui disait « on passe par la porte que l'écran emprunte ». Elle
// mesurait donc que LA PORTE fonctionne — ce qui était vrai — et jamais que les
// boutons la prennent. Or le bouton corbeille de chaque ligne du tiroir, lui,
// appelait encore `state.removeTeacherPath` tout seul : il effaçait la copie du
// navigateur et laissait celle du serveur, qui redescendait le lendemain.
//
// Rémy l'a vu avant nous : « quand je supprime un exercice, il revient », puis
// « la j'avais supprimé conversion ».
//
// UNE SONDE QUI APPELLE LA FONCTION NE MESURE PAS LE BOUTON. On clique donc le
// bouton, celui que le professeur a sous la main.
console.log('\n\x1b[1m2. ON LE SUPPRIME EN CLIQUANT LE BOUTON DU TIROIR\x1b[0m');
const clic = await s.page.evaluate(async ([id]) => {
    const { renderPathBrowser } = await import('./js/ui/builder.js');
    renderPathBrowser();
    await new Promise((ok) => setTimeout(ok, 400));
    const ligne = document.querySelector(`#path-browser-list [data-parcours="${id}"]`);
    if (!ligne) return { raté: 'la ligne du parcours est introuvable dans le tiroir' };
    const bouton = ligne.querySelector('.path-browser-actions button[title*="upprimer"]')
        || [...ligne.querySelectorAll('.path-browser-actions button')].pop();
    if (!bouton) return { raté: 'aucun bouton de suppression sur la ligne' };
    bouton.click();
    // La confirmation est une FENÊTRE DU LOGICIEL, jamais une fenêtre native —
    // c'est la règle de Rémy : « tu utilises des alert et prompt, on évite ! ».
    await new Promise((ok) => setTimeout(ok, 500));
    // ON LIT LE CROCHET DANS LA SOURCE, ON NE L'INVENTE PAS — et il y en a DEUX.
    //
    // Le logiciel a deux confirmations : `showConfirm` (js/ui/modal.js) qui pose
    // `.confirm-ok-btn`, et `window.appConfirm` (js/app.js) qui réutilise la
    // fenêtre `#universal-confirm-modal` de la page et son `#btn-uc-confirm`.
    // Le tiroir des parcours emploie la seconde.
    //
    // Deux versions de cette sonde ont échoué avant de le savoir : l'une
    // cherchait « un bouton dont le texte ressemble à Supprimer », l'autre le
    // seul `.confirm-ok-btn`. Les deux rendaient `null`, c'est-à-dire la même
    // réponse qu'un logiciel cassé. On accepte donc les deux portes, et l'on
    // dit laquelle on a prise.
    const oui = document.querySelector('#btn-uc-confirm') || document.querySelector('.confirm-ok-btn');
    if (!oui) return { raté: 'aucun bouton de confirmation visible (#btn-uc-confirm ni .confirm-ok-btn)' };
    oui.click();
    return { raté: null };
}, [pose.id]);
dire('le bouton du tiroir existe et se clique', !clic.raté, clic.raté || 'cliqué');
await dormir(2500);
const apres = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return { local: state.teacherPaths.map((p) => p.name) };
});
dire('il a bien quitté la bibliothèque de ce poste',
    !apres.local.includes('À SUPPRIMER'));
await dormir(3500);
noms = await auServeur();
dire('ET IL A QUITTÉ LE SERVEUR', !noms.includes('À SUPPRIMER'),
    noms.includes('À SUPPRIMER') ? 'toujours là' : 'parti');

// ── ON RECHARGE : C'EST LE GESTE QUI TRANCHE ────────────────────────────────
//
// Le professeur ferme son navigateur le soir et le rouvre le matin. C'est tout
// ce que ce rechargement imite.
console.log('\n\x1b[1m3. ON RECHARGE LA PAGE, COMME LE LENDEMAIN MATIN\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(6000);
const auReveil = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.teacherPaths.map((p) => p.name || (p.data || {}).name || '?');
});
console.log(`   la bibliothèque au réveil : ${JSON.stringify(auReveil)}`);
dire('IL NE REVIENT PAS', !auReveil.includes('À SUPPRIMER'),
    auReveil.includes('À SUPPRIMER') ? 'LE PARCOURS EST REVENU' : 'parti pour de bon');

console.log(`\nerreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S) — « Supprimer » ne supprime pas.\x1b[0m`
    : '\n\x1b[32mSUPPRIMER SUPPRIME, ET CELA TIENT AU RECHARGEMENT.\x1b[0m');
await s.fermer();
process.exit(ratés ? 1 : 0);
