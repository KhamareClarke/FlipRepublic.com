"use client";

import { cn, formatDate } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  shipped: "Shipped",
  completed: "Completed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

type Step = { key: string; label: string; description: string; done: boolean };

function buildSteps(status: string): Step[] {
  const s = (status || "paid").toLowerCase();
  const shippedDone = ["shipped", "completed", "refunded"].includes(s);
  const completedDone = s === "completed";

  return [
    {
      key: "paid",
      label: "Payment received",
      description: "Checkout completed and funds captured.",
      done: true,
    },
    {
      key: "shipped",
      label: "Shipped",
      description: "Seller dispatched your item.",
      done: shippedDone,
    },
    {
      key: "completed",
      label: "Delivered / complete",
      description: "Order fulfilled and closed.",
      done: completedDone,
    },
  ];
}

export function OrderTimeline({
  status,
  createdAt,
  updatedAt,
  className,
}: {
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  className?: string;
}) {
  const s = (status || "paid").toLowerCase();
  const special = s === "refunded" || s === "cancelled";
  const steps = buildSteps(s);

  return (
    <div className={cn("rounded-lg border border-white/10 bg-black/40 p-4", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] uppercase tracking-wider text-white/45">Order timeline</p>
        <span className="text-xs text-gold/90 font-semibold">{STATUS_LABEL[s] ?? s}</span>
      </div>

      {special && (
        <div
          className={cn(
            "mb-4 text-xs px-3 py-2 rounded-md border",
            s === "refunded"
              ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
              : "border-white/15 bg-white/[0.06] text-white/75"
          )}
        >
          {s === "refunded"
            ? "This order was refunded. If you have questions, contact support from your account email."
            : "This order was cancelled by the seller or marketplace."}
        </div>
      )}

      <ul className="space-y-0">
        {steps.map((step, i) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0 mt-1.5",
                  step.done ? "bg-gold shadow-[0_0_10px_rgba(201,162,39,0.5)]" : "bg-white/20"
                )}
              />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-px flex-1 min-h-[28px]",
                    step.done && steps[i + 1]?.done ? "bg-gold/40" : "bg-white/10"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-4", i === steps.length - 1 && "pb-0")}>
              <p className={cn("text-sm font-medium", step.done ? "text-white" : "text-white/40")}>
                {step.label}
              </p>
              <p className="text-xs text-white/45 mt-0.5">{step.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 pt-3 border-t border-white/10 text-[10px] text-white/40 space-y-1">
        <p>Placed {formatDate(createdAt)}</p>
        {updatedAt && updatedAt !== createdAt && <p>Last update {formatDate(updatedAt)}</p>}
      </div>
    </div>
  );
}
