"""
LLM client — calls Groq API to generate structured JSON content.

Behavior:
- If USE_MOCK_LLM=true  → returns hardcoded mock responses (no API needed)
- If USE_MOCK_LLM=false → calls Groq (Llama 3 8B), retries up to 3 times on invalid JSON
- Validates every response against the appropriate Pydantic schema before returning
"""

import json
import os
import time

from dotenv import load_dotenv
from pydantic import ValidationError

from prompts import get_prompt
from schemas import SCHEMA_MAP

load_dotenv()

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama3-8b-8192")
USE_MOCK_LLM: bool = os.getenv("USE_MOCK_LLM", "true").lower() == "true"

MAX_RETRIES: int = 3
RETRY_DELAY_SECONDS: float = 2.0


# ── Mock responses (used when USE_MOCK_LLM=true) ──────────────────────────────

MOCK_RESPONSES: dict[str, dict] = {
    "easy_explanation": {
        "content_type": "easy_explanation",
        "subtopic": "__SUBTOPIC__",
        "title": "What Are Hosts and Access Networks?",
        "explanation": (
            "Think of the internet like a city. The hosts are the buildings — "
            "your laptop, phone, or a web server. The access network is the road "
            "that connects your building to the main highway (the internet core). "
            "Without an access network, your device has no way to send or receive data."
        ),
        "key_points": [
            "Hosts are end devices: laptops, phones, servers",
            "Access networks connect hosts to the internet core",
            "Examples: home WiFi, university LAN, mobile 4G/5G",
        ],
        "difficulty": "easy",
    },
    "medium_explanation": {
        "content_type": "medium_explanation",
        "subtopic": "__SUBTOPIC__",
        "title": "Access Networks and Physical Media — Technical View",
        "explanation": (
            "An access network bridges end systems (hosts) to the first-hop router on the path "
            "toward the destination. Access technologies vary by bandwidth and medium: DSL uses "
            "existing telephone copper wire and achieves asymmetric rates (higher download than "
            "upload); cable HFC (Hybrid Fiber Coaxial) shares bandwidth among neighbourhood users "
            "on a shared coaxial bus; FTTH (Fiber to the Home) delivers dedicated optical fiber, "
            "offering the highest bandwidth. In enterprise and university settings, Ethernet LANs "
            "provide wired access at 100 Mbps–10 Gbps, while 802.11 WiFi provides wireless access. "
            "Physical media choices (twisted pair, coax, fiber, radio) determine latency, "
            "attenuation, and susceptibility to interference."
        ),
        "key_points": [
            "Access network = last-mile link between host and first-hop router",
            "DSL: uses telephone line, asymmetric, dedicated per household",
            "Cable/HFC: shared medium, bandwidth split among neighbours",
            "FTTH: highest bandwidth, dedicated fiber per home",
            "Physical media choice affects speed, cost, and signal quality",
        ],
        "difficulty": "medium",
    },
    "easy_question": {
        "content_type": "easy_question",
        "subtopic": "__SUBTOPIC__",
        "question_text": "What do we call the end devices connected to the internet, like laptops and phones?",
        "correct_answer": "hosts",
        "explanation": (
            "End devices that originate or receive data on the internet are called hosts "
            "(also called end systems). Examples include laptops, smartphones, and web servers."
        ),
        "difficulty": "easy",
    },
    "medium_question": {
        "content_type": "medium_question",
        "subtopic": "__SUBTOPIC__",
        "question_text": (
            "Why does cable internet (HFC) experience slower speeds during peak evening hours "
            "compared to DSL?"
        ),
        "correct_answer": "Cable uses a shared medium; bandwidth is divided among all active neighbourhood users",
        "explanation": (
            "HFC (Hybrid Fiber Coaxial) uses a shared coaxial cable in the local neighbourhood, "
            "meaning all users contend for the same bandwidth. During peak hours more users are "
            "active simultaneously, reducing each user's effective share. DSL, in contrast, "
            "uses a dedicated twisted-pair line from each home to the DSLAM at the central office, "
            "so one user's activity does not affect another's speed."
        ),
        "difficulty": "medium",
    },
    "hint": {
        "content_type": "hint",
        "subtopic": "__SUBTOPIC__",
        "hint_text": (
            "Think about whether the cable used in cable internet is shared like a neighbourhood "
            "notice board (everyone reads the same board) or private like a personal letter. "
            "How would sharing affect speed when everyone is online at once?"
        ),
        "difficulty": "easy",
    },
}


