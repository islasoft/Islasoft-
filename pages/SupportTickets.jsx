import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SupportTickets() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => base44.entities.SupportTicket.list('-created_date')
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.SaaSCustomer.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportTicket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      toast.success('Ticket updated');
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const ticket = tickets.find(t => t.id === ticketId);
      const currentUser = await base44.auth.me();
      
      const newMessages = [
        ...(ticket.messages || []),
        {
          sender_name: currentUser.full_name,
          sender_email: currentUser.email,
          message: message,
          timestamp: new Date().toISOString(),
          is_internal: false
        }
      ];
      
      return base44.entities.SupportTicket.update(ticketId, { messages: newMessages });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setNewMessage('');
      toast.success('Message sent');
    }
  });

  const handleStatusChange = (ticketId, status) => {
    const updateData = { status };
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_date = new Date().toISOString();
    }
    updateMutation.mutate({ id: ticketId, data: updateData });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;
    sendMessageMutation.mutate({
      ticketId: selectedTicket.id,
      message: newMessage
    });
  };

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'waiting_customer': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const TicketCard = ({ ticket }) => (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => setSelectedTicket(ticket)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-gray-500">#{ticket.ticket_number}</span>
              <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
              <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
            </div>
            <CardTitle className="text-base">{ticket.subject}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{ticket.customer_name}</span>
        </div>
        <div className="text-xs text-gray-500">
          {ticket.user_name} • {ticket.user_email}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
          <span>{ticket.category}</span>
          <span>•</span>
          <span>{format(new Date(ticket.created_date), 'MMM d, yyyy')}</span>
          {ticket.messages?.length > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {ticket.messages.length}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-gray-600 mt-1">Manage customer support requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Ticket className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {tickets.filter(t => t.status === 'open').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {tickets.filter(t => t.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tickets.filter(t => t.status === 'resolved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <Ticket className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {tickets.filter(t => t.priority === 'urgent').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedTickets.length})</TabsTrigger>
          <TabsTrigger value="all">All Tickets ({tickets.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {openTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
        </TabsContent>
        <TabsContent value="resolved" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {resolvedTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
        </TabsContent>
        <TabsContent value="all" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ticket #{selectedTicket?.ticket_number} - {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge>
                <Badge className={getStatusColor(selectedTicket.status)}>{selectedTicket.status}</Badge>
                <Badge variant="outline">{selectedTicket.category}</Badge>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div><strong>Customer:</strong> {selectedTicket.customer_name}</div>
                <div><strong>Contact:</strong> {selectedTicket.user_name} ({selectedTicket.user_email})</div>
                <div><strong>Created:</strong> {format(new Date(selectedTicket.created_date), 'MMM d, yyyy h:mm a')}</div>
              </div>

              <div>
                <Label>Description</Label>
                <div className="bg-gray-50 p-4 rounded-lg mt-1">{selectedTicket.description}</div>
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={selectedTicket.status} 
                  onValueChange={(value) => handleStatusChange(selectedTicket.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_customer">Waiting for Customer</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2">Messages</Label>
                <div className="space-y-3 max-h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                  {selectedTicket.messages?.map((msg, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{msg.sender_name}</span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{msg.message}</p>
                    </div>
                  ))}
                  {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                    <p className="text-sm text-gray-500">No messages yet</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Send Message</Label>
                <div className="flex gap-2 mt-1">
                  <Textarea
                    placeholder="Type your response..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleSendMessage} className="mt-2 w-full">
                  Send Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}