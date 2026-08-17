// Vue « Mon Profil ».
//
// Trois évolutions par rapport à la version précédente :
//  - les compétences sont affichées avec leur NIVEAU (non acquis → expert) et
//    un taux pondéré par la date, pas un pourcentage brut sur tout l'historique ;
//  - le carnet d'erreurs montre le DIAGNOSTIC de l'erreur quand il est connu,
//    pas seulement « tu as répondu X au lieu de Y » ;
//  - la remédiation part de la compétence et de ses prérequis, et rejoue les
//    questions ratées à l'identique grâce à leur graine.

import { state } from '../core/state.js';
import { badgesCatalog, progressionFamilles } from '../core/gamification.js';
import { computeSkillStats, getWeakSkills, getStrongSkills, getTotalCorrectCount, getDueSkills } from '../core/stats.js';
import { getSkill, skillLabel } from '../data/skills.js';
import { exercisesForSkill, getExerciseById, estRevisable } from '../data/catalog.js';
import { isGame } from '../core/gameAccess.js';
import {
    startErrorReview, startSkillSession, startRecommendedSession, buildRecommendedPreview
} from '../core/remediation.js';
import { formatDuration } from './reportUI.js';
import { listProfiles, getActiveProfileId, createProfile, renameProfile, deleteProfile } from '../core/profile.js';
import { showConfirm, showModal } from './modal.js';

export function initProfileUI() {
    document.addEventListener('errors_updated', () => { renderErrors(); renderPlan(); majComptesOnglets(); });
    // Les médailles se rafraîchissent aussi sur les tentatives : leurs barres
    // suivent la série, la vitesse et la régularité, pas seulement le score.
    document.addEventListener('attempts_updated', () => {
        renderSkills(); renderHeader(); renderPlan(); renderBadges(); majComptesOnglets();
    });
    document.addEventListener('score_updated', () => { renderHeader(); renderBadges(); majComptesOnglets(); });
    document.addEventListener('time_updated', renderHeader);
    document.addEventListener('badges_updated', () => { renderBadges(); majComptesOnglets(); });
    document.addEventListener('profiles_updated', () => { renderProfiles(); majComptesOnglets(); });

    const btnRevision = document.getElementById('btn-start-revision');
    if (btnRevision) btnRevision.onclick = () => startErrorReview();

    const btnSeance = document.getElementById('btn-seance-conseillee');
    if (btnSeance) btnSeance.onclick = () => startRecommendedSession();

    ['profile-group-exo', 'profile-show-games'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderErrors);
    });

    initProfileSwitcher();
    initOnglets();

    renderHeader();
    renderPlan();
    renderSkills();
    renderErrors();
    renderBadges();
    renderProfiles();
    majComptesOnglets();
}

// --- LES QUATRE ONGLETS -------------------------------------------------------
//
// La page empilait sept sections sur près de quatre mille pixels, dont mille
// cinq cents pour le seul carnet d'erreurs : il fallait faire défiler cinq
// écrans pour voir ses badges, et « ce qu'il faut faire maintenant » se
// noyait au milieu du reste. Les quatre grandes sections deviennent quatre
// onglets, et l'en-tête — score, niveau, profils — leur reste commun.
//
// LE COMPTEUR SUR L'ONGLET compte autant que l'onglet lui-même : il dit s'il y
// a quelque chose à voir SANS avoir à cliquer. « Mes erreurs » vide et « Mes
// erreurs (12) » n'appellent pas le même geste.

const CLE_ONGLET = 'mathbox-profil-onglet';

function initOnglets() {
    const barre = document.querySelector('.prof-onglets');
    if (!barre) return;
    let vise = null;
    try { vise = localStorage.getItem(CLE_ONGLET); } catch (e) { vise = null; }
    const connus = [...barre.querySelectorAll('[data-onglet]')].map(b => b.dataset.onglet);
    montrerOnglet(connus.includes(vise) ? vise : 'reviser');
    barre.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-onglet]');
        if (btn) montrerOnglet(btn.dataset.onglet);
    });
}

