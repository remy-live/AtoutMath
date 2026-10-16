// LE PROFESSEUR QUI S'EST CONNECTÉ COMME ÉLÈVE NE PEUT PLUS EN SORTIR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je suis désolé, je me suis mis sur un compte élève mais je ne trouve
// pas où me déconnecter ».
//
// IL N'Y A PAS À ÊTRE DÉSOLÉ : LA PORTE N'EXISTE PAS POUR LUI.
//
// `quiEstLa()` (js/ui/deconnexionUI.js) rend UNE identité, et elle rend celle du
// PROFESSEUR dès qu'un jeton de professeur existe. Or sur SA machine, les deux
// existent : il est professeur, et il vient d'entrer avec le billet d'un élève
// pour essayer. Les deux boutons de sortie — celui du menu « ⋯ » et celui qu'on
// vient de poser dans « Mon profil » — proposent alors « Quitter le mode
// professeur », qui ne défait pas le rattachement de l'élève. Il n'y a
// littéralement aucun geste qui le sorte du compte élève.
//
// CETTE SONDE MONTE EXACTEMENT CETTE SITUATION : un navigateur de professeur
// identifié, puis un billet d'élève dans la même page, et elle demande ce que
// les boutons proposent.
//
//   node tools/deuxIdentites.mjs
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

// ── LE PROFESSEUR ENTRE AVEC LE BILLET D'UN ÉLÈVE, SUR SA PROPRE MACHINE ───
//
// PAS `?poste=1` : c'est son ordinateur, celui où il prépare ses parcours. Le
// poste partagé efface le professeur en entrant ; le sien, non — et c'est bien
// ce qu'on veut, il ne doit pas perdre sa session en essayant un exercice.
console.log('\n\x1b[1mIL ENTRE AVEC UN BILLET D\'ÉLÈVE, SANS QUITTER SON MODE\x1b[0m');
// ON PASSE PAR `loginEleve`, LA PORTE DU FORMULAIRE, et non par le lien
// `#billet=`. Mesuré : sur une machine de professeur, le lien ne rattache
// rien — `aUnJetonEleve` restait faux — alors que le formulaire, lui, le fait.
// C'est le chemin de Rémy : il tape l'identifiant et le code d'un de ses
// élèves pour essayer, depuis sa propre session.
const entre = await s.page.evaluate(async ([b]) => {
    const [login, code] = String(b).split('/');
    const { loginEleve, getSyncConfig } = await import('./js/core/sync.js');
    // `adresseApiDeduite` ET NON LA CONFIGURATION BRUTE : c'est ce que fait le
    // formulaire du portail (js/ui/portailUI.js), et sur la machine du
    // professeur la configuration est vide — mesuré, l'appel tombait sur la
    // page HTML et répondait « Unexpected token '<' ».
    const { adresseApiDeduite } = await import('./js/core/portail.js');
    try {
        await loginEleve({ apiUrl: adresseApiDeduite(getSyncConfig().apiUrl), login, code });
        return '';
    } catch (e) { return String(e && e.message || e); }
}, [billet]);
dire('il entre bien comme élève', entre === '', entre);
await dormir(2500);

const etat = await s.page.evaluate(async () => {
    const { quiEstLa } = await import('./js/ui/deconnexionUI.js');
    const { jetonProf } = await import('./js/core/verrouProf.js');
    const { getActiveProfile } = await import('./js/core/profile.js');
    const p = getActiveProfile();
    return {
        quiEstLa: quiEstLa(),
        // LES DEUX RATTACHEMENTS, LUS À LA SOURCE : c'est l'existence des deux
        // en même temps qui fait le piège.
        aUnJetonProf: !!jetonProf(),
        aUnJetonEleve: !!(p && p.remote && p.remote.token),
        classeDeLEleve: (p && p.remote && (p.remote.className || p.remote.classCode)) || ''
    };
});
console.log(`   ${JSON.stringify(etat)}`);
dire('LES DEUX IDENTITÉS COEXISTENT', etat.aUnJetonProf && etat.aUnJetonEleve,
    JSON.stringify([etat.aUnJetonProf, etat.aUnJetonEleve]));

