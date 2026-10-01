from django.conf import settings
from django.db import models

class Base(models.Model):
    id = models.CharField(max_length=40, primary_key=True)
    code = models.CharField(max_length=40, unique=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    class Meta:
        abstract = True

class Vendor(Base):
    name = models.CharField(max_length=200)
    registrationNumber = models.CharField(max_length=100, unique=True)
    gstin = models.CharField(max_length=32, blank=True)
    msmeRegistered = models.BooleanField(default=False)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    categories = models.JSONField(default=list)
    complianceStatus = models.CharField(max_length=24, default='review_required')
    rating = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    certifications = models.JSONField(default=list)
    complianceDocuments = models.JSONField(default=list)
    lastEvaluated = models.DateField(null=True, blank=True)
    onboardedOn = models.DateField(auto_now_add=True)
    active = models.BooleanField(default=True)

class VendorEvaluation(Base):
    vendorId = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name='evaluations')
    period = models.CharField(max_length=40)
    evaluatedOn = models.DateField()
    evaluator = models.CharField(max_length=160)
    scores = models.JSONField(default=dict)
    weights = models.JSONField(default=dict)
    overall = models.DecimalField(max_digits=5, decimal_places=2)
    notes = models.TextField(blank=True)

class ProcurementPlan(Base):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    department = models.CharField(max_length=120)
    category = models.CharField(max_length=120, blank=True)
    priority = models.CharField(max_length=20, default='medium')
    estimatedBudget = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    budgetReference = models.CharField(max_length=100, blank=True)
    requiredDate = models.DateField(null=True, blank=True)
    expectedStart = models.DateField(null=True, blank=True)
    expectedCompletion = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=24, default='draft', db_index=True)
    owner = models.CharField(max_length=160, blank=True)
    approver = models.CharField(max_length=160, blank=True)
    comments = models.TextField(blank=True)
    linkedContractId = models.CharField(max_length=40, null=True, blank=True)
    updatedAt = models.DateTimeField(auto_now=True)
    lineItems = models.JSONField(default=list)
    documents = models.JSONField(default=list)

class Contract(Base):
    title = models.CharField(max_length=200)
    vendorId = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name='contracts')
    planId = models.OneToOneField(ProcurementPlan, on_delete=models.PROTECT, null=True, blank=True, related_name='contract')
    value = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    startDate = models.DateField()
    endDate = models.DateField()
    version = models.CharField(max_length=20, default='1.0')
    status = models.CharField(max_length=24, default='draft', db_index=True)
    owner = models.CharField(max_length=160, blank=True)
    department = models.CharField(max_length=120, blank=True)
    category = models.CharField(max_length=120, blank=True)
    paymentTerms = models.TextField(blank=True)
    deliveryTerms = models.TextField(blank=True)
    performanceGuarantee = models.TextField(blank=True)
    liquidatedDamages = models.TextField(blank=True)
    scope = models.TextField(blank=True)
    documents = models.JSONField(default=list)

class Amendment(Base):
    contract = models.ForeignKey(Contract, on_delete=models.PROTECT, related_name='amendments')
    version = models.CharField(max_length=20)
    type = models.CharField(max_length=30)
    summary = models.CharField(max_length=200)
    description = models.TextField()
    reason = models.TextField()
    effectiveDate = models.DateField()
    requestedBy = models.CharField(max_length=160)
    approver = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=24, default='pending_approval')
    changes = models.JSONField(default=list)
    documents = models.JSONField(default=list)

class PurchaseOrder(Base):
    contractId = models.ForeignKey(Contract, on_delete=models.PROTECT, related_name='orders')
    vendorId = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    orderDate = models.DateField()
    expectedDelivery = models.DateField()
    deliveryLocation = models.CharField(max_length=200)
    subtotal = models.DecimalField(max_digits=16, decimal_places=2)
    taxTotal = models.DecimalField(max_digits=16, decimal_places=2)
    total = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    deliveryStatus = models.CharField(max_length=30, default='awaiting_delivery')
    invoiceStatus = models.CharField(max_length=30, default='not_invoiced')
    owner = models.CharField(max_length=160, blank=True)
    notes = models.TextField(blank=True)
    items = models.JSONField(default=list)

