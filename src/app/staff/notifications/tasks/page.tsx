/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Calendar,
  FileText,
  Users,
  Search,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_by_id: string;
  assigned_by_name: string;
  assigned_to: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date: string;
  created_at: string;
  completed_at?: string;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  in_progress: number;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StaffTasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    in_progress: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: [] as string[],
    priority: 'medium' as 'high' | 'medium' | 'low',
    due_date: ''
  });
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
      fetchUsers();
    }
  }, [currentUser]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Get tasks assigned to current user
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_by:assigned_by_id (
            full_name
          )
        `)
        .contains('assigned_to', [currentUser?.id])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check for overdue tasks
      const today = new Date().toISOString().split('T')[0];
      const formattedTasks = tasksData?.map(task => {
        const isOverdue = task.status !== 'completed' && task.due_date < today;
        return {
          ...task,
          assigned_by_name: task.assigned_by?.full_name || 'Unknown',
          status: isOverdue ? 'overdue' : task.status
        };
      }) || [];

      setTasks(formattedTasks);

      // Calculate stats
      setStats({
        total: formattedTasks.length,
        completed: formattedTasks.filter(t => t.status === 'completed').length,
        pending: formattedTasks.filter(t => t.status === 'pending').length,
        overdue: formattedTasks.filter(t => t.status === 'overdue').length,
        in_progress: formattedTasks.filter(t => t.status === 'in_progress').length
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role')
        .in('role', ['staff', 'teacher', 'admin'])
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.due_date || newTask.assigned_to.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Title, due date, and assignee are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          assigned_by_id: currentUser.id,
          assigned_to: newTask.assigned_to,
          priority: newTask.priority,
          status: 'pending',
          due_date: newTask.due_date,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create notifications for assignees
      const notifications = newTask.assigned_to.map(userId => ({
        user_id: userId,
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${newTask.title}"`,
        notification_type: 'task_assigned',
        related_entity_id: data.id,
        related_entity_type: 'task',
        is_read: false,
        created_at: new Date().toISOString()
      }));

      await supabase.from('notifications').insert(notifications);

      toast({
        title: 'Success',
        description: 'Task created successfully',
        className: "bg-white border-green-200",
      });

      setIsCreateDialogOpen(false);
      setNewTask({ title: '', description: '', assigned_to: [], priority: 'medium', due_date: '' });
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updates: any = {
        status: newStatus
      };

      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : task.completed_at 
            }
          : task
      ));

      // Update stats
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      setStats({
        total: updatedTasks.length,
        completed: updatedTasks.filter(t => t.status === 'completed').length,
        pending: updatedTasks.filter(t => t.status === 'pending').length,
        overdue: updatedTasks.filter(t => t.status === 'overdue').length,
        in_progress: updatedTasks.filter(t => t.status === 'in_progress').length
      });

      toast({
        title: 'Success',
        description: `Task marked as ${newStatus}`,
        className: "bg-white border-green-200",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-600 mt-1">
            Manage and track your assigned tasks
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assign To *</label>
                <Select
                  value={newTask.assigned_to[0] || ''}
                  onValueChange={(value) => setNewTask({ ...newTask, assigned_to: [value] })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Due Date *</label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="mt-1"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">Total Tasks</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Completed</p>
            <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-900">{stats.in_progress}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">Overdue</p>
            <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Overall Progress</p>
            <span className="text-sm text-gray-600">{completionRate.toFixed(1)}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600">Create a new task to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={(checked) => 
                        handleStatusChange(task.id, checked ? 'completed' : 'in_progress')
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {task.title}
                            </h3>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Assigned by: {task.assigned_by_name}
                            </span>
                            {task.completed_at && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Completed: {format(new Date(task.completed_at), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
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