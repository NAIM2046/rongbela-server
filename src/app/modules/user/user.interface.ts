// src/app/modules/customer/user/user.interface.ts

export interface IUser {
  name: string;
  email: string;

  role: "ADMIN";
  password: string;
}
