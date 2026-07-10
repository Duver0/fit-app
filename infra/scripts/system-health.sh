#!/bin/bash

THRESHOLD_DISK=80
THRESHOLD_MEM=90

echo "=== System Health Report $(date) ==="
echo ""

echo "Uptime:"
uptime -p
echo ""

echo "Disk Usage:"
USED_PCT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
df -h / | awk 'NR==2 {print "  " $3 " used / " $2 " (" $5 ")"}'
if [ "${USED_PCT}" -gt "${THRESHOLD_DISK}" ]; then
  echo "  WARNING: Disk usage is ${USED_PCT}% (threshold: ${THRESHOLD_DISK}%)"
fi
echo ""

echo "Memory Usage:"
MEM_TOTAL=$(free -m | awk 'NR==2 {print $2}')
MEM_USED=$(free -m | awk 'NR==2 {print $3}')
MEM_PCT=$(( MEM_USED * 100 / MEM_TOTAL ))
echo "  ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PCT}%)"
if [ "${MEM_PCT}" -gt "${THRESHOLD_MEM}" ]; then
  echo "  WARNING: Memory usage is ${MEM_PCT}% (threshold: ${THRESHOLD_MEM}%)"
fi
echo ""

echo "Docker containers:"
docker compose ps --status running 2>/dev/null || echo "  (not in a docker compose directory)"
echo ""
echo "=== End ==="
