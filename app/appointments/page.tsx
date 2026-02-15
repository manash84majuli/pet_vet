/**
 * Appointments Page
 * Book, view, and manage veterinary appointments
 * Integrated with Razorpay payment
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, CheckCircle, Sparkles } from "lucide-react";
import { AppointmentWithDetails, VetWithProfile, Pet } from "@/lib/types";
import { BookingCalendar } from "@/components/BookingCalendar";
import {
  cancelAppointment,
  getUserAppointments,
  getVets,
  getUserPets,
} from "@/actions/appointments";

// Module-level mock data removed. Fetched using server actions.


type BookingStep = "select-vet" | "select-pet" | "calendar" | "payment" | "success";

export default function AppointmentsPage() {
  const [step, setStep] = useState<BookingStep>("select-vet");
  const [selectedVet, setSelectedVet] = useState<VetWithProfile | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [userAppointments, setUserAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [vets, setVets] = useState<VetWithProfile[]>([]);
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentWithDetails | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-IN").format(value);

  const upcomingAppointments = useMemo(
    () =>
      userAppointments.filter(
        (appt) =>
          new Date(appt.appointment_time) > new Date() &&
          appt.status !== "cancelled"
      ),
    [userAppointments]
  );

  useEffect(() => {
    async function loadData() {
      try {
        const [vetsRes, petsRes, apptsRes] = await Promise.all([
            getVets(),
            getUserPets(),
            getUserAppointments()
        ]);
        
        if (vetsRes.success) setVets(vetsRes.data);
        if (petsRes.success) setUserPets(petsRes.data);
        if (apptsRes.success) setUserAppointments(apptsRes.data);
      } catch (err) {
        console.error("Failed to load appointment data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshAppointments = async () => {
    const apptsRes = await getUserAppointments();
    if (apptsRes.success) {
      setUserAppointments(apptsRes.data);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Cancel this appointment?")) return;

    setIsWorking(true);
    setActionStatus(null);
    const result = await cancelAppointment(appointmentId);
    if (result.success) {
      await refreshAppointments();
      setActionStatus("Appointment cancelled.");
    } else {
      setActionStatus(result.error || "Failed to cancel appointment");
    }
    setIsWorking(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f4ef] pb-24 md:pb-0 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="h-10 w-10 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-wide uppercase">
            Loading appointments
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f4ef] pb-24 md:pb-0">
      <section className="hero-surface">
        <div className="container py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Personalized care
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-slate-900">
                Appointments
              </h1>
              <p className="text-slate-600 max-w-xl">
                Book, reschedule, and track visits with your preferred vet.
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 px-5 py-4 text-center shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Upcoming
              </p>
              <p className="font-display text-2xl text-slate-900">
                {upcomingAppointments.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-8 space-y-8">
        {/* Booking Wizard - Only show if not in success state */}
        {step !== "success" && (
          <div className="glass-card p-6">
            {/* Step Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              {[
                { step: "select-vet" as const, label: "Select Vet" },
                { step: "select-pet" as const, label: "Select Pet" },
                { step: "calendar" as const, label: "Pick Date & Time" },
                { step: "payment" as const, label: "Payment" },
              ].map((s, idx) => (
                <div
                  key={s.step}
                  className="flex items-center gap-3 flex-1 min-w-[220px]"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                      step === s.step
                        ? "bg-slate-900 text-white"
                        : ["select-vet", "select-pet", "calendar", "payment"].indexOf(
                            step
                          ) > idx
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step === s.step ? "text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {s.label}
                  </span>
                  {idx < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        ["select-vet", "select-pet", "calendar", "payment"].indexOf(step) >
                        idx
                          ? "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Select Vet */}
            {step === "select-vet" && (
              <div>
                <h2 className="font-display text-lg text-slate-900 mb-4">
                  Choose a Veterinarian
                </h2>
                <div className="space-y-4">
                  {vets.map((vet) => (
                    <button
                      key={vet.id}
                      onClick={() => {
                        setSelectedVet(vet);
                        setStep("select-pet");
                      }}
                      className="w-full p-4 border border-white/70 rounded-2xl bg-white/90 hover:border-primary transition-colors text-left shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={vet.profile.avatar_url || "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400"}
                          alt={vet.profile.full_name}
                          className="w-16 h-16 rounded-2xl object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{vet.profile.full_name}</h3>
                          <p className="text-sm text-slate-600">{vet.specialization || "General Veterinarian"}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {vet.clinic_name} • {vet.address}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                              Rating: New
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                vet.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {vet.is_active ? "Accepting bookings" : "Unavailable"}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              ₹{formatMoney(vet.consultation_fee_inr)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Pet */}
            {step === "select-pet" && selectedVet && (
              <div>
                <h2 className="font-display text-lg text-slate-900 mb-4">
                  Which pet needs attention?
                </h2>
                <div className="space-y-3">
                  {userPets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => {
                        setSelectedPet(pet);
                        setStep("calendar");
                      }}
                      className="w-full p-4 border border-white/70 rounded-2xl bg-white/90 hover:border-primary transition-colors text-left flex items-center gap-4"
                    >
                      <img
                        src={pet.photo_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400"}
                        alt={pet.name}
                        className="w-12 h-12 rounded-2xl object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{pet.name}</h3>
                        <p className="text-sm text-slate-600">
                          {pet.breed} • {pet.species}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setStep("select-vet")}
                  className="mt-4 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  ← Back
                </button>
              </div>
            )}

            {/* Step 3: Calendar */}
            {step === "calendar" && selectedVet && selectedPet && (
              <div>
                <h2 className="font-display text-lg text-slate-900 mb-4">
                  Choose appointment date & time
                </h2>
                <BookingCalendar
                  vet={selectedVet}
                  pet={selectedPet}
                  onSuccess={() => setStep("success")}
                />
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {step === "success" && (
          <div className="glass-card p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-emerald-900 mb-2">
              Appointment Booked Successfully!
            </h2>
            <p className="text-emerald-700 mb-6">
              Your appointment confirmation has been sent to your email
            </p>
            <div className="space-y-2 text-left bg-white rounded-2xl p-4 mb-6 border border-white/70">
              <p className="text-slate-600">
                <span className="font-semibold">Vet:</span> {selectedVet?.profile.full_name}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold">Pet:</span> {selectedPet?.name}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold">Fee:</span> ₹{formatMoney(selectedVet?.consultation_fee_inr || 0)}
              </p>
            </div>
            <button
              onClick={() => {
                setStep("select-vet");
                setSelectedVet(null);
                setSelectedPet(null);
              }}
              className="px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors font-medium"
            >
              Book Another Appointment
            </button>
          </div>
        )}

        {/* Upcoming Appointments */}
        {actionStatus && (
          <div className="glass-card p-3 text-sm text-slate-700">{actionStatus}</div>
        )}

        {upcomingAppointments.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="font-display text-lg text-slate-900 mb-4">
              Upcoming Appointments
            </h2>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border border-white/70 rounded-2xl bg-white/90"
                >
                  <div className="flex flex-wrap items-start gap-4 p-4">
                    <Calendar className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {appointment.vet.profile.full_name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {appointment.vet.clinic_name} • {appointment.pet.name}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            appointment.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(appointment.appointment_time).toLocaleDateString()} at{" "}
                          {new Date(appointment.appointment_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {appointment.notes && (
                          <p className="flex items-start gap-2">
                            <span className="mt-1">Notes:</span>
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAppointment((prev) =>
                              prev === appointment.id ? null : appointment.id
                            )
                          }
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                        >
                          {expandedAppointment === appointment.id
                            ? "Hide details"
                            : "View details"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRescheduleTarget(appointment)}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelAppointment(appointment.id)}
                          disabled={isWorking}
                          className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                  {expandedAppointment === appointment.id && (
                    <div className="border-t border-white/70 px-4 py-4 text-sm text-slate-600">
                      <div className="grid gap-2 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Vet
                          </p>
                          <p className="font-semibold text-slate-900">
                            {appointment.vet.profile.full_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Clinic
                          </p>
                          <p className="font-semibold text-slate-900">
                            {appointment.vet.clinic_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Payment
                          </p>
                          <p className="font-semibold text-slate-900">
                            {appointment.payment_status}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {userAppointments.length === 0 && step === "select-vet" && (
          <div className="bg-white/80 rounded-2xl p-12 text-center border border-white/70">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 font-semibold">No upcoming appointments</p>
            <p className="text-slate-500 text-sm mt-1">
              Book a consultation with a veterinarian now
            </p>
          </div>
        )}

        {rescheduleTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-end md:items-center z-50">
            <div className="glass-card w-full md:max-w-3xl rounded-t-2xl md:rounded-2xl p-6 md:mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Reschedule appointment
                  </p>
                  <h2 className="font-display text-xl text-slate-900">
                    {rescheduleTarget.vet.profile.full_name} · {rescheduleTarget.pet.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
              <BookingCalendar
                vet={rescheduleTarget.vet}
                pet={rescheduleTarget.pet}
                mode="reschedule"
                appointmentId={rescheduleTarget.id}
                onSuccess={async () => {
                  await refreshAppointments();
                  setRescheduleTarget(null);
                  setActionStatus("Appointment rescheduled.");
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
