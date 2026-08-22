# Stack technique

Supabase -> Postgresl sveltekit, Svelte 5 ts, css

# Vision générale

Objectif du site :

- Centraliser les formations DVB
- Faciliter l'inscription des membres
- Donner de la visibilité aux formateur·ice·s
- Fournir des **statistiques utiles aux responsables formation**
- Réduire la charge organisationnelle (Discord / Excel / rappels manuels)

> Respo crée et planifie toutes les formations

**1) Rôles**

- Admin / Respo formation
- Formateur·ice : pour simplement voir les inscriptions
- Membre

## Règles métier

- Inscription possible jusqu'à 5 minutes après le début de la session.
- Désinscription possible jusqu'à 5 minutes après le début de la session.
- Promotion automatique de la liste d'attente lorsqu'une place se libère (par format distanciel/présentiel).
- Le besoin d'excuse (`to_excuse`) est modifiable à tout moment.

# Vues

## 1 Vue membre

### 1.1 Vue principale

- Calendrier des formations (vue commune à tous les rôles, fonctionnalités additionnelles selon le rôle connecté)
  - Filtrage par :
    - Catégorie
    - Distanciel / Présentiel
    - Disponibilité (complet / places restantes)
  - Vue :
    - Calendrier
    - Liste chronologique (sur mobile ça peut être plus simple)

### 1.2 Détail d'une formation

- Nom
- Description
- Formateur·ice
- Catégorie
- Prérequis
- Durée
- Date & heure
- Lieu / lien visio (une fois l'inscription faite)
- Nombre de places restantes
- Formation excusable ou non (je m'inspire du fab mais à dvb tout est excusable non ? est-ce qu'on met pour si un jour
  la politique change ?)
- Bouton :
  - **S'inscrire** (sur liste d'attente aussi si complète) Préciser si on a besoin d'un excuse de cours
  - **Se désinscrire**
- Badge :
  - Complet
  - Annulée
  - Reportée

### 1.3 Espace personnel

- Mes formations à venir
- Formations suivies
- Temps total de formation

### 1.4 Parcours pas à pas (membre)

1. Connexion email/password.
2. Consultation du calendrier/liste filtrable.
3. Ouverture d'une session pour voir détails et statut (complète/annulée/reportée).
4. Choix distanciel/présentiel si applicable, puis inscription.
5. Si complète : inscription en liste d'attente avec position affichée.
6. Réception de l'email de confirmation avec un fichier `calendar.ics`.
7. Modification possible de l'état `to_excuse` à tout moment.
8. Désinscription possible jusqu'à 5 minutes après le début.
9. Si une place se libère : promotion automatique de la liste d'attente et notification par email.
10. Après la session : historique et temps cumulés mis à jour si présent.

## 2 Vue Admin / Respo fm

- Calendrier des formations partagé avec actions d'édition/annulation selon permissions.

### 2.1 Onglet catalogue de formations

> Base de formation "types"

- Nom de référence (ex: _Rust_ et non _Rust Les Bases_ ou _Rust Aller plus loin avec Urbain le GOAT_) Utile pour les
  stats, regrouper ensemble les formations au contenu proche mais au nom différent pour connaitre le nombre de
  formations uniques données
- Description par défaut (optionnel)
- Prérequis par défaut (optionnel)
- Catégorie

==Sert de référence pour les stats et la cohérence==

### 2.2 Onglet : Créer une session de formation

- Formation de référence (sélecteur ou ajouter une nouvelle formation)
- Nom personnalisé (obligatoire avec placeholder de la fm de référence)
- Description personnalisée (optionnel avec placeholder de la fm de référence)
- Prérequis personnalisés (optionnel avec placeholder de la fm de référence)
- Date & heure
- Durée
- Formateur·ice
- Lieu / lien
- Places max
  - Distanciel
  - Présentiel
- Visibilité :
  - Publique
  - Brouillon (avec heure de publication)
- Validation admin (si proposition 1)

### 2.3 Onglet : Gestion des inscriptions

- Liste des inscrit·e·s
- Statut :
  - Confirmé·e
  - Absent·e
  - Désinscrit·e
- Export CSV
- Bouton :
  - Envoyer un rappel
  - Annuler la formation

### 2.4 Onglet : Statistiques

- Par semaine / mois
  - Nombre de formations
  - Nombre de formé·e·s
  - Nombre total de places proposées
  - Durée totale de formation
  - Nb de formations uniques
- Par catégorie (Logiciel, Code, Électronique, Robotique, Autres)
  - Mêmes champs que précédemment
- Par formateur·ice :
  - Mêmes champs que précédemment
- Par membre :
  - Nombre de fm suivies
  - Durée cumulées
- Par période paramétrable :
  - Toutes les $x$ semaines / mois
  - nb de fm par catégorie et total
  - durée cumulées par catégorie et total
  - ...

### 2.5 Parcours pas à pas (admin / respo)

1. Connexion email/password.
2. Création/édition des formations de référence (catalogue).
3. Création d'une session : date, durée, format, places, formateur·ice, visibilité.
4. Publication immédiate ou brouillon.
5. Mail pour lae formateur·ice si nouvelle session publiée ou jour/heure/formateurice modifié.
6. Suivi des inscriptions : liste, statut, export CSV.
7. Annulation/report et communication aux inscrit·e·s.
8. Pilotage des stats (par période, catégorie, formateur·ice, membre).
9. Déclenchement manuel du webhook Discord pour l'annonce hebdo.

## 3 Vue Formateur·ice