// ── CE QUE LES BOUTONS DE SORTIE PROPOSENT ────────────────────────────────
await s.page.evaluate(async () => {
    const { setTopNavMode } = await import('./js/ui/navigation.js');
    setTopNavMode('profile');
});
await dormir(1200);
const sorties = await s.page.evaluate(() => {
    const lire = (id) => {
        const b = document.getElementById(id);
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { mot: (b.textContent || '').trim(), cache: b.hidden,
                 visible: r.width > 0 && r.height > 0 };
    };
    // LES TROIS IDENTIFIANTS SE LISENT DANS index.html, ILS NE S'INVENTENT PAS.
    // Ma première version demandait `btn-sortie-eleve`, qui n'existe nulle
    // part : elle rendait `null`, c'est-à-dire la même réponse qu'un bouton
    // absent. Quatrième crochet inventé de ce chantier.
    return { menu: lire('btn-deconnexion'), profil: lire('btn-sortie-profil'),
             eleve: lire('btn-deconnexion-eleve') };
});
console.log(`   ${JSON.stringify(sorties)}`);

const parleDeLEleve = (b) => !!(b && !b.cache && /se déconnecter de /i.test(b.mot));
dire('UNE SORTIE AU MOINS PROPOSE DE QUITTER LE COMPTE ÉLÈVE',
    parleDeLEleve(sorties.menu) || parleDeLEleve(sorties.profil) || parleDeLEleve(sorties.eleve),
    `menu : « ${sorties.menu && sorties.menu.mot} » · profil : « ${
        sorties.profil && sorties.profil.mot} »`);
dire('et elle est VISIBLE sur l\'écran de l\'élève',
    [sorties.profil, sorties.eleve].some(b => b && b.visible && parleDeLEleve(b)),
    JSON.stringify([sorties.profil, sorties.eleve]));

// ── ET LE GESTE DOIT VRAIMENT DÉTACHER L'ÉLÈVE ────────────────────────────
console.log('\n\x1b[1mLE GESTE, JUSQU\'AU BOUT\x1b[0m');
const quiSort = await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('#btn-sortie-profil, #btn-sortie-eleve')]
        .find(x => !x.hidden && /se déconnecter de /i.test((x.textContent || '').trim()));
    if (!b) return null;
    b.click();
    return (b.textContent || '').trim();
});
await dormir(2000);
if (quiSort) {
    const fenetre = await s.page.evaluate(() =>
        [...document.querySelectorAll('.modal-overlay')]
            .filter(e => e.getBoundingClientRect().width > 0)
            .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)));
    dire('la demande de confirmation parle bien de la CLASSE', fenetre.length === 1
        && /classe/i.test(fenetre[0]), fenetre.join(' · '));
    // ON CONFIRME, et l'on regarde ce qu'il reste.
    await s.page.evaluate(() => {
        const ok = document.querySelector('[data-dx-ok]');
        if (ok) ok.click();
    });
    await dormir(3000);
    const apres = await s.page.evaluate(async () => {
        const { jetonProf } = await import('./js/core/verrouProf.js');
        const { getActiveProfile } = await import('./js/core/profile.js');
        const p = getActiveProfile();
        return { prof: !!jetonProf(), eleve: !!(p && p.remote && p.remote.token) };
    });
    dire('L\'ÉLÈVE EST DÉTACHÉ', !apres.eleve, JSON.stringify(apres));
    dire('ET LE PROFESSEUR RESTE CONNECTÉ — il n\'a pas demandé à sortir de SON compte',
        apres.prof, JSON.stringify(apres));
} else {
    dire('il y a un bouton à cliquer', false, 'aucune sortie ne parle de l\'élève');
    dire('L\'ÉLÈVE EST DÉTACHÉ', false, 'rien à cliquer');
    dire('ET LE PROFESSEUR RESTE CONNECTÉ', false, 'rien à cliquer');
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
