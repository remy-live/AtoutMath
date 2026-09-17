// L'ÉCRAN D'ARRIVÉE — deux portes, et c'est tout.
//
// Rémy : « quand on va sur le site, il faut un espace d'identification et une
// zone code. Pour le moment, je ne veux pas encore mettre de mode libre. »
//
// L'ADRESSE DU SERVEUR N'EST PAS DEMANDÉE, et c'est le changement qui compte
// pour un élève de sixième. La fenêtre de synchronisation en réclamait une :
// « http://… », à taper sans faute sur un clavier de tablette, dictée à voix
// haute à trente élèves. Or elle se déduit — l'application et l'API sont sur le
// même domaine, l'API vit dans `/api`. Restent DEUX champs : le code de la
// classe, et son prénom. C'est exactement ce que le professeur dicte déjà.
//
// UNE PORTE DE SERVICE POUR LE PROFESSEUR, discrète et en bas. Il n'a pas à se
// présenter à sa propre porte, mais son navigateur ne se souvient pas d'un
// chargement à l'autre qu'il est professeur : il lui faut un moyen d'entrer.
// Discrète parce qu'un élève qui la voit trop bien la pousse ; sans mystère
// parce qu'un logiciel ne doit pas avoir de passage secret.

import { joinClass, loginEleve } from '../core/sync.js';
import { applyCode } from './studentCodeUI.js';
import { modeLibre, portailNecessaire, adresseApiDeduite } from '../core/portail.js';
import { state } from '../core/state.js';

const ID = 'portail';

// L'adresse de l'API se déduit dans le noyau : le verrou du professeur en a
// besoin aussi, et un module du noyau ne doit pas importer une page.
export { adresseApiDeduite } from '../core/portail.js';

export function initPortail() {
    // LA PORTE SE REFERME TOUTE SEULE quand l'élève a de quoi travailler. Le
    // parcours peut arriver par trois chemins — le code saisi ici, la synchro
    // qui rapporte une séance donnée par le professeur, ou un rattachement fait
    // depuis la fenêtre ☁️. On écoute donc l'ÉTAT, pas les boutons : c'est la
    // seule façon de n'oublier aucun chemin, y compris ceux qu'on écrira après.
    ['studentPath_updated', 'assignments_received', 'sync_done', 'seance_distante']
        .forEach(e => document.addEventListener(e, () => majPortail()));
    majPortail();
}

/**
 * Écrire sous un champ de la porte.
 *
 * Au niveau du module, et non dans `dessiner()` : `majPortail` en a besoin
 * aussi, pour dire à l'élève que son billet a été renouvelé.
 */
function dire(id, texte, erreur = false) {
    const p = document.getElementById(id);
    if (!p) return;
    p.textContent = texte;
    p.classList.toggle('portail-etat--erreur', erreur);
}

export function majPortail() {
    // Le catalogue disparaît de la barre tant que le mode libre est éteint.
    // Une classe sur `<body>`, et le CSS suit — la même mécanique que le
    // verrou de classe, et pour la même raison : masquer bouton par bouton en
    // JavaScript, c'est un oubli au premier redessin.
    document.body.classList.toggle('sans-mode-libre', !modeLibre() && !state.isTeacherMode);

    const ilFaut = portailNecessaire();
    seSouvenir(ilFaut);
    leverLeVoile();

    if (!ilFaut) {
        fermerPortail();
        return;
    }
    if (!document.getElementById(ID)) dessiner();
    // UN BILLET PÉRIMÉ SE DIT, il ne se devine pas. Sans ce mot, l'élève dont
    // le professeur a renouvelé les billets retrouve la porte sans savoir
    // pourquoi, et croit s'être trompé de touche.
    if (billetPerime) {
        billetPerime = false;
        dire('portail-etat-login',
            'Ton billet n\'est plus valable — ton professeur l\'a sans doute renouvelé. '
            + 'Entre le nouveau : ton travail est gardé et repartira tout seul.', true);
    }
}

