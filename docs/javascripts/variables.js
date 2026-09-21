/**
 * GKE Networking Lab - Interactive Variables & Code Block Enhancements
 * Dynamically customizes lab commands with user-defined GCP project, region, cluster, and network values.
 * Fixes double-line copy issues caused by block line-spans in syntax-highlighted blocks.
 */

(function () {
  const STORAGE_KEY = "gke_lab_variables";
  const TOGGLE_KEY = "gke_lab_interpolate_mode";

  const DEFAULT_VARS = {
    PROJECT_ID: "my-gke-enterprise-project",
    HOST_PROJECT_ID: "my-gke-host-project",
    SERVICE_PROJECT_ID: "my-gke-service-project",
    REGION: "us-central1",
    ZONE: "us-central1-a",
    CLUSTER_NAME: "gke-enterprise-lab",
    VPC_NAME: "gke-enterprise-vpc",
    SUBNET_NAME: "gke-nodes-subnet",
    PROXY_SUBNET_NAME: "gke-proxy-subnet"
  };

  function getSavedVariables() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_VARS, ...JSON.parse(saved) } : { ...DEFAULT_VARS };
    } catch (e) {
      return { ...DEFAULT_VARS };
    }
  }

  function saveVariables(vars) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vars));
    } catch (e) {}
  }

  function getInterpolateMode() {
    try {
      const mode = localStorage.getItem(TOGGLE_KEY);
      return mode === null ? true : mode === "true";
    } catch (e) {
      return true;
    }
  }

  function setInterpolateMode(enabled) {
    try {
      localStorage.setItem(TOGGLE_KEY, enabled.toString());
    } catch (e) {}
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function buildVariablesToolbar(currentVars, isInterpolate) {
    const card = document.createElement("div");
    card.className = "lab-vars-card";
    card.id = "lab-vars-customizer";

    card.innerHTML = `
      <div class="lab-vars-header" id="lab-vars-toggle">
        <div class="lab-vars-title">
          <svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/></svg>
          <span>Interactive Lab Environment Customizer</span>
        </div>
        <span class="lab-vars-badge">Variables Synced</span>
      </div>
      <div class="lab-vars-grid" id="lab-vars-body">
        <div class="lab-var-field">
          <label class="lab-var-label" for="var-project-id">GCP Project ID</label>
          <input type="text" class="lab-var-input" id="var-project-id" data-var="PROJECT_ID" value="${escapeHtml(currentVars.PROJECT_ID)}" placeholder="your-project-id">
        </div>
        <div class="lab-var-field">
          <label class="lab-var-label" for="var-host-project-id">Host Project ID (Shared VPC)</label>
          <input type="text" class="lab-var-input" id="var-host-project-id" data-var="HOST_PROJECT_ID" value="${escapeHtml(currentVars.HOST_PROJECT_ID || 'my-gke-host-project')}" placeholder="my-gke-host-project">
        </div>
        <div class="lab-var-field">
          <label class="lab-var-label" for="var-service-project-id">Service Project ID</label>
          <input type="text" class="lab-var-input" id="var-service-project-id" data-var="SERVICE_PROJECT_ID" value="${escapeHtml(currentVars.SERVICE_PROJECT_ID || 'my-gke-service-project')}" placeholder="my-gke-service-project">
        </div>
        <div class="lab-var-field">
          <label class="lab-var-label" for="var-region">GCP Region</label>
          <input type="text" class="lab-var-input" id="var-region" data-var="REGION" value="${escapeHtml(currentVars.REGION)}" placeholder="us-central1">
        </div>
        <div class="lab-var-field">
          <label class="lab-var-label" for="var-zone">GCP Zone</label>
          <input type="text" class="lab-var-input" id="var-zone" data-var="ZONE" value="${escapeHtml(currentVars.ZONE)}" placeholder="us-central1-a">
        </div>
        <div class="lab-var-field">
          <label class="lab-var-label" for="var-cluster-name">GKE Cluster Name</label>
          <input type="text" class="lab-var-input" id="var-cluster-name" data-var="CLUSTER_NAME" value="${escapeHtml(currentVars.CLUSTER_NAME)}" placeholder="gke-enterprise-lab">
        </div>
        <div class="lab-var-field">
          <label class="lab-var-label" for="var-vpc-name">VPC Network Name</label>
          <input type="text" class="lab-var-input" id="var-vpc-name" data-var="VPC_NAME" value="${escapeHtml(currentVars.VPC_NAME)}" placeholder="gke-enterprise-vpc">
        </div>
      </div>
      <div class="lab-vars-actions">
        <label class="lab-toggle-label">
          <input type="checkbox" id="lab-interpolate-toggle" ${isInterpolate ? "checked" : ""}>
          <span>Substitute variables directly into code snippets & commands</span>
        </label>
        <button type="button" class="lab-btn-reset" id="lab-reset-btn">Reset to Defaults</button>
      </div>
    `;

    return card;
  }

  function interpolateCodeHtml(rawHtml, vars, isInterpolate) {
    if (!isInterpolate) return rawHtml;

    let res = rawHtml;
    const varNames = [
      "PROJECT_ID",
      "HOST_PROJECT_ID",
      "SERVICE_PROJECT_ID",
      "REGION",
      "ZONE",
      "CLUSTER_NAME",
      "VPC_NAME",
      "SUBNET_NAME",
      "PROXY_SUBNET_NAME"
    ];

    // 1. Pygments highlighted variables: <span class="si">${</span><span class="nv">NAME</span><span class="si">}</span>
    varNames.forEach((name) => {
      const val = vars[name] || "";
      const p1 = new RegExp('<span class="si">\\$\\{<\\/span><span class="nv">' + name + '<\\/span><span class="si">\\}<\\/span>', "g");
      res = res.replace(p1, '<span class="nv var-highlighted">' + escapeHtml(val) + "</span>");

      const p2 = new RegExp('\\$\\{' + name + '\\}', "g");
      res = res.replace(p2, escapeHtml(val));
    });

    // 2. Variable assignments: export VAR="..." or export VAR=$(...)
    res = res.replace(
      /(<span class="nb">export<\/span><span class="w">\s*<\/span><span class="nv">PROJECT_ID<\/span><span class="o">=<\/span>)(?:<span class="k">\$\(<\/span>gcloud.*?<span class="k">\)<\/span>|<span class="s2">"[^"]*"<\/span>|"[^"]*"|'[^']*')/g,
      `$1<span class="s2">"${escapeHtml(vars.PROJECT_ID)}"</span>`
    );

    res = res.replace(
      /(<span class="nb">export<\/span><span class="w">\s*<\/span><span class="nv">HOST_PROJECT_ID<\/span><span class="o">=<\/span>)(?:<span class="s2">"[^"]*"<\/span>|"[^"]*"|'[^']*')/g,
      `$1<span class="s2">"${escapeHtml(vars.HOST_PROJECT_ID || 'my-gke-host-project')}"</span>`
    );

    res = res.replace(
      /(<span class="nb">export<\/span><span class="w">\s*<\/span><span class="nv">SERVICE_PROJECT_ID<\/span><span class="o">=<\/span>)(?:<span class="s2">"[^"]*"<\/span>|"[^"]*"|'[^']*')/g,
      `$1<span class="s2">"${escapeHtml(vars.SERVICE_PROJECT_ID || 'my-gke-service-project')}"</span>`
    );

    res = res.replace(
      /(<span class="nb">export<\/span><span class="w">\s*<\/span><span class="nv">REGION<\/span><span class="o">=<\/span>)(?:<span class="s2">"[^"]*"<\/span>|"[^"]*"|'[^']*')/g,
      `$1<span class="s2">"${escapeHtml(vars.REGION)}"</span>`
    );

    res = res.replace(
      /(<span class="nb">export<\/span><span class="w">\s*<\/span><span class="nv">ZONE<\/span><span class="o">=<\/span>)(?:<span class="s2">"[^"]*"<\/span>|"[^"]*"|'[^']*')/g,
      `$1<span class="s2">"${escapeHtml(vars.ZONE)}"</span>`
    );

    res = res.replace(
      /(<span class="nb">export<\/span><span class="w">\s*<\/span><span class="nv">CLUSTER_NAME<\/span><span class="o">=<\/span>)(?:<span class="s2">"[^"]*"<\/span>|"[^"]*"|'[^']*')/g,
      `$1<span class="s2">"${escapeHtml(vars.CLUSTER_NAME)}"</span>`
    );

    res = res.replace(
      /(<span class="nb">export<\/span><span class="w">\s*<\/span><span class="nv">VPC_NAME<\/span><span class="o">=<\/span>)(?:<span class="s2">"[^"]*"<\/span>|"[^"]*"|'[^']*')/g,
      `$1<span class="s2">"${escapeHtml(vars.VPC_NAME)}"</span>`
    );

    return res;
  }

  /**
   * Extracts clean code text from an element without double newlines.
   * Browsers' innerText evaluates display:block line spans with an extra line break,
   * which results in blank lines between every line. Using textContent or explicit line
   * iteration guarantees exactly single newlines between lines.
   */
  function getCleanCodeText(codeEl) {
    if (!codeEl) return "";

    const lineSpans = codeEl.querySelectorAll("span[id^='__span']");
    if (lineSpans && lineSpans.length > 0) {
      const lines = [];
      lineSpans.forEach((span) => {
        let line = span.textContent || "";
        // Strip single trailing carriage return or newline
        line = line.replace(/\r?\n$/, "");
        lines.push(line);
      });
      return lines.join("\n").trimEnd();
    }

    let text = codeEl.textContent || "";
    text = text.replace(/\r\n/g, "\n");
    return text.trimEnd();
  }

  function isExcludedFromEnhancements(el) {
    if (!el) return true;
    if (el.matches && el.matches(".mermaid, .mermaid *, pre.mermaid, code.language-mermaid, .arithmatex, .arithmatex *")) {
      return true;
    }
    if (el.closest && (el.closest(".mermaid") || el.closest(".arithmatex"))) {
      return true;
    }
    return false;
  }

  function updateAllCodeBlocks() {
    const vars = getSavedVariables();
    const isInterpolate = getInterpolateMode();

    const codeBlocks = document.querySelectorAll(".highlight, pre:not(.mermaid)");
    codeBlocks.forEach((block) => {
      if (isExcludedFromEnhancements(block)) return;

      const codeEl = block.querySelector("code") || block;
      if (isExcludedFromEnhancements(codeEl)) return;

      if (!codeEl.dataset.originalHtml) {
        codeEl.dataset.originalHtml = codeEl.innerHTML;
      }

      const updatedHtml = interpolateCodeHtml(codeEl.dataset.originalHtml, vars, isInterpolate);
      if (codeEl.innerHTML !== updatedHtml) {
        codeEl.innerHTML = updatedHtml;
      }

      const cleanText = getCleanCodeText(codeEl);

      // Sync clean, interpolated text to Material's built-in .md-clipboard button
      const mdClipboard = block.querySelector(".md-clipboard");
      if (mdClipboard) {
        mdClipboard.setAttribute("data-clipboard-text", cleanText);
      }

      // Sync clean, interpolated text to custom .lab-copy-btn button
      const labBtn = block.querySelector(".lab-copy-btn");
      if (labBtn) {
        labBtn.setAttribute("data-clipboard-text", cleanText);
      }
    });
  }

  function ensureCopyButtons() {
    const codeContainers = document.querySelectorAll(".highlight, pre:not(.highlight pre):not(.mermaid)");

    codeContainers.forEach((container) => {
      if (isExcludedFromEnhancements(container)) return;

      // If MkDocs Material's built-in .md-clipboard or custom button already exists, skip creating another
      if (container.querySelector(".lab-copy-btn") || container.querySelector(".md-clipboard")) {
        return;
      }

      const codeEl = container.querySelector("code") || container;

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "lab-copy-btn";
      copyBtn.title = "Copy to clipboard";
      copyBtn.innerHTML = `
        <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1Z"/>
        </svg>
        <span>Copy</span>
      `;

      copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const textToCopy = copyBtn.getAttribute("data-clipboard-text") || getCleanCodeText(codeEl);

        try {
          await navigator.clipboard.writeText(textToCopy);
          copyBtn.classList.add("copied");
          copyBtn.innerHTML = `
            <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 7L9 19l-5.5-5.5l1.41-1.41L9 16.17L19.59 5.59L21 7Z"/>
            </svg>
            <span>Copied!</span>
          `;
          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.innerHTML = `
              <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1Z"/>
              </svg>
              <span>Copy</span>
            `;
          }, 2000);
        } catch (err) {
          console.error("Failed to copy code snippet: ", err);
        }
      });

      container.appendChild(copyBtn);
    });
  }

  // Intercept global copy events to prevent double line breaks when users manually highlight code with mouse
  document.addEventListener("copy", (e) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const anchorNode = selection.anchorNode;
    const codeEl = anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE
      ? anchorNode.closest(".highlight code, pre code")
      : anchorNode && anchorNode.parentElement
        ? anchorNode.parentElement.closest(".highlight code, pre code")
        : null;

    if (codeEl && codeEl.querySelector("span[id^='__span']")) {
      const selectedText = selection.toString();
      // If the browser converted block line spans into extra blank lines (\n\n), clean them
      if (selectedText.includes("\n\n")) {
        const cleaned = selectedText.replace(/([^\n])\n\n+(?=[^\n])/g, "$1\n");
        e.clipboardData.setData("text/plain", cleaned);
        e.preventDefault();
      }
    }
  });

  function initLabEnhancements() {
    const contentArea = document.querySelector(".md-content__inner");
    if (!contentArea) return;

    if (!document.getElementById("lab-vars-customizer")) {
      const pageH1 = contentArea.querySelector("h1");
      const currentVars = getSavedVariables();
      const isInterpolate = getInterpolateMode();

      const toolbar = buildVariablesToolbar(currentVars, isInterpolate);

      if (pageH1 && pageH1.nextSibling) {
        contentArea.insertBefore(toolbar, pageH1.nextSibling);
      } else {
        contentArea.prepend(toolbar);
      }

      const inputs = toolbar.querySelectorAll(".lab-var-input");
      inputs.forEach((input) => {
        input.addEventListener("input", (e) => {
          const varName = e.target.dataset.var;
          const vars = getSavedVariables();
          vars[varName] = e.target.value.trim() || DEFAULT_VARS[varName];
          saveVariables(vars);
          updateAllCodeBlocks();
        });
      });

      const toggle = toolbar.querySelector("#lab-interpolate-toggle");
      if (toggle) {
        toggle.addEventListener("change", (e) => {
          setInterpolateMode(e.target.checked);
          updateAllCodeBlocks();
        });
      }

      const resetBtn = toolbar.querySelector("#lab-reset-btn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          saveVariables(DEFAULT_VARS);
          inputs.forEach((inp) => {
            const varName = inp.dataset.var;
            inp.value = DEFAULT_VARS[varName];
          });
          updateAllCodeBlocks();
        });
      }
    }

    ensureCopyButtons();
    updateAllCodeBlocks();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(() => {
      initLabEnhancements();
    });
  } else {
    document.addEventListener("DOMContentLoaded", initLabEnhancements);
  }
})();
