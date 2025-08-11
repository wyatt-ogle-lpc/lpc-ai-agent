// app/javascript/settings/model_config.js
export function renderModelConfig(data, isEditable = false) {
  const retrievalOptions = {
    RETRIEVAL_METHOD_REWRITE: {
      name: "Rewrite",
      description: "Refines the query for better retrieval."
    },
    RETRIEVAL_METHOD_STEP_BACK: {
      name: "Step Back",
      description: "Broadens the query for more context."
    },
    RETRIEVAL_METHOD_SUB_QUERIES: {
      name: "Sub Queries",
      description: "Splits into multiple focused queries."
    },
    RETRIEVAL_METHOD_NONE: {
      name: "None",
      description: "Uses the original query as-is."
    },
    RETRIEVAL_METHOD_UNKNOWN: {
      name: "Unknown",
      description: "Retrieval method is not specified."
    }
  };

  return `
    <div class="model-config-group ${!isEditable ? "read-only" : ""}">
      <!-- Max Tokens -->
      <label for="max_tokens" class="config-tooltip-wrapper">
        Max Tokens
        <span class="config-tooltip-text">
          The maximum number of tokens the model will intake to send to the LLM, and then generate to return a response.
        </span>
      </label>
      <div class="slider-row">
        <span class="min">1</span>
        <input type="range" id="max_tokens" name="agent[max_tokens]" min="1" max="1024" step="1"
          value="${data.max_tokens ?? 512}" ${!isEditable ? "disabled" : ""}>
        <span class="max">1024</span>
        <input type="number" class="manual-input" value="${data.max_tokens ?? 512}" min="1" max="1024" ${!isEditable ? "disabled" : ""}>
      </div>

      <!-- Temperature -->
      <label for="temperature" class="config-tooltip-wrapper">
        Temperature
        <span class="config-tooltip-text">
          How creative or predictable a model’s response is. Higher temperatures produce more creative or unpredictable responses.
        </span>
      </label>
      <div class="slider-row">
        <span class="min">0.0</span>
        <input type="range" id="temperature" name="agent[temperature]" min="0" max="1" step="0.01"
          value="${data.temperature ?? 0.7}" ${!isEditable ? "disabled" : ""}>
        <span class="max">1.0</span>
        <input type="number" class="manual-input" value="${data.temperature ?? 0.7}" min="0" max="1" step="0.01" ${!isEditable ? "disabled" : ""}>
      </div>

      <!-- Top-P -->
      <label for="top_p" class="config-tooltip-wrapper">
        Top P
        <span class="config-tooltip-text">
          Top P controls how many words are considered when the model formulates an output. Higher top P means more words are considered.
        </span>
      </label>
      <div class="slider-row">
        <span class="min">0.1</span>
        <input type="range" id="top_p" name="agent[top_p]" min="0.1" max="1" step="0.01"
          value="${data.top_p ?? 0.9}" ${!isEditable ? "disabled" : ""}>
        <span class="max">1.0</span>
        <input type="number" class="manual-input" value="${data.top_p ?? 0.9}" min="0.1" max="1" step="0.01" ${!isEditable ? "disabled" : ""}>
      </div>

      <!-- K -->
      <label for="k" class="config-tooltip-wrapper">
        K-Value
        <span class="config-tooltip-text">
          How many objects to return from a knowledge base query.
        </span>
      </label>
      <div class="slider-row">
        <span class="min">0</span>
        <input type="range" id="k" name="agent[k]" min="0" max="10" step="1"
          value="${data.k ?? 1}" ${!isEditable ? "disabled" : ""}>
        <span class="max">10</span>
        <input type="number" class="manual-input" value="${data.k ?? 1}" min="0" max="10" ${!isEditable ? "disabled" : ""}>
      </div>

      <!-- Retrieval Method Dropdown -->
      <label for="retrieval_method">Retrieval Method</label>
      <div class="custom-dropdown ${!isEditable ? "disabled" : ""}" id="retrieval-method-dropdown" role="listbox" tabindex="0">
        <div class="dropdown-selected">
          <span class="dropdown-name">${retrievalOptions[data.retrieval_method].name}</span>
          <span class="dropdown-description">
            ${retrievalOptions[data.retrieval_method].description} (${data.retrieval_method})
          </span>
        </div>
        <ul class="dropdown-list">
          ${Object.entries(retrievalOptions)
            .map(
              ([key, { name, description }]) => `
                <li class="dropdown-item" data-value="${key}">
                  <strong class="dropdown-name">${name}</strong>
                  <div class="dropdown-description">${description} (${key})</div>
                </li>
              `
            )
            .join("")}
        </ul>
      </div>
          
      <input type="hidden" name="agent[retrieval_method]" id="retrieval_method" value="${data.retrieval_method}">

      ${isEditable ? `
        <button type="button" class="save-model-config">
          <span class="save-text">Save Configuration</span>
          <span class="inline-spinner" style="display: none;"></span>
        </button>
      ` : ""}
    </div>
  `;
}

  
  
  
export function bindModelConfigEvents(uuid) {
  const saveBtn = document.querySelector(".save-model-config");
  if (!saveBtn) {
    // If there's no save button, this section is read-only
    return;
  }

  // Slider sync
  document.querySelectorAll('.slider-row').forEach(row => {
    const slider = row.querySelector('input[type="range"]');
    const manual = row.querySelector('.manual-input');

    slider.addEventListener('input', () => {
      manual.value = slider.value;
    });

    manual.addEventListener('input', () => {
      let value = parseFloat(manual.value);
      if (value < parseFloat(slider.min)) value = parseFloat(slider.min);
      if (value > parseFloat(slider.max)) value = parseFloat(slider.max);
      slider.value = value;
    });
  });

  bindCustomDropdown();

  // Save button handler
  saveBtn.addEventListener("click", async () => {
    const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    saveBtn.disabled = true;
    saveBtn.querySelector(".save-text").textContent = "Saving...";
    saveBtn.querySelector(".inline-spinner").style.display = "inline-block";
    const payload = {
      max_tokens: parseInt(document.querySelector("#max_tokens").value, 10),
      temperature: parseFloat(document.querySelector("#temperature").value),
      top_p: parseFloat(document.querySelector("#top_p").value),
      k: parseInt(document.querySelector("#k").value, 10),
      retrieval_method: document.querySelector("#retrieval_method").value,
    };

    try {
      const response = await fetch(`/settings/agents/${uuid}/model_config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Failed to update: ${response.status}`);
      saveBtn.disabled = false;
      saveBtn.querySelector(".save-text").textContent = "Save Configuration";
      saveBtn.querySelector(".inline-spinner").style.display = "none";
    } catch (err) {
      alert("Error saving configuration");
      saveBtn.disabled = false;
      saveBtn.querySelector(".save-text").textContent = "Save Configuration";
      saveBtn.querySelector(".inline-spinner").style.display = "none";
    }
  });
}

  
  export function bindCustomDropdown() {
    const dropdown = document.getElementById("retrieval-method-dropdown");
    const selected = dropdown.querySelector(".dropdown-selected");
    const list = dropdown.querySelector(".dropdown-list");
    const hiddenInput = document.getElementById("retrieval_method");
  
    // Toggle list visibility
    selected.addEventListener("click", () => {
      list.classList.toggle("show");
    });
  
    // Select an item
    list.querySelectorAll(".dropdown-item").forEach(item => {
      item.addEventListener("click", () => {
        const value = item.dataset.value;
        const name = item.querySelector(".dropdown-name").textContent;
        const description = item.querySelector(".dropdown-description").textContent;
  
        // Update selected display
        selected.innerHTML = `
          <span class="dropdown-name">${name}</span>
          <span class="dropdown-description">${description}</span>
        `;
  
        // Update hidden input
        hiddenInput.value = value;
  
        list.classList.remove("show");
      });
    });
  
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        list.classList.remove("show");
      }
    });
  }
  