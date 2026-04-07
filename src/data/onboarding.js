import { DEFAULT_GYM_GOALS, DEFAULT_GYM_RULES, DEFAULT_LIFTS, RUN_WEEKS } from './defaults';

export const ONBOARDING_START_OPTIONS = [
  { id: 'favorite', title: "Go with Nurassyl's Favourite" },
  { id: 'generate', title: 'Generate Workout Plan' },
  { id: 'manual', title: 'Put My Workout Manually' },
];

export const ONBOARDING_QUESTIONS = [
  {
    id: 'main_goal',
    title: 'What is your main goal?',
    options: [
      { id: 'muscle_growth', label: 'Muscle Growth' },
      { id: 'strength', label: 'Strength' },
      { id: 'fat_loss', label: 'Fat Loss' },
      { id: 'running_endurance', label: 'Running Endurance' },
      { id: 'hybrid', label: 'Hybrid' },
      { id: 'general_fitness', label: 'General Fitness' },
    ],
  },
  {
    id: 'training_days',
    title: 'How many days can you train?',
    options: [
      { id: '3', label: '3 Days' },
      { id: '4', label: '4 Days' },
      { id: '5+', label: '5+ Days' },
    ],
  },
  {
    id: 'experience_level',
    title: 'What is your level?',
    options: [
      { id: 'beginner', label: 'Beginner' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'advanced', label: 'Advanced' },
    ],
  },
  {
    id: 'session_duration',
    title: 'How long is one session?',
    options: [
      { id: '30', label: '30 min' },
      { id: '45', label: '45 min' },
      { id: '60', label: '60 min' },
      { id: '90', label: '90 min' },
    ],
  },
];

const RELATIONSHIPS = {
  main_goal: {
    muscle_growth: ['PPL_3', 'UPPER_LOWER_4'],
    strength: ['UPPER_LOWER_4', 'FULL_BODY_3'],
    fat_loss: ['FULL_BODY_3', 'RUNNING_3'],
    running_endurance: ['RUNNING_3', 'RUNNING_4'],
    hybrid: ['HYBRID_3GYM_2RUN'],
    general_fitness: ['FULL_BODY_3', 'RUNNING_3'],
  },
  training_days: {
    '3': ['PPL_3', 'FULL_BODY_3', 'RUNNING_3'],
    '4': ['UPPER_LOWER_4', 'RUNNING_4'],
    '5+': ['HYBRID_3GYM_2RUN'],
  },
  experience_level: {
    beginner: ['FULL_BODY_3', 'RUNNING_3'],
    intermediate: ['PPL_3', 'UPPER_LOWER_4', 'RUNNING_4'],
    advanced: ['UPPER_LOWER_4', 'HYBRID_3GYM_2RUN'],
  },
  session_duration: {
    '30': ['FULL_BODY_3', 'RUNNING_3'],
    '45': ['PPL_3', 'RUNNING_4'],
    '60': ['UPPER_LOWER_4', 'HYBRID_3GYM_2RUN'],
    '90': ['UPPER_LOWER_4', 'HYBRID_3GYM_2RUN'],
  },
};

