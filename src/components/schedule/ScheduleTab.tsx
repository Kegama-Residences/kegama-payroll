import React, { useEffect, useMemo, useState } from 'react';
import { AttendanceStatus, DayRecord, Employee } from '../../types/payroll';
import {
  AttendanceMap,
  buildMonthGrid,
  getDayRecord,
  monthLabel,
  restDayName,
  summarizePeriod,
  WEEKDAY_HEADERS,
} from '../../utils/attendance';
import { isScheduledWorkDay, hoursPerDayFor, otRateFor, restDayOtRateFor, toISODateLocal } from '../../utils/calculations';
import { numOrEmpty, parseIntInput, parseNumInput } from '../../utils/numberInput';
import { triggerHapticFeedback } from '../../utils/printService';
import { formatPHP } from '../../utils/currency';
import { CalendarCheck, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';

interface ScheduleTabProps {
  employees: Employee[];
  attendance: AttendanceMap;
  onSaveDay: (employeeId: string, iso: string, rec: DayRecord | undefined) => void;
}

type MarkChoice = 'present' | 'absent' | 'half-day';

function markChoicesFor(shiftHours: number): { id: MarkChoice; label: string; hint: string }[] {
  const half = shiftHours / 2;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n));
  return [
    { id: 'present', label: 'Present', hint: 'Clear any mark' },
    { id: 'absent', label: 'Absent', hint: `Unpaid, docks ${fmt(shiftHours)}h` },
    { id: 'half-day', label: 'Half-day', hint: `Docks ${fmt(half)}h` },
  ];
}

const CELL_TINT: Record<AttendanceStatus, string> = {
  present:
    'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold',
  absent:
    'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 font-bold',
  'half-day':
    'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 font-bold',
  // Legacy marks (old saved data only — no longer selectable in the UI).
  leave:
    'bg-sky-100 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-100 font-bold',
  holiday:
    'bg-violet-100 dark:bg-violet-950/60 border-violet-300 dark:border-violet-800 text-violet-900 dark:text-violet-100 font-bold',
};

const CELL_LABEL: Record<AttendanceStatus, string> = {
  present: 'PRE',
  absent: 'ABS',
  'half-day': '½',
  // Legacy labels, shown only for old saved marks.
  leave: 'LEA',
  holiday: 'HOL',
};

