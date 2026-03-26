#!/usr/bin/env bash
# PepeClaw + Pepe 2.0 Installer — Self-Evolving Agent System for OpenClaw
# Usage: curl -fsSL https://raw.githubusercontent.com/openclaw/pepe-2.0/main/install.sh | bash
# Or:    ./install.sh
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
PEPE_VERSION="2.0.0"
PEPECLAW_PORT="${PEPECLAW_PORT:-5173}"
REQUIRED_BASH_VERSION=4
REPO_URL="https://github.com/openclaw/pepe-2.0.git"
PEPECLAW_SERVICE_NAME="com.openclaw.pepeclaw"

# Colors (only if terminal supports them)
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
    GREEN=$(tput setaf 2)
    YELLOW=$(tput setaf 3)
    RED=$(tput setaf 1)
    CYAN=$(tput setaf 6)
    BOLD=$(tput bold)
    RESET=$(tput sgr0)
else
    GREEN="" YELLOW="" RED="" CYAN="" BOLD="" RESET=""
fi

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
info()  { printf "%s[INFO]%s  %s\n" "$CYAN" "$RESET" "$1"; }
ok()    { printf "%s[  OK]%s  %s\n" "$GREEN" "$RESET" "$1"; }
warn()  { printf "%s[WARN]%s  %s\n" "$YELLOW" "$RESET" "$1"; }
fail()  { printf "%s[FAIL]%s  %s\n" "$RED" "$RESET" "$1"; exit 1; }

banner() {
    printf "\n%s" "$GREEN"
    cat <<'ART'
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║    🐸  P E P E C L A W                    ║
    ║                                           ║
    ║    3D AI Agent Visualizer + Self-Evolving  ║
    ║    Agent System for OpenClaw               ║
    ║                                           ║
    ╚═══════════════════════════════════════════╝
ART
    printf "%s\n\n" "$RESET"
}

# ─────────────────────────────────────────────────────────────
# Pre-flight Checks
# ─────────────────────────────────────────────────────────────
preflight() {
    info "Running pre-flight checks..."

    # Check bash version
    if [ "${BASH_VERSINFO[0]}" -lt "$REQUIRED_BASH_VERSION" ]; then
        fail "Bash $REQUIRED_BASH_VERSION+ required (found ${BASH_VERSION}). On macOS: brew install bash"
    fi
    ok "Bash ${BASH_VERSION}"

    # Check for Node.js
    if ! command -v node >/dev/null 2>&1; then
        warn "Node.js not found. Attempting to install via nvm..."
        install_nodejs
    else
        NODE_VER=$(node --version 2>/dev/null || echo "unknown")
        NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_MAJOR" -lt 18 ] 2>/dev/null; then
            warn "Node.js $NODE_VER is too old (need 18+). Attempting upgrade via nvm..."
            install_nodejs
        else
            ok "Node.js $NODE_VER"
        fi
    fi

    # Check for npm (or fallback info)
    if command -v npm >/dev/null 2>&1; then
        ok "npm $(npm --version 2>/dev/null)"
    elif command -v npx >/dev/null 2>&1; then
        warn "npm not found but npx is available. Will use npx where possible."
    else
        fail "Neither npm nor npx found. Install Node.js first: https://nodejs.org"
    fi

    # Check for jq
    if ! command -v jq >/dev/null 2>&1; then
        warn "jq not found. Installing..."
        if command -v brew >/dev/null 2>&1; then
            brew install jq
        elif command -v apt-get >/dev/null 2>&1; then
            sudo apt-get install -y jq
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y jq
        else
            fail "Cannot install jq automatically. Install it manually: https://stedolan.github.io/jq/download/"
        fi
    fi
    ok "jq $(jq --version 2>/dev/null || echo 'installed')"

    # Check for python3 (used by several skill scripts)
    if ! command -v python3 >/dev/null 2>&1; then
        warn "python3 not found. Some skill scripts require Python 3."
        warn "Install it: macOS: 'brew install python3' / Linux: 'sudo apt-get install python3'"
    else
        ok "python3 $(python3 --version 2>/dev/null | awk '{print $2}')"
    fi

    # Check for crontab
    if ! command -v crontab >/dev/null 2>&1; then
        warn "crontab not found. Scheduled tasks (Dream Mode, War Room) will not run automatically."
        HAS_CRON=false
    else
        ok "cron available"
        HAS_CRON=true
    fi

    # Detect OpenClaw workspace
    if [ -n "${OPENCLAW_WORKSPACE:-}" ]; then
        WORKSPACE="$OPENCLAW_WORKSPACE"
    elif [ -d "$HOME/.openclaw/workspace" ]; then
        WORKSPACE="$HOME/.openclaw/workspace"
    elif [ -d "$HOME/.openclaw" ]; then
        WORKSPACE="$HOME/.openclaw"
    else
        warn "OpenClaw workspace not found."
        warn "Install OpenClaw first: https://openclaw.ai"
        warn "Or set OPENCLAW_WORKSPACE to your workspace directory."
        warn "Continuing with default location: $HOME/.openclaw"
        WORKSPACE="$HOME/.openclaw"
        mkdir -p "$WORKSPACE"
    fi
    ok "OpenClaw workspace: $WORKSPACE"

    # Detect OS
    OS="$(uname -s)"
    case "$OS" in
        Darwin) ok "Platform: macOS" ;;
        Linux)  ok "Platform: Linux" ;;
        *)      warn "Untested platform: $OS. Proceeding anyway." ;;
    esac

    printf "\n"
}

