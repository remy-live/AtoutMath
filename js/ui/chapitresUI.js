// Le tableau de classement : ranger les exercices dans les chapitres.
//
// UNE LIGNE PAR EXERCICE, UNE COLONNE PAR CHAPITRE, et trois états de case.
// Le professeur ne remplit pas ce tableau, il le RELIT : les propositions y
// sont déjà, déduites des compétences que chaque exercice déclare. Il confirme
// ce qui est juste, retire ce qui ne l'est pas, et ajoute ce que la déduction
// n'a pas vu. Une soirée de saisie devient vingt minutes de relecture.
//
// L'EN-TÊTE DE COLONNE PORTE LE NUMÉRO, pas le nom entier. Douze à dix-neuf
// chapitres ne tiennent pas côte à côte en toutes lettres, et incliner les
// titres à quarante-cinq degrés rend le tableau illisible sur une tablette.
// Le nom complet vit dans l'infobulle et dans la fiche de droite.
//
// Chargé à la demande depuis la barre d'outils : un professeur qui monte un
// parcours n'a pas besoin de cet écran, et il lit tout le catalogue.

import { exercices, skillsOf } from '../data/catalog.js';
import { TAGS } from '../data/tags.js';
import { skillLabel } from '../data/skills.js';
import {
    chapitresDuNiveau, competencesDuChapitre, getClassement, saveClassement,
    etatCase, basculer, confirmerLeChapitre, chapitresDe, resume
} from '../core/chapitres.js';
import { showToast } from './modal.js';

const NIVEAUX = [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME];
const DOMAINES = Object.values(TAGS.DOMAINE);

// Ce que l'écran retient d'une ouverture à l'autre — jamais enregistré : ce
// sont des filtres de lecture, pas des réglages.
let vue = { niveau: TAGS.NIVEAU.SIXIEME, domaine: '', aRelire: false, choisi: null };

export function ouvrirChapitres() {
    let overlay = document.getElementById('chapitres-modal');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'chapitres-modal';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="glass-panel chap-panneau">
            <div class="modal-header">
                <h3 class="modal-title">Mes chapitres</h3>
                <button class="modal-close-btn" id="chap-fermer" aria-label="Fermer">&times;</button>
            </div>

            <p class="modal-text">Les cases en pointillé sont des <strong>propositions</strong>, déduites de
                ce que chaque exercice travaille. Clique pour confirmer, clique encore pour retirer.
                Un clic sur le numéro d'une colonne confirme tout le chapitre.</p>

            <div class="chap-barre">
                <select id="chap-niveau" class="cfg-input" aria-label="Niveau"></select>
                <select id="chap-domaine" class="cfg-input" aria-label="Domaine"></select>
                <label class="cfg-check chap-filtre-relire">
                    <input type="checkbox" id="chap-a-relire"> À relire seulement
                </label>
                <span class="chap-compteur" id="chap-compteur"></span>
                <button class="btn-toggle glass-btn" id="chap-tout">Tout confirmer</button>
            </div>

            <div class="chap-corps">
                <div class="chap-cadre">
                    <table class="chap-table">
                        <thead><tr id="chap-entete"></tr></thead>
                        <tbody id="chap-lignes"></tbody>
                    </table>
                    <p class="chap-vide" id="chap-rien" hidden>Aucun exercice ne correspond à ces filtres.</p>
                </div>
                <aside class="chap-fiche" id="chap-fiche" aria-live="polite"></aside>
            </div>

            <div class="chap-legende">
                <span class="chap-leg"><span class="chap-marque chap-marque--oui">✓</span> Confirmé</span>
                <span class="chap-leg"><span class="chap-marque chap-marque--propose">✓</span> Proposé, à relire</span>
                <span class="chap-leg"><span class="chap-marque chap-marque--non"></span> Hors du chapitre</span>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    remplirSelects(overlay);
    overlay.querySelector('#chap-fermer').onclick = () => overlay.remove();
    overlay.querySelector('#chap-niveau').onchange = (e) => { vue.niveau = e.target.value; vue.choisi = null; dessiner(overlay); };
    overlay.querySelector('#chap-domaine').onchange = (e) => { vue.domaine = e.target.value; dessiner(overlay); };
    overlay.querySelector('#chap-a-relire').onchange = (e) => { vue.aRelire = e.target.checked; dessiner(overlay); };
    overlay.querySelector('#chap-tout').onclick = () => toutConfirmer(overlay);

    dessiner(overlay);
}

function remplirSelects(overlay) {
    const niv = overlay.querySelector('#chap-niveau');
    niv.innerHTML = NIVEAUX.map(n =>
        `<option value="${n}"${n === vue.niveau ? ' selected' : ''}>${n}</option>`).join('');
    const dom = overlay.querySelector('#chap-domaine');
    dom.innerHTML = `<option value="">Tous les domaines</option>` + DOMAINES.map(d =>
        `<option value="${escapeHtml(d)}"${d === vue.domaine ? ' selected' : ''}>${escapeHtml(d)}</option>`).join('');
    overlay.querySelector('#chap-a-relire').checked = vue.aRelire;
}

