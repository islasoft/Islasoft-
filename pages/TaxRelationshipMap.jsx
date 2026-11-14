import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Building2, User, ArrowRight, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight, Info } from 'lucide-react';

// Determine filing order based on entity type
function getFilingOrder(client) {
  if (!client.incorporated_as) return { form: '1040', order: 99, label: 'Personal Return' };
  const ia = client.incorporated_as;
  const ta = client.taxed_as || '';
  if (ia === 'Nonprofit') return { form: '990', order: 1, label: 'Nonprofit Return' };
  if (ia === 'Partnership') return { form: '1065', order: 2, label: 'Partnership Return' };
  if (ia === 'S-Corp' || ta === 'S-Corporation') return { form: '1120-S', order: 2, label: 'S-Corp Return' };
  if (ia === 'Corporation' || ta === 'C-Corporation') return { form: '1120', order: 1, label: 'C-Corp Return' };
  if (ia === 'LLC') {
    if (ta === 'S-Corporation') return { form: '1120-S', order: 2, label: 'LLC (S-Corp Election)' };
    if (ta === 'Partnership') return { form: '1065', order: 2, label: 'LLC (Partnership)' };
    return { form: '1065/Sch C', order: 2, label: 'LLC Return' };
  }
  return { form: '1040', order: 99, label: 'Personal Return' };
}

const FORM_COLORS = {
  '1040': 'bg-sky-100 text-sky-700 border-sky-200',
  '1120': 'bg-violet-100 text-violet-700 border-violet-200',
  '1120-S': 'bg-amber-100 text-amber-700 border-amber-200',
  '1065': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '990': 'bg-rose-100 text-rose-700 border-rose-200',
  '1065/Sch C': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'LLC (S-Corp Election)': 'bg-amber-100 text-amber-700 border-amber-200',
};

function getFormColor(form) {
  return FORM_COLORS[form] || 'bg-slate-100 text-slate-600 border-slate-200';
}

// Build relationship graph: individual -> entities they're contact of
function buildRelationships(allClients) {
  const individuals = allClients.filter(c => !c.incorporated_as || c.incorporated_as === 'Sole Proprietorship');
  const entities = allClients.filter(c => c.incorporated_as && c.incorporated_as !== 'Sole Proprietorship');

  // Only link by shared client_number prefix (e.g. I-001 owns E-001a)
  // No name-based guessing — only show what the data explicitly tells us
  const groups = individuals.map(ind => {
    return { individual: ind, entities: [] };
  });

  // Also include entities with no linked individual
  const linkedEntityIds = new Set(groups.flatMap(g => g.entities.map(e => e.id)));
  const orphanEntities = entities.filter(e => !linkedEntityIds.has(e.id));

  return { groups, orphanEntities };
}

