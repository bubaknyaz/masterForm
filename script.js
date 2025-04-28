const formWrapper = document.querySelector(".form__fields");

const calendarContainer = document.querySelector(".calendarContainer");
const recordInfoContainer = document.querySelector(".record-info");
const masterIdPromptButton = document.querySelector(".masterIdPrompt__button");
(async () => {
  await new Promise((r) => setTimeout(r, 500));
  const url = new URL(window.location.href);
  employeeId = Number(url.searchParams.get("masterId"));
  console.log(employeeId);
  await main();
})();

const supabaseUrl = "https://eqznnarpanrfzwzjgksq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxem5uYXJwYW5yZnp3empna3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NjU3NDMsImV4cCI6MjA2MTE0MTc0M30.cqB9D02UwuZ7pNpsr-NwtkmLV9W2VJ78X7Fw8QIstbU";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let choosedDay = null;
var employeeId;
let employeeMasterDays = [];
let employeeSlots = {};
let employeeNotWeekends = [];
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

async function handleShowRecordInfo(dateKey, recordId) {
  recordInfoContainer.innerHTML = "";

  try {
    const { data: recordData, error } = await supabase
      .from("records")
      .select("*")
      .eq("id", recordId)
      .single();

    if (error) {
      console.error("Ошибка при запросе информации о записи:", error);
      recordInfoContainer.textContent =
        "Ошибка при запросе информации о записи.";
      return;
    }

    if (!recordData) {
      recordInfoContainer.textContent = "Запись не найдена.";
      return;
    }

    const recordDiv = document.createElement("div");
    recordDiv.className = "recordItem";
    recordDiv.innerHTML = `<h4>Запись: ${recordData.date}</h4>`;

    let jsonData = recordData.record_info;
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

  employeeMasterDays = employeeInfo["busy_dates_array"] || [];
  employeeSlots = employeeInfo["slots"] || {};
  employeeNotWeekends = employeeInfo["not_weekends"] || [];

  const employeeName = employeeInfo["name"];
  showGreeting(employeeName);

  recordDatesArray = [];
  for (const [date, slots] of Object.entries(employeeSlots)) {
    if (slots.some((slot) => slot[2])) {
      recordDatesArray.push(date);
    }
  }

  const calendar = createCalendar({
    container: calendarContainer,
    initialDate: new Date(),
    masterDays: employeeMasterDays,
    recordsDays: recordDatesArray,
    notWeekends: employeeNotWeekends,
    onDateSelect({ render, date, masterDaysSet, notWeekendsSet, isRecorded }) {
      choosedDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      const dateKey = getDateKey(choosedDay);

      if (isRecorded) {
        recordInfoContainer.innerHTML = "";
        recordInfoContainer.append(
          showDayEditor(dateKey, masterDaysSet, notWeekendsSet)
        );
        recordInfoContainer.append(showRecordedSlots(dateKey));
        document.querySelector(".slot-toggle").remove();
      } else {
        recordInfoContainer.innerHTML = "";
        recordInfoContainer.appendChild(
          showDayEditor(dateKey, masterDaysSet, notWeekendsSet)
        );
      }
    },
    width: "400px",
    tdPadding: "12px",
  });

  function showRecordedSlots(dateKey) {
    const slots = employeeSlots[dateKey] || [];
    const recordedSlots = slots.filter((slot) => slot[2]);

    if (recordedSlots.length === 0) {
      recordInfoContainer.textContent = "Нет записей на эту дату.";
      return;
    }

    const slotList = document.createElement("div");
    slotList.className = "slot-list";

    recordedSlots.forEach((slot) => {
      const [start, end, isBusy, recordId] = slot;
      const slotDiv = document.createElement("div");
      slotDiv.className = "slot-item";
      slotDiv.textContent = `Слот ${start} - ${end}`;
      slotDiv.addEventListener("click", () => {
        handleShowRecordInfo(dateKey, recordId);
      });
      slotList.appendChild(slotDiv);
    });

    return slotList;
  }

  function showDayEditor(dateKey, masterDaysSet, notWeekendsSet) {
    const isMasterDay = masterDaysSet.has(dateKey);
    const isWeekend =
      new Date(dateKey).getDay() === 0 || new Date(dateKey).getDay() === 6;
    const isNotWeekend = notWeekendsSet.has(dateKey);

    const editorDiv = document.createElement("div");
    editorDiv.className = "day-editor";

    const toggleLabel = document.createElement("label");
    toggleLabel.textContent = "Выходной";
    toggleLabel.classList.add("slot-toggle");
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = isMasterDay || (isWeekend && !isNotWeekend);
    toggleInput.addEventListener("change", () => {
      if (toggleInput.checked) {
        if (isWeekend) {
          notWeekendsSet.delete(dateKey);
        } else {
          masterDaysSet.add(dateKey);
        }
      } else {
        if (isWeekend) {
          notWeekendsSet.add(dateKey);
        } else {
          masterDaysSet.delete(dateKey);
        }
      }
    });
    toggleLabel.appendChild(toggleInput);
    editorDiv.appendChild(toggleLabel);

    const slotsContainer = document.createElement("div");
    slotsContainer.className = "slots-container";

    const addSlotBlock = () => {
      const slotDiv = document.createElement("div");
      slotDiv.className = "slot-block";

      const startInput = document.createElement("input");
      startInput.type = "time";
      startInput.className = "slot-start";

      const endInput = document.createElement("input");
      endInput.type = "time";
      endInput.className = "slot-end";

      slotDiv.appendChild(startInput);
      slotDiv.appendChild(endInput);

      slotsContainer.appendChild(slotDiv);
    };

    const addSlotButton = document.createElement("button");
    addSlotButton.classList.add("slot-plus__button");
    addSlotButton.textContent = "+";
    addSlotButton.addEventListener("click", addSlotBlock);

    const saveButton = document.createElement("button");
    saveButton.classList.add("slot-save__button");
    saveButton.textContent = "Сохранить";
    saveButton.addEventListener("click", async () => {
      const slots = [];
      const slotBlocks = slotsContainer.querySelectorAll(".slot-block");
      slotBlocks.forEach((block) => {
        const start = block.querySelector(".slot-start").value;
        const end = block.querySelector(".slot-end").value;
        if (start && end) {
          slots.push([start, end, false, -1]);
        }
      });

      employeeSlots[dateKey] = slots;

      const { data, error } = await supabase
        .from("Employees")
        .update({
          slots: employeeSlots,
          busy_dates_array: Array.from(masterDaysSet),
          not_weekends: Array.from(notWeekendsSet),
        })
        .eq("id", employeeId)
        .select();

      if (error) {
        console.error("Ошибка при обновлении данных:", error);
        alert("Ошибка при сохранении данных!");
      } else {
        alert("Изменения успешно сохранены!");

        calendar.setDate(new Date());
      }
    });

    const existingSlots = employeeSlots[dateKey] || [];
    existingSlots.forEach((slot) => {
      addSlotBlock();
      const lastSlotBlock = slotsContainer.lastChild;
      lastSlotBlock.querySelector(".slot-start").value = slot[0];
      lastSlotBlock.querySelector(".slot-end").value = slot[1];
    });

    editorDiv.appendChild(slotsContainer);
    editorDiv.appendChild(addSlotButton);
    editorDiv.appendChild(saveButton);

    return editorDiv;
  }
}
