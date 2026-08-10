"""
MongoDB connection and collection setup.
Handles connection, index creation, and insert operations for content_versions.
"""

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
from pymongo.collection import Collection
from pymongo.errors import ConnectionFailure, DuplicateKeyError

load_dotenv()

MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "adaptive_learning")

# Module-level client (reused across calls)
_client: MongoClient | None = None


def get_client() -> MongoClient:
    """Return a reusable MongoClient, creating it if needed."""
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client


def get_collection() -> Collection:
    """Return the content_versions collection, with indexes applied."""
    client = get_client()
    db = client[MONGO_DB_NAME]
    collection = db["content_versions"]
    _ensure_indexes(collection)
    return collection


def _ensure_indexes(collection: Collection) -> None:
    """Create indexes if they don't already exist."""
    # Compound unique index: one document per (subtopic, content_type)
    collection.create_index(
        [("subtopic", ASCENDING), ("content_type", ASCENDING)],
        unique=True,
        name="idx_subtopic_content_type"
    )
    # Index for querying by difficulty (used by Person 3's adaptive engine)
    collection.create_index(
        [("difficulty", ASCENDING)],
        name="idx_difficulty"
    )


def ping() -> bool:
    """Return True if MongoDB is reachable, False otherwise."""
    try:
        get_client().admin.command("ping")
        return True
    except ConnectionFailure:
        return False


def upsert_content(document: dict) -> str:
    """
    Insert or replace a content document.
    Uses subtopic + content_type as the unique key.

    Returns:
        "inserted" | "replaced" | "skipped"
    """
    collection = get_collection()

    # Attach metadata
    document["created_at"] = datetime.now(timezone.utc)
    document["version"] = 1

    filter_key = {
        "subtopic": document["subtopic"],
        "content_type": document["content_type"],
    }

    existing = collection.find_one(filter_key)
    if existing:
        # Bump version on replace
        document["version"] = existing.get("version", 1) + 1
        collection.replace_one(filter_key, document)
        return "replaced"
    else:
        try:
            collection.insert_one(document)
            return "inserted"
        except DuplicateKeyError:
            return "skipped"


def fetch_content(subtopic: str, content_type: str) -> dict | None:
    """Retrieve a single content document by subtopic + content_type."""
    collection = get_collection()
    return collection.find_one(
        {"subtopic": subtopic, "content_type": content_type},
        {"_id": 0}  # exclude Mongo internal ID from result
    )


def fetch_all_for_subtopic(subtopic: str) -> list[dict]:
    """Retrieve all 5 content pieces for a given subtopic."""
    collection = get_collection()
    results = collection.find({"subtopic": subtopic}, {"_id": 0})
    return list(results)


def count_documents() -> int:
    """Return total number of content documents stored."""
    return get_collection().count_documents({})
