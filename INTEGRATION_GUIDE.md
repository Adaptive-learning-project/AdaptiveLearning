# Adaptive Learning Platform - Integration Guide

## Architecture Overview

The system is now integrated with the following components:

1. **LLM Generation** (`poc/LLM generation/`) - Generates educational content using Ollama or mock data
2. **MongoDB** - Stores content_versions, questions, and mastery_state
3. **Backend** (`person2-backend/`) - FastAPI server exposing:
   - `/api/learning-modules` - List all available learning modules
   - `/api/learning-modules/{id}` - Get content and questions for a module
   - `/api/learning-modules/{id}/answer` - Submit answers and track mastery
4. **Frontend** (`frontend/`) - React/TypeScript UI for learning

## Startup Instructions

### 1. Start MongoDB (Required)

Windows:
```
mongod --dbpath "C:\path\to\mongodb\data"
```

Or if installed as a service:
```
net start MongoDB
```

### 2. Generate Content (One-time)

From `poc/LLM generation/` directory:

```bash
# Mock mode (no Ollama needed)
python generate_content.py --mock

# Or with real Ollama (if running)
python generate_content.py --real
```

This populates MongoDB with:
- easy_explanation
- medium_explanation
- easy_question
- medium_question
- hint

For subtopics:
- Hosts and access networks
- Physical media
- Packet switching
- Circuit switching
- Internet structure

### 3. Start Backend

From `person2-backend/` directory:

```bash
# Install dependencies (if not done)
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --host localhost --port 5000 --reload
```

Backend will be available at: `http://localhost:5000`

Check health: `http://localhost:5000/health`

### 4. Start Frontend

From `frontend/` directory:

```bash
# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

Frontend will typically run on: `http://localhost:5173`

## API Endpoints

### GET /api/learning-modules
Lists all available learning modules.

**Response:**
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

### GET /api/learning-modules/{module_id}
Get content, question, and hint for a module at a specific difficulty level.

**Query Parameters:**
- `difficulty`: "easy" or "medium" (default: "easy")

**Response:**
```json
{
  "id": "Hosts and access networks",
  "title": "Hosts and access networks",
  "content": {
    "text": "Content explanation...",
    "type": "easy_explanation"
  },
  "question": {
    "id": "Hosts and access networks_easy_question",
    "text": "Question text...",
    "type": "multiple_choice"
  },
  "hint": {
    "text": "Hint text..."
  },
  "difficulty": "easy"
}
```

### POST /api/learning-modules/{module_id}/answer
Submit an answer and get adaptive feedback.

**Request Body:**
```json
{
  "student_id": 1,
  "question_id": 1,
  "answer": "The correct answer"
}
```

**Response:**
```json
{
  "correct": true,
  "mastery_score": 60,
  "next_difficulty": "medium",
  "recommendation": "Good progress! Let's try a medium question.",
  "correct_answer": "The correct answer"
}
```

## Learning Flow

1. User loads frontend
2. Frontend calls `/api/learning-modules` to list available modules
3. User clicks on a module
4. Frontend calls `/api/learning-modules/{module_id}?difficulty=easy` to get content
5. User reads content and attempts question
6. Frontend calls `/api/learning-modules/{module_id}/answer` to submit answer
7. Backend evaluates, updates mastery_score, and recommends next difficulty
8. Frontend shows result and can offer next question at recommended difficulty

## Mastery Score Algorithm

- Correct answer: +10 points
- Incorrect answer: -5 points
- Range: 0-100

### Difficulty Progression
- Score < 50: Easy
- Score 50-69: Medium
- Score >= 70: Hard

## Troubleshooting

### "Unable to load learning modules" error

1. Check MongoDB is running:
   ```
   mongod --version
   ```

2. Check backend is running:
   ```
   curl http://localhost:5000/health
   ```

3. Check CORS is enabled (it is in the updated backend)

4. Check browser console for detailed errors

### No content in modules

Run the content generation script:
```
python generate_content.py --mock
```

### Port already in use

- Backend (5000): `netstat -ano | findstr :5000`
- Frontend (5173): Check the dev server output for alternate port

## File Structure

```
AdaptiveLearning/
├── person2-backend/          # FastAPI backend
│   ├── app/
│   │   ├── main.py          # Updated with learning modules endpoints
│   │   ├── database.py       # MongoDB connections
│   │   └── schemas.py
│   └── requirements.txt
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/          # Updated learningModuleApi.ts
│   │   │   ├── pages/        # Updated to use new endpoints
│   │   │   └── types/
│   │   └── main.tsx
│   └── package.json
└── poc/
    └── LLM generation/       # Content generation
        ├── generate_content.py
        ├── db.py
        ├── llm_client.py
        └── requirements.txt
```

## Next Steps

1. Ensure MongoDB is running
2. Run content generation script
3. Start backend (port 5000)
4. Start frontend (port 5173)
5. Navigate to http://localhost:5173
6. Select a learning module and test the full flow
