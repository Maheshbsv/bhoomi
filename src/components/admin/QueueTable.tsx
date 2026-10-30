'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { isTerminal } from '@/domain/status';
import { SlaDot } from '@/components/shared/SlaDot';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatAge, type QueueRow } from './queueData';

/**
 * A real table on wide screens. Below md the same markup collapses into stacked cards
 * (display: block), so there is one set of links and no horizontal page scroll.
 */
export function QueueTable({ rows }: { rows: QueueRow[] }) {
  const t = useTranslations('admin');
  const tr = useTranslations();
  const kn = useLocale() === 'kn';
  const units = { d: t('ageD'), h: t('ageH'), lt1h: t('ageLt1h') };

  const th = 'px-3 py-2 text-left text-xs font-medium text-muted-foreground';
  const td = 'block px-3 py-1 md:table-cell md:py-3 md:align-middle';

  return (
    <table className="block w-full text-sm md:table">
      <thead className="sr-only md:not-sr-only md:table-header-group">
        <tr className="md:border-b">
          <th scope="col" className={th}>{t('col.sla')}</th>
          <th scope="col" className={th}>{t('col.number')}</th>
          <th scope="col" className={th}>{t('col.service')}</th>
          <th scope="col" className={th}>{t('col.place')}</th>
          <th scope="col" className={th}>{t('col.survey')}</th>
          <th scope="col" className={th}>{t('col.status')}</th>
          <th scope="col" className={th}>{t('col.age')}</th>
        </tr>
      </thead>
      <tbody className="block space-y-2 md:table-row-group md:space-y-0">
        {rows.map((r) => {
          const closed = isTerminal(r.status);
          const loc = r.location;
          const place = kn ? [loc.villageKn, loc.talukKn] : [loc.villageEn, loc.talukEn];
          return (
            <tr
              key={r.id}
              data-testid="queue-row"
              className="relative block rounded-xl border bg-card py-2 focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted/50 md:table-row md:rounded-none md:border-0 md:border-b md:bg-transparent md:py-0"
            >
              <td className={td}>
                <span className="inline-flex items-center gap-2">
                  {closed ? (
                    <span className="inline-flex items-center">
                      <span aria-hidden className="inline-block size-2.5 rounded-full bg-muted-foreground/40" />
                      <span className="sr-only">{t('closedSla')}</span>
                    </span>
                  ) : (
                    <SlaDot color={r.sla} />
                  )}
                  <span className={closed ? 'text-muted-foreground' : 'font-medium'}>
                    {t('hoursShort', { hours: Math.round(r.slaHours) })}
                  </span>
                </span>
              </td>
              <td className={td}>
                <Link
                  href={`/admin/request/?id=${encodeURIComponent(r.id)}`}
                  className="inline-flex min-h-11 items-center font-mono font-semibold outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {r.requestNumber}
                </Link>
              </td>
              <td className={td}>{tr(`services.${r.serviceType}.name`)}</td>
              <td className={td}>
                <span lang={kn ? 'kn' : undefined}>{place.join(', ')}</span>
              </td>
              <td className={td}>
                {r.surveyNo ? `${r.surveyNo}${r.hissaNo ? `/${r.hissaNo}` : ''}` : '-'}
              </td>
              <td className={td}>
                <StatusBadge status={r.status} />
              </td>
              <td className={`${td} text-muted-foreground`}>{formatAge(r.slaHours, units)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
