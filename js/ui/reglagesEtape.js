// LES RÉGLAGES D'UNE ÉTAPE : UNE FENÊTRE, ET UN APERÇU QUI SUIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, MOT À MOT. « Si tu cliques sur les réglages, ça ouvre une modale
// (oublions le panneau latéral pour les réglages, ça surcharge trop l'écran)
// dans laquelle tu peux cocher / décocher, avoir un “tab” pour avoir un aperçu
// qui prenne en compte tes modifs. Et hop là tu as un tunnel. »
//
// CE QUI EXISTAIT. Un troisième panneau, à droite, intitulé « Propriétés de
// l'étape ». Mesuré sur un écran de 1440 : il prend 330 pixels — le quart de la
// largeur — et POUSSE le parcours qu'on est en train de régler. On se retrouve
// donc à lire les réglages d'un exercice dans une colonne, pendant que
// l'exercice lui-même est ailleurs, plus étroit qu'avant, et qu'on ne voit
// toujours pas ce que les réglages changent.
//
// CE QUE LA FENÊTRE APPORTE, ET CE N'EST PAS L'ESTHÉTIQUE. Le parcours reprend
// toute sa largeur ; les réglages ont la place de respirer ; et surtout
// l'APERÇU devient possible — une fenêtre large peut montrer le jeu, une
// colonne de 330 px ne le pouvait pas. On règle et l'on voit : c'est le tunnel
// que Rémy décrit.
//
// L'APERÇU SE REFAIT QUAND ON REVIENT DESSUS, PAS À CHAQUE FRAPPE. Relancer un
// jeu à chaque caractère tapé dans « Nombre de questions » ferait clignoter
// l'écran et coûterait un montage de jeu par touche. On note que l'aperçu est
// PÉRIMÉ, et on le refait à l'instant où l'on retourne le regarder.
//
// ON NE RÉÉCRIT PAS LES RÉGLAGES EUX-MÊMES. `renderGameConfigUI` sait déjà les
// dessiner, dans un élément qu'il trouve par identifiant. On lui donne le même
// identifiant, dans la fenêtre : tout ce qu'il sait faire continue de marcher,
// et il n'y a pas deux panneaux de réglages à tenir d'accord.

import { showModal } from './modal.js';
import { adapterAuContenu, ajusterDesQueDessine, motDeRelance } from './apercuTiroir.js';
import { paramSchemaOf } from '../data/catalog.js';
import { marchesCochees, decoupeMarches } from '../core/progression.js';

/** La boîte de l'aperçu, en pixels. Large : c'est tout l'intérêt de la fenêtre. */
const APERCU = { l: 620, h: 420 };

/** La fenêtre ouverte, s'il y en a une. Une seule à la fois. */
let ouverte = null;

/**
 * UN IDENTIFIANT PAR FENÊTRE, ET C'EST UN DÉFAUT MESURÉ QUI L'IMPOSE.
 *
 * `renderGameConfigUI` dessine dans un élément qu'il trouve par
 * `getElementById`. En réutilisant le même identifiant d'une fenêtre à
 * l'autre, on tombait sur ceci : la fermeture d'une fenêtre laisse son voile
 * dans le document 200 ms (le temps du fondu). Si l'on rouvre pendant ces
 * 200 ms — ce qui arrive dès qu'on clique sur une deuxième étape —, il y a
 * DEUX éléments du même identifiant, `getElementById` rend le PREMIER, et les
 * réglages se dessinent dans la fenêtre qui est en train de disparaître.
 * Mesuré : le panneau de la nouvelle fenêtre restait vide, sans la moindre
 * erreur dans la console.
 */
let numero = 0;

/** Y a-t-il des réglages d'étape ouverts ? */
export function reglagesEtapeOuverts() { return !!ouverte; }

/** Refermer, s'il y a lieu. Sans erreur si rien n'est ouvert. */
export function fermerReglagesEtape({ net = false } = {}) {
    if (!ouverte) return;
    const m = ouverte;
    ouverte = null;
    try { m.close(); } catch (e) { /* déjà partie */ }
    // `net` : on ARRACHE le voile au lieu d'attendre la fin du fondu. C'est ce
    // qu'il faut quand on rouvre aussitôt — deux fenêtres de réglages qui se
    // chevauchent, même un cinquième de seconde, se marchent dessus.
    if (net && m.element && m.element.parentElement) {
        try { m.element.parentElement.remove(); } catch (e) { /* déjà partie */ }
    }
}

