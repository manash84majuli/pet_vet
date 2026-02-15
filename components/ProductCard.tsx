/**
 * Product Card Component
 * Displays product with image, price, stock, and add-to-cart
 * Handles prescription uploads for prescription-required products
 * Integrated with Zustand cart store
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingCart, AlertCircle, FileUp, Check, Pill } from "lucide-react";
import { Product } from "@/lib/types";
import { useCartStore } from "@/lib/hooks/useCart";
import { uploadPrescription } from "@/actions/cart";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPath, setPrescriptionPath] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);

  const { addToCart } = useCartStore();

  const isInStock = product.stock > 0;
  const hasRequiredPrescription =
    product.requires_prescription && prescriptionPath;

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("en-IN").format(value);

  const handlePrescriptionFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File size exceeds 5 MB limit");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only PDF and images (JPEG, PNG, WebP) are allowed");
      return;
    }

    setPrescriptionFile(file);
    setUploadError("");
  };

  const handlePrescriptionUpload = async () => {
    if (!prescriptionFile) return;

    setIsLoading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", prescriptionFile);

      const result = await uploadPrescription(formData);

      if (result.success) {
        setPrescriptionPath(result.data.file_path);
        setShowPrescriptionUpload(false);
        setPrescriptionFile(null);
      } else {
        setUploadError(result.error || "Failed to upload prescription");
      }
    } catch (error) {
      setUploadError("Error uploading prescription. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, 1, prescriptionPath || undefined);
  };

  return (
    <div
      className={cn(
        "glass-card overflow-hidden hover:shadow-xl transition-shadow",
        className
      )}
    >
      {/* Product Image */}
      <div className="relative w-full h-44 bg-gradient-to-br from-[#fff5e9] via-[#f6f2ee] to-[#e4f3ed]">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Pill className="w-10 h-10" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {product.requires_prescription && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              Rx required
            </span>
          )}
          {!isInStock && (
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              Out of stock
            </span>
          )}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
          Stock: {product.stock > 0 ? product.stock : "0"}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-5 space-y-3">
        <div className="space-y-1">
          <h3 className="font-display text-lg text-slate-900 line-clamp-2">
            {product.name}
          </h3>
          {product.category && (
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {product.category}
            </span>
          )}
        </div>

        {product.description && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="text-2xl font-semibold text-slate-900">
            ₹{formatPrice(product.price_inr)}
          </div>
          <span className="text-xs text-slate-500">
            {product.requires_prescription ? "Prescription" : "Over-the-counter"}
          </span>
        </div>

        {product.requires_prescription && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            Upload a valid prescription to add this item.
          </div>
        )}

        {product.requires_prescription &&
          !hasRequiredPrescription &&
          showPrescriptionUpload && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
              <label className="flex flex-col gap-2 text-xs text-blue-900">
                <span className="font-semibold">Prescription file</span>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handlePrescriptionFileSelect}
                  disabled={isLoading}
                  className="text-xs"
                />
              </label>

              {uploadError && (
                <p className="text-xs text-red-600 mt-2">{uploadError}</p>
              )}

              <button
                onClick={handlePrescriptionUpload}
                disabled={!prescriptionFile || isLoading}
                className="mt-3 w-full px-3 py-2 bg-blue-700 text-white text-xs rounded-full font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileUp className="w-3 h-3" />
                    Upload
                  </>
                )}
              </button>
            </div>
          )}

        {hasRequiredPrescription && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex gap-2 items-center">
            <Check className="w-4 h-4 text-emerald-600" />
            Prescription uploaded
          </div>
        )}

        {product.requires_prescription ? (
          <div className="flex gap-2">
            {!hasRequiredPrescription ? (
              <button
                onClick={() => setShowPrescriptionUpload(!showPrescriptionUpload)}
                className="flex-1 px-3 py-2 border border-slate-900 text-slate-900 text-xs font-semibold rounded-full hover:bg-slate-100 transition-colors"
              >
                {showPrescriptionUpload ? "Hide upload" : "Upload Rx"}
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!isInStock}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-semibold rounded-full text-white flex items-center justify-center gap-1 transition-colors",
                  isInStock
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-gray-300 cursor-not-allowed"
                )}
              >
                <ShoppingCart className="w-4 h-4" />
                Add to cart
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={!isInStock}
            className={cn(
              "w-full px-3 py-2 text-xs font-semibold rounded-full text-white flex items-center justify-center gap-1 transition-colors",
              isInStock
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            Add to cart
          </button>
        )}
      </div>
    </div>
  );
}
