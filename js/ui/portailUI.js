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
import { applyCode, scannerUnCodeDeSeance } from './studentCodeUI.js';
import { laCameraEstPossible, scannerEstLeSeulChemin } from './scannerQr.js';
import { modeLibre, inscriptionLibre, portailNecessaire, aUneSeance, adresseApiDeduite } from '../core/portail.js';
import { copieDEssai } from '../core/copieDEssai.js';
import { versionLisible } from '../core/versionDuSite.js';
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

    // L'ACCUEIL S'OUVRE AUSSI PARCE QU'ON LE DEMANDE.
    //
    // RÉMY, après l'essai sur tablette : « mais on ne peut revenir à l'écran
    // d'accueil ». Et c'était vrai : `portailNecessaire()` s'éteint dès que
    // l'élève a de quoi travailler — ce qui est juste au CHARGEMENT, et faux
    // ensuite. Sur la tablette d'une classe sans réseau, cet écran est le seul
    // endroit d'où l'on scanne le QR du tableau ; ne jamais pouvoir y revenir,
    // c'est ne jamais pouvoir recevoir la séance suivante.
    //
    // ON NE TOUCHE PAS À `portailNecessaire`, et c'est délibéré : elle répond à
    // « faut-il montrer la porte à qui arrive ? », une question de démarrage.
    // Celle d'ici est une autre : « l'élève la demande-t-il ? ».
    const ilFaut = portailNecessaire() || ouvertALaDemande;
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
    // ON OUBLIE LA DEMANDE EN MÊME TEMPS QU'ON FERME, sans quoi la porte
    // reviendrait au premier `studentPath_updated` — c'est-à-dire juste après
    // le code que l'élève vient de scanner, par-dessus la séance qui s'ouvre.
    ouvertALaDemande = false;
    const el = document.getElementById(ID);
    if (el) el.remove();
}

/**
 * REVENIR À L'ÉCRAN D'ACCUEIL — celui du début, avec le gros titre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, après l'essai sur tablette : « mais on ne peut revenir à l'écran
 * d'accueil. et sur l'écran d'accueil, il faudrait qu'il y ait lecture de qr
 * code ». Les deux moitiés tiennent ensemble : hors ligne, cet écran EST
 * l'endroit où l'on scanne — la caméra s'y ouvre toute seule.
 *
 * ── CE QUE CETTE FONCTION FERME AVANT D'OUVRIR ────────────────────────────
 *
 * LA COUCHE DE JEU, s'il y en a une. Mesuré : elle est en plein écran et
 * recouvre la barre du bas — donc le bouton qui appelle cette fonction. On ne
 * peut pas l'atteindre de là aujourd'hui, mais une fonction qui laisserait un
 * parcours ouvert DERRIÈRE l'écran d'accueil serait un piège posé pour plus
 * tard. On passe par la croix de l'en-tête, qui fait déjà tout le ménage —
 * le meneur arrêté, les moteurs libérés, le journal écrit.
 *
 * ET LA CAMÉRA SE RÉARME. Revenir à l'accueil hors ligne, c'est venir scanner :
 * `cameraDejaOuverte` est remis à faux pour que `dessiner()` rouvre le
 * scanner, exactement comme au premier lancement.
 */
export function ouvrirLAccueil() {
    const couche = document.getElementById('game-layer');
    if (couche && couche.style.display && couche.style.display !== 'none') {
        document.getElementById('btn-close-game')?.click();
    }
    ouvertALaDemande = true;
    cameraDejaOuverte = false;
    majPortail();
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
    // LES DEUX RÉGLAGES DÉCIDENT DE LA FORME DU PORTAIL : le mode libre ajoute
    // une porte, l'inscription libre en retire une. Ne surveiller que le
    // premier laisserait la seconde figée dans l'état où la page a été ouverte.
    if (dessineeAvec === signatureDesPortes()) return false;
    fermerPortail();
    majPortail();
    return true;
}

/** Ce qui, dans les réglages, change la FORME du portail. */
const signatureDesPortes = () => `${modeLibre()}|${inscriptionLibre()}`;

