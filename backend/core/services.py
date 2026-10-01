import json
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Approval, AuditEntry, Amendment, Contract, Delivery, Invoice, Payment, ProcurementPlan, PurchaseOrder, Vendor, VendorEvaluation

ROLE_ACTIONS = {
    'admin': {'*'},
    'procurement_officer': {'vendor.manage', 'plan.create', 'plan.submit', 'contract.create', 'contract.submit', 'contract.activate', 'contract.amend', 'po.create', 'delivery.record', 'invoice.create', 'invoice.match', 'invoice.correct'},
    'approver': {'approval.read', 'plan.decide', 'contract.decide', 'amendment.decide', 'invoice.decide', 'payment.create', 'payment.decide', 'payment.pay'},
    'vendor_manager': {'vendor.manage', 'vendor.evaluate', 'delivery.record'},
    'auditor': {'audit.read', 'reports.read'},
}

def role(user):
    if user.is_superuser:
        return 'admin'
    groups = list(user.groups.values_list('name', flat=True))
    return groups[0] if len(groups) == 1 and groups[0] in ROLE_ACTIONS else 'unassigned'

def require(user, action):
    allowed = ROLE_ACTIONS.get(role(user), set())
    if action not in allowed and '*' not in allowed:
        raise PermissionDenied(f'{role(user)} cannot perform {action}')

def code(prefix):
    return f'{prefix}-{timezone.now().year}-{uuid4().hex[:8].upper()}'

def money(value, field='amount'):
    try:
        result = Decimal(str(value)).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field: 'Enter a valid amount.'})
    if not result.is_finite():
        raise ValidationError({field: 'Enter a finite amount.'})
    if result < 0:
        raise ValidationError({field: 'Cannot be negative.'})
    return result

def positive(value, field='quantity'):
    amount = money(value, field)
    if amount <= 0:
        raise ValidationError({field: 'Must be greater than zero.'})
    return amount

def audit(request, action, instance, old=None, detail=''):
    entity_type = {'procurementplan': 'procurement_plan', 'purchaseorder': 'purchase_order', 'vendorevaluation': 'vendor_evaluation'}.get(instance._meta.model_name, instance._meta.model_name)
    AuditEntry.objects.create(user=request.user, role=role(request.user), action=action, entityType=entity_type, entityId=str(instance.pk), entityCode=getattr(instance, 'code', str(instance.pk)), previousState=json.dumps(old, default=str) if old is not None else None, newState=json.dumps({'status': getattr(instance, 'status', None)}, default=str), detail=detail, ipAddress=request.META.get('REMOTE_ADDR'))

@transaction.atomic
def submit_plan(request, plan):
    require(request.user, 'plan.submit')
    if plan.status != 'draft':
        raise ValidationError({'status': 'Only a draft plan can be submitted.'})
    plan.status = 'pending_approval'
    plan.save(update_fields=['status', 'updatedAt'])
    Approval.objects.create(entityType='procurement_plan', entityId=plan.pk, submittedBy=request.user)
    audit(request, 'procurement.submitted', plan, {'status': 'draft'})
    return plan

@transaction.atomic
def decide_plan(request, plan, decision, comments=''):
    require(request.user, 'plan.decide')
    plan = ProcurementPlan.objects.select_for_update().get(pk=plan.pk)
    if plan.status != 'pending_approval' or decision not in ('approve', 'reject', 'request_changes'):
        raise ValidationError({'status': 'Plan is not awaiting a valid decision.'})
    old = plan.status
    plan.status = {'approve': 'approved', 'reject': 'rejected', 'request_changes': 'draft'}[decision]
    plan.save(update_fields=['status', 'updatedAt'])
    approval = Approval.objects.filter(entityType='procurement_plan', entityId=plan.pk, status='pending').order_by('-id').first()
    if approval:
        approval.status = {'approve': 'approved', 'reject': 'rejected', 'request_changes': 'returned'}[decision]
        approval.approver = request.user
        approval.decisionDate = timezone.now()
        approval.comments = comments
        approval.save()
    audit(request, f'procurement.{decision}', plan, {'status': old}, comments)
    return plan

