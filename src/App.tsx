import Sidebar from "./components/sidebar"
import { AnimatedOutlet } from "./components/animated-outlet"

function App() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 ml-[280px] min-h-screen overflow-hidden">
        <div className="p-6">
          <AnimatedOutlet />
        </div>
      </main>
    </div>
  )
}

export default App
