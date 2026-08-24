// « TES EXERCICES À TOI » — la rubrique de l'élève, dans sa vue Parcours.
//
// Rémy : « il faudrait dans le parcours pouvoir ajouter des exercices propres
// pour l'élève. On a une rubrique Exercices personnalisés qui permet de
// rajouter des exercices limités par le nombre de questions ou le temps (le
// prof ne les connaît pas car c'est propre à l'élève et enregistré). Et si
// l'élève s'en sort bien, on peut proposer un jeu avec un temps. »
//
// TROIS CHOSES SONT DITES À L'ÉCRAN, ET CE N'EST PAS DU DÉCOR.
//
//   · « Personne d'autre ne les voit. » C'est vrai — la liste vit dans le
//     profil, sur l'appareil — et c'est ce qui donne le droit de se tromper
//     ici. Le dire est la moitié du dispositif.
//   · LA LIMITE SE CHOISIT AVANT, jamais après. Dix questions ou cinq
//     minutes : on décide de s'y mettre, et l'on sait quand c'est fini.
//   · LE MEILLEUR RÉSULTAT RESTE AFFICHÉ, pas le dernier. La liste doit
//     donner envie d'y revenir.
//
// LA RÉCOMPENSE EST OFFERTE, PAS PROMISE. On ne l'annonce pas avant : un
// entraînement fait pour obtenir la partie n'est plus un entraînement. Elle
// arrive à la fin, si le travail a été sérieux — et l'on peut la refuser.

import { state } from '../core/state.js';
import { exercices, getExerciseById, estADeux, filterByStatus } from '../data/catalog.js';
import { estJeuCatalogue } from '../core/revue.js';
import { chercher } from '../core/recherche.js';
import { ficheDe } from './rechercheUI.js';
import { showModal, showToast } from './modal.js';
import {
    LIMITES, LIMITE_DEFAUT, creerExercicePerso, decrireLimite, enParcours,
    meriteRecompense, parcoursRecompense
} from '../core/mesExercices.js';

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// --- La rubrique ---------------------------------------------------------------

export function sectionMesExercices() {
    const box = document.createElement('section');
    box.className = 'path-section mes-exos';

    const liste = state.mesExercices || [];
    box.innerHTML = `
        <h2 class="path-section-title">Tes exercices à toi</h2>
        <p class="path-section-sub">Choisis ce que tu veux travailler et jusqu'où : dix questions,
        cinq minutes, comme tu veux. Ils restent enregistrés ici, et personne d'autre ne les voit.</p>`;

    if (!liste.length) {
        const vide = document.createElement('div');
        vide.className = 'empty-state-msg';
        vide.textContent = 'Tu n\'en as pas encore. Ajoute le premier : c\'est toi qui choisis.';
        box.appendChild(vide);
    } else {
        const cartes = document.createElement('div');
        cartes.className = 'mes-exos-liste';
        liste.forEach(entree => cartes.appendChild(carteExercice(entree)));
        box.appendChild(cartes);
    }

    const ajouter = document.createElement('button');
    ajouter.type = 'button';
    ajouter.className = 'btn-toggle active mes-exos-ajouter';
    ajouter.textContent = '＋ Ajouter un exercice';
    ajouter.onclick = () => ouvrirAjout();
    box.appendChild(ajouter);

    return box;
}

function carteExercice(entree) {
    const exo = getExerciseById(entree.exerciseId);
    const carte = document.createElement('div');
    carte.className = 'card mes-exo-carte';

    const titre = entree.titre || (exo ? exo.title : 'Exercice retiré du catalogue');
    const resultat = entree.meilleur === null || entree.meilleur === undefined
        ? 'jamais fait'
        : `meilleur : ${entree.meilleur} %`;

    carte.innerHTML = `
        <div class="mes-exo-corps">
            <div class="mes-exo-titre">${echapper(titre)}</div>
            <div class="mes-exo-sous">${echapper(decrireLimite(entree.limite))}
                · ${echapper(resultat)}${entree.fois ? ` · ${entree.fois} fois` : ''}</div>
        </div>`;

    const jouer = document.createElement('button');
    jouer.type = 'button';
    jouer.className = 'btn-toggle btn-toggle--sm';
    jouer.textContent = exo ? 'Faire' : 'Indisponible';
    jouer.disabled = !exo;
    jouer.onclick = () => jouerExercicePerso(entree);

    const oter = document.createElement('button');
    oter.type = 'button';
    oter.className = 'mes-exo-oter';
    oter.title = 'Retirer de ma liste';
    oter.setAttribute('aria-label', `Retirer ${titre}`);
    oter.textContent = '✕';
    oter.onclick = async () => {
        await state.retirerExercicePerso(entree.id);
        rafraichir();
    };

    carte.append(jouer, oter);
    return carte;
}

