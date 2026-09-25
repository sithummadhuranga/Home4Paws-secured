"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, MapPin, Plus, Trash2, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { SavedAddress, CreateUpdateAddressDto, ShippingAddress } from '@/types';
import { getUserAddresses, createAddress, deleteAddress, setDefaultAddress } from '@/services/addressService';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const shippingSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number (10 digits)'),
  address: z.string().min(5, 'Please enter a valid address'),
  apartment: z.string().optional(),
  city: z.string().min(2, 'Please enter a valid city'),
  province: z.string().min(2, 'Please select a province'),
  postalCode: z.string().min(5, 'Please enter a valid postal code'),
  district: z.string().min(2, 'Please select a district'),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

interface ShippingFormProps {
  onComplete: () => void;
}

const SRI_LANKA_PROVINCES = [
  { value: 'WP', label: 'Western Province' },
  { value: 'CP', label: 'Central Province' },
  { value: 'SP', label: 'Southern Province' },
  { value: 'NP', label: 'Northern Province' },
  { value: 'EP', label: 'Eastern Province' },
  { value: 'NWP', label: 'North Western Province' },
  { value: 'NC', label: 'North Central Province' },
  { value: 'UP', label: 'Uva Province' },
  { value: 'SG', label: 'Sabaragamuwa Province' },
];

const SRI_LANKA_DISTRICTS = [
  { value: 'Colombo', label: 'Colombo', province: 'WP' },
  { value: 'Gampaha', label: 'Gampaha', province: 'WP' },
  { value: 'Kalutara', label: 'Kalutara', province: 'WP' },
  { value: 'Kandy', label: 'Kandy', province: 'CP' },
  { value: 'Matale', label: 'Matale', province: 'CP' },
  { value: 'Nuwara Eliya', label: 'Nuwara Eliya', province: 'CP' },
  { value: 'Galle', label: 'Galle', province: 'SP' },
  { value: 'Matara', label: 'Matara', province: 'SP' },
  { value: 'Hambantota', label: 'Hambantota', province: 'SP' },
  { value: 'Jaffna', label: 'Jaffna', province: 'NP' },
  { value: 'Kilinochchi', label: 'Kilinochchi', province: 'NP' },
  { value: 'Mannar', label: 'Mannar', province: 'NP' },
  { value: 'Mullaitivu', label: 'Mullaitivu', province: 'NP' },
  { value: 'Vavuniya', label: 'Vavuniya', province: 'NP' },
  { value: 'Trincomalee', label: 'Trincomalee', province: 'EP' },
  { value: 'Batticaloa', label: 'Batticaloa', province: 'EP' },
  { value: 'Ampara', label: 'Ampara', province: 'EP' },
  { value: 'Kurunegala', label: 'Kurunegala', province: 'NWP' },
  { value: 'Puttalam', label: 'Puttalam', province: 'NWP' },
  { value: 'Anuradhapura', label: 'Anuradhapura', province: 'NC' },
  { value: 'Polonnaruwa', label: 'Polonnaruwa', province: 'NC' },
  { value: 'Badulla', label: 'Badulla', province: 'UP' },
  { value: 'Monaragala', label: 'Monaragala', province: 'UP' },
  { value: 'Ratnapura', label: 'Ratnapura', province: 'SG' },
  { value: 'Kegalle', label: 'Kegalle', province: 'SG' },
];

