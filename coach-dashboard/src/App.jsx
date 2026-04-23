import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage     from './pages/LoginPage'
import SetupPage     from './pages/SetupPage'
import RequestsPage  from './pages/RequestsPage'
import ChatPage      from './pages/ChatPage'
import UserDataPage  from './pages/UserDataPage'
import Sidebar       from './components/Sidebar'

const SPRING = { type: 'spring', stiffness: 260, damping: 32 }

function DashboardShell() {
  const { user, coachProfile, loading } = useAuth()
  const [page, setPage]                 = useState('requests')
  const [selectedRequest, setSelectedRequest] = useState(null)

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary-container/30 border-t-primary-container animate-spin" />
          <p className="font-headline text-[10px] tracking-[4px] text-on-surface-variant uppercase">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />
  if (!coachProfile) return <SetupPage />

  const navigateTo = (p, req) => {
    if (req !== undefined) setSelectedRequest(req)
    setPage(p)
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar page={page} setPage={navigateTo} coach={coachProfile} />

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={SPRING}
            className="h-full"
          >
            {page === 'requests' && (
              <RequestsPage
                coach={coachProfile}
                onOpenChat={(req) => navigateTo('chat', req)}
              />
            )}
            {page === 'chat' && (
              <ChatPage
                coach={coachProfile}
                initialRequest={selectedRequest}
                onViewData={(req) => navigateTo('user-data', req)}
              />
            )}
            {page === 'user-data' && selectedRequest && (
              <UserDataPage
                coach={coachProfile}
                request={selectedRequest}
                onBack={() => navigateTo('chat', selectedRequest)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardShell />
    </AuthProvider>
  )
}
