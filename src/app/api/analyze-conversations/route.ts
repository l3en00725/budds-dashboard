import { NextResponse } from 'next/server';

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;

export async function GET() {
  try {
    if (!OPENPHONE_API_KEY) {
      return NextResponse.json({ error: 'OpenPhone API key not configured' }, { status: 500 });
    }

    console.log('Analyzing conversations for call data...');

    const results = {
      apiKeyConfigured: true,
      conversationDetails: [],
      callsFound: [],
      messagesFound: []
    };

    // Get conversations first
    const conversationsUrl = 'https://api.openphone.com/v1/conversations?limit=20';
    const conversationsResponse = await fetch(conversationsUrl, {
      headers: {
        'Authorization': OPENPHONE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!conversationsResponse.ok) {
      throw new Error(`Failed to fetch conversations: ${conversationsResponse.status}`);
    }

    const conversationsData = await conversationsResponse.json();
    console.log(`Found ${conversationsData.data.length} conversations`);

    // Analyze each conversation in detail
    for (const conversation of conversationsData.data.slice(0, 10)) { // Limit to first 10 for performance
      console.log(`Analyzing conversation ${conversation.id}...`);

      const conversationDetail = {
        id: conversation.id,
        participants: conversation.participants,
        phoneNumberId: conversation.phoneNumberId,
        lastActivityAt: conversation.lastActivityAt,
        createdAt: conversation.createdAt,
        activities: [],
        callCount: 0,
        messageCount: 0
      };

      // Get activities for this conversation
      try {
        const activitiesUrl = `https://api.openphone.com/v1/conversations/${conversation.id}/activities?limit=50`;

        const activitiesResponse = await fetch(activitiesUrl, {
          headers: {
            'Authorization': OPENPHONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json();
          conversationDetail.activities = activitiesData.data || [];

          // Count and categorize activities
          for (const activity of conversationDetail.activities) {
            if (activity.type === 'call') {
              conversationDetail.callCount++;
              results.callsFound.push({
                conversationId: conversation.id,
                activityId: activity.id,
                type: activity.type,
                direction: activity.direction,
                status: activity.status,
                duration: activity.duration,
                startedAt: activity.startedAt,
                endedAt: activity.endedAt,
                participant: conversation.participants[0],
                phoneNumber: conversation.phoneNumberId,
                recording: activity.recording,
                transcript: activity.transcript
              });
            } else if (activity.type === 'message') {
              conversationDetail.messageCount++;
              results.messagesFound.push({
                conversationId: conversation.id,
                activityId: activity.id,
                type: activity.type,
                direction: activity.direction,
                body: activity.body,
                sentAt: activity.sentAt,
                participant: conversation.participants[0],
                phoneNumber: conversation.phoneNumberId
              });
            }
          }

          console.log(`Conversation ${conversation.id}: ${conversationDetail.callCount} calls, ${conversationDetail.messageCount} messages`);
        } else {
          conversationDetail.error = `Failed to fetch activities: ${activitiesResponse.status}`;
        }

      } catch (error) {
        conversationDetail.error = error instanceof Error ? error.message : 'Unknown error';
      }

      results.conversationDetails.push(conversationDetail);
    }

    // Summary
    const totalCalls = results.callsFound.length;
    const totalMessages = results.messagesFound.length;
    const totalConversations = results.conversationDetails.length;

    // Get today's and yesterday's activity
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todaysCalls = results.callsFound.filter(call => call.startedAt?.startsWith(today));
    const yesterdaysCalls = results.callsFound.filter(call => call.startedAt?.startsWith(yesterday));

    const todaysMessages = results.messagesFound.filter(msg => msg.sentAt?.startsWith(today));
    const yesterdaysMessages = results.messagesFound.filter(msg => msg.sentAt?.startsWith(yesterday));

    const summary = {
      totalConversationsAnalyzed: totalConversations,
      totalCallsFound: totalCalls,
      totalMessagesFound: totalMessages,
      breakdown: {
        today: {
          calls: todaysCalls.length,
          messages: todaysMessages.length
        },
        yesterday: {
          calls: yesterdaysCalls.length,
          messages: yesterdaysMessages.length
        }
      },
      phoneNumbersWithActivity: [...new Set([
        ...results.callsFound.map(c => c.phoneNumber),
        ...results.messagesFound.map(m => m.phoneNumber)
      ])],
      insights: []
    };

    // Add insights
    if (totalCalls > 0) {
      summary.insights.push(`Found ${totalCalls} calls in conversations - this is where the call data is stored!`);
    }
    if (totalMessages > 0) {
      summary.insights.push(`Found ${totalMessages} messages in conversations`);
    }
    if (yesterdaysCalls.length > 0) {
      summary.insights.push(`Found ${yesterdaysCalls.length} calls from yesterday - confirming recent activity`);
    }
    if (totalCalls === 0 && totalMessages === 0) {
      summary.insights.push('No call or message activities found in conversations');
    }

    console.log('Conversation analysis completed:', summary);

    return NextResponse.json({
      ...results,
      summary,
      // Include sample data
      sampleCalls: results.callsFound.slice(0, 3),
      sampleMessages: results.messagesFound.slice(0, 3)
    });

  } catch (error) {
    console.error('Conversation analysis failed:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKeyConfigured: !!OPENPHONE_API_KEY,
    }, { status: 500 });
  }
}