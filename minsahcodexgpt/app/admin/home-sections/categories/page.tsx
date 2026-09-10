'use client';





import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit, Trash2, Save, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { defaultCategories } from '@/lib/homeData';
import { HomeSectionCategory } from '@/types/admin';

export default function CategoriesManagementPage() {
  const { pushToast, requestConfirmation } = useToast();
  const [categories, setCategories] = useState<HomeSectionCategory[]>(defaultCategories);
  const [editingCategory, setEditingCategory] = useState<HomeSectionCategory | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState<Partial<HomeSectionCategory>>({
    name: '',
    icon: 'ICON',
    color: 'bg-admin-panel',
    isVisible: true,
  });

  // Load from database on mount
  useEffect(() => {
    fetch('/api/admin/site-config?key=homeCategories')
      .then(res => res.json())
      .then(data => {
        if (data.value) {
          setCategories(data.value);
        }
      })
      .catch(() => {
        // keep default categories on error
      });
  }, []);

  // Save to database via API
  const saveCategories = async () => {
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'homeCategories', value: categories }),
      });
      if (!res.ok) throw new Error('Save failed');
      pushToast({ tone: 'success', description: 'Categories saved successfully!' });
    } catch {
      pushToast({ tone: 'danger', description: 'Failed to save changes. Please try again.' });
    }
  };

  // Add new category
  const addCategory = () => {
    if (!newCategory.name) {
      pushToast({ tone: 'danger', description: 'Please enter a category name' });
      return;
    }

    const category: HomeSectionCategory = {
      id: `cat-${Date.now()}`,
      name: newCategory.name!,
      slug: newCategory.name!.toLowerCase().replace(/\s+/g, '-'),
      icon: newCategory.icon!,
      color: newCategory.color!,
      isVisible: newCategory.isVisible!,
      order: categories.length + 1,
      productCount: 0,
    };

    setCategories([...categories, category]);
    setNewCategory({ name: '', icon: 'ICON', color: 'bg-admin-panel', isVisible: true });
    setShowAddForm(false);
  };

  // Toggle visibility
  const toggleVisibility = (id: string) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, isVisible: !cat.isVisible } : cat
    ));
  };

  // Delete category
  const deleteCategory = async (id: string) => {
    if (await requestConfirmation({ title: 'Delete this homepage category?', description: 'The category will be removed from the homepage configuration.', confirmLabel: 'Delete category', tone: 'danger' })) {
      setCategories(categories.filter(cat => cat.id !== id));
    }
  };

  // Move category
  const moveCategory = (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(cat => cat.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return;
    }

    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];

    newCategories.forEach((cat, i) => {
      cat.order = i + 1;
    });

    setCategories(newCategories);
  };

  // Update category
  const updateCategory = (id: string, updates: Partial<HomeSectionCategory>) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    ));
  };

  const colorOptions = [
    'bg-admin-panel',
    'bg-[#5e6ad2]/20',
    'bg-admin-panel',
    'bg-amber-500/10',
    'bg-emerald-500/10',
    'bg-red-100',
    'bg-orange-100',
    'bg-teal-100',
  ];

  const iconOptions = ['MAKEUP', 'SKIN', 'HAIR', 'FRAG', 'TOOL', 'FACE', 'EYE', 'LIP', 'NAIL', 'BODY', 'CARE', 'GIFT'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/home-sections" className="p-2 hover:bg-[#161824] rounded-lg transition">
            <ArrowLeft size={24} className="text-[#f7f8f8]" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#f7f8f8]">Manage Categories</h1>
            <p className="text-[#8a8f98] mt-1">Add, edit, or remove product categories</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
          >
            <Plus size={20} />
            Add Category
          </Button>
          <Button
            onClick={saveCategories}
            className="flex items-center gap-2 px-4 py-2 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-lg transition text-sm font-medium"
          >
            <Save size={20} />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Add Category Form */}
      {showAddForm && (
        <div className="bg-[#161824] border border-[#232636] p-6 rounded-xl shadow-sm mb-6">
          <h3 className="text-xl font-bold text-[#F7F8F8] mb-4">Add New Category</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#8A8F98] mb-2">Name</label>
              <Input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:outline-none focus:border-white"
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8A8F98] mb-2">Icon</label>
              <Select
                value={newCategory.icon}
                onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                className="w-full px-3 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:outline-none focus:border-white"
              >
                {iconOptions.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8A8F98] mb-2">Color</label>
              <Select
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                className="w-full px-3 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:outline-none focus:border-white"
              >
                {colorOptions.map(color => (
                  <option key={color} value={color}>{color.replace('bg-', '').replace('-100', '')}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={addCategory}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
              >
                Add Category
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-[#161824] border border-[#232636] rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#10121b] border-b border-[#232636] text-[#8A8F98] px-6 py-4 flex items-center gap-4 text-sm font-medium">
          <span className="w-16 text-center font-semibold">Icon</span>
          <span className="flex-1 font-semibold">Name</span>
          <span className="w-32 text-center font-semibold">Color</span>
          <span className="w-24 text-center font-semibold">Products</span>
          <span className="w-24 text-center font-semibold">Visibility</span>
          <span className="w-48 text-center font-semibold">Actions</span>
        </div>

        <div className="divide-y divide-[#232636] bg-[#161824]">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className={`px-6 py-4 flex items-center gap-4 ${
                !category.isVisible ? 'bg-[#10121b]/50 opacity-60' : 'hover:bg-[#1b1e2c]/70'
              }`}
            >
              {/* Icon */}
              <div className={`w-16 h-16 ${category.color} rounded-full flex items-center justify-center text-xs font-bold`}>
                {category.icon}
              </div>

              {/* Name */}
              <div className="flex-1">
                <Input
                  type="text"
                  value={category.name}
                  onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                  className="font-semibold text-lg text-[#F7F8F8] bg-transparent border-b border-transparent hover:border-white focus:border-white focus:outline-none transition w-full"
                />
                <div className="text-xs text-[#8A8F98] mt-1">
                  Slug: {category.slug} | Order: #{category.order}
                </div>
              </div>

              {/* Color */}
              <div className="w-32">
                <Select
                  value={category.color}
                  onChange={(e) => updateCategory(category.id, { color: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded focus:outline-none focus:border-white"
                >
                  {colorOptions.map(color => (
                    <option key={color} value={color}>{color.replace('bg-', '')}</option>
                  ))}
                </Select>
              </div>

              {/* Product Count */}
              <div className="w-24 text-center text-[#8A8F98]">
                {category.productCount || 0}
              </div>

              {/* Visibility */}
              <div className="w-24 flex justify-center">
                <Button
                  onClick={() => toggleVisibility(category.id)}
                  className={`p-2 rounded-lg transition ${
                    category.isVisible
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-green-200'
                      : 'bg-white/[0.12] text-[#8a8f98] hover:bg-white/[0.16]'
                  }`}
                >
                  {category.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                </Button>
              </div>

              {/* Actions */}
              <div className="w-48 flex items-center justify-center gap-2">
                <Button
                  onClick={() => moveCategory(category.id, 'up')}
                  disabled={index === 0}
                  className="p-2 rounded hover:bg-[#10121b] text-[#F7F8F8] border border-transparent hover:border-[#232636] disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronUp size={18} />
                </Button>
                <Button
                  onClick={() => moveCategory(category.id, 'down')}
                  disabled={index === categories.length - 1}
                  className="p-2 rounded hover:bg-[#10121b] text-[#F7F8F8] border border-transparent hover:border-[#232636] disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronDown size={18} />
                </Button>
                <Button
                  onClick={() => deleteCategory(category.id)}
                  className="p-2 rounded hover:bg-red-950/60 text-white/60 border border-transparent hover:border-red-800/40 transition"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
