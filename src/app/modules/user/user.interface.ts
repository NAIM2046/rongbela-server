// src/app/modules/customer/user/user.interface.ts



export interface IUser {
  id: string;
  
  name: string;
  email: string;
  regId: string;
  phone: string;
  department: string;
  batch: string;
  role:   "STUDENT" | "DRIVER"  | "ADMIN"
  createdAt: Date;
  updatedAt: Date;
}
