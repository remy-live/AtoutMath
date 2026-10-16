// APRÈS S'ÊTRE DÉCONNECTÉ, ON DOIT RETOMBER SUR LA PORTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « sur le même navigateur, je quitte le mode professeur. Je mets sur un
// compte d'élève. Quand je déconnecte du compte d'élèves, je garde — car ça doit
// être sur le navigateur — le profil de l'élève, alors que j'aimerai revenir à
// l'écran d'identification. »
//
// ── CE QU'ON MESURE, ET POURQUOI CE N'EST PAS « LE JETON EST PARTI » ───────
//
// `deconnecterEleve` détache bien le compte : le jeton s'en va. Mais le PROFIL
// LOCAL reste — il porte le prénom de l'élève, son journal, son score — et
// `portailNecessaire()` (js/core/portail.js) refuse alors d'ouvrir la porte :
// `aUneSeance()` lit `state.studentPath`, qui se recalcule depuis ce journal et
// vaut encore quelque chose. L'application se rouvre donc sous le nom de
// l'élève, comme s'il n'était jamais parti.
//
// On mesure donc l'ÉCRAN qu'on obtient, et le nom sous lequel on travaille —
// pas l'absence du jeton, qui ne dit rien de ce que Rémy voit.
//
//   node tools/retourAuPortail.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
const classeId = s.info.classe;
const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);
dire('un billet d\'élève est disponible', !!billet, String(billet));

// ── 0. UNE SÉANCE EST EN COURS DANS LA CLASSE ──────────────────────────────
//
// C'EST LE CAS QUI COMPTE, et il faut le monter pendant qu'on est encore
// professeur. Un élève qui a une séance laisse un `PATH_ASSIGNED` dans le
// journal local ; `aUneSeance()` le relit, et la porte d'identification refuse
// alors de s'ouvrir — « l'élève a déjà de quoi travailler ». Mesurer sans
// séance aurait donné tout vert sur le défaut que Rémy décrit.
const laSeance = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const { imposerLaSeance } = await import('./js/core/espaceProf.js');
    const p = makePath('La séance du jour',
        [makeStep('calc-add', {}, { stepId: 'a', nbItems: 4 })], politiquePerso());
    const entree = state.saveTeacherPath(p.name, p);
    const r = await donnerAuServeur(entree, cid);
    if (r.erreur) return r.erreur;
    const i = await imposerLaSeance(cid, r.pathId);
    return i.ok ? '' : (i.erreur || 'impose refusé');
}, [classeId]);
dire('une séance est mise en cours', laSeance === '', laSeance);

// ── 1. IL QUITTE LE MODE PROFESSEUR, PUIS ENTRE COMME ÉLÈVE ────────────────
//
// C'est son chemin, mot pour mot : « je quitte le mode professeur. Je mets sur
// un compte d'élève. »
console.log('\n\x1b[1mIL QUITTE SON MODE, PUIS ENTRE COMME ÉLÈVE\x1b[0m');
await s.page.evaluate(async () => {
    const { oublierProf } = await import('./js/core/verrouProf.js');
    oublierProf();
    document.body.classList.remove('teacher-mode');
});
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(1500);
const entre = await s.page.evaluate(async ([b]) => {
    const [login, code] = String(b).split('/');
    const { loginEleve, getSyncConfig } = await import('./js/core/sync.js');
    const { adresseApiDeduite } = await import('./js/core/portail.js');
    try {
        await loginEleve({ apiUrl: adresseApiDeduite(getSyncConfig().apiUrl), login, code });
        return '';
    } catch (e) { return String((e && e.message) || e); }
}, [billet]);
dire('il entre comme élève', entre === '', entre);
// ON ATTEND QUE LA SÉANCE ARRIVE : c'est elle qui crée le `studentPath`, donc
// la trace qui empêchait la porte de se rouvrir. Dix secondes entre deux
// battements (`seanceDistante.js`) : on attend treize.
await dormir(13000);

/** QUI TRAVAILLE, ET QUEL ÉCRAN EST OUVERT. */
const ou = () => s.page.evaluate(async () => {
    const { getActiveProfile, listProfiles } = await import('./js/core/profile.js');
    const { portailNecessaire, estRattache, aUneSeance } = await import('./js/core/portail.js');
    const p = getActiveProfile();
    // LE CROCHET DE LA PORTE SE LIT DANS index.html : `#portail` (voir
    // `ui/portailUI.js`, qui le montre et le cache).
    const porte = document.getElementById('portail');
    const r = porte ? porte.getBoundingClientRect() : null;
    return {
        profil: p ? p.name : null,
        profils: listProfiles().map(x => x.name),
        rattache: estRattache(),
        aUneSeance: aUneSeance(),
        porteNecessaire: portailNecessaire(),
        porteVisible: !!(porte && r && r.width > 0 && r.height > 0)
    };
});

let v = await ou();
console.log(`   ${JSON.stringify(v)}`);
dire('il travaille sous le nom de l\'élève', !!v.profil && v.rattache, JSON.stringify(v.profil));

