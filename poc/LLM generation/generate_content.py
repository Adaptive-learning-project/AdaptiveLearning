"""
Main content population script.

Run this to generate and store all 5 content types for all defined subtopics.

Usage:
    python generate_content.py                   # uses USE_MOCK_LLM setting from .env
    python generate_content.py --mock            # force mock mode (no Ollama needed)
    python generate_content.py --real            # force real Ollama mode
    python generate_content.py --subtopic "X"   # run for one specific subtopic only

Done when: MongoDB has 5 verified content rows per subtopic.
"""

import argparse
import os
import sys
from pprint import pformat

from dotenv import load_dotenv

load_dotenv()

# ── Subtopics to populate ──────────────────────────────────────────────────────

SUBTOPICS: list[str] = [
    "Hosts and access networks",
    "Physical media",
    "Packet switching",
    "Circuit switching",
    "Internet structure",
]

CONTENT_TYPES: list[str] = [
    "easy_explanation",
    "medium_explanation",
    "easy_question",
    "medium_question",
    "hint",
]


# ── CLI args ───────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Populate MongoDB with LLM-generated content")
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument("--mock", action="store_true", help="Force mock LLM mode")
    mode_group.add_argument("--real", action="store_true", help="Force real Ollama mode")
    parser.add_argument("--subtopic", type=str, default=None, help="Run for one subtopic only")
    return parser.parse_args()


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()

    # Override USE_MOCK_LLM before importing llm_client (it reads env at import time)
    if args.mock:
        os.environ["USE_MOCK_LLM"] = "true"
    elif args.real:
        os.environ["USE_MOCK_LLM"] = "false"

    # Late imports so env overrides are applied first
    from db import ping, upsert_content, fetch_all_for_subtopic, count_documents
    from llm_client import generate_content, USE_MOCK_LLM

    # ── DB connectivity check ──────────────────────────────────────────────────
    print("=" * 60)
    print("Adaptive Learning — Content Population Script")
    print("=" * 60)
    print(f"Mode: {'MOCK (no Ollama needed)' if USE_MOCK_LLM else 'REAL (Ollama required)'}")
    print()

    print("Checking MongoDB connection...")
    if not ping():
        print("✗ Cannot connect to MongoDB at:", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
        print("  → Make sure MongoDB is running: mongod --dbpath <your-path>")
        print("  → Or install MongoDB: https://www.mongodb.com/try/download/community")
        sys.exit(1)
    print("✓ MongoDB connected\n")

    # ── Determine which subtopics to run ──────────────────────────────────────
    subtopics_to_run = [args.subtopic] if args.subtopic else SUBTOPICS

    # ── Generate and store ────────────────────────────────────────────────────
    total_success = 0
    total_failed = 0
    results_log: list[dict] = []

    for subtopic in subtopics_to_run:
        print(f"\n{'─' * 60}")
        print(f"Subtopic: {subtopic}")
        print(f"{'─' * 60}")

        for content_type in CONTENT_TYPES:
            try:
                validated_doc = generate_content(content_type, subtopic)
                status = upsert_content(validated_doc)
                icon = "✓"
                total_success += 1
                results_log.append({
                    "subtopic": subtopic,
                    "content_type": content_type,
                    "status": status,
                    "ok": True,
                })
                print(f"  {icon} {content_type:25s} → {status}")

            except Exception as exc:
                total_failed += 1
                results_log.append({
                    "subtopic": subtopic,
                    "content_type": content_type,
                    "status": "failed",
                    "error": str(exc),
                    "ok": False,
                })
                print(f"  ✗ {content_type:25s} → FAILED: {exc}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    print(f"  Subtopics processed : {len(subtopics_to_run)}")
    print(f"  Content pieces      : {total_success + total_failed}")
    print(f"  ✓ Succeeded         : {total_success}")
    print(f"  ✗ Failed            : {total_failed}")
    print(f"  Total docs in DB    : {count_documents()}")

    # ── Verification: print one full sample doc ────────────────────────────────
    if total_success > 0:
        sample_subtopic = subtopics_to_run[0]
        print(f"\nVerification — all docs for '{sample_subtopic}':")
        docs = fetch_all_for_subtopic(sample_subtopic)
        for doc in docs:
            ct = doc.get("content_type", "?")
            title = doc.get("title") or doc.get("question_text") or doc.get("hint_text", "")[:60]
            print(f"  ✓ [{ct}] {title[:70]}")

    if total_failed > 0:
        print("\nFailed items:")
        for r in results_log:
            if not r["ok"]:
                print(f"  ✗ {r['subtopic']} / {r['content_type']}: {r.get('error')}")
        sys.exit(1)

    print("\n✓ All content generated and stored successfully.")


if __name__ == "__main__":
    main()
