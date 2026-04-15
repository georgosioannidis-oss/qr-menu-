"use client";

import Link from "next/link";
import { useCallback } from "react";

export type PrintOrderPayload = {
  id: string;
  restaurantName: string;
  tableName: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  paymentSummary?: string | null;
  billPaidAt?: string | null;
  items: Array<{
    quantity: number;
    name: string;
    unitPrice: number;
    notes: string | null;
    selectedOptionsSummary: string | null;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending payment",
  paid: "Paid",
  preparing: "Preparing",
  ready: "Ready for pickup",
  delivered: "Delivered",
  declined: "Declined",
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PrintOrderTicket({
  order,
  backHref,
}: {
  order: PrintOrderPayload;
  backHref: string;
}) {
  const onPrint = useCallback(() => {
    window.print();
  }, []);

  const statusLabel = STATUS_LABEL[order.status] ?? order.status;

  return (
    <>
      <div className="no-print mx-auto max-w-lg px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPrint}
            className="min-h-[44px] rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Print
          </button>
          <Link
            href={backHref}
            className="min-h-[44px] inline-flex items-center rounded-xl border-2 border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
          >
            Back
          </Link>
        </div>
        <p className="mt-4 text-sm text-neutral-600">
          Opens your system print dialog (pick a printer or “Save as PDF”).
        </p>
      </div>

      <article className="ticket-print mx-auto max-w-lg border-2 border-neutral-900 bg-white px-5 py-6 text-neutral-900 shadow-sm print:shadow-none print:border-0">
        <header className="border-b-2 border-neutral-900 pb-4">
          <h1 className="text-xl font-black uppercase tracking-tight">{order.restaurantName}</h1>
          <p className="mt-2 text-sm font-semibold">Kitchen / order ticket</p>
          <p className="mt-3 text-lg font-bold">Table: {order.tableName}</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">Status:</span> {statusLabel}
          </p>
          {order.paymentSummary ? (
            <p className="mt-1 text-sm">
              <span className="font-semibold">Payment:</span> {order.paymentSummary}
            </p>
          ) : null}
          {order.billPaidAt ? (
            <p className="mt-1 text-sm font-semibold text-emerald-800">
              Table bill: collected ({formatWhen(order.billPaidAt)})
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-700">
              <span className="font-semibold">Table bill:</span> not marked collected yet
            </p>
          )}
          <p className="mt-1 text-sm text-neutral-700">
            <span className="font-semibold">Placed:</span> {formatWhen(order.createdAt)}
          </p>
          <p className="mt-1 font-mono text-xs text-neutral-600">Order ID: {order.id}</p>
        </header>

        <ul className="divide-y divide-neutral-300 py-4">
          {order.items.map((line, i) => {
            const extra = [line.notes, line.selectedOptionsSummary].filter(Boolean).join(" · ");
            return (
              <li key={i} className="py-3">
                <div className="flex justify-between gap-3 text-base font-bold">
                  <span>
                    {line.quantity}× {line.name}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatPrice(line.unitPrice * line.quantity)}</span>
                </div>
                {extra ? <p className="mt-1 text-sm font-medium text-neutral-800">{extra}</p> : null}
              </li>
            );
          })}
        </ul>

        <footer className="border-t-2 border-neutral-900 pt-4">
          <p className="text-right text-xl font-black tabular-nums">Total {formatPrice(order.totalAmount)}</p>
        </footer>
      </article>
    </>
  );
}
