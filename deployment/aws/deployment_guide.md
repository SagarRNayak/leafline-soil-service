# LEAFLINE NUTRIENT & SOIL SERVICE – AWS DEPLOYMENT GUIDE

This document provides complete instructions for deploying the **Nutrient & Soil Management Service (Service 2 of Leafline Platform)** on Amazon Web Services (AWS) using **AWS EC2** for containerized application hosting and **AWS RDS for MySQL** for the persistent relational database.

---

## 1. AWS CLOUD ARCHITECTURE OVERVIEW

```
  INTERNET (HTTPS :443)
           │
           ▼
┌────────────────────────────────────────────────────────┐
│  AWS Security Group: sg-leafline-app                   │
│  Inbound: 80 (HTTP), 443 (HTTPS), 22 (Restricted SSH)  │
│                                                        │
│  AWS EC2 Instance (t3.medium / t3.large, Ubuntu 22.04) │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Docker Compose Host                             │  │
│  │                                                  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  frontend Container (Nginx + React SPA)    │  │  │
│  │  │  Port 80/443 -> Reverse Proxies:           │  │  │
│  │  │   - /       -> React Vite SPA              │  │  │
│  │  │   - /api/   -> backend:8000                │  │  │
│  │  │   - /auth/  -> backend:8000                │  │  │
│  │  │   - /health -> backend:8000/health         │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                        │                         │  │
│  │  ┌─────────────────────┴──────────────────────┐  │  │
│  │  │  backend Container (FastAPI + Uvicorn)     │  │  │
│  │  │  3-Layer Architecture (API/Biz/Data)       │  │  │
│  │  └─────────────────────┬──────────────────────┘  │  │
│  │                        │                         │  │
│  │  ┌─────────────────────┴──────────────────────┐  │  │
│  │  │  worker Container (Background Soil AI)     │  │  │
│  │  │  DB Polling & Soil AI Analysis Merge       │  │  │
│  │  └─────────────────────┬──────────────────────┘  │  │
│  └────────────────────────┼─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ (Private VPC Subnet, Port 3306)
                            ▼
┌────────────────────────────────────────────────────────┐
│  AWS Security Group: sg-leafline-rds                   │
│  Inbound: 3306 ONLY from sg-leafline-app               │
│                                                        │
│  AWS RDS for MySQL 8.0 (Multi-AZ, KMS Encrypted)       │
│  Database: leafline_soil                               │
│  Restricted User: leafline_user                        │
└────────────────────────────────────────────────────────┘
```

---

## 2. STEP 1: PROVISION AWS RDS FOR MYSQL

1. Open **AWS Management Console** -> **RDS** -> **Create Database**.
2. Select **Standard Create** -> Engine: **MySQL** (version 8.0.x).
3. Template: **Production** (Multi-AZ for high availability) or **Dev/Test**.
4. Settings:
   - DB instance identifier: `leafline-soil-db`
   - Master username: `admin`
   - Master password: `[Generate strong 32-character password]` leaflinedatabasemasterpassword
5. Instance class: `db.t3.medium` or `db.m5.large`.
6. Storage:
   - 100 GiB GP3 SSD (Autoscaling enabled up to 500 GiB).
7. Connectivity & VPC:
   - **Public Access: NO** (Strictly kept in private subnet).
   - VPC Security Group: Create new -> `sg-leafline-rds`.
8. Additional Configuration:
   - Initial database name: `leafline_soil`
   - Enable automated backups (Retention: 7 to 30 days).
   - Enable encryption at rest using AWS KMS default key.
9. Note down the RDS Endpoint URL:
   `leafline-soil-db.cxxxxxxx.us-east-1.rds.amazonaws.com`

---

## 3. STEP 2: CONFIGURE AWS SECURITY GROUPS

### Application Security Group (`sg-leafline-app`):
- **Inbound Rules:**
  - `HTTP` (TCP 80): `0.0.0.0/0`
  - `HTTPS` (TCP 443): `0.0.0.0/0`
  - `SSH` (TCP 22): `Your-Office-Or-Bastion-IP/32`
- **Outbound Rules:**
  - All Traffic (`0.0.0.0/0`)

