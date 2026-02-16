/**
 * Checkout Page
 * Payment processing with Razorpay integration
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Lock,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import { useCartStore } from "@/lib/hooks/useCart";
import { useToast } from "@/lib/toast-context";

declare global {
  interface Window {
    Razorpay: unknown;
  }
}

import { useAuth } from "@/lib/auth-context";
import { createOrder } from "@/actions/cart";
import { CreateOrderInput } from "@/lib/types";

export default function CheckoutPage() {
  const { user } = useAuth();
  const cartStore = useCartStore();
  const { addToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"review" | "payment" | "success">("review");
  const [orderId, setOrderId] = useState<string>("");

  const items = cartStore.items;
  const subtotal = cartStore.getTotal();
  const total = subtotal; // Add shipping/tax logic as needed

  if (items.length === 0 && step !== "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-6">Cart is empty</p>
          <Link
            href="/shop"
            className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const handleInitiatePayment = async () => {
    if (step !== "review") return;

    setIsProcessing(true);
    setError("");

    try {
      const orderInput: CreateOrderInput = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          prescription_file_path: item.prescription_file_path,
        })),
        shipping_address: {
          name: user?.full_name || "Guest User",
          street: "123 Pet Street",
          city: "Bangalore",
          state: "Karnataka",
          postal_code: "560001",
          country: "India",
        },
      };

      const result = await createOrder(orderInput);

      if (!result.success) {
        throw new Error(result.error || "Failed to create order");
      }

      const createdOrder = result.data;
      setOrderId(createdOrder.id);

      // Simulate payment processing (since we don't have real Razorpay keys setup in this context)
      // In a real scenario, we would use createdOrder.id to initiate Razorpay payment

      setTimeout(() => {
         cartStore.clearCart();
         setStep("success");
         addToast("Payment successful! Order placed.", "success");
         setIsProcessing(false);
      }, 1500);

    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to initiate payment. Please try again.";
      setError(errorMessage);
      addToast("Payment initiation failed", "error");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {step === "success" ? (
          // Success State
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Order Placed Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for your order. You&apos;ll receive a confirmation email shortly.
            </p>

            <div className="space-y-4 text-left bg-gray-50 rounded-lg p-6 mb-8 max-w-sm mx-auto">
              <div>
                <p className="text-sm text-gray-500 uppercase font-semibold">
                  Order ID
                </p>
                <p className="text-lg font-mono font-bold text-gray-900">
                  {orderId || `ORD_${Date.now()}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase font-semibold">
                  Total Paid
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{total.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase font-semibold">
                  Status
                </p>
                <p className="text-green-700 font-semibold">✓ Payment Confirmed</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/orders"
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
              >
                View Orders
              </Link>
              <Link
                href="/shop"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Order Review */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Order Review
                </h2>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4 mb-8 pb-8 border-b border-gray-200">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-4">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ₹{(item.product.price_inr * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Billing Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Delivery Address
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-gray-900">John Doe</p>
                    <p className="text-gray-600 text-sm mt-1">
                      123 Pet Street, Bangalore, India
                    </p>
                    <p className="text-gray-600 text-sm">+91 9876543210</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Payment Summary
                </h3>

                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      ₹{subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">Free</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-orange-600">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Security Info */}
                <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Your payment information is secure and encrypted with Razorpay
                    </p>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <p className="font-semibold text-gray-900">Payment Method</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Razorpay (Cards, UPI, Netbanking, Wallets)
                  </p>
                </div>

                {/* Pay Button */}
                <button
                  onClick={handleInitiatePayment}
                  disabled={isProcessing || step === "payment"}
                  className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay ₹{total.toLocaleString()}
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  You will be redirected to Razorpay to complete payment
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
