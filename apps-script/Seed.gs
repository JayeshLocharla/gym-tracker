/**
 * Seed data — transcribed from gym_and_nutrition_plan.xlsx.
 *
 * Everything here is written to the Sheet once by setupWorkbook(). After that the
 * Sheet is the source of truth: edit it there, not here.
 */

var SEED_CONFIG = [
  ['key', 'value', 'note'],
  ['heightCm', 175, "5'9\""],
  ['weightKg', 79, 'Update every Sunday — the whole plan re-paces off it'],
  ['ageYears', 28, 'Shifts BMR by ~5 kcal per year'],
  ['targetWeightKg', 76, 'At 175cm that is a BMI of 24.8'],
  ['activityMultiplier', 1.5, 'Desk job + 4-5 gym sessions. 1.4 in a light week, 1.55 if also hitting 12k steps'],
  ['dailyDeficit', 450, '~0.5% of bodyweight per week — best muscle retention'],
  ['proteinPerKg', 2.0, 'Meta-analyses land on 1.6-2.2 g/kg; ~2.0 is the sweet spot when dieting'],
  ['fatPerKg', 0.8, 'Floor for hormone function'],
  ['weekdayCalorieTarget', 2000, 'Deliberately under target — this is what funds the weekend'],
  ['startDate', '', 'yyyy-MM-dd, the Monday you start. Blank = set on first app launch'],
  ['totalWeeks', 26, 'Six months. Blocks of 12 with a deload in week 9 of each'],
  ['planVersion', 1, 'Bump this to force the phone to re-download the plan']
];

/** Weekly load as a fraction of baseline. Index 0 = week 1. Week 9 is the deload. */
var RAMP_PCT = [0.60, 0.68, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 0.85, 1.03, 1.06, 1.10];

var SEED_RAMP = [
  ['lift', 'baseline', 'block', 'source'],
  ['Back Squat', 50, 1, 'Your sheet: 15+15 plates + 20kg bar'],
  ['Conventional Deadlift', 80, 1, 'Your sheet: 30+30 + 20kg bar'],
  ['Romanian Deadlift', 70, 1, 'ESTIMATE — ~85% of your deadlift, standard ratio'],
  ['Barbell Bench Press', 65, 1, 'Your sheet: 22.5+22.5 + 20kg bar'],
  ['Standing Overhead Press', 45, 1, 'Your sheet: 12.5+12.5 + 20kg bar'],
  ['Front Squat', 40, 1, 'ESTIMATE — ~80% of back squat'],
  ['Barbell Row', 50, 1, 'ESTIMATE — ~77% of bench, typical for this build'],
  ['Barbell Hip Thrust', 70, 1, 'ESTIMATE — ~88% of deadlift for the 8-12 rep range'],
  ['Lat Pulldown', 45, 1, 'Your sheet: 45+45+45 across the omni-grip sets'],
  ['Seated Cable Row', 45, 1, 'ESTIMATE — matched to your lat pulldown'],
  ['Rope Face Pull', 50, 1, 'Your sheet: 43+50'],
  ['Leg Extension', 45, 1, 'Your sheet: 45kg'],
  ['Seated Leg Curl', 45, 1, 'Your sheet: 45kg'],
  ['Lying Leg Curl', 45, 1, 'ESTIMATE — matched to seated leg curl'],
  ['Standing Calf Raise', 50, 1, 'Your sheet: 15+15 + 20kg bar'],
  ['Seated Calf Raise', 40, 1, 'ESTIMATE — ~80% of standing'],
  ['Machine Shoulder Press', 43, 1, 'Your sheet: 43kg'],
  ['Incline Dumbbell Press', 22.5, 1, 'ESTIMATE, per dumbbell — derived from your 65kg bench'],
  ['Dumbbell Lateral Raise', 12.5, 1, 'Your sheet, per dumbbell: 12.5+12.5'],
  ['Overhead Cable Tricep Ext.', 31.5, 1, 'Your sheet: 31.5kg'],
  ['Cable Crunch', 25, 1, 'ESTIMATE — start light, this one progresses fast'],
  ['Incline Dumbbell Curl', 12.5, 1, 'ESTIMATE, per dumbbell'],
  ['Hammer Curl', 15, 1, 'ESTIMATE, per dumbbell — from your 25kg shrug']
];