@transaction.atomic
def transition_contract(request, contract, status):
    contract = Contract.objects.select_for_update().get(pk=contract.pk)
    transitions = {'draft': ('under_review',), 'under_review': ('approved', 'draft', 'rejected'), 'approved': ('active',), 'active': ('closed', 'terminated', 'amended'), 'amended': ('active', 'closed', 'terminated')}
    if status not in transitions.get(contract.status, ()):
        raise ValidationError({'status': f'Cannot move from {contract.status} to {status}.'})
    action = 'contract.submit' if status == 'under_review' else 'contract.activate' if status == 'active' else 'contract.decide'
    require(request.user, action)
    old = contract.status
    contract.status = status
    contract.save(update_fields=['status'])
    if status == 'under_review':
        Approval.objects.create(entityType='contract', entityId=contract.pk, submittedBy=request.user)
    if status in ('approved', 'draft', 'rejected'):
        approval = Approval.objects.filter(entityType='contract', entityId=contract.pk, status='pending').order_by('-id').first()
        if approval:
            approval.status = 'approved' if status == 'approved' else 'returned' if status == 'draft' else 'rejected'; approval.approver = request.user; approval.decisionDate = timezone.now(); approval.save()
    audit(request, f'contract.{status}', contract, {'status': old})
    return contract

def calculate_order(items):
    if not isinstance(items, list) or not items:
        raise ValidationError({'items': 'At least one order item is required.'})
    calculated = []
    subtotal = Decimal('0')
    tax_total = Decimal('0')
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValidationError({'items': f'Item {index + 1} is invalid.'})
        qty = positive(item.get('quantity'), f'items[{index}].quantity')
        price = money(item.get('unitPrice'), f'items[{index}].unitPrice')
        tax = money(item.get('taxRate', 0), f'items[{index}].taxRate')
        if tax > 100:
            raise ValidationError({'taxRate': 'Cannot exceed 100%.'})
        if not item.get('name'):
            raise ValidationError({'items': f'Item {index + 1} needs a name.'})
        line = (qty * price).quantize(Decimal('0.01'))
        subtotal += line
        tax_total += (line * tax / 100).quantize(Decimal('0.01'))
        calculated.append({'id': item.get('id') or f'ITM-{uuid4().hex[:8]}', 'name': item['name'], 'description': item.get('description', ''), 'quantity': float(qty), 'unit': item.get('unit', 'units'), 'unitPrice': float(price), 'taxRate': float(tax), 'total': float(line)})
    return calculated, subtotal, tax_total

