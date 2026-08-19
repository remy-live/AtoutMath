// LE PANNEAU D'AIDE — celui du « ? », en haut de l'exercice.
//
// Avant : un paragraphe. La consigne entière d'un trait, puis les rappels de
// cours accolés à la suite DANS LE MÊME BLOC — sans retour à la ligne, parce
// que c'étaient des `<span>` dans un `<p>`. Rémy : « la mise en forme est
// maladroite, ça ne revient pas à la ligne, les aides ne sont pas hyper
// claires. On pourrait avoir un onglet exemple où on voit étape par étape. »
//
// Trois onglets :
//
//   CE QU'IL FAUT FAIRE  — la première phrase en grand, le reste en dessous,
//     une phrase par ligne. Une consigne de cinq lignes dont la première dit
//     tout ne se lit pas si les cinq ont le même poids.
//   UN EXEMPLE           — une VRAIE question de cet exercice-ci, tirée du
//     générateur, avec ses indices déroulés UN PAR UN. On peut chercher entre
//     deux étapes ; tout dévoiler d'un coup, c'est lire une correction.
//     Pour un jeu, qui n'a pas de question à montrer, c'est le robot.
//   LA LEÇON             — les rappels de cours des compétences travaillées.
//
// Rien n'est écrit à la main dans les descripteurs : les indices et
// l'explication viennent du générateur, donc ils ne peuvent pas se
// désynchroniser de ce que l'élève voit à l'écran.

import { state } from '../core/state.js';
import { getGenerator } from '../core/registry.js';
import { makeRng } from '../core/ids.js';
import { decouperConsigne, etapesExemple, peutMontrerUnExemple, leconsDe, ongletsPour } from '../core/aideExercice.js';

let onglet = 'consigne';
let exemple = null;          // l'exemple engendré, gardé tant qu'on ne change pas d'exercice
let exemplePour = null;      // l'exercice auquel il appartient
let devoiles = 0;            // combien d'étapes de l'exemple sont montrées
let tirage = 0;              // pour « un autre exemple »

const esc = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// --- Ouvrir -----------------------------------------------------------------

export async function ouvrirAide() {
    const exo = state.activeExo;
    const modale = document.getElementById('instruction-modal');
    if (!modale) return;

    // Changement d'exercice : l'exemple précédent n'a plus rien à voir.
    if (!exo || exemplePour !== (exo && exo.id)) { exemple = null; devoiles = 0; tirage = 0; onglet = 'consigne'; }

    const lecons = await leconsDeLExercice(exo);
    const titre = document.getElementById('aide-titre');
    if (titre) titre.textContent = exo ? exo.title : 'Aide';
    peindre(exo, lecons);
    modale.style.display = 'flex';
}

export function fermerAide() {
    const modale = document.getElementById('instruction-modal');
    if (modale) modale.style.display = 'none';
}

async function leconsDeLExercice(exo) {
    if (!exo) return [];
    const [{ skillsOf }, { getSkill }] = await Promise.all([
        import('../data/catalog.js'), import('../data/skills.js')
    ]);
    return leconsDe(skillsOf(exo).map(id => (getSkill(id) || {}).lesson));
}

// --- Peindre ----------------------------------------------------------------

function peindre(exo, lecons) {
    const barre = document.getElementById('aide-onglets');
    const corps = document.getElementById('aide-corps');
    if (!barre || !corps) return;

    const onglets = ongletsPour({ exo, lecons });
    if (!onglets.some(o => o.id === onglet)) onglet = 'consigne';

    barre.innerHTML = onglets.map(o => `
        <button type="button" class="aide-onglet ${o.id === onglet ? 'aide-onglet--actif' : ''}"
                role="tab" aria-selected="${o.id === onglet}" data-onglet="${o.id}">${esc(o.label)}</button>`).join('');
    barre.querySelectorAll('[data-onglet]').forEach(b => {
        b.onclick = () => { onglet = b.dataset.onglet; peindre(exo, lecons); };
    });

    if (onglet === 'consigne') corps.innerHTML = vueConsigne(exo);
    else if (onglet === 'lecon') corps.innerHTML = vueLecon(lecons);
    else vueExemple(exo, corps, lecons);

    corps.scrollTop = 0;
}

function vueConsigne(exo) {
    const { essentiel, details } = decouperConsigne(exo && exo.instruction);
    if (!essentiel) return '<p class="aide-vide">Aucune consigne n\'a encore été écrite pour cet exercice.</p>';
    return `<p class="aide-essentiel">${esc(essentiel)}</p>`
        + (details.length
            ? `<ul class="aide-details">${details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>`
            : '');
}

