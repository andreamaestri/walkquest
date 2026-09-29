"""Adventure log API: a signed-in user's record of having walked a walk.

A log is an ``Adventure`` row (what happened) tied to the user by an
``Achievement`` and to the catalogue walk by ``Adventure.walk``. It never
touches ``Walk.adventure``, which is the catalogue's own row for the walk.
"""

import logging
from datetime import timedelta
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from ninja import Router
from ninja.security import django_auth

from walkquest.walks.difficulty import LEVELS
from walkquest.walks.difficulty import canonical
from walkquest.walks.difficulty import normalize_difficulty
from walkquest.walks.models import Adventure
from walkquest.walks.models import Companion
from walkquest.walks.models import Walk
from walkquest.walks.models import WalkCategoryTag

from .models import Achievement
from .schemas import AdventureIn
from .schemas import AdventureOut
from .schemas import AdventureUpdate
from .schemas import CompanionCreate
from .schemas import CompanionList
from .schemas import CompanionOut
from .schemas import ErrorResponse
from .schemas import WalkRefOut

logger = logging.getLogger(__name__)

DIFFICULTY_KEYS = {key for key, *_ in LEVELS}

companions_router = Router(auth=django_auth, tags=["companions"])
router = Router(auth=django_auth, tags=["adventures"])
router.add_router("/companions", companions_router)


# --- companions ---------------------------------------------------------


@companions_router.get("/", response=CompanionList, summary="List my companions")
def list_companions(request):
    companions = Companion.objects.filter(user=request.user)
    return CompanionList(
        companions=[CompanionOut(id=c.id, name=c.name) for c in companions],
    )


@companions_router.post(
    "/",
    response={201: CompanionOut, 422: ErrorResponse},
    summary="Add a companion",
)
def create_companion(request, data: CompanionCreate):
    name = data.name.strip()
    if not name:
        return 422, ErrorResponse(message="Give your companion a name.")
    if len(name) > Companion.name.field.max_length:
        return 422, ErrorResponse(message="That name is too long.")
    # Adding the same person twice just selects them again.
    companion = Companion.objects.filter(user=request.user, name__iexact=name).first()
    if companion is None:
        companion = Companion.objects.create(user=request.user, name=name)
    return 201, CompanionOut(id=companion.id, name=companion.name)


@companions_router.delete(
    "/{companion_id}",
    response={204: None, 404: ErrorResponse},
    summary="Delete a companion",
)
def delete_companion(request, companion_id: UUID):
    companion = Companion.objects.filter(id=companion_id, user=request.user).first()
    if companion is None:
        return 404, ErrorResponse(message="Companion not found")
    companion.delete()
    return 204, None


# --- helpers ------------------------------------------------------------


def serialize(adventure: Adventure) -> AdventureOut:
    walk = adventure.walk
    return AdventureOut(
        id=adventure.id,
        walk=WalkRefOut(id=walk.id, slug=walk.walk_id, name=walk.walk_name)
        if walk
        else None,
        title=adventure.title,
        description=adventure.description or "",
        start_date=adventure.start_date,
        end_date=adventure.end_date,
        start_time=adventure.start_time,
        end_time=adventure.end_time,
        difficulty_level=adventure.difficulty_level,
        categories=[tag.slug for tag in adventure.related_categories.all()],
        companions=[
            CompanionOut(id=c.id, name=c.name) for c in adventure.companions.all()
        ],
        created_at=adventure.created_at.isoformat(),
        updated_at=adventure.updated_at.isoformat(),
        is_public=adventure.is_public,
    )


def check_when(start_date, end_date, start_time, end_time) -> str | None:
    """Returns a message for the first problem with when the walk happened."""
    if end_date < start_date:
        return "The end date can't be before the start date."
    # A day of slack so a walk logged just after midnight UTC isn't "tomorrow".
    if start_date > timezone.localdate() + timedelta(days=1):
        return "You can't log a walk that hasn't happened yet."
    if start_time and end_time and end_date == start_date and end_time <= start_time:
        return "The finish time must be after the start time."
    return None


def check_difficulty(value: str | None) -> str | None:
    if value and canonical(value) not in DIFFICULTY_KEYS:
        return "That isn't one of the difficulty levels."
    return None


def edited_dates(adventure: Adventure, changes: dict):
    """The start and end date once `changes` apply; a one-day log moves whole."""
    start_date = changes.get("start_date", adventure.start_date)
    end_date = changes.get("end_date", adventure.end_date)
    one_day = adventure.end_date == adventure.start_date
    if "start_date" in changes and "end_date" not in changes and one_day:
        end_date = start_date
    return start_date, end_date


