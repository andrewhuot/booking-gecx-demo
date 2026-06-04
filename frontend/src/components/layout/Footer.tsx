const COLUMNS: { heading: string; links: string[] }[] = [
  {
    heading: 'Support',
    links: ['Coronavirus (COVID-19) FAQs', 'Manage your trips', 'Contact Customer Service', 'Safety resource center'],
  },
  {
    heading: 'Discover',
    links: ['Genius loyalty program', 'Seasonal and holiday deals', 'Travel articles', 'Booking.com for Business'],
  },
  {
    heading: 'Terms & Settings',
    links: ['Privacy & cookies', 'Terms & conditions', 'Modern Slavery Statement', 'Human Rights Statement'],
  },
  {
    heading: 'Partners',
    links: ['Extranet login', 'Partner help', 'List your property', 'Become an affiliate'],
  },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-bc-gray-200 bg-white">
      <div className="mx-auto max-w-[1128px] px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-sm font-bold text-bc-gray-900">{col.heading}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-meta text-bc-gray-500 hover:text-bc-blue hover:underline"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-bc-gray-200">
        <div className="mx-auto max-w-[1128px] px-4 py-5 text-center text-meta text-bc-gray-500">
          Booking.com is part of Booking Holdings Inc., the world leader in online travel and related services.
        </div>
      </div>
    </footer>
  );
}