var SEED_DAYS = [
  ['code', 'name', 'focus', 'duration', 'muscles'],
  ['A', 'Upper — Push', 'Chest · Shoulders · Triceps · Core', '~80 min', 'Chest, shoulders, triceps lead. Back and biceps get a small share. Hardest pressing of the week — do it when you are freshest.'],
  ['B', 'Lower — Quad', 'Quads · Hamstrings · Calves · Conditioning', '~80 min', 'Squat-led. Finish with 12 min of intervals — legs are already warm and you are not lifting tomorrow.'],
  ['C', 'Upper — Pull', 'Back · Rear delts · Biceps · Core', '~80 min', 'Back and biceps lead. This is the day that fixes desk posture, so do not be the person who skips it for another chest day.'],
  ['D', 'Lower — Posterior', 'Hamstrings · Glutes · Back · Conditioning', '~80 min', 'Deadlift-led. The day that builds the back half of you.'],
  ['E', 'Weak Points', 'Delts · Arms · Core · Conditioning', '~55 min', 'The optional fifth. Mops up side delts, arms and core — skip it in a busy week and you lose nothing structural.']
];

// id, day, order, exercise, alt1, alt2, setsReps, intensity, rest, target, rampKey, note
var SEED_EXERCISES = [
  ['id', 'day', 'order', 'exercise', 'alt1', 'alt2', 'setsReps', 'intensity', 'rest', 'target', 'rampKey', 'note'],

  ['A1', 'A', 1, 'Barbell Bench Press', 'Machine Chest Press', 'Flat Dumbbell Press', '4 x 5-7', 'RPE 8', '2-3 min', 'Chest, triceps', 'Barbell Bench Press', 'Your main pressing lift. Bar to mid-chest, elbows ~45 degrees, feet planted. Add weight only when all 4 sets hit the top of the range.'],
  ['A2', 'A', 2, 'Standing Overhead Press', 'Machine Shoulder Press', 'Seated Dumbbell Press', '3 x 6-8', 'RPE 8', '2-3 min', 'Front delts, triceps', 'Standing Overhead Press', 'Squeeze glutes and brace so it does not turn into a standing incline press. Bar path just past the nose.'],
  ['A3', 'A', 3, 'Incline Dumbbell Press', 'Incline Machine Press', 'Deficit Push-up (hands on books)', '3 x 8-10', 'RPE 9', '90 sec', 'Upper chest', 'Incline Dumbbell Press', '30-45 degree bench. This is the angle that fills out the top of the chest — the bit that reads as "in shape" in a t-shirt.'],
  ['A4', 'A', 4, 'Dumbbell Lateral Raise', 'Cable Lateral Raise', 'Egyptian Lateral Raise', '3 x 12-15', 'RPE 9-10', '60 sec', 'Side delts', 'Dumbbell Lateral Raise', 'Light, slow, no swinging. Last set: myo-reps — go to failure, rest 15 sec, 3-4 more reps, repeat twice. Side delts are the single best return on effort for looking leaner than you are.'],
  ['A5', 'A', 5, 'Overhead Cable Tricep Ext.', 'EZ-Bar Skull Crusher', 'Overhead Dumbbell Extension', '3 x 10-12', 'RPE 9', '75 sec', 'Triceps (long head)', 'Overhead Cable Tricep Ext.', 'Overhead beats pushdowns for the long head — that is the mass of the arm. Keep elbows in and still.'],
  ['A6', 'A', 6, 'Dips', 'Assisted Dip Machine', 'Bench Dips', '2 x AMRAP', 'RPE 9', '90 sec', 'Chest, triceps', '', 'Stop 1-2 reps short of total failure. Slight forward lean for chest, upright for triceps.'],
  ['A7', 'A', 7, 'Hanging Leg Raise', "Captain's Chair Knee Raise", 'Lying Leg Raise', '3 x 10-15', 'RPE 9', '60 sec', 'Lower abs, hip flexors', '', 'Curl the pelvis up at the top rather than just swinging the legs — that is the difference between hip flexor work and abs.'],
  ['AF', 'A', 8, '10 min Zone 2 — bike, incline walk or rower', 'Brisk outdoor walk', '10 min easy skipping', '10 min', 'Conversational', '—', 'Aerobic base', '', 'Easy enough that you could hold a conversation. This is recovery work, not a second workout.'],

  ['B1', 'B', 1, 'Back Squat', 'Hack Squat', 'Goblet Squat', '4 x 5-7', 'RPE 8', '3 min', 'Quads, glutes', 'Back Squat', 'Rebuild the pattern before you rebuild the load. Depth first, weight second — the ramp starts you deliberately light for this reason.'],
  ['B2', 'B', 2, 'Romanian Deadlift', '45-degree Back Extension', 'Dumbbell RDL', '3 x 8-10', 'RPE 8', '2 min', 'Hamstrings, glutes', 'Romanian Deadlift', 'Hinge, do not squat. Bar stays against the legs, chest proud, stretch felt in the hamstring not the lower back.'],
  ['B3', 'B', 3, 'Bulgarian Split Squat', 'Smith Machine Split Squat', 'Walking Lunge', '3 x 8-10 each', 'RPE 8-9', '90 sec', 'Quads, glutes, balance', '', 'Brutal, and the best single fix for the hip stiffness a desk job builds.'],
  ['B4', 'B', 4, 'Leg Extension', 'Sissy Squat', 'Reverse Nordic', '3 x 12-15', 'RPE 9-10', '60 sec', 'Quads (rectus femoris)', 'Leg Extension', 'Pause a beat at the top. Only quad exercise that loads the rectus femoris in a lengthened-but-shortened position.'],
  ['B5', 'B', 5, 'Seated Leg Curl', 'Lying Leg Curl', 'Nordic Ham Curl', '3 x 10-12', 'RPE 9', '75 sec', 'Hamstrings', 'Seated Leg Curl', 'Seated beats lying here — hamstrings grow better trained at longer muscle lengths.'],
  ['B6', 'B', 6, 'Standing Calf Raise', 'Leg Press Calf Raise', 'Single-Leg Calf Raise', '4 x 10-15', 'RPE 9-10', '60 sec', 'Calves', 'Standing Calf Raise', 'Full stretch at the bottom, two-second pause. Calves need the stretch far more than they need the weight.'],
  ['B7', 'B', 7, 'Long-Lever Plank', 'Ab Wheel Rollout', 'Standard Plank', '3 x 30-45 sec', 'RPE 9', '45 sec', 'Deep core, anti-extension', '', 'Arms further forward than a normal plank. Brace like you are about to take a punch.'],
  ['BF', 'B', 8, 'Intervals: 6 x (30 sec hard / 90 sec easy)', 'Rower or assault bike', 'Hill sprints outdoors', '12 min', 'Hard / easy', '—', 'VO2 max, stamina', '', 'This is your stamina lever. Two sessions a week of 4x4-style intervals reliably moves VO2max in recreational trainees. Legs are already cooked, so this costs you nothing on the lifting.'],

  ['C1', 'C', 1, 'Pull-Up (weighted when easy)', 'Lat Pulldown', 'Assisted / Band Pull-Up', '4 x 5-8', 'RPE 8', '2-3 min', 'Lats, biceps', '', 'Get back to bodyweight sets of 8 clean first, then start adding a belt.'],
  ['C2', 'C', 2, 'Barbell Row', 'Chest-Supported Row', 'Single-Arm Dumbbell Row', '3 x 8-10', 'RPE 8', '2 min', 'Mid-back, lats', 'Barbell Row', 'If your lower back is the limiting factor, take the chest-supported version — no shame, and it isolates the target better anyway.'],
  ['C3', 'C', 3, 'Seated Cable Row', 'Machine Row', 'Inverted Row (bar or rings)', '3 x 10-12', 'RPE 9', '90 sec', 'Mid-back, rhomboids', 'Seated Cable Row', 'Pull to the navel, elbows tight. Squeeze for a full second. This is the anti-desk-posture exercise.'],
  ['C4', 'C', 4, 'Rope Face Pull', 'Reverse Pec Deck', 'Band Pull-Apart', '3 x 15-20', 'RPE 8', '60 sec', 'Rear delts, rotator cuff', 'Rope Face Pull', 'Do these religiously. They are the reason your shoulders keep working while you press twice a week, and they undo eight hours of hunching.'],
  ['C5', 'C', 5, 'Incline Dumbbell Curl', 'Cable Curl', 'Standing Dumbbell Curl', '3 x 10-12', 'RPE 9', '75 sec', 'Biceps (long head)', 'Incline Dumbbell Curl', 'Incline puts the long head on stretch, which is where most of the growth stimulus lives.'],
  ['C6', 'C', 6, 'Hammer Curl', 'Rope Hammer Curl', 'Reverse Curl', '2 x 12-15', 'RPE 9-10', '60 sec', 'Brachialis, forearm', 'Hammer Curl', 'Brachialis sits under the bicep and pushes it up. This is what makes an arm look thick from the side.'],
  ['C7', 'C', 7, 'Cable Crunch', 'Decline Crunch', 'Weighted Crunch', '3 x 12-15', 'RPE 9', '60 sec', 'Upper abs', 'Cable Crunch', 'Load them — abs are muscle and respond to progressive overload like anything else.'],
  ['CF', 'C', 8, '10 min Zone 2 — bike or incline walk', 'Brisk outdoor walk', '10 min easy row', '10 min', 'Conversational', '—', 'Aerobic base', '', 'Same as Day A. Keep it genuinely easy.'],

  ['D1', 'D', 1, 'Conventional Deadlift', 'Trap-Bar Deadlift', 'Heavy Dumbbell RDL', '3 x 4-6', 'RPE 8', '3 min', 'Full posterior chain', 'Conventional Deadlift', 'Sets of 4-6, never grinding. If form breaks on rep 5, the set ended at rep 4.'],
  ['D2', 'D', 2, 'Barbell Hip Thrust', 'Glute Bridge Machine', 'Single-Leg Hip Thrust', '3 x 8-12', 'RPE 8-9', '2 min', 'Glutes', 'Barbell Hip Thrust', 'Weak glutes from sitting all day are the most common cause of a cranky lower back. Chin tucked, ribs down, pause at the top.'],
  ['D3', 'D', 3, 'Front Squat', 'Hack Squat', 'Goblet Squat', '3 x 8-10', 'RPE 8', '2 min', 'Quads, upper back', 'Front Squat', 'Front squat also forces the thoracic spine upright, which is a desk-job bonus.'],
  ['D4', 'D', 4, 'Lying Leg Curl', 'Seated Leg Curl', 'Slider / Towel Leg Curl', '3 x 10-12', 'RPE 9', '75 sec', 'Hamstrings', 'Lying Leg Curl', "Different hip angle from Day B's seated version — that is deliberate, it hits the hamstring differently."],
  ['D5', 'D', 5, 'Prisoner Back Extension', '45-degree Back Extension', 'Bird Dog / Superman', '3 x 12-15', 'RPE 8', '60 sec', 'Spinal erectors, glutes', '', 'Hands behind the head, round up one vertebra at a time. Builds the lower back that sitting slowly dismantles.'],
  ['D6', 'D', 6, 'Seated Calf Raise', 'Standing Calf Raise', 'Single-Leg Calf Raise', '4 x 12-15', 'RPE 9-10', '60 sec', 'Soleus', 'Seated Calf Raise', 'Seated hits the soleus, standing hits the gastroc. You want both across the week.'],
  ['D7', 'D', 7, 'Ab Wheel Rollout', 'Cable Crunch', 'Hanging Knee Raise', '3 x 8-12', 'RPE 9', '60 sec', 'Full core, anti-extension', '', 'Best abs exercise there is. Go only as far as you can without the lower back arching, then extend the range over the weeks.'],
  ['DF', 'D', 8, '15 min Zone 2 incline walk', 'Stair machine', 'Outdoor walk with a slope', '15 min', 'Conversational', '—', 'Fat oxidation', '', 'Longer and easier than the other days. Slot a podcast in — this is the least demanding thing in the week.'],

  ['E1', 'E', 1, 'Incline Dumbbell Press', 'Incline Machine Press', 'Incline Push-up', '3 x 10-12', 'RPE 9', '90 sec', 'Upper chest', 'Incline Dumbbell Press', 'Third weekly exposure for the upper chest. Lighter than Day A — this is volume, not a max effort.'],
  ['E2', 'E', 2, 'Omni-Grip Lat Pulldown', 'Lat Pulldown, one grip', 'Band Pulldown', '3 x 10-12', 'RPE 9', '90 sec', 'Lats, biceps', 'Lat Pulldown', 'Set 1 wide, set 2 close, set 3 supinated. Three grips, three slightly different fibre lines.'],
  ['E3', 'E', 3, 'Cable Lateral Raise', 'Dumbbell Lateral Raise', 'Egyptian Lateral Raise', '3 x 15-20', 'RPE 10', '45 sec', 'Side delts', '', 'Cables keep tension at the bottom where dumbbells lose it. Take the last set to genuine failure.'],
  ['E4', 'E', 4, 'Reverse Pec Deck', 'Rope Face Pull', 'Bent-Over Rear Delt Fly', '3 x 15-20', 'RPE 9', '45 sec', 'Rear delts', '', 'Second rear-delt hit of the week. Shoulder health and the illusion of width both live here.'],
  ['E5', 'E', 5, 'Superset: Cable Curl + Rope Pushdown', 'EZ Curl + Skull Crusher', 'DB Curl + Bench Dip', '3 x 12 each', 'RPE 9', '60 sec', 'Biceps, triceps', '', 'Back to back with no rest between the pair. Pure arm volume, and it takes seven minutes.'],
  ['E6', 'E', 6, 'Core circuit x 3 rounds', '—', '—', '3 rounds', 'RPE 9', '60 sec', 'Full core', '', 'One round = 12 hanging knee raises + 15 cable crunches + 30 sec side plank each side. Rest only after the full round.'],
  ['EF', 'E', 8, '20 min intervals or easy Zone 2', 'Bike / rower', 'Outdoor run', '20 min', 'Your call', '—', 'Stamina', '', 'If Friday was pickleball or football, skip this entirely — the sport already did the job.']
];

