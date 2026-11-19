// EXÉCUTER LE PROGRAMME DE L'ÉLÈVE — et ne lui montrer que du français.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « des qcm et APRÈS que l'élève tape, l'aider sur
// l'indentation ». Puis le 19 : « il faudrait que l'élève puisse faire de
// petits programmes ».
//
// ── CE FICHIER N'EXÉCUTE RIEN LUI-MÊME : IL PARLE AU BAC À SABLE ─────────
//
// Skulpt compile le Python en JavaScript et l'ÉVALUE. La politique de sécurité
// du site interdit `eval`, et elle n'est pas négociable : elle existe parce
// qu'en septembre 2026 le PRÉNOM d'un élève s'exécutait dans la page du
// professeur (voir l'en-tête de `tools/csp.mjs`).
//
// MA PREMIÈRE MESURE DISAIT QUE SKULPT S'EN PASSAIT, et elle était fausse.
// J'avais servi une page d'essai avec `script-src 'self'` et Skulpt y tournait ;
// sur le vrai site, la sonde a rendu « Evaluating a string as JavaScript is not
// allowed ». La différence tenait à ce que mon essai exécutait un programme
// trop simple pour emprunter le chemin qui évalue. *Une mesure qui n'emprunte
// pas le chemin de l'utilisateur ne mesure pas son problème.*
//
// On exécute donc AILLEURS : `bac-python.html`, un cadre d'une seule page qui
// ne contient aucun code de l'application, ne lit aucune donnée d'élève, et
// n'a le droit d'évaluer que chez lui. Ce fichier lui envoie un programme par
// `postMessage` et attend ce qu'il a affiché. L'application, elle, garde
// `script-src 'self'` sans `eval`.
//
// ── ET IL NE PARLE JAMAIS DIRECTEMENT À L'ÉLÈVE ──────────────────────────
//
// Mesuré le 18 novembre : quatre fautes de débutant entièrement différentes
// rendent la même phrase, « bad input on line 2 », en anglais. Tout ce qui
// sort d'ici passe donc par `diagnostic.js` : on JUGE D'ABORD en français, et
// l'on n'exécute que ce qu'on a déclaré lisible. Les erreurs qui restent — à
// l'exécution, celles-là — sont traduites par `traduireErreur`.

import { diagnostiquer, traduireErreur } from './diagnostic.js';

const PAGE_DU_BAC = 'bac-python.html';

// LES DEUX FICHIERS DE SKULPT, que NOUS lisons et que nous tendons au cadre.
// Ils restent dans la liste du service worker (`sw.js`) : c'est de là qu'ils
// viennent hors ligne.
const FICHIERS_PYTHON = ['vendor/skulpt/skulpt.min.js', 'vendor/skulpt/skulpt-stdlib.js'];

// LE CADRE N'EST MONTÉ QU'UNE FOIS, et il reste. Le démonter entre deux essais
// rechargerait 944 Ko à chaque clic sur « Lancer ».
let cadre = null;
let promesse = null;
let jeton = 0;

/** Les attentes en cours, par jeton : le cadre répond, on réveille la bonne. */
const attentes = new Map();

/**
 * EST-CE NOTRE CADRE QUI PARLE ?
 *
 * ON COMPARE LA FENÊTRE, PAS L'ORIGINE — et ce n'est pas un relâchement, c'est
 * l'inverse. Le cadre est cloisonné, donc son document a une origine OPAQUE,
 * partagée par tous les documents opaques ; `cadre.contentWindow`, lui, ne
 * désigne que celui-là. MESURÉ (`tools/intrusionDuBac.mjs`) : un message
 * parfaitement formé, venu d'une autre fenêtre, est jeté.
 */
function deNotreCadre(ev) {
    if (!cadre || ev.source !== cadre.contentWindow) return false;
    const d = ev.data;
    return !!(d && typeof d === 'object' && d.pour === 'bac-python');
}

function ecouter() {
    window.addEventListener('message', (ev) => {
        if (!deNotreCadre(ev)) return;
        const attente = attentes.get(ev.data.jeton);
        if (!attente) return;
        attentes.delete(ev.data.jeton);
        attente(ev.data);
    });
}

/**
 * Monte le bac à sable et attend qu'il annonce qu'il est debout.
 *
 * Rend `true` s'il est là, `false` si le réseau a refusé — et dans ce cas
 * l'éditeur reste utilisable : on peut écrire et se faire relire, on ne peut
 * simplement pas lancer. Un éditeur qui refuserait de s'ouvrir parce qu'un
 * fichier manque serait pire que muet.
 */
