// DONNER UN PARCOURS — à une classe, à un niveau, ou à quelques élèves.
//
// Rémy : « comment j'attribue mon parcours à un niveau (mes 2 sixièmes) ou à
// une classe ou à un groupe d'élèves ? »
//
// LE GESTE TIENT EN UNE BOÎTE, ET C'EST TOUT LE PROPOS. Donner un travail à sa
// classe est ce qu'un professeur fait le plus souvent — plusieurs fois par
// semaine, toute l'année. Si cela demande d'aller dans un écran, d'y créer un
// objet, de le nommer, puis d'y revenir, on ne le fait pas : on redicte un code
// et l'on perd la trace. La boîte s'ouvre donc DEPUIS le parcours qu'on vient
// d'écrire, et elle se referme sur un clic.
//
// LE NIVEAU N'EST PAS UNE CASE DE PLUS, c'est un raccourci de cases. Cocher
// « 6ᵉ » coche les deux sixièmes, et ce sont bien DEUX séances qui partent —
// voir `donnerAuxClasses` dans core/seances.js pour la raison.
//
// LE GROUPE NE S'OFFRE QUE POUR UNE CLASSE À LA FOIS. « Ces huit-là » n'a de
// sens que dans une classe : à cheval sur deux, on ne saurait plus de quel
// tableau ils relèvent, ni quelle séance on clôt. La case disparaît donc dès
// qu'on en coche une seconde, au lieu de proposer quelque chose d'ambigu.

import { showModal, showToast, showAlert } from './modal.js';
import { globalStore } from '../core/store.js';
import { donnerAuxClasses, niveauxDe, classesDuNiveau } from '../core/seances.js';
import { Shortcodes } from '../core/shortcodes.js';

const CLE_CLASSES = 'classes';
const CLE_SEANCES = 'seances';

export async function lireClasses() {
    return (await globalStore.get(CLE_CLASSES, [])) || [];
}

export async function lireSeances() {
    return (await globalStore.get(CLE_SEANCES, [])) || [];
}

export async function ecrireSeances(seances) {
    await globalStore.set(CLE_SEANCES, seances);
    document.dispatchEvent(new CustomEvent('seances_updated'));
}

/** Ajouter des séances à celles qui existent. */
export async function ajouterSeances(nouvelles) {
    const toutes = await lireSeances();
    await ecrireSeances([...toutes, ...nouvelles]);
    return nouvelles;
}

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * LA BOÎTE « DONNER CE PARCOURS ».
 *
 * @param {Object} parcours le modèle, tel qu'il est dans la bibliothèque
 * @param {Function} [onDonne] appelé avec les séances créées
 */
