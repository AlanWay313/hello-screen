import Sidebar from "./components/sidebar"
import Header from "./components/header"
import { AnimatedOutlet } from "./components/animated-outlet"

function App() {
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
    </div>
  )
}

export default App
