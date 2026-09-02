// L'ENGRENAGE DU PARCOURS — « à qui c'est donné », en permanence sous les yeux.
//
// Rémy : « À côté du parcours fait par le professeur, on pourrait avoir un
// engrenage et cela se met à la place des paramètres. Sur l'ordinateur donc à
// droite pour savoir les classes à qui c'est attribué, on a une checkbox devant
// les classes et la possibilité de dérouler les classes […]. Et si la séance a
// été faite, on peut avoir à côté de la classe ou de l'élève un lien pour avoir
// le bilan. On pourrait d'ailleurs y mettre en premier le mode de la séance. »
//
// CE QUE CELA CHANGE, ET POURQUOI ÇA VALAIT LE DÉTOUR.
//
// « Donner à une classe » était une BOÎTE DE DIALOGUE : un geste sans mémoire.
// On l'ouvrait, on donnait, elle disparaissait — et plus rien à l'écran ne
// disait à qui ce parcours avait été donné. Pour le savoir il fallait aller
// dans un autre écran et recouper deux listes. Le panneau transforme un geste
// en ÉTAT VISIBLE : on ouvre, on voit. C'est la différence entre envoyer un
// courrier et regarder sa liste de diffusion.
//
// UN SEUL BOUTON, DONC. Le panneau remplace la boîte : deux commandes qui font
// la même chose, c'est là qu'on hésite, et hésiter coûte plus cher que le
// deuxième clic qu'on croyait épargner.
//
// LA CASE À COCHER NE SUPPRIME PAS DU TRAVAIL. C'est le seul endroit où je ne
// suis pas la demande à la lettre. Une case, ça se décoche par mégarde ; si
// décocher effaçait la séance, un clic de trop emporterait le bilan de
// vingt-six élèves. Donc : décocher une classe qui n'a rien commencé supprime
// la séance — il n'y a rien à protéger ; décocher une classe qui a travaillé la
// RETIRE — elle quitte l'écran des élèves, son bilan reste, et la case grise se
// recoche. Voir `retirer` dans core/seances.js.
//
// LE MODE EST EN HAUT parce qu'il change ce que le bilan VEUT DIRE. Un tableau
// d'entraînement se lit « où en sont-ils » ; le même tableau en évaluation se
// lit « qu'est-ce que je note ». Lire l'un pour l'autre est l'erreur la plus
// coûteuse de l'écran, et elle se prévient d'une ligne.

import { showToast, showConfirm, showAlert } from './modal.js';
import { MODES, resolvePolicy } from '../core/policy.js';
import { Shortcodes } from '../core/shortcodes.js';
import {
    donnerSeance, seancesDe, etatSeance, direSeance, ETATS,
    clore, rouvrir, retirer, remettre, estRetiree, elevesDe
} from '../core/seances.js';
import { bilanSeance, bilanEleveSeance, aTravaille } from '../core/bilanSeance.js';
import { lireClasses, lireSeances, ecrireSeances } from './donnerSeance.js';
import { couleurNiveau, consigneDe, consigneClasse } from '../core/bilan.js';
import { LEVELS } from '../core/mastery.js';

/**
 * LE NIVEAU D'UN TAUX MOYEN, pour teinter la jauge d'une colonne.
 *
 * On réutilise les seuils de l'échelle de maîtrise plutôt que d'inventer un
 * dégradé : la couleur d'une colonne doit vouloir dire la même chose que la
 * couleur d'une case chez un élève, sinon le tableau ment.
 */
const niveauDeTaux = (x) => {
    const ordre = ['E', 'A', 'EC', 'NA'];
    return ordre.find(k => LEVELS[k] && (x || 0) >= (LEVELS[k].min || 0)) || 'NA';
};

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LIBELLE_MODE = {
    [MODES.APPRENTISSAGE]: 'Apprentissage',
    [MODES.ENTRAINEMENT]: 'Entraînement',
    [MODES.EVALUATION]: 'Évaluation'
};

