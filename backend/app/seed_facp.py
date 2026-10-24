from app.database import units_col, subtopics_col
from datetime import datetime, timezone
from bson import ObjectId


def seed():
    # Insert FACP Pre-Primary Unit
    facp_unit = {
        "topic": "Pre-Primary: Color Discrimination",
        "level": "Pre-Primary",
        "subtopics": [
            "Red Color Identification",
            "Green Color Identification",
            "Blue Color Identification",
            "Yellow Color Identification"
        ],
        "reference_text": "FACP Academic Milestones: Teach primary color identification (Red, Green, Blue, Yellow) using simple solid color tiles and everyday objects.",
        "status": "ready",
        "created_at": datetime.now(timezone.utc)
    }

    res = units_col.insert_one(facp_unit)
    unit_id_str = str(res.inserted_id)

    for idx, name in enumerate(facp_unit["subtopics"]):
        subtopics_col.insert_one({
            "unit_id": unit_id_str,
            "topic": facp_unit["topic"],
            "name": name,
            "order": idx,
            "content_approved": True,
            "created_at": datetime.now(timezone.utc)
        })
    print(f"✅ Created FACP Pre-Primary Unit ID: {unit_id_str}")


if __name__ == "__main__":
    seed()