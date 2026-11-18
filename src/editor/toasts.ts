import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "error";
}

interface ToastStore {
  toasts: Toast[];
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastStore>()((set) => ({
  toasts: [],
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, tone: Toast["tone"] = "info") {
  const id = nextId++;
  useToasts.setState((s) => ({
    toasts: [...s.toasts.slice(-2), { id, message, tone }],
  }));
  setTimeout(
    () => useToasts.getState().dismiss(id),
    tone === "error" ? 6000 : 3500,
  );
}
