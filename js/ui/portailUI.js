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

export function majPortail() {
    // Le catalogue disparaît de la barre tant que le mode libre est éteint.
    // Une classe sur `<body>`, et le CSS suit — la même mécanique que le
    // verrou de classe, et pour la même raison : masquer bouton par bouton en
    // JavaScript, c'est un oubli au premier redessin.
    document.body.classList.toggle('sans-mode-libre', !modeLibre() && !state.isTeacherMode);

    if (!portailNecessaire()) {
        fermerPortail();
        return;
    }
    if (document.getElementById(ID)) return;
    dessiner();
}

export function fermerPortail() {
    const el = document.getElementById(ID);
    if (el) el.remove();
}

function dessiner() {
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
            <label>Identifiant
              <input id="portail-login" type="text" autocomplete="username" spellcheck="false"
                     maxlength="60" placeholder="lea.durand"></label>
            <label>Code
              <input id="portail-code-eleve" type="text" autocomplete="off" spellcheck="false"
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
                       maxlength="12" placeholder="ABC123"></label>
              <label>Ton prénom
                <input id="portail-prenom" type="text" autocomplete="given-name"
                       maxlength="40" placeholder="Léa"></label>
              <button id="portail-rejoindre" class="portail-bouton portail-bouton--doux">Entrer avec le code de la classe</button>
              <p class="portail-etat" id="portail-etat-classe"></p>
            </details>
          </section>

          <section class="portail-porte">
            <h2>J'ai un code de séance</h2>
            <p class="portail-aide">Le code que ton professeur vient de dicter,
               ou le lien qu'il t'a envoyé.</p>
            <label>Code de la séance
              <input id="portail-code" type="text" autocomplete="off" spellcheck="false"
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
    const dire = (id, texte, erreur = false) => {
        const p = document.getElementById(id);
        if (!p) return;
        p.textContent = texte;
        p.classList.toggle('portail-etat--erreur', erreur);
    };

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
        if (applyCode(code, { autoStart: true })) {
            fermerPortail();
            return;
        }
        dire('portail-etat-code', "Ce code ne correspond à aucun parcours. Vérifie-le avec ton professeur.", true);
    };

    // --- Se connecter avec son billet
    const connecter = async () => {
        const login = val('portail-login');
        const code = val('portail-code-eleve');
        if (!login || !code) {
            return dire('portail-etat-login', 'Il faut ton identifiant ET ton code.', true);
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
