# Quick Startup Guide

## Option 1: Automated Startup (RECOMMENDED)

### First Time Only:
```batch
SEED_CONTENT.bat
```
This generates all learning content in MongoDB.

### Then Every Time:
```batch
START_ALL.bat
```
This starts:
1. MongoDB (if not running)
2. Backend server (localhost:5000)
3. Frontend dev server (localhost:5173)
4. Opens browser at http://localhost:5173

---

## Option 2: Manual Startup

### Terminal 1 - MongoDB
```bash
mongod --dbpath "C:\data\db"
```
Or if installed as service:
```bash
net start MongoDB
```

### Terminal 2 - Seed Content (First Time Only)
```bash
cd D:\AdaptiveLearning\poc\"LLM generation"
python -m pip install -r requirements.txt
python generate_content.py --mock
```

### Terminal 3 - Backend
```bash
cd D:\AdaptiveLearning\person2-backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host localhost --port 5000 --reload
```

Wait for: `Application startup complete`

### Terminal 4 - Frontend
```bash
cd D:\AdaptiveLearning\frontend
npm install  # first time only
npm run dev
```

Then open: http://localhost:5173

---

## Option 3: Individual Scripts

### Backend Only
```batch
D:\AdaptiveLearning\person2-backend\start-backend.bat
```

### Frontend Only
```batch
D:\AdaptiveLearning\frontend\start-frontend.bat
```

### Seed Content
```batch
D:\AdaptiveLearning\SEED_CONTENT.bat
```

---

## ✅ Verification

### Check Backend
```bash
# Should return health status
Invoke-WebRequest -Uri "http://localhost:5000/health" | Select-Object -ExpandProperty Content
```

### Check Modules
```bash
# Should return list of modules
Invoke-WebRequest -Uri "http://localhost:5000/api/learning-modules" | Select-Object -ExpandProperty Content
```

### Check Content
```bash
# Should return module content
Invoke-WebRequest -Uri "http://localhost:5000/api/learning-modules/Hosts and access networks?difficulty=easy" | Select-Object -ExpandProperty Content
```

---

## 📌 Important Notes

1. **Run commands from correct directory** when using Option 2
2. **First time setup requires:**
   - Python 3.8+
   - Node.js 16+
   - MongoDB 4.0+
3. **Windows Defender** might prompt for network access - allow it
4. **Port conflicts?** Check Task Manager or use `netstat -ano | findstr :5000`
5. **npm stuck?** Press Ctrl+C in that terminal and try again

---

## 🎯 What Happens

1. MongoDB stores educational content
2. Backend API serves content to frontend
3. Frontend displays learning modules
4. Users answer questions
5. Backend tracks mastery scores
6. System recommends difficulty

---

## 🐛 Troubleshooting

### Modules not showing
- [ ] Backend is running? Check http://localhost:5000/health
- [ ] MongoDB has content? Run SEED_CONTENT.bat
- [ ] Frontend reloaded? Press F5 in browser

### Backend won't start
- [ ] Python installed? `python --version`
- [ ] Dependencies installed? `pip install -r requirements.txt`
- [ ] Port 5000 free? Check Task Manager

### Frontend won't start
- [ ] Node.js installed? `node --version`
- [ ] npm installed? `npm --version`
- [ ] Dependencies installed? `npm install`

### MongoDB connection error
- [ ] MongoDB running? Check Services
- [ ] Data directory exists? `C:\data\db`
- [ ] Port 27017 free?

---

## 📞 Quick Help

| Issue | Fix |
|-------|-----|
| "Module card not showing" | Run SEED_CONTENT.bat, then refresh browser |
| "Network error on modules page" | Ensure backend is running on port 5000 |
| "Port already in use" | Kill existing process: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess \| Stop-Process` |
| "Module loads but no content" | Check backend logs for MongoDB errors |

---

**Ready to go! Run START_ALL.bat to launch everything.**
