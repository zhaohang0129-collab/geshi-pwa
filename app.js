"use strict";

const STORAGE_KEY = "geshi-data-v1";
const QUOTE_CACHE_KEY = "geshi-daily-quote-v1";
const QUOTE_ATTEMPT_KEY = "geshi-daily-quote-attempt-v1";
const QUOTE_API_URL = "https://v1.hitokoto.cn/?c=i&c=d&c=k";
const FALLBACK_QUOTES = [
  { text: "问渠那得清如许？为有源头活水来。", source: "朱熹《观书有感》", lang: "zh" },
  { text: "人生代代无穷已，江月年年望相似。", source: "张若虚《春江花月夜》", lang: "zh" },
  { text: "人生如逆旅，我亦是行人。", source: "苏轼", lang: "zh" },
  { text: "吾生也有涯，而知也无涯。", source: "庄子《养生主》", lang: "zh" },
  { text: "不识庐山真面目，只缘身在此山中。", source: "苏轼《题西林壁》", lang: "zh" },
  { text: "宠辱不惊，闲看庭前花开花落。", source: "《菜根谭》", lang: "zh" },
  { text: "盛年不重来，一日难再晨。", source: "陶渊明《杂诗》", lang: "zh" },
  { text: "山重水复疑无路，柳暗花明又一村。", source: "陆游《游山西村》", lang: "zh" },
  { text: "落红不是无情物，化作春泥更护花。", source: "龚自珍《己亥杂诗》", lang: "zh" },
  { text: "行到水穷处，坐看云起时。", source: "王维《终南别业》", lang: "zh" },
  { text: "沉舟侧畔千帆过，病树前头万木春。", source: "刘禹锡", lang: "zh" },
  { text: "此心安处是吾乡。", source: "苏轼《定风波》", lang: "zh" },
  { text: "路漫漫其修远兮，吾将上下而求索。", source: "屈原《离骚》", lang: "zh" },
  { text: "知之者不如好之者，好之者不如乐之者。", source: "《论语·雍也》", lang: "zh" },
  { text: "大巧若拙，大辩若讷。", source: "《老子》", lang: "zh" },
  { text: "为学日益，为道日损。", source: "《老子》", lang: "zh" },
  { text: "非淡泊无以明志，非宁静无以致远。", source: "诸葛亮《诫子书》", lang: "zh" },
  { text: "衣带渐宽终不悔，为伊消得人憔悴。", source: "柳永《蝶恋花》", lang: "zh" },
  { text: "万物皆流，无物常驻。", source: "赫拉克利特", lang: "zh" },
  { text: "A mathematician, like a painter or a poet, is a maker of patterns.", source: "G. H. Hardy", lang: "en" },
  { text: "Pure mathematics is, in its way, the poetry of logical ideas.", source: "Albert Einstein", lang: "en" },
  { text: "Mathematics is the art of giving the same name to different things.", source: "Henri Poincaré", lang: "en" },
  { text: "The essence of mathematics lies in its freedom.", source: "Georg Cantor", lang: "en" },
  { text: "Mathematics, rightly viewed, possesses not only truth, but supreme beauty.", source: "Bertrand Russell", lang: "en" },
  { text: "As if you could kill time without injuring eternity.", source: "Henry David Thoreau", lang: "en" },
  { text: "Time is not a line, but a series of now-points.", source: "Rainer Maria Rilke", lang: "en" },
  { text: "Attention is the rarest and purest form of generosity.", source: "Simone Weil", lang: "en" },
  { text: "Mathematics is the music of reason.", source: "James Joseph Sylvester", lang: "en" },
  { text: "In mathematics you don't understand things. You just get used to them.", source: "John von Neumann", lang: "en" },
  { text: "The book of nature is written in the language of mathematics.", source: "Galileo Galilei", lang: "en" }
];
const DEFAULT_CONVERT_MINUTES = 30;
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const STUDY_DONUT_COLORS = ["#35478C", "#4E5FA0", "#6B79B4", "#8B96C7", "#ACB4D9"];
const REST_DONUT_COLORS = ["#C98A2D", "#D9A455", "#E5BE83"];
const formatter = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" });

let data = loadData();
let activeView = "today";
let lastRecordTrigger = null;
let lastDonutSignature = null;

