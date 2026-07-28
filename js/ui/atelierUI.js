// Atelier de relecture des exercices.
//
// Outil d'auteur, pas d'élève. Il répond à un problème précis : pour juger un
// générateur, jouer une partie ne suffit pas. Il faut voir d'un coup une
// dizaine de questions AVEC ce qui reste invisible en jeu — les distracteurs
// et leur diagnostic, les indices, la compétence visée, la graine.
//
// Chaque question est produite par le vrai générateur, avec les vrais
// paramètres : ce qui est relu est exactement ce que verra l'élève.
//
// Le verdict est envoyé au serveur de développement, qui l'enregistre dans
// reviews/journal.jsonl. Rien à recopier à la main.

import { allGenerators, getGenerator, activitiesFor } from '../core/registry.js';
import { makeRng, randomSeed } from '../core/ids.js';
import { exercices, statusOf, STATUS_LABELS } from '../data/catalog.js';
import { skillLabel } from '../data/skills.js';
import { showToast, showAlert } from './modal.js';

const REVIEW_ENDPOINT = '/_review';
const DEFAULT_COUNT = 8;

let current = { generatorId: null, params: {}, count: DEFAULT_COUNT, items: [] };

export function initAtelierUI() {
    const btn = document.getElementById('db-atelier');
    if (!btn) return;
    btn.onclick = open;

    const close = document.getElementById('btn-close-atelier');
    if (close) close.onclick = () => { document.getElementById('atelier-view').style.display = 'none'; };
}

function open() {
    const view = document.getElementById('atelier-view');
    if (!view) return;
    view.style.display = 'flex';
    if (!current.generatorId) current.generatorId = allGenerators()[0].id;
    renderControls();
    regenerate();
}

// --- Barre de contrôle ------------------------------------------------------

function renderControls() {
    const host = document.getElementById('atelier-controls');
    const gen = getGenerator(current.generatorId);

    const utilisations = exercices.filter(e => e.generatorId === gen.id);
    const compatibles = activitiesFor(gen.id).map(a => a.label);

    host.innerHTML = `
        <div class="atl-row">
            <label class="atl-field">
                <span>Générateur</span>
                <select id="atl-gen" class="cfg-input">
                    ${allGenerators().map(g => `<option value="${g.id}" ${g.id === gen.id ? 'selected' : ''}>${g.label}</option>`).join('')}
                </select>
            </label>
            <label class="atl-field atl-field--sm">
                <span>Questions</span>
                <input type="number" id="atl-count" class="cfg-input" min="1" max="30" value="${current.count}">
            </label>
            <button id="atl-regen" class="btn-toggle glass-btn primary active">↻ Régénérer</button>
        </div>

        <div class="atl-meta">
            <span><b>${gen.id}</b></span>
            <span>Compétences : ${gen.resolvedSkills.slice(0, 4).map(skillLabel).join(', ')}${gen.resolvedSkills.length > 4 ? `, +${gen.resolvedSkills.length - 4}` : ''}</span>
            <span>Réponses : ${gen.answerKinds.join(', ')}</span>
            <span>Jeux compatibles : ${compatibles.join(', ') || '—'}</span>
        </div>

        <div class="atl-uses">
            ${utilisations.length
            ? utilisations.map(e => `<span class="tag tag-btn tag-status tag-status--${statusOf(e)}">${e.title} — ${STATUS_LABELS[statusOf(e)]}</span>`).join('')
            : '<span class="atl-warn">Aucun exercice du catalogue n\'utilise ce générateur.</span>'}
        </div>

        ${gen.params.length ? `<div class="atl-params">${gen.params.map(paramField).join('')}</div>` : ''}
    `;

    document.getElementById('atl-gen').onchange = (e) => {
        current.generatorId = e.target.value;
        current.params = {};
        renderControls();
        regenerate();
    };
    document.getElementById('atl-count').onchange = (e) => {
        current.count = Math.max(1, Math.min(30, Number(e.target.value) || DEFAULT_COUNT));
        regenerate();
    };
    document.getElementById('atl-regen').onclick = regenerate;

    host.querySelectorAll('[data-param]').forEach(el => {
        el.onchange = () => { current.params = readParams(host, gen); regenerate(); };
    });
    current.params = readParams(host, gen);
}

