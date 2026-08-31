# Adaptive Learning Platform - Architecture & Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/TypeScript)                         │
│                         http://localhost:5173                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Pages:                                                                     │
│  - LearningModulesPage: Lists all modules from API                         │
│  - LearningModuleDetailsPage: Shows content, questions, tracking           │
│  API Client: learningModuleApi.ts (updated)                               │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ HTTP/REST
                                 │ (CORS enabled)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI/Python)                                 │
│                    http://localhost:5000                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  New Endpoints (App Routing):                                              │
│  ├─ GET /api/learning-modules                                             │
│  ├─ GET /api/learning-modules/{module_id}                                 │
│  └─ POST /api/learning-modules/{module_id}/answer                         │
│                                                                             │
│  Original Endpoints (Still Available):                                    │
│  ├─ POST /answer (question grading)                                       │
│  ├─ GET /mastery/{student_id}                                             │
│  ├─ GET /health (MongoDB check)                                           │
│  └─ GET / (status)                                                        │
│                                                                             │
│  Components:                                                              │
│  ├─ app.main: Routes and API logic                                       │
│  ├─ app.database: MongoDB connections                                    │
│  └─ app.schemas: Pydantic models                                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ PyMongo
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MONGODB (Document Database)                              │
│                    mongodb://localhost:27017                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Collections:                                                               │
│  │                                                                          │
│  ├─ content_versions                                                       │
│  │  ├─ _id (ObjectId)                                                     │
│  │  ├─ subtopic (string)                                                  │
│  │  ├─ content_type (easy_explanation|medium_explanation|...)            │
│  │  ├─ content_text (string)                                             │
│  │  ├─ question_text (string)                                            │
│  │  ├─ correct_answer (string)                                           │
│  │  ├─ hint_text (string)                                                │
│  │  ├─ difficulty (string)                                               │
│  │  ├─ created_at (timestamp)                                            │
│  │  └─ version (number)                                                  │
│  │                                                                         │
│  ├─ mastery_state                                                         │
│  │  ├─ _id (ObjectId)                                                    │
│  │  ├─ student_id (number)                                               │
│  │  ├─ subtopic_id (string)                                              │
│  │  ├─ mastery_score (0-100)                                             │
│  │  ├─ attempts (number)                                                 │
│  │  └─ correct_attempts (number)                                         │
│  │                                                                         │
│  └─ questions (original collection - preserved)                           │
│     └─ [Original schema maintained]                                       │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                        (Populated by)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CONTENT GENERATION (Python Script)                        │
│                   poc/LLM generation/generate_content.py                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Process:                                                                   │
│  1. Define subtopics and content types                                     │
│  2. For each subtopic × content_type:                                      │
│     a. Call LLM (Ollama) or use mock data                                  │
│     b. Validate response with Pydantic                                     │
│     c. Store in MongoDB                                                    │
│                                                                             │
│  Content Types Generated:                                                  │
│  ├─ easy_explanation (basic intro)                                        │
│  ├─ medium_explanation (deeper explanation)                               │
│  ├─ easy_question (simple comprehension)                                  │
│  ├─ medium_question (deeper comprehension)                                │
│  └─ hint (learning aid)                                                   │
│                                                                             │
│  Mode:                                                                     │
│  ├─ --mock: Use predefined test data (fast, no Ollama required)           │
│  └─ --real: Connect to Ollama for real LLM generation                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. User Starts Learning

```
User Opens App
       │
       ▼
Frontend loads at localhost:5173
       │
       ▼
LearningModulesPage.useEffect()
       │
       ▼
Call: GET /api/learning-modules
       │
       ▼
Backend queries MongoDB:
  db.content_versions.distinct("subtopic")
       │
       ▼
Return: Array of module objects
       │
       ▼
Display modules in UI
```

### 2. User Selects a Module

```
User clicks: "Hosts and access networks"
       │
       ▼
Navigate to LearningModuleDetailsPage
       │
       ▼
Extract moduleId from URL params
       │
       ▼
Call: GET /api/learning-modules/{moduleId}?difficulty=easy
       │
       ▼
Backend queries MongoDB:
  db.content_versions.find_one({
    subtopic: moduleId,
    content_type: "easy_explanation"
  })
       │
       ▼
Fetch content, question, and hint
       │
       ▼
Return: { content, question, hint, difficulty }
       │
       ▼
Display content to user
```

