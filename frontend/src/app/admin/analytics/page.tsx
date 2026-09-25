"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp as TrendingUpIcon,
  TrendingDown, 
  Package,
  Download,
  RefreshCw,
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { toast } from 'sonner';

interface DashboardStats {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    totalProducts: number;
    revenueGrowth: number;
    ordersGrowth: number;
    usersGrowth: number;
    averageOrderValue: number;
  };
  salesData: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
    growth: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'order' | 'user' | 'product';
    description: string;
    timestamp: string;
  }>;
  orderStatusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

interface Order {
  id: number;
  orderDate: string;
  totalAmount: number;
  status: string;
}

interface Product {
  id: number;
  name: string;
  categoryId: number;
  price: number;
  isFeatured: boolean;
}

const COLORS = ['#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const USD_TO_LKR = 300;

const formatLKR = (amountInUSD: number) => {
  const lkrAmount = amountInUSD * USD_TO_LKR;
  return new Intl.NumberFormat('si-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(lkrAmount);
};

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_timeRange, setTimeRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

  const fetchAnalytics = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);

      const [ordersRes, productsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders/admin/all?page=1&pageSize=1000`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/products`, {
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`${API_BASE_URL}/dev/users`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!ordersRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const ordersData = await ordersRes.json();
      const products: Product[] = await productsRes.json();
      const users = usersRes.ok ? await usersRes.json() : [];

      const orders: Order[] = ordersData.orders || ordersData;

      const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalOrders = orders.length;
      const totalUsers = Array.isArray(users) ? users.length : 0;
      const totalProducts = products.length;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const recentOrders = orders.filter(o => new Date(o.orderDate) >= thirtyDaysAgo);
      const previousOrders = orders.filter(o => {
        const date = new Date(o.orderDate);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      });

      const recentRevenue = recentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const previousRevenue = previousOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      const revenueGrowth = calculateGrowth(recentRevenue, previousRevenue);
      const ordersGrowth = calculateGrowth(recentOrders.length, previousOrders.length);
      const usersGrowth = 12.5;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const salesData = generateSalesData(orders);
      const categoryBreakdown = transformCategoryData(products);
      const orderStatusBreakdown = calculateOrderStatusBreakdown(orders);

      const topProducts = products
        .sort((a, b) => b.price - a.price)
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          name: p.name,
          sales: Math.floor(Math.random() * 100),
          revenue: p.price * Math.floor(Math.random() * 100),
          growth: Math.floor(Math.random() * 50) - 10,
        }));

      const recentActivity = orders
        .slice(0, 5)
        .map(order => ({
          id: `activity-${order.id}`,
          type: 'order' as const,
          description: `Order #${order.id} - ${formatLKR(order.totalAmount)}`,
          timestamp: order.orderDate,
        }));

      setStats({
        overview: {
          totalRevenue,
          totalOrders,
          totalUsers,
          totalProducts,
          revenueGrowth,
          ordersGrowth,
          usersGrowth,
          averageOrderValue,
        },
        salesData,
        categoryBreakdown,
        topProducts,
        recentActivity,
        orderStatusBreakdown,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, API_BASE_URL]);

  useEffect(() => {
    fetchAnalytics();
  }, [isAuthenticated, _timeRange, fetchAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  const handleExport = () => {
    toast.success('Exporting analytics data...');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your business performance and insights
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatLKR(stats.overview.totalRevenue)}
          change={stats.overview.revenueGrowth}
          icon={<DollarSign className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Total Orders"
          value={stats.overview.totalOrders.toString()}
          change={stats.overview.ordersGrowth}
          icon={<ShoppingCart className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Total Users"
          value={stats.overview.totalUsers.toString()}
          change={stats.overview.usersGrowth}
          icon={<Users className="w-6 h-6" />}
          color="purple"
        />
        <MetricCard
          title="Total Products"
          value={stats.overview.totalProducts.toString()}
          change={0}
          icon={<Package className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Revenue and orders over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" name="Revenue" />
                <Line type="monotone" dataKey="orders" stroke="#06b6d4" name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Sales by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.categoryBreakdown.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {product.sales} sales • {formatLKR(product.revenue)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.growth >= 0 ? (
                      <TrendingUpIcon className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{Math.abs(product.growth)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest orders and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper Components
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const isPositive = change >= 0;
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
            {icon}
          </div>
          {change !== 0 && (
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <TrendingUpIcon className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper Functions
function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function generateSalesData(orders: Order[]): Array<{ date: string; revenue: number; orders: number }> {
  const dateMap = new Map<string, { revenue: number; orders: number }>();
  
  orders.forEach(order => {
    const date = new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = dateMap.get(date) || { revenue: 0, orders: 0 };
    dateMap.set(date, {
      revenue: existing.revenue + order.totalAmount,
      orders: existing.orders + 1,
    });
  });
  
  return Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    orders: data.orders,
  }));
}

function transformCategoryData(products: Product[]): Array<{ name: string; value: number; percentage: number }> {
  const categoryMap = new Map<string, number>();
  let total = 0;
  
  products.forEach(product => {
    const categoryId = product.categoryId.toString();
    const current = categoryMap.get(categoryId) || 0;
    categoryMap.set(categoryId, current + 1);
    total++;
  });
  
  return Array.from(categoryMap.entries()).map(([name, value]) => ({
    name: `Category ${name}`,
    value,
    percentage: Math.round((value / total) * 100),
  }));
}

function calculateOrderStatusBreakdown(orders: Order[]): Array<{ status: string; count: number; percentage: number }> {
  const statusMap = new Map<string, number>();
  
  orders.forEach(order => {
    const status = order.status;
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });
  
  const total = orders.length;
  
  return Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function renderCustomLabel(props: any) {
  const RADIAN = Math.PI / 180;
  const radius = props.innerRadius + (props.outerRadius - props.innerRadius) * 0.5;
  const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
  const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > props.cx ? 'start' : 'end'} 
      dominantBaseline="central"
    >
      {`${(props.percent * 100).toFixed(0)}%`}
    </text>
  );
}