/**
 * Run setupWorkbook() ONCE from the Apps Script editor.
 *
 * It creates every tab and fills the reference ones from the workbook. It will not
 * touch a tab that already exists, so re-running it after you have started logging
 * is safe — it just fills in anything missing.
 */
function setupWorkbook() {
  var log = [];

  seedTab_(TAB.config, SEED_CONFIG, log);
  seedTab_(TAB.ramp, SEED_RAMP, log);
  seedTab_(TAB.days, SEED_DAYS, log);
  seedTab_(TAB.exercises, SEED_EXERCISES, log);
  seedTab_(TAB.foods, SEED_FOODS, log);
  seedTab_(TAB.split, SEED_SPLIT, log);
  seedTab_(TAB.volume, SEED_VOLUME, log);
  seedTab_(TAB.nutrients, SEED_NUTRIENTS, log);
  seedTab_(TAB.milestones, SEED_MILESTONES, log);
  seedTab_(TAB.warnings, SEED_WARNINGS, log);
  seedTab_(TAB.guide, SEED_GUIDE, log);

  seedTab_(TAB.sessionLog, [['id', 'date', 'dayCode', 'exerciseId', 'variant', 'done', 'weight', 'ts']], log);
  seedTab_(TAB.nutritionLog, [['id', 'date', 'name', 'qty', 'unit', 'kcal', 'protein', 'carbs', 'fat', 'fibre', 'ts']], log);
  seedTab_(TAB.weeklyLog, [['week', 'weekStart', 'weight', 'waist', 'gymDays', 'cardio', 'avgKcal', 'avgProtein', 'avgSteps', 'sleep', 'note', 'ts']], log);

  // Drop the default empty sheet if it is still hanging around.
  var def = book_().getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && book_().getSheets().length > 1) {
    book_().deleteSheet(def);
    log.push('removed empty Sheet1');
  }

  var token = PropertiesService.getScriptProperties().getProperty('APP_TOKEN');
  if (!token) {
    token = generateToken();
    log.push('generated APP_TOKEN');
  }

  var msg = log.join('\n') + '\n\nAPP_TOKEN: ' + token +
    '\n\nNext: Deploy > New deployment > Web app (Execute as: Me, Access: Anyone),' +
    '\nthen paste the deployment URL and the token above into the app.';
  Logger.log(msg);
  return msg;
}

function seedTab_(name, rows, log) {
  var ss = book_();
  var sh = ss.getSheetByName(name);
  if (sh) {
    if (sh.getLastRow() > 0) {
      log.push(name + ': already exists, left alone');
      return sh;
    }
  } else {
    sh = ss.insertSheet(name);
  }
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#F0EDE8');
  sh.autoResizeColumns(1, Math.min(rows[0].length, 8));
  log.push(name + ': seeded ' + (rows.length - 1) + ' rows');
  return sh;
}

/**
 * Destructive. Deletes all three log tabs and recreates them empty.
 * Only useful if you want to start the six months over.
 */
function resetLogs() {
  var names = [TAB.sessionLog, TAB.nutritionLog, TAB.weeklyLog];
  for (var i = 0; i < names.length; i++) {
    var sh = book_().getSheetByName(names[i]);
    if (sh) book_().deleteSheet(sh);
  }
  var log = [];
  seedTab_(TAB.sessionLog, [['id', 'date', 'dayCode', 'exerciseId', 'variant', 'done', 'weight', 'ts']], log);
  seedTab_(TAB.nutritionLog, [['id', 'date', 'name', 'qty', 'unit', 'kcal', 'protein', 'carbs', 'fat', 'fibre', 'ts']], log);
  seedTab_(TAB.weeklyLog, [['week', 'weekStart', 'weight', 'waist', 'gymDays', 'cardio', 'avgKcal', 'avgProtein', 'avgSteps', 'sleep', 'note', 'ts']], log);
  return log.join('\n');
}
