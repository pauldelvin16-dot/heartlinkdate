import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const KEY = "hl_geo_last_ts";

/**
 * Captures the user's geolocation on login and writes it to:
 *  - profiles.latitude/longitude/location_*  (used by recommendation algorithm)
 *  - user_locations  (admin can audit)
 * Re-captures at most every 30 minutes per device. Silent fail on permission denial.
 */
export function useGeoCapture() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;
    if (!("geolocation" in navigator)) return;

    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30 * 60 * 1000) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let city: string | null = null;
        let country: string | null = null;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { headers: { Accept: "application/json" } }
          );
          const j = await r.json();
          city = j?.address?.city || j?.address?.town || j?.address?.village || j?.address?.county || null;
          country = j?.address?.country || null;
        } catch {}
        await supabase.from("profiles").update({
          latitude, longitude,
          location_city: city, location_country: country,
          location_updated_at: new Date().toISOString(),
        }).eq("id", user.id);
        await supabase.from("user_locations").insert({
          user_id: user.id, latitude, longitude, accuracy,
          city, country, source: "browser",
          user_agent: navigator.userAgent.slice(0, 200),
        });
        localStorage.setItem(KEY, String(Date.now()));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 }
    );
  }, [user]);
}
