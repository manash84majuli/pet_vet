/**
 * Orders Page
 * View order history and order details
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { PaymentStatus, OrderWithItems } from "@/lib/types";
import { getUserOrders } from "@/actions/orders";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(
    null
  );
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "paid" | "shipped" | "delivered" | "cancelled"
  >("all");

  useEffect(() => {
    async function fetchOrders() {
        try {
            const result = await getUserOrders();
            if (result.success) {
                setOrders(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchOrders();
  }, []);

  const filteredOrders =
    filterStatus === "all"
      ? orders
      : orders.filter((order) => {
            if (filterStatus === "pending") return order.payment_status === PaymentStatus.PENDING;
            if (filterStatus === "paid") return order.payment_status === PaymentStatus.PAID;
            return true;
          });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "delivered":
        return "bg-emerald-100 text-emerald-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "shipped":
        return "bg-blue-100 text-blue-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-0 flex items-center justify-center">
        <div className="animate-spin">
          <Package className="w-8 h-8 text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 text-sm">Track and manage your orders</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { value: "all" as const, label: "All Orders", count: orders.length },
            {
              value: "pending" as const,
              label: "Pending",
              count: orders.filter((o) => o.payment_status === "pending").length,
            },
            {
              value: "paid" as const,
              label: "Paid",
              count: orders.filter((o) => o.payment_status === "paid").length,
            },
            // shipped/delivered status removed (not present on Order type)
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                filterStatus === tab.value
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-orange-500"
              }`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-2">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No orders found</p>
            <p className="text-gray-500 text-sm mt-1">
              Start shopping for pet products and medications
            </p>
            <button
              onClick={() => router.push("/shop")}
              className="mt-6 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between md:items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Order ID</p>
                      <p className="font-mono font-semibold text-gray-900">{order.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-xl font-bold text-gray-900">
                          ₹{order.total_amount_inr.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <div className="flex gap-2 mb-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(
                              order.payment_status
                            )}`}
                          >
                            {getStatusIcon(order.payment_status)}
                            {order.payment_status}
                          </span>
                          {/* Order-level status not available; using payment status only */}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    Ordered on{" "}
                    <span className="font-medium">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-6 py-4 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Items ({order.items.length})
                  </p>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.product_id}</p>
                          <p className="text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          ₹{(item.unit_price_at_purchase * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Actions */}
                <div className="px-6 py-4 bg-white flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {order.shipping_address_json && (
                      <p>
                        <span className="font-medium">Delivery:</span>{" "}
                        {order.shipping_address_json.street}, {order.shipping_address_json.city}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {order.payment_status === PaymentStatus.PENDING && (
                      <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                        <AlertCircle className="w-4 h-4" />
                        Complete Payment
                      </button>
                    )}
                    {/* Order tracking not implemented (no order_status on Order type) */}
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Invoice
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Invoice</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold text-orange-600 mb-2">INVOICE</h1>
                <p className="text-sm text-gray-600">Order ID: {selectedOrder.id}</p>
                <p className="text-sm text-gray-600">
                  Date: {new Date(selectedOrder.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Items */}
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 font-semibold">Product</th>
                      <th className="text-center py-2 font-semibold">Qty</th>
                      <th className="text-right py-2 font-semibold">Price</th>
                      <th className="text-right py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3">{item.product_id}</td>
                        <td className="text-center py-3">{item.quantity}</td>
                        <td className="text-right py-3">
                          ₹{item.unit_price_at_purchase.toLocaleString()}
                        </td>
                        <td className="text-right py-3 font-semibold">
                          ₹{(item.unit_price_at_purchase * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-end items-center gap-4 text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    ₹{selectedOrder.total_amount_inr.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-end items-center gap-4 mt-2 text-sm">
                  <span className="text-gray-600">Payment Status: </span>
                  <span
                    className={`px-3 py-1 rounded-full font-semibold ${getStatusColor(
                      selectedOrder.payment_status
                    )}`}
                  >
                    {selectedOrder.payment_status}
                  </span>
                </div>
              </div>

              {/* Print Button */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => window.print()}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Print Invoice
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
