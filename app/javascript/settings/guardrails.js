//app/javascript/settings/guardrails.js
import { sanitize } from "settings/helpers"; 

export function renderGuardrails(guardrails = []) {
  if (!guardrails.length) return "<p>No guardrails configured.</p>";
  return `<ul>${guardrails
    .map(
      (g) => `
        <li class="guardrail-item" 
            data-name="${sanitize(g.name)}" 
            data-uuid="${sanitize(g.uuid || "")}" 
            data-description="${sanitize(g.description || "")}">
          <span class="name clickable"><strong>${sanitize(g.name)}</strong></span> - 
          ${sanitize(g.description)}
        </li>`
    )
    .join("")}</ul>`;
}

export async function showGuardrailModal(guardrail) {
  // Prevent background scroll
  document.documentElement.style.overflow = "hidden";

  const modal = document.createElement("div");
  modal.className = "guardrail-modal-overlay";
  modal.innerHTML = `
    <div class="guardrail-modal">
      <button class="guardrail-modal-close">&times;</button>
      <h2>${sanitize(guardrail.name)}</h2>
      <p><strong>Description:</strong> ${sanitize(guardrail.description || "No description")}</p>
    </div>
  `;

  document.body.appendChild(modal);

  // Show modal with fade-in
  requestAnimationFrame(() => modal.classList.add("active"));

  // Close button handler
  modal.querySelector(".guardrail-modal-close").addEventListener("click", () => {
    modal.remove();
    document.documentElement.style.overflow = "";
  });

  // Click outside to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
      document.documentElement.style.overflow = "";
    }
  });
}
