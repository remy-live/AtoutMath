// SCANNER LE QR CODE DEPUIS L'APPLICATION — et non depuis l'appareil photo.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, pour sa sœur institutrice et ses tablettes sans internet :
//
//   « Mais du coup on ne peut pas ne pas passer par l application du qr code
//     et avoir une fenêtre intégré dans l appli ce serait le mieux »
//
// IL A RAISON, ET LA RAISON EST PLUS FORTE QUE LE CONFORT.
//
// L'appareil photo d'une tablette ne sait pas ouvrir une application : il
// passe le lien au NAVIGATEUR PAR DÉFAUT. Rien ne garantit que ce soit celui
// où AtoutMath a été mise en cache — et hors ligne, dans le mauvais
// navigateur, l'élève tombe sur une page blanche, sans un mot. C'est le pire
// des échecs : silencieux, et au milieu d'une classe.
//
// Ici, il n'y a plus de navigateur dans l'histoire. L'élève ouvre AtoutMath —
// qui est déjà sur son écran d'accueil —, vise le tableau, et le parcours
// s'ouvre. Rien ne se charge, rien ne navigue, rien ne peut manquer.
//
// ── POURQUOI UNE DÉPENDANCE, ET LAQUELLE ───────────────────────────────────
//
// Le dépôt sait déjà FABRIQUER des QR codes (`core/qrcode.js`). Les LIRE est
// un tout autre métier : il faut binariser une image prise de travers sous
// les néons d'une salle, retrouver les trois carrés de repère, corriger la
// perspective, échantillonner la grille, puis décoder du Reed-Solomon pour
// réparer les modules manquants. Rien de cela ne se dérive de l'encodeur, et
// l'écrire à la main sans corpus d'images pour l'éprouver serait une
// promesse qu'on ne pourrait pas tenir.
//
// MESURÉ : `BarcodeDetector` — le lecteur que le navigateur fournit parfois
// lui-même — est ABSENT du Chromium de ce dépôt, et il l'est aussi sur iPad,
// c'est-à-dire sur les tablettes dont il est question. On ne peut donc pas
// s'appuyer dessus, et l'employer « quand il est là » ferait deux chemins de
// code qui se comportent différemment d'une tablette à l'autre, dans une
// salle où l'on ne peut rien déboguer. UN SEUL CHEMIN, LE MÊME PARTOUT.
//
// `vendor/jsqr/jsQR.js` : Apache 2.0, un seul fichier, aucune autre
// dépendance. RELU AVANT D'ÊTRE EMBARQUÉ — aucun `fetch`, aucun
// `XMLHttpRequest`, aucun `eval`, aucun accès au stockage, et la seule
// adresse qu'il contient est un lien Wikipédia dans un commentaire sur
// l'algorithme de Bresenham. Du calcul, et rien d'autre.
//
// ── CE QUI EST FACILE À OUBLIER, ET QU'ON N'OUBLIE PAS ICI ─────────────────
//
// LA CAMÉRA S'ÉTEINT. Une tablette dont la diode reste allumée après qu'on a
// fermé la fenêtre, dans une classe, n'est pas un défaut technique : c'est un
// défaut de confiance. Le flux est coupé piste par piste à la fermeture, quel
// que soit le chemin par lequel on ferme.
//
// ON NE DEMANDE LA CAMÉRA QU'AU CLIC. Jamais au démarrage : une demande
// d'autorisation qui surgit sans qu'on ait rien demandé s'apprend à refuser.
//
// UNE EXCEPTION, UNE SEULE, ET ELLE EST ÉCRITE AILLEURS. Hors ligne, la porte
// d'entrée ouvre cette fenêtre d'elle-même : les deux autres portes passent par
// le serveur et ne s'ouvrent donc pas, et la demande n'est plus « sans qu'on ait
// rien demandé » — c'est le seul geste de l'écran. Rémy, après l'essai sur
// tablette : « si c'est hors ligne, il faut que la caméra se lance
// directement ». Voir `ui/portailUI.js`, qui dit pourquoi en entier.

import { showModal } from './modal.js';

let decodeurPromise = null;

/**
 * jsQR, chargé au premier scan — comme jsPDF, et pour la même raison : on ne
 * fait pas payer 250 Ko à l'élève qui ne scannera jamais.
 *
 * Il est tout de même dans le NOYAU du service worker : c'est HORS LIGNE
 * qu'on scanne, et un décodeur qu'il faudrait aller chercher sur le réseau
 * serait un décodeur absent le jour où il sert.
 */