/**
 * OUVRIR LES RÉGLAGES D'UNE ÉTAPE.
 *
 * @param {object} opts
 * @param {Function} opts.etape     () => l'étape du parcours, RELUE à chaque fois.
 *                                  Pas l'objet : enregistrer un réglage REMPLACE
 *                                  l'étape dans le parcours, et une référence
 *                                  gardée ici montrerait éternellement l'étape
 *                                  d'avant. Mesuré : « Plus grand terme » passé
 *                                  de 10 à 6, l'aperçu tirait encore des 10.
 * @param {object} opts.exo         l'exercice du catalogue (pour l'aperçu et le titre)
 * @param {Function} opts.rendre    (idConteneur, onChange) => void — dessine les
 *                                  réglages dans l'élément d'identifiant donné.
 *                                  C'est l'appelant qui sait quoi passer à
 *                                  `renderGameConfigUI` : le mode du parcours,
 *                                  la façon d'enregistrer. On ne le devine pas.
 * @param {Function} [opts.onClose] appelé quand la fenêtre se referme
 * @returns {{close: Function}|null}
 */
export function ouvrirReglagesEtape({ etape, exo, rendre, onClose } = {}) {
    if (typeof etape !== 'function' || typeof rendre !== 'function') return null;
    fermerReglagesEtape({ net: true });

    const idConfig = `re-config-${++numero}`;
    const titre = (exo && exo.title) || 'Réglages de l\'étape';
    const m = showModal(titre, `
        <div class="re-onglets" role="tablist" aria-label="Réglages et aperçu">
            <button type="button" class="re-onglet re-onglet--actif" role="tab"
                    aria-selected="true" data-vue="reglages">Réglages</button>
            <button type="button" class="re-onglet" role="tab"
                    aria-selected="false" data-vue="apercu">Aperçu</button>
        </div>
        <div class="re-vue re-vue--reglages" data-pan="reglages">
            <div id="${idConfig}"></div>
        </div>
        <div class="re-vue re-vue--apercu" data-pan="apercu" hidden>
            <p class="re-apercu-note">Une vraie question de l'exercice, avec les
               réglages que tu viens de choisir.</p>
            <div class="re-apercu-cadre">
                <div class="re-apercu-toile"></div>
            </div>
            <div class="re-apercu-pied">
                <!-- OÙ L'ON EN EST DANS LA SÉRIE. Sans ce compte, « Question
                     suivante » ne dit pas qu'on AVANCE : on voit changer des
                     nombres et l'on croit tourner en rond — c'est exactement ce
                     qu'il s'est passé. Avec lui, on lit « Question 3 sur 14 »
                     et l'on sait qu'on parcourt l'exercice. -->
                <span class="re-apercu-rang" data-rang-apercu role="status"></span>
                <button type="button" class="re-rejouer" data-rejouer>Question suivante</button>
            </div>
        </div>`, { width: '820px', onClose: () => { ouverte = null; if (onClose) onClose(); } });

    ouverte = m;
    const el = m.element;
    const cadre = el.querySelector('.re-apercu-cadre');
    const toile = el.querySelector('.re-apercu-toile');
    const relance = el.querySelector('[data-rejouer]');
    const rangEl = el.querySelector('[data-rang-apercu]');

    // ── ON AVANCE DANS LA SÉRIE, ON NE LA RECOMMENCE PAS ──────────────────
    //
    // RÉMY : « quand on fait l'aperçu avec les réglages, on reste toujours sur
    // des questions du type x² − 36 ». Mesuré, dix clics sur « Question
    // suivante » : dix fois le PREMIER barreau, sur « Factoriser » comme sur
    // « Développer ». Les nombres changeaient, le barreau jamais.
    //
    // La cause est que l'aperçu remonte une session NEUVE à chaque clic — il
    // ne peut pas faire autrement, puisqu'il remonte aussi le jeu. Une session
    // neuve entre au rang zéro, et un générateur à progression y repose donc
    // éternellement sa première marche. On tient le rang ICI, et on le lui
    // passe (`depuis`).
    //
    // ON BOUCLE À LA FIN. L'exercice fait quatorze questions ; à la quinzième
    // on revient à la première, parce qu'un aperçu qui s'arrête n'aurait plus
    // rien à montrer — et parce que le professeur qui veut revoir le début
    // n'aurait que la fermeture de la fenêtre pour y arriver.
    let rang = 0;
    const combien = () => {
        const e = etape() || {};
        return Math.max(1, Math.round(Number(e.nbItems)) || 10);
    };

    // ── UN CLIC, UNE MARCHE — ET NON UNE QUESTION ─────────────────────────
    //
    // RÉMY, DEVANT UN EXERCICE RÉGLÉ SUR 45 QUESTIONS : « dans l'aperçu normal
    // ça fonctionne mais dans l'aperçu avec onglet ça ne fonctionne pas ».
    //
    // MESURÉ : quarante-cinq questions sur onze barreaux font QUATRE questions
    // par barreau. L'onglet avançait d'une question par clic — donc quatre
    // clics pour quitter le premier barreau, et quarante pour atteindre le
    // dernier. On cliquait trois fois, on lisait 6(x + 3), 8(x + 7), 7(x + 2),
    // et l'on concluait que rien ne bouge. Techniquement l'aperçu avançait ;
    // utilement, non.
    //
    // « L'APERÇU NORMAL », LUI, MARCHE — et il dit pourquoi : la bulle de la
    // barre montre la PREMIÈRE question de la zone qu'on clique, et chaque
    // zone est une marche. Un clic, une marche. L'onglet fait donc pareil :
    // il saute au début de la marche suivante.
    //
    // ON NE PERD PAS LES AUTRES QUESTIONS D'UNE MARCHE : chaque montage tire
    // une graine neuve, donc refaire un tour de l'escalier en donne d'autres.
    const zonesDeMarches = () => {
        if (!exo || !exo.generatorId) return null;
        const p = (paramSchemaOf(exo) || []).find(x => x && x.type === 'marches');
        if (!p) return null;
        const courante = etape() || {};
        const params = { ...((exo && exo.params) || {}), ...(courante.overrides || {}) };
        const cochees = marchesCochees(params, p.marches || [], p.ancien || {});
        const zones = decoupeMarches(cochees, combien(), params).filter(z => z.n > 0);
        return zones.length > 1 ? { zones, mot: p.mot || 'marche' } : null;
    };

    /** La marche qui contient la question de rang `r` (à partir de 0). */
    const zoneDe = (etat, r) => (etat ? etat.zones.find(z => r + 1 >= z.de && r + 1 <= z.a) : null);

    const avancer = () => {
        const etat = zonesDeMarches();
        // Sans progression, « suivante » veut dire « la question suivante » :
        // c'est un nouveau tirage, et c'est tout ce qu'on peut offrir.
        if (!etat) { rang += 1; return; }
        const ici = zoneDe(etat, rang % combien());
        const i = ici ? etat.zones.indexOf(ici) : -1;
        rang = etat.zones[(i + 1) % etat.zones.length].de - 1;
    };

    const direLeRang = () => {
        if (!rangEl) return;
        // Un jeu du catalogue ne pose pas de questions : le compte n'aurait
        // aucun sens — voir `motDeRelance`.
        if (!exo || !exo.generatorId) { rangEl.textContent = ''; return; }
        const total = combien();
        const r = rang % total;
        const etat = zonesDeMarches();
        const z = zoneDe(etat, r);
        // ET LA MARCHE EST NOMMÉE. « Question 21 sur 45 » ne dit pas ce qu'on
        // regarde ; « Question 21 sur 45 · 6. (x + 2)(x + 3) » le dit, et
        // c'est exactement ce que la bulle de la barre écrit au-dessus d'une
        // zone qu'on clique.
        const texte = `Question ${r + 1} sur ${total}` + (z ? ` · ${z.nom}` : '');
        rangEl.textContent = texte;
        // La ligne est coupée si elle dépasse : le titre rend la fin.
        rangEl.title = texte;
    };
    // UN AUTRE TIRAGE. Les réglages se jugent sur plusieurs questions — c'est
    // même tout l'objet de l'onglet : « une vraie question de l'exercice, avec
    // les réglages que tu viens de choisir ». Une seule ne dit pas si le
    // réglage tient.
    if (relance) {
        relance.textContent = motDeRelance(exo);
        relance.onclick = () => { avancer(); monterApercu(); };
    }
    cadre.style.height = `${APERCU.h}px`;

    // L'aperçu est-il à refaire ? Il l'est d'entrée : il n'a jamais été fait.
    let perime = true;
    let vue = 'reglages';

    // Le tour en cours : on ouvre et referme l'onglet « Aperçu » plus vite que
    // les jeux ne se montent, et la mesure d'un aperçu abandonné ne doit pas
    // retomber sur le suivant.
    let tour = 0;

    const monterApercu = () => {
        if (!toile) return;
        perime = false;
        const monTour = ++tour;
        toile.innerHTML = '';
        toile.style.transform = 'none';
        // CACHÉ LE TEMPS DE MESURER — même raison qu'ailleurs : le jeu se
        // dessine à sa taille logique, qui n'a rien à voir avec le cadre.
        if (cadre) cadre.style.visibility = 'hidden';
        // Les réglages courants de l'étape passent par-dessus ceux du
        // catalogue : c'est exactement ce que l'élève recevra.
        const courante = etape() || {};
        const params = { ...((exo && exo.params) || {}), ...(courante.overrides || {}) };
        const total = combien();
        rang = rang % total;
        direLeRang();
        import('../games/engine.js').then(({ launchPreview }) => {
            // `depuis` ET `nbItems` : le premier dit où l'on en est, le second
            // combien il y en aura — c'est lui qui permet aux marches cochées
            // de se partager l'exercice. Voir core/progression.js.
            const p = launchPreview(exo, toile, params,
                { muet: true, depuis: rang, nbItems: total });
            // DEUX MESURES, ET LA PREMIÈRE DÉCIDE. Elle arrive dès que le jeu a
            // dessiné quelque chose — moins de 50 ms — et c'est elle qui donne
            // la taille ; le cadre n'apparaît qu'ensuite. La seconde, à 700 ms,
            // rattrape ce qui se déplie après sa première image, et ne repose
            // l'échelle que si elle a vraiment trouvé autre chose.
            ajusterDesQueDessine({
                vivant: () => monTour === tour,
                ajuster: (proche) => adapterAuContenu(toile, {
                    maxL: APERCU.l, maxH: cadre.clientHeight || APERCU.h,
                    centrerDans: { l: cadre.clientWidth || APERCU.l, h: cadre.clientHeight || APERCU.h },
                    proche
                }),
                montrer: () => { if (cadre) cadre.style.visibility = ''; }
            });
            return p;
        }).catch(() => {
            if (monTour !== tour) return;
            if (cadre) cadre.style.visibility = '';
            toile.innerHTML = '<p class="re-apercu-vide">Cet exercice ne se montre '
                + 'pas en aperçu.</p>';
        });
    };

    const montrer = (quoi) => {
        vue = quoi;
        el.querySelectorAll('[data-pan]').forEach(p => { p.hidden = p.dataset.pan !== quoi; });
        el.querySelectorAll('.re-onglet').forEach(b => {
            const actif = b.dataset.vue === quoi;
            b.classList.toggle('re-onglet--actif', actif);
            b.setAttribute('aria-selected', String(actif));
        });
        if (quoi === 'apercu' && perime) monterApercu();
    };
    el.querySelectorAll('.re-onglet').forEach(b => { b.onclick = () => montrer(b.dataset.vue); });

    // Les réglages, dessinés par l'appelant dans notre conteneur. Chaque
    // changement périme l'aperçu — et le refait tout de suite si c'est lui
    // qu'on est en train de regarder.
    rendre(idConfig, () => {
        perime = true;
        // UN RÉGLAGE CHANGÉ REMET L'APERÇU AU DÉBUT. On vient de décocher un
        // barreau : la série n'est plus la même, et rester à la question 9
        // montrerait une marche que le nouveau partage ne donne plus.
        rang = 0;
        if (vue === 'apercu') monterApercu();
    });

    montrer('reglages');
    return m;
}
