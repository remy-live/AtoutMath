// DEMANDER QUELQUE CHOSE, SANS `prompt()`.
//
// Rémy : « tu utilises des alert et prompt, on évite ! »
//
// Il a raison, et pas seulement pour l'allure. Les fenêtres natives du
// navigateur ont quatre défauts qu'aucun réglage ne corrige :
//
//   · ELLES NE RESSEMBLENT PAS AU LOGICIEL. Une boîte grise marquée
//     « atout-math.fr says » au milieu d'une application soignée, c'est le
//     genre de détail qui fait douter du reste ;
//   · ELLES BLOQUENT TOUT LE FIL D'EXÉCUTION. Pendant qu'elles sont ouvertes,
//     rien ne tourne — ni la synchronisation, ni le chronomètre d'un exercice,
//     ni le rafraîchissement d'une séance ;
//   · CERTAINS NAVIGATEURS LES SUPPRIMENT. Dans une iframe, ou après plusieurs
//     appels, Chrome les ignore purement et simplement : le professeur clique
//     « Nouvelle classe », rien ne se passe, et il n'y a rien à comprendre ;
//   · SUR TABLETTE, elles sortent le doigt du contexte — le clavier monte, la
//     page se décale, et l'on ne voit plus ce qu'on nommait.
//
// `demander()` rend une promesse : `null` si l'on renonce, la chaîne saisie
// sinon. Même contrat que `prompt()`, pour que le remplacement soit sans
// surprise — mais dans une fenêtre qui appartient au logiciel.

const ID = 'demander-modale';

/**
 * @param {string} titre    ce qu'on demande, en une phrase
 * @param {object} [opts]
 * @param {string} [opts.valeur]      valeur de départ, pré-sélectionnée
 * @param {string} [opts.aide]        une ligne d'explication sous le champ
 * @param {string} [opts.bouton]      libellé du bouton de validation
 * @param {string} [opts.placeholder]
 * @param {number} [opts.max]         longueur maximale
 * @returns {Promise<string|null>}
 */
export function demander(titre, opts = {}) {
    return new Promise((resoudre) => {
        document.getElementById(ID)?.remove();

        const el = document.createElement('div');
        el.id = ID;
        el.className = 'demander';
        el.innerHTML = `
          <div class="demander-boite" role="dialog" aria-modal="true" aria-labelledby="demander-titre">
            <h2 id="demander-titre"></h2>
            <input id="demander-champ" type="text" autocomplete="off" spellcheck="false">
            <p class="demander-aide" id="demander-aide"></p>
            <div class="demander-boutons">
              <button id="demander-ok" class="demander-bouton"></button>
              <button id="demander-non" class="demander-bouton demander-bouton--doux">Annuler</button>
            </div>
          </div>`;
        document.body.appendChild(el);

        // ON ÉCRIT LES TEXTES PAR `textContent`, JAMAIS DANS LE GABARIT.
        // Un nom de classe, un prénom d'élève : ce sont des textes que
        // quelqu'un a tapés. Les coller dans du HTML, c'est laisser une
        // apostrophe casser la fenêtre — et pire si le texte vient d'ailleurs.
        el.querySelector('#demander-titre').textContent = titre;
        el.querySelector('#demander-ok').textContent = opts.bouton || 'Valider';
        const aide = el.querySelector('#demander-aide');
        aide.textContent = opts.aide || '';
        aide.hidden = !opts.aide;

        const champ = el.querySelector('#demander-champ');
        champ.value = opts.valeur || '';
        if (opts.placeholder) champ.placeholder = opts.placeholder;
        if (opts.max) champ.maxLength = opts.max;

        const fermer = (v) => { el.remove(); resoudre(v); };
        const valider = () => {
            const v = champ.value.trim();
            // Une chaîne vide n'est pas une réponse : on garde la fenêtre
            // ouverte plutôt que de rendre '' et laisser l'appelant décider.
            if (!v) { champ.focus(); return; }
            fermer(v);
        };

        el.querySelector('#demander-ok').onclick = valider;
        el.querySelector('#demander-non').onclick = () => fermer(null);
        champ.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); valider(); }
            if (e.key === 'Escape') fermer(null);
        };
        // Cliquer à côté, c'est renoncer — le geste que tout le monde attend.
        el.onclick = (e) => { if (e.target === el) fermer(null); };

        champ.focus();
        champ.select();
    });
}
