-- =============================================
-- وحدة RTGS - جداول التسوية وربط التجار
-- =============================================

-- 1) جدول Mapping للمصارف (Settlement_Maps)
CREATE TABLE IF NOT EXISTS settlement_maps (
    id SERIAL PRIMARY KEY,
    inst_id VARCHAR(50) UNIQUE NOT NULL,
    system_key VARCHAR(255),
    display_name_ar VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlement_maps_inst_id ON settlement_maps(inst_id);

-- 2) جدول سجلات الاستيراد (ImportLogs)
CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(500),
    total_rows INTEGER DEFAULT 0,
    inserted_rows INTEGER DEFAULT 0,
    skipped_duplicates INTEGER DEFAULT 0,
    rejected_rows INTEGER DEFAULT 0,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at);

-- 3) جدول RTGS
CREATE TABLE IF NOT EXISTS rtgs (
    id BIGSERIAL PRIMARY KEY,
    -- أعمدة الملف
    rrn VARCHAR(100) NOT NULL,
    issuer VARCHAR(255),
    acquirer VARCHAR(255),
    message_type VARCHAR(100),
    tran_type INTEGER,
    transaction_date TIMESTAMP WITH TIME ZONE,
    sttl_date DATE,
    card_number_masked VARCHAR(20),
    curr VARCHAR(10),
    transaction_amount NUMERIC(18, 2),
    val VARCHAR(50),
    fee01 NUMERIC(18, 4),
    fee0075 NUMERIC(18, 4),
    fee0025 NUMERIC(18, 4),
    mer VARCHAR(100),
    terminal_type VARCHAR(50),
    auth_code VARCHAR(100),
    inst_id VARCHAR(100),
    inst_id2 VARCHAR(100),
    mcc INTEGER,
    incoming VARCHAR(255),
    type_of_tran VARCHAR(255),
    mer_name TEXT,
    -- أعمدة محسوبة
    amount NUMERIC(18, 2),
    fees NUMERIC(18, 2),
    acq NUMERIC(18, 2),
    sttle NUMERIC(18, 2),
    -- منع التكرار
    row_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rtgs_rrn ON rtgs(rrn);
CREATE INDEX IF NOT EXISTS idx_rtgs_sttl_date ON rtgs(sttl_date);
CREATE INDEX IF NOT EXISTS idx_rtgs_mer ON rtgs(mer);
CREATE INDEX IF NOT EXISTS idx_rtgs_mcc ON rtgs(mcc);
CREATE INDEX IF NOT EXISTS idx_rtgs_inst_id2 ON rtgs(inst_id2);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rtgs_row_hash ON rtgs(row_hash);
CREATE INDEX IF NOT EXISTS idx_rtgs_transaction_date ON rtgs(transaction_date);
CREATE INDEX IF NOT EXISTS idx_rtgs_amount ON rtgs(amount);

COMMENT ON TABLE rtgs IS 'حركات RTGS المستوردة من ملفات CSV';
COMMENT ON COLUMN rtgs.card_number_masked IS 'يخزن آخر 4 أرقام فقط للبطاقة';
COMMENT ON COLUMN rtgs.row_hash IS 'SHA-256 لمنع تكرار الحقن';
COMMENT ON COLUMN rtgs.amount IS 'قيمة الحركة الفعلية (موجب = تحصيل، سالب = تصحيح)';
COMMENT ON COLUMN rtgs.fees IS 'العمولة الكلية';
COMMENT ON COLUMN rtgs.acq IS 'عمولة المحصل';
COMMENT ON COLUMN rtgs.sttle IS 'التسوية الصافية = amount - fees';

-- 4) بيانات Mapping المصارف (Settlement_Maps)
INSERT INTO settlement_maps (inst_id, system_key, display_name_ar) VALUES
    ('1315', 'Al-Saqi_company', 'شركة الساقي'),
    ('1607', 'Saqi_Fuel_Stations', 'منتجات نفطية بغداد'),
    ('1611', 'Saqi_Fuel_Stat_Ind', 'الصناعي'),
    ('1627', 'Saqi_POS_RAF', 'الرافدين'),
    ('1647', 'Saqi_POS_RDB', 'الرشيد'),
    ('1664', 'Saqi_POS_TBI', 'العراقي للتجارة'),
    ('1667', 'Saqi_POS_Agri', 'الزراعي'),
    ('1681', 'Saqi_POS_IRIB', 'العراقي الاسلامي')
ON CONFLICT (inst_id) DO NOTHING;
