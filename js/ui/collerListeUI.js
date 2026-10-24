// LE TABLEAU DES COLONNES — coller Pronote sans rien nettoyer avant.
//
// Rémy : « je trouve l'importation pas terrible, ce serait cool de pouvoir
// coller le fichier de pronote qui comprend plein de colonnes dans le
// presse-papier et tu me le présentes sous forme de tableau où tu sélectionnes
// intelligemment les colonnes ou on peut les sélectionner ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUI REND LA DEVINETTE ACCEPTABLE, C'EST QU'ELLE SE VOIE.
//
// Aucune lecture automatique d'un fichier inconnu n'est sûre. Celle du noyau est
// bonne la plupart du temps — elle trouve « Élève » parmi vingt-deux colonnes,
// et elle ne se laisse pas prendre par « DEMI-PENSIONNAIRE AU TICKET ». Mais
// « la plupart du temps » n'est pas une garantie, et une liste de classe fausse
// se paie pendant des semaines.
//
// D'où cet écran : le tableau tel qu'il a été lu, un menu au-dessus de CHAQUE
// colonne, et sous les yeux la phrase qui en sort — « ANDRIANTSITOHAINA
// Tiffany ». Le professeur ne vérifie pas un algorithme, il lit trois noms. S'ils
// sont bons, ils le sont tous.
//
// ET ON MONTRE CE QU'ON A ÉCARTÉ. Le préambule — chez Rémy, le nombre d'élèves
// en première ligne — et les lignes sans nom sont affichés avec leur raison. Un
// import qui avale une ligne en silence est un import qu'on ne peut pas
// vérifier : l'élève manquant se découvre le jour où il le dit lui-même.

import {
    analyserCollage, elevesDepuisChoix, enListeNormalisee, ROLES
} from '../core/collerListe.js';
import { showModal } from './modal.js';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Combien de lignes on montre. Assez pour juger, pas assez pour faire peur. */
const APERCU = 6;

/**
 * OUVRIR LE TABLEAU, ET RENDRE CE QUE LE PROFESSEUR A VALIDÉ.
 *
 * @param {string} texte le collage brut
 * @returns {Promise<string|null>} la liste normalisée `nom;identifiant;code`,
 *   ou `null` s'il renonce.
 */
export function choisirLesColonnes(texte) {
    const analyse = analyserCollage(texte);
    if (!analyse.lignes.length) return Promise.resolve(null);
    const choix = analyse.colonnes.map(c => c.role);

    return new Promise((resoudre) => {
        const fenetre = showModal('Ce que j\'ai lu dans votre liste', corps(analyse, choix),
            { width: '980px' });
        const zone = fenetre.element;

        const redessiner = () => {
            const sortie = zone.querySelector('.cl-sortie');
            if (sortie) sortie.innerHTML = sortieHtml(analyse, choix);
        };

        zone.addEventListener('change', (e) => {
            const sel = e.target.closest('[data-colonne]');
            if (!sel) return;
            const i = Number(sel.getAttribute('data-colonne'));
            // UN RÔLE NE SE PORTE QU'UNE FOIS. Choisir « Prénom » sur une
            // seconde colonne doit libérer la première, sinon deux prénoms se
            // collent au nom sans qu'on comprenne d'où vient le second.
            if (sel.value !== 'ignore') {
                for (let k = 0; k < choix.length; k++) {
                    if (k !== i && choix[k] === sel.value) {
                        choix[k] = 'ignore';
                        const autre = zone.querySelector(`[data-colonne="${k}"]`);
                        if (autre) autre.value = 'ignore';
                    }
                }
            }
            choix[i] = sel.value;
            zone.querySelectorAll('[data-colonne]').forEach(s => {
                s.closest('th')?.classList.toggle('cl-th--pris', s.value !== 'ignore');
            });
            redessiner();
        });

        zone.querySelector('[data-cl-non]').onclick = () => { fenetre.close(); resoudre(null); };
        zone.querySelector('[data-cl-ok]').onclick = () => {
            const { eleves } = elevesDepuisChoix(analyse, choix);
            fenetre.close();
            resoudre(eleves.length ? enListeNormalisee(eleves) : null);
        };
    });
}

