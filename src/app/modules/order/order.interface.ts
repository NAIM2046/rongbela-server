interface Customer {
  name: string;
  email: string;
  phone: string;
}

interface ShippingAddress {
  exactAddress: string;
  division: string;
  district: string;
}

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  productUrl?: string;
}

interface OrderPayload {
  customer: Customer;
  shippingAddress: ShippingAddress;
  items: CartItem[];
  paymentMethod: string;
  totalAmount: number;
}
