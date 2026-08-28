import { Routes, Route } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { ComingSoon } from './routes/ComingSoon'
import { MoreMenu } from './routes/MoreMenu'
import { RequireAuth } from './routes/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { allNavItems } from './layouts/nav-config'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {allNavItems.map((item) =>
            item.path === '/' ? (
              <Route key={item.path} index element={<DashboardPage />} />
            ) : (
              <Route
                key={item.path}
                path={item.path.slice(1)}
                element={<ComingSoon title={item.label} />}
              />
            ),
          )}
          <Route path="more" element={<MoreMenu />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
