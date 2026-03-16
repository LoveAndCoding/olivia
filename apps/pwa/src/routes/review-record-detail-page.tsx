import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRole } from '../lib/role';
import { loadReviewRecord } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';

function formatDateRange(start: string, end: string): string {
  const s = format(new Date(start + 'T00:00:00'), 'MMM d');
  const e = format(new Date(end + 'T00:00:00'), 'MMM d');
  return `${s} – ${e}`;
}

function formatReviewDate(isoDate: string): string {
  return format(new Date(isoDate + 'T00:00:00'), 'EEEE, MMM d');
}

function formatCompletionMeta(completedAt: string, completedBy: string): string {
  const time = format(new Date(completedAt), 'h:mm aa');
  const who = completedBy === 'stakeholder' ? 'Lexi' : completedBy === 'spouse' ? 'Christian' : completedBy;
  return `Completed ${time} · ${who}`;
}

function NarrativeCard({ label, text }: { label: string; text: string }) {
  return (
    <div
      style={{
        background: 'var(--lavender-soft)',
        border: '1.5px solid var(--lavender-mid)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--violet)', marginBottom: 4 }}>
        ✦ AI-assisted
      </div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 400, color: 'var(--ink)', lineHeight: 1.55 }}>
        {text}
      </div>
    </div>
  );
}

export function ReviewRecordDetailPage() {
  const params = useParams({ from: '/review-records/$reviewRecordId' });
  const { reviewRecordId } = params;
  const navigate = useNavigate();
  const { role } = useRole();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['review-record', reviewRecordId, role],
    queryFn: () => loadReviewRecord(reviewRecordId, role),
    staleTime: 60_000,
  });

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '22px 16px 0' }}>
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/history' })}
          >
            ← History
          </button>

          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--ink)', marginTop: 8 }}>
            Review
          </div>

          {data && (
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>
              {formatReviewDate(data.reviewDate)}
            </div>
          )}
        </div>

        {role === 'spouse' && (
          <div className="list-spouse-banner" role="status" style={{ marginTop: 12 }}>
            You have read-only access to household reviews.
          </div>
        )}

        {isLoading && (
          <div style={{ padding: '24px 22px', color: 'var(--ink-3)', fontSize: 13 }}>
            Loading review record…
          </div>
        )}

        {isError && (
          <div style={{ padding: '24px 22px', color: 'var(--rose)', fontSize: 13 }}>
            Could not load review record.
          </div>
        )}

        {data && (
          <div style={{ padding: '20px 22px' }}>
            {/* Weeks reviewed */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
              Weeks reviewed
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {/* Last week chip */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--ink-4)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  flex: 1,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 }}>Last week</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                  {formatDateRange(data.lastWeekWindowStart, data.lastWeekWindowEnd)}
                </div>
              </div>
              {/* Current week chip */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--ink-4)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  flex: 1,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 }}>Coming week</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                  {formatDateRange(data.currentWeekWindowStart, data.currentWeekWindowEnd)}
                </div>
              </div>
            </div>

            {/* AI narrative cards */}
            {(data.recapNarrative || data.overviewNarrative) && (
              <>
                <div style={{ height: 1, background: 'var(--ink-4)', marginBottom: 20 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
                  Summaries
                </div>
                {data.recapNarrative && (
                  <NarrativeCard label="Last week" text={data.recapNarrative} />
                )}
                {data.overviewNarrative && (
                  <NarrativeCard label="Coming week" text={data.overviewNarrative} />
                )}
              </>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--ink-4)', marginBottom: 20 }} />

            {/* Notes section */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
              Notes
            </div>

            {data.carryForwardNotes ? (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--ink-4)',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 15,
                  color: 'var(--ink)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {data.carryForwardNotes}
              </div>
            ) : (
              <div
                style={{
                  fontFamily: 'Fraunces, serif',
                  fontStyle: 'italic',
                  fontSize: 14,
                  fontWeight: 300,
                  color: 'var(--ink-3)',
                }}
              >
                No carry-forward notes.
              </div>
            )}

            {/* Divider + completion meta */}
            <div style={{ height: 1, background: 'var(--ink-4)', margin: '20px 0 12px' }} />

            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {formatCompletionMeta(data.completedAt, data.completedBy)}
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>

      <BottomNav activeTab="memory" />
    </div>
  );
}
