import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// --- SVG Icons ---
function OverviewIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 4H13.5M2.5 8H13.5M2.5 12H9.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function CalendarIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke={color} strokeWidth="1.3" />
      <path d="M2 6.5H14" stroke={color} strokeWidth="1.3" />
      <path d="M5 1.5V3.5M11 1.5V3.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function LiveViewIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4.5C2 3.67157 2.67157 3 3.5 3H9.5C10.3284 3 11 3.67157 11 4.5V11.5C11 12.3284 10.3284 13 9.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5Z" stroke={color} strokeWidth="1.3" />
      <path d="M11 6.5L14 4.5V11.5L11 9.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ReportsIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 13V9M8 13V5M13 13V3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="2.5" stroke={color} strokeWidth="1.3" />
      <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M3.4 12.6L4.5 11.5M11.5 4.5L12.6 3.4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function UserIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="5" r="2.5" stroke={color} strokeWidth="1.3" />
      <path d="M3.5 13.5C3.5 11 5.5 9.5 8 9.5C10.5 9.5 12.5 11 12.5 13.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function TaskIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 3H10.5M3 4.5C3 3.67157 3.67157 3 4.5 3H5.5V4.5H10.5V3H11.5C12.3284 3 13 3.67157 13 4.5V13.5C13 14.3284 12.3284 15 11.5 15H4.5C3.67157 15 3 14.3284 3 13.5V4.5Z" stroke={color} strokeWidth="1.3" />
      <path d="M5.5 8L7 9.5L10.5 6.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LocationIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.5C5.51472 1.5 3.5 3.51472 3.5 6C3.5 9.5 8 14.5 8 14.5C8 14.5 12.5 9.5 12.5 6C12.5 3.51472 10.4853 1.5 8 1.5Z" stroke={color} strokeWidth="1.3" />
      <circle cx="8" cy="6" r="1.8" stroke={color} strokeWidth="1.3" />
    </svg>
  )
}

function ChevronDownIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 4H13M5.5 4V2.5C5.5 2.22386 5.72386 2 6 2H10C10.2761 2 10.5 2.22386 10.5 2.5V4M4 4V13.5C4 13.7761 4.22386 14 4.5 14H11.5C11.7761 14 12 13.7761 12 13.5V4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.3" />
      <path d="M10.5 10.5L13.5 13.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function HardDriveIcon({ className = "w-4 h-4", color = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke={color} strokeWidth="1.3" />
      <circle cx="11.5" cy="8" r="0.75" fill={color} />
      <circle cx="9.5" cy="8" r="0.75" fill={color} />
    </svg>
  )
}

const STAFF_LIST = [
  { id: '1', name: 'Ahmet Yılmaz', role: 'Field Operations', avatar: 'AY' },
  { id: '2', name: 'Ayşe Demir', role: 'Packaging Specialist', avatar: 'AD' },
  { id: '3', name: 'Mehmet Kaya', role: 'Maintenance Lead', avatar: 'MK' },
  { id: '4', name: 'Fatma Çelik', role: 'Quality Control', avatar: 'FÇ' },
]

const TASKS_LIST = [
  { id: '1', name: 'Harvest', code: 'G001' },
  { id: '2', name: 'Maintenance', code: 'M002' },
  { id: '3', name: 'Packaging', code: 'P001' },
  { id: '4', name: 'Irrigation Check', code: 'I003' },
]

