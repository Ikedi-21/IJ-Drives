<a id="top"></a>
# IJDrives — Production FastAPI Backend

<div align="center">

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB.svg?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0%20Async-D71F00.svg?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)
[![Pydantic](https://img.shields.io/badge/Pydantic-v2-E92063.svg?style=for-the-badge&logo=pydantic&logoColor=white)](https://docs.pydantic.dev)

<p align="center">
  <a href="#architecture--one-flow-path"><img src="https://img.shields.io/badge/🏛_One_Flow-Architecture-8A2BE2?style=for-the-badge" alt="Architecture"></a>
  <a href="#quickstart-guide"><img src="https://img.shields.io/badge/🚀_Quickstart-Guide-007ACC?style=for-the-badge" alt="Quickstart"></a>
  <a href="#running-automated-tests"><img src="https://img.shields.io/badge/🧪_Automated-Testing-FF9800?style=for-the-badge" alt="Testing"></a>
  <a href="#docker-deployment"><img src="https://img.shields.io/badge/🐳_Docker-Deployment-2496ED?style=for-the-badge" alt="Docker"></a>
</p>

</div>

High-performance, production-ready backend for **IJDrives**, Nigeria's multi-modal transport discovery and booking marketplace (Land, Rail, Sea, Air).

Built with **FastAPI**, **Async SQLAlchemy 2.0**, and **Pydantic v2**, strictly adhering to **Clean Layered Architecture**, **SOLID principles**, and a unified **One Flow Path** execution model.

---

<a id="architecture--one-flow-path"></a><a id="architecture-one-flow-path"></a>
## 🏗 Architecture & One Flow Path

Every request entering the application follows an identical, predictable unidirectional lifecycle:

```
Client (HTTP / js/api.js)
  └──> Middleware Pipeline (CORS, Request ID, Error Interception)
        └──> FastAPI Router (Pydantic Request Validation)
              └──> Service Layer (Domain Logic & ACID Transactions)
                    └──> Repository Layer (SQLAlchemy 2.0 Async CRUD & Row Locks)
                          └──> Relational Database (PostgreSQL / SQLite)
```

### Standard Unified Response Envelope

Every endpoint strictly outputs the standard envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-11-04T13:20:00Z",
    "request_id": "req_01h9x7..."
  }
}
```

<p align="right"><a href="#top">⬆ Back to Top</a></p>

---

<a id="quickstart-guide"></a><a id="-quickstart-guide"></a>
## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- (Optional) Docker & Docker Compose

### 2. Setup Virtual Environment

```bash
cd backend
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

*(By default, `.env` runs out-of-the-box with async SQLite `sqlite+aiosqlite:///./ijdrives.db`)*

### 5. Seed Initial Data (Transport Providers & Routes)

Populate providers and routes across Land, Rail, Sea, and Air directly from the JSON catalog, along with a demo user:

```bash
python -m app.data_seeds.seed_initial_data
```

*Pre-seeded demo credentials:*
- **Email:** `demo@ijdrives.ng`
- **Password:** `password123`
- **Wallet Balance:** ₦15,000.00

### 6. Run Development Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Interactive API Docs (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Diagnostic Probe:** [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

<p align="right"><a href="#top">⬆ Back to Top</a></p>

---

<a id="running-automated-tests"></a><a id="-running-automated-tests"></a><a id="automated-testing"></a>
## 🧪 Running Automated Tests

Run the full async pytest suite covering authentication, wallet accounting, double-spending prevention, and booking transactions:

```bash
pytest -v
```

<p align="right"><a href="#top">⬆ Back to Top</a></p>

---

<a id="docker-deployment"></a><a id="-docker-deployment"></a>
## 🐳 Docker Deployment

To launch the full production stack with PostgreSQL:

```bash
docker compose up -d --build
```

<p align="right"><a href="#top">⬆ Back to Top</a></p>

