from uuid import UUID
from datetime import datetime, time
import logging
import json
import threading
import os
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.security import django_auth

from walkquest.walks.models import Walk, Adventure
from .models import Achievement
from walkquest.walks.models import Companion, WalkCategoryTag
from .schemas import (
    AdventureIn,
    AdventureOut,
    CompanionCreate,
    CompanionOut,
    CompanionList,
    ErrorResponse,
)

# Set up logging
logger = logging.getLogger(__name__)

# Create companions router with authentication
companions_router = Router(auth=django_auth, tags=["companions"])

@companions_router.get(
    "/",
    response=CompanionList,
    summary="List all companions",
)
def list_companions(request):
    """List all companions for the current user."""
    companions = Companion.objects.filter(user=request.user)
    return CompanionList(
        companions=[
            CompanionOut(id=c.id, name=c.name)
            for c in companions
        ],
    )

@companions_router.post(
    "/",
    response={201: CompanionOut, 422: ErrorResponse},
    summary="Create a new companion",
)
def create_companion(request, data: CompanionCreate):
    """Create a new companion."""
    try:
        companion = Companion.objects.create(
            user=request.user,
            name=data.name,
        )
        return 201, CompanionOut(id=companion.id, name=companion.name)
    except ValueError as e:
        return 422, ErrorResponse(message=str(e))

@companions_router.delete(
    "/{companion_id}",
    response={204: None, 404: ErrorResponse},
    summary="Delete a companion",
)
def delete_companion(request, companion_id: UUID):
    """Delete a companion."""
    try:
        companion = Companion.objects.get(
            id=companion_id,
            user=request.user,
        )
        companion.delete()
        return 204, None
    except Companion.DoesNotExist:
        return 404, ErrorResponse(message="Companion not found")

# Create main adventures router with authentication
router = Router(auth=django_auth, tags=["adventures"])

# Add companions as nested router
router.add_router("/companions", companions_router)

@router.get(
    "/",
    response=list[AdventureOut],
    summary="List all adventures",
)
def list_adventures(request):
    """List all adventures for the current user."""
    achievements = (
        Achievement.objects.filter(user=request.user)
        .select_related("adventure")
    )
    adventures = [achievement.adventure for achievement in achievements]
    
    return [
        AdventureOut(
            id=adventure.id,
            title=adventure.title,
            description=adventure.description,
            start_date=adventure.start_date,
            end_date=adventure.end_date,
            start_time=adventure.start_time,
            end_time=adventure.end_time,
            difficulty_level=adventure.difficulty_level,
            categories=[cat.slug for cat in adventure.related_categories.all()],
            companions=[
                CompanionOut(id=c.id, name=c.name)
                for c in adventure.companions.all()
            ],
            created_at=adventure.created_at.isoformat(),
            updated_at=adventure.updated_at.isoformat(),
            is_public=getattr(adventure, 'is_public', True),
            start_location=getattr(adventure, 'start_location', None),
            end_location=getattr(adventure, 'end_location', None),
        )
        for adventure in adventures
    ]