// Macros per unit. Ranked list from the Nutrients tab, plus the staples the example day uses.
// These are reference values — correct any of them in the Sheet and the app follows.
var SEED_FOODS = [
  ['name', 'unit', 'kcal', 'protein', 'carbs', 'fat', 'fibre', 'tag'],
  ['Shrimp / prawns', '100g', 99, 24, 0.2, 0.3, 0, 'protein'],
  ['White fish (cod, tilapia)', '100g', 105, 23, 0, 1.2, 0, 'protein'],
  ['Chicken breast', '100g', 165, 31, 0, 3.6, 0, 'protein'],
  ['Egg whites', '100g', 52, 11, 0.7, 0.2, 0, 'protein'],
  ['Whole egg', '1 egg', 72, 6.3, 0.4, 4.8, 0, 'protein'],
  ['Greek yoghurt (0%)', '100g', 59, 10, 3.6, 0.4, 0, 'protein'],
  ['Cottage cheese', '100g', 98, 11, 3.4, 4.3, 0, 'protein'],
  ['Tuna (in water)', '100g', 116, 25, 0, 0.8, 0, 'protein'],
  ['Salmon', '100g', 208, 25, 0, 12, 0, 'protein'],
  ['Lean beef (sirloin)', '100g', 206, 27, 0, 10, 0, 'protein'],
  ['Whey protein', '1 scoop', 120, 24, 3, 1.5, 0, 'protein'],
  ['Lentils (cooked)', '100g', 116, 9, 20, 0.4, 8, 'protein'],
  ['Tofu (firm)', '100g', 144, 17, 3, 8, 2, 'protein'],
  ['Paneer', '100g', 265, 18, 3.4, 20, 0, 'protein'],
  ['Chia seeds', '30g', 138, 5, 12, 9, 10, 'fibre'],
  ['Oats (dry)', '50g', 190, 6.6, 33, 3.4, 5, 'carb'],
  ['Wholegrain bread', '1 slice', 92, 4, 15, 1.2, 2.2, 'carb'],
  ['White rice (cooked)', '100g', 130, 2.7, 28, 0.3, 0.4, 'carb'],
  ['Sweet potato (cooked)', '100g', 90, 2, 21, 0.1, 3.3, 'carb'],
  ['Roti', '1 roti', 120, 3.5, 22, 2.5, 2.5, 'carb'],
  ['Banana', '1 medium', 105, 1.3, 27, 0.4, 3.1, 'carb'],
  ['Blueberries', '100g', 57, 0.7, 14, 0.3, 2.4, 'fibre'],
  ['Broccoli (cooked)', '100g', 35, 2.4, 7, 0.4, 3.3, 'fibre'],
  ['Almonds', '30g', 174, 6.4, 6.1, 15, 3.8, 'fat'],
  ['Olive oil', '1 tbsp', 119, 0, 0, 13.5, 0, 'fat'],
  ['Milk (semi-skimmed)', '250ml', 125, 8.5, 12, 4.3, 0, 'protein']
];

