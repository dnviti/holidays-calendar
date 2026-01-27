import React, { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import CalendarHeader from './CalendarHeader';
import HolidayDialog from './HolidayDialog';
import HolidayCreationDialog from './HolidayCreationDialog';
import { Menu, MenuItem, Box, Paper } from '@mui/material';

const CalendarView = ({
  events,
  onDateSelect,
  onEventDrop,
  businessUnitName,
  selectedBusinessUnit,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onApproveEvent,
  onRejectEvent,
  onRequestChange,
  businessUnits = [],
  showEventCreation = false
}) => {
  const calendarRef = useRef(null);
  const [view, setView] = useState('dayGridMonth');
  const [title, setTitle] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, event: null });

  // Update title on mount/change
  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      setTitle(api.view.title);
    }
  }, [events]);

  const handleViewChange = (newView) => {
    const api = calendarRef.current.getApi();
    api.changeView(newView);
    setView(newView);
    setTitle(api.view.title);
  };

  const handlePrev = () => {
    const api = calendarRef.current.getApi();
    api.prev();
    setTitle(api.view.title);
  };

  const handleNext = () => {
    const api = calendarRef.current.getApi();
    api.next();
    setTitle(api.view.title);
  };

  const handleToday = () => {
    const api = calendarRef.current.getApi();
    api.today();
    setTitle(api.view.title);
  };

  const handleEventClick = (clickInfo) => {
    // Prevent default browser context menu
    clickInfo.jsEvent.preventDefault();

    // Handle left click for opening event dialog
    if (clickInfo.jsEvent.button === 0 || clickInfo.jsEvent.type === 'click') {
      setSelectedEvent(clickInfo.event);
    }
  };

  const handleDateSelect = (selectInfo) => {
    // Convert the selected date to a string in YYYY-MM-DD format
    const startDate = selectInfo.start.toISOString().split('T')[0];
    setSelectedDate(startDate);

    // Show the event creation dialog if creation is enabled
    if (showEventCreation) {
      setShowCreateDialog(true);
    }

    // Call the parent handler if provided
    if (onDateSelect) {
      onDateSelect(selectInfo);
    }
  };

  const handleDateRightClick = (selectInfo) => {
    // Prevent default browser context menu
    selectInfo.jsEvent.preventDefault();

    // Show context menu for creating new event
    setContextMenu({
      open: true,
      x: selectInfo.jsEvent.clientX,
      y: selectInfo.jsEvent.clientY,
      event: null,
      date: selectInfo.start
    });
  };

  const handleEventRightClick = (clickInfo) => {
    // Prevent default browser context menu
    clickInfo.jsEvent.preventDefault();

    // Show context menu for existing event
    setContextMenu({
      open: true,
      x: clickInfo.jsEvent.clientX,
      y: clickInfo.jsEvent.clientY,
      event: clickInfo.event,
      date: null
    });
  };

  const handleContextMenuAction = (action) => {
    setContextMenu({ open: false, x: 0, y: 0, event: null });

    if (contextMenu.event) {
      // Action on existing event
      switch(action) {
        case 'edit':
          setSelectedEvent(contextMenu.event);
          break;
        case 'delete':
          if (onDeleteEvent && window.confirm('Are you sure you want to delete this event?')) {
            onDeleteEvent(contextMenu.event.id);
          }
          break;
        case 'duplicate':
          // Duplicate the event
          const duplicatedEvent = {
            ...contextMenu.event,
            id: null, // Generate new ID
            title: `${contextMenu.event.title} (Copy)`
          };
          if (onCreateEvent) {
            onCreateEvent(duplicatedEvent);
          }
          break;
        default:
          break;
      }
    } else if (contextMenu.date) {
      // Action on date (create new event)
      switch(action) {
        case 'create':
          const startDate = contextMenu.date.toISOString().split('T')[0];
          setSelectedDate(startDate);
          setShowCreateDialog(true);
          break;
        default:
          break;
      }
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ open: false, x: 0, y: 0, event: null });
  };

  const handleCreateEventSuccess = (newEvent) => {
    if (onCreateEvent) {
      onCreateEvent(newEvent);
    }
    setShowCreateDialog(false);
  };

  const handleUpdateEventSuccess = (updatedEvent) => {
    if (onUpdateEvent) {
      onUpdateEvent(updatedEvent);
    }
    setSelectedEvent(null);
  };

  const handleEventResize = (resizeInfo) => {
    if (onEventDrop) {
      onEventDrop(resizeInfo);
    }
  };

  // Handle date right-click for context menu
  useEffect(() => {
    const calendarEl = calendarRef.current;
    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      // Add right-click listener to the calendar body
      const handleCalendarRightClick = (e) => {
        e.preventDefault();

        // Find the date from the clicked element
        const dateCell = e.target.closest('.fc-daygrid-day, .fc-timegrid-slot, .fc-list-event');
        if (dateCell) {
          // Get the date from the cell
          let dateStr = null;

          // For day grid view
          if (dateCell.classList.contains('fc-daygrid-day')) {
            dateStr = dateCell.getAttribute('data-date');
          }

          // For time grid view (slots)
          if (!dateStr) {
            const slotDate = dateCell.getAttribute('data-date');
            if (slotDate) {
              dateStr = slotDate;
            }
          }

          if (dateStr) {
            const date = new Date(dateStr);
            setContextMenu({
              open: true,
              x: e.clientX,
              y: e.clientY,
              event: null,
              date: date
            });
          }
        }
      };

      // Add the event listener when the calendar is mounted
      // Wait for the calendar to render, then attach the event listener
      setTimeout(() => {
        const calendarDOMNode = calendarEl?.el || calendarEl?.container;
        if (calendarDOMNode) {
          const calendarContainer = calendarDOMNode.querySelector('.fc-view-harness');
          if (calendarContainer) {
            calendarContainer.addEventListener('contextmenu', handleCalendarRightClick);
          }
        }
      }, 0);

      // Cleanup function
      return () => {
        const calendarDOMNode = calendarEl?.el || calendarEl?.container;
        if (calendarDOMNode) {
          const calendarContainer = calendarDOMNode.querySelector('.fc-view-harness');
          if (calendarContainer) {
            calendarContainer.removeEventListener('contextmenu', handleCalendarRightClick);
          }
        }
      };
    }
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CalendarHeader
        title={title}
        view={view}
        onViewChange={handleViewChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      <Paper
        elevation={1}
        sx={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: 2,
          p: 0
        }}
      >
        <Box sx={{ height: '100%', '& .fc': { height: '100%' } }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={false}
            initialView="dayGridMonth"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            events={events}
            select={handleDateSelect}
            dateClick={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={onEventDrop}
            eventResize={handleEventResize}
            selectAllow={(selectInfo) => {
              return true;
            }}
            nowIndicator={true}
            height="100%"
            contentHeight="auto"
            aspectRatio={1.8}
            datesSet={(arg) => setTitle(arg.view.title)}
            firstDay={1}
            fixedWeekCount={false}
            showNonCurrentDates={true}
            eventContent={(eventInfo) => {
              // Apply business unit color if available
              const eventColor = eventInfo.event.backgroundColor || eventInfo.event.extendedProps.color;
              const isAllDay = eventInfo.event.allDay || eventInfo.event.extendedProps?.is_all_day;
              const status = eventInfo.event.extendedProps?.status; // For holiday status
              const eventCategory = eventInfo.event.extendedProps?.category || 'event';

              // Add visual indicator for unapproved/pending events
              const isPending = status === 'pending';
              const isRejected = status === 'rejected';
              const isChangeRequested = status === 'change_requested';

              // Determine border color based on status
              let borderColor = '';
              if (isPending) borderColor = '#F59E0B'; // Amber for pending
              else if (isRejected) borderColor = '#EF4444'; // Red for rejected
              else if (isChangeRequested) borderColor = '#F97316'; // Orange for change requested

              return (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    width: '100%',
                    overflow: 'hidden',
                    fontSize: '0.75rem',
                    backgroundColor: eventColor ? `${eventColor}20` : undefined,
                    borderLeft: borderColor ? `3px solid ${borderColor}` : 'none',
                    fontWeight: isPending ? 'bold' : 'normal',
                    opacity: isRejected ? 0.6 : 1
                  }}
                >
                  {(isPending || isRejected || isChangeRequested) && (
                    <Box
                      component="span"
                      sx={{ fontSize: '0.75rem' }}
                      title={
                        isPending ? "Pending approval" :
                        isRejected ? "Rejected" :
                        "Change requested"
                      }
                    >
                      {isPending && '⏳'}
                      {isRejected && '❌'}
                      {isChangeRequested && '📝'}
                    </Box>
                  )}
                  <Box
                    component="span"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 500,
                      color: 'white'
                    }}
                  >
                    {eventInfo.event.title}
                  </Box>
                </Box>
              );
            }}
            eventDidMount={(info) => {
              // Add right-click listener to event elements
              info.el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleEventRightClick({
                  jsEvent: e,
                  event: info.event
                });
              });
            }}
          />
        </Box>
      </Paper>

      {/* Context Menu */}
      <Menu
        open={contextMenu.open}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu.open ? { top: contextMenu.y, left: contextMenu.x } : undefined
        }
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu from reopening
      >
        {contextMenu.event ? (
          // Context menu for existing leave request
          <>
            <MenuItem onClick={() => handleContextMenuAction('edit')}>
              View Details
            </MenuItem>
            <MenuItem onClick={() => handleContextMenuAction('delete')}>
              Cancel Request
            </MenuItem>
          </>
        ) : (
          // Context menu for date (create new leave request)
          <MenuItem onClick={() => handleContextMenuAction('create')}>
            Create Leave Request
          </MenuItem>
        )}
      </Menu>

      <HolidayDialog
        open={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onUpdate={handleUpdateEventSuccess}
        onDelete={onDeleteEvent}
        onApprove={onApproveEvent}
        onReject={onRejectEvent}
        onRequestChange={onRequestChange}
        businessUnits={businessUnits}
      />

      {showEventCreation && (
        <HolidayCreationDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleCreateEventSuccess}
          selectedDate={selectedDate}
          businessUnits={businessUnits}
          selectedBusinessUnit={selectedBusinessUnit}
        />
      )}
    </Box>
  );
};

export default CalendarView;
