import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, LogOut, MapPin, Package, Phone, RefreshCw, Truck } from 'lucide-react';
import { RunBadge } from '../../components/pickups/RunBadge';
import { errorMessage } from '../../lib/error-message';
import { useAuth } from '../auth/use-auth';
import { getMyDriverTasks, updateDelivery, updatePickup, type DriverJob } from '../../services/logistics';
import type { DeliveryStatus, PickupStatus } from '../../types/pickup-delivery';

/** Next step a driver can take on a job; staff handle scheduling and assignment. */
const NEXT: Record<string, { status: string; label: string } | undefined> = {
  'PICKUP:DRIVER_ASSIGNED': { status: 'ON_THE_WAY', label: "I'm on the way →" },
  'PICKUP:ON_THE_WAY': { status: 'PICKED_UP', label: 'Picked up ✓' },
  'DELIVERY:DRIVER_ASSIGNED': { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery →' },
  'DELIVERY:OUT_FOR_DELIVERY': { status: 'DELIVERED', label: 'Delivered ✓' },
};
const DONE = ['PICKED_UP', 'DELIVERED', 'CANCELLED', 'FAILED'];

/**
 * Driver mobile view - /driver, signed in as a driver. Shows only that
 * driver's jobs with what's needed to do them (business rule #8): name,
 * phone, address, time window, reference, and any cash to collect.
 */
export function DriverMobileView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyDriverTasks();
      setJobs([...res.pickups, ...res.deliveries].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)));
    } catch (err) {
      setError(errorMessage(err, 'load your jobs'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const advance = async (job: DriverJob) => {
    const next = NEXT[`${job.type}:${job.status}`];
    if (!next) return;
    setBusyId(job.id);
    setError(null);
    try {
      if (job.type === 'PICKUP') await updatePickup(job.id, { status: next.status });
      else await updateDelivery(job.id, { status: next.status });
      await fetchTasks();
    } catch (err) {
      setError(errorMessage(err, 'update this job'));
    } finally {
      setBusyId(null);
    }
  };

  const active = jobs.filter((j) => !DONE.includes(j.status));
  const done = jobs.filter((j) => j.status === 'PICKED_UP' || j.status === 'DELIVERED');

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary px-4 pb-4 text-white">
        <div className="flex items-center justify-between pt-4">
          <div>
            <div className="text-xs opacity-75">Driver jobs</div>
            <div className="text-base font-bold">{user?.fullName ?? 'Driver'}</div>
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label="Refresh" onClick={() => void fetchTasks()} disabled={loading} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-white/10 py-2"><div className="text-lg font-bold">{active.length}</div><div className="text-[10px] opacity-75">To do</div></div>
          <div className="rounded-lg bg-white/10 py-2"><div className="text-lg font-bold">{done.length}</div><div className="text-[10px] opacity-75">Done</div></div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-5">
        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

        {!loading && active.length === 0 && !error && (
          <div className="space-y-2 rounded-2xl border border-dashed border-border p-8 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">No jobs right now</p>
            <p className="text-xs text-text-muted">New pickups and deliveries appear here when the shop assigns them to you.</p>
          </div>
        )}

        {active.map((job) => {
          const next = NEXT[`${job.type}:${job.status}`];
          return (
            <div key={job.id} className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-sm font-bold text-primary">
                  {job.type === 'PICKUP' ? <Package className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                  {job.reference}
                </span>
                <RunBadge
                  status={job.status as PickupStatus & DeliveryStatus}
                  type={job.type === 'PICKUP' ? 'pickup' : 'delivery'}
                />
              </div>
              <div className="text-xs text-text-muted">
                {job.type === 'PICKUP' ? 'Collect from customer' : `Deliver order ${job.orderNumber ?? ''}`} ·{' '}
                {job.scheduledDate}
                {job.timeSlot ? ` · ${job.timeSlot}` : ''}
              </div>
              <div className="text-base font-semibold">{job.customerName}</div>
              <div className="flex items-start gap-2 text-sm text-text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{job.address}</span>
              </div>
              {job.customerPhone && (
                <a href={`tel:${job.customerPhone}`} className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Phone className="h-4 w-4" /> {job.customerPhone}
                </a>
              )}
              {job.amountToCollect > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-800">
                  <span>Collect</span>
                  <span className="font-mono">{job.amountToCollect.toLocaleString()} RWF</span>
                </div>
              )}
              {job.notes && <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{job.notes}</div>}
              {next ? (
                <button
                  type="button"
                  disabled={busyId === job.id}
                  onClick={() => void advance(job)}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
                >
                  {busyId === job.id ? 'Saving…' : next.label}
                </button>
              ) : (
                <p className="text-center text-xs text-text-muted">Waiting for the shop to confirm this job.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
