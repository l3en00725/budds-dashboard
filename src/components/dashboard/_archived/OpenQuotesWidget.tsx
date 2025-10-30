'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Phone, Mail, ExternalLink, Users } from "lucide-react";
import { DashboardMetrics } from "@/lib/dashboard-service";
import { useState } from "react";

interface OpenQuotesWidgetProps {
  data: DashboardMetrics['openQuotes'];
}

export function OpenQuotesWidget({ data }: OpenQuotesWidgetProps) {
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleFollowUp = (quote: any) => {
    // In a real implementation, this would open Jobber or initiate contact
    const jobberUrl = `https://secure.getjobber.com/quotes/${quote.quote_id}`;
    window.open(jobberUrl, '_blank');
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Open Quotes
          </CardTitle>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{data.count} quotes</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{formatCurrency(data.amount)} total value</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.quotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No open quotes at the moment</p>
            <p className="text-sm mt-1">Great job staying on top of follow-ups!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-gray-700">Quote #</th>
                    <th className="pb-2 font-medium text-gray-700">Client</th>
                    <th className="pb-2 font-medium text-gray-700">Amount</th>
                    <th className="pb-2 font-medium text-gray-700">Created</th>
                    <th className="pb-2 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
                    >
                      <td className="py-3 font-medium text-blue-600">
                        {quote.quote_number || quote.id.slice(-6)}
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{quote.client_name || 'Unknown Client'}</div>
                        {expandedQuote !== quote.id && (
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">
                            {quote.client_email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-medium">
                        {quote.amount ? formatCurrency(quote.amount) : 'TBD'}
                      </td>
                      <td className="py-3 text-gray-600">
                        {quote.created_at_jobber ? formatDate(quote.created_at_jobber) : '-'}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFollowUp(quote);
                          }}
                          className="bg-blue-600 text-white text-xs py-1 px-2 rounded hover:bg-blue-700 transition-colors"
                        >
                          Follow Up Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded quote details */}
            {expandedQuote && data.quotes.find(q => q.id === expandedQuote) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                {(() => {
                  const quote = data.quotes.find(q => q.id === expandedQuote)!;
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Quote #{quote.quote_number || quote.id.slice(-6)}
                          </h4>
                          <p className="text-sm text-gray-600">{quote.client_name}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {quote.amount ? formatCurrency(quote.amount) : 'Amount TBD'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created {quote.created_at_jobber ? formatDate(quote.created_at_jobber) : 'Unknown'}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-2">
                        {quote.client_phone && (
                          <button
                            onClick={() => handleCall(quote.client_phone!)}
                            className="flex items-center space-x-1 bg-green-600 text-white text-sm py-2 px-3 rounded hover:bg-green-700 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                            <span>Call</span>
                          </button>
                        )}

                        {quote.client_email && (
                          <button
                            onClick={() => handleEmail(quote.client_email!)}
                            className="flex items-center space-x-1 bg-blue-600 text-white text-sm py-2 px-3 rounded hover:bg-blue-700 transition-colors"
                          >
                            <Mail className="h-4 w-4" />
                            <span>Email</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleFollowUp(quote)}
                          className="flex items-center space-x-1 bg-purple-600 text-white text-sm py-2 px-3 rounded hover:bg-purple-700 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Open in Jobber</span>
                        </button>
                      </div>

                      {quote.client_email && (
                        <div className="text-sm text-gray-600">
                          <strong>Email:</strong> {quote.client_email}
                        </div>
                      )}

                      {quote.client_phone && (
                        <div className="text-sm text-gray-600">
                          <strong>Phone:</strong> {quote.client_phone}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {data.quotes.length > 5 && (
              <div className="text-center pt-4">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View All {data.count} Quotes →
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}