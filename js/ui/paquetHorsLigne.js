// LE PAQUET HORS LIGNE : UNE REQUÊTE, ET LA TABLETTE EST PRÊTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « est ce que le logiciel serait capable de produire soit un apk soit
// un zip que l tablette pourrait télécharger quand elle est en ligne ? » Puis,
// la recommandation faite : « Oui je suis tes recommandations ».
//
// ── CE QUE ÇA REMPLACE ─────────────────────────────────────────────────────
//
// `?preparer` demandait les fichiers UN PAR UN. Mesuré sur une tablette neuve
// qui ouvre l'adresse de préparation (`node tools/sondePreparation.mjs`) :
//
//                        sans le paquet      avec
//     requêtes servies        599             38
//     fichiers en mémoire     584            686
//     modules de jeu           91             91
//
// LE GAIN EST EN ALLERS-RETOURS, PAS EN OCTETS. Le `.htaccess` active
// `mod_deflate` sur le JavaScript : servis un par un, les fichiers arrivent
// compressés eux aussi, et le ZIP pèse à peu près leur somme. Mais sur le wifi
// d'une école, ce sont les allers-retours qui coûtent.
//
// CE QUI RESTE AU PRIX FORT : le réapprovisionnement d'après une mise à jour
// (voir `reprendreLAncien` dans sw.js) redemande toujours les fichiers un par
// un. Il ne peut pas se servir d'ici — un service worker classique n'importe
// pas de module, et recopier ce lecteur là-bas serait la duplication que ce
// dépôt refuse. Ses requêtes, elles, sont conditionnelles : chez un hébergeur
// Apache, les fichiers inchangés répondent 304.
//
// ── AUCUNE BIBLIOTHÈQUE, ET C'EST MESURÉ ───────────────────────────────────
//
// « On n'ajoute pas de dépendance sans une raison qu'on peut écrire. » Il n'y
// en a pas : le navigateur sait déjà tout faire. Mesuré dans Chromium avant
// d'écrire une ligne —
//
//     DecompressionStream : function, en deflate-raw, gzip ET deflate
//     une page peut écrire un fichier inventé dans le cache et le relire
//
// — ce qui laisse à écrire la seule chose qui manque : la lecture du répertoire
// central d'un ZIP, soixante lignes de `DataView`.
//
// ── LE PIÈGE QUI ATTEND CELUI QUI ÉCRIT CECI ───────────────────────────────
//
// UN MODULE SERVI SANS SON TYPE NE SE CHARGE PAS. Poser un `.js` dans le cache
// avec une réponse sans en-tête donne « Failed to load module script: Expected
// a JavaScript module script but the server responded with a MIME type of
// "" » — et comme cela n'arrive qu'HORS LIGNE, sur la tablette d'une classe,
// personne ne le verrait avant le jour J. D'où `typeDuFichier`, et l'épreuve
// qui le garde.

/** Ce qu'il faut annoncer pour que le navigateur accepte le fichier. */
export function typeDuFichier(nom) {
    const ext = String(nom).toLowerCase().split('.').pop();
    switch (ext) {
        // LE PREMIER EST LE SEUL QUI COMPTE VRAIMENT : 654 des 668 fichiers du
        // paquet sont des modules, et un module sans type ne se charge pas.
        case 'js': case 'mjs': return 'text/javascript; charset=utf-8';
        case 'css': return 'text/css; charset=utf-8';
        case 'json': return 'application/json; charset=utf-8';
        case 'webmanifest': return 'application/manifest+json; charset=utf-8';
        case 'html': return 'text/html; charset=utf-8';
        case 'svg': return 'image/svg+xml';
        case 'png': return 'image/png';
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'webp': return 'image/webp';
        case 'woff2': return 'font/woff2';
        case 'woff': return 'font/woff';
        default: return 'application/octet-stream';
    }
}

