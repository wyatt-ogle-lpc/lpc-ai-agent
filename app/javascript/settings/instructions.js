//app/javascript/settings/instructions.js
import { sanitize } from "settings/helpers";

export function renderInstructions(data, isEditable = false) {
  return `
    <div class="instructions-container" data-mode="view">
      <pre class="instructions-text">${sanitize(data.instruction || "")}</pre>
      ${isEditable ? `
        <div class="instructions-actions">
          <button class="edit-instructions">Edit</button>
        </div>
      ` : ""}
    </div>
  `;
}

  export function bindInstructionsEvents(uuid) {
    const container = document.querySelector(".instructions-container");
    if (!container) return;
  
    const editBtn = container.querySelector(".edit-instructions");
    if (!editBtn) return;
  
    // Edit instructions
    editBtn.addEventListener("click", () => {
      const currentText = container.querySelector(".instructions-text").textContent;
  
      container.setAttribute("data-mode", "edit");
      container.innerHTML = `
        <textarea class="instructions-edit" rows="20">${currentText}</textarea>
        <div class="instructions-footer">
          <div class="instructions-actions">
            <button class="save-instructions">
              <span class="save-text">Save</span>
              <span class="inline-spinner" style="display: none;"></span>
              </button>
            <button class="cancel-edit">Cancel</button>
          </div>
          <div class="char-counter">0 / 10000</div>
        </div>
      `;

      const textarea = container.querySelector(".instructions-edit");
      const counter = container.querySelector(".char-counter");

      counter.textContent = `${textarea.value.length} / 10000`;

      textarea.addEventListener("input", () => {
        counter.textContent = `${textarea.value.length} / 10000`;
      });
  
      const saveBtn = container.querySelector(".save-instructions");
      const cancelBtn = container.querySelector(".cancel-edit");
  
      // Save event
      saveBtn.addEventListener("click", async () => {
        const newText = container.querySelector(".instructions-edit").value;
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        saveBtn.disabled = true;
        saveBtn.querySelector(".save-text").textContent = "Saving...";
        saveBtn.querySelector(".inline-spinner").style.display = "inline-block";
  
        try {
          const response = await fetch(`/settings/agents/${uuid}/instruction`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": token
            },
            body: JSON.stringify({ instruction: newText }),
          });
  
          if (!response.ok) throw new Error(`Failed to update: ${response.status}`);
          const updated = await response.json();
          saveBtn.disabled = false;
          saveBtn.querySelector(".save-text").textContent = "Save";
          saveBtn.querySelector(".inline-spinner").style.display = "none";
  
          container.setAttribute("data-mode", "view");
          container.outerHTML = renderInstructions(updated.agent, true);
          bindInstructionsEvents(uuid);
        } catch (err) {
          alert("Error saving instructions");
          saveBtn.disabled = false;
          saveBtn.querySelector(".save-text").textContent = "Save";
          saveBtn.querySelector(".inline-spinner").style.display = "none";
        }
      });
  
      // Cancel event
      cancelBtn.addEventListener("click", () => {
        container.setAttribute("data-mode", "view");
        container.outerHTML = renderInstructions({ instruction: currentText }, true);
        bindInstructionsEvents(uuid);
      });
    });
  }
  