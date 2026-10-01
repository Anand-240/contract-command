/** Domain model for ContractCommand. Field names mirror the Django REST API. */

export type Role = 'admin' | 'procurement_officer' | 'approver' | 'vendor_manager' | 'auditor';

export interface User {
  id: string;
  name: string;
  initials: string;
  role: Role;
  designation: string;
  department: string;
  email: string;
}

export type Tone = 'neutral' | 'info' | 'positive' | 'caution' | 'critical';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type Currency = 'INR' | 'USD' | 'EUR';

/* ----------------------------- procurement ----------------------------- */

export type PlanStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'converted';

export interface ProcurementPlan {
  id: string;
  code: string;
  title: string;
  description: string;
  department: string;
  category: string;
  priority: Priority;
  estimatedBudget: number;
  currency: Currency;
  budgetReference: string;
  requiredDate: string;
  expectedStart: string;
  expectedCompletion: string;
  status: PlanStatus;
  owner: string;
  approver: string;
  comments: string;
  linkedContractId: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: PlanLineItem[];
  approvals: ApprovalEvent[];
  documents: DocumentRef[];
}

export interface PlanLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
}

/* ------------------------------- vendors ------------------------------- */

export type ComplianceStatus = 'compliant' | 'review_required' | 'expired' | 'suspended';

export interface Vendor {
  id: string;
  code: string;
  name: string;
  registrationNumber: string;
  gstin: string;
  msmeRegistered: boolean;
  email: string;
  phone: string;
  address: string;
  categories: string[];
  complianceStatus: ComplianceStatus;
  rating: number;
  activeContracts: number;
  totalAwardedValue: number;
  certifications: Certification[];
  complianceDocuments: ComplianceDocument[];
  lastEvaluated: string | null;
  onboardedOn: string;
  active: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  reference: string;
  issuedOn: string;
  expiresOn: string;
  status: 'valid' | 'expiring' | 'expired';
}

export interface ComplianceDocument {
  id: string;
  name: string;
  reference: string;
  submittedOn: string;
  expiresOn: string | null;
  status: 'verified' | 'pending' | 'expired';
}

export interface VendorEvaluation {
  id: string;
  vendorId: string;
  period: string;
  evaluatedOn: string;
  evaluator: string;
  scores: {
    delivery: number;
    compliance: number;
    cost: number;
    quality: number;
  };
  overall: number;
  notes: string;
}

/* ------------------------------ contracts ------------------------------ */

export type ContractStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'amended'
  | 'closed'
  | 'terminated';

export interface Contract {
  id: string;
  code: string;
  title: string;
  vendorId: string;
  planId: string | null;
  value: number;
  currency: Currency;
  startDate: string;
  endDate: string;
  version: string;
  status: ContractStatus;
  owner: string;
  department: string;
  category: string;
  paymentTerms: string;
  deliveryTerms: string;
  performanceGuarantee: string;
  liquidatedDamages: string;
  scope: string;
  amendments: Amendment[];
  documents: DocumentRef[];
  approvals: ApprovalEvent[];
  createdAt: string;
}

export type AmendmentType =
  | 'value_revision'
  | 'timeline_extension'
  | 'scope_change'
  | 'terms_revision';

export interface Amendment {
  id: string;
  version: string;
  type: AmendmentType;
  summary: string;
  description: string;
  reason: string;
  effectiveDate: string;
  requestedBy: string;
  approver: string;
  status: 'approved' | 'pending_approval' | 'rejected';
  changes: FieldChange[];
  documents: DocumentRef[];
  createdAt: string;
}

export interface FieldChange {
  field: string;
  previous: string;
  updated: string;
}

/* --------------------------- purchase orders --------------------------- */

export type DeliveryStatus =
  | 'awaiting_delivery'
  | 'partially_delivered'
  | 'delivered'
  | 'rejected';

export type POInvoiceStatus = 'not_invoiced' | 'partially_invoiced' | 'invoiced';

export interface PurchaseOrder {
  id: string;
  code: string;
  contractId: string;
  vendorId: string;
  orderDate: string;
  expectedDelivery: string;
  deliveryLocation: string;
  items: POItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: Currency;
  deliveryStatus: DeliveryStatus;
  invoiceStatus: POInvoiceStatus;
  owner: string;
  notes: string;
}

