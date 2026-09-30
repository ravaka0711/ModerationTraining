import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODELE = "gemini-3.5-flash"

CATEGORIES = {
    "avis_positif": ("Compliment, satisfaction ou remerciement", "conserver"),
    "question": ("Demande d'information sur le produit, service ou publication", "conserver"),
    "critique_legitime": ("Avis négatif sans insulte ni menace", "conserver"),
    "plainte_reclamation": ("Exprime une insatisfaction ou un problème", "reviser_escalade_humaine"),
    "insulte_menace": ("Propos offensants qui visent, menace de violence", "masquer_alerter"),
    "incitation_haine": ("Contenu encourageant la haine envers une personne", "masquer_alerter"),
    "arnaque_scam": ("Tentative de tromperie ou fraude", "masquer_supprimer"),
    "spam": ("Messages répétitifs, publicité non sollicitée ou contenu indésirable", "supprimer"),
    "desinformation": ("Commentaire sans rapport avec la publication", "signaler_reviser"),
}

_client = None

def get_client() -> genai.Client:
    """Crée le client au premier appel. Lit la clé dans GEMINI_API_KEY."""
    global _client
    if _client is None:
        _client = genai.Client()
    return _client


def contruire_prompt() -> str:
    liste = {code: desc for code, (desc, _) in CATEGORIES.items()}
    return f"""Tu es un modérateur de commentaires Facebook.
    Les commentaires peuvent être en malagasy, en français, ou un mélange des deux.
    Classe le commentaire dans UNE seule de ces catégories (utilise exactement le code) :

    {json.dumps(liste, ensure_ascii=False, indent=2)}

    Réponds uniquement avec un JSON de la forme :
    {{"code": "...", "confiance": 0.0 à 1.0, "raison": "explication courte"}}"""



def classifier(texte: str, tentatives_max: int = 4) -> dict:
    """Retourne {"code": ..., "confiance": ..., "raison": ...} ou lève une exception."""
    for essai in range(tentatives_max):
        try:
            reponse = get_client().models.generate_content(
                model=MODELE,
                contents=texte,
                config=types.GenerateContentConfig(
                    system_instruction=contruire_prompt(),
                    response_mime_type="application/json",
                ),
            )

            contenu = reponse.text.strip()
            contenu = contenu.replace("```json", "").replace("```", "").strip()
            resultat = json.loads(contenu)

            if resultat.get("code") not in CATEGORIES:
                raise ValueError(f"Catégorie inconnue renvoyée par le modèle : {resultat.get('code')}")

            resultat["confiance"] = max(0.0, min(1.0, float(resultat.get("confiance", 0.0))))

            return resultat
        except Exception as e:
            msg = str(e)
            # Déconnexion réseau, timeout ou pic de charge Google (503 / UNAVAILABLE)
            est_erreur_recuperable = any(err in msg for err in [
                "503", 
                "UNAVAILABLE", 
                "Server disconnected", 
                "RemoteProtocolError", 
                "Connection", 
                "timeout"
            ])

            if est_erreur_recuperable and essai < tentatives_max - 1:
                # Réinitialiser le client pour forcer une nouvelle connexion propre
                global _client
                _client = None
                time.sleep(1 + essai)
                continue
            raise e



    