export async function ouvrirDonnerSeance(parcours, onDonne) {
    if (!parcours || !(parcours.steps || []).length) {
        return showAlert('Ajoutez au moins une activité avant de donner ce parcours.');
    }
    const classes = await lireClasses();
    if (!classes.length) {
        // ON NE DEMANDE PAS DE CRÉER UNE CLASSE ICI. Le professeur est en train
        // de donner un travail ; l'envoyer construire ses classes au milieu du
        // geste, c'est lui faire perdre le fil et le parcours. On lui dit où
        // aller, et il revient quand il est prêt.
        return showAlert('Vous n\'avez pas encore de classe. Créez-en une dans '
            + '<b>Mes outils → Mes classes</b>, puis revenez donner ce parcours.'
            + '<br><br>En attendant, le bouton <b>lien</b> vous donne un code à dicter : '
            + 'il marche sans classe.');
    }

    const niveaux = niveauxDe(classes);
    const sansNiveau = classes.filter(c => !c.niveau);

    const groupeHtml = (liste, titre, cle) => `
        <div class="ds-groupe">
            <button type="button" class="ds-niveau" data-niveau="${esc(cle)}">${esc(titre)}</button>
            <div class="ds-classes">${liste.map(c => `
                <label class="ds-classe">
                    <input type="checkbox" data-classe="${esc(c.id)}">
                    <span>${esc(c.nom)}</span>
                    <span class="ds-n">${(c.eleves || []).length}</span>
                </label>`).join('')}</div>
        </div>`;

    const modal = showModal('Donner ce parcours', `
        <div class="ds-boite">
            <p class="ds-titre-parcours">${esc(parcours.name || 'Parcours')}
                <span class="ds-n">${(parcours.steps || []).length} activités</span></p>

            ${niveaux.map(n => groupeHtml(classesDuNiveau(classes, n),
        n.replace(/^(\d)e$/, '$1ᵉ'), n)).join('')}
            ${sansNiveau.length ? groupeHtml(sansNiveau, 'Sans niveau', '') : ''}

            <div class="ds-eleves" hidden>
                <label class="ds-choix">
                    <input type="checkbox" data-groupe>
                    <span>Seulement certains élèves de cette classe</span>
                </label>
                <div class="ds-liste-eleves" hidden></div>
            </div>

            <label class="ds-choix">
                <input type="checkbox" data-plus-tard>
                <span>S'ouvre plus tard</span>
            </label>
            <input type="datetime-local" class="ds-date" hidden aria-label="Date d'ouverture">

            <p class="ds-resume" role="status" aria-live="polite"></p>
            <div class="ds-actions">
                <button type="button" class="ds-ok" disabled>Donner</button>
            </div>
        </div>`, { width: '460px' });

    const el = modal.element;
    const cases = () => [...el.querySelectorAll('[data-classe]')];
    const cochees = () => cases().filter(c => c.checked)
        .map(c => classes.find(x => x.id === c.dataset.classe)).filter(Boolean);
    const boiteEleves = el.querySelector('.ds-eleves');
    const listeEleves = el.querySelector('.ds-liste-eleves');
    const caseGroupe = el.querySelector('[data-groupe]');
    const resume = el.querySelector('.ds-resume');
    const bouton = el.querySelector('.ds-ok');
    const casePlusTard = el.querySelector('[data-plus-tard]');
    const champDate = el.querySelector('.ds-date');

    function rafraichir() {
        const choisies = cochees();
        // LE GROUPE NE S'OFFRE QUE POUR UNE SEULE CLASSE — voir l'en-tête.
        const uneSeule = choisies.length === 1;
        boiteEleves.hidden = !uneSeule;
        if (!uneSeule) { caseGroupe.checked = false; listeEleves.hidden = true; }
        else if (caseGroupe.checked) {
            const eleves = [...(choisies[0].eleves || [])]
                .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
            listeEleves.hidden = false;
            if (listeEleves.dataset.classe !== choisies[0].id) {
                listeEleves.dataset.classe = choisies[0].id;
                listeEleves.innerHTML = eleves.map(e => `
                    <label class="ds-eleve"><input type="checkbox" data-eleve="${esc(e.id)}">
                        <span>${esc(e.nom)}</span></label>`).join('');
            }
        } else listeEleves.hidden = true;

        const groupe = [...listeEleves.querySelectorAll('[data-eleve]:checked')];
        const nbEleves = choisies.reduce((n, c) => n + (c.eleves || []).length, 0);
        bouton.disabled = !choisies.length
            || (caseGroupe.checked && !listeEleves.hidden && !groupe.length);

        if (!choisies.length) { resume.textContent = 'Choisissez au moins une classe.'; return; }
        // ON DIT CE QUI VA PARTIR AVANT DE LE FAIRE : combien de séances, à
        // combien d'élèves. « Deux séances » surprend quand on a coché un
        // niveau, et il vaut mieux que la surprise arrive ici que dans la liste.
        const qui = (caseGroupe.checked && groupe.length)
            ? `${groupe.length} élève${groupe.length > 1 ? 's' : ''} de ${choisies[0].nom}`
            : `${nbEleves} élève${nbEleves > 1 ? 's' : ''}`;
        resume.textContent = choisies.length > 1
            ? `${choisies.length} séances — une par classe — pour ${qui}.`
            : `Une séance pour ${qui}.`;
    }

    el.addEventListener('change', (ev) => {
        const t = ev.target;
        if (t === casePlusTard) {
            champDate.hidden = !t.checked;
            if (t.checked && !champDate.value) {
                // Par défaut, demain à huit heures : on programme une séance
                // pour le cours suivant, pas pour dans trois semaines.
                const d = new Date(Date.now() + 86400000);
                d.setHours(8, 0, 0, 0);
                champDate.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString().slice(0, 16);
            }
        }
        rafraichir();
    });
    el.querySelectorAll('[data-niveau]').forEach(b => {
        b.onclick = () => {
            const dedans = b.dataset.niveau
                ? classesDuNiveau(classes, b.dataset.niveau) : sansNiveau;
            const ids = new Set(dedans.map(c => c.id));
            const toutes = cases().filter(c => ids.has(c.dataset.classe));
            const tout = toutes.every(c => c.checked);
            toutes.forEach(c => { c.checked = !tout; });
            rafraichir();
        };
    });

    bouton.onclick = async () => {
        const choisies = cochees();
        if (!choisies.length) return;
        const groupe = [...listeEleves.querySelectorAll('[data-eleve]:checked')]
            .map(x => x.dataset.eleve);
        const ouvreLe = (casePlusTard.checked && champDate.value)
            ? new Date(champDate.value).getTime() : null;
        // LE CODE VOYAGE AVEC LA SÉANCE, même quand la classe est rattachée.
        // Il ne coûte rien à calculer et sauve la séance où un élève arrive
        // d'une autre classe, ou travaille sur un poste qu'on n'a pas rattaché.
        const code = Shortcodes.encodePath(parcours);
        const seances = donnerAuxClasses(choisies, parcours, {
            code,
            ouvreLe,
            eleveIds: (caseGroupe.checked && groupe.length) ? groupe : null
        });
        await ajouterSeances(seances);
        modal.close();
        showToast(seances.length > 1
            ? `Donné à ${seances.length} classes.`
            : `Donné à ${seances[0].classeNom}.`, 'success');
        if (onDonne) onDonne(seances);
    };

    rafraichir();
    return modal;
}
