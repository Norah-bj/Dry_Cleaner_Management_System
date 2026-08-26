import { Card } from '../components/ui/Card';

/**
 * Placeholder for a nav destination whose real feature page hasn't been
 * built yet (see build priority order in docs/design/DESIGN-SYSTEM.md).
 * Exists so navigation is real and testable now, without faking the
 * feature itself.
 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      <Card>
        <p className="text-text-muted">
          {title} isn't built yet. Navigation to this page works; the
          feature itself is a later phase.
        </p>
      </Card>
    </div>
  );
}
