#!/bin/bash

echo "🔍 Checking if new message was saved..."
echo ""

# Get the latest stats
response=$(curl -s "https://backend-production-8d6f.up.railway.app/api/debug/stats")

# Parse and display key information
echo "$response" | python3 -c "
import sys, json
from datetime import datetime

data = json.load(sys.stdin)

print('📊 Current Database Stats:')
print(f'   Sessions: {data[\"collections\"][\"sessions\"]}')
print(f'   Messages: {data[\"collections\"][\"messages\"]}')
print(f'   Rooms: {data[\"collections\"][\"rooms\"]}')
print()

print('👤 Owner Channel ID:')
for owner in data['owners']:
    print(f'   {owner[\"name\"]}: {owner[\"line_channel_id\"]}')
print()

print('📅 Last 3 Sessions:')
for i, session in enumerate(data['recent_sessions'][:3], 1):
    date = session['start_time'][:19].replace('T', ' ')
    print(f'   {i}. {session[\"room_name\"]} | {date} | {session[\"message_count\"]} msgs | {session[\"status\"]}')
print()

# Check if there's a very recent session (within last hour)
from datetime import datetime, timezone, timedelta
now = datetime.now(timezone.utc)
recent = data['recent_sessions'][0]
session_time = datetime.fromisoformat(recent['start_time'].replace('Z', '+00:00'))
time_diff = (now - session_time).total_seconds()

if time_diff < 300:  # Less than 5 minutes
    print('✅ SUCCESS! New message detected!')
    print(f'   Message received {int(time_diff)} seconds ago')
else:
    print('⏳ No new message yet...')
    print(f'   Last message was {int(time_diff/60)} minutes ago')
    print()
    print('💡 Tips:')
    print('   1. Make sure you sent a message to Bot-Dr.Jel')
    print('   2. Wait a few more seconds and run this script again')
    print('   3. Check Railway logs for errors')
"

echo ""
echo "🔄 Run this script again after sending a message:"
echo "   bash test-webhook.sh"
