# Restaurant Sales Conversational AI

This project provides a Node.js + SQLite backend and an Angular frontend to chat with restaurant sales data, save conversations, and turn insights into reusable reports.

## Project structure

- `server/` - Express API with SQLite storage.
- `client/` - Angular application for chatting and saving reports.

## Getting started

### Backend

```bash
cd server
npm install
npm run start
```

The API runs on `http://localhost:3001`.

### Frontend

```bash
cd client
npm install
npm start
```

The UI runs on `http://localhost:4200`.

## API overview

- `GET /api/restaurants` - list restaurants in the dataset.
- `GET /api/staff` - shift, leave, and bank holiday data with employee details.
- `GET /api/employees` - employee profile data.
- `GET /api/invoices` - invoices and invoice lines from sales/staff files.
- `GET /api/sites` - list site metadata and attached entities.
- `GET /api/entities` - list business entities.
- `GET /api/business-dates` - flattened business dates across all sites.
- `GET /api/conversations` - list saved conversations.
- `POST /api/conversations` - create a conversation.
- `GET /api/conversations/:id/messages` - load conversation messages.
- `POST /api/chat` - send a message, store the reply, and create a conversation if needed.
- `GET /api/reports` - list saved reports.
- `POST /api/reports` - save a report from a conversation.

## Notes

- Sales + staff data files live in `server/data/sales_staff/*.json` and include invoices, invoice lines,
  cover details, staff shifts, leave records, and bank holiday entries.
  - `sales_staff` file format:
    ```json
    {
      "entity_name": "City Eats Group",
      "sites": [
        {
          "site_name": "Sunrise Diner",
          "currency": "USD",
          "businessDates": [
            {
              "sale_date": "2025-01-01",
              "date_of_month": "1",
              "month_no": "01",
              "month": "January",
              "year": 2025,
              "coverdetails": [{ "session": "Breakfast", "revenue_centers": [{ "revenue_center": "Main", "covers": 120 }] }],
              "invoices": [{ "invoice_number": "INV-5001", "session": "Breakfast", "open_time": "...", "close_time": "...", "revenue_center": "Main", "invoice_totals": { "net": 45, "tax": 3.6, "gross": 48.6, "service_charge": 0, "donation_amount": 0, "tips": 7, "discount_amount": 0 }, "lines": [], "payments": [], "discounts": [] }],
              "shifts": [{ "employee_number": "EMP-001", "employee_name": "Ava Lopez", "business_date": "2025-01-01", "section_name": "Main", "department_name": "FOH", "position_name": "Server", "scheduled_start": "...", "scheduled_end": "...", "scheduled_hours": 8, "scheduled_net_shift_cost": 120, "scheduled_holiday_accrual_cost": 8, "scheduled_nic_cost": 6, "scheduled_pension_cost": 5, "scheduled_paid_break": 30, "scheduled_unpaid_break": 0, "clock_in": "...", "clock_out": "...", "clocked_hours": 7.9, "clocked_break_duration_in_minutes": 30, "approved_clock_in": "...", "approved_clock_out": "...", "approved_hours": 7.9, "approved_net_shift_cost": 118, "approved_holiday_accrual_cost": 8, "approved_nic_cost": 6, "approved_pension_cost": 5, "approved_break_duration_in_minutes": 30, "noshow": false, "pay_type": "Hourly", "status_name": "Approved" }],
              "leaves": [{ "employee_number": "EMP-002", "employee_name": "Noah Singh", "business_date": "2025-01-01", "leave_cost": 0 }],
              "employee_bank_holidays": [{ "employee_number": "EMP-003", "employee_name": "Maya Chen", "business_date": "2025-01-01", "bank_holiday_cost": 0 }]
            }
          ]
        }
      ]
    }
    ```
- Employee master data lives in `server/data/employees.json` and follows the entity/site structure:
  ```json
  [
    {
      "entity_name": "City Eats Group",
      "sites": [
        {
          "site_name": "Sunrise Diner",
          "employees": [
            {
              "TITLE": "Ms",
              "EMPLOYEE_NAME": "Ava Lopez",
              "EMPLOYEE_NUMBER": "EMP-001",
              "KNOWN_AS": "Ava",
              "NATIONALITY": "American",
              "GENDER": "Female",
              "DATE_OF_BIRTH": "1995-04-12",
              "PRIMARY_PHONE": "+1-555-0101",
              "EMAIL": "ava.lopez@example.com",
              "POSITION_NAME": "Server",
              "SECONDARY_PHONE": "",
              "DEPARTMENT_NAME": "FOH",
              "JOINING_DATE": "2022-05-10",
              "PROBATION_END_DATE": "2022-11-10",
              "TERMINATION_DATE": null,
              "PRIMARY_REPORTING_MANAGER": "Jordan Lee",
              "SECONDARY_REPORTING_MANAGER": "Nina Patel",
              "TERTIARY_REPORTING_MANAGER": "Chris Brown",
              "PAYSCHEDULE_NAME": "Monthly",
              "PAY_TYPE": "Hourly",
              "BRANCH_ID": 101
            }
          ]
        }
      ]
    }
  ]
  ```
- The API will use the OpenAI Responses + Conversations APIs when `OPENAI_API_KEY` is set.
  - Optional: set `OPENAI_MODEL` (default `gpt-4o-mini`) and `OPENAI_BASE_URL` for proxies.
