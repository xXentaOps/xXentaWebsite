import { useMemo, useRef } from 'react'
import { Html, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, SRGBColorSpace } from 'three'
import { GlassInfoPanel } from './GlassInfoPanel'
import { TEAM_MEMBERS } from './teamData'
import { computePhotoBox, hitRect, PANEL, TEAM_PHOTO_SRC } from './teamLayout'

// The photo sits at the scene's origin depth, which puts it behind the glass
// panel (PANEL.z) and well in front of the grid/blob backdrop — so the panel
// refracts it, and it in turn occludes the grid, both by ordinary depth
// testing rather than by any compositing trick.
const PHOTO_Z = 0
// Hit zones float a hair in front of the photo, and the dogs' a hair in
// front of those again. Coplanar meshes give the raycaster no basis to
// choose between them, and the dogs lie in front of the people in the
// photograph, so their zones have to win the overlap — a tiny real depth
// difference is what makes that deterministic rather than incidental.
const HIT_Z = 0.02
const DOG_HIT_Z = 0.04

// The same cursor-lean the hero's glass logo has (see MAX_TILT/BASE_TILT/
// TILT_LAMBDA in GlassLogoGroup), applied to the photo so it reads as a
// print you can tip toward the light. Shallower than the logo's, because
// this is a much wider object: the same angle swings a wide plane's far
// edge a lot further, and past a few degrees the perspective on the faces
// starts to read as distortion rather than as a lean.
const MAX_TILT = MathUtils.degToRad(3.2)
const BASE_TILT = { x: MathUtils.degToRad(-1.1), y: MathUtils.degToRad(1) }
const TILT_LAMBDA = 4

// How far above each member's own measured hairline (see headTop in
// teamData.js) their hover dot sits, as a percentage of the photo's height —
// one small fixed gap, applied the same way to everyone. An earlier version
// lifted a fixed percentage off each member's *face-center* coordinate
// instead, which put the dot at wildly different visual distances above
// different people depending on how much hair (or, for Ardie, how little)
// happened to sit above their own face-center point — for him specifically
// it floated noticeably high above his actual head. Measuring where each
// head really ends and offsetting from that fixed point is what makes the
// gap read as the same distance for everyone.
const MARKER_GAP = 3.5
const MARKER_SIZE = 8

function useTiltedGroup() {
  const groupRef = useRef(null)
  const pointer = useThree((state) => state.pointer)

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    const desiredX = BASE_TILT.x - pointer.y * MAX_TILT
    const desiredY = BASE_TILT.y + pointer.x * MAX_TILT
    group.rotation.x = MathUtils.damp(group.rotation.x, desiredX, TILT_LAMBDA, delta)
    group.rotation.y = MathUtils.damp(group.rotation.y, desiredY, TILT_LAMBDA, delta)
  })

  return groupRef
}

// Largest box of the photo's aspect ratio that fits the space left over
// after the title, expressed in world units at the photo's own depth, plus
// where the middle of that space is.
function usePhotoBox() {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)

  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, PHOTO_Z])
  const perPx = viewWidth / size.width

  const boxPx = computePhotoBox(size.width, size.height)
  // Middle of the photo's own box, measured from the top of the section,
  // then expressed as a world Y (which counts upward from the section's
  // center) — the photo plane is centered on this, not on its top-left.
  const centerYPx = boxPx.top + boxPx.height / 2
  const centerY = (size.height / 2 - centerYPx) * perPx

  return { width: boxPx.width * perPx, height: boxPx.height * perPx, centerY }
}

// The glass panel's own rectangle, anchored to the screen's bottom-right
// corner (see PANEL.margin), mostly over the grid backdrop and only
// partially over the photo by design — PANEL.z sits well in front of the
// photo, so this needs its own perPx rather than reusing the photo's.
function usePanelWorld() {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)

  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport(camera, [0, 0, PANEL.z])
  const perPx = viewWidth / size.width

  return {
    x: viewWidth / 2 - (PANEL.margin + PANEL.width / 2) * perPx,
    y: -viewHeight / 2 + (PANEL.margin + PANEL.height / 2) * perPx,
    width: PANEL.width * perPx,
    height: PANEL.height * perPx,
    radius: PANEL.cornerRadius * perPx,
  }
}

