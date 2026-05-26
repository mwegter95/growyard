import { useEffect, useMemo, useState } from 'react'
import {
  Check, ChevronRight, Calendar, Leaf, X, Search, AlertTriangle,
  Droplet, Scissors, Sprout, Snowflake, Sun, CloudRain, Info, LogOut,
} from 'lucide-react'
import { fetchYardState, putProgress } from './api.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CATEGORY_ICONS = {
  prune: Scissors,
  water: Droplet,
  plant: Sprout,
  lawn: Sun,
  general: Leaf,
  remove: AlertTriangle,
}

const CATEGORY_COLORS = {
  prune: '#8B5A3C',
  water: '#3D7B96',
  plant: '#4F6F44',
  lawn: '#A68A2D',
  general: '#5C6E58',
  remove: '#B0413E',
}

// Build a public URL for a per-plant image. Files live in growyard/public/plants/
// and Vite serves them at `${BASE_URL}plants/<filename>` — `/` in dev,
// `/growyard/` in production (set via VITE_BASE in deploy.yml).
const plantImg = (filename) =>
  filename ? `${import.meta.env.BASE_URL}plants/${filename}` : null

export default function YardApp({ user, onLogout }) {
  const [view, setView] = useState('calendar')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState(null)
  const [completed, setCompleted] = useState({})
  const [notes, setNotes] = useState({})
  const [plants, setPlants] = useState([])
  const [tasks, setTasks] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let active = true
    fetchYardState()
      .then(data => {
        if (!active) return
        setPlants(data.plants || [])
        setTasks(data.tasks || [])
        setYear(data.year)
        setCompleted(data.progress?.completed || {})
        setNotes(data.progress?.notes || {})
      })
      .catch(err => {
        if (active) setLoadError(err.message || 'Could not load your yard.')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const toggleComplete = async (taskId) => {
    const key = `${taskId}:${year}`
    const next = !completed[key]
    setCompleted(prev => ({ ...prev, [key]: next }))
    try {
      await putProgress(taskId, { completed: next, year })
    } catch {
      // Revert on failure.
      setCompleted(prev => ({ ...prev, [key]: !next }))
    }
  }

  const saveNote = async (taskId, text) => {
    setNotes(prev => ({ ...prev, [taskId]: text }))
    try {
      await putProgress(taskId, { note: text, year })
    } catch {
      // The user can re-blur to retry; we don't revert text on error.
    }
  }

  const isComplete = (taskId) => !!completed[`${taskId}:${year}`]

  const tasksThisMonth = useMemo(() => {
    return tasks
      .filter(t => t.month === selectedMonth)
      .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [selectedMonth, searchQuery, tasks])

  const tasksForPlant = (plantId) => tasks.filter(t => t.plantId === plantId)
  const completedCount = tasksThisMonth.filter(t => isComplete(t.id)).length

  if (loading) {
    return (
      <div style={styles.loading}>
        <Leaf size={40} color="#5C6E58" />
        <div style={{ marginTop: 12, fontFamily: "'Fraunces', serif", color: '#5C6E58' }}>Loading your yard...</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={styles.loading}>
        <AlertTriangle size={32} color="#B0413E" />
        <div style={{ marginTop: 12, fontFamily: "'Fraunces', serif", color: '#B0413E' }}>{loadError}</div>
        <button onClick={onLogout} style={{ ...styles.toggleBtn, marginTop: 16, padding: '8px 16px' }}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={styles.brand}>
              <Leaf size={20} color="#4F6F44" strokeWidth={1.5} />
              <span style={styles.brandText}>Growyard</span>
            </div>
            <div style={styles.subBrand}>
              {user?.display_name ? `${user.display_name} · ` : ''}Zone 4b
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.viewToggle}>
              <button
                onClick={() => setView('calendar')}
                style={{ ...styles.toggleBtn, ...(view === 'calendar' ? styles.toggleBtnActive : {}) }}
              >
                <Calendar size={14} /> Calendar
              </button>
              <button
                onClick={() => setView('plants')}
                style={{ ...styles.toggleBtn, ...(view === 'plants' ? styles.toggleBtnActive : {}) }}
              >
                <Leaf size={14} /> Plants
              </button>
            </div>
            <button onClick={onLogout} style={styles.logoutBtn} title="Sign out" aria-label="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {view === 'calendar' ? (
          <CalendarView
            allTasks={tasks}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            tasks={tasksThisMonth}
            plants={plants}
            onTaskClick={setSelectedTask}
            isComplete={isComplete}
            toggleComplete={toggleComplete}
            completedCount={completedCount}
            totalCount={tasksThisMonth.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        ) : (
          <PlantsView
            plants={plants}
            onPlantClick={setSelectedPlant}
            tasksForPlant={tasksForPlant}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
      </main>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          plant={plants.find(p => p.id === selectedTask.plantId)}
          onClose={() => setSelectedTask(null)}
          isComplete={isComplete(selectedTask.id)}
          toggleComplete={() => toggleComplete(selectedTask.id)}
          note={notes[selectedTask.id] || ''}
          saveNote={(t) => saveNote(selectedTask.id, t)}
        />
      )}

      {selectedPlant && (
        <PlantModal
          plant={selectedPlant}
          tasks={tasksForPlant(selectedPlant.id)}
          onClose={() => setSelectedPlant(null)}
          onTaskClick={(t) => { setSelectedPlant(null); setSelectedTask(t) }}
          isComplete={isComplete}
        />
      )}
    </div>
  )
}

function CalendarView({ allTasks, selectedMonth, setSelectedMonth, tasks, plants, onTaskClick, isComplete, toggleComplete, completedCount, totalCount, searchQuery, setSearchQuery }) {
  const plantsById = useMemo(
    () => Object.fromEntries((plants || []).map(p => [p.id, p])),
    [plants]
  )
  return (
    <>
      <div data-month-strip style={styles.monthStrip}>
        {MONTH_SHORT.map((m, i) => {
          const monthNum = i + 1
          const taskCount = allTasks.filter(t => t.month === monthNum).length
          const isSelected = monthNum === selectedMonth
          return (
            <button
              key={m}
              onClick={() => setSelectedMonth(monthNum)}
              style={{
                ...styles.monthChip,
                ...(isSelected ? styles.monthChipActive : {}),
                opacity: taskCount === 0 ? 0.4 : 1,
              }}
            >
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 13, fontWeight: 500 }}>{m}</span>
              {taskCount > 0 && <span style={styles.monthChipBadge}>{taskCount}</span>}
            </button>
          )
        })}
      </div>

      <div style={styles.searchBar}>
        <Search size={14} color="#8a8678" />
        <input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.monthHeader}>
        <h2 style={styles.monthTitle}>{MONTHS[selectedMonth - 1]}</h2>
        <div style={styles.monthProgress}>
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
            }} />
          </div>
          <span style={styles.progressText}>{completedCount} of {totalCount}</span>
        </div>
      </div>

      <div style={styles.taskList}>
        {tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <Snowflake size={28} color="#a8a397" strokeWidth={1.3} />
            <div style={{ marginTop: 10, fontFamily: "'Fraunces', serif", fontSize: 15, color: '#7a7567' }}>
              {searchQuery ? 'No tasks match your search.' : 'Nothing to do this month. Rest.'}
            </div>
            {!searchQuery && (
              <div style={{ marginTop: 4, fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9a9587' }}>
                Plan for the season ahead.
              </div>
            )}
          </div>
        ) : (
          tasks.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              plant={t.plantId ? plantsById[t.plantId] : null}
              isComplete={isComplete(t.id)}
              toggleComplete={() => toggleComplete(t.id)}
              onClick={() => onTaskClick(t)}
            />
          ))
        )}
      </div>
    </>
  )
}

