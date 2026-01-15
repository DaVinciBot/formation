# Stack technique

Supabase -> Postgresl
sveltekit, Svelte 5 ts, css

# Vision générale

Objectif du site :

- Centraliser les formations DVB
- Faciliter l'inscription des membres
- Donner de la visibilité aux formateur·ice·s
- Fournir des **statistiques utiles aux responsables formation**
- Réduire la charge organisationnelle (Discord / Excel / rappels manuels)

>Respo crée et planifie toutes les formations

**1) Rôles**

- Admin / Respo formation
- Formateur·ice : pour simplement voir les inscriptions
- Membre

# Vues

## 1 Vue membre

### 1.1 Vue principale

- Calendrier des formations
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
- Formation excusable ou non (je m'inspire du fab mais à dvb tout est excusable non ? est-ce qu'on met pour si un jour la politique change ?)
- Bouton :
  - **S’inscrire** (sur liste d'attente aussi si complète) Préciser si on a besoin d'un excuse de cours
  - **Se désinscrire**
- Badge :
  - Complet
  - Annulée
  - Reportée

### 1.3 Espace personnel

- Mes formations à venir
- Formations suivies
- Temps total de formation

## 2 Vue Admin / Respo fm

### 2.1 Onglet catalogue de formations

> Base de formation "types"

- Nom de référence (ex: _Rust_ et non _Rust Les Bases_ ou _Rust Aller plus loin avec Urbain le GOAT_) Utile pour les stats, regrouper ensemble les formations au contenu proche mais au nom différent pour connaitre le nombre de formations uniques données
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

## 3 Vue Formateur·ice

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
- Liste d’attente (si session complète)
- Actions :
  - Promouvoir quelqu’un de la liste d’attente à inscrit·e
  - Retirer quelqu’un (avec motif optionnel)
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
  - liste d’attente
- Modèles rapides :
  - rappel prérequis
  - changement de salle / lien
  - annulation / report

# Fonctionnalités

## Notifications

- Inscription confirmée
- Rappel J-1 / H-2
- Annulation / report
- Notification Discord (webhook)
- Envoie des infos utiles à lae respo fm

## Droits & rôles

- Admin
- Respo formation
- Formateur·ice
- Membre

## Historique

- Qui a créé / modifié quoi
- Journal des actions (utile en asso)

## Évolutions possibles

- Badge / niveaux de compétence
- Parcours de formation
- Feedback post-formation
- API publique (stats anonymisées) car pourquoi pas un bot discord avec des niveaux de compétences pour inciter les gens à venir aux formations a 👀👀
- Bouton IA génération de description
- `src/hooks.server.js` pour charger les sessions
