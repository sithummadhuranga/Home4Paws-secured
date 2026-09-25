"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  CreditCard,
  Loader2,
  Calendar,
  Mail,
  Truck,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productImageUrl: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetails {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  orderItems: OrderItem[];
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

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setOrderId(id);
    });
  }, [params]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!isAuthenticated || !orderId) return;

      try {
        setIsLoading(true);
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

        const response = await fetch(`${API_BASE_URL}/orders/admin/all?search=${orderId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch order');
        }

        const data = await response.json();
        if (data.orders && data.orders.length > 0) {
          setOrder(data.orders[0]);
          setNewStatus(data.orders[0].status);
        } else {
          toast.error('Order not found');
          router.push('/admin/orders');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [isAuthenticated, orderId, router]);

  const handleStatusUpdate = async () => {
    if (!isAuthenticated || !orderId || !newStatus) return;

    try {
      setIsUpdating(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

      const response = await fetch(`${API_BASE_URL}/orders/admin/${orderId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success('Order status updated successfully');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The order you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/admin/orders">Back to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
        </div>
        <Badge className={getStatusColor(order.status)}>
          {order.status}
        </Badge>
      </div>

      {/* Order Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Order #{order.id}</span>
            <span className="text-lg font-normal text-gray-500">
              {formatLKR(order.totalAmount)}
            </span>
          </CardTitle>
          <CardDescription>
            Placed on {new Date(order.orderDate).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items ({order.itemCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
                      {item.productImageUrl ? (
                        <Image
                          src={item.productImageUrl}
                          alt={item.productName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{item.productName}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Quantity: {item.quantity} × {formatLKR(item.unitPrice)}
                      </p>
                      <p className="text-sm font-semibold mt-2">
                        Total: {formatLKR(item.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {order.shippingAddress}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold">{order.userName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <Mail className="w-4 h-4" />
                  {order.userEmail}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                <p className="font-semibold">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatLKR(order.totalAmount)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleStatusUpdate} 
                disabled={isUpdating || newStatus === order.status}
                className="w-full"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Update Status
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-semibold text-sm">Order Placed</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {order.updatedAt !== order.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-sm">Last Updated</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(order.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}