export interface POItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  total: number;
}

/* ------------------------------ deliveries ----------------------------- */

export type InspectionStatus = 'pending' | 'passed' | 'passed_with_observations' | 'failed';

export interface Delivery {
  id: string;
  code: string;
  poId: string;
  vendorId: string;
  deliveryDate: string;
  reference: string;
  receivedBy: string;
  inspectionStatus: InspectionStatus;
  status: DeliveryStatus;
  notes: string;
  lines: DeliveryLine[];
}

export interface DeliveryLine {
  itemId: string;
  name: string;
  unit: string;
  ordered: number;
  delivered: number;
  accepted: number;
  rejected: number;
  remarks: string;
}

/* ------------------------------- invoices ------------------------------ */

export type MatchStatus = 'matched' | 'mismatch' | 'awaiting_review';
export type InvoiceApprovalStatus = 'pending' | 'approved' | 'rejected' | 'returned';
export type InvoicePaymentStatus = 'unpaid' | 'scheduled' | 'paid';

export interface Invoice {
  id: string;
  code: string;
  poId: string;
  contractId: string;
  vendorId: string;
  vendorInvoiceNumber: string;
  amount: number;
  taxAmount: number;
  currency: Currency;
  submittedDate: string;
  dueDate: string;
  matchStatus: MatchStatus;
  approvalStatus: InvoiceApprovalStatus;
  paymentStatus: InvoicePaymentStatus;
  lines: InvoiceLine[];
  match: MatchReport;
  approvals: ApprovalEvent[];
  deductions: Deduction[];
}

export interface InvoiceLine {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Deduction {
  label: string;
  amount: number;
  reason: string;
}

export interface MatchReport {
  status: MatchStatus;
  runOn: string;
  checks: MatchCheck[];
}

export interface MatchCheck {
  id: string;
  label: string;
  unit: 'quantity' | 'currency';
  po: number;
  delivery: number | null;
  invoice: number;
  tolerance: number;
  passed: boolean;
  note: string;
}

/* ------------------------------- payments ------------------------------ */

export type PaymentStatus =
  | 'awaiting_approval'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'failed';

export interface Payment {
  id: string;
  code: string;
  invoiceId: string;
  poId: string;
  contractId: string;
  vendorId: string;
  amount: number;
  deductions: number;
  netAmount: number;
  currency: Currency;
  approvedDate: string | null;
  paymentDate: string | null;
  status: PaymentStatus;
  reference: string;
  method: string;
  bankAccount: string;
  failureReason: string | null;
}

/* ------------------------- approvals and audit ------------------------- */

export type EntityType =
  | 'procurement_plan'
  | 'contract'
  | 'purchase_order'
  | 'invoice'
  | 'payment'
  | 'vendor'
  | 'amendment'
  | 'delivery'
  | 'vendor_evaluation'
  | 'user';

export interface ApprovalEvent {
  id: string;
  stage: string;
  actor: string;
  role: string;
  decision: 'approved' | 'rejected' | 'returned' | 'submitted' | 'pending';
  actedOn: string | null;
  remarks: string;
}

export interface ApprovalTask {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityCode: string;
  title: string;
  submittedBy: string;
  submittedOn: string;
  amount: number | null;
  currency: Currency;
  stage: string;
  stageIndex: number;
  stageCount: number;
  priority: Priority;
  dueDate: string | null;
  department: string;
  vendor: string;
  summary: string;
  changes: FieldChange[];
  supportingDocuments: number;
  matchStatus: MatchStatus | null;
  previousDecisions: string[];
  flag: string | null;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  entityType: EntityType;
  entityId: string;
  entityCode: string;
  previousState: string | null;
  newState: string | null;
  detail: string;
}

/* -------------------------------- shared ------------------------------- */

export interface DocumentRef {
  id: string;
  name: string;
  type: string;
  sizeKb: number;
  uploadedBy: string;
  uploadedOn: string;
  version: string;
  checksum: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: Tone;
  link: string;
  read: boolean;
}

export interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | undefined;
}

export interface Paginated<T> {
  results: T[];
  count: number;
  page: number;
  pageSize: number;
}