// Posé par `core/sync.js` quand le serveur refuse le jeton. Un drapeau, et non
// un appel direct : la porte n'est peut-être pas encore dessinée à ce
// moment-là, et `majPortail()` est justement ce qui la dessine.
let billetPerime = false;
if (typeof document !== 'undefined') {
    document.addEventListener('billet_perime', () => {
        billetPerime = true;
        direLeBilletPerime();
    });
}

/**
 * LE LIEN QUI N'EST PAS ARRIVÉ ENTIER.
 *
 * Un code de parcours voyage dans une adresse : collée dans le cahier de
 * textes, recopiée à la main, coupée en deux par une messagerie qui prend le
 * tiret pour une fin de ligne. Quand il n'arrive pas entier, l'application
 * s'ouvrait sur RIEN — pas de porte (`portailNecessaire()` voit un code dans
 * l'adresse et s'efface), pas de parcours, pas un mot.
 *
 * ON RETIRE LE CODE DE L'ADRESSE, et c'est juste en soi : un code qui ne marche
 * pas n'a rien à faire dans la barre d'adresse, où il se rejouerait à chaque
 * rechargement. Mais on ne le jette pas — on le colle dans la case où l'élève
 * aurait dû le taper. Il n'a plus qu'à comparer avec ce que son professeur a
 * écrit, et à corriger le caractère qui manque.
 *
 * @param {string} code le code tel qu'il est arrivé, abîmé
 */
export function direCodeAbime(code) {
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.toString());
    } catch (e) { /* adresse illisible : la porte suffira */ }

    majPortail();
    // Après le dessin : `majPortail` vient peut-être de fabriquer la porte, et
    // ses champs n'existaient pas une ligne plus haut.
    requestAnimationFrame(() => {
        const champ = document.getElementById('portail-code');
        if (champ) { champ.value = String(code || ''); champ.focus(); champ.select(); }
        dire('portail-etat-code',
            'Ce lien n\'est pas arrivé entier. Compare-le avec celui que ton '
            + 'professeur a donné, ou demande-lui le code.', true);
    });
}

/**
 * LE BANDEAU DU BILLET PÉRIMÉ — parce que la porte, souvent, ne reviendra pas.
 *
 * Premier jet : j'effaçais le rattachement et j'appelais `majPortail()`, en
 * comptant sur la porte pour porter le message. Mesuré : elle ne s'affiche
 * pas. `portailNecessaire()` s'éteint dès que l'élève a un parcours chargé
 * (`aUneSeance()`), ce qui est précisément le cas de celui qui travaille — donc
 * exactement celui qu'il fallait prévenir.
 *
 * ET C'EST TANT MIEUX AINSI. Lui jeter la porte au visage au milieu d'une
 * question l'aurait arraché à son travail, ce que le reste de l'application se
 * refuse à faire partout ailleurs. On l'avertit sans l'interrompre : il finit
 * son exercice, son travail est gardé, et il demandera son nouveau billet à la
 * fin de l'heure.
 */
function direLeBilletPerime() {
    const hote = document.getElementById('app-container');
    if (!hote || document.getElementById('billet-perime')) return;
    const b = document.createElement('div');
    b.id = 'billet-perime';
    b.className = 'consigne-prof consigne-prof--alerte';
    b.setAttribute('role', 'status');
    const mot = document.createElement('span');
    mot.textContent = 'Ton billet n\'est plus valable — ton professeur l\'a sans doute '
        + 'renouvelé. Tu peux continuer : ton travail est gardé et repartira dès que '
        + 'tu entreras avec le nouveau.';
    const fermer = document.createElement('button');
    fermer.type = 'button';
    fermer.className = 'consigne-fermer';
    fermer.textContent = 'J\'ai compris';
    fermer.onclick = () => b.remove();
    b.append(mot, fermer);
    hote.insertBefore(b, hote.firstChild);
}

