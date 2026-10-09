// GÉRER SES PARCOURS — une fenêtre, et non une barre dans un tiroir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant la barre à trois boutons empilée dans le tiroir : « tu peux pas
// faire mieux ou ouvrir une modale, je trouve que c'est un peu bricolé, on ne
// peut faire des cadre de sélection, utiliser shift ou cmd ».
//
// ── POURQUOI UNE FENÊTRE, ET PAS UN TIROIR MIEUX RANGÉ ─────────────────────
//
// Le tiroir fait trois cents pixels de large. On y cherche un parcours et on
// l'ouvre : c'est son métier, et il le fait bien. Gérer, c'est autre chose —
// voir cinquante lignes d'un coup, les comparer, en prendre vingt. Aucune
// disposition ne fait tenir cela dans une colonne ; la barre d'actions s'y
// repliait sur trois lignes, et c'est ce que Rémy a photographié.
//
// LE TIROIR REDEVIENT DONC SIMPLE : chercher, ouvrir. Les cases à cocher et la
// barre en sont retirées, et un bouton « Gérer » amène ici.
//
// ── LA SÉLECTION EST CELLE DE TOUT LE MONDE ────────────────────────────────
//
// Clic simple, Maj pour une plage, Ctrl/Cmd pour ajouter une ligne, Ctrl+A pour
// tout prendre, et un cadre qu'on tire à la souris. Les règles vivent dans
// `js/core/selectionListe.js`, où elles s'éprouvent sans navigateur — l'ancre
// qui ne bouge pas sous un Maj-clic ne se vérifie pas à l'œil.
//
// ON NE RÉINVENTE PAS LE TRI NON PLUS : `vueDeLExplorateur` et `ordonner`
// rendent déjà des sections rangées, et c'est le même module que le tiroir
// emploie. Deux façons de trier les mêmes parcours finiraient par ne plus
// donner le même ordre.

import { state } from '../core/state.js';
import { showModal, showToast, showConfirm } from './modal.js';
import { normalizePath } from '../core/path.js';
import { getExerciseById } from '../data/catalog.js';
import {
    resumeDeParcours, ordonner, chercher, quandLisible, instantDe, enBref
} from '../core/explorateurParcours.js';
import { apresUnClic, apresUneTouche, dansLeCadre, direLaSelection }
    from '../core/selectionListe.js';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Les colonnes, et l'ordre qu'un clic sur leur titre demande. */
const COLONNES = [
    { cle: 'nom', titre: 'Parcours', ordre: 'nom' },
    { cle: 'taille', titre: 'Contenu', ordre: 'taille' },
    { cle: 'dossier', titre: 'Dossier', ordre: null },
    { cle: 'date', titre: 'Modifié', ordre: 'recent' }
];

