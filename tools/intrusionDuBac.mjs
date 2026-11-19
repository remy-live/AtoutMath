// ON POUSSE LA PORTE DU BAC À SABLE — et l'on vérifie qu'elle ne cède pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « et surtout attention que le script ne permet pas
// d'intrusion ».
//
// L'éditeur Python fait tourner le programme d'un élève dans le navigateur, et
// il le fait avec `eval` — c'est ainsi que Skulpt fonctionne. Ce n'est pas rien
// dans un logiciel qui porte les devoirs et les prénoms de ses classes. Une
// page à part a donc été fabriquée pour cela, `bac-python.html`, cloisonnée.
//
// ── POURQUOI CETTE SONDE EXISTE ET NE SERA PAS JETÉE ─────────────────────
//
// Un cloisonnement ne se LIT pas, il se POUSSE. Lire `sandbox="allow-scripts"`
// dans le code rassure ; le seul fait qui compte est qu'un script placé dans le
// cadre N'ARRIVE PAS à lire la page du professeur. La première version de ce
// cadre n'avait pas l'attribut, et personne ne s'en apercevait : tout
// fonctionnait. C'est la mesure qui l'a dit — 4915 éléments lus chez le parent.
//
// Chaque essai ci-dessous est donc une ATTAQUE, et la réponse attendue est
// toujours « non ». Si l'un d'eux passe au vert du mauvais côté, quelque chose
// vient de s'ouvrir.

import { readFileSync } from 'node:fs';

