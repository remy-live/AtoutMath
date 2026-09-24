// LA CSP, CALCULÉE À PARTIR DE LA PAGE PLUTÔT QUE RECOPIÉE À LA MAIN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QU'EST UNE CSP, EN UNE PHRASE : un en-tête qui dit au navigateur « sur
// cette page, n'exécute du JavaScript que s'il vient d'ici ». C'est un filet
// SOUS les fautes d'échappement qu'on n'a pas encore écrites — celle de
// septembre 2026, où le prénom d'un élève s'exécutait chez le professeur,
// aurait été arrêtée par cet en-tête même avec le trou dans `showToast`.
//
// POURQUOI UN OUTIL, ET PAS TROIS LIGNES DANS `.htaccess`.
//
// `index.html` porte huit scripts écrits directement dans la page — le tiroir
// du poste élève, le thème posé avant le premier pixel, l'écran de chargement.
// Une CSP stricte les refuse tous. On a trois façons d'en sortir :
//
//   · `'unsafe-inline'` — tout autoriser. Facile, et la CSP ne protège alors
//     plus de rien : c'est précisément la forme qu'aurait prise l'attaque.
//   · les sortir dans des fichiers — huit requêtes de plus, sur une page qui
//     en fait déjà 308 et met une seconde à s'afficher. On répare une chose
//     en cassant l'autre.
//   · LES SIGNER. Le navigateur calcule l'empreinte de chaque script écrit
//     dans la page et ne l'exécute que si elle figure dans l'en-tête. Le code
//     de l'élève, lui, n'y figure pas — il ne s'exécute pas.
//
// C'est la troisième, et elle a un prix : une empreinte change dès qu'on
// touche à une virgule du script. D'où cet outil, et d'où le test qui recalcule
// les empreintes et tombe quand elles ont dérivé. On ne recopie pas une
// empreinte à la main : on la fabrique.
//
// USAGE
//   node tools/csp.mjs           → affiche l'en-tête
//   node tools/csp.mjs --ecrire  → le pose dans `.htaccess`
//   node tools/csp.mjs --verifier → 0 si `.htaccess` est à jour, 1 sinon

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'postes.html'];

const MARQUE_DEBUT = '# ── CSP : engendrée par `node tools/csp.mjs`, ne pas éditer à la main ──';
const MARQUE_FIN = '# ── fin CSP ──';

/** Les empreintes SHA-256 de tous les scripts écrits dans une page. */
export function empreintesDe(html) {
    // On ne prend QUE les `<script>` sans `src` : ceux qui portent du code.
    // Un `<script src="vendor/…">` est couvert par `'self'`, pas par une
    // empreinte — et l'inclure ici donnerait une empreinte de chaîne vide.
    const dedans = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];
    return dedans.map(m => 'sha256-' + createHash('sha256').update(m[1], 'utf8').digest('base64'));
}

export function fabriquerCsp(lireFichier = (f) => readFileSync(join(RACINE, f), 'utf8')) {
    const empreintes = [];
    for (const page of PAGES) {
        for (const e of empreintesDe(lireFichier(page))) {
            if (!empreintes.includes(e)) empreintes.push(e);
        }
    }
    const signes = empreintes.map(e => `'${e}'`).join(' ');

    // CE QUE CHAQUE LIGNE INTERDIT, ET POURQUOI ELLE EST LÀ.
    return [
        // Tout ce qui n'est pas nommé plus bas vient du site, et de nulle part
        // ailleurs. Il n'y a AUCUNE ressource externe : `localforage` et
        // `confetti` sont servis depuis `vendor/`, vérifié.
        "default-src 'self'",
        // Le cœur : les scripts du site, plus les huit écrits dans la page,
        // signés un par un. Rien d'autre ne s'exécute.
        `script-src 'self' ${signes}`,
        // LES STYLES GARDENT `'unsafe-inline'`, et c'est assumé : un attribut
        // `style=` ne se signe pas en pratique, la page en pose des dizaines
        // (y compris l'écran de chargement, qui DOIT être en ligne pour
        // s'afficher avant la première feuille), et détourner une page par du
        // style seul est une attaque bien plus faible. On ne paie pas une
        // réécriture générale pour ce gain-là.
        "style-src 'self' 'unsafe-inline'",
        // `data:` pour les dessins fabriqués en SVG et les captures ; `blob:`
        // pour les fiches PDF engendrées dans le navigateur.
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        // L'API est sur le même hôte. Rien ne sort ailleurs.
        "connect-src 'self'",
        // `blob:` : les fiches imprimées s'ouvrent dans un cadre.
        "frame-src 'self' blob:",
        // `worker-src` — ET IL MANQUAIT, ce qui aurait cassé les confettis en
        // silence le jour du passage en vigueur.
        //
        // MESURÉ en posant la CSP STRICTE dans le navigateur et en jouant sous
        // elle (voir `tools/tmp/cspEssai.mjs`) : une violation, une seule, et
        // elle n'arrive qu'au moment le plus visible —
        //
        //   Refused to create a worker from 'blob:…'   ← confetti.browser.js
        //
        // La bibliothèque de confettis fabrique son animation dans un Worker
        // engendré depuis un blob, et un « sans faute » n'aurait plus rien
        // affiché du tout, sans le moindre message. C'est très exactement ce
        // que le mode « rapport » sert à trouver, et c'est la raison pour
        // laquelle on ne bascule pas sans avoir regardé.
        //
        // CE N'EST PAS UN AFFAIBLISSEMENT : un worker `blob:` ne peut être
        // créé que par du script déjà en train de tourner sur l'origine, que
        // `script-src` gouverne déjà. On n'ouvre donc aucune porte de plus.
        "worker-src 'self' blob:",
        // PERSONNE N'ENFERME CE SITE DANS UNE IFRAME. C'est ce qui empêche
        // qu'on habille l'espace professeur d'une fausse page pour lui faire
        // cliquer ce qu'il ne veut pas.
        "frame-ancestors 'none'",
        // Un `<base>` injecté détournerait toutes les adresses relatives de la
        // page — y compris celles des modules.
        "base-uri 'self'",
        // Un formulaire ne poste que chez nous : c'est la porte par laquelle
        // un mot de passe partirait ailleurs.
        "form-action 'self'",
        // Ni Flash, ni applet, ni objet : rien de tout cela n'est utilisé.
        "object-src 'none'"
    ].join('; ');
}

