import { useState } from "react";

export type ToastType = "error" | "success" | "info";

export interface UseToastReturn {
  toastMessage: string;
  toastType: ToastType;
  showToast: boolean;
  setShowToast: (show: boolean) => void;
  showToastMessage: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export function useToast(): UseToastReturn {
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");
  const [showToast, setShowToast] = useState(false);

  const showToastMessage = (message: string, type: ToastType = "info") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const hideToast = () => {
    setShowToast(false);
  };

  return {
    toastMessage,
    toastType,
    showToast,
    setShowToast,
    showToastMessage,
    hideToast,
  };
}

