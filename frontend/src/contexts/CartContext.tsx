"use client";

import { createContext, useContext, useReducer, useEffect } from 'react';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Payment Method types
export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

// Shipping Address interface
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  province: string;
  postalCode: string;
  district: string;
  country: string;
}

// Cart Item interface
export interface CartItem extends Product {
  quantity: number;
}

// Order Summary interface
export interface OrderSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

// Cart State interface
export interface CartState {
  items: CartItem[];
  shippingAddress: ShippingAddress | null;
  billingAddress: ShippingAddress | null;
  paymentMethod: PaymentMethod | null;
  orderSummary: OrderSummary;
  isLoading: boolean;
  promoCode: string | null;
}

// Action types
type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { id: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_SHIPPING_ADDRESS'; payload: ShippingAddress }
  | { type: 'SET_BILLING_ADDRESS'; payload: ShippingAddress }
  | { type: 'SET_PAYMENT_METHOD'; payload: PaymentMethod }
  | { type: 'APPLY_PROMO_CODE'; payload: string }
  | { type: 'REMOVE_PROMO_CODE' }
  | { type: 'CALCULATE_TOTALS' }
  | { type: 'SET_LOADING'; payload: boolean };

// Constants
const SHIPPING_COST = 4.99;
const FREE_SHIPPING_THRESHOLD = 50;
const TAX_RATE = 0.15; // 15% VAT for Sri Lanka

// Calculate order totals
function calculateOrderSummary(items: CartItem[], promoCode: string | null): OrderSummary {
  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = subtotal * TAX_RATE;
  
  let discount = 0;
  if (promoCode === 'SAVE10') {
    discount = subtotal * 0.1; // 10% discount
  }
  
  const total = subtotal + shipping + tax - discount;
  
  return { subtotal, shipping, tax, discount, total };
}

// Reducer function
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.product.id);
      
      let newItems;
      if (existingItem) {
        newItems = state.items.map(item =>
          item.id === action.payload.product.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        newItems = [...state.items, { ...action.payload.product, quantity: action.payload.quantity }];
      }
      
      return {
        ...state,
        items: newItems,
        orderSummary: calculateOrderSummary(newItems, state.promoCode)
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.id);
      return {
        ...state,
        items: newItems,
        orderSummary: calculateOrderSummary(newItems, state.promoCode)
      };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return {
        ...state,
        items: newItems,
        orderSummary: calculateOrderSummary(newItems, state.promoCode)
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        orderSummary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 }
      };

    case 'SET_SHIPPING_ADDRESS':
      return {
        ...state,
        shippingAddress: action.payload
      };

    case 'SET_BILLING_ADDRESS':
      return {
        ...state,
        billingAddress: action.payload
      };

    case 'SET_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethod: action.payload
      };

    case 'APPLY_PROMO_CODE':
      return {
        ...state,
        promoCode: action.payload,
        orderSummary: calculateOrderSummary(state.items, action.payload)
      };

    case 'REMOVE_PROMO_CODE':
      return {
        ...state,
        promoCode: null,
        orderSummary: calculateOrderSummary(state.items, null)
      };

    case 'CALCULATE_TOTALS':
      return {
        ...state,
        orderSummary: calculateOrderSummary(state.items, state.promoCode)
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    default:
      return state;
  }
}

const initialState: CartState = {
  items: [],
  shippingAddress: null,
  billingAddress: null,
  paymentMethod: null,
  orderSummary: { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 },
  isLoading: false,
  promoCode: null,
};

