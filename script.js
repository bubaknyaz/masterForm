const formWrapper = document.querySelector(".form__fields");

const calendarContainer = document.querySelector(".calendarContainer");
const recordInfoContainer = document.querySelector(".record-info");
const masterIdPromptButton = document.querySelector(".masterIdPrompt__button");
masterIdPromptButton.addEventListener("click", async () => {
  employeeId = Number(document.querySelector(".masterIdPrompt__input").value);
  document.querySelector(".masterIdPrompt").style.display = "none";
  document.querySelector(".formWrapper").style.display = "flex";
  await main();
});

const supabaseUrl = "https://eqznnarpanrfzwzjgksq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxem5uYXJwYW5yZnp3empna3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NjU3NDMsImV4cCI6MjA2MTE0MTc0M30.cqB9D02UwuZ7pNpsr-NwtkmLV9W2VJ78X7Fw8QIstbU";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let choosedDay = null;
var employeeId;
let employeeBusyDates = [];
let employeeRecords = [];
let recordDatesArray = [];

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

async function handleShowRecordInfo(clickedDate) {
  const dateKey = getDateKey(clickedDate);

  recordInfoContainer.innerHTML = "";

  try {
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

    for (let record of recordsData) {
      const recordDiv = document.createElement("div");
      recordDiv.className = "recordItem";
      recordDiv.innerHTML = `<h4>Запись: ${record.date}</h4>`;

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

      if (jsonData && typeof jsonData === "object") {
        const ul = document.createElement("ul");
        Object.entries(jsonData).forEach(([fieldKey, fieldValue]) => {
          const li = document.createElement("li");
          li.textContent = `${fieldsNameId[fieldKey]}: ${fieldValue}`;
          ul.appendChild(li);
        });
        recordDiv.appendChild(ul);
      } else {
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

async function main() {
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

  employeeBusyDates = employeeInfo["busy_dates_array"] || [];
  employeeRecords = employeeInfo["records_array"] || [];

  const employeeName = employeeInfo["name"];
  showGreeting(employeeName);

  if (employeeRecords.length > 0) {
    const { data: recordsData, error: recordsError } = await supabase
      .from("records")
      .select("*")
      .in("id", employeeRecords);
    if (recordsError) {
      console.error("Ошибка при получении данных из records:", recordsError);
    } else {
      recordDatesArray = recordsData.map((record) => record.date);
    }
  }

  const masterDaysArray = employeeBusyDates.filter(
    (dateStr) => !recordDatesArray.includes(dateStr)
  );

  const calendar = createCalendar({
    container: calendarContainer,
    initialDate: new Date(),
    masterDays: masterDaysArray,
    recordsDays: recordDatesArray,
    onDateSelect({ render, date, masterDaysSet, isRecorded }) {
      choosedDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      if (isRecorded) {
        handleShowRecordInfo(choosedDay);
      } else {
      }
    },
    width: "400px",
    tdPadding: "12px",
  });

  const saveButton = document.querySelector(".form__button");
  saveButton.addEventListener("click", async () => {
    const masterDaysSet = calendar.getMasterDays();

    const combinedSet = new Set([...masterDaysSet, ...employeeBusyDates]);
    const newBusyDatesArray = Array.from(combinedSet);

    newBusyDatesArray.sort();

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
}
