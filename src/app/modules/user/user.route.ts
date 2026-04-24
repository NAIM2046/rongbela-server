// src/app/modules/customer/user/user.route.ts
import express from "express";
import {
  bulkUploadAuthorityProvidedCredentials,
  bulkUploadStudentProvidedCredentials,
  createUser,
  deleteUser,
  getAllUsers,
  searchStudentByEmail,
  updateUser,
} from "./user.controller";
import { auth } from "../../../auth/auth.middleware";
import multer from "multer";
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post("/", auth("HALLADMIN"), createUser);
router.get("/", auth("HALLADMIN"), getAllUsers);
router.get("/search/student", auth("HALLADMIN"), searchStudentByEmail);
router.put("/:id", auth("HALLADMIN"), updateUser);
router.delete("/:id", auth("HALLADMIN"), deleteUser);

router.post(
  "/bulk-upload/authority-credentials",
  auth("HALLADMIN"),
  upload.single("file"),
  bulkUploadAuthorityProvidedCredentials,
);

router.post(
  "/bulk-upload/student-credentials",
  auth("HALLADMIN"),
  upload.single("file"),
  bulkUploadStudentProvidedCredentials,
);

export const UserRoutes = router;