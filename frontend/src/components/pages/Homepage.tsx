import { useDemoStore } from '../../store/demoStore';
import { SearchBar } from '../search/SearchBar';

const HERO_PILLS = [
  'Wellness & Spa',
  'Boutique Hotels',
  'Romantic Getaways',
  'Mountain Retreats',
  'Desert Escapes',
];

interface Destination {
  name: string;
  gradient: string;
  featured?: boolean;
}

const DESTINATIONS: Destination[] = [
  { name: 'Sedona', gradient: 'linear-gradient(135deg, #C8654A 0%, #9E4A35 55%, #6B2C39 100%)', featured: true },
  { name: 'Asheville', gradient: 'linear-gradient(135deg, #5B7B5A 0%, #3E5C4A 100%)' },
  { name: 'Marfa', gradient: 'linear-gradient(135deg, #D9A066 0%, #B97A45 100%)' },
  { name: 'Big Sur', gradient: 'linear-gradient(135deg, #4A89C8 0%, #2C4F6B 100%)' },
  { name: 'Hudson Valley', gradient: 'linear-gradient(135deg, #B86B5A 0%, #5E332C 100%)' },
];

interface PropertyType {
  name: string;
  count: string;
  emoji: string;
  gradient: string;
}

const PROPERTY_TYPES: PropertyType[] = [
  { name: 'Hotels', count: '1,840 properties', emoji: '🏨', gradient: 'linear-gradient(135deg, #4A89C8, #2C4F6B)' },
  { name: 'Resorts', count: '920 properties', emoji: '🏖️', gradient: 'linear-gradient(135deg, #D9A066, #B97A45)' },
  { name: 'Spa Retreats', count: '2,340 properties', emoji: '🧖', gradient: 'linear-gradient(135deg, #5B7B5A, #2C4636)' },
  { name: 'Cabins', count: '1,120 properties', emoji: '🛖', gradient: 'linear-gradient(135deg, #C8654A, #6B3A2E)' },
  { name: 'Villas', count: '760 properties', emoji: '🏡', gradient: 'linear-gradient(135deg, #C85A6B, #6B2C39)' },
];

interface Inspiration {
  title: string;
  blurb: string;
  emoji: string;
  gradient: string;
}

const INSPIRATION: Inspiration[] = [
  {
    title: 'The Rise of Wellness Travel',
    blurb: 'How spa-first getaways became the fastest-growing way to vacation.',
    emoji: '🧘',
    gradient: 'linear-gradient(135deg, #5B7B5A, #3E5C4A)',
  },
  {
    title: 'Top 10 Spa Resorts in the Southwest',
    blurb: 'From red-rock canyons to desert hot springs — our editors’ picks.',
    emoji: '♨️',
    gradient: 'linear-gradient(135deg, #D9A066, #7A4E2E)',
  },
  {
    title: 'Why Sedona Is the New Tulum',
    blurb: 'The Arizona desert town quietly drawing the wellness crowd.',
    emoji: '🏜️',
    gradient: 'linear-gradient(135deg, #C8654A, #6B2C39)',
  },
];

export function Homepage() {
  const navigateTo = useDemoStore((s) => s.navigateTo);

  return (
    <div className="bg-bc-gray-100 pb-12">
      {/* Hero */}
      <section className="bg-bc-navy">
        <div className="mx-auto max-w-[1128px] px-4 pb-16 pt-8">
          <h1 className="text-3xl font-bold text-white md:text-[42px] md:leading-tight">
            Find your next stay
          </h1>
          <p className="mt-2 max-w-2xl text-lg text-white/90">
            Search low prices on hotels, homes, and much more...
          </p>

          {/* Quick filter pills */}
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
            {HERO_PILLS.map((pill) => (
              <span key={pill} className="bc-pill">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Search bar overlapping the hero */}
      <div className="mx-auto -mt-8 max-w-[1128px] px-4">
        <SearchBar />
      </div>

      {/* Trending destinations */}
      <section className="mx-auto mt-14 max-w-[1128px] px-4">
        <h2 className="text-2xl font-bold text-bc-gray-900">Trending destinations</h2>
        <p className="mt-1 text-bc-gray-500">Most popular choices among travelers from the US</p>

        <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-2">
          {DESTINATIONS.map((dest) => (
            <button
              key={dest.name}
              type="button"
              onClick={() => dest.featured && navigateTo('search')}
              style={{ background: dest.gradient }}
              className={
                'relative h-[280px] shrink-0 overflow-hidden rounded-card text-left shadow-card transition-transform hover:scale-[1.02] ' +
                (dest.featured ? 'w-[400px]' : 'w-[250px]')
              }
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="text-xl font-bold text-white drop-shadow">{dest.name}</span>
                <span className="text-lg" aria-hidden>
                  🇺🇸
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Browse by property type */}
      <section className="mx-auto mt-14 max-w-[1128px] px-4">
        <h2 className="text-2xl font-bold text-bc-gray-900">Browse by property type</h2>

        <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-2">
          {PROPERTY_TYPES.map((type) => (
            <div
              key={type.name}
              className="w-[220px] shrink-0 overflow-hidden rounded-card border border-bc-gray-200 bg-white"
            >
              <div
                style={{ background: type.gradient }}
                className="flex h-[140px] items-center justify-center text-5xl"
              >
                <span aria-hidden>{type.emoji}</span>
              </div>
              <div className="px-3 py-3">
                <div className="font-bold text-bc-gray-900">{type.name}</div>
                <div className="text-meta text-bc-gray-500">{type.count}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Get inspiration */}
      <section className="mx-auto mt-14 max-w-[1128px] px-4">
        <h2 className="text-2xl font-bold text-bc-gray-900">Get inspiration for your next trip</h2>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          {INSPIRATION.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-card border border-bc-gray-200 bg-white"
            >
              <div
                style={{ background: item.gradient }}
                className="flex h-[160px] items-center justify-center text-6xl"
              >
                <span aria-hidden>{item.emoji}</span>
              </div>
              <div className="px-4 py-4">
                <h3 className="font-bold text-bc-gray-900">{item.title}</h3>
                <p className="mt-1 text-meta text-bc-gray-500">{item.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
