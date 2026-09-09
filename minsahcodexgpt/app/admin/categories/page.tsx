'use client';





import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { useCategories, type Category, type Subcategory } from '@/contexts/CategoriesContext';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Save,
  X,
  Tag,
} from 'lucide-react';
import { clsx } from 'clsx';

interface CategoryFormData {
  name: string;
  status: 'active' | 'inactive';
  subcategories: Subcategory[];
}

export default function CategoriesPage() {
  const { pushToast, requestConfirmation } = useToast();
  const { hasPermission } = useAdminAuth();
  const { categories, saveCategories, refreshCategories } = useCategories();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    status: 'active',
    subcategories: [],
  });
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [editingSubcategoryIndex, setEditingSubcategoryIndex] = useState<number | null>(null);

  if (!hasPermission(PERMISSIONS.CONTENT_MANAGE)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#8A8F98]">You don't have permission to manage categories.</p>
      </div>
    );
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const openAddModal = () => {
    setEditingCategoryId(null);
    setFormData({
      name: '',
      status: 'active',
      subcategories: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategoryId(category.id);
    setFormData({
      name: category.name,
      status: category.status,
      subcategories: category.subcategories,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategoryId(null);
    setNewSubcategoryName('');
    setNewItemName('');
    setEditingSubcategoryIndex(null);
  };

  const handleAddSubcategory = () => {
    if (!newSubcategoryName.trim()) return;

    setFormData(prev => ({
      ...prev,
      subcategories: [...prev.subcategories, { name: newSubcategoryName, items: [] }],
    }));
    setNewSubcategoryName('');
  };

  const handleRemoveSubcategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index),
    }));
  };

  const handleAddItem = (subcategoryIndex: number) => {
    if (!newItemName.trim()) return;

    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((subcat, i) =>
        i === subcategoryIndex
          ? { ...subcat, items: [...subcat.items, newItemName] }
          : subcat
      ),
    }));
    setNewItemName('');
    setEditingSubcategoryIndex(null);
  };

  const handleRemoveItem = (subcategoryIndex: number, itemIndex: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((subcat, i) =>
        i === subcategoryIndex
          ? { ...subcat, items: subcat.items.filter((_, ii) => ii !== itemIndex) }
          : subcat
      ),
    }));
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      pushToast({ tone: 'danger', description: 'Please enter a category name' });
      return;
    }

    try {
      const url = editingCategoryId
        ? `/api/categories/${editingCategoryId}`
        : '/api/categories';
      const method = editingCategoryId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          status: formData.status,
          subcategories: formData.subcategories,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save category');
      }

      await refreshCategories();
      closeModal();
      pushToast({ tone: 'success', description: 'Category saved successfully!' });
    } catch (error) {
      console.error('Error saving category:', error);
      pushToast({ tone: 'danger', description: error instanceof Error ? error.message : 'Failed to save category' });
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

 const handleDeleteCategory = async (categoryId: string) => {
  const category = categories.find(cat => cat.id === categoryId);
  if (!(await requestConfirmation({ title: 'Delete this category?', description: `Deleting “${category?.name ?? 'this category'}” can affect every product assigned to it.`, confirmLabel: 'Delete category', tone: 'danger' }))) {
    return;
  }

  try {
    const res = await fetch(`/api/categories/${categoryId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to delete category');
    
    await refreshCategories();
    pushToast({ tone: 'success', description: 'Category deleted successfully!' });
  } catch (error) {
    console.error('Error deleting category:', error);
    pushToast({ tone: 'danger', description: 'Failed to delete category' });
  }
};

  const getStatusColor = (status: Category['status']) => {
    return status === 'active'
      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
      : 'bg-white/[0.06] text-[#8A8F98] border border-white/[0.08]';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F7F8F8]">Categories Management</h1>
          <p className="text-xs text-[#8A8F98] mt-0.5">Manage product categories, subcategories, and items</p>
        </div>
        <Button
          onClick={openAddModal}
          className="mt-3 sm:mt-0 h-8.5 px-3.5 bg-white text-black font-medium text-xs rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-white/90 active:scale-[0.98] transition-all inline-flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">Total Categories</p>
              <p className="text-xl font-semibold tracking-tight text-[#F7F8F8] mt-1">{categories.length}</p>
            </div>
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Folder className="w-3.5 h-3.5 text-white/70" />
            </div>
          </div>
        </div>
        <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">Total Products</p>
              <p className="text-xl font-semibold tracking-tight text-[#F7F8F8] mt-1">
                {categories.reduce((sum, cat) => sum + cat.productCount, 0)}
              </p>
            </div>
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <FolderOpen className="w-3.5 h-3.5 text-white/70" />
            </div>
          </div>
        </div>
        <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">Active Categories</p>
              <p className="text-xl font-semibold tracking-tight text-[#F7F8F8] mt-1">
                {categories.filter(cat => cat.status === 'active').length}
              </p>
            </div>
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.5)]"></div>
            </div>
          </div>
        </div>
        <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">Total Subcategories</p>
              <p className="text-xl font-semibold tracking-tight text-[#F7F8F8] mt-1">
                {categories.reduce((sum, cat) => sum + cat.subcategories.length, 0)}
              </p>
            </div>
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Tag className="w-3.5 h-3.5 text-white/70" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-3 mb-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#62666D]" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-white/[0.08] bg-[#0D0E11] text-xs text-[#F7F8F8] placeholder-[#62666D] rounded-lg focus:ring-1 focus:ring-white/20 focus:border-white/20"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#08090A] border-b border-white/[0.08]">
              <tr>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Subcategories
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Products
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3.5 py-2.5 text-right text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#08090A] divide-y divide-white/[0.06]">
              {filteredCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category.id);
                return (
                  <React.Fragment key={category.id}>
                    <tr className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center">
                          <Button
                            onClick={() => toggleExpanded(category.id)}
                            className="mr-1.5 p-1 hover:bg-white/[0.06] rounded text-[#8A8F98] active:scale-[0.95] transition-transform"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[#8A8F98]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-[#8A8F98]" />
                            )}
                          </Button>
                          <div>
                            <div className="text-xs font-medium text-[#F7F8F8]">{category.name}</div>
                            <div className="text-[10px] text-[#62666D]">Created: {new Date(category.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#8A8F98] font-mono">{category.slug}</td>
                      <td className="px-3.5 py-2.5 text-xs text-[#F7F8F8]">{category.subcategories.length}</td>
                      <td className="px-3.5 py-2.5 text-xs text-[#F7F8F8]">{category.productCount}</td>
                      <td className="px-3.5 py-2.5">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium leading-none capitalize',
                          getStatusColor(category.status)
                        )}>
                          {category.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => openEditModal(category)}
                            className="h-7 w-7 p-0 flex items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.05] text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] active:scale-[0.97] transition-all"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="h-7 w-7 p-0 flex items-center justify-center rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-[0.97] transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${category.id}-expanded`}>
                        <td colSpan={6} className="px-5 py-3.5 bg-[#0D0E11] border-y border-white/[0.06]">
                          <div className="space-y-3">
                            <h4 className="text-xs font-medium text-[#F7F8F8]">Subcategories & Items</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                              {category.subcategories.map((subcat, index) => (
                                <div key={index} className="border border-white/[0.08] rounded-lg p-3 bg-[#08090A] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                                  <h5 className="text-xs font-semibold text-[#F7F8F8] mb-1.5 flex items-center">
                                    <Tag className="w-3 h-3 mr-1.5 text-white/70" />
                                    {subcat.name}
                                  </h5>
                                  <ul className="space-y-1">
                                    {subcat.items.map((item, itemIndex) => (
                                      <li key={itemIndex} className="text-[11px] text-[#8A8F98] flex items-center">
                                        <span className="w-1 h-1 bg-white/40 rounded-full mr-1.5"></span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                  {subcat.items.length === 0 && (
                                    <p className="text-[10px] text-[#62666D] italic">No items yet</p>
                                  )}
                                </div>
                              ))}
                            </div>
                            {category.subcategories.length === 0 && (
                              <p className="text-xs text-[#8A8F98] italic">No subcategories yet. Click Edit to add some!</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#8A8F98]">No categories found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingCategoryId ? 'Edit Category' : 'Add New Category'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {editingCategoryId ? 'Update Category' : 'Create Category'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-transparent"
                  placeholder="e.g., Make Up, Skin care"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>

              {/* Subcategories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategories
                </label>

                {/* Add Subcategory */}
                <div className="flex gap-2 mb-4">
                  <Input
                    type="text"
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-transparent"
                    placeholder="Subcategory name (e.g., Face, Eyes)"
                  />
                  <Button
                    onClick={handleAddSubcategory}
                    className="px-4 py-2 bg-white text-black hover:bg-white/90 rounded-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Subcategories List */}
                <div className="space-y-4">
                  {formData.subcategories.map((subcat, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-[#F7F8F8]">{subcat.name}</h4>
                        <Button
                          onClick={() => handleRemoveSubcategory(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Add Item */}
                      {editingSubcategoryIndex === index && (
                        <div className="flex gap-2 mb-3">
                          <Input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddItem(index)}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-transparent"
                            placeholder="Item name (e.g., Foundation)"
                            autoFocus
                          />
                          <Button
                            onClick={() => handleAddItem(index)}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            Add
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingSubcategoryIndex(null);
                              setNewItemName('');
                            }}
                            className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      {editingSubcategoryIndex !== index && (
                        <Button
                          onClick={() => setEditingSubcategoryIndex(index)}
                          className="mb-3 text-sm text-white hover:text-white flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Item
                        </Button>
                      )}

                      {/* Items List */}
                      <div className="flex flex-wrap gap-2">
                        {subcat.items.map((item, itemIndex) => (
                          <span
                            key={itemIndex}
                            className="inline-flex items-center px-3 py-1 bg-admin-panel text-white rounded-full text-sm"
                          >
                            {item}
                            <Button
                              onClick={() => handleRemoveItem(index, itemIndex)}
                              className="ml-2 text-white hover:text-white-hover"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </span>
                        ))}
                      </div>

                      {subcat.items.length === 0 && editingSubcategoryIndex !== index && (
                        <p className="text-xs text-gray-400 italic">No items yet</p>
                      )}
                    </div>
                  ))}
                </div>

                {formData.subcategories.length === 0 && (
                  <p className="text-sm text-[#8A8F98] italic">No subcategories yet. Add one above!</p>
                )}
              </div>
        </div>
      </Modal>
    </div>
  );
}
