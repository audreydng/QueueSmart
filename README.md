# QueueSmart

## Setup & run

### 1. Clone the repo

```bash
git clone <repo-url>
cd QueueSmart
```

### 2. Install dependencies

From the repo root:
```bash
pnpm install
```

If you prefer, you can also install from each app folder separately:
```bash
cd backend
pnpm install

cd frontend
pnpm install
```

### 3. Run the demo

Open two terminals and start the backend and frontend separately.

Backend:
```bash
cd backend
PORT=5000 pnpm dev
```

Frontend:
```bash
cd frontend
pnpm dev
```

The frontend expects the API at `http://localhost:5000/api` by default, so keep the backend running on port `5000` unless you set `NEXT_PUBLIC_API_BASE` yourself.

### 4. Open the app

Visit:

```bash
http://localhost:3000
```

## Team Members

1. Alexander Moreno
2. Amy Anh Hoang
3. Audrey Dang
4. Naziba Nur
