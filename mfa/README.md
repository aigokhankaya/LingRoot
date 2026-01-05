# LingRoot MFA Service

This is a standalone microservice for running the Montreal Forced Aligner (MFA) via Docker.

## Prerequisites

1.  **Node.js** (v18+)
2.  **Docker Desktop** (Must be running)
3.  **MFA Models**: You must have the dictionary and acoustic model files on your disk.

## Installation

1.  Navigate to this folder:
    ```bash
    cd mfa-service
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

1.  Copy `env.example` to `.env`:
    ```bash
    cp env.example .env
    ```
2.  **CRITICAL**: Edit `.env` and update the model paths to point to your actual local files:
    -   `MFA_DICT_PATH`: Full path to `english.dict`
    -   `MFA_ACOUSTIC_DIR`: Full path to the acoustic model directory (containing `final.mdl`)

## Usage

Start the server:

```bash
npm start
```

The service will run on port `5002` (default).

## API Endpoints

-   `GET /health`: Check status
-   `GET /api/mfa/status`: Check availability of Docker and Models
-   `POST /api/mfa/align-async`: Submit an alignment job
-   `GET /api/mfa/job/:jobId`: Check job progress

## Deployment (Tunnel)

To expose this service to the internet (for LingRoot backend to consume):

```bash
cloudflared tunnel --url http://localhost:5002
```

Then update `LingRoot` backend `.env` with the generated URL.
