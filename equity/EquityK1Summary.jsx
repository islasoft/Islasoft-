import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

function computeK1(partner, ledgerEntries, partnership) {
  const entries = ledgerEntries.filter(e => e.partner_name === partner.name);
  const getTotal = (types) => entries.filter(e => types.includes(e.entry_type)).reduce((s, e) => s + (e.amount || 0), 0);

  const begCap = partner.beginning_capital || 0;
  const contributions = getTotal(['CONTR', 'CONTR_ADDL']);
  const distributions = getTotal(['DIST']);

  // Income: allocate income_lines by profit_percentage
  const totalIncome = (partnership.income_lines || []).reduce((s, l) => s + (l.amount || 0), 0);
  const incomeAlloc = totalIncome * (partner.profit_percentage || 0) / 100;

  // Deductions: allocate by loss_percentage
  const totalDeductions = (partnership.deduction_lines || []).reduce((s, l) => s + (l.amount || 0), 0);
  const deductionAlloc = totalDeductions * (partner.loss_percentage || 0) / 100;

  const otherAdj = getTotal(['OTH_INCR', 'ADJ']) - getTotal(['OTH_DED']);
  const endingCap = begCap + contributions + incomeAlloc - deductionAlloc - distributions + otherAdj;

  return { begCap, contributions, incomeAlloc, deductionAlloc, distributions, otherAdj, endingCap };
}

export default function EquityK1Summary({ partnership }) {
  const { data: entries = [] } = useQuery({
    queryKey: ['equityLedger', partnership.id],
    queryFn: () => base44.entities.EquityLedgerEntry.filter({ equity_partnership_id: partnership.id }),
  });

  const partners = partnership.partners || [];

  const handlePrint = () => window.print();

  const Row = ({ label, value, bold, highlight }) => (
    <div className={`flex justify-between py-1.5 border-b last:border-0 text-sm ${bold ? 'font-bold' : ''} ${highlight ? 'bg-slate-50 -mx-3 px-3' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span className={`tabular-nums ${value < 0 ? 'text-red-600' : ''}`}>${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-slate-700">K-1 Summary — {partnership.name} ({partnership.tax_year})</h4>
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1" /> Export / Print
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
        {partners.map((partner, i) => {
          const k1 = computeK1(partner, entries, partnership);
          return (
            <Card key={i} className="print:break-inside-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{partner.name || `Partner ${i+1}`}</span>
                  <span className="text-xs font-normal text-slate-400">Profit: {partner.profit_percentage}% · Loss: {partner.loss_percentage}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="Beginning Capital" value={k1.begCap} />
                <Row label="+ Contributions" value={k1.contributions} />
                <Row label="+ Income Allocations" value={k1.incomeAlloc} />
                <Row label="− Deduction Allocations" value={-k1.deductionAlloc} />
                <Row label="− Distributions" value={-k1.distributions} />
                {k1.otherAdj !== 0 && <Row label="Other Adjustments" value={k1.otherAdj} />}
                <Row label="Ending Capital" value={k1.endingCap} bold highlight />
                {k1.endingCap < 0 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    ⚠ Capital account is negative — basis warning
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}