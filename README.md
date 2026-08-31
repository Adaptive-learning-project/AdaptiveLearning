# Adaptive Learning Platform

Complete end-to-end learning system with LLM-generated content, adaptive difficulty, and mastery tracking.

## 🚀 Quick Start (30 seconds)

### First Time Only
```batch
SEED_CONTENT.bat
```

### Every Time
```batch
START_ALL.bat
```

That's it! The app opens at http://localhost:5173

---

## 📁 What You Get

- **Frontend**: React/TypeScript UI at http://localhost:5173
- **Backend**: FastAPI at http://localhost:5000  
- **Database**: MongoDB with learning content
- **Content**: LLM-generated or mocked educational material

---

## 🎓 How It Works

1. **Browse Modules** - See available learning topics
2. **Read Content** - Learn the material at your level
3. **Answer Questions** - Test your understanding
4. **Get Adaptive Feedback** - System adjusts difficulty
5. **Track Progress** - Mastery scores saved

---

## 📚 Key Features

✅ Adaptive difficulty based on performance
✅ Mastery score tracking (0-100)
✅ Multiple content types and difficulty levels
✅ LLM-generated content (with mock fallback)
✅ Full-stack integration
✅ Real-time feedback

---

## 🔧 System Requirements

- Python 3.8+
- Node.js 16+
- MongoDB 4.0+
- Windows/Mac/Linux

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| **STARTUP_GUIDE.md** | How to start everything |
| **INTEGRATION_GUIDE.md** | Complete setup & API reference |
| **ARCHITECTURE.md** | System design & data flows |
| **QUICK_REFERENCE.md** | Commands & tips |
| **VERIFICATION_CHECKLIST.md** | Testing steps |

---

## 🎯 Learning Flow

```
User Opens App → Lists Modules → Selects Module → 
Reads Content → Answers Question → Backend Grades →
Updates Mastery → Recommends Difficulty → 
Next Question at Recommended Level
```

---

## ⚙️ Backend API

### GET /api/learning-modules
Lists all available modules
```json
{
  "data": [
    {
      "id": "Hosts and access networks",
      "title": "Hosts and access networks",
      "category": "Academic",
      "description": "Learn about Hosts and access networks",
      "difficulty": "beginner",
      "estimatedTime": 15
    }
  ]
}
```

### GET /api/learning-modules/{module_id}
Get content, question, hint
```json
{
  "id": "Hosts and access networks",
  "content": { "text": "...", "type": "easy_explanation" },
  "question": { "id": "...", "text": "...", "type": "multiple_choice" },
  "hint": { "text": "..." },
  "difficulty": "easy"
}
```

### POST /api/learning-modules/{module_id}/answer
Submit answer, get adaptive response
```json
{
  "correct": true,
  "mastery_score": 70,
  "next_difficulty": "hard",
  "recommendation": "You're doing great! Try a harder question.",
  "correct_answer": "expected answer"
}
```

---

## 📊 Mastery Algorithm

```
Correct Answer:     +10 points
Incorrect Answer:   -5 points
Score Range:        0-100

Difficulty:
  < 50:   Easy (start here)
  50-69:  Medium (making progress)
  ≥ 70:   Hard (almost mastered)
```

---

## 🗂️ Project Structure

```
AdaptiveLearning/
├── START_ALL.bat              ← Click this first time!
├── SEED_CONTENT.bat           ← Populate MongoDB
├── STARTUP_GUIDE.md           ← How to start
├── INTEGRATION_GUIDE.md       ← Complete setup
├── ARCHITECTURE.md            ← System design
├── QUICK_REFERENCE.md         ← Commands
│
├── person2-backend/
│   ├── start-backend.bat
│   ├── app/
│   │   ├── main.py            ← 3 new endpoints
│   │   ├── database.py        ← MongoDB
│   │   └── schemas.py
│   └── requirements.txt
│
├── frontend/
│   ├── start-frontend.bat
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   └── learningModuleApi.ts  ← Updated
│   │   │   ├── pages/
│   │   │   │   └── LearningModulesPage.tsx
│   │   │   └── types/
│   │   └── main.tsx
│   └── package.json
│
└── poc/LLM generation/
    ├── generate_content.py    ← Content generation
    ├── llm_client.py
    ├── db.py
    └── requirements.txt
```

