# Troubleshooting: "No planets discovered"

## Problem
You see "No planets discovered" on the Learning Modules page

## Solution Steps

### Step 1: Verify MongoDB is Running
Check if MongoDB service is running:
```powershell
Get-Service MongoDB
```

Expected output should show: `Status : Running`

If not running, start it:
```powershell
net start MongoDB
```

Or if you want to start it manually:
```powershell
mongod --dbpath "C:\data\db"
```

### Step 2: Seed Content into MongoDB
This is the critical step you might have missed!

```batch
cd D:\AdaptiveLearning
SEED_CONTENT.bat
```

Or manually:
```bash
cd D:\AdaptiveLearning\poc\LLM\ generation
pip install -r requirements.txt
python generate_content.py --mock
```

Wait for it to complete. You should see output like:
```
Subtopic: Hosts and access networks
  ✓ easy_explanation         → inserted
  ✓ medium_explanation       → inserted
  ✓ easy_question            → inserted
  ✓ medium_question          → inserted
  ✓ hint                     → inserted
```

### Step 3: Verify Content is in MongoDB
Check if content was actually stored:

Open MongoDB shell or use compass, then run:
```javascript
use adaptive_learning
db.content_versions.count()
```

Should return: `25` (5 subtopics × 5 content types)

If it returns `0`, the seed didn't work.

### Step 4: Start/Restart Backend
```bash
cd D:\AdaptiveLearning\person2-backend
python -m uvicorn app.main:app --host localhost --port 5000 --reload
```

Wait for message: `Application startup complete`

### Step 5: Test Backend Endpoint
Open PowerShell and test:
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/learning-modules" | ConvertTo-Json | Write-Host
```

Should return something like:
```json
{
  "data": [
    {
      "id": "Hosts and access networks",
      "title": "Hosts and access networks",
      "category": "Academic",
      "description": "Learn about Hosts and access networks",
      "difficulty": "beginner",
      "estimatedTime": 15,
      "icon": "📚"
    }
  ]
}
```

If it returns `{"data": []}` (empty), MongoDB has no content - go back to Step 2.

### Step 6: Refresh Frontend
In browser:
1. Press `F5` to refresh
2. Wait for page to load
3. Check if cards appear

### Step 7: Check Browser Console
If still no cards:
1. Press `F12` to open DevTools
2. Go to "Console" tab
3. Look for any red error messages
4. Take a screenshot and share the error

---

## Common Issues & Fixes

### Issue: "Application startup complete" but still no cards

**Solution:**
```bash
# Kill the process and restart
Get-Process -Name "python" | Where-Object {$_.Path -like "*uvicorn*"} | Stop-Process

# Then restart backend
cd D:\AdaptiveLearning\person2-backend
python -m uvicorn app.main:app --host localhost --port 5000 --reload
```

### Issue: "Port 5000 already in use"

**Solution:**
```powershell
# Find and kill process using port 5000
$ProcessId = (Get-NetTCPConnection -LocalPort 5000).OwningProcess
Stop-Process -Id $ProcessId -Force
```

### Issue: MongoDB connection error

**Solution:**
```powershell
# Check if MongoDB service exists
Get-Service MongoDB

# Start it
net start MongoDB

# If that doesn't work, start manually
mongod --dbpath "C:\data\db"
```

### Issue: generate_content.py fails

**Solution:**
```bash
# Make sure you're in the right directory
cd "D:\AdaptiveLearning\poc\LLM generation"

# Install dependencies
pip install -r requirements.txt

# Run with mock (no Ollama needed)
python generate_content.py --mock
```

---

## Quick Checklist

- [ ] MongoDB is running
- [ ] Content has been seeded (ran SEED_CONTENT.bat)
- [ ] Backend is running on port 5000
- [ ] Frontend is running on port 5173
- [ ] Browser shows cards (press F5 to refresh)
- [ ] No red errors in browser console (F12)

---

## Full Reset (Nuclear Option)

If nothing works, reset everything:

```powershell
# 1. Stop all Node/Python processes
Get-Process -Name "node", "python" | Stop-Process -Force

# 2. Stop MongoDB
net stop MongoDB

# 3. Delete MongoDB data
Remove-Item -Path "C:\data\db" -Recurse -Force
mkdir "C:\data\db"

# 4. Start fresh
net start MongoDB

# 5. Seed content
cd "D:\AdaptiveLearning\poc\LLM generation"
python generate_content.py --mock

# 6. Start backend
cd "D:\AdaptiveLearning\person2-backend"
python -m uvicorn app.main:app --host localhost --port 5000 --reload

# 7. Start frontend
cd "D:\AdaptiveLearning\frontend"
npm run dev

# 8. Open browser
Start-Process http://localhost:5173
```

---

## Debug: Check Exact Error

Open browser DevTools (F12) and run this in Console:

```javascript
fetch('http://localhost:5000/api/learning-modules')
  .then(r => r.json())
  .then(data => console.log('Success:', data))
  .catch(e => console.error('Error:', e))
```

This will show exactly what the backend is returning or if there's a connection error.

---

## Still Not Working?

1. Share the output from browser console (F12)
2. Share the backend terminal output
3. Tell me: Does `http://localhost:5000/health` work?
4. Tell me: Does SEED_CONTENT.bat complete successfully?

---

**Most likely: You haven't run SEED_CONTENT.bat yet. Try that first!**
