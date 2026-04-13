import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getLocalizedShowrooms, mapsDirectionsUrl, showrooms } from '../data/showrooms';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../context/LanguageContext';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_MAP_CENTER: [number, number] = [16.5, 106.5];

interface MapViewportSyncProps {
  selectedShowroom: (typeof showrooms)[number] | null;
}

function MapViewportSync({ selectedShowroom }: MapViewportSyncProps) {
  const map = useMap();

  useEffect(() => {
    if (!selectedShowroom) {
      map.setView(DEFAULT_MAP_CENTER, 5, { animate: true, duration: 0.4 });
      return;
    }
    map.flyTo([selectedShowroom.lat, selectedShowroom.lon], 14, { duration: 0.6 });
  }, [map, selectedShowroom]);

  return null;
}

export default function ShowroomsPage() {
  const { language, t } = useLanguage();
  const localizedShowrooms = getLocalizedShowrooms(language);
  const [selectedShowroomId, setSelectedShowroomId] = useState(localizedShowrooms[0]?.id ?? '');
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    trackEvent('showroom_viewed');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const updateViewport = (event?: MediaQueryListEvent) => {
      setIsMobileViewport(event ? event.matches : mediaQuery.matches);
    };
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  const selected = localizedShowrooms.find(s => s.id === selectedShowroomId) ?? localizedShowrooms[0] ?? null;

  const focusShowroom = (showroomId: string) => {
    const target = localizedShowrooms.find(s => s.id === showroomId);
    if (!target) return;
    setSelectedShowroomId(showroomId);
    trackEvent('showroom_marker_clicked');
    trackEvent('showroom_selected');
  };

  return (
    <div className="space-y-5">
      <section className="surface p-5 sm:p-6">
        <p className="kicker">{t({ vi: 'Showroom', en: 'Showrooms' })}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t({ vi: 'Ghé showroom trực tiếp', en: 'Visit us in person' })}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t({
            vi: 'Danh sách showroom ở bên trái, bản đồ ở bên phải. Chạm showroom để zoom đúng vị trí.',
            en: 'Showroom list on the left and map on the right. Tap a showroom to zoom to the exact location.',
          })}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-10">
        <div className="order-2 space-y-3 lg:order-1 lg:col-span-3">
          {localizedShowrooms.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => focusShowroom(s.id)}
              className={
                selectedShowroomId === s.id
                  ? 'surface w-full border-slate-900 p-4 text-left'
                  : 'surface card-hover w-full p-4 text-left'
              }
            >
              <p className="text-sm font-semibold text-slate-900">{s.name}</p>
              <p className="mt-1 text-xs text-slate-600">{s.address}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.district}</p>
            </button>
          ))}
        </div>

        <div className="order-1 space-y-3 lg:order-2 lg:col-span-7">
          {selected ? (
            <div className="surface p-3 sm:p-4">
              <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
              <p className="mt-1 text-xs text-slate-600">{selected.address}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${selected.phone.replace(/\s/g, '')}`} className="btn-primary">
                  {t({ vi: 'Gọi showroom', en: 'Call showroom' })}
                </a>
                <a
                  href={mapsDirectionsUrl(selected.lat, selected.lon)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  {t({ vi: 'Mở bản đồ', en: 'Open maps' })}
                </a>
              </div>
            </div>
          ) : null}
          <div className="surface overflow-hidden p-0">
          <MapContainer
            center={selected ? [selected.lat, selected.lon] : DEFAULT_MAP_CENTER}
            zoom={selected ? 13 : 5}
            scrollWheelZoom={!isMobileViewport}
            className="h-[340px] w-full sm:h-[420px] lg:h-[620px]"
          >
            <MapViewportSync selectedShowroom={selected} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {localizedShowrooms.map(showroom => (
              <Marker
                key={showroom.id}
                position={[showroom.lat, showroom.lon]}
                eventHandlers={{
                  click: () => {
                    setSelectedShowroomId(showroom.id);
                    trackEvent('showroom_marker_clicked');
                    trackEvent('showroom_selected');
                  },
                }}
              >
                <Popup>
                  <div className="min-w-[220px] space-y-1.5">
                    <p className="text-sm font-semibold text-slate-900">{showroom.name}</p>
                    <p className="text-xs text-slate-600">{showroom.address}</p>
                    <p className="text-xs text-slate-500">{showroom.hours}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <a href={`tel:${showroom.phone.replace(/\s/g, '')}`} className="btn-primary !px-2.5 !py-1.5 !text-xs">
                        {t({ vi: 'Gọi', en: 'Call' })}
                      </a>
                      <a
                        href={mapsDirectionsUrl(showroom.lat, showroom.lon)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary !px-2.5 !py-1.5 !text-xs"
                      >
                        {t({ vi: 'Chỉ đường', en: 'Directions' })}
                      </a>
                      <Link to="/booking" className="btn-secondary !px-2.5 !py-1.5 !text-xs">
                        {t({ vi: 'Đặt lịch', en: 'Book' })}
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
