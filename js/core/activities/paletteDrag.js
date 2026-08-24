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

const SEUIL = 8; // px en deçà desquels le geste reste un appui

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
            const depart = { x: event.clientX, y: event.clientY };
            let ghost = null;
            chip.setPointerCapture(event.pointerId);

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
            const onUp = (e) => {
                chip.removeEventListener('pointermove', onMove);
                chip.removeEventListener('pointerup', onUp);
                chip.removeEventListener('pointercancel', onUp);
                chip.classList.remove('drag-source');
                marquerVisee(null);
                if (!ghost) return;   // simple appui : le clic éventuel prend le relais
                ghost.remove(); ghost = null;
                const cible = cibleSous(e);
                if (cible) deposer(cible, chip);
            };
            chip.addEventListener('pointermove', onMove);
            chip.addEventListener('pointerup', onUp);
            chip.addEventListener('pointercancel', onUp);
        });
    });
}
