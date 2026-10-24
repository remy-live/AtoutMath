// Activité « Le Jardin » — un Rows Garden en français.
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DES HEXAGONES EN HTML, PAS EN SVG — et c'est le choix qui a décidé du reste.
//
// Un hexagone se dessine en SVG en une ligne. Mais chaque case de ce jeu porte
// un CHAMP DE SAISIE, et un champ ne se met pas dans un `<polygon>` : il
// faudrait superposer une couche de champs HTML à une couche de formes SVG et
// les tenir alignées à toutes les largeurs — deux dessins pour une grille, donc
// deux occasions de se décaler. Le Strimko superpose ainsi un SVG et une grille,
// mais là le SVG ne porte que des traits décoratifs ; ici il porterait la forme
// même des cases.
//
// Une case est donc un `<div>` découpé par `clip-path` en hexagone, posé en
// pourcentage dans un cadre au rapport fixe. Le champ est dedans, et il n'y a
// qu'un seul dessin.
//
// LE REPÈRE EST AXIAL, POINTE EN HAUT : pour la case (q, r), le centre tombe en
// x = √3 (q + r/2) et y = 3/2 r, en unités de rayon. C'est la formule standard
// des grilles hexagonales, et elle est ici la SEULE source de position : aucun
// pixel n'est écrit à la main, donc rien ne se décale quand la largeur change.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ON NE DIT NI OÙ LA RANGÉE SE COUPE, NI PAR OÙ LA FLEUR COMMENCE.
//
// Ce sont les deux ressorts du jeu, et il faut résister à l'envie de les
// adoucir. Une rangée de sept cases porte deux réponses : l'élève sait qu'il y
// en a deux, il sait leurs définitions dans l'ordre, il ne sait pas si c'est
// 3 + 4 ou 4 + 3. Une fleur se lit dans le sens horaire à partir d'un pétale
// qu'on ne dit pas. Et les définitions des fleurs sont rangées PAR COULEUR,
// mélangées dedans : savoir qu'une définition va sur une fleur claire ne dit
// pas laquelle.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { createDemoCursor, createDemoGate } from '../demoPointer.js';
import { nomDeRangee } from '../generators/jardin.js';
import { contenuCase, brancherChamps } from '../../ui/champsGrille.js';
import { meneurDemo } from '../meneurDemo.js';

// Le vérificateur est LIMITÉ, comme au Mathdoku, au Strimko et à l'Approxdoku :
// vérifier doit rester un choix qui se paie, pas un oracle qu'on presse après
// chaque lettre.
const VERIFICATIONS_PAR_JARDIN = 3;

