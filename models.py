from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy .sql import func

from database import Base

class Commentaire(Base):
    __tablename__ = "Commentaires"

    id = Column(Integer, primary_key=True, index=True)
    texte= Column(String, nullable=False)
    categorie= Column(String, nullable=False)
    confiance= Column(Float, nullable=True)
    action_prise= Column(String, nullable=True)
    date_creation= Column(DateTime(timezone=True), server_default=func.now())
    