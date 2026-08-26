import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

/**
 * Temporary setup-verification page — confirms Tailwind tokens, fonts,
 * and the base UI primitives render correctly. Replaced by the real app
 * shell/dashboard in a later phase (docs/design/DESIGN-SYSTEM.md #1-4).
 */
export function SetupCheck() {
  return (
    <div className="min-h-screen bg-background p-8 text-text">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">EDCMS frontend setup</h1>
        <p className="text-text-muted">
          Vite + React + TypeScript + Tailwind, wired to the design tokens
          in docs/design/DESIGN-SYSTEM.md.
        </p>

        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">Received</Badge>
            <Badge variant="neutral">Washing</Badge>
            <Badge variant="warning">Ready</Badge>
            <Badge variant="danger">Overdue</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