function montrerOnglet(nom) {
    document.querySelectorAll('.prof-onglets [data-onglet]').forEach(b => {
        const actif = b.dataset.onglet === nom;
        b.classList.toggle('prof-onglet-btn--actif', actif);
        b.setAttribute('aria-selected', String(actif));
    });
    document.querySelectorAll('.prof-panneau').forEach(s => {
        s.hidden = s.dataset.panneau !== nom;
    });
    try { localStorage.setItem(CLE_ONGLET, nom); } catch (e) { /* privé */ }
}

/**
 * Ce que chaque onglet a dans le ventre. On COMPTE ce que l'élève verra, pas
 * ce qui existe en base : un carnet filtré sur les seules erreurs révisables
 * annoncerait sinon douze entrées pour en montrer trois.
 */
function majComptesOnglets() {
    const poser = (cle, n, mot) => {
        const el = document.querySelector(`[data-compte="${cle}"]`);
        if (!el) return;
        el.textContent = n ? String(n) : '';
        el.hidden = !n;
        if (mot) el.title = `${n} ${mot}${n > 1 ? 's' : ''}`;
    };
    poser('reviser', getDueSkills().length, 'notion à revoir');
    poser('progres', computeSkillStats().length, 'notion travaillée');
    poser('erreurs', state.errorHistory.filter(e => estRevisable(e.exoId)).length, 'erreur');
    // `state.badges` est un OBJET { badgeId: date }, pas un tableau : compter
    // sa `length` donnait toujours zéro, et l'onglet paraissait vide alors
    // qu'il portait déjà six médailles.
    poser('badges', Object.keys(state.badges || {}).length, 'badge');
}

// --- En-tête : score, niveau, temps -----------------------------------------

function renderHeader() {
    const score = state.score;
    const level = Math.floor(score / 100) + 1;
    const xpInLevel = score % 100;

    let rank = 'Apprenti Mathématicien';
    if (level >= 3) rank = 'Calculateur Averti';
    if (level >= 5) rank = 'Expert des Chiffres';
    if (level >= 10) rank = 'Génie des Maths';

    setText('profile-score-value', score);
    setText('profile-correct-count', getTotalCorrectCount());
    document.querySelectorAll('.score-display').forEach(el => { el.textContent = '⭐ ' + score; });

    const timeEl = document.getElementById('profile-time-value');
    if (timeEl) timeEl.textContent = formatDuration(state.timeSpentTotal);

    const levelEl = document.getElementById('profile-level');
    if (levelEl) {
        levelEl.innerHTML = `
            <div class="profile-rank">${rank} <span class="profile-rank-level">(Niveau ${level})</span></div>
            <div class="profile-xp-bar"><div style="width:${xpInLevel}%"></div></div>
            <div class="profile-xp-text">${xpInLevel} / 100 XP</div>`;
    }
}

// --- Plan de révision --------------------------------------------------------
//
// Le profil disait à l'élève CE QU'IL VAUT (des pourcentages, des niveaux) mais
// jamais CE QU'IL DOIT FAIRE. Cette section répond à la seule question qui
// compte quand on ouvre son profil : « je révise quoi, là, maintenant ? ».
//
// Trois notions au plus, chacune avec le motif qui l'a fait remonter, la leçon
// en une phrase, et les exercices qui la travaillent — cliquables. Au-delà de
// trois, ce n'est plus un plan, c'est une liste.

