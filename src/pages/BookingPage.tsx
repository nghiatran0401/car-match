import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vehicles } from '../data/vehicles';
import { getLocalizedShowrooms } from '../data/showrooms';
import { saveLead } from '../lib/leads';
import { trackEvent } from '../lib/analytics';
import { useProfile } from '../context/ProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';

export default function BookingPage() {
  const { language, t } = useLanguage();
  const { profile } = useProfile();
  const [searchParams] = useSearchParams();
  const modelSlug = searchParams.get('model') ?? '';
  const vehicle = useMemo(() => {
    const hit = vehicles.find(v => v.modelSlug === modelSlug);
    return hit ? localizeVehicle(hit, language) : null;
  }, [modelSlug, language]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const showrooms = useMemo(() => getLocalizedShowrooms(language), [language]);
  const [showroomId, setShowroomId] = useState(showrooms[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('morning');
  const [channel, setChannel] = useState('phone');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    trackEvent('booking_started', { vehicleModelSlug: vehicle?.modelSlug });
  }, [vehicle?.modelSlug]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;

    saveLead({
      type: 'booking',
      vehicleModelSlug: vehicle?.modelSlug,
      showroomId,
      contact: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      notes: JSON.stringify({ showroomId, date, timeWindow, channel, freeText: notes }),
      profileSnapshot: profile,
      commercialContext: {
        reservationIntent: true,
      },
    });

    trackEvent('booking_submitted', { vehicleModelSlug: vehicle?.modelSlug });
    setDone(true);
  };

  if (done) {
    return (
      <section className="surface mx-auto w-full max-w-3xl p-6 sm:p-8 text-center">
        <p className="kicker">{t({ vi: 'Đã lưu nhu cầu đặt lịch', en: 'Booking intent saved' })}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{t({ vi: 'Đã tiếp nhận yêu cầu', en: 'Request received' })}</h1>
        <p className="mt-2 text-sm text-slate-600">{t({ vi: 'Tư vấn viên sẽ liên hệ theo kênh và thời gian bạn chọn.', en: 'A consultant can follow up using your preferred channel and timing.' })}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/showrooms" className="btn-primary">{t({ vi: 'Xem showroom', en: 'View showrooms' })}</Link>
          <Link to="/recommendations" className="btn-secondary">{t({ vi: 'Về đề xuất', en: 'Back to shortlist' })}</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="surface p-5 sm:p-6">
        <p className="kicker">{t({ vi: 'Nhu cầu mua / thăm showroom', en: 'Offer / visit intent' })}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t({ vi: 'Đặt lịch tư vấn', en: 'Book consultant follow-up' })}</h1>
        <p className="mt-2 text-sm text-slate-600">{t({ vi: 'Tập trung thông tin liên hệ, showroom và thời gian hẹn trong một biểu mẫu.', en: 'Capture contact preference, showroom, and appointment intent in one form.' })}</p>

        <div className="mt-5 space-y-4">
          <div className="surface-muted p-3 text-sm text-slate-700">
            {vehicle ? `${vehicle.name} · ${vehicle.trim} · ${vehicle.priceBand}` : t({ vi: 'Chưa chọn xe — tư vấn chung', en: 'No vehicle selected — general consultation' })}
          </div>

          <label className="block text-sm font-semibold text-slate-700">{t({ vi: 'Họ và tên', en: 'Full name' })}
            <input required value={name} onChange={e => setName(e.target.value)} className="input-base min-h-[48px]" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Email
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-base min-h-[48px]" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">{t({ vi: 'Số điện thoại', en: 'Phone' })}
            <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input-base min-h-[48px]" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">{t({ vi: 'Showroom mong muốn', en: 'Preferred showroom' })}
            <select
              value={showroomId}
              onChange={e => {
                setShowroomId(e.target.value);
                trackEvent('showroom_selected', { vehicleModelSlug: vehicle?.modelSlug });
              }}
              className="input-base min-h-[48px]"
            >
              {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">{t({ vi: 'Ngày mong muốn', en: 'Preferred date' })}
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-base min-h-[48px]" />
            </label>
            <label className="text-sm font-semibold text-slate-700">{t({ vi: 'Khung giờ', en: 'Time window' })}
              <select value={timeWindow} onChange={e => setTimeWindow(e.target.value)} className="input-base min-h-[48px]">
                <option value="morning">{t({ vi: 'Sáng', en: 'Morning' })}</option>
                <option value="afternoon">{t({ vi: 'Chiều', en: 'Afternoon' })}</option>
                <option value="evening">{t({ vi: 'Tối', en: 'Evening' })}</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">{t({ vi: 'Kênh liên hệ', en: 'Contact channel' })}
            <select value={channel} onChange={e => setChannel(e.target.value)} className="input-base min-h-[48px]">
              <option value="phone">{t({ vi: 'Gọi điện', en: 'Phone call' })}</option>
              <option value="zalo">Zalo</option>
              <option value="email">Email</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">{t({ vi: 'Ghi chú (không bắt buộc)', en: 'Notes (optional)' })}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="input-base py-2.5" placeholder={t({ vi: 'Lái thử, thu xe cũ, câu hỏi tài chính...', en: 'Test drive, trade-in, finance questions...' })} />
          </label>

          <button type="submit" className="btn-primary w-full py-3">{t({ vi: 'Gửi yêu cầu đặt lịch', en: 'Submit booking intent' })}</button>
        </div>
      </form>

      <aside className="surface h-fit p-5 sm:p-6">
        <p className="kicker">{t({ vi: 'Bước tiếp theo', en: 'Next step' })}</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">{t({ vi: 'Sẵn sàng bàn giao qua showroom', en: 'Showroom handoff ready' })}</h2>
        <p className="mt-2 text-sm text-slate-600">{t({ vi: 'Luồng này gắn mẫu xe và thông tin liên hệ của bạn vào lead sẵn sàng đặt hẹn.', en: 'This flow ties your selected vehicle and contact details to an appointment-ready lead record.' })}</p>
        <Link to="/showrooms" className="btn-secondary mt-4 inline-flex">{t({ vi: 'Xem bản đồ showroom', en: 'Browse showroom map' })}</Link>
      </aside>
    </div>
  );
}
