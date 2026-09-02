import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from "../models/userModel.js"
import doctorModel from "../models/doctorModel.js"
import appointmentModel from "../models/appointmentModel.js"
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from 'cloudinary'
import Razorpay from 'razorpay'


// ============================================================
// RAZORPAY INSTANCE
// ============================================================

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})


// ============================================================
// API TO REGISTER USER
// ============================================================

const registerUser = async (req, res) => {
    try {

        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.json({
                success: false,
                message: "Missing Details"
            })
        }

        if (!validator.isEmail(email)) {
            return res.json({
                success: false,
                message: "Please enter a valid email"
            })
        }

        if (password.length < 8) {
            return res.json({
                success: false,
                message: "Please enter a strong password"
            })
        }

        const existingUser = await userModel.findOne({ email })

        if (existingUser) {
            return res.json({
                success: false,
                message: "User already exists"
            })
        }

        const salt = await bcrypt.genSalt(10)

        const hashedPassword =
            await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword
        }

        const newUser =
            new userModel(userData)

        const user =
            await newUser.save()

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET
        )

        res.json({
            success: true,
            token
        })

    } catch (error) {

        console.log(
            "REGISTER ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Registration failed"
        })
    }
}


// ============================================================
// API TO LOGIN USER
// ============================================================

const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body

        if (!email || !password) {
            return res.json({
                success: false,
                message: "Email and password are required"
            })
        }

        const user =
            await userModel.findOne({ email })

        if (!user) {
            return res.json({
                success: false,
                message: "User does not exist"
            })
        }

        const isMatch =
            await bcrypt.compare(
                password,
                user.password
            )

        if (!isMatch) {
            return res.json({
                success: false,
                message: "Invalid credentials"
            })
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET
        )

        res.json({
            success: true,
            token
        })

    } catch (error) {

        console.log(
            "LOGIN ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Login failed"
        })
    }
}


// ============================================================
// API TO GET USER PROFILE
// ============================================================

const getProfile = async (req, res) => {
    try {

        const { token } = req.headers

        if (!token) {
            return res.json({
                success: false,
                message:
                    "Not Authorized. Please login again."
            })
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            )

        const userData =
            await userModel
                .findById(decoded.id)
                .select("-password")

        if (!userData) {
            return res.json({
                success: false,
                message: "User not found"
            })
        }

        res.json({
            success: true,
            userData
        })

    } catch (error) {

        console.log(
            "GET PROFILE ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Unable to get profile"
        })
    }
}


// ============================================================
// API TO UPDATE USER PROFILE
// ============================================================

const updateProfile = async (req, res) => {
    try {

        const {
            userId,
            name,
            phone,
            address,
            dob,
            gender
        } = req.body

        const imageFile = req.file

        if (!userId) {
            return res.json({
                success: false,
                message: "User ID is required"
            })
        }

        if (!name || !phone || !dob || !gender) {
            return res.json({
                success: false,
                message: "Data Missing"
            })
        }

        let parsedAddress = address

        if (typeof address === "string") {
            try {
                parsedAddress = JSON.parse(address)
            } catch (error) {
                parsedAddress = address
            }
        }

        await userModel.findByIdAndUpdate(
            userId,
            {
                name,
                phone,
                address: parsedAddress,
                dob,
                gender
            }
        )

        if (imageFile) {

            const imageUpload =
                await cloudinary.uploader.upload(
                    imageFile.path,
                    {
                        resource_type: "image"
                    }
                )

            await userModel.findByIdAndUpdate(
                userId,
                {
                    image: imageUpload.secure_url
                }
            )
        }

        res.json({
            success: true,
            message: "Profile Updated"
        })

    } catch (error) {

        console.log(
            "UPDATE PROFILE ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Profile update failed"
        })
    }
}


// ============================================================
// API TO BOOK APPOINTMENT
// ============================================================

