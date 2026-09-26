package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"

	"coal-governance-backend/config"
)

// DBWrapper wraps *sql.DB to automatically translate '?' placeholders to PostgreSQL '$1, $2...' format.
type DBWrapper struct {
	*sql.DB
}

// TxWrapper wraps *sql.Tx to automatically translate '?' placeholders to PostgreSQL '$1, $2...' format.
type TxWrapper struct {
	*sql.Tx
}

// DB is the shared, pooled PostgreSQL connection used across the application.
var DB *DBWrapper

// Rebind converts MySQL-style '?' placeholders to PostgreSQL '$1, $2, ...' placeholders,
// safely skipping string literals enclosed in single quotes.
func Rebind(query string) string {
	if !strings.Contains(query, "?") {
		return query
	}

	var b strings.Builder
	b.Grow(len(query) + 16)
	paramIdx := 1
	inString := false
	var stringChar rune

	runes := []rune(query)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		if inString {
			b.WriteRune(r)
			if r == stringChar {
				// Check for escaped quote like ''
				if i+1 < len(runes) && runes[i+1] == stringChar {
					b.WriteRune(runes[i+1])
					i++
				} else {
					inString = false
				}
			}
		} else {
			if r == '\'' || r == '"' {
				inString = true
				stringChar = r
				b.WriteRune(r)
			} else if r == '?' {
				b.WriteString(fmt.Sprintf("$%d", paramIdx))
				paramIdx++
			} else {
				b.WriteRune(r)
			}
		}
	}
	return b.String()
}

// Exec executes a query using PostgreSQL $n placeholders.
func (w *DBWrapper) Exec(query string, args ...interface{}) (sql.Result, error) {
	return w.DB.Exec(Rebind(query), args...)
}

// ExecContext executes a query using PostgreSQL $n placeholders with context.
func (w *DBWrapper) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	return w.DB.ExecContext(ctx, Rebind(query), args...)
}

// Query executes a query returning rows using PostgreSQL $n placeholders.
func (w *DBWrapper) Query(query string, args ...interface{}) (*sql.Rows, error) {
	return w.DB.Query(Rebind(query), args...)
}

// QueryContext executes a query returning rows using PostgreSQL $n placeholders with context.
func (w *DBWrapper) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	return w.DB.QueryContext(ctx, Rebind(query), args...)
}

// QueryRow executes a query returning a single row using PostgreSQL $n placeholders.
func (w *DBWrapper) QueryRow(query string, args ...interface{}) *sql.Row {
	return w.DB.QueryRow(Rebind(query), args...)
}

// QueryRowContext executes a query returning a single row using PostgreSQL $n placeholders with context.
func (w *DBWrapper) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	return w.DB.QueryRowContext(ctx, Rebind(query), args...)
}

// Begin begins a transaction wrapped in TxWrapper.
func (w *DBWrapper) Begin() (*TxWrapper, error) {
	tx, err := w.DB.Begin()
	if err != nil {
		return nil, err
	}
	return &TxWrapper{Tx: tx}, nil
}

// BeginTx begins a transaction wrapped in TxWrapper with context.
func (w *DBWrapper) BeginTx(ctx context.Context, opts *sql.TxOptions) (*TxWrapper, error) {
	tx, err := w.DB.BeginTx(ctx, opts)
	if err != nil {
		return nil, err
	}
	return &TxWrapper{Tx: tx}, nil
}

// InsertGetID executes an INSERT statement returning an int64 ID.
func (w *DBWrapper) InsertGetID(query string, args ...interface{}) (int64, error) {
	var id int64
	err := w.DB.QueryRow(Rebind(query), args...).Scan(&id)
	return id, err
}

// Exec executes a query in transaction using PostgreSQL $n placeholders.
func (t *TxWrapper) Exec(query string, args ...interface{}) (sql.Result, error) {
	return t.Tx.Exec(Rebind(query), args...)
}

