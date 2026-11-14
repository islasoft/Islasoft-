import React, { useState, useMemo } from 'react';
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

export default function ProjectTimelineView({ projects, onProjectUpdate, onProjectClick, currentUser }) {
  const [timelineStart, setTimelineStart] = useState(startOfMonth(new Date()));
  const [zoomLevel, setZoomLevel] = useState('month'); // day, week, month
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Filter projects by user access
  const visibleProjects = useMemo(() => {
    if (!currentUser) return [];
    return projects.filter(project => {
      const isCreator = project.created_by === currentUser.email;
      const isAssignee = project.assigned_to_id === currentUser.id;
      return isCreator || isAssignee;
    });
  }, [projects, currentUser]);

  // Calculate timeline range
  const timelineEnd = useMemo(() => {
    if (zoomLevel === 'day') return addDays(timelineStart, 30);
    if (zoomLevel === 'week') return addDays(timelineStart, 90);
    return addDays(timelineStart, 180);
  }, [timelineStart, zoomLevel]);

  const timelineDays = useMemo(() => 
    eachDayOfInterval({ start: timelineStart, end: timelineEnd }),
    [timelineStart, timelineEnd]
  );

  const getProjectColor = (project) => {
    if (!currentUser) return 'bg-gray-400';
    const isCreator = project.created_by === currentUser.email;
    const isAssignee = project.assigned_to_id === currentUser.id;
    
    if (isCreator && !isAssignee) return 'bg-gray-400';
    if (isAssignee) {
      return project.status === 'completed' ? 'bg-blue-600' : 'bg-red-500';
    }
    return 'bg-gray-400';
  };

  const getProjectPosition = (project) => {
    if (!project.due_date) return null;
    
    const dueDate = new Date(project.due_date);
    const daysSinceStart = differenceInDays(dueDate, timelineStart);
    
    // Estimate duration based on budget hours or default to 5 days
    const estimatedDays = project.budget_hours ? Math.ceil(project.budget_hours / 8) : 5;
    const startDay = Math.max(0, daysSinceStart - estimatedDays);
    const endDay = daysSinceStart;
    
    if (endDay < 0 || startDay >= timelineDays.length) return null;
    
    return {
      startDay: Math.max(0, startDay),
      endDay: Math.min(endDay, timelineDays.length - 1),
      width: Math.max(1, endDay - startDay)
    };
  };

  const handleDragStart = (e, project) => {
    setDraggedProject(project);
    const position = getProjectPosition(project);
    if (position) {
      const rect = e.currentTarget.getBoundingClientRect();
      const columnWidth = rect.width / position.width;
      setDragOffset(Math.floor((e.clientX - rect.left) / columnWidth));
    }
  };

  const handleDragOver = (e, dayIndex) => {
    e.preventDefault();
    if (draggedProject) {
      const position = getProjectPosition(draggedProject);
      if (position) {
        e.currentTarget.style.backgroundColor = '#e0f2fe';
      }
    }
  };

  const handleDragLeave = (e) => {
    e.currentTarget.style.backgroundColor = '';
  };

  const handleDrop = (e, dayIndex) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';
    
    if (draggedProject) {
      const position = getProjectPosition(draggedProject);
      if (position) {
        const newDueDate = addDays(timelineStart, dayIndex + dragOffset);
        
        onProjectUpdate(draggedProject.id, {
          ...draggedProject,
          due_date: format(newDueDate, 'yyyy-MM-dd')
        });
      }
      setDraggedProject(null);
      setDragOffset(0);
    }
  };

  const navigate = (direction) => {
    const days = zoomLevel === 'day' ? 30 : zoomLevel === 'week' ? 90 : 180;
    setTimelineStart(direction === 'prev' ? addDays(timelineStart, -days) : addDays(timelineStart, days));
  };

  const getColumnWidth = () => {
    if (zoomLevel === 'day') return 'w-16';
    if (zoomLevel === 'week') return 'w-12';
    return 'w-8';
  };

  const getDayLabel = (day, index) => {
    if (zoomLevel === 'day') return format(day, 'd');
    if (zoomLevel === 'week') return index % 7 === 0 ? format(day, 'MMM d') : '';
    return index % 30 === 0 ? format(day, 'MMM') : '';
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(timelineStart, 'MMM yyyy')} - {format(timelineEnd, 'MMM yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={zoomLevel === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel('day')}
            className={zoomLevel === 'day' ? 'bg-blue-600' : ''}
          >
            Day
          </Button>
          <Button
            variant={zoomLevel === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel('week')}
            className={zoomLevel === 'week' ? 'bg-blue-600' : ''}
          >
            Week
          </Button>
          <Button
            variant={zoomLevel === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel('month')}
            className={zoomLevel === 'month' ? 'bg-blue-600' : ''}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header - Timeline dates */}
              <div className="flex border-b-2 border-gray-300 pb-2 mb-4">
                <div className="w-48 flex-shrink-0 font-semibold text-sm">Project</div>
                <div className="flex flex-1">
                  {timelineDays.map((day, index) => (
                    <div
                      key={day.toString()}
                      className={`${getColumnWidth()} flex-shrink-0 text-center border-l border-gray-200`}
                    >
                      <div className="text-xs text-gray-600">
                        {getDayLabel(day, index)}
                      </div>
                      {isSameDay(day, new Date()) && (
                        <div className="w-full h-1 bg-blue-500 mt-1"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              {visibleProjects.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No projects to display</div>
              ) : (
                <div className="space-y-2">
                  {visibleProjects.map(project => {
                    const position = getProjectPosition(project);
                    if (!position) return null;

                    return (
                      <div key={project.id} className="flex items-center group">
                        {/* Project Info */}
                        <div className="w-48 flex-shrink-0 pr-4">
                          <div
                            className="text-sm font-medium truncate cursor-pointer hover:text-blue-600"
                            onClick={() => onProjectClick(project)}
                            title={project.client_name}
                          >
                            {project.client_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate" title={project.description}>
                            {project.project_type?.replace(/_/g, ' ')}
                          </div>
                        </div>

                        {/* Timeline Grid */}
                        <div className="flex flex-1 relative" style={{ height: '48px' }}>
                          {timelineDays.map((day, dayIndex) => (
                            <div
                              key={dayIndex}
                              className={`${getColumnWidth()} flex-shrink-0 border-l border-gray-100 h-full transition-colors`}
                              onDragOver={(e) => handleDragOver(e, dayIndex)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, dayIndex)}
                            />
                          ))}

                          {/* Project Bar */}
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, project)}
                            onDragEnd={() => setDraggedProject(null)}
                            className={`absolute top-2 h-10 rounded-lg ${getProjectColor(project)} text-white cursor-move hover:opacity-90 transition-opacity flex items-center px-2 text-xs font-medium shadow-md`}
                            style={{
                              left: `${(position.startDay / timelineDays.length) * 100}%`,
                              width: `${(position.width / timelineDays.length) * 100}%`,
                              minWidth: '60px'
                            }}
                          >
                            <span className="truncate">
                              {project.client_name}
                            </span>
                            {project.budget_hours && (
                              <span className="ml-auto text-[10px] opacity-80">
                                {project.budget_hours}h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400" />
              <span>Created by You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>Assigned to You (Pending)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-600" />
              <span>Assigned to You (Completed)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-blue-500" />
              <span>Today</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            💡 Drag and drop project bars to reschedule due dates
          </div>
        </CardContent>
      </Card>
    </div>
  );
}