def apply_changes(adventure: Adventure, changes: dict) -> None:
    """Sets the plain fields of `adventure` from an edit (companions are separate)."""
    for field in ("start_time", "end_time", "is_public"):
        if field in changes:
            setattr(adventure, field, changes[field])
    if "title" in changes:
        fallback = adventure.walk.walk_name if adventure.walk else adventure.title
        adventure.title = (changes["title"] or "").strip() or fallback
    if "description" in changes:
        adventure.description = (changes["description"] or "").strip()
    if changes.get("difficulty_level"):
        adventure.difficulty_level = normalize_difficulty(
            changes["difficulty_level"],
        )["key"]


def own_companions(user, ids) -> list[Companion]:
    # Ids that aren't the user's companions (stale, or someone else's) are dropped.
    return list(Companion.objects.filter(user=user, id__in=ids)) if ids else []


def own_achievement(user, adventure_id: UUID) -> Achievement | None:
    return (
        Achievement.objects.select_related("adventure__walk")
        .filter(user=user, adventure_id=adventure_id)
        .first()
    )


# --- adventure logs -----------------------------------------------------


@router.get("/", response=list[AdventureOut], summary="My logged walks")
def list_adventures(request):
    achievements = (
        Achievement.objects.filter(user=request.user)
        .select_related("adventure__walk")
        .prefetch_related("adventure__related_categories", "adventure__companions")
        .order_by("-adventure__start_date", "-adventure__created_at")
    )
    return [serialize(a.adventure) for a in achievements]


@router.post(
    "/log",
    response={
        201: AdventureOut,
        404: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
    },
    summary="Log a walk",
)
def create_adventure(request, data: AdventureIn):
    walk = Walk.objects.filter(id=data.walk_id).first()
    if walk is None:
        return 404, ErrorResponse(message="That walk no longer exists.")

    end_date = data.end_date or data.start_date
    error = check_when(data.start_date, end_date, data.start_time, data.end_time)
    error = error or check_difficulty(data.difficulty_level)
    if error:
        return 422, ErrorResponse(message=error)

    already_logged = Achievement.objects.filter(
        user=request.user,
        adventure__walk=walk,
        adventure__start_date=data.start_date,
    ).exists()
    if already_logged:
        return 409, ErrorResponse(
            message="You've already logged this walk on that day.",
        )

    if data.categories is None:
        tags = list(walk.categories.all())
    else:
        tags = list(WalkCategoryTag.objects.filter(slug__in=data.categories))

    with transaction.atomic():
        adventure = Adventure.objects.create(
            walk=walk,
            title=(data.title or "").strip() or walk.walk_name,
            description=data.description.strip(),
            start_date=data.start_date,
            end_date=end_date,
            start_time=data.start_time,
            end_time=data.end_time,
            difficulty_level=normalize_difficulty(
                data.difficulty_level or walk.steepness_level,
            )["key"],
            is_public=data.is_public,
        )
        adventure.related_categories.add(*tags)
        adventure.companions.set(own_companions(request.user, data.companion_ids))
        Achievement.objects.create(
            user=request.user,
            adventure=adventure,
            status="COMPLETED",
            visibility="PUBLIC" if data.is_public else "PRIVATE",
        )

    logger.info("Logged walk %s for user %s", walk.walk_id, request.user.pk)
    return 201, serialize(adventure)


@router.patch(
    "/{adventure_id}",
    response={200: AdventureOut, 404: ErrorResponse, 422: ErrorResponse},
    summary="Edit a logged walk",
)
def update_adventure(request, adventure_id: UUID, data: AdventureUpdate):
    achievement = own_achievement(request.user, adventure_id)
    if achievement is None:
        return 404, ErrorResponse(message="Adventure not found")
    adventure = achievement.adventure
    changes = data.dict(exclude_unset=True)

    start_date, end_date = edited_dates(adventure, changes)
    error = check_when(
        start_date,
        end_date,
        changes.get("start_time", adventure.start_time),
        changes.get("end_time", adventure.end_time),
    )
    error = error or check_difficulty(changes.get("difficulty_level"))
    if error:
        return 422, ErrorResponse(message=error)

    with transaction.atomic():
        apply_changes(adventure, changes)
        adventure.start_date = start_date
        adventure.end_date = end_date
        adventure.save()
        if changes.get("companion_ids") is not None:
            adventure.companions.set(
                own_companions(request.user, changes["companion_ids"]),
            )
        if "is_public" in changes:
            achievement.visibility = "PUBLIC" if adventure.is_public else "PRIVATE"
            achievement.save(update_fields=["visibility", "updated_at"])
    return 200, serialize(adventure)


@router.delete(
    "/{adventure_id}",
    response={204: None, 404: ErrorResponse},
    summary="Delete a logged walk",
)
def delete_adventure(request, adventure_id: UUID):
    achievement = own_achievement(request.user, adventure_id)
    if achievement is None:
        return 404, ErrorResponse(message="Adventure not found")
    # Deleting the Adventure cascades to the Achievement; the walk is untouched.
    achievement.adventure.delete()
    return 204, None
