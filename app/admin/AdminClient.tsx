"use client";

import { useMemo, useState, useTransition } from "react";
import { updateUserRole, updateVetStatus } from "@/actions/admin";
import { Profile, UserRole, VetWithProfile } from "@/lib/types";

interface AdminClientProps {
  profiles: Profile[];
  vets: VetWithProfile[];
}

export default function AdminClient({ profiles, vets }: AdminClientProps) {
  const [items, setItems] = useState(profiles);
  const [vetItems, setVetItems] = useState(vets);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const roleOptions = useMemo(
    () => [
      UserRole.CUSTOMER,
      UserRole.VET,
      UserRole.STORE_MANAGER,
      UserRole.ADMIN,
    ],
    []
  );

  const handleRoleChange = (id: string, role: UserRole) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, role } : item))
    );
  };

  const handleSave = (profileId: string) => {
    const current = items.find((item) => item.id === profileId);
    if (!current) return;

    setStatus(null);
    startTransition(async () => {
      const result = await updateUserRole(profileId, current.role);
      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setItems((prev) =>
        prev.map((item) => (item.id === profileId ? result.data : item))
      );
      setStatus("Role updated.");
    });
  };

  const handleVetToggle = (vetId: string, isActive: boolean) => {
    setVetItems((prev) =>
      prev.map((vet) => (vet.id === vetId ? { ...vet, is_active: isActive } : vet))
    );

    setStatus(null);
    startTransition(async () => {
      const result = await updateVetStatus(vetId, isActive);
      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setVetItems((prev) =>
        prev.map((vet) => (vet.id === vetId ? result.data : vet))
      );
      setStatus("Vet status updated.");
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Module</h1>
          <p className="text-gray-600 mt-2">Manage user roles</p>
        </header>

        {status && (
          <div className="mb-6 p-3 rounded-lg bg-white shadow text-sm text-gray-700">
            {status}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((profile) => (
                <tr key={profile.id} className="text-gray-700">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {profile.full_name}
                    </div>
                    <div className="text-xs text-gray-500">{profile.id}</div>
                  </td>
                  <td className="px-4 py-3">{profile.phone}</td>
                  <td className="px-4 py-3">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={profile.role}
                      onChange={(event) =>
                        handleRoleChange(profile.id, event.target.value as UserRole)
                      }
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSave(profile.id)}
                      disabled={isPending}
                      className="px-3 py-1 rounded bg-orange-500 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-10 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vet Management</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">Vet</th>
                  <th className="px-4 py-3">Clinic</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vetItems.map((vet) => (
                  <tr key={vet.id} className="text-gray-700">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {vet.profile.full_name}
                      </div>
                      <div className="text-xs text-gray-500">{vet.profile.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{vet.clinic_name}</div>
                      <div className="text-xs text-gray-500">{vet.address}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {vet.license_number}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={vet.is_active}
                          onChange={(event) =>
                            handleVetToggle(vet.id, event.target.checked)
                          }
                          disabled={isPending}
                        />
                        {vet.is_active ? "Active" : "Disabled"}
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
