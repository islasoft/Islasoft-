import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import ExportReportButton from './ExportReportButton';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

export default function TeamPerformanceReport({ users, projects, timeEntries, filters }) {
  const teamStats = useMemo(() => {
    let filteredProjects = [...projects];
    let filteredTimeEntries = [...timeEntries];

    // Apply filters
    if (filters.startDate) {
      filteredProjects = filteredProjects.filter(p => p.created_date >= filters.startDate);
      filteredTimeEntries = filteredTimeEntries.filter(e => e.date >= filters.startDate);
    }
    if (filters.endDate) {
      filteredProjects = filteredProjects.filter(p => p.created_date <= filters.endDate);
      filteredTimeEntries = filteredTimeEntries.filter(e => e.date <= filters.endDate);
    }

    return users
      .filter(u => u.team_category !== 'admin')
      .map(user => {
        const userProjects = filteredProjects.filter(p => p.assigned_to_id === user.id);
        const completedProjects = userProjects.filter(p => p.status === 'completed');
        
        const userEntries = filteredTimeEntries.filter(e => e.staff_id === user.id);
        const totalHours = userEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

        const completionRate = userProjects.length > 0 
          ? (completedProjects.length / userProjects.length) * 100 
          : 0;

        return {
          userName: user.full_name,
          email: user.email,
          totalProjects: userProjects.length,
          completedProjects: completedProjects.length,
          activeProjects: userProjects.length - completedProjects.length,
          completionRate,
          totalHours,
          avgHoursPerProject: userProjects.length > 0 ? totalHours / userProjects.length : 0
        };
      })
      .filter(stat => stat.totalProjects > 0 || stat.totalHours > 0)
      .sort((a, b) => b.totalProjects - a.totalProjects);
  }, [users, projects, timeEntries, filters]);

  const exportCSV = () => {
    const headers = ['User', 'Total Projects', 'Completed', 'Active', 'Completion Rate %', 'Total Hours', 'Avg Hours/Project'];
    const rows = teamStats.map(item => [
      item.userName,
      item.totalProjects,
      item.completedProjects,
      item.activeProjects,
      item.completionRate.toFixed(1),
      item.totalHours.toFixed(2),
      item.avgHoursPerProject.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team_performance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Team Performance Report', 20, 20);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    let y = 35;
    doc.text('User', 20, y);
    doc.text('Total Projects', 80, y);
    doc.text('Completed', 110, y);
    doc.text('Active', 140, y);
    doc.text('Completion Rate', 170, y);
    doc.text('Total Hours', 210, y);
    doc.text('Avg Hrs/Proj', 240, y);
    y += 7;

    doc.setFont(undefined, 'normal');
    teamStats.forEach(item => {
      if (y > 180) {
        doc.addPage();
        y = 20;
      }
      const name = doc.splitTextToSize(item.userName, 55);
      doc.text(name[0], 20, y);
      doc.text(item.totalProjects.toString(), 80, y);
      doc.text(item.completedProjects.toString(), 110, y);
      doc.text(item.activeProjects.toString(), 140, y);
      doc.text(`${item.completionRate.toFixed(1)}%`, 170, y);
      doc.text(item.totalHours.toFixed(1), 210, y);
      doc.text(item.avgHoursPerProject.toFixed(1), 240, y);
      y += 7;
    });

    doc.save(`team_performance_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Status by Team Member</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="userName" tick={{fontSize: 12}} interval={0} angle={-45} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completedProjects" name="Completed" stackId="a" fill="#10B981" />
                <Bar dataKey="activeProjects" name="Active" stackId="a" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Hours Logged by Team Member</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="userName" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalHours" name="Total Hours" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Detailed Performance Metrics</CardTitle>
            <div className="flex gap-2">
              <ExportReportButton 
                reportData={teamStats} 
                reportTitle="Team Performance Report" 
                reportType="team_performance"
              />
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">User</th>
                  <th className="text-right py-3 px-2">Total Projects</th>
                  <th className="text-right py-3 px-2">Completed</th>
                  <th className="text-right py-3 px-2">Active</th>
                  <th className="text-right py-3 px-2">Completion Rate</th>
                  <th className="text-right py-3 px-2">Total Hours</th>
                  <th className="text-right py-3 px-2">Avg Hrs/Project</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{item.userName}</td>
                    <td className="text-right py-3 px-2">{item.totalProjects}</td>
                    <td className="text-right py-3 px-2 text-green-600">{item.completedProjects}</td>
                    <td className="text-right py-3 px-2 text-blue-600">{item.activeProjects}</td>
                    <td className="text-right py-3 px-2">
                      <span className={`font-medium ${
                        item.completionRate >= 80 ? 'text-green-600' :
                        item.completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {item.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 font-mono">{item.totalHours.toFixed(1)}</td>
                    <td className="text-right py-3 px-2 font-mono">{item.avgHoursPerProject.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}