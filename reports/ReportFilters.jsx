import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportFilters({ 
  filters, 
  onFilterChange, 
  clients = [], 
  projects = [], 
  users = [],
  showClientFilter = true,
  showProjectFilter = true,
  showUserFilter = true,
  showDateRange = true,
  onClearFilters
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {showDateRange && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(new Date(filters.startDate), 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate ? new Date(filters.startDate) : undefined}
                      onSelect={(date) => onFilterChange({ ...filters, startDate: date ? format(date, 'yyyy-MM-dd') : null })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(new Date(filters.endDate), 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.endDate ? new Date(filters.endDate) : undefined}
                      onSelect={(date) => onFilterChange({ ...filters, endDate: date ? format(date, 'yyyy-MM-dd') : null })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {showClientFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Client</label>
              <Select
                value={filters.clientId || 'all'}
                onValueChange={(value) => onFilterChange({ ...filters, clientId: value === 'all' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showProjectFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select
                value={filters.projectId || 'all'}
                onValueChange={(value) => onFilterChange({ ...filters, projectId: value === 'all' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.client_name} - {project.project_type?.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showUserFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select
                value={filters.userId || 'all'}
                onValueChange={(value) => onFilterChange({ ...filters, userId: value === 'all' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {onClearFilters && (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}