/**
 * LE SOUVENIR DE LA DERNIÈRE RÉPONSE — la seule chose qu'on puisse lire avant
 * le premier pixel.
 *
 * `portailNecessaire()` interroge le profil et le journal, qui vivent dans
 * IndexedDB : au chargement, la réponse n'arrive qu'après deux cent cinquante
 * modules. L'écran, lui, est peint bien avant — d'où l'application visible une
 * seconde avant la porte, que Rémy voyait à chaque lancement.
 *
 * On écrit donc ici, dans localStorage — lisible synchroniquement —, ce qu'on
 * vient de décider ; le bloc en tête de `index.html` le relit au chargement
 * suivant et voile ou non en conséquence.
 *
 * IL A LE DROIT DE SE TROMPER, ET C'EST POURQUOI IL EST SÉPARÉ DE LA DÉCISION.
 * Le premier chargement après un rattachement voilera pour rien pendant une
 * seconde ; celui qui suit ne voilera plus. Un souvenir faux coûte une seconde
 * d'écran uni, jamais un accès indu : c'est `portailNecessaire()`, et lui seul,
 * qui décide de montrer la porte.
 */
function seSouvenir(ilFaut) {
    try { localStorage.setItem('atoutmath-porte', ilFaut ? 'oui' : 'non'); }
    catch (e) { /* navigation privée : on voilera par défaut, ce qui est le bon défaut */ }
}

/** On rend la page. Le voile a fait son travail : la décision est prise. */
function leverLeVoile() {
    document.documentElement.classList.remove('avant-porte');
}

export function fermerPortail() {
    const el = document.getElementById(ID);
    if (el) el.remove();
}

/**
 * LE MODE LIBRE TEL QU'IL ÉTAIT QUAND LA PORTE A ÉTÉ DESSINÉE.
 *
 * La porte se dessine AVANT que le serveur ait dit si le catalogue est ouvert —
 * c'est délibéré : attendre un aller-retour réseau pour afficher un écran
 * d'accueil ferait payer à tout le monde, y compris hors ligne, un booléen.
 * Quand la réponse arrive, il faut donc pouvoir redessiner — mais SEULEMENT si
 * elle change quelque chose : redessiner pour rien effacerait l'identifiant que
 * l'élève est en train de taper.
 */
let dessineeAvec = null;

/**
 * REDESSINER LA PORTE SI, ET SEULEMENT SI, LE MODE LIBRE A CHANGÉ.
 *
 * Appelée quand le serveur rend ses réglages (voir `core/reglagesSite.js`).
 */
export function porteASuivre() {
    if (!document.getElementById(ID)) return false;
    if (dessineeAvec === modeLibre()) return false;
    fermerPortail();
    majPortail();
    return true;
}

