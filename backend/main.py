from fastapi import FastAPI, Query
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

# Carica il file .env che si trova nella stessa cartella di main.py
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

NASA_API_KEY = os.getenv("NASA_API_KEY")
if not NASA_API_KEY:
    raise Exception("Manca la chiave NASA nel file .env. Assicurati che il file .env esista e contenga: NASA_API_KEY=la_tua_chiave")

app = FastAPI(title="NASA NEO Dashboard API")


app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:3000"], # il frotend Next.js
    allow_methods = ["*"],
    allow_headers = ["*"],
)



# Cache semplice: dizionario che mappa (start_date, end_date) al risultato JSON
cache = {}

@app.get("/asteroids")
def get_asteroids(
    start_date: str = Query(..., description="Data di inizio formato YYYY-MM-DD"),
    end_date: str = Query(..., description="Data di fine formato YYYY-MM-DD"),
    refresh: bool = Query(False, description="Se True, ignora la cache e forza la chiamata alla NASA")
):
    """
    Endpoint che restituisce gli asteroidi in un intervallo di date.
    Supporta intervalli fino a 7 giorni (limite API NASA).
    Con cache automatica.
    """
    # Validazione delle date
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        return {"error": "Formato data non valido. Usa YYYY-MM-DD"}
    
    if start > end:
        return {"error": "start_date deve essere precedente o uguale a end_date"}
    if (end - start).days > 7:
        return {"error": "L'intervallo massimo consentito è di 7 giorni"}
    
    # Chiave per la cache
    cache_key = f"{start_date}_{end_date}"
    
    # Se refresh è False e la chiave è in cache, restituisci i dati dalla cache
    if not refresh and cache_key in cache:
        print(f"Cache HIT per {cache_key}")
        return cache[cache_key]
    
    print(f"Cache MISS per {cache_key}. Chiamo la NASA...")
    
    # Costruzione URL con la chiave API
    url = f"https://api.nasa.gov/neo/rest/v1/feed?start_date={start_date}&end_date={end_date}&api_key={NASA_API_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Solleva eccezione per status 4xx/5xx
        data = response.json()
        
        # Salva in cache
        cache[cache_key] = data
        return data
    except requests.exceptions.RequestException as e:
        return {"error": f"Errore nella chiamata alla NASA: {str(e)}"}

@app.get("/asteroid/{asteroid_id}")
def get_asteroid_details(asteroid_id: str, refresh: bool = Query(False)):
    """
    Endpoint per i dettagli di un singolo asteroide (chiamata a /neo/{id}).
    Con cache.
    """
    cache_key = f"neo_{asteroid_id}"
    if not refresh and cache_key in cache:
        print(f"Cache HIT per {cache_key}")
        return cache[cache_key]
    
    print(f"Cache MISS per {cache_key}. Chiamo la NASA...")
    url = f"https://api.nasa.gov/neo/rest/v1/neo/{asteroid_id}?api_key={NASA_API_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        cache[cache_key] = data
        return data
    except requests.exceptions.RequestException as e:
        return {"error": f"Errore nella chiamata alla NASA: {str(e)}"}

@app.get("/")
def root():
    return {"message": "Benvenuto nella NASA NEO Dashboard API. Usa /asteroids?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD"}
    
    
    