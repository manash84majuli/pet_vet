/**
 * Shop Page
 * Product catalog with filtering and search
 * Client-side cart integration
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { useCartStore } from "@/lib/hooks/useCart";
import { getProducts } from "@/actions/shop";

type FilterCategory = "all" | "medicine" | "accessories" | "food" | "grooming";
type SortOption = "featured" | "price_low" | "price_high" | "newest";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>(
    "all"
  );
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const cartStore = useCartStore();
  const cartCount = cartStore.items.length;

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError("");

        const result = await getProducts();
        
        if (result.success) {
          setProducts(result.data);
        } else {
          setError(result.error || "Failed to load products");
        }

      } catch (_err) {
        console.error(_err);
        setError("Failed to load products. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const applyFilters = (
    items: Product[],
    query: string,
    category: FilterCategory,
    sort: SortOption,
    onlyInStock: boolean
  ) => {
    let filtered = items;

    if (category !== "all") {
      filtered = filtered.filter(
        (p) => p.category?.toLowerCase() === category
      );
    }

    if (onlyInStock) {
      filtered = filtered.filter((p) => p.stock > 0);
    }

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description?.toLowerCase().includes(lowerQuery)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sort === "price_low") return a.price_inr - b.price_inr;
      if (sort === "price_high") return b.price_inr - a.price_inr;
      if (sort === "newest") return b.created_at.localeCompare(a.created_at);
      return 0;
    });

    return sorted;
  };

  useEffect(() => {
    setFilteredProducts(
      applyFilters(products, searchQuery, selectedCategory, sortBy, inStockOnly)
    );
  }, [products, searchQuery, selectedCategory, sortBy, inStockOnly]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryChange = (category: FilterCategory) => {
    setSelectedCategory(category);
  };

  const categories: { value: FilterCategory; label: string }[] = [
    { value: "all", label: "All Products" },
    { value: "medicine", label: "Medicines" },
    { value: "food", label: "Food" },
    { value: "accessories", label: "Accessories" },
    { value: "grooming", label: "Grooming" },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "featured", label: "Featured" },
    { value: "newest", label: "Newest" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
  ];

  return (
    <div className="min-h-screen bg-[#f8f4ef] pb-24 md:pb-0">
      <section className="hero-surface">
        <div className="container py-12 md:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Trusted essentials
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-slate-900">
                Pet Shop
              </h1>
              <p className="text-slate-600 max-w-xl">
                Curated nutrition, grooming, and prescription-ready essentials
                delivered fast.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/80 px-5 py-3 text-center shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Products
                </p>
                <p className="font-display text-2xl text-slate-900">
                  {filteredProducts.length}
                </p>
              </div>
              <Link
                href="/cart"
                className="relative inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-6 space-y-6">
        <div className="rounded-2xl bg-white/80 p-4 md:p-5 shadow-sm border border-white/70 sticky top-20 z-30">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products, brands, or symptoms"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.2em]">Filters</span>
              </div>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                In stock only
              </label>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${
                    selectedCategory === cat.value
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-primary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card h-80 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white/80 rounded-2xl p-12 text-center border border-white/70">
            <SlidersHorizontal className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 font-semibold">No products found</p>
            <p className="text-slate-500 text-sm mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!isLoading && filteredProducts.length > 0 && (
          <div className="mt-4 rounded-3xl bg-slate-900 text-white px-8 py-10 text-center relative overflow-hidden">
            <div className="absolute -top-12 right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <h2 className="font-display text-2xl md:text-3xl mb-2">
              Need prescription medicines?
            </h2>
            <p className="text-white/80 mb-6">
              Upload a valid prescription to purchase restricted pet medications.
            </p>
            <Link
              href="/appointments"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-semibold rounded-full hover:bg-white/90 transition-colors"
            >
              Book Vet Consultation
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
