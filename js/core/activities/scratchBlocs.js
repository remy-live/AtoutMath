// « Le Chat Géomètre » : programmer le chat pour repasser une figure.
//
// Trois morceaux, séparés exprès :
//   - `scratchVM.js`      exécute un programme et rend le tracé (sans DOM)
//   - `scratchScore.js`   compare ce tracé à la figure (sans DOM)
//   - `scratchAtelier.js` l'atelier de blocs à encoches, avec aimantation
// Ici on ne fait que les relier : la scène, la palette, le bouton Lancer.
//
// L'atelier est un VRAI atelier Scratch — des pièces qu'on tire, qui
// s'attirent, et une bouche de boucle qui s'ouvre. Une première version
// alignait les blocs dans une liste avec des fentes d'insertion : c'était
// jouable au doigt, mais ce n'était pas Scratch, et l'élève qui ouvre Scratch
// ensuite ne devait rien reconnaître. Le glisser-déposer est donc réécrit en
// événements pointeur, ce qui le rend utilisable au doigt sans rien perdre.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { executer, compterBlocs, contientBoucle, profondeurBoucles } from '../scratchVM.js';
import { comparerTrace, diagnostiquer, verifierExigences } from '../scratchScore.js';
import { CHAT_SVG, CHAT_TAILLE } from './chatSvg.js';
import { Atelier, vignettePalette } from './scratchAtelier.js';

const DEMI = 200;          // la scène couvre -200..200 dans les deux sens
const CARREAU = 10;        // un carreau du quadrillage = 10 pas du chat
const OUTILS = { compterBlocs, contientBoucle, profondeurBoucles };

/** Les pièces, dans le vocabulaire de Scratch. */
const MODELES = {
    chapeau: { type: 'chapeau', cat: 'events', libelle: 'quand ⚑ est cliqué', chapeau: true, champs: [], defauts: {} },
    avancer: { type: 'avancer', cat: 'motion', libelle: 'avancer de', unite: 'pas', champs: ['valeur'], defauts: { valeur: 100 } },
    droite: { type: 'droite', cat: 'motion', libelle: 'tourner ↻ de', unite: 'degrés', champs: ['valeur'], defauts: { valeur: 90 } },
    gauche: { type: 'gauche', cat: 'motion', libelle: 'tourner ↺ de', unite: 'degrés', champs: ['valeur'], defauts: { valeur: 90 } },
    orienter: { type: 'orienter', cat: 'motion', libelle: "s'orienter à", unite: 'degrés', champs: ['valeur'], defauts: { valeur: 90 } },
    allerA: { type: 'allerA', cat: 'motion', libelle: 'aller à x:', entre: 'y:', champs: ['valeur', 'valeur2'], defauts: { valeur: 0, valeur2: 0 } },
    stylo: { type: 'stylo', cat: 'pen', libelle: 'poser le stylo', champs: [], defauts: {} },
    leveStylo: { type: 'leveStylo', cat: 'pen', libelle: 'lever le stylo', champs: [], defauts: {} },
    repeter: { type: 'repeter', cat: 'control', libelle: 'répéter', unite: 'fois', champs: ['valeur'], defauts: { valeur: 4 }, bouche: true }
};

/** Valeurs proposées d'un geste, plutôt qu'un clavier à sortir. */
const ANGLES = [30, 36, 45, 60, 72, 90, 120, 144, 180];
const LONGUEURS = [20, 50, 60, 70, 80, 100, 160, 180, 200, 240];

