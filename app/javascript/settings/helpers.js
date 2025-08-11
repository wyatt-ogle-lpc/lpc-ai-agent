//app/javascript/settings/helpers.js
export function sanitize(str) {
    return (str || "").replace(/"/g, "");
  }
  
  export function formatReadableDate(isoString) {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  export function formatVersionDescription(desc) {
    if (!desc) return "Unnamed";
  
    const lines = desc.split("\n");
    const nameLine = lines.find(l => l.startsWith("<<Name:>>"));
    const descLine = lines.find(l => l.startsWith("<<Description:>>"));
    
    if (!nameLine && !descLine) {
      // Fallback to showing raw description
      return `<div>${sanitize(desc)}</div>`;
    }
    const name = nameLine.replace("<<Name:>>", "").trim();
    const description = descLine.replace("<<Description:>>", "").trim();
  
    return `
      <div>
        <div><strong>Name:</strong> ${sanitize(name || "Unnamed")}</div>
        <div><strong>Description:</strong> ${sanitize(description || "No description provided")}</div>
      </div>
    `;
  }
  