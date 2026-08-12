"use client";

import { useState } from "react";
import { setAvailability } from "@/lib/availability";

export default function AvailabilityToggle({
  initialAvailability,
}: {
  initialAvailability?: "available" | "unavailable";
}) {
  const [availability, setAvailabilityState] = useState(
    initialAvailability ?? "unavailable"
  );
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const next = await setAvailability(availability !== "available");
      setAvailabilityState(next);
    } finally {
      setSaving(false);
    }
  }

  const isAvailable = availability === "available";

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
        isAvailable
          ? "bg-green-500 text-black hover:bg-green-400"
          : "border border-white/20 text-white hover:bg-white/10"
      }`}
    >
      {isAvailable ? "Available for co-op" : "Go Available"}
    </button>
  );
}
