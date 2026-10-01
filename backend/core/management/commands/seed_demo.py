import os
from datetime import date
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from core.models import Approval, AuditEntry, Contract, Delivery, Invoice, Payment, ProcurementPlan, PurchaseOrder, Vendor, VendorEvaluation

class Command(BaseCommand):
    help = 'Create repeatable development accounts and a realistic completed procurement record.'

    @transaction.atomic
    def handle(self, *args, **options):
        password = os.environ.get('DEMO_PASSWORD')
        if not password or (len(password) < 12 and not (password == '123456' and os.environ.get('DEMO_MODE') == '1')):
            raise CommandError('Set DEMO_PASSWORD to at least 12 characters, or use 123456 with DEMO_MODE=1 for a local demo.')
        people = {
            'admin': ('Nikhil', 'Sethi'),
            'procurement_officer': ('Asha', 'Menon'),
            'approver': ('Kavitha', 'Rao'),
            'vendor_manager': ('Leena', 'Nair'),
            'auditor': ('Devika', 'Shah'),
        }
        users = {}
        for role, (first, last) in people.items():
            group, _ = Group.objects.get_or_create(name=role)
            email = f'{role}@contractcommand.local'
            user, _ = get_user_model().objects.get_or_create(username=role, defaults={'email': email, 'first_name': first, 'last_name': last})
            user.email = email; user.first_name = first; user.last_name = last; user.is_staff = role == 'admin'; user.is_superuser = role == 'admin'; user.set_password(password); user.save(); user.groups.add(group)
            users[role] = user
        vendor, _ = Vendor.objects.get_or_create(id='VEN-2026-043', defaults={'code': 'VEN-2026-043', 'name': 'Aero Precision Systems Ltd.', 'registrationNumber': 'APS-REG-2026-043', 'email': 'contracts@aeroprecision.example', 'phone': '+91-80-4000-1200', 'address': 'Bengaluru Aerospace Park, Karnataka', 'categories': ['Avionics'], 'complianceStatus': 'compliant', 'certifications': [{'id': 'CERT-APS-1', 'name': 'AS9100', 'issuer': 'Accredited Registrar', 'reference': 'AS-2026-104', 'issuedOn': '2026-01-01', 'expiresOn': '2027-12-31', 'status': 'valid'}]})
        review_vendor, _ = Vendor.objects.get_or_create(id='VEN-2026-044', defaults={'code': 'VEN-2026-044', 'name': 'Deccan Avionics Supply Ltd.', 'registrationNumber': 'DAS-REG-2026-044', 'email': 'compliance@deccanavionics.example', 'phone': '+91-80-4000-2400', 'address': 'Peenya Industrial Area, Bengaluru', 'categories': ['Avionics'], 'complianceStatus': 'review_required', 'certifications': [{'id': 'CERT-DAS-1', 'name': 'AS9100', 'issuer': 'Accredited Registrar', 'reference': 'AS-2026-206', 'issuedOn': '2026-01-01', 'expiresOn': '2027-01-01', 'status': 'pending'}]})
        VendorEvaluation.objects.get_or_create(id='EVL-2026-043', defaults={'code': 'EVL-2026-043', 'vendorId': vendor, 'period': '2026-Q3', 'evaluatedOn': date(2026, 9, 1), 'evaluator': 'Leena Nair', 'scores': {'delivery': 92, 'compliance': 100, 'quality': 95, 'cost': 86}, 'weights': {'delivery': 30, 'compliance': 30, 'quality': 25, 'cost': 15}, 'overall': 94.25, 'notes': 'Qualified avionics supplier.'})
        vendor.rating = 94.25; vendor.lastEvaluated = date(2026, 9, 1); vendor.save(update_fields=['rating', 'lastEvaluated'])
        plan, _ = ProcurementPlan.objects.get_or_create(id='PROC-2026-043', defaults={'code': 'PROC-2026-043', 'title': 'Navigation Component Procurement', 'description': 'Replacement navigation interface units for avionics maintenance.', 'department': 'Avionics', 'category': 'Components', 'priority': 'high', 'estimatedBudget': 1500000, 'requiredDate': date(2026, 12, 31), 'status': 'converted', 'owner': 'Asha Menon', 'approver': 'Kavitha Rao', 'linkedContractId': 'CT-2026-043'})
        pending_plan, _ = ProcurementPlan.objects.get_or_create(id='PROC-2026-044', defaults={'code': 'PROC-2026-044', 'title': 'Flight Control Harness Replenishment', 'description': 'Replacement harnesses for scheduled maintenance.', 'department': 'Avionics', 'category': 'Components', 'priority': 'high', 'estimatedBudget': 850000, 'requiredDate': date(2026, 12, 15), 'status': 'pending_approval', 'owner': 'Asha Menon', 'approver': 'Kavitha Rao'})
        Approval.objects.get_or_create(entityType='procurement_plan', entityId=pending_plan.pk, defaults={'submittedBy': users['procurement_officer']})
        contract, _ = Contract.objects.get_or_create(id='CT-2026-043', defaults={'code': 'CT-2026-043', 'title': 'Aircraft Component Supply Agreement', 'vendorId': vendor, 'planId': plan, 'value': 1200000, 'currency': 'INR', 'startDate': date(2026, 9, 1), 'endDate': date(2027, 9, 1), 'status': 'active', 'owner': 'Asha Menon', 'department': 'Avionics', 'category': 'Components', 'scope': 'Supply of navigation interface units.'})
        item = {'id': 'ITM-APS-01', 'name': 'Navigation interface unit', 'description': 'MIL-qualified', 'quantity': 100, 'unit': 'Nos', 'unitPrice': 10000, 'taxRate': 0, 'total': 1000000}
        po, _ = PurchaseOrder.objects.get_or_create(id='PO-2026-00893', defaults={'code': 'PO-2026-00893', 'contractId': contract, 'vendorId': vendor, 'orderDate': date(2026, 9, 10), 'expectedDelivery': date(2026, 9, 20), 'deliveryLocation': 'Avionics Depot, Bengaluru', 'items': [item], 'subtotal': 1000000, 'taxTotal': 0, 'total': 1000000, 'deliveryStatus': 'delivered', 'invoiceStatus': 'invoiced', 'owner': 'Asha Menon'})
        delivery, _ = Delivery.objects.get_or_create(id='DEL-2026-043', defaults={'code': 'DEL-2026-043', 'poId': po, 'vendorId': vendor, 'deliveryDate': date(2026, 9, 20), 'reference': 'GRN-2026-091', 'receivedBy': 'Stores Inspector', 'inspectionStatus': 'passed', 'status': 'delivered', 'lines': [{'itemId': item['id'], 'name': item['name'], 'unit': item['unit'], 'ordered': 100, 'delivered': 100, 'accepted': 100, 'rejected': 0, 'remarks': ''}]})
        invoice, _ = Invoice.objects.get_or_create(id='INV-2026-0204', defaults={'code': 'INV-2026-0204', 'poId': po, 'contractId': contract, 'vendorId': vendor, 'vendorInvoiceNumber': 'APS-INV-0204', 'amount': 1000000, 'taxAmount': 0, 'submittedDate': date(2026, 9, 21), 'dueDate': date(2026, 10, 21), 'matchStatus': 'matched', 'approvalStatus': 'approved', 'paymentStatus': 'paid', 'lines': [{'itemId': item['id'], 'name': item['name'], 'quantity': 100, 'unit': item['unit'], 'unitPrice': 10000, 'total': 1000000}], 'match': {'status': 'matched', 'runOn': '2026-09-22T10:00:00Z', 'checks': []}})
        Payment.objects.get_or_create(id='PAY-2026-043', defaults={'code': 'PAY-2026-043', 'invoiceId': invoice, 'poId': po, 'contractId': contract, 'vendorId': vendor, 'amount': 1000000, 'netAmount': 1000000, 'status': 'paid', 'approvedDate': date(2026, 9, 23), 'paymentDate': date(2026, 9, 24), 'reference': 'UTR-2026-APS-043', 'method': 'Bank transfer'})
        for entity_type, entity, action in [('vendor', vendor, 'vendor.onboarded'), ('procurement_plan', plan, 'procurement.approved'), ('contract', contract, 'contract.activated'), ('purchase_order', po, 'purchase_order.created'), ('delivery', delivery, 'delivery.confirmed'), ('invoice', invoice, 'invoice.matched'), ('payment', invoice, 'payment.paid')]:
            AuditEntry.objects.get_or_create(entityType=entity_type, entityId=entity.pk, action=action, defaults={'user': users['approver'], 'role': 'approver', 'entityCode': entity.code, 'detail': 'Seeded demonstration record.'})
        for entity_type, entity, action, user_role in [('vendor', review_vendor, 'vendor.review_required', 'vendor_manager'), ('procurement_plan', pending_plan, 'procurement.submitted', 'procurement_officer')]:
            AuditEntry.objects.get_or_create(entityType=entity_type, entityId=entity.pk, action=action, defaults={'user': users[user_role], 'role': user_role, 'entityCode': entity.code, 'detail': 'Seeded work item for role demonstration.'})
        self.stdout.write(self.style.SUCCESS('Demo users and procurement record are ready.'))
        for role in people: self.stdout.write(f'{role}@contractcommand.local')