const bookAppointment = async (req, res) => {
    try {

        const {
            userId,
            docId,
            slotDate,
            slotTime
        } = req.body

        if (!userId || !docId || !slotDate || !slotTime) {
            return res.json({
                success: false,
                message: "Missing appointment details"
            })
        }

        // Find doctor
        const docData =
            await doctorModel
                .findById(docId)
                .select("-password")

        if (!docData) {
            return res.json({
                success: false,
                message: "Doctor not found"
            })
        }

        if (!docData.available) {
            return res.json({
                success: false,
                message: "Doctor Not Available"
            })
        }

        // Find user
        const userData =
            await userModel
                .findById(userId)
                .select("-password")

        if (!userData) {
            return res.json({
                success: false,
                message:
                    "User not found. Please login again."
            })
        }

        // ====================================================
        // BOOKING LOG
        // ====================================================

        console.log("")
        console.log("========== BOOK APPOINTMENT ==========")
        console.log("Patient:", userData.name)
        console.log("Doctor:", docData.name)
        console.log("Date:", slotDate)
        console.log("Time:", slotTime)
        console.log("Amount:", `₹${docData.fees}`)

        // Doctor booked slots
        let slots_booked =
            docData.slots_booked || {}

        if (slots_booked[slotDate]) {

            if (
                slots_booked[slotDate]
                    .includes(slotTime)
            ) {

                return res.json({
                    success: false,
                    message: "Slot Not Available"
                })
            }

            slots_booked[slotDate].push(slotTime)

        } else {

            slots_booked[slotDate] = [slotTime]
        }

        // Convert mongoose document to plain object
        const doctorAppointmentData =
            docData.toObject()

        delete doctorAppointmentData.slots_booked

        // Appointment data
        const appointmentData = {
            userId,
            docId,
            userData,
            docData: doctorAppointmentData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment =
            new appointmentModel(
                appointmentData
            )

        await newAppointment.save()

        await doctorModel.findByIdAndUpdate(
            docId,
            {
                slots_booked
            }
        )

        console.log(
            "Appointment booked successfully"
        )

        console.log(
            "===================================="
        )

        console.log("")

        res.json({
            success: true,
            message: "Appointment Booked"
        })

    } catch (error) {

        console.error(
            "BOOK APPOINTMENT ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Unable to book appointment"
        })
    }
}


// ============================================================
// API TO GET USER APPOINTMENTS
// ============================================================

const listAppointment = async (req, res) => {
    try {

        const { token } = req.headers

        if (!token) {
            return res.json({
                success: false,
                message:
                    "Not Authorized. Please login again."
            })
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            )

        const appointments =
            await appointmentModel
                .find({
                    userId: decoded.id
                })
                .sort({
                    date: -1
                })

        res.json({
            success: true,
            appointments
        })

    } catch (error) {

        console.log(
            "LIST APPOINTMENT ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Unable to fetch appointments"
        })
    }
}


// ============================================================
// API TO GET SINGLE APPOINTMENT
// ============================================================

const getSingleAppointment = async (req, res) => {
    try {

        const { appointmentId } = req.body

        if (!appointmentId) {
            return res.json({
                success: false,
                message: "Appointment ID is required"
            })
        }

        const appointmentData =
            await appointmentModel.findById(
                appointmentId
            )

        if (!appointmentData) {
            return res.json({
                success: false,
                message: "Appointment not found"
            })
        }

        // No terminal logging here.
        // Data is returned to frontend.

        res.json({
            success: true,
            appointment: appointmentData
        })

    } catch (error) {

        console.log(
            "GET SINGLE APPOINTMENT ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Unable to fetch appointment"
        })
    }
}


// ============================================================
// REFUND HELPER
// ============================================================

