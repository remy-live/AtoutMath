// Glisser un jeton de palette vers une case de grille.
//
// Pointer Events, et non l'API HTML5 drag-and-drop : cette dernière ne
// fonctionne pas au doigt, or l'application vit sur tablette. En dessous du
// seuil de déplacement, le geste reste un simple appui — les jetons peuvent
// donc aussi porter un `onclick`.
//
// Partagé entre le Mathdoku et le Binairo : même fantôme, même visée, même
// dépôt — seule change la signification du jeton, que chaque activité
// interprète dans son `deposer`.
//
// LA FIN DU GESTE S'ÉCOUTE SUR LA FENÊTRE, PAS SUR LE JETON, et c'est une
// correction. Rémy a vu le mot « Quadrilatère » rester collé en haut de
// l'écran, puis le suivre sur la pizza, sur les fonctions, partout — un
// fantôme d'organigramme survivant à la fermeture de son propre exercice.
//
// La cause : le fantôme est posé sur `document.body` — il le faut, pour qu'il
// glisse au-dessus de tout —, mais le `pointerup` qui l'efface était écouté sur
// le JETON. Or le jeton disparaît à chaque redessin, et avec lui l'écouteur :
// personne n'effaçait plus rien. La fenêtre, elle, ne disparaît jamais.

const SEUIL = 8; // px en deçà desquels le geste reste un appui

/**
 * Efface les fantômes oubliés. Filet de sécurité appelé au début de chaque
 * geste et à la fermeture d'un exercice : un fantôme est un élément posé sur
 * le corps de la page, rien ne l'emporte quand l'écran change.
 */
export function nettoyerFantomes() {
    document.querySelectorAll('.drag-ghost').forEach(g => g.remove());
    document.querySelectorAll('.drag-source').forEach(s => s.classList.remove('drag-source'));
}

/**
 * @param {HTMLElement} conteneur - racine contenant palette et grille
 * @param {Object} h
 * @param {(e:PointerEvent)=>?HTMLElement} h.cibleSous - la case déposable sous
 *        le pointeur, ou null (c'est ici qu'on refuse les cases verrouillées)
 * @param {(cible:HTMLElement, chip:HTMLElement)=>void} h.deposer
 * @param {()=>boolean} [h.bloque] - vrai quand la saisie est gelée (correction affichée)
 * @param {string} [h.classeVisee] - la classe qui marque la cible survolée ; une
 *        grille et une figure ne se surlignent pas de la même façon.
 */
export function brancherGlisserPalette(conteneur, {
    cibleSous, deposer, bloque, classeVisee = 'kk-cell--visee'
}) {
    conteneur.querySelectorAll('.kk-chip').forEach(chip => {
        chip.addEventListener('pointerdown', (event) => {
            if (event.button !== undefined && event.button !== 0) return;
            if (bloque && bloque()) return;
            // Un geste commence : on solde d'abord ce qu'un précédent aurait
            // laissé derrière lui.
            nettoyerFantomes();
            const depart = { x: event.clientX, y: event.clientY };
            let ghost = null;
            try { chip.setPointerCapture(event.pointerId); } catch (e) { /* déjà parti */ }

            const marquerVisee = (cible) => {
                conteneur.querySelectorAll(`.${classeVisee}`).forEach(x => x.classList.remove(classeVisee));
                if (cible) cible.classList.add(classeVisee);
            };

            const onMove = (e) => {
                const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
                if (!ghost && Math.hypot(dx, dy) < SEUIL) return;
                if (!ghost) {
                    ghost = chip.cloneNode(true);
                    ghost.classList.add('drag-ghost');
                    const r = chip.getBoundingClientRect();
                    ghost.style.width = `${r.width}px`;
                    ghost.style.height = `${r.height}px`;
                    ghost.dataset.originX = String(r.left);
                    ghost.dataset.originY = String(r.top);
                    document.body.appendChild(ghost);
                    chip.classList.add('drag-source');
                }
                ghost.style.left = `${Number(ghost.dataset.originX) + dx}px`;
                ghost.style.top = `${Number(ghost.dataset.originY) + dy}px`;
                marquerVisee(cibleSous(e));
            };

            const finir = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                window.removeEventListener('blur', onUp);
                chip.classList.remove('drag-source');
                marquerVisee(null);
                if (ghost) { ghost.remove(); ghost = null; }
            };

            const onUp = (e) => {
                const avait = !!ghost;
                finir();
                // Simple appui : le clic éventuel prend le relais.
                if (!avait) return;
                // UN GESTE INTERROMPU NE DÉPOSE RIEN. `blur` et `pointercancel`
                // n'ont pas de position ; le doigt est parti ailleurs, on
                // range le fantôme et l'on s'arrête là.
                if (!e || e.type !== 'pointerup') return;
                const cible = cibleSous(e);
                if (cible) deposer(cible, chip);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
            // Un onglet qu'on quitte au milieu d'un glissé ne renvoie jamais de
            // `pointerup` : sans cela, le fantôme restait à l'écran au retour.
            window.addEventListener('blur', onUp);
        });
    });
}
