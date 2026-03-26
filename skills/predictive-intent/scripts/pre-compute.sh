#!/usr/bin/env bash
# pre-compute.sh — Pre-compute results for predicted requests
# Runs daily at 5:30 AM via cron (before morning brief)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}/projects/pepe-2.0/data/predictive-intent"
PATTERNS_FILE="$DATA_DIR/patterns.json"
CACHE_DIR="$DATA_DIR/pre-computed"

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [pre-compute] $*"
}

ensure_dirs() {
    mkdir -p "$CACHE_DIR"
    if [[ ! -f "$PATTERNS_FILE" ]]; then
        log "No patterns file found. Run pattern-miner.sh first."
        exit 0
    fi
}

run_precompute() {
    export PC_PATTERNS_FILE="$PATTERNS_FILE"
    export PC_CACHE_DIR="$CACHE_DIR"
    export PC_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"

    python3 -c "
import json, os, sys
from datetime import datetime, timezone, timedelta

PATTERNS_FILE = os.environ['PC_PATTERNS_FILE']
CACHE_DIR = os.environ['PC_CACHE_DIR']
WORKSPACE = os.environ['PC_WORKSPACE']

with open(PATTERNS_FILE) as f:
    db = json.load(f)

now = datetime.now(timezone.utc)
current_hour = now.hour
day_names = ['mon','tue','wed','thu','fri','sat','sun']
today_dow = day_names[now.weekday()]
lookahead = 6

# Find predicted patterns
predicted = []
for pattern in db.get('patterns', []):
    if pattern.get('status') != 'active':
        continue
    if pattern.get('confidence', 0) < 0.5:
        continue

    trigger = pattern.get('trigger', {})
    ptype = pattern.get('type', '')
    match = False

    if ptype == 'daily':
        tw = trigger.get('time_window', {})
        start = tw.get('start_hour', 0)
        end = tw.get('end_hour', 23)
        for h in range(current_hour, current_hour + lookahead):
            if start <= (h % 24) <= end:
                match = True
                break
    elif ptype == 'weekly':
        tw = trigger.get('time_window', {})
        days = tw.get('days_of_week', [])
        if today_dow in days:
            match = True
    elif ptype == 'sequential':
        if pattern.get('confidence', 0) > 0.8:
            match = True

    if match:
        predicted.append(pattern)

predicted.sort(key=lambda x: x.get('confidence',0), reverse=True)
print('Found ' + str(len(predicted)) + ' predicted patterns for upcoming window', file=sys.stderr)

if not predicted:
    print('No patterns to pre-compute')
    sys.exit(0)

# Pre-compute each pattern
cached_count = 0
for pattern in predicted:
    pid = pattern['id']
    category = pattern.get('predicted_action',{}).get('category','unknown')
    template = pattern.get('predicted_action',{}).get('template','')
    ttl = pattern.get('predicted_action',{}).get('cache_ttl_minutes', 30)
    cache_file = os.path.join(CACHE_DIR, pid + '.json')

    # Check freshness
    if os.path.exists(cache_file):
        try:
            with open(cache_file) as f:
                cached = json.load(f)
            cached_at = datetime.fromisoformat(cached['cached_at'].replace('Z','+00:00'))
            age = (now - cached_at).total_seconds() / 60
            if age < ttl:
                continue
        except (KeyError, ValueError, json.JSONDecodeError):
            pass

    # Generate pre-computed result
    result = 'Pre-computed context ready for ' + category + ': ' + template

    # For project-status, scan projects
    if category in ('project-status', 'project-health'):
        projects_dir = os.path.join(WORKSPACE, 'projects')
        if os.path.isdir(projects_dir):
            lines = ['Active projects:']
            for proj in sorted(os.listdir(projects_dir)):
                ppath = os.path.join(projects_dir, proj)
                if os.path.isdir(os.path.join(ppath, '.git')):
                    lines.append('  - ' + proj)
            result = chr(10).join(lines)

    cache_data = {
        'pattern_id': pid, 'category': category, 'template': template,
        'cached_at': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'ttl_minutes': ttl, 'status': 'success', 'result': result
    }

    with open(cache_file, 'w') as f:
        json.dump(cache_data, f, indent=2)
    cached_count += 1

# Clean expired
cleaned = 0
for fname in os.listdir(CACHE_DIR):
    if not fname.endswith('.json'):
        continue
    fpath = os.path.join(CACHE_DIR, fname)
    try:
        with open(fpath) as f:
            cached = json.load(f)
        cached_at = datetime.fromisoformat(cached['cached_at'].replace('Z','+00:00'))
        ttl = cached.get('ttl_minutes', 30)
        age = (now - cached_at).total_seconds() / 60
        if age > ttl * 3:
            os.remove(fpath)
            cleaned += 1
    except (KeyError, ValueError, json.JSONDecodeError, OSError):
        pass

print('Pre-computation complete: ' + str(cached_count) + ' cached, ' + str(cleaned) + ' expired cleaned')
"
}

main() {
    log "Starting pre-computation run"
    ensure_dirs
    run_precompute
    log "Pre-computation complete"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
