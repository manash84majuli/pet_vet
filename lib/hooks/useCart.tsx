/**
 * Zustand Store for Shopping Cart
 * Client-side state management with persistence to localStorage
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, CartItem, Cart } from "@/lib/types";

interface CartStore extends Cart {
  addToCart: (
    product: Product,
    quantity: number,
    prescriptionPath?: string
  ) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total_amount_inr: 0,

      addToCart: (product, quantity, prescriptionPath) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.id === product.id
          );

          let newItems: CartItem[];

          if (existingItem) {
            // Update quantity if product already in cart
            newItems = state.items.map((item) =>
              item.product.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    prescription_file_path:
                      prescriptionPath || item.prescription_file_path,
                  }
                : item
            );
          } else {
            // Add new item
            newItems = [
              ...state.items,
              {
                product,
                quantity,
                prescription_file_path: prescriptionPath,
              },
            ];
          }

          const total = newItems.reduce(
            (sum, item) => sum + item.product.price_inr * item.quantity,
            0
          );

          return {
            items: newItems,
            total_amount_inr: total,
          };
        }),

      removeFromCart: (productId) =>
        set((state) => {
          const newItems = state.items.filter(
            (item) => item.product.id !== productId
          );
          const total = newItems.reduce(
            (sum, item) => sum + item.product.price_inr * item.quantity,
            0
          );

          return {
            items: newItems,
            total_amount_inr: total,
          };
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          const newItems = state.items
            .map((item) =>
              item.product.id === productId
                ? { ...item, quantity: Math.max(1, quantity) }
                : item
            )
            .filter((item) => item.quantity > 0);

          const total = newItems.reduce(
            (sum, item) => sum + item.product.price_inr * item.quantity,
            0
          );

          return {
            items: newItems,
            total_amount_inr: total,
          };
        }),

      clearCart: () =>
        set({
          items: [],
          total_amount_inr: 0,
        }),

      getTotal: () => {
        const state = get();
        return state.items.reduce(
          (sum, item) => sum + item.product.price_inr * item.quantity,
          0
        );
      },
    }),
    {
      name: "cart-store",
      partialize: (state) => ({
        items: state.items,
        total_amount_inr: state.total_amount_inr,
      }),
    }
  )
);
