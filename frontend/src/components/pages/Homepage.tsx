import { useDemoStore } from '../../store/demoStore';
import { SearchBar } from '../search/SearchBar';
import { landingImages } from '../../assets/landing';

const HERO_PILLS = [
  'Wellness & Spa',
  'Boutique Hotels',
  'Romantic Getaways',
  'Mountain Retreats',
  'Desert Escapes',
];

// Hide a photo that fails to decode so the gradient underneath shows through —
// keeps the scripted demo presentable even if an asset is ever missing.
const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none';
};

interface Destination {
  name: string;
  imageAlt: string;
  gradient: string;
  image: string;
  imagePosition: string;
  photoNote: string;
  featured?: boolean;
}

const DESTINATIONS: Destination[] = [
  {
    name: 'Sedona',
    imageAlt: 'Sedona red rock landscape',
    gradient: 'linear-gradient(135deg, #C8654A 0%, #9E4A35 55%, #6B2C39 100%)',
    image: landingImages.destSedona,
    imagePosition: 'center center',
    photoNote: 'Red rocks and spa stays',
    featured: true,
  },
  {
    name: 'Asheville',
    imageAlt: 'Asheville Blue Ridge mountain view',
    gradient: 'linear-gradient(135deg, #5B7B5A 0%, #3E5C4A 100%)',
    image: landingImages.destAsheville,
    imagePosition: 'center center',
    photoNote: 'Blue Ridge weekends',
  },
  {
    name: 'Marfa',
    imageAlt: 'Marfa desert art storefront',
    gradient: 'linear-gradient(135deg, #D9A066 0%, #B97A45 100%)',
    image: landingImages.destMarfa,
    imagePosition: 'center center',
    photoNote: 'Desert art stays',
  },
  {
    name: 'Big Sur',
    imageAlt: 'Big Sur coastal bridge at sunset',
    gradient: 'linear-gradient(135deg, #4A89C8 0%, #2C4F6B 100%)',
    image: landingImages.destBigSur,
    imagePosition: 'center 38%',
    photoNote: 'Pacific coast escapes',
  },
  {
    name: 'Hudson Valley',
    imageAlt: 'Hudson Valley autumn riverside estate',
    gradient: 'linear-gradient(135deg, #B86B5A 0%, #5E332C 100%)',
    image: landingImages.destHudson,
    imagePosition: 'center center',
    photoNote: 'Upstate boutique inns',
  },
];

interface PropertyType {
  name: string;
  count: string;
  imageAlt: string;
  image: string;
  imagePosition: string;
  gradient: string;
}

const PROPERTY_TYPES: PropertyType[] = [
  {
    name: 'Hotels',
    count: '1,840 properties',
    imageAlt: 'Hotels grand hotel facade',
    image: landingImages.typeHotels,
    imagePosition: 'center center',
    gradient: 'linear-gradient(135deg, #4A89C8, #2C4F6B)',
  },
  {
    name: 'Resorts',
    count: '920 properties',
    imageAlt: 'Resorts poolside villa grounds',
    image: landingImages.typeResorts,
    imagePosition: 'center center',
    gradient: 'linear-gradient(135deg, #D9A066, #B97A45)',
  },
  {
    name: 'Spa Retreats',
    count: '2,340 properties',
    imageAlt: 'Spa Retreats massage treatment',
    image: landingImages.typeSpa,
    imagePosition: 'center 42%',
    gradient: 'linear-gradient(135deg, #5B7B5A, #2C4636)',
  },
  {
    name: 'Cabins',
    count: '1,120 properties',
    imageAlt: 'Cabins wooded A-frame stay',
    image: landingImages.typeCabins,
    imagePosition: 'center center',
    gradient: 'linear-gradient(135deg, #C8654A, #6B3A2E)',
  },
  {
    name: 'Villas',
    count: '760 properties',
    imageAlt: 'Villas modern private pool home',
    image: landingImages.typeVillas,
    imagePosition: 'center center',
    gradient: 'linear-gradient(135deg, #C85A6B, #6B2C39)',
  },
];

