/**
 * Booking Calendar Component
 * Uses react-day-picker v9 for date selection
 * Fetches available time slots from server
 * Prevents double-booking with RLS constraints
 */

"use client";

import { useState, useTransition } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, addDays, startOfToday } from "date-fns";
import { Clock, AlertCircle } from "lucide-react";
import { getAvailableSlots, bookAppointment, rescheduleAppointment } from "@/actions/appointments";
import { cn } from "@/lib/utils";
import { Pet, Vet } from "@/lib/types";

interface BookingCalendarProps {
  pet: Pet;
  vet: Vet;
  onSuccess?: (appointmentId: string) => void;
  mode?: "book" | "reschedule";
  appointmentId?: string;
  className?: string;
}

export function BookingCalendar({
  pet,
  vet,
  onSuccess,
  mode = "book",
  appointmentId,
  className,
}: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState("");

  // Minimum date: tomorrow, maximum: 30 days from now
  const today = startOfToday();
  const minDate = addDays(today, 1);
  const maxDate = addDays(today, 30);

  // Fetch available slots when date changes
  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
    setAvailableSlots([]);
    setSlotsError("");

    if (!date) return;

    setSlotsLoading(true);
    try {
      const dateString = format(date, "yyyy-MM-dd");
      const result = await getAvailableSlots(vet.profile_id, dateString);

      if (result.success) {
        setAvailableSlots(result.data);
        if (result.data.length === 0) {
          setSlotsError("No available slots for this date. Please try another.");
        }
      } else {
        setSlotsError(result.error || "Failed to fetch available slots");
      }
    } catch (error) {
      setSlotsError("Error fetching available slots");
      console.error(error);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      setSubmitError("Please select a date and time");
      return;
    }

    setSubmitError("");

    startTransition(async () => {
      try {
        const result =
          mode === "reschedule" && appointmentId
            ? await rescheduleAppointment({
                appointment_id: appointmentId,
                appointment_time: selectedTime,
                notes: notes || undefined,
              })
            : await bookAppointment({
                pet_id: pet.id,
                vet_id: vet.profile_id,
                appointment_time: selectedTime,
                notes: notes || undefined,
              });

        if (result.success) {
          setSelectedDate(undefined);
          setSelectedTime("");
          setNotes("");
          onSuccess?.(result.data.id);
        } else {
          setSubmitError(result.error || "Failed to book appointment");
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Failed to book appointment"
        );
      }
    });
  };

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-IN").format(value);

  return (
    <div className={cn("glass-card p-6", className)}>
      <h3 className="font-display text-lg text-slate-900 mb-4">Book Appointment</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vet & Pet Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-white/80 rounded-2xl border border-white/70">
          <div>
            <p className="text-xs text-slate-500">Pet</p>
            <p className="font-medium text-sm text-slate-900">{pet.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Vet Clinic</p>
            <p className="font-medium text-sm text-slate-900">{vet.clinic_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Consultation Fee</p>
            <p className="font-medium text-sm text-slate-900">
              ₹{formatMoney(vet.consultation_fee_inr)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Specialization</p>
            <p className="font-medium text-sm text-slate-900">
              {vet.specialization || "General"}
            </p>
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <label className="block text-sm font-medium mb-3 text-slate-700">Select Date</label>
          <div className="border border-white/70 rounded-2xl p-4 bg-white/90">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < minDate || date > maxDate}
              showOutsideDays={false}
              className="w-full"
            />
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Available from {format(minDate, "MMM dd")} to{" "}
            {format(maxDate, "MMM dd, yyyy")}
          </p>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div>
            <label className="block text-sm font-medium mb-3 text-slate-700">
              Select Time{" "}
              {slotsLoading && <span className="text-xs text-slate-500">(loading...)</span>}
            </label>

            {slotsError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{slotsError}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTime(slot)}
                  disabled={slotsLoading}
                  className={cn(
                    "p-2 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1",
                    selectedTime === slot
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 text-slate-700 hover:border-primary hover:bg-orange-50"
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {format(new Date(slot), "HH:mm")}
                </button>
              ))}
            </div>

            {availableSlots.length === 0 && !slotsLoading && (
              <p className="text-sm text-slate-600 text-center py-4">
                No available slots for this date
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., vaccine due, skin condition to show vet..."
            className="w-full p-3 border border-slate-200 rounded-2xl text-sm placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Error */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedDate || !selectedTime || isPending}
          className={cn(
            "w-full py-3 px-4 rounded-full text-white font-medium transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300",
            selectedDate && selectedTime && !isPending
              ? "bg-slate-900 hover:bg-slate-800"
              : ""
          )}
        >
          {isPending ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Booking...
            </>
          ) : (
            mode === "reschedule" ? "Reschedule Appointment" : "Confirm Booking"
          )}
        </button>

        <p className="text-xs text-slate-600 text-center">
          Payment will be required after booking confirmation
        </p>
      </form>
    </div>
  );
}
