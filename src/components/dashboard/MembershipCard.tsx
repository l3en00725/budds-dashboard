'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Award, Medal, Users } from 'lucide-react';
import { DashboardMetrics } from '@/lib/dashboard-service';

interface MembershipCardProps {
  membershipData: DashboardMetrics['gmMetrics']['membershipRevenue'];
}

export default function MembershipCard({ membershipData }: MembershipCardProps) {
  const memberships = [
    {
      type: 'Silver',
      count: membershipData.silverCount,
      icon: Medal,
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      iconColor: 'text-slate-600',
    },
    {
      type: 'Gold',
      count: membershipData.goldCount,
      icon: Award,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      iconColor: 'text-yellow-600',
    },
    {
      type: 'Platinum',
      count: membershipData.platinumCount,
      icon: Crown,
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 gradient-text">
          <Users className="h-5 w-5 text-purple-600" />
          Active Memberships
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Individual Membership Types */}
        <div className="space-y-3">
          {memberships.map((membership) => {
            const Icon = membership.icon;
            return (
              <div
                key={membership.type}
                className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-white to-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${membership.color}`}>
                    <Icon className={`h-4 w-4 ${membership.iconColor}`} />
                  </div>
                  <span className="font-medium text-gray-700">
                    {membership.type}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={`${membership.color} font-semibold px-3 py-1`}
                >
                  {membership.count}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Total Count */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <span className="font-semibold gradient-text">
                Total Members
              </span>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg px-4 py-2">
              {membershipData.totalCount}
            </Badge>
          </div>
        </div>

        {/* Revenue Info */}
        {membershipData.monthly > 0 && (
          <div className="pt-2">
            <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Monthly Revenue</div>
              <div className="text-xl font-bold text-green-700">
                ${membershipData.monthly.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}