function blocHtaccess(csp) {
    return [
        MARQUE_DEBUT,
        '#',
        '# EN VIGUEUR, ET PLUS EN MODE « RAPPORT ».',
        '#',
        '# `Report-Only` n\'empêche rien : le navigateur applique la page et se',
        '# contente de signaler ce qu\'il AURAIT bloqué. C\'était le bon premier',
        '# temps — une CSP trop serrée ne prévient pas l\'utilisateur : la page',
        '# se charge, un bout ne marche plus, aucun message, et on le découvre',
        '# devant la classe.',
        '#',
        '# ON N\'A PAS ATTENDU UNE SEMAINE : ON A MESURÉ. Plutôt que de guetter',
        '# une console pendant des jours, on pose la CSP STRICTE dans un vrai',
        '# navigateur et l\'on se sert de l\'application dessous — démarrage,',
        '# entrée du professeur, espace classes, quatre exercices joués jusqu\'au',
        '# pavé, réglages et aperçu, impression. Une violation est sortie, et',
        '# une seule : `worker-src ← blob:`, les confettis. Elle est corrigée',
        '# dans la politique, pas contournée. Depuis : zéro.',
        '#',
        '# SI QUELQUE CHOSE CASSE MALGRÉ TOUT, le retour arrière tient en deux',
        '# mots : rajouter `-Report-Only` à la ligne ci-dessous.',
        '#',
        '# LES EMPREINTES SONT CALCULÉES : `node tools/csp.mjs --ecrire`. Elles',
        '# changent dès qu\'on touche à un script écrit dans `index.html`, et un',
        '# test (`tests/csp.test.mjs`) tombe quand elles ont dérivé.',
        '<IfModule mod_headers.c>',
        `    Header always set Content-Security-Policy "${csp}"`,
        '    # DEUX EN-TÊTES DE PLUS, sans rapport avec la CSP mais du même',
        '    # ménage : ne pas deviner le type d\'un fichier (une image qui',
        '    # serait lue comme du script), et ne pas envoyer l\'adresse',
        '    # complète de la page à un site tiers.',
        '    Header always set X-Content-Type-Options "nosniff"',
        '    Header always set Referrer-Policy "strict-origin-when-cross-origin"',
        '</IfModule>',
        MARQUE_FIN
    ].join('\n');
}

/** Remplace le bloc CSP dans `.htaccess`, ou l'ajoute s'il n'y est pas. */
export function poserDansHtaccess(contenu, csp) {
    const bloc = blocHtaccess(csp);
    const i = contenu.indexOf(MARQUE_DEBUT);
    if (i === -1) return contenu.trimEnd() + '\n\n' + bloc + '\n';
    const j = contenu.indexOf(MARQUE_FIN, i);
    if (j === -1) return contenu.trimEnd() + '\n\n' + bloc + '\n';
    return contenu.slice(0, i) + bloc + contenu.slice(j + MARQUE_FIN.length);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const csp = fabriquerCsp();
    const chemin = join(RACINE, '.htaccess');
    if (process.argv.includes('--ecrire')) {
        writeFileSync(chemin, poserDansHtaccess(readFileSync(chemin, 'utf8'), csp));
        console.log('`.htaccess` mis à jour.');
    } else if (process.argv.includes('--verifier')) {
        const attendu = poserDansHtaccess(readFileSync(chemin, 'utf8'), csp);
        const actuel = readFileSync(chemin, 'utf8');
        if (attendu === actuel) { console.log('`.htaccess` est à jour.'); }
        else { console.error('`.htaccess` a dérivé — relancer `node tools/csp.mjs --ecrire`.'); process.exit(1); }
    } else {
        console.log(csp);
    }
}