// ExecContext executes a query in transaction using PostgreSQL $n placeholders with context.
func (t *TxWrapper) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	return t.Tx.ExecContext(ctx, Rebind(query), args...)
}

// Query executes a query in transaction returning rows using PostgreSQL $n placeholders.
func (t *TxWrapper) Query(query string, args ...interface{}) (*sql.Rows, error) {
	return t.Tx.Query(Rebind(query), args...)
}

// QueryContext executes a query in transaction returning rows using PostgreSQL $n placeholders with context.
func (t *TxWrapper) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	return t.Tx.QueryContext(ctx, Rebind(query), args...)
}

// QueryRow executes a query in transaction returning a single row using PostgreSQL $n placeholders.
func (t *TxWrapper) QueryRow(query string, args ...interface{}) *sql.Row {
	return t.Tx.QueryRow(Rebind(query), args...)
}

// QueryRowContext executes a query in transaction returning a single row using PostgreSQL $n placeholders with context.
func (t *TxWrapper) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	return t.Tx.QueryRowContext(ctx, Rebind(query), args...)
}

// InsertGetID executes an INSERT statement in transaction returning an int64 ID.
func (t *TxWrapper) InsertGetID(query string, args ...interface{}) (int64, error) {
	var id int64
	err := t.Tx.QueryRow(Rebind(query), args...).Scan(&id)
	return id, err
}

// Connect opens a connection pool to PostgreSQL (Neon / local) and verifies it with a ping.
func Connect(cfg *config.Config) {
	var connStr string
	if cfg.DatabaseURL != "" {
		connStr = cfg.DatabaseURL
	} else {
		connStr = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
			cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBSSLMode)
	}

	rawDB, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open PostgreSQL connection: %v", err)
	}

	rawDB.SetMaxOpenConns(25)
	rawDB.SetMaxIdleConns(10)
	rawDB.SetConnMaxLifetime(5 * time.Minute)

	if err = rawDB.Ping(); err != nil {
		log.Fatalf("Failed to ping PostgreSQL database: %v", err)
	}

	DB = &DBWrapper{DB: rawDB}
	log.Println("Connected to PostgreSQL database successfully.")
	RunMigrations()
}

