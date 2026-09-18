"""
Embedding manager for the Adaptive Learning RAG pipeline.

Responsibilities:
1. Convert documents into embedding vectors.
2. Convert user queries into embedding vectors.
3. Use the same embedding model for both operations.
"""

import os
from pathlib import Path
from typing import List, Optional

import numpy as np
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings


# ============================================================
# ENVIRONMENT
# ============================================================

# backend/
BASE_DIR = Path(__file__).resolve().parent.parent

# Load:
# backend/.env
load_dotenv(BASE_DIR / ".env")


# ============================================================
# EMBEDDINGS MANAGER
# ============================================================

class EmbeddingsManager:

    def __init__(self, model: Optional[str] = None):
        """
        Initialize the OpenAI embedding model.
        """

        self.model_name = model or os.getenv(
            "EMBEDDING_MODEL",
            "text-embedding-3-small"
        )

        self.embeddings = self._initialize_embeddings()

    # ========================================================
    # INITIALIZE OPENAI EMBEDDINGS
    # ========================================================

    def _initialize_embeddings(self) -> OpenAIEmbeddings:
        """
        Create the OpenAI embedding client.
        """

        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY is not configured. "
                "Add it to backend/.env"
            )

        return OpenAIEmbeddings(
            openai_api_key=api_key,
            model=self.model_name
        )

    # ========================================================
    # EMBED SINGLE TEXT / QUERY
    # ========================================================

    def embed_text(self, text: str) -> np.ndarray:
        """
        Convert a single text/query into an embedding vector.

        Example:
            vector = embeddings_manager.embed_text(
                "What is binary search?"
            )
        """

        if not isinstance(text, str):
            raise TypeError("text must be a string")

        text = text.strip()

        if not text:
            raise ValueError("text cannot be empty")

        try:
            vector = self.embeddings.embed_query(text)

            return np.asarray(
                vector,
                dtype=np.float32
            )

        except Exception as e:
            raise RuntimeError(
                f"Failed to generate query embedding: {e}"
            ) from e

    # ========================================================
    # EMBED MULTIPLE DOCUMENTS
    # ========================================================

    def embed_documents(
        self,
        texts: List[str]
    ) -> List[np.ndarray]:
        """
        Convert multiple documents into embedding vectors.

        Example:
            vectors = embeddings_manager.embed_documents([
                "Binary Search is a searching algorithm.",
                "A heap is a complete binary tree."
            ])
        """

        if not texts:
            return []

        cleaned_texts = []

        for text in texts:

            if not isinstance(text, str):
                raise TypeError(
                    "Every document must be a string"
                )

            text = text.strip()

            if not text:
                raise ValueError(
                    "Document text cannot be empty"
                )

            cleaned_texts.append(text)

        try:

            vectors = self.embeddings.embed_documents(
                cleaned_texts
            )

            return [
                np.asarray(
                    vector,
                    dtype=np.float32
                )
                for vector in vectors
            ]

        except Exception as e:

            raise RuntimeError(
                f"Failed to generate document embeddings: {e}"
            ) from e

    # ========================================================
    # GET EMBEDDING DIMENSION
    # ========================================================

    def get_embedding_dimension(self) -> int:
        """
        Return the dimensionality of the embedding model.

        text-embedding-3-small normally produces
        1536-dimensional vectors.
        """

        vector = self.embed_text(
            "embedding dimension test"
        )

        return int(vector.shape[0])

    # ========================================================
    # HEALTH CHECK
    # ========================================================

    def health_check(self) -> dict:
        """
        Test whether the embedding service is working.
        """

        try:

            dimension = self.get_embedding_dimension()

            return {
                "status": "healthy",
                "model": self.model_name,
                "dimension": dimension
            }

        except Exception as e:

            return {
                "status": "unhealthy",
                "model": self.model_name,
                "error": str(e)
            }


# ============================================================
# GLOBAL EMBEDDING MANAGER
# ============================================================

embeddings_manager = EmbeddingsManager()