# ─────────────────────────────────────────────────────────────
# Install Node.js via nvm
# ─────────────────────────────────────────────────────────────
install_nodejs() {
    if command -v nvm >/dev/null 2>&1; then
        info "nvm found. Installing Node.js 20 LTS..."
        nvm install 20
        nvm use 20
    elif [ -s "$HOME/.nvm/nvm.sh" ]; then
        info "Loading nvm from ~/.nvm..."
        # shellcheck source=/dev/null
        . "$HOME/.nvm/nvm.sh"
        nvm install 20
        nvm use 20
    else
        info "Installing nvm..."
        if command -v curl >/dev/null 2>&1; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        elif command -v wget >/dev/null 2>&1; then
            wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        else
            fail "Cannot install nvm. Install Node.js manually: https://nodejs.org"
        fi

        export NVM_DIR="$HOME/.nvm"
        # shellcheck source=/dev/null
        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
        nvm install 20
        nvm use 20
    fi

    if command -v node >/dev/null 2>&1; then
        ok "Node.js $(node --version) installed via nvm"
    else
        fail "Failed to install Node.js. Install it manually: https://nodejs.org"
    fi
}

# ─────────────────────────────────────────────────────────────
# Determine Source Directory
# ─────────────────────────────────────────────────────────────
find_source() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -d "$SCRIPT_DIR/skills" ] || [ -f "$SCRIPT_DIR/package.json" ]; then
        SOURCE_DIR="$SCRIPT_DIR"
        info "Installing from local directory: $SOURCE_DIR"
    else
        info "Downloading Pepe 2.0 from GitHub..."
        TMPDIR=$(mktemp -d)
        trap 'rm -rf "$TMPDIR"' EXIT
        if command -v git >/dev/null 2>&1; then
            git clone --depth 1 "$REPO_URL" "$TMPDIR/pepe-2.0" 2>/dev/null
            SOURCE_DIR="$TMPDIR/pepe-2.0"
        elif command -v curl >/dev/null 2>&1; then
            curl -fsSL "https://github.com/openclaw/pepe-2.0/archive/main.tar.gz" | tar xz -C "$TMPDIR"
            SOURCE_DIR="$TMPDIR/pepe-2.0-main"
        else
            fail "git or curl required to download Pepe 2.0"
        fi
    fi
}

