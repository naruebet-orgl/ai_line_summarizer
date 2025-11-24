#!/bin/bash

echo "🔍 Checking if the fix worked..."
echo ""

# Get stats
response=$(curl -s "https://backend-production-8d6f.up.railway.app/api/debug/stats")

# Display results
echo "$response" | python3 -c "
import sys, json
from datetime import datetime, timezone

data = json.load(sys.stdin)

print('📊 Database Counts:')
print(f'   Owners: {data[\"collections\"][\"owners\"]}')
print(f'   Rooms: {data[\"collections\"][\"rooms\"]}')
print(f'   Sessions: {data[\"collections\"][\"sessions\"]}')
print(f'   Messages: {data[\"collections\"][\"messages\"]}')
print()

print('👥 Owners (checking for new owner):')
for owner in data['owners']:
    status = '✅ NEW BOT' if owner['line_channel_id'] == '1655370523' else '⚠️ OLD BOT'
    print(f'   {status} - {owner[\"name\"]} (Channel: {owner[\"line_channel_id\"]})')
print()

# Check for recent activity
recent = data['recent_sessions'][0]
now = datetime.now(timezone.utc)
session_time = datetime.fromisoformat(recent['start_time'].replace('Z', '+00:00'))
time_diff = (now - session_time).total_seconds()

print('📅 Most Recent Session:')
print(f'   Room: {recent[\"room_name\"]}')
print(f'   Time: {recent[\"start_time\"][:19].replace(\"T\", \" \")}')
print(f'   Messages: {recent[\"message_count\"]}')
print(f'   Status: {recent[\"status\"]}')
print(f'   Age: {int(time_diff)} seconds ago')
print()

if time_diff < 60:
    print('🎉 SUCCESS! New message detected!')
    print('   The fix is working correctly.')
    print()
    print('✅ Next steps:')
    print('   1. Check dashboard: https://summarizer.orglai.com/dashboard/groups')
    print('   2. You should see your new group chat with messages')
else:
    print('⏳ No new message detected yet.')
    print('   Please send a message to your LINE bot and run this again.')
"

echo ""
