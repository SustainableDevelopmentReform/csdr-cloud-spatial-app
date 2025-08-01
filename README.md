# CSDR Cloud Spatial App

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
cp .env.example .env
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

### Deploy easily using Docker Compose:

```bash
# App wil run on port 3000
docker-compose up --build
```

### Single Container Option

Using single container will make your final image even smaller (only 150 MB).

```bash
# Build the image
docker build -t csdr-cloud-spatial-app -f docker/single-file.Dockerfile .

# Run container
docker run --name csdr-cloud-spatial-app --env-file .env --add-host=host.docker.internal:host-gateway -p 3000:3000 csdr-cloud-spatial-app
```

### Run migration and seed in production

#### Single container mode

```bash
# Run /bin/sh in docker
docker exec -it csdr-cloud-spatial-app /bin/sh

# Make sure you are inside the migrate or seed folder

# run this if you want to run migrate
cd backend/migrate

# run this if you want to run seed
cd backend/seed

# Run migration or seed
node index.js
```

#### Docker compose mode

```bash
# Run /bin/sh in docker
docker compose exec -it server /bin/sh

# Make sure you are inside the migrate or seed folder

# run this if you want to run migrate
cd migrate

# run this if you want to run seed
cd seed

# Run migration or seed
node index.js
```
