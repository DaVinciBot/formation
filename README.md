# formation

Application de gestion des formations DaVinciBot (SvelteKit + Svelte 5) :
sessions, formateurs, inscriptions et présences. Servie sous le base path **`/formation`** du domaine `davincibot.fr`.

Apps voisines : [`davincibot.fr`](https://github.com/DaVinciBot/davincibot.fr)
(`/`), [`cash`](https://github.com/DaVinciBot/cash) (`/admin`),
[`auth`](https://github.com/davincibot/auth) (`auth.davincibot.fr`).

## Prérequis

- Node `24.11.0` (`.nvmrc`), pnpm `11.5.2` (épinglé par `packageManager`)
- Un `NPM_TOKEN` (PAT GitHub avec `read:packages`) exporté dans le shell : les dépendances `@davincibot/*` viennent de
  GitHub Packages (privé). Voir
  [DaVinciBot/packages](https://github.com/DaVinciBot/packages).

## Configuration

Copier `.env.example` en `.env` :

```sh
PUBLIC_SUPABASE_URL=https://project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xx
# Service auth central (prod : https://auth.davincibot.fr)
PUBLIC_AUTH_BASE_URL=http://localhost:5177
# Préfixe optionnel des noms de cookies, vide en prod
PUBLIC_COOKIE_PREFIX=
```

L'authentification est déléguée au service `auth` : pour un parcours de login complet en local, il faut aussi faire
tourner l'app `auth` sur le port 5177.

## Développement

```sh
pnpm install
pnpm dev            # http://localhost:5176/formation
pnpm dev -- --open
```

Pour lancer les 3 sites d'un coup, utiliser `pnpm dev:all` depuis
`../davincibot.fr`.

## Qualité et build

```sh
pnpm check        # svelte-check
pnpm lint         # prettier --check + eslint --max-warnings=0
pnpm format       # prettier --write
pnpm test:unit    # vitest run --coverage
pnpm test:e2e     # playwright
pnpm build        # svelte-kit sync && vite build
pnpm preview      # 127.0.0.1:4173
pnpm ci           # check + lint + test:unit + build (ce que fait la CI)
```

## Documentation

- [`docs/project.md`](docs/project.md) — périmètre et organisation du projet
- [`docs/interfaces.md`](docs/interfaces.md) — écrans et parcours
- [`docs/components.md`](docs/components.md) — composants de l'app

## Déploiement

Build `adapter-node` avec `paths.base = '/formation'`, image Docker publiée sur GHCR puis déployée par Dokploy (service
Swarm derrière Traefik). Les workflows de `.github/workflows` appellent les workflows réutilisables de
[DaVinciBot/shared-workflows](https://github.com/DaVinciBot/shared-workflows).
