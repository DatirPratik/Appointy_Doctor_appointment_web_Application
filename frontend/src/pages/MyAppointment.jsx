import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const MyAppointments = () => {

    const navigate = useNavigate()

    const {
        backendUrl,
        token,
        getDoctorsData
    } = useContext(AppContext)

    const [appointments, setAppointments] = useState([])
    const [payment, setPayment] = useState(false)

    const [showPolicyModal, setShowPolicyModal] = useState(false)
    const [pendingPaymentId, setPendingPaymentId] = useState(null)

    const [showCancelModal, setShowCancelModal] = useState(false)
    const [cancelInfo, setCancelInfo] = useState(null)

    const [showBillModal, setShowBillModal] = useState(false)
    const [selectedBill, setSelectedBill] = useState(null)

    // --------------------------------------------------
    // FORMAT DATE
    // --------------------------------------------------

    const formatDate = (date) => {

        if (!date) return ''

        const dateArray = date.split('_')

        if (dateArray.length !== 3) {
            return date
        }

        const day = dateArray[0]
        const month = dateArray[1]
        const year = dateArray[2]

        const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec'
        ]

        const monthName = months[Number(month) - 1] || month

        return `${day} ${monthName} ${year}`
    }

    // --------------------------------------------------
    // GET USER APPOINTMENTS
    // --------------------------------------------------

    const getUserAppointments = useCallback(async () => {

        try {

            const { data } = await axios.post(
                `${backendUrl}/api/user/appointments`,
                {},
                {
                    headers: {
                        token
                    }
                }
            )

            if (data.success) {

                setAppointments(data.appointments)

            } else {

                toast.error(data.message)

            }

        } catch (error) {

            console.log(error)

            toast.error(
                error.response?.data?.message ||
                'Unable to fetch appointments'
            )
        }

    }, [backendUrl, token])

    // --------------------------------------------------
    // LOAD APPOINTMENTS
    // --------------------------------------------------

    useEffect(() => {

        if (token) {
            getUserAppointments()
        }

    }, [token, getUserAppointments])

    // --------------------------------------------------
    // SELECT APPOINTMENT
    // --------------------------------------------------

    const handleAppointmentClick = async (appointmentId) => {

        try {

            const { data } = await axios.post(
                `${backendUrl}/api/user/single-appointment`,
                {
                    appointmentId
                },
                {
                    headers: {
                        token
                    }
                }
            )

            if (!data.success) {

                toast.error(data.message)
                return

            }

        } catch (error) {

            console.log(error)

            toast.error(
                error.response?.data?.message ||
                'Unable to fetch appointment'
            )
        }
    }

    // --------------------------------------------------
    // VIEW BILL
    // --------------------------------------------------

    const handleViewBill = (item) => {

        setSelectedBill(item)
        setShowBillModal(true)

    }

    // --------------------------------------------------
    // CLOSE BILL
    // --------------------------------------------------

    const handleCloseBill = () => {

        setShowBillModal(false)
        setSelectedBill(null)

    }

    // --------------------------------------------------
    // PAYMENT POLICY
    // --------------------------------------------------

    const handlePayClick = (appointmentId) => {

        setPendingPaymentId(appointmentId)
        setShowPolicyModal(true)

    }

    // --------------------------------------------------
    // RAZORPAY PAYMENT
    // --------------------------------------------------

    const startPayment = async (appointmentId) => {

        try {

            setPayment(true)

            const appointment = appointments.find(
                item => item._id === appointmentId
            )

            if (!appointment) {

                toast.error('Appointment not found')
                setPayment(false)
                return

            }

            const { data } = await axios.post(
                `${backendUrl}/api/user/payment-razorpay`,
                {
                    appointmentId
                },
                {
                    headers: {
                        token
                    }
                }
            )

            if (!data.success) {

                toast.error(data.message)
                setPayment(false)
                return

            }

            const options = {

                key: data.key_id,

                amount: data.order.amount,

                currency: data.order.currency,

                name: 'Doctor Appointment',

                description: 'Appointment Payment',

                order_id: data.order.id,

                handler: async function (response) {

                    try {

                        const verifyResponse = await axios.post(
                            `${backendUrl}/api/user/verifyRazorpay`,
                            response,
                            {
                                headers: {
                                    token
                                }
                            }
                        )

                        if (verifyResponse.data.success) {

                            toast.success(
                                'Payment completed successfully'
                            )

                            await getUserAppointments()

                        } else {

                            toast.error(
                                verifyResponse.data.message ||
                                'Payment verification failed'
                            )
                        }

                    } catch (error) {

                        console.log(error)

                        toast.error(
                            error.response?.data?.message ||
                            'Payment verification failed'
                        )
                    }
                },

                prefill: {
                    name: appointment.userData?.name || '',
                    email: appointment.userData?.email || '',
                    contact: appointment.userData?.phone || ''
                },

                theme: {
                    color: '#5f6FFF'
                }
            }

            if (!window.Razorpay) {

                toast.error(
                    'Razorpay is not loaded. Please refresh the page.'
                )

                setPayment(false)
                return
            }

            const razorpay = new window.Razorpay(options)

            razorpay.on('payment.failed', function () {

                toast.error('Payment failed')

            })

            razorpay.open()

        } catch (error) {

            console.log(error)

            toast.error(
                error.response?.data?.message ||
                'Unable to start payment'
            )

        } finally {

            setPayment(false)

        }
    }

    // --------------------------------------------------
    // CANCEL APPOINTMENT CLICK
    // --------------------------------------------------

    const handleCancelClick = (item) => {

        let msg = ''
        let percent = 0
        let color = 'gray'

        const appointmentDate = item.slotDate?.split('_')

        if (!appointmentDate || appointmentDate.length !== 3) {

            toast.error('Invalid appointment date')
            return
        }

        const appointmentTime = item.slotTime

        let appointmentDateTime

        try {

            const [day, month, year] = appointmentDate

            let hours = 0
            let minutes = 0

            if (appointmentTime) {

                const timeParts = appointmentTime
                    .replace(/\s+/g, ' ')
                    .trim()
                    .split(' ')

                const timeValue = timeParts[0]
                const period = timeParts[1]

                const [h, m] = timeValue.split(':')

                hours = Number(h)
                minutes = Number(m)

                if (period === 'PM' && hours !== 12) {
                    hours += 12
                }

                if (period === 'AM' && hours === 12) {
                    hours = 0
                }

            }

            appointmentDateTime = new Date(
                Number(year),
                Number(month) - 1,
                Number(day),
                hours,
                minutes
            )

        } catch (error) {

            console.log(error)

            toast.error('Unable to calculate cancellation time')
            return
        }

        const currentTime = new Date()

        const difference =
            appointmentDateTime.getTime() -
            currentTime.getTime()

        const hoursRemaining =
            difference / (1000 * 60 * 60)

        // --------------------------------------------------
        // NO PAYMENT
        // --------------------------------------------------

        if (!item.payment) {

            msg =
                'Are you sure you want to cancel this appointment?'

            percent = 0
            color = 'gray'

        }

        // --------------------------------------------------
        // MORE THAN 48 HOURS
        // --------------------------------------------------

        else if (hoursRemaining > 48) {

            msg =
                'You will receive a 100% full refund since you are cancelling more than 48 hours before your appointment.'

            percent = 100
            color = 'green'

        }

        // --------------------------------------------------
        // 24 TO 48 HOURS
        // --------------------------------------------------

        else if (hoursRemaining > 24) {

            msg =
                'You will receive a 70% refund. A 30% cancellation fee applies as you are cancelling within 24–48 hours.'

            percent = 70
            color = 'yellow'

        }

        // --------------------------------------------------
        // 12 TO 24 HOURS
        // --------------------------------------------------

        else if (hoursRemaining > 12) {

            msg =
                'You will receive a 50% refund. A 50% cancellation fee applies as you are cancelling within 12–24 hours.'

            percent = 50
            color = 'orange'

        }

        // --------------------------------------------------
        // LESS THAN 12 HOURS
        // --------------------------------------------------

        else {

            msg =
                'No refund will be issued as you are cancelling within 12 hours of your appointment.'

            percent = 0
            color = 'red'

        }

        setCancelInfo({
            id: item._id,
            msg,
            percent,
            color
        })

        setShowCancelModal(true)
    }

    // --------------------------------------------------
    // CANCEL APPOINTMENT
    // --------------------------------------------------

    const cancelAppointment = async () => {

        if (!cancelInfo?.id) {
            return
        }

        try {

            const { data } = await axios.post(
                `${backendUrl}/api/user/cancel-appointment`,
                {
                    appointmentId: cancelInfo.id
                },
                {
                    headers: {
                        token
                    }
                }
            )

            if (data.success) {

                toast.success(
                    data.message || 'Appointment cancelled successfully'
                )

                setShowCancelModal(false)
                setCancelInfo(null)

                await getUserAppointments()

                if (getDoctorsData) {
                    await getDoctorsData()
                }

            } else {

                toast.error(data.message)

            }

        } catch (error) {

            console.log(error)

            toast.error(
                error.response?.data?.message ||
                'Unable to cancel appointment'
            )

        }
    }

    // --------------------------------------------------
    // POLICY MODAL AGREE
    // --------------------------------------------------

    const handlePolicyAgree = () => {

        setShowPolicyModal(false)

        if (pendingPaymentId) {

            startPayment(pendingPaymentId)

        }

        setPendingPaymentId(null)

    }

    // --------------------------------------------------
    // POLICY MODAL CLOSE
    // --------------------------------------------------

    const handlePolicyClose = () => {

        setShowPolicyModal(false)
        setPendingPaymentId(null)

    }

    // --------------------------------------------------
    // CANCEL MODAL COLORS
    // --------------------------------------------------

    const getCancelColors = () => {

        if (!cancelInfo) {

            return {
                background: 'bg-gray-100',
                button: 'bg-gray-500'
            }
        }

        if (cancelInfo.color === 'green') {

            return {
                background: 'bg-green-50',
                button: 'bg-green-600'
            }

        }

        if (cancelInfo.color === 'yellow') {

            return {
                background: 'bg-yellow-50',
                button: 'bg-yellow-600'
            }

        }

        if (cancelInfo.color === 'orange') {

            return {
                background: 'bg-orange-50',
                button: 'bg-orange-600'
            }

        }

        if (cancelInfo.color === 'red') {

            return {
                background: 'bg-red-50',
                button: 'bg-red-600'
            }

        }

        return {
            background: 'bg-gray-100',
            button: 'bg-gray-600'
        }
    }

    // --------------------------------------------------
    // UI
    // --------------------------------------------------

    return (

        <div className='pb-20'>

            <p className='pb-3 mt-12 font-medium text-zinc-700 border-b'>
                My Appointments
            </p>

            <div>

                {appointments.length === 0 ? (

                    <div className='flex flex-col items-center justify-center py-20'>

                        <p className='text-gray-500 text-lg'>
                            No appointments found
                        </p>

                        <button
                            onClick={() => navigate('/doctors')}
                            className='mt-5 bg-primary text-white px-6 py-2 rounded-full'
                        >
                            Book Appointment
                        </button>

                    </div>

                ) : (

                    appointments.map((item, index) => (

                        <div
                            key={item._id || index}
                            className='grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 py-5 border-b'
                        >

                            {/* DOCTOR DETAILS */}

                            <div className='flex gap-4'>

                                <div className='w-28 h-28 bg-indigo-50 rounded-lg flex items-center justify-center overflow-hidden'>

                                    {item.docData?.image ? (

                                        <img
                                            src={item.docData.image}
                                            alt={item.docData.name}
                                            className='w-full h-full object-cover'
                                        />

                                    ) : (

                                        <img
                                            src={assets.profile_pic}
                                            alt='Doctor'
                                            className='w-full h-full object-cover'
                                        />

                                    )}

                                </div>

                                <div className='flex-1'>

                                    <p
                                        onClick={() =>
                                            handleAppointmentClick(item._id)
                                        }
                                        className='text-[#262626] text-base font-semibold cursor-pointer hover:text-primary transition-all'
                                        title='Click to view appointment in backend'
                                    >
                                        {item.docData?.name}
                                    </p>

                                    <p className='text-[#696969] text-sm'>
                                        {item.docData?.speciality}
                                    </p>

                                    <p className='text-[#696969] text-sm mt-1'>
                                        {item.docData?.degree}
                                    </p>

                                    <p className='text-[#696969] text-sm mt-2'>
                                        {item.docData?.address?.line1}
                                    </p>

                                    {item.docData?.address?.line2 && (

                                        <p className='text-[#696969] text-sm'>
                                            {item.docData.address.line2}
                                        </p>

                                    )}

                                </div>

                            </div>

                            {/* APPOINTMENT DETAILS */}

                            <div className='flex flex-col justify-between items-start md:items-end gap-3'>

                                <div className='text-sm text-[#696969]'>

                                    <p>

                                        <span className='font-medium text-[#262626]'>
                                            Date:
                                        </span>{' '}

                                        {formatDate(item.slotDate)}

                                    </p>

                                    <p className='mt-1'>

                                        <span className='font-medium text-[#262626]'>
                                            Time:
                                        </span>{' '}

                                        {item.slotTime}

                                    </p>

                                    <p className='mt-1'>

                                        <span className='font-medium text-[#262626]'>
                                            Amount:
                                        </span>{' '}

                                        ₹{item.amount}

                                    </p>

                                </div>

                                {/* PAYMENT / STATUS */}

                                <div className='flex flex-col gap-2 w-full md:w-auto'>

                                    {!item.cancelled &&
                                        !item.isCompleted &&
                                        !item.payment && (

                                            <button
                                                onClick={() =>
                                                    handlePayClick(item._id)
                                                }
                                                disabled={payment}
                                                className='w-full md:w-48 border border-primary text-primary py-2 rounded-md text-sm hover:bg-primary hover:text-white transition-all disabled:opacity-50'
                                            >
                                                {payment &&
                                                pendingPaymentId === item._id
                                                    ? 'Processing...'
                                                    : 'Pay Online'}
                                            </button>

                                        )}

                                    {item.payment &&
                                        !item.cancelled &&
                                        !item.isCompleted && (

                                            <p className='text-green-600 text-sm font-medium'>
                                                Payment Completed
                                            </p>

                                        )}

                                    {item.isCompleted &&
                                        !item.cancelled && (

                                            <p className='text-green-600 text-sm font-medium'>
                                                Completed
                                            </p>

                                        )}

                                    {item.cancelled && (

                                        <div className='text-sm'>

                                            <p className='text-red-600 font-medium'>
                                                Appointment Cancelled
                                            </p>

                                            {item.refundStatus === 'full' && (

                                                <p className='text-green-600 mt-1'>
                                                    Full refund of ₹
                                                    {item.refundAmount}
                                                    {' '}initiated
                                                </p>

                                            )}

                                            {item.refundStatus === 'partial_70' && (

                                                <p className='text-green-600 mt-1'>
                                                    70% refund of ₹
                                                    {item.refundAmount}
                                                    {' '}initiated
                                                </p>

                                            )}

                                            {item.refundStatus === 'partial_50' && (

                                                <p className='text-green-600 mt-1'>
                                                    50% refund of ₹
                                                    {item.refundAmount}
                                                    {' '}initiated
                                                </p>

                                            )}

                                            {item.refundStatus === 'no_refund' && (

                                                <p className='text-red-600 mt-1'>
                                                    No refund (cancelled within 12 hours)
                                                </p>

                                            )}

                                            {item.refundStatus === 'none' && (

                                                <p className='text-gray-600 mt-1'>
                                                    Cash appointment - no refund needed
                                                </p>

                                            )}

                                        </div>

                                    )}

                                    {!item.cancelled &&
                                        !item.isCompleted && (

                                            <button
                                                onClick={() =>
                                                    handleCancelClick(item)
                                                }
                                                className='w-full md:w-48 border border-red-500 text-red-500 py-2 rounded-md text-sm hover:bg-red-500 hover:text-white transition-all'
                                            >
                                                Cancel Appointment
                                            </button>

                                        )}

                                    {/* VIEW BILL BUTTON */}

                                    <button
                                        type='button'
                                        onClick={() => handleViewBill(item)}
                                        className='w-full md:w-48 border border-gray-300 text-gray-600 py-2 rounded-md text-sm hover:bg-gray-100 transition-all cursor-pointer'
                                    >
                                        View Bill
                                    </button>

                                </div>

                            </div>

                        </div>

                    ))

                )}

            </div>

            {/* ==================================================
                BILL MODAL
            ================================================== */}

            {showBillModal && selectedBill && (

                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'
                    onClick={handleCloseBill}
                >

                    <div
                        className='bg-white rounded-xl shadow-xl w-full max-w-md p-6'
                        onClick={(event) => event.stopPropagation()}
                    >

                        <div className='flex items-center justify-between border-b pb-4'>

                            <h2 className='text-xl font-semibold text-gray-800'>
                                Appointment Bill
                            </h2>

                            <button
                                type='button'
                                onClick={handleCloseBill}
                                className='text-gray-500 hover:text-gray-800 text-xl'
                            >
                                ×
                            </button>

                        </div>

                        <div className='mt-5 space-y-3 text-sm'>

                            <div className='flex justify-between gap-4'>
                                <span className='text-gray-500'>
                                    Patient
                                </span>

                                <span className='font-medium text-gray-800 text-right'>
                                    {selectedBill.userData?.name || 'Pratik Datir'}
                                </span>
                            </div>

                            <div className='flex justify-between gap-4'>
                                <span className='text-gray-500'>
                                    Email
                                </span>

                                <span className='font-medium text-gray-800 text-right break-all'>
                                    {selectedBill.userData?.email || 'N/A'}
                                </span>
                            </div>

                            <div className='flex justify-between gap-4'>
                                <span className='text-gray-500'>
                                    Doctor
                                </span>

                                <span className='font-medium text-gray-800 text-right'>
                                    {selectedBill.docData?.name || 'N/A'}
                                </span>
                            </div>

                            <div className='flex justify-between gap-4'>
                                <span className='text-gray-500'>
                                    Speciality
                                </span>

                                <span className='font-medium text-gray-800 text-right'>
                                    {selectedBill.docData?.speciality || 'N/A'}
                                </span>
                            </div>

                            <div className='flex justify-between gap-4'>
                                <span className='text-gray-500'>
                                    Date
                                </span>

                                <span className='font-medium text-gray-800 text-right'>
                                    {formatDate(selectedBill.slotDate)}
                                </span>
                            </div>

                            <div className='flex justify-between gap-4'>
                                <span className='text-gray-500'>
                                    Time
                                </span>

                                <span className='font-medium text-gray-800 text-right'>
                                    {selectedBill.slotTime || 'N/A'}
                                </span>
                            </div>

                            <div className='border-t pt-4 flex justify-between gap-4'>

                                <span className='font-semibold text-gray-800'>
                                    Total Amount
                                </span>

                                <span className='font-bold text-primary text-lg'>
                                    ₹{selectedBill.amount || 0}
                                </span>

                            </div>

                            <div className='flex justify-between gap-4'>

                                <span className='text-gray-500'>
                                    Payment
                                </span>

                                <span
                                    className={
                                        selectedBill.payment
                                            ? 'text-green-600 font-medium'
                                            : 'text-red-600 font-medium'
                                    }
                                >
                                    {selectedBill.payment
                                        ? 'Paid'
                                        : 'Not Paid'}
                                </span>

                            </div>

                            <div className='flex justify-between gap-4'>

                                <span className='text-gray-500'>
                                    Appointment Status
                                </span>

                                <span className='font-medium text-gray-800 text-right'>

                                    {selectedBill.cancelled
                                        ? 'Cancelled'
                                        : selectedBill.isCompleted
                                            ? 'Completed'
                                            : 'Upcoming'}

                                </span>

                            </div>

                        </div>

                        <div className='mt-6'>

                            <button
                                type='button'
                                onClick={handleCloseBill}
                                className='w-full bg-primary text-white py-2.5 rounded-lg hover:opacity-90'
                            >
                                Close
                            </button>

                        </div>

                    </div>

                </div>

            )}

            {/* ==================================================
                PAYMENT POLICY MODAL
            ================================================== */}

            {showPolicyModal && (

                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>

                    <div className='bg-white rounded-xl shadow-xl w-full max-w-lg p-6'>

                        <div className='flex items-center justify-between border-b pb-4'>

                            <h2 className='text-xl font-semibold text-gray-800'>
                                Cancellation & Refund Policy
                            </h2>

                            <button
                                type='button'
                                onClick={handlePolicyClose}
                                className='text-gray-500 hover:text-gray-800 text-xl'
                            >
                                ×
                            </button>

                        </div>

                        <div className='mt-5 space-y-4 text-sm'>

                            <div className='border rounded-lg p-4'>

                                <p className='font-semibold text-gray-800'>
                                    More than 48 hours
                                </p>

                                <p className='text-gray-600 mt-1'>
                                    100% refund of the appointment amount.
                                </p>

                            </div>

                            <div className='border rounded-lg p-4'>

                                <p className='font-semibold text-gray-800'>
                                    Between 24 and 48 hours
                                </p>

                                <p className='text-gray-600 mt-1'>
                                    70% refund and 30% cancellation fee.
                                </p>

                            </div>

                            <div className='border rounded-lg p-4'>

                                <p className='font-semibold text-gray-800'>
                                    Between 12 and 24 hours
                                </p>

                                <p className='text-gray-600 mt-1'>
                                    50% refund and 50% cancellation fee.
                                </p>

                            </div>

                            <div className='border rounded-lg p-4'>

                                <p className='font-semibold text-gray-800'>
                                    Within 12 hours
                                </p>

                                <p className='text-gray-600 mt-1'>
                                    No refund will be issued.
                                </p>

                            </div>

                            <p className='text-gray-500 text-xs'>
                                Please review the cancellation policy before completing your payment.
                            </p>

                        </div>

                        <div className='flex gap-3 mt-6'>

                            <button
                                type='button'
                                onClick={handlePolicyClose}
                                className='flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-100'
                            >
                                Cancel
                            </button>

                            <button
                                type='button'
                                onClick={handlePolicyAgree}
                                className='flex-1 bg-primary text-white py-2.5 rounded-lg hover:bg-primary/90'
                            >
                                I Agree & Pay
                            </button>

                        </div>

                    </div>

                </div>

            )}

            {/* ==================================================
                CANCEL APPOINTMENT MODAL
            ================================================== */}

            {showCancelModal && cancelInfo && (

                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>

                    <div
                        className={`w-full max-w-md rounded-xl shadow-xl p-6 ${getCancelColors().background}`}
                    >

                        <h2 className='text-xl font-semibold text-gray-800 text-center'>
                            Cancel Appointment
                        </h2>

                        <p className='text-gray-700 text-center mt-4 leading-6'>
                            {cancelInfo.msg}
                        </p>

                        {cancelInfo.percent > 0 && (

                            <div className='mt-5 bg-white rounded-lg p-4 text-center'>

                                <p className='text-sm text-gray-500'>
                                    Refund Percentage
                                </p>

                                <p className='text-3xl font-bold text-green-600 mt-1'>
                                    {cancelInfo.percent}%
                                </p>

                            </div>

                        )}

                        {cancelInfo.percent === 0 && (

                            <div className='mt-5 bg-white rounded-lg p-4 text-center'>

                                <p className='text-sm text-gray-500'>
                                    Refund
                                </p>

                                <p className='text-xl font-semibold text-red-600 mt-1'>
                                    No Refund
                                </p>

                            </div>

                        )}

                        <div className='flex gap-3 mt-6'>

                            <button
                                type='button'
                                onClick={() => {
                                    setShowCancelModal(false)
                                    setCancelInfo(null)
                                }}
                                className='flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-100'
                            >
                                Keep Appointment
                            </button>

                            <button
                                type='button'
                                onClick={cancelAppointment}
                                className={`flex-1 text-white py-2.5 rounded-lg hover:opacity-90 ${getCancelColors().button}`}
                            >
                                Confirm Cancellation
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    )
}

export default MyAppointments