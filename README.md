# LEAFLINE – SOIL & NUTRIENT INTELLIGENCE SERVICE
### Service 2 of the Leafline Sunflower Health Intelligence Platform
**Version:** 1.0.0  
**Specification:** Complete Specification V1.0 (26 October 2026)  
**Deployment Target:** AWS EC2 (Containers) + AWS RDS (MySQL Database)

---

## 1. PROJECT OVERVIEW

**Leafline Soil & Nutrient Management Service** is a commercial-grade agricultural intelligence microservice engineered to manage soil nutrient levels, validate lab test inputs, diagnose NPK deficiencies and excesses, evaluate overall soil health, and deliver anonymized historical datasets for agricultural research.

The service is strictly built upon the primary specification document, following a clean **Three-Layer Architecture** (API Layer, Business Layer, Data Layer) across six independent software modules.

---

## 2. TECHNOLOGY STACK

- **Frontend:**
  - React.js with Vite
  - Tailwind CSS (Forest green, leaf green, and clean earthy palette)
  - React Router DOM
  - Recharts (Interactive NPK timelines, pH/moisture trends, health distribution)
  - Lucide React
  - Axios (with automatic token interceptors and refresh rotation)

- **Backend:**
  - Python 3.11+
  - FastAPI (REST APIs with Swagger UI OpenAPI documentation)
  - SQLAlchemy 2.0 (Relational ORM, connection pooling with `pool_pre_ping`)
  - Pydantic V2 (Strict request/response validation)
  - Alembic (Automated schema migrations)
  - Background Analysis Worker (Database-backed polling queue — NO message queues per spec)

- **Database:**
  - MySQL 8.0 (AWS RDS MySQL in production, SQLite/MySQL in development)
  - Append-only versioned schema (Corrections create new versions; old versions immutable)

- **AWS Cloud Deployment:**
  - **AWS EC2:** Containerized hosting via Docker Compose
  - **AWS RDS for MySQL:** Private subnet, KMS encrypted, restricted DB user
  - **Nginx:** Reverse proxy, Gzip compression, and security headers
  - **GitHub Actions:** CI/CD pipeline (lint, unit tests, frontend build, containerization, deployment)

---

## 3. THE SIX SOFTWARE MODULES

| Module | Name | Responsibility | Main API Endpoints |
|---|---|---|---|
| **Module 1** | Soil Data Management | Validates measurement ranges, fixed units, 7-day correction window, append-only sample storage, rate limits (100/hr). | `POST /api/v1/soil/soil-measurements`<br>`POST /api/v1/soil/soil-measurements/{id}/corrections`<br>`GET /api/v1/soil/soil-measurements/{id}` |
| **Module 2** | NPK Analysis | Evaluates available Nitrogen, Phosphorus, and exchangeable Potassium against sunflower thresholds into `LOW`, `OK`, or `HIGH`. | Evaluated in submission & result read |
| **Module 3** | pH & Moisture Analysis | Evaluates Soil pH (0.0–14.0) and volumetric moisture percentage (0–100%) into `LOW`, `OK`, or `HIGH`. | Evaluated in submission & result read |
| **Module 4** | Soil Health Score | Aggregates all 5 parameters into an authoritative overall health badge: `GOOD` (all in range), `FAIR` (1 non-severe out), or `POOR` (2+ out or any severe). | `GET /api/v1/soil/soil-health` |
| **Module 5** | Nutrient Deficiency & Excess | Computes mathematical deviation severity (`slight` <=10%, `moderate` 10–25%, `severe` >25%) and merges Soil & Nutrient AI view. | `GET /api/v1/soil/soil-health` |
| **Module 6** | Soil History & Anonymity | Chronological sample records, interactive trend graphs, paged filters, and **masked made-up codes (`FLD-ANON-XXXX`)** for researchers with zero farmer identity disclosure. | `GET /api/v1/soil/soil-history` |

---

## 4. SUNFLOWER SOIL THRESHOLDS & BUSINESS RULES