interface Inspiration {
  title: string;
  blurb: string;
  imageAlt: string;
  image: string;
  imagePosition: string;
  gradient: string;
}

const INSPIRATION: Inspiration[] = [
  {
    title: 'The Rise of Wellness Travel',
    blurb: 'How spa-first getaways became the fastest-growing way to vacation.',
    imageAlt: 'Wellness travel sunset yoga',
    image: landingImages.inspWellness,
    imagePosition: 'center 44%',
    gradient: 'linear-gradient(135deg, #5B7B5A, #3E5C4A)',
  },
  {
    title: 'Top 10 Spa Resorts in the Southwest',
    blurb: 'From red-rock canyons to desert hot springs — our editors’ picks.',
    imageAlt: 'Spa resorts massage therapy',
    image: landingImages.inspSpa,
    imagePosition: 'center 44%',
    gradient: 'linear-gradient(135deg, #D9A066, #7A4E2E)',
  },
  {
    title: 'Why Sedona Is the New Tulum',
    blurb: 'The Arizona desert town quietly drawing the wellness crowd.',
    imageAlt: 'Sedona desert wellness landscape',
    image: landingImages.inspDesert,
    imagePosition: 'center center',
    gradient: 'linear-gradient(135deg, #C8654A, #6B2C39)',
  },
];

export function Homepage() {
  const navigateTo = useDemoStore((s) => s.navigateTo);

  return (
    <div className="bg-bc-gray-100 pb-12">
      {/* Hero — Sedona photo behind the brand-navy headline, darkened so the
          white type stays legible. The gradient is layered over the image. */}
      <section className="relative overflow-hidden bg-bc-navy">
        <img
          src={landingImages.heroSedona}
          alt=""
          aria-hidden
          onError={hideOnError}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bc-navy via-bc-navy/85 to-bc-navy/40" />
        <div className="relative mx-auto max-w-[1128px] px-4 pb-16 pt-8">
          <h1 className="text-3xl font-bold text-white drop-shadow-sm md:text-[42px] md:leading-tight">
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
      <div
        data-testid="homepage-search-shell"
        className="relative z-10 mx-auto -mt-8 max-w-[1128px] px-4"
      >
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
                'group relative h-[280px] shrink-0 overflow-hidden rounded-card text-left shadow-[0_14px_36px_rgba(0,0,0,0.16)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(0,0,0,0.22)] ' +
                (dest.featured ? 'w-[400px]' : 'w-[250px]')
              }
            >
              <img
                src={dest.image}
                alt={dest.imageAlt}
                onError={hideOnError}
                style={{ objectPosition: dest.imagePosition }}
                className="absolute inset-0 h-full w-full object-cover saturate-[1.08] transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-white/5" />
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/18 to-transparent opacity-70" />
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-bc-gray-900 shadow-sm">
                {dest.featured ? 'Featured' : 'Trending'}
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white drop-shadow">{dest.name}</span>
                  <span className="text-lg" aria-hidden>
                    🇺🇸
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-white/85 drop-shadow">
                  {dest.photoNote}
                </p>
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
              className="group w-[220px] shrink-0 overflow-hidden rounded-card border border-bc-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div
                style={{ background: type.gradient }}
                className="relative h-[156px] overflow-hidden"
              >
                <img
                  src={type.image}
                  alt={type.imageAlt}
                  onError={hideOnError}
                  style={{ objectPosition: type.imagePosition }}
                  className="h-full w-full object-cover saturate-[1.06] transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-white/10" />
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-bc-gray-900 shadow-sm">
                  Curated
                </div>
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
              className="group overflow-hidden rounded-card border border-bc-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div
                style={{ background: item.gradient }}
                className="relative h-[184px] overflow-hidden"
              >
                <img
                  src={item.image}
                  alt={item.imageAlt}
                  onError={hideOnError}
                  style={{ objectPosition: item.imagePosition }}
                  className="h-full w-full object-cover saturate-[1.05] transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-white/10" />
                <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-bc-gray-900 shadow-sm">
                  Travel guide
                </div>
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
