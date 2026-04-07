import { useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Check, RotateCcw, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const GRID_COLS = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3',
  4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7',
};

const SPRING = { type: 'spring', stiffness: 400, damping: 30, mass: 0.7 };

function DayCard({ done, isCurrent, label, dayLabel, onToggle, attributes = {}, listeners = {}, isOverlay = false }) {
  return (
    <motion.div
      whileHover={!isOverlay ? { y: -2 } : undefined}
      transition={SPRING}
      className={`relative flex flex-col items-center gap-2 py-3.5 px-1 rounded-2xl border transition-colors duration-300 ${
        isOverlay
          ? 'bg-bg-700/95 border-mint/25 shadow-[0_26px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06] cursor-grabbing'
          : done
          ? 'bg-mint/[0.07] border-mint/20'
          : isCurrent
          ? 'bg-bg-600 border-white/[0.08] cursor-pointer'
          : 'bg-bg-700/60 border-white/[0.04] hover:border-white/[0.08] cursor-pointer'
      }`}
    >
      {isCurrent && !done && !isOverlay && (
        <motion.div
          className="absolute inset-0 rounded-2xl border border-mint/20 pointer-events-none"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div
        {...attributes} {...listeners}
        className={`absolute top-1.5 right-1.5 transition-colors touch-none ${
          isOverlay
            ? 'text-text-primary/60 cursor-grabbing'
            : 'text-text-muted/30 hover:text-text-muted/70 cursor-grab active:cursor-grabbing'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={10} />
      </div>

      <span className={`font-mono text-[9px] tracking-widest uppercase leading-none ${
        done ? 'text-mint' : isCurrent ? 'text-text-secondary' : 'text-text-muted'
      }`}>
        {dayLabel}
      </span>

      <motion.div
        animate={done ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={onToggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
          done ? 'bg-mint' : 'border border-bg-400'
        }`}
      >
        <motion.div
          initial={false}
          animate={done ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        >
          <Check size={15} strokeWidth={3} className="text-bg-900" />
        </motion.div>
      </motion.div>

      <span className={`font-display text-[10px] tracking-widest uppercase leading-none ${
        done ? 'text-mint' : isCurrent ? 'text-text-secondary' : 'text-text-muted'
      }`}>
        {label}
      </span>
    </motion.div>
  );
}

function SortableDay({ id, done, isCurrent, label, dayLabel, onToggle }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'scale-[0.985] opacity-30' : ''}>
      <DayCard
        done={done}
        isCurrent={isCurrent}
        label={label}
        dayLabel={dayLabel}
        onToggle={onToggle}
        attributes={attributes}
        listeners={listeners}
      />
    </div>
  );
}

export default function DayTracker({ completed, days, onToggle, onReset, onReorder }) {
  const total      = completed.length;
  const currentIdx = completed.indexOf(false);
  const doneCount  = completed.filter(Boolean).length;

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }));

  const ids = days
    ? days.map((day, i) => String(day?.id ?? `day-${i}`))
    : Array.from({ length: total }, (_, i) => String(i));
  const [activeId, setActiveId] = useState(null);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id);
    const newIdx = ids.indexOf(over.id);
    onReorder?.(oldIdx, newIdx);
  };

  const getShort = (i) => {
    if (days?.[i]) return days[i].name.split(' ')[0].slice(0, 4);
    return `D${i + 1}`;
  };

  const getDayLabel = (i) => {
    if (days?.[i]?.schedule) return days[i].schedule.slice(0, 3);
    return WEEK_DAYS[i % 7];
  };

  const activeIdx = activeId == null ? -1 : ids.indexOf(activeId);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <motion.span
            key={doneCount}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={SPRING}
            className="font-display text-3xl text-text-primary"
          >
            {doneCount}
          </motion.span>
          <span className="font-body text-sm text-text-muted">/{total} this week</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red transition-colors py-1 px-2.5 rounded-lg hover:bg-red/[0.06] font-body"
        >
          <RotateCcw size={11} /> Reset
        </motion.button>
      </div>

      <div className="h-px bg-bg-500/60 rounded-full overflow-hidden mb-4">
        <motion.div
          animate={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
          transition={{ type: 'spring', stiffness: 150, damping: 24 }}
          className="h-full bg-gradient-to-r from-mint/60 to-cyan/60"
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <div className={`grid gap-2 ${GRID_COLS[Math.min(total, 7)] || 'grid-cols-5'}`}>
            {ids.map((id, i) => (
              <SortableDay
                key={id}
                id={id}
                done={completed[i]}
                isCurrent={i === currentIdx}
                label={getShort(i)}
                dayLabel={getDayLabel(i)}
                onToggle={() => onToggle(i)}
              />
            ))}
          </div>
        </SortableContext>
        {typeof document !== 'undefined' && createPortal(
          <DragOverlay dropAnimation={{
            duration: 220,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}>
            {activeIdx >= 0 ? (
              <DayCard
                done={completed[activeIdx]}
                isCurrent={activeIdx === currentIdx}
                label={getShort(activeIdx)}
                dayLabel={getDayLabel(activeIdx)}
                onToggle={() => {}}
                isOverlay
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}