const PRESETS = {
  NURASSYLS_FAVOURITE_5PLUS3: {
    title: "Nurassyl's Favourite",
    gymGoals: DEFAULT_GYM_GOALS,
    gymDays: [
      { id: 1, num: 'Day 1', name: 'Push', sub: 'Power & Shoulders', schedule: 'Monday', exercises: [
        { id: 'fav-push-1', name: 'Bench Press', sets: 5, reps: '3-5', weight: '' },
        { id: 'fav-push-2', name: 'Weighted Dips', sets: 4, reps: '5-8', weight: '' },
        { id: 'fav-push-3', name: 'Overhead DB Press', sets: 3, reps: '10-12', weight: '' },
        { id: 'fav-push-4', name: 'Lateral Raises', sets: 4, reps: '15-20', weight: '' },
        { id: 'fav-push-5', name: 'Rope Pushdown', sets: 3, reps: '12-15', weight: '' },
      ] },
      { id: 2, num: 'Day 2', name: 'Pull', sub: 'Back Power', schedule: 'Tuesday', exercises: [
        { id: 'fav-pull-1', name: 'Weighted Pull-Ups', sets: 5, reps: '2-5', weight: '' },
        { id: 'fav-pull-2', name: 'Barbell Rows', sets: 3, reps: '8-10', weight: '' },
        { id: 'fav-pull-3', name: 'Lat Pulldown', sets: 3, reps: '12', weight: '' },
        { id: 'fav-pull-4', name: 'Preacher Curls', sets: 3, reps: '10-12', weight: '' },
        { id: 'fav-pull-5', name: 'Reverse Curls', sets: 3, reps: '12', weight: '' },
        { id: 'fav-pull-6', name: 'Face Pulls', sets: 3, reps: '15', weight: '' },
      ] },
      { id: 3, num: 'Day 3', name: 'Legs', sub: 'Strength Base', schedule: 'Wednesday', exercises: [
        { id: 'fav-legs-1', name: 'Back Squat', sets: 5, reps: '5', weight: '' },
        { id: 'fav-legs-2', name: 'Hip Thrust', sets: 4, reps: '8-10', weight: '' },
        { id: 'fav-legs-3', name: 'RDL', sets: 3, reps: '10', weight: '' },
        { id: 'fav-legs-4', name: 'Leg Press', sets: 3, reps: '12-15', weight: '' },
        { id: 'fav-legs-5', name: 'Seated Calf Raise', sets: 4, reps: '15-20', weight: '' },
      ] },
      { id: 4, num: 'Day 4', name: 'Arms + Legs', sub: 'Detail Work', schedule: 'Thursday', exercises: [
        { id: 'fav-arms-1', name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', weight: '' },
        { id: 'fav-arms-2', name: 'Skull Crushers', sets: 3, reps: '10-12', weight: '' },
        { id: 'fav-arms-3', name: 'Hammer Curls', sets: 3, reps: '10-12', weight: '' },
        { id: 'fav-arms-4', name: 'Wrist Curls', sets: 3, reps: '15-20', weight: '' },
        { id: 'fav-arms-5', name: 'Leg Curls', sets: 3, reps: '12-15', weight: '' },
      ] },
      { id: 5, num: 'Day 5', name: 'Chest + Back + Legs', sub: 'Finish Strong', schedule: 'Friday', exercises: [
        { id: 'fav-mix-1', name: 'Incline DB Bench', sets: 3, reps: '8-10', weight: '' },
        { id: 'fav-mix-2', name: 'Chest Supported Row', sets: 3, reps: '10-12', weight: '' },
        { id: 'fav-mix-3', name: 'Front Squat', sets: 3, reps: '8-10', weight: '' },
        { id: 'fav-mix-4', name: 'Lateral Raises', sets: 4, reps: '15-20', weight: '' },
        { id: 'fav-mix-5', name: 'DB Shrugs', sets: 3, reps: '12', weight: '' },
        { id: 'fav-mix-6', name: 'Reverse Flyes', sets: 3, reps: '15', weight: '' },
      ] },
    ],
    runTypes: [
      { id: 'fav-run-1', day: 'Monday', name: 'Zone 2 Run', desc: 'Easy aerobic builder', iconKey: 'heart', color: '#71d7c9' },
      { id: 'fav-run-2', day: 'Thursday', name: 'Tempo Run', desc: 'Controlled threshold effort', iconKey: 'zap', color: '#d6ee63' },
      { id: 'fav-run-3', day: 'Saturday', name: 'Long Run', desc: 'Distance focus and endurance', iconKey: 'flame', color: '#ff6b6b' },
    ],
  },
  PPL_3: {
    title: 'Push Pull Legs',
    gymGoals: 'Build muscle · Add reps weekly · Recover hard',
    gymDays: [
      { id: 1, num: 'Day 1', name: 'Push', sub: 'Chest · Shoulders · Triceps', schedule: 'Monday', exercises: [
        { id: 'ppl-push-1', name: 'Barbell Bench Press', sets: 3, reps: '5-8', weight: '' },
        { id: 'ppl-push-2', name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', weight: '' },
        { id: 'ppl-push-3', name: 'Overhead Press', sets: 3, reps: '6-8', weight: '' },
        { id: 'ppl-push-4', name: 'Lateral Raise', sets: 3, reps: '12-15', weight: '' },
        { id: 'ppl-push-5', name: 'Tricep Extension', sets: 3, reps: '10-12', weight: '' },
      ] },
      { id: 2, num: 'Day 2', name: 'Pull', sub: 'Back · Rear Delts · Biceps', schedule: 'Wednesday', exercises: [
        { id: 'ppl-pull-1', name: 'Pull-Ups', sets: 3, reps: '6-10', weight: '' },
        { id: 'ppl-pull-2', name: 'Barbell Row', sets: 3, reps: '6-8', weight: '' },
        { id: 'ppl-pull-3', name: 'Seated Cable Row', sets: 3, reps: '8-12', weight: '' },
        { id: 'ppl-pull-4', name: 'Face Pulls', sets: 3, reps: '12-15', weight: '' },
        { id: 'ppl-pull-5', name: 'Dumbbell Curl', sets: 3, reps: '10-12', weight: '' },
        { id: 'ppl-pull-6', name: 'Hammer Curl', sets: 2, reps: '12-15', weight: '' },
      ] },
      { id: 3, num: 'Day 3', name: 'Legs', sub: 'Lower Body Strength', schedule: 'Friday', exercises: [
        { id: 'ppl-legs-1', name: 'Back Squat', sets: 3, reps: '5-8', weight: '' },
        { id: 'ppl-legs-2', name: 'Romanian Deadlift', sets: 3, reps: '6-10', weight: '' },
        { id: 'ppl-legs-3', name: 'Leg Press', sets: 3, reps: '10-12', weight: '' },
        { id: 'ppl-legs-4', name: 'Walking Lunges', sets: 2, reps: '10 each', weight: '' },
        { id: 'ppl-legs-5', name: 'Leg Curl', sets: 3, reps: '10-12', weight: '' },
      ] },
    ],
    runTypes: [{ id: 'ppl-run-1', day: 'Saturday', name: 'Easy Run', desc: 'Optional recovery run', iconKey: 'heart', color: '#71d7c9' }],
  },
  UPPER_LOWER_4: {
    title: 'Upper Lower 4',
    gymGoals: 'Get stronger on the basics',
    gymDays: [
      { id: 1, num: 'Day 1', name: 'Upper A', sub: 'Strength Upper', schedule: 'Monday', exercises: [
        { id: 'ul-1', name: 'Bench Press', sets: 3, reps: '5-8', weight: '' },
        { id: 'ul-2', name: 'Pull-Ups', sets: 3, reps: '6-10', weight: '' },
        { id: 'ul-3', name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', weight: '' },
        { id: 'ul-4', name: 'Chest Supported Row', sets: 3, reps: '8-10', weight: '' },
        { id: 'ul-5', name: 'Lateral Raise', sets: 3, reps: '12-15', weight: '' },
      ] },
      { id: 2, num: 'Day 2', name: 'Lower A', sub: 'Strength Lower', schedule: 'Tuesday', exercises: [
        { id: 'ul-6', name: 'Back Squat', sets: 3, reps: '5-8', weight: '' },
        { id: 'ul-7', name: 'Romanian Deadlift', sets: 3, reps: '6-8', weight: '' },
        { id: 'ul-8', name: 'Bulgarian Split Squat', sets: 3, reps: '8 each', weight: '' },
        { id: 'ul-9', name: 'Leg Curl', sets: 3, reps: '10-12', weight: '' },
      ] },
      { id: 3, num: 'Day 3', name: 'Upper B', sub: 'Volume Upper', schedule: 'Thursday', exercises: [
        { id: 'ul-10', name: 'Overhead Press', sets: 3, reps: '5-8', weight: '' },
        { id: 'ul-11', name: 'Barbell Row', sets: 3, reps: '6-8', weight: '' },
        { id: 'ul-12', name: 'Dumbbell Bench Press', sets: 3, reps: '8-10', weight: '' },
        { id: 'ul-13', name: 'Seated Cable Row', sets: 3, reps: '10-12', weight: '' },
      ] },
      { id: 4, num: 'Day 4', name: 'Lower B', sub: 'Posterior Chain', schedule: 'Friday', exercises: [
        { id: 'ul-14', name: 'Deadlift', sets: 3, reps: '4-6', weight: '' },
        { id: 'ul-15', name: 'Front Squat', sets: 3, reps: '6-10', weight: '' },
        { id: 'ul-16', name: 'Leg Press', sets: 3, reps: '10-12', weight: '' },
        { id: 'ul-17', name: 'Plank', sets: 3, reps: '45-60s', weight: '' },
      ] },
    ],
    runTypes: [{ id: 'ul-run-1', day: 'Saturday', name: 'Recovery Run', desc: 'Optional conditioning', iconKey: 'refresh_cw', color: '#71d7c9' }],
  },
  FULL_BODY_3: {
    title: 'Full Body 3',
    gymGoals: 'Get consistent · Build a base',
    gymDays: [
      { id: 1, num: 'Day 1', name: 'Full Body 1', sub: 'Strength Focus', schedule: 'Monday', exercises: [
        { id: 'fb-1', name: 'Back Squat', sets: 3, reps: '5', weight: '' },
        { id: 'fb-2', name: 'Bench Press', sets: 3, reps: '5-8', weight: '' },
        { id: 'fb-3', name: 'Pull-Ups', sets: 3, reps: '6-10', weight: '' },
        { id: 'fb-4', name: 'Romanian Deadlift', sets: 3, reps: '8', weight: '' },
      ] },
      { id: 2, num: 'Day 2', name: 'Full Body 2', sub: 'Power Focus', schedule: 'Wednesday', exercises: [
        { id: 'fb-5', name: 'Deadlift', sets: 3, reps: '4-6', weight: '' },
        { id: 'fb-6', name: 'Overhead Press', sets: 3, reps: '5-8', weight: '' },
        { id: 'fb-7', name: 'Barbell Row', sets: 3, reps: '6-8', weight: '' },
        { id: 'fb-8', name: 'Walking Lunges', sets: 2, reps: '10 each', weight: '' },
      ] },
      { id: 3, num: 'Day 3', name: 'Full Body 3', sub: 'Balanced Volume', schedule: 'Friday', exercises: [
        { id: 'fb-9', name: 'Front Squat', sets: 3, reps: '6-10', weight: '' },
        { id: 'fb-10', name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', weight: '' },
        { id: 'fb-11', name: 'Seated Cable Row', sets: 3, reps: '8-12', weight: '' },
        { id: 'fb-12', name: 'Hip Thrust', sets: 3, reps: '8-10', weight: '' },
      ] },
    ],
    runTypes: [{ id: 'fb-run-1', day: 'Saturday', name: 'Zone 2 Run', desc: 'Optional aerobic finish', iconKey: 'heart', color: '#71d7c9' }],
  },
  RUNNING_3: {
    title: 'Running 3',
    gymGoals: 'Support your running with simple strength',
    gymDays: [{ id: 1, num: 'Day 1', name: 'Workout 1', sub: 'Simple support day', schedule: 'Wednesday', exercises: [{ id: 'r3-g-1', name: 'Exercise 1', sets: 3, reps: '8-10', weight: '' }] }],
    runTypes: [
      { id: 'r3-1', day: 'Tuesday', name: 'Zone 2 Run', desc: '30-45 min easy aerobic work', iconKey: 'heart', color: '#71d7c9' },
      { id: 'r3-2', day: 'Thursday', name: 'Tempo Intervals', desc: '3 x 8 min threshold effort', iconKey: 'zap', color: '#d6ee63' },
      { id: 'r3-3', day: 'Saturday', name: 'Long Run', desc: '60-90 min endurance session', iconKey: 'flame', color: '#ff6b6b' },
    ],
  },
  RUNNING_4: {
    title: 'Running 4',
    gymGoals: 'Support your running with simple strength',
    gymDays: [{ id: 1, num: 'Day 1', name: 'Workout 1', sub: 'Simple support day', schedule: 'Wednesday', exercises: [{ id: 'r4-g-1', name: 'Exercise 1', sets: 3, reps: '8-10', weight: '' }] }],
    runTypes: [
      { id: 'r4-1', day: 'Monday', name: 'Easy Run', desc: '30-40 min relaxed', iconKey: 'heart', color: '#71d7c9' },
      { id: 'r4-2', day: 'Wednesday', name: '400m Repeats', desc: '6 x 400m speed set', iconKey: 'zap', color: '#d6ee63' },
      { id: 'r4-3', day: 'Friday', name: 'Recovery Run', desc: '25-35 min easy reset', iconKey: 'refresh_cw', color: '#71d7c9' },
      { id: 'r4-4', day: 'Sunday', name: 'Long Run', desc: '70-100 min endurance focus', iconKey: 'flame', color: '#ff6b6b' },
    ],
  },
  HYBRID_3GYM_2RUN: {
    title: 'Hybrid 3 Gym 2 Run',
    gymGoals: 'Build muscle and engine together',
    gymDays: [
      { id: 1, num: 'Day 1', name: 'Gym 1', sub: 'Full Body Strength', schedule: 'Monday', exercises: [
        { id: 'hy-1', name: 'Back Squat', sets: 3, reps: '5-8', weight: '' },
        { id: 'hy-2', name: 'Bench Press', sets: 3, reps: '5-8', weight: '' },
        { id: 'hy-3', name: 'Row', sets: 3, reps: '8-10', weight: '' },
      ] },
      { id: 2, num: 'Day 2', name: 'Gym 2', sub: 'Upper Lower Mixed', schedule: 'Wednesday', exercises: [
        { id: 'hy-4', name: 'Romanian Deadlift', sets: 3, reps: '6-8', weight: '' },
        { id: 'hy-5', name: 'Overhead Press', sets: 3, reps: '6-8', weight: '' },
        { id: 'hy-6', name: 'Pull-Ups', sets: 3, reps: '6-10', weight: '' },
      ] },
      { id: 3, num: 'Day 3', name: 'Gym 3', sub: 'PPL Mixed', schedule: 'Friday', exercises: [
        { id: 'hy-7', name: 'Front Squat', sets: 3, reps: '6-10', weight: '' },
        { id: 'hy-8', name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', weight: '' },
        { id: 'hy-9', name: 'Lat Pulldown', sets: 3, reps: '10-12', weight: '' },
      ] },
    ],
    runTypes: [
      { id: 'hy-run-1', day: 'Tuesday', name: 'Zone 2 Run', desc: '40 min aerobic session', iconKey: 'heart', color: '#71d7c9' },
      { id: 'hy-run-2', day: 'Saturday', name: 'Long Run', desc: '60 min endurance builder', iconKey: 'flame', color: '#ff6b6b' },
    ],
  },
};

function cloneDays(days) {
  return days.map((day, idx) => ({
    ...day,
    id: idx + 1,
    num: `Day ${idx + 1}`,
    exercises: day.exercises.map((exercise, exerciseIdx) => ({
      ...exercise,
      id: `${idx + 1}-${exerciseIdx + 1}`,
      weight: exercise.weight ?? '',
    })),
  }));
}

function cloneRunTypes(runTypes) {
  return runTypes.map((runType, idx) => ({
    ...runType,
    id: `run-type-${idx + 1}`,
  }));
}

export function selectPreset(answers) {
  const scores = {};

  Object.keys(PRESETS).forEach((presetId) => {
    scores[presetId] = 0;
  });

  (RELATIONSHIPS.main_goal[answers.main_goal] || []).forEach((presetId, idx) => {
    scores[presetId] += idx === 0 ? 100 : 70;
  });

  ['training_days', 'experience_level', 'session_duration'].forEach((questionId) => {
    (RELATIONSHIPS[questionId][answers[questionId]] || []).forEach((presetId, idx) => {
      scores[presetId] += idx === 0 ? 18 : 10;
    });
  });

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'FULL_BODY_3';
}

export function buildOnboardingConfig(mode, answers = {}) {
  if (mode === 'manual') {
    return {
      presetLabel: 'Manual Starter',
      config: {
        gym_days: [
          { id: 1, num: 'Day 1', name: 'Workout 1', sub: 'Build your own split', schedule: 'Monday', exercises: [{ id: 'm-1', name: 'Exercise 1', sets: 3, reps: '8-10', weight: '' }] },
          { id: 2, num: 'Day 2', name: 'Workout 2', sub: 'Build your own split', schedule: 'Wednesday', exercises: [{ id: 'm-2', name: 'Exercise 2', sets: 3, reps: '8-10', weight: '' }] },
          { id: 3, num: 'Day 3', name: 'Workout 3', sub: 'Build your own split', schedule: 'Friday', exercises: [{ id: 'm-3', name: 'Exercise 3', sets: 3, reps: '8-10', weight: '' }] },
        ],
        gym_day_count: 3,
        completed: [false, false, false],
        lifts: DEFAULT_LIFTS,
        gym_goals: 'Create your split · Add your exercises · Start simple',
        gym_rules: DEFAULT_GYM_RULES,
        run_week: 0,
        run_completed: {},
        run_weeks: RUN_WEEKS,
        run_types: [{ id: 'm-run-1', day: 'Tuesday', name: 'Run 1', desc: 'Set your own running session', iconKey: 'heart', color: '#71d7c9' }],
        ten_k_target: JSON.stringify([{ id: 'goal-1', distance: '5K', pace: '6:00', selected: true, currentPace: '' }]),
      },
    };
  }

  const presetId = mode === 'favorite' ? 'NURASSYLS_FAVOURITE_5PLUS3' : selectPreset(answers);
  const preset = PRESETS[presetId];

  return {
    presetLabel: preset.title,
    config: {
      gym_days: cloneDays(preset.gymDays),
      gym_day_count: preset.gymDays.length,
      completed: Array(preset.gymDays.length).fill(false),
      lifts: DEFAULT_LIFTS,
      gym_goals: preset.gymGoals,
      gym_rules: DEFAULT_GYM_RULES,
      run_week: 0,
      run_completed: {},
      run_weeks: RUN_WEEKS,
      run_types: cloneRunTypes(preset.runTypes),
      ten_k_target: JSON.stringify([{ id: 'goal-1', distance: '10K', pace: '6:00', selected: true, currentPace: '' }]),
    },
  };
}
