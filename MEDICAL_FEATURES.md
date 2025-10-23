# Medical Records & File Upload Features

## Overview
This document describes the newly implemented medical records database schema and file upload functionality for the HerdSentry application, fulfilling user stories S01, S02, and S03.

## Database Schema

### Medical_Files Table
A new table has been added to store uploaded medical files linked to animals, exams, or diagnostic results:

```sql
CREATE TABLE IF NOT EXISTS Medical_Files (
    file_id INT PRIMARY KEY AUTO_INCREMENT,
    animal_id INT NOT NULL,
    exam_id INT, -- optional link to Medical_Exams
    result_id INT, -- optional link to Diagnostic_Results
    original_filename VARCHAR(255) NOT NULL,
    storage_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(200),
    notes TEXT,
    FOREIGN KEY (animal_id) REFERENCES Animals(animal_id),
    FOREIGN KEY (exam_id) REFERENCES Medical_Exams(exam_id),
    FOREIGN KEY (result_id) REFERENCES Diagnostic_Results(result_id)
);
```

### Existing Medical Tables (Enhanced)
- `Medical_Exams`: Stores medical examination records with timestamp and unique exam ID
- `Diagnostic_Results`: Stores diagnostic test results with timestamp and unique result ID

## API Endpoints

### File Upload
**POST /api/animals/:id/medical/files**
- Upload medical files (images, PDFs, documents) for a specific animal
- Supports multiple file uploads (up to 10 files, 10MB each)
- Optional parameters: `exam_id`, `result_id`, `uploaded_by`, `notes`
- Returns file IDs and metadata

**Request Example:**
```javascript
const formData = new FormData();
formData.append('files', fileInput.files[0]);
formData.append('exam_id', '123');
formData.append('uploaded_by', 'Dr. Smith');
formData.append('notes', 'X-ray results');

fetch('/api/animals/1/medical/files', {
    method: 'POST',
    body: formData
});
```

### File Management
**GET /api/animals/:id/medical/files**
- Retrieve all medical files for a specific animal
- Returns file metadata with associated exam/result information

**GET /api/medical/files/:fileId/download**
- Download a specific medical file
- Streams file with appropriate headers for download

### Medical Record Retrieval (S03 Requirement)
**GET /api/medical/exams/:examId**
- Retrieve specific medical exam by unique exam ID
- Returns exam details and associated files
- Supports S03 Acceptance Criteria 2: "Given that the animal scientist enters record ID, when retrieving the medical records, then the system will query the record databases and return the data that record ID matches to user input"

**GET /api/medical/results/:resultId**
- Retrieve specific diagnostic result by unique result ID
- Returns result details and associated files

### Existing Medical Endpoints (Enhanced for S03)
**GET /api/animals/:id/medical**
- Fetch all exams and diagnostic results for an animal
- Enhanced to support comprehensive health tracking (S01)

**POST /api/animals/:id/medical**
- Add new medical examination
- Automatically timestamps and creates unique record ID (S03 Acceptance Criteria 1)

**POST /api/animals/:id/medical/import**
- Import diagnostic test results in batch
- Supports maintaining comprehensive health records (S03)

## File Upload Configuration

### Supported File Types
- Images: JPEG, PNG, GIF, BMP
- Documents: PDF, Word (.doc, .docx)
- Text: Plain text, CSV

### File Storage
- Files stored in `uploads/medical/` directory
- Unique filename generation: `timestamp-originalname.ext`
- File size limit: 10MB per file
- Maximum 10 files per upload request

### Security Features
- File type validation
- File size limits
- Unique storage filenames to prevent conflicts
- Database transaction cleanup on upload errors

## User Story Fulfillment

### S01: Animal Registration & Profiles ✅
- **Requirement**: Register new animals and create individual profiles for comprehensive health tracking
- **Implementation**: Enhanced existing animal registration with medical records integration
- **API**: POST /api/animals (existing), enhanced with medical record linking

### S02: Data Updates & Edit Dashboard ✅
- **Requirement**: Insert and update animal data with edit dashboard
- **Implementation**: Existing animal update endpoints support data modification
- **API**: Various update endpoints for animals, medical records, and file management

### S03: Medical Records & File Import ✅
**Acceptance Criteria 1**: Record medical examinations with timestamp and unique ID
- **Implementation**: POST /api/animals/:id/medical automatically timestamps and generates unique exam_id
- **Database**: Medical_Exams table with auto-increment exam_id and created_at timestamp

**Acceptance Criteria 2**: Retrieve medical records by record ID
- **Implementation**: 
  - GET /api/medical/exams/:examId - retrieve by exam ID
  - GET /api/medical/results/:resultId - retrieve by diagnostic result ID
- **Database**: Indexed queries on primary keys for fast retrieval

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```
   (multer dependency added to package.json)

2. **Database Setup**
   ```bash
   # Run the updated medical.sql to create Medical_Files table
   mysql -u username -p database_name < sql/medical.sql
   ```

3. **File Storage Setup**
   - `uploads/medical/` directory created automatically
   - Ensure write permissions for the application

## Testing Examples

### Upload a Medical File
```bash
curl -X POST http://localhost:3000/api/animals/1/medical/files \
  -F "files=@test-xray.jpg" \
  -F "exam_id=123" \
  -F "uploaded_by=Dr. Smith" \
  -F "notes=Annual checkup X-ray"
```

### Retrieve Medical Records by Exam ID
```bash
curl http://localhost:3000/api/medical/exams/123
```

### Download a Medical File
```bash
curl http://localhost:3000/api/medical/files/456/download -o downloaded-file.jpg
```

## Error Handling
- Invalid file types rejected with descriptive error
- File size limit enforcement
- Database transaction rollback on upload failures
- File cleanup on database errors
- Comprehensive error logging

## Next Steps
1. Add authentication/authorization for file access
2. Implement file preview functionality in frontend
3. Add bulk file deletion capabilities
4. Consider cloud storage integration for scalability
5. Add file versioning support