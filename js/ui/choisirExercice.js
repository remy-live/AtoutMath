// CHOISIR UN EXERCICE EN GRAND — une fenêtre, pas une colonne.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, MOT À MOT. « Tu peux même faire une modale dédiée à ce choix, parce que
// parfois les titres des vignettes ne tiennent pas dans le panneau latéral
// gauche et ça donne une sensation d'oppression. »
//
// MESURÉ. Le catalogue fait 172 exercices. Dans la colonne de gauche, large de
// 319 pixels, l'arbre entièrement déplié mesure 9 076 pixels pour une fenêtre
// de 595 — quinze écrans et demi de défilement — et 51 titres sur 172 sont
// ROGNÉS. « La Tour de Hanoï (Tour de Brahma) » s'affiche dans 154 pixels
// quand il lui en faut 233 ; « Le Quadrilatère qui se Transforme » dans 154
// sur 230. On choisit donc sur des titres coupés.
//
// CE QUE LA COLONNE NE PEUT PAS FAIRE. Élargir les lignes : elle n'a pas la
// place. Les mettre sur deux lignes : on a décidé le contraire il y a peu, et
// pour une bonne raison — une ligne est une ligne, sinon la liste devient un
// paragraphe qu'on ne balaie plus du regard. Montrer l'exercice : impossible à
// 319 pixels.
//
// D'OÙ UNE FENÊTRE, ET ELLE NE REMPLACE PAS LA COLONNE. La colonne reste ce
// qu'elle est de mieux : un rangement qu'on parcourt du coin de l'œil en
// travaillant. La fenêtre sert au moment où l'on CHERCHE — titres entiers,
// chemin complet, niveaux, aperçu à côté, et l'on ajoute sans la refermer.
//
// ON NE REFAIT PAS LES FILTRES. `getFilteredExercises` est déjà la seule
// autorité sur ce qui est visible — niveau, recherche, à deux, brouillons. La
// fenêtre a sa propre recherche parce qu'on y cherche autrement (on tape un
// mot, on regarde, on tape autre chose) ; tout le reste vient de là.

import { exercices, filterByStatus, estADeux, seJoueAussiADeux } from '../data/catalog.js';
import { state } from '../core/state.js';
import { showModal } from './modal.js';
import { correspond } from '../core/recherche.js';
import { ficheDe } from './rechercheUI.js';
import { adapterAuContenu, ajusterDesQueDessine, motDeRelance } from './apercuTiroir.js';

/** La boîte de l'aperçu, dans la fenêtre. */
const APERCU = { l: 360, h: 300 };

/** La fenêtre ouverte, s'il y en a une. */
let ouverte = null;

const echapper = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Le catalogue tel que ce rôle a le droit de le voir. */
function visibles() {
    return filterByStatus(exercices, {
        only: state.catalogFilter, teacher: state.isTeacherMode
    });
}

/** Les niveaux réellement présents, dans l'ordre du programme. */
function niveauxDisponibles(liste) {
    const ordre = ['CM2', '6ème', '5ème', '4ème', '3ème'];
    const vus = new Set();
    liste.forEach(e => (e.tags.niveaux || []).forEach(n => vus.add(n)));
    return ordre.filter(n => vus.has(n)).concat([...vus].filter(n => !ordre.includes(n)));
}

/**
 * OUVRIR LA FENÊTRE DE CHOIX.
 *
 * @param {object} opts
 * @param {Function} opts.ajouter  (exo) => void — ce qu'on fait d'un exercice
 *                                 choisi. La fenêtre NE SE FERME PAS : on en
 *                                 ajoute souvent trois à la suite, et rouvrir
 *                                 la fenêtre entre chaque serait deux gestes
 *                                 pour rien.
 */
