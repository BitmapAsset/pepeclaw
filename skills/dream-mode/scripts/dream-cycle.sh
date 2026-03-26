#!/usr/bin/env bash
# dream-cycle.sh — Run creative subagent sessions during off-hours
# Runs daily at 2 AM via cron
# Spawns creative exploration threads, scores results, writes to DREAM_LOG.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}/projects/pepe-2.0"
DATA_DIR="$PROJECT_ROOT/data/dream-mode"
DREAM_LOG="$PROJECT_ROOT/DREAM_LOG.md"
DREAMS_JSON="$DATA_DIR/dreams.json"
CYCLE_HISTORY="$DATA_DIR/cycle-history.json"
CONNECTIONS_JSON="$DATA_DIR/connections.json"

THREADS_PER_CYCLE=4
PROMOTION_THRESHOLD=0.6
MORNING_BRIEF_COUNT=3

CREATIVE_LENSES=("analogy" "inversion" "combination" "constraint_removal" "random_walk")

# --- Helpers ---

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [dream-cycle] $*"
}

now_iso() {
    date -u +%Y-%m-%dT%H:%M:%SZ
}

generate_uuid() {
    if command -v uuidgen &>/dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        python3 -c "import uuid; print(uuid.uuid4())"
    fi
}

ensure_data() {
    mkdir -p "$DATA_DIR"
    if [[ ! -f "$DREAMS_JSON" ]]; then
        echo '[]' > "$DREAMS_JSON"
    fi
    if [[ ! -f "$CYCLE_HISTORY" ]]; then
        echo '[]' > "$CYCLE_HISTORY"
    fi
    if [[ ! -f "$CONNECTIONS_JSON" ]]; then
        echo '{"connections": [], "last_updated": null}' > "$CONNECTIONS_JSON"
    fi
    if [[ ! -f "$DREAM_LOG" ]]; then
        cat > "$DREAM_LOG" << 'EOF'
# Dream Log — Pepe 2.0

> Autonomous background ideation. Top dreams surface in morning brief.
> Last cycle: never
> Total dreams: 0 | Actioned: 0 | Hit rate: 0%
EOF
    fi
}

# --- Project Scanning ---

# Scan all projects in workspace and extract state
scan_projects() {
    local workspace="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
    python3 << PYEOF
import json
import os
import subprocess
from pathlib import Path

workspace = "$workspace"
projects_dir = os.path.join(workspace, "projects")
projects = []

if os.path.isdir(projects_dir):
    for proj in sorted(os.listdir(projects_dir)):
        proj_path = os.path.join(projects_dir, proj)
        if not os.path.isdir(proj_path):
            continue

        info = {
            "name": proj,
            "path": proj_path,
            "has_git": os.path.isdir(os.path.join(proj_path, ".git")),
            "files": [],
            "technologies": [],
            "concepts": [],
            "recent_activity": ""
        }

        # List key files
        for f in os.listdir(proj_path):
            if f.endswith((".md", ".json", ".yaml", ".yml", ".sh")):
                info["files"].append(f)

        # Detect technologies from files
        all_files = []
        for root, dirs, files in os.walk(proj_path):
            dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', '.venv', '__pycache__')]
            for f in files:
                all_files.append(f)

        ext_map = {
            ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
            ".rs": "Rust", ".go": "Go", ".sh": "Bash",
            ".sol": "Solidity", ".yaml": "YAML", ".json": "JSON"
        }
        techs = set()
        for f in all_files:
            ext = os.path.splitext(f)[1]
            if ext in ext_map:
                techs.add(ext_map[ext])
        info["technologies"] = sorted(techs)

        # Extract concepts from markdown files
        concepts = set()
        for f in info["files"]:
            if f.endswith(".md"):
                fpath = os.path.join(proj_path, f)
                try:
                    with open(fpath) as fh:
                        for line in fh:
                            if line.startswith("## ") or line.startswith("### "):
                                concept = line.lstrip("#").strip()
                                if len(concept) > 3 and len(concept) < 80:
                                    concepts.add(concept)
                except (IOError, UnicodeDecodeError):
                    pass
        info["concepts"] = sorted(concepts)[:20]

        # Recent git activity
        if info["has_git"]:
            try:
                result = subprocess.run(
                    ["git", "-C", proj_path, "log", "-3", "--format=%ar — %s"],
                    capture_output=True, text=True, timeout=5
                )
                info["recent_activity"] = result.stdout.strip()
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass

        projects.append(info)

print(json.dumps(projects, indent=2))
PYEOF
}

