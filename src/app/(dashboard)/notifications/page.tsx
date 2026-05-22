/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  X,
  BookOpen,
  Brain,
  Star,
  MessageSquare
} from 'lucide-react';
import { mockNotifications } from '@/lib/mock-data';
import { getCurrentUser } from '@/lib/auth';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'assignment' | 'quiz' | 'grade' | 'message' | 'general';
  date: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications as Notification[]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map((notif: Notification) => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter((notif: Notification) => notif.id !== id));
  };

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assignment': return <BookOpen className="h-4 w-4" />;
      case 'quiz': return <Brain className="h-4 w-4" />;
      case 'grade': return <Star className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: Notification['type']): string => {
    switch (type) {
      case 'assignment': return 'text-blue-600 bg-blue-100';
      case 'quiz': return 'text-purple-600 bg-purple-100';
      case 'grade': return 'text-green-600 bg-green-100';
      case 'message': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const todayNotifications = notifications.filter((n: Notification) => {
    const notifDate = new Date(n.date);
    const today = new Date();
    return notifDate.toDateString() === today.toDateString();
  });

  const thisWeekNotifications = notifications.filter((n: Notification) => {
    const notifDate = new Date(n.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return notifDate > weekAgo;
  });

  const overdueNotifications = notifications.filter((n: Notification) => 
    n.type === 'assignment' && !n.read
  );

  if (!user) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated with your academic activities</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{unreadCount} unread</Badge>
          <Button variant="outline" onClick={() => setNotifications(prev => prev.map((n: Notification) => ({...n, read: true})))}>
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Notification Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="today">Today ({todayNotifications.length})</TabsTrigger>
          <TabsTrigger value="week">This Week ({thisWeekNotifications.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueNotifications.length})</TabsTrigger>
        </TabsList>

        {/* All Notifications */}
        <TabsContent value="all" className="space-y-4">
          {notifications.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-500">You&apos;re all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification: Notification) => (
              <Card 
                key={notification.id} 
                className={`border-0 shadow-lg transition-all hover:shadow-xl ${
                  !notification.read ? 'border-l-4 border-l-blue-500' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-lg ${getIconColor(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(notification.date).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="capitalize">
                            {notification.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Today's Notifications */}
        <TabsContent value="today" className="space-y-4">
          {todayNotifications.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications today</h3>
                <p className="text-gray-500">Check back later for updates</p>
              </CardContent>
            </Card>
          ) : (
            todayNotifications.map((notification: Notification) => (
              <Card 
                key={notification.id} 
                className={`border-0 shadow-lg ${
                  !notification.read ? 'border-l-4 border-l-blue-500' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-lg ${getIconColor(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{notification.message}</p>
                        <Badge variant="outline" className="capitalize">
                          {notification.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* This Week */}
        <TabsContent value="week" className="space-y-4">
          {thisWeekNotifications.map((notification: Notification) => (
            <Card 
              key={notification.id} 
              className={`border-0 shadow-lg ${
                !notification.read ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${getIconColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{new Date(notification.date).toLocaleDateString()}</span>
                        <Badge variant="outline" className="capitalize">
                          {notification.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Overdue */}
        <TabsContent value="overdue" className="space-y-4">
          {overdueNotifications.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nothing overdue!</h3>
                <p className="text-gray-500">Great job staying on top of your assignments</p>
              </CardContent>
            </Card>
          ) : (
            overdueNotifications.map((notification: Notification) => (
              <Card key={notification.id} className="border-0 shadow-lg border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 rounded-lg bg-red-100">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{notification.title}</h3>
                        <p className="text-gray-600 mb-2">{notification.message}</p>
                        <Badge variant="destructive">Overdue</Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Take Action
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}