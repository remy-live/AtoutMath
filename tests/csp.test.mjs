// LA CSP : UN EN-TÊTE QU'ON CALCULE, PAS QU'ON RECOPIE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Une CSP dit au navigateur « n'exécute du JavaScript que s'il vient d'ici ».
// C'est un filet SOUS les fautes d'échappement qu'on n'a pas encore écrites :
// celle de septembre 2026, où le prénom d'un élève s'exécutait dans la page du
// professeur, aurait été arrêtée par cet en-tête malgré le trou dans le code.
//
// LE PRIX À PAYER : `index.html` porte huit scripts écrits dans la page, et
// une CSP stricte les refuse tous. On les SIGNE plutôt que de les autoriser en
// bloc (`'unsafe-inline'` protégerait de rien) ou de les sortir dans des
// fichiers (huit requêtes de plus sur une page qui en fait déjà 308).
//
// Une empreinte change dès qu'on touche à une virgule du script. Ce test est
// donc ce qui rend la méthode tenable : il recalcule, et il tombe quand
// `.htaccess` a dérivé. Sans lui, on modifierait un script un jour de
// décembre, la page se casserait en ligne, et rien ici ne l'aurait dit.
//
// VÉRIFIÉ EN VRAI, en plus de ces assertions : la politique posée EN VIGUEUR
// (pas seulement en rapport) sur un navigateur qui démarre l'application,
// ouvre l'espace classes et joue un exercice — `tools/tmp/cspEssai.mjs` :
// 0 violation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, globSync } from 'node:fs';
import { empreintesDe, fabriquerCsp, poserDansHtaccess } from '../tools/csp.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const HTACCESS = lire('.htaccess');

test('`.htaccess` PORTE EXACTEMENT LA CSP QUE LA PAGE APPELLE', () => {
    // LE CŒUR DE CE FICHIER. On refabrique l'en-tête depuis les pages telles
    // qu'elles sont maintenant, et on exige qu'il soit déjà dans `.htaccess`.
    // S'il a dérivé : `node tools/csp.mjs --ecrire`.
    const attendu = fabriquerCsp();
    assert.ok(HTACCESS.includes(attendu),
        'les empreintes ont dérivé — relancer `node tools/csp.mjs --ecrire`');
    // Et l'outil est idempotent : le réappliquer ne change rien.
    assert.equal(poserDansHtaccess(HTACCESS, attendu), HTACCESS);
});

test('CHAQUE SCRIPT ÉCRIT DANS LA PAGE EST SIGNÉ — aucun oublié', () => {
    ['index.html', 'postes.html'].forEach(page => {
        const e = empreintesDe(lire(page));
        assert.ok(e.length > 0, `${page} : aucun script en ligne trouvé — le relevé est cassé`);
        e.forEach(h => assert.ok(HTACCESS.includes(h),
            `${page} : un script en ligne n'est pas signé (${h.slice(0, 24)}…)`));
    });
    // Neuf scripts en tout au moment d'écrire : huit dans `index.html`, un
    // dans `postes.html`. Le compte n'est pas figé, mais il ne doit pas
    // tomber à zéro sans qu'on s'en aperçoive — ce serait un relevé cassé,
    // et la CSP ne protégerait alors plus rien tout en paraissant en place.
    const total = empreintesDe(lire('index.html')).length + empreintesDe(lire('postes.html')).length;
    assert.ok(total >= 5, `seulement ${total} scripts relevés`);
});

