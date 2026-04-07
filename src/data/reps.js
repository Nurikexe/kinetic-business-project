export const REP_SCHEMES = [
  { label: '6×2',   sets: 6, reps: '2',    category: 'Strength' },
  { label: '5×3',   sets: 5, reps: '3',    category: 'Strength' },
  { label: '4×4',   sets: 4, reps: '4',    category: 'Strength' },
  { label: '3×5',   sets: 3, reps: '5',    category: 'Strength' },
  { label: '5×5',   sets: 5, reps: '5',    category: 'Strength' },
  { label: '3×8',   sets: 3, reps: '8',    category: 'Hypertrophy' },
  { label: '4×8',   sets: 4, reps: '8',    category: 'Hypertrophy' },
  { label: '3×10',  sets: 3, reps: '10',   category: 'Hypertrophy' },
  { label: '4×10',  sets: 4, reps: '10',   category: 'Hypertrophy' },
  { label: '3×12',  sets: 3, reps: '12',   category: 'Hypertrophy' },
  { label: '4×12',  sets: 4, reps: '12',   category: 'Hypertrophy' },
  { label: '3×15',  sets: 3, reps: '15',   category: 'Isolation' },
  { label: '4×15',  sets: 4, reps: '15',   category: 'Isolation' },
  { label: '2×20',  sets: 2, reps: '20',   category: 'Endurance' },
  { label: '3×20',  sets: 3, reps: '20',   category: 'Endurance' },
  { label: '2×25',  sets: 2, reps: '25',   category: 'Endurance' },
  { label: 'AMRAP', sets: 1, reps: 'AMRAP',category: 'Endurance' },
];

export const SCHEME_CATEGORIES = [...new Set(REP_SCHEMES.map(s => s.category))];
