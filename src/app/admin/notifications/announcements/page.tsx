/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  Send,
  Users,
  Calendar,
  Clock,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Globe,
  Building2,
  GraduationCap,
  Shield,
  FileText
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent' | 'event';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_roles: string[];
  target_departments: string[];
  target_specific_users?: string[];
  created_by: string;
  created_by_name?: string;
  created_at: string;
  scheduled_for?: string;
  expires_at?: string;
  is_published: boolean;
  attachments?: Array<{ name: string; url: string }>;
  read_count?: number;
  total_recipients?: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
  user_count: number;
}

interface Role {
  value: string;
  label: string;
  icon: any;
  count: number;
  color: string;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedTab, setSelectedTab] = useState('compose');

  // New announcement form
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'urgent' | 'event',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    targetType: 'all' as 'all' | 'roles' | 'departments' | 'specific',
    target_roles: [] as string[],
    target_departments: [] as string[],
    target_specific_users: [] as string[],
    schedule: 'now' as 'now' | 'later',
    scheduled_for: '',
    expires_at: '',
    send_email: true,
    send_push: false,
    send_sms: false
  });

  // Available roles with counts
  const roles: Role[] = [
    { value: 'student', label: 'Students', icon: GraduationCap, count: 450, color: 'bg-blue-100 text-blue-600' },
    { value: 'teacher', label: 'Teachers', icon: Users, count: 45, color: 'bg-green-100 text-green-600' },
    { value: 'staff', label: 'Staff', icon: Users, count: 30, color: 'bg-purple-100 text-purple-600' },
    { value: 'admin', label: 'Admins', icon: Shield, count: 5, color: 'bg-red-100 text-red-600' },
    { value: 'hod', label: 'HODs', icon: Building2, count: 8, color: 'bg-yellow-100 text-yellow-600' },
    { value: 'finance', label: 'Finance', icon: FileText, count: 6, color: 'bg-orange-100 text-orange-600' },
    { value: 'hr', label: 'HR', icon: Users, count: 4, color: 'bg-indigo-100 text-indigo-600' },
    { value: 'parent', label: 'Parents', icon: Users, count: 380, color: 'bg-pink-100 text-pink-600' },
  ];

  useEffect(() => {
    fetchAnnouncements();
    fetchDepartments();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          creator:created_by (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAnnouncements = data?.map(a => ({
        ...a,
        created_by_name: a.creator?.full_name || 'Unknown'
      })) || [];

      setAnnouncements(formattedAnnouncements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          code,
          users:users(count)
        `)
        .order('name');

      if (error) throw error;

      const formattedDepts = data?.map(d => ({
        id: d.id,
        name: d.name,
        code: d.code,
        user_count: d.users?.[0]?.count || 0
      })) || [];

      setDepartments(formattedDepts);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);
      
      const { data: userData } = await supabase.auth.getUser();

      // Determine target recipients
      let target_roles = newAnnouncement.target_roles;
      let target_departments = newAnnouncement.target_departments;
      let target_specific_users = newAnnouncement.target_specific_users;

      if (newAnnouncement.targetType === 'all') {
        target_roles = roles.map(r => r.value);
        target_departments = [];
        target_specific_users = [];
      } else if (newAnnouncement.targetType === 'roles') {
        target_departments = [];
        target_specific_users = [];
      } else if (newAnnouncement.targetType === 'departments') {
        target_roles = [];
        target_specific_users = [];
      }

      const announcementData = {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        type: newAnnouncement.type,
        priority: newAnnouncement.priority,
        target_roles,
        target_departments,
        target_specific_users,
        created_by: userData.user?.id,
        created_at: new Date().toISOString(),
        scheduled_for: newAnnouncement.schedule === 'later' ? newAnnouncement.scheduled_for : null,
        expires_at: newAnnouncement.expires_at || null,
        is_published: newAnnouncement.schedule === 'now',
        send_email: newAnnouncement.send_email,
        send_push: newAnnouncement.send_push,
        send_sms: newAnnouncement.send_sms
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert(announcementData)
        .select()
        .single();

      if (error) throw error;

      // If sending now, create notifications for all recipients
      if (newAnnouncement.schedule === 'now') {
        await sendAnnouncementNotifications(data);
      }

      toast({
        title: 'Success',
        description: newAnnouncement.schedule === 'now' 
          ? 'Announcement sent successfully' 
          : 'Announcement scheduled successfully',
        className: "bg-white border-green-200",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const sendAnnouncementNotifications = async (announcement: any) => {
    try {
      // Build query for target users
      let query = supabase.from('users').select('id');

      if (announcement.target_roles?.length > 0) {
        query = query.in('role', announcement.target_roles);
      }

      if (announcement.target_departments?.length > 0) {
        query = query.in('department_id', announcement.target_departments);
      }

      if (announcement.target_specific_users?.length > 0) {
        query = query.in('id', announcement.target_specific_users);
      }

      const { data: users, error } = await query;

      if (error) throw error;

      if (users && users.length > 0) {
        // Create notifications
        const notifications = users.map(user => ({
          user_id: user.id,
          title: `📢 ${announcement.title}`,
          message: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
          notification_type: 'announcement',
          related_entity_id: announcement.id,
          related_entity_type: 'announcement',
          is_read: false,
          created_at: new Date().toISOString()
        }));

        await supabase.from('notifications').insert(notifications);

        // Update announcement with recipient count
        await supabase
          .from('announcements')
          .update({ total_recipients: users.length })
          .eq('id', announcement.id);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', selectedAnnouncement.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement deleted successfully',
        className: "bg-white border-green-200",
      });

      setIsDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setNewAnnouncement({
      title: '',
      content: '',
      type: 'info',
      priority: 'medium',
      targetType: 'all',
      target_roles: [],
      target_departments: [],
      target_specific_users: [],
      schedule: 'now',
      scheduled_for: '',
      expires_at: '',
      send_email: true,
      send_push: false,
      send_sms: false
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info': return <Megaphone className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'event': return <Calendar className="h-4 w-4 text-green-500" />;
      default: return <Megaphone className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (announcement: Announcement) => {
    const now = new Date();
    
    if (!announcement.is_published) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700">Draft</Badge>;
    }
    
    if (announcement.scheduled_for && new Date(announcement.scheduled_for) > now) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Scheduled</Badge>;
    }
    
    if (announcement.expires_at && new Date(announcement.expires_at) < now) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700">Expired</Badge>;
    }
    
    return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && a.is_published && (!a.expires_at || new Date(a.expires_at) > new Date())) ||
                         (statusFilter === 'scheduled' && a.scheduled_for && new Date(a.scheduled_for) > new Date()) ||
                         (statusFilter === 'expired' && a.expires_at && new Date(a.expires_at) < new Date()) ||
                         (statusFilter === 'draft' && !a.is_published);
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: announcements.length,
    active: announcements.filter(a => a.is_published && (!a.expires_at || new Date(a.expires_at) > new Date())).length,
    scheduled: announcements.filter(a => a.scheduled_for && new Date(a.scheduled_for) > new Date()).length,
    draft: announcements.filter(a => !a.is_published).length
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link href="/admin/notifications">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900 mb-2 -ml-2">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to Notifications
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">
            Create and manage system-wide announcements
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>Create New Announcement</DialogTitle>
              <DialogDescription>
                Create an announcement that will be sent to selected users
              </DialogDescription>
            </DialogHeader>

            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="target">Target Audience</TabsTrigger>
                <TabsTrigger value="schedule">Schedule & Delivery</TabsTrigger>
              </TabsList>

              {/* Compose Tab */}
              <TabsContent value="compose" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="Enter announcement title"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Write your announcement here..."
                    rows={8}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Announcement Type</Label>
                    <Select
                      value={newAnnouncement.type}
                      onValueChange={(v: any) => setNewAnnouncement({ ...newAnnouncement, type: v })}
                    >
                      <SelectTrigger id="type" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Information</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newAnnouncement.priority}
                      onValueChange={(v: any) => setNewAnnouncement({ ...newAnnouncement, priority: v })}
                    >
                      <SelectTrigger id="priority" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Target Audience Tab */}
              <TabsContent value="target" className="space-y-4 mt-4">
                <RadioGroup
                  value={newAnnouncement.targetType}
                  onValueChange={(v: any) => setNewAnnouncement({ ...newAnnouncement, targetType: v })}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">All Users</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="roles" id="roles" />
                    <Label htmlFor="roles">Specific Roles</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="departments" id="departments" />
                    <Label htmlFor="departments">Specific Departments</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific">Specific Users</Label>
                  </div>
                </RadioGroup>

                {newAnnouncement.targetType === 'roles' && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">Select Roles</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {roles.map((role) => (
                        <div key={role.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role.value}`}
                            checked={newAnnouncement.target_roles.includes(role.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  target_roles: [...newAnnouncement.target_roles, role.value]
                                });
                              } else {
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  target_roles: newAnnouncement.target_roles.filter(r => r !== role.value)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`role-${role.value}`} className="flex items-center gap-2">
                            <div className={`p-1 rounded-full ${role.color}`}>
                              <role.icon className="h-3 w-3" />
                            </div>
                            <span>{role.label}</span>
                            <span className="text-xs text-gray-500">({role.count})</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newAnnouncement.targetType === 'departments' && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">Select Departments</h3>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {departments.map((dept) => (
                        <div key={dept.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept-${dept.id}`}
                            checked={newAnnouncement.target_departments.includes(dept.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  target_departments: [...newAnnouncement.target_departments, dept.id]
                                });
                              } else {
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  target_departments: newAnnouncement.target_departments.filter(d => d !== dept.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`dept-${dept.id}`}>
                            {dept.name} ({dept.code})
                            <span className="text-xs text-gray-500 ml-1">({dept.user_count})</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newAnnouncement.targetType === 'specific' && (
                  <div className="mt-4 border rounded-lg p-4">
                    <Label>Search and Select Users</Label>
                    <Input
                      placeholder="Search users by name or email..."
                      className="mt-1"
                    />
                    {/* User search results would go here */}
                  </div>
                )}
              </TabsContent>

              {/* Schedule & Delivery Tab */}
              <TabsContent value="schedule" className="space-y-4 mt-4">
                <RadioGroup
                  value={newAnnouncement.schedule}
                  onValueChange={(v: any) => setNewAnnouncement({ ...newAnnouncement, schedule: v })}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="now" id="now" />
                    <Label htmlFor="now">Send immediately</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="later" id="later" />
                    <Label htmlFor="later">Schedule for later</Label>
                  </div>
                </RadioGroup>

                {newAnnouncement.schedule === 'later' && (
                  <div>
                    <Label htmlFor="scheduled_for">Schedule Date & Time</Label>
                    <Input
                      type="datetime-local"
                      id="scheduled_for"
                      value={newAnnouncement.scheduled_for}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, scheduled_for: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="expires_at">Expires At (Optional)</Label>
                  <Input
                    type="datetime-local"
                    id="expires_at"
                    value={newAnnouncement.expires_at}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expires_at: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="space-y-3 mt-4">
                  <h3 className="text-sm font-medium">Delivery Channels</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send_email"
                      checked={newAnnouncement.send_email}
                      onCheckedChange={(checked) => 
                        setNewAnnouncement({ ...newAnnouncement, send_email: checked as boolean })
                      }
                    />
                    <Label htmlFor="send_email">Send via Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send_push"
                      checked={newAnnouncement.send_push}
                      onCheckedChange={(checked) => 
                        setNewAnnouncement({ ...newAnnouncement, send_push: checked as boolean })
                      }
                    />
                    <Label htmlFor="send_push">Send Push Notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="send_sms"
                      checked={newAnnouncement.send_sms}
                      onCheckedChange={(checked) => 
                        setNewAnnouncement({ ...newAnnouncement, send_sms: checked as boolean })
                      }
                    />
                    <Label htmlFor="send_sms">Send SMS (Critical only)</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTab('compose');
                  setIsPreviewDialogOpen(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleCreateAnnouncement} disabled={sending}>
                {sending ? 'Sending...' : newAnnouncement.schedule === 'now' ? 'Send Now' : 'Schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Megaphone className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Active</p>
                <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Scheduled</p>
                <p className="text-2xl font-bold text-purple-900">{stats.scheduled}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Drafts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Information</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
              <p className="text-gray-600">Create your first announcement to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Announcement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reach</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnouncements.map((announcement) => (
                  <TableRow key={announcement.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{announcement.title}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{announcement.content}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(announcement.type)}
                        <span className="capitalize text-sm">{announcement.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(announcement.priority)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {announcement.target_roles?.length > 0 && (
                          <Badge variant="outline" className="mr-1">
                            {announcement.target_roles.length} roles
                          </Badge>
                        )}
                        {announcement.target_departments?.length > 0 && (
                          <Badge variant="outline">
                            {announcement.target_departments.length} depts
                          </Badge>
                        )}
                        {announcement.target_roles?.length === 0 && 
                         announcement.target_departments?.length === 0 && (
                          <span className="text-gray-500">All users</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(announcement.created_at), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-gray-500">
                          by {announcement.created_by_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(announcement)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{announcement.read_count || 0} read</div>
                        <div className="text-xs text-gray-500">
                          of {announcement.total_recipients || 0}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedAnnouncement(announcement);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Preview Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              newAnnouncement.type === 'info' ? 'bg-blue-50' :
              newAnnouncement.type === 'warning' ? 'bg-yellow-50' :
              newAnnouncement.type === 'urgent' ? 'bg-red-50' :
              'bg-green-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {getTypeIcon(newAnnouncement.type)}
                <span className="font-semibold text-gray-900">{newAnnouncement.title}</span>
                {getPriorityBadge(newAnnouncement.priority)}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{newAnnouncement.content}</p>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Delivery Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Audience:</span>
                  <span className="font-medium">
                    {newAnnouncement.targetType === 'all' && 'All Users'}
                    {newAnnouncement.targetType === 'roles' && `${newAnnouncement.target_roles.length} selected roles`}
                    {newAnnouncement.targetType === 'departments' && `${newAnnouncement.target_departments.length} selected departments`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Recipients:</span>
                  <span className="font-medium">~450 users</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Time:</span>
                  <span className="font-medium">
                    {newAnnouncement.schedule === 'now' ? 'Immediate' : format(new Date(newAnnouncement.scheduled_for), 'PPP p')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Channels:</span>
                  <span className="font-medium">
                    {[
                      newAnnouncement.send_email && 'Email',
                      newAnnouncement.send_push && 'Push',
                      newAnnouncement.send_sms && 'SMS'
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsPreviewDialogOpen(false);
              handleCreateAnnouncement();
            }}>
              Send Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the announcement
              and remove it from all users' notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}