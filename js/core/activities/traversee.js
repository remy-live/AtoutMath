// Activité « La Traversée » — on embarque, on traverse, on recommence.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROIS GESTES, ET PAS UN DE PLUS : toucher quelqu'un sur la rive pour le
// faire monter, le retoucher dans la barque pour le faire descendre, toucher
// « Traverser ». Pas de glisser-déposer : viser pendant qu'on bouge, un élève
// de sixième le rate une fois sur trois au doigt.
//
// ── CE QUI SE PASSE QUAND ÇA TOURNE MAL, ET POURQUOI ON LE LAISSE ARRIVER ───
//
// On POURRAIT empêcher la traversée qui laisse le loup avec la chèvre, en
// grisant le bouton. On ne le fait pas, et c'est un choix :
//
//   · le logiciel donnerait alors la solution par élimination — il suffirait
//     d'appuyer partout et de regarder ce qui reste allumé ;
//   · et surtout, c'est la CONSÉQUENCE qui apprend. « Le loup a mangé la
//     chèvre » se retient ; « ce bouton est gris » ne se retient pas.
//
// MAIS UN DÉSASTRE NE COMPTE PAS COMME UNE ERREUR. On remet l'énigme au début
// et l'on recommence, sans rien envoyer au carnet : ce jeu se cherche par
// essais, et compter faux le premier essai découragerait exactement l'élève
// qu'on veut voir essayer. Ce qui part au carnet, c'est la réussite.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Qui est à gauche, qui est dans la barque, et de quel côté elle est. */
    let aGauche = [], dansBarque = [], barqueAGauche = true;
    let traversees = 0, essais = 0, fini = false;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function remettre() {
        aGauche = item.meta.passagers.map((_, i) => i);
        dansBarque = [];
        barqueAGauche = true;
        traversees = 0;
        fini = false;
    }

    function render(prochain) {
        item = prochain;
        essais = 0;
        remettre();

        container.innerHTML = `
            <div class="tv-layout">
                <div class="tv-context">${item.prompt.html}</div>
                <div class="tv-scene">
                    <div class="tv-rive tv-rive--g" data-rive="g"
                         aria-label="La rive de départ"></div>
                    <div class="tv-riviere">
                        <div class="tv-barque" aria-label="La barque"></div>
                    </div>
                    <div class="tv-rive tv-rive--d" data-rive="d"
                         aria-label="L'autre rive"></div>
                </div>
                <div class="tv-statut" role="status" aria-live="polite"></div>
                <div class="tv-actions">
                    <button type="button" class="tv-btn" data-recommencer>
                        ↺ Recommencer</button>
                    <button type="button" class="tv-btn tv-btn--fort" data-traverser>
                        Traverser</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        peindre();
        container.querySelector('[data-recommencer]').onclick = () => {
            if (fini) return;
            remettre(); peindre();
        };
        container.querySelector('[data-traverser]').onclick = traverser;
    }

    const estLourd = (k) => item.meta.lourds.includes(item.meta.passagers[k].id);

    /** Une pastille de passager, touchable. */
    function pastille(k, ou) {
        const p = item.meta.passagers[k];
        return `<button type="button" class="tv-pion" data-qui="${k}" data-ou="${ou}"
                 aria-label="${p.nom}"><span class="tv-emoji"
                 aria-hidden="true">${p.emoji}</span><span class="tv-nom">${p.nom}</span></button>`;
    }

    function peindre() {
        const tous = item.meta.passagers.map((_, i) => i);
        const aDroite = tous.filter(k => !aGauche.includes(k) && !dansBarque.includes(k));
        const mettre = (sel, liste, ou) => {
            const el = container.querySelector(sel);
            if (el) el.innerHTML = liste.map(k => pastille(k, ou)).join('');
        };
        mettre('.tv-rive--g', aGauche, 'g');
        mettre('.tv-rive--d', aDroite, 'd');
        mettre('.tv-barque', dansBarque, 'b');

        const riviere = container.querySelector('.tv-riviere');
        if (riviere) riviere.classList.toggle('tv-riviere--droite', !barqueAGauche);

        container.querySelectorAll('.tv-pion').forEach(b => {
            const k = Number(b.dataset.qui);
            const ou = b.dataset.ou;
            // ON NE TOUCHE QUE CE QUI EST DU CÔTÉ DE LA BARQUE : une pastille
            // de l'autre rive ne répond pas, et c'est la règle du jeu, pas une
            // panne — elle est trop loin pour monter.
            const atteignable = ou === 'b'
                || (ou === 'g' && barqueAGauche) || (ou === 'd' && !barqueAGauche);
            b.disabled = fini || session.locked || !atteignable;
            b.classList.toggle('tv-pion--loin', !atteignable && ou !== 'b');
            b.onclick = () => toucher(k, ou);
        });

        const traverser = container.querySelector('[data-traverser]');
        if (traverser) traverser.disabled = fini || session.locked || !dansBarque.length;
        const recommencer = container.querySelector('[data-recommencer]');
        if (recommencer) recommencer.disabled = fini || session.locked;

        const statut = container.querySelector('.tv-statut');
        if (statut && !fini) {
            statut.textContent = traversees
                ? `${traversees} traversée${traversees > 1 ? 's' : ''}.`
                    + (dansBarque.length ? ' La barque est chargée.'
                        : ' Choisis qui monte dans la barque.')
                : 'Touche ceux qui montent dans la barque, puis « Traverser ».';
        }
    }

    function toucher(k, ou) {
        if (fini || destroyed || session.locked) return;
        if (ou === 'b') {
            dansBarque = dansBarque.filter(x => x !== k);
            if (barqueAGauche) aGauche.push(k);
            peindre();
            return;
        }
        if (dansBarque.length >= item.meta.places) return;
        // UN ADULTE OCCUPE LA BARQUE ENTIÈRE, quand le scénario parle de poids.
        // On le refuse en le DISANT, au lieu de ne rien faire : un bouton qui
        // ne répond pas se lit comme une panne.
        const lourdsApres = dansBarque.filter(estLourd).length + (estLourd(k) ? 1 : 0);
        if (lourdsApres && dansBarque.length + 1 > 1) {
            const statut = container.querySelector('.tv-statut');
            if (statut) statut.textContent = 'La barque ne porte pas un adulte avec quelqu\'un.';
            return;
        }
        dansBarque.push(k);
        aGauche = aGauche.filter(x => x !== k);
        peindre();
    }

    /** Qui reste sans surveillance sur une rive, et est-ce que ça se passe mal ? */
    function desastre(rive) {
        const ids = rive.map(k => item.meta.passagers[k].id);
        const garde = item.meta.passeur >= 0
            ? rive.includes(item.meta.passeur)
            : rive.some(estLourd);
        if (garde) return null;
        for (const [a, b] of item.meta.interdits) {
            if (ids.includes(a) && ids.includes(b)) {
                const nom = (id) => item.meta.passagers.find(p => p.id === id).nom;
                return `${nom(a)} et ${nom(b)} sont restés seuls : c'est fini pour l'un des deux.`;
            }
        }
        return null;
    }

    function traverser() {
        if (fini || !dansBarque.length || session.locked) return;
        barqueAGauche = !barqueAGauche;
        traversees++;
        // On débarque tout le monde sur la rive d'arrivée.
        if (barqueAGauche) aGauche = aGauche.concat(dansBarque);
        dansBarque = [];
        peindre();

        const tous = item.meta.passagers.map((_, i) => i);
        const droite = tous.filter(k => !aGauche.includes(k));
        const mal = desastre(aGauche) || desastre(droite);
        if (mal) {
            essais++;
            const statut = container.querySelector('.tv-statut');
            const scene = container.querySelector('.tv-scene');
            if (scene) {
                scene.classList.add('tv-scene--rate');
                regTimeout(() => scene.classList.remove('tv-scene--rate'), 500);
            }
            if (statut) statut.textContent = `${mal} On recommence — essai n° ${essais + 1}.`;
            regTimeout(() => {
                if (destroyed || fini) return;
                remettre();
                peindre();
                const s = container.querySelector('.tv-statut');
                if (s) s.textContent = `Essai n° ${essais + 1}. Qui monte en premier ?`;
            }, 2200);
            return;
        }
        if (!aGauche.length) reussi();
    }

    function reussi() {
        fini = true;
        peindre();
        const scene = container.querySelector('.tv-scene');
        if (scene) scene.classList.add('tv-scene--ok');
        const statut = container.querySelector('.tv-statut');
        const mini = item.meta.minimum;
        if (statut) {
            statut.textContent = `Tout le monde est passé, en ${traversees} traversées !`
                + (mini && traversees > mini
                    ? ` Le minimum est ${mini} : il y a un aller-retour en trop.`
                    : mini && traversees === mini ? ' C\'est le minimum.' : '');
        }
        const result = session.submit('traverse');
        if (result.ignored) return;
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot joue la solution la plus courte, en la commentant. */
    async function runDemo() {
        peindre();
        for (const etape of item.meta.solution) {
            if (destroyed) return;
            const statut = container.querySelector('.tv-statut');
            if (statut) statut.textContent = etape;
            await new Promise(r => regTimeout(r, 1100));
        }
        if (!destroyed) regTimeout(renderNext, 900);
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            container.innerHTML = '';
            session.finish();
        }
    };
}
