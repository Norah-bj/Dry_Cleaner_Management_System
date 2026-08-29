import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';

const SECTIONS = [
  { title: 'Business', items: ['Business information', 'Logo', 'Address', 'Contact'] },
  { title: 'Orders', items: ['Order numbering', 'Statuses', 'Service types'] },
  { title: 'Pricing', items: ['Services', 'Normal / Express / Same Day rates'] },
  { title: 'Users', items: ['Users', 'Roles'] },
  { title: 'Notifications', items: ['SMS', 'WhatsApp', 'Email'] },
  { title: 'System', items: ['Backup', 'Audit logs', 'Integrations'] },
];

/** Priority item #15. Grouped sections per DESIGN-SYSTEM.md - no settings backend yet. */
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <h2 className="mb-3 text-base font-semibold">{section.title}</h2>
          <ul className="divide-y divide-border">
            {section.items.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between py-2 text-sm text-text-muted"
              >
                {item}
                <span className="text-xs">Not yet available</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