const calculateRefund = (
    appointmentDateTime,
    amount
) => {

    const now = new Date()

    const apptTime =
        new Date(appointmentDateTime)

    const hoursLeft =
        (apptTime - now) /
        (1000 * 60 * 60)

    if (hoursLeft > 48) {

        return {
            percent: 100,
            refundAmount: amount,
            refundStatus: "full"
        }

    } else if (hoursLeft > 24) {

        return {
            percent: 70,
            refundAmount:
                Math.round(amount * 0.7),
            refundStatus: "partial_70"
        }

    } else if (hoursLeft > 12) {

        return {
            percent: 50,
            refundAmount:
                Math.round(amount * 0.5),
            refundStatus: "partial_50"
        }

    } else {

        return {
            percent: 0,
            refundAmount: 0,
            refundStatus: "no_refund"
        }
    }
}


// ============================================================
// PARSE APPOINTMENT DATE TIME
// ============================================================

const parseAppointmentDateTime = (
    slotDate,
    slotTime
) => {

    if (!slotDate || !slotTime) {
        return null
    }

    const [
        day,
        month,
        year
    ] = slotDate.split("_")

    const timeParts =
        slotTime.trim().split(/\s+/)

    const time =
        timeParts[0]

    const modifier =
        timeParts[1]

    let [
        hours,
        minutes
    ] = time
        .split(":")
        .map(Number)

    if (
        modifier === "PM" &&
        hours !== 12
    ) {
        hours += 12
    }

    if (
        modifier === "AM" &&
        hours === 12
    ) {
        hours = 0
    }

    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hours,
        minutes,
        0
    )
}


// ============================================================
// API TO CANCEL APPOINTMENT
// ============================================================