function corps(analyse, choix) {
    return `
        ${analyse.preambule.length ? `<p class="cl-ecarte">
            <b>Ignoré avant le tableau :</b> ${analyse.preambule.map(esc).join(' · ')}
            <em>— ce n'est pas un élève.</em></p>` : ''}
        <p class="cl-note">${analyse.lignes.length} ligne${analyse.lignes.length > 1 ? 's' : ''} lue${
            analyse.lignes.length > 1 ? 's' : ''}, ${analyse.colonnes.length} colonne${
            analyse.colonnes.length > 1 ? 's' : ''}. J'ai choisi celles qui me semblaient
            les bonnes — <b>changez-les si je me suis trompé</b>.</p>
        <div class="cl-table-cadre">
            <table class="cl-table">
                <thead><tr>${analyse.colonnes.map((c, i) => `
                    <th${choix[i] !== 'ignore' ? ' class="cl-th--pris"' : ''}>
                        <div class="cl-titre">${esc(c.titre || 'Colonne ' + (i + 1))}</div>
                        <select data-colonne="${i}" class="cl-select">
                            ${ROLES.map(r => `<option value="${r.cle}"${
                                r.cle === choix[i] ? ' selected' : ''}>${esc(r.mot)}</option>`).join('')}
                        </select>
                    </th>`).join('')}</tr></thead>
                <tbody>${analyse.lignes.slice(0, APERCU).map(l => `<tr>${
                    analyse.colonnes.map((c, i) =>
                        `<td>${esc((l[i] || '').slice(0, 40))}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        </div>
        ${analyse.lignes.length > APERCU
            ? `<p class="cl-note">…et ${analyse.lignes.length - APERCU} autre${
                analyse.lignes.length - APERCU > 1 ? 's' : ''}.</p>` : ''}
        <div class="cl-sortie">${sortieHtml(analyse, choix)}</div>
        <div class="cl-boutons">
            <button type="button" class="cl-bouton" data-cl-ok>Continuer</button>
            <button type="button" class="cl-bouton cl-bouton--doux" data-cl-non>Annuler</button>
        </div>`;
}

/**
 * CE QUI SORTIRA — trois noms, et ce qu'on laisse de côté.
 *
 * Le professeur ne vérifie pas un algorithme : il lit trois noms. S'ils sont
 * bons, ils le sont tous — et s'ils sont faux, cela saute aux yeux.
 */
function sortieHtml(analyse, choix) {
    const { eleves, ecartees } = elevesDepuisChoix(analyse, choix);
    if (!eleves.length) {
        return `<p class="cl-vide">Aucun élève avec ces colonnes-là.
            Choisissez au moins <b>Nom et prénom ensemble</b>, ou <b>NOM</b> et <b>Prénom</b>.</p>`;
    }
    return `
        <h4 class="cl-h4">Ce qui sera créé — ${eleves.length} élève${eleves.length > 1 ? 's' : ''}</h4>
        <ul class="cl-sortie-liste">${eleves.slice(0, 3).map(e => `
            <li><b>${esc(e.nom)}</b>${e.login ? ` <code>${esc(e.login)}</code>` : ''}${
                e.code ? ` <span class="cl-code">${esc(e.code)}</span>` : ''}</li>`).join('')}
            ${eleves.length > 3 ? `<li class="cl-note">…et ${eleves.length - 3} autres.</li>` : ''}
        </ul>
        ${ecartees.length ? `<p class="cl-ecarte"><b>${ecartees.length} ligne${
            ecartees.length > 1 ? 's écartées' : ' écartée'} :</b> ${
            ecartees.slice(0, 4).map(x => `${esc(x.ligne.slice(0, 30))} <em>(${esc(x.pourquoi)})</em>`)
                .join(' · ')}</p>` : ''}`;
}