function vueLecon(lecons) {
    return `<ul class="aide-lecons">${lecons.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

/**
 * L'EXEMPLE, DÉVOILÉ UNE ÉTAPE À LA FOIS.
 *
 * Un exemple entièrement affiché est une correction : on la lit, on ne la
 * cherche pas. Chaque appui sur « Étape suivante » découvre une ligne de plus,
 * et la réponse ne vient qu'au bout.
 */
function vueExemple(exo, corps, lecons) {
    if (!peutMontrerUnExemple(exo)) {
        corps.innerHTML = `
            <p class="aide-essentiel">Celui-ci est un jeu : il n'a pas de « question » à montrer,
                il a un plateau.</p>
            <p class="aide-details-p">Le mieux est de regarder le robot y jouer une fois — il fait
                les premiers coups en expliquant ce qu'il cherche, puis il te rend la main.</p>
            <button type="button" class="aide-btn aide-btn--fort" data-robot>Regarder le robot jouer</button>`;
        const b = corps.querySelector('[data-robot]');
        if (b) b.onclick = () => {
            fermerAide();
            const demo = document.getElementById('btn-toggle-demo');
            if (demo) demo.click();
        };
        return;
    }

    if (!exemple) { exemple = engendrer(exo); devoiles = 0; }
    if (!exemple) {
        corps.innerHTML = '<p class="aide-vide">Impossible de préparer un exemple pour cet exercice.</p>';
        return;
    }

    // LA RÉPONSE EST UNE MARCHE DE PLUS, pas la conséquence de la dernière
    // étape. Sans cela, un exemple sans indice montrerait la question et sa
    // réponse ensemble — c'est-à-dire ne laisserait pas une seconde pour
    // chercher, ce qui est tout ce qu'on demande à un exemple.
    const total = exemple.etapes.length;
    const montreReponse = devoiles > total;
    const libelle = devoiles < total
        ? (devoiles === 0
            ? (total ? 'Montre-moi la première étape' : 'Montre-moi la réponse')
            : `Étape suivante (${devoiles + 1}/${total})`)
        : 'Voir la réponse';
    corps.innerHTML = `
        <p class="aide-exemple-intro">Une question comme celles de cet exercice, résolue pas à pas.</p>
        <div class="aide-question">${esc(exemple.question)}</div>
        <ol class="aide-etapes">${exemple.etapes.slice(0, devoiles)
        .map(e => `<li>${esc(e)}</li>`).join('')}</ol>
        ${montreReponse ? `<div class="aide-reponse">
                <span class="aide-reponse-etiq">Réponse</span>
                <strong>${esc(exemple.reponse)}</strong>
                ${exemple.explication ? `<p>${esc(exemple.explication)}</p>` : ''}
            </div>` : ''}
        <div class="aide-actions">
            ${montreReponse ? '' : `<button type="button" class="aide-btn aide-btn--fort" data-suivant>
                ${libelle}
            </button>`}
            <button type="button" class="aide-btn" data-autre>Un autre exemple</button>
        </div>`;

    const suivant = corps.querySelector('[data-suivant]');
    if (suivant) suivant.onclick = () => { devoiles++; peindre(exo, lecons); };
    corps.querySelector('[data-autre]').onclick = () => {
        tirage++;
        exemple = engendrer(exo);
        devoiles = 0;
        peindre(exo, lecons);
    };
}

/**
 * Engendre une question comme le ferait l'exercice — mêmes réglages, même
 * générateur. La graine dépend de l'exercice et du numéro de tirage : rouvrir
 * l'aide montre le MÊME exemple (on y revient pour le relire), « un autre
 * exemple » en donne un nouveau.
 *
 * ON EN TIRE QUATRE ET L'ON GARDE LE PLUS INSTRUCTIF. Un tirage au hasard
 * tombe volontiers sur « 2 × 2 = ? » : c'est une question valable de
 * l'exercice, et un exemple inutile — il n'a rien à montrer. Celle qui porte
 * le plus d'indices est celle qui a le plus à expliquer.
 */
const CANDIDATS = 4;

function engendrer(exo) {
    exemplePour = exo.id;
    const g = getGenerator(exo.generatorId);
    if (!g) return null;
    let meilleur = null;
    for (let k = 0; k < CANDIDATS; k++) {
        try {
            const item = g.generate({ ...(exo.params || {}) }, {
                rng: makeRng(`aide-${exo.id}-${tirage}-${k}`),
                weakTables: [], difficulty: (exo.params && exo.params.difficulty) || null, index: k
            });
            const ex = etapesExemple(item);
            if (!ex || !ex.question) continue;
            if (!meilleur || ex.etapes.length > meilleur.etapes.length) meilleur = ex;
        } catch (e) { /* ce tirage-là ne passe pas, un autre passera */ }
    }
    return meilleur;
}
