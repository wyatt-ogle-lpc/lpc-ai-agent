// app/javascript/settings/index.js
import { sanitize, formatVersionDescription } from "settings/helpers";
import { renderKnowledgeBases, showKbModal } from "settings/kb";
import { renderFunctions, showFunctionModal, bindFunctionEvents } from "settings/functions";
import { renderModelConfig, bindModelConfigEvents } from "settings/model_config";
import { renderGuardrails, showGuardrailModal } from "settings/guardrails";
import { renderInstructions, bindInstructionsEvents } from "settings/instructions";
import { fetchAgentVersions, renderVersions, bindVersionEvents, extractName } from "settings/version";


document.addEventListener("turbo:load", () => {
    const dropdown = document.getElementById("agent-select");
    const container = document.getElementById("agent-form-container");
  
    if (!dropdown || !container) return;
  
    // Attach the change handler first
    dropdown.addEventListener("change", async () => {
      const uuid = dropdown.value;
  
      // Update query param
      const url = new URL(window.location);
      if (uuid) {
        url.searchParams.set("agent", uuid);
      } else {
        url.searchParams.delete("agent");
      }
      window.history.pushState({}, "", url);
  
      if (!uuid) {
        container.innerHTML = "";
        return;
      }

      container.innerHTML = `<div class="loading-spinner"></div>`;
  
      try {
        const response = await fetch(`/settings/fetch/${uuid}`);
        if (!response.ok) throw new Error(`Failed with status ${response.status}`);
        const data = await response.json();
        const versions = await fetchAgentVersions(uuid);
        const currentVersion = versions.find(v => v.version_hash === data.version_hash);
        const descriptionToShow = currentVersion?.description || data.description;

        const editableRolesMeta = document.querySelector('meta[name="editable-roles"]')?.content;
        const editableRoles = editableRolesMeta ? editableRolesMeta.split(',').map(r => r.toLowerCase()) : [];

        const formattedRoles = editableRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1));

        const rolesDisplay = formattedRoles.length > 1
          ? `${formattedRoles.slice(0, -1).join(', ')} or ${formattedRoles.slice(-1)[0]}`
          : formattedRoles[0] || "N/A";
        
        const role = document.querySelector('meta[name="current-role"]')?.content.toLowerCase();
        const isEditable = editableRoles.includes(role);

        const tooltipHTML = `
          Role: ${role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}<br>
          Must be ${rolesDisplay} to edit.
        `;

      // Build sections
      container.innerHTML = `
        <div class="agent-overview-read-only-header">
          <h2>Agent Overview</h2>
          ${!isEditable ? `
          <div class="read-only-banner">
            <img src="${window.LOCK_ICON_PATH}" alt="Lock" class="lock-icon">
            <span>READ ONLY</span>
            <span class= "tooltip">
            ${tooltipHTML}
            </span>
          </div>
        ` : ""}
        </div>
        <div class="section">
          <p class="overview-line">
            <span class="overview-header">Name:</span>
            <span class="overview-value">${sanitize(data.name)}</span>
          </p>
          <p class="overview-line">
            <span class="overview-header">Status:</span>
            <span class="overview-value">
              ${sanitize(data.deployment?.status || "Unknown")}
              ${data.deployment?.status === "STATUS_RUNNING" ? '<span>✅</span>' : '<span>⚠️</span>'}
            </span>
          </p>
          <p class="overview-line">
            <span class="overview-header">Version:</span>
            <span class="overview-value">
              ${formatVersionDescription(descriptionToShow)}
            </span>
          </p>
        </div>

        <h3>Knowledge Bases</h3>
        <div class="section">
          ${renderKnowledgeBases(data.knowledge_bases, isEditable)}
        </div>

        <h3>Function Routes</h3>
        <div class="section">
          ${renderFunctions(data.functions)}
        </div>

        <h3>Agent Instructions</h3>
        <div class="section">
          ${renderInstructions(data, isEditable)}
        </div>

        <h3>Model Configuration</h3>
        ${renderModelConfig(data, isEditable)}


        <h3>Routing & Guardrails</h3>
        <div class="section">
          ${renderGuardrails(data.guardrails)}
        </div>

        <h3>Version Control</h3>
        <div class="section" id="version-section">
          <p>Loading versions...</p>
        </div>
      `;



      container.dataset.versionHash = data.version_hash;

      // Preload the version name using extractName
      const preloadedName = extractName(descriptionToShow || "");
      container.dataset.versionName = preloadedName;

      // Load versions
      const versionSection = document.getElementById("version-section");
      
      versionSection.innerHTML = renderVersions(versions, data.version_hash, isEditable);
      bindVersionEvents(uuid, isEditable);

      // Bind instruction events
      bindInstructionsEvents(uuid);
      bindModelConfigEvents(uuid);

      // Bind events for Guardrails
      container.querySelectorAll(".guardrail-item .clickable").forEach((el) => {
        el.addEventListener("click", () => {
          const parent = el.closest(".guardrail-item");
          showGuardrailModal({
            name: parent.dataset.name,
            description: parent.dataset.description,
            uuid: parent.dataset.uuid
          });
        });
      });

      // Bind events for KB items
      container.querySelectorAll(".kb-item .clickable").forEach((el) => {
        el.addEventListener("click", () => {
          const parent = el.closest(".kb-item");
          showKbModal({
            name: parent.dataset.name,
            region: parent.dataset.region,
            lastIndexed: parent.dataset.lastIndexed,
            uuid: parent.dataset.uuid,
          }, isEditable);
        });
      });

      // Bind events for Function routes
      bindFunctionEvents(uuid, isEditable);

    } catch (err) {
      container.innerHTML = `<p style="color:red;">Failed to load agent data.</p>`;
    }
  });
    // Then trigger change if query param exists
    const params = new URLSearchParams(window.location.search);
    const selectedUuid = params.get("agent");
    if (selectedUuid) {
      dropdown.value = selectedUuid;
      dropdown.dispatchEvent(new Event("change")); // now works
    }
});

document.querySelector(".back-link")?.addEventListener("click", (e) => {
  e.preventDefault();

  const container = document.getElementById("agent-form-container");

  if (!container || container.children.length === 0) {
    window.location.href = "/";
    return;
  }

  const versionName = container?.dataset.versionName || "";

  if (!versionName) {
    if (!confirm("Current version is unnamed. Name it before leaving?")) {
      return; // Stay on page
    }
  }

  window.location.href = "/";
});


