// Activité « La Traversée » — on embarque, on traverse, on recommence.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUX FAÇONS DE FAIRE MONTER QUELQU'UN, ET LES DEUX COMPTENT.
//
// On touche quelqu'un sur la rive pour le faire monter, on le retouche dans la
// barque pour le faire descendre. C'est le geste le plus sûr au doigt : viser
// pendant qu'on bouge, un élève de sixième le rate une fois sur trois.
//
// ET ON PEUT AUSSI LE GLISSER. Rémy, 27 octobre : « ca fait vieillot de fou !
// et il faudrait pouvoir dragdropper ». Les deux demandes n'en font qu'une :
// un écran qui ne se prend pas en main EST un formulaire, et un formulaire
// fait vieux. On n'a donc rien retiré — on a ajouté le geste qui raconte
// l'histoire, en gardant celui qui ne rate jamais.
//
// ── LA SCÈNE, APRÈS TROIS MAQUETTES ────────────────────────────────────────
//
// Il a choisi « la rivière » : de l'herbe, de l'eau, une barque en bois. Trois
// MATIÈRES différentes là où tout avait le même poids — un cadre blanc à filet
// gris pour la scène, des cartes blanches à filet gris pour les personnages,
// et un carré en POINTILLÉS pour la barque, c'est-à-dire le dessin universel
// de la zone de dépôt vide dans un formulaire.
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

