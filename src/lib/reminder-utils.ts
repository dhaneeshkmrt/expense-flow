
import { add, set, getDay, getDate, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isAfter, isEqual, format, parseISO } from 'date-fns';
import type { Reminder, RecurrenceRule } from './types';

function getOrdinalNth(n: number) {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
}

function getDayOfWeekName(day: number) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
}

export function getFriendlyRecurrence(rule: RecurrenceRule): string {
    const { frequency, dayOfMonth, dayOfWeek, weekOfMonth } = rule;

    switch (frequency) {
        case 'one-time':
            return 'One-time reminder';
        case 'monthly':
            if (dayOfMonth) {
                return `Every month on the ${dayOfMonth}${getOrdinalNth(dayOfMonth)}`;
            }
            if (dayOfWeek !== undefined && weekOfMonth) {
                const week = ['first', 'second', 'third', 'fourth', 'last'][weekOfMonth - 1];
                return `Every month on the ${week} ${getDayOfWeekName(dayOfWeek)}`;
            }
            return 'Monthly';
        case 'quarterly':
            if (dayOfMonth) {
                return `Every quarter on the ${dayOfMonth}${getOrdinalNth(dayOfMonth)}`;
            }
             if (dayOfWeek !== undefined && weekOfMonth) {
                const week = ['first', 'second', 'third', 'fourth', 'last'][weekOfMonth - 1];
                return `Every quarter on the ${week} ${getDayOfWeekName(dayOfWeek)}`;
            }
            return 'Quarterly';
        case 'yearly':
             if (dayOfMonth) {
                return `Every year on this date`;
            }
            return 'Yearly';
        default:
            return 'Recurring';
    }
}


// Function to find the Nth weekday of a month
function getNthDayOfWeek(date: Date, dayOfWeek: number, weekOfMonth: number): Date {
    const firstDay = startOfMonth(date);
    let count = 0;
    let resultDate = firstDay;

    // Handle "last" week of month
    if (weekOfMonth === 5) {
        let lastDay = endOfMonth(date);
        while (getDay(lastDay) !== dayOfWeek) {
            lastDay = add(lastDay, { days: -1 });
        }
        return lastDay;
    }

    for (let i = 0; i < getDaysInMonth(date); i++) {
        const currentDate = add(firstDay, { days: i });
        if (getDay(currentDate) === dayOfWeek) {
            count++;
            if (count === weekOfMonth) {
                resultDate = currentDate;
                break;
            }
        }
    }
    return resultDate;
}

export function generateReminderInstances(
  reminders: Reminder[],
  year: number,
  month: number,
): ReminderInstance[] {
  const instances: ReminderInstance[] = [];
  const periodStart = startOfMonth(new Date(year, month));
  const periodEnd = endOfMonth(new Date(year, month));

  reminders.forEach(reminder => {
    let cursorDate = parseISO(reminder.startDate);

    while (isBefore(cursorDate, periodEnd) || isEqual(cursorDate, periodEnd)) {
        let potentialDueDate: Date | null = null;
        
        if (reminder.recurrence.frequency === 'one-time') {
            if (isEqual(startOfMonth(cursorDate), periodStart)) {
                 potentialDueDate = cursorDate;
            }
            // Move cursor past periodEnd to stop loop for one-time reminders
            cursorDate = add(periodEnd, { days: 1 });

        } else {
            const { dayOfMonth, dayOfWeek, weekOfMonth } = reminder.recurrence;
            
            if (dayOfMonth) {
                let targetDate = set(cursorDate, { date: dayOfMonth });
                 // If the target date is before the cursor (e.g. cursor is on 20th, dayOfMonth is 5th), move to next month
                if(isBefore(targetDate, cursorDate)) {
                    targetDate = add(targetDate, { months: 1 });
                }
                potentialDueDate = targetDate;
            } else if (dayOfWeek !== undefined && weekOfMonth) {
                let baseDateForCalc = cursorDate;
                let calculatedDate = getNthDayOfWeek(baseDateForCalc, dayOfWeek, weekOfMonth);
                
                // If calculated date is before cursor, move to next month's calculation
                if(isBefore(calculatedDate, cursorDate)) {
                    baseDateForCalc = add(startOfMonth(cursorDate), { months: 1 });
                    calculatedDate = getNthDayOfWeek(baseDateForCalc, dayOfWeek, weekOfMonth);
                }
                potentialDueDate = calculatedDate;
            }
        }
        
        if (potentialDueDate && (isAfter(potentialDueDate, periodStart) || isEqual(potentialDueDate, periodStart)) && (isBefore(potentialDueDate, periodEnd) || isEqual(potentialDueDate, periodEnd))) {
            const dueDateStr = format(potentialDueDate, 'yyyy-MM-dd');
            const isCompleted = !!reminder.completedInstances[dueDateStr];
            instances.push({
                reminder,
                dueDate: potentialDueDate,
                isCompleted,
                transactionId: reminder.completedInstances[dueDateStr],
            });
        }
        
        // Advance the cursor for the next iteration
        if(reminder.recurrence.frequency !== 'one-time') {
            const nextMonthStart = add(startOfMonth(cursorDate), { months: 1 });
            if(isBefore(nextMonthStart, cursorDate)) { // Should not happen with startOfMonth, but as a safeguard
                 cursorDate = add(cursorDate, { months: 1 });
            } else {
                 cursorDate = nextMonthStart;
            }
        }
    }
  });

  return instances.sort((a,b) => a.dueDate.getTime() - b.dueDate.getTime());
}