@transaction.atomic
def record_delivery(request, delivery, data):
    require(request.user, 'delivery.record')
    po = PurchaseOrder.objects.select_for_update().get(pk=delivery.poId_id)
    if po.invoices.filter(approvalStatus='approved').exists():
        raise ValidationError({'delivery': 'Accepted delivery cannot change after invoice approval.'})
    items = {item['id']: item for item in po.items}
    lines = data.get('lines', [])
    if not lines:
        raise ValidationError({'lines': 'At least one delivery line is required.'})
    checked = []
    seen = set()
    for line in lines:
        if not isinstance(line, dict):
            raise ValidationError({'lines': 'Each delivery line must be an object.'})
        item = items.get(line.get('itemId'))
        if not item:
            raise ValidationError({'itemId': 'Item is not on the purchase order.'})
        if item['id'] in seen:
            raise ValidationError({'lines': 'Each purchase order item may appear only once per delivery.'})
        seen.add(item['id'])
        delivered = money(line.get('delivered', 0), 'delivered')
        accepted = money(line.get('accepted', 0), 'accepted')
        rejected = money(line.get('rejected', 0), 'rejected')
        previous = sum(Decimal(str(row.get('delivered', 0))) for other in Delivery.objects.filter(poId=po).exclude(pk=delivery.pk) for row in other.lines if row.get('itemId') == item['id'])
        if delivered + previous > Decimal(str(item['quantity'])) or accepted + rejected != delivered:
            raise ValidationError({'lines': f'{item["name"]}: delivery exceeds order or accepted plus rejected differs from delivered.'})
        checked.append({'itemId': item['id'], 'name': item['name'], 'unit': item['unit'], 'ordered': item['quantity'], 'delivered': float(delivered), 'accepted': float(accepted), 'rejected': float(rejected), 'remarks': line.get('remarks', '')})
    for key in ('deliveryDate', 'reference', 'receivedBy', 'inspectionStatus', 'notes'):
        if key in data: setattr(delivery, key, data[key])
    delivery.lines = checked
    if delivery.inspectionStatus == 'failed' and any(row['accepted'] for row in checked):
        raise ValidationError({'inspectionStatus': 'A failed inspection cannot accept units.'})
    if delivery.inspectionStatus not in ('passed', 'passed_with_observations') and any(row['accepted'] for row in checked):
        raise ValidationError({'inspectionStatus': 'Pass inspection before accepting units.'})
    delivery.status = 'rejected' if delivery.inspectionStatus == 'failed' else 'delivered' if all(row['accepted'] >= row['ordered'] for row in checked) and len(checked) == len(items) else 'partially_delivered'
    delivery.save()
    all_deliveries = Delivery.objects.filter(poId=po)
    accepted_by_item = {item_id: sum(Decimal(str(row.get('accepted', 0))) for receipt in all_deliveries for row in receipt.lines if row.get('itemId') == item_id) for item_id in items}
    po.deliveryStatus = 'delivered' if all(accepted_by_item[item_id] >= Decimal(str(item['quantity'])) for item_id, item in items.items()) else 'rejected' if delivery.status == 'rejected' and not any(accepted_by_item.values()) else 'partially_delivered'
    po.save(update_fields=['deliveryStatus'])
    po.invoices.exclude(approvalStatus='approved').update(matchStatus='awaiting_review', match={'status': 'awaiting_review', 'runOn': '', 'checks': []})
    audit(request, 'delivery.confirmed', delivery, detail=delivery.reference)
    return delivery

def calculate_invoice(lines, po):
    if not isinstance(lines, list) or not lines:
        raise ValidationError({'lines': 'At least one invoice line is required.'})
    items = {item['id']: item for item in po.items}
    checked = []
    seen = set()
    amount = Decimal('0')
    for line in lines:
        if not isinstance(line, dict):
            raise ValidationError({'lines': 'Each invoice line must be an object.'})
        item = items.get(line.get('itemId'))
        if not item:
            raise ValidationError({'itemId': 'Item is not on the purchase order.'})
        if item['id'] in seen:
            raise ValidationError({'lines': 'Each purchase order item may appear only once per invoice.'})
        seen.add(item['id'])
        qty = positive(line.get('quantity'), 'quantity')
        price = money(line.get('unitPrice'), 'unitPrice')
        total = (qty * price).quantize(Decimal('0.01'))
        amount += total
        checked.append({'itemId': item['id'], 'name': item['name'], 'quantity': float(qty), 'unit': item['unit'], 'unitPrice': float(price), 'total': float(total)})
    return checked, amount

def quantity_text(value):
    return format(value.normalize(), 'f')

