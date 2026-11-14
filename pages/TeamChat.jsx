import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TeamChat from '../components/team/TeamChat';

export default function TeamChatPage() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  if (!currentUser) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Chat</h1>
        <p className="text-gray-600 mt-1">Quick internal communication channels</p>
      </div>

      <TeamChat currentUser={currentUser} users={users} />
    </div>
  );
}