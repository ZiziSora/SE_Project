from pydantic import BaseModel


class CategoryOut(BaseModel):
    category_id: int
    name: str