let rates = 0;
const dire = (quoi, ferme, detail = '') => {
    if (!ferme) rates++;
    console.log(`  ${ferme ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

// ── ON OUVRE L'ÉDITEUR PAR LE CHEMIN DE L'ÉLÈVE ──────────────────
//
// LA SONDE MONTE SON PROPRE SITE D'ESSAI, qui lit `.htaccess` et sert les
// VRAIS en-têtes — l'exception du bac comprise. On ne monte pas un second
// serveur à côté : ce serait une configuration de plus à garder juste.
const { ouvrirSonde } = await import('./sonde.mjs');
const s = await ouvrirSonde({ largeur: 900, hauteur: 1100 });
const base = `http://127.0.0.1:${s.port}`;
const erreurs = [];

// ── 0. LA POLITIQUE SERVIE, LÀ OÙ ELLE COMPTE ──────────────────
console.log('\n\x1b[1mLES EN-TÊTES, TELS QUE LE NAVIGATEUR LES REÇOIT\x1b[0m');
{
    const p2 = await s.ctx.newPage();
    const rApp = await p2.goto(base + '/');
    const cspApp = String(rApp.headers()['content-security-policy'] || '');
    dire('l’application n’a PAS le droit d’évaluer',
        cspApp.includes('script-src') && !cspApp.includes("'unsafe-eval'"),
        cspApp.includes("'unsafe-eval'") ? 'unsafe-eval dans la politique générale !' : '');

    const rBac = await p2.goto(base + '/bac-python.html');
    const cspBac = String(rBac.headers()['content-security-policy'] || '');
    dire('le bac à sable, lui, l’a — et lui seul',
        cspBac.includes("'unsafe-eval'"), cspBac.slice(0, 60) + '…');
    dire('et personne d’autre ne peut l’encadrer',
        /frame-ancestors 'self'/.test(cspBac));
    dire('il ne peut rien demander au réseau',
        /connect-src 'none'/.test(cspBac) && /default-src 'none'/.test(cspBac));
    await p2.close();
}
await s.identifier();
await s.ouvrirExercice('algo-python-ecrire', {}, { questions: 5 });
await s.doitExister('[data-code]');
await s.page.waitForTimeout(2500);

const cadres = s.page.frames().filter((f) => /bac-python/.test(f.url()));
dire('le cadre du bac est monté', cadres.length === 1, `${cadres.length} cadre(s)`);
const bac = cadres[0];

// ── 1. DEPUIS LE CADRE, ON ESSAIE D'ATTEINDRE LE PROFESSEUR ──────────────
console.log('\n\x1b[1mDEPUIS LE BAC, ON ESSAIE D’ATTEINDRE L’APPLICATION\x1b[0m');
if (bac) {
    const essais = await bac.evaluate(() => {
        const tente = (f) => { try { return { ouvert: true, quoi: String(f()) }; }
            catch (e) { return { ouvert: false, quoi: String(e.message).slice(0, 60) }; } };
        return {
            dom: tente(() => window.parent.document.querySelectorAll('*').length + ' éléments'),
            titre: tente(() => window.parent.document.title),
            stockage: tente(() => Object.keys(window.localStorage).join(',') || '(vide)'),
            session: tente(() => Object.keys(window.sessionStorage).length),
            biscuits: tente(() => document.cookie),
            origine: String(window.location.origin),
            // Le cadre peut-il faire naviguer la page du dessus ailleurs ?
            haut: tente(() => { window.top.location.href = 'about:blank'; return 'navigué'; })
        };
    });
    dire('le DOM du professeur reste fermé', !essais.dom.ouvert, essais.dom.quoi);
    dire('son titre de page aussi', !essais.titre.ouvert, essais.titre.quoi);
    dire('le stockage local n’existe pas ici', !essais.stockage.ouvert, essais.stockage.quoi);
    dire('ni le stockage de session', !essais.session.ouvert, essais.session.quoi);
    // JETER OU RENDRE VIDE : les deux conviennent, et Chromium JETTE. Le
    // premier jet exigeait la chaîne vide et rendait donc ROUGE le meilleur
    // des deux résultats.
    dire('les biscuits ne suivent pas', !essais.biscuits.ouvert || essais.biscuits.quoi === '',
        essais.biscuits.quoi);
    // ET L'ORIGINE, MESURÉE PLUTÔT QUE DÉDUITE. `location.origin` rend
    // l'origine de l'URL, PAS celle du document : elle reste nommée même dans
    // un cadre cloisonné. Ce qui prouve le cloisonnement est le stockage qui
    // jette, trois lignes plus haut — pas cette chaîne-ci. On l'affiche pour
    // mémoire, on n'en tire pas de verdict.
    console.log(`  \x1b[2m· location.origin dans le cadre : ${essais.origine}\x1b[0m`);
    dire('et il ne peut pas emmener la page ailleurs', !essais.haut.ouvert, essais.haut.quoi);
}

// ── 2. ON PARLE AU CADRE SANS ÊTRE SON PARENT ────────────────────────────
console.log('\n\x1b[1mON LUI PARLE SANS ÊTRE CELUI QUI L’A POSÉ\x1b[0m');
if (bac) {
    const faux = await bac.evaluate(() => new Promise((r) => {
        let repondu = false;
        // ON NE COMPTE QUE LES RÉPONSES, PAS L'APPÂT.
        //
        // PAYÉ : `dispatchEvent` réveille AUSSI l'écouteur de la sonde, et le
        // premier jet comptait donc son propre message comme une réponse du
        // bac. Il annonçait « IL A RÉPONDU » sur un cadre qui s'était tu.
        // Une réponse ne porte jamais `quoi` ; une demande en porte toujours.
        window.addEventListener('message', (e) => {
            if (e.data && e.data.pour === 'bac-python' && e.data.jeton === 'faux'
                && e.data.quoi === undefined) repondu = true;
        });
        // Un message parfaitement formé, mais dont la source n'est PAS le
        // parent : c'est ce que ferait une page tierce qui aurait trouvé le
        // moyen de nous atteindre.
        window.dispatchEvent(new MessageEvent('message', {
            data: { pour: 'bac-python', quoi: 'lancer', jeton: 'faux',
                source: 'print("entré")' },
            source: window, origin: 'https://ailleurs.example'
        }));
        setTimeout(() => r(repondu), 400);
    }));
    dire('un message qui ne vient pas du parent est jeté', !faux,
        faux ? 'IL A RÉPONDU' : '');
}

// ── 3. ON SE FAIT PASSER POUR LE BAC AUPRÈS DE L'APPLICATION ─────────────
console.log('\n\x1b[1mON SE FAIT PASSER POUR LE BAC\x1b[0m');
{
    const avale = await s.page.evaluate(() => new Promise((r) => {
        // On répond à la place du cadre, avec un jeton plausible. Si
        // l'application l'accepte, n'importe quelle page de la même origine
        // peut lui dicter le résultat d'un exercice.
        const avant = document.body.innerHTML.length;
        for (let j = 1; j < 6; j++) {
            window.dispatchEvent(new MessageEvent('message', {
                data: { pour: 'bac-python', jeton: j, ok: true, sortie: 'INTRUS\n' },
                source: window, origin: window.location.origin
            }));
        }
        setTimeout(() => r(document.body.textContent.includes('INTRUS')
            || document.body.innerHTML.length !== avant ? 'accepté' : 'ignoré'), 500);
    }));
    dire('l’application n’écoute que SON cadre', avale === 'ignoré', avale);
}

// ── 4. ET LE PROGRAMME DE L'ÉLÈVE, QU'EST-CE QU'IL PEUT ? ────────────────
console.log('\n\x1b[1mCE QU’UN PROGRAMME D’ÉLÈVE PEUT ATTEINDRE\x1b[0m');
// LES REFUS QUE NOS PROPRES ATTAQUES PROVOQUENT SONT DES SUCCÈS, pas des
// erreurs de page : « connect-src 'none' » qui bloque une requête est
// exactement ce qu'on venait vérifier. On note donc où en était le journal
// AVANT de cogner, et l'on ne juge ensuite que ce qui s'y ajoute d'autre.
const avantLesCoups = s.erreurs.length;
const ESSAIS = [
    ['lire un fichier', 'f = open("/etc/passwd")\nprint(f.read())'],
    ['sortir par le système', 'import os\nprint(os.listdir("/"))'],
    ['appeler JavaScript', 'import js\nprint(js.window)'],
    ['évaluer du JavaScript', 'eval("window.parent.document.title")'],
    ['atteindre le réseau', 'import urllib.request\nprint(urllib.request.urlopen("http://x"))'],
    ['faire parler le réseau par socket', 'import socket\nprint(socket.socket())']
];
if (bac) {
    for (const [quoi, src] of ESSAIS) {
        const r = await bac.evaluate((programme) => new Promise((res) => {
            const s2 = [];
            window.Sk.configure({
                output: (t) => s2.push(t),
                read: (f) => {
                    if (!window.Sk.builtinFiles || !window.Sk.builtinFiles.files[f]) {
                        throw new Error('module introuvable : ' + f);
                    }
                    return window.Sk.builtinFiles.files[f];
                },
                inputfun: () => '',
                inputfunTakesPrompt: true,
                execLimit: 2000,
                __future__: window.Sk.python3
            });
            try {
                window.Sk.importMainWithBody('<essai>', false, programme, true);
                res({ passe: true, quoi: s2.join('').slice(0, 60) });
            } catch (e) { res({ passe: false, quoi: String(e.message).slice(0, 60) }); }
        }), src);
        dire(quoi + ' : refusé', !r.passe || !r.quoi, r.quoi.replace(/\n/g, ' '));
    }
}

// ── 5. LA BOUCLE SANS FIN NE DOIT PAS EMPORTER LA TABLETTE ───────────────
//
// Ce n'est pas une intrusion, c'est la même famille : quelque chose que le
// programme de l'élève peut faire subir au logiciel. Et celle-là, l'exercice
// la DEMANDE — « la boucle qui ne s'arrête jamais » est une marche.
console.log('\n\x1b[1mLA BOUCLE SANS FIN, ET CE QU’ELLE COÛTE\x1b[0m');
{
    const debut = Date.now();
    await s.page.evaluate(() => {
        const c = document.querySelector('[data-code]');
        c.value = 'while True:\n    print("a")';
        c.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await s.page.click('[data-lancer]');
    const verdict = await s.page.waitForFunction(() => {
        const c = document.querySelector('[data-console]');
        return c && !c.hidden && /pe-console--(ok|ko)/.test(c.className)
            ? c.textContent.replace(/\s+/g, ' ').slice(0, 90) : false;
    }, null, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => null);
    const duree = Date.now() - debut;
    dire('elle est coupée, et on le dit en français',
        !!verdict && /ne s’arrête pas|ne s'arrête pas/.test(verdict),
        verdict ? verdict.slice(0, 70) : 'aucun verdict');
    dire('en moins de six secondes', duree < 6000, `${duree} ms`);
    const vivant = await s.page.evaluate(() => !!document.querySelector('[data-code]'));
    dire('et la page est toujours debout', vivant);
}

// ── 6. CE QUE LE CODE PROMET, ET QU'ON RELIT ─────────────────────────────
console.log('\n\x1b[1mLE CODE DIT-IL LA MÊME CHOSE QUE LA MESURE ?\x1b[0m');
{
    // `sansCommentaires` N'EST PAS UN LUXE ICI : ce dépôt explique chaque
    // règle à l'endroit où elle se prend, donc « allow-same-origin » est écrit
    // en toutes lettres juste au-dessus de la ligne qui s'en passe. Sans ce
    // nettoyage, le contrôle tombe sur le commentaire qui le justifie — c'est
    // arrivé, et c'est la friction la mieux documentée du dépôt.
    const { sansCommentaires } = await import('../tests/helpers.mjs');
    const ht = readFileSync('.htaccess', 'utf8');
    const bloc = (ht.split('<Files "bac-python.html">')[1] || '').split('</Files>')[0];
    dire('la politique du bac porte sandbox allow-scripts',
        /sandbox allow-scripts/.test(bloc), bloc.trim().slice(0, 50) + '…');
    dire('et jamais allow-same-origin', !/allow-same-origin/.test(bloc));
    dire('la politique générale, elle, n’est pas cloisonnée',
        !/^[^<]*sandbox/m.test(ht.split('<Files')[0]));
    const cad = sansCommentaires(readFileSync('bac-python.html', 'utf8'));
    dire('le cadre n’écoute que window.parent',
        /ev\.source !== window\.parent/.test(cad));
    dire('et la sortie est plafonnée', /PLAFOND/.test(cad));
    dire('la page du bac ne charge AUCUN fichier',
        !/<script[^>]+src=/.test(cad) && !/<link[^>]+href=/.test(cad));
}

const refusDeCsp = s.erreurs.slice(avantLesCoups)
    .filter(e => /Content Security Policy|connect-src/.test(e));
dire('le réseau a bien été refusé au programme', refusDeCsp.length > 0,
    refusDeCsp.length ? refusDeCsp[0].slice(0, 60) : 'aucun refus observé');
const imprevues = [...s.erreurs.slice(0, avantLesCoups),
    ...s.erreurs.slice(avantLesCoups).filter(e => !refusDeCsp.includes(e)), ...erreurs];
dire('et aucune autre erreur de page', imprevues.length === 0,
    imprevues.slice(0, 2).join(' | '));
dire('aucune fenêtre native', s.fenetresNatives.length === 0);

console.log('\n' + '─'.repeat(70));
console.log(rates === 0
    ? '\x1b[32mLA PORTE TIENT : aucune intrusion n’est passée.\x1b[0m'
    : `\x1b[31m${rates} PORTE(S) OUVERTE(S) — à refermer avant de committer.\x1b[0m`);

await s.fermer();
process.exit(rates === 0 ? 0 : 1);
