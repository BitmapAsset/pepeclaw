#!/usr/bin/env bash
# pattern-miner.sh — Mine temporal patterns from conversation logs
# Runs daily at 1 AM via cron
# Reads request-log.json, discovers recurring patterns, writes to patterns.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}/projects/pepe-2.0/data/predictive-intent"
REQUEST_LOG="$DATA_DIR/request-log.json"
PATTERNS_FILE="$DATA_DIR/patterns.json"
MIN_OCCURRENCES=3
CONFIDENCE_THRESHOLD=0.6

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [pattern-miner] $*"
}

ensure_data_dir() {
    mkdir -p "$DATA_DIR"
    if [[ ! -f "$REQUEST_LOG" ]]; then
        echo '[]' > "$REQUEST_LOG"
        log "Initialized empty request log"
    fi
    if [[ ! -f "$PATTERNS_FILE" ]]; then
        cat > "$PATTERNS_FILE" << 'INIT'
{
  "version": "1.0.0",
  "last_updated": null,
  "patterns": []
}
INIT
        log "Initialized empty patterns database"
    fi
}

count_requests() {
    python3 -c "import json; print(len(json.load(open('$REQUEST_LOG'))))"
}

# All pattern mining in a single Python script to avoid heredoc issues
run_mining() {
    python3 -c "
import json, uuid, os, sys
from collections import defaultdict, Counter
from datetime import datetime, timezone

REQUEST_LOG = os.environ['PI_REQUEST_LOG']
PATTERNS_FILE = os.environ['PI_PATTERNS_FILE']
MIN_OCC = int(os.environ.get('PI_MIN_OCC', '3'))
CONF_THRESH = float(os.environ.get('PI_CONF_THRESH', '0.6'))

with open(REQUEST_LOG) as f:
    requests = json.load(f)

if len(requests) < MIN_OCC:
    print('Not enough requests', file=sys.stderr)
    sys.exit(0)

total_days_set = {r.get('timestamp','')[:10] for r in requests if r.get('timestamp')}
total_days = len(total_days_set) or 1
total_weeks_set = {r.get('timestamp','')[:7] for r in requests if r.get('timestamp')}
total_weeks = len(total_weeks_set) or 1

# --- Daily patterns ---
hourly = defaultdict(lambda: {'count': 0, 'days': set(), 'requests': []})
for req in requests:
    ts = req.get('timestamp', '')
    cat = req.get('category', 'unknown')
    ctx = req.get('context', {})
    hour = ctx.get('hour', -1)
    if hour < 0:
        try:
            hour = datetime.fromisoformat(ts.replace('Z','+00:00')).hour
        except (ValueError, AttributeError):
            continue
    day = ts[:10]
    hourly[(hour, cat)]['count'] += 1
    hourly[(hour, cat)]['days'].add(day)
    hourly[(hour, cat)]['requests'].append(req.get('request',''))

daily_patterns = []
for (hour, cat), data in hourly.items():
    unique_days = len(data['days'])
    if unique_days >= MIN_OCC:
        confidence = unique_days / total_days
        if confidence >= CONF_THRESH:
            common = Counter(data['requests']).most_common(1)
            template = common[0][0] if common else cat
            daily_patterns.append({'type':'daily','hour':hour,'category':cat,'template':template,
                'confidence':round(confidence,3),'occurrence_count':data['count']})

# --- Weekly patterns ---
day_names = ['mon','tue','wed','thu','fri','sat','sun']
weekly = defaultdict(lambda: {'count': 0, 'weeks': set(), 'requests': []})
for req in requests:
    ctx = req.get('context', {})
    dow = ctx.get('day_of_week', '')
    cat = req.get('category', 'unknown')
    ts = req.get('timestamp', '')
    week = ts[:10]
    if dow and dow.lower()[:3] in day_names:
        weekly[(dow.lower()[:3], cat)]['count'] += 1
        weekly[(dow.lower()[:3], cat)]['weeks'].add(week)
        weekly[(dow.lower()[:3], cat)]['requests'].append(req.get('request',''))

weekly_patterns = []
for (dow, cat), data in weekly.items():
    unique_weeks = len(data['weeks'])
    if unique_weeks >= MIN_OCC:
        confidence = min(unique_weeks / total_weeks, 1.0)
        if confidence >= CONF_THRESH:
            common = Counter(data['requests']).most_common(1)
            template = common[0][0] if common else cat
            weekly_patterns.append({'type':'weekly','day_of_week':dow,'category':cat,'template':template,
                'confidence':round(confidence,3),'occurrence_count':data['count']})

# --- Sequential patterns ---
sessions = defaultdict(list)
for req in requests:
    sid = req.get('context',{}).get('session_id','default')
    sessions[sid].append(req.get('category','unknown'))

bigrams = defaultdict(int)
cat_counts = defaultdict(int)
for sid, cats in sessions.items():
    for i in range(len(cats)-1):
        bigrams[(cats[i],cats[i+1])] += 1
        cat_counts[cats[i]] += 1

sequential_patterns = []
for (a,b), count in bigrams.items():
    if count >= MIN_OCC and a != b:
        confidence = count / cat_counts[a] if cat_counts[a] > 0 else 0
        if confidence >= CONF_THRESH:
            sequential_patterns.append({'type':'sequential','preceding_action':a,'predicted_action':b,
                'confidence':round(confidence,3),'occurrence_count':count})

# --- Merge into DB ---
with open(PATTERNS_FILE) as f:
    db = json.load(f)

existing = {p.get('description',''): p for p in db.get('patterns',[])}
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def make_pattern(raw, ptype):
    if ptype == 'daily':
        desc = 'Daily at ~' + str(raw['hour']) + ':00 — ' + raw['category']
        trigger = {'time_window':{'start_hour':max(0,raw['hour']-1),'end_hour':min(23,raw['hour']+1)},'context_signals':[]}
    elif ptype == 'weekly':
        desc = 'Weekly on ' + raw['day_of_week'] + ' — ' + raw['category']
        trigger = {'time_window':{'days_of_week':[raw['day_of_week']]},'context_signals':[]}
    elif ptype == 'sequential':
        desc = 'After ' + raw['preceding_action'] + ' → ' + raw['predicted_action']
        trigger = {'preceding_actions':[raw['preceding_action']],'context_signals':[]}
    else:
        return None
    return {
        'id': str(uuid.uuid4()), 'type': ptype, 'description': desc, 'trigger': trigger,
        'predicted_action': {'category': raw.get('category', raw.get('predicted_action','unknown')),
            'template': raw.get('template', raw.get('predicted_action','')), 'cache_ttl_minutes': 30},
        'confidence': raw['confidence'], 'occurrence_count': raw['occurrence_count'],
        'last_triggered': None, 'hit_rate': 0.0, 'created_at': now, 'status': 'active'
    }

created = updated = 0
all_raw = [(p, 'daily') for p in daily_patterns] + [(p, 'weekly') for p in weekly_patterns] + [(p, 'sequential') for p in sequential_patterns]

all_descs = set()
for raw, ptype in all_raw:
    p = make_pattern(raw, ptype)
    desc = p['description']
    all_descs.add(desc)
    if desc in existing:
        existing[desc]['confidence'] = p['confidence']
        existing[desc]['occurrence_count'] = p['occurrence_count']
        updated += 1
    else:
        existing[desc] = p
        created += 1

for desc, p in existing.items():
    if desc not in all_descs and p['status'] == 'active' and p.get('occurrence_count',0) < 5:
        p['status'] = 'dormant'

db['patterns'] = list(existing.values())
db['last_updated'] = now

with open(PATTERNS_FILE, 'w') as f:
    json.dump(db, f, indent=2)

print('Pattern mining complete: ' + str(created) + ' new, ' + str(updated) + ' updated, ' + str(len(db['patterns'])) + ' total')
"
}

main() {
    log "Starting pattern mining run"
    ensure_data_dir

    local request_count
    request_count=$(count_requests)
    log "Request log contains $request_count entries"

    if [[ "$request_count" -lt "$MIN_OCCURRENCES" ]]; then
        log "Not enough requests for pattern mining (need at least $MIN_OCCURRENCES). Skipping."
        exit 0
    fi

    export PI_REQUEST_LOG="$REQUEST_LOG"
    export PI_PATTERNS_FILE="$PATTERNS_FILE"
    export PI_MIN_OCC="$MIN_OCCURRENCES"
    export PI_CONF_THRESH="$CONFIDENCE_THRESHOLD"

    run_mining
    log "Pattern mining complete"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
