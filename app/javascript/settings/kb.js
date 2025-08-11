//app/javascript/settings/kb.js
import { sanitize, formatReadableDate } from "settings/helpers"; 

export function renderKnowledgeBases(kbs = [], isEditable = false) {
  if (!kbs.length) return "<p>No knowledge bases attached.</p>";
  return `<ul>${kbs
    .map(
      (kb) => `
      <li class="kb-item"
          data-name="${sanitize(kb.name)}"
          data-region="${sanitize(kb.region)}"
          data-last-indexed="${sanitize(formatReadableDate(kb.last_indexing_job.finished_at))}"
          data-uuid="${sanitize(kb.uuid)}">
        <span class="name clickable">${sanitize(kb.name)}</span> - 
        Last Indexed: ${sanitize(formatReadableDate(kb.last_indexing_job.finished_at))}
      </li>`
    )
    .join("")}</ul>`;
}

// Modal logic (includes delete handling)
export async function showKbModal(kb, isEditable = false) {
  document.documentElement.style.overflow = 'hidden';

  const modal = document.createElement("div");
  modal.className = "kb-modal-overlay";
  modal.innerHTML = `
    <div class="kb-modal">
      <button class="kb-modal-close">&times;</button>
      <h2>${kb.name}</h2>
      <p><strong>Region:</strong> ${kb.region}</p>
      <p><strong>Last Indexed:</strong> ${kb.lastIndexed}</p>
      <p><strong>UUID:</strong> ${kb.uuid}</p>

      <h3>Data Sources</h3>
      <div id="kb-data-sources">
        <p>Loading data sources...</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Show modal with fade-in
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

  // Fetch and render data sources
  try {
    const response = await fetch(`/settings/fetch_kb_data_sources/${kb.uuid}`);
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();

    const sourcesContainer = modal.querySelector("#kb-data-sources");
    const sources = data.knowledge_base_data_sources;

    if (!sources.length) {
      sourcesContainer.innerHTML = "<p>No data sources found.</p>";
    } else {
      sourcesContainer.innerHTML = `
        <ul>
          ${sources.map(src => renderDataSource(src, kb.uuid, isEditable)).join("")}
        </ul>
      `;

      if (isEditable) {
        sourcesContainer.querySelectorAll(".modal-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to delete this data source?")) return;

            try {
              const res = await fetch(`/settings/delete_kb_data_source/${kb.uuid}/${btn.dataset.uuid}`, {
                method: 'DELETE',
                headers: {
                  'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
                }
              });
              if (!res.ok) throw new Error(`Failed: ${res.status}`);

              btn.closest(".kb-data-source").remove();
            } catch (err) {
              alert("Failed to delete data source");
            }
          });
        });
      }
    }
  } catch (err) {
    modal.querySelector("#kb-data-sources").innerHTML = `<p style="color:red;">Error loading data sources.</p>`;
  }
}

  

// Data source rendering
export function renderDataSource(src, kbUuid, isEditable = false) {
  const uuid = sanitize(src.uuid);
  const createdAt = formatReadableDate(src.created_at);
  const updatedAt = formatReadableDate(src.updated_at);
  const status = sanitize(src.last_datasource_indexing_job?.status || "Unknown");
  const completedAt = formatReadableDate(src.last_datasource_indexing_job?.completed_at);

  let details = "";
  if (src.file_upload_data_source) {
    details = `
      <p><strong>File Name:</strong> ${sanitize(src.file_upload_data_source.original_file_name)}</p>
      <p><strong>Size:</strong> ${sanitize(src.file_upload_data_source.size_in_bytes)} bytes</p>
    `;
  } else if (src.aws_data_source) {
    details = `
      <p><strong>AWS Bucket:</strong> ${sanitize(src.aws_data_source.bucket_name)}</p>
      <p><strong>Path:</strong> ${sanitize(src.aws_data_source.item_path)}</p>
    `;
  } else if (src.spaces_data_source) {
    details = `
      <p><strong>Spaces Bucket:</strong> ${sanitize(src.spaces_data_source.bucket_name)}</p>
      <p><strong>Path:</strong> ${sanitize(src.spaces_data_source.item_path)}</p>
    `;
  } else if (src.web_crawler_data_source) {
    details = `
      <p><strong>Base URL:</strong> ${sanitize(src.web_crawler_data_source.base_url)}</p>
      <p><strong>Crawling Option:</strong> ${sanitize(src.web_crawler_data_source.crawling_option)}</p>
    `;
  }

  return `
    <li class="kb-data-source">
      ${details}
      <p><strong>UUID:</strong> ${uuid}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Last Completed:</strong> ${completedAt}</p>
      <p><strong>Created At:</strong> ${createdAt}</p>
      <p><strong>Updated At:</strong> ${updatedAt}</p>
      ${isEditable ? `<button class="modal-btn" data-kb="${kbUuid}" data-uuid="${uuid}">Delete</button>` : ""}
    </li>
  `;
}


// Dropdown population
export async function populateBucketDropdown() {
    const response = await fetch("/settings/spaces_buckets");
    const buckets = await response.json();
  
    const selectWrapper = document.createElement("div");
  
    // Dropdown
    const select = document.createElement("select");
    select.id = "bucket_select";
  
    // Existing buckets
    buckets.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  
    // "Create new" option
    const createOpt = document.createElement("option");
    createOpt.value = "new";
    createOpt.textContent = "Create new bucket…";
    select.appendChild(createOpt);
  
    // Input for new bucket name (hidden by default, prefilled with ENV bucket)
    const newBucketInput = document.createElement("input");
    newBucketInput.type = "text";
    newBucketInput.id = "new_bucket_input";
    newBucketInput.placeholder = "New bucket name";
    newBucketInput.style.display = "none";
    newBucketInput.value = window.DEFAULT_SPACES_BUCKET || ""; // set from Rails
  
    // Toggle input visibility when "new" is selected
    select.addEventListener("change", () => {
      newBucketInput.style.display = select.value === "new" ? "block" : "none";
    });
  
    // Append to wrapper
    selectWrapper.appendChild(select);
    selectWrapper.appendChild(newBucketInput);
  
    return selectWrapper;
  }
  