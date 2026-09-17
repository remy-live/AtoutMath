// PARTAGER UN PARCOURS : le lien, le code, et le QR code.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Pour le lien, tu proposes le code à taper mais tu pourrais aussi
// proposer un lien (la page actuelle)?code= et un QR code évidemment tu
// verrouilles la sécurité », puis, une fois la chose essayée : « mais je n'ai
// pas trouvé ni le qr code ni le lien quand je clique sur le lien du parcours ».
//
// IL AVAIT RAISON, ET LA RAISON EST SIMPLE : LE LIEN N'ÉTAIT NULLE PART.
// `Shortcodes.shareUrl()` existait et fabriquait bien l'adresse, mais le bouton
// se contentait de l'envoyer au PRESSE-PAPIERS et d'annoncer « Lien copié ». Un
// lien qu'on ne voit pas est un lien qu'on ne peut ni relire, ni vérifier, ni
// dicter, ni envoyer depuis un autre appareil — et si le presse-papiers n'a pas
// marché (c'est fréquent hors HTTPS, et sur certains téléphones), il n'y avait
// tout simplement rien.
//
// TROIS FAÇONS DE DONNER LE MÊME TRAVAIL, parce que la salle n'est pas toujours
// la même :
//   · LE CODE, pour le tableau et pour la voix. Court, sans accent, avec ses
//     lettres de contrôle : mal recopié, il est refusé plutôt que d'ouvrir
//     autre chose.
//   · LE LIEN, pour le cahier de textes, l'ENT, un message aux familles.
//   · LE QR CODE, pour les téléphones — et pour l'affiche qu'on projette au
//     tableau ou qu'on punaise au fond de la salle.
//
// « TU VERROUILLES LA SÉCURITÉ ». C'est fait, et c'est par construction : ce qui
// voyage est le PARCOURS, rien d'autre. L'adresse est `origine + page + ?code=`,
// sans jeton, sans identifiant de classe, sans rien qui appartienne au
// professeur. Celui qui reçoit le lien reçoit le droit de FAIRE ce travail, pas
// celui d'entrer quelque part. C'est exactement ce que le code dicté donne déjà.

import { showModal, showToast } from './modal.js';
import { Shortcodes } from '../core/shortcodes.js';
import { qrcodeSVG } from '../core/qrcode.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * COPIER SANS PRÉSUMER QUE ÇA MARCHE.
 *
 * `navigator.clipboard` n'existe pas hors contexte sécurisé et peut être refusé
 * par l'utilisateur. On le tente, et s'il échoue on SÉLECTIONNE le texte : la
 * personne fait Ctrl+C elle-même, et sur téléphone le menu « Copier » apparaît.
 * Un bouton qui échoue en silence est pire que pas de bouton.
 */
async function copier(texte, champ) {
    try {
        await navigator.clipboard.writeText(texte);
        showToast('Copié.', 'success', 1500);
        return true;
    } catch (e) {
        if (champ && champ.select) {
            champ.focus();
            champ.select();
            showToast('Le navigateur n\'a pas autorisé la copie — le texte est '
                + 'sélectionné, faites Ctrl+C.', 'info', 5000);
        }
        return false;
    }
}

/**
 * L'AFFICHE À IMPRIMER : le QR en grand, le code en dessous, rien d'autre.
 *
 * Dans une page NEUVE, et non avec une feuille de style d'impression posée sur
 * l'application : imprimer depuis l'écran, c'est imprimer ce que le navigateur
 * croit voir — la barre du haut, la fenêtre ouverte, le fond gris. Ici on sait
 * exactement ce qui sortira de l'imprimante de la salle des profs.
 */
