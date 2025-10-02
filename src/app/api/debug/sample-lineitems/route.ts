import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get sample of line items to see what we're working with
    const { data: sampleLineItems, error } = await supabase
      .from('jobber_line_items')
      .select('name, description')
      .limit(50);

    if (error) {
      throw error;
    }

    // Test the current membership search
    const { data: membershipMatches, error: membershipError } = await supabase
      .from('jobber_line_items')
      .select('name, description')
      .or('name.ilike.%membership%,name.ilike.%silver%,name.ilike.%gold%,name.ilike.%platinum%,name.ilike.%budd%,description.ilike.%membership%,description.ilike.%silver%,description.ilike.%gold%,description.ilike.%platinum%,description.ilike.%budd%')
      .limit(20);

    // Test with "budd's" instead of "budd"
    const { data: buddsMatches, error: buddsError } = await supabase
      .from('jobber_line_items')
      .select('name, description')
      .or('name.ilike.%budd\'s%,name.ilike.%membership program%,description.ilike.%budd\'s%,description.ilike.%membership program%')
      .limit(20);

    return NextResponse.json({
      totalLineItems: sampleLineItems?.length || 0,
      sampleLineItems: sampleLineItems?.slice(0, 10) || [],
      currentSearchMatches: membershipMatches?.length || 0,
      currentSearchSample: membershipMatches || [],
      buddsSearchMatches: buddsMatches?.length || 0,
      buddsSearchSample: buddsMatches || [],
      errors: {
        sample: error,
        membership: membershipError,
        budds: buddsError
      }
    });

  } catch (error) {
    console.error('Sample line items error:', error);
    return NextResponse.json(
      { error: 'Failed to get sample line items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}