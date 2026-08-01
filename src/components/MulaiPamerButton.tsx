"use client";

import { useState } from "react";
import MulaiPamerModal from "./MulaiPamerModal";

interface MulaiPamerButtonProps {
  children: React.ReactNode;
  className?: string;
  onSuccess?: () => void;
}

export default function MulaiPamerButton({
  children,
  className,
  onSuccess,
}: MulaiPamerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <MulaiPamerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}
