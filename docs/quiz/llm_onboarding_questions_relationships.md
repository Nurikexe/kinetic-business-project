# LLM_ONBOARDING_DECISION_RULES

QUESTION_1/MAIN_GOAL
OPTIONS/muscle_growth,strength,fat_loss,running_endurance,hybrid,general_fitness
RELATIONSHIPS
muscle_growth->PPL_3|UPPER_LOWER_4
strength->UPPER_LOWER_4|FULL_BODY_3
fat_loss->FULL_BODY_3|RUNNING_3
running_endurance->RUNNING_3|RUNNING_4
hybrid->HYBRID_3GYM_2RUN
general_fitness->FULL_BODY_3|RUNNING_3

QUESTION_2/TRAINING_DAYS
OPTIONS/3,4,5+
RELATIONSHIPS
3->PPL_3|FULL_BODY_3|RUNNING_3
4->UPPER_LOWER_4|RUNNING_4
5+->HYBRID_3GYM_2RUN

QUESTION_3/EXPERIENCE_LEVEL
OPTIONS/beginner,intermediate,advanced
RELATIONSHIPS
beginner->FULL_BODY_3|RUNNING_3
intermediate->PPL_3|UPPER_LOWER_4|RUNNING_4
advanced->UPPER_LOWER_4|HYBRID_3GYM_2RUN

QUESTION_4/SESSION_DURATION
OPTIONS/30,45,60,90
RELATIONSHIPS
30->FULL_BODY_3|RUNNING_3
45->PPL_3|RUNNING_4
60->UPPER_LOWER_4|HYBRID_3GYM_2RUN
90->UPPER_LOWER_4|HYBRID_3GYM_2RUN

SELECTION_RULES
1/main_goal_has_highest_priority
2/training_days_filters_possible_splits
3/experience_level_adjusts_default_difficulty
4/session_duration_picks_compact_or_extended_preset
5/return_single_best_default_plan_only
6/user_customizes_after_selection