@transaction.atomic
def match_invoice(request, invoice):
    require(request.user, 'invoice.match')
    PurchaseOrder.objects.select_for_update().get(pk=invoice.poId_id)
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    if invoice.approvalStatus == 'approved' or invoice.paymentStatus == 'paid':
        raise ValidationError({'invoice': 'Approved or paid invoices cannot be matched again.'})
    po = invoice.poId
    deliveries = list(Delivery.objects.filter(poId=po).exclude(inspectionStatus='failed').exclude(status='awaiting_delivery'))
    items = {item['id']: item for item in po.items}
    checks = []
    expected_tax = Decimal('0')
    for index, line in enumerate(invoice.lines):
        item = items[line['itemId']]
        accepted = sum(Decimal(str(row.get('accepted', 0))) for delivery in deliveries for row in delivery.lines if row['itemId'] == line['itemId'])
        ordered = Decimal(str(item['quantity']))
        prior_claimed = sum(Decimal(str(row.get('quantity', 0))) for other in Invoice.objects.filter(poId=po, approvalStatus='approved').exclude(pk=invoice.pk) for row in other.lines if row.get('itemId') == line['itemId'])
        available_accepted = accepted - prior_claimed
        available_ordered = ordered - prior_claimed
        invoiced = Decimal(str(line['quantity']))
        passed_qty = bool(deliveries) and invoiced <= available_accepted and invoiced <= available_ordered
        note = 'No accepted delivery has been recorded.' if not deliveries else f'Invoice quantity exceeds accepted delivery quantity by {quantity_text(invoiced - available_accepted)}.' if invoiced > available_accepted else f'Invoice quantity exceeds order quantity by {quantity_text(invoiced - available_ordered)}.' if invoiced > available_ordered else ''
        checks.append({'id': f'MC-{index}-Q', 'label': f'{item["name"]} quantity', 'unit': 'quantity', 'po': float(ordered), 'delivery': float(accepted) if deliveries else None, 'invoice': float(invoiced), 'tolerance': 0, 'passed': passed_qty, 'note': note})
        expected_price = Decimal(str(item['unitPrice']))
        actual_price = Decimal(str(line['unitPrice']))
        expected_tax += (invoiced * expected_price * Decimal(str(item.get('taxRate', 0))) / 100).quantize(Decimal('0.01'))
        checks.append({'id': f'MC-{index}-P', 'label': f'{item["name"]} unit price', 'unit': 'currency', 'po': float(expected_price), 'delivery': None, 'invoice': float(actual_price), 'tolerance': 0, 'passed': actual_price == expected_price, 'note': f'Invoice unit price differs by {quantity_text(actual_price - expected_price)}.' if actual_price != expected_price else ''})
    checks.append({'id': 'MC-TAX', 'label': 'Invoice tax against order rate', 'unit': 'currency', 'po': float(expected_tax), 'delivery': None, 'invoice': float(invoice.taxAmount), 'tolerance': 0, 'passed': invoice.taxAmount == expected_tax, 'note': f'Invoice tax differs by {quantity_text(invoice.taxAmount - expected_tax)}.' if invoice.taxAmount != expected_tax else ''})
    total = invoice.amount + invoice.taxAmount
    checks.append({'id': 'MC-TOTAL', 'label': 'Invoice total against order', 'unit': 'currency', 'po': float(po.total), 'delivery': None, 'invoice': float(total), 'tolerance': 0, 'passed': total <= po.total, 'note': f'Invoice total exceeds purchase order by {quantity_text(total - po.total)}.' if total > po.total else ''})
    status = 'matched' if all(check['passed'] for check in checks) else 'mismatch'
    invoice.match = {'status': status, 'runOn': timezone.now().isoformat(), 'checks': checks}
    invoice.matchStatus = status
    invoice.save(update_fields=['match', 'matchStatus'])
    audit(request, 'invoice.matched' if status == 'matched' else 'invoice.mismatch', invoice, detail='; '.join(check['note'] for check in checks if check['note']))
    return invoice

