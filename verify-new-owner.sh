#!/bin/bash

echo "🔍 Checking for new owner and messages..."
echo ""

# Get the stats
response=$(curl -s "https://backend-production-8d6f.up.railway.app/api/debug/stats")

# Parse and display
echo "$response" | python3 -c "
import sys, json
from datetime import datetime, timezone

data = json.load(sys.stdin)

print('📊 Database Stats:')
print(f'   Sessions: {data[\"collections\"][\"sessions\"]}')
print(f'   Messages: {data[\"collections\"][\"messages\"]}')
print(f'   Rooms: {data[\"collections\"][\"rooms\"]}')
print(f'   Owners: {data[\"collections\"][\"owners\"]}')
print()

print('👥 All Owners in Database:')
for i, owner in enumerate(data['owners'], 1):
    print(f'   {i}. {owner[\"name\"]} ({owner[\"email\"]})')
    print(f'      Channel ID: {owner[\"line_channel_id\"]}')
    marker = '✅ NEW BOT' if owner['line_channel_id'] == '1655370523' else '❌ OLD BOT'
    print(f'      Status: {marker}')
    print()

print('📅 Recent Sessions (Last 3):')
for i, session in enumerate(data['recent_sessions'][:3], 1):
    date = session['start_time'][:19].replace('T', ' ')
    print(f'   {i}. {session[\"room_name\"]}')
    print(f'      Date: {date}')
    print(f'      Messages: {session[\"message_count\"]} | Status: {session[\"status\"]}')
    print()

# Check for very recent activity
now = datetime.now(timezone.utc)
recent = data['recent_sessions'][0]
session_time = datetime.fromisoformat(recent['start_time'].replace('Z', '+00:00'))
time_diff = (now - session_time).total_seconds()

if time_diff < 60:  # Less than 1 minute
    print('🎉 SUCCESS! New message just received!')
    print(f'   Received {int(time_diff)} seconds ago')
    print()
    print('✅ Your bot is now working correctly!')
    print('   Check the dashboard: https://summarizer.orglai.com/dashboard/groups')
elif time_diff < 300:  # Less than 5 minutes
    print('✅ Recent activity detected!')
    print(f'   Last message was {int(time_diff)} seconds ago')
else:
    print('⏳ Waiting for new message...')
    print(f'   Last message was {int(time_diff/60)} minutes ago')
    print()
    print('💡 Make sure to send a message to Bot-Dr.Jel via LINE app')
"

echo ""
