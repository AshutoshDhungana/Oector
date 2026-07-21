"""CLI demo of the LangGraph answer flow.

Usage (inside the api container or a venv with the app deps):

    python -m scripts.demo_answer "Do you support SSO?"
    python -m scripts.demo_answer "Do you encrypt data at rest?" --product demo
    python -m scripts.demo_answer --file questions.txt

Prereqs:
  - Postgres up and migrated (alembic upgrade head)
  - Some QA library loaded (e.g. python -m scripts.seed) and embed_pending run
  - an OpenAI-compatible LLM endpoint configured in .env (the default is Ollama)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.db import session_scope
from app.services.answer_graph import answer_question


def _print_result(result: dict) -> None:
    print("=" * 72)
    print(f"Q: {result['question']}")
    print("-" * 72)
    print(f"verdict:      {result['verdict']}")
    print(f"confidence:   {result['confidence']:.3f}")
    print(f"needs_review: {result['needs_review']}")
    if result.get("reason"):
        print(f"reason:       {result['reason']}")

    if result.get("answer"):
        print("\nDraft answer:\n")
        print(result["answer"])
        if result["citations"]:
            print(f"\nCitations (entry_ids): {result['citations']}")
    else:
        print("\n(no draft — top hits from library:)")
        for i, h in enumerate(result.get("hits") or [], 1):
            print(f"  [{i}] ({h['score']:.3f}) {h['question']}")
    print()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("question", nargs="?", help="single question to answer")
    ap.add_argument("--product", default=None, help="product slug to scope retrieval")
    ap.add_argument("--k", type=int, default=None, help="retrieval top-k")
    ap.add_argument("--file", type=Path, default=None,
                    help="path to a text file, one question per line")
    ap.add_argument("--json", action="store_true", help="dump raw JSON per question")
    args = ap.parse_args()

    if not args.question and not args.file:
        ap.error("provide a question or --file")

    questions: list[str] = []
    if args.file:
        questions.extend(
            line.strip() for line in args.file.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        )
    if args.question:
        questions.append(args.question)

    with session_scope() as db:
        for q in questions:
            result = answer_question(
                db=db, question=q, product_slug=args.product, k=args.k
            )
            if args.json:
                # Strip session-only carry keys before dumping.
                print(json.dumps(result, indent=2))
            else:
                _print_result(result)

    return 0


if __name__ == "__main__":
    sys.exit(main())