var SEED_SPLIT = [
  ['day', 'session', 'focus', 'time', 'priority', 'notes'],
  ['Monday', 'Day A', 'Upper — push emphasis', '80-85 min', 'Non-negotiable', 'Chest, shoulders, triceps lead. Back and biceps get a small share. Hardest pressing of the week — do it when you are freshest.'],
  ['Tuesday', 'Day B', 'Lower — quad emphasis', '80-85 min', 'Non-negotiable', 'Squat-led. Finish with 12 min of intervals — legs are already warm and you are not lifting tomorrow.'],
  ['Wednesday', 'Rest', 'Walk / mobility', '20-30 min', 'Easy', 'Not a gym day. Walk 8,000+ steps, ten minutes of hips and thoracic spine. Sitting at a desk five days a week is the thing this is countering.'],
  ['Thursday', 'Day C', 'Upper — pull emphasis', '80-85 min', 'Non-negotiable', 'Back and biceps lead. This is the day that fixes desk posture, so do not be the person who skips it for another chest day.'],
  ['Friday', 'Day D or Sport', 'Lower — posterior chain', '80-85 min', 'Flexible', 'If you are playing pickleball or football, play. The sport covers your conditioning for the day and Day D moves to Saturday. If you are not playing, lift.'],
  ['Saturday', 'Day D or Day E', "Whatever Friday didn't cover", '60-85 min', 'Flexible', 'Friday lifted → do Day E here. Friday played sport → do Day D here. Friday did nothing → do Day D here and Day E becomes optional.'],
  ['Sunday', 'Rest', 'Full rest', '—', 'Protected', 'Meal prep, weigh in, fill the check-in. Genuinely rest — recovery is when the adaptation happens, not the training.']
];