// Le rayon d'un hexagone vaut 1 ; sa largeur vaut donc √3 et sa hauteur 2.
const RACINE3 = Math.sqrt(3);

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;

    let item = null;
    let lettres = new Map();     // clef de case → lettre posée
    let verifsRestantes = VERIFICATIONS_PAR_JARDIN;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        verifsRestantes = VERIFICATIONS_PAR_JARDIN;
        lettres = new Map();
        render();
    }

    // --- La géométrie --------------------------------------------------------

    /** La position du centre d'une case, en unités de rayon. */
    const centreDe = (cle) => {
        const [q, r] = cle.split(',').map(Number);
        return { x: RACINE3 * (q + r / 2), y: 1.5 * r };
    };

    /**
     * LE CADRE, calculé une fois : on cherche les extrêmes des centres, puis on
     * ajoute une demi-case de chaque côté. Tout le reste est en POURCENTAGE de
     * ce cadre, donc le dessin tient à n'importe quelle largeur.
     */
    function cadreDe(cles) {
        const pts = cles.map(centreDe);
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const x0 = Math.min(...xs) - RACINE3 / 2, x1 = Math.max(...xs) + RACINE3 / 2;
        const y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
        return { x0, y0, largeur: x1 - x0, hauteur: y1 - y0 };
    }

    // --- Le dessin -----------------------------------------------------------

    function render() {
        const { jardin, couleurs } = item.meta;
        const cadre = cadreDe(jardin.cases);

        // LA COULEUR EST SUR LE CŒUR, PAS SUR LES PÉTALES — et j'avais fait
        // l'inverse jusqu'à ce que Rémy corrige la règle : « ce sont les pétales
        // communes qui créent des mots, c'est en rond en fait ».
        //
        // La conséquence est mécanique : un pétale appartient à DEUX fleurs, il
        // ne peut donc pas porter « la » couleur de sa fleur — il en aurait
        // deux. C'est le cœur qui porte la couleur, et la couronne se lit
        // AUTOUR de lui. Les pétales restent blancs, et le cœur n'entre dans
        // aucun mot de six : il ne se lit que dans sa rangée.
        const couleurDe = new Map();
        jardin.fleurs.forEach(f => couleurDe.set(f.centre, f.couleur));

        const cases = jardin.cases.map(cle => {
            const { x, y } = centreDe(cle);
            const gauche = ((x - RACINE3 / 2 - cadre.x0) / cadre.largeur) * 100;
            const haut = ((y - 1 - cadre.y0) / cadre.hauteur) * 100;
            const large = (RACINE3 / cadre.largeur) * 100;
            const haute = (2 / cadre.hauteur) * 100;
            const couleur = couleurDe.get(cle);
            const [q, r] = cle.split(',');
            return `
                <div class="ja-case ${couleur ? `ja-case--${couleur} ja-coeur` : 'ja-case--petale'}"
                     style="left:${gauche.toFixed(3)}%;top:${haut.toFixed(3)}%;`
                     + `width:${large.toFixed(3)}%;height:${haute.toFixed(3)}%"
                     data-cle="${cle}" data-q="${q}" data-r="${r}"
                     ${couleur ? `data-coeur="${couleur}"` : ''}>
                    ${contenuCase({
        valeur: '', donnee: false, champ: true,
        aria: `Case ${cle}`, motif: '[A-Za-z]'
    })}
                </div>`;
        }).join('');

        const rangees = jardin.rangees.map((rg, i) => `
            <li class="ja-indice" data-rangee="${i}">
                <b>${nomDeRangee(i)}</b>
                <span>${rg.reponses.map(r => escaper(r.def)).join('<i> · </i>')}</span>
            </li>`).join('');

        // ── CHAQUE DÉFINITION DE FLEUR SAIT DÉSORMAIS À QUELLE FLEUR ELLE VA
        //
        // RÉMY : « pour les fleurs, c'est pas clair, on ne sait pas où mettre
        // les définitions. Il faudrait aller sur une fleur, connaître au moins
        // le début du mot, le sens (dans un premier temps) ».
        //
        // CE QU'ON ABANDONNE, ET C'EST LUI QUI LE DEMANDE. L'en-tête de ce
        // fichier défendait l'inverse en gras : « on ne dit pas par quel pétale
        // la fleur commence », « savoir qu'une définition va sur une fleur
        // claire ne dit pas laquelle ». C'est la règle du Rows Garden, et elle
        // est juste — pour un lecteur de magazine qui a une heure devant lui.
        // Pour une classe de collège qui découvre le jeu, elle empile trois
        // inconnues sur la même case : quel mot, par où il commence, et sur
        // quelle fleur. Rémy a vu ses élèves rester devant.
        //
        // « DANS UN PREMIER TEMPS » est sa formule, et elle dit bien ce qu'elle
        // dit : on ouvre la porte maintenant, on la refermera quand la classe
        // saura jouer. Le durcissement tiendra dans une ligne — c'est pour cela
        // que le lien fleur ↔ définition est calculé ici et non cuit dans les
        // données.
        const rangDeLaFleur = (def) => jardin.fleurs.findIndex(f => f.def === def);
        const fleurs = couleurs.map(c => `
            <div class="ja-groupe ja-groupe--${c.id}">
                <h4>${c.label}</h4>
                <ul>${c.definitions.map(d => {
            const n = rangDeLaFleur(d);
            // UNE DÉFINITION QU'ON NE SAIT PAS RATTACHER RESTE UNE LIGNE
            // MUETTE, et ne devient pas un bouton qui ne fait rien : un
            // bouton inerte est pire qu'un texte.
            return n < 0
                ? `<li class="ja-indice">${escaper(d)}</li>`
                : `<li class="ja-indice ja-indice--fleur" data-fleur="${n}"
                       tabindex="0" role="button">${escaper(d)}</li>`;
        }).join('')}</ul>
            </div>`).join('');

        container.innerHTML = `
            <div class="jardin-layout">
                <div class="jardin-context">${item.prompt.html || item.prompt.text}</div>
                <div class="ja-cadre" style="aspect-ratio:${(cadre.largeur / cadre.hauteur).toFixed(4)}">
                    <div class="ja-champ" role="group" aria-label="Le jardin">${cases}</div>
                </div>
                <div class="ja-indices">
                    <div class="ja-groupe ja-groupe--rangees">
                        <h4>Les rangées</h4>
                        <ol class="ja-rangees">${rangees}</ol>
                    </div>
                    ${fleurs}
                </div>
                <div class="ja-actions">
                    <button type="button" class="btn-hint ja-btn-verif" data-verifier>
                        Vérifier <span class="ja-verif-count">(${verifsRestantes})</span>
                    </button>
                    <button type="button" class="ja-btn-valider" data-valider>Valider</button>
                </div>
                <div class="ja-fleur-info" data-fleur-info hidden></div>
                <div class="ja-status" role="status"></div>
                ${hintBar(session)}
            </div>`;

        if (session.frozen) return;
        if (session.isDemo) { runDemo(); return; }

        brancherSaisie();
        brancherLesFleurs();
        brancherVerificateur();
        brancherValidation();
        wireHint(container, session);
    }

    /** Les définitions viennent d'un fichier de données : on les échappe. */
    const escaper = (t) => String(t)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // --- La saisie -----------------------------------------------------------

    const caseEl = (cle) => container.querySelector(`.ja-case[data-cle="${cle}"]`);

    function poser(cle, lettre) {
        const v = String(lettre || '').toUpperCase();
        if (v) lettres.set(cle, v); else lettres.delete(cle);
        const el = caseEl(cle);
        if (!el) return;
        const champ = el.querySelector('input');
        if (champ && champ.value.toUpperCase() !== v) champ.value = v;
        el.classList.toggle('ja-posee', !!v);
        effacerVerdict();
    }

    // --- La fleur qu'on regarde ---------------------------------------------
    //
    // RÉMY : « Il faudrait aller sur une fleur, connaître au moins le début du
    // mot, le sens (dans un premier temps) ».
    //
    // TROIS CHOSES, ET AUCUNE N'EST LA RÉPONSE : où le mot commence, de quel
    // côté il tourne, et quelle définition est la sienne. Le mot, lui, reste
    // entièrement à trouver — on a seulement cessé d'empiler trois inconnues
    // sur la même case.
    //
    // ON NUMÉROTE LES PÉTALES DE 1 À 6 plutôt que de poser une flèche courbe :
    // les chiffres disent le départ ET le sens d'un seul geste, ils se lisent
    // au vidéoprojecteur, et ils ne couvrent pas la lettre qu'on écrit — ils se
    // posent dans le coin haut du pétale.
    //
    // LE CŒUR N'EST PAS UN PÉTALE : il porte la couleur, il entre dans sa
    // rangée, et il ne fait partie d'aucun mot de six. On ne le numérote donc
    // pas, sans quoi l'élève chercherait une septième lettre.
    let fleurChoisie = null;

    function oublierLaFleur() {
        fleurChoisie = null;
        container.querySelectorAll('.ja-case--fleur, .ja-case--depart')
            .forEach(el => el.classList.remove('ja-case--fleur', 'ja-case--depart'));
        container.querySelectorAll('[data-rang-petale]').forEach(el => el.remove());
        container.querySelectorAll('.ja-indice--choisie')
            .forEach(el => el.classList.remove('ja-indice--choisie'));
        container.querySelectorAll('.ja-coeur--choisi')
            .forEach(el => el.classList.remove('ja-coeur--choisi'));
        const info = container.querySelector('[data-fleur-info]');
        if (info) { info.hidden = true; info.innerHTML = ''; }
    }

    function montrerLaFleur(n) {
        const f = item.meta.jardin.fleurs[n];
        if (!f) return;
        if (fleurChoisie === n) { oublierLaFleur(); return; }
        oublierLaFleur();
        fleurChoisie = n;

        const coeur = caseEl(f.centre);
        if (coeur) coeur.classList.add('ja-coeur--choisi');
        f.petales.forEach((cle, k) => {
            const el = caseEl(cle);
            if (!el) return;
            // LE RANG DE LECTURE : le pétale `depart` porte la première lettre,
            // et l'on tourne dans l'ordre de `petales` — c'est la convention de
            // `lettresDuJardin`, et il n'y en a qu'une dans le dépôt.
            const rang = ((k - f.depart + 6) % 6) + 1;
            el.classList.add('ja-case--fleur');
            if (rang === 1) el.classList.add('ja-case--depart');
            const badge = document.createElement('span');
            badge.className = 'ja-rang';
            badge.dataset.rangPetale = String(rang);
            badge.textContent = String(rang);
            badge.setAttribute('aria-hidden', 'true');
            el.appendChild(badge);
        });

        const ligne = container.querySelector(`.ja-indice--fleur[data-fleur="${n}"]`);
        if (ligne) ligne.classList.add('ja-indice--choisie');

        const info = container.querySelector('[data-fleur-info]');
        if (info) {
            // LE SINGULIER S'ÉCRIT, IL NE SE RABOTE PAS. Ma première version
            // retirait le « s » de « Fleurs foncées » et affichait « Fleur
            // foncées » : la sonde l'a imprimé dans son relevé, ce qui est
            // exactement à quoi sert une sonde qui MONTRE ce qu'elle mesure au
            // lieu de rendre « ok ».
            const AU_SINGULIER = {
                claire: 'Fleur claire', moyenne: 'Fleur moyenne', foncee: 'Fleur foncée'
            };
            const couleur = AU_SINGULIER[f.couleur] || 'Fleur';
            info.hidden = false;
            info.innerHTML = `<b>${escaper(couleur)}</b>`
                + ` — le mot de six lettres commence au pétale <b>1</b> et se lit`
                + ` dans le sens des aiguilles d'une montre.`
                + `<span class="ja-fleur-def">${escaper(f.def)}</span>`;
        }
    }

    function brancherLesFleurs() {
        // ON ENTRE PAR LE CŒUR OU PAR LA DÉFINITION, et l'on ressort par le
        // même geste : les deux sens sont utiles, puisque la question de Rémy
        // se pose dans les deux — « où mettre cette définition » et « quelle
        // est la définition de cette fleur ».
        container.querySelectorAll('.ja-coeur').forEach(el => {
            el.addEventListener('click', () => {
                const n = item.meta.jardin.fleurs.findIndex(f => f.centre === el.dataset.cle);
                if (n >= 0) montrerLaFleur(n);
            });
        });
        container.querySelectorAll('.ja-indice--fleur').forEach(el => {
            const aller = () => montrerLaFleur(Number(el.dataset.fleur));
            el.addEventListener('click', aller);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aller(); }
            });
        });
    }

    function brancherSaisie() {
        // ICI, PAS DE MODE « AU DOIGT » À FAIRE DÉFILER.
        //
        // Les grilles de chiffres offrent un appui qui fait tourner les valeurs :
        // avec quatre ou cinq nombres, c'est le geste le plus sûr sur tablette.
        // Vingt-six lettres, non — il faudrait appuyer dix-sept fois pour un Q.
        // Une case est donc TOUJOURS un champ, et c'est le clavier du système
        // qui s'ouvre, celui que l'élève sait déjà employer.
        brancherChamps(container, {
            bloque: () => session.locked,
            cleDe: (champ) => champ.closest('.ja-case').dataset.cle,
            poser: (cle, brut) => poser(cle, brut)
        });
    }

    // --- Vérifier, et valider ------------------------------------------------

    const statutEl = () => container.querySelector('.ja-status');

    function effacerVerdict() {
        container.querySelectorAll('.ja-faux').forEach(el => el.classList.remove('ja-faux'));
        container.querySelectorAll('.ja-indice--faux')
            .forEach(el => el.classList.remove('ja-indice--faux'));
        const s = statutEl();
        if (s) s.textContent = '';
    }

    /** Ce qui est écrit dans une suite de cases, ou `null` s'il manque une lettre. */
    const lu = (cles) => {
        const out = cles.map(c => lettres.get(c) || '');
        return out.some(x => !x) ? null : out.join('');
    };

    /**
     * CE QUI EST FAUX — et ici, on compare bien à la réponse.
     *
     * Au Strimko et à l'Approxdoku, le vérificateur ne compare JAMAIS à la
     * solution : il montre des répétitions, c'est-à-dire ce que l'élève peut
     * constater lui-même. Un jardin n'a rien de tel à montrer — la seule vérité
     * d'un mot est qu'il soit LE mot. C'est aussi ce que fait le « check » de
     * n'importe quels mots croisés, et l'élève le comprend sans qu'on explique.
     *
     * ON NE MARQUE QUE CE QUI EST COMPLET. Une réponse à trous n'est ni juste ni
     * fausse ; la barrer reprocherait une faute pas encore commise.
     */
    function fautes() {
        const { jardin } = item.meta;
        const casesFausses = new Set();
        const rangeesFausses = [];
        const fleursFausses = [];

        jardin.rangees.forEach((rg, i) => {
            const texte = lu(rg.cles);
            if (texte === null) return;
            if (texte !== rg.reponses.map(r => r.mot).join('')) {
                rangeesFausses.push(i);
                rg.cles.forEach(c => casesFausses.add(c));
            }
        });
        jardin.fleurs.forEach((f, i) => {
            const vals = f.petales.map(c => lettres.get(c) || '');
            if (vals.some(x => !x)) return;
            const mot = Array.from({ length: 6 }, (_, k) => vals[(k + f.depart) % 6]).join('');
            if (mot !== f.mot) {
                fleursFausses.push(i);
                f.petales.forEach(c => casesFausses.add(c));
            }
        });
        return { casesFausses, rangeesFausses, fleursFausses };
    }

    const posees = () => item.meta.jardin.cases.filter(c => lettres.get(c)).length;

    function marquer({ casesFausses, rangeesFausses }) {
        casesFausses.forEach(c => { const el = caseEl(c); if (el) el.classList.add('ja-faux'); });
        rangeesFausses.forEach(i => {
            const el = container.querySelector(`.ja-indice[data-rangee="${i}"]`);
            if (el) el.classList.add('ja-indice--faux');
        });
    }

    function brancherVerificateur() {
        const bouton = container.querySelector('[data-verifier]');
        if (!bouton) return;
        bouton.addEventListener('click', () => {
            if (verifsRestantes <= 0 || session.locked) return;

            // UNE GRILLE VIDE NE COÛTE PAS UNE VÉRIFICATION : trois essais pour
            // tout le jardin, en dépenser un pour s'entendre dire que rien n'est
            // faux dans un jardin vide, c'est en perdre un tiers.
            if (!posees()) {
                const s = statutEl();
                if (s) s.textContent = 'Écris d\'abord quelques lettres : il n\'y a rien à vérifier.';
                return;
            }

            verifsRestantes--;
            const compteur = container.querySelector('.ja-verif-count');
            if (compteur) compteur.textContent = `(${verifsRestantes})`;
            if (verifsRestantes <= 0) bouton.disabled = true;

            const f = fautes();
            marquer(f);
            const s = statutEl();
            if (!s) return;
            const morceaux = [];
            if (f.rangeesFausses.length) {
                morceaux.push(`${f.rangeesFausses.length} rangée${f.rangeesFausses.length > 1 ? 's' : ''} `
                    + `(${f.rangeesFausses.map(nomDeRangee).join(', ')})`);
            }
            if (f.fleursFausses.length) {
                morceaux.push(`${f.fleursFausses.length} fleur${f.fleursFausses.length > 1 ? 's' : ''}`);
            }
            if (morceaux.length) {
                s.textContent = `À revoir : ${morceaux.join(' et ')}. `
                    + 'Les réponses incomplètes ne sont pas jugées.';
                return;
            }
            const total = item.meta.jardin.cases.length;
            s.textContent = posees() === total
                ? 'Tout est juste : tu peux valider.'
                : 'Rien de faux dans ce que tu as écrit. Continue.';
        });
    }

    function brancherValidation() {
        const bouton = container.querySelector('[data-valider]');
        if (!bouton) return;
        bouton.addEventListener('click', () => {
            const { jardin, solution } = item.meta;
            const manque = jardin.cases.length - posees();
            if (manque) {
                const s = statutEl();
                if (s) s.textContent = `Il reste ${manque} case${manque > 1 ? 's' : ''} à remplir.`;
                return;
            }
            const juste = jardin.cases.every(c => lettres.get(c) === solution.get(c));
            // CE QU'ON ENVOIE COUVRE TOUTES LES CASES, PAS SEULEMENT LES
            // RANGÉES.
            //
            // On envoyait les rangées mises bout à bout — ce qui couvre tout le
            // jardin AUJOURD'HUI, parce que les formes livrées n'ont que des
            // rangées longues. Une forme avec une rangée de deux cases (il en
            // existait une, et le format de magazine en a) laisserait ces
            // cases HORS de la réponse envoyée : le meneur dirait « juste » sur
            // un jardin où elles sont fausses. Le `juste` ci-dessus, lui,
            // regarde toutes les cases — les deux auraient divergé en silence.
            const donne = jardin.cases.map(c => lettres.get(c) || '.').join('');
            const result = session.submit(donne, { element: bouton });
            if (result.ignored) return;

            const champ = container.querySelector('.ja-champ');
            if (champ) champ.classList.add(juste ? 'ja-champ--ok' : 'ja-champ--secoue');
            if (!juste) {
                marquer(fautes());
                regTimeout(() => { if (champ) champ.classList.remove('ja-champ--secoue'); }, 400);
            }
            result.dismissed.then(() => {
                if (destroyed) return;
                if (result.correct || result.revealed) regTimeout(renderNext, 1200);
            });
        });
    }

    // --- La démonstration ----------------------------------------------------

    async function runDemo() {
        const { jardin, solution } = item.meta;
        if (!cursor) cursor = createDemoCursor();
        const gate = createDemoGate(container.querySelector('.jardin-layout') || container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { garderPointeur: true });
        const fin = () => robot.fin();
        try {
            cursor.protegerZone(container.querySelector('.ja-cadre'));
            if (!await robot.attendre(600)) return fin();

            const premiere = jardin.rangees[0];
            cursor.say('Une RANGÉE porte deux réponses bout à bout — et l\'on ne dit pas '
                + 'où la première s\'arrête.', container.querySelector('.ja-cadre'));
            if (!await robot.attendre(3600)) return fin();
            for (const cle of premiere.cles) {
                const el = caseEl(cle);
                if (el && !await cursor.tap(el, 260)) return fin();
                if (destroyed) return fin();
                poser(cle, solution.get(cle));
            }
            if (!await robot.attendre(1400)) return fin();

            const fleur = jardin.fleurs[0];
            cursor.say('Une FLEUR se lit dans le sens horaire, et l\'on ne dit pas par quel '
                + 'pétale elle commence.', caseEl(fleur.centre));
            if (!await robot.attendre(3600)) return fin();
            for (let k = 0; k < 6; k++) {
                const cle = fleur.petales[(k + fleur.depart) % 6];
                const el = caseEl(cle);
                if (el && !await cursor.tap(el, 320)) return fin();
                if (destroyed) return fin();
                poser(cle, solution.get(cle));
            }
            if (!await robot.attendre(2000)) return fin();
        } catch (e) { /* démonstration coupée */ }
        fin();
    }

    // --- Cycle de vie ---------------------------------------------------------

    // DEUX JARDINS DE SUITE NE DOIVENT PAS ÊTRE LE MÊME.
    //
    // Le générateur tire au sort parmi dix-huit ; sur une séance à plusieurs
    // jardins, le hasard en répète. Plutôt que de bricoler un décalage dans le
    // générateur — ce que j'avais fait, sous un commentaire qui affirmait à
    // tort que ça suffisait —, on emploie ce que le dépôt a déjà : la clef de
    // question, écrite pour la Table de Pythagore le jour où Rémy a signalé
    // les répétitions. Deux questions sont « la même » quand c'est le même
    // jardin.
    if (session.clefDeQuestion) session.clefDeQuestion(it => it.meta.jardin.id);

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },

        /**
         * LE CORRIGÉ, POUR CELUI QUI MET AU POINT — jamais pour l'élève.
         *
         * RÉMY : « pourrais-tu dans la barre de debug me mettre une option
         * réponse (de manière générale) pour voir si ».
         *
         * Le bouton « Solution » de la barre existait déjà et demandait
         * `montrerSolution()` à l'exercice ; le Jardin ne savait pas répondre,
         * et le bouton se taisait. Or c'est l'exercice où la question se pose
         * le plus : on ne peut pas vérifier à l'œil qu'un jardin de vingt-huit
         * cases est soluble.
         *
         * ON POSE LES LETTRES COMME DES DONNÉES, pas comme une saisie : elles
         * prennent la teinte des cases fournies, et `lettres` est rempli pour
         * que « Valider » dise bien « juste » — c'est précisément ce qu'on veut
         * contrôler.
         */
        montrerSolution() {
            if (!item || !item.meta || !item.meta.solution) return false;
            oublierLaFleur();
            for (const [cle, lettre] of item.meta.solution) {
                poser(cle, lettre);
                const el = caseEl(cle);
                if (el) el.classList.add('ja-donnee');
            }
            const s = statutEl();
            if (s) s.textContent = 'Corrigé affiché — outil d\u2019auteur.';
            return true;
        },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