export function ouvrirChoixExercice({ ajouter } = {}) {
    fermerChoixExercice();
    const tous = visibles();
    const niveaux = niveauxDisponibles(tous);

    const m = showModal('Choisir un exercice', `
        <div class="cx2">
            <div class="cx2-barre">
                <label class="cx2-champ">
                    <span class="cx2-loupe" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none"
                             stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.6-3.6" />
                        </svg></span>
                    <input type="search" class="cx2-recherche" autocomplete="off"
                           placeholder="Un mot du titre, un chapitre…"
                           aria-label="Chercher un exercice">
                </label>
                <div class="cx2-niveaux" role="group" aria-label="Filtrer par niveau">
                    ${niveaux.map(n => `<button type="button" class="cx2-niv"
                        data-niveau="${echapper(n)}">${echapper(n)}</button>`).join('')}
                </div>
            </div>
            <p class="cx2-compte" role="status" aria-live="polite"></p>
            <div class="cx2-corps">
                <ul class="cx2-liste" role="listbox" aria-label="Exercices"></ul>
                <div class="cx2-apercu">
                    <p class="cx2-apercu-vide">Choisis un exercice à gauche pour le voir ici.</p>
                    <div class="cx2-apercu-cadre" hidden><div class="cx2-apercu-toile"></div></div>
                    <div class="cx2-apercu-pied" hidden>
                        <button type="button" class="cx2-rejouer" data-rejouer>Question suivante</button>
                    </div>
                </div>
            </div>
        </div>`, { width: '1020px', onClose: () => {
            ouverte = null;
            // La fenêtre part ; le jeu de l'aperçu, lui, continuerait de tourner
            // dans le vide. `tour++` invalide en plus une mesure en route.
            tour++; tuer();
        } });

    ouverte = m;
    const el = m.element;
    const champ = el.querySelector('.cx2-recherche');
    const liste = el.querySelector('.cx2-liste');
    const compte = el.querySelector('.cx2-compte');
    const cadre = el.querySelector('.cx2-apercu-cadre');
    const toile = el.querySelector('.cx2-apercu-toile');
    const vide = el.querySelector('.cx2-apercu-vide');
    const pied = el.querySelector('.cx2-apercu-pied');
    const relance = el.querySelector('[data-rejouer]');
    cadre.style.height = `${APERCU.h}px`;

    let mot = '';
    const nivChoisis = new Set();
    let montre = null;

    const gardes = () => tous.filter(e => {
        if (nivChoisis.size && !(e.tags.niveaux || []).some(n => nivChoisis.has(n))) return false;
        if (mot && !correspond(ficheDe(e), mot)) return false;
        return true;
    });

    // CELUI QU'ON REGARDE MAINTENANT. Le professeur descend sa liste et en
    // ouvre dix en deux secondes ; sans ce jeton, l'aperçu du troisième
    // arriverait par-dessus celui du neuvième et le redimensionnerait.
    let tour = 0;
    // LE JEU PRÉCÉDENT, POUR LE TUER. `launchPreview` coupe les minuteurs
    // déclarés par `regInterval`, mais les jeux historiques ouvrent les leurs
    // directement : vider la toile ne les arrête pas, et ils continuent de
    // rafraîchir un plateau qui n'existe plus. La vignette du catalogue a
    // rencontré exactement cela, et le règle de la même façon.
    let instance = null;
    const tuer = () => {
        const h = instance;
        instance = null;
        if (h && typeof h.destroy === 'function') { try { h.destroy(); } catch (e) { /* démonté */ } }
    };

    const montrer = (exo) => {
        montre = exo.id;
        tuer();
        const monTour = ++tour;
        vide.hidden = true;
        cadre.hidden = false;
        // UN AUTRE TIRAGE, SANS REFERMER. Un générateur pose des questions
        // différentes ; l'aperçu n'en montrait qu'une, et rien ne permettait
        // d'en voir une seconde. Le mot change selon l'exercice : un jeu du
        // catalogue ne pose pas de question, il distribue une partie.
        pied.hidden = false;
        relance.textContent = motDeRelance(exo);
        // CACHÉ LE TEMPS DE MESURER. Mesuré : sans cela « La Chasse aux Zéros »
        // s'affiche en 358 × 763 dans un cadre de 358 × 300 — deux fois et
        // demie trop grand — pendant 240 ms avant de se ranger.
        cadre.style.visibility = 'hidden';
        toile.innerHTML = '';
        toile.style.transform = 'none';
        import('../games/engine.js').then(async ({ launchPreview }) => {
            const h = await launchPreview(exo, toile, null, { muet: true });
            if (monTour !== tour) {
                if (h && typeof h.destroy === 'function') { try { h.destroy(); } catch (e) { /* démonté */ } }
                return;
            }
            instance = h;
            ajusterDesQueDessine({
                vivant: () => monTour === tour,
                ajuster: (proche) => adapterAuContenu(toile, {
                    maxL: cadre.clientWidth || APERCU.l, maxH: cadre.clientHeight || APERCU.h,
                    centrerDans: { l: cadre.clientWidth || APERCU.l, h: cadre.clientHeight || APERCU.h },
                    proche
                }),
                montrer: () => { cadre.style.visibility = ''; }
            });
        }).catch(() => {
            if (monTour !== tour) return;
            cadre.style.visibility = '';
            toile.innerHTML = '<p class="cx2-apercu-note">Cet exercice ne se montre pas en aperçu.</p>';
        });
    };

    const dessiner = () => {
        const g = gardes();
        compte.textContent = nivChoisis.size || mot
            ? `${g.length} exercice${g.length > 1 ? 's' : ''} sur ${tous.length}`
            : `${tous.length} exercices`;

        liste.innerHTML = g.map(e => {
            const chemin = (e.tags.chemin || []).join(' › ');
            const niv = (e.tags.niveaux || []).join(' · ');
            return `<li class="cx2-item" role="option" aria-selected="false" data-exo="${echapper(e.id)}">
                <button type="button" class="cx2-voir" data-voir="${echapper(e.id)}">
                    <span class="cx2-titre">${echapper(e.title)}</span>
                    <span class="cx2-sous">${echapper(chemin)}${niv ? ' — ' + echapper(niv) : ''}
                        ${estADeux(e)
                        ? '<span class="cx2-duo">👥 à deux</span>'
                        : (seJoueAussiADeux(e)
                            ? '<span class="cx2-duo cx2-duo--aussi">👥 aussi à deux</span>' : '')}</span>
                </button>
                <button type="button" class="cx2-ajouter" data-ajouter="${echapper(e.id)}"
                        title="Ajouter « ${echapper(e.title)} » au parcours">+ Ajouter</button>
            </li>`;
        }).join('') || '<li class="cx2-rien">Aucun exercice ne correspond.</li>';

        liste.querySelectorAll('[data-voir]').forEach(b => {
            b.onclick = () => {
                const exo = tous.find(x => x.id === b.dataset.voir);
                if (!exo) return;
                liste.querySelectorAll('.cx2-item').forEach(li =>
                    li.setAttribute('aria-selected', String(li.dataset.exo === exo.id)));
                montrer(exo);
            };
        });
        liste.querySelectorAll('[data-ajouter]').forEach(b => {
            b.onclick = () => {
                const exo = tous.find(x => x.id === b.dataset.ajouter);
                // ON NE FERME PAS. On en ajoute souvent trois à la suite ; le
                // bouton dit qu'il a compris, et la fenêtre reste.
                if (exo && ajouter) ajouter(exo);
                b.classList.add('cx2-ajouter--fait');
                b.textContent = '✓ Ajouté';
                setTimeout(() => {
                    b.classList.remove('cx2-ajouter--fait');
                    b.textContent = '+ Ajouter';
                }, 1600);
            };
        });

        // L'aperçu suit la liste : si ce qu'on montrait a disparu du filtre,
        // il ne reste pas à l'écran comme un choix qu'on ne peut plus faire.
        if (montre && !g.some(e => e.id === montre)) {
            montre = null; tour++; tuer();
            cadre.hidden = true; pied.hidden = true; vide.hidden = false; toile.innerHTML = '';
        }
    };

    relance.onclick = () => {
        const exo = tous.find(x => x.id === montre);
        if (exo) montrer(exo);
    };

    champ.oninput = () => { mot = champ.value.trim(); dessiner(); };
    el.querySelectorAll('.cx2-niv').forEach(b => {
        b.onclick = () => {
            const n = b.dataset.niveau;
            if (nivChoisis.has(n)) nivChoisis.delete(n); else nivChoisis.add(n);
            b.classList.toggle('cx2-niv--actif', nivChoisis.has(n));
            b.setAttribute('aria-pressed', String(nivChoisis.has(n)));
            dessiner();
        };
        b.setAttribute('aria-pressed', 'false');
    });

    dessiner();
    // Le curseur dans la recherche : c'est ce qu'on vient y faire.
    requestAnimationFrame(() => { try { champ.focus(); } catch (e) { /* démonté */ } });
    return m;
}

/** Refermer, s'il y a lieu. */
export function fermerChoixExercice() {
    if (!ouverte) return;
    const m = ouverte;
    ouverte = null;
    try { m.close(); } catch (e) { /* déjà partie */ }
}