function todayISO(): string {
  return toISODateLocal(new Date());
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ employees, attendance, onSaveDay }) => {
  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active'), [employees]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(activeEmployees[0]?.id ?? '');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [markingISO, setMarkingISO] = useState<string | null>(null);

  const employee = activeEmployees.find((e) => e.id === selectedEmpId) ?? activeEmployees[0] ?? null;
  useEffect(() => {
    if (!selectedEmpId && activeEmployees[0]) setSelectedEmpId(activeEmployees[0].id);
    if (selectedEmpId && !activeEmployees.some((e) => e.id === selectedEmpId)) {
      setSelectedEmpId(activeEmployees[0]?.id ?? '');
    }
  }, [activeEmployees, selectedEmpId]);

  const weeks = useMemo(() => buildMonthGrid(year, month0), [year, month0]);
  const monthStart = `${year}-${String(month0 + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const monthEnd = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const summary = useMemo(
    () => (employee ? summarizePeriod(employee, attendance, monthStart, monthEnd) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employee, attendance, year, month0],
  );

  const shiftMonth = (delta: number) => {
    triggerHapticFeedback();
    const d = new Date(year, month0 + delta, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  };
  const goToday = () => {
    triggerHapticFeedback();
    const t = new Date();
    setYear(t.getFullYear());
    setMonth0(t.getMonth());
  };

  if (!employee) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
          <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No active employees yet</p>
          <p className="mt-1 text-xs text-slate-500">Add an employee first — their work calendar appears here.</p>
        </div>
      </div>
    );
  }

  const daysPerWeek = employee.workSchedule?.daysPerWeek ?? 6;
  const shiftHours = hoursPerDayFor(employee.workSchedule);
  const today = todayISO();

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={employee.id}
            onChange={(e) => {
              triggerHapticFeedback();
              setSelectedEmpId(e.target.value);
              setMarkingISO(null);
            }}
            className="flex-1 p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
            aria-label="Select employee"
          >
            {activeEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} • {e.employeeNumber}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => shiftMonth(-1)} className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300" aria-label="Previous month">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToday} className="px-3 min-h-[44px] text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">
              Today
            </button>
            <button onClick={() => shiftMonth(1)} className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300" aria-label="Next month">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{monthLabel(year, month0)}</span>
          <span>
            {daysPerWeek}-day week · {shiftHours}h/day
            {restDayName(employee.workSchedule)
              ? ` · rests ${restDayName(employee.workSchedule)}`
              : ' · no rest day (Sundays included)'}{' '}
            · {formatPHP(employee.dailyRate)}/day
          </span>
          <span className="italic">Schedule? Change it in Employees → Edit.</span>
        </div>
      </div>

      {/* Month summary */}
      {summary && (() => {
        const otRate = otRateFor(employee);
        const otPay = Math.round(summary.overtimeHours * otRate * 100) / 100;
        return (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
          {[
            { label: 'Scheduled', value: String(summary.scheduledDays) },
            { label: 'Absent', value: String(summary.absentDays) },
            { label: 'Half-days', value: String(summary.halfDays) },
            { label: `OT pay (${summary.overtimeHours}h × ${formatPHP(otRate)})`, value: formatPHP(otPay) },
            { label: 'Docked', value: `${Math.round((summary.undertimeMinutes / 60) * 2) / 2}h` },
          ].map((k) => (
            <div key={k.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-1 shadow-sm">
              <span className="block text-base font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">{k.value}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</span>
            </div>
          ))}
        </div>
        );
      })()}

      {/* Calendar grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pb-1">
              {d}
            </div>
          ))}
          {weeks.flat().map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const iso = toISODateLocal(date);
            const isWork = isScheduledWorkDay(iso, employee.workSchedule);
            const mark = getDayRecord(attendance, employee.id, iso);
            const isToday = iso === today;
            if (!isWork) {
              // Weekly rest day — tinted to reflect the employee's schedule, no "rest" text.
              // Still tappable: work logged here counts as OT only (no absent dock).
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setMarkingISO(iso);
                  }}
                  title={mark ? `${mark.status}${mark.overtimeHours ? ` · ${mark.overtimeHours}h OT` : ''}` : 'Weekly rest — tap to log work (OT only)'}
                  aria-label={`${iso}, weekly rest${mark ? `, marked ${mark.status}` : ''}`}
                  className={`min-h-[44px] sm:min-h-[56px] rounded-lg border text-xs font-mono flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
                    mark
                      ? CELL_TINT[mark.status]
                      : 'border-dashed border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 hover:border-orange-400 hover:text-slate-700'
                  } ${isToday ? 'ring-2 ring-orange-500' : ''}`}
                >
                  <span>{date.getDate()}</span>
                  {mark ? (
                    <>
                      <span className="text-[8px] font-sans font-bold uppercase leading-none">
                        {CELL_LABEL[mark.status]}
                      </span>
                      {(mark.overtimeHours ?? 0) > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" aria-hidden="true" />
                      )}
                    </>
                  ) : (
                    <span className="text-[8px] leading-none text-transparent select-none" aria-hidden="true">·</span>
                  )}
                </button>
              );
            }
            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  setMarkingISO(iso);
                }}
                title={mark ? `${mark.status}${mark.overtimeHours ? ` · ${mark.overtimeHours}h OT` : ''}` : 'Present — tap to mark'}
                aria-label={`${iso}${mark ? `, marked ${mark.status}` : ', present'}`}
                className={`min-h-[44px] sm:min-h-[56px] rounded-lg border text-xs font-mono flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
                  mark
                    ? CELL_TINT[mark.status]
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400'
                } ${isToday ? 'ring-2 ring-orange-500' : ''}`}
              >
                <span>{date.getDate()}</span>
                {mark ? (
                  <>
                    <span className="text-[8px] font-sans font-bold uppercase leading-none">
                      {CELL_LABEL[mark.status]}
                    </span>
                    {(mark.overtimeHours ?? 0) > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" aria-hidden="true" />
                    )}
                  </>
                ) : (
                  <span className="text-[8px] leading-none text-transparent select-none" aria-hidden="true">·</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-300" /> Absent (unpaid)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-300" /> Half-day</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border border-dashed border-slate-300 bg-slate-100" /> Weekly rest</span>
          <span className="italic">Unmarked = present</span>
        </div>
      </div>

      {/* Marking sheet */}
      {markingISO && (
        <MarkDaySheet
          key={`${employee.id}-${markingISO}`}
          employee={employee}
          iso={markingISO}
          existing={getDayRecord(attendance, employee.id, markingISO)}
          onClose={() => setMarkingISO(null)}
          onSave={(rec) => {
            onSaveDay(employee.id, markingISO, rec);
            setMarkingISO(null);
          }}
        />
      )}
    </div>
  );
};

function MarkDaySheet({
  employee,
  iso,
  existing,
  onClose,
  onSave,
}: {
  employee: Employee;
  iso: string;
  existing: DayRecord | undefined;
  onClose: () => void;
  onSave: (rec: DayRecord | undefined) => void;
}) {
  const initialChoice: MarkChoice =
    existing?.status === 'absent' || existing?.status === 'half-day' ? existing.status : 'present';
  const [choice, setChoice] = useState<MarkChoice>(initialChoice);
  const [otHours, setOtHours] = useState(existing?.overtimeHours ?? 0);
  const [ndHours, setNdHours] = useState(existing?.nightDiffHours ?? 0);
  const [lateMins, setLateMins] = useState(existing?.tardinessMinutes ?? 0);
  const [note, setNote] = useState(existing?.note ?? '');

  const dateLabel = new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const shiftHours = hoursPerDayFor(employee.workSchedule);
  const markChoices = markChoicesFor(shiftHours);
  const isRestDay = !isScheduledWorkDay(iso, employee.workSchedule);
  const restName = restDayName(employee.workSchedule);
  const effectiveOtRate = isRestDay ? restDayOtRateFor(employee) : otRateFor(employee);
  const otRateLabel = isRestDay
    ? `${formatPHP(effectiveOtRate)}/hr (130% Rest Day)`
    : `${formatPHP(effectiveOtRate)}/hr`;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticFeedback();
    // Plain present with nothing attached = no record needed (unmarked = present).
    if (choice === 'present' && !otHours && !ndHours && !lateMins && !note.trim()) {
      onSave(undefined);
      return;
    }
    onSave({
      status: choice,
      ...(otHours > 0 ? { overtimeHours: otHours } : {}),
      ...(ndHours > 0 ? { nightDiffHours: ndHours } : {}),
      ...(lateMins > 0 ? { tardinessMinutes: lateMins } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{dateLabel}</h3>
            <p className="text-[11px] text-slate-500">
              {employee.firstName} {employee.lastName} • {employee.employeeNumber} • {shiftHours}h shift
              {isRestDay ? ` • weekly rest${restName ? ` (${restName})` : ''}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {isRestDay && (
            <p className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Weekly rest day{restName ? ` (${restName})` : ''} — absent won't dock, work logged here counts as OT only.
            </p>
          )}
          {(existing?.status === 'leave' || existing?.status === 'holiday') && (
            <p className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              This day has an old “{existing.status}” mark. Saving here converts it to Present / Absent / Half-day.
            </p>
          )}
          <div className="grid grid-cols-1 gap-1.5">
            {markChoices.map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-2.5 p-2.5 min-h-[44px] rounded-xl border cursor-pointer transition ${
                  choice === c.id
                    ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 font-bold text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="day-status"
                  checked={choice === c.id}
                  onChange={() => setChoice(c.id)}
                  className="rounded-full text-orange-600 focus:ring-orange-500"
                />
                <span className="flex-1">{c.label}</span>
                <span className="text-[11px] font-normal text-slate-500">{c.hint}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">OT hrs ({otRateLabel})</label>
              <input
                type="number" min="0" step="0.5"
                value={numOrEmpty(otHours)} placeholder="0"
                onChange={(e) => setOtHours(parseNumInput(e.target.value))}
                className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
              {otHours > 0 && (
                <p className="mt-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">= {formatPHP(Math.round(otHours * effectiveOtRate * 100) / 100)}</p>
              )}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Night hrs</label>
              <input
                type="number" min="0" step="0.5"
                value={numOrEmpty(ndHours)} placeholder="0"
                onChange={(e) => setNdHours(parseNumInput(e.target.value))}
                className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Late min</label>
              <input
                type="number" min="0" step="1"
                value={numOrEmpty(lateMins)} placeholder="0"
                onChange={(e) => setLateMins(parseIntInput(e.target.value))}
                className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. half-day AM only"
              className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2 pt-1">
            {existing && (
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  onSave(undefined);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl font-bold"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-md shadow-orange-600/20 transition active:scale-95"
            >
              Save Day
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