### 4.1 Measurement Boundaries & Fixed Units (NS-BR-02, NS-BR-04)
- **Nitrogen (N):** 0 to 1000 mg/kg (`mg/kg` fixed unit)
- **Phosphorus (P):** 0 to 1000 mg/kg (`mg/kg` fixed unit)
- **Potassium (K):** 0 to 1500 mg/kg (`mg/kg` fixed unit)
- **pH:** 0.0 to 14.0 (strictly 1 decimal place, unitless)
- **Moisture:** 0% to 100% (`%` volumetric fixed unit)
- **Sample Depth:** 0 to 100 cm
- **Sampling Date:** Cannot be in the future or older than 5 years (NS-BR-07)
- **Duplicate Rule:** Same field, date, and depth rejected with HTTP 409 Conflict (NS-BR-08)

### 4.2 Agronomic Starting Good Ranges for Sunflower
| Measurement | LOW (Deficient) | Optimal Good Range | HIGH (Excess) |
|---|---|---|---|
| **Nitrogen (N)** | < 20 mg/kg | **20 – 40 mg/kg** | > 40 mg/kg |
| **Phosphorus (P)** | < 15 mg/kg | **15 – 30 mg/kg** | > 30 mg/kg |
| **Potassium (K)** | < 120 mg/kg | **120 – 250 mg/kg** | > 250 mg/kg |
| **Soil pH** | < 6.0 | **6.0 – 7.5** | > 7.5 |
| **Soil Moisture** | < 15% | **15% – 45%** | > 45% |

### 4.3 Deviation Severity Calculation
- **Slight:** Within 10% deviation from the nearest threshold ($\le 10\%$).
- **Moderate:** 10% to 25% deviation ($10\% < \text{pct} \le 25\%$).
- **Severe:** Beyond 25% deviation ($> 25\%$).

### 4.4 Overall Soil Health Evaluation (Section 7.3)
- **`GOOD`:** All five values are within their optimal good ranges.
- **`FAIR`:** Exactly one value is outside good range, and it is **not severe**.
- **`POOR`:** Two or more values are outside good range, **OR any one value is severe**.

---

## 5. USER ROLES & ACCESS CONTROL

| Role | Permissions & Functional Scope | Default Demo Account |
|---|---|---|
| **Field Operator** | View assigned fields, submit soil samples, view own results, correct own samples within 7 days (creates new version). | `operator@leafline.ag`<br>PW: `Operator123456` |
| **Agronomist** | View assigned fields, review soil health, nutrient deficiency/excess flags, and field soil history. | `agronomist@leafline.ag`<br>PW: `Agronomist123456` |
| **Breeder / Researcher** | View anonymized soil history, filter by date and region. **NEVER sees farmer names, farm names, owner IDs, or exact coordinates.** | `researcher@leafline.ag`<br>PW: `Researcher123456` |
| **Farmer** | View soil health information for own registered fields only. | `farmer@leafline.ag`<br>PW: `Farmer123456` |
| **Administrator** | Approve/reject user registrations, assign fields, view audit logs, view system health. **CANNOT modify soil measurements.** | `admin@leafline.ag`<br>PW: `Admin123456` |

---

## 6. LOCAL DEVELOPMENT & EXECUTION GUIDE

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Docker & Docker Compose (optional for containerized run)

### 6.1 Backend Setup
```bash
cd leafline-soil-service

# Create virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run database migrations
alembic -c backend/alembic.ini upgrade head

# Seed initial demonstration data
python -m backend.database.seed.seed_data

# Start FastAPI backend (port 8000)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation available at: `http://localhost:8000/docs`

### 6.2 Frontend Setup
```bash
cd leafline-soil-service/frontend

# Install npm packages
npm install

# Start Vite dev server (port 3000)
npm run dev
```
Open browser at: `http://localhost:3000`

### 6.3 Run Backend Test Suite
```bash
cd leafline-soil-service
$env:PYTHONPATH = "leafline-soil-service" # Windows PowerShell
python -m pytest backend/tests -v
```

