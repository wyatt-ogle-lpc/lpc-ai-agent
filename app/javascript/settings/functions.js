//app/javascript/settings/functions.js
import { sanitize } from "settings/helpers"; 

// app/javascript/settings/functions.js

export function renderFunctions(funcs = []) {
  if (!funcs.length) return "<p>No function routes.</p>";
  return `<ul>${funcs
    .map(
      (fn) => `
      <li class="function-item"
        data-name="${sanitize(fn.name)}"
        data-description="${sanitize(fn.description)}"
        data-function-uuid="${sanitize(fn.uuid)}"
        data-faas-name="${sanitize(fn.faas_name || '')}"
        data-faas-namespace="${sanitize(fn.faas_namespace || '')}"
        data-input-schema='${JSON.stringify(fn.input_schema || {}).replace(/'/g, "&apos;")}'
        data-output-schema='${JSON.stringify(fn.output_schema || {}).replace(/'/g, "&apos;")}'>
        <span class="name clickable">${sanitize(fn.name)}</span> - 
        ${sanitize(fn.description)}
      </li>`
    )
    .join("")}</ul>`;
}


export function showFunctionModal(fn, agentUUID, functionUUID, isEditable = false) {
  // Prevent background scroll
  document.documentElement.style.overflow = 'hidden';

  const modal = document.createElement("div");
  modal.className = "kb-modal-overlay"; // reuse same overlay style
  modal.innerHTML = `
    <div class="kb-modal">
      <button class="kb-modal-close">&times;</button>
      <h2>${fn.name}</h2>
      <p><strong>Instructions:</strong> <span class="fn-description">${fn.description}</span></p>
      
      <div class="schema-section">
        <h3>Input Schema <span class="schema-note"> - Used to define variables that are expected from the agent for the function call</span></h3>
        <pre class="schema-block">${sanitize(JSON.stringify(fn.input_schema, null, 2))}</pre>
      </div>
      
      <div class="schema-section">
        <h3>Output Schema <span class="schema-note"> - Only used to define variables used for chaining functions</span></h3>
        <pre class="schema-block">${sanitize(JSON.stringify(fn.output_schema, null, 2))}</pre>
      </div>
      

      ${isEditable ? `<button class="modal-btn">Edit Function</button>` : ""}
    </div>
  `;

  document.body.appendChild(modal);

  requestAnimationFrame(() => modal.classList.add("active"));

  // Close button handler
  modal.querySelector(".kb-modal-close").addEventListener("click", () => {
    modal.remove();
    document.documentElement.style.overflow = '';
  });

  // Click outside to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
      document.documentElement.style.overflow = '';
    }
  });

  if (isEditable) {
    modal.querySelector(".modal-btn").addEventListener("click", () => {
      openFunctionEditModal(fn, agentUUID, functionUUID, modal);
    });
  }
}


export function bindFunctionEvents(agentUUID, isEditable = false) {
  document.querySelectorAll(".function-item .clickable").forEach((clickableSpan) => {
    clickableSpan.addEventListener("click", () => {
      const item = clickableSpan.closest(".function-item");
      if (!item) return;
      const functionUUID = item.dataset.functionUuid;
      if (!functionUUID) {
        alert("Cannot open function details: UUID is missing.");
        return;
      }
      
      // Parse the schema JSON from the data attributes
      const fn = {
        name: item.dataset.name,
        description: item.dataset.description,
        function_uuid: functionUUID,
        faas_name: item.dataset.faasName,
        faas_namespace: item.dataset.faasNamespace,
        input_schema: JSON.parse(item.dataset.inputSchema),
        output_schema: JSON.parse(item.dataset.outputSchema)
      };

      showFunctionModal(fn, agentUUID, fn.function_uuid, isEditable);
    });
  });
}

async function openFunctionEditModal(fn, agentUUID, functionUUID, modal) {
  // This is the logic that was missing:
  const modalContent = modal.querySelector(".kb-modal");

  // Replace modal content with editable textarea
  modalContent.innerHTML = `
  <button class="kb-modal-close">&times;</button>
  <h2>${fn.name}</h2>

  <label>Description</label>
  <textarea class="function-edit styled-textarea" rows="4">${fn.description || ""}</textarea>
  <div class="char-counter">0 / 1000</div>

  <label>Input Schema (JSON)</label>
  <textarea class="function-input-schema styled-textarea" rows="6">${JSON.stringify(fn.input_schema, null, 2)}</textarea>

  <label>Output Schema (JSON)</label>
  <textarea class="function-output-schema styled-textarea" rows="6">${JSON.stringify(fn.output_schema, null, 2)}</textarea>

  <div class="instructions-footer">
    <div class="instructions-actions">
      <button class="save-function modal-btn">Save</button>
      <button class="cancel-edit modal-btn">Cancel</button>
    </div>
  </div>
`;

  // Counter logic
  const textarea = modalContent.querySelector(".function-edit");
  const counter = modalContent.querySelector(".char-counter");
  counter.textContent = `${textarea.value.length} / 1000`;

  textarea.addEventListener("input", () => {
    counter.textContent = `${textarea.value.length} / 1000`;
  });

  // Close button logic
  modalContent.querySelector(".kb-modal-close").addEventListener("click", () => {
    modal.remove();
    document.documentElement.style.overflow = '';
  });

  // Cancel button logic — revert back to original view
  modalContent.querySelector(".cancel-edit").addEventListener("click", () => {
    modal.remove();
    document.documentElement.style.overflow = '';
    showFunctionModal(fn, agentUUID, functionUUID, true);
  });
  
  // This is the save button listener you already had:
  modalContent.querySelector(".save-function").addEventListener("click", async () => {
    const newDescription = modalContent.querySelector(".function-edit").value.trim();
    let newInputSchema = {};
    let newOutputSchema = {};
  
    try {
      newInputSchema = JSON.parse(modalContent.querySelector(".function-input-schema").value);
      newOutputSchema = JSON.parse(modalContent.querySelector(".function-output-schema").value);
    } catch (err) {
      alert("Invalid JSON in schema fields.");
      return;
    }
  
    const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content'); // <-- missing in your code
  
    try {
      const response = await fetch(`/settings/agents/${agentUUID}/functions/${functionUUID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token
        },
        body: JSON.stringify({
          description: newDescription,
          function_name: fn.name,
          faas_name: fn.faas_name || "",
          faas_namespace: fn.faas_namespace || "",
          input_schema: newInputSchema,
          output_schema: newOutputSchema
        }),
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: "Failed to parse error response." }));
        console.error("Update failed:", errorBody);
        throw new Error(`Failed to update: ${response.status}`);
      }
  
      const updated = await response.json();

      document.dispatchEvent(new CustomEvent("agent:functionUpdated", {
        detail: {
          agentUUID,
          functionUUID,
          updatedFunction: {
            ...fn,
            description: newDescription,
            input_schema: newInputSchema,
            output_schema: newOutputSchema
          }
        }
      }));
      
      // (optional) keep the modal in view with fresh data:
      modal.remove();
      document.documentElement.style.overflow = '';
      const dropdown = document.getElementById("agent-select");
      if (dropdown) {
        dropdown.value = agentUUID;
        dropdown.dispatchEvent(new Event("change"));
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert("Error saving function description. Check the console for details.");
      console.error(err);
    }
  });
  
}