// LES DEUX FEUILLES QU'ON TIRE D'UNE CLASSE — et les deux portes qui y mènent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 3 novembre, devant la maquette : « Oui c'est génial et est-ce que Louis
// peut avoir un corrigé ou ses parents ? » Les deux, et surtout PAS LE MÊME
// DOCUMENT. La fiche de reprise part avec l'élève et porte des questions ; la
// page parents part chez ses parents et n'en porte aucune.
//
// ── POURQUOI CES DEUX FENÊTRES VIVENT ICI ET NON DANS UN ÉCRAN ─────────────
//
// RÉMY, 4 novembre : « ah oui mais du coup on n'a pas fait la page parent ».
// Elle était faite — sur l'AUTRE écran des classes. Il y en a deux dans ce
// logiciel : celui des classes locales (`ui/classesUI.js`), nourries de
// fichiers déposés un par un, et l'espace des VRAIES classes
// (`ui/espaceClasses.js`), nourries par le serveur. Les boutons étaient sur le
// premier ; ses élèves sont sur le second — qui ne montre même plus le premier
// quand le serveur répond.
//
// Les écrire deux fois aurait donné deux fenêtres qui divergent au premier
// réglage, et c'est toujours la seconde qu'on oublie. Elles prennent donc une
// LISTE D'ÉLÈVES, et rien d'autre : chaque écran traduit ce qu'il a — la
// grille locale rend déjà des élèves de bilan, le serveur passe par
// `elevesPourLesFeuilles`.
//
// ── ET ELLES DISENT CE QU'ELLES VONT FAIRE AVANT DE LE FAIRE ───────────────
//
// Un bouton qui lâcherait vingt-six feuilles sans prévenir est un bouton qu'on
// n'ose pas presser. Chacune annonce donc COMBIEN, et surtout QUI N'EN A PAS,
// avec la raison : « rien à reprendre » et « n'a rien déposé » sont deux
// nouvelles très différentes — la première est une bonne nouvelle, la seconde
// demande un mot à l'élève.

import { showModal, showToast } from './modal.js';

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Le pied des deux fenêtres : « Fermer » en second plan, l'action à droite. */
function piedDeFenetre(modal, ou) {
    const pied = document.createElement('div');
    pied.style.cssText = 'display:flex; gap:10px; justify-content:flex-end; margin-top:8px';
    // « Fermer » EN SECOND PLAN : les deux boutons étaient pleins et de la même
    // couleur, donc on ne voyait pas lequel agit. Le contour suffit.
    pied.innerHTML = '<button type="button" class="cl-btn cl-btn--doux" data-annuler>Fermer</button>'
        + '<button type="button" class="cl-btn" data-faire>Télécharger le PDF</button>';
    modal.element.querySelector(ou).after(pied);
    pied.querySelector('[data-annuler]').onclick = () => modal.close();
    return pied;
}

/**
 * LA FENÊTRE DES FICHES DE REPRISE.
 *
 * LE CORRIGÉ DÉTACHABLE EST UNE CASE, PAS DEUX DOCUMENTS. Celui de l'élève est
 * un bandeau qu'on découpe : on le retire avant de distribuer si l'on ramasse,
 * on le laisse s'il travaille seul. C'est la même feuille dans les deux cas.
 *
 * @param {Array}  eleves   des élèves de bilan — `{nom, questions, competences}`
 * @param {object} [o]
 * @param {string} [o.classe]   le nom de la classe, pour le titre et le fichier
 * @param {object} [o.reprise]  les réglages passés à `reprisesDeLaClasse`
 */