# ─────────────────────────────────────────────────────────────
# Install Skills
# ─────────────────────────────────────────────────────────────
install_skills() {
    if [ ! -d "$SOURCE_DIR/skills" ]; then
        warn "No skills directory found in source. Skipping skill installation."
        return
    fi

    info "Installing skills..."

    SKILL_DIR="$WORKSPACE/skills"
    mkdir -p "$SKILL_DIR"

    SKILLS=(
        "skill-genome"
        "predictive-intent"
        "dream-mode"
        "meta-learning"
        "adversarial-red-team"
        "project-war-room"
        "temporal-arbitrage"
        "deep-search"
        "execution-trace"
        "openclaw-optimizer"
        "self-scoring"
        "skill-autocreator"
        "realtime-learning"
        "user-modeling"
        "realtime-skill-creator"
        "skill-mutator"
        "genetic-evolution"
        "dialectic-user-model"
    )

    for skill in "${SKILLS[@]}"; do
        if [ -d "$SOURCE_DIR/skills/$skill" ]; then
            if [ -d "$SKILL_DIR/$skill" ]; then
                backup="$SKILL_DIR/${skill}.backup.$(date +%Y%m%d%H%M%S)"
                warn "Existing skill '$skill' found. Backing up to $backup"
                mv "$SKILL_DIR/$skill" "$backup"
            fi

            cp -r "$SOURCE_DIR/skills/$skill" "$SKILL_DIR/$skill"

            if [ -d "$SKILL_DIR/$skill/scripts" ]; then
                chmod +x "$SKILL_DIR/$skill/scripts/"*.sh 2>/dev/null || true
            fi

            ok "Installed: $skill"
        else
            warn "Skill not found in source: $skill"
        fi
    done

    printf "\n"
}

# ─────────────────────────────────────────────────────────────
# Build PepeClaw 3D Viewer
# ─────────────────────────────────────────────────────────────
build_pepeclaw() {
    if [ ! -f "$SOURCE_DIR/package.json" ]; then
        warn "No package.json found. Skipping PepeClaw build."
        return
    fi

    info "Building PepeClaw 3D Viewer..."

    PEPECLAW_DIR="$HOME/.openclaw/pepeclaw"
    mkdir -p "$PEPECLAW_DIR"

    # Install dependencies
    cd "$SOURCE_DIR"
    if command -v npm >/dev/null 2>&1; then
        npm install --production=false 2>/dev/null || npm install
        npm run build
    elif command -v npx >/dev/null 2>&1; then
        npx --yes npm install
        npx --yes npm run build
    else
        fail "npm or npx required to build PepeClaw"
    fi

    # Copy built files
    if [ -d "$SOURCE_DIR/dist" ]; then
        cp -r "$SOURCE_DIR/dist/"* "$PEPECLAW_DIR/"
        ok "PepeClaw built and installed to $PEPECLAW_DIR"
    else
        warn "Build output not found. PepeClaw may not have built correctly."
    fi

    printf "\n"
}

# ─────────────────────────────────────────────────────────────
# Auto-Start PepeClaw Server
# ─────────────────────────────────────────────────────────────
setup_autostart() {
    PEPECLAW_DIR="$HOME/.openclaw/pepeclaw"

    if [ ! -d "$PEPECLAW_DIR" ]; then
        warn "PepeClaw not built. Skipping auto-start setup."
        return
    fi

    info "Setting up PepeClaw auto-start..."

    OS="$(uname -s)"
    case "$OS" in
        Darwin)
            setup_launchd
            ;;
        Linux)
            setup_systemd
            ;;
        *)
            warn "Auto-start not supported on $OS. Run manually: npx serve $PEPECLAW_DIR -l $PEPECLAW_PORT"
            ;;
    esac

    printf "\n"
}

setup_launchd() {
    PLIST_DIR="$HOME/Library/LaunchAgents"
    PLIST_FILE="$PLIST_DIR/$PEPECLAW_SERVICE_NAME.plist"
    PEPECLAW_DIR="$HOME/.openclaw/pepeclaw"

    mkdir -p "$PLIST_DIR"

    # Find npx or node path
    NPX_PATH=$(command -v npx 2>/dev/null || echo "/usr/local/bin/npx")

    # Unload existing service if present (upgrade path)
    if [ -f "$PLIST_FILE" ]; then
        launchctl unload "$PLIST_FILE" 2>/dev/null || true
        warn "Existing PepeClaw service found. Upgrading..."
    fi

    cat > "$PLIST_FILE" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PEPECLAW_SERVICE_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NPX_PATH}</string>
        <string>serve</string>
        <string>${PEPECLAW_DIR}</string>
        <string>-l</string>
        <string>${PEPECLAW_PORT}</string>
        <string>-s</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/.openclaw/pepeclaw/server.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/.openclaw/pepeclaw/server.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:${HOME}/.nvm/versions/node/v20/bin</string>
    </dict>