export async function ouvrirLeGestionnaire() {
    // L'ÉTAT DE LA FENÊTRE VIT DANS LA FENÊTRE. Rien ici ne doit survivre à sa
    // fermeture : un tri gardé d'une ouverture à l'autre surprend plus qu'il
    // ne sert, et une sélection gardée est franchement dangereuse.
    let ordre = 'recent';
    let recherche = '';
    let selection = new Set();
    let ancre = '';
    let jours = 30;
    // COMBIEN DE FOIS CHAQUE PARCOURS A ÉTÉ DONNÉ, par identifiant d'enveloppe.
    // Rémy : « on prévient, et on garde le bilan ». Vide jusqu'à la réponse du
    // serveur, et l'écran se TAIT plutôt que d'affirmer « jamais donné ».
    let donnes = new Map();

    const modal = showModal('Gérer mes parcours', `
        <div class="gp-barre">
            <input type="search" id="gp-chercher" class="ec-champ" placeholder="Chercher…"
                   autocomplete="off" aria-label="Chercher un parcours par son nom">
            <!-- IMPORTER : un vrai champ de fichier, caché derrière un bouton.
                 Rémy : « on ne peut exporter en fichier juste un parcours ».
                 L'aller sans le retour ne sert à rien — un fichier qu'on ne
                 sait pas relire est une sauvegarde qui n'en est pas une. -->
            <input type="file" id="gp-fichier" accept=".json,application/json" hidden
                   aria-label="Importer un parcours depuis un fichier">
            <button type="button" class="ec-bouton ec-bouton--doux" id="gp-importer"
                    title="Ouvrir un fichier de parcours">Importer…</button>
            <button type="button" class="ec-bouton ec-bouton--doux" id="gp-corbeille">🗑 Corbeille</button>
        </div>
        <!-- LE CADRE EST DANS LA LISTE, et il le faut : il se place en absolu
             dans un parent positionné. Posé en dehors, il s'accrochait à la
             fenêtre et se dessinait à côté de ce qu'il sélectionnait.
             (Pas d'accent grave dans ce commentaire : il est à l'intérieur
             d'un gabarit, et il le fermerait.) -->
        <div id="gp-liste" class="gp-liste" tabindex="0"
             role="listbox" aria-multiselectable="true" aria-label="Mes parcours">
            <div id="gp-cadre" class="gp-cadre" hidden></div>
        </div>
        <div class="gp-pied">
            <span id="gp-combien" class="gp-combien"></span>
            <button type="button" class="ec-bouton ec-bouton--doux" data-gp-exporter
                    title="Enregistrer dans un fichier">Exporter…</button>
            <button type="button" class="ec-bouton ec-bouton--doux" data-gp-ranger>Ranger dans…</button>
            <button type="button" class="ec-bouton ec-bouton--rouge" data-gp-jeter>Mettre à la corbeille</button>
        </div>
        <p class="ec-note gp-aide">Clic pour en prendre un · <b>Maj</b> pour une suite ·
           <b>Ctrl</b> (ou <b>Cmd</b>) pour en ajouter un · <b>Ctrl+A</b> pour tout prendre ·
           ou tirez un cadre dans la liste.</p>`, { width: '820px' });

    const liste = modal.element.querySelector('#gp-liste');
    const cadre = modal.element.querySelector('#gp-cadre');
    const champ = modal.element.querySelector('#gp-chercher');
    const combien = modal.element.querySelector('#gp-combien');

    /** Les résumés affichés, dans l'ordre de l'écran — la base de tout le reste. */
    let affiches = [];

    const calculer = () => {
        const tous = (state.teacherPaths || [])
            .map((p) => resumeDeParcours(p, normalizePath, getExerciseById));
        affiches = ordonner(recherche ? chercher(tous, recherche) : tous, ordre);
        return affiches;
    };

    const nomDuDossier = (id) => {
        if (!id || id === 'root') return '—';
        const f = (state.teacherFolders || []).find((x) => x.id === id);
        return f ? f.name : '—';
    };

    const peindre = () => {
        calculer();
        // ON RÉINSÈRE LE CADRE APRÈS AVOIR REPEINT : `innerHTML` emporte tous
        // les enfants, et un cadre perdu ne se redessine plus jamais.
        liste.innerHTML = `
            <div class="gp-tete">${COLONNES.map((c) => (c.ordre
        ? `<button type="button" class="gp-col gp-col--${c.cle}" data-ordre="${c.ordre}"
                    aria-label="Ranger par ${esc(c.titre.toLowerCase())}">${esc(c.titre)}${
            ordre === c.ordre ? ' <span aria-hidden="true">▾</span>' : ''}</button>`
        : `<span class="gp-col gp-col--${c.cle}">${esc(c.titre)}</span>`)).join('')}</div>
            ${affiches.length ? affiches.map((r) => `
                <div class="gp-ligne${selection.has(r.id) ? ' gp-ligne--prise' : ''}"
                     data-id="${esc(r.id)}" role="option"
                     aria-selected="${selection.has(r.id) ? 'true' : 'false'}">
                    <span class="gp-col gp-col--nom">${esc(r.nom)}${donnes.get(r.id)
            ? ' <span class="gp-donne" title="Déjà donné à une classe ou à un élève">donné</span>'
            : ''}</span>
                    <span class="gp-col gp-col--taille">${esc(enBref(r))}</span>
                    <span class="gp-col gp-col--dossier">${esc(nomDuDossier(r.dossier))}</span>
                    <span class="gp-col gp-col--date">${esc(r.modifieLe ? quandLisible(r.modifieLe) : '')}</span>
                </div>`).join('')
        : `<p class="ec-note gp-vide">${recherche
            ? `Aucun parcours ne porte « ${esc(recherche)} » dans son nom.`
            : 'Aucun parcours enregistré.'}</p>`}`;
        liste.appendChild(cadre);
        direCombien();
    };

    const direCombien = () => {
        // ON NE COMPTE QUE CE QUI EXISTE ENCORE. La sélection peut garder des
        // fantômes — une ligne jetée depuis un autre poste, un filtre qui
        // resserre — et c'est la LECTURE qui nettoie, pas le `Set`.
        const n = [...selection].filter((id) => affiches.some((r) => r.id === id)).length;
        combien.textContent = direLaSelection(n) || 'Rien de sélectionné';
        modal.element.querySelectorAll('[data-gp-ranger], [data-gp-jeter], [data-gp-exporter]')
            .forEach((b) => { b.disabled = n === 0; });
    };

    const prises = () => [...selection].filter((id) => affiches.some((r) => r.id === id));

    // ── LE CLIC, AVEC SES TROIS TOUCHES ────────────────────────────────────
    liste.onclick = (ev) => {
        // LE CLIC QUI SUIT UN CADRE N'EST PAS UN CLIC. Le navigateur l'envoie
        // sur la ligne où l'on a relâché, et sans ce garde-fou il ramènerait la
        // sélection à cette seule ligne : le cadre entier perdu en lâchant.
        if (avalerLeClic) { avalerLeClic = false; return; }
        const col = ev.target.closest('[data-ordre]');
        if (col) { ordre = col.dataset.ordre; return peindre(); }
        const ligne = ev.target.closest('.gp-ligne');
        if (!ligne) return;
        // `metaKey` SUR MAC, `ctrlKey` AILLEURS, et l'on accepte les deux
        // partout : un professeur qui vient d'un PC ne doit pas réapprendre.
        const r = apresUnClic({
            ids: affiches.map((x) => x.id), id: ligne.dataset.id,
            selection, ancre, maj: ev.shiftKey, meta: ev.metaKey || ev.ctrlKey
        });
        selection = r.selection; ancre = r.ancre;
        peindre();
    };

    // ── LE CLAVIER ─────────────────────────────────────────────────────────
    liste.onkeydown = (ev) => {
        if (!['ArrowUp', 'ArrowDown'].includes(ev.key) && ev.key.toLowerCase() !== 'a') return;
        if (ev.key.toLowerCase() === 'a' && !(ev.metaKey || ev.ctrlKey)) return;
        ev.preventDefault();
        const r = apresUneTouche({
            ids: affiches.map((x) => x.id), touche: ev.key,
            selection, ancre, maj: ev.shiftKey, meta: ev.metaKey || ev.ctrlKey
        });
        selection = r.selection; ancre = r.ancre;
        peindre();
    };

    // ── LE CADRE QU'ON TIRE ────────────────────────────────────────────────
    //
    // IL PART DE N'IMPORTE OÙ DANS LA LISTE, Y COMPRIS D'UNE LIGNE.
    //
    // MESURÉ (tools/gestionParcours.mjs) : il partait du vide seulement, et il
    // restait « 1 px de vide sous la dernière ligne » dès sept parcours. Le
    // geste que Rémy a demandé — « on ne peut faire des cadre de sélection » —
    // était donc impossible à amorcer exactement quand il devient utile : sur
    // une bibliothèque remplie. Un cadre qui ne démarre que sur une liste
    // courte ne sert à rien, puisqu'une liste courte se clique.
    //
    // CE QUI INTERDISAIT DE PARTIR D'UNE LIGNE était la crainte de confondre
    // avec un glisser-déposer. Il n'y en a PAS dans cette fenêtre : on y range
    // par « Ranger dans… », pas en traînant. La crainte était celle du tiroir,
    // recopiée ici sans sa raison.
    //
    // DEUX PRÉCAUTIONS, DU COUP. Un appui qui ne bouge pas de plus de cinq
    // pixels reste un CLIC et n'ouvre aucun cadre — sinon la moindre main qui
    // tremble transformerait chaque clic en sélection d'une ligne. Et après un
    // vrai cadre, on AVALE le `click` qui suit le `mouseup` : le navigateur
    // l'envoie sur la ligne où l'on a relâché, et il remettrait la sélection à
    // cette seule ligne — tout le cadre perdu au moment de lâcher.
    const SEUIL_DU_CADRE = 5;
    let depart = null;
    let tire = false;
    let avalerLeClic = false;
    // CE QUI ÉTAIT DÉJÀ PRIS QUAND LE CADRE A COMMENCÉ. On recalcule la
    // sélection à CHAQUE mouvement depuis ce point de départ, au lieu d'ajouter
    // sans jamais retirer : sinon une ligne dépassée puis quittée reste prise,
    // et le cadre ne sait plus que grandir — le même défaut que l'ancre qui
    // suivait le Maj-clic, au geste près.
    let priseAuDepart = new Set();
    liste.onmousedown = (ev) => {
        // ON NE PART PAS DE L'EN-TÊTE : il range, et un cadre tiré depuis un
        // titre de colonne serait un clic de tri raté.
        if (ev.button !== 0 || ev.target.closest('.gp-tete')) return;
        const boite = liste.getBoundingClientRect();
        depart = ev.clientY - boite.top + liste.scrollTop;
        tire = false;
        avalerLeClic = false;
        // MAJ OU CTRL PENDANT LE CADRE : on ajoute à ce qui est pris. Sans
        // touche, le cadre repart de rien, comme un clic simple — mais on
        // n'efface RIEN ici : tant qu'on n'a pas bougé, c'est peut-être un
        // simple clic, et c'est `onclick` qui doit en décider.
        priseAuDepart = (ev.shiftKey || ev.metaKey || ev.ctrlKey)
            ? new Set(selection) : new Set();
    };
    liste.onmousemove = (ev) => {
        if (depart === null) return;
        const boite = liste.getBoundingClientRect();
        const ici = ev.clientY - boite.top + liste.scrollTop;
        if (!tire) {
            if (Math.abs(ici - depart) < SEUIL_DU_CADRE) return;
            tire = true;
            cadre.hidden = false;
        }
        cadre.style.top = `${Math.min(depart, ici) - liste.scrollTop}px`;
        cadre.style.height = `${Math.abs(ici - depart)}px`;
        const lignes = [...liste.querySelectorAll('.gp-ligne')].map((el) => ({
            id: el.dataset.id,
            haut: el.offsetTop,
            bas: el.offsetTop + el.offsetHeight
        }));
        selection = new Set([...priseAuDepart,
            ...dansLeCadre(lignes, { haut: depart, bas: ici })]);
        liste.querySelectorAll('.gp-ligne').forEach((el) => {
            el.classList.toggle('gp-ligne--prise', selection.has(el.dataset.id));
        });
        direCombien();
    };
    const finirLeCadre = () => {
        if (depart === null) return;
        // ON N'AVALE LE CLIC QUE S'IL Y A EU UN CADRE. Un appui immobile doit
        // rester un clic qui sélectionne.
        avalerLeClic = tire;
        depart = null;
        tire = false;
        cadre.hidden = true;
        cadre.style.height = '0px';
        if (avalerLeClic) peindre();
    };
    liste.onmouseup = finirLeCadre;
    liste.onmouseleave = finirLeCadre;

    champ.oninput = () => { recherche = champ.value; peindre(); };

    // ── LES DEUX GESTES EN BLOC ────────────────────────────────────────────
    modal.element.querySelector('[data-gp-jeter]').onclick = async () => {
        const ids = prises();
        if (!ids.length) return;
        const noms = ids.map((id) => (affiches.find((r) => r.id === id) || {}).nom || '?');
        const quoi = ids.length === 1 ? `« ${noms[0]} »` : `${ids.length} parcours`;
        // ON PRÉVIENT QUAND ÇA A SERVI, et seulement alors. Une phrase sur le
        // bilan collée à chaque suppression finirait par ne plus être lue ;
        // celle-ci n'apparaît que quand elle apprend quelque chose.
        const servis = ids.filter((id) => donnes.get(id));
        const avertir = servis.length
            ? `<br><br><b>${servis.length === 1
                ? 'Ce parcours a déjà été donné' : `${servis.length} ont déjà été donnés`}</b> `
                + 'à une classe ou à un élève : le travail déjà fait reste au bilan.'
            : '';
        const ok = await new Promise((repondre) => {
            showConfirm(
                `${quoi} ${ids.length === 1 ? 'part' : 'partent'} à la corbeille.<br><br>`
                + `Vous pourrez ${ids.length === 1 ? 'l\'' : 'les '}en ressortir pendant `
                + `${jours} jours.${avertir}`,
                () => repondre(true),
                { titre: 'Mettre à la corbeille', bouton: 'Mettre à la corbeille',
                    onCancel: () => repondre(false) });
        });
        if (!ok) return;
        const { jeterALaCorbeille } = await import('../core/parcoursServeur.js');
        const r = await jeterALaCorbeille(ids);
        if (r.erreur) return showToast(r.erreur, 'error', 6000);
        selection = new Set(); ancre = '';
        peindre();
        rafraichirLeTiroir();
        showToast(`🗑 ${r.combien} parcours à la corbeille.`, 'success', 4000);
    };

    modal.element.querySelector('[data-gp-ranger]').onclick = () => {
        const ids = prises();
        if (!ids.length) return;
        const dossiers = [{ id: 'root', name: 'À la racine (hors dossier)' },
            ...(state.teacherFolders || [])];
        const ou = showModal('Ranger dans…', `
            <div class="ec-choix-liste">${dossiers.map((f) =>
        `<button type="button" class="ec-choix-ligne" data-dossier="${esc(f.id)}">
                    <b>${esc(f.name)}</b></button>`).join('')}</div>
            ${(state.teacherFolders || []).length ? ''
        : '<p class="ec-note">Aucun dossier pour l\'instant : créez-en un avec « + Dossier ».</p>'}`,
        { width: '420px' });
        ou.element.onclick = (ev) => {
            const b = ev.target.closest('[data-dossier]');
            if (!b) return;
            ids.forEach((id) => state.moveTeacherPath(id, b.dataset.dossier));
            ou.close();
            selection = new Set();
            peindre();
            rafraichirLeTiroir();
            showToast(`${ids.length} parcours rangé${ids.length > 1 ? 's' : ''}.`, 'success', 3500);
        };
    };

    // ── EXPORTER ET IMPORTER ───────────────────────────────────────────────
    //
    // RÉMY : « d'ailleurs, on ne peut exporter en fichier juste un parcours. »
    //
    // ON EXPORTE LA SÉLECTION, ET NON « le parcours ouvert » : la fenêtre sait
    // déjà prendre vingt lignes d'un Maj-clic, et l'on n'exporte pas vingt
    // séances en vingt gestes. Un seul parcours donne un fichier à son nom ;
    // plusieurs donnent un fichier nommé du jour.
    modal.element.querySelector('[data-gp-exporter]').onclick = async () => {
        const ids = prises();
        if (!ids.length) return;
        const { fichierAEcrire, nomDeFichier } = await import('../core/fichierParcours.js');
        const entrees = ids
            .map((id) => (state.teacherPaths || []).find((p) => p.id === id))
            .filter(Boolean);
        if (!entrees.length) return showToast('Ces parcours ne sont plus là.', 'error', 5000);
        const fichier = fichierAEcrire(entrees);
        const nom = entrees.length === 1
            ? nomDeFichier(entrees[0].name)
            : nomDeFichier(`${entrees.length}-parcours`);
        // UNE SEULE FAÇON DE TÉLÉCHARGER DANS TOUT LE LOGICIEL : un lien qu'on
        // clique et qu'on retire. Et `revokeObjectURL` APRÈS, sinon Safari
        // annule le téléchargement qu'il vient de commencer.
        const url = URL.createObjectURL(new Blob([JSON.stringify(fichier, null, 2)],
            { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = nom;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        showToast(`⬇ ${nom}`, 'success', 4000);
    };

    const champFichier = modal.element.querySelector('#gp-fichier');
    modal.element.querySelector('#gp-importer').onclick = () => champFichier.click();
    champFichier.onchange = async () => {
        const f = champFichier.files && champFichier.files[0];
        // ON REMET LE CHAMP À ZÉRO TOUT DE SUITE : sans cela, rouvrir LE MÊME
        // fichier ne déclenche aucun `change`, et le bouton a l'air cassé.
        champFichier.value = '';
        if (!f) return;
        const { lireLeFichier } = await import('../core/fichierParcours.js');
        let texte = '';
        try { texte = await f.text(); }
        catch (e) { return showToast('Ce fichier n\'a pas pu être lu.', 'error', 6000); }
        const { parcours, erreur, ecartes } = lireLeFichier(texte);
        if (erreur) return showToast(erreur, 'error', 7000);
        // ON IMPORTE SOUS UN NOUVEL IDENTIFIANT, TOUJOURS.
        //
        // `saveTeacherPath` en fabrique un neuf, et c'est ce qu'il faut : un
        // fichier venu d'un collègue porte SON identifiant, et le réutiliser
        // ferait croire au serveur que c'est le même parcours. La leçon est
        // déjà payée : la route `save` refuse d'écrire sur le
        // parcours d'un autre professeur, donc l'import aurait échoué en
        // silence au prochain démarrage.
        parcours.forEach((p) => state.saveTeacherPath(p.name, p));
        selection = new Set(); ancre = '';
        peindre();
        rafraichirLeTiroir();
        const dit = parcours.length === 1
            ? `« ${parcours[0].name} » importé.`
            : `${parcours.length} parcours importés.`;
        showToast(ecartes ? `${dit} ${ecartes} ligne(s) écartée(s).` : dit,
            'success', 5000);
    };

    modal.element.querySelector('#gp-corbeille').onclick = async () => {
        const { ouvrirLaCorbeille } = await import('./corbeilleParcours.js');
        await ouvrirLaCorbeille(() => { peindre(); rafraichirLeTiroir(); });
    };

    peindre();
    champ.focus();

    // LA DURÉE DE CONSERVATION ET LE COMPTE DES SÉANCES DONNÉES viennent du
    // serveur, et l'écran s'ouvre AVANT eux : une fenêtre qui attend le réseau
    // pour s'afficher est une fenêtre qui ne s'affiche pas au collège.
    import('../core/parcoursServeur.js').then(async (m) => {
        const c = await m.laCorbeille();
        if (c && c.jours) jours = c.jours;
        donnes = await m.combienDonne();
        if (donnes.size) peindre();
    }).catch(() => { /* sans serveur, on se tait : pas de badge qui mente */ });
}

/** Le tiroir montre la même bibliothèque : il doit suivre. */
function rafraichirLeTiroir() {
    import('./builder.js').then((m) => {
        if (typeof m.renderPathBrowser === 'function') m.renderPathBrowser();
    }).catch(() => { /* l'atelier n'est pas monté : rien à rafraîchir */ });
}
