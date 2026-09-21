// LE CHAMP DE RECHERCHE, ET SES SUGGESTIONS.
//
// Deux choses se passent quand on tape : le catalogue se resserre derrière
// (comme avant), ET une courte liste s'ouvre sous le champ. Cette liste n'est
// pas un doublon du catalogue filtré — elle est CLASSÉE et bornée à huit
// lignes, et un appui dessus ouvre l'exercice directement. C'est la
// différence entre « voir moins d'exercices » et « trouver celui qu'on
// cherche ».
//
// Le classement, la recherche sans accents et le surlignage vivent dans
// core/recherche.js, testés sans navigateur. Ici, on branche : frappe,
// clavier, appui, fermeture.

import { state } from '../core/state.js';
import { exercices, estADeux, seJoueAussiADeux, filterByStatus } from '../data/catalog.js';
import { isGame } from '../core/gameAccess.js';
import { chercher, decouper, preparer } from '../core/recherche.js';
import { openGameLayer } from '../games/engine.js';

const ICONES = {
    jeu: '🎮',
    duo: '👥'
};

const cache = new WeakMap();

/**
 * La fiche de recherche d'un exercice, normalisée UNE fois.
 *
 * « jeu » et « à deux » ne sont écrits nulle part dans les données : ils se
 * déduisent de l'activité. Ce sont pourtant deux des mots qu'on tape le plus —
 * « un jeu pour finir l'heure », « quelque chose à deux ». On les ajoute donc
 * en mots-clés.
 *
 * Exporté parce que le catalogue filtre avec la MÊME fiche : sans ça, la liste
 * de suggestions et le catalogue derrière ne diraient pas la même chose.
 */
export function ficheDe(exo) {
    let f = cache.get(exo);
    if (!f) {
        f = preparer({
            id: exo.id,
            titre: exo.title,
            chemin: exo.tags?.chemin || [],
            niveaux: exo.tags?.niveaux || [],
            // Les mots-clefs du catalogue entrent ici : c'est ce qui remplace
            // le troisième niveau de chemin. « tables » ne RANGE plus rien,
            // mais il se cherche — et c'est tout ce qu'on lui demandait.
            motsCles: [
                isGame(exo) ? 'jeu jeux' : '',
                // « à deux » se cherche : celui qui tape ces mots veut une
                // activité pour un binôme, qu'elle l'impose ou qu'elle le
                // permette. Les six jeux de plateau doivent sortir.
                seJoueAussiADeux(exo) ? 'deux joueurs duo a deux' : '',
                ...(exo.motsClefs || [])
            ].filter(Boolean),
            texte: exo.instruction || '',
            jeu: isGame(exo),
            duo: seJoueAussiADeux(exo)
        });
        cache.set(exo, f);
    }
    return f;
}

/**
 * Les fiches visibles pour QUI regarde : un brouillon ne se cherche pas, et un
 * exercice « en test » n'existe pas pour un élève. On réutilise le filtre du
 * catalogue au lieu de le réécrire — le jour où un statut s'ajoute, la
 * recherche suit toute seule.
 */
function fichesVisibles() {
    return filterByStatus(exercices, {
        only: state.catalogFilter, teacher: state.isTeacherMode
    }).map(ficheDe);
}

