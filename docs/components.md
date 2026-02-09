# Composants à réaliser

Ce document liste les composants à concevoir et leurs critères de finition (fonctionnels/visuels).

## Navigation secondaire

### FiltersBar

- [x] Objectif : barre de filtres (catégorie, format, disponibilité).
- [x] Entrées : options de filtres, valeurs courantes.
- [x] États UI : valeurs sélectionnées, reset.
- [x] Done : filtres appliqués.

## Data display

### CalendarView

- [x] Objectif : afficher les sessions en calendrier.
- [x] Objectif : afficher les sessions en planning.
- [x] États UI : vide, chargement, erreurs.
- [x] Done : sessions visibles aux bonnes dates, navigation mois/semaine.

### SessionsList

- [x] Objectif : lister les sessions avec tri chrono.
- [x] Entrées : sessions, filtres appliqués.
- [x] États UI : vide, chargement, erreurs.
- [x] Done : tri correct, filtres appliqués, items cliquables.

### SessionCard

- [x] Objectif : aperçu d'une session (titre, date, statut, places).
- [x] Entrées : session, statut, places restantes.
- [ ] États UI : complet/annulé/reporté.
- [x] Done : badge de statut visible, clic ouvre le détail.

### SessionDetail

- [x] Objectif : page détail d'une session.
- [x] Entrées : session, formateur·ice, places, lieu/lien.
- [x] États UI : complet/annulé/reporté, liste d'attente.
- [x] Done : toutes les infos visibles, actions disponibles selon statut.

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

- [x] Objectif : créer/éditer une formation de référence.
- [x] Entrées : nom, description, prérequis, catégorie.
- [x] États UI : création/édition, validation.
- [x] Done : validation requise, sauvegarde réussie.

### SessionForm

- [x] Objectif : créer/éditer une session.
- [x] Entrées : formation de référence, nom personnalisé, description, prérequis, date/heure, durée, formateur·ice, format, places, visibilité, lieu/lien.
- [x] États UI : création/édition, brouillon, validation.
- [x] Done : validation champs requis, sauvegarde, statut cohérent.

### RegistrationForm

- [x] Objectif : inscription à une session.
- [x] Entrées : format (distanciel/présentiel), besoin d'excuse.
- [x] États UI : complet (liste d'attente), confirmation.
- [x] Done : statut d'inscription mis à jour, message de confirmation visible.

### PresenceForm

- [ ] Objectif : check-in des présences.
- [ ] Entrées : liste des inscrits, statut présent/absent/excusé.
- [ ] États UI : bulk actions (tout présent/absent).
- [ ] Done : statuts enregistrés, actions rapides fonctionnelles.

## Utilitaires & stores

### PermissionsGuard

- [x] Objectif : masquer/autoriser des vues selon permissions.
- [x] Entrées : permissions requises.
- [x] États UI : accès refusé.
- [x] Done : accès bloqué correctement, message affiché.

### SessionsStore

- [x] Objectif : état global des sessions (liste + filtres).
- [ ] Entrées : filtres, pagination.
- [ ] États UI : chargement, erreur.
- [ ] Done : état cohérent, cache local fonctionnel.