function dessiner() {
    dessineeAvec = signatureDesPortes();
    const el = document.createElement('div');
    el.id = ID;
    el.className = 'portail';
    el.innerHTML = `
      <div class="portail-boite">
        <h1 class="portail-titre">AtoutMath</h1>
        <!-- ON NE COMPTE PLUS LES PORTES DANS LE SOUS-TITRE. Il disait « l'une
             des deux » alors qu'il y en avait trois — la troisième étant
             justement celle du professeur, en bas, en petit. Et le compte
             change selon le mode libre. Une phrase qui dépend d'un décompte
             finit toujours par mentir ; celle-ci dit ce qu'on fait ici. -->
        <p class="portail-sous">Choisis par où tu entres.</p>

        <!-- TA SÉANCE EST TOUJOURS LÀ.

             Cet écran revient maintenant sur demande (voir ouvrirLAccueil), et
             il revient donc parfois chez quelqu'un qui travaille déjà. Sans ce
             bouton, l'élève qui touche Accueil par erreur se retrouve devant
             deux portes dont aucune ne le ramène à ce qu'il faisait : il
             rescannerait le QR pour retrouver sa place, en se demandant s'il a
             tout perdu.

             EN HAUT, ET NON DANS LE PIED. Le pied est sous les deux cartes,
             c'est-à-dire hors de l'écran sur une tablette tenue à la verticale
             (mesuré : 823 px de boîte pour 844 px de vitre). Ce qui répare une
             erreur doit se voir sans défiler. -->
        ${aUneSeance() ? `<div class="portail-reprise">
          <button id="portail-reprendre" class="portail-bouton">Revenir à ma séance</button>
          <p class="portail-aide portail-aide--centre">Elle est toujours là, avec tout
             ce que tu as déjà fait.</p>
        </div>` : ''}

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
            <!-- L'EXEMPLE EST DANS L'ÉTIQUETTE, PAS DANS LE CHAMP.

                 RÉMY : « dans l'écran d'accueil ou on tape son identifiant,
                 quand on clique sur le champ qui affiche un exemple ca efface
                 le champ exemple ».

                 MESURÉ, PHOTO À L'APPUI, portail ouvert à 390 px de large :
                 lea.durand et 4KP2 s'affichaient en gras sombre, dans la
                 police du champ — le second en monospace
                 espacé, c'est-à-dire exactement la typographie d'un code
                 réellement saisi. Rien ne distinguait l'exemple d'une valeur
                 déjà tapée. L'élève voit son champ rempli, pose le doigt
                 dessus, tape — et l'exemple disparaît. De son point de vue,
                 le logiciel vient d'effacer quelque chose.

                 L'exemple remonte donc dans l'étiquette, à côté de la forme
                 du code, là où « 4 signes » vit déjà. Il y reste visible
                 PENDANT la frappe, ce qu'un indice de champ ne fait jamais —
                 et c'est précisément quand on tape qu'on a besoin de l'avoir
                 sous les yeux.

                 ON NE TOUCHE PAS AU STYLE DES INDICES EN GÉNÉRAL : leur fort
                 contraste a été posé exprès, mesuré, parce que dans les
                 fenêtres sans retour l'indice PORTE LE MOT À RECOPIER
                 (EFFACER, REFAIRE, RETIRER). Voir la règle ::placeholder
                 dans css/ui.css. (Pas d'accent grave ici : ce commentaire est
                 DANS un gabarit, et le premier qu'on y pose le ferme — l'outil
                 d'écriture l'a refusé, comme prévu.) Le défaut n'était donc
                 pas le contraste, c'était l'ENDROIT. -->
            <label>Identifiant <span class="portail-forme">par exemple lea.durand</span>
              <input id="portail-login" type="text" autocomplete="username" spellcheck="false"
                     autocapitalize="none" autocorrect="off"
                     maxlength="60"></label>
            <label>Code <span class="portail-forme">4 signes, par exemple 4KP2</span>
              <input id="portail-code-eleve" type="text" autocomplete="off" spellcheck="false"
                     autocapitalize="characters" autocorrect="off" inputmode="text"
                     maxlength="12"></label>
            <button id="portail-connecter" class="portail-bouton">Entrer</button>
            <p class="portail-etat" id="portail-etat-login"></p>

            <!-- LA SECONDE PORTE EST REPLIÉE, ET C'EST DÉLIBÉRÉ. Les deux
                 marchent, mais elles ne se valent pas : la liste dit qui
                 travaille, le code de classe laisse chacun se déclarer. On
                 montre donc la bonne d'abord, et l'autre à qui la cherche —
                 l'élève sans billet, le remplaçant, l'essai.

                 ET ELLE DISPARAÎT QUAND ELLE EST FERMÉE. Le serveur refuse
                 désormais l'inscription libre tant que le professeur ne l'a pas
                 rouverte (voir core/portail.js) ; montrer une porte qui refuse
                 serait pire que de ne pas la montrer — l'élève tape son prénom
                 trois fois avant de lever la main. (Et pas de guillemet oblique
                 dans ce commentaire : il est DANS un gabarit, et le premier
                 qu'on y pose ferme le gabarit.) -->
            ${inscriptionLibre() ? `<details class="portail-repli">
              <summary>Je n'ai pas de billet</summary>
              <!-- Mêmes deux champs, même défaut : « ABC123 » s'affichait en
                   majuscules espacées et en gras (voir la règle
                   portail-classe de css/ui.css), donc comme un code déjà
                   saisi. -->
              <label>Code de la classe <span class="portail-forme">par exemple ABC123</span>
                <input id="portail-classe" type="text" autocomplete="off" spellcheck="false"
                       autocapitalize="characters" autocorrect="off" inputmode="text"
                       maxlength="12"></label>
              <label>Ton prénom
                <input id="portail-prenom" type="text" autocomplete="given-name"
                       autocapitalize="words" autocorrect="off"
                       maxlength="40"></label>
              <button id="portail-rejoindre" class="portail-bouton portail-bouton--doux">Entrer avec le code de la classe</button>
              <p class="portail-etat" id="portail-etat-classe"></p>
            </details>` : ''}
          </section>

          <section class="portail-porte">
            <h2>J'ai un code de séance</h2>
            <p class="portail-aide">Le code que ton professeur vient de dicter,
               ou le lien qu'il t'a envoyé.</p>
            <!-- ICI L'INDICE RESTE : « colle le code ici » est une CONSIGNE,
                 pas un exemple. Personne ne la prend pour un code déjà entré,
                 et elle disparaît au bon moment — quand on colle. -->
            <label>Code de la séance <span class="portail-forme">long, avec des tirets</span>
              <!-- Le code de séance distingue les majuscules des minuscules :
                   la majuscule automatique le casserait à coup sûr. -->
              <input id="portail-code" type="text" autocomplete="off" spellcheck="false"
                     autocapitalize="none" autocorrect="off"
                     placeholder="colle le code ici"></label>
            <button id="portail-ouvrir" class="portail-bouton">Ouvrir le parcours</button>
            <!-- LE SCANNER, SUR L'ÉCRAN D'ENTRÉE.

                 RÉMY, après l'essai sur tablette : "il faut sur l'écran
                 d'ailleurs un bouton pour scanner directement le qr code, car
                 là il faut passer par le code puis le qr code c'est trop
                 long".

                 Il avait raison au geste près. Le scanner existait déjà, mais
                 seulement DANS la fenêtre du code : ouvrir cette fenêtre, puis
                 viser. Deux gestes, pour trente élèves, au début de l'heure.
                 Le QR code est pourtant le chemin le PLUS court — il n'y a
                 rien à taper, donc rien à se tromper — et c'était celui qu'on
                 avait rangé le plus loin.

                 CACHÉ PAR DÉFAUT, et montré seulement si l'appareil peut
                 vraiment scanner : hors contexte sécurisé ou sans caméra,
                 getUserMedia n'existe pas du tout, et un bouton qui ouvre une
                 fenêtre pour y annoncer "impossible" est un bouton qu'il ne
                 fallait pas montrer. (Pas d'accent grave ni de chevrons dans
                 ce commentaire : il est DANS un gabarit, et le premier accent
                 grave qu'on y pose le ferme.) -->
            <button id="portail-scanner" class="portail-bouton portail-bouton--doux" hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="4" height="4"/><rect x="13" y="13" width="4" height="4"/></svg>
                Scanner le QR code
            </button>
            <p class="portail-etat" id="portail-etat-code"></p>
          </section>
        </div>

        <!-- LA PORTE DU PROFESSEUR EST UNE PORTE, PAS UNE MENTION LÉGALE.
             Rémy, devant la copie d'essai : « mais comment j'entre sur github
             en tant que prof ? » Mesuré : un lien souligné gris de 26 px de
             haut sur ordinateur, sous les deux cartes — sous le seuil des
             44 px qu'on tient partout ailleurs, et de la couleur qu'on réserve
             aux textes secondaires. Il se lisait comme une note de bas de page.
             Il reste DISCRET — c'est l'écran des élèves, et ils sont trente
             pour un professeur — mais discret n'est pas illisible. -->
        <p class="portail-pied">
          ${modeLibre() ? '<button id="portail-libre" class="portail-lien portail-lien--porte">'
            + 'Explorer les exercices</button>' : ''}
          ${copieDEssai() ? '<button id="portail-eleve-essai" class="portail-lien portail-lien--porte">'
            + 'Entrer comme élève</button>' : ''}
          <button id="portail-prof" class="portail-lien portail-lien--porte">Je suis le professeur</button>
        </p>
        <!-- QUELLE COPIE REGARDE-T-ON ? La question a coûté deux échanges :
             Rémy voyait un écran, je décrivais un bouton, et le bouton n'y
             était pas — son navigateur lui servait une version d'avant. Le
             numéro était déjà lisible dans la zone professeur ; il ne l'était
             pas ICI, c'est-à-dire sur le premier écran, celui qu'on a sous les
             yeux quand on se demande si la mise à jour est arrivée. -->
        <p class="portail-version">${versionLisible()}${copieDEssai() ? ' · copie d\'essai' : ''}</p>
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

    // --- Scanner le QR code, depuis l'écran d'entrée
    //
    // RÉMY, après l'essai sur tablette : « il faut sur l'écran d'ailleurs un
    // bouton pour scanner directement le qr code, car là il faut passer par le
    // code puis le qr code c'est trop long ».
    //
    // UN SEUL ENDROIT SAIT OUVRIR UN CODE SCANNÉ : `scannerUnCodeDeSeance`
    // (ui/studentCodeUI.js), qui dit pourquoi en entier. Ce que la porte
    // d'entrée ajoute, c'est ce qu'elle fait de la réponse — et elle a de quoi
    // le dire, puisqu'elle a une case et une ligne sous la case.
    //
    // LE CODE RESTE VISIBLE DANS LA CASE quand il n'ouvre rien : l'élève a sous
    // les yeux ce que la caméra a lu, et peut le comparer au tableau.
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

    const scanner = () => scannerUnCodeDeSeance({
        surCodeOuvert: () => fermerPortail(),
        surEchec: (code) => {
            const champ = document.getElementById('portail-code');
            if (champ) champ.value = code;
            dire('portail-etat-code', 'Ce QR code vient bien d\'AtoutMath, mais son '
                + 'parcours ne s\'ouvre pas. Montre-le à ton professeur.', true);
        }
    });

    document.getElementById('portail-connecter').onclick = connecter;
    el.querySelectorAll('#portail-login, #portail-code-eleve').forEach(i => {
        i.onkeydown = (e) => { if (e.key === 'Enter') connecter(); };
    });
    // LA PORTE PEUT NE PAS ÊTRE LÀ : l'inscription libre est fermée par défaut,
    // et brancher un bouton absent arrête tout le reste du branchement.
    const btnRejoindre = document.getElementById('portail-rejoindre');
    if (btnRejoindre) btnRejoindre.onclick = rejoindre;
    document.getElementById('portail-ouvrir').onclick = ouvrir;
    el.querySelectorAll('#portail-classe, #portail-prenom').forEach(i => {
        i.onkeydown = (e) => { if (e.key === 'Enter') rejoindre(); };
    });
    document.getElementById('portail-code').onkeydown = (e) => { if (e.key === 'Enter') ouvrir(); };

    // LE BOUTON NE PARAÎT QUE S'IL PEUT SERVIR (voir `laCameraEstPossible`).
    const btnScan = document.getElementById('portail-scanner');
    if (btnScan && laCameraEstPossible()) {
        btnScan.hidden = false;
        btnScan.onclick = scanner;
    }

    // REVENIR À SA SÉANCE : on referme, et rien d'autre. L'application est
    // restée dessous, intacte.
    const reprendre = document.getElementById('portail-reprendre');
    if (reprendre) reprendre.onclick = () => fermerPortail();

    const libre = document.getElementById('portail-libre');
    if (libre) libre.onclick = () => { fermerPortail(); };

    // L'ÉLÈVE D'ESSAI, SUR LA COPIE SANS SERVEUR SEULEMENT.
    //
    // Rémy : « je n'ai rien de générique id password, mode élève/prof pour
    // github, le but étant de tester ». Les deux portes ci-dessus demandent
    // toutes deux le serveur ; sur une copie qui n'en a pas, aucune ne s'ouvre,
    // et la moitié du logiciel restait inaccessible sur la copie faite pour
    // l'essayer. Voir `entrerCommeEleveDEssai`, qui dit pourquoi on n'invente
    // pas d'identifiant générique.
    const eleveEssai = document.getElementById('portail-eleve-essai');
    if (eleveEssai) eleveEssai.onclick = async () => {
        eleveEssai.disabled = true;
        try {
            const { entrerCommeEleveDEssai } = await import('../core/copieDEssai.js');
            await entrerCommeEleveDEssai();
            fermerPortail();
            // L'application se redessine autour de qui travaille : le nom dans
            // la barre haute, l'accueil de l'élève, son parcours. Un simple
            // `fermerPortail` laisserait l'écran du visiteur anonyme.
            window.location.reload();
        } catch (e) {
            eleveEssai.disabled = false;
        }
    };

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

    // LE CURSEUR NE VA PAS DANS LE CHAMP QUAND LA CAMÉRA S'OUVRE.
    //
    // Poser le foyer sur « Identifiant » fait monter le clavier de la tablette.
    // En temps normal c'est ce qu'il faut — c'est la première chose à remplir.
    // Mais hors ligne, la ligne suivante ouvre le scanner : on aurait le
    // clavier par-dessus la caméra, sur un écran où il n'y a rien à taper.
    if (!scannerEstLeSeulChemin()) document.getElementById('portail-login').focus();

    // HORS LIGNE, LA CAMÉRA S'OUVRE D'ELLE-MÊME.
    //
    // RÉMY, après l'essai sur tablette : « si c'est hors ligne, il faut que la
    // caméra se lance directement ».
    //
    // ── ET CELA CONTREDIT UNE RÈGLE DE LA MAISON, QUI TIENT AILLEURS ──────
    //
    // `ui/scannerQr.js` dit : « ON NE DEMANDE LA CAMÉRA QU'AU CLIC. Jamais au
    // démarrage : une demande d'autorisation qui surgit sans qu'on ait rien
    // demandé s'apprend à refuser. » La règle est juste, et elle suppose
    // quelque chose qui n'est plus vrai ici : qu'il y ait AUTRE CHOSE à faire
    // sur cet écran.
    //
    // HORS LIGNE, IL N'Y EN A PAS. Les deux portes de gauche — le billet, le
    // code de classe — passent toutes deux par le serveur : sans réseau, elles
    // ne s'ouvrent pas. Reste le code de séance, qu'aucun élève ne tape à la
    // main quand un QR code est projeté au tableau. La demande n'est donc pas
    // « sans qu'on ait rien demandé » : c'est le seul geste de l'écran, et
    // l'élève vient de lancer l'application pour le faire.
    //
    // EN LIGNE, LA RÈGLE TIENT TOUJOURS : le bouton attend le clic.
    //
    // UNE SEULE FOIS PAR CHARGEMENT. L'élève qui referme la fenêtre a dit non
    // ; la rouvrir serait la seule chose qu'on ne doit jamais faire à un refus.
    // Le bouton reste là, et la phrase sous la case dit quoi faire.
    if (!cameraDejaOuverte && scannerEstLeSeulChemin()) {
        cameraDejaOuverte = true;
        dire('portail-etat-code', 'Pas de connexion : scanne le QR code de ton '
            + 'professeur, ou tape le code de la séance.');
        scanner();
    }
}

/**
 * LA CAMÉRA NE S'EST OUVERTE TOUTE SEULE QU'UNE FOIS.
 *
 * Au niveau du module, et non dans `dessiner()` : la porte se REDESSINE quand
 * les réglages du serveur arrivent (`porteASuivre`), et un drapeau local
 * repartirait à zéro — la caméra se rouvrirait sur un élève qui venait de la
 * refermer.
 */
let cameraDejaOuverte = false;

/**
 * L'ÉCRAN D'ACCUEIL A-T-IL ÉTÉ DEMANDÉ ?
 *
 * Au niveau du module, pour la même raison que le drapeau du dessus : la porte
 * se redessine (`porteASuivre`), et une variable locale repartirait à zéro.
 */
let ouvertALaDemande = false;

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
