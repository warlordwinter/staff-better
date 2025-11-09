"use client";

import { ToastProvider } from "./ToastProvider";

export default function ToastWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

