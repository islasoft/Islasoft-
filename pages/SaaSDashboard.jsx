import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Ticket, DollarSign, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function SaaSDashboard() {
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.SaaSCustomer.list()
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => base44.entities.SupportTicket.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.SaaSInvoice.list()
  });

  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalUsers = customers.reduce((sum, c) => sum + (c.user_count || 0), 0);
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  const monthlyRevenue = customers.reduce((sum, c) => 
    sum + (c.status === 'active' ? (c.user_count || 0) * (c.price_per_user || 0) : 0), 0
  );

  const stats = [
    { title: 'Active Customers', value: activeCustomers, icon: Users, color: 'blue', link: 'SaaSCustomers' },
    { title: 'Total Users', value: totalUsers, icon: Users, color: 'green' },
    { title: 'Open Tickets', value: openTickets, icon: Ticket, color: 'orange', link: 'SupportTickets' },
    { title: 'Overdue Invoices', value: overdueInvoices, icon: AlertCircle, color: 'red', link: 'SaaSBilling' },
    { title: 'Monthly Revenue', value: `$${monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'purple', link: 'SaaSBilling' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SaaS Management Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your customers, support, and billing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const content = (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <Icon className={`h-5 w-5 text-${stat.color}-600`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
              </CardContent>
            </Card>
          );

          return stat.link ? (
            <Link key={stat.title} to={createPageUrl(stat.link)}>
              {content}
            </Link>
          ) : (
            <div key={stat.title}>{content}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customers.slice(0, 5).map(customer => (
                <div key={customer.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{customer.company_name}</p>
                    <p className="text-sm text-gray-600">{customer.user_count} users • ${customer.price_per_user}/user</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    customer.status === 'active' ? 'bg-green-100 text-green-800' :
                    customer.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {customer.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tickets.slice(0, 5).map(ticket => (
                <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm">#{ticket.ticket_number} - {ticket.subject}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{ticket.customer_name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}