const els = {
  headerDate: document.querySelector("#header-date"), headerStreak: document.querySelector("#header-streak"),
  dueWrap: document.querySelector("#due-todos-wrap"), dueProgress: document.querySelector("#due-progress"), dueList: document.querySelector("#due-todo-list"),
  todayStudy: document.querySelector("#today-study"), todayRest: document.querySelector("#today-rest"), todayTotal: document.querySelector("#today-total"),
  todayRecords: document.querySelector("#today-records"), todayDonut: document.querySelector("#today-donut"), homeCalendar: document.querySelector("#home-calendar"),
  tomorrowForm: document.querySelector("#tomorrow-form"), tomorrowInput: document.querySelector("#tomorrow-input"), tomorrowList: document.querySelector("#tomorrow-list"),
  monthPicker: document.querySelector("#month-picker"), monthCalendar: document.querySelector("#month-calendar"), monthStudy: document.querySelector("#month-study"),
  monthRest: document.querySelector("#month-rest"), monthDays: document.querySelector("#month-days"), monthStreak: document.querySelector("#month-streak"),
  breakdown: document.querySelector("#label-breakdown-list"), dialog: document.querySelector("#record-dialog"), recordForm: document.querySelector("#record-form"),
  recordDialogTitle: document.querySelector("#record-dialog-title"), recordId: document.querySelector("#record-id"), recordLabel: document.querySelector("#record-label"),
  recordDuration: document.querySelector("#record-duration"), recordNote: document.querySelector("#record-note"), deleteRecord: document.querySelector("#delete-record"),
  importJson: document.querySelector("#import-json"), offlineStatus: document.querySelector("#offline-status"), toastRegion: document.querySelector("#toast-region"),
  checkTemplate: document.querySelector("#check-template"), dailyQuote: document.querySelector("#daily-quote"),
};

init();

function init() {
  els.monthPicker.value = monthKey(new Date());
  bindEvents();
  const requestedView = location.hash.replace("#", "");
  switchView(["today", "month", "data"].includes(requestedView) ? requestedView : "today", false);
  renderAll();
  renderDailyQuote();
  updateNetworkStatus();
  registerServiceWorker();
  registerWebMcp();
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  document.querySelectorAll("[data-go-month]").forEach((button) => button.addEventListener("click", () => switchView("month")));
  window.addEventListener("hashchange", () => {
    const view = location.hash.replace("#", "");
    if (["today", "month", "data"].includes(view)) switchView(view, false);
  });
  document.querySelector("#open-record-dialog").addEventListener("click", handleOpenRecordDialog);
  document.querySelector("#close-record-dialog").addEventListener("click", closeRecordDialog);
  document.querySelector("#cancel-record").addEventListener("click", closeRecordDialog);
  els.recordForm.addEventListener("submit", saveRecordFromForm);
  els.deleteRecord.addEventListener("click", removeEditingRecord);
  els.todayRecords.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-record]");
    if (button) openRecordDialog(button.dataset.editRecord, button);
  });
  els.tomorrowForm.addEventListener("submit", addTomorrowTodo);
  els.tomorrowList.addEventListener("click", handleTodoAction);
  els.dueList.addEventListener("click", handleTodoAction);
  els.monthPicker.addEventListener("change", renderMonthView);
  document.querySelector("#export-json").addEventListener("click", exportJson);
  document.querySelector("#export-csv").addEventListener("click", exportCsv);
  els.importJson.addEventListener("change", importJson);
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
}

function handleOpenRecordDialog(event) {
  openRecordDialog(null, event.currentTarget);
}

function switchView(view, updateHash = true) {
  activeView = view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const active = panel.dataset.viewPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  if (updateHash) history.replaceState(null, "", `#${view}`);
  if (view === "month") renderMonthView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  const today = todayKey();
  els.headerDate.textContent = formatter.format(new Date());
  els.headerStreak.textContent = String(calculateStreak());
  renderDueTodos(today);
  renderTodayRecords(today);
  renderTodoList(els.tomorrowList, data.todos[nextDateKey(today)] || [], nextDateKey(today), false);
  renderCalendar(els.homeCalendar, monthKey(new Date()));
  if (activeView === "month") renderMonthView();
}

