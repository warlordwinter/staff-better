"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import Toast from "./Toast";

interface ToastContextType {
  showToast: (message: string, type?: "error" | "success" | "info") => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"error" | "success" | "info">("error");

  const showToast = useCallback(
    (toastMessage: string, toastType: "error" | "success" | "info" = "error") => {
      setMessage(toastMessage);
      setType(toastType);
      setIsVisible(true);
    },
    []
  );

  const hideToast = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        message={message}
        type={type}
        isVisible={isVisible}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