class Delivery(Base):
    poId = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name='deliveries')
    vendorId = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    deliveryDate = models.DateField(null=True, blank=True)
    reference = models.CharField(max_length=100, blank=True)
    receivedBy = models.CharField(max_length=160, blank=True)
    inspectionStatus = models.CharField(max_length=32, default='pending')
    status = models.CharField(max_length=30, default='awaiting_delivery')
    notes = models.TextField(blank=True)
    lines = models.JSONField(default=list)

def initial_match():
    return {'status': 'awaiting_review', 'runOn': '', 'checks': []}

class Invoice(Base):
    poId = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name='invoices')
    contractId = models.ForeignKey(Contract, on_delete=models.PROTECT)
    vendorId = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    vendorInvoiceNumber = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=16, decimal_places=2)
    taxAmount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='INR')
    submittedDate = models.DateField()
    dueDate = models.DateField()
    matchStatus = models.CharField(max_length=24, default='awaiting_review')
    approvalStatus = models.CharField(max_length=24, default='pending')
    paymentStatus = models.CharField(max_length=24, default='unpaid')
    lines = models.JSONField(default=list)
    match = models.JSONField(default=initial_match)
    deductions = models.JSONField(default=list)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['vendorId', 'vendorInvoiceNumber'], name='unique_vendor_invoice')]

class Payment(Base):
    invoiceId = models.OneToOneField(Invoice, on_delete=models.PROTECT, related_name='payment')
    poId = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT)
    contractId = models.ForeignKey(Contract, on_delete=models.PROTECT)
    vendorId = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=16, decimal_places=2)
    deductions = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    netAmount = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    approvedDate = models.DateField(null=True, blank=True)
    paymentDate = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=24, default='awaiting_approval')
    reference = models.CharField(max_length=100, blank=True)
    method = models.CharField(max_length=60, blank=True)
    bankAccount = models.CharField(max_length=80, blank=True)
    failureReason = models.TextField(null=True, blank=True)

class Approval(models.Model):
    entityType = models.CharField(max_length=32, db_index=True)
    entityId = models.CharField(max_length=40)
    submittedBy = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='submitted_approvals')
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name='decided_approvals')
    submittedOn = models.DateTimeField(auto_now_add=True)
    decisionDate = models.DateTimeField(null=True)
    comments = models.TextField(blank=True)
    status = models.CharField(max_length=24, default='pending', db_index=True)
    class Meta:
        indexes = [models.Index(fields=['entityType', 'entityId'])]

class NotificationRead(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    approval = models.ForeignKey(Approval, on_delete=models.CASCADE)
    readAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'approval'], name='unique_notification_read')]

class AuditEntry(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    role = models.CharField(max_length=32)
    action = models.CharField(max_length=80)
    entityType = models.CharField(max_length=32)
    entityId = models.CharField(max_length=40)
    entityCode = models.CharField(max_length=40)
    previousState = models.TextField(null=True)
    newState = models.TextField(null=True)
    detail = models.TextField(blank=True)
    ipAddress = models.GenericIPAddressField(null=True)
    class Meta:
        indexes = [models.Index(fields=['entityType', 'entityId'])]

class Document(models.Model):
    id = models.CharField(max_length=40, primary_key=True)
    entityType = models.CharField(max_length=32, db_index=True)
    entityId = models.CharField(max_length=40, db_index=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=40)
    file = models.FileField(upload_to='protected-documents/')
    sizeKb = models.PositiveIntegerField()
    uploadedBy = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    uploadedOn = models.DateTimeField(auto_now_add=True)
    version = models.CharField(max_length=20)
    checksum = models.CharField(max_length=64)
