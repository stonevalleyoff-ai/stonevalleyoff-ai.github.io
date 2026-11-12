# StoneValley · les jeux

La page d'accueil de tous les jeux : https://stonevalleyoff-ai.github.io/

Une seule page (`index.html`), sans dépendance :

- **Les jeux** : une fiche et un bouton pour chacun — [Stone Valley](https://stonevalleyoff-ai.github.io/stonevalley/), [Lisière](https://stonevalleyoff-ai.github.io/Lisiere/), [Portefaix](https://stonevalleyoff-ai.github.io/Portefaix/), [Les Dernières Braises](https://stonevalleyoff-ai.github.io/lastembers/), et [Orvane](https://stonevalleyoff-ai.github.io/orvane/), le monde qu'ils partagent.
- **Le compte** : le même pour les jeux qui en demandent un (le projet Supabase « Vallée de pierre »). On peut le créer ici, et demander un nouveau mot de passe. On se connecte dans chaque jeu.
- **L'arrivée par le lien d'un e-mail** : la page confirme l'inscription, ouvre le formulaire « Nouveau mot de passe », ou dit que le lien a expiré. Elle lit ce que le lien rapporte dans son adresse (un jeton, ou une erreur) et l'en efface aussitôt.

## Ajouter un jeu

Copier une fiche `<li class="jeu">` dans `index.html`, changer sa couleur (`--teinte`), son genre, son nom, sa phrase et son lien.

## Le réglage côté Supabase

Pour que les liens des e-mails ramènent ici par défaut : dans le projet, *Authentication › URL Configuration*, mettre **Site URL** à `https://stonevalleyoff-ai.github.io/`. Un jeu qui veut que ses propres liens ramènent chez lui ajoute son adresse aux *Redirect URLs* (Portefaix : `https://stonevalleyoff-ai.github.io/Portefaix/**`).

Les e-mails eux-mêmes sont envoyés par le projet : son service d'envoi par défaut est limité à quelques envois par heure ; pour de vrais joueurs, il faut y brancher un service d'envoi (*Emails › SMTP Settings*).

La clé écrite dans la page est la clé publique du projet, faite pour être dans une page : elle ne donne accès à rien sans le mot de passe de quelqu'un. Le mot de passe n'est gardé nulle part.

## L'essai

```
node outils/essai.js
```

Dans Chromium (il lui faut Playwright), contre un faux service de comptes local (`outils/faux-service.js`) : aucun vrai e-mail ne part, aucun compte n'est créé. Seize vérifications : les fiches, créer un compte, mot de passe oublié, les trois sortes de lien d'e-mail, la page sur un téléphone en thème sombre. Sur sa propre machine seulement, la page accepte un autre service de comptes dans son adresse (`?service=…`) : c'est ce dont l'essai se sert.
