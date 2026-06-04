import { useDemoStore } from '../../store/demoStore';
import { PROPERTIES, getProperty } from '../../data/properties';
import { PropertyHeader } from '../property/PropertyHeader';
import { PhotoGallery } from '../property/PhotoGallery';
import { FacilitiesGrid } from '../property/FacilitiesGrid';
import { RoomTable } from '../property/RoomTable';
import { BookingSidebar } from '../property/BookingSidebar';

const BREADCRUMB = ['Home', 'United States', 'Arizona', 'Sedona'];

export function PropertyDetail() {
  const propertyId = useDemoStore((s) => s.viewParams.propertyId);

  // Fall back to the first property if no/unknown id was supplied.
  const property = (propertyId && getProperty(propertyId)) || PROPERTIES[0];

  if (!property) {
    return (
      <div className="mx-auto max-w-[1128px] px-4 py-16 text-center text-bc-gray-500">
        Property not found.
      </div>
    );
  }

  return (
    <div className="bg-bc-gray-100 pb-12">
      <div className="mx-auto max-w-[1128px] px-4 pt-5">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1 text-meta text-bc-blue">
          {BREADCRUMB.map((crumb) => (
            <span key={crumb} className="flex items-center gap-1">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline">
                {crumb}
              </a>
              <span className="text-bc-gray-300">›</span>
            </span>
          ))}
          <span className="text-bc-gray-700">{property.name}</span>
        </nav>

        {/* Header */}
        <div className="mt-4">
          <PropertyHeader property={property} />
        </div>

        {/* Gallery */}
        <div className="mt-5">
          <PhotoGallery property={property} />
        </div>

        {/* Two-column body */}
        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="flex flex-1 flex-col gap-8">
            {/* Description */}
            <section>
              <h2 className="text-xl font-bold text-bc-gray-900">Overview</h2>
              <div className="mt-3 space-y-3">
                {property.description.map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-bc-gray-700">
                    {para}
                  </p>
                ))}
              </div>
            </section>

            <FacilitiesGrid property={property} />
            <RoomTable property={property} />
          </div>

          {/* Sticky booking sidebar */}
          <div className="lg:w-[320px] lg:shrink-0">
            <div className="lg:sticky lg:top-20">
              <BookingSidebar property={property} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