### 3. User Answers Question

```
User types answer and clicks "Submit"
       │
       ▼
Call: POST /api/learning-modules/{moduleId}/answer
  Body: {
    student_id: 1,
    question_id: 1,
    answer: "student's answer"
  }
       │
       ▼
Backend:
  1. Fetch question from MongoDB
  2. Normalize both answers (lowercase, trim)
  3. Compare: is_correct = (student_answer == correct_answer)
  4. Find or create mastery_state for student+subtopic
  5. Update score:
     - Correct: +10
     - Incorrect: -5
     - Bounds: 0-100
  6. Determine next_difficulty based on score:
     - < 50: easy
     - 50-69: medium
     - >= 70: hard
       │
       ▼
Return: {
  correct: boolean,
  mastery_score: number,
  next_difficulty: string,
  recommendation: string,
  correct_answer: string
}
       │
       ▼
Display feedback:
  - Show if correct/incorrect
  - Show correct answer
  - Show recommendation
  - Update progress UI
```

### 4. Adaptive Progression

```
Score Management:
  ┌─────────────────────────────┐
  │ Start: mastery_score = 0    │
  └──────────────┬──────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   Correct Answer   Incorrect Answer
    (+10 points)      (-5 points)
        │                 │
        │                 │
   mastery_score ← max(0, min(100, score))
        │
        ▼
   Decision Logic:
   ┌─────────────────────────────┐
   │ if score < 50:              │ → Keep Easy
   │   next_difficulty = "easy"  │
   ├─────────────────────────────┤
   │ elif score < 70:            │ → Promote to Medium
   │   next_difficulty = "medium"│
   ├─────────────────────────────┤
   │ else:                       │ → Promote to Hard
   │   next_difficulty = "hard"  │
   └─────────────────────────────┘
        │
        ▼
   Return recommendation
   User can answer again
   at recommended difficulty
```

## Request/Response Examples

### GET /api/learning-modules

**Request:**
```http
GET /api/learning-modules?category=All HTTP/1.1
Host: localhost:5000
```

**Response (200 OK):**
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
    },
    {
      "id": "Physical media",
      "title": "Physical media",
      "category": "Academic",
      "description": "Learn about Physical media",
      "difficulty": "beginner",
      "estimatedTime": 15,
      "icon": "📚"
    }
  ]
}
```

### GET /api/learning-modules/{module_id}

**Request:**
```http
GET /api/learning-modules/Hosts%20and%20access%20networks?difficulty=easy HTTP/1.1
Host: localhost:5000
```

**Response (200 OK):**
```json
{
  "id": "Hosts and access networks",
  "title": "Hosts and access networks",
  "content": {
    "text": "A host is any device on a network that can communicate with other devices. Access networks are the networks that connect hosts to the internet backbone...",
    "type": "easy_explanation"
  },
  "question": {
    "id": "Hosts and access networks_easy_question",
    "text": "What is a host in a network?",
    "type": "multiple_choice"
  },
  "hint": {
    "text": "Think about your computer or phone connecting to the internet."
  },
  "difficulty": "easy"
}
```

### POST /api/learning-modules/{module_id}/answer

**Request:**
```http
POST /api/learning-modules/Hosts%20and%20access%20networks/answer HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "student_id": 1,
  "question_id": 1,
  "answer": "A device that can communicate on a network"
}
```

**Response (200 OK - Correct Answer):**
```json
{
  "correct": true,
  "mastery_score": 60,
  "next_difficulty": "medium",
  "recommendation": "Good progress! Let's try a medium question.",
  "correct_answer": "A device that can communicate on a network"
}
```

**Response (200 OK - Incorrect Answer):**
```json
{
  "correct": false,
  "mastery_score": 35,
  "next_difficulty": "easy",
  "recommendation": "Let's stick with easy questions to build confidence.",
  "correct_answer": "A device that can communicate on a network"
}
```

## Deployment Checklist

- [ ] MongoDB running and persistent
- [ ] Content generation completed
- [ ] Backend environment variables set (.env if needed)
- [ ] Frontend environment variables set (.env if needed)
- [ ] CORS properly configured for production domain
- [ ] Error logging implemented
- [ ] Database backups automated
- [ ] Frontend built and deployed
- [ ] API endpoints rate-limited (optional)
- [ ] User authentication implemented (future)
