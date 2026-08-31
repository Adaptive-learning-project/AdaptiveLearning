from pymongo import MongoClient
from bson import ObjectId

client = MongoClient("mongodb://localhost:27017")
db = client["adaptive_learning"]

unit_id = "6a85bf773f2015a77e5f4645"
subs = list(db.subtopics.find({"unit_id": unit_id}))

print(f"Unit has {len(subs)} subtopic(s):\n")
for s in subs:
    sub_id = str(s["_id"])
    name = s.get("name", "?")
    approved = s.get("content_approved", False)
    pieces = list(db.content.find({"subtopic_id": sub_id}))
    print(f"  Subtopic: {name} | approved={approved} | {len(pieces)} content pieces")
    for p in pieces:
        text = p.get("data", {}).get("text", "")
        print(f"    [{p['type']}] {text[:90]}")
    print()
