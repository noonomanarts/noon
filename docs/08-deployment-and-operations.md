# 08. Deployment and Operations

## Production Shape

The repository is configured for containerized deployment.

Key characteristics:

- Next.js uses `output: "standalone"`
- PostgreSQL runs as a separate service
- Docker Compose is used for orchestration
- an external reverse-proxy network is expected in the main production compose file

## Main Deployment Files

| File | Purpose |
| --- | --- |
| `Dockerfile` | Application image build |
| `docker-compose.yml` | Main app + database deployment |
| `SERVER/docker-compose.yml` | Proxy and TLS companion setup |
| `SERVER/nginx.conf` | Proxy configuration |
| `scripts/migrate-and-start.sh` | Startup wait + migration + boot sequence |

## Container Startup Flow

Production startup is designed to:

1. ensure a valid database connection string exists
2. wait until PostgreSQL is reachable
3. run pending SQL migrations
4. start the Next.js standalone server

This is a good deployment practice because it reduces schema drift between releases.

## Runtime Environment Concerns

Production relies on environment variables for:

- database connectivity
- public base URLs
- VAPID keys
- payment integration
- file upload storage path
- internal secrets for scheduled/admin operations

All production deployments should treat these variables as release-critical configuration.

## Storage Concerns

The deployment file defines persistent volumes for:

- PostgreSQL data
- uploads
- app data
- logs
- backups

This means operational planning must account for:

- persistence strategy
- disk usage
- backup policy
- restore testing

## Health and Reliability

The compose file includes health checks for:

- PostgreSQL readiness
- application reachability

This should be preserved and improved where necessary, not removed.

## Operational Risks

### Secrets management

The compose configuration includes placeholders and defaults. Real deployments must replace them with production-safe values.

### Volume/password mismatch

Persisted PostgreSQL data can preserve old credentials, even if `.env` values change later.

### Upload path correctness

Uploads depend on filesystem path configuration and mounted storage. Broken mounts can cause partial production failures.

### Payment configuration

Paymob configuration must match the merchant region and required integration identifiers.

## Recommended Deployment Checklist

Before deploying:

- confirm all required environment variables are present
- confirm database connectivity
- confirm migrations are valid
- confirm upload storage is mounted
- confirm public base URL is correct
- confirm payment credentials are valid

After deploying:

- verify app health
- verify localized public routes load
- verify admin login
- verify one read-only database-backed page
- verify one upload-dependent path if relevant

## Backups and Recovery

The repository includes backup-related admin endpoints and persistent backup storage concepts. Operational teams should still maintain an external backup and restore process rather than relying on application-level mechanisms alone.

## Rule

No production release should be treated as complete unless startup, migration, storage, auth, and core admin/public routes have been validated in the deployed environment.
