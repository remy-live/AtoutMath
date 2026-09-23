export function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Le placement est entièrement dans la feuille de style : centré et
        // au-dessus de la barre du bas sur téléphone, en bas à droite ailleurs.
        document.body.appendChild(container);
    }
    container.style.display = 'flex';

    const toast = document.createElement('div');
    const isError = type === 'error';
    // UN TROISIÈME TON, PARCE QU'IL Y A UN TROISIÈME PROPOS. Vert avec une
    // coche veut dire « c'est fait » ; rouge veut dire « ça a échoué ». Un avis
    // qui dit seulement « voici où tu es » n'est ni l'un ni l'autre, et le
    // dire en vert avec une coche, c'est le faire lire comme une réussite.
    const isInfo = type === 'info';
    // LE FOND D'UN AVIS PORTE DU BLANC, donc il prend le jeton « fond » (voir
    // `css/base.css`). MESURÉ avant : vert 2,54:1 et rouge 3,76:1, pour un
    // seuil à 4,5. Après : 5,48 et 6,29. L'indigo de `--primary`, lui,
    // passait déjà à 6,29 — on n'y touche pas.
    const bg = isError ? 'var(--danger-fond)'
        : (isInfo ? 'var(--primary)' : 'var(--success-fond)');
    
    const iconSuccess = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    const iconError = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    
    const iconInfo = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    const icon = isError ? iconError : (isInfo ? iconInfo : iconSuccess);
    
    // LE MESSAGE EST DU TEXTE, ET CETTE LIGNE ÉTAIT UNE FAILLE.
    //
    // Elle collait `${message}` dans `innerHTML`. Or un avis dit souvent le
    // prénom d'un élève ou le nom d'un exercice — c'est-à-dire une chaîne que
    // l'ÉLÈVE a écrite. « X pourra passer « Y ». » : si X vaut
    // `<img src=x onerror=…>`, le code de l'élève s'exécute dans la page du
    // PROFESSEUR, qui garde son jeton dans `localStorage`. L'élève devient
    // alors professeur sur tout le serveur : il lit les prénoms et le travail
    // de toutes les classes, et le jeton volé ne s'périme jamais.
    //
    // ET L'ÉCHAPPEMENT EN AMONT NE PROTÉGEAIT PAS, ce qui est le piège :
    // `espaceClasses.js` écrit bien `data-prenom="${esc(e.prenom)}"`, mais le
    // navigateur DÉCODE les entités en relisant l'attribut. `dataset.prenom`
    // rend la charge intacte, et elle repart dans `innerHTML`. Mesuré :
    // l'attribut écrit et la valeur relue sont identiques, et le code s'exécute.
    //
    // On ne rafistole donc pas les appelants — il y en a cent sept, et il
    // suffirait d'en oublier un. On ferme le puits : le pictogramme est du
    // HTML parce que c'est NOUS qui l'écrivons, le message est du texte parce
    // que c'est quelqu'un d'autre.
    const boite = document.createElement('div');
    boite.style.cssText = 'display:flex; align-items:center; gap:10px;';
    const pictogramme = document.createElement('span');
    pictogramme.style.cssText = 'flex:0 0 auto; line-height:0;';
    pictogramme.innerHTML = icon;
    const texte = document.createElement('span');
    texte.style.cssText = 'font-weight:600; min-width:0;';
    texte.textContent = message;
    boite.append(pictogramme, texte);
    toast.replaceChildren(boite);
    toast.style = `background: ${bg}; color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); min-width: min(200px, 100%);`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
    // ON REND LE MESSAGE — l'appelant peut vouloir le retirer plus tôt, ou
    // l'interroger.
    //
    // IL SERVAIT À Y BRANCHER UN BOUTON, et ce n'est plus le cas. Rémy, sur
    // l'avis qui proposait de régler l'exercice qu'on venait d'ajouter : « le
    // régler ne fonctionne pas, mais ne le mets pas. On règle en cliquant. »
    // Un avis dure six secondes ; ce qu'il propose doit donc être ce qu'on
    // fait en le lisant, pas un geste qu'on aura peut-être envie de faire.
    return toast;
}