</dict>
</plist>
PLIST

    launchctl load "$PLIST_FILE" 2>/dev/null || {
        warn "Could not load launchd service. You may need to run:"
        warn "  launchctl load $PLIST_FILE"
    }

    ok "macOS LaunchAgent installed (starts on login)"
}

setup_systemd() {
    SYSTEMD_DIR="$HOME/.config/systemd/user"
    SERVICE_FILE="$SYSTEMD_DIR/pepeclaw.service"
    PEPECLAW_DIR="$HOME/.openclaw/pepeclaw"

    mkdir -p "$SYSTEMD_DIR"

    NPX_PATH=$(command -v npx 2>/dev/null || echo "/usr/local/bin/npx")

    cat > "$SERVICE_FILE" <<SERVICE
[Unit]
Description=PepeClaw 3D AI Agent Visualizer
After=network.target

[Service]
Type=simple
ExecStart=${NPX_PATH} serve ${PEPECLAW_DIR} -l ${PEPECLAW_PORT} -s
Restart=on-failure
RestartSec=5
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
SERVICE

    if command -v systemctl >/dev/null 2>&1; then
        systemctl --user daemon-reload 2>/dev/null || true
        systemctl --user enable pepeclaw.service 2>/dev/null || true
        systemctl --user start pepeclaw.service 2>/dev/null || {
            warn "Could not start systemd service. You may need to run:"
            warn "  systemctl --user start pepeclaw.service"
        }
        ok "systemd user service installed and started"
    else
        warn "systemctl not found. Service file written to $SERVICE_FILE"
        warn "Start manually: npx serve $PEPECLAW_DIR -l $PEPECLAW_PORT -s"
    fi
}

# ─────────────────────────────────────────────────────────────
# Create Data Directories
# ─────────────────────────────────────────────────────────────
create_data_dirs() {
    info "Creating data directories..."

    DATA_DIR="$HOME/.openclaw/data/pepe"
    mkdir -p "$DATA_DIR"

    DIRS=(
        "skill-genome/fitness-logs"
        "skill-genome/archives"
        "skill-genome/crossovers"
        "predictive-intent/patterns"
        "predictive-intent/cache"
        "predictive-intent/anomalies"
        "dream-mode/dreams"
        "dream-mode/morning-briefs"
        "meta-learning/analysis"
        "meta-learning/proposals"
        "meta-learning/gaps"
        "adversarial-red-team/challenges"
        "adversarial-red-team/biases"
        "adversarial-red-team/assumptions"
        "adversarial-red-team/audits"
        "project-war-room/health"
        "project-war-room/velocity"
        "project-war-room/triage"
        "project-war-room/dependencies"
        "temporal-arbitrage/scores"
        "temporal-arbitrage/batches"
        "temporal-arbitrage/deferrals"
        "realtime-skill-creator/patterns"
        "realtime-skill-creator/installs"
        "skill-mutations"
        "evolution-runs"
        "execution-traces"
        "self-scores"
        "genetic-evolution/benchmarks"
        "user-model"
        "user-model/updates"
        "user-model/insights"
    )

    for dir in "${DIRS[@]}"; do
        mkdir -p "$DATA_DIR/$dir"
    done

    ok "Data directories created: $DATA_DIR"
    printf "\n"
}