function dessiner() {
    dessineeAvec = modeLibre();
    const el = document.createElement('div');
    el.id = ID;
    el.className = 'portail';
    el.innerHTML = `
      <div class="portail-boite">
        <h1 class="portail-titre">AtoutMath</h1>
        <p class="portail-sous">Entre par l'une des deux portes.</p>

        <div class="portail-portes">
          <section class="portail-porte">
            <h2>Je me connecte</h2>
            <p class="portail-aide">L'identifiant et le code de ton billet.</p>
            <!-- DIRE AU TÉLÉPHONE QUEL CLAVIER OUVRIR.
                 Un champ de texte ordinaire, sur un téléphone, arrive avec la
                 majuscule automatique et la correction en marche. L'identifiant
                 « lea.durand » se tapait donc « Lea.durand », que le serveur
                 refuse ; et le code « 4KP2 », dicté en majuscules et écrit tel
                 quel au tableau, se tapait « 4kp2 ». Deux refus d'entrée pour
                 un réglage de clavier que personne, à onze ans, n'ira changer.
                 L'attribut autocapitalize dit au clavier ce qu'on attend, champ par
                 champ : rien pour un identifiant, des MAJUSCULES pour un code,
                 le prénom en majuscule initiale pour un prénom. -->
            <label>Identifiant
              <input id="portail-login" type="text" autocomplete="username" spellcheck="false"
                     autocapitalize="none" autocorrect="off"
                     maxlength="60" placeholder="lea.durand"></label>
            <label>Code <span class="portail-forme">4 signes</span>
              <input id="portail-code-eleve" type="text" autocomplete="off" spellcheck="false"
                     autocapitalize="characters" autocorrect="off" inputmode="text"
                     maxlength="12" placeholder="4KP2"></label>
            <button id="portail-connecter" class="portail-bouton">Entrer</button>
            <p class="portail-etat" id="portail-etat-login"></p>

            <!-- LA SECONDE PORTE EST REPLIÉE, ET C'EST DÉLIBÉRÉ. Les deux
                 marchent, mais elles ne se valent pas : la liste dit qui
                 travaille, le code de classe laisse chacun se déclarer. On
                 montre donc la bonne d'abord, et l'autre à qui la cherche —
                 l'élève sans billet, le remplaçant, l'essai. -->
            <details class="portail-repli">
              <summary>Je n'ai pas de billet</summary>
              <label>Code de la classe
                <input id="portail-classe" type="text" autocomplete="off" spellcheck="false"
                       autocapitalize="characters" autocorrect="off" inputmode="text"
                       maxlength="12" placeholder="ABC123"></label>
              <label>Ton prénom
                <input id="portail-prenom" type="text" autocomplete="given-name"
                       autocapitalize="words" autocorrect="off"
                       maxlength="40" placeholder="Léa"></label>
              <button id="portail-rejoindre" class="portail-bouton portail-bouton--doux">Entrer avec le code de la classe</button>
              <p class="portail-etat" id="portail-etat-classe"></p>
            </details>
          </section>

          <section class="portail-porte">
            <h2>J'ai un code de séance</h2>
            <p class="portail-aide">Le code que ton professeur vient de dicter,
               ou le lien qu'il t'a envoyé.</p>
            <label>Code de la séance <span class="portail-forme">long, avec des tirets</span>
              <!-- Le code de séance distingue les majuscules des minuscules :
                   la majuscule automatique le casserait à coup sûr. -->
              <input id="portail-code" type="text" autocomplete="off" spellcheck="false"
                     autocapitalize="none" autocorrect="off"
                     placeholder="colle le code ici"></label>
            <button id="portail-ouvrir" class="portail-bouton">Ouvrir le parcours</button>
            <p class="portail-etat" id="portail-etat-code"></p>
          </section>
        </div>

        <p class="portail-pied">
          ${modeLibre() ? '<button id="portail-libre" class="portail-lien">Explorer les exercices</button> · ' : ''}
          <button id="portail-prof" class="portail-lien">Je suis le professeur</button>
        </p>
      </div>`;
    document.body.appendChild(el);

    const val = (id) => (document.getElementById(id).value || '').trim();

    // --- Rejoindre sa classe
    const rejoindre = async () => {
        const classe = val('portail-classe');
        const prenom = val('portail-prenom');
        if (!classe || !prenom) {
            return dire('portail-etat-classe', 'Il faut le code de la classe ET ton prénom.', true);
        }
        const bouton = document.getElementById('portail-rejoindre');
        bouton.disabled = true;
        dire('portail-etat-classe', 'Connexion…');
        try {
            const { getSyncConfig } = await import('../core/sync.js');
            const data = await joinClass({
                apiUrl: adresseApiDeduite(getSyncConfig().apiUrl),
                classCode: classe,
                firstName: prenom
            });
            dire('portail-etat-classe', `Bonjour ${prenom} — classe « ${data.className} ».`);
            setTimeout(() => { fermerPortail(); allerAuParcours(); }, 700);
        } catch (err) {
            bouton.disabled = false;
            // ON DIT CE QUI S'EST PASSÉ, en français d'élève. « HTTP 404 » ne
            // veut rien dire pour lui, et c'est LUI qui doit décider s'il
            // retape son code ou s'il lève la main.
            dire('portail-etat-classe', messageClair(err), true);
        }
    };

    // --- Ouvrir un code de séance
    const ouvrir = () => {
        const code = val('portail-code');
        if (!code) return dire('portail-etat-code', 'Colle le code que ton professeur a donné.', true);
        // ON ESSAIE D'ABORD, ON CONSEILLE ENSUITE.
        //
        // Premier jet : j'écartais les codes de quatre signes AVANT d'essayer
        // de les ouvrir. Deux erreurs d'un coup. D'abord un code de séance
        // court existe — « SUD » en fait trois — et rien ne garantit qu'il n'y
        // en aura jamais de quatre : je refusais donc peut-être un vrai
        // parcours. Ensuite mon test réclamait l'alphabet du coffre, qui écarte
        // le 0 et le 1 ; or le professeur écrit le code qu'il veut dans sa
        // liste — Rémy a mis « 2024 », que mon test rejetait.
        //
        // L'ordre juste est celui-ci : le parcours d'abord, le conseil
        // seulement quand il n'y a plus rien à ouvrir.
        if (applyCode(code, { autoStart: true })) {
            fermerPortail();
            return;
        }
        // LE MIROIR DU RANGEMENT D'EN FACE. Un élève qui colle son billet ici
        // lisait « Ce code ne correspond à aucun parcours » : une phrase vraie
        // et parfaitement inutile, qui l'envoie douter de son billet alors
        // qu'il s'est trompé de case. On DÉPLACE, comme de l'autre côté :
        // c'est nous qui avons mis deux cases côte à côte.
        if (ressembleAUnBillet(code)) {
            const champBillet = document.getElementById('portail-code-eleve');
            const champSeance = document.getElementById('portail-code');
            if (champBillet) champBillet.value = code.toUpperCase();
            if (champSeance) champSeance.value = '';
            dire('portail-etat-code',
                "Ça, c'est le code de ton billet : je l'ai mis à gauche.", true);
            dire('portail-etat-login', 'Ajoute ton identifiant, puis « Entrer ».');
            document.getElementById('portail-login')?.focus();
            return;
        }
        dire('portail-etat-code', "Ce code ne correspond à aucun parcours. Vérifie-le avec ton professeur.", true);
    };

    /**
     * CE CODE EST-IL UN CODE DE SÉANCE, GLISSÉ DANS LA MAUVAISE CASE ?
     *
     * Rémy s'y est pris lui-même : il a collé « ALX-BAB-SPV-… » dans la case du
     * billet. Les deux portes demandent « un code », et rien ne disait lequel.
     * Le serveur aurait répondu « Identifiant ou code incorrect » — une phrase
     * vraie, et parfaitement inutile : elle envoie vérifier le billet alors
     * que c'est de case qu'on s'est trompé.
     *
     * LES DEUX FORMES NE SE RESSEMBLENT PAS, et c'est ce qui permet de trancher
     * sans rien demander au serveur. Un code de billet fait quatre signes pris
     * dans un alphabet sans tiret ; un code de séance est long et porte des
     * tirets. On ne devine pas : on reconnaît.
     */
    const ressembleAUneSeance = (code) => /-/.test(code) || code.length > 12;

    /**
     * ET L'INVERSE : un BILLET collé dans la case de la séance ?
     *
     * Le rangement automatique ne marchait que dans un sens. Un élève qui colle
     * son billet — « 4KP2 » — dans la case « Code de la séance » lisait « Ce
     * code ne correspond à aucun parcours. Vérifie-le avec ton professeur » :
     * une phrase vraie et parfaitement inutile, qui l'envoie douter de son
     * billet alors qu'il s'est trompé de case. Et le professeur reçoit la
     * question.
     *
     * UN BILLET SE RECONNAÎT : quatre signes, sans tiret, pris dans l'alphabet
     * du coffre — celui de `api/lib/coffre.php`, qui écarte exprès le 0, le 1,
     * le I et le O pour qu'on ne confonde pas à la dictée.
     */
    const ressembleAUnBillet = (code) => /^[A-Z0-9]{4}$/.test(String(code).toUpperCase());

    // --- Se connecter avec son billet
    const connecter = async () => {
        const login = val('portail-login');
        const code = val('portail-code-eleve');
        if (!login || !code) {
            return dire('portail-etat-login', 'Il faut ton identifiant ET ton code.', true);
        }
        if (ressembleAUneSeance(code)) {
            // On ne se contente pas de le dire : on le DÉPLACE. Rester devant
            // une case qu'on vient de nous dire fausse, c'est encore du travail
            // pour l'élève — et c'est nous qui avons mal rangé les cases.
            document.getElementById('portail-code').value = code;
            document.getElementById('portail-code-eleve').value = '';
            dire('portail-etat-login',
                "Ça, c'est un code de séance : je l'ai mis dans l'autre case, à droite.", true);
            dire('portail-etat-code', 'Clique sur « Ouvrir le parcours ».');
            document.getElementById('portail-code').focus();
            return;
        }
        const bouton = document.getElementById('portail-connecter');
        bouton.disabled = true;
        dire('portail-etat-login', 'Connexion…');
        try {
            const { getSyncConfig } = await import('../core/sync.js');
            const data = await loginEleve({
                apiUrl: adresseApiDeduite(getSyncConfig().apiUrl), login, code
            });
            dire('portail-etat-login', `Bonjour ${data.firstName || ''} — classe « ${data.className} ».`);
            setTimeout(() => { fermerPortail(); allerAuParcours(); }, 700);
        } catch (err) {
            bouton.disabled = false;
            dire('portail-etat-login', messageClair(err), true);
            // ON REMET L'ÉLÈVE EN ÉTAT DE RÉESSAYER, tout de suite.
            //
            // Le code refusé restait dans la case et le curseur repartait dans
            // la page : pour retenter, il fallait viser le champ, tout
            // sélectionner, effacer, puis retaper. Quatre gestes pour corriger
            // quatre signes, et la classe entière attend.
            //
            // ON N'EFFACE QUE LE CODE. L'identifiant est presque toujours bon —
            // c'est son prénom — et le retaper serait une punition pour une
            // faute qu'il n'a pas commise.
            const mauvaisCode = document.getElementById('portail-code-eleve');
            if (mauvaisCode) { mauvaisCode.value = ''; mauvaisCode.focus(); }
        }
    };

    document.getElementById('portail-connecter').onclick = connecter;
    el.querySelectorAll('#portail-login, #portail-code-eleve').forEach(i => {
        i.onkeydown = (e) => { if (e.key === 'Enter') connecter(); };
    });
    document.getElementById('portail-rejoindre').onclick = rejoindre;
    document.getElementById('portail-ouvrir').onclick = ouvrir;
    el.querySelectorAll('#portail-classe, #portail-prenom').forEach(i => {
        i.onkeydown = (e) => { if (e.key === 'Enter') rejoindre(); };
    });
    document.getElementById('portail-code').onkeydown = (e) => { if (e.key === 'Enter') ouvrir(); };

    const libre = document.getElementById('portail-libre');
    if (libre) libre.onclick = () => { fermerPortail(); };

    document.getElementById('portail-prof').onclick = () => {
        // ON NE FERME PAS LA PORTE AVANT DE SAVOIR SI ELLE S'OUVRE.
        //
        // Elle se fermait ici, puis la bascule se déclenchait. Depuis que le
        // mode professeur demande un mot de passe, cet ordre était un piège :
        // un élève curieux cliquait, renonçait devant la fenêtre — et se
        // retrouvait dans l'application sans la porte, donc sans aucun moyen
        // d'entrer. Mesuré dans un navigateur, le jour même du verrou.
        //
        // C'est `majPortail()`, appelée par la bascule, qui referme la porte —
        // et seulement si l'on est vraiment passé professeur.
        document.getElementById('btn-role')?.click();
    };

    document.getElementById('portail-login').focus();
}

/** Une panne de réseau, un mauvais code, un accès en pause : trois phrases. */
function messageClair(err) {
    const m = String((err && err.message) || err);
    if (/\b401\b/.test(m)) return "Identifiant ou code incorrect. Vérifie ton billet.";
    if (/\b404\b/.test(m)) return "Aucune classe avec ce code. Vérifie-le avec ton professeur.";
    if (/\b403\b/.test(m)) return "Ton professeur a mis ton accès en pause. Préviens-le.";
    if (/\b429\b/.test(m)) return 'Trop d\'essais. Attends une minute, puis recommence.';
    if (/Failed to fetch|NetworkError|réseau/i.test(m)) {
        return "Le serveur ne répond pas. Vérifie la connexion, puis recommence.";
    }
    return "Connexion impossible pour l'instant. Préviens ton professeur.";
}

function allerAuParcours() {
    const b = document.getElementById('top-btn-path') || document.getElementById('mob-btn-path');
    if (b) b.click();
}
