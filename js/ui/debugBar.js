// Palette d'outils d'auteur : déplacement et repli.
//
// En bandeau fixe occupant toute la largeur, elle recouvrait l'en-tête du jeu —
// donc précisément ce qu'elle sert à tester. Devenue une petite palette
// flottante, elle se pousse là où elle ne gêne pas, et se replie sur sa
// poignée quand on veut voir l'écran tel que l'élève le verra.
//
// Le déplacement passe par les Pointer Events, comme le reste de
// l'application : au doigt sur tablette, à la souris sur poste fixe, avec un
// seul code.

const CLE = 'mathbox-debug-pos';
const MARGE = 6;

export function initDebugBar() {
    const bar = document.getElementById('debug-toolbar');
    const grip = document.getElementById('db-grip');
    const fold = document.getElementById('db-fold');
    if (!bar || !grip) return;

    restaurer(bar);
    rendreDeplacable(bar, grip);

    if (fold) {
        fold.onclick = () => {
            const replie = bar.classList.toggle('dbg--folded');
            fold.textContent = replie ? '›' : '‹';
            fold.title = replie ? 'Déplier la palette' : 'Replier la palette';
            fold.setAttribute('aria-label', fold.title);
            fold.setAttribute('aria-expanded', String(!replie));
            // La largeur change : sans recadrage, une palette dépliée près du
            // bord droit sortirait de l'écran.
            placer(bar, bar.offsetLeft, bar.offsetTop);
        };
    }

    // Un changement de taille de fenêtre — ou la rotation d'une tablette —
    // peut laisser la palette hors champ, donc inatteignable.
    window.addEventListener('resize', () => placer(bar, bar.offsetLeft, bar.offsetTop));
}

function rendreDeplacable(bar, grip) {
    grip.addEventListener('pointerdown', (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        grip.setPointerCapture(event.pointerId);

        const depart = { x: event.clientX, y: event.clientY };
        const origine = { x: bar.offsetLeft, y: bar.offsetTop };
        bar.classList.add('dbg--dragging');

        const onMove = (e) => {
            placer(bar, origine.x + (e.clientX - depart.x), origine.y + (e.clientY - depart.y));
        };
        const onUp = () => {
            grip.removeEventListener('pointermove', onMove);
            grip.removeEventListener('pointerup', onUp);
            grip.removeEventListener('pointercancel', onUp);
            bar.classList.remove('dbg--dragging');
            memoriser(bar);
        };

        grip.addEventListener('pointermove', onMove);
        grip.addEventListener('pointerup', onUp);
        grip.addEventListener('pointercancel', onUp);
    });
}

/** Positionne la palette en la gardant entièrement visible. */
function placer(bar, x, y) {
    const largeur = bar.offsetWidth;
    const hauteur = bar.offsetHeight;
    const maxX = Math.max(MARGE, window.innerWidth - largeur - MARGE);
    const maxY = Math.max(MARGE, window.innerHeight - hauteur - MARGE);
    bar.style.left = `${Math.min(Math.max(MARGE, x), maxX)}px`;
    bar.style.top = `${Math.min(Math.max(MARGE, y), maxY)}px`;
}

function memoriser(bar) {
    try {
        localStorage.setItem(CLE, JSON.stringify({ x: bar.offsetLeft, y: bar.offsetTop }));
    } catch (e) { /* navigation privée : la position ne survivra pas, sans plus */ }
}

function restaurer(bar) {
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { pos = null; }
    // Le recadrage s'applique aussi à la position mémorisée : elle a pu être
    // enregistrée sur un écran plus grand que celui d'aujourd'hui.
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) placer(bar, pos.x, pos.y);
    // En bas à gauche par défaut, et non en haut : le haut de l'écran porte
    // l'en-tête du jeu — titre, progression, chronomètre — c'est-à-dire ce
    // qu'on regarde en testant. Le bas à gauche est le coin le plus vide.
    else placer(bar, MARGE, window.innerHeight);
}
