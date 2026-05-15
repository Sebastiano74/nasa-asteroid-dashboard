// Indica a Next.js che questo componente deve essere eseguito nel browser (lato client)
// Necessario per usare useState, useEffect, e interagire con l'utente.
'use client';

// Importa gli hook di React: useEffect per eseguire codice dopo il rendering, useState per memorizzare dati
import { useEffect, useState } from 'react';
// Importa i componenti Table da Shadcn UI (già installati e disponibili)
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// Importa i componenti per il grafico
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// ------------------------------------------------------------------
// FUNZIONE CHE TRASFORMA I DATI DELLA NASA IN UNA LISTA PIATTA
// ------------------------------------------------------------------
// Riceve l'oggetto JSON restituito dal backend (che ha la struttura originale della NASA)
// Restituisce un array di oggetti, ciascuno con i campi che ci servono per la tabella.
function flattenAsteroidData(nasaData: any) {
  // Array vuoto dove accumuleremo le righe della tabella
  const result = [];

  // near_earth_objects è un oggetto le cui chiavi sono le date (es. "2026-05-10")
  // e i valori sono array di asteroidi per quella data.
  const neo = nasaData.near_earth_objects;

  // Itera su ogni data (es. "2026-05-10")
  for (const date in neo) {
    // Per ogni data, ottieni l'array di asteroidi
    for (const asteroid of neo[date]) {
      // L'API talvolta ha close_approach_data[0] contenente la distanza e velocità.
      // Il costrutto ?. (optional chaining) evita errori se l'array o l'oggetto non esiste.
      // Se non esiste, approach diventa un oggetto vuoto {}.
      const approach = asteroid.close_approach_data?.[0] || {};

      // Aggiunge una nuova riga all'array result, con i campi che useremo nella tabella.
      result.push({
        id: asteroid.id,                                       // Identificativo univoco dell'asteroide
        name: asteroid.name,                                   // Nome (es. "326290 Akhenaten (1998 HE3)")
        // Diametro minimo e massimo in km (preso da estimated_diameter.kilometers)
        diameter_min_km: asteroid.estimated_diameter.kilometers.estimated_diameter_min,
        diameter_max_km: asteroid.estimated_diameter.kilometers.estimated_diameter_max,
        // Distanza minima dalla Terra in km (se disponibile, altrimenti 'N/A')
        miss_distance_km: approach.miss_distance?.kilometers || 'N/A',
        // Velocità relativa in km/h (se disponibile, altrimenti 'N/A')
        relative_velocity_kmh: approach.relative_velocity?.kilometers_per_hour || 'N/A',
        // Trasforma il booleano "is_potentially_hazardous_asteroid" in testo italiano
        hazardous: asteroid.is_potentially_hazardous_asteroid ? 'Sì' : 'No',
        date: date,   // La data di avvicinamento (es. "2026-05-10")
      });
    }
  }

  // Restituisce l'array di oggetti (ogni oggetto = una riga della tabella)
  return result;
}

// funzione che prepara il grafico

function preparaDiameterData(asteroidList: any[]){
  const bins =[
    { range: '0-0.05', min: 0, max: 0.05, count: 0},
    { range: '0.05-0.1', min: 0.05, max: 0.1, count: 0},
    { range: '0.1-0.2', min: 0.1, max: 0.2, count: 0},
    { range: '0.2-0.5', min: 0.2, max: 0.5, count: 0},
    { range: '> 0.5', min: 0.5, max: Infinity, count: 0},
  ];

  for(const ast of asteroidList) {
    const diam = ast.diameter_min_km;
    for (const bin of bins){
      if (diam >= bin.min && diam < bin.max){
        bin.count++;
        break;
      }
    }
  }

  return bins.map(bin => ({range: bin.range, count: bin.count}));
}