// CE QUE LE MODE PROMET, en une phrase. Le nom seul ne suffit pas : « mode
// apprentissage » ne dit pas qu'on y montre la solution, et c'est pourtant ce
// qui décide si l'on peut noter.
const DIT_MODE = {
    [MODES.APPRENTISSAGE]: 'La leçon est ouverte, le robot explique. Rien ne se note.',
    [MODES.ENTRAINEMENT]: 'Plusieurs essais, des indices. Le bilan dit où ils en sont.',
    [MODES.EVALUATION]: 'Un seul essai, pas d\'aide. Le bilan est une note.'
};

const NIVEAU_MOT = { NA: 'Non acquis', EC: 'En cours', A: 'Acquis', E: 'Expert' };

/** La classe telle que le bilan la veut : ses élèves avec leurs journaux. */
function pourcent(x) { return Math.round((x || 0) * 100) + ' %'; }

/**
 * L'ÉTAT D'UNE CLASSE VIS-À-VIS DE CE PARCOURS.
 *
 * Trois cas seulement, et ils commandent toute la ligne :
 *   · pas de séance          → case vide, on peut donner ;
 *   · séance vivante         → case cochée, état et bilan ;
 *   · séance retirée         → case vide et grise, bilan encore là.
 */
function etatClasse(classe, seances, pathId, maintenant = Date.now()) {
    const siennes = seancesDe(seances, classe.id).filter(s => s.pathId === pathId);
    const vivante = siennes.find(s => !estRetiree(s)) || null;
    const retiree = siennes.find(s => estRetiree(s)) || null;
    const seance = vivante || retiree;
    return {
        seance,
        donnee: !!vivante,
        retiree: !!retiree && !vivante,
        etat: seance ? etatSeance(seance, maintenant) : null,
        travaille: seance ? (classe.eleves || []).some(e => aTravaille(seance, e.evenements || [])) : false
    };
}

const PUCE = {
    [ETATS.A_VENIR]: ['À venir', 'pc-attente'],
    [ETATS.EN_COURS]: ['En cours', 'pc-vif'],
    [ETATS.CLOSE]: ['Close', 'pc-calme']
};

function ligneClasseHtml(classe, info) {
    const n = (classe.eleves || []).length;
    const puce = info.etat ? PUCE[info.etat] : null;
    return `
    <div class="pc-classe${info.retiree ? ' pc-classe--retiree' : ''}" data-classe="${esc(classe.id)}">
        <div class="pc-ligne">
            <label class="pc-case">
                <input type="checkbox" data-donner="${esc(classe.id)}"${info.donnee ? ' checked' : ''}>
                <span class="pc-nom">${esc(classe.nom)}</span>
            </label>
            <span class="pc-eff">${n}</span>
            ${puce ? `<span class="pc-puce ${puce[1]}">${puce[0]}</span>` : ''}
            ${info.travaille
        ? `<button type="button" class="pc-bilan" data-bilan-classe="${esc(classe.id)}"
                   title="Le bilan de cette séance, et de cette séance seulement">bilan</button>` : ''}
            ${info.donnee && info.etat !== ETATS.A_VENIR
        ? `<button type="button" class="pc-clore" data-clore="${esc(classe.id)}"
                   title="${info.etat === ETATS.CLOSE
            ? 'Rouvrir la fenêtre notée'
            : 'C\'est fini : la note ne bouge plus. La séance reste ouverte à l\'entraînement.'}"
                   >${info.etat === ETATS.CLOSE ? 'rouvrir' : 'clore'}</button>` : ''}
            <button type="button" class="pc-plier" data-plier="${esc(classe.id)}"
                aria-expanded="false" aria-label="Voir les élèves de ${esc(classe.nom)}">▸</button>
        </div>
        ${info.seance ? `<div class="pc-etat">${esc(direSeance(info.seance))}</div>` : ''}
        <div class="pc-eleves" hidden></div>
    </div>`;
}

/**
 * LA LISTE DES ÉLÈVES D'UNE CLASSE, dépliée.
 *
 * ON N'AFFICHE QUE LES ÉLÈVES CONCERNÉS quand la séance vise un groupe : dix-huit
 * lignes vides feraient croire à dix-huit absents.
 */