function renderPlan() {
    const container = document.getElementById('revision-plan-container');
    const btn = document.getElementById('btn-seance-conseillee');
    if (!container) return;

    const plan = buildRecommendedPreview(3);
    if (!plan.length) {
        container.innerHTML = `<div class="empty-state-msg">Fais quelques exercices : ton plan de révision
            se construira tout seul à partir de ce que tu réussis et de ce que tu rates.</div>`;
        if (btn) btn.style.display = 'none';
        return;
    }
    if (btn) btn.style.display = 'inline-flex';

    // DEUX LIGNES ET UN BOUTON.
    //
    // La carte disait tout d'un coup : la notion, la leçon, les exercices, un
    // bouton dans un coin. C'est trop à lire pour l'élève à qui elle
    // s'adresse, et le geste à faire — appuyer sur « Réviser » — se perdait au
    // milieu. Il reste donc le nom de la notion, une phrase qui dit pourquoi
    // elle est là, et le bouton en grand juste dessous. Le reste — la leçon,
    // les exercices — n'est pas perdu : il est replié, à un appui de là, pour
    // qui veut savoir.
    container.innerHTML = plan.map((r, i) => {
        const def = getSkill(r.skillId);
        const lecon = def && def.lesson ? `<p class="plan-lecon">${escapeHtml(def.lesson)}</p>` : '';
        const exos = exercisesForSkill(r.skillId).slice(0, 3);
        const liens = exos.length
            ? `<div class="plan-exos">${exos.map(e =>
                `<button class="plan-exo" data-exo="${escapeHtml(e.id)}">${escapeHtml(e.title)}</button>`).join('')}</div>`
            : '';
        const detail = (lecon || liens)
            ? `<details class="plan-detail">
                   <summary>Pourquoi, et avec quoi ?</summary>
                   ${lecon}${liens}
               </details>`
            : '';
        return `
        <div class="plan-card">
            <div class="plan-head">
                <span class="plan-rang">${i + 1}</span>
                <span class="plan-titre">${escapeHtml(r.label)}</span>
                <span class="plan-motif plan-motif--${r.reason}">${escapeHtml(r.motif || '')}</span>
            </div>
            <p class="plan-court">${escapeHtml(raisonCourte(r))}</p>
            <button type="button" class="plan-btn" data-plan-revise="${escapeHtml(r.skillId)}">▶ Réviser</button>
            ${detail}
        </div>`;
    }).join('');

    container.querySelectorAll('[data-plan-revise]').forEach(b => {
        b.onclick = () => startSkillSession(b.dataset.planRevise);
    });
    container.querySelectorAll('[data-exo]').forEach(b => {
        b.onclick = async () => {
            const exo = getExerciseById(b.dataset.exo);
            if (!exo) return;
            const { openGameLayer } = await import('../games/engine.js');
            openGameLayer(exo, false);
        };
    });
}

/**
 * Pourquoi cette notion est là, en UNE phrase.
 *
 * Le motif brut (« remédiation », « révision ») ne veut rien dire pour un
 * élève. On lui dit ce qui s'est passé, avec ses chiffres quand on les a :
 * c'est ce qui rend le conseil crédible plutôt qu'arbitraire.
 */
function raisonCourte(r) {
    const m = state.masteryMap.get(r.skillId);
    const taux = m && m.attempts ? ` (${m.correct} réussies sur ${m.attempts})` : '';
    if (r.reason === 'remediation') {
        return `C'est ce qui te manque pour la suite : on repart de la base${taux}.`;
    }
    if (r.reason === 'revision') {
        return m && m.mastery >= 0.7
            ? `Tu sais faire, mais tu ne l'as pas revue depuis un moment${taux}.`
            : `Elle résiste encore un peu${taux}.`;
    }
    return 'Tu ne l\'as pas encore travaillée : c\'est le moment.';
}

// --- Compétences ------------------------------------------------------------

