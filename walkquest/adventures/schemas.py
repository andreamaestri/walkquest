from datetime import date
from datetime import time
from uuid import UUID

from ninja import Schema


class CompanionOut(Schema):
    id: UUID
    name: str


class WalkRefOut(Schema):
    id: UUID
    slug: str
    name: str


class AdventureIn(Schema):
    """A logged walk. Only the walk and the day are required; the rest is
    filled in from the walk (title, difficulty, categories) or left empty."""

    walk_id: UUID
    start_date: date
    end_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    title: str | None = None
    description: str = ""
    difficulty_level: str | None = None
    categories: list[str] | None = None
    companion_ids: list[UUID] = []
    is_public: bool = False


class AdventureUpdate(Schema):
    """Fields of a log entry that can be edited; unset fields are left alone."""

    start_date: date | None = None
    end_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    title: str | None = None
    description: str | None = None
    difficulty_level: str | None = None
    companion_ids: list[UUID] | None = None
    is_public: bool | None = None


class AdventureOut(Schema):
    id: UUID
    walk: WalkRefOut | None = None
    title: str
    description: str
    start_date: date
    end_date: date
    start_time: time | None = None
    end_time: time | None = None
    difficulty_level: str
    categories: list[str]
    companions: list[CompanionOut]
    created_at: str
    updated_at: str
    is_public: bool


class ErrorResponse(Schema):
    message: str


class CompanionCreate(Schema):
    name: str


class CompanionList(Schema):
    companions: list[CompanionOut]
