#!/usr/bin/env bash
# cross-pollinator.sh — Cross-project idea generation
# Reads all project states, maps capabilities and concepts, finds connections
# Can be run standalone or called by dream-cycle.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}/projects/pepe-2.0"
DATA_DIR="$PROJECT_ROOT/data/dream-mode"
CONNECTIONS_JSON="$DATA_DIR/connections.json"

# --- Helpers ---

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [cross-pollinator] $*"
}

now_iso() {
    date -u +%Y-%m-%dT%H:%M:%SZ
}

ensure_data() {
    mkdir -p "$DATA_DIR"
    if [[ ! -f "$CONNECTIONS_JSON" ]]; then
        echo '{"connections": [], "last_updated": null}' > "$CONNECTIONS_JSON"
    fi
}

# --- Cross-Pollination Functions ---

# Deep scan a single project for concepts, patterns, and capabilities
scan_project_deep() {
    local proj_path="$1"
    local proj_name
    proj_name=$(basename "$proj_path")

    python3 << PYEOF
import json
import os
from pathlib import Path
from collections import Counter

proj_path = "$proj_path"
proj_name = "$proj_name"

result = {
    "name": proj_name,
    "path": proj_path,
    "technologies": [],
    "concepts": [],
    "capabilities": [],
    "domains": [],
    "patterns": [],
    "file_types": {}
}

# Scan all files
ext_counter = Counter()
tech_keywords = {
    "api": "API Development",
    "auth": "Authentication",
    "cron": "Scheduled Tasks",
    "cache": "Caching",
    "queue": "Message Queue",
    "webhook": "Webhooks",
    "websocket": "Real-time",
    "graphql": "GraphQL",
    "rest": "REST API",
    "grpc": "gRPC",
    "docker": "Containerization",
    "kubernetes": "Orchestration",
    "terraform": "Infrastructure as Code",
    "ml": "Machine Learning",
    "ai": "Artificial Intelligence",
    "blockchain": "Blockchain",
    "crypto": "Cryptocurrency",
    "trading": "Trading",
    "scraper": "Web Scraping",
    "crawler": "Web Crawling",
    "bot": "Bot Development",
    "telegram": "Telegram Integration",
    "discord": "Discord Integration",
    "slack": "Slack Integration"
}

capabilities = set()
all_text_content = []

for root, dirs, files in os.walk(proj_path):
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', '.venv', '__pycache__', 'dist', 'build')]
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        ext_counter[ext] += 1

        fpath = os.path.join(root, f)
        fname_lower = f.lower()

        # Detect capabilities from filenames
        for keyword, capability in tech_keywords.items():
            if keyword in fname_lower:
                capabilities.add(capability)

        # Read small text files for concept extraction
        if ext in ('.md', '.txt', '.yaml', '.yml', '.json', '.toml') and os.path.getsize(fpath) < 50000:
            try:
                with open(fpath, encoding='utf-8', errors='ignore') as fh:
                    content = fh.read()
                    all_text_content.append(content)
                    # Check content for capability keywords
                    content_lower = content.lower()
                    for keyword, capability in tech_keywords.items():
                        if keyword in content_lower:
                            capabilities.add(capability)
            except (IOError, UnicodeDecodeError):
                pass

result["capabilities"] = sorted(capabilities)
result["file_types"] = dict(ext_counter.most_common(10))

# Extract concepts from markdown headers
concepts = set()
for content in all_text_content:
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## ") or stripped.startswith("### "):
            concept = stripped.lstrip("#").strip()
            if 3 < len(concept) < 80 and not concept.startswith("Table"):
                concepts.add(concept)

result["concepts"] = sorted(concepts)[:30]

# Detect domain from project name and content
domain_keywords = {
    "finance": ["trading", "portfolio", "investment", "payment", "invoice", "transaction"],
    "social": ["content", "social", "post", "follower", "engagement", "influencer"],
    "infrastructure": ["deploy", "server", "monitor", "log", "pipeline", "ci/cd"],
    "ai/ml": ["model", "training", "inference", "neural", "agent", "llm"],
    "blockchain": ["blockchain", "crypto", "token", "smart contract", "defi", "nft"],
    "productivity": ["task", "calendar", "note", "reminder", "workflow", "automation"]
}

all_text = " ".join(all_text_content).lower()
domains = set()
for domain, keywords in domain_keywords.items():
    if any(kw in all_text or kw in proj_name.lower() for kw in keywords):
        domains.add(domain)

result["domains"] = sorted(domains)

print(json.dumps(result))
PYEOF
}

