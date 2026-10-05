'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ListOrdered,
  Search,
  Plus,
  Edit2,
  Check,
  X,
  QrCode,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Product } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formHsn, setFormHsn] = useState('');
  const [formGst, setFormGst] = useState('18');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '250', activeOnly: 'false' });
      if (search) params.set('search', search);
      if (selectedCategory) params.set('category', selectedCategory);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPartCode('');
    setFormCategory(categories[0] || 'General');
    setFormUnit('Pcs');
    setFormHsn('');
    setFormGst('18');
    setFormActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPartCode(p.partCode);
    setFormCategory(p.category);
    setFormUnit(p.unit);
    setFormHsn(p.hsn || '');
    setFormGst(p.gst.toString());
    setFormActive(p.active);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        id: editingProduct ? editingProduct._id?.toString() : undefined,
        name: formName.trim(),
        partCode: formPartCode.trim(),
        category: formCategory.trim(),
        unit: formUnit.trim(),
        hsn: formHsn.trim() || null,
        gst: parseInt(formGst, 10) || 18,
        active: formActive,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save product');
        return;
      }

      setModalOpen(false);
      fetchProducts();
    } catch {
      setFormError('Network error while saving product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-xl font-black text-[#111111] flex items-center gap-2">
            <ListOrdered className="w-5 h-5" />
            Product Master Data ({products.length})
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            146 pre-seeded RO Purifier parts, components, valves, and hardware specifications
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-3 py-1.5 bg-black text-white rounded text-xs font-bold hover:bg-neutral-800 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search and Category Filters */}
      <div className="bg-white border border-[#E5E5E5] rounded p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
            placeholder="Search product name or part code..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-sans"
          />
          <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs px-3 py-2 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
        >
          <option value="">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
        >
          Filter
        </button>
      </div>

      {/* Products Table (Section 34) */}
      <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-[#E5E5E5] text-[#666666] font-semibold">
              <th className="py-2.5 px-3 w-12 font-mono">#</th>
              <th className="py-2.5 px-3">Product Name</th>
              <th className="py-2.5 px-3 font-mono">Part Code</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Unit</th>
              <th className="py-2.5 px-3">GST</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#888888]">
                  Loading products...
                </td>
              </tr>
            ) : products.length > 0 ? (
              products.map((p) => (
                <tr key={p.partCode} className="hover:bg-neutral-50 transition">
                  <td className="py-2.5 px-3 font-mono text-[#888888]">
                    {p.itemNumber}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#111111]">
                    {p.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#555555]">
                    {p.partCode}
                  </td>
                  <td className="py-2.5 px-3 text-[#555555]">
                    {p.category}
                  </td>
                  <td className="py-2.5 px-3 text-[#555555]">
                    {p.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#555555]">
                    {p.gst}%
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.active ? 'bg-neutral-100 text-black' : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1 hover:bg-neutral-200 rounded text-[#111111] inline-block"
                      title="Edit Product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/qr-generator`}
                      className="p-1 hover:bg-neutral-200 rounded text-[#111111] inline-block"
                      title="Generate Serial QR for this product"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#888888]">
                  No products found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded max-w-md w-full p-5 space-y-4 shadow-none animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <h2 className="text-sm font-bold text-[#111111]">
                {editingProduct ? 'Edit Master Product' : 'Add New Master Product'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#666666] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-neutral-100 border border-black rounded text-xs text-black flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#111111] mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Pump (Gen Pure)"
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-sans"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111111] mb-1">Part Code (Unique) *</label>
                <input
                  type="text"
                  required
                  value={formPartCode}
                  onChange={(e) => setFormPartCode(e.target.value)}
                  placeholder="e.g. Pump (Gen Pure) or G1-PART-13"
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#111111] mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    list="category-suggestions"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Pumps"
                    className="w-full px-3 py-2 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-sans"
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">Unit</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="Pcs, Meter, Kg, Set"
                    className="w-full px-3 py-2 border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#111111] mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formHsn}
                    onChange={(e) => setFormHsn(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">GST Rate (%)</label>
                  <select
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black font-mono"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active-checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-[#E5E5E5]"
                />
                <label htmlFor="active-checkbox" className="font-semibold text-[#111111]">
                  Product Active in Warehouse Catalog
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-[#E5E5E5] rounded text-xs font-semibold hover:bg-neutral-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-black text-white rounded text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
