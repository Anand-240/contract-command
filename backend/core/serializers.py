from decimal import Decimal
from rest_framework import serializers
from django.db.models import Sum
from .models import Amendment, Approval, AuditEntry, Contract, Delivery, Invoice, Payment, ProcurementPlan, PurchaseOrder, Vendor, VendorEvaluation

class CleanModelSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        def clean(value):
            if isinstance(value, Decimal): return float(value)
            if isinstance(value, list): return [clean(v) for v in value]
            if isinstance(value, dict): return {k: clean(v) for k, v in value.items()}
            return value
        return clean(super().to_representation(instance))

class ApprovalEventSerializer(serializers.ModelSerializer):
    stage = serializers.CharField(source='entityType', read_only=True)
    actor = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    decision = serializers.CharField(source='status', read_only=True)
    actedOn = serializers.DateTimeField(source='decisionDate', read_only=True)
    remarks = serializers.CharField(source='comments', read_only=True)
    class Meta:
        model = Approval
        fields = ('id', 'stage', 'actor', 'role', 'decision', 'actedOn', 'remarks')
    def get_actor(self, obj) -> str:
        return obj.approver.get_full_name() or obj.approver.username if obj.approver else obj.submittedBy.get_full_name() or obj.submittedBy.username
    def get_role(self, obj) -> str:
        user = obj.approver or obj.submittedBy
        return user.groups.first().name if user.groups.exists() else 'admin' if user.is_superuser else 'auditor'

def approvals_for(entity_type, entity_id):
    return ApprovalEventSerializer(Approval.objects.filter(entityType=entity_type, entityId=entity_id).select_related('submittedBy', 'approver'), many=True).data

class VendorSerializer(CleanModelSerializer):
    activeContracts = serializers.SerializerMethodField()
    totalAwardedValue = serializers.SerializerMethodField()
    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = ('id', 'code', 'rating', 'lastEvaluated', 'onboardedOn', 'createdAt')
    def get_activeContracts(self, obj) -> int: return obj.contracts.filter(status__in=['active', 'amended']).count()
    def get_totalAwardedValue(self, obj) -> float: return obj.contracts.aggregate(total=Sum('value'))['total'] or 0

class VendorEvaluationSerializer(CleanModelSerializer):
    class Meta:
        model = VendorEvaluation
        fields = '__all__'
        read_only_fields = ('id', 'code', 'overall', 'createdAt')

class ProcurementPlanSerializer(CleanModelSerializer):
    approvals = serializers.SerializerMethodField()
    class Meta:
        model = ProcurementPlan
        fields = '__all__'
        read_only_fields = ('id', 'code', 'status', 'owner', 'linkedContractId', 'createdAt', 'updatedAt')
    def get_approvals(self, obj) -> list: return approvals_for('procurement_plan', obj.pk)
    def validate(self, attrs):
        start = attrs.get('expectedStart', getattr(self.instance, 'expectedStart', None))
        finish = attrs.get('expectedCompletion', getattr(self.instance, 'expectedCompletion', None))
        required = attrs.get('requiredDate', getattr(self.instance, 'requiredDate', None))
        if start and finish and finish < start: raise serializers.ValidationError({'expectedCompletion': 'Completion cannot precede start.'})
        if start and required and required < start: raise serializers.ValidationError({'requiredDate': 'Required date cannot precede start.'})
        return attrs
    def validate_estimatedBudget(self, value):
        if value <= 0: raise serializers.ValidationError('Budget must be positive.')
        return value

class AmendmentSerializer(CleanModelSerializer):
    requestedBy = serializers.CharField(read_only=True)
    class Meta:
        model = Amendment
        fields = '__all__'
        read_only_fields = ('id', 'code', 'version', 'status', 'createdAt', 'contract')

class ContractSerializer(CleanModelSerializer):
    amendments = AmendmentSerializer(many=True, read_only=True)
    approvals = serializers.SerializerMethodField()
    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ('id', 'code', 'status', 'version', 'createdAt')
    def get_approvals(self, obj) -> list: return approvals_for('contract', obj.pk)
    def validate(self, attrs):
        start = attrs.get('startDate', getattr(self.instance, 'startDate', None))
        end = attrs.get('endDate', getattr(self.instance, 'endDate', None))
        if start and end and end < start: raise serializers.ValidationError({'endDate': 'End date cannot precede start date.'})
        if attrs.get('value', 1) <= 0: raise serializers.ValidationError({'value': 'Contract value must be positive.'})
        plan = attrs.get('planId')
        if plan and plan.status != 'approved': raise serializers.ValidationError({'planId': 'Only approved procurement plans may create contracts.'})
        return attrs

class PurchaseOrderSerializer(CleanModelSerializer):
    def validate(self, attrs):
        order = attrs.get('orderDate')
        expected = attrs.get('expectedDelivery')
        if order and expected and expected < order: raise serializers.ValidationError({'expectedDelivery': 'Expected delivery cannot precede order date.'})
        return attrs
    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ('id', 'code', 'subtotal', 'taxTotal', 'total', 'currency', 'deliveryStatus', 'invoiceStatus', 'createdAt')

class DeliverySerializer(CleanModelSerializer):
    class Meta:
        model = Delivery
        fields = '__all__'
        read_only_fields = ('id', 'code', 'vendorId', 'status', 'createdAt')

class InvoiceSerializer(CleanModelSerializer):
    def validate(self, attrs):
        submitted = attrs.get('submittedDate')
        due = attrs.get('dueDate')
        if submitted and due and due < submitted: raise serializers.ValidationError({'dueDate': 'Due date cannot precede submission.'})
        if attrs.get('taxAmount', 0) < 0: raise serializers.ValidationError({'taxAmount': 'Tax cannot be negative.'})
        return attrs
    approvals = serializers.SerializerMethodField()
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('id', 'code', 'contractId', 'vendorId', 'amount', 'matchStatus', 'approvalStatus', 'paymentStatus', 'match', 'createdAt')
    def get_approvals(self, obj) -> list: return approvals_for('invoice', obj.pk)

class PaymentSerializer(CleanModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('id', 'code', 'poId', 'contractId', 'vendorId', 'netAmount', 'currency', 'approvedDate', 'paymentDate', 'status', 'reference', 'createdAt')

class AuditEntrySerializer(CleanModelSerializer):
    user = serializers.SerializerMethodField()
    class Meta:
        model = AuditEntry
        fields = '__all__'
    def get_user(self, obj) -> str: return obj.user.get_full_name() or obj.user.username if obj.user else 'Deleted user'

class EmptySerializer(serializers.Serializer):
    pass

class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class UserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    initials = serializers.CharField()
    role = serializers.CharField()
    designation = serializers.CharField()
    department = serializers.CharField()
    email = serializers.EmailField()

class LoginResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = UserSerializer()
