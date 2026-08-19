import { motion } from 'framer-motion'
import { useLenis } from './lib/useLenis'
import Scene from './Scene'

function App() {
  useLenis()

  return (
    <main className="bg-grid relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <Scene />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <h1 className="text-5xl font-extralight tracking-tight text-white drop-shadow-lg">
          Hello 3D World
        </h1>
      </motion.div>
    </main>
  )
}

export default App