// ------------------------------------------------------------------
// COMPONENTE PRINCIPALE DELLA PAGINA HOME
// ------------------------------------------------------------------
export default function Home() {
  // Stato che conterrà i dati grezzi della NASA (l'intero JSON ricevuto)
  const [data, setData] = useState(null);
  // Stato booleano per mostrare un messaggio di caricamento mentre aspettiamo i dati
  const [loading, setLoading] = useState(true);
  // Stato per memorizzare un eventuale messaggio di errore (es. rete assente)
  const [error, setError] = useState(null);
  const[showOnlyHazardous, setShowOnlyHazardous] = useState(false);

  // useEffect viene eseguito automaticamente dopo che il componente è stato disegnato.
  // L'array vuoto [] indica che verrà eseguito una sola volta (all'avvio della pagina).
  useEffect(() => {
    // Chiamata HTTP GET al backend FastAPI (deve essere in esecuzione su porta 8000)
    // Nota: l'intervallo di date è fisso per il test, poi lo renderemo dinamico.
    fetch('http://localhost:8000/asteroids?start_date=2026-05-03&end_date=2026-05-10')
      // Converti la risposta in JSON (riceviamo i dati della NASA)
      .then(res => res.json())
      .then(data => {
        setData(data);       // Salva i dati nello stato
        setLoading(false);   // Caricamento finito, nascondi il messaggio di caricamento
      })
      .catch(err => {
        setError(err.message); // Salva il messaggio di errore
        setLoading(false);     // Termina comunque lo stato di caricamento
      });
  }, []);

  // Se siamo nella fase di caricamento, mostra un semplice messaggio (con classe Tailwind per padding)
  if (loading) return <div className="p-8">Caricamento asteroidi...</div>;

  // Se c'è un errore, mostra il messaggio di errore in rosso
  if (error) return <div className="p-8 text-red-500">Errore: {error}</div>;

  // Se non ci sono dati (caso raro), non renderizzare nulla
  if (!data) return null;

  // Appiattiamo i dati grezzi per ottenere l'array di righe della tabella
  const asteroidList = flattenAsteroidData(data);
  const filteredList = showOnlyHazardous
    ? asteroidList.filter(ast => ast.hazardous == 'Sì')
    : asteroidList;
  const chartData = preparaDiameterData(filteredList);
  console.log('charData: ', chartData);
  console.log('Dati per il grafico:', chartData);


  // Render della pagina: titolo, conteggio e tabella
  return (
    <main className="p-8">
      {/* Titolo della dashboard */}
      <h1 className="text-2xl font-bold mb-4">NASA NEO Dashboard</h1>

      {/* Paragrafo che mostra quanti asteroidi sono stati trovati nel periodo */}
      <p className="mb-4">
        {filteredList.length} asteroidi {showOnlyHazardous ? '(solo pericolosi)' : '(totali)'}
        </p>
      <button
        onClick={() => setShowOnlyHazardous(!showOnlyHazardous)}
        className='mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
      >
        {showOnlyHazardous ? 'Mostra Tutti': 'Mostra solo pericolosi' }
      </button>

      {/* Tabella con componenti Shadcn UI (già stilata e responsive) */}
      <Table>
        {/* Intestazione della tabella: definisce i nomi delle colonne */}
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Diametro (km)</TableHead>
            <TableHead>Distanza min (km)</TableHead>
            <TableHead>Velocità (km/h)</TableHead>
            <TableHead>Pericoloso</TableHead>
            <TableHead>Data avvicinamento</TableHead>
          </TableRow>
        </TableHeader>

        {/* Corpo della tabella: una riga per ogni asteroide */}
        <TableBody>
          {filteredList.map((ast) => (
            // La prop `key` è obbligatoria in React per identificare ogni riga in modo univoco
            <TableRow key={ast.id}>
              <TableCell>{ast.name}</TableCell>
              {/* Diametro: mostriamo min e max con due cifre decimali */}
              <TableCell>
                {ast.diameter_min_km.toFixed(2)} - {ast.diameter_max_km.toFixed(2)}
              </TableCell>
              {/* Distanza: se non è 'N/A' la formattiamo con separatore delle migliaia */}
              <TableCell>
                {ast.miss_distance_km !== 'N/A'
                  ? Number(ast.miss_distance_km).toLocaleString()
                  : 'N/A'}
              </TableCell>
              {/* Velocità: stessa logica, formattazione con separatore migliaia */}
              <TableCell>
                {ast.relative_velocity_kmh !== 'N/A'
                  ? Number(ast.relative_velocity_kmh).toLocaleString()
                  : 'N/A'}
              </TableCell>
              <TableCell>{ast.hazardous}</TableCell>
              <TableCell>{ast.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>




      <div className='mt-8'>
        <h2 className='text-xl font-semibold mb-2'>Distribuzione dei diametri minimi (km)</h2>
        {chartData && chartData.length > 0 ? (
          <BarChart width={600} height={300} data={chartData}>
            <XAxis dataKey="range" type="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3182CE" />
          </BarChart>
      ) : (
        <p>Nessun dato per il grafico</p>
      )}
      </div>
       
      





    </main>
  );
}