test('ELLE EST EN VIGUEUR, ET CE PASSAGE A ÉTÉ ÉPROUVÉ', () => {
    // CE TEST DISAIT L'INVERSE, ET C'ÉTAIT JUSTE À L'ÉPOQUE. Une CSP trop
    // serrée ne prévient PAS l'utilisateur : la page se charge, un bout ne
    // marche plus, aucun message — et on le découvre devant la classe. Le
    // mode « rapport » était donc le bon premier temps, et le test gardait
    // le passage comme un geste VOLONTAIRE.
    //
    // LE GESTE A ÉTÉ FAIT, ET IL A ÉTÉ MESURÉ. Plutôt que d'attendre une
    // semaine en guettant une console, on pose la politique STRICTE dans un
    // vrai navigateur et l'on se sert de l'application dessous — démarrage,
    // entrée du professeur, espace classes, quatre exercices joués jusqu'au
    // pavé, réglages et aperçu, impression. UNE violation est sortie, et une
    // seule : `worker-src ← blob:`, les confettis, qui auraient cessé de
    // s'afficher en silence au moment du « sans faute ». Elle est corrigée
    // dans la politique, pas contournée.
    //
    // Le test garde maintenant l'autre sens : on ne retombe pas en mode
    // rapport sans le décider.
    assert.match(HTACCESS, /Header always set Content-Security-Policy "/);
    assert.doesNotMatch(HTACCESS, /Content-Security-Policy-Report-Only/);
    // Et le worker `blob:` est bien autorisé, faute de quoi le défaut mesuré
    // reviendrait à la première régénération.
    assert.match(HTACCESS, /worker-src 'self' blob:/);
});

test('AUCUN GESTIONNAIRE N\'EST ÉCRIT DANS UNE BALISE', () => {
    // `onclick="…"` est du JavaScript dans du HTML : une CSP le refuse, et
    // pour la raison même qui la rend utile — c'est sous cette forme qu'une
    // faille d'échappement s'exécute. Il y en avait deux, devenus un écouteur
    // posé par `ui/builder.js` sur `[data-ne-replie-pas]`.
    //
    // On lit hors commentaires : l'explication de la correction cite
    // justement `onclick=`, et un test qui accuse son propre correctif ne
    // sert à rien (déjà vu, sur le compte d'exercices).
    const sansCommentaires = (h) => h.replace(/<!--[\s\S]*?-->/g, ' ');
    ['index.html', 'postes.html'].forEach(page => {
        const m = /\son[a-z]+\s*=\s*"/.exec(sansCommentaires(lire(page)));
        assert.equal(m, null, `${page} : « ${m && m[0].trim()} » écrit dans une balise`);
    });
    // Et le remplaçant existe vraiment, sinon les deux conteneurs replieraient
    // l'en-tête du parcours à chaque clic sur la barre.
    assert.match(lire('js/ui/builder.js'), /\[data-ne-replie-pas\]/);
    assert.match(lire('index.html'), /data-ne-replie-pas/);
});

test('ET AUCUNE RESSOURCE NE VIENT D\'AILLEURS', () => {
    // `default-src 'self'` ne tient que si rien n'est chargé d'un autre hôte.
    // `localforage` et `confetti` sont servis depuis `vendor/` — un commentaire
    // de `core/store.js` dit encore « chargé depuis un CDN », ce qui n'est plus
    // vrai ; c'est la page qui fait foi.
    //
    // ── UN LIEN QUI NE CHARGE RIEN N'EST PAS UNE RESSOURCE ──────────────
    //
    // `<link rel="canonical" href="https://atout-math.fr/">` dit à Google
    // quelle adresse compte quand le site répond aux deux (avec et sans
    // HTTPS). Le navigateur ne télécharge RIEN à cette adresse : ce n'est pas
    // une ressource, la CSP ne s'y applique pas, et elle DOIT être absolue —
    // un canonique relatif ne dit rien de ce qu'il est censé trancher.
    //
    // On nomme donc les `rel` qui ne chargent rien plutôt que de relâcher le
    // motif : la règle qu'on garde ici — aucune ressource d'un autre hôte —
    // reste exactement aussi serrée qu'avant.
    const SANS_CHARGEMENT = /rel="(canonical|alternate|me)"/;
    const H = lire('index.html');
    const externes = [...H.matchAll(/<(?:script|link)[^>]*(?:src|href)="(https?:\/\/[^"]+)"/g)]
        .filter(m => !SANS_CHARGEMENT.test(m[0]))
        .map(m => m[1]);
    assert.deepEqual(externes, [],
        `des ressources viennent d'ailleurs : ${externes.join(', ')}`);
    assert.match(H, /src="vendor\/localforage\//);
    assert.match(H, /src="vendor\/confetti\//);
});

test('ET AUCUN CODE N\'APPELLE `eval` NI `new Function` — LA POLITIQUE LES REFUSE', () => {
    // ── CE QUE CELA A COÛTÉ ───────────────────────────────────────────────
    //
    // RÉMY, 13 novembre, capture à l'appui : « on me dit que c'est faux ».
    // École du Tableur, leçon 5, A1 = 9, B1 = 0 ; il écrit `=A1+B1`, la formule
    // que la consigne donne en exemple, et le jeu répond « le calcul 9+0 ne se
    // fait pas ».
    //
    // `evaluerFormule` calculait par `new Function`. `script-src` ne porte pas
    // `'unsafe-eval'` — et ne doit pas le porter, c'est la moitié de l'intérêt
    // d'une CSP. Toutes les formules des leçons 5 à 9 tombaient donc dans le
    // `catch`, chez tous les élèves, depuis le jour où la politique est née.
    //
    // ── ET POURQUOI AUCUNE MESURE NE L'AVAIT VU ───────────────────────────
    //
    // Une sonde l'avait cherché : « soixante questions d'affilée n'ont produit
    // aucune Erreur » (c'est encore écrit dans `spreadsheet.js`). Elle tapait
    // par `page.evaluate`, QUI EMPRUNTE LE PROTOCOLE DE DÉBOGAGE ET AUTORISE
    // `eval` MÊME SOUS UNE POLITIQUE QUI L'INTERDIT. Soixante mesures vertes
    // dans un navigateur qui n'existe nulle part. `tools/tableurAuClavier.mjs`
    // tape maintenant au clavier, et le refus tombait à la première formule.
    //
    // CETTE ÉPREUVE-CI EST LE FILET BON MARCHÉ : quatre millisecondes de
    // lecture, contre une fonction morte en ligne et verte partout ailleurs.
    const fichiers = [...globSync('js/**/*.js', { cwd: new URL('../', import.meta.url) })];
    assert.ok(fichiers.length > 100, `seulement ${fichiers.length} fichiers lus`);
    const coupables = [];
    for (const f of fichiers) {
        // Hors commentaires : ce test s'explique en citant `new Function`, et
        // une épreuve qui s'accuse elle-même ne garde rien.
        const src = lire(f).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/.*$/gm, ' ');
        const m = /\bnew\s+Function\s*\(|(?<![.\w$])eval\s*\(/.exec(src);
        if (m) coupables.push(`${f} : ${m[0].trim()}`);
    }
    assert.deepEqual(coupables, [],
        'la politique du site refuse ces appels, et le navigateur jette sans un '
        + `mot dans la page :\n    ${coupables.join('\n    ')}`);
});
