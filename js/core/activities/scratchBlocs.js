// « Le Chat Géomètre » : construire un programme en blocs pour repasser une
// figure.
//
// Ce fichier ne contient AUCUNE géométrie : la machine virtuelle exécute le
// script, la notation compare le tracé à la figure, et tous deux sont
// testables hors navigateur. Ici on ne fait que trois choses — montrer la
// scène, laisser poser des blocs, animer le chat.
//
// Le sujet difficile est la SAISIE SUR TÉLÉPHONE. Le glisser-déposer de
// Scratch demande de la précision, et sur 390 px la palette et le poste de
// travail ne tiennent pas côte à côte. Deux modes coexistent donc :
//
//   « taper »   — on touche un bloc de la palette, il s'insère à l'endroit
//                 marqué par le curseur (une fente surlignée qu'on déplace
//                 d'un doigt). Aucun geste précis, aucune cible mouvante.
//   « glisser » — le vrai glisser-déposer, pour la tablette et l'ordinateur.
//
// Le mode se choisit, et le choix est retenu d'une session à l'autre. Par
// défaut on prend « taper » sur téléphone et « glisser » ailleurs.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { executer, compterBlocs, contientBoucle, profondeurBoucles, BLOCS } from '../scratchVM.js';
import { comparerTrace, diagnostiquer, verifierExigences } from '../scratchScore.js';
import { CHAT_SVG, CHAT_TAILLE } from './chatSvg.js';

const CLE_SAISIE = 'mathbox-scratch-saisie';
const DEMI = 200;          // la scène couvre -200..200 dans les deux sens
const OUTILS = { compterBlocs, contientBoucle, profondeurBoucles };

/** Angles proposés d'un geste, plutôt que d'obliger à taper au clavier. */
const ANGLES_COURANTS = [30, 36, 45, 60, 72, 90, 120, 144, 180];
const LONGUEURS_COURANTES = [20, 50, 60, 70, 80, 100, 160, 180, 200, 240];

