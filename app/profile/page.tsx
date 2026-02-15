/**
 * Profile Page
 * User profile, pet management, and account settings
 */

"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  LifeBuoy,
  LogOut,
  MapPin,
  PawPrint,
  Phone,
  Plus,
  Trash2,
  User,
  Edit2,
} from "lucide-react";
import {
  getUserProfile,
  getUserPets,
  updateProfile,
  addPet,
  updatePet,
  deletePet,
} from "@/actions/profile";
import { useAuth } from "@/lib/auth-context";
import { createBrowserClient } from "@/lib/supabase";
import { Profile, Pet, Gender } from "@/lib/types";

export default function ProfilePage() {
  const { logout } = useAuth();
  const supabase = useMemo(() => createBrowserClient(), []);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const petPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingPetPhoto, setIsUploadingPetPhoto] = useState(false);
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [petForm, setPetForm] = useState({
    name: "",
    species: "Dog",
    breed: "",
    age_years: "",
    gender: Gender.MALE,
    weight_kg: "",
    medical_history: "",
    photo_url: "",
  });

  const formatMonthYear = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, petsRes] = await Promise.all([
          getUserProfile(),
          getUserPets(),
        ]);

        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data);
          setProfileForm({
            full_name: profileRes.data.full_name,
            email: "", // Not available in profile table
            phone: profileRes.data.phone,
            address: profileRes.data.city || "",
          });
        }

        if (petsRes.success && petsRes.data) {
          setPets(petsRes.data);
        }
      } catch (error) {
        console.error("Failed to load profile data", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleProfileUpdate = async () => {
    if (!profile) return;
    
    try {
      const res = await updateProfile({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        city: profileForm.address, // Mapping address to city for now
      });

      if (res.success && res.data) {
        setProfile(res.data);
        setEditingProfile(false);
      }
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  const resetPetForm = () => {
    setPetForm({
      name: "",
      species: "Dog",
      breed: "",
      age_years: "",
      gender: Gender.MALE,
      weight_kg: "",
      medical_history: "",
      photo_url: "",
    });
    setEditingPet(null);
  };

  const openEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setPetForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || "",
      age_years: pet.age_years !== undefined ? pet.age_years.toString() : "",
      gender: pet.gender || Gender.MALE,
      weight_kg: pet.weight_kg !== undefined ? pet.weight_kg.toString() : "",
      medical_history: pet.medical_notes || "",
      photo_url: pet.photo_url || "",
    });
    setShowAddPetModal(true);
  };

  const handleAddPet = async () => {
    try {
      setIsSavingPet(true);
      const age = petForm.age_years ? parseFloat(petForm.age_years) : undefined;
      const weight = petForm.weight_kg ? parseFloat(petForm.weight_kg) : undefined;

      const res = await addPet({
        name: petForm.name,
        species: petForm.species,
        breed: petForm.breed,
        age_years: age,
        gender: petForm.gender,
        weight_kg: weight,
        medical_notes: petForm.medical_history,
        photo_url: petForm.photo_url || undefined,
      });

      if (res.success && res.data) {
        setPets([...pets, res.data]);
        setShowAddPetModal(false);
        resetPetForm();
      }
    } catch (error) {
      console.error("Failed to add pet", error);
    } finally {
      setIsSavingPet(false);
    }
  };

  const handleUpdatePet = async () => {
    if (!editingPet) return;

    try {
      setIsSavingPet(true);
      const age = petForm.age_years ? parseFloat(petForm.age_years) : undefined;
      const weight = petForm.weight_kg ? parseFloat(petForm.weight_kg) : undefined;

      const res = await updatePet(editingPet.id, {
        name: petForm.name,
        species: petForm.species,
        breed: petForm.breed,
        age_years: age,
        gender: petForm.gender,
        weight_kg: weight,
        medical_notes: petForm.medical_history,
        photo_url: petForm.photo_url || undefined,
      });

      if (res.success && res.data) {
        setPets((prev) => prev.map((pet) => (pet.id === res.data.id ? res.data : pet)));
        setShowAddPetModal(false);
        resetPetForm();
      }
    } catch (error) {
      console.error("Failed to update pet", error);
    } finally {
      setIsSavingPet(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("Only JPG, PNG, or WebP images are allowed.");
      event.target.value = "";
      return;
    }
    
    if (file.size > MAX_SIZE) {
      setStatus("Image must be under 2 MB.");
      event.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    setStatus(null);

    try {
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${profile.id}/${Date.now()}.${extension}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, cacheControl: "3600" });

      if (error) {
        console.error("Avatar upload error:", error);
        throw error;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const result = await updateProfile({ avatar_url: data.publicUrl });

      if (result.success && result.data) {
        setProfile(result.data);
        setStatus("Profile photo updated.");
      } else {
        setStatus("Profile update failed.");
      }
    } catch (error) {
      console.error("Avatar upload failed", error);
      const msg = error instanceof Error ? error.message : "Photo upload failed.";
      setStatus(msg.includes("Bucket not found") 
        ? "Storage bucket 'avatars' not configured. Please create it in Supabase Dashboard → Storage."
        : msg.includes("security") || msg.includes("policy") || msg.includes("row-level")
        ? "Permission denied. Check storage RLS policies in Supabase."
        : `Photo upload failed: ${msg}`);
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handlePetPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("Only JPG, PNG, or WebP images are allowed.");
      event.target.value = "";
      return;
    }
    
    if (file.size > MAX_SIZE) {
      setStatus("Image must be under 2 MB.");
      event.target.value = "";
      return;
    }

    setIsUploadingPetPhoto(true);
    setStatus(null);

    try {
      const safeName = file.name.replace(/\s+/g, "-");
      const filePath = `${profile.id}/${Date.now()}_${safeName}`;

      const { error } = await supabase.storage
        .from("pet-photos")
        .upload(filePath, file, { upsert: true, cacheControl: "3600" });

      if (error) {
        console.error("Pet photo upload error:", error);
        throw error;
      }

      const { data } = supabase.storage.from("pet-photos").getPublicUrl(filePath);
      setPetForm((prev) => ({ ...prev, photo_url: data.publicUrl }));
      setStatus("Pet photo uploaded.");
    } catch (error) {
      console.error("Pet photo upload failed", error);
      const msg = error instanceof Error ? error.message : "Pet photo upload failed.";
      setStatus(msg.includes("Bucket not found")
        ? "Storage bucket 'pet-photos' not configured. Please create it in Supabase Dashboard → Storage."
        : msg.includes("security") || msg.includes("policy") || msg.includes("row-level")
        ? "Permission denied. Check storage RLS policies in Supabase."
        : `Pet photo upload failed: ${msg}`);
    } finally {
      setIsUploadingPetPhoto(false);
      event.target.value = "";
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!confirm("Are you sure you want to delete this pet?")) {
      return;
    }

    const res = await deletePet(petId);
    if (res.success) {
      setPets((prev) => prev.filter((pet) => pet.id !== petId));
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Logout failed", error);
      }
    } finally {
      // Full page redirect to clear all cached state and cookies
      window.location.href = "/login";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f4ef] pb-24 md:pb-0 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="h-10 w-10 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
            <User className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-wide uppercase">
            Loading profile
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f4ef] pb-24 md:pb-0">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-white/70">
        <div className="container py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Account</p>
            <h1 className="font-display text-2xl text-slate-900">Profile</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:text-primary"
            >
              <ClipboardList className="h-4 w-4" />
              Orders
            </Link>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              {editingProfile ? "Close edit" : "Edit profile"}
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {profile && (
          <div className="glass-card overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-[#ffb36b] via-[#ffd1a0] to-[#9ee7d2]" />
            <div className="px-6 pb-6 -mt-12 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                <div className="flex flex-col items-start gap-3">
                  <div className="h-24 w-24 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-slate-500" />
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:text-primary disabled:opacity-60"
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? "Uploading..." : "Upload photo"}
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-2xl text-slate-900">
                      {profile.full_name}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {profile.role}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1">
                      <Phone className="h-4 w-4 text-slate-600" />
                      {profile.phone || "Phone not set"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1">
                      <MapPin className="h-4 w-4 text-slate-600" />
                      {profile.city || "City not set"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1">
                      Member since {formatMonthYear(profile.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {status && (
                <p className="text-sm text-slate-600">{status}</p>
              )}

              {editingProfile ? (
                <form className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, full_name: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full rounded-xl border border-white/70 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                      Address
                    </label>
                    <textarea
                      value={profileForm.address}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, address: e.target.value })
                      }
                      rows={3}
                      className="w-full rounded-xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleProfileUpdate}
                      className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Phone
                    </p>
                    <p className="text-slate-900 font-semibold">
                      {profile.phone || "Not added"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">
                      City / State
                    </p>
                    <p className="text-slate-900 font-semibold">
                      {profile.city || "-"} {profile.state ? `· ${profile.state}` : ""}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">
                      Member since
                    </p>
                    <p className="text-slate-900 font-semibold">
                      {formatMonthYear(profile.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="font-display text-xl text-slate-900 flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-primary" />
              My Pets
            </h2>
            <button
              onClick={() => {
                resetPetForm();
                setShowAddPetModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add pet
            </button>
          </div>

          {pets.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <PawPrint className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p>No pets added yet</p>
              <p className="text-sm">Create a profile to keep records organized.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className="rounded-2xl border border-white/70 bg-white/90 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {pet.photo_url ? (
                    <img
                      src={pet.photo_url}
                      alt={pet.name}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-[#ffe7c7] via-[#f5f3ef] to-[#dff2eb] flex items-center justify-center">
                      <PawPrint className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-display text-lg text-slate-900">
                        {pet.name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {pet.breed || "Mixed"} · {pet.species}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Age: {pet.age_years ? `${Math.round(pet.age_years)} yrs` : "-"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Weight: {typeof pet.weight_kg === "number" ? `${pet.weight_kg} kg` : "-"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Gender: {pet.gender}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Health: {pet.medical_notes ? "Notes" : "-"}
                      </span>
                    </div>
                    {pet.medical_notes && (
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">Notes:</span> {pet.medical_notes}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditPet(pet)}
                        className="flex-1 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePet(pet.id)}
                        className="rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/orders"
            className="glass-card p-5 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <ClipboardList className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-slate-900">Orders</p>
              <p className="text-sm text-slate-500">Track deliveries & receipts</p>
            </div>
          </Link>
          <Link
            href="/appointments"
            className="glass-card p-5 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-slate-900">Appointments</p>
              <p className="text-sm text-slate-500">Upcoming visits & history</p>
            </div>
          </Link>
          <a
            href="mailto:support@petvet.com"
            className="glass-card p-5 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <LifeBuoy className="w-6 h-6 text-slate-700" />
            <div>
              <p className="font-semibold text-slate-900">Support</p>
              <p className="text-sm text-slate-500">We respond within 4 minutes</p>
            </div>
          </a>
        </div>

        <button
          onClick={handleLogout}
          className="w-full rounded-2xl border border-red-100 bg-red-50 py-3 text-red-600 font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>

      {showAddPetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center z-50">
          <div className="glass-card w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 md:mx-auto">
            <h2 className="font-display text-xl text-slate-900 mb-4">
              {editingPet ? "Edit pet" : "Add a pet"}
            </h2>
            <form className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
                  {petForm.photo_url ? (
                    <img
                      src={petForm.photo_url}
                      alt="Pet"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PawPrint className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <input
                    ref={petPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePetPhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => petPhotoInputRef.current?.click()}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:text-primary disabled:opacity-60"
                    disabled={isUploadingPetPhoto}
                  >
                    {isUploadingPetPhoto ? "Uploading..." : "Upload photo"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Pet Name
                </label>
                <input
                  type="text"
                  value={petForm.name}
                  onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
                  placeholder="e.g., Max"
                  className="w-full rounded-xl border border-white/70 bg-white px-4 py-2 text-sm text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Species
                  </label>
                  <select
                    value={petForm.species}
                    onChange={(e) =>
                      setPetForm({ ...petForm, species: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Bird</option>
                    <option>Rabbit</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Gender
                  </label>
                  <select
                    value={petForm.gender}
                    onChange={(e) =>
                      setPetForm({ ...petForm, gender: e.target.value as Gender })
                    }
                    className="w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Breed
                </label>
                <input
                  type="text"
                  value={petForm.breed}
                  onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                  placeholder="e.g., Golden Retriever"
                  className="w-full rounded-xl border border-white/70 bg-white px-4 py-2 text-sm text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={petForm.age_years}
                    onChange={(e) =>
                      setPetForm({ ...petForm, age_years: e.target.value })
                    }
                    placeholder="0.0"
                    className="w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={petForm.weight_kg}
                    onChange={(e) =>
                      setPetForm({ ...petForm, weight_kg: e.target.value })
                    }
                    placeholder="0.0"
                    className="w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Medical History
                </label>
                <textarea
                  value={petForm.medical_history}
                  onChange={(e) =>
                    setPetForm({ ...petForm, medical_history: e.target.value })
                  }
                  placeholder="e.g., Vaccinated, No known allergies"
                  rows={2}
                  className="w-full rounded-xl border border-white/70 bg-white px-4 py-2 text-sm text-slate-800"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={editingPet ? handleUpdatePet : handleAddPet}
                  className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
                  disabled={isSavingPet}
                >
                  {isSavingPet
                    ? "Saving..."
                    : editingPet
                      ? "Save changes"
                      : "Add pet"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPetModal(false);
                    resetPetForm();
                  }}
                  className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:text-primary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