function renderTodayRecords(date) {
  const records = data.records[date] || [];
  const study = records.filter((record) => record.type === "study").reduce((sum, record) => sum + record.duration, 0);
  const rest = records.filter((record) => record.type === "rest").reduce((sum, record) => sum + record.duration, 0);
  els.todayStudy.textContent = formatDuration(study);
  els.todayRest.textContent = formatDuration(rest);
  els.todayTotal.textContent = formatDuration(study + rest);
  els.todayRecords.replaceChildren();
  renderTodayDonut(records, study, rest);
  records.forEach((record) => {
    const row = document.createElement("tr");
    const itemCell = document.createElement("td");
    const label = document.createElement("span");
    label.className = "record-label";
    label.textContent = record.label;
    itemCell.append(label);
    if (record.note) {
      const note = document.createElement("span");
      note.className = "record-note";
      note.textContent = record.note;
      itemCell.append(note);
    }
    const typeCell = document.createElement("td");
    const type = document.createElement("span");
    type.className = `record-type ${record.type}`;
    type.textContent = record.type === "study" ? "学习" : "休息";
    typeCell.append(type);
    const durationCell = document.createElement("td");
    durationCell.className = "num";
    durationCell.textContent = `${record.duration} 分钟`;
    const actionCell = document.createElement("td");
    const edit = document.createElement("button");
    edit.className = "edit-record";
    edit.type = "button";
    edit.dataset.editRecord = record.id;
    edit.textContent = "修改";
    edit.setAttribute("aria-label", `修改${record.label}`);
    actionCell.append(edit);
    row.append(itemCell, typeCell, durationCell, actionCell);
    els.todayRecords.append(row);
  });
}