const chatImg = new Image();
chatImg.src = CHAT_SVG;

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let item = null;
    let atelier = null;
    let anim = null;
    let traceCourante = [];

    // --- Rendu -------------------------------------------------------------

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        traceCourante = [];
        render();
    }

    function render() {
        const m = item.meta;
        if (atelier) { atelier.detruire(); atelier = null; }

        container.innerHTML = `
            <div class="sc-layout">
                <div class="sc-entete">
                    <span class="sc-niveau">Niveau ${m.niveau} / ${m.total}</span>
                    <b class="sc-titre">${m.titre}</b>
                </div>
                <p class="sc-consigne">${echapper(consigneCourte())}</p>
                <div class="sc-scene"><canvas class="sc-canvas"></canvas></div>
                <div class="sc-actions">
                    <button type="button" class="sc-btn sc-btn--go" data-run>⚑ Lancer</button>
                    <button type="button" class="sc-btn" data-clear>↺ Effacer</button>
                    <button type="button" class="sc-btn sc-btn--ok" data-valider>Valider</button>
                </div>
                <div class="sc-studio">
                    <div class="sc-palette" data-palette aria-label="Blocs disponibles"></div>
                    <div class="sc-atelier" data-atelier></div>
                </div>
                ${hintBar(session)}
            </div>`;

        preparerScene();
        preparerAtelier();

        if (session.frozen) return;
        if (session.isDemo) { runDemo(); return; }

        container.querySelector('[data-run]').onclick = () => lancer();
        container.querySelector('[data-clear]').onclick = () => {
            atelier.charger(item.meta.amorce || []);
            traceCourante = []; dessinerScene();
        };
        container.querySelector('[data-valider]').onclick = () => valider();
        wireHint(container, session);
    }

    function consigneCourte() {
        const t = item.prompt.text;
        const sep = t.indexOf(' — ');
        return sep > 0 ? t.slice(sep + 3) : t;
    }

    // --- Atelier et palette -------------------------------------------------

    function preparerAtelier() {
        const hote = container.querySelector('[data-atelier]');
        const palette = container.querySelector('[data-palette]');
        // Une pièce Scratch fait ~110 px de large. Sur un écran de 390 px, la
        // palette et l'atelier côte à côte ne peuvent pas les porter à taille
        // réelle : on réduit l'ensemble plutôt que de raccourcir les libellés,
        // parce que c'est ce texte-là que l'élève retrouvera dans Scratch.
        const k = Math.max(0.62, Math.min(1, window.innerWidth / 780));
        atelier = new Atelier(hote, palette, {
            modeles: MODELES, echelle: k,
            onEditerNombre: editerNombre,
            onChange: () => { }
        });
        atelier.dimensionner();
        if (!preparerAtelier._resize) {
            preparerAtelier._resize = () => {
                if (atelier) atelier.dimensionner();
                dimensionner(); dessinerScene();
            };
            window.addEventListener('resize', preparerAtelier._resize);
        }

        item.meta.palette.forEach(type => {
            palette.appendChild(vignettePalette(MODELES[type], (t, e) => {
                // La pièce naît SOUS le doigt, dans l'atelier, et le
                // glissement continue sans rupture : on tire une pièce de la
                // palette exactement comme dans Scratch.
                const p = atelier.versAtelier(e);
                const bloc = atelier.creer(t, p.x - 40, p.y - 18);
                atelier.commencerGlisser(bloc, e);
            }, k));
        });

        atelier.charger(item.meta.amorce || []);
    }

    // --- Saisie d'un nombre -------------------------------------------------

    function editerNombre(piece, champ, ancre) {
        fermerPavé();
        const angle = ['droite', 'gauche', 'orienter'].includes(piece.type);
        const suggestions = angle ? ANGLES : piece.type === 'avancer' ? LONGUEURS : [];
        const pop = document.createElement('div');
        pop.className = 'sc-pop';
        pop.innerHTML = `
            <input type="text" inputmode="numeric" class="sc-pop-champ"
                   value="${piece.valeurs[champ]}" aria-label="Valeur du bloc">
            <div class="sc-pop-chips">${suggestions.map(v =>
            `<button type="button" class="sc-chip" data-v="${v}">${v}</button>`).join('')}</div>
            <button type="button" class="sc-pop-ok">OK</button>`;
        document.body.appendChild(pop);
        placerPavé(pop, ancre);

        const champInput = pop.querySelector('.sc-pop-champ');
        const poser = () => {
            const n = parseFloat(String(champInput.value).replace(',', '.'));
            if (Number.isFinite(n)) {
                piece.valeurs[champ] = n;
                piece.remonterMiseEnForme();
            }
            fermerPavé();
        };
        pop.querySelector('.sc-pop-ok').onclick = poser;
        champInput.onkeydown = (e) => { if (e.key === 'Enter') poser(); if (e.key === 'Escape') fermerPavé(); };
        pop.querySelectorAll('.sc-chip').forEach(c => {
            c.onclick = () => { champInput.value = c.dataset.v; poser(); };
        });
        champInput.focus({ preventScroll: true });
        champInput.select();
        regTimeout(() => document.addEventListener('pointerdown', fermerSiDehors, true), 0);
    }

    function fermerSiDehors(e) {
        const pop = document.querySelector('.sc-pop');
        if (pop && !pop.contains(e.target)) fermerPavé();
    }

    function fermerPavé() {
        document.removeEventListener('pointerdown', fermerSiDehors, true);
        document.querySelectorAll('.sc-pop').forEach(p => p.remove());
    }

    function placerPavé(pop, ancre) {
        const r = ancre.getBoundingClientRect();
        const b = pop.getBoundingClientRect();
        const marge = 8;
        const left = Math.min(Math.max(marge, r.left + r.width / 2 - b.width / 2),
            window.innerWidth - b.width - marge);
        let top = r.bottom + 8;
        if (top + b.height > window.innerHeight - marge) top = Math.max(marge, r.top - b.height - 8);
        pop.style.left = `${Math.round(left)}px`;
        pop.style.top = `${Math.round(top)}px`;
    }

    // --- Scène --------------------------------------------------------------

    let cnv = null, ctx = null, echelle = 1;

    function preparerScene() {
        cnv = container.querySelector('.sc-canvas');
        if (!cnv) return;
        ctx = cnv.getContext('2d');
        dimensionner();
        if (chatImg.complete) dessinerScene();
        else chatImg.onload = () => { if (!destroyed) dessinerScene(); };
    }

    function dimensionner() {
        if (!cnv || !cnv.parentElement) return;
        const r = cnv.parentElement.getBoundingClientRect();
        const cote = Math.max(120, Math.min(r.width, r.height));
        cnv.width = cnv.height = Math.round(cote);
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

        // Un carreau = 10 pas, et on le DIT.
        //
        // Sans échelle, « avancer de 100 » ne veut rien dire : l'élève tâtonne
        // au lieu de compter. Avec un carreau valant 10 pas, un côté de 8
        // carreaux se lit à l'œil et s'écrit « avancer de 80 ».
        //
        // Un SEUL trait pour toutes les lignes : une ligne forte tous les cinq
        // carreaux dessinait un second quadrillage par-dessus le premier, et
        // on ne savait plus lequel compter.
        ctx.strokeStyle = 'rgba(120,140,170,.30)';
        ctx.lineWidth = 1;
        for (let v = -DEMI; v <= DEMI; v += CARREAU) {
            const a = versEcran({ x: v, y: -DEMI }), b = versEcran({ x: v, y: DEMI });
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            const c = versEcran({ x: -DEMI, y: v }), d = versEcran({ x: DEMI, y: v });
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
        }

        // Gabarit pâle, tracé de l'élève par-dessus : on voit ce qui est
        // couvert et ce qui dépasse. Le gabarit était épais de 14 px — il
        // noyait la figure et masquait les carreaux qu'il faut justement
        // compter. Il suffit qu'il se distingue du tracé, pas qu'il l'écrase.
        tracer(item.meta.figure, 'rgba(99,102,241,.30)', Math.max(4, cnv.width * 0.016));
        tracer(traceCourante, '#4f46e5', Math.max(2.5, cnv.width * 0.009));
        dessinerChat(chat || { ...item.meta.depart });

        legendeCarreau();
    }

    /** Un carreau témoin en bas à gauche : l'échelle, montrée plutôt qu'écrite. */
    function legendeCarreau() {
        const pas = CARREAU * echelle;
        const x = 10, y = cnv.height - 10 - pas;
        ctx.save();
        ctx.strokeStyle = 'rgba(79,70,229,.55)'; ctx.lineWidth = 1.4;
        ctx.strokeRect(x, y, pas, pas);
        ctx.fillStyle = 'rgba(71,85,105,.85)';
        ctx.font = `700 ${Math.max(9, Math.min(13, cnv.width * 0.033))}px 'Inter', sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(`= ${CARREAU} pas`, x + pas + 6, y + pas / 2);
        ctx.restore();
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

    // Où se trouve le ventre du chat dans son dessin, en proportion de
    // l'image. Le stylo sort de LÀ, pas du centre du rectangle : centré, le
    // chat semblait écrire avec le museau, et le trait paraissait démarrer
    // devant lui au lieu de sous lui.
    const VENTRE = { x: 0.52, y: 0.74 };

    function dessinerChat(c) {
        if (!chatImg.complete || !chatImg.naturalWidth) return;
        const e = versEcran(c);
        const h = Math.max(26, Math.min(64, cnv.width * 0.13));
        const w = h * (CHAT_TAILLE.w / CHAT_TAILLE.h);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate((c.dir - 90) * Math.PI / 180);   // le dessin regarde vers la droite
        ctx.drawImage(chatImg, -w * VENTRE.x, -h * VENTRE.y, w, h);
        ctx.restore();
    }

    // --- Exécution animée ---------------------------------------------------

    function lancer() {
        if (destroyed || anim || !atelier) return null;
        const script = atelier.versScript();
        return animer(executer(script, item.meta.depart));
    }

    /**
     * Rejoue le déplacement pas à pas : c'est en VOYANT le chat tourner qu'on
     * comprend pourquoi l'angle est faux. Durée bornée — une rosace de 24
     * côtés ne doit pas demander une minute d'attente.
     */
    function animer(resultat) {
        return new Promise(resolve => {
            const etapes = resultat.pas;
            if (!etapes.length) { traceCourante = []; dessinerScene(); resolve(resultat); return; }
            const duree = Math.max(700, Math.min(4000, etapes.length * 110));
            const parEtape = duree / etapes.length;
            let i = 0, depuis = { ...item.meta.depart };
            let courant = null, entame = false, t0 = performance.now();
            traceCourante = [];
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
                    // Un point mobile est POSÉ au premier passage puis déplacé :
                    // écraser le dernier point écrasait le début du trait.
                    if (!entame) { courant.push({ x, y }); entame = true; }
                    else courant[courant.length - 1] = { x, y };
                }
                dessinerScene({ x, y, dir: e.dir });
                if (k >= 1) {
                    if (trace && courant) courant[courant.length - 1] = { x: e.x, y: e.y };
                    if (e.bloc.type === 'stylo') nouveauTrait(e);
                    if (e.bloc.type === 'leveStylo') courant = null;
                    if (e.bloc.type === 'allerA') { if (e.stylo) nouveauTrait(e); else courant = null; }
                    depuis = { x: e.x, y: e.y }; entame = false;
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
        if (destroyed || session.locked || !atelier) return;
        const script = atelier.versScript();
        const resultat = await lancer();
        if (destroyed || !resultat) return;

        const juge = comparerTrace(resultat.traces, item.meta.figure);
        const styloOublie = resultat.traces.length === 0
            && resultat.pas.some(p => p.bloc.type === 'avancer');
        let message = null;

        if (!script.length) {
            message = "Le programme est vide : tire un bloc de la palette et accroche-le sous le chapeau.";
        } else if (!juge.reussi) {
            message = diagnostiquer(juge, { rienTrace: resultat.traces.length === 0, styloOublie });
        } else {
            message = verifierExigences(script, item.meta.exigences, OUTILS);
        }

        const bon = juge.reussi && !message;
        const res = session.submit(bon ? item.answer : resumer(script),
            { misconception: message || undefined });
        if (res.ignored) return;

        res.dismissed.then(() => {
            if (destroyed) return;
            if (res.correct) { regTimeout(renderNext, 700); return; }
            if (res.revealed) { montrerModele(); regTimeout(renderNext, 3400); }
        });
    }

    /** Rejoue la solution attendue : voir la réponse vaut mieux que la lire. */
    function montrerModele() {
        atelier.charger(item.meta.modele);
        lancer();
    }

    function resumer(s) {
        if (!s.length) return '(programme vide)';
        return s.map(b => {
            const m = MODELES[b.type];
            const v = m.champs.length ? ` ${b.valeur}` : '';
            return b.corps ? `${m.libelle}${v} [${resumer(b.corps)}]` : `${m.libelle}${v}`;
        }).join(', ');
    }

    // --- Démonstration ------------------------------------------------------

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

        // Le robot POSE les pièces une par une, en disant pourquoi : c'est la
        // seule façon de transmettre « 360 divisé par le nombre de côtés ».
        for (let i = 0; i < m.modele.length; i++) {
            if (!await gate.waitTurn() || destroyed) return fin();
            atelier.charger(m.modele.slice(0, i + 1));
            const phrase = commenter(m.modele[i], m);
            const derniere = [...container.querySelectorAll('.sc-piece--vive')].pop();
            if (phrase) cursor.say(phrase, derniere);
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

    /** Ce que le robot dit en posant une pièce — seulement quand ça apprend. */
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
            if (preparerAtelier._resize) {
                window.removeEventListener('resize', preparerAtelier._resize);
                preparerAtelier._resize = null;
            }
            fermerPavé();
            if (atelier) { atelier.detruire(); atelier = null; }
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
