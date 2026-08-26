import {
  LayoutDashboard,
  ClipboardList,
  Shirt,
  Truck,
  Users,
  Wallet,
  Package,
  UserCog,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Desktop sidebar structure, per docs/design/DESIGN-SYSTEM.md "Navigation
 * structure" - grouped by business workflow, not alphabetical.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Orders', path: '/orders', icon: ClipboardList },
      { label: 'Laundry', path: '/laundry', icon: Shirt },
      { label: 'Pickup & Delivery', path: '/pickup-delivery', icon: Truck },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Payments', path: '/payments', icon: Wallet },
      { label: 'Inventory', path: '/inventory', icon: Package },
      { label: 'Employees', path: '/employees', icon: UserCog },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Reports', path: '/reports', icon: BarChart3 }],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', path: '/settings', icon: Settings }],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

/**
 * Mobile bottom nav (staff): Home / Orders / Jobs / More, per
 * DESIGN-SYSTEM.md. "Jobs" isn't spelled out beyond the mockup label -
 * interpreted here as the Laundry board (the primary "what do I need to
 * work on" view); everything else (including Pickup & Delivery) lives
 * under "More". Flag if that reading is wrong.
 */
export const mobileNavItems = [
  { label: 'Home', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: ClipboardList },
  { label: 'Jobs', path: '/laundry', icon: Shirt },
];