var SEED_VOLUME = [
  ['muscle', 'setsPerWeek', 'researchRange', 'verdict'],
  ['Chest', 11, '10-20', 'In range'],
  ['Back / lats', 13, '10-20', 'In range'],
  ['Side delts', 9, '8-16', 'In range — Day E adds 3 more'],
  ['Rear delts', 6, '6-12', 'Adequate, posture-driven'],
  ['Biceps', 8, '6-14', 'In range'],
  ['Triceps', 9, '6-14', 'In range'],
  ['Quads', 12, '10-20', 'In range'],
  ['Hamstrings / glutes', 11, '10-20', 'In range'],
  ['Calves', 8, '6-16', 'In range'],
  ['Core / abs', 11, '8-16', 'Trained 4x/wk, direct and heavy']
];

var SEED_NUTRIENTS = [
  ['nutrient', 'target', 'sources', 'why'],
  ['Omega-3 (EPA + DHA)', '1,000-2,000 mg', 'Salmon (~2,000mg per 100g), mackerel, sardines, shrimp (~300mg per 100g, plus astaxanthin and 20g protein at 100 kcal). Two oily-fish meals a week does it.', 'Anti-inflammatory, supports recovery between sessions, and there is reasonable evidence for mood and cognition. Most guidelines set a floor of 250-500mg; 1-2g is the range used in the training and inflammation literature.'],
  ['Omega-3 (ALA, plant)', '1,600 mg', 'Chia seeds (~5,000mg per 30g), flaxseed, walnuts. 30g of chia in yoghurt or oats covers it several times over.', 'Conversion of ALA to EPA/DHA in humans is poor — under 10%. So chia is worth eating for its fibre and minerals, but it does not replace the fish. Eat both.'],
  ['Fibre', '30 g', 'Oats, beans, lentils, chia (10g per 30g), berries, broccoli, whole fruit rather than juice.', 'Fibre slows gastric emptying, which flattens the blood-sugar swings that drive stress snacking. It is also the cheapest satiety you can buy in a deficit.'],
  ['Vitamin D3', '1,000-2,000 IU', 'Sunlight, oily fish, egg yolks, fortified milk. Realistically a supplement if you are indoors 9-to-5.', 'Deficiency is close to universal in desk workers. Affects bone density, immune function, muscle function and mood. Worth a blood test rather than guessing.'],
  ['Magnesium', '400-420 mg', 'Pumpkin seeds, almonds, spinach, dark chocolate, black beans.', 'Involved in muscle contraction and sleep quality. Training hard and sleeping badly both drain it. Glycinate form if you supplement — better absorbed, easier on the gut.'],
  ['Creatine monohydrate', '3-5 g', 'Red meat and fish contain small amounts. Practically, this is one you supplement.', 'The most studied and most reliably effective legal supplement there is. Helps you hold strength while cutting, which is exactly the fight you are in. No loading phase, monohydrate only, timing irrelevant.'],
  ['Zinc', '11 mg', 'Oysters, beef, pumpkin seeds, chickpeas, cashews.', 'Immune function and testosterone production. Depletes through sweat, so training frequency matters here.'],
  ['Iron', '8 mg', 'Red meat, lentils, spinach, fortified cereal. Pair plant sources with vitamin C to absorb them.', 'Oxygen transport — directly tied to the stamina goal. Low iron shows up as fatigue and breathlessness on the intervals long before any blood test flags it.'],
  ['Potassium', '3,400 mg', 'Bananas, potatoes, spinach, beans, yoghurt.', 'Balances sodium and regulates blood pressure. Most people eat far too little relative to salt.'],
  ['Calcium', '1,000 mg', 'Dairy, fortified plant milk, sardines with bones, leafy greens.', 'Bone density, and actively protective when you are lifting heavy twice a week on lower body.'],
  ['Vitamin B12', '2.4 mcg', 'Meat, fish, eggs, dairy. Fortified foods if you eat little animal protein.', 'Red blood cell formation and nerve function. Easy to hit on your diet — flagged mainly so you notice if you cut meat.'],
  ['Sodium', 'under 2,300 mg', 'Not something to add. The issue is packaged food, restaurant meals and the weekend takeaway.', 'The one to keep down rather than up. High sodium also causes water retention that makes the scale jump 1-2kg after a weekend — which is water, not fat, and gone by Wednesday.']
];

