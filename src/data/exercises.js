export const EXERCISES = {
  chest:      ['Bench Press','Incline Bench Press','Incline Dumbbell Press','Decline Bench Press','Dumbbell Fly','Cable Fly','Pec Deck','Push-Up','Dips'],
  back:       ['Pull-Up','Chin-Up','Lat Pulldown','Barbell Row','Dumbbell Row','T-Bar Row','Seated Cable Row','Deadlift','Straight-Arm Pulldown'],
  shoulders:  ['Overhead Press','Dumbbell Shoulder Press','Arnold Press','Lateral Raise','Front Raise','Rear Delt Fly','Face Pull','Upright Row'],
  biceps:     ['Barbell Curl','EZ-Bar Curl','Dumbbell Curl','Hammer Curl','Incline Dumbbell Curl','Preacher Curl','Cable Curl'],
  triceps:    ['Close-Grip Bench Press','Cable Pushdown','Rope Pushdown','Skull Crusher','Overhead Dumbbell Extension','Overhead Cable Extension','Dips'],
  quads:      ['Back Squat','Front Squat','Leg Press','Leg Extension','Bulgarian Split Squat','Lunges','Hack Squat'],
  hamstrings: ['Romanian Deadlift','Leg Curl','Seated Leg Curl','Good Morning','Nordic Curl'],
  glutes:     ['Hip Thrust','Glute Bridge','Cable Kickback','Bulgarian Split Squat','Step-Up','Sumo Deadlift'],
  calves:     ['Standing Calf Raise','Seated Calf Raise','Leg Press Calf Raise','Single-Leg Calf Raise','Donkey Calf Raise'],
  abs:        ['Plank','Hanging Leg Raise','Cable Crunch','Ab Wheel Rollout','Russian Twist','Reverse Crunch','Dead Bug'],
  forearms:   ['Wrist Curl','Reverse Wrist Curl','Farmer Carry','Plate Pinch Hold','Hammer Curl'],
};

export const MUSCLE_GROUPS = Object.keys(EXERCISES).map(k => ({
  key: k,
  label: k.charAt(0).toUpperCase() + k.slice(1),
}));
