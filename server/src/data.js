import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "data");
const salesStaffDir = path.join(dataDir, "sales_staff");

const revenueCenterSchema = z.object({
  revenue_center: z.string().min(1),
  covers: z.number()
});

const coverDetailSchema = z.object({
  session: z.string().min(1),
  revenue_centers: z.array(revenueCenterSchema)
});

const invoiceTotalsSchema = z.object({
  net: z.number(),
  tax: z.number(),
  gross: z.number(),
  service_charge: z.number(),
  donation_amount: z.number(),
  tips: z.number(),
  discount_amount: z.number()
});

const invoiceLineSchema = z.object({
  product_sku: z.string().min(1),
  product_name: z.string().min(1),
  time_of_sale: z.string().min(1),
  category_name: z.string().min(1),
  quantity: z.number(),
  net: z.number(),
  tax: z.number(),
  gross: z.number(),
  tax_percent: z.number(),
  void_details: z.object({
    is_voided: z.boolean(),
    amount: z.number(),
    reason: z.string().nullable()
  })
});

const invoiceSchema = z.object({
  invoice_number: z.string().min(1),
  session: z.string().min(1),
  open_time: z.string().min(1),
  close_time: z.string().min(1),
  revenue_center: z.string().min(1),
  invoice_totals: invoiceTotalsSchema,
  lines: z.array(invoiceLineSchema),
  payments: z.array(
    z.object({
      method: z.string().min(1),
      amount: z.number(),
      tips: z.number()
    })
  ),
  discounts: z.array(
    z.object({
      staff_name: z.string().min(1),
      amount: z.number(),
      reason: z.string().min(1)
    })
  )
});

const shiftSchema = z.object({
  employee_number: z.string().min(1),
  employee_name: z.string().min(1),
  business_date: z.string().min(1),
  section_name: z.string().nullable(),
  department_name: z.string().min(1),
  position_name: z.string().min(1),
  scheduled_start: z.string().min(1),
  scheduled_end: z.string().min(1),
  scheduled_hours: z.number(),
  scheduled_net_shift_cost: z.number(),
  scheduled_holiday_accrual_cost: z.number(),
  scheduled_nic_cost: z.number(),
  scheduled_pension_cost: z.number(),
  scheduled_paid_break: z.number(),
  scheduled_unpaid_break: z.number(),
  clock_in: z.string().nullable(),
  clock_out: z.string().nullable(),
  clocked_hours: z.number(),
  clocked_break_duration_in_minutes: z.number(),
  approved_clock_in: z.string().nullable(),
  approved_clock_out: z.string().nullable(),
  approved_hours: z.number(),
  approved_net_shift_cost: z.number(),
  approved_holiday_accrual_cost: z.number(),
  approved_nic_cost: z.number(),
  approved_pension_cost: z.number(),
  approved_break_duration_in_minutes: z.number(),
  noshow: z.boolean(),
  pay_type: z.string().min(1),
  status_name: z.string().min(1)
});

const leaveSchema = z.object({
  employee_number: z.string().min(1),
  employee_name: z.string().min(1),
  business_date: z.string().min(1),
  leave_cost: z.number()
});

const bankHolidaySchema = z.object({
  employee_number: z.string().min(1),
  employee_name: z.string().min(1),
  business_date: z.string().min(1),
  bank_holiday_cost: z.number()
});

const businessDateSchema = z.object({
  sale_date: z.string().min(1),
  date_of_month: z.string().min(1),
  month_no: z.string().min(1),
  month: z.string().min(1),
  year: z.number(),
  coverdetails: z.array(coverDetailSchema),
  invoices: z.array(invoiceSchema),
  shifts: z.array(shiftSchema),
  leaves: z.array(leaveSchema),
  employee_bank_holidays: z.array(bankHolidaySchema)
});

const siteSchema = z.object({
  site_name: z.string().min(1),
  currency: z.string().min(1),
  businessDates: z.array(businessDateSchema)
});

const entitySchema = z.object({
  entity_name: z.string().min(1),
  sites: z.array(siteSchema)
});

