import axios from "axios";
import { createContext, useState } from "react";
import { toast } from "react-toastify";

export const AdminContext = createContext();

const AdminContextProvider = (props) => {

    const [aToken, setAToken] = useState(
        localStorage.getItem("aToken") || ""
    );

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [dashData, setDashData] = useState(false);


    // =========================
    // GET ALL DOCTORS
    // =========================
    const getAllDoctors = async () => {
        try {

            const { data } = await axios.get(
                backendUrl + "/api/admin/all-doctors",
                {
                    headers: {
                        atoken: aToken
                    }
                }
            );

            if (data.success) {
                setDoctors(data.doctors);
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.log("getAllDoctors Error:", error);
            toast.error(
                error.response?.data?.message || error.message
            );
        }
    };


    // =========================
    // CHANGE DOCTOR AVAILABILITY
    // =========================
    const changeAvailability = async (docId) => {
        try {

            const { data } = await axios.post(
                backendUrl + "/api/admin/change-availability",
                { docId },
                {
                    headers: {
                        atoken: aToken
                    }
                }
            );

            if (data.success) {
                toast.success(data.message);
                getAllDoctors();
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.log("changeAvailability Error:", error);
            toast.error(
                error.response?.data?.message || error.message
            );
        }
    };


    // =========================
    // GET ALL APPOINTMENTS
    // =========================
    const getAllAppointments = async () => {
        try {

            const { data } = await axios.get(
                backendUrl + "/api/admin/appointments",
                {
                    headers: {
                        atoken: aToken
                    }
                }
            );

            if (data.success) {
                setAppointments(
                    [...data.appointments].reverse()
                );
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.log("getAllAppointments Error:", error);
            toast.error(
                error.response?.data?.message || error.message
            );
        }
    };


    // =========================
    // CANCEL APPOINTMENT
    // =========================
    const cancelAppointment = async (appointmentId) => {
        try {

            const { data } = await axios.post(
                backendUrl + "/api/admin/cancel-appointment",
                { appointmentId },
                {
                    headers: {
                        atoken: aToken
                    }
                }
            );

            if (data.success) {
                toast.success(data.message);
                getAllAppointments();
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.log("cancelAppointment Error:", error);
            toast.error(
                error.response?.data?.message || error.message
            );
        }
    };


    // =========================
    // ADMIN DASHBOARD
    // =========================
    const getDashData = async () => {

        console.log("GET DASH DATA CALLED");
        console.log("BACKEND URL:", backendUrl);
        console.log("TOKEN EXISTS:", !!aToken);

        try {

            const { data } = await axios.get(
                backendUrl + "/api/admin/dashboard",
                {
                    headers: {
                        atoken: aToken
                    }
                }
            );

            console.log("DASHBOARD RESPONSE:", data);

            if (data.success) {
                setDashData(data.dashData);
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.log("getDashData Error:", error);

            toast.error(
                error.response?.data?.message || error.message
            );
        }
    };


    // =========================
    // CONTEXT VALUE
    // =========================
    const value = {
        aToken,
        setAToken,

        backendUrl,

        doctors,
        getAllDoctors,
        changeAvailability,

        appointments,
        setAppointments,
        getAllAppointments,
        cancelAppointment,

        getDashData,
        dashData
    };


    return (
        <AdminContext.Provider value={value}>
            {props.children}
        </AdminContext.Provider>
    );
};

export default AdminContextProvider;