function renderSkills() {
    const container = document.getElementById('skill-stats-container');
    if (!container) return;

    const weak = getWeakSkills(5);
    const strong = getStrongSkills(4);
    const due = getDueSkills(4).filter(d => !weak.some(w => w.skillId === d.skillId));

    if (!weak.length && !strong.length && !due.length) {
        const seen = computeSkillStats().length;
        container.innerHTML = `<div class="empty-state-msg">${seen
            ? 'Encore quelques questions et tes points forts apparaîtront ici : une notion n\'est évaluée qu\'à partir de 5 réponses récentes.'
            : 'Joue à quelques exercices pour voir apparaître tes points forts et tes points à travailler.'}</div>`;
        return;
    }

    container.innerHTML =
        group('À TRAVAILLER', weak, true) +
        group('À REVOIR BIENTÔT', due, true) +
        group('POINTS FORTS', strong, false);

    container.querySelectorAll('[data-revise]').forEach(btn => {
        btn.onclick = () => startSkillSession(btn.dataset.revise);
    });
}

function group(title, skills, actionable) {
    if (!skills.length) return '';
    return `<div class="skill-group-title">${title}</div>` + skills.map(s => skillRow(s, actionable)).join('');
}

function skillRow(skill, actionable) {
    const pct = Math.round(skill.mastery * 100);
    const def = getSkill(skill.skillId);
    const lesson = def && def.lesson ? `<div class="skill-lesson">${escapeHtml(def.lesson)}</div>` : '';
    return `
    <div class="skill-row">
        <div class="skill-main">
            <div class="skill-head">
                <span class="skill-name">${escapeHtml(skill.label || skillLabel(skill.skillId))}</span>
                <span class="skill-level" style="color:${skill.level.color}">${skill.level.label}</span>
            </div>
            <div class="skill-sub">${skill.correct}/${skill.attempts} bonnes réponses • maîtrise ${pct} %</div>
            <div class="skill-bar"><div style="width:${pct}%; background:${skill.level.color}"></div></div>
            ${actionable ? lesson : ''}
        </div>
        ${actionable ? `<button class="btn-toggle btn-toggle--sm" data-revise="${skill.skillId}">Réviser</button>` : ''}
    </div>`;
}

// --- Carnet d'erreurs -------------------------------------------------------

/**
 * Une erreur vient-elle d'un jeu d'arcade ?
 *
 * La question n'est pas cosmétique : une partie d'« Escadrille des Tables »
 * produit trente fautes en deux minutes. Les ENREGISTRER est juste — c'est ce
 * qui alimente le modèle de maîtrise et le plan de révision, et les tables
 * ratées en jeu sont exactement celles qu'il faut retravailler. Les AFFICHER
 * une par une noierait les erreurs d'exercice, qui sont, elles, réfléchies.
 * On les garde donc, repliées derrière un compteur.
 */
function estDunJeu(err) {
    const exo = err.exoId ? getExerciseById(err.exoId) : null;
    return !!(exo && isGame(exo));
}

function renderErrors() {
    const container = document.getElementById('error-log-container');
    const btnStart = document.getElementById('btn-start-revision');
    if (!container) return;

    // Les jeux de PURE LOGIQUE n'entrent pas au carnet : une grille de sudoku
    // ne se révise pas, et leurs entrées noyaient les erreurs de calcul, qui
    // sont les seules qu'on puisse retravailler.
    const toutes = state.errorHistory.filter(e => estRevisable(e.exoId));
    if (!toutes.length) {
        container.innerHTML = `<div class="empty-state-msg">Bravo ! Aucune erreur en attente de révision.</div>`;
        if (btnStart) btnStart.style.display = 'none';
        return;
    }

    const avecJeux = document.getElementById('profile-show-games');
    const montrerJeux = avecJeux ? avecJeux.checked : false;
    const desJeux = toutes.filter(estDunJeu);
    const errors = montrerJeux ? toutes : toutes.filter(e => !estDunJeu(e));

    const open = errors.filter(e => !e.corrected);
    if (btnStart) {
        btnStart.style.display = open.length ? 'inline-flex' : 'none';
        btnStart.textContent = `Réviser mes ${open.length} erreur${open.length > 1 ? 's' : ''}`;
    }

    const grouped = document.getElementById('profile-group-exo');
    const byExercise = grouped ? grouped.checked : true;

    const noteJeux = (!montrerJeux && desJeux.length)
        ? `<div class="error-note-jeux">🎮 ${desJeux.length} erreur${desJeux.length > 1 ? 's' : ''}
             venant des jeux ${desJeux.length > 1 ? 'sont mises' : 'est mise'} de côté :
             elles comptent pour tes révisions, mais elles encombreraient ce carnet.
             Coche « Inclure les jeux » pour les voir.</div>`
        : '';

    if (!errors.length) {
        container.innerHTML = noteJeux
            + `<div class="empty-state-msg">Aucune erreur d'exercice en attente. Beau travail !</div>`;
        return;
    }

    container.innerHTML = noteJeux + (byExercise ? groupedHtml(errors) : flatHtml(errors));

    container.querySelectorAll('[data-remove]').forEach(btn => {
        btn.onclick = () => state.removeError(btn.dataset.remove);
    });
}

