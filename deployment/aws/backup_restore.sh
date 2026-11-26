#!/bin/bash
# ==============================================================
# LEAFLINE NUTRIENT & SOIL SERVICE - BACKUP & RESTORE SCRIPT
# Specification: NS-NFR-05 (15-min RPO, 2-hour RTO)
# ==============================================================

set -e

# Configuration
BACKUP_DIR="/var/backups/leafline_soil"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/leafline_soil_backup_${TIMESTAMP}.sql.gz"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-leafline_soil}"
DB_USER="${DB_USER:-leafline_user}"
DB_PASSWORD="${DB_PASSWORD:-leafline_secure_pass_2026}"

mkdir -p "${BACKUP_DIR}"

backup() {
    echo "[INFO] Starting database backup for ${DB_NAME} at $(date)..."
    mysqldump \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --user="${DB_USER}" \
        --password="${DB_PASSWORD}" \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        "${DB_NAME}" | gzip > "${BACKUP_FILE}"
    
    echo "[SUCCESS] Backup completed successfully: ${BACKUP_FILE}"
    echo "[INFO] Size: $(du -h "${BACKUP_FILE}" | cut -f1)"

    # Keep only last 14 days of backups
    find "${BACKUP_DIR}" -type f -name "leafline_soil_backup_*.sql.gz" -mtime +14 -delete
}

restore() {
    TARGET_FILE="$1"
    if [ -z "${TARGET_FILE}" ]; then
        echo "[ERROR] Please provide the backup archive file path to restore."
        echo "Usage: $0 restore /path/to/backup.sql.gz"
        exit 1
    fi

    if [ ! -f "${TARGET_FILE}" ]; then
        echo "[ERROR] Backup file not found: ${TARGET_FILE}"
        exit 1
    fi

    echo "[WARNING] You are about to restore database ${DB_NAME} from ${TARGET_FILE}."
    echo "[WARNING] Existing database records will be replaced. Proceed? (y/n)"
    read -r CONFIRM
    if [ "${CONFIRM}" != "y" ]; then
        echo "[INFO] Restore aborted."
        exit 0
    fi

    echo "[INFO] Restoring database..."
    gunzip < "${TARGET_FILE}" | mysql \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --user="${DB_USER}" \
        --password="${DB_PASSWORD}" \
        "${DB_NAME}"

    echo "[SUCCESS] Database restored successfully from ${TARGET_FILE}."
}

case "$1" in
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    *)
        echo "Usage: $0 {backup|restore <file>}"
        exit 1
        ;;
esac
