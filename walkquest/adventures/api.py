from typing import List
from uuid import UUID

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
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

# Create router with authentication
router = Router(auth=django_auth)

@router.post(
    "/adventures/log", 
    response={201: AdventureOut, 422: ErrorResponse},
    tags=["adventures"],
    summary="Log a new adventure")
def create_adventure(request, data: AdventureIn):
    """Create a new adventure log."""
    try:
        # Get the walk
        walk = get_object_or_404(Walk, id=data.walk_id)
        
        # Create the adventure
        adventure = Adventure.objects.create(
            title=data.title,
            description=data.description,
            start_date=data.start_date,
            end_date=data.end_date,
            start_time=data.start_time,
            end_time=data.end_time,
            difficulty_level=data.difficulty_level,
        )

        # Add categories
        if data.categories:
            categories = WalkCategoryTag.objects.filter(slug__in=data.categories)
            adventure.related_categories.add(*categories)

        # Add companions
        if data.companion_ids:
            companions = Companion.objects.filter(
                id__in=data.companion_ids,
                user=request.user
            )
            adventure.companions.add(*companions)

        # Create achievement
        Achievement.objects.create(
            user=request.user,
            adventure=adventure,
            conquered_date=data.end_date,
            status="COMPLETED",
            visibility="PUBLIC"
        )

        # Format response
        return 201, AdventureOut(
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
        )

    except Exception as e:
        return 422, ErrorResponse(message=str(e))

@router.get(
    "/companions/", 
    response=CompanionList,
    tags=["companions"],
    summary="List all companions")
def list_companions(request):
    """List all companions for the current user."""
    companions = Companion.objects.filter(user=request.user)
    return CompanionList(
        companions=[
            CompanionOut(id=c.id, name=c.name)
            for c in companions
        ]
    )

@router.post(
    "/companions/", 
    response={201: CompanionOut, 422: ErrorResponse},
    tags=["companions"],
    summary="Create a new companion")
def create_companion(request, data: CompanionCreate):
    """Create a new companion."""
    try:
        companion = Companion.objects.create(
            user=request.user,
            name=data.name
        )
        return 201, CompanionOut(id=companion.id, name=companion.name)
    except Exception as e:
        return 422, ErrorResponse(message=str(e))

@router.delete(
    "/companions/{companion_id}", 
    response={204: None, 404: ErrorResponse}, 
    tags=["companions"],
    summary="Delete a companion")
def delete_companion(request, companion_id: UUID):
    """Delete a companion."""
    try:
        companion = get_object_or_404(
            Companion,
            id=companion_id,
            user=request.user
        )
        companion.delete()
        return 204, None
    except Companion.DoesNotExist:
        return 404, ErrorResponse(message="Companion not found")