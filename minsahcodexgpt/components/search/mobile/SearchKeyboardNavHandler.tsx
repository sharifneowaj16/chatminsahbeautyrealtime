"use client";

import { useEffect } from "react";

interface SearchKeyboardNavHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  onEnter?: () => void;
}

export function SearchKeyboardNavHandler({
  isOpen,
  onClose,
  onEnter,
}: SearchKeyboardNavHandlerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && onEnter) {
        onEnter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onEnter]);

  return null;
}
