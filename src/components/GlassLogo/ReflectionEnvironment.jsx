import { Environment } from '@react-three/drei'
import { useReflectionEnvironment } from './useReflectionEnvironment'

// Wires the baked studio-HDRI-plus-text environment (see
// useReflectionEnvironment) into the scene. Must render inside a Suspense
// boundary — useEnvironment() suspends while the HDRI loads.
export function ReflectionEnvironment({ environmentIntensity }) {
  const { envMap, portal } = useReflectionEnvironment()

  return (
    <>
      {portal}
      {envMap && (
        <Environment map={envMap} background={false} environmentIntensity={environmentIntensity} />
      )}
    </>
  )
}