export function initRechercheUI(onFiltre) {
    const input = document.getElementById('sidebar-search-input');
    const liste = document.getElementById('sidebar-search-suggestions');
    const croix = document.getElementById('sidebar-search-clear');
    if (!input || !liste) return;

    let suggestions = [];
    let actif = -1;

    const fermer = () => {
        liste.hidden = true;
        liste.innerHTML = '';
        input.setAttribute('aria-expanded', 'false');
        actif = -1;
    };

    // LA LISTE DE SUGGESTIONS RECOUVRAIT LES BOUTONS « + » DES RÉSULTATS.
    //
    // Mesuré à 1440 × 900 : après avoir tapé « fraction », douze résultats dans
    // la colonne et une boîte de suggestions de 299 × 340 px posée par-dessus.
    // `document.elementFromPoint` au centre du « + » des SIX premiers résultats
    // rendait la boîte, pas le bouton : le professeur voyait le « + », cliquait
    // dessus, et choisissait une suggestion à la place.
    //
    // ON NE SUPPRIME PAS LA LISTE. Elle fait doublon avec les résultats, oui,
    // mais elle porte la navigation au clavier — flèches et Entrée — qui est le
    // seul chemin de quelqu'un qui ne se sert pas de la souris. On la referme
    // quand le curseur DESCEND vers les résultats : celui qui va chercher un
    // « + » l'a donc déjà fait disparaître avant de l'atteindre, et celui qui
    // reste au clavier ne la perd jamais.
    ['drill-content', 'view-accordion'].forEach(id => {
        const zone = document.getElementById(id);
        if (zone) zone.addEventListener('pointerenter', () => {
            if (!liste.hidden) fermer();
        });
    });

    const surligner = (titre, q) => decouper(titre, q)
        .map(m => m.fort ? `<b>${echapper(m.texte)}</b>` : echapper(m.texte))
        .join('');

    const peindre = (q) => {
        suggestions = chercher(fichesVisibles(), q, { max: 8 });
        croix.hidden = !q;
        if (!suggestions.length) {
            if (q.trim()) {
                liste.innerHTML = `<li class="rech-vide">Aucun exercice ne correspond à « ${echapper(q.trim())} ».</li>`;
                liste.hidden = false;
                input.setAttribute('aria-expanded', 'true');
            } else fermer();
            return;
        }
        liste.innerHTML = suggestions.map((s, i) => {
            const f = s.fiche;
            const pastilles = [f.jeu ? ICONES.jeu : '', f.duo ? ICONES.duo : ''].filter(Boolean).join(' ');
            return `<li class="rech-item" role="option" id="rech-opt-${i}" data-i="${i}" aria-selected="false">
                <span class="rech-titre">${surligner(f.titre, q)}</span>
                <span class="rech-sous">${echapper((f.chemin || []).join(' › '))}</span>
                <span class="rech-tags">${pastilles} ${echapper((f.niveaux || []).join(' '))}</span>
            </li>`;
        }).join('');
        liste.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        actif = -1;
        majActif();
    };

    const majActif = () => {
        liste.querySelectorAll('.rech-item').forEach((el, i) => {
            const on = i === actif;
            el.classList.toggle('rech-item--actif', on);
            el.setAttribute('aria-selected', String(on));
        });
        input.setAttribute('aria-activedescendant', actif >= 0 ? `rech-opt-${actif}` : '');
        if (actif >= 0) liste.children[actif]?.scrollIntoView({ block: 'nearest' });
    };

    const choisir = (i) => {
        const s = suggestions[i];
        if (!s) return;
        const exo = exercices.find(e => e.id === s.fiche.id);
        if (!exo) return;
        fermer();
        input.blur();
        // CE QU'ON VENAIT CHERCHER N'EST PAS LE MÊME DES DEUX CÔTÉS.
        //
        // Côté ÉLÈVE, on cherche un exercice pour le faire : Entrée le lance.
        //
        // Côté PROFESSEUR, on cherche un exercice pour l'AJOUTER — c'est tout
        // le propos de l'atelier. Entrée ouvrait un aperçu plein cadre
        // par-dessus la colonne du parcours : mesuré, une couche de 400 × 810
        // px en z-index 100000, avec une démonstration animée et onze boutons
        // de pilotage. Il fallait la refermer, retrouver sa ligne, puis cliquer
        // le « + ». L'aperçu a déjà sa porte à lui — l'œil, sur chaque ligne du
        // catalogue —, et il l'avait déjà avant cette touche-ci.
        if (state.isTeacherMode) {
            import('./builder.js').then(m => m.addStep(exo.id));
            import('./modal.js').then(m =>
                m.showToast(`« ${exo.title} » ajouté au parcours`, 'success'));
            return;
        }
        openGameLayer(exo, false);
    };

    input.addEventListener('input', () => {
        state.searchQuery = input.value;
        peindre(input.value);
        onFiltre();
    });

    input.addEventListener('keydown', (e) => {
        if (liste.hidden || !suggestions.length) {
            if (e.key === 'Escape' && input.value) { videur(); }
            return;
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); actif = (actif + 1) % suggestions.length; majActif(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); actif = (actif - 1 + suggestions.length) % suggestions.length; majActif(); }
        else if (e.key === 'Enter') {
            // Entrée sans sélection ouvre la PREMIÈRE suggestion : c'est ce
            // qu'on attend d'un champ de recherche, et ça évite d'avoir à
            // descendre d'une flèche pour le résultat évident.
            e.preventDefault();
            choisir(actif >= 0 ? actif : 0);
        } else if (e.key === 'Escape') { e.preventDefault(); fermer(); }
    });

    // `pointerdown` et non `click` : au doigt, le champ perd le focus avant le
    // clic, la liste se fermerait sous l'appui et rien ne s'ouvrirait.
    liste.addEventListener('pointerdown', (e) => {
        const li = e.target.closest('[data-i]');
        if (!li) return;
        e.preventDefault();
        choisir(Number(li.dataset.i));
    });

    const videur = () => {
        input.value = '';
        state.searchQuery = '';
        croix.hidden = true;
        fermer();
        onFiltre();
        input.focus();
    };
    croix.addEventListener('click', videur);

    // Un clic ailleurs referme, mais on laisse vivre le champ : le catalogue
    // reste filtré tant qu'on n'a pas effacé.
    document.addEventListener('pointerdown', (e) => {
        if (!liste.hidden && !e.target.closest('#sidebar-search-wrap')) fermer();
    });
    input.addEventListener('focus', () => { if (input.value) peindre(input.value); });
}

const echapper = (s) => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
