from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from datetime import datetime, timezone
import traceback

from app.database import (
    units_col, subtopics_col, content_col,
    mastery_col, attempts_col, escalations_col,
)
from app.schemas import (
    CreateUnitRequest, ApproveContentRequest,
    SubmitAnswerRequest, ResolveEscalationRequest,
)
from app.adaptive_engine import decide

app = FastAPI(title="Adaptive Learning API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _oid(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _now():
    return datetime.now(timezone.utc)


# ── HEALTH ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    try:
        from app.database import client
        client.admin.command("ping")
        return {"status": "healthy", "mongodb": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# TEACHER — CREATE UNIT
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/teacher/units")
def create_unit(req: CreateUnitRequest):
    unit = {
        "teacher_id":     req.teacher_id,
        "topic":          req.topic,
        "reference_text": req.reference_text,
        "status":         "generating",
        "created_at":     _now(),
    }
    unit_id = str(units_col.insert_one(unit).inserted_id)

    subtopic_ids = []
    for i, name in enumerate(req.subtopics):
        sub = {
            "unit_id":    unit_id,
            "topic":      req.topic,
            "name":       name,
            "order":      i,
            "content_approved": False,
            "created_at": _now(),
        }
        sub_id = str(subtopics_col.insert_one(sub).inserted_id)
        subtopic_ids.append(sub_id)

    return {
        "unit_id":      unit_id,
        "subtopic_ids": subtopic_ids,
        "message":      f"Unit created with {len(subtopic_ids)} subtopics.",
    }


# ── TRIGGER LLM GENERATION ────────────────────────────────────────────────────

@app.post("/api/teacher/units/{unit_id}/generate")
def generate_content(unit_id: str, background_tasks: BackgroundTasks):
    unit = units_col.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(404, "Unit not found")
    # Pass reference_text so the LLM grounds content in teacher's material
    reference_text = unit.get("reference_text", "") or ""
    background_tasks.add_task(_generate_all_content, unit_id, unit["topic"], reference_text)
    return {"message": "Generation started."}


def _generate_all_content(unit_id: str, topic: str, reference_text: str = ""):
    from app.llm_generator import generate_all, generate_fallback

    subs = list(subtopics_col.find({"unit_id": unit_id}))
    for sub in subs:
        sub_id = str(sub["_id"])
        try:
            generated = generate_all(topic, sub["name"], reference_text)
        except Exception:
            traceback.print_exc()
            generated = generate_fallback(topic, sub["name"])

        for ctype, cdata in generated.items():
            content_col.update_one(
                {"subtopic_id": sub_id, "type": ctype},
                {"$set": {
                    "subtopic_id":    sub_id,
                    "unit_id":        unit_id,
                    "topic":          topic,
                    "subtopic_name":  sub["name"],
                    "type":           ctype,
                    "data":           cdata,
                    "approved":       False,
                    "updated_at":     _now(),
                }},
                upsert=True,
            )
        subtopics_col.update_one(
            {"_id": ObjectId(sub_id)},
            {"$set": {"generation_status": "done"}}
        )

    units_col.update_one(
        {"_id": ObjectId(unit_id)},
        {"$set": {"status": "ready"}}
    )


# ── UNIT STATUS & REVIEW ──────────────────────────────────────────────────────

@app.get("/api/teacher/units/{unit_id}/status")
def unit_status(unit_id: str):
    unit = units_col.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(404, "Unit not found")
    return {"status": unit.get("status", "unknown"), "topic": unit["topic"]}


@app.get("/api/teacher/units/{unit_id}/review")
def review_content(unit_id: str):
    subs = list(subtopics_col.find(
        {"unit_id": unit_id},
        {"_id": 1, "name": 1, "order": 1, "content_approved": 1}
    ))
    result = []
    for sub in subs:
        sub_id = str(sub["_id"])
        pieces = list(content_col.find({"subtopic_id": sub_id}))
        result.append({
            "subtopic_id":      sub_id,
            "name":             sub["name"],
            "order":            sub["order"],
            "content_approved": sub.get("content_approved", False),
            "content": [
                {"type": p["type"], "data": p["data"], "approved": p.get("approved", False)}
                for p in pieces
            ],
        })
    result.sort(key=lambda x: x["order"])
    return {"unit_id": unit_id, "subtopics": result}


@app.post("/api/teacher/approve")
def approve_subtopic(req: ApproveContentRequest):
    content_col.update_many(
        {"subtopic_id": req.subtopic_id},
        {"$set": {"approved": True}}
    )
    subtopics_col.update_one(
        {"_id": ObjectId(req.subtopic_id)},
        {"$set": {"content_approved": True}}
    )
    return {"message": "Subtopic approved and live for students."}


@app.get("/api/teacher/units")
def list_units(teacher_id: str):
    units = list(units_col.find({"teacher_id": teacher_id}))
    return {"units": [_oid(u) for u in units]}


# ── ESCALATION DASHBOARD ──────────────────────────────────────────────────────

@app.get("/api/teacher/escalations")
def get_escalations():
    escs = list(escalations_col.find({"resolved": False}).sort("created_at", -1))
    return {"escalations": [_oid(e) for e in escs]}


@app.post("/api/teacher/escalations/resolve")
def resolve_escalation(req: ResolveEscalationRequest):
    esc = escalations_col.find_one({"_id": ObjectId(req.escalation_id)})
    if not esc:
        raise HTTPException(404, "Escalation not found")
    escalations_col.update_one(
        {"_id": ObjectId(req.escalation_id)},
        {"$set": {"resolved": True, "teacher_note": req.teacher_note, "resolved_at": _now()}}
    )
    mastery_col.update_one(
        {"student_id": esc["student_id"], "subtopic_id": esc["subtopic_id"]},
        {"$set": {"consecutive_wrong": 0, "escalated": False, "status": "skipped"}}
    )
    return {"message": "Student unblocked."}


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT — TOPICS LIST
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/student/topics")
def get_topics():
    units = list(units_col.find({"status": "ready"}))
    result = []
    for u in units:
        unit_id = str(u["_id"])
        sub_count = subtopics_col.count_documents({"unit_id": unit_id, "content_approved": True})
        result.append({
            "unit_id":             unit_id,
            "topic":               u["topic"],
            "approved_subtopics":  sub_count,
        })
    return {"topics": result}


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT — NEXT ACTIVITY
# Returns what the student should see: content + question
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/student/next-activity")
def next_activity(student_id: str, unit_id: str):
    # all approved subtopics in order
    subs = list(subtopics_col.find(
        {"unit_id": unit_id, "content_approved": True}
    ).sort("order", 1))

    if not subs:
        raise HTTPException(404, "No approved content yet — teacher needs to approve subtopics.")

    # find the first subtopic not yet mastered / skipped
    current_sub = None
    total = len(subs)
    done  = 0

    for sub in subs:
        sub_id  = str(sub["_id"])
        mastery = mastery_col.find_one({"student_id": student_id, "subtopic_id": sub_id})
        if mastery:
            status = mastery.get("status", "active")
            if status in ("mastered", "skipped"):
                done += 1
                continue
            # still waiting for teacher to resolve escalation — skip ahead
            if mastery.get("escalated", False):
                esc = escalations_col.find_one({
                    "student_id": student_id,
                    "subtopic_id": sub_id,
                    "resolved": False,
                })
                if esc:
                    done += 1
                    continue
        current_sub = sub
        break

    # all done
    if current_sub is None:
        return _build_summary(student_id, unit_id, subs)

    sub_id = str(current_sub["_id"])
    mastery_doc       = mastery_col.find_one({"student_id": student_id, "subtopic_id": sub_id})
    consecutive_wrong = mastery_doc["consecutive_wrong"] if mastery_doc else 0
    mastery_score     = mastery_doc["mastery_score"]     if mastery_doc else 0

    # init mastery record on first visit
    if mastery_doc is None:
        mastery_col.insert_one({
            "student_id":       student_id,
            "subtopic_id":      sub_id,
            "unit_id":          unit_id,
            "mastery_score":    0,
            "consecutive_wrong": 0,
            "attempt_number":   0,
            "hint_used_count":  0,
            "status":           "active",
            "escalated":        False,
            "created_at":       _now(),
        })

    # decide content based on consecutive wrong
    decision     = decide(consecutive_wrong)
    content_type = decision["content_type"]
    q_type       = decision["question_type"]
    show_hint    = decision["show_hint"]

    # High-mastery students (score >= 70) get a harder question to stay challenged.
    # Only applies when the engine would normally serve the standard question
    # (i.e. no support sequence is active — consecutive_wrong == 0).
    if mastery_score >= 70 and consecutive_wrong == 0:
        q_type = "hard_question"

    content_piece  = content_col.find_one({"subtopic_id": sub_id, "type": content_type,  "approved": True})
    question_piece = content_col.find_one({"subtopic_id": sub_id, "type": q_type,        "approved": True})
    hint_piece     = content_col.find_one({"subtopic_id": sub_id, "type": "hint",        "approved": True})

    # fallback if specific content type missing
    if not content_piece:
        content_piece = content_col.find_one({"subtopic_id": sub_id, "type": "main_explanation", "approved": True})
    if not question_piece:
        # hard_question might not exist in older content — fall back gracefully
        question_piece = content_col.find_one({"subtopic_id": sub_id, "type": "question", "approved": True})

    if not content_piece or not question_piece:
        raise HTTPException(404, f"Content not found for '{current_sub['name']}'.")

    return {
        "subtopic_id":      sub_id,
        "subtopic_name":    current_sub["name"],
        "topic":            current_sub["topic"],
        "mastery_score":    mastery_score,
        "consecutive_wrong": consecutive_wrong,
        "progress":         {"done": done, "total": total},
        "action":           decision["action"],
        "message":          decision["message"],
        "show_hint":        show_hint,
        "content":          content_piece["data"],
        "content_type":     content_type,
        "question":         question_piece["data"],
        "question_type":    q_type,
        "hint":             hint_piece["data"]["text"] if hint_piece else "",
    }


def _build_summary(student_id: str, unit_id: str, subs: list) -> dict:
    records  = []
    total_sc = 0
    for sub in subs:
        sub_id = str(sub["_id"])
        m      = mastery_col.find_one({"student_id": student_id, "subtopic_id": sub_id})
        score  = m["mastery_score"] if m else 0
        total_sc += score
        records.append({
            "subtopic":      sub["name"],
            "mastery_score": score,
            "status":        m.get("status", "not_started") if m else "not_started",
        })
    avg = total_sc // len(subs) if subs else 0
    return {
        "completed": True,
        "avg_mastery": avg,
        "subtopics": records,
        "progress": {"done": len(subs), "total": len(subs)},
        "message": "🎉 You completed all subtopics!" if avg >= 60 else "Great effort! Keep practising.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT — SUBMIT ANSWER
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/student/submit-answer")
def submit_answer(req: SubmitAnswerRequest):
    sub = subtopics_col.find_one({"_id": ObjectId(req.subtopic_id)})
    if not sub:
        raise HTTPException(404, "Subtopic not found")

    sub_id      = req.subtopic_id
    mastery_doc = mastery_col.find_one({"student_id": req.student_id, "subtopic_id": sub_id})

    consecutive_wrong = mastery_doc["consecutive_wrong"] if mastery_doc else 0
    mastery_score     = mastery_doc["mastery_score"]     if mastery_doc else 0
    attempt_number    = mastery_doc["attempt_number"]    if mastery_doc else 0

    # find the question that was shown
    q_type         = decide(consecutive_wrong)["question_type"]
    question_piece = content_col.find_one({"subtopic_id": sub_id, "type": q_type, "approved": True})
    if not question_piece:
        question_piece = content_col.find_one({"subtopic_id": sub_id, "type": "question", "approved": True})
    if not question_piece:
        raise HTTPException(404, "Question not found")

    q_data   = question_piece["data"]
    correct  = (req.selected_option == q_data["correct"])

    # score: +10 no hint, +5 with hint, -5 wrong
    if correct:
        delta = 5 if req.hint_used else 10
    else:
        delta = -5

    new_score = max(0, min(100, mastery_score + delta))
    # 1 correct = move on → reset consecutive_wrong
    new_wrong = 0 if correct else consecutive_wrong + 1

    # record attempt
    attempts_col.insert_one({
        "student_id":      req.student_id,
        "subtopic_id":     sub_id,
        "selected_option": req.selected_option,
        "correct":         correct,
        "hint_used":       req.hint_used,
        "mastery_before":  mastery_score,
        "mastery_after":   new_score,
        "timestamp":       _now(),
    })

    # escalation check
    escalated  = False
    new_status = "active"

    if correct:
        # ONE correct = mastered the concept
        new_status = "mastered"
    elif new_wrong >= 5:
        escalated  = True
        new_status = "escalated"
        existing   = escalations_col.find_one({
            "student_id": req.student_id,
            "subtopic_id": sub_id,
            "resolved": False,
        })
        if not existing:
            escalations_col.insert_one({
                "student_id":    req.student_id,
                "subtopic_id":   sub_id,
                "unit_id":       sub.get("unit_id", ""),
                "subtopic_name": sub["name"],
                "mastery_score": new_score,
                "attempt_count": attempt_number + 1,
                "resolved":      False,
                "created_at":    _now(),
            })

    # update mastery
    mastery_col.update_one(
        {"student_id": req.student_id, "subtopic_id": sub_id},
        {"$set": {
            "mastery_score":     new_score,
            "consecutive_wrong": new_wrong,
            "attempt_number":    attempt_number + 1,
            "hint_used_count":   (mastery_doc.get("hint_used_count", 0) if mastery_doc else 0) + (1 if req.hint_used else 0),
            "status":            new_status,
            "escalated":         escalated,
            "last_updated":      _now(),
        }},
        upsert=True,
    )

    # next decision (for frontend to know what's coming)
    next_decision = decide(new_wrong)

    return {
        "correct":          correct,
        "correct_option":   q_data["correct"],
        "explanation":      q_data.get("explanation", ""),
        "mastery_score":    new_score,
        "mastery_delta":    delta,
        "consecutive_wrong": new_wrong,
        "status":           new_status,
        "escalated":        escalated,
        "next_action":      next_decision["action"],
        "next_message":     next_decision["message"],
    }


# ── STUDENT MASTERY SUMMARY ───────────────────────────────────────────────────

@app.get("/api/student/mastery")
def get_mastery(student_id: str, unit_id: str):
    subs = list(subtopics_col.find({"unit_id": unit_id}).sort("order", 1))
    records = []
    for sub in subs:
        sub_id = str(sub["_id"])
        m = mastery_col.find_one({"student_id": student_id, "subtopic_id": sub_id})
        records.append({
            "subtopic_id":   sub_id,
            "name":          sub["name"],
            "mastery_score": m["mastery_score"] if m else 0,
            "status":        m.get("status", "not_started") if m else "not_started",
            "attempts":      m.get("attempt_number", 0) if m else 0,
        })
    return {"student_id": student_id, "unit_id": unit_id, "subtopics": records}