// RunMigrations checks and creates required tables and columns.
func RunMigrations() {
	// 1. Check if core tables exist; if not, attempt to execute schema_pg.sql
	var tableExists bool
	_ = DB.QueryRow(`SELECT EXISTS (
		SELECT FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_name = 'users'
	)`).Scan(&tableExists)

	if !tableExists {
		log.Println("Core tables not detected. Looking for schema_pg.sql...")
		schemaPaths := []string{"../database/schema_pg.sql", "database/schema_pg.sql", "./schema_pg.sql"}
		for _, sp := range schemaPaths {
			if content, err := os.ReadFile(sp); err == nil {
				log.Printf("Executing PostgreSQL schema from %s...\n", sp)
				if _, err := DB.DB.Exec(string(content)); err != nil {
					log.Printf("Warning executing %s: %v\n", sp, err)
				} else {
					log.Println("PostgreSQL schema successfully initialized.")
					break
				}
			}
		}

		// Also try to seed if seed_pg.sql exists
		seedPaths := []string{"../database/seed_pg.sql", "database/seed_pg.sql", "./seed_pg.sql"}
		for _, sp := range seedPaths {
			if content, err := os.ReadFile(sp); err == nil {
				log.Printf("Seeding PostgreSQL data from %s...\n", sp)
				if _, err := DB.DB.Exec(string(content)); err != nil {
					log.Printf("Warning executing seed %s: %v\n", sp, err)
				} else {
					log.Println("PostgreSQL seed data successfully loaded.")
					break
				}
			}
		}
	}

	// 2. Ensure supplementary columns exist
	columns := []string{
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'PENDING_REVIEW'",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS mine_code VARCHAR(50) NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(100) NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS inspection_date DATE NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'COMPLIANT'",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS violation_details TEXT NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS risk_level VARCHAR(30) DEFAULT 'LOW'",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS corrective_action TEXT NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS due_date DATE NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS regulatory_reference VARCHAR(255) NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS ocr_data_json JSONB NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by INT NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by INT NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_by INT NULL",
		"ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NULL",
		"ALTER TABLE violations ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 1",
		"ALTER TABLE violations ADD COLUMN IF NOT EXISTS sla_hours INT DEFAULT 48",
		"ALTER TABLE violations ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NULL",
		"ALTER TABLE grievances ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 1",
		"ALTER TABLE grievances ADD COLUMN IF NOT EXISTS sla_hours INT DEFAULT 48",
		"ALTER TABLE grievances ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NULL",
		"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkin_lat DECIMAL(10,6) NULL",
		"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkin_lng DECIMAL(10,6) NULL",
		"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS distance_from_mine_m DECIMAL(8,2) NULL",
		"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_mock_location BOOLEAN DEFAULT FALSE",
		"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_uptime_ms BIGINT NULL",
		"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS client_reported_time TIMESTAMPTZ NULL",
		"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS tamper_flag BOOLEAN DEFAULT FALSE",
		"ALTER TABLE anomalies ADD COLUMN IF NOT EXISTS worker_id INT NULL",
		"ALTER TABLE inspections ADD COLUMN IF NOT EXISTS void_reason VARCHAR(255) NULL",
		"ALTER TABLE inspections ADD COLUMN IF NOT EXISTS voided_by INT NULL",
		"ALTER TABLE inspections ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ NULL",
		"ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS evidence_photo_path VARCHAR(255) NULL",
		"ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS resolution_gps_latitude DECIMAL(10,6) NULL",
		"ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS resolution_gps_longitude DECIMAL(10,6) NULL",
		"ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS resolution_notes TEXT NULL",
	}

	for _, stmt := range columns {
		_, _ = DB.DB.Exec(stmt) // Execute DDL directly on raw DB connection
	}

	tables := []string{
		`CREATE TABLE IF NOT EXISTS attendance_checkin_events (
			id                  BIGSERIAL PRIMARY KEY,
			mine_id             INT NOT NULL,
			worker_id           INT NOT NULL,
			lat                 DECIMAL(10,6) NOT NULL,
			lng                 DECIMAL(10,6) NOT NULL,
			distance_from_mine_m DECIMAL(8,2) NOT NULL,
			event_type          VARCHAR(20) DEFAULT 'CHECKIN',
			is_mock_location    BOOLEAN DEFAULT FALSE,
			device_uptime_ms    BIGINT NULL,
			client_reported_time TIMESTAMPTZ NULL,
			tamper_flag         BOOLEAN DEFAULT FALSE,
			liveness_passed     BOOLEAN DEFAULT TRUE,
			recorded_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (mine_id) REFERENCES mines(id) ON DELETE CASCADE,
			FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_events_worker_time ON attendance_checkin_events (worker_id, recorded_at)`,
		`CREATE INDEX IF NOT EXISTS idx_events_mine_time ON attendance_checkin_events (mine_id, recorded_at)`,
		`CREATE TABLE IF NOT EXISTS mine_zones (
			id          SERIAL PRIMARY KEY,
			mine_id     INT NOT NULL,
			zone_name   VARCHAR(100) NOT NULL,
			zone_type   VARCHAR(100),
			latitude    DECIMAL(10,6),
			longitude   DECIMAL(10,6),
			created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (mine_id) REFERENCES mines(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS mesh_nodes (
			id              SERIAL PRIMARY KEY,
			mine_id         INT NOT NULL,
			zone_id         INT NULL,
			node_name       VARCHAR(100) NOT NULL,
			hop_sequence    INT NOT NULL,
			battery_pct     DECIMAL(5,2) DEFAULT 100.00,
			status          VARCHAR(20) DEFAULT 'ONLINE',
			last_heartbeat  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (mine_id) REFERENCES mines(id) ON DELETE CASCADE,
			FOREIGN KEY (zone_id) REFERENCES mine_zones(id) ON DELETE SET NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_mesh_mine_hop ON mesh_nodes (mine_id, hop_sequence)`,
		`CREATE TABLE IF NOT EXISTS sos_relay_logs (
			id                  BIGSERIAL PRIMARY KEY,
			incident_id         INT NOT NULL,
			node_id             INT NOT NULL,
			hop_number          INT NOT NULL,
			latency_ms          INT NOT NULL,
			signal_strength_pct DECIMAL(5,2) NOT NULL,
			relayed_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
			FOREIGN KEY (node_id) REFERENCES mesh_nodes(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_relay_incident ON sos_relay_logs (incident_id)`,
	}

	for _, stmt := range tables {
		_, _ = DB.DB.Exec(stmt)
	}

	var meshCount int
	if err := DB.DB.QueryRow("SELECT COUNT(*) FROM mesh_nodes").Scan(&meshCount); err == nil && meshCount == 0 {
		_, _ = DB.DB.Exec(`
			INSERT INTO mine_zones (id, mine_id, zone_name, zone_type, latitude, longitude) VALUES
			(1, 1, 'Deep Seam Pit-4 / Sector B', 'UNDERGROUND_SEAM', 22.3595, 82.6892),
			(2, 1, 'Incline Haulage Roadway', 'INCLINE_HAULWAY', 22.3601, 82.6898),
			(3, 1, 'Central Ventilation Shaft', 'VENTILATION', 22.3608, 82.6905),
			(4, 2, 'Quarry Sector-3 Highwall', 'OPENCAST_FACE', 22.3167, 82.5833),
			(5, 10, 'Talcher Seam-1 Face', 'UNDERGROUND_SEAM', 20.9500, 85.2167)
			ON CONFLICT (id) DO NOTHING
		`)
		_, _ = DB.DB.Exec(`
			INSERT INTO mesh_nodes (mine_id, zone_id, node_name, hop_sequence, battery_pct, status) VALUES
			(1, 1, 'NODE-01-SEAM-FACE',    1, 98.50, 'ONLINE'),
			(1, 2, 'NODE-02-INCLINE-WAY',   2, 94.00, 'ONLINE'),
			(1, 1, 'NODE-03-HAULAGE-XING',  3, 89.20, 'ONLINE'),
			(1, 3, 'NODE-04-VENT-SHAFT',    4, 96.00, 'ONLINE'),
			(1, 2, 'NODE-05-PIT-ENTRY',     5, 99.00, 'ONLINE'),
			(1, 3, 'NODE-06-SURFACE-GW',    6, 100.00, 'ONLINE'),
			(2, 4, 'NODE-01-BENCH-FACE',    1, 97.00, 'ONLINE'),
			(2, 4, 'NODE-02-HAUL-RAMP',     2, 91.50, 'ONLINE'),
			(2, 4, 'NODE-03-CRUSHER-FEED',  3, 88.00, 'ONLINE'),
			(2, 4, 'NODE-04-SUB-STATION',   4, 95.50, 'ONLINE'),
			(2, 4, 'NODE-05-SECURITY-GATE', 5, 98.00, 'ONLINE'),
			(2, 4, 'NODE-06-SURFACE-GW',    6, 100.00, 'ONLINE'),
			(10, 5, 'NODE-01-WORKING-FACE', 1, 96.00, 'ONLINE'),
			(10, 5, 'NODE-02-HAULAGE-DRIFT',2, 92.00, 'ONLINE'),
			(10, 5, 'NODE-03-TRANSFER-POINT',3, 87.50, 'ONLINE'),
			(10, 5, 'NODE-04-SHAFT-BOTTOM', 4, 94.00, 'ONLINE'),
			(10, 5, 'NODE-05-PITHEAD-TOWER',5, 99.00, 'ONLINE'),
			(10, 5, 'NODE-06-SURFACE-GW',   6, 100.00, 'ONLINE')
		`)
	}

	log.Println("PostgreSQL schema migrations and mesh nodes verified.")
}