function elevesHtml(classe, info) {
    const liste = info.seance ? elevesDe(info.seance, classe) : (classe.eleves || []);
    if (!liste.length) return '<p class="pc-vide">Aucun élève dans cette classe.</p>';
    return [...liste]
        .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'))
        .map(e => {
            const fait = info.seance && aTravaille(info.seance, e.evenements || []);
            const b = fait ? bilanEleveSeance(info.seance, e) : null;
            return `<div class="pc-eleve">
                <span class="pc-eleve-nom">${esc(e.nom)}</span>
                ${b ? `<span class="pc-chiffre">${b.questions} q · ${pourcent(b.reussite)}</span>` : ''}
                ${b ? `<button type="button" class="pc-bilan" data-bilan-eleve="${esc(e.id)}"
                        data-classe="${esc(classe.id)}">bilan</button>`
        : '<span class="pc-rien">n\'a pas commencé</span>'}
            </div>`;
        }).join('');
}

/**
 * LES ÉLÈVES DU BILAN, DANS L'ORDRE OÙ ON LES REGARDE.
 *
 * Pas l'ordre alphabétique, ni celui de la classe : LES PLUS EN PEINE D'ABORD.
 * Un bilan se lit pour décider qui aider lundi, et la seule chose qu'on cherche
 * est en haut. Ceux qui n'ont rien fait passent à la fin — leur problème n'est
 * pas la notion, et les mettre en tête (0 % de réussite) reléguerait derrière
 * eux ceux qui ont travaillé sans y arriver, c'est-à-dire précisément ceux à
 * qui il faut parler.
 */
