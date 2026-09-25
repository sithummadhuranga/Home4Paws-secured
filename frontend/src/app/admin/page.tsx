"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ShoppingBag,
  Package,
  Users,
  Clock,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  thisMonthOrders: number;
  lastMonthOrders: number;
  ordersGrowth: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    productId: number;
    productName: string;
    productImage: string;
    totalSold: number;
    totalRevenue: number;
  }>;
  recentOrders: Array<{
    id: number;
    userName: string;
    totalAmount: number;
    status: string;
    orderDate: string;
  }>;
  lowStockProducts: Array<{
    id: number;
    name: string;
    sku: string;
    stockQuantity: number;
    imageUrl: string;
  }>;
}

const USD_TO_LKR = 300;

const formatLKR = (amount: number) => {
  const lkrAmount = amount * USD_TO_LKR;
  return new Intl.NumberFormat('si-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(lkrAmount);
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'delivered':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'processing':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

export default function AdminDashboard() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_statusFilter, _setStatusFilter] = useState<string>('all');
  const [_searchTerm, _setSearchTerm] = useState('');

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

      const response = await fetch(`${API_BASE_URL}/orders/admin/dashboard-stats`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error || 'Failed to load dashboard statistics'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back! Here's what's happening with your store.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/orders">View All Orders</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">Add Product</Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatLKR(stats.totalRevenue)}</div>
            <div className="flex items-center mt-2 text-xs">
              {stats.revenueGrowth >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className={stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(stats.revenueGrowth).toFixed(1)}%
              </span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Orders
            </CardTitle>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="flex items-center mt-2 text-xs">
              {stats.ordersGrowth >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className={stats.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(stats.ordersGrowth).toFixed(1)}%
              </span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending Orders
            </CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-gray-500 mt-2">
              Requires attention
            </p>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Customers
            </CardTitle>
            <Users className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-gray-500 mt-2">
              Registered users
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performing products this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topSellingProducts.map((product, index) => (
                <div key={product.productId} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.productName}</p>
                    <p className="text-sm text-gray-500">{product.totalSold} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatLKR(product.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.userName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatLKR(order.totalAmount)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/admin/orders">View All Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockProducts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-900">
                  <Package className="w-8 h-8 text-orange-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    <p className="text-sm font-semibold text-orange-600">
                      Only {product.stockQuantity} left
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}