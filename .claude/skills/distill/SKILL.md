---
name: distill
description: Lire le journal des frictions d'AtoutMath (docs/frictions.md), en tirer les outils qui manquent, et les fabriquer. Utiliser cette skill dès que Rémy tape /distill, dit « distille », « regarde les frictions », « qu'est-ce qui te ralentit », « fabrique-toi les outils qu'il te faut », ou demande pourquoi une tâche prend si longtemps. À utiliser aussi quand le rappel de début de session annonce des entrées non traitées et qu'il demande de s'en occuper.
---

# Distiller les frictions en outils

Le journal `docs/frictions.md` note ce qui a coûté plus cher que la tâche ne le
méritait. Cette skill le lit, regroupe ce qui se ressemble, et **fabrique** ce
qui manque — elle ne rend pas un rapport.

Rémy : « ça permet à Claude de repérer ce qui lui manque pour t'aider au mieux,
et d'implémenter ces outils pour toi au moment où tu le juges opportun ».
Le moment, c'est lui qui le choisit. Le travail, c'est ici.

## Ce qu'on cherche

Une friction isolée est une anecdote. Ce qui mérite un outil, c'est ce qui
**revient** — d'où les marques de récidive dans le journal. Trois signaux :

- **La répétition.** Neuf sondes de navigateur qui recopient les mêmes quarante
  lignes : ce n'est pas neuf problèmes, c'est un module absent.
- **Le rituel.** Une suite de gestes qu'on refait à l'identique et dont l'oubli
  casse quelque chose en silence — le rituel de version en est l'exemple parfait.
- **Le piège.** Une erreur dont le message désigne autre chose que la cause.
  L'outil n'est alors pas un raccourci : c'est un **détecteur** qu'on place au
  bon endroit.

Une friction qui n'a qu'une marque et qu'on ne sait pas nommer se laisse dans le
journal. Elle reviendra, ou pas.

## La marche à suivre

1. **Lire tout le journal**, y compris ce qui a déjà été traité (les entrées
   barrées) : une friction qu'on croyait réglée et qui revient dit que l'outil
   fabriqué n'était pas le bon.

2. **Regrouper.** Plusieurs entrées visent souvent le même manque sous trois
   descriptions différentes. C'est le regroupement qui révèle l'outil — pas
   l'entrée la plus bruyante.

3. **Proposer avant de coder.** Présenter à Rémy, pour chaque groupe : ce que ça
   coûte aujourd'hui (repris du journal, chiffré), ce qu'on veut fabriquer, et
   en combien de temps. Puis lui demander lesquels. C'est son dépôt ; un outil
   qu'il ne veut pas est une dette de plus.

4. **Fabriquer.** Les outils vivent dans `tools/` (pas dans `tools/tmp/`, qui
   est ignoré par git) ; ceux qui guident le travail plutôt que de l'exécuter
   vivent dans `.claude/skills/`. Tout ce qui est écrit ici suit les règles du
   `CLAUDE.md` : en français, commenté, et **mesuré**.

5. **Mesurer l'outil lui-même.** Un outil qui prétend remplacer trois gestes doit
   être montré en train de les remplacer : on refait la tâche qui avait coûté
   cher, avec l'outil, et l'on compare. Sans cette mesure on a écrit du code, pas
   résolu une friction.

6. **Fermer l'entrée.** Barrer la friction traitée dans le journal
   (`~~titre~~`), et écrire sous elle **ce qui la remplace** et **ce que la
   mesure a donné**. Le journal devient alors l'histoire de ce qui a été gagné,
   ce qui est bien plus utile qu'une liste de plaintes.

7. **Écrire la règle là où on la lit.** Si l'outil change la façon de
   travailler, `CLAUDE.md` doit le dire — sinon la prochaine session refera la
   friction à côté de l'outil qui la résout.

## Ce qu'on évite

- **Le tableau de bord.** Compter les frictions n'en résout aucune. On sort de
  cette skill avec du code qui marche, ou avec une décision de Rémy de ne rien
  faire — pas avec une synthèse.
- **L'outil qui devine.** Un script qui « comprend » ce qu'on voulait dire
  devient une friction à son tour. On préfère un outil bête qui échoue fort.
- **L'outil pour soi seul.** Rémy travaille dans ce dépôt. Un outil qu'on ne
  peut pas lui expliquer en une phrase ne mérite pas d'y entrer.

## Le rappel de début de session

Un `hook` compte les entrées non traitées et l'annonce à l'ouverture. Ce n'est
pas une injonction à lancer `/distill` : c'est pour que Rémy sache que le
journal existe et s'épaissit. Il le lance quand ça l'arrange.