@transaction.atomic
def approve_invoice(request, invoice, remarks=''):
    require(request.user, 'invoice.decide')
    PurchaseOrder.objects.select_for_update().get(pk=invoice.poId_id)
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    if invoice.matchStatus != 'matched' or invoice.approvalStatus != 'pending':
        raise ValidationError({'matchStatus': 'Invoice needs a successful 3-way match and pending approval.'})
    po = invoice.poId
    items = {item['id']: item for item in po.items}
    deliveries = Delivery.objects.filter(poId=po).exclude(inspectionStatus='failed').exclude(status='awaiting_delivery')
    for line in invoice.lines:
        item_id = line['itemId']
        accepted = sum(Decimal(str(row.get('accepted', 0))) for delivery in deliveries for row in delivery.lines if row.get('itemId') == item_id)
        claimed = sum(Decimal(str(row.get('quantity', 0))) for other in Invoice.objects.filter(poId=po, approvalStatus='approved').exclude(pk=invoice.pk) for row in other.lines if row.get('itemId') == item_id)
        if Decimal(str(line['quantity'])) + claimed > min(accepted, Decimal(str(items[item_id]['quantity']))):
            raise ValidationError({'matchStatus': 'Accepted or ordered quantity was claimed by another approved invoice. Rerun the three way match.'})
    invoice.approvalStatus = 'approved'; invoice.save(update_fields=['approvalStatus'])
    approval = Approval.objects.filter(entityType='invoice', entityId=invoice.pk, status='pending').order_by('-id').first()
    if approval:
        approval.status = 'approved'; approval.approver = request.user; approval.decisionDate = timezone.now(); approval.comments = remarks; approval.save()
    audit(request, 'invoice.approved', invoice, detail=remarks)
    return invoice

@transaction.atomic
def create_payment(request, invoice, amount, data):
    require(request.user, 'payment.create')
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    if invoice.approvalStatus != 'approved' or invoice.matchStatus != 'matched':
        raise ValidationError({'invoice': 'Invoice must be approved and matched before payment.'})
    if Payment.objects.filter(invoiceId=invoice).exists():
        raise ValidationError({'invoice': 'A payment already exists for this invoice.'})
    amount = positive(amount)
    if amount > invoice.amount + invoice.taxAmount:
        raise ValidationError({'amount': 'Payment exceeds approved invoice amount.'})
    deductions = money(data.get('deductions', 0))
    if deductions > amount: raise ValidationError({'deductions': 'Deductions cannot exceed payment amount.'})
    payment_code = code('PAY')
    payment = Payment.objects.create(id=payment_code, code=payment_code, invoiceId=invoice, poId=invoice.poId, contractId=invoice.contractId, vendorId=invoice.vendorId, amount=amount, deductions=deductions, netAmount=amount - deductions, currency=invoice.currency, method=data.get('method', ''), bankAccount=data.get('bankAccount', ''))
    Approval.objects.create(entityType='payment', entityId=payment.pk, submittedBy=request.user)
    audit(request, 'payment.created', payment)
    return payment

@transaction.atomic
def transition_payment(request, payment, status, reference=''):
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    transitions = {'awaiting_approval': ('approved',), 'approved': ('processing',), 'processing': ('paid', 'failed')}
    if status not in transitions.get(payment.status, ()):
        raise ValidationError({'status': f'Cannot move from {payment.status} to {status}.'})
    require(request.user, 'payment.decide' if status == 'approved' else 'payment.pay')
    old = payment.status
    payment.status = status
    if status == 'approved':
        payment.approvedDate = timezone.localdate()
        approval = Approval.objects.filter(entityType='payment', entityId=payment.pk, status='pending').first()
        if approval:
            approval.status = 'approved'; approval.approver = request.user; approval.decisionDate = timezone.now(); approval.save()
    if status == 'paid':
        if not reference: raise ValidationError({'reference': 'A bank reference is required.'})
        payment.reference = reference
        payment.paymentDate = timezone.localdate()
        payment.invoiceId.paymentStatus = 'paid'; payment.invoiceId.save(update_fields=['paymentStatus'])
    payment.save()
    audit(request, f'payment.{status}', payment, {'status': old})
    return payment
