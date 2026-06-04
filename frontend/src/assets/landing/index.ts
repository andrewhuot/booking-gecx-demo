// Bundled landing-page photography. Imported (not referenced by string path) so
// Vite fingerprints and inlines them into the build — the scripted demo stays
// fully offline. Each key is consumed by Homepage; a CSS gradient remains the
// graceful fallback if an image ever fails to decode.
import heroSedona from './hero-sedona.jpg';
import destSedona from './dest-sedona.jpg';
import destAsheville from './dest-asheville.jpg';
import destMarfa from './dest-marfa.jpg';
import destBigSur from './dest-bigsur.jpg';
import destHudson from './dest-hudson.jpg';
import typeHotels from './type-hotels.jpg';
import typeResorts from './type-resorts.jpg';
import typeSpa from './type-spa.jpg';
import typeCabins from './type-cabins.jpg';
import typeVillas from './type-villas.jpg';
import inspWellness from './insp-wellness.jpg';
import inspSpa from './insp-spa.jpg';
import inspDesert from './insp-desert.jpg';

export const landingImages = {
  heroSedona,
  destSedona,
  destAsheville,
  destMarfa,
  destBigSur,
  destHudson,
  typeHotels,
  typeResorts,
  typeSpa,
  typeCabins,
  typeVillas,
  inspWellness,
  inspSpa,
  inspDesert,
} as const;

export type LandingImageKey = keyof typeof landingImages;
