import { Routes, Route } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { ComingSoon } from './routes/ComingSoon'
import { MoreMenu } from './routes/MoreMenu'
import { RequireAuth } from './routes/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { allNavItems } from './layouts/nav-config'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {allNavItems.map((item) => (
            <Route
              key={item.path}
              index={item.path === '/'}
              path={item.path === '/' ? undefined : item.path.slice(1)}
              element={<ComingSoon title={item.label} />}
            />
          ))}
          <Route path="more" element={<MoreMenu />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