# ─────────────────────────────────────────────────────────────
# Write Default Configuration
# ─────────────────────────────────────────────────────────────
write_config() {
    CONFIG_FILE="$HOME/.openclaw/data/pepe/config.json"

    if [ -f "$CONFIG_FILE" ]; then
        warn "Configuration already exists. Skipping. (Delete $CONFIG_FILE to regenerate.)"
        return
    fi

    info "Writing default configuration..."

    cat > "$CONFIG_FILE" <<'CONFIG'
{
  "version": "2.0.0",
  "dream_mode": {
    "enabled": true,
    "schedule": "2-5",
    "max_dreams": 200,
    "promotion_threshold": 0.6
  },
  "meta_learning": {
    "enabled": true,
    "schedule": "nightly",
    "auto_apply_proposals": false
  },
  "skill_genome": {
    "evolution_cycle": "weekly",
    "mutation_threshold": 0.2,
    "prune_threshold": 0.05,
    "rollback_window_days": 14
  },
  "war_room": {
    "check_interval_hours": 6,
    "auto_triage_threshold": 50,
    "health_weights": {
      "git_activity": 0.25,
      "deploy_health": 0.20,
      "issue_health": 0.20,
      "blocker_status": 0.20,
      "momentum": 0.15
    }
  },
  "red_team": {
    "challenge_threshold_cost": 1000,
    "challenge_threshold_weeks": 1,
    "monthly_hindsight_audit": true
  },
  "predictive_intent": {
    "pattern_confidence_threshold": 0.7,
    "pre_compute_before_minutes": 30,
    "anomaly_sigma_threshold": 2,
    "anomaly_window_days": 14
  },
  "temporal_arbitrage": {
    "procrastination_threshold": 3,
    "opportunity_cost_switch_threshold": 0.30,
    "deadline_buffer_percent": 0.20
  }
}
CONFIG

    ok "Configuration written: $CONFIG_FILE"
    printf "\n"
}

# ─────────────────────────────────────────────────────────────
# Set Up Cron Jobs
# ─────────────────────────────────────────────────────────────
setup_cron() {
    if [ "$HAS_CRON" != "true" ]; then
        warn "Skipping cron setup (crontab not available)."
        return
    fi

    info "Setting up scheduled tasks..."

    SKILL_DIR="$WORKSPACE/skills"
    CRON_MARKER="# Pepe 2.0 — Managed by install.sh"

    EXISTING_CRON=$(crontab -l 2>/dev/null || true)

    if echo "$EXISTING_CRON" | grep -q "$CRON_MARKER"; then
        warn "Cron jobs already installed. Skipping. (Run 'crontab -e' to modify.)"
        return
    fi

    NEW_CRON="$EXISTING_CRON
$CRON_MARKER
# Dream Mode: Run creative exploration at 3 AM daily
0 3 * * * $SKILL_DIR/dream-mode/scripts/dream-cycle.sh >> $HOME/.openclaw/data/pepe/dream-mode/cron.log 2>&1
# Meta-Learning: Nightly self-analysis at 1 AM
0 1 * * * $SKILL_DIR/meta-learning/scripts/conversation-analyzer.sh >> $HOME/.openclaw/data/pepe/meta-learning/cron.log 2>&1
# War Room: Health check every 6 hours
0 */6 * * * $SKILL_DIR/project-war-room/scripts/health-scorer.sh >> $HOME/.openclaw/data/pepe/project-war-room/cron.log 2>&1
# Skill Genome: Weekly evolution cycle on Sunday at 4 AM
0 4 * * 0 $SKILL_DIR/skill-genome/scripts/evolution-cycle.sh >> $HOME/.openclaw/data/pepe/skill-genome/cron.log 2>&1
# Predictive Intent: Pre-compute at 5:30 AM daily
30 5 * * * $SKILL_DIR/predictive-intent/scripts/pre-compute.sh >> $HOME/.openclaw/data/pepe/predictive-intent/cron.log 2>&1
# Adversarial Red Team: Monthly hindsight audit on the 1st at 2 AM
0 2 1 * * $SKILL_DIR/adversarial-red-team/scripts/contrarian-spawner.sh --audit >> $HOME/.openclaw/data/pepe/adversarial-red-team/cron.log 2>&1
# Genetic Evolution: Run evolution cycle every 6 hours
0 */6 * * * $SKILL_DIR/genetic-evolution/scripts/evolve.sh >> $HOME/.openclaw/data/pepe/genetic-evolution/cron.log 2>&1
$CRON_MARKER — END"

    echo "$NEW_CRON" | crontab -

    ok "Cron jobs installed (7 scheduled tasks)"
    printf "\n"
}

