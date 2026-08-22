'use client';





import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useState } from 'react';
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
        <p className="text-gray-500">You don't have permission to manage categories.</p>
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
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories Management</h1>
          <p className="text-gray-600">Manage product categories, subcategories, and items</p>
        </div>
        <Button
          onClick={openAddModal}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-admin-primary text-white rounded-lg hover:bg-admin-primary-hover transition-colors duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <Folder className="w-8 h-8 text-admin-primary" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {categories.reduce((sum, cat) => sum + cat.productCount, 0)}
              </p>
            </div>
            <FolderOpen className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {categories.filter(cat => cat.status === 'active').length}
              </p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Subcategories</p>
              <p className="text-2xl font-bold text-gray-900">
                {categories.reduce((sum, cat) => sum + cat.subcategories.length, 0)}
              </p>
            </div>
            <Tag className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category.id);
                return (
                  <>
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Button
                            onClick={() => toggleExpanded(category.id)}
                            className="mr-2 p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                          </Button>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                            <div className="text-xs text-gray-500">Created: {new Date(category.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{category.slug}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{category.subcategories.length}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{category.productCount}</td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getStatusColor(category.status)
                        )}>
                          {category.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => openEditModal(category)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${category.id}-expanded`}>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <h4 className="font-medium text-gray-900">Subcategories & Items</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {category.subcategories.map((subcat, index) => (
                                <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white">
                                  <h5 className="font-semibold text-gray-900 mb-2 flex items-center">
                                    <Tag className="w-4 h-4 mr-2 text-admin-primary" />
                                    {subcat.name}
                                  </h5>
                                  <ul className="space-y-1">
                                    {subcat.items.map((item, itemIndex) => (
                                      <li key={itemIndex} className="text-sm text-gray-600 flex items-center">
                                        <span className="w-1.5 h-1.5 bg-admin-panel0 rounded-full mr-2"></span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                  {subcat.items.length === 0 && (
                                    <p className="text-xs text-gray-400 italic">No items yet</p>
                                  )}
                                </div>
                              ))}
                            </div>
                            {category.subcategories.length === 0 && (
                              <p className="text-sm text-gray-500 italic">No subcategories yet. Click Edit to add some!</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No categories found matching your criteria.</p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
                    placeholder="Subcategory name (e.g., Face, Eyes)"
                  />
                  <Button
                    onClick={handleAddSubcategory}
                    className="px-4 py-2 bg-admin-primary text-white rounded-lg hover:bg-admin-primary-hover"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Subcategories List */}
                <div className="space-y-4">
                  {formData.subcategories.map((subcat, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{subcat.name}</h4>
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
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
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
                          className="mb-3 text-sm text-admin-primary hover:text-admin-primary flex items-center"
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
                            className="inline-flex items-center px-3 py-1 bg-admin-panel text-admin-primary rounded-full text-sm"
                          >
                            {item}
                            <Button
                              onClick={() => handleRemoveItem(index, itemIndex)}
                              className="ml-2 text-admin-primary hover:text-purple-900"
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
                  <p className="text-sm text-gray-500 italic">No subcategories yet. Add one above!</p>
                )}
              </div>
        </div>
      </Modal>
    </div>
  );
}