export function chargerLeDecodeur() {
    if (typeof window !== 'undefined' && window.jsQR) return Promise.resolve(window.jsQR);
    if (!decodeurPromise) {
        decodeurPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = './vendor/jsqr/jsQR.js';
            s.onload = () => {
                if (window.jsQR) resolve(window.jsQR);
                else { decodeurPromise = null; reject(new Error('décodeur illisible')); }
            };
            s.onerror = () => { decodeurPromise = null; reject(new Error('décodeur inaccessible')); };
            document.head.appendChild(s);
        });
    }
    return decodeurPromise;
}

/**
 * CETTE TABLETTE PEUT-ELLE SCANNER ? On le demande AVANT de montrer le bouton.
 *
 * Un bouton qui ouvre une fenêtre pour y annoncer « impossible » est un bouton
 * qu'il ne fallait pas montrer. Deux conditions, et la seconde surprend :
 * `getUserMedia` n'existe PAS hors contexte sécurisé — en http simple, le
 * navigateur retire l'API, il ne refuse pas la permission.
 */
export function laCameraEstPossible() {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    if (window.isSecureContext === false) return false;
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

/**
 * SANS RÉSEAU, LE QR CODE EST LE SEUL CHEMIN — et c'est ce qui change l'écran.
 *
 * RÉMY, après l'essai sur tablette : « si c'est hors ligne, il faut que la
 * caméra se lance directement », puis « en hors ligne, ce serait cool de
 * rajouter l'icone qr code à côté de code, parcours, profil ».
 *
 * DEUX ÉCRANS POSENT LA MÊME QUESTION — la porte d'entrée, qui ouvre alors la
 * caméra d'elle-même, et la barre du bas, qui montre alors son icône. Deux
 * conditions écrites deux fois, c'est une des deux qu'on oublie de corriger.
 *
 * POURQUOI HORS LIGNE ET PAS TOUJOURS : sans réseau, aucune séance n'arrive
 * par la synchronisation, et les deux portes qui passent par le serveur ne
 * s'ouvrent pas. Le QR code n'est plus un raccourci, c'est le seul chemin. En
 * ligne, la barre ne bouge pas : le bouton qui scanne est déjà sous le
 * parcours, et une barre qui change de forme selon le réseau serait une barre
 * qu'on n'apprend jamais.
 */
export function scannerEstLeSeulChemin() {
    if (typeof navigator === 'undefined') return false;
    return laCameraEstPossible() && navigator.onLine === false;
}

/** Ce qu'on dit quand la caméra refuse — en français, et en disant quoi faire. */
function phraseDeLErreur(err) {
    const nom = (err && err.name) || '';
    if (nom === 'NotAllowedError' || nom === 'SecurityError') {
        return 'La caméra n\'a pas été autorisée. Tu peux l\'autoriser dans les '
            + 'réglages du navigateur, ou taper le code à la main.';
    }
    if (nom === 'NotFoundError' || nom === 'OverconstrainedError') {
        return 'Aucune caméra sur cet appareil. Tape le code à la main.';
    }
    if (nom === 'NotReadableError') {
        return 'La caméra est déjà utilisée par une autre application. Ferme-la, '
            + 'puis réessaie.';
    }
    return 'La caméra n\'a pas pu s\'ouvrir. Tape le code à la main.';
}

/**
 * OUVRE LA FENÊTRE DU SCANNER, et rend ce qui a été lu.
 *
 * @param {object} [o]
 * @param {(texte:string)=>boolean} [o.surCode] appelé à chaque lecture. Rend
 *   `true` si le code est bon — la fenêtre se ferme alors. Rend `false` si ce
 *   n'était pas un code d'AtoutMath : on CONTINUE de chercher, parce qu'un
 *   élève qui vise le tableau attrape parfois autre chose en chemin, et
 *   refermer la fenêtre à chaque fois le punirait de viser.
 * @param {string} [o.titre]
 * @returns {{close:Function}|null} null si l'appareil ne peut pas scanner
 */
export function ouvrirLeScanner({ surCode, titre = 'Scanner le QR code' } = {}) {
    if (!laCameraEstPossible()) return null;

    const fenetre = showModal(titre, `
        <div class="scan-wrap">
            <div class="scan-cadre">
                <video id="scan-video" class="scan-video" playsinline muted></video>
                <div class="scan-viseur" aria-hidden="true"></div>
            </div>
            <p class="scan-mot" id="scan-mot" role="status" aria-live="polite">
                Vise le QR code projeté au tableau.</p>
        </div>`, {
        width: '420px',
        onClose: () => arreter(),
        // AU-DESSUS DE LA FENÊTRE QUI L'A OUVERT, et ce n'est pas un détail de
        // goût : le scanner s'ouvre DEPUIS « J'ai un code », qui est une
        // `.modal-overlay` déclarée dans la page, donc à 100 000 par la
        // feuille de style. `showModal` pose 9 999 en ligne — et l'inline
        // l'emporte, ce qui range le scanner DERRIÈRE son appelant.
        //
        // MESURÉ, et c'est ainsi qu'on l'a vu : la caméra tournait, la vidéo
        // faisait 640 × 480, le viseur était là, le décodeur lisait — et la
        // photo montrait la fenêtre du code. Tout marchait, sauf qu'on ne
        // voyait rien. 999 999 est l'étage que la maison nomme déjà
        // `--top` : au-dessus des fenêtres déclarées.
        zIndex: 999999
    });

    const video = fenetre.element.querySelector('#scan-video');
    const mot = fenetre.element.querySelector('#scan-mot');
    const dire = (texte) => { if (mot) mot.textContent = texte; };

    const toile = document.createElement('canvas');
    const pinceau = toile.getContext('2d', { willReadFrequently: true });
    let flux = null;
    // DEUX MINUTEURS, ET C'EST UNE CORRECTION : un seul servait à la fois au
    // conseil des douze secondes et à la boucle de lecture, si bien que la
    // première image décodée écrasait le conseil et qu'il ne paraissait
    // jamais. Deux poignées, deux vies.
    let minuteurDuConseil = null;
    let minuteurDeLecture = null;
    let fini = false;

    /** LA CAMÉRA S'ÉTEINT — piste par piste, et une seule fois. */
    function arreter() {
        if (fini) return;
        fini = true;
        if (minuteurDuConseil) { clearTimeout(minuteurDuConseil); minuteurDuConseil = null; }
        if (minuteurDeLecture) { clearTimeout(minuteurDeLecture); minuteurDeLecture = null; }
        if (flux) { flux.getTracks().forEach(p => p.stop()); flux = null; }
        if (video) video.srcObject = null;
    }

    (async () => {
        let jsQR;
        try {
            jsQR = await chargerLeDecodeur();
        } catch (e) {
            dire('Le lecteur de QR code n\'a pas pu se charger. Tape le code à la main.');
            return;
        }
        if (fini) return;
        try {
            // `environment` : la caméra du DOS. `ideal` et non `exact` — un
            // ordinateur portable n'en a qu'une, et `exact` la lui refuserait
            // au lieu de prendre celle qu'il a.
            flux = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
        } catch (e) {
            dire(phraseDeLErreur(e));
            return;
        }
        if (fini) { flux.getTracks().forEach(p => p.stop()); return; }
        video.srcObject = flux;
        try { await video.play(); } catch (e) { /* certaines tablettes jouent seules */ }

        // DOUZE SECONDES SANS RIEN TROUVER, ET L'ON AIDE. Un élève qui vise
        // depuis le fond de la salle ne saura pas que c'est la distance.
        minuteurDuConseil = setTimeout(() => {
            if (!fini) dire('Rien trouvé pour l\'instant — approche-toi du tableau, '
                + 'ou tape le code à la main.');
        }, 12000);

        // DIX IMAGES PAR SECONDE SUFFISENT, et c'est une mesure d'économie :
        // décoder chaque image d'un flux à 60 Hz occuperait le processeur de
        // la tablette pour rien — le QR ne bouge pas, c'est la main qui
        // tremble.
        const PAS = 100;
        const regarder = () => {
            if (fini) return;
            if (video.readyState >= 2 && video.videoWidth) {
                // ON RÉDUIT AVANT DE DÉCODER. Une image de 1280 px coûte cher
                // à parcourir, et un QR projeté au tableau se lit largement
                // dans 640 : c'est la taille que `jsQR` est fait pour.
                const k = Math.min(1, 640 / video.videoWidth);
                toile.width = Math.round(video.videoWidth * k);
                toile.height = Math.round(video.videoHeight * k);
                pinceau.drawImage(video, 0, 0, toile.width, toile.height);
                const image = pinceau.getImageData(0, 0, toile.width, toile.height);
                const lu = jsQR(image.data, image.width, image.height,
                    { inversionAttempts: 'dontInvert' });
                if (lu && lu.data) {
                    const bon = !surCode || surCode(lu.data) !== false;
                    if (bon) { arreter(); fenetre.close(); return; }
                    // Lu, mais ce n'était pas un code d'AtoutMath.
                    dire('Ce QR code ne vient pas d\'AtoutMath. Vise celui du tableau.');
                }
            }
            minuteurDeLecture = setTimeout(regarder, PAS);
        };
        regarder();
    })();

    return { close: () => { arreter(); fenetre.close(); } };
}
