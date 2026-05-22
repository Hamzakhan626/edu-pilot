/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  CalendarDays,
  DollarSign,
  Wallet,
  FileText,
  AlertCircle,
  Filter,
  Search,
  Clock,
  RefreshCw,
  Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import supabase from '@/lib/supabase/client';
import { toast } from 'sonner';

type FinanceEventType = 'Fee' | 'Payroll' | 'VendorPayment' | 'Reporting' | 'Other';
type Criticality = 'Normal' | 'Important' | 'Critical';

interface FinanceCalendarEvent {
  id: string;
  title: string;
  type: FinanceEventType;
  date: string;        // YYYY-MM-DD
  time?: string;
  period: string;
  description: string;
  criticality: Criticality;
  created_at?: string;
  updated_at?: string;
}

function formatDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function FinanceCalendarPage() {
  const [events, setEvents] = useState<FinanceCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceEventType>('all');
  const [criticalityFilter, setCriticalityFilter] = useState<'all' | Criticality>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchFinanceEvents();
  }, []);

  const fetchFinanceEvents = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No user logged in - loading demo data");
        loadDemoData();
        return;
      }

      // Fetch finance calendar events from Supabase
      const { data: financeEvents, error } = await supabase
        .from('finance_calendar_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error("Error fetching finance events:", error);
        toast.error("Failed to load finance calendar events");
        loadDemoData();
        return;
      }

      if (financeEvents && financeEvents.length > 0) {
        setEvents(financeEvents);
      } else {
        console.log("No finance events found - loading demo data");
        loadDemoData();
      }
    } catch (err) {
      console.error("Error in fetchFinanceEvents:", err);
      toast.error("An error occurred while loading data");
      loadDemoData();
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadDemoData = () => {
    const demoEvents: FinanceCalendarEvent[] = [
      {
        id: 'FIN-CAL-001',
        title: 'Last date for fee payment – Fall 2024 (regular)',
        type: 'Fee',
        date: '2024-12-20',
        period: 'Fall 2024',
        description: 'Regular deadline for student tuition fee before late surcharge applies.',
        criticality: 'Important'
      },
      {
        id: 'FIN-CAL-002',
        title: 'Payroll disbursement – December 2024',
        type: 'Payroll',
        date: '2024-12-25',
        time: '14:00',
        period: 'Dec 2024',
        description: 'Faculty and staff salaries processed; bank transfers expected same day.',
        criticality: 'Critical'
      },
      {
        id: 'FIN-CAL-003',
        title: 'Vendor payment run – Week 4',
        type: 'VendorPayment',
        date: '2024-12-27',
        period: 'Dec 2024',
        description: 'Approved invoices for transport, utilities, and printing cleared.',
        criticality: 'Normal'
      },
      {
        id: 'FIN-CAL-004',
        title: 'Monthly finance closing & reporting',
        type: 'Reporting',
        date: '2024-12-31',
        period: 'Dec 2024',
        description: 'Close books for the month and publish summary reports to Admin.',
        criticality: 'Critical'
      },
      {
        id: 'FIN-CAL-005',
        title: 'Late fee surcharge window starts',
        type: 'Fee',
        date: '2024-12-28',
        period: 'Fall 2024',
        description: 'Automatic surcharge applied on unpaid student fee invoices.',
        criticality: 'Important'
      },
      {
        id: 'FIN-CAL-006',
        title: 'Q1 Budget Planning Meeting',
        type: 'Reporting',
        date: '2025-01-05',
        time: '10:00',
        period: 'Q1 2025',
        description: 'Annual budget planning session with department heads.',
        criticality: 'Important'
      },
      {
        id: 'FIN-CAL-007',
        title: 'Vendor Payment – IT Infrastructure',
        type: 'VendorPayment',
        date: '2025-01-10',
        period: 'Jan 2025',
        description: 'Quarterly payment for cloud services and IT maintenance.',
        criticality: 'Normal'
      }
    ];
    setEvents(demoEvents);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFinanceEvents();
    toast.success("Calendar refreshed successfully");
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Title', 'Type', 'Date', 'Time', 'Period', 'Criticality', 'Description'];
    const csvData = filteredEvents.map(event => [
      event.title,
      event.type,
      event.date,
      event.time || '',
      event.period,
      event.criticality,
      event.description
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `finance_calendar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Calendar exported successfully");
  };

  const filteredEvents = events.filter((e) => {
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    const matchesCrit = criticalityFilter === 'all' || e.criticality === criticalityFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.period.toLowerCase().includes(q);
    return matchesType && matchesCrit && matchesSearch;
  });

  const totalEvents = events.length;
  const feeEvents = events.filter((e) => e.type === 'Fee').length;
  const payrollEvents = events.filter((e) => e.type === 'Payroll').length;
  const criticalEvents = events.filter((e) => e.criticality === 'Critical').length;

  const summaryCards = [
    {
      label: 'Total finance calendar items',
      value: totalEvents,
      icon: CalendarDays,
      color: 'blue',
      note: 'All fee, payroll, vendor, and reporting dates'
    },
    {
      label: 'Fee schedule events',
      value: feeEvents,
      icon: DollarSign,
      color: 'emerald',
      note: 'Student fee deadlines and surcharges'
    },
    {
      label: 'Payroll events',
      value: payrollEvents,
      icon: Wallet,
      color: 'purple',
      note: 'Salary processing and disbursement dates'
    },
    {
      label: 'Critical deadlines',
      value: criticalEvents,
      icon: AlertCircle,
      color: 'red',
      note: 'Events that must not be missed'
    }
  ];

  const getCriticalityBadge = (c: Criticality) => {
    switch (c) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Important':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Normal':
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };

  const getEventTypeIcon = (type: FinanceEventType) => {
    switch (type) {
      case 'Fee':
        return <DollarSign className="h-4 w-4 text-emerald-600" />;
      case 'Payroll':
        return <Wallet className="h-4 w-4 text-purple-600" />;
      case 'VendorPayment':
        return <Wallet className="h-4 w-4 text-orange-600" />;
      case 'Reporting':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'Other':
        return <CalendarDays className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading finance calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Finance Calendar</h1>
            <p className="text-sky-100">
              Key fee, payroll, vendor payment, and reporting dates for the year
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              onClick={handleExport}
              className="bg-white text-sky-700 hover:bg-sky-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((s, i) => {
          const Icon = s.icon;
          const isAlert = s.label.includes('Critical');
          return (
            <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {s.value}
                  </p>
                  <p className="text-xs text-gray-600">{s.note}</p>
                </div>
                <div className={`p-3 rounded-xl bg-${s.color}-50`}>
                  <Icon className={`h-6 w-6 text-${s.color}-600`} />
                </div>
                {isAlert && (
                  <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter calendar by type and criticality</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(
                    e.target.value === 'all'
                      ? 'all'
                      : (e.target.value as FinanceEventType)
                  )
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="all">All types</option>
                <option value="Fee">Fee</option>
                <option value="Payroll">Payroll</option>
                <option value="VendorPayment">Vendor payments</option>
                <option value="Reporting">Reporting</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={criticalityFilter}
                onChange={(e) =>
                  setCriticalityFilter(
                    e.target.value === 'all'
                      ? 'all'
                      : (e.target.value as Criticality)
                  )
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="all">All criticality</option>
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title, period, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event list (date-ordered) */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Calendar className="mr-2 h-5 w-5 text-sky-600" />
            Upcoming Finance Dates
          </CardTitle>
          <CardDescription>
            Chronological view of fee deadlines, payroll runs, vendor payments, and closes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEvents.map((e) => (
              <div
                key={e.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-sky-200 flex flex-col md:flex-row md:items-start md:justify-between gap-3"
              >
                <div className="flex gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0">
                    {getEventTypeIcon(e.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {e.title}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {e.type} • {e.period}
                      </Badge>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCriticalityBadge(
                          e.criticality
                        )}`}
                      >
                        {e.criticality}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-1">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {formatDate(e.date)}
                      {e.time && (
                        <>
                          {' '}
                          • <Clock className="inline h-3 w-3 mr-1" />
                          {e.time}
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {e.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 md:self-start">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Add to calendar functionality
                      toast.success("Event details copied to clipboard");
                      navigator.clipboard.writeText(
                        `${e.title}\nDate: ${formatDate(e.date)}\nTime: ${e.time || 'N/A'}\nDescription: ${e.description}`
                      );
                    }}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            ))}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-base font-medium">
                  No finance events match the selected filters
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.filter(e => {
                    const eventDate = new Date(e.date);
                    const today = new Date();
                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return eventDate >= today && eventDate <= weekFromNow;
                  }).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-sky-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Items</p>
                <p className="text-2xl font-bold text-red-600">
                  {events.filter(e => {
                    const eventDate = new Date(e.date);
                    const today = new Date();
                    return eventDate < today && e.criticality === 'Critical';
                  }).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.filter(e => {
                    const eventDate = new Date(e.date);
                    const today = new Date();
                    return eventDate.getMonth() === today.getMonth() && 
                           eventDate.getFullYear() === today.getFullYear();
                  }).length}
                </p>
              </div>
              <CalendarDays className="h-8 w-8 text-sky-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}