function paramField(p) {
    if (p.type === 'multiselect') {
        return `<label class="atl-field"><span>${p.label}</span>
            <span class="cfg-chips">${p.options.map(o => `
                <label class="cfg-chip"><input type="checkbox" data-param="${p.id}" data-kind="multi" value="${o}"
                    ${(p.default || []).includes(o) ? 'checked' : ''}><span>${o}</span></label>`).join('')}</span></label>`;
    }
    if (p.type === 'select') {
        return `<label class="atl-field"><span>${p.label}</span>
            <select class="cfg-input" data-param="${p.id}" data-kind="select">
                ${p.options.map(o => `<option value="${o}" ${o === p.default ? 'selected' : ''}>${o}</option>`).join('')}
            </select></label>`;
    }
    return `<label class="atl-field atl-field--sm"><span>${p.label}</span>
        <input type="number" class="cfg-input" data-param="${p.id}" data-kind="number" value="${p.default}"></label>`;
}

function readParams(host, gen) {
    const out = {};
    gen.params.forEach(p => {
        if (p.type === 'multiselect') {
            const boxes = [...host.querySelectorAll(`[data-param="${p.id}"][data-kind="multi"]`)];
            const isNum = typeof p.options[0] === 'number';
            out[p.id] = boxes.filter(b => b.checked).map(b => (isNum ? Number(b.value) : b.value));
        } else {
            const el = host.querySelector(`[data-param="${p.id}"]`);
            if (!el) return;
            out[p.id] = p.type === 'number' ? Number(el.value) : el.value;
        }
    });
    return out;
}

// --- Génération et rendu de la planche --------------------------------------

function regenerate() {
    const gen = getGenerator(current.generatorId);
    const items = [];
    for (let i = 0; i < current.count; i++) {
        const seed = randomSeed();
        try {
            items.push(gen.generate(current.params, { rng: makeRng(seed), weakTables: [], preferredKind: null }));
        } catch (err) {
            items.push({ erreur: err.message, seed });
        }
    }
    current.items = items;
    renderSheet(items);
    renderVerdict();
}

function renderSheet(items) {
    const host = document.getElementById('atelier-sheet');
    host.innerHTML = items.map((it, i) => it.erreur ? erreurCard(it, i) : questionCard(it, i)).join('');

    host.querySelectorAll('[data-flag]').forEach(btn => {
        btn.onclick = () => flagQuestion(Number(btn.dataset.flag));
    });
    host.querySelectorAll('[data-play]').forEach(btn => {
        btn.onclick = () => playSeed(btn.dataset.play);
    });
}

function erreurCard(it, i) {
    return `<div class="atl-card atl-card--error">
        <div class="atl-card-head"><span class="atl-num">${i + 1}</span>
        <span class="atl-seed">${it.seed}</span></div>
        <div class="atl-erreur">Le générateur a échoué : ${escapeHtml(it.erreur)}</div>
    </div>`;
}

function questionCard(it, i) {
    const bonne = it.choices ? it.choices.find(c => c.correct) : null;
    const faux = it.choices ? it.choices.filter(c => !c.correct) : [];
    const sansDiagnostic = faux.filter(c => !c.why).length;

    return `
    <div class="atl-card">
        <div class="atl-card-head">
            <span class="atl-num">${i + 1}</span>
            <span class="atl-skill">${escapeHtml(skillLabel(it.skillId))}</span>
            <span class="atl-diff" title="Difficulté">${'●'.repeat(it.difficulty)}${'○'.repeat(Math.max(0, 5 - it.difficulty))}</span>
            <span class="atl-seed" title="Graine : permet de régénérer exactement cette question">${it.seed}</span>
        </div>

        <div class="atl-render">${it.prompt.html}</div>

        <div class="atl-block">
            <div class="atl-label">Réponse</div>
            <div class="atl-answer">${escapeHtml(it.answer)}</div>
        </div>

        ${it.choices ? `
        <div class="atl-block">
            <div class="atl-label">Propositions ${sansDiagnostic ? `<span class="atl-warn">— ${sansDiagnostic} sans diagnostic</span>` : ''}</div>
            <ul class="atl-choices">
                ${it.choices.map(c => `
                    <li class="${c.correct ? 'atl-ok' : 'atl-ko'}">
                        <span class="atl-choice-val">${c.correct ? '✓' : '✗'} ${escapeHtml(stripTags(c.label ?? c.value))}</span>
                        ${c.why ? `<span class="atl-why">${escapeHtml(c.why)}</span>`
            : (c.correct ? '' : '<span class="atl-why atl-why--absent">pas de diagnostic</span>')}
                    </li>`).join('')}
            </ul>
        </div>` : ''}

        <div class="atl-block">
            <div class="atl-label">Indices (${it.hints.length})</div>
            <ol class="atl-hints">${it.hints.map(h => `<li>${escapeHtml(h)}</li>`).join('') || '<li class="atl-warn">aucun</li>'}</ol>
        </div>

        <div class="atl-block">
            <div class="atl-label">Correction</div>
            <div class="atl-expl">${escapeHtml(it.explanation)}</div>
        </div>

        <div class="atl-card-actions">
            <button class="btn-toggle btn-toggle--sm" data-play="${it.seed}">▶ Jouer cette question</button>
            <button class="btn-toggle btn-toggle--sm" data-flag="${i}">⚑ Signaler un problème</button>
        </div>
    </div>`;
}

