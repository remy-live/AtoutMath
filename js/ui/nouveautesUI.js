// LE BANC D'ESSAI DES NOUVEAUTÉS.
//
// Rémy : « dans la barre, j'aimerais bien une option qui permet de tester les
// derniers exercices que tu m'as proposés ». Entre deux séances, on ne se
// souvient pas de ce qui vient d'arriver, et retrouver trois exercices neufs
// dans un catalogue de cent est plus long que de les essayer.
//
// UN ESSAI N'EST PAS UNE SÉANCE. Ce qu'on lance ici est court — quatre
// questions —, on peut circuler d'une étape à l'autre sans avoir à les réussir,
// et surtout RIEN N'EST ÉCRIT AU JOURNAL. Sans cela, essayer trois exercices
// sur la tablette d'un élève lui poserait trois parcours, une poignée d'erreurs
// au carnet et autant de bruit dans son modèle de maîtrise — et rien ne le
// dirait. C'est le drapeau `essai` du Runner qui coupe les écritures ; l'essai
// se joue à la main, exactement comme l'exercice réel.
//
// DEUX BOUTONS PAR EXERCICE, parce qu'il y a deux façons de s'en servir :
// l'ESSAYER à l'écran, et voir LA FICHE qu'il imprimera. Le second n'apparaît
// que pour les exercices qui savent s'imprimer — un bouton qui ne fait rien
// est pire que pas de bouton.

import { direLaDate, vaguesDuCatalogue } from '../data/nouveautes.js';
import { getExerciseById } from '../data/catalog.js';
import { makePath, makeStep } from '../core/path.js';

const QUESTIONS_D_ESSAI = 4;

let ouvert = null;

export function fermerNouveautes() {
    if (ouvert && ouvert.parentNode) ouvert.parentNode.removeChild(ouvert);
    ouvert = null;
    document.removeEventListener('keydown', surEchap);
}

function surEchap(e) {
    if (e.key === 'Escape') fermerNouveautes();
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function openNouveautesModal() {
    fermerNouveautes();
    // Rien à tenir à jour : les vagues se DÉDUISENT des dates portées par les
    // exercices eux-mêmes. Un exercice ajouté apparaît ici sans qu'on y pense,
    // un exercice retiré en disparaît de même.
    const vagues = vaguesDuCatalogue();

    const fond = document.createElement('div');
    fond.className = 'nv-fond';
    fond.innerHTML = `
        <div class="nv-panneau" role="dialog" aria-label="Les nouveautés du catalogue">
            <div class="nv-entete">
                <h3 class="nv-titre">Les derniers exercices</h3>
                <button type="button" class="nv-croix" data-fermer aria-label="Fermer">✕</button>
            </div>
            <p class="nv-note">Un essai court, et rien n'est enregistré dans la progression.</p>
            <div class="nv-corps">${vagues.map(bloc).join('') || vide()}</div>
        </div>`;
    document.body.appendChild(fond);
    ouvert = fond;

    fond.addEventListener('click', (e) => {
        // Un clic sur le fond ferme ; un clic dans le panneau, non.
        if (e.target === fond || e.target.closest('[data-fermer]')) { fermerNouveautes(); return; }
        const essai = e.target.closest('[data-essayer]');
        if (essai) { essayer(essai.dataset.essayer); return; }
        const fiche = e.target.closest('[data-fiche]');
        if (fiche) voirLaFiche(fiche.dataset.fiche);
    });
    document.addEventListener('keydown', surEchap);
}

const vide = () => '<p class="nv-note">Aucune nouveauté à essayer pour le moment.</p>';

function bloc(v) {
    return `
        <section class="nv-vague">
            <h4 class="nv-jour">${esc(direLaDate(v.date))}</h4>
            ${v.entrees.map(carte).join('')}
        </section>`;
}

function carte({ exo, quoi, revise }) {
    const niveaux = ((exo.tags && exo.tags.niveaux) || []).join(' · ');
    return `
        <div class="nv-carte">
            <div class="nv-carte-texte">
                <span class="nv-nom">
                    ${revise ? '<span class="nv-pastille">revu</span>' : '<span class="nv-pastille nv-pastille--neuf">nouveau</span>'}
                    ${esc(exo.title)}
                </span>
                ${niveaux ? `<span class="nv-niveaux">${esc(niveaux)}</span>` : ''}
                ${quoi ? `<span class="nv-quoi">${esc(quoi)}</span>` : ''}
            </div>
            <div class="nv-carte-actions">
                <button type="button" class="nv-btn nv-btn--primaire"
                        data-essayer="${esc(exo.id)}">Essayer</button>
                ${exo.printable
        ? `<button type="button" class="nv-btn" data-fiche="${esc(exo.id)}">La fiche</button>`
        : ''}
            </div>
        </div>`;
}

// --- Les deux actions ---------------------------------------------------------

async function essayer(id) {
    const exo = getExerciseById(id);
    if (!exo) return;
    fermerNouveautes();

    const { Runner } = await import('../core/runner.js');
    const path = makePath(`Essai — ${exo.title}`, [
        makeStep(exo.id, {}, { nbItems: QUESTIONS_D_ESSAI })
    ]);
    new Runner({
        path,
        deviceMode: 'none',
        // Le professeur ESSAIE : il avance sans avoir à réussir, et ses erreurs
        // ne sont pas celles d'un élève — donc rien ne part au journal.
        allowStepNavigation: true,
        essai: true
    }).start();
}

async function voirLaFiche(id) {
    const exo = getExerciseById(id);
    if (!exo) return;
    fermerNouveautes();
    const { ouvrirFicheModal } = await import('./printSheet.js');
    ouvrirFicheModal(exo, exo.params || {});
}