var SEED_MILESTONES = [
  ['phase', 'weeks', 'weekFrom', 'weekTo', 'target', 'whatYouSee', 'trap'],
  ['RE-ENTRY', 'Weeks 1-2', 1, 2, 'Show up 4x. Weights at 60-68% of your old bests. Protein above 150g on 10 of 14 days.', 'Nothing visible. You will be sore for the first four sessions and that is it. Weight may not move at all — new training causes muscle water retention that masks early fat loss.', 'Going too heavy because 60% feels insulting. This is the phase where people tweak a lower back on deadlifts and lose six weeks. The ramp is deliberately conservative — respect it.'],
  ['GROOVE', 'Weeks 3-4', 3, 4, 'Weights at 75-80%. Waist down 1-2cm. Weight down 1.0-1.5kg. Intervals stop feeling awful.', 'Clothes fit differently before the mirror shows anything. Recovery between sets noticeably better. This is where the scale finally starts moving in a straight line.', 'The first weekend that goes badly. It will happen. One bad weekend costs about 3 days of progress; quitting because of it costs everything.'],
  ['BUILD', 'Weeks 5-8', 5, 8, 'Weights at 85-100% — you meet your old numbers here. Weight down 2.5-3.5kg total. Waist down 3-4cm.', 'Visible change in the mirror, especially shoulders and upper chest. Upper abs starting to show in good light. You hit your college bench and squat somewhere in this window.', 'Getting greedy with the deficit because it is working. Cutting harder from here costs you strength and muscle, and the strength is what makes the leanness look like anything.'],
  ['DELOAD', 'Week 9', 9, 9, 'Drop to 85% of your loads for one week. Keep calories and protein exactly the same.', 'You will feel like you are wasting a week. You are not — accumulated fatigue is why weeks 10-12 will feel strong.', 'Skipping it. The deload is the least negotiable week in the whole plan and the one most people bin.'],
  ['PUSH', 'Weeks 10-12', 10, 12, 'New personal bests — 103-110% of your old numbers. Weight at or near 76kg. Waist down 5-6cm from the start.', 'Upper abs clearly visible standing relaxed. Noticeably better on the pickleball court — that is the stamina goal arriving. Strength past where you were in college.', 'Treating week 12 as the finish line. It is the end of the first block, not the end.'],
  ['THE ABS PART', 'Months 4-6', 13, 26, 'Body fat into the 12-14% range. Full six-pack visible relaxed, not just flexed after a shower.', 'This is where the lower abs finally appear. They are last for almost every man — lower abdominal fat is the most stubborn store there is, and no amount of crunches changes the order.', 'Expecting it sooner. Going from roughly 20% to 12-13% body fat takes 10-18 weeks at a safe rate even done perfectly. The plan gets you there; the calendar is the calendar.']
];

