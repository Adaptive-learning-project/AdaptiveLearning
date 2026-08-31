import os

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv(
    "MONGODB_URL",
    "mongodb://localhost:27017"
)

DATABASE_NAME = os.getenv(
    "DATABASE_NAME",
    "adaptive_learning"
)

client = MongoClient(MONGODB_URL)

db = client[DATABASE_NAME]

content_versions_collection = db["content_versions"]

questions_collection = db["questions"]

mastery_state_collection = db["mastery_state"]

attempts_collection = db["attempts"]

decisions_collection = db["decisions"]