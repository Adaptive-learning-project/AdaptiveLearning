"""
Re-generates content for an existing unit using the new engineering-level prompts.
Clears old content for each subtopic then regenerates via the LLM.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "person2-backend"))

from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone

# ── Config ─────────────────────────────────────────────────────────────────────
UNIT_ID   = "6a85bf773f2015a77e5f4645"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME   = "adaptive_learning"

client = MongoClient(MONGO_URL)
db     = client[DB_NAME]

def _now():
    return datetime.now(timezone.utc)

# ── Load subtopics ─────────────────────────────────────────────────────────────
unit = db.units.find_one({"_id": ObjectId(UNIT_ID)})
if not unit:
    print(f"Unit {UNIT_ID} not found")
    sys.exit(1)

topic = unit["topic"]
ref   = unit.get("reference_text", "") or ""
print(f"Unit: {topic}")
print(f"Reference text: {'yes' if ref.strip() else 'none'}")

subs = list(db.subtopics.find({"unit_id": UNIT_ID}))
print(f"Subtopics: {[s['name'] for s in subs]}\n")

# ── Regenerate ─────────────────────────────────────────────────────────────────
from app.llm_generator import generate_all, generate_fallback

for sub in subs:
    sub_id = str(sub["_id"])
    name   = sub["name"]
    print(f"-- Generating: {name}")

    # Delete old content
    result = db.content.delete_many({"subtopic_id": sub_id})
    print(f"   Cleared {result.deleted_count} old content pieces")

    try:
        generated = generate_all(topic, name, ref)
    except Exception as e:
        print(f"   LLM failed: {e} — using fallback")
        generated = generate_fallback(topic, name)

    for ctype, cdata in generated.items():
        db.content.insert_one({
            "subtopic_id":   sub_id,
            "unit_id":       UNIT_ID,
            "topic":         topic,
            "subtopic_name": name,
            "type":          ctype,
            "data":          cdata,
            "approved":      True,     # auto-approve since teacher already approved subtopic
            "updated_at":    _now(),
        })
    print(f"   Inserted {len(generated)} content pieces\n")

print("Done. All content regenerated and approved.")