### Database Security Group (`sg-leafline-rds`):
- **Inbound Rules:**
  - `MySQL/Aurora` (TCP 3306): Source = `sg-leafline-app` (Restricted ONLY to EC2 app instances).
- **Outbound Rules:**
  - All Traffic (`0.0.0.0/0`)

---

## 4. STEP 3: CONFIGURE RESTRICTED DATABASE PRIVILEGES

Connect to the RDS MySQL instance from a host in the VPC and execute `deployment/aws/rds_setup.sql`:

```bash
mysql -h leafline-soil-db.cxxxxxxx.us-east-1.rds.amazonaws.com -u admin -p < deployment/aws/rds_setup.sql
```

This creates the restricted application user `leafline_user` and enforces:
- Revocation of `DELETE` and `DROP` privileges on `soil_sample`, `soil_measurement`, and `audit_log` per Section 13.

---

## 5. STEP 4: PROVISION AWS EC2 INSTANCE

1. Open **EC2** -> **Launch Instance**.
2. Name: `leafline-soil-service-prod`.
3. AMI: **Ubuntu Server 22.04 LTS (HVM)**, 64-bit (x86).
4. Instance Type: `t3.medium` (2 vCPU, 4 GiB RAM) or `t3.large`.
5. Key Pair: Select your SSH key pair.
6. Network settings:
   - Associate with the same VPC as your RDS instance.
   - Select Security Group: `sg-leafline-app`.
7. Storage: 30 GiB gp3 root volume.
8. Allocate an **Elastic IP (EIP)** and associate it with this EC2 instance.

---

## 6. STEP 5: INSTALL DOCKER & DOCKER COMPOSE ON EC2

SSH into your EC2 instance:

```bash
ssh -i your-key.pem ubuntu@<EC2-ELASTIC-IP>
```

Run installation commands:

```bash
# Update package lists
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker engine
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker service and add user
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 7. STEP 6: DEPLOY THE APPLICATION

1. Clone or copy your repository to the EC2 instance:

```bash
git clone https://github.com/your-org/leafline-soil-service.git
cd leafline-soil-service
```

2. Create production `.env` file from `.env.example`:

```bash
cp .env.example .env
nano .env
```

Ensure production values are configured:
```ini
ENVIRONMENT=production
MOCK_AUTH_MODE=false
DB_HOST=leafline-soil-db.cxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=leafline_soil
DB_USER=leafline_user
DB_PASSWORD=YourSecureRDSGeneratedPassword2026!
SECRET_KEY=yoursecurerandomproductionkey32chars
SOIL_AI_URL=http://soil-ai.leafline.internal:9002/internal/soil-analyze
```

3. Run Database Migrations via Alembic:

```bash
docker compose run --rm backend alembic -c backend/alembic.ini upgrade head
```

4. Build and start services using Docker Compose:

```bash
docker compose up -d --build
```

5. Verify running containers:

```bash
docker compose ps
docker compose logs -f backend
```

---

## 8. STEP 7: CONFIGURE HTTPS WITH CERTBOT (LETSENCRYPT)

To configure public SSL/TLS on port 443:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d soil.leafline.ag
```

Or configure custom certificates in Nginx by mounting your SSL certs to `/etc/nginx/ssl`.

---

## 9. STEP 8: HEALTH CHECK & PRODUCTION VALIDATION

Validate all service components:

```bash
# 1. Health check verification
curl -s http://localhost/health | jq .

# Expected output:
# {
#   "status": "healthy",
#   "service": "Leafline Nutrient & Soil Service",
#   "version": "1.0.0",
#   "database": "connected",
#   "ruleVersion": "SUNFLOWER_RULES_V1",
#   "environment": "production",
#   "workerStatus": "active"
# }

# 2. Test sample submission via API
curl -X POST http://localhost/api/v1/soil/soil-measurements \
  -H "Authorization: Bearer <VALID_OPERATOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fieldId": "fld_0412",
    "sampleDate": "2026-10-25",
    "depthCm": 20.0,
    "nitrogenMgKg": 28.0,
    "phosphorusMgKg": 22.0,
    "potassiumMgKg": 180.0,
    "ph": 6.8,
    "moisturePct": 30.0
  }'
```
