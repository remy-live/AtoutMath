// FAIRE DES FENÊTRES DE CE QUI N'EN ÉTAIT PAS.
//
// Rémy : « Je veux vraiment qu'on ait un logiciel le plus user friendly
// possible pour la partie élève et prof. »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUI MANQUAIT AUX HUIT FENÊTRES DU LOGICIEL. Elles s'affichent en posant
// `style.display = 'flex'` sur un voile, et c'est tout. Il leur manquait donc
// les quatre choses qui font qu'une fenêtre est une fenêtre :
//
//   · AUCUN RÔLE. Un lecteur d'écran annonçait « groupe » et lisait la page
//     entière derrière, sans jamais dire qu'une fenêtre s'était ouverte.
//   · ÉCHAP NE FERMAIT RIEN. C'est le premier geste de quelqu'un qui s'est
//     trompé de bouton, et il ne se passait rien.
//   · LE CLAVIER SORTAIT DE LA FENÊTRE. Tab continuait tranquillement dans la
//     page du dessous : on remplissait un formulaire qu'on ne voyait plus.
//   · LE FOCUS NE REVENAIT JAMAIS. Fermée, la fenêtre laissait le clavier au
//     début du document — retour à zéro, à chaque fois.
//
// ON NE TOUCHE À AUCUN APPELANT, ET C'EST VOULU. Les huit fenêtres s'ouvrent
// depuis sept fichiers différents, par des chemins qui n'ont rien en commun.
// Réécrire sept ouvertures, c'est sept occasions d'en oublier une — et la
// neuvième fenêtre, ajoutée demain, serait muette à nouveau. On observe donc
// l'état du voile : toute fenêtre présente ou future est prise en charge du
// seul fait d'exister.
//
// ÉCHAP CLIQUE LE VRAI BOUTON, il ne cache pas le voile. Chaque fenêtre a son
// fermoir — « Annuler », une croix — qui fait aussi le ménage que la fermeture
// suppose : vider un champ, annuler un aperçu, rendre la main à un appelant.
// Masquer le voile par-dessus laisserait tout ce ménage en plan.

const VOILE = '.modal-overlay';

/** Ce qui peut prendre le clavier, dans l'ordre où Tab les visite. */
const FOCUSABLES = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

/** D'où l'on venait, fenêtre par fenêtre : on y retourne en fermant. */
const dOuOnVenait = new WeakMap();

const visible = (el) => !!el && el.style.display !== 'none'
    && getComputedStyle(el).display !== 'none';

function attrapables(voile) {
    return [...voile.querySelectorAll(FOCUSABLES)]
        .filter(e => e.offsetParent !== null || e === document.activeElement);
}

/**
 * LE FERMOIR DE CETTE FENÊTRE-CI.
 *
 * Dans l'ordre : la croix, puis « Annuler ». On préfère la croix parce qu'elle
 * ne fait que fermer ; « Annuler » peut, selon la fenêtre, défaire quelque
 * chose — ce qui est le bon sens d'Échap, mais en second choix.
 */
function fermoirDe(voile) {
    return voile.querySelector('.modal-close-btn')
        || [...voile.querySelectorAll('button')].find(b =>
            /annuler|fermer|cancel/i.test(b.textContent || '')
            || /fermer|cancel/i.test(b.getAttribute('aria-label') || ''))
        || null;
}

/**
 * Ferme la fenêtre comme l'utilisateur l'aurait fait — ET VÉRIFIE.
 *
 * On clique le vrai fermoir, parce que lui seul fait le ménage que la
 * fermeture suppose : vider un champ, annuler un aperçu, rendre la main à
 * l'appelant qui attend une réponse.
 *
 * MAIS ON REGARDE SI ÇA A MARCHÉ, et c'est la mesure qui l'a imposé. Trois
 * fenêtres sur neuf ne se fermaient pas : leurs boutons ne reçoivent leur
 * gestionnaire qu'au moment où l'ouvreur les branche, et une fenêtre affichée
 * autrement — ce qui arrive : un ouvreur qui échoue à mi-chemin, un état
 * restauré — piégeait le clavier sans aucune sortie. Échap doit TOUJOURS
 * fermer ; c'est le seul geste sur lequel on ne discute pas.
 *
 * Le compromis assumé : si un jour une fenêtre veut rester ouverte malgré
 * « Annuler », ce filet la fermera quand même. Échap veut dire « j'abandonne » ;
 * une fenêtre qui refuse d'entendre ça est un piège, pas une précaution.
 */
export function fermerLaFenetre(voile) {
    const bouton = fermoirDe(voile);
    if (bouton) {
        bouton.click();
        setTimeout(() => { if (visible(voile)) voile.style.display = 'none'; }, 60);
        return true;
    }
    voile.style.display = 'none';
    return false;
}