# Find connections between two projects
find_connections() {
    local project_a_json="$1"
    local project_b_json="$2"

    python3 << PYEOF
import json

a = json.loads('''$project_a_json''')
b = json.loads('''$project_b_json''')

connections = []

# Shared technologies
shared_tech = set(a.get("technologies", [])) & set(b.get("technologies", []))
if shared_tech:
    connections.append({
        "type": "shared_technology",
        "from_project": a["name"],
        "to_project": b["name"],
        "details": f"Both use: {', '.join(sorted(shared_tech))}",
        "strength": min(len(shared_tech) / 3, 1.0),
        "opportunity": f"Shared {', '.join(list(shared_tech)[:2])} code could be extracted into a common library"
    })

# Shared capabilities
shared_caps = set(a.get("capabilities", [])) & set(b.get("capabilities", []))
if shared_caps:
    connections.append({
        "type": "shared_capability",
        "from_project": a["name"],
        "to_project": b["name"],
        "details": f"Both have: {', '.join(sorted(shared_caps))}",
        "strength": min(len(shared_caps) / 2, 1.0),
        "opportunity": f"Capability consolidation opportunity in {', '.join(list(shared_caps)[:2])}"
    })

# Complementary domains (different domains that could benefit from each other)
a_domains = set(a.get("domains", []))
b_domains = set(b.get("domains", []))
unique_to_a = a_domains - b_domains
unique_to_b = b_domains - a_domains
if unique_to_a and unique_to_b:
    connections.append({
        "type": "complementary_domains",
        "from_project": a["name"],
        "to_project": b["name"],
        "details": f"{a['name']} has {', '.join(sorted(unique_to_a))}; {b['name']} has {', '.join(sorted(unique_to_b))}",
        "strength": 0.6,
        "opportunity": f"Cross-domain pollination: apply {list(unique_to_a)[0]} thinking to {list(unique_to_b)[0]} problems"
    })

# Concept overlap (similar ideas in different contexts)
a_concepts_lower = {c.lower(): c for c in a.get("concepts", [])}
b_concepts_lower = {c.lower(): c for c in b.get("concepts", [])}

# Check for partial matches (words in common between concepts)
a_words = {}
for c_lower, c_orig in a_concepts_lower.items():
    for word in c_lower.split():
        if len(word) > 4:
            a_words.setdefault(word, []).append(c_orig)

concept_overlaps = []
for c_lower, c_orig in b_concepts_lower.items():
    for word in c_lower.split():
        if word in a_words and len(word) > 4:
            for a_concept in a_words[word]:
                concept_overlaps.append((a_concept, c_orig, word))

if concept_overlaps:
    top = concept_overlaps[:3]
    details_parts = [f"'{a_c}' ↔ '{b_c}' (via '{w}')" for a_c, b_c, w in top]
    connections.append({
        "type": "concept_overlap",
        "from_project": a["name"],
        "to_project": b["name"],
        "details": f"Related concepts: {'; '.join(details_parts)}",
        "strength": min(len(concept_overlaps) / 5, 1.0),
        "opportunity": "These overlapping concepts suggest transferable insights between projects"
    })

print(json.dumps(connections))
PYEOF
}

# --- Main ---

main() {
    log "Starting cross-pollination scan"
    ensure_data

    local workspace="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
    local projects_dir="$workspace/projects"

    if [[ ! -d "$projects_dir" ]]; then
        log "No projects directory found at $projects_dir"
        exit 0
    fi

    # Deep scan each project
    log "Deep scanning projects..."
    local project_scans=()
    local project_names=()

    for proj_dir in "$projects_dir"/*/; do
        [[ -d "$proj_dir" ]] || continue
        local proj_name
        proj_name=$(basename "$proj_dir")
        log "Scanning: $proj_name"

        local scan
        scan=$(scan_project_deep "$proj_dir")
        project_scans+=("$scan")
        project_names+=("$proj_name")
    done

    local num_projects=${#project_scans[@]}
    log "Scanned $num_projects projects"

    if [[ "$num_projects" -lt 2 ]]; then
        log "Need at least 2 projects for cross-pollination. Found $num_projects."
        # Still save what we have
        python3 << PYEOF
import json
result = {
    "connections": [],
    "last_updated": "$(now_iso)",
    "projects_scanned": $num_projects,
    "note": "Need at least 2 projects for cross-pollination"
}
with open("$CONNECTIONS_JSON", "w") as f:
    json.dump(result, f, indent=2)
PYEOF
        exit 0
    fi

    # Find connections between all project pairs
    log "Finding cross-project connections..."
    local all_connections="[]"

    for ((i=0; i<num_projects; i++)); do
        for ((j=i+1; j<num_projects; j++)); do
            local connections
            connections=$(find_connections "${project_scans[$i]}" "${project_scans[$j]}")

            all_connections=$(python3 -c "
import json
existing = json.loads('''$all_connections''')
new_conns = json.loads('''$connections''')
existing.extend(new_conns)
print(json.dumps(existing))
")
        done
    done

    # Save connections
    local conn_count
    conn_count=$(echo "$all_connections" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))')
    log "Found $conn_count cross-project connections"

    python3 << PYEOF
import json
connections = json.loads('''$all_connections''')
result = {
    "connections": connections,
    "last_updated": "$(now_iso)",
    "projects_scanned": $num_projects,
    "project_names": $(python3 -c "import json; print(json.dumps([$(printf '"%s",' "${project_names[@]}" | sed 's/,$//')]))")
}
with open("$CONNECTIONS_JSON", "w") as f:
    json.dump(result, f, indent=2)
PYEOF

    # Output summary
    log "Cross-pollination complete"
    echo ""
    echo "=== Cross-Pollination Summary ==="
    echo "Projects scanned: $num_projects"
    echo "Connections found: $conn_count"

    if [[ "$conn_count" -gt 0 ]]; then
        echo ""
        echo "Top connections:"
        echo "$all_connections" | python3 -c "
import json, sys
conns = json.load(sys.stdin)
conns.sort(key=lambda c: c.get('strength', 0), reverse=True)
for c in conns[:5]:
    print(f\"  [{c['type']}] {c['from_project']} ↔ {c['to_project']}: {c['opportunity']}\")
"
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
