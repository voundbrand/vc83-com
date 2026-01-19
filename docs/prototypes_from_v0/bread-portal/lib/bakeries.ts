export interface Bakery {
  id: string
  name: string
  owner: string
  description: string
  location: string
  lat: number
  lng: number
  deliveryAvailable: boolean
  pickupOnly: boolean
  deliveryRadius?: string // in km
  rating: number
  totalBreads: number
  image?: string
  founded: string
}

const SAMPLE_BAKERIES: Bakery[] = [
  {
    id: "1",
    name: "Sarahs Backstube",
    owner: "Sarah Müller",
    description: "Traditionelle Handwerkskunst seit 2018. Spezialisiert auf Sauerteigbrote mit langer Fermentation.",
    location: "Berlin-Mitte",
    lat: 52.52,
    lng: 13.405,
    deliveryAvailable: true,
    pickupOnly: false,
    deliveryRadius: "15 km",
    rating: 4.9,
    totalBreads: 12,
    image: "/cozy-artisan-bakery-interior.jpg",
    founded: "2018",
  },
  {
    id: "2",
    name: "Goldene Körner Co.",
    owner: "Michael Schmidt",
    description: "Bio-Bäckerei mit eigener Mühle. Alle Zutaten aus regionalem Anbau.",
    location: "München-Schwabing",
    lat: 48.1351,
    lng: 11.582,
    deliveryAvailable: true,
    pickupOnly: false,
    deliveryRadius: "10 km",
    rating: 4.8,
    totalBreads: 8,
    image: "/organic-bakery-with-grains.jpg",
    founded: "2015",
  },
  {
    id: "3",
    name: "Mediterrane Backwaren",
    owner: "Antonio Rossi",
    description: "Italienische Spezialitäten direkt aus dem Steinofen.",
    location: "Hamburg-Altona",
    lat: 53.5511,
    lng: 9.9937,
    deliveryAvailable: false,
    pickupOnly: true,
    rating: 4.7,
    totalBreads: 6,
    image: "/italian-bakery-with-stone-oven.jpg",
    founded: "2020",
  },
  {
    id: "4",
    name: "Ernte-Heim-Bäckerei",
    owner: "Familie Weber",
    description: "Familienbetrieb in dritter Generation. Bekannt für herzhafte Kornbrote.",
    location: "Köln-Ehrenfeld",
    lat: 50.9375,
    lng: 6.9603,
    deliveryAvailable: true,
    pickupOnly: false,
    deliveryRadius: "20 km",
    rating: 4.9,
    totalBreads: 15,
    image: "/traditional-family-bakery.jpg",
    founded: "1987",
  },
  {
    id: "5",
    name: "Süße Morgenbrote",
    owner: "Lisa Hoffmann",
    description: "Spezialisiert auf süße Brote und Gebäck für den perfekten Start in den Tag.",
    location: "Frankfurt-Westend",
    lat: 50.1109,
    lng: 8.6821,
    deliveryAvailable: false,
    pickupOnly: true,
    rating: 4.6,
    totalBreads: 7,
    image: "/sweet-bread-bakery-morning-pastries.jpg",
    founded: "2019",
  },
  {
    id: "6",
    name: "La Boulangerie",
    owner: "Pierre Dubois",
    description: "Authentische französische Backkunst mitten in Deutschland.",
    location: "Stuttgart-Mitte",
    lat: 48.7758,
    lng: 9.1829,
    deliveryAvailable: true,
    pickupOnly: false,
    deliveryRadius: "12 km",
    rating: 4.8,
    totalBreads: 10,
    image: "/french-boulangerie-authentic.jpg",
    founded: "2016",
  },
]

export function getBakeries(): Bakery[] {
  return SAMPLE_BAKERIES
}

export function getBakeryById(id: string): Bakery | undefined {
  return SAMPLE_BAKERIES.find((bakery) => bakery.id === id)
}

export function getUniqueCities(): string[] {
  const cities = SAMPLE_BAKERIES.map((b) => b.location.split("-")[0])
  return [...new Set(cities)].sort()
}
