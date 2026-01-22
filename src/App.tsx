import Sidebar from "./components/sidebar"
import Header from "./components/header"
import { AnimatedOutlet } from "./components/animated-outlet"
import { ChangelogModal, useChangelog } from "./components/changelog"

function App() {
  const { showModal, dismissModal } = useChangelog();

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-[260px] min-h-screen flex flex-col">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      {/* Changelog Modal */}
      <ChangelogModal isOpen={showModal} onClose={dismissModal} />
    </div>
  )
}

export default App
