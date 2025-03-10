"""API endpoints for adventures and companions."""
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db import transaction
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.security import django_auth

from walkquest.walks.models import Adventure
from walkquest.walks.models import Companion
from walkquest.walks.models import Walk
from walkquest.walks.models import WalkCategoryTag

from .models import Achievement
from .schemas import AdventureIn
from .schemas import AdventureOut
from .schemas import CompanionCreate
from .schemas import CompanionList
from .schemas import CompanionOut
from .schemas import ErrorResponse

# Create router with authentication
router = Router(auth=django_auth)

@router.post(
    "/adventures/log",
    response={201: AdventureOut, 422: ErrorResponse, 404: ErrorResponse},
    tags=["adventures"],
    summary="Log a new adventure")
def create_adventure(
    request, data: AdventureIn,
) -> tuple[int, AdventureOut | ErrorResponse]:
    """Create a new adventure log.

    Args:
        request: The HTTP request
        data: The adventure data to create

    Returns:
        A tuple of (status_code, response_data)

    Raises:
        ValidationError: If the data is invalid
        Walk.DoesNotExist: If the walk doesn't exist
        IntegrityError: If there's a database constraint violation
    """
    try:
        with transaction.atomic():
            # Get the walk
            walk = get_object_or_404(Walk, id=data.walk_id)

            # Create the adventure with the related walk
            adventure = Adventure.objects.create(
                walk=walk,
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
                    user=request.user,
                )
                adventure.companions.add(*companions)

            # Create achievement
            Achievement.objects.create(
                user=request.user,
                adventure=adventure,
                conquered_date=data.end_date,
                status="COMPLETED",
                visibility="PUBLIC",
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

    except Walk.DoesNotExist:
        return 404, ErrorResponse(message="Walk not found")
    except ValidationError as exc:
        return 422, ErrorResponse(message=str(exc))
    except IntegrityError:
        return 422, ErrorResponse(message="Database integrity error")

@router.get(
    "/companions/",
    response=CompanionList,
    tags=["companions"],
    summary="List all companions")
def list_companions(request) -> CompanionList:
    """List all companions for the current user.

    Args:
        request: The HTTP request

    Returns:
        A list of companions
    """
    companions = Companion.objects.filter(user=request.user)
    return CompanionList(
        companions=[
            CompanionOut(id=c.id, name=c.name)
            for c in companions
        ],
    )

@router.post(
    "/companions/",
    response={201: CompanionOut, 422: ErrorResponse},
    tags=["companions"],
    summary="Create a new companion")
def create_companion(
    request, data: CompanionCreate,
) -> tuple[int, CompanionOut | ErrorResponse]:
    """Create a new companion.

    Args:
        request: The HTTP request
        data: The companion data to create

    Returns:
        A tuple of (status_code, response_data)

    Raises:
        ValidationError: If the data is invalid
        IntegrityError: If there's a database constraint violation
    """
    try:
        companion = Companion.objects.create(
            user=request.user,
            name=data.name,
        )
    except ValidationError as exc:
        return 422, ErrorResponse(message=str(exc))
    except IntegrityError:
        return 422, ErrorResponse(message="Database integrity error")
    else:
        return 201, CompanionOut(id=companion.id, name=companion.name)

@router.delete(
    "/companions/{companion_id}",
    response={204: None, 404: ErrorResponse},
    tags=["companions"],
    summary="Delete a companion")
def delete_companion(
    request, companion_id: UUID,
) -> tuple[int, None | ErrorResponse]:
    """Delete a companion.

    Args:
        request: The HTTP request
        companion_id: The UUID of the companion to delete

    Returns:
        A tuple of (status_code, response_data)

    Raises:
        Companion.DoesNotExist: If the companion doesn't exist
    """
    try:
        companion = Companion.objects.get(
            id=companion_id,
            user=request.user,
        )
    except Companion.DoesNotExist:
        return 404, ErrorResponse(message="Companion not found")
    else:
        companion.delete()
        return 204, None