const employeeSchema = z.object({
  TITLE: z.string().min(1),
  EMPLOYEE_NAME: z.string().min(1),
  EMPLOYEE_NUMBER: z.string().min(1),
  KNOWN_AS: z.string().min(1),
  NATIONALITY: z.string().min(1),
  GENDER: z.string().min(1),
  DATE_OF_BIRTH: z.string().min(1),
  PRIMARY_PHONE: z.string().min(1),
  EMAIL: z.string().min(1),
  POSITION_NAME: z.string().min(1),
  SECONDARY_PHONE: z.string().optional(),
  DEPARTMENT_NAME: z.string().min(1),
  JOINING_DATE: z.string().min(1),
  PROBATION_END_DATE: z.string().min(1),
  TERMINATION_DATE: z.string().nullable(),
  PRIMARY_REPORTING_MANAGER: z.string().min(1),
  SECONDARY_REPORTING_MANAGER: z.string().min(1),
  TERTIARY_REPORTING_MANAGER: z.string().min(1),
  PAYSCHEDULE_NAME: z.string().min(1),
  PAY_TYPE: z.string().min(1),
  BRANCH_ID: z.number()
});

const employeeSiteSchema = z.object({
  site_name: z.string().min(1),
  employees: z.array(employeeSchema)
});

const employeeEntitySchema = z.object({
  entity_name: z.string().min(1),
  sites: z.array(employeeSiteSchema)
});

const loadJsonFile = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
};

const loadSalesStaffFiles = async () => {
  const files = await fs.readdir(salesStaffDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  const results = await Promise.all(
    jsonFiles.map(async (file) => {
      const data = await loadJsonFile(path.join(salesStaffDir, file));
      const parsed = z.array(entitySchema).safeParse(data);
      if (!parsed.success) {
        throw new Error(`Sales/staff file ${file} has invalid format.`);
      }
      return parsed.data;
    })
  );
  return results.flat();
};

const loadEmployeesFile = async () => {
  const data = await loadJsonFile(path.join(dataDir, "employees.json"));
  const parsed = z.array(employeeEntitySchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("employees.json has invalid format.");
  }
  return parsed.data;
};

export const loadAllData = async () => {
  const [salesStaff, employeeEntities] = await Promise.all([
    loadSalesStaffFiles(),
    loadEmployeesFile()
  ]);

  const entities = salesStaff;
  const sites = salesStaff.flatMap((entity) =>
    entity.sites.map((site) => ({ ...site, entity_name: entity.entity_name }))
  );
  const businessDates = sites.flatMap((site) =>
    site.businessDates.map((businessDate) => ({
      ...businessDate,
      site_name: site.site_name,
      currency: site.currency
    }))
  );
  const invoices = businessDates.flatMap((businessDate) =>
    businessDate.invoices.map((invoice) => ({
      ...invoice,
      sale_date: businessDate.sale_date,
      site_name: businessDate.site_name
    }))
  );
  const invoiceLines = invoices.flatMap((invoice) =>
    invoice.lines.map((line) => ({
      ...line,
      invoice_number: invoice.invoice_number,
      sale_date: invoice.sale_date,
      site_name: invoice.site_name
    }))
  );
  const shifts = businessDates.flatMap((businessDate) =>
    businessDate.shifts.map((shift) => ({
      ...shift,
      site_name: businessDate.site_name
    }))
  );
  const leaves = businessDates.flatMap((businessDate) =>
    businessDate.leaves.map((leave) => ({
      ...leave,
      site_name: businessDate.site_name
    }))
  );
  const bankHolidays = businessDates.flatMap((businessDate) =>
    businessDate.employee_bank_holidays.map((holiday) => ({
      ...holiday,
      site_name: businessDate.site_name
    }))
  );

  const employeeSites = employeeEntities.flatMap((entity) =>
    entity.sites.map((site) => ({ ...site, entity_name: entity.entity_name }))
  );
  const employees = employeeSites.flatMap((site) =>
    site.employees.map((employee) => ({
      ...employee,
      site_name: site.site_name,
      entity_name: site.entity_name
    }))
  );

  return {
    entities,
    sites,
    businessDates,
    invoices,
    invoiceLines,
    shifts,
    leaves,
    bankHolidays,
    employees,
    employeeEntities,
    employeeSites
  };
};
