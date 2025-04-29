const formWrapper = document.querySelector(".form__fields");

const supabaseUrl = "https://eqznnarpanrfzwzjgksq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxem5uYXJwYW5yZnp3empna3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NjU3NDMsImV4cCI6MjA2MTE0MTc0M30.cqB9D02UwuZ7pNpsr-NwtkmLV9W2VJ78X7Fw8QIstbU";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document
  .querySelector(".masterIdPrompt__button")
  .addEventListener("click", async () => {
    masterId = Number(document.querySelector(".masterIdPrompt__input").value);
    document.querySelector(".formWrapper").style.display = "flex";
    document.querySelector(".masterIdPrompt").style.display = "none";

    await main();
  });

var masterId;
var empFieldsIds;
var fields;

function createInputField(type, name, status, id) {
  const inputWrapper = document.createElement("div");
  inputWrapper.classList.add("input__wrapper");

  const inputTitle = document.createElement("div");
  inputTitle.classList.add("input__title");
  inputTitle.textContent = name;

  const itemWrapper = document.createElement("div");
  itemWrapper.classList.add("item__wrapper");

  const checkBox = document.createElement("input");
  checkBox.type = "checkbox";
  checkBox.checked = status;
  checkBox.addEventListener("change", async (e) => {
    await supabase
      .from("Employees")
      .update({
        fields: fields
          .filter((f) => {
            if (f.id == id) {
              return e.target.checked;
            }

            return empFieldsIds.includes(f.id);
          })
          .map((f) => f.id),
      })
      .eq("id", masterId)
      .select();
  });

  let item = document.createElement("input");
  switch (type) {
    case "text":
      item.type = "text";
      break;
    case "date":
      item = document.createElement("div");

      createCalendar({
        container: item,
        initialDate: new Date(),
        selectedDates: [new Date()],
        onDateSelect: (data) => console.log("Selected:", data.selectedDates),
        width: "300px",
        tdPadding: "12px",
      });

      break;
  }

  itemWrapper.append(checkBox);
  itemWrapper.append(item);

  inputWrapper.append(inputTitle);
  inputWrapper.append(itemWrapper);

  return inputWrapper;
}

async function main() {
  fields = (await supabase.from("Fields").select("*")).data.sort(
    (a, b) => a.id - b.id
  );

  // console.log(await supabase.from("Employees").select("*").eq("id", masterId));

  empFieldsIds = (
    await supabase.from("Employees").select("*").eq("id", masterId)
  ).data[0]["fields"];

  for (const field of fields) {
    console.log(field.type);
    const inputField = createInputField(
      field.type,
      field.name,
      empFieldsIds.includes(field.id),
      field.id
    );
    formWrapper.append(inputField);
  }
}
