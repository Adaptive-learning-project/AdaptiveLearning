"""
RAG (Retrieval-Augmented Generation) Pipeline

Combines:
1. Document loading
2. Document chunking
3. Embedding generation
4. Vector similarity search
5. Context retrieval
6. LLM generation

Designed for the Adaptive Learning backend.
"""

import os
from pathlib import Path
from typing import List, Dict, Optional

from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

# IMPORTANT:
# These MUST be relative imports because embeddings.py
# and vector_space.py are inside the same app package.
from .embeddings import embeddings_manager
from .vector_space import vector_store


# ============================================================
# ENVIRONMENT
# ============================================================

# backend/
BASE_DIR = Path(__file__).resolve().parent.parent

# Load:
# backend/.env
load_dotenv(BASE_DIR / ".env")


# ============================================================
# DOCUMENT PROCESSOR
# ============================================================

class DocumentProcessor:
    """
    Splits large learning documents into smaller chunks
    suitable for embedding and retrieval.
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=[
                "\n\n",
                "\n",
                ". ",
                " ",
                ""
            ]
        )

    def process_documents(
        self,
        documents: List[Document]
    ) -> List[Document]:
        """
        Split documents into smaller chunks.
        """

        if not documents:
            print("No documents supplied.")
            return []

        try:
            chunks = self.text_splitter.split_documents(documents)

            print(
                f"Split {len(documents)} documents "
                f"into {len(chunks)} chunks."
            )

            return chunks

        except Exception as e:
            print(f"Error processing documents: {e}")
            return []


# ============================================================
# RAG PIPELINE
# ============================================================

class RAGPipeline:
    """
    Complete Retrieval-Augmented Generation pipeline.

    Pipeline:

        Documents
            ↓
        Chunking
            ↓
        Embeddings
            ↓
        Vector Store
            ↓
        Similarity Search
            ↓
        Relevant Context
            ↓
        LLM
            ↓
        Answer
    """

    def __init__(
        self,
        collection_name: str = "learning_content"
    ):
        self.collection_name = collection_name

        # ----------------------------------------------------
        # Document processor
        # ----------------------------------------------------

        self.document_processor = DocumentProcessor()

        # ----------------------------------------------------
        # LLM
        # ----------------------------------------------------

        self.llm = self._initialize_llm()

        # ----------------------------------------------------
        # Prompt
        # ----------------------------------------------------

        self.retriever_template = None
        self._setup_prompts()

        # ----------------------------------------------------
        # Vector collection
        # ----------------------------------------------------

        vector_store.create_collection(
            self.collection_name
        )

        print(
            f"RAG pipeline initialized: "
            f"{self.collection_name}"
        )

    # ========================================================
    # INITIALIZE LLM
    # ========================================================

    def _initialize_llm(self) -> ChatOpenAI:
        """
        Initialize the OpenAI chat model.
        """

        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY is not configured. "
                "Add it to backend/.env"
            )

        model_name = os.getenv(
            "OPENAI_MODEL",
            "gpt-4o-mini"
        )

        return ChatOpenAI(
            openai_api_key=api_key,
            model=model_name,
            temperature=0.2,
            max_tokens=2000
        )

    # ========================================================
    # SETUP PROMPT
    # ========================================================

    def _setup_prompts(self):
        """
        Setup the RAG prompt used to generate
        educational answers.
        """

        self.retriever_template = PromptTemplate(
            input_variables=[
                "context",
                "question"
            ],
            template="""
You are an expert educational AI teacher
inside an adaptive learning system.

Your job is to explain concepts clearly,
accurately, and at an appropriate level
for the student.

Use the retrieved learning material below
as the primary source for your answer.

---------------- RETRIEVED CONTEXT ----------------

{context}

---------------- END CONTEXT ----------------

Student Question:

{question}

Instructions:

1. Answer the student's question clearly.
2. Use the retrieved context whenever relevant.
3. Explain difficult concepts in simple language.
4. Give a small example when useful.
5. Do not claim that the retrieved material says
   something that it does not say.
6. Do not invent facts that contradict the
   retrieved learning material.
7. If the retrieved context is insufficient,
   clearly state that additional information
   may be required.
8. Keep the explanation appropriate for a learner.
9. Prefer concise explanations over unnecessary detail.
10. When appropriate, connect the explanation to
    the student's learning context.