export function chargerPython() {
    if (promesse) return promesse;
    promesse = new Promise((resoudre) => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            resoudre(false);
            return;
        }
        ecouter();

        let fini = false;
        const finir = (quoi) => {
            if (fini) return;
            fini = true;
            // UN ÉCHEC NE SE GARDE PAS : si le réseau revient — et un élève sur
            // tablette perd le réseau tout le temps —, le clic suivant doit
            // pouvoir remonter le cadre. Un `false` mis en cache rendrait la
            // panne définitive jusqu'au rechargement de la page.
            if (!quoi) { promesse = null; cadre = null; }
            resoudre(quoi);
        };

        // ON ÉCOUTE AVANT DE CRÉER LE CADRE : la page du bac réclame Python
        // dès son script, et un écouteur posé après arriverait trop tard.
        // *Pour mesurer un écran, il faut une entrée qui ne le fasse pas
        // changer* — ici, il faut écouter avant de parler.
        const surMot = (ev) => {
            if (!deNotreCadre(ev)) return;
            if (ev.data.quoi === 'il-me-faut-python') { tendrePython(); return; }
            if (ev.data.quoi !== 'debout') return;
            window.removeEventListener('message', surMot);
            finir(!!ev.data.pret);
        };
        window.addEventListener('message', surMot);

        cadre = document.createElement('iframe');
        // ── OÙ EST LE CLOISONNEMENT ? DANS L'EN-TÊTE DE LA PAGE. ─────────
        //
        // RÉMY, 19 novembre : « attention que le script ne permet pas
        // d'intrusion ». La porte qu'il désigne EXISTAIT, et elle est
        // mesurée : depuis l'intérieur d'un cadre non cloisonné, on lit
        // **4915 éléments de la page du professeur** et les clés
        // « atoutmath-prof », « atoutmath-porte »…
        //
        // ON NE POSE PAS `sandbox` SUR CETTE BALISE, et c'est contre-intuitif.
        // L'attribut cloisonne parfaitement — mais une navigation vers un
        // cadre à origine opaque N'EST PAS SERVIE PAR LE SERVICE WORKER.
        // Mesuré (`tools/tmp/bacHorsLigne.mjs`) : hors ligne, zéro cadre
        // chargé, « Lancer » mort. Dans une salle de collège sans réseau,
        // c'est l'exercice entier qui disparaît.
        //
        // Le cloisonnement vient donc de la directive `sandbox allow-scripts`
        // de la POLITIQUE de `bac-python.html` (voir `tools/csp.mjs`) : même
        // origine opaque, même DOM fermé, même stockage absent — mais une
        // navigation ordinaire, donc servie depuis le cache.
        // `tools/intrusionDuBac.mjs` repousse chaque porte après coup.
        cadre.className = 'pe-bac';
        cadre.setAttribute('title', 'Le bac à sable Python');
        cadre.setAttribute('aria-hidden', 'true');
        cadre.setAttribute('tabindex', '-1');
        // LA RACINE EST CELLE DE LA PAGE : l'application se sert aussi bien
        // depuis « / » que depuis « /atoutmath/ », et un chemin absolu
        // casserait la seconde.
        cadre.src = PAGE_DU_BAC;
        cadre.addEventListener('error', () => {
            window.removeEventListener('message', surDebout);
            finir(false);
        });
        document.body.appendChild(cadre);

        // ET UNE LIMITE DE PATIENCE. Sans elle, un cadre qui ne répond pas —
        // fichier absent, hors ligne au premier essai — laisse le bouton
        // « Lancer » sur « Je lance… » pour toujours, ce qui est la pire
        // réponse possible : l'élève ne sait pas s'il doit attendre.
        setTimeout(() => {
            window.removeEventListener('message', surDebout);
            finir(false);
        }, 15000);
    });
    return promesse;
}

/**
 * ON TEND PYTHON AU CADRE, EN TEXTE.
 *
 * ET C'EST LE SENS DE LA DÉPENDANCE QUI COMPTE. Le cadre, à origine opaque,
 * n'est pas un « client » du service worker : il ne peut rien se faire servir
 * depuis le cache, donc hors ligne il ne chargerait aucun fichier. NOUS, nous
 * sommes un client — `fetch` passe par le worker et trouve Skulpt dans le
 * cache. On le lui lit, et on le lui donne.
 *
 * Mesuré : sans cela, hors ligne, le document du bac arrivait bien mais `Sk`
 * restait absent.
 */
async function tendrePython() {
    try {
        const sources = [];
        for (const f of FICHIERS_PYTHON) {
            const r = await fetch(f);
            if (!r.ok) throw new Error(f);
            sources.push(await r.text());
        }
        if (cadre && cadre.contentWindow) {
            cadre.contentWindow.postMessage(
                { pour: 'bac-python', quoi: 'voici-python', jeton: 0, sources }, '*');
        }
    } catch (e) {
        // On ne dit rien ici : la limite de patience de `chargerPython` rendra
        // `false`, et l'éditeur a déjà sa phrase pour le cas.
    }
}

