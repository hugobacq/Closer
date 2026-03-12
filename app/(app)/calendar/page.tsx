"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

type Event = {
  id: string;
  couple_id: string;
  created_by_user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
};

type ModalState = {
  isOpen: boolean;
  event: Partial<Event> | null; 
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal d'ajout/edition
  const [modal, setModal] = useState<ModalState>({ isOpen: false, event: null });
  const [editTitle, setEditTitle] = useState("");
  const [editAllDay, setEditAllDay] = useState(false);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("10:00");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Couple ID
    const { data: member } = await supabase
      .from("couple_members").select("couple_id").eq("user_id", user.id).single();
    if (member) setCoupleId(member.couple_id);

    // Load Events - on limite au mois +/- 1 par exemple, ou tout pour le MVP
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      // .gte("start_at", startOfMonth(currentMonth).toISOString())
      // .lte("end_at", endOfMonth(currentMonth).toISOString())
      .order("start_at", { ascending: true });
    
    if (eventsData) setEvents(eventsData as Event[]);
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    loadData();

    window.addEventListener("app:refresh_data", loadData);
    return () => window.removeEventListener("app:refresh_data", loadData);
  }, [loadData]);

  // Helpers Calendar
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const onDateClick = (day: Date) => setSelectedDate(day);

  // Événements du jour sélectionné
  const selectedDayEvents = events.filter((e) => {
    const eventDate = parseISO(e.start_at);
    return isSameDay(eventDate, selectedDate);
  });

  // Gérer l'ouverture du modal
  function openModal(event: Event | null = null) {
    if (event) {
      setEditTitle(event.title);
      setEditAllDay(event.is_all_day);
      setEditNotes(event.description || "");
      const dStart = parseISO(event.start_at);
      const dEnd = parseISO(event.end_at);
      setEditStartTime(format(dStart, "HH:mm"));
      setEditEndTime(format(dEnd, "HH:mm"));
    } else {
      setEditTitle("");
      setEditAllDay(false);
      setEditNotes("");
      setEditStartTime("09:00");
      setEditEndTime("10:00");
    }
    setModal({ isOpen: true, event });
  }

  async function saveEvent() {
    if (!editTitle.trim() || !coupleId || !userId) return;
    setSaving(true);
    
    // Construire les dates
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startStr = editAllDay ? "00:00" : editStartTime;
    const endStr = editAllDay ? "23:59" : editEndTime;
    
    // Heure locale à ISO
    const startAt = new Date(`${dateStr}T${startStr}:00`).toISOString();
    const endAt = new Date(`${dateStr}T${endStr}:00`).toISOString();

    const payload = {
      couple_id: coupleId,
      created_by_user_id: userId,
      title: editTitle.trim(),
      description: editNotes.trim() || null,
      is_all_day: editAllDay,
      start_at: startAt,
      end_at: endAt,
    };

    const supabase = createClient();
    if (modal.event?.id) {
      // Update
      await supabase.from("events").update(payload).eq("id", modal.event.id);
    } else {
      // Insert
      await supabase.from("events").insert(payload);
    }

    await loadData(); // Recharger la liste
    setModal({ isOpen: false, event: null });
    setSaving(false);
  }

  async function deleteEvent(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    const supabase = createClient();
    await supabase.from("events").delete().eq("id", id);
    await loadData();
    setModal({ isOpen: false, event: null });
  }

  // --- RENDER GRID ---
  function renderHeader() {
    return (
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} className="p-2 text-stone-400 hover:bg-stone-100 rounded-full transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-lg font-bold text-stone-800 capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h2>
        <button onClick={nextMonth} className="p-2 text-stone-400 hover:bg-stone-100 rounded-full transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    );
  }

  function renderDaysOfWeek() {
    const days = ["L", "M", "M", "J", "V", "S", "D"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-stone-400 uppercase tracking-widest">{d}</div>
        ))}
      </div>
    );
  }

  function renderCells() {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Commence lundi
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        
        // Pastilles des événements
        const dayEvents = events.filter(e => isSameDay(parseISO(e.start_at), cloneDay));
        const hasMyEvent = dayEvents.some(e => e.created_by_user_id === userId);
        const hasPartnerEvent = dayEvents.some(e => e.created_by_user_id !== userId);

        days.push(
          <div
            key={day.toISOString()}
            onClick={() => onDateClick(cloneDay)}
            className={`relative flex flex-col items-center justify-center p-2 h-14 cursor-pointer transition-all ${
              !isCurrentMonth ? "text-stone-300" : isSelected ? "text-stone-800" : "text-stone-600 font-medium"
            }`}
          >
            {/* Cercles background */}
            {isSelected && <div className="absolute inset-2 bg-stone-100 rounded-xl -z-10" />}
            {isToday && !isSelected && <div className="absolute inset-3 border-2 border-rose-200 rounded-full -z-10" />}
            
            <span className={isSelected || isToday ? "font-bold" : ""}>{formattedDate}</span>
            
            {/* Dots */}
            <div className="flex gap-1 mt-1 absolute bottom-2">
              {hasMyEvent && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
              {hasPartnerEvent && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toISOString()}>{days}</div>);
      days = [];
    }
    return <div>{rows}</div>;
  }

  return (
    <div className="min-h-screen pb-28 pt-8 px-4 bg-[#FDF8F5]">
      {/* Header global */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Calendrier 📅</h1>
        <button onClick={() => openModal()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-stone-800 hover:bg-stone-50 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {/* Calendrier visuel */}
      <div className="bg-white rounded-3xl p-5 shadow-sm mb-6">
        {renderHeader()}
        {renderDaysOfWeek()}
        {renderCells()}
      </div>

      {/* Liste des événements du jour sélectionné */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4 px-2">
          {isSameDay(selectedDate, new Date()) ? "Aujourd'hui" : format(selectedDate, "EEEE d MMMM", { locale: fr })}
        </p>
        
        {selectedDayEvents.length === 0 ? (
          <div className="bg-white/50 border border-stone-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-2 opacity-50">🍃</span>
            <p className="text-stone-400 text-sm">Rien de prévu à cette date.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayEvents.map(event => {
              const isMine = event.created_by_user_id === userId;
              // Couleurs selon proprio
              const bgClass = isMine ? "bg-blue-50" : "bg-rose-50";
              const textClass = isMine ? "text-blue-500" : "text-rose-500";
              const titleClass = isMine ? "text-blue-900" : "text-rose-900";
              
              const startFormatted = format(parseISO(event.start_at), "HH:mm");
              const endFormatted = format(parseISO(event.end_at), "HH:mm");

              return (
                <div 
                  key={event.id}
                  onClick={() => openModal(event)}
                  className={`${bgClass} rounded-2xl p-4 flex gap-4 cursor-pointer active:scale-[0.98] transition-all`}
                >
                  {/* Timeline logic */}
                  <div className={`w-14 flex-shrink-0 flex flex-col items-center justify-center ${textClass} font-semibold text-sm`}>
                    {event.is_all_day ? (
                      <span className="text-xs">Jour entier</span>
                    ) : (
                      <>
                        <span>{startFormatted}</span>
                        <div className={`w-px h-3 my-0.5 ${isMine ? "bg-blue-200" : "bg-rose-200"}`} />
                        <span className="text-xs opacity-70">{endFormatted}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${titleClass} truncate`}>{event.title}</p>
                    {event.description && (
                      <p className={`text-sm mt-0.5 ${textClass} opacity-80 line-clamp-2`}>{event.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer Ajouter / Modifier */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:px-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6 sm:hidden" />
            
            <h2 className="text-xl font-bold text-stone-800 mb-6">
              {modal.event ? "Modifier l'événement" : "Nouvel événement"}
            </h2>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Titre de l'événement"
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-800 font-medium placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-semibold text-stone-600">Toute la journée</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editAllDay} onChange={e => setEditAllDay(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>

              {!editAllDay && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-stone-400 uppercase tracking-widest block mb-1 px-1">Début</label>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={e => setEditStartTime(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 focus:outline-none focus:border-stone-300 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-stone-400 uppercase tracking-widest block mb-1 px-1">Fin</label>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={e => setEditEndTime(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 focus:outline-none focus:border-stone-300 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <textarea
                  placeholder="Notes (optionnel)"
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-300 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={saveEvent}
                disabled={!editTitle.trim() || saving}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all ${
                  !editTitle.trim() || saving ? "bg-rose-300" : "bg-rose-500 hover:bg-rose-600 active:scale-[0.98]"
                }`}
              >
                {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
              
              <div className="flex gap-3">
                <button onClick={() => setModal({ isOpen: false, event: null })} className="flex-1 py-3 text-stone-500 font-semibold hover:bg-stone-50 rounded-xl transition-colors">
                  Annuler
                </button>
                {modal.event && (
                  <button onClick={() => deleteEvent(modal.event!.id)} className="flex-1 py-3 text-red-500 font-semibold hover:bg-red-50 rounded-xl transition-colors">
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