function imprimerLAffiche({ nom, code, lien }) {
    const f = window.open('', '_blank');
    if (!f) {
        showToast("Le navigateur a bloqué la fenêtre d'impression. "
            + 'Autorisez les fenêtres pour ce site, puis réessayez.', 'error', 6000);
        return;
    }
    // Un QR de 8 px par module tient sur une demi-page et se lit à trois mètres.
    const svg = qrcodeSVG(lien, { module: 8, marge: 4, titre: nom || 'Parcours' });
    f.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>${esc(nom || 'Parcours')}</title>
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
             margin: 14mm; color: #111; text-align: center; }
      h1 { font-size: 1.4rem; margin: 0 0 4mm; }
      svg { width: 105mm; height: 105mm; }
      .code { font-family: ui-monospace, Menlo, Consolas, monospace;
              font-size: 2rem; letter-spacing: .1em; margin: 4mm 0 2mm; }
      .lien { color: #444; font-size: .82rem; word-break: break-all; margin: 0 auto;
              max-width: 140mm; }
      .mode { color: #555; font-size: .9rem; margin: 3mm 0 0; }
      @media print { .rien { display: none; } }
    </style></head><body>
    <p class="rien"><button onclick="window.print()">Imprimer</button></p>
    <h1>${esc(nom || 'Parcours')}</h1>
    ${svg}
    ${code ? `<p class="mode">ou taper ce code dans « J'ai un code »</p>
              <p class="code">${esc(code)}</p>` : ''}
    <p class="lien">${esc(lien)}</p>
    </body></html>`);
    f.document.close();
}

/**
 * LA FENÊTRE DE PARTAGE.
 *
 * @param {Object} path le parcours à partager
 * @param {{nom?: string}} [options]
 */
export function ouvrirPartage(path, options = {}) {
    const code = Shortcodes.encodePath(path);
    if (!code) {
        showToast('Ce parcours ne peut pas être encodé.', 'error');
        return null;
    }
    const lien = Shortcodes.shareUrl(path);
    const dictable = !code.startsWith('M2-');
    const raisons = dictable ? [] : Shortcodes.raisonsDuCodeLong(path);
    const nom = options.nom || path.name || 'Parcours';

    // LE QR PORTE LE LIEN, PAS LE CODE. Un lecteur de QR ouvre ce qu'il trouve :
    // une adresse s'ouvre, un texte nu s'affiche et l'élève doit ensuite le
    // recopier à la main — ce qui annule tout l'intérêt.
    const svg = qrcodeSVG(lien, { module: 4, marge: 4, titre: nom });

    const bloc = (titre, corps) =>
        `<div style="margin-bottom:18px"><div style="font-size:.82rem;font-weight:700;
            text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);
            margin-bottom:6px">${titre}</div>${corps}</div>`;

    const contenu = `
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
            <div style="flex:0 0 auto;margin:0 auto">
                ${svg
            ? `<div style="background:#fff;padding:8px;border-radius:10px;
                       border:1px solid var(--border);line-height:0">
                       <div style="width:190px;height:190px">${svg.replace(
                /width="\d+" height="\d+"/, 'width="100%" height="100%"')}</div></div>`
            : `<p style="color:var(--text-muted);max-width:190px">Ce parcours est
                   trop long pour tenir dans un QR code : donnez le lien.</p>`}
            </div>
            <div style="flex:1 1 260px;min-width:240px">
                ${dictable ? bloc('Le code à dicter',
                    `<div style="display:flex;gap:8px;align-items:stretch">
                        <input id="partage-code" readonly value="${esc(code)}"
                          style="flex:1;font-family:ui-monospace,Menlo,Consolas,monospace;
                                 font-size:1.25rem;letter-spacing:.08em;padding:8px 10px;
                                 border:1px solid var(--border);border-radius:8px;
                                 background:var(--bg-app);color:var(--text-main)">
                        <button id="partage-copier-code" class="btn btn-secondary"
                          style="white-space:nowrap">Copier</button>
                     </div>
                     <p style="font-size:.82rem;color:var(--text-muted);margin:6px 0 0">
                        ${code.replace(/-/g, '').length} caractères, à taper dans
                        « J'ai un code ». Les tirets sont pour l'œil : le code se tape
                        aussi bien d'un seul trait.</p>`)
            : bloc('Pas de code à dicter',
                `<p style="margin:0 0 6px">Ce parcours ne tient pas en quelques
                        lettres. Donnez le lien ou le QR code.</p>
                     <ul style="margin:6px 0 0 1em;padding:0;font-size:.88rem;
                                color:var(--text-muted)">
                        ${raisons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`)}

                ${bloc('Le lien',
                `<div style="display:flex;gap:8px;align-items:stretch">
                        <input id="partage-lien" readonly value="${esc(lien)}"
                          style="flex:1;min-width:0;padding:8px 10px;font-size:.88rem;
                                 border:1px solid var(--border);border-radius:8px;
                                 background:var(--bg-app);color:var(--text-main)">
                        <button id="partage-copier-lien" class="btn btn-secondary"
                          style="white-space:nowrap">Copier</button>
                     </div>`)}
            </div>
        </div>
        <p style="font-size:.82rem;color:var(--text-muted);margin:4px 0 16px">
            Le lien ne contient que le parcours : aucun mot de passe, aucun accès à
            votre classe. Celui qui le reçoit peut faire ce travail, rien d'autre.</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
            <button id="partage-imprimer" class="btn btn-secondary">Imprimer l'affiche</button>
            <button id="partage-fermer" class="btn btn-primary">Fermer</button>
        </div>`;

    const fenetre = showModal(`Partager « ${esc(nom)} »`, contenu, { width: '640px' });
    const el = fenetre.element;
    const champCode = el.querySelector('#partage-code');
    const champLien = el.querySelector('#partage-lien');

    const brancher = (id, texte, champ) => {
        const b = el.querySelector(id);
        if (b) b.onclick = () => copier(texte, champ);
    };
    brancher('#partage-copier-code', code, champCode);
    brancher('#partage-copier-lien', lien, champLien);

    // UN CHAMP EN LECTURE SEULE SE SÉLECTIONNE D'UN CLIC. C'est le geste de
    // secours quand la copie est refusée, et celui qu'on fait naturellement.
    [champCode, champLien].forEach(c => { if (c) c.onclick = () => c.select(); });

    const imprimer = el.querySelector('#partage-imprimer');
    if (imprimer) imprimer.onclick = () => imprimerLAffiche({ nom, code: dictable ? code : '', lien });
    const fermer = el.querySelector('#partage-fermer');
    if (fermer) fermer.onclick = fenetre.close;

    return fenetre;
}