function TaskCard({ task, plant, isComplete, toggleComplete, onClick }) {
  const Icon = CATEGORY_ICONS[task.category] || Leaf
  const color = CATEGORY_COLORS[task.category]
  const thumbUrl = plant ? plantImg(plant.thumb || plant.image) : null
  return (
    <div style={{ ...styles.taskCard, ...(isComplete ? styles.taskCardComplete : {}) }} onClick={onClick}>
      <button
        onClick={(e) => { e.stopPropagation(); toggleComplete() }}
        style={{
          ...styles.checkBox,
          backgroundColor: isComplete ? color : 'transparent',
          borderColor: color,
        }}
        aria-label="Complete task"
      >
        {isComplete && <Check size={14} color="#fff" strokeWidth={3} />}
      </button>
      {thumbUrl && (
        <img
          src={thumbUrl}
          alt={plant.common}
          style={{ ...styles.taskThumb, ...(isComplete ? { opacity: 0.55 } : {}) }}
          loading="lazy"
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.taskCategoryRow}>
          <Icon size={11} color={color} strokeWidth={2} />
          <span style={{ ...styles.taskCategory, color }}>{task.category}</span>
          {task.duration && <span style={styles.taskDuration}>· {task.duration}</span>}
        </div>
        <div style={{ ...styles.taskTitle, ...(isComplete ? { textDecoration: 'line-through', opacity: 0.5 } : {}) }}>
          {task.title}
        </div>
      </div>
      <ChevronRight size={16} color="#a8a397" />
    </div>
  )
}

function PlantsView({ plants, onPlantClick, tasksForPlant, searchQuery, setSearchQuery }) {
  const filtered = plants.filter(p =>
    !searchQuery
    || p.common.toLowerCase().includes(searchQuery.toLowerCase())
    || (p.latin || '').toLowerCase().includes(searchQuery.toLowerCase())
  )
  return (
    <>
      <div style={styles.searchBar}>
        <Search size={14} color="#8a8678" />
        <input
          placeholder="Search plants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <h2 style={styles.monthTitle}>Your Plants</h2>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#7a7567', marginTop: 2 }}>
          {plants.length} plants in your yard
        </div>
      </div>

      <div style={styles.plantGrid}>
        {filtered.map(p => {
          const taskCount = tasksForPlant(p.id).length
          const isInvasive = p.tags?.includes('invasive')
          const thumbUrl = plantImg(p.thumb || p.image)
          return (
            <div
              key={p.id}
              style={{ ...styles.plantCard, ...(isInvasive ? styles.plantCardInvasive : {}) }}
              onClick={() => onPlantClick(p)}
            >
              <div style={styles.plantCardBody}>
                {thumbUrl && (
                  <img
                    src={thumbUrl}
                    alt={p.common}
                    style={styles.plantCardThumb}
                    loading="lazy"
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.plantCardHeader}>
                    <div>
                      <div style={styles.plantCommon}>{p.common}</div>
                      <div style={styles.plantLatin}>{p.latin}</div>
                    </div>
                    <ChevronRight size={16} color="#a8a397" />
                  </div>
                  <div style={styles.plantMeta}>
                    <span style={styles.plantMetaItem}>
                      <Sun size={10} /> {p.sun}
                    </span>
                    {taskCount > 0 && (
                      <span style={styles.plantMetaItem}>
                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function TaskModal({ task, plant, onClose, isComplete, toggleComplete, note, saveNote }) {
  const Icon = CATEGORY_ICONS[task.category] || Leaf
  const color = CATEGORY_COLORS[task.category]
  const [localNote, setLocalNote] = useState(note)
  useEffect(() => { setLocalNote(note) }, [note])

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ ...styles.categoryBadge, backgroundColor: color + '22', color }}>
              <Icon size={11} strokeWidth={2.2} />
              <span>{task.category}</span>
            </div>
            {task.duration && <span style={styles.taskDuration}>{task.duration}</span>}
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">
            <X size={18} color="#5C6E58" />
          </button>
        </div>

        <h1 style={styles.modalTitle}>{task.title}</h1>

        {plant && (
          <div style={styles.plantTag}>
            {plant.thumb || plant.image ? (
              <img
                src={plantImg(plant.thumb || plant.image)}
                alt={plant.common}
                style={styles.plantTagAvatar}
              />
            ) : (
              <Leaf size={11} color="#4F6F44" />
            )}
            <span>{plant.common}</span>
          </div>
        )}

        <button
          onClick={toggleComplete}
          style={{
            ...styles.completeBtn,
            backgroundColor: isComplete ? '#4F6F44' : 'transparent',
            color: isComplete ? '#fff' : '#4F6F44',
            border: '1.5px solid #4F6F44',
          }}
        >
          {isComplete ? <><Check size={14} strokeWidth={3} /> Done for this year</> : 'Mark as done'}
        </button>

        <Section title="When" icon={<Calendar size={13} />}>{task.when}</Section>
        <Section title="What" icon={<Info size={13} />}>{task.what}</Section>
        <Section title="Why" icon={<Sprout size={13} />}>{task.why}</Section>
        <Section title="How" icon={<Scissors size={13} />}>{task.how}</Section>

        <div style={styles.notesSection}>
          <div style={styles.sectionTitle}>
            <Leaf size={13} /> Your notes
          </div>
          <textarea
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            onBlur={() => saveNote(localNote)}
            placeholder="What you observed, what worked, what to do differently next year..."
            style={styles.notesTextarea}
          />
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{icon} {title}</div>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  )
}

function PlantModal({ plant, tasks, onClose, onTaskClick, isComplete }) {
  const isInvasive = plant.tags?.includes('invasive')
  const heroUrl = plantImg(plant.image)
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          {isInvasive ? (
            <div style={{ ...styles.categoryBadge, backgroundColor: '#B0413E22', color: '#B0413E' }}>
              <AlertTriangle size={11} strokeWidth={2.2} />
              <span>Invasive — Remove</span>
            </div>
          ) : (
            <div style={{ ...styles.categoryBadge, backgroundColor: '#4F6F4422', color: '#4F6F44' }}>
              <Leaf size={11} strokeWidth={2.2} />
              <span>{plant.type}</span>
            </div>
          )}
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">
            <X size={18} color="#5C6E58" />
          </button>
        </div>

        {heroUrl && (
          <img
            src={heroUrl}
            alt={plant.common}
            style={styles.plantHero}
          />
        )}

        <h1 style={styles.modalTitle}>{plant.common}</h1>
        <div style={{ ...styles.plantLatin, marginBottom: 16 }}>{plant.latin}</div>

        <div style={styles.plantStatsGrid}>
          <PlantStat icon={<Sun size={12} />} label="Sun" value={plant.sun} />
          <PlantStat icon={<Droplet size={12} />} label="Water" value={plant.water} />
          <PlantStat icon={<CloudRain size={12} />} label="Bloom" value={plant.bloomTime} />
        </div>

        <Section title="Notes" icon={<Info size={13} />}>{plant.notes}</Section>

        {tasks.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Calendar size={13} /> Annual care schedule
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.slice().sort((a, b) => a.month - b.month).map(t => (
                <button key={t.id} onClick={() => onTaskClick(t)} style={styles.miniTaskBtn}>
                  <span style={styles.miniTaskMonth}>{MONTH_SHORT[t.month - 1]}</span>
                  <span style={{
                    ...styles.miniTaskTitle,
                    ...(isComplete(t.id) ? { textDecoration: 'line-through', opacity: 0.5 } : {}),
                  }}>
                    {t.title}
                  </span>
                  <ChevronRight size={14} color="#a8a397" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlantStat({ icon, label, value }) {
  return (
    <div style={styles.plantStat}>
      <div style={styles.plantStatLabel}>{icon} {label}</div>
      <div style={styles.plantStatValue}>{value}</div>
    </div>
  )
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#F4F0E6',
    backgroundImage: `
      radial-gradient(circle at 15% 5%, rgba(79, 111, 68, 0.06) 0%, transparent 40%),
      radial-gradient(circle at 85% 95%, rgba(139, 90, 60, 0.05) 0%, transparent 40%),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%235C6E58' fill-opacity='0.025'%3E%3Ccircle cx='10' cy='10' r='1'/%3E%3Ccircle cx='50' cy='30' r='1'/%3E%3Ccircle cx='30' cy='60' r='1'/%3E%3Ccircle cx='70' cy='70' r='1'/%3E%3C/g%3E%3C/svg%3E")
    `,
    color: '#3a3833',
    fontFamily: "'Inter', -apple-system, sans-serif",
    paddingBottom: 60,
  },
  loading: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh', backgroundColor: '#F4F0E6', padding: 24, textAlign: 'center',
  },
  header: {
    backgroundColor: 'rgba(244, 240, 230, 0.92)',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(92, 110, 88, 0.15)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  headerInner: {
    padding: '14px 18px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 12, maxWidth: 900, margin: '0 auto',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandText: {
    fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 19,
    letterSpacing: '-0.01em', color: '#2C3A2A',
  },
  subBrand: {
    fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500,
    color: '#7a7567', letterSpacing: '0.08em', textTransform: 'uppercase',
    marginTop: 2, marginLeft: 28,
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  viewToggle: {
    display: 'flex', backgroundColor: 'rgba(92, 110, 88, 0.08)',
    borderRadius: 100, padding: 3, gap: 2,
  },
  toggleBtn: {
    border: 'none', background: 'transparent', padding: '7px 12px',
    borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#5C6E58',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
    fontFamily: "'Inter', sans-serif", transition: 'all 0.2s',
  },
  toggleBtnActive: {
    backgroundColor: '#fff', color: '#2C3A2A',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  logoutBtn: {
    border: 'none', background: 'rgba(92, 110, 88, 0.08)', borderRadius: '50%',
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#5C6E58', cursor: 'pointer',
  },
  main: { padding: '20px 18px', maxWidth: 900, margin: '0 auto' },
  monthStrip: {
    display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6,
    marginBottom: 16, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
  },
  monthChip: {
    flexShrink: 0, border: '1px solid rgba(92, 110, 88, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)', color: '#5C6E58',
    padding: '8px 12px', borderRadius: 14, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 2, minWidth: 52, transition: 'all 0.2s',
  },
  monthChipActive: {
    backgroundColor: '#2C3A2A', borderColor: '#2C3A2A', color: '#F4F0E6',
  },
  monthChipBadge: {
    fontSize: 9, fontWeight: 600, fontFamily: "'Inter', sans-serif", opacity: 0.7,
  },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(92, 110, 88, 0.15)',
    borderRadius: 12, padding: '10px 14px', marginBottom: 16,
  },
  searchInput: {
    flex: 1, border: 'none', background: 'transparent', outline: 'none',
    fontSize: 13, fontFamily: "'Inter', sans-serif", color: '#3a3833',
  },
  monthHeader: { marginBottom: 14 },
  monthTitle: {
    fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: 34,
    letterSpacing: '-0.02em', color: '#2C3A2A', margin: 0, lineHeight: 1,
  },
  monthProgress: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 },
  progressBar: {
    flex: 1, height: 4, backgroundColor: 'rgba(92, 110, 88, 0.15)',
    borderRadius: 100, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4F6F44', borderRadius: 100, transition: 'width 0.4s' },
  progressText: {
    fontSize: 11, color: '#7a7567', fontFamily: "'Inter', sans-serif",
    fontWeight: 500, whiteSpace: 'nowrap',
  },
  taskList: { display: 'flex', flexDirection: 'column', gap: 8 },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(92, 110, 88, 0.12)',
    borderRadius: 14, padding: '14px 14px',
    display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  taskCardComplete: { backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  taskThumb: {
    width: 38, height: 38, borderRadius: 10, objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid rgba(92, 110, 88, 0.18)',
    backgroundColor: 'rgba(92, 110, 88, 0.06)',
  },
  checkBox: {
    width: 22, height: 22, minWidth: 22, borderRadius: 7,
    border: '1.5px solid', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', background: 'transparent',
  },
  taskCategoryRow: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 },
  taskCategory: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif",
  },
  taskDuration: { fontSize: 10, color: '#9a9587', fontFamily: "'Inter', sans-serif" },
  taskTitle: {
    fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 400,
    color: '#2C3A2A', lineHeight: 1.3, letterSpacing: '-0.005em',
  },
  emptyState: {
    textAlign: 'center', padding: '48px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 14, border: '1px solid rgba(92, 110, 88, 0.1)',
  },
  plantGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  plantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(92, 110, 88, 0.12)',
    borderRadius: 14, padding: '14px 14px', cursor: 'pointer',
  },
  plantCardInvasive: {
    borderColor: 'rgba(176, 65, 62, 0.25)',
    backgroundColor: 'rgba(176, 65, 62, 0.04)',
  },
  plantCardBody: { display: 'flex', alignItems: 'center', gap: 12 },
  plantCardThumb: {
    width: 60, height: 60, borderRadius: 12, objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid rgba(92, 110, 88, 0.18)',
    backgroundColor: 'rgba(92, 110, 88, 0.06)',
  },
  plantCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  plantCommon: {
    fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 500,
    color: '#2C3A2A', letterSpacing: '-0.01em',
  },
  plantLatin: {
    fontFamily: "'Fraunces', serif", fontStyle: 'italic',
    fontSize: 12, color: '#7a7567', marginTop: 2,
  },
  plantMeta: { display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  plantMetaItem: {
    fontSize: 10, color: '#7a7567', fontFamily: "'Inter', sans-serif",
    fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3,
  },
  modalOverlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(44, 58, 42, 0.45)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 100, padding: 0,
  },
  modal: {
    backgroundColor: '#F4F0E6', width: '100%', maxWidth: 700,
    maxHeight: '92vh', overflowY: 'auto',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: '20px 20px 40px',
    boxShadow: '0 -20px 60px rgba(0,0,0,0.15)',
    animation: 'slideUp 0.3s ease-out',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  categoryBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 100,
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif",
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    backgroundColor: 'rgba(92, 110, 88, 0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  modalTitle: {
    fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: 26,
    letterSpacing: '-0.02em', color: '#2C3A2A',
    lineHeight: 1.15, margin: 0, marginBottom: 8,
  },
  plantTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: "'Inter', sans-serif", fontSize: 12,
    color: '#4F6F44', fontWeight: 500, marginBottom: 14,
  },
  plantTagAvatar: {
    width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
    border: '1px solid rgba(92, 110, 88, 0.20)',
  },
  plantHero: {
    width: '100%', height: 220, objectFit: 'cover',
    borderRadius: 14, marginBottom: 16,
    border: '1px solid rgba(92, 110, 88, 0.15)',
    backgroundColor: 'rgba(92, 110, 88, 0.06)',
    display: 'block',
  },
  completeBtn: {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: 18, transition: 'all 0.2s',
  },
  section: {
    marginBottom: 18, paddingBottom: 18,
    borderBottom: '1px solid rgba(92, 110, 88, 0.1)',
  },
  sectionTitle: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: '#4F6F44',
    fontFamily: "'Inter', sans-serif", marginBottom: 8,
  },
  sectionBody: {
    fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 350,
    lineHeight: 1.55, color: '#3a3833', letterSpacing: '-0.005em',
  },
  notesSection: { marginTop: 8 },
  notesTextarea: {
    width: '100%', minHeight: 90, padding: 12,
    border: '1px solid rgba(92, 110, 88, 0.18)',
    borderRadius: 10, fontFamily: "'Fraunces', serif", fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)', color: '#3a3833',
    resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5,
  },
  plantStatsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 20 },
  plantStat: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(92, 110, 88, 0.1)',
    borderRadius: 10, padding: '10px 12px',
  },
  plantStatLabel: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: '#4F6F44',
    fontFamily: "'Inter', sans-serif", marginBottom: 4,
  },
  plantStatValue: {
    fontFamily: "'Fraunces', serif", fontSize: 13,
    lineHeight: 1.45, color: '#3a3833',
  },
  miniTaskBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(92, 110, 88, 0.12)',
    borderRadius: 10, cursor: 'pointer', width: '100%',
    textAlign: 'left', fontFamily: "'Fraunces', serif",
  },
  miniTaskMonth: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#8B5A3C',
    fontFamily: "'Inter', sans-serif", minWidth: 26,
  },
  miniTaskTitle: { flex: 1, fontSize: 13, color: '#2C3A2A', lineHeight: 1.3 },
}
