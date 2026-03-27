"use client";

import { cn } from "@/lib/utils";
import type React from "react";
import { cloneElement, createContext, useContext, useMemo } from "react";
import { createPortal } from "react-dom";

type AlertDialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext() {
  const context = useContext(AlertDialogContext);

  if (!context) {
    throw new Error("AlertDialog components must be used inside AlertDialog.");
  }

  return context;
}

export function AlertDialog({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const value = useMemo(
    () => ({
      open,
      setOpen: onOpenChange,
    }),
    [onOpenChange, open],
  );

  return (
    <AlertDialogContext.Provider value={value}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement<{ onClick?: () => void }>;
  asChild?: boolean;
}) {
  const { setOpen } = useAlertDialogContext();

  if (asChild) {
    return cloneElement(children, {
      ...children.props,
      onClick: () => {
        children.props.onClick?.();
        setOpen(true);
      },
    });
  }

  return children;
}

export function AlertDialogPortal({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export function AlertDialogOverlay({
  className,
}: {
  className?: string;
}) {
  const { open, setOpen } = useAlertDialogContext();

  if (!open) {
    return null;
  }

  return (
    <button
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]",
        className,
      )}
      onClick={() => setOpen(false)}
      tabIndex={-1}
      type="button"
    />
  );
}

export function AlertDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = useAlertDialogContext();

  if (!open) {
    return null;
  }

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          aria-describedby="alert-dialog-description"
          aria-modal="true"
          aria-labelledby="alert-dialog-title"
          className={cn(
            "w-full max-w-md rounded-xl border border-border/80 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.22)]",
            className,
          )}
          role="alertdialog"
        >
          {children}
        </div>
      </div>
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

export function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AlertDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      id="alert-dialog-title"
      className={cn("text-lg font-semibold text-foreground", className)}
    >
      {children}
    </h2>
  );
}

export function AlertDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      id="alert-dialog-description"
      className={cn("text-sm leading-6 text-muted-foreground", className)}
    >
      {children}
    </p>
  );
}

export function AlertDialogAction({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const { setOpen } = useAlertDialogContext();

  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-[#ab1f2a]",
        className,
      )}
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      type="button"
    >
      {children}
    </button>
  );
}

export function AlertDialogCancel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { setOpen } = useAlertDialogContext();

  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md border bg-white/90 px-4 text-sm font-semibold text-foreground transition hover:bg-white",
        className,
      )}
      onClick={() => setOpen(false)}
      type="button"
    >
      {children}
    </button>
  );
}