/** Les vagues du fond, et la coque : le décor ne bouge jamais. */
const VAGUES = `<svg class="tv-vagues" viewBox="0 0 100 200" preserveAspectRatio="none"
    aria-hidden="true">
    <path d="M0 30 q12 -8 25 0 t25 0 t25 0 t25 0" stroke-width="2.6" opacity=".45" />
    <path d="M-8 108 q12 -8 25 0 t25 0 t25 0 t25 0" stroke-width="2.6" opacity=".3" />
    <path d="M-2 172 q12 -8 25 0 t25 0 t25 0 t25 0" stroke-width="2.6" opacity=".38" />
</svg>`;
// LA COQUE GARDE SON RAPPORT, et il faut le dire : étirée pour remplir sa
// boîte, elle devient un SEAU — vu sur la photo, pas dans un compteur.
const COQUE = `<svg class="tv-coque" viewBox="0 0 150 80"
    preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <path d="M6 22 L144 22 L121 66 Q75 76 29 66 Z" fill="#d9a05b" stroke="#9a6b32"
        stroke-width="3" stroke-linejoin="round" />
    <rect x="6" y="14" width="138" height="11" rx="5.5" fill="#b9793b" />
</svg>`;

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** Qui est à gauche, qui est dans la barque, et de quel côté elle est. */
    let aGauche = [], dansBarque = [], barqueAGauche = true;
    let traversees = 0, essais = 0, fini = false;
    /** Le passager qu'on tient, le point de départ du doigt, et le fantôme. */
    let prise = null, depart = null, aGlisse = false, fantome = null;

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
        prise = null; depart = null; aGlisse = false;
        cacherFantome();
        remettre();

        container.innerHTML = `
            <div class="tv-layout">
                <div class="tv-context">${item.prompt.html}</div>
                <div class="tv-scene">
                    <div class="tv-rive tv-rive--g" data-zone="g" data-nom="Rive de départ"
                         aria-label="La rive de départ"></div>
                    <div class="tv-riviere" data-zone="b">
                        ${VAGUES}
                        <div class="tv-ombre"></div>
                        <div class="tv-barque" aria-label="La barque">
                            ${COQUE}<div class="tv-charge"></div>
                        </div>
                    </div>
                    <div class="tv-rive tv-rive--d" data-zone="d" data-nom="Rive d'arrivée"
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
        brancherGlisser();
    }

    /**
     * LE GLISSER, branché UNE FOIS sur la scène.
     *
     * Il ne peut pas vivre sur les pastilles : peindre les remplace toutes, et
     * un glisser en cours perdrait son écouteur au premier mouvement. La
     * scène, elle, survit — et c'est elle qui capture le pointeur, pour que le
     * doigt puisse sortir d'une rive sans lâcher le passager.
     *
     * ON NE CAPTURE QU'AU PREMIER MOUVEMENT, jamais à l'appui :
     * \`setPointerCapture\` dès le \`pointerdown\` fait livrer le \`click\` qui suit
     * à la scène au lieu du bouton, et le double toucher — monter, descendre —
     * cesse de marcher sans erreur ni trace. Payé le jour même sur les
     * allumettes.
     */
    function brancherGlisser() {
        const scene = container.querySelector('.tv-scene');
        if (!scene) return;

        const zoneSous = (x, y) => {
            const el = document.elementFromPoint(x, y);
            const z = el && el.closest ? el.closest('[data-zone]') : null;
            return (z && scene.contains(z)) ? z : null;
        };
        /** Où ce passager a le droit d'aller, depuis là où il est. */
        const cibleVoulue = (ou) => (ou === 'b' ? (barqueAGauche ? 'g' : 'd') : 'b');

        scene.addEventListener('pointerdown', (e) => {
            if (fini || destroyed || session.locked) return;
            const el = e.target.closest ? e.target.closest('[data-pion]') : null;
            if (!el || !scene.contains(el) || el.disabled) return;
            prise = { k: Number(el.dataset.pion), ou: el.dataset.ou, el };
            depart = { x: e.clientX, y: e.clientY };
            aGlisse = false;
        });

        scene.addEventListener('pointermove', (e) => {
            if (!prise || !depart || destroyed) return;
            if (!aGlisse
                && Math.abs(e.clientX - depart.x) + Math.abs(e.clientY - depart.y) < 8) return;
            if (!aGlisse) {
                aGlisse = true;
                try { scene.setPointerCapture(e.pointerId); } catch (err) { /* souris */ }
                montrerFantome(prise.el);
                peindre();
            }
            poserFantome(e.clientX, e.clientY);
            const z = zoneSous(e.clientX, e.clientY);
            scene.querySelectorAll('.tv-cible').forEach(x => x.classList.remove('tv-cible'));
            if (z && z.dataset.zone === cibleVoulue(prise.ou)) z.classList.add('tv-cible');
        });

        const lacher = (e) => {
            if (!prise) return;
            const depuis = prise, glisse = aGlisse;
            prise = null; depart = null; aGlisse = false;
            cacherFantome();
            scene.querySelectorAll('.tv-cible').forEach(x => x.classList.remove('tv-cible'));
            if (!glisse) return;         // sans glisser, on ne repeint pas : le clic suit
            try { scene.releasePointerCapture(e.pointerId); } catch (err) { /* souris */ }
            const z = zoneSous(e.clientX, e.clientY);
            if (z && z.dataset.zone === cibleVoulue(depuis.ou)) {
                if (depuis.el) depuis.el.dataset.glisse = '1';
                toucher(depuis.k, depuis.ou);
                return;
            }
            peindre();
        };
        scene.addEventListener('pointerup', lacher);
        scene.addEventListener('pointercancel', () => {
            prise = null; depart = null; aGlisse = false; cacherFantome(); peindre();
        });
    }

    /** Le fantôme : une copie de la pastille, qui suit le doigt. */
    function montrerFantome(el) {
        cacherFantome();
        fantome = el.cloneNode(true);
        fantome.classList.add('tv-fantome');
        fantome.classList.remove('tv-pion--pris');
        fantome.removeAttribute('data-pion');
        fantome.disabled = true;
        document.body.appendChild(fantome);
    }
    function poserFantome(x, y) {
        if (fantome) { fantome.style.left = `${x}px`; fantome.style.top = `${y}px`; }
    }
    function cacherFantome() {
        if (fantome) { fantome.remove(); fantome = null; }
    }

    const estLourd = (k) => item.meta.lourds.includes(item.meta.passagers[k].id);

    /** Une pastille de passager, touchable. */
    function pastille(k, ou) {
        const p = item.meta.passagers[k];
        // LA POIGNÉE N'EST PAS DÉCORATIVE : c'est le seul signe qui dise
        // « ceci se prend ». Sans elle, le glisser existe et personne ne le
        // trouve — ce qui revient à ne pas l'avoir écrit.
        return `<button type="button" class="tv-pion" data-pion="${k}" data-ou="${ou}"
                 aria-label="${p.nom}"><span class="tv-poignee" aria-hidden="true"></span
                 ><span class="tv-emoji" aria-hidden="true">${p.emoji}</span
                 ><span class="tv-nom">${p.nom}</span></button>`;
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
        mettre('.tv-charge', dansBarque, 'b');

        const riviere = container.querySelector('.tv-riviere');
        if (riviere) riviere.classList.toggle('tv-riviere--droite', !barqueAGauche);

        container.querySelectorAll('.tv-pion').forEach(b => {
            const k = Number(b.dataset.pion);
            const ou = b.dataset.ou;
            // ON NE TOUCHE QUE CE QUI EST DU CÔTÉ DE LA BARQUE : une pastille
            // de l'autre rive ne répond pas, et c'est la règle du jeu, pas une
            // panne — elle est trop loin pour monter.
            const atteignable = ou === 'b'
                || (ou === 'g' && barqueAGauche) || (ou === 'd' && !barqueAGauche);
            b.disabled = fini || session.locked || !atteignable;
            b.classList.toggle('tv-pion--loin', !atteignable && ou !== 'b');
            b.classList.toggle('tv-pion--pris', !!prise && prise.k === k);
            b.onclick = () => {
                // LE CLIC QUI SUIT UN GLISSER EST AVALÉ. Un glisser au doigt
                // finit sans mouvement du curseur, donc le navigateur en DÉDUIT
                // une tape et envoie un \`click\` après.
                if (b.dataset.glisse) { delete b.dataset.glisse; return; }
                toucher(k, ou);
            };
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
                : 'Glisse ou touche ceux qui montent dans la barque, puis « Traverser ».';
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
            cacherFantome();
            container.innerHTML = '';
            session.finish();
        }
    };
}
