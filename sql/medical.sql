-- ===============================================
-- COMPREHENSIVE MEDICAL RECORDS DATABASE SCHEMA
-- FOR HERDSENTRY APPLICATION
-- ===============================================

USE animals;

-- 1. MEDICAL EXAMINATIONS TABLE
-- Stores comprehensive medical examination records with unique tracking IDs
CREATE TABLE IF NOT EXISTS Medical_Exams (
    exam_id INT PRIMARY KEY AUTO_INCREMENT,
    unique_record_id VARCHAR(50) UNIQUE NOT NULL, -- Unique tracking ID for each exam (e.g., MED-2025-001)
    animal_id INT NOT NULL,
    exam_date DATETIME NOT NULL,
    veterinarian VARCHAR(200),
    exam_type ENUM('Routine', 'Emergency', 'Follow-up', 'Vaccination', 'Surgery', 'Other') DEFAULT 'Routine',
    
    -- Physical examination data
    weight_kg DECIMAL(6,2),
    temperature_c DECIMAL(4,2),
    heart_rate_bpm INT,
    respiratory_rate_rpm INT,
    blood_pressure VARCHAR(20),
    body_condition_score DECIMAL(2,1) CHECK (body_condition_score BETWEEN 1.0 AND 9.0),
    
    -- Clinical findings
    exam_notes TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    medications_prescribed TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    
    -- Record tracking
    exam_status ENUM('Active', 'Completed', 'Cancelled') DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(200),
    
    FOREIGN KEY (animal_id) REFERENCES Animals(animal_id) ON DELETE CASCADE,
    INDEX idx_animal_exam_date (animal_id, exam_date),
    INDEX idx_unique_record_id (unique_record_id),
    INDEX idx_exam_date (exam_date)
);

