import React, { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import CalendarHeader from './CalendarHeader';
import EventDialog from './EventDialog';

const CalendarView = ({ events, onDateSelect, onEventDrop, businessUnitName }) => {
  const calendarRef = useRef(null);
  const [view, setView] = useState('dayGridMonth');
  const [title, setTitle] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

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
    setSelectedEvent(clickInfo.event);
  };

  return (
    <div className="h-full flex flex-col">
      <CalendarHeader
        title={title}
        view={view}
        onViewChange={handleViewChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      <div className="flex-1 card p-0 overflow-hidden border border-border">
        {/* FullCalendar wrapper to enforce consistent styling via index.css */}
        <div className="h-full fc-theme-standard">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={false}
            initialView="dayGridMonth"
            editable={!!onEventDrop}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            events={events}
            select={onDateSelect}
            eventClick={handleEventClick}
            eventDrop={onEventDrop}
            height="100%"
            datesSet={(arg) => setTitle(arg.view.title)}
            eventContent={(eventInfo) => (
              <div className="flex items-center gap-1 px-1 w-full overflow-hidden text-xs">
                <span className="truncate font-medium text-white">
                  {eventInfo.event.title}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      <EventDialog
        open={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};

export default CalendarView;