function groupedHtml(errors) {
    const map = new Map();
    errors.forEach(err => {
        const k = err.exoTitle || 'Autre';
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(err);
    });
    return [...map.entries()].map(([title, list]) => `
        <div class="error-group-card">
            <h4 class="error-group-title">${escapeHtml(title)} <span>(${list.length})</span></h4>
            <div class="error-group-body">${list.map(errorCard).join('')}</div>
        </div>`).join('');
}

function flatHtml(errors) {
    return errors.map(err => `
        <div class="error-flat-card ${err.corrected ? 'corrected' : ''}">
            <div class="error-flat-title">${escapeHtml(err.exoTitle || '')} ${err.corrected ? correctedBadge() : ''}</div>
            ${errorBody(err)}
        </div>`).join('');
}

function errorCard(err) {
    return `<div class="error-item-card ${err.corrected ? 'corrected' : ''}">
        <div class="error-item-body">${errorBody(err)} ${err.corrected ? correctedBadge() : ''}</div>
        ${err.corrected ? deleteBtn(err) : ''}
    </div>`;
}

function errorBody(err) {
    const q = err.questionData || {};
    const repeat = err.count > 1 ? ` <span class="error-repeat">×${err.count}</span>` : '';
    // Le diagnostic (quel raisonnement a produit cette réponse) est la partie
    // utile : c'est lui qui distingue une correction d'une simple sanction.
    const why = q.misconception
        ? `<div class="error-why">${escapeHtml(q.misconception)}</div>`
        : (q.customMessage ? `<div class="error-why">${escapeHtml(q.customMessage)}</div>` : '');
    const skill = err.skillId ? `<div class="error-skill">${escapeHtml(skillLabel(err.skillId))}</div>` : '';
    return `
        <div class="error-item-detail">
            <b>${escapeHtml(q.questionText || '')}</b>${repeat} — ta réponse :
            <b class="error-given">${escapeHtml(q.input)}</b>, attendu :
            <b class="error-expected">${escapeHtml(q.expected)}</b>
        </div>
        ${why}${skill}`;
}

function correctedBadge() {
    return `<span class="error-badge-corrected">Corrigé</span>`;
}

function deleteBtn(err) {
    return `<button class="btn-icon btn-icon--danger" data-remove="${escapeHtml(err.id)}" title="Retirer du carnet" aria-label="Retirer du carnet">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg></button>`;
}

// --- Badges -----------------------------------------------------------------

/**
 * Les médailles par FAMILLE plutôt qu'en vrac.
 *
 * Une grille de quarante vignettes dont trente-cinq sont cadenassées ne dit
 * rien : on ne sait ni ce qui est proche, ni ce qui est hors de portée. Rangées
 * par famille, avec les quatre paliers alignés et une barre qui montre où l'on
 * en est du palier suivant, elles redeviennent des objectifs.
 */