/**
 * Les exercices montrés. Le niveau filtre par les étiquettes de l'exercice :
 * un exercice de 4ᵉ n'a rien à faire dans la progression de 6ᵉ, et le tableau
 * serait deux fois trop long si l'on montrait tout à chaque fois.
 */
function lignesVisibles(chaps, classement) {
    return exercices.filter(exo => {
        const niveaux = (exo.tags && exo.tags.niveaux) || [];
        if (!niveaux.includes(vue.niveau)) return false;
        if (vue.domaine && (exo.tags.chemin || [])[0] !== vue.domaine) return false;
        if (vue.aRelire && !chaps.some(c => etatCase(exo, c, classement) === 'propose')) return false;
        return true;
    });
}

function dessiner(overlay) {
    const classement = getClassement();
    const chaps = chapitresDuNiveau(vue.niveau);
    const lignes = lignesVisibles(chaps, classement);

    dessinerEntete(overlay, chaps, classement);
    dessinerLignes(overlay, chaps, lignes, classement);

    const rien = overlay.querySelector('#chap-rien');
    rien.hidden = lignes.length > 0;
    rien.textContent = vue.aRelire
        ? 'Plus rien à relire ici : tout est confirmé ou écarté.'
        : 'Aucun exercice ne correspond à ces filtres.';

    const r = resume(vue.niveau, exercices, classement);
    const c = overlay.querySelector('#chap-compteur');
    c.textContent = r.proposes
        ? `${r.proposes} à relire`
        : `${r.confirmes} case${r.confirmes > 1 ? 's' : ''} confirmée${r.confirmes > 1 ? 's' : ''}`;
    c.classList.toggle('chap-compteur--fini', !r.proposes);
    overlay.querySelector('#chap-tout').disabled = !r.proposes;

    dessinerFiche(overlay, chaps, classement);
}

function dessinerEntete(overlay, chaps, classement) {
    const tr = overlay.querySelector('#chap-entete');
    tr.innerHTML = '';

    const th = document.createElement('th');
    th.className = 'chap-col-nom';
    th.scope = 'col';
    th.textContent = 'Exercice';
    tr.appendChild(th);

    chaps.forEach((chap, i) => {
        const cel = document.createElement('th');
        cel.className = 'chap-col';
        cel.scope = 'col';
        const nb = competencesDuChapitre(chap).length;
        const b = document.createElement('button');
        b.className = 'chap-tete';
        b.title = `${chap.nom} — ${nb ? nb + ' compétence' + (nb > 1 ? 's' : '') : 'aucun exercice pour ce chapitre'}`
            + '\nCliquer : confirmer toutes les propositions de la colonne.';
        b.innerHTML = `<span class="chap-num">${i + 1}</span><span class="chap-court">${escapeHtml(court(chap.nom))}</span>`;
        if (!nb) b.classList.add('chap-tete--vide');
        b.onclick = () => {
            saveClassement(confirmerLeChapitre(chap, exercices, getClassement()));
            vue.choisi = { type: 'chapitre', id: chap.id };
            dessiner(overlay);
        };
        cel.appendChild(b);
        tr.appendChild(cel);
    });
}

function dessinerLignes(overlay, chaps, lignes, classement) {
    const corps = overlay.querySelector('#chap-lignes');
    corps.innerHTML = '';

    lignes.forEach(exo => {
        const tr = document.createElement('tr');
        if (vue.choisi && vue.choisi.type === 'exercice' && vue.choisi.id === exo.id) {
            tr.className = 'chap-ligne--choisie';
        }

        const td = document.createElement('td');
        td.className = 'chap-nom';
        const bNom = document.createElement('button');
        bNom.className = 'chap-nom-btn';
        bNom.innerHTML = `<span class="chap-titre"></span><span class="chap-chemin"></span>`;
        bNom.querySelector('.chap-titre').textContent = exo.title;
        bNom.querySelector('.chap-chemin').textContent = (exo.tags.chemin || []).join(' › ');
        if (exo.horsProgression) {
            const et = document.createElement('span');
            et.className = 'chap-etiquette';
            et.textContent = 'hors progression';
            bNom.appendChild(et);
        }
        bNom.onclick = () => { vue.choisi = { type: 'exercice', id: exo.id }; dessiner(overlay); };
        td.appendChild(bNom);
        tr.appendChild(td);

        chaps.forEach(chap => {
            const cel = document.createElement('td');
            const etat = etatCase(exo, chap, classement);
            const b = document.createElement('button');
            b.className = 'chap-case';
            b.dataset.etat = etat;
            b.setAttribute('aria-label', `${exo.title} — ${chap.nom} : `
                + (etat === 'oui' ? 'confirmé' : etat === 'propose' ? 'proposé, à relire' : 'hors du chapitre'));
            b.innerHTML = `<span class="chap-marque chap-marque--${etat}">✓</span>`;
            b.onclick = () => {
                saveClassement(basculer(exo, chap, getClassement()));
                vue.choisi = { type: 'exercice', id: exo.id };
                dessiner(overlay);
            };
            cel.appendChild(b);
            tr.appendChild(cel);
        });

        corps.appendChild(tr);
    });
}

