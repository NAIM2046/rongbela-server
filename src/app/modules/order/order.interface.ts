interface Customer {
  name: string;
  email: string;
  phone: string;
}

interface ShippingAddress {
  street: string;
  city: string;
  district: string;
  zip: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderPayload {
  customer: Customer;
  shippingAddress: ShippingAddress;
  items: CartItem[];
  paymentMethod: string;
  totalAmount: number;
}
