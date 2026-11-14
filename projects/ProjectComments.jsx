import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function ProjectComments({ project, currentUser, users }) {
  const [comment, setComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['projectComments', project.id],
    queryFn: () => base44.entities.ProjectComment.filter({ project_id: project.id }, '-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newComment = await base44.entities.ProjectComment.create(data);
      
      // Send notifications to mentioned users
      if (data.mentions && data.mentions.length > 0) {
        const notifications = data.mentions.map(userId => ({
          user_id: userId,
          user_email: users.find(u => u.id === userId)?.email,
          type: 'message_received',
          title: `${currentUser.full_name} mentioned you in a comment`,
          message: `On project: ${project.project_type} - "${data.content.substring(0, 100)}..."`,
          related_id: project.id,
          related_type: 'project',
          priority: 'medium',
        }));
        await base44.entities.Notification.bulkCreate(notifications);
      }
      
      return newComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectComments', project.id]);
      setComment('');
      toast.success('Comment posted');
    },
  });

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setComment(value);
    
    // Check for @ mentions
    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1 && atIndex === value.length - 1) {
      setShowMentions(true);
      setMentionSearch('');
    } else if (atIndex !== -1) {
      const search = value.substring(atIndex + 1);
      if (!search.includes(' ')) {
        setShowMentions(true);
        setMentionSearch(search.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user) => {
    const atIndex = comment.lastIndexOf('@');
    const newComment = comment.substring(0, atIndex) + `@${user.full_name} `;
    setComment(newComment);
    setShowMentions(false);
  };

  const handleSubmit = () => {
    if (!comment.trim()) return;

    // Extract mentions from comment
    const mentionRegex = /@(\w+\s*\w*)/g;
    const matches = comment.matchAll(mentionRegex);
    const mentionedUserIds = [];
    
    for (const match of matches) {
      const name = match[1].trim();
      const user = users.find(u => u.full_name.toLowerCase().includes(name.toLowerCase()));
      if (user) mentionedUserIds.push(user.id);
    }

    createMutation.mutate({
      project_id: project.id,
      project_name: project.project_type,
      client_id: project.client_id,
      client_name: project.client_name,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      content: comment,
      mentions: mentionedUserIds,
    });
  };

  const filteredUsers = showMentions
    ? users.filter(u => u.full_name.toLowerCase().includes(mentionSearch))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Project Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input */}
        <div className="relative">
          <Textarea
            placeholder="Add a comment... Use @name to mention someone"
            value={comment}
            onChange={handleCommentChange}
            rows={3}
            className="resize-none"
          />
          {showMentions && filteredUsers.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => insertMention(user)}
                >
                  {user.full_name} ({user.email})
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end mt-2">
            <Button onClick={handleSubmit} disabled={!comment.trim()} size="sm">
              <Send className="w-4 h-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-3 max-h-96 overflow-auto">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-6 text-sm">No comments yet</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="border-l-2 border-blue-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{c.user_name}</p>
                    <p className="text-xs text-gray-500">{format(parseISO(c.created_date), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <p className="text-sm mt-2 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}