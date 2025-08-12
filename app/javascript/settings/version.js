// app/javascript/settings/version.js
import { sanitize } from "settings/helpers";

export async function fetchAgentVersions(uuid) {
    try {
      const response = await fetch(`/settings/agents/${uuid}/versions`);
      if (!response.ok) throw new Error(`Failed with status ${response.status}`);
      return (await response.json()).agent_versions || [];
    } catch (error) {
      console.error("Error fetching agent versions:", error);
      return [];
    }
  }

  export function renderVersions(versions, currentHash, isEditable = false) {
    const cutoffDate = new Date("2025-07-30T17:00:00-07:00"); // This just cuts off versions that were used for testing
  
    const currentVersion = versions.find(v => v.version_hash === currentHash);
  
    const named = versions.filter(v => {
      const hasDesc = v.description && v.description.trim() !== "" && v.description.trim() !== "Unnamed";
      const createdDate = new Date(v.created_at);
      return v.version_hash !== currentHash && hasDesc && createdDate >= cutoffDate;
    });
  
    const unnamed = versions.filter(v => 
      v.version_hash !== currentHash && (!v.description || v.description.trim() === "" || v.description.trim() === "Unnamed")
    );
  
    function renderList(list, isNamed) {
      return list.map(v => {
        const displayName = isNamed
          ? `<span class="name clickable">${sanitize(extractName(v.description))}</span>`
          : sanitize(v.version_hash.substring(0, 10));
  
        const isCurrent = v.version_hash === currentHash;
  
        return `
          <li class="version-item"
              data-hash="${sanitize(v.version_hash)}"
              data-description="${sanitize(v.description || '')}"
              data-created="${new Date(v.created_at).toLocaleString()}">
            <span class="version-name">
              ${displayName}
            </span>
            <span class="version-date"> (${new Date(v.created_at).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })})</span>
            ${isEditable && !isCurrent ? `
              <button class="rollback-btn" 
                data-hash="${sanitize(v.version_hash)}"
                data-name="${sanitize(extractName(v.description) || v.version_hash.substring(0,10))}"
                ${isCurrent ? 'disabled' : ''}>
                Revert
              </button>
            ` : ""}
          </li>
        `;
      }).join('');
    }
  
    const currentSection = currentVersion ? `
      <div class="current-version">
        <h3>Current Version</h3>
        <ul class="version-list">
          ${renderList([currentVersion], !!currentVersion.description)}
        </ul>
      </div>
    ` : '';
  
    return `
      ${isEditable ? `
        <div class="name-version">
          <span class="version-header">Create New Version</span>
          <input type="text" id="version-name-input" placeholder="Enter version name" />
          <textarea id="version-description-input" placeholder="Enter version description"></textarea>
          <button id="save-version-btn">
            <span class="save-text">Save Version</span>
            <span class="inline-spinner" style="display: none;"></span>
          </button>
        </div>
      ` : ""}
      ${currentSection}
      <h3>Past Versions</h3>
      <ul class="version-list">
        ${renderList(named, true)}
      </ul>
      ${unnamed.length > 0 ? `
        <button id="toggle-unnamed-btn">Show Unnamed Versions (${unnamed.length})</button>
        <ul class="version-list hidden" id="unnamed-versions">
          ${renderList(unnamed, false)}
        </ul>
      ` : ''}
    `;
  }
  
  
  

  export function bindVersionEvents(uuid, isEditable = false) {
    if (isEditable) {
      document.querySelectorAll(".rollback-btn").forEach(button => {
        button.addEventListener("click", async () => {
          const name = button.dataset.name || button.dataset.hash;
          if (!confirm(`Revert to version "${name}"?`)) return;
          saveBtn.disabled = true;
          saveBtn.querySelector(".save-text").textContent = "Saving...";
          saveBtn.querySelector(".inline-spinner").style.display = "inline-block";
          try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            const response = await fetch(`/settings/agents/${uuid}/versions`, {
              method: "PUT",
              headers: {
                  "Content-Type": "application/json",
                  "X-CSRF-Token": csrfToken
                },
              body: JSON.stringify({ version_hash: button.dataset.hash })
            });
            if (!response.ok) throw new Error(`Failed with status ${response.status}`);
            alert("Agent reverted successfully.");
            saveBtn.disabled = false;
            saveBtn.querySelector(".save-text").textContent = "Save Version";
            saveBtn.querySelector(".inline-spinner").style.display = "none";
            window.location.reload();
          } catch (error) {
            alert("Failed to revert version.");
            saveBtn.disabled = false;
            saveBtn.querySelector(".save-text").textContent = "Save Version";
            saveBtn.querySelector(".inline-spinner").style.display = "none";
            console.error(error);
          }
        });
      });
  
      const saveBtn = document.getElementById("save-version-btn");
      if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
          const nameInput = document.getElementById("version-name-input").value.trim();
          const descInput = document.getElementById("version-description-input").value.trim();
      
          if (!nameInput) {
            alert("Please enter a version name.");
            return;
          }
      
          // Fetch existing versions to check for duplicates
          const versions = await fetchAgentVersions(uuid);
      
          // Extract existing names
          const existingNames = versions.map(v => extractName(v.description)).filter(Boolean);
      
          // Generate unique name by appending (1), (2), etc. if duplicate found
          let finalName = nameInput;
          let counter = 1;
          while (existingNames.includes(finalName)) {
            finalName = `${nameInput} (${counter})`;
            counter++;
          }
      
          const combinedDescription = `<<Name:>> ${finalName}\n<<Description:>> ${descInput || 'No description provided'}`;
          saveBtn.disabled = true;
          saveBtn.querySelector(".save-text").textContent = "Saving...";
          saveBtn.querySelector(".inline-spinner").style.display = "inline-block";
          try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            const response = await fetch(`/settings/agents/${uuid}/name_version`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
              },
              body: JSON.stringify({ description: combinedDescription })
            });
            if (!response.ok) throw new Error(`Failed with status ${response.status}`);
            window.location.reload();
            saveBtn.disabled = false;
            saveBtn.querySelector(".save-text").textContent = "Save Version";
            saveBtn.querySelector(".inline-spinner").style.display = "none";
          } catch (error) {
            alert("Failed to name version.");
            saveBtn.disabled = false;
            saveBtn.querySelector(".save-text").textContent = "Save Version";
            saveBtn.querySelector(".inline-spinner").style.display = "none";
            console.error(error);
          }
        });
      }
      
    }
  
    // Toggle unnamed versions (still available to all users)
    const toggleBtn = document.getElementById("toggle-unnamed-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const unnamedList = document.getElementById("unnamed-versions");
        unnamedList.classList.toggle("hidden");
        toggleBtn.textContent = unnamedList.classList.contains("hidden")
          ? `Show Unnamed Versions (${unnamedList.children.length})`
          : "Hide Unnamed Versions";
      });
    }
  
    // Version detail modal (still available to all users)
    document.querySelectorAll(".version-item .name.clickable").forEach(item => {
      item.addEventListener("click", (e) => {
        const parentLi = item.closest(".version-item");
        showVersionModal({
          hash: parentLi.dataset.hash,
          description: parentLi.dataset.description,
          created: parentLi.dataset.created
        });
      });
    });
  }
  
  
  export function showVersionModal(version) {
    document.documentElement.style.overflow = 'hidden';
  
    // Parse name/description from wrapped format
    const lines = (version.description || "").split("\n");
    const nameLine = lines.find(l => l.startsWith("<<Name:>>")) || "";
    const descLine = lines.find(l => l.startsWith("<<Description:>>")) || "";
  
    const name = nameLine.replace("<<Name:>>", "").trim();
    const description = descLine.replace("<<Description:>>", "").trim();
  
    const modal = document.createElement("div");
    modal.className = "kb-modal-overlay"; // reuse KB modal styles
    modal.innerHTML = `
      <div class="kb-modal">
        <button class="kb-modal-close">&times;</button>
        <h2>Version Details</h2>
        <p><strong>Version Hash:</strong> ${sanitize(version.hash)}</p>
        <p><strong>Name:</strong> ${sanitize(name || "Unnamed")}</p>
        <p><strong>Date:</strong> ${sanitize(version.created)}</p>
        <p><strong>Description:</strong> ${sanitize(description || "No description provided")}</p>
      </div>
    `;
  
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("active"));
  
    modal.querySelector(".kb-modal-close").addEventListener("click", () => {
      modal.remove();
      document.documentElement.style.overflow = '';
    });
  
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        document.documentElement.style.overflow = '';
      }
    });
  }

  export function extractName(desc) {
    if (!desc) return "";
    const nameLine = desc.split("\n").find(l => l.startsWith("<<Name:>>")) || "";
    return nameLine.replace("<<Name:>>", "").trim();
  }