function dessinerFiche(overlay, chaps, classement) {
    const fiche = overlay.querySelector('#chap-fiche');
    const choix = vue.choisi;

    if (!choix) {
        const vides = chaps.filter(c => !competencesDuChapitre(c).length);
        fiche.innerHTML = `
            <h4 class="chap-fiche-titre">La progression de ${escapeHtml(vue.niveau)}</h4>
            <p class="chap-fiche-texte">${chaps.length} chapitres. Clique sur un exercice ou sur
                un numéro de colonne pour voir le détail.</p>
            ${vides.length ? `
                <div class="chap-bloc-titre">Chapitres sans exercice <span class="chap-n">${vides.length}</span></div>
                <p class="chap-fiche-texte">${vides.map(c => escapeHtml(c.nom)).join(', ')}.
                    Ce n'est pas une panne : ce sont les notions qu'AtoutMath ne couvre pas encore.</p>` : ''}`;
        return;
    }

    if (choix.type === 'chapitre') {
        const chap = chaps.find(c => c.id === choix.id);
        if (!chap) { fiche.innerHTML = ''; return; }
        const comps = competencesDuChapitre(chap);
        fiche.innerHTML = `
            <h4 class="chap-fiche-titre">${escapeHtml(chap.nom)}</h4>
            <div class="chap-bloc-titre">Compétences du chapitre <span class="chap-n">${comps.length}</span></div>
            ${listeComp(comps)}`;
        return;
    }

    const exo = exercices.find(e => e.id === choix.id);
    if (!exo) { fiche.innerHTML = ''; return; }
    const siens = chapitresDe(exo, classement).filter(c => c.niveau === vue.niveau);
    fiche.innerHTML = `
        <h4 class="chap-fiche-titre">${escapeHtml(exo.title)}</h4>
        <div class="chap-bloc-titre">Ses chapitres <span class="chap-n">${siens.length}</span></div>
        ${siens.length
            ? `<ul class="chap-liste">${siens.map(c => `<li>${escapeHtml(c.nom)}</li>`).join('')}</ul>`
            : `<p class="chap-fiche-texte">${exo.horsProgression
                ? 'Jeu de la réserve : il ne travaille aucune notion du programme.'
                : 'Rangé nulle part pour l\'instant — coche une case de sa ligne.'}</p>`}
        <div class="chap-bloc-titre">Ce qu'il travaille <span class="chap-n">${skillsOf(exo).length}</span></div>
        ${listeComp(skillsOf(exo))}`;
}

function listeComp(ids) {
    if (!ids.length) return `<p class="chap-fiche-texte">Aucune compétence déclarée.</p>`;
    return `<div class="chap-comps">${ids.map(id => `
        <div class="chap-comp">
            <span class="chap-comp-lab">${escapeHtml(skillLabel(id))}</span>
            <span class="chap-comp-id">${escapeHtml(id)}</span>
        </div>`).join('')}</div>`;
}

function toutConfirmer(overlay) {
    const chaps = chapitresDuNiveau(vue.niveau);
    let classement = getClassement();
    chaps.forEach(chap => { classement = confirmerLeChapitre(chap, exercices, classement); });
    saveClassement(classement);
    dessiner(overlay);
    showToast(`Toutes les propositions de ${vue.niveau} sont confirmées.`, 'success');
}

/**
 * Le nom raccourci d'un chapitre pour l'en-tête. On coupe aux mots vides
 * plutôt qu'au nombre de lettres : « Nombres entiers et décimaux » devient
 * « Nombres entiers », et non « Nombres enti… ».
 */
function court(nom) {
    // « Les angles » perd son article et doit reprendre sa majuscule : un
    // en-tête qui commence en minuscule se lit comme une faute.
    const sansArticle = nom.replace(/^(Les|La|Le|L')\s*/i, '');
    const majuscule = sansArticle.charAt(0).toUpperCase() + sansArticle.slice(1);
    const mots = majuscule.split(/\s+/);
    if (mots.length <= 2) return majuscule;
    const coupe = mots.findIndex(m => /^(et|de|des|du|à|aux|en)$/i.test(m));
    return (coupe > 0 ? mots.slice(0, coupe) : mots.slice(0, 2)).join(' ');
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
