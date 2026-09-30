from datetime import datetime
from pydantic import BaseModel

class CommentaireCreate(BaseModel):
    texte: str

class CommentaireUpdate(BaseModel):
    texte: str | None = None
    categorie: str | None = None


class CommentaireOut(BaseModel):
    id: int
    texte: str
    categorie: str
    confiance: float | None
    action_prise: str | None
    date_creation: datetime


    class Config:
        from_attributes = True