from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import json
import datetime

from database import get_db
import models
from routers.auth import get_current_user
from services.ai_engine import analyze_image_with_ai

router = APIRouter(prefix="/api/image-chats", tags=["image-chats"])

class SessionCreate(BaseModel):
    images: List[str] # List of base64 encoded images
    initial_question: str

class MessageCreate(BaseModel):
    text: str

@router.post("/session")
async def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not payload.images:
        raise HTTPException(status_code=400, detail="At least one image must be uploaded.")
    if not payload.initial_question.strip():
        raise HTTPException(status_code=400, detail="Initial question cannot be empty.")

    # Generate a descriptive title
    q_snippet = payload.initial_question.strip()
    title = q_snippet[:40] + "..." if len(q_snippet) > 40 else q_snippet

    # Formulate initial message logs
    welcome_message = {
        "id": 1,
        "text": "Hi! I've loaded your visual material. Ask me anything about it!",
        "sender": "ai",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    user_message = {
        "id": 2,
        "text": payload.initial_question,
        "sender": "user",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

    initial_messages = [welcome_message, user_message]

    try:
        # Get AI explanation
        ai_response_text = await analyze_image_with_ai(initial_messages, payload.images)
        
        ai_message = {
            "id": 3,
            "text": ai_response_text,
            "sender": "ai",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        initial_messages.append(ai_message)

        # Save to database
        session = models.ImageChatSession(
            user_id=current_user.id,
            title=title,
            images=json.dumps(payload.images),
            messages=json.dumps(initial_messages)
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        return {
            "id": session.id,
            "title": session.title,
            "images": payload.images,
            "messages": initial_messages,
            "created_at": session.created_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze images: {str(e)}")

@router.get("/sessions")
def get_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sessions = db.query(models.ImageChatSession).filter(
        models.ImageChatSession.user_id == current_user.id
    ).order_by(models.ImageChatSession.created_at.desc()).all()

    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at
        }
        for s in sessions
    ]

@router.get("/session/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    session = db.query(models.ImageChatSession).filter(
        models.ImageChatSession.id == session_id,
        models.ImageChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Image chat session not found.")

    try:
        images_list = json.loads(session.images)
        messages_list = json.loads(session.messages)
    except Exception:
        images_list = []
        messages_list = []

    return {
        "id": session.id,
        "title": session.title,
        "images": images_list,
        "messages": messages_list,
        "created_at": session.created_at
    }

@router.post("/session/{session_id}/message")
async def send_followup_message(
    session_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    session = db.query(models.ImageChatSession).filter(
        models.ImageChatSession.id == session_id,
        models.ImageChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Image chat session not found.")

    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Message text cannot be empty.")

    try:
        images_list = json.loads(session.images)
        messages_list = json.loads(session.messages)
    except Exception:
        raise HTTPException(status_code=500, detail="Corrupted session data.")

    # Append user message
    user_message = {
        "id": len(messages_list) + 1,
        "text": payload.text,
        "sender": "user",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    messages_list.append(user_message)

    try:
        # Call vision AI
        ai_response_text = await analyze_image_with_ai(messages_list, images_list)

        # Append AI response
        ai_message = {
            "id": len(messages_list) + 1,
            "text": ai_response_text,
            "sender": "ai",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        messages_list.append(ai_message)

        # Update database
        session.messages = json.dumps(messages_list)
        db.commit()

        return ai_message
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get response: {str(e)}")

@router.delete("/session/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    session = db.query(models.ImageChatSession).filter(
        models.ImageChatSession.id == session_id,
        models.ImageChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Image chat session not found.")

    db.delete(session)
    db.commit()

    return {"detail": "Session deleted successfully."}
