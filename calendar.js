function createCalendar({
  container,
  initialDate = new Date(),
  // NEW: массивы дат (строк формата YYYY-MM-DD), чтобы их окрашивать по-новому
  masterDays = [],
  recordsDays = [],
  // СТАРОЕ (оставляем, но можем не использовать):
  selectedDates = [],
  showHeader = true,
  showNav = true,
  onDateSelect,
  width = "600px",
  height = "auto",
  tdPadding = "12px",
}) {
  // единая функция-ключ для дат
  function getDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // NEW: инициализируем новое состояние:
  // masterDaysSet хранит ключи дат, которые мастер отметил как занятые (но не в records).
  // recordsDaysSet хранит ключи дат, у которых есть запись (берём из records_array).
  const state = {
    currentDate: new Date(initialDate),
    // СТАРОЕ (оставляем, но не используем в новой логике)
    // selected: new Set(selectedDates.map(getDateKey)),
    masterDaysSet: new Set(masterDays), // ожидаем, что masterDays уже в формате "YYYY-MM-DD"
    recordsDaysSet: new Set(recordsDays), // тоже строки "YYYY-MM-DD"
  };

  // ----- Инъекция стилей (один раз) -----
  const STYLE_ID = "calendar-styles";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
  :root {
      --calendar-bg: #fff;
      --calendar-text: #333;
      --header-bg: #2196F3;
      --header-text: #fff;
      --day-hover: #e0e0e0;
      --selected-bg: rgb(243, 82, 33);
      --selected-text: #fff;
      --today-bg: #ffeb3b;
      --disabled-text: #ccc;
  }
  .calendar-container {
      font-family: Arial, sans-serif;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      background: var(--calendar-bg);
      color: var(--calendar-text);
      width: 100%;
      box-sizing: border-box;
  }
  .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: var(--header-bg);
      color: var(--header-text);
      border-radius: 8px 8px 0 0;
  }
  .calendar-nav button {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.2em;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 4px;
  }
  .calendar-nav button:hover {
      background: rgba(255,255,255,0.1);
  }
  .calendar-table {
      width: 100%;
      border-collapse: collapse;
  }
  .calendar-table th,
  .calendar-table td {
      text-align: center;
      max-width: ${tdPadding};
      padding: 1.5% 0;
      border: 1px solid #ddd;
  }
  .calendar-table th {
      background: #f5f5f5;
      font-weight: bold;
  }
  .calendar-day {
      cursor: pointer;
      transition: all 0.2s;
  }
  .calendar-day:hover {
      background: var(--day-hover);
  }

  /* СТАРОЕ (selected) - оставляем, но можем не использовать */
  .calendar-day.selected {
      background: var(--selected-bg);
      color: var(--selected-text);
  }

  .calendar-day.today {
      background: var(--today-bg);
  }
  .calendar-day.other-month {
      color: var(--disabled-text);
  }

  /* NEW: класс для выходных / дат с записями */
  .weekend, .recorded {
      background: #f44336 !important; /* красный цвет */
      color: #fff !important;
      cursor: default !important;
  }

  /* NEW: класс для дней мастера (занятые мастером, но не в records) */
  .master-day {
      background: green;
      color: #fff;
  }
  /* NEW: при наведении делаем белым, как в требовании */
  .master-day:hover {
      background: #fff !important;
      color: #333 !important;
  }

  @media (max-width: 480px) {
      .calendar-table th,
      .calendar-table td {
          padding: 8px;
      }
  }
