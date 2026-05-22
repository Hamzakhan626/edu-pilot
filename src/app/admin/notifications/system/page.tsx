/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
  Activity,
  RefreshCw,
  Search
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
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  component: string;
  title: string;
  message: string;
  details?: any;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved: boolean;
  resolved_at?: string;
}

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: number;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SystemAlertsPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { name: 'API Response Time', value: 245, unit: 'ms', status: 'healthy', threshold: 500 },
    { name: 'Database Connections', value: 45, unit: 'conn', status: 'healthy', threshold: 100 },
    { name: 'Memory Usage', value: 68, unit: '%', status: 'warning', threshold: 70 },
    { name: 'CPU Load', value: 52, unit: '%', status: 'healthy', threshold: 80 },
    { name: 'Disk Space', value: 72, unit: '%', status: 'warning', threshold: 85 },
    { name: 'Active Users', value: 156, unit: 'users', status: 'healthy', threshold: 200 },
  ]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchSystemAlerts();
    subscribeToAlerts();
  }, []);

  const fetchSystemAlerts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('system_alerts')
        .select(`
          *,
          acknowledged_by_user:acknowledged_by (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system alerts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAlerts = () => {
    const subscription = supabase
      .channel('system-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_alerts',
        },
        (payload) => {
          const newAlert = payload.new as SystemAlert;
          setAlerts(prev => [newAlert, ...prev]);
          
          if (newAlert.type === 'error' || newAlert.type === 'warning') {
            toast({
              title: `🔔 System Alert: ${newAlert.title}`,
              description: newAlert.message,
              variant: newAlert.type === 'error' ? 'destructive' : 'default',
              className: newAlert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : '',
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('system_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: userData.user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId
            ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : a
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
        .from('system_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId
            ? { ...a, resolved: true, resolved_at: new Date().toISOString() }
            : a
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Activity className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || alert.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !alert.resolved) ||
                         (statusFilter === 'resolved' && alert.resolved);
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeCount = alerts.filter(a => !a.resolved).length;
  const errorCount = alerts.filter(a => a.type === 'error' && !a.resolved).length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Alerts</h1>
          <p className="text-gray-600 mt-1">
            Monitor system health and critical notifications
          </p>
        </div>
        <Button
          onClick={fetchSystemAlerts}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Critical Alert Banner */}
      {errorCount > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Critical System Issues</p>
                <p className="text-sm text-red-600">
                  {errorCount} unresolved errors require immediate attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <Card key={index} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-gray-700">{metric.name}</p>
                <Badge className={
                  metric.status === 'healthy' ? 'bg-green-100 text-green-800' :
                  metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {metric.status}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {metric.value}{metric.unit}
                </span>
                <span className={`text-sm ${getMetricColor(metric.status)}`}>
                  Threshold: {metric.threshold}{metric.unit}
                </span>
              </div>
              <Progress 
                value={(metric.value / metric.threshold) * 100} 
                className={`h-2 ${getProgressColor(metric.status)}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search alerts..."
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
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Recent Alerts</CardTitle>
            <Badge variant="outline" className="bg-white">
              {activeCount} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Systems Operational</h3>
              <p className="text-gray-600">No system alerts at this time.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${getAlertColor(alert.type)}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                            <Badge className={getAlertColor(alert.type)}>
                              {alert.type}
                            </Badge>
                            {!alert.resolved && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Server className="h-3 w-3" />
                              {alert.component}
                            </span>
                            <span>•</span>
                            <span>{format(new Date(alert.created_at), 'MMM d, yyyy • h:mm a')}</span>
                            {alert.acknowledged_at && (
                              <>
                                <span>•</span>
                                <span>Acknowledged</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {!alert.resolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}