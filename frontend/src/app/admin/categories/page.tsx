"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  Loader2,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { Category } from '@/types';

interface CategoryFormData {
  name: string;
  description: string;
}

interface CategoryWithProductCount extends Category {
  productCount?: number;
}

export default function CategoriesPage() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<CategoryWithProductCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: ''
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

  const fetchCategories = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/categories`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, API_BASE_URL]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setSelectedCategory(category);
      setIsEditing(true); // ✅ Add this to indicate we're editing
      setFormData({
        name: category.name,
        description: category.description || '',
      });
    } else {
      setSelectedCategory(null);
      setIsEditing(false); // ✅ Add this to indicate we're creating new
      setFormData({ name: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsEditing(false);
    setSelectedCategory(null);
    setFormData({
      name: '',
      description: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Authentication required');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsSaving(true);

    try {
      const url = isEditing && selectedCategory
        ? `${API_BASE_URL}/categories/${selectedCategory.id}`
        : `${API_BASE_URL}/categories`;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save category');
      }

      toast.success(isEditing ? 'Category updated successfully' : 'Category created successfully');
      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: CategoryWithProductCount) => {
    if (!isAuthenticated) {
      toast.error('Authentication required');
      return;
    }

    // Check if category has products
    if (category.productCount && category.productCount > 0) {
      toast.error(
        `Cannot delete "${category.name}" because it contains ${category.productCount} product(s). Please reassign or delete the products first.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/categories/${category.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete category');
      }

      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categories Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Organize your products into categories
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Edit Category' : 'Create New Category'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? 'Update the category information below.'
                    : 'Add a new category to organize your products.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Category Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Pet Food, Toys, Accessories"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the category (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    isEditing ? 'Update Category' : 'Create Category'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Categories</CardDescription>
            <CardTitle className="text-2xl">{categories.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Products</CardDescription>
            <CardTitle className="text-2xl">
              {categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Empty Categories</CardDescription>
            <CardTitle className="text-2xl">
              {categories.filter(cat => !cat.productCount || cat.productCount === 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            Manage your product categories and their assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                            <FolderTree className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="font-semibold">{category.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md line-clamp-2">
                          {category.description || 'No description'}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="font-semibold">{category.productCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Category
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(category)}
                              className="text-red-600 focus:text-red-600"
                              disabled={!!(category.productCount && category.productCount > 0)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Category
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Get started by creating your first product category
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Category
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}