const LOCATIONS_LIST = [
  'Greenhouse 1',
  'Greenhouse 2',
  'Packaging Facility',
  'Warehouse A',
  'Cold Storage',
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const X_COORDS = [60, 165, 270, 375, 480, 580, 680]
const HARVEST_BASE_Y = [55, 45, 36, 32, 28, 26, 27]
const PACKING_BASE_Y = [72, 62, 53, 48, 44, 42, 43]

function getCatmullRomBezier(points, tension = 1) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  const f = tension / 6
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = i < points.length - 2 ? points[i + 2] : p2

    const cp1x = p1.x + (p2.x - p0.x) * f
    const cp1y = p1.y + (p2.y - p0.y) * f
    const cp2x = p2.x - (p3.x - p1.x) * f
    const cp2y = p2.y - (p3.y - p1.y) * f

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

function yToPercentage(y) {
  return Math.max(0, Math.min(100, Math.round(((130 - y) / 115) * 100)))
}

function computeChartState(phase) {
  const harvestPoints = []
  const packingPoints = []
  const harvestPcts = []
  const packingPcts = []

  for (let i = 0; i < 7; i++) {
    // Balanced, organic undulation waves (tuned to a graceful sweet spot)
    const waveH = 5.0 * Math.sin(phase + i * 0.55) + 1.8 * Math.cos(phase * 1.3 + i * 0.8)
    const waveP = 4.2 * Math.sin(phase + i * 0.55 + 0.6) + 1.5 * Math.cos(phase * 1.2 + i * 0.7)

    let hy = Math.max(18, Math.min(115, HARVEST_BASE_Y[i] + waveH))
    let py = Math.max(hy + 8, Math.min(124, PACKING_BASE_Y[i] + waveP))

    harvestPoints.push({ x: X_COORDS[i], y: hy })
    packingPoints.push({ x: X_COORDS[i], y: py })

    harvestPcts.push(yToPercentage(hy))
    packingPcts.push(yToPercentage(py))
  }

  const harvestLineD = getCatmullRomBezier(harvestPoints)
  const harvestFillD = `${harvestLineD} L 680 130 L 60 130 Z`

  const packingLineD = getCatmullRomBezier(packingPoints)
  const packingFillD = `${packingLineD} L 680 130 L 60 130 Z`

  const avgEfficiency = Math.round(harvestPcts.reduce((sum, val) => sum + val, 0) / 7)

  return {
    harvestPoints,
    packingPoints,
    harvestPcts,
    packingPcts,
    harvestLineD,
    harvestFillD,
    packingLineD,
    packingFillD,
    avgEfficiency,
  }
}

function ProductionPerformanceChart({ scrollProgress }) {
  const [hoveredDay, setHoveredDay] = useState(null)
  const hoveredDayRef = useRef(null)
  hoveredDayRef.current = hoveredDay

  const harvestLineRef = useRef(null)
  const harvestFillRef = useRef(null)
  const packingLineRef = useRef(null)
  const packingFillRef = useRef(null)
  const harvestCircleRefs = useRef([])
  const packingCircleRefs = useRef([])
  const avgTextRef = useRef(null)
  const tooltipHarvestRef = useRef(null)
  const tooltipPackingRef = useRef(null)
  const liveStateRef = useRef(computeChartState(0))

  const updateDOM = (state) => {
    liveStateRef.current = state

    if (harvestLineRef.current) harvestLineRef.current.setAttribute('d', state.harvestLineD)
    if (harvestFillRef.current) harvestFillRef.current.setAttribute('d', state.harvestFillD)
    if (packingLineRef.current) packingLineRef.current.setAttribute('d', state.packingLineD)
    if (packingFillRef.current) packingFillRef.current.setAttribute('d', state.packingFillD)

    state.harvestPoints.forEach((pt, i) => {
      const el = harvestCircleRefs.current[i]
      if (el) el.setAttribute('cy', pt.y.toFixed(1))
    })
    state.packingPoints.forEach((pt, i) => {
      const el = packingCircleRefs.current[i]
      if (el) el.setAttribute('cy', pt.y.toFixed(1))
    })

    if (avgTextRef.current) {
      avgTextRef.current.textContent = `${state.avgEfficiency}%`
    }

    const d = hoveredDayRef.current
    if (d !== null) {
      if (tooltipHarvestRef.current) tooltipHarvestRef.current.textContent = `${state.harvestPcts[d]}%`
      if (tooltipPackingRef.current) tooltipPackingRef.current.textContent = `${state.packingPcts[d]}%`
    }
  }

  useEffect(() => {
    if (scrollProgress && typeof scrollProgress.on === 'function') {
      const unsubscribe = scrollProgress.on('change', (latest) => {
        // Balanced phase progression: smooth, responsive, but not frantic
        const phase = latest * 24
        updateDOM(computeChartState(phase))
      })
      const initialPhase = (scrollProgress.get?.() ?? 0) * 24
      updateDOM(computeChartState(initialPhase))
      return () => unsubscribe()
    } else {
      const handleScroll = () => {
        const scrollY = window.scrollY || window.pageYOffset || 0
        const phase = (scrollY / 1400) * (2 * Math.PI)
        updateDOM(computeChartState(phase))
      }
      window.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll()
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [scrollProgress])

  const initial = liveStateRef.current

  return (
    <div className="lg:col-span-9 flex flex-col justify-between h-full min-h-0 gap-2">
      <div className="relative w-full flex-1 min-h-[135px] max-h-[175px]">
        {/* Floating Tooltip when hovering over a day */}
        {hoveredDay !== null && (
          <div
            className="pointer-events-none absolute z-30 flex flex-col gap-0.5 rounded-lg border border-white/20 bg-[#18181B]/95 px-2.5 py-1.5 shadow-xl backdrop-blur-md transition-all duration-75"
            style={{
              left: `${(X_COORDS[hoveredDay] / 700) * 100}%`,
              top: '4px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-[10px] font-semibold text-white/90">
              {DAY_FULL_NAMES[hoveredDay]}
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1 text-[#A5B4FC]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                <span>Harvest:</span>
                <span ref={tooltipHarvestRef} className="font-semibold text-white">
                  {liveStateRef.current.harvestPcts[hoveredDay]}%
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#E9D5FF]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C27AFF]" />
                <span>Packing:</span>
                <span ref={tooltipPackingRef} className="font-semibold text-white">
                  {liveStateRef.current.packingPcts[hoveredDay]}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SVG Chart */}
        <svg className="w-full h-full overflow-visible" viewBox="0 0 700 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id="harvestGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity="0.35" />
              <stop offset="95%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="packingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C27AFF" stopOpacity="0.35" />
              <stop offset="95%" stopColor="#C27AFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Dashed Gridlines */}
          {[15, 45, 75, 105, 130].map((y) => (
            <line
              key={y}
              x1="45"
              y1={y}
              x2="690"
              y2={y}
              stroke="#3F3F47"
              strokeDasharray="4 4"
              strokeWidth="0.8"
            />
          ))}

          {/* Y-Axis Labels */}
          <text x="35" y="19" fill="#A1A1A1" fontSize="10" textAnchor="end" fontFamily="'Inter', sans-serif">100%</text>
          <text x="35" y="49" fill="#A1A1A1" fontSize="10" textAnchor="end" fontFamily="'Inter', sans-serif">75%</text>
          <text x="35" y="79" fill="#A1A1A1" fontSize="10" textAnchor="end" fontFamily="'Inter', sans-serif">50%</text>
          <text x="35" y="109" fill="#A1A1A1" fontSize="10" textAnchor="end" fontFamily="'Inter', sans-serif">25%</text>
          <text x="35" y="134" fill="#A1A1A1" fontSize="10" textAnchor="end" fontFamily="'Inter', sans-serif">0%</text>

          {/* Vertical guideline on hover */}
          {hoveredDay !== null && (
            <line
              x1={X_COORDS[hoveredDay]}
              y1="15"
              x2={X_COORDS[hoveredDay]}
              y2="130"
              stroke="#A1A1AA"
              strokeOpacity="0.4"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          )}

          {/* Area 1: Harvest Efficiency (Fill & Line) */}
          <path
            ref={harvestFillRef}
            d={initial.harvestFillD}
            fill="url(#harvestGrad)"
          />
          <path
            ref={harvestLineRef}
            d={initial.harvestLineD}
            fill="none"
            stroke="#6366F1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Area 2: Packing Output (Fill & Line) */}
          <path
            ref={packingFillRef}
            d={initial.packingFillD}
            fill="url(#packingGrad)"
          />
          <path
            ref={packingLineRef}
            d={initial.packingLineD}
            fill="none"
            stroke="#C27AFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {initial.harvestPoints.map((pt, i) => (
            <circle
              key={`h-${i}`}
              ref={(el) => (harvestCircleRefs.current[i] = el)}
              cx={pt.x}
              cy={pt.y}
              r={hoveredDay === i ? 4.5 : 3}
              fill="#6366F1"
              stroke={hoveredDay === i ? '#FFFFFF' : 'none'}
              strokeWidth={hoveredDay === i ? 1.5 : 0}
            />
          ))}
          {initial.packingPoints.map((pt, i) => (
            <circle
              key={`p-${i}`}
              ref={(el) => (packingCircleRefs.current[i] = el)}
              cx={pt.x}
              cy={pt.y}
              r={hoveredDay === i ? 4.5 : 3}
              fill="#C27AFF"
              stroke={hoveredDay === i ? '#FFFFFF' : 'none'}
              strokeWidth={hoveredDay === i ? 1.5 : 0}
            />
          ))}

          {/* Interactive Hover Columns */}
          {DAY_LABELS.map((_, i) => {
            const xLeft = i === 0 ? 45 : (X_COORDS[i - 1] + X_COORDS[i]) / 2
            const xRight = i === 6 ? 690 : (X_COORDS[i] + X_COORDS[i + 1]) / 2
            return (
              <rect
                key={`col-${i}`}
                x={xLeft}
                y="0"
                width={xRight - xLeft}
                height="135"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredDay(i)}
                onMouseLeave={() => setHoveredDay((curr) => (curr === i ? null : curr))}
              />
            )
          })}
        </svg>
      </div>

      {/* X-Axis Day Labels */}
      <div className="flex justify-between pl-12 pr-4 text-[10px] text-[#A1A1A1]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {DAY_LABELS.map((day, i) => (
          <span
            key={day}
            className={`transition-colors duration-150 ${hoveredDay === i ? 'text-white font-semibold' : ''}`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between pt-1.5 border-t border-white/5 text-[11px] text-[#9F9FA9]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#6366F1]" />
            <span>Harvest Efficiency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#C27AFF]" />
            <span>Packing Output</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span>Avg. Efficiency:</span>
          <span ref={avgTextRef} className="font-semibold text-[#E4E4E7]">
            {initial.avgEfficiency}%
          </span>
        </div>
      </div>
    </div>
  )
}

export function WeeklyPlanningDashboard({ scrollProgress }) {
  const [activeNav, setActiveNav] = useState('Planning')
  const [selectedStaff, setSelectedStaff] = useState('Ahmet Yılmaz')
  const [selectedTask, setSelectedTask] = useState(TASKS_LIST[0])
  const [selectedLocation, setSelectedLocation] = useState('Greenhouse 1')
  const [openDropdown, setOpenDropdown] = useState(null) // 'staff' | 'task' | 'location' | null
  const [staffFilter, setStaffFilter] = useState('')

  const card1Ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (card1Ref.current && !card1Ref.current.contains(e.target)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-start overflow-hidden text-zinc-100 select-none"
      style={{
        backgroundColor: '#2F323B',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* --- Ambient Radial Glow from Figma --- */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 2448,
          height: 6572,
          left: -2348,
          top: -1185,
          background: 'radial-gradient(70.71% 70.71% at 50% 50%, rgba(168, 85, 247, 0.195) 0%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(100px)',
          borderRadius: '99999px',
          transform: 'rotate(-89.99deg)',
        }}
      />

      {/* --- Top Header Navigation --- */}
      <header
        className="w-full h-14 flex items-center justify-between px-6 shrink-0 z-30 relative"
        style={{
          backgroundColor: 'rgba(47, 50, 59, 0.85)',
          borderBottom: '0.666667px solid #3F3F47',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* ChoXPro Brand Indicator on the left */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tracking-wide text-white">ChoXPro</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Planning
          </span>
        </div>

        {/* Centered navigation items */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 w-max">
          {[
            { label: 'Setup Overview', icon: OverviewIcon },
            { label: 'Planning', icon: CalendarIcon },
            { label: 'Live View', icon: LiveViewIcon },
            { label: 'Reports', icon: ReportsIcon },
            { label: 'Settings', icon: SettingsIcon },
          ].map(({ label, icon: Icon }) => {
            const isActive = activeNav === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveNav(label)}
                className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer"
                style={{
                  color: isActive ? '#C27AFF' : '#9F9FA9',
                }}
              >
                <Icon
                  className="w-3.5 h-3.5 shrink-0"
                  color={isActive ? '#C27AFF' : '#9F9FA9'}
                />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            )
          })}
        </div>
        {/* Right side subtle window indicator dots */}
        <div className="flex items-center gap-1.5 opacity-50">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-600/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-600/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-600/70" />
        </div>
      </header>

      {/* --- Responsive Content Container with scaling for all viewports --- */}
      <div className="w-full flex-1 flex flex-col p-5 md:p-6 overflow-hidden z-20">
        <div
          className="w-full flex-1 flex flex-col justify-between gap-3 md:gap-3.5 origin-top transition-transform duration-150"
        >
          {/* Header Row: Title & Week Badge */}
          <div className="flex items-center justify-between w-full shrink-0">
            <h1
              className="text-lg md:text-xl font-bold text-[#F4F4F5] tracking-tight leading-7"
              style={{ letterSpacing: '-0.5px' }}
            >
              Weekly Planning
            </h1>
            <div
              className="h-7 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium text-[#E4E4E7]"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '0.666667px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <CalendarIcon className="w-3.5 h-3.5" color="#C27AFF" />
              <span>Week 51, 2025</span>
            </div>
          </div>

          {/* --- Card 1: New Task Form --- */}
          <div
            ref={card1Ref}
            className={`w-full rounded-[14px] p-4 md:p-4.5 flex flex-col gap-3 relative shrink-0 ${openDropdown ? 'z-30' : 'z-10'}`}
            style={{
              backgroundColor: 'rgba(47, 50, 59, 0.4)',
              boxShadow: '0px 0px 0px 1px rgba(255, 255, 255, 0.1), 0px 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Subheader */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'rgba(97, 95, 255, 0.2)',
                  boxShadow: '0px 0px 0px 1px rgba(97, 95, 255, 0.3)',
                }}
              >
                <svg
                  className="w-3.5 h-3.5 text-[#A3B3FF]"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <line x1="8" y1="3" x2="8" y2="13" />
                  <line x1="3" y1="8" x2="13" y2="8" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-[#F4F4F5] leading-tight">New Task</span>
                <span className="text-xs text-[#9F9FA9] leading-tight">Schedule an activity for the team.</span>
              </div>
            </div>

            {/* Inputs Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              {/* Field: DATE */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9F9FA9] tracking-[0.5px] uppercase">
                  DATE
                </label>
                <div
                  className="h-10 px-3 rounded-[8px] flex items-center gap-2 text-xs md:text-sm text-[#E4E4E7]"
                  style={{
                    backgroundColor: 'rgba(47, 50, 59, 0.5)',
                    border: '0.666667px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" color="#9F9FA9" />
                  <span className="truncate">December 24th, 2025</span>
                </div>
              </div>

              {/* Field: STAFF MEMBER */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[11px] font-semibold text-[#9F9FA9] tracking-[0.5px] uppercase">
                  STAFF MEMBER
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'staff' ? null : 'staff')}
                  className="w-full h-10 px-3 rounded-[8px] flex items-center justify-between text-xs md:text-sm text-[#E4E4E7] cursor-pointer hover:border-white/20 transition-colors"
                  style={{
                    backgroundColor: 'rgba(47, 50, 59, 0.5)',
                    border: '0.666667px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <UserIcon className="w-3.5 h-3.5 shrink-0" color="#9F9FA9" />
                    <span className="truncate">{selectedStaff}</span>
                  </div>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 shrink-0 ml-1 origin-center transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
                      openDropdown === 'staff' ? 'rotate-0 text-[#F4F4F5]' : '-rotate-90 text-[#9F9FA9]'
                    }`}
                  />
                </button>

                {/* Staff Dropdown Popup */}
                <AnimatePresence>
                  {openDropdown === 'staff' && (
                    <motion.div
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        y: -12,
                        transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
                      }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute top-full mt-1.5 left-0 right-0 w-full rounded-[10px] p-2 flex flex-col gap-1 z-40 shadow-2xl overflow-hidden origin-top"
                      style={{
                        backgroundColor: 'rgba(47, 50, 59, 0.82)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '0.666667px solid rgba(255, 255, 255, 0.14)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                        transformOrigin: 'top center',
                      }}
                    >
                      <div
                        className="px-2.5 py-1.5 rounded-md flex items-center gap-2 text-xs text-[#9F9FA9] w-full"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      >
                        <SearchIcon className="w-3.5 h-3.5 shrink-0" color="#9F9FA9" />
                        <input
                          type="text"
                          placeholder="Search member..."
                          value={staffFilter}
                          onChange={(e) => setStaffFilter(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs text-[#F4F4F5] w-full min-w-0"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5 pt-1 w-full">
                        {STAFF_LIST.filter((s) => s.name.toLowerCase().includes(staffFilter.toLowerCase())).map((staff) => {
                          const isSel = selectedStaff === staff.name
                          return (
                            <button
                              key={staff.id}
                              type="button"
                              onClick={() => {
                                setSelectedStaff(staff.name)
                                setOpenDropdown(null)
                              }}
                              className="w-full h-8 px-2.5 rounded-md flex items-center justify-between text-xs cursor-pointer hover:bg-white/10 transition-colors text-left"
                              style={{
                                backgroundColor: isSel ? 'rgba(97, 95, 255, 0.15)' : 'transparent',
                                color: isSel ? '#F4F4F5' : '#D4D4D8',
                              }}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center shrink-0">
                                  {staff.avatar}
                                </span>
                                <div className="flex flex-col truncate min-w-0">
                                  <span className="font-medium truncate">{staff.name}</span>
                                  <span className="text-[10px] text-[#9F9FA9] truncate">{staff.role}</span>
                                </div>
                              </div>
                              {isSel && <CheckIcon className="w-3.5 h-3.5 shrink-0 ml-1 text-[#A3B3FF]" color="#A3B3FF" />}
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Field: TASK */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[11px] font-semibold text-[#9F9FA9] tracking-[0.5px] uppercase">
                  TASK
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'task' ? null : 'task')}
                  className="w-full h-10 px-3 rounded-[8px] flex items-center justify-between text-xs md:text-sm text-[#E4E4E7] cursor-pointer hover:border-white/20 transition-colors"
                  style={{
                    backgroundColor: 'rgba(47, 50, 59, 0.5)',
                    border: '0.666667px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <TaskIcon className="w-3.5 h-3.5 shrink-0" color="#9F9FA9" />
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                      style={{
                        backgroundColor: 'rgba(97, 95, 255, 0.2)',
                        border: '0.666667px solid rgba(97, 95, 255, 0.3)',
                        color: '#A3B3FF',
                      }}
                    >
                      {selectedTask.code}
                    </span>
                    <span className="truncate">{selectedTask.name}</span>
                  </div>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 shrink-0 ml-1 origin-center transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
                      openDropdown === 'task' ? 'rotate-0 text-[#F4F4F5]' : '-rotate-90 text-[#9F9FA9]'
                    }`}
                  />
                </button>

                {/* Task Dropdown Popup */}
                <AnimatePresence>
                  {openDropdown === 'task' && (
                    <motion.div
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        y: -12,
                        transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
                      }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute top-full mt-1.5 left-0 right-0 w-full rounded-[10px] p-2 flex flex-col gap-0.5 z-40 shadow-2xl overflow-hidden origin-top"
                      style={{
                        backgroundColor: 'rgba(47, 50, 59, 0.82)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '0.666667px solid rgba(255, 255, 255, 0.14)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                        transformOrigin: 'top center',
                      }}
                    >
                      {TASKS_LIST.map((task) => {
                        const isSel = selectedTask.id === task.id
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => {
                              setSelectedTask(task)
                              setOpenDropdown(null)
                            }}
                            className="w-full h-8 px-2.5 rounded-md flex items-center justify-between text-xs cursor-pointer hover:bg-white/10 transition-colors text-left"
                            style={{
                              backgroundColor: isSel ? 'rgba(97, 95, 255, 0.15)' : 'transparent',
                              color: isSel ? '#F4F4F5' : '#D4D4D8',
                            }}
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                                style={{
                                  backgroundColor: 'rgba(97, 95, 255, 0.2)',
                                  border: '0.666667px solid rgba(97, 95, 255, 0.3)',
                                  color: '#A3B3FF',
                                }}
                              >
                                {task.code}
                              </span>
                              <span className="truncate">{task.name}</span>
                            </div>
                            {isSel && <CheckIcon className="w-3.5 h-3.5 shrink-0 ml-1 text-[#A3B3FF]" color="#A3B3FF" />}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Field: LOCATION */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[11px] font-semibold text-[#9F9FA9] tracking-[0.5px] uppercase">
                  LOCATION
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
                  className="w-full h-10 px-3 rounded-[8px] flex items-center justify-between text-xs md:text-sm text-[#E4E4E7] cursor-pointer hover:border-white/20 transition-colors"
                  style={{
                    backgroundColor: 'rgba(47, 50, 59, 0.5)',
                    border: '0.666667px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <LocationIcon className="w-3.5 h-3.5 shrink-0" color="#9F9FA9" />
                    <span className="truncate">{selectedLocation}</span>
                  </div>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 shrink-0 ml-1 origin-center transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
                      openDropdown === 'location' ? 'rotate-0 text-[#F4F4F5]' : '-rotate-90 text-[#9F9FA9]'
                    }`}
                  />
                </button>

                {/* Location Dropdown Popup */}
                <AnimatePresence>
                  {openDropdown === 'location' && (
                    <motion.div
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        y: -12,
                        transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
                      }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute top-full mt-1.5 left-0 right-0 w-full rounded-[10px] p-2 flex flex-col gap-0.5 z-40 shadow-2xl overflow-hidden origin-top"
                      style={{
                        backgroundColor: 'rgba(47, 50, 59, 0.82)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '0.666667px solid rgba(255, 255, 255, 0.14)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                        transformOrigin: 'top center',
                      }}
                    >
                      {LOCATIONS_LIST.map((loc) => {
                        const isSel = selectedLocation === loc
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setSelectedLocation(loc)
                              setOpenDropdown(null)
                            }}
                            className="w-full h-8 px-2.5 rounded-md flex items-center justify-between text-xs cursor-pointer hover:bg-white/10 transition-colors text-left"
                            style={{
                              backgroundColor: isSel ? 'rgba(97, 95, 255, 0.15)' : 'transparent',
                              color: isSel ? '#F4F4F5' : '#D4D4D8',
                            }}
                          >
                            <span className="truncate min-w-0">{loc}</span>
                            {isSel && <CheckIcon className="w-3.5 h-3.5 shrink-0 ml-1 text-[#A3B3FF]" color="#A3B3FF" />}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Button: ASSIGN */}
              <button
                type="button"
                className="h-10 px-5 rounded-[8px] flex items-center justify-center font-semibold text-xs md:text-sm transition-all duration-200 cursor-pointer active:scale-95"
                style={{
                  backgroundColor: 'rgba(97, 95, 255, 0.2)',
                  boxShadow: '0px 0px 0px 0.5px rgba(97, 95, 255, 0.3)',
                  color: '#A3B3FF',
                }}
              >
                Assign
              </button>
            </div>
          </div>

          {/* --- Card 2: Weekly Assignments Table --- */}
          <div
            className="w-full rounded-[14px] p-4 md:p-4.5 flex flex-col gap-2.5 shrink-0"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '0.666667px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span className="text-sm font-semibold text-[#F4F4F5]">Weekly Assignments</span>

            <div
              className="w-full rounded-lg overflow-hidden"
              style={{ border: '0.666667px solid rgba(255, 255, 255, 0.1)' }}
            >
              {/* Table Header */}
              <div
                className="grid grid-cols-12 px-3.5 h-9 items-center text-xs font-medium text-[#9F9FA9]"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '0.666667px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Staff Member</div>
                <div className="col-span-3">Task</div>
                <div className="col-span-3">Location</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {/* Row 1: Mehmet Kaya */}
              <div
                className="grid grid-cols-12 px-3.5 py-2.5 md:py-3 items-center text-xs gap-2"
                style={{
                  borderBottom: '0.666667px solid rgba(255, 255, 255, 0.06)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <div className="col-span-2 flex items-center gap-2 text-[#A1A1A1]">
                  <CalendarIcon className="w-3.5 h-3.5" color="#9F9FA9" />
                  <span>Fri, Dec 26</span>
                </div>
                <div className="col-span-3 flex items-center gap-2 text-[#D4D4D8]">
                  <UserIcon className="w-3.5 h-3.5" color="#9F9FA9" />
                  <span className="font-medium">Mehmet Kaya</span>
                </div>
                <div className="col-span-3">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium text-[#A3B3FF]"
                    style={{
                      backgroundColor: 'rgba(97, 95, 255, 0.2)',
                      border: '0.666667px solid rgba(97, 95, 255, 0.3)',
                    }}
                  >
                    Maintenance (M002)
                  </span>
                </div>
                <div className="col-span-3 flex items-center gap-2 text-[#D4D4D8]">
                  <LocationIcon className="w-3.5 h-3.5" color="#9F9FA9" />
                  <span>Greenhouse</span>
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer hover:bg-white/10 text-[#9F9FA9] transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: Ayşe Demir */}
              <div
                className="grid grid-cols-12 px-3.5 py-2.5 md:py-3 items-center text-xs gap-2"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
              >
                <div className="col-span-2 flex items-center gap-2 text-[#A1A1A1]">
                  <CalendarIcon className="w-3.5 h-3.5" color="#9F9FA9" />
                  <span>Sat, Dec 27</span>
                </div>
                <div className="col-span-3 flex items-center gap-2 text-[#D4D4D8]">
                  <UserIcon className="w-3.5 h-3.5" color="#9F9FA9" />
                  <span className="font-medium">Ayşe Demir</span>
                </div>
                <div className="col-span-3">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium text-[#A3B3FF]"
                    style={{
                      backgroundColor: 'rgba(97, 95, 255, 0.2)',
                      border: '0.666667px solid rgba(97, 95, 255, 0.3)',
                    }}
                  >
                    Packaging (P001)
                  </span>
                </div>
                <div className="col-span-3 flex items-center gap-2 text-[#D4D4D8]">
                  <LocationIcon className="w-3.5 h-3.5" color="#9F9FA9" />
                  <span>Packaging Facility</span>
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer hover:bg-white/10 text-[#9F9FA9] transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* --- Card 3: Production Performance --- */}
          <div
            className="w-full rounded-[14px] p-4 md:p-4.5 flex flex-col gap-2.5 flex-1 min-h-0 justify-between"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '0.666667px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span className="text-sm font-semibold text-[#F4F4F5] shrink-0">Production Performance</span>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center flex-1 min-h-0">
              {/* Left Column: Productivity Area Chart with Scroll-Driven Dynamic Curves & Tooltip */}
              <ProductionPerformanceChart scrollProgress={scrollProgress} />

              {/* Right Column: Storage Space Donut Chart */}
              <div
                className="lg:col-span-3 flex flex-col items-center justify-center gap-2 lg:border-l lg:border-white/10 lg:pl-5 py-1"
              >
                <div className="flex items-center gap-2 self-start text-xs text-[#D4D4D8]">
                  <HardDriveIcon className="w-3.5 h-3.5" color="#71717B" />
                  <span className="font-medium">Storage Space</span>
                </div>

                {/* Donut Gauge */}
                <div className="relative w-32 h-32 md:w-34 md:h-34 flex items-center justify-center my-0.5">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background Track */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="9"
                    />
                    {/* Progress Arc: 78% of 2 * PI * 40 (approx 251.3) => strokeDasharray: 196, 252 */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#C27AFF"
                      strokeWidth="9"
                      strokeDasharray="196 252"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-[#F4F4F5] leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>
                      78%
                    </span>
                  </div>
                </div>

                <span className="text-[11px] text-[#9F9FA9] font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                  780GB / 1TB Used
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default WeeklyPlanningDashboard