var SEED_WARNINGS = [
  ['ifYouSkip', 'whatHappens', 'whichGoalItKills', 'slack'],
  ['Protein below ~150g/day', 'Your body covers the shortfall by breaking down muscle. You lose weight, but a big share of it is lean tissue. You end up lighter, softer and weaker at the same weight.', 'Abs. Muscle definition. All of it.', 'Almost none. This is the single least negotiable number. Two low days a week is survivable; five is not.'],
  ['Fewer than 4 gym sessions/week', 'A muscle drops to once-weekly frequency, which the research shows is meaningfully worse than twice-weekly at the same volume. Strength regain stalls, and without the strength stimulus the deficit takes muscle instead of fat.', 'Target all muscles. Abs. Getting your old numbers back.', 'One week at 3 sessions is fine. Two consecutive weeks and the ramp needs resetting a week or two back.'],
  ['Calories over budget', 'No deficit, no fat loss. The training still builds muscle underneath, so you get stronger and more muscular — while the layer over your abs stays exactly where it is.', 'Belly fat. Abs.', 'The weekend bank exists precisely so this has built-in slack. Roughly 500 spare calories per weekend day. Spend it, do not triple it.'],
  ['No cardio or sport', 'Stamina does not improve. Lifting builds strength, not aerobic capacity — the two adaptations are largely separate systems.', 'Improve stamina.', 'Loads. Pickleball and football count fully. Two sessions a week is enough.'],
  ['Sleeping under 6.5 hours', 'Cortisol up, recovery down, appetite up the following day. Short sleep also shifts the composition of weight lost toward muscle rather than fat, even with everything else identical.', 'Everything, quietly. This is the one that makes all the other numbers harder to hit.', 'The occasional bad night is nothing. A run of them means the plan needs to get easier, not that you need more willpower.'],
  ['Ignoring the deload week', 'Fatigue accumulates under a deficit faster than you notice. It surfaces as a stalled lift, a bad shoulder, or a fortnight of not wanting to go — usually right when the plan is meant to pay off.', 'The final weeks of the block. Momentum.', 'None worth taking. It is one week out of twelve.'],
  ['Doing more abs work to speed it up', 'You build a thicker, stronger rectus abdominis under an unchanged layer of fat. Spot reduction is not physiologically possible — fat comes off systemically, in an order set by your genetics.', 'Nothing directly. It just wastes gym time you could spend on the things that work.', 'Do the core work in the plan and stop there. Nutrition is where abs are made.'],
  ['Weighing yourself daily and reacting', 'Daily weight swings 1-2kg on water, salt, carbs and gut contents. React to those swings and you will cut calories on a week you were actually fine, then binge on the rebound.', 'Adherence — and adherence is the one that decides all four goals.', 'Weigh daily if you find it useful. Just only ever act on the 7-day average.']
];

