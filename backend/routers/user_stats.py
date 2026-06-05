from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/user-stats", tags=["user_stats"])

from pydantic import BaseModel

class AccuracyUpdate(BaseModel):
    type: str # 'quiz', 'true_false', 'fill_blank'
    accuracy: int # percentage 0-100

@router.put("/quiz")
def increment_quiz_attempts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_stats = db.query(models.UserStats).filter(models.UserStats.user_id == current_user.id).first()
    
    if not user_stats:
        user_stats = models.UserStats(user_id=current_user.id, quiz_attempts=1)
        db.add(user_stats)
    else:
        if user_stats.quiz_attempts is None:
            user_stats.quiz_attempts = 0
        user_stats.quiz_attempts += 1
        
    db.commit()
    return {"message": "Quiz attempts incremented", "quiz_attempts": user_stats.quiz_attempts}

@router.put("/accuracy")
def update_accuracy(payload: AccuracyUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_stats = db.query(models.UserStats).filter(models.UserStats.user_id == current_user.id).first()
    if not user_stats:
        user_stats = models.UserStats(user_id=current_user.id)
        db.add(user_stats)
    
    # Simple rolling average logic for MVP scale
    if payload.type == 'quiz':
        user_stats.quiz_accuracy = payload.accuracy if user_stats.quiz_accuracy == 0 else (user_stats.quiz_accuracy + payload.accuracy) // 2
    elif payload.type == 'true_false':
        user_stats.true_false_accuracy = payload.accuracy if user_stats.true_false_accuracy == 0 else (user_stats.true_false_accuracy + payload.accuracy) // 2
    elif payload.type == 'fill_blank':
        user_stats.fill_blank_accuracy = payload.accuracy if user_stats.fill_blank_accuracy == 0 else (user_stats.fill_blank_accuracy + payload.accuracy) // 2
        
    db.commit()
    return {"message": "Accuracy mapped"}

@router.put("/studied")
def increment_cards_studied(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_stats = db.query(models.UserStats).filter(models.UserStats.user_id == current_user.id).first()
    if not user_stats:
        user_stats = models.UserStats(user_id=current_user.id, total_flashcards_studied=1)
        db.add(user_stats)
    else:
        if user_stats.total_flashcards_studied is None:
            user_stats.total_flashcards_studied = 0
        user_stats.total_flashcards_studied += 1
        
    db.commit()
    return {"message": "Flashcards studied incremented", "total": user_stats.total_flashcards_studied}

import datetime
from sqlalchemy import func

@router.put("/activity")
def log_activity(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    activity = models.ActivityLog(user_id=current_user.id, date=datetime.datetime.utcnow())
    db.add(activity)
    db.commit()
    return {"message": "Activity logged"}

@router.get("/activity/weekly")
def get_weekly_activity(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    today = datetime.datetime.utcnow().date()
    start_date = today - datetime.timedelta(days=6)
    
    # Get all logs for last 7 days
    logs = db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == current_user.id,
        func.date(models.ActivityLog.date) >= start_date
    ).all()
    
    # Initialize the week with 0 sessions
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    activity_map = {}
    for i in range(7):
        d = start_date + datetime.timedelta(days=i)
        day_name = days[d.weekday()]
        activity_map[day_name] = 0
        
    for log in logs:
        day_name = days[log.date.weekday()]
        if day_name in activity_map:
            activity_map[day_name] += 1
            
    # Return as an array of objects for Recharts
    # Recharts expects the array to be in order. We can just sort by Mon-Sun, but actually it's better to sort chronologically.
    # However, Recharts usually displays them in array order. So let's build chronologically:
    result = []
    for i in range(7):
        d = start_date + datetime.timedelta(days=i)
        day_name = days[d.weekday()]
        result.append({
            "name": day_name,
            "sessions": activity_map[day_name]
        })
        
    return result
