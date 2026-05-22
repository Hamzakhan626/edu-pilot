/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  AlertCircle,
  TrendingDown,
  Clock,
  CheckCircle,
  MessageSquare,
  Send,
  Filter,
  Search
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentAlert {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  course_id: string;
  course_name: string;
  alert_type: 'attendance' | 'performance' | 'behavior' | 'submission';
  severity: 'high' | 'medium' | 'low';
  message: string;
  value?: number;
  threshold?: number;
  created_at: string;
  acknowledged: boolean;
  resolved: boolean;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudentAlertsPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<StudentAlert | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher's courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', user.id);

      const courseIds = courses?.map(c => c.id) || [];

      // Get student alerts
      const { data: alertsData, error } = await supabase
        .from('student_alerts')
        .select(`
          *,
          student:student_id (
            full_name,
            enrollment_number
          ),
          course:course_id (
            name
          )
        `)
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAlerts = alertsData?.map(alert => ({
        id: alert.id,
        student_id: alert.student_id,
        student_name: alert.student?.full_name || 'Unknown',
        enrollment_number: alert.student?.enrollment_number || 'N/A',
        course_id: alert.course_id,
        course_name: alert.course?.name || 'Unknown',
        alert_type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        created_at: alert.created_at,
        acknowledged: alert.acknowledged,
        resolved: alert.resolved
      })) || [];

      setAlerts(formattedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student alerts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('student_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId ? { ...a, acknowledged: true } : a
        )
      );

      toast({
        title: 'Success',
        description: 'Alert acknowledged',
        className: "bg-white border-green-200",
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive',
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('student_alerts')
        .update({ 
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId ? { ...a, resolved: true } : a
        )
      );

      toast({
        title: 'Success',
        description: 'Alert resolved',
        className: "bg-white border-green-200",
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve alert',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedAlert || !messageText) return;

    try {
      setSending(true);

      // Create notification for student
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedAlert.student_id,
          title: `Message from Teacher: ${selectedAlert.alert_type} Alert`,
          message: messageText,
          notification_type: 'announcement',
          related_entity_id: selectedAlert.id,
          related_entity_type: 'alert',
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message sent to student',
        className: "bg-white border-green-200",
      });

      setSelectedAlert(null);
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'attendance': return <Clock className="h-4 w-4" />;
      case 'performance': return <TrendingDown className="h-4 w-4" />;
      case 'behavior': return <Users className="h-4 w-4" />;
      case 'submission': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.enrollment_number.includes(searchQuery);
    const matchesType = typeFilter === 'all' || alert.alert_type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    return matchesSearch && matchesType && matchesSeverity;
  });

  const activeCount = alerts.filter(a => !a.resolved).length;
  const highSeverityCount = alerts.filter(a => a.severity === 'high' && !a.resolved).length;

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Student Alerts</h1>
        <p className="text-gray-600 mt-1">
          Monitor and respond to student issues
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">Total Alerts</p>
            <p className="text-2xl font-bold text-blue-900">{alerts.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-600">Active</p>
            <p className="text-2xl font-bold text-yellow-900">{activeCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">High Severity</p>
            <p className="text-2xl font-bold text-red-900">{highSeverityCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Resolved</p>
            <p className="text-2xl font-bold text-green-900">
              {alerts.filter(a => a.resolved).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Severity Alert */}
      {highSeverityCount > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">High Priority Alerts</p>
                <p className="text-sm text-red-600">
                  {highSeverityCount} students require immediate attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Alert Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="behavior">Behavior</SelectItem>
                <SelectItem value="submission">Submission</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No alerts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {alert.student_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{alert.student_name}</p>
                          <p className="text-xs text-gray-500">{alert.enrollment_number}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{alert.course_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(alert.alert_type)}
                        <span className="capitalize">{alert.alert_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      {alert.value && alert.threshold && (
                        <p className="text-xs text-gray-500">
                          Current: {alert.value} | Threshold: {alert.threshold}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(alert.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {alert.resolved ? (
                        <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                      ) : alert.acknowledged ? (
                        <Badge className="bg-blue-100 text-blue-800">Acknowledged</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">New</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Message
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white">
                            <DialogHeader>
                              <DialogTitle>
                                Send Message to {alert.student_name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Textarea
                                placeholder="Type your message here..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                rows={4}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setSelectedAlert(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={sendMessage}
                                  disabled={sending}
                                  className="gap-2"
                                >
                                  <Send className="h-4 w-4" />
                                  {sending ? 'Sending...' : 'Send Message'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        {!alert.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}