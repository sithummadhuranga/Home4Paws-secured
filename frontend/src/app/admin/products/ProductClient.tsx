// src/app/admin/products/ProductClient.tsx
"use client";

import { useState } from "react";
import { Product } from "@/types";
import { useAuth } from "@/contexts/AuthContext"; // Use your actual auth context
import { useToast } from "@/hooks/use-toast"; // Using your toast hook
import { deleteProduct } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ProductClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    if (!isAuthenticated) {
      toast({ title: "Error", description: "You are not authenticated.", variant: "destructive" });
      return;
    }

    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      toast({ title: "Success", description: "Product deleted successfully." });
    } catch (_error) {
      toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-secondary rounded-md">
        <thead>
          <tr>
            <th className="p-4 text-left">Name</th>
            <th className="p-4 text-left">SKU</th>
            <th className="p-4 text-left">Price</th>
            <th className="p-4 text-left">Stock</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-border">
              <td className="p-4">{product.name}</td>
              <td className="p-4">{product.sku}</td>
              <td className="p-4">${product.price.toFixed(2)}</td>
              <td className="p-4">{product.stockQuantity}</td>
              <td className="p-4">{product.isActive ? "Active" : "Inactive"}</td>
              <td className="p-4 space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/products/edit/${product.id}`}>Edit</Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}