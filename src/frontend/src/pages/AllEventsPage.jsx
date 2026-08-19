import OrganizerHeader from "../components/common/OrganizerHeader.jsx"
import { FullEventsTable } from "../components/FullEventTable"

export default function AllEvents() {
  return (
    <div className="min-h-screen w-full bg-background">
      <OrganizerHeader />

      <div className="mx-auto max-w-5xl px-6 py-4.5 md:px-10">
        <header className="mb-5">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground">Tất cả sự kiện</h1>
        </header>

        <FullEventsTable />
      </div>
    </div>
  )
}
