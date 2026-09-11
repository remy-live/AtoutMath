# Installer AtoutMath à neuf

Rémy : « je préfère tout supprimer sur le site et tout transférer avec filezilla
[…] j'aimerais tout recommencer à plat et bien. »

Voici la marche, dans l'ordre, sans rien qui dépende d'autre chose.

---

## 1. Faire le vide

Dans FileZilla, ouvre **`www/`** et **efface tout ce qui s'y trouve.**

> ⚠️ **Efface aussi `api/config.php` et `api/data/`** si tu les vois. Ce sont ta
> clé de chiffrement et ta base : on repart à plat, donc ils partent aussi. Tout
> ce qui a été fait jusqu'ici (classes, listes, élèves) disparaît — c'est le
> sens de « recommencer ».
>
> Si tu veux les garder par précaution, copie-les sur ton ordinateur **avant**.
> Ils ne serviront pas à cette installation, mais on ne jette jamais une clé
> avant d'être sûr.

`www/` doit être **complètement vide** avant l'étape suivante.

---

## 2. Transférer

Décompresse `atoutmath-vNNN.zip` sur ton ordinateur. Tu obtiens un dossier avec
`index.html`, `api/`, `css/`, `js/`, `icones/`, `vendor/`, `deposer.php`…

Dans FileZilla : **sélectionne tout le contenu** de ce dossier — pas le dossier
lui-même — et dépose-le dans `www/`.

> **Pas le dossier lui-même**, sinon tu obtiens `www/atoutmath-v673/index.html`
> et le site répond 404 sans qu'on comprenne pourquoi.

Vérifie à la fin que FileZilla n'annonce **aucun transfert en échec** (onglet
« Transferts échoués », en bas). Un fichier perdu au milieu de `js/ui/fiches/`
ne se voit pas : il se découvre en cours.

Ça prend quelques minutes — 544 fichiers. **C'est la dernière fois.**

---

## 3. Installer

Ouvre :

```
https://ton-site/api/install.php
```

La page vérifie d'abord son terrain (PHP, extensions, droits d'écriture) et
refuse d'aller plus loin si quelque chose manque. Puis elle demande :

| | |
|---|---|
| **Nom affiché** | le tien, celui qui s'affichera dans l'administration |
| **Adresse électronique** | elle sert d'identifiant |
| **Mot de passe** | **douze caractères minimum** |
| **Conservation** | 30 jours par défaut |

> **Ce mot de passe ouvre tout** : l'administration *et* l'espace professeur de
> l'application. C'est le seul du logiciel. Douze caractères parce que c'est la
> seule barrière entre le tableau de bord et n'importe qui — sur une page
> publique, un mot de passe court n'en est pas un.
>
> Il n'est stocké nulle part en clair, pas même par nous : seule son empreinte
> est enregistrée. **Personne ne pourra te le rappeler**, moi compris. Note-le.

Fais-le **tout de suite après le transfert**. Tant que l'installation n'est pas
faite, qui trouve l'adresse peut s'installer professeur à ta place.

---

## 4. Vérifier

Deux pages, dans le bandeau de l'administration :

**Santé** — le serveur va chercher ses propres fichiers par le web, comme le
ferait un inconnu, et te dit ce qui revient. Ce qu'on veut y lire :

- la base **n'est pas** téléchargeable ;
- `config.php` **n'est pas** lisible ;
- HTTPS actif.

**Rapport** — tout ce qu'il faut savoir sur l'hébergement en un bloc : version
de PHP, extensions, plafonds d'envoi, chemins, ce qu'un inconnu obtient. Un
bouton **Copier**, et tu me le colles.

> Ce rapport **ne contient aucun secret** — ni la clé de chiffrement, ni le
> secret de signature, ni aucun prénom d'élève. Des longueurs et des nombres.
> Tu peux le coller sans arrière-pensée.

---

## 5. Et après ? Plus jamais FileZilla

`deposer.php` est maintenant sur ton site. Pour toute mise à jour :

1. ouvre `https://ton-site/deposer.php` ;
2. connecte-toi (le mot de passe de l'étape 3) ;
3. envoie l'archive de mise à jour depuis ton ordinateur ;
4. vérifie l'aperçu, confirme.

Les archives de mise à jour ne contiennent que ce qui a changé — quelques
centaines de kilo-octets, assez léger pour passer par le navigateur.

Si l'archive dépasse le plafond de ton hébergement (la page l'affiche), dépose-la
à côté de `deposer.php` par FileZilla — **un seul fichier** — et recharge la
page : elle la trouvera toute seule.

`deposer.php` ne touche **jamais** à `api/config.php` ni à `api/data/`. C'est
câblé dans le code, et éprouvé avec une archive piégée qui essayait justement
de les écraser.

---

## Ce qui se met à jour tout seul

- **Le schéma de la base.** Une mise à jour qui ajoute une table ou une colonne
  s'applique à la première ouverture de l'administration. Rien à lancer.
- **Les réparations de données.** Quand une mise à jour change la façon de
  calculer quelque chose, elle répare l'existant une fois, et retient que c'est
  fait.

## Ce qui ne bouge jamais

`api/config.php` et `api/data/` n'appartiennent pas au logiciel : ils
appartiennent à **ton site**. Aucune mise à jour ne les remplace, aucune ne les
efface. C'est ce qui rend une republication sans danger.

---

## En cas de pépin

| Ce que tu vois | Ce que ça veut dire |
|---|---|
| Le site s'affiche mais rien ne marche | `api/` est incomplet — refais le transfert de ce dossier |
| « Route inconnue » ou 404 sur `/api/health` | la réécriture d'URL ne s'applique pas : demande `AllowOverride All` |
| Du code PHP s'affiche à l'écran | PHP ne s'exécute pas dans ce dossier — c'est pour l'hébergeur |
| `install.php` dit qu'il manque quelque chose | il nomme précisément quoi ; c'est le seul écran à lire en entier |
| Mot de passe oublié | efface `api/config.php` **et** `api/data/`, puis recommence à l'étape 3 — la base repart à zéro |

Et dans tous les cas : ouvre **Rapport**, clique **Copier**, colle-le-moi.
