-- Quick test call data for launch
INSERT INTO openphone_calls (
    call_id, caller_number, direction, duration, call_date,
    transcript, classified_as_booked, classification_confidence,
    outcome, sentiment
) VALUES
-- Today's calls
('today-call-1', '+15551234567', 'inbound', 180, '2025-10-03T09:30:00',
 'Customer called about a drain clog. Very urgent - kitchen sink backing up. Scheduled appointment for tomorrow morning at 9 AM.',
 true, 95, 'appointment_scheduled', 'positive'),

('today-call-2', '+15559876543', 'inbound', 45, '2025-10-03T11:15:00',
 'Just calling to ask about pricing for water heater installation. Not ready to book yet.',
 false, 88, 'information_request', 'neutral'),

('today-call-3', '+15551112222', 'inbound', 320, '2025-10-03T14:20:00',
 'EMERGENCY - burst pipe in basement! Water everywhere! Please come ASAP!',
 true, 98, 'emergency_scheduled', 'urgent'),

('today-call-4', '+15553334444', 'outbound', 95, '2025-10-03T16:45:00',
 'Follow-up call to customer about estimate provided last week. Customer wants to think about it more.',
 false, 75, 'follow_up_needed', 'positive'),

('today-call-5', '+15555556666', 'inbound', 240, '2025-10-03T10:30:00',
 'Toilet repair needed. Customer available this week for appointment.',
 true, 92, 'appointment_scheduled', 'positive');