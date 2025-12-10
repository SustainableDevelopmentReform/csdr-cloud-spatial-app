# 🌏 CSDR Cloud Spatial App

This repository is based on https://github.com/azharalifauzi/omnigate/ (MIT License - see LICENSE file)

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)
- [PostgreSQL](https://www.postgresql.org/) (v17)

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

Start up postgres container with docker compose:

```bash
docker-compose -f docker-compose-dev.yml up -d
```

**Important**: before run `pnpm seed` you have to set values for `INITIAL_USER_NAME`, `INITIAL_USER_EMAIL`, and `INITIAL_USER_PASSWORD` inside `.env` file.

- This will default to `csdr-admin`, `admin@example.com`, and `admin@123`

```bash
# Migrate DB
pnpm migrate

# Seed DB
pnpm seed
```

### Development

Run the app with:

```bash
pnpm dev
```

### Production Build

```bash
pnpm build
```

### Testing

**Important**: Before running the tests, you need to create another database to avoid losing data.

```bash
pnpm test:unit
```

## 📦 Deployment

Full deployment docs are available in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## 💽 Database (Drizzle)

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

### Updating Better Auth DB Schema

Note: you may need to update the version (eg `@1.3.18`) of the better-auth CLI to the version used in the project.

```bash
cd apps/server
npx @better-auth/cli@1.3.18 generate --output src/schemas/auth.ts --config src/lib/auth.ts
```

Then follow the instructions in the terminal to generate and run the migration...