def _get_mock_response(content_type: str, subtopic: str) -> dict:
    """Return a mock response with the correct subtopic injected."""
    response = dict(MOCK_RESPONSES[content_type])
    response["subtopic"] = subtopic
    return response


# ── Groq caller ────────────────────────────────────────────────────────────────

def _call_groq(prompt: str) -> str:
    """
    Call the Groq API and return the raw response text.
    Uses response_format=json_object to guarantee valid JSON output.
    Raises RuntimeError if the API call fails.
    """
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"},  # guarantees valid JSON
        )
        return response.choices[0].message.content
    except Exception as exc:
        raise RuntimeError(f"Groq API call failed: {exc}") from exc


# ── JSON extractor ─────────────────────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    """
    Extract a JSON object from the response text.
    With response_format=json_object this should always be clean JSON,
    but we handle edge cases defensively.
    """
    text = raw.strip()

    # Strip markdown fences if somehow present
    if "```" in text:
        lines = text.splitlines()
        inside = []
        in_block = False
        for line in lines:
            if line.strip().startswith("```"):
                in_block = not in_block
                continue
            if in_block:
                inside.append(line)
        if inside:
            text = "\n".join(inside).strip()

    # Find outermost JSON object
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    return json.loads(text)


# ── Normalizer ─────────────────────────────────────────────────────────────────

def _normalize(data: dict, content_type: str, subtopic: str) -> dict:
    """
    Fix common LLM field name mistakes before Pydantic validation.
    Forces content_type, subtopic, and difficulty to correct values.
    """
    field_aliases = {
        "explanaion": "explanation",
        "explantion": "explanation",
        "explaination": "explanation",
        "hint": "hint_text",
        "question": "question_text",
        "answer": "correct_answer",
        "correct": "correct_answer",
    }

    normalized = {}
    for key, value in data.items():
        clean_key = field_aliases.get(key.lower().strip(), key)
        normalized[clean_key] = value

    # Always override these — don't trust the model
    normalized["content_type"] = content_type
    normalized["subtopic"] = subtopic

    if "difficulty" not in normalized:
        normalized["difficulty"] = "medium" if "medium" in content_type else "easy"

    if "key_points" in normalized and isinstance(normalized["key_points"], list):
        normalized["key_points"] = normalized["key_points"][:5]

    return normalized


# ── Validator ──────────────────────────────────────────────────────────────────

def _validate(data: dict, content_type: str) -> dict:
    """Validate against Pydantic schema. Returns validated dict."""
    schema_class = SCHEMA_MAP.get(content_type)
    if not schema_class:
        raise ValueError(f"No schema registered for content_type: {content_type}")
    model = schema_class(**data)
    return model.model_dump()


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_content(content_type: str, subtopic: str) -> dict:
    """
    Generate and validate one piece of content via Groq API.

    If USE_MOCK_LLM=true  → returns validated mock data immediately.
    If USE_MOCK_LLM=false → calls Groq, retries up to MAX_RETRIES times.

    Returns:
        Validated dict ready to be stored in MongoDB.

    Raises:
        RuntimeError if all retries are exhausted.
    """
    if USE_MOCK_LLM:
        print(f"  [MOCK] Generating {content_type} for '{subtopic}'")
        data = _get_mock_response(content_type, subtopic)
        return _validate(data, content_type)

    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        raise RuntimeError(
            "GROQ_API_KEY not set. Add your key to .env file.\n"
            "Get a free key at: https://console.groq.com"
        )

    prompt = get_prompt(content_type, subtopic)
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"  [GROQ] Attempt {attempt}/{MAX_RETRIES} — {content_type} for '{subtopic}'")
            raw = _call_groq(prompt)
            data = _extract_json(raw)
            data = _normalize(data, content_type, subtopic)
            validated = _validate(data, content_type)
            print(f"  [GROQ] ✓ Valid on attempt {attempt}")
            return validated

        except (json.JSONDecodeError, ValidationError, KeyError) as exc:
            last_error = exc
            print(f"  [GROQ] ✗ Attempt {attempt} failed: {exc}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS)

        except RuntimeError:
            raise  # API key / network error — no point retrying

    raise RuntimeError(
        f"Failed to generate valid '{content_type}' after {MAX_RETRIES} attempts. "
        f"Last error: {last_error}"
    )