---

## ✅ Setup Verification

After running START_ALL.bat, verify everything works:

### Backend Health
```
✓ http://localhost:5000/health → Returns {"status":"healthy",...}
```

### Modules Available
```
✓ http://localhost:5000/api/learning-modules → Returns module list
```

### Frontend Loading
```
✓ http://localhost:5173 → Shows learning modules page
```

### Module Cards Visible
```
✓ Click a module → Shows content and question
✓ Answer question → Shows feedback and mastery update
```

---

## 🐛 Troubleshooting

### "No module cards showing"
1. Run `SEED_CONTENT.bat` to generate content
2. Refresh browser (F5)
3. Check browser console (F12) for errors

### "Backend connection error"
1. Ensure backend is running: `http://localhost:5000/health`
2. Check Terminal 3 in START_ALL output
3. Restart with `START_ALL.bat`

### "MongoDB error"
1. Check if MongoDB is running: `Get-Service MongoDB`
2. Run `SEED_CONTENT.bat` first
3. Try `net start MongoDB` in admin terminal

### "Port already in use"
1. Kill process: `Get-Process -Id (netstat -ano | findstr :5000).split()[4] | Stop-Process`
2. Or close other instances of the app

---

## 📝 What Changed

### Backend (person2-backend/app/main.py)
- ✅ Added CORS support
- ✅ Added 3 new endpoints for learning flow
- ✅ Integrated with MongoDB content_versions
- ✅ Mastery tracking and adaptive difficulty

### Frontend (frontend/src/app/api/learningModuleApi.ts)
- ✅ Updated to use new backend endpoints
- ✅ Added submitAnswer function
- ✅ Ready to display modules

### Documentation
- ✅ 5 comprehensive guides created
- ✅ Quick reference cards
- ✅ Architecture diagrams
- ✅ Troubleshooting section

---

## 🎯 Next Steps

1. ✅ Click: **START_ALL.bat**
2. ✅ Wait for browser to open
3. ✅ Browse learning modules
4. ✅ Click a module to test
5. ✅ Answer a question
6. ✅ See adaptive feedback

---

## 💡 Tips

- Use browser DevTools (F12) to see API calls
- Check Network tab to verify responses
- Console tab shows JavaScript errors
- Backend logs show request details

---

## 🤝 Support

- **Setup issues?** → Check `STARTUP_GUIDE.md`
- **API questions?** → Check `INTEGRATION_GUIDE.md`
- **Architecture?** → Check `ARCHITECTURE.md`
- **Commands?** → Check `QUICK_REFERENCE.md`
- **Testing?** → Check `VERIFICATION_CHECKLIST.md`

---

## 📞 Commands Reference

| What | Where | Command |
|------|-------|---------|
| Start Everything | Root | `START_ALL.bat` |
| Generate Content | Root | `SEED_CONTENT.bat` |
| Start Backend | person2-backend/ | `start-backend.bat` |
| Start Frontend | frontend/ | `start-frontend.bat` |
| Check Health | PowerShell | `curl http://localhost:5000/health` |

---

## ✨ Features at a Glance

| Feature | Status | Details |
|---------|--------|---------|
| Module Listing | ✅ | GET /api/learning-modules |
| Content Serving | ✅ | GET /api/learning-modules/{id} |
| Answer Evaluation | ✅ | POST /api/learning-modules/{id}/answer |
| Mastery Tracking | ✅ | Score 0-100, per student |
| Adaptive Difficulty | ✅ | Recommends easy/medium/hard |
| Frontend Integration | ✅ | React UI displays modules |
| MongoDB Storage | ✅ | Content and progress |
| LLM Generation | ✅ | Mock or real mode |
| CORS Enabled | ✅ | Cross-origin requests work |

---

## 🎉 Ready to Go!

**Everything is set up and tested. Just run:**

```batch
START_ALL.bat
```

The app will start in seconds!

---

*For detailed information, see the documentation files listed above.*