Answer:
"""
        )

    # ========================================================
    # ADD DOCUMENTS
    # ========================================================

    def add_documents(
        self,
        documents: List[Document]
    ) -> bool:
        """
        Process, embed and store documents.
        """

        if not documents:
            print("No documents to add.")
            return False

        try:

            # ------------------------------------------------
            # STEP 1: Chunk documents
            # ------------------------------------------------

            chunks = self.document_processor.process_documents(
                documents
            )

            if not chunks:
                print(
                    "Document processing produced "
                    "no chunks."
                )
                return False

            # ------------------------------------------------
            # STEP 2: Extract valid text
            # ------------------------------------------------

            valid_chunks = []

            for chunk in chunks:

                if not isinstance(chunk, Document):
                    continue

                if not isinstance(
                    chunk.page_content,
                    str
                ):
                    continue

                if not chunk.page_content.strip():
                    continue

                valid_chunks.append(chunk)

            if not valid_chunks:
                print(
                    "No valid document chunks found."
                )
                return False

            texts = [
                chunk.page_content.strip()
                for chunk in valid_chunks
            ]

            # ------------------------------------------------
            # STEP 3: Generate embeddings
            # ------------------------------------------------

            print(
                f"Generating embeddings for "
                f"{len(texts)} chunks..."
            )

            embeddings = embeddings_manager.embed_documents(
                texts
            )

            if not embeddings:
                print(
                    "Embedding generation failed."
                )
                return False

            # ------------------------------------------------
            # STEP 4: Validate embedding count
            # ------------------------------------------------

            if len(embeddings) != len(valid_chunks):

                print(
                    "Embedding count does not match "
                    "document count."
                )

                return False

            # ------------------------------------------------
            # STEP 5: Store in vector database
            # ------------------------------------------------

            success = vector_store.add_documents(
                self.collection_name,
                valid_chunks,
                embeddings
            )

            if success:

                print(
                    f"Successfully added "
                    f"{len(valid_chunks)} chunks "
                    f"to ChromaDB."
                )

            else:

                print(
                    "Failed to add chunks "
                    "to vector store."
                )

            return success

        except Exception as e:

            print(
                f"Error adding documents: {e}"
            )

            return False

    # ========================================================
    # RETRIEVE CONTEXT
    # ========================================================

    def retrieve_context(
        self,
        query: str,
        k: int = 4,
        threshold: float = 0.0
    ) -> Dict:
        """
        Retrieve the most relevant documents
        from the vector database.
        """

        if not query or not query.strip():

            return {
                "query": query,
                "retrieved_documents": [],
                "count": 0,
                "error": "Query cannot be empty."
            }

        query = query.strip()

        if k <= 0:

            return {
                "query": query,
                "retrieved_documents": [],
                "count": 0,
                "error": "k must be greater than 0."
            }

        try:

            # ------------------------------------------------
            # STEP 1: Generate query embedding
            # ------------------------------------------------

            print(
                f"Generating query embedding for: "
                f"{query}"
            )

            query_embedding = embeddings_manager.embed_text(
                query
            )

            if query_embedding is None:

                return {
                    "query": query,
                    "retrieved_documents": [],
                    "count": 0,
                    "error": (
                        "Failed to generate "
                        "query embedding."
                    )
                }

            # ------------------------------------------------
            # STEP 2: Convert NumPy array to list
            # ------------------------------------------------

            if hasattr(
                query_embedding,
                "tolist"
            ):

                query_vector = query_embedding.tolist()

            else:

                query_vector = query_embedding

            # ------------------------------------------------
            # STEP 3: Search vector database
            # ------------------------------------------------

            results = vector_store.search_similar(
                self.collection_name,
                query_vector,
                query_text=query,
                k=k,
                threshold=threshold
            )

            if results is None:
                results = []

            # ------------------------------------------------
            # STEP 4: Return results
            # ------------------------------------------------

            print(
                f"Retrieved {len(results)} "
                f"relevant documents."
            )

            return {
                "query": query,
                "retrieved_documents": results,
                "count": len(results)
            }

        except Exception as e:

            print(
                f"Error retrieving context: {e}"
            )

            return {
                "query": query,
                "retrieved_documents": [],
                "count": 0,
                "error": str(e)
            }

    # ========================================================
    # BUILD CONTEXT
    # ========================================================

    def build_context(
        self,
        retrieved_documents: List
    ) -> str:
        """
        Convert retrieved documents into a single
        context string for the LLM.
        """

        if not retrieved_documents:

            return (
                "No relevant learning material "
                "was found."
            )

        context_parts = []

        for index, document in enumerate(
            retrieved_documents,
            start=1
        ):

            # ------------------------------------------------
            # Handle LangChain Document
            # ------------------------------------------------

            if isinstance(
                document,
                Document
            ):

                content = document.page_content

                metadata = (
                    document.metadata
                    or {}
                )

            # ------------------------------------------------
            # Handle dictionary result
            # ------------------------------------------------

            elif isinstance(
                document,
                dict
            ):

                content = (
                    document.get("page_content")
                    or document.get("content")
                    or document.get("text")
                    or ""
                )

                metadata = (
                    document.get("metadata")
                    or {}
                )

            # ------------------------------------------------
            # Fallback
            # ------------------------------------------------

            else:

                content = str(document)
                metadata = {}

            source = metadata.get(
                "source",
                "unknown"
            )

            topic = metadata.get(
                "topic",
                ""
            )

            difficulty = metadata.get(
                "difficulty",
                ""
            )

            header = (
                f"[Source {index}: {source}]"
            )

            if topic:
                header += (
                    f"\nTopic: {topic}"
                )

            if difficulty:
                header += (
                    f"\nDifficulty: {difficulty}"
                )

            context_parts.append(
                f"""
{header}

