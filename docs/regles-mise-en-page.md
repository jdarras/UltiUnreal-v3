# Regles De Mise En Page (UltiUnreal)

Ce document sert de reference editable pour la mise en page UI.
Les styles effectifs sont dans les fichiers CSS cites ci-dessous.

## 1) Sources de verite

- `app/global.css`: layout global, topbar, cartes, formulaires, boutons, messages, utilitaires.
- `app/widgets/*.css`: styles specifiques aux widgets (timeline, slider, toggle, etc.).
- Styles inline ponctuels: composants React quand une regle visuelle locale est necessaire.

## 2) Tokens de couleur principaux

Definis dans `app/global.css`:

- `--uu-color-blue`: information, focus, etat actif.
- `--uu-color-green`: succes, validation positive.
- `--uu-color-orange`: avertissement.
- `--uu-color-red`: erreur, etat critique.
- `--uu-color-background`, `--uu-color-surface`, `--uu-color-field`, `--uu-color-border`, `--uu-color-text`, `--uu-color-text-muted`.

Regle: utiliser les variables CSS (`var(--...)`) plutot que des couleurs en dur.

## 3) Structure de page

Classes globales a respecter:

- `.uu-shell`: conteneur applicatif principal.
- `.uu-content`: zone centrale.
- `.uu-topbar`: barre haute.
- `.uu-section`: bloc de contenu.
- `.uu-card`: carte/panneau standard.
- `.uu-toolbar`, `.uu-row`, `.uu-col`: organisation des zones d'action.

Regle: chaque nouvel ecran doit reutiliser cette structure avant d'introduire de nouvelles classes.

## 4) Typographie et titres

- `.uu-page-title`, `.uu-page-subtitle`: titres d'ecran.
- `.uu-h3 .uu-block-title`: titres de bloc (les deux classes ensemble, TOUJOURS).
- `.uu-muted`: texte secondaire (faible contraste).

Regle: preferer les classes existantes plutot que du `style={{...}}` pour les tailles/couleurs de texte.

Regle titre de bloc: utiliser TOUJOURS `className="uu-h3 uu-block-title"` pour les titres de sections.
Ne jamais utiliser `uu-label` pour un titre de section/bloc.

## 5) Formulaires

Classes de base:

- `.uu-label`: label de champ.
- `.uu-input`: input/select/textarea.
- `.uu-check`: checkbox + libelle.
- `.uu-grid-field`: ligne de formulaire.

Regles:

- Le focus visuel passe par `.uu-input:focus` (accent bleu).
- Les erreurs de saisie passent par couleur rouge (bordure/fond) ou classe message.
- Les champs de lecture seule utilisent un style coherent avec le theme (pas de fond blanc natif).

Validation rouge (champs requis vides ou en erreur):
- `<input>` vide/invalide: bordure ET fond rouge.
  style={{ borderColor: "var(--uu-color-red)", backgroundColor: "rgba(163, 46, 46, 0.18)" }}
- `<select>` vide/invalide: bordure rouge UNIQUEMENT (pas de fond — fond colore rend les options illisibles).
  style={{ borderColor: "var(--uu-color-red)" }}
- Bloc entier en erreur (ex: case a cocher sans selection): fond + bordure rouge sur la carte.
  style={{ backgroundColor: "rgba(163, 46, 46, 0.22)", borderColor: "var(--uu-color-red)" }}

Grilles (uu-grid-2):
- `.uu-grid-2`: grille a 2 colonnes. Chaque enfant DIRECT occupe une cellule.
- Un fragment React (`<>...</>`) expose ses enfants directs comme cellules separees.
  => Toujours envelopper le contenu dans un `<div>` si on veut qu'il occupe une seule colonne.

## 6) Boutons

Classes usuelles:

- `.uu-btn`: bouton standard.
- `.uu-btn-ghost`: action secondaire dans la topbar.
- Variantes metier localisees (ex: classes postprod) si necessaire.

Regles:

- Actions primaires: bleu.
- Actions de succes: vert.
- Actions destructives: rouge.
- Etat disabled visible et coherent.

## 7) Messages et severites

Systeme de classes:

- `.uu-notice`, `.uu-msg`, `.uu-top-notice`
- Variantes: `.ok`, `.warn`, `.error`, `.info`

Convention de severite:

- `error` -> rouge
- `warn` -> orange
- `ok` -> vert (SUCCES — validation positive, mise a jour reussie)
- `info` -> bleu (information neutre, pas un succes)

Regle: NE PAS utiliser `info` pour un message de succes. Utiliser `ok`.
Si le message confirme une action reussie (ex: "mis a jour"), utiliser `ok`.
Si le message est un avertissement metier, utiliser `warn`.

Regle: les messages de feedback (succes, erreur) passent par `noticeApi.showNotice` en haut de page.
Ne jamais afficher de message de retour inline dans un formulaire quand un feedback topbar est possible.

Exemple correct:
  showNotice('Formulaire de rendu mis a jour.', 'ok');   // vert, succes
  showNotice('Erreur de mise a jour.', 'warn');          // orange, avertissement

## 8) Espacements utilitaires

Classes utilitaires existantes:

- Marges: `.mt-4`, `.mt-8`, `.mt-12`, `.mt-16`, `.mt-20`, `.mt-24`
- Gaps: `.gap-8`, `.uu-gap-4`, `.uu-gap-6`, `.uu-gap-8`, `.uu-gap-10`, `.uu-gap-12`, `.uu-gap-16`
- Largeur utilitaire: `.w-160`, `.uu-maxw-420`

Regle: reutiliser ces utilitaires avant d'ajouter de nouveaux helpers.

## 9) Regles de coherence

- Garder les etats visuels alignes avec la semantique (`warn` != bleu, `error` != vert).
- Eviter la duplication de regles contradictoires pour la meme classe.
- Centraliser dans `app/global.css` toute regle transversale.
- Limiter les styles inline aux cas strictement locaux.

## 10) Procedure de modification recommandee

1. Modifier d'abord `app/global.css` si la regle est globale.
2. Modifier `app/widgets/*.css` seulement pour un comportement propre a un widget.
3. Verifier l'impact visuel sur: topbar, formulaires, cartes, messages, mobile.
4. Verifier les severites de messages (`ok`, `warn`, `error`, `info`) apres changement.

## 11) Emplacements de reference rapides

- Layout global: `app/global.css`
- Topbar/notice: `app/main.jsx` + `app/global.css`
- Formulaires render forms: `app/screens/postproduction/catalogs/components/RenderFormsMetaCard.jsx`
- Catalogue/options formulaire: `app/screens/postproduction/catalogs/hooks/useProjectUnrealCatalog.js`

