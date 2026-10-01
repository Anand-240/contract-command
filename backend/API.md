# ContractCommand API guide

Base path: `/api/`. Swagger: `/api/docs/`. ReDoc: `/api/redoc/`. Responses use JSON, except authenticated document downloads.

## Authentication

`POST /auth/login/` with `{ "email": "...", "password": "..." }` returns `{ "token": "...", "user": { "id", "name", "role", ... } }`. Send `Authorization: Token <token>` on all subsequent requests. `GET /auth/me/` returns the authenticated user; `POST /auth/logout/` revokes the token. Failed login returns 401. Unauthenticated protected requests return 401.

Roles are `admin`, `procurement_officer`, `approver`, `vendor_manager`, and `auditor`. A user must have exactly one recognized role unless they are a superuser. The backend checks roles for every request and sensitive write. `admin` can perform every workflow action. Auditors can read records and reports only. Role failures return 403. Tokens expire after `AUTH_TOKEN_TTL_HOURS` (8 hours by default); signing in again revokes the previous token.

## Workflow endpoints

| Stage | Method and path | Required role | Main request fields |
| --- | --- | --- | --- |
| Vendor | `POST /vendors/` | Procurement Officer, Vendor Manager | `name`, `registrationNumber`, `email`, `complianceStatus`, optional certifications |
| Vendor update | `PATCH /vendors/{id}/` | Procurement Officer, Vendor Manager | Changed profile/compliance fields |
| Vendor evaluation | `POST /vendors/{id}/evaluations/` | Vendor Manager | `scores` for delivery, compliance, quality and cost; optional `weights` totalling 100 |
| Plan | `POST /procurement-plans/` | Procurement Officer | `title`, `department`, `estimatedBudget`, timeline fields |
| Submit plan | `POST /procurement-plans/{id}/submit/` | Procurement Officer | Empty body |
| Plan decision | `POST /procurement-plans/{id}/decide/` | Approver | `decision`: `approve`, `reject`, `request_changes`; optional `comments` |
| Contract | `POST /contracts/` | Procurement Officer | `title`, approved `planId`, compliant `vendorId`, `value`, `startDate`, `endDate` |
| Contract transition | `POST /contracts/{id}/transition/` | Procurement Officer or Approver by transition | `status`: `under_review`, `approved`, `rejected`, `active`, `draft`, `closed`, `terminated` as allowed |
| Amendment | `POST /contracts/{id}/amendments/` | Procurement Officer | `type`, `summary`, `description`, `reason`, `effectiveDate`, `changes` |
| Amendment decision | `POST /contracts/{id}/amendments/{amendment_id}/decide/` | Approver | `decision`: `approve` or `reject` |
| Purchase order | `POST /purchase-orders/` | Procurement Officer | Active `contractId`, matching `vendorId`, dates, `items` with quantity, unit price, tax rate |
| Delivery | `PATCH /deliveries/{id}/` | Procurement Officer, Vendor Manager | `inspectionStatus`, `lines` with `itemId`, delivered, accepted, rejected quantities |
| Invoice | `POST /invoices/` | Procurement Officer | `poId`, `vendorInvoiceNumber`, dates, `lines`, tax amount |
| Correct invoice | `PATCH /invoices/{id}/` | Procurement Officer | Corrected `lines` and optional `taxAmount` |
| Three way match | `POST /invoices/{id}/match/` | Procurement Officer | Empty body; returns checks and exact mismatch reasons |
| Approve invoice | `POST /invoices/{id}/approve/` | Approver | Optional `remarks`; blocked until matched |
| Payment | `POST /payments/` | Approver | Approved `invoiceId`, `amount` no greater than approved invoice |
| Payment transition | `POST /payments/{id}/transition/` | Approver | `status`: `approved`, `processing`, `paid`, `failed`; bank `reference` required to mark paid |
| Approval queue | `GET /approvals/`, `POST /approvals/{id}/decision/` | Approver or Admin | `decision` and optional `remarks` |
| Audit log | `GET /audit-log/` | Auditor or Admin; entity history scoped to readable records | Filter by entity, role, action, user and date; no write endpoint |
| Dashboard and reports | `GET /dashboard/`, `GET /reports/` | Dashboard: assigned roles; reports: Auditor or Admin | Reports accept report, department, vendor and date filters |

A successful creation returns 201; successful reads or transitions return 200; logout returns 204. Invalid fields or transitions return 400, failed authentication 401, denied role 403, missing records 404, and unsupported methods 405. Error JSON uses `{ "success": false, "message": "...", "errors": { ... } }`.

## Documents

`POST /contracts/{id}/documents/`, `/amendments/{id}/documents/`, `/vendors/{id}/documents/`, or `/procurement-plans/{id}/documents/` accepts `multipart/form-data` with a `file` field. Upload is limited to PDF, DOCX or XLSX up to 25 MB. Plan documents can only be added by the draft owner; amendment documents must be added before the decision. The response includes version, uploader, upload date and SHA-256 checksum. `GET /documents/{id}/download/` requires an assigned role and streams the file as an attachment.

## Three way match example

For an order of 100 units, accepted delivery of 100 units and an invoice claiming 110 units, the match returns `matchStatus: "mismatch"` and a failed quantity check with the note `Invoice quantity exceeds accepted delivery quantity by 10.`. The invoice approval endpoint then returns 400. Correct the invoice line to 100 and rerun the match before approval.
