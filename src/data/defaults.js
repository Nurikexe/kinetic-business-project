export const DEFAULT_GYM_DAYS = [
  {
    id: 1, num: 'Day 1', name: 'Push', sub: 'Power & Shoulders',
    schedule: 'Monday',
    exercises: [
      { id: 'e1', name: 'Bench Press', sets: 5, reps: '3-5', weight: '' },
      { id: 'e2', name: 'Weighted Dips', sets: 4, reps: '5-8', weight: '' },
      { id: 'e3', name: 'Overhead DB Press', sets: 3, reps: '10-12', weight: '' },
      { id: 'e4', name: 'Lateral Raises', sets: 4, reps: '15-20', weight: '' },
      { id: 'e5', name: 'Tricep Rope Pushdowns', sets: 3, reps: '12-15', weight: '' },
    ]
  },
  {
    id: 2, num: 'Day 2', name: 'Pull', sub: 'Power & Forearms',
    schedule: 'Tuesday',
    exercises: [
      { id: 'e6', name: 'Weighted Pull-ups', sets: 5, reps: '2-5', weight: '' },
      { id: 'e7', name: 'Barbell Rows', sets: 3, reps: '8-10', weight: '' },
      { id: 'e8', name: 'Lat Pulldowns (Wide)', sets: 3, reps: '12', weight: '' },
      { id: 'e9', name: 'Preacher Curls', sets: 3, reps: '10-12', weight: '' },
      { id: 'e10', name: 'Reverse BB Curls', sets: 3, reps: '12', weight: '' },
      { id: 'e11', name: 'Face Pulls', sets: 3, reps: '15', weight: '' },
    ]
  },
  {
    id: 3, num: 'Day 3', name: 'Legs', sub: 'The 120kg Driver',
    schedule: 'Wednesday',
    exercises: [
      { id: 'e12', name: 'Back Squat', sets: 5, reps: '5', weight: '' },
      { id: 'e13', name: 'Hip Thrusts', sets: 4, reps: '8-10', weight: '' },
      { id: 'e14', name: 'Romanian Deadlifts', sets: 3, reps: '10', weight: '' },
      { id: 'e15', name: 'Leg Press', sets: 3, reps: '12-15', weight: '' },
      { id: 'e16', name: 'Seated Calf Raises', sets: 4, reps: '15-20', weight: '' },
    ]
  },
  {
    id: 4, num: 'Day 4', name: 'Arms + Legs', sub: 'Detail & Isolation',
    schedule: 'Thursday',
    exercises: [
      { id: 'e17', name: 'Bulgarian Split Squats', sets: 3, reps: '10/leg', weight: '' },
      { id: 'e18', name: 'Skull Crushers', sets: 3, reps: '10-12', weight: '' },
      { id: 'e19', name: 'Hammer Curls', sets: 3, reps: '10-12', weight: '' },
      { id: 'e20', name: 'Wrist Curls', sets: 3, reps: '15-20', weight: '' },
      { id: 'e21', name: 'Leg Curls', sets: 3, reps: '12-15', weight: '' },
    ]
  },
  {
    id: 5, num: 'Day 5', name: 'Chest/Back + Legs', sub: 'V-Taper & Core',
    schedule: 'Friday',
    exercises: [
      { id: 'e22', name: 'Incline DB Bench', sets: 3, reps: '8-10', weight: '' },
      { id: 'e23', name: 'Chest-Supported Rows', sets: 3, reps: '10-12', weight: '' },
      { id: 'e24', name: 'Front Squats', sets: 3, reps: '8-10', weight: '' },
      { id: 'e25', name: 'Lateral Raises', sets: 4, reps: '15-20', weight: '' },
      { id: 'e26', name: 'DB Shrugs', sets: 3, reps: '12', weight: '' },
      { id: 'e27', name: 'Reverse Flyes', sets: 3, reps: '15', weight: '' },
    ]
  },
];

export const DEFAULT_LIFTS = [
  { key: 'bench', name: 'Bench Press', current: 0, target: 100, unit: 'kg' },
  { key: 'squat', name: 'Back Squat', current: 0, target: 120, unit: 'kg' },
  { key: 'pullup', name: 'Weighted Pull-up', current: 0, target: 60, unit: 'kg', prefix: '+' },
  { key: 'dip', name: 'Weighted Dip', current: 0, target: 80, unit: 'kg', prefix: '+' },
];

export const RUN_WEEKS = [
  { week: 1, mon: '5×500m @ 6:00/km', thu: '30 min easy', sat: '6 km' },
  { week: 2, mon: '6×500m @ 6:00/km', thu: '35 min easy', sat: '7 km' },
  { week: 3, mon: '4×1km @ 6:10/km', thu: '40 min easy', sat: '8 km' },
  { week: 4, mon: '5×1km @ 6:10/km', thu: '30 min easy', sat: '5 km (deload)' },
  { week: 5, mon: '3×1.5km @ 6:00/km', thu: '40 min easy', sat: '9 km' },
  { week: 6, mon: '4×1.5km @ 6:00/km', thu: '45 min easy', sat: '10 km slow test' },
  { week: 7, mon: '5km tempo @ 6:15/km', thu: '45 min easy', sat: '8 km' },
  { week: 8, mon: '3km easy + strides', thu: '30 min easy', sat: '10 km @ goal pace' },
];
