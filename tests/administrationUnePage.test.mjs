// L'ADMINISTRATION TIENT EN UNE PAGE, ET LES CLASSES N'Y SONT PLUS.
//
// Rémy : « la zone admin n'a plus besoin de classe et est vieillotte, va à
// l'essentiel avec des choses déroulantes », « j'aimerai en une seule page même
// pour le déposer », puis, devant l'aperçu : « mets le déposer en haut et la
// santé en dessous ».
//
// ── CE QUE CES ÉPREUVES GARDENT, ET POURQUOI PAS AUTRE CHOSE ────────────────
//
// Le rendu se mesure dans un vrai navigateur (tools/administrationUnePage.mjs)
// et de bout en bout par `php tools/testApi.php`, qui ouvre la page, se
// connecte, dépose une archive piégée et vérifie ce qui a été écrit. Ici on
// garde les DÉCISIONS de structure, celles qu'une retouche distraite peut
// défaire sans qu'aucun harnais ne s'en aperçoive :
//
//   · l'ordre des sections — Rémy l'a demandé nommément ;
//   · le fait que le dépôt ne recopie pas les règles de `deposer.php` ;
//   · le fait que `deposer.php` reste sans dépendance, donc utilisable le
//     premier jour ;
//   · le fait que les anciennes adresses mènent encore quelque part.
//
// MESURÉ APRÈS : six pages → une, cinq sections, 0 erreur de page, l'archive
// piégée refusée en quatre entrées nommées, `config.php` intact.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const INDEX = lire('api/admin/index.php');

test('LES CLASSES ONT QUITTÉ L\'ADMINISTRATION', () => {
    for (const mort of ['api/admin/classe.php', 'api/admin/eleves.php']) {
        assert.equal(existsSync(new URL('../' + mort, import.meta.url)), false,
            `${mort} conduisait une séance en double de ce que fait le logiciel`);
    }
    // ET PERSONNE NE LES CHARGE NI N'Y RENVOIE. Un `require` d'un fichier
    // absent est une erreur fatale : la page entière tomberait, y compris la
    // santé qu'on vient justement consulter quand tout va mal.
    //
    // ON NE CHERCHE PAS LE NOM, ON CHERCHE L'APPEL. La première version de
    // cette épreuve refusait toute MENTION de « classe.php » — et tombait sur
    // le commentaire d'en-tête de index.php, celui qui explique précisément ce
    // qui a été retiré. Elle interdisait d'écrire pourquoi. Et `lib/eleves.php`
    // existe toujours : c'est lui qui fait le travail, depuis le logiciel.
    for (const f of ['api/admin/index.php', 'api/admin/_socle.php',
        'api/admin/sections/depot.php', 'api/admin/sections/sante.php']) {
        const src = lire(f);
        assert.doesNotMatch(src, /require[^;\n]*admin\/(classe|eleves)\.php/,
            `${f} charge encore une page supprimée`);
        assert.doesNotMatch(src, /href="(\.\/)?(classe|eleves)\.php/,
            `${f} renvoie encore vers une page supprimée`);
    }
});

test('LE DÉPÔT EST EN TÊTE, LA SANTÉ JUSTE APRÈS', () => {
    // L'ORDRE EST UNE DEMANDE, PAS UN GOÛT. « mets le déposer en haut et la
    // santé en dessous » : c'est le dépôt qu'on vient faire, et une section qui
    // dit « tout va bien » n'a pas à occuper le premier écran.
    const ordre = [...INDEX.matchAll(/require __DIR__ \. '\/sections\/(\w+)\.php'/g)]
        .map((m) => m[1]);
    // `sante` est mise de côté avant d'être écrite — son verdict se lit en haut
    // alors que sa section est en bas —, donc elle apparaît deux fois dans le
    // fichier : une fois pour le calcul, une fois pour l'affichage.
    const affiche = ordre.filter((x, i) => ordre.indexOf(x) === i || x !== 'sante');
    assert.equal(affiche[0], 'sante', 'la santé se calcule avant tout : son verdict va en haut');
    const rendu = INDEX.slice(INDEX.indexOf('piedDePage') - 800);
    assert.ok(rendu.indexOf("sections/depot.php") < rendu.indexOf('$htmlSante'),
        'le dépôt s\'écrit AVANT la santé');
    assert.ok(rendu.indexOf('$htmlSante') < rendu.indexOf("sections/ranger.php"),
        'et la santé avant le rangement');
});