@router.post(
    "/log",
    response={201: AdventureOut, 422: ErrorResponse},
    summary="Create an adventure log",
)
def create_adventure(request, data: AdventureIn):
    """Create a new adventure log."""
    process_id = os.getpid()
    thread_id = threading.get_ident()
    
    logger.info(f"[PID:{process_id}|TID:{thread_id}] Received adventure log request: {json.dumps({
        'title': data.title,
        'difficulty_level': data.difficulty_level,
        'start_date': str(data.start_date),
        'end_date': str(data.end_date),
        'start_time': str(data.start_time),
        'end_time': str(data.end_time),
        'categories': data.categories,
        'walk_id': str(data.walk_id) if data.walk_id else None,
        'is_public': data.is_public,
        'start_location': data.start_location,
        'end_location': data.end_location,
    }, default=str)}")
    
    try:
        # Parse time strings if they are provided as strings
        start_time = data.start_time
        end_time = data.end_time
        
        # Handle string-formatted times (like "20:57")
        if isinstance(start_time, str):
            try:
                hours, minutes = map(int, start_time.split(':'))
                start_time = time(hour=hours, minute=minutes)
                logger.debug(f"[PID:{process_id}|TID:{thread_id}] Parsed start_time string '{data.start_time}' to time object {start_time}")
            except (ValueError, TypeError) as e:
                error_msg = f"Invalid start_time format: {data.start_time}. Expected format: HH:MM"
                logger.error(f"[PID:{process_id}|TID:{thread_id}] {error_msg}. Error: {str(e)}")
                return 422, ErrorResponse(message=error_msg)
        
        if isinstance(end_time, str):
            try:
                hours, minutes = map(int, end_time.split(':'))
                end_time = time(hour=hours, minute=minutes)
                logger.debug(f"[PID:{process_id}|TID:{thread_id}] Parsed end_time string '{data.end_time}' to time object {end_time}")
            except (ValueError, TypeError) as e:
                error_msg = f"Invalid end_time format: {data.end_time}. Expected format: HH:MM"
                logger.error(f"[PID:{process_id}|TID:{thread_id}] {error_msg}. Error: {str(e)}")
                return 422, ErrorResponse(message=error_msg)
        
        # Create the adventure first
        adventure = Adventure.objects.create(
            title=data.title,
            description=data.description,
            start_date=data.start_date,
            end_date=data.end_date,
            start_time=start_time,
            end_time=end_time,
            difficulty_level=data.difficulty_level,
            is_public=data.is_public,
            start_location=data.start_location or "",
            end_location=data.end_location or "",
        )
        logger.info(f"[PID:{process_id}|TID:{thread_id}] Created adventure: {adventure.id}")

        # Add categories
        if data.categories:
            categories = WalkCategoryTag.objects.filter(slug__in=data.categories)
            adventure.related_categories.set(categories)
            logger.debug(f"[PID:{process_id}|TID:{thread_id}] Added categories: {[c.slug for c in categories]}")

        # Add companions
        if data.companion_ids:
            companions = Companion.objects.filter(
                id__in=data.companion_ids,
                user=request.user,
            )
            adventure.companions.set(companions)
            logger.debug(f"[PID:{process_id}|TID:{thread_id}] Added companions: {[str(c.id) for c in companions]}")

        # Create achievement to link adventure to user
        achievement = Achievement.objects.create(
            user=request.user,
            adventure=adventure,
            visibility="PUBLIC" if data.is_public else "PRIVATE",
        )
        logger.info(f"[PID:{process_id}|TID:{thread_id}] Created achievement: {achievement.id}")

        # If walk_id is provided, update the walk to link to this adventure
        if data.walk_id:
            walk = get_object_or_404(Walk, id=data.walk_id)
            walk.adventure = adventure
            walk.save()
            logger.info(f"[PID:{process_id}|TID:{thread_id}] Linked walk {walk.id} to adventure {adventure.id}")

        response_data = AdventureOut(
            id=adventure.id,
            title=adventure.title,
            description=adventure.description,
            start_date=adventure.start_date,
            end_date=adventure.end_date,
            start_time=adventure.start_time,
            end_time=adventure.end_time,
            difficulty_level=adventure.difficulty_level,
            categories=[cat.slug for cat in adventure.related_categories.all()],
            companions=[
                CompanionOut(id=c.id, name=c.name)
                for c in adventure.companions.all()
            ],
            created_at=adventure.created_at.isoformat(),
            updated_at=adventure.updated_at.isoformat(),
            is_public=adventure.is_public,
            start_location=adventure.start_location,
            end_location=adventure.end_location,
        )
        
        logger.info(f"[PID:{process_id}|TID:{thread_id}] Adventure log created successfully: {adventure.id}")
        return 201, response_data

    except (Walk.DoesNotExist, Adventure.DoesNotExist) as e:
        error_msg = str(e)
        logger.error(f"[PID:{process_id}|TID:{thread_id}] Not found error: {error_msg}")
        return 404, ErrorResponse(message=error_msg)
    except (ValueError, ValidationError) as e:
        error_msg = str(e)
        logger.error(f"[PID:{process_id}|TID:{thread_id}] Validation error: {error_msg}")
        return 422, ErrorResponse(message=error_msg)
    except Exception as e:
        # Catch-all for unexpected errors
        error_msg = f"Unexpected error: {str(e)}"
        logger.exception(f"[PID:{process_id}|TID:{thread_id}] {error_msg}")
        return 500, ErrorResponse(message="Server error occurred. Please try again later.")