const cancelAppointment = async (req, res) => {
    try {

        const { token } = req.headers

        if (!token) {
            return res.json({
                success: false,
                message:
                    "Not Authorized. Please login again."
            })
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            )

        const userId =
            decoded.id

        const { appointmentId } =
            req.body

        if (!appointmentId) {
            return res.json({
                success: false,
                message: "Appointment ID is required"
            })
        }

        const appointmentData =
            await appointmentModel.findById(
                appointmentId
            )

        if (!appointmentData) {
            return res.json({
                success: false,
                message: "Appointment not found"
            })
        }

        // Convert IDs to strings for safe comparison
        if (
            appointmentData.userId.toString() !==
            userId.toString()
        ) {
            return res.json({
                success: false,
                message: "Unauthorized action"
            })
        }

        if (appointmentData.cancelled) {
            return res.json({
                success: false,
                message:
                    "Appointment already cancelled"
            })
        }

        // ====================================================
        // MARK CANCELLED
        // ====================================================

        await appointmentModel.findByIdAndUpdate(
            appointmentId,
            {
                cancelled: true
            }
        )

        // ====================================================
        // RELEASE DOCTOR SLOT
        // ====================================================

        const {
            docId,
            slotDate,
            slotTime
        } = appointmentData

        const doctorData =
            await doctorModel.findById(docId)

        if (doctorData) {

            let slots_booked =
                doctorData.slots_booked || {}

            if (slots_booked[slotDate]) {

                slots_booked[slotDate] =
                    slots_booked[slotDate]
                        .filter(
                            e => e !== slotTime
                        )
            }

            await doctorModel.findByIdAndUpdate(
                docId,
                {
                    slots_booked
                }
            )
        }

        // ====================================================
        // REFUND LOGIC
        // ====================================================

        if (appointmentData.payment) {

            const apptDateTime =
                parseAppointmentDateTime(
                    slotDate,
                    slotTime
                )

            if (!apptDateTime) {
                return res.json({
                    success: true,
                    message:
                        "Appointment Cancelled"
                })
            }

            const {
                percent,
                refundAmount,
                refundStatus
            } =
                calculateRefund(
                    apptDateTime,
                    appointmentData.amount
                )

            if (percent > 0) {

                try {

                    const razorpayOrderId =
                        appointmentData.razorpayOrderId

                    // No Razorpay order available
                    if (!razorpayOrderId) {

                        await appointmentModel.findByIdAndUpdate(
                            appointmentId,
                            {
                                refundStatus,
                                refundAmount
                            }
                        )

                        return res.json({
                            success: true,
                            message:
                                `Appointment Cancelled. Refund of ₹${refundAmount} will be processed manually.`,
                            refundAmount,
                            refundStatus
                        })
                    }

                    // Get payments for order
                    const payments =
                        await razorpayInstance
                            .orders
                            .fetchPayments(
                                razorpayOrderId
                            )

                    const paymentId =
                        payments.items?.[0]?.id

                    if (paymentId) {

                        const refund =
                            await razorpayInstance
                                .payments
                                .refund(
                                    paymentId,
                                    {
                                        amount:
                                            refundAmount * 100,
                                        notes: {
                                            appointmentId:
                                                appointmentId.toString(),
                                            reason:
                                                "Appointment Cancelled"
                                        }
                                    }
                                )

                        await appointmentModel.findByIdAndUpdate(
                            appointmentId,
                            {
                                refundStatus,
                                refundAmount,
                                refundId: refund.id
                            }
                        )

                        return res.json({
                            success: true,
                            message:
                                `Appointment Cancelled. Refund of ₹${refundAmount} (${percent}%) initiated successfully.`,
                            refundAmount,
                            refundStatus,
                            refundId: refund.id
                        })

                    } else {

                        await appointmentModel.findByIdAndUpdate(
                            appointmentId,
                            {
                                refundStatus,
                                refundAmount
                            }
                        )

                        return res.json({
                            success: true,
                            message:
                                `Appointment Cancelled. Refund of ₹${refundAmount} will be processed manually.`,
                            refundAmount,
                            refundStatus
                        })
                    }

                } catch (refundError) {

                    console.error(
                        "RAZORPAY REFUND ERROR:",
                        refundError?.message || refundError
                    )

                    await appointmentModel.findByIdAndUpdate(
                        appointmentId,
                        {
                            refundStatus,
                            refundAmount
                        }
                    )

                    return res.json({
                        success: true,
                        message:
                            `Appointment Cancelled. Refund of ₹${refundAmount} will be processed within 5-7 business days.`,
                        refundAmount,
                        refundStatus
                    })
                }

            } else {

                await appointmentModel.findByIdAndUpdate(
                    appointmentId,
                    {
                        refundStatus: "no_refund",
                        refundAmount: 0
                    }
                )

                return res.json({
                    success: true,
                    message:
                        "Appointment Cancelled. No refund applicable.",
                    refundAmount: 0,
                    refundStatus: "no_refund"
                })
            }

        } else {

            await appointmentModel.findByIdAndUpdate(
                appointmentId,
                {
                    refundStatus: "none",
                    refundAmount: 0
                }
            )

            return res.json({
                success: true,
                message:
                    "Appointment Cancelled"
            })
        }

    } catch (error) {

        console.log(
            "CANCEL APPOINTMENT ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Unable to cancel appointment"
        })
    }
}


// ============================================================
// API TO MAKE PAYMENT
// ============================================================

