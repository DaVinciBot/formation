# Composants à réaliser

Ce document liste les composants à concevoir et leurs critères de finition (fonctionnels/visuels).

## Navigation secondaire

### FiltersBar

- [ ] Objectif : barre de filtres (catégorie, format, disponibilité).
- [ ] Entrées : options de filtres, valeurs courantes.
- [ ] États UI : valeurs sélectionnées, reset.
- [ ] Done : filtres appliqués.

## Data display

### CalendarView

- [ ] Objectif : afficher les sessions en calendrier.
- [ ] Entrées : liste de sessions, plage de dates.
- [ ] États UI : vide, chargement, erreurs.
- [ ] Done : sessions visibles aux bonnes dates, navigation mois/semaine.

### SessionsList

- [ ] Objectif : lister les sessions avec tri chrono.
- [ ] Entrées : sessions, filtres appliqués.
- [ ] États UI : vide, chargement, erreurs.
- [ ] Done : tri correct, filtres appliqués, items cliquables.

### SessionCard

- [ ] Objectif : aperçu d'une session (titre, date, statut, places).
- [ ] Entrées : session, statut, places restantes.
- [ ] États UI : complet/annulé/reporté.
- [ ] Done : badge de statut visible, clic ouvre le détail.

### SessionDetail

- [ ] Objectif : page détail d'une session.
- [ ] Entrées : session, formateur·ice, places, lieu/lien.
- [ ] États UI : complet/annulé/reporté, liste d'attente.
- [ ] Done : toutes les infos visibles, actions disponibles selon statut.

### StatsCards

- [ ] Objectif : cartes de stats globales.
- [ ] Entrées : métriques agrégées.
- [ ] États UI : chargement, vide.
- [ ] Done : chiffres affichés, formatage cohérent.

### DataTable

- [ ] Objectif : table générique (inscriptions, présences, stats).
- [ ] Entrées : colonnes, lignes, actions.
- [ ] États UI : vide, tri, pagination.
- [ ] Done : tri et pagination fonctionnels, actions cliquables.

## Forms & actions

### TrainingForm

- [ ] Objectif : créer/éditer une formation de référence.
- [ ] Entrées : nom, description, prérequis, catégorie.
- [ ] États UI : création/édition, validation.
- [ ] Done : validation requise, sauvegarde réussie.

### SessionForm

- [ ] Objectif : créer/éditer une session.
- [ ] Entrées : formation de référence, nom personnalisé, description, prérequis, date/heure, durée, formateur·ice, format, places, visibilité, lieu/lien.
- [ ] États UI : création/édition, brouillon, validation.
- [ ] Done : validation champs requis, sauvegarde, statut cohérent.

### RegistrationForm

- [ ] Objectif : inscription à une session.
- [ ] Entrées : format (distanciel/présentiel), besoin d'excuse.
- [ ] États UI : complet (liste d'attente), confirmation.
- [ ] Done : statut d'inscription mis à jour, message de confirmation visible.

### PresenceForm

- [ ] Objectif : check-in des présences.
- [ ] Entrées : liste des inscrits, statut présent/absent/excusé.
- [ ] États UI : bulk actions (tout présent/absent).
- [ ] Done : statuts enregistrés, actions rapides fonctionnelles.

## Utilitaires & stores

### PermissionsGuard

- [ ] Objectif : masquer/autoriser des vues selon permissions.
- [ ] Entrées : permissions requises.
- [ ] États UI : accès refusé.
- [ ] Done : accès bloqué correctement, message affiché.

### SessionsStore

- [ ] Objectif : état global des sessions (liste + filtres).
- [ ] Entrées : filtres, pagination.
- [ ] États UI : chargement, erreur.
- [ ] Done : état cohérent, cache local fonctionnel.
