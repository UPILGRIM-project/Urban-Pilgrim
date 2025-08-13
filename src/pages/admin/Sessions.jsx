import LiveSessionForm from "../../components/admin/pilgrim_sessions/LiveSessions";
import RecordedSessionForm from "../../components/admin/pilgrim_sessions/RecordedSessionForm";
import SessionBookingsTable from "../../components/admin/pilgrim_sessions/SessionBookings";

export default function Sessions() {
  return (
    <>
      <LiveSessionForm />
      <RecordedSessionForm />
      <SessionBookingsTable />
    </>
  )
}
