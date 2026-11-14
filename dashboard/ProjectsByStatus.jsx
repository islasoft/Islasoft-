import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_COLORS = {
  not_started: '#6B7280',
  in_progress: '#3B82F6',
  waiting: '#F59E0B',
  on_hold: '#EF4444',
  completed: '#10B981',
};

export default function ProjectsByStatus({ projects }) {
  const statusCounts = projects.reduce((acc, project) => {
    const status = project.status || 'not_started';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    status: status.replace(/_/g, ' '),
    count,
    color: STATUS_COLORS[status] || '#6B7280',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Projects by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}