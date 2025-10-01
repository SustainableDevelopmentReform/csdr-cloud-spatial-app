# 🌏 CSDR Cloud Spatial App

This repository is based on https://github.com/azharalifauzi/omnigate/ (MIT License - see LICENSE file)

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)
- [PostgreSQL](https://www.postgresql.org/)

### Installation

```bash
# Clone this repo
git clone https://github.com/azharalifauzi/csdr-cloud-spatial-app
cd csdr-cloud-spatial-app

# Instal packages
pnpm install

# Copy environment and set values for all of them
cp .env.example.local .env
```

### Setting up Database

To make the process of installing dependencies easier, we offer a `docker-compose-dev.yml` with a Postgres container.

```bash
docker-compose -f docker-compose-dev.yml up -d
```

You can then set the `DATABASE_URL` inside `.env` file to `postgresql://admin:admin@localhost:5431/csdr-dev`

**Important**: before run `pnpm seed` you have to set values for `INITIAL_USER_EMAIL` and `INITIAL_USER_NAME` inside `.env` file.

- This will default to `csdr-admin` and `admin@example.com`

```bash
# Migrate DB
pnpm migrate

# Seed DB
pnpm seed
```

### Development

```bash
pnpm dev
```

Frontend and backend start together with full type safety and no CORS issues.

### Production Build

```bash
pnpm build
```

### Testing

**Important**: Before run the test, you need to create another database specific for testing purpose, so your database that is used for development won't losing the data.

```bash
pnpm test:unit
```

## 📦 Deployment

### Single Container

Using single container will make your final image even smaller (only 150 MB).

This will run

- web app on port `3000`
- backend app on port `4000`

```bash
# Build the image
docker build -t csdr-cloud-spatial-app -f docker/single-file.Dockerfile .

# Run container (using local DB)
docker run --name csdr-cloud-spatial-app-web --env-file .env --add-host=host.docker.internal:host-gateway -p 3000:3000 -p 4000:4000 -e DATABASE_URL=postgresql://admin:admin@host.docker.internal:5431/csdr-dev csdr-cloud-spatial-app
```

### Multi Container

Docs TODO

### Run migration and seed in production

#### Single container mode

There are two commands to run the migration and seed in production:

```bash
# To migrate the database
docker run --env-file .env --add-host=host.docker.internal:host-gateway -e DATABASE_URL=postgresql://admin:admin@host.docker.internal:5431/csdr-dev csdr-cloud-spatial-app sh -c "cd /app/backend/migrate/ && node index.js"

# To seed the database
docker run --env-file .env --add-host=host.docker.internal:host-gateway -e DATABASE_URL=postgresql://admin:admin@host.docker.internal:5431/csdr-dev csdr-cloud-spatial-app sh -c "cd /app/backend/seed/ && node index.js"
```

## 💽 Database Schema (Drizzle)

Drizzle schema is located in [`apps/server/src/schemas` folder](./apps/server/src/schemas)

To generate a new migration, run:

```bash
pnpm create:migration
```

To run the migration, run:

```bash
pnpm migrate
```

To start Drizzle Studio, run:

```bash
pnpm drizzle-studio
```

To seed the database, run:

```bash
pnpm seed
```
