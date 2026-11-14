import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Clock } from 'lucide-react';

export default function UnbilledTimeReport({ timeEntries = [], clients = [] }) {
  const unbilledByClient = useMemo(() => {
    // Get unbilled time entries (not invoiced)
    const unbilled = timeEntries.filter(entry => !entry.invoiced);

    // Group by client and sum hours
    const grouped = {};
    unbilled.forEach(entry => {
      const clientName = entry.client_name || 'Unknown Client';
      if (!grouped[clientName]) {
        grouped[clientName] = {
          client_name: clientName,
          unbilled_hours: 0,
          entry_count: 0,
        };
      }
      grouped[clientName].unbilled_hours += entry.hours || 0;
      grouped[clientName].entry_count += 1;
    });

    return Object.values(grouped).sort((a, b) => b.unbilled_hours - a.unbilled_hours);
  }, [timeEntries]);

  const totalUnbilledHours = useMemo(() => {
    return unbilledByClient.reduce((sum, item) => sum + item.unbilled_hours, 0);
  }, [unbilledByClient]);

  if (unbilledByClient.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Clock className="w-12 h-12 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">All Time Billed!</h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">There are no unbilled time entries.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Unbilled Time by Client
          </CardTitle>
          <CardDescription>Time entries not yet invoiced</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Card */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Unbilled Hours</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-500">{totalUnbilledHours.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-500">{unbilledByClient.reduce((sum, item) => sum + item.entry_count, 0)}</p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unbilledByClient}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="client_name" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => value.toFixed(2)}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="unbilled_hours" fill="#f59e0b" name="Unbilled Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Client Name</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Unbilled Hours</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Entries</th>
                </tr>
              </thead>
              <tbody>
                {unbilledByClient.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{item.client_name}</td>
                    <td className="text-right py-3 px-4 font-semibold text-amber-600 dark:text-amber-400">{item.unbilled_hours.toFixed(2)}</td>
                    <td className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">{item.entry_count}</td>
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