export async function ouvrirLesReprises(eleves, o = {}) {
    const [{ exercicePourLaFeuille }, { reprisesDeLaClasse }] = await Promise.all([
        import('../core/amelioration.js'),
        import('../core/reprise.js')
    ]);
    const { fiches, ecartes } = reprisesDeLaClasse(eleves, exercicePourLaFeuille,
        o.reprise || {});

    if (!fiches.length) {
        // ON NE MONTRE PAS UNE FENÊTRE VIDE AVEC UN BOUTON MORT. Et l'on dit
        // POURQUOI : une classe qui a tout réussi n'est pas une classe qui n'a
        // rien fait.
        const rien = ecartes.filter(e => /déposé/.test(e.pourquoi)).length;
        showToast(rien === ecartes.length && rien > 0
            ? 'Personne n\'a encore déposé de travail : il n\'y a rien à reprendre.'
            : 'Aucune reprise à faire — tout ce qui a été mesuré est acquis.', 'info');
        return;
    }

    const liste = (quoi) => ecartes.filter(e => e.pourquoi === quoi)
        .map(e => esc(e.nom)).join(', ');
    const acquis = liste('rien à reprendre');
    const absents = liste('n\'a rien déposé');

    const modal = showModal('Fiches de reprise', `
        <p class="modal-text"><b>${fiches.length} feuille${fiches.length > 1 ? 's' : ''}</b>
           pour ${esc(o.classe || 'la classe')} — une par élève, toutes différentes,
           avec votre pile de corrigés à la fin.</p>
        ${acquis ? `<p class="modal-text">Sans feuille, parce que tout est acquis :
           ${acquis}.</p>` : ''}
        ${absents ? `<p class="modal-text">Sans feuille, parce qu'ils n'ont rien déposé :
           <b>${absents}</b>.</p>` : ''}
        <label style="display:flex; gap:10px; align-items:flex-start; margin:14px 0">
            <input type="checkbox" id="rp-detachable" checked>
            <span>Mettre le corrigé de l'élève au bas de sa feuille, à découper.
                <br><small>Vous le coupez avant de distribuer si vous ramassez ;
                vous le laissez s'il travaille seul.</small></span>
        </label>
        <p class="modal-text" id="rp-etat" role="status" aria-live="polite"></p>`,
    { width: '560px' });

    const pied = piedDeFenetre(modal, '#rp-etat');
    pied.querySelector('[data-faire]').onclick = async () => {
        const bouton = pied.querySelector('[data-faire]');
        const etat = modal.element.querySelector('#rp-etat');
        bouton.disabled = true;
        // ON DIT QU'ON TRAVAILLE : vingt-six feuilles demandent de tirer cent
        // questions et de dessiner autant de figures. Sans ce mot, le bouton
        // paraît n'avoir rien fait, et l'on clique une seconde fois.
        etat.textContent = 'Fabrication des feuilles…';
        try {
            const { telechargerLesReprises } = await import('./fichesDeReprise.js');
            const r = await telechargerLesReprises(fiches, {
                classe: o.classe || 'classe',
                detachable: modal.element.querySelector('#rp-detachable').checked
            });
            modal.close();
            showToast(`${r.feuilles} feuille${r.feuilles > 1 ? 's' : ''} · `
                + `${r.pages} page${r.pages > 1 ? 's' : ''} — corrigés compris.`, 'success');
        } catch (e) {
            bouton.disabled = false;
            etat.textContent = `La fabrication a échoué : ${e && e.message ? e.message : e}`;
            console.error('[reprises]', e);
        }
    };
}

/**
 * LA FENÊTRE DES PAGES POUR LES PARENTS.
 *
 * Une A4 par élève, dans l'ordre alphabétique — on cherche un nom dans une
 * pile, pas un rang. Elle dit ce qui est acquis, ce qui reste, l'erreur qui
 * revient, et UNE chose à faire à la maison en cinq minutes. Un parent ne peut
 * rien faire d'une liste de réponses : il ne peut pas expliquer. Il peut faire
 * quelque chose d'une phrase à dire à table.
 *
 * ET CELUI QUI N'A RIEN DÉPOSÉ N'A PAS DE PAGE. Une feuille de zéros n'apprend
 * rien à ses parents et les blesse pour rien ; on le dit ici, dans la fenêtre,
 * pour que le professeur sache qui manque à la pile avant de l'imprimer.
 */
export async function ouvrirLesPagesParents(eleves, o = {}) {
    const actifs = (eleves || []).filter(e => e && e.questions > 0);
    const muets = (eleves || []).filter(e => e && !(e.questions > 0));

    if (!actifs.length) {
        showToast('Personne n\'a encore déposé de travail : il n\'y a rien à raconter '
            + 'à des parents.', 'info');
        return;
    }

    const modal = showModal('Pages pour les parents', `
        <p class="modal-text"><b>${actifs.length} page${actifs.length > 1 ? 's' : ''}</b>
           pour ${esc(o.classe || 'la classe')} — une par élève, dans l'ordre
           alphabétique : on cherche un nom dans une pile, pas un rang.</p>
        <p class="modal-text">Chacune dit ce qui est acquis, ce qui reste, l'erreur
           qui revient, et une chose à faire à la maison en cinq minutes. Ni note,
           ni moyenne, ni rang — et le bas de la page reste blanc, avec des lignes,
           pour votre mot à la main.</p>
        ${muets.length ? `<p class="modal-text">Sans page, parce qu'ils n'ont rien
           déposé : <b>${muets.map(e => esc(e.nom)).join(', ')}</b>.
           <br><small>Une feuille de zéros n'apprend rien à des parents ; c'est à
           vous de leur en parler.</small></p>` : ''}
        <p class="modal-text" id="pp-etat" role="status" aria-live="polite"></p>`,
    { width: '560px' });

    const pied = piedDeFenetre(modal, '#pp-etat');
    pied.querySelector('[data-faire]').onclick = async () => {
        const bouton = pied.querySelector('[data-faire]');
        const etat = modal.element.querySelector('#pp-etat');
        bouton.disabled = true;
        etat.textContent = 'Fabrication des pages…';
        try {
            const { telechargerLesPagesParents } = await import('./pageParents.js');
            const r = await telechargerLesPagesParents(actifs, {
                classe: o.classe || 'classe',
                date: new Date().toLocaleDateString('fr-FR',
                    { day: 'numeric', month: 'long', year: 'numeric' })
            });
            modal.close();
            showToast(`${r.pages} page${r.pages > 1 ? 's' : ''} — une par élève.`, 'success');
        } catch (e) {
            bouton.disabled = false;
            etat.textContent = `La fabrication a échoué : ${e && e.message ? e.message : e}`;
            console.error('[parents]', e);
        }
    };
}
