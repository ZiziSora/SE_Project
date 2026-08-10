from pydantic import BaseModel


class UploadOut(BaseModel):
    url: str
    path: str
    bucket: str
    size: int
    content_type: str