export function ShippingForm({ onComplete }: ShippingFormProps) {
  const [billingAddressSame, setBillingAddressSame] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  
  const { setShippingAddress, setBillingAddress, shippingAddress } = useCart();
  const { user, isAuthenticated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: shippingAddress?.firstName || user?.firstName || '',
      lastName: shippingAddress?.lastName || user?.lastName || '',
      email: shippingAddress?.email || user?.email || '',
      phone: shippingAddress?.phone || '',
      address: shippingAddress?.address || '',
      apartment: shippingAddress?.apartment || '',
      city: shippingAddress?.city || '',
      province: shippingAddress?.province || '',
      postalCode: shippingAddress?.postalCode || '',
      district: shippingAddress?.district || '',
    }
  });

  const selectedProvince = watch('province');

  // Filter districts based on selected province
  const availableDistricts = selectedProvince
    ? SRI_LANKA_DISTRICTS.filter(d => d.province === selectedProvince)
    : [];

  // Load saved addresses
  useEffect(() => {
    const loadSavedAddresses = async () => {
      if (!isAuthenticated) {
        setIsLoadingAddresses(false);
        return;
      }

      try {
        const addresses = await getUserAddresses();
        setSavedAddresses(addresses || []); // ✅ Ensure we always set an array
      } catch (error) {
        console.error('Error loading saved addresses:', error);
        setSavedAddresses([]); // ✅ Set empty array on error
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    loadSavedAddresses();
  }, [isAuthenticated]);

  const handleSelectAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setValue('firstName', address.firstName);
    setValue('lastName', address.lastName);
    setValue('email', address.email);
    setValue('phone', address.phone);
    setValue('address', address.address);
    setValue('apartment', address.apartment || '');
    setValue('city', address.city);
    setValue('province', address.province);
    setValue('district', address.district);
    setValue('postalCode', address.postalCode);
    trigger();
  };

  const handleDeleteAddress = async (id: number) => {
    if (!isAuthenticated) return;

    try {
      await deleteAddress(id);
      setSavedAddresses(prev => prev.filter(a => a.id !== id));
      if (selectedAddressId === id) {
        setSelectedAddressId(null);
        reset();
      }
      toast.success('Address deleted successfully');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: number) => {
    if (!isAuthenticated) return;

    try {
      await setDefaultAddress(id);
      setSavedAddresses(prev => prev.map(a => ({
        ...a,
        isDefault: a.id === id
      })));
      toast.success('Default address updated');
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to set default address');
    }
  };

  const onSubmit = async (data: ShippingFormData) => {
    setIsSubmitting(true);
    
    try {
      const mappedShippingData: ShippingAddress = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        apartment: data.apartment,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        country: 'Sri Lanka',
        district: data.district,
      } as ShippingAddress & { district: string };
      
      setShippingAddress(mappedShippingData);
      
      if (billingAddressSame) {
        setBillingAddress(mappedShippingData);
      }

      // Save address if requested and user is authenticated
      if (saveAddress && isAuthenticated && !selectedAddressId) {
        try {
          await createAddress({
            addressType: 'Shipping',
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            apartment: data.apartment,
            city: data.city,
            province: data.province,
            district: data.district,
            postalCode: data.postalCode,
            country: 'Sri Lanka',
            isDefault: savedAddresses.length === 0,
          });
          toast.success('Address saved for future use');
          
          // Reload addresses
          const addresses = await getUserAddresses();
          setSavedAddresses(addresses || []); // ✅ Ensure array
        } catch (error) {
          console.error('Error saving address:', error);
          toast.error('Address saved to order but failed to save for future use');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      onComplete();
    } catch (error) {
      console.error('Error saving shipping information:', error);
      toast.error('Failed to save shipping information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProvinceChange = async (value: string) => {
    setValue('province', value, { shouldValidate: true });
    setValue('district', '', { shouldValidate: true });
    await trigger(['province', 'district']);
  };

  const handleDistrictChange = async (value: string) => {
    setValue('district', value, { shouldValidate: true });
    await trigger('district');
  };

  // ✅ NEW: Handler for using selected address
  const handleUseSelectedAddress = async () => {
    if (!selectedAddressId) return;
    
    setIsSubmitting(true);
    try {
      const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
      if (!selectedAddress) {
        toast.error('Please select an address');
        return;
      }

      const mappedShippingData: ShippingAddress = {
        firstName: selectedAddress.firstName,
        lastName: selectedAddress.lastName,
        email: selectedAddress.email,
        phone: selectedAddress.phone,
        address: selectedAddress.address,
        apartment: selectedAddress.apartment,
        city: selectedAddress.city,
        province: selectedAddress.province,
        postalCode: selectedAddress.postalCode,
        country: selectedAddress.country,
        district: selectedAddress.district,
      } as ShippingAddress & { district: string };
      
      setShippingAddress(mappedShippingData);
      
      if (billingAddressSame) {
        setBillingAddress(mappedShippingData);
      }

      toast.success('Address selected successfully');
      await new Promise(resolve => setTimeout(resolve, 500));
      onComplete();
    } catch (error) {
      console.error('Error using selected address:', error);
      toast.error('Failed to use selected address');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAddresses) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-purple-200 font-urbanist">Shipping Information</h2>
          <p className="text-purple-300 font-inter">Enter your delivery details for Sri Lanka 🇱🇰</p>
        </div>
      </div>

      {/* Saved Addresses Section */}
      {savedAddresses.length > 0 && !showNewAddressForm && (
        <Card className="border-purple-400/20 bg-neutral-900/60 backdrop-blur-sm shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-200 font-urbanist">Saved Addresses</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewAddressForm(true)}
                className="text-purple-300 hover:text-purple-200 font-inter"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </div>
            
            <div className="space-y-3">
              {savedAddresses.map((address) => (
                <div
                  key={address.id}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedAddressId === address.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-purple-400/20 hover:border-purple-400/40 bg-neutral-800/30'
                  }`}
                  onClick={() => handleSelectAddress(address)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-purple-200 font-urbanist">
                          {address.firstName} {address.lastName}
                        </p>
                        {address.isDefault && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full font-inter">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-purple-300 font-inter">{address.address}</p>
                      {address.apartment && (
                        <p className="text-sm text-purple-300 font-inter">{address.apartment}</p>
                      )}
                      <p className="text-sm text-purple-300 font-inter">
                        {address.city}, {address.district}, {address.province} {address.postalCode}
                      </p>
                      <p className="text-sm text-purple-300 font-inter">{address.phone}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {!address.isDefault && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(address.id);
                          }}
                          className="text-purple-300 hover:text-purple-200"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddress(address.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedAddressId && (
              <Button
                onClick={handleUseSelectedAddress}
                disabled={isSubmitting}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-urbanist"
              >
                {isSubmitting ? 'Processing...' : 'Use Selected Address'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Address Form */}
      {(showNewAddressForm || savedAddresses.length === 0) && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {showNewAddressForm && savedAddresses.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowNewAddressForm(false);
                setSelectedAddressId(null);
              }}
              className="text-purple-300 hover:text-purple-200 font-inter"
            >
              ← Back to saved addresses
            </Button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-purple-200 font-urbanist">First Name</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.firstName ? 'border-red-500' : ''}`}
              />
              {errors.firstName && (
                <p className="text-sm text-red-400 font-inter">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-purple-200 font-urbanist">Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName')}
                className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.lastName ? 'border-red-500' : ''}`}
              />
              {errors.lastName && (
                <p className="text-sm text-red-400 font-inter">{errors.lastName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-200 font-urbanist">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-red-400 font-inter">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-purple-200 font-urbanist">Phone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="07XXXXXXXX"
                className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.phone ? 'border-red-500' : ''}`}
              />
              {errors.phone && (
                <p className="text-sm text-red-400 font-inter">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-purple-200 font-urbanist">Street Address</Label>
            <Input
              id="address"
              {...register('address')}
              className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.address ? 'border-red-500' : ''}`}
            />
            {errors.address && (
              <p className="text-sm text-red-400 font-inter">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apartment" className="text-purple-200 font-urbanist">Apartment, Suite, etc. (Optional)</Label>
            <Input
              id="apartment"
              {...register('apartment')}
              className="bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="province" className="text-purple-200 font-urbanist">Province</Label>
              <Select
                value={watch('province')}
                onValueChange={handleProvinceChange}
              >
                <SelectTrigger className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.province ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {SRI_LANKA_PROVINCES.map((province) => (
                    <SelectItem key={province.value} value={province.value}>
                      {province.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.province && (
                <p className="text-sm text-red-400 font-inter">{errors.province.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="district" className="text-purple-200 font-urbanist">District</Label>
              <Select
                value={watch('district')}
                onValueChange={handleDistrictChange}
                disabled={!selectedProvince}
              >
                <SelectTrigger className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.district ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {availableDistricts.map((district) => (
                    <SelectItem key={district.value} value={district.value}>
                      {district.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.district && (
                <p className="text-sm text-red-400 font-inter">{errors.district.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="text-purple-200 font-urbanist">City</Label>
              <Input
                id="city"
                {...register('city')}
                className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.city ? 'border-red-500' : ''}`}
              />
              {errors.city && (
                <p className="text-sm text-red-400 font-inter">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode" className="text-purple-200 font-urbanist">Postal Code</Label>
              <Input
                id="postalCode"
                {...register('postalCode')}
                placeholder="10000"
                className={`bg-neutral-800/50 border-purple-400/30 text-purple-200 font-inter ${errors.postalCode ? 'border-red-500' : ''}`}
              />
              {errors.postalCode && (
                <p className="text-sm text-red-400 font-inter">{errors.postalCode.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-900/20 rounded-xl border border-purple-400/30">
            <MapPin className="w-5 h-5 text-purple-400" />
            <p className="text-sm text-purple-300 font-inter">
              🇱🇰 Delivering across all provinces in Sri Lanka
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="billingAddressSame"
                checked={billingAddressSame}
                onCheckedChange={(checked) => setBillingAddressSame(checked as boolean)}
              />
              <Label htmlFor="billingAddressSame" className="text-purple-200 cursor-pointer font-inter">
                Billing address is same as shipping address
              </Label>
            </div>

            {isAuthenticated && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saveAddress"
                  checked={saveAddress}
                  onCheckedChange={(checked) => setSaveAddress(checked as boolean)}
                />
                <Label htmlFor="saveAddress" className="text-purple-200 cursor-pointer font-inter">
                  Save this address for future orders
                </Label>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-urbanist"
          >
            {isSubmitting ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </form>
      )}
    </div>
  );
}