// --- Signalement d'une question ---------------------------------------------

const flags = [];

function flagQuestion(index) {
    const it = current.items[index];
    const note = prompt(`Question ${index + 1} — qu'est-ce qui ne va pas ?\n\n${it.prompt ? it.prompt.text : ''}`);
    if (!note) return;
    flags.push({ seed: it.seed, enonce: it.prompt ? it.prompt.text : '', reponse: String(it.answer), note });
    showToast('Problème noté. Il partira avec ton verdict.', 'success');
    renderVerdict();
}

/** Rejoue une question précise dans le vrai jeu, à partir de sa graine. */
async function playSeed(seed) {
    const exo = exercices.find(e => e.generatorId === current.generatorId);
    if (!exo) return showAlert('Aucun exercice du catalogue n\'utilise ce générateur : il n\'y a pas de jeu où le lancer.');

    const { makePath, makeStep } = await import('../core/path.js');
    const { Runner } = await import('../core/runner.js');
    const path = makePath(exo.title, [makeStep(exo.id, current.params, { nbItems: 3, threshold: 3, forceSeed: seed })]);
    new Runner({ path, deviceMode: 'none' }).start();
}

// --- Verdict ----------------------------------------------------------------

function renderVerdict() {
    const host = document.getElementById('atelier-verdict');
    host.innerHTML = `
        ${flags.length ? `<div class="atl-flags">
            <div class="atl-label">${flags.length} question(s) signalée(s)</div>
            <ul>${flags.map(f => `<li><code>${f.seed}</code> ${escapeHtml(f.enonce)} — ${escapeHtml(f.note)}</li>`).join('')}</ul>
        </div>` : ''}
        <label class="atl-field atl-field--wide">
            <span>Remarques générales (ce qu'il faut changer)</span>
            <textarea id="atl-note" class="cfg-input" rows="3" placeholder="Ex : les nombres sont trop grands pour un 6ᵉ ; le 2ᵉ indice donne la réponse…"></textarea>
        </label>
        <div class="atl-verdict-actions">
            <button class="atl-verdict atl-verdict--ok" data-verdict="valide">✅ Valider</button>
            <button class="atl-verdict atl-verdict--test" data-verdict="test">🔧 À revoir</button>
            <button class="atl-verdict atl-verdict--ko" data-verdict="rejete">🗑️ Rejeter</button>
        </div>`;

    host.querySelectorAll('[data-verdict]').forEach(btn => {
        btn.onclick = () => envoyer(btn.dataset.verdict);
    });
}

async function envoyer(verdict) {
    const gen = getGenerator(current.generatorId);
    const note = (document.getElementById('atl-note') || {}).value || '';

    const rapport = {
        ts: new Date().toISOString(),
        generateur: gen.id,
        params: current.params,
        verdict,
        note: note.trim(),
        signalements: [...flags],
        exercices: exercices.filter(e => e.generatorId === gen.id).map(e => ({ id: e.id, titre: e.title, statut: statusOf(e) })),
        // Un échantillon des questions relues, pour que la décision soit
        // rejouable : les graines suffisent à tout régénérer.
        echantillon: current.items.filter(i => !i.erreur).map(i => ({ seed: i.seed, enonce: i.prompt.text, reponse: String(i.answer) }))
    };

    try {
        const res = await fetch(REVIEW_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rapport)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        flags.length = 0;
        showToast(`Verdict « ${verdict} » enregistré pour ${gen.id}.`, 'success', 4000);
        renderVerdict();
    } catch (err) {
        // Le serveur de développement n'est pas là : on retombe sur un
        // fichier téléchargé, que l'on peut transmettre à la main.
        const blob = new Blob([JSON.stringify(rapport, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `revue_${gen.id.replace(/\./g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showAlert(`Le serveur n'a pas accepté l'envoi (${err.message}).\nLe verdict a été téléchargé en fichier à la place.`);
    }
}

// --- Utilitaires ------------------------------------------------------------

function stripTags(html) {
    return String(html).replace(/<[^>]*>/g, '').trim();
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