---

## 7. RUNNING WITH DOCKER COMPOSE

Run the entire multi-container service (Frontend/Nginx, Backend API, Background Worker):

```bash
cd leafline-soil-service

# Build and launch all containers
docker compose up -d --build

# Verify running containers
docker compose ps

# Check logs
docker compose logs -f backend
```
Access the application at `http://localhost`.

---

## 8. AWS CLOUD DEPLOYMENT GUIDE

For complete step-by-step instructions, see [deployment_guide.md](file:///deployment/aws/deployment_guide.md).

### Quick Summary:
1. **Provision AWS RDS MySQL 8.0**:
   - Private subnet, Multi-AZ, automated backups, KMS encrypted.
   - Run `deployment/aws/rds_setup.sql` to create restricted user `leafline_user`.
2. **Provision AWS EC2 Instance** (`t3.medium` Ubuntu 22.04 LTS):
   - Inbound ports: 80 (HTTP), 443 (HTTPS), 22 (SSH restricted).
   - Inbound Port 3306 on RDS allowed ONLY from EC2 Security Group.
3. **Configure Environment**:
   - Copy `.env.example` to `.env` and configure RDS endpoint and secret keys.
4. **Deploy Containers**:
   ```bash
   docker compose run --rm backend alembic -c backend/alembic.ini upgrade head
   docker compose up -d --build
   ```
5. **Verify Live Health**:
   ```bash
   curl http://<EC2-IP>/health
   ```

---

## 9. DATABASE BACKUP & RECOVERY (NS-NFR-05)

Automated backup script with retention and restore capabilities:

```bash
# Perform manual database backup
bash deployment/aws/backup_restore.sh backup

# Restore from a backup archive
bash deployment/aws/backup_restore.sh restore /var/backups/leafline_soil/leafline_soil_backup_20261026.sql.gz
```

---

## 10. REPOSITORY STRUCTURE

```
leafline-soil-service/
├── backend/
│   ├── api/                      # REST API Endpoints (sample, health, history, account, auth, mock_ai)
│   ├── modules/
│   │   ├── soil_data/            # Module 1: Validation, range rules, duplicate checks, corrections
│   │   ├── npk/                  # Module 2: Nitrogen, Phosphorus, Potassium rules
│   │   ├── ph_moisture/          # Module 3: pH and moisture rules
│   │   ├── soil_health/          # Module 4: Overall health score evaluation
│   │   ├── deficiency/           # Module 5: Severity distance calculation & AI merge
│   │   └── history/              # Module 6: Historical queries, paged filters, anonymizer
│   ├── worker/                   # Background Analysis Worker & AI Client
│   ├── shared/                   # Security, JWT tokens, RBAC dependencies, database session
│   ├── database/                 # SQLAlchemy models, seed data, Alembic migrations
│   ├── config/                   # Settings & configurable Sunflower starting limits
│   ├── tests/                    # Unit, boundary, severity, and API integration test suites
│   └── main.py                   # FastAPI main application & lifecycle
├── frontend/
│   ├── src/
│   │   ├── components/           # Logo, Navbar, Sidebar, Badges
│   │   ├── pages/                # Landing, Login, Register, Verify, Dashboard, Submit, Results, Deficiency, History, Correction, Researcher, Admin
│   │   ├── layouts/              # DashboardLayout
│   │   ├── services/             # Axios API client with interceptors
│   │   └── context/              # AuthContext provider
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── deployment/
│   ├── docker/                   # Production Dockerfiles (API, Worker, Frontend)
│   ├── nginx/                    # Nginx reverse proxy configuration
│   └── aws/                      # AWS Deployment Guide, RDS Setup SQL, Backup & Restore script
├── .github/workflows/
│   └── ci-cd.yml                 # Automated GitHub Actions testing & deployment pipeline
├── docker-compose.yml
├── .env.example
└── README.md
```
