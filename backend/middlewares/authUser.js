import jwt from 'jsonwebtoken'

// user authentication middleware
const authUser = async (req, res, next) => {
    try {
        const { token } = req.headers

        console.log("AUTH TOKEN EXISTS:", !!token)
        console.log("JWT SECRET EXISTS:", !!process.env.JWT_SECRET)

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not Authorized Login Again'
            })
        }

        const token_decode = jwt.verify(
            token,
            process.env.JWT_SECRET
        )

        console.log("TOKEN DECODED:", token_decode)

        if (!req.body) {
            req.body = {}
        }

        req.body.userId = token_decode.id

        next()

    } catch (error) {
        console.log("AUTH ERROR:", error.message)

        return res.status(401).json({
            success: false,
            message: error.message
        })
    }
}

export default authUser