function TeamPhotoPlane({ width, height }) {
  const texture = useTexture(TEAM_PHOTO_SRC)
  const gl = useThree((state) => state.gl)

  useMemo(() => {
    // A photo is authored in sRGB; without saying so it is sampled as if it
    // were already linear and renders visibly washed out and pale.
    texture.colorSpace = SRGBColorSpace
    // The plane is permanently at an angle (see BASE_TILT), and anisotropic
    // filtering is specifically what keeps a tilted texture's detail from
    // smearing along the direction of the tilt.
    texture.anisotropy = gl.capabilities.getMaxAnisotropy()
    texture.needsUpdate = true
  }, [texture, gl])

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      {/* Basic, not standard/physical: this is a photograph, and it should
          look exactly like the file. A lit material would have the scene's
          own directional light (which is there for the glass) fall across it
          as a gradient. toneMapped={false} for the other half of the same
          idea — the renderer's filmic tone curve exists to make the glass's
          highlights roll off nicely, and applying it to an already-graded
          photo just lifts its blacks. The photo itself is untouched here —
          where the glass panel crosses its edge is handled entirely on the
          glass's own side (see PANEL_GLASS's roughness in GlassInfoPanel),
          not by anything done to this plane. */}
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

// Invisible, but deliberately not `visible={false}` — three's raycaster skips
// objects that are actually invisible, so a zero-opacity material is what
// leaves them hittable. depthWrite off so they never occlude the photo they
// sit in front of.
function TeamHitZone({ member, width, height, onOpen, onCloseSoon }) {
  const rect = hitRect(member)
  const x = (rect.cx / 100 - 0.5) * width
  const y = (0.5 - rect.cy / 100) * height

  return (
    <mesh
      position={[x, y, member.isDog ? DOG_HIT_Z : HIT_Z]}
      onPointerOver={(event) => {
        event.stopPropagation()
        onOpen(member.id)
      }}
      onPointerOut={() => onCloseSoon()}
      onClick={(event) => {
        event.stopPropagation()
        onOpen(member.id)
      }}
    >
      <planeGeometry args={[(rect.w / 100) * width, (rect.h / 100) * height]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

// The one piece of feedback tying a hovered person to the panel that just
// changed — a small, plain blue dot above them, and nothing else: no
// animation, no glow, just the mark. Both were tried and cut for the same
// reason — this piece's own restraint elsewhere (the grid's thin lines, the
// glass's quiet edges) is the standard a bouncing, glowing dot didn't meet.
//
// A DOM element via drei's Html rather than 3D geometry so it stays a crisp,
// perfectly round circle at any depth or tilt, which a world-space disc
// foreshortened by the photo's own lean would not. Living inside the tilting
// group means Html reprojects it every frame, so it stays pinned to its
// person as the photo leans.
function TeamMarker({ member, width, height }) {
  const x = (member.x / 100 - 0.5) * width
  const y = (0.5 - Math.max(1, member.headTop - MARKER_GAP) / 100) * height

  return (
    <Html
      position={[x, y, HIT_Z + 0.05]}
      // Below drei's default ceiling so the panel's own DOM text, which is a
      // plain sibling of the canvas, can still sit above these.
      zIndexRange={[12, 0]}
      style={{ pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}
    >
      <span className="block rounded-full" style={{ width: MARKER_SIZE, height: MARKER_SIZE, background: '#3B82F6' }} />
    </Html>
  )
}

// showPanel gates the glass itself, not the photo. MeshTransmissionMaterial
// re-renders the whole scene into its own buffer every frame for as long as
// it is mounted, and it does that whether or not anything is on screen —
// AboutUsSection's render gate can skip this canvas's *visible* render while
// the section is parked off-screen, but it cannot skip a cost another
// component incurs at priority 0. Since the section spends almost all of its
// life off-screen, leaving the panel mounted meant paying for a second sheet
// of real-time glass permanently, which measurably starved the hero. The
// photo plane stays mounted regardless — it is one textured quad, and
// keeping it means the texture is already resident when the section opens.
export function TeamScene({ activeId, highQuality, visible, showPanel, onOpen, onCloseSoon, onHold }) {
  const groupRef = useTiltedGroup()
  const { width, height, centerY } = usePhotoBox()
  const panel = usePanelWorld()
  const activeMember = TEAM_MEMBERS.find((member) => member.id === activeId) ?? null

  return (
    <>
      {/* visible, not conditionally unmounted: the photo's texture (and the
          panel's own backdrop capture, when shown) need to already be
          resident before this is ever shown — see AboutUsSection's own
          sceneReady comment for the same reasoning one level up. Three's
          raycaster skips invisible objects on its own, so this alone is
          also what keeps hover/click on the photo inert while the Our
          Mission landing view is what's actually showing. */}
      <group ref={groupRef} visible={visible} position={[0, centerY, PHOTO_Z]}>
        <TeamPhotoPlane width={width} height={height} />

        {TEAM_MEMBERS.map((member) => (
          <TeamHitZone key={member.id} member={member} width={width} height={height} onOpen={onOpen} onCloseSoon={onCloseSoon} />
        ))}

        {/* visible is checked explicitly here too, not just relied on via
            the parent group's own visible flag above: activeId isn't reset
            when switching back to Our Mission (only when the whole section
            closes, see AboutUsSection), so a member can still be "active"
            while this group is hidden — drei's Html portal draws into a
            separate DOM layer of its own, not a normal WebGL draw call, so
            it isn't guaranteed to honor an invisible Three.js ancestor the
            way ordinary meshes are. */}
        {visible && activeMember && <TeamMarker key={activeMember.id} member={activeMember} width={width} height={height} />}
      </group>

      {showPanel && (
        <GlassInfoPanel
          x={panel.x}
          y={panel.y}
          width={panel.width}
          height={panel.height}
          radius={panel.radius}
          highQuality={highQuality}
          onHold={onHold}
          onReleaseSoon={onCloseSoon}
        />
      )}
    </>
  )
}

export default TeamScene