function renderBadges() {
    const container = document.getElementById('profile-badges-container');
    if (!container) return;
    const acquis = state.badges;

    const uniques = Object.values(badgesCatalog).filter(b => !b.famille);
    const familles = progressionFamilles();
    const lignes = familles.map(f => {
        const paliers = f.paliers.map(p => {
            const def = badgesCatalog[p.id];
            return `<div class="medal-chip ${p.acquis ? `medal-chip--${p.medal}` : 'medal-chip--off'}"
                         title="${escapeHtml(def.title)} — ${escapeHtml(def.description)}">
                        <span class="medal-chip-icon">${p.acquis ? def.icon : '🔒'}</span>
                        <span class="medal-chip-seuil">${seuilCourt(f.cle, p.seuil)}</span>
                    </div>`;
        }).join('');
        const reste = f.suivant
            ? `${seuilCourt(f.cle, f.valeur)} / ${seuilCourt(f.cle, f.suivant)}`
            : 'Tous les paliers !';
        return `
        <button type="button" class="medal-family" data-famille="${f.cle}"
                aria-label="Détail de la médaille ${escapeHtml(f.titre)}">
            <div class="medal-family-head">
                <span class="medal-family-icon">${f.icone}</span>
                <span class="medal-family-title">${escapeHtml(f.titre)}</span>
                <span class="medal-family-count">${reste}</span>
            </div>
            <div class="medal-row">${paliers}</div>
            <div class="medal-bar"><div style="width:${Math.round(f.part * 100)}%"></div></div>
        </button>`;
    }).join('');

    container.innerHTML = `
        <div class="badges-grid">${uniques.map(b => {
        const on = !!acquis[b.id];
        return `<div class="badge-card ${on ? 'badge-card--on' : ''}" title="${escapeHtml(b.description)}">
                <div class="badge-icon">${b.icon}</div>
                <div class="badge-title">${escapeHtml(b.title)}</div>
                ${on ? '' : '<div class="badge-lock" aria-label="Verrouillé">🔒</div>'}
            </div>`;
    }).join('')}</div>
        <div class="medal-families">${lignes}</div>`;

    container.querySelectorAll('[data-famille]').forEach(b => {
        b.onclick = () => detailMedaille(familles.find(f => f.cle === b.dataset.famille));
    });
}

/**
 * Le détail d'une médaille : où j'en suis, et de QUOI on parle.
 *
 * Une vignette cadenassée ne dit ni ce qu'elle récompense, ni combien il en
 * manque — au mieux une infobulle, invisible au doigt. Le détail répond aux
 * deux questions d'un coup : la mesure en toutes lettres, la valeur actuelle,
 * les quatre paliers avec leur seuil, et ce qui reste à faire pour le suivant.
 */
function detailMedaille(f) {
    if (!f) return;
    const acquis = state.badges;
    const rangs = { bronze: 'Bronze', argent: 'Argent', or: 'Or', platine: 'Platine' };
    const lignes = f.paliers.map(p => {
        const def = badgesCatalog[p.id];
        const date = acquis[p.id] ? new Date(acquis[p.id]).toLocaleDateString('fr-FR') : null;
        return `<div class="md-palier ${p.acquis ? `md-palier--${p.medal}` : 'md-palier--off'}">
            <span class="md-palier-icone">${p.acquis ? def.icon : '🔒'}</span>
            <span class="md-palier-nom">${rangs[p.medal]}</span>
            <span class="md-palier-seuil">${escapeHtml(def.description)}</span>
            <span class="md-palier-etat">${p.acquis ? (date ? `obtenue le ${date}` : 'obtenue') : 'à venir'}</span>
        </div>`;
    }).join('');

    const manque = f.suivant ? Math.max(0, f.suivant - f.valeur) : 0;
    const reste = f.suivant
        ? `Encore <b>${seuilCourt(f.cle, manque)}</b> pour le palier suivant.`
        : 'Les quatre paliers sont décrochés. Bravo !';

    showModal('', `
        <div class="md-detail">
            <div class="md-tete">
                <span class="md-tete-icone">${f.icone}</span>
                <div>
                    <h3 class="md-tete-titre">${escapeHtml(f.titre)}</h3>
                    <p class="md-tete-mesure">${escapeHtml(MESURES[f.cle] || '')}</p>
                </div>
            </div>
            <div class="md-compteur">
                <span class="md-compteur-valeur">${seuilCourt(f.cle, f.valeur)}</span>
                <span class="md-compteur-sur">${f.suivant ? `/ ${seuilCourt(f.cle, f.suivant)}` : ''}</span>
            </div>
            <div class="medal-bar"><div style="width:${Math.round(f.part * 100)}%"></div></div>
            <p class="md-reste">${reste}</p>
            <div class="md-paliers">${lignes}</div>
        </div>`, { width: '460px' });
}

