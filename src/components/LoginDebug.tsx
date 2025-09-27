"use client";

import { useEffect } from "react";

export default function LoginDebug() {
  useEffect(() => {
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Supabase Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  return <div>Check console logs</div>;
}
