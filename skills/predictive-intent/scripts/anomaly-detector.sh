#!/usr/bin/env bash
# anomaly-detector.sh — Detect unusual patterns and alert
# Part of the Predictive Intent Engine for Pepe 2.0
#
# Usage: ./anomaly-detector.sh
#
# Runs every 15 minutes via cron, also callable as post-conversation hook.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${SKILL_DIR}/data"
REQUEST_LOG="$DATA_DIR/request-log.json"
ANOMALIES_FILE="$DATA_DIR/anomalies.json"
SIGMA_THRESHOLD=2.0
ROLLING_WINDOW_DAYS=14

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [anomaly-detector] $*"
}

ensure_data() {
    mkdir -p "$DATA_DIR"
    if [[ ! -f "$REQUEST_LOG" ]]; then
        echo '[]' > "$REQUEST_LOG"
    fi
    if [[ ! -f "$ANOMALIES_FILE" ]]; then
        echo '[]' > "$ANOMALIES_FILE"
    fi
}

send_alert() {
    local severity="$1" message="$2"
    log "ALERT [$severity] $message"
    if command -v openclaw &>/dev/null; then
        openclaw system event --text "Anomaly [$severity]: $message" --mode now 2>/dev/null || true
    fi
}

run_detection() {
    local alerts
    alerts=$(python3 -c "
import json, math, uuid, os, sys
from datetime import datetime, timezone, timedelta
from collections import defaultdict

REQUEST_LOG = os.environ['AD_REQUEST_LOG']
ANOMALIES_FILE = os.environ['AD_ANOMALIES_FILE']
SIGMA = float(os.environ.get('AD_SIGMA', '2.0'))
WINDOW_DAYS = int(os.environ.get('AD_WINDOW', '14'))

with open(REQUEST_LOG) as f:
    requests = json.load(f)

with open(ANOMALIES_FILE) as f:
    existing_anomalies = json.load(f)

now = datetime.now(timezone.utc)
cutoff = now - timedelta(days=WINDOW_DAYS)
recent_cutoff = now - timedelta(hours=24)
new_anomalies = []
alerts = []

# --- Volume anomalies ---
if len(requests) >= 10:
    hourly_counts = defaultdict(int)
    for req in requests:
        ts = req.get('timestamp', '')
        try:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            if dt >= cutoff:
                hourly_counts[dt.strftime('%Y-%m-%d-%H')] += 1
        except (ValueError, AttributeError):
            continue

    if len(hourly_counts) >= 5:
        counts = list(hourly_counts.values())
        mean = sum(counts) / len(counts)
        variance = sum((x - mean)**2 for x in counts) / (len(counts) - 1) if len(counts) > 1 else 0
        std_dev = math.sqrt(variance) if variance > 0 else 0

        recent_key = now.strftime('%Y-%m-%d-%H')
        recent_count = hourly_counts.get(recent_key, 0)

        if std_dev > 0:
            z = (recent_count - mean) / std_dev
            if abs(z) > SIGMA:
                direction = 'spike' if z > 0 else 'drop'
                sev = 'high' if abs(z) > 3 else 'medium'
                desc = 'Request volume ' + direction + ': ' + str(recent_count) + ' (mean: ' + str(round(mean,1)) + ', ' + str(round(z,1)) + ' sigma)'
                new_anomalies.append({
                    'type': 'traffic_spike' if z > 0 else 'behavior_change',
                    'severity': sev, 'metric': 'requests_per_hour',
                    'expected_value': round(mean, 2), 'actual_value': recent_count,
                    'sigma_deviation': round(z, 2), 'description': desc,
                    'recommended_actions': ['Check server logs', 'Review recent deployments']
                })
                if sev in ('high', 'critical'):
                    alerts.append(sev.upper() + ': ' + desc)

# --- Category anomalies ---
if len(requests) >= 20:
    baseline_cats = defaultdict(int)
    recent_cats = defaultdict(int)
    bt = rt = 0
    for req in requests:
        ts = req.get('timestamp', '')
        cat = req.get('category', 'unknown')
        try:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            if dt >= cutoff and dt < recent_cutoff:
                baseline_cats[cat] += 1; bt += 1
            elif dt >= recent_cutoff:
                recent_cats[cat] += 1; rt += 1
        except (ValueError, AttributeError):
            continue

    if bt >= 10 and rt >= 3:
        for cat, count in recent_cats.items():
            if cat not in baseline_cats and count >= 2:
                desc = 'New category: ' + cat + ' (' + str(count) + ' in 24h)'
                new_anomalies.append({
                    'type': 'behavior_change', 'severity': 'low',
                    'metric': 'category_' + cat, 'expected_value': 0,
                    'actual_value': count, 'sigma_deviation': 0,
                    'description': desc, 'recommended_actions': ['Review new patterns']
                })

# --- Deduplicate and save ---
now_str = now.strftime('%Y-%m-%dT%H:%M:%SZ')
final_new = []
for a in new_anomalies:
    is_dup = False
    for ex in existing_anomalies[-50:]:
        if (ex.get('type') == a['type'] and ex.get('metric') == a['metric']
            and ex.get('timestamp','')[:13] == now_str[:13]):
            is_dup = True
            break
    if not is_dup:
        entry = dict(a)
        entry['id'] = str(uuid.uuid4())
        entry['timestamp'] = now_str
        entry['acknowledged'] = False
        final_new.append(entry)

existing_anomalies.extend(final_new)
if len(existing_anomalies) > 500:
    existing_anomalies = existing_anomalies[-500:]

with open(ANOMALIES_FILE, 'w') as f:
    json.dump(existing_anomalies, f, indent=2)

print('Anomaly detection complete: ' + str(len(final_new)) + ' new anomalies')
for alert in alerts:
    print('ALERT:' + alert)
")

    # Process alerts
    while IFS= read -r line; do
        case "$line" in
            ALERT:*)
                send_alert "high" "${line#ALERT:}"
                ;;
            *)
                log "$line"
                ;;
        esac
    done <<< "$alerts"
}

main() {
    log "Starting anomaly detection run"
    ensure_data

    export AD_REQUEST_LOG="$REQUEST_LOG"
    export AD_ANOMALIES_FILE="$ANOMALIES_FILE"
    export AD_SIGMA="$SIGMA_THRESHOLD"
    export AD_WINDOW="$ROLLING_WINDOW_DAYS"

    run_detection
    log "Anomaly detection complete"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
