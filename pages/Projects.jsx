import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Users, Calendar, Sparkles } from 'lucide-react';
import PageHeader from '../components/mobile/PageHeader';
import PullToRefresh from '../components/mobile/PullToRefresh';
import { createPageUrl } from '../utils';
import ProjectAssistantDialog from '../components/projects/ProjectAssistantDialog';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, 
  addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks,
  addDays, subDays, startOfQuarter, endOfQuarter, addQuarters, subQuarters,
  startOfYear, endOfYear, addYears, subYears, eachWeekOfInterval, eachMonthOfInterval,
  isSameWeek, isWithinInterval
} from 'date-fns';
import { formatDate } from '@/lib/utils';
import ProjectForm from '../components/projects/ProjectForm';

import ProjectTimelineView from '../components/projects/ProjectTimelineView';
import BulkProjectDialog from '../components/projects/BulkProjectDialog';
import ProjectProgressDashboard from '../components/projects/ProjectProgressDashboard';
import { toast } from 'sonner';

export default function Projects() {
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // day, week, month, quarter, year, timeline, dashboard
  const [showForm, setShowForm] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showProjectAssistant, setShowProjectAssistant] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        return await base44.entities.Project.list('-created_date');
      } catch (error) {
        console.error('Error loading projects:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        return await base44.entities.Client.list();
      } catch (error) {
        console.error('Error loading clients:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (error) {
        console.error('Error loading team members:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('editProject');
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setEditingProject(project);
        setShowForm(true);
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [location, projects]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onMutate: async (newProject) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData(['projects']);
      
      queryClient.setQueryData(['projects'], (old = []) => [
        { ...newProject, id: 'temp-' + Date.now() },
        ...old
      ]);
      
      return { previousProjects };
    },
    onError: (error, newProject, context) => {
      queryClient.setQueryData(['projects'], context.previousProjects);
      toast.error('Failed to create project');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingProject(null);
      toast.success('Project saved');
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (projects) => {
      return await base44.entities.Project.bulkCreate(projects);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowBulkDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to create projects');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData(['projects']);
      
      queryClient.setQueryData(['projects'], (old = []) =>
        old.map((project) => (project.id === id ? { ...project, ...data } : project))
      );
      
      return { previousProjects };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['projects'], context.previousProjects);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onSuccess: () => {
      setShowForm(false);
      setEditingProject(null);
      toast.success('Project updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  const syncToCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncProjectsToCalendar', {});
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || `Synced ${data.eventsCreated} project(s) to Google Calendar`);
    },
    onError: (error) => {
      toast.error('Failed to sync to Google Calendar');
    },
  });

  const handleSubmit = (data) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      // Check if data is an array (recurring projects)
      if (Array.isArray(data)) {
        bulkCreateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    }
  };

  const getViewData = () => {
    if (view === 'day') {
      return { start: currentDate, end: currentDate };
    } else if (view === 'week') {
      return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
    } else if (view === 'month') {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    } else if (view === 'quarter') {
      return { start: startOfQuarter(currentDate), end: endOfQuarter(currentDate) };
    } else if (view === 'year') {
      return { start: startOfYear(currentDate), end: endOfYear(currentDate) };
    }
  };

  const navigate = (direction) => {
    const factor = direction === 'prev' ? -1 : 1;
    if (view === 'day') {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else if (view === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (view === 'quarter') {
      setCurrentDate(direction === 'prev' ? subQuarters(currentDate, 1) : addQuarters(currentDate, 1));
    } else if (view === 'year') {
      setCurrentDate(direction === 'prev' ? subYears(currentDate, 1) : addYears(currentDate, 1));
    }
  };

  const getProjectsForDay = (day) => {
    return projects.filter(project => {
      if (!project.due_date) return false;
      
      try {
        const dueDate = new Date(project.due_date);
        if (isNaN(dueDate.getTime())) return false;
        
        return isSameDay(day, dueDate);
      } catch {
        return false;
      }
    });
  };

  const getProjectsForPeriod = (start, end) => {
    return projects.filter(project => {
      if (!project.due_date) return false;
      
      try {
        const dueDate = new Date(project.due_date);
        if (isNaN(dueDate.getTime())) return false;
        
        return isWithinInterval(dueDate, { start, end });
      } catch {
        return false;
      }
    });
  };

  const getProjectColor = (project) => {
    if (!currentUser) return 'bg-gray-200 text-gray-800';
    
    const isCreator = project.created_by === currentUser.email;
    const isAssignee = project.assigned_to_id === currentUser.id;
    
    // Creator view: gray color
    if (isCreator && !isAssignee) {
      return 'bg-gray-400 text-white';
    }
    
    // Assignee view: red until complete, then royal blue
    if (isAssignee) {
      if (project.status === 'completed') {
        return 'bg-blue-600 text-white'; // Royal blue
      }
      return 'bg-red-500 text-white'; // Red
    }
    
    return 'bg-gray-200 text-gray-800';
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
    await queryClient.invalidateQueries({ queryKey: ['team'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <PageHeader title="Projects" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 hidden md:block">Projects Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base hidden md:block">View and manage projects by timeline</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowProjectAssistant(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Project Assistant
            </Button>
            <Button
              onClick={() => syncToCalendarMutation.mutate()}
              variant="outline"
              disabled={syncToCalendarMutation.isPending}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {syncToCalendarMutation.isPending ? 'Syncing...' : 'Sync to Calendar'}
            </Button>
            {currentUser && (currentUser.role === 'admin' || currentUser.team_category === 'cpa' || currentUser.team_category === 'senior_staff') && (
              <>
                <Button
                  onClick={() => setShowBulkDialog(true)}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Bulk Create
                </Button>
                <Button
                  onClick={() => {
                    setEditingProject(null);
                    setShowForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </>
            )}
          </div>
      </div>

      {showForm && (
        <ProjectForm
          project={editingProject}
          clients={clients}
          teamMembers={teamMembers}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingProject(null);
          }}
        />
      )}

      {showBulkDialog && (
        <BulkProjectDialog
          open={showBulkDialog}
          onClose={() => setShowBulkDialog(false)}
          clients={clients}
          teamMembers={teamMembers}
          onSubmit={(projects) => bulkCreateMutation.mutate(projects)}
        />
      )}

      <ProjectAssistantDialog
        open={showProjectAssistant}
        onOpenChange={setShowProjectAssistant}
      />



      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            {/* View Selector */}
            <div className="flex gap-2 flex-wrap">
              {['dashboard', 'day', 'week', 'month', 'quarter', 'year', 'timeline'].map((v) => (
                <Button
                  key={v}
                  variant={view === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView(v)}
                  className={view === v ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Button>
              ))}
            </div>

            {/* Navigation */}
            {view !== 'dashboard' && view !== 'timeline' && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-lg sm:text-2xl">
                  {view === 'day' && format(currentDate, 'MMMM d, yyyy')}
                  {view === 'week' && `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
                  {view === 'month' && format(currentDate, 'MMMM yyyy')}
                  {view === 'quarter' && `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${format(currentDate, 'yyyy')}`}
                  {view === 'year' && format(currentDate, 'yyyy')}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <ProjectProgressDashboard projects={projects} />
          )}

          {/* Timeline View */}
          {view === 'timeline' && (
            <ProjectTimelineView
              projects={projects}
              onProjectUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onProjectClick={(project) => window.location.href = createPageUrl('ProjectDetails') + '?id=' + project.id}
              currentUser={currentUser}
            />
          )}

          {/* Day View */}
          {view === 'day' && (() => {
            const dayProjects = getProjectsForDay(currentDate);
            return (
              <div className="space-y-2">
                {dayProjects.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No projects due on this day</p>
                ) : (
                  dayProjects.map(project => (
                    <a
                      key={project.id}
                      href={createPageUrl('ProjectDetails') + '?id=' + project.id}
                      className={`p-4 rounded-lg cursor-pointer hover:opacity-80 transition-opacity block ${
                        getProjectColor(project)
                      }`}
                    >
                      <div className="font-medium">{project.client_name}</div>
                      <div className="text-sm">{project.project_type?.replace(/_/g, ' ')}</div>
                    </a>
                  ))
                )}
              </div>
            );
          })()}

          {/* Week View */}
          {view === 'week' && (() => {
            const weekStart = startOfWeek(currentDate);
            const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate) });
            return (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const dayProjects = getProjectsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toString()} className={`border rounded p-2 min-h-32 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                      <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                        {format(day, 'EEE d')}
                      </div>
                      <div className="space-y-1">
                        {dayProjects.map(project => (
                          <a
                            key={project.id}
                            href={createPageUrl('ProjectDetails') + '?id=' + project.id}
                            className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 truncate block ${
                              getProjectColor(project)
                            }`}
                            title={`${project.client_name} - ${project.project_type?.replace(/_/g, ' ')}`}
                          >
                            {project.client_name}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Month View */}
          {view === 'month' && (() => {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
            return (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-xs sm:text-sm text-gray-600 py-1 sm:py-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-16 sm:min-h-24 border rounded bg-gray-50" />
                ))}
                {daysInMonth.map(day => {
                  const dayProjects = getProjectsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toString()}
                      className={`min-h-16 sm:min-h-24 border rounded p-1 sm:p-2 ${
                        isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                      } ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}`}
                    >
                      <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        {dayProjects.slice(0, 2).map(project => (
                          <a
                            key={project.id}
                            href={createPageUrl('ProjectDetails') + '?id=' + project.id}
                            className={`text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate block ${
                              getProjectColor(project)
                            }`}
                            title={`${project.client_name} - ${project.project_type?.replace(/_/g, ' ')}`}
                          >
                            <span className="hidden sm:inline">{project.client_name} - {project.project_type?.replace(/_/g, ' ')}</span>
                            <span className="sm:hidden">{project.client_name}</span>
                          </a>
                        ))}
                        {dayProjects.length > 2 && (
                          <div className="text-[10px] sm:text-xs text-gray-500 px-1 sm:px-2">
                            +{dayProjects.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Quarter View */}
          {view === 'quarter' && (() => {
            const quarterStart = startOfQuarter(currentDate);
            const quarterEnd = endOfQuarter(currentDate);
            const months = eachMonthOfInterval({ start: quarterStart, end: quarterEnd });
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {months.map(month => {
                  const monthStart = startOfMonth(month);
                  const monthEnd = endOfMonth(month);
                  const monthProjects = getProjectsForPeriod(monthStart, monthEnd);
                  return (
                    <div key={month.toString()} className="border rounded p-4">
                      <div className="font-medium text-lg mb-3">{format(month, 'MMMM')}</div>
                      <div className="space-y-2">
                        {monthProjects.length === 0 ? (
                          <p className="text-sm text-gray-500">No projects</p>
                        ) : (
                          monthProjects.map(project => (
                            <a
                              key={project.id}
                              href={createPageUrl('ProjectDetails') + '?id=' + project.id}
                              className={`text-sm px-3 py-2 rounded cursor-pointer hover:opacity-80 block ${
                                getProjectColor(project)
                              }`}
                            >
                              <div className="font-medium">{project.client_name}</div>
                              <div className="text-xs">{formatDate(project.due_date)}</div>
                            </a>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Year View */}
          {view === 'year' && (() => {
            const yearStart = startOfYear(currentDate);
            const yearEnd = endOfYear(currentDate);
            const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {months.map(month => {
                  const monthStart = startOfMonth(month);
                  const monthEnd = endOfMonth(month);
                  const monthProjects = getProjectsForPeriod(monthStart, monthEnd);
                  return (
                    <div key={month.toString()} className="border rounded p-3">
                      <div className="font-medium mb-2">{format(month, 'MMMM')}</div>
                      <div className="text-2xl font-bold text-blue-600">{monthProjects.length}</div>
                      <div className="text-xs text-gray-500">projects</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Legend */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-gray-400" />
              <span className="text-xs sm:text-sm text-gray-600">Created by You</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-500" />
              <span className="text-xs sm:text-sm text-gray-600">Assigned to You (Pending)</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-600" />
              <span className="text-xs sm:text-sm text-gray-600">Assigned to You (Completed)</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </PullToRefresh>
  );
}