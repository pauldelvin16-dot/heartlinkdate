import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Minus, Trash2, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { KENYA_COUNTY_NAMES, subCountiesOf, townsOf } from "@/lib/kenya";

type Product = { id: string; name: string; description: string | null; price_kes: number; image_url: string | null; category: string | null; stock: number };
type CartItem = { id: string; name: string; price_kes: number; image_url: string | null; qty: number };

const CART_KEY = "hl_cart_v1";
const loadCart = (): CartItem[] => { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; } };
const saveCart = (c: CartItem[]) => localStorage.setItem(CART_KEY, JSON.stringify(c));

export default function Shop() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cat, setCat] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>(loadCart());
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", county: "", sub_county: "", town: "", address: "", notes: "" });

  useEffect(() => {
    (supabase as any).from("products").select("*").eq("is_active", true).order("sort_order").then(({ data }: any) => setProducts(data ?? []));
  }, []);
  useEffect(() => { saveCart(cart); }, [cart]);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[], [products]);
  const visible = useMemo(() => cat === "all" ? products : products.filter(p => p.category === cat), [products, cat]);
  const total = useMemo(() => cart.reduce((s, i) => s + i.price_kes * i.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  function add(p: Product) {
    setCart(c => {
      const ex = c.find(i => i.id === p.id);
      if (ex) return c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { id: p.id, name: p.name, price_kes: p.price_kes, image_url: p.image_url, qty: 1 }];
    });
    toast.success(`${p.name} added`);
  }
  function setQty(id: string, q: number) {
    if (q <= 0) return setCart(c => c.filter(i => i.id !== id));
    setCart(c => c.map(i => i.id === id ? { ...i, qty: q } : i));
  }

  async function placeOrder() {
    if (!user) return nav("/auth");
    if (!cart.length) return toast.error("Cart is empty");
    if (!form.full_name || !form.phone || !form.county) return toast.error("Name, phone and county required");
    setBusy(true);
    const { data: order, error } = await (supabase as any).from("orders").insert({
      user_id: user.id, status: "pending", total_kes: total,
      full_name: form.full_name, phone: form.phone,
      county: form.county, sub_county: form.sub_county || null, town: form.town || null,
      address: form.address || null, notes: form.notes || null,
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }
    const items = cart.map(c => ({ order_id: order.id, product_id: c.id, name: c.name, unit_price_kes: c.price_kes, quantity: c.qty, image_url: c.image_url }));
    const { error: e2 } = await (supabase as any).from("order_items").insert(items);
    setBusy(false);
    if (e2) return toast.error(e2.message);
    setCart([]); setCheckout(false);
    toast.success("Order placed! Track it under My Orders.");
    nav("/orders");
  }

  return (
    <div className="container max-w-6xl px-4 py-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Shop</h1>
          <p className="text-sm text-muted-foreground">Cash on delivery or M-Pesa. Delivery across Kenya.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => nav("/orders")}>My orders</Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="relative gradient-primary text-primary-foreground">
                <ShoppingCart className="mr-1 h-4 w-4" /> Cart
                {cartCount > 0 && <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">{cartCount}</span>}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader><SheetTitle>Your cart</SheetTitle></SheetHeader>
              <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
                {cart.length === 0 && <p className="text-sm text-muted-foreground">Cart is empty.</p>}
                {cart.map(i => (
                  <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                    {i.image_url && <img src={i.image_url} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="text-xs text-muted-foreground">KES {i.price_kes.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.id, i.qty - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.id, i.qty + 1)}><Plus className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setQty(i.id, 0)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-3 flex items-center justify-between text-base font-bold">
                  <span>Total</span><span>KES {total.toLocaleString()}</span>
                </div>
                <Button disabled={!cart.length} onClick={() => setCheckout(true)} className="w-full gradient-primary text-primary-foreground">
                  Checkout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant={cat === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setCat("all")}>All</Badge>
          {categories.map(c => (
            <Badge key={c} variant={cat === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setCat(c)}>{c}</Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map(p => (
          <motion.div key={p.id} whileHover={{ y: -2 }} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="aspect-square overflow-hidden bg-muted">
              {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-10 w-10" /></div>}
            </div>
            <div className="p-3">
              <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
              {p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-primary">KES {p.price_kes.toLocaleString()}</span>
                <Button size="sm" onClick={() => add(p)} className="h-8 gradient-primary text-primary-foreground"><Plus className="h-3 w-3" /></Button>
              </div>
              {p.stock <= 0 && <p className="mt-1 text-[10px] text-destructive">Out of stock</p>}
            </div>
          </motion.div>
        ))}
        {visible.length === 0 && <p className="col-span-full py-10 text-center text-muted-foreground">No products yet.</p>}
      </div>

      {/* Checkout Sheet */}
      <Sheet open={checkout} onOpenChange={setCheckout}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>Delivery details</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            <div><Label>Full name</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Phone (M-Pesa)</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07XXXXXXXX" /></div>
            <div>
              <Label>County</Label>
              <Select value={form.county} onValueChange={v => setForm({ ...form, county: v, sub_county: "", town: "" })}>
                <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                <SelectContent className="max-h-72">{KENYA_COUNTY_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.county && (
              <div>
                <Label>Sub-county</Label>
                <Select value={form.sub_county} onValueChange={v => setForm({ ...form, sub_county: v, town: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                  <SelectContent className="max-h-72">{subCountiesOf(form.county).map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.sub_county && (
              <div>
                <Label>Town / Estate</Label>
                {townsOf(form.county, form.sub_county).length > 0 ? (
                  <Select value={form.town} onValueChange={v => setForm({ ...form, town: v })}>
                    <SelectTrigger><SelectValue placeholder="Select town" /></SelectTrigger>
                    <SelectContent className="max-h-72">{townsOf(form.county, form.sub_county).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={form.town} placeholder="Type your town" onChange={e => setForm({ ...form, town: e.target.value })} />
                )}
              </div>
            )}
            <div><Label>Detailed address (building, road)</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="font-semibold">Order summary</p>
              <p className="text-muted-foreground">{cart.length} item(s) · <strong className="text-foreground">KES {total.toLocaleString()}</strong></p>
              <p className="mt-1 text-xs text-muted-foreground">Pay on delivery, or pay via M-Pesa after order confirmation. Admin will mark your order shipped once dispatched.</p>
            </div>

            <Button disabled={busy} onClick={placeOrder} className="w-full gradient-primary text-primary-foreground">
              <CheckCircle2 className="mr-1 h-4 w-4" /> {busy ? "Placing…" : "Place order"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