# ─────────────────────────────────────────────────────────────
# Validate Installation
# ─────────────────────────────────────────────────────────────
validate() {
    info "Validating installation..."

    SKILL_DIR="$WORKSPACE/skills"
    DATA_DIR="$HOME/.openclaw/data/pepe"
    ERRORS=0

    for skill in skill-genome predictive-intent dream-mode meta-learning adversarial-red-team project-war-room temporal-arbitrage deep-search execution-trace openclaw-optimizer self-scoring skill-autocreator realtime-learning user-modeling realtime-skill-creator skill-mutator genetic-evolution dialectic-user-model; do
        if [ -d "$SKILL_DIR/$skill" ] && [ -f "$SKILL_DIR/$skill/SKILL.md" ]; then
            ok "Skill: $skill"
        else
            warn "Missing: $skill"
            ERRORS=$((ERRORS + 1))
        fi
    done

    if [ -d "$DATA_DIR" ]; then
        dir_count=$(find "$DATA_DIR" -type d | wc -l | tr -d ' ')
        ok "Data directories: $dir_count created"
    else
        warn "Data directory missing: $DATA_DIR"
        ERRORS=$((ERRORS + 1))
    fi

    if [ -f "$DATA_DIR/config.json" ]; then
        if jq . "$DATA_DIR/config.json" >/dev/null 2>&1; then
            ok "Configuration: valid JSON"
        else
            warn "Configuration: invalid JSON"
            ERRORS=$((ERRORS + 1))
        fi
    else
        warn "Configuration file missing"
        ERRORS=$((ERRORS + 1))
    fi

    # Check PepeClaw viewer
    PEPECLAW_DIR="$HOME/.openclaw/pepeclaw"
    if [ -f "$PEPECLAW_DIR/index.html" ]; then
        ok "PepeClaw 3D Viewer: installed"
    else
        warn "PepeClaw 3D Viewer: not built"
        ERRORS=$((ERRORS + 1))
    fi

    printf "\n"

    if [ "$ERRORS" -gt 0 ]; then
        warn "$ERRORS issue(s) detected. Installation may be incomplete."
    else
        ok "All checks passed!"
    fi
}

# ─────────────────────────────────────────────────────────────
# Open Browser
# ─────────────────────────────────────────────────────────────
open_browser() {
    PEPECLAW_URL="http://localhost:$PEPECLAW_PORT"

    info "PepeClaw 3D Viewer available at: $PEPECLAW_URL"

    # Wait briefly for server to start
    sleep 2

    OS="$(uname -s)"
    case "$OS" in
        Darwin)
            open "$PEPECLAW_URL" 2>/dev/null || true
            ;;
        Linux)
            if command -v xdg-open >/dev/null 2>&1; then
                xdg-open "$PEPECLAW_URL" 2>/dev/null || true
            elif command -v sensible-browser >/dev/null 2>&1; then
                sensible-browser "$PEPECLAW_URL" 2>/dev/null || true
            fi
            ;;
    esac
}

# ─────────────────────────────────────────────────────────────
# Success Message
# ─────────────────────────────────────────────────────────────
success_message() {
    PEPECLAW_URL="http://localhost:$PEPECLAW_PORT"

    printf "\n%s%s" "$GREEN$BOLD" ""
    cat <<MSG
    ┌──────────────────────────────────────────────────────┐
    │                                                      │
    │   🐸 PepeClaw + Pepe 2.0 installed successfully!     │
    │                                                      │
    │   ✨ 3D Agent Viewer:                                │
    │      ${PEPECLAW_URL}                       │
    │                                                      │
    │   Your agent starts evolving tonight.                 │
    │                                                      │
    │   What happens next:                                  │
    │   • 1:00 AM — Meta-Learning analyzes today            │
    │   • 3:00 AM — Dream Mode explores new ideas           │
    │   • 5:30 AM — Predictive Intent pre-computes          │
    │   • Every 6h — War Room checks project health         │
    │   • Weekly  — Skill Genome evolves capabilities       │
    │   • Monthly — Red Team runs hindsight audit           │
    │                                                      │
    │   Quick commands:                                     │
    │   • openclaw skill genome report                      │
    │   • openclaw skill war-room status                    │
    │   • openclaw skill red-team challenge "topic"         │
    │                                                      │
    │   Config: ~/.openclaw/data/pepe/config.json           │
    │   Docs:   https://github.com/openclaw/pepe-2.0       │
    │                                                      │
    └──────────────────────────────────────────────────────┘
MSG
    printf "%s\n" "$RESET"
}