/** Pose le rôle et l'étiquette. Une seule fois par fenêtre. */
function declarer(voile) {
    if (voile.dataset.fenetre) return;
    voile.dataset.fenetre = '1';
    const boite = voile.firstElementChild || voile;
    boite.setAttribute('role', 'dialog');
    boite.setAttribute('aria-modal', 'true');

    // L'ÉTIQUETTE EST LE TITRE QU'ON VOIT. Répéter le titre dans un
    // `aria-label` ferait deux vérités à tenir d'accord ; on montre celle qui
    // est déjà à l'écran.
    const titre = boite.querySelector('.modal-title, .modal-title-bordered, h2, h3');
    if (titre) {
        if (!titre.id) titre.id = `${voile.id || 'fenetre'}-titre`;
        boite.setAttribute('aria-labelledby', titre.id);
    } else if (voile.id) {
        boite.setAttribute('aria-label', voile.id.replace(/-/g, ' '));
    }

    voile.addEventListener('keydown', (e) => {
        if (!visible(voile)) return;
        if (e.key === 'Escape') { e.preventDefault(); fermerLaFenetre(voile); return; }
        if (e.key !== 'Tab') return;
        // LE PIÈGE AU CLAVIER. Sans lui, Tab quitte la fenêtre par le bas et
        // continue dans la page masquée derrière.
        const liste = attrapables(voile);
        if (!liste.length) { e.preventDefault(); return; }
        const premier = liste[0], dernier = liste[liste.length - 1];
        if (e.shiftKey && document.activeElement === premier) {
            e.preventDefault(); dernier.focus();
        } else if (!e.shiftKey && document.activeElement === dernier) {
            e.preventDefault(); premier.focus();
        }
    });
}

function ouverte(voile) {
    dOuOnVenait.set(voile, document.activeElement);
    // ON DONNE LE CLAVIER À L'INTÉRIEUR. Le premier champ s'il y en a un —
    // c'est ce qu'on vient y faire —, sinon le premier bouton.
    const champ = voile.querySelector('input:not([type="hidden"]):not([disabled]), textarea');
    const cible = (champ && champ.offsetParent !== null) ? champ : attrapables(voile)[0];
    if (cible) {
        // Après le dessin : une fenêtre qu'on vient d'afficher n'a pas encore
        // de disposition, et `focus()` sur un élément de hauteur nulle ne fait
        // rien du tout.
        requestAnimationFrame(() => { try { cible.focus(); } catch (e) { /* démonté */ } });
    }
}

function refermee(voile) {
    const dAvant = dOuOnVenait.get(voile);
    dOuOnVenait.delete(voile);
    // ON REND LE CLAVIER À CELUI QUI L'AVAIT. Sans cela, il repart au début du
    // document : le professeur qui ferme « Réglages » devait retraverser toute
    // la barre du haut pour revenir à son étape.
    if (dAvant && document.contains(dAvant)) {
        try { dAvant.focus(); } catch (e) { /* parti avec la fenêtre */ }
    }
}

/**
 * BRANCHER TOUTES LES FENÊTRES, présentes et à venir.
 *
 * Appelé une fois au démarrage. L'observateur surveille `style`, `class` et
 * `hidden` — les trois façons dont ce logiciel montre et cache une fenêtre —
 * et le second observateur guette celles qu'on ajouterait au corps de la page
 * plus tard.
 */
export function initFenetres() {
    if (document.body.dataset.fenetresBranchees) return;
    document.body.dataset.fenetresBranchees = '1';

    const etats = new WeakMap();
    const suivre = (voile) => {
        declarer(voile);
        etats.set(voile, visible(voile));
        if (visible(voile)) ouverte(voile);
    };

    const oeil = new MutationObserver((mutations) => {
        for (const m of mutations) {
            const voile = m.target;
            if (!voile.matches || !voile.matches(VOILE)) continue;
            const avant = etats.get(voile) === true;
            const apres = visible(voile);
            if (avant === apres) continue;
            etats.set(voile, apres);
            if (apres) ouverte(voile); else refermee(voile);
        }
    });

    const brancher = (voile) => {
        suivre(voile);
        oeil.observe(voile, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    };
    document.querySelectorAll(VOILE).forEach(brancher);

    // Les fenêtres fabriquées après coup — il y en a — doivent l'être aussi.
    new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                if (n.matches && n.matches(VOILE)) brancher(n);
                if (n.querySelectorAll) n.querySelectorAll(VOILE).forEach(brancher);
            });
        }
    }).observe(document.body, { childList: true, subtree: true });
}
