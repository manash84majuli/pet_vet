"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPosOrder, getPosOrders } from "@/actions/pos";
import {
  PosOrderType,
  PosPaymentMethod,
  PosOrder,
  PosOrderItem,
  Product,
  Service,
  UserRole,
} from "@/lib/types";

interface PosClientProps {
  products: Product[];
  services: Service[];
  userRole: UserRole;
}

interface CartItem {
  id: string;
  item_type: "product" | "service";
  name: string;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
  product_id?: string;
  service_id?: string;
}

export default function PosClient({ products, services }: PosClientProps) {
  const [activeTab, setActiveTab] = useState<"sell" | "history">("sell");
  const [orderType, setOrderType] = useState<PosOrderType>(PosOrderType.RETAIL);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>(
    PosPaymentMethod.CASH
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    orderId: string;
    total: number;
    items: CartItem[];
    orderType: PosOrderType;
    paymentMethod: PosPaymentMethod;
    customerName?: string;
    customerPhone?: string;
    createdAt: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [historyFilters, setHistoryFilters] = useState({
    startDate: "",
    endDate: "",
    orderType: "",
    paymentMethod: "",
  });
  const [historyOrders, setHistoryOrders] = useState<PosOrder[]>([]);
  const [historyItems, setHistoryItems] = useState<PosOrderItem[]>([]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-IN").format(value);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.slug.toLowerCase().includes(term)
    );
  }, [products, search]);

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services;
    return services.filter((service) => service.name.toLowerCase().includes(term));
  }, [services, search]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.line_total_inr, 0),
    [cart]
  );

  const addItem = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (entry) => entry.item_type === item.item_type && entry.id === item.id
      );
      if (!existing) {
        return [...prev, item];
      }
      return prev.map((entry) =>
        entry.id === item.id && entry.item_type === item.item_type
          ? {
              ...entry,
              quantity: entry.quantity + 1,
              line_total_inr: (entry.quantity + 1) * entry.unit_price_inr,
            }
          : entry
      );
    });
  };

  const updateQuantity = (item: CartItem, quantity: number) => {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.id === item.id && entry.item_type === item.item_type
            ? {
                ...entry,
                quantity,
                line_total_inr: quantity * entry.unit_price_inr,
              }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const handleBarcodeAdd = () => {
    const term = barcode.trim().toLowerCase();
    if (!term) return;

    const product = products.find(
      (item) => item.slug.toLowerCase() === term || item.id === term
    );

    if (!product) {
      setStatus("Barcode not found in products.");
      return;
    }

    addItem({
      id: product.id,
      item_type: "product",
      name: product.name,
      quantity: 1,
      unit_price_inr: product.price_inr,
      line_total_inr: product.price_inr,
      product_id: product.id,
    });

    setBarcode("");
    setStatus(null);
  };

  const handleCheckout = () => {
    setStatus(null);
    if (!cart.length) {
      setStatus("Cart is empty.");
      return;
    }

    startTransition(async () => {
      const result = await createPosOrder({
        order_type: orderType,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          item_type: item.item_type,
          product_id: item.product_id,
          service_id: item.service_id,
          quantity: item.quantity,
        })),
      });

      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setReceipt({
        orderId: result.data.order.id,
        total,
        items: cart,
        orderType,
        paymentMethod,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        createdAt: new Date().toISOString(),
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setStatus("POS order completed.");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const historySummary = useMemo(() => {
    const cashTotal = historyOrders
      .filter((order) => order.payment_method === PosPaymentMethod.CASH)
      .reduce((sum, order) => sum + order.total_amount_inr, 0);
    const cardTotal = historyOrders
      .filter((order) => order.payment_method === PosPaymentMethod.CARD)
      .reduce((sum, order) => sum + order.total_amount_inr, 0);
    const grandTotal = historyOrders.reduce(
      (sum, order) => sum + order.total_amount_inr,
      0
    );

    const dailyTotals = new Map<string, number>();
    const monthlyTotals = new Map<string, number>();

    historyOrders.forEach((order) => {
      const date = new Date(order.created_at);
      const dayKey = date.toISOString().slice(0, 10);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + order.total_amount_inr);
      monthlyTotals.set(
        monthKey,
        (monthlyTotals.get(monthKey) || 0) + order.total_amount_inr
      );
    });

    const daily = Array.from(dailyTotals.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const monthly = Array.from(monthlyTotals.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return { cashTotal, cardTotal, grandTotal, daily, monthly };
  }, [historyOrders]);

  const exportHistoryCsv = () => {
    if (!historyOrders.length) {
      setStatus("No history data to export.");
      return;
    }

    const itemsByOrder = historyItems.reduce<Record<string, string[]>>(
      (acc, item) => {
        const product = products.find((p) => p.id === item.product_id);
        const service = services.find((s) => s.id === item.service_id);
        const name = product?.name || service?.name || "Item";
        acc[item.pos_order_id] = acc[item.pos_order_id] || [];
        acc[item.pos_order_id].push(`${name} x ${item.quantity}`);
        return acc;
      },
      {}
    );

    const header = [
      "order_id",
      "created_at",
      "order_type",
      "payment_method",
      "customer_name",
      "customer_phone",
      "total_amount_inr",
      "items",
    ].join(",");

    const rows = historyOrders.map((order) => {
      const values = [
        order.id,
        order.created_at,
        order.order_type,
        order.payment_method,
        order.customer_name || "",
        order.customer_phone || "",
        order.total_amount_inr,
        (itemsByOrder[order.id] || []).join(" | "),
      ];

      return values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pos-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadHistory = useCallback(() => {
    setStatus(null);
    startTransition(async () => {
      const result = await getPosOrders({
        startDate: historyFilters.startDate || undefined,
        endDate: historyFilters.endDate || undefined,
        orderType: historyFilters.orderType
          ? (historyFilters.orderType as PosOrderType)
          : undefined,
        paymentMethod: historyFilters.paymentMethod
          ? (historyFilters.paymentMethod as PosPaymentMethod)
          : undefined,
      });

      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setHistoryOrders(result.data.orders);
      setHistoryItems(result.data.items);
    });
  }, [historyFilters, startTransition]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  return (
    <div className="min-h-screen bg-[#f8f4ef] px-4 md:px-6 py-8 md:py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm">
              POS Console
            </span>
            <h1 className="font-display text-3xl md:text-4xl text-slate-900">
              Clinic + Retail Sales
            </h1>
            <p className="text-slate-600">Fast checkout, unified inventory, live totals.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={orderType}
              onChange={(event) => setOrderType(event.target.value as PosOrderType)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              <option value={PosOrderType.RETAIL}>Retail</option>
              <option value={PosOrderType.CLINIC}>Clinic</option>
            </select>
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PosPaymentMethod)
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              <option value={PosPaymentMethod.CASH}>Cash</option>
              <option value={PosPaymentMethod.CARD}>Card</option>
            </select>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "sell", label: "Sell" },
            { key: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {status && (
          <div className="glass-card p-3 text-sm text-slate-700">
            {status}
          </div>
        )}

        {activeTab === "sell" && (
          <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-6">
            <section className="glass-card p-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <input
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm flex-1"
                  placeholder="Search products or services"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Scan barcode"
                    value={barcode}
                    onChange={(event) => setBarcode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleBarcodeAdd();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleBarcodeAdd}
                    className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h2 className="font-display text-lg text-slate-900 mb-2">Products</h2>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        addItem({
                          id: product.id,
                          item_type: "product",
                          name: product.name,
                          quantity: 1,
                          unit_price_inr: product.price_inr,
                          line_total_inr: product.price_inr,
                          product_id: product.id,
                        })
                      }
                      className="w-full flex items-center justify-between rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-700 hover:border-primary"
                    >
                      <span>{product.name}</span>
                      <span className="text-slate-500">₹{formatMoney(product.price_inr)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="font-display text-lg text-slate-900 mb-2">Services</h2>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {filteredServices.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() =>
                        addItem({
                          id: service.id,
                          item_type: "service",
                          name: service.name,
                          quantity: 1,
                          unit_price_inr: service.price_inr,
                          line_total_inr: service.price_inr,
                          service_id: service.id,
                        })
                      }
                      className="w-full flex items-center justify-between rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-700 hover:border-emerald-300"
                    >
                      <span>{service.name}</span>
                      <span className="text-slate-500">₹{formatMoney(service.price_inr)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="glass-card p-6 space-y-4">
            <div className="space-y-2">
              <h2 className="font-display text-lg text-slate-900">Customer</h2>
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full"
                placeholder="Customer name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full"
                placeholder="Phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-lg text-slate-900">Cart</h2>
              {cart.length === 0 && (
                <p className="text-sm text-slate-500">No items added.</p>
              )}
              {cart.map((item) => (
                <div
                  key={`${item.item_type}-${item.id}`}
                  className="rounded-2xl border border-white/70 bg-white/90 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        ₹{formatMoney(item.unit_price_inr)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                        className="px-2 py-1 border border-slate-200 rounded-full"
                      >
                        -
                      </button>
                      <span className="text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                        className="px-2 py-1 border border-slate-200 rounded-full"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-600 mt-2">
                    ₹{formatMoney(item.line_total_inr)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-lg font-semibold text-slate-900">
                <span>Total</span>
                <span>₹{formatMoney(total)}</span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isPending}
                className="w-full mt-4 px-4 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
              >
                {isPending ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </aside>
        </div>
        )}

        {activeTab === "history" && (
          <section className="glass-card p-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-slate-600">Start date</label>
                <input
                  type="date"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={historyFilters.startDate}
                  onChange={(event) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">End date</label>
                <input
                  type="date"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={historyFilters.endDate}
                  onChange={(event) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      endDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Type</label>
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={historyFilters.orderType}
                  onChange={(event) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      orderType: event.target.value,
                    }))
                  }
                >
                  <option value="">All</option>
                  <option value={PosOrderType.RETAIL}>Retail</option>
                  <option value={PosOrderType.CLINIC}>Clinic</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Payment</label>
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={historyFilters.paymentMethod}
                  onChange={(event) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      paymentMethod: event.target.value,
                    }))
                  }
                >
                  <option value="">All</option>
                  <option value={PosPaymentMethod.CASH}>Cash</option>
                  <option value={PosPaymentMethod.CARD}>Card</option>
                </select>
              </div>
              <button
                type="button"
                onClick={loadHistory}
                disabled={isPending}
                className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold"
              >
                {isPending ? "Loading..." : "Filter"}
              </button>
              <button
                type="button"
                onClick={exportHistoryCsv}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm"
              >
                Export CSV
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="text-xs text-slate-500">Total Sales</p>
                <p className="text-lg font-semibold">₹{formatMoney(historySummary.grandTotal)}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="text-xs text-slate-500">Cash</p>
                <p className="text-lg font-semibold">₹{formatMoney(historySummary.cashTotal)}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="text-xs text-slate-500">Card</p>
                <p className="text-lg font-semibold">₹{formatMoney(historySummary.cardTotal)}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Daily Sales</h3>
                <div className="space-y-1 text-xs text-slate-600 max-h-40 overflow-auto">
                  {historySummary.daily.map(([day, amount]) => (
                    <div key={day} className="flex items-center justify-between">
                      <span>{day}</span>
                      <span>₹{formatMoney(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Monthly Sales</h3>
                <div className="space-y-1 text-xs text-slate-600 max-h-40 overflow-auto">
                  {historySummary.monthly.map(([month, amount]) => (
                    <div key={month} className="flex items-center justify-between">
                      <span>{month}</span>
                      <span>₹{formatMoney(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/70 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historyOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {order.id.slice(0, 8)}
                        <div className="text-[10px] text-slate-500">
                          {new Date(order.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-2">{order.order_type}</td>
                      <td className="px-3 py-2">{order.payment_method}</td>
                      <td className="px-3 py-2">₹{formatMoney(order.total_amount_inr)}</td>
                      <td className="px-3 py-2">
                        {historyItems
                          .filter((item) => item.pos_order_id === order.id)
                          .map((item) => {
                            const product = products.find((p) => p.id === item.product_id);
                            const service = services.find((s) => s.id === item.service_id);
                            const name = product?.name || service?.name || "Item";
                            return (
                              <div key={item.id} className="text-xs text-slate-600">
                                {name} x {item.quantity}
                              </div>
                            );
                          })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {receipt && (
          <section className="glass-card p-6 print:block">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {receipt.orderType === PosOrderType.CLINIC ? "Clinic Receipt" : "Retail Receipt"}
                </h2>
                <p className="text-xs text-slate-500">Order {receipt.orderId}</p>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 rounded-full border border-slate-200 text-sm"
              >
                Print
              </button>
            </div>
            <div className="text-xs text-slate-500 mb-4">
              <div>Payment: {receipt.paymentMethod}</div>
              {receipt.customerName && <div>Customer: {receipt.customerName}</div>}
              {receipt.customerPhone && <div>Phone: {receipt.customerPhone}</div>}
              <div>{new Date(receipt.createdAt).toLocaleString()}</div>
            </div>
            <div className="space-y-2">
              {receipt.items.map((item) => (
                <div key={`${item.item_type}-${item.id}`} className="flex justify-between text-sm">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>₹{formatMoney(item.line_total_inr)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 mt-4 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{formatMoney(receipt.total)}</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
