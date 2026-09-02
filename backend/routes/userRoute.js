import express from 'express'

import {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    getSingleAppointment,
    cancelAppointment,
    paymentRazorpay,
    verifyRazorpay
} from '../controllers/userController.js'

import authUser from '../middlewares/authUser.js'

import upload from '../middlewares/multer.js'


const userRouter = express.Router()


// ============================================================
// USER AUTH
// ============================================================

userRouter.post(
    "/register",
    registerUser
)

userRouter.post(
    "/login",
    loginUser
)


// ============================================================
// USER PROFILE
// ============================================================

userRouter.post(
    "/get-profile",
    authUser,
    getProfile
)

userRouter.post(
    "/update-profile",
    upload.single('image'),
    authUser,
    updateProfile
)


// ============================================================
// APPOINTMENT
// ============================================================

userRouter.post(
    "/book-appointment",
    authUser,
    bookAppointment
)

userRouter.post(
    "/appointments",
    authUser,
    listAppointment
)


// ============================================================
// SELECTED APPOINTMENT
// ============================================================

userRouter.post(
    "/single-appointment",
    authUser,
    getSingleAppointment
)


// ============================================================
// CANCEL APPOINTMENT
// ============================================================

userRouter.post(
    "/cancel-appointment",
    authUser,
    cancelAppointment
)


// ============================================================
// PAYMENT
// ============================================================

userRouter.post(
    "/payment-razorpay",
    authUser,
    paymentRazorpay
)

userRouter.post(
    "/verifyRazorpay",
    authUser,
    verifyRazorpay
)


export default userRouter