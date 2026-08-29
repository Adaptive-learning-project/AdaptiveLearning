import os
from pymongo import MongoClient, ASCENDING
from pymongo.errors import OperationFailure
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URL", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
DB_NAME   = os.getenv("DATABASE_NAME", os.getenv("MONGO_DB_NAME", "adaptive_learning"))

client = MongoClient(MONGO_URI)
db     = client[DB_NAME]

# ── Existing collections (unchanged) ─────────────────────────────────────────
units_col       = db["units"]           # teacher's topic + subtopics
subtopics_col   = db["subtopics"]       # individual subtopics
content_col     = db["content"]         # generated + approved content pieces
mastery_col     = db["student_mastery"] # legacy mastery (kept for backward compat)
attempts_col    = db["attempts"]        # every answer recorded
escalations_col = db["escalations"]     # escalation alerts


# ── New BKT + DAG collections ────────────────────────────────────────────────

# bkt_states_col: per-student per-subtopic BKT state.
# P(L) here is the single source of truth for all mastery decisions.
# mastery_col is kept only for frontend backward compatibility.
bkt_states_col = db["bkt_states"]

# dag_config_col: per-unit DAG graph definition (nodes + prerequisite edges).
dag_config_col = db["dag_config"]

# student_profiles_col: per-student profile (interest tag, onboarding date).
student_profiles_col = db["student_profiles"]


# ── Index creation ────────────────────────────────────────────────────────────
# Wrapped in a function so it can be called once at startup without blocking
# the import. Errors are swallowed — indexes are best-effort at boot.

def ensure_indexes() -> None:
    """
    Create indexes for the three new collections if they do not already exist.

    bkt_states_col    — compound unique index on (student_id, subtopic_id)
                        so upserts are O(1) lookups.
    dag_config_col    — unique index on unit_id.
    student_profiles_col — unique index on student_id.
    """
    try:
        bkt_states_col.create_index(
            [("student_id", ASCENDING), ("subtopic_id", ASCENDING)],
            unique=True,
            name="bkt_student_subtopic_unique",
        )
        dag_config_col.create_index(
            [("unit_id", ASCENDING)],
            unique=True,
            name="dag_config_unit_unique",
        )
        student_profiles_col.create_index(
            [("student_id", ASCENDING)],
            unique=True,
            name="student_profiles_student_unique",
        )
    except OperationFailure:
        # Indexes already exist — safe to ignore
        pass


# Run index creation at module import time (once per process startup)
ensure_indexes()
