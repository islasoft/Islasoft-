/**
 * AnnualReportManager.jsx
 * Florida Annual Report tracker embedded as the "📋 Annual Reports" tab
 * inside the existing Clients page.
 *
 * Data: base44.entities.AnnualReportFiling
 * Requires that entity to be created in the Base44 schema first.
 * If not yet created, this component shows a setup screen.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Send,
  CheckCircle,
  FileCheck,
  StickyNote,
  Loader2,
  Database,
  Copy,
  Check,
  Building2,
} from 'lucide-react';
import { formatDate } from '../../utils';

// ─── Seed data — 37 entities missing 2026 Annual Report ──────────────────────

const SEED_DATA = [
  { entityName: 'Lis Fashion LLC', manager: '', docNumber: 'L18000113562', entityType: 'LLC' },
  { entityName: 'Sweet Tooth Productions Inc', manager: 'Inti', docNumber: 'P23000028415', entityType: 'Corp' },
  { entityName: 'Alfanen LLC', manager: '', docNumber: 'L22000268765', entityType: 'LLC' },
  { entityName: 'J&D Service Solutions Corp', manager: '', docNumber: 'P14000082160', entityType: 'Corp' },
  { entityName: 'NorthStar Supplies Corp', manager: '', docNumber: 'P19000022701', entityType: 'Corp' },
  { entityName: 'Tavio Vela Services LLC', manager: '', docNumber: 'L18000240655', entityType: 'LLC' },
  { entityName: 'Florida Professional Security Inc', manager: '', docNumber: 'P19000047263', entityType: 'Corp' },
  { entityName: 'F&F Media III Corp', manager: '', docNumber: 'P01000069147', entityType: 'Corp' },
  { entityName: 'Diana R Ruiz Torres LLC', manager: 'Diana', docNumber: 'L21000492217', entityType: 'LLC' },
  { entityName: 'Money Clothing Corp', manager: '', docNumber: 'P19000019224', entityType: 'Corp' },
  { entityName: 'Jorrin Gonzalez Family LLC', manager: '', docNumber: 'L21000100091', entityType: 'LLC' },
  { entityName: 'Besexy Swimwear LLC', manager: 'Odensy', docNumber: 'L19000059838', entityType: 'LLC' },
  { entityName: 'HMG of Florida LLC', manager: '', docNumber: 'L21000342222', entityType: 'LLC' },
  { entityName: 'Making a Change Inc', manager: '', docNumber: 'N22000007817', entityType: 'Nonprofit' },
  { entityName: 'Cacho Media LLC', manager: '', docNumber: 'L21000390381', entityType: 'LLC' },
  { entityName: 'Hello Hotels LLC', manager: '', docNumber: 'L21000258700', entityType: 'LLC' },
  { entityName: 'Farres Painting LLC', manager: '', docNumber: 'L23000318009', entityType: 'LLC' },
  { entityName: '5980 LLC', manager: 'Silvia', docNumber: 'L22000291259', entityType: 'LLC' },
  { entityName: '15801 LLC', manager: 'Silvia', docNumber: 'L22000291268', entityType: 'LLC' },
  { entityName: '15803 LLC', manager: 'Silvia', docNumber: 'L22000291273', entityType: 'LLC' },
  { entityName: '471 at 101 N Ocean LLC', manager: '', docNumber: 'L22000291290', entityType: 'LLC' },
  { entityName: 'Fran Florida Services Corp', manager: '', docNumber: 'P18000054472', entityType: 'Corp' },
  { entityName: 'Inversiones La Alcancia Corp', manager: '', docNumber: 'P22000089927', entityType: 'Corp' },
  { entityName: 'Impact Windoors Installation LLC', manager: '', docNumber: 'L22000433399', entityType: 'LLC' },
  { entityName: 'ALFANEN II LLC', manager: '', docNumber: 'L23000005840', entityType: 'LLC' },
  { entityName: 'Miami Airport Center Association Inc', manager: '', docNumber: 'N06000008414', entityType: 'Nonprofit' },
  { entityName: 'Florida Property Mgmt Solutions Inc', manager: '', docNumber: 'P08000056841', entityType: 'Corp' },
  { entityName: 'Embrace Behavioral Services Inc', manager: 'Juliet', docNumber: 'P22000035058', entityType: 'Corp' },
  { entityName: 'Your Health In Writing Corp', manager: '', docNumber: 'P22000050769', entityType: 'Corp' },
  { entityName: 'Romira Construction LLC', manager: 'Diana', docNumber: 'L24000149158', entityType: 'LLC' },
  { entityName: 'Camaguey Cleaning Services LLC', manager: 'Yoenny', docNumber: 'L23000424209', entityType: 'LLC' },
  { entityName: 'Nina and Chichis Delights LLC', manager: '', docNumber: 'L24000165714', entityType: 'LLC' },
  { entityName: 'Transcid LLC', manager: '', docNumber: 'L24000408000', entityType: 'LLC' },
  { entityName: 'ARCE HOSPITALITY GROUP CONSULTING LLC', manager: 'Arce', docNumber: 'L23000498443', entityType: 'LLC' },
  { entityName: 'Loyola Care Services LLC', manager: '', docNumber: 'P25000023057', entityType: 'Corp' },
  { entityName: 'Padilla Health Associates Inc', manager: '', docNumber: 'P25000025749', entityType: 'Corp' },
  { entityName: 'People Is Nice Inc', manager: 'Inti', docNumber: 'P26000001927', entityType: 'Corp' },
];

const TODAY = new Date().toISOString().split('T')[0];
const FILING_YEAR = 2026;
const STATE_FEE = 138.75;
const FILING_STAFF = ['Sandy', 'Lilian', 'Yasmani', 'Maydelin'];
const SUNBIZ_URL = 'https://search.sunbiz.org/Inquiry/CorporationSearch/ByDocumentNumber';

// ─── Small presentational helpers ────────────────────────────────────────────

function EntityTypeBadge({ type }) {
  const cls = {
    LLC: 'bg-blue-50 text-blue-700 border-blue-200',
    Corp: 'bg-purple-50 text-purple-700 border-purple-200',
    Nonprofit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }[type] || 'bg-gray-100 text-gray-600 border-gray-200';
  return <Badge className={`text-xs border px-2 py-0 ${cls}`}>{type}</Badge>;
}

function PaymentBadge({ status }) {
  const cls = {
    Pending: 'bg-red-50 text-red-700 border-red-200',
    'Invoice Sent': 'bg-amber-50 text-amber-700 border-amber-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
    Waived: 'bg-gray-100 text-gray-500 border-gray-300',
  }[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return <Badge className={`text-xs border px-2 py-0 whitespace-nowrap ${cls}`}>{status}</Badge>;
}

function FilingBadge({ status }) {
  const cls = {
    'Not Started': 'bg-gray-100 text-gray-500 border-gray-200',
    'Ready to File': 'bg-blue-50 text-blue-700 border-blue-200',
    Filed: 'bg-green-50 text-green-700 border-green-200',
    Error: 'bg-red-50 text-red-700 border-red-200',
  }[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return <Badge className={`text-xs border px-2 py-0 whitespace-nowrap ${cls}`}>{status}</Badge>;
}

function KpiCard({ label, value, color }) {
  const bg = {
    blue: 'from-[#003DA5] to-[#0052CC]',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
  }[color] || 'from-[#003DA5] to-[#0052CC]';
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className={`bg-gradient-to-br ${bg} p-4 text-white`}>
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>
    </Card>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCsv(rows) {
  const headers = [
    'Entity Name', 'Manager', 'Doc #', 'Type', 'Filing Year',
    'State Fee', 'Our Fee', 'Payment Status', 'Filing Status',
    'Payment Date', 'Stripe Invoice URL', 'Stripe Payment ID',
    'Filed Date', 'Filed By', 'Confirmation #', 'Notes',
    'Sunbiz Search URL',
  ];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const dataRows = rows.map((f) => [
    f.entityName,
    f.manager || '',
    f.docNumber,
    f.entityType,
    f.filingYear,
    f.filingFee ?? STATE_FEE,
    f.ourFee ?? '',
    f.paymentStatus,
    f.filingStatus,
    f.paymentDate ? formatDate(f.paymentDate) : '',
    f.stripeInvoiceUrl || '',
    f.stripePaymentId || '',
    f.filedDate ? formatDate(f.filedDate) : '',
    f.filedBy || '',
    f.confirmationNumber || '',
    f.notes || '',
    SUNBIZ_URL,
  ].map(escape).join(','));

  const csv = [headers.map(escape).join(','), ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `annual_reports_${FILING_YEAR}_${TODAY}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnnualReportManager({ currentUser }) {
  const queryClient = useQueryClient();
  const isAdmin = currentUser?.role === 'admin';

  // ── Filters ────────────────────────────────────────────────────────────────
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [filingFilter, setFilingFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');

  // ── Modal state ────────────────────────────────────────────────────────────
  const [invoiceModal, setInvoiceModal] = useState(null);   // filing record
  const [paidModal, setPaidModal] = useState(null);
  const [sunbizModal, setSunbizModal] = useState(null);
  const [filedModal, setFiledModal] = useState(null);
  const [notesModal, setNotesModal] = useState(null);

  // ── Invoice form ───────────────────────────────────────────────────────────
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [ourFee, setOurFee] = useState('50');

  // ── Mark Paid form ─────────────────────────────────────────────────────────
  const [stripePaymentId, setStripePaymentId] = useState('');
  const [paymentDate, setPaymentDate] = useState(TODAY);

  // ── Mark Filed form ────────────────────────────────────────────────────────
  const [filedDate, setFiledDate] = useState(TODAY);
  const [filedBy, setFiledBy] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [filedNotes, setFiledNotes] = useState('');

  // ── Notes inline edit ──────────────────────────────────────────────────────
  const [notesText, setNotesText] = useState('');

  // ── Sunbiz copy ────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ── Initialize ─────────────────────────────────────────────────────────────
  const [isInitializing, setIsInitializing] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const {
    data: filings = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['annualReportFilings', FILING_YEAR],
    queryFn: async () => {
      const entity = base44.entities?.AnnualReportFiling;
      if (!entity) throw new Error('ENTITY_NOT_REGISTERED');
      const all = await entity.list();
      return all.filter((f) => f.filingYear === FILING_YEAR);
    },
    retry: false,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.AnnualReportFiling.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annualReportFilings'] });
    },
    onError: (e) => toast.error(`Update failed: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnnualReportFiling.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annualReportFilings'] });
      toast.success('Record deleted');
    },
    onError: (e) => toast.error(`Delete failed: ${e.message}`),
  });

  // ── Initialize 37 seed records ─────────────────────────────────────────────

  const handleInitialize = async () => {
    const entity = base44.entities?.AnnualReportFiling;
    if (!entity) {
      toast.error('AnnualReportFiling entity not registered in Base44 yet.');
      return;
    }
    setIsInitializing(true);
    try {
      let created = 0;
      for (const seed of SEED_DATA) {
        await entity.create({
          ...seed,
          filingYear: FILING_YEAR,
          filingFee: STATE_FEE,
          paymentStatus: 'Pending',
          filingStatus: 'Not Started',
        });
        created++;
      }
      queryClient.invalidateQueries({ queryKey: ['annualReportFilings'] });
      toast.success(`Initialized ${created} annual report records for ${FILING_YEAR}`);
    } catch (e) {
      toast.error(`Initialization failed: ${e.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  // ── Computed: filters + KPIs ───────────────────────────────────────────────

  const managers = useMemo(() => {
    const names = [...new Set(filings.map((f) => f.manager).filter(Boolean))].sort();
    return names;
  }, [filings]);

  const filteredFilings = useMemo(() => {
    return filings.filter((f) => {
      if (paymentFilter !== 'All' && f.paymentStatus !== paymentFilter) return false;
      if (filingFilter !== 'All' && f.filingStatus !== filingFilter) return false;
      if (managerFilter !== 'All') {
        if (managerFilter === 'Unassigned') return !f.manager;
        if (f.manager !== managerFilter) return false;
      }
      return true;
    });
  }, [filings, paymentFilter, filingFilter, managerFilter]);

  const kpis = useMemo(() => ({
    total: filings.length,
    paid: filings.filter((f) => f.paymentStatus === 'Paid').length,
    filed: filings.filter((f) => f.filingStatus === 'Filed').length,
    pending: filings.filter((f) =>
      f.paymentStatus === 'Pending' || f.paymentStatus === 'Invoice Sent'
    ).length,
  }), [filings]);

  // ── Action handlers ────────────────────────────────────────────────────────

  const openInvoiceModal = (filing) => {
    setInvoiceUrl(filing.stripeInvoiceUrl || '');
    setOurFee(filing.ourFee ? String(filing.ourFee) : '50');
    setInvoiceModal(filing);
  };

  const handleSendInvoice = () => {
    if (!invoiceModal) return;
    updateMutation.mutate(
      {
        id: invoiceModal.id,
        data: {
          paymentStatus: 'Invoice Sent',
          stripeInvoiceUrl: invoiceUrl,
          ourFee: parseFloat(ourFee) || 0,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Invoice recorded for ${invoiceModal.entityName}`);
          setInvoiceModal(null);
        },
      }
    );
  };

  const openPaidModal = (filing) => {
    setStripePaymentId('');
    setPaymentDate(TODAY);
    setPaidModal(filing);
  };

  const handleMarkPaid = () => {
    if (!paidModal) return;
    updateMutation.mutate(
      {
        id: paidModal.id,
        data: {
          paymentStatus: 'Paid',
          filingStatus: 'Ready to File',
          stripePaymentId,
          paymentDate,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${paidModal.entityName} marked as Paid — Ready to File`);
          setPaidModal(null);
        },
      }
    );
  };

  const openSunbizModal = (filing) => {
    setCopied(false);
    setSunbizModal(filing);
    window.open(SUNBIZ_URL, '_blank', 'noopener,noreferrer');
  };

  const handleCopyDocNumber = () => {
    if (!sunbizModal) return;
    navigator.clipboard.writeText(sunbizModal.docNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const openFiledModal = (filing) => {
    setFiledDate(TODAY);
    setFiledBy('');
    setConfirmationNumber('');
    setFiledNotes('');
    setFiledModal(filing);
  };

  const handleMarkFiled = () => {
    if (!filedModal) return;
    updateMutation.mutate(
      {
        id: filedModal.id,
        data: {
          filingStatus: 'Filed',
          filedDate,
          filedBy,
          confirmationNumber,
          notes: filedNotes || filedModal.notes,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${filedModal.entityName} marked as Filed ✓`);
          setFiledModal(null);
        },
      }
    );
  };

  const openNotesModal = (filing) => {
    setNotesText(filing.notes || '');
    setNotesModal(filing);
  };

  const handleSaveNotes = () => {
    if (!notesModal) return;
    updateMutation.mutate(
      { id: notesModal.id, data: { notes: notesText } },
      {
        onSuccess: () => {
          toast.success('Notes saved');
          setNotesModal(null);
        },
      }
    );
  };

  const handleWaive = (filing) => {
    if (!isAdmin) return;
    if (!window.confirm(`Waive filing for ${filing.entityName}?`)) return;
    updateMutation.mutate({ id: filing.id, data: { paymentStatus: 'Waived' } });
  };

  const handleDelete = (filing) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete record for ${filing.entityName}?`)) return;
    deleteMutation.mutate(filing.id);
  };

  // ── Action buttons per row ─────────────────────────────────────────────────

  const renderActions = (f) => {
    const buttons = [];

    if (f.paymentStatus === 'Pending') {
      buttons.push(
        <Button
          key="send-invoice"
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 text-blue-600 border-blue-300 hover:bg-blue-50"
          onClick={() => openInvoiceModal(f)}
        >
          <Send className="w-3 h-3 mr-1" />
          Send Invoice
        </Button>
      );
    }

    if (f.paymentStatus === 'Invoice Sent') {
      buttons.push(
        <Button
          key="mark-paid"
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 text-green-600 border-green-300 hover:bg-green-50"
          onClick={() => openPaidModal(f)}
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Mark Paid
        </Button>
      );
    }

    if (f.paymentStatus === 'Paid' && f.filingStatus === 'Ready to File') {
      buttons.push(
        <Button
          key="open-sunbiz"
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 text-[#003DA5] border-[#003DA5] hover:bg-blue-50"
          onClick={() => openSunbizModal(f)}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Open Sunbiz
        </Button>,
        <Button
          key="mark-filed"
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
          onClick={() => openFiledModal(f)}
        >
          <FileCheck className="w-3 h-3 mr-1" />
          Mark Filed
        </Button>
      );
    }

    if (f.filingStatus === 'Filed') {
      buttons.push(
        <span
          key="filed-label"
          className="text-xs text-green-600 font-medium flex items-center gap-1"
        >
          <Check className="w-3 h-3" />
          Filed {f.filedDate ? formatDate(f.filedDate) : ''}
        </span>
      );
    }

    // Notes — always shown
    buttons.push(
      <Button
        key="notes"
        size="sm"
        variant="ghost"
        className={`h-7 w-7 p-0 ${f.notes ? 'text-amber-500' : 'text-gray-400'} hover:text-amber-600`}
        title="Notes"
        onClick={() => openNotesModal(f)}
      >
        <StickyNote className="w-3.5 h-3.5" />
      </Button>
    );

    // Admin: Waive + Delete
    if (isAdmin && f.paymentStatus !== 'Waived' && f.filingStatus !== 'Filed') {
      buttons.push(
        <Button
          key="waive"
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2 text-gray-400 hover:text-gray-600"
          onClick={() => handleWaive(f)}
        >
          Waive
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-1 flex-wrap min-w-[140px]">
        {buttons}
      </div>
    );
  };

  // ── Entity not registered yet ──────────────────────────────────────────────

  if (queryError?.message === 'ENTITY_NOT_REGISTERED') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-2xl mx-auto mt-6">
        <div className="flex items-start gap-3">
          <Database className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 text-lg mb-2">
              Setup Required — AnnualReportFiling Entity
            </h3>
            <p className="text-amber-800 text-sm mb-4">
              The <code className="bg-amber-100 px-1 rounded">AnnualReportFiling</code> entity
              hasn't been created in your Base44 app yet. Create it first, then come back
              and click Initialize to load the 37 entities.
            </p>
            <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs font-mono text-gray-700 mb-4 space-y-1">
              <p className="font-bold text-amber-800 not-italic text-sm mb-2">Required fields:</p>
              {[
                'entityName — Text',
                'manager — Text',
                'docNumber — Text',
                'entityType — Select (LLC, Corp, Nonprofit)',
                'filingYear — Number',
                'filingFee — Number',
                'ourFee — Number',
                'paymentStatus — Select (Pending, Invoice Sent, Paid, Waived)',
                'stripeInvoiceUrl — Text',
                'stripePaymentId — Text',
                'paymentDate — Date',
                'filingStatus — Select (Not Started, Ready to File, Filed, Error)',
                'filedDate — Date',
                'filedBy — Text',
                'confirmationNumber — Text',
                'notes — Long Text',
              ].map((f) => (
                <p key={f}>• {f}</p>
              ))}
            </div>
            <p className="text-amber-700 text-sm">
              After creating the entity, refresh this page and click <strong>Initialize Data</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading annual report records…
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-8">

      {/* ── Warning Banner ── */}
      <div
        className="rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)' }}
      >
        <AlertTriangle className="w-6 h-6 text-white flex-shrink-0" />
        <div className="text-white">
          <p className="font-bold text-base leading-tight">
            ⚠️ Florida Annual Report Deadline: May 1, 2026
          </p>
          <p className="text-sm opacity-90 mt-0.5">
            Late fee: $138.75 additional after deadline &nbsp;|&nbsp; State fee: $138.75
          </p>
        </div>
      </div>

      {/* ── Initialize / Empty State ── */}
      {filings.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No records found for {FILING_YEAR}.</p>
          <Button
            onClick={handleInitialize}
            disabled={isInitializing}
            className="bg-[#003DA5] hover:bg-[#002d7a] text-white"
          >
            {isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Initializing 37 records…
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Initialize 37 Entity Records
              </>
            )}
          </Button>
        </div>
      )}

      {filings.length > 0 && (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Entities" value={kpis.total} color="blue" />
            <KpiCard label="Paid" value={kpis.paid} color="green" />
            <KpiCard label="Filed" value={kpis.filed} color="green" />
            <KpiCard label="Pending / Invoiced" value={kpis.pending} color="red" />
          </div>

          {/* ── Filter Bar + Export ── */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Payment Status filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Payment:</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['All', 'Pending', 'Invoice Sent', 'Paid', 'Waived'].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Filing Status filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Filing:</label>
              <select
                value={filingFilter}
                onChange={(e) => setFilingFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['All', 'Not Started', 'Ready to File', 'Filed', 'Error'].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Manager filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Manager:</label>
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All</option>
                <option value="Unassigned">Unassigned</option>
                {managers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {filteredFilings.length} of {filings.length} records
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={() => exportCsv(filteredFilings)}
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* ── Main Table ── */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#003DA5] text-white text-left">
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Entity Name</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Manager</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Doc #</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Payment</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Filing</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFilings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400">
                        No records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFilings.map((f, idx) => (
                      <tr
                        key={f.id}
                        className={`border-t border-gray-100 hover:bg-blue-50/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                        } ${f.filingStatus === 'Filed' ? 'opacity-70' : ''}`}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap max-w-[220px] truncate">
                          {f.entityName}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {f.manager || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                          {f.docNumber}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <EntityTypeBadge type={f.entityType} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PaymentBadge status={f.paymentStatus} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <FilingBadge status={f.filingStatus} />
                        </td>
                        <td className="px-4 py-3">
                          {renderActions(f)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
      ═════════════════════════════════════════════════════════════════════ */}

      {/* ── Send Invoice Modal ── */}
      <Dialog open={!!invoiceModal} onOpenChange={() => setInvoiceModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              Send Invoice — {invoiceModal?.entityName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p>State fee: <strong>${STATE_FEE.toFixed(2)}</strong></p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Our Service Fee ($)
              </label>
              <Input
                type="number"
                value={ourFee}
                onChange={(e) => setOurFee(e.target.value)}
                placeholder="50.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Stripe Invoice URL
              </label>
              <Input
                type="url"
                value={invoiceUrl}
                onChange={(e) => setInvoiceUrl(e.target.value)}
                placeholder="https://invoice.stripe.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvoice}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Save &amp; Mark Invoice Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark Paid Modal ── */}
      <Dialog open={!!paidModal} onOpenChange={() => setPaidModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Mark Paid — {paidModal?.entityName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Payment Date
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Stripe Payment ID <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                value={stripePaymentId}
                onChange={(e) => setStripePaymentId(e.target.value)}
                placeholder="pi_..."
              />
            </div>
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700">
              This will set status to <strong>Paid</strong> and <strong>Ready to File</strong>.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkPaid}
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Open Sunbiz Modal ── */}
      <Dialog open={!!sunbizModal} onOpenChange={() => setSunbizModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-[#003DA5]" />
              File on Sunbiz — {sunbizModal?.entityName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p>The <strong>Sunbiz search page</strong> was opened in a new tab.</p>
              <p className="mt-1 opacity-80">Copy the document number below and paste it in the search box on Sunbiz.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Document Number</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 font-mono text-xl font-bold text-gray-900 tracking-widest text-center">
                  {sunbizModal?.docNumber}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDocNumber}
                  className={copied ? 'text-green-600 border-green-400' : ''}
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1" /> Copy</>
                  )}
                </Button>
              </div>
            </div>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Paste the number in the Sunbiz tab</li>
              <li>Click Search, then click your entity name</li>
              <li>Click <strong>File Annual Report</strong> and complete the form</li>
              <li>Return here and click <strong>Mark Filed</strong></li>
            </ol>
            <Button
              variant="outline"
              className="w-full text-[#003DA5] border-[#003DA5] hover:bg-blue-50"
              onClick={() => window.open(SUNBIZ_URL, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Sunbiz Again
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSunbizModal(null)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setSunbizModal(null);
                openFiledModal(sunbizModal);
              }}
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Mark Filed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark Filed Modal ── */}
      <Dialog open={!!filedModal} onOpenChange={() => setFiledModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Mark Filed — {filedModal?.entityName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Filed Date</label>
              <Input
                type="date"
                value={filedDate}
                onChange={(e) => setFiledDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Filed By</label>
              <select
                value={filedBy}
                onChange={(e) => setFiledBy(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select staff…</option>
                {FILING_STAFF.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Sunbiz Confirmation # <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                placeholder="Confirmation number from Sunbiz"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <Textarea
                value={filedNotes}
                onChange={(e) => setFiledNotes(e.target.value)}
                placeholder="Any notes about this filing…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFiledModal(null)}>Cancel</Button>
            <Button
              onClick={handleMarkFiled}
              disabled={updateMutation.isPending || !filedBy}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileCheck className="w-4 h-4 mr-2" />
              )}
              Confirm Filed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Notes Modal ── */}
      <Dialog open={!!notesModal} onOpenChange={() => setNotesModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-amber-500" />
              Notes — {notesModal?.entityName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add internal notes about this filing…"
              rows={5}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesModal(null)}>Cancel</Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
