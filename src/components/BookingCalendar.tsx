import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

// Phase 3 item 2: "LIVE calendar showing who's booked in where and when …
// at the moment it's very vague."
//
// A month grid where each day lists the creators in-house that night, so you
// can see at a glance whether anyone is staying and where.

type CalBooking = {
  id: string;
  creator_name: string | null;
  property: string;
  check_in: string;
  check_out: string;
  status: string;
  reference_code: string | null;
};

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-green-500',
  approved: 'bg-blue-500',
  submitted: 'bg-orange-500',
  declined: 'bg-muted-foreground',
};

const STATUS_CHIP: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-900 border-green-300',
  approved: 'bg-blue-100 text-blue-900 border-blue-300',
  submitted: 'bg-orange-100 text-orange-900 border-orange-300',
  declined: 'bg-muted text-muted-foreground border-border line-through',
};

// Dates are plain YYYY-MM-DD; parse as local so nothing shifts by a day.
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function BookingCalendar({ bookings }: { bookings: CalBooking[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [propertyFilter, setPropertyFilter] = useState('All');

  const properties = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.property).filter(Boolean))).sort(),
    [bookings]);

  // A booking occupies every night from check-in up to (not including) check-out.
  const byDay = useMemo(() => {
    const map = new Map<string, CalBooking[]>();
    bookings
      .filter((b) => b.status !== 'declined')
      .filter((b) => propertyFilter === 'All' || b.property === propertyFilter)
      .forEach((b) => {
        if (!b.check_in || !b.check_out) return;
        const start = parseDay(b.check_in);
        const end = parseDay(b.check_out);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const key = iso(d);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(b);
        }
      });
    return map;
  }, [bookings, propertyFilter]);

  // Grid runs Monday-first and pads to whole weeks.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const lead = (first.getDay() + 6) % 7;
    const out: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= last.getDate(); d++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = iso(today);

  const nightsThisMonth = cells.reduce((n, c) => n + (c ? (byDay.get(iso(c))?.length ?? 0) : 0), 0);
  const creatorsThisMonth = new Set(
    cells.flatMap((c) => (c ? (byDay.get(iso(c)) || []).map((b) => b.id) : []))).size;

  return (
    <Card className="scroll-mt-6" id="section-calendar">
      <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base sm:text-lg">Stay calendar</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {creatorsThisMonth === 0
                ? 'Nobody staying this month'
                : `${creatorsThisMonth} creator${creatorsThisMonth === 1 ? '' : 's'} · ${nightsThisMonth} night${nightsThisMonth === 1 ? '' : 's'} in ${monthLabel}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Property" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All properties</SelectItem>
                {properties.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs"
                onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-sm font-semibold mt-2">{monthLabel}</p>
      </CardHeader>

      <CardContent className="p-3 sm:p-6 pt-0">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="text-[11px] font-semibold text-muted-foreground text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} className="min-h-[84px] rounded-md bg-muted/30" />;
                const key = iso(day);
                const stays = byDay.get(key) || [];
                const isToday = key === todayKey;
                return (
                  <div key={key}
                    className={`min-h-[84px] rounded-md border p-1.5 space-y-1 ${
                      isToday ? 'border-primary ring-1 ring-primary/40 bg-primary/5' : 'border-border'
                    } ${stays.length ? '' : 'bg-muted/20'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {day.getDate()}
                      </span>
                      {stays.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">{stays.length}</span>
                      )}
                    </div>
                    {stays.slice(0, 2).map((b) => (
                      <div key={b.id}
                        title={`${b.creator_name || 'Creator'} · ${b.property} · ${b.check_in} to ${b.check_out}${b.reference_code ? ` · ${b.reference_code}` : ''}`}
                        className={`text-[10px] leading-tight rounded border px-1 py-0.5 truncate ${STATUS_CHIP[b.status] || 'bg-muted'}`}>
                        <span className="font-semibold">{(b.creator_name || 'Creator').split(' ')[0]}</span>
                        <span className="opacity-75"> · {b.property}</span>
                      </div>
                    ))}
                    {stays.length > 2 && (
                      <p className="text-[10px] text-muted-foreground pl-1">+{stays.length - 2} more</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[
            { s: 'confirmed', label: 'Confirmed' },
            { s: 'approved', label: 'Awaiting reference' },
            { s: 'submitted', label: 'Needs review' },
          ].map(({ s, label }) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />{label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />Hover a stay for full dates and reference
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
