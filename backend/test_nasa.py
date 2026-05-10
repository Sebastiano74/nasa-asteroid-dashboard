import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
NASA_API_KEY = os.getenv("NASA_API_KEY")
if NASA_API_KEY is None:
    print("ERRORE: Chiave NASA non trovata nel file .env")
    exit()
    
end_date = datetime.now().strftime("%Y-%m-%d")
start_date =(datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

url = f"https://api.nasa.gov/neo/rest/v1/feed?start_date={start_date}&end_date={end_date}&api_key={NASA_API_KEY}"
response = requests.get(url)
data = response.json()
print("Giorni trovati:", list(data['near_earth_objects'].keys()))
totale_asteroidi = 0
for giorno, asteroidi in data ['near_earth_objects'].items():
    print(f"{giorno}:{len(asteroidi)} asteroidi")
    totale_asteroidi += len(asteroidi)
    print(f"Totale complessivo: {totale_asteroidi}")