{content}
"""
            )

        return "\n".join(context_parts)

    # ========================================================
    # GENERATE ANSWER
    # ========================================================

    def generate(
        self,
        query: str,
        k: int = 4,
        threshold: float = 0.0
    ) -> Dict:
        """
        Complete RAG operation.

        Query
            ↓
        Retrieve
            ↓
        Build Context
            ↓
        Create Prompt
            ↓
        LLM
            ↓
        Answer
        """

        if not query or not query.strip():

            return {
                "query": query,
                "answer": None,
                "context": "",
                "sources": [],
                "count": 0,
                "error": "Query cannot be empty."
            }

        query = query.strip()

        try:

            # ------------------------------------------------
            # STEP 1: Retrieve
            # ------------------------------------------------

            print(
                "\n[RAG] Step 1: Retrieving context..."
            )

            retrieval = self.retrieve_context(
                query=query,
                k=k,
                threshold=threshold
            )

            if retrieval.get("error"):

                return {
                    "query": query,
                    "answer": None,
                    "context": "",
                    "sources": [],
                    "count": 0,
                    "error": retrieval["error"]
                }

            retrieved_documents = (
                retrieval.get(
                    "retrieved_documents",
                    []
                )
            )

            # ------------------------------------------------
            # STEP 2: Build context
            # ------------------------------------------------

            print(
                "[RAG] Step 2: Building context..."
            )

            context = self.build_context(
                retrieved_documents
            )

            # ------------------------------------------------
            # STEP 3: Create prompt
            # ------------------------------------------------

            print(
                "[RAG] Step 3: Creating prompt..."
            )

            prompt = self.retriever_template.format(
                context=context,
                question=query
            )

            # ------------------------------------------------
            # STEP 4: Call LLM
            # ------------------------------------------------

            print(
                "[RAG] Step 4: Calling LLM..."
            )

            response = self.llm.invoke(
                prompt
            )

            # ------------------------------------------------
            # STEP 5: Extract answer
            # ------------------------------------------------

            answer = response.content

            # ------------------------------------------------
            # STEP 6: Return result
            # ------------------------------------------------

            print(
                "[RAG] Step 5: Answer generated."
            )

            return {
                "query": query,
                "answer": answer,
                "context": context,
                "sources": retrieved_documents,
                "count": len(
                    retrieved_documents
                )
            }

        except Exception as e:

            print(
                f"Error generating RAG response: {e}"
            )

            return {
                "query": query,
                "answer": None,
                "context": "",
                "sources": [],
                "count": 0,
                "error": str(e)
            }

    # ========================================================
    # SIMPLE ASK METHOD
    # ========================================================

    def ask(
        self,
        question: str,
        k: int = 4,
        threshold: float = 0.0
    ) -> str:
        """
        Simple method that returns only the answer.
        """

        result = self.generate(
            query=question,
            k=k,
            threshold=threshold
        )

        if result.get("error"):

            return (
                f"RAG Error: "
                f"{result['error']}"
            )

        return result.get(
            "answer",
            "No answer generated."
        )


# ============================================================
# GLOBAL RAG INSTANCE
# ============================================================

rag_pipeline = RAGPipeline()