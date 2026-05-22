/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  Clock,
  X,
  BookOpen,
  GraduationCap,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  related_entity_id: string | null;
  related_entity_type: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  userRole: string;
}

export function NotificationList({ 
  notifications, 
  onMarkAsRead, 
  onDelete,
  userRole 
}: NotificationListProps) {
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'attendance_marked':
      case 'attendance_reminder':
      case 'low_attendance_alert':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'quiz_created':
      case 'quiz_due':
      case 'quiz_graded':
        return <Check className="h-5 w-5 text-purple-500" />;
      case 'fee_due':
      case 'fee_paid':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'grade_published':
        return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      case 'lesson_added':
      case 'course_registration':
        return <BookOpen className="h-5 w-5 text-indigo-500" />;
      case 'announcement':
      case 'system_alert':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'attendance_marked':
      case 'attendance_reminder':
      case 'low_attendance_alert':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'quiz_created':
      case 'quiz_due':
      case 'quiz_graded':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'fee_due':
      case 'fee_paid':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'grade_published':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'lesson_added':
      case 'course_registration':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'announcement':
      case 'system_alert':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getNotificationLink = (notification: Notification) => {
    // Different roles might have different link structures
    const basePath = `/${userRole}`;
    
    switch (notification.related_entity_type) {
      case 'course':
        return `${basePath}/courses/${notification.related_entity_id}`;
      case 'quiz':
        return `${basePath}/quizzes/${notification.related_entity_id}`;
      case 'attendance':
        return `${basePath}/attendance`;
      case 'fee':
        return `${basePath}/fees`;
      case 'grade':
        return `${basePath}/grades`;
      default:
        return '#';
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'p-6 hover:bg-gray-50 transition-colors relative group',
            !notification.is_read && 'bg-blue-50/30'
          )}
        >
          <div className="flex gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className={cn(
                'p-2 rounded-full',
                getNotificationTypeColor(notification.notification_type)
              )}>
                {getNotificationIcon(notification.notification_type)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                    {notification.read_at && (
                      <>
                        <span>•</span>
                        <span>
                          Read {formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsRead(notification.id)}
                      className="h-8 px-2 text-gray-600 hover:text-gray-900"
                    >
                      <Check className="h-4 w-4" />
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(notification.id)}
                    className="h-8 px-2 text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>

              {/* Related Link */}
              {notification.related_entity_id && (
                <a
                  href={getNotificationLink(notification)}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  View related {notification.related_entity_type}
                  <span className="text-blue-600">→</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}