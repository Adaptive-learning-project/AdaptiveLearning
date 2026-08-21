import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URL", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
DB_NAME   = os.getenv("DATABASE_NAME", os.getenv("MONGO_DB_NAME", "adaptive_learning"))

client = MongoClient(MONGO_URI)
db     = client[DB_NAME]

# collections
units_col      = db["units"]          # teacher's topic + subtopics
subtopics_col  = db["subtopics"]      # individual subtopics
content_col    = db["content"]        # generated + approved content pieces
mastery_col    = db["student_mastery"]# per student per subtopic mastery
attempts_col   = db["attempts"]       # every answer recorded
escalations_col= db["escalations"]    # escalation alerts