function renderTodayDonut(records, studyMinutes, restMinutes) {
  if (records.length === 0) {
    const button = document.createElement("button");
    button.className = "donut-empty";
    button.type = "button";
    button.setAttribute("aria-label", "今天还没有记录，点击记一笔");
    button.addEventListener("click", handleOpenRecordDialog);

    const plot = document.createElement("span");
    plot.className = "donut-empty-plot";
    plot.setAttribute("aria-hidden", "true");
    const svg = createSvgElement("svg", { viewBox: "0 0 140 140" });
    svg.append(createSvgElement("circle", {
      cx: "70", cy: "70", r: "62", fill: "none", stroke: "rgba(43,45,49,0.12)",
      "stroke-width": "14", "stroke-dasharray": "6 8"
    }));
    const message = document.createElement("span");
    message.textContent = "今天还没有记录";
    plot.append(svg, message);
    button.append(plot);
    els.todayDonut.replaceChildren(button);
    lastDonutSignature = "[]";
    return;
  }

  const signature = JSON.stringify(records.map(({ id, label, type, duration }) => [id, label, type, duration]));
  const shouldAnimate = signature !== lastDonutSignature && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  lastDonutSignature = signature;

  const sorted = records
    .map((record) => ({ label: record.label, type: record.type, duration: record.duration }))
    .sort((a, b) => b.duration - a.duration);
  const items = sorted.slice(0, 5);
  if (sorted.length > 5) {
    items.push({
      label: "其他",
      type: "other",
      duration: sorted.slice(5).reduce((sum, record) => sum + record.duration, 0)
    });
  }
  items.sort((a, b) => b.duration - a.duration);

  const total = studyMinutes + restMinutes;
  const radius = 62;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const plot = document.createElement("div");
  plot.className = "donut-plot";
  const svg = createSvgElement("svg", { viewBox: "0 0 140 140", role: "img" });
  svg.setAttribute("aria-label", `今日共记录${formatDuration(total)}，学习占比${Math.round(studyMinutes / total * 100)}%`);

  const maskId = `donut-reveal-${Date.now()}`;
  const defs = createSvgElement("defs");
  const mask = createSvgElement("mask", { id: maskId });
  mask.append(createSvgElement("rect", { width: "140", height: "140", fill: "black" }));
  const reveal = createSvgElement("circle", {
    cx: "70", cy: "70", r: String(radius), fill: "none", stroke: "white",
    "stroke-width": String(strokeWidth), "stroke-dasharray": String(circumference),
    "stroke-dashoffset": "0", transform: "rotate(-90 70 70)"
  });
  reveal.style.setProperty("--donut-circumference", String(circumference));
  if (shouldAnimate) reveal.classList.add("donut-reveal");
  mask.append(reveal);
  defs.append(mask);
  svg.append(defs);

  svg.append(createSvgElement("circle", {
    cx: "70", cy: "70", r: String(radius), fill: "none", stroke: "#FAF8F3",
    "stroke-width": String(strokeWidth)
  }));

  const segments = createSvgElement("g", { mask: `url(#${maskId})` });
  let offset = 0;
  let studyColorIndex = 0;
  let restColorIndex = 0;
  items.forEach((item) => {
    const arcLength = item.duration / total * circumference;
    const visibleLength = items.length === 1 ? arcLength : Math.max(0.5, arcLength - 2);
    const color = item.type === "study"
      ? STUDY_DONUT_COLORS[Math.min(studyColorIndex++, STUDY_DONUT_COLORS.length - 1)]
      : item.type === "rest"
        ? REST_DONUT_COLORS[Math.min(restColorIndex++, REST_DONUT_COLORS.length - 1)]
        : "#9BA0A8";
    item.color = color;
    segments.append(createSvgElement("circle", {
      cx: "70", cy: "70", r: String(radius), fill: "none", stroke: color,
      "stroke-width": String(strokeWidth), "stroke-linecap": "butt",
      "stroke-dasharray": `${visibleLength} ${circumference - visibleLength}`,
      "stroke-dashoffset": String(-offset), transform: "rotate(-90 70 70)"
    }));
    offset += arcLength;
  });
  svg.append(segments);

  const center = document.createElement("span");
  center.className = "donut-center";
  const centerLabel = document.createElement("span");
  centerLabel.textContent = "学习占比";
  const centerValue = document.createElement("strong");
  centerValue.className = "num";
  centerValue.textContent = `${Math.round(studyMinutes / total * 100)}%`;
  center.append(centerLabel, centerValue);
  plot.append(svg, center);

  const legend = document.createElement("div");
  legend.className = "donut-legend";
  legend.setAttribute("aria-label", "今日事项时长图例");
  const legendRows = items.map((item) => {
    const row = document.createElement("div");
    row.className = "donut-legend-row";
    const swatch = document.createElement("i");
    swatch.style.backgroundColor = item.color;
    const name = document.createElement("span");
    name.className = "donut-legend-name";
    name.textContent = item.label;
    const meta = document.createElement("span");
    meta.className = "donut-legend-meta num";
    const duration = document.createElement("span");
    duration.textContent = formatLegendDuration(item.duration);
    const percent = document.createElement("span");
    percent.className = "donut-legend-percent";
    percent.textContent = `${Math.round(item.duration / total * 100)}%`;
    meta.append(duration, percent);
    row.append(swatch, name, meta);
    return row;
  });
  legend.append(...legendRows);
  els.todayDonut.replaceChildren(plot, legend);
}

function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

function renderDueTodos(date) {
  const todos = data.todos[date] || [];
  els.dueWrap.hidden = todos.length === 0;
  if (!todos.length) return;
  const complete = todos.filter((todo) => todo.done).length;
  els.dueProgress.textContent = `${complete} / ${todos.length}`;
  renderTodoList(els.dueList, todos, date, true);
}

function renderTodoList(container, todos, date, isDue) {
  container.replaceChildren();
  todos.forEach((todo) => {
    const item = document.createElement("li");
    item.className = `todo-item${todo.done ? " is-done" : ""}`;
    const check = document.createElement("button");
    check.className = "todo-check";
    check.type = "button";
    Object.assign(check.dataset, { action: "toggle", date, todoId: todo.id });
    check.setAttribute("aria-label", todo.done ? `取消完成：${todo.text}` : `完成：${todo.text}`);
    check.setAttribute("aria-pressed", String(todo.done));
    if (todo.done) check.append(els.checkTemplate.content.cloneNode(true));
    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;
    const actions = document.createElement("span");
    actions.className = "todo-actions";
    if (isDue) {
      const convert = document.createElement("button");
      convert.className = "todo-action convert";
      convert.type = "button";
      Object.assign(convert.dataset, { action: "convert", date, todoId: todo.id });
      convert.textContent = todo.convertedRecordId ? "已记入" : `记入 ${DEFAULT_CONVERT_MINUTES} 分`;
      convert.disabled = Boolean(todo.convertedRecordId);
      actions.append(convert);
    }
    const remove = document.createElement("button");
    remove.className = "todo-action delete";
    remove.type = "button";
    Object.assign(remove.dataset, { action: "delete", date, todoId: todo.id });
    remove.textContent = "删除";
    actions.append(remove);
    item.append(check, text, actions);
    container.append(item);
  });
}

