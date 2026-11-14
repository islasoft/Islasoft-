import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MentionInput from '../shared/MentionInput';

export default function TaskComments({ task, currentUser, users = [] }) {
  const [newComment, setNewComment] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments', task.id],
    queryFn: async () => {
      const allComments = await base44.entities.ProjectComment.filter({ project_id: task.id });
      return allComments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
  });

  // Real-time subscription for new comments
  useEffect(() => {
    const unsubscribe = base44.entities.ProjectComment.subscribe((event) => {
      if (event.data?.project_id === task.id) {
        queryClient.invalidateQueries({ queryKey: ['taskComments', task.id] });
      }
    });

    return unsubscribe;
  }, [task.id, queryClient]);

  const createCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const comment = await base44.entities.ProjectComment.create(commentData);
      
      // Send notifications to mentioned users
      for (const mentionedUser of mentionedUsers) {
        await base44.entities.Notification.create({
          user_id: mentionedUser.id,
          user_email: mentionedUser.email,
          type: 'message_received',
          title: `${currentUser?.full_name} mentioned you in a task`,
          message: `"${commentData.content.substring(0, 100)}${commentData.content.length > 100 ? '...' : ''}"`,
          link: `/TaskDetails?id=${task.id}`,
          related_id: task.id,
          related_type: 'task',
          priority: 'high'
        });
      }
      
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', task.id] });
      setNewComment('');
      setMentionedUsers([]);
      toast.success('Comment added');
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    createCommentMutation.mutate({
      project_id: task.id,
      project_name: task.title,
      client_id: task.client_id,
      client_name: task.client_name,
      user_id: currentUser?.id,
      user_name: currentUser?.full_name,
      content: newComment,
      mentions: mentionedUsers.map(u => u.id),
    });
  };

  const handleMention = (user) => {
    if (!mentionedUsers.find(u => u.id === user.id)) {
      setMentionedUsers([...mentionedUsers, user]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input */}
        <div className="space-y-2">
          <MentionInput
            value={newComment}
            onChange={setNewComment}
            onMention={handleMention}
            users={users}
            placeholder="Add a comment or mention someone with @..."
            rows={3}
          />
          <Button 
            onClick={handleSubmit}
            disabled={!newComment.trim() || createCommentMutation.isPending}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Comment
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <div className="w-full h-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                    {comment.user_name?.charAt(0) || '?'}
                  </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user_name}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}