- Calendrier des formations partagé avec actions de gestion de session selon permissions.

### 3.1 Tableau de bord

- Formations à venir
- Historique
- Nombre de personnes formées
- Durée cumulée

### 3.2 Création / proposition de formation (si proposition 1)

- Créer une formation type (si autorisé) ou proposer une session
- Champs : catégorie, niveau, description, prérequis, durée, format, places
- Soumise à validation admin
- Suivi du statut :
  - Brouillon
  - En attente
  - Acceptée
  - Refusée (avec commentaire)

### 3.3 Onglet : Mes formations

> Gestion des **sessions** que lae formateur·ice anime

liste + filtre : à venir / passées / annulées

**1) Détails session**

- Date / heure / durée
- Distanciel / présentiel + lien / salle
- Capacité + places restantes

**2) Inscriptions**

- Liste des inscrit·e·s (avec infos utiles : pseudo discord, nom/prénom, contact)
  - Clic pour plus de détails : Liste des formations déjà suivies du même "type" de formation
- Liste d'attente (si session complète)
- Actions :
  - Promouvoir quelqu'un de la liste d'attente à inscrit·e
  - Retirer quelqu'un (avec motif optionnel)
  - Clôturer les inscriptions

**3) Présence**

- Check-in par personne :
  - Présent·e
  - Absent·e
  - Excusé·e (à gérer ici ou lors de l'inscription de la personne si elle est présente)
- Boutons rapides :
  - "Tout le monde présent"
  - "Tout le monde absent" (avec confirmation)
- Export :
  - CSV liste présents / absents

**4) Communication**

- Envoyer un message aux : (bien préciser automatiquement l'auteur·ice du message)
  - inscrit·e·s
  - liste d'attente
- Modèles rapides :
  - rappel prérequis
  - changement de salle / lien
  - annulation / report

### 3.4 Parcours pas à pas (formateur·ice)

1. Connexion email/password.
2. Accès à son tableau de bord (sessions à venir, historique).
3. Ouverture d'une session pour consulter détails et inscriptions.
4. Gestion de la liste d'attente si une place se libère.
5. Clôture des inscriptions si nécessaire.
6. Check-in des présences (présent/absent/excusé).
7. Export CSV des présences.
8. Communication ciblée (inscrits, liste d'attente).

# Fonctionnalités

## Notifications

- Canal principal : email (AWS SES).
- Adresse expéditeur : `noreply@davincibot.fr`.
- Inscription confirmée : email + `calendar.ics`.
- Rappel J-1 / H-2 avec détails lieu/lien.
- Annulation / report : email dédié.
- Mentionner la position en liste d'attente si applicable.
- Rappel explicite de se désinscrire si absence.
- Discord : webhook déclenchable pour annoncer les formations de la semaine.

## Fonctionnalités (liste exhaustive par rôle/module)

### Membre

- Consulter calendrier/listes filtrables.
- Accéder au détail d'une session (statut, places restantes, liens).
- S'inscrire à une session (distanciel/présentiel).
- S'inscrire en liste d'attente si complet.
- Se désinscrire jusqu'à +5 min après le début.
- Modifier le besoin d'excuse (`to_excuse`).
- Consulter ses formations à venir et historiques.
- Accéder à ses statistiques personnelles (durée cumulée, nb suivies).

### Admin / Respo formation

- Gérer le catalogue des formations de référence.
- Créer/éditer des sessions (nom, description, prérequis personnalisés).
- Planifier visibilité (publique/brouillon).
- Gérer les inscriptions et statuts (confirmé, absent, désinscrit).
- Annuler/report de session.
- Export CSV des inscriptions/présences.
- Envoyer des rappels aux inscrit·e·s.
- Déclencher l'annonce hebdo sur Discord.
- Consulter les statistiques par période/catégorie/formateur·ice/membre.

### Formateur·ice

- Voir ses sessions à venir et passées.
- Accéder aux détails de session (lieu/lien, capacité).
- Consulter la liste des inscrit·e·s + liste d'attente.
- Promouvoir un inscrit depuis la liste d'attente.
- Clôturer les inscriptions.
- Gérer les présences (présent/absent/excusé).
- Export CSV présents/absents.
- Communiquer avec inscrits/liste d'attente.

### Modules transverses

- Auth email/password.
- Gestion des permissions (view_trainings/edit_trainings).
- Export CSV (inscriptions, présences, stats).

## Droits & rôles

Gestion par permissions :

- Voir / S'inscrire aux formations
- Gérer les formations

Le "rôle" formateur·ice est calculé automatiquement s'il existe une formation animée.

## Glossaire

- Formation (type) : modèle de formation réutilisable pour créer des sessions.
- Session de formation : occurrence planifiée d'une formation (date/heure, formateur·ice, lieux).
- Inscription : lien membre → session avec statut et format (distanciel/présentiel).
- Liste d'attente : file d'inscrits en attente de place.
- Excuse (`to_excuse`) : indicateur de besoin d'excuse de cours.
- Places distancielles/présentielles : capacités séparées par format.
- Statut session : état d'une session (draft, pending, done, postponed, canceled).
- Statut inscription : état d'une inscription (registered, waitlisted, canceled).

## Évolutions possibles

- Badge / niveaux de compétence
- Parcours de formation
- Feedback post-formation
- API publique (stats anonymisées) car pourquoi pas un bot discord avec des niveaux de compétences pour inciter les gens
  à venir aux formations a 👀👀
- Bouton IA génération de description
- `src/hooks.server.js` pour charger les sessions