function addTomorrowTodo(event) {
  event.preventDefault();
  const text = els.tomorrowInput.value.trim();
  if (!text) return;
  const date = nextDateKey(todayKey());
  data.todos[date] ||= [];
  data.todos[date].push({ id: uid(), text: text.slice(0, 100), done: false, createdAt: new Date().toISOString() });
  if (persistData()) {
    els.tomorrowInput.value = "";
    renderTodoList(els.tomorrowList, data.todos[date], date, false);
    showToast("已写进明天的清单");
  }
}

function handleTodoAction(event) {
  const button = event.target.closest("[data-action][data-todo-id]");
  if (!button) return;
  const todos = data.todos[button.dataset.date] || [];
  const todo = todos.find((item) => item.id === button.dataset.todoId);
  if (!todo) return;
  if (button.dataset.action === "toggle") {
    todo.done = !todo.done;
    todo.completedAt = todo.done ? new Date().toISOString() : null;
    persistData(); renderAll();
    if (todo.done) showToast("这一项完成了");
  }
  if (button.dataset.action === "delete") {
    data.todos[button.dataset.date] = todos.filter((item) => item.id !== todo.id);
    if (!data.todos[button.dataset.date].length) delete data.todos[button.dataset.date];
    persistData(); renderAll();
  }
  if (button.dataset.action === "convert" && !todo.convertedRecordId) {
    const record = createRecord({ label: todo.text.slice(0, 40), type: "study", duration: DEFAULT_CONVERT_MINUTES, note: "由待办转入" });
    todo.done = true;
    todo.completedAt = new Date().toISOString();
    todo.convertedRecordId = record.id;
    persistData(); renderAll();
    showToast(`已记为 ${DEFAULT_CONVERT_MINUTES} 分钟学习，可在今日记录中修改`);
  }
}

function openRecordDialog(recordId, trigger) {
  lastRecordTrigger = trigger || document.activeElement;
  const record = (data.records[todayKey()] || []).find((item) => item.id === recordId);
  els.recordForm.reset();
  els.recordId.value = record?.id || "";
  els.recordLabel.value = record?.label || "";
  els.recordDuration.value = record?.duration || "";
  els.recordNote.value = record?.note || "";
  document.querySelector(`input[name="record-type"][value="${record?.type || "study"}"]`).checked = true;
  els.recordDialogTitle.textContent = record ? "修改记录" : "记一笔";
  els.deleteRecord.hidden = !record;
  els.dialog.showModal();
  requestAnimationFrame(() => els.recordLabel.focus());
}

function closeRecordDialog() {
  els.dialog.close();
  lastRecordTrigger?.focus();
}

function saveRecordFromForm(event) {
  event.preventDefault();
  const label = els.recordLabel.value.trim();
  const duration = Number.parseInt(els.recordDuration.value, 10);
  const type = new FormData(els.recordForm).get("record-type");
  if (!label || !Number.isInteger(duration) || duration < 1 || duration > 1440 || !["study", "rest"].includes(type)) {
    showToast("请检查标签和时长"); return;
  }
  const date = todayKey();
  data.records[date] ||= [];
  const existing = data.records[date].find((record) => record.id === els.recordId.value);
  if (existing) Object.assign(existing, { label: label.slice(0, 40), duration, type, note: els.recordNote.value.trim().slice(0, 160), updatedAt: new Date().toISOString() });
  else createRecord({ label, duration, type, note: els.recordNote.value.trim() });
  if (persistData()) {
    closeRecordDialog(); renderAll(); showToast(existing ? "记录已修改" : "记录已写下");
  }
}