/** Envoie un programme au bac, et attend sa réponse. */
function demanderAuBac(source, entrees, limite) {
    return new Promise((resoudre) => {
        const n = ++jeton;
        let repondu = false;
        attentes.set(n, (d) => { repondu = true; resoudre(d); });
        // `'*'` PARCE QUE LE CADRE N'A PLUS D'ORIGINE À NOMMER : elle est
        // opaque, et `postMessage` n'accepte pas « null » comme destination.
        // Le destinataire reste sûr autrement : c'est `cadre.contentWindow`,
        // une fenêtre que nous avons créée et dont nous avons écrit l'adresse.
        // Et le message ne porte que le programme de l'élève — ce qu'il vient
        // de taper lui-même, pas un secret.
        cadre.contentWindow.postMessage(
            { pour: 'bac-python', quoi: 'lancer', jeton: n, source, entrees, limite },
            '*');
        // LE GARDE-FOU DU GARDE-FOU. `execLimit` coupe les boucles sans fin
        // DANS le bac ; si c'est le bac lui-même qui ne répond plus, personne
        // ne coupe rien. On laisse trois secondes de marge au-dessus de sa
        // propre limite, puis on rend la main.
        setTimeout(() => {
            if (repondu) return;
            attentes.delete(n);
            resoudre({ ok: false, sortie: '', erreur: 'le bac à sable ne répond pas' });
        }, limite + 3000);
    });
}

/**
 * LANCE LE PROGRAMME, ET REND CE QUE L'ÉLÈVE DOIT LIRE.
 *
 * @param {string} source le programme tel qu'il l'a tapé
 * @param {Object} [o]
 * @param {string[]} [o.entrees] ce que `input()` rendra, dans l'ordre
 * @param {number} [o.limite] millisecondes avant de couper une boucle sans fin
 * @returns {Promise<{ok:boolean, sortie:string, dire?:string, aide?:string,
 *                     ligne?:number, faute?:string}>}
 */
export async function lancer(source, o = {}) {
    // ── ON JUGE AVANT D'EXÉCUTER ─────────────────────────────────────────
    //
    // C'est la décision d'architecture du 18 novembre, et elle vit ici : si
    // notre vérificateur français voit une faute, Skulpt ne voit rien. L'élève
    // reçoit « Ligne 1 finit par « : », donc la ligne 2 doit être DÉCALÉE vers
    // la droite » au lieu de « bad input on line 2 ».
    const vu = diagnostiquer(source);
    if (vu) return { ok: false, sortie: '', dire: vu.dire, aide: vu.aide,
        ligne: vu.ligne, faute: vu.faute };

    const pret = await chargerPython();
    if (!pret || !cadre || !cadre.contentWindow) {
        return { ok: false, sortie: '',
            dire: 'Python n’a pas pu être chargé.',
            aide: 'Ton programme est correct, mais la machine ne peut pas le lancer '
                + 'pour l’instant. Réessaie dans un moment.' };
    }

    // LA BOUCLE SANS FIN EST UNE MARCHE DE L'EXERCICE : il FAUT qu'un élève
    // puisse en écrire une, et il faut qu'elle s'arrête. `execLimit` est en
    // millisecondes de temps réel.
    const limite = o.limite || 2000;
    const r = await demanderAuBac(source, (o.entrees || []).slice(), limite);
    const sortie = r.sortie || '';
    // `deborde` : le bac a ARRÊTÉ DE RETENIR la sortie (20 000 caractères).
    // On le remonte parce qu'un élève qui ne verrait que le début sans savoir
    // pourquoi chercherait la faute dans son programme.
    if (r.ok) return { ok: true, sortie, deborde: !!r.deborde };

    const texte = String(r.erreur || '');
    // LA COUPURE N'EST PAS UNE FAUTE DE PYTHON, c'est NOTRE garde-fou : elle
    // mérite sa phrase, parce que c'est exactement ce que la marche « la boucle
    // qui ne s'arrête jamais » cherche à faire voir.
    if (/execution time|timed? out|TimeLimitError|ne répond pas/i.test(texte)) {
        return { ok: false, sortie,
            dire: 'Ton programme ne s’arrête pas.',
            aide: 'Je l’ai coupé au bout de deux secondes. Une boucle « while » doit '
                + 'contenir ce qui finira par rendre son test faux — souvent une ligne '
                + 'du genre « n = n − 1 ».' };
    }
    const { dire, aide } = traduireErreur(texte);
    const m = texte.match(/on line (\d+)/);
    return { ok: false, sortie, dire, aide, ligne: m ? Number(m[1]) : null };
}

/**
 * CE QU'IL FALLAIT AFFICHER A-T-IL ÉTÉ AFFICHÉ ?
 *
 * ON COMPARE LIGNE À LIGNE, EN PARDONNANT LES ESPACES DE BOUT DE LIGNE et la
 * dernière ligne vide. Un élève dont le programme est juste mais qui a laissé
 * une espace derrière « Bonjour » a écrit un programme juste : lui répondre
 * « faux » sur un caractère invisible, c'est lui apprendre à se méfier.
 *
 * LE RESTE EST STRICT, ET C'EST VOULU : « bonjour » n'est pas « Bonjour », et
 * « 7 » n'est pas « 7.0 ». Python ne pardonne pas non plus, et c'est Python
 * qu'on apprend.
 */
export function sortieJuste(sortie, attendue) {
    const net = (t) => String(t == null ? '' : t)
        .replace(/\r\n?/g, '\n')
        .split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n')
        .replace(/\n+$/, '');
    return net(sortie) === net(attendue);
}
