type CountryBox = {
  code: string;
  name: string;
  west: number;
  south: number;
  east: number;
  north: number;
};

const countryBoxes: CountryBox[] = [
  { code: "US", name: "United States", west: -125, south: 24, east: -66, north: 49 },
  { code: "CA", name: "Canada", west: -141, south: 49, east: -52, north: 70 },
  { code: "MX", name: "Mexico", west: -118, south: 14, east: -86, north: 33 },
  { code: "BR", name: "Brazil", west: -74, south: -34, east: -34, north: 6 },
  { code: "AR", name: "Argentina", west: -74, south: -56, east: -53, north: -21 },
  { code: "GB", name: "United Kingdom", west: -8, south: 49, east: 2, north: 59 },
  { code: "FR", name: "France", west: -5, south: 42, east: 8, north: 51 },
  { code: "ES", name: "Spain", west: -10, south: 36, east: 4, north: 44 },
  { code: "DE", name: "Germany", west: 5, south: 47, east: 16, north: 55 },
  { code: "IT", name: "Italy", west: 6, south: 36, east: 19, north: 47 },
  { code: "PL", name: "Poland", west: 14, south: 49, east: 24, north: 55 },
  { code: "UA", name: "Ukraine", west: 22, south: 44, east: 41, north: 53 },
  { code: "ZA", name: "South Africa", west: 16, south: -35, east: 33, north: -22 },
  { code: "EG", name: "Egypt", west: 25, south: 22, east: 36, north: 32 },
  { code: "NG", name: "Nigeria", west: 2, south: 4, east: 15, north: 14 },
  { code: "IN", name: "India", west: 68, south: 7, east: 98, north: 36 },
  { code: "CN", name: "China", west: 73, south: 18, east: 135, north: 54 },
  { code: "JP", name: "Japan", west: 129, south: 31, east: 146, north: 46 },
  { code: "ID", name: "Indonesia", west: 95, south: -11, east: 141, north: 6 },
  { code: "AU", name: "Australia", west: 112, south: -44, east: 154, north: -10 },
  { code: "RU", name: "Russia", west: 30, south: 41, east: 180, north: 82 }
];

export function countryForCoordinates(latitude: number, longitude: number) {
  return (
    countryBoxes.find(
      (country) =>
        longitude >= country.west &&
        longitude <= country.east &&
        latitude >= country.south &&
        latitude <= country.north
    ) ?? null
  );
}

export function countryNameForCoordinates(latitude: number, longitude: number) {
  return countryForCoordinates(latitude, longitude)?.name ?? "International waters";
}
