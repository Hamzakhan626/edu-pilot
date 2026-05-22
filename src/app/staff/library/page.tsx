'use client';
import { useState, useEffect, useCallback } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Files,
  MonitorSmartphone,
  Search,
  Filter,
  Download,
  Link2,
  AlertCircle,
  Bookmark,
  RefreshCw,
  Loader2,
  ChevronDown,
  CheckCircle,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/auth';



// ─── Types ────────────────────────────────────────────────────
type ResourceType  = 'Book' | 'Journal' | 'Magazine' | 'eBook' | 'Video' | 'Other';
type Availability  = 'Available' | 'Issued' | 'Digital';
type Audience      = 'All' | 'Faculty' | 'Students' | 'Staff';
type ReserveStatus = 'pending' | 'approved' | 'cancelled' | 'returned';

interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  type: ResourceType;
  category: string | null;
  year: number | null;
  tags: string[] | null;
  availability: Availability;
  call_no: string | null;
  link: string | null;
  audience: Audience;
  created_at: string;
  // joined
  myReservation?: { id: string; status: ReserveStatus } | null;
}

interface Stats {
  total: number;
  physical: number;
  digital: number;
  issued: number;
}

// ─── Helpers ─────────────────────────────────────────────────
function availBadge(a: Availability) {
  switch (a) {
    case 'Available': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Issued':    return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Digital':   return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

function typeBadgeColor(t: ResourceType) {
  const map: Record<ResourceType, string> = {
    Book:     'bg-slate-100 text-slate-700',
    Journal:  'bg-violet-50 text-violet-700',
    Magazine: 'bg-pink-50 text-pink-700',
    eBook:    'bg-cyan-50 text-cyan-700',
    Video:    'bg-rose-50 text-rose-700',
    Other:    'bg-gray-100 text-gray-600',
  };
  return map[t] ?? 'bg-gray-100 text-gray-600';
}

// ─── Component ────────────────────────────────────────────────
export default function LibraryResourcesPage() {
  const [books, setBooks]                     = useState<LibraryBook[]>([]);
  const [stats, setStats]                     = useState<Stats>({ total: 0, physical: 0, digital: 0, issued: 0 });
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [typeFilter, setTypeFilter]           = useState<'all' | ResourceType>('all');
  const [availFilter, setAvailFilter]         = useState<'all' | Availability>('all');
  const [audienceFilter, setAudienceFilter]   = useState<'all' | Audience>('all');
  const [searchQuery, setSearchQuery]         = useState('');
  const [exporting, setExporting]             = useState(false);
  const [placingHold, setPlacingHold]         = useState<string | null>(null);
  const [holdSuccess, setHoldSuccess]         = useState<string | null>(null);
  const [currentUserId, setCurrentUserId]     = useState<string | null>(null);

  // ── Auth ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // ── Fetch ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all books
      const { data: bookData, error: bookErr } = await supabase
        .from('library_books')
        .select('*')
        .order('title');

      if (bookErr) throw bookErr;

      // 2. Fetch current user's active reservations
      let reservationMap: Record<string, { id: string; status: ReserveStatus }> = {};
      if (currentUserId) {
        const { data: resData } = await supabase
          .from('library_reservations')
          .select('id, book_id, status')
          .eq('user_id', currentUserId)
          .in('status', ['pending', 'approved']);

        (resData ?? []).forEach((r: any) => {
          reservationMap[r.book_id] = { id: r.id, status: r.status };
        });
       }
 console.log("BOOKS RAW:", bookData);
  
         const enriched: LibraryBook[] = (bookData ?? []).map((b: any) => ({
  id: b.id,
  title: b.title,
  author: b.author,

  // ✅ MAP DB → UI
  type: 'Book', // default since DB doesn't have type
  category: b.category,
  year: b.published_year,

  availability:
    b.status === 'Issued'
      ? 'Issued'
      : b.available_copies > 0
      ? 'Available'
      : 'Issued',

  audience: 'All', // default
  tags: [],
  call_no: b.shelf_location,
  link: null,

  created_at: b.created_at,

  myReservation: reservationMap[b.id] ?? null,
}));
           console.log("ENRICHED:", enriched); 
      setBooks(enriched);
      setStats({
        total:    enriched.length,
        physical: enriched.filter(b => ['Book','Journal','Magazine'].includes(b.type)).length,
        digital:  enriched.filter(b => b.availability === 'Digital').length,
        issued:   enriched.filter(b => b.availability === 'Issued').length,
      });
    } catch (e: any) {
      setError(e.message ?? 'Failed to load library data.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);
  
  
  useEffect(() => { fetchData(); }, [fetchData]);
  
  // ── Place hold ───────────────────────────────────────────
  const placeHold = async (book: LibraryBook) => {
    if (!currentUserId) {
      alert('You must be logged in to place a hold.');
      return;
    }
    setPlacingHold(book.id);
    try {
      const { error } = await supabase
        .from('library_reservations')
        .insert({
          book_id:     book.id,
          user_id:     currentUserId,
          reserved_at: new Date().toISOString(),
        });

      if (error) throw error;

      setHoldSuccess(book.id);
      setTimeout(() => setHoldSuccess(null), 3000);
      await fetchData(); // refresh to show updated reservation state
    } catch (e: any) {
      alert(`Failed to place hold: ${e.message}`);
    } finally {
      setPlacingHold(null);
    }
  };
 
console.log("USER:", currentUserId);

// ── Cancel hold ──────────────────────────────────────────
const cancelHold = async (book: LibraryBook) => {
    if (!book.myReservation) return;
    setPlacingHold(book.id);
    try {
      const { error } = await supabase
        .from('library_reservations')
        .update({ status: 'cancelled' })
        .eq('id', book.myReservation.id);
        
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      alert(`Failed to cancel hold: ${e.message}`);
    } finally {
      setPlacingHold(null);
    }
  };

  // ── Export CSV ───────────────────────────────────────────
  const exportList = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .order('title');

      if (error) throw error;
      if (!data?.length) { alert('No books to export.'); return; }

      const headers = ['ID','Title','Author','Type','Category','Year','Audience','Availability','Call No','Tags','Link'];
      const rows = data.map((b: any) =>
        [
          b.id,
          b.title,
          b.author ?? '',
          b.type,
          b.category ?? '',
          b.year ?? '',
          b.audience,
          b.availability,
          b.call_no ?? '',
          (b.tags ?? []).join('; '),
          b.link ?? '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );

      const csv  = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `library-catalogue-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ── Filter ───────────────────────────────────────────────
  const filtered = books.filter(b => {
    if (typeFilter    !== 'all' && b.type         !== typeFilter)    return false;
    if (availFilter   !== 'all' && b.availability !== availFilter)   return false;
    if (audienceFilter !== 'all' && b.audience    !== audienceFilter && b.audience !== 'All') return false;

    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      (b.author   ?? '').toLowerCase().includes(q) ||
      (b.category ?? '').toLowerCase().includes(q) ||
      (b.call_no  ?? '').toLowerCase().includes(q) ||
      (b.tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  });

  // ── Loading / Error states ────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-indigo-600">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-sm font-medium">Loading library catalogue…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">Retry</Button>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────
  const summaryCards = [
    { label: 'Total resources',    value: stats.total,    icon: Files,             color: 'blue',   note: 'All books, journals & digital items' },
    { label: 'Physical items',     value: stats.physical, icon: BookOpen,          color: 'emerald', note: 'Books, journals, magazines' },
    { label: 'Digital resources',  value: stats.digital,  icon: MonitorSmartphone, color: 'violet', note: 'eBooks, videos, online materials' },
    { label: 'Currently issued',   value: stats.issued,   icon: Bookmark,          color: 'orange', note: 'Items on loan to users' },
  ];

  const colorTokens: Record<string, string> = {
    blue:    'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    violet:  'bg-violet-100 text-violet-600',
    orange:  'bg-amber-100 text-amber-600',
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-700 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Library Resources</h1>
            <p className="text-indigo-200 text-sm">
              Browse, search, and reserve physical &amp; digital resources
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={fetchData}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={exportList}
              disabled={exporting}
              className="bg-white text-slate-800 hover:bg-slate-100"
              size="sm"
            >
              {exporting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />}
              {exporting ? 'Exporting…' : 'Export List'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${colorTokens[s.color]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs font-medium text-gray-700 mt-0.5">{s.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-5 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search title, author, subject, tag, call number…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Dropdowns row */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </div>

            {/* Type */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="all">All types</option>
                {(['Book','Journal','Magazine','eBook','Video','Other'] as ResourceType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>

            {/* Availability */}
            <div className="relative">
              <select
                value={availFilter}
                onChange={e => setAvailFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="all">All availability</option>
                <option value="Available">Available</option>
                <option value="Issued">Issued</option>
                <option value="Digital">Digital</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>

            {/* Audience */}
            <div className="relative">
              <select
                value={audienceFilter}
                onChange={e => setAudienceFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="all">All audiences</option>
                <option value="Students">Students</option>
                <option value="Faculty">Faculty</option>
                <option value="Staff">Staff</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>

            <span className="text-xs text-gray-400 ml-auto">
              {filtered.length} of {books.length} items
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Catalogue ──────────────────────────────────────── */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <BookOpen className="mr-2 h-5 w-5 text-indigo-600" />
            Resource Catalogue
          </CardTitle>
          <CardDescription className="text-xs">
            Live data from the library database · place holds on physical items directly
          </CardDescription>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No resources match your filters.</p>
              {books.length === 0 && (
                <p className="text-xs mt-1">No books in the database yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(b => {
                const isDigital    = b.availability === 'Digital';
                const hasHold      = !!b.myReservation;
                const isAvailable  = b.availability === 'Available';
                const isBusy       = placingHold === b.id;
                const justSucceeded = holdSuccess === b.id;

                return (
                  <div
                    key={b.id}
                    className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      {/* Left */}
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          {isDigital
                            ? <MonitorSmartphone className="h-4 w-4 text-indigo-600" />
                            : <BookOpen className="h-4 w-4 text-indigo-600" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title + badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <p className="font-semibold text-gray-900 text-sm">{b.title}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeBadgeColor(b.type)}`}>
                              {b.type}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${availBadge(b.availability)}`}>
                              {b.availability}
                            </span>
                            {b.audience !== 'All' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">
                                {b.audience} only
                              </span>
                            )}
                          </div>

                          {/* Meta */}
                          <p className="text-xs text-gray-500 mb-1">
                            {[b.author, b.category, b.year].filter(Boolean).join(' · ')}
                          </p>

                          {b.call_no && (
                            <p className="text-[11px] text-gray-400 font-mono">
                              Call no: {b.call_no}
                            </p>
                          )}

                          {/* Tags */}
                          {(b.tags ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(b.tags ?? []).map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-500 border border-slate-100">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Active hold notice */}
                          {hasHold && (
                            <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                              <Bookmark className="h-3 w-3" />
                              You have a {b.myReservation?.status} hold on this item
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        {isDigital && b.link && (
                          <Button size="sm" variant="outline" className="text-xs h-8" asChild>
                            <a href={b.link} target="_blank" rel="noreferrer">
                              <Link2 className="h-3 w-3 mr-1" />
                              Open resource
                            </a>
                          </Button>
                        )}

                        {!isDigital && !hasHold && isAvailable && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => placeHold(b)}
                            disabled={isBusy}
                          >
                            {isBusy
                              ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              : justSucceeded
                              ? <CheckCircle className="h-3 w-3 mr-1 text-emerald-600" />
                              : <Bookmark className="h-3 w-3 mr-1" />}
                            {justSucceeded ? 'Hold placed!' : 'Place hold'}
                          </Button>
                        )}

                        {!isDigital && !hasHold && !isAvailable && (
                          <span className="text-[11px] text-gray-400 italic">
                            {b.availability === 'Issued' ? 'Currently on loan' : 'Unavailable'}
                          </span>
                        )}

                        {hasHold && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 text-red-600 hover:bg-red-50 border-red-200"
                            onClick={() => cancelHold(b)}
                            disabled={isBusy}
                          >
                            {isBusy
                              ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              : <X className="h-3 w-3 mr-1" />}
                            Cancel hold
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}