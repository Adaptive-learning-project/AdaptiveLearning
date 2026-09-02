
"""
Vector Space Management Module

Responsible for:

1. Creating and managing ChromaDB collections
2. Storing document chunks and embeddings
3. Performing vector similarity search
4. Returning relevant learning content to the RAG pipeline
5. Persisting the vector database locally

Used by:
    rag.py
"""

import chromadb

from pathlib import Path
from langchain.schema import Document
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
import uuid


class VectorStore:
    """
    Manages the ChromaDB vector database.

    Architecture:

        Learning Documents
                ↓
        Text Chunks
                ↓
          Embeddings
                ↓
            ChromaDB
                ↓
        Similarity Search
                ↓
        Relevant Documents
    """

    def __init__(
        self,
        persist_dir: str = "chroma_data"
    ):
        """
        Initialize the vector store.

        Args:
            persist_dir:
                Directory where ChromaDB will persist data.
        """

        self.persist_dir = persist_dir

        # Make sure persistence directory exists
        self._ensure_persist_dir()

        # Initialize persistent Chroma client
        self.client = chromadb.PersistentClient(
            path=self.persist_dir
        )

        # Cache collections in memory
        self.collections: Dict[str, Any] = {}

        print(
            f"Vector store initialized at: "
            f"{Path(self.persist_dir).absolute()}"
        )

    # =====================================================
    # Directory
    # =====================================================

    def _ensure_persist_dir(self):
        """
        Create persistence directory if it does not exist.
        """

        Path(
            self.persist_dir
        ).mkdir(
            parents=True,
            exist_ok=True
        )

    # =====================================================
    # Collection
    # =====================================================

    def create_collection(
        self,
        collection_name: str,
        metadata: Optional[dict] = None
    ) -> bool:
        """
        Create or retrieve a ChromaDB collection.

        Args:
            collection_name:
                Name of the collection.

            metadata:
                Optional collection metadata.

        Returns:
            True if successful.
        """

        try:

            # Already loaded in memory
            if collection_name in self.collections:
                return True

            collection_metadata = metadata or {
                "created_at":
                    datetime.now().isoformat(),

                "description":
                    f"Adaptive learning collection: "
                    f"{collection_name}"
            }

            collection = (
                self.client
                .get_or_create_collection(
                    name=collection_name,
                    metadata=collection_metadata
                )
            )

            self.collections[
                collection_name
            ] = collection

            print(
                f"Collection ready: "
                f"'{collection_name}'"
            )

            return True

        except Exception as e:

            print(
                f"Error creating collection "
                f"'{collection_name}': {e}"
            )

            return False

    # =====================================================
    # Get Collection
    # =====================================================

    def _get_collection(
        self,
        collection_name: str
    ):
        """
        Get a collection from cache or ChromaDB.
        """

        if collection_name in self.collections:
            return self.collections[
                collection_name
            ]

        try:

            collection = (
                self.client
                .get_collection(
                    name=collection_name
                )
            )

            self.collections[
                collection_name
            ] = collection

            return collection

        except Exception as e:

            print(
                f"Collection "
                f"'{collection_name}' "
                f"does not exist: {e}"
            )

            return None

    # =====================================================
    # Add Documents
    # =====================================================

    def add_documents(
        self,
        collection_name: str,
        documents: List[Document],
        embeddings: List,
        ids: Optional[List[str]] = None
    ) -> bool:
        """
        Add documents and embeddings to ChromaDB.

        Args:
            collection_name:
                Target collection.

            documents:
                List of LangChain Document objects.

            embeddings:
                Embedding vector for every document.

            ids:
                Optional custom IDs.

        Returns:
            True if successful.
        """

        try:

            # ---------------------------------------------
            # Validate documents
            # ---------------------------------------------

            if not documents:

                print(
                    "No documents supplied."
                )

                return False

            # ---------------------------------------------
            # Validate embeddings
            # ---------------------------------------------

            if embeddings is None:

                print(
                    "Embeddings are None."
                )

                return False

            if len(embeddings) != len(documents):

                print(
                    "Number of embeddings "
                    "does not match number "
                    "of documents."
                )

                return False

            # ---------------------------------------------
            # Get collection
            # ---------------------------------------------

            if not self.create_collection(
                collection_name
            ):

                return False

            collection = self.collections[
                collection_name
            ]

            # ---------------------------------------------
            # Prepare documents
            # ---------------------------------------------

            texts = []

            metadatas = []

            for doc in documents:

                texts.append(
                    doc.page_content
                )

                metadata = (
                    doc.metadata
                    if doc.metadata
                    else {}
                )

                # Chroma metadata values must be
                # primitive values.
                cleaned_metadata = {}

                for key, value in metadata.items():

                    if isinstance(
                        value,
                        (str, int, float, bool)
                    ):
                        cleaned_metadata[key] = value

                    else:
                        cleaned_metadata[key] = str(
                            value
                        )

                metadatas.append(
                    cleaned_metadata
                )

            # ---------------------------------------------
            # Generate unique IDs
            # ---------------------------------------------

            if ids is None:

                ids = []

                for index, doc in enumerate(
                    documents
                ):

                    source = (
                        doc.metadata.get(
                            "source",
                            "document"
                        )
                        if doc.metadata
                        else "document"
                    )

                    # Make source safe
                    source = (
                        Path(
                            str(source)
                        ).stem
                        .replace(" ", "_")
                    )

                    unique_id = (
                        f"{collection_name}_"
                        f"{source}_"
                        f"{index}_"
                        f"{uuid.uuid4().hex[:8]}"
                    )

                    ids.append(
                        unique_id
                    )

            # ---------------------------------------------
            # Validate IDs
            # ---------------------------------------------

            if len(ids) != len(documents):

                print(
                    "Number of IDs does not "
                    "match number of documents."
                )

                return False

            # ---------------------------------------------
            # Add to ChromaDB
            # ---------------------------------------------

            collection.add(
                ids=ids,
                embeddings=[
                    list(vector)
                    for vector in embeddings
                ],
                documents=texts,
                metadatas=metadatas
            )

            print(
                f"Added {len(documents)} chunks "
                f"to '{collection_name}'."
            )

            return True

        except Exception as e:

            print(
                f"Error adding documents: {e}"
            )

            return False

    # =====================================================
    # Similarity Search
    # =====================================================

    def search_similar(
        self,
        collection_name: str,
        query_embedding: List,
        query_text: Optional[str] = None,
        k: int = 4,
        threshold: float = 0.0
    ) -> List[Dict]:
        """
        Search for documents similar to a query.

        Args:
            collection_name:
                Collection to search.

            query_embedding:
                Embedding vector of the query.

            query_text:
                Original query text.
                Used only for debugging/metadata.

            k:
                Number of documents to retrieve.

            threshold:
                Minimum similarity score.

        Returns:
            List of dictionaries:

            {
                "content": "...",
                "metadata": {...},
                "score": 0.91,
                "id": "..."
            }
        """

        try:

            # ---------------------------------------------
            # Validate query
            # ---------------------------------------------

            if query_embedding is None:

                print(
                    "Query embedding is None."
                )

                return []

            if len(query_embedding) == 0:

                print(
                    "Query embedding is empty."
                )

                return []

            # ---------------------------------------------
            # Validate k
            # ---------------------------------------------

            if k <= 0:

                k = 4

            # ---------------------------------------------
            # Get collection
            # ---------------------------------------------

            collection = self._get_collection(
                collection_name
            )

            if collection is None:

                return []

            # ---------------------------------------------
            # Check collection size
            # ---------------------------------------------

            count = collection.count()

            if count == 0:

                print(
                    f"Collection "
                    f"'{collection_name}' "
                    f"is empty."
                )

                return []

            # Never request more documents
            # than the collection contains.
            k = min(k, count)

            # ---------------------------------------------
            # Query ChromaDB
            # ---------------------------------------------

            results = collection.query(
                query_embeddings=[
                    list(query_embedding)
                ],
                n_results=k,
                include=[
                    "documents",
                    "metadatas",
                    "distances"
                ]
            )

            # ---------------------------------------------
            # Extract results
            # ---------------------------------------------

            formatted_results = []

            documents = (
                results.get(
                    "documents",
                    [[]]
                )
            )

            metadatas = (
                results.get(
                    "metadatas",
                    [[]]
                )
            )

            distances = (
                results.get(
                    "distances",
                    [[]]
                )
            )

            ids = (
                results.get(
                    "ids",
                    [[]]
                )
            )

            if not documents:
                return []

            documents = documents[0] or []

            metadata_list = (
                metadatas[0]
                if metadatas
                else []
            )

            distance_list = (
                distances[0]
                if distances
                else []
            )

            id_list = (
                ids[0]
                if ids
                else []
            )

            # ---------------------------------------------
            # Convert distance → similarity
            # ---------------------------------------------

            for i, content in enumerate(
                documents
            ):

                distance = (
                    distance_list[i]
                    if i < len(distance_list)
                    else None
                )

                if distance is None:

                    similarity = 0.0

                else:

                    # Chroma cosine distance:
                    #
                    # distance = 1 - cosine_similarity
                    #
                    # Therefore:
                    #
                    # similarity = 1 - distance
                    #
                    # NOTE:
                    # This is correct for Chroma's
                    # cosine distance space.

                    similarity = (
                        1.0 - float(distance)
                    )

                    # Keep score within valid range
                    similarity = max(
                        0.0,
                        min(
                            1.0,
                            similarity
                        )
                    )

                # -----------------------------------------
                # Apply threshold
                # -----------------------------------------

                if similarity < threshold:
                    continue

                metadata = (
                    metadata_list[i]
                    if i < len(metadata_list)
                    else {}
                )

                document_id = (
                    id_list[i]
                    if i < len(id_list)
                    else None
                )

                formatted_results.append({

                    "content": content,

                    "metadata": metadata,

                    "score": similarity,

                    "id": document_id
                })

            # ---------------------------------------------
            # Sort highest similarity first
            # ---------------------------------------------

            formatted_results.sort(
                key=lambda item: item["score"],
                reverse=True
            )

            print(
                f"Retrieved "
                f"{len(formatted_results)} "
                f"documents"
            )

            if query_text:

                print(
                    f"Query: {query_text}"
                )

            return formatted_results

        except Exception as e:

            print(
                f"Error searching similar "
                f"documents: {e}"
            )

            return []

    # =====================================================
    # Collection Information
    # =====================================================

    def get_collection_count(
        self,
        collection_name: str
    ) -> int:
        """
        Return number of documents/chunks
        in a collection.
        """

        try:

            collection = self._get_collection(
                collection_name
            )

            if collection is None:
                return 0

            return collection.count()

        except Exception as e:

            print(
                f"Error getting collection "
                f"count: {e}"
            )

            return 0

    # =====================================================
    # Delete Collection
    # =====================================================

    def delete_collection(
        self,
        collection_name: str
    ) -> bool:
        """
        Delete an entire collection.
        """

        try:

            self.client.delete_collection(
                name=collection_name
            )

            if collection_name in self.collections:

                del self.collections[
                    collection_name
                ]

            print(
                f"Collection "
                f"'{collection_name}' deleted."
            )

            return True

        except Exception as e:

            print(
                f"Error deleting collection "
                f"'{collection_name}': {e}"
            )

            return False

    # =====================================================
    # List Collections
    # =====================================================

    def list_collections(
        self
    ) -> List[str]:
        """
        Return names of all collections.
        """

        try:

            collections = (
                self.client
                .list_collections()
            )

            names = []

            for collection in collections:

                # Depending on ChromaDB version,
                # list_collections may return collection
                # objects or names.

                if hasattr(
                    collection,
                    "name"
                ):

                    names.append(
                        collection.name
                    )

                else:

                    names.append(
                        str(collection)
                    )

            return names

        except Exception as e:

            print(
                f"Error listing collections: "
                f"{e}"
            )

            return []

    # =====================================================
    # Clear All Collections
    # =====================================================

    def clear_all(
        self
    ) -> bool:
        """
        Delete every collection.

        USE CAREFULLY.

        This permanently removes the current
        ChromaDB collections.
        """

        try:

            collections = (
                self.list_collections()
            )

            for collection_name in collections:

                self.delete_collection(
                    collection_name
                )

            print(
                "All vector collections "
                "deleted."
            )

            return True

        except Exception as e:

            print(
                f"Error clearing vector store: "
                f"{e}"
            )

            return False


# =========================================================
# Global Vector Store
# =========================================================

vector_store = VectorStore()

