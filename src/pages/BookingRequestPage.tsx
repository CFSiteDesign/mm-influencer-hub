import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { DateRange } from 'react-day-picker';
import { addDays, differenceInCalendarDays, format, startOfToday } from 'date-fns';
import { CheckCircle2, CalendarDays, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import madMonkeyLogo from '@/assets/mad-monkey-logo.png';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Property = { location: string; country: string };
type Creator = { name: string; creatorId: string | null; email: string };

const MAX_NIGHTS = 5;
const MIN_LEAD_DAYS = 2;

export default function BookingRequestPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const isAmend = searchParams.get('mode') === 'amend';

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  const [range, setRange] = useState<DateRange | undefined>();
  const [property, setProperty] = useState('');
  const [otherRequests, setOtherRequests] = useState('');
  const [requestKind, setRequestKind] = useState<'change' | 'new'>('change');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Earliest selectable check-in: at least MIN_LEAD_DAYS from today.
  const minDate = useMemo(() => addDays(startOfToday(), MIN_LEAD_DAYS), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [ctxRes, propsRes] = await Promise.all([
        supabase.functions.invoke('submit-booking', { body: { token, action: 'context' } }),
        supabase
          .from('properties')
          .select('location, country')
          .eq('is_active', true)
          .eq('excluded_from_booking', false)
          .order('sort_order', { ascending: true }),
      ]);

      const ctx = ctxRes.data as any;
      if (ctxRes.error || !ctx?.ok) {
        setInvalid(true);
        setLoading(false);
        return;
      }

      setCreator(ctx.creator);
      setProperties((propsRes.data as Property[]) || []);
      setLoading(false);
    };
    if (token) load();
  }, [token]);

  const nights = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0;

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of properties) {
      if (!map.has(p.country)) map.set(p.country, []);
      map.get(p.country)!.push(p.location);
    }
    return Array.from(map.entries());
  }, [properties]);

  const canSubmit = !!range?.from && !!range?.to && nights >= 1 && nights <= MAX_NIGHTS && !!property;

  const handleSubmit = async () => {
    if (!canSubmit || !range?.from || !range?.to) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-booking', {
        body: {
          token,
          action: 'submit',
          property,
          checkIn: format(range.from, 'yyyy-MM-dd'),
          checkOut: format(range.to, 'yyyy-MM-dd'),
          otherRequests: otherRequests.trim() || null,
          // Amend mode lets the creator choose: change an existing booking
          // (flags as "amended" / urgent) or request an additional one ("new").
          type: isAmend && requestKind === 'change' ? 'amended' : 'new',
        },
      });

      const res = data as any;
      if (error || !res?.ok) {
        toast.error(res?.error || 'Could not submit your booking. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>;
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <img src={madMonkeyLogo} alt="Mad Monkey" className="h-12 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">This link isn't valid</h1>
          <p className="text-muted-foreground text-sm">
            We couldn't find your creator profile for this link. Please use the “Submit Your Stay Dates”
            button from your welcome email, or contact{' '}
            <a href="mailto:creatorhub@madmonkeyhostels.com" className="text-primary underline">creatorhub@madmonkeyhostels.com</a>.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-5 max-w-md">
          <img src={madMonkeyLogo} alt="Mad Monkey" className="h-12 mx-auto" />
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">
            {isAmend ? 'Request submitted! 🎉' : 'Dates submitted! 🎉'}
          </h2>
          <p className="text-muted-foreground">
            Thanks {creator?.name?.split(' ')[0] || 'there'}! Our team will review your request and be in touch
            shortly to confirm your stay.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <img src={madMonkeyLogo} alt="Mad Monkey" className="h-8" />
        <span className="text-xs font-semibold text-primary">Creator Hub</span>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isAmend ? 'Change / amend your booking' : 'Submit your dates & requirements'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {creator?.name ? `Hi ${creator.name.split(' ')[0]} — ` : ''}
            pick up to {MAX_NIGHTS} nights, at least {MIN_LEAD_DAYS} days from today.
          </p>
        </div>

        {isAmend && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">What would you like to do?</Label>
            <div className="grid grid-cols-2 gap-2">
              {([['change', 'Change a booking'], ['new', 'New booking']] as const).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setRequestKind(kind)}
                  className={`rounded-xl border-2 py-3 px-3 text-sm font-medium transition-all ${
                    requestKind === kind
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" /> Stay dates
          </Label>
          <div className="rounded-xl border border-border flex justify-center">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              max={MAX_NIGHTS + 1}
              disabled={(date) => date < minDate}
              numberOfMonths={1}
              className="p-3 pointer-events-auto"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {range?.from && range?.to ? (
              <>
                {format(range.from, 'PPP')} → {format(range.to, 'PPP')} ·{' '}
                <span className="font-semibold text-foreground">{nights} night{nights === 1 ? '' : 's'}</span>
              </>
            ) : range?.from ? (
              <>Check-in {format(range.from, 'PPP')} — now choose your check-out.</>
            ) : (
              <>Select your check-in and check-out dates (max {MAX_NIGHTS} nights).</>
            )}
          </p>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Destination
          </Label>
          <Select value={property} onValueChange={setProperty}>
            <SelectTrigger className="h-12 rounded-xl text-base">
              <SelectValue placeholder="Select a Mad Monkey property" />
            </SelectTrigger>
            <SelectContent>
              {grouped.map(([country, locations]) => (
                <SelectGroup key={country}>
                  <SelectLabel>{country}</SelectLabel>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Other requests */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Any other requests?</Label>
          <Textarea
            placeholder="Dietary requirements, accessibility needs, travel companions, anything else…"
            value={otherRequests}
            onChange={(e) => setOtherRequests(e.target.value)}
            className="min-h-[100px] rounded-xl"
          />
        </div>
      </div>

      <div className="px-4 pb-8 md:pb-4 pt-2 max-w-md mx-auto w-full">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full rounded-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
        >
          {submitting ? 'Submitting…' : isAmend ? 'Submit change request' : 'Submit my dates'}
        </Button>
      </div>
    </div>
  );
}
