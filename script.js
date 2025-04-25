const formWrapper = document.querySelector(".form__fields");
// Находим контейнеры для календаря и информации о записи
const calendarContainer = document.querySelector(".calendarContainer");
const recordInfoContainer = document.querySelector(".record-info");

const supabaseUrl = "https://eqznnarpanrfzwzjgksq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxem5uYXJwYW5yZnp3empna3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NjU3NDMsImV4cCI6MjA2MTE0MTc0M30.cqB9D02UwuZ7pNpsr-NwtkmLV9W2VJ78X7Fw8QIstbU";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let choosedDay = null;
const employeeId = 0;
let employeeBusyDates = [];
let employeeRecords = []; // для хранения existing records_array
let recordDatesArray = []; // NEW: чтобы хранить даты (YYYY-MM-DD) из таблицы records

/**
 * Унифицированный «ключ» для даты — YYYY-MM-DD, без UTC-сдвигов
 */
function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function showGreeting(name) {
  const title = document.querySelector(".form__title");
  title.textContent = `Добрый день, ${name}!`;
}

// Функция для запроса и отображения записей (records) по конкретной дате
async function handleShowRecordInfo(clickedDate) {
  const dateKey = getDateKey(clickedDate);

  // Очищаем предыдущую информацию
  recordInfoContainer.innerHTML = "";

  try {
    // Делаем запрос к таблице records
    const { data: recordsData, error } = await supabase
      .from("records")
      .select("*")
      .eq("employees_id", employeeId)
      .eq("date", dateKey);

    if (error) {
      console.error("Ошибка при запросе информации о записи:", error);
      recordInfoContainer.textContent =
        "Ошибка при запросе информации о записи.";
      return;
    }

    if (!recordsData || recordsData.length === 0) {
      recordInfoContainer.textContent = "Нет записей на эту дату.";
      return;
    }

    // Если есть несколько записей, выводим каждую
    for (let record of recordsData) {
      const recordDiv = document.createElement("div");
      recordDiv.className = "recordItem";
      recordDiv.innerHTML = `<h4>Запись: ${record.date}</h4>`;

      // record_info может быть JSON-объектом, убедимся что распарсили
      let jsonData = record.record_info;
      if (typeof jsonData === "string") {
        try {
          jsonData = JSON.parse(jsonData);
        } catch (err) {
          console.warn("Невозможно распарсить record_info:", err);
        }
      }

      const fields = (await supabase.from("Fields").select("*")).data;

      const fieldsNameId = {};

      for (let field of fields) {
        fieldsNameId[field.id] = field.name;
      }

      // Если это объект - выведем каждый ключ:значение.
      if (jsonData && typeof jsonData === "object") {
        const ul = document.createElement("ul");
        Object.entries(jsonData).forEach(([fieldKey, fieldValue]) => {
          const li = document.createElement("li");
          li.textContent = `${fieldsNameId[fieldKey]}: ${fieldValue}`;
          ul.appendChild(li);
        });
        recordDiv.appendChild(ul);
      } else {
        // если не объект, просто выведем raw
        const p = document.createElement("p");
        p.textContent = JSON.stringify(jsonData);
        recordDiv.appendChild(p);
      }

      recordInfoContainer.appendChild(recordDiv);
    }
  } catch (err) {
    console.error("Ошибка:", err);
  }
}

(async () => {
  // 1. Получаем информацию о сотруднике
  const { data: employeeData, error: employeeError } = await supabase
    .from("Employees")
    .select("*")
    .eq("id", employeeId);

  console.log(employeeData);

  if (employeeError) {
    console.error("Ошибка при получении сотрудника:", employeeError);
    return;
  }
  const employeeInfo = employeeData[0];

  // Массив строк(YYYY-MM-DD) из сотрудников
  employeeBusyDates = employeeInfo["busy_dates_array"] || [];
  employeeRecords = employeeInfo["records_array"] || [];

  const employeeName = employeeInfo["name"];
  showGreeting(employeeName);

  // 2. По employeeRecords (это IDs записей) делаем запрос в таблицу "records", чтобы выяснить даты
  //    (как и раньше, чтобы заполнить recordDatesArray)
  if (employeeRecords.length > 0) {
    const { data: recordsData, error: recordsError } = await supabase
      .from("records")
      .select("*")
      .in("id", employeeRecords); // employeeRecords - массив id
    if (recordsError) {
      console.error("Ошибка при получении данных из records:", recordsError);
    } else {
      // Собираем даты
      recordDatesArray = recordsData.map((record) => record.date); // здесь date - строка YYYY-MM-DD
    }
  }

  // 3. "Дни мастера" - это busyDatesArray, которых НЕТ в recordDatesArray
  // То есть те, которые мастер обозначил собой, но записей нет
  const masterDaysArray = employeeBusyDates.filter(
    (dateStr) => !recordDatesArray.includes(dateStr)
  );

  // 4. Инициализируем календарь
  // - masterDays => массив строк (YYYY-MM-DD) занятых мастером
  // - recordsDays => массив строк (YYYY-MM-DD) где есть запись
  const calendar = createCalendar({
    container: calendarContainer, // помещаем в наш блок для календаря
    initialDate: new Date(),
    masterDays: masterDaysArray,
    recordsDays: recordDatesArray,
    onDateSelect({ render, date, masterDaysSet, isRecorded }) {
      // При каждом клике:
      // - если это записанный день (isRecorded = true), запрашиваем данные из БД
      // - иначе, если не записанный (isRecorded = false), день может toggl-иться как masterDay
      choosedDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      if (isRecorded) {
        // День красный (recorded), значит нужно показать запись
        handleShowRecordInfo(choosedDay);
      } else {
        // Обычная логика: toggl master-day уже сделан внутри calendar.js
        // Здесь ничего дополнительно делать не надо
      }
    },
    width: "400px",
    tdPadding: "12px",
  });

  // 5. Обработка сохранения
  const saveButton = document.querySelector(".form__button");
  saveButton.addEventListener("click", async () => {
    // После всех изменений получим актуальное множество masterDays
    const masterDaysSet = calendar.getMasterDays();
    // Это Set из строк "YYYY-MM-DD"

    // Важно: мы НЕ удаляем из него те busyDates, которые уже были (и могут быть в records)
    // В оригинале было: const newBusyDatesArray = [...masterDaysSet, ...employeeBusyDates];
    // Однако это может задвоить даты, если не написать проверку.
    // Можно записать Set => массив. Либо оставим логику как есть, но учтём уникальность:
    const combinedSet = new Set([...masterDaysSet, ...employeeBusyDates]);
    const newBusyDatesArray = Array.from(combinedSet);

    // Порядок на всякий случай отсортируем по дате
    newBusyDatesArray.sort();

    // Делаем запрос на обновление busy_dates_array
    const { data, error } = await supabase
      .from("Employees")
      .update({ busy_dates_array: newBusyDatesArray })
      .eq("id", employeeId)
      .select();

    if (error) {
      console.error("Ошибка при обновлении busy_dates_array:", error);
      alert("Ошибка при сохранении данных!");
    } else {
      alert("Изменения успешно сохранены!");
    }
  });
})();
