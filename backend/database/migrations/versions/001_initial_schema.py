"""Initial Leafline Nutrient and Soil schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-26 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. soil_sample
    op.create_table(
        "soil_sample",
        sa.Column("id", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("supersedes_id", sa.String(64), nullable=True),
        sa.Column("field_id", sa.String(64), nullable=False),
        sa.Column("owner_user_id", sa.String(64), nullable=False),
        sa.Column("sample_date", sa.Date(), nullable=False),
        sa.Column("depth_cm", sa.Float(), nullable=False),
        sa.Column("lab_reference", sa.String(40), nullable=True),
        sa.Column("state", sa.String(32), nullable=False, server_default="RECEIVED"),
        sa.Column("is_current", sa.Boolean(), server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id", "version")
    )
    op.create_index("ix_soil_sample_field_id", "soil_sample", ["field_id"])
    op.create_index("ix_soil_sample_owner_user_id", "soil_sample", ["owner_user_id"])
    op.create_index("ix_field_date_depth_current", "soil_sample", ["field_id", "sample_date", "depth_cm", "is_current"])

    # 2. soil_measurement
    op.create_table(
        "soil_measurement",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sample_id", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("nitrogen_mg_kg", sa.Float(), nullable=False),
        sa.Column("phosphorus_mg_kg", sa.Float(), nullable=False),
        sa.Column("potassium_mg_kg", sa.Float(), nullable=False),
        sa.Column("ph", sa.Float(), nullable=False),
        sa.Column("moisture_pct", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_soil_measurement_sample_id", "soil_measurement", ["sample_id"])

    # 3. analysis_job
    op.create_table(
        "analysis_job",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sample_id", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("job_status", sa.String(32), nullable=False, server_default="QUEUED"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_by", sa.String(64), nullable=True),
        sa.Column("locked_until", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_analysis_job_sample_id", "analysis_job", ["sample_id"])
    op.create_index("ix_analysis_job_job_status", "analysis_job", ["job_status"])

    # 4. soil_health_result
    op.create_table(
        "soil_health_result",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sample_id", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("health_status", sa.String(16), nullable=False),
        sa.Column("rule_version", sa.String(32), nullable=False),
        sa.Column("model_version", sa.String(64), nullable=True),
        sa.Column("analysed_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_soil_health_result_sample_id", "soil_health_result", ["sample_id"])

    # 5. nutrient_flag
    op.create_table(
        "nutrient_flag",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sample_id", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("nutrient", sa.String(32), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("severity", sa.String(16), nullable=True),
        sa.Column("rule_flag", sa.String(16), nullable=False),
        sa.Column("ai_flag", sa.String(16), nullable=True),
        sa.Column("ai_score", sa.Float(), nullable=True),
        sa.Column("model_version", sa.String(64), nullable=True),
        sa.Column("disagreement", sa.Boolean(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_nutrient_flag_sample_id", "nutrient_flag", ["sample_id"])

    # 6. account_link
    op.create_table(
        "account_link",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(64), nullable=False),
        sa.Column("field_id", sa.String(64), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("granted_by", sa.String(64), nullable=False),
        sa.Column("granted_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_account_link_user_id", "account_link", ["user_id"])
    op.create_index("ix_account_link_field_id", "account_link", ["field_id"])

    # 7. soil_ref_map
    op.create_table(
        "soil_ref_map",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("made_up_code", sa.String(32), unique=True, nullable=False),
        sa.Column("field_id", sa.String(64), unique=True, nullable=False),
        sa.Column("region", sa.String(64), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_soil_ref_map_made_up_code", "soil_ref_map", ["made_up_code"])
    op.create_index("ix_soil_ref_map_field_id", "soil_ref_map", ["field_id"])

    # 8. audit_log
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("actor_user_id", sa.String(64), nullable=False),
        sa.Column("actor_role", sa.String(32), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("target_id", sa.String(64), nullable=True),
        sa.Column("outcome", sa.String(16), nullable=False),
        sa.Column("details", sa.String(255), nullable=True),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_audit_log_occurred_at", "audit_log", ["occurred_at"])

    # 9. users (Identity adapter)
    op.create_table(
        "users",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(128), unique=True, nullable=False),
        sa.Column("full_name", sa.String(128), nullable=False),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("organisation", sa.String(128), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_verified", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("is_approved", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("verification_token", sa.String(128), nullable=True),
        sa.Column("reset_token", sa.String(128), nullable=True),
        sa.Column("reset_token_expires", sa.DateTime(), nullable=True),
        sa.Column("failed_login_attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("locked_until", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False)
    )

    # 10. refresh_tokens
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token", sa.String(255), unique=True, nullable=False),
        sa.Column("user_id", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )

def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    op.drop_table("audit_log")
    op.drop_table("soil_ref_map")
    op.drop_table("account_link")
    op.drop_table("nutrient_flag")
    op.drop_table("soil_health_result")
    op.drop_table("analysis_job")
    op.drop_table("soil_measurement")
    op.drop_table("soil_sample")
