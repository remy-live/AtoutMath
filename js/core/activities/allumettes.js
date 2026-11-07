// Activité « Le Jeu des Allumettes » — une partie contre la machine.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu me les fais tous ». Celui-ci n'est pas une grille : c'est une
// PARTIE, et c'est le seul du lot où l'on joue CONTRE quelqu'un.
//
// TROIS BOUTONS, ET RIEN D'AUTRE. On retire 1, 2 ou 3 allumettes ; la machine
// répond ; le tas descend. Celui qui prend la dernière gagne. Le geste est le
// même au doigt et à la souris, et trois boutons de quarante-quatre pixels
// tiennent sur n'importe quel téléphone.
//
// CE QU'ON MONTRE PENDANT LA PARTIE : le nombre d'allumettes restantes, en
// gros, et rien de plus. PAS le reste dans la division par 4 — c'est
// précisément ce que l'élève doit trouver, et l'afficher donnerait la
// solution. Il est dans l'indice, qui se déplie quand on le demande.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { meilleurCoup } from '../generators/allumettes.js';

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    let tas = 0;
    let fini = false;
    /** Ce qui s'est joué, pour que l'élève relise la partie. */
    let journal = [];

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(prochain) {
        item = prochain;
        tas = item.meta.tas;
        fini = false;
        journal = [];

        const boutons = Array.from({ length: item.meta.priseMax }, (_, i) =>
            `<button type="button" class="al-prise" data-prendre="${i + 1}">
                ${i + 1}</button>`).join('');

        container.innerHTML = `
            <div class="al-layout">
                <div class="al-context">${item.prompt.html}</div>
                <div class="al-tas" role="status" aria-live="polite">
                    <div class="al-compte"><b class="al-nombre">${tas}</b>
                        <span class="al-mot">allumettes</span></div>
                    <div class="al-batons" aria-hidden="true"></div>
                </div>
                <div class="al-choix">
                    <span class="al-label">J'en retire</span>
                    <div class="al-boutons">${boutons}</div>
                </div>
                <div class="al-journal" aria-live="polite"></div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        peindre();
        container.querySelectorAll('[data-prendre]').forEach(b => {
            b.onclick = () => jouer(Number(b.dataset.prendre));
        });
    }

    function peindre() {
        const n = container.querySelector('.al-nombre');
        if (n) n.textContent = String(tas);
        const mot = container.querySelector('.al-mot');
        if (mot) mot.textContent = tas > 1 ? 'allumettes' : 'allumette';
        const bat = container.querySelector('.al-batons');
        // UNE ALLUMETTE DESSINÉE PAR ALLUMETTE RESTANTE. Le nombre est écrit
        // juste au-dessus ; le dessin est là pour qu'on puisse COMPTER — c'est
        // en comptant par paquets de quatre qu'on trouve la règle.
        if (bat) {
            bat.innerHTML = Array.from({ length: tas }, (_, i) =>
                `<i class="al-baton${(i + 1) % 4 === 0 ? ' al-baton--quatre' : ''}"></i>`).join('');
        }
        container.querySelectorAll('[data-prendre]').forEach(b => {
            b.disabled = fini || session.locked || Number(b.dataset.prendre) > tas;
        });
    }

    const dire = (texte, qui) => {
        journal.push({ texte, qui });
        const el = container.querySelector('.al-journal');
        if (!el) return;
        el.innerHTML = journal.slice(-3).map(l =>
            `<div class="al-ligne al-ligne--${l.qui}">${l.texte}</div>`).join('');
    };

    function jouer(k) {
        if (fini || destroyed || session.locked || k > tas) return;
        tas -= k;
        dire(`Tu retires ${k} — il en reste ${tas}.`, 'moi');
        peindre();
        if (!tas) { finir(true); return; }

        // LA MACHINE RÉFLÉCHIT UN INSTANT. Sans ce délai, sa réponse arrive
        // dans le même battement que le clic et l'on ne voit pas qu'elle a
        // joué : le tas saute de cinq d'un coup.
        regTimeout(() => {
            if (fini || destroyed) return;
            const parfait = item.meta.robot === 'parfait';
            // « ELLE APPREND » : une fois sur deux, elle joue au hasard. On
            // peut donc gagner sans connaître la règle — et c'est ce qui donne
            // envie de la chercher.
            const auHasard = !parfait && (journal.length % 2 === 1);
            // SON COUP MALADROIT EST REPRODUCTIBLE : il se déduit du nombre
            // de coups joués, pas d'un tirage. Une partie rejouée à la même
            // graine se rejoue à l'identique, comme tout le reste du dépôt —
            // c'est ce qui permet de relire un essai dans le journal.
            const k2 = auHasard
                ? Math.min(tas, 1 + (journal.length % item.meta.priseMax))
                : Math.min(tas, meilleurCoup(tas, item.meta.priseMax));
            tas -= k2;
            dire(`La machine retire ${k2} — il en reste ${tas}.`, 'elle');
            peindre();
            if (!tas) finir(false);
        }, 650);
    }

    function finir(gagne) {
        fini = true;
        peindre();
        const result = session.submit(gagne ? 'gagne' : 'perdu');
        if (result.ignored) return;
        dire(gagne
            ? 'Tu as pris la dernière : tu as GAGNÉ.'
            : 'La machine a pris la dernière. Recommence : laisse-lui un multiple de 4.',
        gagne ? 'gagne' : 'perdu');
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot joue la partie parfaite, en disant ce qu'il vise. */
    async function runDemo() {
        let garde = 0;
        while (tas > 0 && !destroyed && garde++ < 40) {
            const k = meilleurCoup(tas, item.meta.priseMax);
            tas -= k;
            dire(`On retire ${k} pour laisser ${tas} — un multiple de 4.`, 'moi');
            peindre();
            await new Promise(r => regTimeout(r, 700));
            if (!tas || destroyed) break;
            const k2 = Math.min(tas, 1 + (tas % 3));
            tas -= k2;
            dire(`La machine retire ${k2} — il en reste ${tas}.`, 'elle');
            peindre();
            await new Promise(r => regTimeout(r, 700));
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
