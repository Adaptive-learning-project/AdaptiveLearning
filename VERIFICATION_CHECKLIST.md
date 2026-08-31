# Integration Verification Checklist

## Pre-Flight Checks

### Backend Setup
- [ ] MongoDB is running on localhost:27017
  ```powershell
  # Windows: Check if MongoDB service is running
  Get-Service MongoDB
  ```

- [ ] Content generated in MongoDB
  ```bash
  cd poc/LLM\ generation
  python generate_content.py --mock
  ```
  Expected output: 5 documents per subtopic (25 total for 5 subtopics)

- [ ] Backend dependencies installed
  ```bash
  cd person2-backend
  pip install -r requirements.txt
  ```

### Code Quality
- [ ] Backend syntax valid
  ```bash
  cd person2-backend
  python -m py_compile app/main.py
  ```

- [ ] No import errors
  ```bash
  cd person2-backend
  python -c "from app.main import app; print('✓ Imports successful')"
  ```

## Component Health Checks

### 1. MongoDB Connection
- [ ] MongoDB is accessible
  ```bash
  python -c "from pymongo import MongoClient; c = MongoClient(); c.admin.command('ping'); print('✓')"
  ```

### 2. Backend Startup (Terminal 1)
```bash
cd person2-backend
uvicorn app.main:app --host localhost --port 5000 --reload
```

- [ ] Server starts without errors
- [ ] CORS middleware loaded
- [ ] Ready to receive requests

### 3. Backend Endpoints

Run each command in a new terminal or use Postman:

#### Health Check
```bash
curl http://localhost:5000/health
```
Expected: `{"status":"healthy","mongodb":"connected"}`

#### List Modules
```bash
curl http://localhost:5000/api/learning-modules
```
Expected: JSON array with module objects containing id, title, category, etc.

#### Get Module Content
```bash
curl "http://localhost:5000/api/learning-modules/Hosts and access networks?difficulty=easy"
```
Expected: Object with content, question, hint, difficulty fields

#### Submit Answer (for testing only)
```bash
curl -X POST http://localhost:5000/api/learning-modules/"Hosts and access networks"/answer ^
  -H "Content-Type: application/json" ^
  -d "{\"student_id\": 1, \"question_id\": 1, \"answer\": \"test\"}"
```
Expected: JSON response with correct, mastery_score, next_difficulty, recommendation

### 4. Frontend Startup (Terminal 2)
```bash
cd frontend
npm install  # if needed
npm run dev
```

- [ ] Dev server starts on localhost:5173
- [ ] No TypeScript errors
- [ ] No build errors

## Integration Flow Testing

### Test 1: Module Listing
1. [ ] Open http://localhost:5173
2. [ ] Click on "Learning Modules" page
3. [ ] Verify modules are displayed
4. [ ] Check browser console for API errors

### Test 2: Module Content Loading
1. [ ] Click on any learning module
2. [ ] Verify content loads without errors
3. [ ] Check browser console Network tab
4. [ ] Confirm request to `/api/learning-modules/{id}` succeeds

### Test 3: Answer Submission
1. [ ] Answer a question
2. [ ] Verify answer submission request in Network tab
3. [ ] Confirm POST to `/api/learning-modules/{id}/answer` succeeds
4. [ ] Verify response includes correct, mastery_score, next_difficulty

### Test 4: Mastery Tracking
1. [ ] Submit multiple answers
2. [ ] Check mastery_score changes
3. [ ] Verify difficulty progression recommendations
4. [ ] Confirm MongoDB stores mastery_state documents

## Troubleshooting Verification

### If "Unable to load learning modules" error appears:

1. [ ] Check backend is running
   ```bash
   curl http://localhost:5000/health
   ```

2. [ ] Check CORS is working
   - Open browser DevTools (F12)
   - Network tab should show 200 status for OPTIONS request
   - No CORS errors in Console

3. [ ] Check MongoDB has content
   ```bash
   python -c "from pymongo import MongoClient; db=MongoClient().adaptive_learning; print(db.content_versions.count_documents({}))"
   ```
   Expected: 25 or more documents

4. [ ] Check API endpoint URL
   - Frontend should request: `http://localhost:5000/api/learning-modules`
   - Not: `http://localhost/api/learning-modules`
   - Not: other port numbers

### If backend fails to start:

1. [ ] Check port 5000 is available
   ```bash
   netstat -ano | findstr :5000
   ```

2. [ ] Check Python version (3.8+)
   ```bash
   python --version
   ```

3. [ ] Check all dependencies installed
   ```bash
   pip install fastapi uvicorn pymongo python-dotenv
   ```

4. [ ] Check syntax errors
   ```bash
   python -m py_compile person2-backend/app/main.py
   ```

### If MongoDB connection fails:

1. [ ] Check MongoDB service
   ```bash
   Get-Service MongoDB
   ```

2. [ ] Check connection string in app/database.py
   - Default: `mongodb://localhost:27017`

3. [ ] Start MongoDB if not running
   ```bash
   mongod --dbpath "C:\data\db"
   ```

## Performance Check

- [ ] Module listing loads in < 1 second
- [ ] Content loads in < 1 second
- [ ] Answer submission processes in < 500ms
- [ ] No memory leaks (check Task Manager)
- [ ] No excessive CPU usage

## Final Verification

All tests pass? ✓
```
✓ Backend running on localhost:5000
✓ Frontend running on localhost:5173
✓ MongoDB connected with content
✓ All API endpoints responding
✓ Learning flow works end-to-end
✓ Mastery scoring working
✓ No console errors
```

Your integration is ready! 🎉