var SEED_GUIDE = [
  ['section', 'title', 'body'],
  ['principles', 'Your old split was fine. Your old volume was the problem.', 'Back+tricep / chest+bicep / shoulder+crunches hits each muscle roughly once a week. A 2016 Schoenfeld meta-analysis and everything since points the same way: at matched volume, twice-weekly beats once-weekly for both size and strength. The plan here hits everything 2x/week in four sessions. Nothing exotic — just better spacing.'],
  ['principles', 'You cannot choose where fat comes off.', 'Spot reduction is not a thing. Crunches build the muscle underneath; they do not thin the layer on top. Belly fat goes when total body fat goes, and the order it leaves in is genetic. The abs you want are made almost entirely in the nutrition numbers. Training just makes sure there is something to see when the fat clears.'],
  ['principles', 'Your old weights are a week 7-9 target, not a week 3 target.', 'Three weeks off costs a trained lifter very little — the research on short layoffs shows trivial strength loss at three weeks. But you were not running that college program up until three weeks ago; you were running a lighter one for a long stretch before that. Expect to be back at your old bench and squat around week 7-9, and you will get there faster than a beginner would because myonuclei from that earlier training stay put.'],
  ['principles', 'You are not going to get bulky. That is not the risk here.', 'You are eating in a deficit at 79kg heading to 76kg. Building noticeable size in a deficit at your training age essentially does not happen. Lifting heavy while cutting is what stops you losing muscle — without it, 25-40% of what you lose comes off as lean mass. The heavy work protects the physique you are after.'],
  ['split', 'Why Upper/Lower and not PPL', 'PPL divides into three. Your week divides into four or five. Run PPL across four days and the rotation drifts: some weeks a muscle gets trained twice, some weeks once, and you can never quite plan Friday. Upper/Lower divides into four cleanly, so every muscle is trained exactly twice every week, and the fifth day becomes a genuine bonus rather than a thing the program depends on.\n\nA 2024 meta-analysis of 14 studies found no hypertrophy difference between split types once volume was equalised. So the deciding factor is which structure you will actually complete — and on that, one 12-month dataset comparing matched lifters found a 3-4% strength difference between PPL and Upper/Lower but a 31% difference in adherence.'],
  ['split', 'Never skip two of A-D in the same week', 'That is the point where a muscle drops to once-weekly frequency and the whole rationale for the split evaporates. Day E is a bonus that mops up side delts, arms and core — skip it in a busy week and you lose nothing structural.'],
  ['nutrition', 'The weekend bank', 'You said you cannot cut junk and sweets completely, and that it happens at the weekend. Good — so do not try. Fat loss responds to the weekly calorie total, not the daily one. Eat at the weekday target and the shortfall banks up. By Saturday there is a real allowance sitting there. Not "a small square of dark chocolate". An actual dessert, or a takeaway, eaten without any of the guilt spiral that makes the next week worse.\n\nTwo rules keep this honest. First: protein does not get a day off. Hit the protein target on Saturday and Sunday too — that is what stops the weekend costing you muscle rather than just calories. Second: if the weekend regularly overshoots, do not punish Monday with a crash day. Lower the weekday target by 100 and let the bank grow bigger instead.'],
  ['nutrition', 'The scale is a poor judge of what you are asking for', 'You want a flatter stomach, visible abs and no extra bulk. If you drop 3kg of fat while holding your muscle, you will be leaner at 76kg than you would guess. But if training goes well and you regain a kilo of the muscle you had in college, the scale might read 77 while your waist is 4cm smaller and the abs are more visible. That would be a better outcome, and the scale would call it a failure. Track the waist alongside the weight — where those two disagree, the waist is telling the truth.'],
  ['progress', 'How to progress once the ramp runs out', 'Double progression: hit the top of the rep range on every set, then add 2.5kg (upper body) or 5kg (lower body) and drop back to the bottom of the range. Repeat. That is the whole method.\n\nRPE 8 means two clean reps left in the tank. Training to failure on every set in a calorie deficit buys you fatigue, not muscle. Save failure for the isolation work — laterals, curls, leg extensions.\n\nIf a week goes badly: two bad sessions in a row on the same lift means you repeat the week rather than pushing. In a deficit, on 6 hours of sleep, under work stress, the ramp will occasionally need to wait. That is the system working, not failing.'],
  ['progress', 'The one thing that matters most', 'None of the warnings is the real risk. The real risk is that this is followed at 100% for eleven days and then abandoned after one bad weekend.\n\nThe data on this is fairly stark — one 12-month comparison of matched lifters found the difference between two training splits was 3-4% on strength, and the difference in adherence was 31%. Program design is a rounding error next to whether you keep turning up. A mediocre plan followed for six months beats a perfect one followed for three weeks, every time.\n\nSo when a week goes badly — and one will — the correct response is to log it, read the warning, and do Monday’s session. Not to restart, not to compensate with a crash week, and not to decide you need a better plan. You have a good enough plan. What you need is week fourteen.'],
  ['stress', 'On the stress eating', 'You described the eating as stress-driven and tied to overthinking. Protein and a gym routine genuinely help — high-protein meals blunt appetite, and training is one of the better stress regulators going. But they treat the symptom. If the overthinking is heavy enough that it is running your eating, that part is worth its own attention, separate from anything in this app.']
];
