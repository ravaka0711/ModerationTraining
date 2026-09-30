from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import classifier
import models
import schemas

from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CRUD Commenatires - Entraînement")

def trouver_commentaire(db: Session, commentaire_id: int):
    commentaire = db.query(models.Commentaire).filter(
        models.Commentaire.id == commentaire_id
    ).first()

    if commentaire is None:
        raise HTTPException(status_code=404, detail=f"Commentaire n°{commentaire_id} introuvable")
    return commentaire

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/commentaires", response_model=schemas.CommentaireOut)
def creer_commentaire(data: schemas.CommentaireCreate, db: Session = Depends(get_db)):
    try:
        resultat = classifier.classifier(data.texte)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur de classification: {e}")

    
    nouveau = models.Commentaire(
        texte=data.texte,
        categorie=resultat["code"],
        confiance=resultat["confiance"],
        action_prise=classifier.CATEGORIES[resultat["code"]][1]
    )
    
    db.add(nouveau)
    db.commit()
    db.refresh(nouveau)

    return nouveau


@app.get("/commentaires", response_model=list[schemas.CommentaireOut])
def lister_commentaires(db:Session = Depends(get_db)):
     return db.query(models.Commentaire).all()

@app.get("/commentaires/{commentaire_id}", response_model=schemas.CommentaireOut)
def lire_commentaire(commentaire_id: int, db: Session = Depends(get_db)):
    return trouver_commentaire(db, commentaire_id)


@app.put("/commentaires/{commentaire_id}", response_model=schemas.CommentaireOut)
def modifier_commentaire(commentaire_id: int, maj: schemas.CommentaireUpdate, db: Session = Depends(get_db)):
    commentaire = trouver_commentaire(db, commentaire_id)

    if maj.texte is not None:
        commentaire.texte = maj.texte
    if maj.categorie is not None:
        if maj.categorie not in classifier.CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Catégorie invalide: {maj.categorie}")
        commentaire.categorie = maj.categorie
        commentaire.action_prise = classifier.CATEGORIES[maj.categorie][1]
        
    db.commit()
    db.refresh(commentaire)
    return commentaire


@app.delete("/commentaires/{commentaire_id}")
def supprimer_commentaire(commentaire_id: int, db: Session = Depends(get_db)):
    commentaire = trouver_commentaire(db, commentaire_id)

    db.delete(commentaire)
    db.commit()

    return {"message": "Commentaire supprimé avec succès"}