/**
 * Sheet access. Every tab is read as an array of objects keyed by its header row,
 * so adding a column in the Sheet never breaks a read.
 */

var TAB = {
  config: 'Config',
  ramp: 'WeightRamp',
  days: 'Days',
  exercises: 'Exercises',
  foods: 'Foods',
  split: 'Split',
  volume: 'Volume',
  nutrients: 'Nutrients',
  milestones: 'Milestones',
  warnings: 'Warnings',
  guide: 'Guide',
  sessionLog: 'SessionLog',
  nutritionLog: 'NutritionLog',
  weeklyLog: 'WeeklyLog'
};

function book_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  var sh = book_().getSheetByName(name);
  if (!sh) throw new Error('Missing tab "' + name + '". Run setupWorkbook() once from the Apps Script editor.');
  return sh;
}

/** Read a tab as objects. Returns [] for a tab with only a header row. */
function readTab_(name) {
  var values = sheet_(name).getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.join('') === '') continue;
    var obj = {};
    for (var c = 0; c < head.length; c++) {
      if (head[c] === '') continue;
      obj[String(head[c])] = row[c];
    }
    obj._row = r + 1;
    out.push(obj);
  }
  return out;
}

/** Config tab is key/value rather than tabular. */
function readConfig_() {
  var rows = readTab_(TAB.config);
  var cfg = {};
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key !== '') cfg[String(rows[i].key)] = rows[i].value;
  }
  return cfg;
}

function writeConfig_(key, value) {
  var sh = sheet_(TAB.config);
  var values = sh.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]) === key) {
      sh.getRange(r + 1, 2).setValue(value);
      return;
    }
  }
  sh.appendRow([key, value, '']);
}

function appendRow_(name, obj) {
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var row = head.map(function (h) {
    return obj[h] === undefined ? '' : obj[h];
  });
  sh.appendRow(row);
  return row;
}

/** Delete the row whose `id` column matches. Returns true if something went. */
function deleteById_(name, id) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var idCol = values[0].indexOf('id');
  if (idCol < 0) return false;
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][idCol]) === String(id)) {
      sh.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}

/** Insert or update by a composite key. Used for exercise completion toggles. */
function upsertRow_(name, keyFields, obj) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var head = values[0];
  var idx = {};
  for (var c = 0; c < head.length; c++) idx[head[c]] = c;

  for (var r = 1; r < values.length; r++) {
    var match = true;
    for (var k = 0; k < keyFields.length; k++) {
      var f = keyFields[k];
      if (String(values[r][idx[f]]) !== String(obj[f])) { match = false; break; }
    }
    if (match) {
      var row = head.map(function (h) {
        return obj[h] === undefined ? values[r][idx[h]] : obj[h];
      });
      sh.getRange(r + 1, 1, 1, head.length).setValues([row]);
      return 'updated';
    }
  }
  appendRow_(name, obj);
  return 'inserted';
}

function uuid_() {
  return Utilities.getUuid();
}

// ---- dates -----------------------------------------------------------------
// Everything crossing the wire is a 'yyyy-MM-dd' string in the script's timezone.
// Date objects round-tripped through JSON are how off-by-one date bugs happen.

function tz_() {
  return Session.getScriptTimeZone() || 'Etc/UTC';
}

function fmtDate_(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}

function parseDate_(s) {
  if (s instanceof Date) return s;
  var p = String(s).slice(0, 10).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function addDays_(d, n) {
  var out = parseDate_(fmtDate_(d));
  out.setDate(out.getDate() + n);
  return out;
}

function daysBetween_(a, b) {
  var d1 = parseDate_(fmtDate_(a));
  var d2 = parseDate_(fmtDate_(b));
  return Math.round((d2 - d1) / 86400000);
}

/** The Monday of the week containing d. */
function mondayOf_(d) {
  var dt = parseDate_(fmtDate_(d));
  var dow = dt.getDay();             // 0 Sun .. 6 Sat
  var back = dow === 0 ? 6 : dow - 1;
  return addDays_(dt, -back);
}

function todayStr_() {
  return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
}