# --- Dream Generation ---

# Select creative lenses for this cycle
select_lenses() {
    local count="$1"
    python3 -c "
import random
lenses = ['analogy', 'inversion', 'combination', 'constraint_removal', 'random_walk']
selected = random.sample(lenses, min($count, len(lenses)))
print(' '.join(selected))
"
}

# Generate a dream using a specific creative lens
generate_dream() {
    local lens="$1"
    local projects_json="$2"
    local dream_id
    dream_id=$(generate_uuid)

    python3 << PYEOF
import json
import random
import hashlib
from datetime import datetime, timezone

lens = "$lens"
dream_id = "$dream_id"
projects = json.loads('''$projects_json''')

if len(projects) < 1:
    # Generate a meta-dream about the system itself
    dream = {
        "id": dream_id,
        "title": "Self-Reflective Architecture Review",
        "category": "architecture",
        "creative_lens": lens,
        "summary": "Explored potential improvements to the dream mode system itself.",
        "details": "Without multiple projects to cross-pollinate, the dream cycle turned inward to examine its own architecture.",
        "next_steps": ["Add more projects to the workspace for richer cross-pollination"],
        "source_projects": [],
        "novelty_score": 0.3,
        "feasibility_score": 0.8
    }
    print(json.dumps(dream))
    import sys; sys.exit(0)

# Seed randomness with current time + lens for reproducibility within a cycle
seed = hashlib.md5(f"{datetime.now().isoformat()}-{lens}".encode()).hexdigest()
random.seed(seed)

def dream_analogy(projects):
    """What if we applied Project A's approach to Project B?"""
    if len(projects) < 2:
        a = b = projects[0]
    else:
        a, b = random.sample(projects, 2)

    a_concepts = a.get("concepts", ["its core approach"])
    b_concepts = b.get("concepts", ["its domain"])
    a_techs = a.get("technologies", ["its technology"])
    b_techs = b.get("technologies", ["its technology"])

    a_concept = random.choice(a_concepts) if a_concepts else "its methodology"
    b_concept = random.choice(b_concepts) if b_concepts else "its domain"

    return {
        "title": f"{a['name']}'s '{a_concept}' Applied to {b['name']}",
        "category": "cross-pollination",
        "summary": f"What if {a['name']}'s approach to '{a_concept}' was applied to {b['name']}'s '{b_concept}'? The technical patterns from {', '.join(a_techs[:2]) or 'the source'} could translate to {', '.join(b_techs[:2]) or 'the target'} context.",
        "details": f"Explored transferring the concept of '{a_concept}' from {a['name']} to {b['name']}'s domain of '{b_concept}'. Key insight: the structural pattern may be more universal than it appears. Technologies involved: {', '.join(set(a_techs + b_techs))}.",
        "next_steps": [
            f"Prototype a minimal version of '{a_concept}' adapted for {b['name']}",
            f"Evaluate technical compatibility between {', '.join(a_techs[:2])} and {', '.join(b_techs[:2])}",
            f"Identify specific integration points in {b['name']}"
        ],
        "source_projects": [a["name"], b["name"]],
        "novelty_score": round(random.uniform(0.5, 0.9), 2),
        "feasibility_score": round(random.uniform(0.3, 0.7), 2)
    }

def dream_inversion(projects):
    """What if we did the opposite of what we're doing?"""
    proj = random.choice(projects)
    concepts = proj.get("concepts", [])
    concept = random.choice(concepts) if concepts else "the current approach"

    return {
        "title": f"Inverting {proj['name']}'s '{concept}'",
        "category": "speculation",
        "summary": f"What if {proj['name']} took the exact opposite approach to '{concept}'? Exploring the contrarian path reveals assumptions we didn't know we had.",
        "details": f"The inversion lens asks: what if everything we assume about '{concept}' in {proj['name']} is wrong? By exploring the opposite, we discover hidden constraints and potentially simpler solutions. This is particularly interesting when the current approach was chosen by convention rather than analysis.",
        "next_steps": [
            f"List all assumptions embedded in the current '{concept}' approach",
            "Test each assumption — which ones are truly required vs habitual?",
            "Design a minimal experiment to test the inverted approach"
        ],
        "source_projects": [proj["name"]],
        "novelty_score": round(random.uniform(0.6, 0.95), 2),
        "feasibility_score": round(random.uniform(0.2, 0.6), 2)
    }

def dream_combination(projects):
    """What if we merged two unrelated capabilities?"""
    if len(projects) < 2:
        return dream_analogy(projects)

    a, b = random.sample(projects, 2)
    a_tech = random.choice(a.get("technologies", ["system"])) if a.get("technologies") else "system"
    b_tech = random.choice(b.get("technologies", ["system"])) if b.get("technologies") else "system"

    return {
        "title": f"Fusion: {a['name']} x {b['name']}",
        "category": "cross-pollination",
        "summary": f"A new system that combines {a['name']}'s {a_tech} capabilities with {b['name']}'s {b_tech} infrastructure. Neither project alone has this combined capability.",
        "details": f"By merging {a['name']} and {b['name']}, we could create something neither project can do alone. {a['name']} brings {', '.join(a.get('technologies', [])[:3])}, while {b['name']} contributes {', '.join(b.get('technologies', [])[:3])}. The combination enables new workflows and potentially a new product category.",
        "next_steps": [
            f"Map the API surfaces of both {a['name']} and {b['name']}",
            "Identify the minimum viable integration point",
            "Estimate effort for a proof-of-concept"
        ],
        "source_projects": [a["name"], b["name"]],
        "novelty_score": round(random.uniform(0.4, 0.85), 2),
        "feasibility_score": round(random.uniform(0.4, 0.8), 2)
    }

def dream_constraint_removal(projects):
    """What if we removed the biggest constraint?"""
    proj = random.choice(projects)
    constraints = [
        "limited compute resources",
        "single-user architecture",
        "synchronous processing",
        "local-only storage",
        "single-language stack",
        "manual deployment",
        "monolithic design"
    ]
    constraint = random.choice(constraints)

    return {
        "title": f"{proj['name']} Without '{constraint}'",
        "category": "architecture",
        "summary": f"What would {proj['name']} look like if '{constraint}' was no longer a constraint? Exploring the design space that opens up when we remove this limitation.",
        "details": f"Currently, {proj['name']} operates under the constraint of '{constraint}'. Removing this constraint opens up possibilities: different architectures, different scales, different user experiences. The question isn't whether we can remove the constraint today, but what we'd build if it were already gone — then work backward to see which parts are achievable now.",
        "next_steps": [
            f"Design the ideal {proj['name']} architecture without '{constraint}'",
            "Identify which elements of the unconstrained design are achievable today",
            "Create a roadmap from current state to unconstrained design"
        ],
        "source_projects": [proj["name"]],
        "novelty_score": round(random.uniform(0.3, 0.7), 2),
        "feasibility_score": round(random.uniform(0.5, 0.9), 2)
    }

def dream_random_walk(projects):
    """Random connection between distant concepts"""
    all_concepts = []
    for p in projects:
        for c in p.get("concepts", []):
            all_concepts.append((p["name"], c))

    if len(all_concepts) < 2:
        return dream_constraint_removal(projects)

    (proj_a, concept_a), (proj_b, concept_b) = random.sample(all_concepts, 2)

    return {
        "title": f"Serendipity: '{concept_a}' meets '{concept_b}'",
        "category": "serendipity",
        "summary": f"A random walk through the knowledge space connected '{concept_a}' from {proj_a} with '{concept_b}' from {proj_b}. The connection is non-obvious but potentially valuable.",
        "details": f"The serendipity engine connected two seemingly unrelated concepts: '{concept_a}' (from {proj_a}) and '{concept_b}' (from {proj_b}). While these exist in different contexts, the structural similarity or complementary nature could yield insights. Often the best innovations come from connecting distant domains.",
        "next_steps": [
            f"Explore the structural similarity between '{concept_a}' and '{concept_b}'",
            "Research if other fields have connected these concepts",
            "Prototype a minimal proof of the connection"
        ],
        "source_projects": list(set([proj_a, proj_b])),
        "novelty_score": round(random.uniform(0.6, 1.0), 2),
        "feasibility_score": round(random.uniform(0.1, 0.5), 2)
    }

# Route to the right generator
generators = {
    "analogy": dream_analogy,
    "inversion": dream_inversion,
    "combination": dream_combination,
    "constraint_removal": dream_constraint_removal,
    "random_walk": dream_random_walk
}

generator = generators.get(lens, dream_analogy)
dream = generator(projects)
dream["id"] = dream_id
dream["creative_lens"] = lens
dream["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
dream["combined_score"] = round(dream["novelty_score"] * 0.4 + dream["feasibility_score"] * 0.6, 2)
dream["status"] = "new"
dream["actioned_at"] = None
dream["action_outcome"] = None
dream["connections"] = []

# Build connections for cross-pollination dreams
if len(dream.get("source_projects", [])) >= 2:
    dream["connections"].append({
        "from_project": dream["source_projects"][0],
        "from_concept": dream.get("title", ""),
        "to_project": dream["source_projects"][1],
        "to_concept": dream.get("title", ""),
        "relationship": "dream-connection"
    })

print(json.dumps(dream))
PYEOF
}

# --- Dream Log Writing ---

# Write promoted dreams to DREAM_LOG.md
write_dream_log() {
    local cycle_id="$1"
    local started_at="$2"
    local completed_at="$3"
    local dreams_json="$4"

    python3 << PYEOF
import json
from datetime import datetime

DREAM_LOG = "$DREAM_LOG"
cycle_id = "$cycle_id"
started = "$started_at"
completed = "$completed_at"
PROMOTION_THRESHOLD = $PROMOTION_THRESHOLD
MORNING_BRIEF_COUNT = $MORNING_BRIEF_COUNT

dreams = json.loads('''$dreams_json''')

# Sort by combined score descending
dreams.sort(key=lambda d: d.get("combined_score", 0), reverse=True)

# Filter promoted dreams
promoted = [d for d in dreams if d.get("combined_score", 0) >= PROMOTION_THRESHOLD]

if not promoted:
    promoted = dreams[:1]  # Always promote at least the top dream

# Read existing log
with open(DREAM_LOG) as f:
    existing = f.read()

# Build new cycle section
lines = ["\n---\n"]
lines.append(f"## Dream Cycle — {started[:10]} {started[11:16]} - {completed[11:16]}\n")
lines.append(f"**Threads**: {len(dreams)} | **Duration**: {int((datetime.fromisoformat(completed.replace('Z','+00:00')) - datetime.fromisoformat(started.replace('Z','+00:00'))).total_seconds() / 60)}m | **Top Score**: {dreams[0]['combined_score'] if dreams else 0}\n")

for i, dream in enumerate(promoted):
    lines.append(f"\n### {i+1}. {dream['title']} ★{dream['combined_score']}\n")
    lines.append(f"| Field | Value |")
    lines.append(f"|-------|-------|")
    lines.append(f"| Category | {dream['category']} |")
    lines.append(f"| Novelty | {dream['novelty_score']} |")
    lines.append(f"| Feasibility | {dream['feasibility_score']} |")
    lines.append(f"| Combined | {dream['combined_score']} |")
    lines.append(f"| Source Projects | {', '.join(dream.get('source_projects', []))} |")
    lines.append(f"| Status | {dream['status']} |")
    lines.append(f"\n**Summary**: {dream['summary']}\n")
    lines.append(f"**Exploration**:\n{dream['details']}\n")
    lines.append(f"**Next Steps**:")
    for step in dream.get("next_steps", []):
        lines.append(f"- [ ] {step}")
    lines.append("")

new_section = "\n".join(lines)

# Update header stats
total_dreams = len(json.loads(open("$DREAMS_JSON").read())) + len(dreams)
header_lines = existing.split("\n")
for i, line in enumerate(header_lines):
    if line.startswith("> Last cycle:"):
        header_lines[i] = f"> Last cycle: {completed}"
    if line.startswith("> Total dreams:"):
        header_lines[i] = f"> Total dreams: {total_dreams} | Actioned: 0 | Hit rate: 0%"

updated_header = "\n".join(header_lines)

# Insert new section after header (before first ---)
parts = updated_header.split("\n---\n", 1)
if len(parts) == 2:
    final = parts[0] + new_section + "\n---\n" + parts[1]
else:
    final = parts[0] + new_section

with open(DREAM_LOG, "w") as f:
    f.write(final)

# Generate morning brief snippet
print("## While You Slept...\n")
for i, dream in enumerate(promoted[:MORNING_BRIEF_COUNT]):
    print(f"{i+1}. **{dream['title']}** (score: {dream['combined_score']}) — {dream['summary'][:100]}")
print(f"\n> Run \`dream details [number]\` for full exploration notes.")
PYEOF
}

# --- Main ---

main() {
    local cycle_id started_at
    cycle_id=$(generate_uuid)
    started_at=$(now_iso)

    log "Starting dream cycle $cycle_id"
    ensure_data

    # Scan all projects
    log "Scanning workspace projects..."
    local projects_json
    projects_json=$(scan_projects)

    local project_count
    project_count=$(echo "$projects_json" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))')
    log "Found $project_count projects to dream about"

    # Select creative lenses for this cycle
    local lenses
    lenses=$(select_lenses "$THREADS_PER_CYCLE")
    log "Creative lenses: $lenses"

    # Generate dreams
    local all_dreams="[]"
    for lens in $lenses; do
        log "Dreaming with lens: $lens"
        local dream
        dream=$(generate_dream "$lens" "$projects_json")

        # Append to all_dreams array
        all_dreams=$(python3 -c "
import json
dreams = json.loads('''$all_dreams''')
new_dream = json.loads('''$dream''')
dreams.append(new_dream)
print(json.dumps(dreams))
")
    done

    local completed_at
    completed_at=$(now_iso)

    local dream_count
    dream_count=$(echo "$all_dreams" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))')
    log "Generated $dream_count dreams"

    # Save dreams to JSON
    python3 << PYEOF
import json
DREAMS_JSON = "$DREAMS_JSON"
with open(DREAMS_JSON) as f:
    existing = json.load(f)
new_dreams = json.loads('''$all_dreams''')
existing.extend(new_dreams)
# Keep last 200 dreams
if len(existing) > 200:
    existing = existing[-200:]
with open(DREAMS_JSON, "w") as f:
    json.dump(existing, f, indent=2)
PYEOF

    # Save cycle history
    python3 << PYEOF
import json
CYCLE_HISTORY = "$CYCLE_HISTORY"
with open(CYCLE_HISTORY) as f:
    history = json.load(f)

dreams = json.loads('''$all_dreams''')
scores = [d.get("combined_score", 0) for d in dreams]

entry = {
    "cycle_id": "$cycle_id",
    "started_at": "$started_at",
    "completed_at": "$completed_at",
    "threads_spawned": len(dreams),
    "dreams_generated": len(dreams),
    "dreams_promoted": len([s for s in scores if s >= $PROMOTION_THRESHOLD]),
    "top_score": max(scores) if scores else 0,
    "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
    "creative_lenses_used": "$lenses".split(),
    "projects_scanned": list(set(p for d in dreams for p in d.get("source_projects", [])))
}
history.append(entry)
if len(history) > 100:
    history = history[-100:]
with open(CYCLE_HISTORY, "w") as f:
    json.dump(history, f, indent=2)
PYEOF

    # Write to DREAM_LOG.md
    log "Writing dream log..."
    local morning_brief
    morning_brief=$(write_dream_log "$cycle_id" "$started_at" "$completed_at" "$all_dreams")

    log "Dream cycle complete. Morning brief preview:"
    echo "$morning_brief"

    log "Dream cycle $cycle_id finished"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
