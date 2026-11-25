import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DBCustomer, DBInvoice } from "@/lib/erp-service";

type Props = {
  customers: DBCustomer[];
  invoices: DBInvoice[];
  money: (value: number) => string;
  onCollect: (invoice: DBInvoice) => void;
  onAddCustomer?: (() => void) | undefined;
  onOpenProfile: (customer: DBCustomer) => void;
};

const isOpenInvoice = (inv: DBInvoice) =>
  inv.status !== "Paid" && (Number(inv.remaining_amount) || 0) > 0;

const invoicesForCustomer = (customer: DBCustomer, invoices: DBInvoice[]) =>
  invoices
    .filter((inv) =>
      inv.customer_id ? inv.customer_id === customer.id : inv.customer_name === customer.name,
    )
    .filter(isOpenInvoice)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

export function SalesCustomerReceivables({
  customers,
  invoices,
  money,
  onCollect,
  onAddCustomer,
  onOpenProfile,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0] || "";

  const rows = useMemo(
    () =>
      customers.map((customer) => {
        const open = invoicesForCustomer(customer, invoices);
        const due = open.reduce((sum, inv) => sum + (Number(inv.remaining_amount) || 0), 0);
        return { key: customer.id || customer.name, customer, open, due };
      }),
    [customers, invoices],
  );

  const term = query.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      !term ||
      `${r.customer.name} ${r.customer.city || ""} ${r.customer.contact_person || ""}`
        .toLowerCase()
        .includes(term),
  );
  const selected = filtered.find((r) => r.key === selectedKey) ?? filtered[0] ?? null;
  const totalDue = rows.reduce((sum, r) => sum + r.due, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {customers.length} customer{customers.length === 1 ? "" : "s"} · Receivables{" "}
          <b className="font-semibold text-foreground">{money(totalDue)}</b>
        </span>
        {onAddCustomer && (
          <Button size="sm" className="h-9 gap-1.5 px-4 text-xs font-bold" onClick={onAddCustomer}>
            <Plus className="size-3.5" />
            Add customer
          </Button>
        )}
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="panel">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search customers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-xs font-medium pl-9 pr-3 h-9 rounded-lg border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">No customers found</p>
            ) : (
              filtered.map((r) => (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setSelectedKey(r.key)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors hover:bg-muted/40 ${
                    selected?.key === r.key ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.customer.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {r.customer.contact_person || r.customer.city || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-bold ${r.due > 0 ? "text-foreground" : "text-emerald-600"}`}
                    >
                      {r.due > 0 ? money(r.due) : "Settled"}
                    </p>
                    {r.open.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">{r.open.length} open</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          {!selected ? (
            <p className="p-8 text-center text-xs text-muted-foreground">Select a customer</p>
          ) : (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                <h2 className="panel-title truncate">{selected.customer.name}</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs shrink-0"
                  onClick={() => onOpenProfile(selected.customer)}
                >
                  Open profile
                </Button>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Receivables
                  </h3>
                  <span className="text-sm font-black text-foreground">{money(selected.due)}</span>
                </div>
                {selected.open.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No pending receivables
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {selected.open.map((inv) => {
                      const overdue = Boolean(inv.due_date && inv.due_date < today);
                      return (
                        <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold font-mono text-foreground truncate">
                              #{inv.id}
                            </p>
                            <p className={`text-[11px] ${overdue ? "text-danger font-semibold" : "text-muted-foreground"}`}>
                              Due {inv.due_date || "—"}
                              {overdue ? " · Overdue" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-foreground">
                              {money(Number(inv.remaining_amount) || 0)}
                            </span>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => onCollect(inv)}
                            >
                              Collect
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