function FilingChainBadge({ filingInfo }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getFormColor(filingInfo.form)}`}>
      {filingInfo.form}
    </span>
  );
}

function FilingOrderStep({ step, client, isLast }) {
  const fi = getFilingOrder(client);
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {step}
        </div>
        {!isLast && <div className="w-0.5 h-4 bg-slate-300 mt-1" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{client.company_name || `${client.name || ''} ${client.last_name || ''}`.trim()}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <FilingChainBadge filingInfo={fi} />
          <span className="text-xs text-slate-500">{fi.label}</span>
        </div>
      </div>
    </div>
  );
}

function ClientGroupCard({ individual, entities, search }) {
  const [expanded, setExpanded] = useState(true);
  const indFiling = getFilingOrder(individual);

  // Sort entities by filing order (lower = must be prepared first)
  const sortedEntities = [...entities].sort((a, b) => getFilingOrder(a).order - getFilingOrder(b).order);

  // Build the filing chain: entities first (sorted), then individual last
  const filingChain = [...sortedEntities, individual];

  const indName = `${individual.name || ''} ${individual.last_name || ''}`.trim() || individual.company_name;

  // Filter by search
  if (search) {
    const s = search.toLowerCase();
    const matches = indName.toLowerCase().includes(s) || entities.some(e => (e.company_name || '').toLowerCase().includes(s));
    if (!matches) return null;
  }

  return (
    <Card className="overflow-hidden border-slate-200">
      <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800 text-sm">{indName}</span>
              <FilingChainBadge filingInfo={indFiling} />
              {entities.length > 0 && (
                <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                  {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
                </Badge>
              )}
            </div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 space-y-4">
          {/* Linked Entities */}
          {entities.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Linked Entities</p>
              <div className="space-y-2">
                {sortedEntities.map(ent => {
                  const fi = getFilingOrder(ent);
                  return (
                    <div key={ent.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 bg-white">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{ent.company_name}</p>
                        <p className="text-xs text-slate-400">{ent.incorporated_as} {ent.taxed_as ? `→ taxed as ${ent.taxed_as}` : ''}</p>
                      </div>
                      <FilingChainBadge filingInfo={fi} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filing Order */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended Filing Order</p>
              <Info className="w-3 h-3 text-slate-400" />
            </div>
            {filingChain.length === 1 ? (
              <p className="text-xs text-slate-400 italic">No linked entities — file personal return only.</p>
            ) : (
              <div className="space-y-2 pl-1">
                {filingChain.map((c, i) => (
                  <FilingOrderStep key={c.id} step={i + 1} client={c} isLast={i === filingChain.length - 1} />
                ))}
              </div>
            )}
          </div>

          {/* Warning if individual 1040 depends on entity K-1s */}
          {sortedEntities.some(e => ['1065', '1120-S', '1065/Sch C'].includes(getFilingOrder(e).form)) && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>K-1s from entity returns must be completed before the personal 1040 can be filed.</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function OrphanEntityCard({ entity }) {
  const fi = getFilingOrder(entity);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{entity.company_name}</p>
        <p className="text-xs text-slate-400">{entity.incorporated_as}{entity.contact_person ? ` · ${entity.contact_person}` : ''}</p>
      </div>
      <FilingChainBadge filingInfo={fi} />
    </div>
  );
}

export default function TaxRelationshipMap() {
  const [search, setSearch] = useState('');

  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { groups, orphanEntities } = useMemo(() => buildRelationships(allClients), [allClients]);

  const filteredGroups = useMemo(() => {
    if (!search) return groups;
    const s = search.toLowerCase();
    return groups.filter(g => {
      const indName = `${g.individual.name || ''} ${g.individual.last_name || ''}`.trim() || g.individual.company_name || '';
      return indName.toLowerCase().includes(s) || g.entities.some(e => (e.company_name || '').toLowerCase().includes(s));
    });
  }, [groups, search]);

  const filteredOrphans = useMemo(() => {
    if (!search) return orphanEntities;
    const s = search.toLowerCase();
    return orphanEntities.filter(e => (e.company_name || '').toLowerCase().includes(s));
  }, [orphanEntities, search]);

  const totalWithEntities = groups.filter(g => g.entities.length > 0).length;

  const formSummary = useMemo(() => {
    const counts = {};
    allClients.forEach(c => {
      const f = getFilingOrder(c).form;
      counts[f] = (counts[f] || 0) + 1;
    });
    return counts;
  }, [allClients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tax Relationship Map</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visualize how individuals and entities relate and determine the correct filing order</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(formSummary).sort().map(([form, count]) => (
          <div key={form} className="bg-white rounded-lg border border-slate-200 p-4 text-center shadow-sm">
            <div className={`inline-flex px-2.5 py-1 rounded-full text-sm font-bold border mb-1 ${getFormColor(form)}`}>{form}</div>
            <p className="text-2xl font-bold text-slate-800">{count}</p>
            <p className="text-xs text-slate-500 mt-0.5">clients</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 items-center p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
        <span className="font-semibold text-slate-600 uppercase tracking-wide">Filing order logic:</span>
        <span className="flex items-center gap-1"><span className={`px-2 py-0.5 rounded-full border font-semibold ${getFormColor('1065')}`}>1065</span> Partnership — must file first</span>
        <ArrowRight className="w-3 h-3 text-slate-400" />
        <span className="flex items-center gap-1"><span className={`px-2 py-0.5 rounded-full border font-semibold ${getFormColor('1120-S')}`}>1120-S</span> S-Corp — file before 1040</span>
        <ArrowRight className="w-3 h-3 text-slate-400" />
        <span className="flex items-center gap-1"><span className={`px-2 py-0.5 rounded-full border font-semibold ${getFormColor('1040')}`}>1040</span> Personal — always last</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by individual or company name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading client relationships...</div>
      ) : (
        <div className="space-y-8">
          {/* Individuals with linked entities */}
          {filteredGroups.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                Individuals & Their Entities
                <Badge variant="outline" className="text-xs">{filteredGroups.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredGroups.map(g => (
                  <ClientGroupCard
                    key={g.individual.id}
                    individual={g.individual}
                    entities={g.entities}
                    search={search}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Orphan entities (no linked individual found) */}
          {filteredOrphans.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                Business Entities
                <Badge variant="outline" className="text-xs">{filteredOrphans.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredOrphans.map(e => (
                  <OrphanEntityCard key={e.id} entity={e} />
                ))}
              </div>
            </div>
          )}

          {filteredGroups.length === 0 && filteredOrphans.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No results found for "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}