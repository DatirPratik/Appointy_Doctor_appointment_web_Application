import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
    try {
        const token = req.headers.token;

        console.log("AUTH TOKEN EXISTS:", !!token);
        console.log("JWT SECRET EXISTS:", !!process.env.JWT_SECRET);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not Authorized. Login Again"
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "JWT_SECRET is missing on server"
            });
        }

        const token_decode = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        console.log("TOKEN DECODED:", token_decode);

        req.body = req.body || {};

        req.body.userId = token_decode.id;

        next();

    } catch (error) {
        console.error("AUTH ERROR:", error.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

export default authUser;