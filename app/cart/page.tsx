/**
 * Cart Page
 * Shopping cart with checkout
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useCartStore } from "@/lib/hooks/useCart";


export default function CartPage() {
  const router = useRouter();
  const cartStore = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const items = cartStore.items;
  const subtotal = cartStore.getTotal();
  const discount = Math.floor((subtotal * discountPercent) / 100);
  const total = subtotal - discount;

  const handleRemoveItem = (productId: string) => {
    cartStore.removeFromCart(productId);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
    } else {
      cartStore.updateQuantity(productId, quantity);
    }
  };

  const handleApplyCoupon = () => {
    // Mock coupon validation
    if (applyingCoupon === "SAVE10") {
      setDiscountPercent(10);
      setApplyingCoupon("");
    } else if (applyingCoupon === "SAVE20") {
      setDiscountPercent(20);
      setApplyingCoupon("");
    } else {
      setError("Invalid coupon code");
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setIsLoading(true);
    setError("");

    try {
      // Call server action to create order
      // const result = await createOrder({ items, total });

      // For demo, just redirect to payment
      setTimeout(() => {
        router.push("/checkout");
      }, 500);
    } catch (err) {
      console.error(err);
      setError("Failed to proceed to checkout. Please try again.");
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-0 flex items-center justify-center px-4">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-6">
            Add some products to get started with your pet care shopping
          </p>
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-500 text-sm">
            {items.length} {items.length === 1 ? "item" : "items"} in your cart
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border-b border-red-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-gray-200">
                {items.map((item) => (
                  <div key={item.product.id} className="p-6 flex gap-4">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {item.product.category}
                      </p>

                      {item.prescription_file_path && (
                        <div className="mb-4 p-2 bg-blue-50 rounded flex items-start gap-2">
                          <span className="text-xs font-semibold text-blue-700">
                            ✓ Prescription uploaded
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleUpdateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                item.product.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center border border-gray-300 rounded py-1"
                          />
                          <button
                            onClick={() =>
                              handleUpdateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ₹{(item.product.price_inr * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            ₹{item.product.price_inr.toLocaleString()} each
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Continue Shopping */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <Link
                  href="/shop"
                  className="text-orange-600 hover:text-orange-700 font-medium flex items-center gap-2"
                >
                  ← Continue shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 sticky top-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-₹{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-orange-600">₹{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Coupon Code */}
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
                  Coupon Code
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={applyingCoupon}
                    onChange={(e) => setApplyingCoupon(e.target.value.toUpperCase())}
                    placeholder="SAVE10"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Try: SAVE10, SAVE20
                </p>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  "Processing..."
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Security Info */}
              <p className="text-xs text-gray-500 text-center mt-4">
                🔒 Your payment information is secure and encrypted
              </p>
            </div>

            {/* Help Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 mb-3">
                <span className="font-semibold">Need help?</span>
              </p>
              <ul className="text-xs text-blue-600 space-y-2">
                <li>✓ Easy returns within 7 days</li>
                <li>✓ 100% authentic products</li>
                <li>✓ Free delivery for orders over ₹500</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
