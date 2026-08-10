from pydantic import BaseModel


class SavedEventStatusOut(BaseModel):
    saved: bool


class SaveEventResponseOut(BaseModel):
    saved: bool = True
    already_saved: bool


class RemoveSavedEventResponseOut(BaseModel):
    removed: bool