test('CINQ SECTIONS, ET CHACUNE A SON ANCRE', () => {
    // L'ANCRE N'EST PAS DÉCORATIVE : `deposer.php`, le README et les
    // instructions du paquet renvoient dessus, et les trois anciennes pages
    // redirigent vers elles.
    const ancres = ['depot', 'sante', 'ranger', 'rapport', 'compte'];
    for (const a of ancres) {
        const f = a === 'depot' || a === 'compte' ? a : a;
        // L'APPEL TIENT PARFOIS SUR PLUSIEURS LIGNES : on cherche donc
        // l'ancre après `sectionDebut(`, sans exiger qu'elle soit collée.
        const src = lire(`api/admin/sections/${f}.php`);
        assert.match(src, new RegExp(`sectionDebut\\(\\s*'${a}'`),
            `la section « ${a} » doit porter son ancre`);
    }
    assert.equal(ancres.length, 5);
});

test('LES ANCIENNES ADRESSES MÈNENT ENCORE QUELQUE PART', () => {
    for (const [page, ancre] of [['sante', 'sante'], ['rapport', 'rapport'], ['ranger', 'ranger']]) {
        const src = lire(`api/admin/${page}.php`);
        assert.match(src, new RegExp(`Location: index\\.php#${ancre}`),
            `${page}.php doit rediriger vers sa section`);
        assert.match(src, /301/, 'et le dire définitivement, pour que le navigateur retienne');
    }
});

test('LE DÉPÔT NE RECOPIE PAS LES RÈGLES DE `deposer.php`', () => {
    // UN REFUS DE `../` ÉCRIT À DEUX ENDROITS finit par n'être écrit
    // correctement qu'à un seul, et l'on ne sait plus lequel. L'administration
    // APPELLE les règles éprouvées, elle ne les répète pas.
    assert.match(INDEX, /define\('DEPOSER_SANS_PAGE', true\);/,
        'la page charge le déposeur sans afficher sa page');
    assert.match(INDEX, /require_once dirname\(__DIR__, 2\) \. '\/deposer\.php';/);
    const DEPOT = lire('api/admin/sections/depot.php');
    for (const propre of ['ZipArchive', 'extractTo', "str_starts_with(\\$nom, '../')"]) {
        assert.doesNotMatch(DEPOT + INDEX, new RegExp(propre),
            `« ${propre} » appartient à deposer.php : l'administration l'appelle, `
            + 'elle ne le refait pas');
    }
    assert.match(INDEX, /lireArchive\(/, 'elle appelle la lecture d\'archive');
    assert.match(INDEX, /poserArchive\(/, 'et la pose');
});

test('`deposer.php` RESTE DEBOUT TOUT SEUL', () => {
    // C'EST LUI QU'ON TRANSFÈRE LE PREMIER JOUR, quand `api/` n'existe pas
    // encore et qu'il n'y a personne à qui demander de se connecter. Un
    // `require` vers `api/` le rendrait inutilisable exactement au moment où il
    // sert. L'inclusion va dans un seul sens : l'administration l'appelle.
    const D = lire('deposer.php');
    const requires = [...D.matchAll(/require(_once)?\s+([^;]+);/g)].map((m) => m[2]);
    for (const r of requires) {
        assert.ok(/guichet\.php/.test(r),
            `deposer.php ne doit dépendre de rien avant l'installation ; il charge ${r}`);
        // Le seul toléré est enveloppé dans un `try`, et seulement si le site
        // est déjà installé : voir le commentaire sur le guichet.
    }
    assert.match(D, /if \(\$installe\) \{\s*\n\s*try \{/,
        'et même celui-là n\'est chargé que si le site existe, sous un try');
});

test('LE GUICHET GARDE LA PORTE, ET PAS SEULEMENT À L\'AFFICHAGE', () => {
    // UNE PAGE QUI CACHE UN BOUTON MAIS ACCEPTE LA REQUÊTE NE PROTÈGE RIEN.
    // Poser une archive écrit des fichiers PHP : qui l'obtient obtient le
    // serveur. Le contrôle doit donc être dans le traitement, pas dans le HTML.
    const bloc = INDEX.slice(INDEX.indexOf("in_array($action, ['televerser'"));
    assert.ok(bloc.indexOf('!guichetOuvert()') > 0 && bloc.indexOf('!guichetOuvert()') < 400,
        'le refus vient AVANT toute écriture');
    assert.match(INDEX, /if \(!estLeFondateur\(\$prof\)\)/,
        'et seul celui qui a installé le site peut ouvrir le guichet');
});

test('L\'AVERTISSEMENT DU CODE COMMUN N\'EST PAS PARTI AVEC LA PAGE', () => {
    // IL VIVAIT DANS `api/admin/eleves.php` : « un élève peut entrer à la place
    // d'un autre ». En retirant les classes de l'administration, on l'aurait
    // perdu sans s'en apercevoir — c'est une mise en garde, pas une tournure.
    assert.match(lire('js/ui/espaceClasses.js'), /entrer à la place d\\'un autre/,
        'le logiciel doit dire ce que le code commun coûte, là où le geste se fait');
});
