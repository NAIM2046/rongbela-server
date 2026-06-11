import { OAuth2Client } from "google-auth-library";
import ApiError from "../../error/ApiError";

// 💡 এখানে রিডাইরেক্ট ইউআরআই পাস করার কোনো দরকার নেই
const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
);

export const verifyGoogleToken = async (idToken: string) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID as string
        });
        
        const payload = ticket.getPayload();
        if (!payload) {
            throw new ApiError(401, "Invalid Google Token");
        }
        
        return {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            sub: payload.sub,
        };
    } catch (error: any) {
        throw new ApiError(401, error.message || "Google Token verification failed");
    }
};