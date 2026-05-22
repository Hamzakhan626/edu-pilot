/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Save, Eye, EyeOff, Bell, Lock, User, Mail, Phone, Globe, 
  Zap, Loader2, CheckCircle, AlertCircle, Moon, Sun, BellRing,
  Shield, Key, UserCircle, Palette, Languages, Clock, Smartphone,
  Laptop, Tablet, Monitor, HelpCircle, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
// import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from '@/lib/auth';
import { Separator } from '@/components/ui/separator';
// import { Separator } from '@/components/ui/seperator';

interface UserSettings {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  department_id: string | null;
  designation: string;
  profile_picture_url: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  department_name?: string;
}

interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  assignment_notifications: boolean;
  quiz_notifications: boolean;
  attendance_notifications: boolean;
  fee_notifications: boolean;
  grade_notifications: boolean;
  announcement_notifications: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  details: any;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  // const supabase = createClientComponentClient();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    profile: false,
    security: false,
    notifications: false,
    preferences: false
  });
  
  const [user, setUser] = useState<any>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [availableLanguages] = useState([
    { value: 'en', label: 'English' },
    { value: 'ur', label: 'Urdu' },
    { value: 'ar', label: 'Arabic' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' }
  ]);

  const [availableTimezones] = useState([
    { value: 'Asia/Karachi', label: 'Pakistan Standard Time (PKT)' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' }
  ]);

  // Check authentication on mount
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('No session found, redirecting to login');
        router.push('/login');
        return;
      }

      setUser(session.user);
      await fetchUserData(session.user.id);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Fetch user settings from users table
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select(`
          *,
          departments:department_id (
            id,
            name,
            code
          )
        `)
        .eq('id', userId)
        .maybeSingle();
      
      if (userDataError) {
        console.error('Error fetching user data:', userDataError);
        throw userDataError;
      }
      
      if (userData) {
        setUserSettings({
          ...userData,
          department_name: userData.departments?.name,
          designation: userData.designation || 'Teacher'
        });
      }
      
      // Fetch user preferences
      const { data: preferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (prefError && prefError.code !== 'PGRST116') {
        console.error('Error fetching preferences:', prefError);
      }
      
      if (preferences) {
        setUserPreferences(preferences);
      } else {
        // Create default preferences if none exist
          const { data: newPrefs, error: createPrefError } = await supabase
            .from('user_preferences')
            .insert([{
              user_id: userId,
              theme: 'system',
              language: 'en',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi',
              notifications_enabled: true,
              email_notifications: true,
              push_notifications: true
            }])
            .select()
            .single();

          if (createPrefError) {
            // Log all fields explicitly
            console.error('Error creating preferences:', {
              message: createPrefError.message,
              code: createPrefError.code,
              details: createPrefError.details,
              hint: createPrefError.hint,
            });
}
      }
      
      // Fetch notification settings
      const { data: notifications, error: notifError } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (notifError && notifError.code !== 'PGRST116') {
        console.error('Error fetching notifications:', notifError);
      }
      
      if (notifications) {
        setNotificationSettings(notifications);
      } else {
        // Create default notification settings if none exist
        const { data: newNotifs, error: createNotifError } = await supabase
          .from('user_notification_settings')
          .insert([{
            user_id: userId,
            assignment_notifications: true,
            quiz_notifications: true,
            attendance_notifications: true,
            fee_notifications: true,
            grade_notifications: true,
            announcement_notifications: true
          }])
          .select()
          .single();
        
        if (createNotifError) {
          console.error('Error creating notifications:', createNotifError);
        } else {
          setNotificationSettings(newNotifs);
        }
      }
      
      // Fetch departments for dropdown
      const { data: depts, error: deptError } = await supabase
        .from('departments')
        .select('id, name, code')
        .order('name');
      
      if (deptError) {
        console.error('Error fetching departments:', deptError);
      } else {
        setDepartments(depts || []);
      }
      
      // Fetch recent activity
      const { data: activity, error: activityError } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (activityError) {
        console.error('Error fetching activity:', activityError);
      } else {
        setRecentActivity(activity || []);
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleUserSettingsChange = (field: keyof UserSettings, value: any) => {
    if (userSettings) {
      setUserSettings({ ...userSettings, [field]: value });
    }
  };

  const handlePreferenceChange = (field: keyof UserPreferences, value: any) => {
    if (userPreferences) {
      setUserPreferences({ ...userPreferences, [field]: value });
    }
  };

  const handleNotificationChange = (field: keyof NotificationSettings, checked: boolean) => {
    if (notificationSettings) {
      setNotificationSettings({ ...notificationSettings, [field]: checked });
    }
  };

  const handleSaveProfile = async () => {
    if (!userSettings || !user) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, profile: true }));
      
      const { error } = await supabase
        .from('users')
        .update({
          full_name: userSettings.full_name,
          phone: userSettings.phone,
          department_id: userSettings.department_id,
          designation: userSettings.designation,
          date_of_birth: userSettings.date_of_birth,
          address: userSettings.address,
          city: userSettings.city,
          state: userSettings.state,
          postal_code: userSettings.postal_code,
          country: userSettings.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Log activity
      await supabase
        .from('activity_log')
        .insert([{
          user_id: user.id,
          action: 'UPDATE_PROFILE',
          entity_type: 'user',
          entity_id: user.id,
          details: { updated_fields: ['profile'] },
          created_at: new Date().toISOString()
        }]);
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });
      
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, profile: false }));
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match!',
        variant: 'destructive'
      });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long!',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoadingStates(prev => ({ ...prev, security: true }));
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      // Log activity
      await supabase
        .from('activity_log')
        .insert([{
          user_id: user.id,
          action: 'CHANGE_PASSWORD',
          entity_type: 'user',
          entity_id: user.id,
          details: {},
          created_at: new Date().toISOString()
        }]);
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast({
        title: 'Success',
        description: 'Password changed successfully!',
      });
      
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, security: false }));
    }
  };

  const handleSavePreferences = async () => {
    if (!userPreferences || !user) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, preferences: true }));
      
      const { error } = await supabase
        .from('user_preferences')
        .update({
          theme: userPreferences.theme,
          language: userPreferences.language,
          timezone: userPreferences.timezone,
          notifications_enabled: userPreferences.notifications_enabled,
          email_notifications: userPreferences.email_notifications,
          push_notifications: userPreferences.push_notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', userPreferences.id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Preferences saved successfully!',
      });
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, preferences: false }));
    }
  };

  const handleSaveNotificationSettings = async () => {
    if (!notificationSettings || !user) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, notifications: true }));
      
      const { error } = await supabase
        .from('user_notification_settings')
        .update({
          assignment_notifications: notificationSettings.assignment_notifications,
          quiz_notifications: notificationSettings.quiz_notifications,
          attendance_notifications: notificationSettings.attendance_notifications,
          fee_notifications: notificationSettings.fee_notifications,
          grade_notifications: notificationSettings.grade_notifications,
          announcement_notifications: notificationSettings.announcement_notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationSettings.id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Notification settings updated!',
      });
      
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, notifications: false }));
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'T';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
        {/* Header with User Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={userSettings?.profile_picture_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {userSettings?.full_name ? getInitials(userSettings.full_name) : 'T'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {userSettings?.full_name || 'Teacher'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-normal">
                  {userSettings?.designation || 'Teacher'}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{userSettings?.department_name || 'No Department'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              Last active: {recentActivity[0] ? new Date(recentActivity[0].created_at).toLocaleDateString() : 'Today'}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'profile' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UserCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Profile Information</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'security' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Security</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'notifications' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <BellRing className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Notifications</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('preferences')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'preferences' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Palette className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Preferences</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'activity' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Recent Activity</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3 space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && userSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={userSettings.full_name || ''}
                        onChange={(e) => handleUserSettingsChange('full_name', e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userSettings.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={userSettings.phone || ''}
                        onChange={(e) => handleUserSettingsChange('phone', e.target.value)}
                        placeholder="+92-300-XXXXXXX"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={userSettings.department_id || ''}
                        onValueChange={(value) => handleUserSettingsChange('department_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        value={userSettings.designation || ''}
                        onChange={(e) => handleUserSettingsChange('designation', e.target.value)}
                        placeholder="e.g., Professor, Lecturer"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={userSettings.date_of_birth?.split('T')[0] || ''}
                        onChange={(e) => handleUserSettingsChange('date_of_birth', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* <Separator /> */}
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          value={userSettings.address || ''}
                          onChange={(e) => handleUserSettingsChange('address', e.target.value)}
                          placeholder="Enter street address"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={userSettings.city || ''}
                          onChange={(e) => handleUserSettingsChange('city', e.target.value)}
                          placeholder="Enter city"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="state">State/Province</Label>
                        <Input
                          id="state"
                          value={userSettings.state || ''}
                          onChange={(e) => handleUserSettingsChange('state', e.target.value)}
                          placeholder="Enter state"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="postal_code">Postal Code</Label>
                        <Input
                          id="postal_code"
                          value={userSettings.postal_code || ''}
                          onChange={(e) => handleUserSettingsChange('postal_code', e.target.value)}
                          placeholder="Enter postal code"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={userSettings.country || ''}
                          onChange={(e) => handleUserSettingsChange('country', e.target.value)}
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t px-6 py-4">
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={loadingStates.profile}
                    className="gap-2"
                  >
                    {loadingStates.profile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {loadingStates.profile ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your password and account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Enter new password (min 8 characters)"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Confirm your new password"
                      />
                    </div>
                  </div>
                  
                  <Alert className="bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-2">
                      <Key className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <AlertTitle className="text-blue-800">Password Requirements</AlertTitle>
                        <AlertDescription className="text-blue-700">
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                            <li>Minimum 8 characters long</li>
                            <li>At least one uppercase letter (A-Z)</li>
                            <li>At least one lowercase letter (a-z)</li>
                            <li>At least one number (0-9)</li>
                            <li>At least one special character (!@#$%^&*)</li>
                          </ul>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                  
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <AlertTitle className="text-yellow-800">Two-Factor Authentication</AlertTitle>
                        <AlertDescription className="text-yellow-700">
                          Two-factor authentication is not enabled for your account. 
                          <Button variant="link" className="px-1 h-auto text-yellow-800 underline">
                            Enable 2FA
                          </Button>
                          for additional security.
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                </CardContent>
                <CardFooter className="flex justify-end border-t px-6 py-4">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={loadingStates.security}
                    className="gap-2"
                  >
                    {loadingStates.security ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {loadingStates.security ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && notificationSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellRing className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how and when you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.email_notifications ?? false}
                        onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked)}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive browser push notifications
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.push_notifications ?? false}
                        onCheckedChange={(checked) => handleNotificationChange('push_notifications', checked)}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Notification Types</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="assignment_notifications" className="cursor-pointer">
                          Assignment Reminders
                        </Label>
                        <Switch
                          id="assignment_notifications"
                          checked={notificationSettings.assignment_notifications ?? false}
                          onCheckedChange={(checked) => handleNotificationChange('assignment_notifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="quiz_notifications" className="cursor-pointer">
                          Quiz Notifications
                        </Label>
                        <Switch
                          id="quiz_notifications"
                          checked={notificationSettings.quiz_notifications ?? false}
                          onCheckedChange={(checked) => handleNotificationChange('quiz_notifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="attendance_notifications" className="cursor-pointer">
                          Attendance Alerts
                        </Label>
                        <Switch
                          id="attendance_notifications"
                          checked={notificationSettings.attendance_notifications ?? false}
                          onCheckedChange={(checked) => handleNotificationChange('attendance_notifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="grade_notifications" className="cursor-pointer">
                          Grade Notifications
                        </Label>
                        <Switch
                          id="grade_notifications"
                          checked={notificationSettings.grade_notifications ?? false}
                          onCheckedChange={(checked) => handleNotificationChange('grade_notifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="announcement_notifications" className="cursor-pointer">
                          Announcements
                        </Label>
                        <Switch
                          id="announcement_notifications"
                          checked={notificationSettings.announcement_notifications ?? false}
                          onCheckedChange={(checked) => handleNotificationChange('announcement_notifications', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t px-6 py-4">
                  <Button 
                    onClick={handleSaveNotificationSettings} 
                    disabled={loadingStates.notifications}
                    className="gap-2"
                  >
                    {loadingStates.notifications ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {loadingStates.notifications ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && userPreferences && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    User Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your application experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Theme Preference</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => handlePreferenceChange('theme', 'light')}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            userPreferences.theme === 'light' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted hover:border-muted-foreground/20'
                          }`}
                        >
                          <Sun className="w-6 h-6" />
                          <span className="text-sm">Light</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handlePreferenceChange('theme', 'dark')}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            userPreferences.theme === 'dark' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted hover:border-muted-foreground/20'
                          }`}
                        >
                          <Moon className="w-6 h-6" />
                          <span className="text-sm">Dark</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handlePreferenceChange('theme', 'system')}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            userPreferences.theme === 'system' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted hover:border-muted-foreground/20'
                          }`}
                        >
                          <Monitor className="w-6 h-6" />
                          <span className="text-sm">System</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={userPreferences.language || 'en'}
                        onValueChange={(value) => handlePreferenceChange('language', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableLanguages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={userPreferences.timezone || 'Asia/Karachi'}
                        onValueChange={(value) => handlePreferenceChange('timezone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* <Separator /> */}
                  
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Accessibility</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="reduced_motion" className="cursor-pointer">
                          Reduced Motion
                        </Label>
                        <Switch id="reduced_motion" />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="high_contrast" className="cursor-pointer">
                          High Contrast
                        </Label>
                        <Switch id="high_contrast" />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="large_text" className="cursor-pointer">
                          Large Text
                        </Label>
                        <Switch id="large_text" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t px-6 py-4">
                  <Button 
                    onClick={handleSavePreferences} 
                    disabled={loadingStates.preferences}
                    className="gap-2"
                  >
                    {loadingStates.preferences ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {loadingStates.preferences ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Your recent actions and system events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {activity.action.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                            {activity.details && Object.keys(activity.details).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(activity.details)}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {activity.entity_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="mt-2 text-muted-foreground">No recent activity found</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-center border-t px-6 py-4">
                  <Button variant="outline" onClick={() => router.push('/dashboard/activity')}>
                    View All Activity
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}