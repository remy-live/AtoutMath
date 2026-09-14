// LA PORTE DU PROFESSEUR — une fenêtre, deux champs.
//
// Rémy : « l'accès prof n'est pas protégé, je ne sais pas où m'identifier ».
//
// Les deux moitiés de sa phrase demandent deux choses différentes, et il faut
// les deux : protéger la bascule, ET dire où l'on s'identifie. Une porte
// fermée sans écriteau ne vaut guère mieux qu'une porte ouverte — on tourne la
// poignée, il ne se passe rien, et l'on croit que le logiciel est en panne.
//
// C'EST LE MÊME COMPTE QUE `api/admin/`, celui choisi à l'installation. Un
// professeur n'a pas à retenir deux mots de passe pour le même logiciel, et il
// n'y a rien à créer ici : la fenêtre le rappelle en toutes lettres, avec le
// lien vers l'administration pour ceux qui cherchent les classes, les listes
// et les billets.

import { identifierProf } from '../core/verrouProf.js';

const ID = 'verrou-prof';

/**
 * Demande le mot de passe. Rend `true` si le professeur s'est identifié.
 * @returns {Promise<boolean>}
 */
export function demanderProf() {
    return new Promise((resoudre) => {
        document.getElementById(ID)?.remove();

        const el = document.createElement('div');
        el.id = ID;
        el.className = 'verrou-prof';
        el.innerHTML = `
          <div class="verrou-boite" role="dialog" aria-modal="true" aria-labelledby="verrou-titre">
            <h2 id="verrou-titre">Espace professeur</h2>
            <p class="verrou-sous">L'adresse et le mot de passe choisis à l'installation —
               les mêmes que pour l'administration.</p>
            <label for="verrou-email">Adresse électronique</label>
            <input id="verrou-email" type="email" autocomplete="username"
                   spellcheck="false" placeholder="prof@college.fr">
            <label for="verrou-mdp">Mot de passe</label>
            <input id="verrou-mdp" type="password" autocomplete="current-password">
            <p class="verrou-etat" id="verrou-etat"></p>
            <div class="verrou-boutons">
              <button id="verrou-ok" class="verrou-bouton">Entrer</button>
              <button id="verrou-annuler" class="verrou-bouton verrou-bouton--doux">Annuler</button>
            </div>
            <p class="verrou-pied">
              Les classes, les listes d'élèves et les billets sont dans
              <a href="api/admin/index.php" target="_blank" rel="noopener">l'administration</a>.
            </p>
          </div>`;
        document.body.appendChild(el);

        const fermer = (ok) => { el.remove(); resoudre(ok); };
        const dire = (texte, erreur = true) => {
            const p = el.querySelector('#verrou-etat');
            p.textContent = texte;
            p.classList.toggle('verrou-etat--erreur', erreur);
        };

        const entrer = async () => {
            const email = el.querySelector('#verrou-email').value.trim();
            const mdp = el.querySelector('#verrou-mdp').value;
            if (!email || !mdp) return dire('Il faut l\'adresse ET le mot de passe.');
            const bouton = el.querySelector('#verrou-ok');
            bouton.disabled = true;
            dire('Vérification…', false);
            try {
                const nom = await identifierProf(email, mdp);
                dire(`Bonjour ${nom}.`, false);
                setTimeout(() => fermer(true), 500);
            } catch (err) {
                bouton.disabled = false;
                dire(String(err.message || err));
            }
        };

        el.querySelector('#verrou-ok').onclick = entrer;
        el.querySelector('#verrou-annuler').onclick = () => fermer(false);
        el.querySelectorAll('#verrou-email, #verrou-mdp').forEach(i => {
            i.onkeydown = (e) => {
                if (e.key === 'Enter') entrer();
                if (e.key === 'Escape') fermer(false);
            };
        });
        // LE CLIC SUR LE FOND FERME, et c'est sans danger ici : refermer la
        // porte laisse l'élève exactement où il était. Ce n'est pas le cas de
        // la fenêtre « mot du professeur », qui doit être lue — d'où le
        // traitement inverse là-bas.
        el.onclick = (e) => { if (e.target === el) fermer(false); };
        el.querySelector('#verrou-email').focus();
    });
}