function rafraichir() {
    import('./pathView.js').then(m => m.renderStudentPathView());
}

// --- Ajouter -------------------------------------------------------------------

/**
 * On cherche l'exercice par son nom, comme dans la barre de recherche : la
 * liste entière déroulée serait illisible, et un élève sait ce qu'il cherche —
 * « fractions », « tables », « angles ».
 */
export function ouvrirAjout() {
    const html = `
        <div class="mes-ajout">
            <label class="mes-ajout-label" for="mes-ajout-q">Qu'est-ce que tu veux travailler ?</label>
            <input id="mes-ajout-q" class="mes-ajout-champ" type="text" autocomplete="off"
                   placeholder="fractions, tables, angles…">
            <ul class="mes-ajout-liste" id="mes-ajout-liste" role="listbox"></ul>

            <div class="mes-ajout-limite">
                <div class="mes-ajout-label">Tu t'arrêtes après…</div>
                <div class="mes-ajout-onglets" role="tablist">
                    <button type="button" class="mes-ajout-onglet is-actif" data-type="questions">un nombre de questions</button>
                    <button type="button" class="mes-ajout-onglet" data-type="temps">un temps</button>
                </div>
                <div class="mes-ajout-valeurs" id="mes-ajout-valeurs"></div>
            </div>

            <button type="button" class="btn-toggle active mes-ajout-valider" id="mes-ajout-ok" disabled>
                Ajouter à ma liste
            </button>
        </div>`;

    const modal = showModal('Un exercice pour toi', html, { width: '520px' });
    const champ = modal.element.querySelector('#mes-ajout-q');
    const listeEl = modal.element.querySelector('#mes-ajout-liste');
    const valeursEl = modal.element.querySelector('#mes-ajout-valeurs');
    const ok = modal.element.querySelector('#mes-ajout-ok');

    let choisi = null;
    let limite = { ...LIMITE_DEFAUT };

    const fiches = filterByStatus(exercices, { only: 'tout', teacher: false }).map(ficheDe);

    const peindreValeurs = () => {
        const valeurs = limite.type === 'temps' ? LIMITES.minutes : LIMITES.questions;
        if (!valeurs.includes(limite.valeur)) limite.valeur = valeurs[Math.floor(valeurs.length / 2)];
        valeursEl.innerHTML = valeurs.map(v => `
            <button type="button" class="mes-ajout-valeur${v === limite.valeur ? ' is-actif' : ''}"
                    data-v="${v}">${v}${limite.type === 'temps' ? ' min' : ''}</button>`).join('');
        valeursEl.querySelectorAll('[data-v]').forEach(b => {
            b.onclick = () => { limite.valeur = Number(b.dataset.v); peindreValeurs(); };
        });
    };

    modal.element.querySelectorAll('.mes-ajout-onglet').forEach(onglet => {
        onglet.onclick = () => {
            modal.element.querySelectorAll('.mes-ajout-onglet')
                .forEach(o => o.classList.toggle('is-actif', o === onglet));
            limite = { type: onglet.dataset.type, valeur: 0 };
            peindreValeurs();
        };
    });
    peindreValeurs();

    const peindreListe = () => {
        const q = champ.value.trim();
        const trouves = q ? chercher(fiches, q, { max: 7 }) : [];
        if (!q) {
            listeEl.innerHTML = '<li class="mes-ajout-vide">Tape un mot : le nom d\'une notion, '
                + 'ou « jeu » pour voir les jeux.</li>';
            return;
        }
        if (!trouves.length) {
            listeEl.innerHTML = '<li class="mes-ajout-vide">Rien à ce nom-là. Essaie un autre mot.</li>';
            return;
        }
        listeEl.innerHTML = trouves.map(t => `
            <li><button type="button" class="mes-ajout-choix${choisi === t.fiche.id ? ' is-actif' : ''}"
                data-id="${t.fiche.id}">
                <span class="mes-ajout-choix-titre">${echapper(t.fiche.titre)}</span>
                <span class="mes-ajout-choix-sous">${echapper((t.fiche.chemin || []).join(' · '))}</span>
            </button></li>`).join('');
        listeEl.querySelectorAll('[data-id]').forEach(b => {
            b.onclick = () => {
                choisi = b.dataset.id;
                ok.disabled = false;
                peindreListe();
            };
        });
    };

    champ.oninput = () => { peindreListe(); };
    peindreListe();
    champ.focus({ preventScroll: true });

    ok.onclick = async () => {
        if (!choisi) return;
        const exo = getExerciseById(choisi);
        const entree = creerExercicePerso({
            exerciseId: choisi,
            titre: exo ? exo.title : '',
            params: exo ? { ...(exo.params || {}) } : {},
            limite
        });
        await state.ajouterExercicePerso(entree);
        modal.close();
        rafraichir();
        showToast(`« ${exo ? exo.title : 'Exercice'} » est dans ta liste — ${decrireLimite(limite)}.`);
    };
}

