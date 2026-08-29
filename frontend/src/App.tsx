import { Routes, Route } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { MoreMenu } from './routes/MoreMenu'
import { RequireAuth } from './routes/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { OrdersPage } from './features/orders/OrdersPage'
import { LaundryPage } from './features/laundry/LaundryPage'
import { PickupDeliveryPage } from './features/pickups/PickupDeliveryPage'
import { CustomersPage } from './features/customers/CustomersPage'
import { PaymentsPage } from './features/payments/PaymentsPage'
import { InventoryPage } from './features/inventory/InventoryPage'
import { EmployeesPage } from './features/employees/EmployeesPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { allNavItems } from './layouts/nav-config'

/** Every nav destination now has a real page - see docs/design/DESIGN-SYSTEM.md's priority order. */
const PAGES: Record<string, () => React.JSX.Element> = {
  '/': DashboardPage,
  '/orders': OrdersPage,
  '/laundry': LaundryPage,
  '/pickup-delivery': PickupDeliveryPage,
  '/customers': CustomersPage,
  '/payments': PaymentsPage,
  '/inventory': InventoryPage,
  '/employees': EmployeesPage,
  '/reports': ReportsPage,
  '/settings': SettingsPage,
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {allNavItems.map((item) => {
            const Page = PAGES[item.path];
            return (
              <Route
                key={item.path}
                index={item.path === '/'}
                path={item.path === '/' ? undefined : item.path.slice(1)}
                element={<Page />}
              />
            );
          })}
          <Route path="more" element={<MoreMenu />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
