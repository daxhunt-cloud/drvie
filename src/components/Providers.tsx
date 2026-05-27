"use client";

import { ToastProvider } from "@/hooks/useToast";
import { AuthProvider } from "./AuthProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
