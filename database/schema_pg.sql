-- =====================================================================
-- AI-Based Smart Governance and Compliance Monitoring System
-- Coal India Limited / Ministry of Coal - SIH 2026
-- Database Schema (PostgreSQL 16+ / Neon DB Compatible)
-- =====================================================================

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id            SERIAL PRIMARY KEY,
    role_key      VARCHAR(50) NOT NULL UNIQUE,
    role_name     VARCHAR(100) NOT NULL,
    description   VARCHAR(255),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SUBSIDIARIES
CREATE TABLE IF NOT EXISTS subsidiaries (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    code          VARCHAR(20) NOT NULL UNIQUE,
    headquarters  VARCHAR(150),
    status        VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INT NOT NULL REFERENCES roles(id),
    subsidiary_id   INT NULL REFERENCES subsidiaries(id),
    phone           VARCHAR(20),
    status          VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
    last_login_at   TIMESTAMP NULL,
    created_by      INT NULL,
    updated_by      INT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- 4. MINES
CREATE TABLE IF NOT EXISTS mines (
    id                  SERIAL PRIMARY KEY,
    mine_name           VARCHAR(150) NOT NULL,
    mine_code           VARCHAR(30) NOT NULL UNIQUE,
    subsidiary_id       INT NOT NULL REFERENCES subsidiaries(id),
    state               VARCHAR(100),
    district            VARCHAR(100),
    latitude            NUMERIC(10,6),
    longitude           NUMERIC(10,6),
    mine_type           VARCHAR(30) DEFAULT 'OPENCAST' CHECK (mine_type IN ('OPENCAST','UNDERGROUND','MIXED')),
    production_capacity NUMERIC(12,2),
    manager_id          INT NULL REFERENCES users(id),
    status              VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','UNDER_MAINTENANCE')),
    created_by          INT NULL,
    updated_by          INT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mines_subsidiary ON mines(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_mines_status ON mines(status);

-- 5. MINE ZONES
CREATE TABLE IF NOT EXISTS mine_zones (
    id          SERIAL PRIMARY KEY,
    mine_id     INT NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
    zone_name   VARCHAR(100) NOT NULL,
    zone_type   VARCHAR(100),
    latitude    NUMERIC(10,6),
    longitude   NUMERIC(10,6),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id            SERIAL PRIMARY KEY,
    mine_id       INT NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
    dept_name     VARCHAR(100) NOT NULL,
    dept_head_id  INT NULL REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. CONTRACTORS
CREATE TABLE IF NOT EXISTS contractors (
    id               SERIAL PRIMARY KEY,
    mine_id          INT NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
    company_name     VARCHAR(150) NOT NULL,
    contact_person   VARCHAR(150),
    phone            VARCHAR(20),
    email            VARCHAR(150),
    contract_type    VARCHAR(100),
    contract_start   DATE,
    contract_end     DATE,
    status           VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','BLACKLISTED')),
    blacklist_reason TEXT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. WORKERS
CREATE TABLE IF NOT EXISTS workers (
    id              SERIAL PRIMARY KEY,
    mine_id         INT NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
    worker_code     VARCHAR(30) NOT NULL UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    designation     VARCHAR(100),
    department_id   INT NULL REFERENCES departments(id),
    contractor_id   INT NULL REFERENCES contractors(id),
    status          VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. COMPLIANCE CATEGORIES
CREATE TABLE IF NOT EXISTS compliance_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- 10. COMPLIANCE RULES
CREATE TABLE IF NOT EXISTS compliance_rules (
    id                  SERIAL PRIMARY KEY,
    rule_code           VARCHAR(30) NOT NULL UNIQUE,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    category_id         INT NOT NULL REFERENCES compliance_categories(id),
    applicable_mine_id  INT NULL REFERENCES mines(id),
    frequency           VARCHAR(30) DEFAULT 'MONTHLY' CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL','ONE_TIME')),
    severity            VARCHAR(30) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    responsible_dept    VARCHAR(100),
    due_period_days     INT DEFAULT 30,
    status              VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_by          INT NULL,
    updated_by          INT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. INSPECTIONS
CREATE TABLE IF NOT EXISTS inspections (
    id                  SERIAL PRIMARY KEY,
    mine_id             INT NOT NULL REFERENCES mines(id),
    inspection_type     VARCHAR(100),
    inspector_id        INT NOT NULL REFERENCES users(id),
    inspection_date     DATE NOT NULL,
    inspection_time     TIME,
    gps_latitude        NUMERIC(10,6),
    gps_longitude       NUMERIC(10,6),
    remarks             TEXT,
    status              VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','REVIEWED','APPROVED','VOIDED')),
    void_reason         VARCHAR(255) NULL,
    voided_by           INT NULL REFERENCES users(id),
    voided_at           TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inspections_mine ON inspections(mine_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);

-- 12. INSPECTION ITEMS
CREATE TABLE IF NOT EXISTS inspection_items (
    id              SERIAL PRIMARY KEY,
    inspection_id   INT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    checklist_item  VARCHAR(255) NOT NULL,
    result          VARCHAR(20) DEFAULT 'NA' CHECK (result IN ('PASS','FAIL','NA')),
    remarks         VARCHAR(255)
);

-- 13. OBSERVATIONS
CREATE TABLE IF NOT EXISTS observations (
    id              SERIAL PRIMARY KEY,
    inspection_id   INT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    category_id     INT NULL REFERENCES compliance_categories(id),
    observation     TEXT NULL,
    severity        VARCHAR(30) DEFAULT 'LOW' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    evidence_path   VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. VIOLATIONS
CREATE TABLE IF NOT EXISTS violations (
    id                  SERIAL PRIMARY KEY,
    violation_code      VARCHAR(30) NOT NULL UNIQUE,
    mine_id             INT NOT NULL REFERENCES mines(id),
    inspection_id       INT NULL REFERENCES inspections(id),
    category_id         INT NOT NULL REFERENCES compliance_categories(id),
    description         TEXT NOT NULL,
    severity            VARCHAR(30) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    evidence_path       VARCHAR(255),
    reported_by         INT NOT NULL REFERENCES users(id),
    responsible_person  INT NULL REFERENCES users(id),
    deadline            DATE,
    status              VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','VERIFIED','CLOSED','OVERDUE','DISMISSED')),
    escalation_level    INT DEFAULT 1,
    sla_hours           INT DEFAULT 48,
    escalated_at        TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_violations_mine ON violations(mine_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);

-- 15. CORRECTIVE ACTIONS
CREATE TABLE IF NOT EXISTS corrective_actions (
    id                       SERIAL PRIMARY KEY,
    violation_id             INT NOT NULL REFERENCES violations(id),
    assigned_to              INT NOT NULL REFERENCES users(id),
    action_description       TEXT NOT NULL,
    deadline                 DATE NOT NULL,
    submitted_at             TIMESTAMP NULL,
    verified_by              INT NULL REFERENCES users(id),
    verified_at              TIMESTAMP NULL,
    escalation_level         INT DEFAULT 0,
    status                   VARCHAR(30) DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','SUBMITTED','VERIFIED','CLOSED','OVERDUE')),
    evidence_photo_path      VARCHAR(255) NULL,
    resolution_gps_latitude   NUMERIC(10,6) NULL,
    resolution_gps_longitude  NUMERIC(10,6) NULL,
    resolution_notes         TEXT NULL,
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. INCIDENTS
CREATE TABLE IF NOT EXISTS incidents (
    id              SERIAL PRIMARY KEY,
    mine_id         INT NOT NULL REFERENCES mines(id),
    incident_type   VARCHAR(100),
    description     TEXT,
    severity        VARCHAR(30) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    reported_by     INT NOT NULL REFERENCES users(id),
    incident_date   TIMESTAMP NOT NULL,
    status          VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_REVIEW','CLOSED')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. OPERATIONAL DATA
CREATE TABLE IF NOT EXISTS operational_data (
    id                   BIGSERIAL PRIMARY KEY,
    mine_id              INT NOT NULL REFERENCES mines(id),
    record_date          DATE NOT NULL,
    production_tonnes    NUMERIC(12,2),
    expected_production  NUMERIC(12,2),
    equipment_health_pct NUMERIC(5,2),
    attendance_pct       NUMERIC(5,2),
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_opdata_mine_date ON operational_data(mine_id, record_date);

-- 18. ENVIRONMENTAL DATA
CREATE TABLE IF NOT EXISTS environmental_data (
    id                  BIGSERIAL PRIMARY KEY,
    mine_id             INT NOT NULL REFERENCES mines(id),
    record_date         DATE NOT NULL,
    aqi                 NUMERIC(6,2),
    water_quality_index NUMERIC(6,2),
    noise_level_db      NUMERIC(6,2),
    dust_level          NUMERIC(6,2),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
    id                   BIGSERIAL PRIMARY KEY,
    mine_id              INT NOT NULL REFERENCES mines(id),
    worker_id            INT NULL REFERENCES workers(id),
    record_date          DATE NOT NULL,
    status               VARCHAR(30) DEFAULT 'PRESENT' CHECK (status IN ('PRESENT','ABSENT','LEAVE','HALF_DAY')),
    shift                VARCHAR(20) DEFAULT 'GENERAL',
    overtime_hours       NUMERIC(4,2) DEFAULT 0.00,
    present_count        INT NULL,
    total_count          INT NULL,
    marked_by            INT NULL REFERENCES users(id),
    checkin_lat          NUMERIC(10,6) NULL,
    checkin_lng          NUMERIC(10,6) NULL,
    distance_from_mine_m NUMERIC(8,2) NULL,
    is_mock_location     BOOLEAN DEFAULT FALSE,
    device_uptime_ms     BIGINT NULL,
    client_reported_time TIMESTAMP NULL,
    tamper_flag          BOOLEAN DEFAULT FALSE,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_worker_date UNIQUE (mine_id, worker_id, record_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_mine_date ON attendance(mine_id, record_date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance(worker_id);

-- 19b. ATTENDANCE CHECKIN EVENTS (Append-only telemetry log)
CREATE TABLE IF NOT EXISTS attendance_checkin_events (
    id                   BIGSERIAL PRIMARY KEY,
    mine_id              INT NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
    worker_id            INT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    lat                  NUMERIC(10,6) NOT NULL,
    lng                  NUMERIC(10,6) NOT NULL,
    distance_from_mine_m NUMERIC(8,2) NOT NULL,
    event_type           VARCHAR(20) DEFAULT 'CHECKIN' CHECK (event_type IN ('CHECKIN','CHECKOUT')),
    is_mock_location     BOOLEAN DEFAULT FALSE,
    device_uptime_ms     BIGINT NULL,
    client_reported_time TIMESTAMP NULL,
    tamper_flag          BOOLEAN DEFAULT FALSE,
    liveness_passed      BOOLEAN DEFAULT TRUE,
    recorded_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_worker_time ON attendance_checkin_events(worker_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_events_mine_time ON attendance_checkin_events(mine_id, recorded_at);

-- 20. DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id                   SERIAL PRIMARY KEY,
    mine_id              INT NULL REFERENCES mines(id),
    contractor_id        INT NULL REFERENCES contractors(id),
    document_type        VARCHAR(100),
    file_path            VARCHAR(255) NOT NULL,
    certificate_number   VARCHAR(100),
    issue_date           DATE,
    expiry_date          DATE,
    ocr_raw_text         TEXT,
    mine_code            VARCHAR(50) NULL,
    inspector_name       VARCHAR(100) NULL,
    inspection_date      DATE NULL,
    compliance_status    VARCHAR(50) DEFAULT 'COMPLIANT',
    violation_details    TEXT NULL,
    risk_level           VARCHAR(30) DEFAULT 'LOW',
    corrective_action    TEXT NULL,
    due_date             DATE NULL,
    regulatory_reference VARCHAR(255) NULL,
    ocr_data_json        JSONB NULL,
    workflow_status      VARCHAR(50) DEFAULT 'PENDING_REVIEW',
    uploaded_by          INT NOT NULL REFERENCES users(id),
    reviewed_by          INT NULL REFERENCES users(id),
    reviewed_at          TIMESTAMP NULL,
    approved_by          INT NULL REFERENCES users(id),
    approved_at          TIMESTAMP NULL,
    verified_by          INT NULL REFERENCES users(id),
    verified_at          TIMESTAMP NULL,
    status               VARCHAR(30) DEFAULT 'VALID' CHECK (status IN ('VALID','EXPIRING_SOON','EXPIRED')),
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_contractor ON documents(contractor_id);

-- 21. RISK SCORES
CREATE TABLE IF NOT EXISTS risk_scores (
    id             BIGSERIAL PRIMARY KEY,
    mine_id        INT NOT NULL REFERENCES mines(id),
    score          NUMERIC(5,2) NOT NULL,
    classification VARCHAR(30) NOT NULL CHECK (classification IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    factors_json   JSONB,
    computed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_risk_mine ON risk_scores(mine_id);

-- 22. ANOMALIES
CREATE TABLE IF NOT EXISTS anomalies (
    id             BIGSERIAL PRIMARY KEY,
    mine_id        INT NOT NULL REFERENCES mines(id),
    worker_id      INT NULL REFERENCES workers(id) ON DELETE SET NULL,
    anomaly_type   VARCHAR(100),
    description    TEXT,
    detected_value NUMERIC(12,2),
    expected_value NUMERIC(12,2),
    severity       VARCHAR(30) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status         VARCHAR(30) DEFAULT 'NEW' CHECK (status IN ('NEW','ACKNOWLEDGED','RESOLVED')),
    detected_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_anomalies_worker ON anomalies(worker_id);

-- 23. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id           BIGSERIAL PRIMARY KEY,
    recipient_id INT NOT NULL REFERENCES users(id),
    title        VARCHAR(200) NOT NULL,
    message      TEXT NOT NULL,
    severity     VARCHAR(30) DEFAULT 'INFO' CHECK (severity IN ('INFO','WARNING','CRITICAL')),
    type         VARCHAR(50),
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, is_read);

-- 24. AUDIT LOGS (Hash-chained for tamper evidence)
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INT NULL REFERENCES users(id),
    action     VARCHAR(100) NOT NULL,
    module     VARCHAR(100),
    record_id  VARCHAR(50),
    details    JSONB,
    ip_address VARCHAR(50),
    prev_hash  VARCHAR(64) NULL,
    hash       VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 25. GRIEVANCES
CREATE TABLE IF NOT EXISTS grievances (
    id               SERIAL PRIMARY KEY,
    worker_id        INT NULL REFERENCES workers(id) ON DELETE SET NULL,
    mine_id          INT NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
    category         VARCHAR(100) NOT NULL,
    description      TEXT NOT NULL,
    status           VARCHAR(30) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','IN_REVIEW','RESOLVED','ESCALATED','CLOSED')),
    assigned_to      INT NULL REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT NULL,
    escalation_level INT DEFAULT 1,
    sla_hours        INT DEFAULT 48,
    escalated_at     TIMESTAMP NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_grievances_mine ON grievances(mine_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);

-- 26. REPORTS
CREATE TABLE IF NOT EXISTS reports (
    id              SERIAL PRIMARY KEY,
    report_type     VARCHAR(100) NOT NULL,
    generated_by    INT NOT NULL REFERENCES users(id),
    mine_id         INT NULL REFERENCES mines(id),
    file_path       VARCHAR(255),
    format          VARCHAR(20) DEFAULT 'PDF' CHECK (format IN ('PDF','CSV')),
    parameters_json JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. AI INSPECTION ANALYSES
CREATE TABLE IF NOT EXISTS ai_inspection_analyses (
    id                 SERIAL PRIMARY KEY,
    inspection_id      INT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    category           VARCHAR(100),
    severity           VARCHAR(30) DEFAULT 'LOW' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    risk_level         VARCHAR(30) DEFAULT 'LOW' CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    risk_score         INT NOT NULL,
    summary            TEXT,
    reasoning          TEXT,
    recommended_action TEXT,
    recurring_issue    BOOLEAN DEFAULT FALSE,
    urgency            VARCHAR(50),
    confidence         NUMERIC(5,2),
    model_name         VARCHAR(100),
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 28. UNDERGROUND MESH TELEMETRY NODES
CREATE TABLE IF NOT EXISTS mesh_nodes (
    id             SERIAL PRIMARY KEY,
    mine_id        INT NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
    zone_id        INT NULL REFERENCES mine_zones(id) ON DELETE SET NULL,
    node_name      VARCHAR(100) NOT NULL,
    hop_sequence   INT NOT NULL,
    battery_pct    NUMERIC(5,2) DEFAULT 100.00,
    status         VARCHAR(20) DEFAULT 'ONLINE' CHECK (status IN ('ONLINE','OFFLINE')),
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mesh_mine_hop ON mesh_nodes(mine_id, hop_sequence);

-- 29. SOS RELAY LOGS
CREATE TABLE IF NOT EXISTS sos_relay_logs (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         INT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    node_id             INT NOT NULL REFERENCES mesh_nodes(id) ON DELETE CASCADE,
    hop_number          INT NOT NULL,
    latency_ms          INT NOT NULL,
    signal_strength_pct NUMERIC(5,2) NOT NULL,
    relayed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_relay_incident ON sos_relay_logs(incident_id);
