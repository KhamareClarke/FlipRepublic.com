"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase/session";
import { Upload, X, Loader2 } from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    sku: "",
    stock_quantity: "1",
    track_inventory: true,
  });

  useEffect(() => {
    const loadCategories = async () => {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.categories ?? []);
    };
    loadCategories();
  }, []);

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
    setLoading(true);

    const token = await getAccessToken();
    if (!token) {
      alert("Please sign in to create a product");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          categoryId: formData.categoryId || null,
          releaseYear: formData.releaseYear ? parseInt(formData.releaseYear) : null,
          images,
          sku: formData.sku.trim() || null,
          stock_quantity: Math.max(0, parseInt(formData.stock_quantity || "1", 10) || 1),
          track_inventory: formData.track_inventory,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/dashboard");
      } else {
        alert(data.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="font-serif text-3xl sm:text-4xl mb-6 sm:mb-8 font-bold">
          <span className="text-gradient-luxury">Create New Listing</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Images */}
          <div>
            <label className="block text-white/60 text-sm mb-3 sm:mb-4">Product Images</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-white/60 text-sm mb-2">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
                placeholder="e.g., Air Jordan 1 Retro High OG"
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
                placeholder="e.g., Nike, Adidas"
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
                placeholder="e.g., UK 9, M, One Size"
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
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">SKU (optional)</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full bg-black border border-white/20 px-4 py-3 text-white focus:border-gold focus:outline-none transition-colors"
                placeholder="Unique per seller"
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

            <div className="flex items-center gap-3 md:col-span-2">
              <input
                id="track-inv-new"
                type="checkbox"
                checked={formData.track_inventory}
                onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                className="h-4 w-4 accent-gold"
              />
              <label htmlFor="track-inv-new" className="text-white/70 text-sm">
                Track inventory (uncheck for display-only / unlimited listings)
              </label>
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
                placeholder="e.g., Bred, Chicago"
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
                placeholder="2024"
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
              placeholder="Describe the product, its condition, and any notable features..."
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading || uploading} className="w-full sm:w-auto">
              {loading ? "Creating..." : "Create Listing"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