// --- Jouer ---------------------------------------------------------------------

export async function jouerExercicePerso(entree) {
    const exo = getExerciseById(entree.exerciseId);
    if (!exo) { showToast('Cet exercice n\'existe plus.', 'error'); return; }

    let bilanFinal = null;
    const surFin = (ev) => {
        bilanFinal = (ev.detail && ev.detail.bilan) || null;
        if (!bilanFinal) return;
        const taux = bilanFinal.totalQuestions
            ? bilanFinal.totalReussies / bilanFinal.totalQuestions : 0;
        state.noterExercicePerso(entree.id, taux);
    };
    document.addEventListener('sequence_completed', surFin, { once: true });

    const { Runner } = await import('../core/runner.js');
    new Runner({
        path: enParcours(entree, exo),
        deviceMode: 'none',
        onExit: () => {
            document.removeEventListener('sequence_completed', surFin);
            import('./navigation.js').then(m => m.setTopNavMode('path'));
            rafraichir();
            // La récompense APRÈS tout le reste, jamais par-dessus. Mesuré :
            // proposée sur un simple délai, elle s'ouvrait SOUS le « Bravo ! »
            // de fin d'exercice — deux fenêtres l'une sur l'autre, on ne lit ni
            // l'une ni l'autre. On attend donc que l'écran soit libre.
            if (meriteRecompense(bilanFinal)) quandLEcranEstLibre(() => proposerRecompense());
        }
    }).start();
}

/**
 * Attend que plus aucune fenêtre ne soit ouverte, puis agit. Au-delà de dix
 * secondes on renonce : l'élève est passé à autre chose, et une récompense qui
 * surgit après coup n'en est plus une.
 */
function quandLEcranEstLibre(faire, restant = 34) {
    const occupe = [...document.querySelectorAll('.modal-overlay, #run-report-modal')]
        .some(m => m.style.display !== 'none' && getComputedStyle(m).display !== 'none');
    if (!occupe) { faire(); return; }
    if (restant <= 0) return;
    setTimeout(() => quandLEcranEstLibre(faire, restant - 1), 300);
}

/** Les jeux qu'on peut offrir : solo, et jouables en quelques minutes. */
export function jeuxOffrables(limite = 3) {
    const jeux = filterByStatus(exercices, { only: 'valide', teacher: false })
        .filter(e => estJeuCatalogue(e) && !estADeux(e));
    // Trois au hasard : la récompense change, donc elle reste une surprise.
    const melange = jeux.slice();
    for (let i = melange.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [melange[i], melange[j]] = [melange[j], melange[i]];
    }
    return melange.slice(0, limite);
}

export function proposerRecompense(minutes = 3) {
    const jeux = jeuxOffrables(3);
    if (!jeux.length) return;

    const html = `
        <p class="recompense-texte">Tu as bien travaillé : tu as gagné une partie de
        ${minutes} minutes. Choisis ton jeu — ou garde-la pour plus tard.</p>
        <div class="recompense-jeux">
            ${jeux.map(j => `<button type="button" class="recompense-jeu" data-jeu="${j.id}">
                ${echapper(j.title)}</button>`).join('')}
        </div>
        <button type="button" class="btn-toggle recompense-non" id="recompense-non">Non merci</button>`;

    const modal = showModal('🎁 Une partie pour toi', html, { width: '460px' });
    modal.element.querySelector('#recompense-non').onclick = () => modal.close();
    modal.element.querySelectorAll('[data-jeu]').forEach(b => {
        b.onclick = async () => {
            modal.close();
            const { Runner } = await import('../core/runner.js');
            new Runner({
                path: parcoursRecompense(b.dataset.jeu, minutes),
                deviceMode: 'none',
                onExit: () => {
                    import('./navigation.js').then(m => m.setTopNavMode('path'));
                    rafraichir();
                }
            }).start();
        };
    });
}
