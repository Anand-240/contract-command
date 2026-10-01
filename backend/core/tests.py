from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import Client, TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
import tempfile
import os
from unittest.mock import patch
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from .models import Approval, AuditEntry, Invoice, Payment, Vendor

class LifecycleAPITests(TestCase):
    def setUp(self):
        self.users = {}
        for role in ('procurement_officer', 'approver', 'vendor_manager', 'auditor'):
            group, _ = Group.objects.get_or_create(name=role)
            user = get_user_model().objects.create_user(username=role, email=f'{role}@contractcommand.example', password='SecureDemo2026!', first_name=role.replace('_', ' ').title())
            user.groups.add(group)
            self.users[role] = user
        self.client = APIClient()
        self.as_role('procurement_officer')

    def as_role(self, role): self.client.force_authenticate(user=self.users[role])
    def post(self, url, data, expected=201):
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, expected, response.data)
        return response.data

    def test_full_lifecycle_and_mismatch_correction(self):
        vendor = self.post('/api/vendors/', {'name': 'Aero Precision Systems Ltd.', 'registrationNumber': 'REG-AERO-2026', 'email': 'procurement@aeroprecision.example', 'complianceStatus': 'compliant', 'certifications': [{'name': 'AS9100', 'issuer': 'Accredited Registrar', 'reference': 'AS-2026-14', 'issuedOn': '2026-01-01', 'expiresOn': '2027-01-01', 'status': 'valid'}]})
        self.as_role('vendor_manager')
        evaluation = self.post(f'/api/vendors/{vendor["id"]}/evaluations/', {'period': '2026-Q3', 'scores': {'delivery': 90, 'compliance': 100, 'quality': 95, 'cost': 85}, 'notes': 'Qualified avionics supplier'})
        self.assertEqual(evaluation['overall'], 93.5)
        self.as_role('procurement_officer')
        plan = self.post('/api/procurement-plans/', {'title': 'Navigation Component Procurement', 'description': 'Replacement navigation components', 'department': 'Avionics', 'category': 'Components', 'priority': 'high', 'estimatedBudget': 1500000, 'requiredDate': '2026-12-31'})
        submitted = self.post(f'/api/procurement-plans/{plan["id"]}/submit/', {}, 200)
        self.assertEqual(submitted['status'], 'pending_approval')
        self.post(f'/api/procurement-plans/{plan["id"]}/decide/', {'decision': 'approve'}, 403)
        self.as_role('auditor')
        self.post(f'/api/procurement-plans/{plan["id"]}/decide/', {'decision': 'approve'}, 403)
        self.as_role('approver')
        approved = self.post(f'/api/procurement-plans/{plan["id"]}/decide/', {'decision': 'approve'}, 200)
        self.assertEqual(approved['status'], 'approved')
        self.as_role('procurement_officer')
        contract = self.post('/api/contracts/', {'title': 'Aircraft Component Supply Agreement', 'vendorId': vendor['id'], 'planId': plan['id'], 'value': 1200000, 'currency': 'INR', 'startDate': '2026-10-01', 'endDate': '2027-09-30', 'department': 'Avionics', 'scope': 'Navigation units'})
        self.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'active'}, 400)
        self.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'under_review'}, 200)
        self.as_role('approver')
        self.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'approved'}, 200)
        self.as_role('procurement_officer')
        self.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'active'}, 200)
        po = self.post('/api/purchase-orders/', {'contractId': contract['id'], 'vendorId': vendor['id'], 'orderDate': '2026-10-02', 'expectedDelivery': '2026-11-01', 'deliveryLocation': 'Bengaluru Avionics Depot', 'items': [{'name': 'Navigation interface unit', 'description': 'MIL-qualified', 'quantity': 100, 'unit': 'units', 'unitPrice': 10000, 'taxRate': 0}]})
        self.assertEqual(po['total'], 1000000)
        delivery = self.client.get(f'/api/purchase-orders/{po["id"]}/delivery/').data
        item_id = po['items'][0]['id']
        result = self.client.patch(f'/api/deliveries/{delivery["id"]}/', {'deliveryDate': '2026-11-01', 'reference': 'GRN-2026-103', 'receivedBy': 'Stores Inspector', 'inspectionStatus': 'passed', 'lines': [{'itemId': item_id, 'delivered': 100, 'accepted': 100, 'rejected': 0, 'remarks': ''}]}, format='json')
        self.assertEqual(result.status_code, 200, result.data)
        invoice = self.post('/api/invoices/', {'poId': po['id'], 'vendorInvoiceNumber': 'APS-INV-2026-204', 'submittedDate': '2026-11-02', 'dueDate': '2026-12-02', 'taxAmount': 0, 'lines': [{'itemId': item_id, 'quantity': 110, 'unitPrice': 10000}]})
        self.post('/api/invoices/', {'poId': po['id'], 'vendorInvoiceNumber': 'APS-INV-2026-204', 'submittedDate': '2026-11-03', 'dueDate': '2026-12-03', 'taxAmount': 0, 'lines': [{'itemId': item_id, 'quantity': 100, 'unitPrice': 10000}]}, 400)
        mismatch = self.post(f'/api/invoices/{invoice["id"]}/match/', {}, 200)
        self.assertEqual(mismatch['matchStatus'], 'mismatch')
        self.assertIn('by 10', mismatch['match']['checks'][0]['note'])
        self.as_role('approver')
        self.post(f'/api/invoices/{invoice["id"]}/approve/', {}, 400)
        self.as_role('procurement_officer')
        corrected = self.client.patch(f'/api/invoices/{invoice["id"]}/', {'lines': [{'itemId': item_id, 'quantity': 100, 'unitPrice': 10000}]}, format='json')
        self.assertEqual(corrected.status_code, 200, corrected.data)
        matched = self.post(f'/api/invoices/{invoice["id"]}/match/', {}, 200)
        self.assertEqual(matched['matchStatus'], 'matched')
        self.as_role('approver')
        self.post(f'/api/invoices/{invoice["id"]}/approve/', {}, 200)
        self.post('/api/payments/', {'invoiceId': invoice['id'], 'amount': 1100000}, 400)
        payment = self.post('/api/payments/', {'invoiceId': invoice['id'], 'amount': 1000000, 'method': 'Bank transfer'})
        self.assertEqual(len(self.client.get(f"/api/payments/?invoiceId={invoice['id']}").data), 1)
        self.post('/api/payments/', {'invoiceId': invoice['id'], 'amount': 1000000}, 400)
        self.post(f'/api/payments/{payment["id"]}/transition/', {'status': 'approved'}, 200)
        self.post(f'/api/payments/{payment["id"]}/transition/', {'status': 'processing'}, 200)
        self.post(f'/api/payments/{payment["id"]}/transition/', {'status': 'paid', 'reference': 'UTR-2026-9001'}, 200)
        self.assertEqual(Invoice.objects.get(pk=invoice['id']).paymentStatus, 'paid')
        self.assertEqual(Payment.objects.count(), 1)
        self.assertGreaterEqual(AuditEntry.objects.count(), 14)

    def test_invalid_login_and_unauthorized_endpoint(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/vendors/')
        self.assertEqual(response.status_code, 401)
        response = self.client.post('/api/auth/login/', {'email': 'procurement_officer@contractcommand.example', 'password': 'wrong'}, format='json')
        self.assertEqual(response.status_code, 401)
        response = self.client.post('/api/auth/login/', {'email': 'procurement_officer@contractcommand.example', 'password': 'SecureDemo2026!'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('token', response.data)

    def test_expired_token_and_logout_revoke_access(self):
        client = APIClient()
        credentials = {'email': 'procurement_officer@contractcommand.example', 'password': 'SecureDemo2026!'}
        first = client.post('/api/auth/login/', credentials, format='json')
        self.assertEqual(first.status_code, 200, first.data)
        token = Token.objects.get(key=first.data['token'])
        Token.objects.filter(pk=token.pk).update(created=timezone.now() - timedelta(hours=9))
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.assertEqual(client.get('/api/auth/me/').status_code, 401)
        client.credentials()
        second = client.post('/api/auth/login/', credentials, format='json')
        self.assertEqual(second.status_code, 200, second.data)
        client.credentials(HTTP_AUTHORIZATION=f'Token {second.data["token"]}')
        self.assertEqual(client.post('/api/auth/logout/', {}, format='json').status_code, 204)
        self.assertEqual(client.get('/api/auth/me/').status_code, 401)

    def test_notification_read_state_is_per_user(self):
        plan = self.post('/api/procurement-plans/', {'title': 'Radar support spares', 'department': 'Avionics', 'estimatedBudget': 500000})
        self.post(f'/api/procurement-plans/{plan["id"]}/submit/', {}, 200)
        self.assertEqual(self.client.get('/api/notifications/').data, [])
        self.as_role('approver')
        notifications = self.client.get('/api/notifications/').data
        self.assertEqual(len(notifications), 1)
        self.assertFalse(notifications[0]['read'])
        self.post(f'/api/notifications/{notifications[0]["id"]}/read/', {}, 200)
        self.assertTrue(self.client.get('/api/notifications/').data[0]['read'])
        self.as_role('auditor')
        self.assertEqual(self.client.get('/api/notifications/').data, [])

    def test_role_scoped_queue_reports_audit_and_dashboard(self):
        plan = self.post('/api/procurement-plans/', {'title': 'Radar harness review', 'department': 'Avionics', 'estimatedBudget': 500000})
        self.post(f'/api/procurement-plans/{plan["id"]}/submit/', {}, 200)
        self.assertEqual(self.client.get('/api/approvals/').status_code, 403)
        self.assertEqual(self.client.get('/api/payments/').status_code, 403)
        self.assertEqual(self.client.get(f"/api/audit-log/?entityId={plan['id']}").status_code, 200)
        self.as_role('approver')
        self.assertEqual(self.client.get('/api/approvals/').status_code, 200)
        queue = self.client.get('/api/approvals/?entityType=procurement_plan&search=Radar').data
        self.assertEqual(len(queue), 1)
        self.assertEqual(queue[0]['submittedBy'], self.users['procurement_officer'].get_full_name())
        self.assertIsNone(queue[0]['dueDate'])
        self.assertEqual(self.client.get('/api/approvals/?priority=low').data, [])
        self.assertEqual(self.client.get('/api/payments/').status_code, 200)
        self.assertEqual(self.client.get('/api/reports/').status_code, 403)
        self.assertEqual(self.client.get('/api/audit-log/').status_code, 403)
        self.as_role('vendor_manager')
        self.assertEqual(self.client.get('/api/procurement-plans/').status_code, 403)
        self.assertEqual(self.client.get('/api/invoices/').status_code, 403)
        dashboard = self.client.get('/api/dashboard/').data
        self.assertEqual(dashboard['metrics']['procurementBudget'], 0)
        self.assertEqual(dashboard['pendingActions'], [])
        self.assertEqual(self.client.get('/api/search/?q=Radar').data, [])
        self.as_role('auditor')
        self.assertEqual(self.client.get('/api/approvals/').status_code, 403)
        self.assertEqual(self.client.get('/api/reports/').status_code, 200)
        self.assertEqual(self.client.get('/api/reports/?report=unknown').status_code, 400)
        self.assertEqual(self.client.get('/api/reports/?from=wrong').status_code, 400)
        self.assertEqual(self.client.get('/api/reports/?from=2026-11-01&to=2026-10-01').status_code, 400)
        self.assertEqual(self.client.get('/api/audit-log/').status_code, 200)

    def test_demo_seed_has_all_roles_and_repeatable_work_items(self):
        with patch.dict(os.environ, {'DEMO_MODE': '1', 'DEMO_PASSWORD': '123456'}):
            call_command('seed_demo', verbosity=0)
            call_command('seed_demo', verbosity=0)
        admin = get_user_model().objects.get(email='admin@contractcommand.local')
        self.assertTrue(admin.is_superuser)
        self.assertEqual(Approval.objects.filter(entityType='procurement_plan', entityId='PROC-2026-044').count(), 1)
        self.assertEqual(Vendor.objects.get(pk='VEN-2026-044').complianceStatus, 'review_required')
        response = self.client.post('/api/auth/login/', {'email': admin.email, 'password': '123456'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['user']['role'], 'admin')
        admin_client = Client(HTTP_HOST='localhost')
        self.assertTrue(admin_client.login(username=admin.username, password='123456'))
        self.assertEqual(admin_client.get('/admin/auth/user/').status_code, 200)
        self.assertEqual(admin_client.get('/admin/auth/group/').status_code, 200)

    def prepare_order(self):
        vendor = self.post('/api/vendors/', {'name': 'Northern Aerospace Components Ltd.', 'registrationNumber': 'REG-NAC-2026', 'email': 'supply@northern-aerospace.example', 'complianceStatus': 'compliant'})
        plan = self.post('/api/procurement-plans/', {'title': 'Flight control spares', 'department': 'Avionics', 'estimatedBudget': 500000})
        self.post(f'/api/procurement-plans/{plan["id"]}/submit/', {}, 200)
        self.as_role('approver')
        self.post(f'/api/procurement-plans/{plan["id"]}/decide/', {'decision': 'approve'}, 200)
        self.as_role('procurement_officer')
        contract = self.post('/api/contracts/', {'title': 'Flight control spares agreement', 'vendorId': vendor['id'], 'planId': plan['id'], 'value': 450000, 'startDate': '2026-10-01', 'endDate': '2027-09-30'})
        self.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'under_review'}, 200)
        self.as_role('approver')
        self.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'approved'}, 200)
        self.as_role('procurement_officer')
        self.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'active'}, 200)
        po = self.post('/api/purchase-orders/', {'contractId': contract['id'], 'vendorId': vendor['id'], 'orderDate': '2026-10-02', 'expectedDelivery': '2026-11-01', 'deliveryLocation': 'Bengaluru Stores', 'items': [{'name': 'Flight control unit', 'quantity': 10, 'unit': 'Nos', 'unitPrice': 10000, 'taxRate': 0}]})
        return vendor, plan, contract, po

    def test_rejected_plan_and_invalid_contract_dates(self):
        vendor = self.post('/api/vendors/', {'name': 'Precision Navigation Systems Ltd.', 'registrationNumber': 'REG-PNS-2026', 'email': 'sales@precision-nav.example', 'complianceStatus': 'compliant'})
        plan = self.post('/api/procurement-plans/', {'title': 'Navigation spares', 'department': 'Avionics', 'estimatedBudget': 400000})
        self.post(f'/api/procurement-plans/{plan["id"]}/submit/', {}, 200)
        self.as_role('approver')
        self.post(f'/api/procurement-plans/{plan["id"]}/decide/', {'decision': 'reject'}, 200)
        self.as_role('procurement_officer')
        self.post('/api/contracts/', {'title': 'Invalid agreement', 'vendorId': vendor['id'], 'planId': plan['id'], 'value': 300000, 'startDate': '2026-10-01', 'endDate': '2026-09-30'}, 400)
        self.post('/api/contracts/', {'title': 'Rejected plan agreement', 'vendorId': vendor['id'], 'planId': plan['id'], 'value': 300000, 'startDate': '2026-10-01', 'endDate': '2027-09-30'}, 400)

    def test_missing_delivery_price_mismatch_and_payment_guard(self):
        _, _, _, po = self.prepare_order()
        item = po['items'][0]
        invoice = self.post('/api/invoices/', {'poId': po['id'], 'vendorInvoiceNumber': 'NAC-2026-016', 'submittedDate': '2026-11-02', 'dueDate': '2026-12-02', 'lines': [{'itemId': item['id'], 'quantity': 10, 'unitPrice': 10500}]})
        result = self.post(f'/api/invoices/{invoice["id"]}/match/', {}, 200)
        self.assertEqual(result['matchStatus'], 'mismatch')
        self.assertIn('No accepted delivery', result['match']['checks'][0]['note'])
        self.assertIn('500', result['match']['checks'][1]['note'])
        self.as_role('approver')
        self.post('/api/payments/', {'invoiceId': invoice['id'], 'amount': 100000}, 400)
        self.post(f'/api/invoices/{invoice["id"]}/approve/', {}, 400)

    def test_overdelivery_and_order_total_authoritative(self):
        _, _, _, po = self.prepare_order()
        self.assertEqual(po['total'], 100000)
        row = self.client.get(f'/api/purchase-orders/{po["id"]}/delivery/').data
        result = self.client.patch(f'/api/deliveries/{row["id"]}/', {'inspectionStatus': 'passed', 'lines': [{'itemId': po['items'][0]['id'], 'delivered': 11, 'accepted': 11, 'rejected': 0}]}, format='json')
        self.assertEqual(result.status_code, 400, result.data)
        result = self.client.patch(f'/api/purchase-orders/{po["id"]}/', {'total': 1}, format='json')
        self.assertEqual(result.status_code, 400)

    def test_audit_is_read_only(self):
        self.as_role('auditor')
        response = self.client.post('/api/audit-log/', {'action': 'forged'}, format='json')
        self.assertEqual(response.status_code, 405)

    def test_amendment_approval_preserves_version(self):
        _, _, contract, _ = self.prepare_order()
        amended = self.post(f'/api/contracts/{contract["id"]}/amendments/', {'type': 'value_revision', 'summary': 'Increase avionics spare allowance', 'description': 'Add a reserve of qualified units', 'reason': 'Airworthiness maintenance forecast changed', 'effectiveDate': '2026-12-01', 'changes': [{'field': 'value', 'previous': '450000', 'updated': '475000'}]}, 201)
        amendment = amended['amendments'][0]
        self.assertEqual(amendment['status'], 'pending_approval')
        self.post(f'/api/contracts/{contract["id"]}/amendments/', {'type': 'scope_change', 'summary': 'Second pending', 'description': 'Cannot overlap with the first amendment', 'reason': 'Avoid version conflict', 'effectiveDate': '2026-12-02', 'changes': []}, 400)
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            upload = self.client.post(f'/api/amendments/{amendment["id"]}/documents/', {'file': SimpleUploadedFile('justification.pdf', b'%PDF-1.4\n')}, format='multipart')
            self.assertEqual(upload.status_code, 201, upload.data)
            self.assertEqual(len(self.client.get(f'/api/contracts/{contract["id"]}/').data['amendments'][0]['documents']), 1)
        self.as_role('approver')
        result = self.post(f'/api/contracts/{contract["id"]}/amendments/{amendment["id"]}/decide/', {'decision': 'approve'}, 200)
        self.assertEqual(result['version'], '1.1')
        self.assertEqual(result['value'], 475000)
        self.assertEqual(result['amendments'][0]['changes'][0]['previous'], '450000')
        self.assertEqual(result['amendments'][0]['status'], 'approved')
        self.assertTrue(AuditEntry.objects.filter(action='contract.amendment_approve').exists())
        self.as_role('procurement_officer')
        self.assertEqual(self.client.post(f'/api/amendments/{amendment["id"]}/documents/', {'file': SimpleUploadedFile('late.pdf', b'%PDF-1.4\n')}, format='multipart').status_code, 400)

    def test_contract_document_validation_and_access(self):
        _, _, contract, _ = self.prepare_order()
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            url = f'/api/contracts/{contract["id"]}/documents/'
            self.assertEqual(self.client.post(url, {}, format='multipart').status_code, 400)
            invalid = SimpleUploadedFile('malware.exe', b'MZ\x00\x00')
            response = self.client.post(url, {'file': invalid}, format='multipart')
            self.assertEqual(response.status_code, 400)
            valid = SimpleUploadedFile('agreement.pdf', b'%PDF-1.4\n1 0 obj\n')
            response = self.client.post(url, {'file': valid}, format='multipart')
            self.assertEqual(response.status_code, 201, response.data)
            document_id = response.data['id']
            self.as_role('auditor')
            response = self.client.get(f'/api/documents/{document_id}/download/')
            self.assertEqual(response.status_code, 200)
            response = self.client.post(url, {'file': SimpleUploadedFile('forged.pdf', b'%PDF-1.4\n')}, format='multipart')
            self.assertEqual(response.status_code, 403)

    def test_partial_delivery_requires_invoice_correction(self):
        _, _, _, po = self.prepare_order()
        item = po['items'][0]
        delivery = self.client.get(f'/api/purchase-orders/{po["id"]}/delivery/').data
        response = self.client.patch(f'/api/deliveries/{delivery["id"]}/', {'inspectionStatus': 'passed', 'lines': [{'itemId': item['id'], 'delivered': 6, 'accepted': 6, 'rejected': 0}]}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], 'partially_delivered')
        invoice = self.post('/api/invoices/', {'poId': po['id'], 'vendorInvoiceNumber': 'NAC-2026-017', 'submittedDate': '2026-11-02', 'dueDate': '2026-12-02', 'lines': [{'itemId': item['id'], 'quantity': 10, 'unitPrice': 10000}]})
        result = self.post(f'/api/invoices/{invoice["id"]}/match/', {}, 200)
        self.assertEqual(result['matchStatus'], 'mismatch')
        self.assertIn('by 4', result['match']['checks'][0]['note'])
        response = self.client.patch(f'/api/invoices/{invoice["id"]}/', {'lines': [{'itemId': item['id'], 'quantity': 6, 'unitPrice': 10000}]}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        result = self.post(f'/api/invoices/{invoice["id"]}/match/', {}, 200)
        self.assertEqual(result['matchStatus'], 'matched')

    def test_vendor_and_plan_documents_are_recorded(self):
        vendor = self.post('/api/vendors/', {'name': 'Orbital Avionics Supplies Ltd.', 'registrationNumber': 'REG-OAS-2026', 'email': 'contracts@orbital-avionics.example', 'complianceStatus': 'review_required'})
        plan = self.post('/api/procurement-plans/', {'title': 'Radar support equipment', 'department': 'Avionics', 'estimatedBudget': 300000})
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            for path in (f'/api/vendors/{vendor["id"]}/documents/', f'/api/procurement-plans/{plan["id"]}/documents/'):
                response = self.client.post(path, {'file': SimpleUploadedFile('certificate.pdf', b'%PDF-1.4\n')}, format='multipart')
                self.assertEqual(response.status_code, 201, response.data)
            vendor_data = self.client.get(f'/api/vendors/{vendor["id"]}/').data
            plan_data = self.client.get(f'/api/procurement-plans/{plan["id"]}/').data
            self.assertEqual(len(vendor_data['complianceDocuments']), 1)
            self.assertEqual(len(plan_data['documents']), 1)
            self.assertEqual(vendor_data['complianceDocuments'][0]['status'], 'pending')
            self.as_role('vendor_manager')
            self.assertEqual(self.client.get(f'/api/documents/{plan_data["documents"][0]["id"]}/download/').status_code, 403)

    def test_unassigned_user_is_denied_and_plan_owner_is_enforced(self):
        outsider = get_user_model().objects.create_user(username='outsider', email='outsider@example.test', password='SecureDemo2026!')
        self.client.force_authenticate(user=outsider)
        self.assertEqual(self.client.get('/api/vendors/').status_code, 403)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post('/api/auth/login/', {'email': outsider.email, 'password': 'SecureDemo2026!'}, format='json').status_code, 401)
        self.as_role('procurement_officer')
        plan = self.post('/api/procurement-plans/', {'title': 'Owner controlled plan', 'department': 'Avionics', 'estimatedBudget': 10000})
        second = get_user_model().objects.create_user(username='second_officer', email='second@example.test', password='SecureDemo2026!')
        second.groups.add(self.users['procurement_officer'].groups.first())
        self.client.force_authenticate(user=second)
        self.assertEqual(self.client.patch(f'/api/procurement-plans/{plan["id"]}/', {'title': 'Changed by another'}, format='json').status_code, 403)
        self.assertEqual(self.client.post(f'/api/procurement-plans/{plan["id"]}/submit/', {}, format='json').status_code, 403)

    def test_vendor_score_boundaries_and_invalid_numbers(self):
        vendor = self.post('/api/vendors/', {'name': 'Score test vendor', 'registrationNumber': 'SCORE-2026', 'email': 'score@example.test'})
        self.post('/api/vendors/', {'name': 'Duplicate score vendor', 'registrationNumber': 'SCORE-2026', 'email': 'duplicate@example.test'}, 400)
        self.as_role('vendor_manager')
        url = f'/api/vendors/{vendor["id"]}/evaluations/'
        for value in ('not-a-number', -1, 101, 'NaN'):
            scores = {'delivery': value, 'compliance': 95, 'quality': 85, 'cost': 80}
            self.assertEqual(self.client.post(url, {'scores': scores}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {'scores': {'delivery': 0, 'compliance': 0, 'quality': 0, 'cost': 0}}, format='json').status_code, 201)
        self.assertEqual(self.client.post(url, {'scores': {'delivery': 100, 'compliance': 100, 'quality': 100, 'cost': 100}}, format='json').status_code, 201)

    def test_duplicate_receipt_and_invoice_lines_are_rejected(self):
        _, _, _, po = self.prepare_order()
        item = po['items'][0]
        delivery = self.client.get(f'/api/purchase-orders/{po["id"]}/delivery/').data
        line = {'itemId': item['id'], 'delivered': 6, 'accepted': 6, 'rejected': 0}
        response = self.client.patch(f'/api/deliveries/{delivery["id"]}/', {'inspectionStatus': 'passed', 'lines': [line, line]}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        invoice_line = {'itemId': item['id'], 'quantity': 6, 'unitPrice': 10000}
        response = self.client.post('/api/invoices/', {'poId': po['id'], 'vendorInvoiceNumber': 'DUP-LINES', 'submittedDate': '2026-11-02', 'dueDate': '2026-12-02', 'lines': [invoice_line, invoice_line]}, format='json')
        self.assertEqual(response.status_code, 400, response.data)

    def test_returned_invoice_correction_creates_new_approval(self):
        _, _, _, po = self.prepare_order()
        item = po['items'][0]
        invoice = self.post('/api/invoices/', {'poId': po['id'], 'vendorInvoiceNumber': 'RETURN-2026', 'submittedDate': '2026-11-02', 'dueDate': '2026-12-02', 'lines': [{'itemId': item['id'], 'quantity': 10, 'unitPrice': 10000}]})
        self.as_role('approver')
        response = self.client.post(f'/api/invoices/{invoice["id"]}/return/', {'remarks': 'Correct receipt reference'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Approval.objects.filter(entityType='invoice', entityId=invoice['id'], status='returned').count(), 1)
        self.as_role('procurement_officer')
        response = self.client.patch(f'/api/invoices/{invoice["id"]}/', {'lines': [{'itemId': item['id'], 'quantity': 10, 'unitPrice': 10000}]}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Approval.objects.filter(entityType='invoice', entityId=invoice['id'], status='pending').count(), 1)

    def test_contract_rejection_is_terminal_and_direct_permissions_hold(self):
        vendor = self.post('/api/vendors/', {'name': 'Rejected contract vendor', 'registrationNumber': 'REJECT-VENDOR', 'email': 'reject@example.test', 'complianceStatus': 'compliant'})
        plan = self.post('/api/procurement-plans/', {'title': 'Rejected contract plan', 'department': 'Avionics', 'estimatedBudget': 100000})
        self.post(f'/api/procurement-plans/{plan["id"]}/submit/', {}, 200)
        self.as_role('approver')
        self.post(f'/api/procurement-plans/{plan["id"]}/decide/', {'decision': 'approve'}, 200)
        self.as_role('procurement_officer')
        contract = self.post('/api/contracts/', {'title': 'Agreement for rejection', 'vendorId': vendor['id'], 'planId': plan['id'], 'value': 90000, 'startDate': '2026-10-01', 'endDate': '2027-10-01'})
        self.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'under_review'}, 200)
        self.assertEqual(self.client.post('/api/payments/', {'invoiceId': 'missing', 'amount': 1}, format='json').status_code, 403)
        self.as_role('approver')
        approval = Approval.objects.get(entityType='contract', entityId=contract['id'], status='pending')
        self.post(f'/api/approvals/{approval.pk}/decision/', {'decision': 'reject'}, 200)
        self.assertEqual(self.client.get(f'/api/contracts/{contract["id"]}/').data['status'], 'rejected')
        self.assertEqual(self.client.post(f'/api/contracts/{contract["id"]}/transition/', {'status': 'active'}, format='json').status_code, 400)
        self.as_role('auditor')
        self.assertEqual(self.client.post(f'/api/procurement-plans/{plan["id"]}/decide/', {'decision': 'approve'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/audit-log/{AuditEntry.objects.first().pk}/').status_code, 405)

    def test_tax_match_and_competing_invoice_approval(self):
        _, _, _, po = self.prepare_order()
        item = po['items'][0]
        delivery = self.client.get(f'/api/purchase-orders/{po["id"]}/delivery/').data
        response = self.client.patch(f'/api/deliveries/{delivery["id"]}/', {'inspectionStatus': 'passed', 'lines': [{'itemId': item['id'], 'delivered': 10, 'accepted': 10, 'rejected': 0}]}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        invoices = []
        for suffix in ('A', 'B'):
            invoice = self.post('/api/invoices/', {'poId': po['id'], 'vendorInvoiceNumber': f'COMPETE-{suffix}', 'submittedDate': '2026-11-02', 'dueDate': '2026-12-02', 'lines': [{'itemId': item['id'], 'quantity': 10, 'unitPrice': 10000}]})
            self.assertEqual(self.post(f'/api/invoices/{invoice["id"]}/match/', {}, 200)['matchStatus'], 'matched')
            invoices.append(invoice)
        self.as_role('approver')
        self.post(f'/api/invoices/{invoices[0]["id"]}/approve/', {}, 200)
        self.post(f'/api/invoices/{invoices[1]["id"]}/approve/', {}, 400)
        self.as_role('procurement_officer')
        self.assertEqual(self.post(f'/api/invoices/{invoices[1]["id"]}/match/', {}, 200)['matchStatus'], 'mismatch')
        self.assertEqual(self.client.post(f'/api/invoices/{invoices[0]["id"]}/match/', {}, format='json').status_code, 400)

    def test_invoice_tax_must_follow_purchase_order_rate(self):
        vendor, _, contract, _ = self.prepare_order()
        po = self.post('/api/purchase-orders/', {'contractId': contract['id'], 'vendorId': vendor['id'], 'orderDate': '2026-10-02', 'expectedDelivery': '2026-11-01', 'deliveryLocation': 'Bengaluru Stores', 'items': [{'name': 'Taxed component', 'quantity': 2, 'unit': 'Nos', 'unitPrice': 1000, 'taxRate': 18}]})
        item = po['items'][0]
        receipt = self.client.get(f'/api/purchase-orders/{po["id"]}/delivery/').data
        response = self.client.patch(f'/api/deliveries/{receipt["id"]}/', {'inspectionStatus': 'passed', 'lines': [{'itemId': item['id'], 'delivered': 2, 'accepted': 2, 'rejected': 0}]}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        invoice = self.post('/api/invoices/', {'poId': po['id'], 'vendorInvoiceNumber': 'TAX-2026', 'submittedDate': '2026-11-02', 'dueDate': '2026-12-02', 'taxAmount': 0, 'lines': [{'itemId': item['id'], 'quantity': 2, 'unitPrice': 1000}]})
        result = self.post(f'/api/invoices/{invoice["id"]}/match/', {}, 200)
        self.assertEqual(result['matchStatus'], 'mismatch')
        self.assertIn('360', next(check['note'] for check in result['match']['checks'] if check['id'] == 'MC-TAX'))
        response = self.client.patch(f'/api/invoices/{invoice["id"]}/', {'taxAmount': 360}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.post(f'/api/invoices/{invoice["id"]}/match/', {}, 200)['matchStatus'], 'matched')

    def test_submitted_plan_document_and_scoped_audit_are_protected(self):
        plan = self.post('/api/procurement-plans/', {'title': 'Protected submission', 'department': 'Avionics', 'estimatedBudget': 10000})
        self.post(f'/api/procurement-plans/{plan["id"]}/submit/', {}, 200)
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            response = self.client.post(f'/api/procurement-plans/{plan["id"]}/documents/', {'file': SimpleUploadedFile('late.pdf', b'%PDF-1.4\n')}, format='multipart')
            self.assertEqual(response.status_code, 400)
        self.as_role('vendor_manager')
        self.assertEqual(self.client.get(f'/api/audit-log/?entityId={plan["id"]}').data, [])
