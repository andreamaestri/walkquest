from datetime import date
from datetime import time
from uuid import UUID

from ninja import Schema


class CompanionOut(Schema):
    id: UUID
    name: str

class AdventureIn(Schema):
    title: str
    description: str
    start_date: date
    end_date: date
    start_time: time | None
    end_time: time | None
    difficulty_level: str
    categories: list[str]
    companion_ids: list[UUID] | None
    walk_id: UUID

class AdventureOut(Schema):
    id: UUID
    title: str
    description: str
    start_date: date
    end_date: date
    start_time: time | None
    end_time: time | None
    difficulty_level: str
    categories: list[str]
    companions: list[CompanionOut]
    created_at: str
    updated_at: str

class ErrorResponse(Schema):
    message: str

class CompanionCreate(Schema):
    name: str

class CompanionList(Schema):
    companions: list[CompanionOut]