function createRecord({ label, type, duration, note = "" }, date = todayKey()) {
  const record = { id: uid(), label: String(label).trim().slice(0, 40), type, duration: Number(duration), note: String(note).trim().slice(0, 160), createdAt: new Date().toISOString() };
  data.records[date] ||= [];
  data.records[date].push(record);
  return record;
}

function removeEditingRecord() {
  const id = els.recordId.value;
  const date = todayKey();
  if (!id || !window.confirm("删除这条时间记录？")) return;
  data.records[date] = (data.records[date] || []).filter((record) => record.id !== id);
  if (!data.records[date].length) delete data.records[date];
  persistData(); closeRecordDialog(); renderAll(); showToast("记录已删除");
}

function renderMonthView() {
  const selectedMonth = /^\d{4}-\d{2}$/.test(els.monthPicker.value) ? els.monthPicker.value : monthKey(new Date());
  renderCalendar(els.monthCalendar, selectedMonth);
  const records = Object.entries(data.records).filter(([date]) => date.startsWith(selectedMonth)).flatMap(([, items]) => items);
  const studyRecords = records.filter((record) => record.type === "study");
  const restRecords = records.filter((record) => record.type === "rest");
  const study = studyRecords.reduce((sum, record) => sum + record.duration, 0);
  const rest = restRecords.reduce((sum, record) => sum + record.duration, 0);
  const days = Object.entries(data.records).filter(([date, items]) => date.startsWith(selectedMonth) && items.length).length;
  els.monthStudy.textContent = formatDuration(study);
  els.monthRest.textContent = formatDuration(rest);
  els.monthDays.textContent = `${days} 天`;
  els.monthStreak.textContent = `${calculateStreak()} 天`;
  const byLabel = new Map();
  studyRecords.forEach((record) => byLabel.set(record.label, (byLabel.get(record.label) || 0) + record.duration));
  els.breakdown.replaceChildren();
  const sorted = [...byLabel.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "breakdown-empty";
    empty.textContent = "这个月还没有学习记录。";
    els.breakdown.append(empty); return;
  }
  sorted.forEach(([label, minutes]) => {
    const row = document.createElement("div"); row.className = "breakdown-row";
    const name = document.createElement("span"); name.className = "breakdown-name"; name.textContent = label; name.title = label;
    const track = document.createElement("span"); track.className = "breakdown-track";
    const fill = document.createElement("span"); fill.className = "breakdown-fill"; fill.style.width = `${study ? (minutes / study) * 100 : 0}%`; track.append(fill);
    const value = document.createElement("span"); value.className = "breakdown-value num"; value.textContent = `${Math.round((minutes / study) * 100)}%，${formatDuration(minutes)}`;
    row.append(name, track, value); els.breakdown.append(row);
  });
}

function renderCalendar(container, selectedMonth) {
  container.replaceChildren();
  WEEKDAYS.forEach((weekday) => { const cell = document.createElement("div"); cell.className = "calendar-weekday"; cell.textContent = weekday; container.append(cell); });
  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  for (let i = 0; i < startOffset; i += 1) { const blank = document.createElement("div"); blank.className = "calendar-day is-blank"; blank.setAttribute("aria-hidden", "true"); container.append(blank); }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    const minutes = studyMinutesForDate(date);
    const cell = document.createElement("div");
    cell.className = `calendar-day${date === todayKey() ? " is-today" : ""}`;
    cell.dataset.level = String(heatLevel(minutes)); cell.textContent = String(day);
    cell.title = `${date}，学习 ${formatDuration(minutes)}`; cell.setAttribute("aria-label", cell.title); container.append(cell);
  }
}

