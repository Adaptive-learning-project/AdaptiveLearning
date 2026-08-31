# Quick Reference Card

## 🚀 Start Everything (5 minutes)

### Terminal 1: MongoDB
```bash
mongod --dbpath "C:\data\db"
```

### Terminal 2: Seed Content
```bash
cd D:\AdaptiveLearning\poc\"LLM generation"
python generate_content.py --mock
# Output: 25 documents (5 subtopics × 5 content types)
```

### Terminal 3: Backend
```bash
cd D:\AdaptiveLearning\person2-backend
pip install -r requirements.txt  # first time only
uvicorn app.main:app --host localhost --port 5000 --reload
# Ready at http://localhost:5000
```

### Terminal 4: Frontend
```bash
cd D:\AdaptiveLearning\frontend
npm install  # first time only
npm run dev
# Ready at http://localhost:5173
```

---

## 📋 API Endpoints Cheat Sheet

### List Modules
```bash
curl http://localhost:5000/api/learning-modules
```
Returns: Array of module objects

### Get Module Content
```bash
curl "http://localhost:5000/api/learning-modules/Hosts and access networks?difficulty=easy"
```
Returns: Content, question, hint for the module

### Submit Answer
```bash
curl -X POST http://localhost:5000/api/learning-modules/"Hosts and access networks"/answer \
  -H "Content-Type: application/json" \
  -d "{\"student_id\": 1, \"question_id\": 1, \"answer\": \"your answer\"}"
```
Returns: Correctness, mastery_score, next_difficulty

---

## 🔍 Health Checks

| Check | Command | Expected |
|-------|---------|----------|
| MongoDB | `Get-Service MongoDB` | Running |
| Backend | `curl http://localhost:5000/health` | `{"status":"healthy",...}` |
| Frontend | Open http://localhost:5173 | Page loads |
| Content | `curl http://localhost:5000/api/learning-modules` | Array of modules |

---

## 📊 Mastery Score Algorithm

```
Action              Points
─────────────────────────
Correct Answer      +10
Incorrect Answer    -5

Range: 0-100

Difficulty Level:
  Score < 50   → Easy
  50-70        → Medium
  >= 70        → Hard
```

---

## 🗂️ Key Files

| File | Purpose | Location |
|------|---------|----------|
| main.py | Backend API | `backend/app/main.py` |
| learningModuleApi.ts | Frontend API client | `frontend/src/app/api/` |
| database.py | MongoDB setup | `backend/app/database.py` |
| generate_content.py | Content generation | `poc/LLM generation/` |

---

## 🐛 Common Fixes

| Problem | Solution |
|---------|----------|
| "Unable to load modules" | Check backend running: `curl http://localhost:5000/health` |
| Port 5000 in use | Kill process: `Get-Process -Id (netstat -ano \| findstr :5000).split()[4] \| Stop-Process` |
| No modules in DB | Generate: `python generate_content.py --mock` |
| Frontend won't start | `npm install` then `npm run dev` |
| MongoDB won't connect | Start MongoDB: `net start MongoDB` or `mongod --dbpath "C:\data\db"` |

---

## 📚 Documentation

| Doc | Contents |
|-----|----------|
| INTEGRATION_GUIDE.md | Setup, API docs, troubleshooting |
| ARCHITECTURE.md | System design, data flows |
| CHANGES_SUMMARY.md | What changed, why, file log |
| VERIFICATION_CHECKLIST.md | Test everything step by step |

---

## 🔗 Learning Flow

```
User Opens App
  ↓
GET /api/learning-modules          ← Lists available modules
  ↓
User selects module
  ↓
GET /api/learning-modules/{id}      ← Gets content + question
  ↓
User answers question
  ↓
POST /api/learning-modules/{id}/answer  ← Backend grades + updates mastery
  ↓
Return: correct + next_difficulty
  ↓
Loop to next question at recommended difficulty
```

---

## 💡 What Was Added

- [x] CORS support in backend
- [x] 3 new API endpoints
- [x] Mastery tracking
- [x] Adaptive difficulty system
- [x] Answer evaluation
- [x] Updated frontend API client

---

## ✅ Verification Quick Test

```bash
# 1. Check backend
curl http://localhost:5000/health

# 2. List modules
curl http://localhost:5000/api/learning-modules | findstr "Hosts"

# 3. Get content
curl "http://localhost:5000/api/learning-modules/Hosts and access networks?difficulty=easy" | findstr "content"

# 4. Submit answer (should work even with wrong answer)
curl -X POST http://localhost:5000/api/learning-modules/"Hosts and access networks"/answer ^
  -H "Content-Type: application/json" ^
  -d "{\"student_id\":1,\"question_id\":1,\"answer\":\"test\"}" | findstr "mastery_score"

# All return data? ✓ Integration works!
```

---

## 🎯 Next Steps

1. ✅ Start all 4 terminals (MongoDB, Content, Backend, Frontend)
2. ✅ Open http://localhost:5173 in browser
3. ✅ Navigate to Learning Modules
4. ✅ Click a module and test the flow
5. ✅ Check browser console for any errors
6. ✅ Run full verification checklist

---

## 📞 Need Help?

1. Check `VERIFICATION_CHECKLIST.md` - Step-by-step testing
2. Check `INTEGRATION_GUIDE.md` - Detailed setup guide  
3. Check `ARCHITECTURE.md` - System design and flows
4. Browser console (F12) - JavaScript errors
5. Network tab (F12) - API response details

---

**Everything is set up and ready to go! 🚀**