export function showModal(title, contentHTML, options = {}) {
    const overlay = document.createElement('div');
    // LA MÊME CLASSE QUE LES AUTRES FENÊTRES, et ce n'est pas cosmétique.
    //
    // Ce voile-ci n'en portait AUCUNE — il ne vivait que par ses styles en
    // ligne. `ui/fenetre.js`, qui donne à chaque fenêtre son rôle, sa sortie
    // par Échap, son piège au clavier et le retour du focus, cherche
    // `.modal-overlay` : les neuf fenêtres déclarées dans la page étaient donc
    // prises en charge, et toutes celles fabriquées ici ne l'étaient pas.
    // Deux mécaniques pour la même chose, c'est une des deux qu'on oublie.
    //
    // Les styles en ligne posés juste en dessous l'emportent sur ceux de la
    // classe — c'est la règle de la cascade —, l'allure ne change donc pas.
    overlay.className = 'modal-overlay';
    // AU-DESSUS DE QUOI ? 9999 SUFFISAIT TANT QU'ON RESTAIT DANS LA PAGE.
    //
    // La couche de jeu (`#game-layer`) est à 10000 : une fenêtre ouverte DEPUIS
    // un exercice se rangeait donc DERRIÈRE lui. Mesuré sur l'organigramme —
    // le contre-exemple était bien dans le document, avec son texte et son
    // dessin, et personne ne pouvait le voir. Un appelant qui sait qu'il est
    // dans la couche de jeu passe donc son étage.
    const etage = options.zIndex || 9999;
    overlay.style = `position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:${etage}; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(4px); animation: fadeIn 0.2s ease;`;
    
    const width = options.width || '500px';
    
    const modal = document.createElement('div');
    modal.style = `background: var(--bg-panel); border: 1px solid var(--border); border-radius: 16px; width: 90%; max-width: ${width}; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden;`;
    
    let headerHTML = '';
    if (title) {
        headerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-app);">
                <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-main);">${title}</h3>
                <button class="modal-close-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
            </div>
        `;
    }
    
    modal.innerHTML = `
        ${headerHTML}
        <div style="padding: 20px; overflow-y: auto; flex-grow: 1;">
            ${contentHTML}
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const closeBtn = modal.querySelector('.modal-close-btn');
    const close = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = '0.2s ease';
        setTimeout(() => overlay.remove(), 200);
        if (options.onClose) options.onClose();
    };
    
    if (closeBtn) closeBtn.onclick = close;
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };
    
    return {
        close,
        element: modal
    };
}

export function showAlert(message) {
    const contentHTML = `
        <div style="text-align:center; padding:10px 0;">
            <p style="font-size:1.1rem; color:var(--text-main); margin-bottom:20px;">${message}</p>
            <button class="alert-ok-btn" style="background:var(--primary); color:white; border:none; padding:10px 20px; border-radius:8px; font-size:1rem; cursor:pointer; font-family:inherit;">OK</button>
        </div>
    `;
    const modal = showModal('Attention', contentHTML, { width: '400px' });
    
    const okBtn = modal.element.querySelector('.alert-ok-btn');
    if (okBtn) {
        okBtn.onclick = () => modal.close();
    }
}

/**
 * DEMANDER CONFIRMATION — en disant CE QU'ON VA FAIRE.
 *
 * Neuf fenêtres de confirmation, neuf fois le titre « Confirmation » et neuf
 * fois le bouton rouge « Confirmer ». Supprimer une classe, retirer un élève,
 * effacer un profil, verser vingt exercices dans un parcours : le même écran,
 * mot pour mot. On lit le message, on clique « Confirmer », et si l'on s'est
 * trompé de fenêtre rien ne l'a dit.
 *
 * UN BOUTON DOIT DIRE CE QUI VA SE PASSER. C'est la seule chose qu'on relit
 * vraiment avant de cliquer — le reste, on l'a survolé. « Supprimer la classe »
 * et « Retirer Léa » ne se confondent pas ; « Confirmer » et « Confirmer », si.
 *
 * L'appelant donne donc le verbe une fois, et il sert aux deux : au titre et
 * au bouton. Deux endroits à remplir, c'est un des deux qu'on oublie.
 *
 * @param {string} message      ce qu'on s'apprête à faire, en une phrase
 * @param {Function} onConfirm
 * @param {object} [opts]
 * @param {string} [opts.bouton] le verbe, à l'infinitif : « Supprimer la classe »
 * @param {string} [opts.titre]  à défaut, c'est le verbe qui titre
 * @param {boolean} [opts.doux]  vrai si le geste n'est pas destructeur
 */
export function showConfirm(message, onConfirm, opts = {}) {
    const verbe = opts.bouton || 'Confirmer';
    const couleur = opts.doux ? 'var(--primary)' : 'var(--danger)';
    const contentHTML = `
        <div style="text-align:center; padding:10px 0;">
            <p style="font-size:1.1rem; color:var(--text-main); margin-bottom:20px;">${message}</p>
            <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
                <button class="confirm-cancel-btn" style="background:var(--bg-app); color:var(--text-main); border:1px solid var(--border); padding:10px 20px; border-radius:8px; font-size:1rem; cursor:pointer; font-family:inherit; min-height:44px;">Annuler</button>
                <button class="confirm-ok-btn" style="background:${couleur}; color:white; border:none; padding:10px 20px; border-radius:8px; font-size:1rem; cursor:pointer; font-family:inherit; min-height:44px;">${verbe}</button>
            </div>
        </div>
    `;
    const modal = showModal(opts.titre || verbe, contentHTML, { width: '400px' });
    
    const cancelBtn = modal.element.querySelector('.confirm-cancel-btn');
    const okBtn = modal.element.querySelector('.confirm-ok-btn');
    
    if (cancelBtn) cancelBtn.onclick = () => modal.close();
    if (okBtn) {
        okBtn.onclick = () => {
            modal.close();
            if (onConfirm) onConfirm();
        };
    }
}