function heatLevel(minutes) { if (minutes <= 0) return 0; if (minutes < 60) return 1; if (minutes < 120) return 2; if (minutes < 240) return 3; return 4; }
function studyMinutesForDate(date) { return (data.records[date] || []).filter((record) => record.type === "study").reduce((sum, record) => sum + record.duration, 0); }
function calculateStreak() {
  let cursor = parseDateKey(todayKey());
  if (studyMinutesForDate(dateKey(cursor)) === 0) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (studyMinutesForDate(dateKey(cursor)) > 0) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

function exportJson() {
  const payload = { app: "格时", version: 1, exportedAt: new Date().toISOString(), records: data.records, todos: data.todos };
  downloadBlob(JSON.stringify(payload, null, 2), `格时备份-${todayKey()}.json`, "application/json;charset=utf-8"); showToast("JSON 备份已导出");
}

function exportCsv() {
  const rows = [["日期", "类型", "标签", "时长（分钟）", "备注"]];
  Object.keys(data.records).sort().forEach((date) => data.records[date].forEach((record) => rows.push([date, record.type === "study" ? "学习" : "休息", record.label, record.duration, record.note])));
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadBlob(`\ufeff${csv}`, `格时时间明细-${todayKey()}.csv`, "text/csv;charset=utf-8"); showToast("CSV 明细已导出");
}

async function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const imported = sanitizeData(JSON.parse(await file.text()));
    const count = Object.values(imported.records).reduce((sum, records) => sum + records.length, 0);
    if (!window.confirm(`将用备份中的 ${count} 条记录替换当前数据，继续吗？`)) return;
    data = imported;
    if (persistData()) { els.monthPicker.value = monthKey(new Date()); renderAll(); showToast("备份已恢复"); }
  } catch (error) { console.error(error); showToast("无法导入：文件格式不正确"); }
  finally { event.target.value = ""; }
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function showToast(message) { const toast = document.createElement("div"); toast.className = "toast"; toast.textContent = message; els.toastRegion.replaceChildren(toast); setTimeout(() => toast.remove(), 3200); }

function loadData() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? sanitizeData(JSON.parse(raw)) : emptyData(); }
  catch (error) { console.error("读取本地数据失败", error); return emptyData(); }
}

function sanitizeData(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid backup");
  const clean = emptyData();
  if (input.records && typeof input.records === "object" && !Array.isArray(input.records)) {
    Object.entries(input.records).forEach(([date, records]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(records)) return;
      const safeRecords = records.map(sanitizeRecord).filter(Boolean); if (safeRecords.length) clean.records[date] = safeRecords;
    });
  }
  if (input.todos && typeof input.todos === "object" && !Array.isArray(input.todos)) {
    Object.entries(input.todos).forEach(([date, todos]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(todos)) return;
      const safeTodos = todos.map(sanitizeTodo).filter(Boolean); if (safeTodos.length) clean.todos[date] = safeTodos;
    });
  }
  return clean;
}

function sanitizeRecord(record) {
  if (!record || typeof record !== "object") return null;
  const label = String(record.label || "").trim().slice(0, 40); const duration = Number(record.duration); const type = record.type;
  if (!label || !Number.isInteger(duration) || duration < 1 || duration > 1440 || !["study", "rest"].includes(type)) return null;
  return { id: safeId(record.id), label, type, duration, note: String(record.note || "").trim().slice(0, 160), createdAt: safeIso(record.createdAt), ...(record.updatedAt ? { updatedAt: safeIso(record.updatedAt) } : {}) };
}

function sanitizeTodo(todo) {
  if (!todo || typeof todo !== "object") return null;
  const text = String(todo.text || "").trim().slice(0, 100); if (!text) return null;
  return { id: safeId(todo.id), text, done: Boolean(todo.done), createdAt: safeIso(todo.createdAt), ...(todo.completedAt ? { completedAt: safeIso(todo.completedAt) } : {}), ...(todo.convertedRecordId ? { convertedRecordId: safeId(todo.convertedRecordId) } : {}) };
}

function persistData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
  catch (error) { console.error("保存本地数据失败", error); showToast("保存失败，请先导出备份并检查浏览器存储空间"); return false; }
}

function emptyData() { return { version: 1, records: {}, todos: {} }; }
function safeId(value) { const id = String(value || ""); return /^[a-zA-Z0-9_-]{6,80}$/.test(id) ? id : uid(); }
function safeIso(value) { const date = new Date(value || Date.now()); return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(); }
function uid() { return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }
function todayKey() { return dateKey(new Date()); }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function parseDateKey(value) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
function nextDateKey(value) { const date = parseDateKey(value); date.setDate(date.getDate() + 1); return dateKey(date); }
function formatDuration(minutes) { if (minutes < 60) return `${minutes} 分钟`; const hours = Math.floor(minutes / 60); const rest = minutes % 60; return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`; }
function formatLegendDuration(minutes) { if (minutes < 60) return `${minutes} 分钟`; return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`; }
function updateNetworkStatus() { els.offlineStatus.textContent = navigator.onLine ? "在线，离线副本已准备" : "当前离线，仍可正常使用"; }

