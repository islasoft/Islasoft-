import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, Check } from 'lucide-react';

function MultiSelect({ label, options, selected = [], onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else onChange([...selected, value]);
  };

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label || selected[0]
      : `${selected.length} selected`;

  return (
    <div className="space-y-2" ref={ref}>
      <Label>{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm text-left"
        >
          <span className={selected.length === 0 ? 'text-muted-foreground' : ''}>{displayText}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-56 overflow-y-auto">
            {options.map(opt => (
              <div
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(opt.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {selected.includes(opt.value) && <Check className="w-3 h-3 text-white" />}
                </div>
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectStatusFilters({ clients, users = [], filters, onFilterChange, onClearFilters }) {
  const statusOptions = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ];

  const clientOptions = clients.map(c => ({ value: c.id, label: c.company_name || c.name || c.email }));
  const userOptions = users.map(u => ({ value: u.id, label: u.full_name || u.email }));

  const hasFilters = (filters.clients?.length > 0) || (filters.statuses?.length > 0) ||
    (filters.assignedTos?.length > 0) || filters.dueDateFrom || filters.dueDateTo;

  return (
    <Card className="bg-gray-50">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MultiSelect
            label="Client"
            options={clientOptions}
            selected={filters.clients || []}
            onChange={(val) => onFilterChange({ ...filters, clients: val })}
            placeholder="All Clients"
          />
          <MultiSelect
            label="Status"
            options={statusOptions}
            selected={filters.statuses || []}
            onChange={(val) => onFilterChange({ ...filters, statuses: val })}
            placeholder="All Statuses"
          />
          <MultiSelect
            label="Assigned To"
            options={userOptions}
            selected={filters.assignedTos || []}
            onChange={(val) => onFilterChange({ ...filters, assignedTos: val })}
            placeholder="All Staff"
          />
          <div className="space-y-2">
            <Label htmlFor="dueDateFrom">Due Date From</Label>
            <Input
              id="dueDateFrom"
              type="date"
              value={filters.dueDateFrom || ''}
              onChange={(e) => onFilterChange({ ...filters, dueDateFrom: e.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDateTo">Due Date To</Label>
            <Input
              id="dueDateTo"
              type="date"
              value={filters.dueDateTo || ''}
              onChange={(e) => onFilterChange({ ...filters, dueDateTo: e.target.value || null })}
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}