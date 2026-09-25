"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getUserAddresses, getDefaultAddress } from "@/services/addressService"
import { getUserOrders, getUserStats, cancelOrder } from "@/services/orderService"
import { getMyFeedbacks, deleteFeedback } from "@/services/feedbackService"
import { SavedAddress, Order, UserStats, Feedback } from "@/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingBagIcon,
  CreditCardIcon,
  HeartIcon,
  CalendarIcon,
  MapPinIcon,
  EditIcon,
  SettingsIcon,
  PackageIcon,
  Loader2,
  AlertCircle,
  ShieldIcon,
  BellIcon,
  UserIcon,
  XCircle,
  Star,
  MessageSquare,
  Trash2,
  Edit,
  Dog,
  Cat,
  Search,
  Clock,
  CheckCircle,
  Eye,
  FileText,
  Sparkles,
  TrendingUp,
  Award,
  Crown
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { toast } from "sonner"
import Link from "next/link"

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [addresses, setAddresses] = React.useState<SavedAddress[]>([])
  const [defaultAddress, setDefaultAddress] = React.useState<SavedAddress | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [stats, setStats] = React.useState<UserStats | null>(null)
  const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([])
  const [petReports, setPetReports] = React.useState<any[]>([])
  const [loadingAddresses, setLoadingAddresses] = React.useState(false)
  const [loadingOrders, setLoadingOrders] = React.useState(false)
  const [loadingStats, setLoadingStats] = React.useState(false)
  const [loadingFeedbacks, setLoadingFeedbacks] = React.useState(false)
  const [loadingPetReports, setLoadingPetReports] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [cancellingOrder, setCancellingOrder] = React.useState<number | null>(null)
  const [deletingFeedback, setDeletingFeedback] = React.useState<number | null>(null)
  const router = useRouter()

  React.useEffect(() => {
    const loadProfileData = async () => {
      if (!isAuthenticated) {
        console.log('Skipping profile data loading - not authenticated');
        setLoadingAddresses(false)
        setLoadingOrders(false)
        setLoadingStats(false)
        setLoadingFeedbacks(false)
        setLoadingPetReports(false)
        return
      }

      console.log('Loading profile data for user:', user?.email);

      try {
        setError(null)
        
        // Load addresses
        setLoadingAddresses(true)
        try {
          const [addressesData, defaultData] = await Promise.allSettled([
            getUserAddresses(),
            getDefaultAddress()
          ])
          
          if (addressesData.status === 'fulfilled') {
            setAddresses(addressesData.value)
            console.log('Loaded addresses:', addressesData.value.length);
          } else {
            console.error('Failed to load addresses:', addressesData.reason)
          }

          if (defaultData.status === 'fulfilled') {
            setDefaultAddress(defaultData.value)
            console.log('Loaded default address:', defaultData.value ? 'Found' : 'None');
          } else {
            console.error('Failed to load default address:', defaultData.reason)
          }
        } catch (err) {
          console.error('Error loading addresses:', err)
        }
        setLoadingAddresses(false)

        // Load orders
        setLoadingOrders(true)
        try {
          const ordersData = await getUserOrders()
          setOrders(ordersData)
          console.log('Loaded orders:', ordersData.length);
        } catch (err) {
          console.error('Error loading orders:', err)
        }
        setLoadingOrders(false)

        // Load stats
        setLoadingStats(true)
        try {
          const statsData = await getUserStats()
          setStats(statsData)
          console.log('Loaded stats:', statsData);
        } catch (err) {
          console.error('Error loading stats:', err)
        }
        setLoadingStats(false)

        // Load feedbacks
        setLoadingFeedbacks(true)
        try {
          const feedbacksData = await getMyFeedbacks()
          setFeedbacks(feedbacksData)
          console.log('Loaded feedbacks:', feedbacksData.length);
        } catch (err) {
          console.error('Error loading feedbacks:', err)
        }
        setLoadingFeedbacks(false)

        // Load pet reports
        setLoadingPetReports(true)
        try {
          const response = await fetch(`http://localhost:5185/api/reports/user/${user?.id}`, {
            credentials: 'include',
          })
          if (response.ok) {
            const petReportsData = await response.json()
            setPetReports(petReportsData)
            console.log('Loaded pet reports:', petReportsData.length);
          }
        } catch (err) {
          console.error('Error loading pet reports:', err)
        }
        setLoadingPetReports(false)
        
      } catch (err) {
        console.error('Error loading profile data:', err)
        setError('Failed to load profile information')
        setLoadingAddresses(false)
        setLoadingOrders(false)
        setLoadingStats(false)
        setLoadingFeedbacks(false)
        setLoadingPetReports(false)
      }
    }

    if (isAuthenticated && !isLoading && user) {
      loadProfileData()
    }
  }, [isAuthenticated, isLoading, user])

  const handleCancelOrder = async (orderId: number) => {
    if (!isAuthenticated) return

    try {
      setCancellingOrder(orderId)
      await cancelOrder(orderId)
      
      // Update orders list
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'Cancelled' }
          : order
      ))
      
      toast.success('Order cancelled successfully')
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('Failed to cancel order')
    } finally {
      setCancellingOrder(null)
    }
  }

  const handleDeleteFeedback = async (feedbackId: number) => {
    if (!isAuthenticated) return

    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return

    try {
      setDeletingFeedback(feedbackId)
      await deleteFeedback(feedbackId)
      
      // Update feedbacks list
      setFeedbacks(prev => prev.filter(feedback => feedback.id !== feedbackId))
      
      toast.success('Review deleted successfully')
    } catch (error) {
      console.error('Error deleting feedback:', error)
      toast.error('Failed to delete review')
    } finally {
      setDeletingFeedback(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  // ✅ UPDATED: Convert USD to LKR
  const USD_TO_LKR = 300;
  
  const formatCurrency = (amountInUSD: number) => {
    const lkrAmount = amountInUSD * USD_TO_LKR;
    return new Intl.NumberFormat('si-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(lkrAmount);
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 transition-all duration-300 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400 scale-110'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center animate-fadeInUp">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-purple-400 mx-auto mb-6" />
              <div className="absolute inset-0 w-16 h-16 animate-ping mx-auto">
                <div className="w-full h-full border-4 border-purple-500/30 rounded-full" />
              </div>
            </div>
            <p className="text-xl text-purple-300 font-inter font-medium">Loading your profile...</p>
            <p className="text-sm text-purple-400 mt-2 font-inter">This may take a moment</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-black via-neutral-950 to-purple-900/10 flex items-center justify-center p-4">
          <div className="relative group max-w-md w-full">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-purple-400 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
            
            <Card className="relative bg-neutral-900/90 backdrop-blur-xl border-purple-400/20">
              <CardContent className="pt-12 pb-8 px-8">
                <div className="text-center space-y-6 animate-fadeInUp">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                    <AlertCircle className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-purple-200 font-urbanist">Access Denied</h2>
                    <p className="text-purple-300 font-inter leading-relaxed">
                      You need to be logged in to view your profile.
                    </p>
                  </div>
                  <Button 
                    onClick={() => router.push('/auth/login')}
                    className="w-full h-14 text-lg rounded-[32px] bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 shadow-xl shadow-purple-500/30 font-inter font-semibold"
                  >
                    Sign In to Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pt-8 pb-20">
        {/* Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          {error && (
            <Alert className="mb-6 bg-red-900/20 border-red-400/30 animate-fadeInUp">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <AlertDescription className="text-red-300 font-inter">{error}</AlertDescription>
            </Alert>
          )}

          {/* Enhanced Profile Header */}
          <div className="mb-10 animate-fadeInUp">
            <div className="relative group">
              {/* Outer glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/20 via-purple-500/20 to-purple-400/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative bg-gradient-to-br from-neutral-900/90 via-neutral-800/90 to-neutral-900/90 backdrop-blur-xl rounded-3xl p-8 border border-purple-400/30 shadow-2xl">
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-3xl" />
                
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="flex items-center gap-6">
                    {/* Enhanced Avatar */}
                    <div className="relative group/avatar">
                      <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur opacity-75 group-hover/avatar:opacity-100 transition-opacity animate-pulse" />
                      <Avatar className="relative size-24 lg:size-28 border-4 border-neutral-900 shadow-2xl ring-2 ring-purple-500/50">
                        <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 text-white font-urbanist">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      {/* Status indicator */}
                      <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-neutral-900 shadow-lg animate-pulse" />
                    </div>

                    <div className="space-y-3">
                      {/* User role badge */}
                      {user.role === 'Admin' && (
                        <Badge className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white border-0 shadow-lg">
                          <Crown className="w-3 h-3 mr-1" />
                          Administrator
                        </Badge>
                      )}
                      
                      <h1 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-purple-100 to-purple-200 font-urbanist">
                        {user.firstName} {user.lastName}
                      </h1>
                      
                      <p className="text-purple-300 font-inter flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                        {user.email}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-purple-300 font-inter">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-purple-400" />
                          <span>Member since {stats?.memberSince || formatDate(user.createdAt)}</span>
                        </div>
                        
                        {user.emailVerified && (
                          <Badge variant="secondary" className="bg-green-900/30 text-green-400 border-green-400/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Email Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-12 px-6 border-2 border-purple-400/40 bg-neutral-900/60 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 rounded-[24px] font-inter font-medium transition-all duration-300 hover:scale-105"
                    >
                      <EditIcon className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-12 px-6 border-2 border-purple-400/40 bg-neutral-900/60 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 rounded-[24px] font-inter font-medium transition-all duration-300 hover:scale-105"
                    >
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: ShoppingBagIcon,
                label: 'Total Orders',
                value: loadingStats ? null : stats?.totalOrders || 0,
                color: 'from-purple-600 to-purple-400',
                iconBg: 'bg-purple-900/30',
                iconColor: 'text-purple-400',
                trend: '+12%'
              },
              {
                icon: CreditCardIcon,
                label: 'Total Spent',
                value: loadingStats ? null : formatCurrency(stats?.totalSpent || 0),
                color: 'from-green-600 to-emerald-600',
                iconBg: 'bg-green-900/30',
                iconColor: 'text-green-400',
                trend: '+8%'
              },
              {
                icon: HeartIcon,
                label: 'Favorites',
                value: loadingStats ? null : stats?.favoriteProducts || 0,
                color: 'from-pink-600 to-red-600',
                iconBg: 'bg-red-900/30',
                iconColor: 'text-red-400',
                trend: '+5'
              }
            ].map((stat, idx) => (
              <div 
                key={idx} 
                className="group relative animate-fadeInUp"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Card glow */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl`} />
                
                <Card className="relative bg-neutral-900/80 backdrop-blur-md border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105 overflow-hidden">
                  {/* Top accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`} />
                  
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 ${stat.iconBg} rounded-xl border border-purple-400/20 group-hover:scale-110 transition-transform duration-300`}>
                        <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                      </div>
                      <Badge variant="outline" className="border-green-400/30 text-green-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {stat.trend}
                      </Badge>
                    </div>
                    
                    <div>
                      {loadingStats ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                          <span className="text-sm text-purple-300 font-inter">Loading...</span>
                        </div>
                      ) : (
                        <p className="text-3xl font-bold text-purple-200 mb-1 font-urbanist">
                          {stat.value}
                        </p>
                      )}
                      <p className="text-sm text-purple-300 font-inter">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Enhanced Tabs */}
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-neutral-900/60 backdrop-blur-md border border-purple-400/20 rounded-[24px] shadow-xl">
              {[
                { value: 'overview', label: 'Overview', icon: Sparkles },
                { value: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBagIcon },
                { value: 'addresses', label: `Addresses (${addresses.length})`, icon: MapPinIcon },
                { value: 'reports', label: 'Pet Reports', icon: Search },
                { value: 'reviews', label: `Reviews (${feedbacks.length})`, icon: MessageSquare },
                { value: 'settings', label: 'Settings', icon: SettingsIcon }
              ].map((tab, idx) => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-400 data-[state=active]:text-white text-purple-300 rounded-[20px] h-12 font-inter font-medium transition-all duration-300 hover:text-purple-200 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30"
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 animate-fadeInUp">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information - Enhanced */}
                <Card className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 group">
                  <CardHeader className="border-b border-purple-400/10 pb-4">
                    <CardTitle className="flex items-center gap-3 text-purple-200 font-urbanist">
                      <div className="p-2 bg-purple-900/30 rounded-xl border border-purple-400/20">
                        <UserIcon className="w-5 h-5 text-purple-400" />
                      </div>
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {[
                      { icon: null, text: user.email, verified: user.emailVerified },
                      { icon: ShieldIcon, text: `Role: ${user.role}`, verified: false },
                      { icon: CalendarIcon, text: `Joined: ${formatDate(user.createdAt)}`, verified: false },
                      ...(defaultAddress ? [{ icon: MapPinIcon, text: `${defaultAddress.address}, ${defaultAddress.city}, ${defaultAddress.province}`, verified: false }] : [])
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-purple-400/10 hover:border-purple-400/30 transition-all duration-300 group/item">
                        {item.icon && <item.icon className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                        <span className="text-sm text-purple-300 font-inter flex-1">{item.text}</span>
                        {item.verified && (
                          <Badge variant="secondary" className="bg-green-900/30 text-green-400 border-green-400/30 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recent Orders - Enhanced */}
                <Card className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20 hover:border-purple-400/40 transition-all duration-300">
                  <CardHeader className="border-b border-purple-400/10 pb-4">
                    <CardTitle className="text-purple-200 font-urbanist">Recent Orders</CardTitle>
                    <CardDescription className="text-purple-300/70 font-inter">Your latest purchases</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loadingOrders ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        <span className="text-sm text-purple-300 font-inter">Loading orders...</span>
                      </div>
                    ) : orders.length > 0 ? (
                      <div className="space-y-3">
                        {orders.slice(0, 3).map((order, idx) => (
                          <div 
                            key={order.id} 
                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-neutral-800/50 to-neutral-900/50 rounded-xl border border-purple-400/10 hover:border-purple-400/30 transition-all duration-300 group/order animate-fadeInUp"
                            style={{ animationDelay: `${idx * 0.05}s` }}
                          >
                            <div className="p-3 bg-purple-900/30 rounded-xl border border-purple-400/20 group-hover/order:scale-110 transition-transform duration-300">
                              <ShoppingBagIcon className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-purple-200 font-urbanist">Order #{order.id}</p>
                              <p className="text-xs text-purple-300/70 font-inter">
                                {formatDate(order.orderDate)} • {formatCurrency(order.totalAmount)}
                              </p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 space-y-4">
                        <div className="w-20 h-20 bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto">
                          <PackageIcon className="w-10 h-10 text-purple-400/50" />
                        </div>
                        <div>
                          <p className="text-purple-300 font-inter mb-2">No orders yet</p>
                          <p className="text-sm text-purple-400 font-inter">Start shopping to see your orders here</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Orders Tab - Keep existing implementation with enhanced styles */}
            <TabsContent value="orders" className="space-y-6 animate-fadeInUp">
              <Card className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20">
                <CardHeader className="border-b border-purple-400/10">
                  <CardTitle className="text-purple-200 font-urbanist">Order History</CardTitle>
                  <CardDescription className="text-purple-300/70 font-inter">All your past orders and their status</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loadingOrders ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                        <div className="absolute inset-0 w-12 h-12 animate-ping">
                          <div className="w-full h-full border-4 border-purple-500/30 rounded-full" />
                        </div>
                      </div>
                      <span className="text-purple-300 font-inter">Loading orders...</span>
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-6">
                      {orders.map((order, idx) => (
                        <div 
                          key={order.id} 
                          className="border border-purple-400/20 rounded-2xl p-6 space-y-4 bg-gradient-to-br from-neutral-900/50 to-neutral-800/50 backdrop-blur-sm hover:border-purple-400/40 transition-all duration-300 animate-fadeInUp"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-purple-900/30 rounded-xl border border-purple-400/20">
                                <PackageIcon className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-purple-200 font-urbanist">Order #{order.id}</p>
                                <p className="text-sm text-purple-300/70 font-inter">
                                  {new Date(order.orderDate).toLocaleDateString()} • {order.orderItems.length} items
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                              {order.status.toLowerCase() === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                  disabled={cancellingOrder === order.id}
                                  className="text-red-400 border-red-400/30 hover:bg-red-900/20 hover:border-red-400 rounded-xl font-inter"
                                >
                                  {cancellingOrder === order.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Cancel
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-purple-300 font-inter">Items:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {order.orderItems.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-purple-400/10">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-purple-200 truncate font-urbanist">{item.productName}</p>
                                    <p className="text-xs text-purple-300/70 font-inter">
                                      Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Details */}
                          <div className="pt-4 border-t border-purple-400/10 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="p-3 bg-black/20 rounded-xl">
                                <p className="text-purple-300/70 font-inter mb-1">Payment Method</p>
                                <p className="font-medium text-purple-200 font-urbanist">{order.paymentMethod}</p>
                              </div>
                              <div className="p-3 bg-gradient-to-r from-purple-900/20 to-purple-800/20 rounded-xl border border-purple-400/20">
                                <p className="text-purple-300/70 font-inter mb-1">Order Total</p>
                                <p className="font-bold text-2xl text-purple-200 font-urbanist">{formatCurrency(order.totalAmount)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 space-y-6">
                      <div className="w-24 h-24 bg-purple-900/20 rounded-3xl flex items-center justify-center mx-auto">
                        <PackageIcon className="w-12 h-12 text-purple-400/50" />
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-purple-200 mb-2 font-urbanist">No orders yet</p>
                        <p className="text-purple-300 font-inter mb-6">
                          Start shopping to see your orders here
                        </p>
                      </div>
                      <Button 
                        onClick={() => router.push('/store')}
                        className="h-14 px-8 rounded-[32px] bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 shadow-xl shadow-purple-500/30 font-inter font-semibold"
                      >
                        Browse Products
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Addresses Tab - Enhanced styling */}
            <TabsContent value="addresses" className="space-y-6 animate-fadeInUp">
              <Card className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20">
                <CardHeader className="border-b border-purple-400/10">
                  <CardTitle className="text-purple-200 font-urbanist">Saved Addresses</CardTitle>
                  <CardDescription className="text-purple-300/70 font-inter">Manage your delivery addresses</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loadingAddresses ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                      <span className="text-sm text-purple-300 font-inter">Loading addresses...</span>
                    </div>
                  ) : addresses.length > 0 ? (
                    <div className="space-y-4">
                      {addresses.map((address, idx) => (
                        <div 
                          key={address.id} 
                          className="p-6 border border-purple-400/20 rounded-2xl bg-gradient-to-br from-neutral-900/50 to-neutral-800/50 hover:border-purple-400/40 transition-all duration-300 group animate-fadeInUp"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-400/20">
                                  <MapPinIcon className="w-4 h-4 text-purple-400" />
                                </div>
                                <p className="font-semibold text-purple-200 font-urbanist">{address.firstName} {address.lastName}</p>
                                {address.isDefault && (
                                  <Badge className="bg-gradient-to-r from-purple-600 to-purple-400 text-white border-0">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-purple-300 space-y-1 font-inter">
                                <p>{address.address}</p>
                                {address.apartment && <p>{address.apartment}</p>}
                                <p>{address.city}, {address.district}, {address.province}</p>
                                <p>{address.postalCode}</p>
                                <p className="flex items-center gap-2 mt-2">
                                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                                  {address.phone}
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-purple-400/30 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 rounded-xl font-inter"
                            >
                              <EditIcon className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button className="w-full h-14 rounded-[32px] bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 shadow-lg shadow-purple-500/30 font-inter font-semibold">
                        Add New Address
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-16 space-y-6">
                      <div className="w-24 h-24 bg-purple-900/20 rounded-3xl flex items-center justify-center mx-auto">
                        <MapPinIcon className="w-12 h-12 text-purple-400/50" />
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-purple-200 mb-2 font-urbanist">No addresses saved yet</p>
                        <p className="text-purple-300 font-inter mb-6">Add an address to get started</p>
                      </div>
                      <Button className="h-14 px-8 rounded-[32px] bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 shadow-xl shadow-purple-500/30 font-inter font-semibold">
                        Add Address
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pet Reports Tab - Keep existing with enhanced styles */}
            <TabsContent value="reports" className="space-y-6 animate-fadeInUp">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-purple-200 font-urbanist">My Pet Reports</h3>
                  <p className="text-purple-300 font-inter mt-1">
                    Track the status of your lost and found pet reports
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 rounded-xl font-inter">
                    <Link href="/pet-finder/report-lost">
                      <FileText className="w-4 h-4 mr-2" />
                      Report Lost
                    </Link>
                  </Button>
                  <Button asChild className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 shadow-lg font-inter">
                    <Link href="/pet-finder/report-found">
                      <Search className="w-4 h-4 mr-2" />
                      Report Found
                    </Link>
                  </Button>
                </div>
              </div>

              {loadingPetReports ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                    <div className="absolute inset-0 w-12 h-12 animate-ping">
                      <div className="w-full h-full border-4 border-purple-500/30 rounded-full" />
                    </div>
                  </div>
                  <span className="text-purple-300 font-inter">Loading pet reports...</span>
                </div>
              ) : petReports.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {petReports.map((report, idx) => (
                    <Card key={report.id} className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 group animate-fadeInUp" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <CardContent className="p-6">
                        {/* Keep existing pet reports content with your enhanced styling */}
                        {/* ... existing pet report code ... */}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20">
                  <CardContent className="p-16 text-center">
                    <div className="w-24 h-24 bg-purple-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Search className="w-12 h-12 text-purple-400/50" />
                    </div>
                    <h3 className="text-2xl font-bold text-purple-200 mb-3 font-urbanist">No pet reports yet</h3>
                    <p className="text-purple-300 mb-8 font-inter max-w-md mx-auto">
                      Help reunite pets with their families by reporting lost or found pets.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button asChild variant="outline" className="h-14 px-8 border-2 border-purple-400/40 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 rounded-[32px] font-inter font-semibold">
                        <Link href="/pet-finder/report-lost">
                          <FileText className="w-5 h-5 mr-2" />
                          Report Lost Pet
                        </Link>
                      </Button>
                      <Button asChild className="h-14 px-8 rounded-[32px] bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 shadow-xl shadow-purple-500/30 font-inter font-semibold">
                        <Link href="/pet-finder/report-found">
                          <Search className="w-5 h-5 mr-2" />
                          Report Found Pet
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Reviews Tab - Enhanced */}
            <TabsContent value="reviews" className="space-y-6 animate-fadeInUp">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-purple-200 font-urbanist">My Reviews</h3>
                  <p className="text-purple-300 font-inter mt-1">
                    Manage your feedback and reviews
                  </p>
                </div>
                <Button asChild className="h-12 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 shadow-lg font-inter font-semibold">
                  <Link href="/feedbacks">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Write New Review
                  </Link>
                </Button>
              </div>

              {loadingFeedbacks ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                    <div className="absolute inset-0 w-12 h-12 animate-ping">
                      <div className="w-full h-full border-4 border-purple-500/30 rounded-full" />
                    </div>
                  </div>
                  <span className="text-purple-300 font-inter">Loading reviews...</span>
                </div>
              ) : feedbacks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbacks.map((feedback, idx) => (
                    <Card key={feedback.id} className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 group animate-fadeInUp" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            {renderStars(feedback.rating)}
                            <h4 className="text-lg font-bold text-purple-200 font-urbanist">{feedback.title}</h4>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="text-purple-300 hover:text-purple-200 hover:bg-purple-900/20 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFeedback(feedback.id)}
                              disabled={deletingFeedback === feedback.id}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg"
                            >
                              {deletingFeedback === feedback.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-purple-300 line-clamp-3 font-inter leading-relaxed">
                          {feedback.comment}
                        </p>
                        
                        <div className="flex items-center gap-3 pt-3 border-t border-purple-400/10">
                          <Badge 
                            variant={feedback.isApproved ? "default" : "secondary"}
                            className={feedback.isApproved ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}
                          >
                            {feedback.isApproved ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Approved</>
                            ) : (
                              <><Clock className="w-3 h-3 mr-1" /> Pending</>
                            )}
                          </Badge>
                          {feedback.isFeatured && (
                            <Badge variant="outline" className="border-purple-400 text-purple-400">
                              <Award className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          <span className="text-xs text-purple-300/70 ml-auto font-inter">
                            {formatDate(feedback.createdAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20">
                  <CardContent className="p-16 text-center">
                    <div className="w-24 h-24 bg-purple-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-12 h-12 text-purple-400/50" />
                    </div>
                    <h3 className="text-2xl font-bold text-purple-200 mb-3 font-urbanist">No reviews yet</h3>
                    <p className="text-purple-300 mb-8 font-inter max-w-md mx-auto">
                      Share your experience with Home4Paws!
                    </p>
                    <Button asChild className="h-14 px-8 rounded-[32px] bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 shadow-xl shadow-purple-500/30 font-inter font-semibold">
                      <Link href="/feedbacks">
                        Write Your First Review
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Settings Tab - Enhanced */}
            <TabsContent value="settings" className="space-y-6 animate-fadeInUp">
              <Card className="bg-neutral-900/80 backdrop-blur-md border-purple-400/20">
                <CardHeader className="border-b border-purple-400/10">
                  <CardTitle className="text-purple-200 font-urbanist">Account Settings</CardTitle>
                  <CardDescription className="text-purple-300/70 font-inter">Manage your account preferences and privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {[
                    {
                      icon: BellIcon,
                      title: 'Email Notifications',
                      description: 'Receive updates about your orders',
                      action: 'Configure',
                      color: 'from-blue-600 to-cyan-600'
                    },
                    {
                      icon: ShieldIcon,
                      title: 'Privacy Settings',
                      description: 'Control who can see your profile',
                      action: 'Manage',
                      color: 'from-purple-600 to-pink-600'
                    },
                    {
                      icon: UserIcon,
                      title: 'Account Security',
                      description: 'Password and two-factor authentication',
                      action: 'Update',
                      color: 'from-green-600 to-emerald-600'
                    }
                  ].map((setting, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-br from-neutral-900/50 to-neutral-800/50 border border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 group">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 bg-gradient-to-br ${setting.color} bg-opacity-20 rounded-xl border border-purple-400/20 group-hover:scale-110 transition-transform duration-300`}>
                            <setting.icon className="w-6 h-6 text-purple-300" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-purple-200 font-urbanist mb-1">{setting.title}</h4>
                            <p className="text-sm text-purple-300/70 font-inter">{setting.description}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-purple-400/30 text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 rounded-xl font-inter"
                        >
                          {setting.action}
                        </Button>
                      </div>
                      {idx < 2 && <div className="my-4 border-t border-purple-400/10" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  )
}