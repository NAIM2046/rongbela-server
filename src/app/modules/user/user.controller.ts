// src/app/modules/customer/user/user.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import ApiError from "../../error/ApiError";
import { UserServices } from "./user.service";
import sendResponse from "../../../shared/sendResponse";



// CREATE USER
export const createUser = catchAsync
    (async (req: Request, res: Response) => {

    const result = await UserServices.CreateAdminIntoDB(req.body);
 

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "admin created successfully",
    data: result,
  });
});

// GET ALL USERS
// export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
//   if (!req.user) {
//     throw new ApiError(401, "Unauthorized");
//   }
  
//   const page = Number(req.query.page) || 1;
//   const limit = Number(req.query.limit) || 10;
//   const search = String(req.query.search || "");

//   const result = await UserServices.getAllUsersFromDB(
    
//     page,
//     limit,
//     search,
//   );

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "Users retrieved successfully",
//     meta: result.meta,
//     data: result.data || result,
//   });
// });

// // UPDATE USER
// export const updateUser = catchAsync(async (req: Request, res: Response) => {
//   if (!req.user) {
//     throw new ApiError(401, "Unauthorized");
//   }

//   const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
//   const data = await UserServices.updateUserIntoDB(id, req.body);

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "User updated successfully",
//     data: data,
//   });
// });

// // DELETE USER
// export const deleteUser = catchAsync(async (req: Request, res: Response) => {
//   const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

//   await UserServices.deleteUserFromDB(id);

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "User deleted successfully",
//     data: null,
//   });
// });



// // SEARCH STUDENT BY EMAIL (HALLADMIN ONLY)
// export const searchStudentByEmail = catchAsync(
//   async (req: Request, res: Response) => {
//     const hallId = req.user?.hallId;
//     if (!hallId) {
//       throw new ApiError(
//         401,
//         "Unauthorized: User is not associated with any hall",
//       );
//     }
//     const searchTerm = String(req.query.query || "");
//     console.log("Search term received:", req.query);
//     const data = await UserServices.searchStudentFromDB(
//       searchTerm,
//       hallId as string,
//     );

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "Student retrieved successfully",
//       data: data,
//     });
//   },
// );

export const UserController = {
  createUser,
  
};
