"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '@/contexts/AuthContext';
import { Order } from '@/types';
import { useCart } from '@/contexts/CartContext';

interface OrderReceiptProps {
  orderId: string;
  orderDate?: string;
}

// ✅ Helper to safely parse JSON
const safeJSONParse = (jsonString: string, fallback: any = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
};

export function OrderReceipt({ orderId, orderDate = new Date().toISOString() }: OrderReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();
  const { cartItems, orderSummary, shippingAddress } = useCart();

  // Convert USD to LKR
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch order details from backend
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!isAuthenticated || !orderId) return;

      try {
        setIsLoading(true);
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

        console.log('📦 Fetching order details for:', orderId);
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch order details');
        }

        const orderData: Order = await response.json();
        console.log('✅ Order data received:', orderData);
        setOrder(orderData);
      } catch (err) {
        console.error('❌ Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, isAuthenticated]);

  const handleDownload = async () => {
    if (!receiptRef.current || !order) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Home4Paws-Receipt-${orderId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Button
        disabled
        size="lg"
        variant="outline"
        className="h-12 rounded-xl border-2 border-purple-400/30 text-purple-200 font-urbanist"
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </Button>
    );
  }

  if (error || !order) {
    return null;
  }

  // ✅ Safely parse addresses with fallback
  const shippingAddr = safeJSONParse(order.shippingAddress, {
    firstName: 'Customer',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: 'Address not available',
    city: '',
    state: '',
    zipCode: '',
    country: 'Sri Lanka'
  });

  const billingAddr = safeJSONParse(order.billingAddress, shippingAddr);

  // Calculate totals
  const subtotal = order.orderItems?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
  const tax = subtotal * 0.15;
  const shipping = subtotal >= 50 ? 0 : 4.99;
  const total = order.totalAmount;

  return (
    <>
      {/* Hidden Receipt for PDF Generation */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div
          ref={receiptRef}
          style={{
            width: '210mm',
            backgroundColor: '#ffffff',
            padding: '48px',
            fontFamily: 'Arial, sans-serif',
            color: '#000000'
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '2px solid #7c3aed', paddingBottom: '32px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '8px', margin: 0 }}>
                  Home4Paws
                </h1>
                <p style={{ fontSize: '13px', color: '#666666', margin: '4px 0 0 0' }}>
                  Premium Pet Products & Supplies
                </p>
                <p style={{ fontSize: '11px', color: '#888888', margin: '2px 0 0 0' }}>
                  Island-wide Delivery Across Sri Lanka
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '6px 12px', 
                  backgroundColor: '#d1fae5', 
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#065f46', margin: 0 }}>
                    ORDER RECEIPT
                  </p>
                </div>
                <p style={{ fontSize: '13px', color: '#666666', margin: '4px 0' }}>
                  Receipt #{order.id}
                </p>
                <p style={{ fontSize: '11px', color: '#888888', margin: '4px 0' }}>
                  {formatDate(order.orderDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div style={{ 
            marginBottom: '32px', 
            padding: '12px', 
            backgroundColor: '#d1fae5', 
            border: '1px solid #6ee7b7',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#065f46', fontWeight: '600', fontSize: '13px', margin: 0 }}>
              Payment Confirmed - Order Status: {order.status}
            </p>
          </div>

          {/* Customer & Delivery Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            {/* Customer Info */}
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#333333', marginBottom: '12px', margin: '0 0 12px 0' }}>
                CUSTOMER INFORMATION
              </h3>
              <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                <p style={{ fontWeight: '600', margin: '6px 0', color: '#000000' }}>
                  {shippingAddr.firstName} {shippingAddr.lastName}
                </p>
                <p style={{ margin: '6px 0', color: '#666666' }}>{shippingAddr.email}</p>
                <p style={{ margin: '6px 0', color: '#666666' }}>{shippingAddr.phone}</p>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#333333', marginBottom: '12px', margin: '0 0 12px 0' }}>
                DELIVERY ADDRESS
              </h3>
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#666666' }}>
                <p style={{ margin: '4px 0' }}>{shippingAddr.address}</p>
                {shippingAddr.apartment && <p style={{ margin: '4px 0' }}>{shippingAddr.apartment}</p>}
                <p style={{ margin: '4px 0' }}>
                  {shippingAddr.city}{shippingAddr.state ? `, ${shippingAddr.state}` : ''}
                </p>
                <p style={{ margin: '4px 0' }}>{shippingAddr.zipCode}</p>
                <p style={{ fontWeight: '600', margin: '4px 0', color: '#000000' }}>{shippingAddr.country}</p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ 
            marginBottom: '32px', 
            padding: '14px', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '6px'
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#333333', marginBottom: '8px', margin: '0 0 8px 0' }}>
              PAYMENT METHOD
            </h3>
            <p style={{ fontSize: '12px', color: '#666666', margin: 0 }}>
              {order.paymentMethod}
            </p>
          </div>

          {/* Order Items */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#333333', marginBottom: '16px', margin: '0 0 16px 0' }}>
              ORDER ITEMS
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#666666', paddingBottom: '12px' }}>
                    ITEM
                  </th>
                  <th style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#666666', paddingBottom: '12px' }}>
                    QTY
                  </th>
                  <th style={{ textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#666666', paddingBottom: '12px' }}>
                    UNIT PRICE
                  </th>
                  <th style={{ textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#666666', paddingBottom: '12px' }}>
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.orderItems?.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: '#000000' }}>
                      {item.productName}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: '#666666', textAlign: 'center' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: '#666666', textAlign: 'right' }}>
                      {formatLKR(item.unitPrice)}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '12px', fontWeight: '600', color: '#000000', textAlign: 'right' }}>
                      {formatLKR(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Summary */}
          <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#666666' }}>Subtotal</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#000000' }}>
                  {formatLKR(subtotal)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#666666' }}>Shipping</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: shipping === 0 ? '#059669' : '#000000' }}>
                  {shipping === 0 ? 'FREE' : formatLKR(shipping)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#666666' }}>VAT (15%)</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#000000' }}>
                  {formatLKR(tax)}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #7c3aed', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000' }}>
                  TOTAL AMOUNT
                </span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>
                  {formatLKR(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: '#666666', marginBottom: '6px', margin: '0 0 6px 0' }}>
                Thank you for shopping with Home4Paws. Your order will be delivered within 2-3 business days.
              </p>
              <p style={{ fontSize: '10px', color: '#888888', marginBottom: '6px', margin: '6px 0' }}>
                For questions or concerns, contact us at support@home4paws.lk or call +94 11 234 5678
              </p>
              <p style={{ fontSize: '10px', color: '#aaaaaa', marginTop: '16px', margin: '16px 0 0 0' }}>
                Home4Paws (Pvt) Ltd. | Colombo, Sri Lanka | www.home4paws.lk
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <Button
        onClick={handleDownload}
        disabled={isGenerating}
        size="lg"
        variant="outline"
        className="h-12 rounded-xl border-2 border-purple-400/30 hover:bg-purple-500/10 transition-all duration-200 text-purple-200 hover:text-purple-300 font-urbanist"
      >
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span>Generating PDF...</span>
          </div>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </>
        )}
      </Button>
    </>
  );
}