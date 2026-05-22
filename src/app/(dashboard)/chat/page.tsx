'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
        <p className="text-gray-500 mt-1">Class discussions and messaging</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Chat Coming Soon</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Real-time class discussions, direct messaging with teachers, and collaborative study groups will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}