# ─────────────────────────────────────────────────────────────
# Uninstall
# ─────────────────────────────────────────────────────────────
uninstall() {
    info "Uninstalling PepeClaw + Pepe 2.0..."

    # Stop and remove auto-start
    OS="$(uname -s)"
    case "$OS" in
        Darwin)
            PLIST_FILE="$HOME/Library/LaunchAgents/$PEPECLAW_SERVICE_NAME.plist"
            if [ -f "$PLIST_FILE" ]; then
                launchctl unload "$PLIST_FILE" 2>/dev/null || true
                rm -f "$PLIST_FILE"
                ok "LaunchAgent removed"
            fi
            ;;
        Linux)
            if command -v systemctl >/dev/null 2>&1; then
                systemctl --user stop pepeclaw.service 2>/dev/null || true
                systemctl --user disable pepeclaw.service 2>/dev/null || true
            fi
            rm -f "$HOME/.config/systemd/user/pepeclaw.service" 2>/dev/null || true
            ok "Systemd service removed"
            ;;
    esac

    # Remove cron jobs
    if command -v crontab >/dev/null 2>&1; then
        EXISTING_CRON=$(crontab -l 2>/dev/null || true)
        CLEANED_CRON=$(echo "$EXISTING_CRON" | sed '/# Pepe 2.0/,/# Pepe 2.0 — END/d')
        echo "$CLEANED_CRON" | crontab -
        ok "Cron jobs removed"
    fi

    # Detect workspace
    if [ -n "${OPENCLAW_WORKSPACE:-}" ]; then
        WORKSPACE="$OPENCLAW_WORKSPACE"
    elif [ -d "$HOME/.openclaw/workspace" ]; then
        WORKSPACE="$HOME/.openclaw/workspace"
    else
        WORKSPACE="$HOME/.openclaw"
    fi

    # Remove skills
    for skill in skill-genome predictive-intent dream-mode meta-learning adversarial-red-team project-war-room temporal-arbitrage deep-search execution-trace openclaw-optimizer self-scoring skill-autocreator realtime-learning user-modeling realtime-skill-creator skill-mutator genetic-evolution dialectic-user-model; do
        if [ -d "$WORKSPACE/skills/$skill" ]; then
            rm -rf "$WORKSPACE/skills/$skill"
            ok "Removed skill: $skill"
        fi
    done

    # Remove PepeClaw viewer
    if [ -d "$HOME/.openclaw/pepeclaw" ]; then
        rm -rf "$HOME/.openclaw/pepeclaw"
        ok "PepeClaw viewer removed"
    fi

    # Ask about data
    printf "\n"
    read -r -p "Remove data directory (~/.openclaw/data/pepe)? This deletes all fitness logs, dreams, and history. [y/N] " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf "$HOME/.openclaw/data/pepe"
        ok "Data directory removed"
    else
        info "Data directory preserved: ~/.openclaw/data/pepe"
    fi

    ok "PepeClaw + Pepe 2.0 uninstalled."
}

# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
main() {
    banner

    # Handle --uninstall flag
    if [ "${1:-}" = "--uninstall" ] || [ "${1:-}" = "uninstall" ]; then
        uninstall
        exit 0
    fi

    # Handle --version flag
    if [ "${1:-}" = "--version" ] || [ "${1:-}" = "-v" ]; then
        echo "PepeClaw + Pepe 2.0 v$PEPE_VERSION"
        exit 0
    fi

    info "Installing PepeClaw + Pepe 2.0 v$PEPE_VERSION"
    printf "\n"

    preflight
    find_source
    install_skills
    create_data_dirs
    write_config
    setup_cron
    build_pepeclaw
    setup_autostart
    validate
    success_message
    open_browser
}

main "$@"