/** Ce que chaque famille MESURE, dit en une phrase d'élève. */
const MESURES = {
    score: 'Le total des points gagnés depuis le début, tous exercices confondus.',
    maitre: 'Le nombre de notions que tu maîtrises au niveau Expert.',
    juste: 'Le nombre de questions que tu as réussies.',
    revanche: 'Le nombre d’erreurs de ton carnet que tu as fini par corriger.',
    assidu: 'Le temps total passé sur les exercices.',
    fidele: 'Le nombre de jours différents où tu as travaillé.',
    serie: 'Ta plus longue suite de bonnes réponses d’affilée.',
    eclair: 'Le nombre de réponses justes données en moins de trois secondes.',
    curieux: 'Le nombre d’exercices différents que tu as essayés.'
};

/** Un seuil lisible d'un coup d'œil : les secondes deviennent des heures. */
function seuilCourt(famille, n) {
    if (famille === 'assidu') {
        if (n < 3600) return `${Math.round(n / 60)} min`;
        return `${Math.round(n / 360) / 10} h`.replace('.', ',');
    }
    return n >= 1000 ? `${Math.round(n / 100) / 10} k`.replace('.', ',') : String(n);
}

// --- Profils sur un même poste ---------------------------------------------
// Indispensable en salle de classe : sans cela, tous les élèves d'un poste
// partagent un seul historique, ce qui rend les statistiques inexploitables.

function initProfileSwitcher() {
    const btn = document.getElementById('btn-add-profile');
    if (btn) {
        btn.onclick = async () => {
            const name = prompt('Prénom de l\'élève :');
            if (!name) return;
            const p = await createProfile(name.trim());
            await state.switchProfile(p.id);
            location.reload();
        };
    }
}

function renderProfiles() {
    const container = document.getElementById('profile-switcher');
    if (!container) return;

    const profiles = listProfiles();
    const activeId = getActiveProfileId();

    container.innerHTML = '';
    profiles.forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'profile-chip' + (p.id === activeId ? ' profile-chip--active' : '');

        const name = document.createElement('span');
        name.className = 'profile-chip-name';
        name.textContent = p.name;
        name.contentEditable = p.id === activeId ? 'true' : 'false';
        name.onblur = () => renameProfile(p.id, name.textContent.trim() || 'Élève');
        name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } };

        chip.appendChild(name);

        if (p.id !== activeId) {
            chip.onclick = async () => { await state.switchProfile(p.id); location.reload(); };
            chip.title = `Basculer sur ${p.name}`;
        } else if (profiles.length > 1) {
            const del = document.createElement('button');
            del.className = 'profile-chip-del';
            del.textContent = '✕';
            del.title = 'Supprimer ce profil';
            del.onclick = (e) => {
                e.stopPropagation();
                showConfirm(`Supprimer le profil « ${p.name} » et toutes ses données ?`, async () => {
                    await deleteProfile(p.id);
                    location.reload();
                });
            };
            chip.appendChild(del);
        }
        container.appendChild(chip);
    });
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