const paymentRazorpay = async (req, res) => {
    try {

        const { appointmentId } =
            req.body

        console.log("")
        console.log("========== PAYMENT ==========")
        console.log(
            "Appointment ID:",
            appointmentId
        )

        if (!appointmentId) {
            return res.json({
                success: false,
                message:
                    "Appointment ID is required"
            })
        }

        const appointmentData =
            await appointmentModel.findById(
                appointmentId
            )

        if (!appointmentData) {
            return res.json({
                success: false,
                message: "Appointment not found"
            })
        }

        if (appointmentData.cancelled) {
            return res.json({
                success: false,
                message:
                    "Appointment is cancelled"
            })
        }

        if (appointmentData.payment) {
            return res.json({
                success: false,
                message:
                    "Appointment is already paid"
            })
        }

        console.log(
            "Patient:",
            appointmentData.userData?.name
        )

        console.log(
            "Doctor:",
            appointmentData.docData?.name
        )

        console.log(
            "Amount:",
            `₹${appointmentData.amount}`
        )

        // ====================================================
        // CHECK RAZORPAY CONFIGURATION
        // ====================================================

        if (
            !process.env.RAZORPAY_KEY_ID ||
            !process.env.RAZORPAY_KEY_SECRET
        ) {

            console.log(
                "Razorpay keys are missing"
            )

            return res.json({
                success: false,
                message:
                    "Razorpay configuration is missing"
            })
        }

        const options = {
            amount:
                Math.round(
                    Number(appointmentData.amount) * 100
                ),
            currency:
                process.env.CURRENCY || "INR",
            receipt:
                appointmentId.toString()
        }

        // ====================================================
        // CREATE RAZORPAY ORDER
        // ====================================================

        const order =
            await razorpayInstance
                .orders
                .create(options)

        console.log(
            "Payment Status: Order Created"
        )

        console.log(
            "Razorpay Order ID:",
            order.id
        )

        console.log(
            "============================"
        )

        console.log("")

        await appointmentModel.findByIdAndUpdate(
            appointmentId,
            {
                razorpayOrderId: order.id
            }
        )

        res.json({
            success: true,
            key_id: process.env.RAZORPAY_KEY_ID,
            order
        })

    } catch (error) {

        console.error("")
        console.error(
            "========== PAYMENT ERROR =========="
        )

        console.error(
            "Status:",
            error?.statusCode || "N/A"
        )

        console.error(
            "Code:",
            error?.error?.code || "N/A"
        )

        console.error(
            "Message:",
            error?.error?.description ||
            error?.message ||
            "Unable to create Razorpay order"
        )

        console.error(
            "=================================="
        )

        console.error("")

        res.json({
            success: false,
            message:
                error?.error?.description ||
                error?.message ||
                "Unable to create Razorpay order"
        })
    }
}


// ============================================================
// API TO VERIFY RAZORPAY PAYMENT
// ============================================================

const verifyRazorpay = async (req, res) => {
    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.json({
                success: false,
                message:
                    "Payment verification data is missing"
            })
        }

        // ====================================================
        // VERIFY PAYMENT SIGNATURE
        // ====================================================

        const crypto =
            await import("crypto")

        const generatedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(
                    `${razorpay_order_id}|${razorpay_payment_id}`
                )
                .digest("hex")

        if (
            generatedSignature !==
            razorpay_signature
        ) {

            return res.json({
                success: false,
                message:
                    "Payment signature verification failed"
            })
        }

        // ====================================================
        // FETCH ORDER
        // ====================================================

        const orderInfo =
            await razorpayInstance
                .orders
                .fetch(
                    razorpay_order_id
                )

        if (!orderInfo) {
            return res.json({
                success: false,
                message:
                    "Razorpay order not found"
            })
        }

        // ====================================================
        // UPDATE APPOINTMENT
        // ====================================================

        await appointmentModel.findByIdAndUpdate(
            orderInfo.receipt,
            {
                payment: true,
                razorpayOrderId:
                    razorpay_order_id,
                razorpayPaymentId:
                    razorpay_payment_id
            }
        )

        console.log("")
        console.log(
            "========== PAYMENT SUCCESS =========="
        )

        console.log(
            "Payment Status: Paid"
        )

        console.log(
            "====================================="
        )

        console.log("")

        res.json({
            success: true,
            message:
                "Payment Successful"
        })

    } catch (error) {

        console.log(
            "VERIFY PAYMENT ERROR:",
            error?.message || error
        )

        res.json({
            success: false,
            message:
                error?.message ||
                "Payment verification failed"
        })
    }
}


// ============================================================
// EXPORT
// ============================================================

export {
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
}