async function getDailyQuote() {
  const beijingDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  try {
    const cached = JSON.parse(localStorage.getItem(QUOTE_CACHE_KEY) || "null");
    if (cached?.date === beijingDate && typeof cached.text === "string" && cached.text.trim()) {
      return { text: cached.text, source: "cache" };
    }
  } catch (error) {
    console.warn("每日一句缓存读取失败", error);
  }

  let alreadyAttempted = false;
  try {
    alreadyAttempted = localStorage.getItem(QUOTE_ATTEMPT_KEY) === beijingDate;
  } catch (error) {
    console.warn("每日一句请求状态读取失败", error);
  }
  if (!alreadyAttempted) {
    try {
      try {
        localStorage.setItem(QUOTE_ATTEMPT_KEY, beijingDate);
      } catch (error) {
        console.warn("每日一句请求状态写入失败", error);
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      let response;
      try {
        response = await fetch(QUOTE_API_URL, { signal: controller.signal, headers: { Accept: "application/json" } });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!response.ok) throw new Error(`Quote API returned ${response.status}`);
      const payload = await response.json();
      const quote = typeof payload.hitokoto === "string" ? payload.hitokoto.trim() : "";
      const attributionValue = payload.from_who || payload.from;
      const attribution = typeof attributionValue === "string" ? attributionValue.trim() : "";
      if (!quote || !attribution) throw new Error("Quote API payload is incomplete");
      const text = `${quote} ——${attribution}`;
      try {
        localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify({ date: beijingDate, text }));
      } catch (error) {
        console.warn("每日一句缓存写入失败", error);
      }
      return { text, source: "api" };
    } catch (error) {
      console.warn("每日一句请求失败", error);
    }
  }

  if (FALLBACK_QUOTES.length) {
    const hash = Array.from(beijingDate).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
    const fallback = FALLBACK_QUOTES[hash % FALLBACK_QUOTES.length];
    return { text: `${fallback.text} ——${fallback.source}`, source: "fallback" };
  }
  return { text: "", source: "none" };
}

async function renderDailyQuote() {
  const result = await getDailyQuote();
  if (!result.text) return;
  els.dailyQuote.textContent = result.text;
  els.dailyQuote.hidden = false;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) { els.offlineStatus.textContent = "当前浏览器不支持离线安装"; return; }
  try { await navigator.serviceWorker.register("./sw.js", { scope: "./" }); }
  catch (error) { console.error("Service worker registration failed", error); els.offlineStatus.textContent = "离线副本准备失败，请刷新重试"; }
}

function registerWebMcp() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  try {
    void Promise.resolve(context.registerTool({
      name: "add_time_record", title: "新增今日时间记录", description: "向格时新增一条今天的学习或休息记录，并立即更新页面统计。",
      inputSchema: { type: "object", properties: {
        label: { type: "string", minLength: 1, maxLength: 40, description: "事项标签" }, type: { type: "string", enum: ["study", "rest"], description: "学习或休息" },
        durationMinutes: { type: "integer", minimum: 1, maximum: 1440, description: "时长（分钟）" }, note: { type: "string", maxLength: 160, description: "可选备注" },
      }, required: ["label", "type", "durationMinutes"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const label = typeof input?.label === "string" ? input.label.trim() : ""; const type = input?.type; const duration = input?.durationMinutes; const note = typeof input?.note === "string" ? input.note.trim() : "";
        if (!label || label.length > 40 || !["study", "rest"].includes(type) || !Number.isInteger(duration) || duration < 1 || duration > 1440 || note.length > 160) throw new TypeError("记录字段无效");
        const record = createRecord({ label, type, duration, note }); if (!persistData()) throw new Error("本地存储写入失败"); renderAll(); return { id: record.id, date: todayKey(), saved: true };
      },
    })).catch((error) => console.warn("WebMCP tool registration failed", error));
  } catch (error) { console.warn("WebMCP tool registration failed", error); }
}