interface CartContextType extends CartState {
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  setShippingAddress: (address: ShippingAddress) => void;
  setBillingAddress: (address: ShippingAddress) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  applyPromoCode: (code: string) => void;
  removePromoCode: () => void;
  processOrder: () => Promise<string>; // Returns order ID
  cartCount: number;
  cartTotal: number;
  cartItems: CartItem[];
  isInCart: (productId: number) => boolean;
  getCartItemQuantity: (productId: number) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart.items)) {
            parsedCart.items.forEach((item: CartItem) => {
              dispatch({ 
                type: 'ADD_ITEM', 
                payload: { 
                  product: item, 
                  quantity: item.quantity 
                }
              });
            });
          }
        } catch (error) {
          console.error('❌ Error loading cart from localStorage:', error);
        }
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify({ items: state.items }));
    }
  }, [state.items]);

  const addToCart = (product: Product, quantity = 1) => {
    console.log('🛒 Adding to cart:', product.name, 'x', quantity);
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
    toast.success(`Added ${product.name} to cart! 🛒`);
  };

  const removeFromCart = (id: number) => {
    console.log('🗑️ Removing from cart:', id);
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
    toast.success('Item removed from cart');
  };

  const updateQuantity = (id: number, quantity: number) => {
    console.log('📝 Updating quantity:', id, 'to', quantity);
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const clearCart = () => {
    console.log('🧹 Clearing cart');
    dispatch({ type: 'CLEAR_CART' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart');
    }
  };

  const setShippingAddress = (address: ShippingAddress) => {
    console.log('📍 Setting shipping address');
    dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: address });
  };

  const setBillingAddress = (address: ShippingAddress) => {
    console.log('📍 Setting billing address');
    dispatch({ type: 'SET_BILLING_ADDRESS', payload: address });
  };

  const setPaymentMethod = (method: PaymentMethod) => {
    console.log('💳 Setting payment method');
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method });
  };

  const applyPromoCode = (code: string) => {
    console.log('🎟️ Applying promo code:', code);
    if (code === 'SAVE10') {
      dispatch({ type: 'APPLY_PROMO_CODE', payload: code });
      toast.success('Promo code applied! You saved 10%');
    } else {
      toast.error('Invalid promo code');
    }
  };

  const removePromoCode = () => {
    console.log('🎟️ Removing promo code');
    dispatch({ type: 'REMOVE_PROMO_CODE' });
    toast.success('Promo code removed');
  };

  const processOrder = async (): Promise<string> => {
    if (!isAuthenticated) {
      throw new Error('Please log in to place an order');
    }

    if (!state.shippingAddress || !state.paymentMethod) {
      throw new Error('Please complete shipping and payment information');
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      console.log('🛍️ Processing order...');

      // Prepare order data for API
      const orderData = {
        shippingAddress: `${state.shippingAddress.address}${state.shippingAddress.apartment ? ', ' + state.shippingAddress.apartment : ''}, ${state.shippingAddress.city}, ${state.shippingAddress.province} ${state.shippingAddress.postalCode}, ${state.shippingAddress.country}`,
        billingAddress: state.billingAddress ? 
          `${state.billingAddress.address}${state.billingAddress.apartment ? ', ' + state.billingAddress.apartment : ''}, ${state.billingAddress.city}, ${state.billingAddress.province} ${state.billingAddress.postalCode}, ${state.billingAddress.country}` :
          `${state.shippingAddress.address}${state.shippingAddress.apartment ? ', ' + state.shippingAddress.apartment : ''}, ${state.shippingAddress.city}, ${state.shippingAddress.province} ${state.shippingAddress.postalCode}, ${state.shippingAddress.country}`,
        paymentMethod: state.paymentMethod.type === 'card' 
          ? `Card ending in ${state.paymentMethod.last4}` 
          : state.paymentMethod.type.replace('_', ' ').toUpperCase(),
        orderItems: state.items.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      };

      console.log('📦 Order data:', orderData);

      // Call backend API to create order
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Order creation failed:', errorData);
        throw new Error(errorData.message || 'Failed to create order');
      }

      const orderResult = await response.json();
      console.log('✅ Order created successfully:', orderResult);

      // Clear cart after successful order
      dispatch({ type: 'CLEAR_CART' });

      // Return order ID
      return orderResult.id?.toString() || `ORD-${Date.now()}`;
    } catch (error: unknown) {
      console.error('💥 Error processing order:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const isInCart = (productId: number): boolean => {
    return state.items.some(item => item.id === productId);
  };

  const getCartItemQuantity = (productId: number): number => {
    const item = state.items.find(item => item.id === productId);
    return item?.quantity || 0;
  };

  const cartCount = state.items.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = state.orderSummary.subtotal;

  return (
    <CartContext.Provider
      value={{
        ...state,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setShippingAddress,
        setBillingAddress,
        setPaymentMethod,
        applyPromoCode,
        removePromoCode,
        processOrder,
        cartCount,
        cartTotal,
        cartItems: state.items,
        isInCart,
        getCartItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}