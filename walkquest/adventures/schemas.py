from datetime import date
from datetime import time
from uuid import UUID

from ninja import Field
from ninja import Schema

# Bounds on what a signed-in user can store per log (the notes limit matches
# the dialog's counter; the title can only grow this long from the walk name).
TITLE_MAX = 255
NOTES_MAX = 500
COMPANIONS_MAX = 50


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
    title: str | None = Field(None, max_length=TITLE_MAX)
    description: str = Field("", max_length=NOTES_MAX)
    difficulty_level: str | None = Field(None, max_length=40)
    categories: list[str] | None = Field(None, max_length=20)
    companion_ids: list[UUID] = Field(default_factory=list, max_length=COMPANIONS_MAX)
    is_public: bool = False


class AdventureUpdate(Schema):
    """Fields of a log entry that can be edited; unset fields are left alone."""

    start_date: date | None = None
    end_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    title: str | None = Field(None, max_length=TITLE_MAX)
    description: str | None = Field(None, max_length=NOTES_MAX)
    difficulty_level: str | None = Field(None, max_length=40)
    companion_ids: list[UUID] | None = Field(None, max_length=COMPANIONS_MAX)
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
    name: str = Field(max_length=100)


class CompanionList(Schema):
    companions: list[CompanionOut]
