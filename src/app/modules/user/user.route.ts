import express from "express";
import { auth } from "../auth/auth.middleware";
import { changePassword, getProfile, requestUpdateContact, setPassword, updateBasicInfo, verifyUpdateContact } from "./user.controller";



const router = express.Router();
 
router.get("/get-profile", auth(), getProfile)
router.put("/basic-info", auth(),updateBasicInfo );
router.post("/request-update-contact", auth(), requestUpdateContact );
router.post("/verify-update-contact", auth(), verifyUpdateContact );
router.post("/set-password", auth(), setPassword);
router.post("/change-password", auth(), changePassword);

export const UserRoutes = router;