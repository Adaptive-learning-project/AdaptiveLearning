"""
Main content population script.

Run this to generate and store all 5 content types for all defined subtopics.

Usage:
    python generate_content.py                   # uses USE_MOCK_LLM setting from .env
    python generate_content.py --mock            # force mock mode (no Ollama needed)
    python generate_content.py --real            # force real Groq mode
    python generate_content.py --subtopic "X"   # run for one specific subtopic only

Done when: MongoDB has 5 verified content rows per subtopic.

Performance: all (subtopic × content_type) combinations are generated in parallel
using ThreadPoolExecutor so total wall-clock time ≈ time of the slowest single call
rather than the sum of all calls.
"""

import argparse
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

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
    mode_group.add_argument("--real", action="store_true", help="Force real Groq mode")
    parser.add_argument("--subtopic", type=str, default=None, help="Run for one subtopic only")
    parser.add_argument(
        "--workers", type=int, default=10,
        help="Max parallel workers for real LLM mode (default: 10)"
    )
    return parser.parse_args()


# ── Worker function (runs in a thread) ────────────────────────────────────────

def _generate_one(
    content_type: str,
    subtopic: str,
    generate_fn,
    upsert_fn,
) -> dict:
    """Generate one content piece and upsert it into MongoDB. Returns a result dict."""
    try:
        validated_doc = generate_fn(content_type, subtopic)
        status = upsert_fn(validated_doc)
        return {
            "subtopic": subtopic,
            "content_type": content_type,
            "status": status,
            "ok": True,
        }
    except Exception as exc:
        return {
            "subtopic": subtopic,
            "content_type": content_type,
            "status": "failed",
            "error": str(exc),
            "ok": False,
        }


# ── Progress bar ───────────────────────────────────────────────────────────────

def _bar(done: int, total: int) -> str:
    """Return a plain ASCII progress bar string — works in any terminal."""
    width = 25
    filled = int(width * done / total) if total else 0
    pct = int(100 * done / total) if total else 0
    return f"[{'#' * filled}{'-' * (width - filled)}] {pct:3d}%  {done}/{total}"


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()

    # Override USE_MOCK_LLM before importing llm_client (it reads env at import time)
    if args.mock:
        os.environ["USE_MOCK_LLM"] = "true"
    elif args.real:
        os.environ["USE_MOCK_LLM"] = "false"

    # Suppress verbose per-call prints from worker threads
    os.environ["LLM_SILENT"] = "1"

    # Late imports so env overrides are applied first
    from db import ping, upsert_content, fetch_all_for_subtopic, count_documents
    from llm_client import generate_content, USE_MOCK_LLM

    # ── DB connectivity check ──────────────────────────────────────────────────
    print("=" * 60)
    print("Adaptive Learning — Content Population Script")
    print("=" * 60)
    print(f"Mode     : {'MOCK (no Groq needed)' if USE_MOCK_LLM else 'REAL (Groq API)'}")

    max_workers = args.workers if not USE_MOCK_LLM else len(CONTENT_TYPES)
    print(f"Workers  : {max_workers}")
    print()

    print("Checking MongoDB connection...")
    if not ping():
        print("✗ Cannot connect to MongoDB at:", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
        print("  Make sure MongoDB is running: mongod --dbpath <your-path>")
        sys.exit(1)
    print("✓ MongoDB connected\n")

    # ── Determine which subtopics to run ──────────────────────────────────────
    subtopics_to_run = [args.subtopic] if args.subtopic else SUBTOPICS

    work_items = [
        (subtopic, content_type)
        for subtopic in subtopics_to_run
        for content_type in CONTENT_TYPES
    ]
    total_items = len(work_items)

    print(f"Generating {total_items} content pieces "
          f"({len(subtopics_to_run)} subtopics x {len(CONTENT_TYPES)} types) in parallel...")
    print()

    # ── Parallel generation ───────────────────────────────────────────────────
    results_log: list[dict] = []
    total_success = 0
    total_failed = 0
    completed_count = 0

    wall_start = time.perf_counter()

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_item = {
            executor.submit(_generate_one, ct, st, generate_content, upsert_content): (st, ct)
            for st, ct in work_items
        }

        for future in as_completed(future_to_item):
            result = future.result()
            results_log.append(result)
            completed_count += 1
            elapsed = time.perf_counter() - wall_start

            subtopic = result["subtopic"]
            content_type = result["content_type"]

            if result["ok"]:
                total_success += 1
                icon = "OK"
                detail = result["status"]
            else:
                total_failed += 1
                icon = "!!"
                detail = f"FAILED: {result.get('error', '')[:60]}"

            # One line per completion — always visible, no terminal tricks needed
            print(
                f"  [{icon}] {_bar(completed_count, total_items)}"
                f"  {elapsed:5.1f}s  |  {content_type:<22} {subtopic}"
                + (f"  ({detail})" if result["ok"] else f"\n        ^^^ {detail}")
            )

    wall_elapsed = time.perf_counter() - wall_start

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Subtopics processed : {len(subtopics_to_run)}")
    print(f"  Content pieces      : {total_success + total_failed}")
    print(f"  Succeeded           : {total_success}")
    print(f"  Failed              : {total_failed}")
    print(f"  Total docs in DB    : {count_documents()}")
    print(f"  Wall-clock time     : {wall_elapsed:.2f}s")

    if total_success > 0:
        sample_subtopic = subtopics_to_run[0]
        print(f"\nVerification - all docs for '{sample_subtopic}':")
        docs = fetch_all_for_subtopic(sample_subtopic)
        for doc in docs:
            ct = doc.get("content_type", "?")
            title = doc.get("title") or doc.get("question_text") or doc.get("hint_text", "")[:60]
            print(f"  OK [{ct}] {title[:70]}")

    if total_failed > 0:
        print("\nFailed items:")
        for r in results_log:
            if not r["ok"]:
                print(f"  !! {r['subtopic']} / {r['content_type']}: {r.get('error')}")
        sys.exit(1)

    print("\nAll content generated and stored successfully.")


if __name__ == "__main__":
    main()
