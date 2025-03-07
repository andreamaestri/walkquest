from datetime import date, time
from typing import List, Optional
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
    start_time: Optional[time]
    end_time: Optional[time]
    difficulty_level: str
    categories: List[str]
    companion_ids: Optional[List[UUID]]
    walk_id: UUID

class AdventureOut(Schema):
    id: UUID
    title: str
    description: str
    start_date: date
    end_date: date
    start_time: Optional[time]
    end_time: Optional[time]
    difficulty_level: str
    categories: List[str]
    companions: List[CompanionOut]
    created_at: str
    updated_at: str

class ErrorResponse(Schema):
    message: str

class CompanionCreate(Schema):
    name: str

class CompanionList(Schema):
    companions: List[CompanionOut]