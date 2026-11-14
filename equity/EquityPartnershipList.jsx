import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import EquityPartnershipForm from './EquityPartnershipForm';
import EquityPartnershipDetail from './EquityPartnershipDetail';

const STATUS_COLORS = {
  draft: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  final: 'bg-green-100 text-green-800',
};

export default function EquityPartnershipList({ client }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: partnerships = [], isLoading } = useQuery({
    queryKey: ['equityPartnerships', client.id],
    queryFn: () => base44.entities.EquityPartnership.filter({ client_id: client.id }, '-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EquityPartnership.create({ ...data, client_id: client.id, client_name: client.company_name || client.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equityPartnerships', client.id] });
      setShowForm(false);
    },
  });

  if (selected) {
    return <EquityPartnershipDetail partnership={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700">Partnership Records</h3>
        <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Partnership
        </Button>
      </div>

      {showForm && (
        <EquityPartnershipForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          isPending={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
      ) : partnerships.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No partnership records yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {partnerships.map(p => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(p)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tax Year: {p.tax_year || '—'} · {p.partners?.length || 0} partners
                    {p.period_start_label && ` · ${p.period_start_label}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}