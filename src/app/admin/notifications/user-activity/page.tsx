/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Eye,
  Filter,
  Search,
  Calendar,
  Download
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UserActivityPage() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });

  useEffect(() => {
    fetchActivityLogs();
  }, [dateRange]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          users:user_id (
            full_name,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;

      const formattedActivities = data?.map(log => ({
        id: log.id,
        user_id: log.user_id,
        user_name: log.users?.full_name || 'Unknown',
        user_role: log.users?.role || 'unknown',
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        details: log.details,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at
      })) || [];

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return <LogIn className="h-4 w-4 text-green-500" />;
    if (action.includes('logout')) return <LogOut className="h-4 w-4 text-orange-500" />;
    if (action.includes('create')) return <Activity className="h-4 w-4 text-blue-500" />;
    if (action.includes('update')) return <Edit className="h-4 w-4 text-yellow-500" />;
    if (action.includes('delete')) return <Trash2 className="h-4 w-4 text-red-500" />;
    if (action.includes('view')) return <Eye className="h-4 w-4 text-purple-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || activity.user_role === roleFilter;
    const matchesAction = actionFilter === 'all' || activity.action === actionFilter;
    return matchesSearch && matchesRole && matchesAction;
  });

  const uniqueActions = [...new Set(activities.map(a => a.action))];
  const uniqueRoles = [...new Set(activities.map(a => a.user_role))];

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Details', 'IP Address'];
    const rows = filteredActivities.map(a => [
      format(new Date(a.created_at), 'yyyy-MM-dd HH:mm:ss'),
      a.user_name,
      a.user_role,
      a.action,
      a.entity_type,
      JSON.stringify(a.details),
      a.ip_address || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Activity Log</h1>
          <p className="text-gray-600 mt-1">
            Monitor all user actions and system events
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="gap-2"
          disabled={filteredActivities.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Picker */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div className="flex-1 flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left">
                    {dateRange.from ? format(dateRange.from, 'PPP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-gray-500">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left">
                    {dateRange.to ? format(dateRange.to, 'PPP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user, action, or entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(activity.created_at), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(activity.created_at), 'h:mm:ss a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {activity.user_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{activity.user_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{activity.user_role}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(activity.action)}
                          <span className="text-sm capitalize">{activity.action.replace(/_/g, ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-50">
                          {activity.entity_type}
                        </Badge>
                        {activity.entity_id && (
                          <p className="text-xs text-gray-500 mt-1">{activity.entity_id}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <pre className="text-xs text-gray-600 max-w-xs overflow-hidden">
                          {JSON.stringify(activity.details).substring(0, 50)}
                          {JSON.stringify(activity.details).length > 50 ? '...' : ''}
                        </pre>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">{activity.ip_address || 'N/A'}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}