function classer(eleves) {
    const faits = eleves.filter(e => e.questions);
    const muets = eleves.filter(e => !e.questions);
    return [...faits.sort((a, b) => a.reussite - b.reussite),
        ...muets.sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'))];
}

/** Le bilan d'une séance, tel qu'on le lit après le cours. */
function bilanClasseHtml(b) {
    const cols = b.competences.slice(0, 8);
    return `
    <div class="pc-rapport">
        <h4>${esc(b.titre)} — ${esc(b.nom)}</h4>
        <p class="pc-resume">${b.commences}/${b.attendus} ont ouvert la séance ·
            ${pourcent(b.moyenneReussite)} de réussite moyenne</p>
        <!-- CE QU'ON FAIT DE TOUTE LA CLASSE, en tête : c'est la phrase qui
             décide de l'heure suivante, et elle ne doit pas se chercher. -->
        <p class="pc-consigne">${esc(consigneClasse(b))}</p>
        <p class="pc-phrase">${esc(b.phrase)}</p>
        ${cols.length ? `<table class="pc-table">
            <thead><tr><th>Notion</th><th>Moyenne</th><th>En peine</th></tr></thead>
            <tbody>${cols.map(c => `<tr>
                <td>${esc(c.nom)}</td>
                <!-- LA COULEUR EST CELLE DE L'ÉCHELLE DE MAÎTRISE, pas un
                     dégradé décoratif : c'est la même sur l'écran de l'élève,
                     dans le tableau de classe et sur le PDF. -->
                <td><span class="pc-jauge" style="--part:${Math.round(c.moyenne * 100)}%;
                    --teinte:${couleurNiveau(niveauDeTaux(c.moyenne))}"></span>
                    ${pourcent(c.moyenne)}</td>
                <td class="${c.enPeine >= 0.5 ? 'pc-rouge' : ''}">${Math.round(c.enPeine * 100)} %</td>
            </tr>`).join('')}</tbody>
        </table>` : '<p class="pc-vide">Pas encore assez de réponses pour dire quoi que ce soit.</p>'}
        <h5>Les élèves — une ligne, une chose à faire</h5>
        <div class="pc-eleves-bilan">${classer(b.eleves).map(e => `
            <button type="button" class="pc-eleve pc-eleve--clic" data-detail="${esc(e.id)}"
                title="Voir le détail de ${esc(e.nom)}">
                <span class="pc-eleve-nom">${esc(e.nom)}</span>
                <span class="pc-consigne-eleve">${esc(consigneDe(e))}</span>
                <span class="pc-chiffre">${e.questions ? `${e.questions} q · ${pourcent(e.reussite)}`
        : ''}</span>
                ${e.mot ? `<span class="pc-mot">${esc(e.mot)}</span>` : ''}
            </button>`).join('')}</div>
        <button type="button" class="pc-pdf" data-pdf>📄 Exporter ce bilan en PDF</button>
    </div>`;
}

/** Le bilan d'un élève sur cette séance : ce qu'on lit avant de lui parler. */
function bilanEleveHtml(b) {
    const c = b.competences.filter(x => x.fiable).slice(0, 6);
    return `
    <div class="pc-rapport">
        <h4>${esc(b.nom)}</h4>
        <p class="pc-resume">${b.questions} question${b.questions > 1 ? 's' : ''} ·
            ${pourcent(b.reussite)} de réussite${b.reprises ? ` · ${b.reprises} trouvée${b.reprises > 1 ? 's' : ''} au second essai` : ''}</p>
        ${b.inacheve ? `<p class="pc-alerte">Arrêté en chemin — ${b.etapesInachevees} étape${b.etapesInachevees > 1 ? 's' : ''} faite${b.etapesInachevees > 1 ? 's' : ''}.</p>` : ''}
        ${c.length ? `<ul class="pc-liste">${c.map(x => `<li>
            <span class="pc-pastille" style="background:${couleurNiveau(x.niveau)}"></span>
            ${esc(x.nom)} — ${NIVEAU_MOT[x.niveau] || x.niveau} (${x.justes}/${x.essais})
        </li>`).join('')}</ul>` : '<p class="pc-vide">Trop peu de réponses pour conclure.</p>'}
        ${b.aRevoir.length ? `<h5>À revoir</h5><ul class="pc-liste">${b.aRevoir.slice(0, 4)
        .map(e => `<li>${esc(e.questionText || e.exerciseTitle || 'question')}${e.count > 1 ? ` — ${e.count} fois` : ''}</li>`).join('')}</ul>` : ''}
        ${b.mot ? `<p class="pc-mot">« ${esc(b.mot)} »</p>` : ''}
    </div>`;
}

/**
 * OUVRIR LE PANNEAU, à la place des propriétés d'étape.
 *
 * @param {Object} parcours     le modèle en cours d'édition
 * @param {Function} [onChange] appelé quand le mode change, pour réafficher
 */
export async function ouvrirPanneauClasses(parcours, onChange) {
    const panel = document.getElementById('builder-properties-panel');
    if (!panel) return;

    if (!parcours || !(parcours.steps || []).length) {
        return showAlert('Ajoutez au moins une activité avant de donner ce parcours.');
    }

    const classes = await lireClasses();
    let seances = await lireSeances();
    const pathId = parcours.id;

    const dessiner = () => {
        const mode = resolvePolicy(parcours.policy).mode;
        const infos = new Map(classes.map(c => [c.id, etatClasse(c, seances, pathId)]));
        const donnees = classes.filter(c => infos.get(c.id).donnee);

        panel.innerHTML = `
            <button id="mob-close-props" class="props-close" aria-label="Fermer">✕</button>
            <h3 class="props-title">À qui ce parcours est donné</h3>
            <div class="pc-boite">
                <!-- LE MODE EN PREMIER : il décide de ce que le bilan veut dire. -->
                <label class="pc-mode">
                    <span class="pc-mode-nom">Mode de la séance</span>
                    <select class="pc-mode-select" data-mode>
                        ${Object.entries(LIBELLE_MODE).map(([v, t]) =>
            `<option value="${v}"${v === mode ? ' selected' : ''}>${t}</option>`).join('')}
                    </select>
                </label>
                <p class="pc-mode-dit">${esc(DIT_MODE[mode] || '')}</p>

                ${classes.length ? `<div class="pc-classes">
                    ${classes.map(c => ligneClasseHtml(c, infos.get(c.id))).join('')}
                </div>` : `<p class="pc-vide">Vous n'avez pas encore de classe.
                    Créez-en une dans <b>Mes outils → Mes classes</b>.</p>`}

                <p class="pc-compte" role="status" aria-live="polite">${donnees.length
                ? `Donné à ${donnees.length} classe${donnees.length > 1 ? 's' : ''} — ${donnees
                    .reduce((n, c) => n + (c.eleves || []).length, 0)} élèves.`
                : 'Pas encore donné. Cochez une classe.'}</p>
                <div class="pc-rapport-zone" hidden></div>
            </div>`;
        panel.classList.add('mob-open');
        brancher();
    };

    const zone = () => panel.querySelector('.pc-rapport-zone');

    function montrer(html, contexte) {
        const z = zone();
        if (!z) return;
        z.innerHTML = html + '<button type="button" class="pc-fermer-rapport">Fermer le bilan</button>';
        z.hidden = false;
        z.querySelector('.pc-fermer-rapport').onclick = () => { z.hidden = true; z.innerHTML = ''; };

        // CLIQUER UN ÉLÈVE OUVRE SON DÉTAIL. Rémy : « dans la liste d'élèves
        // dans le bilan, permets de cliquer sur l'élève pour avoir des
        // détails ». La ligne du tableau dit QUOI FAIRE ; le détail dit
        // pourquoi — les compétences, les erreurs qui restent, le mot qu'on lui
        // a laissé. On lit la première pour balayer, le second avant de parler
        // à l'élève.
        if (contexte) {
            z.querySelectorAll('[data-detail]').forEach(el => {
                el.onclick = () => {
                    const eleve = (contexte.classe.eleves || [])
                        .find(x => x.id === el.dataset.detail);
                    if (!eleve) return;
                    montrer(bilanEleveHtml(bilanEleveSeance(contexte.seance, eleve))
                        + `<button type="button" class="pc-retour" data-retour>← Revenir à la classe</button>`,
                    contexte);
                };
            });
            const retour = z.querySelector('[data-retour]');
            if (retour) retour.onclick = () => montrer(
                bilanClasseHtml(bilanSeance(contexte.seance, contexte.classe)), contexte);

            const pdf = z.querySelector('[data-pdf]');
            if (pdf) pdf.onclick = async () => {
                pdf.disabled = true;
                pdf.textContent = 'Préparation du PDF…';
                try {
                    const { exporterBilanPdf } = await import('./bilanPdf.js');
                    await exporterBilanPdf(bilanSeance(contexte.seance, contexte.classe));
                    showToast('Bilan exporté en PDF.', 'success');
                } catch (e) {
                    showToast('Le PDF n\'a pas pu être produit.', 'error');
                } finally {
                    pdf.disabled = false;
                    pdf.textContent = '📄 Exporter ce bilan en PDF';
                }
            };
        }
        z.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    async function enregistrer() {
        await ecrireSeances(seances);
    }

    function brancher() {
        const close = panel.querySelector('#mob-close-props');
        if (close) close.onclick = () => panel.classList.remove('mob-open');

        const sel = panel.querySelector('[data-mode]');
        if (sel) sel.onchange = () => {
            parcours.policy = { ...(parcours.policy || {}), mode: sel.value };
            if (onChange) onChange(parcours);
            dessiner();
        };

        panel.querySelectorAll('[data-plier]').forEach(b => {
            b.onclick = () => {
                const bloc = b.closest('.pc-classe');
                const liste = bloc.querySelector('.pc-eleves');
                const ouvert = !liste.hidden;
                if (ouvert) { liste.hidden = true; b.textContent = '▸'; b.setAttribute('aria-expanded', 'false'); return; }
                const classe = classes.find(c => c.id === b.dataset.plier);
                liste.innerHTML = elevesHtml(classe, etatClasse(classe, seances, pathId));
                liste.hidden = false;
                b.textContent = '▾';
                b.setAttribute('aria-expanded', 'true');
                brancherBilansEleves(liste, classe);
            };
        });

        panel.querySelectorAll('[data-donner]').forEach(c => {
            c.onchange = () => basculer(classes.find(x => x.id === c.dataset.donner), c);
        });

        // CLORE, C'EST DÉCIDER DE LA FIN. Rémy : « je pourrai pendant la séance
        // (vers la fin) envoyer un message au serveur pour dire que c'est fini
        // […]. En gros je décide de la fin. » Le geste se fait donc d'ici, à
        // côté du bilan qu'il va lire dans la foulée — et non dans un écran
        // qu'il faudrait ouvrir en sortant de cours.
        //
        // CLORE NE COUPE RIEN : ça pose une frontière dans le temps. La séance
        // reste ouverte à l'entraînement, c'est la fenêtre NOTÉE qui se ferme.
        panel.querySelectorAll('[data-clore]').forEach(b => {
            b.onclick = async () => {
                const classe = classes.find(c => c.id === b.dataset.clore);
                const info = etatClasse(classe, seances, pathId);
                if (!info.seance) return;
                const ferme = info.etat === ETATS.CLOSE;
                seances = seances.map(x => (x.id === info.seance.id
                    ? (ferme ? rouvrir(x) : clore(x)) : x));
                await enregistrer();
                showToast(ferme
                    ? `${classe.nom} : séance rouverte.`
                    : `${classe.nom} : c'est fini. La note ne bouge plus, `
                    + 'l\'entraînement reste ouvert.', 'success');
                dessiner();
            };
        });

        panel.querySelectorAll('[data-bilan-classe]').forEach(b => {
            b.onclick = () => {
                const classe = classes.find(c => c.id === b.dataset.bilanClasse);
                const info = etatClasse(classe, seances, pathId);
                if (!info.seance) return;
                montrer(bilanClasseHtml(bilanSeance(info.seance, classe)),
                    { seance: info.seance, classe });
            };
        });
    }

    function brancherBilansEleves(liste, classe) {
        liste.querySelectorAll('[data-bilan-eleve]').forEach(b => {
            b.onclick = () => {
                const info = etatClasse(classe, seances, pathId);
                const eleve = (classe.eleves || []).find(e => e.id === b.dataset.bilanEleve);
                if (!info.seance || !eleve) return;
                montrer(bilanEleveHtml(bilanEleveSeance(info.seance, eleve)));
            };
        });
    }

    /**
     * COCHER DONNE, DÉCOCHER RETIRE — et la nuance est dans `retirer`.
     */
    async function basculer(classe, caseEl) {
        if (!classe) return;
        const info = etatClasse(classe, seances, pathId);

        if (caseEl.checked) {
            if (info.retiree) {
                // Elle existait, on la remet : les bilans reprennent leur place.
                seances = seances.map(s => (s.id === info.seance.id ? remettre(s) : s));
                showToast(`${classe.nom} : séance remise.`, 'success');
            } else {
                // LE CODE VOYAGE AVEC LA SÉANCE même quand la classe est
                // rattachée : il sauve le cas de l'élève sur un poste inconnu.
                seances = [...seances, donnerSeance(classe, parcours, {
                    code: Shortcodes.encodePath(parcours)
                })];
                showToast(`Donné à ${classe.nom}.`, 'success');
            }
        } else if (info.seance) {
            if (info.travaille) {
                // ON NE SUPPRIME PAS DU TRAVAIL. On retire, et on le dit.
                seances = seances.map(s => (s.id === info.seance.id ? retirer(s) : s));
                showToast(`${classe.nom} : séance retirée. Le bilan reste consultable.`, 'info');
            } else {
                // PERSONNE N'A OUVERT : là, on supprime pour de bon — il n'y a
                // rien à protéger, et une séance fantôme encombrerait la liste
                // de la classe. On demande quand même : c'est irréversible.
                //
                // La case reste cochée tant que ce n'est pas confirmé ; c'est
                // le redessin qui la décoche. Annuler ne laisse donc aucune
                // trace, et il n'y a pas de branche « remettre la case » à
                // tenir à jour.
                caseEl.checked = true;
                showConfirm(
                    `Retirer ce parcours à ${esc(classe.nom)} ? Personne n'a encore commencé.`,
                    async () => {
                        seances = seances.filter(x => x.id !== info.seance.id);
                        await enregistrer();
                        dessiner();
                    });
                return;
            }
        }
        await enregistrer();
        dessiner();
    }

    dessiner();
    return panel;
}

