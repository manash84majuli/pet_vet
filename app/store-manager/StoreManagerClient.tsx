"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  adjustInventoryBulk,
  adjustInventory,
  createService,
  createProduct,
  getProductsCsv,
  updateOrderStatus,
  updateService,
  updateProduct,
} from "@/actions/store-manager";
import { createBrowserClient } from "@/lib/supabase";
import { OrderStatus, OrderWithItems, Product, Service, UserRole } from "@/lib/types";

interface StoreManagerClientProps {
  products: Product[];
  services: Service[];
  orders: OrderWithItems[];
  userRole: UserRole;
  currentPage: number;
  totalProducts: number;
  totalServices: number;
  totalOrders: number;
  pageSize: number;
}

const emptyProduct: Product = {
  id: "",
  name: "",
  slug: "",
  description: "",
  price_inr: 0,
  stock: 0,
  requires_prescription: false,
  image_url: "",
  category: "",
  is_active: true,
  created_at: "",
  updated_at: "",
};

const emptyService: Service = {
  id: "",
  name: "",
  description: "",
  price_inr: 0,
  is_active: true,
  created_at: "",
  updated_at: "",
};

export default function StoreManagerClient({
  products,
  services,
  orders,
  userRole,
  currentPage,
  totalProducts,
  totalServices,
  totalOrders,
  pageSize,
}: StoreManagerClientProps) {
  const [items, setItems] = useState(products);
  const [serviceItems, setServiceItems] = useState(services);
  const [orderItems, setOrderItems] = useState(orders);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [newService, setNewService] = useState(emptyService);
  const [activeTab, setActiveTab] = useState<
    "products" | "services" | "inventory" | "orders"
  >("products");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [inventoryDelta, setInventoryDelta] = useState<Record<string, number>>({});
  const [inventoryReason, setInventoryReason] = useState<Record<string, string>>({});
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [bulkDelta, setBulkDelta] = useState(0);
  const [bulkReason, setBulkReason] = useState("");
  const [scanInputs, setScanInputs] = useState<Record<string, string>>({});
  const [rowDiscount, setRowDiscount] = useState<Record<string, number>>({});
  const [newDiscount, setNewDiscount] = useState(0);
  const [isCsvBusy, setIsCsvBusy] = useState(false);
  const [orderStatusDraft, setOrderStatusDraft] = useState<Record<string, OrderStatus>>(
    () => Object.fromEntries(orders.map((order) => [order.id, order.order_status]))
  );
  const [orderNote, setOrderNote] = useState<Record<string, string>>({});
  const supabase = useMemo(() => createBrowserClient(), []);

  const canEdit = useMemo(
    () => userRole === UserRole.ADMIN || userRole === UserRole.STORE_MANAGER,
    [userRole]
  );

  const totalPages = useMemo(() => {
    if (activeTab === "products") return Math.ceil(totalProducts / pageSize);
    if (activeTab === "services") return Math.ceil(totalServices / pageSize);
    if (activeTab === "orders") return Math.ceil(totalOrders / pageSize);
    if (activeTab === "inventory") return Math.ceil(totalProducts / pageSize);
    return 1;
  }, [
    activeTab,
    totalProducts,
    totalServices,
    totalOrders,
    pageSize,
  ]);

  const handleNewChange = (field: keyof Product, value: string | number | boolean) => {
    setNewProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowChange = (
    id: string,
    field: keyof Product,
    value: string | number | boolean
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleServiceChange = (
    id: string,
    field: keyof Service,
    value: string | number | boolean
  ) => {
    setServiceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleCreate = () => {
    setStatus(null);
    startTransition(async () => {
      const result = await createProduct({
        name: newProduct.name,
        slug: newProduct.slug,
        description: newProduct.description || undefined,
        price_inr: Number(newProduct.price_inr),
        stock: Number(newProduct.stock),
        requires_prescription: newProduct.requires_prescription,
        image_url: newProduct.image_url || undefined,
        category: newProduct.category || undefined,
        is_active: newProduct.is_active,
      });

      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setItems((prev) => [result.data, ...prev]);
      setNewProduct(emptyProduct);
      setStatus("Product created.");
    });
  };

  const handleUpdate = (product: Product) => {
    setStatus(null);
    startTransition(async () => {
      const result = await updateProduct({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || undefined,
        price_inr: Number(product.price_inr),
        stock: Number(product.stock),
        requires_prescription: product.requires_prescription,
        image_url: product.image_url || undefined,
        category: product.category || undefined,
        is_active: product.is_active,
      });

      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setItems((prev) =>
        prev.map((item) => (item.id === product.id ? result.data : item))
      );
      setStatus("Product updated.");
    });
  };

  const handleApplyDiscount = (productId: string) => {
    const discount = rowDiscount[productId] || 0;
    if (discount <= 0 || discount >= 100) {
      setStatus("Discount must be between 1 and 99");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              price_inr: Math.max(1, Math.round(item.price_inr * (1 - discount / 100))),
            }
          : item
      )
    );
  };

  const handleServiceCreate = () => {
    setStatus(null);
    startTransition(async () => {
      const result = await createService({
        name: newService.name,
        description: newService.description || undefined,
        price_inr: Number(newService.price_inr),
        is_active: newService.is_active,
      });

      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setServiceItems((prev) => [result.data, ...prev]);
      setNewService(emptyService);
      setStatus("Service created.");
    });
  };

  const handleServiceUpdate = (service: Service) => {
    setStatus(null);
    startTransition(async () => {
      const result = await updateService({
        id: service.id,
        name: service.name,
        description: service.description || undefined,
        price_inr: Number(service.price_inr),
        is_active: service.is_active,
      });

      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setServiceItems((prev) =>
        prev.map((item) => (item.id === service.id ? result.data : item))
      );
      setStatus("Service updated.");
    });
  };

  const handleApplyNewDiscount = () => {
    if (newDiscount <= 0 || newDiscount >= 100) {
      setStatus("Discount must be between 1 and 99");
      return;
    }

    setNewProduct((prev) => ({
      ...prev,
      price_inr: Math.max(1, Math.round(prev.price_inr * (1 - newDiscount / 100))),
    }));
  };

  const validateImageFile = (file: File) => {
    const MAX_SIZE = 2 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only JPG, PNG, or WebP images are allowed.";
    }

    if (file.size > MAX_SIZE) {
      return "Image must be under 2 MB.";
    }

    return null;
  };

  const uploadProductImage = async (file: File, slug: string) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const filePath = `${slug}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      const msg = uploadError.message || "Upload failed";
      if (msg.includes("Bucket not found")) {
        throw new Error("Storage bucket 'product-images' not configured. Create it in Supabase Dashboard → Storage.");
      }
      if (msg.includes("security") || msg.includes("policy") || msg.includes("row-level")) {
        throw new Error("Permission denied. Check storage RLS policies in Supabase.");
      }
      throw uploadError;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleNewImage = async (file: File | null) => {
    if (!file || !newProduct.slug) {
      setStatus("Add a slug before uploading an image.");
      return;
    }

    try {
      const url = await uploadProductImage(file, newProduct.slug);
      setNewProduct((prev) => ({ ...prev, image_url: url }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Image upload failed");
    }
  };

  const handleRowImage = async (productId: string, file: File | null) => {
    const product = items.find((item) => item.id === productId);
    if (!product || !file) return;

    try {
      const url = await uploadProductImage(file, product.slug);
      setItems((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, image_url: url } : item))
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Image upload failed");
    }
  };

  const handleInventoryAdjust = (productId: string) => {
    const delta = Number(inventoryDelta[productId] || 0);
    const reason = (inventoryReason[productId] || "").trim();

    if (!delta || !reason) {
      setStatus("Provide an adjustment and reason.");
      return;
    }

    setStatus(null);
    startTransition(async () => {
      const result = await adjustInventory(productId, delta, reason);
      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setItems((prev) =>
        prev.map((item) => (item.id === productId ? result.data : item))
      );
      setInventoryDelta((prev) => ({ ...prev, [productId]: 0 }));
      setInventoryReason((prev) => ({ ...prev, [productId]: "" }));
      setStatus("Inventory adjusted.");
    });
  };

  const handleInventoryScan = (product: Product) => {
    const code = (scanInputs[product.id] || "").trim().toLowerCase();
    if (!code) return;

    const productSlug = (product.slug || "").toLowerCase();
    const productId = product.id.toLowerCase();
    const matches = code === productSlug || code === productId;
    if (!matches) {
      setStatus(`Barcode does not match ${product.name}.`);
    } else {
      setBulkSelected((prev) => ({ ...prev, [product.id]: true }));
      setStatus(null);
    }

    setScanInputs((prev) => ({ ...prev, [product.id]: "" }));
  };

  const handleBulkAdjust = () => {
    const selectedIds = Object.keys(bulkSelected).filter((id) => bulkSelected[id]);
    if (!selectedIds.length) {
      setStatus("Select at least one product.");
      return;
    }

    if (!bulkDelta || bulkReason.trim().length < 3) {
      setStatus("Provide a non-zero adjustment and reason.");
      return;
    }

    setStatus(null);
    startTransition(async () => {
      const result = await adjustInventoryBulk(
        selectedIds.map((id) => ({
          product_id: id,
          delta: bulkDelta,
          reason: bulkReason,
        }))
      );

      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setItems((prev) => {
        const updatedMap = new Map(result.data.map((item) => [item.id, item]));
        return prev.map((item) => updatedMap.get(item.id) || item);
      });
      setBulkDelta(0);
      setBulkReason("");
      setStatus("Inventory adjusted for selected products.");
    });
  };

  const handleOrderStatus = (orderId: string, statusValue: OrderStatus) => {
    setStatus(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, statusValue, orderNote[orderId]);
      if (!result.success) {
        setStatus(result.error);
        return;
      }

      setOrderItems((prev) =>
        prev.map((order) => (order.id === orderId ? result.data : order))
      );
      setOrderStatusDraft((prev) => ({ ...prev, [orderId]: statusValue }));
      setOrderNote((prev) => ({ ...prev, [orderId]: "" }));
      setStatus("Order status updated.");
    });
  };

  const downloadCsv = async () => {
    setIsCsvBusy(true);
    const result = await getProductsCsv();
    setIsCsvBusy(false);

    if (!result.success) {
      setStatus(result.error);
      return;
    }

    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  const handleCsvImport = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    if (!headerLine) return;

    const headers = parseCsvLine(headerLine).map((h) => h.trim().replace(/^"|"$/g, ""));
    const records = lines.map((line) => {
      const values = parseCsvLine(line).map((value) => value.replace(/^"|"$/g, ""));
      return headers.reduce<Record<string, string>>((acc, key, index) => {
        acc[key] = values[index] || "";
        return acc;
      }, {});
    });

    for (const record of records) {
      const payload = {
        name: record.name || "",
        slug: record.slug || "",
        price_inr: Number(record.price_inr || 0),
        stock: Number(record.stock || 0),
        requires_prescription: record.requires_prescription === "true",
        is_active: record.is_active !== "false",
        category: record.category || undefined,
        description: record.description || undefined,
        image_url: record.image_url || undefined,
      };

      const existing = items.find((item) => item.slug === payload.slug);
      const result = existing
        ? await updateProduct({ ...payload, id: existing.id })
        : await createProduct(payload);

      if (result.success) {
        setItems((prev) => {
          const filtered = prev.filter((item) => item.id !== result.data.id);
          return [result.data, ...filtered];
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-emerald-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Store Manager</h1>
          <p className="text-gray-600 mt-2">Manage products and view orders</p>
        </header>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "products", label: "Products" },
            { key: "services", label: "Services" },
            { key: "inventory", label: "Inventory" },
            { key: "orders", label: "Orders" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                activeTab === tab.key
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-700 border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {status && (
          <div className="p-3 rounded-lg bg-white shadow text-sm text-gray-700">
            {status}
          </div>
        )}

        {activeTab === "products" && (
          <div className="space-y-6">
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">New Product</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Name"
                  value={newProduct.name}
                  onChange={(event) => handleNewChange("name", event.target.value)}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Slug"
                  value={newProduct.slug}
                  onChange={(event) => handleNewChange("slug", event.target.value)}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Category"
                  value={newProduct.category || ""}
                  onChange={(event) => handleNewChange("category", event.target.value)}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Image URL"
                  value={newProduct.image_url || ""}
                  onChange={(event) => handleNewChange("image_url", event.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="border rounded px-3 py-2 text-sm"
                  onChange={(event) => handleNewImage(event.target.files?.[0] || null)}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Price"
                  type="number"
                  value={newProduct.price_inr}
                  onChange={(event) => handleNewChange("price_inr", Number(event.target.value))}
                />
                <div className="flex gap-2">
                  <input
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="Discount %"
                    type="number"
                    value={newDiscount}
                    onChange={(event) => setNewDiscount(Number(event.target.value))}
                  />
                  <button
                    type="button"
                    onClick={handleApplyNewDiscount}
                    className="px-3 py-2 rounded border text-sm"
                  >
                    Apply
                  </button>
                </div>
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Stock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(event) => handleNewChange("stock", Number(event.target.value))}
                />
                <input
                  className="border rounded px-3 py-2 text-sm md:col-span-2"
                  placeholder="Description"
                  value={newProduct.description || ""}
                  onChange={(event) => handleNewChange("description", event.target.value)}
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newProduct.requires_prescription}
                    onChange={(event) =>
                      handleNewChange("requires_prescription", event.target.checked)
                    }
                  />
                  Requires prescription
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newProduct.is_active}
                    onChange={(event) => handleNewChange("is_active", event.target.checked)}
                  />
                  Active
                </label>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canEdit || isPending}
                className="mt-4 px-4 py-2 rounded bg-orange-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                Create Product
              </button>
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Products</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={isCsvBusy}
                  className="px-3 py-2 rounded border text-sm"
                >
                  {isCsvBusy ? "Exporting..." : "Export CSV"}
                </button>
                <label className="px-3 py-2 rounded border text-sm cursor-pointer">
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(event) => handleCsvImport(event.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Slug</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Stock</th>
                      <th className="px-3 py-2">Image</th>
                      <th className="px-3 py-2">Active</th>
                      <th className="px-3 py-2">Prescription</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((product) => (
                      <tr key={product.id}>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded px-2 py-1 text-sm w-full"
                            value={product.name}
                            onChange={(event) =>
                              handleRowChange(product.id, "name", event.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded px-2 py-1 text-sm w-full"
                            value={product.slug}
                            onChange={(event) =>
                              handleRowChange(product.id, "slug", event.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="border rounded px-2 py-1 text-sm w-24"
                            value={product.price_inr}
                            onChange={(event) =>
                              handleRowChange(
                                product.id,
                                "price_inr",
                                Number(event.target.value)
                              )
                            }
                          />
                          <div className="flex gap-2 mt-2">
                            <input
                              type="number"
                              className="border rounded px-2 py-1 text-xs w-20"
                              placeholder="%"
                              value={rowDiscount[product.id] || ""}
                              onChange={(event) =>
                                setRowDiscount((prev) => ({
                                  ...prev,
                                  [product.id]: Number(event.target.value),
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyDiscount(product.id)}
                              className="px-2 py-1 rounded border text-xs"
                            >
                              Apply
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="border rounded px-2 py-1 text-sm w-20"
                            value={product.stock}
                            onChange={(event) =>
                              handleRowChange(
                                product.id,
                                "stock",
                                Number(event.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-2">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                handleRowImage(product.id, event.target.files?.[0] || null)
                              }
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={product.is_active}
                            onChange={(event) =>
                              handleRowChange(product.id, "is_active", event.target.checked)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={product.requires_prescription}
                            onChange={(event) =>
                              handleRowChange(
                                product.id,
                                "requires_prescription",
                                event.target.checked
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleUpdate(product)}
                            disabled={!canEdit || isPending}
                            className="px-3 py-1 rounded bg-emerald-500 text-white text-xs font-semibold disabled:opacity-60"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === "services" && (
          <div className="space-y-6">
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">New Service</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Name"
                  value={newService.name}
                  onChange={(event) =>
                    setNewService((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Price"
                  type="number"
                  value={newService.price_inr}
                  onChange={(event) =>
                    setNewService((prev) => ({
                      ...prev,
                      price_inr: Number(event.target.value),
                    }))
                  }
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newService.is_active}
                    onChange={(event) =>
                      setNewService((prev) => ({
                        ...prev,
                        is_active: event.target.checked,
                      }))
                    }
                  />
                  Active
                </label>
                <input
                  className="border rounded px-3 py-2 text-sm md:col-span-3"
                  placeholder="Description"
                  value={newService.description || ""}
                  onChange={(event) =>
                    setNewService((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <button
                type="button"
                onClick={handleServiceCreate}
                disabled={!canEdit || isPending}
                className="mt-4 px-4 py-2 rounded bg-orange-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                Create Service
              </button>
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Active</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {serviceItems.map((service) => (
                      <tr key={service.id}>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded px-2 py-1 text-sm w-full"
                            value={service.name}
                            onChange={(event) =>
                              handleServiceChange(service.id, "name", event.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="border rounded px-2 py-1 text-sm w-24"
                            value={service.price_inr}
                            onChange={(event) =>
                              handleServiceChange(
                                service.id,
                                "price_inr",
                                Number(event.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={service.is_active}
                            onChange={(event) =>
                              handleServiceChange(
                                service.id,
                                "is_active",
                                event.target.checked
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded px-2 py-1 text-sm w-full"
                            value={service.description || ""}
                            onChange={(event) =>
                              handleServiceChange(
                                service.id,
                                "description",
                                event.target.value
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleServiceUpdate(service)}
                            disabled={!canEdit || isPending}
                            className="px-3 py-1 rounded bg-emerald-500 text-white text-xs font-semibold disabled:opacity-60"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === "inventory" && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory</h2>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <label className="text-sm text-gray-600">Bulk adjustment</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-24"
                value={bulkDelta}
                onChange={(event) => setBulkDelta(Number(event.target.value))}
              />
              <input
                className="border rounded px-2 py-1 text-sm w-64"
                placeholder="Reason"
                value={bulkReason}
                onChange={(event) => setBulkReason(event.target.value)}
              />
              <button
                type="button"
                onClick={handleBulkAdjust}
                disabled={!canEdit || isPending}
                className="px-3 py-1 rounded bg-orange-500 text-white text-xs font-semibold disabled:opacity-60"
              >
                Apply to Selected
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-gray-600">Low stock threshold</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-24"
                value={lowStockThreshold}
                onChange={(event) => setLowStockThreshold(Number(event.target.value))}
              />
              <span className="text-xs text-gray-500">Scan per row to auto-select.</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setBulkSelected(
                            items.reduce<Record<string, boolean>>((acc, item) => {
                              acc[item.id] = checked;
                              return acc;
                            }, {})
                          );
                        }}
                      />
                    </th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Scan</th>
                    <th className="px-3 py-2">Adjust</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((product) => (
                    <tr
                      key={product.id}
                      className={
                        product.stock < lowStockThreshold ? "bg-red-50" : ""
                      }
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={bulkSelected[product.id] || false}
                          onChange={(event) =>
                            setBulkSelected((prev) => ({
                              ...prev,
                              [product.id]: event.target.checked,
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">{product.name}</td>
                      <td className="px-3 py-2">{product.stock}</td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 text-sm w-full"
                          placeholder="Scan barcode..."
                          value={scanInputs[product.id] || ""}
                          onChange={(event) =>
                            setScanInputs((prev) => ({
                              ...prev,
                              [product.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleInventoryScan(product);
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="border rounded px-2 py-1 text-sm w-24"
                          value={inventoryDelta[product.id] || ""}
                          onChange={(event) =>
                            setInventoryDelta((prev) => ({
                              ...prev,
                              [product.id]: Number(event.target.value),
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 text-sm w-full"
                          placeholder="Reason"
                          value={inventoryReason[product.id] || ""}
                          onChange={(event) =>
                            setInventoryReason((prev) => ({
                              ...prev,
                              [product.id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleInventoryAdjust(product.id)}
                          disabled={!canEdit || isPending}
                          className="px-3 py-1 rounded bg-emerald-500 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "orders" && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Order ID</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orderItems.map((order) => (
                    <tr key={order.id}>
                      <td className="px-3 py-2 font-mono text-xs">{order.id}</td>
                      <td className="px-3 py-2">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        {order.shipping_address_json.name}
                      </td>
                      <td className="px-3 py-2">
                        ₹{order.total_amount_inr.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={orderStatusDraft[order.id]}
                          onChange={(event) =>
                            setOrderStatusDraft((prev) => ({
                              ...prev,
                              [order.id]: event.target.value as OrderStatus,
                            }))
                          }
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {Object.values(OrderStatus).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 text-sm w-full"
                          placeholder="Add a note..."
                          value={orderNote[order.id] || ""}
                          onChange={(event) =>
                            setOrderNote((prev) => ({
                              ...prev,
                              [order.id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleOrderStatus(order.id, orderStatusDraft[order.id])
                          }
                          disabled={
                            !canEdit ||
                            isPending ||
                            orderStatusDraft[order.id] === order.order_status
                          }
                          className="px-3 py-1 rounded bg-emerald-500 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4">
            <Link
              href={`/store-manager?page=${Math.max(1, currentPage - 1)}`}
              className={`px-4 py-2 rounded text-sm font-semibold ${
                currentPage === 1
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-white border"
              }`}
            >
              Previous
            </Link>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={`/store-manager?page=${Math.min(
                totalPages,
                currentPage + 1
              )}`}
              className={`px-4 py-2 rounded text-sm font-semibold ${
                currentPage === totalPages
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-white border"
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
