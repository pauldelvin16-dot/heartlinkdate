import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, Truck, Home, Clock, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FLOW: { key: string; label: string; icon: any }[] = [
  { key: "pending",   label: "Placed",    icon: Clock },
  { key: "paid",      label: "Paid",      icon: CheckCircle2 },
  { key: "shipped",   label: "Shipped",   icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      const ids = (data ?? []).map((o: any) => o.id);
      const { data: items } = ids.length
        ? await (supabase as any).from("order_items").select("*").in("order_id", ids)
        : { data: [] as any[] };
      setOrders((data ?? []).map((o: any) => ({ ...o, items: (items ?? []).filter((i: any) => i.order_id === o.id) })));
    })();
  }, [user]);

  return (
    <div className="container max-w-3xl px-4 py-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> My orders</h1>
        <Button asChild size="sm" variant="outline"><Link to="/shop">Continue shopping</Link></Button>
      </div>

      {orders.length === 0 && <p className="text-muted-foreground">You haven't placed any orders yet.</p>}

      <div className="space-y-4">
        {orders.map(o => {
          const stepIdx = o.status === "cancelled" ? -1 : FLOW.findIndex(f => f.key === o.status);
          return (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-lg font-bold">KES {o.total_kes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                {o.status === "cancelled" ? (
                  <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>
                ) : (
                  <Badge className="capitalize">{o.status}</Badge>
                )}
              </div>

              {/* Timeline */}
              {o.status !== "cancelled" && (
                <div className="mt-4 flex items-center justify-between">
                  {FLOW.map((f, i) => {
                    const done = i <= stepIdx;
                    const Icon = f.icon;
                    return (
                      <div key={f.key} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center">
                          <div className={`grid h-8 w-8 place-items-center rounded-full ${done ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={`mt-1 text-[10px] ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{f.label}</span>
                        </div>
                        {i < FLOW.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${i < stepIdx ? "bg-primary" : "bg-muted"}`} />}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                {(o.items ?? []).map((it: any) => (
                  <div key={it.id} className="flex items-center justify-between">
                    <span className="truncate">{it.quantity}× {it.name}</span>
                    <span className="text-muted-foreground">KES {(it.unit_price_kes * it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                Deliver to: <strong className="text-foreground">{o.full_name}</strong> · {o.phone} · {[o.town, o.sub_county, o.county].filter(Boolean).join(", ")}
                {o.tracking_code && <div className="mt-1">Tracking: <strong className="text-foreground">{o.tracking_code}</strong></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
