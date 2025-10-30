import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    
    // Get token from database
    const { data: tokenData } = await supabase
      .from('jobber_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('id', 1)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No Jobber token found in database',
        tokenStatus: {
          hasToken: false,
          needsAuth: true
        }
      });
    }

    const isExpired = tokenData.expires_at ? new Date(tokenData.expires_at) < new Date() : true;
    
    if (isExpired) {
      return NextResponse.json({
        success: false,
        error: 'Jobber token is expired',
        tokenStatus: {
          hasToken: true,
          isExpired: true,
          expiresAt: tokenData.expires_at,
          needsRefresh: true
        }
      });
    }

    // Test with minimal GraphQL query
    const testQuery = `
      query TestConnection {
        jobs(first: 1) {
          nodes {
            id
            jobNumber
            jobStatus
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    console.log('Testing Jobber connection with minimal query...');
    
    const response = await fetch(JOBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
      },
      body: JSON.stringify({ query: testQuery }),
    });

    const responseText = await response.text();
    console.log('Jobber API response status:', response.status);
    console.log('Jobber API response:', responseText);

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Jobber API request failed with status ${response.status}`,
        response: responseText,
        tokenStatus: {
          hasToken: true,
          isExpired: false,
          apiError: true
        }
      });
    }

    const data = JSON.parse(responseText);
    
    if (data.errors) {
      return NextResponse.json({
        success: false,
        error: 'GraphQL errors returned',
        errors: data.errors,
        tokenStatus: {
          hasToken: true,
          isExpired: false,
          graphqlErrors: true
        }
      });
    }

    const jobs = data.data?.jobs?.nodes || [];
    
    return NextResponse.json({
      success: true,
      message: 'Jobber connection successful',
      data: {
        jobsFound: jobs.length,
        sampleJob: jobs[0] || null,
        hasNextPage: data.data?.jobs?.pageInfo?.hasNextPage || false
      },
      tokenStatus: {
        hasToken: true,
        isExpired: false,
        working: true
      }
    });

  } catch (error) {
    console.error('Jobber connection test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tokenStatus: {
        hasToken: false,
        connectionError: true
      }
    }, { status: 500 });
  }
}
