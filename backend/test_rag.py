from langchain.schema import Document

from app.rag import rag_pipeline


# ============================================================
# TEST DOCUMENTS
# ============================================================

documents = [
    Document(
        page_content="""
Binary Search is an efficient searching algorithm
used on a sorted array.

It works by repeatedly dividing the search interval
into two halves.

If the target is smaller than the middle element,
search the left half.

If the target is larger than the middle element,
search the right half.

The time complexity of Binary Search is O(log n).
""",
        metadata={
            "source": "data_structures.txt",
            "topic": "Binary Search",
            "difficulty": "beginner"
        }
    ),

    Document(
        page_content="""
A Binary Heap is a complete binary tree that follows
the heap property.

In a Max Heap, every parent node is greater than or
equal to its children.

In a Min Heap, every parent node is smaller than or
equal to its children.
""",
        metadata={
            "source": "heap.txt",
            "topic": "Heap",
            "difficulty": "beginner"
        }
    )
]


# ============================================================
# 1. DOCUMENT INGESTION
# ============================================================

print("\n==============================")
print("1. DOCUMENT INGESTION")
print("==============================")

success = rag_pipeline.add_documents(documents)

print("Ingestion successful:", success)


# ============================================================
# 2. RETRIEVAL TEST
# ============================================================

print("\n==============================")
print("2. RETRIEVAL")
print("==============================")

query = "What is the time complexity of Binary Search?"

retrieval = rag_pipeline.retrieve_context(
    query=query,
    k=3
)

print("Query:", retrieval["query"])
print("Documents found:", retrieval["count"])


if retrieval.get("error"):

    print("Retrieval error:")
    print(retrieval["error"])

else:

    for i, document in enumerate(
        retrieval["retrieved_documents"],
        start=1
    ):

        print(f"\n--- Document {i} ---")

        print(
            "Score:",
            document.get("score")
        )

        print(
            "Source:",
            document.get(
                "metadata",
                {}
            ).get(
                "source",
                "unknown"
            )
        )

        print("Content:")

        print(
            document.get(
                "content",
                document.get(
                    "page_content",
                    ""
                )
            )
        )


# ============================================================
# 3. RAG GENERATION TEST
# ============================================================

print("\n==============================")
print("3. RAG GENERATED ANSWER")
print("==============================")

result = rag_pipeline.generate(
    query=query,
    k=3
)


if result.get("error"):

    print("Generation error:")
    print(result["error"])

else:

    print("\nAnswer:")
    print(result["answer"])

    print("\nNumber of sources:")
    print(result["count"])