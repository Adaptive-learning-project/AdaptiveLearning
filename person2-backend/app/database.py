import os

from pymongo import MongoClient
from dotenv import load_dotenv


# Load environment variables
load_dotenv()


# MongoDB connection URL
MONGODB_URL = os.getenv(
    "MONGODB_URL",
    "mongodb://localhost:27017"
)


# Database name
DATABASE_NAME = os.getenv(
    "DATABASE_NAME",
    "adaptive_learning"
)


# Create MongoDB client
client = MongoClient(MONGODB_URL)


# Select database
db = client[DATABASE_NAME]


# Collections
content_versions_collection = db["content_versions"]

questions_collection = db["questions"]

mastery_state_collection = db["mastery_state"]