/**
 * LIT UN ZIP, PAR SON RÉPERTOIRE CENTRAL.
 *
 * ON NE PARCOURT PAS LES EN-TÊTES LOCAUX DE PROCHE EN PROCHE, bien que ce soit
 * plus court : cela ne marche que sur un ZIP qu'on a fabriqué soi-même, et
 * suppose qu'aucun producteur n'a mis de descripteur de données. Le répertoire
 * central est l'endroit où un ZIP dit la vérité sur lui-même — c'est par là que
 * tous les outils le lisent, et c'est ce qui rend le paquet inspectable avec un
 * `unzip -l` ordinaire le jour où quelque chose cloche en classe.
 *
 * @param {ArrayBuffer} tampon
 * @returns {{nom:string, methode:number, octets:Uint8Array}[]}
 */
export function lireLeZip(tampon) {
    const vue = new DataView(tampon);
    const u8 = new Uint8Array(tampon);
    const FIN = 0x06054b50, CENTRAL = 0x02014b50;
    // LA FIN DU RÉPERTOIRE SE CHERCHE DEPUIS LA FIN : elle est suivie d'un
    // commentaire de longueur libre (65 535 au plus), donc sa place n'est pas
    // fixe. On ne remonte pas plus loin que ces 65 535 octets plus l'en-tête.
    let fin = -1;
    const plancher = Math.max(0, tampon.byteLength - 65557 - 22);
    for (let i = tampon.byteLength - 22; i >= plancher; i--) {
        if (vue.getUint32(i, true) === FIN) { fin = i; break; }
    }
    if (fin < 0) throw new Error('ce fichier n\'est pas un ZIP');
    const combien = vue.getUint16(fin + 10, true);
    let p = vue.getUint32(fin + 16, true);
    const entrees = [];
    for (let i = 0; i < combien; i++) {
        if (vue.getUint32(p, true) !== CENTRAL) {
            throw new Error('répertoire central abîmé à l\'entrée ' + i);
        }
        const methode = vue.getUint16(p + 10, true);
        const taille = vue.getUint32(p + 20, true);
        const nomLong = vue.getUint16(p + 28, true);
        const extraLong = vue.getUint16(p + 30, true);
        const notesLong = vue.getUint16(p + 32, true);
        const debut = vue.getUint32(p + 42, true);
        const nom = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nomLong));
        // LES LONGUEURS DES CHAMPS VARIABLES SE RELISENT DANS L'EN-TÊTE LOCAL,
        // et pas dans le central : les deux peuvent différer, et prendre celles
        // du central décale le début des données de quelques octets — un ZIP
        // qui se lit bien ici et mal ailleurs.
        const nl = vue.getUint16(debut + 26, true);
        const el = vue.getUint16(debut + 28, true);
        const ou = debut + 30 + nl + el;
        if (nom && !nom.endsWith('/')) {
            entrees.push({ nom, methode, octets: u8.subarray(ou, ou + taille) });
        }
        p += 46 + nomLong + extraLong + notesLong;
    }
    return entrees;
}

/** Décompresse une entrée — ou la rend telle quelle si elle est stockée. */
export async function gonfler(entree) {
    if (entree.methode === 0) return entree.octets;
    if (entree.methode !== 8) {
        throw new Error('méthode de compression inconnue : ' + entree.methode);
    }
    const flux = new Blob([entree.octets]).stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flux).arrayBuffer());
}

/** Le navigateur sait-il seulement faire ce qu'on va lui demander ? */
export function leNavigateurSaitLire() {
    return typeof DecompressionStream === 'function' && typeof caches !== 'undefined';
}

/**
 * TÉLÉCHARGE LE PAQUET ET POSE SON CONTENU DANS LE CACHE DU SERVICE WORKER.
 *
 * ON ÉCRIT DANS LE CACHE DE LA VERSION COURANTE, celui que `sw.js` nomme — on
 * le retrouve en demandant la liste des caches, puisque la page ne connaît pas
 * la constante. S'il y en a plusieurs (une mise à jour en cours), on prend
 * celui que le worker vient de garnir, c'est-à-dire le plus rempli : poser cinq
 * cents fichiers dans un cache qui va être effacé serait un travail perdu dont
 * la page se féliciterait.
 *
 * @param {string} adresse
 * @param {(fait:number, total:number, etape:string)=>void} [dire]
 * @returns {Promise<{fichiers:number, octets:number}>}
 */