const chatImg = new Image();
chatImg.src = CHAT_SVG;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let item = null;
    let script = [];
    let curseurScript = null;      // { parent, index } : où le prochain bloc s'insère
    let anim = null;               // animation en cours
    let traceCourante = [];        // ce que le chat a dessiné jusqu'ici
    let modeSaisie = lireMode();

    function lireMode() {
        const force = (session.params && session.params.saisie) || 'auto';
        if (force === 'toucher' || force === 'glisser') return force;
        try {
            const retenu = localStorage.getItem(CLE_SAISIE);
            if (retenu === 'toucher' || retenu === 'glisser') return retenu;
        } catch { /* stockage privé */ }
        // Le doigt sur petit écran : taper. Souris ou grande dalle : glisser.
        return (window.innerWidth <= 760 && matchMedia('(pointer: coarse)').matches)
            ? 'toucher' : 'glisser';
    }

    // --- Rendu -------------------------------------------------------------

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        const m = item.meta;
        script = clonerScript(m.amorce || []);
        curseurScript = { parent: script, index: script.length };
        traceCourante = [];
        render();
    }

    function render() {
        const m = item.meta;
        container.innerHTML = `
            <div class="sc-layout" data-mode="${modeSaisie}">
                <div class="sc-entete">
                    <span class="sc-niveau">Niveau ${m.niveau} / ${m.total}</span>
                    <b class="sc-titre">${m.titre}</b>
                    <button type="button" class="sc-mode" data-mode-btn
                        title="Changer la façon de poser les blocs">${modeSaisie === 'toucher' ? '👆 Taper' : '✋ Glisser'}</button>
                </div>
                <p class="sc-consigne">${item.meta.consigneHtml || echapper(itemConsigne())}</p>
                <div class="sc-scene"><canvas class="sc-canvas"></canvas></div>
                <div class="sc-script" data-script role="list" aria-label="Programme du chat"></div>
                <div class="sc-palette" data-palette></div>
                <div class="sc-actions">
                    <button type="button" class="sc-btn sc-btn--go" data-run>▶ Lancer</button>
                    <button type="button" class="sc-btn" data-clear>↺ Effacer</button>
                    <button type="button" class="sc-btn sc-btn--ok" data-valider>Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

        dessinerPalette();
        dessinerScript();
        preparerScene();

        if (session.frozen) return;
        if (session.isDemo) { runDemo(); return; }

        container.querySelector('[data-run]').onclick = () => lancer();
        container.querySelector('[data-clear]').onclick = () => {
            script = clonerScript(item.meta.amorce || []);
            curseurScript = { parent: script, index: script.length };
            traceCourante = [];
            dessinerScript(); dessinerScene();
        };
        container.querySelector('[data-valider]').onclick = () => valider();
        container.querySelector('[data-mode-btn]').onclick = () => {
            modeSaisie = modeSaisie === 'toucher' ? 'glisser' : 'toucher';
            try { localStorage.setItem(CLE_SAISIE, modeSaisie); } catch { /* privé */ }
            render();
        };
        wireHint(container, session);
    }

    function itemConsigne() {
        // La consigne du générateur porte « Titre — consigne » ; le titre est
        // déjà dans l'en-tête, on n'affiche que la phrase.
        const t = item.prompt.text;
        const sep = t.indexOf(' — ');
        return sep > 0 ? t.slice(sep + 3) : t;
    }

    // --- Palette -----------------------------------------------------------

    function dessinerPalette() {
        const hote = container.querySelector('[data-palette]');
        hote.innerHTML = item.meta.palette.map(type => {
            const d = BLOCS[type];
            return `<button type="button" class="sc-pal sc-bloc--${d.cat}" data-ajout="${type}"
                        draggable="${modeSaisie === 'glisser'}">
                        ${etiquette(type)}
                    </button>`;
        }).join('');

        hote.querySelectorAll('[data-ajout]').forEach(btn => {
            const type = btn.dataset.ajout;
            if (modeSaisie === 'toucher') {
                btn.onclick = () => { inserer(nouveauBloc(type)); };
            } else {
                brancherGlisserDepuisPalette(btn, type);
            }
        });
    }

    /** Libellé court d'un bloc de palette, valeur par défaut comprise. */
    function etiquette(type) {
        const d = BLOCS[type];
        if (!d.unite && d.defaut === undefined) return d.libelle;
        return `${d.libelle} <b>${d.defaut}</b>${d.unite ? ' ' + d.unite : ''}`;
    }

    function nouveauBloc(type) {
        const d = BLOCS[type];
        const b = { type };
        if (d.defaut !== undefined) b.valeur = d.defaut;
        if (d.second !== undefined) b.valeur2 = d.second;
        if (d.corps) b.corps = [];
        return b;
    }

    // --- Le script ---------------------------------------------------------

    function dessinerScript() {
        const hote = container.querySelector('[data-script]');
        if (!hote) return;
        const lignes = [];
        applatir(script, 0, lignes);
        hote.innerHTML = lignes.map(l => ligneHtml(l)).join('')
            + fenteHtml(script, script.length, 0)
            + (lignes.length ? '' : '<p class="sc-vide">Ajoute un premier bloc ci-dessous.</p>');
        brancherScript(hote);
    }

    /**
     * Aplatit l'arbre en lignes affichables. Chaque ligne connaît son
     * emplacement (`parent` + `index`), ce qui permet d'insérer, de supprimer
     * et de déplacer sans jamais reconstruire l'arbre à l'envers.
     */
    function applatir(blocs, profondeur, sortie) {
        blocs.forEach((bloc, index) => {
            sortie.push({ bloc, parent: blocs, index, profondeur });
            if (bloc.corps) {
                applatir(bloc.corps, profondeur + 1, sortie);
                sortie.push({ fin: bloc, parent: bloc.corps, index: bloc.corps.length, profondeur: profondeur + 1 });
            }
        });
    }

    function ligneHtml(l) {
        if (l.fin) {
            // Fente d'insertion À L'INTÉRIEUR de la boucle, puis sa fermeture.
            return fenteHtml(l.parent, l.index, l.profondeur)
                + `<div class="sc-fin" style="--prof:${l.profondeur - 1}"></div>`;
        }
        const b = l.bloc, d = BLOCS[b.type];
        const champs = [];
        if (d.defaut !== undefined) {
            champs.push(`<button type="button" class="sc-num" data-champ="valeur">${b.valeur}</button>`);
        }
        if (d.second !== undefined) {
            champs.push(`<span class="sc-txt">y:</span>`
                + `<button type="button" class="sc-num" data-champ="valeur2">${b.valeur2}</button>`);
        }
        return fenteHtml(l.parent, l.index, l.profondeur)
            + `<div class="sc-bloc sc-bloc--${d.cat}" style="--prof:${l.profondeur}"
                    data-ligne draggable="${modeSaisie === 'glisser'}" role="listitem">
                <span class="sc-grip" aria-hidden="true">⠿</span>
                <span class="sc-txt">${d.libelle}</span>
                ${champs.join('')}
                ${d.unite ? `<span class="sc-txt">${d.unite}</span>` : ''}
                <button type="button" class="sc-sup" aria-label="Supprimer ce bloc">✕</button>
            </div>`;
    }

    /** Fente d'insertion : c'est elle qui porte le curseur en mode « taper ». */
    function fenteHtml(parent, index, profondeur) {
        const actif = curseurScript && curseurScript.parent === parent && curseurScript.index === index;
        return `<button type="button" class="sc-fente${actif ? ' sc-fente--ici' : ''}"
                    style="--prof:${profondeur}" data-fente
                    aria-label="Insérer ici"><span></span></button>`;
    }

    function brancherScript(hote) {
        // Les fentes portent leur emplacement par référence : on relie donc
        // les nœuds du DOM aux nœuds de l'arbre dans l'ordre où ils ont été
        // produits, plutôt que par des identifiants qu'il faudrait maintenir.
        const lignes = [];
        applatir(script, 0, lignes);
        const fentes = [...hote.querySelectorAll('[data-fente]')];
        const emplacements = lignes.map(l => ({ parent: l.parent, index: l.index }));
        emplacements.push({ parent: script, index: script.length });
        fentes.forEach((el, i) => {
            const e = emplacements[i];
            if (!e) return;
            el._place = e;
            el.onclick = () => { curseurScript = { ...e }; dessinerScript(); };
            if (modeSaisie === 'glisser') brancherDepot(el);
        });

        const rangs = lignes.filter(l => !l.fin);
        [...hote.querySelectorAll('[data-ligne]')].forEach((el, i) => {
            const l = rangs[i];
            if (!l) return;
            el._ligne = l;
            el.querySelector('.sc-sup').onclick = (e) => {
                e.stopPropagation();
                l.parent.splice(l.index, 1);
                curseurScript = { parent: script, index: script.length };
                dessinerScript();
            };
            el.querySelectorAll('.sc-num').forEach(btn => {
                btn.onclick = (e) => { e.stopPropagation(); editerNombre(btn, l.bloc, btn.dataset.champ); };
            });
            if (modeSaisie === 'glisser') brancherGlisserLigne(el, l);
        });
    }

    function inserer(bloc) {
        const p = curseurScript && curseurScript.parent ? curseurScript : { parent: script, index: script.length };
        p.parent.splice(p.index, 0, bloc);
        // Poser une boucle place le curseur DEDANS : neuf fois sur dix, le
        // bloc suivant est son contenu. Sinon on avance d'un cran.
        curseurScript = bloc.corps
            ? { parent: bloc.corps, index: 0 }
            : { parent: p.parent, index: p.index + 1 };
        dessinerScript();
    }

    // --- Saisie d'un nombre -------------------------------------------------

    function editerNombre(btn, bloc, champ) {
        fermerPopover();
        const angle = ['droite', 'gauche', 'orienter'].includes(bloc.type);
        const suggestions = angle ? ANGLES_COURANTS
            : bloc.type === 'avancer' ? LONGUEURS_COURANTES : [];
        const pop = document.createElement('div');
        pop.className = 'sc-pop';
        pop.innerHTML = `
            <input type="text" inputmode="numeric" class="sc-pop-champ"
                   value="${bloc[champ]}" aria-label="Valeur du bloc">
            <div class="sc-pop-chips">${suggestions.map(v =>
            `<button type="button" class="sc-chip" data-v="${v}">${v}</button>`).join('')}</div>
            <button type="button" class="sc-pop-ok">OK</button>`;
        document.body.appendChild(pop);
        placerPopover(pop, btn);

        const champInput = pop.querySelector('.sc-pop-champ');
        const valider = () => {
            const n = parseFloat(String(champInput.value).replace(',', '.'));
            if (Number.isFinite(n)) bloc[champ] = n;
            fermerPopover();
            dessinerScript();
        };
        pop.querySelector('.sc-pop-ok').onclick = valider;
        champInput.onkeydown = (e) => { if (e.key === 'Enter') valider(); if (e.key === 'Escape') fermerPopover(); };
        pop.querySelectorAll('.sc-chip').forEach(c => {
            c.onclick = () => { champInput.value = c.dataset.v; valider(); };
        });
        champInput.focus({ preventScroll: true });
        champInput.select();
        regTimeout(() => {
            document.addEventListener('pointerdown', fermerSiDehors, true);
        }, 0);
    }

    function fermerSiDehors(e) {
        const pop = document.querySelector('.sc-pop');
        if (pop && !pop.contains(e.target)) fermerPopover();
    }

    function fermerPopover() {
        document.removeEventListener('pointerdown', fermerSiDehors, true);
        document.querySelectorAll('.sc-pop').forEach(p => p.remove());
    }

    function placerPopover(pop, ancre) {
        const r = ancre.getBoundingClientRect();
        const b = pop.getBoundingClientRect();
        const marge = 8;
        let left = Math.min(Math.max(marge, r.left + r.width / 2 - b.width / 2),
            window.innerWidth - b.width - marge);
        // Au-dessus si le clavier virtuel risque de manger le bas de l'écran.
        let top = r.bottom + 8;
        if (top + b.height > window.innerHeight - marge) top = Math.max(marge, r.top - b.height - 8);
        pop.style.left = `${Math.round(left)}px`;
        pop.style.top = `${Math.round(top)}px`;
    }

    // --- Glisser-déposer (tablette et ordinateur) ---------------------------

    let porte = null;   // { bloc, source } : ce qui est en cours de déplacement

    function brancherGlisserDepuisPalette(btn, type) {
        btn.addEventListener('dragstart', (e) => {
            porte = { bloc: nouveauBloc(type), source: null };
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', type);
        });
        btn.addEventListener('dragend', () => { porte = null; nettoyerDepots(); });
        // Le glisser natif n'existe pas au doigt : un appui simple ajoute donc
        // quand même le bloc. Personne ne doit rester bloqué parce qu'il a
        // choisi le mauvais mode.
        btn.onclick = () => inserer(nouveauBloc(type));
    }

    function brancherGlisserLigne(el, ligne) {
        el.addEventListener('dragstart', (e) => {
            porte = { bloc: ligne.bloc, source: ligne };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'bloc');
            regTimeout(() => el.classList.add('sc-bloc--parti'), 0);
        });
        el.addEventListener('dragend', () => {
            porte = null; nettoyerDepots(); dessinerScript();
        });
    }

    function brancherDepot(fente) {
        fente.addEventListener('dragover', (e) => {
            if (!porte) return;
            e.preventDefault();
            fente.classList.add('sc-fente--vise');
        });
        fente.addEventListener('dragleave', () => fente.classList.remove('sc-fente--vise'));
        fente.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!porte) return;
            const cible = fente._place;
            // Déplacement : on retire d'abord, ce qui peut décaler la cible
            // quand elle suit la source DANS LE MÊME conteneur.
            if (porte.source) {
                const { parent, index } = porte.source;
                // Interdit de déposer une boucle dans son propre corps :
                // l'arbre deviendrait cyclique et l'exécution ne finirait pas.
                if (contientNoeud(porte.bloc, cible.parent)) { porte = null; return; }
                parent.splice(index, 1);
                if (cible.parent === parent && cible.index > index) cible.index--;
            }
            cible.parent.splice(cible.index, 0, porte.bloc);
            curseurScript = { parent: cible.parent, index: cible.index + 1 };
            porte = null;
            dessinerScript();
        });
    }

    function nettoyerDepots() {
        container.querySelectorAll('.sc-fente--vise').forEach(f => f.classList.remove('sc-fente--vise'));
        container.querySelectorAll('.sc-bloc--parti').forEach(f => f.classList.remove('sc-bloc--parti'));
    }

    /** Vrai si `tableau` est le corps de `bloc` ou d'un de ses descendants. */
    function contientNoeud(bloc, tableau) {
        if (!bloc.corps) return false;
        if (bloc.corps === tableau) return true;
        return bloc.corps.some(b => contientNoeud(b, tableau));
    }

    // --- Scène --------------------------------------------------------------

    let cnv = null, ctx = null, echelle = 1;

    function preparerScene() {
        cnv = container.querySelector('.sc-canvas');
        if (!cnv) return;
        ctx = cnv.getContext('2d');
        dimensionner();
        if (!preparerScene._resize) {
            preparerScene._resize = () => { dimensionner(); dessinerScene(); };
            window.addEventListener('resize', preparerScene._resize);
        }
        if (chatImg.complete) dessinerScene();
        else chatImg.onload = () => { if (!destroyed) dessinerScene(); };
    }

    function dimensionner() {
        if (!cnv) return;
        const r = cnv.parentElement.getBoundingClientRect();
        const cote = Math.max(120, Math.min(r.width, r.height));
        cnv.width = Math.round(cote);
        cnv.height = Math.round(cote);
        cnv.style.width = cnv.style.height = `${Math.round(cote)}px`;
        echelle = cote / (2 * DEMI);
    }

    /** Repère de la machine (y vers le haut) → pixels du canevas (y vers le bas). */
    function versEcran(p) {
        return { x: cnv.width / 2 + p.x * echelle, y: cnv.height / 2 - p.y * echelle };
    }

    function dessinerScene(chat) {
        if (!ctx || !cnv) return;
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        // Quadrillage discret : il donne l'échelle sans attirer l'œil.
        ctx.strokeStyle = 'rgba(148,163,184,.25)'; ctx.lineWidth = 1;
        for (let v = -DEMI; v <= DEMI; v += 50) {
            const a = versEcran({ x: v, y: -DEMI }), b = versEcran({ x: v, y: DEMI });
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            const c = versEcran({ x: -DEMI, y: v }), d = versEcran({ x: DEMI, y: v });
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
        }

        // La figure à repasser : épaisse et pâle, c'est un GABARIT. Le tracé de
        // l'élève passe par-dessus, plus fin et coloré, pour qu'on voie
        // exactement ce qui est couvert et ce qui dépasse.
        tracer(item.meta.figure, 'rgba(99,102,241,.22)', 14);
        tracer(traceCourante, '#4f46e5', 4);

        const c = chat || { x: item.meta.depart.x, y: item.meta.depart.y, dir: item.meta.depart.dir };
        dessinerChat(c);
    }

    function tracer(lignes, couleur, epaisseur) {
        ctx.strokeStyle = couleur; ctx.lineWidth = epaisseur;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const ligne of lignes || []) {
            if (!ligne || ligne.length < 2) continue;
            ctx.beginPath();
            ligne.forEach((p, i) => {
                const e = versEcran(p);
                if (i === 0) ctx.moveTo(e.x, e.y); else ctx.lineTo(e.x, e.y);
            });
            ctx.stroke();
        }
    }

    function dessinerChat(c) {
        if (!chatImg.complete || !chatImg.naturalWidth) return;
        const e = versEcran(c);
        const h = Math.max(26, Math.min(64, cnv.width * 0.13));
        const w = h * (CHAT_TAILLE.w / CHAT_TAILLE.h);
        ctx.save();
        ctx.translate(e.x, e.y);
        // Le dessin regarde vers la droite = direction 90 de la machine.
        ctx.rotate((c.dir - 90) * Math.PI / 180);
        ctx.drawImage(chatImg, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    // --- Exécution animée ---------------------------------------------------

    function lancer() {
        if (destroyed || anim) return null;
        const r = executer(script, item.meta.depart);
        traceCourante = [];
        return animer(r);
    }

    /**
     * Rejoue le déplacement pas à pas plutôt que d'afficher le résultat d'un
     * coup : c'est en VOYANT le chat tourner qu'on comprend pourquoi l'angle
     * est faux. La durée totale est bornée — une rosace de 24 côtés ne doit
     * pas demander une minute d'attente.
     */
    function animer(resultat) {
        return new Promise(resolve => {
            const etapes = resultat.pas;
            if (!etapes.length) { dessinerScene(); resolve(resultat); return; }
            const duree = Math.max(700, Math.min(4000, etapes.length * 110));
            const parEtape = duree / etapes.length;
            let i = 0, depuis = { ...item.meta.depart };
            let courant = null;
            traceCourante = [];
            let t0 = performance.now();
            let entame = false;   // le point mobile du segment en cours est-il posé ?

            const nouveauTrait = (p) => { courant = [{ x: p.x, y: p.y }]; traceCourante.push(courant); };
            if (item.meta.depart.stylo) nouveauTrait(depuis);

            const image = (t) => {
                if (destroyed) { anim = null; resolve(resultat); return; }
                const e = etapes[i];
                const k = Math.min(1, (t - t0) / parEtape);
                const trace = e.bloc.type === 'avancer' && e.stylo;
                const x = depuis.x + (e.x - depuis.x) * k;
                const y = depuis.y + (e.y - depuis.y) * k;
                if (trace) {
                    if (!courant) nouveauTrait(depuis);
                    // On POSE un point mobile au premier passage, puis on le
                    // déplace. Écraser directement le dernier point écrasait le
                    // début du trait, qui se réduisait à son extrémité — le
                    // tracé de l'élève était invisible.
                    if (!entame) { courant.push({ x, y }); entame = true; }
                    else courant[courant.length - 1] = { x, y };
                }
                dessinerScene({ x, y, dir: e.dir });
                if (k >= 1) {
                    if (trace && courant) courant[courant.length - 1] = { x: e.x, y: e.y };
                    if (e.bloc.type === 'stylo') nouveauTrait(e);
                    if (e.bloc.type === 'leveStylo') courant = null;
                    if (e.bloc.type === 'allerA') { if (e.stylo) nouveauTrait(e); else courant = null; }
                    depuis = { x: e.x, y: e.y };
                    entame = false;
                    i++; t0 = t;
                    if (i >= etapes.length) {
                        anim = null;
                        traceCourante = traceCourante.filter(l => l && l.length > 1);
                        dessinerScene({ x: e.x, y: e.y, dir: e.dir });
                        resolve(resultat);
                        return;
                    }
                }
                anim = requestAnimationFrame(image);
            };
            anim = requestAnimationFrame(image);
        });
    }

    // --- Validation ---------------------------------------------------------

    async function valider() {
        if (destroyed || session.locked) return;
        const resultat = await lancer();
        if (destroyed || !resultat) return;

        const juge = comparerTrace(resultat.traces, item.meta.figure);
        const styloOublie = resultat.traces.length === 0
            && resultat.pas.some(p => p.bloc.type === 'avancer');
        let message = null;

        if (!juge.reussi) {
            message = diagnostiquer(juge, { rienTrace: resultat.traces.length === 0, styloOublie });
        } else {
            // Le tracé est bon : reste l'exigence de code du niveau, quand il
            // y en a une (« utilise une boucle »).
            message = verifierExigences(script, item.meta.exigences, OUTILS);
        }

        const bon = juge.reussi && !message;
        const donnee = bon ? item.answer : resumerScript(script);
        const res = session.submit(donnee, { misconception: message || undefined });
        if (res.ignored) return;

        res.dismissed.then(() => {
            if (destroyed) return;
            if (res.correct) { regTimeout(renderNext, 700); return; }
            if (res.revealed) { montrerModele(); regTimeout(renderNext, 3200); }
        });
    }

    /** Rejoue la solution attendue : voir la réponse vaut mieux que la lire. */
    function montrerModele() {
        script = clonerScript(item.meta.modele);
        curseurScript = { parent: script, index: script.length };
        dessinerScript();
        lancer();
    }

    /** Trace écrite du script, pour le carnet d'erreurs. */
    function resumerScript(s) {
        if (!s.length) return '(programme vide)';
        return s.map(b => {
            const d = BLOCS[b.type];
            const v = d.defaut !== undefined ? ` ${b.valeur}` : '';
            return b.corps ? `${d.libelle}${v} [${resumerScript(b.corps)}]` : `${d.libelle}${v}`;
        }).join(', ');
    }

    // --- Démonstration ------------------------------------------------------
    //
    // Le robot ne se contente pas de montrer la figure finie : il POSE les
    // blocs un par un en disant pourquoi. C'est la seule façon de transmettre
    // le raisonnement « 360 divisé par le nombre de côtés ».

    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        cursor.protegerZone(container.querySelector('.sc-scene'));
        const gate = createDemoGate(container.querySelector('.sc-layout') || container);
        const fin = () => { cursor.hideBubble(); gate.destroy(); };
        const m = item.meta;

        if (!await cursor.pause(700) || destroyed) return fin();
        if (!await gate.waitTurn() || destroyed) return fin();
        cursor.say(`On doit repasser ${m.titre.toLowerCase()}. Je vais écrire le programme du chat.`,
            container.querySelector('.sc-scene'));
        if (!await cursor.pause(1600) || destroyed) return fin();

        // On pose le modèle bloc par bloc, en commentant les plus parlants.
        script = [];
        curseurScript = { parent: script, index: 0 };
        for (const bloc of m.modele) {
            if (!await gate.waitTurn() || destroyed) return fin();
            script.push(clonerBloc(bloc));
            curseurScript = { parent: script, index: script.length };
            dessinerScript();
            const phrase = commenter(bloc, m);
            const dernier = container.querySelector('[data-script] .sc-bloc:last-of-type');
            if (phrase) cursor.say(phrase, dernier);
            if (!await cursor.pause(900) || destroyed) return fin();
        }

        if (!await gate.waitTurn() || destroyed) return fin();
        const btn = container.querySelector('[data-run]');
        cursor.say('Et je lance : le chat repasse la figure.', btn);
        if (btn && !await cursor.tap(btn, 700)) return fin();
        await lancer();
        if (destroyed) return fin();
        cursor.say(item.explanation, container.querySelector('.sc-scene'));
        if (!await cursor.pause(DEMO_SPEED.between + 1400) || destroyed) return fin();
        fin();
        renderNext();
    }

    /** Ce que le robot dit en posant un bloc — seulement quand ça apprend. */
    function commenter(bloc, m) {
        const cotes = m.id === 'triangle' ? 3 : m.id === 'hexagone' ? 6 : m.id === 'octogone' ? 8 : 0;
        switch (bloc.type) {
            case 'repeter':
                return cotes
                    ? `La figure a ${cotes} côtés identiques : je répète ${bloc.valeur} fois au lieu de tout réécrire.`
                    : `Ce qui se répète va DANS la boucle : je le répète ${bloc.valeur} fois.`;
            case 'droite':
            case 'gauche':
                if (cotes) return `Le chat fait un tour complet, 360°, en ${cotes} coins : 360 ÷ ${cotes} = ${bloc.valeur}°.`;
                return `Je tourne de ${bloc.valeur}° — le chat pivote sur place, il ne trace rien.`;
            case 'avancer': return `J'avance de ${bloc.valeur} pas : ça, ça trace.`;
            case 'stylo': return 'Je pose le stylo, sinon le chat se promène sans rien écrire.';
            case 'leveStylo': return 'Je lève le stylo pour me déplacer sans laisser de trait.';
            case 'allerA': return `Je saute au point (${bloc.valeur} ; ${bloc.valeur2}).`;
            default: return null;
        }
    }

    // --- Utilitaires --------------------------------------------------------

    function clonerBloc(b) {
        const c = { type: b.type };
        if (b.valeur !== undefined) c.valeur = b.valeur;
        if (b.valeur2 !== undefined) c.valeur2 = b.valeur2;
        if (b.corps) c.corps = clonerScript(b.corps);
        return c;
    }
    function clonerScript(s) { return (s || []).map(clonerBloc); }
    function echapper(s) {
        return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        pause() { if (anim) { cancelAnimationFrame(anim); anim = null; } },
        destroy() {
            destroyed = true;
            if (anim) { cancelAnimationFrame(anim); anim = null; }
            if (preparerScene._resize) {
                window.removeEventListener('resize', preparerScene._resize);
                preparerScene._resize = null;
            }
            fermerPopover();
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