-- 2. DIAGNOSTIC TEST RESULTS TABLE
-- Stores importable diagnostic test results with comprehensive tracking
CREATE TABLE IF NOT EXISTS Diagnostic_Results (
    result_id INT PRIMARY KEY AUTO_INCREMENT,
    unique_record_id VARCHAR(50) UNIQUE NOT NULL, -- Unique tracking ID for each result (e.g., DIAG-2025-001)
    exam_id INT, -- Optional link to specific examination
    animal_id INT NOT NULL,
    
    -- Test information
    test_name VARCHAR(200) NOT NULL,
    test_category ENUM('Blood', 'Urine', 'Imaging', 'Microbiology', 'Pathology', 'Other') DEFAULT 'Other',
    test_date DATETIME NOT NULL,
    lab_name VARCHAR(200),
    test_method VARCHAR(200),
    
    -- Results data
    result_value TEXT NOT NULL,
    units VARCHAR(50),
    reference_range VARCHAR(100),
    abnormal_flag ENUM('Normal', 'High', 'Low', 'Critical', 'Abnormal') DEFAULT 'Normal',
    
    -- Additional information
    notes TEXT,
    interpretation TEXT,
    clinical_significance TEXT,
    
    -- Record tracking
    result_status ENUM('Pending', 'Final', 'Amended', 'Cancelled') DEFAULT 'Final',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    imported_by VARCHAR(200),
    
    FOREIGN KEY (animal_id) REFERENCES Animals(animal_id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES Medical_Exams(exam_id) ON DELETE SET NULL,
    INDEX idx_animal_test_date (animal_id, test_date),
    INDEX idx_unique_record_id (unique_record_id),
    INDEX idx_test_name (test_name),
    INDEX idx_test_date (test_date)
);

-- 3. MEDICAL FILES STORAGE TABLE
-- Stores uploaded medical files with comprehensive metadata and tracking
CREATE TABLE IF NOT EXISTS Medical_Files (
    file_id INT PRIMARY KEY AUTO_INCREMENT,
    unique_file_id VARCHAR(50) UNIQUE NOT NULL, -- Unique tracking ID for each file (e.g., FILE-2025-001)
    animal_id INT NOT NULL,
    exam_id INT, -- Optional link to examination
    result_id INT, -- Optional link to diagnostic result
    
    -- File information
    original_filename VARCHAR(255) NOT NULL,
    storage_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    file_category ENUM('X-Ray', 'Ultrasound', 'Photo', 'Document', 'Lab Report', 'Certificate', 'Other') DEFAULT 'Other',
    
    -- File metadata
    description TEXT,
    tags VARCHAR(500), -- Comma-separated tags for searchability
    notes TEXT,
    
    -- Access and tracking
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(200),
    access_level ENUM('Public', 'Restricted', 'Confidential') DEFAULT 'Restricted',
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (animal_id) REFERENCES Animals(animal_id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES Medical_Exams(exam_id) ON DELETE SET NULL,
    FOREIGN KEY (result_id) REFERENCES Diagnostic_Results(result_id) ON DELETE SET NULL,
    INDEX idx_animal_files (animal_id),
    INDEX idx_unique_file_id (unique_file_id),
    INDEX idx_file_category (file_category),
    INDEX idx_uploaded_date (uploaded_at)
);

-- 4. MEDICAL RECORD AUDIT LOG TABLE
-- Tracks all changes to medical records for compliance and tracking
CREATE TABLE IF NOT EXISTS Medical_Audit_Log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    record_type ENUM('Exam', 'Diagnostic', 'File') NOT NULL,
    record_id INT NOT NULL,
    unique_record_id VARCHAR(50) NOT NULL,
    action_type ENUM('Created', 'Updated', 'Deleted', 'Viewed', 'Downloaded') NOT NULL,
    
    -- Change details
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    
    -- Tracking information
    changed_by VARCHAR(200),
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    INDEX idx_record_type_id (record_type, record_id),
    INDEX idx_unique_record_id (unique_record_id),
    INDEX idx_changed_date (changed_at),
    INDEX idx_changed_by (changed_by)
);

-- 5. MEDICAL RECORD SEQUENCE TABLE
-- Manages unique ID generation for medical records
CREATE TABLE IF NOT EXISTS Medical_Record_Sequences (
    sequence_type VARCHAR(20) PRIMARY KEY,
    current_year INT NOT NULL,
    current_sequence INT NOT NULL DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_sequence (sequence_type, current_year)
);

-- Initialize sequence table with starting values
INSERT INTO Medical_Record_Sequences (sequence_type, current_year, current_sequence) 
VALUES 
('EXAM', YEAR(NOW()), 0),
('DIAG', YEAR(NOW()), 0),
('FILE', YEAR(NOW()), 0)
ON DUPLICATE KEY UPDATE sequence_type = sequence_type;

-- ===============================================
-- STORED PROCEDURES FOR MEDICAL RECORD MANAGEMENT
-- ===============================================

-- Procedure to generate unique record IDs
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS GenerateUniqueRecordId(
    IN record_type VARCHAR(20),
    OUT unique_id VARCHAR(50)
)
BEGIN
    DECLARE seq_num INT;
    DECLARE current_yr INT DEFAULT YEAR(NOW());
    
    -- Update sequence number
    INSERT INTO Medical_Record_Sequences (sequence_type, current_year, current_sequence)
    VALUES (record_type, current_yr, 1)
    ON DUPLICATE KEY UPDATE 
        current_sequence = CASE 
            WHEN current_year = current_yr THEN current_sequence + 1
            ELSE 1
        END,
        current_year = current_yr;
    
    -- Get the sequence number
    SELECT current_sequence INTO seq_num
    FROM Medical_Record_Sequences 
    WHERE sequence_type = record_type AND current_year = current_yr;
    
    -- Generate unique ID
    SET unique_id = CONCAT(record_type, '-', current_yr, '-', LPAD(seq_num, 3, '0'));
END //
DELIMITER ;

-- ===============================================
-- TRIGGERS FOR AUTOMATIC RECORD MANAGEMENT
-- ===============================================

-- Trigger to auto-generate unique IDs for medical exams
DELIMITER //
CREATE TRIGGER IF NOT EXISTS before_medical_exam_insert
BEFORE INSERT ON Medical_Exams
FOR EACH ROW
BEGIN
    DECLARE new_id VARCHAR(50);
    IF NEW.unique_record_id IS NULL OR NEW.unique_record_id = '' THEN
        CALL GenerateUniqueRecordId('EXAM', new_id);
        SET NEW.unique_record_id = new_id;
    END IF;
END //
DELIMITER ;

-- Trigger to auto-generate unique IDs for diagnostic results
DELIMITER //
CREATE TRIGGER IF NOT EXISTS before_diagnostic_result_insert
BEFORE INSERT ON Diagnostic_Results
FOR EACH ROW
BEGIN
    DECLARE new_id VARCHAR(50);
    IF NEW.unique_record_id IS NULL OR NEW.unique_record_id = '' THEN
        CALL GenerateUniqueRecordId('DIAG', new_id);
        SET NEW.unique_record_id = new_id;
    END IF;
END //
DELIMITER ;

-- Trigger to auto-generate unique IDs for medical files
DELIMITER //
CREATE TRIGGER IF NOT EXISTS before_medical_file_insert
BEFORE INSERT ON Medical_Files
FOR EACH ROW
BEGIN
    DECLARE new_id VARCHAR(50);
    IF NEW.unique_file_id IS NULL OR NEW.unique_file_id = '' THEN
        CALL GenerateUniqueRecordId('FILE', new_id);
        SET NEW.unique_file_id = new_id;
    END IF;
END //
DELIMITER ;

-- Trigger to log medical exam changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_medical_exam_insert
AFTER INSERT ON Medical_Exams
FOR EACH ROW
BEGIN
    INSERT INTO Medical_Audit_Log (
        record_type, record_id, unique_record_id, action_type, 
        changed_by, change_reason
    ) VALUES (
        'Exam', NEW.exam_id, NEW.unique_record_id, 'Created',
        COALESCE(NEW.created_by, 'System'), 'New medical examination record created'
    );
END //
DELIMITER ;

-- ===============================================
-- VIEWS FOR EASY DATA ACCESS
-- ===============================================

-- Comprehensive view of medical records per animal
CREATE OR REPLACE VIEW Animal_Medical_Summary AS
SELECT 
    a.animal_id,
    a.animal_name,
    s.species_name,
    COUNT(DISTINCT me.exam_id) as total_exams,
    COUNT(DISTINCT dr.result_id) as total_diagnostic_results,
    COUNT(DISTINCT mf.file_id) as total_files,
    MAX(me.exam_date) as last_exam_date,
    MAX(dr.test_date) as last_test_date,
    MAX(mf.uploaded_at) as last_file_upload
FROM Animals a
LEFT JOIN Species s ON a.species_id = s.species_id
LEFT JOIN Medical_Exams me ON a.animal_id = me.animal_id
LEFT JOIN Diagnostic_Results dr ON a.animal_id = dr.animal_id
LEFT JOIN Medical_Files mf ON a.animal_id = mf.animal_id
GROUP BY a.animal_id, a.animal_name, s.species_name;

-- Recent medical activity view
CREATE OR REPLACE VIEW Recent_Medical_Activity AS
SELECT 
    'Exam' as record_type,
    me.unique_record_id,
    a.animal_name,
    me.exam_date as activity_date,
    me.exam_type as description,
    me.veterinarian as performed_by
FROM Medical_Exams me
JOIN Animals a ON me.animal_id = a.animal_id
WHERE me.exam_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)

UNION ALL

SELECT 
    'Diagnostic' as record_type,
    dr.unique_record_id,
    a.animal_name,
    dr.test_date as activity_date,
    dr.test_name as description,
    dr.imported_by as performed_by
FROM Diagnostic_Results dr
JOIN Animals a ON dr.animal_id = a.animal_id
WHERE dr.test_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)

UNION ALL

SELECT 
    'File' as record_type,
    mf.unique_file_id,
    a.animal_name,
    mf.uploaded_at as activity_date,
    CONCAT(mf.file_category, ': ', mf.original_filename) as description,
    mf.uploaded_by as performed_by
FROM Medical_Files mf
JOIN Animals a ON mf.animal_id = a.animal_id
WHERE mf.uploaded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)

ORDER BY activity_date DESC;
