# API Mock Manager

A full-stack application for creating and managing API mocks.

## Features

### Frontend (React)
- Create, edit, and delete mock endpoints
- Configure HTTP method, status code, and JSON response
- JSON editor with formatting and validation
- Search endpoints by path
- Copy endpoint URLs to clipboard
- Test endpoints directly in browser
- Real-time endpoint management via backend management API

### Backend (Node.js + Express + SQLite)
- REST API for endpoint management
- SQLite database for persistence (`api_mocks.db`)
- Dynamic mock endpoint serving (all requests are matched against stored mocks)
- Query parameter support
- Automatic JSON response handling
- CORS enabled for frontend integration

---

## Project layout

```
api-mock-manager/
├─ backend/
│  ├ server.js
│  ├ package.json
│  ├ Dockerfile
│  ├ .dockerignore
│  └ api_mocks.db        <-- SQLite file persisted on host
├─ frontend/
│  ├ package.json
│  ├ Dockerfile
│  ├ docker-entrypoint.sh
│  ├ .dockerignore
│  ├ nginx/
│  │  └ default.conf
│  ├ public/
│  │  └ index.html
│  └ src/
│     ├ main.jsx
│     ├ index.css
│     └ App.jsx          <-- React component with dynamic API_BASE_URL logic
├─ docker-compose.yml
└─ README.md             <-- this file
```

---

## Local (non-docker) setup — quick start

### Backend
1. Install
```bash
cd backend
npm install
```
2. Start server:
```bash
# production
npm start

# or development with auto-reload (nodemon)
npm run dev
```
The server listens on port `3001`.

### Frontend
1. Install:
```bash
npm install
```
2. Start:
```bash
npm start
```
Open `http://localhost:3000`. for Docker deployment, see instructions below.

---

## Usage (app behavior)

1. Open frontend in browser.
2. Click **New Endpoint**:
   - Set path (e.g. `/api/users?limit=10`)
   - Choose method (GET, POST, etc.)
   - Choose status code (200, 404, 500, ...)
   - Enter JSON response body (Format / validate with the button)
3. Save. The frontend calls management API:
```
GET/POST/PUT/DELETE  {API_BASE_URL}/api/_manage/endpoints
```
4. Created mock endpoints are then available at:
```
{API_BASE_URL}{your_path}
```
E.g. `GET http://localhost:3001/api/users`

---

## Docker deployment

### Behavior & defaults
- **Backend (inside container)** listens on port `3001`.
- **Frontend** is an nginx static server that serves the built React app on container port `80`.
- **Host port mappings by default**:
  - `BACKEND_PORT` (host) → container `3001`
  - `FRONTEND_PORT` (host) → container `80`
  - These defaults are implemented via variable substitution in `docker-compose.yml`:
    - backend: `"${BACKEND_PORT:-3001}:3001"`
    - frontend: `"${FRONTEND_PORT:-3000}:80"`

### Prepare the SQLite file (important)
Before `docker-compose up` create an empty sqlite file to ensure the bind mount is a file, not a directory:
```bash
mkdir -p backend
touch backend/api_mocks.db
```

### Build & start (default)
From repository root (where `docker-compose.yml` sits):
```bash
docker-compose up --build
```
- Frontend (host): `http://localhost:3000` (default)
- Backend API (host): `http://localhost:3001` → forwards to container `3001`

### Stopping and restarting
To stop:
```bash
docker-compose down
```
To rebuild after source changes:
```bash
docker-compose up --build
```
