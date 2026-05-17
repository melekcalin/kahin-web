import { MoodData, Film, Valence, Arousal, World } from '../types';

const GENRE_MAP: Record<string, string> = {
  'positive-slow-escape': '12,14,10749',
  'positive-slow-mirror': '99,36',
  'positive-fast-escape': '12,878',
  'positive-fast-mirror': '35,10402',
  'negative-slow-escape': '878,27',
  'negative-slow-mirror': '18,80',
  'negative-fast-escape': '28,53',
  'negative-fast-mirror': '9648,53',
};

const VERDICT_MAP: Record<string, string> = {
  'positive-slow-escape': 'Kaçmak istiyorsun — ama güzelliğe doğru.',
  'positive-slow-mirror': 'Derin ama huzurlu bir bakış açısı.',
  'positive-fast-escape': 'Yeni dünyaları keşfetme vakti.',
  'positive-fast-mirror': 'Hayatın neşesini ve ritmini hisset.',
  'negative-slow-escape': 'Karanlık evrenlerde yavaş bir yolculuk.',
  'negative-slow-mirror': 'Bugün yoruldun. Sessizce düşündüren bir hikaye gerekiyor.',
  'negative-fast-escape': 'Sınırları kırmak istiyorsun. Adrenalin dolu bir kaçış.',
  'negative-fast-mirror': 'İçinde bir gerilim var. Onu bir yerde akıtmak istiyorsun.',
};

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
const ANIMATION_GENRE_ID = 16;

function buildWithoutGenres(mood: MoodData) {
  const genres = [ANIMATION_GENRE_ID];

  if (mood.companion === 'together') {
    genres.push(27);
  }

  return genres.join(',');
}

export async function fetchRecommendations(mood: MoodData): Promise<{ films: Film[], error?: string }> {
  const key = `${mood.valence}-${mood.arousal}-${mood.world}`;
  const genres = GENRE_MAP[key] || '18'; // Default to Drama
  const verdict = VERDICT_MAP[key] || 'Ruhun için doğru seçim.';
  const params = new URLSearchParams({
    with_genres: genres,
    without_genres: buildWithoutGenres(mood),
    'vote_count.gte': '80',
    'vote_average.gte': '5.8',
  });

  try {
    const response = await fetch(`${API_BASE_URL}/api/movies/discover?${params.toString()}`);
    const data = await response.json();
    
    if (data.error) {
      console.error("TMDB API Error:", data.error);
      return { films: [], error: data.error };
    }

    if (!data.results || !Array.isArray(data.results)) {
      return { films: [] };
    }

    const cleanResults = data.results
      .filter((movie: any) => !movie.genre_ids?.includes(ANIMATION_GENRE_ID))
      .filter((movie: any) => movie.poster_path && movie.release_date)
      .filter((movie: any) => (movie.vote_count || 0) >= 25)
      .slice(0, 9);

    // Transform TMDB results to our Film type
    const films: Film[] = await Promise.all(cleanResults.map(async (m: any) => {
      let director = 'Bilinmiyor';
      let cast: string[] = [];
      try {
        const creditsRes = await fetch(`${API_BASE_URL}/api/movies/${m.id}/credits`);
        const creditsData = await creditsRes.json();
        
        const dir = creditsData.crew?.find((c: any) => c.job === 'Director');
        if (dir) director = dir.name;
        
        cast = creditsData.cast?.slice(0, 3).map((c: any) => c.name) || [];
      } catch (e) {
        console.error("Credits fetch failed", e);
      }

      return {
        id: m.id,
        title: m.title,
        year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
        director: director,
        stillUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://picsum.photos/seed/movie/800/1200',
        verdict: verdict,
        valence: mood.valence as Valence,
        arousal: mood.arousal as Arousal,
        world: mood.world as World,
        synopsis: m.overview || 'Açıklama bulunamadı.',
        rating: Math.round((m.vote_average || 0) * 10) / 10,
        cast: cast,
      };
    }));

    return { films };
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return { films: [], error: "Failed to connect to movie service" };
  }
}
