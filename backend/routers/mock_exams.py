from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from pydantic import BaseModel
import json
import datetime

from database import get_db
import models
from routers.auth import get_current_user
from services.ai_engine import (
    generate_mock_exam_questions,
    grade_mock_exam_short_answers,
    analyze_mock_exam_performance
)

router = APIRouter(prefix="/api/mock-exams", tags=["mock-exams"])

class ExamCreate(BaseModel):
    set_id: int
    difficulty: str # 'Easy', 'Medium', 'Hard', 'Exam Level'
    time_limit: int # in minutes

class ExamSubmit(BaseModel):
    user_answers: Dict[str, str] # { "question_id": "user answer" }
    time_taken: int # in seconds

def strip_answers_from_questions(questions: list) -> list:
    """Strips correct answers and explanations from questions before sending to client."""
    stripped = []
    for q in questions:
        q_copy = dict(q)
        q_copy.pop("correct_answer", None)
        q_copy.pop("explanation", None)
        q_copy.pop("blank_word", None)
        stripped.append(q_copy)
    return stripped

@router.post("/generate")
async def create_mock_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify set exists and belongs to user
    study_set = db.query(models.FlashcardSet).filter(
        models.FlashcardSet.id == payload.set_id,
        models.FlashcardSet.user_id == current_user.id
    ).first()
    
    if not study_set:
        raise HTTPException(status_code=404, detail="Study material not found")

    # Gather fallback data if raw content is empty
    fallback_data = {
        "title": study_set.title,
        "summary": study_set.summary or "",
        "key_points": json.loads(study_set.key_points) if study_set.key_points else [],
        "quiz": json.loads(study_set.quiz) if study_set.quiz else [],
        "true_false": json.loads(study_set.true_false) if study_set.true_false else [],
        "fill_blanks": json.loads(study_set.fill_blanks) if study_set.fill_blanks else [],
    }

    try:
        # Generate 30 questions
        questions = await generate_mock_exam_questions(
            text=study_set.raw_content or "",
            difficulty=payload.difficulty,
            fallback_data=fallback_data
        )
        
        # Save attempt to database
        db_attempt = models.MockExamAttempt(
            user_id=current_user.id,
            set_id=payload.set_id,
            title=f"{study_set.title} - Mock Exam",
            difficulty=payload.difficulty,
            time_limit=payload.time_limit,
            questions=json.dumps(questions),
            is_submitted=False
        )
        
        db.add(db_attempt)
        db.commit()
        db.refresh(db_attempt)

        # Return with stripped questions
        return {
            "id": db_attempt.id,
            "title": db_attempt.title,
            "difficulty": db_attempt.difficulty,
            "time_limit": db_attempt.time_limit,
            "created_at": db_attempt.created_at,
            "is_submitted": db_attempt.is_submitted,
            "questions": strip_answers_from_questions(questions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate exam: {str(e)}")

@router.get("/history")
def get_exam_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    attempts = db.query(models.MockExamAttempt).filter(
        models.MockExamAttempt.user_id == current_user.id
    ).order_by(models.MockExamAttempt.created_at.desc()).all()
    
    return [
        {
            "id": a.id,
            "set_id": a.set_id,
            "title": a.title,
            "difficulty": a.difficulty,
            "time_limit": a.time_limit,
            "time_taken": a.time_taken,
            "score": a.score,
            "percentage": a.percentage,
            "created_at": a.created_at,
            "is_submitted": a.is_submitted
        }
        for a in attempts
    ]

@router.get("/history/{set_id}")
def get_exam_history_for_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    attempts = db.query(models.MockExamAttempt).filter(
        models.MockExamAttempt.user_id == current_user.id,
        models.MockExamAttempt.set_id == set_id
    ).order_by(models.MockExamAttempt.created_at.desc()).all()
    
    return [
        {
            "id": a.id,
            "title": a.title,
            "difficulty": a.difficulty,
            "time_limit": a.time_limit,
            "time_taken": a.time_taken,
            "score": a.score,
            "percentage": a.percentage,
            "created_at": a.created_at,
            "is_submitted": a.is_submitted
        }
        for a in attempts
    ]

@router.get("/{exam_id}")
def get_mock_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    attempt = db.query(models.MockExamAttempt).filter(
        models.MockExamAttempt.id == exam_id,
        models.MockExamAttempt.user_id == current_user.id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Mock exam not found")
        
    questions = json.loads(attempt.questions)
    
    if not attempt.is_submitted:
        # Strip answers
        return {
            "id": attempt.id,
            "set_id": attempt.set_id,
            "title": attempt.title,
            "difficulty": attempt.difficulty,
            "time_limit": attempt.time_limit,
            "created_at": attempt.created_at,
            "is_submitted": False,
            "questions": strip_answers_from_questions(questions)
        }
    else:
        # Return full results
        user_answers = json.loads(attempt.user_answers) if attempt.user_answers else {}
        analysis = json.loads(attempt.analysis) if attempt.analysis else {}
        return {
            "id": attempt.id,
            "set_id": attempt.set_id,
            "title": attempt.title,
            "difficulty": attempt.difficulty,
            "time_limit": attempt.time_limit,
            "time_taken": attempt.time_taken,
            "score": attempt.score,
            "percentage": attempt.percentage,
            "created_at": attempt.created_at,
            "is_submitted": True,
            "questions": questions, # Full questions with answers & explanations
            "user_answers": user_answers,
            "analysis": analysis
        }

@router.post("/{exam_id}/submit")
async def submit_mock_exam(
    exam_id: int,
    payload: ExamSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    attempt = db.query(models.MockExamAttempt).filter(
        models.MockExamAttempt.id == exam_id,
        models.MockExamAttempt.user_id == current_user.id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Mock exam not found")
        
    if attempt.is_submitted:
        raise HTTPException(status_code=400, detail="Exam has already been submitted")
        
    questions = json.loads(attempt.questions)
    user_answers = payload.user_answers
    
    # 1. Programmatic grading of MCQs, True/False, and Fill-in-the-Blank
    # 2. Call AI to grade Short Answer
    short_answer_grades = {}
    has_short_answers = any(q.get("type") == "short_answer" for q in questions)
    if has_short_answers:
        try:
            short_answer_grades = await grade_mock_exam_short_answers(questions, user_answers)
        except Exception as e:
            # Continue with empty grading if LLM fails, graded_questions logic handles fallback
            pass

    graded_questions = []
    total_score = 0.0
    
    for q in questions:
        qid = str(q.get("id"))
        qtype = q.get("type")
        u_ans = user_answers.get(qid, "")
        
        q_graded = dict(q)
        q_graded["user_answer"] = u_ans
        
        if qtype == "mcq":
            correct_ans = q.get("correct_answer")
            is_correct = str(u_ans).strip().lower() == str(correct_ans).strip().lower()
            q_graded["is_correct"] = is_correct
            if is_correct:
                total_score += 1.0
                
        elif qtype == "true_false":
            correct_ans = q.get("correct_answer")
            # Convert user answer to boolean for comparison
            u_ans_bool = None
            if isinstance(u_ans, bool):
                u_ans_bool = u_ans
            elif isinstance(u_ans, str):
                if u_ans.lower() == "true": u_ans_bool = True
                elif u_ans.lower() == "false": u_ans_bool = False
            
            # Convert correct answer to boolean (handles LLM string representation)
            correct_ans_bool = None
            if isinstance(correct_ans, bool):
                correct_ans_bool = correct_ans
            elif isinstance(correct_ans, str):
                if correct_ans.lower() in ("true", "t", "yes", "1"): correct_ans_bool = True
                elif correct_ans.lower() in ("false", "f", "no", "0"): correct_ans_bool = False
                
            is_correct = u_ans_bool == correct_ans_bool if correct_ans_bool is not None and u_ans_bool is not None else False
            q_graded["is_correct"] = is_correct
            if is_correct:
                total_score += 1.0
                
        elif qtype == "fill_blank":
            blank_word = q.get("blank_word", "")
            is_correct = str(u_ans).strip().lower() == str(blank_word).strip().lower()
            q_graded["is_correct"] = is_correct
            if is_correct:
                total_score += 1.0
                
        elif qtype == "short_answer":
            grade_info = short_answer_grades.get(qid, {"score": 0, "feedback": "No answer provided."})
            score_out_of_10 = grade_info.get("score", 0)
            score_points = score_out_of_10 / 10.0
            
            q_graded["is_correct"] = score_out_of_10 >= 7
            q_graded["score"] = score_out_of_10
            q_graded["feedback"] = grade_info.get("feedback", "")
            total_score += score_points
            
        graded_questions.append(q_graded)

    final_score = int(round(total_score))
    percentage = int(round((total_score / 30.0) * 100.0))
    
    # 3. Perform performance analysis using LLM
    try:
        analysis = await analyze_mock_exam_performance(graded_questions)
    except Exception:
        analysis = {
            "strong_topics": ["Mock Exam Practice"],
            "weak_topics": ["Self-Review Needed"],
            "recommendations": ["Review all incorrect answers in detail."]
        }

    # 4. Save results to MockExamAttempt
    attempt.score = final_score
    attempt.percentage = percentage
    attempt.time_taken = payload.time_taken
    attempt.is_submitted = True
    attempt.questions = json.dumps(graded_questions) # Overwrite with graded info (user answers included)
    attempt.user_answers = json.dumps(user_answers)
    attempt.analysis = json.dumps(analysis)
    
    db.commit()
    db.refresh(attempt)

    # 5. Update overall user stats
    user_stats = db.query(models.UserStats).filter(models.UserStats.user_id == current_user.id).first()
    if not user_stats:
        user_stats = models.UserStats(
            user_id=current_user.id,
            quiz_attempts=1,
            quiz_accuracy=percentage,
            time_spent_studying=payload.time_taken
        )
        db.add(user_stats)
    else:
        if user_stats.quiz_attempts is None:
            user_stats.quiz_attempts = 0
        user_stats.quiz_attempts += 1
        
        # Simple rolling average
        user_stats.quiz_accuracy = percentage if user_stats.quiz_accuracy == 0 else (user_stats.quiz_accuracy + percentage) // 2
        
        if user_stats.time_spent_studying is None:
            user_stats.time_spent_studying = 0
        user_stats.time_spent_studying += payload.time_taken
        
    db.commit()

    return {
        "id": attempt.id,
        "set_id": attempt.set_id,
        "title": attempt.title,
        "difficulty": attempt.difficulty,
        "time_limit": attempt.time_limit,
        "time_taken": attempt.time_taken,
        "score": attempt.score,
        "percentage": attempt.percentage,
        "created_at": attempt.created_at,
        "is_submitted": True,
        "questions": graded_questions,
        "user_answers": user_answers,
        "analysis": analysis
    }
