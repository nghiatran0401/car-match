export interface ShowroomLocation {
  id: string;
  name: string;
  address: string;
  district: string;
  phone: string;
  hours: string;
  /** WGS84 for map framing */
  lat: number;
  lon: number;
}

export const showrooms: ShowroomLocation[] = [
  {
    id: 'sgn-d7',
    name: 'CarMatch Tasco Experience — District 7',
    address: 'Nguyen Luong Bang, Tan Phu Ward, District 7, Ho Chi Minh City',
    district: 'Ho Chi Minh City',
    phone: '+84 28 5413 9000',
    hours: 'Mon–Sat 9:00–20:00 · Sun 10:00–18:00',
    lat: 10.7312,
    lon: 106.7224,
  },
  {
    id: 'hni-caugiay',
    name: 'CarMatch Tasco Studio — Cau Giay',
    address: 'Tran Thai Tong Street, Cau Giay District, Hanoi',
    district: 'Hanoi',
    phone: '+84 24 3200 7700',
    hours: 'Mon–Sat 9:00–19:30 · Sun 10:00–17:30',
    lat: 21.0282,
    lon: 105.8016,
  },
  {
    id: 'bdg-thuduc',
    name: 'CarMatch EV Lounge — Thu Duc City',
    address: 'Mai Chi Tho Boulevard, Thu Duc City, Ho Chi Minh City',
    district: 'Thu Duc City',
    phone: '+84 28 7300 2200',
    hours: 'Tue–Sun 9:30–20:00',
    lat: 10.7769,
    lon: 106.7009,
  },
];

export function getLocalizedShowrooms(language: 'vi' | 'en'): ShowroomLocation[] {
  if (language === 'en') return showrooms;
  return [
    {
      ...showrooms[0],
      name: 'CarMatch Tasco Experience — Quận 7',
      address: 'Nguyễn Lương Bằng, phường Tân Phú, Quận 7, TP. Hồ Chí Minh',
      district: 'TP. Hồ Chí Minh',
      hours: 'Thứ 2–Thứ 7 9:00–20:00 · Chủ nhật 10:00–18:00',
    },
    {
      ...showrooms[1],
      name: 'CarMatch Tasco Studio — Cầu Giấy',
      address: 'Đường Trần Thái Tông, quận Cầu Giấy, Hà Nội',
      district: 'Hà Nội',
      hours: 'Thứ 2–Thứ 7 9:00–19:30 · Chủ nhật 10:00–17:30',
    },
    {
      ...showrooms[2],
      name: 'CarMatch EV Lounge — TP. Thủ Đức',
      address: 'Đại lộ Mai Chí Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
      district: 'TP. Thủ Đức',
      hours: 'Thứ 3–Chủ nhật 9:30–20:00',
    },
  ];
}

export function showroomsMapEmbedUrl(): string {
  const lats = showrooms.map(s => s.lat);
  const lons = showrooms.map(s => s.lon);
  const pad = 0.04;
  const minLon = Math.min(...lons) - pad;
  const minLat = Math.min(...lats) - pad;
  const maxLon = Math.max(...lons) + pad;
  const maxLat = Math.max(...lats) + pad;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    `${minLon},${minLat},${maxLon},${maxLat}`,
  )}&layer=mapnik`;
}

export function mapsDirectionsUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/directions?engine=graphhopper_car&route=%3B${lat}%2C${lon}`;
}