`;
    document.head.appendChild(style);
  }

  // ----- Применение размеров -----
  container.style.width = width;
  container.style.height = height;

  // ----- Вспомогательные функции -----
  const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
  const getMonthYearString = () =>
    state.currentDate.toLocaleString("ru-RU", {
      month: "long",
      year: "numeric",
    });

  const getWeeks = () => {
    const weeks = [];
    const first = new Date(
      state.currentDate.getFullYear(),
      state.currentDate.getMonth(),
      1
    );
    // В оригинале сдвиг на понедельник
    const shift = (first.getDay() + 6) % 7;
    const curr = new Date(first);
    curr.setDate(curr.getDate() - shift);
    const last = new Date(
      state.currentDate.getFullYear(),
      state.currentDate.getMonth() + 1,
      0
    );
    while (curr <= last || weeks.length < 6) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  };

  const isCurrentMonth = (date) =>
    date.getMonth() === state.currentDate.getMonth();
  const isToday = (date) => date.toDateString() === new Date().toDateString();

  // СТАРОЕ markWeekends - оставим закомментированным, чтобы не ломать:
  /*
  const markWeekends = () => {
    getWeeks()
      .flat()
      .forEach((date) => {
        if (isWeekend(date)) state.selected.add(getDateKey(date));
      });
  };
  */

  // ----- Отрисовка -----
  const render = () => {
    // СТАРОЕ (selected):
    /*
    state.selected = new Set(
      [...selectedDays].map((d) => {
        if (d instanceof Date) return getDateKey(d);
        return d; // если уже ключ
      })
    );
    markWeekends();
    */
    const calendar = document.createElement("div");
    calendar.className = "calendar-container";
    if (showHeader) calendar.appendChild(createHeader());
    calendar.appendChild(createTable());

    if (container.firstChild) {
      container.replaceChild(calendar, container.firstChild);
    } else {
      container.appendChild(calendar);
    }
  };

  const createHeader = () => {
    const header = document.createElement("div");
    header.className = "calendar-header";
    const monthYear = document.createElement("div");
    monthYear.textContent = getMonthYearString();
    header.appendChild(monthYear);
    if (showNav) header.appendChild(createNavigation());
    return header;
  };

  const createNavigation = () => {
    const nav = document.createElement("div");
    nav.className = "calendar-nav";
    const prev = document.createElement("button");
    prev.innerHTML = "&lt;";
    prev.addEventListener("click", () => navigate(-1));
    const next = document.createElement("button");
    next.innerHTML = "&gt;";
    next.addEventListener("click", () => navigate(1));
    nav.append(prev, next);
    return nav;
  };

  const createTable = () => {
    const table = document.createElement("table");
    table.className = "calendar-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach((d) => {
      const th = document.createElement("th");
      th.textContent = d;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    getWeeks().forEach((week) => {
      const row = document.createElement("tr");
      week.forEach((day) => createDayCell(day, row));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    return table;
  };

  function createDayCell(date, row) {
    const td = document.createElement("td");
    td.className = "calendar-day";
    td.textContent = date.getDate();
    td.dataset.date = getDateKey(date);

    if (!isCurrentMonth(date)) {
      td.classList.add("other-month");
    }

    if (isToday(date)) {
      td.classList.add("today");
    }

    // NEW: Если это суббота/воскресенье - красим в красный, не кликаем
    if (isWeekend(date)) {
      td.classList.add("weekend");
      row.appendChild(td);
      return;
    }

    // NEW: Если это дата из recordsDaysSet - красим в красный, но теперь отслеживаем клик
    const key = getDateKey(date);
    if (state.recordsDaysSet.has(key)) {
      td.classList.add("recorded");
      // Добавляем обработчик отдельных записей (т.е. есть "record")
      td.addEventListener("click", () => handleRecordedDateClick(date));
      row.appendChild(td);
      return;
    }

    // NEW: Если это "мастер-день", красим в зелёный
    if (state.masterDaysSet.has(key)) {
      td.classList.add("master-day");
    }

    // Далее вешаем обработчик, чтобы toggl-ить master-day
    td.addEventListener("click", () => handleDateClick(date));

    row.appendChild(td);
  }

  // Обработчик клика по белому или зелёному дню
  const handleDateClick = (date) => {
    const key = getDateKey(date);

    if (state.masterDaysSet.has(key)) {
      // Если был мастер-день, делаем его обычным
      state.masterDaysSet.delete(key);
    } else {
      // Если был обычным, делаем мастер-день
      state.masterDaysSet.add(key);
    }
    if (onDateSelect) {
      onDateSelect({
        render,
        date,
        masterDaysSet: state.masterDaysSet,
        isRecorded: false, // явно указываем, что это не recorded
      });
    }
    render();
  };

  // Доп. обработчик для дат с записью
  const handleRecordedDateClick = (date) => {
    if (onDateSelect) {
      onDateSelect({
        render,
        date,
        masterDaysSet: state.masterDaysSet,
        isRecorded: true, // флаг, что это запись
      });
    }
    // Обратите внимание, что здесь мы НЕ меняем masterDaysSet,
    // т.к. это день уже занят записью (records), менять нельзя.
    // Перерисовка нам тоже не нужна, так как ничего не меняется визуально.
  };

  const navigate = (delta) => {
    state.currentDate.setMonth(state.currentDate.getMonth() + delta);
    render();
  };

  // Первый рендер
  render();

  // Публичный API
  return {
    // СТАРОЕ:
    /*
    getSelectedDates: () =>
      Array.from(state.selected).map((k) => {
        const [y, m, d] = k.split("-");
        return new Date(+y, +m - 1, +d);
      }),
    */
    // NEW: получить текущее множество дат мастера
    getMasterDays: () => new Set(state.masterDaysSet),
    setDate: (date) => {
      state.currentDate = new Date(date);
      render();
    },
  };
}