export async function poserLePaquet(adresse, dire) {
    if (!leNavigateurSaitLire()) throw new Error('ce navigateur ne sait pas lire le paquet');
    const parle = typeof dire === 'function' ? dire : () => { };

    parle(0, 0, 'telechargement');
    const r = await fetch(adresse, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('le paquet n\'est pas servi (' + r.status + ')');
    const tampon = await r.arrayBuffer();
    // LES DEUX PREMIERS OCTETS, AVANT TOUT LE RESTE. Sur un hébergement sans
    // PHP, l'adresse rend la SOURCE du script, ou une page d'erreur, avec un
    // code 200 : sans ce test on partirait décompresser du texte, et le message
    // d'erreur ne parlerait que de répertoire central.
    const u8 = new Uint8Array(tampon);
    if (u8.length < 4 || u8[0] !== 0x50 || u8[1] !== 0x4b) {
        throw new Error('ce que le serveur a rendu n\'est pas un paquet');
    }

    const entrees = lireLeZip(tampon);
    if (!entrees.length) throw new Error('le paquet est vide');

    const noms = await caches.keys();
    if (!noms.length) throw new Error('aucun cache : le service worker n\'est pas là');
    let cible = noms[0];
    if (noms.length > 1) {
        let mieux = -1;
        for (const n of noms) {
            const combien = (await (await caches.open(n)).keys()).length;
            if (combien > mieux) { mieux = combien; cible = n; }
        }
    }
    const cache = await caches.open(cible);

    let faits = 0, octets = 0;
    for (const entree of entrees) {
        const brut = await gonfler(entree);
        octets += brut.length;
        await cache.put(new URL(entree.nom, location.href).href,
            new Response(brut, { headers: { 'Content-Type': typeDuFichier(entree.nom) } }));
        faits++;
        // ON REND LA MAIN RÉGULIÈREMENT : six cent soixante-huit décompressions
        // d'affilée tiennent le fil principal, et la maîtresse voit une page
        // figée pendant que la tablette travaille. C'est la leçon déjà payée
        // sur le chargement des modules.
        if (faits % 25 === 0) {
            parle(faits, entrees.length, 'rangement');
            await new Promise(r2 => setTimeout(r2, 0));
        }
    }
    parle(faits, entrees.length, 'rangement');
    return { fichiers: faits, octets };
}

/**
 * DEMANDE AU NAVIGATEUR DE NE PAS VIDER CETTE MÉMOIRE.
 *
 * C'EST LA PARADE AU SEUL VRAI AVANTAGE D'UN APK. Les fichiers d'une
 * application installée ne peuvent pas être effacés par le système quand la
 * place manque ; un cache de navigateur, si — et c'est précisément ce qui
 * arrive sur une tablette d'école pleine de photos, un mardi matin.
 *
 * `persist()` demande le statut « durable » : accordé, le navigateur n'évince
 * plus rien de ce site sans un geste de l'utilisateur. Sur Chrome, il
 * l'accorde d'autant plus volontiers que l'application est posée sur l'écran
 * d'accueil — c'est pourquoi la préparation demande l'installation EN PREMIER.
 *
 * @returns {Promise<boolean|null>} null si le navigateur ne connaît pas
 */
export async function demanderUneMemoireDurable() {
    try {
        if (typeof navigator === 'undefined' || !navigator.storage) return null;
        if (typeof navigator.storage.persisted === 'function'
            && await navigator.storage.persisted()) return true;
        if (typeof navigator.storage.persist !== 'function') return null;
        return await navigator.storage.persist();
    } catch (e) { return null; }
}
