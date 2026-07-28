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
import { badgesCatalog } from '../core/gamification.js';
import { computeSkillStats, getWeakSkills, getStrongSkills, getTotalCorrectCount, getDueSkills } from '../core/stats.js';
import { getSkill, skillLabel } from '../data/skills.js';
import { startErrorReview, startSkillSession } from '../core/remediation.js';
import { formatDuration } from './reportUI.js';
import { listProfiles, getActiveProfileId, createProfile, renameProfile, deleteProfile } from '../core/profile.js';
import { showConfirm } from './modal.js';

export function initProfileUI() {
    document.addEventListener('errors_updated', renderErrors);
    document.addEventListener('attempts_updated', () => { renderSkills(); renderHeader(); });
    document.addEventListener('score_updated', renderHeader);
    document.addEventListener('time_updated', renderHeader);
    document.addEventListener('badges_updated', renderBadges);
    document.addEventListener('profiles_updated', renderProfiles);

    const btnRevision = document.getElementById('btn-start-revision');
    if (btnRevision) btnRevision.onclick = () => startErrorReview();

    const toggle = document.getElementById('profile-group-exo');
    if (toggle) toggle.addEventListener('change', renderErrors);

    initProfileSwitcher();

    renderHeader();
    renderSkills();
    renderErrors();
    renderBadges();
    renderProfiles();
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
            <div class="profile-xp-text">${xpInLevel} / 100 XP avant le niveau ${level + 1}</div>`;
    }
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

function renderErrors() {
    const container = document.getElementById('error-log-container');
    const btnStart = document.getElementById('btn-start-revision');
    if (!container) return;

    const errors = state.errorHistory;
    if (!errors.length) {
        container.innerHTML = `<div class="empty-state-msg">Bravo ! Aucune erreur en attente de révision.</div>`;
        if (btnStart) btnStart.style.display = 'none';
        return;
    }

    const open = errors.filter(e => !e.corrected);
    if (btnStart) {
        btnStart.style.display = open.length ? 'inline-flex' : 'none';
        btnStart.textContent = `Réviser mes ${open.length} erreur${open.length > 1 ? 's' : ''}`;
    }

    const grouped = document.getElementById('profile-group-exo');
    const byExercise = grouped ? grouped.checked : true;

    container.innerHTML = byExercise ? groupedHtml(errors) : flatHtml(errors);

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

function renderBadges() {
    const container = document.getElementById('profile-badges-container');
    if (!container) return;
    const unlockedMap = state.badges;
    container.innerHTML = `<div class="badges-grid">${Object.values(badgesCatalog).map(b => {
        const unlocked = !!unlockedMap[b.id];
        return `<div class="badge-card ${unlocked ? 'badge-card--on' : ''}" title="${escapeHtml(b.description)}">
            <div class="badge-icon">${b.icon}</div>
            <div class="badge-title">${escapeHtml(b.title)}</div>
            ${unlocked ? '' : '<div class="badge-lock" aria-label="Verrouillé">🔒</div>'}
        </div>`;
    }).join('')}</div>`;
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
