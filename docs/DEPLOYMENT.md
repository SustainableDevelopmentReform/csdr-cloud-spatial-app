# Deployment

## Docker Deployment

Using the single-container deployment, this will run the web app on port `3000` and the backend app on port `4000`.

For the full set of env variables, see the example env files, but do not copy their host-only service endpoints verbatim into container deployments.

The minimum required env variables are:

```bash
APP_URL=https://csdr.localhost

INTERNAL_FRONTEND_URL=http://localhost:3000
INTERNAL_BACKEND_URL=http://localhost:4000

TRUSTED_ORIGINS=https://csdr.localhost

DATABASE_HOST=localhost
DATABASE_PORT=5431
DATABASE_USER=admin
DATABASE_PASSWORD=admin
DATABASE_NAME=csdr-dev

S3_BUCKET_NAME=
S3_SPACES_ENDPOINT=
S3_SPACES_SECRET_KEY=
S3_SPACES_ACCESS_KEY_ID=
# Optional for local/self-hosted S3-compatible stores
S3_FORCE_PATH_STYLE=false

# Optional if Chromium is not on the default runtime path
PDF_BROWSER_EXECUTABLE_PATH=

# You can use openssl to generate a random 32 character key: openssl rand -base64 32
BETTER_AUTH_SECRET=
```

Report publishing requires both:

- S3-compatible object storage for published PDFs
- a Chromium-compatible browser runtime for server-side PDF generation

If the app runs inside Docker while its database or S3-compatible storage runs on the host machine, use container-reachable endpoints such as `host.docker.internal` instead of `localhost`.

### Build the image locally

```bash
# Build the image
docker build -t csdr-cloud-spatial-app -f docker/single-file.Dockerfile .
```

## Running the app

The web app need to be accessible on `APP_URL` at root (for example `https://csdr.localhost`).

The backend app need to be accessible on `APP_URL` at `/api` (for example `https://csdr.localhost/api`). Note the path should not be re-written by a reverse proxy - the backend expects to receive requests at `/api`.

### Run using locally built image

```bash
# Run the container (using local .env file)
docker run --name csdr-cloud-spatial-app-web --env-file .env --add-host=host.docker.internal:host-gateway -p 3000:3000 -p 4000:4000 -e DATABASE_HOST=host.docker.internal -e S3_SPACES_ENDPOINT=http://host.docker.internal:8333 csdr-cloud-spatial-app
```

### Run using published image from ECR

```bash
# Log into ECR
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 891612567384.dkr.ecr.ap-southeast-2.amazonaws.com

# Pull the latest image
docker pull --platform linux/amd64 891612567384.dkr.ecr.ap-southeast-2.amazonaws.com/csdr/csdr-cloud-spatial-app:latest

# Run the container (using local .env file)
docker run --platform linux/amd64 --name csdr-cloud-spatial-app-web --env-file .env --add-host=host.docker.internal:host-gateway -p 3000:3000 -p 4000:4000 -e DATABASE_HOST=host.docker.internal -e S3_SPACES_ENDPOINT=http://host.docker.internal:8333 891612567384.dkr.ecr.ap-southeast-2.amazonaws.com/csdr/csdr-cloud-spatial-app:latest
```

### Local development with caddy

The app can be run locally (using `pnpm dev` or docker) with caddy as a reverse proxy, this also provides local TLS for testing. This emulates the production environment, with the web-app and backend running through the same hostname (e.g. `https://csdr.localhost`).

There is an example config file at [.env.example.caddy](../.env.example.caddy).

```bash
# Start caddy
docker-compose -f docker/caddy/docker-compose.yml up -d
```

## Database migrations and seeding

Using the single container deployment, the app can be run with the following commands to run the migration and seed:

```bash
# To migrate the database
docker run --env-file .env --add-host=host.docker.internal:host-gateway -e DATABASE_HOST=host.docker.internal -e DATABASE_PORT=5431 -e DATABASE_USER=admin -e DATABASE_PASSWORD=admin -e DATABASE_NAME=csdr-dev csdr-cloud-spatial-app sh -c "cd /app/backend/migrate/ && node index.js"

# To seed the database
docker run --env-file .env --add-host=host.docker.internal:host-gateway -e DATABASE_HOST=host.docker.internal -e DATABASE_PORT=5431 -e DATABASE_USER=admin -e DATABASE_PASSWORD=admin -e DATABASE_NAME=csdr-dev csdr-cloud-spatial-app sh -c "cd /app/backend/seed/ && node index.js"
```

**Note**: Before running the seed, you need to set values for `INITIAL_USER_NAME`, `INITIAL_USER_EMAIL`, and `INITIAL_USER_PASSWORD` environment variables.
Alternatively, you can login to the container and run the commands directly.

At some stage we should automate this process when a new version of the image is deployed.

### Migrations in production

Please manually create a AWS RDS snapshot of the production database - include the name of the latest migration that is about to be run

- For example `csdr-dev-eks-app-db-pre-migration-0016-tiny-black-tom`

Shell into the container and run the migrations:

```bash
cd /app/backend/migrate/
node index.js
```
