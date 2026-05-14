"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase/session";
import { Upload, X, Loader2 } from "lucide-react";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    condition: "New",
    size: "",
    price: "",
    categoryId: "",
    description: "",
    colorway: "",
    releaseYear: "",
    authenticated: false,
    status: "draft",
    sku: "",
    stock_quantity: "1",
    track_inventory: true,
  });

  useEffect(() => {
    const loadData = async () => {
      const token = await getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const [productRes, categoriesRes] = await Promise.all([
        fetch(`/api/products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/categories"),
      ]);

      const productData = await productRes.json();
      const categoriesData = await categoriesRes.json();

      if (!productRes.ok || !productData.product) {
        alert("Product not found");
        router.push("/dashboard");
        return;
      }

      const product = productData.product;
      setFormData({
        name: product.name || "",
        brand: product.brand || "",
        condition: product.condition || "New",
        size: product.size || "",
        price: product.price?.toString() || "",
        categoryId: product.category_id || "",
        description: product.description || "",
        colorway: product.colorway || "",
        releaseYear: product.release_year?.toString() || "",
        authenticated: product.authenticated || false,
        status: product.status || "draft",
        sku: product.sku ?? "",
        stock_quantity:
          product.stock_quantity != null ? String(product.stock_quantity) : "1",
        track_inventory: product.track_inventory !== false,
      });
      setImages(product.images?.map((img: any) => img.url) || []);
      setCategories(categoriesData.categories || []);
      setLoading(false);
    };

    loadData();
  }, [productId, router]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const token = await getAccessToken();
    if (!token) {
      alert("Please sign in to upload images");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.url) {
        setImages([...images, data.url]);
      } else {
        alert(data.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const token = await getAccessToken();
    if (!token) {
      alert("Please sign in to update product");
      setSaving(false);
      return;
    }

    try {
      // Update product
      const productResponse = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          brand: formData.brand,
          condition: formData.condition,
          size: formData.size,
          price: parseFloat(formData.price),
          category_id: formData.categoryId || null,
          description: formData.description,
          colorway: formData.colorway,
          release_year: formData.releaseYear ? parseInt(formData.releaseYear) : null,
          authenticated: formData.authenticated,
          status: formData.status,
          sku: formData.sku.trim() || null,
          stock_quantity: Math.max(0, parseInt(formData.stock_quantity || "0", 10) || 0),
          track_inventory: formData.track_inventory,
        }),
      });

      if (!productResponse.ok) {
        const data = await productResponse.json();
        alert(data.error || "Failed to update product");
        setSaving(false);
        return;
      }

      // Update images (delete old, insert new)
      // Note: This is simplified - in production you'd want to track which images are new vs existing
      const imagesResponse = await fetch(`/api/products/${productId}/images`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ images }),
      });

      if (!imagesResponse.ok) {
        console.warn("Failed to update images, but product was updated");
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-24">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-white/60">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-24">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="font-serif text-4xl mb-8 font-bold">
          <span className="text-gradient-luxury">Edit Listing</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Images */}
          <div>
            <label className="block text-white/60 text-sm mb-4">Product Images</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {images.map((url, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {images.length < 8 && (
                <label className="aspect-square border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-gold transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-white/40" />
                  )}
                </label>
              )}
            </div>
            <p className="text-white/40 text-xs">Upload up to 8 images (max 10MB each)</p>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/60 text-sm mb-2">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Brand *</label>
              <input
                type="text"
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Condition *</label>
              <select
                required
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              >
                <option value="New">New</option>
                <option value="Excellent">Excellent</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
              </select>
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Size *</label>
              <input
                type="text"
                required
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Price (£) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">SKU (optional)</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Stock quantity</label>
              <input
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="track-inv-edit"
                type="checkbox"
                checked={formData.track_inventory}
                onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                className="h-4 w-4 accent-gold"
              />
              <label htmlFor="track-inv-edit" className="text-white/70 text-sm">
                Track inventory
              </label>
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              >
                <option value="draft">Draft</option>
                <option value="under_review">Under Review</option>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Colorway</label>
              <input
                type="text"
                value={formData.colorway}
                onChange={(e) => setFormData({ ...formData, colorway: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Release Year</label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.releaseYear}
                onChange={(e) => setFormData({ ...formData, releaseYear: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-white/60 text-sm mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving || uploading}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