// ── 2. IL SE DÉCONNECTE DU COMPTE ÉLÈVE ────────────────────────────────────
console.log('\n\x1b[1mIL SE DÉCONNECTE DU COMPTE ÉLÈVE\x1b[0m');
await s.page.evaluate(async () => {
    const { deconnecterEleve } = await import('./js/core/sync.js');
    await deconnecterEleve({ force: true });
});
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(2500);

v = await ou();
console.log(`   ${JSON.stringify(v)}`);
dire('le compte est bien détaché du serveur', !v.rattache, JSON.stringify(v.rattache));
dire('ON RETOMBE SUR L\'ÉCRAN D\'IDENTIFICATION', v.porteNecessaire && v.porteVisible,
    `nécessaire : ${v.porteNecessaire} · visible : ${v.porteVisible}`);
dire('ET ON NE TRAVAILLE PLUS SOUS LE NOM DE L\'ÉLÈVE',
    !v.profil || !/bernard|tom/i.test(v.profil), JSON.stringify(v.profil));

// ── 3. ET SON TRAVAIL N'A PAS ÉTÉ JETÉ ─────────────────────────────────────
//
// SE DÉCONNECTER N'EST PAS S'EFFACER : la case « effacer aussi mon travail »
// existe pour cela, et elle n'était pas cochée. Le profil de l'élève doit donc
// rester dans la liste — on le retrouve en se reconnectant, ou par
// « Qui travaille ? ».
dire('son profil reste dans la liste — se déconnecter n\'est pas s\'effacer',
    v.profils.some(n => /bernard|tom/i.test(n)), v.profils.join(' · '));

// ── 4. ET S'IL SE RECONNECTE, IL RETROUVE SON TRAVAIL ──────────────────────
//
// C'EST LA QUESTION QU'ON N'A PAS LE DROIT DE SUPPOSER. Le profil neuf a un
// journal VIDE : si rien ne le remplissait, un élève qui se déconnecte de sa
// propre tablette et se reconnecte croirait avoir tout perdu. Ce qui doit le
// sauver est que le jeton neuf repart d'un curseur à zéro et retélécharge ce
// que le serveur garde — on le vérifie, on ne le déduit pas.
console.log('\n\x1b[1mIL SE RECONNECTE\x1b[0m');
const revient = await s.page.evaluate(async ([b]) => {
    const [login, code] = String(b).split('/');
    const { loginEleve, getSyncConfig } = await import('./js/core/sync.js');
    const { adresseApiDeduite } = await import('./js/core/portail.js');
    try {
        await loginEleve({ apiUrl: adresseApiDeduite(getSyncConfig().apiUrl), login, code });
        return '';
    } catch (e) { return String((e && e.message) || e); }
}, [billet]);
dire('il se reconnecte', revient === '', revient);
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(13000);
const retrouve = await s.page.evaluate(async () => {
    const { journal } = await import('./js/core/journal.js');
    const { getActiveProfile, listProfiles } = await import('./js/core/profile.js');
    const { aUneSeance } = await import('./js/core/portail.js');
    const p = getActiveProfile();
    return {
        profil: p ? p.name : null,
        profils: listProfiles().map(x => x.name),
        evenements: journal.all().length,
        aUneSeance: aUneSeance()
    };
});
console.log(`   ${JSON.stringify(retrouve)}`);
dire('IL RETROUVE SON TRAVAIL — le serveur le lui rend',
    retrouve.evenements > 0, `${retrouve.evenements} événement(s)`);
dire('et sa séance est de nouveau là', retrouve.aUneSeance, JSON.stringify(retrouve.aUneSeance));
dire('il travaille de nouveau sous son nom', /bernard|tom/i.test(retrouve.profil || ''),
    JSON.stringify(retrouve.profil));

// ── 5. ET S'IL COCHE « EFFACER MON TRAVAIL », RIEN NE RESTE ────────────────
//
// Sur un poste partagé, laisser une coquille vide portant son prénom est
// exactement ce qu'on ne veut pas laisser au suivant.
console.log('\n\x1b[1mIL PART EN COCHANT « EFFACER MON TRAVAIL »\x1b[0m');
await s.page.evaluate(async () => {
    const { deconnecterEleve } = await import('./js/core/sync.js');
    await deconnecterEleve({ force: true, effacerLeTravail: true });
});
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(2500);
const apresEffacement = await s.page.evaluate(async () => {
    const { listProfiles, getActiveProfile } = await import('./js/core/profile.js');
    const p = getActiveProfile();
    return { profils: listProfiles().map(x => x.name), actif: p ? p.name : null };
});
console.log(`   ${JSON.stringify(apresEffacement)}`);
dire('SON PROFIL A DISPARU EN ENTIER — pas une coquille vide à son nom',
    !apresEffacement.profils.some(n => /bernard|tom/i.test(n)),
    apresEffacement.profils.join(' · '));
// ET LES PROFILS VIERGES NE S'EMPILENT PAS. Trois allers-retours sur le poste
// de la salle ne doivent pas laisser trois « Mon profil » dans la liste de
// « Qui travaille ? ».
dire('les profils vierges ne s\'empilent pas',
    apresEffacement.profils.filter(n => n === 'Mon profil').length <= 1,
    apresEffacement.profils.join(' · '));

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
